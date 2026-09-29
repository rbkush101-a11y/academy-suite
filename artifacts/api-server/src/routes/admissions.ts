import { Router, type IRouter } from "express";
import mongoose, { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Admission } from "../models/Admission";

const router: IRouter = Router();

type UserRole =
  | "super_admin"
  | "institute_admin"
  | "staff"
  | "teacher"
  | "student";

interface AppUser {
  userId: string;
  email: string;
  role: UserRole | string;
  instituteId?: string | null;
}

interface AppRequest extends Express.Request {
  user?: AppUser;
}

const VALID_ENQUIRY_TYPES = ["academic", "computer"] as const;

const VALID_STATUSES = [
  "new",
  "contacted",
  "visited",
  "enrolled",
  "dropped",
] as const;

const VALID_SOURCES = [
  "website",
  "referral",
  "social-media",
  "walk-in",
  "other",
] as const;

function isValidObjectId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

function getUser(req: AppRequest): AppUser | null {
  return req.user ?? null;
}

function getInstituteIdForUser(
  req: AppRequest,
): string | null {
  const user = getUser(req);

  if (!user) {
    return null;
  }

  if (user.role === "super_admin") {
    return null;
  }

  if (!user.instituteId) {
    return null;
  }

  return user.instituteId;
}

function isSuperAdmin(req: AppRequest): boolean {
  return getUser(req)?.role === "super_admin";
}

