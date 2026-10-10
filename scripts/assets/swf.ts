// SWF (Flash 6/7) binary → `dofus-swf-json` (docs/assets-format.md). Pure TS, no I/O.
import { inflateSync } from "node:zlib";
import type {
  ButtonCondition, ButtonState, ButtonSymbol, ClipAction, ClipEvent, ColorTransform, DisplayOp, EditTextSymbol, Fill,
  FontSymbol, Frame, Line, Matrix, MorphPath, Rect, RGBA, ShapePath, StartSound, SwfFile, SwfSymbol, TextSymbol, Timeline,
} from "../../web/src/swf/types.ts";

export type SwfImage =
  | { id: number; jpeg: Uint8Array; alpha?: Uint8Array; width: number; height: number }
  | { id: number; rgba: Uint8ClampedArray; width: number; height: number };

const utf8 = new TextDecoder();
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");

class Reader {
  pos: number;
  bit = 0;
  constructor(readonly b: Uint8Array, pos = 0) {
    this.pos = pos;
  }
  align() {
    if (this.bit) (this.bit = 0), this.pos++;
  }
  u8() {
    this.align();
    return this.b[this.pos++]!;
  }
  u16() {
    return this.u8() | (this.u8() << 8);
  }
  s16() {
    return (this.u16() << 16) >> 16;
  }
  u32() {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  bytes(n: number) {
    this.align();
    return this.b.subarray(this.pos, (this.pos += n));
  }
  str() {
    this.align();
    const end = this.b.indexOf(0, this.pos);
    const s = utf8.decode(this.b.subarray(this.pos, end));
    this.pos = end + 1;
    return s;
  }
  ub(n: number) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = v * 2 + ((this.b[this.pos]! >> (7 - this.bit)) & 1);
      if (++this.bit === 8) (this.bit = 0), this.pos++;
    }
    return v;
  }
  sb(n: number) {
    const v = this.ub(n);
    return n && v >= 2 ** (n - 1) ? v - 2 ** n : v;
  }
  rect(): Rect {
    this.align();
    const n = this.ub(5);
    const r: Rect = [this.sb(n) / 20, this.sb(n) / 20, this.sb(n) / 20, this.sb(n) / 20];
    this.align();
    return [r[0], r[2], r[1], r[3]]; // SWF order is xMin, xMax, yMin, yMax
  }
  matrix(): Matrix {
    this.align();
    let a = 1, b = 0, c = 0, d = 1;
    if (this.ub(1)) {
      const n = this.ub(5);
      a = this.sb(n) / 65536;
      d = this.sb(n) / 65536;
    }
    if (this.ub(1)) {
      const n = this.ub(5);
      b = this.sb(n) / 65536;
      c = this.sb(n) / 65536;
    }
    const n = this.ub(5);
    const m: Matrix = [a, b, c, d, this.sb(n) / 20, this.sb(n) / 20];
    this.align();
    return m;
  }
  cxform(alpha: boolean): ColorTransform {
    this.align();
    const hasAdd = this.ub(1), hasMul = this.ub(1), n = this.ub(4), k = alpha ? 4 : 3;
    const cx: ColorTransform = [1, 1, 1, 1, 0, 0, 0, 0];
    if (hasMul) for (let i = 0; i < k; i++) cx[i] = this.sb(n) / 256;
    if (hasAdd) for (let i = 0; i < k; i++) cx[4 + i] = this.sb(n);
    this.align();
    return cx;
  }
  rgb(): RGBA {
    return [this.u8(), this.u8(), this.u8(), 255];
  }
  rgba(): RGBA {
    return [this.u8(), this.u8(), this.u8(), this.u8()];
  }
}

// Gradient/bitmap matrices: source space is not twips, so a–d are divided by 20 too (spec §3).
const fillMatrix = (m: Matrix): Matrix => [m[0] / 20, m[1] / 20, m[2] / 20, m[3] / 20, m[4], m[5]];

