// Battlefield port, headless: occupancy helper, then a scene on map 507 (vendor/dofedex substitute 2004 map, beta
// graphics only) built through Map.build with the real clips/ground.swf + clips/objects.swf scripts, two characters
// coloured through CCOLORS (called back by the sprite SWFs' own `cColors.applyColor`) with their default weapons, a
// walk along a pathFind result, a cast, the range/area pointer, path preview by mouse roll-over, a bubble and a
// floating number. PNGs go to web/public/assets/port-preview/battlefield/. No JPEXS reference exists for a whole map:
// the visual bar is sanity.
import { beforeAll, expect, test } from "bun:test";
import { isolateGlobals } from "../testGlobals.ts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, Path2D } from "@napi-rs/canvas";
import { makeFullPath, uncompressMap } from "../../core/compressor.ts";
import { CELL_SPELL_EFFECT_COLOR, CELL_SPELL_RANGE_COLOR } from "../../core/constants.ts";
import { createCharacter, DataCenter, type Character } from "../../core/datacenter/index.ts";
import { layoutMap } from "../../core/map.ts";
import { MAP_507 } from "../../core/map507.fixture.ts";
import { PathFinding, type PathFindingDataCenter } from "../../core/pathfinding.ts";
import { NO_CX } from "../../swf/render.ts";
import { drawNode } from "../../runtime/object.ts";
import { _global, MovieClip, Player } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import { Sequencer } from "../kernel/sequencer.ts";
import "./battlefield.ts";
import type { BattleFieldCharacter } from "./characters.ts";
import { CharactersColors, CharactersWeapons } from "./colorsWeapons.ts";
import type { Cell } from "./interaction.ts";
import type { CharacterData } from "./deps.ts";
import { leaveCell, setNewCell } from "./occupancy.ts";
import { battlefieldScripts } from "./scripts.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const ROOT = join(import.meta.dir, "../../../..");
const SWF = join(ROOT, "web/public/assets/swf"), OUT = join(ROOT, "web/public/assets/port-preview/battlefield");
mkdirSync(OUT, { recursive: true });
for (const f of ["Verdana-c2158db2.ttf", "Verdana-bold-a1ed6d4e.ttf", "bitMini6-477eb65d.ttf"]) GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media/fonts", f));

const map507 = () => uncompressMap(MAP_507.id, "507", MAP_507.width, MAP_507.height, false, MAP_507.backgroundNum, MAP_507.mapData);

test("occupancy: setNewCell / leaveCell keep the AS semantics", () => {
  const map = map507();
  layoutMap(map);
  const a = { num: 1, cell: null as number | null, team: 0 };
  const chars = { keys: { "1": null } as Record<string, null>, getItemAt: () => a };
  setNewCell(map, chars, a, 98, true);
  expect([map.data[98]!.playerOnID, a.cell]).toEqual([1, 98]);
  expect(Object.keys(map.TacleZoneTeam0!).map(Number).sort((x, y) => x - y)).toEqual([89, 90, 106, 107]);
  setNewCell(map, chars, a, 107, false); // a path step: occupancy moves, tackle zones stay
  expect([map.data[98]!.playerOnID, map.data[107]!.playerOnID]).toEqual([undefined, 1]);
  expect(map.TacleZoneTeam0![89]).toBe(true);
  setNewCell(map, chars, a, undefined, true); // die: nobody gets the id, data moves to cell Number(undefined) = 0
  expect([map.data[107]!.playerOnID, map.data[0]!.playerOnID, a.cell]).toEqual([undefined, undefined, 0]);
  expect(map.TacleZoneTeam0).toEqual({}); // recomputed around cell 0, which is inactive on 507 (no x): nothing marked
  map.data[0]!.playerOnID = 5;
  leaveCell(map, { num: 1, cell: null }); // data[null] is no cell, not cell 0
  expect(map.data[0]!.playerOnID).toBe(5);
});

