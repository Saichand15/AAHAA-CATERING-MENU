import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { savedRequest, settings } from "./fixtures";

let db: PGlite;
const ownerId = "d19a8f4c-2aec-4b6d-b6fc-d37f8e58ba81";
const outsiderId = "5f83398f-d3ba-46ba-bc2e-408c7aa1db83";
const payload = { ...savedRequest, privacy_notice: settings.privacy_notice, privacy_accepted_at: savedRequest.created_at };
const submit = (key: string, hash = "test-hash") => db.query<{ reference: string; id: string; duplicate: boolean }>("select * from public.submit_catering_request($1,$2,$3::jsonb)", [key, hash, JSON.stringify(payload)]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema public to anon,authenticated,service_role;
  `);
  for (const name of ["202611130001_initial.sql", "202611130002_settings_and_delivery.sql", "202611130003_customer_accounts.sql", "202611130004_whatsapp_notifications.sql", "202611130005_reference_menu.sql"]) {
    await db.exec(readFileSync(resolve("supabase", "migrations", name), "utf8"));
  }
  await db.exec(`insert into auth.users(id) values('${ownerId}'),('${outsiderId}'); insert into public.staff_members(user_id,role) values('${ownerId}','owner');`);
  await db.query("update public.business_settings set accepting_requests=true,privacy_notice=$1", [settings.privacy_notice]);
  await db.exec("update public.notification_settings set recipients=array['owner@example.com','manager@example.com'];");
});

describe("verified customer ownership and WhatsApp outbox", () => {
  afterAll(async () => {
    await db.exec("update notification_settings set whatsapp_enabled=false,whatsapp_recipients='{}',recipients=array['owner@example.com','manager@example.com']");
  });
  const customerA = "6b7c9b89-6586-49ab-a0b3-6d71f62c0c3b";
  const customerB = "38fbb2ad-a7f7-4500-ab7d-4eea48c49093";
  const unverified = "ff74b747-08d9-4231-9979-21718b49a81d";
  let ownRequest: string;
  it("assigns an enquiry only to a verified customer with the matching email", async () => {
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,'other@example.com',now()),($4,'unverified@example.com',null)", [customerA, savedRequest.email, customerB, unverified]);
    const result = await db.query<{ id: string }>("select * from submit_catering_request($1,$2,$3::jsonb,$4)", ["2f01e883-b5e8-43d0-820b-ccf0449b8777", "account-a", JSON.stringify(payload), customerA]);
    ownRequest = result.rows[0].id;
    expect((await db.query<{ customer_id: string }>("select customer_id from catering_requests where id=$1", [ownRequest])).rows[0].customer_id).toBe(customerA);
    expect((await db.query<{ full_name: string }>("select full_name from customer_profiles where id=$1", [customerA])).rows[0].full_name).toBe(savedRequest.customer_name);
    await expect(db.query("select * from submit_catering_request($1,$2,$3::jsonb,$4)", ["38e3a9c4-2fdb-45c9-9704-4217915922b4", "wrong-email", JSON.stringify(payload), customerB])).rejects.toThrow(/VERIFIED_CUSTOMER_REQUIRED/);
    await expect(db.query("select * from submit_catering_request($1,$2,$3::jsonb,$4)", ["3a294ec8-cfe8-4fb7-a241-b9d731c05c91", "unverified", JSON.stringify({ ...payload, email: "unverified@example.com" }), unverified])).rejects.toThrow(/VERIFIED_CUSTOMER_REQUIRED/);
  });
  it("customers can read only their own requests and profiles, never staff notes or notifications", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${customerA}'`);
    try {
      const result = await db.query<{ id: string }>("select id from catering_requests");
      expect(result.rows.map(r => r.id)).toEqual([ownRequest]);
      expect((await db.query("select * from customer_profiles")).rows).toHaveLength(1);
      expect((await db.query("select * from notification_jobs")).rows).toHaveLength(0);
      expect((await db.query("select * from request_notes")).rows).toHaveLength(0);
      expect((await db.query("select * from staff_members")).rows).toHaveLength(0);
      await expect(db.query("update catering_requests set customer_id=$1 where id=$2", [customerB, ownRequest])).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into customer_profiles(id,full_name) values($1,'Intruder')", [customerB])).rejects.toThrow(/row-level security/);
    } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${customerB}'`);
    try { expect((await db.query("select * from catering_requests where id=$1", [ownRequest])).rows).toHaveLength(0); }
    finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
  });
  it("does not turn a guest retry into account ownership", async () => {
    const key = "e3c3de1c-3a2e-4d71-b75f-b9b7aa8eac1b";
    const guest = await submit(key, "guest-hash");
    await expect(db.query("select * from submit_catering_request($1,$2,$3::jsonb,$4)", [key, "guest-hash", JSON.stringify(payload), customerA])).rejects.toThrow(/ACCOUNT_CONFLICT/);
    expect((await db.query<{ customer_id: string | null }>("select customer_id from catering_requests where id=$1", [guest.rows[0].id])).rows[0].customer_id).toBeNull();
  });
  it("queues one WhatsApp job per opted-in manager in the request transaction", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${ownerId}'`);
    try {
      await expect(db.query("select save_business_settings($1::jsonb,$2::text[],true,$3::text[],false)", [JSON.stringify(settings), ["owner@example.com"], ["+12125551234"]])).rejects.toThrow(/WHATSAPP_CONSENT_REQUIRED/);
      await db.query("select save_business_settings($1::jsonb,$2::text[],true,$3::text[],true)", [JSON.stringify(settings), ["owner@example.com"], ["+12125551234", "+12125551235"]]);
    } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
    const key = "465d6e38-299c-4008-a95e-8acdfc015c69";
    const request = await submit(key);
    const jobs = await db.query<{ id: string; channel: string }>("select id,channel from notification_jobs where request_id=$1", [request.rows[0].id]);
    expect(jobs.rows.filter(j => j.channel === "email")).toHaveLength(2);
    expect(jobs.rows.filter(j => j.channel === "whatsapp")).toHaveLength(2);
    await submit(key);
    expect((await db.query("select id from notification_jobs where request_id=$1", [request.rows[0].id])).rows).toHaveLength(4);
    const id = jobs.rows.find(j => j.channel === "whatsapp")!.id;
    const token = "e0c0f4a3-9425-4f4c-9dcb-cfe43da047fc";
    await db.query("update notification_jobs set send_token=$1,lease_token=$1,status='processing' where id=$2", [token, id]);
    expect((await db.query<{ accepted: boolean }>("select record_whatsapp_status($1,$2,'wamid.test','delivered',now(),'') accepted", [id, token])).rows[0].accepted).toBe(true);
    await db.query("select record_whatsapp_status($1,$2,'wamid.test','failed',now(),'should not downgrade delivery')", [id, token]);
    expect((await db.query<{ delivery_status: string }>("select delivery_status from notification_jobs where id=$1", [id])).rows[0].delivery_status).toBe("delivered");
    await db.query("select record_whatsapp_status($1,$2,'wamid.test','read',now(),'')", [id, token]);
    await db.query("select acknowledge_whatsapp_send($1,$2,'wamid.test')", [id, token]);
    await db.query("select record_whatsapp_status($1,$2,'wamid.test','sent',now(),'')", [id, token]);
    const state = await db.query<{ status: string; delivery_status: string }>("select status,delivery_status from notification_jobs where id=$1", [id]);
    expect(state.rows[0]).toEqual({ status: "sent", delivery_status: "read" });
    expect((await db.query<{ accepted: boolean }>("select record_whatsapp_status($1,$2,'wamid.other','failed',now(),'old attempt') accepted", [id, crypto.randomUUID()])).rows[0].accepted).toBe(false);
  });
});
afterAll(async () => { await db?.close(); });

