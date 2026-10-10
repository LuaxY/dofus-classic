// The Flash MX component framework as shipped in Interfaces.swf (Macromedia FUIComponent family, renamed/tweaked by
// Ankama). Only what Dofus code reaches is ported: the base of Ank::Dofus::{PushButton,ListBox,ComboBox,ScrollBar}
// (controls.ts) and of the list item renderers (FListItemSymbol here, FChatListItemSymbol/FFriendsList* in screens).
// Not ported: FRadioButtonSymbol (never placed), accessibility (`_accImpl`, `Accessibility.*`), tab focus.
//
// AS1 inheritance (`X.prototype = new Base()`) runs only the leaf constructor on instances, so the intermediate TS
// classes have no constructor; what the AS set by constructing the prototypes is on `.prototype` below.
// SWF 6 is case-insensitive; the TS spelling is the one used where the clip/field is created.
import { str, toNumber } from "../../core/swf6.ts";
import { clearInterval, Color, getTimer, Key, MovieClip, player, registerClass, Selection, setInterval, TextField, TextFormat } from "../../runtime/player.ts";

export type Style = { value?: unknown; useGlobal?: boolean; coloredMCs?: Record<string, MovieClip> };
export type StyleTable = Record<string, Style | undefined>;

// ---- FUIComponentSymbol.as:265-355 — `_global.FStyleFormat` -------------------------------------------------------
export class FStyleFormat {
  [k: string]: unknown;
  declare nonStyles: Record<string, boolean>;
  declare listeners: Record<string, FUIComponentClass | undefined>;
  declare isGlobal: boolean;
  constructor(init?: Record<string, unknown>) {
    this.nonStyles = { listeners: true, isGlobal: true, isAStyle: true, addListener: true, removeListener: true, nonStyles: true, applyChanges: true };
    this.listeners = {};
    this.isGlobal = false;
    if (init) for (const k in init) this[k] = init[k];
  }
  /** :281-299 — listeners are keyed by the component's target path. */
  addListener(...components: FUIComponentClass[]) {
    for (const c of components) {
      this.listeners[String(c)] = c;
      for (const i of Object.keys(this)) if (this.isAStyle(i)) c.updateStyleProperty(this, i);
    }
  }
  /** :300-318 */
  removeListener(component: FUIComponentClass) {
    this.listeners[String(component)] = undefined;
    for (const prop of Object.keys(this)) {
      const st = component.styleTable[prop];
      if (this.isAStyle(prop) && st && st.useGlobal == this.isGlobal) {
        st.useGlobal = true;
        component.setStyleProperty(prop, !this.isGlobal ? globalStyleFormat?.[prop] : undefined, true);
      }
    }
  }
  /** :319-351 */
  applyChanges(...names: string[]) {
    for (const k in this.listeners) {
      const l = this.listeners[k];
      if (names.length > 0) for (const n of names) this.isAStyle(n) && l?.updateStyleProperty(this, n);
      else for (const n of Object.keys(this)) this.isAStyle(n) && l?.updateStyleProperty(this, n);
    }
  }
  /** :352-355 */
  isAStyle(name: string): boolean {
    return !this.nonStyles[name];
  }
}

/** `_global.globalStyleFormat` + `_global._focusControl` (FUIComponentSymbol.as:16-27), created by the first init.
 *  The focus control is a Selection listener, so it is installed once per Player. */
let globalStyleFormat: FStyleFormat | undefined;
const focusControlled = new WeakSet<object>();
function initGlobals() {
  if (!globalStyleFormat) (globalStyleFormat = new FStyleFormat()), (globalStyleFormat.isGlobal = true);
  if (focusControlled.has(player)) return;
  focusControlled.add(player);
  type Focusable = { myOnKillFocus?: () => void; myOnSetFocus?: () => void } | null;
  Selection.addListener({
    onSetFocus(oldFocus: Focusable, newFocus: Focusable) {
      if (typeof oldFocus?.myOnKillFocus === "function") oldFocus.myOnKillFocus();
      if (typeof newFocus?.myOnSetFocus === "function") newFocus.myOnSetFocus();
    },
  });
}

// ---- FUIComponentSymbol.as — FUIComponentClass ------------------------------------------------------------------
export class FUIComponentClass extends MovieClip {
  declare enable: boolean;
  declare focused: boolean;
  declare styleTable: StyleTable;
  declare textStyle: TextFormat | undefined;
  declare width: number;
  declare height: number;
  declare handlerObj: unknown;
  declare changeHandler: string | undefined;
  declare methodTable: Record<string, boolean>;
  declare keyListener: { controller: FUIComponentClass; onKeyDown(): void; onKeyUp(): void };
  declare tabFocused: boolean;
  declare hostStyle: StyleTable | undefined;
  declare focusRect: MovieClip | undefined;
  declare deadPreview: MovieClip | undefined;
  declare styleFormat_prm: Record<string, unknown> | undefined;

