"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile } from "./turnstile";
import { customerPassword } from "@/lib/customer-validation";
import { sendJson } from "./staff-controls";

export function CustomerAuthForm({ enabled, initialError = "", initialMessage = "" }: { enabled: boolean; initialError?: string; initialMessage?: string }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(initialMessage);
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const router = useRouter();
  async function submit(e: { preventDefault(): void }, resend = false) {
    e.preventDefault(); setError(""); setMessage("");
    if (!enabled || busy) return;
    if (mode === "signup" && !resend) {
      const result = customerPassword.safeParse(password);
      if (!result.success) { setError(result.error.issues.map(i => i.message).join(" ")); return; }
      if (password !== confirm) { setError("Passwords do not match."); return; }
    }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: resend ? "resend" : mode, email, password, captcha_token: captcha }),
      });
      const result: { error?: string; message?: string; signedIn?: boolean } = await response.json();
      if (!response.ok) throw new Error(result.error || "The account action could not be completed.");
      if (result.signedIn) { router.push("/account"); router.refresh(); }
      else { setMessage(result.message || "Check your email for the next step."); setPassword(""); setConfirm(""); }
    } catch (error) { setError(error instanceof Error ? error.message : "Connection interrupted. Please try again."); }
    finally { setBusy(false); setCaptcha(""); setCaptchaKey(k => k + 1); }
  }
  const disabled = busy || !enabled || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha);
  return <>
    <div className="tabs auth-tabs"><button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); setMessage(""); }} type="button">Customer login</button><button className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); setMessage(""); }} type="button">Create account</button></div>
    {mode === "reset" && <h2 className="auth-subtitle">Reset your password</h2>}
    <form onSubmit={submit}><fieldset disabled={busy || !enabled} className="plain-fieldset">
      <label className="field">Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={254} /></label>
      {mode !== "reset" && <label className="field">Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required value={password} onChange={e => setPassword(e.target.value)} maxLength={mode === "signup" ? 72 : 256} />{mode === "signup" && <small>12-72 characters, including uppercase, lowercase and a number.</small>}</label>}
      {mode === "signup" && <label className="field">Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={72} /></label>}
      {enabled && <Turnstile key={captchaKey} action="customer-auth" onToken={setCaptcha} />}
      {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
      <button className="button full" disabled={disabled}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account & verify email" : "Send password reset email"}</button>
      {mode === "login" && <button className="text-link" type="button" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Forgot password?</button>}
      {mode === "signup" && <button className="text-link" type="button" disabled={disabled || !email} onClick={e => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address first."); return; } void submit(e, true); }}>Resend verification email</button>}
    </fieldset></form>
    <div className="auth-guest"><span>No account needed for an enquiry.</span><Link className="button button-outline full" href="/#menu">Continue as guest</Link></div>
  </>;
}

export function CustomerLogout() {
  const [error, setError] = useState("");
  const router = useRouter();
  return <><button className="text-link" onClick={async () => {
    try { await sendJson("/api/customer/logout", {}); router.push("/"); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not sign out."); }
  }}>Sign out</button>{error && <p className="error" role="alert">{error}</p>}</>;
}

export function CustomerProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try { await sendJson("/api/customer/profile", Object.fromEntries(new FormData(e.currentTarget))); setSuccess("Contact details saved."); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save contact details."); }
    finally { setBusy(false); }
  }}><label className="field">Full name<input name="full_name" autoComplete="name" defaultValue={fullName} required minLength={2} maxLength={120} /></label><label className="field">Phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={phone} placeholder="+12125551234" required /><small>Include the country code.</small></label>{error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}<button className="button button-small" disabled={busy}>{busy ? "Saving..." : "Save contact details"}</button></form>;
}

export function CustomerPasswordForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form onSubmit={async e => {
    e.preventDefault(); setError("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const result = customerPassword.safeParse(password);
    if (!result.success) { setError(result.error.issues.map(i => i.message).join(" ")); return; }
    if (password !== form.get("confirm")) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await sendJson("/api/customer/password", { password }); router.replace("/login?message=password-updated"); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not update your password."); }
    finally { setBusy(false); }
  }}><label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /><small>12-72 characters, including uppercase, lowercase and a number.</small></label><label className="field">Confirm new password<input name="confirm" type="password" autoComplete="new-password" required maxLength={72} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "Updating..." : "Update password & sign out"}</button></form>;
}
