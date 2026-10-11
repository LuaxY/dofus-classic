// Playtest: the real Rust server and two (or more) headless clients (web/src/dev/bot.ts), each its own bun process,
// played only through UI input. Scenarios: fresh, reconnect, disruption, coverage, random, social, polish, items
// (docs/playtest.md).
//
//   bun scripts/playtest.ts [all | fresh | reconnect | disruption | coverage | random | social | polish | items ...]
//
// This process never loads @napi-rs/canvas (a bun process that has loaded it cannot spawn: posix_spawn EBADF).
// PNG timelines: web/public/assets/port-preview/playtest/<run>/<scenario>/<client>/; logs next to them.
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Policy, Step } from "../web/src/dev/bot.ts";

const ROOT = join(import.meta.dir, "..");
const RUN = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "web/public/assets/port-preview/playtest", RUN);
const TURN_MS = 20000, PLACEMENT_MS = 25000;
mkdirSync(OUT, { recursive: true });
const log = (s: string) => (console.log(s), appendFileSync(join(OUT, "playtest.log"), s + "\n"));

// ---- server ---------------------------------------------------------------------------------------------------------
const store = mkdtempSync(join(tmpdir(), "dofus-playtest-"));
const port = 21000 + Math.floor(Math.random() * 20000);
const URL = `ws://127.0.0.1:${port}`;
let server: ReturnType<typeof Bun.spawn> | undefined;
async function startServer() {
  const bin = join(ROOT, "server/target/release/dofus-server");
  server = Bun.spawn([bin, `127.0.0.1:${port}`], {
    env: { ...process.env, DOFUS_STORE: join(store, "store.json"), DOFUS_TURN_MS: String(TURN_MS), DOFUS_PLACEMENT_MS: String(PLACEMENT_MS), DOFUS_SEED: "7" },
    stdout: "pipe",
    stderr: "inherit",
  });
  const first = await (server.stdout as ReadableStream<Uint8Array>).getReader().read();
  log("server: " + new TextDecoder().decode(first.value).trim());
}
function stopServer() {
  server?.kill();
  server = undefined;
}

// ---- bots -----------------------------------------------------------------------------------------------------------
type Result = { ok: boolean; step?: string; error?: string; errors?: string[]; [k: string]: unknown };
class Bot {
  private proc: ReturnType<typeof Bun.spawn>;
  private lines: string[] = [];
  private wake: (() => void) | undefined;
  private dead = false;
  constructor(readonly name: string, readonly dir: string) {
    mkdirSync(dir, { recursive: true });
    this.proc = Bun.spawn(["bun", join(ROOT, "web/src/dev/bot.ts"), name, URL, dir], { stdin: "pipe", stdout: "pipe", stderr: "pipe", cwd: ROOT });
    void this.pump(this.proc.stdout as ReadableStream<Uint8Array>, (l) => (l.startsWith("{") ? (this.lines.push(l), this.wake?.()) : this.note(l)));
    void this.pump(this.proc.stderr as ReadableStream<Uint8Array>, (l) => this.note(l));
    void this.proc.exited.then(() => ((this.dead = true), this.wake?.()));
  }
  private note(l: string) {
    if (l.trim()) appendFileSync(join(this.dir, "console.log"), l + "\n");
  }
  private async pump(s: ReadableStream<Uint8Array>, on: (l: string) => void) {
    let buf = "";
    const dec = new TextDecoder(), reader = s.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      buf += dec.decode(r.value, { stream: true });
      for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) on(buf.slice(0, i)), (buf = buf.slice(i + 1));
    }
  }
  private async next(): Promise<Result> {
    while (!this.lines.length) {
      if (this.dead) throw new Error(`${this.name}: bot process exited (see ${join(this.dir, "console.log")})`);
      await new Promise<void>((r) => ((this.wake = r), setTimeout(r, 1000)));
    }
    return JSON.parse(this.lines.shift()!) as Result;
  }
  async ready() {
    const r = await this.next();
    if (!r.ok) throw new Error(`${this.name}: ${r.error}`);
  }
  /** Run one step; a failed step or any runtime error the client logged fails the scenario. */
  async do(s: Step): Promise<Result> {
    const t = Date.now();
    (this.proc.stdin as { write(s: string): void; flush(): void }).write(JSON.stringify(s) + "\n");
    (this.proc.stdin as { flush(): void }).flush();
    const r = await this.next();
    const { tree: _t, ...shown } = r;
    log(`  ${this.name} ${s.do} (${((Date.now() - t) / 1000).toFixed(1)} s) ${JSON.stringify(shown).slice(0, r.ok ? 600 : 6000)}`);
    if (!r.ok) throw new Error(`${this.name} ${s.do}: ${r.error}`);
    if (r.errors?.length) throw new Error(`${this.name} ${s.do}: client errors:\n${r.errors.join("\n")}`);
    return r;
  }
  kill() {
    this.proc.kill(9);
  }
  async quit() {
    (this.proc.stdin as { end(): void }).end();
    await Promise.race([this.proc.exited, new Promise((r) => setTimeout(r, 3000))]);
    this.proc.kill();
  }
}
async function bots(scenario: string, ...names: string[]) {
  const bs = names.map((n) => new Bot(n, join(OUT, scenario, n)));
  await Promise.all(bs.map((b) => b.ready()));
  return bs;
}

