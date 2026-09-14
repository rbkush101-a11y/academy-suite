import { useState } from "react";
import { Link } from "wouter";
import {
  Settings as SettingsIcon,
  Layers,
  MapPin,
  Calendar,
  Building2,
  Palette,
  GraduationCap,
  Trophy,
  Bell,
  Mail,
  Puzzle,
  Shield,
  Gauge,
  Save,
  CheckCircle2,
  Sparkles,
  Image,
  Loader2,
  UploadCloud,
  Pencil,
  X,
  Stamp,
  FileCheck,
} from "lucide-react";

const TABS = [
  { id: "general", label: "General Info", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "grade", label: "Grade Rules", icon: Trophy },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "email", label: "Email Settings", icon: Mail },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "security", label: "Security", icon: Shield },
  { id: "plan", label: "Plan & Limits", icon: Gauge },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEFAULT_FORM = {
  name: "Second School Classes",
  code: "COA-MAIN",
  phone: "7880345475",
  email: "secondschoolclasses@gmail.com",
  city: "Prayagraj",
  state: "Uttar Pradesh",
  pincode: "211011",
  address: "MIG 88, Preetam Nagar, MIG Preetam Nagar Colony, Dhoomanganj",
  website: "https://parikshadrishti.com",
  tagline: "Where True Learning Comes....",
  gstin: "22AAAAA0000A1Z5",
  pan: "",
  gstPercent: "18",
  academicYear: "2025-26",
  passingPercent: "33",
  gradeSystem: "Percentage",
  logoUrl: "",
  faviconUrl: "",
  signatureUrl: "",
  stampUrl: "",
  primaryColor: "#85a540",
  secondaryColor: "#000000",
  idCardTemplate: "Modern (Color Header)",
  idCardAccent: "#0d3387",
  certificateTemplate: "Modern (Minimal)",
  certificateBorder: "#be38f3",
  certificateSignLabel: "Principal / Director",
  showQR: true,
  showBloodGroup: true,
};

const FILE_RULES = {
  logoUrl: {
    label: "Logo",
    maxMB: "2MB",
    maxBytes: 2 * 1024 * 1024,
    width: "200px – 400px",
    height: "50px – 100px",
    formats: "PNG, SVG, JPG",
    accept: "image/png,image/svg+xml,image/jpeg,image/jpg,image/webp",
  },
  faviconUrl: {
    label: "Favicon",
    maxMB: "512KB (0.5MB)",
    maxBytes: 512 * 1024,
    width: "32px or 64px",
    height: "32px or 64px",
    formats: "PNG, ICO",
    accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg",
  },
  signatureUrl: {
    label: "Authorised Signature",
    maxMB: "1MB",
    maxBytes: 1 * 1024 * 1024,
    width: "200px",
    height: "80px",
    formats: "PNG, JPG",
    accept: "image/png,image/jpeg,image/jpg",
  },
  stampUrl: {
    label: "Official Stamp",
    maxMB: "1MB",
    maxBytes: 1 * 1024 * 1024,
    width: "150px",
    height: "150px",
    formats: "PNG, JPG",
    accept: "image/png,image/jpeg,image/jpg",
  },
} as const;

