import { Router, type IRouter } from "express";
import mongoose, { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { Institute } from "../models/Institute";
import {
  OnlineAdmission,
  type IOnlineAdmissionDocument,
  type OnlineAdmissionStatus,
} from "../models/OnlineAdmission";
import { Student } from "../models/Student";

const router: IRouter = Router();

const ALLOWED_REVIEW_STATUSES = new Set<OnlineAdmissionStatus>([
  "submitted",
  "under_review",
  "correction_required",
  "approved",
  "rejected",
]);

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function getInstituteIdForUser(req: any): string | null {
  return req.user?.instituteId ? String(req.user.instituteId) : null;
}

function combinePhone(code?: string, number?: string) {
  const n = cleanText(number, 20).replace(/\s+/g, "");
  if (!n) return "";
  const c = cleanText(code, 8).replace(/\s+/g, "");
  return `${c}${n}`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dataUrlByteLength(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function parseUpload(
  value: unknown,
  allowedMimeTypes: Set<string>,
  maxBytes: number,
  label: string,
): IOnlineAdmissionDocument | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const name = cleanText(raw.name, 160);
  const mimeType = cleanText(raw.mimeType, 80).toLowerCase();
  const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl : "";

  if (!name || !mimeType || !dataUrl) return undefined;
  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error(`${label} must be a JPG, PNG, WEBP${allowedMimeTypes.has("application/pdf") ? " or PDF" : ""}.`);
  }
  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    throw new Error(`${label} upload format is invalid.`);
  }
  if (dataUrlByteLength(dataUrl) > maxBytes) {
    throw new Error(`${label} is too large.`);
  }

  return { name, mimeType, dataUrl };
}

function makeApplicationNumber(id: Types.ObjectId, createdAt = new Date()) {
  return `APP-${createdAt.getFullYear()}-${id.toString().slice(-8).toUpperCase()}`;
}

function courseName(value: any) {
  return value && typeof value === "object" && value.name ? String(value.name) : "";
}

function batchName(value: any) {
  return value && typeof value === "object" && value.name ? String(value.name) : "";
}

function summary(application: any) {
  return {
    id: String(application._id),
    applicationNumber: application.applicationNumber,
    status: application.status,
    studentName: application.name,
    name: application.name,
    email: application.email ?? "",
    phone:
      combinePhone(application.fatherPhoneCode, application.fatherPhone) ||
      combinePhone(application.motherPhoneCode, application.motherPhone) ||
      combinePhone(application.emergencyPhoneCode, application.emergencyPhone),
    dateOfBirth: application.dateOfBirth,
    gender: application.gender,
    className: application.className ?? "",
    board: application.board ?? "",
    previousPercentage: application.lastClassPercentage ?? "",
    academicYear: application.academicYear,
    courseId: String(application.courseId?._id ?? application.courseId ?? ""),
    courseName: courseName(application.courseId),
    batchId: String(application.batchId?._id ?? application.batchId ?? ""),
    batchName: batchName(application.batchId),
    parentName: application.fatherName || application.motherName || "",
    reviewNote: application.reviewNote ?? "",
    convertedStudentId: application.convertedStudentId ? String(application.convertedStudentId) : "",
    createdAt: application.createdAt?.toISOString?.() ?? "",
    updatedAt: application.updatedAt?.toISOString?.() ?? "",
  };
}

