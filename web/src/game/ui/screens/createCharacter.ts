// Character creation of modules/Interfaces.swf: `dofus::graphics::gui::UICreateCharacter` and its widgets
// (docs/logic/ui.md §2.4), plus the dead `Interface::CreateCharacter` class (§2.6). Accordion scripts: scripts.ts.
import { Constants, DEFAULT_GUILD } from "../../../core/constants.ts";
import { getGuildText, getSpellText, getText } from "../../../core/lang.ts";
import { str } from "../../../core/swf6.ts";
import { Color, MovieClip, registerClass } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { PushButton } from "../ank.ts";
import { call, type SWFLoader, T, type Txt } from "./as.ts";

/** `SexChoice.as`, `SexChoiceMan.as`: the sex buttons of menu2 are `ank.components.PushButton` (B1). */
registerClass("SexChoice", PushButton);
registerClass("SexChoiceMan", PushButton);

declare module "../interface.ts" {
  interface Interface { UIdofusgraphicsguiUICreateCharacter?: UICreateCharacter }
}

type Big = MovieClip & { show?(gid: number, sex: number): void; colorize?(toBlue: boolean): void };

/** `__Packages/dofus/graphics/gui/UICreateCharacter.as` (sprite 141), drawn by `KERNEL.CharactersManager.createNewCharacter`. */
export class UICreateCharacter extends MovieClip {
  declare m_colors: number[];
  declare m_guildID: number;
  declare m_sex: number;
  declare title_txt: Txt;
  declare guildName_txt: Txt;
  declare guildDescription_txt: Txt;
  declare spellViewer_mc?: SpellInfosViewer;
  declare spellBar_mc?: GuildSpellBar;
  declare bigCharac_mc?: GuildArtworkBigRotation;
  declare swfLoader_mc?: SWFLoader;
  constructor() {
    super();
    this.initialize();
  }
  get guildID() {
    return this.m_guildID;
  }
  get sex() {
    return this.m_sex;
  }
  get colors() {
    return this.m_colors;
  }
  initialize() {
    this.m_guildID = 0; // `new Number()`
    this.m_sex = 0;
    this.m_colors = [0, -1, -1, -1];
    this.title_txt?.setText(getText("CREATE_TITLE"), "Font2");
    this.onEnterFrame = () => {
      this.chooseGuild(1);
      this.chooseSex(0); // m_sex is already 0: no rotate call
      delete this.onEnterFrame;
    };
  }
  chooseGuild(gid: number) {
    if (this.m_guildID != gid) {
      this.viewSpellInfos(Constants.GUILD_SPELLS[gid]?.[0]);
      this.m_guildID = gid;
      this.guildName_txt?.setText(getGuildText(gid).ln, "Font2");
      if (this.guildDescription_txt) this.guildDescription_txt.text = getGuildText(gid).d;
      this.spellBar_mc?.draw(gid);
      (this.bigCharac_mc?.man_mc as Big | undefined)?.show?.(gid, 0);
      (this.bigCharac_mc?.woman_mc as Big | undefined)?.show?.(gid, 1);
      this.swfLoader_mc?.loadSWF(Constants.GUILDS_SYMBOL_PATH + "symbols.swf", gid);
    }
  }
  chooseSex(sex: number) {
    if (this.m_sex != sex) {
      this.m_sex = sex;
      this.bigCharac_mc?.rotate(sex);
    }
  }
  chooseColor(col: number, colorID: number) {
    this.m_colors[colorID] = col;
  }
  createCharacter(name: string | undefined) {
    const len = str(name).length;
    let ok = true;
    if (len == 0) {
      G.INTERFACE.msgBox(getText("NEED_CHARACTER_NAME", []));
      ok = false;
    }
    if (len > 20) {
      G.INTERFACE.msgBox(getText("LONG_CHARACTER_NAME", [name, 20]));
      ok = false;
    }
    if (ok) G.AKS.Account.addCharacter(str(name), this.guildID, this.colors[1]!, this.colors[2]!, this.colors[3]!, this.sex);
  }
  viewSpellInfos(sid: number | null | undefined) {
    if (sid == null) this.spellViewer_mc?.clear();
    else this.spellViewer_mc?.view(sid);
  }
}
registerClass("dofus::graphics::gui::UICreateCharacter", UICreateCharacter);

