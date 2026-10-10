// Timeline, clip and button scripts of the modules/Interfaces.swf symbols owned by B2, for the runtime's `scriptHook`
// (docs/runtime.md §4.6, key `<src>#<sprite>@<frame>[:<depth>:<event>]` or `<src>#btn<id>:<event>`; C merges the
// tables). Each entry cites its source under decompiled/clean/modules_Interfaces/: `S<n>` = DefineSprite_<n>…/frame_<f>/,
// `B<n>` = DefineButton2_<n>…/BUTTONCONDACTION, `<po>` = PlaceObject2_<char>_<depth> (docs/logic/ui.md §0).
// `this` is the clip for clip actions, the timeline for frame and button actions. trace() calls are dropped.
// Not ported (dead creation screen, docs/logic/ui.md §2.6): S678, S694 and B662–B711, B725 scripts.
// Importing this module registers every B2 class (side effects of the imports below).
import { Constants, CLIPS_PATH, HTTP_BUG_REPORT, HTTP_NEWS_FILE, SPELL_BOOST_BONUS } from "../../../core/constants.ts";
import { getGuildText, getText } from "../../../core/lang.ts";
import { getDescription } from "../../../core/patternDecoder.ts";
import { str, toNumber } from "../../../core/swf6.ts";
import { type DisplayObject, Mouse, MovieClip, Selection, TextField } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { type AnkPushButton, call, type CheckBox, type ColorPicker, type ComboBox, type ListBox, T } from "./as.ts";
import "./banner.ts";
import "./characters.ts";
import "./createCharacter.ts";
import "./fight.ts";
import "./inventory.ts";
import "./login.ts";
import { installTabPlayDofus } from "./multiplayer.ts";

type Script = (this: DisplayObject) => void;
type Hook = (this: MovieClip) => void;
/** Every hook of this tree, keyed like the runtime asks for them. */
export const screensScripts: Record<string, Script> = {};
const on = (keys: string | readonly string[], fn: Hook) => {
  for (const k of typeof keys === "string" ? [keys] : keys) screensScripts["modules/Interfaces.swf#" + k] = fn as Script;
};
const mc = (v: unknown) => v as MovieClip | undefined;
const txt = (v: unknown) => v as TextField | undefined;

// ---- recurring bodies --------------------------------------------------------------------------------------------
const stop: Hook = function () {
  this.stop();
};
const noop: Hook = () => {};
const hide: Hook = function () {
  this._visible = false;
};
/** `on(initialize){ name = value; … }`: component parameters, set before the component constructor runs. */
const params = (o: object): Hook => function () {
  Object.assign(this, structuredClone(o));
};
const PB = (label: string, labelClipSymbol = "FLabelSymbol") => params({ label, clickHandler: "", labelClipSymbol });
const SB = (target: string, thumbPointer: boolean) => params({ _targetInstanceName: target, horizontal: false, thumbPointer });
const LB = (extScrollBar: string, itemSymbol: string) => params({ selectMultiple: false, changeHandler: "", extScrollBar, hideBoundingBox: true, itemSymbol });
/** `onClipEvent(load){ this._xscale = this._yscale = 80; [this.setLabel(getText(key));] }` */
const scale80 = (key?: string): Hook => function () {
  this._xscale = this._yscale = 80;
  if (key) call(this, "setLabel", getText(key)); // S956/S962 spell it `setlabel` (SWF 6 case-insensitive)
};
/** ListBox `onClipEvent(load)`: register on INTERFACE.listBox_sf, optional `onDblClick`. */
const listLoad = (onDblClick?: (this: ListBox) => void): Hook => function () {
  G.INTERFACE.listBox_sf.addListener(this as never);
  G.INTERFACE.listBox_sf.applyChanges();
  if (onDblClick) this.onDblClick = onDblClick;
};
/** Chat filter checkbox `onClipEvent(load)` (S430/CK_92..104, S791/CK_145..157): tooltip, state, toggle `CHAT.setTypes`. */
const chatFilter = (n: 1 | 2 | 3 | 4): Hook => function () {
  const cb = this as CheckBox;
  cb.setToolTip(getText("CHAT_TYPE" + n));
  cb.select(G.CHAT[`bType${n}`]);
  cb.onClick = () => {
    const b = !cb.bSelected, t: [boolean?, boolean?, boolean?, boolean?] = [];
    t[n - 1] = b;
    G.CHAT.setTypes(...t);
    cb.select(b);
  };
  cb.setEnabled(true);
};
const leaveIfIn = (multi: boolean) => {
  const g = G.DATACENTER.Game;
  if ((multi ? g.isMultiplayer : g.isRandom) && g.isPlayerIn) G.AKS.Game.leave();
};
const showLayer = (tabs: unknown, name: string) => call(tabs, "showLayer", name);

// ---- stop() frames ------------------------------------------------------------------------------------------------
// S35@1, S591@1 (superTypeIcon_mc), S611@9 (AnimSelectionSymbol), S635@2 (selectedMarker), S64/79/100/107@23 (accordion),
// S271@52 (Blink), S727@5 (AnimUICreateCharacterSymbol), S744@1 (headClip), and the dead-tree S683@26, S684@1, S695@1/6, S712@6/12.
on(["35@1", "591@1", "611@9", "635@2", "64@23", "79@23", "100@23", "107@23", "271@52", "727@5", "744@1", "683@26", "684@1", "695@1", "695@6", "712@6", "712@12"], stop);

// ---- UIStartMenu (S997) -------------------------------------------------------------------------------------------
on(["997@1:23:initialize", "997@1:29:initialize", "997@1:35:initialize", "997@1:41:initialize", "997@1:47:initialize", "997@1:53:initialize"], PB(""));
// S997/569_<d> rel: the picture over each menu button forwards to that button's onRelease
for (const [d, btn] of [[5, "play_btn"], [13, "download_btn"], [15, "infos_btn"], [17, "bug_btn"], [19, "instructions_btn"], [21, "rules_btn"]] as const)
  on(`997@1:${d}:release`, function () {
    call(this._parent?.[btn], "onRelease");
  });

