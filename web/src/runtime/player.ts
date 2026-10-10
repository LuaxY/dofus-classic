// The player: stage root (_level0), 25 fps clock, action queue, loading, input, timers, and the Flash globals
// the game uses (Key, Mouse, Stage, Selection, SharedObject, Color, Sound, setInterval, getTimer, _global).
import type { ColorTransform, StartSound } from "../swf/types.ts";
import { loadSwf, NO_CX, type LoadedSwf, type SwfLoader } from "../swf/render.ts";
import { getVar, setVar, toStr } from "./avm1.ts";
import { Button, construct, linkage, MovieClip } from "./movieclip.ts";
import { call, DisplayObject, drawNode, player, setPlayer } from "./object.ts";
import { TextField, TextFormat } from "./text.ts";

type Listener = Record<string, unknown>;
type Interval = { fn: () => void; ms: number; next: number };
type Target = MovieClip | Button;

export interface AudioHandle { stop(): void; setVolume(v: number): void }
/** Sound output. `key` is a linkage name / `<swf>#<id>` (web/public/assets/media/sounds.json) or a URL path. */
export interface AudioBackend {
  play(key: string, o: { offset: number; loops: number; volume: number }, onEnd: () => void): AudioHandle | undefined;
  load?(url: string): Promise<boolean>;
}
export type ScriptHook = (key: string) => ((this: DisplayObject) => void) | undefined;

export type PlayerOptions = {
  loader: SwfLoader;
  /** Scratch canvas factory for text measuring / hit tests (headless: @napi-rs/canvas `createCanvas`). */
  createCanvas?: (w: number, h: number) => { getContext(type: "2d"): unknown };
  /** Hand-ported scripts of the code SWFs, see docs/runtime.md §4.6. */
  scriptHook?: ScriptHook;
  audio?: AudioBackend;
};

/** AS `_global`: Flash built-ins visible to asset scripts; the game port adds its singletons here. */
export const _global: Record<string, unknown> = {};

export class Player {
  readonly width = 742;
  readonly height = 550;
  readonly frameRate = 25;
  readonly global = _global;
  readonly root: MovieClip;
  readonly scratch: CanvasRenderingContext2D;
  readonly loader: SwfLoader;
  scriptHook?: ScriptHook;
  audio?: AudioBackend;
  ticks = 0;
  /** Counter of the default "instance<N>" names given to unnamed timeline instances. */
  instanceCount = 0;
  time = 0; // ms, getTimer()
  mouseX = 0;
  mouseY = 0;
  focus: DisplayObject | undefined;
  editing: TextField | undefined;
  readonly bound = new Set<TextField>();
  readonly keys = new Set<number>();
  keyCode = 0;
  keyAscii = 0;
  readonly listeners = { key: [] as Listener[], mouse: [] as Listener[], stage: [] as Listener[], selection: [] as Listener[] };
  canvas?: HTMLCanvasElement;

  private queue: { obj: DisplayObject; fn: () => void }[] = [];
  private running = false;
  private scheduled = false;
  private nextTick = 0;
  private intervals = new Map<number, Interval>();
  private intervalId = 0;
  private cache = new Map<string, Promise<LoadedSwf>>();
  private swfs: LoadedSwf[] = [];
  private arrived: [MovieClip, LoadedSwf | undefined, number][] = [];
  private loadToken = new WeakMap<MovieClip, number>();
  private over?: Target;
  private pressed?: Target;
  private pressedOver = false;
  private menuOver?: Target;
  private drag?: { clip: MovieClip; dx: number; dy: number; rect?: [number, number, number, number] };
  private sounds = new Map<string, AudioHandle[]>();
  private editor?: HTMLInputElement | HTMLTextAreaElement;

  constructor(o: PlayerOptions) {
    setPlayer(this);
    this.loader = o.loader;
    this.scriptHook = o.scriptHook;
    this.audio = o.audio;
    const c = o.createCanvas?.(1, 1) ?? (typeof document !== "undefined" ? document.createElement("canvas") : undefined);
    if (!c) throw new Error("Player needs a canvas factory outside the browser");
    this.scratch = c.getContext("2d") as CanvasRenderingContext2D;
    this.root = construct(MovieClip, { name: "" });
  }

