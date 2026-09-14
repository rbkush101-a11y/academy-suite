import { ReactNode, useState, useMemo, useEffect } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard, CalendarDays, BarChart3, Users, UserPlus, GraduationCap,
  BookOpen, Tag, Layers, FileQuestion, Clock, CheckSquare, Pencil,
  MessageCircleQuestion, CalendarX, Monitor, FileEdit, Award, IdCard, Video,
  Download, Radio, BookMarked, IndianRupee, Grid3x3, Ticket, Clock3, Bell,
  ShieldCheck, FileSpreadsheet, Receipt, Banknote, UserCheck, Fingerprint,
  TrendingUp, Filter, Gift, Megaphone, Inbox, MessageSquare, Mail,
  SlidersHorizontal, Columns3, Library, Bus, Home, Package, Coffee, Trophy,
  Search, ChevronDown, ChevronUp, Facebook,
  Settings, Building2, Shield, Smartphone, Puzzle, Cpu, FileText, Rocket
} from "lucide-react";
import TopHeader from "./TopHeader";
import { getStoredRole } from "@/hooks/use-auth";

type NavItem = { label: string; icon: any; href: string };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Lead CRM", icon: Filter, href: "/admissions" },
      { label: "Academic Years", icon: CalendarDays, href: "/academic-years" },
      { label: "Reports", icon: BarChart3, href: "/analytics" },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { label: "Students", icon: GraduationCap, href: "/students" },
      { label: "Staff", icon: Users, href: "/staff" },
      //{ label: "Online Admissions", icon: UserPlus, href: "/admissions" },
    ],
  },
  {
    title: "CURRICULUM",
    items: [
      { label: "Courses", icon: GraduationCap, href: "/courses" },
      { label: "Subjects", icon: BookOpen, href: "/subjects" },
      //{ label: "Topics", icon: Tag, href: "/topics" },
      { label: "Batches", icon: Layers, href: "/batches" },
      //{ label: "PYQ Papers", icon: FileQuestion, href: "/pyq-papers" },
      //{ label: "Question Bank", icon: Package, href: "/question-bank" },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      { label: "Timetable", icon: Clock, href: "/timetable" },
      { label: "Attendance", icon: CheckSquare, href: "/attendance" },
      { label: "Homework", icon: Pencil, href: "/homework" },
      //{ label: "Doubts", icon: MessageCircleQuestion, href: "/doubts" },
      //{ label: "Leave & Holidays", icon: CalendarX, href: "/leaves" },
    ],
  },
  {
    title: "EXAMS & RESULTS",
    items: [
      //{ label: "Online Exams", icon: Monitor, href: "/exams?type=online" },
      { label: "Offline Exams", icon: FileEdit, href: "/exams?type=offline" },
      //{ label: "Test Series", icon: Layers, href: "/test-series" },
      { label: "Report Cards", icon: FileSpreadsheet, href: "/report-card" },
      //{ label: "Certificates", icon: Award, href: "/certificates" },
      //{ label: "ID Cards", icon: IdCard, href: "/id-cards" },
      //{ label: "Proctoring", icon: Video, href: "/proctoring" },
    ],
  },
  /*
  {
    title: "CONTENT & MEDIA",
    items: [
      { label: "Download Center", icon: Download, href: "/download-center" },
      { label: "Video Lectures", icon: Video, href: "/video-lectures" },
      { label: "Live Classes", icon: Radio, href: "/live-classes" },
      { label: "Chapter Progress", icon: BookMarked, href: "/chapter-progress" },
    ],
  },
  */
  {
    title: "FINANCE",
    items: [
      { label: "Fee Collection", icon: IndianRupee, href: "/finance" },
      /*{ label: "Fee Structures", icon: Grid3x3, href: "/finance/fee-structure" },
      { label: "Discounts & Coupons", icon: Ticket, href: "/discounts" },
      { label: "Late Fee Rules", icon: Clock3, href: "/late-fee" },
      { label: "Payment Reminders", icon: Bell, href: "/payment-reminders" },
      { label: "Deletion Audit Log", icon: ShieldCheck, href: "/audit-log" },
      { label: "Accounting Export", icon: FileSpreadsheet, href: "/accounting-export" },*/
      { label: "Expenses", icon: Receipt, href: "/finance/daily-expense" },
      { label: "Expense Heads", icon: Tag, href: "/expense-heads" },
    ],
  },
  {
    title: "HR & STAFF",
    items: [
      { label: "Payroll", icon: Banknote, href: "/hr" },
      //{ label: "Staff Attendance", icon: UserCheck, href: "/staff-attendance" },
      //{ label: "Biometric", icon: Fingerprint, href: "/biometric" },
      //{ label: "Faculty Performance", icon: TrendingUp, href: "/faculty-performance" },
    ],
  },
  /*
  {
    title: "CRM & GROWTH",
    items: [
      { label: "Lead Nurturing", icon: Users, href: "/lead-nurturing" },
      { label: "Proposals", icon: FileSpreadsheet, href: "/proposals" },
      { label: "Meta Lead Ads", icon: Facebook, href: "/meta-leads" },
      { label: "Refer & Earn", icon: Gift, href: "/refer-earn" }, 
      { label: "Alumni Wall", icon: GraduationCap, href: "/alumni" },
    ],
  },
  */
  {
    title: "COMMUNICATION",
    items: [
      /*{ label: "Bulk Messaging", icon: Megaphone, href: "/bulk-messaging" },
      { label: "Inbox", icon: Inbox, href: "/inbox" },
      { label: "SMS / WhatsApp Hub", icon: MessageSquare, href: "/whatsapp" },
      { label: "Email Campaigns", icon: Mail, href: "/email-campaigns" },
      { label: "Custom Forms", icon: SlidersHorizontal, href: "/custom-forms" },
      { label: "Custom Columns", icon: Columns3, href: "/custom-columns" },*/
      { label: "PTM Meetings", icon: Users, href: "/ptm" },
    ],
  },
  /*
  {
    title: "OPERATIONS",
    items: [
      { label: "Library", icon: Library, href: "/library" },
      { label: "Library Fines", icon: IndianRupee, href: "/library-fines" },
      { label: "Transport", icon: Bus, href: "/transport" },
      { label: "Hostel", icon: Home, href: "/hostel" },
      { label: "Inventory", icon: Package, href: "/inventory" },
      { label: "Canteen", icon: Coffee, href: "/canteen" },
      { label: "Gamification", icon: Trophy, href: "/gamification" },
    ],
  },
  */
  {
    title: "SETTINGS",
    items: [
      { label: "General Settings", icon: Settings, href: "/settings" },
      //{ label: "Branches", icon: Building2, href: "/branches" },
      //{ label: "Roles & Permissions", icon: Shield, href: "/roles" },
      //{ label: "Mobile App Branding", icon: Smartphone, href: "/mobile-branding" },
      //{ label: "Integrations", icon: Puzzle, href: "/integrations" },
      //{ label: "AI Credits", icon: Cpu, href: "/ai-credits" },
    ],
  },
  /*
  {
    title: "HELP",
    items: [
      { label: "Training Guide", icon: FileText, href: "/training-guide" },
      { label: "Setup Wizard", icon: Rocket, href: "/setup-wizard" },
    ],
  },*/
];

const collapsedItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Academic Years", icon: CalendarDays, href: "/academic-years" },
  { label: "Reports", icon: BarChart3, href: "/analytics" },
  { label: "Students", icon: GraduationCap, href: "/students" },
  { label: "Staff", icon: Users, href: "/staff" },
  { label: "Online Admissions", icon: UserPlus, href: "/admissions" },
  { label: "Courses", icon: GraduationCap, href: "/courses" },
  { label: "Batches", icon: Layers, href: "/batches" },
  { label: "PYQ Papers", icon: FileQuestion, href: "/pyq-papers" },
  { label: "Question Bank", icon: Package, href: "/question-bank" },
  { label: "Fee Collection", icon: IndianRupee, href: "/finance" },
  { label: "Attendance", icon: CheckSquare, href: "/attendance" },
  { label: "Exams", icon: Monitor, href: "/exams" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function getRoleLabel(role: string | null) {
  if (!role) return "Institute Admin";
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    institute_admin: "Institute Admin",
    admin: "Institute Admin",
    teacher: "Teacher",
    staff: "Staff Member",
    student: "Student",
    accountant: "Accountant",
  };
  return map[role] || role.toUpperCase();
}

function getBrandInfo() {
  let logo = localStorage.getItem("coach_sutra_logo") || "";
  let name = "Second School Classes";
  let tagline = "Where True Learning Comes....";
  try {
    const raw = localStorage.getItem("coach_sutra_general_info");
    if (raw) {
      const p = JSON.parse(raw);
      if (p.name) name = p.name;
      if (p.tagline) tagline = p.tagline;
      if (p.logoUrl) logo = p.logoUrl;
    }
  } catch {}
  return { logo, name, tagline };
}

