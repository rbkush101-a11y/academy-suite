import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type MonthNavProps = {
  /** "YYYY-MM" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
};

export function MonthNav({
  value,
  onChange,
  label = "Month",
  hint,
}: MonthNavProps) {
  const now = new Date();

  const [year, month] = /^\d{4}-\d{2}$/.test(value)
    ? value.split("-")
    : [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];

  const safeMonth = `${year}-${month}`;

  const monthLabel = new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const isCurrentMonth = safeMonth === now.toISOString().slice(0, 7);

  const shiftMonth = (step: number) => {
    const next = new Date(Number(year), Number(month) - 1 + step, 1);
    onChange(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    );
  };

  return (
    <div className="max-w-md">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        <CalendarDays className="h-4 w-4" />
        {label}
      </label>

      <div className="mt-1 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => shiftMonth(-1)}
          title="Pichla month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Input
          type="month"
          value={safeMonth}
          onChange={(event) =>
            onChange(event.target.value || new Date().toISOString().slice(0, 7))
          }
          className="h-10 w-[170px]"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => shiftMonth(1)}
          title="Agla month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isCurrentMonth ? (
          <Button
            variant="ghost"
            className="h-10 text-xs"
            onClick={() => onChange(new Date().toISOString().slice(0, 7))}
          >
            This Month
          </Button>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {hint ?? (
          <>
            Abhi dikh raha hai: <b>{monthLabel}</b>
          </>
        )}
      </p>
    </div>
  );
}