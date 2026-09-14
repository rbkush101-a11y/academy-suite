import { useLocation, Link } from "wouter";
import { useMemo, useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Menu, 
  CheckCheck, 
  Info, 
  Eye, 
  GraduationCap, 
  Briefcase, 
  Loader2,
  ArrowRight
} from "lucide-react";

function getTitle(path: string) {
  const p = path.toLowerCase();
  if (p.includes("dashboard")) return "Dashboard";
  if (p.includes("branch")) return "Branches";
  if (p.includes("admission") || p.includes("enquir") || p.includes("lead")) return "Enquiry";
  if (p.includes("student")) return "Students";
  if (p.includes("fee") || p.includes("finance")) return "Fees";
  if (p.includes("notification")) return "Notifications";
  if (p.includes("setting")) return "Settings";
  return "Dashboard";
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SearchItem {
  id: string | number;
  name: string;
  subtitle: string;
  type: "student" | "staff";
  raw?: any;
}

export default function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [location, setLocation] = useLocation();
  const title = useMemo(() => getTitle(location), [location]);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branch, setBranch] = useState("Main Branch");
  const [branchList, setBranchList] = useState<string[]>(["Main Branch"]);

  // 🔍 Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔔 Notification States
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem("crm_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // 🌐 REAL DATA FETCH (Students & Staff)
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("coach_sutra_token") || "";
        const branchId = localStorage.getItem("active_branch_id") || "";

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (branchId) headers["x-branch-id"] = branchId;

        // 1. Fetch Students
        let studentsData: any[] = [];
        try {
          const res = await fetch(`/api/students?search=${encodeURIComponent(query)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            studentsData = Array.isArray(data) ? data : (data.students || data.data || []);
          }
        } catch (e) {
          const local = localStorage.getItem("students") || localStorage.getItem("student_list") || localStorage.getItem("crm_students");
          if (local) studentsData = JSON.parse(local);
        }

        // 2. Fetch Staff
        let staffData: any[] = [];
        try {
          const res = await fetch(`/api/staff?search=${encodeURIComponent(query)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            staffData = Array.isArray(data) ? data : (data.staff || data.users || data.data || []);
          }
        } catch (e) {
          const local = localStorage.getItem("staff") || localStorage.getItem("staff_list") || localStorage.getItem("users") || localStorage.getItem("crm_staff");
          if (local) staffData = JSON.parse(local);
        }

        const qLower = query.toLowerCase();

        // 3. Format Student results
        const matchedStudents: SearchItem[] = (studentsData || [])
          .filter((s: any) => {
            const fullName = `${s.name || s.fullName || s.studentName || s.firstName || ""} ${s.lastName || ""}`.trim().toLowerCase();
            const phone = (s.phone || s.mobile || s.contact || "").toString();
            const rollNo = (s.rollNo || s.admissionNo || s.roll_no || "").toString().toLowerCase();
            return fullName.includes(qLower) || phone.includes(qLower) || rollNo.includes(qLower);
          })
          .map((s: any) => ({
            id: s.id || s._id,
            name: `${s.name || s.fullName || s.studentName || s.firstName || "Student"} ${s.lastName || ""}`.trim(),
            subtitle: s.className || s.class || s.course || s.phone || "Student",
            type: "student",
            raw: s
          }));

        // 4. Format Staff results
        const matchedStaff: SearchItem[] = (staffData || [])
          .filter((t: any) => {
            const fullName = `${t.name || t.fullName || t.firstName || ""} ${t.lastName || ""}`.trim().toLowerCase();
            const phone = (t.phone || t.mobile || "").toString();
            const role = (t.role || t.designation || "").toLowerCase();
            return fullName.includes(qLower) || phone.includes(qLower) || role.includes(qLower);
          })
          .map((t: any) => ({
            id: t.id || t._id,
            name: `${t.name || t.fullName || t.firstName || "Staff"} ${t.lastName || ""}`.trim(),
            subtitle: t.role || t.designation || t.subject || "Staff Member",
            type: "staff",
            raw: t
          }));

        setSearchResults([...matchedStudents, ...matchedStaff]);
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // 👁️ VIEW PROFILE TRIGGER (Connects directly to Student / Staff Eye action)
  const handleViewProfile = (item: SearchItem) => {
    setShowDropdown(false);
    setSearchQuery("");

    if (item.type === "student") {
      // 1. Store Student ID & data for active profile modal
      localStorage.setItem("active_student_id", String(item.id));
      localStorage.setItem("view_student_data", JSON.stringify(item.raw || item));

      // 2. Dispatch custom event (Agar aapka page modal/drawer sun raha hai)
      window.dispatchEvent(new CustomEvent("openStudentProfile", { detail: { id: item.id, student: item.raw || item } }));
      window.dispatchEvent(new CustomEvent("viewStudent", { detail: { id: item.id } }));

      // 3. Navigate directly to view profile
      setLocation(`/students?view=${item.id}&action=profile`);
    } else {
      // 1. Store Staff ID & data for active profile modal
      localStorage.setItem("active_staff_id", String(item.id));
      localStorage.setItem("view_staff_data", JSON.stringify(item.raw || item));

      // 2. Dispatch custom event for staff
      window.dispatchEvent(new CustomEvent("openStaffProfile", { detail: { id: item.id, staff: item.raw || item } }));
      window.dispatchEvent(new CustomEvent("viewStaff", { detail: { id: item.id } }));

      // 3. Navigate directly to view profile
      setLocation(`/staff?view=${item.id}&action=profile`);
    }
  };

  // 🔘 Search Button / Enter click par View Profile action
  const handleSearchAction = () => {
    if (searchResults.length > 0) {
      // Top match ka profile open karega
      handleViewProfile(searchResults[0]);
    } else if (searchQuery.trim()) {
      setLocation(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchAction();
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadBranches = () => {
    const savedName = localStorage.getItem("active_branch_name") || "Main Branch";
    setBranch(savedName);
    const raw = localStorage.getItem("branch_list");
    let list: string[] = [];
    try {
      if (raw) list = JSON.parse(raw);
    } catch {}
    if (list.length === 0) list = ["Main Branch", "Sadhan enclave"];
    list = Array.from(new Set(list));
    setBranchList(list);
  };

  useEffect(() => {
    loadBranches();
    window.addEventListener("branchChanged", loadBranches);
    window.addEventListener("branchListChanged", loadBranches);
    return () => {
      window.removeEventListener("branchChanged", loadBranches);
      window.removeEventListener("branchListChanged", loadBranches);
    };
  }, []);

  const selectBranch = (name: string) => {
    setBranch(name);
    localStorage.setItem("active_branch_name", name);
    const dataRaw = localStorage.getItem("branch_data");
    if (dataRaw) {
      try {
        const data = JSON.parse(dataRaw);
        const found = data.find((b: any) => b.name === name);
        if (found) localStorage.setItem("active_branch_id", found.id);
      } catch {}
    }
    setBranchOpen(false);
    window.dispatchEvent(new Event("branchChanged"));
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("crm_notifications", JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="Toggle Menu">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-[15px] font-bold text-slate-800">{title}</h1>
        
        {/* Hidden Branch Dropdown */}
        <div style={{ display: 'none' }} className="relative hidden md:block ml-4">
          <button onClick={() => setBranchOpen(!branchOpen)} className="flex items-center gap-2 bg-[#e6f3fa] text-[#0a4a5a] px-4 py-1.5 rounded-full text-[13px] font-bold border border-[#d6eaf5]">
            <MapPin className="w-4 h-4" /> {branch} <ChevronDown className="w-3 h-3" />
          </button>
          {branchOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white border rounded-xl shadow-lg w-48 overflow-hidden z-50">
              {branchList.map((b) => (
                <button key={b} onClick={() => selectBranch(b)} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${b === branch ? "bg-[#f8f6ec] font-bold text-[#6b7d00]" : ""}`}>
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 🔍 SEARCH BAR & BUTTON (ATTACHED TO VIEW PROFILE) */}
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex items-center border border-slate-200 rounded-full pl-3 pr-1 py-1 w-[320px] lg:w-[360px] focus-within:border-[#6b7d00] focus-within:ring-2 focus-within:ring-[#6b7d00]/20 transition-all bg-slate-50 focus-within:bg-white shadow-sm">
            <input 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search student or staff profile..." 
              className="w-full text-[13px] outline-none bg-transparent text-slate-800 placeholder:text-slate-400" 
            />
            
            {/* 🔘 Search & View Button */}
            <button
              onClick={handleSearchAction}
              className="p-1.5 rounded-full bg-[#6b7d00] text-white hover:bg-[#586700] transition-colors shrink-0 shadow-sm flex items-center justify-center"
              title="Search & View Profile"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 📋 Results Dropdown with Eye / View Profile Buttons */}
          {showDropdown && searchQuery.trim().length > 0 && (
            <div className="absolute top-full mt-2 right-0 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[400px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Direct Profile Results</span>
                <span>{searchResults.length} Match(es)</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {loading ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6b7d00]" />
                    Searching database...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No matching profile found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div 
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleViewProfile(item)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#f8f9fa] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          item.type === "student" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {item.type === "student" ? (
                            <GraduationCap className="w-4 h-4" />
                          ) : (
                            <Briefcase className="w-4 h-4" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-[#6b7d00] transition-colors">{item.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.type === "student" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {item.type}
                        </span>

                        {/* 👁️ Eye Icon Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(item);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 group-hover:bg-[#6b7d00] group-hover:text-white text-slate-700 text-[11px] font-bold transition-all shadow-sm"
                          title={`View ${item.type} Profile`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🔔 Notifications Button */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    className="text-[12px] text-[#6b7d00] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3.5 text-left transition-colors hover:bg-slate-50 ${!n.read ? "bg-[#fbfbf6]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-[13px] ${!n.read ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t bg-slate-50 text-center">
                <Link href="/notifications">
                  <button 
                    onClick={() => setNotifOpen(false)} 
                    className="text-[12px] font-bold text-[#6b7d00] hover:underline py-1"
                  >
                    View all notifications
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ⚙️ Settings Button */}
        <Link href="/settings">
          <button 
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" 
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Link>

        {/* 🚪 Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" 
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}