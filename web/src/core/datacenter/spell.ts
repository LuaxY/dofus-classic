// Port of "Copie de Dofus.DataCenter.Spell.as" (Class_DataCenter_Spell, the real Spell class) and of
// CharactersManager.getSpellObjectFromData (Dofus.CharactersManager.as:166-175).
// SWF 6 case-insensitivity: the `data` getter reads m_name/m_type, i.e. the m_Name getter and the m_Type field;
// m_file/m_infos/m_effects exist under no spelling, so they are undefined.
// Dofus.DataCenter.Effect.as adds type/value/remainingTurn accessors to Class_DataCenter_Spell.prototype (sic),
// but its #initclip (sprite 70) runs before this class is defined (sprite 71), so that is a no-op.
import { SPELLS_PATH } from "../constants.ts";
import { decode64 } from "../compressor.ts";
import { getSpellText } from "../lang.ts";
import { str, toNumber } from "../swf6.ts";

type Raw = string | number | null | undefined;

export interface EffectZone {
  shape: string | undefined;
  size: number | undefined;
}

export class Spell {
  m_ID: string | null = null;
  m_Level: Raw = null;
  m_EffectZones: EffectZone[] | null = null;
  m_bGuildSpell: boolean | null = null;
  /** Element: "A" air, "W" water, "E" earth, "F" fire (Player.addSpell). */
  m_Type: string | null | undefined = null;
  m_EffectType: string | null | undefined = null;
  m_bOnItSelf: boolean | null = null;
  m_bLineOnly: boolean | null = null;
  m_Range: Raw = null;
  m_APCost: Raw = null;
  m_bLineOfSight: boolean | null = null;
  m_bFreeCell: boolean | null = null;
  m_CriticalHit: number | null | undefined = null;
  m_Criticalfailure: number | null | undefined = null;
  m_LaunchCountByTurn: number | null | undefined = null;
  m_LaunchCountByPlayerTurn: number | null | undefined = null;
  m_DelayBetweenLaunch: number | null | undefined = null;
  m_Position: number | null | undefined = null;
  m_AnimID: Raw = null;
  /** Set from game action 300 (Events.AKS.Game.as:772): the spell clip is placed in front of the caster. */
  m_bInFrontOfPlayer: boolean | null = null;

  /** Spell.as:26-37 — pairs (shape char, size digit). */
  setEffectZones(compressedData: string | undefined): void {
    const c = compressedData === undefined ? [] : compressedData.split("");
    const zones: EffectZone[] = [];
    for (let i = 0; i < c.length; i += 2) zones.push({ shape: c[i], size: decode64(c[i + 1]) });
    this.m_EffectZones = zones;
  }

  /** Spell.as:38-61 — one char per field; numbers are base-64 digits. Position outside 1..8 → null. */
  setAdditionalData(compressedData: string | undefined): void {
    const c = compressedData === undefined ? [] : compressedData.split("");
    this.m_bGuildSpell = c[0] == "1";
    this.m_Type = c[1];
    this.m_EffectType = c[2];
    this.m_bOnItSelf = c[3] == "1";
    this.m_bLineOnly = c[4] == "1";
    this.m_Range = decode64(c[5]);
    this.m_APCost = decode64(c[6]);
    this.m_bLineOfSight = c[7] == "1";
    this.m_bFreeCell = c[8] == "1";
    this.m_CriticalHit = decode64(c[9]);
    this.m_Criticalfailure = decode64(c[10]);
    this.m_LaunchCountByTurn = decode64(c[11]);
    this.m_LaunchCountByPlayerTurn = decode64(c[12]);
    this.m_DelayBetweenLaunch = decode64(c[13]);
    this.m_Position = decode64(c[14]);
    if (toNumber(this.m_Position) > 8 || toNumber(this.m_Position) < 1) this.m_Position = null; // undefined → 0 → null
  }

  /** Spell.as:62-67 */
  get data() {
    return { name: this.m_Name, file: undefined, type: this.m_Type, infos: undefined, effects: undefined };
  }
  /** Spell.as:68-72 */
  get iconFile(): string {
    return SPELLS_PATH + "icons/" + this.m_ID + ".swf";
  }
  /** Spell.as:73-77 — m_AnimID is never set anywhere in AKSClient, so this is ".../null.swf". */
  get file(): string {
    return SPELLS_PATH + this.m_AnimID + ".swf";
  }
  /** Spell.as:78-82 */
  get m_Name(): string | undefined {
    return getSpellText(this.m_ID)?.n;
  }
  /** Spell.as:83-87 */
  get m_Description(): string | undefined {
    return getSpellText(this.m_ID)?.d;
  }
  /** Spell.as:88-92 */
  get m_DescriptionNormalHit(): string | undefined {
    return getSpellText(this.m_ID)?.[("l" + str(this.m_Level)) as `l${number}`]?.[0];
  }
  /** Spell.as:93-102 (defined twice in the AS, identically) */
  get m_DescriptionCriticalHit(): string | undefined {
    return getSpellText(this.m_ID)?.[("l" + str(this.m_Level)) as `l${number}`]?.[1];
  }
}

/** CharactersManager.as:166-175 — "id~level~effectZones~additionalData". */
export function getSpellObjectFromData(data: string): Spell {
  const p = data.split("~");
  const s = new Spell();
  s.m_ID = p[0] ?? null;
  s.m_Level = toNumber(p[1]);
  s.setEffectZones(p[2]);
  s.setAdditionalData(p[3]);
  return s;
}
