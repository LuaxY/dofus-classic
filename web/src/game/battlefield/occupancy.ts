// Data half of cell occupancy, moved out of the character display code (Characters.Character.setNewCell / clear,
// AKSClient/Dofus.BattleField.Characters.Character.as:35-42,297-307) and BattleField.Map.calculateTacleZone
// (AKSClient/Dofus.BattleField.Map.as:309-339). No MovieClip here: `map` is DATACENTER.Map (= BATTLEFIELD.Map.data
// after build), `characters` is DATACENTER.Characters.
import type { MapData } from "../../core/compressor.ts";
import { calculateTacleZone } from "../../core/map.ts";
import { toNumber } from "../../core/swf6.ts";

export interface Occupant {
  num: number | null;
  cell: number | null;
}

interface Characters {
  keys: Record<string, null>;
  getItemAt(k: string): { team: number | null; cell: number | string | null } | undefined;
}

/** `map.data[cell]` with AS member-access semantics: `data[null]`/`data[undefined]` is no cell, not cell 0. */
const cellAt = (map: MapData | undefined, cell: unknown) =>
  typeof cell === "number" || typeof cell === "string" ? map?.data[Number(cell)] : undefined;

/** Character.as:38 / :300 — `delete map.data.data[data.cell].playerOnID`. */
export function leaveCell(map: MapData | undefined, data: Occupant): void {
  const c = cellAt(map, data.cell);
  if (c) delete c.playerOnID;
}

/**
 * BattleField.Map.calculateTacleZone over `DATACENTER.Characters.keys` (which keeps "removed" characters,
 * core/datacenter/dataProvider.ts). Entries without an object mark nothing (AS: undefined.cell → NaN → no x match).
 */
export function calculateTacleZones(map: MapData, characters: Characters): void {
  const list = Object.keys(characters.keys).flatMap((k) => characters.getItemAt(k) ?? []);
  calculateTacleZone(map, list);
}

/**
 * Character.as:297-307. AS quirks kept: the old cell is freed even if someone else stands there now; the die
 * sequence calls `setNewCell(undefined, true)`: no cell gets the id, `data.cell` becomes Number(undefined) = 0
 * (SWF 6) and the tackle zone is then projected around cell 0 (docs/logic/pathfinding.md §4.1).
 */
export function setNewCell(map: MapData | undefined, characters: Characters, data: Occupant, cell: unknown, bCalculateTacle: boolean): void {
  leaveCell(map, data);
  const c = cellAt(map, cell);
  if (c) c.playerOnID = data.num ?? undefined; // a null id reads as "free" everywhere (`!= undefined`)
  data.cell = toNumber(cell);
  if (bCalculateTacle && map) calculateTacleZones(map, characters);
}
