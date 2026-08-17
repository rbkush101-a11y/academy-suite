import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  TrendingUp,
  CalendarDays,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  ArrowUpDown,
  Receipt,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-react";
import { MonthNav } from "@/components/month-nav";
import {
  financeApi,
  type Expense,
  type CreateExpenseInput,
} from "../lib/finance-api";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "electricity", label: "Electricity" },
  { value: "internet", label: "Internet" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "marketing", label: "Marketing" },
  { value: "salary", label: "Salary" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
];

const CATEGORY_COLOR: Record<string, string> = {
  rent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  electricity:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  internet: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  supplies:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  maintenance:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  salary:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const todayStr = () => new Date().toISOString().split("T")[0] ?? "";

const emptyForm = () => ({
  category: "other",
  title: "",
  amount: "",
  date: todayStr(),
  paymentMethod: "cash",
  vendor: "",
  invoiceNo: "",
  recurring: false,
  remarks: "",
});

const inr = (value: unknown) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DailyExpense() {
  const queryClient = useQueryClient();

  /* ---------------- toast ---------------- */
  const [toasts, setToasts] = useState<
    { id: number; type: "success" | "error"; text: string }[]
  >([]);

  const notify = (type: "success" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((old) => [...old, { id, type, text }]);
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 3200);
  };

  /* ---------------- filters ---------------- */
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* ---------------- dialogs ---------------- */
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  /* ---------------- form ---------------- */
  const [expenseForm, setExpenseForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------------- copy state ---------------- */
  const [copying, setCopying] = useState(false);

  /* ---------------- month helpers ---------------- */
  const now = new Date();

  const [selectedYear, selectedMonthNumber] = /^\d{4}-\d{2}$/.test(
    selectedMonth
  )
    ? selectedMonth.split("-")
    : [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];

  const safeMonth = `${selectedYear}-${selectedMonthNumber}`;
  const monthFrom = `${safeMonth}-01`;
  const monthTo =
    new Date(Number(selectedYear), Number(selectedMonthNumber), 0)
      .toISOString()
      .split("T")[0] ?? "";

  const monthLabel = new Date(
    Number(selectedYear),
    Number(selectedMonthNumber) - 1,
    1
  ).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const shiftMonth = (step: number) => {
    const next = new Date(
      Number(selectedYear),
      Number(selectedMonthNumber) - 1 + step,
      1
    );
    setSelectedMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const isCurrentMonth = safeMonth === now.toISOString().slice(0, 7);

  /* ---------------- queries ---------------- */
  const { data: summary } = useQuery({
    queryKey: ["finance-summary", safeMonth],
    queryFn: async () => {
      const response = await fetch(`/api/finance/summary?month=${safeMonth}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("coach_sutra_token") || ""
          }`,
        },
      });
      if (!response.ok) throw new Error("Unable to load summary");
      return response.json();
    },
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<
    Expense[],
    Error
  >({
    queryKey: ["finance-expenses", safeMonth],
    queryFn: async () => {
      const token = localStorage.getItem("coach_sutra_token") || "";
      const response = await fetch(
        `/api/finance/expenses?from=${monthFrom}&to=${monthTo}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to load expenses");
      }
      return response.json();
    },
  });

  /* ---------------- mutations ---------------- */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
  };

  const createExpenseMutation = useMutation<Expense, Error, CreateExpenseInput>(
    {
      mutationFn: (input) => financeApi.createExpense(input),
      onSuccess: () => {
        invalidate();
        setExpenseDialogOpen(false);
        setEditingExpense(null);
        setExpenseForm(emptyForm());
        setErrors({});
        notify("success", "Expense add ho gaya");
      },
      onError: (error) =>
        notify("error", error.message || "Expense save nahi ho saka."),
    }
  );

  const updateExpenseMutation = useMutation<
    Expense,
    Error,
    { id: string; data: Partial<CreateExpenseInput> }
  >({
    mutationFn: ({ id, data }) => financeApi.updateExpense(id, data),
    onSuccess: () => {
      invalidate();
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      setExpenseForm(emptyForm());
      setErrors({});
      notify("success", "Expense update ho gaya");
    },
    onError: (error) =>
      notify("error", error.message || "Expense update nahi ho saka."),
  });

  const deleteExpenseMutation = useMutation<void, Error, string>({
    mutationFn: (id) => financeApi.deleteExpense(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      notify("success", "Expense delete ho gaya");
    },
    onError: (error) => {
      setDeleteTarget(null);
      notify("error", error.message || "Expense delete nahi ho saka.");
    },
  });

  const isSaving =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  /* ---------------- dialog actions ---------------- */
  const openAddDialog = () => {
    setEditingExpense(null);
    setErrors({});

    // Current month khula hai to AAJ ki date, warna us month ki 1 tareekh
    const defaultDate = isCurrentMonth ? todayStr() : `${safeMonth}-01`;

    setExpenseForm({ ...emptyForm(), date: defaultDate });
    setExpenseDialogOpen(true);
  };

  const openEditDialog = (expense: any) => {
    setEditingExpense(expense);
    setErrors({});
    setExpenseForm({
      category: expense.category ?? "other",
      title: expense.title ?? "",
      amount: String(expense.amount ?? ""),
      date: expense.date ?? todayStr(),
      paymentMethod: expense.paymentMethod ?? "cash",
      vendor: expense.vendor ?? "",
      invoiceNo: expense.invoiceNo ?? "",
      recurring: Boolean(expense.recurring),
      remarks: expense.remarks ?? "",
    });
    setExpenseDialogOpen(true);
  };

  const duplicateExpense = (expense: any) => {
    setEditingExpense(null);
    setErrors({});
    setExpenseForm({
      category: expense.category ?? "other",
      title: expense.title ?? "",
      amount: String(expense.amount ?? ""),
      date: isCurrentMonth ? todayStr() : `${safeMonth}-01`,
      paymentMethod: expense.paymentMethod ?? "cash",
      vendor: expense.vendor ?? "",
      invoiceNo: "",
      recurring: Boolean(expense.recurring),
      remarks: expense.remarks ?? "",
    });
    setExpenseDialogOpen(true);
    notify("success", "Copy ban gayi — date check karke save karo");
  };

  const handleSaveExpense = () => {
    const next: Record<string, string> = {};
    if (!expenseForm.title.trim()) next.title = "Title likhna zaroori hai";
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0)
      next.amount = "Amount 0 se bada hona chahiye";
    if (!expenseForm.date) next.date = "Date select karo";

    setErrors(next);
    if (Object.keys(next).length) {
      notify("error", "Kuch fields galat hain — neeche dekho");
      return;
    }

    const payload: CreateExpenseInput = {
      category: expenseForm.category as CreateExpenseInput["category"],
      title: expenseForm.title.trim(),
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      paymentMethod:
        expenseForm.paymentMethod as CreateExpenseInput["paymentMethod"],
      vendor: expenseForm.vendor.trim() || undefined,
      invoiceNo: expenseForm.invoiceNo.trim() || undefined,
      recurring: expenseForm.recurring,
      remarks: expenseForm.remarks.trim() || undefined,
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: payload });
      return;
    }
    createExpenseMutation.mutate(payload);
  };

  /* Ctrl + Enter se save */
  useEffect(() => {
    if (!expenseDialogOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleSaveExpense();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------- derived data ---------------- */
  const list = (expenses ?? []) as any[];

  const fixedList = useMemo(
    () => list.filter((e) => Boolean(e.recurring)),
    [list]
  );

  const fixedTotal = fixedList.reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0
  );

  const filteredExpenses = useMemo(() => {
    const text = expenseSearch.trim().toLowerCase();

    const result = list.filter((expense) => {
      if (categoryFilter === "__fixed") {
        if (!expense.recurring) return false;
      } else if (
        categoryFilter !== "all" &&
        expense.category !== categoryFilter
      ) {
        return false;
      }

      if (!text) return true;
      return [
        expense.title,
        expense.category,
        expense.paymentMethod,
        expense.vendor,
        expense.invoiceNo,
        expense.amount,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(text));
    });

    return result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "amount")
        return (Number(a.amount ?? 0) - Number(b.amount ?? 0)) * dir;
      return (
        (new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()) *
        dir
      );
    });
  }, [list, expenseSearch, categoryFilter, sortBy, sortDir]);

  const filteredTotal = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0
  );

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    list.forEach((e) => {
      const key = String(e.category ?? "other");
      map[key] = (map[key] ?? 0) + Number(e.amount ?? 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0] : null;
  }, [list]);

  const toggleSort = (field: "date" | "amount") => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("desc");
  };

  /* ---------------- copy last month ---------------- */
  const copyLastMonthFixed = async () => {
    const prev = new Date(
      Number(selectedYear),
      Number(selectedMonthNumber) - 2,
      1
    );
    const pm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const pmFrom = `${pm}-01`;
    const pmTo =
      new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0] ?? "";

    setCopying(true);
    try {
      const token = localStorage.getItem("coach_sutra_token") || "";
      const response = await fetch(
        `/api/finance/expenses?from=${pmFrom}&to=${pmTo}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = (await response.json().catch(() => [])) as any[];
      const items = (data ?? []).filter((e) => Boolean(e.recurring));

      if (!items.length) {
        notify("error", "Pichle month me koi fixed kharcha nahi mila");
        return;
      }

      const already = new Set(
        fixedList.map((e) => String(e.title ?? "").trim().toLowerCase())
      );

      const pending = items.filter(
        (e) => !already.has(String(e.title ?? "").trim().toLowerCase())
      );

      if (!pending.length) {
        notify("error", "Sab fixed kharche pehle se add hain");
        return;
      }

      for (const item of pending) {
        const day = String(item.date ?? "").slice(8, 10) || "01";
        await financeApi.createExpense({
          category: item.category,
          title: item.title,
          amount: Number(item.amount ?? 0),
          date: `${safeMonth}-${day}`,
          paymentMethod: item.paymentMethod,
          vendor: item.vendor || undefined,
          recurring: true,
          remarks: item.remarks || undefined,
        } as CreateExpenseInput);
      }

      invalidate();
      notify("success", `${pending.length} fixed kharche add ho gaye`);
    } catch {
      notify("error", "Copy nahi ho saka");
    } finally {
      setCopying(false);
    }
  };

  /* ---------------- helpers ---------------- */
  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "-";

  const setField = (key: string, value: any) => {
    setExpenseForm((current) => ({ ...current, [key]: value }));
    setErrors((old) => ({ ...old, [key]: "" }));
  };

  /* ---------------- export ---------------- */
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const buildRows = () =>
    filteredExpenses
      .map(
        (e) => `
        <tr>
          <td>${escapeHtml(formatDate(e.date))}</td>
          <td>${escapeHtml(e.title)}</td>
          <td style="text-transform:capitalize">${escapeHtml(e.category)}</td>
          <td class="num">${Number(e.amount ?? 0).toLocaleString("en-IN")}</td>
          <td style="text-transform:capitalize">${escapeHtml(
            e.paymentMethod
          )}</td>
          <td>${escapeHtml(e.vendor || "-")}</td>
          <td>${escapeHtml(e.invoiceNo || "-")}</td>
          <td>${e.recurring ? "Har Month" : "One Time"}</td>
          <td>${escapeHtml(e.remarks || "-")}</td>
        </tr>`
      )
      .join("");

  const exportExcel = () => {
    if (!filteredExpenses.length) {
      notify("error", "Export karne ke liye koi data nahi hai");
      return;
    }

    const html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #94a3b8; padding: 6px 10px; font-size: 12px; font-family: Arial; }
            th { background: #0f172a; color: #ffffff; font-weight: bold; }
            .num { mso-number-format: "\\#\\,\\#\\#0"; text-align: right; }
            .title { font-size: 16px; font-weight: bold; }
            tfoot td { background: #e2e8f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="9" class="title">Second School Classes — Expense Report</td></tr>
            <tr><td colspan="9">Month: ${monthLabel}</td></tr>
            <tr><td colspan="9"></td></tr>
          </table>

          <table>
            <thead>
              <tr>
                <th>Date</th><th>Title</th><th>Category</th><th>Amount</th>
                <th>Payment Method</th><th>Vendor</th><th>Invoice No</th>
                <th>Type</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${buildRows()}</tbody>
            <tfoot>
              <tr>
                <td colspan="3">TOTAL (${filteredExpenses.length} entries)</td>
                <td class="num">${filteredTotal.toLocaleString("en-IN")}</td>
                <td colspan="5"></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>`;

    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Expense-Report-${safeMonth}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    notify("success", "Excel file download ho gayi");
  };

  const exportPdf = () => {
    if (!filteredExpenses.length) {
      notify("error", "Print karne ke liye koi data nahi hai");
      return;
    }

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) {
      notify("error", "Popup block ho gaya — allow karke dobara try karo");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Expense Report - ${monthLabel}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            .head { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
            .head h1 { margin: 0; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; }
            .head p { margin: 4px 0 0; font-size: 12px; color: #475569; }
            .cards { display: flex; gap: 10px; margin-bottom: 14px; }
            .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
            .card span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; }
            .card b { font-size: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left; }
            th { background: #0f172a; color: #ffffff; }
            tr:nth-child(even) td { background: #f8fafc; }
            .num { text-align: right; font-weight: bold; }
            tfoot td { background: #e2e8f0; font-weight: bold; font-size: 12px; }
            .sign { display: flex; justify-content: space-between; margin-top: 45px; font-size: 11px; }
            .sign div { border-top: 1.5px solid #0f172a; padding-top: 5px; width: 30%; text-align: center; }
            .foot { margin-top: 18px; font-size: 9px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="head">
            <h1>Second School Classes</h1>
            <p>Expense Report — <b>${monthLabel}</b></p>
          </div>

          <div class="cards">
            <div class="card"><span>Total Expenses</span><b>Rs ${filteredTotal.toLocaleString(
              "en-IN"
            )}</b></div>
            <div class="card"><span>Total Entries</span><b>${
              filteredExpenses.length
            }</b></div>
            <div class="card"><span>Har Month Fixed</span><b>Rs ${fixedTotal.toLocaleString(
              "en-IN"
            )}</b></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th><th>Title</th><th>Category</th><th>Amount</th>
                <th>Method</th><th>Vendor</th><th>Invoice</th>
                <th>Type</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${buildRows()}</tbody>
            <tfoot>
              <tr>
                <td colspan="3">TOTAL (${filteredExpenses.length} entries)</td>
                <td class="num">Rs ${filteredTotal.toLocaleString("en-IN")}</td>
                <td colspan="5"></td>
              </tr>
            </tfoot>
          </table>

          <div class="sign">
            <div>Prepared By</div>
            <div>Checked By</div>
            <div>Director Signature</div>
          </div>

          <div class="foot">
            Generated on ${new Date().toLocaleString("en-GB")}
          </div>
        </body>
      </html>`);

    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    notify("success", "Print window khul gayi — 'Save as PDF' chuno");
  };

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* ---------- Toasts ---------- */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${
              t.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{t.text}</span>
            <button
              onClick={() =>
                setToasts((old) => old.filter((x) => x.id !== t.id))
              }
            >
              <X className="h-3.5 w-3.5 opacity-60" />
            </button>
          </div>
        ))}
      </div>

      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Expense</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Coaching ka har kharcha yahan add karo. Month badal kar purana
              record bhi dekh sakte ho.
            </p>
          </div>

          <MonthNav value={safeMonth} onChange={setSelectedMonth} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copyLastMonthFixed}
            disabled={copying}
            title="Pichle month ke har-month wale kharche copy karo"
          >
            <Repeat className="mr-2 h-4 w-4" />
            {copying ? "Copy ho raha..." : "Pichle Month Se Copy"}
          </Button>

          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>

          <Button variant="outline" onClick={exportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>

          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* ---------- Summary cards ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Expenses"
          value={inr((summary as any)?.totalExpenses ?? filteredTotal)}
          hint={`${monthLabel} ka kharcha`}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="text-red-600"
          bg="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        />
        <SummaryCard
          label="Net Income"
          value={inr((summary as any)?.netIncome ?? 0)}
          hint="Revenue - Expenses"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="text-green-600"
          bg="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        />
        <SummaryCard
          label="Total Entries"
          value={String(list.length)}
          hint="Is month ki entries"
          icon={<Receipt className="h-5 w-5" />}
          tone="text-blue-600"
          bg="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <SummaryCard
          label="Highest Category"
          value={topCategory ? String(topCategory[0]).replace("-", " ") : "-"}
          hint={topCategory ? inr(topCategory[1]) : "Koi data nahi"}
          icon={<Wallet className="h-5 w-5" />}
          tone="text-purple-600 capitalize"
          bg="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <SummaryCard
          label="Har Month Ka Fixed"
          value={inr(fixedTotal)}
          hint={`${fixedList.length} fixed kharche`}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="text-indigo-600"
          bg="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
        />
      </div>

      {/* ---------- Table ---------- */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 space-y-3 border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold">Expense List</div>
                <p className="text-xs text-muted-foreground">
                  {filteredExpenses.length} entries • Total {inr(filteredTotal)}
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Title, vendor, amount se dhoondho..."
                  className="h-10 w-full pl-9"
                  value={expenseSearch}
                  onChange={(event) => setExpenseSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={categoryFilter === "all" ? "default" : "outline"}
                onClick={() => setCategoryFilter("all")}
                className="h-8"
              >
                All ({list.length})
              </Button>

              {fixedList.length ? (
                <Button
                  size="sm"
                  variant={categoryFilter === "__fixed" ? "default" : "outline"}
                  onClick={() =>
                    setCategoryFilter(
                      categoryFilter === "__fixed" ? "all" : "__fixed"
                    )
                  }
                  className="h-8"
                >
                  <Repeat className="mr-1 h-3 w-3" />
                  Har Month ({fixedList.length})
                </Button>
              ) : null}

              {CATEGORIES.map((c) => {
                const count = list.filter((e) => e.category === c.value).length;
                if (!count) return null;
                return (
                  <Button
                    key={c.value}
                    size="sm"
                    variant={categoryFilter === c.value ? "default" : "outline"}
                    onClick={() => setCategoryFilter(c.value)}
                    className="h-8"
                  >
                    {c.label} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-medium hover:text-primary"
                      onClick={() => toggleSort("amount")}
                    >
                      Amount <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-medium hover:text-primary"
                      onClick={() => toggleSort("date")}
                    >
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingExpenses ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium">
                        {list.length
                          ? "Is filter me kuch nahi mila"
                          : `${monthLabel} me koi expense nahi hai`}
                      </p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        {list.length
                          ? "Search ya category filter hata kar dekho."
                          : "Pehla kharcha add karke shuru karo."}
                      </p>
                      {list.length ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpenseSearch("");
                            setCategoryFilter("all");
                          }}
                        >
                          Filter Clear Karo
                        </Button>
                      ) : (
                        <Button size="sm" onClick={openAddDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Expense
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {expense.title}
                        </div>
                        {expense.invoiceNo ? (
                          <div className="text-[11px] text-muted-foreground">
                            Inv: {expense.invoiceNo}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            CATEGORY_COLOR[String(expense.category)] ??
                            CATEGORY_COLOR.other
                          }`}
                        >
                          {String(expense.category ?? "").replace("-", " ")}
                        </span>
                      </TableCell>

                      <TableCell className="font-semibold">
                        {inr(expense.amount)}
                      </TableCell>

                      <TableCell>{formatDate(expense.date)}</TableCell>

                      <TableCell className="capitalize">
                        {expense.paymentMethod}
                      </TableCell>

                      <TableCell>{expense.vendor || "-"}</TableCell>

                      <TableCell>
                        {expense.recurring ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <Repeat className="h-3 w-3" />
                            Har Month
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            One Time
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Duplicate"
                            onClick={() => duplicateExpense(expense)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Edit"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete"
                            onClick={() => setDeleteTarget(expense)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {filteredExpenses.length ? (
                <TableFooter>
                  <TableRow className="bg-muted/60 font-bold">
                    <TableCell colSpan={2}>
                      Total ({filteredExpenses.length} entries)
                    </TableCell>
                    <TableCell className="text-red-600">
                      {inr(filteredTotal)}
                    </TableCell>
                    <TableCell colSpan={5} />
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Add / Edit dialog ---------- */}
      <Dialog
        open={expenseDialogOpen}
        onOpenChange={(open) => {
          setExpenseDialogOpen(open);
          if (!open) setErrors({});
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">*</span> wale fields zaroori hain.
              Save karne ke liye <b>Ctrl + Enter</b> bhi daba sakte ho.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <Input
                autoFocus
                placeholder="Example: June Electricity Bill"
                value={expenseForm.title}
                onChange={(e) => setField("title", e.target.value)}
                className={errors.title ? "border-red-500" : ""}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={expenseForm.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Amount" required error={errors.amount}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={expenseForm.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    className={`pl-7 ${errors.amount ? "border-red-500" : ""}`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date" required error={errors.date}>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className={errors.date ? "border-red-500" : ""}
                />

                <div className="mt-1.5 flex gap-1.5">
                  {[
                    { label: "Aaj", value: todayStr() },
                    {
                      label: "Kal",
                      value:
                        new Date(Date.now() - 86400000)
                          .toISOString()
                          .split("T")[0] ?? "",
                    },
                    { label: "1 Tareekh", value: `${safeMonth}-01` },
                  ].map((q) => (
                    <Button
                      key={q.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setField("date", q.value)}
                    >
                      {q.label}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field label="Payment Method" required>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setField("paymentMethod", e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Vendor / Paid To">
                <Input
                  placeholder="Optional"
                  value={expenseForm.vendor}
                  onChange={(e) => setField("vendor", e.target.value)}
                />
              </Field>

              <Field label="Invoice / Bill No">
                <Input
                  placeholder="Optional"
                  value={expenseForm.invoiceNo}
                  onChange={(e) => setField("invoiceNo", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Remarks">
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Koi extra note (optional)"
                value={expenseForm.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={expenseForm.recurring}
                onChange={(e) => setField("recurring", e.target.checked)}
              />
              <span className="text-sm">
                <b className="flex items-center gap-1.5">
                  <Repeat className="h-4 w-4" />
                  Ye kharcha har month aata hai
                </b>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Jaise — Rent, Salary, Internet, Bijli ka bill. Tick karoge to
                  agle month ek click me copy ho jayega.
                </span>
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setExpenseDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveExpense}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingExpense
                    ? "Update Expense"
                    : "Save Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete confirm ---------- */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Expense?
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-semibold">{deleteTarget?.title}</div>
            <div className="mt-1 text-muted-foreground">
              {inr(deleteTarget?.amount)} • {formatDate(deleteTarget?.date)}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Ye entry permanently delete ho jayegi. Wapas nahi aayegi.
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteExpenseMutation.isPending}
              onClick={() => deleteExpenseMutation.mutate(deleteTarget.id)}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
  bg,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex min-h-[84px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {label}
            </p>
            <h3 className={`truncate text-xl font-bold ${tone}`}>{value}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {hint}
            </p>
          </div>
          <div className={`shrink-0 rounded-xl p-3 ${bg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}