function getUserInfo() {
  let storedName = "Admin";
  let avatar = "";
  try {
    const keys = ["coach_sutra_user", "user", "auth_user", "userInfo", "user_data"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const u = JSON.parse(raw);
        storedName = u.name || u.fullName || u.username || u.email || storedName;
        avatar = u.avatar || u.profileImage || u.image || "";
        if (storedName && storedName !== "Admin") break;
      }
    }
    if (storedName === "Admin") {
      const token = localStorage.getItem("coach_sutra_token") || localStorage.getItem("token");
      if (token && token.includes(".")) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        storedName =
          payload.name ||
          payload.fullName ||
          payload.username ||
          payload.instituteName ||
          payload.email?.split("@")[0] ||
          "Admin";
      }
    }
  } catch {}
  return { storedName, avatar };
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const token = localStorage.getItem("coach_sutra_token");
  if (!token) return <Redirect to="/login" />;

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [brandInfo, setBrandInfo] = useState(() => getBrandInfo());

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {};
    navGroups.forEach((g) => (obj[g.title] = true));
    return obj;
  });

  useEffect(() => {
    const applySavedFavicon = () => {
      const savedFavicon = localStorage.getItem("coach_sutra_favicon");
      if (savedFavicon) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "shortcut icon";
          document.getElementsByTagName("head")[0].appendChild(link);
        }
        link.href = savedFavicon;
      }
    };

    applySavedFavicon();
    const handleUpdate = () => {
      setBrandInfo(getBrandInfo());
      applySavedFavicon();
    };

    window.addEventListener("brandingChanged", handleUpdate);
    window.addEventListener("instituteNameChanged", handleUpdate);
    return () => {
      window.removeEventListener("brandingChanged", handleUpdate);
      window.removeEventListener("instituteNameChanged", handleUpdate);
    };
  }, []);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return navGroups;
    const q = search.toLowerCase();
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  const isActive = (href: string) => {
    const cleanHref = href.split("?")[0];
    return (
      location === cleanHref ||
      location.startsWith(cleanHref + "/") ||
      (cleanHref === "/dashboard" && location === "/")
    );
  };

  const { storedName, avatar } = getUserInfo();
  const roleLabel = getRoleLabel(getStoredRole());

  const SIDEBAR_FULL = 260;
  const SIDEBAR_MINI = 72;

  const handleHamburger = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen((v) => !v);
    } else {
      setExpanded((v) => !v);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f6f7f9] overflow-x-hidden">
      {/* SIDEBAR */}
      <aside
        style={{ width: expanded ? SIDEBAR_FULL : SIDEBAR_MINI }}
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-[#e9e6d5]
          flex flex-col transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* 🔴 LOGO AREA - FULL, LARGE & CLEAR DISPLAY */}
        <div className={`border-b border-[#f0eedc] shrink-0 ${expanded ? "px-3 py-3" : "px-2 py-3"}`}>
          {expanded ? (
            <Link href="/dashboard" className="cursor-pointer block">
              <div className="flex items-center justify-start min-h-[64px] w-full">
                {brandInfo.logo ? (
                  <img
                    src={brandInfo.logo}
                    alt={brandInfo.name}
                    className="w-full h-14 md:h-16 object-contain object-left hover:opacity-95 transition-opacity"
                  />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#0a2e5a] flex items-center justify-center shrink-0">
                      <span className="text-white font-extrabold text-[12px]">
                        {brandInfo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[16px] font-extrabold leading-none text-[#0a2e5a] truncate">
                        {brandInfo.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium truncate mt-1">
                        {brandInfo.tagline}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link href="/dashboard" className="cursor-pointer flex justify-center min-h-[52px] items-center">
              {brandInfo.logo ? (
                <img src={brandInfo.logo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#0a2e5a] flex items-center justify-center">
                  <span className="text-white font-bold text-[11px]">
                    {brandInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
          )}

          {expanded && (
            <div className="mt-2.5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-[#6b7d00] bg-[#fafaf8]"
              />
            </div>
          )}

          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-3 mx-auto flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-500"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {expanded && (
            <div className="px-2 space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-2 py-1 mb-0.5"
                  >
                    <span className="text-[10px] font-bold tracking-[1.1px] text-[#3d4a3d]">
                      {group.title}
                    </span>
                    {openGroups[group.title] ? (
                      <ChevronUp className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                  {openGroups[group.title] && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item.href);
                        const isDashboard = item.label === "Dashboard";
                        return (
                          <Link key={item.label + item.href} href={item.href}>
                            <div
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all ${
                                active
                                  ? isDashboard
                                    ? "bg-[#6b7d00] text-white shadow-sm"
                                    : "bg-[#f5f3e8] text-[#6b7d00] font-bold border-l-[3px] border-[#6b7d00]"
                                  : "text-[#2e3a4e] hover:bg-[#f8f6ec] hover:text-[#5a6b00]"
                              }`}
                            >
                              <item.icon
                                className={`w-[17px] h-[17px] shrink-0 ${
                                  active
                                    ? isDashboard
                                      ? "text-white"
                                      : "text-[#6b7d00]"
                                    : "text-[#6b7d00]"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!expanded && (
            <div className="flex flex-col items-center gap-1 px-1.5">
              {collapsedItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.label + item.href} href={item.href}>
                    <div
                      title={item.label}
                      className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all
                        ${
                          active
                            ? "bg-[#f3e8ff] text-[#7c1d6f]"
                            : "text-[#7c1d6f] hover:bg-[#faf5ff]"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM USER CARD */}
        <div className={`border-t border-[#f0eedc] bg-white shrink-0 ${expanded ? "p-2.5" : "p-1.5"}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5 bg-[#f8f6ec] rounded-xl px-2.5 py-2 border border-[#eef0d8]">
              {avatar ? (
                <img
                  src={avatar}
                  alt="user"
                  className="w-8 h-8 rounded-full object-cover border border-[#d6dbb2]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#6b7d00] text-white flex items-center justify-center font-extrabold text-[12px]">
                  {storedName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-[#0a2e5a] leading-tight truncate">
                  {storedName}
                </p>
                <p className="text-[10px] font-semibold text-[#6b7d00] leading-tight">
                  {roleLabel}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt="user"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#e9e6d5]"
                  title={storedName}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full bg-[#6b7d00] text-white flex items-center justify-center font-extrabold text-sm"
                  title={storedName}
                >
                  {storedName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <div
        style={{
          marginLeft:
            typeof window !== "undefined" && window.innerWidth >= 1024
              ? expanded
                ? SIDEBAR_FULL
                : SIDEBAR_MINI
              : 0,
        }}
        className={`
          flex-1 flex flex-col h-screen min-w-0 overflow-hidden transition-all duration-300 ease-in-out
          ${expanded ? "lg:ml-[260px]" : "lg:ml-[72px]"}
        `}
      >
        <TopHeader onMenuClick={handleHamburger} />
        <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;