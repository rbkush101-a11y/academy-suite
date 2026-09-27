import { useEffect, useMemo, useRef, useState } from "react";
import { useListBatches, useListCourses } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, MapPin, FileText, Upload, UserRound, Search, Check, ChevronDown, X } from "lucide-react";
import { INDIA_STATES, getDistricts } from "@/lib/india-locations";

const CLASS_OPTIONS = ["NURSERY", "L.K.G", "U.K.G", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
const BOARD_OPTIONS = ["CBSE", "ICSE", "UP Board", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COUNTRY_CODES = [
  { code: "+91", name: "India" }, { code: "+1", name: "USA" }, { code: "+44", name: "UK" }, { code: "+971", name: "UAE" },
  { code: "+966", name: "Saudi Arabia" }, { code: "+974", name: "Qatar" }, { code: "+965", name: "Kuwait" }, { code: "+968", name: "Oman" },
  { code: "+973", name: "Bahrain" }, { code: "+92", name: "Pakistan" }, { code: "+880", name: "Bangladesh" }, { code: "+977", name: "Nepal" },
  { code: "+94", name: "Sri Lanka" }, { code: "+61", name: "Australia" }, { code: "+65", name: "Singapore" }, { code: "+60", name: "Malaysia" },
  { code: "+49", name: "Germany" }, { code: "+33", name: "France" }, { code: "+81", name: "Japan" }, { code: "+86", name: "China" },
];

function SectionTitle({ number, icon, children }: any) {
  return <div className="flex items-center gap-3 border-b border-slate-100 pb-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">{icon}</div><div className="flex items-center gap-2"><span className="text-sm font-bold text-red-600">{number}.</span><h2 className="text-base font-bold text-slate-800">{children}</h2></div></div>;
}

function FormRow({ cols = 2, children }: any) { return <div className={`grid gap-4 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{children}</div>; }

function FormInput({ label, required = false, value, onChange, placeholder = "", type = "text" }: any) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</Label><Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 border-slate-300 bg-white text-sm shadow-sm" /></div>;
}

function SearchableDropdown({ label, value, options, onChange, placeholder = "Search...", disabled = false, required = false }: any) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const ref = useRef<HTMLDivElement>(null);
  const normalized = (options || []).map((o: any) => typeof o === "string" ? { label: o, value: o } : o);
  const selected = normalized.find((o: 
    any) => o.value === value);
  const filtered = normalized.filter((o: any) => String(o.label).toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, []);
  return <div className="relative space-y-1.5" ref={ref}>
    <Label className="text-xs font-medium text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</Label>
    <button type="button" disabled={disabled} onClick={() => { setSearch(""); setOpen(v => !v); }} className={`flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm shadow-sm ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "hover:bg-slate-50"}`}>
      <span className={selected ? "text-slate-800" : "text-slate-400"}>{selected?.label || placeholder}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
    {open && !disabled && <div className="absolute left-0 top-[calc(100%+2px)] z-[100] w-full rounded-md border border-slate-200 bg-white p-1.5 shadow-xl">
      <div className="relative mb-1.5"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-blue-500" /></div>
      <div className="max-h-56 overflow-y-auto">{filtered.length ? filtered.map((o: any) => <button key={o.value} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${o.value === value ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}><span>{o.label}</span>{o.value === value && <Check className="h-3.5 w-3.5" />}</button>) : <div className="px-3 py-3 text-center text-xs text-slate-500">No results found</div>}</div>
    </div>}
  </div>;
}

function PhoneField({ label, value, onChange, code, onCodeChange }: any) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">{label}</Label><div className="flex gap-2"><div className="w-[118px]"><SearchableDropdown label="" value={code} options={COUNTRY_CODES.map(c => ({ label: `${c.code} ${c.name}`, value: c.code }))} onChange={onCodeChange} placeholder="Code" /></div><Input value={value || ""} onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))} placeholder="Contact number" className="h-9 text-sm shadow-sm" /></div></div>;
}

function WhatsappField({ value, onChange, code, onCodeChange }: any) { return <PhoneField label="WhatsApp Number" value={value} onChange={onChange} code={code} onCodeChange={onCodeChange} />; }
function EmailField({ value, onChange }: any) { return <FormInput label="Parent Email" type="email" value={value} onChange={onChange} placeholder="Enter email address" />; }
function PercentField({ value, onChange }: any) { return <FormInput label="Last Class Percentage" value={value} onChange={(v: string) => onChange(v.replace(/[^0-9.]/g, "").slice(0, 6))} placeholder="Example: 85.5" />; }

export default function OnlineAdmissionForm() {
  const { data: coursesData } = useListCourses(); const { data: batchesData } = useListBatches();
  const courses: any[] = Array.isArray(coursesData) ? coursesData : []; const batches: any[] = Array.isArray(batchesData) ? batchesData : [];
  const [form, setForm] = useState<any>({ name:"", dateOfBirth:"", gender:"", genderOther:"", bloodGroup:"", schoolName:"", academicYear:"2026-2027", photoDataUrl:"", className:"", section:"", board:"", boardOther:"", lastClassPercentage:"", lastClassMarks:"", courseId:"", batchId:"", motherName:"", motherOccupation:"", motherPhone:"", motherPhoneCode:"+91", motherWhatsapp:"", motherWhatsappCode:"+91", fatherName:"", fatherOccupation:"", fatherPhone:"", fatherPhoneCode:"+91", fatherWhatsapp:"", fatherWhatsappCode:"+91", emergencyPhone:"", emergencyPhoneCode:"+91", email:"", correspondenceAddress:"", correspondenceState:"", correspondenceDistrict:"", correspondencePin:"", aadhaarCard:"", previousMarksheet:"" });
  const setValue = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));
  const filteredBatches = useMemo(() => !form.courseId ? [] : batches.filter((b: any) => String(b.courseId || b.course?.id || "") === String(form.courseId)), [batches, form.courseId]);

  const photo = (file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setValue("photoDataUrl", String(r.result || "")); r.readAsDataURL(file); };
  const doc = (key: string, file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setValue(key, String(r.result || file.name)); r.readAsDataURL(file); };

  return <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 px-3 py-6 md:px-6 md:py-8">
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="text-center pb-2"><h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">Second School Classes</h1><h2 className="mt-2 text-xl font-bold tracking-tight text-slate-800 md:text-2xl">Online Admission Aplication Form 2026-2027</h2><p className="mt-2 text-sm text-slate-500">Please fill in all required details carefully.</p></header>

      <div className="space-y-5 pt-1">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-6"><SectionTitle number={1} icon={<GraduationCap className="h-5 w-5" />}>Student's Information</SectionTitle>
          <div className="grid gap-5 md:grid-cols-[1fr_200px]"><div className="space-y-4">
            <FormRow><FormInput label="Student Name" required value={form.name} onChange={(v:string)=>setValue("name",v)} placeholder="Enter student name"/><FormInput label="Date of Birth" required type="date" value={form.dateOfBirth} onChange={(v:string)=>setValue("dateOfBirth",v)}/></FormRow>
            <FormRow><div className="space-y-2"><SearchableDropdown label="Gender" value={form.gender} required options={GENDER_OPTIONS.map(x=>({label:x,value:x.toLowerCase()}))} placeholder="Select gender" onChange={(v:string)=>{setValue("gender",v);if(v!=="other")setValue("genderOther","")}}/>{form.gender==="other"&&<FormInput label="Specify Gender" required value={form.genderOther} onChange={(v:string)=>setValue("genderOther",v)} placeholder="Type gender"/>}</div><SearchableDropdown label="Blood Group (Optional)" value={form.bloodGroup} options={BLOOD_GROUP_OPTIONS} placeholder="Select blood group" onChange={(v:string)=>setValue("bloodGroup",v)}/></FormRow>
            <FormRow><FormInput label="School Name" value={form.schoolName} onChange={(v:string)=>setValue("schoolName",v)} placeholder="Enter school name"/><FormInput label="Academic Year" required value={form.academicYear} onChange={(v:string)=>setValue("academicYear",v)}/></FormRow>
          </div><div className="rounded-xl border-2 border-dashed bg-slate-50 p-3"><Label className="block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Student Photo</Label><div className="mx-auto mt-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg ring-2 ring-primary/20">{form.photoDataUrl?<img src={form.photoDataUrl} alt="Student" className="h-full w-full object-cover"/>:<UserRound className="h-14 w-14 text-slate-300"/>}</div><div className="mt-4 grid grid-cols-2 gap-2"><label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-xs font-semibold shadow-sm hover:bg-slate-50"><Upload className="h-3.5 w-3.5"/>Upload<input type="file" accept="image/*" className="hidden" onChange={e=>photo(e.target.files?.[0])}/></label><label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white text-xs font-semibold shadow-sm hover:bg-slate-50"><Upload className="h-3.5 w-3.5"/>Camera<input type="file" accept="image/*" capture="user" className="hidden" onChange={e=>photo(e.target.files?.[0])}/></label></div>{form.photoDataUrl&&<Button type="button" variant="ghost" className="mt-2 h-7 w-full text-xs text-red-600 hover:bg-red-50" onClick={()=>setValue("photoDataUrl","")}><X className="mr-1 h-3 w-3"/>Remove</Button>}</div></div>
          <FormRow cols={3}><SearchableDropdown label="Class" value={form.className} options={CLASS_OPTIONS} placeholder="Select class" onChange={(v:string)=>setValue("className",v)}/><FormInput label="Section" value={form.section} onChange={(v:string)=>setValue("section",v)} placeholder="Example: A"/><div className="space-y-2"><SearchableDropdown label="Board" value={form.board} options={BOARD_OPTIONS} placeholder="Select board" onChange={(v:string)=>{setValue("board",v);if(v!=="Other")setValue("boardOther","")}}/>{form.board==="Other"&&<FormInput label="Specify Board Name" required value={form.boardOther} onChange={(v:string)=>setValue("boardOther",v)} placeholder="Type board name"/>}</div></FormRow>
          <FormRow><PercentField value={form.lastClassPercentage} onChange={(v:string)=>setValue("lastClassPercentage",v)}/><FormInput label="Marks Obtained in Last Class" value={form.lastClassMarks} onChange={(v:string)=>setValue("lastClassMarks",v)} placeholder="Example: 410 / 500"/></FormRow>
          <FormRow><SearchableDropdown label="Course" required value={form.courseId} options={courses.map((c:any)=>({label:c.name,value:c.id}))} placeholder="Select course" onChange={(v:string)=>setForm((old:any)=>({...old,courseId:v,batchId:""}))}/><SearchableDropdown label="Batch" required value={form.batchId} options={filteredBatches.map((b:any)=>({label:b.name,value:b.id}))} placeholder={form.courseId?"Select batch":"Select course first"} disabled={!form.courseId} onChange={(v:string)=>setValue("batchId",v)}/></FormRow>
        </CardContent></Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-6"><SectionTitle number={2} icon={<Users className="h-5 w-5"/>}>Parent's Information</SectionTitle>
          <div className="rounded-xl border p-4"><h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full bg-pink-500"/>Mother's Details</h3><div className="grid gap-4 md:grid-cols-2"><FormInput label="Mother's Name" value={form.motherName} onChange={(v:string)=>setValue("motherName",v)}/><FormInput label="Occupation" value={form.motherOccupation} onChange={(v:string)=>setValue("motherOccupation",v)}/><PhoneField label="Contact Number" value={form.motherPhone} onChange={(v:string)=>setValue("motherPhone",v)} code={form.motherPhoneCode} onCodeChange={(v:string)=>setValue("motherPhoneCode",v)}/><WhatsappField value={form.motherWhatsapp} onChange={(v:string)=>setValue("motherWhatsapp",v)} code={form.motherWhatsappCode} onCodeChange={(v:string)=>setValue("motherWhatsappCode",v)}/></div></div>
          <div className="rounded-xl border p-4"><h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full bg-blue-500"/>Father's Details</h3><div className="grid gap-4 md:grid-cols-2"><FormInput label="Father's Name" value={form.fatherName} onChange={(v:string)=>setValue("fatherName",v)}/><FormInput label="Occupation" value={form.fatherOccupation} onChange={(v:string)=>setValue("fatherOccupation",v)}/><PhoneField label="Contact Number" value={form.fatherPhone} onChange={(v:string)=>setValue("fatherPhone",v)} code={form.fatherPhoneCode} onCodeChange={(v:string)=>setValue("fatherPhoneCode",v)}/><WhatsappField value={form.fatherWhatsapp} onChange={(v:string)=>setValue("fatherWhatsapp",v)} code={form.fatherWhatsappCode} onCodeChange={(v:string)=>setValue("fatherWhatsappCode",v)}/></div></div>
          <FormRow><PhoneField label="Emergency Contact" value={form.emergencyPhone} onChange={(v:string)=>setValue("emergencyPhone",v)} code={form.emergencyPhoneCode} onCodeChange={(v:string)=>setValue("emergencyPhoneCode",v)}/><EmailField value={form.email} onChange={(v:string)=>setValue("email",v)}/></FormRow>
        </CardContent></Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-6"><SectionTitle number={3} icon={<MapPin className="h-5 w-5"/>}>Address Details</SectionTitle><div className="rounded-xl border p-4"><FormInput label="Address" value={form.correspondenceAddress} onChange={(v:string)=>setValue("correspondenceAddress",v)}/><div className="mt-4 grid gap-4 md:grid-cols-3"><SearchableDropdown label="State" value={form.correspondenceState} options={INDIA_STATES} placeholder="Search state" onChange={(v:string)=>setForm((old:any)=>({...old,correspondenceState:v,correspondenceDistrict:""}))}/><SearchableDropdown label="District" value={form.correspondenceDistrict} options={getDistricts(form.correspondenceState)} placeholder={form.correspondenceState?"Search district":"Select state first"} disabled={!form.correspondenceState} onChange={(v:string)=>setValue("correspondenceDistrict",v)}/><FormInput label="PIN" value={form.correspondencePin} onChange={(v:string)=>setValue("correspondencePin",v.replace(/\D/g,"").slice(0,6))} placeholder="6 digit"/></div></div></CardContent></Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="space-y-5 p-6"><SectionTitle number={4} icon={<FileText className="h-5 w-5"/>}>Documents</SectionTitle><p className="-mt-2 text-xs text-slate-500">Upload Aadhaar Card and Previous Class Marksheet (Image/PDF, Max 5MB)</p><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3 rounded-xl border p-4"><Label className="text-xs font-medium text-slate-600">Aadhaar Card</Label>{form.aadhaarCard?<><div className="flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">✅ Aadhaar uploaded</div><Button type="button" variant="ghost" className="h-8 w-full text-xs text-red-600 hover:bg-red-50" onClick={()=>setValue("aadhaarCard","")}><X className="mr-1 h-3 w-3"/>Remove</Button></>:<label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-slate-50 text-xs font-semibold hover:bg-slate-100"><Upload className="h-4 w-4 text-slate-500"/>Upload Aadhaar<input type="file" accept="image/*,application/pdf" className="hidden" onChange={e=>doc("aadhaarCard",e.target.files?.[0])}/></label>}</div><div className="space-y-3 rounded-xl border p-4"><Label className="text-xs font-medium text-slate-600">Previous Class Marksheet</Label>{form.previousMarksheet?<><div className="flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">✅ Marksheet uploaded</div><Button type="button" variant="ghost" className="h-8 w-full text-xs text-red-600 hover:bg-red-50" onClick={()=>setValue("previousMarksheet","")}><X className="mr-1 h-3 w-3"/>Remove</Button></>:<label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-slate-50 text-xs font-semibold hover:bg-slate-100"><Upload className="h-4 w-4 text-slate-500"/>Upload Marksheet<input type="file" accept="image/*,application/pdf" className="hidden" onChange={e=>doc("previousMarksheet",e.target.files?.[0])}/></label>}</div></div></CardContent></Card>

        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" className="h-11 px-6" onClick={()=>window.close()}>Close</Button><Button type="button" className="h-11 bg-[#4d7c0f] px-6 font-medium text-white shadow-sm hover:bg-[#3f660c]">Submit Admission Application</Button></div>
      </div>
    </div>
  </div>;
}
