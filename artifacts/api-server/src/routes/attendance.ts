import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import {
  StudentAttendance,
  StaffAttendance,
} from "../models/Attendance";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";
import { User } from "../models/User";

const router: IRouter = Router();

type AppUser = {
  userId: string;
  email: string;
  role: string;
  instituteId?: string | null;
};

type AppRequest = Express.Request & {
  user?: AppUser;
};

type InstituteFilter = {
  instituteId?: Types.ObjectId;
};

const STUDENT_STATUSES = [
  "present",
  "absent",
  "late",
] as const;

const STAFF_STATUSES = [
  "present",
  "absent",
  "leave",
] as const;

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidObjectId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const month = Number(value.slice(5, 7));

  return month >= 1 && month <= 12;
}

function getInstituteId(
  req: AppRequest,
): Types.ObjectId | null {
  const instituteId = req.user?.instituteId;

  if (
    !instituteId ||
    !isValidObjectId(instituteId)
  ) {
    return null;
  }

  return new Types.ObjectId(instituteId);
}

function isSuperAdmin(req: AppRequest): boolean {
  return req.user?.role === "super_admin";
}

function getInstituteFilter(
  req: AppRequest,
): InstituteFilter | null {
  if (isSuperAdmin(req)) {
    return {};
  }

  const instituteId = getInstituteId(req);

  if (!instituteId) {
    return null;
  }

  return {
    instituteId,
  };
}

/*
 * Super Admin can work with any institute, but for
 * create/update operations an explicit instituteId
 * must be supplied in the request body.
 */
function resolveWriteInstituteId(
  req: AppRequest,
  bodyInstituteId: unknown,
): Types.ObjectId | null {
  if (isSuperAdmin(req)) {
    const instituteId = toText(bodyInstituteId);

    if (!isValidObjectId(instituteId)) {
      return null;
    }

    return new Types.ObjectId(instituteId);
  }

  return getInstituteId(req);
}

async function getTeacherAssignedBatchIds(
  req: AppRequest,
): Promise<string[] | null> {
  if (req.user?.role !== "teacher") {
    return null;
  }

  if (!isValidObjectId(req.user.userId)) {
    return [];
  }

  const instituteId = getInstituteId(req);

  if (!instituteId) {
    return [];
  }

  const user = await User.findOne({
    _id: new Types.ObjectId(req.user.userId),
    instituteId,
  }).select(
    "email phone loginId instituteId",
  );

  if (!user) {
    return [];
  }

  const email = toText(user.email).toLowerCase();

  const phone = toText(
    (user as unknown as Record<string, unknown>).phone,
  );

  const loginId = toText(
    (user as unknown as Record<string, unknown>).loginId,
  ).toLowerCase();

  const conditions: Record<string, string>[] = [];

  if (email) {
    conditions.push({ email });
  }

  if (phone) {
    conditions.push({ phone });
  }

  if (loginId) {
    conditions.push({ username: loginId });
  }

  if (!conditions.length) {
    return [];
  }

  const staff = await Staff.findOne({
    instituteId,
    $or: conditions,
  }).select("_id batches");

  const batches = (
    staff as unknown as {
      batches?: Types.ObjectId[];
    } | null
  )?.batches;

  return Array.isArray(batches)
    ? batches.map(String)
    : [];
}

function buildDateFilter(
  date: string,
  month: string,
): Record<string, unknown> {
  if (date) {
    return { date };
  }

  if (month) {
    return {
      date: {
        $regex: `^${month}`,
      },
    };
  }

  return {};
}

function formatStudentAttendance(
  record: {
    _id: Types.ObjectId;
    instituteId: Types.ObjectId;
    studentId: Types.ObjectId;
    batchId: Types.ObjectId;
    date: string;
    status: string;
    remarks?: string;
    createdAt?: Date;
    updatedAt?: Date;
  },
  studentName: string,
) {
  return {
    id: String(record._id),
    studentId: String(record.studentId),
    studentName,
    batchId: String(record.batchId),
    date: record.date,
    status: record.status,
    remarks: record.remarks ?? null,
    createdAt:
      record.createdAt?.toISOString?.() ?? null,
  };
}

