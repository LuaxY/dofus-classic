// Multiplayer lobby of modules/Interfaces.swf: `Interface::MultiPlayer`, its tabs and help layer, the tab widgets
// (stats, podium, team-mate cards, news scroller, map image) and the chat/friends list item renderers.
// Each class keeps its AS1 constructor name; sources under decompiled/clean/modules_Interfaces/ (docs/logic/ui.md §2.7-2.9).
import { GUILDS_DESCRIPTIONS_PATH, GUILDS_MINI_PATH, HTTP_MAPS_PATH, INFO_CHAT_COLOR, NEWS_DELAY } from "../../../core/constants.ts";
import type { Character } from "../../../core/datacenter/index.ts";
import { getText } from "../../../core/lang.ts";
import { str, toNumber } from "../../../core/swf6.ts";
import { getMember } from "../../../runtime/avm1.ts";
import { clearInterval, MovieClip, registerClass, Selection, setInterval, type TextField } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { FSelectableItemClass, type ListItem } from "../framework.ts";
import { asListener, call, type ComboBox, type ListBox, type ProgressBar, T, type Txt } from "./as.ts";
import { updateXP } from "./banner.ts";

declare module "../interface.ts" {
  interface Interface { UIInterfaceMultiPlayer?: Class_InterfaceMultiPlayer }
}

/** `Interface.MultiPlayer.as` (sprite 430): lobby shell; `AKS.Chat.output` while shown. */
export class Class_InterfaceMultiPlayer extends MovieClip {
  declare btnPlayDofus?: MovieClip;
  declare txtChannel: Txt;
  declare txtChat: Txt;
  declare txtConsole: Txt;
  declare comboChannels?: ComboBox;
  declare lstUsers?: ListBox;
  declare Tabs?: Class_InterfaceMultiPlayerTabs;
  constructor() {
    super();
    this.init();
  }
  init() {
    G.AKS.Chat.output = this;
    this.onEnterFrame = () => {
      for (const [b, key] of [["btnPlayDofus", "PLAY_DOFUS"], ["btnMulti", "MULTI_GAME"], ["btnFriends", "FRIENDS"], ["btnReturn", "RETURN_TO_VILLAGE"], ["btnSend", "SEND"]])
        call(this[b!], "setLabel", getText(key!));
      this.txtChannel?.setText(T("CHANNEL") + " : ", "Font1");
      delete this.onEnterFrame;
    };
    G.INTERFACE.Text.clearText();
    const tc = this.txtConsole;
    if (tc) {
      tc.onSetFocus = () => this.comboChannels?.myOnKillFocus();
      Selection.addListener(tc);
    }
  }
  clearForNewChat(channelName?: string) {
    G.CHAT.clear();
    G.CHAT.refresh();
    this.removeAllUsers();
    if (channelName != undefined) G.KERNEL.traceToChat(getText("YOU_ARE_IN_CHANNEL", [G.DATACENTER.Channel.m_name]), INFO_CHAT_COLOR);
    this.setChannel(channelName);
  }
  /** No caller (ui.md §2.7). */
  addChannel(name: string) {
    this.comboChannels?.addItem(name);
    this.comboChannels?.sortItemsBy("label", "ASC");
  }
  setChannel(name?: string) {
    const cb = this.comboChannels;
    if (name == undefined) {
      cb?.setEnabled(false);
      cb?.setValue(G.DATACENTER.Game.m_name);
    } else {
      cb?.setEnabled(true);
      const i = this.FindItem(cb, name);
      if (i == -1) cb?.setValue(name);
      else if (cb) {
        cb.enabledEvent = false;
        cb.setSelectedIndex(i);
        cb.enabledEvent = true;
      }
    }
  }
  addUser(user: { name?: unknown; [k: string]: unknown }) {
    this.lstUsers?.addItem(user, user.name);
  }
  /** AKSClient sometimes passes a name string (Events.AKS.Game.as:214): `user.name` is then undefined (ui.md §6.2). */
  removeUser(user: unknown) {
    const i = this.FindItem(this.lstUsers, (user as { name?: unknown } | undefined)?.name);
    if (i != -1) this.lstUsers?.removeItemAt(i);
  }
  removeAllUsers() {
    this.lstUsers?.removeAll();
  }
  FindItem(cmp: Pick<ListBox, "getLength" | "getItemAt"> | undefined, value: unknown) {
    const len = toNumber(cmp?.getLength());
    for (let i = 0; i < len; i++) if (cmp?.getItemAt(i)?.data == value) return i;
    return -1;
  }
}
registerClass("Interface::MultiPlayer", Class_InterfaceMultiPlayer);

