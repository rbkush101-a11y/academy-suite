import { 
  useListStaff, getListStaffQueryKey, 
  useListBatches, useListCourses, useListSubjects
} from "@workspace/api-client-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Plus, Pencil, Trash2, Upload, UserRound, LayoutGrid, List, 
  Users, CheckCircle2, Calendar, IndianRupee, ChevronDown, Mail, Phone, ArrowLeft, 
  Save, Check, Eye, EyeOff, KeyRound, ShieldCheck, Briefcase, 
  FileText, DownloadCloud, Lock, FolderOpen, MapPin, X, FileUp, Sparkles,
  ClipboardList, AlarmClock, Timer, Info, Camera, MoreVertical
} from "lucide-react";

// ======================== DATA CONSTANTS (Fallbacks) ========================
const QUALIFICATIONS_LIST = [
  "10th", "12th", "UG", "PG", "PhD", "B.Ed", "Diploma", "Other"
];

const FALLBACK_COURSES = [
  "Class 6th", "Class 7th", "Class 8th", "Class 9th", "Class 10th",
  "Class 11th - Science (PCM)", "Class 11th - Science (PCB)", "Class 11th - Commerce", "Class 11th - Arts",
  "Class 12th - Science (PCM)", "Class 12th - Science (PCB)", "Class 12th - Commerce", "Class 12th - Arts",
  "JEE Main / Advanced", "NEET Medical", "Foundation Course", "Crash Course", "Computer / Coding Course"
];

const FALLBACK_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Science",
  "English", "Hindi", "Social Studies", "History", "Geography", "Civics",
  "Accountancy", "Economics", "Business Studies", "Statistics",
  "Computer Science", "IP", "Python Programming", "Web Development"
];

const INDIA_STATES_AND_DISTRICTS: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Sri Potti Sriramulu Nellore", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaour", "Solan", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Mando", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Wayanad", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumgarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Bara Banki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Rae Bareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

type StaffDocument = { label: string; name: string; dataUrl: string; mimeType: string; };

type SubjectTaughtRow = {
  course: string;
  subject: string;
  batch: string;
};

type StaffForm = {
  empId: string; name: string; firstName: string; lastName: string; email: string; phone: string; homePhone: string;
  role: string; customRole: string; staffType: "academic" | "computer";
  positionTitle: string; qualification: string; otherQualification: string; subject: string; experience: string; joinDate: string; status: "active" | "inactive";
  employeeStatus: string; payRateType: string; workTimingFrom: string; workTimingTo: string; contractWorkDetail: string; 
  gender: string; otherGender: string; dateOfBirth: string;
  
  localAddress: string; localState: string; localDistrict: string; localPin: string;
  permanentAddress: string; permanentState: string; permanentDistrict: string; permanentPin: string;
  
  aadhaarNumber: string; panNumber: string; bloodGroup: string; 
  bankName: string; bankBranch: string; accountName: string; accountNumber: string; ifscCode: string; upiId: string; 
  photoDataUrl: string; documents: StaffDocument[];
  loginEnabled: boolean; username: string; password: string; confirmPassword: string; accessLevel: string;
  
  subjectsTaught: SubjectTaughtRow[];
  employmentType: "full_time" | "contractual" | "hybrid" | "hourly";
  monthlySalary: string;
  perClassRate: string;
  baseSalary: string;
  hourlyRate: string;
  pfDeduction: string;
  tdsDeduction: string;
  batches: string[];
};

const blankForm: StaffForm = {
  empId: "", name: "", firstName: "", lastName: "", email: "", phone: "", homePhone: "",
  role: "", customRole: "", staffType: "academic", positionTitle: "", qualification: "", otherQualification: "", subject: "", experience: "", 
  joinDate: new Date().toISOString().split("T")[0], status: "active", employeeStatus: "", payRateType: "monthly", workTimingFrom: "", workTimingTo: "", contractWorkDetail: "", 
  gender: "", otherGender: "", dateOfBirth: "",
  localAddress: "", localState: "", localDistrict: "", localPin: "", 
  permanentAddress: "", permanentState: "", permanentDistrict: "", permanentPin: "",
  aadhaarNumber: "", panNumber: "", bloodGroup: "", bankName: "", bankBranch: "", accountName: "", accountNumber: "", ifscCode: "", upiId: "",
  photoDataUrl: "", documents: [],
  loginEnabled: false, username: "", password: "", confirmPassword: "", accessLevel: "staff",
  
  subjectsTaught: [{ course: "", subject: "", batch: "" }],
  employmentType: "full_time",
  monthlySalary: "",
  perClassRate: "",
  baseSalary: "",
  hourlyRate: "",
  pfDeduction: "12",
  tdsDeduction: "0",
  batches: [],
};

const STAFF_ROLES = [
  "Director / Owner", "Academic Coordinator", "Teacher / Faculty", "Computer Faculty",
  "Receptionist", "Counsellor", "Telecaller", "Accountant", "Admin / Office Staff",
  "Marketing Executive", "IT / Technical Support", "Support Staff", "Other"
];

const ACCESS_LEVELS = [
  { value: "admin", label: "Admin (Full Access)" },
  { value: "manager", label: "Manager (Manage Staff & Students)" },
  { value: "teacher", label: "Teacher (View Own Classes)" },
  { value: "accountant", label: "Accountant (Fees & Payroll)" },
  { value: "receptionist", label: "Receptionist (Admissions Only)" },
  { value: "staff", label: "Staff (Basic Access)" },
];

