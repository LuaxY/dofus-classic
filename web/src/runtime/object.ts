// DisplayObject: AS-visible display properties shared by MovieClip, Button, TextField and static graphics.
// Internal state lives in the non-enumerable `$` so `for…in` over a clip only sees AS-visible properties.
import type { ColorTransform, Matrix, Rect } from "../swf/types.ts";
import { ID, NO_CX, inv, mul, mulCx, type LoadedSwf } from "../swf/render.ts";
import type { MovieClip } from "./movieclip.ts";
import type { Player } from "./player.ts";

/** The running player (Flash has exactly one). Set by `new Player()`. */
export let player: Player;
export const setPlayer = (p: Player) => void (player = p);

/** AS depth of a timeline depth: SWF depth 1 is AS depth −16383 (`getDepth()`); script depths are ≥ 0. */
export const TL = -16384;
export const EMPTY_BOUNDS = 6710886.35; // what Flash's getBounds() returns for empty clips

export type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };
export type Point = { x: number; y: number };

export type Internal = {
  parent?: MovieClip;
  name: string;
  depth: number; // AS depth
  matrix: Matrix;
  cx: ColorTransform;
  dec?: [sx: number, sy: number, rot: number, skew: number]; // cached _xscale/_yscale/_rotation
  scripted: boolean; // transformed by script → timeline moves no longer apply (docs/runtime.md §3.3)
  visible: boolean;
  ratio: number;
  clipDepth?: number; // AS depth; this object is a timeline mask
  placeFrame: number; // timeline frame that placed it; 0 = owned by script
  removed: boolean;
  swf?: LoadedSwf; // library this object belongs to
  id: number; // character id (0 = none / root timeline)
  maskOf?: DisplayObject; // setMask target
  detached?: boolean; // button state content: has a _parent but is not in its child list
};

const deg = (r: number) => {
  const d = (r * 180) / Math.PI;
  return d > 180 ? d - 360 : d <= -180 ? d + 360 : d;
};
const toBool = (v: unknown) => (typeof v === "string" ? !!Number(v) : !!v);

export abstract class DisplayObject<I extends Internal = Internal> {
  [key: string]: unknown;
  declare readonly $: I;

  constructor(init: Partial<Internal> & Omit<I, keyof Internal>) {
    const base: Internal = { name: "", depth: 0, matrix: ID, cx: NO_CX, scripted: false, visible: true, ratio: 0, placeFrame: 0, removed: false, id: 0 };
    Object.defineProperty(this, "$", { value: { ...base, ...init } });
  }

  // ---- implemented by subclasses ----------------------------------------------------------------
  /** Draw content (not the object's own transform) in local space. */
  abstract $draw(ctx: CanvasRenderingContext2D, cx: ColorTransform): void;
  /** Content bounds under `m` (local → target space). */
  abstract $bounds(m: Matrix): Rect | null;
  /** Shape hit test, point in local space. */
  abstract $hitLocal(x: number, y: number): boolean;
  /** Union of fill geometry under `m`, for masks. */
  abstract $fills(out: Path2D, m: Matrix): void;

  // ---- transform --------------------------------------------------------------------------------
  /** Timeline matrix write (ignored once script transformed the object). */
  $setMatrix(m: Matrix) {
    this.$.matrix = m;
    this.$.dec = undefined;
  }
  private $dec() {
    const $ = this.$;
    if (!$.dec) {
      const [a, b, c, d] = $.matrix, rot = Math.atan2(b, a);
      $.dec = [Math.hypot(a, b), Math.hypot(c, d), rot, Math.atan2(-c, d) - rot];
    }
    return $.dec;
  }
  private $compose(sx: number, sy: number, rot: number, skew: number) {
    const m = this.$.matrix;
    this.$.matrix = [sx * Math.cos(rot), sx * Math.sin(rot), -sy * Math.sin(rot + skew), sy * Math.cos(rot + skew), m[4], m[5]];
    this.$.dec = [sx, sy, rot, skew];
    this.$.scripted = true;
  }
  private $setT(i: 4 | 5, v: unknown) {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return;
    const m = [...this.$.matrix] as Matrix;
    m[i] = Math.trunc(n * 20) / 20; // twips
    this.$.matrix = m;
    this.$.scripted = true;
  }

