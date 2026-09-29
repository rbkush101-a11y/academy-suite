import {
  Router,
  type IRouter,
  type Request,
} from "express";
import mongoose, { Types } from "mongoose";

import {
  authenticate,
  authorize,
} from "../middlewares/auth";

import {
  TestSeries,
  Test,
  TestMark,
  calculateGrade,
  type TestType,
} from "../models/Test";

import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type UserRequest = Request & {
  user?: {
    userId: string;
    email: string;
    role: string;
    instituteId?: string | null;
  };
};

type InstituteFilter = {
  instituteId?: Types.ObjectId;
};

type TestFilter = InstituteFilter & {
  batchId?: Types.ObjectId;
  subjectId?:
    | Types.ObjectId
    | {
        $in: Types.ObjectId[];
      };
  seriesId?: Types.ObjectId;
  testDate?: string | RegExp;
};

type TestMarkMap = Record<string, string>;

type ValidationResult =
  | {
      error: string;
      batch?: never;
      subject?: never;
    }
  | {
      error?: never;
      batch: any;
      subject: any;
    };

/* ========================================================================== */
/* CONSTANTS                                                                  */
/* ========================================================================== */

const TEST_TYPES: ReadonlySet<TestType> =
  new Set<TestType>([
    "weekly-test",
    "monthly-test",
    "unit-test",
    "half-yearly",
    "annual",
    "practice-test",
    "scholarship-test",
    "mid-term",
    "final",
    "mock",
  ]);

const TEST_STATUSES = new Set<string>([
  "scheduled",
  "ongoing",
  "completed",
]);

/* ========================================================================== */
/* BASIC HELPERS                                                              */
/* ========================================================================== */

const clean = (value: unknown): string =>
  String(value ?? "").trim();

function getParamId(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

function isValidObjectId(
  value: string,
): boolean {
  return mongoose.Types.ObjectId.isValid(
    value,
  );
}

function toObjectId(
  value: string,
): Types.ObjectId {
  return new Types.ObjectId(value);
}

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

/* -------------------------------------------------------------------------- */
/* DATE VALIDATION                                                            */
/* -------------------------------------------------------------------------- */

function isValidDateString(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidMonthString(
  value: string,
): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    value,
  );
}

/* -------------------------------------------------------------------------- */
/* TEST VALIDATION                                                            */
/* -------------------------------------------------------------------------- */

function isValidTestType(
  value: string,
): value is TestType {
  return TEST_TYPES.has(
    value as TestType,
  );
}

function isValidTestStatus(
  value: string,
): boolean {
  return TEST_STATUSES.has(value);
}

/* ========================================================================== */
/* TENANT HELPERS                                                             */
/* ========================================================================== */

function getInstituteFilter(
  req: UserRequest,
): InstituteFilter {
  /*
   * Super admin can work across institutes.
   */
  if (
    req.user?.role ===
    "super_admin"
  ) {
    return {};
  }

  const instituteId = clean(
    req.user?.instituteId,
  );

  /*
   * Fail closed.
   */
  if (
    !isValidObjectId(
      instituteId,
    )
  ) {
    return {
      instituteId:
        new Types.ObjectId(),
    };
  }

  return {
    instituteId:
      toObjectId(instituteId),
  };
}

function resolveWriteInstituteId(
  req: UserRequest,
  bodyInstituteId?: unknown,
): Types.ObjectId | null {
  /*
   * Super admin may explicitly choose
   * an institute.
   */
  if (
    req.user?.role ===
    "super_admin"
  ) {
    const instituteId = clean(
      bodyInstituteId,
    );

    if (
      !isValidObjectId(
        instituteId,
      )
    ) {
      return null;
    }

    return toObjectId(
      instituteId,
    );
  }

  /*
   * All other roles must use the
   * institute from JWT.
   */
  const instituteId = clean(
    req.user?.instituteId,
  );

  if (
    !isValidObjectId(
      instituteId,
    )
  ) {
    return null;
  }

  return toObjectId(
    instituteId,
  );
}

/* ========================================================================== */
/* TEACHER HELPERS                                                            */
/* ========================================================================== */

async function getTeacherStaff(
  req: UserRequest,
) {
  if (
    req.user?.role !==
    "teacher"
  ) {
    return null;
  }

  const userId = clean(
    req.user.userId,
  );

  if (
    !isValidObjectId(userId)
  ) {
    return null;
  }

  const instituteFilter =
    getInstituteFilter(req);

  return Staff.findOne({
    ...instituteFilter,
    userId: toObjectId(userId),
  })
    .select(
      "_id instituteId batches subjectsTaught userId name",
    )
    .lean()
    .exec();
}

async function isTeacherAssignedToBatch(
  teacherStaff: {
    batches?: Types.ObjectId[];
  },
  batchId: Types.ObjectId,
): Promise<boolean> {
  const assignedBatchIds =
    teacherStaff.batches ?? [];

  return assignedBatchIds.some(
    (assignedBatchId) =>
      String(
        assignedBatchId,
      ) ===
      String(batchId),
  );
}

async function isTeacherAssignedToSubject(
  teacherStaffId: Types.ObjectId,
  subjectId: Types.ObjectId,
  instituteFilter: InstituteFilter,
): Promise<boolean> {
  const subject =
    await Subject.findOne({
      _id: subjectId,
      teacherId:
        teacherStaffId,
      ...instituteFilter,
    })
      .select("_id")
      .lean()
      .exec();

  return Boolean(subject);
}

async function getTeacherSubjectIds(
  teacherStaffId: Types.ObjectId,
  instituteFilter: InstituteFilter,
): Promise<Types.ObjectId[]> {
  const subjects =
    await Subject.find({
      teacherId:
        teacherStaffId,
      ...instituteFilter,
    })
      .select("_id")
      .lean()
      .exec();

  return subjects.map(
    (subject) =>
      subject._id,
  );
}

/* ========================================================================== */
/* STUDENT HELPERS                                                            */
/* ========================================================================== */

async function resolveStudentIdForRequest(
  req: UserRequest,
  requestedStudentId: string,
  instituteFilter: InstituteFilter,
): Promise<string | null> {
  /*
   * Parent-child relationship is not
   * verified in this module.
   */
  if (
    req.user?.role ===
    "parent"
  ) {
    return null;
  }

  /*
   * Student can only access their own
   * Student profile.
   */
  if (
    req.user?.role ===
    "student"
  ) {
    const authenticatedUserId =
      clean(req.user.userId);

    if (
      !isValidObjectId(
        authenticatedUserId,
      )
    ) {
      return null;
    }

    const ownStudent =
      await Student.findOne({
        userId:
          toObjectId(
            authenticatedUserId,
          ),
        ...instituteFilter,
      })
        .select(
          "_id batchId instituteId",
        )
        .lean()
        .exec();

    return ownStudent
      ? String(
          ownStudent._id,
        )
      : null;
  }

  /*
   * Admin / teacher can request
   * a student ID, subject to permission
   * checks performed by callers.
   */
  return requestedStudentId || null;
}

/* ========================================================================== */
/* OWNERSHIP HELPERS                                                          */
/* ========================================================================== */

async function getOwnedBatch(
  batchId: string,
  instituteFilter: InstituteFilter,
) {
  if (
    !isValidObjectId(batchId)
  ) {
    return null;
  }

  return Batch.findOne({
    _id: toObjectId(batchId),
    ...instituteFilter,
  })
    .select(
      "name courseId instituteId",
    )
    .lean()
    .exec();
}

async function getOwnedSubject(
  subjectId: string,
  instituteFilter: InstituteFilter,
) {
  if (
    !isValidObjectId(
      subjectId,
    )
  ) {
    return null;
  }

  return Subject.findOne({
    _id: toObjectId(subjectId),
    ...instituteFilter,
  })
    .select(
      "name code courseId teacherId instituteId",
    )
    .lean()
    .exec();
}

async function getOwnedStudent(
  studentId: string,
  instituteFilter: InstituteFilter,
) {
  if (
    !isValidObjectId(
      studentId,
    )
  ) {
    return null;
  }

  return Student.findOne({
    _id: toObjectId(studentId),
    ...instituteFilter,
  })
    .select(
      "name studentId enrollmentNo batchId instituteId photoDataUrl userId",
    )
    .lean()
    .exec();
}

