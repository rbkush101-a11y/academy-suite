import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  GraduationCap,
  Home,
  KeyRound,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import ParentChildDashboard from "@/components/parent-child-dashboard";
type Child = {
  id: string;
  name: string;
  enrollmentNo?: string;
  className?: string;
  section?: string;
  courseName?: string;
  batchName?: string;
  photoDataUrl?: string;
};
type ParentHomeData = {
  parent: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    photoDataUrl?: string;
  };
  institute: {
    id?: string;
    name?: string;
    logoDataUrl?: string;
    academicYear?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  children: Child[];
};
type ParentTab = "home" | "profile" | "notifications";
function initials(value?: string) {
  return String(value || "P")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
function classLabel(child: Child) {
  return [
    child.className ? `Class ${child.className}` : "",
    child.section ? `Section ${child.section}` : "",
  ]
    .filter(Boolean)
    .join(" • ") || "Class not set";
}
function parentHeaders(): Record<string, string> {
  const token = localStorage.getItem("coach_sutra_token") || "";
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// Session-only display cache. Bound to the signed-in parent's JWT session,
// so a different account/session cannot see the previous family's details.
const PARENT_CACHE_PREFIX = "academy_parent_home_cache:v2:";
const STUDENT_CACHE_PREFIX = "academy_child_overview_cache:v2:";
const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;

function parentSessionScope(): { userId: string; sessionId: string } | null {
  try {
    const token = localStorage.getItem("coach_sutra_token") || "";
    const chunk = token.split(".")[1];
    if (!chunk) return null;
    const base64 = chunk.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64)) as Record<string, unknown>;
    if (claims.role !== "parent") return null;
    if (typeof claims.exp === "number" && Date.now() >= claims.exp * 1000) return null;
    const userId = String(claims.userId || claims.sub || "");
    const sessionId = String(claims.sessionId || "");
    return userId && sessionId ? { userId, sessionId } : null;
  } catch {
    return null;
  }
}

function parentHomeCacheKey() {
  const scope = parentSessionScope();
  return scope ? `${PARENT_CACHE_PREFIX}${scope.userId}:${scope.sessionId}` : null;
}

function readCachedParentHome(): ParentHomeData | null {
  const key = parentHomeCacheKey();
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt: number; data: ParentHomeData };
    const scope = parentSessionScope();
    if (!scope || !cached?.data?.parent?.id ||
        cached.data.parent.id !== scope.userId ||
        !Array.isArray(cached.data.children) ||
        Date.now() - cached.savedAt > DASHBOARD_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function writeCachedParentHome(data: ParentHomeData) {
  const key = parentHomeCacheKey();
  const scope = parentSessionScope();
  if (!key || !scope || data.parent.id !== scope.userId) return;
  try {
    // Avoid keeping huge embedded photos in browser storage.
    const compact = JSON.parse(JSON.stringify(data)) as ParentHomeData;
    const smallImage = (value?: string) => value && value.length < 80000 ? value : "";
    compact.parent.photoDataUrl = smallImage(compact.parent.photoDataUrl);
    compact.institute.logoDataUrl = smallImage(compact.institute.logoDataUrl);
    compact.children = compact.children.map((child) => ({
      ...child, photoDataUrl: smallImage(child.photoDataUrl),
    }));
    sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: compact }));
  } catch {
    // Storage may be blocked/full: dashboard continues to work without cache.
  }
}

function signedInParentName(): string {
  const scope = parentSessionScope();
  if (!scope) return "";
  try {
    const saved = JSON.parse(localStorage.getItem("coach_sutra_user") || "null");
    if (saved && String(saved.id || saved.userId || "") === scope.userId &&
        saved.role === "parent") {
      return String(saved.name || "").trim();
    }
  } catch { /* No stored account summary. */ }
  return "";
}

