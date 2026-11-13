import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { apiError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(request);
    const { db, user } = await staffSession();
    const id = z.uuid().parse((await params).id);
    const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(await readJson(request, 10000));
    const { error } = await db.from("request_notes").insert({ request_id: id, author_id: user.id, body });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