  /** :6-61 */
  init() {
    this.enable = true;
    this.focused = false;
    this.useHandCursor = false;
    this.styleTable = {};
    initGlobals();
    if (this._name !== undefined) {
      Object.assign(this, { _focusrect: false, tabEnabled: true, focusEnabled: true, tabChildren: false });
      this.tabFocused = true;
      if (this.hostStyle === undefined) globalStyleFormat!.addListener(this);
      else this.styleTable = this.hostStyle;
      if (this.deadPreview) {
        this.deadPreview._visible = false;
        this.deadPreview._width = this.deadPreview._height = 1;
      }
      this.methodTable = {};
      this.keyListener = {
        controller: this,
        onKeyDown() { this.controller.myOnKeyDown(); },
        onKeyUp() { this.controller.myOnKeyUp(); },
      };
      for (const k in this.styleFormat_prm) this.setStyleProperty(k, this.styleFormat_prm[k]);
    }
  }
  /** Not defined on FUIComponentClass (the key listener's call is a no-op unless a subclass defines it). */
  myOnKeyDown() {}
  myOnKeyUp() {}
  /** :62-71 */
  setEnabled(enabledFlag?: boolean) {
    this.enable = arguments.length <= 0 ? true : (enabledFlag as boolean);
    Object.assign(this, { tabEnabled: enabledFlag, focusEnabled: enabledFlag });
    if (!this.enable && this.focused) Selection.setFocus(undefined);
  }
  /** :72-75 */
  getEnabled() {
    return this.enable;
  }
  /** :76-82 */
  setSize(w: number, h?: number) {
    this.width = w;
    this.height = h as number;
    this.focusRect?.removeMovieClip();
  }
  /** :83-88 */
  setChangeHandler(chng: string | undefined, obj?: unknown) {
    this.handlerObj = obj != undefined ? obj : this._parent;
    this.changeHandler = chng;
  }
  /** :89-94 — the deferred update runs on the next frame. */
  invalidate(methodName: string) {
    this.methodTable[methodName] = true;
    this.onEnterFrame = this.cleanUI;
  }
  /** :95-108 */
  cleanUI() {
    if (this.methodTable.setSize) this.setSize(this.width, this.height);
    else this.cleanUINotSize();
    this.methodTable = {};
    delete this.onEnterFrame;
  }
  /** :109-116 */
  cleanUINotSize() {
    for (const k in this.methodTable) {
      const f = this[k];
      if (typeof f === "function") f.call(this);
    }
  }
  /** :117-146 */
  drawRect(x: number, y: number, w: number, h: number) {
    const inner = this.styleTable.focusRectInner?.value ?? 16777215, outer = this.styleTable.focusRectOuter?.value ?? 0;
    const r = this.createEmptyMovieClip("focusRect", 1000);
    this.focusRect = r;
    r.controller = this;
    r.lineStyle(1, outer as number);
    r.moveTo(x, y), r.lineTo(x + w, y), r.lineTo(x + w, y + h), r.lineTo(x, y + h), r.lineTo(x, y);
    r.lineStyle(1, inner as number);
    r.moveTo(x + 1, y + 1), r.lineTo(x + w - 1, y + 1), r.lineTo(x + w - 1, y + h - 1), r.lineTo(x + 1, y + h - 1), r.lineTo(x + 1, y + 1);
  }
  /** :147-153 */
  pressFocus() {
    this.tabFocused = false;
    this.focusRect?.removeMovieClip();
    Selection.setFocus(this);
  }
  /** :154-158 */
  drawFocusRect() {
    this.drawRect(-2, -2, this.width + 4, this.height + 4);
  }
  /** :159-168 */
  myOnSetFocus() {
    this.focused = true;
    Key.addListener(this.keyListener);
    if (this.tabFocused) this.drawFocusRect();
  }
  /** :169-176 */
  myOnKillFocus() {
    this.tabFocused = true;
    this.focused = false;
    this.focusRect?.removeMovieClip();
    Key.removeListener(this.keyListener);
  }
  /** :177-181 */
  executeCallBack() {
    const o = this.handlerObj as Record<string, unknown> | undefined, f = this.changeHandler === undefined ? undefined : o?.[this.changeHandler];
    if (typeof f === "function") f.call(o, this);
  }
  /** :182-185 */
  updateStyleProperty(styleFormat: FStyleFormat, propName: string) {
    this.setStyleProperty(propName, styleFormat[propName], styleFormat.isGlobal);
  }
  /** :186-243 — `setCustomStyleProperty` is defined nowhere (undefined → the generic path always runs). */
  setStyleProperty(propName: string, value: unknown, isGlobal?: boolean) {
    if (value == "") return; // AS loose test: also skips 0 and false
    const n = parseInt(String(value));
    if (!Number.isNaN(n)) value = n;
    const global = arguments.length <= 2 ? false : !!isGlobal;
    const st = (this.styleTable[propName] ??= { useGlobal: true });
    if (!(st.useGlobal || !global)) return;
    st.value = value;
    if (propName === "embedFonts") this.invalidate("setSize");
    else if (propName.substring(0, 4) === "text") {
      this.textStyle ??= new TextFormat();
      // `textStyle["Font"]` etc.: TextFormat members are case-insensitive in SWF 6
      const prop = propName.charAt(4).toLowerCase() + propName.slice(5);
      (this.textStyle as unknown as Record<string, unknown>)[prop] = value;
      this.invalidate("setSize");
    } else
      for (const j in st.coloredMCs) {
        const c = new Color(st.coloredMCs[j]);
        if (st.value === undefined) c.setTransform({ ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0, aa: 100, ab: 0 });
        else c.setRGB(value as number);
      }
    st.useGlobal = global;
  }
  /** :244-264 — skin clips register here from their frame scripts (scripts.ts); coloured only if a style sets them. */
  registerSkinElement(skinMCRef: unknown, propName: string) {
    if (!(skinMCRef instanceof MovieClip)) return;
    const st = (this.styleTable[propName] ??= { useGlobal: true });
    (st.coloredMCs ??= {})[String(skinMCRef)] = skinMCRef;
    if (st.value !== undefined) new Color(skinMCRef).setRGB(st.value as number);
  }
}
Object.assign(FUIComponentClass.prototype, { enable: true, focused: false, useHandCursor: false });

