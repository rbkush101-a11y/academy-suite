import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  School,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Child = {
  id: string;
  name: string;
  enrollmentNo?: string;
  className?: string;
  section?: string;
  academicYear?: string;
  schoolName?: string;
  photoDataUrl?: string;
  status?: string;
};

type DashboardData = {
  parent: {
    id: string;
    name: string;
    email?: string;
    loginId?: string;
    phone?: string;
    relation?: "father" | "mother" | "guardian";
  };
  institute: {
    id: string;
    name: string;
    logoDataUrl?: string;
    academicYear?: string;
  };
  children: Child[];
};

type Tab = "home" | "profile" | "notifications";

const initials = (value?: string) =>
  String(value || "P")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const classLabel = (child: Child) => {
  const className = child.className ? `Class ${child.className}` : "Class not set";
  return child.section ? `${className} • ${child.section}` : className;
};

export default function ParentDashboard() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [openingStudentId, setOpeningStudentId] = useState("");
  const [studentViewError, setStudentViewError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const token = localStorage.getItem("coach_sutra_token") || "";

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/parent/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to load parent dashboard.");
      setData(payload as DashboardData);
      const firstChildId = String(payload?.children?.[0]?.id || "");
      setSelectedChildId((current) => current || firstChildId);
    } catch (cause: any) {
      setError(cause?.message || "Unable to load parent dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedChild = useMemo(
    () => data?.children.find((child) => child.id === selectedChildId) ?? data?.children[0] ?? null,
    [data, selectedChildId],
  );

  const openStudentDashboard = async (child: Child) => {
    if (!token || !child.id || openingStudentId) return;
    setOpeningStudentId(child.id);
    setStudentViewError("");

    try {
      const response = await fetch("/api/parent/student-view/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId: child.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.token || !payload?.sessionId) {
        throw new Error(payload?.error || "Student dashboard open nahi ho saka.");
      }

      localStorage.setItem("academy_support_original_token", token);
      localStorage.setItem("academy_support_original_role", "parent");
      localStorage.setItem("academy_support_session_id", String(payload.sessionId));
      localStorage.setItem("academy_support_student_id", child.id);
      localStorage.setItem("academy_support_student_name", String(payload.student?.name || child.name));
      localStorage.setItem("academy_support_return_path", "/parent-dashboard");
      localStorage.setItem("academy_support_expires_at", String(payload.expiresAt || ""));
      localStorage.setItem("academy_support_viewer", "parent");

      localStorage.setItem("coach_sutra_token", String(payload.token));
      localStorage.setItem("coach_sutra_user_role", "student");
      window.dispatchEvent(new Event("storage"));
      window.location.assign("/student-dashboard?support=1&parent=1");
    } catch (cause: any) {
      setStudentViewError(cause?.message || "Student dashboard open nahi ho saka.");
      setOpeningStudentId("");
    }
  };

  const changePassword = async () => {
    setPasswordMessage("");
    if (!currentPassword || !newPassword) {
      setPasswordMessage("Current aur new password dono enter karo.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password aur confirm password match nahi kar rahe.");
      return;
    }

    setPasswordBusy(true);
    try {
      const response = await fetch("/api/parent/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Password update failed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (cause: any) {
      setPasswordMessage(cause?.message || "Password update failed.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const logout = () => {
    if (token) {
      void fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("coach_sutra_token");
    localStorage.removeItem("coach_sutra_user_role");
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061a3a] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
          <p className="mt-3 text-sm font-semibold text-slate-300">Loading Parent App...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061a3a] px-5">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <X className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-950">Parent dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error || "Unable to load dashboard."}</p>
          <Button className="mt-5 w-full" onClick={() => void loadDashboard()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#173d88_0%,#061a3a_34%,#03142f_100%)] px-0 pb-24 text-white sm:px-4 sm:py-4">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden border-white/10 bg-[#061a3a] shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:min-h-[760px] sm:rounded-[34px] sm:border">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#08224a] px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="rounded-xl p-2 text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[18px] font-black">Parent Dashboard</h1>
              <p className="text-[11px] font-medium text-slate-300">{data.institute.name}</p>
            </div>
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/80 text-xs font-black">
            {initials(data.parent.name)}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08224a] bg-emerald-400" />
          </div>
        </header>

        <main className="px-5 pb-8 pt-4">
          {activeTab === "home" && (
            <>
              <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#06aeea_0%,#1767ff_45%,#5135e8_100%)] p-5 shadow-xl">
                <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
                <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-white/10" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-blue-600">
                    {data.institute.logoDataUrl ? (
                      <img src={data.institute.logoDataUrl} alt="Institute" className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap className="h-8 w-8" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{data.institute.name}</p>
                    <p className="text-[11px] text-blue-50">Learn Today, Build Tomorrow</p>
                  </div>
                </div>
                <div className="relative mt-6">
                  <p className="text-base font-bold">Welcome</p>
                  <p className="mt-1 text-[27px] font-black leading-tight">{data.parent.name}</p>
                </div>
              </section>

              <section className="mt-5">
                <h2 className="text-xl font-black">Your Children</h2>
                <p className="mt-1 text-sm text-slate-300">Child select karo, phir existing Student App open karo.</p>

                {data.children.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                    Is parent account ke saath abhi koi child linked nahi hai. Admin se Parents page par children link karwao.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.children.map((child) => {
                      const active = selectedChild?.id === child.id;
                      return (
                        <div
                          key={child.id}
                          className={`rounded-[24px] bg-white p-3 text-slate-950 transition ${active ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#061a3a]" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedChildId(child.id)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-black text-blue-700">
                              {child.photoDataUrl ? <img src={child.photoDataUrl} alt="" className="h-full w-full object-cover" /> : initials(child.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-black">{child.name}</p>
                                {active && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-700">Selected</span>}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {child.enrollmentNo || "No enrollment"} &nbsp;•&nbsp; {classLabel(child)}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </button>

                          <Button
                            type="button"
                            onClick={() => void openStudentDashboard(child)}
                            disabled={openingStudentId === child.id}
                            className="mt-3 h-10 w-full rounded-xl bg-[#0b6cfb] text-xs font-black hover:bg-[#095cd5]"
                          >
                            {openingStudentId === child.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening Student App...</>
                            ) : (
                              <><School className="mr-2 h-4 w-4" /> Open Student Dashboard</>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {studentViewError && (
                  <div className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200">{studentViewError}</div>
                )}
              </section>

              <section className="mt-5 grid grid-cols-3 gap-2">
                <button onClick={() => setActiveTab("profile")} className="rounded-2xl bg-white p-4 text-center text-slate-950 shadow-sm">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><UserRound className="h-5 w-5" /></div>
                  <p className="mt-2 text-[11px] font-black">My Profile</p>
                </button>
                <button disabled={!selectedChild} onClick={() => selectedChild && void openStudentDashboard(selectedChild)} className="rounded-2xl bg-white p-4 text-center text-slate-950 shadow-sm disabled:opacity-50">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><GraduationCap className="h-5 w-5" /></div>
                  <p className="mt-2 text-[11px] font-black">Student App</p>
                </button>
                <button onClick={() => setActiveTab("notifications")} className="rounded-2xl bg-white p-4 text-center text-slate-950 shadow-sm">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Bell className="h-5 w-5" /></div>
                  <p className="mt-2 text-[11px] font-black">Notifications</p>
                </button>
              </section>
            </>
          )}

          {activeTab === "profile" && (
            <section className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-blue-500 text-2xl font-black">{initials(data.parent.name)}</div>
                <h2 className="mt-3 text-2xl font-black">{data.parent.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-widest text-cyan-300">{data.parent.relation || "Parent"}</p>
              </div>

              <div className="rounded-[24px] bg-white p-5 text-slate-950">
                <h3 className="flex items-center gap-2 font-black"><CircleUserRound className="h-5 w-5 text-blue-600" /> My Profile</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div><p className="text-xs font-bold uppercase text-slate-400">Login ID</p><p className="mt-1 font-semibold">{data.parent.loginId || data.parent.email || "-"}</p></div>
                  <div><p className="text-xs font-bold uppercase text-slate-400">Phone</p><p className="mt-1 font-semibold">{data.parent.phone || "-"}</p></div>
                  <div><p className="text-xs font-bold uppercase text-slate-400">Linked Children</p><p className="mt-1 font-semibold">{data.children.length}</p></div>
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-5 text-slate-950">
                <h3 className="flex items-center gap-2 font-black"><KeyRound className="h-5 w-5 text-blue-600" /> Change Password</h3>
                <div className="mt-4 space-y-3">
                  <Input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                  <Input type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  {passwordMessage && <p className="text-xs font-semibold text-slate-600">{passwordMessage}</p>}
                  <Button disabled={passwordBusy} onClick={() => void changePassword()} className="w-full rounded-xl bg-blue-600">
                    {passwordBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section>
              <h2 className="text-2xl font-black">Notifications</h2>
              <div className="mt-4 rounded-[24px] bg-white p-6 text-center text-slate-950">
                <Bell className="mx-auto h-8 w-8 text-blue-500" />
                <p className="mt-3 font-black">Student notifications Student App me available hain</p>
                <p className="mt-1 text-sm text-slate-500">Child select karke Student Dashboard open karo.</p>
              </div>
            </section>
          )}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[430px] items-center justify-around border-t border-white/10 bg-[#0a234a] px-5 py-2.5 sm:bottom-4 sm:rounded-b-[34px]">
          {[
            { key: "home" as Tab, label: "Home", icon: Home },
            { key: "profile" as Tab, label: "Profile", icon: UserRound },
            { key: "notifications" as Tab, label: "Notifications", icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={`min-w-[82px] rounded-2xl px-3 py-2 text-center ${active ? "bg-blue-600/25 text-cyan-300" : "text-slate-300"}`}>
                <Icon className="mx-auto h-5 w-5" />
                <p className="mt-1 text-[10px] font-black">{item.label}</p>
              </button>
            );
          })}
        </nav>

        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
            <aside onClick={(event) => event.stopPropagation()} className="h-full w-[290px] bg-[#08224a] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div><p className="text-lg font-black">Parent App</p><p className="text-xs text-slate-400">{data.institute.name}</p></div>
                <button onClick={() => setMenuOpen(false)} className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-6 space-y-2">
                <button onClick={() => { setActiveTab("home"); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl bg-blue-600/20 px-4 py-3 text-sm font-bold"><Home className="h-5 w-5" /> Parent Dashboard</button>
                <button onClick={() => { setActiveTab("profile"); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold hover:bg-white/10"><UsersRound className="h-5 w-5" /> My Profile</button>
                <button onClick={() => { setActiveTab("profile"); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold hover:bg-white/10"><Settings className="h-5 w-5" /> Settings</button>
              </div>
              <button onClick={logout} className="mt-8 flex w-full items-center gap-3 border-t border-white/10 px-4 py-5 text-sm font-bold text-red-200"><LogOut className="h-5 w-5" /> Sign Out</button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