type Tab = MovieClip & { onFocus?(): void; onFocusFinal?(): void; onLostFocus?(): void };
/** `Interface.MultiPlayer.Tabs.as` (sprite 372). `onFocus()` rebinds `AKS.*.output` synchronously (ui.md §2.8). */
export class Class_InterfaceMultiPlayerTabs extends MovieClip {
  declare tabLayers: string[];
  declare width: number;
  declare height: number;
  declare bInMove: boolean | undefined;
  declare currLayer: number | undefined;
  declare tmpOldLayer: string | undefined;
  declare tmplayerName: string | undefined;
  constructor() {
    super();
    this.tabLayers = ["TabStart", "TabGameJoined", "TabJoinGame", "TabPlayDofus", "TabFriends", "TabPlayDofusStart"];
    this.init();
  }
  init() {
    this.width = this._width;
    this.height = this._height;
    this.onEnterFrame = () => {
      this.showLayer("TabStart", false);
      delete this.onEnterFrame;
    };
  }
  showLayer(layerName: string, bAnim = true, bForce = false) {
    if (this.bInMove && !bForce) return; // mid-slide: ignored, and onFocus does not run
    const old = this.currLayer == undefined ? undefined : this.tabLayers[this.currLayer]; // tabLayers[undefined]
    // SWF 6 member names are case-insensitive: "TabFriends" is the child `tabFriends` (swf sprite 372)
    const tab = (n: string | undefined) => getMember(this, str(n)) as Tab | undefined;
    if (old == layerName) return;
    this.tmpOldLayer = old;
    this.tmplayerName = layerName;
    if (this.currLayer != undefined) tab(old)?.onLostFocus?.();
    this.tabLayers.forEach((l, i) => {
      if (l == layerName) this.currLayer = i;
    });
    const t = tab(layerName);
    if (t) t._visible = true;
    this.bInMove = false;
    if (bAnim) {
      this.bInMove = true;
      if (t) t._x = -this.width;
      let i = 0;
      this.onEnterFrame = () => {
        i++;
        const n = tab(layerName), o = tab(old);
        if (n) n._x += i * i;
        if (o) o._x += i * i;
        if (toNumber(n?._x) > 0) this.finishMove(layerName, old);
      };
    } else t?.onFocusFinal?.();
    t?.onFocus?.();
  }
  finishMove(layerName: string, oldLayer: string | undefined) {
    delete this.tmpOldLayer;
    delete this.tmplayerName;
    const n = getMember(this, layerName) as Tab | undefined, o = getMember(this, str(oldLayer)) as Tab | undefined;
    if (n) n._x = 0;
    if (o) o._visible = false;
    this.bInMove = false;
    delete this.onEnterFrame;
    n?.onFocusFinal?.();
  }
  getCurrentLayer() {
    return this.currLayer;
  }
}
registerClass("Interface::MultiPlayer::Tabs", Class_InterfaceMultiPlayerTabs);

/** `Interface.Multiplayer.Help.as` (sprite 429): shows the help sub-layer of the current tab index. */
export class Class_InterfaceMultiPlayerHelp extends MovieClip {
  declare tabLayers: string[];
  constructor() {
    super();
    this.tabLayers = ["HelpStart", "HelpGameJoined", "HelpJoinGame", "HelpPlayDofus", "HelpFriends", "HelpPlayDofusStart"];
  }
  showLayer(layerID: number | undefined) {
    for (const l of this.tabLayers) {
      const c = getMember(this, l) as MovieClip | undefined; // case-insensitive: the child is `HelpPLayDofusStart`
      if (c) c._visible = false;
    }
    const c = getMember(this, str(this.tabLayers[toNumber(layerID)])) as MovieClip | undefined; // no `HelpStart` child (ui.md §2.9)
    if (c) c._visible = true;
  }
}
registerClass("Interface::MultiPlayer::Help", Class_InterfaceMultiPlayerHelp);

/** `TabStart_GlobalStats.as`: filled by `AKS.Infos.onGeneral`. */
export class Class_TabStart_GlobalStats extends MovieClip {
  constructor() {
    super();
    this.init();
  }
  init() {
    (this.txtTitle as Txt)?.setText(getText("DOFUS_STATS"), "Font1");
    (this.txtPlayerCount as Txt)?.setText(T("CONNECTED") + " :", "Font1");
    (this.txtGameCount as Txt)?.setText(T("GAMECOUNT") + " :", "Font1");
    (this.txtInVillage as Txt)?.setText(T("INVILLAGECOUNT") + " :", "Font1");
  }
  /** `waitingCount` is unused. */
  setValues(playerCount: unknown, gameCountSolo: unknown, gameCountFree: unknown, gameCountRandom: unknown, _waitingCount?: unknown) {
    (this.txtPlayerCountValue as Txt)?.setText(playerCount, "Font1");
    (this.txtInVillageValue as Txt)?.setText(gameCountSolo, "Font1");
    (this.txtGameCountValue as Txt)?.setText(Number(gameCountFree) + Number(gameCountRandom), "Font1");
  }
}
registerClass("TabStart_GlobalStats", Class_TabStart_GlobalStats);

