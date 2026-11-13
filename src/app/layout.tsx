import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aahaa Indian Kitchen Catering | Buffalo Grove, IL",
  description: "Plan Indian catering in Buffalo Grove, Illinois. Explore Aahaa's restaurant menu and enquire about custom menus for weddings, family celebrations, festivals and corporate events.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
