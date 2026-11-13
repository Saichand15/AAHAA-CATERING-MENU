import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ValidationError } from "./validation";
import { appUrl } from "./config";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== appUrl()) throw new HttpError(403, "This request origin is not allowed.");
}
export async function readJson(request: Request, max = 100_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is missing.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "Invalid JSON."); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" ") }, { status: 400 });
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  const incident = crypto.randomUUID();
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  console.error("Operation failed", { incident, code });
  return NextResponse.json({ error: `We couldn't complete that action. Please try again or contact the restaurant. Reference: ${incident}` }, { status: 500 });
}
