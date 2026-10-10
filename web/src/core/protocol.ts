// Client side of the wire protocol: Dofus.Client.DataProcessor.as (incoming dispatch) with the string parsing of
// the Dofus.Client.*.as `innerOn*` handlers, and the outgoing messages of Dofus.Client.as / Dofus.Client.*.as.
// `parseServerMessage` returns what the handler would receive, without the DATACENTER/UI side effects
// (those, and Events.AKS.* — e.g. the GA action-type switch — are the state layer's job). Fields stay raw
// strings wherever the AS keeps them raw.
//
// Dispatch (DataProcessor.as:6-493): c0 = charCodeAt(0), c1 = charCodeAt(1), success = charCodeAt(2) == "K".
// Verified against the P-code (the decompiled switch misplaces the "F" block): every branch jumps to the end,
// except "c" whose every branch jumps into the "F" switch (missing `break`) — so "cA…", "cD…", "cL…", "cl…",
// "cI…", "cO…" are handled as the friend messages "FA…" etc. Unknown codes are ignored (→ null).
import { MAX_DATA_LENGTH, VERSION, CLIPS_PERSOS_PATH } from "./constants.ts";
import { cryptPassword } from "./crypt.ts";
import { getItemObjectFromData, type Item } from "./datacenter/item.ts";
import { getSpellObjectFromData, Spell } from "./datacenter/spell.ts";
import { str } from "./swf6.ts";

// ───────────────────────────── incoming ─────────────────────────────

export interface CharacterListEntry {
  id: number;
  name: string | undefined;
  level: string | undefined;
  model: string | undefined;
  sex: string | undefined;
  gfxID: string | undefined;
  /** Number("0x"+hex), or the raw "-1" string when it is "-1". */
  color1: number | string | undefined;
  color2: number | string | undefined;
  color3: number | string | undefined;
  file: string;
}

/** The `c` object of DataProcessor.as:164-192 (ASK), handed to CharactersManager.createCharacter. */
export interface SelectedCharacter {
  level: string; guild: string; sex: string; gfxID: string; color1: string; color2: string; color3: string;
  weapon: string; XPlow: string; XP: string; XPhigh: string; LP: string; AP: string; GP: string; force: string;
  vitality: string; rFire: string; rAir: string; rWater: string; rEarth: string; charism: string; karma: string;
  agility: string; intelligence: string; bonusPoints: string; cc: string; spells: string; items: string;
}

export interface PodiumPlayer {
  account?: string; name?: string; guild?: string; sex?: string; gfxID?: string;
  color1?: string; color2?: string; color3?: string; xp?: string; level?: string; file: string;
}

export interface GameResult {
  winner: boolean;
  id: string | undefined;
  level: number;
  bDead: boolean;
  lowXp: number;
  xp: number;
  /** lowxp + xp — `lowxp` is `lowXp` (SWF 6 case-insensitive). */
  fullxp: number;
  highXp: number;
  winxp: number;
  gold: number;
}

/** Client.Game.as:211-243. Field meaning of [10..12] depends on DATACENTER.Game.isMultiplayer. */
export type GameMovementEntry =
  | { add: true; num: 0 }
  | {
      add: true; id: string; name: string | undefined; level?: string; guild?: string; sex?: string; gfxID?: string;
      color1?: string; color2?: string; color3?: string; weapon?: string;
      cell?: string; dir?: string; LP?: string; team?: string; joinPosition?: string;
    }
  /** AS BUG kept: the id is always taken from the FIRST entry (`dataArray[1]`), not the current one. */
  | { add: false; id: string };

export interface Friend {
  account: string | undefined;
  state?: "IN_CHANNEL" | "IN_SOLO" | "IN_MULTI" | "IN_RANDOM" | "IN_UNKNOW" | "DISCONNECT";
  name?: string; level?: string; guild?: string; sex?: string; gfxID?: string;
}

export type ItemAddEntry = { kind: "gold"; amount: string } | { kind: "items"; items: Item[] } | { kind: "other" };

