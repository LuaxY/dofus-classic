// Validates web/public/lang/fr.json (reconstructed French lang data, docs/content-reconstruction.md) against lang.ts,
// the key inventory docs/logic/lang-keys.json, the ids used by fixtures/protocol docs, and fr.provenance.json.
import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getItemObjectFromData } from "./datacenter/item.ts";
import {
  getCCText, getGuildText, getItemEffectText, getItemSuperTypeText, getItemTypeText, getMapText, getSpellText, getText,
  setLangData, type LangData,
} from "./lang.ts";
import { getDescription } from "./patternDecoder.ts";

const at = (p: string) => new URL(p, import.meta.url);
const fr = (await Bun.file(at("../../public/lang/fr.json")).json()) as Record<string, unknown>;
const prov = (await Bun.file(at("../../public/lang/fr.provenance.json")).json()) as {
  keys: Record<string, { source: string }>;
  tables: Record<string, Record<string, { fields: Record<string, { source: string }> }>>;
};
const inventory = ((await Bun.file(at("../../../docs/logic/lang-keys.json")).json()) as { keys: Record<string, { params: number }> }).keys;
const serverMaps = ((await Bun.file(at("../../../server/data/maps.json")).json()) as { maps: { id: number }[] }).maps;
setLangData(fr as LangData);

const TABLES = ["S", "CC", "M", "G", "I"];
const SOURCES = ["beta", "beta_screenshot", "beta_forum", "beta_sibling", "retro_fr", "authored"];

test("every inventory key resolves, with exactly %1..%params and no combine markup", () => {
  expect(Object.keys(inventory).length).toBe(289);
  for (const [key, { params }] of Object.entries(inventory)) {
    const raw = fr[key];
    expect(typeof raw, key).toBe("string");
    const used = [...new Set([...(raw as string).matchAll(/%(\d)/g)].map((m) => Number(m[1])))].sort();
    expect(used, key).toEqual(Array.from({ length: params }, (_, i) => i + 1));
    expect(getText(key, Array.from({ length: params }, (_, i) => `P${i + 1}`))?.includes("%"), key).toBe(false);
  }
  // 5b getText has no PatternDecoder pass: "{~fe}" would be printed as is
  for (const [k, v] of Object.entries(fr)) if (typeof v === "string") expect(v.includes("{~"), k).toBe(false);
});

test("dynamic keys for the ids used by fixtures and protocol docs", () => {
  // M142 (protocol.test.ts), M1001 (account.md); GCEn, GJEp, GJEf (game.md, protocol.test.ts)
  for (const k of ["SRV_MSG_42", "SRV_MSG_001", "ERROR_CREATING_n", "ERROR_JOINING_p", "ERROR_JOINING_f"]) expect(getText(k), k).toBeString();
  expect(getText("ERROR_CREATING_GAME") + " : " + getText("ERROR_CREATING_n")).toBe("Erreur lors de la création de la partie : ce nom de partie est déjà utilisé");
});

test("S has an entry for every spell icon; beta level-1 spells carry their description data", () => {
  const icons = readdirSync(fileURLToPath(at("../../../dofus-5b/clips/spells/icons"))).map((f) => f.replace(".swf", ""));
  expect(icons.length).toBe(163);
  for (const id of icons) expect(getSpellText(id)?.n, id).toBeString();
  expect(getSpellText(141)).toEqual({ n: "Pression", d: expect.any(String), l1: ["Dégâts : 1dé6 +2", "", 3, 2] } as never); // protocol spells.md example id
  expect([getSpellText(22)?.n, getSpellText(23)?.n]).toEqual(["Cri de l'ours", "Chat"]); // beta order differs from retro ids
});

test("G, CC, M, I lookups are fallback-free for the ids the code and fixtures use", () => {
  for (let g = 1; g <= 10; g++) {
    const t = getGuildText(g);
    expect(t.sn).not.toBe("?");
    expect(t.w?.[0]).toBeGreaterThanOrEqual(2); // weapons.swf types 2..8, linkage w[0] + "_1"
    expect(getCCText(g)).not.toBe("?");
  }
  // close-combat tooltip of DefineButton2_970 with the Iop data
  const cc = getGuildText(8).cc as unknown as unknown[];
  expect(getDescription("#1{~1D}#2{~2~3+}#3", cc) + " (" + cc[3] + getText("AP") + ")").toBe("1D5 (3PA)");
  for (const m of [12, 13, 15, 20, 507]) expect(getMapText(m).n, String(m)).not.toBe("?");
  expect(serverMaps.length).toBeGreaterThan(0);
  for (const { id } of serverMaps) expect(getMapText(id).n, `server map ${id}`).not.toBe("?"); // every map the Rust server can send
  for (let t = 1; t <= 11; t++) expect(getItemTypeText(t).n).not.toBe("?");
  for (let st = 1; st <= 7; st++) expect(getItemSuperTypeText(st)).toBeString();
  expect(getItemEffectText(100).n).not.toBe("?"); // items.md example "1a~5~3~FF8800~~64#a#0#0"
  expect(getItemObjectFromData("1a~5~3~FF8800~~64#a#0#0")?.superTypeText).toBe("Armes");
});

test("the booge_wp_05.jpg tooltip item rebuilds through Item.name / description", () => {
  const item = getItemObjectFromData("1~4~1~FFFFFF~~64#1#5#0,7b#a#0#0,5#1#0#0")!;
  expect(item.name).toBe("Bâton de boisaille karmique repoussant");
  expect(item.description).toBe("dommages : 1D5\n+10 au karma\nfait reculer de 1case(s)\n");
});

test("fr.json and fr.provenance.json describe the same values", () => {
  const keys = Object.keys(fr).filter((k) => !TABLES.includes(k)).sort();
  expect(Object.keys(prov.keys).sort()).toEqual(keys);
  for (const k of keys) expect(SOURCES, k).toContain(prov.keys[k]!.source);
  const I = fr.I as Record<string, unknown>;
  const tables: Record<string, Record<string, unknown>> = {
    S: fr.S as never, CC: fr.CC as never, M: fr.M as never, G: fr.G as never, "I.t": I.t as never, "I.st": I.st as never, "I.e": I.e as never,
  };
  expect(Object.keys(prov.tables).sort()).toEqual(Object.keys(tables).sort());
  for (const [name, entries] of Object.entries(tables)) {
    expect(Object.keys(prov.tables[name]!).sort(), name).toEqual(Object.keys(entries).sort());
    for (const [id, value] of Object.entries(entries)) {
      const fields = typeof value === "string" ? ["value"] : Object.keys(value as object);
      const p = prov.tables[name]![id]!.fields;
      expect(Object.keys(p).sort(), `${name}[${id}]`).toEqual(fields.sort());
      for (const f of fields) expect(SOURCES, `${name}[${id}].${f}`).toContain(p[f]!.source);
    }
  }
});
