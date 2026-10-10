// MovieClip with Flash 6 timeline semantics, plus Button (DefineButton2) and Graphic (shapes, morphs, static
// text, bitmaps). Semantics and evidence: docs/runtime.md §3.
import type {
  BitmapSymbol, ButtonCondition, ButtonState, ButtonSymbol, ClipAction, ColorTransform, DisplayOp, Fill, Line, Matrix,
  MorphSymbol, Rect, ShapePath, ShapeSymbol, TextSymbol, Timeline,
} from "../swf/types.ts";
import { dom, drawMorph, drawShapePaths, drawText, ID, lerp, morphPath, mul, NO_CX, path, resolve, xform, type LoadedSwf } from "../swf/render.ts";
import { runActions, setMember } from "./avm1.ts";
import { bindName, DisplayObject, drawList, listBounds, listHit, player, TL, type Internal } from "./object.ts";
import { TextField } from "./text.ts";

/** SWFs whose scripts are the game code: never interpreted, only reached through `Player.scriptHook`. */
export const CODE_SWFS = new Set(["AKSClient.swf", "modules/Interfaces.swf", "modules/Sound.swf", "DOFUS.swf"]);

type PlaceOp = Extract<DisplayOp, { op: "place" }>;
type Fields = Partial<Pick<PlaceOp, "matrix" | "cxform" | "ratio" | "name" | "clipDepth" | "clipActions">>;
type Cmd = { rm: true } | { place: number; frame: number; f: Fields; inherit?: boolean } | { f: Fields };
type Graphics = { paths: ShapePath[]; fill?: { fill: Fill; d: string }; line?: { line: Line; d: string }; x: number; y: number };

export type ClipState = Internal & {
  children: DisplayObject[];
  tl: Timeline;
  frame: number; // 1-based, 0 = not yet on frame 1
  playing: boolean;
  events: Map<string, (() => void)[]>; // clip actions by event name
  born: number; // player tick of creation / load (no advance in that tick)
  g?: Graphics;
  mask?: DisplayObject;
  loaded?: boolean; // loadMovie: undefined = never called, false = pending (or unloaded), true = content arrived
};

/** Placement handed to the MovieClip constructor (subclass constructors take no arguments, like AS1). */
export type Placement = Partial<Internal> & { tl?: Timeline; init?: object; actions?: ClipAction[]; hookBase?: string };
let pending: Placement | undefined;

/** `new C()` with a placement: the base constructor builds frame 1 before the subclass constructor body runs. */
export function construct<T extends MovieClip>(C: new () => T, p: Placement): T {
  pending = p;
  try {
    return new C();
  } finally {
    pending = undefined;
  }
}

const EMPTY: Timeline = { frameCount: 1, frames: [{}] };
const MOUSE_EVENTS = ["press", "release", "releaseOutside", "rollOver", "rollOut", "dragOver", "dragOut"];
const handlerName = (ev: string) => "on" + ev[0]!.toUpperCase() + ev.slice(1);

// ---- linkage → class registry (Object.registerClass) -----------------------------------------
const classes = new Map<string, new () => MovieClip>();
/** `Object.registerClass(linkage, ctor)`: attachMovie / timeline placement of `linkage` instantiates `ctor`. */
export function registerClass(linkage: string, ctor: (new () => MovieClip) | null) {
  ctor ? classes.set(linkage.toLowerCase(), ctor) : classes.delete(linkage.toLowerCase());
}
const exportNames = new WeakMap<LoadedSwf, Map<number, string[]>>();
function classFor(swf: LoadedSwf, id: number): (new () => MovieClip) | undefined {
  let m = exportNames.get(swf);
  if (!m) {
    exportNames.set(swf, (m = new Map()));
    for (const [n, i] of Object.entries(swf.file.exports)) m.set(i, [...(m.get(i) ?? []), n]);
  }
  for (const n of m.get(id) ?? []) {
    const c = classes.get(n.toLowerCase());
    if (c) return c;
  }
  return undefined;
}
/** Linkage → [owner swf, character id] in the library of `swf` (exports, then imports by name). */
export function linkage(swf: LoadedSwf, name: string): [LoadedSwf, number] | undefined {
  const lower = name.toLowerCase();
  const key = Object.keys(swf.file.exports).find((k) => k === name) ?? Object.keys(swf.file.exports).find((k) => k.toLowerCase() === lower);
  if (key !== undefined) return [swf, swf.file.exports[key]!];
  for (const imp of swf.file.imports) for (const it of imp.items) if (it.name.toLowerCase() === lower) return [swf, it.id];
  return undefined;
}