/** A podium entry of `AKS.Infos.onPodium` (`AKSClient/Events.AKS.Infos.as:5-17`). */
type PodiumData = { file?: unknown; name?: unknown; xp?: unknown; level?: unknown; color1?: unknown; color2?: unknown; color3?: unknown };
/** `TabStart_Podium.as`: three best players on their "Podium" frame. */
export class Class_TabStart_Podium extends MovieClip {
  declare XPLACES: number[];
  declare YPLACES: number[];
  declare clips: MovieClip;
  constructor() {
    super();
    this.init();
    this.XPLACES = [195, 65, 325];
    this.YPLACES = [-43, -38, -34];
  }
  init() {
    this.createEmptyMovieClip("clips", 10);
  }
  buildCharacter(place: number, data: PodiumData) {
    const s = this.clips.createEmptyMovieClip("sprite" + place, 10 * Number(place));
    s._x = toNumber(this.XPLACES[place]);
    s._y = toNumber(this.YPLACES[place]);
    s.onInitFrame = function (this: MovieClip) {
      this.gotoAndStop("Podium");
      this._xscale = this._yscale = 180 - place * 20;
      G.CCOLORS.addCharacter(this);
      G.CCOLORS.setColor(this._target, data.color1, data.color2, data.color3);
    };
    s.loadMovie(str(data.file));
    (this["txtCharacName" + place] as Txt)?.setText(data.name, "Font2");
    (this["txtCharacXP" + place] as Txt)?.setText(T("XP") + " : " + str(data.xp) + " - " + T("LEVEL_SMALL") + " " + str(data.level), "Font1");
  }
  clear() {
    this.init();
    for (let i = 0; i < 3; i++) {
      for (const f of ["txtCharacName", "txtCharacXP"]) {
        const t = this[f + i] as Txt;
        if (t) t.text = "";
      }
    }
  }
}
registerClass("TabStart_Podium", Class_TabStart_Podium);

/** `TabStart_SelfStats.as`: level and XP bar of the player. */
export class Class_TabStart_SelfStats extends MovieClip {
  declare XPProgressbar?: ProgressBar;
  constructor() {
    super();
    this.init();
    G.INTERFACE.addToListner?.(this); // misspelt in the AS: no such member → no-op (ui.md §6.2)
    G.DATACENTER.Player.data?.addListener(asListener(this));
  }
  init() {
    (this.txtTitle as Txt)?.setText(getText("USER_STATS"), "Font1");
    const bar = this.attachMovie("Interface::ProgressBar", "XPProgressbar", 10) as ProgressBar | undefined;
    bar?.init(100, 10, 65, 74);
    this.onSetXP(G.DATACENTER.Player.data?.XP);
    this.onSetLevel(G.DATACENTER.Player.data?.level);
  }
  onSetXP(value: unknown) {
    (this.txtXPValue as Txt)?.setText(T("EXPERIMENT") + " : " + str(value), "Font1");
    updateXP(this.XPProgressbar, value);
  }
  onSetLevel(value: unknown) {
    (this.txtLevel as Txt)?.setText(T("LEVEL") + " " + str(value), "Font1");
  }
}
registerClass("TabStart_SelfStats", Class_TabStart_SelfStats);

type Radio = MovieClip & { select?(b: boolean): void };
/** `TabGameJoined_Player.as`: a joined player's row (`{bCreator, playerID}` initObject, AKSClient fills it). */
export class Class_InterfaceMultiPlayerTabGameJoined_Player extends MovieClip {
  declare bCreator: boolean;
  declare playerID: unknown;
  declare btnKill?: MovieClip;
  constructor() {
    super();
    this.init();
  }
  init() {
    if (!this.bCreator && this.btnKill) this.btnKill._visible = false;
  }
  setPlayerName(name: unknown) {
    (this.txtName as Txt)?.setText(name, "Font3");
  }
  setPlayerGuild(guild: unknown) {
    (this.txtGuild as Txt)?.setText(guild, "Font3");
  }
  setPlayerLevel(level: unknown) {
    (this.txtLevel as Txt)?.setText(level, "Font3");
  }
  setPlayerTeam(team: unknown) {
    (this.radioTeam0 as Radio | undefined)?.select?.(false);
    (this.radioTeam1 as Radio | undefined)?.select?.(false);
    (this["radioTeam" + str(team)] as Radio | undefined)?.select?.(true);
  }
}
registerClass("TabGameJoined_Player", Class_InterfaceMultiPlayerTabGameJoined_Player);

