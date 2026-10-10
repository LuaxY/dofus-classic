// modules_Interfaces/Dofus.Interface.as — `Class_Interface`, linkage "Dofus::Interface": the INTERFACE singleton
// (created by modules_Interfaces/frame_1/DoAction.as, see scripts.ts). Layers and depths: docs/logic/ui.md §1.3-1.4.
// Fields that `draw()` sets as `UI<name>` (UIInterfaceBanner, UIMultiPlayer…) are typed by the screen owner:
//   declare module "<path>/ui/interface.ts" { interface Interface { UIInterfaceBanner?: Banner } }
import { getText } from "../../core/lang.ts";
import { HTTP_LOGIN_PATH, LOGIN_INTERFACE_FILE, SERVER_NAME, SERVER_PORT, SITE_PATH } from "../../core/constants.ts";
import { str } from "../../core/swf6.ts";
import { MovieClip, registerClass, Stage } from "../../runtime/player.ts";
import { FStyleFormat } from "./framework.ts";
import { S } from "./siblings.ts";
// INTERFACE attaches these classes' symbols: register them whoever imports Interface first
import "./controls.ts";
import "./widgets.ts";
import "./windows.ts";
import type { WindowBox } from "./windows.ts";
import type { InterfaceCursor, Interface_ProgressBar, InterfaceText, ToolTip, UIWaitingClass } from "./widgets.ts";

declare module "../globals.ts" {
  interface Globals { INTERFACE: Interface }
}

/** Data carried by the drag cursor (spell or item objects: `iconFile` is what is loaded). */
export type CursorData = { iconFile?: string; [k: string]: unknown };

export type CommonLayer = MovieClip & { loginInterface?: MovieClip; MenuInterface?: MovieClip };
export type BoxLayer = MovieClip & {
  boxMessage?: WindowBox; boxYesNo?: WindowBox; boxWhisper?: WindowBox; boxOptions?: WindowBox; boxMenu?: WindowBox;
  nextTurnBoxClip?: MovieClip;
};
export type MainLayer = MovieClip & {
  waiting: UIWaitingClass; Text: InterfaceText; BugReport?: MovieClip; Mask?: MovieClip; progressBar?: Interface_ProgressBar;
  cursor?: InterfaceCursor; spellcursor?: MovieClip & { icon: MovieClip; data: CursorData }; tooltip?: ToolTip;
};

/**
 * `DofusLoginInterface.swf` is missing (docs/logic/ui.md §2.1). The login substitute (B2, provenance `authored`)
 * registers its builder here; `drawLoginInterface` then builds into the container instead of `loadMovie(url)`.
 */
export const loginSubstitute: { draw?: (container: MovieClip & { onLogin: (login: string, password: string) => void }) => void } = {};

export class Interface extends MovieClip {
  declare CommonLayer_mc: CommonLayer;
  declare BoxLayer_mc: BoxLayer;
  declare MainLayer_mc: MainLayer;
  declare layers: Record<string, MovieClip | undefined>;
  declare Text: InterfaceText;
  declare listBox_sf: FStyleFormat;
  declare comboBox_sf: FStyleFormat; // never used (docs/logic/ui.md §2.16)
  declare lastSpellcursorData: CursorData | null | undefined;
  declare spellcursor: MainLayer["spellcursor"];
  declare UILoginInterface: MovieClip | undefined;
  declare teamWatcher: (MovieClip & { setTeams?(team0: unknown, team1: unknown): void }) | undefined;
  declare fps: MovieClip | undefined;
  /** Prototype `undefined` (:7-8), assigned by callers; never reset after use. */
  declare onQuestionBoxYes: (() => void) | undefined;
  declare onQuestionBoxNo: (() => void) | undefined;
  // ---- referenced by the AS but never defined (docs/logic/ui.md §6.2) — typed so call sites port literally with `?.` ----
  /** `addToListner` typo (Interface.Banner.as:33, …Inventory.as:45, …PlayerInfos.as:46, TabStart_SelfStats.as:5). */
  declare addToListner?: (clip: unknown) => void;
  /** S430/PB_43 rel:4 calls `INTERFACE.cursor.setForbidden(false)`; the cursor is `MainLayer_mc.cursor`. */
  declare cursor?: InterfaceCursor;
  /** AKSClient reads `INTERFACE.InterfaceBanner` (Events.AKS.Spells.as:3, Character.as:91); `draw` sets `UIInterfaceBanner`. */
  declare InterfaceBanner?: MovieClip;
  /** Never initialised, so addToListener / removeAllListener are no-ops (:216-230). */
  declare listenersArray?: unknown[];

