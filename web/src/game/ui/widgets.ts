// Small Interfaces.swf widgets (AS1 classes registered with Object.registerClass). One class per AS file, names
// from the AS constructors without the `Class_` prefix. Sources: modules_Interfaces/<file> cited on each class.
import { G } from "../globals.ts";
import { str } from "../../core/swf6.ts";
import { clearInterval, Color, getTimer, Key, Mouse, MovieClip, registerClass, setInterval, Stage, TextField, TextFormat } from "../../runtime/player.ts";

type Clip = MovieClip;

/** Interface.CheckBox.as — param `bgColor`; `onClick` is assigned by the owner (prototype null). */
export class Interface_CheckBox extends MovieClip {
  declare bgColor: number;
  declare background_mc: Clip;
  declare selectRound: Clip;
  declare bSelected: boolean;
  declare tooltipText: unknown;
  declare onClick: (() => void) | null;
  constructor() {
    super();
    this.init();
  }
  /** :8-14 */
  init() {
    this.select(false);
    new Color(this.background_mc).setRGB(this.bgColor);
  }
  /** :15-19 */
  select(bool: boolean) {
    if (this.selectRound) this.selectRound._visible = bool;
    this.bSelected = bool;
  }
  /** :20-39 */
  setEnabled(bool: boolean) {
    if (bool) {
      this.onRelease = this.onClick;
      this.onRollOver = function (this: Interface_CheckBox) {
        G.INTERFACE.drawToolTip(this.tooltipText, 10, -10, true);
      };
      this.onRollOut = () => G.INTERFACE.hideToolTip();
    } else delete this.onRelease;
  }
  /** :40-43 */
  setToolTip(txt: unknown) {
    this.tooltipText = txt;
  }
}
Interface_CheckBox.prototype.onClick = null;
registerClass("Interface::CheckBox", Interface_CheckBox);

/** Interface.RadioButton.as — same as the CheckBox without tooltip. */
export class Interface_RadioButton extends MovieClip {
  declare bgColor: number;
  declare background_mc: Clip;
  declare selectRound: Clip;
  declare bSelected: boolean;
  declare onClick: (() => void) | null;
  constructor() {
    super();
    this.init();
  }
  /** :8-14 */
  init() {
    this.select(false);
    new Color(this.background_mc).setRGB(this.bgColor);
  }
  /** :15-19 */
  select(bool: boolean) {
    if (this.selectRound) this.selectRound._visible = bool;
    this.bSelected = bool;
  }
  /** :20-31 */
  setEnabled(bool: boolean) {
    if (bool) this.onRelease = this.onClick;
    else delete this.onRelease;
  }
}
Interface_RadioButton.prototype.onClick = null;
registerClass("Interface::RadioButton", Interface_RadioButton);

/** Interface.ToolTip.as — box drawn around `txt` (Font3), shown after `interval` ms (default 300). */
export class ToolTip extends MovieClip {
  declare txt: TextField;
  declare visible: boolean;
  declare timer: number;
  constructor() {
    super();
    this.visible = false;
  }
  /** :7-75 (`undefinec` typo on :11 is an undefined variable: same test as `undefined`) */
  setText(text: unknown, x = 0, y = 0, bMouseOrigine?: boolean, bCenter?: boolean, interval?: number, bTopAlign?: boolean) {
    const top = bTopAlign ?? false, delay = interval ?? 300, t = this.txt, root = this._root;
    x = Number(x ?? 0);
    y = Number(y ?? 0);
    t.autoSize = true;
    t.setHtmlText(str(text), "Font3");
    this.lineStyle(1, 2236962);
    this.beginFill(13918, 80);
    this.moveTo(-1, 0);
    this.lineTo(t.textWidth + 4, 0);
    this.lineTo(t.textWidth + 4, t.textHeight + 2);
    this.lineTo(-1, t.textHeight + 2);
    this.lineTo(-1, 0);
    this.endFill();
    if (!top) this._x = !bMouseOrigine ? -t.textWidth + x : root._xmouse - t.textWidth + x;
    else this._x = !bMouseOrigine ? x : root._xmouse + x;
    if (bCenter) this._x += top ? -t.textWidth / 2 : t.textWidth / 2;
    if (!top) this._y = !bMouseOrigine ? -t.textHeight + y : root._ymouse - t.textHeight + y;
    else this._y = !bMouseOrigine ? y : root._ymouse + y;
    if (bMouseOrigine) this.startDrag(false);
    this._x = Math.ceil(this._x);
    this._y = Math.ceil(this._y);
    this.visible = true;
    this._visible = false;
    this.timer = getTimer();
    this.onEnterFrame = function (this: ToolTip) {
      if (getTimer() - this.timer > delay) {
        this._visible = true;
        delete this.onEnterFrame;
      }
    };
  }
}
registerClass("Interface::ToolTip", ToolTip);

