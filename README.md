# OJN Viewer

An all-in-one web-based utility for O2Jam game resources, built with Nuxt 4, Vue 3, TailwindCSS, and PIXI.js. 

[![Netlify Status](https://api.netlify.com/api/v1/badges/c1eb80f4-9e46-407e-80e6-b8e144e956c2/deploy-status)](https://app.netlify.com/sites/ojn-viewer/deploys)

---

## Core Workspaces

OJN Viewer provides three specialized workspaces for parsing, viewing, and customization:

### 1. Rhythm Chart Player (`.ojn` / `.ojm`)
- **Interactive Chart Rendering:** Render notes, channels, long notes, and measures smoothly using PIXI.js.
- **Audio Synthesizer & Playback:** Decodes and schedules hit sounds with panning support based on key configuration.
- **Autoplay Replay:** Replays automatically from the beginning when starting playback at the end of a song.
- **Fallback Placeholders:** Automatically loads custom defaults (`background.bmp` and `bmp.bmp`) for charts lacking internal graphics.

### 2. Avatar Closet Studio (`.opa`)
- Try on sprite equipment layers, customize accessories, and dress up characters.
- Export character customizer outfits directly as PNG images.

### 3. GodTool OPI Inspector (`.opi` / `.opa`)
- Inspect raw sprite frames and boundary definitions.
- Browse container directories and inspect texture sheets.

---

## Interactive Controls

When inside the **Rhythm Chart Player**, you can use the following interactive hotkeys:

| Key Binding | Description |
| :--- | :--- |
| `Space` | Play / Pause playback |
| `F` | Toggle Layout Mode (Horizontal / Vertical views) |
| `L` | Toggle Long Notes visibility (Show / Hide) |
| `R` | Randomize seed (shuffles the key lane configurations) |
| `←` / `→` | Seek backward / forward 5 seconds |
| `↑` / `↓` | Increase / decrease master volume by 5% |

*Note: Hotkey listeners are bypassed automatically when typing inside settings input fields.*

---

## Getting Started

### Installation
Install project dependencies using npm:
```bash
npm install
```

### Local Development
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
Generate a production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```