async function getOwnedSeries(
  seriesId: string,
  instituteFilter: InstituteFilter,
) {
  if (
    !isValidObjectId(
      seriesId,
    )
  ) {
    return null;
  }

  return TestSeries.findOne({
    _id: toObjectId(seriesId),
    ...instituteFilter,
  })
    .lean()
    .exec();
}

async function getOwnedTest(
  testId: string,
  instituteFilter: InstituteFilter,
) {
  if (
    !isValidObjectId(testId)
  ) {
    return null;
  }

  return Test.findOne({
    _id: toObjectId(testId),
    ...instituteFilter,
  })
    .lean()
    .exec();
}

/* ========================================================================== */
/* BATCH + SUBJECT VALIDATION                                                 */
/* ========================================================================== */

async function validateBatchSubject(
  batchId: string,
  subjectId: string,
  instituteFilter: InstituteFilter,
): Promise<ValidationResult> {
  const [
    batch,
    subject,
  ] = await Promise.all([
    getOwnedBatch(
      batchId,
      instituteFilter,
    ),

    getOwnedSubject(
      subjectId,
      instituteFilter,
    ),
  ]);

  if (!batch) {
    return {
      error:
        "Selected batch not found.",
    };
  }

  if (!subject) {
    return {
      error:
        "Selected subject not found.",
    };
  }

  if (
    String(
      batch.courseId ?? "",
    ) !==
    String(
      subject.courseId ?? "",
    )
  ) {
    return {
      error:
        "Selected Batch and Subject must belong to the same Course.",
    };
  }

  return {
    batch,
    subject,
  };
}

/* ========================================================================== */
/* FORMATTERS                                                                 */
/* ========================================================================== */

async function formatSeries(
  series: any,
  instituteFilter: InstituteFilter,
) {
  const batch =
    await getOwnedBatch(
      String(
        series.batchId,
      ),
      instituteFilter,
    );

  const paperCount =
    await Test.countDocuments({
      seriesId: series._id,
      ...instituteFilter,
    });

  return {
    id: String(
      series._id,
    ),

    _id: String(
      series._id,
    ),

    instituteId:
      series.instituteId
        ? String(
            series.instituteId,
          )
        : "",

    title:
      series.title ?? "",

    type:
      series.type ??
      "weekly-test",

    batchId: String(
      series.batchId,
    ),

    batchName:
      batch?.name ?? "",

    courseId:
      batch?.courseId
        ? String(
            batch.courseId,
          )
        : "",

    testDate:
      series.testDate ?? "",

    status:
      series.status ??
      "scheduled",

    instructions:
      series.instructions ??
      "",

    paperCount,

    createdAt:
      series.createdAt
        ?.toISOString?.() ??
      null,

    updatedAt:
      series.updatedAt
        ?.toISOString?.() ??
      null,
  };
}

async function formatTest(
  test: any,
  instituteFilter: InstituteFilter,
) {
  const [
    batch,
    subject,
  ] = await Promise.all([
    getOwnedBatch(
      String(
        test.batchId,
      ),
      instituteFilter,
    ),

    getOwnedSubject(
      String(
        test.subjectId,
      ),
      instituteFilter,
    ),
  ]);

  let teacher = null;

  if (subject?.teacherId) {
    teacher =
      await Staff.findOne({
        _id: subject.teacherId,
        ...instituteFilter,
      })
        .select("name")
        .lean()
        .exec();
  }

  return {
    id: String(
      test._id,
    ),

    _id: String(
      test._id,
    ),

    instituteId:
      test.instituteId
        ? String(
            test.instituteId,
          )
        : "",

    seriesId:
      test.seriesId
        ? String(
            test.seriesId,
          )
        : "",

    name:
      test.name ?? "",

    title:
      test.name ?? "",

    type:
      test.type ??
      "unit-test",

    batchId: String(
      test.batchId,
    ),

    batchName:
      batch?.name ?? "",

    subjectId:
      String(
        test.subjectId,
      ),

    subjectName:
      subject?.name ?? "",

    subjectCode:
      subject?.code ?? "",

    teacherId:
      subject?.teacherId
        ? String(
            subject.teacherId,
          )
        : "",

    teacherName:
      teacher?.name ?? "",

    date:
      test.date ?? "",

    startTime:
      test.startTime ?? "",

    endTime:
      test.endTime ?? "",

    duration:
      test.duration !==
      undefined
        ? Number(
            test.duration,
          )
        : undefined,

    totalMarks:
      Number(
        test.totalMarks ?? 0,
      ),

    maxMarks:
      Number(
        test.totalMarks ?? 0,
      ),

    passingMarks:
      Number(
        test.passingMarks ?? 0,
      ),

    room:
      test.room ?? "",

    instructions:
      test.instructions ??
      "",

    status:
      test.status ??
      "scheduled",

    createdAt:
      test.createdAt
        ?.toISOString?.() ??
      null,

    updatedAt:
      test.updatedAt
        ?.toISOString?.() ??
      null,
  };
}

/* ========================================================================== */
/* COMMON SERIES LIST                                                         */
/* ========================================================================== */

async function listTestSeriesForRequest(
  req: UserRequest,
  res: any,
): Promise<void> {
  const instituteFilter =
    getInstituteFilter(req);

  const batchId =
    clean(req.query.batchId);

  const date =
    clean(req.query.date);

  const month =
    clean(req.query.month);

  /*
   * Record<string, unknown> deliberately used
   * here because Mongoose's inferred ObjectId
   * type can reject dynamic $in filters.
   */
  const filter: Record<
    string,
    any
  > = {
    ...instituteFilter,
  };

  /* ---------------------------------------------------------------------- */
  /* STUDENT                                                                */
  /* ---------------------------------------------------------------------- */

  if (
    req.user?.role ===
    "student"
  ) {
    const userId =
      clean(req.user.userId);

    if (
      !isValidObjectId(userId)
    ) {
      res.status(403).json({
        error:
          "Invalid student account.",
      });
      return;
    }

    const student =
      await Student.findOne({
        userId:
          toObjectId(userId),
        ...instituteFilter,
      })
        .select(
          "_id batchId instituteId",
        )
        .lean()
        .exec();

    if (!student) {
      res.status(403).json({
        error:
          "Student profile not found.",
      });
      return;
    }

    if (!student.batchId) {
      res.json([]);
      return;
    }

    /*
     * Student's own batch is always
     * authoritative.
     */
    filter.batchId =
      student.batchId;
  }

  /* ---------------------------------------------------------------------- */
  /* TEACHER                                                                */
  /* ---------------------------------------------------------------------- */

  if (
    req.user?.role ===
    "teacher"
  ) {
    const teacherStaff =
      await getTeacherStaff(req);

    if (!teacherStaff) {
      res.status(403).json({
        error:
          "Teacher staff profile not found.",
      });
      return;
    }

    const assignedBatchIds =
      teacherStaff.batches ?? [];

    if (
      assignedBatchIds.length ===
      0
    ) {
      res.json([]);
      return;
    }

    if (batchId) {
      if (
        !isValidObjectId(
          batchId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid batch ID.",
        });
        return;
      }

      const requestedBatchId =
        toObjectId(batchId);

      const isAssigned =
        assignedBatchIds.some(
          (assignedId) =>
            String(
              assignedId,
            ) ===
            String(
              requestedBatchId,
            ),
        );

      if (!isAssigned) {
        res.status(403).json({
          error:
            "You are not assigned to the selected batch.",
        });
        return;
      }

      filter.batchId =
        requestedBatchId;
    } else {
      filter.batchId = {
        $in: assignedBatchIds,
      };
    }
  }

  /* ---------------------------------------------------------------------- */
  /* PARENT                                                                 */
  /* ---------------------------------------------------------------------- */

  if (
    req.user?.role ===
    "parent"
  ) {
    /*
     * No verified parent-child relation
     * exists in this module.
     */
    res.json([]);
    return;
  }

  /* ---------------------------------------------------------------------- */
  /* ADMIN                                                                  */
  /* ---------------------------------------------------------------------- */

  if (
    req.user?.role ===
      "super_admin" ||
    req.user?.role ===
      "institute_admin"
  ) {
    if (batchId) {
      if (
        !isValidObjectId(
          batchId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid batch ID.",
        });
        return;
      }

      filter.batchId =
        toObjectId(batchId);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* DATE                                                                    */
  /* ---------------------------------------------------------------------- */

  if (date) {
    if (
      !isValidDateString(date)
    ) {
      res.status(400).json({
        error:
          "Invalid test date. Use YYYY-MM-DD.",
      });
      return;
    }

    filter.testDate = date;
  }

  /* ---------------------------------------------------------------------- */
  /* MONTH                                                                   */
  /* ---------------------------------------------------------------------- */

  if (month) {
    if (
      !isValidMonthString(
        month,
      )
    ) {
      res.status(400).json({
        error:
          "Invalid month. Use YYYY-MM.",
      });
      return;
    }

    filter.testDate =
      new RegExp(
        `^${escapeRegex(month)}`,
      );
  }

  const series =
    await TestSeries.find(
      filter as any,
    )
      .sort({
        testDate: -1,
        createdAt: -1,
      })
      .limit(500)
      .lean()
      .exec();

  res.json(
    await Promise.all(
      series.map(
        (item) =>
          formatSeries(
            item,
            instituteFilter,
          ),
      ),
    ),
  );
}