/** `TabPlayDofus_TeamMateObject.as`: base of the team-mate cards (slide by 133 px with i² easing). */
export class Class_TabPlayDofus_TeamMateObject extends MovieClip {
  declare destX: number | undefined;
  clear() {
    delete this.destX;
  }
  move(bRight: boolean) {
    const dir = !bRight ? -1 : 1, d = 133 * dir;
    let i = 0;
    this.destX = this.destX == undefined ? this._x + d : this.destX + d;
    this.onEnterFrame = () => {
      i++;
      this._x += i * i * dir;
      if (this._x * dir > toNumber(this.destX) * dir) {
        this._x = toNumber(this.destX);
        delete this.onEnterFrame;
      }
    };
  }
}
registerClass("TabPlayDofus_TeamMateObject", Class_TabPlayDofus_TeamMateObject);

/** `TabPlayDofus_TeamMate.as`: a team-mate card (id 0 = random team-mate). initObject `{teamMateName, index, id}`. */
export class Class_TabPlayDofus_TeamMate extends Class_TabPlayDofus_TeamMateObject {
  declare id: unknown;
  declare index: number;
  declare teamMateName: unknown;
  declare bWaitingCmp: boolean;
  declare sprite: MovieClip;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.bWaitingCmp = false;
    const play = this.btnPlay as MovieClip | undefined, cancel = this.btnCancel as MovieClip | undefined;
    if (play) play._visible = false;
    if (this.id == G.DATACENTER.Player.ID) {
      if (G.DATACENTER.Game.bYouAreCreator && play) play._visible = true;
      if (cancel) cancel._visible = true;
    } else if (cancel) cancel._visible = G.DATACENTER.Game.bYouAreCreator;
    let data: Partial<Character> & { num?: unknown; name?: unknown };
    if (this.id == 0) data = { num: 0, name: getText("RANDOM") };
    else {
      data = G.DATACENTER.Characters.getItemAt(this.id as string) ?? {};
      const ex = this.txtExclam as Txt;
      if (ex) ex._visible = false;
    }
    (this.txtName as Txt)?.setText(data.name, "Font1");
    if (data.level != undefined) (this.txtLevel as Txt)?.setText(T("LEVEL") + " " + str(data.level), "Font1");
    (this.txtLP as Txt)?.setText(str(data.LP) + " " + T("LP"), "Font1"); // `settext`, SWF 6 case-insensitive
    const s = this.createEmptyMovieClip("sprite", 10);
    s._x = 25;
    s._y = 113;
    s.onInitFrame = function (this: MovieClip) {
      G.CCOLORS.addCharacter(this);
      G.CCOLORS.setColor(this._target, data.color1, data.color2, data.color3);
      G.WEAPONS.addCharacter(this);
      G.WEAPONS.setData(this._target, data as never);
    };
    s.loadMovie(str(data.file));
  }
}
registerClass("TabPlayDofus_TeamMate", Class_TabPlayDofus_TeamMate);

/** Friend list (`fArray` of `{name, id}`) of the random-game tabs. */
type Friend = { name?: unknown; id?: unknown };
/** `TabPlayDofus_TeamMateChoose.as`: friends to invite (first entry RANDOM → id 0). */
export class Class_TabPlayDofus_TeamMateChoose extends Class_TabPlayDofus_TeamMateObject {
  declare lstFriends?: ListBox;
  declare Blink?: MovieClip;
  constructor() {
    super();
    (this.txtAddTeamMate as Txt)?.setText(getText("ADD_TEAMMATE"), "Font1");
  }
  override clear() {
    super.clear();
    this._visible = false;
  }
  update(fArray: Friend[]) {
    this.Blink?.play();
    this.lstFriends?.removeAll();
    this.lstFriends?.addItem(String(getText("RANDOM")), 0); // String(undefined) is "undefined" (SWF 6 too)
    for (const f of fArray ?? []) this.lstFriends?.addItem(f.name, f.id);
    this.lstFriends?.setSelectedIndex(0);
  }
}
registerClass("TabPlayDofus_TeamMateChoose", Class_TabPlayDofus_TeamMateChoose);

