"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import type { ChatMessage, ChatThread } from "@/lib/chat-types";

export async function chatJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: "no-store", signal } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
  });
  const data: T & { error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || "Chat could not be updated. Please retry.");
  return data;
}
export const chatError = (error: unknown) => error instanceof Error ? error.message : "Chat connection interrupted. Please retry.";
const combine = (previous: ChatMessage[], next: ChatMessage[]) =>
  [...new Map([...previous, ...next].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id);

export function ChatThreadPanel({ endpoint, staff = false, requestId, onThread }: {
  endpoint: string; staff?: boolean; requestId?: string; onThread?: (thread: ChatThread) => void;
}) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [olderBusy, setOlderBusy] = useState(false);
  const pending = useRef<{ client_id: string; body: string } | null>(null);
  const readId = useRef(0);
  const messagesBox = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const notify = useRef(onThread);
  useEffect(() => { notify.current = onThread; }, [onThread]);
  const url = `${endpoint}${requestId ? `?request_id=${requestId}` : ""}`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const data = await chatJson<ChatThread>(url, undefined, signal);
    if (signal?.aborted) return;
    setThread(previous => {
      if (!previous || !data.conversation || previous.conversation?.id !== data.conversation.id) return data;
      return { ...data, messages: combine(previous.messages, data.messages), hasMore: previous.hasMore };
    });
    notify.current?.(data);
    if (document.visibilityState === "visible" && data.conversation && data.conversation.last_message_id > readId.current) {
      await chatJson(endpoint, { action: "read", message_id: data.conversation.last_message_id, request_id: requestId }, signal);
      readId.current = data.conversation.last_message_id;
    }
    setSyncError("");
  }, [endpoint, requestId, url]);
  useEffect(() => {
    const controller = new AbortController();
    const update = () => {
      if (document.visibilityState !== "visible") return;
      void refresh(controller.signal).catch(error => {
        if (!controller.signal.aborted) setSyncError(chatError(error));
      });
    };
    update();
    const timer = window.setInterval(update, 5000);
    document.addEventListener("visibilitychange", update);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [refresh]);
  useEffect(() => {
    if (follow.current && messagesBox.current) messagesBox.current.scrollTop = messagesBox.current.scrollHeight;
  }, [thread?.messages.length]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true); setError("");
    if (pending.current?.body !== body.trim()) pending.current = { client_id: crypto.randomUUID(), body: body.trim() };
    try {
      const { message } = await chatJson<{ message: ChatMessage }>(endpoint, { action: "send", ...pending.current, request_id: requestId });
      setThread(previous => previous ? { ...previous, messages: combine(previous.messages, [message]) } : previous);
      setBody(""); pending.current = null; follow.current = true;
      await refresh().catch(error => setSyncError(chatError(error)));
    } catch (error) { setError(chatError(error)); }
    finally { setBusy(false); }
  }
  async function loadOlder() {
    const first = thread?.messages[0]?.id;
    if (!first || olderBusy) return;
    setOlderBusy(true);
    const box = messagesBox.current;
    const height = box?.scrollHeight ?? 0;
    const top = box?.scrollTop ?? 0;
    follow.current = false;
    try {
      const data = await chatJson<ChatThread>(`${url}${url.includes("?") ? "&" : "?"}before=${first}`);
      setThread(previous => previous ? { ...previous, messages: combine(previous.messages, data.messages), hasMore: data.hasMore } : data);
      requestAnimationFrame(() => { if (box) box.scrollTop = top + box.scrollHeight - height; });
      setError("");
    } catch (error) { setError(chatError(error)); }
    finally { setOlderBusy(false); }
  }
  return <div className="chat-thread">
    {thread?.requests.length ? <div className="chat-references"><strong>Linked enquiries</strong>{thread.requests.map(request => staff
      ? <Link className="text-link" href={`/manager/requests/${request.id}`} key={request.id}>{request.reference}</Link>
      : <span key={request.id}>{request.reference}</span>)}</div> : null}
    {thread?.conversation?.status === "closed" && <p className="chat-status-note">This conversation is closed. Sending a message will reopen it.</p>}
    <div className="chat-messages" ref={messagesBox} role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions" onScroll={e => {
      const box = e.currentTarget; follow.current = box.scrollHeight - box.scrollTop - box.clientHeight < 70;
    }}>
      {!thread && <p>Loading conversation...</p>}
      {thread?.hasMore && <button className="text-link" disabled={olderBusy} onClick={loadOlder}>{olderBusy ? "Loading..." : "Load earlier messages"}</button>}
      {thread?.messages.map(message => <div key={message.id} className={`chat-message ${message.sender === (staff ? "staff" : "customer") ? "mine" : "theirs"}`}>
        <strong>{message.sender === "staff" ? "AAHAA team" : staff ? thread.conversation?.customer_name ?? "Customer" : "You"}</strong>
        <p>{message.body}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
      </div>)}
      {thread && !thread.conversation && <p>Your chat session is unavailable. Close and reopen chat to start again.</p>}
    </div>
    {error && <p className="chat-error" role="alert">{error}</p>}
    {syncError && <div className="chat-error" role="alert">{syncError} <button className="text-link" onClick={() => void refresh().catch(error => setSyncError(chatError(error)))}>Retry connection</button></div>}
    <form className="chat-compose" onSubmit={send}>
      <label className="field">Message<textarea aria-label={staff ? "Reply to customer" : "Message to AAHAA team"} value={body} onChange={e => setBody(e.target.value)} required maxLength={2000} disabled={busy || !thread?.conversation} placeholder={staff ? "Reply with menu advice or follow-up details..." : "Ask about menus, preferences or your enquiry..."} /></label>
      <div><small>{body.length}/2000</small><button className="button button-small" disabled={busy || !body.trim() || !thread?.conversation}>{busy ? "Sending..." : "Send message"} <Send size={15} /></button></div>
    </form>
  </div>;
}
