import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { FeeStructure, Payment } from "../models/Finance";
import { Course } from "../models/Course";
import { Batch } from "../models/Batch";
import { Student } from "../models/Student";

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

async function fmtFeeStructure(feeStructure: any) {
const course = await Course.findById(feeStructure.courseId).select("name");

return {
id: String(feeStructure._id),
name: feeStructure.name,

instituteId: feeStructure.instituteId
  ? String(feeStructure.instituteId)
  : null,

courseId: String(feeStructure.courseId),
courseName: course?.name ?? null,

amount: feeStructure.amount,
frequency: feeStructure.frequency,
lateFeePerDay: feeStructure.lateFeePerDay,
dueDay: feeStructure.dueDay,

createdAt: feeStructure.createdAt.toISOString(),

};
}

async function fmtPayment(payment: any) {
  const student = await Student.findById(payment.studentId).select(
    "name enrollmentNo className board courseId batchId academicYear"
  );

  const course = student?.courseId
    ? await Course.findById(student.courseId).select("name")
    : null;

  const batch = student?.batchId
    ? await Batch.findById(student.batchId).select("name")
    : null;

  return {
    id: String(payment._id),
    instituteId: payment.instituteId ? String(payment.instituteId) : null,

    studentId: String(payment.studentId),
    studentName: student?.name ?? null,
    studentEnrollmentNo: student?.enrollmentNo ?? null,
    studentClassName: student?.className ?? null,
    studentBoard: student?.board ?? null,
    studentAcademicYear: student?.academicYear ?? null,
    studentBatchName: batch?.name ?? null,
    courseId: student?.courseId ? String(student.courseId) : null,
    courseName: course?.name ?? null,

    feeStructureId: String(payment.feeStructureId),
    originalAmount: payment.originalAmount ?? payment.amount,
    scholarshipPercent: payment.scholarshipPercent ?? 0,
    scholarshipAmount: payment.scholarshipAmount ?? 0,
    amount: payment.amount,
    lateFee: payment.lateFee ?? 0,
    totalAmount: payment.totalAmount,
    dueDate: payment.dueDate,
    paidDate: payment.paidDate ?? null,
    status: payment.status,
    month: payment.month,
    installment: payment.installment ?? null,
    paymentMethod: payment.paymentMethod ?? null,
    receiptNo: payment.receiptNo ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

router.get(
"/finance/fee-structures",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

const filter: any = {};

if (user.role !== "super_admin") {
  if (!instituteId) {
    res.status(403).json({
      error: "Your account is not linked to an institute",
    });
    return;
  }

  filter.instituteId = instituteId;
}

const feeStructures = await FeeStructure.find(filter).sort({
  createdAt: -1,
});

const result = await Promise.all(
  feeStructures.map(fmtFeeStructure)
);

res.json(result);

}
);

router.post(
"/finance/fee-structures",
authenticate,
authorize("super_admin", "institute_admin"),
async (req, res): Promise<void> => {
try {
const user = getLoggedInUser(req);

  let instituteId = getInstituteIdForUser(req);

  if (user.role === "super_admin") {
    instituteId = req.body.instituteId
      ? String(req.body.instituteId)
      : null;
  }

  if (!instituteId) {
    res.status(400).json({
      error: "instituteId is required to create a fee structure",
    });
    return;
  }

  const course = await Course.findOne({
    _id: req.body.courseId,
    instituteId,
  });

  if (!course) {
    res.status(400).json({
      error: "Selected course does not belong to this institute",
    });
    return;
  }

  const feeStructure = await FeeStructure.create({
    ...req.body,
    instituteId,
  });

  res.status(201).json(
    await fmtFeeStructure(feeStructure)
  );
} catch (error: any) {
  console.error("FEE STRUCTURE CREATE ERROR:", error);

  res.status(500).json({
    error: error?.message ?? "Unable to create fee structure",
  });
}

}
);

router.patch(
"/finance/fee-structures/:id",
authenticate,
authorize("super_admin", "institute_admin"),
async (req, res): Promise<void> => {
try {
const id = Array.isArray(req.params.id)
? req.params.id[0]
: req.params.id;

  const user = getLoggedInUser(req);
  const instituteId = getInstituteIdForUser(req);

  const filter: any = {
    _id: id,
  };

  if (user.role !== "super_admin") {
    if (!instituteId) {
      res.status(403).json({
        error: "Your account is not linked to an institute",
      });
      return;
    }

    filter.instituteId = instituteId;
  }

  const updateData = {
    ...req.body,
  };

  delete updateData.instituteId;

  if (updateData.courseId) {
    const currentFeeStructure = await FeeStructure.findOne(filter);

    if (!currentFeeStructure) {
      res.status(404).json({
        error: "Fee structure not found",
      });
      return;
    }

    const course = await Course.findOne({
      _id: updateData.courseId,
      instituteId: String(currentFeeStructure.instituteId),
    });

    if (!course) {
      res.status(400).json({
        error: "Selected course does not belong to this institute",
      });
      return;
    }
  }

  const feeStructure = await FeeStructure.findOneAndUpdate(
    filter,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!feeStructure) {
    res.status(404).json({
      error: "Fee structure not found",
    });
    return;
  }

  res.json(await fmtFeeStructure(feeStructure));
} catch (error: any) {
  console.error("FEE STRUCTURE UPDATE ERROR:", error);

  res.status(500).json({
    error: error?.message ?? "Unable to update fee structure",
  });
}

}
);

router.delete(
"/finance/fee-structures/:id",
authenticate,
authorize("super_admin", "institute_admin"),
async (req, res): Promise<void> => {
const id = Array.isArray(req.params.id)
? req.params.id[0]
: req.params.id;

const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

const filter: any = {
  _id: id,
};

if (user.role !== "super_admin") {
  if (!instituteId) {
    res.status(403).json({
      error: "Your account is not linked to an institute",
    });
    return;
  }

  filter.instituteId = instituteId;
}

const feeStructure = await FeeStructure.findOneAndDelete(filter);

if (!feeStructure) {
  res.status(404).json({
    error: "Fee structure not found",
  });
  return;
}

res.sendStatus(204);

}
);

router.get(
"/finance/payments",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
const { studentId, status, month } = req.query as Record<
string,
string
>;

const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

const filter: any = {};

if (user.role !== "super_admin") {
  if (!instituteId) {
    res.status(403).json({
      error: "Your account is not linked to an institute",
    });
    return;
  }

  filter.instituteId = instituteId;
}

if (studentId) {
  filter.studentId = studentId;
}

if (status) {
  filter.status = status;
}

if (month) {
  filter.month = month;
}

const payments = await Payment.find(filter).sort({
  createdAt: -1,
});

const result = await Promise.all(payments.map(fmtPayment));

res.json(result);

}
);