  get _x(): number { return this.$.matrix[4]; }
  set _x(v: number) { this.$setT(4, v); }
  get _y(): number { return this.$.matrix[5]; }
  set _y(v: number) { this.$setT(5, v); }
  get _xscale(): number { return this.$dec()[0] * 100; }
  set _xscale(v: number) { const [, sy, r, k] = this.$dec(); if (!Number.isNaN(Number(v))) this.$compose(Number(v) / 100, sy, r, k); }
  get _yscale(): number { return this.$dec()[1] * 100; }
  set _yscale(v: number) { const [sx, , r, k] = this.$dec(); if (!Number.isNaN(Number(v))) this.$compose(sx, Number(v) / 100, r, k); }
  get _rotation(): number { return deg(this.$dec()[2]); }
  set _rotation(v: number) { const [sx, sy, , k] = this.$dec(); if (!Number.isNaN(Number(v))) this.$compose(sx, sy, (deg((Number(v) * Math.PI) / 180) * Math.PI) / 180, k); }
  get _alpha(): number { return this.$.cx[3] * 100; }
  set _alpha(v: number) {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return;
    const cx = [...this.$.cx] as ColorTransform;
    cx[3] = Math.trunc(n * 2.56) / 256; // 8.8 fixed point
    this.$.cx = cx;
    this.$.scripted = true;
  }
  get _visible(): boolean { return this.$.visible; }
  set _visible(v: boolean) { this.$.visible = toBool(v); }
  get _width(): number { const b = this.$bounds(this.$.matrix); return b ? b[2] - b[0] : 0; }
  set _width(v: number) { this.$setSize(0, Number(v)); }
  get _height(): number { const b = this.$bounds(this.$.matrix); return b ? b[3] - b[1] : 0; }
  set _height(v: number) { this.$setSize(1, Number(v)); }
  protected $setSize(axis: 0 | 1, v: number) {
    // ponytail: exact for unrotated objects (all call sites); Flash's rotated-case formula is not reproduced
    const b = this.$bounds(ID);
    const local = b ? b[axis + 2]! - b[axis]! : 0;
    if (!local || Number.isNaN(v)) return;
    if (axis === 0) this._xscale = (v / local) * 100 * Math.sign(this._xscale || 1);
    else this._yscale = (v / local) * 100 * Math.sign(this._yscale || 1);
  }

  // ---- identity -------------------------------------------------------------------------------
  get _name(): string { return this.$.name; }
  set _name(v: string) {
    const p = this.$.parent, old = this.$.name;
    this.$.name = String(v);
    if (p && !this.$.detached) bindName(p, old, this), bindName(p, this.$.name, true);
  }
  get _parent(): MovieClip | undefined { return this.$.parent; }
  get _root(): MovieClip { return player.root; }
  get _target(): string {
    const names: string[] = [];
    for (let o: DisplayObject | undefined = this; o?.$.parent; o = o.$.parent) names.unshift(o.$.name);
    return "/" + names.join("/");
  }
  get _url(): string { return this.$.swf?.file.src ?? ""; }
  get _xmouse(): number { return this.globalToLocal({ x: player.mouseX, y: player.mouseY }).x; }
  get _ymouse(): number { return this.globalToLocal({ x: player.mouseX, y: player.mouseY }).y; }
  toString(): string {
    const names: string[] = [];
    for (let o: DisplayObject | undefined = this; o?.$.parent; o = o.$.parent) names.unshift(o.$.name);
    return ["_level0", ...names].join(".");
  }

