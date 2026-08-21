import { ReactNode, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ===================== HEADER ===================== */

export function FormHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-blue-900 px-4 py-2 text-white shadow-md">
      <div>
        <h2 className="text-[13px] font-semibold tracking-wide">{title}</h2>
        {subtitle ? (
          <p className="text-[9px] text-blue-200">{subtitle}</p>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-blue-100 transition hover:bg-white/15 hover:text-white"
          aria-label="Close"
        >
          <span className="text-xl leading-none">×</span>
        </button>
      ) : null}
    </div>
  );
}

/* ===================== ROW ===================== */

export function FormRow({
  children,
  cols = 2,
  className = "",
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FieldLabel({
  label,
  required,
  optional,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Label className="text-xs font-medium text-slate-600">
      {label}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      {optional ? (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          (Optional)
        </span>
      ) : null}
    </Label>
  );
}

/* ===================== TEXT INPUT ===================== */

export function FormInput({
  label,
  required,
  optional,
  value,
  onChange,
  placeholder = "",
  type = "text",
  disabled = false,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} optional={optional} />
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border-slate-300 bg-white text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
      />
    </div>
  );
}

/* ===================== DATE INPUT — type + calendar ===================== */

export function DateInput({
  label,
  required,
  optional,
  value,
  onChange,
  onValidityChange,
  hint,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Parent ko batane ke liye ki date valid hai ya nahi */
  onValidityChange?: (valid: boolean) => void;
  hint?: string;
}) {
  const [display, setDisplay] = useState("");

  /* Sync incoming value → display */
  useEffect(() => {
    if (!value) {
      setDisplay("");
      return;
    }
    const [y, m, d] = value.split("-");
    if (!y) {
      setDisplay("");
      return;
    }
    setDisplay(`${d ?? ""}/${m ?? ""}/${y}`);
  }, [value]);

  /* Returns { iso, error } — caller can show error */
  const parseDate = (
    text: string
  ): { iso: string; error: string } => {
    const digits = text.replace(/\D/g, "").slice(0, 8);

    if (digits.length === 0) return { iso: "", error: "" };
    if (digits.length < 8) return { iso: "", error: "Date incomplete" };

    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);

    /* Day validation */
    const dayNum = Number(dd);
    if (dayNum < 1 || dayNum > 31) {
      return { iso: "", error: `Day '${dd}' galat hai (1-31)` };
    }

    /* Month validation */
    const monthNum = Number(mm);
    if (monthNum < 1 || monthNum > 12) {
      return { iso: "", error: `Month '${mm}' galat hai (1-12)` };
    }

    /* Year validation */
    const yearNum = Number(yyyy);
    const currentYear = new Date().getFullYear();
    if (yearNum < 1900 || yearNum > currentYear + 5) {
      return {
        iso: "",
        error: `Year '${yyyy}' valid nahi hai`,
      };
    }

    /* Har month ke din — leap year ke liye February adjust */
    const daysInMonth = (year: number, month: number): number => {
      const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (month === 2) {
        /* Leap year: divisible by 4, but not by 100 unless by 400 */
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        return isLeap ? 29 : 28;
      }
      return days[month - 1] ?? 31;
    };

    const maxDay = daysInMonth(yearNum, monthNum);
    if (dayNum > maxDay) {
      const monthName = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ][monthNum];
      return {
        iso: "",
        error: `${monthName} me sirf ${maxDay} din hote hain`,
      };
    }

    /* Real date check */
    const testDate = new Date(`${yyyy}-${mm}-${dd}`);
    if (
      testDate.getFullYear() !== yearNum ||
      testDate.getMonth() + 1 !== monthNum ||
      testDate.getDate() !== dayNum
    ) {
      return { iso: "", error: `${dd}/${mm}/${yyyy} valid date nahi hai` };
    }

    return { iso: `${yyyy}-${mm}-${dd}`, error: "" };
  };

  const [error, setError] = useState("");

  /* Parent ko validity batao — save button disable karne ke liye */
  useEffect(() => {
    onValidityChange?.(!error && value.length === 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, value]);

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    let formatted = "";
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += "/" + digits.slice(2, 4);
    if (digits.length > 4) formatted += "/" + digits.slice(4, 8);

    setDisplay(formatted);

    const { iso, error } = parseDate(formatted);
    setError(error);
    onChange(iso);
  };

   const handleCalendar = (raw: string) => {
    /* raw = "2026-01-15" — browser date input format */
    onChange(raw);
    if (!raw) {
      setDisplay("");
      setError("");
      return;
    }
    const [y, m, d] = raw.split("-");
    setDisplay(`${d}/${m}/${y}`);
    setError("");   // calendar se aaya to valid hai
  };

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} optional={optional} />

      <div className="relative">
        <Input
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          value={display}
          onChange={(e) => handleType(e.target.value)}
          className={`h-9 border-slate-300 bg-white pr-10 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 ${
            error ? "border-red-500 ring-1 ring-red-200" : ""
          }`}
          maxLength={10}
        />

        {/* Hidden native date picker — click on icon triggers it */}
        <input
          type="date"
          value={value}
          onChange={(e) => handleCalendar(e.target.value)}
          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 opacity-0"
          aria-label="Pick date from calendar"
        />

        <CalendarDays
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
      </div>

      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-600">
          ⚠️ {error}
        </p>
      ) : hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ===================== PHONE ===================== */

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
];