type FileKey = keyof typeof FILE_RULES;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("Saved successfully!");

  const [stagedFiles, setStagedFiles] = useState<Record<string, File | undefined>>({});
  const [stagedPreviews, setStagedPreviews] = useState<Record<string, string | undefined>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [form, setForm] = useState(() => {
    try {
      const savedInfo = localStorage.getItem("coach_sutra_general_info");
      const savedLogo = localStorage.getItem("coach_sutra_logo") || "";
      const savedFavicon = localStorage.getItem("coach_sutra_favicon") || "";
      const savedSignature = localStorage.getItem("coach_sutra_signature") || "";
      const savedStamp = localStorage.getItem("coach_sutra_stamp") || "";

      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        if (
          parsed?.name &&
          (String(parsed.name).includes("Coach Sutra") ||
            String(parsed.email || "").includes("coachsutra"))
        ) {
          localStorage.setItem("coach_sutra_general_info", JSON.stringify(DEFAULT_FORM));
          localStorage.setItem("coaching_name", DEFAULT_FORM.name);
          return {
            ...DEFAULT_FORM,
            logoUrl: savedLogo,
            faviconUrl: savedFavicon,
            signatureUrl: savedSignature,
            stampUrl: savedStamp,
          };
        }
        return {
          ...DEFAULT_FORM,
          ...parsed,
          logoUrl: savedLogo || parsed.logoUrl || "",
          faviconUrl: savedFavicon || parsed.faviconUrl || "",
          signatureUrl: savedSignature || parsed.signatureUrl || "",
          stampUrl: savedStamp || parsed.stampUrl || "",
        };
      }
    } catch {}

    localStorage.setItem("coach_sutra_general_info", JSON.stringify(DEFAULT_FORM));
    localStorage.setItem("coaching_name", DEFAULT_FORM.name);
    return { ...DEFAULT_FORM };
  });

  const update = (key: string, value: any) =>
    setForm((p: any) => ({ ...p, [key]: value }));

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>, key: FileKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rule = FILE_RULES[key];

    if (file.size > rule.maxBytes) {
      alert(`⚠️ File Size Exceeded!\nMaximum allowed size for ${rule.label} is ${rule.maxMB}.`);
      e.target.value = "";
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setStagedFiles((prev) => ({ ...prev, [key]: file }));
    setStagedPreviews((prev) => ({ ...prev, [key]: tempUrl }));
  };

  const handleConfirmUpload = (key: FileKey) => {
    const file = stagedFiles[key];
    if (!file) {
      alert(`⚠️ Pehle "Choose File" par click karke file select kijiye, fir "Upload" dabaiye.`);
      return;
    }

    setUploadingKey(key);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      update(key, base64);

      if (key === "logoUrl") localStorage.setItem("coach_sutra_logo", base64);
      if (key === "faviconUrl") {
        localStorage.setItem("coach_sutra_favicon", base64);
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "shortcut icon";
          document.getElementsByTagName("head")[0].appendChild(link);
        }
        link.href = base64;
      }
      if (key === "signatureUrl") localStorage.setItem("coach_sutra_signature", base64);
      if (key === "stampUrl") localStorage.setItem("coach_sutra_stamp", base64);

      setStagedFiles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStagedPreviews((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setUploadingKey(null);

      window.dispatchEvent(new Event("brandingChanged"));
      setSaved(true);
      setSaveMsg(`${FILE_RULES[key].label} uploaded and updated successfully!`);
      setTimeout(() => setSaved(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const removeFileKey = (key: FileKey) => {
    update(key, "");
    setStagedFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setStagedPreviews((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (key === "logoUrl") localStorage.removeItem("coach_sutra_logo");
    if (key === "faviconUrl") localStorage.removeItem("coach_sutra_favicon");
    if (key === "signatureUrl") localStorage.removeItem("coach_sutra_signature");
    if (key === "stampUrl") localStorage.removeItem("coach_sutra_stamp");

    window.dispatchEvent(new Event("brandingChanged"));
  };

  const handleSave = (e?: React.FormEvent, msg = "Saved successfully!") => {
    e?.preventDefault();
    setIsSaving(true);
    setSaveMsg(msg);

    localStorage.setItem("coach_sutra_general_info", JSON.stringify(form));
    localStorage.setItem("coaching_name", form.name);
    if (form.logoUrl) localStorage.setItem("coach_sutra_logo", form.logoUrl);
    if (form.faviconUrl) localStorage.setItem("coach_sutra_favicon", form.faviconUrl);
    if (form.signatureUrl) localStorage.setItem("coach_sutra_signature", form.signatureUrl);
    if (form.stampUrl) localStorage.setItem("coach_sutra_stamp", form.stampUrl);

    const rawUser = localStorage.getItem("coach_sutra_user") || localStorage.getItem("user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        u.instituteName = form.name;
        u.coachingName = form.name;
        localStorage.setItem("coach_sutra_user", JSON.stringify(u));
      } catch {}
    }

    window.dispatchEvent(new Event("instituteNameChanged"));
    window.dispatchEvent(new Event("brandingChanged"));

    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 450);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="w-full bg-[#6272f2] rounded-2xl p-5 md:p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center overflow-hidden">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Settings</h1>
                <p className="text-white/85 text-[12px] font-medium mt-0.5">{form.name}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-[11px] font-semibold">
                <Layers className="w-3.5 h-3.5" /> Custom (Enterprise) Plan
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-[11px] font-semibold">
                <MapPin className="w-3.5 h-3.5" /> {form.city}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-[11px] font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Expires 29 Feb 2028
              </span>
            </div>
          </div>
          <Link href="/billing">
            <button className="bg-white/20 hover:bg-white/30 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" /> View Plans
            </button>
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="w-full bg-white rounded-[22px] border border-slate-200 p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active ? "bg-[#6272f2] text-white" : "text-[#506385] hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-[#798ba3]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> {saveMsg}
        </div>
      )}

      {/* GENERAL TAB */}
      {activeTab === "general" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <form onSubmit={(e) => handleSave(e, "General Info saved successfully!")}>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-[#eef0ff] flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#6272f2]" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900">Institute Information</h3>
                <p className="text-[12px] text-slate-400">Basic details shown on all documents and portals</p>
              </div>
            </div>

            <p className="text-[10px] font-extrabold tracking-[0.12em] text-slate-400 uppercase mb-3">Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <Field label="Institute Name" value={form.name} onChange={(v: string) => update("name", v)} />
              <Field label="Email" value={form.email} onChange={(v: string) => update("email", v)} type="email" />
              <Field label="Phone" value={form.phone} onChange={(v: string) => update("phone", v)} />
              <Field label="Website" value={form.website} onChange={(v: string) => update("website", v)} />
            </div>

            <div className="border-t border-slate-100 my-5" />
            <p className="text-[10px] font-extrabold tracking-[0.12em] text-slate-400 uppercase mb-3">Location</p>
            <div className="mb-4">
              <label className="text-[10px] font-extrabold tracking-[0.08em] text-slate-400 uppercase mb-1.5 block">Address</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-[#6272f2] resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <Field label="City" value={form.city} onChange={(v: string) => update("city", v)} />
              <Field label="State" value={form.state} onChange={(v: string) => update("state", v)} />
              <Field label="Pincode" value={form.pincode} onChange={(v: string) => update("pincode", v)} />
            </div>

            <div className="border-t border-slate-100 my-5" />
            <p className="text-[10px] font-extrabold tracking-[0.12em] text-slate-400 uppercase mb-3">Legal</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="GSTIN" value={form.gstin} onChange={(v: string) => update("gstin", v)} />
              <Field label="PAN" value={form.pan} onChange={(v: string) => update("pan", v)} />
              <Field label="GST Percentage (%)" value={form.gstPercent} onChange={(v: string) => update("gstPercent", v)} />
            </div>

            <div className="flex justify-end pt-6 mt-5 border-t border-slate-100">
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 bg-[#6272f2] hover:bg-[#4f5ee3] text-white text-[13px] font-bold px-6 py-2.5 rounded-xl disabled:opacity-70 cursor-pointer">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving..." : "Save General Info"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BRANDING TAB */}
      {activeTab === "branding" && (
        <form onSubmit={(e) => handleSave(e, "Branding saved successfully!")} className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Logo & Favicon Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Image className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-800">Logo & Favicon</h3>
              </div>

              {/* LOGO BLOCK */}
              <BrandingUploadBlock
                fieldKey="logoUrl"
                title="Current Logo"
                rules={FILE_RULES.logoUrl}
                savedValue={form.logoUrl}
                stagedPreview={stagedPreviews.logoUrl}
                stagedFile={stagedFiles.logoUrl}
                isUploading={uploadingKey === "logoUrl"}
                defaultTitle={form.name}
                defaultSub={form.tagline}
                onSelect={(e) => handleSelectFile(e, "logoUrl")}
                onUpload={() => handleConfirmUpload("logoUrl")}
                onRemove={() => removeFileKey("logoUrl")}
              />

              <div className="h-6" />

              {/* FAVICON BLOCK */}
              <BrandingUploadBlock
                fieldKey="faviconUrl"
                title="Current Favicon"
                rules={FILE_RULES.faviconUrl}
                savedValue={form.faviconUrl}
                stagedPreview={stagedPreviews.faviconUrl}
                stagedFile={stagedFiles.faviconUrl}
                isUploading={uploadingKey === "faviconUrl"}
                defaultTitle={String(form.name || "S").charAt(0)}
                isFavicon
                onSelect={(e) => handleSelectFile(e, "faviconUrl")}
                onUpload={() => handleConfirmUpload("faviconUrl")}
                onRemove={() => removeFileKey("faviconUrl")}
              />
            </div>

            {/* Colors Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-fuchsia-50 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-fuchsia-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-800">Colors & Document Design</h3>
                  <p className="text-[11px] text-slate-400">Applied to PDFs, ID cards, certificates and portals</p>
                </div>
              </div>

              <p className="text-[10px] font-extrabold tracking-[0.1em] text-slate-400 uppercase mb-3">Brand Colors</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <ColorField label="Primary Color" value={form.primaryColor} onChange={(v: string) => update("primaryColor", v)} />
                <ColorField label="Secondary Color" value={form.secondaryColor} onChange={(v: string) => update("secondaryColor", v)} />
              </div>

              <p className="text-[10px] font-extrabold tracking-[0.1em] text-slate-400 uppercase mb-3">Document Design</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="ID Card Template"
                  value={form.idCardTemplate}
                  onChange={(v: string) => update("idCardTemplate", v)}
                  options={["Modern (Color Header)", "Classic", "Minimal", "Bold Stripe"]}
                />
                <ColorField label="ID Card Accent" value={form.idCardAccent} onChange={(v: string) => update("idCardAccent", v)} />
                <SelectField
                  label="Certificate Template"
                  value={form.certificateTemplate}
                  onChange={(v: string) => update("certificateTemplate", v)}
                  options={["Modern (Minimal)", "Classic Border", "Elegant Gold", "Academic Formal"]}
                />
                <ColorField label="Certificate Border Color" value={form.certificateBorder} onChange={(v: string) => update("certificateBorder", v)} />
                <Field label="Certificate Signature Label" value={form.certificateSignLabel} onChange={(v: string) => update("certificateSignLabel", v)} />
                <div>
                  <label className="text-[10px] font-extrabold tracking-[0.08em] text-slate-400 uppercase mb-1.5 block">ID Card Options</label>
                  <div className="flex gap-2">
                    <ToggleChip active={form.showQR} onClick={() => update("showQR", !form.showQR)} label="Show QR" />
                    <ToggleChip active={form.showBloodGroup} onClick={() => update("showBloodGroup", !form.showBloodGroup)} label="Blood Group" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-5">
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#6b7d00] hover:bg-[#5a6a00] text-white text-[13px] font-bold cursor-pointer disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save Branding"}
                </button>
              </div>
            </div>
          </div>

          {/* Signature & Stamp Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-800">Authorised Signature</h3>
              </div>
              <BrandingUploadBlock
                fieldKey="signatureUrl"
                title="Authorised Signature"
                rules={FILE_RULES.signatureUrl}
                savedValue={form.signatureUrl}
                stagedPreview={stagedPreviews.signatureUrl}
                stagedFile={stagedFiles.signatureUrl}
                isUploading={uploadingKey === "signatureUrl"}
                defaultTitle="Authorised Signature"
                defaultSub="No signature uploaded"
                isSignature
                onSelect={(e) => handleSelectFile(e, "signatureUrl")}
                onUpload={() => handleConfirmUpload("signatureUrl")}
                onRemove={() => removeFileKey("signatureUrl")}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Stamp className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-800">Official Stamp / Seal</h3>
              </div>
              <BrandingUploadBlock
                fieldKey="stampUrl"
                title="Official Stamp / Seal"
                rules={FILE_RULES.stampUrl}
                savedValue={form.stampUrl}
                stagedPreview={stagedPreviews.stampUrl}
                stagedFile={stagedFiles.stampUrl}
                isUploading={uploadingKey === "stampUrl"}
                defaultTitle={form.name}
                defaultSub={form.tagline}
                onSelect={(e) => handleSelectFile(e, "stampUrl")}
                onUpload={() => handleConfirmUpload("stampUrl")}
                onRemove={() => removeFileKey("stampUrl")}
              />
            </div>
          </div>
        </form>
      )}

      {/* OTHER TABS */}
      {activeTab === "academic" && (
        <SimpleCard title="Academic" desc="Year and session defaults" icon={GraduationCap}>
          <form onSubmit={(e) => handleSave(e)} className="space-y-4 max-w-xl">
            <Field label="Current Academic Year" value={form.academicYear} onChange={(v: string) => update("academicYear", v)} />
            <SaveButton isSaving={isSaving} />
          </form>
        </SimpleCard>
      )}
      {activeTab === "grade" && (
        <SimpleCard title="Grade Rules" desc="Passing marks and grading" icon={Trophy}>
          <form onSubmit={(e) => handleSave(e)} className="space-y-4 max-w-xl">
            <Field label="Passing Percentage" value={form.passingPercent} onChange={(v: string) => update("passingPercent", v)} />
            <SaveButton isSaving={isSaving} />
          </form>
        </SimpleCard>
      )}
      {activeTab === "notifications" && <SimpleCard title="Notifications" desc="Alert preferences" icon={Bell}><p className="text-sm text-slate-500">Coming soon.</p></SimpleCard>}
      {activeTab === "email" && <SimpleCard title="Email Settings" desc="SMTP configuration" icon={Mail}><p className="text-sm text-slate-500">Coming soon.</p></SimpleCard>}
      {activeTab === "integrations" && <SimpleCard title="Integrations" desc="Third-party tools" icon={Puzzle}><p className="text-sm text-slate-500">Coming soon.</p></SimpleCard>}
      {activeTab === "security" && <SimpleCard title="Security" desc="Password and access" icon={Shield}><p className="text-sm text-slate-500">Coming soon.</p></SimpleCard>}
      {activeTab === "plan" && (
        <SimpleCard title="Plan & Limits" desc="Subscription and usage" icon={Gauge}>
          <Link href="/billing"><button className="bg-[#6272f2] text-[#ffffff] text-xs font-bold px-4 py-2.5 rounded-xl">View Plans</button></Link>
        </SimpleCard>
      )}
    </div>
  );
}

/* 🟢 REUSABLE UPLOAD BLOCK WITH FULL DYNAMIC IMAGE PREVIEW */
function BrandingUploadBlock({
  fieldKey,
  title,
  rules,
  savedValue,
  stagedPreview,
  stagedFile,
  isUploading,
  defaultTitle,
  defaultSub,
  isFavicon,
  isSignature,
  onSelect,
  onUpload,
  onRemove,
}: {
  fieldKey: string;
  title: string;
  rules: { maxMB: string; width: string; height: string; formats: string; accept: string };
  savedValue?: string;
  stagedPreview?: string;
  stagedFile?: File;
  isUploading?: boolean;
  defaultTitle?: string;
  defaultSub?: string;
  isFavicon?: boolean;
  isSignature?: boolean;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const currentDisplayImage = stagedPreview || savedValue;

  return (
    <div>
      {/* Dotted Preview Container - FULL & CLEAR IMAGE DISPLAY */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center mb-3 transition-colors ${
          isSignature
            ? "border-amber-200 bg-[#fffbeb]"
            : stagedFile
            ? "border-[#6b7d00] bg-[#f8f9ea]"
            : "border-indigo-100 bg-[#f5f3ff]"
        } ${isFavicon ? "min-h-[110px]" : "min-h-[160px]"}`}
      >
        {currentDisplayImage ? (
          <>
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm cursor-pointer z-10"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <img
              src={currentDisplayImage}
              alt={title}
              className={`${
                isFavicon
                  ? "w-14 h-14"
                  : isSignature
                  ? "max-h-24 w-auto"
                  : "w-full max-w-[320px] h-auto max-h-[110px] md:max-h-[130px]"
              } object-contain my-1`}
            />
          </>
        ) : isFavicon ? (
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-1">
            <span className="text-[#0a2e5a] font-extrabold text-base">{defaultTitle}</span>
          </div>
        ) : (
          <div className="text-center mb-1">
            {isSignature && (
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-1">
                <Pencil className="w-5 h-5 text-amber-600" />
              </div>
            )}
            <div className="text-[16px] font-extrabold text-[#0a2e5a]">{defaultTitle}</div>
            {defaultSub && <div className="text-[11px] text-slate-500 mt-0.5">{defaultSub}</div>}
          </div>
        )}

        <p className="text-[11px] text-slate-400 font-semibold mt-1">{title}</p>

        {stagedFile && (
          <span className="mt-1 text-[10px] font-bold text-[#6b7d00] bg-white px-2 py-0.5 rounded-full border border-[#c3d18c] flex items-center gap-1 shadow-2xs">
            <FileCheck className="w-3 h-3 text-[#6b7d00]" /> {stagedFile.name} (Ready to upload)
          </span>
        )}
      </div>

      {/* Step 1: Choose File Input */}
      <input
        type="file"
        accept={rules.accept}
        onChange={onSelect}
        className="block w-full text-[12px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-slate-700 file:font-semibold hover:file:bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 mb-1.5 cursor-pointer bg-slate-50/50"
      />

      {/* CLEAR SIZE & DIMENSIONS GUIDELINES */}
      <div className="text-[11px] text-slate-500 mb-3 leading-relaxed space-y-0.5">
        <p className="font-semibold text-slate-600">
          Format: <span className="font-bold text-slate-800">{rules.formats}</span> · Max Size: <span className="font-bold text-red-600">{rules.maxMB}</span>
        </p>
        <p className="font-medium text-slate-500">
          Dimensions: Width: <span className="font-bold text-slate-700">{rules.width}</span> | Height: <span className="font-bold text-slate-700">{rules.height}</span>
        </p>
      </div>

      {/* Step 2: Upload Button */}
      <button
        type="button"
        onClick={onUpload}
        disabled={isUploading}
        className={`w-full h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
          stagedFile
            ? "bg-[#6b7d00] hover:bg-[#5a6a00] text-white ring-2 ring-[#6b7d00]/30"
            : "bg-[#6b7d00] hover:bg-[#5a6a00] text-white opacity-95"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" /> Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4" /> Upload {fieldKey === "logoUrl" ? "Logo" : fieldKey === "faviconUrl" ? "Favicon" : fieldKey === "signatureUrl" ? "Signature" : "Stamp"}
          </>
        )}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold tracking-[0.08em] text-slate-400 uppercase mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-800 outline-none focus:border-[#6272f2] focus:ring-2 focus:ring-[#6272f2]/15"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold tracking-[0.08em] text-slate-400 uppercase mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-slate-200 bg-white">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-md border-0 cursor-pointer p-0 bg-transparent" />
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="flex-1 text-[13px] font-mono font-semibold text-slate-700 outline-none bg-transparent" />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold tracking-[0.08em] text-slate-400 uppercase mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-800 outline-none focus:border-[#6272f2]"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-10 rounded-xl border text-[12px] font-bold cursor-pointer ${
        active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function SimpleCard({ title, desc, icon: Icon, children }: { title: string; desc: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#f0f2fe] text-[#6272f2] flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <p className="text-[12px] text-slate-500">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <button type="submit" disabled={isSaving} className="bg-[#6272f2] hover:bg-[#4f5ee3] text-white px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 disabled:opacity-70 cursor-pointer">
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {isSaving ? "Saving..." : "Save Changes"}
    </button>
  );
}
