# Reel clips

Self-hosted vertical video for the tiles in the Work section.

A tile plays the first file it can from its `data-video` list, muted and
looping, as soon as it scrolls into view. The Facebook tile reads:

    /assets/clips/facebook-reel.mp4

Drop the file at exactly that path and it plays inline. Until then the tile
stays a poster frame and the Facebook embed loads on press, so the page is
never broken by a missing file.

Keep clips small — 9:16, a few seconds, a couple of MB. `.mp4` (H.264) plays
everywhere; `.webm` works as a second entry in the list.