// ---- shared flows ---------------------------------------------------------------------------------------------------
type Who = { bot: Bot; account: string; password: string; character: string; guild: number; sex: 0 | 1 };
const COLORS: [number, number][][] = [[[0.1, 0.2], [0.5, 0.5], [0.8, 0.3]], [[0.3, 0.1], [0.6, 0.2], [0.9, 0.6]]];
let created = 0;
const registered = new Set<string>();
/** Login screen: "S'inscrire" the first time an account is used in this run (fresh store), OK afterwards. */
async function logIn(w: Who) {
  const step = registered.has(w.account) ? "login" : "register";
  registered.add(w.account);
  await w.bot.do({ do: step, account: w.account, password: w.password });
}
async function enter(w: Who, create: boolean) {
  await logIn(w);
  await w.bot.do({ do: "characters" });
  if (create) await w.bot.do({ do: "createCharacter", name: w.character, guild: w.guild, sex: w.sex, colors: COLORS[created++ % 2]! });
  await w.bot.do({ do: "selectCharacter", name: w.character });
}
/** A creates `game` on `map`, B joins; both start, place and fight with their policies; both leave the result panel. */
async function duel(a: Who, b: Who, game: string, map: number, pa: Policy, pb: Policy, extra?: { teamDance?: boolean }) {
  await Promise.all([a.bot.do({ do: "freeGames" }), b.bot.do({ do: "freeGames" })]);
  await a.bot.do({ do: "createGame", name: game, map });
  if (extra?.teamDance) {
    // Client.Game.changeTeam only sends Gt while the game is not full (AKSClient/Dofus.Client.Game.as:126-132)
    await a.bot.do({ do: "team", team: 1 });
    await a.bot.do({ do: "team", team: 0 });
  }
  const j = await b.bot.do({ do: "joinGame", name: game });
  if (j.team != 1) throw new Error(`${b.character} joined team ${String(j.team)}, not the free team 1`);
  await a.bot.do({ do: "waitPlayers", count: 2 });
  const [pl] = await Promise.all([a.bot.do({ do: "start", creator: true }), b.bot.do({ do: "start", creator: false })]);
  await Promise.all([a.bot.do({ do: "place", index: 1 }), b.bot.do({ do: "place", index: 2 })]);
  const [ra, rb] = await Promise.all([a.bot.do({ do: "fight", policy: pa }), b.bot.do({ do: "fight", policy: pb })]);
  return { placement: pl, a: ra, b: rb };
}
const castOf = (r: Result) => (r.cast as number[] | undefined) ?? [];
/** The result panel's lists (DATACENTER.Game.Results, returned by the fight step). */
const names = (r: Result, list: "winners" | "losers") => ((r.results as Record<string, { name?: string }[]> | undefined)?.[list] ?? []).map((x) => x.name);
/** A leaver is listed among the losers (by name: the client kept its record after GM|-id). */
function leaverListed(r: Result, who: string) {
  if (!names(r, "losers").includes(who)) throw new Error(`${who} left but is not in the losers: ${JSON.stringify(r.results)}`);
}