  // ---- geometry -------------------------------------------------------------------------------
  /** Local → stage matrix. */
  $world(): Matrix {
    let m = this.$.matrix;
    for (let p = this.$.parent; p; p = p.$.parent) m = mul(p.$.matrix, m);
    return m;
  }
  /** Concatenated colour transform (for hit tests / debugging). */
  $worldCx(): ColorTransform {
    let cx = this.$.cx;
    for (let p = this.$.parent; p; p = p.$.parent) cx = mulCx(p.$.cx, cx);
    return cx;
  }
  localToGlobal(pt: Point): Point {
    const [a, b, c, d, tx, ty] = this.$world(), x = pt.x, y = pt.y;
    pt.x = a * x + c * y + tx;
    pt.y = b * x + d * y + ty;
    return pt;
  }
  globalToLocal(pt: Point): Point {
    const m = inv(this.$world());
    if (!m) return pt;
    const [a, b, c, d, tx, ty] = m, x = pt.x, y = pt.y;
    pt.x = a * x + c * y + tx;
    pt.y = b * x + d * y + ty;
    return pt;
  }
  getBounds(target?: DisplayObject): Bounds {
    const t = target ? inv(target.$world()) : ID;
    const b = t && this.$bounds(target ? mul(t, this.$world()) : ID);
    return b ? { xMin: b[0], yMin: b[1], xMax: b[2], yMax: b[3] } : { xMin: EMPTY_BOUNDS, yMin: EMPTY_BOUNDS, xMax: EMPTY_BOUNDS, yMax: EMPTY_BOUNDS };
  }
  /** Stage point on the shape (shapeFlag) or on the bounding box; or bounding-box overlap with `x` as an object. */
  hitTest(x: number | DisplayObject, y?: number, shapeFlag?: boolean): boolean {
    if (x instanceof DisplayObject) {
      const a = this.$bounds(this.$world()), b = x.$bounds(x.$world());
      return !!a && !!b && a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
    }
    if (shapeFlag) return this.$hitGlobal(Number(x), Number(y));
    const b = this.$bounds(this.$world());
    return !!b && x >= b[0] && x <= b[2] && Number(y) >= b[1] && Number(y) <= b[3];
  }
  $hitGlobal(x: number, y: number): boolean {
    const m = inv(this.$world());
    return !!m && this.$hitLocal(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]);
  }

  // ---- depth ----------------------------------------------------------------------------------
  getDepth(): number { return this.$.depth; }
  swapDepths(target: number | DisplayObject) {
    const p = this.$.parent;
    if (!p || this.$.detached) return;
    const d = target instanceof DisplayObject ? (target.$.parent === p ? target.$.depth : undefined) : Number(target);
    if (d === undefined || Number.isNaN(d) || d === this.$.depth) return;
    const kids = p.$.children, other = kids.find((c) => c.$.depth === d);
    if (other) (other.$.depth = this.$.depth), (other.$.placeFrame = 0);
    this.$.depth = d;
    this.$.placeFrame = 0; // the timeline no longer owns swapped objects
    kids.sort((a, b) => a.$.depth - b.$.depth);
    bindName(p, this.$.name); // with a shared name, the depth order decides which child the name finds
    if (other) bindName(p, other.$.name);
  }

  /** Remove from the display list (no depth check; `removeMovieClip` applies Flash's rule). */
  $remove() {
    const $ = this.$;
    if ($.removed) return;
    const p = $.parent;
    if (p && !$.detached) {
      const i = p.$.children.indexOf(this);
      if (i >= 0) p.$.children.splice(i, 1);
      bindName(p, $.name, this);
    }
    this.$unload();
  }
  /** Mark removed (recursively) and fire unload handlers. */
  $unload() {
    this.$.removed = true;
    if (this.$.maskOf) (this.$.maskOf.$ as Internal & { mask?: DisplayObject }).mask = undefined;
    player?.forget(this);
  }
}

