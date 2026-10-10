// Headless unit tests of the runtime on synthetic SWFs (timeline, depths, classes, hit tests, colour, text,
// interpreter, loading, timers) plus the asset functions the game calls (ground.attach, circle.setColor).
import { beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage, Path2D } from "@napi-rs/canvas";
import type { Frame, SwfFile, SwfSymbol } from "../swf/types.ts";
import { NO_CX } from "../swf/render.ts";
import { MovieClip, registerClass, Button } from "./movieclip.ts";
import { drawNode } from "./object.ts";
import { Color, getTimer, Mouse, Player, SharedObject, Selection, setInterval, clearInterval, _global } from "./player.ts";
import { parseHtml, TextField, TextFormat } from "./text.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const SWF = join(import.meta.dir, "../../../web/public/assets/swf");

// ---- tiny AVM1 assembler -----------------------------------------------------------------------
const bytes = (s: string) => [...new TextEncoder().encode(s), 0];
const act = (op: number, payload: number[] = []) => (op >= 0x80 ? [op, payload.length & 255, payload.length >> 8, ...payload] : [op]);
const i32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const push = (...v: (string | number | boolean | undefined)[]) =>
  act(0x96, v.flatMap((x) => (typeof x === "string" ? [0, ...bytes(x)] : typeof x === "number" ? [7, ...i32(x)] : x === undefined ? [3] : [5, x ? 1 : 0])));
const GETVAR = act(0x1c), SETVAR = act(0x1d), ADD2 = act(0x47), LESS2 = act(0x48), CALLMETHOD = act(0x52), POP = act(0x17), RETURN = act(0x3e);
const b64 = (...code: number[][]) => btoa(String.fromCharCode(...code.flat(), 0));
const STOP = b64(act(0x07));

// ---- synthetic SWF ------------------------------------------------------------------------------
const square = (id: number, color: [number, number, number, number]): SwfSymbol => ({
  type: "shape", id, bounds: [0, 0, 10, 10], paths: [{ fill: { type: "solid", color }, d: "M 0 0 L 10 0 L 10 10 L 0 10 L 0 0" }],
});
const sprite = (id: number, frames: Frame[]): SwfSymbol => ({ type: "sprite", id, frameCount: frames.length, frames });
const DUMMY = "AA=="; // ActionEnd: frame has a script, the hook provides it
const file: SwfFile = {
  format: "dofus-swf-json", formatVersion: 1, src: "test.swf", version: 6, width: 742, height: 550, frameRate: 25, background: null,
  root: {
    frameCount: 5,
    frames: [
      { label: "start", ops: [{ op: "place", depth: 1, id: 1, name: "a" }, { op: "place", depth: 2, id: 3, name: "kid", clipActions: [{ events: ["load"], bytecode: DUMMY }] }], actions: [DUMMY] },
      { ops: [{ op: "place", depth: 1, move: true, matrix: [1, 0, 0, 1, 5, 0] }], actions: [DUMMY] },
      { label: "Middle", ops: [{ op: "remove", depth: 1 }, { op: "place", depth: 1, id: 2, name: "b" }] },
      {},
      { label: "end" },
    ],
  },
  symbols: {
    1: square(1, [255, 0, 0, 255]),
    2: square(2, [0, 0, 255, 255]),
    // kid: 3 frames; frame 2 places a square that frame 3 removes; frame 3 stops (real bytecode)
    3: sprite(3, [{ actions: [DUMMY] }, { ops: [{ op: "place", depth: 1, id: 1, name: "dot" }], actions: [DUMMY] }, { ops: [{ op: "remove", depth: 1 }], actions: [STOP] }]),
    4: sprite(4, [{ ops: [{ op: "place", depth: 1, id: 1 }] }]),
    5: { type: "button", id: 5, trackAsMenu: false, records: [
      { states: ["up"], id: 1, depth: 1, matrix: [1, 0, 0, 1, 0, 0] }, { states: ["over", "down"], id: 2, depth: 1, matrix: [1, 0, 0, 1, 0, 0] },
      { states: ["hit"], id: 1, depth: 1, matrix: [2, 0, 0, 2, 0, 0] }], actions: [] },
    6: sprite(6, [{ ops: [{ op: "place", depth: 1, id: 5, name: "btn" }] }]),
    7: sprite(7, [{ ops: [{ op: "place", depth: 1, id: 3 }] }]), // an unnamed timeline instance of kid
  },
  exports: { Kid: 3, Square: 4, Btn: 6, Holder: 7 },
  imports: [],
};

