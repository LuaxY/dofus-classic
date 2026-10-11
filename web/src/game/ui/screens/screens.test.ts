// B2 screens: script-table sanity + headless renders on the real runtime with B1's INTERFACE/components, A's
// CCOLORS/WEAPONS and the core DATACENTER filled by hand; AKS/KERNEL/BATTLEFIELD/CHAT are recording stand-ins.
// PNGs: web/public/assets/port-preview/screens/. Assertions never read text content (lang data is agent D's).
import { beforeAll, expect, test } from "bun:test";
import { isolateGlobals } from "../../testGlobals.ts";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, loadImage, Path2D } from "@napi-rs/canvas";
import { createCharacter, DataCenter, getItemObjectFromData, getSpellObjectFromData } from "../../../core/datacenter/index.ts";
import { setLangData, type LangData } from "../../../core/lang.ts";
import { _global, type MovieClip, Player } from "../../../runtime/player.ts";
import { CharactersColors, CharactersWeapons } from "../../battlefield/colorsWeapons.ts";
import { G } from "../../globals.ts";
import { scripts as b1Scripts } from "../scripts.ts";
import type { Class_InterfaceBanner } from "./banner.ts";
import type { Class_Characters } from "./characters.ts";
import type { LoginInterface } from "./login.ts";
import type { Class_InterfaceMultiPlayer } from "./multiplayer.ts";
import { screensScripts } from "./scripts.ts";

(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
const ROOT = join(import.meta.dir, "../../../../..");
const SWF = join(ROOT, "web/public/assets/swf"), OUT = join(ROOT, "web/public/assets/port-preview/screens");
const MI = join(ROOT, "decompiled/clean/modules_Interfaces");
mkdirSync(OUT, { recursive: true });

// ---- the hook table points at real decompiled scripts ----------------------------------------------------------
test("every script key names an existing modules_Interfaces script", () => {
  const dirs = readdirSync(MI);
  const keys = Object.keys(screensScripts);
  expect(keys.length).toBeGreaterThan(400);
  for (const key of keys) {
    const m = key.match(/^modules\/Interfaces\.swf#(?:btn(\d+):(\w+)|(\d+)@(\d+)(?::(\d+):(\w+))?)$/);
    expect(m, key).not.toBeNull();
    const [, btn, bev, sprite, frame, depth, ev] = m!;
    const top = dirs.find((d) => d.split("_")[1] === (btn ?? sprite) && d.startsWith(btn ? "DefineButton2_" : "DefineSprite_"));
    expect(top, key).toBeDefined();
    if (btn) {
      expect(readdirSync(join(MI, top!)).some((f) => f.includes(bev!)), key).toBe(true);
    } else if (!depth) expect(existsSync(join(MI, top!, `frame_${frame}`, "DoAction.as")), key).toBe(true);
    else {
      const fdir = join(MI, top!, `frame_${frame}`), po = readdirSync(fdir).find((f) => f.startsWith("PlaceObject2_") && f.endsWith("_" + depth));
      expect(po, key).toBeDefined();
      expect(readdirSync(join(fdir, po!)).some((f) => f.includes(`(${ev}`) || f.includes(`, ${ev}`)), key).toBe(true);
    }
  }
});

/** Component internals and boxes (B1), and the dead creation screen (docs/logic/ui.md §2.6: S678, S694, B662–B711, B725). */
const NOT_OURS = /^DefineSprite_(144|186|188|191|193|196|199|200|203|229|236|237|240|244|24|27|434|458|464|469|473|478|479|484|486|489|490|491|733|895|897|906|907|909|678|694)_|^DefineButton2_(66[2-9]|6[7-9]\d|70\d|71[01]|725)(_|$)/;
test("every B2-owned modules_Interfaces script has a key", () => {
  const files: string[] = [];
  const walk = (d: string): void => void readdirSync(join(MI, d), { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : files.push(join(d, e.name))));
  for (const top of readdirSync(MI)) if (/^Define(Sprite|Button2)_/.test(top) && !NOT_OURS.test(top + "_")) walk(top);
  const missing = files.filter((f) => {
    const [top, a, b, c] = f.split("/"), id = top!.split("_")[1];
    const evs = (s: string) => s.replace(/.*\(([^)]*)\)\.as$/, "$1").split(/,\s*/);
    const keys = top!.startsWith("DefineButton2_") ? evs(a!).map((e) => `btn${id}:${e}`)
      : b === "DoAction.as" ? [`${id}@${a!.slice(6)}`] : evs(c!).map((e) => `${id}@${a!.slice(6)}:${b!.split("_").pop()}:${e}`);
    return keys.some((k) => !screensScripts["modules/Interfaces.swf#" + k]);
  });
  expect(missing).toEqual([]);
  expect(files.length).toBeGreaterThan(400);
});

// ---- headless player with the sibling ports --------------------------------------------------------------------
type Call = [string, unknown[]];
const calls: Call[] = [];
/** Records every call made through it; property writes (`AKS.Game.output = this`) are kept. */
function recorder(path: string, init: Record<string, unknown> = {}): unknown {
  const store: Record<string | symbol, unknown> = { ...init };
  return new Proxy(function () {}, {
    get: (_t, k) => (k in store ? store[k] : typeof k === "symbol" ? undefined : (store[k] = recorder(`${path}.${k}`))),
    set: (_t, k, v) => ((store[k] = v), true),
    apply: (_t, _self, args) => void calls.push([path, args]),
  });
}
const called = (path: string) => calls.filter(([p]) => p === path);

isolateGlobals();
const p = new Player({
  loader: { json: async (f) => JSON.parse(readFileSync(join(SWF, f), "utf8")), image: async (f) => (await loadImage(join(SWF, f))) as unknown as CanvasImageSource },
  createCanvas: (w, h) => createCanvas(w, h),
  scriptHook: (key) => screensScripts[key] ?? b1Scripts[key],
});
const dc = new DataCenter();

async function settle(ticks = 40) {
  for (let i = 0; i < ticks; i++) await new Promise((r) => setTimeout(r, 3)), p.tick();
}
function shot(name: string) {
  const c = createCanvas(742, 550), ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 742, 550);
  p.render(ctx);
  writeFileSync(join(OUT, name), c.toBuffer("image/png"));
}

