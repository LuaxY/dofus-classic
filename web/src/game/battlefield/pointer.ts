// AKSClient/Dofus.BattleField.Pointer.as — `Dofus::BattleField::Pointer` (BATTLEFIELD.Pointer, depth 500): spell range
// (`fixedZone`) and area (`dragZone`) outlines drawn with the drawing API into Container.Pointer, following each
// traversed cell's real corners (docs/logic/battlefield.md §6, map-format.md §6).
import { getDirection } from "../../core/pathfinding.ts";
import { toNumber } from "../../core/swf6.ts";
import { MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldCharacter } from "./characters.ts";
import { characterAt, deps } from "./deps.ts";
import type { BattleFieldMap } from "./map.ts";

type Ground = { gf: number; gl: number };
type Shape = { shape: string | undefined; size: number | undefined; col: number };

export class BattlefieldPointer extends MovieClip {
  /** `[groundSlope][corner: left, top, right, bottom][x, y]`, Pointer.as:3. Index 0 is empty. */
  declare cellCoord: number[][][];
  declare map: BattleFieldMap;
  declare shapes: Shape[] | undefined;

  constructor() {
    super();
    this.cellCoord = [[], [[-26.5, 0], [0, -13.5], [26.5, 0], [0, 13.5]], [[-26.5, -20], [0, -13.5], [26.5, 0], [0, 13.5]], [[-26.5, 0], [0, -33.5], [26.5, 0], [0, 13.5]], [[-26.5, -20], [0, -33.5], [26.5, 0], [0, 13.5]], [[-26.5, 0], [0, -13.5], [26.5, -20], [0, 13.5]], [[-26.5, -20], [0, -13.5], [26.5, -20], [0, 13.5]], [[-26.5, 0], [0, -33.5], [26.5, -20], [0, 13.5]], [[-26.5, -20], [0, -33.5], [26.5, -20], [0, 13.5]], [[-26.5, 0], [0, -13.5], [26.5, 0], [0, -6.5]], [[-26.5, -20], [0, -13.5], [26.5, 0], [0, -6.5]], [[-26.5, 0], [0, -33.5], [26.5, 0], [0, -6.5]], [[-26.5, -20], [0, -33.5], [26.5, 0], [0, -6.5]], [[-26.5, 0], [0, -13.5], [26.5, -20], [0, -6.5]], [[-26.5, -20], [0, -13.5], [26.5, -20], [0, -6.5]], [[-26.5, 0], [0, -33.5], [26.5, -20], [0, -6.5]]];
    this.init();
  }

  /**
   * Pointer.as:11-14 stores `container = BATTLEFIELD.Container.Pointer` once. Container.clear() (run before every map
   * build) recreates that clip; Flash resolves the stale reference by its target path to the new clip, the runtime
   * holds JS references, so the path lookup is done on every access instead.
   */
  get container(): MovieClip & { fixedZone?: MovieClip; dragZone?: MovieClip } {
    return G.BATTLEFIELD.Container.Pointer;
  }

  /** Pointer.as:8-16 */
  init(): void {
    this.map = G.BATTLEFIELD.Map;
  }

  /** Pointer.as:17-21 */
  setVisible(bool: boolean): void {
    if (this.container.dragZone) this.container.dragZone._visible = bool;
    this.unselectAllCharacters(false);
  }

  /** Pointer.as:22-30 */
  clearAll(): void {
    this.clearDrag();
    this.clearFixed();
    this.shapes = [];
    this.setVisible(true);
    this.unselectAllCharacters(true);
  }

  /** Pointer.as:31-38 */
  clearDrag(): void {
    this.container.createEmptyMovieClip("dragZone", 2);
  }
  clearFixed(): void {
    this.container.createEmptyMovieClip("fixedZone", 1);
  }

  /** Pointer.as:39-63 — every area shape centred on `cellNum`; `L` extends away from the local player's cell. */
  draw(cellNum: number): void {
    this.clearDrag();
    for (const s of this.shapes ?? []) {
      switch (s.shape) {
        case "P":
          this.drawCircle(false, 0, s.col, cellNum);
          break;
        case "C":
          this.drawCircle(false, s.size as number, s.col, cellNum);
          break;
        case "L":
          this.drawLine(false, s.size as number, s.col, cellNum, (deps.DATACENTER.Player.clip as BattleFieldCharacter | undefined)?.getCellNum() as number);
          break;
        case "X":
          this.drawCross(false, s.size as number, s.col, cellNum);
      }
    }
  }

  /** Pointer.as:64-67 */
  addShape(shape: string | undefined, size: number | undefined, col: number): void {
    this.shapes?.push({ shape, size, col });
  }

  /** Pointer.as:68-75 */
  drawFixedCircle(ray: number, col: number, centerCellNum: number): void {
    this.drawCircle(true, ray, col, centerCellNum);
  }
  drawFixedCross(ray: number, col: number, centerCellNum: number): void {
    this.drawCross(true, ray, col, centerCellNum);
  }

