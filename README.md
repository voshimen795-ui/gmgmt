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


## Turning on the three things that need an account

Everything below is a one-line edit in `index.html`. Nothing needs a build step, a
server, or a redeploy beyond pushing the file.

### 1. Real booking, with a Google Meet link on every call

The picker in the page is a fallback: it collects the slot and sends the request. To
have the meeting created, confirmed and given its own Meet link automatically, put a
scheduler URL in the booking slot:

```html
<div class="booker__embed" data-booking data-booking-url="https://cal.com/manny/15min"></div>
```

Cal.com is free for one person. Sign up, connect the Google account, and on the event
type set **Location → Google Meet**. Calendly and Google Calendar appointment schedules
work the same way and are detected too — each is themed to the page automatically
(dark background, gold accent) rather than dropping in a white box.

With a URL present the built-in picker steps aside and the "on Google Meet" line
appears in the card header. With none, the picker stays and offers three ways out:
send the request, open the slot in Google Calendar (saving it there attaches the Meet
link), or download the `.ics`.

### 2. The lead form reaching an inbox

```html
<form class="lead" data-lead data-endpoint="https://api.web3forms.com/submit">
```

Any endpoint that takes a POST and answers JSON works — [Web3Forms](https://web3forms.com)
(free, no account needed beyond an access key, which goes in a hidden input),
Formspree, Basin. Left empty, the form composes the same message as an email instead,
so it is never a dead button. The **Send on WhatsApp** button works either way: it opens
WhatsApp with the whole message written out, which is the instant notification on the
phone.

For a genuine push notification the moment a form is sent, point the endpoint at a
Zapier or Make webhook and have it fan out to email and WhatsApp.

### 3. Google Analytics

```html
<script data-ga4="G-XXXXXXXXXX">
```

Put the GA4 measurement ID in that attribute. Empty, and nothing is requested at all —
no tag, no cookie.

### The link preview

`og:image`, `og:url` and the canonical all point at `https://gmgmt.co/`. Link previews
(WhatsApp, iMessage, Slack, X) fetch that absolute URL, so the image and description
only appear once the domain is connected. Sharing a `*.vercel.app` link before then
shows the title and description but no image. If the site is going to live somewhere
else, change the four absolute URLs in `<head>` and the two in `sitemap.xml` and
`robots.txt` to match.

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

**Reel clips.** The Facebook tile plays `/assets/clips/facebook-reel.mp4` (702x1280, 2.7MB,
no audio track since it plays muted) and shows `reel-poster.jpg` until it arrives. Re-encode
anything new the same way:

```
ffmpeg -i source.mp4 -vf "scale=-2:1280" -c:v libx264 -preset slow -crf 28 \
       -pix_fmt yuv420p -an -movflags +faststart out.mp4
```

A tile plays a self-hosted file inline, muted and looping, as soon as it
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
3. **Clients** — the account names on an infinite roll, faded at both edges and paused on
   hover. Swap a name for an `<img>` when a client sends a logo file; the row does not care
   which it is holding.
4. **Work** — three 9:16 tiles above a panel carrying the offer: how a month runs, what is
   included, and the CTA. The Facebook tile plays a self-hosted clip from
   `/assets/clips/` inline; so does the middle one, which also opens the full cut on Drive
   when pressed; the YouTube tile loads and plays itself when it scrolls into view.

   The middle clip arrived 4K landscape with a compressor's watermark in the corner. It is
   cropped off and the frame set on a blurred, darkened copy of itself, which fills the 9:16
   tile without cutting anyone out of shot:

```
ffmpeg -i source.mp4 -filter_complex "\
 [0:v]crop=3840:1840:0:0,split=2[bg][fg];\
 [bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,\
     gblur=sigma=24,eq=brightness=-0.16:saturation=0.85[bgb];\
 [fg]scale=720:-2[fgs];\
 [bgb][fgs]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]" \
 -map "[v]" -c:v libx264 -preset slow -crf 28 -an -movflags +faststart out.mp4
```

   The Drive tile needs the file shared as **Anyone with the link** — without that, pressing
   it shows Google's request-access screen. Give it the same treatment as the others by
   putting the file at `/assets/clips/reel-2.mp4` (re-encoded with the command below) and
   adding `data-video="/assets/clips/reel-2.mp4"` to the figure: it then plays inline, muted
   and looping, with no third party involved.
5. **Results** — a bento grid: BKH and the Pivot Point chart across the top, then Houdini,
   the link-in-bio revenue and PAC-Hub. Every figure counts up on arrival, and the shares
   (99.7% non-follower reach, 92% US audience) grow as bars.
6. **Clients** — two short testimonials, named.
6b. **FAQ** — seven questions as native `<details>`, so they work with scripting off. The
   answers are also emitted as `FAQPage` structured data, generated from this markup, so the
   two can never drift apart. Google can show them under the result.
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
