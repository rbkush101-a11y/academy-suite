import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ApiMessage = {
  error?: string;
  message?: string;
  code?: string;
};

async function postAuth<T>(
  path: string,
  payload: Record<string, string>,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiMessage;

  if (!response.ok) {
    throw new Error(
      body.error || body.message || `Request failed (${response.status})`,
    );
  }

  return body;
}

function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="rounded-xl bg-blue-500/15 p-3 text-blue-300">
            <ShieldCheck className="h-6 w-6" />
          </span>

          <div>
            <p className="text-sm font-semibold tracking-wide">
              ParikshaDrishti
            </p>
            <p className="text-xs text-slate-400">
              Platform administration
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {description}
        </p>

        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

function Field({
  label,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}

      <input
        {...inputProps}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
      />
    </label>
  );
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
    >
      {children}
    </p>
  );
}

function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function SuperAdminLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const result = await postAuth<{
        token: string;
        user: {
          id?: string;
          name?: string;
          email?: string;
          role: string;
        };
      }>("/api/auth/super-admin/login", {
        email: normalizedEmail,
        password,
      });

      if (!result.token || !result.user?.role) {
        throw new Error("Login response was incomplete.");
      }

      login(result.token, result.user.role);

      setLocation("/super-admin");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign in.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="Platform sign in"
      description="Sign in with a ParikshaDrishti platform operator account."
    >
      <form className="space-y-5" onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <SubmitButton pending={pending}>
          Sign in securely
        </SubmitButton>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link
          href="/super-admin/forgot-password"
          className="text-blue-300 hover:text-blue-200"
        >
          Forgot password?
        </Link>

        <button
          type="button"
          className="text-slate-400 hover:text-slate-200"
          onClick={() => setLocation("/login")}
        >
          Institute login
        </button>
      </div>
    </AuthFrame>
  );
}

export function SuperAdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setPending(true);

    try {
      const result = await postAuth<ApiMessage>(
        "/api/auth/super-admin/forgot-password",
        {
          email: email.trim().toLowerCase(),
        },
      );

      setMessage(
        result.message ||
          "If the account is eligible, password reset instructions will be sent.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to process password recovery.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="Reset your password"
      description="Enter the email address for your platform operator account. We will send a time-limited reset link if the account is eligible."
    >
      <form className="space-y-5" onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          >
            {message}
          </p>
        )}

        <SubmitButton pending={pending}>
          Send reset link
        </SubmitButton>
      </form>

      <p className="mt-5 text-sm">
        <Link
          href="/super-admin/login"
          className="text-blue-300 hover:text-blue-200"
        >
          Back to platform sign in
        </Link>
      </p>
    </AuthFrame>
  );
}

export function SuperAdminResetPassword() {
  const [token] = useState(
    () =>
      new URLSearchParams(window.location.search).get("token") ?? "",
  );

  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (token) {
      window.history.replaceState(
        null,
        "",
        "/super-admin/reset-password",
      );
    }
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "The reset link is missing its token. Request a new one.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);

    try {
      await postAuth<ApiMessage>(
        "/api/auth/super-admin/reset-password",
        {
          token,
          password,
        },
      );

      setLocation("/super-admin/login");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to reset the password.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="Choose a new password"
      description="Use at least 12 characters, including uppercase and lowercase letters and a number. Your other platform sessions will be revoked."
    >
      <form className="space-y-5" onSubmit={submit}>
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <SubmitButton pending={pending}>
          Reset password
        </SubmitButton>
      </form>

      <p className="mt-5 text-sm">
        <Link
          href="/super-admin/login"
          className="text-blue-300 hover:text-blue-200"
        >
          Back to platform sign in
        </Link>
      </p>
    </AuthFrame>
  );
}