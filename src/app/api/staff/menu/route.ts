import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { menuSchema } from "@/lib/validation";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { db } = await staffSession();
    const input = z.object({ id: z.uuid().optional(), item: menuSchema }).parse(await readJson(request));
    if (input.item.image_url) {
      const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/`;
      if (!input.item.image_url.startsWith(prefix)) throw new HttpError(400, "Use an image uploaded to this restaurant's storage.");
    }
    const result = input.id
      ? await db.from("menu_items").update({ ...input.item, updated_at: new Date().toISOString() }).eq("id", input.id).select("id").single()
      : await db.from("menu_items").insert(input.item).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