router.post(
"/finance/payments",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
try {
const user = getLoggedInUser(req);

  let instituteId = getInstituteIdForUser(req);

  if (user.role === "super_admin") {
    instituteId = req.body.instituteId
      ? String(req.body.instituteId)
      : null;
  }

  if (!instituteId) {
    res.status(400).json({
      error: "instituteId is required to create a payment",
    });
    return;
  }

  const {
    studentId,
    feeStructureId,
    amount,
    dueDate,
    month,
    installment,
    scholarshipPercent,
    paymentMethod,
  } = req.body;

  const student = await Student.findOne({
    _id: studentId,
    instituteId,
  });

  if (!student) {
    res.status(400).json({
      error: "Selected student does not belong to this institute",
    });
    return;
  }

  const feeStructure = await FeeStructure.findOne({
    _id: feeStructureId,
    instituteId,
  });

  if (!feeStructure) {
    res.status(400).json({
      error: "Selected fee structure does not belong to this institute",
    });
    return;
  }

  const originalAmount = Number(amount);

  if (!Number.isFinite(originalAmount) || originalAmount < 0) {
    res.status(400).json({
      error: "A valid original fee amount is required",
    });
    return;
  }

  const parsedScholarshipPercent = Number(scholarshipPercent || 0);
  const allowedScholarshipPercentages = [0, 10, 15, 20, 25, 30, 40];

  if (!allowedScholarshipPercentages.includes(parsedScholarshipPercent)) {
    res.status(400).json({
      error: "Invalid scholarship discount selected",
    });
    return;
  }

  const scholarshipAmount = Math.round(
    (originalAmount * parsedScholarshipPercent) / 100
  );

  const payableAmount = Math.max(0, originalAmount - scholarshipAmount);

  let lateFee = 0;

  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();

    const diffDays = Math.max(
      0,
      Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 86400)
      )
    );

    lateFee = diffDays * feeStructure.lateFeePerDay;
  }

  const payment = await Payment.create({
    instituteId,
    studentId,
    feeStructureId,
    originalAmount,
    scholarshipPercent: parsedScholarshipPercent,
    scholarshipAmount,
    amount: payableAmount,
    lateFee,
    totalAmount: payableAmount + lateFee,
    dueDate,
    month,
    ...(installment ? { installment } : {}),
    paymentMethod,
    status: "pending",
  });

  res.status(201).json(await fmtPayment(payment));
} catch (error: any) {
  console.error("PAYMENT CREATE ERROR:", error);

  res.status(500).json({
    error: error?.message ?? "Unable to create payment",
  });
}

}
);