/** `__Packages/dofus/graphics/gui/common/GuildArtworkBig.as`: big class artwork, tinted when not selected. */
export class GuildArtworkBig extends MovieClip {
  static RED = [0, 10, 19, 29, 38];
  static GREEN = [0, 37, 74, 112, 149];
  static BLUE = [0, 53, 106, 160, 213];
  static PERCENT = [100, 75, 50, 25, 0];
  declare _lastTransform: object | undefined;
  declare big_mc: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.createEmptyMovieClip("big_mc", 10);
  }
  show(guildID: number, sexID: number) {
    this.createEmptyMovieClip("big_mc", 10).loadMovie(Constants.GUILDS_BIG_PATH + String(guildID) + String(sexID) + ".swf");
    if (this._lastTransform != undefined) new Color(this.big_mc).setTransform(this._lastTransform);
  }
  colorize(bToBlue: boolean) {
    const G_ = GuildArtworkBig, len = G_.RED.length, inc = !bToBlue ? -1 : 1, c = new Color(this.big_mc), t: Record<string, number> = {};
    let i = !bToBlue ? len - 1 : 0;
    this.onEnterFrame = () => {
      Object.assign(t, { ra: G_.PERCENT[i], rb: G_.RED[i], ga: G_.PERCENT[i], gb: G_.GREEN[i], ba: G_.PERCENT[i], bb: G_.BLUE[i] });
      c.setTransform(t);
      i += inc;
      if (i >= len || i < 0) {
        this._lastTransform = t;
        delete this.onEnterFrame;
      }
    };
  }
}
registerClass("dofus::graphics::gui::common::GuildArtworkBig", GuildArtworkBig);

/** `__Packages/dofus/graphics/gui/common/GuildArtworkBigRotation.as`: man/woman artworks on an ellipse (70×50). */
export class GuildArtworkBigRotation extends MovieClip {
  declare _i: number;
  declare _di: number;
  declare _tinit: number;
  declare _currentSex: number | undefined;
  declare man_mc?: GuildArtworkBig;
  declare woman_mc?: GuildArtworkBig;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this._i = 2.02;
    this._di = 2.015;
    this._tinit = 90;
    this.onEnterFrame = () => this.rotate(0);
  }
  rotate(sex: number) {
    if (this._currentSex == sex) return;
    this._currentSex = sex;
    let py = 0, bSwaped = false;
    if (sex == 1) {
      this._di = 5.140000000000001;
      this.woman_mc?.colorize(false);
      this.man_mc?.colorize(true);
    }
    if (sex == 0) {
      this._di = 2;
      this.woman_mc?.colorize(true);
      this.man_mc?.colorize(false);
    }
    this.onEnterFrame = () => {
      if (Math.abs(this._i - this._di) > 0.01) {
        this._i -= (this._i - this._di) / 3;
        const piy = py, px = 70 * Math.cos(this._i);
        py = 50 * Math.sin(this._i);
        if (((piy < 0 && py >= 0) || (piy >= 0 && py < 0)) && !bSwaped && this.man_mc && this.woman_mc) {
          this.man_mc.swapDepths(this.woman_mc);
          bSwaped = true;
        }
        const t = py / 1.5, m = this.man_mc, w = this.woman_mc;
        if (m) (m._x = px), (m._y = py), (m._xscale = this._tinit + t), (m._yscale = this._tinit + t);
        if (w) (w._x = -px), (w._y = -py), (w._xscale = this._tinit - t), (w._yscale = this._tinit - t);
      } else delete this.onEnterFrame;
    };
  }
}
registerClass("dofus::graphics::gui::common::GuildArtworkBigRotation", GuildArtworkBigRotation);

