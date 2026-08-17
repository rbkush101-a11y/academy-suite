import cron from "node-cron";
import { Payment, StudentFeeAssignment } from "../models/Finance";
import { Salary, StaffSalaryAssignment } from "../models/Salary";
import { isOverdue, getMonthInfo, getSafeDueDate } from "./feeCycle";
import { logger } from "./logger";

/**
 * ============================================================
 * CRON JOB 1: Daily Overdue Status Update
 * ============================================================
 * Runs every day at 12:05 AM
 * - Marks pending payments as "overdue" if due date has passed
 * - Marks pending salaries as "overdue" too
 */
function scheduleOverdueCheck() {
  cron.schedule("5 0 * * *", async () => {
    logger.info("🔄 [CRON] Running daily overdue check...");
    try {
      // Update overdue payments
      const pendingPayments = await Payment.find({ status: "pending" });
      let paymentUpdated = 0;
      for (const p of pendingPayments) {
        if (isOverdue(p.dueDate)) {
          p.status = "overdue";
          await p.save();
          paymentUpdated++;
        }
      }

      // Update overdue salaries
      const pendingSalaries = await Salary.find({ status: "pending" });
      let salaryUpdated = 0;
      for (const s of pendingSalaries) {
        if (isOverdue(s.dueDate)) {
          s.status = "overdue";
          await s.save();
          salaryUpdated++;
        }
      }

      logger.info(
        { paymentUpdated, salaryUpdated },
        "✅ [CRON] Overdue check complete"
      );
    } catch (error) {
      logger.error({ error }, "❌ [CRON] Overdue check failed");
    }
  });
}

/**
 * ============================================================
 * CRON JOB 2: Auto-generate Next Cycle
 * ============================================================
 * Runs on 1st of every month at 1:00 AM
 * - For each active student assignment, if their end date is close,
 *   generate next 12 months of bills automatically
 */
function scheduleAutoRenewal() {
  cron.schedule("0 1 1 * *", async () => {
    logger.info("🔄 [CRON] Running monthly auto-renewal check...");
    try {
      const assignments = await StudentFeeAssignment.find({ status: "active" });
      let generated = 0;

      for (const assignment of assignments) {
        // Check if any pending payments exist for next 2 months
        const upcomingCount = await Payment.countDocuments({
          assignmentId: assignment._id,
          status: { $in: ["pending", "overdue"] },
        });

        // If less than 2 upcoming, generate next month's bill
        if (upcomingCount < 2) {
          const lastPayment = await Payment.findOne({
            assignmentId: assignment._id,
          }).sort({ dueDate: -1 });

          if (lastPayment) {
            const lastDate = new Date(lastPayment.dueDate);
            const nextMonth = lastDate.getMonth() + 1;
            const nextYear = lastDate.getFullYear() + Math.floor(nextMonth / 12);
            const normalizedMonth = nextMonth % 12;

            const nextDueDate = getSafeDueDate(
              nextYear,
              normalizedMonth,
              assignment.feeCycleDay
            );
            const info = getMonthInfo(nextDueDate);

            await Payment.create({
              instituteId: assignment.instituteId,
              studentId: assignment.studentId,
              feeStructureId: assignment.feeStructureId,
              assignmentId: assignment._id,
              originalAmount: assignment.monthlyAmount,
              scholarshipPercent: assignment.scholarshipPercent,
              scholarshipAmount: 0,
              amount: assignment.monthlyAmount,
              lateFee: 0,
              totalAmount: assignment.monthlyAmount,
              paidAmount: 0,
              dueDate: nextDueDate,
              month: info.month,
              monthLabel: info.label,
              status: "pending",
            });
            generated++;
          }
        }
      }

      logger.info({ generated }, "✅ [CRON] Auto-renewal complete");
    } catch (error) {
      logger.error({ error }, "❌ [CRON] Auto-renewal failed");
    }
  });
}

/**
 * ============================================================
 * CRON JOB 3: Salary Auto-renewal (Same as fee)
 * ============================================================
 */
function scheduleSalaryAutoRenewal() {
  cron.schedule("0 1 1 * *", async () => {
    logger.info("🔄 [CRON] Running salary auto-renewal...");
    try {
      const assignments = await StaffSalaryAssignment.find({ status: "active" });
      let generated = 0;

      for (const assignment of assignments) {
        const upcomingCount = await Salary.countDocuments({
          assignmentId: assignment._id,
          status: { $in: ["pending", "overdue"] },
        });

        if (upcomingCount < 2) {
          const lastSalary = await Salary.findOne({
            assignmentId: assignment._id,
          }).sort({ dueDate: -1 });

          if (lastSalary) {
            const lastDate = new Date(lastSalary.dueDate);
            const nextMonth = lastDate.getMonth() + 1;
            const nextYear = lastDate.getFullYear() + Math.floor(nextMonth / 12);
            const normalizedMonth = nextMonth % 12;

            const nextDueDate = getSafeDueDate(
              nextYear,
              normalizedMonth,
              assignment.salaryCycleDay
            );
            const info = getMonthInfo(nextDueDate);

            await Salary.create({
              instituteId: assignment.instituteId,
              staffId: assignment.staffId,
              assignmentId: assignment._id,
              month: info.month,
              monthLabel: info.label,
              basicSalary: assignment.basicSalary,
              allowances: assignment.allowances,
              bonus: 0,
              deductions: 0,
              dueDate: nextDueDate,
              status: "pending",
            });
            generated++;
          }
        }
      }

      logger.info({ generated }, "✅ [CRON] Salary auto-renewal complete");
    } catch (error) {
      logger.error({ error }, "❌ [CRON] Salary auto-renewal failed");
    }
  });
}

/**
 * ============================================================
 * INITIALIZE ALL CRON JOBS
 * ============================================================
 */
export function initCronJobs() {
  scheduleOverdueCheck();
  scheduleAutoRenewal();
  scheduleSalaryAutoRenewal();
  logger.info("✅ All cron jobs initialized");
}

/**
 * ============================================================
 * MANUAL TRIGGER (For testing / API endpoint)
 * ============================================================
 */
export async function runOverdueCheckNow(): Promise<{
  paymentUpdated: number;
  salaryUpdated: number;
}> {
  let paymentUpdated = 0;
  let salaryUpdated = 0;

  const pendingPayments = await Payment.find({ status: "pending" });
  for (const p of pendingPayments) {
    if (isOverdue(p.dueDate)) {
      p.status = "overdue";
      await p.save();
      paymentUpdated++;
    }
  }

  const pendingSalaries = await Salary.find({ status: "pending" });
  for (const s of pendingSalaries) {
    if (isOverdue(s.dueDate)) {
      s.status = "overdue";
      await s.save();
      salaryUpdated++;
    }
  }

  return { paymentUpdated, salaryUpdated };
}