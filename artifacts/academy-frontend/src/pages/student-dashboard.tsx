import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  IndianRupee,
  ClipboardCheck,
  FileText,
  LogOut,
  BookOpen,
  CalendarDays,
  UserRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type StudentMe = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "student";
  instituteId: string;
  enrollmentNo?: string;
  courseId?: string;
  courseName?: string;
  batchId?: string;
  batchName?: string;
  academicYear?: string;
  className?: string;
  section?: string;
  board?: string;
  schoolName?: string;
  photoDataUrl?: string;
  fatherName?: string;
  motherName?: string;
};

type Payment = {
  id: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  lateFee: number;
  dueDate: string;
  paidDate?: string | null;
  status: "pending" | "paid" | "overdue" | "partial";
  month: string;
  monthLabel: string;
};

type Homework = {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  dueDate: string;
  status: string;
};

const inr = (v: unknown) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB");
};

export default function StudentDashboard() {
  const [, setLocation] = useLocation();

  const [student, setStudent] = useState<StudentMe | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [report, setReport] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const logout = () => {
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("coach_sutra_token") || "";

    if (!token) {
      setLocation("/login");
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const load = async () => {
      setLoading(true);
      setMessage("");

      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          headers,
        });

        const me = await meRes.json().catch(() => null);

        if (!meRes.ok || me?.role !== "student") {
          logout();
          return;
        }

        setStudent(me);

        const [feeRes, homeworkRes, reportRes] = await Promise.allSettled([
          fetch("/api/finance/my-payments", {
            credentials: "include",
            headers,
          }),
          fetch(`/api/homework?batchId=${me.batchId || ""}`, {
            credentials: "include",
            headers,
          }),
          fetch(
            `/api/report-card?studentId=${me.id}&month=${new Date()
              .toISOString()
              .slice(0, 7)}`,
            {
              credentials: "include",
              headers,
            }
          ),
        ]);

        if (feeRes.status === "fulfilled") {
          const data = await feeRes.value.json().catch(() => []);
          if (feeRes.value.ok) setPayments(Array.isArray(data) ? data : []);
        }

        if (homeworkRes.status === "fulfilled") {
          const data = await homeworkRes.value.json().catch(() => []);
          if (homeworkRes.value.ok) setHomework(Array.isArray(data) ? data : []);
        }

        if (reportRes.status === "fulfilled") {
          const data = await reportRes.value.json().catch(() => null);
          if (reportRes.value.ok) setReport(data);
        }
      } catch {
        setMessage("Student portal load nahi ho saka.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const feeSummary = useMemo(() => {
    const total = payments.reduce(
      (sum, p) => sum + Number(p.totalAmount ?? p.amount ?? 0),
      0
    );
    const paid = payments.reduce(
      (sum, p) => sum + Number(p.paidAmount ?? 0),
      0
    );
    const pending = Math.max(0, total - paid);
    const nextDue = payments.find(
      (p) => p.status === "pending" || p.status === "overdue"
    );

    return { total, paid, pending, nextDue };
  }, [payments]);

  const latestPayments = payments.slice(0, 5);
  const pendingHomework = homework.slice(0, 5);
  const latestResults = report?.examResults?.slice(0, 5) ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border bg-white px-6 py-4 text-sm shadow-sm">
          Loading student portal...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-blue-900 text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/15 p-2">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Student Portal</h1>
              <p className="text-xs text-blue-100">Second School Classes</p>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        {/* Hero */}
        <Card className="overflow-hidden border-blue-100 shadow-sm">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/30">
                    {student?.photoDataUrl ? (
                        <img
                        src={student.photoDataUrl}
                        alt={student.name}
                        className="h-full w-full object-cover"
                        />
                    ) : (
                        <UserRound className="h-9 w-9" />
                    )}
                </div>
                <div>
                  <p className="text-sm text-blue-100">Welcome back,</p>
                  <h2 className="text-2xl font-bold">{student?.name}</h2>
                  <p className="mt-1 text-xs text-blue-100">
                    Enrollment No: <b>{student?.enrollmentNo || "-"}</b>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
                <p className="text-blue-100">Enrollment No</p>
                <p className="font-semibold">{student?.enrollmentNo || "-"}</p>
            </div>
            </div>
          </div>
        </Card>

        {/* Profile details */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <InfoCard label="Class / Board" value={`${student?.className || "-"} ${student?.section ? `(${student.section})` : ""} ${student?.board ? `• ${student.board}` : ""}`} />
            <InfoCard label="Course / Batch" value={`${student?.courseName || "-"} ${student?.batchName ? `• ${student.batchName}` : ""}`} />
            <InfoCard label="School" value={student?.schoolName || "-"} />
            <InfoCard label="Academic Year" value={student?.academicYear || "-"} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="Total Fees"
            value={inr(feeSummary.total)}
            icon={<IndianRupee className="h-6 w-6" />}
            color="text-blue-700"
          />
          <StatCard
            title="Paid"
            value={inr(feeSummary.paid)}
            icon={<CheckCircle2 className="h-6 w-6" />}
            color="text-green-700"
          />
          <StatCard
            title="Pending"
            value={inr(feeSummary.pending)}
            icon={<AlertCircle className="h-6 w-6" />}
            color="text-red-600"
          />
          <StatCard
            title="Next Due"
            value={feeSummary.nextDue ? formatDate(feeSummary.nextDue.dueDate) : "-"}
            icon={<CalendarDays className="h-6 w-6" />}
            color="text-purple-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Fee table */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<IndianRupee className="h-5 w-5" />}
                title="Fee Status"
              />

              <div className="mt-4 space-y-2">
                {latestPayments.length ? (
                  latestPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{p.monthLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(p.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{inr(p.totalAmount)}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyText text="Fee records abhi available nahi hain." />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Homework */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                icon={<BookOpen className="h-5 w-5" />}
                title="Homework"
              />

              <div className="mt-4 space-y-2">
                {pendingHomework.length ? (
                  pendingHomework.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-medium">{h.title}</p>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(h.dueDate)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {h.subjectName || "Subject"} • {h.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyText text="No homework assigned." />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <SectionHeader
                icon={<FileText className="h-5 w-5" />}
                title="Latest Result"
              />

              <div className="mt-4 overflow-x-auto rounded-lg border">
                {latestResults.length ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Subject</th>
                        <th className="px-3 py-2 text-center">Total</th>
                        <th className="px-3 py-2 text-center">Obtained</th>
                        <th className="px-3 py-2 text-center">Grade</th>
                        <th className="px-3 py-2 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestResults.map((r: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2 font-medium">{r.subject}</td>
                          <td className="px-3 py-2 text-center">{r.totalMarks}</td>
                          <td className="px-3 py-2 text-center">
                            {r.marksObtained ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-center">{r.grade || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            {r.resultStatus || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6">
                    <EmptyText text="Result records abhi available nahi hain." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className={`mt-1 text-xl font-bold ${color}`}>{value}</h3>
        </div>
        <div className={`rounded-xl bg-slate-100 p-3 ${color}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-blue-100 p-2 text-blue-700">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-green-100 text-green-700"
      : status === "overdue"
        ? "bg-red-100 text-red-700"
        : status === "partial"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-700";

  return (
    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 whitespace-normal break-words text-sm font-semibold text-slate-900">
            {value}
        </p>
      </CardContent>
    </Card>
  );
}