export type ServerEvent =
  | { type: "helloKey"; key: string }
  | { type: "serverMessage"; display: string; messageId: string }
  | { type: "mapsList"; maps: string[] }
  | { type: "playerCount"; count: string }
  | { type: "podium"; players: PodiumPlayer[] }
  | { type: "generalInfos"; playerCount?: string; gameCountSolo?: string; gameCountFree?: string; gameCountRandom?: string; waitingCount?: string }
  | { type: "spellInfos"; spell: Spell }
  | { type: "spellsMovement"; entries: { add: boolean; spell: Spell | null }[] }
  | { type: "spellUpgrade"; spell: Spell }
  | { type: "loginOk"; language: string }
  | { type: "loginError"; reason: "alreadyLogged" | "badVersion" | "accessDenied" }
  | { type: "whoIs" | "whoAmI"; playerName: string | undefined; characterName: string | undefined; state: string | null | undefined; param: string | null | undefined }
  | { type: "charactersList"; characters: CharacterListEntry[] }
  | { type: "characterSelected"; id: string; name: string; data: SelectedCharacter }
  | { type: "characterSelectError"; message: string }
  | { type: "newLevel"; level?: string; XPlow?: string; XP?: string; XPhigh?: string; bonusPoints?: string }
  | { type: "boost"; characterId: string | undefined; stats: { id: string | undefined; value: string | undefined }[] }
  | { type: "characterAdded"; success: boolean }
  | { type: "channelJoin"; name: string; success: boolean }
  | { type: "channelMovement"; entries: { add: boolean; name: string; level?: string; gfxID?: string }[] }
  | { type: "channelList"; users: { name: string; level?: string; gfxID?: string }[] }
  | { type: "gameCreate" | "gameJoin"; success: true; name: string | undefined; state: number; params: string[] }
  | { type: "gameCreate" | "gameJoin"; success: false; error: string }
  | { type: "gameEnd"; senderId: string | undefined; results: GameResult[] }
  | { type: "gamesList"; games: { name: string | undefined; maxPlayersCount: number; playersCount: number }[] }
  | { type: "mapInformations"; state: number; maxPlayerCount: number; gameName?: string; gameMap?: string; gameOptions?: string }
  | { type: "playersInformations"; players: { id?: string; name?: string; guild?: string; color1?: string; color2?: string; color3?: string; LP?: string; AP?: string; GP?: string; team?: string }[] }
  | { type: "playersCoordinates"; data: string[][] }
  | { type: "gameMovement"; entries: GameMovementEntry[] }
  | { type: "gameLeave" }
  | { type: "mapData"; id: string | undefined; width: string | undefined; height: string | undefined; bRolePlay: boolean; backgroundNum: string | undefined; mapData: string | undefined }
  | { type: "cellData"; cellNum: number; data: string; mask: string }
  | { type: "actionsStart"; characterId: string }
  | { type: "actionsFinish"; characterId: string }
  /** `action` is innerOnActions' array; Events.AKS.Game.onActions reads only [0] id, Number([1]) type, [2] character id, [3] params. */
  | { type: "gameAction"; action: string[]; id: string | undefined; actionType: number; characterId: string | undefined; params: string | undefined }
  | { type: "positionStart"; cells: string[] }
  | { type: "everybodyIsReady" }
  | { type: "startToPlay" }
  | { type: "startSearch" }
  | { type: "turnStart"; characterId: string | undefined; duration: number }
  | { type: "turnFinish"; characterId: string }
  | { type: "turnList"; turnSequence: string[] }
  | { type: "changeTeam"; success: true; playerId: string; team: string }
  | { type: "changeTeam"; success: false }
  | { type: "invitationRejected"; why: string; whoId: string | undefined; whoName: string | undefined }
  | { type: "invitation"; characterId: string | undefined; characterName: string | undefined }
  | { type: "cancelInvitationResponse" }
  /** `channel` = charCode of the 4th char: 70 "F" whisper from, 84 "T" whisper to, 35 "#" team, else public. */
  | { type: "chatMessage"; msg: string | undefined; fromName: string | undefined; fromID: string | undefined; channel: number }
  /** Lang key SYNTAX_ERROR (code "S") or USER_NOT_CONNECTED with `name` (DataProcessor.as:391-399). */
  | { type: "chatError"; error: "syntax" | "userNotConnected"; name: string }
  | { type: "smiley"; characterId: string | undefined; smileyId: string | undefined }
  /** Client.Account.innerOnAddFirend: on success `friend` is also pushed to Player.Friends (if account non-empty). */
  | { type: "friendAdd"; success: boolean; name: string | undefined; friend: Friend | null }
  | { type: "friendRemove"; success: true }
  | { type: "friendRemove"; success: false; error: string }
  /** Replaces Player.Friends; entries with an empty account are dropped (innerOnAddFirend). */
  | { type: "friendsList"; friends: Friend[] }
  | { type: "friendsListForRandomGame"; friends: { name: string; id: string; level?: string }[] }
  /** Events.AKS.Account splits `data` on ";": [account, name] for the ENTER/LEAVE_DOFUS texts. */
  | { type: "friendIn" | "friendOut"; data: string }
  /** R*: `AKS.RandomGame` is never constructed in AKSClient, so in the original these calls are no-ops. */
  | { type: "randomGameCreate"; success: boolean; data: string }
  | { type: "randomGameInvite"; data: string }
  | { type: "randomGameRefuseInvitation"; success: boolean; data: string }
  | { type: "randomGameAcceptInvitation"; data: string }
  | { type: "randomGameJoin"; data: string }
  | { type: "itemWeapon"; characterId: string | undefined; weaponType: number; gfx: number; col: string | undefined }
  | { type: "itemDrop"; error: boolean; data: string }
  | { type: "itemAddError"; reason: "inventoryFull" | "tooLowLevel" }
  | { type: "itemAdd"; entries: ItemAddEntry[] };

