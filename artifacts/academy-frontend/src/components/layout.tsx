import { ReactNode, useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { getStoredRole, routeByRole } from "@/hooks/use-auth";

type NavItem = { label: string; icon: any; href: string; disabled?: boolean; shortcutOnly?: boolean; exactQuery?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const adminNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Reports & Analytics", icon: BarChart3, href: "/analytics" },
    ],
  },
  {
    title: "ADMISSIONS",
    items: [
      { label: "Lead CRM", icon: Filter, href: "/admissions" },
      { label: "Online Admissions", icon: UserPlus, href: "/online-admissions" },
    ],
  },
  {
    title: "STUDENTS",
    items: [
      { label: "Student Directory", icon: GraduationCap, href: "/students" },
      { label: "Attendance", icon: CheckSquare, href: "/attendance" },
      { label: "Homework", icon: Pencil, href: "/homework" },
      { label: "Timetable", icon: Clock, href: "/timetable" },
      { label: "Online Exams", icon: Monitor, href: "/exams?type=online" },
      { label: "Offline Exams", icon: FileEdit, href: "/exams?type=offline" },
      { label: "Report Cards", icon: FileSpreadsheet, href: "/report-card" },
      { label: "Fee Collection", icon: IndianRupee, href: "/finance" },
      { label: "Parents", icon: Users, href: "/parents" },
      { label: "PTM Meetings", icon: UserCheck, href: "/ptm" },
    ],
  },
  {
    title: "STAFF",
    items: [
      { label: "Staff Directory", icon: Users, href: "/staff" },
      { label: "Staff Timetable", icon: Clock3, href: "/timetable", shortcutOnly: true },
      { label: "Payroll", icon: Banknote, href: "/hr" },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      { label: "Academic Years", icon: CalendarDays, href: "/academic-years" },
      { label: "Courses", icon: GraduationCap, href: "/courses" },
      { label: "Subjects", icon: BookOpen, href: "/subjects" },
      { label: "Topics", icon: Tag, href: "/topics" },
      { label: "Batches", icon: Layers, href: "/batches" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Fee Collection", icon: IndianRupee, href: "/finance", shortcutOnly: true },
      { label: "Expenses", icon: Receipt, href: "/finance/daily-expense" },
      { label: "Payroll", icon: Banknote, href: "/hr", shortcutOnly: true },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Notifications", icon: Bell, href: "/notifications" },
      { label: "PTM Meetings", icon: Users, href: "/ptm", shortcutOnly: true },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Institute Foundation", icon: ShieldCheck, href: "/foundation", exactQuery: true },
      { label: "General Settings", icon: Settings, href: "/settings" },
      { label: "Branches", icon: Building2, href: "/foundation?tab=branches" },
      { label: "Roles & Permissions", icon: Shield, href: "/foundation?tab=roles" },
    ],
  },
];

const accountantNavGroups: NavGroup[] = [
  {
    title: "FINANCE OVERVIEW",
    items: [
      { label: "Finance Dashboard", icon: LayoutDashboard, href: "/accountant-dashboard" },
      { label: "Fee Collection", icon: IndianRupee, href: "/finance/student-fee-management" },
      { label: "Expenses", icon: Receipt, href: "/finance/daily-expense" },
    ],
  },
];

const STAFF_ALLOWED = new Set([
  "/dashboard", "/admissions", "/online-admissions", "/academic-years",
  "/students", "/courses", "/subjects", "/topics", "/batches",
  "/timetable", "/attendance", "/notifications", "/ptm",
]);

function getNavigationForRole(role: string | null): NavGroup[] {
  if (role === "accountant") return accountantNavGroups;

  const readyGroups = adminNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.disabled) }))
    .filter((group) => group.items.length > 0);

  if (role === "staff") {
    return readyGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => STAFF_ALLOWED.has(item.href.split("?")[0])),
      }))
      .filter((group) => group.items.length > 0);
  }

  return readyGroups;
}


