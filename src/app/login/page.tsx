"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Wallet,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Mail,
} from "lucide-react";
import {
  cognitoSignIn,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendCode,
  describeCognitoError,
} from "@/lib/cognito-client";

type Mode = "signin" | "signup" | "verify";

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetMessages() {
    setError(null);
    setInfo(null);
  }

  async function finishSignIn(emailValue: string, passwordValue: string) {
    const tokens = await cognitoSignIn(emailValue, passwordValue);
    const result = await signIn("cognito", {
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      redirect: false,
    });
    if (!result || result.error) {
      throw new Error(result?.error ?? "Sign-in failed after Cognito auth.");
    }
    router.replace(callbackUrl);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (!email || !password) return setError("Enter your email and password.");
    setSubmitting(true);
    try {
      await finishSignIn(email, password);
    } catch (err) {
      const code = (err as { code?: string; name?: string })?.code ?? (err as { name?: string })?.name;
      if (code === "UserNotConfirmedException") {
        setMode("verify");
        setInfo("Your account isn't verified yet. Enter the code we emailed you.");
      } else {
        setError(describeCognitoError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (!email || !password) return setError("Enter your email and password.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setSubmitting(true);
    try {
      await cognitoSignUp({ email, password, name: name || undefined });
      setMode("verify");
      setInfo("Account created. Enter the 6-digit code we just emailed you.");
    } catch (err) {
      setError(describeCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (!code) return setError("Enter the verification code.");
    setSubmitting(true);
    try {
      await cognitoConfirmSignUp(email, code);
      // If we still have the password in state (user came from signup), sign in automatically.
      if (password) {
        await finishSignIn(email, password);
      } else {
        setMode("signin");
        setInfo("Email verified. Sign in to continue.");
      }
    } catch (err) {
      setError(describeCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    resetMessages();
    if (!email) return setError("Enter your email first.");
    setSubmitting(true);
    try {
      await cognitoResendCode(email);
      setInfo("New code sent. Check your email.");
    } catch (err) {
      setError(describeCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Verify email";
  const subtitle =
    mode === "signin"
      ? "Welcome back."
      : mode === "signup"
      ? "It takes about 30 seconds."
      : "Enter the code we sent to your inbox.";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Wallet size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ExpenseIQ</h1>
          <p className="text-sm text-gray-400">Personal &amp; business finance</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-0.5">{title}</h2>
          <p className="text-xs text-gray-400 mb-5">{subtitle}</p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="text-xs text-emerald-700">{info}</span>
            </div>
          )}

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldCls}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldCls}
                />
              </Field>
              <SubmitButton submitting={submitting} label="Sign in" />
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Field label="Name (optional)">
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={fieldCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldCls}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={fieldCls}
                />
              </Field>
              <SubmitButton submitting={submitting} label="Create account" />
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={handleVerify} className="space-y-3">
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldCls}
                />
              </Field>
              <Field label="Verification code">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className={`${fieldCls} tracking-widest text-center`}
                />
              </Field>
              <SubmitButton submitting={submitting} label="Verify & continue" />
              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
              >
                <Mail size={11} /> Resend code
              </button>
            </form>
          )}

          {/* Footer switcher */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <ModeLink onClick={() => (resetMessages(), setMode("signup"))}>
                  Create an account
                </ModeLink>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <ModeLink onClick={() => (resetMessages(), setMode("signin"))}>
                  Sign in
                </ModeLink>
              </>
            ) : (
              <>
                Back to{" "}
                <ModeLink onClick={() => (resetMessages(), setMode("signin"))}>
                  Sign in
                </ModeLink>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
    >
      {submitting ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <>
          {label} <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

function ModeLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-indigo-600 hover:text-indigo-700 font-medium"
    >
      {children}
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginInner />
    </Suspense>
  );
}
