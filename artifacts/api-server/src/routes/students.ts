import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { FeeStructure, StudentFeeAssignment, Payment } from "../models/Finance";
import { getCycleDay, generateDueDates, getMonthInfo } from "../lib/feeCycle";
import { StudentEditLog } from "../models/StudentEditLog";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);

  if (user?.role === "super_admin") {
    return null;
  }

  return user?.instituteId ? String(user.instituteId) : null;
}

async function populateStudent(student: any) {
  const [batch, course] = await Promise.all([
    Batch.findById(student.batchId).select("name"),
    Course.findById(student.courseId).select("name"),
  ]);

  return {
    id: String(student._id),
    name: student.name,
    email: student.email ?? "",
    phone: student.phone,
    enrollmentNo: student.enrollmentNo,

    instituteId: student.instituteId ? String(student.instituteId) : null,

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
    documents: Array.isArray(student.documents) ? student.documents : [],

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

    correspondenceAddress: student.correspondenceAddress ?? null,
    correspondenceDistrict: student.correspondenceDistrict ?? null,
    correspondenceState: student.correspondenceState ?? null,
    correspondencePin: student.correspondencePin ?? null,

    permanentAddress: student.permanentAddress ?? null,
    permanentDistrict: student.permanentDistrict ?? null,
    permanentState: student.permanentState ?? null,
    permanentPin: student.permanentPin ?? null,
    loginId: student.loginId ?? null,

    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

function cleanStudentBody(body: any) {
  const allowedFields = [
    "name", "email", "phone", "batchId", "courseId", "status", "academicYear",
    "dateOfBirth", "gender", "genderOther", "bloodGroup", "schoolName",
    "className", "section", "board", "boardOther", "lastClassPercentage",
    "lastClassMarks", "photoDataUrl", "documents", "aadhaarCard",
    "previousMarksheet", "parentName", "parentPhone", "motherName",
    "motherOccupation", "motherPhone", "motherWhatsapp", "fatherName",
    "fatherOccupation", "fatherPhone", "fatherWhatsapp", "emergencyPhone",
    "correspondenceAddress", "correspondenceDistrict", "correspondenceState",
    "correspondencePin", "permanentAddress", "permanentDistrict",
    "permanentState", "permanentPin", "loginId", "loginPassword",
  ];

  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (!data.email) delete data.email;
  if (data.loginId) data.loginId = String(data.loginId).toLowerCase().trim();
  if (!data.loginPassword) delete data.loginPassword;

  return data;
}

async function prepareStudentAuthFields(data: Record<string, any>) {
  if (data.loginId) data.loginId = String(data.loginId).toLowerCase().trim();
  if (!data.loginPassword) {
    delete data.loginPassword;
    return;
  }
  if (typeof data.loginPassword === "string" && !data.loginPassword.startsWith("$2")) {
    data.loginPassword = await bcrypt.hash(data.loginPassword, 10);
  }
}

async function generateEnrollmentNo(instituteId: string) {
  const prefix = "SSC202627";
  const students = await Student.find({
    instituteId,
    enrollmentNo: new RegExp(`^${prefix}\\d+$`),
  }).select("enrollmentNo").lean();

  const highestSerial = students.reduce((highest: number, student: any) => {
    const serialText = String(student.enrollmentNo ?? "").slice(prefix.length);
    const serial = Number.parseInt(serialText, 10);
    return Number.isFinite(serial) ? Math.max(highest, serial) : highest;
  }, 0);

  return `${prefix}${String(highestSerial + 1).padStart(3, "0")}`;
}

async function verifyCourseAndBatch(instituteId: string, courseId: string, batchId: string) {
  const course = await Course.findOne({ _id: courseId, instituteId });
  if (!course) return "Selected course does not belong to this institute";
  
  const batch = await Batch.findOne({ _id: batchId, instituteId, courseId });
  if (!batch) return "Selected batch does not belong to this course";

  return null;
}


// =====================================================================
// STUDENT SELF-UPDATE HANDLER
// =====================================================================
const STUDENT_EDITABLE_FIELDS: Record<string, { label: string; autoApprove: boolean }> = {
  name: { label: "Student Full Name", autoApprove: false },
  email: { label: "Email ID", autoApprove: true },
  phone: { label: "Phone Number", autoApprove: true },
  loginPassword: { label: "Login Password", autoApprove: true },
  loginId: { label: "Login ID", autoApprove: false },
  fatherName: { label: "Father's Name", autoApprove: false },
  motherName: { label: "Mother's Name", autoApprove: false },
  fatherPhone: { label: "Father's Phone", autoApprove: true },
  motherPhone: { label: "Mother's Phone", autoApprove: true },
  fatherOccupation: { label: "Father's Occupation", autoApprove: true },
  motherOccupation: { label: "Mother's Occupation", autoApprove: true },
  fatherWhatsapp: { label: "Father's WhatsApp", autoApprove: true },
  motherWhatsapp: { label: "Mother's WhatsApp", autoApprove: true },
  emergencyPhone: { label: "Emergency Phone", autoApprove: true },
  bloodGroup: { label: "Blood Group", autoApprove: true },
  photoDataUrl: { label: "Profile Photo", autoApprove: true },
  schoolName: { label: "School Name", autoApprove: false },
  className: { label: "Class Name", autoApprove: false },
  section: { label: "Section", autoApprove: false },
  board: { label: "Board", autoApprove: false },
  boardOther: { label: "Board (Other)", autoApprove: false },
  lastClassPercentage: { label: "Last Class Percentage", autoApprove: true },
  lastClassMarks: { label: "Last Class Marks", autoApprove: true },
  dateOfBirth: { label: "Date of Birth", autoApprove: false },
  gender: { label: "Gender", autoApprove: true },
  genderOther: { label: "Gender (Other)", autoApprove: true },
  aadhaarCard: { label: "Aadhaar Card", autoApprove: false },
  previousMarksheet: { label: "Previous Marksheet", autoApprove: false },
  parentName: { label: "Guardian Name", autoApprove: false },
  parentPhone: { label: "Guardian Phone", autoApprove: true },
  correspondenceAddress: { label: "Correspondence Address", autoApprove: true },
  correspondenceDistrict: { label: "Correspondence District", autoApprove: true },
  correspondenceState: { label: "Correspondence State", autoApprove: true },
  correspondencePin: { label: "Correspondence PIN", autoApprove: true },
  permanentAddress: { label: "Permanent Address", autoApprove: true },
  permanentDistrict: { label: "Permanent District", autoApprove: true },
  permanentState: { label: "Permanent State", autoApprove: true },
  permanentPin: { label: "Permanent PIN", autoApprove: true },
};

const handleStudentSelfUpdate = async (req: any, res: any): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const userRole = req.user?.role;

    if (userRole !== "student") {
      res.status(403).json({ error: "Only students can update their profiles." });
      return;
    }

    const student = await Student.findById(userId);
    if (!student) {
      res.status(404).json({ error: "Student not found in database." });
      return;
    }

    const updates = req.body || {};
    const editLogs: any[] = [];
    const appliedChanges: Record<string, any> = {};
    const pendingChanges: Record<string, any> = {};

    for (let [fieldName, rawValue] of Object.entries(updates)) {
      const config = STUDENT_EDITABLE_FIELDS[fieldName];
      if (!config) continue;

      let newValue: any = rawValue;

      // Clean empty strings for Date / Number fields to prevent Mongoose CastErrors
      if (newValue === "" || newValue === null || newValue === undefined) {
        if (["dateOfBirth"].includes(fieldName)) {
          newValue = null;
        } else if (["lastClassPercentage", "lastClassMarks"].includes(fieldName)) {
          newValue = null;
        } else {
          newValue = "";
        }
      }

      const oldValue = (student as any)[fieldName];
      let oldStr = oldValue != null ? String(oldValue) : "";
      let newStr = newValue != null ? String(newValue) : "";

      // Skip empty password
      if (fieldName === "loginPassword" && !newStr.trim()) continue;

      // Skip if no change
      if (oldStr === newStr) continue;

      // Password hashing
      if (fieldName === "loginPassword") {
        if (newStr.trim().length < 6) {
          res.status(400).json({ error: "Password must be at least 6 characters long." });
          return;
        }
        newValue = await bcrypt.hash(newStr.trim(), 10);
        oldStr = "[ENCRYPTED_PASSWORD_HIDDEN]";
        newStr = "[NEW_PASSWORD_UPDATED_SECURELY]";
      }

      // Base64 photo log truncation
      if (fieldName === "photoDataUrl") {
        oldStr = oldStr ? "[OLD_PHOTO_ATTACHED]" : "No Photo";
        newStr = newStr ? "[NEW_PHOTO_ATTACHED]" : "No Photo";
      }

      // Convert gender to lowercase for Mongoose Enum validation
      if (fieldName === "gender" && typeof newValue === "string") {
        newValue = newValue.toLowerCase().trim();
      }

      editLogs.push({
        studentId: student._id,
        studentName: student.name || "Unknown Student",
        instituteId: student.instituteId || student._id,
        fieldName,
        fieldLabel: config.label,
        oldValue: oldStr.substring(0, 500),
        newValue: newStr.substring(0, 500),
        editedBy: "student",
        status: config.autoApprove ? "auto-approved" : "pending",
      });

      if (config.autoApprove) {
        appliedChanges[fieldName] = newValue;
      } else {
        pendingChanges[fieldName] = newValue;
      }
    }

    // Save student profile
    if (Object.keys(appliedChanges).length > 0) {
      Object.assign(student, appliedChanges);
      await student.save();
    }

    // Insert audit log safely
    if (editLogs.length > 0) {
      try {
        await StudentEditLog.insertMany(editLogs);
      } catch (logErr) {
        console.error("Non-blocking StudentEditLog error:", logErr);
      }
    }

    res.status(200).json({
      success: true,
      applied: Object.keys(appliedChanges),
      pending: Object.keys(pendingChanges),
      message: Object.keys(pendingChanges).length > 0
        ? "Form details & password updated! Sensitive fields pending admin approval."
        : "Form details successfully updated!",
    });
  } catch (error: any) {
    console.error("Error during profile update:", error);
    res.status(500).json({
      error: "Update server error",
      details: error?.message || String(error),
    });
  }
};

