import "server-only";
import { sessionDb } from "./supabase";
import { HttpError } from "./http";

export async function staffSession(ownerOnly = false) {
  const db = await sessionDb();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, "Please sign in to continue.");
  const { data: member, error: membershipError } = await db.from("staff_members").select("*").eq("user_id", user.id).maybeSingle();
  if (membershipError) throw membershipError;
  if (!member || (ownerOnly && member.role !== "owner")) throw new HttpError(403, "You do not have permission for this action.");
  return { db, user, role: member.role };
}