// ---- MenuLaunch (B134, B138) --------------------------------------------------------------------------------------
on("btn134:release", () => G.KERNEL.showMenu());
on("btn138:release", () => G.KERNEL.showSoundOptions());

// ---- Interface::Characters (S644) and ::Choice (S639, B634) ------------------------------------------------------
on("644@1:65:initialize", PB(""));
on("644@1:71:initialize", PB("C"));
on("644@1:77:initialize", PB("S"));
on("644@1:83:initialize", PB("J"));
on("644@1:65:load", scale80("BACK"));
on(["644@1:71:load", "644@1:77:load", "644@1:83:load"], scale80());
on("644@1:65:release", () => G.INTERFACE.drawMenuInterface());
on("644@1:71:release", () => G.KERNEL.CharactersManager.createNewCharacter());
on("644@1:77:release", function () {
  const p = this._parent!, data = p.selectedcharacterData as { name?: string } | undefined;
  // AS quirk kept: with nothing selected `undefined.indexOf(…)` is undefined, `!= -1` is true → this message
  if (data?.name?.indexOf("_emag") != -1) return void G.INTERFACE.msgBox("Ce personnage ne peut être supprimé."); // beta literal
  if (p.selectedcharacterID == undefined) G.INTERFACE.msgBox(getText("SELECT_CHARACTER"));
  else G.AKS.Account.deleteCharacter(str(p.selectedcharacterID));
});
on("644@1:83:release", function () {
  const id = this._parent!.selectedcharacterID;
  if (id == undefined) G.INTERFACE.msgBox(getText("SELECT_CHARACTER", []));
  else G.AKS.Account.setCharacter(id as string);
});
on("639@1:3:release", function () {
  G.AKS.Account.setCharacter(this._parent?._parent?.selectedcharacterID as string);
});
on("btn634:release", function () {
  call(this._parent, "onSelectCharacter", this.index, this._data);
});
on("btn634:rollOver", function () {
  const perso = mc(this.perso);
  if (perso?._currentframe == 2) {
    perso.playAllClip();
    perso.gotoAndStop("waitR");
  } else perso?.gotoAndPlay("init");
});
on("btn634:rollOut", function () {
  const perso = mc(this.perso);
  if (perso?._currentframe == 2) perso.stopAllClip();
});

// ---- UICreateCharacter (S141) and its accordion (S108: menu1 guild S64, menu2 sex S79, menu3 colours S100, menu4 name S107)
on("141@1:15:initialize", PB(""));
on("141@1:15:load", scale80("BACK"));
on("141@1:15:release", () => G.AKS.Account.getCharacters());

type Acc = MovieClip & { m1: number; m2: number; m3: number; m4: number; hmenu: number };
const menus = (a: MovieClip) => [1, 2, 3, 4].map((i) => mc(a[`menu${i}`])!);
on("108@1", function () {
  const a = this as Acc, [m1, m2, m3, m4] = menus(a);
  txt(m1?.guild_txt)?.setText(getText("CREATE_GUILD"), "Font1");
  txt(m2?.sex_txt)?.setText(getText("CREATE_SEX"), "Font1");
  txt(m3?.color_txt)?.setText(getText("CREATE_COLOR"), "Font1");
  txt(m4?.name_txt)?.setText(getText("CREATE_NAME"), "Font1");
  a.hmenu = 20;
  m2?.gotoAndStop(23);
  m3?.gotoAndStop(23);
  m4?.gotoAndStop(23);
  a.m1 = 1;
  a.m2 = a.m3 = a.m4 = 0;
  a.onEnterFrame = () => {
    const ms = menus(a), h = (m: MovieClip | undefined) => (a.hmenu * toNumber(mc(m?.taille)?._yscale)) / 100;
    for (let i = 1; i < 4; i++) if (ms[i]) ms[i]!._y = toNumber(ms[i - 1]?._y) + h(ms[i - 1]);
    ms.forEach((m, i) => {
      if (a[`m${i + 1}`] == 1 && m?._currentframe == 23) m.gotoAndPlay(2);
    });
    // the open menu slides menu1 (and with it the stack) to y = 0, -20, -40, -60 at 5 px per frame
    [a.m1, a.m2, a.m3, a.m4].forEach((flag, i) => {
      const y = -20 * i, m = ms[0];
      if (flag == 1 && m && m._y != y) m._y += m._y > y ? -5 : 5;
    });
  };
});
/** `on(release)` of a menu's "validate" button (S64/PB_42, S79/PB_21, S100/PB_10): tick, open menu `next`, close this one. */
const validate = (next: number): Hook => function () {
  const menu = this._parent!, a = menu._parent as Acc;
  mc(menu.coche)?.gotoAndStop(2);
  a.m1 = a.m2 = a.m3 = a.m4 = 0;
  a[`m${next}`] = 1;
  menu.gotoAndPlay(menu._currentframe + 1);
};
/** The open menu's title bar (S64/62_48, S79/62_27, S100/62_78, S107/62_16): close it. */
const closeMenu: Hook = function () {
  const menu = this._parent!, a = menu._parent as Acc;
  a.m1 = a.m2 = a.m3 = a.m4 = 0;
  menu.gotoAndPlay(15);
};
/** A closed menu's title bar (S64/62_40, S79/62_21, S100/62_10, S107/62_10): open it, close the others (menu1 needs no `verou`). */
const openMenu = (n: number, needVerou: boolean): Hook => function () {
  const menu = this._parent!, a = menu._parent as Acc;
  if (needVerou && menu.verou != 1) return;
  a.m1 = a.m2 = a.m3 = a.m4 = 0;
  a[`m${n}`] = 1;
  for (const [i, m] of menus(a).entries()) if (i + 1 != n && toNumber(m?._currentframe) <= 14) m?.gotoAndPlay(15);
  menu.gotoAndPlay(1);
};
on(["64@14:42:initialize", "79@14:21:initialize", "100@14:10:initialize"], PB("V"));
on("107@14:10:initialize", PB("C"));
on(["64@14:42:load", "79@14:21:load", "100@14:10:load"], scale80("VALIDATE"));
on("107@14:10:load", scale80("CREATE"));
on("64@14:42:release", validate(2));
on("79@14:21:release", validate(3));
on("100@14:10:release", validate(4));
on(["64@14:48:release", "79@14:27:release", "100@14:78:release", "107@14:16:release"], closeMenu);
on("64@23:40:release", openMenu(1, false));
on("79@23:21:release", openMenu(2, true));
on("100@23:10:release", openMenu(3, true));
on("107@23:10:release", openMenu(4, true));
// S64@f2..f11: guild names appear one per frame
for (let g = 1; g <= 10; g++)
  on(`64@${g + 1}`, function () {
    txt(this[`guild${g}_txt`])?.setText(getGuildText(g).sn, "Font1");
  });