/** The client state the dispatch consults: Client.m_login (AW) and DATACENTER.Game.isMultiplayer (GM). */
export interface ParseContext {
  login?: string;
  isMultiplayer?: boolean;
}

const K = 75; // "K"

export function parseServerMessage(data: string, ctx: ParseContext = {}): ServerEvent | null {
  const c1 = data.charCodeAt(1);
  const ok = data.charCodeAt(2) == K;
  const sub2 = data.substr(2);
  const sub3 = data.substr(3);
  switch (data.charAt(0)) {
    case "H": // DataProcessor.as:29-33 — m_UID = key; m_bConnected = true; onConnect(true)
      return { type: "helloKey", key: data.substr(1) };
    case "M": // :34-37 — also m_serverMessageID = substr(2)
      return { type: "serverMessage", display: data.substring(1, 2), messageId: sub2 };
    case "m": // :38-40 → Client.Game.innerOnMapsList
      return { type: "mapsList", maps: sub2.split("|") };
    case "I":
      switch (c1) {
        case 67: return { type: "playerCount", count: sub2 }; // IC
        case 80: return { type: "podium", players: podium(sub2) }; // IP
        case 71: { // IG → Client.Infos.innerOnGeneral
          const p = sub2.split("|");
          return { type: "generalInfos", playerCount: p[0], gameCountSolo: p[1], gameCountFree: p[2], gameCountRandom: p[3], waitingCount: p[4] };
        }
      }
      return null;
    case "S":
      switch (c1) {
        case 73: { // SI → Client.Spells.innerOnInfos: a bare Spell with 4 raw fields
          const p = sub2.split("|");
          const s = new Spell();
          s.m_ID = p[0] ?? null;
          s.m_Level = p[1];
          s.m_APCost = p[2];
          s.m_Range = p[3];
          return { type: "spellInfos", spell: s };
        }
        case 77: { // SM → Client.Spells.innerOnMovement (whole message, entries from index 1, stop at "")
          const entries: { add: boolean; spell: Spell | null }[] = [];
          for (const e of data.split("|").slice(1)) {
            if (e.length == 0) break;
            entries.push(e.charAt(0) == "+" ? { add: true, spell: getSpellObjectFromData(e.substring(1)) } : { add: false, spell: null });
          }
          return { type: "spellsMovement", entries };
        }
        case 85: // SU — only on success
          return ok ? { type: "spellUpgrade", spell: getSpellObjectFromData(sub3) } : null;
      }
      return null;
    case "A":
      return account(data, c1, ok, ctx);
    case "C":
      switch (c1) {
        case 74: // CJ — DATACENTER.Channel.m_name = name
          return { type: "channelJoin", name: data.substring(3), success: ok };
        case 77: // CM → Client.Channels.innerOnMovement
          return {
            type: "channelMovement",
            entries: data.split("|").slice(1).map((e) => {
              const p = e.split(";");
              return { add: p[0]!.charAt(0) == "+", name: p[0]!.substr(1), level: p[1], gfxID: p[2] };
            }),
          };
        case 76: // CL → Client.Channels.innerOnList (skips index 0)
          return {
            type: "channelList",
            users: sub2.split("|").slice(1).map((e) => {
              const p = e.split(";");
              return { name: p[0]!, level: p[1], gfxID: p[2] };
            }),
          };
      }
      return null;
    case "G":
      return game(data, c1, ok, ctx);
    case "c":
      if (c1 == 77) { // cM
        if (ok) {
          const p = data.split("|");
          return { type: "chatMessage", msg: p[3], fromName: p[2], fromID: p[1], channel: data.charCodeAt(3) };
        }
        return data.charCodeAt(3) == 83 ? { type: "chatError", error: "syntax", name: "" } : { type: "chatError", error: "userNotConnected", name: data.substring(4) };
      }
      if (c1 == 83) { // cS → Client.Chat.innerOnSmiley
        const p = sub2.split("|");
        return { type: "smiley", characterId: p[0], smileyId: p[1] };
      }
      return friends(data, c1, ok); // fall-through into the "F" switch (see header)
    case "F":
      return friends(data, c1, ok);
    case "R": // AKS.RandomGame is undefined in the original: these were no-ops
      switch (c1) {
        case 67: return { type: "randomGameCreate", success: ok, data: sub3 };
        case 73: return { type: "randomGameInvite", data: sub2 };
        // inconsistent offsets kept: substring(3) on error, substring(2) on success
        case 82: return { type: "randomGameRefuseInvitation", success: ok, data: ok ? data.substring(2) : data.substring(3) };
        case 65: return { type: "randomGameAcceptInvitation", data: data.substring(2) };
        case 74: return { type: "randomGameJoin", data: sub3 };
      }
      return null;
    case "O":
      switch (c1) {
        case 87: { // OW → Client.Items.innerOnWeapon
          const p = sub2.split("|");
          return { type: "itemWeapon", characterId: p[0], weaponType: parseInt(str(p[1]), 16), gfx: parseInt(str(p[2]), 16), col: p[3] };
        }
        case 68: return { type: "itemDrop", error: !ok, data: sub3 }; // OD
        case 65: return itemAdd(!ok, sub3); // OA
      }
      return null; // includes "OF", an explicit no-op
  }
  return null;
}