// ---- scene ---------------------------------------------------------------------------------------
isolateGlobals();
let p: Player;
let dc: DataCenter;
let feca: BattleFieldCharacter, iop: BattleFieldCharacter;
const BF = () => G.BATTLEFIELD;

async function settle(ok: () => boolean, max = 200) {
  for (let i = 0; i < max && !ok(); i++) await new Promise((r) => setTimeout(r, 5)), p.advance(40);
  expect(ok()).toBe(true);
}
const frame = () => p.advance(40); // one 25 fps tick (plus intervals)
function stagePng(name: string) {
  const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  p.render(ctx);
  writeFileSync(join(OUT, name), c.toBuffer("image/png"));
}
/** Stage region around (cx, cy) at 2×, labelled, as one strip cell. */
function snap(cx: number, cy: number, w: number, h: number, label: string) {
  const c = createCanvas(w, h), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2 - cx, h / 2 - cy);
  drawNode(ctx, p.root, NO_CX);
  return (out: CanvasRenderingContext2D) => {
    out.drawImage(c as unknown as CanvasImageSource, 0, 0);
    out.fillStyle = "#fff";
    out.font = "8px sans-serif";
    out.fillText(label, 2, 9);
  };
}
function strip(name: string, frames: ReturnType<typeof snap>[], w: number, h: number, scale = 2) {
  const cols = Math.min(frames.length, 8), rows = Math.ceil(frames.length / cols);
  const c = createCanvas(cols * w * scale, rows * h * scale), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  frames.forEach((f, i) => {
    ctx.save();
    ctx.translate((i % cols) * w * scale, Math.floor(i / cols) * h * scale);
    ctx.scale(scale, scale);
    f(ctx);
    ctx.restore();
  });
  writeFileSync(join(OUT, name), c.toBuffer("image/png"));
}
/** Stage position of a cell centre (Container scale + offset, as Events.Battlefield.Interaction.as:23). */
function stageXY(cell: number) {
  const c = dc.Map.data[cell]!, C = BF().Container;
  return { x: c.x! * (C._xscale / 100) + C._x, y: c.y! * (C._yscale / 100) + C._y };
}
/** Colour offsets [r,g,b] of every flat-filled (multipliers 0) clip under `root`. */
function flatColours(root: MovieClip): Set<string> {
  const out = new Set<string>();
  const walk = (c: MovieClip) => {
    for (const k of c.$.children) {
      if (k.$.cx[0] === 0 && k.$.cx[1] === 0 && k.$.cx[2] === 0) out.add(k.$.cx.slice(4, 7).join(","));
      if (k instanceof MovieClip) walk(k);
    }
  };
  walk(root);
  return out;
}
const hasClipFrom = (root: MovieClip, src: string): boolean =>
  root.$.children.some((k) => k.$.swf?.file.src === src || (k instanceof MovieClip && hasClipFrom(k, src)));

function addCharacter(id: number, name: string, ca: Parameters<typeof createCharacter>[3], dir: number): CharacterData {
  const c = createCharacter(dc, id, name, ca) as Character & Partial<CharacterData>;
  c.SEQUENCER_anim = new Sequencer();
  c.SEQUENCER_actions = new Sequencer();
  c.dir = dir; // createCharacter's `celdirl` typo turns any given dir into 0 (README §0); set it as a move would
  return c as CharacterData;
}

beforeAll(async () => {
  p = new Player({
    loader: {
      json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")),
      image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource,
    },
    createCanvas: (w, h) => createCanvas(w, h),
    scriptHook: (k) => battlefieldScripts[k],
  });
  p.root.$replaceContent(await p.load("AKSClient.swf"));
  dc = new DataCenter();
  dc.Game.state = 2; // a free multiplayer game: fight rules, team circles
  Object.assign(_global, { DATACENTER: dc, CCOLORS: new CharactersColors(), WEAPONS: new CharactersWeapons() });
  p.root.attachMovie("Dofus::BattleField", "bf", 2); // Dofus.Kernel.Init.as:64
  _global.KERNEL = { PathFinding: new PathFinding(dc as unknown as PathFindingDataCenter, BF().Selection), traceToChat() {} };
  const C = BF().Container;
  await settle(() => !!(C.Ground.attach && C.Object1.attach && C.Object2.clips));
});