/* ========================================================================== */
/* TEST SERIES - GET                                                         */
/* ========================================================================== */

router.get(
  "/test-series",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
    "parent",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      await listTestSeriesForRequest(
        req,
        res,
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load test series.",
      });
    }
  },
);

/* ========================================================================== */
/* CREATE TEST                                                               */
/* ========================================================================== */

router.post(
  "/tests",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const instituteId =
        resolveWriteInstituteId(
          req,
          req.body?.instituteId,
        );

      if (!instituteId) {
        res.status(400).json({
          error:
            "A valid instituteId is required.",
        });
        return;
      }

      const instituteFilter: InstituteFilter =
        {
          instituteId,
        };

      const title =
        clean(req.body?.title) ||
        clean(req.body?.name);

      const batchId =
        clean(req.body?.batchId);

      const subjectId =
        clean(req.body?.subjectId);

      const date =
        clean(req.body?.date) ||
        new Date()
          .toISOString()
          .slice(0, 10);

      const maxMarks =
        Number(
          req.body?.maxMarks ??
            req.body?.totalMarks,
        );

      const typeValue =
        clean(req.body?.type) ||
        "weekly-test";

      const instructions =
        clean(
          req.body?.instructions,
        );

      if (
        !title ||
        !batchId ||
        !Number.isFinite(
          maxMarks,
        ) ||
        maxMarks <= 0
      ) {
        res.status(400).json({
          error:
            "Test title, batch and valid maximum marks are required.",
        });
        return;
      }

      if (
        !isValidObjectId(
          batchId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid batch ID.",
        });
        return;
      }

      if (
        !isValidDateString(date)
      ) {
        res.status(400).json({
          error:
            "Invalid test date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (
        !isValidTestType(
          typeValue,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid test type.",
        });
        return;
      }

      const batch =
        await getOwnedBatch(
          batchId,
          instituteFilter,
        );

      if (!batch) {
        res.status(404).json({
          error:
            "Selected batch not found.",
        });
        return;
      }

      let subject: any = null;

      /* ------------------------------------------------------------------ */
      /* TEACHER                                                            */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const isBatchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            batch._id,
          );

        if (!isBatchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to the selected batch.",
          });
          return;
        }

        /*
         * If teacher sends subjectId,
         * verify that exact subject.
         */
        if (subjectId) {
          if (
            !isValidObjectId(
              subjectId,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid subject ID.",
            });
            return;
          }

          subject =
            await Subject.findOne({
              _id:
                toObjectId(
                  subjectId,
                ),
              courseId:
                batch.courseId,
              teacherId:
                teacherStaff._id,
              ...instituteFilter,
            })
              .select(
                "name code teacherId courseId instituteId",
              )
              .lean()
              .exec();
        } else {
          /*
           * Otherwise automatically select
           * a subject assigned to this teacher
           * for this course.
           */
          subject =
            await Subject.findOne({
              courseId:
                batch.courseId,
              teacherId:
                teacherStaff._id,
              ...instituteFilter,
            })
              .select(
                "name code teacherId courseId instituteId",
              )
              .lean()
              .exec();
        }

        if (!subject) {
          res.status(403).json({
            error:
              "You are not assigned to the selected subject for this batch.",
          });
          return;
        }
      }

      /* ------------------------------------------------------------------ */
      /* ADMIN                                                              */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
          "super_admin" ||
        req.user?.role ===
          "institute_admin"
      ) {
        if (subjectId) {
          if (
            !isValidObjectId(
              subjectId,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid subject ID.",
            });
            return;
          }

          subject =
            await Subject.findOne({
              _id:
                toObjectId(
                  subjectId,
                ),
              courseId:
                batch.courseId,
              ...instituteFilter,
            })
              .select(
                "name code teacherId courseId instituteId",
              )
              .lean()
              .exec();

          if (!subject) {
            res.status(400).json({
              error:
                "Selected subject does not belong to the selected batch course.",
            });
            return;
          }
        } else {
          subject =
            await Subject.findOne({
              courseId:
                batch.courseId,
              ...instituteFilter,
            })
              .select(
                "name code teacherId courseId instituteId",
              )
              .lean()
              .exec();
        }
      }

      if (!subject) {
        res.status(400).json({
          error:
            "No subject is configured for this batch. Add a subject before creating a test.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* CREATE SERIES                                                      */
      /* ------------------------------------------------------------------ */

      const series =
        await TestSeries.create({
          instituteId,

          title,

          type:
            typeValue,

          batchId:
            batch._id,

          testDate:
            date,

          status:
            "scheduled",

          instructions,
        });

      /* ------------------------------------------------------------------ */
      /* CREATE TEST                                                        */
      /* ------------------------------------------------------------------ */

      const passingMarks =
        Math.ceil(
          maxMarks * 0.33,
        );

      const test =
        await Test.create({
          instituteId,

          seriesId:
            series._id,

          name:
            title,

          type:
            typeValue,

          batchId:
            batch._id,

          subjectId:
            subject._id,

          date,

          totalMarks:
            maxMarks,

          passingMarks,

          instructions,

          status:
            "scheduled",
        });

      res.status(201).json({
        id: String(
          test._id,
        ),

        _id: String(
          test._id,
        ),

        title,

        name: title,

        seriesId: String(
          series._id,
        ),

        batchId: String(
          batch._id,
        ),

        batchName:
          batch.name,

        maxMarks,

        totalMarks:
          maxMarks,

        passingMarks,

        date,

        scores: {},

        status:
          test.status,

        subjectId:
          String(
            subject._id,
          ),

        subjectName:
          subject.name ?? "",
      });
    } catch {
      res.status(500).json({
        error:
          "Unable to create test.",
      });
    }
  },
);

/* ========================================================================== */
/* GET TESTS                                                                 */
/* ========================================================================== */

