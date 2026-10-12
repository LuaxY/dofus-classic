// Drives the real Rust server with the TS client's own code: web/src/core/protocol.ts builders for every frame sent,
// parseServerMessage for every frame received (none may be ignored), the TS PathFinding for moves and spell checks.
// Two clients: login → character → village → channel → chat/whisper/friends → free game → placement → fight until
// one dies (B gives up after 40 turns otherwise) → results → back to the channel.
//
//   (cd server && cargo build) && bun scripts/server-data/smoke.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compressPath, decode64, extractFullPath, uncompressMap, type MapData } from "../../web/src/core/compressor.ts";
import { calculateTacleZone, layoutMap } from "../../web/src/core/map.ts";
import { PathFinding, type PathFindingDataCenter } from "../../web/src/core/pathfinding.ts";
import * as P from "../../web/src/core/protocol.ts";

const BIN = join(import.meta.dir, "../../server/target/debug/dofus-server");
const dir = mkdtempSync(join(tmpdir(), "dofus-smoke-"));
const port = 20000 + Math.floor(Math.random() * 20000);
const server = Bun.spawn([BIN, `127.0.0.1:${port}`], { env: { ...process.env, DOFUS_STORE: join(dir, "store.json"), DOFUS_SEED: "5" }, stdout: "pipe" });
await server.stdout.getReader().read(); // "dofus-server: ws://…" once listening

function fail(msg: string): never {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
  console.error("smoke FAILED: " + msg);
  process.exit(1);
}

type Ev = P.ServerEvent;
const seen = new Set<string>();

class Client {
  ws!: WebSocket;
  queue: { raw: string; ev: Ev }[] = [];
  wake: (() => void) | null = null;
  login = "";
  multiplayer = false;
  id = "";
  constructor(readonly name: string) {}