// ---- FLabelSymbol.as — `_global.FLabelClass` ---------------------------------------------------------------------
type Host = MovieClip & { textStyle?: TextFormat; styleTable?: StyleTable; controller?: unknown };
export class FLabelClass extends MovieClip {
  declare hostComponent: Host;
  declare customTextStyle: TextFormat | undefined;
  declare textStyle: TextFormat;
  declare enable: boolean;
  declare labelField: TextField;
  /** :1-17 */
  constructor() {
    super();
    if (this.hostComponent == undefined) {
      const p = this._parent as Host;
      this.hostComponent = (p.controller != undefined ? p.controller : p) as Host;
    }
    if (this.customTextStyle == undefined) {
      if (this.hostComponent.textStyle == undefined) this.hostComponent.textStyle = new TextFormat();
      this.textStyle = this.hostComponent.textStyle;
      this.enable = true;
    }
  }
  /** :20-31 */
  setLabel(label: unknown) {
    const ef = this.hostComponent.styleTable?.embedFonts?.value;
    if (ef != undefined) this.labelField.embedFonts = !!ef;
    this.labelField.setNewTextFormat(this.textStyle);
    this.labelField.text = str(label);
    this.labelField._height = this.labelField.textHeight + 2;
  }
  /** :32-35 */
  setSize(width: number) {
    this.labelField._width = width;
  }
  /** :36-39 */
  setEnabled(enable: boolean) {
    this.enable = enable;
  }
  /** :40-43 */
  getLabel(): string {
    return this.labelField.text;
  }
  /** :44-47 */
  setColor(col: number) {
    this.labelField.textColor = col;
  }
}
registerClass("FLabelSymbol", FLabelClass);

// ---- DataProviderSymbol.as — `_global.DataProviderClass` (not core/datacenter/dataProvider.ts: different class) ----
export type ListItem = { label?: unknown; data?: unknown; __ID__?: number; [k: string]: unknown };
export type ModelEvent = { event: "addRows" | "deleteRows" | "updateRows" | "updateAll" | "sort"; firstRow?: number; lastRow?: number };
export type ListView = { modelChanged(e: ModelEvent): void };
export class DataProviderClass {
  declare items: ListItem[];
  declare uniqueID: number;
  declare views: ListView[];
  constructor() {
    this.init();
  }
  /** :5-11 */
  init() {
    this.items = [];
    this.uniqueID = 0;
    this.views = [];
  }
  /** :12-17 */
  addView(viewRef: ListView) {
    this.views.push(viewRef);
    viewRef.modelChanged({ event: "updateAll" });
  }
  /** :18-39 — objects are stored as is (and get `__ID__`), other values become `{label}`. */
  addItemAt(index: number, value: unknown) {
    if (index < this.getLength()) this.items.splice(index, 0, {});
    this.items[index] = typeof value === "object" ? (value as ListItem) : { label: value };
    const id = this.uniqueID++, row = this.items[index];
    if (row) row.__ID__ = id;
    this.updateViews({ event: "addRows", firstRow: index, lastRow: index });
  }
  /** :40-43 */
  addItem(value: unknown) {
    this.addItemAt(this.getLength(), value);
  }
  /** :44-53 */
  removeItemAt(index: number): ListItem | undefined {
    const tmp = this.items[index];
    this.items.splice(index, 1);
    this.updateViews({ event: "deleteRows", firstRow: index, lastRow: index });
    return tmp;
  }
  /** :54-59 — lastRow is computed after the reset (-1). */
  removeAll() {
    this.items = [];
    this.updateViews({ event: "deleteRows", firstRow: 0, lastRow: this.getLength() - 1 });
  }
  /** :60-79 */
  replaceItemAt(index: number, itemObj: unknown) {
    if (index < 0 || index >= this.getLength()) return;
    const id = this.getItemID(index);
    if (typeof itemObj === "object") this.items[index] = itemObj as ListItem;
    else this.items[index]!.label = itemObj;
    if (this.items[index]) this.items[index]!.__ID__ = id;
    this.updateViews({ event: "updateRows", firstRow: index, lastRow: index });
  }
  /** :80-83 */
  getLength(): number {
    return this.items.length;
  }
  /** :84-87 */
  getItemAt(index: number | undefined): ListItem | undefined {
    return index === undefined ? undefined : this.items[index];
  }
  /** :88-91 */
  getItemID(index: number | undefined): number | undefined {
    return this.getItemAt(index)?.__ID__;
  }
  /** :92-101 — Array.sortOn: string comparison. */
  sortItemsBy(fieldName: string, order?: string) {
    this.items.sort((a, b) => {
      const x = str(a?.[fieldName]), y = str(b?.[fieldName]);
      return x < y ? -1 : x > y ? 1 : 0;
    });
    if (order === "DESC") this.items.reverse();
    this.updateViews({ event: "sort" });
  }
  /** :102-112 */
  updateViews(eventObj: ModelEvent) {
    for (let i = 0; i < this.views.length; i++) this.views[i]!.modelChanged(eventObj);
  }
}

