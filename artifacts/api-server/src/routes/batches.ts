import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { Student } from "../models/Student";

const router: IRouter = Router();

type User = {
  role: string;
  instituteId?: string | null;
};

function getLoggedInUser(req: any): User {
  return req.user as User;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);

  if (user.role === "super_admin") {
    return null;
  }

  return user.instituteId ? String(user.instituteId) : null;
}

function getRouteId(req: any): string {
  const id = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  return String(id ?? "").trim();
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

function getString(value: unknown): string {
  return String(value ?? "").trim();
}

function getPositiveNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

function getAllowedStatus(
  value: unknown,
): "active" | "completed" | "upcoming" | null {
  const status = getString(value);

  if (
    status !== "active" &&
    status !== "completed" &&
    status !== "upcoming"
  ) {
    return null;
  }

  return status;
}

async function fmtBatch(batch: any) {
  const course =
    batch.courseId &&
    typeof batch.courseId === "object" &&
    batch.courseId.name
      ? batch.courseId
      : await Course.findById(batch.courseId).select("name");

  return {
    id: String(batch._id),
    name: batch.name ?? "",
    instituteId: batch.instituteId
      ? String(batch.instituteId)
      : null,
    courseId: batch.courseId
      ? String(
          typeof batch.courseId === "object"
            ? batch.courseId._id
            : batch.courseId,
        )
      : "",
    courseName: course?.name ?? null,
    capacity: batch.capacity,
    enrolled: batch.studentIds?.length ?? 0,
    schedule: batch.schedule ?? "",
    academicYear: batch.academicYear ?? "",
    startDate: batch.startDate ?? "",
    endDate: batch.endDate ?? null,
    status: batch.status,
    studentIds: (batch.studentIds ?? []).map(String),
    createdAt:
      batch.createdAt?.toISOString?.() ??
      new Date().toISOString(),
    updatedAt:
      batch.updatedAt?.toISOString?.() ??
      new Date().toISOString(),
  };
}

function buildInstituteFilter(
  req: any,
  id?: string,
) {
  const user = getLoggedInUser(req);
  const instituteId = getInstituteIdForUser(req);

  const filter: Record<string, unknown> = {};

  if (id) {
    filter._id = id;
  }

  if (user.role !== "super_admin") {
    if (!instituteId) {
      return {
        filter: null,
        instituteId: null,
      };
    }

    filter.instituteId = instituteId;
  }

  return {
    filter,
    instituteId,
  };
}

/* =========================================================
   GET BATCHES
========================================================= */

router.get(
  "/batches",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
    "student",
  ),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);

      const courseId = getString(req.query.courseId);
      const academicYear = getString(
        req.query.academicYear,
      );

      const { filter, instituteId } =
        buildInstituteFilter(req);

      if (!filter) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      if (courseId) {
        if (!isValidObjectId(courseId)) {
          res.status(400).json({
            error: "Invalid course ID",
          });
          return;
        }

        const courseFilter: Record<string, unknown> = {
          _id: courseId,
        };

        if (user.role !== "super_admin") {
          courseFilter.instituteId = instituteId;
        }

        const course =
          await Course.findOne(courseFilter).select(
            "_id",
          );

        if (!course) {
          res.status(404).json({
            error: "Course not found",
          });
          return;
        }

        filter.courseId = courseId;
      }

      if (academicYear) {
        filter.academicYear = academicYear;
      }

      const batches = await Batch.find(filter)
        .populate("courseId", "name")
        .sort({ createdAt: -1 });

      res.json(
        await Promise.all(
          batches.map(fmtBatch),
        ),
      );
    } catch (error) {
      console.error("BATCH LIST ERROR:", error);

      res.status(500).json({
        error: "Unable to load batches.",
      });
    }
  },
);

/* =========================================================
   CREATE BATCH
========================================================= */