/** A script for `key` (hook first; interpreter for asset SWFs; nothing for unported game-code scripts). */
function script(swf: LoadedSwf | undefined, key: string, bytecode: string | string[], clip: MovieClip): (() => void) | undefined {
  const h = player.scriptHook?.(key);
  if (h) return () => h.call(clip);
  if (!swf || CODE_SWFS.has(swf.file.src)) return undefined;
  const codes = typeof bytecode === "string" ? [bytecode] : bytecode;
  return () => codes.forEach((c) => runActions(c, clip));
}

// ---- MovieClip --------------------------------------------------------------------------------
export class MovieClip extends DisplayObject<ClipState> {
  constructor() {
    const p = pending;
    pending = undefined;
    const { tl, init, actions, hookBase, ...rest } = p ?? {};
    super({ ...rest, children: [], tl: tl ?? EMPTY, frame: 0, playing: true, events: new Map(), born: player?.ticks ?? 0 });
    const parent = this.$.parent;
    if (parent && !this.$.detached) parent.$addChild(this);
    if (init) for (const k in init) setMember(this, k, (init as Record<string, unknown>)[k]);
    for (const ca of actions ?? [])
      for (const ev of ca.events) {
        const fn = script(this.$.parent?.$.swf, `${hookBase}:${ev}`, ca.bytecode, this);
        if (fn) this.$.events.set(ev, [...(this.$.events.get(ev) ?? []), fn]);
      }
    this.$fireEvents("initialize");
    this.$goto(1);
  }

  // ---- children ---------------------------------------------------------------------------------
  /** Insert at the child's depth, replacing an occupant; make it reachable as `this[name]`. */
  $addChild(c: DisplayObject) {
    const kids = this.$.children, old = kids.find((k) => k.$.depth === c.$.depth);
    if (old) old.$remove();
    let i = kids.length;
    while (i > 0 && kids[i - 1]!.$.depth > c.$.depth) i--;
    kids.splice(i, 0, c);
    bindName(this, c.$.name, true);
  }
  $childAt(depth: number) {
    return this.$.children.find((k) => k.$.depth === depth);
  }

  attachMovie(name: string, newName: string, depth: number, initObject?: object): MovieClip | undefined {
    const swf = this.$.swf, l = swf && linkage(swf, String(name));
    if (!l) return undefined;
    const [owner, id] = l, sym = resolve(owner, id);
    if (sym?.[1].type !== "sprite") return undefined;
    const C = classes.get(String(name).toLowerCase()) ?? classFor(sym[0], sym[1].id) ?? MovieClip;
    const c = construct(C, { parent: this, name: String(newName), depth: Number(depth), swf: sym[0], id: sym[1].id, tl: sym[1], init: initObject });
    c.$queueLoad();
    return c;
  }
  createEmptyMovieClip(name: string, depth: number): MovieClip {
    const c = construct(MovieClip, { parent: this, name: String(name), depth: Number(depth), swf: this.$.swf });
    c.$queueLoad();
    return c;
  }
  /** `ank.ext.MovieClipExtensions.attachClassMovie` (`__Packages/ank/ext/MovieClipExtensions.as:7-13`). */
  attachClassMovie<T extends MovieClip>(ctor: new () => T, instanceName: string, depth: number): T {
    return construct(ctor, { parent: this, name: String(instanceName), depth: Number(depth), swf: this.$.swf });
  }
  createTextField(name: string, depth: number, x: number, y: number, width: number, height: number): TextField {
    const t = new TextField({ parent: this, name: String(name), depth: Number(depth), swf: this.$.swf, matrix: [1, 0, 0, 1, Number(x), Number(y)] });
    t.$.rect = [0, 0, Number(width), Number(height)];
    this.$addChild(t);
    return t;
  }
  /** Flash only removes script-depth clips (0 ≤ depth < 1048576). */
  removeMovieClip() {
    if (this.$.depth >= 0 && this.$.depth < 1048576) this.$remove();
  }
  $unload() {
    if (this.$.removed) return;
    super.$unload();
    for (const c of this.$.children) c.$unload();
    this.$fireEvents("unload");
    const h = this.onUnload;
    if (typeof h === "function") h.call(this);
  }

