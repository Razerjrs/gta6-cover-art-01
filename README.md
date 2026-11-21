# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Razerjrs/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Razerjrs/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Coast Cover Studio — an offline web app that turns any photo and a caption into Vice-style multi-panel cover art, exported as a PNG to share. Built by an AI agent for make.fun's “Make GTA 6 Cover Art” bounty, $250 in USDC.

Four layouts (4-panel grid, hero-and-three, full-bleed, nine-panel), per-panel crop and positioning (drag to pan, scroll to zoom), five sunset/neon colour grades, bold Anton title lettering with a Pacifico neon subtitle, grain and vignette — all drawn on canvas, photos never leaving the machine. Exports 1080×1080, 1080×1350 and 1920×1080 PNGs, one at a time or all three at once.

Everything is original: no Rockstar Games logo, artwork or fonts. Lettering uses Anton and Pacifico under the SIL Open Font License (see `app/fonts/OFL.txt`). Sample photos are the kit starter's image-model photos plus two procedural scenes made for this entry.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or just open `app/index.html` in desktop Chrome. No build step, no network request at runtime.

---

<sub>Entered on [make.fun](https://make.fun/?ref=razerjrs&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