  constructor() {
    super();
    this.init();
  }

  /** :9-36 */
  init() {
    this.createEmptyMovieClip("CommonLayer_mc", 10);
    this.createEmptyMovieClip("BoxLayer_mc", 20);
    this.createEmptyMovieClip("MainLayer_mc", 30);
    this.layers = {};
    this.MainLayer_mc.attachMovie("Interface::Waiting", "waiting", 10, { _x: 742 });
    this.MainLayer_mc.attachMovie("Interface::Text", "Text", 20);
    this.Text = this.MainLayer_mc.Text;
    this.MainLayer_mc.attachMovie("Interface::BugReport", "BugReport", 30);
    this.MainLayer_mc.attachMovie("GlobalMask", "Mask", 40);
    this.listBox_sf = new FStyleFormat();
    Object.assign(this.listBox_sf, { textFont: "Font3", textColor: 16777215, textDisabled: 5807827, textSelected: 16777215, embedFonts: true, textSize: 8 });
    this.comboBox_sf = new FStyleFormat();
    Object.assign(this.comboBox_sf, { textFont: "Font3", textColor: 16777215, textDisabled: 5807827, textSelected: 16777215, embedFonts: true, textSize: 8 });
    this.lastSpellcursorData = null;
  }

  /** :37-44 — `symbol.replace(":", "")` is ank.ext.StringExtensions.replace (split/join: every ":"). */
  draw(symbol: string, depth: number): MovieClip | undefined {
    const name = symbol.split(":").join("");
    let clip: MovieClip | undefined;
    try {
      clip = this.CommonLayer_mc.attachMovie(symbol, name, depth);
    } finally {
      // Port: a constructor that throws (where Flash 6 would have run on) has already put its clip at
      // CommonLayer_mc[name]; it is recorded anyway so clear() removes it.
      this.layers[name] = clip ?? (this.CommonLayer_mc[name] as MovieClip | undefined);
      this["UI" + name] = this.CommonLayer_mc[name];
    }
    return this.CommonLayer_mc[name] as MovieClip | undefined;
  }
  /** :45-50 */
  hide(clipSymbol: string) {
    const name = clipSymbol.split(":").join("");
    this.layers[name]?.removeMovieClip();
    delete this.layers[name];
  }
  /** :51-62 */
  clear() {
    for (const k in this.layers) {
      this.layers[k]?.removeMovieClip();
      delete this.layers[k];
    }
    this.hideToolTip();
    this.setCursor(null);
    this.setSpellCursor(null);
  }