let p: Player, log: string[];
const hooks = new Map<string, () => void>();
beforeEach(() => {
  log = [];
  hooks.clear();
  p = new Player({
    loader: {
      json: async (f) => (f === "test.json" ? structuredClone(file) : JSON.parse(readFileSync(join(SWF, f), "utf8"))),
      image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource,
    },
    createCanvas: (w, h) => createCanvas(w, h),
    scriptHook: (key) => {
      const h = hooks.get(key);
      if (h) return h;
      return key.startsWith("test.swf") && !key.endsWith("@3") ? () => void log.push(key.replace("test.swf#", "")) : undefined;
    },
  });
});
async function loadTest(): Promise<MovieClip> {
  p.root.$replaceContent(await p.load("test.swf"));
  p.runQueue();
  return p.root;
}
const kids = (c: MovieClip) => c.$.children.map((k) => k.$.name || String(k.$.id));

// ---- timeline -----------------------------------------------------------------------------------
test("frame-1 order: child frame actions, child load, then parent frame actions", async () => {
  await loadTest();
  expect(log).toEqual(["3@1", "0@1:2:load", "0@1"]);
});

test("tick order: enterFrame, advance + frame actions, pre-order", async () => {
  const r = await loadTest(), kid = r.kid as MovieClip;
  log = [];
  r.onEnterFrame = () => log.push("root:enterFrame");
  kid.onEnterFrame = () => log.push("kid:enterFrame");
  p.tick();
  expect(log).toEqual(["root:enterFrame", "0@2", "kid:enterFrame", "3@2"]);
  expect(kids(kid)).toEqual(["dot"]);
  p.tick(); // kid frame 3: removes dot, stop() via the interpreter
  expect(kids(kid)).toEqual([]);
  p.tick();
  expect(kid._currentframe).toBe(3);
  expect(r._currentframe).toBe(4);
});

test("labels are case-insensitive; goto forward skips intermediate instances", async () => {
  const r = await loadTest();
  r.gotoAndStop("middle");
  expect(r._currentframe).toBe(3);
  expect(kids(r)).toEqual(["b", "kid"]);
  expect(r.a).toBeUndefined();
  r.gotoAndStop("END");
  expect(r._currentframe).toBe(5);
  r.gotoAndStop("nope"); // unknown label: no-op
  expect(r._currentframe).toBe(5);
  r.gotoAndStop(99); // clamps
  expect(r._currentframe).toBe(5);
});

test("backward goto rebuilds; surviving instances keep identity and properties", async () => {
  const r = await loadTest(), kid = r.kid as MovieClip;
  kid.foo = 42;
  r.gotoAndStop(3);
  r.gotoAndStop(2);
  p.runQueue();
  expect(r.kid).toBe(kid);
  expect(kid.foo).toBe(42);
  expect((r.a as MovieClip)._x).toBe(5); // re-created with frame 2's move applied
  expect(r.b).toBeUndefined();
  log = [];
  r.gotoAndStop(2); // same frame: no-op, no actions
  p.runQueue();
  expect(log).toEqual([]);
});

test("play loops back to frame 1 keeping frame-1 instances; stop holds", async () => {
  const r = await loadTest(), kid = r.kid as MovieClip;
  for (let i = 0; i < 5; i++) p.tick();
  expect(r._currentframe).toBe(1);
  expect(r.kid).toBe(kid);
  expect(r.a).toBeDefined();
  r.stop();
  p.tick();
  expect(r._currentframe).toBe(1);
  r.play();
  p.tick();
  expect(r._currentframe).toBe(2);
});

