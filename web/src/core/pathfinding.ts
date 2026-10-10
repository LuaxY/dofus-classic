// Port of Dofus.PathFinding.as (Class_PathFinding). The AS reads the globals DATACENTER and BATTLEFIELD; here
// they are the injected `dc` (a DataCenter from datacenter/index.ts fits) and an optional `selection`
// (BATTLEFIELD.Selection, renderer). BATTLEFIELD.Map.getData(n) is `dc.Map.data[n]` (BattleField.Map.build stores
// DATACENTER.Map as its `data`), and getCellHeight comes from map.ts.
//
// Coordinates: cell = x * width + y * (width - 1). Directions: 0 = x+1 (+width), 1 = y+1 (+width-1),
// 2 = x-1 (-width), 3 = y-1 (-(width-1)).
import { CELL_PATH_OVER_COLOR, CELL_PATH_SELECT_COLOR, PLAYER_HEIGHT } from "./constants.ts";
import type { MapCell, MapData, PathStep } from "./compressor.ts";
import { getText } from "./lang.ts";
import { CELL_HEIGHT, CELL_WIDTH, getCellHeight } from "./map.ts";
import { toNumber } from "./swf6.ts";

export interface Point {
  x: number;
  y: number;
}

/** PathFinding.as:89-99 (reads DATACENTER.Map.width; passed in here). */
export function getCaseCoordonnee(num: number, width: number): Point {
  const row = Math.floor(num / (width * 2 - 1));
  const column = (num - row * (width * 2 - 1)) % width;
  const y = row - column;
  return { y, x: (num - (width - 1) * y) / width };
}

/** PathFinding.as:100-104 (also BattleField.Map.as:292-296). */
export const getCaseNum = (x: number, y: number, width: number): number => x * width + y * (width - 1);

/** PathFinding.as:79-88 — Manhattan distance in cell coordinates. */
export function goalDistEstimate(begin: number, end: number, width: number): number {
  const p1 = getCaseCoordonnee(begin, width);
  const p2 = getCaseCoordonnee(end, width);
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

/** PathFinding.as:256-283 — direction of the move cell2 → cell1, never -1 (non-aligned resolves on x). */
export function getDirection(cell1: number, cell2: number, width: number): number {
  const p1 = getCaseCoordonnee(cell1, width);
  const p2 = getCaseCoordonnee(cell2, width);
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  if (dx == 0) return dy > 0 ? 1 : 3;
  return dx > 0 ? 0 : 2;
}

/** PathFinding.as:284-314 — like getDirection but -1 when not aligned; same cell → 3. */
export function getAbsoluteDirection(cell1: number, cell2: number, width: number): number {
  const p1 = getCaseCoordonnee(cell1, width);
  const p2 = getCaseCoordonnee(cell2, width);
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  if (dx == 0) return dy > 0 ? 1 : 3;
  if (dy == 0) return dx > 0 ? 0 : 2;
  return -1;
}

/** PathFinding.as:315-328 */
export function checkAlign(cell1: number, cell2: number, width: number): boolean {
  const p1 = getCaseCoordonnee(cell1, width);
  const p2 = getCaseCoordonnee(cell2, width);
  return p1.x == p2.x || p1.y == p2.y;
}

/** PathFinding.as:105-111 (cell_width/cell_height from BattleField.Map.init). */
export const convertCoordToxy = (coordX: number, coordY: number): Point => ({
  x: -(-coordX + coordY) * (CELL_WIDTH / 2),
  y: (coordX + coordY) * (CELL_HEIGHT / 2),
});

/** The parts of DATACENTER that PathFinding reads or writes. */
export interface PathFindingDataCenter {
  Map: MapData;
  Player: {
    tmpPath: PathStep[] | null;
    tmpFullPath: PathStep[] | null;
    lastClickedCell: number | null;
    currentSpell: { m_bOnItSelf: boolean | null } | null;
    readonly data:
      | { team: number | null; AP: number | undefined; cell: number | null; EffectsManager: { getModeratorValue(type: number): number | undefined } }
      | undefined;
  };
  Game: { readonly isFight: boolean };
  Characters: { getItemAt(index: number): { guild: number | string | null | undefined } | undefined };
}

/** BATTLEFIELD.Selection (renderer). */
export interface PathSelection {
  unSelectAll(): void;
  select(cell: number, bool: boolean, size: number, color: number): void;
}

interface Node {
  num: number;
  g: number;
  v: number;
  h: number;
  f: number;
  parent: Node | null;
}

/**
 * Open-list scan of pathFind (PathFinding.as:144-153): `for (var a in open) if (open[a].f < min)` with min = 5000,
 * so the FIRST enumerated node with the lowest f wins. Enumeration order is runtime behaviour, not in the code
 * (UNKNOWN — runtime). Assumed here: AVM1 enumerates most recently added first; a deleted then re-added key counts
 * as newly added. Source: Ruffle's AVM1 PropertyMap ("Flash's iteration order (most recently added first)",
 * IndexMap + shift_remove), the only primary reference available. JS Map keeps insertion order, so scan it backwards.
 */
function selectBest(open: Map<number, Node>): Node | undefined {
  let best: Node | undefined;
  let min = 5000;
  const nodes = [...open.values()];
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i]!.f < min) {
      min = nodes[i]!.f;
      best = nodes[i];
    }
  }
  return best;
}

