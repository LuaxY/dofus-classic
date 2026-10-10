// Unit checks of the kernel's queueing and protocol glue (no SWF needed): Sequencer timeout / id-ignoring end,
// GameActionsManager request → cancel-and-resend, SpellsManager limits, Client dispatch side effects.
import { beforeEach, expect, test } from "bun:test";
import { createCanvas } from "@napi-rs/canvas";
import { SEQUENCER_TIMEOUT } from "../../core/constants.ts";
import { Character } from "../../core/datacenter/character.ts";
import { getSpellObjectFromData } from "../../core/datacenter/spell.ts";
import { SpellLaunch } from "../../core/datacenter/spellLaunch.ts";
import { parseServerMessage } from "../../core/protocol.ts";
import { Player } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import { Client } from "./client.ts";
import { GameActionsManager } from "./gameActionsManager.ts";
import { KernelDataCenter } from "./init.ts";
import { CharactersManager } from "./kernel.ts";
import { Sequencer } from "./sequencer.ts";
import { isolateGlobals } from "../testGlobals.ts";

isolateGlobals();
let p: Player;
let sent: string[];
beforeEach(() => {
  p = new Player({ loader: { json: async () => ({}), image: async () => ({}) as CanvasImageSource } as never, createCanvas: (w, h) => createCanvas(w, h) });
  G.DATACENTER = new KernelDataCenter();
  G.AKS = new Client();
  sent = [];
  G.AKS.m_Socket = { send: (d) => sent.push(d), close() {} };
  (G as { KERNEL: unknown }).KERNEL = { CharactersManager: new CharactersManager(), traceToChat() {} };
});

test("Sequencer: waiting action ends on timeout; onActionEnd ignores the id; non-waiting chain is synchronous", () => {
  const s = new Sequencer();
  const log: string[] = [];
  const obj = { a: (x: string) => log.push(x) };
  s.addAction(false, obj, obj.a, ["1"]);
  s.addAction(true, obj, obj.a, ["2"]);
  s.addAction(false, obj, obj.a, ["3"]);
  s.play();
  expect(log).toEqual(["1", "2"]); // stops on the waiting action
  expect((obj as Record<string, unknown>)[s.unicID]).toBe(1); // the object remembers its action id
  p.advance(SEQUENCER_TIMEOUT - 50);
  expect(log).toEqual(["1", "2"]);
  p.advance(100);
  expect(log).toEqual(["1", "2", "3"]); // TIMEOUT !!!
  expect(s.isPlaying()).toBe(false);
  s.addAction(true, obj, obj.a, ["4"]);
  s.addAction(false, obj, obj.a, ["5"]);
  s.play();
  s.onActionEnd(12345); // any id ends the head action
  expect(log).toEqual(["1", "2", "3", "4", "5"]);
});

test("GameActionsManager: move request, server id, cancel-and-replace (GKE then GA)", () => {
  const c = new Character();
  c.clip = { getCellNum: () => 77, stopMove() {} } as never;
  const g = new GameActionsManager(c);
  g.transmittingMove(1, ["abc"]);
  expect(sent).toEqual(["GA001abc\n"]);
  g.transmittingMove(1, ["def"]); // still TRANSMITTING (no server answer): ignored
  expect(sent.length).toBe(1);
  g.onServerResponse("9");
  g.transmittingMove(1, ["ghi"]); // IN_PROGRESS + same type → cancel at the current cell, then resend
  expect(sent).toEqual(["GA001abc\n", "GKE9|77\n", "GA001ghi\n"]);
  g.onServerResponse("10");
  g.ack("10");
  expect(sent.at(-1)).toBe("GKK10\n");
  expect(g.isWaiting()).toBe(false);
});

test("SpellsManager: per-turn limit, delay, and the splice(i, i + 1) bug", () => {
  const P = G.DATACENTER.Player;
  const s = getSpellObjectFromData("141~1~Pb~1F000hd00bbcbab"); // 2 per turn, 1 per target, no delay
  P.addSpell(s);
  const SM = P.SpellsManager;
  SM.addLaunchedSpell(new SpellLaunch("141", 7, P));
  expect(SM.checkCanLaunchSpell("141", 8)).toBe(true);
  expect(SM.checkCanLaunchSpell("141", 7)).toBe(false); // 1 per target
  SM.addLaunchedSpell(new SpellLaunch("141", undefined, P));
  expect(SM.checkCanLaunchSpell("141", 8)).toBe(false); // 2 per turn reached
  SM.nextTurn();
  expect(SM.checkCanLaunchSpell("141", 7)).toBe(true);
  // delays [1, 5, 5]: the first expires at nextTurn and splice(0, 1) removes only it; [5, 1, 5] → splice(1, 2) also drops the third
  SM.SpellsDelay = [5, 1, 5].map((d) => Object.assign(new SpellLaunch("141", undefined, P), { m_RemainingTurn: d }));
  SM.nextTurn();
  expect(SM.SpellsDelay.map((l) => l.m_RemainingTurn)).toEqual([4]);
});

