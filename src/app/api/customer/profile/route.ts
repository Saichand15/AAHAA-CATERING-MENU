import { NextResponse } from "next/server";
import { customerSession } from "@/lib/customer";
import { customerProfileSchema } from "@/lib/customer-validation";
import { apiError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { db, user } = await customerSession();
    const profile = customerProfileSchema.parse(await readJson(request, 4096));
    const { error } = await db.from("customer_profiles").upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