function readFill(r: Reader, color: () => RGBA): Fill {
  const type = r.u8();
  if (type === 0x00) return { type: "solid", color: color() };
  if (type === 0x10 || type === 0x12 || type === 0x13) {
    const matrix = fillMatrix(r.matrix());
    const n = r.u8() & 15;
    const stops = Array.from({ length: n }, () => ({ ratio: r.u8(), color: color() }));
    if (type === 0x13) r.s16(); // focal point (SWF 8)
    return { type: type === 0x10 ? "linear" : "radial", matrix, stops };
  }
  if (type >= 0x40 && type <= 0x43) {
    const bitmap = r.u16();
    return { type: "bitmap", bitmap, matrix: fillMatrix(r.matrix()), repeat: !(type & 1), smooth: type < 0x42 };
  }
  throw new Error(`fill style type 0x${type.toString(16)}`);
}

function readMorphFill(r: Reader): [Fill, Fill] {
  const type = r.u8();
  if (type === 0x00) return [{ type: "solid", color: r.rgba() }, { type: "solid", color: r.rgba() }];
  if (type === 0x10 || type === 0x12) {
    const kind = type === 0x10 ? "linear" : "radial";
    const m0 = fillMatrix(r.matrix()), m1 = fillMatrix(r.matrix());
    const n = r.u8() & 15;
    const s0: { ratio: number; color: RGBA }[] = [], s1: typeof s0 = [];
    for (let i = 0; i < n; i++) s0.push({ ratio: r.u8(), color: r.rgba() }), s1.push({ ratio: r.u8(), color: r.rgba() });
    return [{ type: kind, matrix: m0, stops: s0 }, { type: kind, matrix: m1, stops: s1 }];
  }
  if (type >= 0x40 && type <= 0x43) {
    const bitmap = r.u16(), repeat = !(type & 1), smooth = type < 0x42;
    const m0 = fillMatrix(r.matrix()), m1 = fillMatrix(r.matrix());
    return [{ type: "bitmap", bitmap, matrix: m0, repeat, smooth }, { type: "bitmap", bitmap, matrix: m1, repeat, smooth }];
  }
  throw new Error(`morph fill style type 0x${type.toString(16)}`);
}

const count = (r: Reader, ext: boolean) => {
  const n = r.u8();
  return n === 0xff && ext ? r.u16() : n;
};

// ---- shape records → paths --------------------------------------------------------------------
// Coordinates are integer twips while chaining (exact point matching); `div` converts on output.
type Pt = [x0: number, y0: number, cx: number, cy: number, x1: number, y1: number]; // cx = NaN → straight
type Edge = { s: Pt; e?: Pt }; // e = paired end-shape edge (morph)
type Group<F, L> = { fills: F[]; lines: L[]; fe: Edge[][]; le: Edge[][] };

const rev = ([x0, y0, cx, cy, x1, y1]: Pt): Pt => [x1, y1, cx, cy, x0, y0];
const revEdge = (g: Edge): Edge => (g.e ? { s: rev(g.s), e: rev(g.e) } : { s: rev(g.s) });

function pathD(edges: Edge[], end: boolean, div: number, chainFill: boolean): string {
  const f = (v: number) => String(v / div);
  const pick = (g: Edge) => (end ? g.e! : g.s);
  const out: string[] = [];
  const seg = (p: Pt) => (Number.isNaN(p[2]) ? `L ${f(p[4])} ${f(p[5])}` : `Q ${f(p[2])} ${f(p[3])} ${f(p[4])} ${f(p[5])}`);
  if (!chainFill) {
    // line style: record order, new subpath when the pen jumps (jumps decided on the start shape)
    let px = NaN, py = NaN;
    for (const g of edges) {
      const p = pick(g);
      if (g.s[0] !== px || g.s[1] !== py) out.push(`M ${f(p[0])} ${f(p[1])}`);
      out.push(seg(p));
      (px = g.s[4]), (py = g.s[5]);
    }
    return out.join(" ");
  }
  return chainOrder(edges)
    .map((chain) => [`M ${f(pick(chain[0]!)[0])} ${f(pick(chain[0]!)[1])}`, ...chain.map((g) => seg(pick(g)))].join(" "))
    .join(" ");
}

