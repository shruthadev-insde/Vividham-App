# Vividham — Costume Counter App (concept build v2)

A tablet-first web app for Vividham – The Costume Wardrobe, Kudroli, Mangalore. It combines:

- **A rental-catalogue wardrobe:** consistent studio mockups made by Codex.
- **The counter workflow agreed in the meeting:** Return → Check → **Add fine** or **2-day reminder**.
- **A symbol-first interface:** line pictograms, motion and EN / ಕನ್ನಡ labels, so staff who don't read English can follow the flow.

## Run it

```
node render-engine/server.mjs        # from the project folder → http://localhost:5317 (+ tablet URL printed)
```

The studio server serves the app and lets **More → Render studio → Add a garment** send photos to Codex. Double-clicking `index.html` also works, but without the studio connection: new garments then download a job file for `render-engine/inbox/`.

## What's new in v2

| Area | What it does |
|---|---|
| **Render engine** (`render-engine/`) | `style.md` holds the "Studio Wardrobe" rules (2:3, #ECE8E3 backdrop, 70 mm full-length, fixed light and margins, garment fidelity). `prompt-template.json` + `render.mjs` turn a phone photo plus basic info into a prompt, run `codex exec` with image generation, collect the PNG, convert it to WebP and register it in `data/renders.js`. 32 colourways are already rendered. |
| **Inventory** (`tools/inventory-source.mjs` → `data/inventory.json`, `docs/inventory.md/.csv`) | 64 costumes (86 colourways) and 32 accessories across 11 categories taken from the Instagram highlights. Each item has keywords, occasions, pieces per set (with lost-piece charges and pictograms), size guide, scene theme and render-prompt fields. Items not seen on Instagram are marked **Est.** |
| **Pairing engine** (`js/recommend.js`) | *Complete the look*: accessories scored by category, story tags and colour harmony, skipping pieces already in the set. *Make it a scene*: Krishna ↔ Radha, Ramayana, Shiva parivar and so on. *Shop by occasion*. *Often forgotten* in the bag, with one-tap quantities. Every suggestion shows "why" chips. |
| **Symbol-first UI** (`js/art.js`, `js/i18n.js`) | About 75 monoline pictograms (pieces, categories, events, flow steps). Every order carries a *journey line*: booked → handed over → back → clean, branching to bell or ₹. Missing pieces appear as icons with counts. A full Kannada toggle is included (draft: have a native speaker review it). |
| **Motion** | Splash screen (a dancer draws herself while a needle stitches the loading thread). Page cross-fades via the View Transitions API. Celebrations (returned confetti, ringing reminder bell, coin flip for a fine, bag hand-over). Swinging-hanger and studio-flash loaders, plus a one-time tap-gesture hint. Reduced-motion settings are respected. |
| **Prompt library** (`design/prompts/*.json`) | A shared style and motion spec, 74 pictograms, 10 scenes, 6 celebrations, 4 loaders and transitions, 2 brand assets, and 376 catalogue-mockup prompts. Regenerate with `node tools/build-prompts.mjs`. |

## v3 counter operations (Tier 1 & 2)

| Feature | Where | Notes |
|---|---|---|
| **Customer ID & trust score** | Bag, hand-over, order page, More → Customers | Face and ID photo, ID type and last 4 digits. The score (0–100) is built from on-time, late, partial and written-off returns. *Watch* customers get the deposit ×1.5; *Risky* ones get ×2 and need the owner PIN. With "ID required" on, hand-over is blocked without photos unless the owner PIN is entered. |
| **Photo check-out / check-in** | Hand-over and Return screens | A packed-bag photo and a returned-items photo, shown side by side on the order page. Photos stay on the tablet in IndexedDB (not included in the JSON backup). |
| **UPI deposits & refunds** | Hand-over (collect), order page (refund) | Shows a UPI QR for the exact amount to the shop's UPI ID (set in Settings), with "Received by UPI / Cash" and the UTR. Refund opens the tablet's UPI app with the customer's UPI ID and amount filled in; staff confirm with their PIN. Everything lands in a payments ledger. |
| **WhatsApp auto-queue** | Today and Reminders | Daily messages: pickup tomorrow, due tomorrow, due today, overdue, 2-day reminder. Each goes once per day. Without an API connection, "Start sending" steps through them in WhatsApp. With an API connection, "Send all" or auto-send at 9:30 AM. |
| **School orders by student list** | Bag → Student list; Return screen; order page | Paste "name, age, class" lines. Sizes come from the size guide, children are spread across costume lines, and each gets a child bag label with a QR code. On return, tap each child: ✓ back, ⌛ not back, or 🪡 pieces missing, so missing items are traced to a child. |
| **Fitting & alterations** | Order page → Add alteration | Records the change and customer measurements. "Revert after return" holds those sets in Stock & cleaning until marked *Reverted*. |
| **QR set tags** | Stock → edit → Print QR tags; scan box on hand-over and return | Each physical set gets `VVT:SKU:colour:NN`. Works with USB or Bluetooth scanners (they type plus Enter), and with the tablet camera where the browser supports it (Android Chrome). |
| **Cleaning vendors** | Stock & cleaning, Settings | Send to cleaner (vendor, cost), Back from cleaner, and monthly spend. |
| **Booking calendar** | More → Calendar, and from Stock | Pickups and returns per day, or free sets per day for any costume and colour (bookings, rentals out and the cleaning buffer all counted). |

### Turn on WhatsApp Business automation
Start the studio server with Meta WhatsApp Cloud API credentials:
```
set WA_TOKEN=<permanent access token>
set WA_PHONE_ID=<phone number id>
set WA_TEMPLATE=<approved template name, 2 body params: name, message>
node render-engine/server.mjs
```
Without these, `/api/wa/send` is a dry run that logs to `render-engine/wa-outbox.jsonl`. Business-initiated messages need an **approved template**. Customer replies ("returned", "extend") need a webhook, which is Phase 2.

## Branded packaging (`design/packaging/`)
`node tools/packaging.mjs --all` has Codex draw the carry bag, garment cover, jewellery box, accessory pouch, hang tag and a group shot. Each prompt asks for a flat magenta square, which the script replaces with a **real** QR code (perspective-matched) that opens a WhatsApp chat with the shop. `print/` holds vector print files: a 100 × 150 mm bag label and a 50 mm round sticker.

## Render engine commands

```
node render-engine/render.mjs --list                     # ✓ rendered · has photo · ○ needs photo
node render-engine/render.mjs --refs                     # every colourway with a reference photo
node render-engine/render.mjs --sku MK-RD-022 --variant pink --shot signature
node render-engine/render.mjs --inbox                    # new garments dropped in render-engine/inbox/
node render-engine/render.mjs --concepts --limit 5       # text-only concept images for items with no photo yet
node render-engine/render.mjs ... --retry "feet cropped"  # re-shoot with a correction
python tools/build-sw.py                                 # refresh the offline file list after new renders
```

Each render takes about 1–2 minutes with the Codex free tier. If the image limit is hit, the batch stops cleanly and the rest can run later.

## Still true from v1

- **Return flow:** pieces are counted individually, partial returns go straight to the cleaning buffer, fines are capped against the deposit and show the refund or the amount to collect, and late fees and extra rent are handled. The demo clock in the top bar fast-forwards days, and **Settings → Reset demo data** restores the sample state before a meeting.
- **Sample data:** all rates, deposits, stock counts, customers and phone numbers are sample data.
- **Storage:** data stays on the device (export a backup from Settings). Reminders surface when the app is opened; automatic WhatsApp needs Phase 3.
