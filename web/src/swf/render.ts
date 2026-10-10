// Static renderer for converted SWFs (docs/assets-format.md §8): draw symbol X at frame N onto any
// Canvas2D context. Works in the browser and headless with @napi-rs/canvas (set globalThis.Path2D).
// No playback, no scripts — that is the MovieClip runtime's job.
import type {
  ColorTransform, DisplayOp, EditTextSymbol, Fill, FontSymbol, Line, Matrix, MorphPath, Rect, RGBA, ShapePath,
  SwfFile, SwfSymbol, TextSymbol, Timeline,
} from "./types.ts";

export interface SwfLoader {
  /** `path` is relative to the assets/swf root, e.g. "clips/sprites/10.json". */
  json(path: string): Promise<SwfFile>;
  image(path: string): Promise<CanvasImageSource>;
}

export interface LoadedSwf {
  file: SwfFile;
  images: Map<number, CanvasImageSource>;
  /** local character id → [swf that exports it, its id there] */
  imports: Map<number, [LoadedSwf, number]>;
}

/** Load a converted SWF by its archive path ("clips/sprites/10.swf"), with its bitmaps and imports. */
export async function loadSwf(src: string, loader: SwfLoader, cache = new Map<string, Promise<LoadedSwf>>()): Promise<LoadedSwf> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = (async () => {
    const json = src.replace(/\.swf$/i, ".json");
    const dir = json.includes("/") ? json.slice(0, json.lastIndexOf("/") + 1) : "";
    const file = await loader.json(json);
    const images = new Map<number, CanvasImageSource>();
    const imports = new Map<number, [LoadedSwf, number]>();
    await Promise.all([
      ...Object.values(file.symbols).map(async (s) => s.type === "bitmap" && images.set(s.id, await loader.image(dir + s.file))),
      ...file.imports.map(async (imp) => {
        const other = await loadSwf(imp.url, loader, cache);
        for (const it of imp.items) if (other.file.exports[it.name] !== undefined) imports.set(it.id, [other, other.file.exports[it.name]!]);
      }),
    ]);
    return { file, images, imports };
  })();
  cache.set(src, p);
  return p;
}

/** Browser loader: fetches from `base` (default "/assets/swf/"). */
export const browserLoader = (base = "/assets/swf/"): SwfLoader => ({
  json: async (p) => (await fetch(base + p)).json(),
  image: async (p) => createImageBitmap(await (await fetch(base + p)).blob()),
});

// ---- math -------------------------------------------------------------------------------------
export const ID: Matrix = [1, 0, 0, 1, 0, 0];
export const NO_CX: ColorTransform = [1, 1, 1, 1, 0, 0, 0, 0];
export const mul = (p: Matrix, c: Matrix): Matrix => [
  p[0] * c[0] + p[2] * c[1], p[1] * c[0] + p[3] * c[1], p[0] * c[2] + p[2] * c[3], p[1] * c[2] + p[3] * c[3],
  p[0] * c[4] + p[2] * c[5] + p[4], p[1] * c[4] + p[3] * c[5] + p[5],
];
export const inv = ([a, b, c, d, tx, ty]: Matrix): Matrix | null => {
  const det = a * d - b * c;
  if (!det) return null;
  return [d / det, -b / det, -c / det, a / det, (c * ty - d * tx) / det, (b * tx - a * ty) / det];
};
export const dom = (m: Matrix) => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });
/** child transform applied first, then parent */
export const mulCx = (p: ColorTransform, c: ColorTransform): ColorTransform => [
  p[0] * c[0], p[1] * c[1], p[2] * c[2], p[3] * c[3], p[0] * c[4] + p[4], p[1] * c[5] + p[5], p[2] * c[6] + p[6], p[3] * c[7] + p[7],
];
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
export const css = (c: RGBA, cx: ColorTransform) =>
  `rgba(${clamp(c[0] * cx[0] + cx[4])},${clamp(c[1] * cx[1] + cx[5])},${clamp(c[2] * cx[2] + cx[6])},${clamp(c[3] * cx[3] + cx[7]) / 255})`;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---- display lists ----------------------------------------------------------------------------
