import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Admission } from "../models/Admission";

const router: IRouter = Router();

function getEnquiryDateAndDay(value?: string) {
  const enquiryDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);

  const date = new Date(`${enquiryDate}T00:00:00`);
  const enquiryDay = date.toLocaleDateString("en-US", { weekday: "long" });

  return { enquiryDate, enquiryDay };
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
    enquiryDate: admission.enquiryDate ?? admission.createdAt?.toISOString?.().slice(0, 10) ?? "",
    enquiryDay: admission.enquiryDay ?? "",
    remarks: admission.remarks ?? "",
    createdAt: admission.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

router.get(
  "/admissions",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const { status, enquiryType } = req.query as Record<string, string>;
      const filter: any = {};

      if (status) filter.status = status;
      if (enquiryType === "academic" || enquiryType === "computer") {
        filter.enquiryType = enquiryType;
      }

      const admissions = await Admission.find(filter).sort({ createdAt: -1 });
      res.json(admissions.map(fmt));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load enquiries." });
    }
  }
);

router.post(
  "/admissions",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const {
        enquiryType = "academic",
        studentName,
        className,
        board,
        courseInterest,
        phone,
        source,
        remarks,
        enquiryDate,
      } = req.body;

      if (!studentName || !phone) {
        res.status(400).json({ error: "Name and Contact Number are required." });
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

      const { enquiryDate: savedEnquiryDate, enquiryDay } = getEnquiryDateAndDay(enquiryDate);

      const admission = await Admission.create({
        enquiryType,
        enquiryDate: savedEnquiryDate,
        enquiryDay,
        studentName,
        className: enquiryType === "academic" ? className : "",
        board: enquiryType === "academic" ? board : "",
        courseInterest: enquiryType === "computer" ? courseInterest : "",
        phone,
        source: source ?? "walk-in",
        remarks: remarks ?? "",
        status: "new",
      });

      res.status(201).json(fmt(admission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to save enquiry." });
    }
  }
);

router.patch(
  "/admissions/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updates: any = {};
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
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const existing = await Admission.findById(id);
      if (!existing) {
        res.status(404).json({ error: "Enquiry not found." });
        return;
      }

      const finalType = updates.enquiryType ?? existing.enquiryType ?? "academic";
      const finalClass = updates.className ?? existing.className;
      const finalBoard = updates.board ?? existing.board;
      const finalCourse = updates.courseInterest ?? existing.courseInterest;

      if (finalType === "academic" && (!finalClass || !finalBoard)) {
        res.status(400).json({ error: "Class and Board are required for Academic Enquiry." });
        return;
      }

      if (finalType === "computer" && !finalCourse) {
        res.status(400).json({ error: "Course is required for Computer Enquiry." });
        return;
      }

      if (updates.enquiryDate !== undefined) {
        const { enquiryDate, enquiryDay } = getEnquiryDateAndDay(updates.enquiryDate);
        updates.enquiryDate = enquiryDate;
        updates.enquiryDay = enquiryDay;
      }

      if (finalType === "academic") {
        updates.courseInterest = "";
      } else {
        updates.className = "";
        updates.board = "";
      }

      const admission = await Admission.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      res.json(fmt(admission));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to update enquiry." });
    }
  }
);

router.delete(
  "/admissions/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const admission = await Admission.findByIdAndDelete(id);

      if (!admission) {
        res.status(404).json({ error: "Enquiry not found." });
        return;
      }

      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to delete enquiry." });
    }
  }
);

export default router;