  /** Pointer.as:76-85 — range 63: the whole 742×432 viewport (the AS assigns an undeclared global `z`). */
  drawFixedRect(col: number): void {
    const z = this.container.fixedZone;
    if (!z) return;
    z.beginFill(col, 50);
    z.moveTo(0, 0);
    z.lineTo(742, 0);
    z.lineTo(742, 432);
    z.lineTo(0, 432);
    z.endFill();
  }

  /** Pointer.as:86-91 — the zone sits on the cell with the ground offset removed (the outlines carry their own). */
  movePointerTo(zone: MovieClip | undefined, cellNum: number): void {
    const d = this.map.getData(cellNum);
    if (!zone) return;
    zone._x = toNumber(d?.x);
    zone._y = toNumber(d?.y) + 20 * (toNumber(d?.groundLevel) - 7);
  }

  private zone(bFixed: boolean): MovieClip | undefined {
    return bFixed ? this.container.fixedZone : this.container.dragZone;
  }
  /** `cellCoord[gf][corner][axis]`; an empty slope entry reads undefined, i.e. 0 in the AS additions. */
  private c(g: Ground, corner: number, axis: 0 | 1): number {
    return toNumber(this.cellCoord[g.gf]?.[corner]?.[axis]);
  }

  /** Pointer.as:92-162 — staircase outline of every cell with |ΔX| + |ΔY| <= ray. */
  drawCircle(bFixed: boolean, ray: number, col: number, centerCellNum: number): void {
    const mw = this.map.getWidth(), xStart = -ray * 26.5, yStart = -ray * 13.5;
    const z = this.zone(bFixed);
    let cellNum = centerCellNum - ray * mw;
    let g: Ground, i: number, j: number;
    z?.beginFill(col, 50);
    z?.lineStyle(1, col, 100);
    g = this.getGroundData(cellNum);
    z?.moveTo(xStart + this.c(g, 0, 0), yStart + this.c(g, 0, 1) - g.gl * 20);
    for (i = 0; i < ray + 1; i++) {
      if (i != 0) cellNum++;
      g = this.getGroundData(cellNum);
      z?.lineTo(xStart + this.c(g, 1, 0) + i * 53, yStart + this.c(g, 1, 1) - g.gl * 20);
      z?.lineTo(xStart + this.c(g, 2, 0) + i * 53, yStart + this.c(g, 2, 1) - g.gl * 20);
    }
    i -= 1;
    for (j = 0; j < ray; j++) {
      cellNum += mw * 2 - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(xStart + this.c(g, 1, 0) + i * 53, yStart + this.c(g, 1, 1) + (j + 1) * 27 - g.gl * 20);
      z?.lineTo(xStart + this.c(g, 2, 0) + i * 53, yStart + this.c(g, 2, 1) + (j + 1) * 27 - g.gl * 20);
    }
    for (i = ray; i >= 0; i--) {
      if (i != ray) cellNum--;
      g = this.getGroundData(cellNum);
      z?.lineTo(xStart + this.c(g, 3, 0) + i * 53, yStart + this.c(g, 3, 1) + j * 27 - g.gl * 20);
      z?.lineTo(xStart + this.c(g, 0, 0) + i * 53, yStart + this.c(g, 0, 1) + j * 27 - g.gl * 20);
    }
    i += 1;
    for (j = ray - 1; j >= 0; j--) {
      cellNum -= mw * 2 - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(xStart + this.c(g, 3, 0) + i * 53, yStart + this.c(g, 3, 1) + j * 27 - g.gl * 20);
      z?.lineTo(xStart + this.c(g, 0, 0) + i * 53, yStart + this.c(g, 0, 1) + j * 27 - g.gl * 20);
    }
    z?.endFill();
    this.movePointerTo(z, centerCellNum);
    this.selectCharactersIn(z, centerCellNum, bFixed);
  }

  /** Pointer.as:163-262 — the cell plus four arms of `ray` cells along ±X and ±Y. */
  drawCross(bFixed: boolean, ray: number, col: number, centerCellNum: number): void {
    this.drawArms(bFixed, [ray, ray, ray, ray], col, centerCellNum);
  }

  /**
   * Pointer.as:263-369 — one arm of `length` cells on arm `getDirection(refCellNum, extremCellNum)` (0 = X−1,
   * 1 = Y−1, 2 = X+1, 3 = Y+1: away from the caster), none when both cells are equal.
   */
  drawLine(bFixed: boolean, length: number, col: number, extremCellNum: number, refCellNum: number): void {
    const ray = [0, 0, 0, 0];
    if (refCellNum != extremCellNum) ray[getDirection(refCellNum, extremCellNum, this.map.getWidth())] = length;
    this.drawArms(bFixed, ray, col, extremCellNum);
  }

