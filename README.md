# G Management — gmgmt.co

Single-page site for G Management, a social media and influencer marketing agency in
Miami run by Manny Garcia. Static HTML, CSS and JavaScript. No build step, no framework,
no dependencies.

```
index.html                  the page
assets/css/styles.css       tokens + all styling, organised by section
assets/js/main.js           counters, chart, scrub, video players, form
assets/fonts/               self-hosted variable fonts (Archivo, Instrument Sans)
assets/og.png               link-preview image (1200×630)
favicon.svg
tools/                      dev helpers, not part of the site
```

## Running it

Paths are root-absolute (`/assets/...`), so serve it rather than opening the file:

```
python3 -m http.server 8099
```

Then open <http://127.0.0.1:8099/>.

## Deploying

Upload the repository root as-is to any static host. It expects to live at the domain
root (gmgmt.co). Nothing needs compiling.

## Things the client can change without touching code structure

**Booking link.** The contact section has an empty scheduler slot:

```html
<div class="booking" data-booking data-booking-url=""></div>
```

Put a Calendly (or similar) embed URL in `data-booking-url` and the inline scheduler
appears above the form. Left empty, the slot stays hidden and the form is the booking
path. The form has no backend — it composes an email to `manny@gmgmt.co` and opens the
visitor's mail app. If a real form endpoint is added later, swap the `submit` handler in
`assets/js/main.js`.

**Hero background video.** The hero has a media layer wired for the client's own footage:

```html
<div class="hero__media" data-hero-media data-video="/assets/hero.mp4">
```

Drop a file at that path (or list several, comma separated — `.mp4` and `.webm` are both
recognised) and it plays behind the hero, muted, looping, cropped to cover, under a scrim
that keeps the type at full contrast. Nothing is requested under `prefers-reduced-motion`
or on a connection flagged `saveData`, and if no source plays the element is removed and
the drifting light field carries the hero on its own. Keep the file short and small — it
is background, not content; ten seconds at a few hundred KB is plenty.

**Reel clips.** A tile plays a self-hosted file inline, muted and looping, as soon as it
scrolls into view — add `data-video="/assets/clips/whatever.mp4"` to the
`<figure class="reel">`. Several files can be listed comma separated and the first one
that plays wins; if none do, the tile stays a poster frame and its platform embed loads on
press. See `assets/clips/README.md`.
The clip is only created on first hover, plays muted and looping, and is dropped if the
file is missing. Tiles keep working without a clip: they stay poster frames that load the
real post when pressed.

**The client videos.** Each tile stores its own embed URL:

```html
<figure class="reel" data-reel data-autoload data-embed="…" data-embed-title="…">
```

`data-autoload` brings the embed in as soon as the tile scrolls into view — that is how
the YouTube short simply plays on the page, muted and looping. Without it the tile stays a
poster frame and loads on press, which is what the Facebook tile does, since Facebook does
not autoplay in an embed. Every caption links out to the original post, so the proof is
reachable even if a platform declines to embed. The Facebook embed uses the video plugin
against the share URL; if that stops resolving, replace the `href=` inside `data-embed`
with the canonical `/reel/<id>` URL, URL-encoded.

**Numbers.** Every figure lives in the markup as text. The hero counters read their target
from `data-to`, and the Houdini scrub reads `data-from` / `data-to` on each figure — change
those attributes and the interaction follows.

## The page, section by section

1. **Header** — wordmark, centred nav, and a booking CTA. A gold reading-progress
   hairline sits on its bottom edge and a marker slides between nav items.
2. **Hero** — one centred column on a full-bleed film. A headline that arrives character
   by character behind a short glyph scramble, one sentence of value, two calls to action,
   and four figures that count up across a single rule. The film runs muted and looping
   behind it; with a film present the scrim pools under the copy and thins towards the
   edges, and the copy carries its own shadow so a bright frame cannot wash it out.
3. **Marquee** — an infinite services loop, paused on hover.
4. **Work** — two 9:16 tiles beside a panel carrying the offer: how a month runs, what is
   included, and the CTA. The Facebook tile plays a self-hosted clip from
   `/assets/clips/` inline; the YouTube tile loads and plays itself when it scrolls into
   view. The panel stretches to the tiles' height so no column leaves a hole.
5. **Results** — a bento grid: BKH and the Pivot Point chart across the top, then Houdini,
   the link-in-bio revenue and PAC-Hub. Every figure counts up on arrival, and the shares
   (99.7% non-follower reach, 92% US audience) grow as bars.
6. **Clients** — two short testimonials, named.
7. **Book** — a glowing dark card holding the scheduler.
8. **Footer** — brand, page links, contact, location.

## Booking

The card runs the site's own picker: pick a weekday, pick one of sixteen 15-minute slots,
then either send the request (a pre-written email) or download an `.ics` that drops the
call straight into a calendar with the right time zone. Weekends and past days are closed,
and the picker walks up to two months ahead.

To hand booking to Cal.com or Calendly instead, put the embed URL on the slot:

```html
<div class="booker__embed" data-booking data-booking-url="https://cal.com/…"></div>
```

The real scheduler then takes over the card and the built-in picker is hidden.

## What the page does

- **Pointer follower.** A ring trails the pointer and expands into a "Watch" badge over
  the video tiles. Fine pointers only — never on touch, never under reduced motion.
- **Contact actions.** Copy the email, open WhatsApp, or download a vCard built in the
  browser.
- **Phone action bar.** Below 768px a Book / WhatsApp / Call bar slides in once the hero
  has scrolled past, and gets out of the way over the booking section.

## Regenerating the link-preview image

`tools/og-source.html` is the source for `assets/og.png`. With the local server running:

```
chromium --headless --window-size=1200,630 \
  --screenshot=assets/og.png http://127.0.0.1:8099/tools/og-source.html
```

`tools/slice.html?w=<width>&id=<element id>` renders the page at a given width, scrolled
to an element, inside an iframe — headless Chromium clamps its own window to 500px wide,
so mobile screenshots have to go through this. `tools/check.html?w=<width>` reports the
document's scroll width and lists any element extending past the viewport; it is what the
320–1440px overflow checks were run with.
