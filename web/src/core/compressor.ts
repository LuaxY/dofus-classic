// Port of Dofus.Compressor.as (Class_Compressor): map/cell decoding, path encoding/decoding, base-64 digit.
// The original writes DATACENTER.Map; here `uncompressMap` returns the MapData and `uncompressCell` mutates
// the given map. Bit layout of one cell (10 base-64 digits c0..c9, 6 bits each):
//   c0: bit5 active, bit0 lineOfSight          c1: bits4-5 layerGroundRot, bits0-3 groundLevel
//   c2: bits3-5 movement, bits0-2 layerGroundNum hi    c3: layerGroundNum lo (6 bits)
//   c4: bits2-5 groundSlope, bit1 layerGroundFlip, bit0 layerObject1Num bit12    c5,c6: layerObject1Num
//   c7: bits4-5 layerObject1Rot, bit3 layerObject1Flip, bit2 layerObject2Flip, bit1 layerObject2Interactive,
//       bit0 layerObject2Num bit12                                                c8,c9: layerObject2Num
// Missing/unknown digits decode to undefined, which every use here coerces to 0 (SWF 6 `&`, `<<`, `+`).
import { toNumber } from "./swf6.ts";
import { getAbsoluteDirection } from "./pathfinding.ts";

export interface MapCell {
  active: boolean;
  lineOfSight?: boolean;
  layerGroundRot?: number;
  groundLevel?: number;
  movement?: number;
  layerGroundNum?: number;
  groundSlope?: number;
  layerGroundFlip?: boolean;
  layerObject1Num?: number;
  layerObject1Rot?: number;
  layerObject1Flip?: boolean;
  layerObject2Flip?: boolean;
  layerObject2Interactive?: boolean;
  layerObject2Num?: number;
  /** Pixel position, set by BattleField.Map.build/updateCell (map.ts `layoutMap`/`layoutCell`), active cells only. */
  x?: number;
  y?: number;
  /** Character standing here (BattleField.Characters.Character.as:300-301). The AS also reads it as `PlayerOnID` (SWF 6 case-insensitive). */
  playerOnID?: number;
}

export interface MapData {
  id: number;
  name: string | undefined;
  width: number;
  height: number;
  bRolePlay: boolean;
  backgroundNum: string | number;
  data: MapCell[];
  /** Written by BattleField.Map.calculateTacleZone (map.ts), read by PathFinding.pathFind. */
  TacleZoneTeam0?: Record<number, boolean>;
  TacleZoneTeam1?: Record<number, boolean>;
}

/** Compressor.as:17 `zkArray` — digit value → char. */
export const zkArray = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"];
// Compressor.as:9-16 `hashCodes`: keys "_a".."_z","A".."Z","0".."9","-","_" — lowercase is "_"-prefixed so that
// SWF 6's case-insensitive lookup cannot confuse "a" and "A". Net effect: char → index in zkArray.
const hashCodes = new Map(zkArray.map((c, i) => [c, i]));

/** Compressor.as:161-169 */
export const decode64 = (codedValue: string | undefined): number | undefined =>
  codedValue === undefined ? undefined : hashCodes.get(codedValue);

const d = (c: string | undefined): number => toNumber(decode64(c));

/** Compressor.as:19-76. Cells are 10 chars; a shorter last chunk decodes with its missing digits as 0. */
export function uncompressMap(
  mapId: number,
  name: string | undefined,
  width: number | string,
  height: number | string,
  bRolePlay: boolean,
  backgroundNum: string | number,
  data: string,
): MapData {
  const map: MapData = { id: mapId, name, width: Number(width), height: Number(height), bRolePlay, backgroundNum, data: [] };
  for (let i = 0; i < data.length; i += 10) {
    const c = data.substring(i, i + 10).split("");
    let v = d(c[0]);
    const cell: MapCell = { active: (v & 0x20) >> 5 ? true : false };
    if (cell.active) {
      cell.lineOfSight = v & 1 ? true : false;
      v = d(c[1]);
      cell.layerGroundRot = (v & 0x30) >> 4;
      cell.groundLevel = v & 0x0f;
      v = d(c[2]);
      cell.movement = (v & 0x38) >> 3;
      cell.layerGroundNum = ((v & 7) << 6) + d(c[3]);
      v = d(c[4]);
      cell.groundSlope = (v & 0x3c) >> 2;
      // Compressor.as:61 — AS BUG kept: reads `octets[4]`, an undefined variable, so this is always false.
      cell.layerGroundFlip = false;
      cell.layerObject1Num = ((v & 1) << 12) + (d(c[5]) << 6) + d(c[6]);
      v = d(c[7]);
      cell.layerObject1Rot = (v & 0x30) >> 4;
      cell.layerObject1Flip = (v & 8) >> 3 ? true : false;
      cell.layerObject2Flip = (v & 4) >> 2 ? true : false;
      cell.layerObject2Interactive = (v & 2) >> 1 ? true : false;
      cell.layerObject2Num = ((v & 1) << 12) + (d(c[8]) << 6) + d(c[9]);
    }
    map.data.push(cell);
  }
  return map;
}

