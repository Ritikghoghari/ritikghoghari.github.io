# 3D Portfolio (Vite + Three.js)

Scroll-driven 3D portfolio: the camera flies through Hero → About → Skills → Projects → Contact.
Projects are cards on a 3D carousel (click the front card, use ←/→, or the buttons). Falls back to a
normal 2D layout when WebGL is unavailable.

```bash
cd app
npm ci
npm run dev       # local dev server
npm run build     # outputs app/dist
```

Content lives in `src/data.js`. The scene is in `src/world.js`; scroll/camera stops in `src/timeline.js`.
`npm run textures` regenerates the WebP thumbnails from `../images` (needs `npm i --no-save sharp`).

## Deploy (Vercel or Netlify)
Import the GitHub repo on either host. `vercel.json` and `netlify.toml` at the repo root already set install, build and output, so no settings need changing.
The original static site at the repo root is untouched and keeps serving GitHub Pages.
