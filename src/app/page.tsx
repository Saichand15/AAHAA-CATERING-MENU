import { getCatalog } from "@/lib/catalog";
import { Storefront } from "@/components/storefront";
import { customerSummary, customerAuthTestEmail } from "@/lib/customer";

export const dynamic = "force-dynamic";
export default async function Home() {
  const [catalog, customer] = await Promise.all([
    getCatalog(),
    (process.env.CUSTOMER_AUTH_ENABLED === "true" || customerAuthTestEmail()) ? customerSummary() : Promise.resolve(null),
  ]);
  return <Storefront {...catalog} customer={customer} />;
}
