// Sibling singletons and records the battlefield reads, typed only by the members the AS calls from the battlefield
// files. These are not stubs: their owners implement them (C: KERNEL, AKS, DATACENTER wiring, Dofus.Sequencer,
// ank.Timer, ank::SWFLoader, `log`; B1: INTERFACE). Sibling globals are optional and every call uses `?.`: in Flash a
// call on an undefined global is a silent no-op (docs/runtime.md §3.10), and it keeps this tree independent of the
// owners' progress. Replace `deps.X` with `G.X` once the owners declare their Globals.
import type { Character, DataCenter } from "../../core/datacenter/index.ts";
import type { PathFinding } from "../../core/pathfinding.ts";
import { G } from "../globals.ts";

/** Dofus.Sequencer.as (owner C): the members used by Characters.Character and BattleField.Spells. */
export interface Sequencer {
  unicID: string;
  referer?: unknown;
  onSequenceEnd?: (() => void) | null;
  addAction(waitEnd: boolean, object: object, fn: (...args: never[]) => unknown, parameters: unknown[]): void;
  play(): void;
  clear(): void;
  clearAllNextActions(): void;
  isPlaying(): boolean;
  onActionEnd(actionID: unknown): void;
}

/** DATACENTER.Characters entry as the battlefield sees it: core Character + what C adds (sequencers, actions manager) + `anim` (setAnim). */
export type CharacterData = Character & {
  SEQUENCER_anim: Sequencer;
  SEQUENCER_actions: Sequencer;
  GameActionsManager?: { transmittingMove(type: number, params: unknown[]): void; transmittingOther(type: number, params: unknown[]): void };
  anim?: string;
};

/** DATACENTER.Player.SpellsManager (Dofus.SpellsManager.as, owner C). */
export type PlayerSpellsManager = { checkCanLaunchSpell(spellID: unknown, characOnID: unknown): boolean };

/** Spell record handed to Character.cast / BattleField.Spells (Events.AKS.Game.as game action 300). */
export interface SpellData {
  readonly file: string;
  m_Level: unknown;
  m_bInFrontOfPlayer?: boolean | null;
}

interface Deps {
  DATACENTER: DataCenter;
  KERNEL?: { PathFinding: PathFinding; traceToChat(txt: unknown, color: string): void };
  INTERFACE?: {
    drawToolTip(text: string, x: number, y: number, a: boolean, b: boolean, c: number): void;
    hideToolTip(): void;
    getCursor(): { setForbidden(b: boolean): void } | undefined;
    drawAnimSelection(x: number, y: number): void;
    UIInterfaceBanner?: { removePlayerTimeline(num: unknown): void };
    /** Never assigned by Interfaces (README §0 defects): the self "hit" head anim is never shown. */
    InterfaceBanner?: { setPlayerHeadAnim(anim: string): void };
    Text?: {
      setText(text: unknown, a?: boolean, b?: boolean): void;
      setTextTimer(text: unknown, ms: number, a?: boolean, b?: boolean): void;
      clearText(): void;
    };
  };
  AKS?: { Game: { onEverybodyIsReady?: () => void; ready(): void; setPlayerPosition(cell: number): void } };
  ank?: { Timer: { setTimer(obj: object, fn: () => void, delay: number): void } };
  DOFUS?: { t?: number; t1?: number };
  log?: (txt: string, red?: boolean) => void;
}

export const deps = G as unknown as Deps;

/** DATACENTER.Characters.getItemAt(k) with the battlefield's view of the record. */
export const characterAt = (k: number | string): CharacterData | undefined =>
  deps.DATACENTER.Characters.getItemAt(k) as CharacterData | undefined;
