// Promo video, step 2: cuts the take of scripts/promo/record.ts into OUT/dofus-classic-promo.mp4 (1920×1080, 30 fps,
// H.264 High + AAC, for X): compose.ts draws the frames, the sound is the beta's fight music under the game's own sounds
// (the camera's sound log, each placed where its tick lands in the cut).
//   bun scripts/promo/edit.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** `zoom`: the part of the stage shown, [x, y, width] in stage units (742×550); two entries: from the first to the second.
 *  `low`: the caption at the bottom. */
export type Shot =
  | { from: number; to: number; speed?: number; caption?: string; low?: boolean; title?: boolean; zoom?: [number, number, number][] }
  | { card: "end"; frames: number; from?: number }; // `from`: the footage blurred behind the end card
export type Item = Shot & { start: number; length: number };
export type Plan = { take: string; frames: string; fade: number; items: Item[] };

const FPS = 30, FADE = 10, RATE = 48000;
const OUT = join(import.meta.dir, "../../web/public/assets/port-preview/promo"), TAKE = join(OUT, "take"); // record.ts
const MUSIC = join(import.meta.dir, "../../web/public/assets/media/music/11.mp3"); // the fastest of the fight tracks

/** The cut, in the camera's ticks (steps.jsonl gives each step's range). */
const CUT: Shot[] = [
  { from: 1640, to: 1760, title: true }, // a wheat field, Ioptimiste and Sadidou walking
  { from: 190, to: 340, speed: 2, caption: "Les 10 classes d'origine" }, // Féca, Crâ, Ecaflip, Iop
  { from: 560, to: 640, speed: 1.5 }, // the name, then the character list
  { from: 700, to: 850, speed: 1.5, caption: "Retrouvez tout le monde au village" },
  { from: 850, to: 960, zoom: [[70, 100, 480]] }, // "Quelle nostalgie, cette bêta !", a smiley, walks
  { from: 1000, to: 1110, zoom: [[40, 40, 520]] }, // "Bienvenue en 2004 !", "Qui vient explorer Amakna avec moi ?"
  { from: 1120, to: 1480, speed: 2.5, caption: "Explorez 90 cartes d'Amakna" },
  { from: 1490, to: 1610, speed: 2 }, // Sadidou follows
  { from: 1895, to: 1960, speed: 1.5 }, // the menu: « Aller aux combats »
  { from: 2040, to: 2110, caption: "Le salon : chat, amis, parties", zoom: [[0, 280, 360]] }, // "Qui est partant pour un duel ?"
  { from: 2110, to: 2290, speed: 2, caption: "Créez une partie et défiez vos amis" },
  { from: 2350, to: 2490, speed: 2.5 }, // Flechette joins, start
  { from: 2490, to: 2575, caption: "Combats tactiques au tour par tour" }, // placement on the bridge map
  { from: 2630, to: 2700, zoom: [[100, 0, 540]] }, // Bond onto the bridge
  { from: 3305, to: 3365, zoom: [[150, 100, 480]] }, // an arrow
  { from: 3535, to: 3590, zoom: [[150, 100, 480]] }, // Pression
  { from: 3865, to: 4070, speed: 2, zoom: [[270, 130, 420]] }, // critical hits
  { from: 4680, to: 4760, zoom: [[270, 130, 420], [0, 0, 742]] }, // the last blow, a new item
  { from: 4760, to: 4864, caption: "Victoire… et un objet en butin !", low: true },
  { card: "end", frames: 165, from: 700 },
];

const items: Item[] = [];
for (const s of CUT) {
  const length = "card" in s ? s.frames : Math.ceil((s.to - s.from) / (s.speed ?? 1));
  const prev = items.at(-1);
  items.push({ ...s, start: prev ? prev.start + prev.length - FADE : 0, length });
}
const total = items.at(-1)!.start + items.at(-1)!.length;
const plan: Plan = { take: TAKE, frames: join(OUT, "frames"), fade: FADE, items };
writeFileSync(join(OUT, "plan.json"), JSON.stringify(plan, null, 1));