/** Interface.Waiting.as — sprite 733: `open` @2, `close` @4, stop() on 1 and 3 (scripts.ts). */
export class UIWaitingClass extends MovieClip {
  /** :6-12 — frame 6 does not exist, so `open` always restarts (docs/logic/ui.md §6.2). */
  open() {
    if (this._currentframe !== 6) this.gotoAndPlay("open");
  }
  /** :13-19 */
  close() {
    if (this._currentframe !== 1) this.gotoAndPlay("close");
  }
}
registerClass("Interface::Waiting", UIWaitingClass);

/** Interface.Text.as — centred big message over the play area (h = 432) with optional fader and band. */
export class InterfaceText extends MovieClip {
  declare txtZone: Clip | undefined;
  declare back: Clip | undefined;
  declare intervalID: number | undefined;
  /** :6-71 */
  setText(text: unknown, bFader?: boolean, bBackground?: boolean) {
    if (bFader === undefined) bFader = true;
    const w = Stage.width, h = 432;
    let z: Clip | undefined;
    if (text !== undefined) {
      if (bBackground) {
        const b = this.createEmptyMovieClip("back", 1);
        b.beginFill(0, 40);
        b.moveTo(0, 0);
        b.lineTo(w, 0);
        b.lineTo(w, 60);
        b.lineTo(0, 60);
        b.endFill();
        b._y = h / 2 - 30;
      }
      z = this.createEmptyMovieClip("txtZone", 2);
      if (bFader) z._alpha = 0;
      z.attachMovie("Interface::Text::Clip", "sh1", 1, { _x: -1, _y: -1, text, color: 2236962 });
      z.attachMovie("Interface::Text::Clip", "sh2", 2, { _x: -1, _y: 1, text, color: 2236962 });
      z.attachMovie("Interface::Text::Clip", "sh3", 3, { _x: 1, _y: -1, text, color: 2236962 });
      z.attachMovie("Interface::Text::Clip", "sh4", 4, { _x: 1, _y: 1, text, color: 2236962 });
      z.attachMovie("Interface::Text::Clip", "txt", 5, { text, color: 16777215 });
      z._x = w / 2;
      z._y = (h - z._height) / 2;
    }
    if (bFader) {
      // `z` is a local of this call: with text undefined the closure animates nothing (AS: undefined.prop no-op)
      let i = 1, i2 = i * i, bEnd = false;
      if (z) z._alpha = 0;
      this.onEnterFrame = function (this: InterfaceText) {
        if (bEnd) delete this.onEnterFrame;
        else (i += 2), (i2 = i * i);
        if (z) {
          z._xscale = z._yscale = 200 - i2;
          z._alpha = i2;
          z._y = (h - z._height) / 2;
        }
        if (i2 >= 100) (i2 = 100), (bEnd = true);
      };
    }
  }
  /** :72-78 */
  setTextTimer(text: unknown, interval: number, bFader?: boolean, bBackground?: boolean) {
    this.setText(text, bFader, bBackground);
    clearInterval(this.intervalID);
    this.intervalID = setInterval(this, "clearText", interval);
  }
  /** :79-85 */
  clearText() {
    this.txtZone?.removeMovieClip();
    this.back?.removeMovieClip();
    clearInterval(this.intervalID);
  }
}
registerClass("Interface::Text", InterfaceText);