router.get(
  "/tests",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const instituteFilter =
        getInstituteFilter(req);

      const batchId =
        clean(req.query.batchId);

      const subjectId =
        clean(
          req.query.subjectId,
        );

      const seriesId =
        clean(
          req.query.seriesId,
        );

      const filter: Record<
        string,
        any
      > = {
        ...instituteFilter,
      };

      /* ------------------------------------------------------------------ */
      /* BATCH FILTER                                                       */
      /* ------------------------------------------------------------------ */

      if (batchId) {
        if (
          !isValidObjectId(
            batchId,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid batch ID.",
          });
          return;
        }

        filter.batchId =
          toObjectId(batchId);
      }

      /* ------------------------------------------------------------------ */
      /* SUBJECT FILTER                                                     */
      /* ------------------------------------------------------------------ */

      if (subjectId) {
        if (
          !isValidObjectId(
            subjectId,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid subject ID.",
          });
          return;
        }

        filter.subjectId =
          toObjectId(subjectId);
      }

      /* ------------------------------------------------------------------ */
      /* SERIES FILTER                                                      */
      /* ------------------------------------------------------------------ */

      if (seriesId) {
        if (
          !isValidObjectId(
            seriesId,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test series ID.",
          });
          return;
        }

        filter.seriesId =
          toObjectId(seriesId);
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER                                                            */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        if (batchId) {
          const isAssigned =
            await isTeacherAssignedToBatch(
              teacherStaff,
              toObjectId(
                batchId,
              ),
            );

          if (!isAssigned) {
            res.status(403).json({
              error:
                "You are not assigned to the selected batch.",
            });
            return;
          }
        }

        const assignedBatchIds =
          teacherStaff.batches ?? [];

        const subjectIds =
          await getTeacherSubjectIds(
            teacherStaff._id,
            instituteFilter,
          );

        if (
          assignedBatchIds.length ===
            0 ||
          subjectIds.length ===
            0
        ) {
          res.json([]);
          return;
        }

        /*
         * Restrict teacher to assigned
         * batches AND assigned subjects.
         */
        if (!batchId) {
          filter.batchId = {
            $in:
              assignedBatchIds,
          };
        }

        if (!subjectId) {
          filter.subjectId = {
            $in:
              subjectIds,
          };
        } else {
          const assignedSubject =
            subjectIds.some(
              (id) =>
                String(id) ===
                String(
                  toObjectId(
                    subjectId,
                  ),
                ),
            );

          if (
            !assignedSubject
          ) {
            res.status(403).json({
              error:
                "You are not assigned to the selected subject.",
            });
            return;
          }
        }
      }

      const tests =
        await Test.find(
          filter as any,
        )
          .sort({
            date: -1,
            createdAt: -1,
          })
          .limit(500)
          .lean()
          .exec();

      const marks =
        tests.length
          ? await TestMark.find({
              testId: {
                $in:
                  tests.map(
                    (test) =>
                      test._id,
                  ),
              },

              ...instituteFilter,
            })
              .lean()
              .exec()
          : [];

      const marksByTest =
        new Map<
          string,
          TestMarkMap
        >();

      for (const mark of marks) {
        const key =
          String(
            mark.testId,
          );

        if (
          !marksByTest.has(key)
        ) {
          marksByTest.set(
            key,
            {},
          );
        }

        marksByTest.get(
          key,
        )![String(
          mark.studentId,
        )] = String(
          mark.marksObtained,
        );
      }

      res.json(
        await Promise.all(
          tests.map(
            async (test) => {
              const batch =
                await getOwnedBatch(
                  String(
                    test.batchId,
                  ),
                  instituteFilter,
                );

              const subject =
                await getOwnedSubject(
                  String(
                    test.subjectId,
                  ),
                  instituteFilter,
                );

              return {
                id: String(
                  test._id,
                ),

                _id: String(
                  test._id,
                ),

                title:
                  test.name ?? "",

                name:
                  test.name ?? "",

                batchId:
                  String(
                    test.batchId,
                  ),

                batchName:
                  batch?.name ?? "",

                maxMarks:
                  Number(
                    test.totalMarks,
                  ),

                totalMarks:
                  Number(
                    test.totalMarks,
                  ),

                passingMarks:
                  Number(
                    test.passingMarks,
                  ),

                date:
                  test.date ?? "",

                scores:
                  marksByTest.get(
                    String(
                      test._id,
                    ),
                  ) ?? {},

                status:
                  test.status,

                subjectId:
                  String(
                    test.subjectId,
                  ),

                subjectName:
                  subject?.name ??
                  "",
              };
            },
          ),
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load tests.",
      });
    }
  },
);

/* ========================================================================== */
/* UPDATE TEST / MARKS BULK                                                  */
/* ========================================================================== */

router.patch(
  "/tests/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const id =
        getParamId(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        res.status(400).json({
          error:
            "Invalid test ID.",
        });
        return;
      }

      const instituteFilter =
        getInstituteFilter(req);

      const test =
        await getOwnedTest(
          id,
          instituteFilter,
        );

      if (!test) {
        res.status(404).json({
          error:
            "Test not found.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER PERMISSION                                                 */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const assignedSubject =
          await Subject.findOne({
            ...instituteFilter,
            _id:
              test.subjectId,
            teacherId:
              teacherStaff._id,
          })
            .select(
              "_id teacherId courseId instituteId",
            )
            .lean()
            .exec();

        if (!assignedSubject) {
          res.status(403).json({
            error:
              "You are not assigned to this test subject.",
          });
          return;
        }

        const isBatchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            test.batchId,
          );

        if (!isBatchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this test batch.",
          });
          return;
        }
      }

      /* ------------------------------------------------------------------ */
      /* BULK SCORE UPDATE                                                  */
      /* ------------------------------------------------------------------ */

      const scores =
        req.body?.scores;

      if (
        scores &&
        typeof scores ===
          "object" &&
        !Array.isArray(scores)
      ) {
        for (
          const [
            studentId,
            rawValue,
          ] of Object.entries(
            scores as Record<
              string,
              unknown
            >,
          )
        ) {
          if (
            rawValue === "" ||
            rawValue === null ||
            rawValue ===
              undefined
          ) {
            continue;
          }

          if (
            !isValidObjectId(
              studentId,
            )
          ) {
            res.status(400).json({
              error:
                "One or more student IDs are invalid.",
            });
            return;
          }

          const marksObtained =
            Number(rawValue);

          if (
            !Number.isFinite(
              marksObtained,
            ) ||
            marksObtained < 0 ||
            marksObtained >
              test.totalMarks
          ) {
            res.status(400).json({
              error:
                `Marks must be between 0 and ${test.totalMarks}.`,
            });
            return;
          }

          const student =
            await getOwnedStudent(
              studentId,
              instituteFilter,
            );

          if (!student) {
            res.status(400).json({
              error:
                "One or more selected students were not found.",
            });
            return;
          }

          if (
            String(
              student.batchId,
            ) !==
            String(
              test.batchId,
            )
          ) {
            res.status(400).json({
              error:
                "A student does not belong to this test batch.",
            });
            return;
          }

          await TestMark.findOneAndUpdate(
            {
              instituteId:
                test.instituteId,

              testId:
                test._id,

              studentId:
                student._id,
            },
            {
              instituteId:
                test.instituteId,

              testId:
                test._id,

              studentId:
                student._id,

              marksObtained,

              grade:
                calculateGrade(
                  marksObtained,
                  test.totalMarks,
                ),

              remarks: "",
            },
            {
              upsert: true,
              new: true,
              runValidators: true,
            },
          )
            .lean()
            .exec();
        }

        const savedMarks =
          await TestMark.find({
            testId:
              test._id,

            ...instituteFilter,
          })
            .lean()
            .exec();

        const result: TestMarkMap =
          {};

        for (
          const mark of savedMarks
        ) {
          result[
            String(
              mark.studentId,
            )
          ] = String(
            mark.marksObtained,
          );
        }

        res.json({
          id: String(
            test._id,
          ),

          _id: String(
            test._id,
          ),

          scores: result,
        });

        return;
      }

      /* ------------------------------------------------------------------ */
      /* NORMAL TEST UPDATE                                                 */
      /* ------------------------------------------------------------------ */

      const updates: Record<
        string,
        unknown
      > = {};

      for (
        const key of [
          "name",
          "date",
          "startTime",
          "endTime",
          "room",
          "instructions",
        ]
      ) {
        if (
          req.body?.[key] !==
          undefined
        ) {
          updates[key] =
            clean(
              req.body[key],
            );
        }
      }

      if (
        req.body?.type !==
        undefined
      ) {
        const type =
          clean(
            req.body.type,
          );

        if (
          !isValidTestType(
            type,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test type.",
          });
          return;
        }

        updates.type =
          type;
      }

      if (
        req.body?.status !==
        undefined
      ) {
        const status =
          clean(
            req.body.status,
          );

        if (
          !isValidTestStatus(
            status,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test status.",
          });
          return;
        }

        updates.status =
          status;
      }

      if (
        updates.date !==
        undefined
      ) {
        if (
          !isValidDateString(
            String(
              updates.date,
            ),
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test date. Use YYYY-MM-DD.",
          });
          return;
        }
      }

      if (
        req.body?.totalMarks !==
        undefined
      ) {
        updates.totalMarks =
          Number(
            req.body.totalMarks,
          );
      }

      if (
        req.body?.maxMarks !==
        undefined
      ) {
        updates.totalMarks =
          Number(
            req.body.maxMarks,
          );
      }

      if (
        req.body?.passingMarks !==
        undefined
      ) {
        updates.passingMarks =
          Number(
            req.body.passingMarks,
          );
      }

      if (
        Object.keys(updates)
          .length === 0
      ) {
        res.status(400).json({
          error:
            "No valid fields provided for update.",
        });
        return;
      }

      const total =
        Number(
          updates.totalMarks ??
            test.totalMarks,
        );

      const pass =
        Number(
          updates.passingMarks ??
            test.passingMarks,
        );

      if (
        !Number.isFinite(
          total,
        ) ||
        total <= 0 ||
        !Number.isFinite(
          pass,
        ) ||
        pass < 0 ||
        pass > total
      ) {
        res.status(400).json({
          error:
            "Check Total and Passing Marks.",
        });
        return;
      }

      const result =
        await Test.findOneAndUpdate(
          {
            _id:
              toObjectId(id),

            ...instituteFilter,
          },
          updates,
          {
            new: true,
            runValidators: true,
          },
        )
          .lean()
          .exec();

      if (!result) {
        res.status(404).json({
          error:
            "Test not found.",
        });
        return;
      }

      res.json(
        await formatTest(
          result,
          instituteFilter,
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to update test.",
      });
    }
  },
);

