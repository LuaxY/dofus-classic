import { expect, test } from "bun:test";
import { compressPath, uncompressMap, type MapCell, type MapData } from "./compressor.ts";
import { calculateTacleZone, getCellHeight, layoutCell, layoutMap } from "./map.ts";
import { MAP_507 } from "./map507.fixture.ts";
import { PathFinding, getCaseCoordonnee, getCaseNum, getDirection, type PathFindingDataCenter } from "./pathfinding.ts";

/** Open flat map: every cell active, walkable (movement 4), line of sight, level 7, flat. */
function openMap(w: number, h: number): MapData {
  const data: MapCell[] = Array.from({ length: w * h + (w - 1) * (h - 1) }, () => ({ active: true, lineOfSight: true, movement: 4, groundLevel: 7, groundSlope: 1 }));
  const map: MapData = { id: 0, name: undefined, width: w, height: h, bRolePlay: false, backgroundNum: 0, data };
  layoutMap(map);
  return map;
}

function dc(map: MapData, o: { fight?: boolean; team?: number | null; AP?: number; cell?: number; range?: number } = {}): PathFindingDataCenter {
  return {
    Map: map,
    Player: {
      tmpPath: [], tmpFullPath: [], lastClickedCell: null, currentSpell: null,
      data: { team: o.team ?? null, AP: o.AP, cell: o.cell ?? null, EffectsManager: { getModeratorValue: () => o.range ?? 0 } },
    },
    Game: { isFight: o.fight ?? false },
    Characters: { getItemAt: () => undefined },
  };
}

/** Consecutive cells of a full path must be pixel neighbours (|Δx| = half a cell). */
const adjacent = (map: MapData, cells: number[]) =>
  cells.every((c, i) => i == 0 || Math.abs(map.data[c]!.x! - map.data[cells[i - 1]!]!.x!) == 26.5);

test("cell id ↔ coordinates round-trip on every cell of a 9×12 map", () => {
  for (let n = 0; n < 196; n++) {
    const p = getCaseCoordonnee(n, 9);
    expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
    expect(getCaseNum(p.x, p.y, 9)).toBe(n);
  }
  expect(getCaseCoordonnee(20, 5)).toEqual({ x: 4, y: 0 });
  expect(getDirection(25, 20, 5)).toBe(0); // x+1
  expect(getDirection(24, 20, 5)).toBe(1); // y+1
  expect(getDirection(15, 20, 5)).toBe(2);
  expect(getDirection(16, 20, 5)).toBe(3);
});

test("layoutCell (updateCell) recomputes the same position as layoutMap (build)", () => {
  const map = openMap(9, 12);
  for (const n of [0, 8, 9, 16, 17, 89, 195]) {
    const { x, y } = map.data[n]!;
    delete map.data[n]!.x;
    layoutCell(map, n);
    expect([map.data[n]!.x, map.data[n]!.y]).toEqual([x, y]);
  }
  expect([map.data[9]!.x, map.data[17]!.x, map.data[16]!.x]).toEqual([26.5, 0, 7 * 53 + 26.5]);
});

test("tie-break: among equal f the most recently inserted open node wins (AVM1 for..in order)", () => {
  // Hand trace, width 5, 20 → 29 (= x+1, y+1). Expanding 20 inserts 25 (x+1, f 2.2), 24 (y+1, f 2.2), 16, 15 (f 4.2).
  // The backwards scan meets 24 before 25 → 24 is expanded first and becomes 29's parent.
  // (First-inserted-wins would give [{25,0},{29,1}].)
  const d = dc(openMap(5, 5));
  new PathFinding(d).pathFind(20, 29, true);
  expect(d.Player.tmpPath).toEqual([{ num: 24, dir: 1 }, { num: 29, dir: 0 }]);
  expect(d.Player.tmpFullPath).toEqual([{ num: 24, dir: 1 }, { num: 29, dir: 0 }]);
  expect(compressPath(d.Player.tmpPath)).toBe("qyaD");
});

test("occupied cells block; bFull false leaves tmpFullPath = []", () => {
  const map = openMap(5, 5);
  map.data[24]!.playerOnID = 7;
  const d = dc(map);
  new PathFinding(d).pathFind(20, 29, false);
  expect(d.Player.tmpPath).toEqual([{ num: 25, dir: 0 }, { num: 29, dir: 1 }]);
  expect(d.Player.tmpFullPath).toEqual([]);
});

test("row wrap-around is rejected by the pixel-x test", () => {
  const map = openMap(5, 5);
  const d = dc(map);
  new PathFinding(d).pathFind(4, 9, true); // 4 + 5 = 9 numerically, but 9 is at the other end of the next row
  const cells = [4, ...d.Player.tmpFullPath!.map((s) => s.num)];
  expect(cells.at(-1)).toBe(9);
  expect(cells.length).toBeGreaterThan(2);
  expect(adjacent(map, cells)).toBe(true);
});