// ---- attachMovie, depths, classes -----------------------------------------------------------------
test("attachMovie: depth order, replacement, swapDepths, removeMovieClip rules", async () => {
  const r = await loadTest();
  const s1 = r.attachMovie("Square", "s1", 10)!, s2 = r.attachMovie("square", "s2", 5)!, s3 = r.attachMovie("Square", "s3", 7, { _x: 3, tag: "x" })!;
  expect(kids(r)).toEqual(["a", "kid", "s2", "s3", "s1"]);
  expect(s3._x).toBe(3);
  expect(s3.tag).toBe("x");
  expect(r.s1).toBe(s1);
  s2.swapDepths(20);
  expect(kids(r).slice(2)).toEqual(["s3", "s1", "s2"]);
  s1.swapDepths(s3);
  expect([s1.getDepth(), s3.getDepth()]).toEqual([7, 10]);
  const s4 = r.attachMovie("Square", "s4", 7)!; // occupied depth: replaces s1
  expect(s1.$.removed).toBe(true);
  expect(r.s1).toBeUndefined();
  s4.removeMovieClip();
  expect(r.s4).toBeUndefined();
  (r.kid as MovieClip).removeMovieClip(); // timeline depth (negative): Flash refuses
  expect((r.kid as MovieClip).$.removed).toBe(false);
  expect((r.kid as MovieClip).getDepth()).toBe(-16382);
  expect(r.attachMovie("Missing", "m", 1)).toBeUndefined();
});

test("children sharing a name: the name finds the first in depth order, re-resolved on swap and removal", async () => {
  // BattleField Characters.build re-creates "sprite<i>" at depth i+200000 while the previous sprite sits at its cell
  // depth (Character.as setPosition → chgDepth): Flash keeps finding the old, lower one (Ruffle ChildContainer::get_name).
  const r = await loadTest();
  const old = r.createEmptyMovieClip("sprite1", 200001);
  old.swapDepths(15350);
  const fresh = r.createEmptyMovieClip("sprite1", 200001);
  expect(old.$.removed).toBe(false);
  expect(r.sprite1).toBe(old);
  fresh.swapDepths(100); // now first in depth order
  expect(r.sprite1).toBe(fresh);
  fresh.removeMovieClip();
  expect(r.sprite1).toBe(old);
  old._name = "renamed";
  expect(r.sprite1).toBeUndefined();
  expect(r.renamed).toBe(old);
  r.tag = 5; // a variable keeps its name against a removal elsewhere
  const t = r.createEmptyMovieClip("t", 3);
  t._name = "u";
  expect(r.tag).toBe(5);
});

test("unnamed timeline instances are named instance<N>: reachable, seen by for…in, restarted by playFirstChildren", async () => {
  // Character.setAnim replays the same label (a second close combat during the first one): only playFirstChildren
  // restarts the unnamed animation clip, whose frame script calls end() (clips/sprites/40.swf sprite 154 frame 9).
  const r = await loadTest();
  const h1 = r.attachMovie("Holder", "h1", 50)!, h2 = r.attachMovie("Holder", "h2", 51)!;
  const inner = h1.$.children[0] as MovieClip;
  expect(inner._name).toMatch(/^instance\d+$/);
  expect(h2.$.children[0]!._name).not.toBe(inner._name); // one counter per player
  expect(h1[inner._name]).toBe(inner);
  expect(Object.keys(h1)).toContain(inner._name);
  inner.gotoAndStop(3);
  h1.playFirstChildren();
  expect(inner._currentframe).toBe(1);
  expect(inner.$.playing).toBe(true);
});

test("registerClass: initObject and frame-1 children exist when the constructor runs; frame actions after", async () => {
  const r = await loadTest();
  const seen: unknown[] = [];
  class Kid extends MovieClip {
    constructor() {
      super();
      seen.push(this.foo, this._name, this._parent === r, this._currentframe);
      log.push("ctor");
    }
    hello() { return "hi"; }
  }
  registerClass("Kid", Kid);
  log = [];
  const k = r.attachMovie("Kid", "k", 3, { foo: 7 }) as Kid;
  log.push("returned");
  p.runQueue();
  registerClass("Kid", null);
  expect(k).toBeInstanceOf(Kid);
  expect(k.hello()).toBe("hi");
  expect(seen).toEqual([7, "k", true, 1]);
  expect(log).toEqual(["ctor", "returned", "3@1"]);
});

test("for…in sees only dynamic properties and named children", async () => {
  const r = await loadTest(), kid = r.kid as MovieClip;
  kid.x1 = 1;
  kid.gotoAndStop(2);
  expect(Object.keys(kid).sort()).toEqual(["dot", "x1"]);
});

