import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { customerSummary, customerAuthTestEmail } from "@/lib/customer";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Customized Catering | Aahaa Indian Kitchen",
  description: "Build a customized catering menu by category and send your preferences to Aahaa's manager for availability and final pricing.",
};

export default async function CustomizedCateringMenu() {
  const [catalog, customer] = await Promise.all([
    getCatalog("catering"),
    (process.env.CUSTOMER_AUTH_ENABLED === "true" || customerAuthTestEmail()) ? customerSummary() : Promise.resolve(null),
  ]);
  return <Storefront {...catalog} customer={customer} menuOnly cateringMenu customMenuOnly />;
}