router.post(
  "/batches",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);

      let instituteId =
        getInstituteIdForUser(req);

      /*
       * Super admin can create a batch for
       * a selected institute.
       */
      if (user.role === "super_admin") {
        instituteId = getString(
          req.body?.instituteId,
        );

        if (!instituteId) {
          res.status(400).json({
            error:
              "instituteId is required to create a batch",
          });
          return;
        }

        if (!isValidObjectId(instituteId)) {
          res.status(400).json({
            error: "Invalid institute ID",
          });
          return;
        }
      }

      if (!instituteId) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      const name = getString(req.body?.name);
      const courseId = getString(
        req.body?.courseId,
      );
      const schedule = getString(
        req.body?.schedule,
      );
      const academicYear = getString(
        req.body?.academicYear,
      );
      const startDate = getString(
        req.body?.startDate,
      );
      const endDate = getString(
        req.body?.endDate,
      );

      const capacity = getPositiveNumber(
        req.body?.capacity,
      );

      const status =
        req.body?.status === undefined
          ? "active"
          : getAllowedStatus(req.body?.status);

      if (
        !name ||
        !courseId ||
        !schedule ||
        !academicYear ||
        !startDate ||
        capacity === null
      ) {
        res.status(400).json({
          error:
            "Name, Course, Capacity, Schedule, Academic Year and Start Date are required.",
        });
        return;
      }

      if (!isValidObjectId(courseId)) {
        res.status(400).json({
          error: "Invalid course ID",
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          error:
            "Status must be active, completed or upcoming.",
        });
        return;
      }

      if (
        endDate &&
        endDate < startDate
      ) {
        res.status(400).json({
          error:
            "End Date cannot be earlier than Start Date.",
        });
        return;
      }

      /*
       * Course must belong to the same institute.
       */
      const course =
        await Course.findOne({
          _id: courseId,
          instituteId,
        }).select("_id");

      if (!course) {
        res.status(400).json({
          error:
            "Selected course does not belong to this institute.",
        });
        return;
      }

      const batch =
        await Batch.create({
          name,
          courseId,
          capacity,
          schedule,
          academicYear,
          startDate,
          ...(endDate ? { endDate } : {}),
          status,
          instituteId,
          studentIds: [],
        });

      const populated =
        await Batch.findById(batch._id).populate(
          "courseId",
          "name",
        );

      res.status(201).json(
        await fmtBatch(
          populated ?? batch,
        ),
      );
    } catch (error) {
      console.error(
        "BATCH CREATE ERROR:",
        error,
      );

      res.status(500).json({
        error: "Unable to create batch.",
      });
    }
  },
);

/* =========================================================
   GET SINGLE BATCH
========================================================= */

router.get(
  "/batches/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
    "student",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid batch ID",
        });
        return;
      }

      const { filter } =
        buildInstituteFilter(req, id);

      if (!filter) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      const batch =
        await Batch.findOne(filter).populate(
          "courseId",
          "name",
        );

      if (!batch) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      res.json(await fmtBatch(batch));
    } catch (error) {
      console.error(
        "BATCH GET ERROR:",
        error,
      );

      res.status(500).json({
        error: "Unable to load batch.",
      });
    }
  },
);

/* =========================================================
   UPDATE BATCH
========================================================= */

router.patch(
  "/batches/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid batch ID",
        });
        return;
      }

      const user = getLoggedInUser(req);

      const { filter, instituteId } =
        buildInstituteFilter(req, id);

      if (!filter) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      const existing =
        await Batch.findOne(filter);

      if (!existing) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      const updateData: Record<
        string,
        unknown
      > = {};

      if (req.body?.name !== undefined) {
        const name = getString(
          req.body.name,
        );

        if (!name) {
          res.status(400).json({
            error: "Batch name is required.",
          });
          return;
        }

        updateData.name = name;
      }

      if (
        req.body?.capacity !== undefined
      ) {
        const capacity =
          getPositiveNumber(
            req.body.capacity,
          );

        if (capacity === null) {
          res.status(400).json({
            error:
              "Capacity must be a positive number.",
          });
          return;
        }

        const enrolled =
          existing.studentIds?.length ?? 0;

        if (capacity < enrolled) {
          res.status(400).json({
            error:
              `Capacity cannot be less than current enrolled students (${enrolled}).`,
          });
          return;
        }

        updateData.capacity = capacity;
      }

      if (
        req.body?.schedule !== undefined
      ) {
        const schedule = getString(
          req.body.schedule,
        );

        if (!schedule) {
          res.status(400).json({
            error:
              "Schedule is required.",
          });
          return;
        }

        updateData.schedule = schedule;
      }

      if (
        req.body?.academicYear !==
        undefined
      ) {
        const academicYear =
          getString(
            req.body.academicYear,
          );

        if (!academicYear) {
          res.status(400).json({
            error:
              "Academic Year is required.",
          });
          return;
        }

        updateData.academicYear =
          academicYear;
      }

      if (
        req.body?.startDate !== undefined
      ) {
        const startDate = getString(
          req.body.startDate,
        );

        if (!startDate) {
          res.status(400).json({
            error:
              "Start Date is required.",
          });
          return;
        }

        updateData.startDate =
          startDate;
      }

      if (
        req.body?.endDate !== undefined
      ) {
        const endDate = getString(
          req.body.endDate,
        );

        updateData.endDate =
          endDate || undefined;
      }

      if (
        req.body?.status !== undefined
      ) {
        const status =
          getAllowedStatus(
            req.body.status,
          );

        if (!status) {
          res.status(400).json({
            error:
              "Status must be active, completed or upcoming.",
          });
          return;
        }

        updateData.status = status;
      }

      if (
        req.body?.courseId !== undefined
      ) {
        const courseId = getString(
          req.body.courseId,
        );

        if (!courseId) {
          res.status(400).json({
            error:
              "Course is required.",
          });
          return;
        }

        if (!isValidObjectId(courseId)) {
          res.status(400).json({
            error:
              "Invalid course ID",
          });
          return;
        }

        const course =
          await Course.findOne({
            _id: courseId,
            instituteId:
              user.role === "super_admin"
                ? existing.instituteId
                : instituteId,
          }).select("_id");

        if (!course) {
          res.status(400).json({
            error:
              "Selected course does not belong to this institute.",
          });
          return;
        }

        updateData.courseId =
          courseId;
      }

      if (
        updateData.startDate !==
          undefined &&
        updateData.endDate !==
          undefined
      ) {
        const startDate = String(
          updateData.startDate,
        );

        const endDate =
          updateData.endDate
            ? String(updateData.endDate)
            : "";

        if (
          endDate &&
          endDate < startDate
        ) {
          res.status(400).json({
            error:
              "End Date cannot be earlier than Start Date.",
          });
          return;
        }
      }

      /*
       * Prevent empty PATCH.
       */
      if (
        Object.keys(updateData).length === 0
      ) {
        res.status(400).json({
          error:
            "No valid batch fields were provided for update.",
        });
        return;
      }

      const batch =
        await Batch.findOneAndUpdate(
          filter,
          updateData,
          {
            new: true,
            runValidators: true,
          },
        ).populate(
          "courseId",
          "name",
        );

      if (!batch) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      res.json(await fmtBatch(batch));
    } catch (error) {
      console.error(
        "BATCH UPDATE ERROR:",
        error,
      );

      res.status(500).json({
        error: "Unable to update batch.",
      });
    }
  },
);

