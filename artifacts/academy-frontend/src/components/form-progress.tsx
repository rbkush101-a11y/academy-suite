import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Step = { label: string; icon?: React.ReactNode; filled: boolean };

export function FormProgress({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition",
                step.filled
                  ? "bg-emerald-500 text-white shadow"
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              {step.filled ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                step.filled ? "text-emerald-700" : "text-slate-400"
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 ? (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1 transition",
                step.filled ? "bg-emerald-400" : "bg-slate-200"
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}