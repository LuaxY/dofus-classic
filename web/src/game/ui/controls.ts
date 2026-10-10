// Ank::Dofus::{PushButton,ListBox,ComboBox,ScrollBar}: Macromedia FPushButton/FListBox/FComboBox/FScrollBar renamed
// by Ankama (docs/logic/ui.md §3). Component parameters (label, itemSymbol, labels, data, _targetInstanceName…) come
// from the placements' `on(initialize)` clip actions, which run before these constructors.
import { toNumber } from "../../core/swf6.ts";
import { clearInterval, Key, MovieClip, registerClass, Selection, setInterval, Stage, TextField, TextFormat } from "../../runtime/player.ts";
import { FLabelClass, FScrollSelectListClass, FUIComponentClass, type FComboBoxItemClass, type ListItem, type ListScrollBar, type ModelEvent } from "./framework.ts";

// ---- Ank.Dofus.PushButton.as — FPushButtonClass ----------------------------------------------------------------
type FaceClip = MovieClip & Record<"mc_faceLeft" | "mc_faceMiddle" | "mc_faceRight" | "mc_lightRight", MovieClip>;
export class FPushButtonClass extends FUIComponentClass {
  declare label: string | undefined;
  declare clickHandler: string | undefined;
  declare labelClipSymbol: string;
  declare boundingBox_mc: MovieClip | undefined;
  declare fpbState_mc: MovieClip;
  declare fLabel_mc: FLabelClass;
  declare fpb_hitArea_mc: MovieClip;
  declare btnState: boolean;
  declare incrVal: number;
  declare initx: number;
  declare inity: number;
  declare togx: number;
  declare togy: number;
  declare pressOnce: number | undefined;

  constructor() {
    super();
    this.init();
  }
  /** :7-37 (accessibility lines dropped) */
  init() {
    super.setSize(this._width, this._height);
    this.boundingBox_mc?.unloadMovie();
    this.attachMovie("fpb_states", "fpbState_mc", 1);
    this.attachMovie(this.labelClipSymbol, "fLabel_mc", 2);
    this.attachMovie("fpb_hitArea", "fpb_hitArea_mc", 3);
    super.init();
    this.btnState = false;
    this.setClickHandler(this.clickHandler);
    this._xscale = 100;
    this._yscale = 100;
    this.setSize(this.width, this.height);
    this.textStyle = new TextFormat();
    if (this.label !== undefined) this.setLabel(this.label);
  }
  /** :38-45 */
  setHitArea(w: number, h?: number) {
    const a = this.fpb_hitArea_mc;
    if (!a) return;
    this.hitArea = a;
    a._visible = false;
    a._width = w;
    a._height = arguments.length <= 1 ? a._height : (h as number);
  }
  /** :46-71 */
  setSize(w: number, h?: number) {
    w = w >= 6 ? w : 6;
    if (arguments.length > 1 && (h as number) < 6) h = 6;
    super.setSize(w, h);
    this.setLabel(this.getLabel());
    this.arrangeLabel();
    this.setHitArea(w, h);
    if (this.boundingBox_mc) (this.boundingBox_mc._width = w), (this.boundingBox_mc._height = h as number);
    this.drawFrame();
    if (this.focused) super.myOnSetFocus();
    this.initContentPos("fLabel_mc");
  }
  /** :72-82 */
  arrangeLabel() {
    const l = this.fLabel_mc;
    if (!l?.labelField) return;
    l.setSize(this.width - 2 - 4);
    l._x = 3;
    l._y = this.height / 2 - l._height / 2;
  }
  /** :83-86 */
  getLabel(): string | undefined {
    return this.fLabel_mc?.labelField?.text;
  }
  /** :87-97 */
  setLabel(label: unknown) {
    this.fLabel_mc?.setLabel?.(label);
    this.txtFormat();
    this.arrangeLabel();
  }
  /** :98-101 */
  getEnabled() {
    return this.enabled as boolean;
  }
  /** :102-121 — `gotoFrame` does not exist (no-op), so the disabled skin (fpb_states frame 4) is never shown. */
  setEnabled(enable?: boolean) {
    const on = enable || enable === undefined;
    this.drawFrame();
    this.fLabel_mc?.setEnabled?.(on);
    this.enabled = on;
    super.setEnabled(on);
  }
  /**
   * :122-143 — labels are Font2 white centred (setTextFormat after every setLabel). `init` reaches this through
   * setSize → setLabel before it creates `textStyle`: SWF 6 ignores the writes to `undefined` and runs the rest.
   */
  txtFormat() {
    const s = this.textStyle, t = this.styleTable;
    if (s) {
      s.font = "Font2";
      s.color = 16777215;
      s.align = t.textAlign?.value !== undefined ? null : "center";
      s.leftMargin = t.textLeftMargin?.value !== undefined ? null : 1;
      s.rightMargin = t.textRightMargin?.value !== undefined ? null : 1;
    }
    const lh = this.fLabel_mc?._height ?? 0;
    super.setSize(this.width, lh > this.height ? lh : this.height);
    if (this.fLabel_mc?.labelField) {
      if (s) this.fLabel_mc.labelField.setTextFormat(s);
      this.fLabel_mc.labelField.embedFonts = true;
    }
    this.setEnabled(this.enable);
  }
  /** :144-154 */
  drawFrame() {
    const st = this.fpbState_mc;
    if (!st) return;
    const f = st[["up_mc", "over_mc", "down_mc", "disabled_mc"][st._currentframe - 1]!] as FaceClip | undefined;
    if (!f) return;
    f.mc_faceMiddle._x = f.mc_faceLeft._width;
    f.mc_faceMiddle._width = this.width - f.mc_faceLeft._width - f.mc_faceRight._width;
    f.mc_faceRight._x = this.width;
    f.mc_lightRight._x = this.width;
  }
  /** :155-160 */
  setClickHandler(chng: string | undefined, obj?: unknown) {
    this.handlerObj = arguments.length >= 2 ? obj : this._parent;
    this.clickHandler = chng;
  }
  /** :161-165 — every Dofus instance has clickHandler "": a no-op; behaviour comes from on(release) clip actions. */
  executeCallBack() {
    const o = this.handlerObj as Record<string, unknown> | undefined, f = this.clickHandler === undefined ? undefined : o?.[this.clickHandler];
    if (typeof f === "function") f.call(o, this);
  }
  /** :166-174 */
  initContentPos(mc: string) {
    const c = this[mc] as MovieClip | undefined;
    this.incrVal = 1;
    this.initx = toNumber(c?._x) - (this.getBtnState() !== true ? 0 : this.incrVal);
    this.inity = toNumber(c?._y) - (this.getBtnState() !== true ? 0 : this.incrVal);
    this.togx = this.initx + this.incrVal;
    this.togy = this.inity + this.incrVal;
  }
  /** :175-182 */
  setBtnState(state: boolean) {
    this.btnState = state;
  }
  getBtnState() {
    return this.btnState;
  }
  /** :183-187 */
  myOnSetFocus() {
    this.focused = true;
    super.myOnSetFocus();
  }
  /** :188-199 */
  onPress() {
    this.pressFocus();
    this.fpbState_mc.gotoAndStop(3);
    this.drawFrame();
    this.setBtnState(true);
  }
  /** :200-211 */
  onRelease() {
    this.fpbState_mc.gotoAndStop(2);
    this.drawFrame();
    this.executeCallBack();
    this.setBtnState(false);
  }
  /** :212-221 */
  onRollOver() {
    this.fpbState_mc.gotoAndStop(2);
    this.drawFrame();
  }
  onRollOut() {
    this.fpbState_mc.gotoAndStop(1);
    this.drawFrame();
  }
  /** :222-242 */
  onReleaseOutside() {
    this.setBtnState(false);
    this.fpbState_mc.gotoAndStop(1);
    this.drawFrame();
  }
  onDragOut() {
    this.setBtnState(false);
    this.fpbState_mc.gotoAndStop(1);
    this.drawFrame();
  }
  onDragOver() {
    this.setBtnState(true);
    this.fpbState_mc.gotoAndStop(3);
    this.drawFrame();
  }
  /** :243-259 — Space presses the focused button. */
  myOnKeyDown() {
    if (Key.getCode() === 32 && this.pressOnce === undefined) {
      this.onPress();
      this.pressOnce = 1;
    }
  }
  myOnKeyUp() {
    if (Key.getCode() === 32) {
      this.onRelease();
      this.pressOnce = undefined;
    }
  }
}
registerClass("Ank::Dofus::PushButton", FPushButtonClass);