  /** :63-81 — the only divergence is at the load line (loginSubstitute). */
  drawLoginInterface() {
    // System.security.allowDomain(SITE_PATH): no-op in the runtime (docs/runtime.md §5)
    this.CommonLayer_mc.createEmptyMovieClip("loginInterface", 1);
    const c = this.CommonLayer_mc.loginInterface!;
    this.UILoginInterface = c;
    const onInit = function (this: MovieClip) {
      this.onLogin = (login: string, password: string) => {
        const p = S.DATACENTER?.Player;
        if (p) (p.login = login), (p.password = password);
        S.AKS?.connect?.(SERVER_NAME, SERVER_PORT);
      };
    };
    const url = HTTP_LOGIN_PATH + "swf/" + LOGIN_INTERFACE_FILE + ".swf";
    if (loginSubstitute.draw) {
      onInit.call(c); // no load happens, so the onInitFrame body runs now
      loginSubstitute.draw(c as MovieClip & { onLogin: (login: string, password: string) => void });
    } else {
      c.onInitFrame = onInit;
      c.loadMovie(url);
    }
    this.layers.loginInterface = c;
  }
  /** :82-94 — `setInfos` does not exist on UIStartMenu (no-op); `onPlay` is never invoked. */
  drawMenuInterface() {
    // System.security.allowDomain(SITE_PATH): no-op
    this.CommonLayer_mc.attachMovie("UIStartMenu", "MenuInterface", 1);
    const m = this.CommonLayer_mc.MenuInterface;
    (m?.setInfos as ((a: string[]) => void) | undefined)?.call(m, [SITE_PATH]);
    if (m) m.onPlay = () => S.AKS?.Account?.getCharacters?.();
    this.layers.MenuInterface = m;
  }
  /** :95-102 */
  drawAnimSelection(x: number, y: number) {
    const c = this.draw("AnimSelectionSymbol", 4000);
    if (!c) return;
    c._x = x;
    c._y = y;
    c._xscale = S.BATTLEFIELD?.Container?._xscale as number;
    c._yscale = S.BATTLEFIELD?.Container?._xscale as number;
  }
  /** :103-106 */
  hideAnimSelection() {
    this.hide("AnimSelectionSymbol");
  }

  // ---- boxes: all at BoxLayer_mc depth 10, so a new box replaces the open one (docs/logic/ui.md §1.3) ----------
  /** :107-111 */
  msgBox(msg?: unknown) {
    this.Text.clearText();
    this.BoxLayer_mc.attachMovie("Interface::WindowBox", "boxMessage", 10, { title: getText("INFORMATIONS"), containerSymbol: "boxMessage", containerParams: { msg } });
  }
  /** :112-116 — Yes/No call `onQuestionBoxYes` / `onQuestionBoxNo` (scripts.ts, S897). */
  questionBox(msg?: unknown) {
    this.Text.clearText();
    this.BoxLayer_mc.attachMovie("Interface::WindowBox", "boxYesNo", 10, { title: getText("QUESTION"), containerSymbol: "boxYesNo", containerParams: { msg } });
  }
  /** :117-121 — `msg` is an undeclared variable in the AS (undefined). */
  wisperBox(to: unknown) {
    this.Text.clearText();
    const title = str(getText("WISPER_MESSAGE")) + " " + str(getText("TO")) + " " + str(to);
    this.BoxLayer_mc.attachMovie("Interface::WindowBox", "boxWhisper", 10, { title, containerSymbol: "boxWhisper", containerParams: { msg: undefined, to } });
  }
  /** :122-126 */
  optionsBox() {
    this.Text.clearText();
    this.BoxLayer_mc.attachMovie("Interface::WindowBox", "boxOptions", 10, { title: getText("OPTIONS"), containerSymbol: "boxOptions", containerParams: {} });
  }
  /** :127-131 */
  menuBox() {
    this.Text.clearText();
    this.BoxLayer_mc.attachMovie("Interface::WindowBox", "boxMenu", 10, { title: getText("MENU"), containerSymbol: "boxMenu", containerParams: {} });
  }
  /** :132-135 */
  hideQuestionBox() {
    this.BoxLayer_mc.boxYesNo?.removeMovieClip();
  }
  /** :136-139 */
  messageNextTurn() {
    this.BoxLayer_mc.attachMovie("Interface::NextTurn", "nextTurnBoxClip", 20, { _x: 742, _y: 432 });
  }
  /** :140-143 */
  hideMessageNextTurn() {
    this.BoxLayer_mc.nextTurnBoxClip?.removeMovieClip();
  }

