import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverNotifications } from "@/lib/notifications";
import { apiError, HttpError } from "@/lib/http";

export const maxDuration = 240;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 32) throw new HttpError(503, "Notification worker is not configured.");
    const supplied = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(401, "Unauthorized.");
    return NextResponse.json(await deliverNotifications());
  } catch (error) { return apiError(error); }
}
