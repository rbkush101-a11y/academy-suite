import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdmissionsQueryKey,
  useListAdmissions,
  useListCourses,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Filter,
  Flame,
  GraduationCap,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus2,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PIPELINE = [
  { value: "new", label: "New", icon: UserPlus2 },
  { value: "contacted", label: "Contacted", icon: Phone },
  { value: "visited", label: "Visited", icon: UserCheck },
  { value: "enrolled", label: "Enrolled", icon: GraduationCap },
  { value: "dropped", label: "Dropped", icon: CircleAlert },
] as const;

type LeadStatus = (typeof PIPELINE)[number]["value"];
type EnquiryType = "academic" | "computer";

type Lead = {
  id: string;
  enquiryType?: EnquiryType;
  studentName: string;
  parentName?: string | null;
  phone: string;
  email?: string | null;
  className?: string | null;
  board?: string | null;
  courseInterest?: string | null;
  source?: string | null;
  status: LeadStatus;
  followUpDate?: string | null;
  enquiryDate?: string | null;
  enquiryDay?: string | null;
  remarks?: string | null;
  createdAt?: string;
};

type LeadForm = {
  enquiryType: EnquiryType;
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  className: string;
  board: string;
  courseInterest: string;
  source: string;
  enquiryDate: string;
  followUpDate: string;
  remarks: string;
};

