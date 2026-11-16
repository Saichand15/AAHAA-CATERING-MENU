import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { input, settings, savedRequest } from "./fixtures";

it("migrates existing requests safely and atomically queues only appropriate contact-first notifications", async () => {
  const migration = (name: string) => readFileSync(resolve("supabase", "migrations", name), "utf8");
  const initial = migration("202611130001_initial.sql");
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql as $$ select null::uuid; $$;
    `);
    await db.exec(initial.slice(initial.indexOf("create table public.business_settings"), initial.indexOf("create sequence public.catering_reference_seq")));
    await db.exec(initial.slice(initial.indexOf("create sequence public.catering_reference_seq"), initial.indexOf("create table public.submission_rate_limits")));
    await db.exec(initial.slice(initial.indexOf("create function public.submit_catering_request"), initial.indexOf("create function public.claim_notifications")));
    await db.exec("revoke all on function public.submit_catering_request(uuid,text,jsonb) from public; grant execute on function public.submit_catering_request(uuid,text,jsonb) to service_role;");
    await db.exec(migration("202611130003_customer_accounts.sql"));
    const whatsapp = migration("202611130004_whatsapp_notifications.sql");
    await db.exec(whatsapp.slice(0, whatsapp.indexOf("alter function public.save_business_settings")));
    await db.exec("update business_settings set accepting_requests=true; update notification_settings set recipients=array['manager@example.com'];");
    const payload = {
      ...input, timezone: settings.timezone, privacy_notice: settings.privacy_notice,
      privacy_accepted_at: new Date().toISOString(), currency: "USD", known_subtotal_minor: 2750,
      has_unpriced_items: false, items: savedRequest.items,
    };
    const submit = (key: string, value: unknown, customer: string | null = null, hash = "test-hash") =>
      db.query<{ id: string; duplicate: boolean }>("select * from submit_catering_request($1::uuid,$2,$3::jsonb,$4::uuid)", [key, hash, JSON.stringify(value), customer]);
    const full = await submit(input.idempotency_key, payload);
    await db.exec(migration("202611160002_optional_event_details.sql"));
    const original = (await db.query("select event_date::text,email,guests from catering_requests where id=$1", [full.rows[0].id])).rows[0];
    expect(original).toMatchObject({ event_date: input.event_date, email: input.email, guests: input.guests });
    const quick = { ...payload, email: null, event_date: null, event_time: null, event_type: null, guests: null, fulfillment: null, preferred_contact: "phone" };
    const key = crypto.randomUUID();
    const first = (await submit(key, quick)).rows[0];
    expect((await db.query("select email,event_date,event_time,event_type,guests,fulfillment from catering_requests where id=$1", [first.id])).rows[0]).toEqual({
      email: null, event_date: null, event_time: null, event_type: null, guests: null, fulfillment: null,
    });
    expect((await db.query("select audience,recipient from notification_jobs where request_id=$1", [first.id])).rows).toEqual([{ audience: "staff", recipient: "manager@example.com" }]);
    expect((await submit(key, quick)).rows[0]).toMatchObject({ id: first.id, duplicate: true });
    await expect(submit(key, quick, null, "changed-hash")).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    expect((await db.query("select id from notification_jobs where request_id=$1", [first.id])).rows).toHaveLength(1);
    const withEmail = (await submit(crypto.randomUUID(), { ...quick, email: input.email })).rows[0];
    expect((await db.query("select audience from notification_jobs where request_id=$1 order by audience", [withEmail.id])).rows).toEqual([{ audience: "customer" }, { audience: "staff" }]);
    const customer = crypto.randomUUID();
    await db.query("insert into auth.users values($1,$2,now())", [customer, input.email]);
    await expect(submit(crypto.randomUUID(), quick, customer)).rejects.toThrow("VERIFIED_CUSTOMER_REQUIRED");
    const linked = (await submit(crypto.randomUUID(), { ...quick, email: input.email }, customer)).rows[0];
    expect((await db.query("select customer_id from catering_requests where id=$1", [linked.id])).rows[0]).toEqual({ customer_id: customer });
    expect((await db.query("select has_function_privilege('anon','public.submit_catering_request_base(uuid,text,jsonb)','execute') as allowed")).rows[0]).toEqual({ allowed: false });
  } finally { await db.close(); }
}, 30000);
