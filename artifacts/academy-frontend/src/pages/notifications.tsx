import { useMemo, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  useListAdmissions,
  useListHomework,
} from "@workspace/api-client-react";
import {
  Bell,
  BookOpen,
  UserPlus,
  IndianRupee,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type NotifType = "lead" | "payment" | "homework" | "leave";

type AppNotification = {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  sortAt: number;
  href?: string;
  isRead: boolean;
};

const READ_KEY = "coach_sutra_read_notifications";

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadSet(set: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
}

function safeDate(value?: string | null) {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function timeAgo(value?: string | null) {
  const d = safeDate(value);
  if (!d) return "Just now";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Just now";
  }
}

function money(n?: number | null) {
  const val = Number(n || 0);
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<"all" | NotifType>("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadSet());

  // 🟢 Real Hooks from @workspace/api-client-react
  const {
    data: admissionsData,
    isLoading: loadingLeads,
    refetch: refetchLeads,
    isFetching: fetchingLeads,
  } = useListAdmissions();

  const {
    data: homeworksData,
    isLoading: loadingHomework,
    refetch: refetchHomework,
    isFetching: fetchingHomework,
  } = useListHomework();

  // 🟢 Safe Query for Fees
  const {
    data: feesData,
    isLoading: loadingFees,
    refetch: refetchFees,
    isFetching: fetchingFees,
  } = useQuery({
    queryKey: ["notifications-student-fees"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("coach_sutra_token");
        const res = await fetch("/api/student-fees", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
  });

  // 🟢 Safe Query for Leaves
  const {
    data: leavesData,
    isLoading: loadingLeaves,
    refetch: refetchLeaves,
    isFetching: fetchingLeaves,
  } = useQuery({
    queryKey: ["notifications-leaves"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("coach_sutra_token");
        const res = await fetch("/api/leaves", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingLeads || loadingFees || loadingHomework || loadingLeaves;
  const isFetching = fetchingLeads || fetchingFees || fetchingHomework || fetchingLeaves;

  const notifications = useMemo(() => {
    const list: AppNotification[] = [];

    // 1) LEADS / ADMISSIONS
    const admissions = Array.isArray(admissionsData)
      ? admissionsData
      : (admissionsData as any)?.data || [];
    (admissions as any[]).forEach((item: any) => {
      const id = `lead-${item.id}`;
      const name = item.studentName || item.name || "New student";
      const course = item.courseName || item.course || item.interestedCourse || "";
      const status = item.status || item.enquiryStatus || "";
      list.push({
        id,
        type: "lead",
        title: status ? `Lead • ${status}` : "New Lead / Enquiry",
        message: course
          ? `${name} enquired about ${course}.`
          : `${name} submitted a new admission enquiry.`,
        time: timeAgo(item.createdAt || item.updatedAt),
        sortAt: safeDate(item.createdAt || item.updatedAt)?.getTime() || 0,
        href: "/admissions",
        isRead: readIds.has(id),
      });
    });

    // 2) PAYMENTS / FEES
    const fees = Array.isArray(feesData) ? feesData : (feesData as any)?.data || [];
    (fees as any[]).forEach((item: any) => {
      const id = `payment-${item.id}`;
      const student = item.studentName || item.student?.name || "Student";
      const paid = Number(item.paidAmount ?? item.amountPaid ?? item.paid ?? 0);
      const due = Number(item.dueAmount ?? item.pendingAmount ?? item.balance ?? 0);
      const total = Number(item.totalAmount ?? item.totalFee ?? paid + due);

      let title = "Fee Update";
      let message = `${student} fee record updated.`;

      if (due > 0 && paid === 0) {
        title = "Payment Pending";
        message = `${student} has ${money(due)} pending out of ${money(total)}.`;
      } else if (due > 0) {
        title = "Partial Payment";
        message = `${student} paid ${money(paid)}. Pending ${money(due)}.`;
      } else if (paid > 0) {
        title = "Payment Received";
        message = `${money(paid)} received from ${student}.`;
      }

      list.push({
        id,
        type: "payment",
        title,
        message,
        time: timeAgo(item.updatedAt || item.createdAt || item.paymentDate),
        sortAt: safeDate(item.updatedAt || item.createdAt || item.paymentDate)?.getTime() || 0,
        href: "/finance/student-fee-management",
        isRead: readIds.has(id),
      });
    });

    // 3) HOMEWORK
    const homeworks = Array.isArray(homeworksData)
      ? homeworksData
      : (homeworksData as any)?.data || [];
    (homeworks as any[]).forEach((item: any) => {
      const id = `homework-${item.id}`;
      const titleText = item.title || item.topic || "Homework";
      const subject = item.subjectName || item.subject || "";
      const batch = item.batchName || item.batch || "";
      list.push({
        id,
        type: "homework",
        title: "Homework",
        message: [titleText, subject && `Subject: ${subject}`, batch && `Batch: ${batch}`]
          .filter(Boolean)
          .join(" • "),
        time: timeAgo(item.createdAt || item.dueDate || item.updatedAt),
        sortAt: safeDate(item.createdAt || item.dueDate || item.updatedAt)?.getTime() || 0,
        href: "/homework",
        isRead: readIds.has(id),
      });
    });

    // 4) LEAVES
    const leaves = Array.isArray(leavesData) ? leavesData : (leavesData as any)?.data || [];
    (leaves as any[]).forEach((item: any) => {
      const id = `leave-${item.id}`;
      const name = item.staffName || item.studentName || item.userName || item.name || "User";
      const status = item.status || "Pending";
      const reason = item.reason || item.leaveType || "Leave request";
      list.push({
        id,
        type: "leave",
        title: `Leave • ${status}`,
        message: `${name}: ${reason}`,
        time: timeAgo(item.createdAt || item.fromDate || item.updatedAt),
        sortAt: safeDate(item.createdAt || item.fromDate || item.updatedAt)?.getTime() || 0,
        href: "/leaves",
        isRead: readIds.has(id),
      });
    });

    return list.sort((a, b) => b.sortAt - a.sortAt);
  }, [admissionsData, feesData, homeworksData, leavesData, readIds]);

  const filtered = notifications.filter(
    (n) => activeTab === "all" || n.type === activeTab
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCount = (key: string) => {
    if (key === "all") return notifications.length;
    return notifications.filter((n) => n.type === key).length;
  };

  const getUnread = (key: string) => {
    if (key === "all") return unreadCount;
    return notifications.filter((n) => n.type === key && !n.isRead).length;
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    filtered.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadSet(next);
  };

  const refreshAll = () => {
    refetchLeads();
    refetchFees();
    refetchHomework();
    refetchLeaves();
  };

  const tabs = [
    { key: "all" as const, label: "All", icon: Bell, activeBg: "bg-[#0a2e5a] text-white", color: "text-[#0a2e5a]" },
    { key: "lead" as const, label: "New Leads", icon: UserPlus, activeBg: "bg-purple-600 text-white", color: "text-purple-600" },
    { key: "payment" as const, label: "Payments", icon: IndianRupee, activeBg: "bg-green-600 text-white", color: "text-green-600" },
    { key: "homework" as const, label: "Homework", icon: BookOpen, activeBg: "bg-blue-600 text-white", color: "text-blue-600" },
    { key: "leave" as const, label: "Leaves", icon: CalendarX, activeBg: "bg-orange-500 text-white", color: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-[#0a2e5a]">
            <Bell className="w-6 h-6 text-[#6b7d00]" /> Notifications
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Live from your coaching data •{" "}
            <span className="font-bold text-[#6b7d00]">{unreadCount} unread</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Mark all as read
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Horizontal Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-3 sm:px-4 pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              const unread = getUnread(tab.key);
              const count = getCount(tab.key);

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shrink-0 ${
                    active
                      ? `${tab.activeBg} shadow-sm`
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-white" : tab.color}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center ${
                      active
                        ? "bg-white/25 text-white"
                        : unread > 0
                        ? "bg-red-500 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {unread > 0 && !active ? unread : count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="min-h-[420px]">
          {isLoading ? (
            <div className="h-[420px] flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#6b7d00]" />
              <p className="text-sm font-semibold text-slate-500">Loading live notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-[420px] flex flex-col items-center justify-center text-slate-400 p-8">
              <Bell className="w-12 h-12 mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No notifications in this category</p>
              <p className="text-xs mt-1">
                Leads, fees, homework aur leaves se live items yahan aayenge.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {filtered.map((notif) => {
                let Icon = Bell;
                let iconColor = "text-slate-500";
                let iconBg = "bg-slate-50 border-slate-100";

                if (notif.type === "lead") {
                  Icon = UserPlus;
                  iconColor = "text-purple-600";
                  iconBg = "bg-purple-50 border-purple-100";
                }
                if (notif.type === "payment") {
                  Icon = IndianRupee;
                  iconColor = "text-green-600";
                  iconBg = "bg-green-50 border-green-100";
                }
                if (notif.type === "homework") {
                  Icon = BookOpen;
                  iconColor = "text-blue-500";
                  iconBg = "bg-blue-50 border-blue-100";
                }
                if (notif.type === "leave") {
                  Icon = CalendarX;
                  iconColor = "text-orange-500";
                  iconBg = "bg-orange-50 border-orange-100";
                }

                return (
                  <div
                    key={notif.id}
                    className={`p-4 flex gap-4 transition-colors hover:bg-slate-50 ${
                      notif.isRead ? "opacity-80" : "bg-[#f8fbff]"
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${iconBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <h4
                          className={`text-[14px] truncate ${
                            notif.isRead
                              ? "font-semibold text-slate-700"
                              : "font-extrabold text-slate-900"
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {notif.time}
                          </span>
                          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                      </div>

                      <p className="text-[13px] text-slate-600 leading-snug mb-2">
                        {notif.message}
                      </p>

                      {notif.href && (
                        <Link href={notif.href}>
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#6b7d00] hover:underline">
                            Open <ExternalLink className="w-3 h-3" />
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}