beforeAll(async () => {
  for (const f of ["fonts/Verdana-c2158db2.ttf", "fonts/Verdana-bold-a1ed6d4e.ttf", "fonts/bitMini6-477eb65d.ttf"])
    GlobalFonts.registerFromPath(join(ROOT, "web/public/assets/media", f));
  const fr = join(ROOT, "web/public/lang/fr.json");
  setLangData(existsSync(fr) ? (JSON.parse(readFileSync(fr, "utf8")) as LangData) : new Proxy({}, { get: (_t, k) => String(k) }));
  Object.assign(_global, {
    DATACENTER: dc, CCOLORS: new CharactersColors(), WEAPONS: new CharactersWeapons(),
    AKS: recorder("AKS"), KERNEL: recorder("KERNEL"), BATTLEFIELD: recorder("BATTLEFIELD"),
    CHAT: recorder("CHAT", { bType1: true, bType2: true, bType3: true, bType4: true }),
  });
  // Player: Iop (guild 8) "Nergal", id 1; two more characters for lists and the timeline
  const hex = (n: number) => n.toString(16);
  const init = (guild: number, sex: number, c: number[], level: string) => ({
    guild: String(guild), sex: String(sex), gfxID: `${guild}${sex}`, level, color1: hex(c[0]!), color2: hex(c[1]!), color3: hex(c[2]!),
    LP: "120", AP: "6", XPlow: "8000", XP: "9729", XPhigh: "11000", force: "12", vitality: "8", bonusPoints: "14",
  });
  createCharacter(dc, 1, "Nergal", init(8, 0, [0x3355aa, 0xffcc00, 0xaa2222], "14"));
  createCharacter(dc, 2, "LaPtitFee", init(7, 1, [0xff88cc, 0x66ccff, 0xffffff], "9"));
  createCharacter(dc, 3, "Pyra", init(9, 1, [0xffaa00, 0x222222, 0xcc3300], "13"));
  dc.Player.ID = "1";
  dc.Player.name = "Nergal";
  // guild spells 141..150 (first three on banner slots 1..3), fire spells 161..164: "id~level~zones~additional"
  for (let i = 0; i < 10; i++) dc.Player.addSpell(getSpellObjectFromData(`${141 + i}~1~Pa~1Fa00dd00aaaaa${"bcd"[i] ?? "a"}`));
  for (let i = 0; i < 4; i++) dc.Player.addSpell(getSpellObjectFromData(`${161 + i}~2~Pa~0Fa00cd00aaaaaa`));

  p.root.$replaceContent(await p.load("AKSClient.swf"));
  const ui = p.root.createEmptyMovieClip("Interfaces", 3);
  ui.loadMovie("modules/Interfaces.swf");
  for (let i = 0; i < 100 && !G.INTERFACE; i++) await settle(1);
  expect(G.INTERFACE).toBeDefined();
});

