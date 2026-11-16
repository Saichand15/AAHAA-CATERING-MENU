import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/lib/http";
import { chatStartSchema } from "../src/lib/chat-types";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ cookie: vi.fn(), from: vi.fn(), session: vi.fn(), rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("../src/lib/customer", () => ({ optionalCustomerSession: mocks.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
import { authorizedRequest, chatToken, chatTokenHash, clearChatCookies, connectRequestChat, currentChat, verifyRequestProof } from "../src/lib/chat";

const secret = "test-chat-secret-with-more-than-thirty-two-characters";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("RATE_LIMIT_SECRET", secret);
  mocks.session.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());
describe("private customer chat access", () => {
  it("accepts contact-first chat but rejects missing consent, malformed phones and empty messages", () => {
    const valid = { client_id: crypto.randomUUID(), customer_name: "Test Visitor", phone: "+12125551234", body: "Can I choose different appetizers?", privacy_accepted: true };
    expect(chatStartSchema.safeParse(valid).success).toBe(true);
    for (const patch of [{ privacy_accepted: false }, { phone: "123" }, { body: "  " }, { body: "x".repeat(2001) }, { website: "spam" }]) expect(chatStartSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("uses a purpose-bound unguessable guest token and validates expiring enquiry proofs", () => {
    const id = crypto.randomUUID(), expires = Date.now() + 60000;
    const sign = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
    const proof = `${id}.${expires}.${sign(`chat-request:${id}.${expires}`)}`;
    expect(verifyRequestProof(proof)).toBe(id);
    expect(verifyRequestProof(proof, expires + 1)).toBeNull();
    expect(verifyRequestProof(proof.replace(id, crypto.randomUUID()))).toBeNull();
    expect(verifyRequestProof(`${proof}.extra`)).toBeNull();
    expect(verifyRequestProof("CAT-2026-000001")).toBeNull();
    expect(chatToken(id)).toHaveLength(64);
    expect(chatTokenHash(chatToken(id))).not.toBe(chatToken(id));
    expect(chatToken(crypto.randomUUID())).not.toBe(chatToken(id));
  });
  it("does not restore another account's chat using a leftover guest cookie", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: crypto.randomUUID(), customer_id: crypto.randomUUID() }, error: null }) };
    mocks.from.mockReturnValue(query);
    expect(await currentChat({ userId: null, token: "a".repeat(64) })).toBeNull();
  });
  it("allows a guest cookie only for its own hash lookup", async () => {
    const data = { id: crypto.randomUUID(), customer_id: null };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
    mocks.from.mockReturnValue(query);
    expect(await currentChat({ userId: null, token: "b".repeat(64) })).toEqual(data);
    expect(query.eq).toHaveBeenCalledWith("access_hash", chatTokenHash("b".repeat(64)));
  });
  it("will not attach a guessed request id or another account's request", async () => {
    const id = crypto.randomUUID();
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id, customer_id: crypto.randomUUID() }, error: null }) };
    mocks.from.mockReturnValue(query);
    await expect(authorizedRequest(id, null)).rejects.toBeInstanceOf(HttpError);
    await expect(authorizedRequest(id, crypto.randomUUID())).rejects.toBeInstanceOf(HttpError);
    query.maybeSingle.mockResolvedValue({ data: { id, customer_id: null }, error: null });
    await expect(authorizedRequest(id, null)).rejects.toMatchObject({ status: 403 });
  });
  it("issues HTTP-only enquiry proofs and accepts only the matching guest receipt", async () => {
    vi.stubEnv("APP_URL", "https://catering.example");
    const id = crypto.randomUUID();
    const response = NextResponse.json({ ok: true });
    await connectRequestChat(response, id);
    const proof = response.cookies.get("aahaa_chat_request");
    expect(proof).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 604800 });
    mocks.cookie.mockImplementation((name: string) => name === "aahaa_chat_request" ? { value: proof!.value } : undefined);
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id, customer_id: null }, error: null }) }) }) });
    expect(await authorizedRequest(undefined, null)).toBe(id);
    clearChatCookies(response);
    expect(response.cookies.get("aahaa_chat_request")?.maxAge).toBe(0);
    expect(response.cookies.get("aahaa_chat")?.maxAge).toBe(0);
  });
  it("allows explicit enquiries owned by the verified account", async () => {
    const id = crypto.randomUUID(), owner = crypto.randomUUID();
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id, customer_id: owner }, error: null }) }) }) });
    expect(await authorizedRequest(id, owner)).toBe(id);
  });
});
