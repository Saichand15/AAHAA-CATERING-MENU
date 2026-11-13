import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSession } from "@/lib/customer";
import { customerPassword } from "@/lib/customer-validation";
import { apiError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { db } = await customerSession();
    const { password } = z.object({ password: customerPassword }).parse(await readJson(request, 4096));
    const { error } = await db.auth.updateUser({ password });
    if (error) throw error;
    const { error: logoutError } = await db.auth.signOut({ scope: "global" });
    if (logoutError) throw logoutError;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