test("login substitute: kernel contract (txtName/txtPass siblings, onLogin → DATACENTER + AKS.connect)", async () => {
  G.INTERFACE.drawLoginInterface();
  await settle(10);
  const li = G.INTERFACE.CommonLayer_mc.loginInterface as LoginInterface;
  expect(li).toBeDefined();
  expect(li.txtName._parent).toBe(li.txtPass._parent!);
  expect([li.txtName._name, li.txtPass._name, li.txtPass.password]).toEqual(["txtName", "txtPass", true]);
  li.txtName.text = "bob";
  li.txtPass.text = "secret";
  shot("login.png");
  (li.btn_ok!.onRelease as () => void)();
  expect([dc.Player.login, dc.Player.password]).toEqual(["bob", "secret"]);
  expect(called("AKS.connect").length).toBe(1);
  expect(G.AKS.register).toBe(false);
  (li.btn_register!.onRelease as () => void)(); // authored "S'inscrire": same fields, the next logon registers
  expect([dc.Player.login, dc.Player.password, G.AKS.register]).toEqual(["bob", "secret", true]);
  expect(called("AKS.connect").length).toBe(2);
  li.setTextError("x");
  expect(li.txtError._visible).toBe(true);
  li.setTextError();
  expect(li.txtError._visible).toBe(false);
});

test("start menu: UIStartMenu, play → AKS.Account.getCharacters", async () => {
  G.INTERFACE.clear();
  G.INTERFACE.drawMenuInterface();
  await settle(5);
  const m = G.INTERFACE.CommonLayer_mc.MenuInterface!;
  expect(m.constructor.name).toBe("UIStartMenu");
  shot("start-menu.png");
  (m.play_btn as MovieClip & { onRelease(): void }).onRelease();
  expect(called("AKS.Account.getCharacters").length).toBe(1);
});

test("character list: 3 characters + 7 empty slots, select and play", async () => {
  G.INTERFACE.clear();
  const c = G.INTERFACE.draw("Interface::Characters", 1) as Class_Characters;
  const list = [1, 2, 3].map((id) => {
    const d = dc.Characters.getItemAt(id)!;
    return { id, name: d.name, level: d.level, file: d.file, color1: d.color1, color2: d.color2, color3: d.color3, gfxID: d.gfxID };
  });
  c.setCharacters(list);
  await settle(40);
  expect(c.choice0?.constructor.name).toBe("UICharacterChoiceClass");
  expect(c.choice9).toBeDefined();
  c.onSelectCharacter(1, list[1]!);
  await settle(10);
  shot("characters.png");
  screensScripts["modules/Interfaces.swf#644@1:83:release"]!.call(c.btnPlay!);
  expect(called("AKS.Account.setCharacter").at(-1)?.[1]).toEqual([2]);
});

test("character creation: guild, sprite preview, colour menu", async () => {
  G.INTERFACE.clear();
  const ui = G.INTERFACE.draw("dofus::graphics::gui::UICreateCharacter", 1)!;
  await settle(30);
  expect(ui.guildID).toBe(1);
  call(ui, "chooseGuild", 8);
  // open the colour menu as its title bar does (S100/62_10 rel): menu1 closes, menu3 opens
  const acc = ui.$.children.find((k) => k.menu3) as MovieClip & { m1: number; m3: number }; // unnamed S108
  acc.m1 = 0;
  acc.m3 = 1;
  (acc.menu1 as MovieClip).gotoAndPlay(15);
  await settle(60);
  expect(ui.guildID).toBe(8);
  shot("create-character.png");
  call(ui, "createCharacter", "Bob");
  expect(called("AKS.Account.addCharacter").at(-1)?.[1]).toEqual(["Bob", 8, -1, -1, -1, 0]);
});

test("multiplayer lobby: tabs, podium, stats, users", async () => {
  G.INTERFACE.clear();
  const mp = G.INTERFACE.draw("Interface::MultiPlayer", 1) as Class_InterfaceMultiPlayer;
  await settle(10);
  const tabStart = G.AKS.Infos.output as MovieClip;
  expect(tabStart._visible).toBe(true); // TabStart shown by Tabs' first frame
  expect(G.AKS.Game.output).toBe(tabStart); // its onFocus rebinds AKS.Game.output
  [1, 2, 3].forEach((id, place) => {
    const d = dc.Characters.getItemAt(id)!;
    call(tabStart.podium, "buildCharacter", place, { file: d.file, name: d.name, xp: 9729 - place * 300, level: d.level, color1: d.color1, color2: d.color2, color3: d.color3 });
  });
  call(tabStart.GeneralStats, "setValues", 21, 1, 3, 2, 0);
  for (const id of [1, 2, 3]) {
    const d = dc.Characters.getItemAt(id)!;
    mp.addUser({ name: d.name, level: d.level, gfxID: d.gfxID });
  }
  await settle(40);
  shot("multiplayer.png");
  mp.Tabs!.showLayer("TabJoinGame"); // animated, as the buttons do
  expect(G.AKS.Game.output).toBe(mp.Tabs!.TabJoinGame as MovieClip); // onFocus runs synchronously
  await settle(30);
  expect(tabStart._visible).toBe(false);
  shot("multiplayer-join.png");
  // "TabFriends" names the child `tabFriends` (SWF 6 case-insensitive): the slide must end, or every later
  // showLayer returns early (bInMove) and the lobby tabs freeze
  mp.Tabs!.showLayer("TabFriends");
  await settle(30);
  expect([mp.Tabs!.bInMove, (mp.Tabs!.tabFriends as MovieClip)._visible, (mp.Tabs!.TabJoinGame as MovieClip)._visible]).toEqual([false, true, false]);
  const help = mp.helpLayer as MovieClip & { showLayer(i: number): void };
  help.showLayer(5); // "HelpPlayDofusStart" is the child `HelpPLayDofusStart`
  expect((help.HelpPLayDofusStart as MovieClip)._visible).toBe(true);
});

