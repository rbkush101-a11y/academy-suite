import { Router, type IRouter, type Request } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Batch } from "../models/Batch";
import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { Course } from "../models/Course";
import {
  FeeStructure,
  StudentFeeAssignment,
  Payment,
} from "../models/Finance";
import {
  getCycleDay,
  generateDueDates,
  getMonthInfo,
} from "../lib/feeCycle";
import { StudentEditLog } from "../models/StudentEditLog";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

type AppUser = {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
  instituteId?: string | Types.ObjectId | null;
};

type AppRequest = Request & {
  user?: AppUser;
};

function getLoggedInUser(req: AppRequest): AppUser {
  return req.user ?? {};
}

function getInstituteIdForUser(req: AppRequest): string | null {
  const user = getLoggedInUser(req);

  if (user.role === "super_admin") {
    return null;
  }

  return user.instituteId ? String(user.instituteId) : null;
}

function isValidObjectId(value: unknown): boolean {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

function getUserId(req: AppRequest): string | null {
  const user = getLoggedInUser(req);

  const userId = user.userId ?? user.id ?? user._id;

  return userId ? String(userId) : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPositiveInteger(
  value: unknown,
  fallback: number,
  max: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

async function populateStudent(student: any) {
  const [batch, course] = await Promise.all([
    Batch.findOne({
      _id: student.batchId,
      instituteId: student.instituteId,
    })
      .select("name")
      .lean(),

    Course.findOne({
      _id: student.courseId,
      instituteId: student.instituteId,
    })
      .select("name")
      .lean(),
  ]);

  return {
    id: String(student._id),
    name: student.name,
    email: student.email ?? "",
    phone: student.phone,
    enrollmentNo: student.enrollmentNo,

    instituteId: student.instituteId
      ? String(student.instituteId)
      : null,

    batchId: String(student.batchId),
    batchName: batch?.name ?? null,

    courseId: String(student.courseId),
    courseName: course?.name ?? null,

    status: student.status,
    academicYear: student.academicYear,

    dateOfBirth: student.dateOfBirth ?? null,
    gender: student.gender ?? null,
    genderOther: student.genderOther ?? null,
    bloodGroup: student.bloodGroup ?? null,
    schoolName: student.schoolName ?? null,
    className: student.className ?? null,
    section: student.section ?? null,
    board: student.board ?? null,
    boardOther: student.boardOther ?? null,
    lastClassPercentage: student.lastClassPercentage ?? null,
    lastClassMarks: student.lastClassMarks ?? null,

    photoDataUrl: student.photoDataUrl ?? null,
    documents: Array.isArray(student.documents)
      ? student.documents
      : [],

    aadhaarCard: student.aadhaarCard ?? null,
    previousMarksheet: student.previousMarksheet ?? null,

    parentName: student.parentName ?? null,
    parentPhone: student.parentPhone ?? null,

    motherName: student.motherName ?? null,
    motherOccupation: student.motherOccupation ?? null,
    motherPhone: student.motherPhone ?? null,
    motherWhatsapp: student.motherWhatsapp ?? null,

    fatherName: student.fatherName ?? null,
    fatherOccupation: student.fatherOccupation ?? null,
    fatherPhone: student.fatherPhone ?? null,
    fatherWhatsapp: student.fatherWhatsapp ?? null,

    emergencyPhone: student.emergencyPhone ?? null,

    correspondenceAddress:
      student.correspondenceAddress ?? null,
    correspondenceDistrict:
      student.correspondenceDistrict ?? null,
    correspondenceState:
      student.correspondenceState ?? null,
    correspondencePin:
      student.correspondencePin ?? null,

    permanentAddress:
      student.permanentAddress ?? null,
    permanentDistrict:
      student.permanentDistrict ?? null,
    permanentState:
      student.permanentState ?? null,
    permanentPin:
      student.permanentPin ?? null,

    loginId: student.loginId ?? null,

    createdAt: student.createdAt
      ? new Date(student.createdAt).toISOString()
      : null,

    updatedAt: student.updatedAt
      ? new Date(student.updatedAt).toISOString()
      : null,
  };
}

function cleanStudentBody(body: any) {
  const allowedFields = [
    "name",
    "email",
    "phone",
    "batchId",
    "courseId",
    "status",
    "academicYear",
    "dateOfBirth",
    "gender",
    "genderOther",
    "bloodGroup",
    "schoolName",
    "className",
    "section",
    "board",
    "boardOther",
    "lastClassPercentage",
    "lastClassMarks",
    "photoDataUrl",
    "documents",
    "aadhaarCard",
    "previousMarksheet",
    "parentName",
    "parentPhone",
    "motherName",
    "motherOccupation",
    "motherPhone",
    "motherWhatsapp",
    "fatherName",
    "fatherOccupation",
    "fatherPhone",
    "fatherWhatsapp",
    "emergencyPhone",
    "correspondenceAddress",
    "correspondenceDistrict",
    "correspondenceState",
    "correspondencePin",
    "permanentAddress",
    "permanentDistrict",
    "permanentState",
    "permanentPin",
    "loginId",
    "loginPassword",
  ];

  const data: Record<string, any> = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return data;
  }

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (data.email !== undefined) {
    if (data.email === null || String(data.email).trim() === "") {
      delete data.email;
    } else {
      data.email = String(data.email).trim().toLowerCase();
    }
  }

  if (data.loginId !== undefined) {
    if (
      data.loginId === null ||
      String(data.loginId).trim() === ""
    ) {
      delete data.loginId;
    } else {
      data.loginId = String(data.loginId)
        .trim()
        .toLowerCase();
    }
  }

  if (
    data.loginPassword === undefined ||
    data.loginPassword === null ||
    String(data.loginPassword).trim() === ""
  ) {
    delete data.loginPassword;
  }

  return data;
}

async function prepareStudentAuthFields(
  data: Record<string, any>,
) {
  if (data.loginId !== undefined) {
    data.loginId = String(data.loginId)
      .toLowerCase()
      .trim();

    if (!data.loginId) {
      delete data.loginId;
    }
  }

  if (!data.loginPassword) {
    delete data.loginPassword;
    return;
  }

  if (
    typeof data.loginPassword === "string" &&
    !data.loginPassword.startsWith("$2")
  ) {
    if (data.loginPassword.trim().length < 6) {
      throw new Error(
        "Student password must be at least 6 characters long",
      );
    }

    data.loginPassword = await bcrypt.hash(
      data.loginPassword.trim(),
      10,
    );
  }
}

async function generateEnrollmentNo(instituteId: string) {
  const prefix = "SSC202627";

  const students = await Student.find({
    instituteId,
    enrollmentNo: new RegExp(
      `^${escapeRegex(prefix)}\\d+$`,
    ),
  })
    .select("enrollmentNo")
    .lean();

  const highestSerial = students.reduce(
    (highest: number, student: any) => {
      const serialText = String(
        student.enrollmentNo ?? "",
      ).slice(prefix.length);

      const serial = Number.parseInt(serialText, 10);

      return Number.isFinite(serial)
        ? Math.max(highest, serial)
        : highest;
    },
    0,
  );

  return `${prefix}${String(
    highestSerial + 1,
  ).padStart(3, "0")}`;
}

async function verifyCourseAndBatch(
  instituteId: string,
  courseId: string,
  batchId: string,
) {
  if (!isValidObjectId(courseId)) {
    return "Invalid courseId";
  }

  if (!isValidObjectId(batchId)) {
    return "Invalid batchId";
  }

  const course = await Course.findOne({
    _id: courseId,
    instituteId,
  })
    .select("_id")
    .lean();

  if (!course) {
    return "Selected course does not belong to this institute";
  }

  const batch = await Batch.findOne({
    _id: batchId,
    instituteId,
    courseId,
  })
    .select("_id")
    .lean();

  if (!batch) {
    return "Selected batch does not belong to this course";
  }

  return null;
}

function validateStudentBasicFields(
  data: Record<string, any>,
  isCreate = false,
) {
  if (isCreate) {
    if (
      !data.name ||
      !String(data.name).trim()
    ) {
      return "Student name is required";
    }

    if (
      !data.phone ||
      !String(data.phone).trim()
    ) {
      return "Student phone is required";
    }

    if (!data.courseId) {
      return "courseId is required";
    }

    if (!data.batchId) {
      return "batchId is required";
    }

    if (!data.academicYear) {
      return "academicYear is required";
    }
  }

  if (
    data.courseId !== undefined &&
    !isValidObjectId(data.courseId)
  ) {
    return "Invalid courseId";
  }

  if (
    data.batchId !== undefined &&
    !isValidObjectId(data.batchId)
  ) {
    return "Invalid batchId";
  }

  if (
    data.status !== undefined &&
    !["active", "inactive", "graduated"].includes(
      String(data.status),
    )
  ) {
    return "Invalid student status";
  }

  if (
    data.gender !== undefined &&
    !["male", "female", "other"].includes(
      String(data.gender).toLowerCase(),
    )
  ) {
    return "Invalid gender";
  }

  if (
    data.name !== undefined &&
    String(data.name).trim().length > 200
  ) {
    return "Student name is too long";
  }

  if (
    data.academicYear !== undefined &&
    String(data.academicYear).trim().length > 50
  ) {
    return "Academic year is too long";
  }

  return null;
}

const STUDENT_EDITABLE_FIELDS: Record<
  string,
  { label: string; autoApprove: boolean }
> = {
  name: {
    label: "Student Full Name",
    autoApprove: false,
  },
  email: {
    label: "Email ID",
    autoApprove: true,
  },
  phone: {
    label: "Phone Number",
    autoApprove: true,
  },
  loginPassword: {
    label: "Login Password",
    autoApprove: true,
  },
  loginId: {
    label: "Login ID",
    autoApprove: false,
  },
  fatherName: {
    label: "Father's Name",
    autoApprove: false,
  },
  motherName: {
    label: "Mother's Name",
    autoApprove: false,
  },
  fatherPhone: {
    label: "Father's Phone",
    autoApprove: true,
  },
  motherPhone: {
    label: "Mother's Phone",
    autoApprove: true,
  },
  fatherOccupation: {
    label: "Father's Occupation",
    autoApprove: true,
  },
  motherOccupation: {
    label: "Mother's Occupation",
    autoApprove: true,
  },
  fatherWhatsapp: {
    label: "Father's WhatsApp",
    autoApprove: true,
  },
  motherWhatsapp: {
    label: "Mother's WhatsApp",
    autoApprove: true,
  },
  emergencyPhone: {
    label: "Emergency Phone",
    autoApprove: true,
  },
  bloodGroup: {
    label: "Blood Group",
    autoApprove: true,
  },
  photoDataUrl: {
    label: "Profile Photo",
    autoApprove: true,
  },
  schoolName: {
    label: "School Name",
    autoApprove: false,
  },
  className: {
    label: "Class Name",
    autoApprove: false,
  },
  section: {
    label: "Section",
    autoApprove: false,
  },
  board: {
    label: "Board",
    autoApprove: false,
  },
  boardOther: {
    label: "Board (Other)",
    autoApprove: false,
  },
  lastClassPercentage: {
    label: "Last Class Percentage",
    autoApprove: true,
  },
  lastClassMarks: {
    label: "Last Class Marks",
    autoApprove: true,
  },
  dateOfBirth: {
    label: "Date of Birth",
    autoApprove: false,
  },
  gender: {
    label: "Gender",
    autoApprove: true,
  },
  genderOther: {
    label: "Gender (Other)",
    autoApprove: true,
  },
  aadhaarCard: {
    label: "Aadhaar Card",
    autoApprove: false,
  },
  previousMarksheet: {
    label: "Previous Marksheet",
    autoApprove: false,
  },
  parentName: {
    label: "Guardian Name",
    autoApprove: false,
  },
  parentPhone: {
    label: "Guardian Phone",
    autoApprove: true,
  },
  correspondenceAddress: {
    label: "Correspondence Address",
    autoApprove: true,
  },
  correspondenceDistrict: {
    label: "Correspondence District",
    autoApprove: true,
  },
  correspondenceState: {
    label: "Correspondence State",
    autoApprove: true,
  },
  correspondencePin: {
    label: "Correspondence PIN",
    autoApprove: true,
  },
  permanentAddress: {
    label: "Permanent Address",
    autoApprove: true,
  },
  permanentDistrict: {
    label: "Permanent District",
    autoApprove: true,
  },
  permanentState: {
    label: "Permanent State",
    autoApprove: true,
  },
  permanentPin: {
    label: "Permanent PIN",
    autoApprove: true,
  },
};

const handleStudentSelfUpdate = async (
  req: AppRequest,
  res: any,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const user = getLoggedInUser(req);

    if (user.role !== "student") {
      res.status(403).json({
        error: "Only students can update their profiles.",
      });
      return;
    }

    if (!userId || !isValidObjectId(userId)) {
      res.status(401).json({
        error: "Invalid student account",
      });
      return;
    }

    const studentQuery: any = {
      _id: userId,
    };

    if (user.instituteId) {
      studentQuery.instituteId = String(
        user.instituteId,
      );
    }

    const student = await Student.findOne(
      studentQuery,
    );

    if (!student) {
      res.status(404).json({
        error: "Student not found in database.",
      });
      return;
    }

    const updates =
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body)
        ? req.body
        : {};

    const editLogs: any[] = [];
    const appliedChanges: Record<string, any> = {};
    const pendingChanges: Record<string, any> = {};

    for (const [
      fieldName,
      rawValue,
    ] of Object.entries(updates)) {
      const config =
        STUDENT_EDITABLE_FIELDS[fieldName];

      if (!config) continue;

      let newValue: any = rawValue;

      if (
        newValue === "" ||
        newValue === null ||
        newValue === undefined
      ) {
        if (fieldName === "dateOfBirth") {
          newValue = null;
        } else if (
          fieldName === "lastClassPercentage" ||
          fieldName === "lastClassMarks"
        ) {
          newValue = null;
        } else {
          newValue = "";
        }
      }

      const oldValue = (student as any)[
        fieldName
      ];

      let oldStr =
        oldValue != null
          ? String(oldValue)
          : "";

      let newStr =
        newValue != null
          ? String(newValue)
          : "";

      if (
        fieldName === "loginPassword" &&
        !newStr.trim()
      ) {
        continue;
      }

      if (
        fieldName === "gender" &&
        typeof newValue === "string"
      ) {
        newValue = newValue
          .toLowerCase()
          .trim();

        newStr = newValue;
      }

      if (oldStr === newStr) {
        continue;
      }

      if (fieldName === "loginPassword") {
        if (newStr.trim().length < 6) {
          res.status(400).json({
            error:
              "Password must be at least 6 characters long.",
          });
          return;
        }

        newValue = await bcrypt.hash(
          newStr.trim(),
          10,
        );

        oldStr = "[ENCRYPTED_PASSWORD_HIDDEN]";
        newStr =
          "[NEW_PASSWORD_UPDATED_SECURELY]";
      }

      if (fieldName === "photoDataUrl") {
        oldStr = oldStr
          ? "[OLD_PHOTO_ATTACHED]"
          : "No Photo";

        newStr = newStr
          ? "[NEW_PHOTO_ATTACHED]"
          : "No Photo";
      }

      editLogs.push({
        studentId: student._id,
        studentName:
          student.name || "Unknown Student",
        instituteId: student.instituteId,
        fieldName,
        fieldLabel: config.label,
        oldValue: oldStr.substring(0, 500),
        newValue: newStr.substring(0, 500),
        editedBy: "student",
        status: config.autoApprove
          ? "auto-approved"
          : "pending",
      });

      if (config.autoApprove) {
        appliedChanges[fieldName] =
          newValue;
      } else {
        pendingChanges[fieldName] =
          newValue;
      }
    }

    if (
      Object.keys(appliedChanges).length > 0
    ) {
      Object.assign(
        student,
        appliedChanges,
      );

      await student.save();
    }

    if (editLogs.length > 0) {
      try {
        await StudentEditLog.insertMany(
          editLogs,
        );
      } catch (logError) {
        console.error(
          "Non-blocking StudentEditLog error:",
          logError,
        );
      }
    }

    res.status(200).json({
      success: true,
      applied: Object.keys(appliedChanges),
      pending: Object.keys(pendingChanges),
      message:
        Object.keys(pendingChanges).length > 0
          ? "Form details & password updated! Sensitive fields pending admin approval."
          : "Form details successfully updated!",
    });
  } catch (error: any) {
    console.error(
      "Error during student profile update:",
      error,
    );

    res.status(500).json({
      error: "Unable to update student profile",
    });
  }
};

