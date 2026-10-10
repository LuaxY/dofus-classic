// AS2 classes of Interfaces.swf owned by B1: __Packages/ank/components/{PushButton,ColorPicker}.as and
// __Packages/dofus/Translator.as, with the linkage bindings ColorDrip.as, FilterButton1-5.as, ank.components.ColorPicker.as.
// (SexChoice / SexChoiceMan bind the same PushButton but belong to the creation screen.)
import { getGuildText, getSpellText, getText } from "../../core/lang.ts";
import { MovieClip, registerClass, Color } from "../../runtime/player.ts";

type Listener = Record<string, unknown>;
/** `AsBroadcaster.initialize(this)`: addListener (remove then push) / removeListener / broadcastMessage. */
export class BroadcastClip extends MovieClip {
  declare _listeners: Listener[];
  addListener(o: object) {
    this.removeListener(o);
    this._listeners.push(o as Listener);
    return true;
  }
  removeListener(o: object) {
    const i = this._listeners.indexOf(o as Listener);
    if (i < 0) return false;
    this._listeners.splice(i, 1);
    return true;
  }
  broadcastMessage(name: string, ...args: unknown[]) {
    for (const l of [...this._listeners]) {
      const f = l[name];
      if (typeof f === "function") f.apply(l, args);
    }
  }
}

/** __Packages/ank/components/PushButton.as — toggle button: frames `out` / `over` / `selected`, radio groups. */
export class PushButton extends BroadcastClip {
  declare _group: PushButton[];
  declare background_mc: MovieClip | undefined;
  declare m_Params: unknown;
  declare m_bSelected: boolean;
  declare m_bEnabled: boolean;
  declare m_color: number;
  declare m_bUnselectableItSelf: boolean;
  constructor() {
    super();
    this.initialize();
  }
  /** :15-22 */
  initialize() {
    this.stop();
    this._listeners = [];
    this.setEnabled(true);
    this._group = [];
  }
  /** :23-39 */
  setEnabled(bool: boolean) {
    this.m_bEnabled = bool;
    if (bool) {
      this.onRollOver = this._frollOver;
      this.onRollOut = this.onReleaseOutside = this._frollOut;
      this.onRelease = this._frelease;
    } else {
      delete this.onRollOver;
      delete this.onRollOut;
      delete this.onRelease;
    }
  }
  /** :40-68 — `bHimSelf`: user action, broadcasts onSelect and unselects the group. */
  select(bool: boolean, bHimSelf?: boolean) {
    if (this.m_bUnselectableItSelf === false && bHimSelf && bool === false) return;
    this.m_bSelected = bool;
    if (bHimSelf) {
      this.broadcastMessage("onSelect", this);
      for (let i = 0; i < this._group.length; i++) this._group[i]!.select(false, false);
    }
    this.gotoAndStop(bool ? "selected" : "out");
  }
  /** :69-77 */
  setColor(col: number) {
    this.m_color = col;
    this._fapplyColor(col);
  }
  groupWith(pbtn: PushButton) {
    this._group.push(pbtn);
  }
  /** :78-101 */
  get params() { return this.m_Params; }
  get selected() { return this.m_bSelected; }
  /** Shadows MovieClip.enabled (the runtime's mouse test reads it). */
  get enabled() { return this.m_bEnabled; }
  get getColor() { return this.m_color; }
  set unselectableItSelf(bool: boolean) { this.m_bUnselectableItSelf = bool; }
  get unselectableItSelf() { return this.m_bUnselectableItSelf; }
  /** :102-129 */
  _frelease() {
    this.select(!this.selected, true);
  }
  _frollOver() {
    this.gotoAndStop("over");
    this.broadcastMessage("onToolTipOn", this);
  }
  _frollOut() {
    this.gotoAndStop(this.selected ? "selected" : "out");
    this.broadcastMessage("onToolTipOff", this);
  }
  _fapplyColor(col: number) {
    new Color(this.background_mc).setRGB(col);
  }
}
Object.assign(PushButton.prototype, { m_bSelected: false, m_bEnabled: false, m_color: 0, m_bUnselectableItSelf: true });
for (const l of ["ColorDrip", "FilterButton1", "FilterButton2", "FilterButton3", "FilterButton4", "FilterButton5"]) registerClass(l, PushButton);