on("64@14", function () {
  this.stop();
  const ui = this._parent?._parent, arrow = mc(this.arrow_mc);
  if (arrow) arrow._y = toNumber(mc(this[`g${str(ui?.guildID)}_btn`])?._y) + 9;
});
// B39..B57 (g1_btn..g10_btn, in S64): move the arrow, choose the guild
[39, 41, 43, 45, 47, 49, 51, 53, 55, 57].forEach((id, i) =>
  on(`btn${id}:release`, function () {
    const arrow = mc(this.arrow_mc);
    if (arrow) arrow._y = toNumber(mc(this[`g${i + 1}_btn`])?._y) + 9;
    call(this._parent?._parent, "chooseGuild", i + 1);
  }));
on("79@14", function () {
  this.verou = 1;
  this.stop();
  const man = this.man_pbtn as AnkPushButton | undefined, woman = this.woman_pbtn as AnkPushButton | undefined;
  const female = this._parent?._parent?.sex != 0;
  man?.select(!female);
  woman?.select(female);
  man?.addListener(this);
  woman?.addListener(this);
  man?.groupWith(woman as AnkPushButton); // the AS passes whatever it finds
  woman?.groupWith(man as AnkPushButton);
  if (man) man.unselectableItSelf = false;
  if (woman) woman.unselectableItSelf = false;
  this.onSelect = (pbtn: MovieClip) => call(this._parent?._parent, "chooseSex", pbtn._name == "man_pbtn" ? 0 : 1);
});
on("100@14", function () {
  this.verou = 1;
  this.stop();
  const colors = (this._parent?._parent?.colors ?? []) as unknown[];
  const btn = (i: number) => this[`color${i}_pbtn`] as AnkPushButton | undefined;
  for (let i = 1; i < 4; i++) btn(i)?.setColor(colors[i] as number);
  (this.colorPicker_mc as ColorPicker | undefined)?.addListener(this);
  for (const [i, a, b] of [[1, 2, 3], [2, 1, 3], [3, 1, 2]] as const) {
    btn(i)?.addListener(this);
    btn(i)?.groupWith(btn(a) as AnkPushButton);
    btn(i)?.groupWith(btn(b) as AnkPushButton);
  }
  for (let i = 1; i < 4; i++) {
    const b = btn(i);
    if (b) b.unselectableItSelf = false;
  }
  btn(1)?.select(true);
  this._selectedButton = btn(1);
  this.onSelect = (pbtn: AnkPushButton) => void (this._selectedButton = pbtn);
  this.onColorSelect = (col: number) => {
    const sel = this._selectedButton as AnkPushButton | undefined, n = Number(str(sel?._name).substring(5, 6));
    const c: unknown[] = [0, -1, -1, -1];
    c[n] = col;
    sel?.setColor(col);
    call(this._parent?._parent, "chooseColor", col, n);
    const clip = mc(mc(this.sprite_mc)?.clip_mc);
    clip?.gotoAndPlay("Init");
    G.CCOLORS.setColor(str(clip?._target), c[1], c[2], c[3]);
  };
  this.onColorChange = (col: number) => (this._selectedButton as AnkPushButton | undefined)?.setColor(col);
});
on("107@14", function () {
  this.verou = 1;
  this.stop();
  txt(this.characName_txt)?.setText(getText("CREATE_CHARACTER_NAME"), "Font1");
  Selection.setFocus("characNameValue_txt");
  const f = txt(this.characNameValue_txt);
  if (f) (f.restrict = "A-Za-z\\-"), (f.maxChars = 20);
});
on("107@14:10:release", function () {
  const menu = this._parent!;
  call(menu._parent?._parent, "createCharacter", txt(menu.characNameValue_txt)?.text);
  mc(menu.coche)?.gotoAndStop(2);
});
// S78@1: the check mark of a menu stays ticked once the menu was validated (`verou`)
on("78@1", function () {
  if (this._parent?.verou == 1) this.gotoAndStop(2);
  this.stop();
});
// S89@1: preview sprite of the chosen guild/sex/colours, weapon 10, "WaitR"
on("89@1", function () {
  const ui = this._parent?._parent?._parent, clip = this.createEmptyMovieClip("clip_mc", 10);
  clip.loadMovie(Constants.CLIPS_PERSOS_PATH + str(ui?.guildID) + str(ui?.sex) + ".swf");
  const c = (ui?.colors ?? []) as unknown[];
  G.CCOLORS.addCharacter(clip);
  G.CCOLORS.setColor(clip._target, c[1], c[2], c[3]);
  G.WEAPONS.addCharacter(clip);
  G.WEAPONS.setData(clip._target, { weaponID: 10 } as never);
  clip.onInitFrame = function (this: MovieClip) {
    this.gotoAndStop("WaitR");
  };
});
// S87@1-2 + B84: animation chooser — the dragged cursor (±30 px) picks the animation of the pos<n> it overlaps
const ANIMS = ["StaticR", "StaticL", "WaitR", "WaitL", "WalkR", "WalkL", "RunR", "RunL", "CastR", "CastL", "ShootR", "ShootL", "HitR", "HitL", "DieR", "DieL"];
on("87@1", function () {
  const cur = mc(this.curseur), clip = mc(this._parent?.clip_mc);
  ANIMS.forEach((a, i) => {
    const pos = mc(this._parent?.[`pos${i + 1}`]);
    if (cur && pos && cur.hitTest(pos)) clip?.gotoAndPlay(a);
  });
});
on("87@2", function () {
  this.gotoAndPlay(1);
});
on("btn84:press", function () {
  this.startDrag(true, -30, this._y, 30, this._y);
});
on("btn84:release", function () {
  this.stopDrag();
});
// B117..B126 (in SpellBar S128): hovering spell icon k shows GUILD_SPELLS[guild][k]; leaving it shows spell 0.
// `var gid` in a button action is a timeline variable, so rollOut reads the value the last rollOver stored.
for (let k = 0; k < 10; k++) {
  on(`btn${117 + k}:rollOver`, function () {
    this.gid = this._parent?.guildID;
    call(this._parent, "viewSpellInfos", Constants.GUILD_SPELLS[toNumber(this.gid)]?.[k]);
  });
  on([`btn${117 + k}:rollOut`, `btn${117 + k}:releaseOutside`], function () {
    call(this._parent, "viewSpellInfos", Constants.GUILD_SPELLS[toNumber(this.gid)]?.[0]);
  });
}