/** `TabPlayDofus_TeamMateFree.as`: friends list of TabPlayDofusStart. */
export class Class_TabPlayDofus_TeamMateFree extends Class_TabPlayDofus_TeamMateObject {
  declare lstFriends?: ListBox;
  constructor() {
    super();
    (this.txtAddTeamMate as Txt)?.setText(getText("FREE_TEAMMATE"), "Font1");
  }
  override clear() {
    super.clear();
    this._visible = false;
  }
  update(fArray: Friend[]) {
    this.lstFriends?.removeAll();
    for (const f of fArray ?? []) this.lstFriends?.addItem(f.name, f.id);
    this.lstFriends?.setSelectedIndex(0);
  }
}
registerClass("TabPlayDofus_TeamMateFree", Class_TabPlayDofus_TeamMateFree);

/** `TabPlayDofus_TeamMateWaiting.as`: invited, not answered yet. */
export class Class_TabPlayDofus_TeamMateWaiting extends Class_TabPlayDofus_TeamMateObject {
  declare id: unknown;
  declare index: number;
  declare teamMateName: unknown;
  declare bWaitingCmp: boolean;
  constructor() {
    super();
    this.init();
  }
  init() {
    (this.txtWainting as Txt)?.setText(T("IN_WAINTING") + "...", "Font1");
    this.bWaitingCmp = true;
    (this.txtTeamMateName as Txt)?.setText(this.teamMateName, "Font1");
  }
}
registerClass("TabPlayDofus_TeamMateWaiting", Class_TabPlayDofus_TeamMateWaiting);

type Card = Class_TabPlayDofus_TeamMate | Class_TabPlayDofus_TeamMateWaiting;
type TabPlayDofus = MovieClip & {
  teamMateCount: number; teamMateIndex: number; teamMateArray: (Card | undefined)[]; players?: MovieClip;
  teamMateChoose?: Class_TabPlayDofus_TeamMateChoose; maskSearch?: MovieClip;
};
/** S286@1 (TabPlayDofus, team building for random games): the tab's frame-1 functions (ui.md §2.8). */
export function installTabPlayDofus(clip: MovieClip) {
  const t = clip as TabPlayDofus;
  t.onFocus = () => {
    G.AKS.Game.output = t;
    t.teamMateCount = 0;
    t.teamMateIndex = 0;
    t.teamMateArray = [];
    t.players?.removeMovieClip();
    t.createEmptyMovieClip("players", 10);
    t.teamMateChoose?.clear();
    if (!G.DATACENTER.Game.isRandom) {
      G.AKS.Game.createRandom();
      G.AKS.Account.getFriendsListForRandomGame();
    }
    if (t.maskSearch) t.maskSearch._visible = false;
  };
  t.onFriendsList = (fArray: Friend[]) => t.teamMateChoose?.update(fArray);
  t.onNewCharacter = (name: unknown, id: unknown, bInvite: boolean) => {
    const init = { _x: 13 + t.teamMateCount * 133, teamMateName: name, index: t.teamMateIndex, id };
    t.teamMateArray.push(t.players?.attachMovie(bInvite ? "TabPlayDofus_TeamMateWaiting" : "TabPlayDofus_TeamMate", "teamMate" + str(id), t.teamMateIndex * 10, init) as Card | undefined);
    if (bInvite) G.AKS.Game.invite(id as string);
    t.teamMateCount = t.teamMateCount + 1;
    t.teamMateIndex = t.teamMateIndex + 1; // `teamMateindex`, SWF 6 case-insensitive
  };
  t.onRemoveCharacter = (characID: unknown) => {
    const id = Number(characID);
    t.teamMateCount = t.teamMateCount - 1;
    let found = false, removeIndex = 0;
    t.teamMateArray.forEach((c, i) => {
      if (c?.id == id && !found) {
        c.removeMovieClip();
        found = true;
        removeIndex = i;
      } else if (found) c?.move(false);
    });
    t.teamMateArray.splice(removeIndex, 1);
    G.AKS.Account.getFriendsListForRandomGame();
  };
  t.onValidateInvitation = (characID: unknown) => {
    const name = undefined; // `DATACENTER.Chracters.getItemAt(id).name`: misspelt global → undefined (S286/DoAction:75)
    const i = t.teamMateArray.findIndex((c) => c?.bWaitingCmp && c.id == characID);
    if (i >= 0) {
      const c = t.teamMateArray[i]!, index = c.index, x = c._x;
      c.removeMovieClip();
      t.teamMateArray[i] = t.players?.attachMovie("TabPlayDofus_TeamMate", "teamMate" + str(index), index * 10, { _x: x, teamMateName: name, id: characID }) as Card | undefined;
    } else call(t, "onNewCharacter", name, characID, false);
  };
}