/* ========================================================================== */
/* TEST PAPERS - GET                                                         */
/* ========================================================================== */

router.get(
  "/tests/papers",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
    "parent",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const instituteFilter =
        getInstituteFilter(req);

      const filter: Record<
        string,
        any
      > = {
        ...instituteFilter,
      };

      const seriesId =
        clean(
          req.query.seriesId,
        );

      const batchId =
        clean(
          req.query.batchId,
        );

      /* ------------------------------------------------------------------ */
      /* STUDENT                                                            */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "student"
      ) {
        const userId =
          clean(req.user.userId);

        if (
          !isValidObjectId(
            userId,
          )
        ) {
          res.status(403).json({
            error:
              "Invalid student account.",
          });
          return;
        }

        const student =
          await Student.findOne({
            userId:
              toObjectId(userId),

            ...instituteFilter,
          })
            .select(
              "_id batchId",
            )
            .lean()
            .exec();

        if (!student) {
          res.status(403).json({
            error:
              "Student profile not found.",
          });
          return;
        }

        if (!student.batchId) {
          res.json([]);
          return;
        }

        filter.batchId =
          student.batchId;
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER                                                            */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const assignedBatchIds =
          teacherStaff.batches ?? [];

        const subjectIds =
          await getTeacherSubjectIds(
            teacherStaff._id,
            instituteFilter,
          );

        if (
          assignedBatchIds.length ===
            0 ||
          subjectIds.length ===
            0
        ) {
          res.json([]);
          return;
        }

        filter.batchId = {
          $in:
            assignedBatchIds,
        };

        filter.subjectId = {
          $in:
            subjectIds,
        };

        if (batchId) {
          if (
            !isValidObjectId(
              batchId,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid batch ID.",
            });
            return;
          }

          const requestedBatchId =
            toObjectId(batchId);

          const assigned =
            assignedBatchIds.some(
              (assignedId) =>
                String(
                  assignedId,
                ) ===
                String(
                  requestedBatchId,
                ),
            );

          if (!assigned) {
            res.status(403).json({
              error:
                "You are not assigned to the selected batch.",
            });
            return;
          }

          filter.batchId =
            requestedBatchId;
        }
      }

      /* ------------------------------------------------------------------ */
      /* PARENT                                                             */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "parent"
      ) {
        res.json([]);
        return;
      }

      /* ------------------------------------------------------------------ */
      /* ADMIN FILTER                                                       */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
          "super_admin" ||
        req.user?.role ===
          "institute_admin"
      ) {
        if (batchId) {
          if (
            !isValidObjectId(
              batchId,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid batch ID.",
            });
            return;
          }

          filter.batchId =
            toObjectId(batchId);
        }
      }

      /* ------------------------------------------------------------------ */
      /* SERIES FILTER                                                      */
      /* ------------------------------------------------------------------ */

      if (seriesId) {
        if (
          !isValidObjectId(
            seriesId,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid series ID.",
          });
          return;
        }

        const series =
          await getOwnedSeries(
            seriesId,
            instituteFilter,
          );

        if (!series) {
          res.status(404).json({
            error:
              "Test series not found.",
          });
          return;
        }

        /*
         * Explicit series must also respect
         * the already-established batch
         * restriction.
         */
        if (
          req.user?.role ===
          "student"
        ) {
          if (
            !filter.batchId ||
            !(
              filter.batchId instanceof
              Types.ObjectId
            )
          ) {
            res.status(403).json({
              error:
                "Invalid student test access.",
            });
            return;
          }

          if (
            String(
              filter.batchId,
            ) !==
            String(
              series.batchId,
            )
          ) {
            res.status(403).json({
              error:
                "You cannot access this test series.",
            });
            return;
          }
        }

        if (
          req.user?.role ===
          "teacher"
        ) {
          const teacherStaff =
            await getTeacherStaff(
              req,
            );

          if (!teacherStaff) {
            res.status(403).json({
              error:
                "Teacher staff profile not found.",
            });
            return;
          }

          const assigned =
            await isTeacherAssignedToBatch(
              teacherStaff,
              series.batchId,
            );

          if (!assigned) {
            res.status(403).json({
              error:
                "You are not assigned to this test series batch.",
            });
            return;
          }
        }

        filter.seriesId =
          toObjectId(seriesId);
      }

      const list =
        await Test.find(
          filter as any,
        )
          .sort({
            date: -1,
            createdAt: -1,
          })
          .limit(500)
          .lean()
          .exec();

      res.json(
        await Promise.all(
          list.map(
            (item) =>
              formatTest(
                item,
                instituteFilter,
              ),
          ),
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load test papers.",
      });
    }
  },
);

/* ========================================================================== */
/* TEST PAPER - CREATE                                                       */
/* ========================================================================== */

router.post(
  "/tests/papers",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const instituteId =
        resolveWriteInstituteId(
          req,
          req.body?.instituteId,
        );

      if (!instituteId) {
        res.status(400).json({
          error:
            "A valid instituteId is required.",
        });
        return;
      }

      const instituteFilter: InstituteFilter =
        {
          instituteId,
        };

      const seriesId =
        clean(
          req.body?.seriesId,
        );

      const subjectId =
        clean(
          req.body?.subjectId,
        );

      const name =
        clean(
          req.body?.name,
        );

      const date =
        clean(
          req.body?.date,
        );

      const startTime =
        clean(
          req.body?.startTime,
        );

      const endTime =
        clean(
          req.body?.endTime,
        );

      const room =
        clean(
          req.body?.room,
        );

      const instructions =
        clean(
          req.body?.instructions,
        );

      const totalMarks =
        Number(
          req.body?.totalMarks,
        );

      const passingMarks =
        Number(
          req.body?.passingMarks,
        );

      if (
        !seriesId ||
        !subjectId ||
        !name ||
        !date
      ) {
        res.status(400).json({
          error:
            "Test Series, Subject, Paper Name and Date are required.",
        });
        return;
      }

      if (
        !isValidObjectId(
          seriesId,
        ) ||
        !isValidObjectId(
          subjectId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid test series or subject ID.",
        });
        return;
      }

      if (
        !isValidDateString(date)
      ) {
        res.status(400).json({
          error:
            "Invalid paper date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (
        !Number.isFinite(
          totalMarks,
        ) ||
        totalMarks <= 0 ||
        !Number.isFinite(
          passingMarks,
        ) ||
        passingMarks < 0 ||
        passingMarks >
          totalMarks
      ) {
        res.status(400).json({
          error:
            "Check Total and Passing Marks.",
        });
        return;
      }

      const series =
        await getOwnedSeries(
          seriesId,
          instituteFilter,
        );

      if (!series) {
        res.status(404).json({
          error:
            "Test series not found.",
        });
        return;
      }

      const checked =
        await validateBatchSubject(
          String(
            series.batchId,
          ),
          subjectId,
          instituteFilter,
        );

      if (
        "error" in checked
      ) {
        res.status(400).json({
          error:
            checked.error,
        });
        return;
      }

      /*
       * At this point TypeScript knows that
       * batch and subject exist.
       */
      const {
        batch,
        subject,
      } = checked;

      /* ------------------------------------------------------------------ */
      /* TEACHER PERMISSION                                                 */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const isBatchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            batch._id,
          );

        if (!isBatchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this batch.",
          });
          return;
        }

        const isSubjectAssigned =
          await isTeacherAssignedToSubject(
            teacherStaff._id,
            subject._id,
            instituteFilter,
          );

        if (!isSubjectAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this subject.",
          });
          return;
        }
      }

      /* ------------------------------------------------------------------ */
      /* DUPLICATE CHECK                                                    */
      /* ------------------------------------------------------------------ */

      const duplicate =
        await Test.findOne({
          seriesId:
            toObjectId(
              seriesId,
            ),

          subjectId:
            toObjectId(
              subjectId,
            ),

          ...instituteFilter,
        })
          .lean()
          .exec();

      if (duplicate) {
        res.status(409).json({
          error:
            "This subject paper is already added in this test.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* CREATE PAPER                                                       */
      /* ------------------------------------------------------------------ */

      const paper =
        await Test.create({
          instituteId,

          seriesId:
            toObjectId(
              seriesId,
            ),

          name,

          type:
            series.type,

          batchId:
            batch._id,

          subjectId:
            subject._id,

          date,

          startTime,

          endTime,

          room,

          instructions,

          totalMarks,

          passingMarks,

          status:
            "scheduled",
        });

      res.status(201).json(
        await formatTest(
          paper.toObject(),
          instituteFilter,
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to add subject paper.",
      });
    }
  },
);

