"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatThread } from "@/lib/chat-types";
import { chatStartSchema } from "@/lib/chat-types";
import { ChatThreadPanel, chatError, chatJson } from "./chat-thread";
import { Turnstile } from "./turnstile";

export function OpenCustomerChat() {
  return <button className="button button-outline" onClick={() => window.dispatchEvent(new Event("aahaa-open-chat"))}><MessageCircle size={17} /> Chat about this enquiry</button>;
}
export function CustomerChat({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const visible = !pathname.startsWith("/manager");
  const requestId = /^\/account\/requests\/([a-f0-9-]{36})$/i.exec(pathname)?.[1];
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const startId = useRef<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const data = await chatJson<ChatThread>(`/api/chat${requestId ? `?request_id=${requestId}` : ""}`, undefined, signal);
    if (!signal?.aborted) { setThread(data); setError(""); setLoading(false); }
  }, [requestId]);
  useEffect(() => {
    const show = () => { setOpen(true); if (enabled) void load().catch(error => { setLoading(false); setError(chatError(error)); }); };
    const reset = () => { setOpen(false); setThread(null); setLoading(true); setError(""); setWarning(""); };
    window.addEventListener("aahaa-open-chat", show);
    window.addEventListener("aahaa-auth-changed", reset);
    return () => { window.removeEventListener("aahaa-open-chat", show); window.removeEventListener("aahaa-auth-changed", reset); };
  }, [enabled, load]);
  useEffect(() => {
    if (!visible || !enabled) return;
    const controller = new AbortController();
    const update = () => {
      if (document.visibilityState !== "visible") return;
      void load(controller.signal).catch(error => { if (!controller.signal.aborted) { setLoading(false); setError(chatError(error)); } });
    };
    update();
    const timer = window.setInterval(update, open ? 30000 : 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [visible, enabled, load, open, pathname]);
  useEffect(() => {
    if (!open || !visible) return;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, visible]);
  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    if (!startId.current) startId.current = crypto.randomUUID();
    const input = chatStartSchema.safeParse({ ...raw, privacy_accepted: raw.privacy_accepted === "on", client_id: startId.current, captcha_token: token, request_id: requestId });
    if (!input.success) { setError(input.error.issues.map(issue => issue.message).join(" ")); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", ...input.data }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat could not be started. Please retry.");
      setWarning(response.headers.get("X-Chat-Link-Warning") ?? "");
      await load();
    } catch (error) { setError(chatError(error)); setToken(""); setCaptchaKey(key => key + 1); }
    finally { setBusy(false); }
  }
  if (!visible) return null;
  const unread = !!thread?.conversation && thread.conversation.last_staff_id > thread.conversation.customer_read_id;
  return <div className="customer-chat">
    {open && <section className="chat-widget" role="dialog" aria-modal="false" aria-labelledby="chat-title" tabIndex={-1} ref={panel}>
      <header className="chat-heading"><div><h2 id="chat-title">Chat with AAHAA</h2><p>Menu advice &amp; catering enquiries</p></div><button className="icon-button" aria-label="Close chat" onClick={() => { setOpen(false); button.current?.focus(); }}><X size={20} /></button></header>
      <p className="chat-availability">Messages update automatically. Our team replies when available; this is not a confirmed order.</p>
      {!enabled ? <p className="chat-error">Chat setup is not complete. Please <Link className="text-link" href="/#contact" onClick={() => setOpen(false)}>contact the AAHAA team</Link>.</p>
        : thread?.conversation ? <ChatThreadPanel key={`${thread.conversation.id}:${requestId ?? ""}`} endpoint="/api/chat" requestId={requestId} onThread={setThread} />
        : loading ? <p className="chat-error">Loading your chat...</p>
        : <form className="chat-start" onSubmit={start}><p>Ask before choosing a menu, or discuss an enquiry you have already sent.</p><fieldset disabled={busy} className="plain-fieldset">
          <label className="field">Your name<input name="customer_name" autoComplete="name" minLength={2} maxLength={120} required /></label>
          <label className="field">Mobile number<input name="phone" type="tel" autoComplete="tel" placeholder="+12125551234" pattern="\+[1-9][0-9]{7,14}" required /><small>Include your country code.</small></label>
          <label className="field">How can we help?<textarea name="body" required maxLength={2000} /></label>
          <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="checkbox-field"><input type="checkbox" name="privacy_accepted" required /><span>I agree to the <Link className="text-link" href="/privacy" target="_blank">privacy notice</Link> and to being contacted about this chat.</span></label>
          <Turnstile key={captchaKey} action="customer-chat" onToken={setToken} />
          <p className="small-note">Guest chat stays private in this browser for up to 7 days. Use your own device. Signed-in customers can resume their account chats.</p>
          <button className="button full" disabled={busy}>{busy ? "Starting chat..." : "Start conversation"}</button>
        </fieldset></form>}
      {error && <p className="chat-error" role="alert">{error} <button className="text-link" onClick={() => void load().catch(error => setError(chatError(error)))}>Retry</button></p>}
      {warning && <p className="chat-error" role="alert">{warning}</p>}
    </section>}
    <button className="chat-launcher" ref={button} aria-expanded={open} aria-label={`Chat with AAHAA${unread ? " - unread reply" : ""}`} onClick={() => setOpen(previous => !previous)}><MessageCircle size={21} /><span>{open ? "Minimize chat" : "Chat with AAHAA"}</span>{unread && <span className="chat-unread-dot" aria-label="Unread reply" />}</button>
  </div>;
}
