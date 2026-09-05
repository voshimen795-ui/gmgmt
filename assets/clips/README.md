# Reel clips

Self-hosted video for the three tiles in the Work section.

## One shape: 9:16, edge to edge

Every tile is **9:16** and every clip is encoded **720x1280**, so the video
fills the tile corner to corner — the same way the YouTube short in the third
tile fills its frame. **No letterboxing and no blurred filler, on any of them.**
A picture floating in the middle of a box it does not fit does not read as a
video; it reads as a video that has been cut up. Whatever the source shape,
the clip is made to fill.

The poster is a frame of the finished file taken at the clip's own start
offset, so the picture does not change at the moment of pressing. It is a real
`<img class="reel__thumb" loading="lazy">` in the tile, not a CSS background:
a background image is fetched as soon as its element is laid out, wherever on
the page that element sits, and these tiles are a long way below the fold.

    ffmpeg -ss <start> -i out.mp4 -frames:v 1 -vf "scale=432:768:flags=lanczos" \
      -c:v libwebp -quality 68 -compression_level 6 out-poster.webp

432 wide covers the 320px the tile is ever given, and all three together are
60KB.

## Getting a source into that shape

**Already vertical** (`reel-1-v7.mp4`, from a 870x1588 phone recording): scale
to 1280 tall and fill the few pixels either side from a blurred copy, so
nothing at all is cropped:

    ffmpeg -i source.mp4 -filter_complex "
      [0:v]scale=-2:1280,setsar=1,split=2[fg][bg];
      [bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=26[back];
      [back][fg]overlay=(W-w)/2:0,format=yuv420p[v]" \
      -map "[v]" -map 0:a -c:v libx264 -profile:v main -level 3.1 -preset slow \
      -crf 28 -g 48 -c:a aac -b:a 96k -ac 2 -movflags +faststart out.mp4

**Landscape** (`reel-2-v8.mp4`, from a 3840x2160 podcast edit): this one has
to be cropped, because a 9:16 tile fed from a 2.09:1 source either crops or
does not fill, and it has to fill — a picture floating between blurred bands
does not read as a video, it reads as a video that has been cut up.

The trick is not to throw away the bottom of the frame. The `clideo.com`
watermark burned into the export sits only in the bottom-right corner, in a
box measured at roughly **x 2770-3730, y 1870-2040**. Anything to the left of
x=2770 is clean picture all the way down. So instead of dropping the bottom
320 rows and cropping 1035x1840 out of what is left — 27% of the frame width —
the window keeps the **full 2160 rows** and is 1215 wide, and is simply never
allowed past x=1555 so the watermark stays outside it:

    ffmpeg -i source.mp4 -filter_complex "
      [0:v]crop=w=1215:h=2160:x='<per-shot expr, clamped to 0..1555>':y=0,
      setsar=1,scale=720:1280,format=yuv420p[v]" \
      -map "[v]" -map 0:a ... same codec flags ...

That is 17% more picture across and 17% more down than the version that was
too tight, and it fills the tile with nothing added. Two short B-roll shots
whose subject sits far right get clamped and lose their ideal framing; they
are under a second between them.

Because the source is a cut edit and not one locked-off shot, the window
**pans per shot**. Cuts were found with ffmpeg's `scene` filter and each of
the 23 shots was given its own `x`, so it sits on whoever is talking instead
of staying still and losing them. The `x` only changes on a cut, so the move
is invisible.

A window that narrow cannot hold both the speaker on the left of the frame
and the burned-in caption text on the right. The speaker wins.

## Sound

Both files keep whatever audio their source had (`-map 0:a`, AAC 96k). Pressing
play is a user gesture, so the clip is allowed its sound and starts unmuted; if
a browser refuses anyway the script retries muted rather than leaving a dead
tile.

The first clip's audio had to be recovered. The original upload carried a full
AAC track that was digital silence end to end — `volumedetect` reported a mean
and a max of -91 dB, the noise floor of an empty stream — so no encoding
setting could have brought it back. A second copy of the same reel turned up
with the sound intact but at 360x640, a quarter of the resolution.

Rather than ship the small one, the audio was lifted off it and muxed onto the
sharp video. The two copies are the same cut but not the same timeline: the
low-resolution one runs **1.1417s behind**. That offset was measured, not
guessed — PSNR between the two, scanned at half-second steps, then at frame
steps around the peak, giving a clear maximum at -1.1417 that four frame pairs
then confirmed by eye (identical burned-in captions at 5s, 12s, 18s and 22s):

    ffmpeg -ss $((6+d)) -t 10 -i sharp.mp4 -ss 6 -t 10 -i with-sound.mp4 \
      -filter_complex "[0:v]scale=180:320,setpts=PTS-STARTPTS[a];
                       [1:v]scale=180:320,setpts=PTS-STARTPTS[b];[a][b]psnr" \
      -f null /dev/null

The audio input is then trimmed by that much before muxing, so `-ss 1.1417`
goes on the second input and the map is `-map "[v]" -map 1:a`. Its last 1.2s
run silent, which is the logo end card.

Both clips now measure about -18.6 dB mean, so they are level with each other.

Check any new clip before shipping it:

    ffmpeg -i clip.mp4 -map 0:a -af volumedetect -f null /dev/null

A reel that the visitor pressed is **paused** when it scrolls out of view and
is not resumed on the way back — a clip that starts talking again on its own
is worse than one that waits.

## Keep them small, and always faststart

`-movflags +faststart` is not optional: it is what lets playback begin before
the file has finished arriving. Aim for 3-4 MB per clip. They are fetched only
when a tile is pressed, so they cost nothing on load.

## Filenames carry a version

`/assets` is served with a long cache life and these files carry no content
hash, so a re-encode **must** land under a new name (`-v7` -> `-v8`) and the
reference in `index.html` must move with it. Overwriting a name in place means
phones that already hold the old copy keep showing it, possibly for weeks.
