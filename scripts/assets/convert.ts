// Convert dofus-5b SWFs → web/public/assets/swf (format: docs/assets-format.md).
// Usage: bun scripts/assets/convert.ts [file.swf|dir ...]   (default: all of dofus-5b/)
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
import { parseSwf, type SwfImage } from "./swf.ts";
import type { SwfIndex } from "../../web/src/swf/types.ts";

const ROOT = resolve(import.meta.dir, "../..");
export const SRC_DIR = join(ROOT, "dofus-5b");
export const OUT_DIR = join(ROOT, "web/public/assets/swf");

async function pngOf(img: SwfImage): Promise<Uint8Array> {
  const c = createCanvas(img.width, img.height), ctx = c.getContext("2d");
  if ("rgba" in img) ctx.putImageData(new ImageData(img.rgba, img.width, img.height), 0, 0);
  else {
    ctx.drawImage(await loadImage(Buffer.from(img.jpeg)), 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height), d = px.data, alpha = img.alpha!;
    for (let i = 0; i < alpha.length; i++) {
      const a = alpha[i]!, k = a ? 255 / a : 0; // JPEG3 colour is premultiplied; Flash clamps it to alpha
      for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.min(d[i * 4 + c]!, a) * k;
      d[i * 4 + 3] = a;
    }
    ctx.putImageData(px, 0, 0);
  }
  return c.encode("png");
}

export type IndexEntry = SwfIndex["files"][number];

/** Convert one SWF (path relative to dofus-5b/) into `outDir`. */
export async function convertFile(src: string, outDir = OUT_DIR): Promise<IndexEntry> {
  const { swf, images, warnings } = parseSwf(readFileSync(join(SRC_DIR, src)), src);
  const json = src.replace(/\.swf$/i, ".json");
  const jsonPath = join(outDir, json);
  mkdirSync(dirname(jsonPath), { recursive: true });
  for (const img of images) {
    const file = join(dirname(jsonPath), (swf.symbols[img.id] as { file: string }).file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "rgba" in img || img.alpha ? await pngOf(img) : img.jpeg);
  }
  writeFileSync(jsonPath, JSON.stringify(swf));
  const entry: IndexEntry = {
    src, json, version: swf.version, width: swf.width, height: swf.height, frameRate: swf.frameRate,
    frameCount: swf.root.frameCount, symbols: Object.keys(swf.symbols).length, bitmaps: images.length,
    exports: Object.keys(swf.exports).length,
  };
  if (warnings.length) entry.warnings = warnings;
  return entry;
}

const listSwfs = (p: string): string[] =>
  statSync(p).isDirectory() ? readdirSync(p).sort().flatMap((f) => listSwfs(join(p, f))) : /\.swf$/i.test(p) ? [p] : [];

if (import.meta.main) {
  const t0 = performance.now();
  const inputs = (process.argv.length > 2 ? process.argv.slice(2) : [SRC_DIR]).flatMap((p) => listSwfs(resolve(p)));
  const indexPath = join(OUT_DIR, "index.json");
  const index: SwfIndex = existsSync(indexPath)
    ? JSON.parse(readFileSync(indexPath, "utf8"))
    : { format: "dofus-swf-index", formatVersion: 1, files: [], failures: [] };
  let warned = 0;
  for (const abs of inputs) {
    const src = relative(SRC_DIR, abs);
    index.files = index.files.filter((f) => f.src !== src);
    index.failures = index.failures.filter((f) => f.src !== src);
    try {
      const e = await convertFile(src);
      index.files.push(e);
      if (e.warnings) warned++, console.warn(`warn ${src}:\n  ${e.warnings.join("\n  ")}`);
    } catch (err) {
      index.failures.push({ src, error: String((err as Error).stack ?? err) });
      console.error(`FAIL ${src}: ${(err as Error).message}`);
    }
  }
  index.files.sort((a, b) => a.src.localeCompare(b.src));
  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  const s = (performance.now() - t0) / 1000;
  console.log(`${inputs.length} SWFs, ${inputs.length - index.failures.length} ok, ${index.failures.length} failed, ${warned} with warnings, ${s.toFixed(1)} s`);
}
