# The World Today — 23 November 2026

A program that draws a newspaper front page for Monday 23 November
2026 as a single 1024x1024 PNG. Built for the make.fun news-image
bounty: the image names the day and shows that day's most
consequential world stories.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png`. Node 22, standard library only — no
network, no randomness, no wall clock. Running it twice produces a
byte-identical PNG.

## What it draws

- Masthead "THE WORLD TODAY" with the date "MONDAY 23 NOVEMBER 2026"
- Lead story: NATO meets today in Brussels after Russian missiles
  fell in Poland
- Five more stories: COP31 collapses, Gulf on edge, 14 missing in
  Kyiv, cartel boss caught, Myanmar guilty
- A ticker with the day's other big stories, including the Sparta II
  fire in the Baltic and the Indonesia factory fire

All text is drawn with a compact 5x7 bitmap font written for this
program, and the PNG is encoded with the standard library only.
