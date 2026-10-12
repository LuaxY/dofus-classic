// Video recorder for the camera bot (scripts/promo/record.ts): replaces the headless client's wall clock with a fixed
// step (`fps`), renders every tick at `scale` with a drawn mouse cursor, writes `<tick>.jpg` while `on`, and logs every
// sound the runtime plays (`sounds.jsonl`, in ticks) for the offline mix. Clicks are not teleports on video: the mouse
// glides to the target and dwells before the press; typing goes letter by letter.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import type { AudioBackend, Player } from "../runtime/player.ts";
import { ROOT, type Headless } from "./headless-client.ts";

const MEDIA = join(ROOT, "web/public/assets/media"), PUBLIC = join(ROOT, "web/public");

export function recorder(dir: string, fps = 30, scale = 2) {
  mkdirSync(dir, { recursive: true });
  const step = 1000 / fps, canvas = createCanvas(Math.round(742 * scale), Math.round(550 * scale));
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const sounds = JSON.parse(readFileSync(join(MEDIA, "sounds.json"), "utf8")) as Record<string, { file: string; duration: number }>;
  const ends: { tick: number; fn: () => void }[] = []; // sounds ending, and sleeps

  let p: Player, tick = 0, on = false, ids = 0, shown = { x: 371, y: 275 }, press = -99;
  const log = (o: object) => appendFileSync(join(dir, "sounds.jsonl"), JSON.stringify({ tick, ...o }) + "\n");

  /** One fixed step: advance, fire finished sounds, render + cursor, write the frame while recording. */
  function frame() {
    p.advance(step);
    tick++;
    for (const e of ends.filter((e) => e.tick <= tick)) ends.splice(ends.indexOf(e), 1), e.fn();
    shown = { x: shown.x + (p.mouseX - shown.x) * 0.35, y: shown.y + (p.mouseY - shown.y) * 0.35 };
    if (!on) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    p.render(ctx);
    cursor(ctx, shown.x, shown.y, tick - press);
    writeFileSync(join(dir, `${String(tick).padStart(6, "0")}.jpg`), canvas.toBuffer("image/jpeg", 92));
  }
  /** Move the mouse from where it is drawn to (x, y) over a few frames (hovers on the way), then stay `dwell` frames. */
  function glide(x: number, y: number, dwell: number) {
    const from = { ...shown }, n = Math.round(Math.min(16, Math.max(5, Math.hypot(x - from.x, y - from.y) / 22)));
    if (Math.hypot(x - from.x, y - from.y) > 3)
      for (let i = 1; i <= n; i++) {
        const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        p.mouseMove(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
        shown = { x: p.mouseX, y: p.mouseY };
        frame();
      }
    p.mouseMove(x, y);
    shown = { x, y };
    for (let i = 0; i < dwell; i++) frame();
  }

  const audio: AudioBackend = {
    play(key, o, onEnd) {
      const file = sounds[key]?.file ?? (key.startsWith("/") ? key.slice(1) : undefined);
      const path = file && (sounds[key] ? join(MEDIA, file) : join(PUBLIC, file));
      if (!path || !existsSync(path)) return undefined;
      const id = ids++, length = sounds[key]?.duration ?? 0; // music: always looped (BOUCLE_INFINIE), never ends
      log({ id, play: path, offset: o.offset, loops: o.loops, volume: o.volume });
      const end = { tick: tick + Math.ceil((Math.max(0, length - o.offset) + length * (o.loops - 1)) * fps), fn: onEnd };
      if (length && o.loops < 1000) ends.push(end);
      return {
        stop: () => (ends.includes(end) && ends.splice(ends.indexOf(end), 1), log({ id, stop: true })),
        setVolume: (v) => log({ id, volume: v }),
      };
    },
    load: async (url) => existsSync(join(PUBLIC, url)),
  };

  return {
    audio,
    get tick() {
      return tick;
    },
    /** Resolves once `ms` of runtime time has passed (the bot's waits and timeouts: the clock may be slower than the wall). */
    sleep: (ms: number) => new Promise<void>((fn) => void ends.push({ tick: tick + Math.max(1, Math.round(ms / step)), fn })),
    /** Start or stop writing frames (the clock runs either way). */
    record(v: boolean) {
      on = v;
    },
    /** The fixed-step clock, for Headless.boot's `clock`: one frame per step, scheduled on the wall clock, never skipped. */
    clock(player: Player) {
      p = player;
      let run = true;
      const t0 = performance.now(), start = tick;
      const loop = () => {
        if (!run) return;
        frame();
        setTimeout(loop, Math.max(0, t0 + (tick - start) * step - performance.now()));
      };
      setTimeout(loop, step);
      return () => (run = false);
    },
    /** Glide before every press and release; type letter by letter. */
    attach(h: Headless) {
      const down = p.mouseDown.bind(p), up = p.mouseUp.bind(p), type = h.type.bind(h);
      p.mouseDown = () => (glide(p.mouseX, p.mouseY, 5), (press = tick), down());
      p.mouseUp = () => (glide(p.mouseX, p.mouseY, 1), up());
      h.type = (label, tf, text) => {
        type(label, tf, "");
        const t = tf as { text: string; $broadcast(ev: string): void };
        for (let i = 1; i <= text.length; i++) {
          t.text = text.slice(0, i);
          t.$broadcast("onChanged");
          frame(), frame();
        }
      };
    },
  };
}

/** A white arrow with a dark outline at (x, y) stage units; a fading ring for `since` frames after a press. */
function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, since: number) {
  ctx.save();
  ctx.translate(x, y);
  if (since < 10) {
    ctx.beginPath();
    ctx.arc(0, 0, 4 + since * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 220, 90, ${1 - since / 10})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  for (const [px, py] of [[0, 0], [0, 15], [3.6, 11.6], [6.2, 17.4], [8.6, 16.4], [6, 10.8], [11, 10.8]] as const) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.2;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