// ---- Interface::MultiPlayer (S430) --------------------------------------------------------------------------------
on("430@1:62:initialize", SB("txtChat", true));
on("430@1:64:initialize", SB("", true));
on("430@1:68:initialize", LB("usersScrollBar", "FChatListItemSymbol"));
on("430@1:68:load", listLoad(function () {
  const v = this.getValue();
  if (v != G.DATACENTER.Player.name) G.INTERFACE.wisperBox(v);
}));
on("430@1:80:initialize", params({ editable: true, labels: ["France", "Dofus", "Roleplay"], rowCount: 8, changeHandler: "" }));
on("430@1:80:load", function () {
  const cb = this as ComboBox;
  cb.enabledEvent = true;
  cb.setChangeHandler("eventHandler", cb);
  cb.eventHandler = () => {
    if (cb.enabledEvent) G.AKS.Channels.join(cb.getValue() as string);
  };
  cb.setSelectedIndex(0);
});
on("430@1:96:initialize", params({ bgColor: 13036799 }));
on("430@1:100:initialize", params({ bgColor: 16777215 }));
on("430@1:92:initialize", params({ bgColor: 65280 }));
on("430@1:104:initialize", params({ bgColor: 16737792 }));
on("430@1:96:load", chatFilter(1));
on("430@1:100:load", chatFilter(2));
on("430@1:92:load", chatFilter(3));
on("430@1:104:load", chatFilter(4));
on("430@1:7:initialize", PB("Envoyer")); // beta literal, overwritten by getText("SEND") at init
on(["430@1:13:initialize", "430@1:19:initialize", "430@1:25:initialize", "430@1:31:initialize"], PB(""));
on("430@1:37:initialize", PB("", "HomeSymbol"));
on("430@1:43:initialize", PB("", "HelpSymbol"));
on("430@1:7:load", scale80());
on("430@1:392:load", hide);
on("430@1:7:release", function () {
  const t = txt(this._parent?.txtConsole);
  if (t && t.text.length != 0) {
    G.AKS.Console.process(t.text);
    t.text = "";
  }
  Selection.setFocus("txtConsole");
});
on("430@1:13:release", () => {
  leaveIfIn(true);
  G.AKS.Game.createSolo();
});
on("430@1:19:release", function () {
  showLayer(this._parent?.Tabs, "TabJoinGame");
  leaveIfIn(false);
});
on("430@1:25:release", function () {
  if (!G.DATACENTER.Game.isRandom) {
    if (G.DATACENTER.Game.isPlayerIn) G.AKS.Game.leave();
    showLayer(this._parent?.Tabs, "TabPlayDofusStart");
  }
});
on("430@1:31:release", function () {
  showLayer(this._parent?.Tabs, "TabFriends");
  leaveIfIn(true);
});
on("430@1:37:release", function () {
  leaveIfIn(true);
  showLayer(this._parent?.Tabs, "TabStart");
});
on("430@1:43:release", function () {
  const p = this._parent!, help = mc(p.helpLayer);
  if (help) help._visible = true;
  G.INTERFACE.setCursor(CLIPS_PATH + "helpicon.swf");
  G.INTERFACE.cursor?.setForbidden(false); // AS bug kept: the cursor is MainLayer_mc.cursor → no-op (ui.md §2.7)
  call(help, "showLayer", call(p.Tabs, "getCurrentLayer"));
  this.onMouseUp = () => {
    G.INTERFACE.setCursor(null);
    G.INTERFACE.hideToolTip();
    if (help) help._visible = false;
    Mouse.removeListener(this);
  };
  Mouse.addListener(this);
});

