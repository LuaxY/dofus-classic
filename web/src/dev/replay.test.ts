// Headless end-to-end replay: boots the real Player with AKSClient.swf (+ Interfaces.swf, Sound.swf loaded by
// Kernel.init), feeds the "fight" fixture through the WebSocket path, checks DATACENTER / BATTLEFIELD / INTERFACE
// state stage by stage and the exact frames the client sends. PNGs: web/public/assets/port-preview/kernel/.
// Every player action is a mouse click (or typing into a focused input field) through the runtime's own input path,
// on the clip a player would click; the test checks the mouse really lands on it.
import { afterAll, expect, test } from "bun:test";
import { statSync } from "node:fs";
import { join } from "node:path";
import type { MovieClip } from "../runtime/player.ts";
import { G } from "../game/globals.ts";
import { isolateGlobals } from "../game/testGlobals.ts";
import { cast, fight } from "./fixtures.ts";
import { buttonIn, Headless, ROOT } from "./headless-client.ts";
import { installReplay, ReplaySocket } from "./replay.ts";

const OUT = join(ROOT, "web/public/assets/port-preview/kernel");
let h: Headless;
const sock = () => ReplaySocket.last!;
const sent = () => sock().sent;
const run = (ms: number) => h.run(ms);
async function until(what: string, ok: () => unknown, maxMs = 15000) {
  const done = await h.until(what, ok, maxMs);
  if (!done) h.notes.push(`(replay waits for "${ReplaySocket.last?.waitingFor}")`);
  return done;
}
/** Frames of the fixture up to and including stage `name`. */
const expected = (name: string) => fight.slice(0, fight.findIndex((s) => s.name == name) + 1).flatMap((s) => s.client);
/** True once the replay has moved past stage `name` (all its client frames seen). */
const sentAll = (name: string) => () => ReplaySocket.last != undefined && fight.findIndex((s) => s.name == name) < ReplaySocket.last.stage;
const shot = (name: string, bfOnly = false) => h.shot(name, bfOnly, OUT);
const click = (label: string, o: Parameters<Headless["click"]>[1]) => h.click(label, o);
const type = (label: string, tf: unknown, text: string) => h.type(label, tf, text);
/** A cell click: the mouse rolls over the cell first; notes where it lands when another clip forwards to the cell. */
function clickCell(label: string, n: number) {
  h.hoverCell(n);
  const t = h.p.target();
  if (t !== h.cell(n)) h.notes.push(`${label}: mouse target ${String(t)} (forwards to the cell)`);
  h.clickCell(label, n);
}

// Leave no global state to the other test files of the same bun process (Key listener, _global singletons, WebSocket).
isolateGlobals();
const WebSocketBefore = globalThis.WebSocket;
afterAll(() => {
  G.KERNEL?.KeyListener.setEnabled(false);
  globalThis.WebSocket = WebSocketBefore;
  h?.close();
});

