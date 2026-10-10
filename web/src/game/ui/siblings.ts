// Members of sibling singletons the UI shell calls (owners: C = KERNEL/AKS/SOMA, A = BATTLEFIELD, core = DATACENTER).
// Typed structurally here, never implemented: `Globals` gets their real types from the owners, and this cast keeps the
// UI compiling (and headless tests running without them) whatever lands first. Calls use `?.` = AS1 silent no-op.
import type { DataCenter } from "../../core/datacenter/index.ts";
import { G } from "../globals.ts";

export type Siblings = {
  KERNEL?: {
    KeyListener?: { setEnabled(b: boolean): void }; // Interface.WindowBox.as:24, boxWhisper.as:11
    quit?(): void; // S907/PB_20 rel
    giveUpGame?(): void; // S907/PB_8 rel
    disconnect?(): void; // S907/PB_2 rel
  };
  AKS?: {
    connect?(server: string, port: number): void; // Dofus.Interface.as:76
    Account?: { getCharacters?(): void; addFriend?(name: unknown): void }; // Dofus.Interface.as:91, S895/PB_9 rel
    Chat?: { send?(text: string, to: unknown): void }; // boxWhisper.as:19, S895/PB_15 rel
  };
  DATACENTER?: DataCenter; // Player.login/password (Dofus.Interface.as:74-75), Game.isRunning (boxMenu.as:13)
  SOMA?: {
    getVolumeMusic?(): number; setVolumeMusic?(v: number): void; getVolumeSound?(): number; setVolumeSound?(v: number): void;
    getMuteMusic?(): boolean; setMuteMusic?(b: boolean): void; getMuteSound?(): boolean; setMuteSound?(b: boolean): void;
  }; // S906 clip actions
  BATTLEFIELD?: { Container?: { _xscale: number } }; // Dofus.Interface.as:100-101
};

export const S = G as unknown as Siblings;
