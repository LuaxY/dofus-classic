// Port of Dofus.EffectsManager.as (Class_EffectsManager): per-character temporary effects and the 20
// "moderator" totals (index = effect type) read by Character.initAP (type 1) and PathFinding.checkRange (19).
// `trace` calls dropped.
import { toNumber } from "../swf6.ts";

export interface EffectLike {
  type: unknown;
  value: unknown;
  remainingTurn: number | string;
}

export class EffectsManager {
  readonly LIFE_POINTS = 0;
  readonly ACTION_POINTS = 1;
  readonly GOLD = 2;
  readonly STATS_POINTS = 3;
  readonly EXPERIENCE = 4;
  readonly LEVEL = 5;
  readonly RES_FIRE = 6;
  readonly RES_AIR = 7;
  readonly RES_WATER = 8;
  readonly RES_EARTH = 9;
  readonly STRENGTH = 10;
  readonly VITALITY = 11;
  readonly CHARISM = 12;
  readonly KARMA = 13;
  readonly AGILITY = 14;
  readonly INTELLIGENCE = 15;
  readonly DAMAGES = 16;
  readonly DAMAGES_FACTOR = 17;
  readonly CRITICAL_HIT = 18;
  readonly RANGE = 19;
  Effects: EffectLike[] = [];
  Moderators: number[] = [];

  constructor(readonly characData: { force: number | undefined }) {
    this.init();
  }

  /** Lines 28-39 */
  init(): void {
    this.Effects = [];
    this.Moderators = new Array<number>(20).fill(0);
  }

  getEffects(): EffectLike[] {
    return this.Effects;
  }

  /** Lines 44-48 — undefined for a type outside 0..19 (e.g. a string id). */
  getModeratorValue(type: number | string): number | undefined {
    return this.Moderators[toNumber(type)];
  }

  /** Lines 49-57 */
  addEffect(effectData: EffectLike): void {
    this.Effects.push(effectData);
    this.onEffectStart(effectData);
  }

  /**
   * Lines 58-79. AS BUGS kept: the loop bound is fixed before splicing, and `splice(i, i + 1)` removes i + 1
   * effects instead of one, so expiring effects can take unexpired neighbours with them (never ended).
   */
  nextTurn(): void {
    const len = this.Effects.length;
    for (let i = 0; i < len; i++) {
      const effect = this.Effects[i];
      if (!effect) continue; // AS: members of undefined read as undefined; nothing to do
      effect.remainingTurn = toNumber(effect.remainingTurn) - 1;
      if (effect.remainingTurn < 0) {
        this.onEffectEnd(effect);
        this.Effects.splice(i, i + 1);
      }
    }
  }

  /**
   * Lines 80-116. `switch` is strict (===): only numeric types 0..19 are counted; a string type (e.g. "1"
   * straight from the protocol) falls to the AS default ("Error : Mauvais type d'effet") and is ignored.
   */
  onEffectStart(effect: EffectLike): void {
    if (typeof effect.type == "number" && effect.type >= 0 && effect.type <= 19 && Number.isInteger(effect.type)) {
      this.Moderators[effect.type] = this.Moderators[effect.type]! + toNumber(effect.value);
    }
  }

  /**
   * Lines 117-156. AS asymmetry kept: ending a STRENGTH (10) effect also subtracts it from `characData.force`,
   * which onEffectStart never added.
   */
  onEffectEnd(effect: EffectLike): void {
    if (typeof effect.type == "number" && effect.type >= 0 && effect.type <= 19 && Number.isInteger(effect.type)) {
      this.Moderators[effect.type] = this.Moderators[effect.type]! - toNumber(effect.value);
      if (effect.type === this.STRENGTH) this.characData.force = (this.characData.force ?? 0) - toNumber(effect.value);
    }
  }
}
