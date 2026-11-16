import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CustomerChat } from "@/components/customer-chat";
import { chatBlockers } from "@/lib/config";

const montserrat = localFont({
  src: "../../public/fonts/montserrat-latin-variable.woff2",
  variable: "--font-montserrat",
  weight: "400 800",
  display: "swap",
});
const gwendolyn = localFont({
  src: "../../public/fonts/gwendolyn-latin.woff2",
  variable: "--font-gwendolyn",
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Aahaa Indian Kitchen Catering | Buffalo Grove, IL",
  description: "Plan Indian catering in Buffalo Grove, Illinois. Explore Aahaa's restaurant menu and enquire about custom menus for weddings, family celebrations, festivals and corporate events.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffcf8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${montserrat.variable} ${gwendolyn.variable}`}><body>{children}<CustomerChat enabled={chatBlockers().length === 0} /></body></html>;
}