// Chain fill edges into contours (by start-shape coordinates). Cached per edge list so the start and end
// path strings of a morph get the same order.
const chainCache = new WeakMap<Edge[], Edge[][]>();
function chainOrder(edges: Edge[]): Edge[][] {
  const hit = chainCache.get(edges);
  if (hit) return hit;
  const byStart = new Map<string, number[]>();
  edges.forEach((g, i) => {
    const k = `${g.s[0]},${g.s[1]}`;
    (byStart.get(k) ?? byStart.set(k, []).get(k)!).push(i);
  });
  const used = new Uint8Array(edges.length);
  const chains: Edge[][] = [];
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    const chain: Edge[] = [];
    for (let j: number | undefined = i; j !== undefined; ) {
      used[j] = 1;
      const g: Edge = edges[j]!;
      chain.push(g);
      const next = byStart.get(`${g.s[4]},${g.s[5]}`);
      while (next?.length && used[next[next.length - 1]!]) next.pop();
      j = next?.pop();
    }
    chains.push(chain);
  }
  chainCache.set(edges, chains);
  return chains;
}

function emitGroup<F, L>(g: Group<F, L>, div: number, morph: boolean, out: { fill?: F; line?: L; d: string | [string, string] }[]) {
  const d = (edges: Edge[], fill: boolean) =>
    morph ? ([pathD(edges, false, div, fill), pathD(edges, true, div, fill)] as [string, string]) : pathD(edges, false, div, fill);
  g.fe.forEach((edges, i) => edges.length && out.push({ fill: g.fills[i - 1]!, d: d(edges, true) }));
  g.le.forEach((edges, i) => edges.length && out.push({ line: g.lines[i - 1]!, d: d(edges, false) }));
}

// Reads SHAPE records after the style arrays. `styles` re-reads style arrays on StateNewStyles.
// `endEdges` (morph) supplies the paired end-shape edge for each start edge, in order.
function readShapeRecords<F, L>(
  r: Reader,
  fills: F[],
  lines: L[],
  div: number,
  styles?: () => [F[], L[]],
  endEdges?: Pt[],
): { fill?: F; line?: L; d: string | [string, string] }[] {
  let nf = r.ub(4), nl = r.ub(4);
  let x = 0, y = 0, f0 = 0, f1 = 0, ln = 0, k = 0;
  const out: { fill?: F; line?: L; d: string | [string, string] }[] = [];
  const group = (): Group<F, L> => ({ fills, lines, fe: fills.map(() => []).concat([[]]), le: lines.map(() => []).concat([[]]) });
  let g = group();
  for (;;) {
    if (!r.ub(1)) {
      const flags = r.ub(5);
      if (!flags) break;
      if (flags & 1) {
        const n = r.ub(5);
        (x = r.sb(n)), (y = r.sb(n));
      }
      if (flags & 2) f0 = r.ub(nf);
      if (flags & 4) f1 = r.ub(nf);
      if (flags & 8) ln = r.ub(nl);
      if (flags & 16 && styles) {
        emitGroup(g, div, !!endEdges, out);
        [fills, lines] = styles();
        (nf = r.ub(4)), (nl = r.ub(4));
        g = group();
      }
      continue;
    }
    const s = readEdge(r, x, y);
    (x = s[4]), (y = s[5]);
    const edge: Edge = { s };
    if (endEdges) {
      let e = endEdges[k++];
      if (!e) throw new Error("morph end shape has fewer edges than start shape");
      // straight ↔ curve pairing: straight edge becomes a curve with the control point at its midpoint
      const curve = (p: Pt): Pt => (Number.isNaN(p[2]) ? [p[0], p[1], (p[0] + p[4]) / 2, (p[1] + p[5]) / 2, p[4], p[5]] : p);
      if (Number.isNaN(s[2]) !== Number.isNaN(e[2])) (edge.s = curve(s)), (e = curve(e));
      edge.e = e;
    }
    if (f1) g.fe[f1]?.push(edge);
    if (f0) g.fe[f0]?.push(revEdge(edge));
    if (ln) g.le[ln]?.push(edge);
  }
  r.align();
  emitGroup(g, div, !!endEdges, out);
  return out;
}

