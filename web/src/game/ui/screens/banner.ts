// In-game banner of modules/Interfaces.swf (`Interface::Banner` and its panels, spell slots and containers).
// Each class keeps its AS1 constructor name; sources under decompiled/clean/modules_Interfaces/ (docs/logic/ui.md §2.10-2.12).
import type { Character, Spell } from "../../../core/datacenter/index.ts";
import { str, toNumber } from "../../../core/swf6.ts";
import { Mouse, MovieClip, registerClass, Selection } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { asCursor, asListener, call, T, type ListBox, type ProgressBar, type PushButton, type Txt } from "./as.ts";
import type { Class_Interface_Chrono, Class_Interface_PlayerCircle, Class_Interface_Timeline, Class_InterfaceActionPoints, Class_InterfaceBannerHeart } from "./fight.ts";

// `INTERFACE.draw(symbol)` stores the clip as `INTERFACE["UI" + symbol without ":"]` (Dofus.Interface.as:42).
declare module "../interface.ts" {
  interface Interface { UIInterfaceBanner?: Class_InterfaceBanner }
}

type SpellList = "SpellsAir" | "SpellsWater" | "SpellsEarth" | "SpellsFire";
type Panel = MovieClip & { setParams?(params: unknown): void; onLostFocus?(): void };