// ---- Interface::MultiPlayer::Help (S429) and its hotspots (B374..B427) -------------------------------------------
on("429@1:1:rollOver", noop); // `if(false){}`: does nothing, but makes the clip a mouse target
on(["429@1:25:load", "429@1:39:load", "429@1:53:load", "429@1:77:load", "429@1:85:load"], hide);
// [button, key, x, y, bTopAlign]: rollOver → drawToolTip(getText(key), x, y, false, , , bTopAlign); rollOut → hideToolTip
const HELP: [number, string, number, number, boolean][] = [
  [374, "HELP_1", 70, 70, true], [375, "HELP_2", 220, 70, true], [376, "HELP_3", 330, 70, true], [377, "HELP_4", 440, 70, true],
  [378, "HELP_5", 581, 70, true], [379, "HELP_8", 162, 340, false], [380, "HELP_6", 420, 300, false], [381, "HELP_9", 276, 500, false],
  [382, "HELP_10", 497, 500, false], [383, "HELP_11", 572, 375, false], [384, "HELP_7", 572, 300, false],
  [385, "HELP_FRIENDS_12", 70, 180, true], [386, "HELP_FRIENDS_12B", 70, 240, true], [387, "HELP_FRIENDS_13", 235, 100, true],
  [388, "HELP_FRIENDS_14", 439, 100, true], [389, "HELP_FRIENDS_15", 500, 100, true], [390, "HELP_FRIENDS_16", 550, 100, true],
  [391, "HELP_FRIENDS_17", 550, 40, true],
  ...([[393, "HELP_JOINED_12"], [394, "HELP_JOINED_13"], [395, "HELP_JOINED_14"], [396, "HELP_JOINED_15"], [397, "HELP_JOINED_16"],
    [398, "HELP_JOINED_17"], [399, "HELP_JOINED_18"], [401, "HELP_JOIN_12"], [402, "HELP_JOIN_14"], [403, "HELP_JOIN_15"],
    [404, "HELP_JOIN_16"], [405, "HELP_JOIN_17"], [406, "HELP_JOIN_18"], [407, "HELP_JOIN_20"], [408, "HELP_JOIN_19"],
    [409, "HELP_JOIN_21"], [410, "HELP_JOIN_23"], [411, "HELP_JOIN_13"], [412, "HELP_JOIN_22"], [414, "HELP_PLAYSTART_12"],
    [415, "HELP_PLAYSTART_13"], [416, "HELP_PLAYSTART_15"], [417, "HELP_PLAYSTART_16"], [419, "HELP_PLAY_13"], [420, "HELP_PLAY_14"],
    [421, "HELP_PLAY_12"], [422, "HELP_PLAY_15"], [423, "HELP_PLAY_16"], [424, "HELP_PLAY_17"], [425, "HELP_PLAY_20"],
    [426, "HELP_PLAY_19"], [427, "HELP_PLAY_18"]] as const).map(([b, k]): [number, string, number, number, boolean] => [b, k, 70, 70, true]),
];
for (const [b, key, x, y, top] of HELP) {
  on(`btn${b}:rollOver`, () => G.INTERFACE.drawToolTip(getText(key), x, y, false, undefined, undefined, top || undefined));
  on(`btn${b}:rollOut`, () => G.INTERFACE.hideToolTip());
}

// ---- Interface::MultiPlayer::Tabs (S372): each tab hidden and labelled on load ---------------------------------------
on("372@1:4:load", function () {
  this._visible = false;
  txt(this.txtTitle)?.setText(getText("TITLE_RANDOM"), "Font2");
  const d = txt(this.txtDescription);
  if (d) d.htmlText = str(getText("DESCRIPTION_RANDOM"));
});
on("372@1:26:load", function () {
  this._visible = false;
  txt(this.txtTitle)?.setText(getText("TITLE_RANDOM"), "Font2");
});
/** `this.<field>.setText(getText(key) | text(), font[, color, size])` for each row, after hiding the tab. */
const labels = (rows: readonly (readonly [string, string | (() => string), string?, number?, number?])[], buttons: readonly (readonly [string, string])[] = []): Hook => function () {
  this._visible = false;
  for (const [f, key, font = "Font1", color, size] of rows) txt(this[f])?.setText(typeof key == "string" ? getText(key) : key(), font, color, size);
  for (const [b, key] of buttons) call(this[b], "setLabel", getText(key));
};
on("372@1:74:load", labels(
  [["txtGameNameTitle", "GAME_NAME"], ["txtPlayerCount", "PLAYER_COUNT"], ["txtPassword", "PASSWORD"], ["txtCard", "CARD"], ["txtDeltaLevel", "DELTA_LEVEL"], ["txtTurnDelay", "TURN_DELAY"]],
  [["btnPlay", "PLAY_SMALL"], ["btnCancel", "CANCEL_SMALL"]],
));
on("372@1:114:load", labels(
  [["txtAddFriend", "ADD_A_FRIEND", "Font2"], ["txtOnline", "ONLINE", "Font2"], ["txtOffline", "OFFLINE", "Font2"], ["txtCharacter", "CHARACTER"],
    ["txtAccount", "ACCOUNT"], ["txtAccountCharacter", () => T("ACCOUNT") + " (" + T("CHARACTER") + ")"], ["txtAccount2", "ACCOUNT"], ["txtLevel", "LEVEL"]],
  [["btnAddCharacter", "ADD"], ["btnAddAccount", "ADD"]],
));
on("372@1:184:load", labels(
  [["txtTitleJoin", "JOIN_GAME", "Font2", 16777215, 13], ["txtTitleCreate", "CREATE_GAME", "Font2", 16777215, 13], ["txtGameName1", "GAME_NAME"],
    ["txtGameName2", "GAME_NAME"], ["txtPassword1", "PASSWORD"], ["txtPassword2", "PASSWORD"], ["txtPlayerCount", "PLAYER_COUNT"], ["txtCard", "CARD"],
    ["txtDeltaLevel", "DELTA_LEVEL"], ["txtTurnDelay", "TURN_DELAY"]],
  [["btnCreate", "CREATE_SMALL"], ["btnJoin", "JOIN_SMALL"]],
));
on("372@1:283:load", function () {
  this._visible = false;
  G.AKS.Infos.output = this;
});