function formatStaffAttendance(
  record: {
    _id: Types.ObjectId;
    instituteId: Types.ObjectId;
    staffId: Types.ObjectId;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    remarks?: string;
    createdAt?: Date;
    updatedAt?: Date;
  },
  staffName: string,
) {
  return {
    id: String(record._id),
    staffId: String(record.staffId),
    staffName,
    date: record.date,
    status: record.status,
    checkIn: record.checkIn ?? null,
    checkOut: record.checkOut ?? null,
    remarks: record.remarks ?? null,
    createdAt:
      record.createdAt?.toISOString?.() ?? null,
  };
}

/*
 * =========================================================
 * STUDENT ATTENDANCE — LIST
 * =========================================================
 */
router.get(
  "/attendance/student",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
    "parent",
  ),
  async (req, res): Promise<void> => {
    try {
      const request = req as AppRequest;

      const instituteFilter =
        getInstituteFilter(request);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      const batchId = toText(req.query.batchId);
      const studentId = toText(req.query.studentId);
      const date = toText(req.query.date);
      const month = toText(req.query.month);

      if (
        batchId &&
        !isValidObjectId(batchId)
      ) {
        res.status(400).json({
          error: "Invalid batch ID.",
        });
        return;
      }

      if (
        studentId &&
        !isValidObjectId(studentId)
      ) {
        res.status(400).json({
          error: "Invalid student ID.",
        });
        return;
      }

      if (date && !isValidDate(date)) {
        res.status(400).json({
          error: "Invalid date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (month && !isValidMonth(month)) {
        res.status(400).json({
          error: "Invalid month. Use YYYY-MM.",
        });
        return;
      }

      const teacherBatchIds =
        await getTeacherAssignedBatchIds(
          request,
        );

      if (
        teacherBatchIds !== null &&
        batchId &&
        !teacherBatchIds.includes(batchId)
      ) {
        res.status(403).json({
          error:
            "You are not assigned to this batch.",
        });
        return;
      }

      let effectiveStudentId = studentId;

      if (request.user?.role === "student") {
        if (
          !isValidObjectId(
            request.user.userId,
          )
        ) {
          res.status(401).json({
            error: "Invalid student account.",
          });
          return;
        }

        effectiveStudentId =
          request.user.userId;

        if (
          studentId &&
          studentId !== request.user.userId
        ) {
          res.status(403).json({
            error:
              "You can only view your own attendance.",
          });
          return;
        }
      }

      const recordFilter: Record<
        string,
        unknown
      > = {
        ...instituteFilter,
      };

      if (teacherBatchIds !== null) {
        recordFilter.batchId = batchId
          ? new Types.ObjectId(batchId)
          : {
              $in: teacherBatchIds.map(
                (id) =>
                  new Types.ObjectId(id),
              ),
            };
      } else if (batchId) {
        recordFilter.batchId =
          new Types.ObjectId(batchId);
      }

      if (effectiveStudentId) {
        recordFilter.studentId =
          new Types.ObjectId(
            effectiveStudentId,
          );
      }

      Object.assign(
        recordFilter,
        buildDateFilter(date, month),
      );

      const records =
        await StudentAttendance.find(
          recordFilter,
        )
          .sort({ date: -1 })
          .limit(500)
          .lean()
          .exec();

      /*
       * Batch + date view.
       */
      if (
        batchId &&
        date &&
        !effectiveStudentId
      ) {
        const studentFilter: {
          instituteId?: Types.ObjectId;
          batchId: Types.ObjectId;
        } = {
          batchId:
            new Types.ObjectId(batchId),
        };

        if (
          instituteFilter.instituteId
        ) {
          studentFilter.instituteId =
            instituteFilter.instituteId;
        }

        if (
          teacherBatchIds !== null &&
          !teacherBatchIds.includes(batchId)
        ) {
          res.status(403).json({
            error:
              "You are not assigned to this batch.",
          });
          return;
        }

        const students =
          await Student.find(studentFilter)
            .select("_id name")
            .sort({ name: 1 })
            .lean()
            .exec();

        const recordByStudent =
          new Map(
            records.map((record) => [
              String(record.studentId),
              record,
            ]),
          );

        const result = students.map(
          (student) => {
            const record =
              recordByStudent.get(
                String(student._id),
              );

            return {
              id: record
                ? String(record._id)
                : `not-marked-${String(
                    student._id,
                  )}`,
              studentId: String(
                student._id,
              ),
              studentName:
                student.name ?? "",
              batchId,
              date,
              status:
                record?.status ??
                "not_marked",
              remarks:
                record?.remarks ?? null,
              createdAt:
                record?.createdAt
                  ?.toISOString?.() ??
                null,
            };
          },
        );

        res.json(result);
        return;
      }

      const studentIds = [
        ...new Set(
          records.map((record) =>
            String(record.studentId),
          ),
        ),
      ];

      const students = studentIds.length
        ? await Student.find({
            _id: {
              $in: studentIds.map(
                (id) =>
                  new Types.ObjectId(id),
              ),
            },
            ...instituteFilter,
          })
            .select("_id name")
            .lean()
            .exec()
        : [];

      const nameByStudent = new Map(
        students.map((student) => [
          String(student._id),
          student.name ?? "",
        ]),
      );

      res.json(
        records.map((record) =>
          formatStudentAttendance(
            record,
            nameByStudent.get(
              String(record.studentId),
            ) ?? "",
          ),
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load student attendance.",
      });
    }
  },
);

/*
 * =========================================================
 * STUDENT ATTENDANCE — CREATE / UPDATE
 * =========================================================
 */
router.post(
  "/attendance/student",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
  ),
  async (req, res): Promise<void> => {
    try {
      const request = req as AppRequest;

      const instituteId =
        resolveWriteInstituteId(
          request,
          req.body?.instituteId,
        );

      if (!instituteId) {
        res.status(400).json({
          error:
            "Valid instituteId is required.",
        });
        return;
      }

      const studentId = toText(
        req.body?.studentId,
      );
      const batchId = toText(
        req.body?.batchId,
      );
      const date = toText(
        req.body?.date,
      );
      const status = toText(
        req.body?.status,
      );
      const remarks = toText(
        req.body?.remarks,
      );

      if (
        !studentId ||
        !batchId ||
        !date ||
        !status
      ) {
        res.status(400).json({
          error:
            "Student, Batch, Date and Status are required.",
        });
        return;
      }

      if (!isValidObjectId(studentId)) {
        res.status(400).json({
          error: "Invalid student ID.",
        });
        return;
      }

      if (!isValidObjectId(batchId)) {
        res.status(400).json({
          error: "Invalid batch ID.",
        });
        return;
      }

      if (!isValidDate(date)) {
        res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (
        !STUDENT_STATUSES.includes(
          status as (typeof STUDENT_STATUSES)[number],
        )
      ) {
        res.status(400).json({
          error:
            "Invalid student attendance status.",
        });
        return;
      }

      const teacherBatchIds =
        await getTeacherAssignedBatchIds(
          request,
        );

      if (
        teacherBatchIds !== null &&
        !teacherBatchIds.includes(batchId)
      ) {
        res.status(403).json({
          error:
            "You are not assigned to this batch.",
        });
        return;
      }

      const student =
        await Student.findOne({
          _id: new Types.ObjectId(
            studentId,
          ),
          instituteId,
        })
          .select(
            "_id name batchId instituteId",
          )
          .lean()
          .exec();

      if (!student) {
        res.status(404).json({
          error: "Student not found.",
        });
        return;
      }

      if (
        String(student.batchId) !==
        batchId
      ) {
        res.status(400).json({
          error:
            "Selected student does not belong to this batch.",
        });
        return;
      }

      const record =
        await StudentAttendance.findOneAndUpdate(
          {
            instituteId,
            studentId:
              new Types.ObjectId(
                studentId,
              ),
            batchId:
              new Types.ObjectId(
                batchId,
              ),
            date,
          },
          {
            $set: {
              instituteId,
              studentId:
                new Types.ObjectId(
                  studentId,
                ),
              batchId:
                new Types.ObjectId(
                  batchId,
                ),
              date,
              status,
              remarks,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            includeResultMetadata: false,
          },
        )
          .lean()
          .exec();

      if (!record) {
        res.status(500).json({
          error:
            "Unable to save student attendance.",
        });
        return;
      }

      res.status(201).json(
        formatStudentAttendance(
          record,
          student.name ?? "",
        ),
      );
    } catch (error: unknown) {
      const mongoError =
        error as {
          code?: number;
        };

      if (mongoError.code === 11000) {
        res.status(409).json({
          error:
            "Attendance already exists for this student and date.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Unable to save student attendance.",
      });
    }
  },
);

/*
 * =========================================================
 * STAFF ATTENDANCE — LIST
 * =========================================================
 */
router.get(
  "/attendance/staff",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const request = req as AppRequest;

      const instituteFilter =
        getInstituteFilter(request);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      const staffId = toText(
        req.query.staffId,
      );
      const date = toText(
        req.query.date,
      );
      const month = toText(
        req.query.month,
      );

      if (
        staffId &&
        !isValidObjectId(staffId)
      ) {
        res.status(400).json({
          error: "Invalid staff ID.",
        });
        return;
      }

      if (date && !isValidDate(date)) {
        res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (month && !isValidMonth(month)) {
        res.status(400).json({
          error:
            "Invalid month. Use YYYY-MM.",
        });
        return;
      }

      const filter: Record<
        string,
        unknown
      > = {
        ...instituteFilter,
      };

      if (staffId) {
        filter.staffId =
          new Types.ObjectId(staffId);
      }

      Object.assign(
        filter,
        buildDateFilter(date, month),
      );

      const records =
        await StaffAttendance.find(filter)
          .sort({ date: -1 })
          .limit(500)
          .lean()
          .exec();

      const staffIds = [
        ...new Set(
          records.map((record) =>
            String(record.staffId),
          ),
        ),
      ];

      const staffMembers =
        staffIds.length
          ? await Staff.find({
              _id: {
                $in: staffIds.map(
                  (id) =>
                    new Types.ObjectId(id),
                ),
              },
              ...instituteFilter,
            })
              .select("_id name")
              .lean()
              .exec()
          : [];

      const nameByStaff = new Map(
        staffMembers.map((member) => [
          String(member._id),
          member.name ?? "",
        ]),
      );

      res.json(
        records.map((record) =>
          formatStaffAttendance(
            record,
            nameByStaff.get(
              String(record.staffId),
            ) ?? "",
          ),
        ),
      );
    } catch {
      res.status(500).json({
        error:
          "Unable to load staff attendance.",
      });
    }
  },
);

/*
 * =========================================================
 * STAFF ATTENDANCE — CREATE / UPDATE
 * =========================================================
 */
router.post(
  "/attendance/staff",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const request = req as AppRequest;

      const instituteId =
        resolveWriteInstituteId(
          request,
          req.body?.instituteId,
        );

      if (!instituteId) {
        res.status(400).json({
          error:
            "Valid instituteId is required.",
        });
        return;
      }

      const staffId = toText(
        req.body?.staffId,
      );
      const date = toText(
        req.body?.date,
      );
      const status = toText(
        req.body?.status,
      );
      const checkIn = toText(
        req.body?.checkIn,
      );
      const checkOut = toText(
        req.body?.checkOut,
      );
      const remarks = toText(
        req.body?.remarks,
      );

      if (
        !staffId ||
        !date ||
        !status
      ) {
        res.status(400).json({
          error:
            "Staff, Date and Status are required.",
        });
        return;
      }

      if (!isValidObjectId(staffId)) {
        res.status(400).json({
          error: "Invalid staff ID.",
        });
        return;
      }

      if (!isValidDate(date)) {
        res.status(400).json({
          error:
            "Invalid date. Use YYYY-MM-DD.",
        });
        return;
      }

      if (
        !STAFF_STATUSES.includes(
          status as (typeof STAFF_STATUSES)[number],
        )
      ) {
        res.status(400).json({
          error:
            "Invalid staff attendance status.",
        });
        return;
      }

      const staff =
        await Staff.findOne({
          _id: new Types.ObjectId(
            staffId,
          ),
          instituteId,
        })
          .select("_id name instituteId")
          .lean()
          .exec();

      if (!staff) {
        res.status(404).json({
          error: "Staff member not found.",
        });
        return;
      }

      const record =
        await StaffAttendance.findOneAndUpdate(
          {
            instituteId,
            staffId:
              new Types.ObjectId(
                staffId,
              ),
            date,
          },
          {
            $set: {
              instituteId,
              staffId:
                new Types.ObjectId(
                  staffId,
                ),
              date,
              status,
              checkIn:
                checkIn || undefined,
              checkOut:
                checkOut || undefined,
              remarks,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            includeResultMetadata: false,
          },
        )
          .lean()
          .exec();

      if (!record) {
        res.status(500).json({
          error:
            "Unable to save staff attendance.",
        });
        return;
      }

      res.status(201).json(
        formatStaffAttendance(
          record,
          staff.name ?? "",
        ),
      );
    } catch (error: unknown) {
      const mongoError =
        error as {
          code?: number;
        };

      if (mongoError.code === 11000) {
        res.status(409).json({
          error:
            "Attendance already exists for this staff member and date.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Unable to save staff attendance.",
      });
    }
  },
);

/*
 * =========================================================
 * STUDENT ATTENDANCE — SUMMARY
 * =========================================================
 */
router.get(
  "/attendance/student/summary",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "student",
    "parent",
  ),
  async (req, res): Promise<void> => {
    try {
      const request = req as AppRequest;

      const instituteFilter =
        getInstituteFilter(request);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      let studentId = toText(
        req.query.studentId,
      );

      const month = toText(
        req.query.month,
      );

      if (month && !isValidMonth(month)) {
        res.status(400).json({
          error:
            "Invalid month. Use YYYY-MM.",
        });
        return;
      }

      if (request.user?.role === "student") {
        studentId = request.user.userId;
      }

      if (!studentId) {
        res.status(400).json({
          error: "studentId is required.",
        });
        return;
      }

      if (!isValidObjectId(studentId)) {
        res.status(400).json({
          error: "Invalid student ID.",
        });
        return;
      }

      if (
        request.user?.role === "student" &&
        studentId !== request.user.userId
      ) {
        res.status(403).json({
          error:
            "You can only view your own attendance.",
        });
        return;
      }

      const student =
        await Student.findOne({
          _id: new Types.ObjectId(
            studentId,
          ),
          ...instituteFilter,
        })
          .select("_id")
          .lean()
          .exec();

      if (!student) {
        res.status(404).json({
          error: "Student not found.",
        });
        return;
      }

      const filter: Record<
        string,
        unknown
      > = {
        studentId:
          new Types.ObjectId(studentId),
        ...instituteFilter,
      };

      if (month) {
        filter.date = {
          $regex: `^${month}`,
        };
      }

      const records =
        await StudentAttendance.find(filter)
          .select("status")
          .lean()
          .exec();

      const present =
        records.filter(
          (record) =>
            record.status === "present",
        ).length;

      const absent =
        records.filter(
          (record) =>
            record.status === "absent",
        ).length;

      const late =
        records.filter(
          (record) =>
            record.status === "late",
        ).length;

      const total = records.length;

      res.json({
        studentId,
        totalClasses: total,
        present,
        absent,
        late,
        percentage: total
          ? Math.round(
              ((present + late) /
                total) *
                100,
            )
          : 0,
      });
    } catch {
      res.status(500).json({
        error:
          "Unable to load attendance summary.",
      });
    }
  },
);

export default router;