  // ---- loading ----------------------------------------------------------------------------------
  loadMovie(url: string) {
    player.loadInto(this, String(url));
  }
  unloadMovie() {
    this.$replaceContent(undefined);
  }
  /** Replace the content with a loaded SWF's root (or nothing): identity, depth, name and transform stay. */
  $replaceContent(swf: LoadedSwf | undefined) {
    const $ = this.$;
    for (const c of [...$.children]) c.$remove();
    for (const k of Object.keys(this)) delete this[k];
    Object.setPrototypeOf(this, MovieClip.prototype);
    Object.assign($, { swf, id: 0, tl: swf?.file.root ?? EMPTY, frame: 0, playing: true, events: new Map(), g: undefined, loaded: !!swf, born: player.ticks });
    this.$goto(1);
  }
  getBytesLoaded(): number { return this.getBytesTotal() > 4 ? this.getBytesTotal() : 0; }
  /** 4 for an empty clip or a pending load (what `onInitFrame` waits past); complete (a placeholder > 4) for a library
   *  symbol, attached or placed, and for arrived loadMovie content. */
  getBytesTotal(): number {
    const $ = this.$;
    return $.loaded || ($.loaded === undefined && $.id !== 0) ? 5 + $.tl.frameCount : 4;
  }

  // ---- timeline ---------------------------------------------------------------------------------
  get _currentframe(): number { return Math.max(1, this.$.frame); }
  get _totalframes(): number { return this.$.tl.frameCount; }
  get _framesloaded(): number { return this.$.tl.frameCount; }
  play() { this.$.playing = true; }
  stop() { this.$.playing = false; }
  gotoAndPlay(frame: number | string) {
    this.$.playing = true;
    this.$goto(frame);
  }
  gotoAndStop(frame: number | string) {
    this.$.playing = false;
    this.$goto(frame);
  }
  nextFrame() { this.gotoAndStop(this.$.frame + 1); }
  prevFrame() { this.gotoAndStop(this.$.frame - 1); }

  /** 1-based frame number of a frame number or label (labels case-insensitive, then numeric strings). */
  $frameOf(f: number | string): number | undefined {
    const tl = this.$.tl;
    let n: number;
    if (typeof f === "string") {
      const l = f.toLowerCase(), i = tl.frames.findIndex((fr) => fr.label?.toLowerCase() === l);
      if (i >= 0) return i + 1;
      n = Number(f);
    } else n = Number(f);
    if (Number.isNaN(n)) return undefined;
    return Math.min(Math.max(1, Math.floor(n)), tl.frameCount);
  }

  /** Go to a frame: display list changes now, the frame's actions are queued. Same frame = no-op. */
  $goto(frame: number | string) {
    if (this.$.removed) return;
    const n = this.$frameOf(frame);
    if (n === undefined || n === this.$.frame) return;
    this.$runGoto(n);
    this.$queueFrame(n);
  }
  /** One playhead step (called by the player each tick while playing). */
  $advance() {
    const $ = this.$;
    if (!$.playing || $.tl.frameCount <= 1) return;
    const n = $.frame < $.tl.frameCount ? $.frame + 1 : 1;
    this.$runGoto(n);
    this.$queueFrame(n);
  }

  private $runGoto(target: number) {
    const $ = this.$, tl = $.tl, back = target < $.frame;
    if (back) for (const c of [...$.children]) if (c.$.placeFrame > target) c.$remove();
    const cmds = new Map<number, Cmd>();
    for (let f = back ? 1 : $.frame + 1; f <= target; f++)
      for (const op of tl.frames[f - 1]?.ops ?? []) {
        const d = op.depth + TL, prev = cmds.get(d);
        if (op.op === "remove") {
          cmds.set(d, { rm: true });
          continue;
        }
        const { op: _o, depth: _d, id, move, ...fields } = op;
        const prevF = prev && "f" in prev ? prev.f : {};
        if (id !== undefined && !move) cmds.set(d, { place: id, frame: f, f: fields });
        else if (id !== undefined) cmds.set(d, prev && "place" in prev ? { place: id, frame: f, f: { ...prevF, ...fields } } : { place: id, frame: f, f: { ...prevF, ...fields }, inherit: true });
        else if (!(prev && "rm" in prev)) cmds.set(d, prev && "place" in prev ? { ...prev, f: { ...prevF, ...fields } } : { f: { ...prevF, ...fields } });
      }
    $.frame = target;
    for (const [d, c] of cmds) {
      const ex = this.$childAt(d);
      if ("rm" in c) {
        if (ex?.$.placeFrame) ex.$remove();
      } else if ("place" in c) {
        if (back && ex && ex.$.placeFrame === c.frame && ex.$.id === c.place) {
          applyFields(ex, { matrix: ID, cxform: NO_CX, ratio: 0, ...c.f });
          continue;
        }
        const inherited: Fields = c.inherit && ex ? { matrix: ex.$.matrix, cxform: ex.$.cx, ratio: ex.$.ratio, name: ex.$.name } : {};
        if (ex?.$.placeFrame) ex.$remove();
        this.$instantiate(c.place, d, { ...inherited, ...c.f }, c.frame);
      } else if (ex?.$.placeFrame) applyFields(ex, c.f);
    }
  }

