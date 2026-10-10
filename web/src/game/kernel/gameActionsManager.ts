// AKSClient/Dofus.GameActionsManager.as (Class_GameActionsManager, linkage "Dofus::GameActionsManager"): client
// side of the GA request / GKK ack / GKE cancel protocol for one character (`_DATA`).
import type { Character } from "../../core/datacenter/character.ts";
import { G } from "../globals.ts";

/** The renderer clip members this class calls (BattleField.Characters.Character, owner A). */
type MoverClip = { getCellNum?(): number; stopMove?(): void };

export class GameActionsManager {
  readonly STATE_TRANSMITTING = 2;
  readonly STATE_IN_PROGRESS = 1;
  readonly STATE_READY = 0;
  m_id: string | undefined;
  m_bNextAction = false;
  m_state = 0;
  currentType: number | string | null = null;

  constructor(readonly _DATA: Character) {
    this.init();
  }

  /** :11-18 */
  init(): void {
    this.m_id = undefined;
    this.m_bNextAction = false;
    this.m_state = this.STATE_READY;
    this.currentType = null;
  }

  private get clip(): MoverClip | null | undefined {
    return this._DATA.clip as MoverClip | null | undefined;
  }

  /** :19-38 — a new move cancels a move the server already answered (GKE) and is sent again. */
  transmittingMove(type: number, params: readonly unknown[]): void {
    if (!this.isWaiting()) {
      G.AKS.Game.sendActions(type, params);
      this.m_state = this.STATE_TRANSMITTING;
      this.currentType = type;
    } else if (this.canCancel(type)) {
      this.cancel(this.clip?.getCellNum?.());
      this.transmittingMove(type, params);
    } else console.warn("L'état de l'action ne permet pas de faire ceci");
  }

  /** :39-52 */
  transmittingOther(type: number, params: readonly unknown[]): void {
    if (!this.isWaiting()) {
      G.AKS.Game.sendActions(type, params);
      this.m_state = this.STATE_TRANSMITTING;
      this.currentType = type;
    } else console.warn("L'état de l'action ne permet pas de faire ceci");
  }

  /** :53-58 */
  onServerResponse(id: string | undefined): void {
    this.m_id = id;
    this.m_state = this.STATE_IN_PROGRESS;
  }

  /**
   * :59-69. AS quirk kept: currentType is nulled first and `canCancel()` gets no type, so its
   * `type != currentType` test is `undefined != null` = false (AS1) and only the state decides.
   */
  cancel(params: unknown): void {
    this.currentType = null;
    if (this.canCancel(null)) {
      G.AKS.Game.ActionCancel(this.m_id, params);
      this.clip?.stopMove?.();
      this.init();
    }
  }

  /** :70-82 */
  end(IAmSender?: boolean): void {
    if (this.m_bNextAction == false || !IAmSender) this.init();
    else {
      this.m_state = this.STATE_TRANSMITTING;
      this.m_id = undefined;
    }
  }

  /** :83-87 */
  ack(idAction: string): void {
    G.AKS.Game.ActionAck(idAction);
    this.end(true);
  }

  /** :88-101 */
  isWaiting(): boolean {
    return this.m_state == this.STATE_TRANSMITTING || this.m_state == this.STATE_IN_PROGRESS;
  }

  /** :102-119 */
  canCancel(type: number | string | null): boolean {
    if (type != this.currentType) return false;
    return this.m_state == this.STATE_READY || this.m_state == this.STATE_IN_PROGRESS;
  }
}
