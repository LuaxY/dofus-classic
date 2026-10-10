// Pure subset of Dofus.BattleField.Map.as (the rest attaches MovieClips and stays with the renderer):
// cell pixel layout from build()/updateCell(), getCellHeight(), calculateTacleZone(), and the cell size from init().
// PathFinding depends on all three: neighbour validity uses the pixel `x`, tackle zones and line of sight use
// the others. Rows alternate `width` and `width - 1` cells, odd rows shifted right by half a cell.
import { toNumber } from "./swf6.ts";
import type { MapData } from "./compressor.ts";

export const CELL_WIDTH = 53; // BattleField.Map.as:15 cell_width
export const CELL_HEIGHT = 27; // BattleField.Map.as:16 cell_height

/** Row/column walker shared by build() (lines 133-147) and updateCell() (lines 164-186). */
function walker(mapWidth: number) {
  let x = 0, y = 0, dec = 0, width = mapWidth - 1;
  return {
    pos: (groundLevel: number | undefined) => ({ x: x * CELL_WIDTH + dec, y: (y * CELL_HEIGHT) / 2 - 20 * (toNumber(groundLevel) - 7) }),
    next() {
      if (x == width) {
        x = 0;
        y += 1;
        if (dec == 0) {
          dec = CELL_WIDTH / 2;
          width -= 1;
        } else {
          dec = 0;
          width += 1;
        }
      } else x += 1;
    },
  };
}

/** BattleField.Map.build (lines 34-155), positions only: sets `x`/`y` on active cells, leaves others untouched. */
export function layoutMap(map: MapData): void {
  const w = walker(map.width);
  for (const cell of map.data) {
    if (cell.active) Object.assign(cell, w.pos(cell.groundLevel));
    w.next();
  }
}

/** BattleField.Map.updateCell (lines 156-291), positions only. An inactive cell keeps its previous x/y (as in the AS). */
export function layoutCell(map: MapData, cellNum: number): void {
  const w = walker(map.width);
  for (let i = cellNum; i > 0; i--) w.next();
  const cell = map.data[cellNum];
  if (cell?.active) Object.assign(cell, w.pos(cell.groundLevel));
}

/**
 * BattleField.Map.getCellHeight (lines 302-308): groundLevel - 7, +0.5 on a slope. The AS adds an undefined
 * variable `ph`, which is 0 in SWF 6 numeric context.
 */
export function getCellHeight(map: MapData, cellNum: number): number {
  const c = map.data[Number(cellNum)];
  const slope = !(c?.groundSlope == undefined || c.groundSlope == 1) ? 0.5 : 0;
  const level = c?.groundLevel != undefined ? c.groundLevel - 7 : 0;
  return level + slope;
}

export interface TacleCharacter {
  team: number | null;
  cell: number | string | null;
}

/**
 * BattleField.Map.calculateTacleZone (lines 309-339). For every character (the AS iterates
 * DATACENTER.Characters.keys, which still lists "removed" characters — see datacenter/dataProvider.ts), marks
 * the 4 neighbours whose pixel x differs by exactly half a cell in `TacleZoneTeam<team>`. Missing x reads as 0
 * (SWF 6). A team other than 0/1 (e.g. null outside fights) writes nowhere.
 */
export function calculateTacleZone(map: MapData, characters: Iterable<TacleCharacter>): void {
  map.TacleZoneTeam0 = {};
  map.TacleZoneTeam1 = {};
  const w = map.width;
  const around = [w, w - 1, -(w - 1), -w];
  const d2 = CELL_WIDTH / 2;
  for (const c of characters) {
    const cell = Number(c.cell);
    const xInit = toNumber(map.data[cell]?.x);
    const zone = c.team === 0 ? map.TacleZoneTeam0 : c.team === 1 ? map.TacleZoneTeam1 : undefined;
    for (const off of around) {
      if (Math.abs(toNumber(map.data[cell + off]?.x) - xInit) == d2 && zone) zone[cell + off] = true;
    }
  }
}