// ---- TabStart (S371) ----------------------------------------------------------------------------------------------
on("371@1", function () {
  this.onFocus = () => {
    G.AKS.Game.output = this;
    call(this.selfStats, "onSetXP", G.DATACENTER.Player.data?.XP);
    G.AKS.Infos.getGeneral();
  };
  this.onFocusFinal = () => {
    call(this.newsScroller, "loadXHML", HTTP_NEWS_FILE);
    G.AKS.Infos.getPodium();
  };
  this.onLostFocus = () => {
    call(this.podium, "clear");
    call(this.newsScroller, "clear");
  };
});

// ---- TabJoinGame (S345) -------------------------------------------------------------------------------------------
on("345@1", function () {
  this.onFocus = () => {
    G.AKS.Game.output = this;
    G.AKS.Game.getMapsList();
    G.AKS.Game.getList(2);
    for (const f of ["txtGameName", "txtGamePass2", "txtGamePass1"]) {
      const t = txt(this[f]);
      if (t) t.text = "";
    }
    for (const c of ["comboNumberPlayer", "lstDeltaLevel", "lstTimePerTurn"]) call(this[c], "setSelectedIndex", 0);
  };
});
on(["345@1:20:initialize", "345@1:77:initialize"], params({ editable: true, rowCount: 8, changeHandler: "" }));
on("345@1:32:initialize", params({ editable: true, labels: ["1 vs 1", "2 vs 2", "3 vs 3", "4 vs 4"], data: ["AA", "BB", "CC", "DD"], rowCount: 8, changeHandler: "" }));
on("345@1:46:initialize", params({ editable: true, labels: ["20 s", "30 s", "40 s"], data: [20, 30, 40], rowCount: 8, changeHandler: "" }));
on("345@1:59:initialize", params({ editable: true, labels: [1, 2, 3, 4], data: [1, 2, 3, 4], rowCount: 8, changeHandler: "" }));
on("345@1:20:load", function () {
  const cb = this as ComboBox;
  cb.setChangeHandler("eventHandler", cb);
  cb.eventHandler = () => call(cb._parent?.MapImage, "loadMapImage", cb.getSelectedItem()?.data);
  cb.setSelectedIndex(0);
});
on(["345@1:32:load", "345@1:46:load", "345@1:59:load"], function () {
  (this as ComboBox).setSelectedIndex(0);
});
on("345@1:77:load", noop); // `if(false){}`
on("345@1:71:initialize", PB("Creer")); // beta literal, overwritten at load by CREATE_SMALL (S372/345_184)
on("345@1:92:initialize", PB("Rejoindre")); // idem JOIN_SMALL
on(["345@1:71:load", "345@1:92:load"], scale80());
on("345@1:71:release", function () {
  const p = this._parent!;
  if (str(txt(p.txtGameName)?.text).length == 0) return;
  G.AKS.Game.tmpPassword = txt(p.txtGamePass2)?.text;
  G.AKS.Game.createFree(str(txt(p.txtGameName)?.text), 2, (p.comboMaps as ComboBox | undefined)?.getSelectedItem()?.data as string,
    (p.comboNumberPlayer as ComboBox | undefined)?.getSelectedItem()?.data as string, str(txt(p.txtGamePass2)?.text));
});
on("345@1:92:release", function () {
  const p = this._parent!, val = str((p.comboGames as ComboBox | undefined)?.getValue());
  let pos = val.indexOf(" (");
  if (pos == -1) pos = val.length;
  G.AKS.Game.tmpPassword = txt(p.txtGamePass)?.text; // AS bug kept: no `txtGamePass` child (txtGamePass1/2) → undefined
  G.AKS.Game.join(G.AKS.Game.STATE_FREE, val.substring(0, pos), txt(p.txtGamePass1)?.text);
});
on("btn344:release", () => G.AKS.Game.getList(2));

// ---- TabFriends (S328) --------------------------------------------------------------------------------------------
on("328@1", function () {
  this.onFocus = () => {
    G.AKS.Account.output = this;
    G.AKS.Account.getFriendsList();
  };
  this.onLostFocus = () => void (G.AKS.Account.output = undefined);
});
on(["328@1:43:initialize", "328@1:65:initialize"], SB("", true));
on("328@1:27:initialize", LB("friendsScrollBar1", "FFriendsListItemSymbol"));
on("328@1:52:initialize", LB("friendsScrollBar2", "FFriendsListOfflineItem"));
on("328@1:27:load", listLoad(function () {
  G.INTERFACE.wisperBox(this.getValue());
}));
on("328@1:52:load", listLoad());
on(["328@1:11:initialize", "328@1:21:initialize"], PB("Ajouter")); // beta literal, overwritten by getText("ADD")
on(["328@1:11:load", "328@1:21:load"], scale80());
/** S328/PB_11 (account, prefixed "*") and S328/PB_21 (character name) `on(release)`. */
const addFriend = (field: string, prefix: string): Hook => function () {
  const t = txt(this._parent?.[field]);
  if (str(t?.text).length != 0) {
    G.AKS.Account.addFriend(prefix + str(t?.text));
    G.AKS.Account.getFriendsList();
  }
  if (t) t.text = "";
};
on("328@1:11:release", addFriend("txtAccountImput", "*"));
on("328@1:21:release", addFriend("name_txt", ""));
on("btn327:release", () => G.AKS.Account.getFriendsList());
on("btn210:release", function () {
  G.AKS.Account.removeFriend("*" + str(this.friendAccount)); // B210 is the remove button of FFriendsList(Offline)Item
});

// ---- TabGameJoined (S309), TabGameJoined_Player (S880, B873) -------------------------------------------------------
on("309@1", function () {
  this.onFocus = () => {
    const players = this.createEmptyMovieClip("players", 1);
    players._x = 419;
    players._y = 36;
    G.AKS.Game.output = this;
  };
});
on("309@1:27:initialize", PB("Annuler")); // beta literal, overwritten by CANCEL_SMALL (S372/309_74)
on("309@1:3:initialize", PB("Jouer")); // idem PLAY_SMALL
on(["309@1:27:load", "309@1:3:load"], scale80());
on("309@1:27:release", () => G.AKS.Game.leave());
on("309@1:3:release", () => G.AKS.Game.start());
on(["880@1:9:initialize", "880@1:13:initialize"], params({ bgColor: 16777215 }));
on("btn873:release", function () {
  G.AKS.Game.leave(this.playerID as string); // `aks.Game` (SWF 6 case-insensitive): kick
});