// ---- scenarios ------------------------------------------------------------------------------------------------------
const covered = new Map<number, number[]>(); // class → spells cast
const CLASS_SPELLS: Record<number, number[]> = { 1: [1, 2, 4], 2: [21, 22, 23, 24, 32], 3: [41, 42, 43], 4: [61, 63, 67], 5: [81, 82, 83, 84], 6: [101, 102, 103], 7: [121, 122, 123, 124, 126], 8: [141, 142, 143], 9: [161, 162, 163, 166], 10: [181, 182, 183] };
const record = (guild: number, r: Result) => covered.set(guild, [...new Set([...(covered.get(guild) ?? []), ...castOf(r)])]);
const maps = new Set<number>();

const scenarios: Record<string, () => Promise<void>> = {
  /** 1. Fresh accounts → characters → channel + chat → free game → placement → full fight → results → lobby, twice. */
  async fresh() {
    const [A, B] = await bots("fresh", "A", "B");
    const a: Who = { bot: A!, account: "alice", password: "secret1", character: "Alicia", guild: 8, sex: 1 };
    const b: Who = { bot: B!, account: "bob", password: "hunter22", character: "Bobbel", guild: 2, sex: 0 };
    await Promise.all([enter(a, true), enter(b, true)]);
    await A!.do({ do: "channel", name: "Dofus" });
    await B!.do({ do: "channel", name: "Dofus" });
    await A!.do({ do: "chat", text: "Salut Bobbel, on se fait un duel ?", via: "enter" });
    await B!.do({ do: "waitChat", text: "Salut Bobbel, on se fait un duel ?" });
    await B!.do({ do: "chat", text: "Avec plaisir Alicia", via: "button" });
    await A!.do({ do: "waitChat", text: "Avec plaisir Alicia" });
    const g1 = await duel(a, b, "Duel", 1426, { want: CLASS_SPELLS[8], cc: true, outOfRange: true, apCap: true, idleTurns: [3], say: "Bonne chance !" },
      { want: CLASS_SPELLS[2], cc: true, hear: "Bonne chance !" }, { teamDance: true });
    record(8, g1.a), record(2, g1.b), maps.add(1426);
    await Promise.all([A!.do({ do: "leaveResult" }), B!.do({ do: "leaveResult" })]);
    await A!.do({ do: "chat", text: "Revanche ?", via: "button" });
    await B!.do({ do: "waitChat", text: "Revanche ?" });
    // second game in the same session, created by B this time, on another map
    const g2 = await duel(b, a, "Revanche", 53, { want: CLASS_SPELLS[2] }, { want: CLASS_SPELLS[8] });
    record(2, g2.a), record(8, g2.b), maps.add(53);
    await Promise.all([A!.do({ do: "leaveResult" }), B!.do({ do: "leaveResult" })]);
    await Promise.all([A!.quit(), B!.quit()]);
  },

  /** 2. Log out through the menu, back in (characters persisted, also across a server restart); wrong password refused. */
  async reconnect() {
    let [A] = await bots("reconnect", "A");
    const a: Who = { bot: A!, account: "carole", password: "pa55word", character: "Carole", guild: 5, sex: 1 };
    await enter(a, true);
    await A!.do({ do: "logout" });
    await A!.do({ do: "login", account: "carole", password: "wrong-one", expect: "refused" });
    await enter(a, false); // same client, right password: the character is listed again
    await A!.do({ do: "logout" });
    await A!.quit();
    stopServer();
    await startServer(); // the store is reloaded from disk
    [A] = await bots("reconnect", "A2");
    await A!.do({ do: "login", account: "carole", password: "wrong-one", expect: "refused" });
    await enter({ ...a, bot: A! }, false);
    await A!.quit();
  },

  /** 3. A player gives up mid-fight; a client process dies mid-fight and mid-placement: the other one gets back to the lobby. */
  async disruption() {
    let [A, B] = await bots("disruption", "A", "B");
    const a: Who = { bot: A!, account: "dan", password: "dan-pass", character: "Danou", guild: 6, sex: 0 };
    const b: Who = { bot: B!, account: "eve", password: "eve-pass", character: "Evelyne", guild: 7, sex: 1 };
    await Promise.all([enter(a, true), enter(b, true)]);
    // (a) B gives up on its 2nd turn
    const g = await duel(a, b, "Abandon", 501, { passive: true }, { passive: true, giveUpAtTurn: 2 });
    if (g.a.result != "won" || g.b.result != "gave up") throw new Error(`give up: A ${String(g.a.result)}, B ${String(g.b.result)}`);
    leaverListed(g.a, b.character);
    await A!.do({ do: "leaveResult" });
    // (b) B's process dies during the fight
    await Promise.all([A!.do({ do: "freeGames" }), B!.do({ do: "freeGames" })]);
    await A!.do({ do: "createGame", name: "Crash", map: 505 });
    await B!.do({ do: "joinGame", name: "Crash" });
    await A!.do({ do: "waitPlayers", count: 2 });
    await Promise.all([A!.do({ do: "start", creator: true }), B!.do({ do: "start", creator: false })]);
    await Promise.all([A!.do({ do: "place", index: 0 }), B!.do({ do: "place", index: 0 })]);
    const fa = A!.do({ do: "fight", policy: { passive: true } });
    await new Promise((r) => setTimeout(r, 4000));
    B!.kill();
    const r = await fa;
    if (r.result != "won") throw new Error(`crash in fight: A ${String(r.result)}`);
    leaverListed(r, b.character);
    await A!.do({ do: "leaveResult" });
    // (c) B's process dies during placement
    [B] = await bots("disruption", "B2");
    await enter({ ...b, bot: B! }, false);
    await Promise.all([A!.do({ do: "freeGames" }), B!.do({ do: "freeGames" })]);
    await A!.do({ do: "createGame", name: "Crash2", map: 509 });
    await B!.do({ do: "joinGame", name: "Crash2" });
    await A!.do({ do: "waitPlayers", count: 2 });
    await Promise.all([A!.do({ do: "start", creator: true }), B!.do({ do: "start", creator: false })]);
    B!.kill();
    const r2 = await A!.do({ do: "fight", policy: { passive: true, maxMs: 60000 } });
    if (r2.result != "won") throw new Error(`crash in placement: A ${String(r2.result)}`);
    leaverListed(r2, b.character);
    await A!.do({ do: "leaveResult" });
    maps.add(501), maps.add(505), maps.add(509);
    await A!.quit();
  },

  /** 4. Every class casts each of its level-1 spells (and does a close combat), on several maps; a pairing that ends
   *  before its lists are done is replayed once on another map. Fails if any class still misses a spell. */
  async coverage() {
    const pairs: [number, number, number][] = [[1, 3, 101], [4, 5, 161], [6, 7, 504], [9, 10, 1594], [8, 2, 1665]];
    const spare = [1561, 1610, 57, 1370, 42];
    for (const [i, [ga, gb, map]] of pairs.entries()) {
      const [A, B] = await bots("coverage", `A${i}`, `B${i}`);
      const a: Who = { bot: A!, account: "covera", password: "cov-a", character: `Cova${"bcdef"[i]}`, guild: ga, sex: 0 };
      const b: Who = { bot: B!, account: "coverb", password: "cov-b", character: `Covb${"bcdef"[i]}`, guild: gb, sex: 1 };
      await Promise.all([enter(a, true), enter(b, true)]);
      for (let attempt = 0; ; attempt++) {
        const m = attempt ? spare[i]! : map;
        const left = (g: number) => CLASS_SPELLS[g]!.filter((x) => !(covered.get(g) ?? []).includes(x));
        const g = await duel(a, b, `Cov${i}${attempt}`, m, { want: left(ga), cc: true }, { want: left(gb), cc: true });
        record(ga, g.a), record(gb, g.b), maps.add(m);
        await Promise.all([A!.do({ do: "leaveResult" }), B!.do({ do: "leaveResult" })]);
        if (!left(ga).length && !left(gb).length) break;
        if (attempt) throw new Error(`classes ${ga}/${gb} still miss spells ${left(ga)} / ${left(gb)}`);
      }
      await Promise.all([A!.quit(), B!.quit()]);
    }
    const missing = Object.entries(CLASS_SPELLS).filter(([g, sp]) => sp.some((x) => !(covered.get(Number(g)) ?? []).includes(x)));
    if (missing.length) throw new Error(`spells never cast: ${missing.map(([g]) => `class ${g}`).join(", ")}`);
  },

  /** 5. The lobby's other entry points: "Retour au village" (back with the menu's "Aller aux combats"); "Jouer" →
   *  "Jouer seul" for two players → random 1v1 → random results (the winner takes the gift button to the shared map,
   *  then "Aller aux combats"); "Jouer" → "Constituer une équipe":
   *  an invitation refused, one withdrawn, one accepted, a random slot added and removed, "Rechercher" → the two solo
   *  players make the other team → 2v2 → results. */
  async random() {
    const [A, B, C, D] = await bots("random", "A", "B", "C", "D");
    const who = (bot: Bot, account: string, character: string, guild: number, sex: 0 | 1): Who => ({ bot, account, password: account + "-pw", character, guild, sex });
    const [a, b, c, d] = [who(A!, "gina", "Ginette", 3, 1), who(B!, "hugo", "Hugolin", 9, 0), who(C!, "iris", "Irmine", 1, 1), who(D!, "jules", "Julot", 10, 0)];
    await Promise.all([a, b, c, d].map((w) => enter(w, true)));
    // from the shared map back to the lobby: the banner menu's authored "Aller aux combats" (GX)
    await A!.do({ do: "village" });
    await A!.do({ do: "toLobby" });
    // (a) solo queue
    await A!.do({ do: "playAlone" });
    await B!.do({ do: "playAlone" });
    await Promise.all([A!.do({ do: "start", creator: false }), B!.do({ do: "start", creator: false })]);
    await Promise.all([A!.do({ do: "place", index: 0 }), B!.do({ do: "place", index: 0 })]);
    const [ra, rb] = await Promise.all([A!.do({ do: "fight", policy: { cc: true } }), B!.do({ do: "fight", policy: { cc: true } })]);
    record(3, ra), record(9, rb);
    const [win, lose] = ra.result == "won" ? [A!, B!] : [B!, A!];
    if (new Set([ra.result, rb.result]).size != 2) throw new Error(`1v1: A ${String(ra.result)}, B ${String(rb.result)}`);
    await Promise.all([win.do({ do: "gift" }), lose.do({ do: "leaveResult" })]);
    await win.do({ do: "toLobby" });
    // (b) a team built by invitation
    await C!.do({ do: "addFriend", name: d.character });
    await C!.do({ do: "makeTeam" });
    await C!.do({ do: "invite", name: d.character });
    await D!.do({ do: "invitation", answer: "no" });
    await C!.do({ do: "waitChat", text: `${d.character} refuse ton invitation.` });
    await C!.do({ do: "invite", name: d.character });
    await D!.do({ do: "invitation", answer: "seen" });
    await C!.do({ do: "cancelCard", name: d.character });
    await D!.do({ do: "invitation", answer: "closed" });
    await C!.do({ do: "invite", name: d.character });
    await D!.do({ do: "invitation", answer: "yes" });
    await C!.do({ do: "waitCard", name: d.character });
    await D!.do({ do: "waitCard", name: c.character });
    await C!.do({ do: "invite", name: "Aléatoire" });
    await Promise.all([C!.do({ do: "waitCard", name: "Aléatoire" }), D!.do({ do: "waitCard", name: "Aléatoire" })]);
    await C!.do({ do: "cancelCard", name: "Aléatoire" });
    await C!.do({ do: "search" });
    await A!.do({ do: "playAlone" });
    await B!.do({ do: "playAlone" });
    const all = [A!, B!, C!, D!];
    await Promise.all(all.map((x) => x.do({ do: "start", creator: false })));
    await Promise.all(all.map((x, i) => x.do({ do: "place", index: i % 2 })));
    const r = await Promise.all(all.map((x) => x.do({ do: "fight", policy: { cc: true } })));
    [3, 9, 1, 10].forEach((g, i) => record(g, r[i]!));
    const teamCD = r[2]!.result;
    if (r[3]!.result != teamCD || r[0]!.result == teamCD || r[1]!.result != r[0]!.result) throw new Error(`2v2 results ${r.map((x) => x.result).join(" ")}`);
    if (names(r[0]!, "winners").length + names(r[0]!, "losers").length != 4) throw new Error(`2v2 lists ${JSON.stringify(r[0]!.results)}`);
    await Promise.all(all.map((x) => x.do({ do: "leaveResult" })));
    await Promise.all(all.map((x) => x.quit()));
  },

  /** 6. "Rejoindre la carte": two players on the village map, no fight. B arrives after A's map is drawn (A loads B's
   *  sprite on demand); each sees the other, each walks and the other sees the sprite stop on the new cell; chat both
   *  ways with the speech bubble; both travel through a map-change plate; B leaves through the menu's "Changer de
   *  perso" and A sees B's sprite go; A walks on across the world maps, plate by plate. */
  async social() {
    const [A, B] = await bots("social", "A", "B");
    const a: Who = { bot: A!, account: "kim", password: "kim-pass", character: "Kimette", guild: 4, sex: 1 };
    const b: Who = { bot: B!, account: "leo", password: "leo-pass", character: "Leonard", guild: 6, sex: 0 };
    await Promise.all([a, b].map(async (w) => {
      await logIn(w);
      await w.bot.do({ do: "characters" });
      await w.bot.do({ do: "createCharacter", name: w.character, guild: w.guild, sex: w.sex, colors: COLORS[created++ % 2]! });
    }));
    const ja = await A!.do({ do: "joinMap", name: a.character });
    const jb = await B!.do({ do: "joinMap", name: b.character });
    await A!.do({ do: "sprite", name: b.character, cell: jb.cell as number }); // the late arrival
    await B!.do({ do: "sprite", name: a.character, cell: ja.cell as number });
    const wa = await A!.do({ do: "walk" });
    await B!.do({ do: "sprite", name: a.character, cell: wa.cell as number });
    const wb = await B!.do({ do: "walk" });
    await A!.do({ do: "sprite", name: b.character, cell: wb.cell as number });
    await A!.do({ do: "chat", text: "Salut Leonard, belle journée !", via: "enter" });
    await B!.do({ do: "waitChat", text: "Salut Leonard, belle journée !", bubble: true });
    await B!.do({ do: "chat", text: "Coucou Kimette", via: "enter" });
    await A!.do({ do: "waitChat", text: "Coucou Kimette", bubble: true });
    // World maps (docs/server.md stage 3b): the shortest plate route from the village to WORLD_TARGET. A walks onto its
    // first plate, B sees A go; B follows and they meet on the next map; B leaves, A walks on to the target.
    // 591 drew 12 obstacle cells as bare grass before the missing graphics were filled (docs/assets-format.md §11).
    const WORLD_TARGET = 591;
    const village = (await Bun.file(join(ROOT, "server/data/rules.json")).json() as { village_map: number }).village_map;
    const world = (await Bun.file(join(ROOT, "server/data/maps.json")).json() as { world: { id: number; links: Record<string, [number, number]> }[] }).world;
    const prev = new Map<number, [from: number, plate: number]>([[village, [village, -1]]]);
    for (const q = [village]; q.length; ) {
      const id = q.shift()!;
      for (const [p, [to]] of Object.entries(world.find((m) => m.id == id)!.links)) if (!prev.has(to)) prev.set(to, [id, Number(p)]), q.push(to);
    }
    if (!prev.has(WORLD_TARGET)) throw new Error(`world map ${WORLD_TARGET} unreachable from ${village}`);
    const route: [plate: number, map: number][] = [];
    for (let m = WORLD_TARGET; m != village; m = prev.get(m)![0]) route.unshift([prev.get(m)![1], m]);
    if (route.length < 3) throw new Error(`route to ${WORLD_TARGET}: ${route.length} plates, want 3+`);
    const [[plate, to], ...rest] = route as [[number, number], ...[number, number][]];
    const ta = await A!.do({ do: "travel", cell: plate, map: to });
    await B!.do({ do: "sprite", name: a.character, gone: true });
    const tb = await B!.do({ do: "travel", cell: plate, map: to });
    await A!.do({ do: "sprite", name: b.character, cell: tb.cell as number });
    await B!.do({ do: "sprite", name: a.character, cell: ta.cell as number });
    await B!.do({ do: "changeCharacter" });
    await A!.do({ do: "sprite", name: b.character, gone: true });
    for (const [cell, map] of rest) await A!.do({ do: "travel", cell, map });
    await Promise.all([A!.quit(), B!.quit()]);
  },

  /** 7. Shared map ↔ lobby: A joins with "Rejoindre la carte" (`GW`), B with "Jouer" then "Retour au village"; A's
   *  smiley shows over A's sprite on B's screen; B takes the menu's "Aller aux combats" (authored `GX`) to the lobby
   *  and A sees B's sprite go; "Retour au village" brings B back; then A (the `GW` session) does the same. */
  async polish() {
    const [A, B] = await bots("polish", "A", "B");
    const a: Who = { bot: A!, account: "mia", password: "mia-pass", character: "Mialou", guild: 7, sex: 1 };
    const b: Who = { bot: B!, account: "nino", password: "nino-pass", character: "Ninoche", guild: 1, sex: 0 };
    await Promise.all([a, b].map(async (w) => {
      await logIn(w);
      await w.bot.do({ do: "characters" });
      await w.bot.do({ do: "createCharacter", name: w.character, guild: w.guild, sex: w.sex, colors: COLORS[created++ % 2]! });
    }));
    const ja = await A!.do({ do: "joinMap", name: a.character });
    await B!.do({ do: "selectCharacter", name: b.character }); // "Jouer": the multiplayer screen
    const vb = await B!.do({ do: "village" }); // "Retour au village": the shared map
    await A!.do({ do: "sprite", name: b.character, cell: vb.cell as number });
    await B!.do({ do: "sprite", name: a.character, cell: ja.cell as number });
    await Promise.all([A!.do({ do: "smiley", index: 3 }), B!.do({ do: "smiley", from: a.character })]);
    await B!.do({ do: "toLobby" });
    await A!.do({ do: "sprite", name: b.character, gone: true });
    const back = await B!.do({ do: "village" });
    await A!.do({ do: "sprite", name: b.character, cell: back.cell as number });
    await A!.do({ do: "toLobby" });
    await B!.do({ do: "sprite", name: a.character, gone: true });
    const va = await A!.do({ do: "village" });
    await B!.do({ do: "sprite", name: a.character, cell: va.cell as number });
    await Promise.all([A!.quit(), B!.quit()]);
  },

  /** 8. Items: Iop A beats a passive Crâ B; A reads and closes its award box (`OAK`, "Nouvel objet : …"); on the shared
   *  map ("Retour au village") A opens the inventory, drags the item onto its slot (`OM<id>|<slot>`), off it again
   *  (`OM<id>|-1`) and back; after "Changer de perso" it is still equipped (`ASK` part 30); a second win brings a second
   *  item, which A drops from the bag (`OD` → `ODK`). */
  async items() {
    const [A, B] = await bots("items", "A", "B");
    const a: Who = { bot: A!, account: "olga", password: "olga-pass", character: "Olgarde", guild: 8, sex: 1 };
    const b: Who = { bot: B!, account: "paul", password: "paul-pass", character: "Paulin", guild: 9, sex: 0 };
    type Bag = { id: number; type: number; position: number; name: string }[];
    const superType = ((await Bun.file(join(ROOT, "web/public/lang/fr.json")).json()) as { I: { t: Record<string, { t: number }> } }).I.t;
    const slotOf = (type: number) => [1, 2, 3, 4, 3, 5].indexOf(superType[type]!.t); // InventoryViewer S598 slots 0..5
    const inventory = async () => (await A!.do({ do: "inventory" })).items as Bag;
    const win = async (game: string) => {
      const g = await duel(a, b, game, 1426, { cc: true }, { passive: true });
      if (g.a.result != "won" || !String(g.a.award).startsWith("Nouvel objet : ") || g.b.award) throw new Error(`award boxes: ${String(g.a.award)} / ${String(g.b.award)}`);
      await Promise.all([A!.do({ do: "leaveResult" }), B!.do({ do: "leaveResult" })]);
      return String(g.a.award).slice("Nouvel objet : ".length);
    };
    await Promise.all([enter(a, true), enter(b, true)]);
    const first = await win("Butin");
    await A!.do({ do: "village" });
    const [item] = await inventory();
    if (!item || item.name != first || item.position != -1) throw new Error(`award "${first}" vs the bag: ${JSON.stringify(item)}`);
    const slot = slotOf(item.type);
    await A!.do({ do: "equip", id: item.id, slot });
    await A!.do({ do: "equip", id: item.id, slot: -1 });
    await A!.do({ do: "equip", id: item.id, slot });
    await A!.do({ do: "changeCharacter" });
    await A!.do({ do: "selectCharacter", name: a.character });
    await A!.do({ do: "village" });
    const [kept] = await inventory();
    if (kept?.id != item.id || kept.position != slot) throw new Error(`not equipped after "Changer de perso": ${JSON.stringify(kept)}`);
    await A!.do({ do: "changeCharacter" });
    await A!.do({ do: "selectCharacter", name: a.character });
    const second = await win("Butin 2");
    await A!.do({ do: "village" });
    const bag = await inventory();
    const loot = bag.find((i) => i.id != item.id);
    if (bag.length != 2 || loot?.name != second || loot.position != -1) throw new Error(`second award "${second}" vs the bag: ${JSON.stringify(bag)}`);
    const left = (await A!.do({ do: "drop", id: loot.id })).items as Bag;
    if (left.length != 1 || left[0]!.id != item.id || left[0]!.position != slot) throw new Error(`after the drop: ${JSON.stringify(left)}`);
    await Promise.all([A!.quit(), B!.quit()]);
  },
};