export type Inst = { depth: number; id: number; matrix: Matrix; cxform?: ColorTransform; ratio: number; name?: string; clipDepth?: number; created: number; t: number };

/** Replay timeline ops for frames 0…`frame` (0-based); returns instances by ascending depth. */
export function displayList(tl: Timeline, frame: number): Inst[] {
  const list = new Map<number, Inst>();
  for (let f = 0; f <= frame && f < tl.frames.length; f++)
    for (const op of tl.frames[f]!.ops ?? []) apply(list, op, f);
  return [...list.values()].sort((a, b) => a.depth - b.depth);
}

/**
 * Display list of a timeline whose own playhead has run `time` ticks (0-based), with each child's
 * elapsed ticks in `t`. Children created on frame 1 that survive to the last frame are kept across
 * loops (Flash does not recreate them), so their time keeps running.
 */
function frameList(tl: Timeline, time: number): Inst[] {
  const n = tl.frames.length;
  if (!n) return [];
  const f = time % n, list = displayList(tl, f);
  const kept = time >= n ? new Set(displayList(tl, n - 1).filter((i) => !i.created).map((i) => i.depth)) : undefined;
  for (const i of list) i.t = !i.created && kept?.has(i.depth) ? time : f - i.created;
  return list;
}

function apply(list: Map<number, Inst>, op: DisplayOp, f: number) {
  if (op.op === "remove") return void list.delete(op.depth);
  const old = op.move ? list.get(op.depth) : undefined;
  if (!old && op.id === undefined) return;
  const inst: Inst = old ? { ...old } : { depth: op.depth, id: op.id!, matrix: ID, ratio: 0, created: f, t: 0 };
  if (op.id !== undefined && old && old.id !== op.id) (inst.id = op.id), (inst.created = f);
  if (op.matrix) inst.matrix = op.matrix;
  if (op.cxform) inst.cxform = op.cxform;
  if (op.ratio !== undefined) inst.ratio = op.ratio;
  if (op.name !== undefined) inst.name = op.name;
  if (op.clipDepth !== undefined) inst.clipDepth = op.clipDepth;
  list.set(op.depth, inst);
}

export function resolve(swf: LoadedSwf, id: number): [LoadedSwf, SwfSymbol] | undefined {
  const s = swf.file.symbols[id];
  if (s) return [swf, s];
  const imp = swf.imports.get(id);
  return imp && resolve(imp[0], imp[1]);
}

const buttonList = (s: Extract<SwfSymbol, { type: "button" }>, t: number): Inst[] =>
  s.records
    .filter((r) => r.states.includes("up"))
    .map((r) => ({ depth: r.depth, id: r.id, matrix: r.matrix, cxform: r.cxform, ratio: 0, created: 0, t }))
    .sort((a, b) => a.depth - b.depth);