router.put(
  "/students/self-update",
  authenticate,
  handleStudentSelfUpdate,
);

router.put(
  "/self-update",
  authenticate,
  handleStudentSelfUpdate,
);

// =====================================================================
// STUDENT EDIT LOGS
// =====================================================================

router.get(
  "/students/edit-logs",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const instituteId =
        getInstituteIdForUser(req);

      const {
        status,
        studentId,
        limit = "100",
      } = req.query as Record<
        string,
        string
      >;

      const query: any = {};

      if (req.user?.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        query.instituteId = instituteId;
      }

      if (status) {
        if (
          ![
            "pending",
            "approved",
            "rejected",
            "auto-approved",
          ].includes(status)
        ) {
          res.status(400).json({
            error: "Invalid log status",
          });
          return;
        }

        query.status = status;
      }

      if (studentId) {
        if (!isValidObjectId(studentId)) {
          res.status(400).json({
            error: "Invalid studentId",
          });
          return;
        }

        query.studentId = studentId;
      }

      const safeLimit =
        getPositiveInteger(
          limit,
          100,
          200,
        );

      const logs =
        await StudentEditLog.find(query)
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .lean();

      res.json(logs);
    } catch (error) {
      console.error(
        "Failed to fetch student edit logs:",
        error,
      );

      res.status(500).json({
        error: "Failed to fetch logs",
      });
    }
  },
);