export function PhoneInput({
  label,
  required,
  optional,
  value,
  onChange,
  countryCode = "+91",
  onCountryChange,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  countryCode?: string;
  onCountryChange?: (c: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} optional={optional} />
      <div className="flex">
        <select
          value={countryCode}
          onChange={(e) => onCountryChange?.(e.target.value)}
          className="h-9 rounded-l-md border border-r-0 border-slate-300 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <Input
          inputMode="numeric"
          placeholder="Mobile number"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="h-9 rounded-l-none border-slate-300 bg-white text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
        />
      </div>
    </div>
  );
}

/* ===================== SELECT ===================== */

type Option = { label: string; value: string };

export function FormSelect({
  label,
  required,
  optional,
  value,
  options,
  onChange,
  placeholder = "Select",
  disabled = false,
  readOnlyText,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnlyText?: string;
}) {
  /* Readonly mode */
  if (readOnlyText !== undefined) {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={required} optional={optional} />
        <div
          className={cn(
            "flex h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-muted-foreground",
            !readOnlyText && "italic",
          )}
        >
          {readOnlyText || `There Are No ${label} Select`}
        </div>
      </div>
    );
  }

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);

  /* Selected option ka label */
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  /* ✅ FEATURE 1: Type karke filter */
  const filtered = text.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(text.toLowerCase()),
      )
    : options;

  /* ✅ FEATURE 3: No record message */
  const noMatch = text.trim() && filtered.length === 0;

  /* Click bahar hone par actual value dikhao */
  const closeDropdown = () => {
    setOpen(false);
    setText(selectedLabel);
    setHighlight(0);
  };

  const choose = (o: Option) => {
    onChange(o.value);
    setText(o.label);
    setHighlight(0);
    setOpen(false);
  };

  /* ✅ FEATURE 2: Enter se select */
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) {
        choose(filtered[highlight]);
      } else {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    }
  };

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} optional={optional} />

      <div className="relative">
        <Input
          value={text || selectedLabel}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setText(""); /* click par filter ke liye empty */
            setHighlight(0);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (e.target.value === "") onChange("");
          }}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(closeDropdown, 150)}
          className="h-9 border-slate-300 bg-white pr-9 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
        />

        {/* Dropdown arrow */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (disabled) return;
            if (open) {
              closeDropdown();
            } else {
              setText("");
              setOpen(true);
            }
          }}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
        >
          <span className="text-xs">▼</span>
        </button>

        {open && !disabled ? (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {/* ✅ FEATURE 3: No record */}
            {noMatch ? (
              <div className="px-3 py-3 text-center text-xs italic text-slate-400">
                No record found
              </div>
            ) : (
              filtered.map((o, idx) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                    idx === highlight
                      ? "bg-blue-100 text-blue-900"
                      : o.value === value
                        ? "bg-blue-50 font-medium"
                        : "hover:bg-slate-50"
                  }`}
                >
                  <span>{o.label}</span>
                  {o.value === value ? <span className="text-blue-600">✓</span> : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ===================== TEXTAREA ===================== */

export function FormTextarea({
  label,
  required,
  optional,
  value,
  onChange,
  placeholder = "",
  rows = 3,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} optional={optional} />
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}

/* ===================== CUSTOM BOX ===================== */

export function CustomFieldsBox({
  title = "Custom Fields",
  children,
  right,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-md border-l-4 border-blue-600 bg-slate-50 p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ===================== SECTION TITLE ===================== */

const SECTION_THEME = {
  blue: "from-blue-600 to-blue-400 shadow-blue-200",
  purple: "from-purple-600 to-purple-400 shadow-purple-200",
  emerald: "from-emerald-600 to-emerald-400 shadow-emerald-200",
  amber: "from-amber-500 to-amber-300 shadow-amber-200",
  red: "from-red-600 to-red-400 shadow-red-200",
} as const;

export function SectionTitle({
  children,
  icon,
  tone = "blue",
  hint,
  className,
  number,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof SECTION_THEME;
  hint?: string;
  className?: string;
  number?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-4 py-2 text-white shadow-md",
        className ?? `bg-gradient-to-r ${SECTION_THEME[tone]}`,
      )}
    >
      {icon ? (
        <div className="flex items-center gap-2">
          {number !== undefined ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/30 text-sm font-bold backdrop-blur-sm">
              {number}
            </span>
          ) : null}
          <div className="rounded-md bg-white/20 p-1.5 backdrop-blur-sm">{icon}</div>
        </div>
      ) : null}
      <div>
        <div className="text-sm font-semibold tracking-wide">{children}</div>
        {hint ? (
          <div className="text-[11px] font-medium text-white/80">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ===================== FOOTER ===================== */

export function FormFooter({
  onSubmit,
  onCancel,
  submitText = "Submit",
  cancelText = "Cancel",
  loading = false,
  submitDisabled = false,
}: {
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5">
      {onCancel ? (
        <Button
          type="button"
          onClick={onCancel}
          className="bg-slate-700 px-6 text-white shadow hover:bg-slate-800"
        >
          {cancelText}
        </Button>
      ) : null}
      {onSubmit ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading || submitDisabled}
          className="min-w-[110px] bg-blue-600 px-6 text-white shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            submitText
          )}
        </Button>
      ) : null}
    </div>
  );
}