// ---- Ank.Dofus.ListBox.as — FListBoxClass ------------------------------------------------------------------------
export class FListBoxClass extends FScrollSelectListClass {
  declare extScrollBar: string | undefined;
  declare selectMultiple: boolean | undefined;
  declare labels: unknown[] | undefined;
  declare data: unknown[] | undefined;
  declare clickFilter: boolean | undefined;

  /** :1-25 */
  constructor() {
    super();
    this.init();
    const ext = this.extScrollBar === undefined ? undefined : this._parent?.[this.extScrollBar];
    if (ext !== undefined) this.setExtScrollBar(ext as ListScrollBar);
    this.permaScrollBar = true;
    for (let i = 0; i < (this.labels?.length ?? 0); i++) this.addItem(this.labels![i], this.data?.[i]);
    this.boundingBox_mc?.gotoAndStop(1);
    this.width = this._width;
    this.height = this._height;
    this._yscale = this._xscale = 100;
    this.setSize(this.width, this.height);
    if ((this.changeHandler?.length ?? 0) > 0) this.setChangeHandler(this.changeHandler);
  }
  /** :28-41 */
  getSelectedIndices(): (number | undefined)[] | undefined {
    const out: (number | undefined)[] = [];
    for (const k in this.selected) out.push(this.selected[k]?.sIndex);
    return out.length <= 0 ? undefined : out;
  }
  /** :42-57 */
  getSelectedItems(): (ListItem | undefined)[] | undefined {
    const out = (this.getSelectedIndices() ?? []).map((i) => this.getItemAt(i));
    return out.length <= 0 ? undefined : out;
  }
  /** :58-65 */
  getSelectMultiple() {
    return this.selectMultiple;
  }
  getRowCount() {
    return this.numDisplayed;
  }
  /** :66-78 */
  setSelectedIndices(indexArray: number[]) {
    this.clearSelected();
    for (const i of indexArray) this.selectItem(i, true);
    this.updateControl();
  }
  /** :79-96 */
  setSelectMultiple(flag: boolean) {
    this.selectMultiple = flag;
  }
  setRowCount(count: number) {
    this.setSize(this.width, count * (this.itmHgt - 2) + 2);
  }
  setWidth(wdt: number) {
    this.setSize(wdt, this.height);
  }
  setExtScrollBar(extScrollBar: ListScrollBar) {
    this.extScrollBar_mc = extScrollBar;
  }
  /** :97-114 — rebuilds the rows: numDisplayed = floor(h / (itmHgt - 2)). */
  setSize(w: number, h?: number) {
    if (!this.enable) return;
    w = Math.max(w, 20);
    h = Math.max(h as number, 40);
    this.container_mc?.removeMovieClip();
    this.container_mc = this.createEmptyMovieClip("container", 3);
    this.measureItmHgt();
    this.numDisplayed = Math.floor(h / (this.itmHgt - 2));
    this.height = this.numDisplayed * (this.itmHgt - 2) + 2;
    this.popupWidth = w;
    super.setSize(w, this.height);
  }
  /** :115-119 */
  removeItemAt(index: number) {
    this.selectHolder = this.getSelectedIndices();
    return super.removeItemAt(index);
  }
  /** :120-183 — Ctrl/Shift multi-select. The very first call only arms `clickFilter`: a list's first click does not select. */
  selectionHandler(itemNum: number) {
    if (!this.clickFilter) return void (this.clickFilter = true);
    const idx = this.topDisplayed + itemNum;
    if (this.getItemAt(idx) === undefined) return void (this.changeFlag = false);
    this.changeFlag = true;
    if ((!this.selectMultiple && !Key.isDown(17)) || (!Key.isDown(16) && !Key.isDown(17))) {
      this.clearSelected();
      this.selectItem(idx, true);
      this.lastSelected = idx;
      this.item(itemNum)?.drawItem(this.getItemAt(idx), this.isSelected(idx));
    } else if (Key.isDown(16) && this.selectMultiple) {
      if (this.lastSelected === -1) this.lastSelected = idx;
      const last = toNumber(this.lastSelected), incr = last >= idx ? -1 : 1;
      this.clearSelected();
      for (let i = last; i !== idx; i += incr) {
        this.selectItem(i, true);
        if (i >= this.topDisplayed && i < this.topDisplayed + this.numDisplayed) this.item(i - this.topDisplayed)?.drawItem(this.getItemAt(i), this.isSelected(i));
      }
      this.selectItem(idx, true);
      this.item(idx - this.topDisplayed)?.drawItem(this.getItemAt(idx), this.isSelected(idx));
    } else if (Key.isDown(17)) {
      const was = this.isSelected(idx);
      if (!this.selectMultiple) this.clearSelected();
      if (!(!this.selectMultiple && was)) {
        this.selectItem(idx, !was);
        this.item(itemNum)?.drawItem(this.getItemAt(idx), this.isSelected(idx));
      }
      this.lastSelected = idx;
    }
  }
  /** :184-188 */
  moveSelBy(itemNum: number) {
    super.moveSelBy(itemNum);
    this.releaseHandler();
  }
}
registerClass("Ank::Dofus::ListBox", FListBoxClass);

