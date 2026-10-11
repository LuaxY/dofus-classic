// Generates server/data/maps.json from the 2004 map SWFs in vendor/dofedex/maps-2004/ (post-beta, July 2004+;
// see vendor/dofedex/README.md). Keeps the maps whose graphics are all in beta 5b's clips/ground.swf and
// clips/objects.swf, plus the best partially covered ones (>= MIN_PARTIAL coverage and a walkable area of at
// least MIN_AREA cells), then runs the client's own Map.build headless on each to (1) remove white tiles and (2) pick
// 4 visible placement cells per team inside the largest connected walkable area.
// Also writes the `world` maps (role-play maps linked by their map-change plates, "World maps" below) and adds their
// names to web/public/lang/fr.json + fr.provenance.json.
//
//   bun scripts/server-data/maps.ts
//
// Decompiles with `tools/ffdec.sh -format script:as -export script <tmp> vendor/dofedex/maps-2004` (cached in
// $TMPDIR/dofus-maps-2004-as). Coverage = share of non-zero ground/object references of active cells (plus the
// background) whose linkage id is exported by the beta SWFs (web/public/assets/swf/clips/{ground,objects}.json).
// Output is deterministic (sorted by coverage desc, then id; Math.random seeded for the objects that randomise).
//
// White tiles: the client attaches an opaque white `Dofus::Cell` diamond under the ground layer for every
// line-of-sight cell (AKSClient/Dofus.BattleField.Map.as, Interaction.as:29-43; docs/logic/map-format.md §5). Beta
// arenas drew ground over all of them; these 2004 maps leave some unwalkable ones bare (cells beside the room, under
// furniture sticking out). Such a cell's line-of-sight bit is cleared (no diamond, not clickable) only if that changes
// no line of sight between a cell someone can stand on and any other cell; otherwise, or if a walkable cell is
// white, the map is dropped (docs/server.md "Data").
//
// Placement: a character on cell n is drawn at depth n·100+50 in Object2.clips, so the layer-2 objects of cells > n
// are drawn over it (docs/logic/battlefield.md §1). Cells where they, or the edges of the view, hide more than
// HIDDEN_MAX of a standing character's body are not placement cells.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas, loadImage, Path2D } from "@napi-rs/canvas";
import { uncompressMap, zkArray, decode64, type MapData } from "../../web/src/core/compressor.ts";
import { DataCenter } from "../../web/src/core/datacenter/index.ts";
import { layoutMap } from "../../web/src/core/map.ts";
import { goalDistEstimate, PathFinding } from "../../web/src/core/pathfinding.ts";
import { drawNode } from "../../web/src/runtime/object.ts";
import { _global, MovieClip, Player } from "../../web/src/runtime/player.ts";
import { NO_CX } from "../../web/src/swf/render.ts";
import { G } from "../../web/src/game/globals.ts";
import "../../web/src/game/battlefield/battlefield.ts";
import { battlefieldScripts } from "../../web/src/game/battlefield/scripts.ts";

const ROOT = join(import.meta.dir, "../..");
const SRC = join(ROOT, "vendor/dofedex/maps-2004");
const CACHE = join(process.env.TMPDIR ?? tmpdir(), "dofus-maps-2004-as");
const OUT = join(ROOT, "server/data/maps.json");
const MIN_PARTIAL = 0.98; // partially covered maps kept from this coverage up
const MIN_AREA = 40; // walkable cells in the largest connected area (partially covered maps; full ones only need 2 teams)
const PER_TEAM = 4; // options go up to "DD" (4 vs 4)
const WHITE_PX = 150; // visible pixels of a cell's white diamond (a whole one is ~700 at 100 %) that make a white tile (thinner slivers at wall bases stay)
const HIDDEN_MAX = 0.2; // share of a standing character's body that objects drawn in front of it may cover
const BODY = { x0: -11, x1: 11, y0: -50, y1: -4 }; // body box around the cell centre (class sprites, team circle excluded)