  // ---- loading ----------------------------------------------------------------------------------
  /** Load a converted SWF (archive path) with its bitmaps and imports. */
  async load(src: string): Promise<LoadedSwf> {
    const swf = await loadSwf(src.replace(/^\/+/, ""), this.loader, this.cache);
    if (!this.swfs.includes(swf)) this.swfs.push(swf);
    return swf;
  }
  loadedSwfs(): readonly LoadedSwf[] {
    return this.swfs;
  }
  /** `loadMovie`: asynchronous; the content replaces the clip at the start of the next tick. */
  loadInto(clip: MovieClip, url: string) {
    const token = (this.loadToken.get(clip) ?? 0) + 1;
    this.loadToken.set(clip, token);
    clip.$.loaded = false; // byte counters reset at once (old content stays visible until the new one arrives)
    if (!url) return void this.arrived.push([clip, undefined, token]);
    this.load(url).then(
      (swf) => this.arrived.push([clip, swf, token]),
      (e) => console.warn(`loadMovie(${url}) failed: ${(e as Error).message}`),
    );
  }

  // ---- clock ------------------------------------------------------------------------------------
  /** Advance the runtime clock by `ms`: fires intervals and 25 fps ticks in time order. */
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      let next = this.nextTick, iv: Interval | undefined;
      for (const i of this.intervals.values()) if (i.next < next) (next = i.next), (iv = i);
      if (next > end) break;
      this.time = next;
      if (iv) {
        iv.next += iv.ms;
        this.dispatch(iv.fn);
      } else {
        this.tick();
        this.nextTick += 1000 / this.frameRate;
      }
    }
    this.time = end;
  }
  /** One frame: deliver loads, enterFrame + playhead advance (pre-order), then run the action queue. */
  tick() {
    this.ticks++;
    this.runQueue();
    for (const [clip, swf, token] of this.arrived.splice(0)) if (!clip.$.removed && this.loadToken.get(clip) === token) clip.$replaceContent(swf);
    this.visit(this.root);
    this.runQueue();
    this.updateDrag();
    for (const tf of this.bound) this.syncVariable(tf);
  }
  private visit(c: MovieClip) {
    if (c.$.born < this.ticks) {
      if (c.$.events.has("enterFrame") || typeof c.onEnterFrame === "function") this.enqueue(c, () => c.$fire("enterFrame"));
      c.$advance();
    }
    for (const k of [...c.$.children]) {
      if (k.$.removed) continue;
      if (k instanceof MovieClip) this.visit(k);
      else if (k instanceof Button) for (const s of k.$children) if (s instanceof MovieClip) this.visit(s);
    }
  }
  enqueue(obj: DisplayObject, fn: () => void) {
    this.queue.push({ obj, fn });
    if (!this.running && !this.scheduled) (this.scheduled = true), queueMicrotask(() => ((this.scheduled = false), this.runQueue()));
  }
  /** Run queued actions; actions of objects removed meanwhile are skipped. */
  runQueue() {
    if (this.running) return;
    this.running = true;
    try {
      for (let a = this.queue.shift(); a; a = this.queue.shift()) if (!a.obj.$.removed) this.safe(a.fn);
    } finally {
      this.running = false;
    }
  }
  /** Run an event handler then the queue (Flash runs queued actions at the end of every event). */
  dispatch(fn: () => void) {
    this.safe(fn);
    this.runQueue();
  }
  private safe(fn: () => void) {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  }

  // ---- timers -----------------------------------------------------------------------------------
  setInterval(a: unknown, b: unknown, c?: unknown, ...rest: unknown[]): number {
    const [fn, ms, args] = typeof a === "function" ? [a as (...x: unknown[]) => void, b, [c, ...rest].slice(0, c === undefined && !rest.length ? 0 : undefined)] :
      [(...x: unknown[]) => { const m = (a as Listener)?.[toStr(b)]; if (typeof m === "function") m.apply(a, x); }, c, rest];
    const period = Math.max(10, Number(ms) || 0), id = ++this.intervalId;
    this.intervals.set(id, { fn: () => fn(...(args as unknown[])), ms: period, next: this.time + period });
    return id;
  }
  clearInterval(id: unknown) {
    this.intervals.delete(Number(id));
  }

  // ---- input --------------------------------------------------------------------------------------
  mouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    this.dispatch(() => {
      this.updateDrag();
      this.broadcast("mouseMove");
      const t = this.target();
      if (this.pressed) {
        const inside = t === this.pressed;
        if (inside !== this.pressedOver) (this.pressedOver = inside), this.fire(this.pressed, inside ? "dragOver" : "dragOut");
        if (t !== this.menuOver) {
          if (this.menuOver && this.menuOver !== this.pressed && this.menuOver.trackAsMenu) this.fire(this.menuOver, "dragOut");
          if (t && t !== this.pressed && t.trackAsMenu) this.fire(t, "dragOver");
          this.menuOver = t;
        }
      } else this.updateOver(t);
      this.buttonStates();
    });
  }
  mouseDown() {
    this.dispatch(() => {
      this.broadcast("mouseDown");
      const t = this.target(), tf = t ? undefined : this.textAt(this.root);
      if (tf || !t) this.setFocus(tf);
      if (t) {
        this.pressed = this.menuOver = t;
        this.pressedOver = true;
        this.fire(t, "press");
      }
      this.buttonStates();
    });
  }
  mouseUp() {
    this.dispatch(() => {
      this.broadcast("mouseUp");
      const p = this.pressed, t = this.target();
      this.pressed = this.menuOver = undefined;
      if (p && t === p) this.fire(p, "release");
      else {
        if (p) this.fire(p, "releaseOutside"), (this.over = undefined);
        if (p && t?.trackAsMenu) this.fire(t, "release");
        this.updateOver(t);
      }
      this.buttonStates();
    });
  }
  keyDown(code: number, ascii = 0) {
    this.keys.add(code);
    this.keyCode = code;
    this.keyAscii = ascii;
    this.dispatch(() => {
      for (const l of [...this.listeners.key]) call(l, "onKeyDown");
      this.walk(this.root, (c) => c.$.events.has("keyDown") && c.$fireEvents("keyDown"));
      if (this.focus instanceof MovieClip) call(this.focus, "onKeyDown");
    });
  }
  keyUp(code: number, ascii = 0) {
    this.keys.delete(code);
    this.keyCode = code;
    this.keyAscii = ascii;
    this.dispatch(() => {
      for (const l of [...this.listeners.key]) call(l, "onKeyUp");
      this.walk(this.root, (c) => c.$.events.has("keyUp") && c.$fireEvents("keyUp"));
      if (this.focus instanceof MovieClip) call(this.focus, "onKeyUp");
    });
  }
  /** Topmost enabled mouse target (button, or clip with button handlers / `on(press…)`) under the mouse. */
  target(node: MovieClip = this.root): Target | undefined {
    const kids = node.$.children, masks = kids.filter((k) => k.$.clipDepth !== undefined);
    for (let i = kids.length - 1; i >= 0; i--) {
      const c = kids[i]!;
      if (!c.$.visible || c.$.maskOf || c.$.clipDepth !== undefined) continue;
      if (!(c instanceof MovieClip || c instanceof Button)) continue;
      const mask = masks.find((k) => k.$.depth < c.$.depth && c.$.depth <= k.$.clipDepth!);
      if (mask && !mask.$hitGlobal(this.mouseX, this.mouseY)) continue;
      const sm = c instanceof MovieClip ? c.$.mask : undefined;
      if (sm && !sm.$hitGlobal(this.mouseX, this.mouseY)) continue;
      if ((c instanceof Button || c.$isMouseTarget()) && c.enabled !== false) {
        const area = c.hitArea instanceof DisplayObject ? c.hitArea : c;
        if (area.$hitGlobal(this.mouseX, this.mouseY)) return c;
      } else if (c instanceof MovieClip) {
        const t = this.target(c);
        if (t) return t;
      }
    }
    return undefined;
  }
  private textAt(node: MovieClip): TextField | undefined {
    const kids = node.$.children;
    for (let i = kids.length - 1; i >= 0; i--) {
      const c = kids[i]!;
      if (!c.$.visible) continue;
      if (c instanceof TextField && (c.type === "input" || c.selectable) && c.$hitGlobal(this.mouseX, this.mouseY)) return c.type === "input" ? c : undefined;
      if (c instanceof MovieClip) {
        const t = this.textAt(c);
        if (t) return t;
      }
    }
    return undefined;
  }
  private fire(t: Target, ev: string) {
    t.$fire(ev);
  }
  private updateOver(t: Target | undefined) {
    if (t === this.over) return;
    const old = this.over;
    this.over = t;
    if (old && !old.$.removed) this.fire(old, "rollOut");
    if (t) this.fire(t, "rollOver");
  }
  private buttonStates() {
    this.walk(this.root, () => {}, (b) => b.$setState(b === this.pressed ? (this.pressedOver ? "down" : "up") : b === this.over ? "over" : "up"));
  }
  private broadcast(ev: "mouseDown" | "mouseUp" | "mouseMove") {
    for (const l of [...this.listeners.mouse]) call(l, "on" + ev[0]!.toUpperCase() + ev.slice(1));
    this.walk(this.root, (c) => {
      if (c.$.events.has(ev) || typeof c["on" + ev[0]!.toUpperCase() + ev.slice(1)] === "function") c.$fire(ev);
    });
  }
  private walk(c: MovieClip, f: (c: MovieClip) => void, b?: (b: Button) => void) {
    f(c);
    for (const k of [...c.$.children])
      if (k.$.removed) continue;
      else if (k instanceof MovieClip) this.walk(k, f, b);
      else if (k instanceof Button) b?.(k);
  }
  /** Mouse cursor CSS for the hovered target. */
  cursor(): string {
    const t = this.pressed ?? this.over;
    return t && t.useHandCursor !== false ? "pointer" : "default";
  }

  // ---- drag ---------------------------------------------------------------------------------------
  startDrag(clip: MovieClip, lock: boolean, rect?: [number, number, number, number]) {
    const p = clip.$.parent?.globalToLocal({ x: this.mouseX, y: this.mouseY }) ?? { x: this.mouseX, y: this.mouseY };
    this.drag = { clip, dx: lock ? 0 : clip._x - p.x, dy: lock ? 0 : clip._y - p.y, rect };
    this.updateDrag();
  }
  stopDrag() {
    this.drag = undefined;
  }
  private updateDrag() {
    const d = this.drag;
    if (!d || d.clip.$.removed) return;
    const p = d.clip.$.parent?.globalToLocal({ x: this.mouseX, y: this.mouseY }) ?? { x: this.mouseX, y: this.mouseY };
    let x = p.x + d.dx, y = p.y + d.dy;
    if (d.rect) (x = Math.min(Math.max(x, d.rect[0]), d.rect[2])), (y = Math.min(Math.max(y, d.rect[1]), d.rect[3]));
    d.clip._x = x;
    d.clip._y = y;
  }

  // ---- focus, text input, variable binding ------------------------------------------------------------
  setFocus(obj: DisplayObject | undefined) {
    const old = this.focus;
    if (old === obj) return;
    this.focus = obj;
    if (old) call(old, "onKillFocus", obj ?? null);
    if (obj) call(obj, "onSetFocus", old ?? null);
    for (const l of [...this.listeners.selection]) call(l, "onSetFocus", old ?? null, obj ?? null);
    this.closeEditor();
    if (obj instanceof TextField && obj.type === "input") this.openEditor(obj);
  }
  setSelection(begin: number, end: number) {
    this.editor?.setSelectionRange(Number(begin), Math.min(Number(end), this.editor.value.length));
  }
  private openEditor(tf: TextField) {
    this.editing = tf;
    if (!this.canvas || typeof document === "undefined") return;
    const el = document.createElement(tf.multiline ? "textarea" : "input");
    if (el instanceof HTMLInputElement) el.type = tf.password ? "password" : "text";
    if (tf.maxChars) el.maxLength = tf.maxChars;
    el.value = tf.text;
    const f = tf.getTextFormat();
    Object.assign(el.style, {
      position: "absolute", margin: "0", padding: "2px", border: "none", outline: "none", background: "transparent", resize: "none",
      color: `#${(Number(f.color ?? 0) >>> 0).toString(16).padStart(6, "0")}`, font: tf.$cssFont(),
      textAlign: f.align ?? "left", overflow: "hidden", transformOrigin: "0 0",
    });
    el.addEventListener("input", () => {
      if (tf.restrict) {
        const ok = new RegExp(`[^${tf.restrict.replace(/\]/g, "\\]")}]`, "g");
        if (ok.test(el.value)) el.value = el.value.replace(ok, "");
      }
      this.dispatch(() => {
        tf.text = el.value; // also writes the bound variable
        tf.$broadcast("onChanged");
      });
    });
    document.body.appendChild(el);
    this.editor = el;
    tf.$.editing = true;
    this.placeEditor();
    el.focus();
  }
  /** A script set the edited field's text (`txtConsole.text = ""` on Enter, history keys: Dofus.KeyListener.as): the DOM editor follows. */
  editorText(tf: TextField) {
    if (tf === this.editing && this.editor && this.editor.value !== tf.text) this.editor.value = tf.text;
  }
  private closeEditor() {
    if (this.editing) this.editing.$.editing = false;
    this.editing = undefined;
    this.editor?.remove();
    this.editor = undefined;
  }
  /** Keep the DOM editor over its field (called every rendered frame). */
  placeEditor() {
    const tf = this.editing, el = this.editor, cv = this.canvas;
    if (!tf || !el || !cv) return;
    if (tf.$.removed) return this.setFocus(undefined);
    const r = cv.getBoundingClientRect(), sx = r.width / this.width, sy = r.height / this.height;
    const [a, b, c, d, tx, ty] = tf.$world(), rect = tf.$.rect;
    Object.assign(el.style, {
      left: `${window.scrollX + r.left + (a * rect[0] + c * rect[1] + tx) * sx}px`, top: `${window.scrollY + r.top + (b * rect[0] + d * rect[1] + ty) * sy}px`,
      width: `${(rect[2] - rect[0]) - 4}px`, height: `${(rect[3] - rect[1]) - 4}px`, transform: `matrix(${a * sx},${b * sy},${c * sx},${d * sy},0,0)`,
    });
  }
  private syncVariable(tf: TextField) {
    const p = tf.$.parent, name = tf.variable;
    if (!p || !name || tf.$.removed || tf === this.editing) return;
    const v = getVar(p, name);
    if (v === undefined) return void setVar(p, name, tf.text);
    const s = toStr(v);
    if (s !== (tf.html ? tf.htmlText : tf.text)) tf.html ? (tf.htmlText = s) : (tf.text = s);
  }

  /** Forget references to a removed object. */
  forget(o: DisplayObject) {
    if (this.over === o) this.over = undefined;
    if (this.pressed === o) this.pressed = undefined;
    if (this.drag?.clip === o) this.drag = undefined;
    if (this.focus === o) this.setFocus(undefined);
  }

  // ---- sound ------------------------------------------------------------------------------------
  /** Timeline StartSound (sprites 1003/1004): routed by linkage name or `<swf>#<id>`. */
  startSound(swf: LoadedSwf | undefined, s: StartSound) {
    if (!swf) return;
    const key = Object.entries(swf.file.exports).find(([, id]) => id === s.id)?.[0] ?? `${swf.file.src}#${s.id}`;
    const playing = this.sounds.get(key) ?? [];
    if (s.stop) return void (playing.forEach((h) => h.stop()), this.sounds.delete(key));
    if (s.noMultiple && playing.length) return;
    const h = this.audio?.play(key, { offset: 0, loops: s.loops ?? 1, volume: 100 }, () => this.sounds.set(key, (this.sounds.get(key) ?? []).filter((x) => x !== h)));
    if (h) this.sounds.set(key, [...playing, h]);
  }

  // ---- rendering ----------------------------------------------------------------------------------
  /** Draw the stage; `ctx` may be scaled (the stage is always 742×550 units). */
  render(ctx: CanvasRenderingContext2D, cx: ColorTransform = NO_CX) {
    ctx.save();
    ctx.fillStyle = this.root.$.swf?.file.background ?? "#ffffff";
    ctx.fillRect(0, 0, this.width, this.height);
    drawNode(ctx, this.root, cx);
    ctx.restore();
  }

  /** Browser main loop: input listeners, rAF clock, rendering. */
  start(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d")!;
    const pos = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) * this.width) / r.width, ((e.clientY - r.top) * this.height) / r.height] as const;
    };
    canvas.addEventListener("mousemove", (e) => this.mouseMove(...pos(e)));
    // preventDefault: the browser's own mousedown focus change would blur the DOM editor that mouseDown just focused
    canvas.addEventListener("mousedown", (e) => (e.preventDefault(), this.mouseMove(...pos(e)), this.mouseDown()));
    window.addEventListener("mouseup", (e) => (this.mouseMove(...pos(e)), this.mouseUp()));
    window.addEventListener("keydown", (e) => this.keyDown(e.keyCode, e.key.length === 1 ? e.key.charCodeAt(0) : e.keyCode === 13 ? 13 : 0));
    window.addEventListener("keyup", (e) => this.keyUp(e.keyCode, e.key.length === 1 ? e.key.charCodeAt(0) : 0));
    window.addEventListener("pagehide", () => SharedObject.flushAll());
    let last = performance.now();
    const loop = (t: number) => {
      this.advance(Math.min(250, t - last));
      last = t;
      ctx.setTransform(canvas.width / this.width, 0, 0, canvas.height / this.height, 0, 0);
      this.render(ctx);
      this.placeEditor();
      canvas.style.cursor = this.cursor();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

const cur = (): Player => player;

// ---- Flash globals --------------------------------------------------------------------------------
export const getTimer = () => Math.floor(cur().time);
export const setInterval = (a: unknown, b: unknown, c?: unknown, ...rest: unknown[]) => cur().setInterval(a, b, c, ...rest);
export const clearInterval = (id: unknown) => cur().clearInterval(id);

const listeners = (l: Listener[]) => ({
  addListener(o: Listener) { if (!l.includes(o)) l.push(o); },
  removeListener(o: Listener) { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); return i >= 0; },
});
export const Key = {
  isDown: (code: number) => cur().keys.has(Number(code)),
  getCode: () => cur().keyCode,
  getAscii: () => cur().keyAscii,
  addListener: (o: Listener) => listeners(cur().listeners.key).addListener(o),
  removeListener: (o: Listener) => listeners(cur().listeners.key).removeListener(o),
};
export const Mouse = {
  addListener: (o: Listener) => listeners(cur().listeners.mouse).addListener(o),
  removeListener: (o: Listener) => listeners(cur().listeners.mouse).removeListener(o),
};
/** Fixed 742×550 stage (`Stage.scaleMode = "noScale"`, `Dofus.Kernel.Init.as:2`); onResize never fires. */
export const Stage = {
  get width() { return cur().width; },
  get height() { return cur().height; },
  scaleMode: "noScale",
  align: "",
  showMenu: true,
  addListener: (o: Listener) => listeners(cur().listeners.stage).addListener(o),
  removeListener: (o: Listener) => listeners(cur().listeners.stage).removeListener(o),
};
export const Selection = {
  /** Target path of the focused object, or null. */
  getFocus: () => (cur().focus ? String(cur().focus) : null),
  /** A clip/field, a path, or a text field variable name (`Selection.setFocus("consoleContent")`). */
  setFocus(t: unknown) {
    const p = cur();
    let o: unknown = t;
    if (typeof t === "string") {
      o = getVar(p.root, t);
      if (!(o instanceof DisplayObject)) o = [...p.bound].find((tf) => tf.variable === t) ?? findNamed(p.root, t);
    }
    p.setFocus(o instanceof DisplayObject ? o : undefined);
    return true;
  },
  setSelection: (b: number, e: number) => cur().setSelection(b, e),
  addListener: (o: Listener) => listeners(cur().listeners.selection).addListener(o),
  removeListener: (o: Listener) => listeners(cur().listeners.selection).removeListener(o),
};
function findNamed(c: MovieClip, name: string): DisplayObject | undefined {
  for (const k of c.$.children) {
    if (k.$.name === name) return k;
    const r = k instanceof MovieClip ? findNamed(k, name) : undefined;
    if (r) return r;
  }
  return undefined;
}