// ---- sound ----------------------------------------------------------------------------------------------------------
const decoded = new Map<string, Float32Array>();
/** Interleaved stereo float samples at RATE. */
function decode(file: string) {
  if (!decoded.has(file)) {
    const r = Bun.spawnSync(["ffmpeg", "-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-"]);
    if (r.exitCode != 0) throw new Error(`ffmpeg decode ${file}: ${r.stderr.toString()}`);
    decoded.set(file, new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4));
  }
  return decoded.get(file)!;
}
const mix = new Float32Array(Math.ceil((total / FPS) * RATE) * 2);
/** Add `pcm` (looped `loops` times, cut after `max` samples per channel) at `at` seconds with `gain`. */
function add(pcm: Float32Array, at: number, gain: number, loops = 1, max = Infinity) {
  const o = Math.round(at * RATE) * 2, n = Math.min(max * 2, pcm.length * loops, mix.length - o);
  for (let i = 0; i < n; i++) mix[o + i]! += pcm[i % pcm.length]! * gain;
}

// the music bed, faded in and out
const music = decode(MUSIC);
add(music, 0, 0.5, Math.ceil(mix.length / music.length));
for (let i = 0; i < mix.length; i += 2) {
  const t = i / 2 / RATE, k = Math.min(1, t / 0.5, (total / FPS - t) / 2.5);
  mix[i]! *= Math.max(0, k), mix[i + 1]! *= Math.max(0, k);
}

// the game's sounds where they fall in the cut (music excluded: the bed replaces it)
type Ev = { tick: number; id: number; play?: string; loops?: number; volume?: number; stop?: boolean };
const events = readFileSync(join(TAKE, "sounds.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Ev);
let placed = 0;
for (const e of events) {
  if (!e.play || e.play.includes("/music/")) continue;
  const vol = events.filter((v) => v.id == e.id && v.volume != undefined && v.tick <= e.tick + 1).at(-1)?.volume ?? 100;
  const stop = events.find((v) => v.id == e.id && v.stop)?.tick;
  for (const it of items) {
    if ("card" in it || e.tick < it.from || e.tick >= it.to) continue;
    const speed = it.speed ?? 1, at = (it.start + (e.tick - it.from) / speed) / FPS;
    add(decode(e.play), at, 0.9 * (vol / 100), Math.min(e.loops ?? 1, 20), stop ? Math.round(((stop - e.tick) / FPS / speed) * RATE) : Infinity);
    placed++;
  }
}
// peak-normalise to -1 dBFS, 16-bit WAV
let peak = 0;
for (const v of mix) peak = Math.max(peak, Math.abs(v));
const k = peak > 0 ? 0.89 / peak : 1, wav = Buffer.alloc(44 + mix.length * 2);
wav.write("RIFF", 0), wav.writeUInt32LE(36 + mix.length * 2, 4), wav.write("WAVEfmt ", 8), wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20), wav.writeUInt16LE(2, 22), wav.writeUInt32LE(RATE, 24), wav.writeUInt32LE(RATE * 4, 28);
wav.writeUInt16LE(4, 32), wav.writeUInt16LE(16, 34), wav.write("data", 36), wav.writeUInt32LE(mix.length * 2, 40);
for (let i = 0; i < mix.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i]! * k)) * 32767), 44 + i * 2);
writeFileSync(join(OUT, "audio.wav"), wav);
console.log(`sound: ${placed} game sounds placed, peak ${peak.toFixed(2)}`);

// ---- frames, then the MP4 ---------------------------------------------------------------------------------------------
const run = (cmd: string[]) => {
  const r = Bun.spawnSync(cmd, { stdout: "inherit", stderr: "inherit" });
  if (r.exitCode != 0) throw new Error(`${cmd[0]} failed`);
};
run(["bun", join(import.meta.dir, "compose.ts"), join(OUT, "plan.json")]);
const mp4 = join(OUT, "dofus-classic-promo.mp4");
run(["ffmpeg", "-v", "error", "-y", "-framerate", String(FPS), "-i", join(plan.frames, "%05d.jpg"), "-i", join(OUT, "audio.wav"),
  "-vf", "scale=in_range=pc:out_range=tv", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", String(FPS * 2),
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", mp4]);
console.log(`${mp4}: ${(total / FPS).toFixed(1)} s`);

// the landing page's copy (web/index.html), lighter, and its poster: the village, « Quelle nostalgie, cette bêta ! »
const SITE = join(import.meta.dir, "../../web/public/site");
run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(SITE, "promo.mp4")]);
run(["ffmpeg", "-v", "error", "-y", "-ss", String(380 / FPS), "-i", mp4, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", join(SITE, "promo.jpg")]);