/** Interface.Text.Clip.as — one Font2 15 pt centred copy of the text (initObject `text`, `color`). */
export class InterfaceTextClip extends MovieClip {
  declare text: unknown;
  declare color: number;
  declare txt: TextField;
  constructor() {
    super();
    this.setText(this.text, this.color);
  }
  /** :8-23 */
  setText(text: unknown, color: number) {
    const f = new TextFormat();
    f.color = color;
    f.font = "Font2";
    f.size = 15;
    f.align = "center";
    this.createTextField("txt", 1, 0, 0, 0, 0);
    const t = this.txt;
    t.autoSize = "CENTER";
    t.selectable = false;
    t.multiline = true;
    t.text = str(text);
    t.setTextFormat(f);
    t.embedFonts = true;
  }
}
registerClass("Interface::Text::Clip", InterfaceTextClip);

/** Interface.Cursor.as — icon following the mouse; the next mouse-up clears it (one shot). */
export class InterfaceCursor extends MovieClip {
  declare iconFile: string;
  declare icon: Clip;
  declare forbidden: Clip | undefined;
  declare onClearCursor: (() => void) | undefined;
  constructor() {
    super();
    this.init(this.iconFile);
  }
  /** :7-29 */
  init(iconFile: string) {
    const icon = this.createEmptyMovieClip("icon", 1);
    icon._x = 10;
    icon._y = 20;
    icon._xscale = icon._yscale = 50;
    icon.onInitFrame = function (this: Clip) {
      const p = this._parent as InterfaceCursor;
      p.startDrag(true);
      p.onMouseUp = function (this: InterfaceCursor) {
        this.onClearCursor?.();
        G.INTERFACE.setCursor(null);
        delete this.onMouseUp;
      };
      Mouse.addListener(p);
    };
    icon.loadMovie(iconFile);
    this.setForbidden(true);
  }
  /** :30-40 */
  setForbidden(bool: boolean) {
    if (bool) this.attachMovie("forbidden", "forbidden", 2, { _x: 20, _y: 30 });
    else this.forbidden?.removeMovieClip();
  }
}
registerClass("Interface::Cursor", InterfaceCursor);

type BarParts = Clip & { back: Clip & { back: Clip; extremL: Clip; extremR: Clip }; front: Clip & { front: Clip; extremL: Clip; extremR: Clip } };
/** Interface.ProgressBar.as — also the XP bars. `x` given to init is the centre. */
export class Interface_ProgressBar extends MovieClip {
  declare backColor: number;
  declare bar: BarParts;
  declare txt: TextField | undefined;
  declare width: number;
  declare height: number;
  constructor() {
    super();
    this.backColor = 3355443;
    this.createEmptyMovieClip("bar", 1);
    this.bar.createEmptyMovieClip("back", 2);
    this.bar.createEmptyMovieClip("front", 3);
    this.bar.back.attachMovie("ProgressBar::bar", "back", 1);
    this.bar.back.attachMovie("ProgressBar::extremBar", "extremL", 2);
    this.bar.back.attachMovie("ProgressBar::extremBar", "extremR", 3);
    this.bar.front.attachMovie("ProgressBar::bar", "front", 1);
    this.bar.front.attachMovie("ProgressBar::extremBar", "extremL", 2);
    this.bar.front.attachMovie("ProgressBar::extremBar", "extremR", 3);
  }
  /** :17-56 */
  init(width: number, height: number, x?: number, y?: number, text?: string) {
    if (text !== undefined) {
      const tf = new TextFormat();
      tf.color = 16777215;
      tf.font = "Font2";
      tf.italic = true;
      tf.size = 11;
      const t = this.createTextField("txt", 2, width / 2, 0, 0, 0);
      t.autoSize = "CENTER";
      t.selectable = false;
      t.text = text;
      t.setTextFormat(tf);
      t._y = t.textHeight;
      t.embedFonts = true;
    }
    this.width = width;
    this.height = height;
    if (x) this._x = x - width / 2;
    if (y) this._y = y;
    this.drawBack();
    this.drawFront(0);
    const f = this.bar.front;
    f.front._height = this.height;
    f.extremL._width = this.height / 2;
    f.extremL._height = this.height;
    f.extremR._width = this.height / 2;
    f.extremR._height = this.height;
    f.extremR._xscale = -f.extremR._xscale;
  }
  /** :57-76 */
  drawBack() {
    const b = this.bar.back;
    b.back._width = this.width;
    b.back._height = this.height;
    new Color(b.back).setRGB(this.backColor);
    b.extremL._width = this.height / 2;
    b.extremL._height = this.height;
    new Color(b.extremL).setRGB(this.backColor);
    b.extremR._width = this.height / 2;
    b.extremR._height = this.height;
    b.extremR._xscale = -b.extremR._xscale;
    b.extremR._x = this.width;
    new Color(b.extremR).setRGB(this.backColor);
  }
  /** :77-91 */
  drawFront(value: number) {
    if (value === 0) this.bar.front._visible = false;
    else {
      this.bar.front._visible = true;
      this.bar.front.front._width = value;
      this.bar.front.extremR._x = value;
    }
  }
  /** :92-110 — ignores v < 0 and max 0/undefined. */
  update(value?: number, max?: number) {
    if (value !== undefined && value >= 0 && max !== undefined && max !== 0) this.drawFront(Math.ceil((value * this.width) / max));
  }
}
registerClass("Interface::ProgressBar", Interface_ProgressBar);

