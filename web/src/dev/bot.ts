// Playtest bot: one headless client (web/src/dev/headless-client.ts) against a real server, driven by JSON steps on
// stdin (one per line); every step answers one JSON line on stdout: {"ok":true,...} or {"ok":false,"error":...}.
// Steps act only through UI input (clicks, typing, keys); state is only read, for waiting and assertions.
//   bun web/src/dev/bot.ts <name> <ws-url> <shot-dir>
import { G } from "../game/globals.ts";
import { Button, type DisplayObject, MovieClip, TextField } from "../runtime/player.ts";
import { goalDistEstimate, PathFinding } from "../core/pathfinding.ts";
import { Cell } from "../game/battlefield/interaction.ts";
import { buttonIn, Headless, inside } from "./headless-client.ts";

const [name = "A", url = "ws://127.0.0.1:5555", shotDir] = process.argv.slice(2);

export type Step =
  | { do: "dump"; path?: string; depth?: number }
  | { do: "shot"; label: string }
  | { do: "wait"; ms: number }
  | { do: "frames"; last?: number }
  | { do: "click"; path: string }
  /** Login screen: type account + password, OK (login) or "S'inscrire" (register, authored), then the start menu or the error box. */
  | { do: "login" | "register"; account: string; password: string; expect?: "ok" | "refused" }
  | { do: "characters" }
  /** From the character list: Create → guild → sex → 3 colours (picked at fractions of the gradient) → name → Create. */
  | { do: "createCharacter"; name: string; guild: number; sex: 0 | 1; colors: [number, number][] }
  /** From the character list: pick the card, Play → village → multiplayer screen with the channel joined. */
  | { do: "selectCharacter"; name: string }
  /** Type a line in the lobby/fight console and send it with Enter or the Send button. */
  | { do: "chat"; text: string; via: "enter" | "button" }
  /** Wait until the chat log shows `text` (and with `bubble`, a speech bubble over a sprite of the map). */
  | { do: "waitChat"; text: string; ms?: number; bubble?: boolean }
  /** Lobby: open the free-games tab. */
  | { do: "freeGames" }
  /** Free-games tab: name, map (scrolling the map combo to it), "1 vs 1", optional password → Create → joined tab. */
  | { do: "createGame"; name: string; map: number; password?: string }
  /** Free-games tab: refresh the list, pick the game in the combo, optional password → Join → joined tab. */
  | { do: "joinGame"; name: string; password?: string; expect?: "ok" | "refused" }
  /** Joined tab: click the team radio button of my row. */
  | { do: "team"; team: 0 | 1 }
  /** Wait until the lobby shows `count` players. */
  | { do: "waitPlayers"; count: number }
  /** Joined tab, creator: Play → GS → map → GR → placement mode. Others: wait for placement mode. */
  | { do: "start"; creator: boolean }
  /** Placement: click my team's allowed cell `index` (skipping taken ones). */
  | { do: "place"; index: number }
  /** Play every turn of mine until the fight ends (result panel) or I leave. */
  | { do: "fight"; policy: Policy }
  /** Result panel: leave → GQ → GV → CJ → multiplayer screen. */
  | { do: "leaveResult" }
  /** Menu (top-left button) → "Déconnexion" → Yes → login screen. */
  | { do: "logout" }
  /** Lobby channel combo: pick a preset channel (CJ<name>). */
  | { do: "channel"; name: string }
  /** Lobby "Retour au village" (GC1 → village → GA x;3) → back to the multiplayer screen. */
  | { do: "village" }
  /** Lobby "Amis" tab: type a character name, Ajouter (FA<name>). */
  | { do: "addFriend"; name: string }
  /** Lobby "Jouer" → "Jouer seul" (GC3 + Gs) → the team tab under the search mask. */
  | { do: "playAlone" }
  /** Lobby "Jouer" → "Constituer une équipe" (GC3) → the team tab with my card and the friends to invite. */
  | { do: "makeTeam" }
  /** Team tab: pick `name` in the friends list ("Aléatoire" = a random team-mate) → Inviter (Gi<id>). */
  | { do: "invite"; name: string }
  /** The invitation box: answer Oui (GJ3) / Non (GY), or wait until it shows / until it is closed (Gy). */
  | { do: "invitation"; answer: "yes" | "no" | "seen" | "closed" }
  /** Team tab: wait for the team-mate card of `name` ("Aléatoire" = random slot). */
  | { do: "waitCard"; name: string }
  /** Team tab: "Annuler" on the (waiting or team-mate) card of `name` (GU<id>). */
  | { do: "cancelCard"; name: string }
  /** Team tab, creator: "Rechercher" on my card (Gs) → search mask. */
  | { do: "search" }
  /** Random result panel: the gift button (GQ + GC1 → village) → back to the multiplayer screen. */
  | { do: "gift" }
  /** From the character list: pick the card, "Rejoindre la carte" (PS + GW) → the village map with the other players. */
  | { do: "joinMap"; name: string }
  /** Village map: click `cell` (default: a free cell 4-8 steps away by the client path-finder, nearest the middle of the
   *  map); wait for the server's
   *  GA, my GKK and my sprite standing on it. */
  | { do: "walk"; cell?: number }
  /** Village map: walk onto the map-change plate `cell` like `walk`; after my GKK wait for map `map` drawn with my sprite
   *  on my cell of its `GM`, and fail if a sprite or a character of the old map is left. */
  | { do: "travel"; cell: number; map: number }
  /** Village map: wait until the sprite of `name` is drawn (its SWF loaded) and standing on `cell` (any), or is gone. */
  | { do: "sprite"; name: string; cell?: number; gone?: boolean }
  /** Village banner: the inventory button (B752) → the Inventory panel; returns the items the client holds. */
  | { do: "inventory" }
  /** Inventory panel: drag item `id` from the bag onto equipment slot `slot` (OM<id>|<slot>); `slot` -1: from its slot
   *  back to the bag (OM<id>|-1, InventoryViewer.onTestMouse). */
  | { do: "equip"; id: number; slot: number }
  /** Inventory panel: drag bag item `id` onto the drop zone, Oui in the question box (OD<id>) → ODK<id>, gone. */
  | { do: "drop"; id: number }
  /** Banner menu → "Changer de perso" → Oui → reconnect → the character list. */
  | { do: "changeCharacter" }
  /** Village map: banner menu → "Aller aux combats" (authored GX) → GAx;3 → the multiplayer screen with the channel joined. */
  | { do: "toLobby" }
  /** Banner smiley bar (B779) → smiley `index` (BS) → cS → shown over my sprite. With `from`: wait for the smiley over
   *  the sprite of `from` (it goes after SMILEY_DELAY = 3 s, so run it alongside the sender's step). */
  | { do: "smiley"; index?: number; from?: string };

export type Policy = {
  /** Spell ids to cast at least once, in this order (each when it is castable). */
  want?: number[];
  /** Do at least one close combat. */
  cc?: boolean;
  /** First turn: aim a spell and the close combat at the enemy out of range; the client must not send anything. */
  outOfRange?: boolean;
  /** First turn: click a cell beyond my AP; the client must not send a move. */
  apCap?: boolean;
  /** My turn numbers (1-based) on which I do nothing and let the server's turn timer end the turn. */
  idleTurns?: number[];
  /** Never attack beyond `want`/`cc` (lets the opponent cover its own spells). */
  passive?: boolean;
  /** At the start of my turn n: menu → Abandonner → Oui. */
  giveUpAtTurn?: number;
  /** Stop (step fails) after this long. */
  maxMs?: number;
  /** Say this in the fight chat (banner console + Enter) at the start of my first turn. */
  say?: string;
  /** This line must have reached my fight chat log by the end of the fight. */
  hear?: string;
};

/** `G.A.b.c` read by path (state reads only). */
function at(path: string): unknown {
  let o: unknown = G;
  for (const k of path.split(".")) o = o == null ? undefined : (o as Record<string, unknown>)[k];
  return o;
}

