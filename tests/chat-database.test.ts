import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("stores private guest/staff conversations, idempotent messages, unread state and enquiry links", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create table auth.users(id uuid primary key);
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.catering_requests(id uuid primary key);
    `);
    await db.exec(readFileSync(resolve("supabase", "migrations", "202611160003_customer_chat.sql"), "utf8"));
    const key = crypto.randomUUID();
    const privacy = "The restaurant uses chat contact details and messages only to respond to catering enquiries.";
    const start = (body = "TEST NOT AN ORDER: menu question") => db.query<{ id: string }>(
      "select start_customer_chat($1,null,$2,$3,$4,$5,$6) as id",
      ["a".repeat(64), "Test Customer", "+12125551234", privacy, key, body],
    );
    const id = (await start()).rows[0].id;
    expect((await start()).rows[0].id).toBe(id);
    expect((await db.query("select id from chat_messages")).rows).toHaveLength(1);
    await expect(start("Changed message")).rejects.toThrow("CHAT_MESSAGE_CONFLICT");
    const staff = crypto.randomUUID();
    await db.query("insert into auth.users values($1)", [staff]);
    const staffKey = crypto.randomUUID();
    const reply = (await db.query<{ id: number }>("select (send_chat_message($1,$2,'staff',$3,'We can discuss vegetarian options.')).*", [id, staffKey, staff])).rows[0];
    expect((await db.query<{ count: number }>("select chat_unread_count() as count")).rows[0].count).toBe(1);
    await db.query("select mark_chat_read($1,'staff',999999)", [id]);
    expect((await db.query<{ count: number }>("select chat_unread_count() as count")).rows[0].count).toBe(0);
    await db.query("select mark_chat_read($1,'customer',$2)", [id, reply.id]);
    await db.query("select mark_chat_read($1,'customer',0)", [id]);
    expect((await db.query("select customer_read_id from chat_conversations where id=$1", [id])).rows[0]).toEqual({ customer_read_id: reply.id });
    await db.query("update chat_conversations set status='closed' where id=$1", [id]);
    await db.query("select send_chat_message($1,$2,'customer',null,'Thank you!')", [id, crypto.randomUUID()]);
    expect((await db.query("select status from chat_conversations where id=$1", [id])).rows[0]).toEqual({ status: "open" });
    const requestId = crypto.randomUUID();
    await db.query("insert into catering_requests values($1)", [requestId]);
    await db.query("insert into chat_request_links(request_id,conversation_id) values($1,$2)", [requestId, id]);
    expect((await db.query("select conversation_id from chat_request_links where request_id=$1", [requestId])).rows[0]).toEqual({ conversation_id: id });
    for (const role of ["anon", "authenticated"]) {
      expect((await db.query("select has_table_privilege($1,'public.chat_messages','select') as allowed", [role])).rows[0]).toEqual({ allowed: false });
      expect((await db.query("select has_function_privilege($1,'public.start_customer_chat(text,uuid,text,text,text,uuid,text)','execute') as allowed", [role])).rows[0]).toEqual({ allowed: false });
      expect((await db.query("select has_function_privilege($1,'public.send_chat_message(uuid,uuid,text,uuid,text)','execute') as allowed", [role])).rows[0]).toEqual({ allowed: false });
    }
    expect((await db.query("select relrowsecurity from pg_class where oid='public.chat_conversations'::regclass")).rows[0]).toEqual({ relrowsecurity: true });
  } finally { await db.close(); }
}, 30000);
