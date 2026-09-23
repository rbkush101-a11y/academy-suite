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
  ClipboardList, AlarmClock, Timer, Info, Camera
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

const ALL_SYSTEM_META_KEYS = [
  META_GENDER_KEY, META_QUALIFICATION_KEY, META_EMPID_KEY, 
  META_STATE_KEY, META_DISTRICT_KEY, META_PIN_KEY,
  META_PERM_ADDRESS_KEY, META_PERM_STATE_KEY, META_PERM_DISTRICT_KEY, META_PERM_PIN_KEY
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

// ================= LIVE CAMERA =================
const [cameraActive, setCameraActive] = useState(false);
const videoRef = useRef<HTMLVideoElement | null>(null);
const streamRef = useRef<MediaStream | null>(null);

const startCamera = async () => {
  // Pehle purana stream band karo (agar koi ho)
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  try {
    // 1. Pehle permission + stream lo
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    streamRef.current = stream;

    // 2. Tab modal open karo
    setCameraActive(true);
  } catch (err: any) {
    console.error("Camera error:", err);
    const msg =
      err?.name === "NotAllowedError"
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

  // Mirror hata ke natural photo
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  setValue("photoDataUrl", dataUrl);
  stopCamera();
};

// Modal open hone ke BAAD video pe stream chipkao
useEffect(() => {
  if (!cameraActive) return;

  let cancelled = false;
  let tries = 0;

  const attach = () => {
    if (cancelled) return;
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) {
      // video abhi DOM mein nahi aaya — thoda wait
      if (tries < 20) {
        tries += 1;
        setTimeout(attach, 50);
      }
      return;
    }

    // Important: pehle clear, phir set
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch((e) => {
        console.warn("video.play() blocked:", e);
        // user gesture ke baad kabhi-kabhi dubara try
        setTimeout(() => video.play().catch(() => {}), 100);
      });
    }
  };

  // next paint pe attach
  requestAnimationFrame(() => attach());

  return () => {
    cancelled = true;
  };
}, [cameraActive]);

