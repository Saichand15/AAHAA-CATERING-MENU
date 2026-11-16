import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpError } from "../src/lib/http";
const mocks = vi.hoisted(() => ({
  identity: vi.fn(), current: vi.fn(), limit: vi.fn(), thread: vi.fn(), request: vi.fn(), linked: vi.fn(), link: vi.fn(),
  captcha: vi.fn(), cookie: vi.fn(), rpc: vi.fn(), from: vi.fn(), staff: vi.fn(),
}));
vi.mock("../src/lib/chat", () => ({
  chatIdentity: mocks.identity, currentChat: mocks.current, chatLimit: mocks.limit, chatThread: mocks.thread,
  authorizedRequest: mocks.request, chatForRequest: mocks.linked, linkChatRequest: mocks.link,
  verifyChatCaptcha: mocks.captcha, setChatCookie: mocks.cookie, chatToken: () => "a".repeat(64), chatTokenHash: () => "b".repeat(64),
  chatMutationError: (error: unknown) => { throw error; },
}));
vi.mock("../src/lib/supabase", () => ({ serviceDb: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("../src/lib/auth", () => ({ staffSession: mocks.staff }));
import { GET, POST } from "../src/app/api/chat/route";
import { GET as staffInbox } from "../src/app/api/staff/chats/route";
import { POST as staffPost } from "../src/app/api/staff/chats/[id]/route";
const id = "bb693934-1fb6-47a5-b014-39f8e1797d35";
const post = (body: unknown, origin = "http://localhost:3000") => POST(new Request("http://localhost:3000/api/chat", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.identity.mockResolvedValue({ userId: null, token: null }); mocks.current.mockResolvedValue(null); mocks.request.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());
it("returns no conversation to an unrelated visitor and never looks up an enquiry reference", async () => {
  const response = await GET(new Request("http://localhost:3000/api/chat"));
  expect(await response.json()).toMatchObject({ conversation: null, messages: [] });
  expect(mocks.thread).not.toHaveBeenCalled();
});
it("rejects cross-origin chat writes before querying the database", async () => {
  expect((await post({ action: "send", client_id: crypto.randomUUID(), body: "Hi" }, "https://other.example")).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects a message without private conversation access", async () => {
  expect((await post({ action: "send", client_id: crypto.randomUUID(), body: "Hi" })).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("persists chat before issuing the private session cookie", async () => {
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { privacy_notice: "Privacy policy for catering enquiry chat contact details and messages." }, error: null }) }) }) });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
  const response = await post({ action: "start", client_id: crypto.randomUUID(), body: "Menu question", customer_name: "Test Visitor", phone: "+12125551234", privacy_accepted: true });
  expect(response.status).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith("start_customer_chat", expect.objectContaining({ p_customer_id: null, p_body: "Menu question" }));
  expect(mocks.cookie).toHaveBeenCalledWith(expect.anything(), "a".repeat(64));
});
it("forces customer sender identity instead of trusting posted staff attributes", async () => {
  mocks.current.mockResolvedValue({ id, customer_id: null }); mocks.rpc.mockResolvedValue({ data: { id: 1 }, error: null });
  expect((await post({ action: "send", client_id: crypto.randomUUID(), body: "Hello", sender: "staff", author_id: crypto.randomUUID() })).status).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith("send_chat_message", expect.objectContaining({ p_id: id, p_sender: "customer", p_author_id: null }));
});
it("requires a real staff membership for inbox reading and replies", async () => {
  mocks.staff.mockRejectedValue(new HttpError(403, "Staff only"));
  expect((await staffInbox(new Request("http://localhost:3000/api/staff/chats"))).status).toBe(403);
  expect((await staffPost(new Request(`http://localhost:3000/api/staff/chats/${id}`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ action: "send", client_id: crypto.randomUUID(), body: "Hello" }) }), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("replies to the authorized enquiry conversation rather than another recent chat", async () => {
  const requestId = crypto.randomUUID(), linkedId = crypto.randomUUID();
  mocks.request.mockResolvedValue(requestId);
  mocks.linked.mockResolvedValue({ id: linkedId, customer_id: null });
  mocks.current.mockResolvedValue({ id, customer_id: null });
  mocks.rpc.mockResolvedValue({ data: { id: 2 }, error: null });
  expect((await post({ action: "send", client_id: crypto.randomUUID(), body: "Following up on this enquiry", request_id: requestId })).status).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith("send_chat_message", expect.objectContaining({ p_id: linkedId }));
});
