// Replay fixtures: scripted server conversations built only from docs/protocol/ formats (server-checklist.md walk-
// through: connect → H → login → menu → characters → solo village → channel → free game → placement → GA move,
// spell, end turn → GE → GQ/GV). Map data is real map 507 (web/src/core/map507.fixture.ts, dofedex 2004 —
// post-beta substitute). Cells are picked among map 507's active cells with movement > 1 (walkable):
// 89,98,107,113,115,121–124,130–132,139,140,147–149,156–158,165,166,174.
//
// A stage waits for its `client` frames (exact bytes the client must send, `\n` included), then the server sends
// its `server` frames, each `delayMs` after the previous one (runtime clock).
import { compressPath, zkArray } from "../core/compressor.ts";
import { cryptPassword } from "../core/crypt.ts";
import { MAP_507 } from "../core/map507.fixture.ts";

export interface ServerFrame {
  delayMs: number;
  frame: string;
}
export interface ReplayStage {
  name: string;
  client: string[];
  server: ServerFrame[];
}
export type Fixture = ReplayStage[];

const KEY = "abcdefghijklmnopqrstuvwxyz012345"; // H<32 chars>, account.md / server-checklist.md §1
const LOGIN = "bo";
const PASSWORD = "pass";
const MAP = `${MAP_507.id}|${MAP_507.width}|${MAP_507.height}`;
/** GDM|id|W|H|rolePlay|bg|mapData (game.md GD/GDM): 1 in the village, 0 in a fight. */
const gdm = (rolePlay: 0 | 1) => `GDM|${MAP}|${rolePlay}|${MAP_507.backgroundNum}|${MAP_507.mapData}`;
/** GPS cell lists: 2 base-64 digits per cell, (c0 << 6) + c1 (encodings.md cell-lists-gps). */
const cells = (list: number[]) => list.map((c) => zkArray[c >> 6]! + zkArray[c & 63]!).join("");

// Cast (server-checklist.md): Bobby id 12, Iop (guild 8), gfx 80; Ali id 7, Osamodas (guild 2), gfx 20.
const BOBBY = "12;Bobby;1;8;0;80;-1;-1;-1";
const ALI = "7;Ali;1;2;0;20;-1;-1;-1";
/** Spell 141, level 1: zone P/1; guild spell, fire, range 7, AP 3, no line of sight, 2 per turn, slot 1 (spells.md). */
const SPELL_141 = "141~1~Pb~1F000hd00bbcbab";
/** ASK: exactly 31 "|"-parts (account.md PS/AS): id name level guild sex gfx c1 c2 c3 weapon XPlow XP XPhigh LP AP
 *  GP force vitality rFire rAir rWater rEarth charism karma agility intelligence bonusPoints cc spells items. */
const ASK = ["ASK", "12", "Bobby", "1", "8", "0", "80", "-1", "-1", "-1", "", "0", "0", "100", "50", "6", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "4", SPELL_141, ""].join("|");

const VILLAGE_CELL = 140;
const TEAM0 = [122, 113];
const TEAM1 = [157, 166];
const START = 122; // Bobby's placement
const ALI_CELL = 166;
const MOVE_TO = START + MAP_507.width; // one step in direction 0 (+width): 131
/** What the client sends: Player.tmpPath (direction-change cells, start excluded) through compressPath. */
const movePath = compressPath([{ num: MOVE_TO, dir: 0 }])!;
/** What the server echoes: start cell first (extractFullPath walks from the first cell, game-actions.md type 1). */
const serverPath = compressPath([{ num: START, dir: 0 }, { num: MOVE_TO, dir: 0 }])!;

const f = (frame: string, delayMs = 0): ServerFrame => ({ delayMs, frame });

export const fight: Fixture = [
  { name: "connect", client: [], server: [f("H" + KEY, 100)] },
  { name: "login", client: ["5\n", LOGIN + "\n" + cryptPassword(PASSWORD, KEY) + "\n"], server: [f("AlKfr")] },
  { name: "menu: play", client: ["PL\n"], server: [f("ALK|12;Bobby;1;0;0;80;-1;-1;-1")] },
  { name: "select character", client: ["PS12\n"], server: [f(ASK)] },
  { name: "solo game", client: ["GC1\n"], server: [f("GCK|1")] },
  {
    name: "village map",
    client: ["GD\n"],
    server: [f(gdm(1)), f(`GM|+${BOBBY};;${VILLAGE_CELL};1`), f("GAx;3;12", 1500)], // GAx;3 → multiplayer screen
  },
  // The channel combo's load script joins `getValue()` before the editable label is set (Ank.Dofus.ComboBox.as:243-253,
  // FSelectableListSymbol.as:117): "" → `CJ\n` ("rejoin", channel.md); the server answers with its default channel.
  { name: "join channel", client: ["CJ\n"], server: [f("CJKFrance")] },
  { name: "channel users", client: ["CL\n"], server: [f("CLK|Bobby;1;80|Ali;1;20")] },
  { name: "free-game lobby", client: ["BL\n", "GL2\n"], server: [f("mL507"), f("GLK")] },
  {
    name: "create game",
    client: ["GC2Duel|507|AA|\n"],
    server: [f("GCK|2|Duel|507|AA"), f(`GM|+${BOBBY};;50;0;0`), f(`GM|+${ALI};;50;1;1`, 500)],
  },
  { name: "start game", client: ["GS\n"], server: [f(`GPS${cells(TEAM0)}|${cells(TEAM1)}`)] },
  { name: "fight map", client: ["GD\n"], server: [f(gdm(0))] },
  { name: "ready", client: ["GR\n"], server: [f("GR", 300)] },
  {
    name: "placement",
    client: [`Gp${START}\n`],
    server: [f(`GIC|12;${START};1|7;${ALI_CELL};3`), f("GS", 300), f("GTL|12|7"), f("GTS12|30000")],
  },
  {
    name: "move",
    client: [`GA001${movePath}\n`],
    server: [f("GAS12"), f(`GA1;1;12;${serverPath}`), f("GAx;102;12;12,-1"), f("GAF12")],
  },
  { name: "move ack", client: ["GKK1\n"], server: [] },
  {
    name: "spell",
    client: [`GA300141;${ALI_CELL}\n`],
    server: [f("GAS12"), f(`GA2;300;12;141,${ALI_CELL},101,1,10,0`), f("GAx;102;12;12,-3"), f("GAx;100;12;7,-10"), f("GAF12")],
  },
  { name: "spell ack", client: ["GKK2\n"], server: [] },
  {
    name: "end turn",
    client: ["GT\n"],
    // Ali leaves during his own turn (server.md: the current fighter leaving sends GTF, GM|-id, then the next GTS).
    server: [f("GTF12"), f("GTS7|30000"), f("GTF7", 500), f("GM|-7"), f("GTS12|30000"), f("GE12|2;12;1;0;0;10;100;10;5|0;7;1;1;0;0;100;0;0", 1000)],
  },
  { name: "leave", client: ["GQ\n"], server: [f("GV")] },
  // Two `CJ`: GV → Channels.join() (Events.AKS.Game.as:245) and the channel combo of the multiplayer screen that the
  // result panel's leave button redraws (S962 PB_11: leave + KERNEL.changeToMultiplayer).
  { name: "rejoin channel", client: ["CJ\n", "CJ\n"], server: [] },
];

export const fixtures: Record<string, Fixture> = { fight };

/** Constants the headless test needs to drive the UI-side triggers. */
export const cast = { LOGIN, PASSWORD, KEY, START, MOVE_TO, ALI_CELL, TEAM0, TEAM1, VILLAGE_CELL, movePath, serverPath };
