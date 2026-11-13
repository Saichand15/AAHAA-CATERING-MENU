import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(request);
    const { db } = await staffSession();
    const id = z.uuid().parse((await params).id);
    const body = z.object({ version: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]) }).parse(await readJson(request, 2048));
    const { data, error } = await db.rpc("change_request_status", { p_id: id, p_version: body.version, p_status: body.status });
    if (error) throw error;
    if (!data) throw new HttpError(409, "This request was updated by another staff member. Refresh before making changes.");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
