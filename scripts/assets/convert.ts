// Convert dofus-5b SWFs → web/public/assets/swf (format: docs/assets-format.md).
// Usage: bun scripts/assets/convert.ts [file.swf|dir ...]   (default: all of dofus-5b/)
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
import { parseSwf, type SwfImage } from "./swf.ts";
import type { SwfFile, SwfIndex } from "../../web/src/swf/types.ts";

const ROOT = resolve(import.meta.dir, "../..");
export const SRC_DIR = join(ROOT, "dofus-5b");
export const OUT_DIR = join(ROOT, "web/public/assets/swf");

// Ids missing from beta 5b's ground/object libraries are filled with the same linkage id from the earliest later
// archived client that has it (vendor/archive-dofus-1, same id scheme: docs/assets-format.md §11). 5b's own graphic
// always wins. Provenance tags: docs/content-reconstruction.md §1.1.
export const FILLED = ["clips/ground.swf", "clips/objects.swf"];
const FILL_FROM = ["v7b", "v10b", "v11b", "v12b", "v13b", "v15b", "v16b", "v17_1b", "v17_2b", "v1_0"]; // oldest first
export type FillManifest = Record<string, { from: string; provenance: "beta_sibling" | "release_sibling" }>;

/** Adds to `swf`/`images` every export of the later versions of `src` that 5b lacks, with fresh character ids. */
function fill(swf: SwfFile, images: SwfImage[], src: string, warnings: string[]): FillManifest {
  const manifest: FillManifest = {};
  let next = Math.max(...Object.keys(swf.symbols).map(Number)) + 1;
  for (const v of FILL_FROM) {
    const from = `vendor/archive-dofus-1/${v}/${src}`;
    const other = parseSwf(readFileSync(join(ROOT, from)), src);
    warnings.push(...other.warnings.map((w) => `${from}: ${w}`));
    const ids = new Map<number, number>(); // character id in `other` → id in `swf`; shared children are copied once
    const copy = (id: number): number => {
      let n = ids.get(id);
      if (n !== undefined) return n;
      ids.set(id, (n = next++));
      const s = structuredClone(other.swf.symbols[id]!);
      s.id = n;
      if (s.type === "bitmap") {
        s.file = s.file.replace(/\/\d+\./, `/${n}.`);
        images.push({ ...other.images.find((i) => i.id === id)!, id: n });
      }
      remap(s, true);
      swf.symbols[n] = s;
      return n;
    };
    // character references: place-op/button-record/StartSound `id`, fill `bitmap`, text/edittext `font`
    const remap = (o: unknown, top = false): void => {
      if (!o || typeof o !== "object") return;
      const r = o as Record<string, unknown>;
      for (const k in r) {
        const x = r[k];
        if (typeof x === "number" && (k === "bitmap" || k === "font" || (k === "id" && !top))) r[k] = copy(x);
        else remap(x);
      }
    };
    for (const [name, id] of Object.entries(other.swf.exports))
      if (swf.exports[name] === undefined) {
        swf.exports[name] = copy(id);
        manifest[name] = { from, provenance: v === "v1_0" ? "release_sibling" : "beta_sibling" };
      }
  }
  return manifest;
}

/** Write via a temporary file, so a client loading the file meanwhile never reads half of it. */
function writeAtomic(path: string, data: string) {
  writeFileSync(path + ".tmp", data);
  renameSync(path + ".tmp", path);
}

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
  const manifest = FILLED.includes(src) ? fill(swf, images, src, warnings) : undefined;
  mkdirSync(dirname(jsonPath), { recursive: true });
  for (const img of images) {
    const file = join(dirname(jsonPath), (swf.symbols[img.id] as { file: string }).file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "rgba" in img || img.alpha ? await pngOf(img) : img.jpeg);
  }
  writeAtomic(jsonPath, JSON.stringify(swf));
  if (manifest) writeAtomic(jsonPath.replace(/\.json$/, ".fill.json"), JSON.stringify(manifest, null, 1));
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
