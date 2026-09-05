# Reel clips

Self-hosted video for the three tiles in the Work section.

## The shared frame

Every tile — poster and player alike — is a **1280×720** file holding a
**364×664 vertical picture centred on a blurred copy of itself**. That is the
only geometry the layout knows about, so all three tiles line up whatever the
source footage was. Inner aspect is 364/664 ≈ 0.548.

A landscape source therefore has to be cut down to a vertical window before it
goes in the frame. `reel-2-v3.mp4` came from a 3840×2160 landscape podcast edit:
the bottom 320px (watermark) is dropped, then a 1008×1840 window is taken out of
the remaining 3840×1840 — 1008/1840 is the same 0.548 — and scaled to 364×664.

Because the source is a cut edit and not a single locked-off shot, the window
**pans per shot**: cuts were detected with ffmpeg's `scene` filter and each shot
was given its own `x`, so the window sits on whoever is talking instead of
staying still and losing them. The `x` only ever changes on a cut, so the move
is invisible. A vertical window that narrow cannot hold both the speaker (left
of frame) and the burned-in caption text (right of frame) — the speaker wins.

## Encoding

    ffmpeg -i source.mp4 -filter_complex "
      [0:v]crop=3840:1840:0:0,crop=w=1008:h=1840:x='<per-shot expr>':y=0,setsar=1,split=2[fg][bg];
      [bg]scale=1280:-2,crop=1280:720,gblur=sigma=28,eq=brightness=-0.12:saturation=0.85[back];
      [fg]scale=364:664[front];
      [back][front]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]" \
      -map "[v]" -an -c:v libx264 -profile:v main -level 3.1 -preset slow \
      -crf 27 -g 48 -movflags +faststart out.mp4

An already-vertical source skips the two `crop` steps and goes straight to
`split`. Keep each file around 2–3 MB; `-movflags +faststart` is not optional,
it is what lets playback begin before the file has finished arriving.

The poster is one frame of the finished file, so the tile never jumps when the
player mounts over it:

    ffmpeg -ss 0.5 -i out.mp4 -frames:v 1 -c:v libwebp -quality 72 out-poster.webp

## Filenames carry a version

`/assets` is served with a long cache life and these files have no content hash,
so a re-encode **must** land under a new name (`-v2` → `-v3`) and the reference
in `index.html` must move with it. Overwriting a name in place means phones that
already hold the old copy keep showing it, possibly for weeks.