  async open(): Promise<string> {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}`);
    this.ws.onmessage = (e) => {
      const raw = String(e.data);
      const ev = P.parseServerMessage(raw, { login: this.login, isMultiplayer: this.multiplayer });
      if (!ev) fail(`${this.name}: the TS client ignores ${JSON.stringify(raw)}`);
      if (ev.type == "gameCreate" || ev.type == "gameJoin") this.multiplayer = ev.success && ev.state > 1;
      seen.add(ev.type);
      this.queue.push({ raw, ev });
      this.wake?.();
    };
    await new Promise((r) => (this.ws.onopen = r));
    const h = (await this.next("helloKey")).ev;
    return h.type == "helloKey" ? h.key : "";
  }
  send(s: string | null) {
    if (s == null) fail("a builder refused its arguments");
    this.ws.send(s);
  }
  /** Next received event, waiting up to 5 s. */
  async take(): Promise<{ raw: string; ev: Ev }> {
    const end = Date.now() + 5000;
    while (!this.queue.length) {
      if (Date.now() > end) fail(`${this.name}: nothing received for 5 s`);
      await new Promise<void>((r) => ((this.wake = r), setTimeout(r, 50)));
    }
    return this.queue.shift()!;
  }
  /** Next event of `type`, skipping (but having parsed) the others. */
  async next<T extends Ev["type"]>(type: T): Promise<{ raw: string; ev: Extract<Ev, { type: T }> }> {
    while (true) {
      const e = await this.take();
      if (e.ev.type == type) return e as { raw: string; ev: Extract<Ev, { type: T }> };
    }
  }
}

async function enter(c: Client, account: string, password: string, name: string, guild: number, sex: number) {
  const key = await c.open();
  c.login = account;
  c.send(P.version());
  c.send(P.login(account, password, key, true)); // fresh store: register (the server never creates an account on login)
  await c.next("loginOk");
  c.send(P.getCharacters());
  await c.next("charactersList");
  c.send(P.addCharacter(name, guild, 0xff0000, -1, 65280, sex));
  await c.next("characterAdded");
  c.id = String((await c.next("charactersList")).ev.characters.find((x) => x.name == name)!.id);
  c.send(P.setCharacter(c.id));
  if ((await c.next("characterSelected")).ev.data.spells.split(";").length < 3) fail("spells missing in ASK");
  c.send(P.createSoloGame());
  await c.next("gameCreate");
  c.send(P.getMapData());
  await c.next("mapData");
  await c.next("gameMovement");
  if ((await c.next("gameAction")).ev.actionType != 3) fail("expected GA type 3 (to the multiplayer screen)");
  c.send(P.joinChannel("France"));
  await c.next("channelJoin");
  c.send(P.getChannelList());
  await c.next("channelList");
  c.send(P.getPodium());
  await c.next("podium");
  c.send(P.getGeneral());
  await c.next("generalInfos");
}

const a = new Client("A");
const b = new Client("B");
await enter(a, "smokea", "pass", "Archer", 9, 0); // Crâ
await enter(b, "smokeb", "secret", "Brute", 8, 1); // Iop
await a.next("channelMovement");
a.send(P.chatMessage("salut <b>|x</b>", "*"));
for (const c of [a, b]) if ((await c.next("chatMessage")).ev.msg != "salut &lt;b&gt; x&lt;/b&gt;") fail("chat text");
b.send(P.chatMessage("psst", "Archer"));
if ((await a.next("chatMessage")).ev.channel != 70 || (await b.next("chatMessage")).ev.channel != 84) fail("whisper kinds F/T");
a.send(P.addFriend("Brute"));
if (!(await a.next("friendAdd")).ev.success) fail("friend add");
a.send(P.getFriendsList());
if ((await a.next("friendsList")).ev.friends[0]?.state != "IN_CHANNEL") fail("friend state");
a.send(P.whoAmI());
if (((await a.next("whoAmI")).ev as Extract<Ev, { type: "whoIs" | "whoAmI" }>).state != "C") fail("whoami");

// ── free game, placement ──
a.send(P.getMapsList());
const mapId = (await a.next("mapsList")).ev.maps[0]!;
a.send(P.createFreeGame("Smoke", mapId, "AA", ""));
await a.next("gameCreate");
await a.next("gameMovement");
b.send(P.getGameList(2));
const games = (await b.next("gamesList")).ev.games;
if (games[0]?.name != "Smoke" || games[0].playersCount != 1 || games[0].maxPlayersCount != 2) fail("game list");
b.send(P.joinGame(2, "Smoke", ""));
await b.next("gameJoin");
if ((await b.next("gameMovement")).ev.entries.length != 2) fail("joiner gets both GM entries");
await a.next("gameMovement");
a.send(P.startGame());
const cells = new Map<string, number>();
const teams = new Map<string, number>([[a.id, 0], [b.id, 1]]);
let map!: MapData;
for (const c of [a, b]) {
  const list = (await c.next("positionStart")).ev.cells[teams.get(c.id)!]!;
  c.send(P.getMapData());
  const m = (await c.next("mapData")).ev;
  map = uncompressMap(Number(m.id), undefined, m.width!, m.height!, m.bRolePlay, m.backgroundNum!, m.mapData!);
  layoutMap(map);
  c.send(P.ready());
  cells.set(c.id, (decode64(list[0]!)! << 6) + decode64(list[1]!)!);
}
for (const c of [a, b]) await c.next("everybodyIsReady");
for (const c of [a, b]) c.send(P.setPlayerPosition(cells.get(c.id)!));
for (const c of [a, b]) {
  await c.next("startToPlay");
  await c.next("turnList");
}

// ── fight: the TS pathfinding decides moves and spell targets, as the client UI would ──
function client(me: Client, ap: number, fight = true) {
  for (const c of map.data) delete c.playerOnID;
  for (const [id, cell] of cells) map.data[cell]!.playerOnID = Number(id);
  calculateTacleZone(map, [...cells].map(([id, cell]) => ({ cell, team: teams.get(id)! })));
  const dc: PathFindingDataCenter = {
    Map: map,
    Player: { tmpPath: [], tmpFullPath: [], lastClickedCell: null, currentSpell: { m_bOnItSelf: false }, data: { team: teams.get(me.id)!, AP: ap, cell: cells.get(me.id)!, EffectsManager: { getModeratorValue: () => 0 } } },
    Game: { isFight: fight },
    Characters: { getItemAt: () => ({ guild: 1 }) },
  };
  return { pf: new PathFinding(dc), dc };
}

const SPELL: Record<string, { id: number; range: number; ap: number }> = { [a.id]: { id: 161, range: 4, ap: 4 }, [b.id]: { id: 141, range: 2, ap: 3 } };
let died = false;
let accepted = 0;
for (let turn = 0; turn < 40 && !died; turn++) {
  const me = (await a.next("turnStart")).ev.characterId == a.id ? a : b;
  await b.next("turnStart");
  const foe = me == a ? b : a;
  let ap = 6;
  let missed = false; // a critical miss (GA 302) ends the turn server-side: GTF + GTS follow
  const act = async (frame: string) => {
    me.send(frame);
    for (const c of [me, foe]) {
      let started = false;
      for (let e = await c.take(); e.ev.type != "actionsFinish"; e = await c.take()) {
        started ||= e.ev.type == "actionsStart";
        if (e.ev.type != "gameAction") continue;
        const { id, actionType, characterId, params } = e.ev;
        if (c == me) accepted += actionType == 1 || actionType == 300 ? 1 : 0;
        if (actionType == 1 && c == me) cells.set(characterId!, extractFullPath(params!, map.width).at(-1)!);
        if (actionType == 102 && c == me) ap += Number(params!.split(",")[1]);
        if (actionType == 103 && c == me) died = true;
        if (actionType == 302 && c == me) missed = true;
        if (c == me && characterId == me.id && !Number.isNaN(Number(id))) me.send(P.actionAck(id!));
      }
      if (!started) fail(`the server refused ${JSON.stringify(frame)}, which the TS client allowed`);
    }
  };
  const spell = SPELL[me.id]!;
  const target = cells.get(foe.id)!;
  const inRange = () => {
    const { pf } = client(me, ap);
    return pf.checkRange(cells.get(me.id)!, target, false, spell.range) && pf.checkView(cells.get(me.id)!, target);
  };
  if (!inRange()) {
    // route to a cell next to the foe (no AP limit), then click the farthest cell of it the AP allow
    const { pf, dc } = client(me, 500, false);
    let route: { num: number }[] | null = null;
    for (const d of [map.width, map.width - 1, -(map.width - 1), -map.width]) {
      const c = map.data[target + d];
      if (!c?.active || (c.movement ?? 0) < 2 || c.playerOnID) continue;
      pf.pathFind(cells.get(me.id)!, target + d, true);
      if (dc.Player.tmpFullPath && (!route || dc.Player.tmpFullPath.length < route.length)) route = dc.Player.tmpFullPath;
    }
    if (route?.length) {
      const fight = client(me, ap);
      fight.pf.pathFind(cells.get(me.id)!, route[Math.min(ap, route.length) - 1]!.num, true);
      const path = compressPath(fight.dc.Player.tmpPath);
      if (path) await act(P.sendActions(1, [path]));
    }
  }
  for (let k = 0; k < 2 && !died && !missed && ap >= spell.ap && inRange(); k++) await act(P.sendActions(300, [spell.id, target]));
  if (!died && !missed) me.send(P.turnEnd());
}
if (!died) {
  b.send(P.leaveGame()); // give up: B leaves, A wins alone
  await b.next("gameLeave");
}
const end = (await a.next("gameEnd")).ev;
if (!end.results.some((r) => r.winner)) fail("no winner in GE");
if (died) await b.next("gameEnd");
for (const c of died ? [a, b] : [a]) {
  c.send(P.leaveGame());
  await c.next("gameLeave");
  c.send(P.joinChannel()); // AKS.Channels.join() after GV: "CJ\n"
  await c.next("channelJoin");
}
server.kill();
rmSync(dir, { recursive: true, force: true });
console.log(`smoke OK: ${accepted} moves/casts accepted, ${died ? "a fighter died" : "B gave up"}; event types parsed: ${[...seen].sort().join(", ")}`);