const h = await Headless.boot({ serverURL: url, realTime: true, shotDir });
const DC = () => G.DATACENTER;
type Combo = MovieClip & { downArrow: MovieClip; container_mc: MovieClip; getSelectedItem(): Item | undefined };
type Item = { label?: unknown; data?: unknown } | undefined;
/** My row (TabGameJoined_Player) in the joined tab. */
const myRow = () => {
  const players = (G.INTERFACE.UIInterfaceMultiPlayer?.Tabs?.TabGameJoined as MovieClip | undefined)?.players as MovieClip | undefined;
  return players?.$.children.find((c) => c instanceof MovieClip && String(c.playerID) == String(DC().Player.ID)) as MovieClip | undefined;
};
const joinTab = () => G.INTERFACE.UIInterfaceMultiPlayer!.Tabs!.TabJoinGame as MovieClip;
/** Open a combo box, scroll its popup with the scroll bar's down arrow until an item matches, click it. */
async function pickCombo(label: string, cb: Combo, ok: (d: Item) => boolean) {
  h.click(`${label} combo`, cb.downArrow);
  await h.run(300);
  await pickList(label, cb, ok);
}
/** Click the first list row (container_mc.fListItem<i>_mc) whose item matches, scrolling down as needed. */
async function pickList(label: string, cb: Combo, ok: (d: Item) => boolean) {
  for (let n = 0; n < 100; n++) {
    const items = cb.container_mc.$.children.filter((c) => c._name?.startsWith("fListItem") && c._visible) as (MovieClip & { getItemModel(): Item; highlight_mc: MovieClip })[];
    const hit = items.find((i) => ok(i.getItemModel()));
    if (hit) {
      h.click(`${label} item`, hit.highlight_mc);
      await h.run(300);
      if (!ok(cb.getSelectedItem())) {
        // a ListBox's first click only arms `clickFilter` (Ank.Dofus.ListBox.as:120-125): click again, as a player does
        h.click(`${label} item again`, hit.highlight_mc);
        await h.run(300);
      }
      if (!ok(cb.getSelectedItem())) throw new Error(`${label}: selected ${JSON.stringify(cb.getSelectedItem())}`);
      return;
    }
    const down = (cb.container_mc.scrollBar_mc as MovieClip | undefined)?.downArrow_mc as MovieClip | undefined;
    if (!down?._visible) break;
    h.click(`${label} scroll down`, down);
    await h.run(60);
  }
  throw new Error(`${label}: no matching item in the combo`);
}
const gone = (o: DisplayObject | undefined) => !o || o.$.removed;
/** The character list's card of `name`. */
function cardOf(name: string) {
  const list = G.INTERFACE.UIInterfaceCharacters!;
  for (let i = 0; i < 10; i++) {
    const c = list[`choice${i}`] as MovieClip | undefined;
    if ((c?._data as { name?: string } | undefined)?.name == name) return c;
  }
  throw new Error(`no character card "${name}"`);
}
/** The chat window of the current screen (lobby, or the fight banner). */
const chatOut = () => G.AKS.Chat.output as (MovieClip & { txtConsole?: DisplayObject; txtChat?: { text: string } }) | undefined;

// ---- random games (lobby "Jouer" tabs) ------------------------------------------------------------------------------
const tabs = () => G.INTERFACE.UIInterfaceMultiPlayer?.Tabs;
const tabIn = (i: number) => () => tabs()?.currLayer == i && !tabs()!.bInMove; // Interface.MultiPlayer.Tabs.as:3
const teamTab = () => tabs()?.TabPlayDofus as (MovieClip & { players?: MovieClip; maskSearch?: MovieClip; teamMateChoose?: MovieClip }) | undefined;
type Card = MovieClip & { id?: unknown; bWaitingCmp?: boolean; teamMateName?: unknown; btnPlay?: MovieClip; btnCancel?: MovieClip };
/** The team tab's card of `name`: a waiting card by its name, a team-mate card by its character (id 0 = random slot). */
const card = (name: string, waiting?: boolean) =>
  teamTab()?.players?.$.children.find((c): c is Card => {
    const k = c as Card;
    if (!(c instanceof MovieClip) || c.$.removed || (waiting != undefined && !!k.bWaitingCmp != waiting)) return false;
    if (k.bWaitingCmp) return String(k.teamMateName) == name;
    return Number(k.id) == 0 ? name == "Aléatoire" : DC().Characters.getItemAt(Number(k.id))?.name == name;
  });
const searching = () => !!teamTab()?.maskSearch?._visible && DC().Game.bInSearch;
/** Wait for the multiplayer screen drawn again after a trip through the village (GC1 … GA x;3, then CJ → CJK). */
/** "Retour au village" / the gift button: past the first bounce after `PS`, the server keeps the player on the shared map. */
async function toSharedMap(r0: number) {
  await h.need("village (GCK|1)", () => h.received.slice(r0).includes("GCK|1"), 10000);
  await h.need("shared map with me on it", () => h.received.slice(r0).some((f) => f.startsWith("GM|")) && G.BATTLEFIELD.Container._visible && me()?.cell != undefined && drawn(me()), 20000);
  if (h.received.slice(r0).some((f) => f.startsWith("GAx;3;"))) throw new Error("sent to the multiplayer screen");
  await h.run(1000);
}

// ---- inventory (banner panel S602, InventoryViewer S598) -------------------------------------------------------------
type Viewer = MovieClip & { inventoryScroller_mc?: MovieClip & { selectedItem?: { m_ID: unknown }; selectedIndex: number; scroller_mc?: MovieClip }; drop_mc?: MovieClip; objectInfosViewer_mc?: MovieClip };
const viewer = () => (G.INTERFACE.UIInterfaceBanner?.panels.Inventory as MovieClip | undefined)?.inventoryViewer_mc as Viewer | undefined;
const itemOf = (id: number) => DC().Player.Inventory.find((i) => Number(i.m_ID) == id);
const bag = () => DC().Player.Inventory.map((i) => ({ id: i.m_ID, type: i.m_Type, gfx: i.m_Gfx, position: i.m_Position, name: i.name, description: i.description.trim() }));
/** A player's drag: press on `from`, move onto `to`, release (the inventory drags with setSpellCursor; the drop target
 *  gets its `release` through trackAsMenu). `on`: the release must land on `to`. */
async function drag(label: string, from: DisplayObject | undefined, to: DisplayObject | undefined, on = true) {
  if (!from || !to) throw new Error(`${label}: nothing to drag`);
  const a = h.centre(from), b = h.centre(to);
  h.p.mouseMove(a.x, a.y);
  if (!inside(h.p.target(), from)) throw new Error(`${label}: the press lands on ${String(h.p.target())}`);
  h.p.mouseDown();
  for (let k = 1; k <= 5; k++) h.p.mouseMove(a.x + ((b.x - a.x) * k) / 5, a.y + ((b.y - a.y) * k) / 5), await h.run(60);
  if (on && !inside(h.p.target(), to)) throw new Error(`${label}: the release lands on ${String(h.p.target())}`);
  h.p.mouseUp();
  await h.run(300);
}
/** Turn the bag carousel (B556, `move(true)`) until item `id` is the centred one, the only one enabled (finalizeScroll). */
async function centreItem(v: Viewer, id: number) {
  const arrow = findClip(v, "", (o) => o instanceof Button && o.$.id == 556);
  for (let n = 0; n < 40 && Number(v.inventoryScroller_mc?.selectedItem?.m_ID) != id; n++) h.click("bag arrow", arrow), await h.run(600);
  const sc = v.inventoryScroller_mc;
  if (Number(sc?.selectedItem?.m_ID) != id) throw new Error(`item ${id} is not in the bag`);
  return sc?.scroller_mc?.[`item${sc.selectedIndex}_mc`] as MovieClip | undefined;
}

// ---- fight ----------------------------------------------------------------------------------------------------------
type Char = NonNullable<ReturnType<typeof G.DATACENTER.Characters.getItemAt>>;
/** The visible sprite of a character (Container.Object2.clips.sprite<id>), if it has one. */
const spriteOf = (c: Char | null | undefined) => {
  const s = (c?.clip as { sprite?: MovieClip } | null | undefined)?.sprite;
  return s && !s.$.removed ? s : undefined;
};
/** Its character SWF arrived (a loadMovie still pending reports 4 bytes) and draws something. */
const drawn = (c: Char | null | undefined) => {
  const k = spriteOf(c)?.clip as MovieClip | undefined, b = k?.getBounds(h.p.root);
  return !!k && k.getBytesTotal() > 4 && !!b && b.xMax > b.xMin;
};
const characterNamed = (name: string) => DC().Characters.items.find((c) => c?.name == name);
const me = () => DC().Player.data as Char;
const myID = () => String(DC().Player.ID);
const myTurn = () => String(DC().Game.currentPlayerID) == myID();
const resultPanel = () => {
  const p = G.INTERFACE.UIInterfaceBanner?.extraPanels as MovieClip | undefined;
  return (p?.GameResultFree ?? p?.GameResultRandom) as MovieClip | undefined;
};
const over = () => !!resultPanel() && !gone(resultPanel());
/** First living enemy in turn order (`isDied` is always false: nothing sets `bDied`, Dofus.DataCenter.Character.as). */
const enemy = () =>
  DC().Game.turnSequence.map((id) => DC().Characters.getItemAt(Number(id))).find((c) => c && c.team != me().team && Number(c.LP) > 0 && DC().Game.players.getItemAt(Number(c.num))) as Char | undefined;