type Box = { matrixType: string; x: number; y: number; w: number; h: number; r: number };
type Sub = MovieClip & { cross: MovieClip; sliderCross: MovieClip };
/** __Packages/ank/components/ColorPicker.as — hue × grey gradient + brightness slider; broadcasts onColorSelect / onColorChange. */
export class ColorPicker extends BroadcastClip {
  static COULEURS_V = [16711680, 16776960, 65280, 65535, 255, 16711935, 16711680];
  static ALPHAS_V = [100, 100, 100, 100, 100, 100, 100];
  static RAPPORTS_V = [0, 42.5, 85, 127.5, 170, 212.5, 255];
  static COULEURS_H = [8421504, 8421504];
  static ALPHAS_H = [0, 100];
  static RAPPORTS_H = [0, 255];
  static ALPHASLIDER = [100, 100, 100];
  static RAPPORTS_SLIDER = [0, 127.5, 255];
  declare coefX: number;
  declare coefY: number;
  declare borderDisplay: boolean;
  declare borderX: number;
  declare borderY: number;
  declare sliderWidth: number;
  declare sliderSpace: number;
  declare sliderCrossSpace: number;
  declare sliderCrossSpaceX: number;
  declare crossWidth: number;
  declare crossHeight: number;
  declare crossPointWidth: number;
  declare crossPointHeight: number;
  declare sliderCrossWidth: number;
  declare sliderCrossHeight: number;
  declare colorWidth: number;
  declare height: number;
  declare matriceV: Box;
  declare matriceH: Box;
  declare matriceSlider: Box;
  declare gradientColor: number;
  declare colors: Sub;
  declare slider: MovieClip;
  declare sliderColors: Sub;

