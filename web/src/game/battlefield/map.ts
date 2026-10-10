// AKSClient/Dofus.BattleField.Map.as — `Dofus::BattleField::Map` (BATTLEFIELD.Map, depth 300): builds the layers from
// DATACENTER.Map (docs/logic/map-format.md §4-5), geometry helpers, tackle zones. `onMapLoad` is
// AKSClient/Events.Battlefield.Map.as (assigned onto this object in the AS). Cell positions come from core/map.ts
// (`layoutMap`/`layoutCell` = the row walker of build/updateCell), tackle zones from ./occupancy.ts.
import type { MapCell, MapData } from "../../core/compressor.ts";
import { TEAMS_COLOR } from "../../core/constants.ts";
import type { Game } from "../../core/datacenter/index.ts";
import { getText } from "../../core/lang.ts";
import { getCellHeight, layoutCell, layoutMap } from "../../core/map.ts";
import { getCaseNum } from "../../core/pathfinding.ts";
import { toNumber } from "../../core/swf6.ts";
import { getTimer, MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldCharacter } from "./characters.ts";
import type { BattleFieldContainer } from "./container.ts";
import { characterAt, deps } from "./deps.ts";
import type { BattleFieldObjects } from "./objects.ts";
import { calculateTacleZones } from "./occupancy.ts";

export class BattleFieldMap extends MovieClip {
  declare container: BattleFieldContainer;
  declare Objects: BattleFieldObjects;
  /** DATACENTER.Map after build (undefined before the first build). */
  declare data: MapData;
  declare cell_width: number;
  declare cell_height: number;
  /** Read by PathFinding.pathFind (Dofus.PathFinding.as:204), never assigned by any code: always undefined. */
  declare bRolePlay?: boolean;

  constructor() {
    super();
    this.init();
  }

  /** Map.as:8-17 — also writes `data.ArrayTacleTeam0/1` while `data` is still undefined (dead code). */
  init(): void {
    this.container = G.BATTLEFIELD.Container;
    this.Objects = G.BATTLEFIELD.Objects;
    this.cell_width = 53;
    this.cell_height = 27;
  }

  /** Map.as:18-21 */
  setVisible(bool: boolean): void {
    this.container._visible = bool;
  }

  /** Map.as:22-29 */
  getWidth(): number {
    return this.data?.width;
  }
  getHeight(): number {
    return this.data?.height;
  }

  /** Map.as:30-33 */
  getData(cellNum: unknown): MapCell | undefined {
    return this.data?.data[Number(cellNum)];
  }

  /** Map.as:34-155 */
  build(mapDataObject: MapData): void {
    this.container.applyMask(mapDataObject.width - 1, mapDataObject.height - 1);
    this.container.centerMap();
    this.container.zoomMap();
    this.data = mapDataObject;
    layoutMap(mapDataObject);
    if (mapDataObject.backgroundNum != 0) this.container.Ground.attach?.(mapDataObject.backgroundNum, "background", -1);
    mapDataObject.data.forEach((cell, i) => cell.active && this.drawCell(i, cell, false));
    this.onMapLoad();
  }

  /** Map.as:156-291 — never removes an existing interaction cell. Before any build: no-op (AS: members of undefined). */
  updateCell(cellNum: number): void {
    if (!this.data) return;
    layoutCell(this.data, cellNum);
    const cell = this.data.data[cellNum], c = this.container;
    if (cell?.active) return this.drawCell(cellNum, cell, true);
    const name = "cell" + cellNum;
    (c.Grid[name] as MovieClip | undefined)?.removeMovieClip();
    (c.Ground.clips?.[name] as MovieClip | undefined)?.removeMovieClip();
    (c.Object1.clips?.[name] as MovieClip | undefined)?.removeMovieClip();
    (c.Object2.clips?.[name] as MovieClip | undefined)?.removeMovieClip();
  }

