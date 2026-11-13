"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export async function sendJson(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: { error?: string; ok?: boolean } = await response.json();
  if (!response.ok) throw new Error(data.error || "The action could not be completed.");
  return data;
}
const message = (error: unknown) => error instanceof Error ? error.message : "Connection interrupted. Please try again.";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try { await sendJson("/api/staff/login", Object.fromEntries(new FormData(e.currentTarget))); router.push("/manager/requests"); router.refresh(); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><label className="field">Staff email<input type="email" name="email" autoComplete="username" required /></label><label className="field">Password<input type="password" name="password" autoComplete="current-password" required maxLength={256} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button full" disabled={busy}>{busy ? "Signing in..." : "Sign in to your workspace"}</button><p className="small-note" style={{ marginTop: 16 }}>Need access or a password reset? Contact the restaurant owner.</p></form>;
}
export function LogoutButton() {
  const [error, setError] = useState("");
  const router = useRouter();
  return <><button className="quiet-link" onClick={async () => {
    try { await sendJson("/api/staff/logout", {}); router.push("/manager/login"); router.refresh(); }
    catch (error) { setError(message(error)); }
  }}>Sign out</button>{error && <p role="alert">{error}</p>}</>;
}
export function StatusControl({ id, version, status }: { id: string; version: number; status: string }) {
  const [next, setNext] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <><form className="inline-field" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    try { await sendJson(`/api/staff/requests/${id}`, { version, status: next }, "PATCH"); router.refresh(); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }}><select aria-label="Follow-up status" value={next} onChange={e => setNext(e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><button className="button button-small" disabled={busy || next === status}>{busy ? "Saving..." : "Update"}</button></form>{error && <p className="error" role="alert">{error}</p>}</>;
}
export function AddNote({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    try { await sendJson(`/api/staff/requests/${id}/notes`, { body }); setBody(""); router.refresh(); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }}><label className="field">Internal note<textarea value={body} onChange={e => setBody(e.target.value)} required maxLength={2000} placeholder="Record a follow-up or a conversation. Not shared with the customer." /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button button-small" disabled={busy}>{busy ? "Saving..." : "Add note"}</button></form>;
}
export function RetryNotification({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <><button className="text-link" disabled={busy} onClick={async () => {
    if (!window.confirm("Check the provider dashboard first: the original message may have been accepted even if our connection failed. Confirm that another attempt is appropriate. WhatsApp retries and email retries after 24 hours may send a duplicate.")) return;
    setBusy(true); setError("");
    try { await sendJson(`/api/staff/notifications/${id}/retry`, { delivery_checked: true }); router.refresh(); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }}>{busy ? "Queueing..." : "Retry after checking delivery"}</button>{error && <p className="error" role="alert">{error}</p>}</>;
}
