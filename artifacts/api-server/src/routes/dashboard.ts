import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Staff } from "../models/Staff";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { Payment } from "../models/Finance";
import { StudentAttendance } from "../models/Attendance";
import { Admission } from "../models/Admission";

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

router.get(
"/dashboard/stats",
authenticate,
authorize("super_admin", "institute_admin", "staff", "accountant"),
async (req, res): Promise<void> => {
const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

if (user.role !== "super_admin" && !instituteId) {
  res.status(403).json({
    error: "Your account is not linked to an institute",
  });
  return;
}

const studentFilter: any = {
  status: "active",
};

const batchFilter: any = {
  status: "active",
};

const courseFilter: any = {
  status: "active",
};

const staffFilter: any = {
  status: "active",
};

if (user.role !== "super_admin") {
  studentFilter.instituteId = instituteId;
  batchFilter.instituteId = instituteId;
  courseFilter.instituteId = instituteId;
  staffFilter.instituteId = instituteId;
}

const [
  totalStudents,
  totalStaff,
  totalBatches,
  totalCourses,
  payments,
  presentToday,
  admissionEnquiries,
] = await Promise.all([
  Student.countDocuments(studentFilter),
  Staff.countDocuments(staffFilter),
  Batch.countDocuments(batchFilter),
  Course.countDocuments(courseFilter),

  user.role === "super_admin"
    ? Payment.find({
        month: new Date().toISOString().slice(0, 7),
      })
    : Promise.resolve([]),

  user.role === "super_admin"
    ? StudentAttendance.countDocuments({
        date: new Date().toISOString().split("T")[0],
        status: "present",
      })
    : Promise.resolve(0),

  user.role === "super_admin"
    ? Admission.countDocuments({
        status: {
          $in: ["new", "contacted", "visited"],
        },
      })
    : Promise.resolve(0),
]);

const monthlyRevenue = payments
  .filter((payment: any) => payment.status === "paid")
  .reduce(
    (sum: number, payment: any) => sum + payment.totalAmount,
    0
  );

const pendingFees = payments
  .filter((payment: any) => payment.status !== "paid")
  .reduce(
    (sum: number, payment: any) => sum + payment.totalAmount,
    0
  );

res.json({
  totalStudents,
  totalStaff,
  totalBatches,
  totalCourses,
  monthlyRevenue,
  pendingFees,
  presentToday,
  admissionEnquiries,
});

}
);

router.get(
"/dashboard/recent-activity",
authenticate,
authorize("super_admin", "institute_admin", "staff", "accountant"),
async (req, res): Promise<void> => {
const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

if (user.role !== "super_admin" && !instituteId) {
  res.status(403).json({
    error: "Your account is not linked to an institute",
  });
  return;
}

const studentFilter: any = {};

if (user.role !== "super_admin") {
  studentFilter.instituteId = instituteId;
}

const recentStudents = await Student.find(studentFilter)
  .sort({ createdAt: -1 })
  .limit(10)
  .select("name createdAt");

const activities = recentStudents.map((student) => ({
  id: String(student._id),
  type: "enrollment",
  message: "New student enrolled: " + student.name,
  createdAt: student.createdAt.toISOString(),
}));

activities.sort(
  (a, b) =>
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
);

res.json(activities);

}
);

export default router;