# Home Photo Embedding Atlas

This project is a customized version of [apple/embedding-atlas](https://github.com/apple/embedding-atlas).

It was adapted with help from **Codex** for a **home photo archive** workflow:
- show image thumbnails directly on embedding points
- show thumbnail + metadata on hover
- pin selection on click and show a right-side details panel
- open full-size photo from the details panel
- filter by label and search by ID

## Tech Stack

- Vite
- TypeScript
- React
- embedding-atlas

## Project Structure

- `src/data/demoPoints.ts` - embedding points dataset (`id`, `x`, `y`, `label`, `thumb`)
- `src/App.tsx` - main UI, filtering, selection panel, full photo link
- `src/AtlasOverlay.ts` - thumbnail rendering on top of atlas points
- `src/AtlasTooltip.ts` - custom hover tooltip
- `public/thumbs/` - thumbnails used in atlas and tooltip
- `public/photos/` - full-size images opened from **Selected** panel
- `photos/` - local source images (not served directly by Vite)

## Requirements

- Node.js 18+ (recommended: latest LTS)
- npm
- Optional: ImageMagick (`magick`) to batch-generate thumbnails

## Install

```bash
npm install
```

## Run (Development)

```bash
npm run dev
```

Then open the local URL shown in terminal (usually `http://localhost:5173`).

## Build (Production Check)

```bash
npm run build
```

## Configure for Your Own Photo Archive

### 1) Put source photos into `photos/`

Use stable file names, for example:
- `IMG_0001.JPG`
- `IMG_0002.JPG`

### 2) Copy full-size photos to `public/photos/`

```powershell
New-Item -ItemType Directory -Force -Path public/photos | Out-Null
Copy-Item photos/* public/photos -Force
```

### 3) Generate thumbnails into `public/thumbs/`

```powershell
New-Item -ItemType Directory -Force -Path public/thumbs | Out-Null
magick mogrify -path public/thumbs -resize 256x256^ -gravity center -extent 256x256 -format jpg photos/*.JPG
```

### 4) Update embedding data in `src/data/demoPoints.ts`

For each point, provide:
- `id` (without extension, for example `IMG_0001`)
- `x`, `y` (precomputed UMAP/t-SNE coordinates)
- `label` (for filtering)
- `thumb` (for example `/thumbs/IMG_0001.jpg`)

Also update `LABELS` to include all label values used by your points.

### 5) Verify full photo opening

The Selected panel opens full image as:
- `/photos/${id}.JPG`

So `id` must match the full-size filename in `public/photos/`.

## Notes

- The app works fully offline after dependencies are installed.
- No external APIs are required.
- If `npm` is not in PATH on Windows, run using the full path:
  - `"C:\Program Files\nodejs\npm.cmd" run dev`