export class PathFinding {
  readonly STATE_MOVE_SINGLE = 0;
  readonly STATE_SELECT = 1;
  readonly STATE_MOVE = 2;
  State: number | undefined;

  constructor(
    private readonly dc: PathFindingDataCenter,
    private readonly selection?: PathSelection,
  ) {}

  private get width(): number {
    return this.dc.Map.width;
  }

  private getData(cell: number): MapCell | undefined {
    return this.dc.Map.data[Number(cell)];
  }

  /** PathFinding.as:9-21 */
  setInitState(bFight: boolean): void {
    if (bFight) {
      this.State = this.STATE_SELECT;
      this.dc.Player.lastClickedCell = null;
    } else this.State = this.STATE_MOVE_SINGLE;
  }

  /**
   * PathFinding.as:22-66 — click/hover state machine. `character` is the player's clip (getCellNum, say).
   * Note: STATE_MOVE is never entered by any code in AKSClient.
   */
  calculatePath(character: { getCellNum(): number; say(text: string | undefined, align: string): void }, cell: number, bRelease: boolean): boolean {
    const data = this.getData(cell);
    if (data?.playerOnID != undefined) return false;
    if (data?.movement == 0) return false;
    switch (this.State) {
      case this.STATE_MOVE_SINGLE:
        this.pathFind(character.getCellNum(), cell, false);
        if (this.dc.Player.tmpPath != null) return true;
        character.say(getText("I_CANT_GO"), "center");
        return false;
      case this.STATE_SELECT:
        this.pathFind(character.getCellNum(), cell, true);
        if (bRelease) {
          this.dc.Player.lastClickedCell = cell;
          this.drawPathSelection(CELL_PATH_SELECT_COLOR);
          return true;
        }
        this.drawPathSelection(CELL_PATH_OVER_COLOR);
        break;
      case this.STATE_MOVE:
        this.State = this.STATE_SELECT;
        if (this.dc.Player.lastClickedCell == cell) return true;
        this.selection?.unSelectAll();
    }
    return false;
  }

  /** PathFinding.as:67-78 (renderer side effect). */
  drawPathSelection(col: number): void {
    const path = this.dc.Player.tmpFullPath ?? [];
    this.selection?.unSelectAll();
    for (const step of path) this.selection?.select(step.num, true, 8, col);
  }

