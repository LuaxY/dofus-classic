// AKSClient/Dofus.BattleField.Effects.as — `Dofus::BattleField::Effects` (BATTLEFIELD.Effects, depth 800). No caller in
// the decompiled code. The AS class has `prototype = new Object()` (an attached clip whose prototype is not
// MovieClip's); the runtime's registerClass needs a MovieClip constructor, so it extends MovieClip (unused API).
import { MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldContainer } from "./container.ts";

export class BattleFieldEffects extends MovieClip {
  declare container: BattleFieldContainer;

  constructor() {
    super();
    this.init();
  }

  /** Effects.as:7-10 */
  init(): void {
    this.container = G.BATTLEFIELD.Container;
  }

  /** Effects.as:11-14 — AS bug kept: targets `container.Effects`, which does not exist (the clip is `Effect`): no-op. */
  setVisible(bool: boolean): void {
    const e = this.container.Effects as MovieClip | undefined;
    if (e) e._visible = bool;
  }

  /** Effects.as:15-18 */
  load(file: string): void {
    this.container.Effect.loadMovie(file);
  }

  /** Effects.as:19-22 */
  unload(): void {
    this.container.Effect.loadMovie("");
  }
}
registerClass("Dofus::BattleField::Effects", BattleFieldEffects);