/** `Interface.Banner.as`: `INTERFACE.draw("Interface::Banner", 200)` from `KERNEL.drawPlayerInterface`. */
export class Class_InterfaceBanner extends MovieClip {
  declare PANEL_Y_TRUE: number;
  declare PANEL_Y_FALSE: number;
  declare extraPanels: MovieClip;
  declare panels: MovieClip & { Inventory?: Panel; Spells?: Class_InterfaceBannerPanelSpells; PlayerInfos?: Panel };
  declare banner: Class_InterfaceBannerMain;
  declare extraPanelDepth: number;
  declare data: Character | undefined;
  declare currentPanel: string | undefined;
  /** Assigned by `KERNEL.drawPlayerInterface` (`AKSClient/Dofus.Kernel.as:84-97`). */
  declare onAddUsedSpell: ((oldPos: unknown, spell: Spell) => void) | null;
  declare onWantBootSpell?: (spell: Spell) => void;
  constructor() {
    super();
    this.PANEL_Y_TRUE = 432;
    this.PANEL_Y_FALSE = 1000;
    this.init();
  }
  init() {
    this.createEmptyMovieClip("extraPanels", 100);
    const panels = this.createEmptyMovieClip("panels", 200);
    this.attachMovie("Interface::Banner::Main", "banner", 300, { _x: 366, _y: 419 });
    panels.attachMovie("Interface::Banner::Panel::Inventory", "Inventory", 100, { _x: 732, _y: this.PANEL_Y_FALSE });
    panels.attachMovie("Interface::Banner::Panel::Spells", "Spells", 200, { _x: 732, _y: this.PANEL_Y_FALSE });
    panels.attachMovie("Interface::Banner::Panel::PlayerInfos", "PlayerInfos", 300, { _x: 732, _y: this.PANEL_Y_FALSE });
    G.AKS.Chat.output = this.banner;
    G.AKS.Game.output = this;
    this.extraPanelDepth = 0;
    this.data = G.DATACENTER.Characters.getItemAt(G.DATACENTER.Player.ID ?? NaN);
    this.onSetLP(this.data?.LP, this.data?.LPmax);
    this.onSetAP(this.data?.AP);
    this.onEnterFrame = () => {
      this.updateSpells();
      delete this.onEnterFrame;
    };
    // `INTERFACE.addToListner(this)` (Banner.as:33): misspelt, resolves to nothing → no-op (ui.md §6.2).
    G.DATACENTER.Player.data?.addListener(asListener(this));
  }
  updateSpells() {
    const p = G.DATACENTER.Player, ps = this.panels.Spells;
    for (const el of ["Air", "Water", "Earth", "Fire"]) {
      const d = p[("Spells" + el) as SpellList], grid = (ps?.[`tab${el}`] as MovieClip | undefined)?.spellGrid as MovieClip | undefined;
      d.forEach((spell, i) => call((grid?.[`s${i + 1}`] as MovieClip | undefined)?.container, "setItem", spell));
    }
    const guild = ps?.tabGuild;
    p.SpellsGuild.forEach((spell, i) => call((guild?.[`s${i + 1}`] as MovieClip | undefined)?.container, "setItem", spell));
    const len = p.SpellsUsed.getLength();
    for (let i = 0; i < len; i++) call((this.banner?.[`us${i}`] as MovieClip | undefined)?.container, "setItem", p.SpellsUsed.getItemAt(i));
  }
  showPanel(panelName: string, params?: unknown) {
    if (this.currentPanel != panelName) {
      this.hidePanel();
      const panel = this.panels[panelName] as Panel | undefined;
      if (panel) panel._y = this.PANEL_Y_TRUE;
      panel?.setParams?.(params);
      G.BATTLEFIELD.Interaction.hideInteractions(true);
      this.currentPanel = panelName;
      Mouse.addListener(asListener(this));
      this.onMouseUp = () => {
        if (!this.hitTest(this._root._xmouse, this._root._ymouse, true)) {
          this.hidePanel();
          Mouse.removeListener(this);
          delete this.onMouseUp;
        }
      };
    } else this.hidePanel();
  }
  hidePanel() {
    delete this.onMouseUp;
    Mouse.removeListener(this);
    G.BATTLEFIELD.Interaction.hideInteractions(false);
    G.KERNEL.cleanUpGameArea();
    const panel = this.panels[str(this.currentPanel)] as Panel | undefined;
    panel?.onLostFocus?.();
    if (panel) panel._y = this.PANEL_Y_FALSE;
    delete this.currentPanel;
  }
  showExtraPanel(panelName: string) {
    G.BATTLEFIELD.Interaction.hideInteractions(true);
    G.INTERFACE.hideMessageNextTurn();
    this.extraPanels.attachMovie("Interface::Banner::Panel::" + panelName, panelName, this.extraPanelDepth, { _x: 742, _y: 432 });
    this.extraPanelDepth = this.extraPanelDepth + 1;
  }
  hideExtraPanel(panelName: string) {
    G.BATTLEFIELD.Interaction.hideInteractions(false);
    (this.extraPanels[panelName] as MovieClip | undefined)?.removeMovieClip();
    this.extraPanelDepth--;
  }
  getCurrentPanel() {
    return this.currentPanel;
  }
  onSetLP(value: unknown, max: unknown) {
    this.banner?.Heart?.setLifePoints(value, max); // `setlifePoints` (Banner.as:136), SWF 6 case-insensitive
  }
  onSetAP(value: unknown) {
    this.banner?.ActionPoints?.setActionPoints(value);
  }
  updateTimer() {
    this.banner?.chrono?.updateTimer();
  }
  startTimer(t: number) {
    if (G.DATACENTER.Player.isCurrentPlayer) this.banner?.chrono?.startTimer(t);
    else this.banner?.timeline?.chrono?.startTimer(t);
  }
  stopTimer() {
    this.banner?.chrono?.stopTimer();
    this.banner?.timeline?.chrono?.stopTimer();
  }
  activateTimeline(bool: boolean) {
    this.banner?.timeline?.activate(bool);
  }
  nextTurnTimeline(characID: unknown) {
    this.banner?.timeline?.nextTurn(characID);
  }
  removePlayerTimeline(characID: unknown) {
    this.banner?.timeline?.removePlayer(characID);
  }
  setPlayerHeadAnim(anim: string) {
    this.banner?.PlayerHead?.setAnim(anim);
  }
  showNextSpellTab() {
    this.panels.Spells?.showNextTab();
  }
}
Class_InterfaceBanner.prototype.onAddUsedSpell = null;
registerClass("Interface::Banner", Class_InterfaceBanner);

/** `Interface.Banner.Main.as` (sprite 791): chat, spell slots, and in fight the next-turn button, heart, AP, CC button. */
export class Class_InterfaceBannerMain extends MovieClip {
  declare timeline?: Class_Interface_Timeline;
  declare chrono?: Class_Interface_Chrono;
  declare PlayerHead?: Class_Interface_PlayerCircle;
  declare Heart?: Class_InterfaceBannerHeart;
  declare ActionPoints?: Class_InterfaceActionPoints;
  declare txtChat: Txt;
  declare txtConsole: Txt;
  constructor() {
    super();
    this.init();
  }
  init() {
    if (G.DATACENTER.Game.isFight) {
      this.attachMovie("BtnNextTurnBanner", "btnNextTurnBanner", 100, { _x: 0, _y: 18 });
      this.attachMovie("Interface::Heart", "Heart", 200, { _x: -13, _y: 6 });
      this.attachMovie("Interface::ActionPoints", "ActionPoints", 300, { _x: 32, _y: 6 });
      this.attachMovie("Interface::BtnCC", "BtnCC", 400, { _x: 120, _y: 61 }); // exported as `Interface::btnCC`
    }
    G.CHAT.clear();
    Selection.setFocus("consoleContent");
  }
}
registerClass("Interface::Banner::Main", Class_InterfaceBannerMain);