  /**
   * The outline walk shared verbatim by drawCross (all arms = ray) and drawLine (one arm): arm 0 goes −W (up-left),
   * arm 1 −(W−1) (up-right), arm 2 +W (down-right), arm 3 +(W−1) (down-left), corners from each crossed cell.
   */
  private drawArms(bFixed: boolean, ray: number[], col: number, centerCellNum: number): void {
    const mw = this.map.getWidth(), z = this.zone(bFixed), [r0, r1, r2, r3] = ray as [number, number, number, number];
    let cellNum = centerCellNum, g: Ground, i: number;
    z?.beginFill(col, 50);
    z?.lineStyle(1, col, 100);
    g = this.getGroundData(cellNum);
    z?.moveTo(this.c(g, 0, 0), this.c(g, 0, 1) - g.gl * 20);
    for (i = 1; i <= r0; i++) {
      cellNum -= mw;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 0, 0) - i * 26.5, this.c(g, 0, 1) - g.gl * 20 - i * 13.5);
    }
    for (i = r0; i >= 0; i--) {
      if (i != r0) cellNum += mw;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 1, 0) - i * 26.5, this.c(g, 1, 1) - g.gl * 20 - i * 13.5);
    }
    for (i = 1; i <= r1; i++) {
      cellNum -= mw - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 1, 0) + i * 26.5, this.c(g, 1, 1) - g.gl * 20 - i * 13.5);
    }
    for (i = r1; i >= 0; i--) {
      if (i != r1) cellNum += mw - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 2, 0) + i * 26.5, this.c(g, 2, 1) - g.gl * 20 - i * 13.5);
    }
    for (i = 1; i <= r2; i++) {
      cellNum += mw;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 2, 0) + i * 26.5, this.c(g, 2, 1) - g.gl * 20 + i * 13.5);
    }
    for (i = r2; i >= 0; i--) {
      if (i != r2) cellNum -= mw;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 3, 0) + i * 26.5, this.c(g, 3, 1) - g.gl * 20 + i * 13.5);
    }
    for (i = 1; i <= r3; i++) {
      cellNum += mw - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 3, 0) - i * 26.5, this.c(g, 3, 1) - g.gl * 20 + i * 13.5);
    }
    for (i = r3; i > 0; i--) {
      if (i != r3) cellNum -= mw - 1;
      g = this.getGroundData(cellNum);
      z?.lineTo(this.c(g, 0, 0) - i * 26.5, this.c(g, 0, 1) - g.gl * 20 + i * 13.5);
    }
    z?.endFill();
    this.movePointerTo(z, centerCellNum);
    this.selectCharactersIn(z, centerCellNum, bFixed);
  }

  /** Pointer.as:370-376 — out-of-map and inactive cells count as flat level 7. */
  getGroundData(cellNum: number): Ground {
    const d = this.map.getData(cellNum);
    return { gf: d?.groundSlope != undefined ? d.groundSlope : 1, gl: d?.groundLevel != undefined ? d.groundLevel - 7 : 0 };
  }

  /**
   * Pointer.as:377-407 — every character but the local player (unless the spell targets itself) gets its circle;
   * animated if its sprite is inside the zone (range zones also need line of sight from the centre).
   * AS bug kept (not in the docs): `zone.hitTest(sprite._x, sprite._y, true)` passes Object2-local coordinates where
   * Flash expects stage coordinates, so the test is shifted by the Container offset (centerMap) and zoom.
   */
  selectCharactersIn(zone: MovieClip | undefined, cell1: number, bFixed: boolean): void {
    const dc = deps.DATACENTER, localPlayerID = dc.Player.ID;
    const bLaunchOnLocalPLayer = (dc.Player.currentSpell as { m_bOnItSelf?: boolean | null } | null)?.m_bOnItSelf;
    for (const k of Object.keys(dc.Characters.keys)) {
      if (k == localPlayerID && !bLaunchOnLocalPLayer) continue;
      const clip = characterAt(k)?.clip as BattleFieldCharacter | null | undefined;
      if (clip == undefined) continue;
      const cellNum = clip.getCellNum();
      clip.select(true, false, bFixed);
      if (zone?.hitTest(clip.sprite._x, clip.sprite._y, true)) {
        if (!bFixed) clip.select(true, true, bFixed);
        else if (deps.KERNEL?.PathFinding.checkView(cell1, cellNum as number)) clip.select(true, true, bFixed);
      }
    }
  }

  /** Pointer.as:408-420 — back to the plain team circle in fights, no circle otherwise. */
  unselectAllCharacters(bFixed: boolean): void {
    const dc = deps.DATACENTER;
    for (const k of Object.keys(dc.Characters.keys)) (characterAt(k)?.clip as BattleFieldCharacter | null | undefined)?.select(dc.Game.isFight, false, bFixed);
  }
}
registerClass("Dofus::BattleField::Pointer", BattlefieldPointer);
