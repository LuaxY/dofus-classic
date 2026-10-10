import { expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { compare, readPng } from "./compare.ts";

/** w×h transparent image with a red 20×10 rectangle at (x, y), plus an optional extra blue square. */
function draw(w: number, h: number, x: number, y: number, extra = false) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c00000";
  ctx.fillRect(x, y, 20, 10);
  if (extra) { ctx.fillStyle = "#0000ff"; ctx.fillRect(x + 2, y + 2, 6, 6); }
  return { canvas, img: ctx.getImageData(0, 0, w, h) };
}

test("same shape at another offset aligns to a zero diff", () => {
  const r = compare(draw(40, 30, 5, 5).img, draw(30, 20, 3, 4).img);
  expect([r.dx, r.dy, r.badRatio, r.meanDiff, r.covered]).toEqual([2, 1, 0, 0, 200]);
});

test("explicit registration points drive the alignment", () => {
  // Registration point at the rectangle's top-left corner in both images.
  const r = compare(draw(40, 30, 5, 5).img, draw(30, 20, 3, 4).img, { refOrigin: [5, 5], candOrigin: [3, 4] });
  expect([r.dx, r.dy, r.badRatio]).toEqual([2, 1, 0]);
  const off = compare(draw(40, 30, 5, 5).img, draw(30, 20, 3, 4).img, { refOrigin: [5, 5], candOrigin: [0, 0] });
  expect(off.badRatio).toBeGreaterThan(0.5);
});

test("a changed region is reported and fails the CLI threshold", async () => {
  const ref = draw(40, 30, 5, 5), cand = draw(40, 30, 5, 5, true);
  const r = compare(ref.img, cand.img, { blur: 0 });
  expect(r.bad).toBe(36);
  expect(r.badRatio).toBeCloseTo(36 / 200);
  expect(compare(ref.img, cand.img).badRatio).toBeGreaterThan(0.05); // default blur 1 still flags it

  const dir = import.meta.dir + "/.test-tmp/";
  mkdirSync(dir, { recursive: true });
  await Bun.write(dir + "ref.png", ref.canvas.encodeSync("png"));
  await Bun.write(dir + "cand.png", cand.canvas.encodeSync("png"));
  // In-process instead of spawning the CLI: Bun's posix_spawn fails (EBADF) once @napi-rs/canvas is loaded.
  const refPng = await readPng(dir + "ref.png");
  expect(compare(refPng, await readPng(dir + "ref.png")).badRatio).toBeLessThanOrEqual(0.05);
  const fail = compare(refPng, await readPng(dir + "cand.png"), {}, true);
  expect(fail.badRatio).toBeGreaterThan(0.05);
  expect(fail.diff).toBeDefined();
  rmSync(dir, { recursive: true });
});
