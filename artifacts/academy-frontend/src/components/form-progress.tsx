import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { label: string; filled: boolean };

export function FormProgress({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-lg border bg-slate-50 px-3 py-2.5">
      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition",
                step.filled
                  ? "bg-emerald-500 text-white shadow"
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              {step.filled ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wide",
                step.filled ? "text-emerald-700" : "text-slate-400"
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 ? (
            <div
              className={cn(
                "mx-1 h-0.5 flex-1 transition",
                step.filled ? "bg-emerald-400" : "bg-slate-200"
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}