// Cross-language fixture for the Rust server (server/tests/pathfinding_parity.rs): runs this PathFinding port on every
// map of server/data/maps.json (map 507 included) with seeded random cases — moves in and out of fights, AP caps,
// occupied cells, tackle zones of both teams — plus line-of-sight cases, and writes the expected results to
// server/tests/fixtures/pathfinding.json. Deterministic: rerunning rewrites the same file.
import { expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { uncompressMap, type MapData } from "./compressor.ts";
import { calculateTacleZone, layoutMap } from "./map.ts";
import { MAP_507 } from "./map507.fixture.ts";
import { PathFinding, type PathFindingDataCenter } from "./pathfinding.ts";

const MAPS = new URL("../../../server/data/maps.json", import.meta.url);
const OUT = new URL("../../../server/tests/fixtures/", import.meta.url);

/** mulberry32 */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Step = [number, number];
interface PathCase { map: number; start: number; goal: number; fight: boolean; ap: number; team: number | null; occupants: [number, number][]; path: Step[] | null; full: Step[] | null }
interface ViewCase { map: number; from: number; to: number; occupants: number[]; view: boolean }

test("pathfinding + line of sight fixture for the Rust port", () => {
  const { maps } = JSON.parse(readFileSync(MAPS, "utf8")) as { maps: { id: number; width: number; height: number; backgroundNum: number; mapData: string; losCleared?: number[] }[] };
  // the server's 507 is the fixture except the line-of-sight bits scripts/server-data/maps.ts cleared (white tiles)
  const m507 = maps.find((m) => m.id == MAP_507.id)!, cleared = new Set(m507.losCleared ?? []);
  const decode = (d: string) => uncompressMap(MAP_507.id, undefined, MAP_507.width, MAP_507.height, false, MAP_507.backgroundNum, d).data;
  const served = decode(m507.mapData);
  expect([...cleared].map((n) => served[n]!.lineOfSight)).toEqual([...cleared].map(() => false));
  expect(served.map((c, n) => (cleared.has(n) ? { ...c, lineOfSight: true } : c))).toEqual(decode(MAP_507.mapData));
  const rand = rng(507);
  const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)]!;
  const paths: PathCase[] = [];
  const views: ViewCase[] = [];
  for (const m of maps) {
    const map: MapData = uncompressMap(m.id, undefined, m.width, m.height, false, m.backgroundNum, m.mapData);
    layoutMap(map);
    const walk = map.data.flatMap((c, i) => (c.active && c.movement! > 1 ? [i] : []));
    const any = map.data.flatMap((c, i) => (c.active ? [i] : []));
    const characters = new Map<number, { guild: number }>();
    const dc: PathFindingDataCenter = {
      Map: map,
      Player: { tmpPath: [], tmpFullPath: [], lastClickedCell: null, currentSpell: null, data: { team: null, AP: 0, cell: null, EffectsManager: { getModeratorValue: () => 0 } } },
      Game: { isFight: false },
      Characters: { getItemAt: (id) => characters.get(id) },
    };
    const place = (occ: [number, number][]) => {
      for (const c of map.data) delete c.playerOnID;
      characters.clear();
      occ.forEach(([cell], i) => {
        map.data[cell]!.playerOnID = i + 1;
        characters.set(i + 1, { guild: 1 });
      });
      calculateTacleZone(map, occ.map(([cell, team]) => ({ cell, team })));
    };
    const pf = new PathFinding(dc);
    for (let k = 0; k < 16; k++) {
      const fight = rand() < 0.6;
      const team = fight ? (rand() < 0.5 ? 0 : 1) : rand() < 0.5 ? null : 0;
      const ap = 1 + Math.floor(rand() * 12);
      const start = pick(walk);
      const goal = rand() < 0.9 ? pick(walk) : pick(any);
      const occupants: [number, number][] = [[start, team ?? 0]];
      for (let n = Math.floor(rand() * 4); n > 0; n--) {
        const c = pick(walk);
        if (c != start && c != goal && !occupants.some(([o]) => o == c)) occupants.push([c, rand() < 0.5 ? 0 : 1]);
      }
      place(occupants);
      Object.assign(dc.Player.data!, { team, AP: ap, cell: start });
      (dc.Game as { isFight: boolean }).isFight = fight;
      pf.pathFind(start, goal, false);
      const light = dc.Player.tmpPath;
      pf.pathFind(start, goal, true);
      expect(dc.Player.tmpPath).toEqual(light); // bFull only adds tmpFullPath
      const steps = (s: { num: number; dir: number }[] | null): Step[] | null => s && s.map((p) => [p.num, p.dir]);
      paths.push({ map: m.id, start, goal, fight, ap, team, occupants, path: steps(dc.Player.tmpPath), full: steps(dc.Player.tmpFullPath) });
    }
    for (let k = 0; k < 10; k++) {
      const from = pick(walk);
      const to = rand() < 0.85 ? pick(walk) : pick(any);
      const occupied = [from, ...Array.from({ length: Math.floor(rand() * 4) }, () => pick(walk))].filter((c, i, a) => a.indexOf(c) == i);
      place(occupied.map((c) => [c, 0]));
      views.push({ map: m.id, from, to, occupants: occupied, view: pf.checkView(from, to) });
    }
  }
  expect(paths.some((p) => p.path == null) && paths.some((p) => (p.full?.length ?? 0) > 8)).toBe(true);
  expect(views.some((v) => v.view) && views.some((v) => !v.view)).toBe(true);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL("pathfinding.json", OUT), JSON.stringify({ generator: "web/src/core/pathfinding.parity.test.ts", paths, views }) + "\n");
});