router.patch(
"/finance/payments/:id",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
try {
const id = Array.isArray(req.params.id)
? req.params.id[0]
: req.params.id;

  const user = getLoggedInUser(req);
  const instituteId = getInstituteIdForUser(req);

  const filter: any = {
    _id: id,
  };

  if (user.role !== "super_admin") {
    if (!instituteId) {
      res.status(403).json({
        error: "Your account is not linked to an institute",
      });
      return;
    }

    filter.instituteId = instituteId;
  }

  const existingPayment = await Payment.findOne(filter);

  if (!existingPayment) {
    res.status(404).json({
      error: "Payment not found",
    });
    return;
  }

  const updateData = {
    ...req.body,
  };

  delete updateData.instituteId;
  delete updateData.studentId;
  delete updateData.feeStructureId;
  delete updateData.receiptNo;

  if (
    updateData.originalAmount !== undefined ||
    updateData.scholarshipPercent !== undefined
  ) {
    const originalAmount = Number(
      updateData.originalAmount ?? existingPayment.originalAmount ?? existingPayment.amount
    );

    const scholarshipPercent = Number(
      updateData.scholarshipPercent ?? existingPayment.scholarshipPercent ?? 0
    );

    const allowedScholarshipPercentages = [0, 10, 15, 20, 25, 30, 40];

    if (
      !Number.isFinite(originalAmount) ||
      originalAmount < 0 ||
      !allowedScholarshipPercentages.includes(scholarshipPercent)
    ) {
      res.status(400).json({
        error: "Invalid scholarship amount or discount selected",
      });
      return;
    }

    const scholarshipAmount = Math.round(
      (originalAmount * scholarshipPercent) / 100
    );

    updateData.originalAmount = originalAmount;
    updateData.scholarshipPercent = scholarshipPercent;
    updateData.scholarshipAmount = scholarshipAmount;
    updateData.amount = Math.max(0, originalAmount - scholarshipAmount);
    updateData.totalAmount =
      updateData.amount + Number(updateData.lateFee ?? existingPayment.lateFee ?? 0);
  }

  if (updateData.status === "paid" && !updateData.paidDate) {
    updateData.paidDate = new Date().toISOString().split("T")[0];
  }

  const payment = await Payment.findOneAndUpdate(
    filter,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!payment) {
    res.status(404).json({
      error: "Payment not found",
    });
    return;
  }

  res.json(await fmtPayment(payment));
} catch (error: any) {
  console.error("PAYMENT UPDATE ERROR:", error);

  res.status(500).json({
    error: error?.message ?? "Unable to update payment",
  });
}

}
);


router.delete(
"/finance/payments/:id",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
const id = Array.isArray(req.params.id)
? req.params.id[0]
: req.params.id;

const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

const filter: any = { _id: id };

if (user.role !== "super_admin") {
  if (!instituteId) {
    res.status(403).json({ error: "Your account is not linked to an institute" });
    return;
  }

  filter.instituteId = instituteId;
}

const payment = await Payment.findOneAndDelete(filter);

if (!payment) {
  res.status(404).json({ error: "Payment not found" });
  return;
}

res.sendStatus(204);
}
);

router.get(
"/finance/summary",
authenticate,
authorize("super_admin", "institute_admin", "accountant"),
async (req, res): Promise<void> => {
const { month } = req.query as Record<string, string>;

const user = getLoggedInUser(req);
const instituteId = getInstituteIdForUser(req);

const filter: any = {};

if (user.role !== "super_admin") {
  if (!instituteId) {
    res.status(403).json({
      error: "Your account is not linked to an institute",
    });
    return;
  }

  filter.instituteId = instituteId;
}

if (month) {
  filter.month = month;
}

const payments = await Payment.find(filter);

const totalRevenue = payments
  .filter((payment) => payment.status === "paid")
  .reduce(
    (sum, payment) => sum + payment.totalAmount,
    0
  );

const totalPending = payments
  .filter((payment) => payment.status === "pending")
  .reduce(
    (sum, payment) => sum + payment.totalAmount,
    0
  );

const totalOverdue = payments
  .filter((payment) => payment.status === "overdue")
  .reduce(
    (sum, payment) => sum + payment.totalAmount,
    0
  );

const total = payments.length || 1;
const paid = payments.filter(
  (payment) => payment.status === "paid"
).length;

res.json({
  totalRevenue,
  totalPending,
  totalOverdue,
  collectionRate: Math.round((paid / total) * 100),
  paymentsByStatus: {
    paid,
    pending: payments.filter(
      (payment) => payment.status === "pending"
    ).length,
    overdue: payments.filter(
      (payment) => payment.status === "overdue"
    ).length,
  },
});

}
);

export default router;