type Holder = { position?: string; lastHolder?: unknown; iconFile?: string };
/** `Interface.Banner.Container.as`: a drop slot showing `itemData.iconFile` scaled into its bounds. */
export class Class_InterfaceBannerContainer extends MovieClip {
  declare saveWidth: number;
  declare saveHeight: number;
  declare margin: number;
  declare data: (Spell & Holder) | null | undefined;
  declare saveData: (Spell & Holder) | null | undefined;
  declare depth: number;
  declare selectClip: string;
  declare item?: MovieClip;
  declare selection?: MovieClip;
  constructor() {
    super();
    this.init();
  }
  init() {
    const b = this.getBounds();
    this.saveWidth = 2 * b.xMin + b.xMax;
    this.saveHeight = 2 * b.yMin + b.yMax;
    this.margin = 0;
    this.data = null;
    this.depth = 10;
    this.selectClip = "SquareSelectItem";
    this.trackAsMenu = true;
  }
  setItem(itemData?: (Spell & Holder) | null) {
    this.saveData = this.data;
    this.data = itemData;
    if (itemData) Object.assign(itemData, { position: this._name });
    if (itemData != null) {
      this.useHandCursor = true;
      itemData.lastHolder = this;
      this.item?.removeMovieClip();
      const item = this.createEmptyMovieClip("item", 10);
      item.onInitFrame = function (this: MovieClip) {
        const c = this._parent as Class_InterfaceBannerContainer;
        if (this._width > this._height) {
          this._height = (this._height * (c.saveWidth - c.margin)) / this._width;
          this._width = c.saveWidth - c.margin;
        } else {
          this._width = (this._width * (c.saveHeight - c.margin)) / this._height;
          this._height = c.saveHeight - c.margin;
        }
        const b = this.getBounds(c);
        this._x = (c.saveWidth - this._width) / 2 - b.xMin;
        this._y = (c.saveHeight - this._height) / 2 - b.yMin;
        if (c.saveData != null) c.onRemoveItem(c.saveData);
        c.onSetItem(c.data);
      };
      item.loadMovie(str(itemData.iconFile));
    } else {
      this.useHandCursor = false;
      this.item?.removeMovieClip();
      if (this.saveData != null) this.onRemoveItem(this.saveData);
    }
    return this.saveData;
  }
  getItem() {
    return this.item;
  }
  getData() {
    return this.data;
  }
  isEmpty() {
    return this.data == null;
  }
  setSelectClip(_selectClip: string) {
    this.selectClip = "InterfacePlayerItemsInventorySquareSelect"; // ignores its argument (Container.as:83-86)
  }
  select(bool?: boolean, text?: string) {
    if (G.BATTLEFIELD.Interaction.getType() != 4) {
      if (bool == undefined) bool = !this.selection;
      if (bool) {
        this.attachMovie(this.selectClip, "selection", 2000);
        if (text != undefined) G.INTERFACE.drawToolTip(text, 10, -10, true);
      } else {
        this.selection?.removeMovieClip();
        G.INTERFACE.hideToolTip();
      }
    }
  }
  onSetItem(itemData: unknown) {
    call(this._parent?._parent?._parent, "onSetItem", itemData);
  }
  onRemoveItem(itemData: unknown) {
    call(this._parent?._parent?._parent, "onRemoveItem", itemData);
  }
}
registerClass("Interface::Banner::Container", Class_InterfaceBannerContainer);

const bannerOf = (c: MovieClip) => c._parent?._parent?._parent as Class_InterfaceBanner | undefined;