// Edge record body (after the TypeFlag=1 bit), absolute twips from pen (x, y).
function readEdge(r: Reader, x: number, y: number): Pt {
  const straight = r.ub(1), n = r.ub(4) + 2;
  if (straight) {
    let dx = 0, dy = 0;
    if (r.ub(1)) (dx = r.sb(n)), (dy = r.sb(n));
    else if (r.ub(1)) dy = r.sb(n);
    else dx = r.sb(n);
    return [x, y, NaN, NaN, x + dx, y + dy];
  }
  const cx = x + r.sb(n), cy = y + r.sb(n);
  return [x, y, cx, cy, cx + r.sb(n), cy + r.sb(n)];
}

// End-shape edges of a morph (only edges and moveTo records), absolute twips.
function readEndEdges(r: Reader): Pt[] {
  r.ub(4), r.ub(4);
  let x = 0, y = 0;
  const out: Pt[] = [];
  for (;;) {
    if (r.ub(1)) {
      const e = readEdge(r, x, y);
      out.push(e);
      (x = e[4]), (y = e[5]);
      continue;
    }
    const flags = r.ub(5);
    if (!flags) break;
    if (flags & 1) {
      const n = r.ub(5);
      (x = r.sb(n)), (y = r.sb(n));
    }
    if (flags & 0b11110) throw new Error("morph end shape has a style change");
  }
  return out;
}

// ---- bitmaps ----------------------------------------------------------------------------------
// Rebuild one clean JPEG stream: drop every SOI/EOI (JPEGTables + DefineBits concatenation, the
// `FF D9 FF D8` erroneous header), keep segments and entropy data in order. Also returns SOF size.
export function cleanJpeg(b: Uint8Array): { data: Uint8Array; width: number; height: number } {
  const parts: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  let i = 0, width = 0, height = 0;
  while (i + 1 < b.length) {
    const m = b[i + 1]!;
    if (b[i] !== 0xff || m === 0xff || m === 0x00 || (m >= 0xd0 && m <= 0xd9)) {
      i += b[i] === 0xff && m !== 0xff ? 2 : 1;
      continue;
    }
    let j = i + 2 + ((b[i + 2]! << 8) | b[i + 3]!);
    if (m === 0xda) while (j + 1 < b.length && !(b[j] === 0xff && b[j + 1] !== 0 && !(b[j + 1]! >= 0xd0 && b[j + 1]! <= 0xd7))) j++;
    if (m >= 0xc0 && m <= 0xc3) (height = (b[i + 5]! << 8) | b[i + 6]!), (width = (b[i + 7]! << 8) | b[i + 8]!);
    parts.push(b.subarray(i, j));
    i = j;
  }
  parts.push(new Uint8Array([0xff, 0xd9]));
  return { data: Buffer.concat(parts), width, height };
}

// DefineBitsLossless(2) → straight-alpha RGBA.
function decodeLossless(t: Reader, end: number, v2: boolean): { rgba: Uint8ClampedArray; width: number; height: number } {
  const format = t.u8(), width = t.u16(), height = t.u16();
  const ctSize = format === 3 ? t.u8() + 1 : 0;
  const data = inflateSync(t.bytes(end - t.pos));
  const rgba = new Uint8ClampedArray(width * height * 4);
  const put = (o: number, r: number, g: number, b: number, a: number) => {
    const k = a && a < 255 ? 255 / a : 1; // premultiplied → straight
    (rgba[o] = r * k), (rgba[o + 1] = g * k), (rgba[o + 2] = b * k), (rgba[o + 3] = a);
  };
  if (format === 3) {
    const cw = v2 ? 4 : 3, stride = (width + 3) & ~3, base = ctSize * cw;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const c = data[base + y * stride + x]! * cw;
        put((y * width + x) * 4, data[c]!, data[c + 1]!, data[c + 2]!, v2 ? data[c + 3]! : 255);
      }
  } else if (format === 4) {
    const stride = (width * 2 + 3) & ~3;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const p = (data[y * stride + x * 2]! << 8) | data[y * stride + x * 2 + 1]!;
        put((y * width + x) * 4, ((p >> 10) & 31) * 8.226, ((p >> 5) & 31) * 8.226, (p & 31) * 8.226, 255);
      }
  } else if (format === 5) {
    for (let i = 0; i < width * height; i++) put(i * 4, data[i * 4 + 1]!, data[i * 4 + 2]!, data[i * 4 + 3]!, v2 ? data[i * 4]! : 255);
  } else throw new Error(`lossless format ${format}`);
  return { rgba, width, height };
}