  private $instantiate(id: number, depth: number, f: Fields, frame: number) {
    const r = this.$.swf && resolve(this.$.swf, id);
    if (!r) return;
    const [owner, sym] = r;
    // Flash names an unnamed timeline instance "instance<N>" (one counter per player, Ruffle
    // DisplayObject::set_default_instance_name): reachable by that name and seen by for…in (playFirstChildren & co).
    const named = sym.type === "sprite" || sym.type === "button" || sym.type === "edittext";
    const base: Placement = {
      parent: this, depth, name: f.name ?? (named ? `instance${++player.instanceCount}` : ""), swf: owner, id: sym.id, placeFrame: frame, matrix: f.matrix ?? ID,
      cx: f.cxform ?? NO_CX, ratio: f.ratio ?? 0, clipDepth: f.clipDepth !== undefined ? f.clipDepth + TL : undefined,
    };
    if (sym.type === "sprite") {
      const hookBase = `${this.$.swf!.file.src}#${this.$.id}@${frame}:${depth - TL}`;
      construct(classFor(owner, sym.id) ?? MovieClip, { ...base, tl: sym, actions: f.clipActions, hookBase }).$queueLoad();
    } else if (sym.type === "button") this.$addChild(new Button(base, sym));
    else if (sym.type === "edittext") this.$addChild(new TextField(base, sym));
    else if (sym.type === "shape" || sym.type === "morph" || sym.type === "text" || sym.type === "bitmap") this.$addChild(new Graphic(base, sym));
  }

  private $queueFrame(n: number) {
    const fr = this.$.tl.frames[n - 1];
    if (!fr) return;
    for (const s of fr.sounds ?? []) player.startSound(this.$.swf, s);
    if (fr.actions?.length) {
      const fn = script(this.$.swf, `${this.$.swf?.file.src}#${this.$.id}@${n}`, fr.actions, this);
      if (fn) player.enqueue(this, fn);
    }
  }
  /** Queue the `load` event (clip actions, then `onLoad`). */
  $queueLoad() {
    player.enqueue(this, () => this.$fire("load"));
  }

  // ---- events -----------------------------------------------------------------------------------
  $fireEvents(ev: string) {
    for (const fn of this.$.events.get(ev) ?? []) fn();
  }
  /** Clip actions for `ev`, then the `on<Ev>` handler. */
  $fire(ev: string, ...args: unknown[]) {
    this.$fireEvents(ev);
    const h = this[handlerName(ev)];
    if (typeof h === "function") h.apply(this, args);
  }
  $isMouseTarget(): boolean {
    return MOUSE_EVENTS.some((e) => typeof this[handlerName(e)] === "function" || this.$.events.has(e));
  }

  // ---- masks, drag ------------------------------------------------------------------------------
  setMask(mc: DisplayObject | null | undefined) {
    if (this.$.mask) this.$.mask.$.maskOf = undefined;
    this.$.mask = mc instanceof DisplayObject ? mc : undefined;
    if (this.$.mask) this.$.mask.$.maskOf = this;
  }
  startDrag(lock?: boolean, left?: number, top?: number, right?: number, bottom?: number) {
    player.startDrag(this, !!lock, left === undefined ? undefined : [Number(left), Number(top), Number(right), Number(bottom)]);
  }
  stopDrag() {
    player.stopDrag();
  }