function podium(data: string): PodiumPlayer[] {
  // Client.Infos.as:27-55 (every entry, index 0 included)
  return data.split("|").map((e) => {
    const p = e.split(";");
    return { account: p[0], name: p[1], guild: p[2], sex: p[3], gfxID: p[4], color1: p[5], color2: p[6], color3: p[7], xp: p[8], level: p[9], file: CLIPS_PERSOS_PATH + str(p[4]) + ".swf" };
  });
}

/** `tmpObj[k] != -1 ? Number("0x" + tmpObj[k]) : tmpObj[k]` (DataProcessor.as:144-146). */
const color = (c: string | undefined): number | string | undefined => ((c as unknown) != -1 ? Number("0x" + str(c)) : c);

function account(data: string, c1: number, ok: boolean, ctx: ParseContext): ServerEvent | null {
  switch (c1) {
    case 108: // Al — DataProcessor.as:73-96
      if (ok) return { type: "loginOk", language: data.substr(3) };
      switch (data.charCodeAt(3)) {
        case 97: return { type: "loginError", reason: "alreadyLogged" }; // "a" → ALREADY_LOGGED
        case 118: return { type: "loginError", reason: "badVersion" }; // "v" → BAD_VERSION [VERSION] + onBadVersion
        default: return { type: "loginError", reason: "accessDenied" }; // ACCESS_DENIED
      }
    case 87: { // AW — :97-125
      const p = data.split("|");
      if (p.length == 2) return { type: "whoIs", playerName: p[1], characterName: "!", state: null, param: undefined };
      if (p.length != 6) return null; // trace("Infos Whois Erronées")
      return { type: p[1] == ctx.login ? "whoAmI" : "whoIs", playerName: p[1], characterName: p[2], state: p[3], param: p[4] };
    }
    case 76: { // AL — :126-152, nothing on error
      if (!ok) return null;
      const characters = data.split("|").slice(1).map((e): CharacterListEntry => {
        const p = e.split(";");
        return {
          id: Number(p[0]), name: p[1], level: p[2], model: p[3], sex: p[4], gfxID: p[5],
          color1: color(p[6]), color2: color(p[7]), color3: color(p[8]),
          file: CLIPS_PERSOS_PATH + str(p[5]) + ".swf",
        };
      });
      return { type: "charactersList", characters };
    }
    case 83: { // AS — :153-203
      if (!ok) return { type: "characterSelectError", message: "Erreur lors de la sélection du personnage" };
      const p = data.split("|");
      if (p.length != 31) return { type: "characterSelectError", message: "Retour bizarre lors de la sélection du personnage" };
      const [, id, name, level, guild, sex, gfxID, color1, color2, color3, weapon, XPlow, XP, XPhigh, LP, AP, GP, force, vitality,
        rFire, rAir, rWater, rEarth, charism, karma, agility, intelligence, bonusPoints, cc, spells, items] = p as [string, ...string[]];
      return {
        type: "characterSelected", id: id!, name: name!,
        data: { level, guild, sex, gfxID, color1, color2, color3, weapon, XPlow, XP, XPhigh, LP, AP, GP, force, vitality, rFire, rAir,
          rWater, rEarth, charism, karma, agility, intelligence, bonusPoints, cc, spells, items } as SelectedCharacter,
      };
    }
    case 78: { // AN → Client.Account.innerOnNewLevel(substr(2))
      const p = data.substr(2).split("|");
      return { type: "newLevel", level: p[0], XPlow: p[1], XP: p[2], XPhigh: p[3], bonusPoints: p[4] };
    }
    case 66: { // AB → Client.Account.innerOnBoost(substr(3)): "charId|statId;value|…"
      const p = data.substr(3).split("|");
      return { type: "boost", characterId: p[0], stats: p.slice(1).map((e) => { const s = e.split(";"); return { id: s[0], value: s[1] }; }) };
    }
    case 65: // AA
      return { type: "characterAdded", success: ok };
  }
  return null;
}

