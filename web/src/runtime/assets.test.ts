// Headless playback of real assets: character sprite 10.swf (CastR) and spell 903.swf, with frame strips
// written to web/public/assets/runtime-preview/ and pixel comparison against the JPEXS references.
import { beforeEach, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, Path2D } from "@napi-rs/canvas";
import { compare, readPng } from "../../../scripts/assets-media/compare.ts";
import { NO_CX, resolve } from "../swf/render.ts";
import { drawNode } from "./object.ts";
import { CODE_SWFS, construct, MovieClip } from "./movieclip.ts";
import { _global, Player, TextFormat, type ScriptHook } from "./player.ts";
import type { SwfIndex } from "../swf/types.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const ROOT = join(import.meta.dir, "../../..");
const SWF = join(ROOT, "web/public/assets/swf"), PREVIEW = join(ROOT, "web/public/assets/runtime-preview"), REF = join(ROOT, "decompiled/reference");
mkdirSync(PREVIEW, { recursive: true });

let p: Player;
const make = (scriptHook?: ScriptHook) =>
  (p = new Player({
    loader: { json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")), image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource },
    createCanvas: (w, h) => createCanvas(w, h),
    scriptHook,
  }));
beforeEach(() => void make());

/** Stand-in for `CharactersWeapons.applyWeapon` (`AKSClient/Dofus.CharactersWeapons.as:26-50`): attach the weapon
 *  the sprite imports (the real code picks it from the character data). */
_global.WEAPONS = {
  applyWeapon(obj: MovieClip, side: string) {
    const name = obj.$.swf?.file.imports[0]?.items[0]?.name;
    if (!name) return;
    (obj.clip as MovieClip | undefined)?.removeMovieClip();
    obj.attachMovie(name, "clip", 10);
    (obj.clip as MovieClip | undefined)?.gotoAndStop(side);
  },
};

/** Let pending loads resolve, then run ticks until `ok` (max n). */
async function loaded(clip: MovieClip) {
  for (let i = 0; i < 50 && !clip.$.loaded; i++) await new Promise((r) => setTimeout(r, 10)), p.tick();
  expect(clip.$.loaded).toBe(true);
}

/** Render a stage region (x, y, w, h) at `scale` into a strip cell. */
function strip(name: string, frames: ((ctx: CanvasRenderingContext2D) => void)[], w: number, h: number, scale = 2, bg = "#e8e0c8") {
  const cols = Math.min(frames.length, 10), rows = Math.ceil(frames.length / cols);
  const c = createCanvas(cols * w * scale, rows * h * scale), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  frames.forEach((f, i) => {
    ctx.save();
    ctx.translate((i % cols) * w * scale, Math.floor(i / cols) * h * scale);
    ctx.scale(scale, scale);
    f(ctx);
    ctx.restore();
  });
  writeFileSync(join(PREVIEW, name), c.toBuffer("image/png"));
}
/** Snapshot of the stage around (cx, cy) as a strip cell painter. */
function snap(cx: number, cy: number, w: number, h: number, label: string, ink = "#000") {
  const c = createCanvas(w, h), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.translate(w / 2 - cx, h / 2 - cy);
  drawNode(ctx, p.root, NO_CX);
  return (out: CanvasRenderingContext2D) => {
    out.drawImage(c as unknown as CanvasImageSource, 0, 0);
    out.fillStyle = ink;
    out.font = "7px sans-serif";
    out.fillText(label, 2, 8);
  };
}

/** Minimal stand-in for `Dofus.BattleField.Characters.Character` (setAnim/wait, `Character.as:707-765`). */
function character(file: string) {
  const sprite = p.root.createEmptyMovieClip("sprite0", 200000);
  sprite._x = 371;
  sprite._y = 300;
  const clip = sprite.createEmptyMovieClip("clip", 2), log: string[] = [];
  const ctrl = {
    data: { dir: 0, anim: "static", SEQUENCER_anim: { unicID: "u1", onActionEnd: () => log.push(`end ${clip._currentframe}`) } },
    setAnim(anim: string) {
      clip.gotoAndStop(anim + "R");
      clip._xscale = 100;
      clip.playFirstChildren();
      ctrl.data.anim = anim;
    },
    wait() {
      log.push("wait");
      ctrl.setAnim("static");
    },
  };
  sprite._ACTION = sprite._OBJECT = ctrl;
  clip.loadMovie(file);
  return { sprite, clip, ctrl, log };
}

test("character 10.swf: CastR ends on frame 20, returns to StaticR on frame 33", async () => {
  const { clip, ctrl, log } = character("clips/sprites/10.swf");
  await loaded(clip);
  p.tick();
  expect(clip._currentframe).toBe(2); // "Init" then stop() on "StaticR"
  expect((clip.$.children.find((c) => c.$.depth === -16383) as MovieClip).$.id).toBe(63);
  ctrl.setAnim("cast");
  p.runQueue(); // end of the calling event: queued frame-1 actions (applyWeapon) run before the frame is drawn
  const cast = clip.$.children.find((c) => c.$.depth === -16383) as MovieClip;
  expect(cast.$.id).toBe(147);
  const frames: ReturnType<typeof snap>[] = [];
  const events: string[] = [];
  for (let i = 1; i <= 40; i++) {
    frames.push(snap(371, 270, 90, 100, `${i}:${cast.$.removed ? "static" : cast._currentframe}`));
    const before = log.length;
    p.tick();
    if (log.length > before) events.push(`${log.slice(before).join("+")} at cast frame ${i + 1}`);
  }
  strip("character-10-castR.png", frames, 90, 100);
  expect(events).toEqual(["end 51 at cast frame 20", "wait at cast frame 33"]);
  expect(cast.$.removed).toBe(true); // wait() jumped back to StaticR
  expect(clip._currentframe).toBe(2);
});

test("character 10.swf: walk cycle loops with stable instances", async () => {
  const { clip, ctrl } = character("clips/sprites/10.swf");
  await loaded(clip);
  ctrl.setAnim("Walk");
  p.runQueue();
  const walk = clip.$.children.find((c) => c.$.depth === -16383) as MovieClip;
  const body = walk.$.children[0]!;
  const frames: ReturnType<typeof snap>[] = [];
  for (let i = 1; i <= 20; i++) frames.push(snap(371, 270, 90, 100, `${walk._currentframe}`)), p.tick();
  strip("character-10-walkR.png", frames, 90, 100);
  expect(walk._currentframe).toBe(6); // 15-frame loop: 1 + 20 ticks
  expect(walk.$.children[0]).toBe(body); // looping keeps frame-1 instances (same depth + character)
});

test("spell 903.swf: end() then removes itself after 25 frames", async () => {
  const spell = p.root.createEmptyMovieClip("spell1", 1000);
  spell._x = 371;
  spell._y = 275;
  const ended: number[] = [];
  spell._ACTION = { data: { SEQUENCER_anim: { unicID: "s", onActionEnd: () => ended.push(p.ticks) } } };
  spell._OBJECT = {};
  const clip = spell.createEmptyMovieClip("clip", 1);
  clip.loadMovie("clips/spells/903.swf");
  await loaded(clip);
  const start = p.ticks, rotate = clip.rotate as MovieClip;
  expect(rotate._currentframe).toBe(1);
  expect(rotate._xscale).toBe(50); // frame 1 script: t = 50 + _parent.level * 5 (level undefined → 0)
  const frames: ReturnType<typeof snap>[] = [];
  while (!clip.$.removed && p.ticks < start + 40) frames.push(snap(415, 240, 120, 70, `${rotate._currentframe}`, "#fff")), p.tick();
  strip("spell-903.png", frames, 120, 70, 2, "#203040");
  expect(ended).toEqual([start + 24]);
  expect(clip.$.removed).toBe(true);
  expect(p.ticks).toBe(start + 24); // frame 25 = 24 ticks after the load frame
  expect(spell.clip).toBeUndefined();
});

/** Render symbol `id` of `src` after frame-1 + (frame − 1) ticks with all scripts disabled (JPEXS semantics). */
async function scoreAgainstReference(src: string, id: number, frame: number) {
  make(() => () => {});
  const swf = await p.load(src), sym = resolve(swf, id)![1];
  if (sym.type !== "sprite") throw new Error("not a sprite");
  const clip = construct(MovieClip, { parent: p.root, name: "x", depth: 1, swf, id, tl: sym });
  for (let i = 1; i < frame; i++) p.tick();
  const base = `${src.replace(/\.swf$/, "").replace(/\//g, "-")}__${id}__f${frame}.png`;
  const meta = (JSON.parse(readFileSync(join(REF, "index.json"), "utf8")) as { file: string; size: [number, number]; origin: [number, number] }[]).find((e) => e.file === base)!;
  const c = createCanvas(meta.size[0], meta.size[1]), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.translate(meta.origin[0], meta.origin[1]);
  clip.$setMatrix([1, 0, 0, 1, 0, 0]);
  drawNode(ctx, clip, NO_CX);
  writeFileSync(join(PREVIEW, `ref-${base}`), c.toBuffer("image/png"));
  const cand = ctx.getImageData(0, 0, c.width, c.height);
  return compare(await readPng(join(REF, base)), cand, { refOrigin: meta.origin, candOrigin: meta.origin }).badRatio;
}

test("timeline renders match JPEXS references (scripts off)", async () => {
  const cases: [string, number, number][] = [
    ["clips/sprites/10.swf", 99, 1], ["clips/sprites/10.swf", 99, 6], ["clips/sprites/10.swf", 99, 15],
    ["clips/sprites/10.swf", 147, 1], ["clips/sprites/10.swf", 147, 13], ["clips/sprites/10.swf", 147, 25], ["clips/sprites/10.swf", 147, 37],
    ["clips/spells/903.swf", 15, 1], ["clips/spells/903.swf", 15, 9], ["clips/spells/903.swf", 15, 17], ["clips/spells/903.swf", 15, 25],
  ];
  const scores: string[] = [];
  for (const [src, id, f] of cases) scores.push(`${src} ${id} f${f}: ${(await scoreAgainstReference(src, id, f)).toFixed(3)}`);
  console.log(scores.join("\n"));
  for (const s of scores) expect(Number(s.split(": ")[1])).toBeLessThan(0.05);
});

test("every asset SWF loads and runs its scripts for 60 frames without errors", async () => {
  const idx = JSON.parse(readFileSync(join(SWF, "index.json"), "utf8")) as SwfIndex;
  const errors: string[] = [], { error, warn, log } = console;
  console.error = console.warn = (...a: unknown[]) => void errors.push(String(a[0]));
  console.log = () => {}; // trace()
  let n = 0;
  try {
    for (const f of idx.files) {
      if (CODE_SWFS.has(f.src)) continue;
      make();
      const c = p.root.createEmptyMovieClip("c", 1);
      c.loadMovie(f.src);
      await loaded(c);
      for (const k of Object.keys(c.$.swf!.file.exports).slice(0, 40)) c.attachMovie(k, "x" + k, 100 + n++ % 1000);
      for (let i = 0; i < 60; i++) p.tick();
      if (errors.length) errors.splice(0, errors.length, `${f.src}: ${errors.join(" | ")}`), (console.error = error), expect(errors).toEqual([]);
    }
  } finally {
    Object.assign(console, { error, warn, log });
  }
  expect(errors).toEqual([]);
}, 120000);

test("stage preview: AKSClient fonts, HTML text field, character and spell", async () => {
  const MEDIA = join(ROOT, "web/public/assets/media");
  for (const f of ["fonts/Verdana-c2158db2.ttf", "fonts/Verdana-bold-a1ed6d4e.ttf", "fonts/bitMini6-477eb65d.ttf"]) GlobalFonts.registerFromPath(join(MEDIA, f));
  await p.load("AKSClient.swf"); // makes the Font1/2/3 linkages resolvable
  const { clip, ctrl } = character("clips/sprites/10.swf");
  await loaded(clip);
  const t = p.root.createTextField("t", 10, 10, 10, 722, 60);
  t.wordWrap = t.multiline = t.html = true;
  t.setNewTextFormat(Object.assign(new TextFormat(), { font: "Verdana", size: 12, color: 0x203040 }));
  t.htmlText = '<p align="center"><b>Dofus beta 5b</b> — <font color="#cc3300">runtime</font> <u>preview</u></p><br>Verdana, then bitMini6 below';
  const n = p.root.createTextField("n", 11, 340, 220, 0, 0);
  n.autoSize = "center";
  n.setText(-12, "Font3", 0xff0000, 18); // as Character.showPoints (AKSClient/Dofus.BattleField.Characters.Character.as:107)
  ctrl.setAnim("cast");
  const spell = p.root.createEmptyMovieClip("spell", 1000);
  spell._x = 431;
  spell._y = 300;
  spell._ACTION = ctrl;
  const sc = spell.createEmptyMovieClip("clip", 1);
  sc.loadMovie("clips/spells/903.swf");
  await loaded(sc);
  for (let i = 0; i < 8; i++) p.tick();
  const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  p.render(ctx);
  writeFileSync(join(PREVIEW, "stage.png"), c.toBuffer("image/png"));
  expect(n._width).toBeGreaterThan(20);
});

test("code SWFs: AKSClient as root library, Interfaces symbols render without running their scripts", async () => {
  const MEDIA = join(ROOT, "web/public/assets/media");
  for (const f of ["fonts/Verdana-c2158db2.ttf", "fonts/Verdana-bold-a1ed6d4e.ttf", "fonts/bitMini6-477eb65d.ttf"]) GlobalFonts.registerFromPath(join(MEDIA, f));
  p.root.$replaceContent(await p.load("AKSClient.swf"));
  expect(p.root.attachMovie("clipOver", "over", 5)).toBeDefined(); // AKSClient export 124
  const ui = p.root.createEmptyMovieClip("Interfaces", 3);
  ui.loadMovie("modules/Interfaces.swf");
  await loaded(ui);
  const mp = ui.attachMovie("Interface::MultiPlayer", "mp", 10)!;
  mp._x = 10;
  mp._y = 10;
  for (let i = 0; i < 3; i++) p.tick();
  const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  p.render(ctx);
  writeFileSync(join(PREVIEW, "interfaces-multiplayer.png"), c.toBuffer("image/png"));
  expect(mp._width).toBeGreaterThan(100);
});