/** Minimal XML node shape read by the news/HTML parsers (DOM nodes in the browser; AS used `XML`). */
type XNode = { nodeType: number; nodeName: string; nextSibling: XNode | null; firstChild: XNode | null; childNodes: ArrayLike<XNode>; getAttribute?(n: string): string | null };
const xmlString = (n: XNode | null) =>
  n == null ? "null" : n.nodeType == 3 ? str((n as unknown as { nodeValue: string }).nodeValue) : typeof XMLSerializer != "undefined" ? new XMLSerializer().serializeToString(n as unknown as Node) : "";
/** `parseXHTML` of `Interface.NewsScrollerItem.as:22-43` / `Interface.HTMLViewer.as:40-61`: `<a>` become blue
 *  underlined links. NewsScroller passes a node *array* (`childNodes`): the loop then runs once on the array and
 *  appends `Array.toString()` (nodes joined by ","), so the `<a>` rewrite never applies there (ui.md §2.8). */
function parseXHTML(doc: XNode | XNode[] | null | undefined): string {
  let n: XNode | XNode[] | null | undefined = doc, out = "";
  while (n != null) {
    if (Array.isArray(n)) out += n.map(xmlString).join(",");
    else if (n.nodeType == 3 || n.nodeName !== "a") out += xmlString(n);
    else out += "<a href='" + str(n.getAttribute?.("href")) + "'><u><b><font color='#0000FF'>" + xmlString(n.firstChild) + "</font></b></u></a>";
    n = Array.isArray(n) ? undefined : n.nextSibling;
  }
  return out;
}
/** `new XML(); ignoreWhite; onLoad(success); load(file)` — the runtime has no `XML` (docs/runtime.md §5): fetch + DOMParser
 *  in the browser, `onLoad(false)` elsewhere or on any failure. */
function loadXML(file: string, onLoad: (success: boolean, doc?: XNode) => void) {
  if (typeof fetch == "undefined" || typeof DOMParser == "undefined") return onLoad(false);
  fetch(file).then((r) => (r.ok ? r.text() : Promise.reject())).then(
    (s) => onLoad(true, new DOMParser().parseFromString(s.replace(/>\s+</g, "><"), "text/xml") as unknown as XNode),
    () => onLoad(false),
  );
}

/** `Interface.NewsScroller.as`: news from `HTTP_NEWS_FILE` (lost), one item per `<news>` child, slid every NEWS_DELAY ms. */
export class Class_Interface_NewsScroller extends MovieClip {
  declare width: number;
  declare height: number;
  declare newsCount: number;
  declare currentIndex: number;
  declare currNews: number | undefined;
  declare lastID: unknown;
  declare News?: MovieClip;
  constructor() {
    super();
    this.setSize(this._width, this._height);
  }
  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this._xscale = this._yscale = 100;
    this.newsCount = 0;
  }
  loadXHML(file: string) {
    loadXML(file, (success, doc) => {
      if (success) this.parseXML(doc!); // else: trace("Impossible d'ouvir les news !!")
    });
  }
  parseXML(doc: XNode) {
    const child = doc.firstChild;
    let n = 0;
    this.newsCount = 0;
    if (child?.nodeName == "news")
      for (let c = child.firstChild; c != null; c = c.nextSibling, n++)
        this.News?.attachMovie("Interface::NewsScrollerItem", "news" + n, n, {
          newsXML: Array.from(c.childNodes), title: c.getAttribute?.("title") ?? undefined, width: this.width, height: this.height, _y: -this.height,
        });
    this.newsCount = n;
    this.slide();
  }
  slide() {
    clearInterval(this.lastID);
    this.currentIndex = 0;
    this.slideNext();
    this.lastID = setInterval(this, "slideNext", NEWS_DELAY);
  }
  slideNext() {
    this.showNews(this.currentIndex);
    this.currentIndex = this.currentIndex + 1;
    if (this.currentIndex >= this.newsCount) this.currentIndex = 0;
  }
  showNews(index: number) {
    const oldNews = "news" + str(this.currNews), newsName = "news" + index;
    this.currNews = index;
    const news = () => this.News?.[newsName] as MovieClip | undefined, old = () => this.News?.[oldNews] as MovieClip | undefined;
    if (news()) news()!._y = -this.height;
    if (old()) old()!._y = 0;
    let i = 0;
    this.onEnterFrame = () => {
      i++;
      const nw = news(), o = old();
      if (nw) nw._y += i * i;
      if (o) o._y += i * i;
      if (toNumber(nw?._y) >= 0) {
        if (nw) nw._y = 0;
        delete this.onEnterFrame;
      }
    };
  }
  clear() {
    clearInterval(this.lastID);
    delete this.onEnterFrame;
    for (const k in this.News ?? {}) call(this.News![k], "removeMovieClip");
  }
}
registerClass("Interface::NewsScroller", Class_Interface_NewsScroller);