/** s.charCodeAt(i) where a missing field (undefined.charCodeAt → undefined) counts as 0 in SWF 6 arithmetic. */
const code = (s: string | undefined, i: number): number => (s === undefined ? 0 : s.charCodeAt(i));

function gameCreateOrJoin(type: "gameCreate" | "gameJoin", data: string, ok: boolean): ServerEvent {
  // DataProcessor.as:232-267 — on success DATACENTER.Channel.m_name = null
  if (!ok) return { type, success: false, error: data.charAt(3) };
  const p = data.split("|");
  return { type, success: true, state: Number(p[1]), name: p[2], params: p.slice(3) };
}

function game(data: string, c1: number, ok: boolean, ctx: ParseContext): ServerEvent | null {
  const c2 = data.charCodeAt(2);
  switch (c1) {
    case 67: return gameCreateOrJoin("gameCreate", data, ok); // GC
    case 74: return gameCreateOrJoin("gameJoin", data, ok); // GJ
    case 69: { // GE → Client.Game.innerOnEnd(substr(2))
      const p = data.substr(2).split("|");
      const senderId = p.shift();
      const results = p.map((e): GameResult => {
        const r = e.split(";");
        const lowXp = Number(r[4]);
        const xp = Number(r[5]);
        return { winner: r[0] == "2", id: r[1], level: Number(r[2]), bDead: r[3] == "1", lowXp, xp, fullxp: lowXp + xp, highXp: Number(r[6]), winxp: Number(r[7]), gold: Number(r[8]) };
      });
      return { type: "gameEnd", senderId, results };
    }
    case 76: { // GL — :271-290. AS quirks kept: maxPlayersCount adds charCodeAt(0) to itself (GJ/GIM use 0 and 1);
      // with fewer than 2 parts the AS calls onList([]) twice.
      const games = data.split("|").slice(1).map((e) => {
        const p = e.split(";");
        return { name: p[0], maxPlayersCount: code(p[1], 0) - 64 + (code(p[1], 0) - 64), playersCount: code(p[1], 2) - 64 };
      });
      return { type: "gamesList", games };
    }
    case 73: // GI
      switch (c2) {
        case 77: { // GIM → innerOnMapInformations (whole message); sets DATACENTER.Game.m_maxPlayerCount
          const p = data.split("|");
          return { type: "mapInformations", state: Number(p[1]), maxPlayerCount: code(p[4], 0) - 64 + (code(p[4], 1) - 64), gameName: p[2], gameMap: p[3], gameOptions: p[4] };
        }
        case 80: { // GIP → innerOnPlayersInformations(substring(4)). AS BUG (state layer): calls
          // createCharacter(ID, name, Guild, Color1, …) against the (i, name, ca) signature.
          const players = data.substring(4).split("|").map((e) => {
            const p = e.split(";");
            return { id: p[0], name: p[1], guild: p[2], color1: p[3], color2: p[4], color3: p[5], LP: p[6], AP: p[7], GP: p[8], team: p[11] };
          });
          return { type: "playersInformations", players };
        }
        case 67: // GIC → innerOnPlayersCoordinates(substring(4))
          return { type: "playersCoordinates", data: data.substring(4).split("|").map((e) => e.split(";")) };
      }
      return null;
    case 77: return { type: "gameMovement", entries: gameMovement(data, ctx.isMultiplayer ?? false) }; // GM
    case 86: return { type: "gameLeave" }; // GV
    case 68: // GD
      switch (c2) {
        case 77: { // GDM → innerOnMapData: "GDM|id|width|height|rolePlay|backgroundNum|mapData"
          const p = data.split("|");
          return { type: "mapData", id: p[1], width: p[2], height: p[3], bRolePlay: p[4] == "1", backgroundNum: p[5], mapData: p[6] };
        }
        case 67: { // GDC → innerOnCellData: "GDC<cell>|<10 data chars><mask hex>"
          const p = data.split("|");
          const d = str(p[1]);
          return { type: "cellData", cellNum: Number(p[0]!.substr(3)), data: d.substring(0, 10), mask: d.substring(10, 20) };
        }
      }
      return null;
    case 65: // GA
      if (c2 == 83) return { type: "actionsStart", characterId: data.substr(3) };
      if (c2 == 70) return { type: "actionsFinish", characterId: data.substr(3) };
      { // innerOnActions
        const action = data.substr(2).split(";");
        return { type: "gameAction", action, id: action[0], actionType: Number(action[1]), characterId: action[2], params: action[3] };
      }
    case 80: // GP → innerOnPositionStart: only "GPS"
      return c2 === 83 ? { type: "positionStart", cells: data.substr(3).split("|") } : null;
    case 82: return { type: "everybodyIsReady" }; // GR
    case 83: return { type: "startToPlay" }; // GS
    case 115: return { type: "startSearch" }; // Gs
    case 84: // GT
      switch (c2) {
        case 83: { // GTS → innerOnTurnStart: duration ms → s
          const p = data.substr(3).split("|");
          return { type: "turnStart", characterId: p[0], duration: Number(p[1]) / 1000 };
        }
        case 70: return { type: "turnFinish", characterId: data.substr(3) }; // GTF
        case 76: return { type: "turnList", turnSequence: data.substr(4).split("|") }; // GTL (substr 4)
      }
      return null;
    case 116: { // Gt
      const p = data.substr(3).split("|");
      return !ok || p.length < 2 ? { type: "changeTeam", success: false } : { type: "changeTeam", success: true, playerId: p[0]!, team: p[1]! };
    }
    case 105: { // Gi → innerOnInvitationDemandRejected(substr(2)): first char = why, then "whoId|whoName"
      const d = data.substr(2);
      const p = d.substr(1).split("|");
      return { type: "invitationRejected", why: d.substring(0, 1), whoId: p[0], whoName: p[1] };
    }
    case 89: { // GY → innerOnInvitationResponse(substr(2))
      const p = data.substr(2).split("|");
      return { type: "invitation", characterId: p[0], characterName: p[1] };
    }
    case 121: return { type: "cancelInvitationResponse" }; // Gy
  }
  return null;
}