function navItemIsActive(item: NavItem, location: string) {
  if (item.shortcutOnly) return false;

  const [cleanHref, query] = item.href.split("?");
  const currentQuery =
    typeof window !== "undefined" ? window.location.search.slice(1) : "";

  if (query && currentQuery !== query) return false;
  if (item.exactQuery && !query && currentQuery) return false;

  return (
    location === cleanHref ||
    location.startsWith(cleanHref + "/") ||
    (cleanHref === "/dashboard" && location === "/")
  );
}


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
    parent: "Parent",
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
  const role = getStoredRole();
  const navGroups = useMemo(() => getNavigationForRole(role), [role]);
  const collapsedItems = useMemo(() => {
    const seen = new Set<string>();
    return navGroups
      .flatMap((group) => group.items)
      .filter((item) => {
        const key = item.href;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 14);
  }, [navGroups]);
  const homeHref = routeByRole(role);

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [brandInfo, setBrandInfo] = useState(() => getBrandInfo());

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      obj[group.title] =
        group.title === "OVERVIEW" ||
        group.items.some((item) => navItemIsActive(item, location));
    });
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

  useEffect(() => {
    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => navItemIsActive(item, location))
    );

    if (activeGroup) {
      setOpenGroups((prev) =>
        prev[activeGroup.title]
          ? prev
          : { ...prev, [activeGroup.title]: true }
      );
    }
  }, [location, navGroups]);

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
  }, [search, navGroups]);

  const isActive = (item: NavItem) => navItemIsActive(item, location);

  const { storedName, avatar } = getUserInfo();
  const roleLabel = getRoleLabel(role);

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
    <div className="flex min-h-screen w-full bg-[#f4f7fb] overflow-x-hidden">
      {/* SIDEBAR */}
      <aside
        style={{ width: expanded ? SIDEBAR_FULL : SIDEBAR_MINI }}
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#0b1220] border-r border-white/10 text-white
          flex flex-col transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* 🔴 LOGO AREA - FULL, LARGE & CLEAR DISPLAY */}
        <div className={`border-b border-white/10 shrink-0 ${expanded ? "px-3 py-3" : "px-2 py-3"}`}>
          {expanded ? (
            <Link href={homeHref} className="cursor-pointer block">
              <div className="flex items-center justify-start min-h-[64px] w-full">
                {brandInfo.logo ? (
                  <img
                    src={brandInfo.logo}
                    alt={brandInfo.name}
                    className="w-full h-14 md:h-16 object-contain object-left hover:opacity-95 transition-opacity"
                  />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-white font-extrabold text-[12px]">
                        {brandInfo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[16px] font-extrabold leading-none text-white truncate">
                        {brandInfo.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium truncate mt-1">
                        {brandInfo.tagline}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link href={homeHref} className="cursor-pointer flex justify-center min-h-[52px] items-center">
              {brandInfo.logo ? (
                <img src={brandInfo.logo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
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
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/70 bg-white/5"
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
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[10px] font-bold tracking-[1.1px] text-slate-500">
                        {group.title}
                      </span>
                      <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">
                        {group.items.length}
                      </span>
                    </span>
                    {openGroups[group.title] ? (
                      <ChevronUp className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                  {(search.trim() || openGroups[group.title]) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item);
                        const isDashboard = item.href.includes("dashboard");
                        return (
                          item.disabled ? (
                            <div
                              key={item.label + item.href}
                              title={`${item.label} — Coming Soon`}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-slate-400 cursor-not-allowed"
                            >
                              <item.icon className="w-[17px] h-[17px] shrink-0 text-slate-300" />
                              <span className="truncate">{item.label}</span>
                              <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">Soon</span>
                            </div>
                          ) : (
                          <Link key={item.label + item.href} href={item.href}>
                            <div
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all ${
                                active
                                  ? isDashboard
                                    ? "bg-white text-slate-950 shadow-sm"
                                    : "bg-white/10 text-white font-bold border-l-[3px] border-cyan-400"
                                  : "text-slate-300 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <item.icon
                                className={`w-[17px] h-[17px] shrink-0 ${
                                  active
                                    ? isDashboard
                                      ? "text-slate-950"
                                      : "text-cyan-300"
                                    : "text-cyan-300"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                          </Link>
                          )
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
                const active = isActive(item);
                return (
                  item.disabled ? (
                    <div
                      key={item.label + item.href}
                      title={`${item.label} — Coming Soon`}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-300 cursor-not-allowed"
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                  ) : (
                  <Link key={item.label + item.href} href={item.href}>
                    <div
                      title={item.label}
                      className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all
                        ${
                          active
                            ? "bg-white text-slate-950"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                    </div>
                  </Link>
                  )
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM USER CARD */}
        <div className={`border-t border-white/10 bg-[#0b1220] shrink-0 ${expanded ? "p-2.5" : "p-1.5"}`}>
          {expanded ? (
            <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-2.5 py-2 border border-white/10">
              {avatar ? (
                <img
                  src={avatar}
                  alt="user"
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-extrabold text-[12px]">
                  {storedName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[12.5px] font-extrabold text-white leading-tight truncate">
                  {storedName}
                </p>
                <p className="text-[10px] font-semibold text-cyan-300 leading-tight">
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
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                  title={storedName}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-extrabold text-sm"
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
