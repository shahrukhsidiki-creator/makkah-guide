# Makkah Guide

A complete, free Umrah and Makkah travel guide in six languages. Plain HTML, CSS
and JavaScript — **no frameworks, no build step, no server, no API keys, no
running costs.**

---

## What's in it

**Worship**
- `umrah-guide.html` — step by step, Ihram to Taqsir, with Ihram prohibitions, a women's section and common mistakes
- `zikr.html` — zikr and dua for Tawaf and Sa'i in Arabic, transliteration and translated meaning
- `hateem.html` — what the Hijr Ismail is, how the entry system works, live timing check
- `ziyarat.html` — Cave Hira, Jabal Thawr, Jannat al-Mu'alla, Masjid Aisha, Arafat and the rest

**Travel**
- `flights.html` — one form, fires the same search at Google Flights, Skyscanner, Kayak, Momondo and Trip.com
- `transport.html` — Haramain rail, SAPTCO coaches, Makkah city buses, Jeddah airport routes
- `taxi.html` — fare calculator with tapered distance bands and preset routes
- `hotels.html` — star categories, price bands, and walking distance from the Haram by area
- `makkah-madinah.html` — train vs bus vs car vs flight, plus Ihram at Abyar Ali

**Local**
- `food.html` — restaurants by cuisine, using the phone's own geolocation
- `shopping.html` — dates, real price ranges, spotting fake Ajwa, what else to bring home
- `essentials.html` — packing checklist, gate note, emergency numbers, Arabic phrases, dam & fidya table

**Tools (all work offline)**
- `tawaf-counter.html` — Tawaf and Sa'i counter, saves state, vibrates at seven, optional wake lock
- `tools.html` — prayer times, Qibla compass and Hijri converter, all calculated on the device

---

## Languages

Six languages: **English, Urdu, Hindi, Arabic, Indonesian, Bengali.** Urdu and
Arabic switch the whole layout to right-to-left. The language picker is the
button in the header; the choice is remembered and applies across every page.

On a visitor's first load the browser's own language is detected and matched, so
an Urdu-speaking phone opens in Urdu with no tapping.

**How it works.** Every translatable string in the HTML carries a `data-i18n`
key. `assets/i18n.js` loads `assets/i18n/<lang>.json` and swaps the text in,
falling back to English for any key a translation is missing. All six JSON files
are in the offline cache, so visitors can change language with no signal.

```
assets/i18n/
├── en.json / en.js     reference — the English source for every key
├── ur · ar · hi · id · bn   (.json is the source, .js is what loads)
```

**Why both .json and .js?** Browsers block `fetch()` of a local JSON file when
a page is opened directly from disk (`file://`), which silently breaks language
switching for anyone who just double-clicks `index.html`. A `<script>` tag is
not blocked, so the engine loads the generated `.js` files instead. Edit the
`.json`, then run `node tools/build-i18n.js` to regenerate.

**Conventions used in the translations:**
- Religious terms stay Arabic across all languages (Tawaf, Sa'i, Ihram, Miqat,
  Talbiyah, Halq, Taqsir, Zamzam), written in each language's own script. This
  is how people actually speak, and it avoids inventing vocabulary.
- Quranic text and dua in the `.dua .ar` blocks is **never** touched by the
  engine, and the Latin transliteration line is left alone too. Only the meaning
  line changes language.
- Every language carries the translation disclaimer: where a translation and the
  English differ, the English governs — and for worship, a qualified scholar
  governs over both.

**Translation status.** Complete. Every page is fully translated into all five
non-English languages — 1,508 strings each, covering navigation, headings, body
prose, table cells, form labels, placeholders, buttons and disclaimers. Three
things are deliberately left in their original form everywhere: brand names
(Google Flights, Skyscanner, Agoda, SAPTCO), the Arabic phrases in the Essentials
phrasebook along with their Latin-script pronunciation guide, and the Arabic text
of the duas on the Zikr page.

**Adding the rest, or a new language.** `en.json` is the complete key list. Copy
it, translate the values, save as `assets/i18n/<code>.json`, and add the language
to the `LANGS` array at the top of `assets/i18n.js`. Run `node tools/build-i18n.js`
(it also reports any missing or stray keys), add the new `.js` file to `SHELL`
in `sw.js`, and bump `CACHE_VERSION`. Keys must match `en.json` exactly, and any
`<b>` or `<em>` tags inside a string must survive translation.

---

## How the "no API" approach works

The site never fetches search results. Instead it **builds a precise query URL
from what the user entered and opens it in a new tab** — Google, Google Maps, or
the operator's own booking site.

```
Karachi → Jeddah, 15 Nov, 3 people
  → https://www.google.com/travel/flights?q=Flights%20from%20KHI%20to%20JED%20on%202026-11-15…
```

This costs nothing, never hits a rate limit, and can't go stale — the user always
lands on live data. Those same outbound links are where affiliate revenue can go
later (see below).

Three things are computed locally rather than looked up, so they work with no
signal: prayer times, Qibla bearing and Hijri dates (`assets/islamic.js`,
standard astronomical formulae, verified against known values).

---