/**
 * Re-point `parent[name]` at the child that name resolves to. Several children may share a name (createEmptyMovieClip
 * and attachMovie only replace by depth); Flash resolves the name to the first one in depth order (Ruffle
 * `ChildContainer::get_name`: "If multiple children with the same name exist, the one that occurs first in the render
 * list wins"). `left`: a child that no longer holds the name (the binding only moves if it was its), or `true` when a
 * child was just added under it.
 */
export function bindName(p: DisplayObject & { $: { children: DisplayObject[] } }, name: string, left?: DisplayObject | true) {
  if (!name) return;
  const bag = p as unknown as Record<string, unknown>, cur = bag[name];
  const held = left === true || (left ? cur === left : cur === undefined || (cur instanceof DisplayObject && p.$.children.includes(cur)));
  if (!held) return; // another value owns the name (a variable, or a child that keeps it)
  const first = p.$.children.find((k) => k.$.name === name);
  if (first) bag[name] = first;
  else delete bag[name];
}

/** Listener / handler call. A removed clip resolves to nothing in Flash, so its handlers never run (Key, Mouse and
 *  TextField listeners it left registered included). */
export function call(o: unknown, name: string, ...args: unknown[]) {
  if (o instanceof DisplayObject && o.$.removed) return;
  const f = (o as Record<string, unknown> | null | undefined)?.[name];
  if (typeof f === "function") f.apply(o, args);
}

/** Draw a child list in depth order with timeline masks (`clipDepth`). */
export function drawList(ctx: CanvasRenderingContext2D, list: readonly DisplayObject[], cx: ColorTransform) {
  const masks: number[] = [];
  for (const n of list) {
    while (masks.length && n.$.depth > masks[masks.length - 1]!) ctx.restore(), masks.pop();
    if (n.$.clipDepth !== undefined) {
      const p = new Path2D();
      n.$fills(p, n.$.matrix);
      ctx.save();
      ctx.clip(p, "nonzero");
      masks.push(n.$.clipDepth);
      continue;
    }
    if (n.$.visible && !n.$.maskOf) drawNode(ctx, n, cx);
  }
  while (masks.pop() !== undefined) ctx.restore();
}

export function drawNode(ctx: CanvasRenderingContext2D, n: DisplayObject, cx: ColorTransform) {
  ctx.save();
  ctx.transform(...n.$.matrix);
  const mask = (n.$ as Internal & { mask?: DisplayObject }).mask;
  if (mask && !mask.$.removed) {
    const m = inv(n.$world());
    const p = new Path2D();
    if (m) mask.$fills(p, mul(m, mask.$world()));
    ctx.clip(p, "nonzero");
  }
  n.$draw(ctx, n.$.cx === NO_CX ? cx : mulCx(cx, n.$.cx));
  ctx.restore();
}

/** Bounds of a child list under `m`, skipping masks. */
export function listBounds(list: readonly DisplayObject[], m: Matrix, start: Rect | null = null): Rect | null {
  let out = start;
  for (const c of list) {
    if (c.$.clipDepth !== undefined || c.$.maskOf) continue;
    const b = c.$bounds(mul(m, c.$.matrix));
    if (b) out = out ? [Math.min(out[0], b[0]), Math.min(out[1], b[1]), Math.max(out[2], b[2]), Math.max(out[3], b[3])] : b;
  }
  return out;
}

/** Hit test of a child list, point in the list owner's local space; respects timeline masks. */
export function listHit(list: readonly DisplayObject[], x: number, y: number): boolean {
  for (const c of list) {
    if (!c.$.visible || c.$.maskOf || c.$.clipDepth !== undefined) continue;
    const m = inv(c.$.matrix);
    if (!m || !c.$hitLocal(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])) continue;
    const mask = list.find((k) => k.$.clipDepth !== undefined && k.$.depth < c.$.depth && c.$.depth <= k.$.clipDepth);
    if (mask) {
      const mm = inv(mask.$.matrix);
      if (!mm || !mask.$hitLocal(mm[0] * x + mm[2] * y + mm[4], mm[1] * x + mm[3] * y + mm[5])) continue;
    }
    return true;
  }
  return false;
}