// ---- Ank.Dofus.ComboBox.as — FComboBoxClass ------------------------------------------------------------------------
let popUpLevel: number | undefined; // `_global._popUpLevel`
type Back = MovieClip & Record<"mc_back_left" | "mc_back_middle" | "mc_back_right", MovieClip>;
type LabelText = TextField & { onKeyDown?: () => void };
export class FComboBoxClass extends FScrollSelectListClass {
  declare superHolder: MovieClip;
  declare rowCount: number;
  declare editable: boolean;
  declare labels: unknown[] | undefined;
  declare data: unknown[] | undefined;
  declare proxyBox_mc: MovieClip;
  declare opened: boolean;
  declare value: unknown;
  declare topLabel: ListItem | undefined;
  declare fLabel_mc: FComboBoxItemClass & FLabelClass;
  declare fLabel_txt: LabelText | undefined;
  declare downArrow: MovieClip;
  declare backGround: Back;
  declare popupX: number;
  declare fader: MovieClip;
  declare upward: boolean;
  declare fadeRate: number | undefined;
  declare time: number;
  declare const: number;
  declare clickFilter: boolean;
  /** Game flag the screens set around programmatic changes (S430/CB_80 load). */
  declare enabledEvent: boolean | undefined;

  /** :1-53 — popups go into `_root.superHolder<N>`, or the combo's parent when `_root` cannot attach the symbol. */
  constructor() {
    super();
    popUpLevel = popUpLevel !== undefined ? popUpLevel + 1 : 20000;
    this.superHolder = this._root.createEmptyMovieClip("superHolder" + popUpLevel, popUpLevel);
    const test = this.superHolder.createEmptyMovieClip("testCont", 20000);
    const testBox = test.attachMovie("FBoundingBoxSymbol", "boundingBox_mc", 0);
    if (testBox?._name === undefined) {
      this.superHolder.removeMovieClip();
      this.superHolder = this._parent!.createEmptyMovieClip("superHolder" + popUpLevel, popUpLevel);
    } else test.removeMovieClip();
    if (this.rowCount === undefined) {
      this.rowCount = 8;
      this.editable = false;
    }
    this.itemSymbol = "FComboBoxItemSymbol";
    this.init();
    this.permaScrollBar = false;
    this.proxyBox_mc.gotoAndStop(1);
    this.proxyBox_mc._visible = false;
    this.width = this._width;
    this.height = (this.proxyBox_mc._height * this._yscale) / 100;
    for (let i = 0; i < (this.labels?.length ?? 0); i++) this.addItem(this.labels![i], this.data?.[i]);
    this.lastSelected = 0;
    this.selectItem(0); // flag undefined → the delete branch
    this._xscale = this._yscale = 100;
    this.opened = false;
    this.setSize(this.width);
    this.highlightTop(false);
    if ((this.changeHandler?.length ?? 0) > 0) this.setChangeHandler(this.changeHandler);
    this.onUnload = function (this: FComboBoxClass) {
      this.superHolder.removeMovieClip();
    };
    this.setSelectedIndex(0, false);
    this.value = "";
    this.focusEnabled = true;
    this.changeFlag = false;
  }
  /** :56-81 */
  modelChanged(eventObj: ModelEvent) {
    super.modelChanged(eventObj);
    const e = eventObj.event;
    if (e === "addRows" || e === "deleteRows") {
      const diff = toNumber(eventObj.lastRow) - toNumber(eventObj.firstRow) + 1, mode = e !== "addRows" ? -1 : 1;
      const len = this.getLength(), lenBefore = len - mode * diff;
      if (this.rowCount > lenBefore || this.rowCount > len) this.invalidate("setSize");
      if (this.getSelectedIndex() === undefined) this.setSelectedIndex(0, false);
    } else if (e === "updateAll") this.invalidate("setSize");
  }
  /** :82-94 */
  removeAll() {
    if (!this.enable) return;
    super.removeAll();
    if (this.editable) this.value = "";
    this.invalidate("setSize");
  }
  /** :95-143 */
  setSize(w: number) {
    if (w === undefined || typeof w !== "number" || w <= 0 || !this.enable) return;
    this.container_mc?.removeMovieClip();
    this.itmHgt = 22;
    this.container_mc = this.superHolder.createEmptyMovieClip("container", 3);
    this.container_mc.tabChildren = false;
    this.setPopUpLocation(this.container_mc);
    this.container_mc.attachMovie("FBoundingBoxSymbol", "boundingBox_mc", 0);
    this.boundingBox_mc = this.container_mc.boundingBox_mc as MovieClip | undefined;
    if (this.boundingBox_mc) this.boundingBox_mc.component = this;
    this.registerSkinElement(this.boundingBox_mc?.boundingBox, "background");
    this.proxyBox_mc._height = this.itmHgt;
    this.numDisplayed = Math.min(this.rowCount, this.getLength());
    if (this.numDisplayed < 3) this.numDisplayed = Math.min(3, this.getLength());
    this.height = this.numDisplayed * (this.itmHgt - 2) + 2;
    super.setSize(w, this.height);
    const a = this.attachMovie("DownArrowComboBox", "downArrow", 10)!;
    a._y = 0;
    a._width = this.itmHgt;
    a._height = this.itmHgt;
    a._x = w - a._width;
    this.setEditable(this.editable);
    this.container_mc._visible = this.opened;
    this.highlightTop(false);
    this.attachMovie("BackgroundComboBox", "backGround", 1); // linkage "BackGroundComboBox" (case-insensitive)
    const b = this.backGround;
    b._y = 0;
    b.mc_back_middle._x = b.mc_back_left._width;
    b.mc_back_middle._width = w - b.mc_back_left._width - b.mc_back_right._width;
    b.mc_back_right._x = b.mc_back_left._width + b.mc_back_middle._width;
    this.popupWidth = w - b.mc_back_left._width - a._width;
    this.popupX = b.mc_back_left._width;
    this.fader = this.superHolder.attachMovie("FBoundingBoxSymbol", "faderX", 4)!;
    this.registerSkinElement(this.fader.boundingBox, "background");
    this.fader._width = this.popupWidth;
    this.fader._height = this.height;
    this.fader._visible = false;
    this.proxyBox_mc._width = this.popupWidth;
    this.proxyBox_mc._x = this.popupX;
  }
  /** :144-149 */
  setDataProvider(dp: unknown) {
    super.setDataProvider(dp);
    this.invalidate("setSize");
    this.setSelectedIndex(0);
  }
  /** :150-157 — editable: the displayed label text (free text). */
  getValue(): unknown {
    if (this.editable) return this.fLabel_mc.getLabel();
    return super.getValue();
  }
  /** :158-174 */
  getRowCount() {
    return this.rowCount;
  }
  setRowCount(count: number) {
    this.rowCount = this.getLength() <= count ? count : Math.max(count, 3);
    this.setSize(this.width);
    const len = this.getLength();
    if (len - this.getScrollPosition() < this.rowCount) {
      this.setScrollPosition(len - Math.min(this.rowCount, len));
      this.invalidate("updateControl");
    }
  }
  /** :175-217 */
  setEditable(editableFlag: boolean) {
    if (!this.enable) return;
    this.editable = editableFlag;
    if (!this.editable) {
      this.onPress = this.pressHandler;
      this.useHandCursor = false;
      this.trackAsMenu = true;
      this.attachMovie("FComboBoxItemSymbol", "fLabel_mc", 5, { controller: this, itemNum: -1 });
      this.fLabel_mc.onRollOver = undefined;
      this.fLabel_mc.setSize(this.popupWidth, this.itmHgt);
      this.topLabel = this.getSelectedItem();
      this.fLabel_mc.drawItem(this.topLabel, false);
      this.highlightTop(false);
    } else {
      this.attachMovie("FLabelSymbol", "fLabel_mc", 5);
      const t = (this.fLabel_txt = this.fLabel_mc.labelField as LabelText);
      t.type = "input";
      t._x = this.popupX;
      t.onSetFocus = this.onLabelFocus;
      this.fLabel_mc.setSize(this.popupWidth);
      delete this.onPress;
      t.onKillFocus = function (this: TextField) {
        (this._parent?._parent as FComboBoxClass | undefined)?.myOnKillFocus();
      };
      this.fLabel_mc.setLabel(this.value);
      this.fLabel_mc.setColor(16777215);
      t.onChanged = function (this: TextField) {
        (this._parent?._parent as FComboBoxClass | undefined)?.findInputText();
      };
      this.downArrow.onPress = this.buttonPressHandler;
      this.downArrow.useHandCursor = false;
      this.downArrow.trackAsMenu = true;
    }
  }
  /** :218-239 */
  setEnabled(enabledFlag?: boolean) {
    const on = !(enabledFlag === undefined || typeof enabledFlag !== "boolean") ? enabledFlag : true;
    super.setEnabled(on);
    this.registerSkinElement(this.boundingBox_mc?.boundingBox, "background");
    this.proxyBox_mc.gotoAndStop(!this.enable ? "disabled" : "enabled");
    this.downArrow?.gotoAndStop(!this.enable ? 3 : 1);
    if (this.editable) {
      if (this.fLabel_txt) (this.fLabel_txt.type = !on ? "dynamic" : "input"), (this.fLabel_txt.selectable = on);
    } else if (on) {
      this.fLabel_mc?.drawItem(this.topLabel, false);
      this.setSelectedIndex(this.getSelectedIndex(), false);
    }
    this.fLabel_mc?.setEnabled(this.enable);
    if (this.fLabel_txt) this.fLabel_txt.onSetFocus = !on ? undefined : this.onLabelFocus;
  }
  /** :240-255 — editable: `value` = selected label only when flag is undefined. */
  setSelectedIndex(index: number | undefined, flag?: boolean) {
    super.setSelectedIndex(index, flag);
    if (!this.editable) {
      this.topLabel = this.getSelectedItem();
      this.fLabel_mc?.drawItem(this.topLabel, false);
    } else {
      this.value = flag === undefined ? this.getSelectedItem()?.label : "";
      this.fLabel_mc?.setLabel(this.value);
    }
    this.invalidate("updateControl");
  }
  /** :256-264 */
  setValue(value: unknown) {
    if (!this.editable) return;
    this.fLabel_mc.setLabel(value);
    this.value = value;
  }
  /** :265-294 */
  pressHandler() {
    this.focusRect?.removeMovieClip();
    if (!this.enable) return;
    this.onMouseUp = !this.opened ? this.releaseHandler : undefined;
    this.changeFlag = false;
    if (!this.focused) {
      this.pressFocus();
      this.clickFilter = !this.editable ? true : false;
    }
    if (!this.clickFilter) this.openOrClose(!this.opened);
    else this.clickFilter = false;
  }
  /** :295-309 */
  clickHandler(itmNum: number) {
    if (!this.focused) {
      if (this.editable && this.fLabel_txt) this.fLabel_txt.onKillFocus = undefined;
      this.pressFocus();
    }
    super.clickHandler(itmNum);
    this.selectionHandler(itmNum);
    this.onMouseUp = this.releaseHandler;
  }
  /** :310-317 */
  highlightTop(flag: boolean) {
    if (!this.editable) this.fLabel_mc?.drawItem?.(this.topLabel, flag);
  }
  /** :318-323 */
  myOnSetFocus() {
    super.myOnSetFocus();
    this.fLabel_mc?.highlight_mc?.gotoAndStop("enabled");
    this.highlightTop(true);
  }
  /** :324-326 */
  drawFocusRect() {}
  /** :327-337 — `Selection.getFocus()` null: the AS `null.indexOf(...) == -1` is false, nothing happens. */
  myOnKillFocus() {
    const f = Selection.getFocus();
    if (f === null || f.indexOf("labelField") !== -1) return;
    super.myOnKillFocus();
    if (this.fLabel_txt) delete this.fLabel_txt.onKeyDown;
    this.openOrClose(false);
    this.highlightTop(false);
  }
  /** :338-357 — opens downwards, or upwards when it would leave the stage. */
  setPopUpLocation(mcRef: MovieClip) {
    mcRef._x = this._x;
    const pt = { x: this._x + toNumber(this.backGround?.mc_back_left?._width), y: this._y + this.proxyBox_mc._height + 2 };
    this._parent?.localToGlobal(pt);
    mcRef._parent?.globalToLocal(pt);
    mcRef._x = pt.x;
    mcRef._y = pt.y;
    if (this.height + mcRef._y >= Stage.height) {
      this.upward = true;
      mcRef._y = pt.y - this.height - this.proxyBox_mc._height;
    } else this.upward = false;
  }
  /** :358-399 — the fade branch needs a `popUpFade` style, which nothing sets. */
  openOrClose(flag: boolean) {
    if (this.getLength() === 0) return;
    this.setPopUpLocation(this.container_mc);
    if (this.lastSelected !== -1 && (toNumber(this.lastSelected) < this.topDisplayed || toNumber(this.lastSelected) > this.topDisplayed + this.numDisplayed))
      super.moveSelBy(toNumber(this.lastSelected) - toNumber(this.getSelectedIndex()));
    this.downArrow.gotoAndStop(!flag ? 1 : 2);
    if (flag === this.opened) return;
    this.highlightTop(!flag);
    this.fadeRate = this.styleTable.popUpFade?.value as number | undefined;
    if (!flag || this.fadeRate === undefined || this.fadeRate === 0) this.opened = this.container_mc._visible = flag;
    else {
      this.setPopUpLocation(this.fader);
      this.time = 0;
      this.const = 85 / Math.sqrt(this.fadeRate);
      this.fader._alpha = 85;
      this.container_mc._visible = this.fader._visible = true;
      this.onEnterFrame = function (this: FComboBoxClass) {
        this.fader._alpha = 100 - (this.const * Math.sqrt(++this.time) + 15);
        if (this.time >= toNumber(this.fadeRate)) {
          this.fader._visible = false;
          delete this.onEnterFrame;
          this.opened = true;
        }
      };
    }
  }
  /** :400-415 (`executeCallback`: case-insensitive executeCallBack) */
  fireChange() {
    this.lastSelected = this.getSelectedIndex();
    if (!this.editable) {
      this.topLabel = this.getSelectedItem();
      this.fLabel_mc.drawItem(this.topLabel, true);
    } else {
      this.value = this.getSelectedItem()?.label;
      this.fLabel_mc.setLabel(this.value);
    }
    this.executeCallBack();
  }
  /** :416-450 */
  releaseHandler() {
    const root = this._root, inside = !!this.boundingBox_mc?.hitTest(root._xmouse, root._ymouse);
    if (this.changeFlag) {
      if (inside) this.fireChange();
      this.openOrClose(!this.opened);
    } else if (inside) this.openOrClose(false);
    else
      this.onMouseDown = function (this: FComboBoxClass) {
        const r = this._root;
        if (!this.boundingBox_mc?.hitTest(r._xmouse, r._ymouse) && !this.hitTest(r._xmouse, r._ymouse)) {
          this.onMouseDown = undefined;
          this.openOrClose(false);
        }
      };
    this.changeFlag = false;
    this.onMouseUp = undefined;
    clearInterval(this.dragScrolling);
    this.dragScrolling = undefined;
  }
  /** :451-469 */
  moveSelBy(itemNum: number) {
    if (itemNum === 0) return;
    super.moveSelBy(itemNum);
    if (this.editable) this.setValue(this.getSelectedItem()?.label);
    if (!this.opened && this.changeFlag && !this.isSelected(this.lastSelected)) this.fireChange();
  }
  /** :470-492 */
  myOnKeyDown() {
    if (!this.focused) return;
    if (this.editable && Key.isDown(13)) {
      this.setValue(this.fLabel_mc.getLabel());
      this.executeCallBack();
      this.openOrClose(false);
    } else if ((Key.isDown(13) || (Key.isDown(32) && !this.editable)) && this.opened) {
      if (this.getSelectedIndex() !== this.lastSelected) this.fireChange();
      this.openOrClose(false);
      if (this.fLabel_txt) this.fLabel_txt.hscroll = 0;
    }
    super.myOnKeyDown();
  }
  /** :493-499 */
  findInputText() {
    if (!this.editable) super.findInputText();
  }
  /** :500-510 — runs as the label TextField's onSetFocus (`this` = the field). */
  onLabelFocus(this: TextField) {
    const cb = this._parent?._parent as FComboBoxClass | undefined;
    if (cb) (cb.tabFocused = false), (cb.focused = true);
    (this as LabelText).onKeyDown = function (this: TextField) {
      (this._parent?._parent as FComboBoxClass | undefined)?.myOnKeyDown();
    };
    Key.addListener(this);
  }
  /** :511-514 — runs as downArrow.onPress (`this` = the arrow). */
  buttonPressHandler(this: MovieClip) {
    (this._parent as FComboBoxClass | undefined)?.pressHandler();
  }
}
registerClass("Ank::Dofus::ComboBox", FComboBoxClass);

