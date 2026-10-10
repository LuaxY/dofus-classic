// AS2 widgets of modules/Interfaces.swf under __Packages/dofus/graphics/gui/common/: the inventory (Inventory panel,
// docs/logic/ui.md §2.11), its item containers, the object infos viewer and the smiley bar. Top-level twins
// (InventoryViewer.as, InventoryScroller.as, …) only bind the linkages.
import { Constants } from "../../../core/constants.ts";
import type { Item } from "../../../core/datacenter/index.ts";
import { getItemSuperTypeText, getText } from "../../../core/lang.ts";
import { str, toNumber } from "../../../core/swf6.ts";
import { Color, Mouse, MovieClip, registerClass } from "../../../runtime/player.ts";
import { G } from "../../globals.ts";
import { SWFLoader } from "../../kernel/ank.ts";
import { BroadcastClip } from "../ank.ts";
import { type AnkPushButton, asCursor, asListener, type Txt } from "./as.ts";

type ItemData = Item & { position?: string };
/** `Item.canEquip` is an AS property reading `DATACENTER.Player.data.guild`; the core port takes the guild. */
const canEquip = (item: ItemData | null | undefined) => !!item?.canEquip(G.DATACENTER.Player.data?.guild);
const tint = (clip: MovieClip, t: { ra: number; rb: number; ga: number; gb: number; ba: number; bb: number }) => new Color(clip).setTransform(t);
const NO_TINT = { ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0 };

/** `ItemContainer.as`: a slot showing `data.iconFile` fitted into its bounds (margin 5), broadcasting item events. */
export class ItemContainer extends BroadcastClip {
  static MARGIN = 5;
  declare _bEmpty: boolean;
  declare _bEnabled: boolean;
  declare _data: ItemData | null | undefined;
  declare _saveData: ItemData | null | undefined;
  declare _saveWidth: number;
  declare _saveHeight: number;
  declare swfLoader_mc: SWFLoader;
  get isEmpty() {
    return this._bEmpty;
  }
  set isEmpty(b: boolean) {
    this._bEmpty = b;
  }
  initialize() {
    this._listeners = []; // AsBroadcaster.initialize(this)
    const b = this.getBounds(), m = ItemContainer.MARGIN;
    this._saveWidth = Math.abs(b.xMin) + Math.abs(b.xMax) - 2 * m;
    this._saveHeight = Math.abs(b.yMin) + Math.abs(b.yMax) - 2 * m;
    this._data = null;
    this.attachClassMovie(SWFLoader, "swfLoader_mc", 10);
    this.swfLoader_mc.addListener(this);
    this.isEmpty = true;
    this.trackAsMenu = true;
  }
  setItem(itemData: ItemData | null | undefined, _bNoEvent?: unknown) {
    this._saveData = this._data;
    this._data = itemData;
    if (itemData) itemData.position = this._name;
    this.useHandCursor = itemData != null;
    this.swfLoader_mc.clear();
    if (itemData != null) this.swfLoader_mc.loadSWF(itemData.iconFile);
    this.isEmpty = itemData == null;
    return this._saveData;
  }
  setEnabled(bool: boolean) {
    this._bEnabled = bool;
    if (bool) {
      this.onRelease = this.release;
      this.onPress = this.press;
      this.onRollOver = this.onDragOver = this.rollOver;
      this.onRollOut = this.onDragOut = this.rollOut;
    } else for (const h of ["onRelease", "onPress", "onRollOver", "onRollOut", "onDragOver", "onDragOut"]) delete this[h];
  }
  onLoadComplete(item: MovieClip) {
    if (item._width > item._height) {
      item._width = this._saveWidth;
      item._yscale = item._xscale;
    } else {
      item._height = this._saveHeight;
      item._xscale = item._yscale;
    }
    item._x = item._y = 0;
    const b = item.getBounds(this);
    item._x = -item._width / 2 - b.xMin;
    item._y = -item._height / 2 - b.yMin;
  }
  get getItem() {
    return this.swfLoader_mc;
  }
  get data() {
    return this._data;
  }
  // set by subclasses
  declare release?: () => void;
  declare press?: () => void;
  declare rollOver?: () => void;
  declare rollOut?: () => void;
}

