// Converts sample SWFs and renders them headlessly → web/public/assets/swf/_preview/*.png
// Compare visually with JPEXS: tools/ffdec.sh -format sprite:png -selectid <id> -select <id>:<frame> -export sprite <out> <swf>
import { expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage, Path2D } from "@napi-rs/canvas";
import { convertFile, OUT_DIR } from "./convert.ts";
import { drawSymbol, getBounds, loadSwf, type SwfLoader } from "../../web/src/swf/render.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const PREVIEW = join(OUT_DIR, "_preview");
const loader: SwfLoader = {
  json: async (p) => JSON.parse(readFileSync(join(OUT_DIR, p), "utf8")),
  image: async (p) => (await loadImage(join(OUT_DIR, p))) as unknown as CanvasImageSource,
};

async function preview(src: string, id: number | string, frame: number, scale = 2): Promise<number> {
  const swf = await loadSwf(src, loader);
  const b = getBounds(swf, id, frame) ?? [0, 0, 1, 1];
  const w = Math.ceil((b[2] - b[0]) * scale) + 4, h = Math.ceil((b[3] - b[1]) * scale) + 4;
  const canvas = createCanvas(w, h), ctx = canvas.getContext("2d");
  ctx.translate(2 - b[0] * scale, 2 - b[1] * scale);
  ctx.scale(scale, scale);
  drawSymbol(ctx as unknown as CanvasRenderingContext2D, swf, id, frame);
  const name = `${src.replace(/\.swf$/, "").replace(/\//g, "_")}__${String(id).replace(/\W/g, "_")}_f${frame}.png`;
  writeFileSync(join(PREVIEW, name), await canvas.encode("png"));
  const px = ctx.getImageData(0, 0, w, h).data;
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i]) opaque++;
  return opaque;
}

const CASES: [src: string, id: number | string, frames: number[]][] = [
  ["clips/sprites/10.swf", 0, [2]], // root, StaticR
  ["clips/sprites/10.swf", 2, [1]], // only content is imported id 1 = weapons.swf "4_1"
  ["clips/sprites/10.swf", 99, [1, 4]], // WalkR
  ["clips/sprites/10.swf", 147, [1, 8]], // CastR
  ["clips/spells/903.swf", 15, [1, 6, 12]], // morph shape 13
  ["clips/spells/1102.swf", 0, [1, 20, 40]], // morphs 10–12
  ["clips/spells/101.swf", 14, [2, 30]], // frame 1 is empty
  ["clips/ground.swf", "1", [1]],
  ["clips/ground.swf", "7", [1]],
  ["clips/ground.swf", "25", [1]],
  ["clips/ground.swf", "49", [1]],
  ["clips/objects.swf", "1", [1]],
  ["clips/objects.swf", "5", [1]],
  ["clips/objects.swf", "14", [1]],
  ["clips/objects.swf", "30", [1]],
  ["clips/ground.swf", "10", [1]], // filled from v7b (docs/assets-format.md §11)
  ["clips/objects.swf", "835", [1]], // filled from v1_0
  ["modules/Interfaces.swf", "Interface::MultiPlayer", [1]], // static text, edit text, buttons, masks
  ["modules/Interfaces.swf", "Interface::Banner::Main", [1]],
  ["clips/spells/icons/23.swf", 0, [1]],
];

test("convert + render samples", async () => {
  rmSync(PREVIEW, { recursive: true, force: true });
  mkdirSync(PREVIEW, { recursive: true });
  const srcs = [...new Set(CASES.map((c) => c[0])), "clips/sprites/weapons/weapons.swf"];
  for (const src of srcs) expect((await convertFile(src)).warnings).toBeUndefined();
  const empty: string[] = [];
  for (const [src, id, frames] of CASES) for (const f of frames) if ((await preview(src, id, f)) < 50) empty.push(`${src} ${id} f${f}`);
  expect(empty).toEqual([]);
  const s10 = JSON.parse(readFileSync(join(OUT_DIR, "clips/sprites/10.json"), "utf8"));
  expect(s10.imports[0]).toEqual({ url: "clips/sprites/weapons/weapons.swf", items: [{ name: "4_1", id: 1 }] });
  expect(s10.root.frames[1].label).toBe("StaticR");
  const fill = (f: string) => JSON.parse(readFileSync(join(OUT_DIR, `clips/${f}.fill.json`), "utf8"));
  expect(fill("ground")["10"]).toEqual({ from: "vendor/archive-dofus-1/v7b/clips/ground.swf", provenance: "beta_sibling" });
  expect(fill("objects")["835"]).toEqual({ from: "vendor/archive-dofus-1/v1_0/clips/objects.swf", provenance: "release_sibling" });
  expect(fill("objects")["1030"]).toBeUndefined(); // beta 5b has it: its own graphic stays
});