/* ========================================================================== */
/* TEST PAPER - UPDATE                                                       */
/* ========================================================================== */

router.patch(
  "/tests/papers/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const id =
        getParamId(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        res.status(400).json({
          error:
            "Invalid paper ID.",
        });
        return;
      }

      const instituteFilter =
        getInstituteFilter(req);

      const old =
        await getOwnedTest(
          id,
          instituteFilter,
        );

      if (!old) {
        res.status(404).json({
          error:
            "Subject paper not found.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER PERMISSION                                                 */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const isBatchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            old.batchId,
          );

        if (!isBatchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this test batch.",
          });
          return;
        }

        const isSubjectAssigned =
          await isTeacherAssignedToSubject(
            teacherStaff._id,
            old.subjectId,
            instituteFilter,
          );

        if (!isSubjectAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this test subject.",
          });
          return;
        }
      }

      const updates: Record<
        string,
        unknown
      > = {};

      for (
        const key of [
          "name",
          "date",
          "startTime",
          "endTime",
          "room",
          "instructions",
        ]
      ) {
        if (
          req.body?.[key] !==
          undefined
        ) {
          updates[key] =
            clean(
              req.body[key],
            );
        }
      }

      if (
        req.body?.type !==
        undefined
      ) {
        const type =
          clean(
            req.body.type,
          );

        if (
          !isValidTestType(
            type,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test type.",
          });
          return;
        }

        updates.type =
          type;
      }

      if (
        updates.date !==
        undefined
      ) {
        if (
          !isValidDateString(
            String(
              updates.date,
            ),
          )
        ) {
          res.status(400).json({
            error:
              "Invalid paper date. Use YYYY-MM-DD.",
          });
          return;
        }
      }

      if (
        req.body?.status !==
        undefined
      ) {
        const status =
          clean(
            req.body.status,
          );

        if (
          !isValidTestStatus(
            status,
          )
        ) {
          res.status(400).json({
            error:
              "Invalid test status.",
          });
          return;
        }

        updates.status =
          status;
      }

      if (
        req.body?.totalMarks !==
        undefined
      ) {
        updates.totalMarks =
          Number(
            req.body.totalMarks,
          );
      }

      if (
        req.body?.maxMarks !==
        undefined
      ) {
        updates.totalMarks =
          Number(
            req.body.maxMarks,
          );
      }

      if (
        req.body?.passingMarks !==
        undefined
      ) {
        updates.passingMarks =
          Number(
            req.body.passingMarks,
          );
      }

      if (
        Object.keys(updates)
          .length === 0
      ) {
        res.status(400).json({
          error:
            "No valid fields provided for update.",
        });
        return;
      }

      const total =
        Number(
          updates.totalMarks ??
            old.totalMarks,
        );

      const pass =
        Number(
          updates.passingMarks ??
            old.passingMarks,
        );

      if (
        !Number.isFinite(
          total,
        ) ||
        total <= 0 ||
        !Number.isFinite(
          pass,
        ) ||
        pass < 0 ||
        pass > total
      ) {
        res.status(400).json({
          error:
            "Check Total and Passing Marks.",
        });
        return;
      }

      const result =
        await Test.findOneAndUpdate(
          {
            _id:
              toObjectId(id),

            ...instituteFilter,
          },
          updates,
          {
            new: true,
            runValidators: true,
          },
        )
          .lean()
          .exec();

      if (!result) {
        res.status(404).json({
          error:
            "Subject paper not found.",
        });
        return;
      }

      res.json(
        await formatTest(
          result,
          instituteFilter,
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to update paper.",
      });
    }
  },
);

/* ========================================================================== */
/* TEST PAPER - DELETE                                                       */
/* ========================================================================== */

router.delete(
  "/tests/papers/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const id =
        getParamId(
          req.params.id,
        );

      if (
        !isValidObjectId(id)
      ) {
        res.status(400).json({
          error:
            "Invalid paper ID.",
        });
        return;
      }

      const instituteFilter =
        getInstituteFilter(req);

      const test =
        await getOwnedTest(
          id,
          instituteFilter,
        );

      if (!test) {
        res.status(404).json({
          error:
            "Subject paper not found.",
        });
        return;
      }

      await TestMark.deleteMany({
        testId:
          test._id,

        ...instituteFilter,
      });

      await Test.deleteOne({
        _id:
          test._id,

        ...instituteFilter,
      });

      res.json({
        message:
          "Subject paper deleted.",
      });
    } catch {
      res.status(500).json({
        error:
          "Unable to delete paper.",
      });
    }
  },
);

/* ========================================================================== */
/* LEGACY /EXAM-SERIES COMPATIBILITY                                        */
/* ========================================================================== */

router.get(
  "/exam-series",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
    "parent",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      /*
       * Internally this is now TestSeries.
       * Route kept only for frontend compatibility.
       */
      await listTestSeriesForRequest(
        req,
        res,
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load test sessions.",
      });
    }
  },
);

/* ========================================================================== */
/* SAVE SINGLE TEST MARK                                                     */
/* ========================================================================== */

router.post(
  "/tests/:id/marks",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const testId =
        getParamId(
          req.params.id,
        );

      if (
        !isValidObjectId(
          testId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid test ID.",
        });
        return;
      }

      const instituteFilter =
        getInstituteFilter(req);

      const test =
        await getOwnedTest(
          testId,
          instituteFilter,
        );

      if (!test) {
        res.status(404).json({
          error:
            "Test not found.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER PERMISSION                                                 */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const isBatchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            test.batchId,
          );

        if (!isBatchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this test batch.",
          });
          return;
        }

        const isSubjectAssigned =
          await isTeacherAssignedToSubject(
            teacherStaff._id,
            test.subjectId,
            instituteFilter,
          );

        if (!isSubjectAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this test subject.",
          });
          return;
        }
      }

      const studentId =
        clean(
          req.body?.studentId,
        );

      const obtained =
        Number(
          req.body?.marksObtained,
        );

      const remarks =
        clean(
          req.body?.remarks,
        );

      if (
        !studentId ||
        !isValidObjectId(
          studentId,
        )
      ) {
        res.status(400).json({
          error:
            "Valid studentId is required.",
        });
        return;
      }

      if (
        !Number.isFinite(
          obtained,
        ) ||
        obtained < 0 ||
        obtained >
          test.totalMarks
      ) {
        res.status(400).json({
          error:
            `Marks must be 0 to ${test.totalMarks}.`,
        });
        return;
      }

      const student =
        await getOwnedStudent(
          studentId,
          instituteFilter,
        );

      if (!student) {
        res.status(404).json({
          error:
            "Student not found.",
        });
        return;
      }

      if (
        String(
          student.batchId,
        ) !==
        String(
          test.batchId,
        )
      ) {
        res.status(400).json({
          error:
            "Student is not in this batch.",
        });
        return;
      }

      const grade =
        calculateGrade(
          obtained,
          test.totalMarks,
        );

      /*
       * Important:
       * test.instituteId is used because
       * super_admin has an empty institute filter.
       */
      const mark =
        await TestMark.findOneAndUpdate(
          {
            instituteId:
              test.instituteId,

            testId:
              test._id,

            studentId:
              student._id,
          },
          {
            instituteId:
              test.instituteId,

            testId:
              test._id,

            studentId:
              student._id,

            marksObtained:
              obtained,

            grade,

            remarks,
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          },
        )
          .lean()
          .exec();

      if (!mark) {
        res.status(500).json({
          error:
            "Unable to save marks.",
        });
        return;
      }

      res.json({
        id: String(
          mark._id,
        ),

        _id: String(
          mark._id,
        ),

        studentId,

        studentName:
          student.name ?? "",

        marksObtained:
          mark.marksObtained,

        grade:
          mark.grade,

        resultStatus:
          obtained >=
          test.passingMarks
            ? "pass"
            : "fail",

        remarks:
          mark.remarks ?? "",
      });
    } catch {
      res.status(500).json({
        error:
          "Unable to save marks.",
      });
    }
  },
);

