// Headless client: boots the real Player exactly like main.ts (boot() with AKSClient.swf, Interfaces.swf, Sound.swf)
// on @napi-rs/canvas, and acts only through the runtime's input path (mouse over a visible point of a clip, press,
// release; typing into a focused input field like the DOM editor does; key presses). Shared by the replay test (fast clock)
// and the playtest bots (web/src/dev/bot.ts, real-time clock against the Rust server).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, Path2D } from "@napi-rs/canvas";
import type { LangData } from "../core/lang.ts";
import { parseServerMessage } from "../core/protocol.ts";
import { drawNode } from "../runtime/object.ts";
import { Button, DisplayObject, MovieClip, type Player, TextField } from "../runtime/player.ts";
import { NO_CX, type SwfLoader } from "../swf/render.ts";
import { G } from "../game/globals.ts";
import { Cell } from "../game/battlefield/interaction.ts";
import { boot } from "../game/kernel/boot.ts";
import { langSource } from "../game/kernel/kernel.ts";
import { Sequencer } from "../game/kernel/sequencer.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
export const ROOT = join(import.meta.dir, "../../..");
const SWF = join(ROOT, "web/public/assets/swf"), LANG = join(ROOT, "web/public/lang/fr.json");
for (const f of ["fonts/Verdana-c2158db2.ttf", "fonts/Verdana-bold-a1ed6d4e.ttf", "fonts/bitMini6-477eb65d.ttf"])
  GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media", f));

