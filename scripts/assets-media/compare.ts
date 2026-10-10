// Pixel diff between a reference render (JPEXS, decompiled/reference/) and a candidate render.
// Usage: bun scripts/assets-media/compare.ts <reference.png> <candidate.png> [--diff out.png]
//   [--ref-origin x,y] [--cand-origin x,y]   registration point (pixels) in each image; the reference origin is
//                                             read from index.json next to the reference when present
//   [--search N]       also try every offset within ±N px of the initial alignment (default 0 with origins, else 2)
//   [--blur R]         box-blur both images by R px before diffing, to absorb anti-aliasing noise (default 1)
//   [--tolerance T]    a pixel is "bad" when a premultiplied RGBA channel differs by more than T/255 (default 48)
//   [--threshold R]    exit 1 when badRatio > R (default 0.05)
// Without origins, images are first aligned on their alpha bounding boxes. Scores are relative to the pixels
// covered (alpha > 0) by either image, so empty margins do not dilute them.
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { basename, dirname } from "node:path";

export type Img = { width: number; height: number; data: Uint8ClampedArray };
export type Result = { dx: number; dy: number; covered: number; bad: number; badRatio: number; meanDiff: number };
export type Options = { refOrigin?: [number, number]; candOrigin?: [number, number]; search?: number; tolerance?: number; blur?: number };

export async function readPng(path: string): Promise<Img> {
  const img = await loadImage(path);
  const ctx = createCanvas(img.width, img.height).getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/** Premultiplied RGBA floats, padded by r px on each side and box-blurred by r; `a` keeps the original alpha. */
type Plane = { w: number; h: number; r: number; p: Float32Array; a: Uint8Array };
function plane(img: Img, r: number): Plane {
  const w = img.width + 2 * r, h = img.height + 2 * r;
  let p = new Float32Array(w * h * 4);
  const a = new Uint8Array(w * h);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, j = (y + r) * w + x + r, al = img.data[i + 3]!;
      for (let c = 0; c < 3; c++) p[j * 4 + c] = (img.data[i + c]! * al) / 255;
      p[j * 4 + 3] = al;
      a[j] = al;
    }
  for (const [sx, sy] of r ? [[1, 0], [0, 1]] : []) {
    const q = new Float32Array(p.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let k = -r; k <= r; k++) {
          const X = x + k * sx!, Y = y + k * sy!;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          for (let c = 0; c < 4; c++) q[(y * w + x) * 4 + c]! += p[(Y * w + X) * 4 + c]! / (2 * r + 1);
        }
    p = q;
  }
  return { w, h, r, p, a };
}

/** Candidate pixel (x, y) is compared with reference pixel (x + dx, y + dy); optionally renders a diff image. */
function diffAt(ref: Plane, cand: Plane, dx: number, dy: number, tolerance: number, out?: Img): Result {
  const r = ref.r;
  const x0 = Math.min(0, dx) - r, y0 = Math.min(0, dy) - r;
  const x1 = Math.max(ref.w, cand.w + dx) - r, y1 = Math.max(ref.h, cand.h + dy) - r;
  const at = (pl: Plane, x: number, y: number) => {
    const X = x + pl.r, Y = y + pl.r;
    return X < 0 || Y < 0 || X >= pl.w || Y >= pl.h ? -1 : Y * pl.w + X;
  };
  let covered = 0, bad = 0, sum = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = at(ref, x, y), j = at(cand, x - dx, y - dy);
      if (!(i >= 0 && ref.a[i]) && !(j >= 0 && cand.a[j])) continue;
      let max = 0, total = 0;
      for (let c = 0; c < 4; c++) {
        const d = Math.abs((i >= 0 ? ref.p[i * 4 + c]! : 0) - (j >= 0 ? cand.p[j * 4 + c]! : 0));
        max = Math.max(max, d);
        total += d;
      }
      covered++;
      sum += total / 4;
      if (max > tolerance) bad++;
      if (out) {
        const lum = i >= 0 ? (ref.p[i * 4]! + ref.p[i * 4 + 1]! + ref.p[i * 4 + 2]!) / 3 : 0;
        const v = max > tolerance ? [255, 0, 0, 255] : max > tolerance / 4 ? [255, 200, 0, 255] : [lum, lum, lum, 96];
        out.data.set(v, ((y - y0) * out.width + (x - x0)) * 4);
      }
    }
  return { dx, dy, covered, bad, badRatio: covered ? bad / covered : 0, meanDiff: covered ? sum / covered / 255 : 0 };
}