test("Kernel.Init flow: BATTLEFIELD and its children", () => {
  const bf = BF();
  expect(bf).toBe(p.root.bf as typeof bf);
  expect(["Container", "Objects", "Map", "Selection", "Pointer", "Characters", "Spells", "Effects", "Interaction"].map((k) => (bf[k] as MovieClip).getDepth())).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
  expect(bf.Map.cell_width).toBe(53);
});

test("map 507: Map.build attaches ground, object layers, grid and interaction cells", () => {
  dc.Map = map507();
  BF().clear(); // KERNEL.drawCurrentMap (Dofus.Kernel.as:56-62)
  BF().Container._visible = false;
  BF().Map.build(dc.Map);
  const C = BF().Container, cells = dc.Map.data.map((c, i) => [c, i] as const).filter(([c]) => c.active);
  expect(C._visible).toBe(true); // onMapLoad
  expect([C._x, C._y]).toEqual([159, 67.5]); // centerMap: (742 − 53·8)/2, (432 − 27·11)/2
  expect(C.Ground.clips!.$.children.length).toBe(cells.filter(([c]) => c.layerGroundNum).length);
  expect(C.Object1.clips!.$.children.length).toBe(cells.filter(([c]) => c.layerObject1Num).length);
  expect(Object.keys(BF().Objects.list).length).toBe(cells.filter(([c]) => c.layerObject2Num).length);
  expect((C.Interaction.layer0 as MovieClip).$.children.length).toBe(cells.filter(([c]) => c.lineOfSight).length);
  const g = C.Grid.cell98 as MovieClip;
  frame();
  expect([g._x, g._y, g._currentframe]).toEqual([238.5, 148.5, 1]); // flat cell: the stop() hook keeps frame 1
  C.show("Grid", true);
  stagePng("map-507-grid.png");
  C.show("Grid", false);
  stagePng("map-507.png");
});

test("characters: placed by onInitFrame, coloured through cColors, default weapons from their sprite", async () => {
  dc.Player.ID = "1";
  const f = addCharacter(1, "Féca", { gfxID: "10", color1: "3060c0", color2: "c02818", color3: "f0d040", weapon: "4,1,000000", team: "0", cell: "98", AP: "10", LP: "48" }, 0);
  const i = addCharacter(2, "Iop", { gfxID: "80", color1: "e8e8e8", color2: "ff7000", color3: "6a3a1c", weapon: "6,1,000000", team: "1", cell: "149", AP: "8", LP: "55" }, 2);
  feca = BF().Characters.build(f);
  iop = BF().Characters.build(i);
  expect(f.clip).toBe(feca);
  await settle(() => feca.sprite.clip.$.loaded === true && iop.sprite.clip.$.loaded === true && dc.Map.data[149]!.playerOnID === 2);
  for (let k = 0; k < 3; k++) frame();
  expect([feca.sprite._x, feca.sprite._y, feca.sprite.getDepth()]).toEqual([238.5, 148.5, 98 * 100 + 50]);
  expect([iop.sprite.getDepth(), iop.sprite.clip._xscale, f.anim]).toEqual([149 * 100 + 50, 100, "static"]);
  expect(dc.Map.TacleZoneTeam1![140]).toBe(true); // around the Iop
  // CCOLORS.applyColor reached from the sprites' own `cColors.applyColor(child, zone)` (case-insensitive global).
  const fc = flatColours(feca.sprite.clip), ic = flatColours(iop.sprite.clip);
  expect(["48,96,192", "192,40,24", "240,208,64"].every((c) => fc.has(c))).toBe(true);
  expect(["232,232,232", "255,112,0"].every((c) => ic.has(c))).toBe(true);
  // WEAPONS.applyWeapon attached `4_1` / `6_1`, imported from weapons.swf by each sprite.
  expect(hasClipFrom(feca.sprite.clip, "clips/sprites/weapons/weapons.swf")).toBe(true);
  expect(hasClipFrom(iop.sprite.clip, "clips/sprites/weapons/weapons.swf")).toBe(true);
  await settle(() => !!feca.sprite.circle?.animate && !!iop.sprite.circle?.animate); // team circles (multiplayer)
  frame();
  stagePng("characters.png");
});

