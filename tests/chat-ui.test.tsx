// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CustomerChat } from "../src/components/customer-chat";
import { ManagerChatInbox } from "../src/components/manager-chat";
import type { ChatConversation, ChatMessage, ChatThread } from "../src/lib/chat-types";

vi.mock("next/navigation", () => ({ usePathname: () => "/catering-menu" }));
vi.mock("next/script", () => ({ default: () => null }));
const conversation: ChatConversation = {
  id: "c268dc93-96ab-4c12-b25a-a36a142bf4ea", customer_name: "Test Visitor", phone: "+12125551234",
  status: "open", created_at: "2026-11-16T12:00:00Z", updated_at: "2026-11-16T12:00:00Z",
  last_body: "Can I change appetizers?", last_message_id: 1, last_customer_id: 1, last_staff_id: 0, customer_read_id: 0, staff_read_id: 0,
};
const first: ChatMessage = { id: 1, conversation_id: conversation.id, client_id: crypto.randomUUID(), sender: "customer", author_id: null, body: conversation.last_body, created_at: conversation.created_at };
const thread: ChatThread = { conversation, messages: [first], requests: [{ id: crypto.randomUUID(), reference: "CAT-TEST-1" }], hasMore: false };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("starts a private pre-enquiry customer chat with consent and shows linked requests", async () => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  let started = false;
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (body?.action === "start") { started = true; return Response.json({ id: conversation.id }, { status: 201 }); }
    if (body) return Response.json({ ok: true });
    return Response.json(started ? thread : { conversation: null, messages: [], requests: [], hasMore: false });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<CustomerChat enabled />);
  fireEvent.click(screen.getByRole("button", { name: "Chat with AAHAA" }));
  await screen.findByLabelText("Your name");
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: conversation.customer_name } });
  fireEvent.change(screen.getByLabelText(/Mobile number/), { target: { value: conversation.phone } });
  fireEvent.change(screen.getByLabelText("How can we help?"), { target: { value: first.body } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  await waitFor(() => expect(within(screen.getByRole("log")).getByText(first.body)).toBeTruthy());
  expect(screen.getByText("CAT-TEST-1")).toBeTruthy();
  const start = fetcher.mock.calls.map(([, init]) => init?.body ? JSON.parse(String(init.body)) : null).find(body => body?.action === "start");
  expect(start).toMatchObject({ customer_name: conversation.customer_name, phone: conversation.phone, privacy_accepted: true, body: first.body });
  fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
  expect(screen.queryByRole("log")).toBeNull();
});

it("lets staff view details and requests, retry replies without duplicates, and close conversations", async () => {
  let fail = true;
  const sent: { client_id: string; body: string }[] = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (!init?.body) return Response.json(url === "/api/staff/chats" ? { conversations: [conversation], unread: 1, hasMore: false } : thread);
    const body = JSON.parse(String(init.body));
    if (body.action === "send") {
      sent.push(body);
      if (fail) { fail = false; return Response.json({ error: "Connection failed; retry the same message." }, { status: 503 }); }
      return Response.json({ message: { ...first, id: 2, client_id: body.client_id, body: body.body, sender: "staff" } });
    }
    return Response.json({ ok: true });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<ManagerChatInbox />);
  fireEvent.click(await screen.findByRole("button", { name: /Test Visitor/ }));
  await screen.findByRole("link", { name: "CAT-TEST-1" });
  const input = screen.getByRole("textbox", { name: "Reply to customer" });
  fireEvent.change(input, { target: { value: "We can discuss appetizer substitutions." } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText(/Connection failed; retry the same message/);
  expect((input as HTMLTextAreaElement).value).toBe("We can discuss appetizer substitutions.");
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe(""));
  expect(sent).toHaveLength(2);
  expect(sent[0].client_id).toBe(sent[1].client_id);
  expect(within(screen.getByRole("log")).getByText("We can discuss appetizer substitutions.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close conversation" }));
  await screen.findByRole("button", { name: "Reopen conversation" });
});
