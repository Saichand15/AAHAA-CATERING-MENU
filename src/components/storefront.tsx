"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, CheckCircle2, ChefHat, Clock3, ExternalLink, Leaf, Mail, MapPin, Minus, Phone, Plus, Search, ShoppingBag, Trash2, Utensils, Users, X } from "lucide-react";
import type { BusinessSettings, CartLine, MenuItem, PricedLine } from "@/lib/types";
import { money, priceCart, requestSchema, validateEvent } from "@/lib/validation";
import { Brand } from "./brand";
import { SiteFooter } from "./site-footer";
import { Turnstile } from "./turnstile";

type Customer = { email: string; full_name: string; phone: string };
type Props = { settings: BusinessSettings | null; menu: MenuItem[]; canSubmit: boolean; problem: string | null; customer?: Customer | null; menuOnly?: boolean };
type Receipt = { reference: string; name: string; date: string; time: string; guests: number; fulfillment: string; address: string; notes: string; allergies: string; items: PricedLine[]; currency: string; knownSubtotal: number; hasUnpriced: boolean };

export function Storefront({ settings, menu, canSubmit, problem, customer = null, menuOnly = false }: Props) {
  const [introPhase, setIntroPhase] = useState<"entering" | "leaving" | "done">("entering");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [editing, setEditing] = useState<{ item: MenuItem; line?: CartLine } | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = settings?.name || "Aahaa Indian Kitchen";
  const currency = settings?.currency || "USD";
  const contactHours = settings?.hours.split(/\r?\n/).map(line => line.trim()).filter(Boolean) ?? [];
  const categories = ["All", ...new Set(menu.map(i => i.category))];
  const filtered = menu.filter(item => (category === "All" || item.category === category) && `${item.name} ${item.description} ${item.dietary.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const priced = priceCart(cart, menu);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setIntroPhase("leaving"), 1100);
    const finishTimer = window.setTimeout(() => setIntroPhase("done"), 1600);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  function openItem(item: MenuItem, line?: CartLine) {
    setEditing({ item, line });
    dialog.current?.showModal();
  }
  function saveLine(line: CartLine) {
    setCart(previous => {
      const index = previous.findIndex(l => l.line_id === line.line_id);
      return index === -1 ? [...previous, line] : previous.map(l => l.line_id === line.line_id ? line : l);
    });
    setCheckout(false);
    dialog.current?.close();
  }

  return <div className={menuOnly ? "menu-route-page" : "storefront-page"}>
    {!menuOnly && introPhase !== "done" && <section className={`welcome-screen${introPhase === "leaving" ? " is-leaving" : ""}`} aria-label="Aahaa Indian Kitchen welcome">
      <div className="welcome-orbit" aria-hidden="true" />
      <div className="welcome-content">
        <Brand name={name} />
        <p className="welcome-tagline">Feel the taste.</p>
        <span className="welcome-loading" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </section>}
    <header className="site-header wrap">
      <Brand name={name} />
      <nav aria-label="Main navigation"><Link href="/catering-menu">Catering menu</Link><Link href="/menu#menu">Regular menu</Link><Link href="/#how-it-works">How to enquire</Link><Link href="/#contact">Contact catering team</Link></nav>
      <div className="header-actions"><Link className="quiet-link" href={customer ? "/account" : "/login"}>{customer ? "My account" : "Customer login"}</Link><Link className="button button-small" href={menuOnly ? "#menu" : "#menu-categories"}>{menuOnly ? "Browse regular menu" : "Choose a menu"} <ArrowRight size={16} /></Link></div>
    </header>
    <main>
      {menuOnly ? <section className="menu-page-intro wrap">
        <Link className="quiet-link" href="/"><ArrowDown className="back-arrow" size={15} /> Back to Aahaa catering</Link>
        <span className="eyebrow">REGULAR RESTAURANT MENU</span>
        <h1>Explore the <em>restaurant menu.</em></h1>
        <p>Browse current Aahaa dishes and add selections as inspiration for your catering enquiry. The team will confirm catering portions, pricing and availability for your event.</p>
        <Link className="quiet-link" href="/catering-menu">Looking for our catering menu? <ArrowRight size={16} /></Link>
      </section> : <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow"><span className="little-line" /> INDIAN CATERING · BUFFALO GROVE</span>
          <h1>Your event.<br />Our <em>catering.</em></h1>
          <p>Bring Aahaa Indian Kitchen to family celebrations, weddings, festivals and corporate gatherings. Explore regular dishes for inspiration and share your event details; our team will follow up about catering options and pricing.</p>
          <div className="hero-actions"><a href="#menu-categories" className="button">Choose a menu <ArrowRight size={18} /></a><a href="#how-it-works" className="quiet-link">How to enquire <ArrowDown size={15} /></a></div>
          <div className="hero-points"><span><CheckCircle2 size={17} /> Custom menus &amp; bulk quantities</span><span><CheckCircle2 size={17} /> Reviewed by our catering team</span></div>
          <p className="catering-scope">Catering enquiries only. No dine-in or table reservations.</p>
        </div>
        <div className="hero-art">
          <Image className="hero-photo" src="/aahaa-catering-hero.webp" alt="AI-generated catering inspiration showing Indian dishes prepared for sharing" width={1536} height={1024} priority />
          <div className="hero-steam" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </section>}
      {!menuOnly && <><section className="occasion-strip" aria-label="Occasions"><div className="wrap"><span>FOR EVERY REASON TO GATHER</span><span>Family celebrations</span><i /><span>Private parties</span><i /><span>Weddings &amp; events</span><i /><span>Festivals &amp; community</span></div></section>
      <section className="wrap menu-categories" id="menu-categories" aria-labelledby="menu-categories-title">
        <div className="section-heading"><div><span className="eyebrow">TWO WAYS TO EXPLORE</span><h2 id="menu-categories-title">Choose your menu.</h2><p>Our dedicated catering menu is being prepared. Browse our restaurant menu in the meantime to share dish ideas with our team.</p></div></div>
        <div className="menu-category-grid">
          <article className="menu-category-card catering-category">
            <span className="category-icon"><ChefHat size={25} /></span><span className="eyebrow">EVENTS · BULK ORDERS</span><h3>Catering menu</h3>
            <p>Our catering-specific dishes, portions and packages will be added here when ready.</p>
            <Link className="button button-outline" href="/catering-menu">Explore catering menu <ArrowRight size={17} /></Link>
            <small>Menu coming soon</small>
          </article>
          <article className="menu-category-card regular-category">
            <span className="category-icon"><Utensils size={25} /></span><span className="eyebrow">CURRENT RESTAURANT DISHES</span><h3>Regular menu options</h3>
            <p>Explore current restaurant dishes and share your favorites for catering consideration. Catering portions and prices are confirmed separately.</p>
            <Link className="button" href="/menu">Browse regular menu <ArrowRight size={17} /></Link>
            <small>{menu.length ? `${menu.length} dishes to explore` : "Menu is loading"}</small>
          </article>
        </div>
      </section>
      <section className="wrap access-options" aria-labelledby="customer-access-title">
        <div><span className="eyebrow">YOUR CHOICE, SAME CATERING SERVICE</span><h2 id="customer-access-title">{customer ? "Welcome back to Aahaa." : "Enquire as a guest. Or make it your account."}</h2><p>{customer ? `Signed in as ${customer.email}. Your submitted enquiries will appear in your private account.` : "No account is required. Sign in to save contact details and view your catering request history."}</p></div>
        <div className="access-actions">{customer ? <><Link className="button" href="/menu#menu">Start a new enquiry</Link><Link className="button button-outline" href="/account">My catering requests</Link></> : <><Link className="button" href="/menu#menu">Continue as guest</Link><Link className="button button-outline" href="/login">Login / Create account</Link></>}</div>
      </section>
      </>}
      {menuOnly && <section className="wrap menu-section" id="menu">
        <div className="section-heading"><div><span className="eyebrow">CURRENT RESTAURANT DISHES · CATERING INSPIRATION</span><h2>Explore the regular menu.</h2><p>Choose restaurant dishes to share as ideas. Our team will confirm catering portions, prices and availability for your event.</p></div><span className="small-note"><Leaf size={16} /> Preferences welcome</span></div>
        {problem && <p className="storefront-status" role="status"><Clock3 size={16} />{problem}</p>}
        {menu.some(item => item.description.includes("not a catering quote")) && <p className="menu-pricing-note">Restaurant menu prices are for reference only, not catering quotes. Serving quantities are not catering tray portions. Catering portions, pricing and availability are confirmed for each event. Please share any allergy requirements with our team.</p>}
        <div className="menu-layout">
          <div>
            <div className="menu-tools"><div className="tabs" aria-label="Menu categories">{categories.map(c => <button key={c} className={category === c ? "tab active" : "tab"} onClick={() => setCategory(c)} aria-pressed={category === c}>{c}</button>)}</div><label className="search"><Search size={17} /><input aria-label="Search menu" placeholder="Find a favourite..." value={search} onChange={e => setSearch(e.target.value)} /></label></div>
            {filtered.length ? <div className="menu-grid">{filtered.map(item => <article className="menu-card" key={item.id}>
              <div className={`menu-image ${!item.available ? "unavailable" : ""}`}>{item.image_url ?
                // Official menu photos may be hosted remotely; native lazy loading avoids a host allowlist.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} loading="lazy" /> : <div className="dish-placeholder"><ChefHat size={48} strokeWidth={1} /><span>{item.kind === "package" ? "A spread to share" : "From our kitchen"}</span></div>}
                {item.kind === "package" && <span className="image-tag">Catering package</span>}
              </div><div className="menu-card-body"><div className="dietary">{item.dietary.map(tag => <span key={tag}>{tag}</span>)}</div><h3>{item.name}</h3><p>{item.description}</p><div className="menu-card-bottom"><div><strong>{item.price_minor === null ? "Price on request" : money(item.price_minor, currency)}</strong><small>per {item.unit}</small></div><button className="add-button" aria-label={`Customise ${item.name}`} onClick={() => openItem(item)} disabled={!item.available || Boolean(receipt)}>{item.available ? <>Choose <Plus size={16} /></> : "Unavailable"}</button></div></div>
            </article>)}</div> : <div className="empty-menu"><span className="empty-icon"><ChefHat size={32} strokeWidth={1.4} /></span><h3>{menu.length ? "No dishes found" : "Something delicious is on its way."}</h3><p>{menu.length ? "Try a different search or category." : "Our team is preparing the catering menu. Check back soon, or get in touch to plan your gathering."}</p>{menu.length ? <button className="quiet-link" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button> : <a href="#contact" className="quiet-link">Contact the team <ArrowRight size={16} /></a>}</div>}
          </div>
          <aside className="cart-panel" aria-label="Your catering request"><div className="cart-heading"><ShoppingBag size={21} /><h3>Your catering menu</h3><span className="count">{cart.length}</span></div>
            {cart.length === 0 ? <div className="empty-cart"><div className="bag-circle"><ShoppingBag size={32} strokeWidth={1.2} /></div><strong>Start with something delicious</strong><p>Your menu selections will appear here. A great gathering starts with a favourite.</p></div> : <div className="cart-lines">{priced.items.map((line, index) => <div className="cart-line" key={cart[index].line_id}><div><strong>{line.name}</strong><small>{line.quantity} &times; {line.unit}</small>{line.selections.filter(s => s.choices.length).map(s => <small key={s.group}>{s.choices.map(c => c.label).join(", ")}</small>)}{line.notes && <small>{line.notes}</small>}<span className="line-price">{line.total_minor === null ? "Price on request" : money(line.total_minor, currency)}</span></div>{!receipt && <div className="line-actions"><button className="text-link" onClick={() => openItem(menu.find(i => i.id === line.item_id)!, cart[index])}>Edit</button><button className="icon-button" aria-label={`Remove ${line.name}`} onClick={() => { setCart(cart.filter((_, i) => i !== index)); setCheckout(false); }}><Trash2 size={15} /></button></div>}</div>)}</div>}
            <div className="cart-footer">{cart.length > 0 && <div className="subtotal"><span>{priced.items.every(item => item.total_minor === null) ? "Catering pricing" : priced.hasUnpriced ? "Known subtotal" : "Menu estimate"}</span><strong>{priced.items.every(item => item.total_minor === null) ? "Quote required" : money(priced.knownSubtotal, currency)}</strong></div>}{priced.hasUnpriced && <p className="small-note">Some selections need pricing from our team.</p>}<p className="small-note">Final pricing, taxes, delivery and availability will be confirmed by our team.</p><button className="button full" disabled={!cart.length || !canSubmit || Boolean(receipt)} onClick={() => { setCheckout(true); setTimeout(() => document.getElementById("request")?.scrollIntoView({ behavior: "smooth" }), 20); }}>Add event details <ArrowRight size={17} /></button><span className="cart-reassurance">Just a request. No payment needed.</span></div>
          </aside>
        </div>
        {checkout && settings && !receipt && <RequestForm settings={settings} cart={cart} customer={customer} onSuccess={setReceipt} />}
        {receipt && <section className="receipt panel" id="receipt" aria-live="polite"><CheckCircle2 size={42} /><span className="eyebrow">CATERING REQUEST RECEIVED</span><h2>Thanks, {receipt.name.split(" ")[0]}.</h2><p>Your catering requirements have been received. Our team will contact you to confirm food availability, pricing and fulfillment arrangements.</p><div className="reference">{receipt.reference}</div><p><strong>This is a catering enquiry, not a confirmed food order.</strong> An email acknowledgment is queued; your reference above confirms that your request was saved.</p><dl className="detail-grid"><div><dt>Event</dt><dd>{receipt.date} at {receipt.time} ({settings?.timezone})</dd></div><div><dt>Guests &amp; service</dt><dd>{receipt.guests} guests &middot; {receipt.fulfillment}</dd></div>{receipt.address && <div><dt>Delivery address</dt><dd>{receipt.address}</dd></div>}</dl><ItemSummary items={receipt.items} currency={currency} />{receipt.allergies && <p><strong>Dietary/allergy requests:</strong> {receipt.allergies}</p>}{receipt.notes && <p><strong>Event notes:</strong> {receipt.notes}</p>}<div className="inline-actions"><button className="button" onClick={() => window.print()}>Print your request</button><button className="button button-outline" onClick={() => { setReceipt(null); setCart([]); setCheckout(false); }}>Start a new request</button></div>{settings?.phone && <p>Questions? Call <a className="text-link" href={`tel:${settings.phone}`}>{settings.phone}</a> and mention your reference.</p>}</section>}
      </section>}
      <section className="restaurant-context wrap" aria-labelledby="restaurant-context-title">
        <div className="restaurant-context-copy">
          <span className="eyebrow">AAHAA INDIAN KITCHEN · BUFFALO GROVE, ILLINOIS</span>
          <h2 id="restaurant-context-title">Indian flavors for gatherings across the neighborhood.</h2>
          <p>Our restaurant brings together South Indian and North Indian favorites, Mughlai dishes, Chinese selections and biryani. Ask about vegetarian choices and custom menus for weddings, private parties, festivals, community events and corporate gatherings.</p>
          <div className="restaurant-context-links">
            <a className="quiet-link" href="https://aahaaindiankitchen.com/indian-restaurant-menu" target="_blank" rel="noreferrer">View the restaurant menu <ExternalLink size={16} /></a>
            <a className="quiet-link" href="https://aahaaindiankitchen.com/" target="_blank" rel="noreferrer">Visit Aahaa Indian Kitchen <ExternalLink size={16} /></a>
          </div>
        </div>
        <aside className="service-area-card">
          <span className="eyebrow">OUR NEIGHBORHOOD</span>
          <p>{settings?.service_area || "Buffalo Grove and nearby communities."}</p>
          <small>Restaurant service area. Catering availability, delivery and menu details are confirmed for each event.</small>
        </aside>
      </section>
      <section className="how-section" id="how-it-works"><div className="wrap"><div className="section-heading centered"><span className="eyebrow">FROM YOUR MENU TO OUR CATERING TEAM</span><h2>Your catering enquiry, in three steps.</h2></div><div className="steps"><div><span className="step-number">01</span><ChefHat /><h3>Explore your menu options</h3><p>Use restaurant dishes as inspiration now; our catering-specific menu will be added when ready.</p></div><div><span className="step-number">02</span><Users /><h3>Send event requirements</h3><p>Add your guest count, event date, pickup or delivery preference and special requests.</p></div><div><span className="step-number">03</span><Phone /><h3>Our catering team follows up</h3><p>When enquiries are open, our team confirms menu choices, portions, availability and pricing.</p></div></div></div></section>
      <section className="wrap contact-section" id="contact">
        <div className="contact-copy"><span className="eyebrow">LET&apos;S PLAN YOUR EVENT MENU</span><h2>Talk to our<br />catering team.</h2><p>Need help choosing quantities, planning a custom menu or arranging a large event? Send us your catering requirements.</p><span className="contact-promise"><CheckCircle2 size={17} /> Personal help with your event menu</span></div>
        <div className="contact-card">
          {settings?.phone ? <a className="contact-row" href={`tel:${settings.phone}`}><span className="contact-row-icon"><Phone size={19} /></span><span><small>Catering enquiries</small><strong>{settings.phone}</strong></span><ArrowRight className="contact-row-arrow" size={18} /></a> : <p>Catering contact details will appear here once setup is complete.</p>}
          {settings?.email && <a className="contact-row" href={`mailto:${settings.email}`}><span className="contact-row-icon"><Mail size={19} /></span><span><small>Email the catering team</small><strong>{settings.email}</strong></span><ArrowRight className="contact-row-arrow" size={18} /></a>}
          {settings?.address && <div className="contact-row"><span className="contact-row-icon"><MapPin size={19} /></span><span><small>{settings.pickup_enabled ? "Catering pickup location" : "Kitchen address"}</small><strong>{settings.address}</strong></span></div>}
          {contactHours.length > 0 && <div className="contact-hours"><span className="contact-row-icon"><Clock3 size={19} /></span><div className="contact-hours-content"><small>Restaurant hours</small><ul>{contactHours.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div></div>}
          {settings?.whatsapp && <a className="contact-whatsapp" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Discuss catering on WhatsApp <ArrowRight size={18} /></a>}
          {settings?.delivery_enabled && <p className="contact-service-area">Catering delivery area: {settings.service_area}. Our team confirms address eligibility.</p>}
        </div>
      </section>
    </main>
    <SiteFooter name={name} settings={settings} />
    <dialog ref={dialog} className="item-dialog" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} aria-labelledby="item-dialog-title"><button className="dialog-close icon-button" aria-label="Close customization" onClick={() => dialog.current?.close()}><X size={22} /></button>{editing && <ItemCustomizer key={`${editing.item.id}-${editing.line?.line_id ?? "new"}`} item={editing.item} line={editing.line} currency={currency} onSave={saveLine} />}</dialog>
  </div>;
}

function ItemCustomizer({ item, line, currency, onSave }: { item: MenuItem; line?: CartLine; currency: string; onSave: (line: CartLine) => void }) {
  const [quantity, setQuantity] = useState(line?.quantity ?? item.minimum_quantity);
  const [selections, setSelections] = useState<Record<string, string[]>>(line?.selections ?? {});
  const [notes, setNotes] = useState(line?.notes ?? "");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { line_id: line?.line_id ?? crypto.randomUUID(), item_id: item.id, quantity, selections, notes };
    try { priceCart([next], [item]); onSave(next); }
    catch (error) { setError(error instanceof Error ? error.message : "Please check your selections."); }
  }
  return <form onSubmit={submit} className="customizer"><span className="eyebrow">{item.category}</span><h2 id="item-dialog-title">{item.name}</h2><p>{item.description}</p><p><strong>{item.price_minor === null ? "Price on request" : money(item.price_minor, currency)}</strong> per {item.unit}</p>{item.allergens.length > 0 && <p className="notice compact">Contains: {item.allergens.join(", ")}. Discuss allergy requirements with our team.</p>}
    <div className="field"><label htmlFor="item-quantity">Quantity ({item.unit})</label><div className="quantity-control"><button type="button" className="icon-button" aria-label="Decrease quantity" disabled={quantity <= item.minimum_quantity} onClick={() => setQuantity(q => Math.max(item.minimum_quantity, q - item.quantity_step))}><Minus size={16} /></button><input id="item-quantity" required type="number" min={item.minimum_quantity} step={item.quantity_step} max={10000} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /><button type="button" className="icon-button" aria-label="Increase quantity" disabled={quantity + item.quantity_step > 10000} onClick={() => setQuantity(q => q + item.quantity_step)}><Plus size={16} /></button></div><small>Minimum {item.minimum_quantity}. Add in increments of {item.quantity_step}.</small></div>
    {item.options.map(group => <fieldset className="option-group" key={group.id}><legend>{group.name} <small>Choose {group.min === group.max ? group.min : `${group.min}-${group.max}`}</small></legend>{group.choices.map(choice => <label className="option-choice" key={choice.id}><input type="checkbox" checked={(selections[group.id] ?? []).includes(choice.id)} onChange={e => { const previous = selections[group.id] ?? []; setSelections({ ...selections, [group.id]: e.target.checked ? (group.max === 1 ? [choice.id] : [...previous, choice.id]) : previous.filter(id => id !== choice.id) }); }} /><span>{choice.label}</span><small>{choice.price_minor ? `+${money(choice.price_minor, currency)} / ${item.unit}` : "Included"}</small></label>)}</fieldset>)}
    <label className="field">Special instructions<textarea maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything you would like our kitchen to know?" /><small>Custom requests may affect pricing and require staff review.</small></label>{error && <p className="error" role="alert">{error}</p>}<button className="button full" type="submit">{line ? "Update selection" : "Add to your gathering"} <Plus size={18} /></button>
  </form>;
}

function RequestForm({ settings, cart, customer, onSuccess }: { settings: BusinessSettings; cart: CartLine[]; customer: Customer | null; onSuccess: (receipt: Receipt) => void }) {
  const [fulfillment, setFulfillment] = useState(settings.pickup_enabled ? "pickup" : "delivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const key = useRef<string | null>(null);
  const fingerprint = useRef("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const values = new FormData(e.currentTarget);
    const fields = Object.fromEntries(values);
    const candidate = {
      ...fields, guests: Number(fields.guests), fulfillment, customer_mode: customer ? "account" : "guest",
      address: String(fields.address ?? ""), whatsapp_consent: values.has("whatsapp_consent"),
      privacy_accepted: values.has("privacy_accepted"), delivery_area_acknowledged: values.has("delivery_area_acknowledged"),
      website: String(fields.website ?? ""), items: cart,
    };
    const nextFingerprint = JSON.stringify(candidate);
    if (!key.current || fingerprint.current !== nextFingerprint) { key.current = crypto.randomUUID(); fingerprint.current = nextFingerprint; }
    const parsed = requestSchema.safeParse({ ...candidate, captcha_token: captcha, idempotency_key: key.current });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(" ")); return; }
    try { validateEvent(parsed.data, settings); }
    catch (error) { setError(error instanceof Error ? error.message : "Check your event details."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result: { reference?: string; error?: string; items?: PricedLine[]; currency?: string; knownSubtotal?: number; hasUnpriced?: boolean } = await response.json();
      if (!response.ok || !result.reference || !result.items || !result.currency || result.knownSubtotal === undefined || result.hasUnpriced === undefined) throw new Error(result.error || "Your request could not be confirmed. Please retry with the same details.");
      onSuccess({ reference: result.reference, name: parsed.data.customer_name, date: parsed.data.event_date, time: parsed.data.event_time, guests: parsed.data.guests, fulfillment, address: parsed.data.address, notes: parsed.data.notes, allergies: parsed.data.allergies, items: result.items, currency: result.currency, knownSubtotal: result.knownSubtotal, hasUnpriced: result.hasUnpriced });
      setTimeout(() => document.getElementById("receipt")?.scrollIntoView({ behavior: "smooth" }), 20);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection interrupted. Please try again with the same details.");
      setCaptcha(""); setCaptchaKey(k => k + 1);
    } finally { setBusy(false); }
  }
  return <section className="request-section panel" id="request"><span className="eyebrow">YOUR CATERING REQUIREMENTS</span><h2>Tell us about your event.</h2><p>We&apos;ll send your selected menu, quantities and event details to our catering team. No payment is needed.</p><form onSubmit={submit}><fieldset disabled={busy} className="plain-fieldset"><div className="form-grid">
    <label className="field">Full name *<input name="customer_name" autoComplete="name" defaultValue={customer?.full_name} required minLength={2} maxLength={120} /></label>
    <label className="field">Email address *<input name="email" type="email" autoComplete="email" defaultValue={customer?.email} readOnly={!!customer} required maxLength={254} />{customer && <small>Your verified account email.</small>}</label>
    <label className="field">Phone number *<input name="phone" type="tel" autoComplete="tel" defaultValue={customer?.phone} placeholder="+12125551234" pattern="\+[1-9][0-9]{7,14}" required /><small>Include your country code.</small></label>
    <label className="field">Preferred contact<select name="preferred_contact"><option value="email">Email</option><option value="phone">Phone call</option>{settings.whatsapp && <option value="whatsapp">WhatsApp</option>}</select></label>
    <label className="field">Occasion *<select name="event_type" required><option value="">Select an occasion</option><option>Family celebration</option><option>Office / corporate event</option><option>Wedding / reception</option><option>Community gathering</option><option>Other occasion</option></select></label>
    <label className="field">Number of guests *<input name="guests" type="number" min={settings.min_guests} max={settings.max_guests} required /><small>{settings.min_guests}-{settings.max_guests} guests. Contact us for other group sizes.</small></label>
    <label className="field">Event date *<input name="event_date" type="date" required /><small>At least {settings.lead_hours} hours&apos; notice.</small></label>
    <label className="field">Event time *<input name="event_time" type="time" required /><small>All times are in {settings.timezone}.</small></label>
    <label className="field">Service *<select value={fulfillment} onChange={e => setFulfillment(e.target.value)}>{settings.pickup_enabled && <option value="pickup">Pickup</option>}{settings.delivery_enabled && <option value="delivery">Delivery</option>}</select></label>
    {fulfillment === "delivery" ? <label className="field">Delivery address *<textarea name="address" required maxLength={500} autoComplete="street-address" /></label> : <div className="field">Pickup location<p className="small-note">{settings.address}</p></div>}
    <label className="field">Dietary or allergy requirements<textarea name="allergies" maxLength={1000} placeholder="Please describe any dietary or allergy requirements." /><small>Our team must review allergy requests. An allergen-free environment is not guaranteed.</small></label>
    <label className="field">Anything else we should know?<textarea name="notes" maxLength={2000} placeholder="Venue access, setup requirements, special requests..." /></label>
  </div>{fulfillment === "delivery" && <label className="checkbox-field"><input type="checkbox" name="delivery_area_acknowledged" required /><span>My address is within the described service area: {settings.service_area}. I understand staff will confirm eligibility.</span></label>}
  <div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
  <label className="checkbox-field"><input type="checkbox" name="privacy_accepted" required /><span>I have read the <Link className="text-link" href="/privacy" target="_blank">privacy notice</Link> and understand my details will be used to respond to this catering request. *</span></label>
  {settings.whatsapp && <label className="checkbox-field"><input type="checkbox" name="whatsapp_consent" /><span>I agree to be contacted on WhatsApp about this request. Optional; no marketing consent is implied.</span></label>}
  <p className="small-note">This submits a catering enquiry, not a confirmed food order. Our team will confirm pricing, availability and fulfillment arrangements with you.</p>
  <Turnstile key={captchaKey} onToken={setCaptcha} />
  {error && <p className="error" role="alert">{error}</p>}<button className="button" type="submit" disabled={busy || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)}>{busy ? "Saving your request..." : "Send catering request"} <ArrowRight size={18} /></button></fieldset></form></section>;
}

export function ItemSummary({ items, currency }: { items: PricedLine[]; currency: string }) {
  return <div className="summary-items">{items.map((item, index) => <div key={index}><div><strong>{item.quantity} &times; {item.name}</strong><small>Unit: {item.unit}</small>{item.selections.filter(g => g.choices.length).map(g => <small key={g.group}>{g.group}: {g.choices.map(c => c.label).join(", ")}</small>)}{item.notes && <p>{item.notes}</p>}</div><span>{item.total_minor === null ? "Price on request" : money(item.total_minor, currency)}</span></div>)}</div>;
}
