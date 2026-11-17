"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, CheckCircle2, ChefHat, Clock3, ExternalLink, Leaf, Mail, MapPin, Minus, Phone, Plus, Search, ShoppingBag, Trash2, Users, X } from "lucide-react";
import type { BusinessSettings, CartLine, MenuItem, PricedLine } from "@/lib/types";
import { estimateLabel, money, priceCart, requestSchema, validateEvent, ValidationError } from "@/lib/validation";
import { getRestaurantContact, restaurantInfo } from "@/lib/restaurant-info";
import { Brand } from "./brand";
import { SiteFooter } from "./site-footer";
import { Turnstile } from "./turnstile";
import { useCateringDraft, eventDraftSchema, type EventDraft, type Receipt } from "./use-catering-draft";
import { PackageDescription } from "./package-description";
import { eventSchedule } from "@/lib/request-display";
import { OpenCustomerChat } from "./customer-chat";

type Customer = { email: string; full_name: string; phone: string };
type Props = { settings: BusinessSettings | null; menu: MenuItem[]; cartMenu?: MenuItem[]; canSubmit: boolean; problem: string | null; customer?: Customer | null; menuOnly?: boolean; cateringMenu?: boolean };
const HERO_VIDEO_PLAYBACK_RATE = 0.85;

export function Storefront({ settings, menu, cartMenu = menu, canSubmit, problem, customer = null, menuOnly = false, cateringMenu = false }: Props) {
  const [introPhase, setIntroPhase] = useState<"entering" | "leaving" | "done">("entering");
  const { draft, setDraft, ready, storageError, emptyDraft } = useCateringDraft();
  const heroVideo = useRef<HTMLVideoElement>(null);
  const midVideo = useRef<HTMLVideoElement>(null);
  const { cart, checkout, receipt } = draft;
  const viewKey = cateringMenu ? "catering" : "regular";
  const view = draft.views[viewKey] ?? { category: "All", search: "", partySize: "All" };
  const { category, search, partySize } = view;
  function updateView(change: Partial<typeof view>) {
    setDraft(previous => ({ ...previous, views: { ...previous.views, [viewKey]: { ...(previous.views[viewKey] ?? { category: "All", search: "", partySize: "All" }), ...change } } }));
  }
  const setCategory = (category: string) => updateView({ category });
  const setSearch = (search: string) => updateView({ search });
  const setPartySize = (partySize: string) => updateView({ partySize });
  const [editing, setEditing] = useState<{ item: MenuItem; line?: CartLine } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = settings?.name || "Aahaa Indian Kitchen";
  const currency = settings?.currency || "USD";
  const contact = getRestaurantContact(settings);
  useEffect(() => {
    const videos = [heroVideo.current, midVideo.current].filter((video): video is HTMLVideoElement => Boolean(video));
    if (!videos.length || menuOnly) return;
    const updatePlayback = () => {
      if (document.visibilityState === "hidden") {
        for (const video of videos) video.pause();
        return;
      }
      for (const video of videos) {
        video.defaultMuted = true;
        video.muted = true;
        video.defaultPlaybackRate = HERO_VIDEO_PLAYBACK_RATE;
        video.playbackRate = HERO_VIDEO_PLAYBACK_RATE;
        try {
          const playback = video.play();
          void playback?.catch(error => console.warn("Homepage catering video could not autoplay; showing its poster instead.", error));
        } catch (error) {
          console.warn("Homepage catering video could not autoplay; showing its poster instead.", error);
        }
      }
    };
    updatePlayback();
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [menuOnly]);
  const customMenus = cateringMenu ? menu.filter(item => item.is_custom_menu) : [];
  const catalogMenu = cateringMenu ? menu.filter(item => !item.is_custom_menu) : menu;
  const categories = ["All", ...new Set(catalogMenu.map(i => i.category)), ...(customMenus.length ? ["Customized"] : [])];
  const partySizes = [...new Set(catalogMenu.filter(i => i.kind === "package").map(i => i.unit.replace(/^package for /, "")))];
  const filtered = catalogMenu.filter(item => (category === "All" || item.category === category) && (partySize === "All" || item.unit === `package for ${partySize}`) && `${item.name} ${item.description} ${item.dietary.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const reviewed = cart.map(line => {
    try { return { line, priced: priceCart([line], cartMenu).items[0], error: "" }; }
    catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      return { line, priced: null, error: error.message };
    }
  });
  const validLines = reviewed.filter(entry => entry.priced).map(entry => entry.line);
  const priced = priceCart(validLines, cartMenu);
  const hasCartErrors = reviewed.some(entry => entry.error);

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
    if (cart.length >= 50 && !cart.some(saved => saved.line_id === line.line_id)) {
      throw new ValidationError("A request can include up to 50 menu selections. Edit or remove an existing selection first.");
    }
    setDraft(previous => {
      const index = previous.cart.findIndex(l => l.line_id === line.line_id);
      return { ...previous, cart: index === -1 ? [...previous.cart, line] : previous.cart.map(l => l.line_id === line.line_id ? line : l) };
    });
    dialog.current?.close();
  }
  function reviewRequest(quick = false) {
    setDraft(previous => ({ ...previous, checkout: true, quick }));
    setTimeout(() => document.getElementById("request")?.scrollIntoView({ behavior: "smooth" }), 20);
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
      <nav aria-label="Main navigation"><Link href="/catering-menu">Catering menu</Link><Link href="/#how-it-works">How to enquire</Link><Link href="/#contact">Contact manager</Link></nav>
      <div className="header-actions"><a className="quiet-link" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>Call us</a><Link className="quiet-link" href={customer ? "/account" : "/login"}>{customer ? "My account" : "Customer login"}</Link><Link className="button button-small" href={menuOnly ? "#menu" : "#menu-categories"}>{menuOnly ? "Browse packages" : "Choose a menu"} <ArrowRight size={16} /></Link></div>
    </header>
    <main>
      {storageError && <p className="wrap error" role="alert">{storageError}</p>}
      {ready && receipt && !menuOnly && <div className="draft-shortcut wrap" role="status"><span>Request saved: {receipt.reference}</span><Link className="button button-small" href="/catering-menu#receipt">View saved request</Link></div>}
      {ready && cart.length > 0 && !receipt && <div className="draft-shortcut wrap" role="region" aria-label="Your catering cart"><span><ShoppingBag size={18} /> {cart.length} menu selection{cart.length === 1 ? "" : "s"}</span>{menuOnly ? <button className="button button-small" onClick={() => document.getElementById("catering-cart")?.scrollIntoView({ behavior: "smooth" })}>Review cart &amp; send <ArrowRight size={16} /></button> : <Link className="button button-small" href="/catering-menu#catering-cart">Review cart &amp; send <ArrowRight size={16} /></Link>}</div>}
      {menuOnly ? <section className="menu-page-intro wrap">
        <Link className="quiet-link" href="/"><ArrowDown className="back-arrow" size={15} /> Back to Aahaa catering</Link>
        <span className="eyebrow">{cateringMenu ? "CATERING PACKAGES · PUBLISHED PRICES" : "REGULAR RESTAURANT MENU"}</span>
        <h1>{cateringMenu ? <>Your gathering.<br /><em>Your catering package.</em></> : <>Explore the <em>restaurant menu.</em></>}</h1>
        <p>{cateringMenu ? "Choose a Veg, Non-Veg or Aahaa Special package for your party size. Customize your included options, add dish preferences and share your event details with our manager." : "Browse current Aahaa dishes and add selections as inspiration for your catering enquiry. The team will confirm catering portions, pricing and availability for your event."}</p>
        {!cateringMenu && <Link className="quiet-link" href="/catering-menu">Looking for our catering menu? <ArrowRight size={16} /></Link>}
      </section> : <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow-scroll"><span className="little-line" /><span className="hero-eyebrow-scroll-track"><span>INDIAN CATERING · BUFFALO GROVE</span><span aria-hidden="true">INDIAN CATERING · BUFFALO GROVE</span></span></span>
          <span className="hero-script">Feel the taste.</span>
          <h1>Your event.<br />Our <em>catering.</em></h1>
          <p>Bring Aahaa Indian Kitchen to family celebrations, weddings, festivals and corporate gatherings. Choose a priced catering package and share your preferences; our team will confirm the menu and event arrangements.</p>
          <div className="hero-actions"><a href="#menu-categories" className="button">Choose a menu <ArrowRight size={18} /></a><a href="#how-it-works" className="quiet-link">How to enquire <ArrowDown size={15} /></a></div>
          <div className="hero-points"><span><CheckCircle2 size={17} /> Custom menus &amp; bulk quantities</span><span><CheckCircle2 size={17} /> Reviewed by our manager</span></div>
          <p className="catering-scope">Catering enquiries only. No dine-in or table reservations.</p>
        </div>
        <div className="hero-art">
          <video ref={heroVideo} className="hero-photo hero-video" muted loop autoPlay playsInline preload="metadata" poster="/aahaa-catering-banner.webp" aria-label="Biryani being finished and a full Aahaa catering tray" role="img">
            <source src="/aahaa-catering-hero.mp4" type="video/mp4" />
          </video>
          <div className="hero-steam" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </section>}
      {!menuOnly && <><section className="occasion-strip" aria-label="Occasions"><div className="wrap"><span>FOR EVERY REASON TO GATHER</span><span>Family celebrations</span><i /><span>Private parties</span><i /><span>Weddings &amp; events</span><i /><span>Festivals &amp; community</span></div></section>
      <section className="wrap catering-gallery" aria-label="Featured catering dishes">
        <article className="catering-gallery-card">
          <Image src="/aahaa-catering-paneer.webp" alt="Paneer platter from Aahaa catering" width={900} height={900} sizes="(max-width: 760px) 100vw, 33vw" />
          <span>Paneer specialties</span>
        </article>
        <article className="catering-gallery-card">
          <Image src="/aahaa-catering-halwa.webp" alt="Halwa dessert from Aahaa catering" width={900} height={900} sizes="(max-width: 760px) 100vw, 33vw" />
          <span>Fresh desserts</span>
        </article>
        <article className="catering-gallery-card">
          <Image src="/aahaa-catering-banner.webp" alt="Chef-prepared catering spread from Aahaa" width={1280} height={720} sizes="(max-width: 760px) 100vw, 33vw" />
          <span>Event-ready trays</span>
        </article>
      </section>
      <section className="wrap catering-mid-video" aria-label="Catering highlight video">
        <div className="catering-mid-video-layout">
          <div className="catering-mid-video-frame">
            <video ref={midVideo} className="catering-mid-video-media" muted loop autoPlay playsInline preload="metadata" poster="/aahaa-catering-banner.webp" aria-label="Aahaa catering kitchen highlight reel" role="img">
              <source src="/aahaa-catering-mid.mp4" type="video/mp4" />
            </video>
            <span>Live kitchen energy · event-ready service</span>
          </div>
          <aside className="catering-mid-video-copy">
            <span className="eyebrow">WHY CLIENTS CHOOSE AAHAA</span>
            <h3>Made for events, not just meals.</h3>
            <div className="catering-mid-points">
              <span><CheckCircle2 size={16} /> Freshly prepared for your schedule</span>
              <span><CheckCircle2 size={16} /> Vegetarian and custom options available</span>
              <span><CheckCircle2 size={16} /> Manager follow-up for smooth execution</span>
            </div>
            <Link className="button button-small" href="/catering-menu#menu">Build your catering request <ArrowRight size={16} /></Link>
          </aside>
        </div>
      </section>
      <section className="wrap catering-story" aria-labelledby="catering-story-title">
        <div className="catering-story-photos">
          <Image src="/aahaa-catering-paneer.webp" alt="Paneer dish featured on Aahaa's catering menu website" width={736} height={736} sizes="(max-width: 760px) 60vw, 330px" />
          <Image src="/aahaa-catering-halwa.webp" alt="Halwa dessert featured on Aahaa's catering website" width={900} height={900} sizes="(max-width: 760px) 38vw, 230px" />
        </div>
        <div className="catering-story-copy"><span className="eyebrow">YOUR PEOPLE. YOUR OCCASION.</span><h2 id="catering-story-title">A little more flavor.<br /><em>A lot more together.</em></h2><p>Plan a wedding feast, birthday, office lunch or community celebration with Aahaa. Tell us what you love, how many people are coming and what your guests need.</p><div className="catering-story-points"><span><Leaf size={18} /> Vegetarian preferences welcome</span><span><Users size={18} /> Family, community &amp; corporate events</span><span><ChefHat size={18} /> Custom menu discussions with our team</span></div><Link className="quiet-link" href="/catering-menu#menu">Browse catering packages <ArrowRight size={17} /></Link></div>
      </section>
      <section className="wrap menu-categories" id="menu-categories" aria-labelledby="menu-categories-title">
        <div className="section-heading"><div><span className="eyebrow">CATERING FOR EVERY GATHERING</span><h2 id="menu-categories-title">Choose your catering package.</h2><p>Explore priced catering packages for your event, customize your options and send your enquiry to our manager.</p></div></div>
        <div className="menu-category-grid">
          <article className="menu-category-card catering-category">
            <span className="category-icon"><ChefHat size={25} /></span><span className="eyebrow">EVENTS · BULK ORDERS</span><h3>Catering menu</h3>
            <p>Veg, Non-Veg and Aahaa Special packages. Compare prices, choose a party size and customize your preferences.</p>
            <Link className="button button-outline" href="/catering-menu">Explore catering menu <ArrowRight size={17} /></Link>
            {menu.some(item => item.is_custom_menu) && <Link className="text-link custom-menu-home-link" href="/catering-menu#custom-menu">Or build your own catering menu</Link>}
            <small>{menu.length ? `${menu.length} catering options to explore` : "Published package prices and portions"}</small>
          </article>
        </div>
      </section>
      <section className="wrap access-options" aria-labelledby="customer-access-title">
        <div><span className="eyebrow">YOUR CHOICE, SAME CATERING SERVICE</span><h2 id="customer-access-title">{customer ? "Welcome back to Aahaa." : "Enquire as a guest. Or make it your account."}</h2><p>{customer ? `Signed in as ${customer.email}. Your submitted enquiries will appear in your private account.` : "No account is required. Sign in to save contact details and view your catering request history."}</p></div>
        <div className="access-actions">{customer ? <><Link className="button" href="/catering-menu#menu">Start a new enquiry</Link><Link className="button button-outline" href="/account">My catering requests</Link></> : <><Link className="button" href="/catering-menu#menu">Continue as guest</Link><Link className="button button-outline" href="/login">Login / Create account</Link></>}</div>
      </section>
      </>}
      {menuOnly && <section className="wrap menu-section catalog-section" id="menu">
        <div className="section-heading"><div><span className="eyebrow">{cateringMenu ? "PACKAGES FOR YOUR OCCASION" : "CURRENT RESTAURANT DISHES · CATERING INSPIRATION"}</span><h2>{cateringMenu ? "Explore catering packages." : "Explore the regular menu."}</h2><p>{cateringMenu ? "Prices are per whole package, not per person. Quantity 1 means one complete package for the stated party size." : "Choose restaurant dishes to share as ideas. Our team will confirm catering portions, prices and availability for your event."}</p></div><span className="small-note"><Leaf size={16} /> Preferences welcome</span></div>
        {problem && <p className="storefront-status" role="status"><Clock3 size={16} />{problem}</p>}
        {cateringMenu && <details className="package-guidance"><summary>Package guidance &amp; portion information</summary><p>Tray sizes and guest coverage are approximate; review portions based on your guests&apos; appetite. Paneer may be selected for only one entr&eacute;e. Specific appetizer and entr&eacute;e dishes are finalized with our team.</p><p>The Special package includes three entr&eacute;es, but the supplied portion table lists only two entr&eacute;e rows. Our manager will clarify that portion before confirmation. Taxes, delivery and changes are confirmed separately.</p></details>}
        {menu.some(item => item.description.includes("not a catering quote")) && <p className="menu-pricing-note">Restaurant menu prices are for reference only, not catering quotes. Serving quantities are not catering tray portions. Catering portions, pricing and availability are confirmed for each event. Please share any allergy requirements with our team.</p>}
        <div className="menu-layout">
          <div>
            <div className="menu-tools"><div className="tabs" aria-label="Menu categories">{categories.map(c => <button key={c} className={category === c ? "tab active" : "tab"} onClick={() => setCategory(c)} aria-pressed={category === c}>{c}</button>)}</div><label className="search"><Search size={17} /><input aria-label="Search menu" placeholder="Find a favourite..." maxLength={254} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
            {customMenus.length > 0 && <section className="custom-menu-intro" id="custom-menu" aria-label="Customized catering menus"><div><span className="eyebrow">YOUR CHOICES, YOUR GATHERING</span><h3>Want a menu of your own?</h3><p>Choose dishes from category dropdowns instead of a fixed package. Our manager confirms portions, availability and your quote.</p></div><div className="custom-menu-actions">{customMenus.map(item => <button key={item.id} className="button" disabled={!ready || !item.available || Boolean(receipt)} onClick={() => openItem(item)}>{item.available ? item.name : `${item.name} - unavailable`} <ChefHat size={17} /></button>)}</div></section>}
            {cateringMenu && category !== "Customized" && <label className="field package-size-filter">Party size<select value={partySize} onChange={e => setPartySize(e.target.value)}><option value="All">All party sizes</option>{partySizes.map(size => <option key={size} value={size}>{size}</option>)}</select><small>For a size between listed ranges or over 80 guests, contact our team for guidance.</small></label>}
            {filtered.length ? <div className="menu-grid">{filtered.map(item => <article className={`menu-card ${item.kind === "package" ? "catalog-package" : "catalog-dish"}`} key={item.id}>
              {item.kind !== "package" && <div className={`menu-image ${!item.available ? "unavailable" : ""}`}>{item.image_url ?
                // Official menu photos may be hosted remotely; native lazy loading avoids a host allowlist.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} loading="lazy" /> : <div className="dish-placeholder"><ChefHat size={48} strokeWidth={1} />                <span>From our kitchen</span></div>}
              </div>}<div className="menu-card-body">{item.kind === "package" && <span className="catalog-package-label"><Users size={14} /> {item.unit.replace(/^package for /, "")}</span>}<div className="dietary">{item.dietary.map(tag => <span key={tag}>{tag}</span>)}</div><h3>{item.name}</h3>{item.kind === "package" ? <details className="package-portions"><summary>Inclusions, trays &amp; notes</summary><PackageDescription description={item.description} /></details> : <details className="catalog-dish-details"><summary>Dish details</summary><p>{item.description}</p></details>}<div className="menu-card-bottom"><div><strong>{item.price_minor === null ? "Price on request" : money(item.price_minor, currency)}</strong><small>per {item.unit}</small></div><button className="add-button" aria-label={`Customise ${item.name}`} onClick={() => openItem(item)} disabled={!ready || !item.available || Boolean(receipt)}>{item.available ? <>Choose <Plus size={16} /></> : "Unavailable"}</button></div></div>
            </article>)}</div> : category === "Customized" && customMenus.length ? null : <div className="empty-menu"><span className="empty-icon"><ChefHat size={32} strokeWidth={1.4} /></span><h3>{menu.length ? "No dishes found" : "Menu unavailable"}</h3><p>{menu.length ? "Try a different search or category." : "Please contact the restaurant for current menu availability."}</p>{menu.length ? <button className="quiet-link" onClick={() => { setSearch(""); setCategory("All"); setPartySize("All"); }}>Clear filters</button> : <a href="#contact" className="quiet-link">Contact the team <ArrowRight size={16} /></a>}</div>}
          </div>
          <aside className="cart-panel" id="catering-cart" aria-label="Your catering request"><div className="cart-heading"><ShoppingBag size={21} /><h3>Your catering menu</h3><span className="count">{cart.length}</span></div>
            {cart.length === 0 ? <div className="empty-cart"><div className="bag-circle"><ShoppingBag size={32} strokeWidth={1.2} /></div><strong>Start with something delicious</strong><p>Your menu selections will appear here. A great gathering starts with a favourite.</p></div> : <div className="cart-lines">{reviewed.map(({ line: saved, priced: line, error }) => {
              const item = cartMenu.find(item => item.id === saved.item_id);
              const title = line?.name ?? item?.name ?? "Saved menu selection";
              const substitution = line?.substitution_request ?? saved.substitution_request;
              return <div className="cart-line" key={saved.line_id}><div><strong>{title}</strong><small>{saved.quantity} &times; {line?.unit ?? item?.unit ?? "selection"}</small>{line?.selections.filter(s => s.choices.length).map(s => <small key={s.group}>{s.choices.map(c => c.label).join(", ")}</small>)}{saved.notes && <small>{saved.notes}</small>}{substitution && <small><strong>Substitution request:</strong> {substitution}<br />Base package price shown. Manager quote required.</small>}{error ? <p className="error" role="alert">{error} Edit or remove this selection before sending.</p> : line && <span className="line-price">{line.total_minor === null ? "Price on request" : money(line.total_minor, currency)}</span>}</div>{!receipt && <div className="line-actions">{item?.available && <button className="text-link" onClick={() => openItem(item, saved)}>Edit</button>}<button className="icon-button" aria-label={`Remove ${title}`} onClick={() => setDraft(previous => ({ ...previous, cart: previous.cart.filter(line => line.line_id !== saved.line_id) }))}><Trash2 size={15} /></button></div>}</div>;
            })}</div>}
            <div className="cart-footer">{cart.length > 0 && !hasCartErrors && <div className="subtotal"><span>{priced.items.every(item => item.total_minor === null) ? "Catering pricing" : estimateLabel(priced.items, priced.hasUnpriced)}</span><strong>{priced.items.every(item => item.total_minor === null) ? "Quote required" : money(priced.knownSubtotal, currency)}</strong></div>}{priced.hasUnpriced && <p className="small-note">Some selections need pricing from our team.</p>}<p className="small-note">Final pricing, taxes, delivery and availability will be confirmed by our team.</p><div className="cart-submit-actions"><button className="button full" disabled={!ready || !cart.length || hasCartErrors || Boolean(receipt)} onClick={() => reviewRequest()}>Add event details <ArrowRight size={17} /></button><button className="button button-outline full" disabled={!ready || !cart.length || hasCartErrors || Boolean(receipt)} onClick={() => reviewRequest(true)}>Send without event details <Mail size={17} /></button></div><span className="cart-reassurance">Only your name and mobile number are required. Event details and email are optional.</span>{!canSubmit && <p className="notice" role="status">Sending requests is currently unavailable. You can save your menu and event details, or contact the team.</p>}</div>
          </aside>
        </div>
        {ready && checkout && cart.length > 0 && settings && !receipt && <RequestForm settings={settings} cart={cart} customer={customer} quick={draft.quick} onQuick={quick => setDraft(previous => ({ ...previous, quick }))} fields={draft.fields} submission={draft.submission} canSubmit={canSubmit && !hasCartErrors} onFields={fields => setDraft(previous => ({ ...previous, fields: { ...previous.fields, ...fields } }))} onSubmission={submission => setDraft(previous => ({ ...previous, submission }))} onSuccess={receipt => setDraft({ ...emptyDraft, receipt })} />}
        {receipt && <section className="receipt panel" id="receipt" aria-live="polite"><CheckCircle2 size={42} /><span className="eyebrow">CATERING REQUEST RECEIVED</span><h2>Thanks, {receipt.name.split(" ")[0]}.</h2><p>Your catering requirements have been received. Our team will contact you to confirm food availability, pricing and fulfillment arrangements.</p><div className="reference">{receipt.reference}</div><p><strong>This is a catering enquiry, not a confirmed food order.</strong> {receipt.emailProvided ? "An email acknowledgment is queued." : "No email address was provided; our team will follow up using your mobile number."} Your reference above confirms that your request was saved.</p>{receipt.chatWarning && <p className="error" role="alert">{receipt.chatWarning}</p>}<OpenCustomerChat /><dl className="detail-grid"><div><dt>Event</dt><dd>{eventSchedule(receipt.date, receipt.time, settings?.timezone ?? "America/Chicago")}</dd></div><div><dt>Guests</dt><dd>{receipt.guests ?? "Not provided"}</dd></div><div><dt>Service</dt><dd>{receipt.fulfillment ?? "Not provided"}</dd></div>{receipt.address && <div><dt>Delivery address</dt><dd>{receipt.address}</dd></div>}</dl><ItemSummary items={receipt.items} currency={receipt.currency} />{receipt.allergies && <p><strong>Dietary/allergy requests:</strong> {receipt.allergies}</p>}{receipt.notes && <p><strong>Event notes:</strong> {receipt.notes}</p>}<div className="inline-actions"><button className="button" onClick={() => window.print()}>Print your request</button><button className="button button-outline" onClick={() => setDraft(emptyDraft)}>Start a new request</button></div>{settings?.phone && <p>Questions? Call <a className="text-link" href={`tel:${settings.phone}`}>{settings.phone}</a> and mention your reference.</p>}</section>}
      </section>}
      <section className="restaurant-context wrap" aria-labelledby="restaurant-context-title">
        <div className="restaurant-context-copy">
          <span className="eyebrow">AAHAA INDIAN KITCHEN · BUFFALO GROVE, ILLINOIS</span>
          <h2 id="restaurant-context-title">Indian flavors for gatherings across the neighborhood.</h2>
          <p>Our restaurant brings together South Indian and North Indian favorites, Mughlai dishes, Chinese selections and biryani. Ask about vegetarian choices and custom menus for weddings, private parties, festivals, community events and corporate gatherings.</p>
          <div className="restaurant-context-links">
            <a className="quiet-link" href="https://aahaaindiankitchen.com/" target="_blank" rel="noreferrer">Visit Aahaa Indian Kitchen <ExternalLink size={16} /></a>
          </div>
        </div>
        <aside className="service-area-card">
          <span className="eyebrow">OUR NEIGHBORHOOD</span>
          <p>{settings?.service_area || "Buffalo Grove and nearby communities."}</p>
          <small>Restaurant service area. Catering availability, delivery and menu details are confirmed for each event.</small>
        </aside>
      </section>
      <section className="how-section" id="how-it-works"><div className="wrap"><div className="section-heading centered"><span className="eyebrow">FROM YOUR MENU TO OUR MANAGER</span><h2>Your catering enquiry, in three steps.</h2></div><div className="steps"><div><span className="step-number">01</span><ChefHat /><h3>Choose your catering package</h3><p>Compare published package prices and portions, choose your party size and customize the included options.</p></div><div><span className="step-number">02</span><Users /><h3>Send event requirements</h3><p>Add your guest count, event date, pickup or delivery preference and special requests.</p></div><div><span className="step-number">03</span><Phone /><h3>Our manager follows up</h3><p>When enquiries are open, our team confirms menu choices, portions, availability and pricing.</p></div></div></div></section>
      <section className="wrap catering-faq" id="catering-questions" aria-labelledby="catering-questions-title">
        <div><span className="eyebrow">GOOD FOOD STARTS WITH A CONVERSATION</span><h2 id="catering-questions-title">A few things<br />worth knowing.</h2><p>Planning something special? Our manager can help you with the details.</p><a className="quiet-link" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>Talk to the team <ArrowRight size={17} /></a></div>
        <div className="faq-list">
          <details><summary>How early should I enquire?</summary><p>Contact us as soon as your plans take shape, especially for a large event. Our team will check your preferred date and the preparation time needed for your menu.</p></details>
          <details><summary>Can I request vegetarian, vegan or gluten-free options?</summary><p>Include your dietary needs and allergies in your enquiry. Our team will discuss suitable dishes and preparation details with you before you confirm anything.</p></details>
          <details><summary>How is catering priced?</summary><p>Your menu, portions, guest count and service requirements determine the quote. Regular restaurant prices are a reference only; the team confirms catering pricing separately.</p></details>
          <details><summary>Does submitting an enquiry confirm my order?</summary><p>No. Your enquiry shares your preferences with our team. Menu availability, pricing, pickup or delivery arrangements and confirmation are agreed directly with the restaurant. This app does not collect payment.</p></details>
        </div>
      </section>
      <section className="wrap contact-section" id="contact">
        <div className="contact-copy"><span className="eyebrow">LET&apos;S PLAN YOUR EVENT MENU</span>        <h2>Talk with<br />AAHAA team.</h2><p>Need help choosing quantities, planning a custom menu or arranging a large event? Send us your catering requirements.</p><span className="contact-promise"><CheckCircle2 size={17} /> Personal help with your event menu</span></div>
        <div className="contact-card">
          <a className="contact-row" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}><span className="contact-row-icon"><Phone size={19} /></span><span><small>Catering enquiries</small><strong>{contact.phone}</strong></span><ArrowRight className="contact-row-arrow" size={18} /></a>
          <a className="contact-row" href={`mailto:${contact.email}`}><span className="contact-row-icon"><Mail size={19} /></span><span><small>Email the manager</small><strong>{contact.email}</strong></span><ArrowRight className="contact-row-arrow" size={18} /></a>
          <a className="contact-row" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`} target="_blank" rel="noreferrer"><span className="contact-row-icon"><MapPin size={19} /></span><span><small>{settings?.pickup_enabled ? "Catering pickup location" : "Kitchen address"}</small><strong>{contact.address}</strong></span><ExternalLink className="contact-row-arrow" size={18} /></a>
          <div className="contact-hours"><span className="contact-row-icon"><Clock3 size={19} /></span><div className="contact-hours-content"><small>Restaurant hours</small><ul>{contact.hours.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div></div>
          <p className="contact-kitchen-note">Kitchen closes 15 minutes before closing. For another way to reach us, call <a href="tel:+18477778122">{restaurantInfo.secondaryPhone}</a>.</p>
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
  const [requestSubstitution, setRequestSubstitution] = useState(Boolean(line?.substitution_request));
  const [substitution, setSubstitution] = useState(line?.substitution_request ?? "");
  const [error, setError] = useState("");
  const needsManagerReview = item.options.some(group => group.choices.some(choice => choice.requires_quote && selections[group.id]?.includes(choice.id)));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (requestSubstitution && !substitution.trim()) { setError("Describe the default item and your preferred replacement."); return; }
    const savedSelections = item.is_custom_menu ? Object.fromEntries(Object.entries(selections).map(([id, selected]) => [id, selected.filter(Boolean)])) : selections;
    const next = { line_id: line?.line_id ?? crypto.randomUUID(), item_id: item.id, quantity, selections: savedSelections, notes, ...(requestSubstitution ? { substitution_request: substitution.trim() } : {}) };
    try { priceCart([next], [item]); onSave(next); }
    catch (error) { setError(error instanceof Error ? error.message : "Please check your selections."); }
  }
  return <form onSubmit={submit} className="customizer"><span className="eyebrow">{item.category}</span><h2 id="item-dialog-title">{item.name}</h2><p><strong>{item.price_minor === null ? "Price on request" : money(item.price_minor, currency)}</strong> per {item.unit}</p><PackageDescription description={item.description} />{item.is_custom_menu ? <p className="custom-menu-note">Choose at least one dish below. Skip any category you do not need. Quantity counts complete custom menus, not guests or trays; tell us your portions in Special instructions or discuss them with our team.</p> : item.kind === "package" && <p>Quantity is the number of complete packages, not the number of guests. Include requested appetizer and entr&eacute;e names in Special instructions; our team confirms dish availability.</p>}{item.allergens.length > 0 && <p className="notice compact">Contains: {item.allergens.join(", ")}. Discuss allergy requirements with our team.</p>}
    <div className="field"><label htmlFor="item-quantity">Quantity ({item.unit})</label><div className="quantity-control"><button type="button" className="icon-button" aria-label="Decrease quantity" disabled={quantity <= item.minimum_quantity} onClick={() => setQuantity(q => Math.max(item.minimum_quantity, q - item.quantity_step))}><Minus size={16} /></button><input id="item-quantity" required type="number" min={item.minimum_quantity} step={item.quantity_step} max={10000} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /><button type="button" className="icon-button" aria-label="Increase quantity" disabled={quantity + item.quantity_step > 10000} onClick={() => setQuantity(q => q + item.quantity_step)}><Plus size={16} /></button></div><small>Minimum {item.minimum_quantity}. Add in increments of {item.quantity_step}.</small></div>
    {item.options.map(group => <fieldset className="option-group" key={group.id}><legend>{group.name} <small>Choose {group.min === group.max ? group.min : `${group.min}-${group.max}`}</small></legend>{item.is_custom_menu ? <div className="custom-category-choices">{Array.from({ length: group.max }, (_, index) => {
      const selected = selections[group.id] ?? [];
      return <label className="field" key={index}>{group.name} - choice {index + 1}<select value={selected[index] ?? ""} onChange={e => {
        const next = [...selected];
        next[index] = e.target.value;
        setSelections(previous => ({ ...previous, [group.id]: next }));
      }}><option value="">No selection</option>{group.choices.map(choice => <option key={choice.id} value={choice.id} disabled={selected.includes(choice.id) && selected[index] !== choice.id}>{choice.label}{item.price_minor !== null && choice.price_minor ? ` (+${money(choice.price_minor, currency)})` : ""}</option>)}</select></label>;
    })}</div> : group.choices.map(choice => <label className="option-choice" key={choice.id}><input type="checkbox" checked={(selections[group.id] ?? []).includes(choice.id)} onChange={e => { const previous = selections[group.id] ?? []; setSelections({ ...selections, [group.id]: e.target.checked ? (group.max === 1 ? [choice.id] : [...previous, choice.id]) : previous.filter(id => id !== choice.id) }); }} /><span>{choice.label}</span><small>{choice.requires_quote ? "Quote required" : choice.price_minor ? `+${money(choice.price_minor, currency)} / ${item.unit}` : "Included"}</small></label>)}</fieldset>)}
    {needsManagerReview && <p className="notice compact" role="status">Customized choices need manager review. Describe your preferred dishes in Special instructions below. The package price is a base estimate only; availability and any price increase or decrease require a manager quote.</p>}
    {item.kind === "package" && !item.is_custom_menu && <section className="option-group"><h3>Prefer something different?</h3><label className="checkbox-field"><input type="checkbox" checked={requestSubstitution} onChange={e => setRequestSubstitution(e.target.checked)} /><span>Request substitutions to the included menu</span></label>{requestSubstitution && <><label className="field">Requested substitutions<textarea required maxLength={500} value={substitution} onChange={e => setSubstitution(e.target.value)} placeholder="Example: replace the included rice with your preferred dish. Include what to remove, what to add and the quantity." /></label><p className="small-note">The published price is for the original package. Substitutions may increase or decrease the price; no automatic charge or discount is applied. Availability, swap limits and the revised quote must be confirmed by the manager.</p></>}</section>}
    <label className="field">Special instructions<textarea maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything you would like our kitchen to know?" /><small>Custom requests may affect pricing and require staff review.</small></label>{error && <p className="error" role="alert">{error}</p>}<button className="button full" type="submit">{line ? "Update selection" : "Add to your gathering"} <Plus size={18} /></button>
  </form>;
}

function RequestForm({ settings, cart, customer, fields, quick, onQuick, submission, canSubmit, onFields, onSubmission, onSuccess }: { settings: BusinessSettings; cart: CartLine[]; customer: Customer | null; fields: EventDraft; quick: boolean; onQuick: (quick: boolean) => void; submission: { key: string; fingerprint: string } | null; canSubmit: boolean; onFields: (fields: EventDraft) => void; onSubmission: (submission: { key: string; fingerprint: string }) => void; onSuccess: (receipt: Receipt) => void }) {
  const fulfillment = fields.fulfillment ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const key = useRef<string | null>(submission?.key ?? null);
  const fingerprint = useRef(submission?.fingerprint ?? "");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!canSubmit) { setError("Sending is unavailable. Review your cart or contact the manager; your draft is saved."); return; }
    const values = new FormData(e.currentTarget);
    const fields = Object.fromEntries(values);
    const candidate = {
      ...fields, guests: fields.guests ? Number(fields.guests) : null, fulfillment, customer_mode: customer ? "account" : "guest",
      address: String(fields.address ?? ""), whatsapp_consent: values.has("whatsapp_consent"),
      privacy_accepted: values.has("privacy_accepted"), delivery_area_acknowledged: values.has("delivery_area_acknowledged"),
      website: String(fields.website ?? ""), items: cart,
    };
    const nextFingerprint = JSON.stringify(candidate);
    if (!key.current || fingerprint.current !== nextFingerprint) {
      key.current = crypto.randomUUID(); fingerprint.current = nextFingerprint;
      onSubmission({ key: key.current, fingerprint: nextFingerprint });
    }
    const parsed = requestSchema.safeParse({ ...candidate, captcha_token: captcha, idempotency_key: key.current });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(" ")); return; }
    try { validateEvent(parsed.data, settings); }
    catch (error) { setError(error instanceof Error ? error.message : "Check your event details."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result: { reference?: string; error?: string; items?: PricedLine[]; currency?: string; knownSubtotal?: number; hasUnpriced?: boolean } = await response.json();
      if (!response.ok || !result.reference || !result.items || !result.currency || result.knownSubtotal === undefined || result.hasUnpriced === undefined) throw new Error(result.error || "Your request could not be confirmed. Please retry with the same details.");
      onSuccess({ reference: result.reference, name: parsed.data.customer_name, date: parsed.data.event_date, time: parsed.data.event_time, guests: parsed.data.guests, fulfillment: parsed.data.fulfillment, emailProvided: Boolean(parsed.data.email), chatWarning: response.headers.get("X-Chat-Link-Warning") ?? undefined, address: parsed.data.address, notes: parsed.data.notes, allergies: parsed.data.allergies, items: result.items, currency: result.currency, knownSubtotal: result.knownSubtotal, hasUnpriced: result.hasUnpriced });
      setTimeout(() => document.getElementById("receipt")?.scrollIntoView({ behavior: "smooth" }), 20);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection interrupted. Please try again with the same details.");
      setCaptcha(""); setCaptchaKey(k => k + 1);
    } finally { setBusy(false); }
  }
  function saveFields(form: HTMLFormElement) {
    const saved = eventDraftSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!saved.success) {
      setError("Some event details are too long to save. Shorten the values before leaving this page.");
      return;
    }
    onFields(saved.data);
  }
  return <section className="request-section panel" id="request"><span className="eyebrow">YOUR CATERING REQUIREMENTS</span><h2>{quick ? "Send your menu to our team." : "Tell us about your event."}</h2><p>Only your name and mobile number are required, plus privacy consent. Add event details if you know them, or send your menu now and our manager will follow up. No payment is needed.</p><form onSubmit={submit} onChange={e => saveFields(e.currentTarget)}><fieldset disabled={busy} className="plain-fieldset"><div className="form-grid">
    <label className="field">Full name *<input name="customer_name" autoComplete="name" defaultValue={fields.customer_name ?? customer?.full_name} required minLength={2} maxLength={120} /></label>
    <label className="field">Email address (optional)<input name="email" type="email" autoComplete="email" defaultValue={customer?.email ?? fields.email} readOnly={!!customer} maxLength={254} /><small>{customer ? "Your verified account email." : "Add an email if you would like a copy of your request."}</small></label>
    <label className="field">Phone number *<input name="phone" type="tel" autoComplete="tel" defaultValue={fields.phone ?? customer?.phone} placeholder="+12125551234" pattern="\+[1-9][0-9]{7,14}" maxLength={40} required /><small>Include your country code.</small></label>
    <label className="field">Preferred contact<select name="preferred_contact" defaultValue={fields.preferred_contact ?? "phone"}><option value="phone">Phone call</option><option value="email">Email (address needed)</option>{settings.whatsapp && <option value="whatsapp">WhatsApp</option>}</select></label>
  </div><details className="optional-event-details" open={!quick} onInvalidCapture={() => onQuick(false)}><summary onClick={e => { e.preventDefault(); onQuick(!quick); }}>Event details (optional)</summary><p>You can leave all of these blank. Any details already entered below will be included with your request.</p><div className="form-grid">
    <label className="field">Occasion (optional)<select name="event_type" defaultValue={fields.event_type ?? ""}><option value="">Not decided yet</option><option>Family celebration</option><option>Office / corporate event</option><option>Wedding / reception</option><option>Community gathering</option><option>Other occasion</option></select></label>
    <label className="field">Number of guests (optional)<input name="guests" type="number" defaultValue={fields.guests} min={settings.min_guests} max={settings.max_guests} /><small>{settings.min_guests}-{settings.max_guests} guests if known. Contact us for other group sizes.</small></label>
    <label className="field">Event date (optional)<input name="event_date" type="date" defaultValue={fields.event_date} /><small>At least {settings.lead_hours} hours&apos; notice when choosing a date.</small></label>
    <label className="field">Event time (optional)<input name="event_time" type="time" defaultValue={fields.event_time} /><small>All times are in {settings.timezone}.</small></label>
    <label className="field">Service (optional)<select name="fulfillment" value={fulfillment} onChange={e => onFields({ fulfillment: e.target.value === "delivery" ? "delivery" : e.target.value === "pickup" ? "pickup" : "" })}><option value="">Discuss with the team</option>{settings.pickup_enabled && <option value="pickup">Pickup</option>}{settings.delivery_enabled && <option value="delivery">Delivery</option>}</select></label>
    {fulfillment === "delivery" ? <label className="field">Delivery address (optional)<textarea name="address" defaultValue={fields.address} maxLength={500} autoComplete="street-address" /></label> : fulfillment === "pickup" && <div className="field">Pickup location<p className="small-note">{settings.address}</p></div>}
    <label className="field">Dietary or allergy requirements<textarea name="allergies" defaultValue={fields.allergies} maxLength={1000} placeholder="Please describe any dietary or allergy requirements." /><small>Our team must review allergy requests. An allergen-free environment is not guaranteed.</small></label>
    <label className="field">Anything else we should know?<textarea name="notes" defaultValue={fields.notes} maxLength={2000} placeholder="Venue access, setup requirements, special requests..." /></label>
  </div>{fulfillment === "delivery" && <label className="checkbox-field"><input type="checkbox" name="delivery_area_acknowledged" required={Boolean(fields.address?.trim())} /><span>If providing an address, I confirm it is within the described service area: {settings.service_area}. Staff will confirm eligibility.</span></label>}</details>
  <div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
  <label className="checkbox-field"><input type="checkbox" name="privacy_accepted" required /><span>I have read the <Link className="text-link" href="/privacy" target="_blank">privacy notice</Link> and understand my details will be used to respond to this catering request. *</span></label>
  {settings.whatsapp && <label className="checkbox-field"><input type="checkbox" name="whatsapp_consent" /><span>I agree to be contacted on WhatsApp about this request. Optional; no marketing consent is implied.</span></label>}
  <p className="small-note">This submits a catering enquiry, not a confirmed food order. Our team will confirm pricing, availability and fulfillment arrangements with you.</p>
  <Turnstile key={captchaKey} onToken={setCaptcha} />
  {!canSubmit && <p className="notice" role="status">Sending is currently unavailable. Your draft is saved; review your cart or contact the manager.</p>}
  {error && <p className="error" role="alert">{error}</p>}<button className="button" type="submit" disabled={!canSubmit || busy || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)}>{busy ? "Saving your request..." : "Send catering request"} <ArrowRight size={18} /></button></fieldset></form></section>;
}

export function ItemSummary({ items, currency }: { items: PricedLine[]; currency: string }) {
  return <div className="summary-items">{items.map((item, index) => <div key={index}><div><strong>{item.quantity} &times; {item.name}</strong><small>Unit: {item.unit}</small>{item.selections.filter(g => g.choices.length).map(g => <small key={g.group}>{g.group}: {g.choices.map(c => c.label).join(", ")}</small>)}  {item.notes && <p>{item.notes}</p>}{item.substitution_request && <p><strong>Substitution request:</strong> {item.substitution_request}<br />Base package price shown. Manager quote required; adjustments may increase or decrease the price.</p>}{item.description && <details className="package-portions"><summary>Saved menu inclusions &amp; portions</summary><PackageDescription description={item.description} /></details>}</div><span>{item.total_minor === null ? "Price on request" : money(item.total_minor, currency)}</span></div>)}</div>;
}
