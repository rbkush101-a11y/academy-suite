import { useState, useEffect } from "react";
import { Building2, Plus, Trash2, CheckCircle2, List, X } from "lucide-react";

type Branch = {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
};

export default function Branches() {
  // localStorage se load hoga, nahi to default 2 branch
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem("branch_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "1", name: "Main Branch", code: "COA-MAIN", phone: "", email: "", address: "" },
      { id: "2", name: "Sadhan enclave", code: "Ds 41", phone: "9999999999", email: "", address: "s- 41 sadhana enclave" },
    ];
  });

  const [activeId, setActiveId] = useState(() => {
    return localStorage.getItem("active_branch_id") || "1";
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", country: "91", phone: "", email: "", address: "" });

  // ✅ YE 2 USEEFFECT TUM PUCH RAHE THE KAHA ADD KARU - YAHAN ADD KARNA HAI
  useEffect(() => {
    localStorage.setItem("branch_list", JSON.stringify(branches.map(b => b.name)));
    localStorage.setItem("branch_data", JSON.stringify(branches));
    window.dispatchEvent(new Event("branchListChanged"));
  }, [branches]);

  useEffect(() => {
    const current = branches.find(b => b.id === activeId);
    if (current) {
      localStorage.setItem("active_branch_name", current.name);
      localStorage.setItem("active_branch_id", current.id);
      window.dispatchEvent(new Event("branchChanged"));
    }
  }, [activeId, branches]);

  const handleCreate = () => {
    if (!form.name.trim()) return alert("Branch name required");
    const newBranch: Branch = {
      id: Date.now().toString(),
      name: form.name,
      code: form.code || form.name.substring(0, 3).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900),
      phone: form.phone,
      email: form.email,
      address: form.address,
    };
    setBranches([...branches, newBranch]);
    setForm({ name: "", code: "", country: "91", phone: "", email: "", address: "" });
    setShowAdd(false);
  };

  const handleSwitch = (b: Branch) => {
    setActiveId(b.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-[#6b7d00]">
            <Building2 className="w-6 h-6" /> Manage Branches
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Configure, monitor, and toggle branches across your coaching network.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-[#6b7d00] hover:bg-[#5a6a00] text-white px-5 py-2.5 rounded-[12px] text-[13px] font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Add New Branch
        </button>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e9e6d5] overflow-hidden shadow-sm">
        <div className="bg-[#f8f6ec] px-5 py-3 flex items-center gap-2 border-b border-[#eee9c9]">
          <List className="w-4 h-4 text-[#6b7d00]" />
          <span className="font-bold text-[#4a5a00] text-[14px]">Active Branches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f2f2f2] text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                <th className="text-left px-4 py-3">BRANCH NAME</th>
                <th className="text-left px-4 py-3">CODE</th>
                <th className="text-left px-4 py-3">PHONE</th>
                <th className="text-left px-4 py-3">EMAIL</th>
                <th className="text-left px-4 py-3">ADDRESS</th>
                <th className="text-left px-4 py-3">STATUS</th>
                <th className="text-left px-4 py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => {
                const isContext = b.id === activeId;
                return (
                  <tr key={b.id} className="hover:bg-[#fcfbf3]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#f8f6ec] border border-[#eee9c9] flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-[#6b7d00]" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{b.name}</div>
                          {isContext && <span className="inline-flex mt-1 text-[10px] font-bold bg-[#e0f2e9] text-[#2e7a5a] px-2 py-0.5 rounded-full">Active Context</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#6b7d00]">{b.code || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{b.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{b.email || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{b.address || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-[#e6f5ec] text-[#2e7a5a] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#cde9d8]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSwitch(b)} className="px-3 py-1.5 rounded-full border border-[#6b7d00] text-[#6b7d00] text-[12px] font-semibold hover:bg-[#f8f6ec]">Switch To</button>
                        {!isContext && (
                          <button onClick={() => setBranches(branches.filter(x => x.id !== b.id))} className="w-8 h-8 rounded-full border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-[18px] shadow-2xl overflow-hidden border">
            <div className="bg-[#6b7d00] px-5 py-3.5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-white font-bold text-[16px]"><span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><Plus className="w-4 h-4" /></span> Add New Branch</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Branch Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. West Delhi Branch" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-[13px] outline-none focus:border-[#6b7d00]" />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Branch Code (Optional)</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. DEL-WEST" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-[13px] outline-none" />
                <p className="text-[11px] text-slate-400 mt-1">Will be auto-generated if left blank.</p>
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Phone Number</label>
                <div className="mt-1 flex gap-2">
                  <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-20 px-3 py-2.5 rounded-xl border border-slate-300 text-[13px]" />
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. 9876543210" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-[13px]" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Email Address</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e.g. westdelhi@coaching.com" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Enter physical address" rows={3} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-[13px] resize-none" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 rounded-xl border border-slate-300 text-[13px] font-semibold">Cancel</button>
              <button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-[#6b7d00] text-white text-[13px] font-bold">Create Branch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}