/** Client.Game.as:196-267 */
function gameMovement(data: string, isMultiplayer: boolean): GameMovementEntry[] {
  const parts = data.split("|");
  const out: GameMovementEntry[] = [];
  for (let i = 1; i < parts.length; i++) {
    const s = parts[i]!;
    if (s.length == 0) break;
    if (s.charAt(0) == "+") {
      const p = s.substring(1).split(";");
      if ((p[0] as unknown) == 0) out.push({ add: true, num: 0 });
      else {
        const e: GameMovementEntry = { add: true, id: p[0]!, name: p[1], level: p[2], guild: p[3], sex: p[4], gfxID: p[5], color1: p[6], color2: p[7], color3: p[8], weapon: p[9] };
        if (!isMultiplayer) Object.assign(e, { cell: p[10], dir: p[11] });
        else Object.assign(e, { LP: p[10], team: p[11], joinPosition: p[12] });
        out.push(e);
      }
    } else out.push({ add: false, id: parts[1]!.substring(1) });
  }
  return out;
}

const FRIEND_STATES: Record<string, Friend["state"]> = { C: "IN_CHANNEL", "1": "IN_SOLO", "2": "IN_MULTI", "3": "IN_RANDOM", "?": "IN_UNKNOW" };

function friend(data: string): Friend {
  // Client.Account.as:76-122 — "account;state;name;level;guild;sex;gfxID", state char → constant
  const p = data.split(";");
  const f: Friend = { account: p[0] };
  if (p[1] != undefined) {
    if (Object.hasOwn(FRIEND_STATES, p[1])) f.state = FRIEND_STATES[p[1]];
    Object.assign(f, { name: p[2], level: p[3], guild: p[4], sex: p[5], gfxID: p[6] });
  } else f.state = "DISCONNECT";
  return f;
}