router.put("/students/self-update", authenticate, handleStudentSelfUpdate);
router.put("/self-update", authenticate, handleStudentSelfUpdate);


// =====================================================================
// 2. ADMIN EDIT LOG ROUTES
// =====================================================================
router.get("/students/edit-logs", authenticate, authorize("super_admin", "institute_admin"), async (req: any, res): Promise<void> => {
  try {
    const instituteId = getInstituteIdForUser(req);
    const { status, studentId, limit = "100" } = req.query as Record<string, string>;

    const query: any = {};
    if (instituteId) query.instituteId = instituteId;
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;

    const logs = await StudentEditLog.find(query).sort({ createdAt: -1 }).limit(Number(limit) || 100).lean();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.post("/students/edit-logs/:logId/review", authenticate, authorize("super_admin", "institute_admin"), async (req: any, res): Promise<void> => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { logId } = req.params;
    const { action, note } = req.body as { action?: string; note?: string };

    if (!["approve", "reject"].includes(String(action))) {
      res.status(400).json({ error: "Invalid action. Use approve or reject." });
      return;
    }

    const log = await StudentEditLog.findById(logId);
    if (!log) {
      res.status(404).json({ error: "Log entry not found" });
      return;
    }

    if (log.status !== "pending") {
      res.status(400).json({ error: "This request is already reviewed" });
      return;
    }

    if (action === "approve") {
      const student = await Student.findById(log.studentId);
      if (student) {
        (student as any)[log.fieldName] = log.newValue;
        await student.save();
      }
      log.status = "approved";
    } else {
      log.status = "rejected";
    }

    log.reviewedBy = adminId;
    log.reviewedAt = new Date();
    log.reviewNote = note || "";
    await log.save();

    res.json({ success: true, message: `Request ${action}d successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: "Review failed" });
  }
});


// =====================================================================
// 3. EXISTING ADMIN ROUTES (CRUD)
// =====================================================================
router.get("/students", authenticate, authorize("super_admin", "institute_admin", "teacher", "staff"), async (req, res): Promise<void> => {
  try {
    const { search, batchId, status } = req.query as Record<string, string>;
    const filter: any = {};
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { enrollmentNo: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;

    const students = await Student.find(filter).sort({ createdAt: -1 });
    const result = await Promise.all(students.map(populateStudent));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to load students" });
  }
});

router.post("/students", authenticate, authorize("super_admin", "institute_admin", "staff"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    let instituteId = getInstituteIdForUser(req);

    if (user.role === "super_admin") {
      instituteId = req.body.instituteId ? String(req.body.instituteId) : null;
    }

    if (!instituteId) {
      res.status(400).json({ error: "instituteId is required to create a student" });
      return;
    }

    const data = cleanStudentBody(req.body);
    await prepareStudentAuthFields(data);

    if (!data.name || !data.phone || !data.courseId || !data.batchId || !data.academicYear) {
      res.status(400).json({ error: "Name, phone, course, batch and academic year are required" });
      return;
    }

    const validationError = await verifyCourseAndBatch(instituteId, data.courseId, data.batchId);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const enrollmentNo = await generateEnrollmentNo(instituteId);
    const student = await Student.create({ ...data, enrollmentNo, instituteId });

    await Batch.findByIdAndUpdate(data.batchId, { $addToSet: { studentIds: student._id } });

    let feeAssignmentInfo: any = null;
    try {
      const admissionDate = req.body.admissionDate || new Date().toISOString().split("T")[0];
      const totalMonths = Number(req.body.totalMonths) || 12;
      const scholarshipPercent = Number(req.body.scholarshipPercent) || 0;

      const feeStructure = await FeeStructure.findOne({ instituteId, courseId: data.courseId });

      if (feeStructure) {
        const feeCycleDay = getCycleDay(admissionDate);
        const dueDates = generateDueDates(admissionDate, totalMonths);
        const startInfo = getMonthInfo(dueDates[0]!);
        const endInfo = getMonthInfo(dueDates[dueDates.length - 1]!);

        const scholarshipAmount = Math.round((feeStructure.amount * scholarshipPercent) / 100);
        const monthlyAmount = Math.max(0, feeStructure.amount - scholarshipAmount);

        const assignment = await StudentFeeAssignment.create({
          instituteId, studentId: student._id, feeStructureId: feeStructure._id,
          admissionDate, feeCycleDay, monthlyAmount, scholarshipPercent, totalMonths,
          startMonth: startInfo.month, endMonth: endInfo.month, status: "active",
        });

        const payments = await Promise.all(
          dueDates.map(async (dueDate) => {
            const info = getMonthInfo(dueDate);
            return Payment.create({
              instituteId, studentId: student._id, feeStructureId: feeStructure._id,
              assignmentId: assignment._id, originalAmount: feeStructure.amount,
              scholarshipPercent, scholarshipAmount, amount: monthlyAmount, lateFee: 0,
              totalAmount: monthlyAmount, paidAmount: 0, dueDate, month: info.month,
              monthLabel: info.label, status: "pending",
            });
          })
        );

        feeAssignmentInfo = {
          assigned: true, assignmentId: String(assignment._id), monthlyAmount,
          totalMonths, firstDueDate: dueDates[0], lastDueDate: dueDates[dueDates.length - 1],
          billsGenerated: payments.length,
        };
      } else {
        feeAssignmentInfo = { assigned: false, reason: "No fee structure found for this course." };
      }
    } catch (feeError: any) {
      feeAssignmentInfo = { assigned: false, error: feeError?.message ?? "Fee assignment failed" };
    }

    const studentData = await populateStudent(student);
    res.status(201).json({ ...studentData, feeAssignment: feeAssignmentInfo });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to create student" });
  }
});

router.get("/students/:id", authenticate, authorize("super_admin", "institute_admin", "teacher", "staff"), async (req, res): Promise<void> => {
  try {
    const filter: any = { _id: req.params.id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    const student = await Student.findOne(filter);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    res.json(await populateStudent(student));
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to load student" });
  }
});

router.patch("/students/:id", authenticate, authorize("super_admin", "institute_admin", "staff"), async (req, res): Promise<void> => {
  try {
    const filter: any = { _id: req.params.id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    const existingStudent = await Student.findOne(filter);
    if (!existingStudent) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const updateData = cleanStudentBody(req.body);
    await prepareStudentAuthFields(updateData);

    const nextCourseId = updateData.courseId ?? String(existingStudent.courseId);
    const nextBatchId = updateData.batchId ?? String(existingStudent.batchId);
    const effectiveInstituteId = instituteId ?? String(existingStudent.instituteId);

    const validationError = await verifyCourseAndBatch(effectiveInstituteId, nextCourseId, nextBatchId);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const oldBatchId = String(existingStudent.batchId);
    const student = await Student.findOneAndUpdate(filter, updateData, { new: true, runValidators: true });

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    if (oldBatchId !== String(student.batchId)) {
      await Batch.findByIdAndUpdate(oldBatchId, { $pull: { studentIds: student._id } });
      await Batch.findByIdAndUpdate(student.batchId, { $addToSet: { studentIds: student._id } });
    }

    res.json(await populateStudent(student));
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to update student" });
  }
});

router.delete("/students/:id", authenticate, authorize("super_admin", "institute_admin"), async (req, res): Promise<void> => {
  try {
    const filter: any = { _id: req.params.id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    const student = await Student.findOneAndDelete(filter);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    await Batch.updateMany({ studentIds: student._id }, { $pull: { studentIds: student._id } });
    res.sendStatus(204);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to delete student" });
  }
});

export default router;