function getEnquiryDateAndDay(value?: unknown): {
  enquiryDate: string;
  enquiryDay: string;
} {
  const suppliedDate =
    typeof value === "string" ? value.trim() : "";

  const enquiryDate =
    /^\d{4}-\d{2}-\d{2}$/.test(suppliedDate)
      ? suppliedDate
      : new Date().toISOString().slice(0, 10);

  const date = new Date(`${enquiryDate}T00:00:00`);

  const enquiryDay = date.toLocaleDateString("en-US", {
    weekday: "long",
  });

  return {
    enquiryDate,
    enquiryDay,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fmt(admission: any) {
  return {
    id: String(admission._id),
    enquiryType: admission.enquiryType ?? "academic",
    studentName: admission.studentName,
    className: admission.className ?? "",
    board: admission.board ?? "",
    courseInterest: admission.courseInterest ?? "",
    phone: admission.phone,
    source: admission.source ?? "walk-in",
    status: admission.status ?? "new",
    enquiryDate:
      admission.enquiryDate ??
      admission.createdAt?.toISOString?.().slice(0, 10) ??
      "",
    enquiryDay: admission.enquiryDay ?? "",
    remarks: admission.remarks ?? "",
    parentName: admission.parentName ?? "",
    email: admission.email ?? "",
    followUpDate: admission.followUpDate ?? "",
    createdAt:
      admission.createdAt?.toISOString?.() ??
      new Date().toISOString(),
  };
}

function buildInstituteFilter(req: AppRequest): {
  instituteId?: Types.ObjectId;
} | null {
  const instituteId = getInstituteIdForUser(req);

  if (!instituteId) {
    if (isSuperAdmin(req)) {
      return {};
    }

    return null;
  }

  if (!isValidObjectId(instituteId)) {
    return null;
  }

  return {
    instituteId: new Types.ObjectId(instituteId),
  };
}

/*
 * GET /admissions
 */
router.get(
  "/admissions",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const instituteFilter =
        buildInstituteFilter(req as AppRequest);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim()
          : "";

      const enquiryType =
        typeof req.query.enquiryType === "string"
          ? req.query.enquiryType.trim()
          : "";

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const filter: Record<string, unknown> = {
        ...instituteFilter,
      };

      if (status) {
        if (
          !VALID_STATUSES.includes(
            status as (typeof VALID_STATUSES)[number],
          )
        ) {
          res.status(400).json({
            error: "Invalid enquiry status.",
          });
          return;
        }

        filter.status = status;
      }

      if (enquiryType) {
        if (
          !VALID_ENQUIRY_TYPES.includes(
            enquiryType as (typeof VALID_ENQUIRY_TYPES)[number],
          )
        ) {
          res.status(400).json({
            error: "Invalid enquiry type.",
          });
          return;
        }

        filter.enquiryType = enquiryType;
      }

      if (search) {
        const safeSearch = escapeRegex(search);

        filter.$or = [
          {
            studentName: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            phone: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            parentName: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            email: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }

      const admissions = await Admission.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      res.json(admissions.map(fmt));
    } catch {
      res.status(500).json({
        error: "Unable to load enquiries.",
      });
    }
  },
);

/*
 * POST /admissions
 */
router.post(
  "/admissions",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const user = getUser(req as AppRequest);

      if (!user) {
        res.status(401).json({
          error: "Unauthorized.",
        });
        return;
      }

      let instituteId: Types.ObjectId;

      if (user.role === "super_admin") {
        const requestedInstituteId =
          typeof req.body.instituteId === "string"
            ? req.body.instituteId.trim()
            : "";

        if (!requestedInstituteId) {
          res.status(400).json({
            error:
              "instituteId is required for super admin.",
          });
          return;
        }

        if (!isValidObjectId(requestedInstituteId)) {
          res.status(400).json({
            error: "Invalid instituteId.",
          });
          return;
        }

        instituteId = new Types.ObjectId(
          requestedInstituteId,
        );
      } else {
        if (!user.instituteId) {
          res.status(403).json({
            error: "Institute context is required.",
          });
          return;
        }

        if (!isValidObjectId(user.instituteId)) {
          res.status(403).json({
            error: "Invalid institute context.",
          });
          return;
        }

        instituteId = new Types.ObjectId(
          user.instituteId,
        );
      }

      const {
        enquiryType = "academic",
        studentName,
        className,
        board,
        courseInterest,
        phone,
        source,
        remarks,
        parentName,
        email,
        followUpDate,
        enquiryDate,
      } = req.body;

      if (
        typeof studentName !== "string" ||
        !studentName.trim()
      ) {
        res.status(400).json({
          error: "Name is required.",
        });
        return;
      }

      if (
        typeof phone !== "string" ||
        !phone.trim()
      ) {
        res.status(400).json({
          error: "Contact Number is required.",
        });
        return;
      }

      if (
        !VALID_ENQUIRY_TYPES.includes(
          enquiryType,
        )
      ) {
        res.status(400).json({
          error:
            "Please select Academic or Computer enquiry.",
        });
        return;
      }

      if (
        source !== undefined &&
        !VALID_SOURCES.includes(source)
      ) {
        res.status(400).json({
          error: "Invalid enquiry source.",
        });
        return;
      }

      if (
        enquiryType === "academic" &&
        (typeof className !== "string" ||
          !className.trim() ||
          typeof board !== "string" ||
          !board.trim())
      ) {
        res.status(400).json({
          error:
            "Class and Board are required for Academic Enquiry.",
        });
        return;
      }

      if (
        enquiryType === "computer" &&
        (typeof courseInterest !== "string" ||
          !courseInterest.trim())
      ) {
        res.status(400).json({
          error:
            "Course is required for Computer Enquiry.",
        });
        return;
      }

      const {
        enquiryDate: savedEnquiryDate,
        enquiryDay,
      } = getEnquiryDateAndDay(enquiryDate);

      const admission = await Admission.create({
        instituteId,

        enquiryType,

        enquiryDate: savedEnquiryDate,
        enquiryDay,

        studentName: studentName.trim(),

        className:
          enquiryType === "academic"
            ? className.trim()
            : "",

        board:
          enquiryType === "academic"
            ? board.trim()
            : "",

        courseInterest:
          enquiryType === "computer"
            ? courseInterest.trim()
            : "",

        phone: phone.trim(),

        source:
          source ?? "walk-in",

        remarks:
          typeof remarks === "string"
            ? remarks.trim()
            : "",

        parentName:
          typeof parentName === "string"
            ? parentName.trim()
            : undefined,

        email:
          typeof email === "string"
            ? email.trim().toLowerCase()
            : undefined,

        followUpDate:
          typeof followUpDate === "string"
            ? followUpDate.trim()
            : undefined,

        status: "new",
      });

      res.status(201).json(fmt(admission));
    } catch {
      res.status(500).json({
        error: "Unable to save enquiry.",
      });
    }
  },
);

/*
 * PATCH /admissions/:id
 */