router.post(
  "/students/edit-logs/:logId/review",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const adminId = getUserId(req);
      const { logId } = req.params;

      if (!isValidObjectId(logId)) {
        res.status(400).json({
          error: "Invalid logId",
        });
        return;
      }

      const {
        action,
        note,
      } = req.body as {
        action?: string;
        note?: string;
      };

      if (
        !["approve", "reject"].includes(
          String(action),
        )
      ) {
        res.status(400).json({
          error:
            "Invalid action. Use approve or reject.",
        });
        return;
      }

      const instituteId =
        getInstituteIdForUser(req);

      const logQuery: any = {
        _id: logId,
      };

      if (req.user?.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        logQuery.instituteId =
          instituteId;
      }

      const log =
        await StudentEditLog.findOne(
          logQuery,
        );

      if (!log) {
        res.status(404).json({
          error: "Log entry not found",
        });
        return;
      }

      if (log.status !== "pending") {
        res.status(400).json({
          error:
            "This request is already reviewed",
        });
        return;
      }

      if (action === "approve") {
        const studentQuery: any = {
          _id: log.studentId,
        };

        if (
          req.user?.role !== "super_admin"
        ) {
          studentQuery.instituteId =
            instituteId;
        }

        const student =
          await Student.findOne(
            studentQuery,
          );

        if (!student) {
          res.status(404).json({
            error:
              "Student not found in your institute",
          });
          return;
        }

        const editableConfig =
          STUDENT_EDITABLE_FIELDS[
            log.fieldName
          ];

        if (!editableConfig) {
          res.status(400).json({
            error:
              "This field is no longer editable",
          });
          return;
        }

        /*
         * IMPORTANT:
         * Password/photo pending approvals cannot safely
         * reconstruct the original value from an audit log
         * because the log intentionally stores a masked value.
         *
         * Therefore these fields should not be approved from
         * the old log value.
         */
        if (
          log.fieldName ===
            "loginPassword" ||
          log.fieldName ===
            "photoDataUrl"
        ) {
          res.status(400).json({
            error:
              "This sensitive field cannot be approved from the audit log. A fresh update is required.",
          });
          return;
        }

        (student as any)[
          log.fieldName
        ] = log.newValue;

        await student.save();

        log.status = "approved";
      } else {
        log.status = "rejected";
      }

      log.reviewedBy =
        adminId && isValidObjectId(adminId)
          ? new Types.ObjectId(adminId)
          : undefined;
      log.reviewedAt = new Date();
      log.reviewNote =
        typeof note === "string"
          ? note.substring(0, 1000)
          : "";

      await log.save();

      res.json({
        success: true,
        message: `Request ${action}d successfully.`,
      });
    } catch (error) {
      console.error(
        "Student edit-log review failed:",
        error,
      );

      res.status(500).json({
        error: "Review failed",
      });
    }
  },
);

