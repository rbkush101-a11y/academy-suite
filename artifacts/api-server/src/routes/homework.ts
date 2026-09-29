import { Router, type IRouter, type Request } from "express";
import mongoose, { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Homework } from "../models/Homework";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

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

const ALLOWED_ROLES = [
  "super_admin",
  "institute_admin",
  "teacher",
  "student",
  "parent",
];

const MANAGE_ROLES = [
  "super_admin",
  "institute_admin",
  "teacher",
];

const clean = (value: unknown): string => String(value ?? "").trim();

function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getInstituteFilter(req: UserRequest): InstituteFilter {
  if (req.user?.role === "super_admin") {
    return {};
  }

  const instituteId = clean(req.user?.instituteId);

  if (!isValidObjectId(instituteId)) {
    return {
      instituteId: new Types.ObjectId(),
    };
  }

  return {
    instituteId: new Types.ObjectId(instituteId),
  };
}

function resolveWriteInstituteId(
  req: UserRequest,
  bodyInstituteId?: unknown,
): Types.ObjectId | null {
  const bodyId = clean(bodyInstituteId);

  if (req.user?.role === "super_admin") {
    if (!bodyId || !isValidObjectId(bodyId)) {
      return null;
    }

    return new Types.ObjectId(bodyId);
  }

  const jwtInstituteId = clean(req.user?.instituteId);

  if (!jwtInstituteId || !isValidObjectId(jwtInstituteId)) {
    return null;
  }

  return new Types.ObjectId(jwtInstituteId);
}