function detail(application: any) {
  return {
    ...summary(application),
    genderOther: application.genderOther ?? "",
    bloodGroup: application.bloodGroup ?? "",
    schoolName: application.schoolName ?? "",
    photoDataUrl: application.photoDataUrl ?? "",
    section: application.section ?? "",
    boardOther: application.boardOther ?? "",
    lastClassPercentage: application.lastClassPercentage ?? "",
    lastClassMarks: application.lastClassMarks ?? "",

    motherName: application.motherName ?? "",
    motherOccupation: application.motherOccupation ?? "",
    motherPhone: application.motherPhone ?? "",
    motherPhoneCode: application.motherPhoneCode ?? "+91",
    motherWhatsapp: application.motherWhatsapp ?? "",
    motherWhatsappCode: application.motherWhatsappCode ?? "+91",

    fatherName: application.fatherName ?? "",
    fatherOccupation: application.fatherOccupation ?? "",
    fatherPhone: application.fatherPhone ?? "",
    fatherPhoneCode: application.fatherPhoneCode ?? "+91",
    fatherWhatsapp: application.fatherWhatsapp ?? "",
    fatherWhatsappCode: application.fatherWhatsappCode ?? "+91",

    emergencyPhone: application.emergencyPhone ?? "",
    emergencyPhoneCode: application.emergencyPhoneCode ?? "+91",
    correspondenceAddress: application.correspondenceAddress ?? "",
    correspondenceState: application.correspondenceState ?? "",
    correspondenceDistrict: application.correspondenceDistrict ?? "",
    correspondencePin: application.correspondencePin ?? "",

    // Prefer the new split Aadhaar fields; keep legacy front fallback for old applications.
    aadhaarFront: application.aadhaarFront ?? application.aadhaarCard ?? null,
    aadhaarBack: application.aadhaarBack ?? null,
    previousMarksheet: application.previousMarksheet ?? null,
    reviewedAt: application.reviewedAt?.toISOString?.() ?? "",
    convertedAt: application.convertedAt?.toISOString?.() ?? "",
  };
}

async function getPublicInstitute(instituteId: string) {
  if (!mongoose.isValidObjectId(instituteId)) return null;
  return Institute.findOne({
    _id: instituteId,
    status: { $in: ["active", "trial", "pending"] },
  });
}