/** Interface.ButtonMute.as — param `backSymbol`; `onChange(bSelected)` assigned by the owner. */
export class Interface_ButtonMute extends MovieClip {
  declare backSymbol: string;
  declare background_mc: Clip;
  declare active_mc: Clip;
  declare bSelected: boolean;
  declare tooltipText: unknown;
  declare onChange: ((b: boolean) => void) | null;
  constructor() {
    super();
    this.init();
  }
  /** :8-14 */
  init() {
    this.attachMovie(this.backSymbol, "background_mc", 10);
    this.active_mc.swapDepths(20);
    this.select(false);
  }
  /** :15-19 */
  select(bool: boolean) {
    this.active_mc._visible = bool;
    this.bSelected = bool;
  }
  /** :20-42 */
  setEnabled(bool: boolean) {
    if (bool) {
      this.onRelease = this.Release;
      this.onRollOver = function (this: Interface_ButtonMute) {
        G.INTERFACE.drawToolTip(this.tooltipText, -110, 20, true, undefined, undefined, true);
        if (this.background_mc) this.background_mc._xscale = this.background_mc._yscale = 110;
      };
      this.onRollOut = this.onReleaseOutside = function (this: Interface_ButtonMute) {
        G.INTERFACE.hideToolTip();
        if (this.background_mc) this.background_mc._xscale = this.background_mc._yscale = 100;
      };
    } else delete this.onRelease;
  }
  /** :43-46 */
  setToolTip(txt: unknown) {
    this.tooltipText = txt;
  }
  /** :47-52 */
  Release() {
    this.select(!this.bSelected);
    this.onChange?.(this.bSelected);
  }
}
Interface_ButtonMute.prototype.onChange = null;
registerClass("Interface::ButtonMute", Interface_ButtonMute);

