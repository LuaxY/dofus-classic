import { expect, test } from "bun:test";
import { compressPath, decode64, extractFullPath, makeFullPath, uncompressCell, uncompressMap, zkArray, type MapCell } from "./compressor.ts";
import { layoutMap } from "./map.ts";
import { MAP_507 } from "./map507.fixture.ts";

type CellFields = Required<Omit<MapCell, "x" | "y" | "playerOnID">>;

/** Test-only inverse of Compressor.uncompressMap's bit layout (writes the layerGroundFlip bit the decoder ignores). */
function encodeCell(f: CellFields): string {
  const b = (v: boolean) => (v ? 1 : 0);
  const digits = [
    (b(f.active) << 5) | b(f.lineOfSight),
    (f.layerGroundRot << 4) | f.groundLevel,
    (f.movement << 3) | (f.layerGroundNum >> 6),
    f.layerGroundNum & 63,
    (f.groundSlope << 2) | (b(f.layerGroundFlip) << 1) | (f.layerObject1Num >> 12),
    (f.layerObject1Num >> 6) & 63,
    f.layerObject1Num & 63,
    (f.layerObject1Rot << 4) | (b(f.layerObject1Flip) << 3) | (b(f.layerObject2Flip) << 2) | (b(f.layerObject2Interactive) << 1) | (f.layerObject2Num >> 12),
    (f.layerObject2Num >> 6) & 63,
    f.layerObject2Num & 63,
  ];
  return digits.map((d) => zkArray[d]).join("");
}

const sample: CellFields = {
  active: true, lineOfSight: true, layerGroundRot: 2, groundLevel: 9, movement: 5, layerGroundNum: 300, groundSlope: 11,
  layerGroundFlip: true, layerObject1Num: 5000, layerObject1Rot: 3, layerObject1Flip: true, layerObject2Flip: false,
  layerObject2Interactive: true, layerObject2Num: 7777,
};

test("decode64 is the zkArray index; lowercase goes through the '_' prefixed keys", () => {
  expect(decode64("a")).toBe(0);
  expect(decode64("A")).toBe(26);
  expect(decode64("_")).toBe(63);
  expect(decode64("-")).toBe(62);
  expect(decode64("!")).toBeUndefined();
});

test("uncompressMap round-trips the encoder, except layerGroundFlip (always false: octets[4] bug)", () => {
  const inactive = encodeCell({ ...sample, active: false });
  const map = uncompressMap(1, "n", "2", "1", true, "0", encodeCell(sample) + inactive);
  expect(map.width).toBe(2);
  expect(map.data[0]).toEqual({ ...sample, layerGroundFlip: false });
  expect(map.data[1]).toEqual({ active: false }); // inactive cells carry only `active`
});

test("a short last chunk decodes its missing digits as 0", () => {
  const map = uncompressMap(1, undefined, 2, 1, false, 0, "HhG");
  expect(map.data).toHaveLength(1);
  expect(map.data[0]).toMatchObject({ active: true, groundLevel: 7, movement: 4, layerGroundNum: 0, groundSlope: 0, layerObject2Num: 0 });
});