  // ---- drawing API ------------------------------------------------------------------------------
  private $gfx(): Graphics {
    return (this.$.g ??= { paths: [], x: 0, y: 0 });
  }
  clear() {
    this.$.g = undefined;
  }
  lineStyle(thickness?: number, rgb?: number | string, alpha?: number) {
    const g = this.$gfx();
    if (g.line && /[LQ]/.test(g.line.d)) g.paths.push(g.line);
    g.line = thickness === undefined ? undefined : { line: { width: Number(thickness), color: rgba(rgb, alpha) }, d: `M ${g.x} ${g.y}` };
  }
  beginFill(rgb?: number | string, alpha?: number) {
    this.endFill();
    if (rgb !== undefined) this.$gfx().fill = { fill: { type: "solid", color: rgba(rgb, alpha) }, d: `M ${this.$gfx().x} ${this.$gfx().y}` };
  }
  beginGradientFill(type: string, colors: number[], alphas: number[], ratios: number[], m: { matrixType?: string; x?: number; y?: number; w?: number; h?: number; r?: number }) {
    this.endFill();
    const w = Number(m.w), h = Number(m.h), r = Number(m.r ?? 0), k = 1 / 32768;
    const matrix: Matrix = [w * k * Math.cos(r), w * k * Math.sin(r), -h * k * Math.sin(r), h * k * Math.cos(r), Number(m.x ?? 0) + w / 2, Number(m.y ?? 0) + h / 2];
    const stops = colors.map((c, i) => ({ ratio: Number(ratios[i]), color: rgba(c, alphas[i]) }));
    this.$gfx().fill = { fill: { type: type === "radial" ? "radial" : "linear", matrix, stops }, d: `M ${this.$gfx().x} ${this.$gfx().y}` };
  }
  endFill() {
    const g = this.$.g;
    if (!g?.fill) return;
    g.paths.push(g.fill);
    g.fill = undefined;
    if (g.line) g.paths.push(g.line), (g.line = { ...g.line, d: `M ${g.x} ${g.y}` });
  }
  moveTo(x: number, y: number) {
    const g = this.$gfx();
    (g.x = Number(x)), (g.y = Number(y));
    if (g.fill) g.fill.d += ` M ${g.x} ${g.y}`;
    if (g.line) g.line.d += ` M ${g.x} ${g.y}`;
  }
  lineTo(x: number, y: number) {
    const g = this.$gfx();
    (g.x = Number(x)), (g.y = Number(y));
    if (g.fill) g.fill.d += ` L ${g.x} ${g.y}`;
    if (g.line) g.line.d += ` L ${g.x} ${g.y}`;
  }
  curveTo(cx: number, cy: number, x: number, y: number) {
    const g = this.$gfx();
    const seg = ` Q ${Number(cx)} ${Number(cy)} ${Number(x)} ${Number(y)}`;
    (g.x = Number(x)), (g.y = Number(y));
    if (g.fill) g.fill.d += seg;
    if (g.line) g.line.d += seg;
  }
  /** Drawing-API paths including the unfinished fill/line (Flash shows them before endFill). */
  private $gpaths(): ShapePath[] {
    const g = this.$.g;
    return g ? [...g.paths, ...(g.fill ? [g.fill] : []), ...(g.line ? [g.line] : [])] : [];
  }