// ---- main -----------------------------------------------------------------------------------------------------------
export { Bot, bots, duel, enter, startServer, stopServer, URL, type Who };
if (import.meta.main) await main();
async function main() {
const wanted = process.argv.slice(2).filter((a) => a != "all");
const order = wanted.length ? wanted : Object.keys(scenarios);
const results: [string, string][] = [];
const build = Bun.spawnSync(["cargo", "build", "--release"], { cwd: join(ROOT, "server"), stdout: "inherit", stderr: "inherit" });
if (build.exitCode != 0) throw new Error("cargo build failed");
await startServer();
for (const name of order) {
  const sc = scenarios[name];
  if (!sc) throw new Error(`unknown scenario ${name} (have: ${Object.keys(scenarios).join(", ")})`);
  log(`== ${name}`);
  const t = Date.now();
  try {
    await sc();
    results.push([name, `PASS (${Math.round((Date.now() - t) / 1000)} s)`]);
  } catch (e) {
    results.push([name, `FAIL: ${(e as Error).message}`]);
  }
  log(`== ${name}: ${results.at(-1)![1]}`);
}
stopServer();
rmSync(store, { recursive: true, force: true });
if (order.includes("coverage") || order.includes("fresh")) {
  for (const [g, spells] of Object.entries(CLASS_SPELLS)) {
    const got = covered.get(Number(g)) ?? [];
    if (got.length) log(`class ${g}: cast ${got.join(",")}; missing ${spells.filter((s) => !got.includes(s)).join(",") || "none"}`);
  }
  log(`maps played: ${[...maps].join(", ")}`);
}
log("\n" + results.map(([n, r]) => `${n}: ${r}`).join("\n") + `\nPNG timelines + logs: ${OUT}`);
process.exit(results.every(([, r]) => r.startsWith("PASS")) ? 0 : 1);
}
