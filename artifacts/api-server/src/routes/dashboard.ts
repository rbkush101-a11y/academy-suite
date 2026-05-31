import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { Payment } from "../models/Finance";
import { StudentAttendance } from "../models/Attendance";
import { Admission } from "../models/Admission";

const router: IRouter = Router();

router.get("/dashboard/stats", authenticate, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const [totalStudents, totalStaff, totalBatches, totalCourses, payments, presentToday, admissionEnquiries] =
    await Promise.all([
      Student.countDocuments({ status: "active" }),
      Staff.countDocuments({ status: "active" }),
      Batch.countDocuments({ status: "active" }),
      Course.countDocuments({ status: "active" }),
      Payment.find({ month: thisMonth }),
      StudentAttendance.countDocuments({ date: today, status: "present" }),
      Admission.countDocuments({ status: { $in: ["new", "contacted", "visited"] } }),
    ]);

  const monthlyRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.totalAmount, 0);
  const pendingFees = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.totalAmount, 0);

  res.json({ totalStudents, totalStaff, totalBatches, totalCourses, monthlyRevenue, pendingFees, presentToday, admissionEnquiries });
});

router.get("/dashboard/recent-activity", authenticate, async (req, res): Promise<void> => {
  const [recentStudents, recentPayments, recentAdmissions] = await Promise.all([
    Student.find().sort({ createdAt: -1 }).limit(3).select("name createdAt"),
    Payment.find({ status: "paid" }).sort({ updatedAt: -1 }).limit(3).select("totalAmount updatedAt"),
    Admission.find().sort({ createdAt: -1 }).limit(4).select("studentName status createdAt"),
  ]);

  const activities = [
    ...recentStudents.map((s) => ({
      id: String(s._id),
      type: "enrollment",
      message: `New student enrolled: ${s.name}`,
      createdAt: s.createdAt.toISOString(),
    })),
    ...recentPayments.map((p) => ({
      id: String(p._id),
      type: "payment",
      message: `Payment received: ₹${p.totalAmount}`,
      createdAt: (p as any).updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    ...recentAdmissions.map((a) => ({
      id: String(a._id),
      type: "admission",
      message: `Admission enquiry from ${a.studentName} — ${a.status}`,
      createdAt: a.createdAt.toISOString(),
    })),
  ];

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activities.slice(0, 10));
});

export default router;