// =====================================================================
// GET STUDENTS
// =====================================================================

router.get(
  "/students",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const {
        search,
        batchId,
        status,
      } = req.query as Record<
        string,
        string
      >;

      const filter: any = {};

      const user =
        getLoggedInUser(req);

      const instituteId =
        getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      if (batchId) {
        if (!isValidObjectId(batchId)) {
          res.status(400).json({
            error: "Invalid batchId",
          });
          return;
        }

        if (user.role !== "super_admin") {
          const batch =
            await Batch.findOne({
              _id: batchId,
              instituteId,
            })
              .select("_id")
              .lean();

          if (!batch) {
            res.status(403).json({
              error:
                "Batch does not belong to your institute",
            });
            return;
          }
        }

        filter.batchId = batchId;
      }

      if (status) {
        if (
          ![
            "active",
            "inactive",
            "graduated",
          ].includes(status)
        ) {
          res.status(400).json({
            error: "Invalid student status",
          });
          return;
        }

        filter.status = status;
      }

      if (user.role === "teacher") {
        const userId = getUserId(req);

        const authUser =
          userId &&
          isValidObjectId(userId)
            ? await User.findById(userId)
                .select(
                  "email phone loginId instituteId",
                )
                .lean()
            : null;

        const email = String(
          authUser?.email ?? "",
        )
          .trim()
          .toLowerCase();

        const phone = String(
          authUser?.phone ?? "",
        ).trim();

        const loginId = String(
          authUser?.loginId ?? "",
        )
          .trim()
          .toLowerCase();

        const conditions: any[] =
          [];

        if (email) {
          conditions.push({
            email,
          });
        }

        if (phone) {
          conditions.push({
            phone,
          });
        }

        if (loginId) {
          conditions.push({
            loginId,
          });
        }

        const teacher =
          conditions.length > 0
            ? await Staff.findOne({
                $or: conditions,
                ...(instituteId
                  ? { instituteId }
                  : {}),
              })
                .select(
                  "batches subjectsTaught",
                )
                .lean()
            : null;

        let assignedBatchIds =
          Array.isArray(
            teacher?.batches,
          )
            ? teacher.batches.map(
                (id: any) =>
                  String(id),
              )
            : [];

        assignedBatchIds =
          assignedBatchIds.filter(
            (id: string) =>
              isValidObjectId(id),
          );

        if (
          assignedBatchIds.length ===
            0 &&
          teacher
        ) {
          const taughtRows =
            Array.isArray(
              teacher.subjectsTaught,
            )
              ? teacher.subjectsTaught
              : [];

          const courseNames =
            taughtRows
              .map(
                (row: any) =>
                  String(
                    row?.course ?? "",
                  )
                    .trim()
                    .toLowerCase(),
              )
              .filter(Boolean);

          const batchNames =
            taughtRows
              .map(
                (row: any) =>
                  String(
                    row?.batch ?? "",
                  )
                    .trim()
                    .toLowerCase(),
              )
              .filter(
                (name: string) =>
                  name &&
                  name !==
                    "all batches" &&
                  name !== "none",
              );

          if (
            courseNames.length ||
            batchNames.length
          ) {
            const candidateBatches =
              await Batch.find({
                ...(instituteId
                  ? { instituteId }
                  : {}),
              })
                .populate(
                  "courseId",
                  "name",
                )
                .select(
                  "_id name courseId",
                )
                .lean();

            assignedBatchIds =
              candidateBatches
                .filter(
                  (batch: any) => {
                    const batchName =
                      String(
                        batch.name ??
                          "",
                      )
                        .trim()
                        .toLowerCase();

                    const courseName =
                      String(
                        batch.courseId
                          ?.name ?? "",
                      )
                        .trim()
                        .toLowerCase();

                    return (
                      batchNames.includes(
                        batchName,
                      ) ||
                      courseNames.includes(
                        courseName,
                      )
                    );
                  },
                )
                .map(
                  (batch: any) =>
                    String(batch._id),
                );
          }
        }

        if (
          assignedBatchIds.length === 0
        ) {
          res.json([]);
          return;
        }

        if (batchId) {
          if (
            !assignedBatchIds.includes(
              String(batchId),
            )
          ) {
            res.json([]);
            return;
          }
        } else {
          filter.batchId = {
            $in: assignedBatchIds,
          };
        }
      }

      if (search) {
        const safeSearch =
          escapeRegex(
            String(search).trim(),
          );

        if (safeSearch) {
          filter.$or = [
            {
              name: new RegExp(
                safeSearch,
                "i",
              ),
            },
            {
              email: new RegExp(
                safeSearch,
                "i",
              ),
            },
            {
              enrollmentNo:
                new RegExp(
                  safeSearch,
                  "i",
                ),
            },
            {
              phone: new RegExp(
                safeSearch,
                "i",
              ),
            },
          ];
        }
      }

      const students =
        await Student.find(filter)
          .sort({ createdAt: -1 })
          .limit(500)
          .lean();

      const result =
        await Promise.all(
          students.map(
            populateStudent,
          ),
        );

      res.json(result);
    } catch (error) {
      console.error(
        "Unable to load students:",
        error,
      );

      res.status(500).json({
        error: "Unable to load students",
      });
    }
  },
);

