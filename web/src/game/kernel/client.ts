// AKSClient/Dofus.Client.as + Dofus.Client.{Account,Channels,Chat,Console,Game,Infos,Items,Spells}.as — `_global.AKS`,
// a facade on web/src/core/protocol.ts. Outgoing strings come from the core builders; incoming frames are parsed by
// `parseServerMessage` (= the string half of Dofus.Client.DataProcessor.as + the `innerOn*` parsers) and
// `Client.dispatch` calls the handler DataProcessor.process would call, with the DATACENTER side effects that the
// parser leaves out. The `on*` callbacks are assigned by Events.AKS*.as (events.ts, events.game.ts).
// Transport: the XMLSocket (Client.as:21) is a WebSocket through core/connection.ts, one message per frame.
import { ERROR_CHAT_COLOR, MAX_DATA_LENGTH, VERSION } from "../../core/constants.ts";
import { connect as wsConnect } from "../../core/connection.ts";
import { Console } from "../../core/console.ts";
import type { Character } from "../../core/datacenter/character.ts";
import { Game } from "../../core/datacenter/game.ts";
import type { Item } from "../../core/datacenter/item.ts";
import type { Spell } from "../../core/datacenter/spell.ts";
import { getText } from "../../core/lang.ts";
import * as P from "../../core/protocol.ts";
import type { CharacterListEntry, GameMovementEntry, GameResult, PodiumPlayer, ServerEvent } from "../../core/protocol.ts";
import { str } from "../../core/swf6.ts";
import { clearInterval, type MovieClip, player, setInterval, type TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import { log } from "./init.ts";

declare module "../globals.ts" {
  interface Globals {
    AKS: Client;
  }
}

// ---- `output` clips assigned by the UI (AKS.X.output = this, e.g. modules_Interfaces/Interface.Banner.as:20-21) ----
/** Chat/banner clip: `txtChat`, `txtConsole` and the user-list methods Events.AKS*.as call. */
export type ChatOutput = MovieClip & {
  txtChat?: TextField;
  txtConsole?: TextField;
  clearForNewChat?(name?: string): void;
  addUser?(user: unknown): void;
  removeUser?(user: unknown): void;
  removeAllUsers?(): void;
};
export type GenericOutput = MovieClip;

type User = { name?: string; level?: string; gfxID?: string };
export type ParsedFriend = Extract<ServerEvent, { type: "friendsList" }>["friends"][number];

type Socket = { send(data: string): void; close(): void };

export class Client {
  // Client.as:6-8 prototype callbacks + those Events.AKS.as assigns
  onConnect?: (success: boolean, msg?: string) => void;
  onLogin?: (success: boolean, msg: string | null | undefined, language?: string | boolean) => void;
  onDisconnect?: (bRelog: boolean) => void;
  onServerMessage?: (display: string, messageID: string) => void;
  onBadVersion?: () => void;

  Account = new ClientAccount(this);
  Channels = new ClientChannels(this);
  Chat = new ClientChat(this);
  Console = new ClientConsole(this);
  Game = new ClientGame(this);
  Spells = new ClientSpells(this);
  Items = new ClientItems(this);
  Infos = new ClientInfos(this);
  /** Client.as:9-34 */
  readonly STATE_IN_CHANNEL = "C";
  readonly STATE_IN_GAME_UNKNOWN = "1";
  readonly STATE_IN_GAME_FREE = "2";
  readonly STATE_IN_GAME_RANDOM = "3";
  readonly STATE_IN_GAME_SOLO = "4";
  readonly STATE_IN_DUNNO = "?";
  m_Socket: Socket | null = null;
  m_bConnected = false;
  m_bAuthentified = false;
  m_UID: string | null = null;
  /** `m_ServerMessageID` / `m_serverMessageID` (SWF 6: one member). */
  m_ServerMessageID: string | number = -1;
  m_bSkipMenu = false;
  m_login: string | undefined;
  isSet = false;
  /** Port (authored): set by the login screen's "S'inscrire" button; the next `logon` sends the register frame. */
  register = false;
  /** Port: WebSocket URL used by `connect` instead of XMLSocket(host, port) — from `?server=` (main.ts). */
  serverURL: string | undefined;
  /** Port: server frames held back while the map layers load (see `receive`). */
  private inbox: [ServerEvent, string][] = [];
  private inboxTimer: number | undefined;

  /** Client.as:35-43 */
  clear(): void {
    this.m_bConnected = false;
    this.m_bAuthentified = false;
    this.m_UID = null;
    this.m_ServerMessageID = -1;
    this.isSet = false;
  }

  /**
   * Client.as:44-51. A close before the `H` key counts as the failed connect of XMLonConnect(false) (a WebSocket
   * reports both as `onclose`); later closes are innerOnDisconnect. Events of a replaced socket are dropped.
   */
  connect(host: string, port: number): void {
    const url = this.serverURL ?? `ws://${host}:${port}`;
    this.inbox = [];
    const sock: Socket = wsConnect(url, {
      onEvent: (ev, raw) => sock === this.m_Socket && this.receive(ev, raw),
      onClose: () => sock === this.m_Socket && player.dispatch(() => (this.m_bConnected ? this.innerOnDisconnect() : this.XMLonConnect(false))),
      context: () => ({ login: this.m_login, isMultiplayer: G.DATACENTER.Game.isMultiplayer }),
    });
    this.m_Socket = sock;
  }

  /**
   * Port addition: Map.build and Container.clear need clips/ground.swf and clips/objects.swf loaded into
   * BATTLEFIELD.Container (loadMovie at boot, Container.as:7-47). Flash had them long before the first map; the browser
   * fetches ~6.5 MB, so from a map frame (`GDM`) on, frames wait in order until the three layers have run frame 1.
   */
  private receive(ev: ServerEvent, raw: string): void {
    this.inbox.push([ev, raw]);
    this.flushInbox();
  }
  private flushInbox(): void {
    for (let head = this.inbox[0]; head; head = this.inbox[0]) {
      const c = G.BATTLEFIELD?.Container, [ev, raw] = head;
      if (ev.type === "mapData" && c && ![c.Ground, c.Object1, c.Object2].every((l) => typeof l?.attach === "function")) {
        this.inboxTimer ??= setInterval(() => this.flushInbox(), 40);
        return;
      }
      this.inbox.shift();
      player.dispatch(() => this.dispatch(ev, raw));
    }
    if (this.inboxTimer !== undefined) clearInterval(this.inboxTimer), (this.inboxTimer = undefined);
  }

  /** Client.as:52-56 — XMLSocket.close() fires no onClose, so the AS calls it itself. */
  disconnect(bRelog?: boolean): void {
    const s = this.m_Socket;
    this.m_Socket = null;
    s?.close();
    this.innerOnDisconnect(bRelog);
  }

  /**
   * Client.as:57-74. AS quirk kept: the two error reports do not return, the frames are sent anyway.
   */
  logon(login: string | undefined, password: string | undefined): void {
    if (this.m_bAuthentified) this.onLogin?.(false, getText("ALREADY_LOGGED", []));
    if (this.m_UID == null) this.onLogin?.(false, getText("CONNECT_NOT_FINISHED", []));
    G.DATACENTER.Player.login = login;
    G.DATACENTER.Player.password = password;
    this.m_login = login;
    this.send(P.version());
    this.send(P.login(str(login), str(password), str(this.m_UID), this.register));
    this.register = false;
  }

  /** Client.as:75-89 — truncated to MAX_DATA_LENGTH; opens the waiting box unless `waiting === false`. */
  send(data: string, waiting?: boolean): void {
    const d = data.length > MAX_DATA_LENGTH ? data.substring(0, MAX_DATA_LENGTH) : data;
    log("<< " + d);
    this.m_Socket?.send(d);
    if (waiting || waiting == undefined) G.INTERFACE?.MainLayer_mc?.waiting?.open();
  }

  /** Client.as:90-96 */
  XMLonConnect(success: boolean): void {
    if (!success) this.onConnect?.(false, getText("CANT_CONNECT"));
  }

  /** Client.as:97-106 */
  innerOnDisconnect(bRelog?: boolean): void {
    this.m_bAuthentified = false;
    this.onDisconnect?.(bRelog ?? false);
  }

  /** Dofus.Client.DataProcessor.as:6-493 on a parsed frame: same handler, same DATACENTER writes. */
  dispatch(ev: ServerEvent, raw: string): void {
    const DC = G.DATACENTER;
    log(">> " + raw); // :10-11
    G.INTERFACE?.MainLayer_mc?.waiting?.close(); // :12
    switch (ev.type) {
      case "helloKey": // :29-33
        this.m_UID = ev.key;
        this.m_bConnected = true;
        return this.onConnect?.(true);
      case "serverMessage": // :34-37
        this.m_ServerMessageID = ev.messageId;
        return this.onServerMessage?.(ev.display, ev.messageId);
      case "mapsList": return this.Game.innerOnMapsList(ev.maps); // :38-40
      case "playerCount": return this.Infos.onPlayerCount?.(ev.count); // :45 → innerOnPlayerCount
      case "podium": return this.Infos.onPodium?.(ev.players); // :48 → innerOnPodium
      case "generalInfos": return this.Infos.onGeneral?.(ev.playerCount, ev.gameCountSolo, ev.gameCountFree, ev.gameCountRandom, ev.waitingCount);
      case "spellInfos": return this.Spells.onInfos?.(ev.spell); // :58 → innerOnInfos
      case "spellsMovement": // :61 → innerOnMovement
        for (const e of ev.entries) this.Spells.onMovement?.(e.add, e.spell);
        return;
      case "spellUpgrade": return this.Spells.innerOnUpgradeSpell(ev.spell); // :63-67
      case "loginOk": // :74-77
        this.m_bAuthentified = true;
        return this.onLogin?.(true, null, ev.language);
      case "loginError": { // :79-95
        let msg: string | undefined;
        if (ev.reason == "alreadyLogged") msg = getText("ALREADY_LOGGED");
        else if (ev.reason == "badVersion") {
          msg = getText("BAD_VERSION", [VERSION]);
          this.onBadVersion?.();
        } else if (ev.reason == "accountExists") msg = getText("ACCOUNT_EXISTS"); // port (authored): register refused
        else msg = getText("ACCESS_DENIED");
        return this.onLogin?.(false, msg, true);
      }
      case "whoIs": return this.Account.onWhoIs?.(ev.playerName, ev.characterName, ev.state, ev.param); // :97-125
      case "whoAmI": return this.Account.onWhoAmI?.(ev.playerName, ev.characterName, ev.state, ev.param);
      case "charactersList": return this.Account.onGetCharacters?.(ev.characters); // :126-152
      case "characterSelected": // :153-198
        this.Account.isSet = false;
        G.KERNEL.CharactersManager.createCharacter(ev.id, ev.name, ev.data);
        DC.Player.ID = ev.id;
        DC.Player.name = ev.name;
        return this.Account.onSetCharacter?.(true, "");
      case "characterSelectError": return this.Account.onSetCharacter?.(false, ev.message);
      case "newLevel": return this.Account.innerOnNewLevel(ev); // :204-206
      case "boost": return this.Account.innerOnBoost(ev.characterId, ev.stats); // :207-209
      case "characterAdded": return this.Account.onAddCharacter?.(ev.success); // :210-211
      case "channelJoin": // :217-221
        DC.Channel.m_name = ev.name;
        return this.Channels.onJoin?.(ev.name, ev.success);
      case "channelMovement": return this.Channels.innerOnMovement(ev.entries); // :222-224
      case "channelList": return this.Channels.innerOnList(ev.users); // :225-226
      case "gameCreate": // :232-249
        if (!ev.success) return this.Game.innerOnCreate(false, null, null, ev.error);
        DC.Channel.m_name = null;
        return this.Game.innerOnCreate(true, ev.name, ev.state, ev.params);
      case "gameJoin": // :250-267
        if (!ev.success) return this.Game.innerOnJoin(false, null, null, ev.error, false);
        DC.Channel.m_name = null;
        return this.Game.innerOnJoin(true, ev.name, ev.state, ev.params, false);
      case "gameEnd": return this.Game.innerOnEnd(ev.senderId, ev.results); // :268-270
      case "gamesList": // :271-290 — with fewer than 2 parts the AS calls onList([]) twice
        if (ev.games.length == 0) this.Game.onList?.([]);
        return this.Game.onList?.(ev.games);
      case "mapInformations": // :294-296 → innerOnMapInformations (onMapInformations is never assigned)
        DC.Game.m_maxPlayerCount = ev.maxPlayerCount;
        return this.Game.onMapInformations?.({ gameName: ev.gameName, gameMap: ev.gameMap, gameOptions: ev.gameOptions });
      case "playersInformations": // :297-299 → innerOnPlayersInformations. AS BUG kept: createCharacter(ID, name,
        // Guild, …) passes a string as `ca`, so every `ca.x` is undefined (Client.Game.as:337).
        for (const p of ev.players) G.KERNEL.CharactersManager.createCharacter(p.id, p.name, {});
        return;
      case "playersCoordinates": return this.Game.onPlayersCoordinates?.(ev.data); // :300-302
      case "gameMovement": return this.Game.innerOnMovement(ev.entries); // :304-306
      case "gameLeave": return this.Game.onLeave?.(); // :307-309
      case "mapData": return this.Game.onMapData?.(ev.id, ev.width, ev.height, ev.bRolePlay, ev.backgroundNum, ev.mapData); // :313-315
      case "cellData": return this.Game.onCellData?.(ev.cellNum, ev.data, ev.mask); // :316-318
      case "actionsStart": return this.Game.onActionsStart?.(ev.characterId); // :323-325
      case "actionsFinish": return this.Game.onActionsFinish?.(ev.characterId); // :326-328
      case "gameAction": return this.Game.onActions?.(ev.action); // :329-331 → innerOnActions
      case "positionStart": return this.Game.onPositionStart?.(ev.cells); // :333-335 → innerOnPositionStart
      case "everybodyIsReady": return this.Game.onEverybodyIsReady?.(); // :336-338
      case "startToPlay": return this.Game.onStartToPlay?.(); // :339-341
      case "startSearch": return this.Game.onStartSearch?.(); // :342-344
      case "turnStart": return this.Game.onTurnStart?.(ev.characterId, ev.duration); // :348-350 → innerOnTurnStart
      case "turnFinish": return this.Game.onTurnFinish?.(ev.characterId); // :351-353
      case "turnList": // :354-356 → innerOnTurnlist
        DC.Game.turnSequence = ev.turnSequence;
        return this.Game.onTurnList?.();
      case "changeTeam": return ev.success ? this.Game.innerOnChangeTeam(true, ev.playerId, ev.team) : this.Game.innerOnChangeTeam(false); // :358-370
      case "invitationRejected": return this.Game.onInvitationRejected?.(ev.why, ev.whoId, ev.whoName); // :371-373
      case "invitation": return this.Game.onInvitation?.(ev.characterId, ev.characterName); // :374-376
      case "cancelInvitationResponse": return this.Game.onCancelInvitationResponse?.(); // :377-378
      case "chatMessage": return this.Chat.onMessage?.(ev.msg, ev.fromName, ev.fromID, ev.channel); // :384-390
      case "chatError": // :391-400 (raw "<" ">" here, unlike Console)
        return this.Chat.onError?.(ev.error == "syntax"
          ? getText("SYNTAX_ERROR", [" /w <" + str(getText("NAME", [])) + "> <" + str(getText("MSG", [])) + ">"])
          : getText("USER_NOT_CONNECTED", [ev.name]));
      case "smiley": return this.Chat.onSmiley?.(ev.characterId, ev.smileyId); // :401-403 → innerOnSmiley
      case "friendAdd": return this.Account.innerOnAddFirend(ev.success, ev.name, ev.friend, false); // :461-470
      case "friendRemove": return ev.success ? this.Account.onRemoveFriend?.(true) : this.Account.onRemoveFriend?.(false, ev.error); // :471-480
      case "friendsList": return this.Account.innerOnFirendsList(ev.friends); // :481-483
      case "friendsListForRandomGame": return this.Account.onFirendsListForRandomGame?.(ev.friends); // :484-486
      case "friendIn": return this.Account.onFirendIn?.(ev.data); // :487-489
      case "friendOut": return this.Account.onFirendOut?.(ev.data); // :490-491
      case "randomGameCreate": case "randomGameInvite": case "randomGameRefuseInvitation":
      case "randomGameAcceptInvitation": case "randomGameJoin":
        return; // :409-440 — AKS.RandomGame is never constructed: no-ops
      case "itemWeapon": return this.Items.onWeapon?.(ev.characterId, ev.weaponType, ev.gfx, ev.col); // :447-449
      case "itemDrop": return this.Items.onDrop?.(ev.error, ev.data); // :450-452
      case "itemAddError": return ev.reason == "inventoryFull" ? this.Items.onInventoryFull?.() : this.Items.onTooLowLevel?.();
      case "itemAdd": return this.Items.innerOnAdd(ev.entries); // :453-455
    }
  }
}

/** Dofus.Client.Account.as */
export class ClientAccount {
  isSet = false;
  output: GenericOutput | undefined;
  onWhoIs?: (playerName: string | undefined, characterName: string | undefined, state: string | null | undefined, param: string | null | undefined) => void;
  onWhoAmI?: (playerName: string | undefined, characterName: string | undefined, state: string | null | undefined, param: string | null | undefined) => void;
  onGetCharacters?: (characArray: CharacterListEntry[]) => void;
  onSetCharacter?: (success: boolean, param1: string) => void;
  onAddFriend?: (success: boolean, name: string | undefined) => void;
  onFriendslist?: () => void;
  onRemoveFriend?: (success: boolean, data?: string) => void;
  onFirendIn?: (data: string) => void;
  onFirendOut?: (data: string) => void;
  onFirendsListForRandomGame?: (fArray: { name: string; id: string; level?: string }[]) => void;
  onNewLevel?: (level: number | undefined) => void;
  onAddCharacter?: (success: boolean) => void;
  onError?: (msg: string) => void;

  constructor(readonly _parent: Client) {}
  send(data: string | null, bWaiting?: boolean): void {
    if (data != null) this._parent.send(data, bWaiting);
  }
  whoAmI(): void { this.send(P.whoAmI()); }
  whoIs(name: string): void { this.send(P.whoIs(name)); }
  getCharacters(): void { this.send(P.getCharacters()); }
  /** :27-35 — once until the next ASK. */
  setCharacter(charId: string | number): void {
    if (!this.isSet) {
      this.send(P.setCharacter(charId));
      this.isSet = true;
    }
  }
  addCharacter(name: string, guild: string | number, color1: string | number, color2: string | number, color3: string | number, sex: string | number): void {
    this.send(P.addCharacter(name, guild, color1, color2, color3, sex));
  }
  deleteCharacter(characterID: string | undefined): void { this.send(P.deleteCharacter(characterID)); }
  boost(bonusID: string | number): void { this.send(P.boost(bonusID)); }
  getFriendsList(): void { this.send(P.getFriendsList(), false); }
  getFriendsListForRandomGame(): void { this.send(P.getFriendsListForRandomGame(), false); }
  addFriend(name: string | undefined): void { this.send(P.addFriend(name)); }
  removeFriend(name: string | undefined): void { this.send(P.removeFriend(name)); }

  /** :76-122 (parsing in protocol.ts) */
  innerOnAddFirend(success: boolean, name: string | undefined, friend: ParsedFriend | null, bList: boolean): void {
    if (success && friend && str(friend.account).length != 0) G.DATACENTER.Player.Friends.push(friend);
    if (!bList) this.onAddFriend?.(success, name);
  }
  /** :123-135 */
  innerOnFirendsList(friends: ParsedFriend[]): void {
    G.DATACENTER.Player.Friends = [...friends];
    this.onFriendslist?.();
  }
  /** :158-168 */
  innerOnNewLevel(d: { level?: string; XPlow?: string; XP?: string; XPhigh?: string; bonusPoints?: string }): void {
    const c = G.DATACENTER.Player.data;
    if (c) {
      c.level = d.level;
      c.XPlow = d.XPlow;
      c.XP = d.XP;
      c.XPhigh = d.XPhigh;
      c.bonusPoints = d.bonusPoints;
    }
    this.onNewLevel?.(c?.level);
  }
  /** :169-231 */
  innerOnBoost(characID: string | undefined, stats: { id: string | undefined; value: string | undefined }[]): void {
    const c = G.DATACENTER.Characters.getItemAt(str(characID));
    if (!c) return;
    for (const { id, value: v } of stats) {
      switch (id) {
        case "0": c.LPmax = v; c.LP = v; break;
        case "1": c.APinit = v; c.AP = v; break;
        case "2": c.GP = v; break;
        case "3": c.bonusPoints = v; break;
        case "6": c.rFire = v; break;
        case "7": c.rAir = v; break;
        case "8": c.rWater = v; break;
        case "9": c.rEarth = v; break;
        case "10": c.force = v; break;
        case "11": c.vitality = v; break;
        case "12": c.charism = v; break;
        case "13": c.karma = v; break;
        case "14": c.agility = v; break;
        case "15": c.intelligence = v;
      }
    }
  }
}

/** Dofus.Client.Channels.as */
export class ClientChannels {
  m_lastChannel: string | null = null;
  onJoin?: (name: string, success: boolean) => void;
  onMovement?: (bAdd: boolean, user: User, newRoom: boolean) => void;
  constructor(readonly _parent: Client) {}
  send(data: string): void { this._parent.send(data); }
  join(name?: string): void { this.send(P.joinChannel(name, G.DATACENTER.Channel.lastChannel)); }
  getList(): void { this.send(P.getChannelList()); }
  /** :30-55 — AS quirk kept: one object is reused (and mutated) for every entry. */
  innerOnMovement(entries: { add: boolean; name: string; level?: string; gfxID?: string }[]): void {
    const u: User = {};
    for (const e of entries) {
      u.name = e.name;
      u.level = e.level;
      u.gfxID = e.gfxID;
      this.onMovement?.(e.add, u, false);
    }
  }
  /** :56-74 */
  innerOnList(users: { name: string; level?: string; gfxID?: string }[]): void {
    G.AKS.Chat.output?.removeAllUsers?.();
    for (const u of users) this.onMovement?.(true, { name: u.name, level: u.level, gfxID: u.gfxID }, true);
  }
}

/** Dofus.Client.Chat.as */
export class ClientChat {
  output: ChatOutput | undefined;
  onMessage?: (msg: string | undefined, fromName: string | undefined, fromID: string | undefined, bWhisper: number) => void;
  onError?: (msg: string | undefined) => void;
  onSmiley?: (characID: string | undefined, smileyID: string | undefined) => void;
  constructor(readonly _parent: Client) {}
  /** :8-20 */
  send(msg: string, dest: string): void {
    if (dest == G.DATACENTER.Player.name) G.KERNEL.traceToChat(getText("CANT_WISP_YOURSELF"), ERROR_CHAT_COLOR);
    else this._parent.send(P.chatMessage(msg, dest));
  }
  smiley(smileyID: string | number): void { this._parent.send(P.smiley(smileyID)); }
}

/** Dofus.Client.Console.as on core/console.ts: the outputs are performed (sent / printed). */
export class ClientConsole extends Console {
  constructor(readonly _parent: Client) {
    super();
  }
  override process(cmd: string, playerName: string | null = G.DATACENTER.Player.name) {
    const out = super.process(cmd, playerName);
    // Only `/f L` (Account.getFriendsList, send(…, false)) goes without the waiting box; `/c FL` is a raw send.
    const noWait = /^\/(f|friends?) /i.test(cmd);
    for (const o of out) {
      if (o.type == "send") this._parent.send(o.data, noWait && o.data.startsWith("FL") ? false : undefined);
      else G.KERNEL.traceToChat(o.text, o.color);
    }
    return out;
  }
}

/** Dofus.Client.Game.as */
export class ClientGame {
  readonly STATE_UNKNOWN = 0;
  readonly STATE_SOLO = 1;
  readonly STATE_FREE = 2;
  readonly STATE_RANDOM_TEAM = 3;
  m_bInGame = false;
  m_MapsList: string[] | null = null;
  m_state = 0;
  output: GenericOutput | undefined;
  tmpPassword: string | undefined;
  onList?: (games: { name: string | undefined; maxPlayersCount: number; playersCount: number }[]) => void;
  onCreateSolo?: (success: boolean, params: string[] | string | null) => void;
  onCreateMulti?: (success: boolean, params: string[] | string | null) => void;
  onJoin?: (success: boolean, params: string[] | string | null, bCreator?: boolean) => void;
  onJoinRandom?: (bCreator: boolean) => void;
  onMovement?: (bAdd: boolean, c: Character | { num: 0 } | undefined) => void;
  onMapsList?: (list: string[]) => void;
  onChangeTeam?: (bool: boolean, item?: unknown, team?: string) => void;
  onMapData?: (id: string | undefined, width: string | undefined, height: string | undefined, bRolePlay: boolean, backgroundID: string | undefined, data: string | undefined) => void;
  onCellData?: (cellNum: number, data: string, mask: string) => void;
  onMapInformations?: (o: { gameName?: string; gameMap?: string; gameOptions?: string }) => void;
  onActions?: (action: string[]) => void;
  onActionsStart?: (characID: string) => void;
  onActionsFinish?: (characID: string) => void;
  onPlayersCoordinates?: (data: string[][]) => void;
  onPositionStart?: (cells: string[]) => void;
  onEverybodyIsReady?: () => void;
  onStartToPlay?: () => void;
  onStartSearch?: () => void;
  onTurnStart?: (characID: string | undefined, duration: number) => void;
  onTurnFinish?: (characID: string) => void;
  onTurnList?: () => void;
  onEnd?: (senderId: string | undefined) => void;
  onLeave?: () => void;
  onInvitation?: (characID: string | undefined, characName: string | undefined) => void;
  onInvitationRejected?: (why: string, whoID: string | undefined, whoName: string | undefined) => void;
  onCancelInvitationResponse?: () => void;

  constructor(readonly _parent: Client) {}
  send(data: string, bWaiting?: boolean): void { this._parent.send(data, bWaiting); }
  getList(gameType: string | number): void { this.send(P.getGameList(gameType)); }
  createFree(gameName: string, _gameType: unknown, gameMap: string | number, gameOptions: string, gamePassword: string): void {
    this.send(P.createFreeGame(gameName, gameMap, gameOptions, gamePassword));
  }
  createSolo(): void { this.send(P.createSoloGame()); }
  /** `AKS.Game.CreateSolo` (SWF 6 case-insensitive, GameResultRandom replay button). */
  CreateSolo(): void { this.createSolo(); }
  createRandom(): void { if (!G.DATACENTER.Game.isRandom) this.send(P.createRandomGame()); }
  invite(characID: string | number): void { this.send(P.invite(characID), false); }
  refuseInvite(characID: string | number): void { this.send(P.refuseInvite(characID), false); }
  getMapsList(): void { this.send(P.getMapsList()); }
  /** :56-62 */
  GetMapData(): void {
    G.INTERFACE?.Text?.setText(getText("LOADING_MAP", []), false);
    if (G.BATTLEFIELD) {
      G.BATTLEFIELD.Container._visible = false;
      G.BATTLEFIELD.clear();
    }
    this.send(P.getMapData());
  }
  GetPlayersInformations(): void { this.send(P.getPlayersInformations()); }
  GetPlayersCoordinate(): void { this.send(P.getPlayersCoordinate()); }
  join(gameType: string | number, gameName: string | undefined, gamePassword?: string): void {
    this.send(P.joinGame(gameType, str(gameName), str(gamePassword)));
  }
  getInfos(): void { this.send(P.getGameInfos()); }
  start(): void { if (G.DATACENTER.Game.isFull) this.send(P.startGame()); }
  startSearch(): void { this.send(P.startSearch(), false); }
  ready(): void { this.send(P.ready()); }
  setPlayerPosition(cell: string | number): void { this.send(P.setPlayerPosition(cell)); }
  sendActions(actionType: string | number, params: readonly unknown[]): void { this.send(P.sendActions(actionType, params)); }
  leave(characID?: string | number): void { this.send(P.leaveGame(characID)); }
  invitationUndo(characID: string | number): void { this.send(P.invitationUndo(characID)); }
  /** :110-114 — then `KERNEL.GameActionsManager.end()`: KERNEL has no such member (no-op). */
  ActionAck(idAction: string | number): void { this.send(P.actionAck(idAction), false); }
  ActionCancel(idAction: string | number | undefined, param: unknown): void { this.send(P.actionCancel(idAction, param), false); }
  turnEnd(): void { if (G.DATACENTER.Player.isCurrentPlayer) this.send(P.turnEnd(), false); }
  changeTeam(team: string | number): void { if (!G.DATACENTER.Game.isFull) this.send(P.changeTeam(team)); }

  /** :133-162 */
  innerOnCreate(success: boolean, name: string | undefined | null, state: number | null, params: string[] | string | null): void {
    resetGame();
    switch (Number(state)) {
      case this.STATE_SOLO:
        G.DATACENTER.Game.state = state;
        G.DATACENTER.Game.currentPlayerID = G.DATACENTER.Player.ID;
        return this.onCreateSolo?.(success, params);
      case this.STATE_FREE:
      case this.STATE_RANDOM_TEAM:
        return this.innerOnJoin(success, name, state, params, true);
      default:
        if (!success) this.onCreateMulti?.(false, params);
    }
  }

  /** :163-195 */
  innerOnJoin(success: boolean, name: string | undefined | null, state: number | null, params: string[] | string | null, bCreator: boolean): void {
    resetGame();
    if (!success) return this.onJoin?.(false, params);
    switch (Number(state)) {
      case this.STATE_FREE: {
        const o = (params as string[])[1];
        G.DATACENTER.Game.state = state;
        G.DATACENTER.Game.m_name = name ?? null;
        G.DATACENTER.Game.m_maxPlayerCount = code(o, 0) - 64 + (code(o, 1) - 64);
        return this.onJoin?.(true, params, bCreator);
      }
      case this.STATE_RANDOM_TEAM:
        G.DATACENTER.Game.m_name = getText("RANDOM") ?? null;
        G.DATACENTER.Game.state = state;
        return this.onJoinRandom?.(bCreator);
    }
  }

  /** :196-267 — createCharacter per "+" entry; a removal is announced before the character is "deleted". */
  innerOnMovement(entries: GameMovementEntry[]): void {
    for (const e of entries) {
      if (e.add) {
        if ("num" in e) this.onMovement?.(true, { num: 0 });
        else {
          const { id, name, add: _a, ...ca } = e;
          this.onMovement?.(true, G.KERNEL.CharactersManager.createCharacter(id, name, ca));
        }
      } else {
        const zero = (e.id as unknown) == 0;
        this.onMovement?.(false, zero ? { num: 0 } : G.DATACENTER.Characters.getItemAt(e.id));
        if (!zero) G.DATACENTER.Characters.setItemAt(Number(e.id), undefined);
      }
    }
  }

  /** :268-273 */
  innerOnMapsList(list: string[]): void {
    this.m_MapsList = list;
    this.onMapsList?.(list);
  }

  /** :362-377 */
  innerOnChangeTeam(bool: boolean, playerID?: string, team?: string): void {
    if (!bool) return this.onChangeTeam?.(false);
    const c = G.DATACENTER.Characters.getItemAt(str(playerID));
    if (c) c.team = Number(team);
    const players = this.output?.players as Record<string, unknown> | undefined;
    this.onChangeTeam?.(true, players?.["player" + str(c?.joinPosition)], team);
  }

  /** :378-420 (parsing in protocol.ts) */
  innerOnEnd(senderId: string | undefined, results: GameResult[]): void {
    const DC = G.DATACENTER;
    const R = { winners: [] as unknown[], losers: [] as unknown[] };
    DC.Game.Results = R;
    for (const r of results) {
      const o = { id: r.id, name: DC.Characters.getItemAt(str(r.id))?.name, level: r.level, bDead: r.bDead, lowXp: r.lowXp, xp: r.xp, fullxp: r.fullxp, highXp: r.highXp, winxp: r.winxp, gold: r.gold };
      (r.winner ? R.winners : R.losers).push(o);
      if (o.id == DC.Player.ID && DC.Player.data) DC.Player.data.XP = o.fullxp;
    }
    this.onEnd?.(senderId);
  }
}

/** :138-142 / :168-172 — every create/join reply starts from a fresh game. */
function resetGame(): void {
  const DC = G.DATACENTER;
  DC.Game = new Game();
  DC.Player.data?.initAP(false);
  DC.Player.SpellsManager.init();
  DC.Player.data?.EffectsManager.init();
  G.KERNEL.CharactersManager.clearAllOthersCharacters();
}

/** `s.charCodeAt(i)`: a missing string reads as 0 in SWF 6 arithmetic. */
const code = (s: string | undefined, i: number): number => (s === undefined ? 0 : s.charCodeAt(i));

/** Dofus.Client.Infos.as */
export class ClientInfos {
  output: GenericOutput | undefined;
  onPlayerCount?: (count: string) => void;
  onPodium?: (players: PodiumPlayer[]) => void;
  onGeneral?: (playerCount?: string, gameCountSolo?: string, gameCountFree?: string, gameCountRandom?: string, waitingCount?: string) => void;
  constructor(readonly _parent: Client) {}
  getInfos(): void { this._parent.send(P.getInfos()); }
  getPodium(): void { this._parent.send(P.getPodium()); }
  getGeneral(): void { this._parent.send(P.getGeneral()); }
}

/** Dofus.Client.Items.as */
export class ClientItems {
  onWeapon?: (characID: string | undefined, weaponType: number, gfx: number, col: string | undefined) => void;
  onDrop?: (error: boolean, data: string) => void;
  onInventoryFull?: () => void;
  onTooLowLevel?: () => void;
  constructor(readonly _parent: Client) {}
  movement(ID: string | number, position: string | number): void { this._parent.send(P.itemMovement(ID, position), false); }
  drop(ID: string | number): void { this._parent.send(P.itemDrop(ID), false); }
  /** :27-80 (parsing in protocol.ts) */
  innerOnAdd(entries: P.ItemAddEntry[]): void {
    for (const e of entries) {
      if (e.kind == "gold") G.INTERFACE?.msgBox(getText("YOU_FIND_GOLD", [e.amount]));
      else if (e.kind == "items") {
        for (const item of e.items as Item[]) {
          G.DATACENTER.Player.addItem(item);
          G.INTERFACE?.msgBox(str(getText("YOU_FIND_NEW_ITEM")) + " : " + str(item.name));
        }
      } else G.INTERFACE?.msgBox(getText("YOU_FIND_SOMTHING"));
    }
  }
}

/** Dofus.Client.Spells.as */
export class ClientSpells {
  output: GenericOutput | undefined;
  onMovement?: (bAdd: boolean, spellData: Spell | null) => void;
  onUpgradeSpell?: () => void;
  onInfos?: (spellData: Spell) => void;
  constructor(readonly _parent: Client) {}
  moveToUsed(ID: string | number | null, position: string | number | null | undefined): void { this._parent.send(P.spellMoveToUsed(str(ID), str(position)), false); }
  boost(ID: string | number): void { this._parent.send(P.spellBoost(ID), true); }
  getInfos(spellID: string | number | null): void { this._parent.send(P.spellGetInfos(str(spellID)), false); }
  /** :51-56 */
  innerOnUpgradeSpell(spell: Spell): void {
    G.DATACENTER.Player.addSpell(spell);
    this.onUpgradeSpell?.();
  }
}