// ---- FSelectableItemSymbol.as — FSelectableItemClass (item renderers) ------------------------------------------------
type Highlight = MovieClip & { controller: FSelectableItemClass };
export class FSelectableItemClass extends FUIComponentClass {
  declare controller: FSelectableListClass;
  declare itemNum: number;
  declare highlighted: boolean;
  declare oldFocus: boolean;
  declare fLabel_mc: FLabelClass;
  declare highlight_mc: Highlight;
  declare fadeN: number;
  declare fadeX: number;
  /** :6-14 — no super.init(): items use their list's styleTable. */
  init() {
    if (this._name !== "itemAsset") {
      this.highlighted = false;
      this.layoutContent(100);
    }
  }
  /** :15-25 */
  drawItem(itmObj: ListItem | undefined, selected: boolean) {
    this.displayContent(itmObj, selected);
    if (this.highlighted !== selected || (this.controller.focused !== this.oldFocus && selected)) this.setHighlighted(selected);
    this.oldFocus = this.controller.focused;
  }
  /** :26-57 — the highlight sits at depth -16384, invisible (alpha 0) until selected, and takes the clicks. */
  setSize(width: number, height?: number) {
    this.width = width;
    this.layoutContent(width);
    const h = this.attachMovie("FHighlightSymbol", "highlight_mc", -16384) as Highlight | undefined;
    if (!h) return;
    h._x = 0.5;
    h._width = width - 0.5;
    h._height = height as number;
    h.controller = this;
    h._alpha = 0;
    h.trackAsMenu = true;
    h.onPress = function (this: Highlight) {
      if (this.controller.controller.enable) this.controller.controller.clickHandler(this.controller.itemNum);
    };
    h.onDragOver = function (this: Highlight) {
      if (this.controller.controller.focused) (this.onPress as () => void).call(this);
    };
    h.useHandCursor = false;
  }
  /** :58-65 */
  setEnabled(enabledFlag?: boolean) {
    this.enable = !!enabledFlag;
    this.fLabel_mc?.setEnabled(!!enabledFlag);
    this.highlight_mc?.gotoAndStop(!enabledFlag ? "disabled" : "unfocused");
  }
  /** :66-74 */
  layoutContent(width: number) {
    const l = this.attachMovie("FLabelSymbol", "fLabel_mc", 2, { hostComponent: this.controller }) as FLabelClass | undefined;
    if (!l) return;
    l._x = 2;
    l._y = 0;
    l.setSize(width - 2);
    l.labelField.selectable = false;
  }
  /** :75-108 — an object without `label` shows its values joined by ", " (Flash enumerates newest member first). */
  displayContent(itmObj: ListItem | undefined, selected: boolean) {
    let label: unknown = "";
    if (itmObj?.label !== undefined) label = itmObj.label;
    else if (typeof itmObj === "object") {
      let s = "";
      for (const k of Object.keys(itmObj).reverse()) if (k !== "__ID__") s = str(itmObj[k]) + ", " + s;
      label = s.substring(0, s.length - 2);
    } else label = itmObj;
    if (this.fLabel_mc.labelField.text !== str(label)) this.fLabel_mc.setLabel(label);
    let clr = (!selected ? this.controller.styleTable.textColor?.value : this.controller.styleTable.textSelected?.value) as number | undefined;
    if (clr === undefined) clr = !selected ? 0 : 16777215;
    this.fLabel_mc.setColor(clr);
  }
  /** :109-112 */
  getItemIndex(): number {
    return this.controller.getScrollPosition() + this.itemNum;
  }
  /** :113-116 */
  getItemModel() {
    return this.controller.getItemAt(this.getItemIndex());
  }
  /** :117-120 */
  getHostDataProvider() {
    return this.controller.dataProvider;
  }
  /** :121-147 — the fade branch needs a `fadeRate` style, which nothing sets. */
  setHighlighted(flag: boolean) {
    const fade = toNumber(this.controller.styleTable.fadeRate?.value);
    if (!fade || !flag) {
      if (this.highlight_mc) this.highlight_mc._alpha = !flag ? 0 : 100;
      delete this.onEnterFrame;
    } else {
      this.fadeN = fade;
      this.fadeX = 1;
      this.highlight_mc._alpha = 20;
      this.onEnterFrame = function (this: FSelectableItemClass) {
        this.highlight_mc._alpha = 60 * Math.sqrt(this.fadeX++ / this.fadeN) + 40;
        if (this.fadeX > this.fadeN) delete this.onEnterFrame;
      };
    }
    this.highlighted = flag;
  }
}