// ---- paths ------------------------------------------------------------------------------------
const pathCache = new WeakMap<object, Path2D>();
export const path = (key: ShapePath | FontSymbol["glyphs"][number]) => {
  let p = pathCache.get(key);
  if (!p) pathCache.set(key, (p = new Path2D(key.d)));
  return p;
};
const tokCache = new WeakMap<MorphPath, [(string | number)[], (string | number)[]]>();
const tokens = (d: string) => d.split(" ").map((t) => (/[MLQ]/.test(t) ? t : Number(t)));
export function morphPath(mp: MorphPath, t: number): Path2D {
  let tk = tokCache.get(mp);
  if (!tk) tokCache.set(mp, (tk = [tokens(mp.d[0]), tokens(mp.d[1])]));
  const [a, b] = tk, p = new Path2D(), n = (i: number) => lerp(a[i] as number, b[i] as number, t);
  for (let i = 0; i < a.length; ) {
    const c = a[i++];
    if (c === "M") p.moveTo(n(i), n(i + 1)), (i += 2);
    else if (c === "L") p.lineTo(n(i), n(i + 1)), (i += 2);
    else p.quadraticCurveTo(n(i), n(i + 1), n(i + 2), n(i + 3)), (i += 4);
  }
  return p;
}
const lerpColor = (a: RGBA, b: RGBA, t: number): RGBA => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
const lerpMatrix = (a: Matrix, b: Matrix, t: number) => a.map((v, i) => lerp(v, b[i]!, t)) as Matrix;
function lerpFill([a, b]: [Fill, Fill], t: number): Fill {
  if (a.type === "solid" && b.type === "solid") return { type: "solid", color: lerpColor(a.color, b.color, t) };
  if (a.type === "bitmap" && b.type === "bitmap") return { ...a, matrix: lerpMatrix(a.matrix, b.matrix, t) };
  if (a.type !== "solid" && a.type !== "bitmap" && b.type !== "solid" && b.type !== "bitmap")
    return {
      type: a.type,
      matrix: lerpMatrix(a.matrix, b.matrix, t),
      stops: a.stops.map((s, i) => ({ ratio: lerp(s.ratio, b.stops[i]!.ratio, t), color: lerpColor(s.color, b.stops[i]!.color, t) })),
    };
  return a;
}

// ---- drawing ----------------------------------------------------------------------------------
function fillPath(ctx: CanvasRenderingContext2D, swf: LoadedSwf, p: Path2D, fill: Fill, cx: ColorTransform) {
  if (fill.type === "solid") {
    ctx.fillStyle = css(fill.color, cx);
    return ctx.fill(p, "evenodd");
  }
  const im = inv(fill.matrix);
  if (!im) return;
  const q = new Path2D();
  q.addPath(p, dom(im)); // path in fill space; fill under the fill matrix
  ctx.save();
  ctx.transform(...fill.matrix);
  if (fill.type === "bitmap") {
    const img = swf.images.get(fill.bitmap);
    const pat = img && ctx.createPattern(img, fill.repeat ? "repeat" : "no-repeat");
    if (pat) {
      ctx.globalAlpha = clamp(255 * cx[3] + cx[7]) / 255; // ponytail: bitmaps get only the alpha part of the cxform
      ctx.imageSmoothingEnabled = fill.smooth;
      ctx.fillStyle = pat;
      ctx.fill(q, "evenodd");
    }
  } else {
    const g = fill.type === "linear" ? ctx.createLinearGradient(-16384, 0, 16384, 0) : ctx.createRadialGradient(0, 0, 0, 0, 0, 16384);
    for (const s of fill.stops) g.addColorStop(Math.min(1, Math.max(0, s.ratio / 255)), css(s.color, cx));
    ctx.fillStyle = g;
    ctx.fill(q, "evenodd");
  }
  ctx.restore();
}

function strokePath(ctx: CanvasRenderingContext2D, p: Path2D, line: Line, cx: ColorTransform) {
  const m = ctx.getTransform(), scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
  ctx.strokeStyle = css(line.color, cx);
  ctx.lineWidth = Math.max(line.width, 1 / scale); // at least one device pixel (hairlines)
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.stroke(p);
}

export function drawShapePaths(ctx: CanvasRenderingContext2D, swf: LoadedSwf, paths: ShapePath[], cx: ColorTransform) {
  for (const sp of paths) "fill" in sp ? fillPath(ctx, swf, path(sp), sp.fill, cx) : strokePath(ctx, path(sp), sp.line, cx);
}

export function drawMorph(ctx: CanvasRenderingContext2D, swf: LoadedSwf, paths: MorphPath[], t: number, cx: ColorTransform) {
  for (const mp of paths) {
    const p = morphPath(mp, t);
    if ("fill" in mp) fillPath(ctx, swf, p, lerpFill(mp.fill, t), cx);
    else strokePath(ctx, p, { width: lerp(mp.line[0].width, mp.line[1].width, t), color: lerpColor(mp.line[0].color, mp.line[1].color, t) }, cx);
  }
}