/** `Interface.ButtonSpellBanner.as`: banner slots us1..us8 (tooltip, drag from the Spells panel, launch). */
export class Class_InterfaceButtonSpellBanner extends MovieClip {
  declare num: string; // on(initialize) param
  declare justDrop: boolean;
  declare txtNum: Txt;
  declare container: Class_InterfaceBannerContainer;
  constructor() {
    super();
    this.init();
  }
  init() {
    this.justDrop = false;
    if (this.txtNum) this.txtNum.text = str(this.num);
    const c = this.container;
    if (!c) return;
    c.onRollOver = c.onDragOver = () => {
      if (c.isEmpty() == true || G.INTERFACE.getSpellCursor() != undefined || G.INTERFACE.getCursor() != undefined) c.select(true);
      else c.select(true, str(c.data?.m_Name) + " (" + str(c.data?.m_APCost) + " " + T("AP") + ")");
    };
    c.onRollOut = c.onDragOut = () => c.select(false);
    c.onPress = () => {
      if (bannerOf(c)?.getCurrentPanel() == "Spells" && c.isEmpty() == false) {
        G.INTERFACE.setSpellCursor(asCursor(c.data));
        c.onMouseUp = () => {
          G.INTERFACE.setSpellCursor(null);
          delete c.onMouseUp;
        };
        Mouse.addListener(c);
      }
    };
    c.onRelease = () => {
      c.select(false);
      const banner = bannerOf(c);
      if (banner?.getCurrentPanel() == "Spells") {
        if (G.INTERFACE.lastSpellcursorData != null) {
          const old = c.getData();
          if (old != null) old.m_Position = null;
          c.setItem(G.INTERFACE.lastSpellcursorData as unknown as Spell);
          G.INTERFACE.lastSpellcursorData = null;
          const prev = c.data?.m_Position == null ? undefined : c.data.m_Position;
          if (c.data) c.data.m_Position = Number(c._parent!._name.substr(2)); // AS stores the string "N" of "usN"
          banner.onAddUsedSpell?.(prev, c.data as Spell);
          G.INTERFACE.setSpellCursor(null);
        }
      } else if (!c.isEmpty()) G.KERNEL.switchToSpellLaunch(c.data as Spell);
    };
  }
}
registerClass("Interface::ButtonSpellBanner", Class_InterfaceButtonSpellBanner);

/** `Interface.ButtonSpellBannerObject.as`: the five object slots, an empty class in this beta. */
export class Class_InterfaceButtonSpellObject extends MovieClip {}
registerClass("Interface::ButtonSpellBannerObject", Class_InterfaceButtonSpellObject);

/** `Interface.ButtonSpellPanel.as`: a spell cell of the Spells panel (hover → infos, press → drag). */
export class Class_InterfaceButtonSpellPanel extends MovieClip {
  declare container: Class_InterfaceBannerContainer;
  constructor() {
    super();
    this.init();
  }
  init() {
    const c = this.container;
    if (!c) return;
    const infos = () => (c._parent?._parent?._parent as MovieClip | undefined)?.Infos_mc as Class_InterfaceBannerPanelSpellsInfos | undefined;
    c.onRollOver = c.onDragOver = () => {
      c.select(true);
      if (c.isEmpty() == false) {
        const i = infos();
        if (i) i._y = -258.7;
        i?.setSpellInfos(c.data as Spell);
      }
    };
    c.onRollOut = c.onDragOut = c.onReleaseOutside = () => {
      c.select(false);
      const i = infos();
      if (i) i._y = -88.7;
    };
    c.onPress = () => {
      if (c.isEmpty() == false) {
        G.INTERFACE.setSpellCursor(asCursor(c.data));
        c.onMouseUp = () => {
          G.INTERFACE.setSpellCursor(null);
          delete c.onMouseUp;
        };
        Mouse.addListener(c);
      }
    };
  }
}
registerClass("Interface::ButtonSpellPanel", Class_InterfaceButtonSpellPanel);

/** `Interface.ButtonSpellPanelBoost.as`: drop a spell here to ask its next-level infos. */
export class Class_InterfaceButtonSpellPanelBoost extends MovieClip {
  declare container: Class_InterfaceBannerContainer;
  constructor() {
    super();
    this.init();
  }
  init() {
    const c = this.container;
    if (!c) return;
    c.onRollOver = c.onDragOver = () => c.select(true);
    c.onRollOut = c.onDragOut = c.onReleaseOutside = () => c.select(false);
    c.onRelease = () => {
      c.select(false);
      if (G.INTERFACE.lastSpellcursorData != null) {
        c.setItem(G.INTERFACE.lastSpellcursorData as unknown as Spell);
        G.INTERFACE.lastSpellcursorData = null;
        G.AKS.Spells.output = c._parent?._parent;
        (c._parent?._parent?._parent?._parent as Class_InterfaceBanner | undefined)?.onWantBootSpell?.(c.data as Spell);
      } else call(c._parent?._parent, "initBoost");
    };
  }
}
registerClass("Interface::ButtonSpellPanelBoost", Class_InterfaceButtonSpellPanelBoost);