// ---- hit testing and mouse -------------------------------------------------------------------------
test("hitTest shape/bounds/clip and mouse event sequence", async () => {
  const r = await loadTest();
  const s = r.attachMovie("Square", "s", 10, { _x: 100, _y: 100 })!;
  s._rotation = 45;
  expect(s.hitTest(100, 107, true)).toBe(true);
  expect(s.hitTest(97, 101, true)).toBe(false); // inside the bounding box, outside the rotated square
  expect(s.hitTest(97, 101)).toBe(true);
  const t = r.attachMovie("Square", "t", 11, { _x: 95, _y: 105 })!;
  expect(s.hitTest(t)).toBe(true);
  t.removeMovieClip();
  s._rotation = 0;
  const ev: string[] = [];
  for (const e of ["onRollOver", "onRollOut", "onPress", "onRelease", "onReleaseOutside", "onDragOut", "onDragOver"]) s[e] = () => ev.push(e);
  Mouse.addListener({ onMouseDown: () => ev.push("listener:down") });
  p.mouseMove(105, 105);
  p.mouseDown();
  p.mouseUp();
  p.mouseDown();
  p.mouseMove(150, 150);
  p.mouseUp();
  expect(ev).toEqual(["onRollOver", "listener:down", "onPress", "onRelease", "listener:down", "onPress", "onDragOut", "onReleaseOutside"]);
  // topmost wins; a parent with handlers captures its children; enabled = false is skipped
  const top = r.attachMovie("Square", "top", 20, { _x: 100, _y: 100 })!;
  top.onRelease = () => {};
  expect(p.target()).toBeUndefined(); // mouse is at 150,150
  p.mouseMove(102, 102);
  expect(p.target()).toBe(top);
  top.enabled = false;
  expect(p.target()).toBe(s);
  const holder = r.createEmptyMovieClip("holder", 30), inner = holder.attachMovie("Square", "inner", 1, { _x: 100, _y: 100 })!;
  inner.onPress = () => {};
  holder.onPress = () => {};
  expect(p.target()).toBe(holder);
});

test("DefineButton2: states follow the mouse, hit area is the hit state", async () => {
  const r = await loadTest();
  const host = r.attachMovie("Btn", "host", 10, { _x: 200, _y: 200 })!, btn = host.btn as Button;
  expect(btn).toBeInstanceOf(Button);
  const ev: string[] = [];
  btn.onRelease = () => ev.push("release");
  p.mouseMove(215, 215); // outside the 10×10 up shape, inside the 20×20 hit shape
  expect(btn.$.state).toBe("over");
  p.mouseDown();
  expect(btn.$.state).toBe("down");
  p.mouseUp();
  expect(ev).toEqual(["release"]);
  p.mouseMove(300, 300);
  expect(btn.$.state).toBe("up");
});

// ---- colour and transforms ------------------------------------------------------------------------
test("Color setRGB/setTransform/getTransform, _alpha fixed point, rendering", async () => {
  const r = await loadTest();
  const s = r.attachMovie("Square", "s", 10, { _x: 1, _y: 1 })!, c = new Color(s);
  c.setRGB(0x336699);
  expect(s.$.cx).toEqual([0, 0, 0, 1, 0x33, 0x66, 0x99, 0]);
  c.setTransform({ ra: 50, rb: 10 });
  expect(c.getTransform()).toEqual({ ra: 50, rb: 10, ga: 0, gb: 0x66, ba: 0, bb: 0x99, aa: 100, ab: 0 });
  s._alpha = 33;
  expect(s._alpha).toBe(32.8125);
  const cv = createCanvas(20, 20), ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  s._alpha = 100;
  drawNode(ctx, s, NO_CX);
  expect([...ctx.getImageData(5, 5, 1, 1).data]).toEqual([255 * 0.5 + 10, 0x66, 0x99, 255].map(Math.round));
});

test("script-transformed timeline instances ignore later timeline moves", async () => {
  const r = await loadTest(), a = r.a as MovieClip;
  a._y = 50;
  r.gotoAndStop(2); // frame 2 moves depth 1 to x = 5
  expect([a._x, a._y]).toEqual([0, 50]);
  a._xscale = -100;
  expect(a._xscale).toBe(-100);
  a._rotation = 90;
  expect(a._rotation).toBe(90);
  expect(a._xscale).toBe(-100);
  a._x = 1.234;
  expect(a._x).toBe(1.2); // twips
});

