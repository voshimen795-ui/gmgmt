# G Management — gmgmt.co

Single-page site for G Management, a social media and influencer marketing agency in
Miami run by Manny Garcia. Static HTML, CSS and JavaScript. No build step, no framework,
no dependencies.

```
index.html                  the page, with all styling inline in its <style>
assets/js/main.js           counters, chart, reels, booking, form, motes
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


## What was done for speed

Measured on a 1.6Mbps line with 150ms latency and a 6x throttled CPU at 390px, which is a
harsher phone than most visitors will have.

The first pass was about first paint, and took it from 916ms to under 500ms by putting the
stylesheet in the document. The second was about weight and main-thread time. Both columns
below are six runs of the same page under the same throttle:

| | before the second pass | after |
|---|---|---|
| Load event | 1757ms | **1383ms** |
| Bytes on arrival, uncompressed | 287KB | **221KB** |
| Bytes for the whole page, scrolled | 485KB | **334KB** |
| Blocked on the main thread | 443ms | **349ms** |
| First contentful paint | 548ms | 582ms |

First paint did not improve and is fractionally worse: the document grew by the fallback
declarations and the comments explaining them. That is the trade, and it is a fair one —
first paint was already the fastest thing about the page, and the 150KB and 94ms are not.

Over brotli, which is what Vercel actually sends, arrival is about 129KB: 18KB of document,
10KB of script, 43KB of fonts and up to 60KB of thumbnails — and the thumbnails are lazy,
so a visitor who never reaches the Work section pays for two of the three at most.

Where it came from:

- **The stylesheet is in the document.** It was a separate file, so nothing could paint
  until a second round trip finished. Inlining it took first paint from 916ms to 476ms in a
  three-way test against the alternatives. There is no `assets/css/` any more: the styles
  live in the `<style>` block at the top of `index.html`, which is also why there is still
  no build step.
- **The fonts carry only the glyphs this page uses** — 104 of them — **and only the axis
  range it asks for.** Archivo is set between 400 and 800 and never narrower than 100%
  wide, but the family ships 100-900 and 62-125%: all deltas nobody reads. Subsetting the
  glyphs took 120KB of woff2 to 63KB; trimming the axes took it to 43KB. They are not
  preloaded: preloading raced them against the stylesheet on a narrow pipe, and
  `font-display: swap` paints the text immediately regardless.
- **The tile thumbnails are lazy WebP at 768x432** — 36KB for all three, each cropped 16:9
  from a moment in the clip it fronts where that crop falls well. They are real
  `<img loading="lazy">` elements, not CSS backgrounds: a background image is fetched as
  soon as its element is laid out no matter where on the page it sits, and these tiles are
  a long way down.
- **The proof screenshots are WebP.** The same four dashboards were 197KB as JPEG and are
  85KB as WebP, with the small type in them unchanged. They are lazy too, and carry their
  intrinsic size so nothing shifts when they arrive.
- **The counters format their own numbers.** They used to go through `toLocaleString`,
  which builds a fresh `Intl.NumberFormat` on every call, once per counter per frame for
  the length of the count — the single most expensive thing on the main thread during load,
  and warming ICU for the first call cost more than everything else `main.js` does. The
  page sets en-US figures with fixed decimals and nothing else, so it groups them itself;
  checked against Intl over 12,000 values across 0, 1 and 2 decimals, identical every time.
- **The headline scramble only writes the glyphs that are churning.** It used to rewrite
  all 57 on every frame for a second and a quarter, including the ones already settled.
- **No third party is asked for a thumbnail.** The YouTube tile used to pull its poster from
  i.ytimg.com, which answers with a grey placeholder rather than a 404 when a Short has no
  thumbnail in the size asked for. Its poster is drawn locally instead, in the page's own
  fonts and colours, and the page now requests nothing from any other host on arrival.
- **The hero film runs everywhere, phones included** — it is the first thing the page says,
  and a hero only desktops see is a hero half the visitors never get. It starts on an idle
  callback after the load event, so it never competes with the text and the type for the
  opening second.

  It is skipped for exactly one reason now: `saveData`, which is the visitor asking. It
  used to also be skipped when `navigator.connection.effectiveType` read `2g` or `3g`, and
  **that is why it did not appear on a real phone.** That value is not the radio: it is the
  browser's own estimate from measured round-trip time and throughput, and Chrome on
  Android returns `3g` for an ordinary LTE connection often enough to hide the film from
  the people it was meant for. A guess that wrong is worse than no guess.

  Reduced motion no longer removes it either — the film mounts and holds on its first
  frame, so the hero keeps its picture and nothing moves. That needs `autoplay` left off
  the element, not just an uncalled `play()`: the browser will start an element carrying
  the attribute however carefully the script avoids it.

  Each source also gets one retry, 1.2s later, before the list moves on. A single dropped
  request on a phone should not cost the hero its film for the rest of the visit.

- **The hero has a local film behind the hosted one.** `data-video` is a list and the first
  source to produce a frame wins, so the hosted cut still leads; `/assets/hero-loop-v3.mp4`
  sits behind it so the section is never empty on a device that cannot reach or cannot
  decode the hosted file. It is 777KB and **1280x720** — landscape, because the hero paints
  it `object-fit: cover` across the viewport and the 540x960 portrait file it replaced was
  being scaled about 3.5x on a desktop with most of it thrown away. Replace that second
  entry to change the fallback.

- **A source that hangs is dropped, not waited on.** A file too heavy for the device never
  errors: it simply never arrives, and the section stays empty for the whole visit while
  the phone keeps pulling at it. So while there is still something to fall back to, each
  source gets six seconds to produce a first frame and is abandoned if it misses. The last
  source in the list has nowhere to go and is left alone to take as long as it needs.
- **`vercel.json`** gives a year of immutable caching to the things whose filenames carry a
  version — the fonts, `/assets/clips`, the hero loop — and ten minutes with revalidation to
  everything else. The split matters in both directions. It briefly gave *everything* under
  `/assets` the year, which was a mistake, because `main.js` has no version in its name and
  a deploy would not have reached anyone holding a cached copy. And ten minutes for a 4MB
  clip is a re-download nobody needs. Bump the version suffix whenever a versioned file's
  contents change, and the old copy can never be served in its place.

**If the copy changes, re-subset the fonts.** The subset covers printable ASCII plus the
punctuation the page uses. A character outside that set will silently fall back to Helvetica
for that glyph. Regenerate from the originals with:

The axes are pinned to the range the page asks for before the glyphs are cut, because the
variable deltas are most of the weight — Archivo went 44.7KB to 27.1KB on that step alone:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.subset import Subsetter, Options

font = TTFont('archivo-latin-var.woff2'); font.flavor = None
instancer.instantiateVariableFont(font, {'wght': (400, 600, 800),
                                         'wdth': (100, 100, 125)}, inplace=True)
font.save('tmp.ttf')

font = TTFont('tmp.ttf')
opts = Options(); opts.layout_features = ['kern']; opts.name_IDs = [1, 2, 3, 6]
sub = Subsetter(options=opts)
sub.populate(unicodes=[ord(c) for c in open('glyphs.txt').read().strip()])
sub.subset(font)
font.flavor = 'woff2'; font.save('archivo-latin-v5.woff2')
```

