# Reel clips

Self-hosted video for the three tiles in the Work section.

## The tile is 16:9. The clips are not.

Every tile in the row is **16:9** — landscape, the shape a video player is —
and its thumbnail fills it corner to corner with real picture. No black bars,
no blurred filler, no picture floating in a box it does not fit.

**The thumbnail is the only thing here that is 16:9.** The clips keep their own
shape and open over the page when a tile is pressed.

That split is the whole design, and it exists because of a measurement. Two of
these three were shot vertical, as 9:16 close-ups. A 16:9 window out of a
870x1588 frame is 870x489 — the widest one that frame can give, and a third of
its height. In the first clip **the speaker's head is taller than that window**:
top of the scalp above it, chin below it, at every offset. So playing it inside
the tile leaves exactly two options, and both were tried and both are wrong:

- crop it, and his head is cut off for the whole clip;
- fill the sides with blur, and two thirds of the tile is filler — which reads
  as a video that did not fit, the thing the blur was there to hide.

Out of the tile, neither problem exists. The row stays three uniform landscape
tiles with no blur and no dead space; the clip plays whole. It is also what
finally frees the YouTube Short: an embed cannot be cropped from outside the
iframe at all, so it was stuck with blurred sides, and in the player it simply
opens 9:16 with no black bars.

**A still can be chosen where 700 moving frames cannot.** That is why the
thumbnail crop is free: pick a moment where a 16:9 window falls well — an
exterior, a wide two-shot, a face with room around it — and crop there. The
first tile uses the house exterior at 1.0s for exactly this reason; the third
crops its poster around the face and both caption lines.

    ffmpeg -ss <good moment> -i out.mp4 -frames:v 1 \
      -vf "crop=<w>:<h>:<x>:<y>,scale=768:432:flags=lanczos" \
      -c:v libwebp -quality 66 -compression_level 6 out-poster.webp

768 wide covers the ~400px the tile is ever given at 2x, and all three together
are 36KB. They are real `<img class="reel__thumb" loading="lazy">` elements, not
CSS backgrounds: a background image is fetched as soon as its element is laid
out, wherever on the page that element sits, and these tiles are a long way
below the fold.

The thumbnail no longer has to be the clip's first frame. It used to, so the
picture would not change at the moment of pressing — but pressing now opens a
different surface at a different shape, so there is nothing to match.

## data-ratio

Each tile carries its clip's own width/height as a plain number:

    <figure class="reel" data-reel data-ratio="0.548" ...>

The player sizes itself from that, so the box is the right shape before a byte
of media has arrived instead of opening at some default and jumping. A `<video>`
corrects it from the real frame on `loadedmetadata`, which covers a re-encode
that changed shape without the markup being updated — but get it right in the
markup anyway.

## Cut the head off the file, never at play time

`reel-1-v11.mp4` is made from a screen recording of a Facebook post, and the
recording opens on about a second of a **"Video unavailable"** card, then black,
then a loading spinner, before the clip itself starts.

That used to be shipped in the file, with `data-start="1.7"` on the tile and a
seek in `main.js` to skip it. It never worked. A browser paints frame zero while
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

Whatever you encode, put its width over its height in the tile's `data-ratio`.

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

Only its thumbnail is ours, cropped 16:9 out of the 432x768 poster to hold the
face and both caption lines:

    ffmpeg -i poster-9x16.webp \
      -vf "crop=432:243:0:205,scale=640:360:flags=lanczos" \
      -c:v libwebp -quality 70 -compression_level 6 out-poster.webp

If a self-hosted file for it ever arrives, drop it in, swap `data-embed` for
`data-video`, set `data-ratio`, and it behaves exactly like the other two.

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