/** `__Packages/dofus/graphics/gui/common/GuildSpellBar.as` (linkage `SpellBar`): the guild's first 10 spell icons. */
export class GuildSpellBar extends MovieClip {
  static COUNT = 10;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.clear();
  }
  override clear() {
    for (let i = 0; i < GuildSpellBar.COUNT; i++) (this[`icon${i}_mc`] as SWFLoader | undefined)?.clear();
  }
  draw(guildID: number) {
    for (let i = 0; i < GuildSpellBar.COUNT; i++)
      (this[`icon${i}_mc`] as SWFLoader | undefined)?.loadSWF(Constants.SPELLS_ICONS_PATH + str(Constants.GUILD_SPELLS[guildID]?.[i]) + ".swf");
  }
}
registerClass("SpellBar", GuildSpellBar);

/** `__Packages/dofus/graphics/gui/common/SpellInfosViewer.as` (linkage `SpellViewerCreate`). */
export class SpellInfosViewer extends MovieClip {
  declare name_txt: Txt;
  declare level_txt: Txt;
  declare apCost_txt: Txt;
  declare range_txt: Txt;
  declare description_txt: Txt;
  declare swfLoader_mc?: SWFLoader;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.clear();
  }
  override clear() {
    this.name_txt?.setText("", "Font2");
    this.level_txt?.setText("", "Font2");
    this.apCost_txt?.setText("", "Font1");
    this.range_txt?.setText("", "Font1");
    if (this.description_txt) this.description_txt.text = "";
    this.swfLoader_mc?.clear();
  }
  view(spellID: number) {
    const s = this.getSpellInfos(spellID);
    this.name_txt?.setText(s.name, "Font2");
    this.level_txt?.setText(T("LEVEL") + " " + str(s.level), "Font2"); // `level` is never filled (ui.md §2.4)
    this.apCost_txt?.setText(T("ACTION_POINTS") + " " + str(s.apCost) + " " + T("AP"), "Font1");
    this.range_txt?.setText(T("RANGEFULL") + " " + str(s.range) + " " + T("RANGE"), "Font1");
    if (this.description_txt) this.description_txt.text = str(s.description) + "\n" + str(s.descriptionNormalHit);
    this.swfLoader_mc?.loadSWF(s.file);
  }
  getSpellInfos(spellID: number) {
    const t = getSpellText(spellID), l1 = t?.l1; // [normal hit, critical hit, AP, range]
    return {
      name: t?.n, apCost: l1?.[2], range: l1?.[3], description: t?.d, descriptionNormalHit: l1?.[0], level: undefined as unknown,
      file: Constants.SPELLS_ICONS_PATH + spellID + ".swf",
    };
  }
}
registerClass("SpellViewerCreate", SpellInfosViewer);

/** `DoInitAction.as`: `Interface::CreateCharacter`, the older creation screen. Dead: no symbol is exported under
 *  that linkage, so it never instantiates (ui.md §2.6). */
export class Class_CreateCharacter extends MovieClip {
  declare mColor1: number;
  declare mColor2: number;
  declare mColor3: number;
  declare mGuild: number;
  declare choiceCharacterEnabled: boolean;
  declare txtNomPerso: Txt;
  constructor() {
    super();
    this.mColor1 = this.mColor2 = this.mColor3 = -1;
    this.mGuild = DEFAULT_GUILD;
    this.choiceCharacterEnabled = true;
    if (this.txtNomPerso) (this.txtNomPerso.restrict = "A-Za-z\\-"), (this.txtNomPerso.maxChars = 20);
  }
  selectCharacter(index: number) {
    call((this.personnages as MovieClip | undefined)?.dessin, "show", index);
    call(this.guildsDescriptions_mc, "showDescription", index);
    this.mGuild = index;
  }
}
registerClass("Interface::CreateCharacter", Class_CreateCharacter);
