# Reel clips

Posters for the three tiles in the Work section.

**Nothing is hosted here any more.** All three tiles are embeds — two on Vimeo,
one on YouTube — so each is a poster and a URL. This directory went from 7MB to
76KB when the last mp4 left it.

The encoding recipes below are kept because they are the argument for why the
clips look the way they do, and because the next clip may well arrive as a file.

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
    │         16:9          │     reel-2 (1.7778)
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
768. All three together are 60KB.

**Take the frame from a still moment, not just any moment.** These clips animate
their burned-in captions, and a frame grabbed mid-transition gives you a smeared
band of yellow where a readable line should be — which is what the first tile
shipped with until someone looked at it on a phone. Sample a spread and pick one
where the caption has landed:

    for T in 3.2 4.6 6.1 7.4 10.2 13.1; do
      ffmpeg -ss $T -i source.mp4 -frames:v 1 -vf "scale=190:-1" tn-$T.png
    done

Take it from the sharpest source you have rather than from whatever the tile
happens to be pointing at. `reel-1-poster-v13.webp` comes off the 6.1Mbps screen
recording, not off the 720-wide encode that used to sit in this directory, and
certainly not off the embed — which cannot be sampled at all. They are real `<img class="reel__thumb"
loading="lazy">` elements, not CSS backgrounds: a background image is fetched as
soon as its element is laid out, wherever on the page that element sits, and
these tiles are a long way below the fold.

## Cut the head off the file, never at play time

The first clip is made from a screen recording of a Facebook post, and **the
recording opens on about a second of a "Video unavailable" card, then black,
then a loading spinner**, before the clip itself starts.

That used to be shipped in the file, with `data-start="1.7"` on the tile and a
seek in the script to skip it. It never worked. A browser paints frame zero while
it seeks, and the poster is dropped the moment playback is asked for, so every
single press flashed the error card first — which is exactly what "the first two
seconds are nothing" means when someone reports it. It was cut in the encode
instead, at 0.95s, the first frame of real picture.

**That cut lives in the file, so it only holds for as long as the file does.**
The tile is a Vimeo embed now, and if what was uploaded there is the raw screen
recording rather than the trimmed cut, the error card is back and nothing on this
page can hide it — an iframe's timeline is not ours. Check the opening second of
the upload; trim it at the source if it is there.

Find the first frame of real picture the same way it was found here:

    # sample the opening at 4fps and look at it
    ffmpeg -t 3.6 -i source.mp4 -vf "fps=4,scale=160:-1,tile=7x2" -frames:v 1 head.png

`data-start` no longer exists, and would not help an embed even if it did. Do not
put it back.

## Getting a source into shape

There is no reshaping any more. Each clip is encoded at its **own** aspect ratio,
whole, and the player gives it a box that matches. No crop, no blurred band,
nothing added and nothing taken away.

**Shot vertical** (this was `reel-1-v11.mp4`, from an 870x1588 phone recording — the file
reads 1588x870 with a -90 rotation, which ffmpeg applies on its own):

    ffmpeg -ss <cut> -i source.mp4 -ss <cut> -i audio-source.mp4 -filter_complex "
      [0:v]scale=720:-2:flags=lanczos,setsar=1,fps=30,format=yuv420p[v]" \
      -map "[v]" -map 1:a -shortest -c:v libx264 -profile:v high -level 4.0 \
      -preset slow -crf 26 -g 60 -keyint_min 60 -sc_threshold 0 \
      -c:a aac -b:a 96k -ac 2 -ar 44100 -movflags +faststart out.mp4

720 wide is a downscale from 870, so the picture stays sharper than any box the
page will ever give it.

**Shot landscape** — there is no longer a file for this. The Long-form tile used
to carry `reel-2-v10.mp4`, a 33-second 2.085:1 slice of the client's podcast cut,
and it now points at the whole thing on Vimeo instead. Long-form is the point of
that tile and a trimmed copy was making the argument with the wrong evidence. If
a landscape source ever does need hosting here, it goes in at its native size
with the scale dropped:

    [0:v]setsar=1,hqdn3d=2:1.5:4:4,fps=30,format=yuv420p[v]