/** `InventoryItemContainer.as`: an item of the scroller (drag source). */
export class InventoryItemContainer extends ItemContainer {
  constructor() {
    super();
    this.initialize();
  }
  override rollOver = () => this.broadcastMessage("onItemRollOver", this.data);
  override rollOut = () => this.broadcastMessage("onItemRollOut", this.data);
  override press = () => {
    if (G.DATACENTER.Game.isFight) return void G.INTERFACE.msgBox(getText("CANT_MOVE_ITEM_IN_GAME"));
    if (!this.isEmpty) {
      this.broadcastMessage("onItemRollOver", this.data);
      G.INTERFACE.setSpellCursor(asCursor(this._data));
      this.onMouseUp = () => {
        G.INTERFACE.setSpellCursor(null);
        this.broadcastMessage("onItemRollOut", this.data);
        delete this.onMouseUp;
      };
      Mouse.addListener(this); // never removed (only onMouseUp is deleted)
    }
  };
}
registerClass("InventoryItemContainer", InventoryItemContainer);

/** `EquipementItemContainer.as`: an equipment slot (`_superType`, `_positionID` from on(initialize)). */
export class EquipementItemContainer extends ItemContainer {
  declare _superType: number;
  declare _positionID: number;
  declare usedSquare_mc?: MovieClip;
  declare selectedSquare_mc?: MovieClip;
  declare emptySquare_mc?: MovieClip;
  declare selectedBlinkSquare_mc?: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  get enabled() {
    return this._bEnabled;
  }
  get superType() {
    return this._superType;
  }
  get positionID() {
    return this._positionID;
  }
  override get isEmpty() {
    return super.isEmpty;
  }
  override set isEmpty(b: boolean) {
    super.isEmpty = b;
    if (this.usedSquare_mc) this.usedSquare_mc._visible = !b;
  }
  override initialize() {
    super.initialize();
    this.setEnabled(true);
  }
  override setEnabled(bool: boolean) {
    super.setEnabled(bool);
    this.select(bool);
  }
  selectBlink(bool: boolean) {
    const s = this.selectedBlinkSquare_mc;
    if (s) s._visible = bool;
    if (bool) s?.play();
    else s?.gotoAndStop(1);
  }
  select(bool: boolean) {
    if (!this._bEnabled) bool = false;
    if (this.selectedSquare_mc) this.selectedSquare_mc._visible = bool;
    if (this.emptySquare_mc) this.emptySquare_mc._visible = !bool;
    if (this.selectedBlinkSquare_mc) this.selectedBlinkSquare_mc._visible = false;
    this.selectedBlinkSquare_mc?.gotoAndStop(1);
  }
  override rollOver = () => {
    tint(this, { ra: 70, rb: 128, ga: 70, gb: 128, ba: 70, bb: 128 });
    if (!this.isEmpty) this.broadcastMessage("onItemInfos", this.data);
  };
  override rollOut = () => {
    tint(this, NO_TINT);
    if (!this.isEmpty) this.broadcastMessage("onItemInfos", null);
  };
  override release = () => {
    if (G.DATACENTER.Game.isFight) {
      // AS bug kept: unqualified `Translator.getText` in an AS2 class is undefined → msgBox(undefined) → "Impossible" (ui.md §6.2)
      return void G.INTERFACE.msgBox(undefined);
    }
    const d = G.INTERFACE.lastSpellcursorData as unknown as ItemData | null | undefined;
    if (d != null && Number(d.superType) == Number(this._superType) && d.m_ID != this.data?.m_ID && canEquip(d)) {
      if (!this.isEmpty) this.broadcastMessage("onReplaceItem", this.data);
      this.setItem(d);
      this.onAddItem(this.data);
      G.INTERFACE.lastSpellcursorData = null;
    }
  };
  override press = () => {
    if (G.DATACENTER.Game.isFight) return void G.INTERFACE.msgBox("Impossible de modifier l'inventaire en combat."); // beta literal
    if (!this.isEmpty) {
      G.INTERFACE.setSpellCursor(asCursor(this._data));
      this.onMouseUp = () => {
        G.INTERFACE.setSpellCursor(null);
        this.broadcastMessage("onTestMouse", this.data);
        this.broadcastMessage("onItemOff", this.data);
        delete this.onMouseUp;
      };
      Mouse.addListener(this);
      this.broadcastMessage("onItemPlacement", this.data);
    }
    G.INTERFACE.lastSpellcursorData = null;
  };
  onSetItem(_itemData: unknown) {}
  onAddItem(itemData: unknown) {
    this.broadcastMessage("onEquipItem", itemData, this.positionID);
  }
}
registerClass("EquipementItemContainer", EquipementItemContainer);