  /**
   * PathFinding.as:112-255 — A*-like search; result in DATACENTER.Player.tmpPath (direction-change cells only,
   * what compressPath sends) and tmpFullPath (every cell, only when bFull). Step cost 1 + (5 - movement) / 5,
   * h = Manhattan, f = v + h; max length 500 outside fights, the player's AP in fights.
   * When bFull is false tmpFullPath becomes [] on success and is left untouched on failure (as in the AS).
   *
   * AS quirks kept:
   * - `bOnthelast` is reset per expanded node, not per neighbour: once the end cell (movement 1 or in an enemy
   *   tackle zone) is seen, later neighbours of the same node also bypass the movement > 1 and tackle-zone tests.
   * - Occupied cells always block: the role-play exemption reads `BATTLEFIELD.Map.bRolePlay`, which nothing sets
   *   (bRolePlay lives on DATACENTER.Map).
   * - Neighbour validity is |x_pixel(next) - x_pixel(current)| < 27; an out-of-map or never-laid-out cell has
   *   x = 0 (SWF 6), then fails the `active` test.
   * Deviation: if every open node has f ≥ 5000 the AS dereferences an undefined node and keeps running on
   * garbage; here that ends the search as "no path" (unreachable for real map sizes).
   */
  pathFind(cellBegin: number, cellEnd: number, bFull: boolean): void {
    const { Map: map, Player: player } = this.dc;
    const pdata = player.data;
    const adverseTeam = pdata?.team != 0 ? 0 : 1;
    const maxLength = !this.dc.Game.isFight ? 500 : toNumber(pdata?.AP);
    const tacle = adverseTeam == 0 ? map.TacleZoneTeam0 : map.TacleZoneTeam1;
    const open = new Map<number, Node>();
    const closed = new Map<number, Node>();
    const h0 = goalDistEstimate(cellBegin, cellEnd, this.width);
    open.set(cellBegin, { num: cellBegin, g: 0, v: 0, h: h0, f: h0, parent: null });
    const width = map.width;
    const depl = [width, width - 1, -(width - 1), -width];
    while (true) {
      const cur = open.size == 0 ? undefined : selectBest(open);
      if (cur === undefined) {
        if (bFull) player.tmpFullPath = null;
        player.tmpPath = null;
        return;
      }
      open.delete(cur.num);
      if (cur.num == cellEnd) {
        player.tmpPath = [];
        player.tmpFullPath = [];
        let dir: number | undefined;
        let change = false;
        let n: Node = cur;
        while (n.num != cellBegin) {
          const tmpDir = getDirection(n.num, n.parent!.num, this.width);
          if (tmpDir != dir) {
            change = true;
            dir = tmpDir;
          }
          if (bFull) {
            player.tmpFullPath!.splice(0, 0, { num: n.num, dir: tmpDir });
            if (player.tmpFullPath!.length > maxLength) {
              player.tmpPath = null;
              player.tmpFullPath = null;
              break;
            }
          }
          if (change) {
            player.tmpPath!.splice(0, 0, { num: n.num, dir: tmpDir });
            change = false;
          }
          n = n.parent!;
        }
        return;
      }
      let bOnthelast = false;
      for (const step of depl) {
        const nextCell = cur.num + step;
        if (Math.abs(toNumber(map.data[nextCell]?.x) - toNumber(map.data[cur.num]?.x)) < 27) {
          const cell = map.data[nextCell];
          const tz = tacle?.[nextCell];
          if (nextCell == cellEnd && (cell?.movement == 1 || tz)) bOnthelast = true;
          const bNotPlayerOn = cell?.playerOnID == undefined;
          const bNotInTacleZone = this.dc.Game.isFight ? !(tz && !bOnthelast) : true;
          if (cell?.active && (toNumber(cell.movement) > 1 || bOnthelast) && bNotPlayerOn && bNotInTacleZone) {
            const newv = cur.v + 1 + (5 - toNumber(cell.movement)) / 5;
            const newg = cur.g + 1;
            const oldv = open.get(nextCell)?.v ?? closed.get(nextCell)?.v ?? null;
            if ((oldv == null || oldv > newv) && newg <= maxLength) {
              closed.delete(nextCell);
              let node = open.get(nextCell);
              if (!node) {
                node = { num: nextCell, g: 0, v: 0, h: 0, f: 0, parent: null };
                open.set(nextCell, node);
              }
              node.g = newg;
              node.v = newv;
              node.h = goalDistEstimate(nextCell, cellEnd, this.width);
              node.f = node.v + node.h;
              node.parent = cur;
            }
          }
        }
      }
      closed.set(cur.num, { ...cur });
    }
  }

