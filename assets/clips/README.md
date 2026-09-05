# Reel clips

Self-hosted video for the three tiles in the Work section.

## Every tile is its clip's own shape

There is no crop anywhere on this page. Not in the tile, not in the thumbnail,
not in the player. Each tile is given its clip's aspect ratio, its thumbnail is
that clip's whole frame scaled down, and pressing it opens the clip over the
page at the same ratio again.

The grid is what makes that possible. The two clips shot vertical take a column
each; the one shot landscape spans the row beneath them and closes the block
off:

    ┌──────────┐ ┌──────────┐
    │  9:16    │ │  9:16    │     reel-1 (0.548)   reel-3 (0.5625)
    │          │ │          │
    └──────────┘ └──────────┘
    ┌───────────────────────┐
    │        2.085:1        │     reel-2
    └───────────────────────┘

Three uncropped tiles of two different shapes cannot make a straight row. They
can make this.

**It took three tries to get here, and the two wrong ones are worth keeping in
mind.** Forcing all three into one 16:9 tile means either cropping the picture
or packing the sides with blur, and both shipped. The crop is the worse of them:
a 16:9 window out of a 870x1588 frame is 870x489, the widest that frame can
give, and in the first clip **the speaker's head is taller than that window** —
scalp above it, chin below it, at every offset. There is no placement that holds
his head. The blur is the other: 886 of the tile's 1280 pixels are filler, which
reads as a video that did not fit, the exact thing the blur was there to hide.

Letting the tile take the clip's shape costs nothing and cuts nothing.

### `--ar`

Each tile carries its clip's width over its height, inline on the figure:

    <figure class="reel" data-reel style="--ar: 0.548" ...>

Inline, and not a data attribute, because it is **layout**: the tile has to be
the right shape with scripting off and before a byte of media has been asked
for. The player reads the same value back off the computed style, so there is
one number per clip and no second place to keep it in step. A `<video>` also
corrects it from the real frame on `loadedmetadata`, which covers a re-encode
that changed shape without the markup being updated.

The two vertical tiles are the one exception, and a deliberate one. 0.548 and
0.5625 are close but not equal, and at 360px wide that is 17px of difference
showing as one tile ending lower than the other. They share a 9:16 frame in CSS
so the row has a straight bottom edge; the 23px that trims off the taller
thumbnail is 2.6% of a still, and `--ar` is untouched, so the player still opens
at the clip's real shape.

### The thumbnails

Whole frames, scaled, nothing cropped:

    ffmpeg -i out.mp4 -frames:v 1 -vf "scale=480:-2:flags=lanczos" \
      -c:v libwebp -quality 66 -compression_level 6 out-poster.webp

480 wide covers the 360px a vertical tile is ever given; the landscape one is
768. All three together are 60KB. They are real `<img class="reel__thumb"
loading="lazy">` elements, not CSS backgrounds: a background image is fetched as
soon as its element is laid out, wherever on the page that element sits, and
these tiles are a long way below the fold.

## Cut the head off the file, never at play time

`reel-1-v11.mp4` is made from a screen recording of a Facebook post, and the
recording opens on about a second of a **"Video unavailable"** card, then black,
then a loading spinner, before the clip itself starts.

That used to be shipped in the file, with `data-start="1.7"` on the tile and a
seek in the script to skip it. It never worked. A browser paints frame zero while
it seeks, and the poster is dropped the moment playback is asked for, so every
single press flashed the error card first — which is exactly what "the first two
seconds are nothing" means when someone reports it.

**A head you have to skip is a head that should not be in the file.** Find the
first frame of real picture, and cut there in the encode:

    # sample the opening at 4fps and look at it
    ffmpeg -t 3.6 -i source.mp4 -vf "fps=4,scale=160:-1,tile=7x2" -frames:v 1 head.png

`data-start` no longer exists. Do not put it back.

## Getting a source into shape

There is no reshaping any more. Each clip is encoded at its **own** aspect ratio,
whole, and the player gives it a box that matches. No crop, no blurred band,
nothing added and nothing taken away.

**Shot vertical** (`reel-1-v11.mp4`, from an 870x1588 phone recording — the file
reads 1588x870 with a -90 rotation, which ffmpeg applies on its own):

    ffmpeg -ss <cut> -i source.mp4 -ss <cut> -i audio-source.mp4 -filter_complex "
      [0:v]scale=720:-2:flags=lanczos,setsar=1,fps=30,format=yuv420p[v]" \
      -map "[v]" -map 1:a -shortest -c:v libx264 -profile:v high -level 4.0 \
      -preset slow -crf 26 -g 60 -keyint_min 60 -sc_threshold 0 \
      -c:a aac -b:a 96k -ac 2 -ar 44100 -movflags +faststart out.mp4