  /** The per-cell body shared by build (Map.as:58-131) and updateCell (:193-282, `bUpdate`: also remove absent layers). */
  private drawCell(n: number, cell: MapCell, bUpdate: boolean): void {
    const c = this.container, x = cell.x as number, y = cell.y as number, name = "cell" + n;
    const bRolePlay = deps.DATACENTER.Map.bRolePlay;
    if ((!bRolePlay && cell.lineOfSight) || (bRolePlay && cell.movement != 0)) {
      const grid = c.Grid.attachMovie("MC_Cell_Grid", name, n);
      if (grid) {
        grid._x = x;
        grid._y = y;
        if (cell.groundSlope != 1) grid.gotoAndStop(cell.groundSlope as number);
      }
      G.BATTLEFIELD.Interaction.addCell(n, x, y, 0, cell.groundSlope);
    } else if (bUpdate) (c.Grid[name] as MovieClip | undefined)?.removeMovieClip();

    if (cell.layerGroundNum != 0) {
      const path = c.Ground.attach?.(cell.layerGroundNum, name, n);
      const clip = path?.clip as MovieClip | undefined;
      if (path) (path._x = x), (path._y = y);
      const rot = toNumber(cell.layerGroundRot);
      if (cell.groundSlope != 1) clip?.gotoAndStop(cell.groundSlope as number);
      else if (rot != 0 && clip) {
        const rotation = rot * 90;
        if (rotation % 180) (clip._yscale = 192.86), (clip._xscale = 51.85); // keep the iso diamond for 90°/270°
        clip._rotation = rotation;
      }
      if (cell.layerGroundFlip && clip) clip._xscale *= -1; // always false from full maps (Compressor.as:61 bug)
    } else if (bUpdate) (c.Ground.clips?.[name] as MovieClip | undefined)?.removeMovieClip();

    if (cell.layerObject1Num != 0) {
      const path = c.Object1.attach?.(cell.layerObject1Num, name, n);
      const clip = path?.clip as MovieClip | undefined;
      if (path) (path._x = x), (path._y = y);
      const rot = toNumber(cell.layerObject1Rot);
      if (cell.groundSlope == 1 && rot != 0 && clip) {
        clip._rotation = rot * 90;
        if (clip._rotation % 180) (clip._yscale = 192.86), (clip._xscale = 51.85);
      }
      if (cell.layerObject1Flip && clip) clip._xscale *= -1;
    } else if (bUpdate) (c.Object1.clips?.[name] as MovieClip | undefined)?.removeMovieClip();

    if (cell.layerObject2Num != 0) {
      const clipObj = this.Objects.build({ fileNum: cell.layerObject2Num, walkable: true }, n, cell);
      if (cell.layerObject2Interactive) clipObj.setInteraction(true);
    } else if (bUpdate) (c.Object2.clips?.[name] as MovieClip | undefined)?.removeMovieClip();
  }

  /** Map.as:292-296 */
  getCaseNum(x: number, y: number): number {
    return getCaseNum(x, y, deps.DATACENTER.Map.width);
  }

  /** Map.as:297-301 — AS bug kept: computes the height and returns nothing. */
  getCellHeightXY(x: number, y: number): void {
    this.getCellHeight(this.getCaseNum(x, y));
  }

  /** Map.as:302-308 */
  getCellHeight(cellNum: number): number {
    return this.data ? getCellHeight(this.data, cellNum) : 0;
  }

  /** Map.as:309-339 */
  calculateTacleZone(): void {
    if (this.data) calculateTacleZones(this.data, deps.DATACENTER.Characters);
  }

  /** Map.as:340-350 — screen angle (radians) from cell1 to cell2. */
  calculateRotation(cell1: number, cell2: number): number {
    const a = this.getData(cell1), b = this.getData(cell2);
    return Math.atan2(toNumber(b?.y) - toNumber(a?.y), toNumber(b?.x) - toNumber(a?.x));
  }

  /** Events.Battlefield.Map.as:1-64 — after build: solo builds the player's character; multiplayer starts placement. */
  onMapLoad(): void {
    const bf = G.BATTLEFIELD, dc = deps.DATACENTER;
    bf.Container._visible = true;
    deps.log?.("affichage :" + (getTimer() - toNumber(deps.DOFUS?.t)));
    deps.log?.("Total :" + (getTimer() - toNumber(deps.DOFUS?.t1)));
    if (dc.Game.isMultiplayer) {
      deps.INTERFACE?.Text?.setText(getText("WAITING_OTHER", []), false, true);
      const game = deps.AKS?.Game;
      if (game) game.onEverybodyIsReady = () => this.onEverybodyIsReady();
      deps.AKS?.Game.ready();
    } else {
      deps.INTERFACE?.Text?.setTextTimer("", 10);
      bf.Interaction.setEnabled(1);
      const player = characterAt(dc.Player.ID ?? NaN);
      if (player != undefined) bf.Characters.build(player);
      bf.Interaction.setType("move");
    }
  }

  /**
   * Events.Battlefield.Map.as:10-50 (`AKS.Game.onEverybodyIsReady`): placement phase. The player's cell is forced to
   * 500 (hard-coded) before the sprite follows the mouse; allowed start cells come from `DATACENTER.Game.allowedCells`
   * (set by Events.AKS.Game.as:290-313, owner C).
   */
  private onEverybodyIsReady(): void {
    const bf = G.BATTLEFIELD, dc = deps.DATACENTER;
    const player = characterAt(dc.Player.ID ?? NaN);
    if (player) player.cell = 500;
    if (player != undefined) bf.Characters.build(player).sprite.startDrag(true);
    const allowed = (dc.Game as Game & { allowedCells?: number[][] }).allowedCells;
    for (const team of [0, 1] as const) {
      for (const cell of allowed?.[team] ?? []) {
        bf.Selection.select(cell, true, 0, TEAMS_COLOR[team], "");
        if (player?.team == team) bf.Interaction.addCellNum(cell, 1);
      }
    }
    bf.Interaction.setLayerVisible(false, 0);
    bf.Interaction.setLayerVisible(true, 1);
    deps.INTERFACE?.Text?.clearText();
    (dc.Player.clip as BattleFieldCharacter | undefined)?.setInteraction(false);
    bf.Interaction.setType("place");
    bf.Interaction.setEnabled(1);
    deps.INTERFACE?.Text?.setTextTimer(getText("PLACE_CHARACTER", []), 4000, false, true);
    bf.Container.show("Grid");
  }
}
registerClass("Dofus::BattleField::Map", BattleFieldMap);