const EMP_TYPES = [
  { id: 'full_time', label: 'Full-Time', desc: 'Fixed monthly salary, pro-rated by attendance', icon: Briefcase, iconColor: 'text-amber-800', iconBg: 'bg-green-50' },
  { id: 'contractual', label: 'Contractual', desc: 'Pay per class/lecture taken', icon: ClipboardList, iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
  { id: 'hybrid', label: 'Part-Time / Hybrid', desc: 'Base salary + per-class rate', icon: AlarmClock, iconColor: 'text-pink-500', iconBg: 'bg-pink-50' },
  { id: 'hourly', label: 'Hourly Basis', desc: 'Pay per working hour', icon: Timer, iconColor: 'text-purple-700', iconBg: 'bg-indigo-50' }
];

// SYSTEM INTERNAL METADATA KEYS FOR UNSUPPORTED SCHEMA FIELDS
const META_GENDER_KEY = "__SYSTEM_GENDER_SPECIFICATION__";
const META_QUALIFICATION_KEY = "__SYSTEM_QUALIFICATION_SPECIFICATION__";
const META_EMPID_KEY = "__SYSTEM_EMPID_SPECIFICATION__"; 
const META_STATE_KEY = "__SYSTEM_STATE_SPECIFICATION__";
const META_DISTRICT_KEY = "__SYSTEM_DISTRICT_SPECIFICATION__";
const META_PIN_KEY = "__SYSTEM_PIN_SPECIFICATION__";
const META_PERM_ADDRESS_KEY = "__SYSTEM_PERM_ADDRESS_SPECIFICATION__";
const META_PERM_STATE_KEY = "__SYSTEM_PERM_STATE_SPECIFICATION__";
const META_PERM_DISTRICT_KEY = "__SYSTEM_PERM_DISTRICT_SPECIFICATION__";
const META_PERM_PIN_KEY = "__SYSTEM_PERM_PIN_SPECIFICATION__";
const META_SUBJECTS_TAUGHT_KEY = "__SYSTEM_SUBJECTS_TAUGHT__"; // FIX: SUBJECTS PERSISTENCE KEY

const ALL_SYSTEM_META_KEYS = [
  META_GENDER_KEY, META_QUALIFICATION_KEY, META_EMPID_KEY, 
  META_STATE_KEY, META_DISTRICT_KEY, META_PIN_KEY,
  META_PERM_ADDRESS_KEY, META_PERM_STATE_KEY, META_PERM_DISTRICT_KEY, META_PERM_PIN_KEY,
  META_SUBJECTS_TAUGHT_KEY
];

// ======================== HELPERS ========================
function Field({ label, value, onChange, type = "text", placeholder = "", required = false, autoComplete = "off" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; autoComplete?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input type={type} value={value || ""} placeholder={placeholder} onChange={(e: any) => onChange(e.target.value)} autoComplete={autoComplete} className="text-sm bg-gray-50/50 focus-visible:ring-[#5B7023]" />
    </div>
  );
}

function PayrollInput({ label, value, onChange, prefix, suffix, subtext, required, type = "text" }: any) {
  return (
    <div className="space-y-1.5 flex-1 min-w-[120px]">
      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 transition-all h-[38px]">
        {prefix && <span className="px-3 h-full flex items-center bg-gray-50/80 border-r border-gray-200 text-gray-600 text-sm font-medium">{prefix}</span>}
        <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 text-sm outline-none bg-transparent font-medium text-gray-800" />
        {suffix && <span className="px-3 h-full flex items-center bg-gray-50/80 border-l border-gray-200 text-gray-600 text-sm font-medium">{suffix}</span>}
      </div>
      {subtext && <p className="text-[10.5px] text-gray-500 mt-1 leading-tight">{subtext}</p>}
    </div>
  );
}

// Global SearchableSelect Component
function SearchableSelect({ options, value, onChange, placeholder = "Select...", disabled = false }: { options: string[]; value: string; onChange: (val: string) => void; placeholder?: string; disabled?: boolean; }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase())), [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchTerm("");
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((p) => !p)} className={`w-full h-10 px-3 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-md shadow-sm flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#5B7023] ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
        <span className={value ? "text-gray-800 truncate" : "text-gray-500"}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 rounded-t-xl">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Type to search..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B7023]" autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48 p-1 rounded-b-xl bg-white">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => (
                <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); setSearchTerm(""); }} className={`w-full px-3 py-2 text-xs text-left rounded-lg transition flex items-center justify-between ${value === opt ? "bg-[#F0F4E8] text-[#5B7023] font-semibold" : "hover:bg-gray-50 text-gray-700"}`}>
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check size={14} className="text-[#5B7023] shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 h-full">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm font-semibold text-gray-800 break-words">{value || "—"}</div>
    </div>
  );
}

const getDisplayEmpId = (member: any) => {
  if (!member) return "";
  if (member.employeeId) return member.employeeId;
  if (member.empId) return member.empId;
  const empIdDoc = Array.isArray(member.documents) ? member.documents.find((d: any) => d.label === META_EMPID_KEY) : null;
  if (empIdDoc?.name) return empIdDoc.name;
  return (member.id || member._id)?.slice(-6) || "EMP";
};

// ======================== MAIN COMPONENT ========================
export default function Staff() {
  const [location] = useLocation();
  const staffTypeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = staffTypeFromUrl === "academic" || staffTypeFromUrl === "computer" ? staffTypeFromUrl : null;
  const pageTitle = pageType === "academic" ? "Academic Staff" : pageType === "computer" ? "Computer Staff" : "Staff Directory";

  const queryClient = useQueryClient();
  const { data: staffData, isLoading } = useListStaff();
  const staff = (staffData as any[]) ?? [];

  // ================= FETCH REAL DATA FOR DROPDOWNS =================
  const { data: rawBatches } = useListBatches();
  const { data: rawCourses } = useListCourses();
  const { data: rawSubjects } = useListSubjects();
  
  const availableBatches = useMemo(() => {
    if (!rawBatches) return [];
    const list = Array.isArray(rawBatches) ? rawBatches : (rawBatches as any).data || (rawBatches as any).batches || [];
    return list.map((b: any) => typeof b === "string" ? b : (b.name || b.title || b.batchName || "")).filter(Boolean);
  }, [rawBatches]);

  const availableCourses = useMemo(() => {
    if (!rawCourses) return FALLBACK_COURSES;
    const list = Array.isArray(rawCourses) ? rawCourses : (rawCourses as any).data || (rawCourses as any).courses || [];
    const mapped = list.map((c: any) => typeof c === "string" ? c : (c.name || c.courseName || c.title || "")).filter(Boolean);
    return mapped.length > 0 ? mapped : FALLBACK_COURSES;
  }, [rawCourses]);

  const availableSubjects = useMemo(() => {
    if (!rawSubjects) return FALLBACK_SUBJECTS;
    const list = Array.isArray(rawSubjects) ? rawSubjects : (rawSubjects as any).data || (rawSubjects as any).subjects || [];
    const mapped = list.map((s: any) => typeof s === "string" ? s : (s.name || s.subjectName || s.title || "")).filter(Boolean);
    return mapped.length > 0 ? mapped : FALLBACK_SUBJECTS;
  }, [rawSubjects]);

  // Options with "None" appended
  const courseOptionsWithNone = useMemo(() => ["None", ...availableCourses], [availableCourses]);
  const subjectOptionsWithNone = useMemo(() => ["None", ...availableSubjects], [availableSubjects]);
  const batchOptionsWithNone = useMemo(() => ["None", "All Batches", ...availableBatches], [availableBatches]);
  // =================================================================

  const [viewMode, setViewMode] = useState<"list" | "form" | "view">("list");
  const [profileTab, setProfileTab] = useState<"overview" | "attendance" | "payroll" | "payslip">("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [designationTab, setDesignationTab] = useState<string>("All Staff");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  const [viewing, setViewing] = useState<any>(null);

  const viewDocInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (member: any) => {
    const name = member?.name || `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "Staff Member";
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "ST";
  };

  const subjectCount = (member: any) => {
    const rows = Array.isArray(member?.subjectsTaught) ? member.subjectsTaught.filter((x: any) => x?.course || x?.subject) : [];
    if (rows.length) return rows.length;
    return String(member?.subject || "").split(",").map((x: string) => x.trim()).filter(Boolean).length;
  };

  const assignedBatchNames = (member: any): string[] => {
    const rows = Array.isArray(member?.subjectsTaught) ? member.subjectsTaught : [];
    const fromRows = rows.map((x: any) => x?.batch).filter(Boolean);
    const fromBatches = Array.isArray(member?.batches)
      ? member.batches.map((x: any) => typeof x === "string" ? x : x?.name || x?.batchName || x?.title).filter(Boolean)
      : [];
    return Array.from(new Set([...fromRows, ...fromBatches].map(String)));
  };

  const attendancePercent = (member: any) => Number(member?.attendancePercentage ?? member?.attendancePercent ?? member?.attendance ?? 0) || 0;
  const attendanceStats = (member: any) => ({
    present: Number(member?.presentDays ?? member?.attendancePresent ?? member?.attendanceStats?.present ?? 0) || 0,
    absent: Number(member?.absentDays ?? member?.attendanceAbsent ?? member?.attendanceStats?.absent ?? 0) || 0,
  });

  // Attendance records are read from whichever common field the API provides.
  // No attendance dates are invented when the backend has not supplied them.
  const attendanceRecords = (member: any): Record<string, string> => {
    const raw = member?.attendanceRecords ?? member?.attendanceHistory ?? member?.attendanceLog ?? member?.attendanceDetails ?? [];
    const records: Record<string, string> = {};
    if (Array.isArray(raw)) {
      raw.forEach((item: any) => {
        const date = item?.date ?? item?.attendanceDate ?? item?.day;
        const status = String(item?.status ?? item?.attendanceStatus ?? "").toLowerCase();
        if (date && status) records[String(date).slice(0, 10)] = status;
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([date, value]: [string, any]) => {
        const status = typeof value === "string" ? value : value?.status ?? value?.attendanceStatus ?? "";
        if (status) records[String(date).slice(0, 10)] = String(status).toLowerCase();
      });
    }
    return records;
  };

  const attendanceCalendar = (member: any, year = new Date().getFullYear(), month = new Date().getMonth()) => {
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const records = attendanceRecords(member);
    const cells: Array<{ day: number | null; date?: string; status?: string }> = [];
    const mondayOffset = (first.getDay() + 6) % 7;
    for (let i = 0; i < mondayOffset; i++) cells.push({ day: null });
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, date, status: records[date] });
    }
    while (cells.length % 7) cells.push({ day: null });
    return { year, month, cells, records };
  };

  const attendanceStatusClass = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present") || s === "p") return "bg-[#D5F7E5] text-[#008F63]";
    if (s.includes("absent") || s === "a") return "bg-[#FFE0E0] text-[#C62828]";
    if (s.includes("late") || s === "l") return "bg-[#FFF0C7] text-[#A56A00]";
    return "";
  };

  const attendanceStatusLabel = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("present") || s === "p") return "Present";
    if (s.includes("absent") || s === "a") return "Absent";
    if (s.includes("late") || s === "l") return "Late";
    return "";
  };
  // Payroll/payslip data must come from the staff record/API. Do not create
  // placeholder "Current Month" slips when the backend has no real records.
  const payrollRecords = (member: any): any[] => {
    const candidates = [
      member?.payslips,
      member?.payrollHistory,
      member?.payrollRecords,
      member?.payroll?.history,
      member?.payroll?.records,
    ];
    const source = candidates.find((value: any) => Array.isArray(value));
    return Array.isArray(source) ? source : [];
  };

  const payslipCount = (member: any) => payrollRecords(member).length;
  const estimatedNet = (member: any) => {
    const salary = Number(member?.salary || member?.monthlySalary || 0) || 0;
    const pf = Number(member?.pfDeduction || 0) || 0;
    const tds = Number(member?.tdsDeduction || 0) || 0;
    return Math.max(0, salary * (1 - (pf + tds) / 100));
  };
  const formatEmploymentType = (value: any) => {
    if (!value) return "Full time";
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  };
  const leaveQuota = (member: any) => {
    const q = member?.leaveQuota || {};
    const make = (key: string, label: string, fallback: number, dot: string) => ({
      label,
      total: Number(q?.[key]?.total ?? q?.[key] ?? fallback) || 0,
      used: Number(q?.[key]?.used ?? 0) || 0,
      dot,
    });
    return [
      make("casual", "Casual Leave", 12, "bg-blue-500"),
      make("earned", "Earned Leave", 15, "bg-emerald-500"),
      make("lossOfPay", "Loss of Pay", 0, "bg-slate-500"),
      make("maternity", "Maternity Leave", 180, "bg-pink-500"),
      make("sick", "Sick Leave", 8, "bg-red-500"),
      make("unpaid", "Unpaid Leave", 10, "bg-blue-600"),
    ];
  };
  const viewDocuments = (member: any) => Array.isArray(member?.documents)
    ? member.documents.filter((d: any) => !ALL_SYSTEM_META_KEYS.includes(d.label))
    : [];
  const payslipList = (member: any) => payrollRecords(member);

  const pdfSafe = (value: any) =>
    String(value ?? "")
      .replace(/₹/g, "Rs. ")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/[\\()]/g, (c) => `\\${c}`)
      .slice(0, 180);

  // Downloads the API's original PDF when one is supplied; otherwise creates
  // a PDF from the actual payroll record shown on screen.
  const downloadPayslipPdf = (slip: any, index: number) => {
    if (!viewing) return;

    const providedUrl = slip?.pdfUrl || slip?.pdfDataUrl || slip?.fileUrl || slip?.dataUrl;
    if (typeof providedUrl === "string" && providedUrl.startsWith("data:application/pdf")) {
      const a = document.createElement("a");
      a.href = providedUrl;
      a.download = `${pdfSafe(viewing.name || "Staff")}-${pdfSafe(slip?.month || `Payslip-${index + 1}`)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    const gross = Number(slip?.gross ?? slip?.grossPay ?? slip?.amount ?? 0) || 0;
    const deductions = Number(
      slip?.deductions ??
      slip?.deduction ??
      (Number(slip?.pfAmount ?? 0) + Number(slip?.tdsAmount ?? 0))
    ) || 0;
    const net = Number(slip?.netPay ?? slip?.net ?? Math.max(0, gross - deductions)) || 0;
    const pf = Number(slip?.pf ?? slip?.pfAmount ?? viewing?.pfDeduction ?? 0) || 0;
    const tds = Number(slip?.tds ?? slip?.tdsAmount ?? viewing?.tdsDeduction ?? 0) || 0;
    const present = slip?.presentDays != null && slip?.workingDays != null
      ? `${slip.presentDays}/${slip.workingDays}`
      : "Not available";

    const name = viewing?.name || `${viewing?.firstName || ""} ${viewing?.lastName || ""}`.trim() || "Staff Member";
    const month = slip?.month || slip?.payPeriod || slip?.period || "Payslip";
    const status = slip?.status || "Not specified";
    const lines = [
      "STAFF PAYSLIP",
      "",
      `Employee: ${name}`,
      `Employee ID: ${getDisplayEmpId(viewing)}`,
      `Email: ${viewing?.email || "Not available"}`,
      `Pay Period: ${month}`,
      "",
      `Gross Pay: Rs. ${gross.toLocaleString("en-IN")}`,
      `Deductions: Rs. ${deductions.toLocaleString("en-IN")}`,
      `Net Pay: Rs. ${net.toLocaleString("en-IN")}`,
      `PF: ${pf}${pf <= 100 ? "%" : " Rs."}`,
      `TDS: ${tds}${tds <= 100 ? "%" : " Rs."}`,
      `Present / Working Days: ${present}`,
      `Status: ${status}`,
      "",
      "Generated from the staff payroll record.",
    ];

    const streamLines = [
      "BT",
      "/F1 16 Tf",
      "50 760 Td",
      `(${pdfSafe(lines[0])}) Tj`,
      "/F1 10 Tf",
      ...lines.slice(1).flatMap((line) => ["0 -20 Td", `(${pdfSafe(line)}) Tj`]),
      "ET",
    ];
    const stream = streamLines.join("\n");

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${String(name).replace(/[^a-z0-9]+/gi, "-")}-${String(month).replace(/[^a-z0-9]+/gi, "-")}-payslip.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const handleViewDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewing) return;
    if (file.size > 5_000_000) { alert("Documents must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const docObj: StaffDocument = { label: file.name.split(".")[0], name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      setViewing((prev: any) => ({ ...prev, documents: [...(Array.isArray(prev?.documents) ? prev.documents : []), docObj] }));
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get("view");
    if (!viewId) return;

    let targetStaff: any = null;
    const storedId = localStorage.getItem("active_staff_id");
    const storedData = localStorage.getItem("view_staff_data");

    if (storedId === String(viewId) && storedData) {
      try {
        const parsed = JSON.parse(storedData);
        targetStaff = parsed.raw || parsed;
      } catch (err) { console.error("Error parsing stored staff data:", err); }
    }

    if (!targetStaff && staff) {
      const staffArray = (() => {
        if (Array.isArray(staff)) return staff;
        if (Array.isArray((staff as any).data)) return (staff as any).data;
        if (Array.isArray((staff as any).staff)) return (staff as any).staff;
        if (Array.isArray((staff as any).users)) return (staff as any).users;
        return [];
      })();
      targetStaff = staffArray.find((st: any) => String(st.id || st._id) === String(viewId));
    }

    if (targetStaff) {
      setViewing(targetStaff);
      setProfileTab("overview");
      localStorage.removeItem("active_staff_id");
      localStorage.removeItem("view_staff_data");
      const cleanSearch = window.location.search.replace(/[?&]view=[^&]+/, "").replace(/[?&]action=[^&]+/, "");
      const cleanUrl = window.location.pathname + (cleanSearch.startsWith("&") ? "?" + cleanSearch.substring(1) : cleanSearch);
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [staff, location]);

  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<StaffForm>(blankForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sameAsCorrespondence, setSameAsCorrespondence] = useState(false);

  const [newDocLabel, setNewDocLabel] = useState("");
  const docFileRef = useRef<HTMLInputElement>(null);
  const aadhaarFileRef = useRef<HTMLInputElement>(null);
  const panFileRef = useRef<HTMLInputElement>(null);

  // ================= LIVE CAMERA (FIXED BLACK SCREEN) =================
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      const msg = err?.name === "NotAllowedError"
        ? "Camera permission denied. Browser address bar mein camera allow karo."
        : err?.name === "NotFoundError"
        ? "Koi camera device nahi mila."
        : "Camera access fail. Sirf HTTPS ya localhost pe chalta hai.";
      alert(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      alert("Camera ready nahi hai. 1 second wait karke phir try karo.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror image theek karne ke liye seedha draw (HTML preview mirrored h bas)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setValue("photoDataUrl", dataUrl);
    stopCamera();
  };

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;
    let tries = 0;

    const attach = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const stream = streamRef.current;

      if (!video || !stream) {
        if (tries < 20) {
          tries += 1;
          setTimeout(attach, 50);
        }
        return;
      }

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch((e) => {
          console.warn("video.play() blocked:", e);
          setTimeout(() => video.play().catch(() => {}), 100);
        });
      }
    };

    requestAnimationFrame(() => attach());

    return () => { cancelled = true; };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);
  // ====================================================================

  const setValue = (key: keyof StaffForm, value: any) => setForm((old) => ({ ...old, [key]: value }));

  // Subjects Taught Row Helpers
  const addSubjectRow = () => {
    setForm(prev => ({
      ...prev,
      subjectsTaught: [...prev.subjectsTaught, { course: "", subject: "", batch: "" }]
    }));
  };

  const updateSubjectRow = (index: number, field: keyof SubjectTaughtRow, value: string) => {
    setForm(prev => {
      const updated = [...prev.subjectsTaught];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, subjectsTaught: updated };
    });
  };

  const removeSubjectRow = (index: number) => {
    setForm(prev => ({
      ...prev,
      subjectsTaught: prev.subjectsTaught.filter((_, i) => i !== index)
    }));
  };

  const statesList = useMemo(() => Object.keys(INDIA_STATES_AND_DISTRICTS), []);
  const localDistrictsList = useMemo(() => form.localState ? INDIA_STATES_AND_DISTRICTS[form.localState] || [] : [], [form.localState]);
  const permanentDistrictsList = useMemo(() => form.permanentState ? INDIA_STATES_AND_DISTRICTS[form.permanentState] || [] : [], [form.permanentState]);

  const selectedQualifications = useMemo(() => form.qualification ? form.qualification.split(",").map(s => s.trim()).filter(Boolean) : [], [form.qualification]);

  const aadhaarDoc = form.documents.find(d => d.label === "Aadhaar Card");
  const panDoc = form.documents.find(d => d.label === "PAN Card");

  const userDocuments = useMemo(() => {
    return form.documents.filter(d => !ALL_SYSTEM_META_KEYS.includes(d.label));
  }, [form.documents]);

  const handleQualificationToggle = (qual: string) => {
    if (selectedQualifications.includes(qual)) {
      setValue("qualification", selectedQualifications.filter(q => q !== qual).join(", "));
    } else {
      setValue("qualification", [...selectedQualifications, qual].join(", "));
    }
  };

  const currentStaffList = useMemo(() => staff.filter(m => !pageType || m.staffType === pageType), [staff, pageType]);
  const totalStaffCount = currentStaffList.length;
  const activeCount = useMemo(() => currentStaffList.filter(m => m.status === "active" || m.isActive === true).length, [currentStaffList]);
  const inactiveCount = totalStaffCount - activeCount;
  const totalSalarySum = useMemo(() => currentStaffList.reduce((acc, curr) => {
    if (curr.status !== "active" && curr.isActive !== true) return acc;
    const rawSalary = curr.salary ?? 0;
    const numSalary = typeof rawSalary === "string" ? Number(rawSalary.replace(/[^0-9.-]+/g, "")) || 0 : Number(rawSalary) || 0;
    return acc + numSalary;
  }, 0), [currentStaffList]);

  // Designation Tabs computed dynamically
  const designationTabs = useMemo(() => {
    const rolesSet = new Set<string>();
    currentStaffList.forEach((m: any) => {
      const des = m.positionTitle || m.role;
      if (des) rolesSet.add(des);
    });
    return ["All Staff", ...Array.from(rolesSet)];
  }, [currentStaffList]);

  // ================= ENHANCED SEARCH FILTER =================
  const filteredStaff = useMemo(() => {
    return currentStaffList.filter((m: any) => {
      const query = search.toLowerCase().trim();
      
      const fullName = `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.name ?? ""}`.toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      const phone = (m.phone ?? "").toLowerCase();
      const empId = getDisplayEmpId(m).toLowerCase();

      // Collect text from SUBJECTS TAUGHT (Course, Subject, Batch)
      const subjectsTaughtInfo = Array.isArray(m.subjectsTaught)
        ? m.subjectsTaught.map((st: any) => `${st.course || ""} ${st.subject || ""} ${st.batch || ""}`).join(" ")
        : "";

      const legacySubject = (m.subject || "").toLowerCase();
      const batches = Array.isArray(m.batches) ? m.batches.join(" ").toLowerCase() : "";

      // Combine all fields into searchable text
      const allSearchableText = `${fullName} ${email} ${phone} ${empId} ${subjectsTaughtInfo} ${legacySubject} ${batches}`.toLowerCase();

      const matchesSearch = query === "" || allSearchableText.includes(query);
      const matchesStatus = statusFilter === "all" ? true : m.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesDesignation = designationTab === "All Staff" ? true : (m.positionTitle || m.role || "").toLowerCase() === designationTab.toLowerCase();

      return matchesSearch && matchesStatus && matchesDesignation;
    });
  }, [currentStaffList, search, statusFilter, designationTab]);
  // ==========================================================

  const openAdd = () => { 
    setEditing(null); 
    setSameAsCorrespondence(false);
    
    let maxNum = 0;
    currentStaffList.forEach((m: any) => {
      const idStr = String(getDisplayEmpId(m) || "");
      const match = idStr.match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const nextNumber = maxNum + 1;
    const autoGeneratedId = `EMP-${String(nextNumber).padStart(3, "0")}`;

    setForm({ 
      ...blankForm, 
      empId: autoGeneratedId, 
      username: autoGeneratedId.toLowerCase(), 
      staffType: pageType ?? "academic", 
      accessLevel: "staff" 
    }); 
    setMessage(""); setViewMode("form"); 
  };
  
  const openEdit = (member: any) => {
    setEditing(member); setMessage("");
    
    const rawDesignation = member.positionTitle || member.role || "";
    const memberRole = STAFF_ROLES.includes(rawDesignation) ? rawDesignation : "Other";
    const customRoleVal = memberRole === "Other" ? rawDesignation : "";
    
    const docs = Array.isArray(member.documents) ? member.documents : [];
    const genderDoc = docs.find((d: any) => d.label === META_GENDER_KEY);
    const stateDoc = docs.find((d: any) => d.label === META_STATE_KEY);
    const districtDoc = docs.find((d: any) => d.label === META_DISTRICT_KEY);
    const pinDoc = docs.find((d: any) => d.label === META_PIN_KEY);
    const permAddressDoc = docs.find((d: any) => d.label === META_PERM_ADDRESS_KEY);
    const permStateDoc = docs.find((d: any) => d.label === META_PERM_STATE_KEY);
    const permDistrictDoc = docs.find((d: any) => d.label === META_PERM_DISTRICT_KEY);
    const permPinDoc = docs.find((d: any) => d.label === META_PERM_PIN_KEY);

    const gLower = (member.gender || "").toLowerCase().trim();
    const isStandardGender = ["male", "female"].includes(gLower);
    const mappedGender = member.gender ? (isStandardGender ? gLower : "other") : "";
    
    let mappedOtherGender = member.otherGender || genderDoc?.name || "";
    if (!mappedOtherGender && !isStandardGender && gLower !== "other") { mappedOtherGender = member.gender; }

    const qualDoc = docs.find((d: any) => d.label === META_QUALIFICATION_KEY);
    const dbQuals = member.qualification ? member.qualification.split(",").map((s: string) => s.trim()) : [];
    const standardQuals = dbQuals.filter((q: string) => QUALIFICATIONS_LIST.includes(q));
    const customQuals = dbQuals.filter((q: string) => !QUALIFICATIONS_LIST.includes(q));
    if (customQuals.length > 0 && !standardQuals.includes("Other")) { standardQuals.push("Other"); }

    const resolvedEmpId = getDisplayEmpId(member);

    const resolvedState = member.localState || stateDoc?.name || "";
    const resolvedDistrict = member.localDistrict || districtDoc?.name || "";
    const resolvedPin = member.localPin || pinDoc?.name || "";

    const resolvedPermAddress = member.permanentAddress || permAddressDoc?.name || "";
    const resolvedPermState = member.permanentState || permStateDoc?.name || "";
    const resolvedPermDistrict = member.permanentDistrict || permDistrictDoc?.name || "";
    const resolvedPermPin = member.permanentPin || permPinDoc?.name || "";

    const isSame = 
      resolvedPermAddress === (member.localAddress || "") &&
      resolvedPermState === resolvedState &&
      resolvedPermDistrict === resolvedDistrict &&
      resolvedPermPin === resolvedPin &&
      !!(resolvedState || resolvedDistrict || member.localAddress);
      
    setSameAsCorrespondence(isSame);

    // ================== FIXED: ROBUST SUBJECTS TAUGHT LOAD ==================
    let loadedSubjectsTaught: SubjectTaughtRow[] = [];
    if (Array.isArray(member.subjectsTaught) && member.subjectsTaught.length > 0) {
      loadedSubjectsTaught = member.subjectsTaught.map((s: any) => ({
        course: s?.course || "",
        subject: s?.subject || "",
        batch: s?.batch || "",
      }));
    }
    if (loadedSubjectsTaught.length === 0) {
      const subjectsMeta = docs.find((d: any) => d.label === META_SUBJECTS_TAUGHT_KEY);
      if (subjectsMeta?.name) {
        try {
          const parsed = JSON.parse(subjectsMeta.name);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedSubjectsTaught = parsed.map((s: any) => ({
              course: s?.course || "",
              subject: s?.subject || "",
              batch: s?.batch || "",
            }));
          }
        } catch {}
      }
    }
    if (loadedSubjectsTaught.length === 0) {
      const legacySubjects = (member.subject || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const legacyBatches: string[] = Array.isArray(member.batches) ? member.batches : Array.isArray(member.assignedBatches) ? member.assignedBatches : [];
      if (legacySubjects.length > 0) {
        loadedSubjectsTaught = legacySubjects.map((subj: string, i: number) => ({
          course: "", subject: subj, batch: legacyBatches[i] || legacyBatches[0] || "",
        }));
      }
    }
    if (loadedSubjectsTaught.length === 0) {
      loadedSubjectsTaught = [{ course: "", subject: "", batch: "" }];
    }
    // ========================================================================

    const rawSalStr = String(member.monthlySalary ?? member.salary ?? "");
    const selectedEmpType = member.employmentType || "full_time";

    setForm({
      ...blankForm, ...member,
      role: memberRole, 
      customRole: customRoleVal,
      positionTitle: rawDesignation,
      accessLevel: member.accessLevel || member.role || "staff",
      empId: resolvedEmpId,
      documents: docs,
      firstName: member.firstName ?? (member.name ?? "").split(" ")[0] ?? "",
      lastName: member.lastName ?? (member.name ?? "").split(" ").slice(1).join(" "),
      staffType: member.staffType ?? "academic",
      
      localAddress: member.localAddress ?? "",
      localState: resolvedState, 
      localDistrict: resolvedDistrict,
      localPin: resolvedPin,
      
      permanentAddress: resolvedPermAddress,
      permanentState: resolvedPermState,
      permanentDistrict: resolvedPermDistrict,
      permanentPin: resolvedPermPin,
      
      panNumber: member.panNumber ?? "", bloodGroup: member.bloodGroup ?? "",
      gender: mappedGender, 
      otherGender: mappedOtherGender,
      qualification: standardQuals.join(", "), 
      otherQualification: member.otherQualification || qualDoc?.name || customQuals.join(", "),
      
      subjectsTaught: loadedSubjectsTaught, // Must be after ...member
      batches: Array.isArray(member.batches) ? member.batches : Array.isArray(member.assignedBatches) ? member.assignedBatches : [],
      
      employmentType: selectedEmpType,
      monthlySalary: selectedEmpType === "full_time" ? rawSalStr : "",
      perClassRate: selectedEmpType === "contractual" ? rawSalStr : (member.perClassRate ? String(member.perClassRate) : ""),
      baseSalary: selectedEmpType === "hybrid" ? rawSalStr : (member.baseSalary ? String(member.baseSalary) : ""),
      hourlyRate: selectedEmpType === "hourly" ? rawSalStr : (member.hourlyRate ? String(member.hourlyRate) : ""),
      pfDeduction: String(member.pfDeduction ?? "12"),
      tdsDeduction: String(member.tdsDeduction ?? "0"),
    });
    setViewMode("form"); window.scrollTo(0, 0);
  };

  const openView = (member: any) => { setViewing(member); setProfileTab("overview"); setViewMode("view"); window.scrollTo(0, 0); };

  const backToList = () => { 
    stopCamera();
    setViewMode("list"); setEditing(null); setViewing(null); setForm(blankForm); 
    setSameAsCorrespondence(false);
    setMessage(""); setShowPassword(false); setShowConfirmPassword(false); setNewDocLabel(""); 
  };

  const photoChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) { alert("Photo max size allowed is 1.5 MB."); return; }
    const reader = new FileReader(); reader.onload = () => setValue("photoDataUrl", String(reader.result || "")); reader.readAsDataURL(file);
  };

  const handleSpecificDocUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { alert("Document size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const docObj: StaffDocument = { label, name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      const filteredDocs = form.documents.filter(d => d.label !== label);
      setValue("documents", [...filteredDocs, docObj]);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const removeSpecificDoc = (label: string) => { setValue("documents", form.documents.filter(d => d.label !== label)); };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { alert("Documents must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const docObj: StaffDocument = { label: newDocLabel.trim() || file.name.split(".")[0], name: file.name, dataUrl: String(reader.result || ""), mimeType: file.type };
      setValue("documents", [...form.documents, docObj]);
      setNewDocLabel("");
      if (docFileRef.current) docFileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = (index: number) => { 
    const docToRemove = userDocuments[index];
    if (docToRemove) { setValue("documents", form.documents.filter(d => d !== docToRemove)); }
  };

  const handleGenerateCredentials = () => {
    let generatedUsername = "";
    const fName = form.firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const lName = form.lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    
    if (fName) {
      generatedUsername = fName;
      if (lName) { generatedUsername += "." + lName; }
      const digits = form.empId.replace(/[^0-9]/g, "");
      if (digits) { generatedUsername += digits.slice(-3); } else { generatedUsername += Math.floor(100 + Math.random() * 900); }
    } else {
      generatedUsername = form.empId.toLowerCase().replace(/[^a-z0-9]/g, "") || "staff" + Math.floor(100 + Math.random() * 900);
    }

    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "@#$*";
    
    let generatedPassword = "";
    generatedPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
    generatedPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
    generatedPassword += numbers[Math.floor(Math.random() * numbers.length)];
    generatedPassword += symbols[Math.floor(Math.random() * symbols.length)];
    
    const allChars = uppercase + lowercase + numbers;
    for (let i = 0; i < 4; i++) { generatedPassword += allChars[Math.floor(Math.random() * allChars.length)]; }
    
    generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

    setForm(prev => ({ ...prev, username: generatedUsername, password: generatedPassword, confirmPassword: generatedPassword }));
  };

  const getHeaders = () => {
    const token = localStorage.getItem("coach_sutra_token") || "";
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }); };

  const save = async () => {
    if (!form.firstName.trim() || !form.phone.trim() || !form.role || !form.joinDate) { setMessage("First Name, Mobile, Role and Start Date are required."); return; }
    if (form.loginEnabled) {
      if (!form.username.trim() || !form.password.trim()) { setMessage("Portal access credentials are required when active."); return; }
      if (form.password.length < 6) { setMessage("Password must be at least 6 characters long."); return; }
      if (form.password !== form.confirmPassword) { setMessage("Portal access passwords do not match."); return; }
    }
    
    setSaving(true); setMessage("");
    
    const finalDesignation = form.role === "Other" ? form.customRole : form.role;
    let finalSystemRole = form.loginEnabled ? form.accessLevel : "staff";
    
    if (!form.loginEnabled) {
      const lowerDesig = finalDesignation.toLowerCase();
      if (lowerDesig.includes("teacher") || lowerDesig.includes("faculty")) { finalSystemRole = "teacher"; } 
      else if (lowerDesig.includes("account")) { finalSystemRole = "accountant"; } 
      else if (lowerDesig.includes("reception")) { finalSystemRole = "receptionist"; } 
      else if (lowerDesig.includes("owner") || lowerDesig.includes("director") || lowerDesig.includes("admin")) { finalSystemRole = "admin"; } 
      else { finalSystemRole = "staff"; }
    }

    let validGender: string | undefined = undefined;
    if (form.gender) {
      const g = form.gender.toLowerCase().trim();
      if (g === "male" || g === "female" || g === "other") { validGender = g; } else { validGender = "other"; }
    }

    let finalQuals = [...selectedQualifications];
    if (finalQuals.includes("Other")) {
      finalQuals = finalQuals.filter(q => q !== "Other");
      if (form.otherQualification.trim()) { finalQuals.push(form.otherQualification.trim()); }
    }
    const finalQualification = finalQuals.join(", ");

    let updatedDocuments = form.documents.filter(d => !ALL_SYSTEM_META_KEYS.includes(d.label));

    if (form.gender === "other" && form.otherGender.trim()) {
      updatedDocuments.push({ label: META_GENDER_KEY, name: form.otherGender.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (selectedQualifications.includes("Other") && form.otherQualification.trim()) {
      updatedDocuments.push({ label: META_QUALIFICATION_KEY, name: form.otherQualification.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.empId.trim()) {
      updatedDocuments.push({ label: META_EMPID_KEY, name: form.empId.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.localState.trim()) {
      updatedDocuments.push({ label: META_STATE_KEY, name: form.localState.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.localDistrict.trim()) {
      updatedDocuments.push({ label: META_DISTRICT_KEY, name: form.localDistrict.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.localPin.trim()) {
      updatedDocuments.push({ label: META_PIN_KEY, name: form.localPin.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.permanentAddress.trim()) {
      updatedDocuments.push({ label: META_PERM_ADDRESS_KEY, name: form.permanentAddress.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.permanentState.trim()) {
      updatedDocuments.push({ label: META_PERM_STATE_KEY, name: form.permanentState.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.permanentDistrict.trim()) {
      updatedDocuments.push({ label: META_PERM_DISTRICT_KEY, name: form.permanentDistrict.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }
    if (form.permanentPin.trim()) {
      updatedDocuments.push({ label: META_PERM_PIN_KEY, name: form.permanentPin.trim(), dataUrl: "data:text/plain;base64,b3RoZXI=", mimeType: "text/plain" });
    }

    let legacySalaryVal = 0;
    if (form.employmentType === 'full_time') legacySalaryVal = Number(form.monthlySalary || 0);
    else if (form.employmentType === 'hybrid') legacySalaryVal = Number(form.baseSalary || 0);
    else if (form.employmentType === 'hourly') legacySalaryVal = Number(form.hourlyRate || 0);
    else if (form.employmentType === 'contractual') legacySalaryVal = Number(form.perClassRate || 0);

    const { otherGender, otherQualification, ...cleanForm } = form;

    // ================== FIXED: ROBUST SUBJECTS TAUGHT SAVE ==================
    const cleanedSubjectsTaught = (form.subjectsTaught || [])
      .map(r => ({
        course: (r.course || "").trim(),
        subject: (r.subject || "").trim(),
        batch: (r.batch || "").trim() === "None" ? "" : (r.batch || "").trim(),
      }))
      .filter(r => r.course || r.subject || r.batch);
      
    const subjectsToSave = cleanedSubjectsTaught.length > 0 ? cleanedSubjectsTaught : [];
    const combinedSubjectsString = subjectsToSave.map(s => s.subject).filter(Boolean).join(", ") || form.subject || "";
    const derivedBatchesFromRows = Array.from(new Set(subjectsToSave.map(s => s.batch).filter(b => b && b !== "All Batches" && b !== "None")));

    updatedDocuments = updatedDocuments.filter(d => d.label !== META_SUBJECTS_TAUGHT_KEY);
    if (subjectsToSave.length > 0) {
      updatedDocuments.push({
        label: META_SUBJECTS_TAUGHT_KEY,
        name: JSON.stringify(subjectsToSave),
        dataUrl: "data:text/plain;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(subjectsToSave)))),
        mimeType: "text/plain",
      });
    }
    // ========================================================================

    const data: any = {
      ...cleanForm, 
      empId: form.empId,               
      employeeId: form.empId,          
      role: finalSystemRole,            
      positionTitle: finalDesignation,  
      staffType: pageType ?? form.staffType ?? "academic",
      name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      salary: legacySalaryVal, 
      
      // Override explicitly
      subject: combinedSubjectsString,
      subjectsTaught: subjectsToSave,
      batches: derivedBatchesFromRows.length > 0 ? derivedBatchesFromRows : form.batches || [],

      address: form.localAddress,
      localState: form.localState,
      localDistrict: form.localDistrict,
      localPin: form.localPin,
      permanentAddress: form.permanentAddress,
      permanentState: form.permanentState,
      permanentDistrict: form.permanentDistrict,
      permanentPin: form.permanentPin,

      employeeStatus: form.employeeStatus || undefined, 
      gender: validGender, 
      qualification: finalQualification,
      documents: updatedDocuments,
    };

    try {
      const response = await fetch(editing ? `/api/staff/${editing.id || editing._id}` : "/api/staff", { method: editing ? "PATCH" : "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!response.ok) { const res = await response.json(); setMessage(res?.error || res?.message || "An unexpected save error occurred."); return; }
      await refresh(); backToList();
    } catch { setMessage("Server connection failed."); } finally { setSaving(false); }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member? This action is permanent.")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) { await refresh(); setViewMode("list"); } else { alert("Failed to delete member."); }
    } catch { alert("Failed to delete."); }
  };

  const toggleStatus = async (member: any) => {
    const memberId = member.id || member._id;
    const newStatus = (member.status || "active").toLowerCase() === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/staff/${memberId}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ status: newStatus }) });
      if (res.ok) await refresh();
    } catch { alert("Status update failed."); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen w-full bg-[#E9EEF5] font-sans text-gray-800">
      
      {viewMode === "form" ? (
        /* ================== FORM VIEW ================== */
        <>
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm w-full">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button type="button" onClick={backToList} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition"><ArrowLeft size={20} /></button>
                <div>
                  <h1 className="text-xl font-bold text-[#5B7023]">{editing ? "Edit Staff Profile" : "Add New Staff Member"}</h1>
                  <p className="text-xs text-gray-500">Provide personal, profile, and system settings details</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={backToList} disabled={saving} className="rounded-xl">Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl gap-2 shadow-md transition-all">
                  <Save size={16} /> {saving ? "Saving Details..." : editing ? "Update Profile" : "Save Profile"}
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 pb-20">
            {message && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">{message}</div>}

            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-6">
              
              {/* Profile Photo Preview */}
              <div className="relative group cursor-pointer">
                <label className="cursor-pointer block">
                  {form.photoDataUrl ? (
                    <img
                      src={form.photoDataUrl}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#F0F4E8] shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                      <UserRound size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm text-gray-600 group-hover:text-[#5B7023] transition-colors">
                    <Camera size={14} />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => photoChange(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-base">Profile Photo</h3>
                <p className="text-sm text-gray-500 mb-3">Allowed: JPEG or PNG under 1.5MB</p>

                <div className="flex flex-wrap items-center gap-2">
                  <Label className="cursor-pointer bg-[#F0F4E8] text-[#5B7023] hover:bg-[#5B7023] hover:text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all h-[36px]">
                    <Upload size={14} /> Choose Image File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => photoChange(e.target.files?.[0])}
                    />
                  </Label>

                  <Button
                    type="button"
                    onClick={startCamera}
                    className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 font-bold h-[36px] shadow-sm transition-all"
                  >
                    <Camera size={14} /> Use Live Camera
                  </Button>
                </div>
              </div>
            </div>

            {/* SECTION 1 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl"><h3 className="font-semibold text-[#5B7023]">1. Personal & Contact Details</h3></div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="First Name" value={form.firstName} onChange={(v) => setValue("firstName", v)} required />
                <Field label="Last Name" value={form.lastName} onChange={(v) => setValue("lastName", v)} />
                <Field label="Date of Birth" value={form.dateOfBirth} onChange={(v) => setValue("dateOfBirth", v)} type="date" />
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <Select value={form.gender || ""} onValueChange={(v) => { setValue("gender", v); if(v !== "other") setValue("otherGender", ""); }}>
                    <SelectTrigger className="bg-gray-50/50"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.gender === "other" && (
                    <div className="pt-2">
                      <Label className="text-[11px] font-bold text-[#5B7023]">Specify Gender *</Label>
                      <Input value={form.otherGender} onChange={(e: any) => setValue("otherGender", e.target.value)} placeholder="e.g. Transgender, Non-binary" className="text-sm bg-[#F4F7EE] border-[#5B7023] h-9 mt-1" autoFocus />
                    </div>
                  )}
                </div>

                <Field label="Mobile Number" value={form.phone} onChange={(v) => setValue("phone", v)} placeholder="9876543210" required />
                <Field label="Alternate Contact" value={form.homePhone} onChange={(v) => setValue("homePhone", v)} />
                <Field label="Email Address" value={form.email} onChange={(v) => setValue("email", v)} type="email" placeholder="example@domain.com" />
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl"><h3 className="font-semibold text-[#5B7023]">2. Professional Assignment & Role</h3></div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Employee ID" value={form.empId} onChange={(v) => setValue("empId", v)} placeholder="EMP-001" required />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Staff Role Designation *</Label>
                  <SearchableSelect options={STAFF_ROLES} value={form.role} onChange={(v) => setValue("role", v)} placeholder="Select Designation..." />
                </div>
                {form.role === "Other" ? (
                  <Field label="Please Specify Custom Role" value={form.customRole} onChange={(v) => setValue("customRole", v)} required />
                ) : <div className="hidden md:block"></div>}
                
                {/* EDUCATIONAL QUALIFICATIONS BLOCK */}
                <div className="md:col-span-3 bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-3">
                  <Label className="text-xs font-semibold text-gray-700">Educational Qualifications (Select multiple if applicable)</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUALIFICATIONS_LIST.map((qual) => {
                      const isSelected = selectedQualifications.includes(qual);
                      return (
                        <button key={qual} type="button" onClick={() => handleQualificationToggle(qual)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${isSelected ? "bg-[#5B7023] text-white border-[#5B7023] shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-[#5B7023] hover:text-[#5B7023]"}`}>
                          {isSelected && <Check size={12} className="inline mr-1" />}{qual}
                        </button>
                      );
                    })}
                  </div>
                  {selectedQualifications.includes("Other") && (
                    <div className="pt-2 max-w-sm">
                      <Label className="text-xs font-semibold text-[#5B7023] mb-1 block">Please specify other qualification *</Label>
                      <Input value={form.otherQualification || ""} onChange={(e: any) => setValue("otherQualification", e.target.value)} placeholder="e.g. M.Phil, CA, CS, Certificate..." className="text-sm bg-[#F4F7EE] border-[#5B7023] h-9" />
                    </div>
                  )}

                  {selectedQualifications.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <Label className="text-xs font-semibold text-gray-700 mb-3 block">Upload Qualification Documents (Optional)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedQualifications.map((qual) => {
                          const docLabel = qual === "Other" ? (form.otherQualification?.trim() ? `${form.otherQualification.trim()} Certificate` : "Other Qualification Certificate") : `${qual} Certificate`;
                          const existingDoc = form.documents.find(d => d.label === docLabel);

                          return (
                            <div key={qual} className="bg-white border border-gray-200 p-2.5 rounded-lg flex flex-col justify-center gap-2">
                              <span className="text-[11px] font-bold text-gray-800">{qual === "Other" ? (form.otherQualification || "Other") : qual} Certificate</span>
                              {existingDoc ? (
                                <div className="flex items-center justify-between bg-[#F4F7EE] p-1.5 rounded border border-[#D8E1C8]">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <CheckCircle2 size={12} className="text-[#5B7023] shrink-0" />
                                    <span className="text-[10px] text-[#5B7023] font-semibold truncate">{existingDoc.name}</span>
                                  </div>
                                  <button type="button" onClick={() => removeSpecificDoc(docLabel)} className="p-1 hover:bg-white text-red-500 rounded transition shrink-0"><X size={10} /></button>
                                </div>
                              ) : (
                                <label className="cursor-pointer w-full m-0">
                                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold border border-dashed border-gray-300 text-gray-500 hover:border-[#5B7023] hover:text-[#5B7023] hover:bg-[#F4F7EE] transition-colors py-1.5 px-3 rounded-md w-full">
                                    <Upload size={12} /> Upload File
                                  </div>
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleSpecificDocUpload(e, docLabel)} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= SUBJECTS TAUGHT SECTION ================= */}
                <div className="md:col-span-3 space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                      SUBJECTS TAUGHT
                    </span>
                    <button
                      type="button"
                      onClick={addSubjectRow}
                      className="text-xs font-bold text-[#5B7023] hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Another Subject
                    </button>
                  </div>

                  {form.subjectsTaught.map((row, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 border border-gray-200 rounded-xl shadow-sm">
                      {/* Searchable Course / Class */}
                      <div className="flex-1 w-full min-w-[200px]">
                        <SearchableSelect
                          options={courseOptionsWithNone}
                          value={row.course}
                          onChange={(val) => updateSubjectRow(idx, "course", val === "None" ? "" : val)}
                          placeholder="— Select Course / Class —"
                        />
                      </div>

                      {/* Searchable Subject */}
                      <div className="flex-1 w-full min-w-[200px]">
                        <SearchableSelect
                          options={subjectOptionsWithNone}
                          value={row.subject}
                          onChange={(val) => updateSubjectRow(idx, "subject", val === "None" ? "" : val)}
                          placeholder="— Choose Subject —"
                        />
                      </div>

                      {/* Searchable Batch */}
                      <div className="flex-1 w-full min-w-[200px]">
                        <SearchableSelect
                          options={batchOptionsWithNone}
                          value={row.batch}
                          onChange={(val) => updateSubjectRow(idx, "batch", val === "None" ? "" : val)}
                          placeholder="— Choose Batch (All) —"
                        />
                      </div>

                      {/* Remove row button */}
                      {form.subjectsTaught.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubjectRow(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="Remove Row"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Field label="Prior Experience (Years)" value={form.experience} onChange={(v) => setValue("experience", v)} type="number" />
                <Field label="Start / Join Date" value={form.joinDate} onChange={(v) => setValue("joinDate", v)} type="date" required />
                <Field label="Working Shifts From" value={form.workTimingFrom} onChange={(v) => setValue("workTimingFrom", v)} type="time" />
                <Field label="Working Shifts To" value={form.workTimingTo} onChange={(v) => setValue("workTimingTo", v)} type="time" />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Current System Status</Label>
                  <Select value={form.status || ""} onValueChange={(v: any) => setValue("status", v)}>
                    <SelectTrigger className="bg-gray-50/50"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>

                {/* EMPLOYMENT TYPE & PAYROLL */}
                <div className="md:col-span-3 mt-4">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-indigo-50/40 px-5 py-3.5 border-b border-gray-200 flex items-center gap-2.5">
                      <Briefcase size={16} className="text-indigo-600" />
                      <h3 className="font-bold text-indigo-950 text-sm">Employment Type <span className="text-red-500">*</span></h3>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {EMP_TYPES.map(type => {
                          const isSelected = form.employmentType === type.id;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setValue("employmentType", type.id)}
                              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col h-full ${
                                isSelected 
                                ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${type.iconBg}`}>
                                  <type.icon size={16} className={type.iconColor} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{type.label}</h4>
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium leading-snug mt-auto">{type.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                        <div className="mb-5 flex items-start gap-2 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100/60">
                          <Info size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                          <p className="text-[11.5px] text-indigo-900 leading-tight">
                            {form.employmentType === 'full_time' && "Payroll = Monthly Salary × (Present Days ÷ Working Days). PF & TDS deducted on gross."}
                            {form.employmentType === 'contractual' && "Payroll = Per-Class Rate × Total Classes Taken. No base salary."}
                            {form.employmentType === 'hybrid' && "Payroll = (Base × 50% attendance) + (Per-Class Rate × Classes). Both components apply."}
                            {form.employmentType === 'hourly' && "Payroll = Hourly Rate × Total Hours Worked. Hours computed from attendance start & end times."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-start gap-4">
                          {form.employmentType === 'full_time' && (
                            <>
                              <PayrollInput label="Monthly Salary (₹)" required prefix="₹" type="number" value={form.monthlySalary} onChange={(v: string) => setValue("monthlySalary", v)} />
                              <PayrollInput label="PF Deduction (%)" subtext="Standard PF = 12%" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                              <PayrollInput label="TDS Deduction (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                            </>
                          )}

                          {form.employmentType === 'contractual' && (
                            <>
                              <PayrollInput label="Per-Class Rate (₹)" required prefix="₹" suffix="/class" type="number" value={form.perClassRate} onChange={(v: string) => setValue("perClassRate", v)} />
                              <PayrollInput label="TDS Deduction (%)" subtext="Contractual TDS typically 10%" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                              {form.perClassRate && (
                                <div className="self-end pb-1 ml-auto">
                                  <div className="bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-100 text-xs font-medium text-emerald-800 flex items-center h-[38px]">
                                    <span className="font-bold mr-1">Example:</span> 20 classes × ₹{form.perClassRate} = <span className="font-bold ml-1">₹{(Number(form.perClassRate) * 20).toLocaleString('en-IN')}</span> <span className="ml-1 text-emerald-600">gross</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {form.employmentType === 'hybrid' && (
                            <>
                              <PayrollInput label="Base Salary (₹)" required prefix="₹" type="number" value={form.baseSalary} onChange={(v: string) => setValue("baseSalary", v)} />
                              <PayrollInput label="Per-Class Rate (₹)" required prefix="₹" suffix="/class" type="number" value={form.perClassRate} onChange={(v: string) => setValue("perClassRate", v)} />
                              <PayrollInput label="PF (%)" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                              <PayrollInput label="TDS (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                            </>
                          )}

                          {form.employmentType === 'hourly' && (
                            <>
                              <PayrollInput label="Hourly Rate (₹)" required prefix="₹" suffix="/hour" type="number" value={form.hourlyRate} onChange={(v: string) => setValue("hourlyRate", v)} />
                              <PayrollInput label="PF Deduction (%)" suffix="%" type="number" value={form.pfDeduction} onChange={(v: string) => setValue("pfDeduction", v)} />
                              <PayrollInput label="TDS Deduction (%)" suffix="%" type="number" value={form.tdsDeduction} onChange={(v: string) => setValue("tdsDeduction", v)} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 3 - RESIDENTIAL ADDRESS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center gap-2">
                <MapPin size={16} className="text-[#5B7023]" />
                <h3 className="font-semibold text-[#5B7023]">3. Residential Address</h3>
              </div>

              <div className="p-6 space-y-8">

                {/* CORRESPONDENCE ADDRESS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                      <Mail size={12} className="text-blue-600" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Correspondence Address</h4>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">(Current / Local)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-3">
                      <Field
                        label="Full Address"
                        value={form.localAddress}
                        onChange={(v) => {
                          setValue("localAddress", v);
                          if (sameAsCorrespondence) setValue("permanentAddress", v);
                        }}
                        placeholder="House No., Street, Area, Landmark"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">State</Label>
                      <SearchableSelect
                        options={statesList}
                        value={form.localState}
                        onChange={(v) => {
                          setValue("localState", v);
                          setValue("localDistrict", "");
                          if (sameAsCorrespondence) {
                            setValue("permanentState", v);
                            setValue("permanentDistrict", "");
                          }
                        }}
                        placeholder="Select State"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">District (ज़िला)</Label>
                      <SearchableSelect
                        options={localDistrictsList}
                        value={form.localDistrict}
                        onChange={(v) => {
                          setValue("localDistrict", v);
                          if (sameAsCorrespondence) setValue("permanentDistrict", v);
                        }}
                        placeholder={form.localState ? "Select District" : "Select State First"}
                        disabled={!form.localState}
                      />
                    </div>

                    <Field
                      label="PIN / Postal Code"
                      value={form.localPin}
                      onChange={(v) => {
                        setValue("localPin", v);
                        if (sameAsCorrespondence) setValue("permanentPin", v);
                      }}
                      placeholder="e.g., 110001"
                    />
                  </div>
                </div>

                {/* SAME AS CHECKBOX */}
                <label className="flex items-center gap-3 cursor-pointer select-none bg-[#F4F7EE]/60 border border-[#D8E1C8] rounded-xl px-4 py-3 w-fit hover:bg-[#F4F7EE] transition">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={sameAsCorrespondence}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsCorrespondence(checked);
                        if (checked) {
                          setValue("permanentAddress", form.localAddress);
                          setValue("permanentState", form.localState);
                          setValue("permanentDistrict", form.localDistrict);
                          setValue("permanentPin", form.localPin);
                        }
                      }}
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white peer-checked:bg-[#5B7023] peer-checked:border-[#5B7023] transition flex items-center justify-center">
                      {sameAsCorrespondence && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Same as Correspondence Address</p>
                    <p className="text-[11px] text-gray-500">Permanent address correspondence jaisa hi rahega</p>
                  </div>
                </label>

                {/* PERMANENT ADDRESS */}
                <div className={`space-y-4 transition-opacity ${sameAsCorrespondence ? "opacity-55 pointer-events-none" : "opacity-100"}`}>
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
                      <MapPin size={12} className="text-amber-600" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Permanent Address</h4>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">(Native / Home)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-3">
                      <Field
                        label="Full Address"
                        value={form.permanentAddress}
                        onChange={(v) => setValue("permanentAddress", v)}
                        placeholder="House No., Street, Area, Landmark"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">State</Label>
                      <SearchableSelect
                        options={statesList}
                        value={form.permanentState}
                        onChange={(v) => {
                          setValue("permanentState", v);
                          setValue("permanentDistrict", "");
                        }}
                        placeholder="Select State"
                        disabled={sameAsCorrespondence}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">District (ज़िला)</Label>
                      <SearchableSelect
                        options={permanentDistrictsList}
                        value={form.permanentDistrict}
                        onChange={(v) => setValue("permanentDistrict", v)}
                        placeholder={form.permanentState ? "Select District" : "Select State First"}
                        disabled={!form.permanentState || sameAsCorrespondence}
                      />
                    </div>

                    <Field
                      label="PIN / Postal Code"
                      value={form.permanentPin}
                      onChange={(v) => setValue("permanentPin", v)}
                      placeholder="e.g., 110001"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 4 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#5B7023]" />
                <h3 className="font-semibold text-[#5B7023]">4. Identity Verification</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-4">
                  <Field label="Aadhaar Card Number" value={form.aadhaarNumber} onChange={(v) => setValue("aadhaarNumber", v.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit Aadhaar number" />
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 block mb-1.5">Aadhaar Document</Label>
                    {aadhaarDoc ? (
                      <div className="flex items-center justify-between bg-white border border-green-200 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                          <span className="text-xs text-gray-700 font-medium truncate">{aadhaarDoc.name}</span>
                        </div>
                        <button type="button" onClick={() => removeSpecificDoc("Aadhaar Card")} className="p-1 hover:bg-red-50 text-red-500 rounded transition shrink-0"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={aadhaarFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleSpecificDocUpload(e, "Aadhaar Card")} />
                        <Button type="button" variant="outline" onClick={() => aadhaarFileRef.current?.click()} className="w-full text-xs h-9 bg-white border-dashed border-gray-300 text-gray-600 hover:border-[#5B7023] hover:text-[#5B7023]">
                          <Upload size={14} className="mr-2" /> Upload Aadhaar File
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-4">
                  <Field label="PAN Number (Optional)" value={form.panNumber} onChange={(v) => setValue("panNumber", v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 block mb-1.5">PAN Document</Label>
                    {panDoc ? (
                      <div className="flex items-center justify-between bg-white border border-green-200 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                          <span className="text-xs text-gray-700 font-medium truncate">{panDoc.name}</span>
                        </div>
                        <button type="button" onClick={() => removeSpecificDoc("PAN Card")} className="p-1 hover:bg-red-50 text-red-500 rounded transition shrink-0"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={panFileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleSpecificDocUpload(e, "PAN Card")} />
                        <Button type="button" variant="outline" onClick={() => panFileRef.current?.click()} className="w-full text-xs h-9 bg-white border-dashed border-gray-300 text-gray-600 hover:border-[#5B7023] hover:text-[#5B7023]">
                          <Upload size={14} className="mr-2" /> Upload PAN File
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2 bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                  <Label className="text-xs font-semibold text-gray-700">Blood Group (Optional)</Label>
                  <Select value={form.bloodGroup || ""} onValueChange={(v) => setValue("bloodGroup", v)}>
                    <SelectTrigger className="bg-white max-w-sm"><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION 5 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2"><IndianRupee size={16} className="text-[#5B7023]" /><h3 className="font-semibold text-[#5B7023]">5. Bank Account & Salary Transfer</h3></div>
                <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded uppercase tracking-wider">Payroll Info</span>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                  <ShieldCheck size={14} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-800 leading-relaxed">Ye details salary transfer ke liye use hongi. Please double-check karein ki account details sahi hain.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Account Holder Name" value={form.accountName} onChange={(v) => setValue("accountName", v)} placeholder="As per bank passbook" />
                  <Field label="Bank Name" value={form.bankName} onChange={(v) => setValue("bankName", v)} placeholder="e.g. State Bank of India" />
                  <Field label="Branch Name" value={form.bankBranch} onChange={(v) => setValue("bankBranch", v)} placeholder="e.g. Connaught Place Branch" />
                  <Field label="Account Number" value={form.accountNumber} onChange={(v) => setValue("accountNumber", v.replace(/\D/g, ""))} placeholder="Bank account number" />
                  <Field label="IFSC Code" value={form.ifscCode} onChange={(v) => setValue("ifscCode", v.toUpperCase().slice(0, 11))} placeholder="e.g. SBIN0001234" />
                  <Field label="UPI ID (Optional)" value={form.upiId} onChange={(v) => setValue("upiId", v)} placeholder="e.g. name@upi" />
                </div>
              </div>
            </div>

            {/* SECTION 6 */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-200/50 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2"><FolderOpen size={16} className="text-[#5B7023]" /><h3 className="font-semibold text-[#5B7023]">6. Documents & File Attachments</h3></div>
                <span className="text-[10px] font-bold px-2 py-1 bg-[#F0F4E8] text-[#5B7023] rounded uppercase tracking-wider">{userDocuments.length} {userDocuments.length === 1 ? "File" : "Files"}</span>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
                  <FileText size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 leading-relaxed">Degree, Experience Letter, Resume, etc. upload karein. Max file size: 5MB per file.</p>
                </div>
                <div className="bg-gray-50/70 border-2 border-dashed border-gray-200 rounded-xl p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Document Label / Title</Label>
                      <Input value={newDocLabel} onChange={(e: any) => setNewDocLabel(e.target.value)} placeholder="e.g. Degree Certificate, Resume" className="bg-white h-10 text-sm" />
                    </div>
                    <div>
                      <input type="file" ref={docFileRef} className="hidden" onChange={handleAddDocument} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                      <Button type="button" onClick={() => docFileRef.current?.click()} className="w-full md:w-auto bg-[#5B7023] hover:bg-[#4a5c1d] text-white text-xs gap-2 h-10 px-5 rounded-lg"><FileUp size={14} /> Choose & Upload</Button>
                    </div>
                  </div>
                </div>
                {userDocuments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                    <FolderOpen size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-semibold text-gray-500">No documents attached yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attached Files ({userDocuments.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {userDocuments.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 bg-white hover:bg-gray-50/50 rounded-xl transition-all group">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 bg-[#F0F4E8] rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-[#5B7023]" /></div>
                            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-800 truncate">{doc.label}</p><p className="text-[10px] text-gray-400 truncate">{doc.name}</p></div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <a href={doc.dataUrl} download={doc.name} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="Download"><DownloadCloud size={14} /></a>
                            <button type="button" onClick={() => handleRemoveDocument(idx)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Remove"><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 7 (PORTAL CREDENTIALS WITH AUTO-GENERATE) */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="bg-[#F4F7EE] px-6 py-3 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
                <h3 className="font-semibold text-[#5B7023] flex items-center gap-2"><KeyRound size={16} /> 7. Portal Access Credentials</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-gray-600">{form.loginEnabled ? "System Portal Active" : "Portal Off"}</span>
                  <div className="relative">
                    <input type="checkbox" checked={form.loginEnabled} onChange={(e) => setValue("loginEnabled", e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#5B7023] transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>
              {form.loginEnabled ? (
                <div className="p-6 space-y-5">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-800 leading-relaxed">Assigned credentials allow portal access. Ensure the pass is complex and minimum 6 character strings are entered.</p>
                    </div>
                    <Button type="button" onClick={handleGenerateCredentials} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shrink-0 shadow-md transition">
                      <Sparkles size={14} /> Auto-Generate
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="System Username *" value={form.username} onChange={(v) => setValue("username", v.toLowerCase().replace(/\s/g, ""))} required autoComplete="off" />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Secure Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e: any) => setValue("password", e.target.value)} autoComplete="new-password" className="text-sm bg-gray-50/50 pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Verify Password *</Label>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e: any) => setValue("confirmPassword", e.target.value)} autoComplete="new-password" className="text-sm bg-gray-50/50 pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-[10px] font-semibold text-red-500 mt-1">❌ Passwords do not match</p>}
                      {form.confirmPassword && form.password === form.confirmPassword && <p className="text-[10px] font-semibold text-green-600 mt-1">✓ Credentials align</p>}
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <Label className="text-xs font-semibold">Access Level Permission Role</Label>
                      <Select value={form.accessLevel || ""} onValueChange={(v) => setValue("accessLevel", v)}>
                        <SelectTrigger className="text-sm bg-gray-50/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACCESS_LEVELS.map((level) => (<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50/20"><Lock size={28} className="mx-auto text-gray-300 mb-2" /><p className="text-xs text-gray-400 font-medium">Self service portal deactivated for this user.</p></div>
              )}
            </div>
            
            {/* ================= LIVE PHOTO CAPTURE MODAL ================= */}
            {cameraActive && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Camera size={16} className="text-blue-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">Live Photo Capture</h2>
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Video Preview */}
                  <div className="p-5">
                    <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ transform: "scaleX(-1)" }}
                        className="w-full h-full object-cover"
                      />
                      {/* Face guide ring */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-white/30 border-dashed" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Camera size={16} /> Capture
                    </button>
                  </div>

                  {/* Note */}
                  <p className="text-center text-[11px] text-gray-400 pb-4 px-5">
                    Camera sirf <span className="font-semibold text-blue-500">https</span> ya{" "}
                    <span className="font-semibold text-blue-500">localhost</span> pe chalta hai
                  </p>
                </div>
              </div>
            )}
          </div>
        </>

      ) : viewMode === "view" && viewing ? (
        /* =========================== PROFILE VIEW =========================== */
        <div className="min-h-screen w-full bg-[#E9EEF5] px-4 sm:px-6 lg:px-7 py-5 sm:py-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_330px] gap-6">
              <div className="space-y-5 min-w-0">
                {/* PROFILE HERO */}
                <div className="rounded-[22px] overflow-hidden shadow-[0_14px_35px_rgba(15,82,160,0.18)] bg-gradient-to-br from-[#075BC5] via-[#0758B9] to-[#0B4EA2] text-white relative">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="relative px-6 pt-6 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="w-[94px] h-[94px] rounded-full border-4 border-white/35 bg-[#4B43DF] flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                          {viewing.photoDataUrl ? (
                            <img src={viewing.photoDataUrl} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl font-semibold">{getInitials(viewing)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-2xl sm:text-[25px] font-extrabold truncate">{viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim() || "Staff Member"}</h1>
                          <p className="text-sm text-white/80 mt-1 truncate">{viewing.email || "No email listed"}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-bold flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${viewing.status === "inactive" || viewing.isActive === false ? "bg-gray-300" : "bg-white"}`} />
                              {viewing.status === "inactive" || viewing.isActive === false ? "Inactive" : "Active"}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-bold">▣ {getDisplayEmpId(viewing)}</span>
                            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-bold">{viewing.experience || 0} yrs exp</span>
                            {viewing.subject && <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-bold">▣ {viewing.subject}</span>}
                            {viewing.qualification && <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[11px] font-bold">{viewing.qualification.split(",")[0]}</span>}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => openEdit(viewing)} className="bg-white text-[#1261C9] hover:bg-white/95 rounded-xl h-10 px-5 font-bold text-xs shadow-md shrink-0">
                        <Pencil size={14} className="mr-2" /> Edit Profile
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 mt-6 -mx-6 -mb-5 border-t border-white/15">
                      {[
                        { value: assignedBatchNames(viewing).length, label: "BATCHES" },
                        { value: attendancePercent(viewing) + "%", label: "ATTENDANCE" },
                        { value: payslipCount(viewing), label: "PAYSLIPS" },
                        { value: subjectCount(viewing), label: "SUBJECTS" },
                      ].map((item, i) => (
                        <div key={item.label} className={`py-4 text-center ${i > 0 ? "border-l border-white/15" : ""}`}>
                          <div className="text-2xl font-extrabold">{item.value}</div>
                          <div className="text-[10px] tracking-wider font-bold text-white/65 mt-1">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PROFILE TABS */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-2 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: "overview", label: "Overview", icon: UserRound },
                    { id: "attendance", label: "Attendance", icon: Calendar },
                    { id: "payroll", label: "Payroll", icon: IndianRupee },
                    { id: "payslip", label: "Payslip Downloads", icon: FileText },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setProfileTab(tab.id as any)} className={`px-4 py-2.5 rounded-t-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap ${profileTab === tab.id ? "bg-[#E6F0FF] text-[#1261C9] border-b-2 border-[#1261C9]" : "text-[#64748B] hover:bg-gray-50"}`}>
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>

                {profileTab === "overview" && (
                  <>
                    {/* PROFILE INFORMATION */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><UserRound size={15} className="text-[#1261C9]" /></div>
                        <h3 className="text-sm font-extrabold text-gray-900">Profile Information</h3>
                      </div>
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                        <InfoItem label="FULL NAME" value={viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim() || "—"} />
                        <InfoItem label="EMAIL" value={viewing.email || "—"} />
                        <InfoItem label="PHONE" value={viewing.phone || "—"} />
                        <InfoItem label="EMPLOYEE ID" value={getDisplayEmpId(viewing)} />
                        <InfoItem label="JOINING DATE" value={formatDate(viewing.joinDate)} />
                        <InfoItem label="EXPERIENCE" value={viewing.experience ? `${viewing.experience} years` : "—"} />
                        <InfoItem label="QUALIFICATION" value={viewing.qualification || "—"} />
                        <InfoItem label="SPECIALIZATION" value={viewing.subject || "—"} />
                        <InfoItem label="EMPLOYMENT TYPE" value={formatEmploymentType(viewing.employmentType)} />
                        <InfoItem label="STATUS" value={<span className="text-emerald-600 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{viewing.status === "inactive" || viewing.isActive === false ? "Inactive" : "Active"}</span>} />
                        <div className="md:col-span-2">
                          <InfoItem label="BRANCHES" value={viewing.branches || viewing.branch || "All branches (institute-wide)"} />
                        </div>
                        <div className="md:col-span-2 border-t border-gray-100 pt-4">
                          <InfoItem label="BIO" value={viewing.bio || `Experienced ${viewing.subject || "staff"} educator${viewing.experience ? ` with ${viewing.experience} years` : ""}.`} />
                        </div>
                      </div>
                    </div>

                    {/* LEAVE QUOTA */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><Calendar size={15} className="text-[#1261C9]" /></div><h3 className="text-sm font-extrabold">Leave Quota — {new Date().getFullYear()}</h3></div>
                        <span className="text-xs text-gray-400">Joined {formatDate(viewing.joinDate)}</span>
                      </div>
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {leaveQuota(viewing).map((leave: any) => (
                          <div key={leave.label} className="rounded-xl border border-[#BFD4F6] bg-[#FBFDFF] p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold"><span className={`w-2 h-2 rounded-full ${leave.dot}`} />{leave.label}</div>
                            <div className={`mt-2 text-2xl font-extrabold ${leave.used > 0 ? "text-[#1261C9]" : "text-emerald-600"}`}>{leave.total} <span className="text-xs font-medium text-gray-400">/ {leave.total}</span></div>
                            <div className="text-[10px] text-gray-500 mt-1">{leave.used} used</div>
                            <div className="h-1 bg-[#C8D9F3] rounded-full mt-2"><div className="h-full rounded-full bg-[#9DBCE9]" style={{ width: `${leave.total ? Math.min(100, (leave.used / leave.total) * 100) : 0}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ASSIGNED BATCHES */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><Briefcase size={15} className="text-[#1261C9]" /></div><h3 className="text-sm font-extrabold">Assigned Batches in Timetable ({assignedBatchNames(viewing).length})</h3></div>
                      <div className="p-5 flex flex-wrap gap-2">
                        {assignedBatchNames(viewing).length ? assignedBatchNames(viewing).map((batch: string) => <span key={batch} className="px-3 py-2 rounded-lg border border-[#9BD2FF] bg-[#F7FCFF] text-[#0071BC] text-xs font-bold">♣ {batch}</span>) : <span className="text-xs text-gray-400">No batches assigned.</span>}
                      </div>
                    </div>

                  </>
                )}

                {profileTab === "attendance" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl border-t-4 border-[#16B981] shadow-sm px-5 py-5 text-center">
                        <div className="text-2xl font-extrabold text-[#0BA879]">{attendanceStats(viewing).present}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">PRESENT</div>
                      </div>
                      <div className="bg-white rounded-2xl border-t-4 border-[#FF4B4B] shadow-sm px-5 py-5 text-center">
                        <div className="text-2xl font-extrabold text-[#FF4141]">{attendanceStats(viewing).absent}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">ABSENT</div>
                      </div>
                      <div className="bg-white rounded-2xl border-t-4 border-[#2670D8] shadow-sm px-5 py-5 text-center">
                        <div className="text-2xl font-extrabold text-[#2469CE]">{attendancePercent(viewing)}%</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">THIS MONTH</div>
                      </div>
                    </div>

                    {(() => {
                      const cal = attendanceCalendar(viewing);
                      const monthLabel = new Date(cal.year, cal.month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
                      const datedRecords = Object.entries(cal.records)
                        .filter(([date]) => date.startsWith(`${cal.year}-${String(cal.month + 1).padStart(2, "0")}`))
                        .sort(([a], [b]) => b.localeCompare(a));
                      return (
                        <>
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><Calendar size={15} className="text-[#1261C9]" /></div>
                                <h3 className="text-sm font-extrabold">{monthLabel} Calendar</h3>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-[#8290A7]">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#D5F7E5]" />Present</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFE0E0]" />Absent</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF0C7]" />Late</span>
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="grid grid-cols-7 text-center mb-3">
                                {['SU','MO','TU','WE','TH','FR','SA'].map(d => <div key={d} className="text-[9px] font-bold text-[#8A9BB4] py-2">{d}</div>)}
                              </div>
                              <div className="grid grid-cols-7 gap-1.5">
                                {cal.cells.map((cell, i) => (
                                  <div key={`${cell.date || 'blank'}-${i}`} className={`min-h-[72px] rounded-lg flex items-center justify-center text-[11px] font-semibold ${cell.day ? attendanceStatusClass(cell.status) : ''} ${cell.day && !cell.status ? 'text-[#14213D]' : ''} ${!cell.day ? 'bg-transparent' : ''}`}>
                                    {cell.day || ''}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 border-t border-gray-100 pt-3 space-y-0">
                                {datedRecords.length ? datedRecords.map(([date, status]) => {
                                  const d = new Date(`${date}T00:00:00`);
                                  return (
                                    <div key={date} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0 text-xs">
                                      <span className="font-semibold text-[#14213D]">{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}</span>
                                      <span className="px-2.5 py-1 rounded-full bg-[#EEF5FF] text-[#1261C9] text-[10px] font-bold">{attendanceStatusLabel(status)}</span>
                                    </div>
                                  );
                                }) : (
                                  <div className="py-3 text-center text-xs text-[#94A3B8]">No dated attendance records available for this month.</div>
                                )}
                              </div>
                            </div>
                          </div>

                        </>
                      );
                    })()}
                  </>
                )}

                {profileTab === "payroll" && (() => {
                  const salary = Number(viewing.salary || viewing.monthlySalary || 0) || 0;
                  const slips = payslipList(viewing);
                  const totalEarned = slips.reduce((sum: number, item: any) => sum + (Number(item?.gross ?? item?.grossPay ?? item?.amount ?? 0) || 0), 0);
                  const lastNet = slips.length ? Number(slips[slips.length - 1]?.netPay ?? slips[slips.length - 1]?.net ?? slips[slips.length - 1]?.amount ?? 0) || 0 : estimatedNet(viewing);
                  const paidSlips = slips.filter((item: any) => /paid|settled|finalized/i.test(String(item?.status || ""))).length;
                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border-t-4 border-[#2670D8] shadow-sm px-5 py-5 text-center"><div className="text-2xl font-extrabold">₹{totalEarned.toLocaleString("en-IN")}</div><div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">TOTAL EARNED</div></div>
                        <div className="bg-white rounded-2xl border-t-4 border-[#16B981] shadow-sm px-5 py-5 text-center"><div className="text-2xl font-extrabold">₹{lastNet.toLocaleString("en-IN")}</div><div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">LAST NET PAY</div></div>
                        <div className="bg-white rounded-2xl border-t-4 border-[#F0A000] shadow-sm px-5 py-5 text-center"><div className="text-2xl font-extrabold">{paidSlips}/{slips.length}</div><div className="text-[10px] uppercase tracking-wider font-bold text-[#8A9BB4] mt-2">PAID SLIPS</div></div>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><FileText size={15} className="text-[#1261C9]" /></div><h3 className="font-extrabold text-sm">Payroll History</h3></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#8A9BB4] border-b border-gray-100"><th className="px-5 py-3">MONTH</th><th className="px-5 py-3">GROSS</th><th className="px-5 py-3">DEDUCTIONS</th><th className="px-5 py-3">NET PAY</th><th className="px-5 py-3">STATUS</th><th className="px-5 py-3 text-right">DAYS</th></tr></thead>
                            <tbody>
                              {slips.map((item: any, i: number) => {
                                const gross = Number(item?.gross ?? item?.grossPay ?? item?.amount ?? salary) || 0;
                                const deductions = Number(item?.deductions ?? item?.deduction ?? (gross * ((Number(viewing.pfDeduction || 0) + Number(viewing.tdsDeduction || 0)) / 100))) || 0;
                                const net = Number(item?.netPay ?? item?.net ?? Math.max(0, gross - deductions)) || 0;
                                const status = String(item?.status || "Draft");
                                const days = item?.presentDays != null && item?.workingDays != null ? `${item.presentDays}/${item.workingDays}` : "—";
                                return <tr key={`${item?.month || "month"}-${i}`} className="border-b border-gray-100 last:border-b-0"><td className="px-5 py-3 font-bold">{item?.month || "Current Month"}</td><td className="px-5 py-3">₹{gross.toLocaleString("en-IN")}</td><td className="px-5 py-3 text-red-500">−₹{deductions.toLocaleString("en-IN")}</td><td className="px-5 py-3 text-emerald-600 font-extrabold">₹{net.toLocaleString("en-IN")}</td><td className="px-5 py-3"><span className="px-2.5 py-1 rounded-full bg-[#FFF0C7] text-[#A56A00] text-[10px] font-bold">{status}</span></td><td className="px-5 py-3 text-right text-[#64748B]">{days}</td></tr>;
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-extrabold text-sm">Salary Structure</h3></div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-4 rounded-xl bg-[#F7F9FF]"><p className="text-xs text-gray-500">Monthly</p><p className="text-xl font-extrabold mt-2">₹{salary.toLocaleString("en-IN")}</p></div>
                          <div className="p-4 rounded-xl bg-[#F7F9FF]"><p className="text-xs text-gray-500">PF</p><p className="text-xl font-extrabold mt-2">{viewing.pfDeduction || 0}%</p></div>
                          <div className="p-4 rounded-xl bg-[#F7F9FF]"><p className="text-xs text-gray-500">TDS</p><p className="text-xl font-extrabold mt-2">{viewing.tdsDeduction || 0}%</p></div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {profileTab === "payslip" && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><FileText size={15} className="text-[#1261C9]" /></div><h3 className="font-extrabold text-sm">Download Payslips</h3></div><span className="text-xs text-[#94A3B8]">{payslipList(viewing).length} payslip(s) available</span></div>
                    <div className="p-5 space-y-3">
                      {payslipList(viewing).length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#94A3B8] border border-dashed border-[#D8E2F0] rounded-xl">
                          No verified payslips are available for this staff member yet.
                        </div>
                      ) : payslipList(viewing).map((p: any, i: number) => {
                        const gross = Number(p?.gross ?? p?.grossPay ?? p?.amount ?? 0) || 0;
                        const deductions = Number(p?.deductions ?? p?.deduction ?? 0) || 0;
                        const net = Number(p?.netPay ?? p?.net ?? Math.max(0, gross - deductions)) || 0;
                        return <div key={`${p?.month || "payslip"}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-[#E2E8F0] bg-white"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-xl bg-[#FFF1BF] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#E88A00]" /></div><div className="min-w-0"><p className="text-xs font-extrabold truncate">{p?.month || "Current Month"} Payslip</p><p className="text-[10px] text-[#64748B] mt-1">Gross: ₹{gross.toLocaleString("en-IN")} · Deductions: ₹{deductions.toLocaleString("en-IN")}{p?.presentDays != null && p?.workingDays != null ? ` · Present: ${p.presentDays}/${p.workingDays} days` : ""}</p></div></div><div className="flex items-center gap-4 sm:gap-6"><span className="text-lg font-extrabold text-emerald-600">₹{net.toLocaleString("en-IN")}</span><button type="button" onClick={() => downloadPayslipPdf(p, i)} className="px-4 py-2 rounded-lg bg-[#EEF3FF] border border-[#C9D9FF] text-[#1261C9] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E5EDFF]"><DownloadCloud size={14} /> PDF</button></div></div>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDEBAR */}
              <aside className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full border-4 border-[#DCE7FF] bg-[#4B43DF] text-white flex items-center justify-center overflow-hidden shadow-sm">
                    {viewing.photoDataUrl ? <img src={viewing.photoDataUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-semibold">{getInitials(viewing)}</span>}
                  </div>
                  <h3 className="font-extrabold text-base mt-4">{viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim() || "Staff Member"}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">{viewing.email || "No email linked"}</p>
                  <span className="inline-block mt-3 px-2.5 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600">{getDisplayEmpId(viewing)}</span>

                  <div className="mt-5 pt-5 border-t border-gray-100 text-left">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8]">Salary Structure</p>
                    <div className="mt-3 p-3 rounded-xl bg-[#F7F9FF] border border-[#E2E8F5] space-y-3">
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Monthly</span><b>₹{Number(viewing.salary || viewing.monthlySalary || 0).toLocaleString("en-IN")}</b></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">PF</span><span className="text-gray-400">{viewing.pfDeduction || 0}%</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">TDS</span><span className="text-gray-400">{viewing.tdsDeduction || 0}%</span></div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-[#F0FFF8] border border-[#A9EACD] text-left">
                    <div className="flex items-center justify-between"><span className="text-[10px] uppercase font-bold text-emerald-600">THIS MONTH</span><b className="text-2xl text-emerald-600">{attendancePercent(viewing)}%</b></div>
                    <div className="h-1.5 bg-[#CFF4E2] rounded-full mt-3"><div className="h-full bg-[#19B97A] rounded-full" style={{width:`${attendancePercent(viewing)}%`}} /></div>
                    <div className="flex gap-4 text-[10px] mt-2"><span className="text-emerald-700">✓ {attendanceStats(viewing).present} present</span><span className="text-red-500">✕ {attendanceStats(viewing).absent} absent</span></div>
                  </div>

                  <Button onClick={() => openEdit(viewing)} className="w-full mt-4 bg-[#1267D3] hover:bg-[#0D55B5] text-white rounded-xl h-11 text-xs font-extrabold"><Pencil size={14} className="mr-2" /> Edit Profile</Button>
                  <Button onClick={backToList} variant="outline" className="w-full mt-2 border-gray-200 text-gray-600 rounded-xl h-11 text-xs font-bold hover:bg-gray-50">← Back to Staff List</Button>

                  <div className="mt-5 pt-4 border-t border-gray-100 text-left space-y-2 text-[10px] text-gray-400">
                    <p>▣ Member since {formatDate(viewing.joinDate)}</p>
                    <p>▣ Joined {formatDate(viewing.joinDate)}</p>
                    <p>◷ Last login: {viewing.lastLogin || "Not available"}</p>
                  </div>
                </div>
              </aside>
            </div>

            {(profileTab === "overview" || profileTab === "attendance" || profileTab === "payroll" || profileTab === "payslip") && (
              <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center"><FolderOpen size={15} className="text-[#1261C9]" /></div>
                    <h3 className="text-sm font-extrabold">Documents</h3>
                  </div>
                  <input ref={viewDocInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleViewDocumentUpload} />
                  <Button type="button" onClick={() => viewDocInputRef.current?.click()} className="h-9 px-4 rounded-xl bg-[#1261C9] hover:bg-[#0D55B5] text-white text-xs font-bold"><Plus size={14} className="mr-1.5" /> Upload</Button>
                </div>
                <div className="p-5">
                  {viewDocuments(viewing).length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {viewDocuments(viewing).map((doc: any, i: number) => (
                        <div key={`${doc.name}-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={17} className="text-[#1261C9] shrink-0" />
                            <div className="min-w-0"><p className="text-xs font-bold truncate">{doc.label || doc.name}</p><p className="text-[10px] text-gray-400 truncate">{doc.name}</p></div>
                          </div>
                          {doc.dataUrl && <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="text-[#1261C9] shrink-0"><DownloadCloud size={15} /></a>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="min-h-[145px] flex flex-col items-center justify-center text-center"><FolderOpen size={34} className="text-[#CBD5E1]" /><p className="text-xs text-[#94A3B8] mt-3">No documents uploaded yet.</p></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================== LIST VIEW ============================== */
        <div className="min-h-full bg-[#E9EEF5] px-4 sm:px-6 lg:px-7 py-5 sm:py-6">
          <div className="max-w-[1400px] mx-auto space-y-5">
            {/* ================= HEADER ================= */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#1261C9] tracking-tight">{pageTitle === "Staff Directory" ? "Staff" : pageTitle}</h1>
                <p className="text-sm text-[#64748B] mt-0.5">{totalStaffCount} staff members · Manage your team</p>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  className="h-10 px-4 rounded-xl bg-white border border-gray-200 text-[#1F2937] text-sm font-semibold shadow-sm hover:shadow-md transition flex items-center gap-2"
                >
                  <Calendar size={15} className="text-[#2563EB]" />
                  Work Shifts
                </button>

                <button
                  type="button"
                  className="h-10 px-4 rounded-xl bg-white border border-gray-200 text-[#1F2937] text-sm font-semibold shadow-sm hover:shadow-md transition flex items-center gap-2"
                >
                  <Upload size={15} className="text-[#64748B]" />
                  Import
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                <button
                  type="button"
                  onClick={openAdd}
                  className="h-10 px-4 sm:px-5 rounded-xl bg-[#0757B8] hover:bg-[#064A9D] text-white text-sm font-bold shadow-[0_5px_15px_rgba(7,87,184,0.25)] transition flex items-center justify-center gap-2 ml-auto lg:ml-0"
                >
                  <Plus size={16} />
                  Add New Staff
                </button>
              </div>
            </div>

            {/* ================= SUMMARY CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex items-center gap-4 min-h-[104px]">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF4FC] text-[#1464C8] flex items-center justify-center shrink-0">
                  <Users size={23} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8290A5]">Total Staff</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] leading-none mt-1">{totalStaffCount}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">{activeCount} active</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex items-center gap-4 min-h-[104px]">
                <div className="w-12 h-12 rounded-2xl bg-[#DDF8EA] text-[#059669] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={23} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8290A5]">Active</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] leading-none mt-1">{activeCount}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">{inactiveCount} inactive</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex items-center gap-4 min-h-[104px]">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF1CC] text-[#F59E0B] flex items-center justify-center shrink-0">
                  <Calendar size={23} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8290A5]">Today's Classes</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] leading-none mt-1">6</p>
                  <p className="text-[11px] text-[#64748B] mt-1">scheduled today</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex items-center gap-4 min-h-[104px]">
                <div className="w-12 h-12 rounded-2xl bg-[#EEE9FF] text-[#6D4AEF] flex items-center justify-center shrink-0">
                  <IndianRupee size={23} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8290A5]">Total Salary/Mo</p>
                  <p className="text-2xl font-extrabold text-[#0F172A] leading-none mt-1">₹{totalSalarySum.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">payroll this month</p>
                </div>
              </div>
            </div>

            {/* ================= SEARCH + STATUS ================= */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-3 flex flex-col lg:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, subject, employee ID..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#9AAAC0] bg-white text-sm text-gray-800 placeholder:text-[#7A8798] focus:outline-none focus:ring-2 focus:ring-[#1D6FD1]/20 focus:border-[#1D6FD1]"
                />
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
                <button type="button" onClick={() => setStatusFilter("all")} className={`h-10 px-4 rounded-xl text-xs font-bold border transition ${statusFilter === "all" ? "bg-[#F1F7FF] text-[#0757B8] border-[#1464C8]" : "bg-white text-[#334155] border-[#9AAAC0] hover:bg-gray-50"}`}>
                  All ({totalStaffCount})
                </button>
                <button type="button" onClick={() => setStatusFilter("active")} className={`h-10 px-4 rounded-xl text-xs font-bold border transition ${statusFilter === "active" ? "bg-[#F1F7FF] text-[#0757B8] border-[#1464C8]" : "bg-white text-[#334155] border-[#9AAAC0] hover:bg-gray-50"}`}>
                  Active ({activeCount})
                </button>
                <button type="button" onClick={() => setStatusFilter("inactive")} className={`h-10 px-4 rounded-xl text-xs font-bold border transition ${statusFilter === "inactive" ? "bg-[#F1F7FF] text-[#0757B8] border-[#1464C8]" : "bg-white text-[#334155] border-[#9AAAC0] hover:bg-gray-50"}`}>
                  Inactive ({inactiveCount})
                </button>
                <div className="flex items-center border border-[#9AAAC0] rounded-xl overflow-hidden bg-white ml-0.5">
                  <button type="button" onClick={() => setViewType("grid")} className={`h-10 w-10 flex items-center justify-center transition ${viewType === "grid" ? "bg-[#1464C8] text-white" : "text-[#64748B] hover:bg-gray-50"}`} title="Grid view"><LayoutGrid size={17} /></button>
                  <button type="button" onClick={() => setViewType("list")} className={`h-10 w-10 flex items-center justify-center transition border-l border-[#9AAAC0] ${viewType === "list" ? "bg-[#1464C8] text-white" : "text-[#64748B] hover:bg-gray-50"}`} title="List view"><List size={17} /></button>
                </div>
              </div>
            </div>

            {/* ================= DESIGNATION TABS ================= */}
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
              {designationTabs.map((tab) => {
                const count = tab === "All Staff"
                  ? currentStaffList.length
                  : currentStaffList.filter(m => (m.positionTitle || m.role || "").toLowerCase() === tab.toLowerCase()).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDesignationTab(tab)}
                    className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap border transition ${designationTab === tab
                      ? "bg-[#0757B8] text-white border-[#0757B8] shadow-[0_4px_10px_rgba(7,87,184,0.22)]"
                      : "bg-white text-[#334155] border-[#9AAAC0] hover:border-[#1464C8] hover:text-[#0757B8]"}`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">Loading staff profiles...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">No profiles correspond to selected parameters.</div>
            ) : viewType === "grid" ? (
              /* ================= GRID CARDS ================= */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredStaff.map((member: any) => {
                  const memberId = member.id || member._id;
                  const displayName = member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Staff Member";
                  const designation = member.positionTitle || member.role || "Staff Member";
                  const subjects = Array.isArray(member.subjectsTaught)
                    ? member.subjectsTaught.map((s: any) => s?.subject).filter(Boolean)
                    : [];
                  const fallbackSubject = member.subject ? String(member.subject).split(",")[0].trim() : "";
                  const primarySubject = subjects[0] || fallbackSubject || designation;
                  const assignedSubjects = Array.from(new Set(subjects.length ? subjects : (member.subject ? String(member.subject).split(",").map((x: string) => x.trim()).filter(Boolean) : [])));
                  const experience = member.experience ? `${member.experience}${String(member.experience).toLowerCase().includes("yr") ? "" : " yrs"}` : "—";
                  const joined = member.joinDate ? new Date(member.joinDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
                  const isActive = (member.status ?? "active") === "active" || member.isActive === true;
                  const staffTypeLabel = member.staffType === "computer" ? "COMPUTER" : designation.toLowerCase().includes("counsell") ? "COUNSELLOR" : "TEACHER";
                  return (
                    <div key={memberId} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#EEF2F7] border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                              {member.photoDataUrl ? (
                                <img src={member.photoDataUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl font-bold text-[#4F46E5]">{displayName.split(/\s+/).map((n: string) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-extrabold text-[#0F172A] truncate">{displayName}</h3>
                              <p className="text-xs text-[#55708F] mt-1 truncate">{primarySubject}</p>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <button type="button" onClick={() => toggleStatus(member)} className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wide ${isActive ? "bg-[#DDF8EA] text-[#087A57]" : "bg-gray-100 text-gray-600"}`}>
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 align-middle" />{isActive ? "ACTIVE" : "INACTIVE"}
                                </button>
                                <span className="px-2.5 py-1 rounded-full bg-[#EEF4FC] text-[#1261C9] text-[9px] font-extrabold tracking-wide">{staffTypeLabel}</span>
                              </div>
                            </div>
                          </div>
                          <button type="button" className="w-8 h-8 rounded-lg border border-gray-200 text-[#64748B] flex items-center justify-center hover:bg-gray-50 shrink-0" title="More actions">
                            <MoreVertical size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 bg-[#F8FAFC] px-5 py-3.5 grid grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <p className="text-[9px] font-bold text-[#8A99AD] uppercase tracking-wider">Experience</p>
                          <p className="text-xs font-semibold text-[#1E293B] mt-1">{experience}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-[#8A99AD] uppercase tracking-wider">Emp ID</p>
                          <p className="text-xs font-semibold text-[#1E293B] mt-1">{getDisplayEmpId(member)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-[#8A99AD] uppercase tracking-wider">Phone</p>
                          <p className="text-xs font-semibold text-[#1E293B] mt-1 truncate">{member.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-[#8A99AD] uppercase tracking-wider">Joined</p>
                          <p className="text-xs font-semibold text-[#1E293B] mt-1">{joined}</p>
                        </div>
                      </div>

                      <div className="px-5 py-3 min-h-[52px] border-t border-gray-100">
                        {assignedSubjects.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedSubjects.slice(0, 4).map((subject: string, i: number) => (
                              <span key={`${subject}-${i}`} className="px-2.5 py-1 rounded-full bg-[#F2F6FF] border border-[#C9D8FF] text-[#1261C9] text-[10px] font-semibold">{subject}</span>
                            ))}
                            {assignedSubjects.length > 4 && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">+{assignedSubjects.length - 4}</span>}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#A0ACBB]">No subjects assigned</span>
                        )}
                      </div>

                      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                        <button type="button" onClick={() => openView(member)} className="flex-1 h-9 rounded-xl border border-[#B9D1FF] text-[#1261C9] text-xs font-bold hover:bg-[#F3F7FF] transition flex items-center justify-center gap-1.5"><Eye size={14} /> View</button>
                        <button type="button" onClick={() => openEdit(member)} className="flex-1 h-9 rounded-xl border border-[#B8EBCF] text-[#079455] text-xs font-bold hover:bg-[#F0FDF4] transition flex items-center justify-center gap-1.5"><Pencil size={14} /> Edit</button>
                        <button type="button" onClick={() => member.email && (window.location.href = `mailto:${member.email}`)} className="w-11 h-9 rounded-xl border border-gray-200 text-[#64748B] hover:bg-gray-50 transition flex items-center justify-center" title="Email staff"><Mail size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ================= LIST CARDS ================= */
              <div className="space-y-3">
                {filteredStaff.map((member: any) => {
                  const memberId = member.id || member._id;
                  const displayName = member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Staff Member";
                  const designation = member.positionTitle || member.role || "Staff Member";
                  const subjects = Array.isArray(member.subjectsTaught) ? member.subjectsTaught.map((s: any) => s?.subject).filter(Boolean) : [];
                  const fallbackSubject = member.subject ? String(member.subject).split(",")[0].trim() : "";
                  const primarySubject = subjects[0] || fallbackSubject || designation;
                  const isActive = (member.status ?? "active") === "active" || member.isActive === true;
                  return (
                    <div key={memberId} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#EEF2F7] border border-gray-100 flex items-center justify-center shrink-0">
                        {member.photoDataUrl ? <img src={member.photoDataUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-base font-bold text-[#4F46E5]">{displayName.split(/\s+/).map((n: string) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-[#0F172A]">{displayName}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold ${isActive ? "bg-[#DDF8EA] text-[#087A57]" : "bg-gray-100 text-gray-600"}`}>{isActive ? "● ACTIVE" : "● INACTIVE"}</span>
                          <span className="px-2.5 py-1 rounded-full bg-[#EEF4FC] text-[#1261C9] text-[9px] font-extrabold">{member.staffType === "computer" ? "COMPUTER" : "TEACHER"}</span>
                        </div>
                        <p className="text-xs text-[#55708F] mt-1">{primarySubject}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-[#718096]">
                          <span>▣ {getDisplayEmpId(member)}</span>
                          <span>⌕ {member.phone || "—"}</span>
                          <span>▣ {member.experience ? `${member.experience}${String(member.experience).toLowerCase().includes("yr") ? "" : " yrs"}` : "—"}</span>
                          {subjects.length > 0 && <span>▧ {subjects.slice(0, 2).join(", ")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => openView(member)} className="h-9 px-4 rounded-xl border border-[#B9D1FF] text-[#1261C9] text-xs font-bold hover:bg-[#F3F7FF] flex items-center gap-1.5"><Eye size={14} /> View</button>
                        <button type="button" onClick={() => openEdit(member)} className="h-9 px-4 rounded-xl border border-[#B8EBCF] text-[#079455] text-xs font-bold hover:bg-[#F0FDF4] flex items-center gap-1.5"><Pencil size={14} /> Edit</button>
                        <button type="button" className="w-9 h-9 rounded-xl border border-gray-200 text-[#64748B] flex items-center justify-center hover:bg-gray-50"><MoreVertical size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}