function clearDashboardDisplayCaches() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i) || "";
      if (key.startsWith(PARENT_CACHE_PREFIX) || key.startsWith(STUDENT_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch { /* Ignore disabled browser storage. */ }
}

export default function ParentDashboard() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ParentHomeData>(() =>
    readCachedParentHome() || {
      parent: { id: "", name: signedInParentName() },
      institute: {},
      children: [],
    },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ParentTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChildId, setActiveChildId] = useState("");
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState(() => {
    const cached = readCachedParentHome()?.parent;
    return {
      name: cached?.name || signedInParentName(),
      phone: cached?.phone || "",
      photoDataUrl: cached?.photoDataUrl || "",
    };
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const loadParentHome = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/parent/overview", {
        credentials: "include",
        headers: parentHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearDashboardDisplayCaches();
          setData({ parent: { id: "", name: "" }, institute: {}, children: [] });
          setProfileForm({ name: "", phone: "", photoDataUrl: "" });
        }
        throw new Error(body?.error || "Unable to load the Parent Dashboard.");
      }
      const normalized: ParentHomeData = {
        parent: body?.parent || {
          id: "",
          name: "",
        },
        institute: body?.institute || {},
        children: Array.isArray(body?.children) ? body.children : [],
      };
      setData(normalized);
      writeCachedParentHome(normalized);
      setProfileForm({
        name: String(normalized.parent.name || ""),
        phone: String(normalized.parent.phone || ""),
        photoDataUrl: String(normalized.parent.photoDataUrl || ""),
      });
    } catch (cause: any) {
      // Never display stale family information after authorization fails.
      const message = cause?.message || "Unable to load the Parent Dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadParentHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const activeChild = useMemo(
    () => data?.children.find((child) => child.id === activeChildId) || null,
    [data?.children, activeChildId],
  );
  const openChild = (child: Child) => {
    setMenuOpen(false);
    setActiveChildId(child.id);
    localStorage.setItem("academy_last_child_id", child.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openStudentDashboardFromMenu = () => {
    const children = data?.children || [];
    const lastChildId = localStorage.getItem("academy_last_child_id") || "";
    const child = children.find((item) => item.id === lastChildId) || children[0];
    if (child) {
      openChild(child);
      return;
    }
    setActiveTab("home");
    setMenuOpen(false);
  };
  const logout = () => {
    const token = localStorage.getItem("coach_sutra_token") || "";
    if (token) {
      void fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearDashboardDisplayCaches();
    localStorage.removeItem("academy_last_child_id");
    [
      "coach_sutra_token",
      "coach_sutra_user_role",
      "coach_sutra_user",
      "foundation_branches",
      "foundation_institute_id",
      "active_branch_id",
      "active_branch_name",
    ].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("storage"));
    setLocation("/login");
  };
  const saveProfile = async () => {
    if (!profileForm.name.trim()) {
      setProfileMessage("Name is required.");
      return;
    }
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const response = await fetch("/api/parent/self-update", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...parentHeaders(),
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          photoDataUrl: profileForm.photoDataUrl,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Profile update failed.");
      setProfileMessage("Profile updated successfully.");
      setProfileEdit(false);
      await loadParentHome();
    } catch (cause: any) {
      setProfileMessage(cause?.message || "Profile update failed.");
    } finally {
      setProfileSaving(false);
    }
  };
  const updatePassword = async () => {
    setPasswordMessage("");
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage("Please enter both the current and new password.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/parent/self-password", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...parentHeaders(),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Password update failed.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password updated successfully.");
    } catch (cause: any) {
      setPasswordMessage(cause?.message || "Password update failed.");
    } finally {
      setPasswordSaving(false);
    }
  };
  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage("Photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((current) => ({
        ...current,
        photoDataUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };
  if (activeChildId) {
    return (
      <ParentChildDashboard
        key={activeChildId}
        studentId={activeChildId}
        initialStudent={activeChild ? {
          id: activeChild.id,
          name: activeChild.name,
          enrollmentNo: activeChild.enrollmentNo,
          className: activeChild.className,
          section: activeChild.section,
          courseName: activeChild.courseName,
          batchName: activeChild.batchName,
          photoDataUrl: activeChild.photoDataUrl,
          instituteId: data.institute.id || "",
          instituteName: data.institute.name || "",
          instituteLogoDataUrl: data.institute.logoDataUrl || "",
        } : undefined}
        onBackToParent={() => {
          setActiveChildId("");
          setActiveTab("home");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }
  if (!loading && error && !data.parent.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03142f] px-5 text-white">
        <div className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center text-slate-950 shadow-2xl">
          <h1 className="text-xl font-black">Parent dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadParentHome()}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }
  const instituteName = data.institute.name || "";
  const parentName = data.parent.name || "";
  return (
    <>
      <style>{`
        @keyframes parentFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .parent-fade { animation: parentFade .22s ease-out both; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; }
      `}</style>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(28,110,255,.24),transparent_31%),linear-gradient(180deg,#071f49_0%,#041a3b_47%,#02142f_100%)] pb-[calc(88px+env(safe-area-inset-bottom,0px))] text-white antialiased">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061b3b]/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-black">Parent Dashboard</h1>
              <p className="truncate text-[12px] font-semibold text-slate-300">{instituteName}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-blue-900 shadow-lg"
            >
              {data.parent.photoDataUrl ? (
                <img src={data.parent.photoDataUrl} alt={parentName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-black">{initials(parentName)}</span>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </button>
          </div>
        </header>
        {menuOpen && (
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[292px] flex-col border-r border-white/10 bg-[linear-gradient(180deg,#061b3b_0%,#03142f_100%)] p-4 shadow-2xl">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white text-blue-600">
                  {data.institute.logoDataUrl ? (
                    <img src={data.institute.logoDataUrl} alt={instituteName} className="h-full w-full object-contain p-1" />
                  ) : (
                    <GraduationCap className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{instituteName}</p>
                  <p className="text-[12px] font-black uppercase tracking-[.16em] text-cyan-300">Parent App</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 space-y-1">
                <DrawerButton
                  active={activeTab === "home"}
                  icon={<Home className="h-[18px] w-[18px]" />}
                  label="Parent Dashboard"
                  onClick={() => { setActiveTab("home"); setMenuOpen(false); }}
                />
                <DrawerButton
                  icon={<UsersRound className="h-[18px] w-[18px]" />}
                  label="Student Dashboard"
                  onClick={openStudentDashboardFromMenu}
                />
                <DrawerButton
                  active={activeTab === "profile"}
                  icon={<UserRound className="h-[18px] w-[18px]" />}
                  label="Profile"
                  onClick={() => { setActiveTab("profile"); setMenuOpen(false); }}
                />
                <DrawerButton
                  active={activeTab === "notifications"}
                  icon={<Bell className="h-[18px] w-[18px]" />}
                  label="Notifications"
                  onClick={() => { setActiveTab("notifications"); setMenuOpen(false); }}
                />
                <DrawerButton
                  active={activeTab === "profile"}
                  icon={<Settings className="h-[18px] w-[18px]" />}
                  label="Settings"
                  onClick={() => { setActiveTab("profile"); setMenuOpen(false); }}
                />
              </div>
              <div className="mt-auto border-t border-white/10 pt-4">
                <DrawerButton
                  icon={<LogOut className="h-[18px] w-[18px]" />}
                  label="Sign Out"
                  danger
                  onClick={logout}
                />
              </div>
            </aside>
          </div>
        )}
        <main className="mx-auto max-w-lg space-y-3 px-4 pb-4 pt-3">
          {error && (
            <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-xs font-semibold text-red-100">
              {error}
            </div>
          )}
          {activeTab === "home" && (
            <div className="relative isolate min-h-[calc(100vh-150px)] parent-fade">
              <div
                aria-hidden="true"
                className="pointer-events-none fixed bottom-[62px] left-1/2 z-0 w-full max-w-lg -translate-x-1/2"
                style={{
                  aspectRatio: "1472 / 328",
                  backgroundImage: "url('/parent-app/bottom-school-background.png')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "bottom center",
                  backgroundSize: "100% auto",
                }}
              />
              <div className="relative z-10 space-y-3.5 pb-3">
              <section
                  aria-label={`Welcome ${parentName}`}
                  className="relative min-h-[156px] overflow-hidden rounded-[22px] border border-cyan-200/40 bg-[#0878dd] p-4 shadow-[0_24px_55px_-28px_rgba(0,145,255,.9)] sm:min-h-[164px] sm:p-5"
                >
                  <img
                    src="/parent-app/welcome-card-background.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,63,156,.34)_0%,rgba(3,63,156,.14)_58%,rgba(1,22,86,.02)_100%)]" />

                  {/* Keep the institute heading and welcome message on the same vertical axis. */}
                  <div className="relative z-10 grid grid-cols-[46px_minmax(0,1fr)] gap-x-3 gap-y-3 pr-[15%] sm:pr-[26%]">
                    <div className="row-span-2 flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white shadow-md">
                      {data.institute.logoDataUrl ? (
                        <img
                          src={data.institute.logoDataUrl}
                          alt={instituteName}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-blue-600" />
                      )}
                    </div>

                    <div className="col-start-2 min-w-0 self-center">
                      <p className="line-clamp-2 text-[13px] font-black leading-snug text-white">
                        {instituteName}
                      </p>
                      <p className="mt-0.5 text-[12px] font-semibold leading-snug text-blue-50">
                        Learn Today, Build Tomorrow
                      </p>
                    </div>

                    <div className="col-start-2 min-w-0 pb-1">
                      <p className="text-[12px] font-bold text-white/95">Welcome</p>
                      {parentName ? (
                        <h2 className="mt-0.5 break-words text-[clamp(18px,5vw,24px)] font-black leading-tight tracking-tight text-white">
                          {parentName}
                        </h2>
                      ) : (
                        <div aria-label="Loading parent name" className="mt-2 h-7 w-36 animate-pulse rounded-lg bg-white/25" />
                      )}
                    </div>
                  </div>
                </section>
              <section aria-label="Your Children">
                <div className="mb-2">
                  <h2 className="text-xl font-black">Your Children</h2>
                  <p className="mt-0.5 text-xs font-medium text-slate-300">
                    Open a child card to access the complete Student Dashboard.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {data.children.map((child) => (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => openChild(child)}
                      aria-label={`Open ${child.name}'s Student Dashboard`}
                      className="group flex w-full items-center gap-3 rounded-[19px] border border-white/90 bg-white p-3 text-left text-slate-950 shadow-[0_14px_30px_-22px_rgba(0,0,0,.86)] transition hover:-translate-y-0.5 hover:border-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041a3b] active:scale-[.99]"
                    >
                      <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-blue-100 bg-blue-100 font-black text-blue-700 shadow-inner">
                        {child.photoDataUrl ? (
                          <img
                            src={child.photoDataUrl}
                            alt={`${child.name} profile`}
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <span>{initials(child.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-black text-[#071a3f]">{child.name}</p>
                        <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">
                          {child.enrollmentNo ? `Roll No. ${child.enrollmentNo}` : "Student ID"} • {classLabel(child)}
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-slate-500">Student dashboard</p>
                      </div>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                  {loading && data.children.length === 0 && (
                    <div className="space-y-2.5" aria-label="Loading children">
                      {[0, 1].map((index) => (
                        <div key={index} className="flex items-center gap-3 rounded-[19px] bg-white p-3 shadow-sm" role="status">
                          <div className="h-[58px] w-[58px] shrink-0 animate-pulse rounded-[14px] bg-slate-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                            <div className="h-3 w-44 max-w-full animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!loading && data.children.length === 0 && (
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 text-center">
                      <UsersRound className="mx-auto h-7 w-7 text-slate-500" />
                      <p className="mt-2 text-sm font-black">No child linked yet</p>
                      <p className="mt-1 text-xs text-slate-400">Link a child from the Admin Parents page.</p>
                    </div>
                  )}
                </div>
              </section>
              </div>
            </div>
          )}
          {activeTab === "profile" && (
            <div className="space-y-4 parent-fade pb-6">
              <div className="flex flex-col items-center pt-3 text-center">
                <div className="relative">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-blue-900 text-xl font-black shadow-[0_16px_40px_rgba(0,0,0,.28)]">
                    {profileForm.photoDataUrl ? (
                      <img src={profileForm.photoDataUrl} alt={parentName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{initials(parentName)}</span>
                    )}
                  </div>
                  {profileEdit && (
                    <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#03142f] bg-blue-500 text-white shadow-lg">
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
                      <span className="text-sm font-black">+</span>
                    </label>
                  )}
                </div>
                <h2 className="mt-4 text-[24px] font-black">{parentName}</h2>
                <p className="mt-1 text-[12px] font-black uppercase tracking-[.18em] text-cyan-300">Parent Account</p>
              </div>
              <section className="rounded-[22px] bg-white p-4 text-slate-950 shadow-[0_16px_35px_-24px_rgba(0,0,0,.55)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-blue-600"><UserRound className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-black text-[#071a3f]">My Profile</p>
                      <p className="text-[12px] font-medium text-slate-500">Parent information</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setProfileEdit((value) => !value); setProfileMessage(""); }}
                    className="rounded-xl bg-blue-50 px-3 py-2 text-[12px] font-black text-blue-600"
                  >
                    {profileEdit ? "Cancel" : "Edit"}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <Field label="Name" value={profileForm.name} disabled={!profileEdit} onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))} />
                  <Field label="Phone" value={profileForm.phone} disabled={!profileEdit} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />
                  <Field label="Email / Login" value={data.parent.email || ""} disabled onChange={() => {}} />
                  <Field label="Linked Children" value={String(data.children.length)} disabled onChange={() => {}} />
                </div>
                {profileMessage && <p className="mt-3 text-[12px] font-bold text-slate-600">{profileMessage}</p>}
                {profileEdit && (
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={() => void saveProfile()}
                    className="mt-4 h-11 w-full rounded-xl bg-[linear-gradient(90deg,#08b7e8,#087ff5,#1466ef)] text-sm font-black text-white disabled:opacity-50"
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                )}
              </section>
              <section className="rounded-[22px] bg-white p-4 text-slate-950 shadow-[0_16px_35px_-24px_rgba(0,0,0,.55)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><KeyRound className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-[17px] font-black text-[#071a3f]">Change Password</h3>
                    <p className="text-[12px] font-medium text-slate-500">Parent login password</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <Field type="password" label="Current Password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
                  <Field type="password" label="New Password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
                  <Field type="password" label="Confirm Password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />
                  {passwordMessage && <p className="text-[12px] font-bold text-slate-600">{passwordMessage}</p>}
                  <button
                    type="button"
                    disabled={passwordSaving}
                    onClick={() => void updatePassword()}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(90deg,#08b7e8,#087ff5,#1466ef)] text-sm font-black text-white disabled:opacity-50"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </section>
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="parent-fade">
              <h2 className="text-xl font-black">Notifications</h2>
              <div className="mt-4 rounded-[22px] bg-white p-6 text-center text-slate-950 shadow-sm">
                <Bell className="mx-auto h-8 w-8 text-blue-500" />
                <p className="mt-3 text-sm font-black">Child notifications are available inside the Student Dashboard</p>
                <p className="mt-1 text-xs text-slate-500">Open a child card to view that student's complete dashboard.</p>
              </div>
            </div>
          )}
        </main>
        <nav
          aria-label="Parent app navigation"
          className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-white/10 bg-[#08224a]/98 shadow-[0_-8px_24px_rgba(1,10,28,.24)] backdrop-blur-xl"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex w-full max-w-lg items-center gap-1 px-3 pt-2">
            <BottomButton label="Home" icon={<Home className="h-5 w-5" />} active={activeTab === "home"} onClick={() => setActiveTab("home")} />
            <BottomButton label="Profile" icon={<UserRound className="h-5 w-5" />} active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
            <BottomButton label="Notifications" icon={<Bell className="h-5 w-5" />} active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
          </div>
        </nav>
      </div>
    </>
  );
}
function DrawerButton({
  label,
  icon,
  active,
  danger,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
        danger
          ? "text-red-200 hover:bg-red-500/10"
          : active
            ? "border-l-2 border-cyan-400 bg-blue-600/25 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
function BottomButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-1 transition active:scale-95 ${
        active ? "bg-blue-900/60 text-cyan-200" : "text-slate-300"
      }`}
    >
      {icon}
      <span className="mt-1 text-[12px] font-semibold leading-tight">{label}</span>
    </button>
  );
}
function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}
