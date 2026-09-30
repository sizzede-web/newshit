# Brandlo – 30s Launch Film

A 30-second, 1920×1080 / 60 fps product-launch video for **Brandlo** (brandlo.de) in German,
built as code with [Remotion](https://remotion.dev) + React Three Fiber.

**Deliverable:** [`renders/brandlo-launch-16x9.mp4`](renders/brandlo-launch-16x9.mp4)

Everything in the film is generated: the 3D products (cup, paper bag, ice-cream bowl) are
modelled in Three.js, the print artwork is drawn to canvas textures, and the soundtrack
(music + sound design) is synthesized sample-by-sample from the same timeline as the
picture, so every cut, hit and whoosh lands on the beat (120 BPM).

## Storyboard

| Time | Scene | What happens |
| --- | --- | --- |
| 0.0–3.5 | **Hook** | Black. Kinetic type on the beat: *„Dein Kaffee geht raus. / Deine Marke geht mit.“* The accent dot of "mit." irises open to fill the frame. |
| 3.5–8.0 | **Reveal** | A 3D coffee cup drops onto an orange stage, spins, and the giant `brandlo` wordmark slams in behind it. Tagline: *Becher & Verpackungen mit deinem Logo.* |
| 8.0–12.0 | **Dein Design** | One design per beat. A glowing print ring scans down the cup and prints eight sample brands in sequence, and the stage recolours to match each one. Copy: *Dein Logo. / Deine Farben. / Dein Design. / Dein Becher.* |
| 12.0–16.0 | **Sortiment** | The camera pulls back into a studio line-up (Kaffeebecher, Papiertüten, Eisbecher & Bowls), then trucks to the bowls: *Von XS bis XXL* (100/250/500 ml). |
| 16.0–19.5 | **Design-Check** | A whip-pan into a macOS-style app: drag-and-drop logo upload, free print check, live 3D preview that prints the logo onto the cup, cursor clicks *Design freigeben*. |
| 19.5–24.0 | **Ablauf** | An iris opens out of the button into a dark scene: a 4-step timeline (Design-Check → Druckfreigabe → Produktion → Lieferung) and odometer stats (5–6 Wochen standard, 3–4 Wochen priority, 0 € hidden costs). |
| 24.0–27.0 | **Markenbotschafter** | A sheet slides up with three bento cards: *Auf der Straße. / Im Büro. / Auf Social Media.* (with a like burst). |
| 27.0–30.0 | **Outro** | *Du sagst „Macht mal“. Wir erledigen den Rest.* → logo lock-up, CTA *Jetzt anfragen*, brandlo.de, product family. |

Content is taken from brandlo.de as indexed by search engines (slogan „Du sagst ‚Macht mal‘,
wir erledigen den Rest“, digital Design-Check with realistic preview, free print-readiness
check, certified production, 5–6 weeks standard / 3–4 weeks Priority-Service, no hidden
costs, cups/bags/ice-cream bowls & food bowls in XS–XXL, 100/250/500 ml).

## Brand assets – please read

The build environment could not reach brandlo.de (network policy blocked the domain), so
**logo, colours and imagery are an art-directed interpretation**, not the official assets.
Everything brand-specific lives in two places, so swapping them is quick:

- `src/brand.ts`: colours, fonts, URL, tagline, motto
- `src/components/Wordmark.tsx` + `drawWordmark()` in `src/three/designs.ts`: the logo
  (replace with the official SVG and a canvas `drawImage` of it)

The customer brands on the cups (Café Nordlicht, Kiez Kaffee, …) are fictional sample
artwork.

## Commands

```bash
npm install
npm run fonts            # copy self-hosted fonts into public/fonts
npm run soundtrack       # synthesize public/audio/soundtrack.wav from src/timeline.ts
node scripts/product-shots.mjs   # render transparent product PNGs used by 2D scenes
npm run studio           # preview/edit in Remotion Studio
npm run render           # → renders/brandlo-launch-16x9.mp4
node scripts/stills.mjs 4.2 9.4 17.9   # review stills at given seconds
```

`remotion.config.ts` points Remotion at the Chromium headless shell pre-installed in the
cloud environment and uses software WebGL (`swangle`). On a normal machine, delete the
`setBrowserExecutable` line (or set `REMOTION_BROWSER=download`) to let Remotion fetch its own.

## Structure

```
src/
  timeline.ts        single source of truth for timing (picture + sound)
  brand.ts           brand tokens
  BrandloLaunch.tsx  main composition (scenes layered by absolute time)
  scenes/            Hook, World (continuous 3D shot), DesignCheck, Process, Ambassador, Outro
  three/             3D models (lathe-turned cup/bowl, bag), baked studio lighting, print textures
  components/        kinetic-type masks, grain, directional blur, wordmark
scripts/
  soundtrack.ts      procedural music + SFX (kick, clap, hats, bass, pads, plucks, risers, …)
  product-shots.mjs  transparent product renders
  stills.mjs / sheet.py   review tooling
```
