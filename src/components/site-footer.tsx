import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BusinessSettings } from "@/lib/types";
import { Brand } from "./brand";

type Props = {
  name: string;
  settings: Pick<BusinessSettings, "phone" | "email" | "address"> | null;
};

export function SiteFooter({ name, settings }: Props) {
  return <footer className="site-footer">
    <div className="footer-main wrap">
      <div className="footer-brand"><Brand name={name} /><p>Indian flavors, thoughtfully prepared for your next gathering.</p><Link className="button footer-cta" href="/catering-menu">Plan an event <ArrowRight size={16} /></Link></div>
      <div className="footer-column"><h3>Explore</h3><Link href="/catering-menu">Catering menu</Link><Link href="/menu">Regular restaurant menu</Link><Link href="/#how-it-works">How enquiries work</Link></div>
      <div className="footer-column"><h3>Get in touch</h3>{settings?.phone && <a href={`tel:${settings.phone}`}>{settings.phone}</a>}{settings?.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}{settings?.address && <span>{settings.address}</span>}<Link href="/#contact">Contact the catering team <ArrowRight size={15} /></Link></div>
    </div>
    <div className="footer-bottom"><div className="wrap"><span>Aahaa Indian Kitchen <i /> Catering &amp; bulk food enquiries</span><div><Link href="/privacy">Privacy</Link><Link href="/manager">Staff login</Link></div></div></div>
  </footer>;
}