/** `SharedObject.getLocal(name)` backed by localStorage (memory when absent); written on flush and page hide. */
const sos = new Map<string, { data: Record<string, unknown>; flush(): boolean }>();
export const SharedObject = {
  getLocal(name: string) {
    let so = sos.get(name);
    if (!so) {
      const key = `SharedObject:${name}`, ls = typeof localStorage !== "undefined" ? localStorage : undefined;
      const data = JSON.parse(ls?.getItem(key) ?? "{}") as Record<string, unknown>;
      so = { data, flush: () => (ls?.setItem(key, JSON.stringify(data)), true) };
      sos.set(name, so);
    }
    return so;
  },
  flushAll() {
    for (const so of sos.values()) so.flush();
  },
};

type ColorT = { ra?: number; rb?: number; ga?: number; gb?: number; ba?: number; bb?: number; aa?: number; ab?: number };
/** `new Color(clip)`: shares the clip's colour transform with `_alpha`. */
export class Color {
  constructor(private target: unknown) {}
  private obj(): DisplayObject | undefined {
    const t = typeof this.target === "string" ? getVar(cur().root, this.target) : this.target;
    return t instanceof DisplayObject ? t : undefined;
  }
  setRGB(rgb: number) {
    const o = this.obj(), n = Number(rgb) >>> 0;
    if (!o) return;
    o.$.cx = [0, 0, 0, o.$.cx[3], (n >> 16) & 255, (n >> 8) & 255, n & 255, o.$.cx[7]];
    o.$.scripted = true;
  }
  getRGB(): number {
    const cx = this.obj()?.$.cx ?? NO_CX;
    return (cx[4] << 16) | (cx[5] << 8) | cx[6];
  }
  setTransform(t: ColorT) {
    const o = this.obj();
    if (!o || !t) return;
    const c = [...o.$.cx] as ColorTransform, keys = [["ra", 0, 100], ["ga", 1, 100], ["ba", 2, 100], ["aa", 3, 100], ["rb", 4, 1], ["gb", 5, 1], ["bb", 6, 1], ["ab", 7, 1]] as const;
    for (const [k, i, div] of keys) if (t[k] !== undefined) c[i] = Number(t[k]) / div;
    o.$.cx = c;
    o.$.scripted = true;
  }
  getTransform(): Required<ColorT> {
    const c = this.obj()?.$.cx ?? NO_CX;
    return { ra: c[0] * 100, ga: c[1] * 100, ba: c[2] * 100, aa: c[3] * 100, rb: c[4], gb: c[5], bb: c[6], ab: c[7] };
  }
}