Instrument Sans gets the same treatment with `{'wght': (400, 400, 600)}` and no width axis.
Whatever range is pinned here must match the `font-weight` and `font-stretch` on the
`@font-face` rule, or the browser will clamp to an axis value the file no longer carries.

A phone pays for things a laptop gives away. The page also holds to these:

- **The hero film waits.** It is fetched after the load event, on an idle callback, so it
  never competes with first paint. Its host is preconnected in the head.
- **Nothing plays until it is asked to.** The three tiles arrive as thumbnails; the page
  loads no video file and no third-party player. On arrival: zero video elements, zero
  iframes.
- **No decoder runs off screen.** A player mounted by a press is watched and paused the
  moment it leaves the viewport. The silent hero film is resumed when it returns; a reel
  the visitor pressed is not, because it carries sound.
- **No filter on the hero film, and none over it.** A CSS filter over a full-screen video is
  recomposited every frame; the look lives in the scrim instead.
- **No backdrop filter anywhere on the page.** A `backdrop-filter` re-reads and re-blurs
  everything behind it every time that backdrop changes — which over a playing video is
  every frame, and under a fixed bar is every scrolled frame. Three of them were on this
  page: the sticky header above 900px, the ghost button in the hero, and the phone action
  bar. All three sat over near-black already, so the glass was blurring something nobody
  could see through. They are flat translucent ink now and look the same.
- **No animated blur.** The hero's light field spans 150% of the viewport and used to carry
  a 40px blur while a 32-second `drift` animation scaled it, directly over the film — a
  full-screen blur re-rasterised on every frame, for the whole visit, gated to desktops with
  a mouse. Both are gone; wider gradient stops give the same light with no filter at all.
- **No blend mode, and the grain is plain opacity.**
- **No 100vmax inset shadow.** The poster dimming is a gradient layer.
- **No promotion the compositor did not ask for.** The headline's 57 glyphs animate opacity
  and transform, which is promoted while the animation runs and dropped when it ends. They
  used to also carry `will-change`, which asks for 57 layers at once in the same second the
  hero film is being fetched, and bought nothing.
- **Both faces are preloaded.** They are set above the fold and the stylesheet is inline, so
  the browser would otherwise only discover them after parsing all of it — and the headline
  animation waits on `document.fonts.ready`, so this is the gate on when the hero settles.
- **Versioned files are cached for a year.** `/assets/clips` and the hero loop carry a
  version in the name, so they are served `immutable`. `main.js` does not, so it stays on a
  ten-minute cache and a deploy still reaches people.
- **No motes on phones**, and none anywhere under reduced motion.

### Old phones