// ---- tags -------------------------------------------------------------------------------------
const CLIP_EVENTS: (ClipEvent | null)[][] = [
  ["keyUp", "keyDown", "mouseUp", "mouseDown", "mouseMove", "unload", "enterFrame", "load"],
  ["dragOver", "rollOut", "rollOver", "releaseOutside", "release", "press", "initialize", "data"],
  [null, null, null, null, null, "construct", "keyPress", "dragOut"],
];
const BUTTON_CONDS: ButtonCondition[] = [
  "idleToOverDown", "outDownToIdle", "outDownToOverDown", "overDownToOutDown",
  "overDownToOverUp", "overUpToOverDown", "overUpToIdle", "idleToOverUp",
];
const BUTTON_STATES: ButtonState[] = ["hit", "down", "over", "up"]; // bits 3..0
const ALIGN = ["left", "right", "center", "justify"] as const;

type Ctx = {
  version: number;
  base: string;
  symbols: Record<string, SwfSymbol>;
  exports: Record<string, number>;
  imports: SwfFile["imports"];
  images: SwfImage[];
  warnings: string[];
  jpegTables: Uint8Array;
  background: string | null;
};

function bits(b: Uint8Array, names: (string | null)[][]): string[] {
  const out: string[] = [];
  names.forEach((row, i) => row.forEach((n, bit) => n && b[i]! & (0x80 >> bit) && out.push(n)));
  return out;
}

function readPlace2(t: Reader, end: number, ctx: Ctx): DisplayOp {
  const f = t.u8();
  const op: DisplayOp = { op: "place", depth: t.u16() };
  if (f & 1) op.move = true;
  if (f & 2) op.id = t.u16();
  if (f & 4) op.matrix = t.matrix();
  if (f & 8) op.cxform = t.cxform(true);
  if (f & 16) op.ratio = t.u16();
  if (f & 32) op.name = t.str();
  if (f & 64) op.clipDepth = t.u16();
  if (f & 128) {
    const n = ctx.version >= 6 ? 4 : 2;
    t.u16(), t.bytes(n); // reserved, all-events
    const list: ClipAction[] = [];
    while (t.pos < end) {
      const flags = t.bytes(n);
      if (flags.every((b) => !b)) break;
      const size = t.u32(), stop = t.pos + size;
      const a: ClipAction = { events: bits(flags, CLIP_EVENTS) as ClipEvent[], bytecode: "" };
      if (a.events.includes("keyPress")) a.key = t.u8();
      a.bytecode = b64(t.bytes(stop - t.pos));
      list.push(a);
    }
    op.clipActions = list;
  }
  return op;
}