/** `new Sound(target)`: attachSound(linkage) / loadSound(url) → the player's AudioBackend (silent without one). */
export class Sound {
  private key?: string;
  private vol = 100;
  private handle?: AudioHandle;
  declare onSoundComplete?: () => void;
  declare onLoad?: (ok: boolean) => void;
  constructor(_target?: unknown) {}
  attachSound(name: string) { this.key = String(name); }
  loadSound(url: string) {
    this.key = String(url);
    const p = cur(), load = p.audio?.load?.(this.key) ?? Promise.resolve(false);
    load.then((ok) => p.dispatch(() => this.onLoad?.(ok)));
  }
  start(offset?: number, loops?: number) {
    this.stop();
    const p = cur();
    if (!this.key) return;
    const h = p.audio?.play(this.key, { offset: Number(offset) || 0, loops: Math.max(1, Number(loops) || 1), volume: this.vol }, () => {
      if (this.handle === h) this.handle = undefined;
      p.dispatch(() => this.onSoundComplete?.());
    });
    this.handle = h;
  }
  stop() {
    this.handle?.stop();
    this.handle = undefined;
  }
  setVolume(v: number) {
    this.vol = Number(v);
    this.handle?.setVolume(this.vol);
  }
  getVolume() { return this.vol; }
}

