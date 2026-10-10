// AKSClient/Dofus.SpellsManager.as (Class_SpellsManager, linkage "Dofus::SpellsManager"): per-turn, per-target
// and delay limits of the local player's spell launches. The message of a refusal goes to
// BATTLEFIELD.Interaction.errorMessage (:85,102,117,121). `initSpellLaunchData` (:129-149) is dead code (undefined
// constants, no caller) and is not ported.
import type { Player } from "../../core/datacenter/player.ts";
import type { SpellLaunch } from "../../core/datacenter/spellLaunch.ts";
import { getText } from "../../core/lang.ts";
import { toNumber } from "../../core/swf6.ts";
import { G } from "../globals.ts";

/** `BATTLEFIELD.Interaction.errorMessage = msg` (a member set on an undefined BATTLEFIELD is a no-op in AS1). */
function setErrorMessage(msg: string | undefined): void {
  if (G.BATTLEFIELD) G.BATTLEFIELD.Interaction.errorMessage = msg;
}

export class SpellsManager {
  SpellsCountByTurn: SpellLaunch[] = [];
  SpellsCountByTurn_Counter: Record<string, number> = {};
  SpellsCountByPlayer: SpellLaunch[] = [];
  SpellsCountByPlayer_Counter: Record<string, number> = {};
  SpellsDelay: SpellLaunch[] = [];

  constructor(readonly playerData: Player) {
    this.init();
  }

  /** :7-15 */
  init(): void {
    this.SpellsCountByTurn = [];
    this.SpellsCountByTurn_Counter = {};
    this.SpellsCountByPlayer = [];
    this.SpellsCountByPlayer_Counter = {};
    this.SpellsDelay = [];
  }

  /** :16-41 — `counter[id]++` on a fresh key gives 1 (SWF 6: undefined → 0). */
  addLaunchedSpell(l: SpellLaunch): void {
    const s = l.m_spellData;
    const id = String(l.m_SpellID);
    if (s?.m_LaunchCountByTurn != 0) {
      this.SpellsCountByTurn.push(l);
      this.SpellsCountByTurn_Counter[id] = toNumber(this.SpellsCountByTurn_Counter[id]) + 1;
    }
    if (s?.m_LaunchCountByPlayerTurn != 0 && l.m_characOnID != undefined) {
      this.SpellsCountByPlayer.push(l);
      this.SpellsCountByPlayer_Counter[id] = toNumber(this.SpellsCountByPlayer_Counter[id]) + 1;
    }
    if (s?.m_DelayBetweenLaunch != 0) this.SpellsDelay.push(l);
  }

  /**
   * :42-64. AS BUG kept: the loop bound is fixed first and `splice(i, i + 1)` removes i + 1 records, so an
   * expiring record can take still-running neighbours with it.
   */
  nextTurn(): void {
    this.SpellsCountByTurn = [];
    this.SpellsCountByTurn_Counter = {};
    this.SpellsCountByPlayer = [];
    this.SpellsCountByPlayer_Counter = {};
    const len = this.SpellsDelay.length;
    for (let i = 0; i < len; i++) {
      const l = this.SpellsDelay[i];
      if (!l) continue; // AS: members of undefined are undefined, `undefined - 1 <= 0` → splice(i, i+1) of nothing
      l.m_RemainingTurn = toNumber(l.m_RemainingTurn) - 1;
      if (l.m_RemainingTurn <= 0) this.SpellsDelay.splice(i, i + 1);
    }
  }

  /** :65-128 */
  checkCanLaunchSpell(spellID: unknown, characID: unknown): boolean {
    for (const l of this.SpellsCountByTurn) {
      if (l.m_SpellID == spellID) {
        const max = l.m_spellData?.m_LaunchCountByTurn;
        if (toNumber(this.SpellsCountByTurn_Counter[String(spellID)]) >= toNumber(max)) {
          setErrorMessage(getText("CANT_LAUNCH_MORE", [max]));
          return false;
        }
      }
    }
    for (const l of this.SpellsCountByPlayer) {
      if (l.m_SpellID == spellID) {
        const max = l.m_spellData?.m_LaunchCountByPlayerTurn;
        if (l.m_characOnID == characID && toNumber(this.SpellsCountByPlayer_Counter[String(spellID)]) >= toNumber(max)) {
          setErrorMessage(getText("CANT_ON_THIS_PLAYER"));
          return false;
        }
      }
    }
    for (const l of this.SpellsDelay) {
      if (l.m_SpellID == spellID) {
        setErrorMessage(toNumber(l.m_RemainingTurn) >= 63 ? getText("CANT_RELAUNCH") : getText("CANT_LAUNCH_BEFORE", [l.m_RemainingTurn]));
        return false;
      }
    }
    return true;
  }
}