// ---- TabPlayDofusStart (S263), TabPlayDofus (S286, maskSearch S285), team-mate cards (S260, S267, S273, S884, S890) ---
on("263@1", function () {
  call(this.playAlone_btn, "setLabel", getText("PLAY_DUEL"));
  call(this.makeTeam_btn, "setLabel", getText("MAKE_TEAM"));
  this.onFocus = () => {
    G.AKS.Game.output = this;
    G.AKS.Account.getFriendsListForRandomGame();
    const m = mc(this.maskSearch);
    if (m) m._visible = false;
  };
  this.onFriendsList = (fArray: unknown) => call(this.teamMateChoose, "update", fArray);
});
on("263@1:15:initialize", PB("Jouer seul")); // beta literal, overwritten by PLAY_DUEL
on("263@1:21:initialize", PB("Constituer une équipe")); // idem MAKE_TEAM
on(["263@1:15:load", "263@1:21:load"], scale80());
on("263@1:15:release", () => {
  G.AKS.Game.createRandom();
  G.AKS.Game.startSearch();
});
on("263@1:21:release", function () {
  showLayer(this._parent?._parent, "TabPlayDofus");
});
on("286@1", function () {
  installTabPlayDofus(this);
});
on("286@1:47:load", function () {
  this.swapDepths(1000);
  txt(this.txtSearch)?.setText(T("SEARCHING_RANDOM") + "...", "Font2");
  call(this.btnCancel, "setText", getText("CANCEL")); // no PushButton.setText → no-op, label stays "Annuler" (ui.md §2.8)
});
on("285@1:1:load", function () {
  this.onRollOver = () => {};
  this.useHandCursor = false;
});
on(["285@1:11:initialize", "884@1:6:initialize", "890@1:13:initialize"], PB("Annuler")); // visible beta literals
on("890@1:3:initialize", PB("Rechercher")); // visible beta literal
on("273@1:5:initialize", PB("Inviter")); // visible beta literal
on(["285@1:11:load", "884@1:6:load", "890@1:13:load", "890@1:3:load", "273@1:5:load"], scale80());
on("285@1:11:release", () => G.AKS.Game.leave());
on("884@1:6:release", function () {
  const p = this._parent!;
  G.AKS.Game.invitationUndo(p.id as string);
  call(p._parent?._parent, "onRemoveCharacter", p.id);
});
on("890@1:13:release", function () {
  G.AKS.Game.invitationUndo(this._parent?.id as string);
});
on("890@1:3:release", () => G.AKS.Game.startSearch());
on(["273@1:26:initialize", "260@1:6:initialize"], SB("", false));
on(["273@1:14:initialize", "260@1:11:initialize"], LB("ListScrollBar", "FListItemSymbol"));
on("273@1:14:load", listLoad(function () {
  if (this.getValue() != 0) G.INTERFACE.wisperBox(this.getSelectedItem()?.label);
}));
on("260@1:11:load", listLoad(function () {
  G.INTERFACE.wisperBox(this.getSelectedItem()?.label);
}));
on("273@1:5:release", function () {
  if (G.DATACENTER.Game.m_playerCount == 4) return;
  const p = this._parent!, friend = (p.lstFriends as ListBox | undefined)?.getSelectedItem();
  if (friend != undefined) {
    if (G.DATACENTER.Game.isRandom) {
      call(p._parent, "onNewCharacter", friend.label, friend.data, true);
      G.AKS.Account.getFriendsListForRandomGame();
    } else {
      showLayer(p._parent?._parent, "TabPlayDofus");
      call(G.AKS.Game.output, "onNewCharacter", friend.label, friend.data, true);
    }
  }
});
on("btn258:release", () => G.AKS.Account.getFriendsListForRandomGame());
on("267@1", function () {
  txt(this.txtEmpty)?.setText(getText("EMPTY"), "Font1");
});

// ---- Interface::Banner::Main (S791) -------------------------------------------------------------------------------
on("791@1:10:initialize", SB("txtChat", false));
on("791@1:149:initialize", params({ bgColor: 13036799 }));
on("791@1:153:initialize", params({ bgColor: 16777215 }));
on("791@1:145:initialize", params({ bgColor: 65280 }));
on("791@1:157:initialize", params({ bgColor: 16737792 }));
on("791@1:149:load", chatFilter(1));
on("791@1:153:load", chatFilter(2));
on("791@1:145:load", chatFilter(3));
on("791@1:157:load", chatFilter(4));
[17, 26, 35, 44, 53, 62, 71, 80].forEach((d, i) => on(`791@1:${d}:initialize`, params({ num: String(i + 1) }))); // us1..us8
on(["791@1:107:initialize", "791@1:114:initialize", "791@1:121:initialize", "791@1:128:initialize", "791@1:135:initialize"], params({ num: "" }));
on("btn752:release", function () {
  call(this._parent, "showPanel", "Inventory");
});
on("btn755:release", function () {
  call(this._parent, "showPanel", "Spells");
});
on("btn779:release", function () {
  call(this, "openClose"); // SmileyBar toggle
});
on("btn981:release", () => {
  if (G.DATACENTER.Game.isFight) G.AKS.Game.turnEnd();
});
// B970 (Interface::btnCC): close-combat button
on("btn970:release", () => {
  if (G.DATACENTER.Game.isFight) G.KERNEL.switchToCC(G.DATACENTER.Player.CCData);
});
on(["btn970:releaseOutside", "btn970:rollOut"], () => G.INTERFACE.hideToolTip());
on("btn970:rollOver", () => {
  if (G.DATACENTER.Game.isFight || G.INTERFACE.getSpellCursor() != undefined || G.INTERFACE.getCursor() != undefined) {
    const g = getGuildText(G.DATACENTER.Player.data?.guild).cc, cc = typeof g == "string" ? [] : g; // AS1 strings have no indexed members ("?" fallback)
    const t = T("CC_DAMAGES") + "\n" + T("DAMAGES") + " : " + getDescription("#1{~1D}#2{~2~3+}#3", cc) + " (" + str(cc[3]) + T("AP") + ")";
    G.INTERFACE.drawToolTip(t, 10, -10, true);
  }
});
on("btn923:release", () => G.AKS.Game.turnEnd()); // Interface::NextTurn