test("walk: moveCharacterThroughPath along a pathFind result, path cells selected then marked walked", () => {
  const pf = (G as unknown as { KERNEL: { PathFinding: PathFinding } }).KERNEL.PathFinding;
  pf.pathFind(98, 156, true);
  const path = makeFullPath([98, ...dc.Player.tmpPath!.map((s) => s.num)], dc.Map.width); // what the server echoes
  expect(path[path.length - 1]).toBe(156);
  const data = feca.data, Q = data.SEQUENCER_actions;
  Q.addAction(true, feca, feca.moveCharacterThroughPath, [path, true]);
  Q.play();
  p.runQueue(); // end of the calling event: the new animation's frame scripts (cColors, WEAPONS) run before drawing
  expect(BF().Selection.selectedCells.length).toBeGreaterThan(0);
  const frames: ReturnType<typeof snap>[] = [];
  let n = 0;
  while (Q.isPlaying() && n < 400) {
    if (n % 3 === 0 && frames.length < 32) frames.push(snap(feca.sprite._x + 159, feca.sprite._y + 40, 120, 110, `${n} c${data.cell} ${data.anim}`));
    frame();
    n++;
  }
  strip("walk.png", frames, 120, 110);
  expect(Q.isPlaying()).toBe(false);
  expect([data.cell, dc.Map.data[156]!.playerOnID, dc.Map.data[98]!.playerOnID, data.anim]).toEqual([156, 1, undefined, "static"]);
  // Cell 156 centre is (159, 243); per-frame `_x +=` truncates to twips, as Flash does, so the sprite lands a hair short.
  expect(Math.abs(feca.sprite._x - 159) < 0.5 && Math.abs(feca.sprite._y - 243) < 0.5).toBe(true);
  expect(feca.sprite.getDepth()).toBe(156 * 100 + 50);
  expect(BF().Selection.selectedCells.length).toBe(0); // unSelectAll queued after the last step
});

test("cast: the Féca's cast animation ends the step at its end() frame, then the spell plays on the target", async () => {
  const data = feca.data, Q = data.SEQUENCER_actions, seq = data.SEQUENCER_anim;
  const spell = { file: "clips/spells/903.swf", m_Level: 3, m_bInFrontOfPlayer: true };
  await p.load(spell.file); // loadMovie stays asynchronous: the loop below yields once per frame
  Q.addAction(true, feca, feca.cast, [11, spell, { cellFrom: 156, cellTo: 149 }]);
  Q.play();
  p.runQueue();
  expect([data.dir, data.anim, feca.sprite.clip._xscale]).toEqual([3, "cast", -100]); // target up-right: CastL mirrored
  const frames: ReturnType<typeof snap>[] = [];
  let ended = -1, spellShown = false;
  for (let n = 1; n <= 40; n++) {
    await new Promise((r) => setTimeout(r, 0));
    frame();
    if (ended < 0 && !seq.isPlaying()) ended = n;
    spellShown ||= BF().Spells.Garbage[0]?.clip?.$.loaded === true;
    if (n % 2 === 0 && frames.length < 20) frames.push(snap(212 + 159, 220 + 67, 150, 110, `${n} ${data.anim}`));
  }
  strip("cast.png", frames, 150, 110);
  expect(ended).toBeGreaterThan(10); // the anim queue waited for the sprite's this.end()
  expect(Q.isPlaying()).toBe(false);
  expect(data.anim).toBe("static"); // getActionClip().wait() at the end of CastR
  expect(BF().Spells.Garbage.length).toBe(1);
  expect(spellShown).toBe(true); // Spells.launch put clips/spells/903.swf on the target cell
});