router.patch(
  "/admissions/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid enquiry ID.",
        });
        return;
      }

      const instituteFilter =
        buildInstituteFilter(req as AppRequest);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      const existing = await Admission.findOne({
        _id: new Types.ObjectId(id),
        ...instituteFilter,
      });

      if (!existing) {
        res.status(404).json({
          error: "Enquiry not found.",
        });
        return;
      }

      const allowedFields = [
        "enquiryType",
        "studentName",
        "className",
        "board",
        "courseInterest",
        "phone",
        "source",
        "remarks",
        "status",
        "enquiryDate",
        "parentName",
        "email",
        "followUpDate",
      ] as const;

      const updates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error: "No valid fields were provided for update.",
        });
        return;
      }

      const finalType =
        updates.enquiryType ??
        existing.enquiryType ??
        "academic";

      if (
        !VALID_ENQUIRY_TYPES.includes(
          finalType as (typeof VALID_ENQUIRY_TYPES)[number],
        )
      ) {
        res.status(400).json({
          error: "Invalid enquiry type.",
        });
        return;
      }

      if (
        updates.status !== undefined &&
        !VALID_STATUSES.includes(
          updates.status as (typeof VALID_STATUSES)[number],
        )
      ) {
        res.status(400).json({
          error: "Invalid enquiry status.",
        });
        return;
      }

      if (
        updates.source !== undefined &&
        !VALID_SOURCES.includes(
          updates.source as (typeof VALID_SOURCES)[number],
        )
      ) {
        res.status(400).json({
          error: "Invalid enquiry source.",
        });
        return;
      }

      if (updates.studentName !== undefined) {
        if (
          typeof updates.studentName !== "string" ||
          !updates.studentName.trim()
        ) {
          res.status(400).json({
            error: "Name is required.",
          });
          return;
        }

        updates.studentName =
          updates.studentName.trim();
      }

      if (updates.phone !== undefined) {
        if (
          typeof updates.phone !== "string" ||
          !updates.phone.trim()
        ) {
          res.status(400).json({
            error: "Contact Number is required.",
          });
          return;
        }

        updates.phone = updates.phone.trim();
      }

      if (updates.className !== undefined) {
        updates.className =
          typeof updates.className === "string"
            ? updates.className.trim()
            : "";
      }

      if (updates.board !== undefined) {
        updates.board =
          typeof updates.board === "string"
            ? updates.board.trim()
            : "";
      }

      if (updates.courseInterest !== undefined) {
        updates.courseInterest =
          typeof updates.courseInterest === "string"
            ? updates.courseInterest.trim()
            : "";
      }

      if (updates.remarks !== undefined) {
        updates.remarks =
          typeof updates.remarks === "string"
            ? updates.remarks.trim()
            : "";
      }

      if (updates.parentName !== undefined) {
        updates.parentName =
          typeof updates.parentName === "string"
            ? updates.parentName.trim()
            : "";
      }

      if (updates.email !== undefined) {
        updates.email =
          typeof updates.email === "string"
            ? updates.email.trim().toLowerCase()
            : "";
      }

      if (updates.followUpDate !== undefined) {
        updates.followUpDate =
          typeof updates.followUpDate === "string"
            ? updates.followUpDate.trim()
            : "";
      }

      const finalClass =
        updates.className !== undefined
          ? updates.className
          : existing.className;

      const finalBoard =
        updates.board !== undefined
          ? updates.board
          : existing.board;

      const finalCourse =
        updates.courseInterest !== undefined
          ? updates.courseInterest
          : existing.courseInterest;

      if (
        finalType === "academic" &&
        (!finalClass || !finalBoard)
      ) {
        res.status(400).json({
          error:
            "Class and Board are required for Academic Enquiry.",
        });
        return;
      }

      if (
        finalType === "computer" &&
        !finalCourse
      ) {
        res.status(400).json({
          error:
            "Course is required for Computer Enquiry.",
        });
        return;
      }

      if (updates.enquiryDate !== undefined) {
        const {
          enquiryDate,
          enquiryDay,
        } = getEnquiryDateAndDay(
          updates.enquiryDate,
        );

        updates.enquiryDate = enquiryDate;
        updates.enquiryDay = enquiryDay;
      }

      if (finalType === "academic") {
        updates.courseInterest = "";
      } else {
        updates.className = "";
        updates.board = "";
      }

      const admission =
        await Admission.findOneAndUpdate(
          {
            _id: new Types.ObjectId(id),
            ...instituteFilter,
          },
          {
            $set: updates,
          },
          {
            new: true,
            runValidators: true,
          },
        ).lean();

      if (!admission) {
        res.status(404).json({
          error: "Enquiry not found.",
        });
        return;
      }

      res.json(fmt(admission));
    } catch {
      res.status(500).json({
        error: "Unable to update enquiry.",
      });
    }
  },
);

/*
 * DELETE /admissions/:id
 */
router.delete(
  "/admissions/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid enquiry ID.",
        });
        return;
      }

      const instituteFilter =
        buildInstituteFilter(req as AppRequest);

      if (!instituteFilter) {
        res.status(403).json({
          error: "Institute context is required.",
        });
        return;
      }

      const admission =
        await Admission.findOneAndDelete({
          _id: new Types.ObjectId(id),
          ...instituteFilter,
        });

      if (!admission) {
        res.status(404).json({
          error: "Enquiry not found.",
        });
        return;
      }

      res.sendStatus(204);
    } catch {
      res.status(500).json({
        error: "Unable to delete enquiry.",
      });
    }
  },
);

export default router;