type Tab = MovieClip & { txtTitle: Txt; spellGrid?: MovieClip };
/** `Interface.Banner.Panel.Spells.as` (sprite 858): guild + 4 element tabs, boost slot. */
export class Class_InterfaceBannerPanelSpells extends MovieClip {
  declare tabList: string[];
  declare currentTab: string;
  declare txtWater: Txt;
  declare txtFire: Txt;
  declare txtEarth: Txt;
  declare txtAir: Txt;
  declare txtGuild: Txt;
  declare txtBonus: Txt;
  declare txtDrag: Txt;
  declare txtBonusValue: Txt;
  declare txtCost: Txt;
  declare tabWater?: Tab;
  declare tabFire?: Tab;
  declare tabEarth?: Tab;
  declare tabAir?: Tab;
  declare tabGuild?: Tab;
  declare sBoost?: Class_InterfaceButtonSpellPanelBoost;
  declare btnBoost?: PushButton;
  declare BoostInfos_mc?: Class_InterfaceBannerPanelSpellsBoostInfos;
  declare Infos_mc?: Class_InterfaceBannerPanelSpellsInfos;
  constructor() {
    super();
    this.tabList = ["Guild", "Water", "Fire", "Earth", "Air"];
    this.init();
  }
  init() {
    this.initBoost();
    this.currentTab = "Guild";
    this.txtWater?.setText(T("SPELL_TAB_WATER"), "Font2");
    this.txtFire?.setText(T("SPELL_TAB_FIRE"), "Font2");
    this.txtEarth?.setText(T("SPELL_TAB_EARTH"), "Font2");
    this.txtAir?.setText(T("SPELL_TAB_AIR"), "Font2");
    this.txtGuild?.setText(T("SPELL_TAB_GUILD"), "Font2");
    this.tabWater?.txtTitle?.setText(T("SPELL_TAB_WATER_TITLE"), "Font2");
    this.tabFire?.txtTitle?.setText(T("SPELL_TAB_FIRE_TITLE"));
    this.tabEarth?.txtTitle?.setText(T("SPELL_TAB_EARTH_TITLE"), "Font2");
    this.tabAir?.txtTitle?.setText(T("SPELL_TAB_AIR_TITLE"), "Font2");
    this.tabGuild?.txtTitle?.setText(T("SPELL_TAB_GUILD_TITLE"), "Font2");
    this.txtBonus?.setText(T("BONUS"), "Font2");
    this.txtDrag?.setText(T("PLACE_SPELL_HERE"), "Font1");
    this.onSetBonus(G.DATACENTER.Player.data?.bonusPoints);
    G.INTERFACE.addToListener(this); // no-op: listenersArray is never initialised (ui.md §1.4)
    G.DATACENTER.Player.data?.addListener(asListener(this));
  }
  onSetBonus(value: unknown) {
    this.txtBonusValue?.setText(value, "Font2");
  }
  showTab(tabName: string) {
    const old = this[`tab${this.currentTab}`] as MovieClip | undefined, tab = this[`tab${tabName}`] as MovieClip | undefined;
    if (old) old._visible = false;
    if (tab) tab._visible = true;
    this.currentTab = tabName;
  }
  showNextTab() {
    let i = this.tabList.indexOf(this.currentTab) + 1;
    if (i > 4) i = 0;
    this.showTab(this.tabList[i]!);
  }
  initBoost() {
    this.sBoost?.container?.setItem();
    this.btnBoost?.setLabel(T("BOOST"));
    if (this.txtCost) this.txtCost.text = "";
    if (this.BoostInfos_mc) this.BoostInfos_mc._y = -88.7;
  }
  onLostFocus() {
    this.initBoost();
  }
}
registerClass("Interface::Banner::Panel::Spells", Class_InterfaceBannerPanelSpells);

/** `Interface.Banner.Panel.Spells.Infos.as` */
export class Class_InterfaceBannerPanelSpellsInfos extends MovieClip {
  declare txtName: Txt;
  declare txtLevel: Txt;
  declare txtAPCost: Txt;
  declare txtRange: Txt;
  declare txtDescription: Txt;
  setSpellInfos(s: Spell) {
    this.txtName?.setText(s.m_Name, "Font2");
    this.txtLevel?.setText(T("LEVEL") + " " + str(s.m_Level), "Font2");
    this.txtAPCost?.setText(T("ACTION_POINTS") + " " + str(s.m_APCost) + " " + T("AP"), "Font1");
    this.txtRange?.setText(T("RANGEFULL") + " " + str(s.m_Range) + " " + T("RANGE"), "Font1");
    if (this.txtDescription) this.txtDescription.text = str(s.m_Description) + "\n" + str(s.m_DescriptionNormalHit);
    const icon = this.createEmptyMovieClip("icon", 1);
    icon._x = -109;
    icon._y = -80;
    icon.loadMovie(s.iconFile);
  }
}
registerClass("Interface::Banner::Panel::Spells::Infos", Class_InterfaceBannerPanelSpellsInfos);