`hqdn3d` is there because that source is already lossy at about 750kbps, and a
re-encode otherwise spends real bits preserving its own compression artefacts.

Whatever you encode, put its width over its height in the tile's `--ar`.

### The watermark

An earlier cut of the second clip came from an export with a **`clideo.com`
watermark burned into the bottom-right corner**, and the vertical version that
shipped before this one had to pan a narrow window around it, shot by shot, to
keep it out.

That is all gone twice over: the vertical crop was replaced by a clean landscape
source (`1280x614`, the same edit with the bottom 318 rows of the 3840x2160
original already dropped — which is where the watermark lived, checked across the
whole clip with the corner sampled every four seconds), and that file has since
been replaced by the Vimeo embed of the full cut. **Anything new arriving with a
watermark gets cropped out at the source, not worked around in the player.**

### All three are embeds

None of the three is ours to host any more, so each is a poster and an iframe,
and all three open in the same player.

**Vimeo** carries the first tile (`1224358039`) and the Long-form one
(`1224354817`). Two parts of those URLs are not optional: `h=` is the video's
privacy hash, without which the player will not load an unlisted video at all,
and `dnt=1` asks Vimeo not to track. `title`, `byline` and `portrait` are off so
the player opens on the picture rather than on its own furniture.

**YouTube** carries the Short (`WZF_Tt_xNAQ`), on `youtube-nocookie`.

An iframe cannot be asked what shape it is, so **`--ar` is the only thing that
knows**. Both providers hand out a copy-paste snippet sized 640x360 whatever the
video actually is; ignore it and set the clip's real ratio, or a vertical clip
will letterbox inside a 16:9 box.

Posters are ours either way. `reel-3-poster-v8.webp` is drawn from the clip
rather than pulled from `i.ytimg.com`, which answers with a grey placeholder
rather than a 404 when a Short has no thumbnail in the size asked for.
`reel-2-poster-v12.webp` is a 16:9 frame cut from the local slice the tile used
to carry — the same shot, and honest, but Vimeo's own thumbnail would be better
and could not be reached from the machine that built it:

    curl -s "https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F<id>%2F<hash>"

### Warming the connection

Nothing is asked of either provider until a tile is pressed. That is the right
default — it is why the page contacts nobody on arrival — and it means the press
pays for the introduction: a DNS lookup, a TCP connection and a TLS handshake
before a byte of player is on the wire.

So the handshake moves off the press without the fetch moving with it. A tile
preconnects its origins the first time it is **hovered, focused or touched**, all
of which come before the press. A visitor who never goes near a tile still asks
those hosts for nothing.

There is deliberately no `crossorigin` on those links. An iframe is a credentialed
navigation, and an anonymous preconnect opens a connection in the wrong pool that
the iframe cannot then reuse — all of the cost and none of the saving.

## 30fps, not 60

Both sources were 59.94fps. Talking heads with burned-in captions gain nothing
from it, and halving the frame rate halves the decoding a phone has to do to
keep up — which is most of what "the video stutters" turns out to be. `fps=30`
is in the filter chain above; leave it there.

## Sound

Every clip carries its own audio now, because every clip is on someone else's
player. What is worth remembering is why the one we hosted needed care: **its
audio did not come from its own video**.

The screen recording's AAC track was digital silence end to end — `volumedetect`
reported a mean and a max of -91 dB, the noise floor of an empty stream. The
sound was recovered from a second, quarter-resolution copy that ran **1.1417s
behind**, an offset measured rather than guessed, and muxed on with the same
`-ss` applied to both inputs. It landed at about -18.7 dB mean, level with the
other clip.

If the Vimeo upload was made from the silent original rather than from that
muxed file, it is a silent video. Check before assuming, the same way:

    ffmpeg -i clip.mp4 -map 0:a -af volumedetect -f null /dev/null

Pressing play is a user gesture, so a clip is allowed its sound and gets it.

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
