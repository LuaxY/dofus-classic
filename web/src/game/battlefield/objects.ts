// AKSClient/Dofus.BattleField.Objects.as (`Dofus::BattleField::Objects`, BATTLEFIELD.Objects, depth 200) and
// AKSClient/Dofus.BattleField.Objects.Object.as (`Dofus::BattleField::Objects::Object`): controllers of the layer-2
// objects; the visible sprite lives in Container.Object2.clips at depth cell·100 so it z-sorts with characters
// (docs/logic/battlefield.md §4, map-format.md §5).
import type { MapCell } from "../../core/compressor.ts";
import { Color, MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldContainer } from "./container.ts";
import { Cell } from "./interaction.ts";
import type { BattleFieldMap } from "./map.ts";

export interface ObjectData {
  fileNum: number | undefined;
  walkable: boolean;
  cellNum?: number;
  anim?: string;
}

type ObjectSprite = MovieClip & { obj?: BattleFieldObject; clip?: MovieClip };

export class BattleFieldObjects extends MovieClip {
  declare list: MovieClip;

  constructor() {
    super();
    this.init();
  }

  /** Objects.as:7-10 */
  init(): void {
    this.createEmptyMovieClip("list", 1);
  }

  /** Objects.as:11-18 */
  build(objectData: ObjectData, cell: number, cellData: MapCell): BattleFieldObject {
    this.list.attachMovie("Dofus::BattleField::Objects::Object", "object" + cell, cell);
    const o = this.list["object" + cell] as BattleFieldObject;
    o.init(objectData, cell, cellData);
    return o;
  }

  /** Objects.as:19-22 */
  get(cellNum: number): BattleFieldObject | undefined {
    return this.list["object" + cellNum] as BattleFieldObject | undefined;
  }

  /** Objects.as:23-26 (shadows MovieClip.clear, as the AS prototype does). */
  clear(cellNum?: number): void {
    this.get(cellNum as number)?.clear();
  }

  /** Objects.as:27-30 — new empty list; the Object2 sprites stay until Container.clear empties objects.swf. */
  clearAll(): void {
    this.init();
  }

  /** Objects.as:31-39 */
  selectAll(bool: boolean): void {
    for (const k in this.list) (this.list[k] as BattleFieldObject).select?.(bool);
  }
}
registerClass("Dofus::BattleField::Objects", BattleFieldObjects);

export class BattleFieldObject extends MovieClip {
  declare container: BattleFieldContainer;
  declare map: BattleFieldMap;
  declare data: ObjectData;
  declare sprite: ObjectSprite | undefined;

  /** Object.as:6-23 */
  init(objectData: ObjectData, cellNum: number, cellData: MapCell): void {
    this.container = G.BATTLEFIELD.Container;
    this.map = G.BATTLEFIELD.Map;
    objectData.cellNum = cellNum;
    this.data = objectData;
    this.sprite = this.container.Object2.clips?.createEmptyMovieClip("cell" + cellNum, cellNum * 100);
    const s = this.sprite;
    if (!s) return;
    s.attachMovie(String(objectData.fileNum), "clip", 10);
    s._x = cellData.x as number;
    s._y = cellData.y as number;
    if (cellData.layerObject2Flip) s._xscale *= -1;
  }

  /** Object.as:24-28 — no caller. */
  chgCell(cellNum: number): void {
    this.data.cellNum = cellNum;
    this.sprite?.swapDepths(cellNum * 100);
  }

  /** Object.as:29-66 — forwards to the cell handlers only while cell interaction is on (`Cell.prototype.onRelease`). */
  setInteraction(bool: boolean): void {
    const s = this.sprite;
    if (!s) return;
    if (bool) {
      s.obj = this;
      s.onRelease = function (this: ObjectSprite) {
        if (Cell.prototype.onRelease) G.BATTLEFIELD.Interaction.onCellRelease(this.obj!.data.cellNum!);
      };
      s.onRollOut = s.onReleaseOutside = function (this: ObjectSprite) {
        if (Cell.prototype.onRelease) {
          G.BATTLEFIELD.Interaction.onCellRollOut(this.obj!.data.cellNum!);
          this.obj!.select(false);
        }
      };
      s.onRollOver = function (this: ObjectSprite) {
        if (Cell.prototype.onRelease) {
          G.BATTLEFIELD.Interaction.onCellRollOver(this.obj!.data.cellNum!);
          this.obj!.select(true);
        }
      };
    } else {
      delete s.onRelease;
      delete s.onReleaseOutside;
      delete s.onRollOver;
      delete s.onRollOut;
    }
  }

  /** Object.as:67-71 — game action 200 → KERNEL.ExecuteAnim → setAnim("state" + k) (Dofus.Kernel.as:63-66). */
  setAnim(anim: string): void {
    this.data.anim = anim;
    this.sprite?.clip?.gotoAndStop(anim);
  }

  /** Object.as:72-75 */
  getAnim(): string | undefined {
    return this.data.anim;
  }

  /** Object.as:76-79 */
  setVisible(bool: boolean): void {
    if (this.sprite) this.sprite._visible = bool;
  }

  /** Object.as:80-120 — no argument toggles on `sprite.selection`, which is never set, so it always selects. */
  select(bool?: boolean): void {
    if (arguments.length == 0) return this.sprite?.selection ? this.select(false) : this.select(true);
    new Color(this.sprite).setTransform(bool ? { ra: 30, rb: 180, ga: 30, gb: 180, ba: 30, bb: 180 } : { ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0 });
  }

  /** Object.as:121-128 — resets `layerObject`/`layerObjectNum`, names no cell has (AS bug, harmless). */
  clear(): void {
    const c = this.map.data?.data[this.data.cellNum as number] as (MapCell & { layerObject?: unknown; layerObjectNum?: unknown }) | undefined;
    if (c) {
      c.layerObject = undefined;
      c.layerObjectNum = undefined;
    }
    this.sprite?.removeMovieClip();
    this.removeMovieClip();
  }

  /** Object.as:129-132 */
  stopAnim(): void {
    this.sprite?.stopAllClip();
  }

  /** Object.as:133-136 */
  playAnim(): void {
    this.sprite?.playAllClip();
  }
}
registerClass("Dofus::BattleField::Objects::Object", BattleFieldObject);
