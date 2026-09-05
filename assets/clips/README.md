# Reel clips

Self-hosted video for the three tiles in the Work section.

## One shape: 9:16, edge to edge

Every tile is **9:16** and every clip is encoded **720x1280**, so the video
fills the tile corner to corner — the same way the YouTube short in the third
tile fills its frame. No letterboxing, no blurred filler, no picture floating
in the middle of a box it does not fit. A tile that shows a small picture
surrounded by blur reads as a cut-up clip, which is what this replaces.

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

**Already vertical** (`reel-1-v4.mp4`, from a 870x1588 phone recording): scale
to 1280 tall and fill the few pixels either side from a blurred copy, so
nothing at all is cropped:

    ffmpeg -i source.mp4 -filter_complex "
      [0:v]scale=-2:1280,setsar=1,split=2[fg][bg];
      [bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=26[back];
      [back][fg]overlay=(W-w)/2:0,format=yuv420p[v]" \
      -map "[v]" -map 0:a -c:v libx264 -profile:v main -level 3.1 -preset slow \
      -crf 28 -g 48 -c:a aac -b:a 96k -ac 2 -movflags +faststart out.mp4

**Landscape** (`reel-2-v6.mp4`, from a 3840x2160 podcast edit): the bottom
320px is the watermark. A 1035x1840 window out of what is left is exactly 9:16
and fills the tile with no filler at all — but it is only 27% of the frame
width, which is a close-up of one head and loses the room. So the window is
**1600 wide** instead: 42% of the frame, enough to read the set and the second
person, scaled to 720x828 and floated on a blurred copy that fills the rest of
the 720x1280.

That is the trade, and it cannot be avoided: a 9:16 tile fed from a 2.09:1
source either crops hard or does not fill. The blur only runs above and below,
where it reads as the picture continuing, rather than either side of a narrow
strip, where it reads as a clip that has been cut up.

Because the source is a cut edit and not one locked-off shot, that window
**pans per shot**. Cuts were found with ffmpeg's `scene` filter and each of
the 23 shots was given its own `x`, so the window sits on whoever is talking
instead of staying still and losing them. The `x` only changes on a cut, so
the move is invisible.

    ffmpeg -i source.mp4 -filter_complex "
      [0:v]crop=3840:1840:0:0,crop=w=1600:h=1840:x='<per-shot expr>':y=0,
      setsar=1,split=2[fg][bg];
      [bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,
      gblur=sigma=30,eq=brightness=-0.10:saturation=0.8[back];
      [fg]scale=720:828[front];
      [back][front]overlay=0:(H-h)/2,format=yuv420p[v]" \
      -map "[v]" -map 0:a ... same codec flags ...

A window that narrow cannot hold both the speaker on the left of the frame
and the burned-in caption text on the right. The speaker wins.

## Sound

Both files keep whatever audio their source had (`-map 0:a`, AAC 96k). Pressing
play is a user gesture, so the clip is allowed its sound and starts unmuted; if
a browser refuses anyway the script retries muted rather than leaving a dead
tile.

**`reel-1-v4.mp4` is silent, and no encoding setting will change that: the
source file is silent.** It carries a full AAC track that is digital silence
end to end — `volumedetect` reports a mean and a max of -91 dB, which is the
noise floor of an empty stream, and the encoder spends 2 kbit/s on it. The
clip needs to be re-supplied with its audio intact; the tile will pick it up
with no code change. `reel-2-v6.mp4`, for comparison, measures -18.9 dB mean
and -0.4 dB peak.

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
hash, so a re-encode **must** land under a new name (`-v4` -> `-v5`) and the
reference in `index.html` must move with it. Overwriting a name in place means
phones that already hold the old copy keep showing it, possibly for weeks.