test("fight: max length is the player's AP", () => {
  const map = openMap(5, 5);
  const d1 = dc(map, { fight: true, AP: 1 });
  new PathFinding(d1).pathFind(20, 29, true);
  expect(d1.Player.tmpPath).toBeNull();
  expect(d1.Player.tmpFullPath).toBeNull();
  const d2 = dc(map, { fight: true, AP: 2 });
  new PathFinding(d2).pathFind(20, 29, true);
  expect(d2.Player.tmpFullPath).toHaveLength(2);
});

test("fight: enemy tackle zones block except on the end cell; ignored outside fights", () => {
  const map = openMap(5, 5);
  calculateTacleZone(map, [{ team: 1, cell: 30 }]); // enemy on 30: zone = 35, 34, 26, 25
  expect(map.TacleZoneTeam1).toEqual({ 35: true, 34: true, 26: true, 25: true });
  const d = dc(map, { fight: true, team: 0, AP: 10 });
  const pf = new PathFinding(d);
  pf.pathFind(20, 29, true);
  expect(d.Player.tmpFullPath!.map((s) => s.num)).toEqual([24, 29]); // 25 is in the zone anyway
  pf.pathFind(20, 34, true); // end cell inside the zone is allowed
  const cells = d.Player.tmpFullPath!.map((s) => s.num);
  expect(cells.at(-1)).toBe(34);
  expect(cells.slice(0, -1).some((c) => [35, 26, 25].includes(c))).toBe(false);
  const dTeam1 = dc(map, { fight: true, team: 1, AP: 10 }); // own zone (team 1 → adverse 0) does not block
  new PathFinding(dTeam1).pathFind(20, 30, true);
  expect(dTeam1.Player.tmpFullPath!.map((s) => s.num)).toEqual([25, 30]);
});

test("movement 1 is walkable only as the end cell; movement 0 never", () => {
  const map = openMap(5, 5);
  map.data[24]!.movement = 1;
  map.data[25]!.movement = 1;
  const d = dc(map);
  const pf = new PathFinding(d);
  pf.pathFind(20, 29, true);
  expect(d.Player.tmpFullPath!.map((s) => s.num)).not.toContain(24);
  expect(d.Player.tmpFullPath!.map((s) => s.num)).not.toContain(25);
  pf.pathFind(20, 24, true);
  expect(d.Player.tmpFullPath).toEqual([{ num: 24, dir: 1 }]);
});

test("checkView: straight line, blocked by no-LoS cell, by a character, by height; target character ok", () => {
  const map = openMap(5, 5); // (2,0) = 10 … (6,0) = 30, through 15, 20, 25
  const pf = new PathFinding(dc(map));
  expect(pf.checkView(10, 30)).toBe(true);
  map.data[20]!.lineOfSight = false;
  expect(pf.checkView(10, 30)).toBe(false);
  map.data[20]!.lineOfSight = true;
  map.data[20]!.playerOnID = 3;
  expect(pf.checkView(10, 30)).toBe(false);
  delete map.data[20]!.playerOnID;
  map.data[30]!.playerOnID = 3;
  expect(pf.checkView(10, 30)).toBe(true);
  map.data[20]!.groundLevel = 10;
  expect(getCellHeight(map, 20)).toBe(3);
  expect(pf.checkView(10, 30)).toBe(false);
});

test("checkRange: Manhattan range + range moderator (min 1), line-only, own cell", () => {
  const map = openMap(5, 5);
  expect(new PathFinding(dc(map)).checkRange(10, 30, false, 4)).toBe(true);
  expect(new PathFinding(dc(map)).checkRange(10, 30, false, 3)).toBe(false);
  expect(new PathFinding(dc(map, { range: 1 })).checkRange(10, 30, false, 3)).toBe(true);
  expect(new PathFinding(dc(map, { range: -5 })).checkRange(10, 15, false, 1)).toBe(true); // clamped to 1
  expect(new PathFinding(dc(map)).checkRange(20, 29, true, 5)).toBe(false); // not aligned
  expect(new PathFinding(dc(map, { cell: 30 })).checkRange(10, 30, false, 9)).toBe(false); // target = own cell
});

test("map 507 fixture: path from the top cell (89) to the bottom cell (174)", () => {
  const map = uncompressMap(MAP_507.id, "507", MAP_507.width, MAP_507.height, false, MAP_507.backgroundNum, MAP_507.mapData);
  layoutMap(map);
  const d = dc(map);
  new PathFinding(d).pathFind(89, 174, true);
  const cells = [89, ...d.Player.tmpFullPath!.map((s) => s.num)];
  expect(cells).toHaveLength(11); // Manhattan distance 10, all walkable cells have movement 4
  expect(adjacent(map, cells)).toBe(true);
  expect(cells.every((c) => map.data[c]!.active && map.data[c]!.movement! >= 2)).toBe(true);
  // Regression snapshot of this port's result (not an independent oracle).
  expect(compressPath(d.Player.tmpPath)).toBe(REGRESSION_507);
});

// 89 →x 98 →x 107 →y 115 →y 123 →y 131 →x 140 →x 149 →y 157 →x 166 →y 174
const REGRESSION_507 = "bRsdcvsDcMsU";
