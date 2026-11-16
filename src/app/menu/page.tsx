import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { customerSummary, customerAuthTestEmail } from "@/lib/customer";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Regular Restaurant Menu | Aahaa Indian Kitchen",
  description: "Explore Aahaa Indian Kitchen's current restaurant dishes and share menu ideas for your catering enquiry.",
};

export default async function RegularMenu() {
  const [catalog, customer] = await Promise.all([
    getCatalog("regular"),
    (process.env.CUSTOMER_AUTH_ENABLED === "true" || customerAuthTestEmail()) ? customerSummary() : Promise.resolve(null),
  ]);
  return <Storefront {...catalog} customer={customer} menuOnly />;
}
