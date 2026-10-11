// Generates server/data/items.json: the item templates the server awards at the end of a fight (docs/server.md "Items").
// Beta 5b has no item name table: an item's name is the lang type name I.t[type].n plus one I.e[effect].n suffix per
// effect (AKSClient/Dofus.DataCenter.Item.as:69-87), so items are generated from the lang tables of
// web/public/lang/fr.json (docs/content-reconstruction.md §3 "I.t, I.st, I.e") and the icons the client loads,
// dofus-5b/clips/items/<type>/<gfx>.swf (Item.as:38-47): one template per icon.
//
//   bun scripts/server-data/items.ts
//
// Effects (numbers authored, see PROVENANCE): weapons (super type 2) get the damage effect 100, whose dice replace the
// class close-combat dice on the server; every other item gets the karma effect 123 (display only). The push effect 5
// is not used: no server rule for it. Every template has at least one effect: an empty effects field still yields one
// effect of type NaN (Item.as:15), whose name part is "?".
// Check: every template goes through the client's own Item (web/src/core/datacenter/item.ts) with fr.json loaded; the
// script fails if a name or a description shows "?" or "undefined".
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getItemObjectFromData } from "../../web/src/core/datacenter/item.ts";
import { setLangData, type LangData } from "../../web/src/core/lang.ts";

const ROOT = join(import.meta.dir, "../..");
type Lang = LangData & { I: { t: Record<string, { n: string; t: number }>; e: Record<string, unknown> }; G: Record<string, { w: number[] }> };
const fr = JSON.parse(readFileSync(join(ROOT, "web/public/lang/fr.json"), "utf8")) as Lang;
setLangData(fr);

const DAMAGE = 100, KARMA = 123;
for (const e of [DAMAGE, KARMA]) if (!fr.I.e[e]) throw new Error(`fr.json I.e has no effect ${e}`);
const types = Object.fromEntries(Object.entries(fr.I.t).map(([t, v]) => [t, v.t]));
const classWeapons = Object.fromEntries(Object.entries(fr.G).map(([c, v]) => [c, v.w]));

const items: { type: number; gfx: number; effects: number[][] }[] = [];
for (const type of Object.keys(types).map(Number).sort((a, b) => a - b)) {
  const gfxs = readdirSync(join(ROOT, "dofus-5b/clips/items", String(type)))
    .filter((f) => f.endsWith(".swf"))
    .map((f) => Number(f.slice(0, -4)))
    .sort((a, b) => a - b);
  for (const gfx of gfxs) {
    // weapons: 1D4..1D8 by icon, +0..+3 every five icons (the class close combat is 1D4..1D6+1, server/data/classes.json)
    const effects = types[type] == 2 ? [[DAMAGE, 1, 4 + ((gfx - 1) % 5), Math.floor((gfx - 1) / 5)]] : [[KARMA, gfx, 0, 0]];
    items.push({ type, gfx, effects });
  }
}

// The client's view of each template (the server's entry format: hex fields, "0" = absent parameter).
const hex = (n: number) => n.toString(16);
for (const [i, it] of items.entries()) {
  const entry = [hex(i + 1), hex(it.type), hex(it.gfx), "FFFFFF", "", it.effects.map((e) => e.map(hex).join("#")).join(",")].join("~");
  const item = getItemObjectFromData(entry)!;
  if (/\?|undefined|NaN/.test(item.name + item.description)) throw new Error(`template ${JSON.stringify(it)}: "${item.name}" / "${item.description}"`);
}
const sample = (type: number) => {
  const it = items.find((x) => x.type == type)!;
  return getItemObjectFromData(["1", hex(type), hex(it.gfx), "FFFFFF", "", it.effects.map((e) => e.map(hex).join("#")).join(",")].join("~"))!;
};

const PROVENANCE = {
  items:
    "One template per item icon of beta 5b (dofus-5b/clips/items/<type>/<gfx>.swf, the file Item.iconFile loads: AKSClient/Dofus.DataCenter.Item.as:38-47). " +
    "type: lang I.t ids (web/public/lang/fr.json; names and super types retro_fr items_fr_13, consistent with the 5b slots and the class sprites' weapon imports). " +
    "effects [id, p1, p2, p3] (0 = absent, sent as '0', Item.as:30-32): ids 100 (damage, 'dommages : #1{~1D}#2{~2~3+}#3') and 123 (karma, '+#1 au karma') are the lang I.e entries " +
    "(texts beta_screenshot, ids authored, confidence low: docs/content-reconstruction.md §3); every number is authored: weapons 1D(4 + (gfx-1) mod 5) + floor((gfx-1)/5), others +gfx karma.",
  types: "type → super type, lang I.t[type].t (retro_fr); the equipment slots take super types 1, 2, 3, 4, 3, 5 (modules_Interfaces/DefineSprite_598_InventoryViewer, EquipementItemContainer on(initialize))",
  class_weapons: "class → weapon types it can equip, lang G[class].w (beta asset: each class sprite imports exactly one weapon, <w[0]>_1 of weapons.swf); Item.canEquip, AKSClient/Dofus.DataCenter.Item.as:107-130",
  max_items: "authored; the client has the 'inventory full' answer OAEF (AKSClient/Dofus.Client.Items.as:32-41) but no size",
};
writeFileSync(
  join(ROOT, "server/data/items.json"),
  JSON.stringify({ provenance: PROVENANCE, max_items: 30, types, class_weapons: classWeapons, items }, null, 1).replace(/\[[\d,\s]+\]/g, (a) => a.replace(/\s+/g, " ").replace("[ ", "[").replace(" ]", "]")) + "\n",
);
console.log(`${items.length} item templates → server/data/items.json; e.g. "${sample(4).name}" (${sample(4).description.trim()}), "${sample(11).name}" (${sample(11).description.trim()})`);