/** `Interface.NewsScrollerItem.as` (initObject `{newsXML, title, width, height}`). */
export class Class_Interface_NewsScrollerItem extends MovieClip {
  declare newsXML: XNode[];
  declare title: unknown;
  declare width: number;
  declare height: number;
  declare txtView: Txt;
  declare txtTitle: Txt;
  constructor() {
    super();
    this.setSize(this.width, this.height);
    this.setText();
  }
  setText() {
    this.txtTitle?.setText(this.title, "Font2");
    this.txtView?.setHtmlText(parseXHTML(this.newsXML), "Font1");
  }
  setSize(w: number, h: number) {
    const v = this.txtView;
    if (!v) return;
    v._width = w;
    v._height = h - 20;
    v.html = true;
  }
}
registerClass("Interface::NewsScrollerItem", Class_Interface_NewsScrollerItem);

/** `Interface.HTMLViewer.as`: exported, never used (ui.md §2.16). */
export class Class_Interface_HTMLViewer extends MovieClip {
  declare txtView: Txt;
  declare scrollBar?: MovieClip & { setSize?(h: number): void; setScrollTarget?(t: TextField | undefined): void };
  declare deadView?: MovieClip;
  constructor() {
    super();
    this.setSize(this._width, this._height);
  }
  setSize(w: number, h: number) {
    this._xscale = this._yscale = 100;
    this.attachMovie("Ank::Dofus::ScrollBar", "scrollBar", 20, { thumbPointer: true });
    const sb = this.scrollBar, v = this.txtView;
    if (v) (v._width = w - toNumber(sb?._width)), (v._height = h), (v.html = true);
    if (sb) sb._x = w - sb._width;
    sb?.setSize?.(h);
    sb?.setScrollTarget?.(v);
    if (this.deadView) this.deadView._visible = false;
  }
  loadXHML(file: string) {
    loadXML(file, (success, doc) => (success ? this.parseXHTML(doc!) : G.INTERFACE.msgBox("Impossible d'ouvrir le fichier"))); // beta literal
  }
  parseXHTML(doc: XNode) {
    if (this.txtView) this.txtView.htmlText = parseXHTML(doc);
  }
  clear() {
    if (this.txtView) this.txtView.htmlText = "";
  }
}
registerClass("Interface::HTMLViewer", Class_Interface_HTMLViewer);

/** `Interface.MapImage.as`: map preview `HTTP_MAPS_PATH + id + ".swf"` (files/maps/ is lost). */
export class Class_Interface_MapImage extends MovieClip {
  declare image?: MovieClip;
  constructor() {
    super();
    this.init();
  }
  init() {
    (this.border as MovieClip | undefined)?.swapDepths(30);
  }
  loadMapImage(mapID: unknown) {
    this.image?.loadMovie(HTTP_MAPS_PATH + str(mapID) + ".swf");
  }
}
registerClass("Interface::MapImage", Class_Interface_MapImage);

/** `Interface.GuildsArtworkMini.as`: guild (class) icon `GUILDS_MINI_PATH + guildID + ".swf"`; initObject `{guildID}`. */
export class Class_GuildsArtworkMini extends MovieClip {
  declare guildID: unknown;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.show(this.guildID);
  }
  show(guildID: unknown) {
    this.createEmptyMovieClip("mini_mc", 10).loadMovie(GUILDS_MINI_PATH + str(guildID) + ".swf");
  }
}
registerClass("Interface::GuildsArtworkMini", Class_GuildsArtworkMini);

/** `Interface.GuildsDescriptions.as`: only placed by the dead creation screen (ui.md §2.6). */
export class Class_GuildsDescriptions extends MovieClip {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.showDescription(1);
  }
  showDescription(guildID: unknown) {
    this.createEmptyMovieClip("description_mc", 10).loadMovie(GUILDS_DESCRIPTIONS_PATH + str(guildID) + ".swf");
  }
}
registerClass("Interface::GuildsDescriptions", Class_GuildsDescriptions);