`color-mix()` landed in Safari 16.2. An iPhone left on iOS 15 does not have it, and an
engine that cannot parse a value throws the whole declaration away — which for this page
meant every border, scrim and tint disappearing at once, not degrading. So each of the 46
declarations that uses it is written twice: the flat `rgba()` the mix evaluates to, then
the mix itself. Old engines keep the first and skip the second; new ones take the second.
The two glow shadows are the exception. A custom property's value is not checked when it
is declared, so a plain duplicate never loses the cascade there — those two sit behind an
`@supports (color: color-mix(...))` block instead.

Rendered side by side with every `color-mix()` stripped out, the two versions differ by a
mean of 0.4/255 across the full 8423px page — the counters landing on different frames.
Same treatment for `100svh` (a plain `vh` line first, Safari 15.4) and `backdrop-filter`
(`-webkit-` prefixed first).

Measured on a 6x throttled CPU at 390px, scrolling the whole page: 41fps with six or seven
long tasks and 355-460ms blocked at the start of that work; 58fps with no long tasks and
nothing blocked now.

`content-visibility: auto` was tried on the sections and taken back out: the page height
moved by 1,400px as sections rendered, and the reveal observer cannot see inside a skipped
subtree, so content stayed invisible.

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
the light field carries the hero on its own.

**Give it a landscape file.** The hero paints it `object-fit: cover` across the viewport, so
a portrait file on a 1920px desktop is scaled about 3.5x and most of it is thrown away —
soft, blocky, and a much larger decode than the picture that survives. `hero-loop-v3.mp4` is
1280x720 for that reason. Keep it short and small; it is background, not content, and ten
seconds under a megabyte is plenty.

**Reel clips.** Each clip is encoded at **its own** aspect ratio, whole, at 30fps
with its audio kept — no crop, no blurred band, nothing added and nothing taken
away — and the player gives it a box that matches. `assets/clips/README.md`
carries the full recipe: why the tile and the clip are different shapes, how a
thumbnail moment is chosen, where each clip's audio comes from, and why the head
of a file gets cut rather than seeked past. The short version:

```
ffmpeg -ss <cut> -i source.mp4 -filter_complex "
  [0:v]scale=720:-2:flags=lanczos,setsar=1,fps=30,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -preset slow -crf 26 -g 60 \
  -c:a aac -b:a 96k -movflags +faststart out.mp4
```

30fps, not the 60 the sources were shot at: talking heads gain nothing from it and
it halves what a phone has to decode to keep up, which is most of what "the video
stutters" is. Put the result's width over its height in the tile's `data-ratio`,
so the player opens the right shape before any media has arrived.

Filenames carry a version (`-v11`). `/assets/clips` is served `immutable` for a year
and these files have no content hash, so a re-encode under an old name keeps showing
the old cut on a phone that already has it.

A tile is a still until it is pressed. Add `data-video="/assets/clips/whatever.mp4"`
and `data-ratio="<width over height>"` to the `<figure class="reel">`, and a press opens
that file over the page with its own controls and its sound. A tile with `data-embed`
instead opens the platform's player the same way. Either way nothing is fetched and no
third party is contacted until someone presses. See `assets/clips/README.md`.

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
4. **Work** — three 16:9 tiles in one row above a panel carrying the offer.
   Landscape is the shape a video player is, so the tiles read as three videos
   rather than three phone screenshots, and each gets the full width of its column.
   One column below 900px and three above it — never two, because two leaves the
   third tile orphaned beside a gap.

   **The tile is 16:9. The clips are not.** Two of the three were shot vertical as
   9:16 close-ups, and a 16:9 window out of a 870x1588 frame is a third of its
   height — in the first clip, narrower than the speaker's head. Playing that
   inside the tile leaves only a cut-off head or two thirds of blurred filler, and
   both were tried. So the tile is a thumbnail: a still, cropped 16:9 from a
   moment where the crop falls well, which a still allows and 700 moving frames do
   not. Pressing it opens the clip over the page at its own shape, whole. The row
   keeps three uniform landscape tiles with no blur and no dead space, and no clip
   is ever cut. It is also what frees the YouTube Short, which as an embed could
   not be cropped at all and now simply opens 9:16 with no black bars.

   Nothing is fetched, decoded or contacted for a visitor who never presses play,
   and closing the player tears the clip down — paused, source dropped, `load()`
   called, element removed — because a paused `<video>` keeps its decoder and its
   buffer and would go on running behind the page.

   There is no `data-start`. A clip whose source opens on junk is **cut in the
   encode**, not seeked past at play time: a browser paints frame zero while it
   seeks and drops the poster the moment playback is asked for, so a seek shows
   the junk anyway, every single press.

4b. **Before and after** — each screenshot sits in a `.shot` frame: it uncovers itself from
   the bottom as it arrives, lifts under the pointer with the image scaling inside the clip,
   a light travels its border (a conic gradient turned by an `@property` angle) and one sheen
   sweeps across the glass. Behind the cards, a canvas drifts gold motes upward — drawn only
   while the section is on screen and the tab is visible, at device pixel ratio 1 on phones,
   and not at all under reduced motion, where the frames also drop their clip and both
   pseudo-elements.

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
