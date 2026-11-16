# Aahaa Indian Kitchen - Catering Requests

A real, database-backed catering enquiry application. Customers continue as guests or sign in with verified email/password accounts, customize menus, and submit event/contact details. Staff manage enquiries in a protected dashboard and receive email and optionally automated WhatsApp Business notifications.

This is a **catering-only** website using Aahaa Indian Kitchen's restaurant branding. It serves event menus and bulk food enquiries, not dine-in, table reservations or restaurant seating. Guest counts describe how many people need catering; event dates/times describe when the food is needed.

**No payment, quotation, invoice, or booking-confirmation features are included.** A request is not a confirmed order.

Customers can choose **Add event details** or **Send without event details** from the cart. Only name, mobile number, a selected menu and privacy consent are required. Email, occasion, date, time, guests and service are optional; any supplied values are still validated. Missing information is stored as SQL `NULL` and displayed as **Not provided**, not invented dates or guest counts. Staff email is always queued; a customer acknowledgment is queued only when an email address is supplied. Quick and full entry use the same persistent cart, submission endpoint and duplicate-prevention logic.

### Build your own catering menu

The catering page also offers **Build your own catering menu**, available under the final **Customized** category beside the Veg, Non-Veg and Special categories, separate from the 21 priced packages and their party-size filter. Customers choose dishes from category dropdowns: Appetizers, Entrees / Curries, Biryani, Bread and Desserts. The initial dishes are starter choices from the existing restaurant/catering menus, not a promise of availability or a fixed package. Categories can be skipped, but at least one valid dish is required. Duplicate dishes within a category are blocked. Customers can add portions, other dish preferences and dietary requirements in Special instructions; the manager confirms everything.

The starter custom menu has no published price: it displays **Price on request**, never a fabricated package price or free food. Category selections, instructions and quantity use the existing persistent mixed cart, quick/full enquiry flow, immutable menu snapshots, manager dashboard, account summaries and manager emails.

To update it later, sign in through **Admin login**, open **Menu & packages**, and edit **Build your own catering menu**. Keep **Build-your-own catering menu with category dropdowns** checked. Each option group is a category; edit Group name, Choice labels, Min choices and Max choices, or add/remove groups and dishes. Max choices sets the number of dropdowns; Min 0 makes the category optional. Keep the base price blank until you have a verified pricing structure. Unpublish or mark unavailable to stop new requests; historical enquiries retain their original choices. A custom menu must remain a catering package with at least one category. Existing fixed-price package behavior is unchanged.

Fixed Veg, Non-Veg and Special packages also have **Customized - manager review** as the last choice in every existing food-selection group. It replaces that group's default selection, rather than adding free dishes. Customers describe preferences in Special instructions. The server reads the saved choice's `requires_quote` flag and derives a substitution-review snapshot automatically, retaining the published base price but marking it **Base estimate; substitutions need a manager quote** in the cart, receipt, manager/account summaries and emails. No automatic surcharge/discount or finalized custom price is invented. Staff can edit a choice's **Manager quote required** checkbox in the menu editor; ordinary included choices and existing requests remain unchanged.

## Customer chat and admin workspace