// ---- Ank.Dofus.ScrollBar.as — FScrollBarClass ------------------------------------------------------------------------
type Part = MovieClip & { controller: FScrollBarClass };
type Thumb = Part & Record<"mc_sliderMid" | "mc_sliderPointer" | "mc_sliderTop" | "mc_sliderBot", MovieClip> & { lastY: number; scrollMove: number };
/** A scrolled TextField: `vScroller`/`hScroller` are set by setScrollTarget. */
type ScrollTarget = TextField & { vScroller?: FScrollBarClass; hScroller?: FScrollBarClass; watched?: boolean };
export class FScrollBarClass extends FUIComponentClass {
  declare _targetInstanceName: string | undefined;
  declare horizontal: boolean;
  declare thumbPointer: boolean;
  declare minPos: number;
  declare maxPos: number;
  declare pageSize: number;
  declare largeScroll: number;
  declare smallScroll: number;
  declare scrollPosition: number;
  declare trackSize: number;
  declare thumbHeight: number;
  declare midHeight: number;
  declare trackHeight: number;
  declare scrollTop: number;
  declare scrollBot: number;
  declare isScrolling: boolean;
  declare scrolling: number | undefined;
  declare synchScroll: number | undefined;
  declare textField: ScrollTarget | undefined;
  declare cachedPos: number;
  declare cachedMinPos: number;
  declare cachedMaxPos: number;
  declare clickFilter: boolean | undefined;
  declare scrollTrack_mc: Part;
  declare upArrow_mc: Part;
  declare downArrow_mc: Part;
  declare scrollThumb_mc: Thumb | undefined;
  declare thumbMid_mc: MovieClip;
  declare thumbPointer_mc: MovieClip;
  declare thumbTop_mc: MovieClip;
  declare thumbBot_mc: MovieClip;