const SOURCE_OPTIONS = [
  { value: "walk-in", label: "Walk In" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social-media", label: "Social Media" },
  { value: "other", label: "Other" },
];

const CLASS_OPTIONS = ["NURSERY", "L.K.G", "U.K.G", ...Array.from({ length: 12 }, (_, index) => String(index + 1))];
const BOARD_OPTIONS = ["CBSE", "ICSE", "UP Board", "Other"];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultForm(type: EnquiryType = "academic"): LeadForm {
  return {
    enquiryType: type,
    studentName: "",
    parentName: "",
    phone: "",
    email: "",
    className: "",
    board: "",
    courseInterest: "",
    source: "walk-in",
    enquiryDate: localDateString(),
    followUpDate: "",
    remarks: "",
  };
}

function getAuthHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  const branchId = localStorage.getItem("active_branch_id") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(branchId ? { "x-branch-id": branchId } : {}),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`).getTime();
  const toDate = new Date(`${to}T00:00:00`).getTime();
  return Math.round((toDate - fromDate) / 86_400_000);
}

function sourceLabel(value?: string | null) {
  return SOURCE_OPTIONS.find((item) => item.value === value)?.label ?? (value || "Unknown");
}

function statusStyles(status: LeadStatus) {
  const styles: Record<LeadStatus, string> = {
    new: "border-blue-200 bg-blue-50 text-blue-700",
    contacted: "border-amber-200 bg-amber-50 text-amber-700",
    visited: "border-violet-200 bg-violet-50 text-violet-700",
    enrolled: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dropped: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return styles[status];
}

function safeWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function Admissions() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? "").get("type");
  const pageType: EnquiryType | null = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;

  const { data, isLoading } = useListAdmissions();
  const { data: courses } = useListCourses();
  const leads = ((data ?? []) as unknown as Lead[]).filter((lead) => !pageType || (lead.enquiryType ?? "academic") === pageType);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [source, setSource] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EnquiryType>(pageType ?? "all");
  const [followUpFilter, setFollowUpFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(defaultForm(pageType ?? "academic"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const today = localDateString();
  const computerCourses = ((courses ?? []) as any[]).filter(
    (course) => (course.courseType ?? "academic") === "computer" && course.status === "active",
  );

  const metrics = useMemo(() => {
    const openLeads = leads.filter((lead) => !["enrolled", "dropped"].includes(lead.status));
    const enrolled = leads.filter((lead) => lead.status === "enrolled").length;
    const followUpsToday = openLeads.filter((lead) => lead.followUpDate === today).length;
    const overdue = openLeads.filter((lead) => Boolean(lead.followUpDate) && String(lead.followUpDate) < today).length;
    const conversionRate = leads.length > 0 ? (enrolled / leads.length) * 100 : 0;
    return { openLeads: openLeads.length, enrolled, followUpsToday, overdue, conversionRate };
  }, [leads, today]);

  const pipelineCounts = useMemo(
    () => Object.fromEntries(PIPELINE.map((item) => [item.value, leads.filter((lead) => lead.status === item.value).length])) as Record<LeadStatus, number>,
    [leads],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (status !== "all" && lead.status !== status) return false;
        if (source !== "all" && lead.source !== source) return false;
        if (typeFilter !== "all" && (lead.enquiryType ?? "academic") !== typeFilter) return false;

        const activeLead = !["enrolled", "dropped"].includes(lead.status);
        if (followUpFilter === "today" && (!activeLead || lead.followUpDate !== today)) return false;
        if (followUpFilter === "overdue" && (!activeLead || !lead.followUpDate || lead.followUpDate >= today)) return false;
        if (followUpFilter === "upcoming" && (!activeLead || !lead.followUpDate || lead.followUpDate <= today)) return false;

        if (!term) return true;
        const haystack = [
          lead.studentName,
          lead.parentName,
          lead.phone,
          lead.email,
          lead.className,
          lead.board,
          lead.courseInterest,
          lead.remarks,
          sourceLabel(lead.source),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const aOverdue = a.followUpDate && a.followUpDate < today && !["enrolled", "dropped"].includes(a.status) ? 1 : 0;
        const bOverdue = b.followUpDate && b.followUpDate < today && !["enrolled", "dropped"].includes(b.status) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        if (a.followUpDate && b.followUpDate && a.followUpDate !== b.followUpDate) return a.followUpDate.localeCompare(b.followUpDate);
        return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
      });
  }, [leads, search, status, source, typeFilter, followUpFilter, today]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getListAdmissionsQueryKey() });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm(pageType ?? (typeFilter === "all" ? "academic" : typeFilter)));
    setMessage("");
    setOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      enquiryType: lead.enquiryType ?? "academic",
      studentName: lead.studentName ?? "",
      parentName: lead.parentName ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      className: lead.className ?? "",
      board: lead.board ?? "",
      courseInterest: lead.courseInterest ?? "",
      source: lead.source ?? "walk-in",
      enquiryDate: lead.enquiryDate ?? (String(lead.createdAt ?? "").slice(0, 10) || today),
      followUpDate: lead.followUpDate ?? "",
      remarks: lead.remarks ?? "",
    });
    setMessage("");
    setOpen(true);
  };

  const errorText = async (response: Response) => {
    try {
      const result = await response.json();
      return result?.error || result?.message || "Please check the details and try again.";
    } catch {
      return "Please check the details and try again.";
    }
  };

  const saveLead = async () => {
    setMessage("");
    if (form.studentName.trim().length < 2) return setMessage("Student name is required.");
    if (form.phone.replace(/\D/g, "").length < 10) return setMessage("Enter a valid contact number.");
    if (form.enquiryType === "academic" && (!form.className || !form.board)) return setMessage("Academic enquiry requires class and board.");
    if (form.enquiryType === "computer" && !form.courseInterest) return setMessage("Computer enquiry requires a course.");

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/admissions/${editing.id}` : "/api/admissions", {
        method: editing ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...form,
          studentName: form.studentName.trim(),
          parentName: form.parentName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          className: form.enquiryType === "academic" ? form.className : "",
          board: form.enquiryType === "academic" ? form.board : "",
          courseInterest: form.enquiryType === "computer" ? form.courseInterest : "",
          followUpDate: form.followUpDate || undefined,
          remarks: form.remarks.trim(),
        }),
      });
      if (!response.ok) {
        setMessage(await errorText(response));
        return;
      }
      await refresh();
      setOpen(false);
      setEditing(null);
    } catch {
      setMessage("Could not connect to the server. Please check the backend.");
    } finally {
      setSaving(false);
    }
  };

  const patchLead = async (id: string, patch: Record<string, unknown>) => {
    setMessage("");
    try {
      const response = await fetch(`/api/admissions/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        setMessage(await errorText(response));
        return false;
      }
      await refresh();
      return true;
    } catch {
      setMessage("Could not update the enquiry. Please check the backend.");
      return false;
    }
  };

  const deleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete enquiry for ${lead.studentName}? This cannot be undone.`)) return;
    setDeletingId(lead.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admissions/${lead.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setMessage(await errorText(response));
        return;
      }
      await refresh();
    } catch {
      setMessage("Could not delete the enquiry. Please check the backend.");
    } finally {
      setDeletingId(null);
    }
  };

  const convertToStudent = (lead: Lead) => {
    const params = new URLSearchParams({
      admit: "true",
      leadId: lead.id,
      leadName: lead.studentName,
      leadPhone: lead.phone,
      leadEmail: lead.email ?? "",
      parentName: lead.parentName ?? "",
      className: lead.className ?? "",
      board: lead.board ?? "",
      category: lead.enquiryType ?? "academic",
    });
    navigate(`/students?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSource("all");
    setFollowUpFilter("all");
    setTypeFilter(pageType ?? "all");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 px-5 py-6 text-white shadow-[0_22px_70px_-38px_rgba(15,23,42,0.65)] sm:px-7 lg:px-8">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.7fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Admissions CRM
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Turn every enquiry into a clear next action.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Track new leads, follow-ups, visits and conversions without losing context between calls or counsellors.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <HeroPill icon={Users2} label={`${metrics.openLeads} open leads`} />
              <HeroPill icon={CalendarClock} label={`${metrics.followUpsToday} follow-ups today`} />
              <HeroPill icon={TrendingUp} label={`${metrics.conversionRate.toFixed(0)}% conversion`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Enrolled" value={String(metrics.enrolled)} icon={CheckCircle2} />
            <HeroStat label="Overdue" value={String(metrics.overdue)} icon={Flame} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {PIPELINE.map((item) => {
          const Icon = item.icon;
          const active = status === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(active ? "all" : item.value)}
              className={`group rounded-2xl border p-4 text-left transition-all ${active ? "border-slate-900 bg-slate-950 text-white shadow-lg" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-white/10" : "bg-slate-100 text-slate-700"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`text-2xl font-black ${active ? "text-white" : "text-slate-950"}`}>{pipelineCounts[item.value]}</span>
              </div>
              <div className={`mt-3 text-sm font-bold ${active ? "text-slate-100" : "text-slate-800"}`}>{item.label}</div>
              <div className={`mt-1 text-xs ${active ? "text-slate-400" : "text-slate-500"}`}>Click to filter pipeline</div>
            </button>
          );
        })}
      </section>

      {message ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</div>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Lead workspace</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Enquiry pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">{filtered.length} of {leads.length} enquiries visible</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setFollowUpFilter(followUpFilter === "today" ? "all" : "today")}>
                <CalendarClock className="mr-2 h-4 w-4" /> Today ({metrics.followUpsToday})
              </Button>
              <Button variant="outline" onClick={() => setFollowUpFilter(followUpFilter === "overdue" ? "all" : "overdue")}>
                <Flame className="mr-2 h-4 w-4" /> Overdue ({metrics.overdue})
              </Button>
              <Button onClick={openCreate} className="bg-slate-950 hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" /> New Enquiry
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, parent, course..."
                className="pl-9"
              />
            </div>
            {!pageType ? (
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="computer">Computer</SelectItem>
                </SelectContent>
              </Select>
            ) : <div className="hidden lg:block" />}
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={followUpFilter} onValueChange={(value) => setFollowUpFilter(value as typeof followUpFilter)}>
              <SelectTrigger><SelectValue placeholder="Follow-up" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Follow-ups</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
              <Filter className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading enquiries...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Search className="h-6 w-6" /></div>
              <h3 className="mt-4 text-base font-black text-slate-900">No enquiries match these filters</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">Reset filters or add a new enquiry to start the admissions pipeline.</p>
              <Button className="mt-4 bg-slate-950 hover:bg-slate-800" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Enquiry</Button>
            </div>
          ) : filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              today={today}
              deleting={deletingId === lead.id}
              onEdit={() => openEdit(lead)}
              onDelete={() => deleteLead(lead)}
              onStatus={(nextStatus) => patchLead(lead.id, { status: nextStatus })}
              onFollowUp={(date) => patchLead(lead.id, { followUpDate: date || null })}
              onConvert={() => convertToStudent(lead)}
            />
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editing ? "Update enquiry" : "Create new enquiry"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Lead type</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["academic", "computer"] as EnquiryType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={Boolean(pageType)}
                    onClick={() => setForm((old) => ({ ...old, enquiryType: type, className: "", board: "", courseInterest: "" }))}
                    className={`rounded-xl border px-4 py-3 text-left transition ${form.enquiryType === type ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                  >
                    <div className="text-sm font-black capitalize">{type} enquiry</div>
                    <div className={`mt-1 text-xs ${form.enquiryType === type ? "text-slate-300" : "text-slate-500"}`}>{type === "academic" ? "School classes & board" : "Computer / skill courses"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student name" required><Input value={form.studentName} onChange={(event) => setForm((old) => ({ ...old, studentName: event.target.value }))} placeholder="Full name" /></Field>
              <Field label="Parent / guardian"><Input value={form.parentName} onChange={(event) => setForm((old) => ({ ...old, parentName: event.target.value }))} placeholder="Parent name" /></Field>
              <Field label="Phone number" required><Input value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} inputMode="tel" placeholder="9876543210" /></Field>
              <Field label="Email"><Input value={form.email} onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))} type="email" placeholder="student@email.com" /></Field>
            </div>

            {form.enquiryType === "academic" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Class" required>
                  <Select value={form.className} onValueChange={(value) => setForm((old) => ({ ...old, className: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{CLASS_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Board" required>
                  <Select value={form.board} onValueChange={(value) => setForm((old) => ({ ...old, board: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                    <SelectContent>{BOARD_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            ) : (
              <Field label="Course interest" required>
                <Select value={form.courseInterest} onValueChange={(value) => setForm((old) => ({ ...old, courseInterest: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select computer course" /></SelectTrigger>
                  <SelectContent>
                    {computerCourses.length === 0 ? <SelectItem value="__none" disabled>No active computer courses found</SelectItem> : null}
                    {computerCourses.map((course: any) => <SelectItem key={course.id ?? course._id ?? course.name} value={course.name}>{course.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Source">
                <Select value={form.source} onValueChange={(value) => setForm((old) => ({ ...old, source: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Enquiry date"><Input type="date" value={form.enquiryDate} onChange={(event) => setForm((old) => ({ ...old, enquiryDate: event.target.value }))} /></Field>
              <Field label="Next follow-up"><Input type="date" value={form.followUpDate} onChange={(event) => setForm((old) => ({ ...old, followUpDate: event.target.value }))} /></Field>
            </div>

            <Field label="Counselling notes"><Textarea rows={4} value={form.remarks} onChange={(event) => setForm((old) => ({ ...old, remarks: event.target.value }))} placeholder="What did the parent ask? Fee discussion, preferred timing, objections, next action..." /></Field>

            {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{message}</div> : null}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveLead} disabled={saving} className="bg-slate-950 hover:bg-slate-800">{saving ? "Saving..." : editing ? "Save changes" : "Create enquiry"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadRow({
  lead,
  today,
  deleting,
  onEdit,
  onDelete,
  onStatus,
  onFollowUp,
  onConvert,
}: {
  lead: Lead;
  today: string;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: LeadStatus) => void;
  onFollowUp: (date: string) => void;
  onConvert: () => void;
}) {
  const isOpen = !["enrolled", "dropped"].includes(lead.status);
  const overdue = isOpen && Boolean(lead.followUpDate) && String(lead.followUpDate) < today;
  const dueToday = isOpen && lead.followUpDate === today;
  const subject = (lead.enquiryType ?? "academic") === "computer" ? lead.courseInterest || "Computer course" : [lead.className && `Class ${lead.className}`, lead.board].filter(Boolean).join(" · ") || "Academic enquiry";
  const age = lead.enquiryDate ? Math.max(0, daysBetween(lead.enquiryDate, today)) : null;

  return (
    <div className="p-4 transition hover:bg-slate-50/70 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_minmax(210px,0.8fr)_minmax(220px,0.85fr)_minmax(200px,0.75fr)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-950">{lead.studentName}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusStyles(lead.status)}`}>{lead.status}</span>
            {overdue ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue</span> : null}
            {dueToday ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">Due today</span> : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600">{subject}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{sourceLabel(lead.source)}</span>
            <span>{formatDate(lead.enquiryDate ?? lead.createdAt?.slice(0, 10))}</span>
            {age !== null ? <span>{age === 0 ? "Today" : `${age}d in pipeline`}</span> : null}
          </div>
          {lead.remarks ? <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-500">{lead.remarks}</p> : null}
        </div>

        <div className="space-y-2 text-sm">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 font-bold text-slate-800 hover:text-slate-950"><Phone className="h-4 w-4 text-slate-400" /> {lead.phone}</a>
          {lead.parentName ? <div className="flex items-center gap-2 text-slate-600"><Users2 className="h-4 w-4 text-slate-400" /> {lead.parentName}</div> : null}
          {lead.email ? <a href={`mailto:${lead.email}`} className="flex items-center gap-2 truncate text-slate-600 hover:text-slate-900"><Mail className="h-4 w-4 shrink-0 text-slate-400" /> <span className="truncate">{lead.email}</span></a> : null}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Next follow-up</p>
          <div className="mt-2 flex items-center gap-2">
            <Input type="date" value={lead.followUpDate ?? ""} onChange={(event) => onFollowUp(event.target.value)} className={`h-9 ${overdue ? "border-rose-300 bg-rose-50" : dueToday ? "border-amber-300 bg-amber-50" : ""}`} />
          </div>
          <div className="mt-2 flex gap-1.5">
            <a href={`https://wa.me/${safeWhatsAppNumber(lead.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-950"><MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp</a>
            <a href={`tel:${lead.phone}`} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-950"><Phone className="mr-1.5 h-3.5 w-3.5" /> Call</a>
          </div>
        </div>

        <div className="space-y-2">
          <Select value={lead.status} onValueChange={(value) => onStatus(value as LeadStatus)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{PIPELINE.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          {lead.status !== "enrolled" ? (
            <Button className="h-9 w-full bg-slate-950 hover:bg-slate-800" onClick={onConvert}>Admit student <ArrowRight className="ml-2 h-4 w-4" /></Button>
          ) : (
            <div className="flex h-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" /> Converted</div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleting} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPill({ icon: Icon, label }: { icon: typeof Users2; label: string }) {
  return <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200"><Icon className="h-3.5 w-3.5 text-cyan-300" />{label}</div>;
}

function HeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users2 }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span><Icon className="h-4 w-4 text-cyan-300" /></div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}{required ? <span className="ml-1 text-rose-500">*</span> : null}</span>
      {children}
    </label>
  );
}
