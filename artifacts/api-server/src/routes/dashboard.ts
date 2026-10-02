import { Router, type IRouter } from "express";
import { Types, type QueryFilter } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Student, type IStudent } from "../models/Student";
import { Staff, type IStaff } from "../models/Staff";
import { Batch, type IBatch } from "../models/Batch";
import { Course, type ICourse } from "../models/Course";
import { Payment } from "../models/Finance";
import { StudentAttendance, StaffAttendance } from "../models/Attendance";
import { Admission } from "../models/Admission";
import { Timetable, type ITimetable } from "../models/Timetable";
import { Exam } from "../models/Exam";
import { Institute } from "../models/Institute";

const router: IRouter = Router();

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);
  if (user?.role === "super_admin") return null;
  return user?.instituteId ? String(user.instituteId) : null;
}

function toInstituteObjectId(instituteId: string | null): Types.ObjectId | null {
  if (!instituteId || !Types.ObjectId.isValid(instituteId)) return null;
  return new Types.ObjectId(instituteId);
}

type TimetableDay = ITimetable["day"];

function getTodayTimetableDay(): TimetableDay {
  const days: readonly TimetableDay[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[new Date().getDay()];
}

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateKey(d);
}

function monthSeries(count = 6) {
  const rows: Array<{ key: string; label: string }> = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    rows.push({
      key: monthKey(d),
      label: d.toLocaleDateString("en-IN", { month: "short" }),
    });
  }

  return rows;
}

function paymentCollected(payment: any): number {
  const paidAmount = Number(payment?.paidAmount || 0);
  if (paidAmount > 0) return paidAmount;
  return payment?.status === "paid" ? Number(payment?.totalAmount || 0) : 0;
}

function paymentRemaining(payment: any): number {
  return Math.max(0, Number(payment?.totalAmount || 0) - paymentCollected(payment));
}

