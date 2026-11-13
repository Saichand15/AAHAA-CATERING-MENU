import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChefHat } from "lucide-react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catering Menu | Aahaa Indian Kitchen",
  description: "Aahaa Indian Kitchen's event catering menu is being prepared. Browse regular restaurant dishes for catering inspiration.",
};

export default async function CateringMenu() {
  const { settings } = await getCatalog();
  return <div className="catering-menu-page">
    <header className="site-header wrap">
      <Brand name={settings?.name || "Aahaa Indian Kitchen"} />
      <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/menu">Regular menu</Link><Link href="/#how-it-works">How to enquire</Link><Link href="/#contact">Contact catering team</Link></nav>
      <Link className="button button-small" href="/menu">Browse regular menu <ArrowRight size={16} /></Link>
    </header>
    <main className="catering-menu-content wrap">
      <Link className="quiet-link" href="/"><ArrowLeft size={16} /> Back to menu choices</Link>
      <section className="catering-coming-soon panel" aria-labelledby="catering-menu-title">
        <span className="coming-soon-icon"><ChefHat size={34} /></span>
        <span className="eyebrow">AAHAA CATERING · BUFFALO GROVE</span>
        <h1 id="catering-menu-title">Our catering menu is coming soon.</h1>
        <p>We&apos;re preparing a dedicated menu with event portions and catering options. Until it&apos;s ready, browse regular restaurant dishes and share your favorites as inspiration. Our team will confirm catering portions, pricing and availability for each event.</p>
        <div className="inline-actions">
          <Link className="button" href="/menu">Browse regular menu <ArrowRight size={18} /></Link>
          <Link className="button button-outline" href="/#contact">Contact our catering team</Link>
        </div>
      </section>
    </main>
    <SiteFooter name={settings?.name || "Aahaa Indian Kitchen"} settings={settings} />
  </div>;
}
