// JPEXS reference renders of a representative sample, used to verify the vector renderer (assets-core).
// Usage: bun scripts/assets-media/reference.ts   -> decompiled/reference/*.png + index.json (see docs/assets-media.md)
import { $ } from "bun";
import { mkdirSync, rmSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { T, charId, exportsOf, readSwf, Reader } from "./swf.ts";

const ROOT = new URL("../../", import.meta.url).pathname;
const SRC = ROOT + "dofus-5b/";
const OUT = ROOT + "decompiled/reference/";
const WORK = OUT + ".work/";
const FFDEC = ROOT + "tools/ffdec.sh";
const HALF = 1000; // root frames are rendered on a stage widened to [-HALF, HALF] px, then cropped

type Kind = "sprite" | "button" | "shape" | "frame";
/** sym: characterId or linkage name (frame = main timeline, id 0). frames default: 4 spread over the timeline. */
type Sample = { swf: string; kind: Kind; sym?: number | string; frames?: number[] };
const sprites = (swf: string, syms: (number | string)[]) => syms.map((sym): Sample => ({ swf, kind: "sprite", sym }));
const root = (swf: string, frames = [1]): Sample => ({ swf, kind: "frame", frames });

const SAMPLES: Sample[] = [
  // Characters: animation symbols StaticR/WalkR/CastR, and main-timeline frames (labels StaticR=2, WalkR=29.., Podium=110).
  ...sprites("clips/sprites/10.swf", [63, 99, 147]), root("clips/sprites/10.swf", [2, 29, 30, 31, 110]),
  ...sprites("clips/sprites/1000.swf", [43, 77]), root("clips/sprites/1000.swf", [2, 28, 30]),
  // Spells: 101 vector only; 903 main sprite + "fumee" (DefineMorphShape); 305 "shoot" (DefineMorphShape + DefineBitsJPEG3).
  ...sprites("clips/spells/101.swf", [14]), ...sprites("clips/spells/903.swf", [15, "fumee"]), ...sprites("clips/spells/305.swf", ["shoot"]),
  // Ground tiles and objects by linkage name (mix of vector, bitmap-filled, animated, morph-shape users).
  ...sprites("clips/ground.swf", ["49", "57", "27", "455", "2", "61", "72", "500", "505", "119"]),
  ...sprites("clips/objects.swf", ["18", "418", "106", "545", "1041", "885", "23", "72", "463", "342"]),
  // Icons, items, guild artworks: whole SWF (main timeline frame 1).
  root("clips/spells/icons/23.swf"), root("clips/spells/icons/31.swf"), root("clips/spells/icons/122.swf"),
  root("clips/items/1/1.swf"), root("clips/items/5/1.swf"), root("clips/items/10/1.swf"),
  root("clips/guilds/artwork/big/50.swf"), root("clips/guilds/artwork/mini/10.swf"),
  { swf: "clips/sprites/1000.swf", kind: "shape", sym: 1 }, { swf: "clips/ccicon.swf", kind: "shape", sym: 1 }, { swf: "clips/items/1/1.swf", kind: "shape", sym: 1 },
  { swf: "clips/circle.swf", kind: "sprite", sym: 5, frames: [1, 2, 3, 4, 5, 6] }, ...sprites("clips/circle.swf", ["Mc_SelectionAnimate"]), root("clips/circle.swf"),
  // Interfaces: window skins, components, buttons (DefineButton2 states up/over/down = f1/f2/f3).
  ...sprites("modules/Interfaces.swf", ["Interface::Window", "Interface::WindowBox", "Interface::CheckBox", "SpellBar",
    "Ank::Dofus::PushButton", "Interface::BtnQuit", "dofus::graphics::gui::UICreateCharacter"]),
  { swf: "modules/Interfaces.swf", kind: "button", sym: "ButtonClose" }, { swf: "modules/Interfaces.swf", kind: "button", sym: 258 },
];

type Entry = {
  file: string; swf: string; kind: Kind; characterId: number; linkage: string | null; frame: number; state?: string;
  frameCount: number; size: [number, number]; origin: [number, number]; cropped?: true;
};
const BUTTON_STATES = ["up", "over", "down"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const index: Entry[] = [];

for (const swfPath of [...new Set(SAMPLES.map((s) => s.swf))]) {
  const bytes = new Uint8Array(await Bun.file(SRC + swfPath).arrayBuffer());
  const swf = readSwf(bytes);
  const exp = exportsOf(swf);
  const byName = new Map([...exp].reverse().map(([id, name]) => [name, id] as const));
  const frameCount = new Map(swf.tags.filter((t) => t.code === T.DefineSprite).map((t) => [charId(t), t.data[2]! | (t.data[3]! << 8)]));
  frameCount.set(0, swf.frameCount);
  const base = swfPath.replace(/\.swf$/, "").replaceAll("/", "-");
  const work = WORK + base + "/";
  const jobs = SAMPLES.filter((s) => s.swf === swfPath).map((s) => {
    const id = s.kind === "frame" ? 0 : typeof s.sym === "number" ? s.sym : byName.get(s.sym!);
    if (id === undefined) throw new Error(`${swfPath}: no symbol ${s.sym}`);
    const n = frameCount.get(id) ?? 1;
    const frames = s.kind === "button" ? [1, 2, 3] : s.frames ?? [...new Set([0, 1, 2, 3].map((k) => 1 + Math.round((k * (n - 1)) / 3)))];
    return { ...s, id, frames, n };
  });
  const name = (id: number) => (id === 0 ? "0" : exp.get(id)?.replace(/[^\w.-]+/g, "_") ?? String(id));

  // Symbols: JPEXS renders each on a canvas covering the union of all its frames; origin read from the SVG export.
  const symbols = jobs.filter((j) => j.kind !== "frame");
  if (symbols.length) {
    const select = symbols.filter((j) => j.kind === "sprite").map((j) => `${j.id}:${j.frames.join(",")}`).join(",");
    const args = ["-selectid", symbols.map((j) => j.id).join(","), ...(select ? ["-select", select] : [])];
    for (const fmt of ["png", "svg"])
      await $`${FFDEC} ${args} -format sprite:${fmt},button:${fmt},shape:${fmt} -export sprite,button,shape ${work + fmt} ${SRC + swfPath}`.quiet();
    const files = [...new Bun.Glob("**/*.{png,svg}").scanSync(work)];
    for (const j of symbols) {
      for (const f of j.frames) {
        // JPEXS layout (several item types): <fmt>/shapes/<id>.<fmt>, <fmt>/sprites/DefineSprite_<id>[_<linkage>]/<frame>.<fmt>,
        // <fmt>/buttons/DefineButton2_<id>[_<linkage>]/<n>_<state>.<fmt>
        const re = j.kind === "shape" ? new RegExp(`^(png|svg)/shapes/${j.id}\\.`)
          : new RegExp(`^(png|svg)/(sprites|buttons)/Define(Sprite|Button2)_${j.id}(_[^/]*)?/${f}(_${BUTTON_STATES[f - 1]})?\\.`);
        const png = files.find((p) => p.endsWith(".png") && re.test(p));
        const svg = files.find((p) => p.endsWith(".svg") && re.test(p));
        if (!png || !svg) throw new Error(`${swfPath}#${j.id} f${f}: JPEXS output missing`);
        const svgText = await Bun.file(work + svg).text();
        const m = svgText.match(/<g transform="matrix\(1\.0, 0\.0, 0\.0, 1\.0, (-?[\d.E-]+), (-?[\d.E-]+)\)"\/?>/);
        if (!m) throw new Error(`${svg}: no origin transform`);
        const file = `${base}__${name(j.id)}__f${f}.png`;
        await Bun.write(OUT + file, Bun.file(work + png));
        const img = await loadImage(OUT + file);
        const svgSize = ["width", "height"].map((a) => Number(svgText.match(new RegExp(` ${a}="([\\d.]+)px"`))?.[1]));
        if (img.width !== Math.ceil(svgSize[0]!) || img.height !== Math.ceil(svgSize[1]!)) console.warn(`${file}: PNG ${img.width}x${img.height} vs SVG ${svgSize.join("x")}`);
        index.push({
          file, swf: swfPath, kind: j.kind, characterId: j.id, linkage: exp.get(j.id) ?? null, frame: f,
          ...(j.kind === "button" && { state: BUTTON_STATES[f - 1] }), frameCount: j.n,
          size: [img.width, img.height], origin: [Number(m[1]), Number(m[2])],
        });
      }
    }
  }

  // Main timeline: JPEXS frame export clips to the stage rect, so render a copy whose header rect is widened, then crop.
  const frameJobs = jobs.filter((j) => j.kind === "frame");
  if (frameJobs.length) {
    await Bun.write(work + "wide.swf", widenStage(bytes, HALF));
    const frames = [...new Set(frameJobs.flatMap((j) => j.frames))];
    await $`${FFDEC} -ignorebackground -select 0:${frames.join(",")} -format frame:png -export frame ${work + "frames"} ${work + "wide.swf"}`.quiet();
    for (const f of frames) {
      const file = `${base}__0__f${f}.png`;
      const { x, y, w, h } = await crop(`${work}frames/${f}.png`, OUT + file);
      if (x === 0 || y === 0 || x + w >= 2 * HALF || y + h >= 2 * HALF) console.warn(`${file}: content touches the widened stage edge`);
      index.push({ file, swf: swfPath, kind: "frame", characterId: 0, linkage: null, frame: f, frameCount: swf.frameCount, size: [w, h], origin: [HALF - x, HALF - y], cropped: true });
    }
  }
}

await Bun.write(OUT + "index.json", JSON.stringify(index, null, 1) + "\n");
rmSync(WORK, { recursive: true, force: true });
console.log(`${index.length} reference PNGs in ${OUT}`);

/** Copy of a SWF with its stage rect set to [-half, half] px on both axes (written uncompressed). */
function widenStage(file: Uint8Array, half: number) {
  const body = file[0] === 0x43 ? new Uint8Array(inflateSync(file.subarray(8))) : file.subarray(8);
  const r = new Reader(body);
  r.rect();
  const rest = body.subarray(r.pos);
  const nbits = 17, v = half * 20; // twips; 17 signed bits hold up to ±65535
  const bits = nbits.toString(2).padStart(5, "0") + [-v, v, -v, v].map((n) => ((n + (1 << nbits)) % (1 << nbits)).toString(2).padStart(nbits, "0")).join("");
  const rect = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i] === "1") rect[i >> 3]! |= 0x80 >> (i & 7);
  const out = new Uint8Array(8 + rect.length + rest.length);
  out.set([0x46, 0x57, 0x53, file[3]!]); // "FWS" + version
  new DataView(out.buffer).setUint32(4, out.length, true);
  out.set(rect, 8);
  out.set(rest, 8 + rect.length);
  return out;
}

/** Crops a PNG to its non-transparent pixels; returns the kept rectangle (1×1 at 0,0 if empty). */
async function crop(src: string, dst: string) {
  const img = await loadImage(src);
  const ctx = createCanvas(img.width, img.height).getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (data[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
  if (x1 <= x0) { x0 = y0 = 0; x1 = y1 = 1; }
  const out = createCanvas(x1 - x0, y1 - y0);
  out.getContext("2d").putImageData(ctx.getImageData(x0, y0, x1 - x0, y1 - y0), 0, 0);
  await Bun.write(dst, out.encodeSync("png"));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