/* ========================================================================== */
/* TEST REPORT                                                               */
/* ========================================================================== */

router.get(
  "/test-report",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const instituteFilter =
        getInstituteFilter(req);

      const requestedStudentId =
        clean(
          req.query.studentId,
        );

      const studentId =
        await resolveStudentIdForRequest(
          req,
          requestedStudentId,
          instituteFilter,
        );

      const seriesIds =
        clean(
          req.query.seriesIds,
        );

      const batchId =
        clean(
          req.query.batchId,
        );

      const date =
        clean(
          req.query.date,
        );

      const month =
        clean(
          req.query.month,
        );

      if (!studentId) {
        res.status(400).json({
          error:
            "studentId is required.",
        });
        return;
      }

      if (
        !isValidObjectId(
          studentId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid student ID.",
        });
        return;
      }

      const student =
        await getOwnedStudent(
          studentId,
          instituteFilter,
        );

      if (!student) {
        res.status(404).json({
          error:
            "Student not found.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* STUDENT OWNERSHIP                                                  */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "student"
      ) {
        const ownUserId =
          clean(
            req.user.userId,
          );

        const ownStudent =
          await Student.findOne({
            userId:
              isValidObjectId(
                ownUserId,
              )
                ? toObjectId(
                    ownUserId,
                  )
                : undefined,

            ...instituteFilter,
          })
            .select("_id")
            .lean()
            .exec();

        if (
          !ownStudent ||
          String(
            ownStudent._id,
          ) !==
            String(
              student._id,
            )
        ) {
          res.status(403).json({
            error:
              "You can only view your own test report.",
          });
          return;
        }
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER OWNERSHIP                                                  */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        if (!student.batchId) {
          res.status(403).json({
            error:
              "Student batch not found.",
          });
          return;
        }

        const batchAssigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            student.batchId,
          );

        if (!batchAssigned) {
          res.status(403).json({
            error:
              "You are not assigned to this student's batch.",
          });
          return;
        }
      }

      const studentBatchId =
        String(
          student.batchId ??
            "",
        );

      if (
        batchId &&
        batchId !==
          studentBatchId
      ) {
        res.status(400).json({
          error:
            "Selected student does not belong to the selected batch.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* SERIES FILTER                                                      */
      /* ------------------------------------------------------------------ */

      const seriesFilter: Record<
        string,
        any
      > = {
        batchId:
          student.batchId,

        ...instituteFilter,
      };

      let series: any[] = [];

      if (seriesIds) {
        const ids =
          seriesIds
            .split(",")
            .map(
              (id) =>
                id.trim(),
            )
            .filter(Boolean);

        if (
          ids.some(
            (id) =>
              !isValidObjectId(
                id,
              ),
          )
        ) {
          res.status(400).json({
            error:
              "One or more series IDs are invalid.",
          });
          return;
        }

        /*
         * Explicit cast avoids Mongoose's
         * ObjectId/$in inference issue.
         */
        series =
          await TestSeries.find({
            _id: {
              $in:
                ids.map(
                  (id) =>
                    toObjectId(id),
                ),
            },

            ...seriesFilter,
          } as any)
            .lean()
            .exec();
      } else {
        if (date) {
          if (
            !isValidDateString(
              date,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid report date. Use YYYY-MM-DD.",
            });
            return;
          }

          seriesFilter.testDate =
            date;
        }

        if (month) {
          if (
            !isValidMonthString(
              month,
            )
          ) {
            res.status(400).json({
              error:
                "Invalid month. Use YYYY-MM.",
            });
            return;
          }

          seriesFilter.testDate =
            new RegExp(
              `^${escapeRegex(
                month,
              )}`,
            );
        }

        series =
          await TestSeries.find(
            seriesFilter as any,
          )
            .sort({
              testDate: 1,
              createdAt: 1,
            })
            .lean()
            .exec();
      }

      /* ------------------------------------------------------------------ */
      /* PAPERS                                                             */
      /* ------------------------------------------------------------------ */

      if (
        series.length ===
        0
      ) {
        res.json({
          studentId,

          studentName:
            student.name ?? "",

          enrollmentNo:
            student.enrollmentNo ??
            "",

          photoDataUrl:
            student.photoDataUrl ??
            "",

          series: [],

          testResults: [],

          examResults: [],

          totalMarks: 0,

          obtainedMarks: 0,

          percentage: 0,

          grade: "F",

          finalResult:
            "pending",
        });

        return;
      }

      const papers =
        await Test.find({
          seriesId: {
            $in:
              series.map(
                (item) =>
                  item._id,
              ),
          },

          ...instituteFilter,
        } as any)
          .sort({
            date: 1,
          })
          .lean()
          .exec();

      /* ------------------------------------------------------------------ */
      /* TEACHER SUBJECT RESTRICTION                                        */
      /* ------------------------------------------------------------------ */

      let visiblePapers =
        papers;

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const subjectIds =
          await getTeacherSubjectIds(
            teacherStaff._id,
            instituteFilter,
          );

        const subjectIdSet =
          new Set(
            subjectIds.map(
              (subjectId) =>
                String(
                  subjectId,
                ),
            ),
          );

        visiblePapers =
          papers.filter(
            (paper) =>
              subjectIdSet.has(
                String(
                  paper.subjectId,
                ),
              ),
          );
      }

      /* ------------------------------------------------------------------ */
      /* MARKS                                                              */
      /* ------------------------------------------------------------------ */

      const marks =
        visiblePapers.length
          ? await TestMark.find({
              studentId:
                student._id,

              testId: {
                $in:
                  visiblePapers.map(
                    (paper) =>
                      paper._id,
                  ),
              },

              ...instituteFilter,
            } as any)
              .lean()
              .exec()
          : [];

      const markMap =
        new Map<
          string,
          any
        >(
          marks.map(
            (mark) => [
              String(
                mark.testId,
              ),
              mark,
            ],
          ),
        );

      /* ------------------------------------------------------------------ */
      /* SUBJECTS                                                           */
      /* ------------------------------------------------------------------ */

      const subjectIds =
        visiblePapers.map(
          (paper) =>
            paper.subjectId,
        );

      const subjects =
        subjectIds.length
          ? await Subject.find({
              _id: {
                $in:
                  subjectIds,
              },

              ...instituteFilter,
            } as any)
              .select(
                "name",
              )
              .lean()
              .exec()
          : [];

      const subjectMap =
        new Map<
          string,
          string
        >(
          subjects.map(
            (subject) => [
              String(
                subject._id,
              ),
              subject.name,
            ],
          ),
        );

      const seriesMap =
        new Map<
          string,
          any
        >(
          series.map(
            (item) => [
              String(
                item._id,
              ),
              item,
            ],
          ),
        );

      /* ------------------------------------------------------------------ */
      /* REPORT ROWS                                                        */
      /* ------------------------------------------------------------------ */

      const rows =
        visiblePapers.map(
          (paper) => {
            const mark =
              markMap.get(
                String(
                  paper._id,
                ),
              );

            return {
              seriesId:
                String(
                  paper.seriesId,
                ),

              seriesTitle:
                seriesMap.get(
                  String(
                    paper.seriesId,
                  ),
                )?.title ??
                "",

              testId:
                String(
                  paper._id,
                ),

              testName:
                paper.name ??
                "",

              testDate:
                paper.date,

              subject:
                subjectMap.get(
                  String(
                    paper.subjectId,
                  ),
                ) ??
                "Subject",

              subjectId:
                String(
                  paper.subjectId,
                ),

              totalMarks:
                paper.totalMarks,

              passingMarks:
                paper.passingMarks,

              marksObtained:
                mark?.marksObtained ??
                null,

              grade:
                mark?.grade ??
                "",

              remarks:
                mark?.remarks ??
                "",

              resultStatus:
                mark
                  ? mark.marksObtained >=
                    paper.passingMarks
                    ? "pass"
                    : "fail"
                  : "not-entered",
            };
          },
        );

      /* ------------------------------------------------------------------ */
      /* SUMMARY                                                            */
      /* ------------------------------------------------------------------ */

      const entered =
        rows.filter(
          (row) =>
            row.marksObtained !==
            null,
        );

      const totalMarks =
        entered.reduce(
          (sum, row) =>
            sum +
            Number(
              row.totalMarks,
            ),
          0,
        );

      const obtainedMarks =
        entered.reduce(
          (sum, row) =>
            sum +
            Number(
              row.marksObtained,
            ),
          0,
        );

      const percentage =
        totalMarks > 0
          ? Math.round(
              (obtainedMarks /
                totalMarks) *
                100,
            )
          : 0;

      const finalResult =
        rows.length > 0 &&
        entered.length ===
          rows.length
          ? entered.every(
              (row) =>
                row.resultStatus ===
                "pass",
            )
            ? "pass"
            : "fail"
          : "pending";

      res.json({
        studentId,

        studentName:
          student.name ?? "",

        enrollmentNo:
          student.enrollmentNo ??
          "",

        photoDataUrl:
          student.photoDataUrl ??
          "",

        series:
          series.map(
            (item) => ({
              id: String(
                item._id,
              ),

              title:
                item.title,

              type:
                item.type,

              testDate:
                item.testDate,
            }),
          ),

        testResults:
          rows,

        /*
         * Legacy frontend compatibility.
         */
        examResults:
          rows,

        totalMarks,

        obtainedMarks,

        percentage,

        grade:
          entered.length > 0
            ? calculateGrade(
                obtainedMarks,
                totalMarks ||
                  1,
              )
            : "F",

        finalResult,
      });
    } catch {
      res.status(500).json({
        error:
          "Unable to build test report.",
      });
    }
  },
);

