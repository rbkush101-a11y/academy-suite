import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { StudentAttendance, StaffAttendance } from "../models/Attendance";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

function toText(value: unknown) {
  return String(value ?? "").trim();
}

router.get(
  "/attendance/student",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "student", "parent"),
  async (req, res): Promise<void> => {
    try {
      const batchId = toText(req.query.batchId);
      const studentId = toText(req.query.studentId);
      const date = toText(req.query.date);
      const month = toText(req.query.month);

      const recordFilter: any = {};
      if (batchId) recordFilter.batchId = batchId;
      if (studentId) recordFilter.studentId = studentId;
      if (date) recordFilter.date = date;
      if (month) recordFilter.date = new RegExp("^" + month);

      const records = await StudentAttendance.find(recordFilter)
        .sort({ date: -1 })
        .limit(500);

      const recordByStudent = new Map(
        records.map((record: any) => [String(record.studentId), record])
      );

      // For a batch + one date, return every student even if attendance is not marked yet.
      if (batchId && date && !studentId) {
        const students = await Student.find({ batchId })
          .select("name")
          .sort({ name: 1 });

        const result = students.map((student: any) => {
          const record = recordByStudent.get(String(student._id));

          return {
            id: record ? String(record._id) : `not-marked-${String(student._id)}`,
            studentId: String(student._id),
            studentName: student.name ?? "",
            batchId,
            date,
            status: record?.status ?? "not_marked",
            remarks: record?.remarks ?? null,
            createdAt: record?.createdAt?.toISOString?.() ?? null,
          };
        });

        res.json(result);
        return;
      }

      const studentIds = [...new Set(records.map((record: any) => String(record.studentId)))];
      const students = await Student.find({ _id: { $in: studentIds } }).select("name");
      const nameByStudent = new Map(
        students.map((student: any) => [String(student._id), student.name ?? ""])
      );

      res.json(
        records.map((record: any) => ({
          id: String(record._id),
          studentId: String(record.studentId),
          studentName: nameByStudent.get(String(record.studentId)) ?? "",
          batchId: String(record.batchId),
          date: record.date,
          status: record.status,
          remarks: record.remarks ?? null,
          createdAt: record.createdAt?.toISOString?.() ?? null,
        }))
      );
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load student attendance.",
      });
    }
  }
);

router.post(
  "/attendance/student",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const studentId = toText(req.body?.studentId);
      const batchId = toText(req.body?.batchId);
      const date = toText(req.body?.date);
      const status = toText(req.body?.status);
      const remarks = toText(req.body?.remarks);

      if (!studentId || !batchId || !date || !status) {
        res.status(400).json({
          error: "Student, Batch, Date and Status are required.",
        });
        return;
      }

      if (!["present", "absent", "late"].includes(status)) {
        res.status(400).json({ error: "Invalid attendance status." });
        return;
      }

      const student = await Student.findById(studentId).select("name batchId");
      if (!student) {
        res.status(404).json({ error: "Student not found." });
        return;
      }

      if (String((student as any).batchId ?? "") !== batchId) {
        res.status(400).json({
          error: "Selected student does not belong to this batch.",
        });
        return;
      }

      const record = await StudentAttendance.findOneAndUpdate(
        { studentId, batchId, date },
        { studentId, batchId, date, status, remarks },
        { upsert: true, new: true, runValidators: true }
      );

      res.status(201).json({
        id: String(record._id),
        studentId: String(record.studentId),
        studentName: (student as any).name ?? "",
        batchId: String(record.batchId),
        date: record.date,
        status: record.status,
        remarks: record.remarks ?? null,
        createdAt: record.createdAt?.toISOString?.() ?? null,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to save student attendance.",
      });
    }
  }
);

router.get(
  "/attendance/staff",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const staffId = toText(req.query.staffId);
      const date = toText(req.query.date);
      const month = toText(req.query.month);
      const filter: any = {};

      if (staffId) filter.staffId = staffId;
      if (date) filter.date = date;
      if (month) filter.date = new RegExp("^" + month);

      const records = await StaffAttendance.find(filter).sort({ date: -1 }).limit(200);
      const staffIds = [...new Set(records.map((record: any) => String(record.staffId)))];
      const staffMembers = await Staff.find({ _id: { $in: staffIds } }).select("name");
      const nameByStaff = new Map(
        staffMembers.map((member: any) => [String(member._id), member.name ?? ""])
      );

      res.json(
        records.map((record: any) => ({
          id: String(record._id),
          staffId: String(record.staffId),
          staffName: nameByStaff.get(String(record.staffId)) ?? "",
          date: record.date,
          status: record.status,
          checkIn: record.checkIn ?? null,
          checkOut: record.checkOut ?? null,
          remarks: record.remarks ?? null,
          createdAt: record.createdAt?.toISOString?.() ?? null,
        }))
      );
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load staff attendance.",
      });
    }
  }
);

router.post(
  "/attendance/staff",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const { staffId, date, status, checkIn, checkOut, remarks } = req.body;

      const record = await StaffAttendance.findOneAndUpdate(
        { staffId, date },
        { staffId, date, status, checkIn, checkOut, remarks },
        { upsert: true, new: true }
      );

      const staff = await Staff.findById(record.staffId).select("name");

      res.status(201).json({
        id: String(record._id),
        staffId: String(record.staffId),
        staffName: staff?.name ?? "",
        date: record.date,
        status: record.status,
        checkIn: record.checkIn ?? null,
        checkOut: record.checkOut ?? null,
        remarks: record.remarks ?? null,
        createdAt: record.createdAt?.toISOString?.() ?? null,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to save staff attendance.",
      });
    }
  }
);

router.get(
  "/attendance/student/summary",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "student", "parent"),
  async (req, res): Promise<void> => {
    try {
      let studentId = toText(req.query.studentId);
      const month = toText(req.query.month);

      // Student login hai to hamesha apna hi attendance dekhe
      if (req.user!.role === "student") {
        studentId = req.user!.userId;
      }

      if (!studentId) {
        res.status(400).json({ error: "studentId is required." });
        return;
      }

      const filter: any = { studentId };

      if (month) filter.date = new RegExp("^" + month);

      const records = await StudentAttendance.find(filter);
      const present = records.filter((record: any) => record.status === "present").length;
      const absent = records.filter((record: any) => record.status === "absent").length;
      const late = records.filter((record: any) => record.status === "late").length;
      const total = records.length;

      res.json({
        studentId,
        totalClasses: total,
        present,
        absent,
        late,
        percentage: total ? Math.round(((present + late) / total) * 100) : 0,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load attendance summary.",
      });
    }
  }
);

export default router;