/** `Interface.Banner.Panel.Spells.BoostInfos.as`: old vs next level, filled by `AKS.Spells.onInfos`. */
export class Class_InterfaceBannerPanelSpellsBoostInfos extends MovieClip {
  declare txtCharacteristics: Txt;
  declare txtName: Txt;
  declare txtOldLevel: Txt;
  declare txtOldAPCost: Txt;
  declare txtOldRange: Txt;
  declare txtOldNormHit: Txt;
  declare txtLevel: Txt;
  declare txtAPCost: Txt;
  declare txtRange: Txt;
  declare txtNormHit: Txt;
  constructor() {
    super();
    if (this.txtCharacteristics) this.txtCharacteristics.text = T("NEW_CHARACTERISTICS");
  }
  setSpellInfos(old: Spell, s: Spell) {
    this.txtName?.setText(s.m_Name, "Font2");
    this.txtCharacteristics?.setText(T("NEW_CHARACTERISTICS"), "Font2"); // `txtCHaracteristics`, SWF 6 case-insensitive
    this.txtOldLevel?.setText(T("LEVEL") + " " + str(old.m_Level), "Font2");
    this.txtOldAPCost?.setText(str(old.m_APCost) + " " + T("AP"), "Font2");
    this.txtOldRange?.setText(str(old.m_Range) + " " + T("RANGE"), "Font2"); // getText("Range") ≡ "RANGE"
    this.txtOldNormHit?.setText(old.m_DescriptionNormalHit, "Font2");
    this.txtLevel?.setText(T("LEVEL") + " " + str(s.m_Level), "Font2");
    this.txtAPCost?.setText(str(s.m_APCost) + " " + T("AP"), "Font2");
    this.txtRange?.setText(str(s.m_Range) + " " + T("RANGE"), "Font2");
    this.txtNormHit?.setText(s.m_DescriptionNormalHit, "Font2");
    const icon = this.createEmptyMovieClip("icon", 1);
    icon._x = -109;
    icon._y = -80;
    icon.loadMovie(s.iconFile);
  }
}
registerClass("Interface::Banner::Panel::Spells::BoostInfos", Class_InterfaceBannerPanelSpellsBoostInfos);

/** XP bar fraction shared by Inventory/PlayerInfos/SelfStats: `(XP - XPlow) / (XPhigh - XPlow)` of `Player.data`. */
export function updateXP(bar: ProgressBar | undefined, value: unknown) {
  const d = G.DATACENTER.Player.data;
  bar?.update(toNumber(value) - toNumber(d?.XPlow), toNumber(d?.XPhigh) - toNumber(d?.XPlow));
}
/** Attach `Interface::ProgressBar` over the `progressBarGuid_mc` placeholder (Inventory.as:26-27, PlayerInfos.as:14-15). */
function xpBar(mc: MovieClip) {
  const g = mc.progressBarGuid_mc as MovieClip | undefined, bar = mc.attachMovie("Interface::ProgressBar", "XPProgressbar", 10) as ProgressBar | undefined;
  bar?.init(toNumber(g?._width), toNumber(g?._height), toNumber(g?._width) / 2 + toNumber(g?._x), toNumber(g?._y));
}

const STATS = [
  // [text field, getText key, font], Inventory.as:10-25
  ["txtXP", "EXPERIMENT", "Font2"], ["txtCharacteristics", "CHARACTERISTICS", "Font2"], ["txtLP", "LIFEPOINTS", "Font2"],
  ["txtAP", "ACTIONPOINTS", "Font2"], ["txtResistances", "RESISTANCES", "Font2"], ["txtFire", "FIRE", "Font1"],
  ["txtAir", "AIR", "Font1"], ["txtWater", "WATER", "Font1"], ["txtEarth", "EARTH", "Font1"], ["txtForce", "FORCE", "Font1"],
  ["txtVitality", "VITALITY", "Font1"], ["txtCharism", "CHARISM", "Font1"], ["txtKarma", "KARMA", "Font1"],
  ["txtAgility", "AGILITY", "Font1"], ["txtIntelligence", "INTELLIGENCE", "Font1"], ["txtBonus", "BONUS", "Font2"],
] as const;
// [listener, value field, character field, boost button], Inventory.as:34-43,74-123
const BOOSTS = [
  ["onSetAir", "txtAirValue", "rAir", "btn7"], ["onSetFire", "txtFireValue", "rFire", "btn6"], ["onSetWater", "txtWaterValue", "rWater", "btn8"],
  ["onSetEarth", "txtEarthValue", "rEarth", "btn9"], ["onSetForce", "txtForceValue", "force", "btn10"],
  ["onSetVitality", "txtVitalityValue", "vitality", "btn11"], ["onSetCharism", "txtCharismValue", "charism", "btn12"],
  ["onSetKarma", "txtKarmaValue", "karma", "btn13"], ["onSetAgility", "txtAgilityValue", "agility", "btn14"],
  ["onSetIntelligence", "txtIntelligenceValue", "intelligence", "btn15"],
] as const;