/** Interface.VolumeGauge.as — params maxValue, divisionCount, defaultColor, activeColor; `onChange(value)`. */
export class VolumeGauge extends MovieClip {
  declare maxValue: number;
  declare divisionCount: number;
  declare defaultColor: number;
  declare activeColor: number;
  declare width: number;
  declare height: number;
  declare deadView_mc: Clip | undefined;
  declare Markers: Clip;
  declare onChange: ((value: number) => void) | null;
  constructor() {
    super();
    this.init();
  }
  /** :8-29 */
  init() {
    this.setSize(this._width, this._height);
    const m = this.createEmptyMovieClip("Markers", 10);
    const divH = this.maxValue / this.divisionCount, divW = this.width / (this.divisionCount + 1);
    for (let i = 0; i <= this.divisionCount; i++) {
      const mk = m.attachMovie("Interface::VolumeGaugeMarker", "marker" + i, i, { _x: i * divW, width: divW, height: this.height, index: i, value: i * divH, maxValue: this.maxValue, owner: this }) as VolumeGaugeMarker;
      mk.innerOnChangeValue = function (this: VolumeGaugeMarker) {
        (this.owner as VolumeGauge).innerOnChange(this);
      };
      mk.setSkinColor(this.defaultColor);
    }
  }
  /** :30-38 */
  setSize(w: number, h: number) {
    this._xscale = this._yscale = 100;
    this.width = w;
    this.height = h;
    this.deadView_mc?.swapDepths(0);
    this.deadView_mc?.removeMovieClip();
  }
  /** :39-49 */
  setValue(value: number) {
    if (!(value < 0 || value > this.maxValue)) this.setMarkersActiveAt(Math.ceil((this.divisionCount * value) / this.maxValue));
  }
  /** :50-69 */
  setMarkersActiveAt(index: number) {
    let i = 0;
    for (; i <= index; i++) (this.Markers["marker" + i] as VolumeGaugeMarker | undefined)?.setSkinColor(this.activeColor);
    for (; i <= this.divisionCount; i++) (this.Markers["marker" + i] as VolumeGaugeMarker | undefined)?.setSkinColor(this.defaultColor);
  }
  /** :70-74 */
  innerOnChange(marker: VolumeGaugeMarker) {
    this.setMarkersActiveAt(marker.index);
    this.onChange?.(marker.value);
  }
}
VolumeGauge.prototype.onChange = null;
registerClass("Interface::VolumeGauge", VolumeGauge);

/** Interface.VolumeGaugeMarker.as — initObject width, height, index, value, maxValue, owner. */
export class VolumeGaugeMarker extends MovieClip {
  declare width: number;
  declare height: number;
  declare index: number;
  declare value: number;
  declare maxValue: number;
  declare owner: unknown;
  declare back: Clip;
  declare skin: Clip;
  declare innerOnChangeValue: (() => void) | null;
  constructor() {
    super();
    this.init();
  }
  /** :8-19 */
  init() {
    this.trackAsMenu = true;
    this.attachMovie("GaugeMarkerBack", "back", 10);
    this.back._width = this.width;
    this.back._height = this.height;
    this.attachMovie("GaugeMarkerSkin", "skin", 20, { _x: 1 });
    this.skin._width = this.width - 2;
    this.skin._height = this.height * (this.value / this.maxValue);
    this.skin._y = this.height - this.skin._height;
  }
  /** :20-24 */
  setSkinColor(col: number) {
    new Color(this.skin).setRGB(col);
  }
  /** :25-28 */
  onDragOver() {
    this.innerOnChangeValue?.();
  }
  /** :29-32 */
  onPress() {
    this.innerOnChangeValue?.();
  }
}
VolumeGaugeMarker.prototype.innerOnChangeValue = null;
registerClass("Interface::VolumeGaugeMarker", VolumeGaugeMarker);

/** fpsDetectorSymbol.as — `fps` is bound to the symbol's EditText variable. */
export class fpsDetector extends MovieClip {
  declare saveTime: number;
  declare fps: number;
  constructor() {
    super();
    this.saveTime = getTimer();
    Stage.addListener(this);
  }
  /** :8-14 */
  onEnterFrame() {
    const dt = getTimer() - this.saveTime;
    this.fps = Math.round(1 / (dt / 1000));
    this.saveTime = getTimer();
  }
  /** :15-19 (never fires: fixed stage) */
  onResize() {
    this._x = 30;
    this._y = 0;
  }
}
registerClass("fpsDetectorSymbol", fpsDetector);