/* ========================================================================== */
/* MY TESTS                                                                  */
/* ========================================================================== */

router.get(
  "/my-tests",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
  ),
  async (
    req: UserRequest,
    res,
  ): Promise<void> => {
    try {
      const requestedStudentId =
        clean(
          req.query.studentId,
        );

      const instituteFilter =
        getInstituteFilter(req);

      const resolvedStudentId =
        await resolveStudentIdForRequest(
          req,
          requestedStudentId,
          instituteFilter,
        );

      if (!resolvedStudentId) {
        res.status(400).json({
          error:
            "Valid studentId is required.",
        });
        return;
      }

      if (
        !isValidObjectId(
          resolvedStudentId,
        )
      ) {
        res.status(400).json({
          error:
            "Invalid student ID.",
        });
        return;
      }

      const student =
        await getOwnedStudent(
          resolvedStudentId,
          instituteFilter,
        );

      if (!student) {
        res.status(404).json({
          error:
            "Student not found.",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* STUDENT SELF CHECK                                                 */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "student"
      ) {
        const userId =
          clean(
            req.user.userId,
          );

        if (
          !isValidObjectId(
            userId,
          )
        ) {
          res.status(403).json({
            error:
              "Invalid student account.",
          });
          return;
        }

        const ownStudent =
          await Student.findOne({
            userId:
              toObjectId(userId),

            ...instituteFilter,
          })
            .select("_id")
            .lean()
            .exec();

        if (
          !ownStudent ||
          String(
            ownStudent._id,
          ) !==
            String(
              student._id,
            )
        ) {
          res.status(403).json({
            error:
              "You can only view your own tests.",
          });
          return;
        }
      }

      /* ------------------------------------------------------------------ */
      /* TEACHER CHECK                                                      */
      /* ------------------------------------------------------------------ */

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        if (!student.batchId) {
          res.json([]);
          return;
        }

        const assigned =
          await isTeacherAssignedToBatch(
            teacherStaff,
            student.batchId,
          );

        if (!assigned) {
          res.status(403).json({
            error:
              "You are not assigned to this student's batch.",
          });
          return;
        }
      }

      const batchId =
        student.batchId;

      if (!batchId) {
        res.json([]);
        return;
      }

      const [
        tests,
        testMarks,
      ] = await Promise.all([
        Test.find({
          batchId,

          ...instituteFilter,
        })
          .sort({
            date: -1,
            startTime: -1,
          })
          .lean()
          .exec(),

        TestMark.find({
          studentId:
            student._id,

          ...instituteFilter,
        })
          .lean()
          .exec(),
      ]);

      /* ------------------------------------------------------------------ */
      /* TEACHER SUBJECT FILTER                                             */
      /* ------------------------------------------------------------------ */

      let visibleTests =
        tests;

      if (
        req.user?.role ===
        "teacher"
      ) {
        const teacherStaff =
          await getTeacherStaff(
            req,
          );

        if (!teacherStaff) {
          res.status(403).json({
            error:
              "Teacher staff profile not found.",
          });
          return;
        }

        const subjectIds =
          await getTeacherSubjectIds(
            teacherStaff._id,
            instituteFilter,
          );

        const subjectIdSet =
          new Set(
            subjectIds.map(
              (subjectId) =>
                String(
                  subjectId,
                ),
            ),
          );

        visibleTests =
          tests.filter(
            (test) =>
              subjectIdSet.has(
                String(
                  test.subjectId,
                ),
              ),
          );
      }

      /* ------------------------------------------------------------------ */
      /* SUBJECTS                                                           */
      /* ------------------------------------------------------------------ */

      const subjectIds =
        visibleTests.map(
          (test) =>
            test.subjectId,
        );

      const subjects =
        subjectIds.length
          ? await Subject.find({
              _id: {
                $in:
                  subjectIds,
              },

              ...instituteFilter,
            } as any)
              .select(
                "_id name code",
              )
              .lean()
              .exec()
          : [];

      const subjectMap =
        new Map<
          string,
          {
            name: string;
            code: string;
          }
        >(
          subjects.map(
            (subject) => [
              String(
                subject._id,
              ),
              {
                name:
                  subject.name ??
                  "",
                code:
                  subject.code ??
                  "",
              },
            ],
          ),
        );

      /* ------------------------------------------------------------------ */
      /* MARK MAP                                                           */
      /* ------------------------------------------------------------------ */

      const markMap =
        new Map<
          string,
          any
        >(
          testMarks.map(
            (mark) => [
              String(
                mark.testId,
              ),
              mark,
            ],
          ),
        );

      /* ------------------------------------------------------------------ */
      /* FORMAT                                                             */
      /* ------------------------------------------------------------------ */

      const formattedTests =
        visibleTests.map(
          (test) => {
            const studentResult =
              markMap.get(
                String(
                  test._id,
                ),
              );

            const totalMarks =
              Number(
                test.totalMarks ??
                  0,
              );

            const passingMarks =
              Number(
                test.passingMarks ??
                  0,
              );

            const marksObtained =
              studentResult &&
              studentResult.marksObtained !==
                undefined
                ? Number(
                    studentResult.marksObtained,
                  )
                : null;

            /*
             * Correct operator precedence.
             */
            const grade =
              studentResult?.grade ??
              (marksObtained !==
              null
                ? calculateGrade(
                    marksObtained,
                    totalMarks,
                  )
                : null);

            let resultStatus:
              | string
              | null =
              null;

            if (
              marksObtained !==
              null
            ) {
              resultStatus =
                marksObtained >=
                passingMarks
                  ? "Pass"
                  : "Fail";
            }

            const subject =
              subjectMap.get(
                String(
                  test.subjectId,
                ),
              );

            return {
              id: String(
                test._id,
              ),

              _id: String(
                test._id,
              ),

              title:
                test.name ??
                "Test",

              name:
                test.name ??
                "Test",

              subjectName:
                subject?.name ??
                "",

              subjectCode:
                subject?.code ??
                "",

              subjectId:
                String(
                  test.subjectId,
                ),

              testType:
                test.type ??
                "unit-test",

              testDate:
                test.date ??
                "",

              startTime:
                test.startTime ??
                null,

              endTime:
                test.endTime ??
                null,

              durationMinutes:
                test.duration ??
                60,

              totalMarks,

              maxMarks:
                totalMarks,

              passingMarks,

              venue:
                test.room ??
                "Academic Block",

              room:
                test.room ??
                "",

              instructions:
                test.instructions ??
                "",

              syllabus:
                "Complete syllabus",

              testUrl:
                "",

              marksObtained,

              grade,

              resultStatus,
            };
          },
        );

      res.json(
        formattedTests,
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load student tests.",
      });
    }
  },
);

/* ========================================================================== */
/* EXPORT                                                                     */
/* ========================================================================== */

export default router;