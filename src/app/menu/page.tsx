import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catering Menu | Aahaa Indian Kitchen",
  description: "Explore priced Aahaa catering packages and send your event enquiry to our manager.",
};

export default async function RegularMenu() {
  redirect("/catering-menu");
}