/** Com.GenericButton.as — exported, never attached or placed (docs/logic/ui.md §2.16). */
export class GenericButton extends MovieClip {
  declare labelformat: TextFormat;
  declare txtLabel: TextField;
  declare mask: Clip;
  declare lastState: string | undefined;
  declare onAction: (() => void) | undefined;
  constructor() {
    super();
    this.labelformat = new TextFormat();
    this.labelformat.font = "Verdana";
    this.labelformat.size = 11;
    this.labelformat.color = 16777215;
    this.labelformat.bold = true;
    this.attachMovie("backOutSymbol", "backOut", 1);
    this.attachMovie("backOverSymbol", "backOver", 2);
    this.attachMovie("backPressSymbol", "backPress", 3);
    for (const k of ["backOut", "backOver", "backPress"]) if (this[k] instanceof MovieClip) (this[k] as Clip)._visible = false;
    this.createTextField("txtLabel", 4, 0, 0, 0, 0);
    this.txtLabel.selectable = false;
    this.changeState("Out");
    this.setEnabled(true);
  }
  /** :22-28 */
  changeState(state: string) {
    const on = this["back" + state], off = this["back" + this.lastState];
    if (on instanceof MovieClip) on._visible = true;
    if (off instanceof MovieClip) off._visible = false;
    this.lastState = state;
  }
  /** :29-37 (reads `labelFormat`: case-insensitive `labelformat`) */
  setLabel(label: string) {
    const t = this.txtLabel;
    t.autoSize = "center";
    t.text = label;
    t.setTextFormat(this.labelformat);
    t._x = -t.textWidth / 2 - 2;
    t._y = -t.textHeight / 2 - 2;
  }
  /** :38-44 */
  KeyUp() {
    if (Key.getCode() === 13) (this.onRelease as (() => void) | undefined)?.call(this);
  }
  /** :45-85 */
  setEnabled(bool: boolean) {
    const m = this.attachMovie("maskSymbol", "mask", 5);
    if (!m) return;
    if (bool) {
      m.onRollOver = m.onDragOver = function (this: Clip) { (this._parent as GenericButton).changeState("Over"); };
      m.onRollOut = m.onDragOut = function (this: Clip) { (this._parent as GenericButton).changeState("Out"); };
      m.onPress = function (this: Clip) { (this._parent as GenericButton).changeState("Press"); };
      m.onRelease = m.onReleaseOutside = function (this: Clip) {
        const p = this._parent as GenericButton;
        p.changeState("Over");
        p.onAction?.();
      };
    } else {
      new Color(m).setTransform({ ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0, aa: 50, ab: 100 });
      for (const k of ["onRollOver", "onDragOver", "onRollOut", "onDragOut", "onPress", "onRelease", "onReleaseOutside"]) delete m[k];
    }
  }
}
registerClass("Com::GenericButton", GenericButton);

/** PalletsColorSelectorSymbol.as — 20 fixed colours (dead creation screen only, docs/logic/ui.md §2.6). */
export class PalletsColorSelectorClass extends MovieClip {
  declare back: Clip;
  declare top: Clip;
  declare onSelectRelease: ((color: number) => void) | undefined;
  constructor() {
    super();
    this.createEmptyMovieClip("back", 1);
    this.createEmptyMovieClip("top", 2);
    let rot = 0;
    for (let i = 0; i < 20; i++) {
      const cs = this.back.attachMovie("ColorSelectorSymbol", "cs" + i, i);
      if (cs) cs._rotation = rot;
      const b = this.top.attachMovie("btnColorSelectorSymbol", "btncs" + i, i);
      if (b) {
        b._rotation = rot;
        b.onRelease = function (this: Clip) {
          (this._parent?._parent as PalletsColorSelectorClass | undefined)?.onSelectRelease?.(this.colorValue as number);
        };
      }
      rot += 5;
    }
    this.setColors([0, 6312024, 1057164, 4078462, 5594016, 3372031, 7836752, 9022264, 9915938, 13260056, 14310932, 15755809, 16678400, 16466433, 14393109, 15975946, 16777166, 16777215, 16751052, 16711782]);
  }
  /** :28-46 */
  setColors(colors: number[]) {
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i]!, cs = this.back["cs" + i];
      new Color(cs).setTransform({ ra: 0, rb: (c & 0xff0000) >> 16, ga: 0, gb: (c & 0xff00) >> 8, ba: 0, bb: c & 0xff, aa: 100, ab: 0 });
      const b = this.top["btncs" + i];
      if (b instanceof MovieClip) b.colorValue = c;
    }
  }
}
registerClass("PalletsColorSelectorSymbol", PalletsColorSelectorClass);