test("geometry: getBounds, _width, localToGlobal", async () => {
  const r = await loadTest();
  const h = r.createEmptyMovieClip("h", 40);
  h._x = 100;
  const s = h.attachMovie("Square", "s", 1, { _x: 10 })!;
  s._xscale = 200;
  expect(s._width).toBe(20);
  expect(h.getBounds()).toEqual({ xMin: 10, yMin: 0, xMax: 30, yMax: 10 });
  expect(s.getBounds(r)).toEqual({ xMin: 110, yMin: 0, xMax: 130, yMax: 10 });
  expect(s.localToGlobal({ x: 5, y: 5 })).toEqual({ x: 120, y: 5 });
  expect(h.globalToLocal({ x: 120, y: 5 })).toEqual({ x: 20, y: 5 });
  s._width = 40;
  expect(s._xscale).toBe(400);
  expect(r.createEmptyMovieClip("e", 41).getBounds().xMin).toBe(6710886.35);
});

test("drawing API: fills, gradient box, curveTo/drawArc, bounds", async () => {
  const r = await loadTest(), g = r.createEmptyMovieClip("g", 50);
  g.beginFill(0x00ff00, 100);
  g.moveTo(0, 0);
  g.lineTo(10, 0);
  g.lineTo(10, 10);
  g.lineTo(0, 10);
  g.endFill();
  g.lineStyle(1, 0, 100);
  g.moveTo(20, 0);
  g.drawArc(20, 0, 5, 360, 0);
  g.beginGradientFill("linear", [0xff0000, 0x0000ff], [100, 100], [0, 255], { matrixType: "box", x: 0, y: 20, w: 10, h: 10, r: 0 });
  g.moveTo(0, 20);
  g.lineTo(10, 20);
  g.lineTo(10, 30);
  g.lineTo(0, 30);
  g.endFill();
  const b = g.getBounds();
  expect([b.xMin, b.yMin, b.yMax]).toEqual([-0.5, -5.5, 30.5]); // the 1 px line style also outlines the last fill
  expect(g.hitTest(5, 5, true)).toBe(true);
  const cv = createCanvas(40, 40), ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  drawNode(ctx, g, NO_CX);
  expect([...ctx.getImageData(5, 5, 1, 1).data]).toEqual([0, 255, 0, 255]);
  const left = ctx.getImageData(1, 25, 1, 1).data, right = ctx.getImageData(9, 25, 1, 1).data;
  expect(left[0]! > left[2]! && right[2]! > right[0]!).toBe(true);
});

// ---- text ---------------------------------------------------------------------------------------
test("htmlText subset and appending", async () => {
  const runs = parseHtml('<p align="center"><font color="#ff0000" size="14">Hi <b>there</b></font></p><br>x &amp; y', { font: "Verdana", size: 10, color: 0, bold: false, italic: false, underline: false, align: "left", leftMargin: 0, rightMargin: 0, indent: 0, leading: 0, url: "" });
  expect(runs.map((r) => r.text).join("")).toBe("Hi there\r\rx & y");
  expect(runs[1]).toMatchObject({ text: "there", fmt: { bold: true, color: 0xff0000, size: 14, align: "center" } });
  const r = await loadTest(), tf = r.createTextField("t", 60, 0, 0, 100, 20);
  tf.html = true;
  tf.htmlText = "<b>a</b>";
  tf.htmlText += "<i>b</i>";
  expect(tf.text).toBe("ab");
  expect(tf.htmlText).toBe("<b>a</b><i>b</i>");
});