export function drawText(ctx: CanvasRenderingContext2D, swf: LoadedSwf, s: TextSymbol, cx: ColorTransform) {
  ctx.save();
  ctx.transform(...s.matrix);
  for (const r of s.records) {
    const font = resolve(swf, r.font)?.[1];
    if (font?.type !== "font") continue;
    ctx.fillStyle = css(r.color, cx);
    let x = r.x;
    for (const [i, adv] of r.glyphs) {
      const g = font.glyphs[i];
      if (g?.d) {
        ctx.save();
        ctx.translate(x, r.y);
        ctx.scale(r.size / 1024, r.size / 1024);
        ctx.fill(path(g), "evenodd");
        ctx.restore();
      }
      x += adv;
    }
  }
  ctx.restore();
}

const plain = (s: EditTextSymbol) =>
  !s.html
    ? (s.text ?? "")
    : (s.text ?? "")
        .replace(/<br\s*\/?>|<\/p>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

// ponytail: device-font fillText, no wrapping/HTML styling; the TextField runtime replaces this.
function drawEditText(ctx: CanvasRenderingContext2D, swf: LoadedSwf, s: EditTextSymbol, cx: ColorTransform) {
  const [x0, y0, x1, y1] = s.bounds;
  if (s.border) (ctx.strokeStyle = css([0, 0, 0, 255], cx)), (ctx.lineWidth = 1), ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  const text = s.password ? "*".repeat(plain(s).length) : plain(s);
  if (!text) return;
  const font = s.font !== undefined ? resolve(swf, s.font)?.[1] : undefined;
  const f = font?.type === "font" ? font : undefined, size = s.size ?? 12;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.font = `${f?.italic ? "italic " : ""}${f?.bold ? "bold " : ""}${size}px ${f ? `"${f.name}"` : "serif"}`;
  ctx.fillStyle = css(s.color ?? [0, 0, 0, 255], cx);
  ctx.textBaseline = "top";
  ctx.textAlign = s.align === "center" ? "center" : s.align === "right" ? "right" : "left";
  const x = s.align === "center" ? (x0 + x1) / 2 : s.align === "right" ? x1 - 2 - (s.rightMargin ?? 0) : x0 + 2 + (s.leftMargin ?? 0) + (s.indent ?? 0);
  text.split(/\r\n|\r|\n/).forEach((l, i) => ctx.fillText(l, x, y0 + 2 + i * (size + (s.leading ?? 2))));
  ctx.restore();
}

function drawList(ctx: CanvasRenderingContext2D, swf: LoadedSwf, list: Inst[], cx: ColorTransform) {
  const masks: number[] = [];
  for (const inst of list) {
    while (masks.length && inst.depth > masks[masks.length - 1]!) ctx.restore(), masks.pop();
    if (inst.clipDepth) {
      const p = new Path2D();
      maskPath(p, swf, inst.id, inst.t, inst.ratio, inst.matrix);
      ctx.save();
      ctx.clip(p, "nonzero");
      masks.push(inst.clipDepth);
      continue;
    }
    ctx.save();
    ctx.transform(...inst.matrix);
    drawChar(ctx, swf, inst.id, inst.t, inst.ratio, inst.cxform ? mulCx(cx, inst.cxform) : cx);
    ctx.restore();
  }
  while (masks.pop() !== undefined) ctx.restore();
}

/** Union of the character's fill geometry (local space via `m`) into `out`. */
function maskPath(out: Path2D, swf: LoadedSwf, id: number, time: number, ratio: number, m: Matrix) {
  const r = resolve(swf, id);
  if (!r) return;
  const [owner, s] = r;
  if (s.type === "shape") for (const sp of s.paths) "fill" in sp && out.addPath(path(sp), dom(m));
  else if (s.type === "morph") for (const mp of s.paths) "fill" in mp && out.addPath(morphPath(mp, ratio / 65535), dom(m));
  else if (s.type === "sprite")
    for (const c of frameList(s, time)) if (!c.clipDepth) maskPath(out, owner, c.id, c.t, c.ratio, mul(m, c.matrix));
}

function drawChar(ctx: CanvasRenderingContext2D, swf: LoadedSwf, id: number, time: number, ratio: number, cx: ColorTransform) {
  const r = resolve(swf, id);
  if (!r) return;
  const [owner, s] = r;
  switch (s.type) {
    case "shape": return drawShapePaths(ctx, owner, s.paths, cx);
    case "morph": return drawMorph(ctx, owner, s.paths, ratio / 65535, cx);
    case "sprite": return drawList(ctx, owner, frameList(s, time), cx);
    case "button": return drawList(ctx, owner, buttonList(s, time), cx);
    case "text": return drawText(ctx, owner, s, cx);
    case "edittext": return drawEditText(ctx, owner, s, cx);
    case "bitmap": {
      const img = owner.images.get(s.id);
      if (img) ctx.drawImage(img, 0, 0);
    }
  }
}

/**
 * Draw character `id` at 1-based `frame` with the context's current transform as the symbol's parent
 * space. `id`: a number is a character id (0 = root timeline); a string is an export/linkage name —
 * ground/objects linkages are numeric strings ("1" ≠ character 1).
 */
export function drawSymbol(ctx: CanvasRenderingContext2D, swf: LoadedSwf, id: number | string, frame = 1, cxform: ColorTransform = NO_CX) {
  if (id === 0) return drawList(ctx, swf, frameList(swf.file.root, frame - 1), cxform);
  drawChar(ctx, swf, symbolId(swf, id), frame - 1, 0, cxform);
}

export function symbolId(swf: LoadedSwf, id: number | string): number {
  if (typeof id === "number") return id;
  const n = swf.file.exports[id];
  if (n === undefined) throw new Error(`no export "${id}" in ${swf.file.src}`);
  return n;
}

// ---- bounds -----------------------------------------------------------------------------------
export const xform = (r: Rect, m: Matrix): Rect => {
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]] as const)
    xs.push(m[0] * x + m[2] * y + m[4]), ys.push(m[1] * x + m[3] * y + m[5]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
export const union = (a: Rect | null, b: Rect | null): Rect | null =>
  !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const intersect = (a: Rect | null, b: Rect | null): Rect | null => {
  if (!a || !b) return null;
  const r: Rect = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[0] < r[2] && r[1] < r[3] ? r : null;
};

function listBounds(swf: LoadedSwf, list: Inst[], m: Matrix): Rect | null {
  let out: Rect | null = null, mask: Rect | null = null, maskEnd = -1;
  for (const c of list) {
    if (c.depth > maskEnd) mask = null;
    const b = boundsAt(swf, c.id, c.t, c.ratio, mul(m, c.matrix));
    if (c.clipDepth) (mask = b), (maskEnd = c.clipDepth);
    else out = union(out, mask ? intersect(b, mask) : b);
  }
  return out;
}

function boundsAt(swf: LoadedSwf, id: number, time: number, ratio: number, m: Matrix): Rect | null {
  const r = resolve(swf, id);
  if (!r) return null;
  const [owner, s] = r;
  switch (s.type) {
    case "shape": return s.paths.length ? xform(s.bounds, m) : null;
    case "morph": {
      const t = ratio / 65535;
      return xform(s.bounds[0].map((v, i) => lerp(v, s.bounds[1][i]!, t)) as Rect, m);
    }
    case "sprite": return listBounds(owner, frameList(s, time), m);
    case "button": return listBounds(owner, buttonList(s, time), m);
    case "text": return xform(s.bounds, mul(m, s.matrix));
    case "edittext": return xform(s.bounds, m);
    case "bitmap": return xform([0, 0, s.width, s.height], m);
    default: return null;
  }
}

/** Visible bounds (px, parent space) of `id` at 1-based `frame`; null if empty. */
export function getBounds(swf: LoadedSwf, id: number | string, frame = 1): Rect | null {
  if (id === 0) return listBounds(swf, frameList(swf.file.root, frame - 1), ID);
  return boundsAt(swf, symbolId(swf, id), frame - 1, 0, ID);
}