test("Client.dispatch: H/ASK/GCK/GM side effects", () => {
  const AKS = G.AKS;
  const go = (raw: string) => AKS.dispatch(parseServerMessage(raw, { isMultiplayer: G.DATACENTER.Game.isMultiplayer })!, raw);
  let connected: boolean | undefined;
  AKS.onConnect = (ok) => (connected = ok);
  go("Habcdefghijklmnopqrstuvwxyz012345");
  expect([AKS.m_UID, AKS.m_bConnected, connected]).toEqual(["abcdefghijklmnopqrstuvwxyz012345", true, true]);
  go("ASK|12|Bobby|1|8|0|80|-1|-1|-1||0|0|100|50|6|0|0|0|0|0|0|0|0|0|0|0|0|4|141~1~Pb~1F000hd00bbcbab|");
  expect(G.DATACENTER.Player.ID).toBe("12");
  const me = G.DATACENTER.Player.data!;
  expect([me.name, me.LP, me.AP, me.SEQUENCER_actions instanceof Sequencer]).toEqual(["Bobby", 50, 6, true]);
  expect(G.DATACENTER.Player.Spells.getItemAt(141)?.m_APCost).toBe(3);
  go("GCK|2|Duel|507|AA");
  expect([G.DATACENTER.Game.state, G.DATACENTER.Game.m_name, G.DATACENTER.Game.m_maxPlayerCount]).toEqual([2, "Duel", 2]);
  const moves: unknown[] = [];
  AKS.Game.onMovement = (add, c) => moves.push([add, (c as Character).name, (c as Character).team]);
  go("GM|+7;Ali;1;2;0;20;-1;-1;-1;;50;1;1");
  expect(moves).toEqual([[true, "Ali", 1]]);
  go("GM|-7");
  expect(moves[1]).toEqual([false, "Ali", 1]); // announced before the "removal" (label only, AS quirk)
  // The record survives `GM|-id` (setItemAt(id, undefined) keeps the object), so a leaver listed in GE gets its name
  // in the results (the server lists leavers as dead losers, docs/server.md).
  expect(G.DATACENTER.Characters.getItemAt(7)?.name).toBe("Ali");
  go("GE12|2;12;1;0;0;40;100;40;10|1;7;1;1;0;0;100;0;0");
  const losers = G.DATACENTER.Game.Results.losers as { name?: string; bDead?: boolean }[];
  expect(losers.map((l) => [l.name, l.bDead])).toEqual([["Ali", true]]);
});

test("Client: frames from a map (GDM) on wait, in order, until the map layers are loaded (port addition)", () => {
  const Real = globalThis.WebSocket;
  let ws: { onmessage?: (e: { data: string }) => void } = {};
  (globalThis as { WebSocket: unknown }).WebSocket = function () {
    return (ws = { send() {}, close() {} } as never);
  };
  try {
    const layer: { attach?: () => void } = {}, got: string[] = [];
    (G as { BATTLEFIELD: unknown }).BATTLEFIELD = { Container: { Ground: layer, Object1: layer, Object2: layer } };
    G.AKS.dispatch = (_ev, raw) => void got.push(raw);
    G.AKS.connect("h", 1);
    const frames = ["AlKfr", "GDM|507|15|17|1|0|abc", "GM|+12;Bobby;1;8;0;80;-1;-1;-1;;140;1"];
    for (const data of frames) ws.onmessage!({ data });
    expect(got).toEqual(["AlKfr"]);
    p.advance(200);
    expect(got).toEqual(["AlKfr"]);
    layer.attach = () => {}; // clips/ground.swf / objects.swf frame 1 ran
    p.advance(40);
    expect(got).toEqual(frames);
  } finally {
    globalThis.WebSocket = Real;
    delete (G as { BATTLEFIELD?: unknown }).BATTLEFIELD;
  }
});
