import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

// White background so the masked/circular launcher icon looks like a normal app icon.
const BG = '#ffffff';
// Keep a generous safe-zone so Android circular masks don't cut the artwork.
const SAFE_RATIO = 0.72;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateOne({ src, out, size }) {
  if (!(await exists(src))) {
    throw new Error(`Missing source icon: ${src}`);
  }

  const inner = Math.round(size * SAFE_RATIO);
  const inset = Math.floor((size - inner) / 2);

  const innerPng = await sharp(src)
    .resize(inner, inner, { fit: 'contain' })
    .png()
    .toBuffer();

  const composed = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: innerPng, top: inset, left: inset }])
    .png()
    .toBuffer();

  await fs.writeFile(out, composed);
}

async function main() {
  const targets = [
    {
      size: 192,
      src: path.join(PUBLIC_DIR, 'android-chrome-192x192.png'),
      out: path.join(PUBLIC_DIR, 'maskable-icon-192.png'),
    },
    {
      size: 512,
      src: path.join(PUBLIC_DIR, 'android-chrome-512x512.png'),
      out: path.join(PUBLIC_DIR, 'maskable-icon-512.png'),
    },
  ];

  await Promise.all(targets.map((t) => generateOne(t)));
  // eslint-disable-next-line no-console
  console.log(`maskable icons generated (bg=${BG}, safeRatio=${SAFE_RATIO})`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