  // ---- DisplayObject ----------------------------------------------------------------------------
  $draw(ctx: CanvasRenderingContext2D, cx: ColorTransform) {
    if (this.$.g) drawShapePaths(ctx, this.$.swf ?? NO_SWF, this.$gpaths(), cx);
    drawList(ctx, this.$.children, cx);
  }
  $bounds(m: Matrix): Rect | null {
    let r: Rect | null = null;
    for (const p of this.$gpaths()) {
      const n = p.d.split(" ").filter((t) => !/[MLQ]/.test(t)).map(Number), hw = "line" in p ? p.line.width / 2 : 0;
      for (let i = 0; i < n.length; i += 2) {
        const b = xform([n[i]! - hw, n[i + 1]! - hw, n[i]! + hw, n[i + 1]! + hw], m);
        r = r ? [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])] : b;
      }
    }
    return listBounds(this.$.children, m, r);
  }
  $hitLocal(x: number, y: number): boolean {
    for (const p of this.$gpaths()) if ("fill" in p && player.scratch.isPointInPath(path(p), x, y, "evenodd")) return true;
    return listHit(this.$.children, x, y);
  }
  $fills(out: Path2D, m: Matrix) {
    for (const p of this.$gpaths()) if ("fill" in p) out.addPath(path(p), dom(m));
    for (const c of this.$.children) if (c.$.clipDepth === undefined) c.$fills(out, mul(m, c.$.matrix));
  }

  // ---- AKSClient prototype extensions (pure display-tree helpers) ---------------------------------
  /** `AKSClient/MovieClip.getActionClip.as` */
  getActionClip(): unknown {
    let o: unknown = this;
    for (let i = 20; i >= 0; i--) {
      if (!(o instanceof DisplayObject)) return undefined;
      if (o._ACTION) return o._ACTION;
      o = o.$.parent;
    }
    return undefined;
  }
  /** `AKSClient/MovieClip.getObjectClip.as` */
  getObjectClip(): unknown {
    let o: unknown = this;
    for (let i = 20; i >= 0; i--) {
      if (!(o instanceof DisplayObject)) return undefined;
      if (o._ACTION) return o._OBJECT;
      o = o.$.parent;
    }
    return undefined;
  }
  /** `AKSClient/MovieClip.getRootAnimClip.as` */
  getRootAnimClip(): unknown {
    let o: unknown = this;
    for (let i = 20; i >= 0; i--) {
      if (!(o instanceof DisplayObject)) return undefined;
      if (o._ROOTANIM) return o._ROOTANIM;
      o = o.$.parent;
    }
    return undefined;
  }
  /** `AKSClient/MovieClip.end.as`: tell the sequencer that this animation step is over. */
  end(sequencer?: unknown) {
    const action = this.getActionClip() as { data?: { SEQUENCER_anim?: unknown } } | undefined;
    const object = this.getObjectClip() as Record<string, unknown> | undefined;
    const seq = (sequencer ?? action?.data?.SEQUENCER_anim) as { unicID?: string; onActionEnd?: (o: unknown) => void } | undefined;
    seq?.onActionEnd?.(object?.[String(seq.unicID)]);
  }
  /** `AKSClient/MovieClip.playFirstChildren.as` */
  playFirstChildren() {
    for (const k in this) {
      const c = this[k];
      if (c instanceof MovieClip && Object.getPrototypeOf(c) === MovieClip.prototype) c.gotoAndPlay(1);
    }
  }
  /** `AKSClient/MovieClip.playAllClip.as` */
  playAllClip() {
    this.play();
    for (const k in this) {
      const c = this[k];
      if (c instanceof MovieClip && Object.getPrototypeOf(c) === MovieClip.prototype) c.playAllClip();
    }
  }
  /** `AKSClient/MovieClip.stopAllClip.as` */
  stopAllClip() {
    this.stop();
    for (const k in this) {
      const c = this[k];
      if (c instanceof MovieClip && Object.getPrototypeOf(c) === MovieClip.prototype) c.stopAllClip();
    }
  }
  /** `AKSClient/MovieClip.getAllCurrentFrames.as` */
  getAllCurrentFrames(): FrameTree {
    const childs: Record<string, FrameTree> = {};
    for (const k in this) {
      const c = this[k];
      if (c instanceof MovieClip && Object.getPrototypeOf(c) === MovieClip.prototype) childs[k] = c.getAllCurrentFrames();
    }
    return { frame: this._currentframe, childs };
  }
  /** `AKSClient/MovieClip.setAllCurrentFrames.as` */
  setAllCurrentFrames(obj: FrameTree, stop?: boolean) {
    stop ? this.gotoAndStop(obj.frame) : this.gotoAndPlay(obj.frame);
    for (const k in obj.childs) {
      const c = this[k];
      if (c instanceof MovieClip) c.setAllCurrentFrames(obj.childs[k]!, stop);
    }
  }
  /** `AKSClient/MovieClip.drawArc.as`: curveTo arc in ≤ 45° segments from the current pen position. */
  drawArc(x: number, y: number, radius: number, arc: number, startAngle: number, yRadius?: number): { x: number; y: number } | undefined {
    if (arguments.length < 5) return undefined;
    const yr = yRadius ?? radius;
    if (Math.abs(arc) > 360) arc = 360;
    const segs = Math.ceil(Math.abs(arc) / 45), seg = arc / segs, theta = (-seg / 180) * Math.PI;
    let angle = (-startAngle / 180) * Math.PI, bx = 0, by = 0;
    const ax = x - Math.cos(angle) * radius, ay = y - Math.sin(angle) * yr;
    for (let i = 0; i < segs; i++) {
      angle += theta;
      const mid = angle - theta / 2;
      bx = ax + Math.cos(angle) * radius;
      by = ay + Math.sin(angle) * yr;
      this.curveTo(ax + Math.cos(mid) * (radius / Math.cos(theta / 2)), ay + Math.sin(mid) * (yr / Math.cos(theta / 2)), bx, by);
    }
    return { x: bx, y: by };
  }
}
export type FrameTree = { frame: number; childs: Record<string, FrameTree> };

