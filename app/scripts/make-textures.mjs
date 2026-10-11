// One-off: run `npm i --no-save sharp && npm run textures` (sharp is not a project dependency).
// Resizes the 1024px project thumbnails in ../images into web-friendly WebP:
//   <name>-512.webp  (WebGL card textures)   <name>-1024.webp (modal header)
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, '../../images');
const out = path.join(root, '../public/img');

const files = (await readdir(src)).filter((f) => /^(thumb_.*|fake_job)\.png$/.test(f));
for (const f of files) {
  const base = f.replace(/\.png$/, '');
  for (const size of [512, 1024]) {
    await sharp(path.join(src, f))
      .resize(size, size, { fit: 'cover' })
      .webp({ quality: size === 512 ? 80 : 82 })
      .toFile(path.join(out, `${base}-${size}.webp`));
  }
}
console.log(`Processed ${files.length} thumbnails`);