describe("actual PostgreSQL migrations and request transaction", () => {
  it("persists all details and one job per staff recipient plus the customer", async () => {
    const result = await submit("027d4a82-fac3-44de-90f7-3d9a274ad3c5");
    expect(result.rows[0].reference).toMatch(/^CAT-\d{4}-\d{6,}$/);
    const stored = await db.query<{ items: unknown; allergies: string; status: string }>("select items,allergies,status from catering_requests where id=$1", [result.rows[0].id]);
    expect(stored.rows[0].items).toEqual(savedRequest.items);
    expect(stored.rows[0].allergies).toBe(savedRequest.allergies);
    expect(stored.rows[0].status).toBe("new");
    const jobs = await db.query("select recipient from notification_jobs where request_id=$1", [result.rows[0].id]);
    expect(jobs.rows).toHaveLength(3);
  });
  it("retries return the original reference without duplicate requests or emails", async () => {
    const key = "16656285-c9dd-47d0-96b0-e0c92ee6ef87";
    const original = await submit(key);
    const duplicate = await submit(key);
    expect(duplicate.rows[0].reference).toBe(original.rows[0].reference);
    expect(duplicate.rows[0].duplicate).toBe(true);
    const jobs = await db.query("select id from notification_jobs where request_id=$1", [original.rows[0].id]);
    expect(jobs.rows).toHaveLength(3);
    await expect(submit(key, "changed-payload")).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  });
  it("does not truncate references after 999999", async () => {
    await db.exec("select setval('catering_reference_seq',999999)");
    const result = await submit("99c1b041-7f18-4f2b-af17-44c488481a39");
    expect(result.rows[0].reference).toMatch(/-1000000$/);
  });
  it("rolls back an entire submission when notification creation fails", async () => {
    await db.exec("create function public.test_reject_job() returns trigger language plpgsql as $$ begin raise exception 'test mail failure'; end $$; create trigger test_reject_job before insert on notification_jobs for each row execute function public.test_reject_job();");
    const key = "c33b1b5f-30e4-4bf2-8f04-66ca40264892";
    try {
      await expect(submit(key)).rejects.toThrow(/test mail failure/);
      expect((await db.query("select id from catering_requests where idempotency_key=$1", [key])).rows).toHaveLength(0);
    } finally { await db.exec("drop trigger test_reject_job on notification_jobs; drop function public.test_reject_job();"); }
  });
  it("does not accept requests with missing recipients or while paused", async () => {
    const key = "fe7b9a47-94a5-4dcd-99ab-f7a303668604";
    await db.exec("update notification_settings set recipients='{}'");
    await expect(submit(key)).rejects.toThrow(/RECIPIENTS_REQUIRED/);
    await db.exec("update notification_settings set recipients=array['owner@example.com']; update business_settings set accepting_requests=false;");
    await expect(submit(key)).rejects.toThrow(/REQUESTS_PAUSED/);
    await db.exec("update business_settings set accepting_requests=true");
  });
  it("claims each job once until its lease expires", async () => {
    const first = await db.query<{ id: string; lease_token: string }>("select * from claim_notifications()");
    expect(first.rows.length).toBeGreaterThan(0);
    expect(first.rows.every(row => Boolean(row.lease_token))).toBe(true);
    const second = await db.query<{ id: string }>("select * from claim_notifications()");
    expect(second.rows.some(row => first.rows.some(previous => previous.id === row.id))).toBe(false);
    await db.query("update notification_jobs set locked_until=now()-interval '1 minute' where id=$1", [first.rows[0].id]);
    const reclaimed = await db.query<{ id: string; lease_token: string; attempts: number }>("select * from claim_notifications()");
    expect(reclaimed.rows.find(row => row.id === first.rows[0].id)?.lease_token).not.toBe(first.rows[0].lease_token);
    expect(reclaimed.rows.find(row => row.id === first.rows[0].id)?.attempts).toBe(2);
  });
  it("rate limits atomically and resets expired windows", async () => {
    for (const expected of [true, true, false]) {
      const result = await db.query<{ allowed: boolean }>("select consume_rate_limit('test-client',2,3600) allowed");
      expect(result.rows[0].allowed).toBe(expected);
    }
    await db.exec("update submission_rate_limits set reset_at=now()-interval '1 minute'");
    expect((await db.query<{ allowed: boolean }>("select consume_rate_limit('test-client',2,3600) allowed")).rows[0].allowed).toBe(true);
  });
});

