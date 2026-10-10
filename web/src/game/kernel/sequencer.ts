// AKSClient/Dofus.Sequencer.as (Class_Sequencer, linkage "Dofus::Sequencer"). Queue of actions; a waiting
// action ends on `onActionEnd` (the id is ignored, :73-96) or after SEQUENCER_TIMEOUT (:41).
import { SEQUENCER_TIMEOUT } from "../../core/constants.ts";
import { clearInterval, getTimer, setInterval } from "../../runtime/player.ts";

/** AS1 `fn.apply(object, parameters)`: any callable (parameters are checked by the caller, as in the AS). */
export type Fn = (...args: never[]) => unknown;
export interface SequencerAction {
  id: number;
  waitEnd: boolean;
  object: unknown;
  fn: Fn | undefined;
  parameters: readonly unknown[] | undefined;
}

export class Sequencer {
  unicID = String(getTimer()) + Math.floor(Math.random() * 10000); // :4 random(10000)
  ActionIndex = 0;
  actions: SequencerAction[] = [];
  bPlaying = false;
  timeoutID: number | undefined;
  onSequenceEnd: (() => void) | null = null;
  referer: unknown;

  constructor() {
    this.clear();
  }

  /** :10-19 */
  addAction(waitEnd: boolean, object: unknown, fn: Fn | undefined, parameters?: readonly unknown[]): void {
    this.actions.push({ id: this.getActionIndex(), waitEnd, object, fn, parameters });
  }

  /** :20-48. AS1 `undefined.apply()` is a silent no-op, hence `fn?.`. */
  play(): void {
    this.bPlaying = true;
    const a = this.actions[0];
    if (!a) return this.stop();
    if (a.waitEnd && a.object) (a.object as Record<string, unknown>)[this.unicID] = a.id;
    a.fn?.apply(a.object, (a.parameters ?? []) as never[]);
    if (!a.waitEnd) this.onActionEnd(a.id);
    else {
      this.clearTimeOut();
      this.timeoutID = setInterval(this, "onActionTimeOut", SEQUENCER_TIMEOUT, a.id);
    }
  }

  isPlaying(): boolean {
    return this.bPlaying;
  }
  stop(): void {
    this.bPlaying = false;
  }
  /** :57-63 */
  clear(): void {
    this.clearTimeOut();
    this.actions = [];
    this.bPlaying = false;
  }
  /** :64-67 */
  clearAllNextActions(): void {
    this.actions.splice(1, this.actions.length - 1);
  }
  /** :68-72 */
  onActionTimeOut(actionID: unknown): void {
    console.warn("TIMEOUT !!!");
    this.onActionEnd(actionID);
  }

  /** :73-96 — the id is ignored: whatever action is at the head ends. */
  onActionEnd(_actionID?: unknown): void {
    this.clearTimeOut();
    if (this.actions.length == 0) return;
    this.actions.shift();
    if (this.actions.length == 0) {
      this.clear();
      this.onSequenceEnd?.();
    } else if (this.bPlaying) this.play();
  }

  clearTimeOut(): void {
    clearInterval(this.timeoutID);
  }

  /** :101-111 — wraps after 10000. */
  getActionIndex(): number {
    const i = this.ActionIndex;
    this.ActionIndex = this.ActionIndex + 1 > 10000 ? 0 : this.ActionIndex + 1;
    return i;
  }
}