function isValidDateString(value: string): boolean {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function validateStatus(value: unknown): value is "active" | "completed" {
  return value === "active" || value === "completed";
}

async function getOwnedBatch(
  batchId: string,
  instituteFilter: InstituteFilter,
) {
  if (!isValidObjectId(batchId)) {
    return null;
  }

  return Batch.findOne({
    _id: new Types.ObjectId(batchId),
    ...instituteFilter,
  })
    .select("name courseId instituteId")
    .lean()
    .exec();
}

async function getOwnedSubject(
  subjectId: string,
  instituteFilter: InstituteFilter,
) {
  if (!isValidObjectId(subjectId)) {
    return null;
  }

  return Subject.findOne({
    _id: new Types.ObjectId(subjectId),
    ...instituteFilter,
  })
    .select("name code courseId teacherId instituteId")
    .lean()
    .exec();
}

async function validateBatchAndSubject(
  batchId: string,
  subjectId: string,
  instituteFilter: InstituteFilter,
) {
  const [batch, subject] = await Promise.all([
    getOwnedBatch(batchId, instituteFilter),
    getOwnedSubject(subjectId, instituteFilter),
  ]);

  if (!batch) {
    return {
      error: "Selected batch not found.",
    };
  }

  if (!subject) {
    return {
      error: "Selected subject not found.",
    };
  }

  if (
    String(batch.courseId ?? "") !==
    String(subject.courseId ?? "")
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

async function formatHomework(hw: any) {
  const instituteFilter: InstituteFilter = hw.instituteId
    ? {
        instituteId: new Types.ObjectId(String(hw.instituteId)),
      }
    : {};

  const [batch, subject] = await Promise.all([
    Batch.findOne({
      _id: hw.batchId,
      ...instituteFilter,
    })
      .select("name courseId")
      .lean()
      .exec(),

    Subject.findOne({
      _id: hw.subjectId,
      ...instituteFilter,
    })
      .select("name code courseId teacherId")
      .lean()
      .exec(),
  ]);

  let teacher = null;

  if (subject?.teacherId) {
    teacher = await Staff.findOne({
      _id: subject.teacherId,
      ...instituteFilter,
    })
      .select("name")
      .lean()
      .exec();
  }

  return {
    id: String(hw._id),

    instituteId: hw.instituteId
      ? String(hw.instituteId)
      : "",

    title: hw.title ?? "",
    description: hw.description ?? "",

    batchId: hw.batchId
      ? String(hw.batchId)
      : "",

    batchName: batch?.name ?? "",

    subjectId: hw.subjectId
      ? String(hw.subjectId)
      : "",

    subjectName: subject?.name ?? "",

    subjectCode: subject?.code ?? "",

    teacherId: subject?.teacherId
      ? String(subject.teacherId)
      : "",

    teacherName: teacher?.name ?? "",

    assignedBy: hw.assignedBy
      ? String(hw.assignedBy)
      : "",

    dueDate: hw.dueDate ?? "",
    fileUrl: hw.fileUrl ?? "",
    status: hw.status ?? "active",

    createdAt: hw.createdAt?.toISOString?.()
      ?? new Date().toISOString(),

    updatedAt: hw.updatedAt?.toISOString?.()
      ?? hw.createdAt?.toISOString?.()
      ?? new Date().toISOString(),
  };
}

/**
 * GET HOMEWORK
 */
router.get(
  "/homework",
  authenticate,
  authorize(...ALLOWED_ROLES),
  async (req: UserRequest, res): Promise<void> => {
    try {
      const instituteFilter = getInstituteFilter(req);

      const batchId = clean(req.query.batchId);
      const subjectId = clean(req.query.subjectId);
      const status = clean(req.query.status);
      const search = clean(req.query.search);

      const filter: Record<string, unknown> = {
        ...instituteFilter,
      };

      if (batchId) {
        if (!isValidObjectId(batchId)) {
          res.status(400).json({
            error: "Invalid batch ID.",
          });
          return;
        }

        filter.batchId = new Types.ObjectId(batchId);
      }

      if (subjectId) {
        if (!isValidObjectId(subjectId)) {
          res.status(400).json({
            error: "Invalid subject ID.",
          });
          return;
        }

        filter.subjectId = new Types.ObjectId(subjectId);
      }

      if (status) {
        if (!validateStatus(status)) {
          res.status(400).json({
            error: "Invalid homework status.",
          });
          return;
        }

        filter.status = status;
      }

      if (search) {
        const safeSearch = escapeRegex(search);

        filter.$or = [
          {
            title: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            description: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }

      const list = await Homework.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .lean()
        .exec();

      const formatted = await Promise.all(
        list.map((item) => formatHomework(item)),
      );

      res.json(formatted);
    } catch {
      res.status(500).json({
        error: "Unable to load homework.",
      });
    }
  },
);

/**
 * CREATE HOMEWORK
 */
router.post(
  "/homework",
  authenticate,
  authorize(...MANAGE_ROLES),
  async (req: UserRequest, res): Promise<void> => {
    try {
      const title = clean(req.body?.title);
      const description = clean(req.body?.description);
      const batchId = clean(req.body?.batchId);
      const subjectId = clean(req.body?.subjectId);
      const dueDate = clean(req.body?.dueDate);
      const fileUrl = clean(req.body?.fileUrl);
      const bodyInstituteId = req.body?.instituteId;

      if (
        !title ||
        !description ||
        !batchId ||
        !subjectId ||
        !dueDate
      ) {
        res.status(400).json({
          error:
            "Title, Instructions, Batch, Subject and Due Date are required.",
        });
        return;
      }

      if (!isValidObjectId(batchId)) {
        res.status(400).json({
          error: "Invalid batch ID.",
        });
        return;
      }

      if (!isValidObjectId(subjectId)) {
        res.status(400).json({
          error: "Invalid subject ID.",
        });
        return;
      }

      if (!isValidDateString(dueDate)) {
        res.status(400).json({
          error: "Invalid due date.",
        });
        return;
      }

      const instituteId = resolveWriteInstituteId(
        req,
        bodyInstituteId,
      );

      if (!instituteId) {
        res.status(400).json({
          error:
            "A valid instituteId is required for this operation.",
        });
        return;
      }

      const instituteFilter: InstituteFilter = {
        instituteId,
      };

      const result = await validateBatchAndSubject(
        batchId,
        subjectId,
        instituteFilter,
      );

      if (result.error) {
        res.status(400).json({
          error: result.error,
        });
        return;
      }

      const assignedBy = result.subject?.teacherId
        ? new Types.ObjectId(String(result.subject.teacherId))
        : undefined;

      const homework = await Homework.create({
        instituteId,
        title,
        description,
        batchId: new Types.ObjectId(batchId),
        subjectId: new Types.ObjectId(subjectId),
        dueDate,
        fileUrl: fileUrl || undefined,
        assignedBy,
        status: "active",
      });

      res.status(201).json(
        await formatHomework(homework.toObject()),
      );
    } catch {
      res.status(500).json({
        error: "Unable to publish homework.",
      });
    }
  },
);

/**
 * UPDATE HOMEWORK
 */
router.patch(
  "/homework/:id",
  authenticate,
  authorize(...MANAGE_ROLES),
  async (req: UserRequest, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid homework ID.",
        });
        return;
      }

      const instituteFilter = getInstituteFilter(req);

      const old = await Homework.findOne({
        _id: new Types.ObjectId(id),
        ...instituteFilter,
      })
        .lean()
        .exec();

      if (!old) {
        res.status(404).json({
          error: "Homework not found.",
        });
        return;
      }

      const updates: Record<string, unknown> = {};

      if (req.body?.title !== undefined) {
        const value = clean(req.body.title);

        if (!value) {
          res.status(400).json({
            error: "Title cannot be empty.",
          });
          return;
        }

        updates.title = value;
      }

      if (req.body?.description !== undefined) {
        const value = clean(req.body.description);

        if (!value) {
          res.status(400).json({
            error: "Description cannot be empty.",
          });
          return;
        }

        updates.description = value;
      }

      if (req.body?.batchId !== undefined) {
        const value = clean(req.body.batchId);

        if (!isValidObjectId(value)) {
          res.status(400).json({
            error: "Invalid batch ID.",
          });
          return;
        }

        updates.batchId = new Types.ObjectId(value);
      }

      if (req.body?.subjectId !== undefined) {
        const value = clean(req.body.subjectId);

        if (!isValidObjectId(value)) {
          res.status(400).json({
            error: "Invalid subject ID.",
          });
          return;
        }

        updates.subjectId = new Types.ObjectId(value);
      }

      if (req.body?.dueDate !== undefined) {
        const value = clean(req.body.dueDate);

        if (!isValidDateString(value)) {
          res.status(400).json({
            error: "Invalid due date.",
          });
          return;
        }

        updates.dueDate = value;
      }

      if (req.body?.fileUrl !== undefined) {
        updates.fileUrl = clean(req.body.fileUrl);
      }

      if (req.body?.status !== undefined) {
        const value = clean(req.body.status);

        if (!validateStatus(value)) {
          res.status(400).json({
            error: "Invalid homework status.",
          });
          return;
        }

        updates.status = value;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error: "No valid fields provided for update.",
        });
        return;
      }

      const finalBatchId = updates.batchId
        ? String(updates.batchId)
        : String(old.batchId);

      const finalSubjectId = updates.subjectId
        ? String(updates.subjectId)
        : String(old.subjectId);

      const result = await validateBatchAndSubject(
        finalBatchId,
        finalSubjectId,
        instituteFilter,
      );

      if (result.error) {
        res.status(400).json({
          error: result.error,
        });
        return;
      }

      updates.assignedBy = result.subject?.teacherId
        ? new Types.ObjectId(String(result.subject.teacherId))
        : undefined;

      const homework = await Homework.findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
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

      if (!homework) {
        res.status(404).json({
          error: "Homework not found.",
        });
        return;
      }

      res.json(await formatHomework(homework));
    } catch {
      res.status(500).json({
        error: "Unable to update homework.",
      });
    }
  },
);

/**
 * DELETE HOMEWORK
 */
router.delete(
  "/homework/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req: UserRequest, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid homework ID.",
        });
        return;
      }

      const instituteFilter = getInstituteFilter(req);

      const removed = await Homework.findOneAndDelete({
        _id: new Types.ObjectId(id),
        ...instituteFilter,
      })
        .lean()
        .exec();

      if (!removed) {
        res.status(404).json({
          error: "Homework not found.",
        });
        return;
      }

      res.json({
        message: "Homework deleted successfully.",
      });
    } catch {
      res.status(500).json({
        error: "Unable to delete homework.",
      });
    }
  },
);

export default router;