  /** :17-49 */
  constructor() {
    super();
    this._listeners = [];
    this.coefX = 100 / this._xscale;
    this.coefY = 100 / this._yscale;
    this.borderDisplay = false;
    this.borderX = 10 * this.coefX;
    this.borderY = 10 * this.coefY;
    this.sliderWidth = 10 * this.coefX;
    this.sliderSpace = 5 * this.coefX;
    this.sliderCrossSpace = 8 * this.coefX;
    this.sliderCrossSpaceX = 4 * this.coefX;
    this.crossWidth = 6 * this.coefX;
    this.crossHeight = 6 * this.coefY;
    this.crossPointWidth = 3 * this.coefX;
    this.crossPointHeight = 3 * this.coefY;
    this.sliderCrossWidth = 4 * this.coefX;
    this.sliderCrossHeight = 3 * this.coefY;
    if (!this.borderDisplay) this.borderX = this.borderY = 0;
    this.colorWidth = this._width * this.coefX - this.borderX * 2 - this.sliderWidth - this.sliderSpace - this.sliderCrossSpace;
    this.height = this._height * this.coefY - this.borderY * 2;
    this.matriceV = { matrixType: "box", x: 0, y: 0, w: this.colorWidth, h: this.height, r: 0 };
    this.matriceH = { matrixType: "box", x: 0, y: 0, w: this.colorWidth, h: this.height, r: Math.PI / 2 };
    this.matriceSlider = { matrixType: "box", x: 0, y: 0, w: this.colorWidth, h: this.height, r: Math.PI / 2 };
    this.draw();
    this.getGradientColor();
    this.updateSlider();
  }
  /** :50-119 (`___proto__` lines are typos: no-ops). */
  draw() {
    const c = (this.colors = this.createEmptyMovieClip("colors", 10) as Sub);
    c._x = this.borderX;
    c._y = this.borderY;
    c.createEmptyMovieClip("cross", 2);
    const s = this.createEmptyMovieClip("slider", 3);
    this.slider = s;
    s._y = this.borderY;
    s._x = this.colorWidth + this.borderX + this.sliderSpace;
    const sc = (this.sliderColors = this.createEmptyMovieClip("sliderColors", 2) as Sub);
    sc._y = this.borderY;
    sc._x = this.colorWidth + this.borderX + this.sliderSpace;
    sc.createEmptyMovieClip("sliderCross", 4);
    sc.sliderCross._x = this.sliderWidth + this.sliderCrossSpaceX;
    sc.sliderCross._y = this.height / 2;
    const rect = (m: MovieClip, w: number) => (m.moveTo(0, 0), m.lineTo(0, this.height), m.lineTo(w, this.height), m.lineTo(w, 0), m.lineTo(0, 0));
    c.beginGradientFill("linear", ColorPicker.COULEURS_V, ColorPicker.ALPHAS_V, ColorPicker.RAPPORTS_V, this.matriceV);
    c.lineStyle(1, 16777215, 100);
    rect(c, this.colorWidth);
    c.endFill();
    c.beginGradientFill("linear", ColorPicker.COULEURS_H, ColorPicker.ALPHAS_H, ColorPicker.RAPPORTS_H, this.matriceH);
    rect(c, this.colorWidth);
    c.endFill();
    c.lineStyle(0.1, 16777215, 100);
    rect(c, this.colorWidth);
    const x = c.cross;
    x.lineStyle(0, 0, 100);
    x.moveTo(-this.crossWidth, 0), x.lineTo(-this.crossPointWidth, 0);
    x.moveTo(this.crossPointWidth, 0), x.lineTo(this.crossWidth, 0);
    x.moveTo(0, -this.crossHeight), x.lineTo(0, -this.crossPointHeight);
    x.moveTo(0, this.crossPointHeight), x.lineTo(0, this.crossHeight);
    x._x = c._width / 2;
    x._y = c._height / 2;
    s.lineStyle(0.1, 16777215, 100);
    rect(s, this.sliderWidth);
    const k = sc.sliderCross;
    k.beginFill(0, 100);
    k.moveTo(0, 0), k.lineTo(this.sliderCrossWidth, -this.sliderCrossHeight), k.lineTo(this.sliderCrossWidth, this.sliderCrossHeight), k.lineTo(0, 0);
    this.endFill(); // on the picker, not sliderCross (AS line 114)
    c.onPress = this.onGradientPress;
    c.onRelease = c.onReleaseOutside = this.onGradientRelease;
    sc.onPress = this.onSliderPress;
    sc.onRelease = sc.onReleaseOutside = this.onSliderRelease;
  }
  /** :120-158 — gradient/slider handlers run with `this` = the `colors` / `sliderColors` clip. */
  onGradientPress(this: Sub) {
    this.cross._x = this._xmouse;
    this.cross._y = this._ymouse;
    this.cross.startDrag(true, 0, 0, this._width, this._height);
    this.cross.onMouseMove = (this._parent as ColorPicker).onGradientDrag;
  }
  onGradientRelease(this: Sub) {
    this.cross.stopDrag();
    this.cross.onMouseMove = undefined;
    const p = this._parent as ColorPicker;
    p.getGradientColor();
    p.updateSlider();
    p.dispatchColorSelect();
  }
  onGradientDrag(this: MovieClip) {
    const p = this._parent?._parent as ColorPicker;
    p.getGradientColor();
    p.updateSlider();
  }
  onSliderPress(this: Sub) {
    this.sliderCross.startDrag(true, this.sliderCross._x, 0, this.sliderCross._x, (this._parent as ColorPicker).height);
    this.sliderCross.onMouseMove = (this._parent as ColorPicker).onSliderDrag;
  }
  onSliderRelease(this: Sub) {
    this.sliderCross.stopDrag();
    this.sliderCross.onMouseMove = undefined;
    (this._parent as ColorPicker).dispatchColorSelect();
  }
  onSliderDrag(this: MovieClip) {
    (this._parent?._parent as ColorPicker).dispatchColorChange();
  }
  /** :159-188 — slider y: top lightens to white, bottom darkens to black. */
  getCurrentColor(): number {
    const base = this.gradientColor;
    let l = 255 - (this.sliderColors.sliderCross._y / Math.floor(this.height)) * 510;
    const r1 = (base & 0xff0000) >> 16, g1 = (base & 0xff00) >> 8, b1 = base & 0xff;
    let r2: number, g2: number, b2: number;
    if (l >= 0) {
      r2 = (l * (255 - r1)) / 255 + r1;
      g2 = (l * (255 - g1)) / 255 + g1;
      b2 = (l * (255 - b1)) / 255 + b1;
    } else {
      l *= -1;
      r2 = Math.round(r1 - (r1 * l) / 255);
      g2 = Math.round(g1 - (g1 * l) / 255);
      b2 = Math.round(b1 - (b1 * l) / 255);
    }
    return Math.round((r2 << 16) + (g2 << 8) + b2);
  }
  dispatchColorSelect() {
    this.broadcastMessage("onColorSelect", this.getCurrentColor());
  }
  dispatchColorChange() {
    this.broadcastMessage("onColorChange", this.getCurrentColor());
  }
  /** :197-241 — hue from the cross x, greyed toward 127 by the cross y. */
  getGradientColor(): number {
    const V = ColorPicker.RAPPORTS_V, C = ColorPicker.COULEURS_V;
    let t = this.colors.cross._x / Math.floor(this.colorWidth);
    const i = Math.floor(t * (V.length - 1));
    t *= 255;
    const k = 255 - ((V[i + 1]! - t) / (V[i + 1]! - V[i]!)) * 255;
    const c1 = C[i]!, c2 = C[i + 1]!;
    const chan = (m: number, sh: number) => ((c1 & m) !== (c2 & m) ? Math.round((c1 & m) <= (c2 & m) ? k : 255 - k) : (c1 & m) >> sh);
    let r = chan(0xff0000, 16), g = chan(0xff00, 8), b = chan(0xff, 0);
    t = (this.colors.cross._y / this.height) * 255;
    r += ((127 - r) * t) / 255;
    g += ((127 - g) * t) / 255;
    b += ((127 - b) * t) / 255;
    this.gradientColor = (r << 16) + (g << 8) + b;
    return this.gradientColor;
  }
  /** :242-254 */
  updateSlider() {
    const sc = this.sliderColors;
    sc.beginGradientFill("linear", [16777215, this.gradientColor, 0], ColorPicker.ALPHASLIDER, ColorPicker.RAPPORTS_SLIDER, this.matriceSlider);
    sc.moveTo(0, 0), sc.lineTo(0, this.height), sc.lineTo(this.sliderWidth, this.height), sc.lineTo(this.sliderWidth, 0), sc.lineTo(0, 0);
    sc.endFill();
    this.dispatchColorChange();
  }
}
registerClass("ank::components::ColorPicker", ColorPicker);

/** __Packages/dofus/Translator.as — thin wrappers over the `_global` lang lookups (core/lang.ts). */
export const Translator = {
  getText: (key: string, args?: readonly unknown[]) => getText(key, args),
  getGuildInfos: (gid: number | string) => getGuildText(gid),
  getSpellInfos: (sid: number | string) => getSpellText(sid),
};
