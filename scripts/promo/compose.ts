// Promo video, step 2b (spawned by scripts/promo/edit.ts, as it loads @napi-rs/canvas): draws every 1920×1080 frame
// of the cut: the recorded game frames centred over a blurred copy of themselves, the wordmark and the address in the
// side bands, French captions, the opening title and the end card. Items overlap by `fade` frames (cross-fade).
//   bun scripts/promo/compose.ts <plan.json>
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Canvas, createCanvas, GlobalFonts, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { Plan } from "./edit.ts";

const ROOT = join(import.meta.dir, "../..");
const W = 1920, H = 1080, GW = Math.round((H * 742) / 550), GX = Math.round((W - GW) / 2);
GlobalFonts.registerFromPath(join(ROOT, "web/public/site/fonts/DellaRespira-Regular.ttf"), "Della");
GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media/fonts/Verdana-bold-a1ed6d4e.ttf"), "VerdanaB");
GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media/fonts/Verdana-c2158db2.ttf"), "Verdana");

const plan = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Plan;
rmSync(plan.frames, { recursive: true, force: true });
mkdirSync(plan.frames, { recursive: true });
const logo = await loadImage(join(ROOT, "web/public/site/logo.png")), sky = await loadImage(join(ROOT, "web/public/site/sky.jpg"));
const canvas = createCanvas(W, H), ctx = canvas.getContext("2d");
const layer = createCanvas(W, H), lctx = layer.getContext("2d");
const tiny = createCanvas(48, 27), tctx = tiny.getContext("2d");
const scratch = createCanvas(W, H), sctx = scratch.getContext("2d");

/** The recorded frame of `tick`, or the closest earlier one (the camera writes nothing while it does not record). */
async function gameFrame(tick: number): Promise<Image> {
  for (let t = tick; t > 0; t--) {
    const f = join(plan.take, `${String(t).padStart(6, "0")}.jpg`);
    if (existsSync(f)) return loadImage(f);
  }
  throw new Error(`no frame at or before tick ${tick}`);
}

const ease = (k: number) => Math.max(0, Math.min(1, k));
/** 0 → 1 over `n` frames from `a`, 1 → 0 over `n` frames up to `b`. */
const envelope = (i: number, a: number, b: number, n = 8) => ease(Math.min((i - a) / n, (b - i) / n));
/** Progress (ease-out) of an element entering at frame `at` over `dur` frames; `back`: overshoots a little. */
const enter = (i: number, at: number, dur = 18, back = false) => {
  const k = ease((i - at) / dur) - 1;
  return back ? 1 + 2.7 * k ** 3 + 1.7 * k ** 2 : 1 + k ** 3;
};
const GOLD = ["#fff4cf", "#f3cf76", "#b98227"];

function shadow(c: SKRSContext2D, blur = 18, color = "rgba(0, 0, 0, 0.7)", dy = 3) {
  c.shadowColor = color;
  c.shadowBlur = blur;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = dy;
}
/** Text centred on (x, y) (its ink, not its em box) with `track` em of letter spacing; `fill` a colour, or "gold"
 *  (vertical gradient). */
function tracked(c: SKRSContext2D, s: string, x: number, y: number, font: string, size: number, track: number, fill: string) {
  c.font = `${size}px ${font}`;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  const m = c.measureText(s);
  y += (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  const ws = [...s].map((ch) => c.measureText(ch).width);
  let at = x - (ws.reduce((a, b) => a + b, 0) + track * size * (ws.length - 1)) / 2;
  if (fill == "gold") {
    const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    GOLD.forEach((col, j) => g.addColorStop(j / 2, col));
    c.fillStyle = g;
  } else c.fillStyle = fill;
  [...s].forEach((ch, j) => (c.fillText(ch, at, y), (at += ws[j]! + track * size)));
}

/** Recorded frame (its `zoom` part: stage x, y, width) + blurred fill + side bands. */
function drawGame(c: SKRSContext2D, img: Image, zoom = [0, 0, 742]) {
  tctx.drawImage(img, 0, 0, 48, 27);
  c.imageSmoothingQuality = "high";
  c.drawImage(tiny, 0, 0, W, H);
  c.fillStyle = "rgba(4, 14, 34, 0.55)";
  c.fillRect(0, 0, W, H);
  const k = img.width / 742, [zx, zy, zw] = zoom as [number, number, number];
  c.drawImage(img, zx * k, zy * k, zw * k, ((zw * 550) / 742) * k, GX, 0, GW, H);
  c.save();
  shadow(c, 12);
  c.drawImage(logo, (GX - 200) / 2, 36, 200, 109);
  tracked(c, "CLASSIC", GX / 2, 168, "Della", 26, 0.3, "gold");
  tracked(c, "dofus-classic.com", W - GX / 2, H - 52, "VerdanaB", 21, 0, "#ffffff");
  c.restore();
}

/** A caption pill over the top (or the bottom) of the game. */
function caption(c: SKRSContext2D, s: string, alpha: number, low = false) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = "44px VerdanaB";
  const w = c.measureText(s).width + 64, h = 84, x = (W - w) / 2, y = low ? H - h - 30 : 30;
  c.beginPath();
  c.roundRect(x, y, w, h, 22);
  c.fillStyle = "rgba(8, 32, 72, 0.86)";
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = "#ff7a00";
  c.stroke();
  tracked(c, s, W / 2, y + h / 2, "VerdanaB", 44, 0, "#fff");
  c.restore();
}

