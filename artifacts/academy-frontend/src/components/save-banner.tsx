import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

export function SaveBanner({
  status,
  message,
}: {
  status: "saving" | "saved" | "error" | "draft";
  message?: string;
}) {
  if (status === "draft") return null;

  const config = {
    saving: {
      icon: <Save className="h-4 w-4 animate-pulse" />,
      text: "Saving...",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    saved: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: message ?? "All changes saved",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: message ?? "Save failed",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
  }[status];

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${config.cls}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}