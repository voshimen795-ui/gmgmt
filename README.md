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

## Design notes

- Colour, spacing and type are CSS custom properties in `:root`. Spacing only uses the
  8px ladder (`--sp-4` … `--sp-160`); there are no arbitrary pixel values in the sheet.
- Gold (`--gold`) is the only accent, and appears at most once per section: the primary
  CTA, the single most important figure in a case study, active nav state.
- Type is Archivo (variable width axis, used at 112–125% for display) and Instrument Sans.
  Both are self-hosted with `font-display: swap` and preloaded.
- Motion budget is one orchestrated load sequence (~1.2s). The only scroll-triggered
  animation is the Pivot Point chart drawing itself, because the line carries the
  information. Everything else moves in response to a user action. `prefers-reduced-motion:
  reduce` snaps counters to final values and renders the chart complete.
- Every case study has a layout matched to its data: testimonial-led for BKH and PAC-Hub,
  a chart for the three-stage Pivot Point progression, a September-to-November scrub for
  Houdini, and one large figure for the link-in-bio revenue.
- Each interactive data view is mirrored by a real `<table>`, so the figures are readable
  with JavaScript off and to a screen reader.

## Regenerating the link-preview image

`tools/og-source.html` is the source for `assets/og.png`. With the local server running:

```
chromium --headless --window-size=1200,630 \
  --screenshot=assets/og.png http://127.0.0.1:8099/tools/og-source.html
```

`tools/slice.html?w=<width>&id=<element id>` renders the page at a given width scrolled to
an element — used for taking review screenshots at 375px and 1440px.
