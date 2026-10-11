# 3D Portfolio (Vite + Three.js)

Clean single-page portfolio with a lightweight Three.js hero. Normal scrolling; the 3D sphere only renders while the hero is visible.

```bash
cd app
npm ci
npm run dev       # local dev server
npm run build     # outputs app/dist
```

Content lives in `src/data.js`. The hero sphere is in `src/hero3d.js`.
`npm run textures` regenerates the WebP thumbnails from `../images` (needs `npm i --no-save sharp`).

## Deploy (Vercel or Netlify)
Import the GitHub repo on either host. `vercel.json` and `netlify.toml` at the repo root already set install, build and output, so no settings need changing.
The original static site at the repo root is untouched and keeps serving GitHub Pages.
