import { NextResponse } from "next/server";
import { staffSession } from "@/lib/auth";
import { apiError, HttpError, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { db, user } = await staffSession();
    const type = request.headers.get("content-type");
    if (!["image/jpeg", "image/png", "image/webp"].includes(type ?? "")) throw new HttpError(400, "Choose a JPEG, PNG or WebP image.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Image is missing.");
    let size = 0; const parts: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); throw new HttpError(413, "Maximum image size is 5 MB."); }
      parts.push(value);
    }
    const bytes = Buffer.concat(parts);
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!(type === "image/jpeg" && jpeg || type === "image/png" && png || type === "image/webp" && webp)) throw new HttpError(400, "The file contents do not match the image type.");
    const extension = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from("menu-images").upload(path, bytes, { contentType: type!, upsert: false });
    if (error) throw error;
    const { data } = db.storage.from("menu-images").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) { return apiError(error); }
}
