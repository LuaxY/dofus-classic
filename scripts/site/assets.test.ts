import { createCanvas } from "@napi-rs/canvas";
import { expect, test } from "bun:test";
import { erase } from "./assets.ts";

const scene = () => {
  const c = createCanvas(40, 10), ctx = c.getContext("2d");
  ctx.fillStyle = "#fdf8e9";
  ctx.fillRect(0, 0, 40, 10);
  ctx.fillStyle = "#432407"; // "text": a dark block covering most of rows 3-6
  ctx.fillRect(5, 3, 30, 4);
  return ctx;
};
const pixels = (ctx: ReturnType<typeof scene>) => [...new Uint32Array(ctx.getImageData(0, 0, 40, 10).data.buffer)];

test("erase with a reference strip repaints bold text with the background", () => {
  const ctx = scene(), bg = pixels(ctx)[0];
  erase(ctx, [2, 1, 37, 9], [37, 40]);
  expect(new Set(pixels(ctx))).toEqual(new Set([bg]));
});

test("erase without a reference removes thin text and keeps the rest", () => {
  const ctx = scene(), bg = pixels(ctx)[0];
  ctx.fillStyle = "#fdf8e9";
  ctx.fillRect(5, 3, 30, 4);
  ctx.fillStyle = "#432407";
  ctx.fillRect(10, 4, 3, 2); // under half of each row
  erase(ctx, [0, 0, 40, 10]);
  expect(new Set(pixels(ctx))).toEqual(new Set([bg]));
});
