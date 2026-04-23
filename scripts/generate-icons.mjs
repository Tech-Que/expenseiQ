// Regenerates the PWA + Apple touch icon PNGs in /public from logo-mark.png.
//
// The source PNG is the brain mark drawn on a white square with transparent
// corner padding (not a true transparent-background mark). We isolate the
// mark strokes by treating both fully-transparent and near-white pixels as
// background, recolor the strokes to white, then resize and composite onto a
// full-bleed indigo canvas.
//
// Run with:  node scripts/generate-icons.mjs

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_MARK = path.join(ROOT, "public", "logo-mark.png");

// Brand indigo (#4F46E5 — Tailwind indigo-600).
const INDIGO = { r: 0x4f, g: 0x46, b: 0xe5, alpha: 1 };

// Ratios of mark bounding box to canvas.
//   "any" icons: bold full-bleed design — 78 % fills the canvas cleanly.
//   "maskable"  : content must fit inside an 80 % diameter safe-circle per
//                 W3C maskable spec, so we use ~60 % to ensure corners don't
//                 get clipped when platforms apply aggressive circular masks.
const RATIO_ANY = 0.78;
const RATIO_MASKABLE = 0.6;

// Any pixel whose R, G, and B are all above this threshold is treated as the
// white background and dropped. Brain strokes (indigo, teal) have channels
// well below 200; anti-aliased edges fall between, which is fine — they keep
// their original alpha and blend into the indigo canvas cleanly.
const BG_WHITE_THRESHOLD = 235;

/**
 * Read logo-mark.png once at full resolution, produce a cleaned raw RGBA
 * buffer where strokes are pure white on transparent bg.
 */
async function loadCleanMark() {
  const pipeline = sharp(SOURCE_MARK).ensureAlpha();
  const raw = await pipeline.raw().toBuffer();
  const { width, height } = await sharp(SOURCE_MARK).metadata();

  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const a = raw[i + 3];
    const isBackground =
      a === 0 ||
      (r > BG_WHITE_THRESHOLD && g > BG_WHITE_THRESHOLD && b > BG_WHITE_THRESHOLD);
    if (isBackground) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    } else {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = a;
    }
  }
  return { buffer: out, width, height };
}

const cleanMark = await loadCleanMark();

/** Scale the cleaned mark down to `size` px via sharp's resize. */
async function whiteMark(size) {
  return sharp(cleanMark.buffer, {
    raw: { width: cleanMark.width, height: cleanMark.height, channels: 4 },
  })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function makeIcon(outPath, canvasSize, ratio) {
  const markSize = Math.round(canvasSize * ratio);
  const mark = await whiteMark(markSize);
  const offset = Math.round((canvasSize - markSize) / 2);

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: INDIGO,
    },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const rel = path.relative(ROOT, outPath).replace(/\\/g, "/");
  console.log(`  ${rel}  (${canvasSize}×${canvasSize}, mark ${Math.round(ratio * 100)}%)`);
}

console.log("Regenerating icons from", path.relative(ROOT, SOURCE_MARK).replace(/\\/g, "/"));
await makeIcon(path.join(ROOT, "public", "icon-192.png"), 192, RATIO_ANY);
await makeIcon(path.join(ROOT, "public", "icon-512.png"), 512, RATIO_ANY);
await makeIcon(path.join(ROOT, "public", "apple-touch-icon.png"), 180, RATIO_ANY);
await makeIcon(path.join(ROOT, "public", "icon-maskable-512.png"), 512, RATIO_MASKABLE);
console.log("Done.");
