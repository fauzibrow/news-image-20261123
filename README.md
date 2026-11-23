[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/fauzibrow/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/fauzibrow/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

# Monday 23 November 2026 — the world's news in one image

A 1024×1024 broadsheet that sums up Monday 23 November 2026 in a single
picture: **40 stories · 7 regions · 12 fields**. The three drawn lead
panels are NATO's emergency session on Poland, Bahrain taking Iran to the
UN Security Council, and Trump's push for a permanent deal. Around them: a
real world map with numbered pins and per-region counts, a UTC timeline
strip, about ten drawn picture stories, region-grouped briefs with a
verification badge and named source on every story (CONFIRMED / REPORTED /
CLAIM), a HOW TO READ box, and a DATE CHECK box that throws out stale
news — the COP31 collapse, the Iran-Bahrain strike and the Dymer drone
were 22 November leads, so only their Monday fallout belongs here.

The poster is drawn with Pillow (`build_poster23.py`, no AI faces or
photos); every fact comes from `news23-research-brief.md`.

## Run it

`main.ts` validates the poster and writes it to the output directory:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
MAKEFUN_OUTPUT_DIR=out node main.ts --verify
```

It checks the PNG signature, the IHDR dimensions (1024×1024, 8-bit RGB),
every chunk's CRC, the IDAT inflate size, and the exact sha256 of the
poster (`e3da4ca0…9b9`, 196,021 bytes). `--verify` never rewrites: it
reads the existing output and checks it against the same poster.

Exit codes: 0 ok · 1 source missing or invalid · 2 (verify) output
missing · 3 (verify) sha mismatch · 4 (verify) byte size or dimensions
wrong · 5 (verify) signature or chunk CRC broken · 6 (verify) IDAT
inflate size wrong.

## Files

- `entry.png` — the poster (1024×1024, 196,021 bytes)
- `main.ts` — the validator / shipper (Node 24, no dependencies)
- `build_poster23.py` — the Pillow generator that drew the poster
- `LICENSE` — MIT