test("in-game banner: spells panel, timeline, chrono", async () => {
  G.INTERFACE.clear();
  dc.Game.state = 2; // free game: isFight
  dc.Game.turnSequence = ["1", "2", "3"];
  dc.Game.currentPlayerID = "1";
  const b = G.INTERFACE.draw("Interface::Banner", 200) as Class_InterfaceBanner;
  await settle(20);
  expect(b.banner.Heart).toBeDefined();
  b.showPanel("Spells");
  b.activateTimeline(true);
  await settle(30);
  b.nextTurnTimeline(2);
  b.startTimer(30);
  p.advance(4000);
  await settle(20);
  expect(b.getCurrentPanel()).toBe("Spells");
  shot("banner.png");
  b.showNextSpellTab();
  expect(b.panels.Spells!.currentTab).toBe("Water");
  // drag/drop onto banner slot us4 with the Spells panel open (Interface.ButtonSpellBanner.as:47-72)
  const spell = dc.Player.SpellsGuild[3]!, added: unknown[][] = [];
  b.onAddUsedSpell = (old, s) => void added.push([old, s]);
  G.INTERFACE.lastSpellcursorData = spell as never;
  (b.banner.us4 as MovieClip & { container: { onRelease(): void } }).container.onRelease();
  expect(added).toEqual([[undefined, spell]]);
  expect([spell.m_Position, G.INTERFACE.lastSpellcursorData]).toEqual([4, undefined]); // the final setSpellCursor(null) copies the (absent) cursor data
});

test("banner panels: inventory, game result, team watcher", async () => {
  const b = G.INTERFACE.UIInterfaceBanner!;
  // "id~type~gfx~RRGGBB~position~effects" (hex): amulet equipped in slot 0, ring / belt / boots in the bag
  for (const d of ["1~1~1~ffffff~0~64#1#5#0", "2~9~1~ffffff~~64#1#5#0", "3~a~1~ffffff~~64#1#5#0", "4~b~1~ffffff~~64#1#5#0"])
    dc.Player.addItem(getItemObjectFromData(d)!); // broadcasts onInventoryChange → InventoryViewer.refresh
  b.showPanel("Inventory");
  await settle(40);
  const viewer = (b.panels.Inventory as MovieClip).inventoryViewer_mc as MovieClip & { inventoryScroller_mc: { count: number }; equipement0_mc: { isEmpty: boolean } };
  expect(viewer.inventoryScroller_mc.count).toBe(3);
  expect(viewer.equipement0_mc.isEmpty).toBe(false);
  shot("inventory.png");
  b.hidePanel();
  dc.Game.Results = {
    winners: [{ id: "1", name: "Nergal", level: 14, winxp: 120, gold: 15, xp: 9849, highXp: 11000, bDead: false }],
    losers: [{ id: "2", name: "LaPtitFee", level: 9, winxp: 20, gold: 0, xp: 3020, highXp: 4000, bDead: true }, { id: "3", name: "Pyra", level: 13, winxp: 25, gold: 0, xp: 8100, highXp: 9000, bDead: true }],
  };
  b.showExtraPanel("GameResultRandom");
  await settle(10);
  const res = b.extraPanels.GameResultRandom as MovieClip;
  expect((res.losers as MovieClip).player1).toBeDefined();
  shot("game-result.png");
  res.removeMovieClip();
  G.INTERFACE.drawTeamWatcher([dc.Characters.getItemAt(1)], [dc.Characters.getItemAt(2), dc.Characters.getItemAt(3)]);
  await settle(30);
  expect(G.INTERFACE.teamWatcher).toBeDefined();
  shot("team-watcher.png");
  G.INTERFACE.hideTeamWatcher();
});

function call(o: unknown, m: string, ...a: unknown[]) {
  return (o as Record<string, (...x: unknown[]) => unknown>)[m]!(...a);
}