test("TextField: wrap, scroll, initChat, autoSize, setText format, variable binding, render", async () => {
  const r = await loadTest(), tf = r.createTextField("t", 60, 10, 10, 60, 40);
  tf.wordWrap = tf.multiline = true;
  tf.text = "one two three four five six seven eight nine ten eleven twelve";
  expect(tf.maxscroll).toBeGreaterThan(1);
  const heard: unknown[] = [];
  tf.addListener({ onScroller: (t: unknown) => heard.push(t) });
  tf.scroll = 99;
  expect(tf.scroll).toBe(tf.maxscroll);
  expect(heard).toEqual([tf]); // TextField.addListener: onScroller with the field
  expect(tf.bottomScroll).toBeGreaterThanOrEqual(tf.scroll);
  tf.initChat();
  expect(tf.text.replace(/\n/g, "")).toBe("");
  expect(tf.maxscroll).toBe(2);
  // Chat.refresh (AKSClient/Dofus.Chat.as:94-105): the log is emptied and refilled; it keeps following the newest line
  tf.html = true;
  let log = "";
  for (let i = 1; i <= 6; i++) {
    log += `<br>line ${i}`;
    tf.initChat();
    expect(tf.scroll).toBeLessThanOrEqual(tf.maxscroll); // stored scroll kept, clamped when read
    tf.htmlText += log;
    if (Math.abs(tf.maxscroll - tf.scroll) < 4) tf.scroll = tf.maxscroll;
    expect(tf.scroll).toBe(tf.maxscroll);
  }
  const a = r.createTextField("a", 61, 100, 0, 0, 0);
  a.autoSize = "CENTER";
  a.text = "centered";
  expect(a._width).toBeGreaterThan(20);
  expect(a.$.rect[0]).toBeCloseTo(-a._width / 2, 5);
  a.setText(12, "Font2", 0xff0000, 18);
  const f = a.getTextFormat();
  expect([f.font, f.color, f.size, a.embedFonts]).toEqual(["Font2", 0xff0000, 18, true]);
  const cv = createCanvas(200, 60), ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  drawNode(ctx, a, NO_CX);
  const px = ctx.getImageData(0, 0, 200, 60).data;
  expect(px.some((v, i) => i % 4 === 0 && v > 128 && px[i + 3]! > 128)).toBe(true); // red text drawn
  a.setTextFormat(0, 1, Object.assign(new TextFormat(), { bold: true }));
  expect(a.getTextFormat().bold).toBe(null); // mixed
  a.variable = "score";
  p.tick();
  expect(r.score).toBe("12"); // undefined variable takes the field's text
  r.score = 99;
  p.tick();
  expect(a.text).toBe("99");
  expect(a.getTextFormat().color).toBe(0); // assigning text uses the new-text format (setText re-applies after)
  a.text += " pts"; // field → variable at once (Flash), so the next tick does not restore the old value
  expect(r.score).toBe("99 pts");
  p.tick();
  expect(a.text).toBe("99 pts");
  Selection.setFocus("score");
  expect(Selection.getFocus()).toBe("_level0.a");
});

// ---- interpreter -----------------------------------------------------------------------------------
test("AVM1: SWF6 coercions, case-insensitive names, paths, functions", async () => {
  const r = await loadTest(), kid = r.kid as MovieClip;
  hooks.set("x", () => {});
  const { runActions } = await import("./avm1.ts");
  runActions(b64(
    push("x", "vx"), GETVAR, push(1), ADD2, SETVAR, // x = vx + 1 → 1 (undefined → 0)
    push("lt", "_parent"), GETVAR, push("level"), act(0x4e), push(3), LESS2, SETVAR, // lt = _parent.level < 3 → true
    push("m", 5, 2, 2, "MAth"), GETVAR, push("max"), CALLMETHOD, SETVAR, // m = MAth.max(2, 5)
    push("_X", 12), SETVAR, // property names are case-insensitive
    push("_parent.b2", "z"), SETVAR, // dotted path
    push("s", "a", undefined), ADD2, SETVAR, // "a" + undefined → "a"
    push(1, 1, "cColors"), GETVAR, push("applyColor"), CALLMETHOD, POP, // undefined object: silent no-op
  ), kid);
  expect([kid.x, kid.lt, kid.m, kid._x, r.b2, kid.s]).toEqual([1, true, 5, 12, "z", "a"]);
  // DefineFunction: this.f = function(a) { return a + 1 } — callable from TS
  const body = [...push("a"), ...GETVAR, ...push(1), ...ADD2, ...RETURN];
  runActions(b64(push("this"), GETVAR, push("f"), act(0x9b, [...bytes(""), 1, 0, ...bytes("a"), body.length & 255, body.length >> 8]), body, act(0x4f)), kid);
  expect((kid.f as (a: number) => number)(2)).toBe(3);
  // GotoFrame2 with a label in another case
  runActions(b64(push("MIDDLE"), act(0x9f, [0])), r);
  expect(r._currentframe).toBe(3);
});