/** FListItemSymbol.as */
export class FListItemClass extends FSelectableItemClass {
  constructor() {
    super();
    this.init();
  }
}
registerClass("FListItemSymbol", FListItemClass);

/** FComboBoxItemSymbol.as — rolling over a popup row selects it. */
export class FComboBoxItemClass extends FSelectableItemClass {
  constructor() {
    super();
    this.init();
  }
  /** :7-15 */
  setSize(w: number, h?: number) {
    super.setSize(w, h);
    if (this.highlight_mc)
      this.highlight_mc.onRollOver = function (this: Highlight) {
        this.controller.controller.selectionHandler(this.controller.itemNum);
      };
  }
}
registerClass("FComboBoxItemSymbol", FComboBoxItemClass);

// ---- FSelectableListSymbol.as — FSelectableListClass ---------------------------------------------------------------
type ItemClip = FSelectableItemClass;
export abstract class FSelectableListClass extends FUIComponentClass {
  declare selected: Record<string, { sIndex: number | undefined } | undefined>;
  declare topDisplayed: number;
  declare numDisplayed: number;
  declare lastSelected: number | undefined;
  declare dataProvider: DataProviderClass;
  declare container_mc: MovieClip;
  declare boundingBox_mc: MovieClip | undefined;
  declare itemSymbol: string;
  declare itmHgt: number;
  declare popupWidth: number;
  declare scrollOffset: number | undefined;
  declare hideBoundingBox: boolean | undefined;
  declare changeFlag: boolean;
  declare selectHolder: unknown;
  declare selectionDeleted: boolean;
  declare lastSelID: number | undefined;
  declare __lastClick__: number | undefined;
  declare tmpPos: number;
  declare tmpItem_mc: ItemClip | undefined;
  /** Hooks assigned by the screens (called from releaseHandler). */
  declare onClick: (() => void) | undefined;
  declare onDblClick: (() => void) | undefined;

  abstract getScrollPosition(): number;
  abstract setScrollPosition(pos: number): void;

  protected item(i: number): ItemClip | undefined {
    return this.container_mc?.["fListItem" + i + "_mc"] as ItemClip | undefined;
  }