/** `DropItemContainer.as`: the drop zone (drop → `onDropItem` → question box). */
export class DropItemContainer extends ItemContainer {
  declare usedSquare_mc?: MovieClip;
  declare selectedSquare_mc?: MovieClip;
  declare emptySquare_mc?: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  override get isEmpty() {
    return super.isEmpty;
  }
  override set isEmpty(b: boolean) {
    super.isEmpty = b;
    if (this.usedSquare_mc) this.usedSquare_mc._visible = !b;
  }
  override initialize() {
    super.initialize();
    this.setEnabled(true);
  }
  override setEnabled(bool: boolean) {
    super.setEnabled(bool);
    this.select(bool);
  }
  select(bool: boolean) {
    if (!this._bEnabled) bool = false;
    if (this.selectedSquare_mc) this.selectedSquare_mc._visible = bool;
    if (this.emptySquare_mc) this.emptySquare_mc._visible = !bool;
  }
  override rollOver = () => tint(this, { ra: 70, rb: 128, ga: 0, gb: 128, ba: 0, bb: 255 });
  override rollOut = () => tint(this, NO_TINT);
  override release = () => {
    if (G.INTERFACE.lastSpellcursorData != null) {
      this.broadcastMessage("onDropItem", G.INTERFACE.lastSpellcursorData);
      G.INTERFACE.lastSpellcursorData = null;
    }
  };
  override press = () => void (G.INTERFACE.lastSpellcursorData = null);
}
registerClass("DropItemContainer", DropItemContainer);

/** `InventoryScroller.as`: carousel of unequipped items (m_Position == -1) passing the filters, 50 px apart. */
export class InventoryScroller extends BroadcastClip {
  static ITEM_SPACER = 50;
  static ITEM_SYMBOL = "InventoryItemContainer";
  declare _filter: unknown[];
  declare _itemCount: number;
  declare _selectedIndex: number;
  declare _destX: number | undefined;
  declare _inventory: ItemData[];
  declare scroller_mc?: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  get selectedIndex() {
    return this._selectedIndex;
  }
  get selectedItem() {
    return (this.scroller_mc?.[`item${this.selectedIndex}_mc`] as ItemContainer | undefined)?.data;
  }
  get count() {
    return this._itemCount;
  }
  private item(i: number) {
    return this.scroller_mc?.[`item${i}_mc`] as InventoryItemContainer | undefined;
  }
  initialize() {
    this._listeners = [];
    this._filter = [];
  }
  generate() {
    this.scroller_mc?.removeMovieClip();
    const sc = this.createEmptyMovieClip("scroller_mc", 10);
    this._inventory = G.DATACENTER.Player.Inventory;
    this._itemCount = 0;
    for (const it of this._inventory) {
      if (this.isFiltred(it.superType) && it.m_Position == -1) {
        const c = sc.attachMovie(InventoryScroller.ITEM_SYMBOL, `item${this.count}_mc`, 10 * this.count, { _x: this.count * InventoryScroller.ITEM_SPACER }) as InventoryItemContainer | undefined;
        c?.addListener(this);
        c?.setItem(it);
        this._itemCount = this._itemCount + 1;
      }
    }
    this._selectedIndex = 0;
    this._destX = 0;
    this.finalizeScroll(1);
  }
  changeFilterType(typeID: number, value: unknown) {
    this._filter[typeID] = value;
  }
  move(bRight: boolean) {
    let dir = !bRight ? -1 : 1;
    this._selectedIndex -= dir;
    if (this._selectedIndex >= this.count) {
      this._selectedIndex = 0;
      this._destX = 0;
      dir *= -1;
    } else if (this._selectedIndex < 0) {
      this._selectedIndex = this.count - 1;
      this._destX = -(this.count - 1) * InventoryScroller.ITEM_SPACER;
      dir *= -1;
    } else {
      const d = InventoryScroller.ITEM_SPACER * dir;
      this._destX = this._destX == undefined ? toNumber(this.scroller_mc?._x) + d : this._destX + d;
    }
    let i = 0;
    this.onEnterFrame = () => {
      const sc = this.scroller_mc;
      i++;
      if (sc) sc._x += i * i * dir;
      this.scaleScroller(-toNumber(sc?._x));
      if (toNumber(sc?._x) * dir > toNumber(this._destX) * dir) {
        this.finalizeScroll(-toNumber(sc?._x));
        delete this.onEnterFrame;
      }
      this.scaleScroller(-toNumber(sc?._x));
    };
  }
  scaleScroller(x: number) {
    for (let i = 0; i < this.count; i++) {
      const c = this.item(i);
      if (!c) continue;
      const dist = Math.abs(c._x - x), s = 100 - Math.min(50, dist);
      c._xscale = c._yscale = s;
      c.swapDepths(s);
      c._visible = dist <= 90;
      new Color(c).setTransform(s < 95 ? { ra: s, rb: 2, ga: s, gb: 65, ba: s, bb: 111, aa: s, ab: 0 } : { ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0, aa: 100, ab: 0 });
    }
  }
  finalizeScroll(x: number) {
    for (let i = 0; i < this.count; i++) this.item(i)?.setEnabled(false);
    const c = this.item(this.selectedIndex);
    c?.setEnabled(true);
    this.scaleScroller(x);
    if (this.scroller_mc) this.scroller_mc._x = toNumber(this._destX);
    this.broadcastMessage("onItemInfos", c?.data);
  }
  isFiltred(type: unknown) {
    const f = this._filter[toNumber(type)];
    return f == true || f == undefined;
  }
  onItemRollOver(itemData: unknown) {
    this.broadcastMessage("onItemPlacement", itemData);
  }
  onItemRollOut(itemData: unknown) {
    this.broadcastMessage("onItemOff", itemData);
  }
}
registerClass("InventoryScroller", InventoryScroller);