/** Browser audio: MP3s from the media manifest (`sounds.json`: linkage or `<swf>#<id>` → file). */
export function browserAudio(base = "/assets/media/"): AudioBackend {
  const manifest = fetch(base + "sounds.json").then((r) => r.json() as Promise<Record<string, { file: string }>>).catch(() => ({} as Record<string, { file: string }>));
  let files: Record<string, { file: string }> = {};
  void manifest.then((m) => (files = m));
  return {
    play(key, o, onEnd) {
      const src = files[key] ? base + files[key]!.file : key.includes("/") ? key : undefined;
      if (!src) return undefined;
      const a = new Audio(src);
      let left = o.loops;
      a.volume = Math.max(0, Math.min(1, o.volume / 100));
      a.currentTime = o.offset;
      a.addEventListener("ended", () => (--left > 0 ? ((a.currentTime = 0), void a.play()) : onEnd()));
      void a.play().catch(() => onEnd());
      return { stop: () => a.pause(), setVolume: (v) => (a.volume = Math.max(0, Math.min(1, v / 100))) };
    },
    load: async (url) => (await fetch(url, { method: "HEAD" }).catch(() => undefined))?.ok ?? false,
  };
}

// Re-exports so the game port imports everything from "runtime/player.ts".
export { registerClass, Button, Graphic } from "./movieclip.ts";
export { DisplayObject, player } from "./object.ts";
export { MovieClip, TextField, TextFormat, linkage };

Object.assign(_global, {
  Math, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite,
  MovieClip, TextField, TextFormat, Color, Sound, Key, Mouse, Stage, Selection, SharedObject,
  System: { security: { allowDomain() {} }, allowDomain() {} },
  setInterval, clearInterval, getTimer, updateAfterEvent() {},
});