/** DefineButton2_134 (`on(release)`: KERNEL.showMenu), the menu button of the lobby and fight screens. */
const menuButton = () => findClip(h.p.root, "", (o) => o instanceof Button && o.$.id == 134);
/** Depth-first search for a visible display object by instance name (or predicate). */
function findClip(root: DisplayObject | undefined, name: string, ok?: (o: DisplayObject) => boolean): DisplayObject | undefined {
  if (!root || root.$.removed) return undefined;
  if ((ok ? ok(root) : root._name == name) && root._visible) return root;
  const kids = root instanceof MovieClip ? root.$.children : root instanceof Button ? root.$children : [];
  for (const k of kids) {
    const f = findClip(k, name, ok);
    if (f) return f;
  }
  return undefined;
}
/** The visible message box (INTERFACE.msgBox), if any. */
const messageBox = () => findClip(G.INTERFACE?.BoxLayer_mc, "boxMessage");
/** Close message boxes with their "Fermer" button, as a player does before going on. */
async function closeMessages() {
  for (let box = messageBox(); box; box = messageBox()) {
    h.click("close message", findClip(box, "close_btn"));
    await h.run(300);
    if (box === messageBox() && !box.$.removed && box._visible) throw new Error("the message box does not close");
  }
}
type Spell = { m_ID: unknown; m_APCost: unknown; m_Range: unknown; m_bOnItSelf: boolean | null; m_bFreeCell: boolean | null; m_bLineOfSight: boolean | null };
type Slot = MovieClip & { getData(): Spell | null | undefined };
/** The banner spell slots us1..us8 (their containers). */
const slots = () => {
  const b = G.INTERFACE.UIInterfaceBanner?.banner as MovieClip | undefined;
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (b?.[`us${i}`] as MovieClip | undefined)?.container as Slot | undefined).filter((c) => c != undefined);
};
const slot = (id: number) => slots().find((c) => Number(c.getData()?.m_ID) == id);
const mySpells = () => slots().map((c) => c.getData()).filter((d) => d != undefined);

/** A scratch PathFinding over the live map (reads only: its own Player record receives the paths). `ap` caps the path. */
function scratchPF(ap = Number(me().AP)) {
  const m = me(), data = { team: m.team, AP: ap, cell: m.cell, EffectsManager: m.EffectsManager };
  const scratch = { tmpPath: null, tmpFullPath: null, lastClickedCell: null, currentSpell: null as { m_bOnItSelf: boolean | null } | null, data };
  const pf = new PathFinding({ Map: DC().Map as never, Player: scratch as never, Game: DC().Game, Characters: DC().Characters as never }, undefined);
  return { pf, scratch: scratch as { tmpFullPath: { num: number }[] | null; currentSpell: { m_bOnItSelf: boolean | null } | null } };
}
/** Reachable cells (path length ≤ budget) with their cost, by the client's own path-finder. */
function reachable(budget: number, cap?: number) {
  const { pf, scratch } = scratchPF(cap), from = Number(me().cell), w = DC().Map.width, out: { cell: number; cost: number }[] = [];
  for (let c = 0; c < DC().Map.data.length; c++) {
    if (c == from || goalDistEstimate(from, c, w) > budget || !canWalkTo(c)) continue;
    pf.pathFind(from, c, true);
    const n = scratch.tmpFullPath?.length;
    if (n != undefined && n <= budget) out.push({ cell: c, cost: n });
  }
  return out;
}
/** A cell a move click can target: `calculatePath` refuses occupied and movement-0 cells before path-finding
 *  (`PathFinding.as:22-30`), while `pathFind` itself lets a path end on a movement-0 cell in an enemy tackle zone. */