test("replay: connect → login → village → lobby → placement → move, spell, end turn → game end", async () => {
  installReplay();
  // clips/objects.json is held back, and the loader counts file sizes as its bytes (browserLoader streams them)
  const progress = { loaded: 0, total: 0 }, size = (f: string) => statSync(join(ROOT, "web/public/assets/swf", f)).size;
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  h = await Headless.boot({
    serverURL: "replay:fight",
    wrap: (l) => ({
      progress,
      json: async (f) => {
        progress.total += size(f);
        if (f === "clips/objects.json") await held;
        const json = await l.json(f);
        progress.loaded += size(f);
        return json;
      },
      image: (f) => l.image(f),
    }),
  });
  const DC = () => G.DATACENTER;

  // ---- boot: Interfaces.swf → lang + map libraries (INTERFACE's progress bar) → login screen; Sound.swf → SOMA ----
  await until("loading bar", () => G.INTERFACE?.MainLayer_mc?.progressBar);
  await run(400);
  expect(G.INTERFACE.CommonLayer_mc.loginInterface).toBeUndefined(); // the login screen waits for objects.swf
  expect(G.INTERFACE.MainLayer_mc.progressBar!.bar.front._visible).toBe(true);
  shot("00-loading.png");
  release();
  await until("login screen", () => G.INTERFACE?.CommonLayer_mc?.loginInterface);
  expect(G.INTERFACE.MainLayer_mc.progressBar).toBeUndefined(); // onLangOK hid it
  expect(G.INTERFACE).toBeDefined();
  expect(G.BATTLEFIELD).toBeDefined();
  await until("SOMA", () => G.SOMA);
  expect(G.SOMA?.paramsManager.getParams("02.mp3")?.volume).toBe(32);
  shot("01-login.png");

  // ---- connect, H, version + credentials, AlK → start menu ----
  const login = G.INTERFACE.CommonLayer_mc.loginInterface as MovieClip;
  type("account", login.txtName, cast.LOGIN);
  type("password", login.txtPass, cast.PASSWORD);
  click("login OK", login.btn_ok as MovieClip);
  await until("login frames + AlK", () => G.AKS.m_bAuthentified);
  expect(sent().slice(0, 2)).toEqual(expected("login"));
  expect(G.AKS.m_UID).toBe(cast.KEY);
  await run(200);
  shot("02-menu.png");

  // ---- PL → ALK → character list ----
  click("menu play", G.INTERFACE.CommonLayer_mc.MenuInterface?.play_btn as MovieClip);
  await until("PL", sentAll("menu: play"));
  await until("character list", () => G.INTERFACE.UIInterfaceCharacters?.choice0);
  await run(400);
  shot("03-characters.png");

  // ---- PS12 → ASK → GC1 → GCK|1 → GD → GDM + GM (village) ----
  const chars = G.INTERFACE.UIInterfaceCharacters!;
  click("select character", chars.choice0 as MovieClip); // the card; its B634 hit area covers it (no up-state art)
  expect(String(chars.selectedcharacterID)).toBe("12");
  click("play character", chars.btnPlay);
  await until("village GD", sentAll("village map"));
  await until("village map built", () => DC().Map.id == 507 && DC().Player.data?.clip);
  expect(DC().Player.ID).toBe("12");
  expect(DC().Game.state).toBe(1);
  expect(DC().Map.bRolePlay).toBe(true);
  expect(DC().Player.data?.cell).toBe(cast.VILLAGE_CELL);
  await run(300);
  shot("04-village.png");

  // ---- GAx;3 → multiplayer screen; its channel combo joins on load (`CJ`, see fixtures.ts) → CL ----
  await until("multiplayer screen", () => G.INTERFACE.UIInterfaceMultiPlayer, 4000);
  await until("CJ from the channel combo", sentAll("join channel"), 3000);
  await until("CL", sentAll("channel users"));
  await run(300);
  expect(DC().Channel.m_name).toBe("France");
  expect(String(G.INTERFACE.UIInterfaceMultiPlayer!.txtChat?.text)).toContain("France"); // chat log: txtChat ↔ chatContent
  shot("05-multiplayer.png");

  // ---- free-game tab (BL + GL2), create "Duel" on map 507, Ali joins ----
  const mp = G.INTERFACE.UIInterfaceMultiPlayer!;
  click("free games tab", mp.btnMulti as MovieClip);
  await until("BL/GL2", sentAll("free-game lobby"));
  const tabs = mp.Tabs!, tab = (name: string) => tabs[name] as MovieClip;
  await until("tab in place", () => !tabs.bInMove);
  await run(200);
  type("game name", tab("TabJoinGame").txtGameName, "Duel");
  click("create game", tab("TabJoinGame").btnCreate as MovieClip);
  await until("both players in the game", () => DC().Game.isFull && DC().Characters.getItemAt(7));
  expect(DC().Game.m_name).toBe("Duel");
  expect(DC().Game.m_maxPlayerCount).toBe(2);
  expect(DC().Characters.getItemAt(7)?.team).toBe(1);
  await until("joined tab in place", () => !tabs.bInMove);
  await run(200);
  shot("06-lobby.png");

  // ---- GS → GPS → GD → GDM (fight) → GR (client) → GR (server) → placement ----
  click("start game", tab("TabGameJoined").btnPlay as MovieClip);
  await until("fight map + GR", sentAll("ready"), 20000);
  expect((DC().Game as unknown as { allowedCells: number[][] }).allowedCells).toEqual([cast.TEAM0, cast.TEAM1]);
  expect(DC().Game.isRunning).toBe(true);
  expect(DC().Map.bRolePlay).toBe(false);
  await until("placement mode", () => G.BATTLEFIELD.Interaction.type == 4, 3000);
  expect(G.INTERFACE.UIInterfaceMultiPlayer?.$.removed ?? true).toBe(true); // no lobby screen left over the fight
  await run(200);
  shot("07-placement.png");
  shot("07b-placement-battlefield.png", true);

  // ---- Gp → GIC, GS, GTL, GTS12 ----
  clickCell("placement", cast.START);
  await until("my turn", () => DC().Game.currentPlayerID == "12");
  expect(DC().Game.turnSequence).toEqual(["12", "7"]);
  expect(DC().Player.data?.cell).toBe(cast.START);
  expect(DC().Characters.getItemAt(7)?.cell).toBe(cast.ALI_CELL);
  await run(500);
  shot("08-fight-turn.png");
  shot("08b-fight-battlefield.png", true);

  // ---- move: GA001<path> → GAS/GA1/GA102/GAF → walk → GKK1 ----
  const me = DC().Player.data!;
  clickCell("move", cast.MOVE_TO);
  await until("move frame", sentAll("move"));
  await run(300);
  shot("09-moving.png");
  shot("09b-moving-battlefield.png", true);
  await until("GKK1 after the walk", sentAll("move ack"), 12000);
  expect(me.AP).toBe(5);
  expect(me.cell).toBe(cast.MOVE_TO);
  expect(me.GameActionsManager.isWaiting()).toBe(false);

  // ---- spell 141 (banner slot 1) on Ali: GA300 → GA2;300 + AP/LP → cast → GKK2 ----
  const banner = G.INTERFACE.UIInterfaceBanner!.banner;
  click("spell slot 1", (banner.us1 as MovieClip).container as MovieClip);
  expect(G.BATTLEFIELD.Interaction.type).toBe(2); // spell targeting
  clickCell("spell target", cast.ALI_CELL);
  await until("spell frame", sentAll("spell"));
  await run(600);
  shot("10-spell.png");
  shot("10b-spell-battlefield.png", true);
  await until("GKK2 after the cast", sentAll("spell ack"), 12000);
  expect(DC().Characters.getItemAt(7)?.LP).toBe(40);
  expect(me.AP).toBe(2);
  expect(DC().Player.SpellsManager.SpellsCountByTurn_Counter["141"]).toBe(1);

  // ---- GT → GTF, GTS7 → GE → result panel; leave (GQ → GV → CJ) ----
  click("end turn", buttonIn(banner.btnNextTurnBanner));
  await until("game end", () => !DC().Game.isRunning && (DC().Game.Results.winners?.length ?? 0) > 0);
  // GM|-7 during Ali's turn, then GTS12: Ali's sprite is gone; his record stays (AS DataProvider.setItemAt(id, undefined)
  // never deletes, core/datacenter/dataProvider.ts), so cleanPlayer(7) runs on it.
  expect(DC().Game.players.getItemAt(7)).toBeUndefined();
  expect(DC().Game.currentPlayerID).toBe("12");
  await run(800);
  shot("11-result.png");
  const result = (G.INTERFACE.UIInterfaceBanner?.extraPanels as MovieClip | undefined)?.GameResultFree as MovieClip | undefined;
  click("leave", result?.$childAt(11 - 16384)); // S962 depth 11, unnamed PushButton (`on(release)`: leave + changeToMultiplayer)
  await until("CJ after GV", sentAll("rejoin channel"));
  await run(300);
  shot("12-back-to-lobby.png");

  h.notes.push(`sequencer timeouts (an awaited animation never called end()): ${h.timeouts}`);
  h.notes.push(`extra frames: ${JSON.stringify(sock().extra)}`);
  console.log("replay notes:\n  " + h.notes.join("\n  "));
  // Requests the lobby UI makes on its own when its tabs get focus (TabStart: IG, IP — S371 frame 1) are not scripted.
  expect(sock().extra.filter(([, f]) => f != "IG\n" && f != "IP\n")).toEqual([]);
  expect(h.notes.filter((n) => n.includes("direct") || n.startsWith("TIMEOUT"))).toEqual([]);
  expect(h.errors).toEqual([]);
  expect(sock().mismatches).toEqual([]);
  expect(sock().waitingFor).toBe("done");
  expect(sent().filter((f) => !sock().extra.some(([, x]) => x == f))).toEqual(expected("rejoin channel"));
}, 180000);
