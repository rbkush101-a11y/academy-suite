import { Link } from "wouter";
import {
  ArrowLeft,
  Gem,
  Gift,
  Rocket,
  TrendingUp,
  Building,
  Users,
  UserCheck,
  Layers,
  Check,
  RefreshCw,
  ArrowDownCircle,
  Table,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Smartphone,
  MessageSquare,
  CreditCard,
  UserPlus,
  HelpCircle,
  CalendarX,
  Library,
  Award,
  Trophy,
  FileQuestion,
  FileText,
  Video,
  Radio,
  Filter,
  GraduationCap,
  BookMarked,
  FileSpreadsheet,
  Bus,
  Clock,
  Users2,
  LayoutGrid,
  Palette,
  Code2,
  Headphones,
  Sparkles,
  Bot,
  Banknote,
  Fingerprint,
  Mail,
  MessageCircle,
  Eye,
  Home,
  ShieldCheck,
  Calendar,
  BookOpen,
} from "lucide-react";

export default function Billing() {
  return (
    <div className="min-h-screen bg-[#eaf0f2] p-4 md:p-8 font-sans text-slate-800 space-y-6">
      
      {/* 🔴 HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#5c6cc0]">
            Plans & Pricing
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Compare plans and upgrade to unlock more modules
          </p>
        </div>

        <Link href="/settings">
          <button className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs flex items-center gap-2 shadow-sm transition-all w-fit">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </button>
        </Link>
      </div>

      {/* 🔴 CURRENT PLAN BANNER */}
      <div className="bg-gradient-to-r from-[#ebf3fa] via-[#eef2fc] to-[#eaf5f0] border border-blue-100 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6366f1] flex items-center justify-center text-white shadow-md shrink-0">
            <Gem className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
              CURRENT PLAN
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h2 className="text-xl font-extrabold text-slate-900">Enterprise</h2>
              <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                Expires 29 Feb 2028
              </span>
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs font-semibold text-slate-400 block">Active Features</span>
          <span className="text-3xl font-black text-emerald-600">58</span>
        </div>
      </div>

      {/* 🔴 4 PRICING CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        
        {/* CARD 1: FREE */}
        <div className="bg-[#f0f2f5] border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-500 mb-4">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800">Free</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Get started for free</p>

            <div className="mt-6 mb-4">
              <span className="text-3xl font-black text-slate-900">Free</span>
              <span className="text-xs font-medium text-slate-400 block mt-1">Always free</span>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>10 students</span>
                <UserCheck className="w-4 h-4 text-slate-400 ml-2" />
                <span>2 faculty</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>2 batches</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <span className="text-[11px] font-semibold text-slate-400 block mb-3">11 features included</span>
            <button disabled className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed bg-slate-100/50">
              <ArrowDownCircle className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>

        {/* CARD 2: STARTER */}
        <div className="bg-[#f0f4f8] border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-500 mb-4">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-extrabold text-sky-600">Starter</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Small coaching institutes</p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹999</span>
                <span className="text-xs font-semibold text-slate-400">/mo</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 block mt-1">
                ₹9,999/yr · Save 17%
              </span>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>200 students</span>
                <UserCheck className="w-4 h-4 text-slate-400 ml-2" />
                <span>10 faculty</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>40 batches</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <span className="text-[11px] font-semibold text-slate-400 block mb-3">29 features included</span>
            <button className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
              <ArrowDownCircle className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>

        {/* CARD 3: GROWTH (POPULAR) */}
        <div className="bg-white border-2 border-[#6366f1] rounded-2xl p-6 flex flex-col justify-between shadow-md relative">
          <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" />
            Popular
          </div>

          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#6366f1]">Growth</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Growing coaching centers</p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹1,999</span>
                <span className="text-xs font-semibold text-slate-400">/mo</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 block mt-1">
                ₹19,999/yr · Save 17%
              </span>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>500 students</span>
                <UserCheck className="w-4 h-4 text-slate-400 ml-2" />
                <span>25 faculty</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>40 batches</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <span className="text-[11px] font-semibold text-slate-400 block mb-3">46 features included</span>
            <button className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
              <ArrowDownCircle className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>

        {/* CARD 4: ENTERPRISE (CURRENT) */}
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 flex flex-col justify-between shadow-md relative">
          <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
            ✓ Current
          </div>

          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-extrabold text-amber-600">Enterprise</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Large coaching chains & groups</p>

            <div className="mt-6 mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹4,999</span>
                <span className="text-xs font-semibold text-slate-400">/mo</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 block mt-1">
                ₹49,999/yr · Save 17%
              </span>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>1,000 students</span>
                <UserCheck className="w-4 h-4 text-slate-400 ml-2" />
                <span>100 faculty</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>100 batches</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">58 features included</span>
            <button className="w-full py-2.5 rounded-xl border border-emerald-500 text-emerald-700 bg-emerald-50/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default">
              <Check className="w-4 h-4" />
              Current Plan
            </button>
            <button className="w-full py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f52e6] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
              <RefreshCw className="w-4 h-4" />
              Extend / Renew Plan
            </button>
          </div>
        </div>

      </div>

      {/* 🔴 COMPLETE FEATURE COMPARISON SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        
        {/* Comparison Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <Table className="w-5 h-5 text-[#6366f1]" />
            <h2 className="text-lg font-bold text-[#3c4b9b]">Complete Feature Comparison</h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            58 features on your current plan
          </span>
        </div>

        {/* Feature Groups */}
        <div className="space-y-6">
          
          {/* Group 1: FREE PLAN */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase block">
              FREE PLAN
            </span>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill icon={Users} label="Student Management" />
              <FeaturePill icon={Layers} label="Batch Management" />
              <FeaturePill icon={CheckCircle2} label="Attendance Tracking" />
              <FeaturePill icon={CreditCard} label="Fee Management" />
              <FeaturePill icon={Video} label="Online Exams" />
              <FeaturePill icon={BookOpen} label="Homework" />
              <FeaturePill icon={Clock} label="Timetable" />
              <FeaturePill icon={BookOpen} label="Subjects & Syllabus" />
            </div>
          </div>

          {/* Group 2: STARTER PLAN */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase block">
              STARTER PLAN
            </span>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill icon={BarChart3} label="Reports & Analytics" />
              <FeaturePill icon={Megaphone} label="Bulk Messaging" />
              <FeaturePill icon={Smartphone} label="SMS Alerts" />
              <FeaturePill icon={MessageSquare} label="WhatsApp Alerts" />
              <FeaturePill icon={CreditCard} label="Online Fee Collection" />
              <FeaturePill icon={UserCheck} label="Parent Pay Portal" />
              <FeaturePill icon={CreditCard} label="EMI / Installments" />
              <FeaturePill icon={UserPlus} label="Online Admissions" />
              <FeaturePill icon={HelpCircle} label="Doubt Solver" />
              <FeaturePill icon={CalendarX} label="Leave & Holidays" />
              <FeaturePill icon={Library} label="Library Management" />
              <FeaturePill icon={Library} label="Library Fine Automation" />
              <FeaturePill icon={Award} label="Certificate Generation" />
            </div>
          </div>

          {/* Group 3: GROWTH PLAN */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase block">
              GROWTH PLAN
            </span>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill icon={Trophy} label="Gamification" />
              <FeaturePill icon={FileQuestion} label="PYQ Papers" />
              <FeaturePill icon={FileText} label="Test Series" />
              <FeaturePill icon={Video} label="Video Lectures" />
              <FeaturePill icon={Radio} label="Live Classes" />
              <FeaturePill icon={Filter} label="Lead CRM" />
              <FeaturePill icon={GraduationCap} label="Alumni Wall" />
              <FeaturePill icon={BarChart3} label="Faculty Analytics" />
              <FeaturePill icon={BookMarked} label="Chapter Progress" />
              <FeaturePill icon={BarChart3} label="Advanced Reports" />
              <FeaturePill icon={FileSpreadsheet} label="Term Report Cards" />
              <FeaturePill icon={FileSpreadsheet} label="Accounting Export" />
              <FeaturePill icon={Bus} label="Transport" />
              <FeaturePill icon={Clock} label="Late Fee Automation" />
              <FeaturePill icon={FileSpreadsheet} label="Offline Exam Management" />
              <FeaturePill icon={Users2} label="PTM Scheduler" />
              <FeaturePill icon={LayoutGrid} label="Custom Form Builder" />
            </div>
          </div>

          {/* Group 4: ENTERPRISE PLAN */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-extrabold tracking-wider text-amber-600 uppercase block">
              ENTERPRISE PLAN
            </span>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill icon={Palette} label="Custom Branding" />
              <FeaturePill icon={Code2} label="API Access" />
              <FeaturePill icon={Headphones} label="Priority Support" />
              <FeaturePill icon={Sparkles} label="AI Exam Generation" />
              <FeaturePill icon={Sparkles} label="AI Assessment" />
              <FeaturePill icon={Bot} label="Maya AI Tutor" />
              <FeaturePill icon={Banknote} label="Payroll & HR" />
              <FeaturePill icon={Fingerprint} label="Biometric Integration" />
              <FeaturePill icon={Mail} label="Email Campaigns" />
              <FeaturePill icon={Video} label="Zoom / Meet" />
              <FeaturePill icon={MessageCircle} label="WhatsApp Bot" />
              <FeaturePill icon={Eye} label="Video Proctoring" />
              <FeaturePill icon={Home} label="Hostel Management" />
              <FeaturePill icon={ShieldCheck} label="Plagiarism Detection" />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

// 🟢 Reusable Feature Pill Badge
function FeaturePill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-[#dcfce7] transition-colors cursor-default">
      <Icon className="w-3.5 h-3.5 text-[#16a34a]" />
      <span>{label}</span>
    </div>
  );
}