// ---- Banner panels: Spells (S858, B827..B844), Inventory (S602 buttons, S598 InventoryViewer, S594), PlayerInfos (S505)
on("858@1:49:initialize", PB("Boost")); // beta literal, overwritten by getText("BOOST") in initBoost
on("858@1:49:load", scale80());
on("858@1:49:release", function () {
  const panel = this._parent!, spell = call(mc(panel.sBoost)?.container, "getData") as { m_ID?: unknown; m_Level?: unknown } | null | undefined;
  if (spell?.m_ID != undefined) {
    if (G.DATACENTER.Game.isRunning) return void G.INTERFACE.msgBox(getText("CANT_BOOST_IN_GAME"));
    if (toNumber(G.DATACENTER.Player.data?.bonusPoints) < toNumber(SPELL_BOOST_BONUS[toNumber(spell.m_Level)])) G.INTERFACE.msgBox(getText("NOT_ENOUGTH_BONUSPOINTS"));
    else {
      G.AKS.Spells.boost(spell.m_ID as string);
      call(panel, "initBoost");
    }
  }
});
on(["858@1:57:load", "858@1:361:load", "858@1:665:load", "858@1:969:load"], hide); // tabWater/Fire/Earth/Air
for (const [b, tab] of [[844, "Water"], [827, "Fire"], [830, "Earth"], [831, "Air"], [833, "Guild"]] as const)
  on(`btn${b}:release`, function () {
    call(this._parent, "showTab", tab);
  });
/** B835 / B839: slide the element tab's spellGrid by 10 px per frame to x = -333 / -225. */
const slideGrid = (destX: number, dir: number): Hook => function () {
  const g = mc(this.spellGrid);
  if (!g) return;
  g.onEnterFrame = () => {
    g._x += 10 * dir;
    if (dir < 0 ? g._x < destX : g._x > destX) {
      g._x = destX;
      delete g.onEnterFrame;
    }
  };
};
on("btn835:release", slideGrid(-333, -1));
on("btn839:release", slideGrid(-225, 1));
on("btn494:release", function () {
  call(this._parent?._parent, "hidePanel"); // ButtonClose of the Inventory / Spells / PlayerInfos panels
});
// B519..B551 (btn6..btn15 of S602): spend one bonus point on characteristic N
for (const [b, n] of [[519, 6], [521, 7], [523, 8], [525, 9], [527, 10], [551, 11], [529, 12], [531, 13], [533, 14], [535, 15]] as const)
  on(`btn${b}:release`, function () {
    if (G.DATACENTER.Player.canBoost(1)) {
      G.AKS.Account.boost(n);
      const btn = mc(this[`btn${n}`]);
      if (btn) btn._visible = false;
    }
  });
on("btn556:release", function () {
  call(this.inventoryScroller_mc, "move", true);
});
on("btn557:release", function () {
  call(this.inventoryScroller_mc, "move", false);
});
// S598 equipment slots (`_superType`, `_positionID`) and filter buttons (`m_Params`)
for (const [d, st, pos] of [[41, 1, 0], [61, 2, 1], [51, 3, 2], [11, 4, 3], [31, 3, 4], [21, 5, 5]] as const)
  on(`598@1:${d}:initialize`, params({ _superType: st, _positionID: pos }));
for (const [d, p] of [[71, [2]], [75, [5]], [79, [4]], [83, [3, 1]], [87, [6, 7]]] as const) on(`598@1:${d}:initialize`, params({ m_Params: p }));
on("594@1:3:initialize", SB("description_txt", false));
on("505@1:21:initialize", LB("usersScrollBar", "FListItemSymbol"));
on("505@1:21:load", hide);

// ---- Game results (S956, S962, rows S942/S948) ---------------------------------------------------------------------
on(["956@1:11:initialize", "956@1:17:initialize", "962@1:11:initialize"], PB(""));
on(["956@1:11:load", "962@1:11:load"], scale80("LEAVE"));
on("956@1:17:load", scale80("GUIFTS"));
on(["956@1:11:release", "962@1:11:release"], () => {
  G.AKS.Game.leave();
  G.KERNEL.changeToMultiplayer();
});
on("956@1:17:release", () => {
  G.AKS.Game.leave();
  G.AKS.Game.CreateSolo();
});
on(["942@1", "948@1"], function () {
  const me = mc(this.clipMe);
  if (!this.bMe && me) me._visible = false;
});

// ---- Interface::BugReport (B933) -------------------------------------------------------------------------------------
// Posts login, plain password, character id and the log tail to HTTP_BUG_REPORT (ui.md §2.15). getURL is not supported
// by the runtime (docs/runtime.md §5), so the post itself is a no-op here.
on("btn933:release", () => {
  const d = G.DOFUS?.debug as MovieClip | undefined;
  if (!d) return;
  d.login = G.DATACENTER.Player.login;
  d.pass = G.DATACENTER.Player.password;
  d.cid = G.DATACENTER.Player.ID;
  const log = str(d.log), len = log.length;
  d.log = log.substring(len - 2000, len);
  call(d, "getURL", HTTP_BUG_REPORT, "_blank", "POST");
});