type Viewer = MovieClip & { view(item: ItemData | null | undefined): void };
/** `InventoryViewer.as` (sprite 598): equipment slots, filters, scroller, drop zone, object infos. */
export class InventoryViewer extends MovieClip {
  static SQUARE_COUNT = 6;
  declare drop_mc?: DropItemContainer;
  declare inventoryScroller_mc?: InventoryScroller;
  declare objectInfosViewer_mc?: Viewer;
  constructor() {
    super();
    this.initialize();
  }
  private slot(i: number) {
    return this[`equipement${i}_mc`] as EquipementItemContainer | undefined;
  }
  initialize() {
    G.DATACENTER.Player.addListener(asListener(this));
    this.onEnterFrame = () => {
      this.refresh();
      this.inventoryScroller_mc?.addListener(this);
      this.onItemInfos(this.inventoryScroller_mc?.selectedItem);
      for (let i = 0; i < InventoryViewer.SQUARE_COUNT; i++) this.slot(i)?.addListener(this);
      this.drop_mc?.addListener(this);
      // `inventory_mc.addListener(this)`: no `inventory_mc` child → no-op (ui.md §2.11)
      for (let i = 0; i < 5; i++) (this[`filter${i}_mc`] as AnkPushButton | undefined)?.addListener(this);
      for (let i = 0; i < 5; i++) (this[`filter${i}_mc`] as AnkPushButton | undefined)?.select(true);
      delete this.onEnterFrame;
    };
  }
  refresh() {
    this.inventoryScroller_mc?.generate();
    for (const it of G.DATACENTER.Player.Inventory) if (it.m_Position != -1) this.slot(toNumber(it.m_Position))?.setItem(it, true);
  }
  selectByType(itemData: ItemData | null | undefined) {
    let count = 0;
    const superType = itemData?.superType;
    for (let i = 0; i < InventoryViewer.SQUARE_COUNT; i++) {
      const s = this.slot(i);
      if (superType == undefined) {
        s?.setEnabled(true);
        s?.selectBlink(false);
        count = 1;
      } else {
        const ok = s?.superType == superType && canEquip(itemData);
        s?.setEnabled(ok);
        s?.selectBlink(ok);
        if (ok) count++;
      }
    }
    // `inventory_mc.setEnabled(true)`: no such child → no-op
    if (count == 0) G.INTERFACE.drawToolTip(getText("CANT_EQUIP"), 0, -10, true, true);
    else G.INTERFACE.hideToolTip();
  }
  updateInventory(itemData: ItemData, position = -1, bGenerate = true) {
    if (itemData.m_Position != -1 && itemData.m_Position != -2) this.slot(toNumber(itemData.m_Position))?.setItem(null);
    itemData.m_Position = position;
    if (bGenerate) this.inventoryScroller_mc?.generate();
  }
  onInventoryChange() {
    this.refresh();
  }
  onItemInfos(itemData: ItemData | null | undefined) {
    this.objectInfosViewer_mc?.view(itemData != null ? itemData : this.inventoryScroller_mc?.selectedItem);
  }
  onItemPlacement(itemData: ItemData) {
    this.selectByType(itemData);
  }
  onItemOff(_itemData: unknown) {
    if (G.INTERFACE.getSpellCursor() == undefined) this.selectByType(null);
  }
  onEquipItem(itemData: ItemData, position: number) {
    this.updateInventory(itemData, position);
    G.AKS.Items.movement(toNumber(itemData.m_ID), position);
  }
  onReplaceItem(itemData: ItemData) {
    this.updateInventory(itemData, -1, false);
  }
  onDropItem(itemData: ItemData) {
    G.INTERFACE.onQuestionBoxYes = () => G.AKS.Items.drop(toNumber(itemData.m_ID));
    G.INTERFACE.questionBox(getText("DO_U_DROP", [itemData.name]));
  }
  onSelect(button: AnkPushButton) {
    for (const p of (button.params ?? []) as number[]) this.inventoryScroller_mc?.changeFilterType(p, button.selected);
    this.inventoryScroller_mc?.generate();
  }
  onToolTipOn(mc: AnkPushButton) {
    let txt = "";
    for (const p of (mc.params ?? []) as unknown[]) txt += ", " + str(getItemSuperTypeText(p));
    G.INTERFACE.drawToolTip(str(!mc.selected ? getText("SHOW") : getText("HIDE")) + " (" + txt.substr(2) + ")", 0, -10, true, false);
  }
  onToolTipOff(_mc: unknown) {
    G.INTERFACE.hideToolTip();
  }
  onTestMouse(itemData: ItemData) {
    const x = this._root._xmouse, y = this._root._ymouse; // `_level0._xmouse`
    if (this.drop_mc?.hitTest(x, y, false)) return;
    for (let i = 0; i < InventoryViewer.SQUARE_COUNT; i++) if (this.slot(i)?.hitTest(x, y, false)) return;
    this.onEquipItem(itemData, -1);
  }
}
registerClass("InventoryViewer", InventoryViewer);

