import { useEffect, useMemo, useState } from "react";
import { format, parseISO, differenceInCalendarMonths, isValid } from "date-fns";
import {
  CalendarDays,
  Plus,
  Star,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Calendar,
} from "lucide-react";

type AcademicYear = {
  id: string;
  name: string; // e.g. 2025-26
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  description?: string;
  isCurrent: boolean;
};

const STORAGE_KEY = "coach_sutra_academic_years";

const DEFAULT_YEARS: AcademicYear[] = [
  {
    id: "1",
    name: "2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    description: "Pansheel",
    isCurrent: false,
  },
  {
    id: "2",
    name: "2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    description: "Current year",
    isCurrent: false,
  },
  {
    id: "3",
    name: "2023-24",
    startDate: "2023-04-01",
    endDate: "2024-03-31",
    description: "Previous year",
    isCurrent: true,
  },
];

function loadYears(): AcademicYear[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_YEARS));
  return DEFAULT_YEARS;
}

function saveYears(years: AcademicYear[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(years));
  window.dispatchEvent(new Event("academicYearsChanged"));
}

function safeFormat(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function monthsBetween(start: string, end: string) {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (!isValid(s) || !isValid(e)) return 12;
    return Math.max(1, differenceInCalendarMonths(e, s) + 1);
  } catch {
    return 12;
  }
}

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>(() => loadYears());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    isCurrent: false,
  });

  useEffect(() => {
    const reload = () => setYears(loadYears());
    window.addEventListener("academicYearsChanged", reload);
    return () => window.removeEventListener("academicYearsChanged", reload);
  }, []);

  const sortedYears = useMemo(() => {
    return [...years].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return b.name.localeCompare(a.name);
    });
  }, [years]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrent: false,
    });
    setModalOpen(true);
  };

  const openEdit = (y: AcademicYear) => {
    setEditing(y);
    setForm({
      name: y.name,
      startDate: y.startDate,
      endDate: y.endDate,
      description: y.description || "",
      isCurrent: y.isCurrent,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      alert("Please fill Academic Year name, start date and end date.");
      return;
    }

    setSaving(true);

    setTimeout(() => {
      let next = [...years];

      if (editing) {
        next = next.map((y) =>
          y.id === editing.id
            ? {
                ...y,
                name: form.name.trim(),
                startDate: form.startDate,
                endDate: form.endDate,
                description: form.description.trim(),
                isCurrent: form.isCurrent,
              }
            : form.isCurrent
            ? { ...y, isCurrent: false }
            : y
        );
      } else {
        const newYear: AcademicYear = {
          id: String(Date.now()),
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          description: form.description.trim(),
          isCurrent: form.isCurrent,
        };

        if (form.isCurrent) {
          next = next.map((y) => ({ ...y, isCurrent: false }));
        }
        next = [newYear, ...next];
      }

      // ensure at least one current if none
      if (!next.some((y) => y.isCurrent) && next.length) {
        next[0] = { ...next[0], isCurrent: true };
      }

      setYears(next);
      saveYears(next);
      setSaving(false);
      setModalOpen(false);
      setEditing(null);
    }, 400);
  };

  const setAsCurrent = (id: string) => {
    const next = years.map((y) => ({
      ...y,
      isCurrent: y.id === id,
    }));
    setYears(next);
    saveYears(next);
  };

  const removeYear = (id: string) => {
    const target = years.find((y) => y.id === id);
    if (!target) return;
    if (target.isCurrent) {
      alert("Current year delete nahi kar sakte. Pehle dusre year ko current banao.");
      return;
    }
    if (!confirm(`Delete academic year ${target.name}?`)) return;
    const next = years.filter((y) => y.id !== id);
    setYears(next);
    saveYears(next);
  };

  return (
    <div className="min-h-screen bg-[#eef3e8] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#5f7a1f]">
              Academic Years
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage academic year sessions and set the active year
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-[#5f7a1f] hover:bg-[#4f6618] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Academic Year
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedYears.map((y) => {
            const months = monthsBetween(y.startDate, y.endDate);
            return (
              <div
                key={y.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${
                  y.isCurrent
                    ? "border-[#5f7a1f] ring-1 ring-[#5f7a1f]/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Badge */}
                <div className="mb-4">
                  {y.isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 bg-[#e8f2d8] text-[#5f7a1f] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#d5e6b8]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Current Year
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Past Year
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                  {y.name}
                </h2>

                {/* Dates */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {safeFormat(y.startDate)} — {safeFormat(y.endDate)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-5 min-h-[20px]">
                  {y.description || "—"}
                </p>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!y.isCurrent && (
                      <button
                        onClick={() => setAsCurrent(y.id)}
                        className="inline-flex items-center gap-1.5 bg-[#5f7a1f] hover:bg-[#4f6618] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Set as Current
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(y)}
                      className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {!y.isCurrent && (
                      <button
                        onClick={() => removeYear(y.id)}
                        className="w-9 h-9 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-400">
                    {months} months
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#5f7a1f] px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editing ? "Edit Academic Year" : "New Academic Year"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Academic Year Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. 2025-26"
                  className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f7a1f]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f7a1f]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f7a1f]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Current year / Previous year"
                  className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f7a1f]"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCurrent}
                  onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                  className="w-4 h-4 accent-[#5f7a1f]"
                />
                Set as Current Academic Year
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5f7a1f] hover:bg-[#4f6618] text-white text-sm font-bold disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editing ? "Update Year" : "Create Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}