/** Known noise, not a bug: the beta's map preview images (files/maps/<id>.swf) are lost (docs/BRIEF.md). */
const NOISE = /loadMovie\(http:\/\/jouer\.dofus\.com\/files\/maps\//;

export class Headless {
  readonly notes: string[] = [];
  /** What the runtime logged through console.error (handler exceptions, Player.safe). */
  readonly errors: string[] = [];
  /** What each timed-out sequencer action was; `inGame` false when it fired outside a running game (a sprite already
   *  cleared by a screen change: the sequencer's own safety net, nothing visible). */
  readonly timeoutNotes: { note: string; inGame: boolean }[] = [];
  /** Frames sent / received on the WebSocket, in order (recorded under the client, never altered). */
  readonly sent: string[] = [];
  readonly received: string[] = [];
  /** Received frames the client's parser drops (parseServerMessage → undefined, in the context of their arrival). */
  readonly unparsed: string[] = [];
  /** Sequencer timeouts so far (an awaited animation never called end()). */
  get timeouts() {
    return this.timeoutNotes.length;
  }
  private shotCount = 0;
  private stopClock: (() => void) | undefined;
  private restore: () => void;

  private constructor(readonly p: Player, readonly realTime: boolean, readonly shotDir: string | undefined) {
    const warn = console.warn, error = console.error;
    console.error = (...a: unknown[]) => void this.errors.push(a.map((x) => (x instanceof Error ? (x.stack ?? x.message) : String(x))).join(" "));
    console.warn = (...a: unknown[]) => {
      if (a[0] !== "TIMEOUT !!!" && !NOISE.test(String(a[0]))) warn(...a); // timeouts: recorded below
    };
    const timedOut = Sequencer.prototype.onActionTimeOut, rm = DisplayObject.prototype.$remove;
    this.restore = () => {
      console.warn = warn;
      console.error = error;
      Sequencer.prototype.onActionTimeOut = timedOut;
      DisplayObject.prototype.$remove = rm;
    };
    const trace = process.env.DOFUS_TRACE_REMOVE; // debug: log a stack when a clip whose name matches is removed
    if (trace) {
      DisplayObject.prototype.$remove = function (this: DisplayObject) {
        if (new RegExp(trace).test(this._name) && !this.$.removed) console.log(`REMOVE ${String(this)} depth ${this.$.depth}\n${new Error().stack}`);
        rm.call(this);
      };
    }
    // observe (not alter) sequencer timeouts: which awaited action never called end()
    const notes = this.timeoutNotes, received = () => this.received;
    Sequencer.prototype.onActionTimeOut = function (this: Sequencer, id: unknown) {
      const a = this.actions[0], o = a?.object as { sprite?: MovieClip; data?: { dir?: unknown; anim?: unknown } } | undefined;
      const clip = o?.sprite?.clip as MovieClip | undefined, kid = clip?.$.children.find((c) => c.$.depth === -16383) as MovieClip | undefined;
      const state = clip ? ` [dir ${String(o?.data?.dir)}, clip frame ${clip._currentframe}${clip.$.removed ? " removed" : ""}, anim clip ${kid ? `${kid._currentframe}/${kid._totalframes} ${kid.$.playing ? "playing" : "stopped"}` : "none"}, sprite ${String(o?.sprite)}${o?.sprite?.$.removed ? " removed" : ""}]` : "";
      const note = `${a?.fn?.name ?? "?"}(${(a?.parameters ?? []).map((x) => String(x).slice(0, 30)).join(", ")}) on ${String(a?.object).slice(0, 80)}${state}, after ${received().slice(-3).join(" | ").slice(0, 200)}`;
      notes.push({ note, inGame: !!G.DATACENTER?.Game.isRunning });
      timedOut.call(this, id);
    };
    if (realTime) {
      let last = performance.now(), on = true;
      const loop = () => {
        if (!on) return;
        const t = performance.now();
        p.advance(Math.min(250, t - last));
        last = t;
        setTimeout(loop, 16);
      };
      setTimeout(loop, 16);
      this.stopClock = () => (on = false);
    }
  }

  /**
   * Boot like main.ts. `realTime`: the runtime clock follows the wall clock (as requestAnimationFrame would);
   * otherwise `run(ms)` advances it as fast as file loads allow (replay test). `shotDir`: where `shot()` writes PNGs.
   * `wrap`: wraps the file loader (the replay test holds a file back to see the boot loading bar).
   */
  static async boot(o: { serverURL: string; realTime?: boolean; shotDir?: string; wrap?: (l: SwfLoader) => SwfLoader }): Promise<Headless> {
    if (o.shotDir) mkdirSync(o.shotDir, { recursive: true });
    langSource.load = async () => (existsSync(LANG) ? (JSON.parse(readFileSync(LANG, "utf8")) as LangData) : {});
    const rec = { sent: [] as string[], received: [] as string[], unparsed: [] as string[] };
    const Real = globalThis.WebSocket;
    // Record the wire under the client: same object, same behaviour, only observed.
    if (!o.serverURL.startsWith("replay:")) {
      const Rec = function (url: string | URL, protocols?: string | string[]) {
        const ws = new Real(url, protocols), send = ws.send.bind(ws);
        ws.send = (d: string | ArrayBufferLike | Blob | ArrayBufferView) => (rec.sent.push(String(d)), send(d));
        ws.addEventListener("message", (e) => {
          const raw = String(e.data);
          rec.received.push(raw);
          // registered before connection.ts's onmessage: same parse context as the client's own parse of this frame
          if (!parseServerMessage(raw, { login: G.AKS?.m_login, isMultiplayer: G.DATACENTER?.Game.isMultiplayer })) rec.unparsed.push(raw);
        });
        return ws;
      };
      Object.setPrototypeOf(Rec, Real);
      (globalThis as { WebSocket: unknown }).WebSocket = Rec;
    }
    const files: SwfLoader = { json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")), image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource };
    const p = await boot({
      loader: o.wrap?.(files) ?? files,
      createCanvas: (w, h) => createCanvas(w, h),
      serverURL: o.serverURL,
    });
    const h = new Headless(p, !!o.realTime, o.shotDir);
    Object.assign(h, rec);
    return h;
  }

  close() {
    this.stopClock?.();
    this.restore();
  }

  /** Let `ms` of runtime time pass (fast clock: in 40 ms frames, letting file loads resolve between them). */
  async run(ms: number) {
    if (this.realTime) return void (await new Promise((r) => setTimeout(r, ms)));
    for (let t = 0; t < ms; t += 40) {
      await new Promise((r) => setTimeout(r, 0));
      this.p.advance(40);
    }
  }
  /** Wait until `ok()`; false (and a TIMEOUT note) after `maxMs`. */
  async until(what: string, ok: () => unknown, maxMs = 15000) {
    const step = this.realTime ? 50 : 40;
    for (let t = 0; t < maxMs && !ok(); t += step) await this.run(step);
    if (!ok()) this.notes.push(`TIMEOUT waiting for ${what}`);
    return !!ok();
  }
  /** Like `until`, but a timeout throws. */
  async need(what: string, ok: () => unknown, maxMs = 15000) {
    if (!(await this.until(what, ok, maxMs))) throw new Error(`timeout (${maxMs} ms) waiting for ${what}`);
  }

  /** Stage centre of a display object's bounds. */
  centre(o: DisplayObject) {
    const b = o.getBounds(this.p.root);
    return { x: (b.xMin + b.xMax) / 2, y: (b.yMin + b.yMax) / 2 };
  }
  /**
   * A player's click on `o`: mouse over it, press, release. The runtime's mouse target must be `o` or inside it. Without
   * an explicit point the mouse aims at the centre, then (hollow or partly covered shapes) at the first point of a
   * 9×9 grid over the bounds that lands on `o`, as a player aims at the visible part.
   */
  click(label: string, o: DisplayObject | undefined, at?: { x: number; y: number }) {
    if (!o) throw new Error(`${label}: nothing to click`);
    const c = at ?? this.aim(o);
    this.p.mouseMove(c.x, c.y);
    if (!inside(this.p.target(), o))
      throw new Error(`${label}: the mouse at ${c.x | 0},${c.y | 0} lands on ${String(this.p.target())}, not ${String(o)}\n${this.dump(o, 2)}`);
    this.p.mouseDown();
    this.p.mouseUp();
    this.notes.push(`${label}: click`);
  }
  private aim(o: DisplayObject) {
    const c = this.centre(o), b = o.getBounds(this.p.root);
    this.p.mouseMove(c.x, c.y);
    if (inside(this.p.target(), o)) return c;
    for (let i = 1; i < 10; i++)
      for (let j = 1; j < 10; j++) {
        const pt = { x: b.xMin + ((b.xMax - b.xMin) * i) / 10, y: b.yMin + ((b.yMax - b.yMin) * j) / 10 };
        this.p.mouseMove(pt.x, pt.y);
        if (inside(this.p.target(), o)) return pt;
      }
    return c;
  }
  /** Click an input field, then what the DOM editor does on input (text, bound variable, onChanged). */
  type(label: string, tf: unknown, text: string) {
    if (!(tf instanceof TextField)) throw new Error(`${label}: no input field`);
    const c = this.centre(tf);
    this.p.mouseMove(c.x, c.y);
    this.p.mouseDown();
    const afterDown = String(this.p.focus);
    this.p.mouseUp();
    if (this.p.focus !== tf) {
      this.notes.push(`${label}: focus after mouseDown ${afterDown}`);
      const over: string[] = [];
      const walk = (o: DisplayObject) => {
        if (o.$.removed || !o._visible) return;
        if (o instanceof TextField && o.$hitGlobal(c.x, c.y)) over.push(`${String(o)} (${o.type}${o.selectable ? ", selectable" : ""}) "${o.text.slice(0, 30)}"`);
        if (o instanceof MovieClip) for (const k of o.$.children) walk(k);
      };
      walk(this.p.root);
      throw new Error(`${label}: focus is on ${String(this.p.focus)}, the mouse on ${String(this.p.target())}; text fields there: ${over.join("; ")}`);
    }
    tf.text = text;
    tf.$broadcast("onChanged");
  }
  /** A key press and release (Flash key code, ASCII). */
  key(code: number, ascii = 0) {
    this.p.keyDown(code, ascii);
    this.p.keyUp(code, ascii);
  }
  /** Interaction cell `n` of the battlefield (Interaction.addCell). */
  cell(n: number) {
    return (G.BATTLEFIELD.Container.Interaction.layer0 as MovieClip)["cell" + n] as MovieClip | undefined;
  }
  /** A cell click: the mouse rolls over the cell first (path / area preview), then press and release. */
  clickCell(label: string, n: number) {
    this.hoverCell(n);
    this.p.mouseDown();
    this.p.mouseUp();
    this.notes.push(`${label}: click on cell ${n}`);
  }
  /**
   * Put the mouse on cell `n`: its centre, or (a character or object standing on a cell in front covers it) another
   * point of its diamond that reaches the cell — a cell clip, or a sprite forwarding to its own cell (Character.as /
   * Object.as setInteraction), as a player aims at the visible part. Throws when no point of the diamond reaches it.
   */
  hoverCell(n: number) {
    const c = this.cell(n);
    if (!c) throw new Error(`no cell ${n}`);
    const at = c.localToGlobal({ x: 0, y: 0 }), k = G.BATTLEFIELD.Container._xscale / 100;
    for (const [dx, dy] of [[0, 0], [-12, 0], [12, 0], [0, -6], [0, 6], [-20, 0], [20, 0], [-8, -4], [8, -4], [-8, 4], [8, 4]] as const) {
      this.p.mouseMove(at.x + dx * k, at.y + dy * k);
      if (this.cellUnderMouse() == n) return;
    }
    this.p.mouseMove(at.x, at.y);
    if (this.cellUnderMouse() !== undefined) throw new Error(`cell ${n} is covered: the mouse reaches cell ${String(this.cellUnderMouse())}`);
  }
  /** The cell a click at the mouse position reaches (undefined: none, or not a battlefield clip). */
  cellUnderMouse(): number | undefined {
    for (let t: DisplayObject | undefined = this.p.target(); t; t = t._parent) {
      if (t instanceof Cell) return t.num;
      const fwd = (t as unknown as { obj?: { data?: { cell?: unknown; cellNum?: unknown } } }).obj?.data;
      if (fwd) return Number(fwd.cell ?? fwd.cellNum);
    }
    return undefined;
  }

  /** The whole stage, or with `bfOnly` only the BATTLEFIELD clip. Numbered when the client has a shot directory. */
  shot(name: string, bfOnly = false, dir = this.shotDir) {
    if (!dir) return "";
    const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    if (bfOnly) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 742, 550);
      drawNode(ctx, G.BATTLEFIELD, NO_CX);
    } else this.p.render(ctx);
    const file = join(dir, this.shotDir === dir ? `${String(++this.shotCount).padStart(3, "0")}-${name}.png` : name);
    writeFileSync(file, c.toBuffer("image/png"));
    return file;
  }

  /** Display-tree dump of `o` (path, class, depth, visibility, stage bounds, text), for discovering clip names. */
  dump(o: DisplayObject | undefined, depth = 3, pad = ""): string {
    if (!o) return pad + "(undefined)\n";
    const b = o.getBounds(this.p.root), cls = o.constructor.name;
    const txt = o instanceof TextField ? ` "${o.text.slice(0, 40)}"${o.type == "input" ? " [input]" : ""}` : "";
    let s = `${pad}${o._name || "?"} <${cls}> ${o._visible ? "" : "(hidden) "}[${b.xMin | 0},${b.yMin | 0} ${(b.xMax - b.xMin) | 0}x${(b.yMax - b.yMin) | 0}]${txt}\n`;
    if (depth > 0 && o instanceof MovieClip) for (const k of o.$.children) if (!k.$.removed) s += this.dump(k, depth - 1, pad + "  ");
    return s;
  }
}

export const inside = (t: DisplayObject | undefined, o: DisplayObject) => {
  for (let x = t; x; x = x._parent) if (x === o) return true;
  return false;
};
/** The Button (DefineButton2) inside a clip. */
export const buttonIn = (o: unknown) => (o as MovieClip | undefined)?.$.children.find((c) => c instanceof Button);