## Running it

It's a static site — open `index.html` in a browser and it works.

For the service worker, "add to home screen" and the language files to load, you
need to serve it over HTTP (they're disabled on `file://`):

```bash
cd makkah-guide
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Hosting (free)

Any static host. Drag the whole `makkah-guide` folder onto:

| Host | How |
|---|---|
| **Cloudflare Pages** | Recommended. Drag-and-drop upload, free SSL, fast globally |
| **Netlify** | Drag the folder onto app.netlify.com/drop |
| **GitHub Pages** | Push the folder to a repo, enable Pages in settings |
| **Vercel** | Import the folder, no configuration needed |

A domain costs roughly $10/year. Everything else is free at this scale.

**Serve over HTTPS.** Geolocation, the compass and the service worker all require
a secure context — they'll silently fail on plain HTTP.

---

## Things to change before publishing

1. **`about.html`** — replace `hello@example.com` with your real contact address.
2. **`assets/app.js`** — `MG_CONFIG.siteName`, and your affiliate IDs if you have them:
   ```js
   affiliate: {
     skyscanner: 'associateid=XXXX',
     booking: 'aid=XXXXXX',
     tripcom: 'Allianceid=XXXX&SID=XXXX'
   }
   ```
   Skyscanner, Booking.com and Trip.com all run free affiliate programmes — no
   API needed, just a tracking parameter appended to the link.
3. **Ad slots** — every `<div class="ad-slot">` renders a labelled placeholder.
   Replace the inner HTML with your AdSense snippet or a direct banner:
   ```html
   <div class="ad-slot"><a href="..."><img src="..." alt="..."></a></div>
   ```
   An empty `.ad-slot` is hidden by CSS, so unsold placements collapse rather
   than leaving a gap. They sit on the home page and in the travel, food,
   shopping, ziyarat and guidance pages — deliberately *not* mid-way through
   worship instructions.
4. **`sw.js`** — bump `CACHE_VERSION` every time you edit the site, or returning
   visitors keep the cached old version.

---

## Android app

The site is already a PWA and installs to the home screen. If you want a Play
Store build, this folder drops into a Capacitor project as `www/` with no
changes:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Makkah Guide" com.yourname.makkahguide --web-dir=www
cp -r makkah-guide/* www/
npx cap add android
npx cap open android      # opens Android Studio
```

The offline tools, counters, translations and guidance all work inside the
wrapper. The outbound search links open in the device browser.

---

## SEO

Each page has its own title, meta description and Open Graph tags, written
around what people actually search for ("Hateem entry time", "Makkah taxi fare",
"fake Ajwa"). The home page carries `WebSite` structured data.

Worth adding when you have a domain: a `sitemap.xml`, a `robots.txt`, and
`FAQPage` structured data on `hateem.html` and `umrah-guide.html` — those two
have the strongest search potential. Page titles are currently English only; if
you want the translated pages indexed separately you'd need per-language URLs
rather than the in-page switcher.

---

## Structure

```
makkah-guide/
├── index.html              home / hub
├── umrah-guide.html  zikr.html  hateem.html  ziyarat.html
├── travel.html  flights.html  transport.html  taxi.html  hotels.html  makkah-madinah.html
├── more.html  food.html  shopping.html  essentials.html  about.html
├── tools.html  tawaf-counter.html  offline.html
├── manifest.json           PWA manifest
├── sw.js                   service worker (offline cache)
└── assets/
    ├── style.css           design system, light + dark, RTL, multi-script fonts
    ├── app.js              shared chrome, search URL builder, storage
    ├── i18n.js             translation engine, language picker, RTL switching
    ├── islamic.js          prayer times, Qibla, Hijri — pure calculation
    └── i18n/               en, ur, ar, hi, id, bn (.json source + generated .js)
└── tools/build-i18n.js     regenerates the .js files from the .json
    └── icon*.png / icon.svg
```

Navigation, the footer and the ad placeholders are injected by `app.js`, so
adding a page means copying any existing page's `<head>` and header and writing
the `<main>`.

---

## Privacy

No account, no analytics, no tracking, no server. Counters, checklist ticks, the
gate note, saved contacts and the language choice live in `localStorage` on the
user's own device. Location is requested only when a button needs it, used to
build the map URL, and never stored or transmitted. The one outbound request the
site makes on its own is a Google Fonts stylesheet for the Urdu Nastaliq
typeface, and only when a reader selects Urdu — it degrades to the system Arabic
font if blocked or offline. **If you add analytics or ad scripts, update the
privacy section in `about.html` to say so honestly.**

---

## A note on the content

Religious guidance is written in general terms that the major schools of fiqh
broadly agree on, and deliberately avoids taking sides where they differ. Every
page carrying such content ends with a disclaimer directing the reader to a
qualified scholar. Nothing on the site is presented as a fatwa.

Prices, fares and timings are indicative planning ranges, clearly labelled as
such, with a live-check link beside them. Where a figure genuinely cannot be
known in advance — today's Hateem access window, for instance — the site says so
plainly rather than publishing something that would quietly go out of date.

Please keep both of those properties if you extend it.