  /** :1-20 */
  constructor() {
    super();
    if (this._height === 4) return;
    this.init();
    this.minPos = this.maxPos = this.pageSize = this.largeScroll = 0;
    this.smallScroll = 1;
    this.width = !this.horizontal ? this._height : this._width;
    this._xscale = this._yscale = 100;
    this.setScrollPosition(0);
    this.tabEnabled = false;
    if ((this._targetInstanceName?.length ?? 0) > 0) this.setScrollTarget(this._parent?.[this._targetInstanceName!]);
    this.tabChildren = false;
    this.setSize(this.width);
  }
  /** :23-38 */
  setHorizontal(flag: boolean) {
    if (this.horizontal && !flag) (this._xscale = 100), (this._rotation = 0);
    else if (flag && !this.horizontal) (this._xscale = -100), (this._rotation = -90);
    this.horizontal = flag;
  }
  /** :39-107 */
  setScrollProperties(pSize: number, mnPos: number, mxPos: number) {
    if (!this.enable) return;
    this.pageSize = pSize;
    this.minPos = Math.max(mnPos, 0);
    this.maxPos = Math.max(mxPos, 0);
    this.scrollPosition = Math.max(this.minPos, toNumber(this.scrollPosition));
    this.scrollPosition = Math.min(this.maxPos, this.scrollPosition);
    const up = this.upArrow_mc, down = this.downArrow_mc, track = this.scrollTrack_mc;
    if (this.maxPos - this.minPos <= 0) {
      this.scrollThumb_mc?.removeMovieClip();
      up?.gotoAndStop(3);
      down?.gotoAndStop(3);
      if (down) down.onPress = down.onRelease = down.onDragOut = null;
      if (up) up.onPress = up.onRelease = up.onDragOut = null;
      if (track) {
        track.onPress = track.onRelease = null;
        track.onDragOut = track.onRollOut = null;
        track.useHandCursor = false;
      }
      return;
    }
    let pos = this.getScrollPosition();
    // the constructor reaches this through setScrollTarget before setSize attached the arrows (AS: silent no-ops)
    if (up) {
      up.gotoAndStop(1);
      up.onPress = up.onDragOver = this.startUpScroller;
      up.onRelease = up.onDragOut = this.stopScrolling;
    }
    if (down) {
      down.gotoAndStop(1);
      down.onPress = down.onDragOver = this.startDownScroller;
      down.onRelease = down.onDragOut = this.stopScrolling;
    }
    track.onPress = track.onDragOver = this.startTrackScroller;
    track.onRelease = this.stopScrolling;
    track.onDragOut = this.stopScrolling;
    track.onRollOut = this.stopScrolling;
    track.useHandCursor = false;
    const t = (this.scrollThumb_mc = this.attachMovie("ScrollThumb", "scrollThumb_mc", 3) as Thumb);
    t._x = 0;
    t._y = toNumber(up?._height);
    t.onPress = this.startDragThumb;
    t.controller = this;
    t.onRelease = t.onReleaseOutside = this.stopDragThumb;
    t.useHandCursor = false;
    this.thumbHeight = (this.pageSize / (this.maxPos - this.minPos + this.pageSize)) * this.trackSize;
    this.thumbMid_mc = t.mc_sliderMid;
    this.thumbPointer_mc = t.mc_sliderPointer;
    this.thumbTop_mc = t.mc_sliderTop;
    this.thumbBot_mc = t.mc_sliderBot;
    this.thumbHeight = Math.max(this.thumbHeight, 6);
    this.midHeight = this.thumbHeight - this.thumbTop_mc._height - this.thumbBot_mc._height;
    this.thumbMid_mc._yscale = (this.midHeight * 100) / this.thumbMid_mc._height; // AS `_yScale`
    this.thumbMid_mc._y = this.thumbTop_mc._height;
    if (!this.thumbPointer) this.thumbPointer_mc._visible = false;
    else this.thumbPointer_mc._y = this.thumbMid_mc._height / 2 + this.thumbMid_mc._y;
    this.thumbBot_mc._y = this.thumbTop_mc._height + this.midHeight;
    this.scrollTop = t._y;
    this.trackHeight = this.trackSize - this.thumbHeight;
    this.scrollBot = this.trackHeight + this.scrollTop;
    pos = Math.min(pos, this.maxPos);
    this.setScrollPosition(Math.max(pos, this.minPos));
  }
  /** :108-111 */
  getScrollPosition(): number {
    return this.scrollPosition;
  }
  /** :112-124 */
  setScrollPosition(pos: number) {
    this.scrollPosition = pos;
    if (this.scrollThumb_mc !== undefined) {
      pos = Math.min(pos, this.maxPos);
      pos = Math.max(pos, this.minPos);
      this.scrollThumb_mc._y = ((pos - this.minPos) * this.trackHeight) / (this.maxPos - this.minPos) + this.scrollTop;
    }
    this.executeCallBack();
  }
  /** :125-132 */
  setLargeScroll(lScroll: number) {
    this.largeScroll = lScroll;
  }
  setSmallScroll(sScroll: number) {
    this.smallScroll = sScroll;
  }
  /** :133-168 */
  setEnabled(enabledFlag?: boolean) {
    const was = this.enable;
    if (enabledFlag && !was) {
      this.enable = enabledFlag;
      if (this.textField !== undefined) this.setScrollTarget(this.textField);
      else {
        this.setScrollProperties(this.pageSize, this.cachedMinPos, this.cachedMaxPos);
        this.setScrollPosition(this.cachedPos);
      }
      this.clickFilter = undefined;
    } else if (!enabledFlag && was) {
      this.cachedPos = this.getScrollPosition();
      this.cachedMinPos = this.minPos;
      this.cachedMaxPos = this.maxPos;
      if (this.clickFilter === undefined) this.setScrollProperties(this.pageSize, 0, 0);
      else this.clickFilter = true;
      this.enable = !!enabledFlag;
    }
  }
  /** :169-198 */
  setSize(hgt: number) {
    if (this._height === 1) return;
    this.width = hgt;
    this.scrollTrack_mc._yscale = 100;
    this.scrollTrack_mc._yscale = (100 * this.width) / this.scrollTrack_mc._height;
    if (this.upArrow_mc === undefined) {
      const up = this.attachMovie("UpArrow", "upArrow_mc", 1) as Part, down = this.attachMovie("DownArrow", "downArrow_mc", 2) as Part;
      down.controller = up.controller = this;
      up.useHandCursor = down.useHandCursor = false;
      up._x = up._y = 0;
      down._x = 0;
    }
    this.scrollTrack_mc.controller = this;
    this.downArrow_mc._y = this.width - this.downArrow_mc._height;
    this.trackSize = this.width - 2 * this.downArrow_mc._height;
    if (this.textField !== undefined) this.onTextChanged();
    else this.setScrollProperties(this.pageSize, this.minPos, this.maxPos);
  }
  /** :199-217 */
  scrollIt(inc: string, mode: number) {
    let step = this.smallScroll;
    if (inc !== "one") step = this.largeScroll !== 0 ? this.largeScroll : this.pageSize;
    let pos = this.getScrollPosition() + mode * step;
    if (pos > this.maxPos) pos = this.maxPos;
    else if (pos < this.minPos) pos = this.minPos;
    this.setScrollPosition(pos);
  }
  /** :218-223 — runs as the thumb's onPress. */
  startDragThumb(this: Thumb) {
    this.lastY = this._ymouse;
    this.onMouseMove = this.controller.dragThumb;
  }
  /** :224-243 — runs as the thumb's onMouseMove. */
  dragThumb(this: Thumb) {
    const c = this.controller;
    this.scrollMove = this._ymouse - this.lastY + this._y;
    if (this.scrollMove < c.scrollTop) this.scrollMove = c.scrollTop;
    else if (this.scrollMove > c.scrollBot) this.scrollMove = c.scrollBot;
    this._y = this.scrollMove;
    c.scrollPosition = Math.round(((c.maxPos - c.minPos) * (this._y - c.scrollTop)) / c.trackHeight) + c.minPos;
    c.isScrolling = true; // updateAfterEvent(): no-op in the runtime
    c.executeCallBack();
  }
  /** :244-248 */
  stopDragThumb(this: Thumb) {
    this.controller.isScrolling = false;
    this.onMouseMove = null;
  }
  /** :249-254 — runs as the track's onPress. */
  startTrackScroller(this: Part) {
    this.controller.trackScroller();
    this.controller.scrolling = setInterval(this.controller, "scrollInterval", 500, "page", -1);
  }
  /** :255-269 — auto-repeat: first after 500 ms, then every 35 ms. */
  scrollInterval(inc: string, mode: number) {
    clearInterval(this.scrolling);
    if (inc === "page") this.trackScroller();
    else this.scrollIt(inc, mode);
    this.scrolling = setInterval(this, "scrollInterval", 35, inc, mode);
  }
  /** :270-281 */
  trackScroller() {
    const t = this.scrollThumb_mc;
    if (!t) return;
    if (t._y + this.thumbHeight < this._ymouse) this.scrollIt("page", 1);
    else if (t._y > this._ymouse) this.scrollIt("page", -1);
  }
  /** :282-302 — run as arrow/track handlers (`this` = the part). */
  stopScrolling(this: Part) {
    this.controller.downArrow_mc.gotoAndStop(1);
    this.controller.upArrow_mc.gotoAndStop(1);
    clearInterval(this.controller.scrolling);
  }
  startUpScroller(this: Part) {
    this.controller.upArrow_mc.gotoAndStop(2);
    this.controller.scrollIt("one", -1);
    this.controller.scrolling = setInterval(this.controller, "scrollInterval", 500, "one", -1);
  }
  startDownScroller(this: Part) {
    this.controller.downArrow_mc.gotoAndStop(2);
    this.controller.scrollIt("one", 1);
    this.controller.scrolling = setInterval(this.controller, "scrollInterval", 500, "one", 1);
  }
  /**
   * :303-346 — `textField.addListener(this)` + `watch("text"/"htmlText", callback)`. The runtime has no `Object.watch`
   * (docs/runtime.md §5): own accessors shadowing text/htmlText call `callback` instead (never unwatched).
   */
  setScrollTarget(tF: unknown) {
    if (tF === undefined && this.textField) {
      this.textField.removeListener(this);
      delete this.textField[!this.horizontal ? "vScroller" : "hScroller"];
    }
    this.textField = undefined;
    if (!(tF instanceof TextField)) return;
    const tf = (this.textField = tF as ScrollTarget);
    tf[!this.horizontal ? "vScroller" : "hScroller"] = this;
    this.onTextChanged();
    this.onChanged = function (this: FScrollBarClass) {
      this.onTextChanged();
    };
    this.onScroller = function (this: FScrollBarClass) {
      if (!this.isScrolling) this.setScrollPosition(!this.horizontal ? toNumber(this.textField?.scroll) : toNumber(this.textField?.hscroll));
    };
    tf.addListener(this);
    if (tf.watched) return;
    tf.watched = true;
    for (const p of ["text", "htmlText"] as const) {
      const d = Object.getOwnPropertyDescriptor(TextField.prototype, p)!;
      Object.defineProperty(tf, p, {
        configurable: true,
        get() { return d.get!.call(this); },
        set(v: string) { d.set!.call(this, v); FScrollBarClass.prototype.callback.call(tf); },
      });
    }
  }
  /** :347-355 — resync both scroll bars 50 ms after the text changed (`this` = the field). */
  callback(this: ScrollTarget) {
    clearInterval(this.hScroller?.synchScroll);
    clearInterval(this.vScroller?.synchScroll);
    if (this.hScroller) this.hScroller.synchScroll = setInterval(this.hScroller, "onTextChanged", 50);
    if (this.vScroller) this.vScroller.synchScroll = setInterval(this.vScroller, "onTextChanged", 50);
  }
  /** :356-378 */
  onTextChanged() {
    const tf = this.textField;
    if (!this.enable || tf === undefined) return;
    clearInterval(this.synchScroll);
    if (this.horizontal) {
      const pos = tf.hscroll;
      this.setScrollProperties(tf._width, 0, tf.maxhscroll);
      this.setScrollPosition(Math.min(pos, tf.maxhscroll));
    } else {
      const pos = tf.scroll;
      this.setScrollProperties(tf.bottomScroll - tf.scroll, 1, tf.maxscroll);
      this.setScrollPosition(Math.min(pos, tf.maxscroll));
    }
  }
  /** :379-394 — with a text target, the position is written to the field's scroll/hscroll. */
  executeCallBack() {
    if (this.textField === undefined) super.executeCallBack();
    else if (this.horizontal) this.textField.hscroll = this.getScrollPosition();
    else this.textField.scroll = this.getScrollPosition();
  }
}
registerClass("Ank::Dofus::ScrollBar", FScrollBarClass);
