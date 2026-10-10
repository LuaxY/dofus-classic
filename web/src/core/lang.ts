// Port of the lang lookups of Dofus.Kernel.Init.as:80-155 (`_global.getText`, `getSpellText`, …).
// The original reads `SHARED_OBJECT.data` (SharedObject "DofusSO", filled by langupdater.php — content lost).
// Here the same object shape is a plain JSON value given to `setLangData`. Shapes below are inferred from the
// fallbacks and the readers (Spell, Item, CharactersManager) and match the reconstruction web/public/lang/fr.json;
// the original content is UNKNOWN — not in code.
// Note: SWF 6 member lookup is case-insensitive, so the original `data[ref]` also matched keys of another case.
import { str, toNumber } from "./swf6.ts";

export interface SpellText {
  n: string;
  d: string;
  /** `l<level>` → [normal hit description, critical hit description] (Copie de Dofus.DataCenter.Spell.as:88-97),
   *  then AP cost and range (read by the creation screen, SpellInfosViewer). */
  [level: `l${number}`]: [string, string, number?, number?];
}
export interface MapText { n: string; d: string }
/** `w` (weapon item type ids) is read by CharactersManager.as:53 and DataCenter.Item.as:115 but absent from the fallback.
 *  `cc` is the close-combat dice array read by the CC button tooltip; the fallback (Init.as:120-128) has the string "?". */
export interface GuildText { sn: string; ln: string; d: string; cc: string | (number | null)[]; w?: number[] }
export interface ItemTypeText { n: string; t: number | string; g: number | string; s: unknown }
/** `d` is read by DataCenter.Item.as:99 but absent from the fallback; `c` is only in the fallback (no reader). */
export interface ItemEffectText { n: string; c?: string; d?: string }
export interface LangData {
  [key: string]: unknown;
  S?: Record<string, SpellText>;
  CC?: Record<string, string>;
  M?: Record<string, MapText>;
  G?: Record<string, GuildText>;
  I?: { t?: Record<string, ItemTypeText>; st?: Record<string, string>; e?: Record<string, ItemEffectText> };
}

let data: LangData = {};

export function setLangData(lang: LangData): void {
  data = lang;
}

/**
 * Init.as:80-97. Replaces "%1".."%n" in order with `ank.ext.StringExtensions.replace` semantics: one
 * split/join per placeholder, sequentially (so "%10" is hit by the "%1" pass, and text inserted by an
 * earlier pass is subject to later passes). Missing key → undefined (AS: `undefined.replace(...)`).
 */
export function getText(ref: string, params: readonly unknown[] = []): string | undefined {
  const s = data[ref];
  if (typeof s !== "string") return undefined;
  let out = s;
  for (let i = 0; i < params.length; i++) out = out.split("%" + (i + 1)).join(str(params[i]));
  return out;
}

/** Init.as:98-101 (no fallback). */
export const getSpellText = (spellID: number | string | null): SpellText | undefined => data.S?.[str(spellID)];

/** Init.as:102-110 */
export const getCCText = (guildID: number | string | null | undefined): string => data.CC?.[str(guildID)] || "?";

/** Init.as:111-119 */
export const getMapText = (mapID: number | string): MapText => data.M?.[toNumber(mapID)] || { n: "?", d: "?" };

/** Init.as:120-128 */
export const getGuildText = (guildID: number | string | null | undefined): GuildText =>
  data.G?.[toNumber(guildID)] || { sn: "?", ln: "?", d: "?", cc: "?" };

/** Init.as:129-137 */
export const getItemTypeText = (typeID: unknown): ItemTypeText =>
  data.I?.t?.[toNumber(typeID)] || { n: "?", t: "?", g: "?", s: "?" };

/**
 * Init.as:138-146. Quirk kept: the test is `v.length != 0`, so a missing entry returns undefined
 * (undefined.length != 0 is true) and only an empty string falls back to "?".
 */
export function getItemSuperTypeText(superTypeID: unknown): string | undefined {
  const v = data.I?.st?.[toNumber(superTypeID)];
  return v === undefined || v.length !== 0 ? v : "?";
}

/** Init.as:147-155 */
export const getItemEffectText = (effectID: number | string | undefined): ItemEffectText =>
  data.I?.e?.[toNumber(effectID)] || { n: "?", c: "?" };
