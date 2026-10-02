import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Admission } from "../models/Admission";
import { Institute } from "../models/Institute";

const router: IRouter = Router();

function getInstituteIdForUser(req: any): string | null {
  return req.user?.instituteId ? String(req.user.instituteId) : null;
}

function getEnquiryDateAndDay(value?: string) {
  const enquiryDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);
  const date = new Date(`${enquiryDate}T00:00:00`);
  return {
    enquiryDate,
    enquiryDay: date.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

function fmt(admission: any) {
  return {
    id: String(admission._id),
    enquiryType: admission.enquiryType ?? "academic",
    studentName: admission.studentName,
    parentName: admission.parentName ?? "",
    phone: admission.phone,
    email: admission.email ?? "",
    className: admission.className ?? "",
    board: admission.board ?? "",
    courseInterest: admission.courseInterest ?? "",
    source: admission.source ?? "walk-in",
    status: admission.status ?? "new",
    followUpDate: admission.followUpDate ?? "",
    enquiryDate: admission.enquiryDate ?? admission.createdAt?.toISOString?.().slice(0, 10) ?? "",
    enquiryDay: admission.enquiryDay ?? "",
    remarks: admission.remarks ?? "",
    createdAt: admission.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

function instituteFilter(req: any) {
  const instituteId = getInstituteIdForUser(req);
  if (!instituteId) return null;
  return { instituteId };
}

async function migrateSingleInstituteLegacyLeads(instituteId: string) {
  const legacyFilter = {
    $or: [
      { instituteId: { $exists: false } },
      { instituteId: null },
      { instituteId: "" },
    ],
  };
  const legacyCount = await Admission.countDocuments(legacyFilter);
  if (legacyCount === 0) return;

  // Safe compatibility path for older single-institute databases. In a true
  // multi-tenant database, legacy records stay unassigned instead of being
  // guessed into the wrong institute.
  const instituteCount = await Institute.countDocuments({ status: { $ne: "archived" } });
  if (instituteCount === 1) {
    await Admission.updateMany(legacyFilter, { $set: { instituteId } });
  }
}

router.get(
  "/admissions",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const tenant = instituteFilter(req);
      if (!tenant) {
        res.status(403).json({ error: "Your account is not linked to an institute." });
        return;
      }

      await migrateSingleInstituteLegacyLeads(String(tenant.instituteId));

      const { status, enquiryType } = req.query as Record<string, string>;
      const filter: any = { ...tenant };
      if (status) filter.status = status;
      if (enquiryType === "academic" || enquiryType === "computer") filter.enquiryType = enquiryType;

      const admissions = await Admission.find(filter).sort({ createdAt: -1 });
      res.json(admissions.map(fmt));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load enquiries." });
    }
  },
);

router.post(
  "/admissions",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute." });
        return;
      }

      const {
        enquiryType = "academic",
        studentName,
        parentName,
        className,
        board,
        courseInterest,
        phone,
        email,
        source,
        remarks,
        enquiryDate,
        followUpDate,
      } = req.body;

      if (!studentName || !phone) {
        res.status(400).json({ error: "Student name and contact number are required." });
        return;
      }
      if (enquiryType !== "academic" && enquiryType !== "computer") {
        res.status(400).json({ error: "Please select Academic or Computer enquiry." });
        return;
      }
      if (enquiryType === "academic" && (!className || !board)) {
        res.status(400).json({ error: "Class and Board are required for Academic Enquiry." });
        return;
      }
      if (enquiryType === "computer" && !courseInterest) {
        res.status(400).json({ error: "Course is required for Computer Enquiry." });
        return;
      }

      const dates = getEnquiryDateAndDay(enquiryDate);
      const admission = await Admission.create({
        instituteId,
        enquiryType,
        ...dates,
        studentName: String(studentName).trim(),
        parentName: String(parentName ?? "").trim(),
        className: enquiryType === "academic" ? String(className).trim() : "",
        board: enquiryType === "academic" ? String(board).trim() : "",
        courseInterest: enquiryType === "computer" ? String(courseInterest).trim() : "",
        phone: String(phone).trim(),
        email: String(email ?? "").trim().toLowerCase(),
        source: source ?? "walk-in",
        followUpDate: followUpDate || undefined,
        remarks: String(remarks ?? "").trim(),
        status: "new",
      });

      res.status(201).json(fmt(admission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to save enquiry." });
    }
  },
);

router.patch(
  "/admissions/:id",
  authenticate,
  authorize("institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute." });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await Admission.findOne({ _id: id, instituteId });
      if (!existing) {
        res.status(404).json({ error: "Enquiry not found." });
        return;
      }

      const updates: any = {};
      const allowedFields = [
        "enquiryType", "studentName", "parentName", "className", "board", "courseInterest",
        "phone", "email", "source", "remarks", "status", "followUpDate", "enquiryDate",
      ];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const finalType = updates.enquiryType ?? existing.enquiryType ?? "academic";
      const finalClass = updates.className ?? existing.className;
      const finalBoard = updates.board ?? existing.board;
      const finalCourse = updates.courseInterest ?? existing.courseInterest;

      if (finalType !== "academic" && finalType !== "computer") {
        res.status(400).json({ error: "Invalid enquiry type." });
        return;
      }
      if (finalType === "academic" && (!finalClass || !finalBoard)) {
        res.status(400).json({ error: "Class and Board are required for Academic Enquiry." });
        return;
      }
      if (finalType === "computer" && !finalCourse) {
        res.status(400).json({ error: "Course is required for Computer Enquiry." });
        return;
      }

      if (updates.enquiryDate !== undefined) {
        Object.assign(updates, getEnquiryDateAndDay(updates.enquiryDate));
      }
      if (updates.followUpDate === null || updates.followUpDate === "") updates.followUpDate = undefined;
      if (updates.email !== undefined) updates.email = String(updates.email ?? "").trim().toLowerCase();
      if (updates.studentName !== undefined) updates.studentName = String(updates.studentName).trim();
      if (updates.parentName !== undefined) updates.parentName = String(updates.parentName).trim();
      if (updates.phone !== undefined) updates.phone = String(updates.phone).trim();
      if (updates.remarks !== undefined) updates.remarks = String(updates.remarks).trim();

      if (finalType === "academic") updates.courseInterest = "";
      else {
        updates.className = "";
        updates.board = "";
      }

      const admission = await Admission.findOneAndUpdate(
        { _id: id, instituteId },
        { $set: updates, ...(updates.followUpDate === undefined && req.body.followUpDate !== undefined ? { $unset: { followUpDate: 1 } } : {}) },
        { returnDocument: "after", runValidators: true },
      );

      res.json(fmt(admission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update enquiry." });
    }
  },
);

router.delete(
  "/admissions/:id",
  authenticate,
  authorize("institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const instituteId = getInstituteIdForUser(req);
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute." });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const admission = await Admission.findOneAndDelete({ _id: id, instituteId });
      if (!admission) {
        res.status(404).json({ error: "Enquiry not found." });
        return;
      }
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to delete enquiry." });
    }
  },
);

export default router;
