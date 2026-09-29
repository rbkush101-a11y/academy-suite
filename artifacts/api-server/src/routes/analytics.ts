import { Router, type IRouter } from "express";
import mongoose from "mongoose";

import { authenticate, authorize } from "../middlewares/auth";
import { TestMark, Test, calculateGrade } from "../models/Test";
import { Student } from "../models/Student";
import { StudentAttendance } from "../models/Attendance";

const router: IRouter = Router();

type UserRequest = {
  userId?: string;
  email?: string;
  role?: string;
  instituteId?: string | null;
};

type InstituteFilter = {
  instituteId?: mongoose.Types.ObjectId;
};

function getInstituteFilter(req: {
  user?: UserRequest;
}): InstituteFilter {
  if (req.user?.role === "super_admin") {
    return {};
  }

  if (!req.user?.instituteId) {
    throw new Error("Institute context is required");
  }

  if (!mongoose.isValidObjectId(req.user.instituteId)) {
    throw new Error("Invalid institute context");
  }

  return {
    instituteId: new mongoose.Types.ObjectId(req.user.instituteId),
  };
}

function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function getSafeLimit(value: unknown): number {
  const parsed = Number(value ?? 10);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

/**
 * TOPPERS
 *
 * GET /analytics/toppers
 *
 * Optional:
 * ?testId=<id>
 * ?batchId=<id>
 * ?limit=10
 */
router.get(
  "/analytics/toppers",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const { testId, batchId, limit } = req.query as Record<
        string,
        string | undefined
      >;

      const instituteFilter = getInstituteFilter(req);
      const top = getSafeLimit(limit);

      const testFilter: Record<string, unknown> = {
        ...instituteFilter,
      };

      if (testId) {
        if (!isValidObjectId(testId)) {
          res.status(400).json({
            error: "Invalid testId",
          });
          return;
        }

        testFilter._id = new mongoose.Types.ObjectId(testId);
      }

      if (batchId) {
        if (!isValidObjectId(batchId)) {
          res.status(400).json({
            error: "Invalid batchId",
          });
          return;
        }

        testFilter.batchId = new mongoose.Types.ObjectId(batchId);
      }

      const tests = await Test.find(testFilter)
        .select("_id totalMarks")
        .lean()
        .exec();

      if (tests.length === 0) {
        res.json([]);
        return;
      }

      const testIds = tests.map((test) => test._id);

      const marks = await TestMark.find({
        ...instituteFilter,
        testId: { $in: testIds },
      })
        .select("testId studentId marksObtained")
        .lean()
        .exec();

      const testMarksMap = new Map(
        tests.map((test) => [
          String(test._id),
          Number(test.totalMarks) || 0,
        ]),
      );

      const studentTotals: Record<
        string,
        {
          obtained: number;
          total: number;
        }
      > = {};

      for (const mark of marks) {
        const studentId = String(mark.studentId);
        const totalMarks = testMarksMap.get(String(mark.testId)) ?? 0;

        if (!studentTotals[studentId]) {
          studentTotals[studentId] = {
            obtained: 0,
            total: 0,
          };
        }

        studentTotals[studentId].obtained += Number(mark.marksObtained) || 0;
        studentTotals[studentId].total += totalMarks;
      }

      const sorted = Object.entries(studentTotals)
        .map(([studentId, data]) => ({
          studentId,
          obtained: data.obtained,
          total: data.total,
          percentage:
            data.total > 0 ? (data.obtained / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, top);

      const result = await Promise.all(
        sorted.map(async (item, index) => {
          const studentFilter: Record<string, unknown> = {
            _id: new mongoose.Types.ObjectId(item.studentId),
            ...instituteFilter,
          };

          const student = await Student.findOne(studentFilter)
            .select("name enrollmentNo")
            .lean()
            .exec();

          return {
            rank: index + 1,
            studentId: item.studentId,
            studentName: student?.name ?? "Unknown",
            enrollmentNo: student?.enrollmentNo ?? "",
            marksObtained: item.obtained,
            totalMarks: item.total,
            percentage: Math.round(item.percentage),
            grade: calculateGrade(item.obtained, item.total || 1),
          };
        }),
      );

      res.json(result);
    } catch {
      res.status(500).json({
        error: "Failed to load topper analytics",
      });
    }
  },
);

/**
 * PERFORMANCE
 *
 * GET /analytics/performance
 *
 * Optional:
 * ?batchId=<id>
 */
router.get(
  "/analytics/performance",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher"),
  async (req, res): Promise<void> => {
    try {
      const { batchId } = req.query as Record<
        string,
        string | undefined
      >;

      const instituteFilter = getInstituteFilter(req);

      const testFilter: Record<string, unknown> = {
        ...instituteFilter,
      };

      if (batchId) {
        if (!isValidObjectId(batchId)) {
          res.status(400).json({
            error: "Invalid batchId",
          });
          return;
        }

        testFilter.batchId = new mongoose.Types.ObjectId(batchId);
      }

      const tests = await Test.find(testFilter)
        .select("_id passingMarks")
        .lean()
        .exec();

      const testIds = tests.map((test) => test._id);

      const marks =
        testIds.length > 0
          ? await TestMark.find({
              ...instituteFilter,
              testId: { $in: testIds },
            })
              .select("testId marksObtained grade createdAt")
              .lean()
              .exec()
          : [];

      const passingMarksMap = new Map(
        tests.map((test) => [
          String(test._id),
          Number(test.passingMarks) || 0,
        ]),
      );

      const totalMarksCount = marks.length;

      const avgMarks =
        totalMarksCount > 0
          ? marks.reduce(
              (sum, mark) => sum + (Number(mark.marksObtained) || 0),
              0,
            ) / totalMarksCount
          : 0;

      const grades: Record<string, number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
      };

      let passed = 0;

      for (const mark of marks) {
        const grade = String(mark.grade ?? "F")
          .trim()
          .toUpperCase();

        if (grade.startsWith("A")) {
          grades.A++;
        } else if (grade.startsWith("B")) {
          grades.B++;
        } else if (grade.startsWith("C")) {
          grades.C++;
        } else if (grade.startsWith("D")) {
          grades.D++;
        } else {
          grades.F++;
        }

        const passingMarks =
          passingMarksMap.get(String(mark.testId)) ?? 0;

        if (Number(mark.marksObtained) >= passingMarks) {
          passed++;
        }
      }

      const attendanceFilter: Record<string, unknown> = {
        ...instituteFilter,
      };

      if (batchId) {
        attendanceFilter.batchId = new mongoose.Types.ObjectId(batchId);
      }

      const attendanceRecords = await StudentAttendance.find(
        attendanceFilter,
      )
        .select("status")
        .limit(1000)
        .lean()
        .exec();

      const presentCount = attendanceRecords.filter(
        (record) =>
          record.status === "present" || record.status === "late",
      ).length;

      const avgAttendance = attendanceRecords.length
        ? Math.round(
            (presentCount / attendanceRecords.length) * 100,
          )
        : 0;

      const monthlyTrend: {
        month: string;
        average: number;
      }[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();

        date.setMonth(date.getMonth() - i);

        const month = date.toISOString().slice(0, 7);

        const monthMarks = marks.filter((mark) => {
          if (!mark.createdAt) {
            return false;
          }

          return new Date(mark.createdAt)
            .toISOString()
            .startsWith(month);
        });

        const average =
          monthMarks.length > 0
            ? Math.round(
                monthMarks.reduce(
                  (sum, mark) =>
                    sum + (Number(mark.marksObtained) || 0),
                  0,
                ) / monthMarks.length,
              )
            : 0;

        monthlyTrend.push({
          month,
          average,
        });
      }

      res.json({
        averageAttendance: avgAttendance,
        averageMarks: Math.round(avgMarks),
        passPercentage:
          totalMarksCount > 0
            ? Math.round((passed / totalMarksCount) * 100)
            : 0,
        gradeDistribution: grades,
        monthlyTrend,
      });
    } catch {
      res.status(500).json({
        error: "Failed to load performance analytics",
      });
    }
  },
);

export default router;