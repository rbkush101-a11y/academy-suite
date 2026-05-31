import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { StudentAttendance, StaffAttendance } from "../models/Attendance";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";

const router: IRouter = Router();

router.get("/attendance/student", authenticate, async (req, res): Promise<void> => {
  const { batchId, studentId, date, month } = req.query as Record<string, string>;
  const filter: any = {};
  if (batchId) filter.batchId = batchId;
  if (studentId) filter.studentId = studentId;
  if (date) filter.date = date;
  if (month) filter.date = new RegExp(`^${month}`);
  const records = await StudentAttendance.find(filter).sort({ date: -1 }).limit(200);
  const result = await Promise.all(records.map(async (r) => {
    const student = await Student.findById(r.studentId).select("name");
    return {
      id: String(r._id),
      studentId: String(r.studentId),
      studentName: student?.name ?? null,
      batchId: String(r.batchId),
      date: r.date,
      status: r.status,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/attendance/student", authenticate, async (req, res): Promise<void> => {
  const { studentId, batchId, date, status, remarks } = req.body;
  const record = await StudentAttendance.findOneAndUpdate(
    { studentId, date },
    { studentId, batchId, date, status, remarks },
    { upsert: true, new: true }
  );
  const student = await Student.findById(record.studentId).select("name");
  res.status(201).json({
    id: String(record._id),
    studentId: String(record.studentId),
    studentName: student?.name ?? null,
    batchId: String(record.batchId),
    date: record.date,
    status: record.status,
    remarks: record.remarks ?? null,
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/attendance/staff", authenticate, async (req, res): Promise<void> => {
  const { staffId, date, month } = req.query as Record<string, string>;
  const filter: any = {};
  if (staffId) filter.staffId = staffId;
  if (date) filter.date = date;
  if (month) filter.date = new RegExp(`^${month}`);
  const records = await StaffAttendance.find(filter).sort({ date: -1 }).limit(200);
  const result = await Promise.all(records.map(async (r) => {
    const staff = await Staff.findById(r.staffId).select("name");
    return {
      id: String(r._id),
      staffId: String(r.staffId),
      staffName: staff?.name ?? null,
      date: r.date,
      status: r.status,
      checkIn: r.checkIn ?? null,
      checkOut: r.checkOut ?? null,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/attendance/staff", authenticate, async (req, res): Promise<void> => {
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
    staffName: staff?.name ?? null,
    date: record.date,
    status: record.status,
    checkIn: record.checkIn ?? null,
    checkOut: record.checkOut ?? null,
    remarks: record.remarks ?? null,
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/attendance/student/summary", authenticate, async (req, res): Promise<void> => {
  const { studentId, month } = req.query as Record<string, string>;
  const filter: any = { studentId };
  if (month) filter.date = new RegExp(`^${month}`);
  const records = await StudentAttendance.find(filter);
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const total = records.length;
  res.json({ studentId, totalClasses: total, present, absent, late, percentage: total ? Math.round(((present + late) / total) * 100) : 0 });
});

export default router;
