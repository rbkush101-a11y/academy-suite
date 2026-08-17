function getToken() {
  return localStorage.getItem("coach_sutra_token") || "";
}

async function financeRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.error ||
        `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface FeeAssignment {
  id: string;
  instituteId: string;
  studentId: string;
  studentName: string | null;
  studentEnrollmentNo: string | null;
  feeStructureId: string;
  feeStructureName: string | null;
  admissionDate: string;
  feeCycleDay: number;
  monthlyAmount: number;
  scholarshipPercent: number;
  totalMonths: number;
  startMonth: string;
  endMonth: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface CreateFeeAssignmentInput {
  instituteId?: string;
  studentId: string;
  feeStructureId: string;
  admissionDate: string;
  totalMonths: number;
  scholarshipPercent: number;
}

export interface CreateFeeAssignmentResult {
  assignment: FeeAssignment;
  paymentsGenerated: number;
  firstDueDate: string;
  lastDueDate: string;
}

export interface Expense {
  id: string;
  instituteId: string;
  category:
    | "rent"
    | "electricity"
    | "internet"
    | "supplies"
    | "maintenance"
    | "marketing"
    | "salary"
    | "other";
  title: string;
  amount: number;
  date: string;
  paymentMethod: "cash" | "online" | "cheque" | "upi";
  vendor: string | null;
  invoiceNo: string | null;
  recurring: boolean;
  remarks: string | null;
  createdAt: string;
}

export interface CreateExpenseInput {
  instituteId?: string;
  category: Expense["category"];
  title: string;
  amount: number;
  date: string;
  paymentMethod: Expense["paymentMethod"];
  vendor?: string;
  invoiceNo?: string;
  recurring?: boolean;
  remarks?: string;
}

export const financeApi = {
  listAssignments(studentId?: string) {
    const query = studentId
      ? `?studentId=${encodeURIComponent(studentId)}`
      : "";

    return financeRequest<FeeAssignment[]>(
      `/finance/fee-assignments${query}`
    );
  },

  createAssignment(
  input: CreateFeeAssignmentInput
): Promise<CreateFeeAssignmentResult> {
  return financeRequest<CreateFeeAssignmentResult>(
    "/finance/fee-assignments",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
},

  deleteAssignment(id: string) {
    return financeRequest<void>(
      `/finance/fee-assignments/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  payPayment(
    id: string,
    input: {
      paymentMethod: "cash" | "online" | "cheque" | "upi";
      transactionId?: string;
      remarks?: string;
    }
  ) {
    return financeRequest<any>(`/finance/payments/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listOverduePayments() {
    return financeRequest<any[]>("/finance/overdue-students");
  },

  listExpenses() {
    return financeRequest<Expense[]>("/finance/expenses");
  },

  createExpense(input: CreateExpenseInput) {
    return financeRequest<Expense>("/finance/expenses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateExpense(id: string, input: Partial<CreateExpenseInput>) {
    return financeRequest<Expense>(`/finance/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteExpense(id: string) {
    return financeRequest<void>(`/finance/expenses/${id}`, {
      method: "DELETE",
    });
  },

  runOverdueCheck() {
    return financeRequest<{
      success: boolean;
      message: string;
      paymentUpdated: number;
      salaryUpdated: number;
    }>("/finance/run-overdue-check", {
      method: "POST",
    });
  },
};