if (!existsSync(CACHE)) {
  const p = Bun.spawnSync([join(ROOT, "tools/ffdec.sh"), "-format", "script:as", "-export", "script", CACHE, SRC]);
  if (p.exitCode != 0) throw new Error("ffdec failed: " + p.stderr.toString());
}

const exportsOf = (f: string) =>
  new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "web/public/assets/swf/clips", f), "utf8")).exports).map(Number));
const ground = exportsOf("ground.json");
const objects = exportsOf("objects.json");

function coverage(m: MapData): number {
  let refs = 0, ok = 0;
  const ref = (n: number | undefined, set: Set<number>) => {
    if (!n) return;
    refs++;
    if (set.has(n)) ok++;
  };
  ref(Number(m.backgroundNum), ground);
  for (const c of m.data) {
    if (!c.active) continue;
    ref(c.layerGroundNum, ground);
    ref(c.layerObject1Num, objects);
    ref(c.layerObject2Num, objects);
  }
  return refs == 0 ? 1 : ok / refs;
}

/** Largest 4-connected set of walkable cells (movement > 1); neighbours are cells half a cell apart in pixel x (PathFinding.as:196). */
function largestArea(m: MapData): number[] {
  const w = m.width;
  const walk = (n: number) => m.data[n]?.active === true && (m.data[n]!.movement ?? 0) > 1;
  const seen = new Set<number>();
  let best: number[] = [];
  for (let s = 0; s < m.data.length; s++) {
    if (seen.has(s) || !walk(s)) continue;
    const area: number[] = [];
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const c = stack.pop()!;
      area.push(c);
      for (const d of [w, w - 1, -(w - 1), -w]) {
        const n = c + d;
        if (!seen.has(n) && walk(n) && Math.abs(m.data[n]!.x! - m.data[c]!.x!) == 26.5) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (area.length > best.length) best = area;
  }
  return best.sort((a, b) => a - b);
}

// ---- the client's Map.build, headless ----------------------------------------------------------------------------
let seed = 2004;
Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // objects/grounds that pick a random variant
(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const SWF = join(ROOT, "web/public/assets/swf"), W = 742, H = 550;
const player = new Player({
  loader: {
    json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")),
    image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource,
  },
  createCanvas: (w, h) => createCanvas(w, h),
  scriptHook: (k) => battlefieldScripts[k],
});
player.root.$replaceContent(await player.load("AKSClient.swf"));
const dc = new DataCenter();
dc.Game.state = 2; // a fight map
_global.DATACENTER = dc;
player.root.attachMovie("Dofus::BattleField", "bf", 2); // Dofus.Kernel.Init.as:64
const BF = () => G.BATTLEFIELD;
_global.KERNEL = { PathFinding: new PathFinding(dc as never, BF().Selection), traceToChat() {} };
for (let i = 0; i < 400 && !(BF().Container.Ground.attach && BF().Container.Object1.attach && BF().Container.Object2.clips); i++) {
  await new Promise((r) => setTimeout(r, 5));
  player.advance(40);
}

/** White tiles (visible pixels of each line-of-sight cell's diamond) and, per pixel, the highest cell whose layer-2
 *  object covers it. */
function inspect(m: MapData) {
  dc.Map = m;
  BF().clear(); // KERNEL.drawCurrentMap (Dofus.Kernel.as:56-62)
  BF().Map.build(m);
  for (let k = 0; k < 3; k++) player.advance(40);
  const C = BF().Container;
  const pixels = (stageBackground = true) => {
    const c = createCanvas(W, H), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    if (stageBackground) player.render(ctx);
    else drawNode(ctx, player.root, NO_CX);
    return ctx.getImageData(0, 0, W, H).data;
  };
  const stage = (x: number, y: number) => [x * C._xscale / 100 + C._x, y * C._yscale / 100 + C._y] as const;
  // the diamonds show where the frames with and without the Interaction layer differ
  const shown = pixels();
  C.Interaction._visible = false;
  const bare = pixels();
  const white = new Map<number, number>();
  m.data.forEach((c, n) => {
    if (!c.active || !c.lineOfSight) return;
    const [sx, sy] = stage(c.x!, c.y!);
    let px = 0;
    for (let dy = -13; dy <= 13; dy++)
      for (let dx = -26; dx <= 26; dx++) {
        const [x, y] = [Math.round(sx + dx * C._xscale / 100), Math.round(sy + dy * C._yscale / 100)];
        if (Math.abs(dx) / 26.7 + Math.abs(dy) / 13.6 > 1 || x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        if (Math.abs(shown[i]! - bare[i]!) + Math.abs(shown[i + 1]! - bare[i + 1]!) + Math.abs(shown[i + 2]! - bare[i + 2]!) > 30) px++;
      }
    if (px >= WHITE_PX) white.set(n, px);
  });
  // occlusion: render the layer-2 objects one by one
  const layers = ["Ground", "Object1", "Selection", "Grid", "Pointer", "Text", "Effect"].map((k) => C[k] as MovieClip | undefined);
  for (const l of layers) if (l) l._visible = false;
  const objs = C.Object2.clips!.$.children.filter((o) => o._name.startsWith("cell"));
  for (const o of objs) o._visible = false;
  const top = new Int16Array(W * H).fill(-1);
  for (const o of objs) {
    o._visible = true;
    const a = pixels(false), n = Number(o._name.slice(4));
    o._visible = false;
    for (let i = 0; i < W * H; i++) if (a[i * 4 + 3]! > 0 && n > top[i]!) top[i] = n;
  }
  for (const o of [...objs, ...layers, C.Interaction]) if (o) o._visible = true;
  // what the player sees: the Container's mask (Container.applyMask) within the 742×432 view above the banner
  const [mx0, my0] = stage(0, 0), [mx1, my1] = stage(m.width * 53, m.height * 27);
  const inView = (x: number, y: number) => x >= Math.max(0, mx0) && x < Math.min(W, mx1) && y >= Math.max(0, my0) && y < Math.min(432, my1);
  /** Share of a character's body on cell n out of view or covered by objects of cells drawn after it. */
  const hidden = (n: number) => {
    const c = m.data[n]!;
    let all = 0, over = 0;
    for (let dy = BODY.y0; dy <= BODY.y1; dy++)
      for (let dx = BODY.x0; dx <= BODY.x1; dx++) {
        const [x, y] = stage(c.x! + dx, c.y! + dy).map(Math.round) as [number, number];
        all++;
        if (!inView(x, y) || top[y * W + x]! > n) over++;
      }
    return over / all;
  };
  return { white, hidden };
}

/** Clears the line-of-sight bit (bit 0 of the cell's first char, Compressor.as:19-76) of `cells`. */
const clearLos = (mapData: string, cells: number[]) =>
  cells.reduce((d, n) => d.slice(0, n * 10) + zkArray[decode64(d[n * 10])! & ~1] + d.slice(n * 10 + 1), mapData);

/** Lines of sight that differ between two decodings of a map: from every cell a character can stand on to every
 *  line-of-sight cell of `b`, with both ends occupied (raised by the character height: the most permissive case, so
 *  no other placement of characters can see through a cell that this one cannot). */
function losChanges(a: MapData, b: MapData): string[] {
  const view = (m: MapData) => {
    const pf = new PathFinding({
      Map: m,
      Player: { tmpPath: [], tmpFullPath: [], lastClickedCell: null, currentSpell: null, data: undefined },
      Game: { isFight: true },
      Characters: { getItemAt: () => ({ guild: 1 }) },
    });
    return (from: number, to: number) => {
      m.data[from]!.playerOnID = 1;
      m.data[to]!.playerOnID = 2;
      const v = pf.checkView(from, to);
      delete m.data[from]!.playerOnID;
      delete m.data[to]!.playerOnID;
      return v;
    };
  };
  const [va, vb] = [view(a), view(b)];
  const out: string[] = [];
  b.data.forEach((f, from) => {
    if (!f.active || !f.movement) return;
    b.data.forEach((t, to) => {
      if (to != from && t.active && t.lineOfSight && va(from, to) != vb(from, to)) out.push(`${from}→${to}`);
    });
  });
  return out;
}

interface OutMap {
  id: number;
  width: number;
  height: number;
  backgroundNum: number;
  mapData: string;
  coverage: number;
  places: [number[], number[]];
  losCleared?: number[];
  source: string;
  provenance: string;
}

const maps: OutMap[] = [];
const all: { id: number; dir: string; mapData: string; m: MapData; cov: number }[] = []; // every decodable map (world maps)
for (const dir of readdirSync(CACHE).sort()) {
  const as = readFileSync(join(CACHE, dir, "scripts/frame_1/DoAction.as"), "utf8");
  const v = (k: string) => as.match(new RegExp(`^${k} = (.*);$`, "m"))?.[1];
  const [id, width, height, backgroundNum] = ["id", "width", "height", "backgroundNum"].map((k) => Number(v(k)));
  const decode = (d: string) => uncompressMap(id!, undefined, width!, height!, false, backgroundNum!, d);
  const original = JSON.parse(v("mapData") ?? '""') as string;
  const m = decode(original);
  const cells = m.data.length;
  if (cells != height! * width! + (height! - 1) * (width! - 1) || cells > 1024) continue; // path codes are 10-bit
  const cov = coverage(m);
  all.push({ id: id!, dir, mapData: original, m, cov });
  if (cov < MIN_PARTIAL) continue;
  layoutMap(m);
  const area = largestArea(m).filter((c) => m.data[c]!.lineOfSight); // fight grid is drawn on line-of-sight cells
  if (area.length < (cov == 1 ? 2 * PER_TEAM : MIN_AREA)) continue;
  const { white, hidden } = inspect(m);
  const whiteCells = [...white.keys()];
  const standable = whiteCells.filter((n) => m.data[n]!.movement);
  if (standable.length) {
    console.log(`${id}: dropped, white tiles on cells a character can stand on: ${standable.join(", ")}`);
    continue;
  }
  const mapData = clearLos(original, whiteCells);
  const changes = losChanges(m, decode(mapData));
  if (changes.length) {
    console.log(`${id}: dropped, clearing the line of sight of white tiles ${whiteCells.join(", ")} changes ${changes.length} lines of sight (${changes.slice(0, 5).join(" ")}…)`);
    continue;
  }
  const visible = area.filter((c) => hidden(c) <= HIDDEN_MAX);
  if (visible.length < 2 * PER_TEAM) {
    console.log(`${id}: dropped, only ${visible.length} cells where a character is not hidden by objects`);
    continue;
  }
  maps.push({
    id: id!, width: width!, height: height!, backgroundNum: backgroundNum!, mapData,
    coverage: Math.round(cov * 1000) / 1000,
    places: [visible.slice(0, PER_TEAM), visible.slice(-PER_TEAM)],
    ...(whiteCells.length ? { losCleared: whiteCells } : {}),
    source: `vendor/dofedex/maps-2004/${dir}`,
    provenance: cov == 1 ? "post_beta_2004_full_beta_graphics" : "post_beta_2004_partial_beta_graphics",
  });
}
maps.sort((a, b) => b.coverage - a.coverage || a.id - b.id);

// ---- World maps (docs/server.md stage 3b) -------------------------------------------------------------------------
// Plate = object 1030 (the round "sun" tile at the map edges, clips/objects.swf) on either object layer of a walkable
// cell. Links: the unconditional teleport cells (action 0, event 1) of a Dofus Retro 1.39.8 emulator dump,
// vendor/starloco/scripted_cells.sql (provenance retro_emulator). Plate p of map A → (B, c) is kept when B is a map of
// the same size with WORLD_MIN coverage and a plate of B within 2 cells of c teleports back to A; the arrival cell is
// that plate (the nearest to c), and the link must exist both ways. The world is the largest set of maps connected by
// such links (a fallback on map positions + plates added no map to it: docs/server.md "World maps").
const WORLD_MIN = 0.8, PLATE = 1030;
const teleports = new Map<string, [number, number]>();
for (const t of readFileSync(join(ROOT, "vendor/starloco/scripted_cells.sql"), "utf8").matchAll(/^INSERT INTO `scripted_cells` VALUES \((\d+), (\d+), 0, 1, '(\d+),(\d+)', '-1'\);$/gm))
  teleports.set(`${t[1]}:${t[2]}`, [Number(t[3]), Number(t[4])]);
const candidates = new Map(all.filter((a) => a.cov >= WORLD_MIN).map((a) => [a.id, a]));
const platesOf = (m: MapData) =>
  m.data.flatMap((c, n) => (c.active && (c.movement ?? 0) > 1 && (c.layerObject1Num == PLATE || c.layerObject2Num == PLATE) ? [n] : []));
const oneWay = new Map<number, Map<number, [number, number]>>();
for (const a of candidates.values()) {
  for (const p of platesOf(a.m)) {
    const [to, c] = teleports.get(`${a.id}:${p}`) ?? [];
    const b = candidates.get(to!);
    if (!b || b.m.data.length != a.m.data.length) continue; // same size: docs/protocol/game.md GW, travel
    const d = (q: number) => goalDistEstimate(q, c!, b.m.width);
    const back = platesOf(b.m).filter((q) => teleports.get(`${b.id}:${q}`)?.[0] == a.id && d(q) <= 2).sort((x, y) => d(x) - d(y) || x - y);
    if (back.length) oneWay.set(a.id, (oneWay.get(a.id) ?? new Map()).set(p, [b.id, back[0]!]));
  }
}
const links = new Map([...oneWay].map(([id, l]) => [id, new Map([...l].filter(([, [to, q]]) => oneWay.get(to)?.get(q)?.[0] == id))]));
const seen = new Set<number>();
let world: number[] = [];
for (const s of links.keys()) {
  if (seen.has(s)) continue;
  const comp = [s];
  seen.add(s);
  for (let i = 0; i < comp.length; i++) for (const [to] of links.get(comp[i]!)!.values()) if (!seen.has(to)) seen.add(to), comp.push(to);
  if (comp.length > world.length) world = comp;
}
world.sort((a, b) => a - b);
const worldMaps = world.map((id) => {
  const { dir, mapData, m, cov } = candidates.get(id)!;
  return {
    id, width: m.width, height: m.height, backgroundNum: Number(m.backgroundNum), mapData,
    coverage: Math.round(cov * 1000) / 1000,
    links: Object.fromEntries(links.get(id)!),
    source: `vendor/dofedex/maps-2004/${dir}`,
    provenance: cov == 1 ? "post_beta_2004_full_beta_graphics" : "post_beta_2004_partial_beta_graphics",
  };
});

// Names (lang table M, read by getMapText) from maps_fr_35 like the fight maps (docs/content-reconstruction.md §3 M):
// MA.m[id] = {x, y, sa} has no name, so the sub-area name MA.sa[sa].n, or the area name MA.a[a].n when the sub-area
// name is "//<area>". Only ids without a name are added.
const LANG = join(process.env.TMPDIR ?? tmpdir(), "dofus-maps-fr-35-as");
if (!existsSync(LANG)) {
  const p = Bun.spawnSync([join(ROOT, "tools/ffdec.sh"), "-format", "script:as", "-export", "script", LANG, join(ROOT, "vendor/dofedex/lang-fr/maps_fr_35.swf")]);
  if (p.exitCode != 0) throw new Error("ffdec failed: " + p.stderr.toString());
}
const langAs = readFileSync(join(LANG, "scripts/frame_1/DoAction.as"), "utf8");
const entry = (table: string, k: number) => langAs.match(new RegExp(`^MA\\.${table}\\[${k}\\] = (\\{.*\\});$`, "m"))![1]!;
const field = (e: string, f: string) => e.match(new RegExp(`[{,]${f}:("(?:[^"\\\\]|\\\\.)*"|-?\\d+)`))![1]!;
const text = (e: string) => field(e, "n").slice(1, -1).replace(/\\(.)/g, "$1");
const FR = join(ROOT, "web/public/lang/fr.json"), FR_PROV = join(ROOT, "web/public/lang/fr.provenance.json");
const fr = JSON.parse(readFileSync(FR, "utf8")), frProv = JSON.parse(readFileSync(FR_PROV, "utf8"));
const named = world.filter((id) => !fr.M[id]);
for (const id of named) {
  const m = entry("m", id), sa = Number(field(m, "sa")), s = entry("sa", sa), a = Number(field(s, "a")), area = text(entry("a", a));
  const viaArea = text(s).startsWith("//");
  fr.M[id] = { n: viaArea ? area : text(s), d: "" };
  frProv.tables.M[id] = {
    confidence: "low",
    fields: {
      n: {
        source: "retro_fr",
        evidence: `vendor/dofedex/lang-fr/maps_fr_35.swf MA.m[${id}] = ${m} (MA.m entries have no name field) → MA.sa[${sa}].n '${text(s)}' ` +
          (viaArea ? `(sub-area name with a '//' prefix, as 49 of 320 sub-area names have) → MA.a[${a}].n '${area}' (area name used)` : `(sub-area name used; area MA.a[${a}].n '${area}')`),
        note: "post-beta 2004 world map served by server/data/maps.json (world); beta 5b had no world maps",
      },
      d: { source: "authored", evidence: "none", note: "never read (the AS reads only .n: AKSClient/Events.AKS.Game.as:17, 36, 84)" },
    },
  };
  frProv._counts["tables.retro_fr"]++;
  frProv._counts["tables.authored"]++;
}
if (named.length) {
  writeFileSync(FR, JSON.stringify(fr, null, 1) + "\n");
  writeFileSync(FR_PROV, JSON.stringify(frProv, null, 1) + "\n");
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      provenance:
        "Generated by scripts/server-data/maps.ts from vendor/dofedex/maps-2004 (map SWFs dated July 2004 or later, i.e. post-beta 1.0-era maps, NOT beta 5b arena maps). mapData is copied verbatim, except the line-of-sight bit cleared on the cells listed in losCleared (authored: unwalkable cells the map leaves bare, which this client draws as white diamonds; clearing changes no line of sight between cells a character can stand on). coverage = share of ground/object references drawn by beta 5b clips. places = placement cells per team (authored by the script: first/last cells of the largest walkable line-of-sight area where objects drawn in front do not hide a standing character).",
      maps,
      worldProvenance:
        `world = role-play maps of the social village (docs/server.md stage 3b), same sources; mapData verbatim. links = plate cell → [map, arrival cell]: retro_emulator, the unconditional teleport cells of vendor/starloco/scripted_cells.sql (Dofus Retro 1.39.8 emulator data) kept only where they join two map-change plates (object ${PLATE}) of these 2004 maps, both ways; the arrival cell is the plate of the destination map that teleports back. The world is the largest set of maps with coverage >= ${WORLD_MIN} connected by such links.`,
      world: worldMaps,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${maps.length} maps (${maps.filter((m) => m.coverage == 1).length} fully covered) → ${OUT}`);
console.log(`world: ${world.length} maps, ${worldMaps.reduce((n, w) => n + Object.keys(w.links).length, 0)} links (${world.join(", ")}); ${named.length} names added to fr.json`);
process.exit(0);
