"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatConversation, ChatThread } from "@/lib/chat-types";
import { ChatThreadPanel, chatError, chatJson } from "./chat-thread";

type Inbox = { conversations: ChatConversation[]; unread: number; hasMore: boolean };
export function ChatInboxLink() {
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void chatJson<Inbox>("/api/staff/chats", undefined, controller.signal).then(data => { if (!controller.signal.aborted) { setUnread(data.unread); setError(""); } }).catch(error => { if (!controller.signal.aborted) setError(chatError(error)); });
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return <div><Link href="/manager/chats"><MessageCircle size={17} /> Customer chats {unread > 0 && <span className="chat-count">{unread}</span>}</Link>{error && <small className="chat-nav-error" role="status">Chat updates unavailable. Open inbox to retry.</small>}</div>;
}
export function ManagerChatInbox() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("");
  const olderLoaded = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void chatJson<Inbox>("/api/staff/chats", undefined, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        setConversations(previous => [...new Map([...previous, ...data.conversations].map(thread => [thread.id, thread])).values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
        if (!olderLoaded.current) setHasMore(data.hasMore);
        setLoaded(true); setError("");
      }).catch(error => { if (!controller.signal.aborted) { setError(chatError(error)); setLoaded(true); } });
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  async function more() {
    setLoadingMore(true);
    try {
      const data = await chatJson<Inbox>(`/api/staff/chats?offset=${conversations.length}`);
      olderLoaded.current = true;
      setConversations(previous => [...new Map([...previous, ...data.conversations].map(thread => [thread.id, thread])).values()]);
      setHasMore(data.hasMore); setError("");
    } catch (error) { setError(chatError(error)); }
    finally { setLoadingMore(false); }
  }
  const chosen = conversations.find(thread => thread.id === selected);
  const filtered = conversations.filter(thread => `${thread.customer_name} ${thread.phone}`.toLowerCase().includes(filter.toLowerCase()));
  return <><div className="staff-title"><div><span className="eyebrow">CUSTOMER COMMUNICATION</span><h1>Chat inbox</h1><p>Questions before ordering and follow-up after enquiries. Messages refresh automatically while this page is visible.</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="manager-chat-layout"><section className="panel chat-inbox"><label className="field">Filter loaded conversations<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Name or mobile" /></label>
      {!loaded && <p>Loading inbox...</p>}{loaded && !conversations.length && <p>No conversations yet. Customers can start chat from the website.</p>}
      {filtered.map(thread => <button key={thread.id} className={`chat-inbox-item${thread.id === selected ? " selected" : ""}`} onClick={() => setSelected(thread.id)}>
        <span><strong>{thread.customer_name}</strong>{thread.last_customer_id > thread.staff_read_id && <span className="chat-count">New</span>}</span><small>{thread.phone} &middot; {thread.status}</small><p>{thread.last_body}</p><time dateTime={thread.updated_at}>{new Date(thread.updated_at).toLocaleString()}</time>
      </button>)}
      {hasMore && <button className="text-link" disabled={loadingMore} onClick={more}>{loadingMore ? "Loading..." : "Load older conversations"}</button>}
    </section><section className="panel manager-chat-conversation">{chosen ? <ManagerConversation key={chosen.id} conversation={chosen} onUpdate={thread => {
      if (thread.conversation) { const updated = thread.conversation; setConversations(previous => previous.map(current => current.id === updated.id ? updated : current)); }
    }} /> : <div className="chat-empty"><MessageCircle size={36} /><h2>Select a conversation</h2><p>Customer details, messages and linked catering requests appear here. Internal request notes remain private to staff.</p></div>}</section></div></>;
}
export function ManagerConversation({ conversation, onUpdate }: { conversation: ChatConversation; onUpdate?: (thread: ChatThread) => void }) {
  const [status, setStatus] = useState(conversation.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><div className="manager-chat-heading"><div><h2>{conversation.customer_name}</h2><a className="text-link" href={`tel:${conversation.phone}`}>{conversation.phone}</a><p className="small-note">Contact details are customer-provided, not phone-verified.</p></div><button className="button button-small button-outline" disabled={busy} onClick={async () => {
    setBusy(true);
    try { const next = status === "open" ? "closed" : "open"; await chatJson(`/api/staff/chats/${conversation.id}`, { action: "status", status: next }); setStatus(next); setError(""); }
    catch (error) { setError(chatError(error)); }
    finally { setBusy(false); }
  }}>{busy ? "Saving..." : status === "open" ? "Close conversation" : "Reopen conversation"}</button></div>{error && <p className="error" role="alert">{error}</p>}
    <ChatThreadPanel endpoint={`/api/staff/chats/${conversation.id}`} staff onThread={thread => { if (thread.conversation) setStatus(thread.conversation.status); onUpdate?.(thread); }} />
  </>;
}