function alphaBox(img: Img) {
  let x0 = img.width, y0 = img.height;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
  return { x0, y0 };
}

/** Best alignment and its score; `diff` (if wanted) is a visualisation: red = bad, yellow = small diff, grey = ref. */
export function compare(ref: Img, cand: Img, o: Options = {}, wantDiff = false): Result & { diff?: Img } {
  let dx: number, dy: number;
  if (o.refOrigin && o.candOrigin) {
    dx = Math.round(o.refOrigin[0] - o.candOrigin[0]);
    dy = Math.round(o.refOrigin[1] - o.candOrigin[1]);
  } else {
    const a = alphaBox(ref), b = alphaBox(cand);
    dx = a.x0 - b.x0;
    dy = a.y0 - b.y0;
  }
  const blur = o.blur ?? 1, tolerance = o.tolerance ?? 48;
  const search = o.search ?? (o.refOrigin && o.candOrigin ? 0 : 2);
  const R = plane(ref, blur), C = plane(cand, blur);
  let best = diffAt(R, C, dx, dy, tolerance);
  for (let sy = -search; sy <= search; sy++)
    for (let sx = -search; sx <= search; sx++) {
      const res = sx || sy ? diffAt(R, C, dx + sx, dy + sy, tolerance) : best;
      if (res.meanDiff < best.meanDiff) best = res;
    }
  if (!wantDiff) return best;
  const width = Math.max(R.w, C.w + best.dx) - Math.min(0, best.dx), height = Math.max(R.h, C.h + best.dy) - Math.min(0, best.dy);
  const diff = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  diffAt(R, C, best.dx, best.dy, tolerance, diff);
  return { ...best, diff };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const num = (s?: string) => (s === undefined ? undefined : Number(s));
  const point = (s?: string) => (s ? (s.split(",").map(Number) as [number, number]) : undefined);
  const diffPath = flag("--diff");
  const o: Options = {
    refOrigin: point(flag("--ref-origin")), candOrigin: point(flag("--cand-origin")),
    search: num(flag("--search")), blur: num(flag("--blur")), tolerance: num(flag("--tolerance")),
  };
  const threshold = num(flag("--threshold")) ?? 0.05;
  const [refPath, candPath] = args;
  if (!refPath || !candPath) {
    console.error("usage: bun scripts/assets-media/compare.ts <reference.png> <candidate.png> [--diff out.png] [--ref-origin x,y] [--cand-origin x,y] [--search N] [--blur R] [--tolerance T] [--threshold R]");
    process.exit(2);
  }
  if (!o.refOrigin && o.candOrigin) {
    const index = Bun.file(dirname(refPath) + "/index.json");
    if (await index.exists()) o.refOrigin = ((await index.json()) as { file: string; origin: [number, number] }[]).find((e) => e.file === basename(refPath))?.origin;
  }
  const { diff, ...r } = compare(await readPng(refPath), await readPng(candPath), o, !!diffPath);
  if (diff && diffPath) {
    const canvas = createCanvas(diff.width, diff.height);
    const ctx = canvas.getContext("2d");
    const data = ctx.createImageData(diff.width, diff.height);
    data.data.set(diff.data);
    ctx.putImageData(data, 0, 0);
    await Bun.write(diffPath, canvas.encodeSync("png"));
  }
  console.log(JSON.stringify({ ...r, threshold, pass: r.badRatio <= threshold }));
  process.exit(r.badRatio <= threshold ? 0 : 1);
}