describe("database access isolation", () => {
  it("anonymous visitors cannot read requests or invoke the submission RPC", async () => {
    await db.exec("insert into menu_items(id,name,category,published) values('f94a2a98-158a-4a87-b3b8-81338264cb51','Private draft','Draft',false)");
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from catering_requests")).rejects.toThrow(/permission denied/);
      await expect(submit("d00c89c1-f341-4db2-98a0-ac26b6b2c1ec")).rejects.toThrow(/permission denied/);
      const visible = (await db.query<{ published: boolean }>("select * from menu_items")).rows;
      expect(visible).toHaveLength(210);
      expect(visible.every(item => item.published)).toBe(true);
    } finally {
      await db.exec("reset role; delete from menu_items where id='f94a2a98-158a-4a87-b3b8-81338264cb51'");
    }
  });
  it("an authenticated non-staff user sees no private records and cannot change status", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${outsiderId}'`);
    try {
      expect((await db.query("select * from catering_requests")).rows).toHaveLength(0);
      expect((await db.query("select * from notification_settings")).rows).toHaveLength(0);
      expect((await db.query("select * from notification_jobs")).rows).toHaveLength(0);
      await expect(db.query("select change_request_status($1,1,'contacted')", [savedRequest.id])).rejects.toThrow(/STAFF_REQUIRED/);
    } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
  });
  it("staff can follow up; stale updates do not overwrite each other and history is immutable", async () => {
    const result = await submit("04376e5f-d20b-4e6e-a138-439e4fcac4eb");
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${ownerId}'`);
    try {
      expect((await db.query("select * from catering_requests")).rows.length).toBeGreaterThan(0);
      expect((await db.query<{ ok: boolean }>("select change_request_status($1,1,'contacted') ok", [result.rows[0].id])).rows[0].ok).toBe(true);
      expect((await db.query<{ ok: boolean }>("select change_request_status($1,1,'closed') ok", [result.rows[0].id])).rows[0].ok).toBe(false);
      expect((await db.query("select * from request_history where request_id=$1", [result.rows[0].id])).rows).toHaveLength(1);
      await expect(db.exec("delete from request_history")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
  });
  it("owners update settings and recipients atomically; non-owners cannot", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${ownerId}'`);
    try {
      await db.query("select save_business_settings($1::jsonb,$2::text[])", [JSON.stringify(settings), ["new-owner@example.com"]]);
      expect((await db.query<{ name: string }>("select name from business_settings")).rows[0].name).toBe(settings.name);
      expect((await db.query<{ recipients: string[] }>("select recipients from notification_settings")).rows[0].recipients).toEqual(["new-owner@example.com"]);
    } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${outsiderId}'`);
    try { await expect(db.query("select save_business_settings($1::jsonb,$2::text[])", [JSON.stringify(settings), ["bad@example.com"]])).rejects.toThrow(/OWNER_REQUIRED/); }
    finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
  });
});
