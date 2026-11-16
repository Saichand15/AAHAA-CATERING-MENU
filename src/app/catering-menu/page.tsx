import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { customerSummary, customerAuthTestEmail } from "@/lib/customer";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catering Menu | Aahaa Indian Kitchen",
  description: "Explore priced Aahaa Veg, Non-Veg and Special packages, or build your own catering menu with dish choices by category and request a manager quote.",
};

export default async function CateringMenu() {
  const [catalog, customer] = await Promise.all([
    getCatalog("catering"),
    (process.env.CUSTOMER_AUTH_ENABLED === "true" || customerAuthTestEmail()) ? customerSummary() : Promise.resolve(null),
  ]);
  return <Storefront {...catalog} customer={customer} menuOnly cateringMenu />;
}