function friends(data: string, c1: number, ok: boolean): ServerEvent | null {
  switch (c1) {
    case 65: { // FA → innerOnAddFirend(success, substr(3), false)
      const d = data.substr(3);
      return { type: "friendAdd", success: ok, name: d.split(";")[0], friend: ok ? friend(d) : null };
    }
    case 68: return ok ? { type: "friendRemove", success: true } : { type: "friendRemove", success: false, error: data.substr(3) }; // FD
    case 76: // FL → innerOnFirendsList(substr(3))
      return { type: "friendsList", friends: data.substr(3).split("|").map(friend).filter((f) => str(f.account).length != 0) };
    case 108: { // Fl → innerOnFirendsListForRandomGame(substr(3)): "name;id;level", kept when id is defined
      const list: { name: string; id: string; level?: string }[] = [];
      for (const e of data.substr(3).split("|")) {
        const p = e.split(";");
        if (p[1] != undefined) list.push({ name: p[0]!, id: p[1], level: p[2] });
      }
      return { type: "friendsListForRandomGame", friends: list };
    }
    case 73: return { type: "friendIn", data: data.substr(2) }; // FI
    case 79: return { type: "friendOut", data: data.substr(2) }; // FO
  }
  return null;
}

/**
 * Client.Items.as:27-80. Error: "F" inventory full, "L" level too low, else nothing. Success: "*"-separated
 * segments, "G<gold>" / "O<item;item…>" / other. AS BUG kept: the inner `var i` (DefineLocal, P-code verified)
 * replaces the outer loop index, so after an "O" segment the scan resumes at (item count + 1).
 */
function itemAdd(bError: boolean, data: string): ServerEvent | null {
  if (bError) return data == "F" ? { type: "itemAddError", reason: "inventoryFull" } : data == "L" ? { type: "itemAddError", reason: "tooLowLevel" } : null;
  const segs = data.split("*");
  const entries: ItemAddEntry[] = [];
  let i = 0;
  while (i < segs.length) {
    const seg = segs[i]!;
    const kind = seg.substring(0, 1);
    const dataStr = seg.substr(1);
    if (kind === "G") entries.push({ kind: "gold", amount: dataStr });
    else if (kind === "O") {
      const parts = dataStr.split(";");
      const items: Item[] = [];
      for (i = 0; i < parts.length; i++) {
        const item = getItemObjectFromData(parts[i]!);
        if (item != undefined) items.push(item);
      }
      entries.push({ kind: "items", items });
    } else entries.push({ kind: "other" });
    i++;
  }
  return { type: "itemAdd", entries };
}

// ───────────────────────────── outgoing ─────────────────────────────
// Every builder returns the exact string Client.send() writes to the socket: payload + "\n", then truncated
// to MAX_DATA_LENGTH (200) chars — AS quirk kept: an over-long message loses its trailing "\n" (Client.as:75-89).
// Argument guards of the AS return null; state guards (DataCenter flags) are noted and left to the caller.
// Not modelled: the `waiting` flag (opens the "waiting" UI unless false), noted as "no wait" below.

export const send = (data: string): string => (data.length > MAX_DATA_LENGTH ? data.substring(0, MAX_DATA_LENGTH) : data);

// Client.as:57-74 — logon(): two sends, version then login + crypted password. AS quirk: it does not return when
// already authenticated or before the key arrived (it only reports onLogin(false)); it sends anyway.
export const version = (): string => send(VERSION + "\n");
export const login = (account: string, password: string, key: string): string => send(account + "\n" + cryptPassword(password, key) + "\n");

// Dofus.Client.Account.as
export const whoAmI = (): string => send("BW\n");
export const whoIs = (name: string): string => send("BW" + name + "\n");
export const getCharacters = (): string => send("PL\n");
/** State guard: sent only while Account.isSet is false (then set true; reset by ASK). */
export const setCharacter = (charId: string | number): string => send("PS" + charId + "\n");
/** Note the field order: name|guild|sex|color1|color2|color3. */
export const addCharacter = (name: string, guild: string | number, color1: string | number, color2: string | number, color3: string | number, sex: string | number): string =>
  send("PA" + name + "|" + guild + "|" + sex + "|" + color1 + "|" + color2 + "|" + color3 + "\n");
export const deleteCharacter = (characterID: string | undefined): string | null =>
  characterID == undefined || characterID.length == 0 ? null : send("PD" + characterID + "\n");
export const boost = (bonusID: string | number): string => send("PB" + bonusID + "\n");
export const getFriendsList = (): string => send("FL\n"); // no wait
export const getFriendsListForRandomGame = (): string => send("Fl\n"); // no wait
export const addFriend = (name: string | undefined): string | null =>
  name == undefined || name.length == 0 || name == "*" ? null : send("FA" + name + "\n");
export const removeFriend = (name: string | undefined): string | null =>
  name == undefined || name.length == 0 || name == "*" ? null : send("FD" + name + "\n");

// Dofus.Client.Channels.as
/**
 * join(name): without a name and with DATACENTER.Channel.lastChannel set, rejoins it (never happens: see
 * datacenter/game.ts Channel); otherwise "<", ">", "|" → "_". No name and no lastChannel sends "CJ\n" (SWF 6).
 */
