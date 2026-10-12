// Promo video, step 2b (spawned by scripts/promo/edit.ts, as it loads @napi-rs/canvas): draws every 1920×1080 frame
// of the cut: the recorded game frames centred over a blurred copy of themselves, the wordmark and the address in the
// side bands, French captions, the opening title and the end card. Items overlap by `fade` frames (cross-fade).
//   bun scripts/promo/compose.ts <plan.json>
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
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

function text(c: SKRSContext2D, s: string, x: number, y: number, font: string, fill: string, align: CanvasTextAlign = "center") {
  c.font = font;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.lineJoin = "round";
  c.lineWidth = 8;
  c.strokeStyle = "rgba(0, 0, 0, 0.55)";
  c.strokeText(s, x, y);
  c.fillStyle = fill;
  c.fillText(s, x, y);
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
  c.drawImage(logo, (GX - 200) / 2, 36, 200, 109);
  text(c, "Classic", GX / 2, 172, "40px Della", "#f3d27a");
  text(c, "dofus-classic.com", W - GX / 2, H - 52, "21px VerdanaB", "#ffffff");
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
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(s, W / 2, y + h / 2 + 2);
  c.restore();
}

/** Opening title over the first shot. */
function title(c: SKRSContext2D, alpha: number) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = "rgba(0, 0, 0, 0.6)";
  c.fillRect(0, 0, W, H);
  c.drawImage(logo, (W - 539) / 2, 190, 539, 294);
  text(c, "Classic", W / 2, 540, "92px Della", "#f3d27a");
  text(c, "La bêta de Dofus du 13 janvier 2004", W / 2, 680, "60px VerdanaB", "#ffffff");
  text(c, "de retour, jouable dans votre navigateur", W / 2, 770, "46px VerdanaB", "#ffb347");
  c.restore();
}

function endCard(c: SKRSContext2D) {
  const k = Math.max(W / 742, H / 550);
  c.drawImage(sky, (W - 742 * k) / 2, H - 550 * k, 742 * k, 550 * k);
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(0, 10, 30, 0.35)");
  g.addColorStop(1, "rgba(0, 10, 30, 0.8)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.drawImage(logo, (W - 462) / 2, 90, 462, 252);
  text(c, "Classic", W / 2, 390, "80px Della", "#f3d27a");
  text(c, "Jouez gratuitement, sans téléchargement", W / 2, 540, "50px VerdanaB", "#ffffff");
  text(c, "dofus-classic.com", W / 2, 660, "104px VerdanaB", "#ffb347");
  text(c, "Projet de fans non officiel et à but non lucratif, ni affilié à Ankama ni approuvé par Ankama.", W / 2, 930, "26px Verdana", "#e8eef8");
  text(c, "DOFUS et Ankama sont des marques d'Ankama. Contenus DOFUS © 2003-2026 Ankama.", W / 2, 972, "26px Verdana", "#e8eef8");
}

/** Item `it` at its local frame `i`, drawn on `c`. */
async function drawItem(c: SKRSContext2D, it: Plan["items"][number], i: number) {
  if ("card" in it) return endCard(c);
  const [z0, z1 = z0] = it.zoom ?? [], e = ease(i / it.length), s = e * e * (3 - 2 * e);
  drawGame(c, await gameFrame(Math.round(it.from + i * (it.speed ?? 1))), z0 && z1 && z0.map((v, j) => v + (z1[j]! - v) * s));
  if (it.caption) caption(c, it.caption, envelope(i, 6, it.length - 6), it.low);
  if (it.title) title(c, envelope(i, -8, it.length - 4, 12));
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