  // ---- main layer ------------------------------------------------------------------------------------------
  /** :144-150 */
  showProgressBar(text?: string) {
    this.MainLayer_mc.attachMovie("Interface::ProgressBar", "progressBar", 60);
    this.MainLayer_mc.progressBar?.init(150, 11, Stage.width / 2, Stage.height / 2, text);
  }
  /** :151-154 */
  updateProgressBar(value: number, max: number) {
    this.MainLayer_mc.progressBar?.update(value, max);
  }
  /** :155-158 */
  hideProgressBar() {
    this.MainLayer_mc.progressBar?.removeMovieClip();
  }
  /** :159-171 — `icon != null`: null and undefined remove the cursor. */
  setCursor(icon: string | null | undefined): InterfaceCursor | undefined {
    if (icon != null) this.MainLayer_mc.attachMovie("Interface::Cursor", "cursor", 70, { iconFile: icon });
    else this.MainLayer_mc.cursor?.removeMovieClip();
    return this.MainLayer_mc.cursor;
  }
  /** :172-175 */
  getCursor(): InterfaceCursor | undefined {
    return this.MainLayer_mc.cursor;
  }
  /** :176-202 */
  setSpellCursor(itemData: CursorData | null | undefined) {
    if (itemData != null) {
      this.spellcursor = this.MainLayer_mc.createEmptyMovieClip("spellcursor", 80) as MainLayer["spellcursor"];
      const sc = this.MainLayer_mc.spellcursor!;
      sc.createEmptyMovieClip("icon", 10);
      sc.data = itemData;
      const icon = sc.icon;
      icon._alpha = 60;
      icon.onInitFrame = function (this: MovieClip) {
        const b = this.getBounds();
        this._x = -b.xMin - (b.xMax - b.xMin) / 2;
        this._y = -b.yMin - (b.yMax - b.yMin) / 2;
        this._parent?.startDrag(true);
      };
      icon.loadMovie(str(itemData.iconFile));
    } else {
      // Flash clip references resolve by target path: once the clip is removed, `spellcursor.data` is undefined
      const sc = this.spellcursor;
      this.lastSpellcursorData = sc && !sc.$.removed ? sc.data : undefined;
      this.MainLayer_mc.spellcursor?.removeMovieClip();
    }
  }
  /** :203-206 */
  getSpellCursor() {
    return this.MainLayer_mc.spellcursor;
  }
  /** :207-211 (the AS reads `toolTip`: case-insensitive name of the `tooltip` clip) */
  drawToolTip(text: unknown, x?: number, y?: number, bMouseOrigine?: boolean, bCenter?: boolean, interval?: number, bTopAlign?: boolean) {
    this.MainLayer_mc.attachMovie("Interface::ToolTip", "tooltip", 9000);
    this.MainLayer_mc.tooltip?.setText(text, x, y, bMouseOrigine, bCenter, interval, bTopAlign);
  }
  /** :212-215 */
  hideToolTip() {
    this.MainLayer_mc.tooltip?.removeMovieClip();
  }
  /** :216-219 — `listenersArray` is never initialised: no-op. */
  addToListener(clip: unknown) {
    this.listenersArray?.push(clip);
  }
  /** :220-230 — zero iterations (listenersArray undefined). */
  removeAllListener() {
    const data = S.DATACENTER?.Player.data;
    for (const l of this.listenersArray ?? []) data?.removeListener(l as Parameters<NonNullable<typeof data>["removeListener"]>[0]);
  }
  /** :231-235 */
  drawTeamWatcher(team0: unknown, team1: unknown) {
    this.attachMovie("Interface::TeamWatcher", "teamWatcher", 4700, { _x: 371, _y: 430 });
    this.teamWatcher?.setTeams?.(team0, team1);
  }
  /** :236-239 */
  hideTeamWatcher() {
    this.teamWatcher?.removeMovieClip();
  }
  /** :240-243 */
  showFps() {
    this.attachMovie("fpsDetectorSymbol", "fps", 999999999);
  }
  /** :244-247 — no-op in Flash: removeMovieClip refuses depths ≥ 1048576 (bug kept). */
  hideFps() {
    this.fps?.removeMovieClip();
  }
}
registerClass("Dofus::Interface", Interface);