// PUBLIC: institute-specific courses + batches for the admission form.
router.get(
  "/public/online-admissions/:instituteId/config",
  async (req, res): Promise<void> => {
    try {
      const instituteId = String(req.params.instituteId ?? "");
      const institute = await getPublicInstitute(instituteId);
      if (!institute) {
        res.status(404).json({ error: "Admission form is unavailable for this institute." });
        return;
      }

      const [courses, batches] = await Promise.all([
        Course.find({ instituteId: institute._id, status: "active" })
          .sort({ name: 1 })
          .select("name description duration fees courseType"),
        Batch.find({
          instituteId: institute._id,
          status: { $in: ["active", "upcoming"] },
        })
          .sort({ name: 1 })
          .select("name courseId capacity studentIds schedule academicYear startDate status"),
      ]);

      const activeCourseIds = new Set(courses.map((course) => String(course._id)));
      const publicBatches = batches
        .filter((batch) => activeCourseIds.has(String(batch.courseId)))
        .map((batch) => ({
          id: String(batch._id),
          name: batch.name,
          courseId: String(batch.courseId),
          capacity: batch.capacity,
          currentStrength: Array.isArray(batch.studentIds) ? batch.studentIds.length : 0,
          schedule: batch.schedule,
          academicYear: batch.academicYear,
          startDate: batch.startDate,
          status: batch.status,
        }));

      res.json({
        institute: {
          id: String(institute._id),
          name: institute.instituteName,
          logoDataUrl: institute.logoDataUrl ?? "",
          academicYear: institute.academicYear || "",
          city: institute.city ?? "",
          state: institute.state ?? "",
        },
        courses: courses.map((course) => ({
          id: String(course._id),
          name: course.name,
          description: course.description,
          duration: course.duration,
          fees: course.fees,
          courseType: course.courseType,
        })),
        batches: publicBatches,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load admission form." });
    }
  },
);

// PUBLIC: submit a new online admission application.
router.post(
  "/public/online-admissions/:instituteId",
  async (req, res): Promise<void> => {
    try {
      const instituteId = String(req.params.instituteId ?? "");
      const institute = await getPublicInstitute(instituteId);
      if (!institute) {
        res.status(404).json({ error: "Admission form is unavailable for this institute." });
        return;
      }

      // Honeypot. Real users never see/fill this field.
      if (cleanText(req.body?._website, 200)) {
        res.status(400).json({ error: "Unable to submit application." });
        return;
      }

      const name = cleanText(req.body?.name, 120);
      const dateOfBirth = cleanText(req.body?.dateOfBirth, 20);
      const gender = cleanText(req.body?.gender, 20) as "male" | "female" | "other";
      const academicYear = cleanText(req.body?.academicYear, 30) || institute.academicYear || "";
      const courseId = cleanText(req.body?.courseId, 50);
      const batchId = cleanText(req.body?.batchId, 50);
      const email = cleanText(req.body?.email, 160).toLowerCase();

      if (!name || !dateOfBirth || !gender || !academicYear || !courseId || !batchId) {
        res.status(400).json({ error: "Please complete all required fields." });
        return;
      }
      if (!["male", "female", "other"].includes(gender)) {
        res.status(400).json({ error: "Please select a valid gender." });
        return;
      }
      if (gender === "other" && !cleanText(req.body?.genderOther, 80)) {
        res.status(400).json({ error: "Please specify the student's gender." });
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Please enter a valid email address." });
        return;
      }
      if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(batchId)) {
        res.status(400).json({ error: "Please select a valid course and batch." });
        return;
      }

      const [course, batch] = await Promise.all([
        Course.findOne({ _id: courseId, instituteId: institute._id, status: "active" }),
        Batch.findOne({
          _id: batchId,
          instituteId: institute._id,
          status: { $in: ["active", "upcoming"] },
        }),
      ]);

      if (!course || !batch || String(batch.courseId) !== String(course._id)) {
        res.status(400).json({ error: "Selected course or batch is no longer available." });
        return;
      }
      if (batch.capacity > 0 && batch.studentIds.length >= batch.capacity) {
        res.status(409).json({ error: "Selected batch is full. Please choose another batch." });
        return;
      }

      const motherPhone = cleanText(req.body?.motherPhone, 20);
      const fatherPhone = cleanText(req.body?.fatherPhone, 20);
      const emergencyPhone = cleanText(req.body?.emergencyPhone, 20);
      if (!motherPhone && !fatherPhone && !emergencyPhone) {
        res.status(400).json({ error: "Please provide at least one parent or emergency contact number." });
        return;
      }

      const photoDataUrl = typeof req.body?.photoDataUrl === "string" ? req.body.photoDataUrl : "";
      if (photoDataUrl) {
        const mime = photoDataUrl.match(/^data:([^;]+);base64,/)?.[1]?.toLowerCase() ?? "";
        if (!ALLOWED_PHOTO_TYPES.has(mime)) {
          res.status(400).json({ error: "Student photo must be JPG, PNG or WEBP." });
          return;
        }
        if (dataUrlByteLength(photoDataUrl) > MAX_PHOTO_BYTES) {
          res.status(400).json({ error: "Student photo must be 2MB or smaller." });
          return;
        }
      }

      let aadhaarFront: IOnlineAdmissionDocument | undefined;
      let aadhaarBack: IOnlineAdmissionDocument | undefined;
      let previousMarksheet: IOnlineAdmissionDocument | undefined;
      try {
        aadhaarFront = parseUpload(
          req.body?.aadhaarFront ?? req.body?.aadhaarCard,
          ALLOWED_DOCUMENT_TYPES,
          MAX_DOCUMENT_BYTES,
          "Aadhaar card front",
        );
        aadhaarBack = parseUpload(
          req.body?.aadhaarBack,
          ALLOWED_DOCUMENT_TYPES,
          MAX_DOCUMENT_BYTES,
          "Aadhaar card back",
        );
        previousMarksheet = parseUpload(
          req.body?.previousMarksheet,
          ALLOWED_DOCUMENT_TYPES,
          MAX_DOCUMENT_BYTES,
          "Previous marksheet front",
        );
      } catch (validationError: any) {
        res.status(400).json({ error: validationError?.message ?? "Invalid document upload." });
        return;
      }

      if (!aadhaarFront) {
        res.status(400).json({ error: "Aadhaar card front side is required." });
        return;
      }
      if (!aadhaarBack) {
        res.status(400).json({ error: "Aadhaar card back side is required." });
        return;
      }
      if (!previousMarksheet) {
        res.status(400).json({ error: "Previous Class Marksheet front side is required." });
        return;
      }

      const _id = new Types.ObjectId();
      const createdAt = new Date();
      const application = await OnlineAdmission.create({
        _id,
        instituteId: institute._id,
        applicationNumber: makeApplicationNumber(_id, createdAt),
        status: "submitted",
        name,
        dateOfBirth,
        gender,
        genderOther: cleanText(req.body?.genderOther, 80),
        bloodGroup: cleanText(req.body?.bloodGroup, 10),
        schoolName: cleanText(req.body?.schoolName, 180),
        academicYear,
        photoDataUrl,
        className: cleanText(req.body?.className, 40),
        section: cleanText(req.body?.section, 40),
        board: cleanText(req.body?.board, 80),
        boardOther: cleanText(req.body?.boardOther, 80),
        lastClassPercentage: cleanText(req.body?.lastClassPercentage, 20),
        lastClassMarks: cleanText(req.body?.lastClassMarks, 80),
        courseId: course._id,
        batchId: batch._id,

        motherName: cleanText(req.body?.motherName, 120),
        motherOccupation: cleanText(req.body?.motherOccupation, 120),
        motherPhone,
        motherPhoneCode: cleanText(req.body?.motherPhoneCode, 8) || "+91",
        motherWhatsapp: cleanText(req.body?.motherWhatsapp, 20),
        motherWhatsappCode: cleanText(req.body?.motherWhatsappCode, 8) || "+91",

        fatherName: cleanText(req.body?.fatherName, 120),
        fatherOccupation: cleanText(req.body?.fatherOccupation, 120),
        fatherPhone,
        fatherPhoneCode: cleanText(req.body?.fatherPhoneCode, 8) || "+91",
        fatherWhatsapp: cleanText(req.body?.fatherWhatsapp, 20),
        fatherWhatsappCode: cleanText(req.body?.fatherWhatsappCode, 8) || "+91",

        emergencyPhone,
        emergencyPhoneCode: cleanText(req.body?.emergencyPhoneCode, 8) || "+91",
        email,
        correspondenceAddress: cleanText(req.body?.correspondenceAddress, 500),
        correspondenceState: cleanText(req.body?.correspondenceState, 100),
        correspondenceDistrict: cleanText(req.body?.correspondenceDistrict, 100),
        correspondencePin: cleanText(req.body?.correspondencePin, 10),
        aadhaarFront,
        aadhaarBack,
        previousMarksheet,
      });

      res.status(201).json({
        success: true,
        applicationNumber: application.applicationNumber,
        status: application.status,
        submittedAt: application.createdAt.toISOString(),
        instituteName: institute.instituteName,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to submit admission application." });
    }
  },
);

// ADMIN: return this institute's shareable public admission URL path.
router.get(
  "/online-admissions/public-link",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    const instituteId = getInstituteIdForUser(req);
    if (!instituteId) {
      res.status(403).json({ error: "Your account is not linked to an institute." });
      return;
    }
    res.json({
      instituteId,
      path: `/online-admission-form/${instituteId}`,
    });
  },
);

// ADMIN: list online admission applications without heavy base64 document bodies.
router.get(
  "/online-admissions",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute." });
        return;
      }

      const { status, batchId, courseId, q } = req.query as Record<string, string>;
      const filter: any = { instituteId };
      if (status && status !== "all") filter.status = status;
      if (batchId && batchId !== "all" && mongoose.isValidObjectId(batchId)) filter.batchId = batchId;
      if (courseId && courseId !== "all" && mongoose.isValidObjectId(courseId)) filter.courseId = courseId;
      if (q?.trim()) {
        const rx = new RegExp(escapeRegex(q.trim()), "i");
        filter.$or = [
          { applicationNumber: rx },
          { name: rx },
          { email: rx },
          { fatherPhone: rx },
          { motherPhone: rx },
          { emergencyPhone: rx },
        ];
      }

      const applications = await OnlineAdmission.find(filter)
        .select("-photoDataUrl -aadhaarCard.dataUrl -aadhaarFront.dataUrl -aadhaarBack.dataUrl -previousMarksheet.dataUrl")
        .populate("courseId", "name")
        .populate("batchId", "name")
        .sort({ createdAt: -1 });

      res.json(applications.map(summary));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load online admissions." });
    }
  },
);

