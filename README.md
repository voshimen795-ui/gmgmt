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

**Hero showreel.** The frame beside the headline takes a file the same way:

```html
<figure class="hero__frame" data-hero-frame data-clip="/assets/showreel.mp4">
```

It plays `autoplay loop muted playsinline`, cropped to a 16:9 rounded frame with an
ambient bloom behind it. With no file the frame keeps its shape and shows the outlined
title instead, so the layout never shifts.

**Reel clips.** Each tile in the vertical grid can preview a self-hosted clip on hover or
keyboard focus — add `data-clip="/assets/clips/whatever.mp4"` to the `<figure class="reel">`.
The clip is only created on first hover, plays muted and looping, and is dropped if the
file is missing. Tiles keep working without a clip: they stay poster frames that load the
real post when pressed.

**The two videos.** Each player stores its own embed URL:

```html
<figure class="player" data-player data-embed="…" data-embed-title="…">
```

The tile is a facade — nothing loads from Facebook or YouTube until someone presses play,
and the caption under each tile links out to the original post, so the proof is reachable
even if a platform declines to embed. The Facebook embed uses the video plugin against the
share URL; if Facebook ever stops resolving that form, replace the `href=` inside
`data-embed` with the canonical `/reel/<id>` URL (URL-encoded).

**Numbers.** Every figure lives in the markup as text. The hero counters read their target
from `data-to`, and the Houdini scrub reads `data-from` / `data-to` on each figure — change
those attributes and the interaction follows.

## What the page does

- **Case rail.** The five case studies collapse to one panel at a time behind a rail of
  client names and headline figures. Selecting one replays its figures and its chart.
  Built as a real tablist (arrow keys, Home/End, roving tabindex); without JavaScript the
  rail is a set of jump links and all five cases stay stacked on the page.
- **Contact actions.** Copy the email to the clipboard, open WhatsApp, or download a
  vCard — the card is built in the browser, there is no file to keep in sync.
- **Chips instead of dropdowns.** Two radio groups cover who is writing and what they
  need, so the form is two typed fields and a few taps.
- **Vertical video grid.** Three 9:16 frames. Hovering or focusing one plays its clip,
  scales it up, lights a gold glow, and pulls the other two back with a blur so the eye
  lands in one place. Every tile carries a Play badge; pressing one loads the real post.
- **Pointer follower.** A small ring trails the pointer and expands into a "View" badge
  over anything playable. Fine pointers only — never on touch, never under reduced motion.
- **Phone action bar.** Below 768px a bar with Book a call, WhatsApp and Call slides in
  once the hero has scrolled past, and gets out of the way over the booking section.

## Design notes

- Colour, spacing and type are CSS custom properties in `:root`. Spacing only uses the
  8px ladder (`--sp-4` … `--sp-160`); there are no arbitrary pixel values in the sheet.
- Gold (`--gold`) is the only accent, and appears sparingly: the primary CTA, the single
  most important figure in a case study, the hero rules, active nav state.
- Type is Archivo (variable width axis, used at 100–125% for display) and Instrument Sans.
  Both are self-hosted with `font-display: swap` and preloaded.
- Each case study has a layout matched to its data: testimonial-led for BKH and PAC-Hub,
  a chart for the three-stage Pivot Point progression, a September-to-November scrub for
  Houdini, and one large figure for the link-in-bio revenue.
- Every interactive data view is mirrored by a real `<table>`, so the figures are readable
  with JavaScript off and to a screen reader.

## The hero

Broadcast scoreboard, built in four bands: location line, a full-width three-line
headline, a gold rule, sub copy paired with the two calls to action, then a stats band
carrying four client figures with the client and date window under each. A ticker rail
sits on the hero's bottom edge with the headline number from all five case studies.

At 1024px and up the headline keeps its authored line breaks (`text-wrap: nowrap`);
below that the three lines flow as ordinary text so a narrow screen never gets a bad
wrap, and the per-line reveal is swapped for a single one on the whole headline.

## Motion

**On load** — one orchestrated sequence of about 1.6s, then the page settles: the column
rules draw down, the headline arrives character by character behind a short glyph
scramble, the rule sweeps right, sub copy and buttons arrive, the board's gold rule wipes
across and its four figures count up, and the ticker fades in and starts moving.

The headline splits into words and characters at runtime. Each character's width is
measured and locked before the scramble starts, so swapping glyphs cannot shift the line,
and the full sentence stays on the `<h1>` as an `aria-label`. Under reduced motion it is
never split at all.

**On scroll** — deliberately limited to motion that carries meaning: headings arriving,
the gold rule beside a testimonial drawing down, the Pivot Point chart drawing itself,
figures counting to their real value, audience bars growing to their real share. Body
copy never moves — a page where every paragraph slides up reads as a template.

**On interaction** — button fills wipe in from the left, the nav marker slides between
items and returns to the active one, the reading-progress hairline tracks the scroll,
the board dims its other rows when you hover one, the video tiles light their play
control, and the Houdini scrub follows the pointer or the arrow keys.

Everything is gated on `html.js`, so with JavaScript off the page renders complete and
static rather than waiting for an animation that will never run. Under
`prefers-reduced-motion: reduce` the load sequence is switched off outright, the ticker
and the pulse stop, counters stay at their final values, and the chart renders complete.

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