function toActivityTime(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function birthdayMonthDay(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const isoMatch = raw.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function todayBirthdayKey(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

router.get(
  "/dashboard/stats",
  authenticate,
  authorize("super_admin", "institute_admin", "staff", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin" && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const instituteObjectId = toInstituteObjectId(instituteId);
      if (user.role !== "super_admin" && !instituteObjectId) {
        res.status(403).json({ error: "Your institute id is invalid" });
        return;
      }

      const instituteFilter: { instituteId?: Types.ObjectId } =
        user.role === "super_admin" ? {} : { instituteId: instituteObjectId! };

      const studentFilter: QueryFilter<IStudent> = { ...instituteFilter, status: "active" };
      const staffFilter: QueryFilter<IStaff> = { ...instituteFilter, status: "active" };
      const batchFilter: QueryFilter<IBatch> = { ...instituteFilter, status: "active" };
      const courseFilter: QueryFilter<ICourse> = { ...instituteFilter, status: "active" };
      const currentMonth = monthKey();
      const today = dateKey();

      const [totalStudents, totalStaff, totalBatches, totalCourses, payments, activeBatches, staffDocs] =
        await Promise.all([
          Student.countDocuments(studentFilter),
          Staff.countDocuments(staffFilter),
          Batch.countDocuments(batchFilter),
          Course.countDocuments(courseFilter),
          Payment.find({ ...instituteFilter, month: currentMonth }).lean(),
          Batch.find(batchFilter).select("_id").lean(),
          Staff.find(staffFilter).select("_id").lean(),
        ]);

      const batchIds = activeBatches.map((b: any) => b._id);
      const staffIds = staffDocs.map((s: any) => s._id);

      const [presentToday, admissionEnquiries] = await Promise.all([
        batchIds.length
          ? StudentAttendance.countDocuments({ batchId: { $in: batchIds }, date: today, status: "present" })
          : Promise.resolve(0),
        user.role === "super_admin"
          ? Admission.countDocuments({ status: { $in: ["new", "contacted", "visited"] } })
          : Admission.countDocuments({ instituteId, status: { $in: ["new", "contacted", "visited"] } }),
      ]);

      const monthlyRevenue = payments.reduce((sum, payment) => sum + paymentCollected(payment), 0);
      const pendingFees = payments.reduce((sum, payment) => sum + paymentRemaining(payment), 0);

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
    } catch (error: any) {
      console.error("DASHBOARD STATS ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to load dashboard stats" });
    }
  }
);

router.get(
  "/dashboard/overview",
  authenticate,
  authorize("super_admin", "institute_admin", "staff", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin" && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const instituteObjectId = toInstituteObjectId(instituteId);
      if (user.role !== "super_admin" && !instituteObjectId) {
        res.status(403).json({ error: "Your institute id is invalid" });
        return;
      }

      const instituteFilter: { instituteId?: Types.ObjectId } =
        user.role === "super_admin" ? {} : { instituteId: instituteObjectId! };
      const today = dateKey();
      const currentMonth = monthKey();
      const thirtyDaysAgo = startOfDaysAgo(29);
      const sevenDaysAgo = startOfDaysAgo(6);
      const months = monthSeries(6);
      const monthKeys = months.map((m) => m.key);
      const todayName: TimetableDay = getTodayTimetableDay();

      const [institute, activeBatches, activeStudents, activeStaff, activeCourses] = await Promise.all([
        instituteObjectId ? Institute.findById(instituteObjectId).select("instituteName academicYear").lean() : null,
        Batch.find({ ...instituteFilter, status: "active" })
          .select("name courseId schedule capacity studentIds")
          .populate("courseId", "name")
          .lean(),
        Student.find({ ...instituteFilter, status: "active" })
          .select("name batchId courseId dateOfBirth createdAt")
          .lean(),
        Staff.find({ ...instituteFilter, status: "active" })
          .select("name role positionTitle subject dateOfBirth")
          .lean(),
        Course.countDocuments({ ...instituteFilter, status: "active" }),
      ]);

      const batchIds = activeBatches.map((b: any) => b._id);
      const staffIds = activeStaff.map((s: any) => s._id);
      const studentIds = activeStudents.map((s: any) => s._id);

      const admissionFilter: any = user.role === "super_admin" ? {} : { instituteId };
      const paymentFilter: any = { ...instituteFilter };

      const [
        payments,
        openPayments,
        admissions,
        todayAttendance,
        recentAttendance,
        attendanceTrendRows,
        todayStaffAttendance,
        timetableRows,
        upcomingExams,
        upcomingTestCount,
        recentStudents,
        recentPayments,
        recentAdmissions,
      ] = await Promise.all([
        Payment.find({ ...paymentFilter, month: { $in: monthKeys } }).lean(),
        Payment.find({ ...paymentFilter, status: { $in: ["pending", "overdue", "partial"] } }).lean(),
        Admission.find(admissionFilter).select("status followUpDate createdAt studentName courseInterest").lean(),
        batchIds.length
          ? StudentAttendance.find({ batchId: { $in: batchIds }, date: today }).lean()
          : Promise.resolve([]),
        batchIds.length
          ? StudentAttendance.aggregate([
              {
                $match: {
                  batchId: { $in: batchIds },
                  date: { $gte: thirtyDaysAgo, $lte: today },
                },
              },
              {
                $group: {
                  _id: "$studentId",
                  total: { $sum: 1 },
                  attended: {
                    $sum: {
                      $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  attendancePct: {
                    $cond: [
                      { $gt: ["$total", 0] },
                      { $multiply: [{ $divide: ["$attended", "$total"] }, 100] },
                      0,
                    ],
                  },
                },
              },
            ])
          : Promise.resolve([]),
        batchIds.length
          ? StudentAttendance.aggregate([
              {
                $match: {
                  batchId: { $in: batchIds },
                  date: { $gte: sevenDaysAgo, $lte: today },
                },
              },
              {
                $group: {
                  _id: "$date",
                  total: { $sum: 1 },
                  attended: {
                    $sum: {
                      $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0],
                    },
                  },
                },
              },
              { $sort: { _id: 1 } },
            ])
          : Promise.resolve([]),
        staffIds.length
          ? StaffAttendance.find({ staffId: { $in: staffIds }, date: today }).lean()
          : Promise.resolve([]),
        batchIds.length
          ? Timetable.find({ batchId: { $in: batchIds }, day: todayName })
              .populate("batchId", "name courseId")
              .populate("subjectId", "name")
              .populate("teacherId", "name")
              .sort({ startTime: 1 })
              .lean()
          : Promise.resolve([]),
        batchIds.length
          ? Exam.find({
              batchId: { $in: batchIds },
              date: { $gte: today },
              status: { $in: ["scheduled", "ongoing"] },
            })
              .populate("batchId", "name")
              .populate("subjectId", "name")
              .sort({ date: 1, startTime: 1 })
              .limit(6)
              .lean()
          : Promise.resolve([]),
        batchIds.length
          ? Exam.countDocuments({
              batchId: { $in: batchIds },
              date: { $gte: today },
              status: { $in: ["scheduled", "ongoing"] },
            })
          : Promise.resolve(0),
        Student.find(instituteFilter).sort({ createdAt: -1 }).limit(5).select("name createdAt").lean(),
        Payment.find(paymentFilter)
          .sort({ updatedAt: -1 })
          .limit(6)
          .select("studentId paidAmount totalAmount status paymentMethod updatedAt")
          .populate("studentId", "name")
          .lean(),
        Admission.find(admissionFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .select("studentName status createdAt")
          .lean(),
      ]);

      const paymentsThisMonth = payments.filter((p: any) => p.month === currentMonth);
      const collectedThisMonth = paymentsThisMonth.reduce((sum, p) => sum + paymentCollected(p), 0);
      const outstandingThisMonth = paymentsThisMonth.reduce((sum, p) => sum + paymentRemaining(p), 0);
      const outstandingTotal = (openPayments as any[]).reduce((sum, p) => sum + paymentRemaining(p), 0);
      const expectedThisMonth = collectedThisMonth + outstandingThisMonth;
      const overduePayments = (openPayments as any[]).filter(
        (p: any) => p.dueDate && p.dueDate < today && paymentRemaining(p) > 0
      );
      const overdueAmount = overduePayments.reduce((sum, p) => sum + paymentRemaining(p), 0);
      const todayCollection = paymentsThisMonth
        .filter((p: any) => p.paidDate === today)
        .reduce((sum, p) => sum + paymentCollected(p), 0);
      const collectionRate = expectedThisMonth > 0 ? (collectedThisMonth / expectedThisMonth) * 100 : 0;

      const feeTrend = months.map((row) => {
        const monthPayments = payments.filter((p: any) => p.month === row.key);
        return {
          month: row.label,
          collected: monthPayments.reduce((sum, p) => sum + paymentCollected(p), 0),
          outstanding: monthPayments.reduce((sum, p) => sum + paymentRemaining(p), 0),
        };
      });

      const admissionCounts = {
        new: 0,
        contacted: 0,
        visited: 0,
        enrolled: 0,
        dropped: 0,
      };

      for (const lead of admissions as any[]) {
        if (lead.status in admissionCounts) {
          admissionCounts[lead.status as keyof typeof admissionCounts] += 1;
        }
      }

      const openEnquiries = admissionCounts.new + admissionCounts.contacted + admissionCounts.visited;
      const totalClosedForConversion = admissionCounts.enrolled + admissionCounts.dropped;
      const conversionRate =
        totalClosedForConversion > 0
          ? (admissionCounts.enrolled / totalClosedForConversion) * 100
          : admissions.length > 0
            ? (admissionCounts.enrolled / admissions.length) * 100
            : 0;

      const todayFollowUps = (admissions as any[]).filter(
        (a) => a.followUpDate === today && !["enrolled", "dropped"].includes(a.status)
      ).length;
      const overdueFollowUps = (admissions as any[]).filter(
        (a) => a.followUpDate && a.followUpDate < today && !["enrolled", "dropped"].includes(a.status)
      ).length;

      const attendance = {
        present: 0,
        absent: 0,
        late: 0,
        unmarked: 0,
        percentage: 0,
      };

      for (const row of todayAttendance as any[]) {
        if (row.status === "present") attendance.present += 1;
        if (row.status === "absent") attendance.absent += 1;
        if (row.status === "late") attendance.late += 1;
      }
      attendance.unmarked = Math.max(0, activeStudents.length - todayAttendance.length);
      attendance.percentage = activeStudents.length
        ? ((attendance.present + attendance.late) / activeStudents.length) * 100
        : 0;

      const lowAttendanceCount = (recentAttendance as any[]).filter(
        (row) => Number(row.attendancePct || 0) < 75
      ).length;

      const attendanceTrend = (attendanceTrendRows as any[]).map((row) => ({
        date: row._id,
        label: new Date(`${row._id}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" }),
        percentage: Number(row.total || 0) > 0 ? (Number(row.attended || 0) / Number(row.total)) * 100 : 0,
      }));

      const staffAttendance = {
        present: 0,
        absent: 0,
        leave: 0,
        unmarked: 0,
      };
      for (const row of todayStaffAttendance as any[]) {
        if (row.status === "present") staffAttendance.present += 1;
        if (row.status === "absent") staffAttendance.absent += 1;
        if (row.status === "leave") staffAttendance.leave += 1;
      }
      staffAttendance.unmarked = Math.max(0, activeStaff.length - todayStaffAttendance.length);

      const classesToday = (timetableRows as any[]).map((row) => ({
        id: String(row._id),
        batch: row.batchId?.name || "Batch",
        subject: row.subjectId?.name || "Subject",
        teacher: row.teacherId?.name || "Faculty not assigned",
        startTime: row.startTime || "",
        endTime: row.endTime || "",
        room: row.room || "",
      }));

      const tests = (upcomingExams as any[]).map((exam) => ({
        id: String(exam._id),
        name: exam.name,
        batch: exam.batchId?.name || "Batch",
        subject: exam.subjectId?.name || "Subject",
        date: exam.date,
        startTime: exam.startTime || "",
        totalMarks: exam.totalMarks,
      }));

      const birthdayKey = todayBirthdayKey();
      const batchNameById = new Map(
        (activeBatches as any[]).map((batch) => [String(batch._id), batch.name || "Batch"])
      );

      const studentBirthdays = (activeStudents as any[])
        .filter((student) => birthdayMonthDay(student.dateOfBirth) === birthdayKey)
        .map((student) => ({
          id: String(student._id),
          name: student.name || "Student",
          detail: batchNameById.get(String(student.batchId)) || "Active student",
        }));

      const staffBirthdays = (activeStaff as any[])
        .filter((staff) => birthdayMonthDay(staff.dateOfBirth) === birthdayKey)
        .map((staff) => ({
          id: String(staff._id),
          name: staff.name || "Staff member",
          detail: staff.positionTitle || staff.role || "Faculty / Staff",
        }));

      const activities: Array<{
        id: string;
        type: "student" | "payment" | "admission";
        title: string;
        detail: string;
        amount?: number;
        createdAt: string;
        href: string;
      }> = [];

      for (const student of recentStudents as any[]) {
        activities.push({
          id: `student-${student._id}`,
          type: "student",
          title: "New student added",
          detail: student.name || "Student",
          createdAt: toActivityTime(student.createdAt),
          href: "/students",
        });
      }

      for (const payment of recentPayments as any[]) {
        const amount = paymentCollected(payment);
        if (amount <= 0) continue;
        activities.push({
          id: `payment-${payment._id}`,
          type: "payment",
          title: "Fee payment received",
          detail: payment.studentId?.name || "Student payment",
          amount,
          createdAt: toActivityTime(payment.updatedAt),
          href: "/finance/student-fee-management",
        });
      }

      for (const lead of recentAdmissions as any[]) {
        activities.push({
          id: `admission-${lead._id}`,
          type: "admission",
          title: lead.status === "enrolled" ? "Lead converted" : "New admission enquiry",
          detail: lead.studentName || "Admission enquiry",
          createdAt: toActivityTime(lead.createdAt),
          href: "/admissions",
        });
      }

      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        institute: {
          name: institute?.instituteName || "Coaching Institute",
          academicYear: institute?.academicYear || "",
        },
        summary: {
          totalStudents: activeStudents.length,
          totalStaff: activeStaff.length,
          totalBatches: activeBatches.length,
          totalCourses: activeCourses,
          todayClasses: classesToday.length,
          upcomingTests: Number(upcomingTestCount || 0),
          openEnquiries,
        },
        fees: {
          collectedThisMonth,
          expectedThisMonth,
          outstandingThisMonth,
          outstandingTotal,
          overdueAmount,
          overdueCount: overduePayments.length,
          todayCollection,
          collectionRate,
          trend: feeTrend,
        },
        admissions: {
          pipeline: admissionCounts,
          openEnquiries,
          todayFollowUps,
          overdueFollowUps,
          conversionRate,
        },
        attendance: {
          ...attendance,
          lowAttendanceCount,
          trend: attendanceTrend,
        },
        faculty: {
          total: activeStaff.length,
          ...staffAttendance,
        },
        classesToday,
        upcomingTests: tests,
        attention: {
          overdueFees: overduePayments.length,
          overdueFeeAmount: overdueAmount,
          overdueFollowUps,
          lowAttendanceStudents: lowAttendanceCount,
          attendanceNotMarked: attendance.unmarked,
          facultyOnLeave: staffAttendance.leave,
          upcomingTests: Number(upcomingTestCount || 0),
        },
        birthdays: {
          students: studentBirthdays,
          staff: staffBirthdays,
          total: studentBirthdays.length + staffBirthdays.length,
        },
        recentActivity: activities.slice(0, 8),
      });
    } catch (error: any) {
      console.error("DASHBOARD OVERVIEW ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to load dashboard overview" });
    }
  }
);

router.get(
  "/dashboard/recent-activity",
  authenticate,
  authorize("super_admin", "institute_admin", "staff", "accountant"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin" && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const instituteObjectId = toInstituteObjectId(instituteId);
      if (user.role !== "super_admin" && !instituteObjectId) {
        res.status(403).json({ error: "Your institute id is invalid" });
        return;
      }

      const filter: QueryFilter<IStudent> =
        user.role === "super_admin" ? {} : { instituteId: instituteObjectId! };
      const recentStudents = await Student.find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name createdAt");

      res.json(
        recentStudents.map((student) => ({
          id: String(student._id),
          type: "enrollment",
          message: `New student enrolled: ${student.name}`,
          createdAt: student.createdAt.toISOString(),
        }))
      );
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load recent activity" });
    }
  }
);

export default router;
