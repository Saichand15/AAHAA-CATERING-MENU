import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database";
import { databaseConfigured } from "./config";

export async function sessionDb() {
  if (!databaseConfigured()) throw new Error("Supabase is not configured.");
  const jar = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: changes => {
          // Session refresh happens in the proxy; Server Components cannot write cookies.
          try { changes.forEach(({ name, value, options }) => jar.set(name, value, options)); }
          catch (error) {
            if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) throw error;
          }
        },
      },
    },
  );
}

export function serviceDb() {
  if (!databaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server credentials are not configured.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