/** `Interface.Banner.Panel.Inventory.as` (sprite 602): characteristics, boost buttons, `InventoryViewer`. */
export class Class_InterfaceBannerPanelInventory extends MovieClip {
  declare txtTitle: Txt;
  declare XPProgressbar?: ProgressBar;
  constructor() {
    super();
    this.init();
  }
  init() {
    for (const [f, key, font] of STATS) (this[f] as Txt)?.setText(T(key), font);
    xpBar(this);
    const d = G.DATACENTER.Player.data;
    this.txtTitle?.setText(G.DATACENTER.Player.name, "Font2");
    this.onSetLevel(d?.level);
    this.onSetGP(d?.GP);
    this.onSetXP(d?.XP);
    this.onSetLP(d?.LP);
    this.onSetAP(d?.AP);
    for (const [fn, , field] of BOOSTS) this[fn](d?.[field]);
    this.onSetBonus(d?.bonusPoints);
    // `INTERFACE.addToListner(this)` (Inventory.as:45): misspelt → no-op (ui.md §6.2).
    d?.addListener(asListener(this));
  }
  onSetLevel(v: unknown) {
    (this.txtLevel as Txt)?.setText(T("LEVEL") + " " + str(v), "Font2");
  }
  onSetXP(v: unknown) {
    (this.txtXPValue as Txt)?.setText(v, "Font2");
    updateXP(this.XPProgressbar, v);
  }
  onSetLP(v: unknown) {
    (this.txtLPValue as Txt)?.setText(v, "Font2");
  }
  onSetAP(v: unknown) {
    (this.txtAPValue as Txt)?.setText(v, "Font2");
  }
  onSetGP(v: unknown) {
    (this.txtGPValue as Txt)?.setText(v, "Font1");
  }
  onSetBonus(v: unknown) {
    (this.txtBonusValue as Txt)?.setText(v, "Font2");
  }
  declare onSetAir: (v: unknown) => void;
  declare onSetFire: (v: unknown) => void;
  declare onSetWater: (v: unknown) => void;
  declare onSetEarth: (v: unknown) => void;
  declare onSetForce: (v: unknown) => void;
  declare onSetVitality: (v: unknown) => void;
  declare onSetCharism: (v: unknown) => void;
  declare onSetKarma: (v: unknown) => void;
  declare onSetAgility: (v: unknown) => void;
  declare onSetIntelligence: (v: unknown) => void;
}
// Inventory.as:74-123: each resistance/characteristic setter writes its value and shows its boost button again.
for (const [fn, field, , btn] of BOOSTS)
  Class_InterfaceBannerPanelInventory.prototype[fn] = function (this: Class_InterfaceBannerPanelInventory, v: unknown) {
    (this[field] as Txt)?.setText(v, "Font1");
    const b = this[btn] as MovieClip | undefined;
    if (b) b._visible = true;
  };
registerClass("Interface::Banner::Panel::Inventory", Class_InterfaceBannerPanelInventory);

/** `Interface.Banner.Panel.PlayerInfos.as` (sprite 505): debug-only (opened by DEBUG_MODE numpad 0). */
export class Class_InterfaceBannerPanelPlayerInfos extends MovieClip {
  declare _data: Character;
  declare XPProgressbar?: ProgressBar;
  declare effects_lst?: ListBox;
  constructor() {
    super();
    this.init();
  }
  init() {
    for (const [f, key, font] of STATS.slice(0, 4)) (this[f] as Txt)?.setText(T(key), font);
    xpBar(this);
  }
  setParams(params: Character) {
    this.setData(params);
  }
  setData(data: Character) {
    this._data = data;
    (this.txtTitle as Txt)?.setText(data?.name, "Font2");
    this.onSetLevel(data?.level);
    this.onSetXP(data?.XP);
    this.onSetLP(data?.LP);
    this.onSetAP(data?.AP);
    const effects = (data?.getEffects() ?? []) as { type?: unknown; value?: unknown; remainingTurn?: unknown }[];
    this.effects_lst?.removeAll();
    if (effects.length == 0) this.effects_lst?.addItem("Aucun effets"); // hard-coded French, beta
    for (const e of effects) this.effects_lst?.addItem("t:" + str(e.type) + " v:" + str(e.value) + " r:" + str(e.remainingTurn));
    // `INTERFACE.addToListner(this)` (PlayerInfos.as:46): misspelt → no-op.
    data?.addListener(asListener(this));
  }
  onSetLevel(v: unknown) {
    (this.txtLevel as Txt)?.setText(T("LEVEL") + " " + str(v), "Font2");
  }
  onSetXP(v: unknown) {
    (this.txtXPValue as Txt)?.setText(v, "Font2");
    updateXP(this.XPProgressbar, v);
  }
  onSetLP(v: unknown) {
    (this.txtLPValue as Txt)?.setText(v, "Font2");
  }
  onSetAP(v: unknown) {
    (this.txtAPValue as Txt)?.setText(v, "Font2");
  }
}
registerClass("Interface::Banner::Panel::PlayerInfos", Class_InterfaceBannerPanelPlayerInfos);