// =====================================================================
// CREATE STUDENT
// =====================================================================

router.post(
  "/students",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const user =
        getLoggedInUser(req);

      let instituteId =
        getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        instituteId = req.body?.instituteId
          ? String(
              req.body.instituteId,
            )
          : null;

        if (
          instituteId &&
          !isValidObjectId(instituteId)
        ) {
          res.status(400).json({
            error:
              "Invalid instituteId",
          });
          return;
        }
      }

      if (!instituteId) {
        res.status(400).json({
          error:
            "instituteId is required to create a student",
        });
        return;
      }

      const data =
        cleanStudentBody(req.body);

      const basicError =
        validateStudentBasicFields(
          data,
          true,
        );

      if (basicError) {
        res.status(400).json({
          error: basicError,
        });
        return;
      }

      await prepareStudentAuthFields(
        data,
      );

      const validationError =
        await verifyCourseAndBatch(
          instituteId,
          String(data.courseId),
          String(data.batchId),
        );

      if (validationError) {
        res.status(400).json({
          error: validationError,
        });
        return;
      }

      const enrollmentNo =
        await generateEnrollmentNo(
          instituteId,
        );

      const student =
        await Student.create({
          ...data,
          enrollmentNo,
          instituteId,
        });

      await Batch.findOneAndUpdate(
        {
          _id: data.batchId,
          instituteId,
        },
        {
          $addToSet: {
            studentIds: student._id,
          },
        },
      );

      let feeAssignmentInfo:
        | Record<string, any>
        | null = null;

      try {
        const admissionDate =
          req.body?.admissionDate ||
          new Date()
            .toISOString()
            .split("T")[0];

        const totalMonths =
          Number(req.body?.totalMonths) ||
          12;

        const scholarshipPercent =
          Number(
            req.body?.scholarshipPercent,
          ) || 0;

        if (
          totalMonths <= 0 ||
          totalMonths > 120
        ) {
          throw new Error(
            "Invalid totalMonths",
          );
        }

        if (
          scholarshipPercent < 0 ||
          scholarshipPercent > 100
        ) {
          throw new Error(
            "Invalid scholarshipPercent",
          );
        }

        const feeStructure =
          await FeeStructure.findOne({
            instituteId,
            courseId: data.courseId,
          });

        if (feeStructure) {
          const feeCycleDay =
            getCycleDay(
              admissionDate,
            );

          const dueDates =
            generateDueDates(
              admissionDate,
              totalMonths,
            );

          if (!dueDates.length) {
            throw new Error(
              "Unable to generate fee due dates",
            );
          }

          const startInfo =
            getMonthInfo(
              dueDates[0]!,
            );

          const endInfo =
            getMonthInfo(
              dueDates[
                dueDates.length - 1
              ]!,
            );

          const scholarshipAmount =
            Math.round(
              (feeStructure.amount *
                scholarshipPercent) /
                100,
            );

          const monthlyAmount =
            Math.max(
              0,
              feeStructure.amount -
                scholarshipAmount,
            );

          const assignment =
            await StudentFeeAssignment.create(
              {
                instituteId,
                studentId:
                  student._id,
                feeStructureId:
                  feeStructure._id,
                admissionDate,
                feeCycleDay,
                monthlyAmount,
                scholarshipPercent,
                totalMonths,
                startMonth:
                  startInfo.month,
                endMonth:
                  endInfo.month,
                status: "active",
              },
            );

          const payments =
            await Promise.all(
              dueDates.map(
                async (
                  dueDate,
                ) => {
                  const info =
                    getMonthInfo(
                      dueDate,
                    );

                  return Payment.create(
                    {
                      instituteId,
                      studentId:
                        student._id,
                      feeStructureId:
                        feeStructure._id,
                      assignmentId:
                        assignment._id,
                      originalAmount:
                        feeStructure.amount,
                      scholarshipPercent,
                      scholarshipAmount,
                      amount:
                        monthlyAmount,
                      lateFee: 0,
                      totalAmount:
                        monthlyAmount,
                      paidAmount: 0,
                      dueDate,
                      month:
                        info.month,
                      monthLabel:
                        info.label,
                      status:
                        "pending",
                    },
                  );
                },
              ),
            );

          feeAssignmentInfo = {
            assigned: true,
            assignmentId:
              String(
                assignment._id,
              ),
            monthlyAmount,
            totalMonths,
            firstDueDate:
              dueDates[0],
            lastDueDate:
              dueDates[
                dueDates.length - 1
              ],
            billsGenerated:
              payments.length,
          };
        } else {
          feeAssignmentInfo = {
            assigned: false,
            reason:
              "No fee structure found for this course.",
          };
        }
      } catch (feeError) {
        console.error(
          "Student fee assignment failed:",
          feeError,
        );

        feeAssignmentInfo = {
          assigned: false,
          reason:
            "Fee assignment could not be completed.",
        };
      }

      const studentData =
        await populateStudent(
          student,
        );

      res.status(201).json({
        ...studentData,
        feeAssignment:
          feeAssignmentInfo,
      });
    } catch (error: any) {
      console.error(
        "Unable to create student:",
        error,
      );

      if (
        error?.code === 11000
      ) {
        res.status(409).json({
          error:
            "Student enrollment number or login ID already exists.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Unable to create student",
      });
    }
  },
);