  /** :6-20 */
  init() {
    super.init();
    this.enable = true;
    this.selected = {};
    this.topDisplayed = this.numDisplayed = 0;
    this.lastSelected = 0;
    this.tabChildren = false;
    if (this._name !== undefined) {
      this.dataProvider = new DataProviderClass();
      this.dataProvider.addView(this);
    }
  }
  /** :21-28 */
  addItemAt(index: number, label: unknown, data?: unknown) {
    if (index < 0 || !this.enable) return undefined;
    this.dataProvider.addItemAt(index, { label, data });
  }
  /** :29-44 — an object label is stored itself and gets `data` written onto it (DATACENTER objects are mutated). */
  addItem(label: unknown, data?: unknown) {
    if (!this.enable) return;
    if (typeof label === "object" && label !== null) {
      (label as ListItem).data = data;
      this.dataProvider.addItem(label);
    } else this.dataProvider.addItem({ label, data });
  }
  /** :45-52 */
  removeItemAt(index: number): ListItem | undefined {
    this.selectHolder = this.getSelectedIndex();
    const item = this.getItemAt(index);
    this.dataProvider.removeItemAt(index);
    return item;
  }
  /** :53-56 */
  removeAll() {
    this.dataProvider.removeAll();
  }
  /** :57-60 */
  replaceItemAt(index: number, newLabel: unknown, newData?: unknown) {
    this.dataProvider.replaceItemAt(index, { label: newLabel, data: newData });
  }
  /** :61-66 */
  sortItemsBy(fieldName: string, order?: string) {
    this.lastSelID = this.dataProvider.getItemID(this.lastSelected);
    this.dataProvider.sortItemsBy(fieldName, order);
  }
  /** :67-70 */
  getLength(): number {
    return this.dataProvider.getLength();
  }
  /** :71-83 */
  getSelectedIndex(): number | undefined {
    for (const k in this.selected) {
      const i = this.selected[k]?.sIndex;
      if (i !== undefined) return i;
    }
    return undefined;
  }
  /** :84-87 */
  getSelectedItem(): ListItem | undefined {
    return this.getItemAt(this.getSelectedIndex());
  }
  /** :88-91 */
  getItemAt(index: number | undefined): ListItem | undefined {
    return this.dataProvider.getItemAt(index);
  }
  /** :96-104 — data if defined, else label. */
  getValue(): unknown {
    const item = this.getSelectedItem();
    return item?.data !== undefined ? item.data : item?.label;
  }
  /** :105-120 — fires the change handler synchronously unless `flag === false`. (SWF 6: undefined index → 0 in the tests.) */
  setSelectedIndex(index: number | undefined, flag?: boolean) {
    if (toNumber(index) >= 0 && toNumber(index) < this.getLength() && this.enable) {
      this.clearSelected();
      this.selectItem(index, true);
      this.lastSelected = index;
      this.invalidate("updateControl");
      if (flag !== false) this.executeCallBack();
    }
  }
  /** :121-144 */
  setDataProvider(obj: unknown) {
    this.setScrollPosition(0);
    this.clearSelected();
    if (Array.isArray(obj)) {
      this.dataProvider = new DataProviderClass();
      for (const v of obj) this.dataProvider.addItem(typeof v !== "string" ? v : { label: v });
    } else this.dataProvider = obj as DataProviderClass;
    this.dataProvider.addView(this);
  }
  /** :145-152 */
  setItemSymbol(linkID: string) {
    this.tmpPos = this.getScrollPosition();
    this.itemSymbol = linkID;
    this.invalidate("setSize");
    this.setScrollPosition(this.tmpPos);
  }
  /** :153-171 */
  setEnabled(enabledFlag?: boolean) {
    this.cleanUI();
    super.setEnabled(enabledFlag);
    this.enable = enabledFlag as boolean;
    this.boundingBox_mc?.gotoAndStop(!this.enable ? "disabled" : "enabled");
    const n = Math.min(this.numDisplayed, this.getLength());
    for (let i = 0; i < n; i++) this.item(i)?.setEnabled(this.enable);
    if (this.enable) this.invalidate("updateControl");
  }
  /** :172-181 */
  updateControl() {
    for (let i = 0; i < this.numDisplayed; i++) this.item(i)?.drawItem(this.getItemAt(this.topDisplayed + i), this.isSelected(this.topDisplayed + i));
  }
  /** :182-202 */
  setSize(w: number, h?: number) {
    super.setSize(w, h);
    const bb = this.boundingBox_mc;
    if (bb) {
      bb._xscale = bb._yscale = 100;
      bb._xscale = (this.popupWidth * 100) / bb._width;
      bb._yscale = (this.height * 100) / bb._height;
      bb._visible = this.hideBoundingBox !== undefined ? !this.hideBoundingBox : true;
    }
    for (let i = 0; i < this.numDisplayed; i++) {
      const it = this.container_mc.attachMovie(this.itemSymbol, "fListItem" + i + "_mc", 10 + i, { controller: this, itemNum: i }) as ItemClip | undefined;
      if (!it) continue;
      it.setSize(this.popupWidth - (this.scrollOffset ?? 0), this.itmHgt);
      it._y = (this.itmHgt - 1) * i;
    }
    this.updateControl();
  }
  /** :203-284 */
  modelChanged(eventObj: ModelEvent) {
    const { firstRow = 0, lastRow = 0, event } = eventObj;
    if (event === "addRows") {
      for (const k in this.selected) {
        const s = this.selected[k];
        if (s?.sIndex !== undefined && s.sIndex >= firstRow) {
          s.sIndex += lastRow - firstRow + 1;
          this.setSelectedIndex(s.sIndex, false);
        }
      }
    } else if (event === "deleteRows") {
      if (firstRow === lastRow) {
        const index = firstRow;
        if (this.selectHolder == index) this.selectionDeleted = true;
        if (this.topDisplayed + this.numDisplayed >= this.getLength() && this.topDisplayed > 0) {
          this.topDisplayed--;
          if (this.selectionDeleted && index - 1 >= 0) this.setSelectedIndex(index - 1, false);
        } else if (this.selectionDeleted) {
          const len = this.getLength();
          if ((index === len - 1 && len > 1) || index > len / 2) this.setSelectedIndex(index - 1, false);
          else this.setSelectedIndex(index, false);
        }
        for (const k in this.selected) {
          const s = this.selected[k];
          if (s && toNumber(s.sIndex) > firstRow) s.sIndex = toNumber(s.sIndex) - 1;
        }
      } else {
        this.clearSelected();
        this.topDisplayed = 0;
      }
    } else if (event === "sort") {
      const len = this.getLength();
      for (let i = 0; i < len; i++) {
        if (!this.isSelected(i)) continue;
        const id = this.dataProvider.getItemID(i);
        if (id === this.lastSelID) this.lastSelected = i;
        const s = this.selected[str(id)];
        if (s) s.sIndex = i;
      }
    }
    this.invalidate("updateControl");
  }
  /** :285-292 */
  measureItmHgt() {
    const t = this.attachMovie(this.itemSymbol, "tmpItem_mc", 0, { controller: this }) as ItemClip | undefined;
    t?.drawItem({ label: "Sizer: PjtTopg" }, false);
    this.itmHgt = Math.floor(t?._height ?? 0);
    t?.removeMovieClip();
  }
  /** :293-305 — keyed by the item's `__ID__` (String(undefined) is "" in SWF 6). */
  selectItem(index: number | undefined, selectedFlag?: boolean) {
    const key = str(this.dataProvider.getItemID(index));
    if (selectedFlag && !this.isSelected(index)) this.selected[key] = { sIndex: index };
    else if (!selectedFlag) delete this.selected[key];
  }
  /** :306-309 */
  isSelected(index: number | undefined): boolean {
    return this.selected[str(this.dataProvider.getItemID(index))]?.sIndex !== undefined;
  }
  /** :310-324 */
  clearSelected() {
    for (const k in this.selected) {
      const i = this.selected[k]?.sIndex;
      if (i !== undefined && this.topDisplayed <= i && i < this.topDisplayed + this.numDisplayed) this.item(i - this.topDisplayed)?.drawItem(this.getItemAt(i), false);
    }
    this.selected = {};
  }
  /** :325-340 — the AS tests `getItemAt(idx == undefined)` = getItemAt(false), always undefined: always selects. */
  selectionHandler(itemNum: number) {
    const idx = this.topDisplayed + itemNum;
    this.changeFlag = true;
    this.clearSelected();
    this.selectItem(idx, true);
    this.item(itemNum)?.drawItem(this.getItemAt(idx), this.isSelected(idx));
  }
  /** :341-360 */
  moveSelBy(incr: number) {
    const sel = this.getSelectedIndex();
    let n = toNumber(sel) + incr;
    n = Math.max(0, n);
    n = Math.min(this.getLength() - 1, n);
    if (n === sel) return;
    if (toNumber(sel) < this.topDisplayed || toNumber(sel) >= this.topDisplayed + this.numDisplayed) this.setScrollPosition(toNumber(sel));
    if (n >= this.topDisplayed + this.numDisplayed || n < this.topDisplayed) this.setScrollPosition(this.topDisplayed + incr);
    this.selectionHandler(n - this.topDisplayed);
  }
  /** :361-371 */
  clickHandler(itmNum: number) {
    this.focusRect?.removeMovieClip();
    if (!this.focused) this.pressFocus();
    this.selectionHandler(itmNum);
    this.onMouseUp = this.releaseHandler;
  }
  /** :372-390 — double click = two qualifying releases < 400 ms apart. */
  releaseHandler() {
    if (this.changeFlag) {
      if (getTimer() - toNumber(this.__lastClick__) < 400) this.onDblClick?.();
      else this.onClick?.();
      this.__lastClick__ = getTimer();
      this.executeCallBack();
    }
    this.changeFlag = false;
    this.onMouseUp = undefined;
  }
  /** :391-401 */
  myOnSetFocus() {
    super.myOnSetFocus();
    for (let i = 0; i < this.numDisplayed; i++) this.item(i)?.highlight_mc?.gotoAndStop("enabled");
  }
  /** :402-412 */
  myOnKillFocus() {
    super.myOnKillFocus();
    for (let i = 0; i < this.numDisplayed; i++) this.item(i)?.highlight_mc?.gotoAndStop("unfocused");
  }
}
Object.assign(FSelectableListClass.prototype, { selected: {}, topDisplayed: 0, numDisplayed: 0, lastSelected: 0 });