/** A row of `DATACENTER.Game.Results.winners/losers` (`AKSClient/Dofus.Client.Game.as:386`). */
type Result = { id?: unknown; name?: unknown; level?: unknown; bDead?: unknown; winxp?: unknown; gold?: unknown; xp?: unknown; highXp?: unknown };
type Row = MovieClip & { txtName: Txt; txtLevel: Txt; txtDead: Txt; txtXP: Txt; txtGold: Txt; progressXP?: ProgressBar };

/** Shared body of `Interface.Banner.Panel.GameResultFree.as` / `…Random.as` (`random` adds XP, gold, XP bar). */
function gameResult(mc: MovieClip, random: boolean) {
  const data = G.DATACENTER.Game.Results as { winners?: Result[]; losers?: Result[] };
  for (const [f, key] of [["txtGameResult", "GAME_RESULTS"], ["txtWinners", "WINNERS"], ["txtLosers", "LOSERS"], ["txtStats", "STATS"]])
    (mc[f!] as Txt)?.setText(T(key!), "Font2");
  // Free only: `this.btnQuit.setText(getText("LEAVE"))` (GameResultFree.as:19) — no `btnQuit` child, no `setText` → no-op.
  if (!random) call(mc.btnQuit, "setText", T("LEAVE"));
  const symbol = "Interface::Banner::Panel::GameResult::" + (random ? "PlayerRandom" : "PlayerFree");
  for (const [list, y, depth, rows] of [["winners", -343, 10, data.winners ?? []], ["losers", -229, 20, data.losers ?? []]] as const) {
    const box = mc.createEmptyMovieClip(list, depth);
    box._x = -693;
    box._y = y;
    rows.forEach((r, i) => {
      const bMe = r.id == G.DATACENTER.Player.ID;
      if (list == "losers" && bMe) {
        const kdo = mc.btnKDO as MovieClip | undefined; // Free: no `btnKDO` → no-op
        if (kdo) kdo._visible = false;
      }
      const row = box.attachMovie(symbol, "player" + i, i, { _y: i * 19, bMe }) as Row | undefined;
      row?.txtName?.setText(r.name, "Font2");
      row?.txtLevel?.setText(T("LEVEL") + " " + str(r.level), "Font2");
      if (random) {
        row?.txtXP?.setText(r.winxp, "Font2");
        row?.txtGold?.setText(r.gold, "Font2");
      }
      row?.txtDead?.setText(!r.bDead ? T("ALIVE") : T("DEAD"), "Font2");
      if (random && row) {
        const bar = row.attachMovie("Interface::ProgressBar", "progressXP", 10) as ProgressBar | undefined;
        bar?.init(120, 10, 281, 5);
        bar?.update(toNumber(r.xp), toNumber(r.highXp));
      }
    });
  }
}

/** `Interface.Banner.Panel.GameResultFree.as` (sprite 962) */
export class Class_InterfaceBannerPanelGameResultFree extends MovieClip {
  constructor() {
    super();
    this.init();
  }
  init() {
    gameResult(this, false);
  }
}
registerClass("Interface::Banner::Panel::GameResultFree", Class_InterfaceBannerPanelGameResultFree);

/** `Interface.Banner.Panel.GameResultRandom.as` (sprite 956) */
export class Class_InterfaceBannerPanelGameResultRandom extends MovieClip {
  constructor() {
    super();
    this.init();
  }
  init() {
    gameResult(this, true);
  }
}
registerClass("Interface::Banner::Panel::GameResultRandom", Class_InterfaceBannerPanelGameResultRandom);
