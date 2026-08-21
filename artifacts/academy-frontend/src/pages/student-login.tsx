import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

export default function StudentLogin() {
  const [, setLocation] = useLocation();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!loginId.trim() || !password.trim()) {
      setError("Login ID aur password required hain.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/student-login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Invalid login ID or password.");
        return;
      }

      if (!data?.token) {
        setError("Login token nahi mila.");
        return;
      }

      localStorage.setItem("coach_sutra_token", data.token);
      localStorage.setItem("coach_sutra_user_role", "student");
      window.dispatchEvent(new Event("storage"));

      setLocation("/student-dashboard");
    } catch {
      setError("Login nahi ho saka. Internet ya server check karo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-red-50 p-4">
      <Card className="w-full max-w-md overflow-hidden border-blue-100 shadow-xl">
        <div className="bg-blue-900 px-6 py-5 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold">Student Login</h1>
          <p className="mt-1 text-xs text-blue-100">
            Second School Classes Student Portal
          </p>
        </div>

        <CardHeader className="text-center">
          <CardTitle>Welcome Student</CardTitle>
          <CardDescription>
            Login ID aur password enter karke portal access karo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Login ID</Label>
              <Input
                value={loginId}
                onChange={(event) =>
                  setLoginId(event.target.value.toLowerCase().replace(/\s/g, ""))
                }
                placeholder="example: rahul1234"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full bg-blue-700 font-semibold hover:bg-blue-800"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Student Sign in"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Admin / Staff login?{" "}
              <Link href="/login" className="font-medium text-blue-700 hover:underline">
                Go to staff login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}