test("map 507 fixture (9×12): 9·12 + 8·11 = 196 cells, hand-decoded samples", () => {
  const map = uncompressMap(MAP_507.id, "507", MAP_507.width, MAP_507.height, false, MAP_507.backgroundNum, MAP_507.mapData);
  expect(map.data).toHaveLength(9 * 12 + 8 * 11);
  expect(map.data[0]).toEqual({ active: false }); // "bhGaeaaaaa": b = 1, bit 5 clear
  // "HhGieaaaaa": H=33 active+LoS, h=7 level 7, G=32 movement 4, i=8 ground 8, e=4 slope 1
  expect(map.data[89]).toEqual({ active: true, lineOfSight: true, layerGroundRot: 0, groundLevel: 7, movement: 4, layerGroundNum: 8, groundSlope: 1,
    layerGroundFlip: false, layerObject1Num: 0, layerObject1Rot: 0, layerObject1Flip: false, layerObject2Flip: false, layerObject2Interactive: false, layerObject2Num: 0 });
  expect(map.data[72]).toMatchObject({ movement: 0, layerGroundNum: 0, layerObject1Num: 9 * 64 + 45 }); // "HhaaejTaaa": j=9, T=45
  expect(map.data[107]).toMatchObject({ layerObject1Num: 13 * 64 + 47, layerObject1Flip: true }); // "HhGienViaa": n=13 V=47, i=8 → bit 3
  expect(map.data[113]).toMatchObject({ layerObject2Flip: true, layerObject2Num: 6 * 64 + 49 }); // "HhGienVegX": e=4 bit 2, g=6 X=49
  expect(map.data[121]).toMatchObject({ movement: 2, layerObject1Num: 16 * 64 + 6 }); // "Hhqieqgaaa": q=16
  layoutMap(map);
  expect(map.data[89]).toMatchObject({ x: 4 * 53, y: (10 * 27) / 2 }); // pixel row 10 (cells 85..93), column 4
  expect(map.data[0]!.x).toBeUndefined(); // inactive cells get no position
});

test("uncompressCell: mask selects fields; groundLevel/groundSlope/layerGroundFlip are never updated (AS bug)", () => {
  const map = uncompressMap(1, undefined, 2, 1, false, 0, encodeCell({ ...sample, groundLevel: 1, groundSlope: 1, movement: 1 }));
  const update = encodeCell({ ...sample, groundLevel: 15, groundSlope: 15, movement: 7, layerObject2Num: 1 });
  uncompressCell(map, 0, update, "0400"); // groundLevel bit only → no effect
  uncompressCell(map, 0, update, "0280"); // groundSlope + layerGroundFlip → no effect
  expect(map.data[0]).toMatchObject({ groundLevel: 1, groundSlope: 1, layerGroundFlip: false, movement: 1 });
  uncompressCell(map, 0, update, "0804"); // movement + layerObject2Num
  expect(map.data[0]).toMatchObject({ movement: 7, layerObject2Num: 1 });
  uncompressCell(map, 0, encodeCell({ ...sample, active: false }), "3fff");
  expect(map.data[0]!.active).toBe(false);
  expect(map.data[0]!.movement).toBe(5); // the other fields are still overwritten from the digits
});

test("compressPath / extractFullPath", () => {
  // num 24 dir 1: (0 + 1<<4) = 16 → q, 24 → y; num 29 dir 0: a, D(29)
  expect(compressPath([{ num: 24, dir: 1 }, { num: 29, dir: 0 }])).toBe("qyaD");
  expect(compressPath([{ num: 1000, dir: 3 }])).toBe(zkArray[(1000 >> 6) + 48]! + zkArray[1000 & 63]);
  expect(compressPath(null)).toBeUndefined();
  // width 5: 20 → 24 (y+1) → 29 (x+1); every segment start is repeated
  expect(extractFullPath(compressPath([{ num: 20, dir: 0 }, { num: 24, dir: 1 }, { num: 29, dir: 0 }])!, 5)).toEqual([20, 20, 24, 24, 29]);
});

test("makeFullPath walks aligned segments, repeats segment starts, skips non-aligned pairs", () => {
  // width 5: x+1 is +5, y+1 is +4. 0 → 15 is three x-steps.
  expect(makeFullPath([0, 15], 5)).toEqual([0, 0, 5, 10, 15]);
  expect(makeFullPath([0, 15, 3], 5)).toEqual([0, 0, 5, 10, 15, 15, 11, 7, 3]);
  // 0 → 9 is x+1,y+1 (not aligned): direction -1, end cell never appears
  expect(makeFullPath([0, 9], 5)).toEqual([0, 0]);
  expect(makeFullPath([], 5)).toEqual([]);
});