router.get(
  "/online-admissions/:id",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      const id = String(req.params.id ?? "");
      if (!instituteId || !mongoose.isValidObjectId(id)) {
        res.status(404).json({ error: "Application not found." });
        return;
      }

      const application = await OnlineAdmission.findOne({ _id: id, instituteId })
        .populate("courseId", "name")
        .populate("batchId", "name");
      if (!application) {
        res.status(404).json({ error: "Application not found." });
        return;
      }

      res.json(detail(application));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load application." });
    }
  },
);

router.patch(
  "/online-admissions/:id/status",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      const id = String(req.params.id ?? "");
      const status = cleanText(req.body?.status, 40) as OnlineAdmissionStatus;
      const reviewNote = cleanText(req.body?.reviewNote, 1200);

      if (!instituteId || !mongoose.isValidObjectId(id)) {
        res.status(404).json({ error: "Application not found." });
        return;
      }
      if (!ALLOWED_REVIEW_STATUSES.has(status)) {
        res.status(400).json({ error: "Invalid admission status." });
        return;
      }

      const application = await OnlineAdmission.findOneAndUpdate(
        { _id: id, instituteId, status: { $ne: "converted" } },
        {
          $set: {
            status,
            reviewNote,
            reviewedAt: new Date(),
            reviewedBy: req.user!.userId,
          },
        },
        { returnDocument: "after", runValidators: true },
      )
        .populate("courseId", "name")
        .populate("batchId", "name");

      if (!application) {
        res.status(404).json({ error: "Application not found or already converted." });
        return;
      }

      res.json(detail(application));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update application." });
    }
  },
);

