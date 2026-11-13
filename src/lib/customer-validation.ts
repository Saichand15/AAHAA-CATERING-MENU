import { z } from "zod";

export const customerEmail = z.email().max(254).transform(email => email.trim().toLowerCase());
export const customerPassword = z.string().min(12, "Use at least 12 characters.").max(72)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");
export const customerProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Include the country code, for example +12125551234."),
});
export const customerAuthSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signup"), email: customerEmail, password: customerPassword, captcha_token: z.string().max(4096) }),
  z.object({ action: z.literal("login"), email: customerEmail, password: z.string().min(1).max(256), captcha_token: z.string().max(4096) }),
  z.object({ action: z.literal("reset"), email: customerEmail, captcha_token: z.string().max(4096) }),
  z.object({ action: z.literal("resend"), email: customerEmail, captcha_token: z.string().max(4096) }),
]);
export function customerRedirect(next: string | null) {
  return next === "/account/password" ? "/account/password" : "/account";
}
