// Port of Dofus.DataCenter.SpellLaunch.as (Class_DataCenter_SpellLaunch). The AS reads DATACENTER.Player;
// it is passed in. Never instantiated anywhere in AKSClient (SpellsManager consumes it; next phase).
import type { DofusDataProvider } from "./dataProvider.ts";
import type { Spell } from "./spell.ts";

export class SpellLaunch {
  m_spellData: Spell | undefined = undefined;
  m_RemainingTurn: number | null = null;

  constructor(
    readonly m_SpellID: string | number,
    readonly m_characOnID: string | number | undefined,
    readonly m_PlayerData: { Spells: DofusDataProvider<Spell> },
  ) {
    this.init();
  }

  /** SpellLaunch.as:12-29 — a delay ≥ 63 means "never again" (Number.MAX_VALUE). */
  init(): void {
    this.m_spellData = this.m_PlayerData.Spells.getItemAt(this.m_SpellID);
    const delay = this.m_spellData?.m_DelayBetweenLaunch ?? 0;
    this.m_RemainingTurn = delay >= 63 ? Number.MAX_VALUE : delay;
  }
}
