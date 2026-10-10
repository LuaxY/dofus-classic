// AKSClient/Dofus.BattleField.Selection.as — `Dofus::BattleField::Selection` (BATTLEFIELD.Selection, depth 400):
// coloured full cells (`MC_Cell_Full`) in Container.Selection. Depths used by callers: 0 placement cells, 8 path
// preview / selected path, 9 path already walked (docs/logic/battlefield.md §5).
import { Color, MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldContainer } from "./container.ts";
import type { BattleFieldMap } from "./map.ts";

type CellClip = MovieClip & { c?: Color };

export class BattlefieldSelection extends MovieClip {
  declare container: BattleFieldContainer;
  declare map: BattleFieldMap;
  declare selectedCells: (CellClip | undefined)[];

  constructor() {
    super();
    this.init();
  }

  /** Selection.as:7-13 */
  init(): void {
    this.container = G.BATTLEFIELD.Container;
    this.map = G.BATTLEFIELD.Map;
    this.selectedCells = [];
  }

  /** Selection.as:14-17 */
  setVisible(bool: boolean): void {
    this.container.Selection._visible = bool;
  }

  /** Selection.as:18-22 — no caller. */
  chgColor(cellNum: number, depth: number, col: number): void {
    (this.container.Selection["cell" + String(cellNum) + String(depth)] as CellClip | undefined)?.c?.setRGB(col);
  }

  /**
   * Selection.as:23-48. `txt` is never read. Selection.as:34-35 first write `x * cell_width + dec` from Map-walker
   * fields this object never has (NaN, ignored), then the cell's own position.
   */
  select(cellNum: number, bool: boolean, depth: number, col?: number, _txt?: string): void {
    const cellData = this.map.getData(cellNum);
    if (!cellData) return;
    const cellName = "cell" + String(cellNum) + String(depth);
    if (bool) {
      const mc = this.container.Selection.attachMovie("MC_Cell_Full", cellName, Number(cellNum) * 100 + Number(depth)) as CellClip | undefined;
      if (mc) {
        mc._x = cellData.x as number;
        mc._y = cellData.y as number;
        mc.c = new Color(mc);
        mc.c.setRGB(col as number);
        mc.gotoAndStop(cellData.groundSlope as number);
      }
      this.selectedCells.push(mc);
    } else (this.container.Selection[cellName] as MovieClip | undefined)?.removeMovieClip();
  }

  /** Selection.as:49-61 — removes only the recorded clips. */
  unSelectAll(): void {
    for (const c of this.selectedCells) c?.removeMovieClip();
    this.selectedCells = [];
  }

  /** Selection.as:62-70 — removes every child of Container.Selection. */
  clearAll(): void {
    const s = this.container.Selection;
    for (const k in s) (s[k] as MovieClip | undefined)?.removeMovieClip?.();
    this.selectedCells = [];
  }

  /** Selection.as:71-81 — no caller. */
  selectAll(bool: boolean, depth: number, col: number): void {
    const len = this.map.data.data.length;
    for (let i = 0; i < len; i++) this.select(i, bool, depth, col);
  }
}
registerClass("Dofus::BattleField::Selection", BattlefieldSelection);