/**
 * Compressor.as:77-160. `maskHexStr` (hex) selects which fields to overwrite on `map.data[cellNum]`.
 * AS BUGS kept: the guards for groundLevel (0x0400), groundSlope (0x0200) and layerGroundFlip (0x80) test
 * misspelled, never-defined variables (`bLayerGroundLevel`, `bLayerGroundSlope`, `bLayerGroundFlip`), so those
 * three fields are never updated by a cell update.
 */
export function uncompressCell(map: MapData, cellNum: number, compressDataStr: string, maskHexStr: string): void {
  const m = parseInt(maskHexStr, 16);
  const chars = compressDataStr.split("");
  const c = (k: number): number => d(chars[k]);
  const cell = map.data[cellNum];
  if (cell === undefined) return; // AS: sets members on undefined → no-op
  if (m & 0x2000) cell.active = (c(0) & 0x20) >> 5 ? true : false;
  if (m & 0x1000) cell.lineOfSight = c(0) & 1 ? true : false;
  if (m & 0x40) cell.layerGroundRot = (c(1) & 0x30) >> 4;
  if (m & 0x0800) cell.movement = (c(2) & 0x38) >> 3;
  if (m & 0x0100) cell.layerGroundNum = ((c(2) & 7) << 6) + c(3);
  if (m & 0x20) cell.layerObject1Num = ((c(4) & 1) << 12) + (c(5) << 6) + c(6);
  if (m & 8) cell.layerObject1Rot = (c(7) & 0x30) >> 4;
  if (m & 0x10) cell.layerObject1Flip = (c(7) & 8) >> 3 ? true : false;
  if (m & 2) cell.layerObject2Flip = (c(7) & 4) >> 2 ? true : false;
  if (m & 1) cell.layerObject2Interactive = (c(7) & 2) >> 1 ? true : false;
  if (m & 4) cell.layerObject2Num = ((c(7) & 1) << 12) + (c(8) << 6) + c(9);
}

export interface PathStep {
  num: number;
  dir: number;
}

/**
 * Compressor.as:170-191. Two digits per step: (dir << 4 | (num >> 6) & 15), (num & 63). Cells ≥ 1024 lose
 * their high bits; a digit index > 63 maps to undefined, which SWF 6 concatenates as "". null → undefined.
 */
export function compressPath(dataArray: readonly PathStep[] | null | undefined): string | undefined {
  if (dataArray == null) return undefined;
  let s = "";
  for (const step of dataArray) {
    const octet1 = ((step.num >> 6) & 0x0f) + (step.dir << 4);
    s += (zkArray[octet1] ?? "") + (zkArray[step.num & 0x3f] ?? "");
  }
  return s;
}

/** Compressor.as:192-207. The direction bits of each pair are dropped; `makeFullPath` recomputes them. */
export function extractFullPath(compressedData: string, mapWidth: number): number[] {
  const c = compressedData.split("");
  const light: number[] = [];
  for (let i = 0; i < compressedData.length; i += 2) light.push(((d(c[i]) & 0x0f) << 6) | d(c[i + 1]));
  return makeFullPath(light, mapWidth);
}

/**
 * Compressor.as:208-236 (reads DATACENTER.Map.width; passed in here). Expands segment end-points into every
 * crossed cell. AS quirks kept: the start of every segment is pushed again (the first cell and each turn
 * cell appear twice: [a,b] → [a, a, …, b]); a non-aligned pair (direction -1) is not walked, and if it is the
 * last pair its end cell never appears.
 */
export function makeFullPath(lightArray: readonly number[], mapWidth: number): number[] {
  const out: number[] = [];
  const nextDist = [mapWidth, mapWidth - 1, -mapWidth, -(mapWidth - 1)];
  let cellfrom = lightArray[0]!;
  for (const cell of lightArray) {
    out.push(cellfrom);
    const dir = getAbsoluteDirection(cell, cellfrom, mapWidth);
    if (dir != -1) while (out[out.length - 1] != cell) out.push(out[out.length - 1]! + nextDist[dir]!);
    cellfrom = cell;
  }
  return out;
}
