import Link from "next/link";
import { ArrowRight, Facebook, Instagram, MapPin } from "lucide-react";
import { getRestaurantContact, restaurantInfo, type RestaurantContactSettings } from "@/lib/restaurant-info";
import { Brand } from "./brand";

type Props = {
  name: string;
  settings: RestaurantContactSettings | null;
};

export function SiteFooter({ name, settings }: Props) {
  const contact = getRestaurantContact(settings);
  return <footer className="site-footer">
    <div className="footer-main wrap">
      <div className="footer-brand"><Brand name={name} /><p>From a family milestone to a team celebration. Bring your people; we&apos;ll help you plan the food.</p><Link className="button footer-cta" href="/catering-menu#menu">Build your enquiry <ArrowRight size={16} /></Link><div className="footer-socials"><a href={restaurantInfo.instagram} target="_blank" rel="noreferrer" aria-label="Aahaa on Instagram"><Instagram size={19} /></a><a href={restaurantInfo.facebook} target="_blank" rel="noreferrer" aria-label="Aahaa on Facebook"><Facebook size={19} /></a></div></div>
      <div className="footer-column"><h3>Explore Aahaa</h3><Link href="/catering-menu">Catering menu</Link><Link href="/#how-it-works">How enquiries work</Link><Link href="/#catering-questions">Catering questions</Link><a href={restaurantInfo.website} target="_blank" rel="noreferrer">Restaurant website</a></div>
      <div className="footer-column"><h3>Let&apos;s talk catering</h3><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>{contact.phone.replace(/\D/g, "") !== restaurantInfo.secondaryPhone.replace(/\D/g, "") && <a href="tel:+18477778122">{restaurantInfo.secondaryPhone}</a>}<a href={`mailto:${contact.email}`}>{contact.email}</a><span>{contact.address}</span><a className="footer-directions" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`} target="_blank" rel="noreferrer"><MapPin size={16} /> Get directions</a></div>
      <div className="footer-column footer-hours"><h3>Opening hours</h3><ul>{contact.hours.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul><p>Kitchen closes 15 minutes before closing. Catering pickup and delivery times are confirmed with our team.</p></div>
    </div>
    <div className="footer-notice wrap"><strong>Food allergies &amp; dietary needs</strong><p>Please tell our team about allergies and dietary restrictions before ordering. Ask us to check ingredients and preparation requirements; a dietary preference is not an allergen-free guarantee.</p></div>
    <div className="footer-bottom"><div className="wrap"><span>&copy; {new Date().getFullYear()} {name}. Catering &amp; bulk food enquiries.</span><div><Link href="/privacy">Privacy</Link><a href={`${restaurantInfo.website}/terms`} target="_blank" rel="noreferrer">Restaurant terms</a><Link href="/manager">Staff login</Link></div></div></div>
  </footer>;
}