/** `AKSClient/MovieClip.onInitFrame.as`: assigning a function polls (one watcher clip per call under
 *  `_level0._onInitFrameClips_`) until the clip is fully loaded, then calls it with `this` = the clip. */
Object.defineProperty(MovieClip.prototype, "onInitFrame", {
  get() { return undefined; },
  set(this: MovieClip, func: (this: MovieClip) => void) {
    const root = player.root, proto = MovieClip.prototype as unknown as Record<string, unknown>;
    if (root._onInitFrameClips_ === undefined) {
      proto._onInitFrameLastClipId_ = 1;
      root.createEmptyMovieClip("_onInitFrameClips_", 10000000);
    } else proto._onInitFrameLastClipId_ = Number(proto._onInitFrameLastClipId_) + 1;
    const id = Number(proto._onInitFrameLastClipId_);
    const w = (root._onInitFrameClips_ as MovieClip).createEmptyMovieClip("_onInitFrameClip_" + id, id);
    w.data = this.data;
    w.onInitFunction = func;
    w.onInitClip = this;
    w.onEnterFrame = function (this: MovieClip) {
      const clip = this.onInitClip as MovieClip, loaded = clip.getBytesLoaded(), total = clip.getBytesTotal();
      if (loaded === total && total > 4) {
        clip.data = this.data;
        (this.onInitFunction as (this: MovieClip) => void).apply(clip);
        delete this.onEnterFrame;
        this.removeMovieClip();
      }
    };
  },
});

// ---- Button (DefineButton2 instance) -----------------------------------------------------------
const CONDITIONS: Record<ButtonCondition, string> = {
  idleToOverUp: "rollOver", overUpToIdle: "rollOut", overUpToOverDown: "press", overDownToOverUp: "release",
  outDownToIdle: "releaseOutside", overDownToOutDown: "dragOut", outDownToOverDown: "dragOver",
  idleToOverDown: "dragOver", overDownToIdle: "dragOut",
};
type ButtonInternal = Internal & { state: ButtonState; kids: DisplayObject[]; hit?: DisplayObject[]; events: Map<string, (() => void)[]> };

export class Button extends DisplayObject<ButtonInternal> {
  constructor(p: Placement, readonly $sym: ButtonSymbol) {
    super({ ...p, state: "up", kids: [], events: new Map() });
    for (const a of $sym.actions)
      for (const c of new Set(a.conditions.map((k) => CONDITIONS[k]))) {
        const fn = script(p.swf, `${p.swf?.file.src}#btn${$sym.id}:${c}`, a.bytecode, p.parent!); // `this` = the button's timeline
        if (fn) this.$.events.set(c, [...(this.$.events.get(c) ?? []), fn]);
      }
    this.$setState("up");
  }
  private $build(state: ButtonState): DisplayObject[] {
    const out: DisplayObject[] = [];
    for (const r of this.$sym.records.filter((r) => r.states.includes(state)).sort((a, b) => a.depth - b.depth)) {
      const s = this.$.swf && resolve(this.$.swf, r.id);
      if (!s) continue;
      const base: Placement = { parent: this.$.parent, detached: true, depth: r.depth, swf: s[0], id: s[1].id, matrix: r.matrix, cx: r.cxform ?? NO_CX, placeFrame: 1 };
      const [owner, sym] = s;
      if (sym.type === "sprite") out.push(construct(MovieClip, { ...base, swf: owner, tl: sym }));
      else if (sym.type === "edittext") out.push(new TextField(base, sym));
      else if (sym.type === "shape" || sym.type === "morph" || sym.type === "text" || sym.type === "bitmap") out.push(new Graphic(base, sym));
    }
    return out;
  }
  $setState(s: ButtonState) {
    if (s === this.$.state && this.$.kids.length) return;
    for (const k of this.$.kids) k.$unload();
    this.$.state = s;
    this.$.kids = this.$build(s);
  }
  /** Button actions for `ev`, then the `on<Ev>` handler. */
  $fire(ev: string) {
    for (const fn of this.$.events.get(ev) ?? []) fn();
    const h = this[handlerName(ev)];
    if (typeof h === "function") h.call(this);
  }
  get $children(): readonly DisplayObject[] { return this.$.kids; }
  $draw(ctx: CanvasRenderingContext2D, cx: ColorTransform) { drawList(ctx, this.$.kids, cx); }
  $bounds(m: Matrix): Rect | null { return listBounds(this.$.kids, m); }
  $hitLocal(x: number, y: number): boolean { return listHit((this.$.hit ??= this.$build("hit")), x, y); }
  $fills(out: Path2D, m: Matrix) { for (const c of this.$.kids) c.$fills(out, mul(m, c.$.matrix)); }
  $unload() {
    super.$unload();
    for (const k of this.$.kids) k.$unload();
  }
}