- **Chat with AAHAA** sits at the bottom of public pages. Guests and verified customers can ask questions before selecting a menu, or discuss an existing enquiry. Starting chat requires name, international-format mobile, an initial message and privacy consent. Phone numbers are customer-provided, not OTP verified.
- Chats and messages are stored in Supabase, with automatic updates every five seconds while the conversation is visible. There is no fabricated online/instant-response indicator; staff reply when available. Dashboard unread badges refresh every 15 seconds. This is lightweight live messaging using polling, not a WebSocket/Realtime subscription.
- **Admin login** appears in the storefront header and opens `/manager/login`. Only Supabase users explicitly added to `staff_members` may enter. Customer signup never grants staff access. First owner creation is intentionally deferred; follow the owner setup below when ready. There are no hard-coded/default admin credentials.
- `/manager/chats` provides an inbox, unread indicators, name/mobile filtering of loaded conversations, older-conversation pagination, full message history, replies and close/reopen controls. A new message reopens a closed conversation. Staff must keep the dashboard open to see incoming updates; chat does not currently send email, push or WhatsApp alerts. Enquiry notification emails remain separate.
- Sending an enquiry from a chat browser links the exact persisted request automatically. Starting chat after submission uses a signed, seven-day browser receipt, never an enquiry number alone. Verified customers can resume chat from their own `/account/requests/[id]` page. Managers see linked enquiries in chat and the conversation on the request detail page alongside contact/event details, immutable menu snapshots, substitutions, status, delivery logs and private team notes.
- Guests resume using a private HTTP-only, SameSite cookie lasting up to seven days. Only its SHA-256 hash is stored in the database. Account-owned chats also require the matching verified user. Guests cannot resume from another browser or after losing the cookie; there is no phone-number/reference-only lookup. Signing out clears chat cookies. Chats started as guests are not silently reassigned to accounts.
- Public chat and staff APIs enforce separate authorization, origin checks, length limits, server-selected sender identity and idempotent message IDs. New chats require Turnstile (`customer-chat` action), except the existing development-only local bypass. RLS and revoked anon/authenticated grants prohibit direct table/RPC access; all chat reads and writes pass through authorized server endpoints. Keep `RATE_LIMIT_SECRET` stable: rotating it invalidates guest retry derivations and signed enquiry receipts.
- Staff already manage package/dish prices, options, customization choices, availability and publication under **Menu & packages**; owner-only **Business settings** controls contact details, service rules and notification recipients. Editing current menu prices does not rewrite previously submitted snapshots. Payments/invoices remain out of scope.

## Current integration status

