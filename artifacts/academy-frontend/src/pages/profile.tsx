import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { data: user, isLoading } = useGetMe();

  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [form, setForm] = useState({
    businessAddress:
      "MIG 88, Preetam Nagar, MIG Preetam Nagar Colony, Dhoomanganj, Prayagraj, Uttar Pradesh 211011",
    businessType: "Coaching Institute",
    email: "",
    contact: "",
    password: "",
    promoCode: "",
  });

  const setValue = (key: keyof typeof form, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

 const handleSubmit = async () => {
  const token = localStorage.getItem("coach_sutra_token") || "";

  try {
    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: form.email || (user as any)?.email || "",
        phone: form.contact,
        businessAddress: form.businessAddress,
        businessType: form.businessType,
        promoCode: form.promoCode,
        logoDataUrl: logoPreview || undefined,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      alert(data?.error || "Profile update nahi hua.");
      return;
    }

    alert("Profile update ho gaya.");
  } catch {
    alert("Profile update nahi hua. Server check karo.");
  }
};

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-xl border bg-white p-4 shadow-md sm:p-6">
        <h1 className="text-2xl font-bold text-slate-600 sm:text-3xl">
          Profile
        </h1>

        <div className="mt-6 space-y-5">
          {/* Business Logo */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Business Logo
            </label>

            <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-slate-50">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Business Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-center text-[8px] font-bold leading-3 text-white">
                  YOUR
                  <br />
                  LOGO
                  <br />
                  HERE
                </div>
              )}
            </div>

            <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white">
              <label className="flex h-11 shrink-0 cursor-pointer items-center border-r bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100">
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleLogo(event.target.files?.[0])}
                />
              </label>
              <div className="flex h-11 flex-1 items-center px-3 text-sm text-slate-500">
                {logoPreview ? "Logo selected" : "No file chosen"}
              </div>
            </div>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileField
              label="Business Address"
              value={form.businessAddress}
              onChange={(value) => setValue("businessAddress", value)}
            />

            <ProfileField
              label="Select Businees Type"
              value={form.businessType}
              onChange={(value) => setValue("businessType", value)}
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileField
              label="Email"
              value={form.email || String((user as any)?.email ?? "")}
              onChange={(value) => setValue("email", value)}
            />

            <ProfileField
              label="Contact"
              value={form.contact || String((user as any)?.phone ?? "")}
              onChange={(value) => setValue("contact", value)}
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password{" "}
                <span className="text-[10px] font-bold text-green-600">
                  (Optional)
                </span>
              </label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setValue("password", event.target.value)}
                  className="h-11 pr-10 text-slate-600"
                  placeholder="Enter new password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <ProfileField
              label={
                <>
                  Promo Code{" "}
                  <span className="text-[10px] font-bold text-green-600">
                    (Optional)
                  </span>
                </>
              }
              value={form.promoCode}
              onChange={(value) => setValue("promoCode", value)}
            />
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            className="h-10 rounded-md bg-indigo-500 px-6 font-semibold text-white shadow hover:bg-indigo-600"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 text-slate-600"
      />
    </div>
  );
}