const canWalkTo = (c: number) => DC().Map.data[c]?.playerOnID == undefined && Number(DC().Map.data[c]?.movement) != 0;
/** The client path-finder's shortest walk (any length) to a free cell next to `to`. */
function pathNextTo(to: number) {
  const { pf, scratch } = scratchPF(500), from = Number(me().cell), w = DC().Map.width;
  let best: number[] | undefined;
  for (const d of [w, w - 1, -(w - 1), -w]) {
    if (to + d == from) return [];
    if (!canWalkTo(to + d)) continue;
    pf.pathFind(from, to + d, true);
    const p = scratch.tmpFullPath?.map((x) => x.num);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
}
/** Would `spell` be castable from `from` on `to` (range + line of sight, as Interaction.onCellRollOver tests)? */
function inReach(spell: Spell | "cc", from: number, to: number) {
  const { pf, scratch } = scratchPF(), w = DC().Map.width;
  if (spell == "cc") return goalDistEstimate(from, to, w) <= 1 && pf.checkView(from, to);
  scratch.currentSpell = spell;
  const r = Math.max(1, Number(spell.m_Range) + Number(me().EffectsManager.getModeratorValue(19) ?? 0));
  return goalDistEstimate(from, to, w) <= r && (!spell.m_bLineOfSight || pf.checkView(from, to));
}

type FightLog = { turns: number; cast: number[]; cc: number; checks: string[]; timerExpired: number; result?: string; moves: number; refused: string[] };

/** Fire a UI action that should make the client send `code` (GA001 / GA300 / GA303); wait for the whole exchange. */
async function act(log: FightLog, label: string, code: string, fire: () => void) {
  const s0 = h.sent.length, r0 = h.received.length;
  fire();
  if (!(await h.until(`${label}: ${code} sent`, () => h.sent.slice(s0).some((f) => f.startsWith(code)), 1500))) {
    h.notes.push(`${label} not sent: mouse on ${String(h.p.target())} → cell ${String(h.cellUnderMouse())}, interaction type ${String(G.BATTLEFIELD.Interaction.type)} enabled ${String(G.BATTLEFIELD.Interaction.isEnable())}, cell handlers ${typeof (Cell.prototype as unknown as { onRelease?: unknown }).onRelease}, waiting ${String(me().GameActionsManager.isWaiting())}`);
    return false;
  }
  await h.need(`${label}: GAF`, () => h.received.slice(r0).some((f) => f == "GAF" + myID()) || over(), 8000);
  const type = { GA001: "1", GA300: "300", GA303: "303" }[code];
  const ga = h.received.slice(r0).find((f) => new RegExp(`^GA\\d+;${type};${myID()};`).test(f));
  if (!ga) {
    log.refused.push(`${label}: the client sent ${h.sent.slice(s0).join(" ").trim()}, the server refused (GAF only)`);
    throw new Error(log.refused.at(-1));
  }
  // GAF already resets the action manager; the action is over once it is acknowledged (GKK<n>, end of the animation)
  // and the actor's sequencer has run the queued tail (AP update, interaction re-enabled: Events.AKS.Game.as:474-494).
  const ack = "GKK" + ga.slice(2, ga.indexOf(";")) + "\n";
  await h.need(`${label}: ${ack.trim()} and sequencer idle`, () => over() || (h.sent.slice(s0).includes(ack) && !me().SEQUENCER_actions.isPlaying() && G.BATTLEFIELD.Interaction.isEnable()), 20000);
  await h.run(300);
  return true;
}

/** Click the slot, roll over the candidate cells; click the first one the client accepts. */
async function cast(log: FightLog, spell: Spell, targets: number[]) {
  const c = slot(Number(spell.m_ID));
  if (!c || !myTurn()) return false;
  for (const t of targets.slice(0, 40)) {
    if (G.BATTLEFIELD.Interaction.type != 2) {
      h.click(`spell ${String(spell.m_ID)}`, c);
      await h.run(150);
      if (G.BATTLEFIELD.Interaction.type != 2) return false; // AP or limits: the client refuses to aim
    }
    h.hoverCell(t);
    if (G.BATTLEFIELD.Interaction.canLaunchSpell) {
      h.shot(`aim-${String(spell.m_ID)}`, false);
      const ok = await act(log, `spell ${String(spell.m_ID)} on ${t}`, "GA300", () => (h.p.mouseDown(), h.p.mouseUp()));
      if (ok) log.cast.push(Number(spell.m_ID));
      return ok;
    }
  }
  // nothing valid: a click on a refused cell leaves spell mode without sending (Events.Battlefield.Interaction.as:47-52)
  if (G.BATTLEFIELD.Interaction.type == 2) h.clickCell("cancel spell", targets[0] ?? Number(me().cell));
  await h.run(200);
  return false;
}
async function closeCombat(log: FightLog, target: number) {
  if (!myTurn()) return false;
  h.click("close combat", findClip(G.INTERFACE.UIInterfaceBanner?.banner, "BtnCC"));
  await h.run(150);
  if (G.BATTLEFIELD.Interaction.type != 3) return false;
  h.hoverCell(target);
  if (!G.BATTLEFIELD.Interaction.canLaunchSpell) {
    h.clickCell("cancel close combat", target);
    return false;
  }
  const ok = await act(log, `close combat on ${target}`, "GA303", () => (h.p.mouseDown(), h.p.mouseUp()));
  if (ok) log.cc++;
  return ok;
}
async function moveTo(log: FightLog, cell: number) {
  await h.run(600); // CLICK_MINIMUM_TIMER between two cell clicks
  const ap = Number(me().AP);
  const ok = await act(log, `move to ${cell}`, "GA001", () => h.clickCell("move", cell));
  if (ok) {
    log.moves++;
    if (me().cell != cell) throw new Error(`move to ${cell}: I am on ${String(me().cell)}`);
    if (Number(me().AP) >= ap) throw new Error(`move to ${cell}: AP ${ap} → ${String(me().AP)}`);
  }
  return ok;
}
/** Expect the client to refuse `fire` without sending `code`. */
async function refused(log: FightLog, label: string, code: string, fire: () => void) {
  const s0 = h.sent.length;
  fire();
  await h.run(800);
  const sent = h.sent.slice(s0).filter((f) => f.startsWith(code));
  if (sent.length) throw new Error(`${label}: the client sent ${sent.join(" ").trim()}`);
  if (G.BATTLEFIELD.Interaction.type != 1) throw new Error(`${label}: interaction type ${String(G.BATTLEFIELD.Interaction.type)}, not back to move`);
  log.checks.push(label);
  h.shot(label.replace(/\W+/g, "-"));
}

/** Leave spell / close-combat aiming without casting: roll out of the cell (Events.Battlefield.Interaction.as:150-177
 *  arms "the next mouse up returns to move") and click the empty last banner slot, which does nothing else. */
async function cancelAim() {
  h.click("cancel aim", slots().at(-1));
  await h.run(200);
  if (G.BATTLEFIELD.Interaction.type != 1) throw new Error(`cancel aim: interaction type ${String(G.BATTLEFIELD.Interaction.type)}`);
}

/** Why nothing is possible: positions, and for each spell and the close combat what the bot and the client think. */
async function diagnose() {
  const f = enemy(), here = Number(me().cell), to = Number(f?.cell), out: string[] = [];
  out.push(`me ${here} (AP ${String(me().AP)}), enemy ${to}, distance ${goalDistEstimate(here, to, DC().Map.width)}, view ${scratchPF().pf.checkView(here, to)}`);
  for (const x of mySpells()) {
    const can = DC().Player.SpellsManager.checkCanLaunchSpell(String(x.m_ID), undefined);
    let client = "-";
    if (can && Number(x.m_APCost) <= Number(me().AP)) {
      h.click("diagnose spell", slot(Number(x.m_ID)));
      h.hoverCell(Number(x.m_Range) == 0 ? here : to);
      client = String(G.BATTLEFIELD.Interaction.canLaunchSpell);
      await cancelAim();
    }
    out.push(`spell ${String(x.m_ID)} (${String(x.m_APCost)} AP, range ${String(x.m_Range)}, los ${String(x.m_bLineOfSight)}): limits ok ${String(can)}, bot reach ${inReach(x, here, to)}, client aim ${client}`);
  }
  const walk = pathNextTo(to);
  out.push(`close combat: bot reach ${inReach("cc", here, to)}, path next to the enemy ${JSON.stringify(walk)}`);
  if (walk?.length) {
    h.hoverCell(walk[0]!);
    const pt = h.p.target();
    out.push(`hover ${walk[0]}: mouse on ${String(pt)} reaching cell ${String(h.cellUnderMouse())}, client path ${JSON.stringify(DC().Player.tmpPath)}, interaction type ${String(G.BATTLEFIELD.Interaction.type)} enabled ${String(G.BATTLEFIELD.Interaction.isEnable())}`);
  }
  return out.join("; ");
}

async function fight(p: Policy): Promise<Record<string, unknown>> {
  const log: FightLog = { turns: 0, cast: [], cc: 0, checks: [], timerExpired: 0, moves: 0, refused: [] };
  const want = [...(p.want ?? [])];
  let ccWanted = !!p.cc;
  const end = Date.now() + (p.maxMs ?? 600000);
  const r0 = h.received.map((f) => f.startsWith("GPS")).lastIndexOf(true); // the fight's frames start at the placement
  await h.need("fight started (or ended)", () => (DC().Game.turnSequence.length > 0 && DC().Game.currentPlayerID != null) || over(), 60000);
  h.shot("fight-start");
  // a turn of mine starts with each GTS<me>| (counted from the frames, so a turn is played once)
  const myTurns = () => h.received.slice(r0).filter((f) => f.startsWith(`GTS${myID()}|`)).length;
  let idleRun = 0, heard = false;
  // the chat log shows its last 30 lines (Dofus.Chat.as:77-110): look for `hear` while the fight goes on
  const listen = () => (heard ||= !!p.hear && !!chatOut()?.txtChat?.text.includes(p.hear));
  while (!over()) {
    listen();
    if (Date.now() > end) throw new Error(`fight still running after ${p.maxMs ?? 600000} ms: ${JSON.stringify(log)}`);
    if (!G.INTERFACE.UIInterfaceBanner || gone(G.INTERFACE.UIInterfaceBanner)) {
      if (!gone(G.INTERFACE.UIInterfaceMultiPlayer)) return { ...log, result: "left" };
    }
    if (!myTurn() || !me() || me().isDied || myTurns() == log.turns) {
      await h.run(100);
      continue;
    }
    log.turns = myTurns();
    const turn = log.turns, foe = enemy();
    await h.run(500);
    h.shot(`turn-${turn}`);
    if (!foe) {
      const seq = DC().Game.turnSequence.map((id) => {
        const c = DC().Characters.getItemAt(Number(id));
        return { id, team: c?.team, died: c?.isDied, inGame: !!DC().Game.players.getItemAt(Number(c?.num)), num: c?.num };
      });
      throw new Error(`my turn ${turn} but no enemy: me team ${String(me().team)}, ${JSON.stringify(seq)}`);
    }
    if (turn == 1 && p.say) {
      h.type("fight chat", chatOut()?.txtConsole, p.say);
      h.key(13, 13);
      await h.need("fight chat sent", () => h.sent.some((f) => f.startsWith("BM") && f.includes(p.say!)), 3000);
    }
    if (p.giveUpAtTurn == turn) {
      h.click("menu", menuButton());
      await h.run(400);
      h.click("give up", findClip(G.INTERFACE.BoxLayer_mc, "giveup_btn"));
      await h.run(300);
      h.click("yes", findClip(G.INTERFACE.BoxLayer_mc, "yes_btn"));
      await h.need("back to the multiplayer screen", () => G.INTERFACE.UIInterfaceMultiPlayer && !gone(G.INTERFACE.UIInterfaceMultiPlayer), 10000);
      await h.run(800);
      h.shot("gave-up");
      return { ...log, result: "gave up" };
    }
    if (p.idleTurns?.includes(turn)) {
      await h.need("turn timer expiry", () => !myTurn() || over(), 120000);
      log.timerExpired++;
      h.shot(`turn-${turn}-expired`);
      continue;
    }
    if (turn == 1 && p.apCap) {
      const far = reachable(Number(me().AP) + 3, 500).filter((r) => r.cost > Number(me().AP)).sort((a, b) => a.cost - b.cost)[0];
      if (far) await refused(log, `move beyond AP (${far.cost} > ${String(me().AP)} AP) refused`, "GA001", () => h.clickCell("too far", far.cell));
    }
    if (turn == 1 && p.outOfRange) {
      const sp = mySpells().find((x) => Number(x.m_Range) > 0 && !x.m_bOnItSelf && !x.m_bFreeCell && !inReach(x, Number(me().cell), Number(foe.cell)));
      if (sp) {
        await refused(log, `spell ${String(sp.m_ID)} out of range refused`, "GA300", () => {
          h.click("spell slot", slot(Number(sp.m_ID)));
          h.clickCell("out of range target", Number(foe.cell));
        });
      }
      if (!inReach("cc", Number(me().cell), Number(foe.cell)))
        await refused(log, "close combat out of range refused", "GA303", () => {
          h.click("close combat", findClip(G.INTERFACE.UIInterfaceBanner?.banner, "BtnCC"));
          h.clickCell("out of range target", Number(foe.cell));
        });
    }
    const actionsBefore = log.cast.length + log.cc + log.moves;
    for (let guard = 0; guard < 15 && myTurn() && !over(); guard++) {
      await h.need("interaction enabled", () => G.BATTLEFIELD.Interaction.isEnable() || !myTurn() || over(), 10000);
      const f = enemy();
      if (!f) break;
      const ap = Number(me().AP), here = Number(me().cell), spells = mySpells();
      const byId = (id: number) => spells.find((x) => Number(x.m_ID) == id);
      const targetsOf = (x: Spell) => {
        if (Number(x.m_Range) == 0) return [here];
        if (x.m_bFreeCell) // a free walkable cell in range, nearest to the enemy first
          return DC().Map.data.map((_, c) => c)
            .filter((c) => c != here && DC().Map.data[c]?.playerOnID == undefined && Number(DC().Map.data[c]?.movement) > 1 && inReach(x, here, c))
            .sort((a, b) => goalDistEstimate(a, Number(f.cell), DC().Map.width) - goalDistEstimate(b, Number(f.cell), DC().Map.width));
        return [Number(f.cell)];
      };
      let did = false;
      for (const id of want) {
        const x = byId(id);
        if (!x || Number(x.m_APCost) > ap || !DC().Player.SpellsManager.checkCanLaunchSpell(String(id), undefined)) continue;
        if (await cast(log, x, targetsOf(x))) {
          want.splice(want.indexOf(id), 1);
          did = true;
          break;
        }
      }
      if (did) continue;
      const ccAP = Number(DC().Player.CCData.m_APCost);
      if ((ccWanted || !p.passive) && ap >= ccAP && inReach("cc", here, Number(f.cell)) && (await closeCombat(log, Number(f.cell)))) {
        ccWanted = false;
        continue;
      }
      if (!p.passive && !want.length && !ccWanted) {
        for (const x of spells)
          if (Number(x.m_APCost) <= ap && Number(x.m_Range) > 0 && !x.m_bFreeCell && inReach(x, here, Number(f.cell)) && (await cast(log, x, [Number(f.cell)]))) {
            did = true;
            break;
          }
        if (did) continue;
      }
      // move toward the next goal: a wanted spell (keeping its AP), the close combat, or any attack — along the
      // path-finder's walk to the enemy, stopping on the first cell the goal reaches from
      const goal = want.map(byId).find((x) => x && !x.m_bFreeCell && Number(x.m_Range) > 0 && DC().Player.SpellsManager.checkCanLaunchSpell(String(x.m_ID), undefined)) ??
        (ccWanted || !p.passive ? "cc" : undefined);
      if (!goal || inReach(goal, here, Number(f.cell))) break;
      const budget = ap - (goal == "cc" ? ccAP : Number(goal.m_APCost));
      const walk = pathNextTo(Number(f.cell))?.slice(0, Math.max(0, budget));
      if (!walk?.length) break;
      const stop = walk.find((c) => inReach(goal, c, Number(f.cell))) ?? walk.at(-1)!;
      if (!(await moveTo(log, stop))) break;
    }
    idleRun = log.cast.length + log.cc + log.moves == actionsBefore ? idleRun + 1 : 0;
    if (idleRun >= 3 && !p.passive && myTurn() && !over()) throw new Error(`stalled: 3 turns without an action. ${await diagnose()}`);
    if (myTurn() && !over()) {
      await h.run(300);
      h.click("end turn", buttonIn(G.INTERFACE.UIInterfaceBanner?.banner.btnNextTurnBanner));
      await h.need("turn passed", () => !myTurn() || over(), 10000);
    }
  }
  await h.run(1500);
  h.shot("result");
  // a winner's item (OAK → msgBox "Nouvel objet : <name>"), read and closed as a player does before going on
  const award = messageBox() && String((findClip(messageBox(), "", (o) => o instanceof TextField && o.text.length > 3) as TextField | undefined)?.text);
  await closeMessages();
  if (p.hear && !heard) await h.need(`fight chat line "${p.hear}"`, listen, 3000);
  const won = DC().Game.Results.winners?.some((w) => String((w as { id?: unknown }).id) == myID());
  return { ...log, result: won ? "won" : "lost", wantLeft: want, ccLeft: ccWanted, results: DC().Game.Results, ...(award ? { award } : {}) };
}

async function step(s: Step): Promise<Record<string, unknown>> {
  switch (s.do) {
    case "dump":
      return { tree: h.dump((s.path ? at(s.path) : h.p.root) as DisplayObject | undefined, s.depth ?? 3) };
    case "shot":
      return { file: h.shot(s.label) };
    case "click":
      h.click(s.path, at(s.path) as DisplayObject | undefined);
      await h.run(300);
      return {};
    case "characters":
      h.click("menu play", G.INTERFACE.CommonLayer_mc.MenuInterface?.play_btn as DisplayObject | undefined);
      await h.need("character list", () => G.INTERFACE.UIInterfaceCharacters?.choice0);
      await h.run(500);
      h.shot("characters");
      return {};
    case "createCharacter": {
      const list = G.INTERFACE.UIInterfaceCharacters;
      h.click("create", list?.btnCreate);
      await h.need("creation screen", () => G.INTERFACE.UIdofusgraphicsguiUICreateCharacter);
      const ui = G.INTERFACE.UIdofusgraphicsguiUICreateCharacter!;
      const acc = ui.$.children.find((c) => c instanceof MovieClip && c.menu1) as MovieClip;
      const menu = (i: number) => acc[`menu${i}`] as MovieClip;
      const child = (m: MovieClip, depth: number) => m.$childAt(depth - 16384) as DisplayObject | undefined;
      const opened = (i: number) => h.need(`menu ${i} open`, () => menu(i)._currentframe == 14 && menu(1)._y == -20 * (i - 1));
      await opened(1);
      await h.run(300);
      const m1 = menu(1);
      h.click(`guild ${s.guild}`, m1[`g${s.guild}_btn`] as DisplayObject, h.centre(m1[`guild${s.guild}_txt`] as DisplayObject));
      await h.need("guild chosen", () => ui.guildID == s.guild);
      await h.run(500);
      h.shot("create-guild");
      h.click("validate guild", child(m1, 42));
      await opened(2);
      await h.run(300);
      const m2 = menu(2);
      h.click(s.sex ? "woman" : "man", m2[s.sex ? "woman_pbtn" : "man_pbtn"] as DisplayObject);
      await h.need("sex chosen", () => ui.sex == s.sex);
      await h.run(500);
      h.click("validate sex", child(m2, 21));
      await opened(3);
      await h.run(300);
      const m3 = menu(3), picker = (m3.colorPicker_mc as MovieClip).colors as MovieClip;
      for (const [i, [fx, fy]] of s.colors.entries()) {
        h.click(`colour button ${i + 1}`, m3[`color${i + 1}_pbtn`] as DisplayObject);
        await h.run(200);
        const b = picker.getBounds(h.p.root);
        h.click(`colour ${i + 1}`, picker, { x: b.xMin + 2 + fx * (b.xMax - b.xMin - 4), y: b.yMin + 2 + fy * (b.yMax - b.yMin - 4) });
        await h.need(`colour ${i + 1} chosen`, () => ui.colors[i + 1] != -1);
        await h.run(200);
      }
      h.shot("create-colours");
      h.click("validate colours", child(m3, 10));
      await opened(4);
      await h.run(300);
      const m4 = menu(4);
      h.type("name", m4.characNameValue_txt, s.name);
      h.shot("create-name");
      const before = h.received.length;
      h.click("create character", child(m4, 10));
      await h.need("character list with the new character", () =>
        h.received.slice(before).some((f) => f.startsWith("AL")) && G.INTERFACE.UIInterfaceCharacters?.choice0 && gone(G.INTERFACE.UIdofusgraphicsguiUICreateCharacter));
      await h.run(800);
      h.shot("characters-after-create");
      return { colors: ui.colors, list: h.received.filter((f) => f.startsWith("AL")).at(-1) };
    }
    case "selectCharacter": {
      const list = G.INTERFACE.UIInterfaceCharacters!;
      h.click("select character", cardOf(s.name));
      await h.run(300);
      h.click("play character", list.btnPlay);
      await h.need("multiplayer screen", () => G.INTERFACE.UIInterfaceMultiPlayer && DC().Channel.m_name, 20000);
      await h.need("channel users", () => h.received.some((f) => f.startsWith("CLK")));
      await h.run(800);
      h.shot("multiplayer");
      return { id: DC().Player.ID, channel: DC().Channel.m_name };
    }
    case "chat": {
      const out = chatOut();
      h.type("console", out?.txtConsole, s.text);
      if (s.via == "enter") h.key(13, 13);
      else h.click("send", (out?.btnSend ?? (out as MovieClip | undefined)?.$childAt(7 - 16384)) as DisplayObject | undefined);
      await h.need("message sent", () => h.sent.some((f) => f.startsWith("BM") && f.includes(s.text)), 3000);
      return {};
    }
    case "waitChat":
      await h.need(`chat line "${s.text}"`, () => chatOut()?.txtChat?.text.includes(s.text), s.ms ?? 10000);
      if (s.bubble) // Character.say: one DialogBubbleSymbol per speaker in Container.Text (Events.AKS.Chat.as:46-58)
        await h.need(`speech bubble "${s.text}"`, () => (G.BATTLEFIELD.Container.Text as MovieClip).$.children.some((b) => !b.$.removed && b._visible && String((b as MovieClip).txt).includes(s.text)), 3000);
      await h.run(200);
      h.shot("chat");
      return {};
    case "freeGames": {
      const mp = G.INTERFACE.UIInterfaceMultiPlayer!;
      h.click("free games tab", mp.btnMulti as DisplayObject);
      await h.need("game list", () => h.received.some((f) => f.startsWith("GLK")));
      await h.need("tab in place", () => mp.Tabs && !mp.Tabs.bInMove && mp.Tabs.currLayer == 2);
      await h.run(300);
      h.shot("free-games");
      return {};
    }
    case "createGame": {
      const tab = joinTab();
      h.type("game name", tab.txtGameName, s.name);
      if (s.password) h.type("password", tab.txtGamePass2, s.password);
      await pickCombo("map", tab.comboMaps as Combo, (d) => String(d?.data) == String(s.map));
      h.shot("create-game");
      h.click("create game", tab.btnCreate as DisplayObject);
      await h.need("game created", () => DC().Game.m_name == s.name && DC().Game.isMultiplayer);
      await h.need("joined tab", () => G.INTERFACE.UIInterfaceMultiPlayer?.Tabs?.currLayer == 1 && !G.INTERFACE.UIInterfaceMultiPlayer.Tabs.bInMove);
      await h.run(500);
      h.shot("game-lobby");
      return {};
    }
    case "joinGame": {
      const tab = joinTab();
      const before = h.received.length;
      h.click("refresh games", tab.$.children.find((c) => c instanceof Button));
      await h.need("game list", () => h.received.slice(before).some((f) => f.startsWith("GLK")));
      await h.run(300);
      await pickCombo("game", tab.comboGames as Combo, (d) => String(d?.label).startsWith(s.name));
      if (s.password) h.type("password", tab.txtGamePass1, s.password);
      const at = h.received.length;
      h.click("join game", tab.btnJoin as DisplayObject);
      if (s.expect == "refused") {
        await h.need("join refused", () => h.received.slice(at).some((f) => f.startsWith("GJE")));
        await h.run(500);
        h.shot("join-refused");
        return { answer: h.received.slice(at).find((f) => f.startsWith("GJ")) };
      }
      await h.need("game joined", () => DC().Game.m_name == s.name && DC().Game.isMultiplayer);
      await h.need("joined tab", () => G.INTERFACE.UIInterfaceMultiPlayer?.Tabs?.currLayer == 1 && !G.INTERFACE.UIInterfaceMultiPlayer.Tabs.bInMove);
      await h.run(500);
      h.shot("game-lobby");
      return { team: DC().Player.data?.team };
    }
    case "team": {
      const row = myRow();
      if (!row) throw new Error("no lobby row for me");
      const before = h.received.length;
      h.click(`team ${s.team}`, row[`radioTeam${s.team}`] as DisplayObject);
      await h.need("team answer", () => h.received.slice(before).some((f) => f.startsWith("Gt")));
      await h.run(300);
      h.shot(`team-${s.team}`);
      return { team: DC().Player.data?.team, answer: h.received.slice(before).find((f) => f.startsWith("Gt")) };
    }
    case "waitPlayers":
      await h.need(`${s.count} players in the game`, () => Number(DC().Game.m_playerCount) == s.count, 30000);
      await h.run(300);
      return {};
    case "start": {
      if (s.creator) {
        const tab = G.INTERFACE.UIInterfaceMultiPlayer!.Tabs!.TabGameJoined as MovieClip;
        await h.need("Play button", () => (tab.btnPlay as MovieClip | undefined)?._visible);
        h.click("play", tab.btnPlay as DisplayObject);
      }
      await h.need("placement mode", () => G.BATTLEFIELD?.Interaction?.type == 4 && DC().Game.isRunning, 30000);
      await h.run(800);
      h.shot("placement");
      return { allowed: (DC().Game as unknown as { allowedCells: number[][] }).allowedCells, map: DC().Map.id };
    }
    case "place": {
      const cells = (DC().Game as unknown as { allowedCells: number[][] }).allowedCells[Number(me().team)] ?? [];
      const free = cells.filter((c) => DC().Map.data[c]?.playerOnID == undefined);
      const cell = free[s.index % free.length]!;
      h.clickCell("placement", cell);
      await h.need("my placement in GIC", () => me().cell == cell, 10000);
      await h.run(300);
      h.shot("placed");
      return { cell };
    }
    case "fight":
      return fight(s.policy);
    case "leaveResult": {
      const result = resultPanel();
      if (!result) throw new Error("no result panel");
      const before = h.sent.length;
      h.click("leave result", result.$childAt(11 - 16384));
      await h.need("multiplayer screen", () => !gone(G.INTERFACE.UIInterfaceMultiPlayer) && h.received.slice(0).some((f) => f.startsWith("CJK")) && h.sent.slice(before).some((f) => f.startsWith("CJ")), 15000);
      await h.need("channel joined", () => DC().Channel.m_name && h.received.at(-1) != undefined, 5000);
      await h.run(1000);
      h.shot("back-to-lobby");
      return { sent: h.sent.slice(before), channel: DC().Channel.m_name };
    }
    case "logout": {
      h.click("menu", menuButton());
      await h.need("menu box", () => G.INTERFACE.BoxLayer_mc?.$.children.some((c) => !c.$.removed), 3000);
      await h.run(300);
      h.shot("menu-box");
      h.click("disconnect", findClip(G.INTERFACE.BoxLayer_mc, "disconnect_btn"));
      await h.run(300);
      h.click("yes", findClip(G.INTERFACE.BoxLayer_mc, "yes_btn"));
      await h.need("login screen", () => G.INTERFACE.CommonLayer_mc?.loginInterface && !gone(G.INTERFACE.CommonLayer_mc.loginInterface as DisplayObject), 10000);
      await h.run(500);
      h.shot("logged-out");
      const text = String((findClip(messageBox(), "", (o) => o instanceof TextField && o.text.length > 3) as TextField | undefined)?.text);
      await closeMessages();
      return { message: text };
    }
    case "channel": {
      const mp = G.INTERFACE.UIInterfaceMultiPlayer!;
      const before = h.received.length;
      await pickCombo("channel", mp.comboChannels as unknown as Combo, (d) => d?.label == s.name);
      await h.need(`joined ${s.name}`, () => h.received.slice(before).some((f) => f == "CJK" + s.name) && DC().Channel.m_name == s.name);
      await h.run(500);
      h.shot(`channel-${s.name}`);
      return { channel: DC().Channel.m_name };
    }
    case "village": {
      const r0 = h.received.length;
      h.click("return to the village", G.INTERFACE.UIInterfaceMultiPlayer!.btnReturn as DisplayObject);
      await toSharedMap(r0);
      h.shot("village-from-lobby");
      return { cell: Number(me().cell) };
    }
    case "addFriend": {
      const mp = G.INTERFACE.UIInterfaceMultiPlayer!;
      h.click("friends tab", mp.btnFriends as DisplayObject);
      await h.need("friends tab in place", tabIn(4));
      const tab = tabs()!.$.children.find((c) => c._name.toLowerCase() == "tabfriends") as MovieClip, r0 = h.received.length; // `tabFriends` (swf sprite 372)
      h.type("character name", tab.name_txt as DisplayObject, s.name);
      h.click("add", tab.btnAddCharacter as DisplayObject);
      await h.need("friend added (FAK)", () => h.received.slice(r0).some((f) => f.startsWith("FAK")), 5000);
      await h.run(500);
      h.shot("friend-added");
      return {};
    }
    case "playAlone":
    case "makeTeam": {
      const r0 = h.received.length, s0 = h.sent.length;
      // every friends list asked (both tabs' onFocus send Fl) is answered: a late FlK resets the list's selection
      const listsIn = () => h.received.slice(r0).filter((f) => f.startsWith("FlK")).length >= h.sent.slice(s0).filter((f) => f.startsWith("Fl")).length;
      h.click("play", G.INTERFACE.UIInterfaceMultiPlayer!.btnPlayDofus as DisplayObject);
      await h.need("random tab in place", tabIn(5));
      await h.run(300);
      const start = tabs()!.TabPlayDofusStart as MovieClip;
      h.click(s.do, start[s.do == "playAlone" ? "playAlone_btn" : "makeTeam_btn"] as DisplayObject);
      await h.need("random game (GCK|3)", () => h.received.slice(r0).includes("GCK|3") && DC().Game.isRandom, 5000);
      // searching alone: someone may already be waiting, then GPS comes right after Gs and the lobby is gone
      if (s.do == "playAlone") await h.need("search mask (or matched)", () => (searching() && tabIn(3)()) || DC().Game.isRunning, 15000);
      else await h.need("friends to invite", () => tabIn(3)() && teamTab()?.teamMateChoose?._visible && listsIn(), 15000);
      if (!DC().Game.isRunning) await h.need("my card", () => card(DC().Player.data!.name as string, false), 5000);
      await h.run(500);
      h.shot(s.do);
      return { matched: DC().Game.isRunning };
    }
    case "invite": {
      const choose = teamTab()!.teamMateChoose as MovieClip, s0 = h.sent.length;
      await pickList("friend", choose.lstFriends as Combo, (d) => d?.label == s.name);
      h.click("invite", choose.btnCancel as DisplayObject); // the "Inviter" button is named btnCancel (ui.md §2.8)
      await h.need("Gi sent", () => h.sent.slice(s0).some((f) => f.startsWith("Gi")), 3000);
      await h.need("card", () => card(s.name), 5000);
      await h.run(500);
      h.shot(`invite-${s.name}`);
      return { sent: h.sent.slice(s0).find((f) => f.startsWith("Gi"))?.trim() };
    }
    case "invitation": {
      const box = () => findClip(G.INTERFACE.BoxLayer_mc, "boxYesNo");
      if (s.answer == "closed") {
        await h.need("invitation box closed", () => !box(), 15000);
        await h.run(300);
        h.shot("invitation-closed");
        return {};
      }
      await h.need("invitation box", box, 15000);
      await h.run(500);
      h.shot("invitation");
      if (s.answer == "seen") return {};
      const s0 = h.sent.length;
      h.click(s.answer, findClip(box(), s.answer == "yes" ? "yes_btn" : "no_btn"));
      await h.need("answer sent", () => h.sent.slice(s0).some((f) => f.startsWith(s.answer == "yes" ? "GJ3" : "GY")), 3000);
      if (s.answer == "yes") {
        await h.need("joined the team (GJK|3)", () => DC().Game.isRandom && tabIn(3)(), 10000);
        await h.need("my card", () => card(DC().Player.data!.name as string, false), 5000);
      }
      await h.run(500);
      h.shot(`invitation-${s.answer}`);
      return { sent: h.sent.slice(s0).map((f) => f.trim()) };
    }
    case "waitCard":
      await h.need(`card of ${s.name}`, () => card(s.name, false), 15000);
      await h.run(500);
      h.shot(`card-${s.name}`);
      return {};
    case "cancelCard": {
      const c = card(s.name), s0 = h.sent.length;
      if (!c) throw new Error(`no card for ${s.name}`);
      h.click(`cancel ${s.name}`, c.btnCancel);
      await h.need("GU sent", () => h.sent.slice(s0).some((f) => f.startsWith("GU")), 3000);
      await h.need("card removed", () => !card(s.name), 5000);
      await h.run(500);
      h.shot(`cancel-${s.name}`);
      return { sent: h.sent.slice(s0).map((f) => f.trim()) };
    }
    case "search": {
      const mine = card(DC().Player.data!.name as string, false);
      h.click("search", mine?.btnPlay);
      await h.need("search mask", searching, 5000);
      await h.run(300);
      h.shot("search");
      return {};
    }
    case "gift": {
      const result = resultPanel(), r0 = h.received.length;
      if (result?._name != "GameResultRandom") throw new Error("no random result panel");
      h.click("gift", result.$childAt(17 - 16384)); // S956/PB_17: AKS.Game.leave(); AKS.Game.CreateSolo()
      await toSharedMap(r0);
      h.shot("village-from-gift");
      return { cell: Number(me().cell) };
    }
    case "joinMap": {
      const list = G.INTERFACE.UIInterfaceCharacters!, r0 = h.received.length;
      h.click("select character", cardOf(s.name));
      await h.run(300);
      h.click("join the map", list.btnJoinMap as DisplayObject | undefined);
      await h.need("village map with me on it", () => h.received.slice(r0).some((f) => f.startsWith("GM|")) && G.BATTLEFIELD.Container._visible && me()?.cell != undefined && drawn(me()), 20000);
      if (h.received.slice(r0).some((f) => f.startsWith("GAx;3;"))) throw new Error("sent to the multiplayer screen");
      await h.run(800);
      h.shot("village-map");
      const gm = h.received.slice(r0).find((f) => f.startsWith("GM|"))!;
      return { id: DC().Player.ID, cell: Number(me().cell), gm, sent: h.sent.filter((f) => /^(PS|GW)/.test(f)).slice(-2).map((f) => f.trim()) };
    }
    case "walk":
    case "travel": {
      const from = Number(me().cell);
      await h.run(600); // CLICK_MINIMUM_TIMER between two cell clicks
      const middle = DC().Map.data.length / 2; // toward the middle of the map: in view for the screenshots
      const candidates = s.cell != undefined ? [s.cell] : reachable(8, 500).filter((r) => r.cost >= 4).map((r) => r.cell).sort((x, y) => Math.abs(x - middle) - Math.abs(y - middle));
      // a cell whose diamond the mouse can reach (an object or a sprite in front may cover it)
      const target = candidates.find((c) => {
        try {
          return h.cell(c) && (h.hoverCell(c), h.cellUnderMouse() == c);
        } catch {
          return false;
        }
      });
      if (target == undefined) throw new Error(`no reachable cell to click from ${from}`);
      const s0 = h.sent.length, r0 = h.received.length;
      h.p.mouseDown();
      h.p.mouseUp();
      await h.need("GA001 sent", () => h.sent.slice(s0).some((f) => f.startsWith("GA001")), 2000);
      const mine = new RegExp(`^GA\\d+;1;${myID()};`);
      await h.need("the server's move", () => h.received.slice(r0).some((f) => mine.test(f)), 5000);
      const ga = h.received.slice(r0).find((f) => mine.test(f))!, ack = "GKK" + ga.slice(2, ga.indexOf(";")) + "\n";
      if (s.do == "travel") {
        // the GM after the new map's GDM lists its occupants; my sprite must stand on my cell of it
        const gm = () => h.received.slice(h.received.findIndex((f, i) => i >= r0 && f.startsWith(`GDM|${s.map}|`)) + 1).find((f) => f.startsWith("GM|+"));
        const ids = () => gm()!.split("|+").slice(1).map((e) => e.split(";"));
        const placed = () => {
          const mine = ids().find((e) => e[0] == myID()), at = DC().Map.data[Number(me().cell)], sp = spriteOf(me());
          return !!mine && Number(mine[10]) == Number(me().cell) && drawn(me()) && !!at && !!sp && Math.abs(sp._x - Number(at.x)) < 1;
        };
        await h.need(`${ack.trim()} then map ${s.map} with me on it`, () => h.sent.slice(s0).includes(ack) && h.received.slice(r0).some((f) => f.startsWith(`GDM|${s.map}|`)) && !!gm() && Number(DC().Map.id) == s.map && G.BATTLEFIELD.Container._visible && placed(), 20000);
        await h.run(800);
        const ok = new Set(ids().map((e) => e[0]!));
        // (removed characters stay in DATACENTER.Characters, an AS quirk: core/datacenter/dataProvider.ts)
        const sprites = (G.BATTLEFIELD.Container.Object2.clips as MovieClip).$.children.filter((c) => c._name.startsWith("sprite") && !c.$.removed).map((c) => c._name.slice(6));
        if (sprites.some((id) => !ok.has(id))) throw new Error(`sprites left from the old map: ${sprites}; new map ${[...ok]}`);
        h.shot(`travel-${s.map}`);
        return { from, plate: target, map: s.map, cell: Number(me().cell), gm: gm(), sprites };
      }
      await h.need(`${ack.trim()} and the walk over`, () => h.sent.slice(s0).includes(ack) && !me().SEQUENCER_actions.isPlaying() && Number(me().cell) == target, 20000);
      await h.run(300);
      h.shot(`walk-${target}`);
      return { from, cell: target, ga };
    }
    case "sprite": {
      const ok = () => {
        const c = characterNamed(s.name), sp = spriteOf(c);
        if (s.gone) return !sp;
        const at = DC().Map.data[Number(c?.cell)];
        return drawn(c) && (s.cell == undefined || Number(c?.cell) == s.cell) && !c?.SEQUENCER_anim.isPlaying() && !!at && Math.abs(sp!._x - Number(at.x)) < 1;
      };
      await h.need(s.gone ? `${s.name} gone` : `sprite of ${s.name}${s.cell != undefined ? ` on cell ${s.cell}` : ""}`, ok, 20000);
      await h.run(300);
      h.shot(s.gone ? `${s.name}-gone` : `sees-${s.name}`);
      const c = characterNamed(s.name), sp = spriteOf(c);
      return { cell: sp ? Number(c?.cell) : undefined, tree: h.dump(sp, 2) };
    }
    case "inventory": {
      h.click("inventory", findClip(G.INTERFACE.UIInterfaceBanner?.banner, "", (o) => o instanceof Button && o.$.id == 752)); // showPanel("Inventory")
      await h.need("inventory panel", () => G.INTERFACE.UIInterfaceBanner?.getCurrentPanel() == "Inventory" && viewer()?.inventoryScroller_mc, 3000);
      await h.run(800); // item icons load
      h.shot("inventory");
      return { items: bag() };
    }
    case "equip": {
      const v = viewer(), item = itemOf(s.id), s0 = h.sent.length;
      if (!v || !item) throw new Error(`equip: no inventory panel, or no item ${s.id}`);
      const from = Number(item.m_Position);
      if (s.slot >= 0) await drag(`item ${s.id} → slot ${s.slot}`, await centreItem(v, s.id), v[`equipement${s.slot}_mc`] as MovieClip | undefined);
      // off the slot onto the panel (the info box: no slot, no drop zone → onTestMouse); outside the panel would close it
      else await drag(`slot ${from} → bag`, v[`equipement${from}_mc`] as MovieClip | undefined, v.objectInfosViewer_mc, false);
      const om = `OM${s.id}|${s.slot}\n`;
      await h.need(om.trim() + " sent", () => h.sent.slice(s0).includes(om), 3000);
      const slot = v[`equipement${s.slot >= 0 ? s.slot : from}_mc`] as MovieClip & { data?: unknown; isEmpty?: boolean };
      if (G.INTERFACE.UIInterfaceBanner?.getCurrentPanel() != "Inventory") throw new Error("equip: the inventory panel closed");
      if (Number(item.m_Position) != s.slot || (s.slot >= 0 ? slot.data !== item : !slot.isEmpty)) throw new Error(`equip: item at ${String(item.m_Position)}, slot ${s.slot >= 0 ? s.slot : from} shows ${String(slot.data)}`);
      await h.run(500);
      h.shot(s.slot >= 0 ? `equipped-${s.slot}` : "unequipped");
      return { sent: om.trim(), items: bag() };
    }
    case "drop": {
      const v = viewer(), s0 = h.sent.length, r0 = h.received.length;
      if (!v) throw new Error("drop: no inventory panel");
      await drag(`item ${s.id} → drop zone`, await centreItem(v, s.id), v.drop_mc);
      await h.need("question box", () => findClip(G.INTERFACE.BoxLayer_mc, "yes_btn"), 3000);
      await h.run(300);
      h.shot("drop-question");
      const question = String((findClip(G.INTERFACE.BoxLayer_mc, "", (o) => o instanceof TextField && o.text.length > 12) as TextField | undefined)?.text);
      h.click("yes", findClip(G.INTERFACE.BoxLayer_mc, "yes_btn"));
      await h.need(`ODK${s.id}, item gone`, () => h.received.slice(r0).includes(`ODK${s.id}`) && !itemOf(s.id), 5000);
      await h.run(500);
      h.shot("dropped");
      return { question, sent: h.sent.slice(s0).map((f) => f.trim()), items: bag() };
    }
    case "changeCharacter": {
      h.click("menu", menuButton());
      await h.need("menu box", () => findClip(G.INTERFACE.BoxLayer_mc, "quit_btn"), 3000);
      await h.run(300);
      h.shot("menu-box");
      h.click("change character", findClip(G.INTERFACE.BoxLayer_mc, "quit_btn"));
      await h.run(300);
      h.click("yes", findClip(G.INTERFACE.BoxLayer_mc, "yes_btn"));
      await h.need("character list again", () => G.INTERFACE.UIInterfaceCharacters?.choice0 && !gone(G.INTERFACE.UIInterfaceCharacters), 20000);
      await h.run(500);
      h.shot("characters-again");
      return { login: h.received.filter((f) => f.startsWith("Al")).slice(-2) };
    }
    case "toLobby": {
      const r0 = h.received.length, s0 = h.sent.length;
      h.click("menu", menuButton());
      await h.need("menu box with the map entry", () => findClip(G.INTERFACE.BoxLayer_mc, "lobby_btn"), 3000);
      await h.run(300);
      h.shot("menu-box-village");
      h.click("go to the fights", findClip(G.INTERFACE.BoxLayer_mc, "lobby_btn"));
      await h.need("GX sent, GAx;3 back", () => h.sent.slice(s0).includes("GX\n") && h.received.slice(r0).includes(`GAx;3;${myID()}`), 5000);
      await h.need("multiplayer screen", () => !gone(G.INTERFACE.UIInterfaceMultiPlayer) && h.received.slice(r0).some((f) => f.startsWith("CJK")) && DC().Channel.m_name, 15000);
      await h.need("channel users", () => h.received.slice(r0).some((f) => f.startsWith("CLK")), 5000);
      await h.run(800);
      h.shot("lobby-from-map");
      return { sent: h.sent.slice(s0).map((f) => f.trim()), channel: DC().Channel.m_name };
    }
    case "smiley": {
      // Character.smiley attaches SmileyOverHead to the controller as `smiley_mc` (Character.as:318-324)
      const shown = (c: Char | null | undefined) => {
        const sm = (c?.clip as { smiley_mc?: MovieClip } | null | undefined)?.smiley_mc;
        return !!sm && !sm.$.removed && sm._visible;
      };
      if (s.from != undefined) {
        const from = s.from;
        await h.need(`smiley over ${from}`, () => shown(characterNamed(from)), 10000);
        await h.run(300);
        h.shot(`smiley-of-${from}`);
        return { cS: h.received.filter((f) => f.startsWith("cS")).at(-1) };
      }
      const toggle = findClip(h.p.root, "", (o) => o instanceof Button && o.$.id == 779); // on(release): SmileyBar.openClose
      const bar = toggle?._parent as (MovieClip & { simleys_mc?: MovieClip }) | undefined;
      const icon = bar?.simleys_mc?.[`smiley${s.index ?? 1}`] as MovieClip | undefined;
      h.click("smiley bar", toggle);
      await h.need("smiley bar open", () => bar?.simleys_mc?._visible && icon && icon.getBounds(h.p.root).xMax > icon.getBounds(h.p.root).xMin, 5000);
      await h.run(300);
      const s0 = h.sent.length, r0 = h.received.length;
      h.click(`smiley ${s.index ?? 1}`, icon);
      await h.need("BS sent, cS back", () => h.sent.slice(s0).some((f) => f.startsWith("BS")) && h.received.slice(r0).some((f) => f.startsWith(`cS${myID()}|`)), 5000);
      await h.need("my smiley", () => shown(me()), 3000);
      await h.run(200);
      h.shot("smiley");
      h.click("smiley bar", toggle); // closed again
      return { sent: h.sent.slice(s0).find((f) => f.startsWith("BS"))?.trim() };
    }
    case "frames":
      return { sent: h.sent.slice(-(s.last ?? 20)), received: h.received.slice(-(s.last ?? 20)) };
    case "wait":
      await h.run(s.ms);
      return {};
    case "login":
    case "register": {
      await h.need("login screen", () => G.INTERFACE?.CommonLayer_mc?.loginInterface, 60000);
      await h.run(300);
      await closeMessages();
      const login = G.INTERFACE.CommonLayer_mc.loginInterface as Record<string, unknown>;
      h.type("account", login.txtName, s.account);
      h.type("password", login.txtPass, s.password);
      const register = s.do == "register";
      h.click(register ? "register" : "login OK", (register ? login.btn_register : login.btn_ok) as DisplayObject);
      if (s.expect == "refused") {
        await h.need(`${s.do} refused`, () => h.received.some((f) => f.startsWith("AlE")));
        await h.need("error box", () => messageBox(), 5000);
        await h.run(500);
        h.shot(`${s.do}-refused`);
        const text = String((findClip(messageBox(), "", (o) => o instanceof TextField && o.text.length > 3) as TextField | undefined)?.text);
        await closeMessages();
        return { authentified: G.AKS.m_bAuthentified ?? false, answer: h.received.filter((f) => f.startsWith("AlE")).at(-1), message: text };
      }
      await h.need("AlK", () => G.AKS.m_bAuthentified, 10000);
      await h.need("start menu", () => G.INTERFACE.CommonLayer_mc.MenuInterface?.play_btn);
      await h.run(300);
      h.shot("menu");
      return { player: DC().Player.login };
    }
  }
}

let errorsSeen = 0, timeoutsSeen = 0, unparsedSeen = 0;
/** What the client reported since the last step: runtime errors, in-game sequencer timeouts, frames its parser dropped. */
function problems() {
  const errors = h.errors.slice(errorsSeen), unparsed = h.unparsed.slice(unparsedSeen), timeouts = h.timeoutNotes.slice(timeoutsSeen);
  errorsSeen = h.errors.length, unparsedSeen = h.unparsed.length, timeoutsSeen = h.timeoutNotes.length;
  const bad = timeouts.filter((t) => t.inGame).map((t) => t.note);
  for (const t of timeouts) if (!t.inGame) h.notes.push(`sequencer timeout outside a game (tolerated): ${t.note}`);
  if (bad.length) errors.push(`${bad.length} sequencer TIMEOUT(s) in a game, awaited actions that never called end(): ${[...new Set(bad)].join(" ;; ")}`);
  for (const f of unparsed) errors.push(`frame dropped by the client's parser: ${f.slice(0, 160)}`);
  return errors;
}
const out = (o: Record<string, unknown>) => process.stdout.write(JSON.stringify(o) + "\n");
const reader = Bun.stdin.stream().pipeThrough(new TextDecoderStream()).getReader();
let buf = "";
out({ ok: true, ready: name });
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += value;
  for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const s = JSON.parse(line) as Step;
    try {
      const r = await step(s);
      const errors = problems();
      out({ ok: true, step: s.do, ...r, ...(errors.length ? { errors } : {}) });
    } catch (e) {
      h.shot(`FAIL-${s.do}`);
      const errors = problems();
      const cut = (fs: string[]) => fs.map((f) => (f.length > 160 ? f.slice(0, 160) + "…" : f));
      out({ ok: false, step: s.do, error: (e as Error).message, errors, notes: h.notes.slice(-10), lastReceived: cut(h.received.slice(-15)), lastSent: cut(h.sent.slice(-10)) });
    }
  }
}
h.close();
process.exit(0);