- The supplied Supabase project URL is configured locally: `https://khymrdteeedsrcbrbmul.supabase.co`.
- The restaurant logo is the asset supplied through [the existing Aahaa menu website](https://aahaamenumanager.netlify.app/). Its saffron/vermilion palette informs this application's theme.
- The current official restaurant menu is imported into Supabase (205 items across 16 categories, including 116 restaurant photos). Its prices remain reference-only and do not price catering packages.
- The supplied Catering Pricing PDF provides 21 priced catering packages: Veg, Non-Veg and Aahaa Special for seven party sizes from 20 to 75-80 guests. These are stored in Supabase, separately from regular restaurant dishes. Prices are USD per whole package, not per person.
- Package descriptions display as inclusion lists, aligned approximate-portion tables, bread alternatives and separate restrictions in browsing, customization, saved summaries and emails. The shared formatter preserves the original description snapshots, prices and source quantities; free-form descriptions remain readable text.
- `/catering-menu` supports package browsing, party-size filtering, included option choices, dish preferences and the request cart. `/menu` retains the separate restaurant inspiration menu. Both share a tab-scoped draft: mixed-menu selections, event/contact details, filters and retry keys survive navigation, login-page visits and refreshes. Successful references and menu snapshots remain available until starting a new request. Draft storage failures and unavailable selections are shown explicitly; prices are always revalidated server-side.
- Hosted migrations `202611130001` through `202611130006` and `202611160001` through `202611160003` are applied and verified. The published menu is readable through the public API; private chat tables are not.
- Public contact details, restaurant hours, cuisine and nearby service communities are based on the restaurant's official website. Catering delivery and availability remain subject to event confirmation.
- The storefront uses locally hosted images from the [official catering page](https://aahaaindiankitchen.com/catering), verified on November 16, 2026: `catering-banner.f8f972e0.webp`, `catering-panneer.ff45c58d.webp`, and `catering-halwa.aa7963f2.webp`, saved in `public/` with descriptive Aahaa filenames. The previous generated hero is no longer displayed.
- The official page's copper/cream palette, Montserrat text and Gwendolyn accent inform the refreshed design. Fonts are self-hosted with `next/font/local`; SIL Open Font License notices are included in `public/fonts/`. Headings use a local serif stack. Logo shine and entrance motion respect reduced-motion preferences.
- The shared footer includes restaurant hours, both public phone numbers, directions, social links, restaurant terms and dietary guidance. Configured primary contact details and hours take precedence over verified public defaults in `src/lib/restaurant-info.ts`. Public contact defaults do not enable account creation or online submissions.
- Local development enquiries are enabled with the configured test manager recipient. A labelled end-to-end test verified persistence and Resend's Delivered status for both staff and customer emails. Public production submissions still require CAPTCHA, a verified sender domain, and a working retry scheduler.
- A separate labelled contact-only test verified real guest-chat persistence, automatic display of a server-generated test staff reply, refresh recovery, exact enquiry linking, SQL NULL optional fields, rejection of another browser and delivered manager email without a customer email job. Authenticated owner/manager login acceptance remains deferred until the first staff account is created; tests do not create an owner account.
- Local Resend test email delivery is verified using the provider's restricted test sender. Public delivery still requires a verified sender domain; WhatsApp remains disabled.
- Local customer account forms are enabled for all email addresses with `CUSTOMER_AUTH_ENABLED=true`. Email confirmation remains required; the default Supabase mail service can restrict recipients until custom SMTP is configured. This is not a verified public account launch. Production still requires CAPTCHA and verified Auth email delivery. Guest enquiry availability is independent of this flag.

## VS Code Supabase MCP

[.vscode/mcp.json](.vscode/mcp.json) contains the supplied project-scoped Supabase MCP configuration. In VS Code, run **MCP: List Servers**, select **supabase**, then **Start**, and complete the Supabase authorization prompt.

This configuration permits database writes after authorization; inspect existing tables before applying migrations. It does not contain credentials, authorize itself, apply migrations, or replace the application's environment variables. Optional Supabase agent skills are not installed.

## Local development

Requires Node.js 22.12+ and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The application is browsable without credentials, but does not accept requests or offer staff login until services are configured.

Configuration belongs in `.env.local` (ignored by Git); see [.env.example](.env.example). Never paste server keys into chat, commit them, or prefix them with `NEXT_PUBLIC_`.

### 1. Connect Supabase

In your project dashboard:

1. Find the publishable key (or legacy anon key) under project API keys. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Set the server-side secret key (or legacy service-role key) in `SUPABASE_SERVICE_ROLE_KEY`. Rotate any key previously shared in chat before publishing.
3. Apply these migrations, in order, using Supabase SQL Editor or Supabase CLI:
   - [Initial schema](supabase/migrations/202611130001_initial.sql)
   - [Settings and email delivery](supabase/migrations/202611130002_settings_and_delivery.sql)
   - [Verified customer accounts](supabase/migrations/202611130003_customer_accounts.sql)
   - [WhatsApp notifications](supabase/migrations/202611130004_whatsapp_notifications.sql)
   - [Historical menu import](supabase/migrations/202611130005_reference_menu.sql)
   - [Current official restaurant menu](supabase/migrations/202611130006_official_menu.sql)
   - [Priced catering packages and menu separation](supabase/migrations/202611160001_catering_packages.sql)
   - [Contact-first enquiries with optional event details](supabase/migrations/202611160002_optional_event_details.sql)
   - [Private customer chat and linked enquiries](supabase/migrations/202611160003_customer_chat.sql)
   - [Editable custom catering menu and starter categories](supabase/migrations/202611160004_custom_catering_menu.sql)
   - [Manager-reviewed customized choices inside fixed packages](supabase/migrations/202611160005_package_customized_choices.sql)
4. Do not apply them blindly over conflicting existing tables. They create application-specific tables, functions, RLS policies, and a public `menu-images` bucket.
5. Enable email/password signups and require email confirmation in Supabase Auth. Customer accounts never receive staff permissions.
6. Create the first staff user in Supabase Auth with an email and a strong password. Copy its user UUID.
7. As a database administrator, grant the owner role:

```sql
insert into public.staff_members (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'owner');
```

Additional staff use role `manager`. Role assignment is deliberately not exposed to public signup. Revoke access by deleting the membership and disabling the Auth account as appropriate. To reset a password, use the Supabase administrator workflow; do not email plaintext passwords.

The migration inserts one **paused** business configuration record, not fictional operational data. Confirm its currency and timezone before adding menus.

#### Supabase CLI alternative

Local CLI configuration is initialized in [supabase/config.toml](supabase/config.toml). It disables sample seeding and enables email signup for local development; it does not change hosted Auth settings automatically.

The CLI is available through `npx`; a global `supabase` installation is not required. Run these in your own interactive VS Code terminal and complete the sign-in prompt:

```powershell
npx --yes supabase login
npx --yes supabase link --project-ref khymrdteeedsrcbrbmul
```

Enter credentials only in the trusted CLI/browser prompts, never in chat or command-line arguments. The publishable API key cannot authenticate the CLI. A connection string containing `[YOUR-PASSWORD]` is a placeholder, not a usable database connection.

After linking, inspect existing tables and migration history before reviewing `npx --yes supabase db push --dry-run`. Apply the pending migrations only after that review. CLI cache and branch state are ignored by Git.

#### Customer login and account email

1. Configure **custom SMTP in Supabase Auth** using a verified sender/domain. Supabase's default mail service has recipient/rate restrictions unsuitable for a public customer application.
2. Set the Auth Site URL to `APP_URL`. Allow the exact redirect URLs `https://YOUR_DOMAIN/auth/callback` and `https://YOUR_DOMAIN/auth/callback?next=/account/password`. Add localhost equivalents only for development.
3. Enable email confirmation. Configure Supabase Auth CAPTCHA with the same Turnstile site/secret keys used by the app. Customer auth forwards the CAPTCHA token to Supabase; enquiry submission verifies it separately.
4. Default Supabase confirmation links use the PKCE callback and should be opened in the browser that requested them. For cross-device email links, configure these Auth email template links:
   - Signup/confirmation: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
   - Password recovery: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
5. In staging, set `CUSTOMER_AUTH_ENABLED=true` and test signup, verification, login, resend, reset and logout with actual mail delivery. Enable production accounts only after this succeeds.

For restricted local testing, keep `CUSTOMER_AUTH_ENABLED=false`, set `CUSTOMER_AUTH_TEST_EMAIL` privately in `.env.local`, configure `RATE_LIMIT_SECRET`, and use `npm run dev` with a loopback `APP_URL` (such as `http://localhost:3000`). Only that email can use the app's signup, login, resend and reset endpoints. This option is ignored in production and with non-loopback origins. The login form shows a test-only notice. Email confirmation is still required; Supabase's default email service is restricted to eligible project-team recipients and has low sending limits. Catering Resend credentials do not configure Auth email. This is an application gate, not a change to Supabase's provider-level signup policy.

Account passwords require 12-72 characters with uppercase, lowercase and a number. Customers can save contact details and view only their own enquiries submitted while signed in. Guest enquiries are not claimed by matching email addresses. Resetting a password signs out refresh sessions globally; existing access tokens may remain usable until expiry.

**Two separate email configurations are needed:** Supabase Auth SMTP sends verification/reset emails; Resend sends catering enquiries and customer receipts. Configuring one does not automatically configure the other.

### 2. Generate local secrets

Generate independent cryptographically random values of at least 32 characters for `RATE_LIMIT_SECRET` and `CRON_SECRET`. A password manager can generate and store them. Keep these server-side.

`APP_URL` must be the exact application origin, such as `http://localhost:3000` locally or your HTTPS domain in production. Do not include a path. Preview environments require their own correct origin.

### 3. Configure email to Gmail

1. Create a Resend account and verify a domain you control.
2. Configure the DNS records Resend supplies, including SPF and DKIM; configure DMARC for your domain.
3. Put the API key in `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to a verified sender such as `Aahaa Indian Kitchen <catering@YOUR_DOMAIN>`.
5. Sign in at `/manager/login`, then open Business settings.
6. Add the actual owner/manager Gmail addresses as private notification recipients.

The app sends one message to each configured staff recipient and an acknowledgment to the customer when they supply an email address. Staff messages use the customer's email as Reply-To when available; otherwise replies go to the restaurant and the message instructs staff to call the supplied mobile number. Customer receipts have the restaurant email as Reply-To. Replies are ordinary email conversations; this version does **not** ingest replies into the dashboard.

Every email includes the reference, full customer/event details, quantities, modifiers, item notes, dietary requests, estimate, and contact details. Staff notifications link to the authenticated dashboard.

Email is the full request record delivered to managers: mobile-friendly menu table, customer name and clickable phone/email, followed by the complete request including saved package inclusions and portions. Plain-text email contains the same details. This is preferable to a separate attachment that must be downloaded and can become detached from its conversation. No customer documents are placed in public storage.

Emails use full-width menu cards with separate quantity/estimate rows, aligned option labels and readable portions rather than squeezing descriptions into a narrow table column. All critical styling is inline, with optional small-screen spacing. Set `EMAIL_LOGO_URL` to a publicly readable HTTPS PNG for mail clients that do not display CID images. The current logo is hosted in the existing public Supabase `menu-images` bucket at `branding/aahaa-email-logo-v2.png`; only this public branding asset is uploaded, never enquiry details. Without this setting, the real logo is embedded as a CID attachment using `public/aahaa-logo-email.png` (included in the worker's file trace).  The notification worker snapshots the email for consistent retries; older queued snapshots retain their original content.

**Provider accepted does not mean inbox delivered.** Check Resend's dashboard for delivery, bounces, complaints, and uncertain sends. This version does not ingest email delivery webhooks; staff can see queued/processing/accepted/failed states, attempts, and the provider message ID.

#### Automatic WhatsApp Business notifications

This uses the official Meta WhatsApp Cloud API, not browser automation or a personal WhatsApp session.

1. Configure a Meta business app, WhatsApp Business account and registered API sender. Obtain a production system-user token with the required WhatsApp messaging permissions.
2. Create and obtain approval for a template with **five positional text body parameters**, in this exact order: enquiry reference, customer name and phone, event date/time/timezone, guest count and concise menu summary, secure staff request URL. The template must not require additional header or button parameters.
3. Example template body (submit for Meta approval; this text is not preapproved):

   ```text
   A new catering enquiry needs attention. Reference: {{1}}.
   Customer: {{2}}. Event: {{3}}. Guests: {{4}}.
   Review details: {{5}}. Sign in to the catering dashboard to follow up.
   ```

4. Configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (an explicitly supported Graph version such as `v23.0`), `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_APP_SECRET` and a random `WHATSAPP_VERIFY_TOKEN`.
5. Register `https://YOUR_DOMAIN/api/webhooks/whatsapp` as the webhook callback, enter the same verification token, subscribe to `messages`, and subscribe the app to the WhatsApp Business account. POST events are verified using the Meta app secret.
6. In owner Business settings, add opted-in manager/owner numbers in international `+countrycode...` format. The API sender and recipient must be different numbers. Confirm recipient consent, then enable WhatsApp alerts. The public restaurant WhatsApp contact number is a separate setting.
7. Send a real staging enquiry and verify provider acceptance followed by a delivered/read webhook in the staff dashboard. Read receipts may be unavailable depending on recipient settings.

The WhatsApp message contains the customer name/phone, event details and requested package/item names and quantities. Long menu summaries are explicitly truncated; full menus, selections, instructions, package portions and pricing remain in email and the authenticated dashboard. Customer WhatsApp links remain manual; this integration automatically notifies opted-in **staff recipients**, not customers.

Meta does not provide Resend-style send idempotency. Explicit rate-limit responses can retry; ambiguous timeouts or interrupted sends stop with a visible failure rather than risking automatic duplicates. Staff must check Meta delivery logs before manually retrying. Webhooks are correlated to a particular send attempt, ignore stale events, and do not downgrade confirmed delivery/read status.

### 4. Run the durable notification worker

Requests and notification jobs are saved in one PostgreSQL transaction. The submission endpoint schedules an immediate delivery attempt with Next.js `after`, without delaying the saved-reference response. Delivery is not implied by saving: provider failures remain visible in the durable outbox. The scheduled worker is still required for retries, interrupted attempts and any backlog:

```powershell
# Set this variable securely in your shell; do not commit it.
Invoke-RestMethod -Uri 'http://localhost:3000/api/jobs/notifications' `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

Each invocation claims up to ten jobs, uses leased rows to avoid competing deliveries, and retries eligible transient errors with exponential backoff. Ambiguous WhatsApp sends require manual review as described above. Final failures are visible on request details. A manual retry requires staff to check provider delivery first.

[vercel.json](vercel.json) runs this endpoint every five minutes. Use a Vercel plan that supports this frequency and a 240-second function duration, or an authenticated external scheduler. **Vercel Hobby's daily cron limit is not sufficient for this configuration.** Check current hosting-plan limits before deployment. On another host, schedule the same authenticated endpoint; simply deploying Next.js is not enough.

Alert on scheduler failures and oldest pending job age. A stopped scheduler does not lose requests, but delays retries and backlog delivery if the immediate attempt does not finish. At ten jobs per invocation, increase worker frequency/capacity when recipient volume grows. Notifications are queued, not guaranteed instant; one enquiry creates a job for each recipient/channel and a customer email.

The local Resend `onboarding@resend.dev` sender can deliver only to the provider account's eligible test address. Manager test delivery can work while an arbitrary customer's receipt fails. Those failures are recorded, not silently treated as delivered. Configure a verified sender domain before inviting real customers.

Resend requests use stable idempotency keys and persisted email snapshots. Automatic retries stop after five attempts or when the safe idempotency window is exceeded. A staff-authorized retry outside that window can deliver a duplicate; the UI explicitly warns about this.

### 5. Configure spam protection

Create a Cloudflare Turnstile widget for your production domain and set:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

The server verifies the token, hostname, and action. Only local **development** may set `ALLOW_LOCAL_SUBMISSIONS=true` to bypass Turnstile. This never bypasses verification in production or `next start`.

Submissions also have a honeypot and database-backed rate limiting. On Vercel the trusted `x-vercel-forwarded-for` header identifies the network client and is hashed before storage. On another host the application intentionally uses a conservative shared-origin limit; adapt the code to that host's trusted, overwritten client-IP header before high-volume deployment. Do not trust client-supplied forwarding headers.

### 6. Configure and publish the real menu

#### Current restaurant menu used for catering enquiries

The sixth migration imports **205 current menu items in 16 categories** from the official restaurant menu at https://aahaaindiankitchen.com/indian-restaurant-menu. The [source snapshot](supabase/official-menu.json) records item names, descriptions, currently listed restaurant prices, source links, available food images, and the source-page hash. The preceding 210-item import is retained as a historical migration, but its items are hidden.

Regular restaurant prices are clearly marked as references, never catering quotes. Those items remain **NULL / price on request** for catering. Each regular item's quantity is a serving and does not imply a catering tray or guest yield. Allergens and dietary classifications are not inferred where the published menu does not provide them; ask the team about dietary needs.

#### Priced catering packages

The [source snapshot](supabase/catering-pricing.json) was visually verified against all six pages of the restaurant-supplied [original PDF](public/catering-pricing.pdf), whose SHA-256 is recorded in the snapshot. Regenerate the seventh migration with:

```powershell
node --experimental-strip-types scripts\catering-menu.ts
```

Apply [the catering migration](supabase/migrations/202611160001_catering_packages.sql) before running code that queries `menu_type`. Existing menu rows are classified as regular; the new packages use `menu_type=catering`. The import uses stable IDs and does not overwrite existing rows or manager edits. Staff can choose either customer menu in the menu editor.

The seven package sizes are 20, 25-30, 35-40, 45-50, 55-60, 65-70 and 75-80 guests. There is no invented price for gaps between ranges. Quantity means number of complete packages. Included biryani, rice, curry, bread and dessert choices do not add a surcharge. Appetizer/entree dish names go in special instructions and require manager confirmation; paneer is limited to one entree by the source policy. Tray sizes are approximate.
Customers can explicitly request package substitutions in the customizer. These are stored separately from kitchen notes in immutable request items and shown in the cart, customer/staff views and both email formats. The original included choices remain the baseline, not an accepted replacement. With no owner-approved substitution rates yet, totals remain **base estimates**, `has_unpriced_items` is true, and the manager must confirm availability, swap limits and the revised quote (which may increase or decrease). No automatic surcharges or discounts are invented. Staff option extras still use their configured prices; signed substitution rates are not yet enabled.

The source Special package lists three entrees but provides only two entree portion rows. The app explicitly flags the third portion for manager clarification rather than inventing it. Package descriptions and portions are captured in new request snapshots, email and the protected manager/customer detail views, so subsequent menu edits do not rewrite the enquiry.

The migration does not open submissions or change notification recipients. Deterministic IDs and `ON CONFLICT DO NOTHING` preserve staff edits on reapplication. Do not rerun imports to undo menu edits.

To reproduce the migration from the saved official snapshot:

```powershell
npm run menu:official-prepare
```

For an initial download from the public site, run:

```powershell
npm run menu:official-fetch
```

The generator reads the page's JSON-LD menu data and matching image alt text; it never executes remote scripts. If the source differs from an already generated migration, it stops without overwriting files. Review future menu changes in a new migration or the staff editor. This script generates files locally; it does **not** deploy SQL or create fake database fallback data.

#### Business settings

Business settings are owner-only. Confirm:

- Restaurant name, public contact information, pickup address, and hours.
- Correct ISO currency and IANA timezone.
- Booking notice period and guest-count bounds.
- Pickup/delivery options and service-area description.
- Real notification recipients.
- A privacy notice reviewed for your location, including providers, retention, contact, and customer rights.

Currency cannot change after menu items exist, to prevent accidental reinterpretation of stored prices. A currency change then requires an intentional administrator-led price migration.

Use Menu & packages to add real items:

- Price by tray, person, piece, or package; blank price means **price on request**.
- Minimum quantity and increments.
- Dietary labels and known allergens.
- Option groups with required/optional choices and per-unit price adjustments.
- Real menu images (JPEG, PNG, WebP; maximum 5 MB).
- Draft/published and available/unavailable flags.

Packages are menu items with included selections represented by option groups. Describe servings and inclusions accurately. This version does not automatically calculate portions from guest count or silently substitute dishes.

Delivery areas are described and acknowledged by customers; staff confirms actual eligibility. There is no geocoding, delivery-charge calculation, or capacity reservation.

After setup, enable **Open online catering requests**. Confirm the scheduler is working first.

## Deployment

### Netlify

1. Push the repository to GitHub and import it in Netlify. [netlify.toml](netlify.toml) sets Node.js 22, `npm run build`, and the `.next` output directory. Leave the base directory at the repository root and allow Netlify to install its current Next.js adapter automatically. Do not select `out` or add an SPA catch-all redirect: this application requires server-rendered pages, API routes and private cookies, not static hosting.
2. Set production environment variables in the Netlify site dashboard. Keep server secrets out of `NEXT_PUBLIC_*` variables and Git. Use separate staging services and credentials for deploy previews; restrict preview access if they can reach non-public data.
3. Set `APP_URL` to the exact HTTPS production origin. Add that origin to Supabase Auth's Site URL and callback allowlist, and add the production hostname to Turnstile. Configure the corresponding staging URLs and hostnames separately for previews.
4. Confirm the deployed responses use HTTPS and the security headers configured in `next.config.ts`. Recheck them after changing the hosting adapter or response configuration.
5. Apply migrations to the target Supabase project and complete the Auth, email, CAPTCHA, business settings, and notification setup described above.
6. Configure an authenticated external scheduler for `/api/jobs/notifications`; `vercel.json` does not schedule jobs on Netlify. Check the site's function execution limits against notification batch processing: the Next.js `maxDuration` export does not configure Netlify's hosting limits. Use a Netlify-compatible trusted client-IP strategy before relying on IP-based rate limiting at scale.
7. Run the live acceptance checklist below before announcing the site.

Do not reuse production credentials in tests or untrusted previews. Menus and settings are read dynamically; no fabricated fallback catalog is served on database errors. A successful build or dependency audit does not replace the live acceptance checklist.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

### Mobile browser checks

The existing Playwright dependency provides Chromium (Android-style touch emulation) and WebKit (iPhone-style touch emulation) regression checks:

```powershell
npx playwright install chromium webkit
npm run build
npm run test:browser
```

The runner starts and stops a local production preview on port 3102 with submission/chat spam verification intentionally unconfigured, so it cannot send live enquiries or start chats. The tests cover the home page, both menu routes, login and privacy at widths from 320 to 1440 pixels, including landscape. They check overflow, content alignment, touch controls, readable phone form inputs, guest navigation, customization dialog sizing, quick/full form persistence, optional-field validation, bottom chat sizing/unavailable state, protected admin navigation, reduced motion and unrestricted zoom. Customization checks explicitly skip if no published menu is configured. Separate mocked component/API and PGlite tests cover chat creation, replies, duplicate-safe retries, unread state, privacy boundaries, receipt ownership and request links.

Phone inputs use 16px text to avoid Safari focus zoom. Dialogs use dynamic viewport height with a `vh` fallback; layout padding respects safe-area insets, and CAPTCHA uses its compact size to fit narrow forms. A device's actual keyboard, notches, OS text scaling and older browser versions still need real-device acceptance checks; browser-engine emulation is not a guarantee for every Android/iOS version.

Tests use isolated fixtures, mocked external services, and PGlite (actual PostgreSQL compiled to WASM) to execute the production migrations and verify transaction, RLS, idempotency, leasing, and staff status behavior. The `auth` and `storage` platform shells are supplied by tests; these are **not** a substitute for testing real Supabase Auth/Storage.

UI tests exercise selection, customization, form submission, failed-submit recovery and confirmation. Account tests verify authentication, ownership and redirect restrictions. Notification tests verify payload completeness, HTML escaping, idempotency headers, snapshot reuse, signed WhatsApp webhooks and failure/retry behavior. They do not send real email or WhatsApp messages.

### Live acceptance checklist

- [ ] Rotate exposed server credentials and apply all seven migrations to the supplied Supabase project.
- [ ] Staff login works; unauthorized users cannot read request data.
- [ ] Real customer signup verification and password-reset emails arrive; login/logout work.
- [ ] Customer A cannot read Customer B's enquiries, staff notes or notification jobs.
- [ ] Guest submissions need no account; account submissions appear only in that customer's history.
- [ ] Real business details, policies, timezone, prices and menu are confirmed.
- [ ] Submit from a phone with customized items and event details.
- [ ] Verify the exact details and reference in the staff dashboard and database.
- [ ] Repeat the same submission after a simulated interrupted response; verify no duplicates.
- [ ] Invoke/schedule the worker; verify actual owner Gmail receipt and customer acknowledgment.
- [ ] Verify an opted-in manager receives the approved WhatsApp template with the matching reference and secure request link.
- [ ] Verify signed WhatsApp delivered/read events update the correct attempt; invalid signatures cannot change status.
- [ ] Reply to the staff email and verify the reply addresses the customer.
- [ ] Verify a failed delivery remains visible without losing the enquiry.
- [ ] Check Supabase RLS and Storage against real anonymous/non-staff/staff sessions.
- [ ] Confirm Turnstile rejects invalid tokens on the deployed domain.
- [ ] Verify the cron schedule, logs, and queue-age alert.
- [ ] Test database backup restoration into a non-production project.
- [ ] Configure privacy retention/deletion procedures and operational support.

## Operations and privacy

- The dashboard is the source of truth; email and WhatsApp are notification channels. The staff request list refreshes every 30 seconds while visible.
- Reference numbers are identifiers, not authentication credentials. There is no public request lookup by number.
- Guest receipts are shown only to the submitting browser. Verified customers can revisit only their own account enquiries; request URLs alone grant no access.
- Requests store immutable JSON item/modifier snapshots, so editing the menu never rewrites historical requirements.
- Follow-up statuses are New, Contacted and Closed. Status changes use version checks and append-only history.
- Internal notes are not emailed to customers.
- No card details, payments, or marketing subscriptions are collected.
- Uploaded menu photos are public. Never upload customer documents or private images to that bucket.
- Photos removed from an item remain in storage. Administrators should periodically remove confirmed unreferenced assets.
- Use Supabase backups/PITR appropriate to your plan. Also back up menu image objects; database backups alone do not restore object contents.
- Set a retention policy before launch. A restricted administrator must handle deletion/export requests across Supabase Auth, profiles, requests, notes, notification snapshots and email/WhatsApp providers; no arbitrary retention period is hardcoded. Deleting an Auth account unlinks its historical enquiries rather than automatically deleting business records.
- Apply least privilege to staff, use strong unique passwords, and monitor login events. App-enforced staff MFA is not implemented in this MVP.
- Montserrat and Gwendolyn are served locally with their open-font licenses; visiting the app does not fetch fonts from Google. External maps, social and restaurant links only open when selected.

## Not included

Payments, invoicing, formal quotations, automatic booking confirmation, unauthenticated public tracking, inbound email/WhatsApp conversation synchronization, SMS, capacity planning and delivery tracking. They are intentionally outside this version's scope.
