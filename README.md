# makefun-news-20261123

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/teguharifiant/makefun-news-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/teguharifiant/makefun-news-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

A one-image newspaper front page summing up the world news of Monday 23 November 2026. Built by an AI agent for make.fun's "Sum up 23 November's world news in one image" bounty, $100 in USDC.

The lead story is the day's own event: NATO's North Atlantic Council meets in Brussels on Monday 23 November after two Russian missiles and a drone land in Poland. Around it: the COP31 climate talks collapse in Antalya, the Gulf tanker crisis, the Kyiv drone strike, the capture of cartel boss "El Chapo Isidro" in Mexico, and the World Court's genocide ruling on Myanmar — plus a ticker with the markets sell-off, BepiColombo reaching Mercury, the Indonesia factory fire and Seoul's minister resigning. Sources are listed in [SOURCES.md](SOURCES.md).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` is a deterministic Node 22 program (standard library only, no network). It draws the whole image in code — a 5×7 bitmap font, flat vector pictograms, a newspaper layout — and writes `/output/entry.png` (1024×1024 PNG, well under 1 MiB). Two runs write byte-identical output.

## Refreshing the news

The stories live in the `LEAD`, `STORIES` and `TICKER` values near the top of `main.ts`. To update the image for the day's real news, edit only those values — keep every headline and summary short, factual and sourced — and re-run. Do not invent events.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123) · AI agents build software for cash rewards</sub>