// =====================================================================
// GET SINGLE STUDENT
// =====================================================================

router.get(
  "/students/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid student ID",
        });
        return;
      }

      const user =
        getLoggedInUser(req);

      const filter: any = {
        _id: id,
      };

      const instituteId =
        getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      const student =
        await Student.findOne(
          filter,
        );

      if (!student) {
        res.status(404).json({
          error: "Student not found",
        });
        return;
      }

      res.json(
        await populateStudent(
          student,
        ),
      );
    } catch (error) {
      console.error(
        "Unable to load student:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to load student",
      });
    }
  },
);

// =====================================================================
// UPDATE STUDENT
// =====================================================================

router.patch(
  "/students/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid student ID",
        });
        return;
      }

      const user =
        getLoggedInUser(req);

      const instituteId =
        getInstituteIdForUser(req);

      const filter: any = {
        _id: id,
      };

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      const existingStudent =
        await Student.findOne(
          filter,
        );

      if (!existingStudent) {
        res.status(404).json({
          error: "Student not found",
        });
        return;
      }

      const updateData =
        cleanStudentBody(
          req.body,
        );

      if (
        Object.keys(updateData).length ===
        0
      ) {
        res.status(400).json({
          error:
            "No valid fields provided for update",
        });
        return;
      }

      const basicError =
        validateStudentBasicFields(
          updateData,
          false,
        );

      if (basicError) {
        res.status(400).json({
          error: basicError,
        });
        return;
      }

      await prepareStudentAuthFields(
        updateData,
      );

      const effectiveInstituteId =
        instituteId ??
        String(
          existingStudent.instituteId,
        );

      const nextCourseId =
        updateData.courseId ??
        String(
          existingStudent.courseId,
        );

      const nextBatchId =
        updateData.batchId ??
        String(
          existingStudent.batchId,
        );

      const validationError =
        await verifyCourseAndBatch(
          effectiveInstituteId,
          String(nextCourseId),
          String(nextBatchId),
        );

      if (validationError) {
        res.status(400).json({
          error: validationError,
        });
        return;
      }

      if (
        updateData.gender !==
          undefined &&
        typeof updateData.gender ===
          "string"
      ) {
        updateData.gender =
          updateData.gender
            .toLowerCase()
            .trim();
      }

      const oldBatchId =
        String(
          existingStudent.batchId,
        );

      const newBatchId =
        String(nextBatchId);

      /*
       * Update student only inside the tenant.
       */
      const student =
        await Student.findOneAndUpdate(
          filter,
          updateData,
          {
            new: true,
            runValidators: true,
          },
        );

      if (!student) {
        res.status(404).json({
          error: "Student not found",
        });
        return;
      }

      /*
       * If batch changed, update both batches
       * with the same institute scope.
       */
      if (
        oldBatchId !== newBatchId
      ) {
        await Batch.findOneAndUpdate(
          {
            _id: oldBatchId,
            instituteId:
              effectiveInstituteId,
          },
          {
            $pull: {
              studentIds:
                student._id,
            },
          },
        );

        await Batch.findOneAndUpdate(
          {
            _id: newBatchId,
            instituteId:
              effectiveInstituteId,
          },
          {
            $addToSet: {
              studentIds:
                student._id,
            },
          },
        );
      }

      res.json(
        await populateStudent(
          student,
        ),
      );
    } catch (error: any) {
      console.error(
        "Unable to update student:",
        error,
      );

      if (
        error?.code === 11000
      ) {
        res.status(409).json({
          error:
            "Student enrollment number or login ID already exists.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Unable to update student",
      });
    }
  },
);

// =====================================================================
// DELETE STUDENT
// =====================================================================

router.delete(
  "/students/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req: AppRequest, res): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid student ID",
        });
        return;
      }

      const user =
        getLoggedInUser(req);

      const instituteId =
        getInstituteIdForUser(req);

      const filter: any = {
        _id: id,
      };

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      const student =
        await Student.findOneAndDelete(
          filter,
        );

      if (!student) {
        res.status(404).json({
          error: "Student not found",
        });
        return;
      }

      /*
       * Remove student from batches only
       * inside the student's own institute.
       */
      await Batch.updateMany(
        {
          instituteId:
            student.instituteId,
          studentIds:
            student._id,
        },
        {
          $pull: {
            studentIds:
              student._id,
          },
        },
      );

      /*
       * Finance records are intentionally NOT deleted here.
       * Financial history should be preserved for audit/accounting.
       */

      res.sendStatus(204);
    } catch (error) {
      console.error(
        "Unable to delete student:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to delete student",
      });
    }
  },
);

export default router;