  /** PathFinding.as:329-368. The range moderator is effect 19 (EffectsManager.RANGE). */
  checkRange(cell1: number, cell2: number, bLineOnly: boolean, range: number | string, bModerate = true): boolean {
    const player = this.dc.Player;
    if (player.data?.cell == cell2 && !player.currentSpell?.m_bOnItSelf) return false;
    let r: number;
    if (bModerate) {
      r = Number(range) + toNumber(player.data?.EffectsManager.getModeratorValue(19));
      if (r < 1) r = 1;
    } else r = Number(range);
    if (bLineOnly && !checkAlign(cell1, cell2, this.width)) return false;
    return !(goalDistEstimate(cell1, cell2, this.width) > r);
  }

  /** PathFinding.as:369-444 — line of sight, walking the cells crossed by the segment p1 → p2 column by column. */
  checkView(cell1: number, cell2: number): boolean {
    const p1 = { ...getCaseCoordonnee(cell1, this.width), z: 0 };
    const p2 = { ...getCaseCoordonnee(cell2, this.width), z: 0 };
    const playerHeight = (cd: MapCell | undefined): number =>
      !cd?.playerOnID ? 0 : toNumber(PLAYER_HEIGHT[Number(this.dc.Characters.getItemAt(cd.playerOnID)?.guild)]);
    p1.z = getCellHeight(this.dc.Map, cell1) + playerHeight(this.getData(cell1));
    p2.z = getCellHeight(this.dc.Map, cell2) + playerHeight(this.getData(cell2));
    const zDiff = p2.z - p1.z;
    const d = Math.max(Math.abs(p1.y - p2.y), Math.abs(p1.x - p2.x));
    const a = (p1.y - p2.y) / (p1.x - p2.x); // Math.getSlope (Math.getSlope.as)
    const b = p1.y - a * p1.x;
    const dx = p2.x - p1.x >= 0 ? 1 : -1;
    const dy = p2.y - p1.y >= 0 ? 1 : -1;
    let lastY = p1.y;
    const x2dx = p2.x * dx;
    let x = p1.x + 0.5 * dx;
    let yy: number;
    while (x * dx <= x2dx) {
      const y = a * x + b;
      let destY: number, scanY: number;
      if (dy > 0) {
        destY = Math.round(y);
        scanY = Math.ceil(y - 0.5);
      } else {
        destY = Math.ceil(y - 0.5);
        scanY = Math.round(y);
      }
      for (yy = lastY; yy * dy <= scanY * dy; yy += dy) {
        if (!this.checkCellView(x - dx / 2, yy, false, p1, p2, zDiff, d)) return false;
      }
      lastY = destY;
      x += dx;
    }
    for (yy = lastY; yy * dy <= p2.y * dy; yy += dy) {
      if (!this.checkCellView(x - 0.5 * dx, yy, false, p1, p2, zDiff, d)) return false;
    }
    return this.checkCellView(x - 0.5 * dx, yy - dy, true, p1, p2, zDiff, d);
  }

  /**
   * PathFinding.as:445-462. With `bool` (the final, target cell) it always passes. A character blocks unless it
   * stands on the start (distance 0) or target cell.
   */
  checkCellView(x: number, y: number, bool: boolean, p1: Point & { z: number }, p2: Point, zDiff: number, d: number): boolean {
    const num = getCaseNum(x, y, this.width);
    const cd = this.getData(num);
    const dist = Math.max(Math.abs(p1.y - y), Math.abs(p1.x - x));
    const eh = (dist / d) * zDiff + p1.z;
    const h = getCellHeight(this.dc.Map, num);
    const bPlayerOn = !(cd?.playerOnID == undefined || dist == 0 || bool || (p2.x == x && p2.y == y));
    if (cd?.lineOfSight && h <= eh && !bPlayerOn) return true;
    return bool;
  }
}