/** Darkens the edges (and, by `dim`, everything) so the centre reads. */
function vignette(c: SKRSContext2D, alpha: number, dim = 0.35) {
  const g = c.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 1150);
  g.addColorStop(0, `rgba(4, 10, 26, ${dim * alpha})`);
  g.addColorStop(1, `rgba(4, 10, 26, ${0.94 * alpha})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Logo, "CLASSIC" and the ornament under it, centred at `y` (logo top), each entering from its frame. */
function brand(c: SKRSContext2D, i: number, y: number, at: [number, number, number]) {
  const [kl, kc, ko] = [enter(i, at[0], 20), enter(i, at[1]), enter(i, at[2], 20)];
  c.save();
  c.globalAlpha = kl;
  shadow(c, 46, "rgba(255, 196, 90, 0.5)", 0);
  const s = 2.3 * (0.9 + 0.1 * kl), lw = 154 * s, lh = 84 * s;
  c.drawImage(logo, (W - lw) / 2, y + (1 - kl) * 24 + (193 - lh) / 2, lw, lh);
  c.globalAlpha = kc;
  shadow(c, 20, "rgba(0, 0, 0, 0.75)", 3);
  tracked(c, "CLASSIC", W / 2, y + 240, "Della", 66, 0.34 + 0.4 * (1 - kc), "gold");
  // ornament: two hairlines growing from a small diamond
  c.globalAlpha = ko;
  shadow(c, 0, "transparent", 0);
  for (const side of [-1, 1]) {
    const g = c.createLinearGradient(W / 2 + side * 26, 0, W / 2 + side * (26 + 250 * ko), 0);
    g.addColorStop(0, GOLD[1]!);
    g.addColorStop(1, "rgba(243, 207, 118, 0)");
    c.fillStyle = g;
    c.fillRect(Math.min(W / 2 + side * 26, W / 2 + side * (26 + 250 * ko)), y + 300, 250 * ko, 2);
  }
  c.translate(W / 2, y + 301);
  c.rotate(Math.PI / 4);
  c.fillStyle = GOLD[1]!;
  c.fillRect(-6, -6, 12, 12);
  c.restore();
}

/** Opening title over the first shot (`i` of `n` frames): the footage (`src`, what `c` draws on) out of focus behind it,
 *  back in focus as the title leaves. */
function title(c: SKRSContext2D, src: Canvas, i: number, n: number) {
  const out = ease((n - i) / 14), k = ease((i + 6) / 10) * out;
  sctx.drawImage(src, 0, 0);
  c.filter = `blur(${18 * k}px)`;
  c.drawImage(scratch, 0, 0);
  c.filter = "none";
  vignette(c, k, 0.55);
  c.save();
  c.globalAlpha = out;
  brand(c, i, 190, [2, 12, 22]);
  for (const [s, size, font, colour, at, y, track] of [
    ["La bêta de 2004", 62, "VerdanaB", "#ffffff", 30, 600, 0.02],
    ["rejouable dans votre navigateur", 34, "Verdana", "#ffd79a", 40, 672, 0.12],
  ] as const) {
    const k = enter(i, at);
    c.save();
    c.globalAlpha = out * k;
    shadow(c, 22);
    tracked(c, s, W / 2, y + (1 - k) * 22, font, size, track, colour);
    c.restore();
  }
  c.restore();
}

/** End card over the blurred, darkened footage from tick `from` (or the sky backdrop). */
async function endCard(c: SKRSContext2D, i: number, from?: number) {
  if (from) {
    const h = ((W + 120) * 550) / 742;
    c.filter = "blur(22px)";
    c.drawImage(await gameFrame(from + i), -60, (H - h) / 2, W + 120, h);
    c.filter = "none";
  } else {
    const k = Math.max(W / 742, H / 550);
    c.drawImage(sky, (W - 742 * k) / 2, H - 550 * k, 742 * k, 550 * k);
  }
  c.fillStyle = "rgba(6, 14, 32, 0.55)";
  c.fillRect(0, 0, W, H);
  vignette(c, 1, 0.25);
  brand(c, i, 110, [0, 8, 16]);
  c.save();
  const k1 = enter(i, 22);
  c.globalAlpha = k1;
  shadow(c, 18);
  tracked(c, "Jouez gratuitement, sans téléchargement", W / 2, 520 + (1 - k1) * 18, "Verdana", 40, 0.03, "#ffffff");
  // the address as one of the game's orange buttons, popping in, its glow breathing
  const kb = enter(i, 32, 16, true), bw = 860, bh = 128, glow = 0.45 + 0.15 * Math.sin(i / 9);
  c.globalAlpha = ease((i - 32) / 6);
  c.translate(W / 2, 668);
  c.scale(0.8 + 0.2 * kb, 0.8 + 0.2 * kb);
  shadow(c, 50, `rgba(255, 140, 30, ${glow})`, 0);
  const g = c.createLinearGradient(0, -bh / 2, 0, bh / 2);
  g.addColorStop(0, "#ffb247");
  g.addColorStop(0.5, "#ff8a1f");
  g.addColorStop(1, "#e2560b");
  c.beginPath();
  c.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  c.fillStyle = g;
  c.fill();
  shadow(c, 0, "transparent", 0);
  c.lineWidth = 3;
  c.strokeStyle = "rgba(255, 230, 180, 0.9)";
  c.stroke();
  c.beginPath(); // the gloss of the game's buttons
  c.roundRect(-bw / 2 + 18, -bh / 2 + 9, bw - 36, bh * 0.36, bh * 0.18);
  c.fillStyle = "rgba(255, 255, 255, 0.22)";
  c.fill();
  shadow(c, 8, "rgba(120, 40, 0, 0.6)", 2);
  tracked(c, "dofus-classic.com", 0, 0, "VerdanaB", 68, 0.01, "#ffffff");
  c.restore();
  c.save();
  c.globalAlpha = 0.62 * ease((i - 48) / 16);
  tracked(c, "Projet de fans non officiel et à but non lucratif, ni affilié à Ankama ni approuvé par Ankama.", W / 2, 968, "Verdana", 21, 0.01, "#ffffff");
  tracked(c, "DOFUS et Ankama sont des marques d'Ankama. Contenus DOFUS © 2003-2026 Ankama.", W / 2, 1002, "Verdana", 21, 0.01, "#ffffff");
  c.restore();
}

/** Item `it` at its local frame `i`, drawn on `c`. */
async function drawItem(c: SKRSContext2D, it: Plan["items"][number], i: number) {
  if ("card" in it) return endCard(c, i, it.from);
  const [z0, z1 = z0] = it.zoom ?? [], e = ease(i / it.length), s = e * e * (3 - 2 * e);
  drawGame(c, await gameFrame(Math.round(it.from + i * (it.speed ?? 1))), z0 && z1 && z0.map((v, j) => v + (z1[j]! - v) * s));
  if (it.caption) caption(c, it.caption, envelope(i, 6, it.length - 6), it.low);
  if (it.title) title(c, c == ctx ? canvas : layer, i, it.length);
}

const total = plan.items.at(-1)!.start + plan.items.at(-1)!.length;
for (let n = 0; n < total; n++) {
  const on = plan.items.filter((it) => it.start <= n && n < it.start + it.length);
  await drawItem(ctx, on[0]!, n - on[0]!.start);
  if (on[1]) {
    // cross-fade: the next item over the end of this one
    await drawItem(lctx, on[1], n - on[1].start);
    ctx.globalAlpha = (n - on[1].start + 1) / (plan.fade + 1);
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
  }
  const last = plan.items.at(-1)!;
  if (n >= total - plan.fade && "card" in last) {
    // fade to black at the very end
    ctx.fillStyle = `rgba(0, 0, 0, ${(n - (total - plan.fade) + 1) / plan.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  writeFileSync(join(plan.frames, `${String(n).padStart(5, "0")}.jpg`), canvas.toBuffer("image/jpeg", 95));
  if (n % 300 == 0) console.log(`compose: ${n}/${total}`);
}