/** `ObjectInfosViewer.as` (sprite 594): name, description, super-type icon frame. */
export class ObjectInfosViewer extends MovieClip {
  declare name_txt: Txt;
  declare description_txt: Txt;
  declare superTypeIcon_mc?: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.view();
  }
  override clear() {
    this.name_txt?.setText("", "Font2");
    if (this.description_txt) this.description_txt.text = "";
  }
  view(itemData?: ItemData | null) {
    if (itemData?.name != undefined) this.name_txt?.setText(itemData.name, "Font2"); // AS: no reset when the name is missing
    if (this.description_txt) this.description_txt.text = itemData?.description == undefined ? "" : itemData.description;
    const icon = this.superTypeIcon_mc;
    if (itemData?.superType != undefined) {
      if (icon) icon._visible = true;
      icon?.gotoAndStop(itemData.superType);
    } else if (icon) icon._visible = false;
  }
}
registerClass("ObjectInfosViewer", ObjectInfosViewer);

/** `SmileyBar.as` (`dofus::graphics::gui::common::SmileyBar`): 8 smileys of `clips/smileys.swf`, toggled by B779. */
export class SmileyBar extends MovieClip {
  static SMILEY_COUNT = 9;
  static SMILEY_SPACE = 25;
  declare _opened: boolean;
  declare simleys_mc: MovieClip;
  constructor() {
    super();
    this.initialize();
  }
  initialize() {
    this.createEmptyMovieClip("simleys_mc", 10);
    this.close();
    for (let i = 1; i < SmileyBar.SMILEY_COUNT; i++) {
      const s = this.simleys_mc.attachMovie("ank::SWFLoader", "smiley" + i, 10 * i) as SWFLoader | undefined;
      if (!s) continue;
      s.loadSWF(Constants.SMILEY_FILE, i);
      s._x = SmileyBar.SMILEY_SPACE * i;
      s._index = i;
      s.onRollOver = () => tint(s, { ra: 100, rb: 50, ga: 100, gb: 50, ba: 100, bb: 50 });
      s.onRollOut = s.onReleaseOutside = () => tint(s, NO_TINT);
      s.onRelease = () => G.AKS.Chat.smiley(i);
    }
  }
  openClose() {
    if (this._opened) this.close();
    else this.open();
  }
  open() {
    this._opened = true;
    this.simleys_mc._visible = true;
  }
  close() {
    this._opened = false;
    this.simleys_mc._visible = false;
  }
}
registerClass("dofus::graphics::gui::common::SmileyBar", SmileyBar);
