// Port of Dofus.DataCenter.Item.as (Class_DataCenter_Item) and of CharactersManager.getItemObjectFromData
// (Dofus.CharactersManager.as:176-194). Names/descriptions come from lang + ank.PatternDecoder.
// `isNan` in colorObject is `isNaN` (SWF 6 identifiers are case-insensitive).
import { Constants } from "../constants.ts";
import { getGuildText, getItemEffectText, getItemSuperTypeText, getItemTypeText, type ItemTypeText } from "../lang.ts";
import { combine, getDescription } from "../patternDecoder.ts";
import { toNumber } from "../swf6.ts";

export interface ItemEffect {
  type: number;
  bDescription: boolean;
  param1?: number;
  param2?: number;
  param3?: number;
}

export class Item {
  m_ID: number | null = null;
  m_Type: number | null = null;
  m_Gfx: number | null = null;
  m_Color: null = null;
  m_Position: number | null = null;
  m_Effects: ItemEffect[] = [];
  m_ColorRed?: number;
  m_ColorGreen?: number;
  m_ColorBlue?: number;

  /**
   * Item.as:12-37 — "type#p1#p2#p3,…" in hex; a "0" param is undefined. Note "" yields one effect
   * { type: NaN, bDescription: false } (an empty effects field is not "no effects"); undefined yields none.
   */
  setEffects(compressedData: string | undefined): void {
    if (compressedData === undefined) return;
    for (const e of compressedData.split(",")) {
      const p = e.split("#");
      const effect: ItemEffect = { type: parseInt(p[0]!, 16), bDescription: p[1] !== undefined };
      if (effect.bDescription) {
        effect.param1 = p[1] != "0" ? hex(p[1]) : undefined;
        effect.param2 = p[2] != "0" ? hex(p[2]) : undefined;
        effect.param3 = p[3] != "0" ? hex(p[3]) : undefined;
      }
      this.m_Effects.push(effect);
    }
  }

  /** Item.as:38-47 (uses dofus.Constants.ITEMS_PATH). */
  get iconFile(): string {
    if (this.m_Effects.length == 0) return Constants.ITEMS_PATH + "0.swf";
    return Constants.ITEMS_PATH + this.m_Type + "/" + this.m_Gfx + ".swf";
  }
  get typeText(): ItemTypeText {
    return getItemTypeText(this.m_Type);
  }
  get superType(): ItemTypeText["t"] {
    return this.typeText.t;
  }
  get superTypeText(): string | undefined {
    return getItemSuperTypeText(this.typeText.t);
  }
  /** Item.as:63-68 */
  get gender(): string | undefined {
    return ["m", "f", "n"][Number(this.typeText.g)];
  }
  /**
   * Item.as:69-87. Note the AS passes `p = !typeText.s` as PatternDecoder.combine's `singular` argument
   * (kept as-is; whether `s` means "singular" or "plural" in the lost lang data is UNKNOWN).
   */
  get name(): string {
    let n = this.typeText.n;
    n = n.charAt(0).toUpperCase() + n.slice(1);
    const g = this.gender;
    const p = !this.typeText.s;
    for (const e of this.m_Effects) n += " " + combine(getItemEffectText(e.type).n, g, p);
    return n;
  }
  /** Item.as:88-106 */
  get description(): string {
    let s = "";
    for (const e of this.m_Effects) {
      if (e.bDescription) s += getDescription(getItemEffectText(e.type).d, [e.param1, e.param2, e.param3]) + "\n";
    }
    return s;
  }
  /**
   * Item.as:107-130. The AS reads DATACENTER.Player.data.guild; it is a parameter here. Weapons (super type 2)
   * are equippable only if their type is in the guild's `w` list.
   */
  canEquip(playerGuild: number | string | null | undefined): boolean {
    if (this.superType != 2) return true;
    const w = getGuildText(playerGuild).w ?? [];
    return w.some((t) => t == this.m_Type);
  }
  /** Item.as:131-146 */
  get colorObject(): { ra?: number; rb?: number; ga?: number; gb?: number; ba?: number; bb?: number } {
    if (Number.isNaN(toNumber(this.m_ColorRed))) return {};
    return { ra: this.m_ColorRed, rb: 20, ga: this.m_ColorGreen, gb: 20, ba: this.m_ColorBlue, bb: 20 };
  }
}

const hex = (s: string | undefined): number => parseInt(s ?? "", 16);

/** CharactersManager.as:176-194 — "id~type~gfx~RRGGBB~position~effects" (hex). Empty string → undefined. */
export function getItemObjectFromData(data: string): Item | undefined {
  if (data.length == 0) return undefined;
  const p = data.split("~");
  const item = new Item();
  item.m_ID = hex(p[0]);
  item.m_Type = hex(p[1]);
  item.m_Gfx = hex(p[2]);
  item.m_ColorRed = hex(p[3]?.substring(0, 2));
  item.m_ColorGreen = hex(p[3]?.substring(2, 4));
  item.m_ColorBlue = hex(p[3]?.substring(4, 6));
  // `p[4].length != 0`: a missing field is undefined.length != 0 → parseInt(undefined) → NaN, not -1.
  item.m_Position = p[4] === undefined ? NaN : p[4].length != 0 ? hex(p[4]) : -1;
  item.setEffects(p[5]);
  return item;
}