function readTimeline(r: Reader, end: number, frameCount: number, ctx: Ctx, where: string): Timeline {
  const frames: Frame[] = [];
  let cur: Frame = {};
  const op = (o: DisplayOp) => (cur.ops ??= []).push(o);
  while (r.pos < end) {
    const h = r.u16(), code = h >> 6;
    let len = h & 63;
    if (len === 63) len = r.u32();
    const t = new Reader(r.b, r.pos), tagEnd = r.pos + len;
    r.pos = tagEnd;
    if (code === 0) break;
    try {
      readTag(code, t, tagEnd);
    } catch (e) {
      ctx.warnings.push(`${where} tag ${code}: ${(e as Error).message}`);
    }
  }
  if (Object.keys(cur).length) frames.push(cur), ctx.warnings.push(`${where}: tags after last ShowFrame`);
  if (frames.length !== frameCount) ctx.warnings.push(`${where}: ${frames.length} ShowFrame for frameCount ${frameCount}`);
  while (frames.length < frameCount) frames.push({});
  return { frameCount: frames.length, frames };

  function readTag(code: number, t: Reader, tagEnd: number) {
    const v = ctx.version;
    switch (code) {
      case 1: // ShowFrame
        frames.push(cur);
        cur = {};
        return;
      case 4: { // PlaceObject
        const id = t.u16(), depth = t.u16(), matrix = t.matrix();
        op(t.pos < tagEnd ? { op: "place", depth, id, matrix, cxform: t.cxform(false) } : { op: "place", depth, id, matrix });
        return;
      }
      case 26: return op(readPlace2(t, tagEnd, ctx));
      case 5: return t.u16(), op({ op: "remove", depth: t.u16() });
      case 28: return op({ op: "remove", depth: t.u16() });
      case 43:
        if (cur.label) ctx.warnings.push(`${where}: second label "${t.str()}" on frame ${frames.length + 1} dropped`);
        else cur.label = t.str();
        return;
      case 12: return void (cur.actions ??= []).push(b64(t.bytes(tagEnd - t.pos)));
      case 59: {
        const id = t.u16();
        (cur.initActions ??= []).push({ id, bytecode: b64(t.bytes(tagEnd - t.pos)) });
        return;
      }
      case 15: return void (cur.sounds ??= []).push(readStartSound(t));
      case 9: {
        const [r0, g, b] = t.rgb();
        ctx.background = "#" + [r0, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
        return;
      }
      case 2: case 22: case 32: return define(readShape(t, code === 2 ? 1 : code === 22 ? 2 : 3));
      case 46: return define(readMorph(t));
      case 39: {
        const id = t.u16(), fc = t.u16();
        return define({ type: "sprite", id, ...readTimeline(t, tagEnd, fc, ctx, `sprite ${id}`) });
      }
      case 34: return define(readButton2(t, tagEnd));
      case 11: case 33: return define(readText(t, code === 33));
      case 37: return define(readEditText(t));
      case 48: return define(readFont2(t));
      case 8: ctx.jpegTables = t.bytes(tagEnd - t.pos); return;
      case 6: case 21: case 35: {
        const id = t.u16();
        const alphaAt = code === 35 ? t.u32() : 0;
        const raw = t.bytes((code === 35 ? alphaAt : tagEnd - t.pos));
        const { data, width, height } = cleanJpeg(code === 6 ? Buffer.concat([ctx.jpegTables, raw]) : raw);
        const alpha = code === 35 ? new Uint8Array(inflateSync(t.bytes(tagEnd - t.pos))) : undefined;
        ctx.images.push(alpha ? { id, jpeg: data, alpha, width, height } : { id, jpeg: data, width, height });
        return define({ type: "bitmap", id, width, height, file: `${ctx.base}/${id}.${alpha ? "png" : "jpg"}` });
      }
      case 20: case 36: {
        const id = t.u16();
        const img = decodeLossless(t, tagEnd, code === 36);
        ctx.images.push({ id, ...img });
        return define({ type: "bitmap", id, width: img.width, height: img.height, file: `${ctx.base}/${id}.png` });
      }
      case 14: {
        const id = t.u16(), f = t.u8();
        return define({ type: "sound", id, format: f >> 4, rate: [5512, 11025, 22050, 44100][(f >> 2) & 3]!, is16Bit: !!(f & 2), stereo: !!(f & 1), samples: t.u32() });
      }
      case 56: {
        for (let n = t.u16(); n--; ) {
          const id = t.u16();
          ctx.exports[t.str()] = id;
        }
        return;
      }
      case 57: {
        const url = t.str(), items: { name: string; id: number }[] = [];
        for (let n = t.u16(); n--; ) {
          const id = t.u16();
          items.push({ name: t.str(), id });
        }
        ctx.imports.push({ url, items });
        return;
      }
      case 18: case 45: case 19: case 24: case 58: case 63: case 64: return; // stream heads (no blocks), protect, debugger
      default:
        ctx.warnings.push(`${where}: unsupported tag ${code} (v${v})`);
    }
  }

  function define(s: SwfSymbol) {
    if (ctx.symbols[s.id]) ctx.warnings.push(`duplicate character ${s.id}`);
    ctx.symbols[s.id] = s;
  }

  function readShape(t: Reader, v: number): SwfSymbol {
    const id = t.u16(), bounds = t.rect();
    const color = v >= 3 ? () => t.rgba() : () => t.rgb();
    const styles = (): [Fill[], Line[]] => [
      Array.from({ length: count(t, v >= 2) }, () => readFill(t, color)),
      Array.from({ length: count(t, v >= 2) }, () => ({ width: t.u16() / 20, color: color() })),
    ];
    const [fills, lines] = styles();
    const paths = readShapeRecords(t, fills, lines, 20, v >= 2 ? styles : undefined) as ShapePath[];
    return { type: "shape", id, bounds, paths };
  }

  function readMorph(t: Reader): SwfSymbol {
    const id = t.u16(), b0 = t.rect(), b1 = t.rect();
    const offset = t.u32(), endAt = t.pos + offset;
    const fills = Array.from({ length: count(t, true) }, () => readMorphFill(t));
    const lines = Array.from({ length: count(t, true) }, (): [Line, Line] => {
      const w0 = t.u16() / 20, w1 = t.u16() / 20;
      return [{ width: w0, color: t.rgba() }, { width: w1, color: t.rgba() }];
    });
    const endEdges = readEndEdges(new Reader(t.b, endAt));
    const paths = readShapeRecords(t, fills, lines, 20, undefined, endEdges) as MorphPath[];
    return { type: "morph", id, bounds: [b0, b1], paths };
  }

  function readButton2(t: Reader, tagEnd: number): ButtonSymbol {
    const id = t.u16(), trackAsMenu = !!(t.u8() & 1), actionOffset = t.u16(), actionsAt = t.pos - 2 + actionOffset;
    const records: ButtonSymbol["records"] = [];
    for (let f = t.u8(); f; f = t.u8()) {
      const rec: ButtonSymbol["records"][number] = {
        states: BUTTON_STATES.filter((_, i) => f & (8 >> i)),
        id: t.u16(),
        depth: t.u16(),
        matrix: t.matrix(),
      };
      const cx = t.cxform(true);
      if (cx.some((c, i) => c !== (i < 4 ? 1 : 0))) rec.cxform = cx;
      records.push(rec);
    }
    const actions: ButtonSymbol["actions"] = [];
    if (actionOffset) {
      t.pos = actionsAt;
      for (let more = true; more && t.pos < tagEnd; ) {
        const start = t.pos, size = t.u16();
        more = size !== 0;
        const c = t.bytes(2), key = c[1]! >> 1;
        const conds = bits(c, [BUTTON_CONDS, [null, null, null, null, null, null, null, "overDownToIdle"]]) as ButtonCondition[];
        const a: ButtonSymbol["actions"][number] = { conditions: conds, bytecode: b64(t.bytes((more ? start + size : tagEnd) - t.pos)) };
        if (key) a.key = key;
        actions.push(a);
      }
    }
    return { type: "button", id, trackAsMenu, records, actions };
  }

  function readText(t: Reader, v2: boolean): TextSymbol {
    const id = t.u16(), bounds = t.rect(), matrix = t.matrix(), gb = t.u8(), ab = t.u8();
    const records: TextSymbol["records"] = [];
    let font = 0, size = 0, color: RGBA = [0, 0, 0, 255], x = 0, y = 0;
    for (let f = t.u8(); f; f = t.u8()) {
      if (f & 8) font = t.u16();
      if (f & 4) color = v2 ? t.rgba() : t.rgb();
      if (f & 1) x = t.s16() / 20;
      if (f & 2) y = t.s16() / 20;
      if (f & 8) size = t.u16() / 20;
      const glyphs: [number, number][] = [];
      for (let n = t.u8(); n--; ) glyphs.push([t.ub(gb), t.sb(ab) / 20]);
      records.push({ font, size, color, x, y, glyphs });
      for (const g of glyphs) x += g[1];
    }
    return { type: "text", id, bounds, matrix, records };
  }

  function readEditText(t: Reader): EditTextSymbol {
    const id = t.u16(), bounds = t.rect(), a = t.u8(), b = t.u8();
    const s: EditTextSymbol = {
      type: "edittext", id, bounds, html: !!(b & 2), wordWrap: !!(a & 0x40), multiline: !!(a & 0x20), password: !!(a & 0x10),
      readOnly: !!(a & 8), selectable: !(b & 0x10), border: !!(b & 8), autoSize: !!(b & 0x40), useOutlines: !!(b & 1),
    };
    if (a & 1) s.font = t.u16();
    if (b & 0x80) t.str(); // font class (SWF 9+)
    if (a & 1 || b & 0x80) s.size = t.u16() / 20;
    if (a & 4) s.color = t.rgba();
    if (a & 2) s.maxLength = t.u16();
    if (b & 0x20) {
      s.align = ALIGN[t.u8()] ?? "left";
      (s.leftMargin = t.u16() / 20), (s.rightMargin = t.u16() / 20), (s.indent = t.u16() / 20), (s.leading = t.s16() / 20);
    }
    const variable = t.str();
    if (variable) s.variable = variable;
    if (a & 0x80) s.text = t.str();
    return s;
  }

  function readFont2(t: Reader): FontSymbol {
    const id = t.u16(), f = t.u8();
    t.u8(); // language
    const name = utf8.decode(t.bytes(t.u8())).replace(/\0+$/, "");
    const n = t.u16(), table = t.pos, wide = !!(f & 8);
    const offsets = Array.from({ length: n }, () => (wide ? t.u32() : t.u16()));
    const codeAt = table + (wide ? t.u32() : t.u16());
    const dummy: Fill = { type: "solid", color: [0, 0, 0, 255] };
    const glyphs: FontSymbol["glyphs"] = offsets.map((o) => ({
      code: 0,
      d: readShapeRecords(new Reader(t.b, table + o), [dummy], [], 1).map((p) => p.d).join(" "),
    }));
    t.pos = codeAt;
    for (const g of glyphs) g.code = f & 4 ? t.u16() : t.u8();
    const font: FontSymbol = { type: "font", id, name, bold: !!(f & 1), italic: !!(f & 2), glyphs };
    if (f & 0x80) {
      (font.ascent = t.u16()), (font.descent = t.u16()), (font.leading = t.s16());
      for (const g of glyphs) g.advance = t.s16();
    }
    return font;
  }
}

function readStartSound(t: Reader): StartSound {
  const s: StartSound = { id: t.u16() };
  const f = t.u8();
  if (f & 0x20) s.stop = true;
  if (f & 0x10) s.noMultiple = true;
  if (f & 1) s.inPoint = t.u32();
  if (f & 2) s.outPoint = t.u32();
  if (f & 4) s.loops = t.u16();
  if (f & 8) s.envelope = Array.from({ length: t.u8() }, () => [t.u32(), t.u16(), t.u16()]);
  return s;
}

export function parseSwf(raw: Uint8Array, src: string): { swf: SwfFile; images: SwfImage[]; warnings: string[] } {
  const sig = String.fromCharCode(raw[0]!, raw[1]!, raw[2]!), version = raw[3]!;
  if (sig !== "FWS" && sig !== "CWS") throw new Error(`not a SWF (${sig})`);
  const body = sig === "CWS" ? new Uint8Array(inflateSync(raw.subarray(8))) : raw.subarray(8);
  const r = new Reader(body);
  const [x0, y0, x1, y1] = r.rect();
  const frameRate = r.u16() / 256, frameCount = r.u16();
  const ctx: Ctx = {
    version, base: src.replace(/^.*\//, "").replace(/\.swf$/i, ""), symbols: {}, exports: {}, imports: [],
    images: [], warnings: [], jpegTables: new Uint8Array(0), background: null,
  };
  const root = readTimeline(r, body.length, frameCount, ctx, "root");
  const swf: SwfFile = {
    format: "dofus-swf-json", formatVersion: 1, src, version, width: x1 - x0, height: y1 - y0, frameRate,
    background: ctx.background, root, symbols: ctx.symbols, exports: ctx.exports, imports: ctx.imports,
  };
  return { swf, images: ctx.images, warnings: ctx.warnings };
}