/* =========================================================
   DELETE BATCH
========================================================= */

router.delete(
  "/batches/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid batch ID",
        });
        return;
      }

      const { filter } =
        buildInstituteFilter(req, id);

      if (!filter) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      const batch =
        await Batch.findOneAndDelete(filter);

      if (!batch) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      res.sendStatus(204);
    } catch (error) {
      console.error(
        "BATCH DELETE ERROR:",
        error,
      );

      res.status(500).json({
        error: "Unable to delete batch.",
      });
    }
  },
);

/* =========================================================
   ADD STUDENT TO BATCH
========================================================= */

router.post(
  "/batches/:id/students",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);
      const studentId = getString(
        req.body?.studentId,
      );

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid batch ID",
        });
        return;
      }

      if (!studentId) {
        res.status(400).json({
          error: "studentId is required",
        });
        return;
      }

      if (!isValidObjectId(studentId)) {
        res.status(400).json({
          error: "Invalid student ID",
        });
        return;
      }

      const { filter } =
        buildInstituteFilter(req, id);

      if (!filter) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      const batch =
        await Batch.findOne(filter);

      if (!batch) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      const instituteId =
        String(batch.instituteId);

      const student =
        await Student.findOne({
          _id: studentId,
          instituteId,
        }).select("_id");

      if (!student) {
        res.status(400).json({
          error:
            "Student does not belong to this institute.",
        });
        return;
      }

      const alreadyEnrolled =
        (batch.studentIds ?? []).some(
          (id) =>
            String(id) ===
            studentId,
        );

      if (alreadyEnrolled) {
        res.status(409).json({
          error:
            "Student is already enrolled in this batch.",
        });
        return;
      }

      const enrolled =
        batch.studentIds?.length ?? 0;

      if (
        enrolled >= batch.capacity
      ) {
        res.status(400).json({
          error:
            "Batch capacity has been reached.",
        });
        return;
      }

      const updatedBatch =
        await Batch.findOneAndUpdate(
          {
            _id: batch._id,
            instituteId:
              batch.instituteId,
          },
          {
            $addToSet: {
              studentIds: studentId,
            },
          },
          {
            new: true,
          },
        ).populate(
          "courseId",
          "name",
        );

      if (!updatedBatch) {
        res.status(404).json({
          error: "Batch not found",
        });
        return;
      }

      res.json(
        await fmtBatch(updatedBatch),
      );
    } catch (error) {
      console.error(
        "BATCH STUDENT ADD ERROR:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to add student to batch.",
      });
    }
  },
);

export default router;