test("asset functions: ground.attach and circle.setColor/animate (DefineFunction closures, NewObject)", async () => {
  const ground = p.root.createEmptyMovieClip("Ground", 1), circle = p.root.createEmptyMovieClip("circle", 2);
  ground.loadMovie("clips/ground.swf");
  circle.loadMovie("clips/circle.swf");
  for (let i = 0; i < 50 && !(ground.$.loaded && circle.$.loaded); i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  const cell = (ground.attach as (s: string, n: string, d: number) => MovieClip)("7", "cell0", 5);
  expect(cell._name).toBe("cell0");
  expect((cell.clip as MovieClip)._totalframes).toBeGreaterThan(0);
  expect((ground.clips as MovieClip).cell0).toBe(cell);
  (circle.setColor as (c: number) => void)(0xff0000);
  expect((circle.circle as MovieClip).$.cx.slice(4, 7)).toEqual([255, 0, 0]);
  (circle.animate as (b: boolean) => void)(false);
  expect((circle.circle as MovieClip)._currentframe).toBe(1);
});

// ---- loading, timers, persistence -------------------------------------------------------------------
test("loadMovie wipes dynamic properties, keeps identity/transform; onInitFrame fires once loaded", async () => {
  const holder = p.root.createEmptyMovieClip("holder", 5), clip = holder.createEmptyMovieClip("clip", 1);
  clip._x = 33;
  clip.data = { n: 1 };
  clip.junk = true;
  let fired: unknown;
  clip.onInitFrame = function (this: MovieClip) {
    fired = [this === clip, this._currentframe, (this.data as { n: number }).n];
  };
  expect(clip.getBytesTotal()).toBe(4);
  clip.loadMovie("clips/circle.swf");
  for (let i = 0; i < 50 && fired === undefined; i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  expect(fired).toEqual([true, 1, 1]);
  expect(clip.junk).toBeUndefined();
  expect([clip._x, clip._name, holder.clip]).toEqual([33, "clip", clip]);
  expect(clip.getBytesLoaded()).toBe(clip.getBytesTotal());
  expect((p.root._onInitFrameClips_ as MovieClip).$.children).toEqual([]);
});

test("onInitFrame: an attached library symbol is complete at once, an empty clip never is", async () => {
  const r = await loadTest(), sym = r.attachMovie("Square", "sym", 10)!, empty = r.createEmptyMovieClip("empty", 11);
  const fired: string[] = [];
  sym.onInitFrame = () => fired.push("sym");
  empty.onInitFrame = () => fired.push("empty");
  expect(sym.getBytesLoaded()).toBe(sym.getBytesTotal());
  expect(sym.getBytesTotal()).toBeGreaterThan(4);
  for (let i = 0; i < 3; i++) p.tick();
  expect(fired).toEqual(["sym"]);
  sym.loadMovie("clips/circle.swf"); // a pending load is incomplete again
  expect(sym.getBytesTotal()).toBe(4);
});

test("loadMovie into an already loaded clip: onInitFrame waits for the new content", async () => {
  const clip = p.root.createEmptyMovieClip("clip", 5);
  clip.loadMovie("clips/circle.swf");
  for (let i = 0; i < 50 && !clip.$.loaded; i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  const fired: string[] = [];
  clip.onInitFrame = function (this: MovieClip) {
    fired.push(this.$.swf!.file.src);
  };
  clip.loadMovie("clips/ground.swf");
  expect(clip.getBytesTotal()).toBe(4);
  for (let i = 0; i < 50 && !fired.length; i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  for (let i = 0; i < 3; i++) p.tick();
  expect(fired).toEqual(["clips/ground.swf"]);
});

test("setInterval / clearInterval / getTimer on the runtime clock", () => {
  const hits: [number, unknown][] = [];
  const obj = { tick(a: unknown) { hits.push([getTimer(), a]); } };
  const id = setInterval(obj, "tick", 100, "arg");
  p.advance(350);
  expect(hits).toEqual([[100, "arg"], [200, "arg"], [300, "arg"]]);
  clearInterval(id);
  p.advance(200);
  expect(hits.length).toBe(3);
  expect(getTimer()).toBe(550);
  expect(p.ticks).toBe(14); // ticks at 0, 40, …, 520
});

test("SharedObject.getLocal returns one persistent data object per name; _global is shared with scripts", () => {
  const so = SharedObject.getLocal("DofusSO");
  so.data.volumeSound = 50;
  expect(SharedObject.getLocal("DofusSO").data.volumeSound).toBe(50);
  expect(_global.Math).toBe(Math);
  expect(TextField).toBeDefined();
});