// ---- FScrollSelectListSymbol.as — FScrollSelectListClass -----------------------------------------------------------
/** What a list needs from its scroll bar (Ank::Dofus::ScrollBar, controls.ts). */
export type ListScrollBar = MovieClip & {
  setScrollPosition(pos: number): void; getScrollPosition(): number; setEnabled(b?: boolean): void; setSize(h: number): void;
  setChangeHandler(chng: string, obj?: unknown): void; setLargeScroll(n: number): void; setScrollProperties(pSize: number, mnPos: number, mxPos: number): void;
};
export abstract class FScrollSelectListClass extends FSelectableListClass {
  declare scrollBar_mc: ListScrollBar | undefined;
  declare extScrollBar_mc: ListScrollBar | undefined;
  declare permaScrollBar: boolean;
  declare removed: boolean;
  declare dragScrolling: number | undefined;
  declare scrollInterval: number;
  declare lastPosition: number;
  declare keyCodes: number[];
  declare keyIncrs: number[];

  /** :6-9 */
  getScrollPosition(): number {
    return this.topDisplayed;
  }
  /** :10-20 — only the scroll bar's callback (scrollHandler) moves `topDisplayed`. */
  setScrollPosition(pos: number) {
    if (!this.enable) return;
    pos = Math.min(pos, this.getLength() - this.numDisplayed);
    pos = Math.max(pos, 0);
    this.scrollBar_mc?.setScrollPosition(pos);
  }
  /** :21-26 */
  setAutoHideScrollBar(flag: boolean) {
    this.permaScrollBar = !flag;
    this.setSize(this.width, this.height);
  }
  /** :27-31 */
  setEnabled(enabledFlag?: boolean) {
    super.setEnabled(enabledFlag);
    this.scrollBar_mc?.setEnabled(this.enable);
  }
  /** :32-44 */
  setSize(w: number, h?: number) {
    const pos = this.getScrollPosition();
    super.setSize(w, h);
    if (this.scrollBar_mc !== undefined) this.removed = true;
    this.scrollBar_mc = undefined;
    this.initScrollBar();
    this.setScrollPosition(pos);
  }
  /** :45-49 */
  modelChanged(eventObj: ModelEvent) {
    super.modelChanged(eventObj);
    this.invalidate("initScrollBar");
  }
  /** :50-89 */
  initScrollBar() {
    if (!this.permaScrollBar && this.getLength() <= this.numDisplayed) {
      if (this.removed) {
        this.scrollBar_mc?.removeMovieClip();
        this.scrollBar_mc = undefined;
        this.scrollOffset = undefined;
        this.invalidate("setSize");
      }
      return;
    }
    if (this.scrollBar_mc === undefined) {
      if (this.extScrollBar_mc === undefined) {
        this.scrollBar_mc = this.container_mc.attachMovie("Ank::Dofus::ScrollBar", "scrollBar_mc", 3000, { hostStyle: this.styleTable }) as ListScrollBar | undefined;
        if (this.scrollBar_mc) {
          this.scrollBar_mc.setSize(this.height);
          this.scrollBar_mc._x = this.popupWidth - this.scrollBar_mc._width;
          this.scrollBar_mc._y = 0;
          this.scrollOffset = this.scrollBar_mc._width;
        }
        this.invalidate("setSize");
      } else {
        this.container_mc.scrollBar_mc = this.extScrollBar_mc;
        this.scrollBar_mc = this.extScrollBar_mc;
        this.scrollOffset = 0;
      }
      this.scrollBar_mc?.setChangeHandler("scrollHandler", this);
      this.scrollBar_mc?.setLargeScroll(this.numDisplayed - 1);
      this.invalidate("setSize");
    }
    this.scrollBar_mc?.setScrollProperties(this.numDisplayed, 0, this.getLength() - this.numDisplayed);
  }
  /** :90-100 */
  scrollHandler(scrollBar: ListScrollBar) {
    const pos = scrollBar.getScrollPosition();
    this.topDisplayed = pos;
    if (this.lastPosition !== pos) this.updateControl();
    this.lastPosition = pos;
  }
  /** :101-109 */
  clickHandler(itmNum: number) {
    super.clickHandler(itmNum);
    if (this.dragScrolling === undefined && this.scrollBar_mc !== undefined) this.dragScrolling = setInterval(this, "dragScroll", 15);
  }
  /** :110-115 */
  releaseHandler() {
    clearInterval(this.dragScrolling);
    this.dragScrolling = undefined;
    super.releaseHandler();
  }
  /** :116-138 — dragging past the list edges scrolls it. */
  dragScroll() {
    clearInterval(this.dragScrolling);
    const ym = this.container_mc._ymouse, bottom = (this.itmHgt - 2) * this.numDisplayed;
    if (ym < 0) {
      this.setScrollPosition(this.getScrollPosition() - 1);
      this.selectionHandler(0);
      this.scrollInterval = Math.max(25, -23.8 * -ym + 500);
    } else if (ym > bottom) {
      this.setScrollPosition(this.getScrollPosition() + 1);
      this.selectionHandler(this.numDisplayed - 1);
      this.scrollInterval = Math.max(25, -23.8 * Math.abs(ym - bottom - 2) + 500);
    } else return void (this.dragScrolling = setInterval(this, "dragScroll", 15));
    this.dragScrolling = setInterval(this, "dragScroll", this.scrollInterval);
  }
  /** :139-163 — Down, Up, PgDown, PgUp, Home, End; other keys search by first letter. */
  myOnKeyDown() {
    if (!this.focused) return;
    this.keyCodes = [40, 38, 34, 33, 36, 35];
    this.keyIncrs = [1, -1, this.numDisplayed - 1, -(this.numDisplayed - 1), -this.getLength(), this.getLength()];
    const i = this.keyCodes.findIndex((c) => Key.isDown(c));
    if (i >= 0) this.moveSelBy(this.keyIncrs[i]!);
    else this.findInputText();
  }
  /** :164-171 */
  findInputText() {
    const a = Key.getAscii();
    if (a >= 33 && a <= 126) this.findString(String.fromCharCode(a));
  }
  /** :172-201 — with no selection the AS loop never meets its end test (endless loop in Flash); capped here. */
  findString(s: string) {
    if (this.getLength() === 0) return;
    const sel = this.getSelectedIndex();
    let jump = 0;
    for (let i = toNumber(sel) + 1, n = 0; i !== sel && n <= this.getLength(); n++) {
      const l = this.getItemAt(i)?.label, head = typeof l === "string" ? l.substring(0, s.length) : undefined;
      if (head !== undefined && (s === head || s.toUpperCase() === head.toUpperCase())) {
        jump = i - toNumber(sel);
        break;
      }
      if (i >= this.getLength() - 1) i = -1;
      i++;
    }
    if (jump !== 0) this.moveSelBy(jump);
  }
}
