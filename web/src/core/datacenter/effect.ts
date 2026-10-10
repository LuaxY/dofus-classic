// Port of Dofus.DataCenter.Effect.as (Class_DataCenter_Effect). Its type/value/remainingTurn accessors were
// added to the wrong prototype (Class_DataCenter_Spell, before that class existed → no-op), so on an Effect
// they are plain properties: Kernel.addToEffectsManager (Dofus.Kernel.as:285-293) assigns them uncoerced.
import type { EffectLike } from "./effectsManager.ts";

export class Effect implements EffectLike {
  m_Type: null = null;
  m_Value: null = null;
  m_RemainingTurn: null = null;
  type: unknown;
  value: unknown;
  remainingTurn: number | string = 0;
}