test("cast type 30 (arc, the server's other launch types besides 10/11): the projectile flies, lands, the step ends", async () => {
  const data = feca.data, Q = data.SEQUENCER_actions, seq = data.SEQUENCER_anim;
  const spell = { file: "clips/spells/207.swf", m_Level: 1, m_bInFrontOfPlayer: true }; // exports `move` and `shoot`
  await p.load(spell.file);
  const errors: unknown[] = [], error = console.error;
  console.error = (...a: unknown[]) => void errors.push(a);
  try {
    Q.addAction(true, feca, feca.cast, [30, spell, { cellFrom: 156, cellTo: 149 }]);
    Q.play();
    p.runQueue();
    let landed = false;
    for (let n = 1; n <= 120 && (seq.isPlaying() || Q.isPlaying()); n++) {
      await new Promise((r) => setTimeout(r, 0));
      frame();
      landed ||= BF().Spells.Garbage.some((s) => (s?.clip as MovieClip | undefined)?.shoot !== undefined);
    }
    expect(landed).toBe(true);
    expect(seq.isPlaying() || Q.isPlaying()).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    console.error = error;
  }
});

test("pointer, selection and roll-over: range circle, area shape, path preview from a real mouse move", async () => {
  const P = BF().Pointer, I = BF().Interaction;
  P.clearAll();
  P.addShape("C", 1, CELL_SPELL_EFFECT_COLOR);
  P.drawFixedCircle(3, CELL_SPELL_RANGE_COLOR, 156); // KERNEL.switchToSpellLaunch (Dofus.Kernel.as:142-160)
  P.draw(149);
  const fixed = P.container.fixedZone!, drag = P.container.dragZone!;
  expect([drag._x, drag._y]).toEqual([238.5, 229.5]); // cell 149, ground offset removed (level 7)
  const b = fixed.getBounds(fixed._parent);
  expect(b.xMax - b.xMin).toBe((2 * 3 + 2) * 26.5 + 1); // |ΔX| + |ΔY| <= 3 spans (2r+2) half cells, plus the 1 px outline
  await settle(() => !!iop.sprite.circle?.animate);
  // Cells sit under the ground (Container depth 100): the player's hit test must still reach them.
  I.setType("move");
  I.setEnabled(3);
  const t = stageXY(174);
  p.mouseMove(t.x, t.y);
  expect((p.target() as Cell).num).toBe(174);
  expect(BF().Selection.selectedCells.map((c) => c?._name)).toEqual(["cell1658", "cell1748"]); // calculatePath preview, depth 8
  feca.say("Bonjour !");
  iop.showPoints("life", -12); // red on the red bed: drawn, low contrast
  feca.showPoints("action", -3);
  for (let k = 0; k < 4; k++) frame();
  stagePng("pointer.png");
  expect(iop.data.anim).toBe("hit");
});

test("map change: clear + rebuild with characters on the map (KERNEL.drawCurrentMap), pointer in the new clip", () => {
  const C = BF().Container, oldPointer = C.Pointer, grounds = C.Ground.clips!.$.children.length;
  BF().clear();
  expect([feca.sprite.$.removed, C.Ground.clips!.$.children.length, oldPointer.$.removed]).toEqual([true, 0, true]);
  BF().Map.build(dc.Map);
  expect(C.Ground.clips!.$.children.length).toBe(grounds);
  BF().Pointer.clearAll();
  BF().Pointer.addShape("X", 2, CELL_SPELL_EFFECT_COLOR);
  BF().Pointer.draw(131);
  expect(BF().Pointer.container).toBe(C.Pointer); // path re-resolution emulated: not the removed clip
  expect((C.Pointer.dragZone as MovieClip).getBounds().xMin).toBeLessThan(6710886);
});