// ---- list item renderers of the lobby lists (FSelectableItemClass is B1's) --------------------------------------
type Row = ListItem & { name?: unknown; level?: unknown; gfxID?: unknown; account?: unknown; guild?: unknown; state?: unknown };
/** Label items keep the FLabel path; data items are drawn by the subclass. */
function showLabel(item: FSelectableItemClass, label: unknown) {
  if (item.fLabel_mc?.labelField.text != str(label)) item.fLabel_mc?.setLabel(label);
}
/** `FChatListItemSymbol.as`: channel user `name (level)` + guild mini icon. */
export class FChatListItemClass extends FSelectableItemClass {
  declare txtAccount: Txt;
  declare mini?: MovieClip;
  constructor() {
    super();
    this.init();
  }
  override layoutContent(width: number) {
    super.layoutContent(width);
    if (this.txtAccount) this.txtAccount.text = "";
    this.mini?.removeMovieClip();
  }
  override displayContent(itmObj: Row | undefined) {
    if (this.txtAccount) this.txtAccount.text = "";
    this.mini?.removeMovieClip();
    if (itmObj?.label != undefined) showLabel(this, itmObj.label);
    else if (itmObj?.name != undefined) {
      this.txtAccount?.setText(str(itmObj.name) + " (" + str(itmObj.level) + ")", "Font3");
      if (itmObj.gfxID != undefined) {
        const m = this.attachMovie("Interface::GuildsArtworkMini", "mini", 10, { guildID: itmObj.gfxID });
        if (m) m._x = 0;
      }
    } else this.mini?.removeMovieClip();
  }
}
registerClass("FChatListItemSymbol", FChatListItemClass);

/** `FFriendsListItemSymbol.as`: online friend `account (name)`, guild icon, level, state pictogram, remove button (B210). */
export class FFriendsListItemClass extends FSelectableItemClass {
  declare txtAccount: Txt;
  declare txtLevel: Txt;
  declare btnRemove?: MovieClip;
  declare mini?: MovieClip;
  declare picto?: MovieClip;
  declare friendAccount: unknown;
  constructor() {
    super();
    this.init();
  }
  private reset() {
    if (this.txtAccount) this.txtAccount.text = "";
    if (this.txtLevel) this.txtLevel.text = "";
    if (this.btnRemove) this.btnRemove._visible = false;
    this.mini?.removeMovieClip();
  }
  override layoutContent(width: number) {
    super.layoutContent(width);
    this.reset();
  }
  override displayContent(itmObj: Row | undefined) {
    this.reset();
    if (itmObj?.label != undefined) showLabel(this, itmObj.label);
    else if (itmObj?.account != undefined) {
      if (this.btnRemove) this.btnRemove._visible = true;
      this.txtAccount?.setText(str(itmObj.account) + " (" + str(itmObj.name) + ")", "Font3");
      this.friendAccount = itmObj.account;
      if (itmObj.guild != undefined) {
        const m = this.attachMovie("Interface::GuildsArtworkMini", "mini", 10, { guildID: itmObj.gfxID });
        if (m) m._x = 20;
      }
      this.txtLevel?.setText(itmObj.level, "Font3");
      if (itmObj.state != undefined) {
        const p = this.attachMovie("pic_" + str(itmObj.state), "picto", 20);
        if (p) p._x = 332;
      } else this.picto?.removeMovieClip();
    } else {
      this.picto?.removeMovieClip();
      this.mini?.removeMovieClip();
    }
  }
}
registerClass("FFriendsListItemSymbol", FFriendsListItemClass);

/** `FFriendsListOfflineItem.as`: offline friend account + remove button (B210). */
export class FFriendsListOfflineItemClass extends FSelectableItemClass {
  declare txtAccount: Txt;
  declare btnRemove?: MovieClip;
  declare friendAccount: unknown;
  constructor() {
    super();
    this.init();
  }
  override layoutContent(width: number) {
    super.layoutContent(width);
    if (this.txtAccount) this.txtAccount.text = "";
    if (this.btnRemove) this.btnRemove._visible = false;
  }
  override displayContent(itmObj: Row | undefined) {
    if (this.txtAccount) this.txtAccount.text = "";
    if (this.btnRemove) this.btnRemove._visible = false;
    if (itmObj?.label != undefined) showLabel(this, itmObj.label);
    else if (itmObj?.account != undefined) {
      if (this.btnRemove) this.btnRemove._visible = true;
      this.txtAccount?.setText(itmObj.account, "Font3");
      this.friendAccount = itmObj.account;
    }
  }
}
registerClass("FFriendsListOfflineItem", FFriendsListOfflineItemClass);
