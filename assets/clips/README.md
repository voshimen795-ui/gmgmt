# Reel clips

Self-hosted video for the three tiles in the Work section.

## One shape: 16:9, edge to edge

Every tile is **16:9** and the two clips we host are encoded **1280x720**, so the
video fills the tile corner to corner. Landscape is the shape a video player is
and the shape a visitor already reads as "a video"; a column of vertical tiles
reads as three phone screenshots.

Filling a 16:9 box from a source that was shot vertical is a choice between
cropping the picture and filling the frame some other way. **We fill.** The
foreground is the whole frame, uncropped, at the tile's full height; either side
of it is a blurred, darkened, slightly desaturated copy of the same frame,
scaled to cover. Nothing is cut off, there are no black bars, and the box is
full. It is what YouTube does with a vertical upload, for the same reason.

The poster is the clip's own **first frame** at 768x432, so the picture does not
change at the moment of pressing. It is a real `<img class="reel__thumb"
loading="lazy">` in the tile, not a CSS background: a background image is
fetched as soon as its element is laid out, wherever on the page that element
sits, and these tiles are a long way below the fold.

    ffmpeg -i out.mp4 -frames:v 1 -vf "scale=768:432:flags=lanczos" \
      -c:v libwebp -quality 64 -compression_level 6 out-poster.webp

768 wide covers the ~400px the tile is ever given at 2x, and all three together
are 36KB.

## Cut the head off the file, never at play time

`reel-1-v9.mp4` is made from a screen recording of a Facebook post, and the
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

**Shot vertical** (`reel-1-v9.mp4`, from an 870x1588 phone recording — the file
reads 1588x870 with a -90 rotation, which ffmpeg applies on its own). Scale the
whole frame to 720 tall and fill the 886px either side of it from a blurred,
darkened copy, so nothing at all is cropped:

    ffmpeg -ss <cut> -i source.mp4 -ss <cut> -i audio-source.mp4 -filter_complex "
      [0:v]scale=-2:720:flags=lanczos,setsar=1,split=2[fg][bs];
      [bs]scale=1280:720:force_original_aspect_ratio=increase:flags=fast_bilinear,
          crop=1280:720,gblur=sigma=32,eq=brightness=-0.22:saturation=0.90:contrast=0.92[bg];
      [bg][fg]overlay=(W-w)/2:0:shortest=1,fps=30,format=yuv420p[v]" \
      -map "[v]" -map 1:a -c:v libx264 -profile:v high -level 4.0 -preset slow \
      -crf 24 -g 60 -keyint_min 60 -sc_threshold 0 \
      -c:a aac -b:a 96k -ac 2 -ar 44100 -movflags +faststart out.mp4

**Shot landscape** (`reel-2-v9.mp4`, from a 1280x614 podcast edit): it is already
the right shape, so it goes in at its native width, untouched, with 53px of the
same blurred fill above and below. Same filter graph with the overlay at
`0:(H-h)/2` and the split taken straight off `[0:v]`.

Both foregrounds are the complete frame. Neither clip is cropped.

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

`reel-3` is a YouTube Short and is not ours to re-encode, so it is an embed. It
gets the same landscape box anyway: its poster carries the identical 16:9 blurred
fill, baked into the image, and `main.js` lays the iframe over it held at the
Short's own 9:16 down the middle at full tile height. Same tile, same
edge-to-edge picture, and no black bars of the player's own.

    ffmpeg -i poster-9x16.webp -filter_complex "
      [0:v]scale=-2:432:flags=lanczos,setsar=1,split=2[fg][bs];
      [bs]scale=768:432:force_original_aspect_ratio=increase,crop=768:432,
          gblur=sigma=20,eq=brightness=-0.22:saturation=0.90:contrast=0.92[bg];
      [bg][fg]overlay=(W-w)/2:0[v]" -map "[v]" -frames:v 1 \
      -c:v libwebp -quality 64 -compression_level 6 out-poster.webp

## 30fps, not 60

Both sources were 59.94fps. Talking heads with burned-in captions gain nothing
from it, and halving the frame rate halves the decoding a phone has to do to
keep up — which is most of what "the video stutters" turns out to be. `fps=30`
is in the filter chain above; leave it there.

## Sound

Both files keep their audio (AAC 96k), and both measure about -18.6 dB mean, so
they are level with each other. Pressing play is a user gesture, so the clip is
allowed its sound and starts unmuted; if a browser refuses anyway the script
retries muted rather than leaving a dead tile.

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

A reel that the visitor pressed is **paused** when it scrolls out of view and is
not resumed on the way back — a clip that starts talking again on its own is
worse than one that waits.

## Keep them small, and always faststart

`-movflags +faststart` is not optional: it is what lets playback begin before the
file has finished arriving. Aim for 3-4 MB per clip. They are fetched only when a
tile is pressed, so they cost nothing on load.

If a re-encode comes out heavy, raise the CRF before you touch the resolution —
a source that is already lossy (the 1280x614 podcast is ~750kbps) spends real
bits preserving its own compression artefacts, and `hqdn3d=2:1.5:4:4` ahead of
the split takes most of that back for nothing visible.

## Filenames carry a version

`/assets/clips` is served `immutable` for a year (see `vercel.json`) and these
files carry no content hash, so a re-encode **must** land under a new name
(`-v8` -> `-v9`) and the reference in `index.html` must move with it. Overwriting
a name in place means every browser that already holds the old copy keeps showing
it, effectively for ever.