720 wide is a downscale from 870, so the picture stays sharper than any box the
page will ever give it.

**Shot landscape** (`reel-2-v10.mp4`, from a 1280x614 podcast edit): the same
thing with the scale dropped, since it is already at a sensible size. It keeps
its 2.085:1 exactly — there are no 53px blurred bands top and bottom to make it
16:9 any more, because it does not have to be 16:9:

    [0:v]setsar=1,hqdn3d=2:1.5:4:4,fps=30,format=yuv420p[v]

`hqdn3d` is there because that source is already lossy at about 750kbps, and a
re-encode otherwise spends real bits preserving its own compression artefacts.

Whatever you encode, put its width over its height in the tile's `--ar`.

### The watermark

An earlier cut of the second clip came from an export with a **`clideo.com`
watermark burned into the bottom-right corner**, and the vertical version that
shipped before this one had to pan a narrow window around it, shot by shot, to
keep it out.

That is all gone. The landscape source used here (`1280x614`, 2.085:1) is the
same edit with the bottom 318 rows of the 3840x2160 original already dropped —
which is where the watermark lived. Checked across the whole clip, corner
sampled every four seconds: clean. **Anything new arriving with a watermark gets
cropped out at the source, not worked around in the player.**

### The third tile

`reel-3` is a YouTube Short and is not ours to re-encode. It used to be the tile
with the blurred sides, because an iframe's picture cannot be cropped from
outside it and there was genuinely nothing to be done about it. The player fixed
that for free: the embed gets a 9:16 box and fills it, with no black bars of its
own.

Only its thumbnail is ours — `reel-3-poster-v8.webp`, 432x768, the whole frame
at the Short's own 9:16, drawn from the clip rather than pulled from
`i.ytimg.com` (which answers with a grey placeholder rather than a 404 when a
Short has no thumbnail in the size asked for).

If a self-hosted file for it ever arrives, drop it in, swap `data-embed` for
`data-video`, set `--ar`, and it behaves exactly like the other two.

## 30fps, not 60

Both sources were 59.94fps. Talking heads with burned-in captions gain nothing
from it, and halving the frame rate halves the decoding a phone has to do to
keep up — which is most of what "the video stutters" turns out to be. `fps=30`
is in the filter chain above; leave it there.

## Sound

Both files keep their audio (AAC 96k), and both measure about -18.6 dB mean, so
they are level with each other. Pressing play is a user gesture, so the clip is
allowed its sound and starts unmuted; if a browser refuses anyway the script
retries muted rather than leaving a dead player.

Neither audio track comes from its own video source, so **both are muxed and
both can drift if you are careless**:

- The first clip's own recording carries a full AAC track that is digital
  silence end to end (`volumedetect` reports mean and max of -91 dB, the noise
  floor of an empty stream). The sound was recovered from a second, quarter-
  resolution copy that ran 1.1417s behind, and that offset is already baked into
  `reel-1-v7.mp4` — which is why the encode above takes video from the screen
  recording and audio from `reel-1-v7.mp4`, with **the same `-ss` on both**.
- The second clip's landscape source has no audio at all. It is taken from
  `reel-2-v8.mp4`, which is the same edit at the same 33.074708s duration and
  the same timeline; captions line up frame for frame at 20s.

Check any new clip before shipping it:

    ffmpeg -i clip.mp4 -map 0:a -af volumedetect -f null /dev/null

A clip is **torn down when the player is closed** — paused, its source dropped,
`load()` called, the element removed. Pausing alone is not enough: a paused
`<video>` keeps its decoder and its buffer, so without that the clip goes on
running behind the page after someone has closed it.

## Keep them small, and always faststart

`-movflags +faststart` is not optional: it is what lets playback begin before the
file has finished arriving. Aim for 3-4 MB per clip. They are fetched only when a
tile is pressed, so they cost nothing on load.

If a re-encode comes out heavy, raise the CRF before you touch the resolution —
a source that is already lossy (the 1280x614 podcast is ~750kbps) spends real
bits preserving its own compression artefacts, and `hqdn3d=2:1.5:4:4` in front of
the encoder takes most of that back for nothing visible.

## Filenames carry a version

`/assets/clips` is served `immutable` for a year (see `vercel.json`) and these
files carry no content hash, so a re-encode **must** land under a new name
(`-v10` -> `-v11`) and the reference in `index.html` must move with it. Overwriting
a name in place means every browser that already holds the old copy keeps showing
it, effectively for ever.