// ---- Graphic (not AS-visible) ------------------------------------------------------------------
type Leaf = ShapeSymbol | MorphSymbol | TextSymbol | BitmapSymbol;
export class Graphic extends DisplayObject {
  constructor(p: Placement, readonly $sym: Leaf) {
    super(p);
  }
  private $swf() { return this.$.swf ?? NO_SWF; }
  $draw(ctx: CanvasRenderingContext2D, cx: ColorTransform) {
    const s = this.$sym;
    if (s.type === "shape") drawShapePaths(ctx, this.$swf(), s.paths, cx);
    else if (s.type === "morph") drawMorph(ctx, this.$swf(), s.paths, this.$.ratio / 65535, cx);
    else if (s.type === "text") drawText(ctx, this.$swf(), s, cx);
    else {
      const img = this.$swf().images.get(s.id);
      if (img) (ctx.globalAlpha *= Math.max(0, Math.min(1, cx[3] + cx[7] / 255))), ctx.drawImage(img, 0, 0);
    }
  }
  private $localRect(): Rect {
    const s = this.$sym, t = this.$.ratio / 65535;
    if (s.type === "morph") return s.bounds[0].map((v, i) => lerp(v, s.bounds[1][i]!, t)) as Rect;
    if (s.type === "bitmap") return [0, 0, s.width, s.height];
    if (s.type === "text") return xform(s.bounds, s.matrix);
    return s.bounds;
  }
  $bounds(m: Matrix): Rect | null {
    if (this.$sym.type === "shape" && !this.$sym.paths.length) return null;
    return xform(this.$localRect(), m);
  }
  $hitLocal(x: number, y: number): boolean {
    const r = this.$localRect();
    if (x < r[0] || x > r[2] || y < r[1] || y > r[3]) return false;
    const s = this.$sym;
    if (s.type === "shape") return s.paths.some((p) => ("fill" in p ? player.scratch.isPointInPath(path(p), x, y, "evenodd") : false));
    if (s.type === "morph") return s.paths.some((p) => "fill" in p && player.scratch.isPointInPath(morphPath(p, this.$.ratio / 65535), x, y, "evenodd"));
    return true;
  }
  $fills(out: Path2D, m: Matrix) {
    const s = this.$sym;
    if (s.type === "shape") for (const p of s.paths) "fill" in p && out.addPath(path(p), dom(m));
    else if (s.type === "morph") for (const p of s.paths) "fill" in p && out.addPath(morphPath(p, this.$.ratio / 65535), dom(m));
    else {
      const r = this.$localRect(), q = new Path2D();
      q.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      out.addPath(q, dom(m));
    }
  }
}

// ---- helpers ------------------------------------------------------------------------------------
const NO_SWF: LoadedSwf = { file: { format: "dofus-swf-json", formatVersion: 1, src: "", version: 6, width: 0, height: 0, frameRate: 25, background: null, root: EMPTY, symbols: {}, exports: {}, imports: [] }, images: new Map(), imports: new Map() };
/** Flash colour (number or "0xRRGGBB" string) + alpha percent → RGBA. */
function rgba(rgb: unknown, alpha: unknown): [number, number, number, number] {
  const n = Number(rgb ?? 0) >>> 0, a = alpha === undefined ? 100 : Number(alpha);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(Math.max(0, Math.min(100, a)) * 2.55)];
}

function applyFields(o: DisplayObject, f: Fields) {
  if (!o.$.scripted) {
    if (f.matrix) o.$setMatrix(f.matrix);
    if (f.cxform) o.$.cx = f.cxform;
  }
  if (f.ratio !== undefined) o.$.ratio = f.ratio;
  if (f.name !== undefined && f.name !== o.$.name) o._name = f.name;
  if (f.clipDepth !== undefined) o.$.clipDepth = f.clipDepth + TL;
}