// Unmount cleanup
useEffect(() => {
  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };
}, []);

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

    // Extract subjects taught or convert existing subject string
    let loadedSubjectsTaught: SubjectTaughtRow[] = Array.isArray(member.subjectsTaught) && member.subjectsTaught.length > 0 
      ? member.subjectsTaught 
      : [{ course: "", subject: member.subject || "", batch: "" }];

    // Auto-map legacy salary to correct sub-states on editing
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
      
      subjectsTaught: loadedSubjectsTaught,
      employmentType: selectedEmpType,
      monthlySalary: selectedEmpType === "full_time" ? rawSalStr : "",
      perClassRate: selectedEmpType === "contractual" ? rawSalStr : (member.perClassRate ? String(member.perClassRate) : ""),
      baseSalary: selectedEmpType === "hybrid" ? rawSalStr : (member.baseSalary ? String(member.baseSalary) : ""),
      hourlyRate: selectedEmpType === "hourly" ? rawSalStr : (member.hourlyRate ? String(member.hourlyRate) : ""),
      pfDeduction: String(member.pfDeduction ?? "12"),
      tdsDeduction: String(member.tdsDeduction ?? "0"),
      batches: Array.isArray(member.batches) ? member.batches : (Array.isArray(member.assignedBatches) ? member.assignedBatches : []),
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

    // Combine subjects for legacy string
    const combinedSubjectsString = form.subjectsTaught
      .map(s => s.subject)
      .filter(Boolean)
      .join(", ") || form.subject;

    // Extract assigned batches from subjectsTaught rows
    const derivedBatchesFromRows = Array.from(new Set(
      form.subjectsTaught.map(s => s.batch).filter(b => b && b !== "All Batches")
    ));

    const data: any = {
      ...cleanForm, 
      empId: form.empId,               
      employeeId: form.empId,          
      role: finalSystemRole,            
      positionTitle: finalDesignation,  
      staffType: pageType ?? form.staffType ?? "academic",
      name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      salary: legacySalaryVal, 
      
      subject: combinedSubjectsString,
      subjectsTaught: form.subjectsTaught,
      batches: derivedBatchesFromRows.length > 0 ? derivedBatchesFromRows : form.batches,

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
    <div className="min-h-screen bg-[#EBEFE6] font-sans text-gray-800">
      
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

                {/* ================= SUBJECTS TAUGHT SECTION WITH "NONE" ================= */}
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
                    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        // mirror preview (selfie jaisa)
                        style={{ transform: "scaleX(-1)" }}
                        className="w-full h-full object-cover"
                      />
                      {/* Face guide */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-white/40 border-dashed" />
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
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-[#5B7023] via-[#6B8330] to-[#7A9532] rounded-2xl shadow-lg overflow-hidden text-white relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="p-6 relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                      <div className="w-20 h-20 rounded-full border-4 border-white/30 bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                        {viewing.photoDataUrl ? (
                          <img src={viewing.photoDataUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserRound size={36} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold leading-tight">{viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim() || "Staff Member"}</h1>
                        <p className="text-sm text-white/80 flex items-center justify-center sm:justify-start gap-1 mt-1"><Mail size={12} /> {viewing.email || "No email listed"}</p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3.5">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${viewing.status === "active" || viewing.isActive ? "bg-green-400" : "bg-gray-400"}`}></span>
                            {(viewing.status || "active").toUpperCase()}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur-sm">📋 {getDisplayEmpId(viewing)}</span>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => openEdit(viewing)} className="bg-white text-[#5B7023] hover:bg-white/95 rounded-xl text-xs h-9 font-bold shadow-md w-full sm:w-auto transition-all shrink-0">
                      <Pencil size={12} className="mr-1.5" /> Modify Profile
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-white/10">
                    <div className="text-center">
                      <h4 className="text-xl sm:text-2xl font-bold">{(viewing.subjectsTaught || []).filter((s: any) => s.course).length || viewing.subject?.split(',').filter(Boolean).length || 0}</h4>
                      <p className="text-[9px] font-bold text-white/75 uppercase tracking-wider mt-1">Subjects</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <h4 className="text-xl sm:text-2xl font-bold">100%</h4>
                      <p className="text-[9px] font-bold text-white/75 uppercase tracking-wider mt-1">Attendance</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <h4 className="text-xl sm:text-2xl font-bold">{viewing.documents?.filter((d: any) => !ALL_SYSTEM_META_KEYS.includes(d.label))?.length || 0}</h4>
                      <p className="text-[9px] font-bold text-white/75 uppercase tracking-wider mt-1 font-sans">Files</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                      <h4 className="text-xl sm:text-2xl font-bold">{viewing.experience || "0"}+ Yrs</h4>
                      <p className="text-[9px] font-bold text-white/75 uppercase tracking-wider mt-1">Experience</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "overview", label: "Overview", icon: UserRound },
                  { id: "attendance", label: "Attendance Log", icon: Calendar },
                  { id: "payroll", label: "Salary Details", icon: IndianRupee },
                  { id: "payslip", label: "Payslip Downloads", icon: FileText },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setProfileTab(tab.id as any)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${profileTab === tab.id ? "bg-[#F0F4E8] text-[#5B7023]" : "text-gray-500 hover:bg-gray-50"}`}>
                    <tab.icon size={13} /> {tab.label}
                  </button>
                ))}
              </div>

              {profileTab === "overview" && (
                <>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#F0F4E8] flex items-center justify-center"><UserRound size={15} className="text-[#5B7023]"/></div>
                      <h3 className="text-sm font-bold text-gray-800">Complete Profile</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem label="First & Last Name" value={viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim()} />
                      <InfoItem label="Personal Mobile" value={viewing.phone} />
                      <InfoItem label="Email Account" value={viewing.email} />
                      <InfoItem label="ID Number" value={getDisplayEmpId(viewing)} />
                      <InfoItem label="Joining Details" value={formatDate(viewing.joinDate)} />
                      <div className="md:col-span-2">
                        <InfoItem label="Educational Qualifications" value={viewing.qualification ? viewing.qualification.split(',').map((q: string) => <span key={q} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold mr-1.5 mb-1.5">{q.trim()}</span>) : "—"} />
                      </div>

                      {/* SUBJECTS TAUGHT DETAILS IN PROFILE */}
                      <div className="md:col-span-2">
                        <InfoItem 
                          label="Subjects & Courses Taught" 
                          value={
                            Array.isArray(viewing.subjectsTaught) && viewing.subjectsTaught.some((st: any) => st.course)
                              ? (
                                <div className="space-y-1.5 mt-1">
                                  {viewing.subjectsTaught.map((st: any, i: number) => {
                                    if (!st.course) return null;
                                    return (
                                      <div key={i} className="inline-flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg text-xs mr-2 mb-1">
                                        <span className="font-bold text-gray-700">{st.course}</span>
                                        {st.subject && <span className="text-gray-300">•</span>}
                                        {st.subject && <span className="font-semibold text-[#5B7023]">{st.subject}</span>}
                                        {st.batch && <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">{st.batch}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                              : viewing.subject || "No specialized subject assignments."
                          } 
                        />
                      </div>
                      
                      <InfoItem label="Prior Tenure" value={viewing.experience ? `${viewing.experience} Years` : "—"} />
                      <InfoItem label="Role Designation" value={viewing.positionTitle || viewing.role || "Faculty"} />
                      
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem 
                          label="Correspondence Address" 
                          value={
                            [
                              viewing.localAddress || viewing.address, 
                              viewing.localDistrict || viewing.documents?.find((d: any) => d.label === META_DISTRICT_KEY)?.name, 
                              viewing.localState || viewing.documents?.find((d: any) => d.label === META_STATE_KEY)?.name, 
                              (viewing.localPin || viewing.documents?.find((d: any) => d.label === META_PIN_KEY)?.name) ? `PIN: ${viewing.localPin || viewing.documents?.find((d: any) => d.label === META_PIN_KEY)?.name}` : ""
                            ].filter(Boolean).join(", ") || "No address added"
                          } 
                        />
                        <InfoItem 
                          label="Permanent Address" 
                          value={
                            [
                              viewing.permanentAddress || viewing.documents?.find((d: any) => d.label === META_PERM_ADDRESS_KEY)?.name, 
                              viewing.permanentDistrict || viewing.documents?.find((d: any) => d.label === META_PERM_DISTRICT_KEY)?.name, 
                              viewing.permanentState || viewing.documents?.find((d: any) => d.label === META_PERM_STATE_KEY)?.name, 
                              (viewing.permanentPin || viewing.documents?.find((d: any) => d.label === META_PERM_PIN_KEY)?.name) ? `PIN: ${viewing.permanentPin || viewing.documents?.find((d: any) => d.label === META_PERM_PIN_KEY)?.name}` : ""
                            ].filter(Boolean).join(", ") || "No address added"
                          } 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {profileTab === "attendance" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                  <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
                  <h4 className="text-sm font-bold text-gray-700">Attendance Register</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">This user has maintained a 100% standard attendance during active working days.</p>
                </div>
              )}

              {profileTab === "payroll" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-[#5B7023] flex items-center gap-1.5"><IndianRupee size={16} /> Salary Component</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Basic Gross</p>
                      <p className="text-lg font-extrabold text-gray-800 mt-1">₹{Number(viewing.salary || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">PF Deduction</p>
                      <p className="text-lg font-extrabold text-red-600 mt-1">{viewing.pfDeduction || "0"}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">TDS Deducted</p>
                      <p className="text-lg font-extrabold text-red-500 mt-1">{viewing.tdsDeduction || "0"}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Estimated Net</p>
                      <p className="text-lg font-extrabold text-emerald-600 mt-1">
                        ₹{(Number(viewing.salary || 0) * (1 - (Number(viewing.pfDeduction || 0) + Number(viewing.tdsDeduction || 0)) / 100)).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {profileTab === "payslip" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <h4 className="text-sm font-bold text-gray-700">Digital Payslips</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">Monthly verified payslip items appear automatically once accounting periods close.</p>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-[#F0F4E8] overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                  {viewing.photoDataUrl ? ( <img src={viewing.photoDataUrl} alt="" className="w-full h-full object-cover" /> ) : ( <UserRound size={36} className="text-gray-400"/> )}
                </div>
                <h3 className="font-bold text-lg text-gray-800 leading-tight">{viewing.name || `${viewing.firstName || ""} ${viewing.lastName || ""}`.trim() || "Staff Member"}</h3>
                <p className="text-xs text-gray-400 mt-1">{viewing.email || "No email linked"}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/70 p-4 border-b border-gray-100"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Remuneration Reference</p></div>
                <div className="p-5 space-y-3.5">
                  <div className="flex justify-between items-center"><p className="text-xs text-gray-500 font-semibold">Value Assigned</p><p className="text-base font-bold text-gray-950">₹{Number(viewing.salary || 0).toLocaleString("en-IN")}</p></div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={() => openEdit(viewing)} className="w-full bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl h-11 text-xs font-bold shadow-sm transition-all">
                  <Pencil size={15} className="mr-2" /> Modify Profile details
                </Button>
                <Button onClick={backToList} variant="outline" className="w-full border-gray-200 text-gray-600 rounded-xl h-11 text-xs font-bold hover:bg-gray-50 transition-all">
                  <ArrowLeft size={15} className="mr-2" /> Back to Faculty List
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================== LIST VIEW ============================== */
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#5B7023] leading-none">{pageTitle}</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">{totalStaffCount} listed professionals under verification</p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button onClick={openAdd} className="bg-[#5B7023] hover:bg-[#4a5c1d] text-white rounded-xl gap-2 text-xs font-bold shadow-md w-full sm:w-auto transition-all"><Plus size={16} /> Add Staff Profile</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-[#F4F7EE] p-3 rounded-xl text-[#5B7023]"><Users size={22} /></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Staff</p><h3 className="text-2xl font-bold text-gray-900 mt-0.5">{totalStaffCount}</h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-[#EBF7F0] p-3 rounded-xl text-emerald-600"><CheckCircle2 size={22} /></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Status</p><h3 className="text-2xl font-bold text-gray-900 mt-0.5">{activeCount}</h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-[#FFF6E9] p-3 rounded-xl text-amber-600"><Calendar size={22} /></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lectures scheduled</p><h3 className="text-2xl font-bold text-gray-900 mt-0.5">6</h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-[#F3EFFF] p-3 rounded-xl text-purple-600"><IndianRupee size={22} /></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payroll Baseline</p><h3 className="text-2xl font-bold text-gray-900 mt-0.5">₹{totalSalarySum.toLocaleString("en-IN")}</h3></div>
            </div>
          </div>

          {/* Designation tabs layer */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
            {designationTabs.map((tab) => {
              const count = tab === "All Staff" 
                ? filteredStaff.length 
                : currentStaffList.filter(m => (m.positionTitle || m.role || "").toLowerCase() === tab.toLowerCase()).length;
              return (
                <button
                  key={tab}
                  onClick={() => setDesignationTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    designationTab === tab 
                      ? "bg-[#5B7023] text-white border-[#5B7023] shadow-sm" 
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full pl-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search via name, employee code, subject, course, batch..." className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-transparent border-none focus:outline-none" />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pr-1 w-full md:w-auto shrink-0 justify-end">
              <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${statusFilter === "all" ? "bg-[#F0F4E8] text-[#5B7023] border-[#5B7023]" : "border-gray-200 text-gray-500"}`}>All ({totalStaffCount})</button>
              <button onClick={() => setStatusFilter("active")} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${statusFilter === "active" ? "bg-[#F0F4E8] text-[#5B7023] border-[#5B7023]" : "border-gray-200 text-gray-500"}`}>Active ({activeCount})</button>
              <button onClick={() => setStatusFilter("inactive")} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${statusFilter === "inactive" ? "bg-[#F0F4E8] text-[#5B7023] border-[#5B7023]" : "border-gray-200 text-gray-500"}`}>Inactive ({inactiveCount})</button>
              <div className="flex bg-gray-100 p-1 rounded-lg ml-1">
                <button onClick={() => setViewType("grid")} className={`p-1.5 rounded-md transition-all ${viewType === "grid" ? "bg-[#5B7023] text-white" : "text-gray-400 hover:text-gray-600"}`}><LayoutGrid size={14} /></button>
                <button onClick={() => setViewType("list")} className={`p-1.5 rounded-md transition-all ${viewType === "list" ? "bg-[#5B7023] text-white" : "text-gray-400 hover:text-gray-600"}`}><List size={14} /></button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">Loading staff profiles...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">No profiles correspond to selected parameters.</div>
          ) : viewType === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStaff.map((member: any, index: number) => {
                const memberId = member.id || member._id;
                const displayName = member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Staff Member";
                return (
                  <div key={memberId} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-200 flex flex-col justify-between relative">
                    
                    {/* Serial Badge */}
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#F0F4E8] text-[#5B7023] text-[10px] font-bold flex items-center justify-center border border-[#D8E1C8]">
                      {index + 1}
                    </div>

                    <div>
                      <div className="flex justify-between items-start gap-2 mb-4 pr-6">
                        <div className="flex items-center gap-3">
                          {member.photoDataUrl ? (
                            <img src={member.photoDataUrl} alt="" className="w-12 h-12 rounded-full object-cover border" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#F0F4E8] text-[#5B7023] font-extrabold flex items-center justify-center text-sm">{displayName.charAt(0).toUpperCase()}</div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm leading-tight">{displayName}</h4>
                            <p className="text-[11px] text-[#5B7023] font-semibold mt-0.5 truncate max-w-[130px]">{member.positionTitle || member.role || "Staff Member"}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => toggleStatus(member)} className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition hover:opacity-85 border ${ (member.status ?? "active") === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200" }`}>
                          {member.status ?? "active"}
                        </button>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-600 border-t border-b border-gray-50 py-3 mb-4">
                        <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400 shrink-0" /><span className="truncate">{member.email || "—"}</span></div>
                        <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400 shrink-0" /><span>{member.phone || "—"}</span></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-semibold uppercase">ID: {getDisplayEmpId(member)}</span>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => openView(member)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition" title="View Profile"><Eye size={14} /></button>
                        <button type="button" onClick={() => openEdit(member)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600 transition" title="Edit Profile"><Pencil size={14} /></button>
                        <button type="button" onClick={() => deleteStaff(memberId)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition" title="Delete Profile"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6 w-14 text-center">S.No.</th>
                      <th className="p-4">Profile Details</th>
                      <th className="p-4">Staff Role Type</th>
                      <th className="p-4">System Contact</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                    {filteredStaff.map((member: any, index: number) => {
                      const memberId = member.id || member._id;
                      const displayName = member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Staff Member";
                      return (
                        <tr key={memberId} className="hover:bg-gray-50/30 transition">
                          <td className="p-4 pl-6 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#F0F4E8] text-[#5B7023] text-xs font-bold">
                              {index + 1}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-gray-800 flex items-center gap-3">
                            {member.photoDataUrl ? ( 
                              <img src={member.photoDataUrl} alt="" className="w-8 h-8 rounded-full object-cover border" /> 
                            ) : ( 
                              <div className="w-8 h-8 rounded-full bg-[#F0F4E8] text-[#5B7023] font-extrabold flex items-center justify-center text-xs">{displayName.charAt(0).toUpperCase()}</div> 
                            )}
                            <div><div className="text-sm font-bold text-gray-800 leading-tight">{displayName}</div><div className="text-[10px] text-gray-400 font-semibold tracking-wider mt-0.5 uppercase">ID: {getDisplayEmpId(member)}</div></div>
                          </td>
                          <td className="p-4 text-gray-600 text-xs font-semibold">{member.positionTitle || member.role || "—"}</td>
                          <td className="p-4 text-gray-600 text-xs"><div>{member.phone}</div><div className="text-gray-400">{member.email}</div></td>
                          <td className="p-4">
                            <button type="button" onClick={() => toggleStatus(member)} className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition hover:opacity-85 border ${ (member.status ?? "active") === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200" }`}>{member.status ?? "active"}</button>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => openView(member)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition" title="View Profile"><Eye size={14} /></button>
                              <button type="button" onClick={() => openEdit(member)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600 transition" title="Edit Profile"><Pencil size={14} /></button>
                              <button type="button" onClick={() => deleteStaff(memberId)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition" title="Delete Profile"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}