export const joinChannel = (name?: string, lastChannel: string | null = null): string =>
  name == undefined && lastChannel != null ? send("CJ" + lastChannel + "\n") : send("CJ" + str(name?.split("<").join("_").split(">").join("_").split("|").join("_")) + "\n");
export const getChannelList = (): string => send("CL\n");

// Dofus.Client.Chat.as
/**
 * Chat.send(msg, dest): dest is a name (whisper), "*" (public) or "#" (team). "<" → "&lt;", ">" → "&gt;", "|" → " ".
 * State guard: when dest == DATACENTER.Player.name the AS prints CANT_WISP_YOURSELF instead of sending.
 */
export const chatMessage = (msg: string, dest: string): string =>
  send("BM" + dest + "|" + msg.split("<").join("&lt;").split(">").join("&gt;").split("|").join(" ") + "\n");
export const smiley = (smileyID: string | number): string => send("BS" + smileyID + "\n");

// Dofus.Client.Game.as
export const getGameList = (gameType: string | number): string => send("GL" + gameType + "\n");
/** createFree(name, type, map, options, password): `gameType` is overwritten with 2. */
export const createFreeGame = (gameName: string, gameMap: string | number, gameOptions: string, gamePassword: string): string =>
  send("GC" + 2 + gameName + "|" + gameMap + "|" + gameOptions + "|" + gamePassword + "\n");
export const createSoloGame = (): string => send("GC1\n");
/** State guard: only when !DATACENTER.Game.isRandom. */
export const createRandomGame = (): string => send("GC3\n");
export const invite = (characID: string | number): string => send("Gi" + characID + "\n"); // no wait
export const refuseInvite = (characID: string | number): string => send("GY" + characID + "\n"); // no wait
export const getMapsList = (): string => send("BL\n");
/** GetMapData — the AS also hides/clears the battlefield and shows LOADING_MAP. */
export const getMapData = (): string => send("GD\n");
export const getPlayersInformations = (): string => send("GP\n");
export const getPlayersCoordinate = (): string => send("Gc\n");
export const joinGame = (gameType: string | number, gameName: string, gamePassword: string): string =>
  send("GJ" + gameType + gameName + "|" + gamePassword + "\n");
export const getGameInfos = (): string => send("GI\n");
/** State guard: only when DATACENTER.Game.isFull. */
export const startGame = (): string => send("GS\n");
export const startSearch = (): string => send("Gs\n"); // no wait
export const ready = (): string => send("GR\n");
export const setPlayerPosition = (cell: string | number): string => send("Gp" + cell + "\n");
/** sendActions: type left-padded with "0" to 3 chars (String.getAddLeftChar), params joined with ";". Move = (1, [compressPath(...)]). */
export const sendActions = (actionType: string | number, params: readonly unknown[]): string =>
  send("GA" + String(actionType).padStart(3, "0") + params.map(str).join(";") + "\n");
export const leaveGame = (characID?: string | number): string => send("GQ" + (characID != undefined ? characID : "") + "\n");
export const invitationUndo = (characID: string | number): string => send("GU" + characID + "\n");
/** ActionAck — the AS then calls KERNEL.GameActionsManager.end() (undefined in AKSClient → no-op). No wait. */
export const actionAck = (idAction: string | number): string => send("GKK" + idAction + "\n");
export const actionCancel = (idAction: string | number | undefined, param: unknown): string =>
  send("GKE" + str(idAction) + "|" + str(param) + "\n"); // no wait
/** State guard: only when DATACENTER.Player.isCurrentPlayer. No wait. */
export const turnEnd = (): string => send("GT\n");
/** State guard: only when !DATACENTER.Game.isFull. */
export const changeTeam = (team: string | number): string => send("Gt" + team + "\n");

// Dofus.Client.Infos.as
export const getInfos = (): string => send("IC\n");
export const getPodium = (): string => send("IP\n");
export const getGeneral = (): string => send("IG\n");

// Dofus.Client.Items.as (no wait)
export const itemMovement = (ID: string | number, position: string | number): string => send("OM" + ID + "|" + position + "\n");
export const itemDrop = (ID: string | number): string => send("OD" + ID + "\n");

// Dofus.Client.Spells.as
export const spellMoveToUsed = (ID: string | number, position: string | number): string => send("SM" + ID + "|" + position + "\n"); // no wait
export const spellBoost = (ID: string | number): string => send("SB" + ID + "\n");
export const spellGetInfos = (spellID: string | number): string => send("SI" + spellID + "\n"); // no wait