router.post(
  "/online-admissions/:id/convert-to-student",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    let createdStudentId: Types.ObjectId | null = null;
    let assignedBatchId: Types.ObjectId | null = null;
    try {
      const instituteId = getInstituteIdForUser(req);
      const id = String(req.params.id ?? "");
      if (!instituteId || !mongoose.isValidObjectId(id)) {
        res.status(404).json({ error: "Application not found." });
        return;
      }

      const application = await OnlineAdmission.findOne({ _id: id, instituteId });
      if (!application) {
        res.status(404).json({ error: "Application not found." });
        return;
      }
      if (application.convertedStudentId) {
        const existingStudent = await Student.findOne({
          _id: application.convertedStudentId,
          instituteId,
        }).select("name enrollmentNo");
        res.json({
          success: true,
          alreadyConverted: true,
          student: existingStudent
            ? {
                id: String(existingStudent._id),
                name: existingStudent.name,
                enrollmentNo: existingStudent.enrollmentNo,
              }
            : null,
        });
        return;
      }
      if (application.status !== "approved") {
        res.status(409).json({ error: "Approve the application before creating a student." });
        return;
      }

      const [course, batch] = await Promise.all([
        Course.findOne({ _id: application.courseId, instituteId, status: "active" }),
        Batch.findOne({
          _id: application.batchId,
          instituteId,
          status: { $in: ["active", "upcoming"] },
        }),
      ]);
      if (!course || !batch || String(batch.courseId) !== String(course._id)) {
        res.status(409).json({ error: "The selected course or batch is no longer available." });
        return;
      }
      if (batch.capacity > 0 && batch.studentIds.length >= batch.capacity) {
        res.status(409).json({ error: "The selected batch is full." });
        return;
      }

      const parentName = application.fatherName || application.motherName || "Parent / Guardian";
      const parentPhone =
        combinePhone(application.fatherPhoneCode, application.fatherPhone) ||
        combinePhone(application.motherPhoneCode, application.motherPhone) ||
        combinePhone(application.emergencyPhoneCode, application.emergencyPhone);

      const aadhaarFrontDocument = application.aadhaarFront ?? application.aadhaarCard;

      const documents = [
        aadhaarFrontDocument
          ? {
              label: "Aadhaar Card Front",
              name: aadhaarFrontDocument.name,
              dataUrl: aadhaarFrontDocument.dataUrl,
              mimeType: aadhaarFrontDocument.mimeType,
            }
          : null,
        application.aadhaarBack
          ? {
              label: "Aadhaar Card Back",
              name: application.aadhaarBack.name,
              dataUrl: application.aadhaarBack.dataUrl,
              mimeType: application.aadhaarBack.mimeType,
            }
          : null,
        application.previousMarksheet
          ? {
              label: "Previous Class Marksheet",
              name: application.previousMarksheet.name,
              dataUrl: application.previousMarksheet.dataUrl,
              mimeType: application.previousMarksheet.mimeType,
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; name: string; dataUrl: string; mimeType: string }>;

      const student = new Student({
        name: application.name,
        email: application.email || undefined,
        phone: parentPhone,
        instituteId: application.instituteId,
        batchId: batch._id,
        courseId: course._id,
        status: "active",
        academicYear: application.academicYear || batch.academicYear,
        dateOfBirth: application.dateOfBirth,
        gender: application.gender,
        genderOther: application.genderOther || undefined,
        bloodGroup: application.bloodGroup || undefined,
        schoolName: application.schoolName || undefined,
        className: application.className || undefined,
        section: application.section || undefined,
        board: application.board || undefined,
        boardOther: application.boardOther || undefined,
        lastClassPercentage: application.lastClassPercentage || undefined,
        lastClassMarks: application.lastClassMarks || undefined,
        photoDataUrl: application.photoDataUrl || undefined,
        aadhaarCard: aadhaarFrontDocument?.dataUrl || undefined,
        previousMarksheet: application.previousMarksheet?.dataUrl || undefined,
        documents,
        parentName,
        parentPhone,
        motherName: application.motherName || undefined,
        motherOccupation: application.motherOccupation || undefined,
        motherPhone: combinePhone(application.motherPhoneCode, application.motherPhone) || undefined,
        motherWhatsapp:
          combinePhone(application.motherWhatsappCode, application.motherWhatsapp) || undefined,
        fatherName: application.fatherName || undefined,
        fatherOccupation: application.fatherOccupation || undefined,
        fatherPhone: combinePhone(application.fatherPhoneCode, application.fatherPhone) || undefined,
        fatherWhatsapp:
          combinePhone(application.fatherWhatsappCode, application.fatherWhatsapp) || undefined,
        emergencyPhone:
          combinePhone(application.emergencyPhoneCode, application.emergencyPhone) || undefined,
        correspondenceAddress: application.correspondenceAddress || undefined,
        correspondenceDistrict: application.correspondenceDistrict || undefined,
        correspondenceState: application.correspondenceState || undefined,
        correspondencePin: application.correspondencePin || undefined,
      });

      await student.save();
      createdStudentId = student._id as Types.ObjectId;

      const batchUpdate = await Batch.updateOne(
        { _id: batch._id, instituteId },
        { $addToSet: { studentIds: student._id } },
      );
      if (!batchUpdate.matchedCount) {
        throw new Error("Selected batch could not be updated.");
      }
      assignedBatchId = batch._id as Types.ObjectId;

      application.status = "converted";
      application.convertedStudentId = student._id as Types.ObjectId;
      application.convertedAt = new Date();
      application.reviewedAt = application.reviewedAt ?? new Date();
      application.reviewedBy = application.reviewedBy ?? new Types.ObjectId(String(req.user!.userId));
      await application.save();

      res.status(201).json({
        success: true,
        student: {
          id: String(student._id),
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          batchId: String(student.batchId),
          courseId: String(student.courseId),
        },
      });
    } catch (error: any) {
      if (createdStudentId && assignedBatchId) {
        await Batch.updateOne(
          { _id: assignedBatchId },
          { $pull: { studentIds: createdStudentId } },
        ).catch(() => undefined);
      }
      if (createdStudentId) {
        await Student.deleteOne({ _id: createdStudentId }).catch(() => undefined);
      }
      res.status(500).json({ error: error?.message ?? "Unable to create student from application." });
    }
  },
);

export default router;
