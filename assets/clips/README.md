# Reel clips

Self-hosted video for the three tiles in the Work section.

## One shape: 16:9, edge to edge

Every tile is **16:9** and the two clips we host are encoded **1280x720**, so the
video fills the tile corner to corner. Landscape is the shape a video player is
and the shape a visitor already reads as "a video"; a column of vertical tiles
reads as three phone screenshots.

**The box is filled with real picture.** No black bars, and no blurred filler
either — a blurred band reads as a video that did not fit, which is the thing it
was meant to hide.

A landscape source needs nothing: it goes in at its native width. A source shot
vertical is **cropped** to the widest 16:9 window its frame can give. For an
870x1588 phone recording that window is 870x489 — the full width and a third of
the height. Using less width does not help; the window is already as large as
16:9 allows.

Two thirds of the height goes, so **where the window sits is the whole
decision**, and it is made by what has to survive, not by centring. See "Placing
the window" below.

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

`reel-1-v10.mp4` is made from a screen recording of a Facebook post, and the
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

**Shot vertical** (`reel-1-v10.mp4`, from an 870x1588 phone recording — the file
reads 1588x870 with a -90 rotation, which ffmpeg applies on its own, so the crop
below is written against the upright frame):

    ffmpeg -ss <cut> -i source.mp4 -ss <cut> -i audio-source.mp4 -filter_complex "
      [0:v]crop=870:489:0:<offset>,scale=1280:720:flags=lanczos,setsar=1,
           fps=30,format=yuv420p[v]" \
      -map "[v]" -map 1:a -shortest -c:v libx264 -profile:v high -level 4.0 \
      -preset slow -crf 25 -g 60 -keyint_min 60 -sc_threshold 0 \
      -c:a aac -b:a 96k -ac 2 -ar 44100 -movflags +faststart out.mp4

**Shot landscape** (`reel-2-v9.mp4`, from a 1280x614 podcast edit): it is already
the right shape and goes in at its native width, untouched. 1280x614 is 2.085:1
against the tile's 1.78:1, so it is 53px short top and bottom; that gap alone is
filled from a blurred, darkened copy of the frame, which at 53px out of 720 is
not something you notice:

    [0:v]setsar=1,hqdn3d=2:1.5:4:4,split=2[fg][bs];
    [bs]scale=1280:720:force_original_aspect_ratio=increase:flags=fast_bilinear,
        crop=1280:720,gblur=sigma=26,eq=brightness=-0.22:saturation=0.90:contrast=0.92[bg];
    [bg][fg]overlay=0:(H-h)/2:shortest=1,fps=30,format=yuv420p[v]

## Placing the window

`crop`'s `<offset>` is the only real judgement in the whole recipe, and centring
is almost always wrong. On the first clip the frame holds, top to bottom: the
speaker's head (source y 65-630), the burned-in caption line (650-760, varying by
a few tens of pixels with the line), the client's logo (890-1130) and a banner
(1110-1300). A 489-tall window cannot hold the head and the caption at once —
they span 700 together.

**The caption wins.** It is the client's own edit and the reason the reel is on
this page; a clip of a man talking with the words stripped off is not a portfolio
piece. So the window sits at **y=300**: the lowest offset that still clears the
lowest caption in the clip. Above it a caption gets cut. Below it the framing
loses more of the face and buys nothing, because the caption is already whole.

Do not take this from one frame. Sample across the clip — captions are not all
the same height, and the shot that opens the file is often the tightest one:

    for T in 4.2 8.6 11.3 14.45 17.8 20.4 23.2; do
      ffmpeg -ss $T -i source.mp4 -frames:v 1 -vf "crop=870:489:0:300,scale=300:-1" p-$T.png
    done

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

`reel-3` is a YouTube Short and is not ours to re-encode, so it is an embed — and
it is therefore the one tile that **cannot** be cropped to fill. An iframe's
picture cannot be windowed from outside it. So its poster carries a blurred 16:9
fill baked into the image and `main.js` lays the iframe over that, held at the
Short's own 9:16 down the middle at full tile height.

The alternative is worse: let the embed span the whole 16:9 box and YouTube
pillarboxes the Short in flat black.

**Get the source file and this goes away.** Drop a self-hosted mp4 in here, swap
`data-embed` for `data-video` on the tile, and it takes the same crop-to-fill as
the two beside it — at which point the poster below is a plain first-frame grab
like the other two.

Until then, the blurred poster is built from the 9:16 one:

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
(`-v9` -> `-v10`) and the reference in `index.html` must move with it. Overwriting
a name in place means every browser that already holds the old copy keeps showing
it, effectively for ever.
