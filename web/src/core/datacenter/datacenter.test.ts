import { expect, test } from "bun:test";
import { setLangData } from "../lang.ts";
import { parseServerMessage } from "../protocol.ts";
import { DataCenter, Effect, clearAllOthersCharacters, createCharacter, getItemObjectFromData, getSpellObjectFromData } from "./index.ts";

const SPELL_EARTH = "12~3~Cb~0E101fd10Kycbac"; // earth, line only, range f=5, AP d=3, LoS, crit K=36, fail y=24, pos c=2
const SPELL_GUILD = "13~1~~1F000ab00aaaaaa"; // guild spell, position a=0 → null
const ITEM = "1a~2~3~ff8000~~b#1#2#0";
const ASK = `ASK|7|Bob|1|1|0|10|ff0000|-1|00ff00||0|5|100|50|6|3|10|11|0|0|0|0|1|2|3|4|5|4|${SPELL_EARTH};${SPELL_GUILD}|${ITEM}`;

test("getSpellObjectFromData decodes zones and the 15 additional-data digits", () => {
  const s = getSpellObjectFromData(SPELL_EARTH);
  expect(s).toMatchObject({ m_ID: "12", m_Level: 3, m_EffectZones: [{ shape: "C", size: 1 }], m_bGuildSpell: false, m_Type: "E",
    m_EffectType: "1", m_bOnItSelf: false, m_bLineOnly: true, m_Range: 5, m_APCost: 3, m_bLineOfSight: true, m_bFreeCell: false,
    m_CriticalHit: 36, m_Criticalfailure: 24, m_LaunchCountByTurn: 2, m_LaunchCountByPlayerTurn: 1, m_DelayBetweenLaunch: 0, m_Position: 2 });
  expect(getSpellObjectFromData(SPELL_GUILD).m_Position).toBeNull();
  expect(s.iconFile).toBe("clips/spells/icons/12.swf");
});

test("getItemObjectFromData + Item name/description/canEquip through lang and PatternDecoder", () => {
  setLangData({
    G: { "1": { sn: "", ln: "", d: "", cc: "", w: [2] } },
    I: { t: { "2": { n: "épée", t: 2, g: 1, s: true } }, e: { "11": { n: "de feu{~p s}", c: "?", d: "+#1{~2 à #2} dommages" } } },
  });
  const item = getItemObjectFromData(ITEM)!;
  expect(item).toMatchObject({ m_ID: 26, m_Type: 2, m_Gfx: 3, m_ColorRed: 255, m_ColorGreen: 128, m_ColorBlue: 0, m_Position: -1 });
  expect(item.m_Effects).toEqual([{ type: 11, bDescription: true, param1: 1, param2: 2, param3: undefined }]);
  expect(item.gender).toBe("f");
  // typeText.s = true is passed as `!s` = false to combine's `singular` → the plural branch "~p" is kept
  expect(item.name).toBe("Épée de feu s");
  expect(item.description).toBe("+1 à 2 dommages\n");
  expect(item.canEquip(1)).toBe(true);
  expect(item.canEquip(2)).toBe(false);
  expect(item.iconFile).toBe("clips/items/2/3.swf");
  expect(getItemObjectFromData("")).toBeUndefined();
  setLangData({});
});

test("ASK → createCharacter fills the character and the local player's spells/items/CC", () => {
  const dc = new DataCenter();
  const ev = parseServerMessage(ASK);
  if (ev?.type != "characterSelected") throw new Error("expected characterSelected");
  dc.Player.ID = ev.id;
  const c = createCharacter(dc, ev.id, ev.name, ev.data);
  expect(dc.Player.data).toBe(c);
  expect(c).toMatchObject({ num: 7, name: "Bob", guild: "1", level: 1, LP: 50, LPmax: 50, AP: 6, APinit: 6, GP: 3, XP: 5, XPlow: "0",
    color1: 0xff0000, color2: "-1", color3: 0x00ff00, team: null, cell: null, dir: null, bonusPoints: 5, force: 10 });
  expect(c.weapon.gfx).toBe("_1"); // empty weapon, no lang data: getGuildText(1).w undefined → "" + "_1"
  expect(dc.Player.SpellsEarth.map((s) => s.m_ID)).toEqual(["12"]);
  expect(dc.Player.SpellsGuild.map((s) => s.m_ID)).toEqual(["13"]);
  expect(dc.Player.SpellsUsed.getItemAt(2)?.m_ID).toBe("12");
  expect(dc.Player.Inventory.map((i) => i.m_ID)).toEqual([26]);
  expect(dc.Player.CCData).toMatchObject({ m_APCost: "4", m_Description: "?", m_bOnItSelf: false, iconFile: "clips/ccicon.swf" });
  expect(dc.Player.noMoreAP).toBe(false);
  expect(dc.Player.hasEnoughAP(6)).toBe(true);
});

test("Player.addSpell: index is 0-based when replacing, the new length when appending", () => {
  const dc = new DataCenter();
  expect(dc.Player.addSpell(getSpellObjectFromData(SPELL_EARTH))).toEqual({ index: 1, location: "Earth" });
  expect(dc.Player.addSpell(getSpellObjectFromData(SPELL_EARTH))).toEqual({ index: 0, location: "Earth" });
  expect(dc.Player.addSpell(getSpellObjectFromData("14~1~~0X"))).toEqual({ index: undefined, location: "" }); // unknown element
});

test("DataProvider: setItemAt(id, undefined) does not remove (AS quirk), null does", () => {
  const dc = new DataCenter();
  dc.Player.ID = "1";
  createCharacter(dc, 1, "me", {});
  createCharacter(dc, 3, "other", { team: "1", cell: "20" });
  clearAllOthersCharacters(dc);
  expect(dc.Characters.getItemAt(3)?.name).toBe("other"); // still there, only `label` was set
  expect(Object.keys(dc.Characters.keys)).toEqual(["1", "3"]);
  expect(dc.Characters.getItemAt(2)).toBeUndefined(); // sparse hole
  dc.Characters.setItemAt(3, null);
  expect(dc.Characters.getItemAt(3)).toBeUndefined();
});

test("createCharacter quirks: dir from `celdirl` → 0, missing weapon → NaN_NaN, Number(undefined) = 0", () => {
  const dc = new DataCenter();
  expect(createCharacter(dc, 1, "x", {}).level).toBe(0); // SWF 6 Number(undefined), e.g. the GIP wrong-signature call
  const c = createCharacter(dc, 5, "x", { dir: "3", weapon: "1a,2,ff0000" });
  expect(c.dir).toBe(0);
  expect(c.weapon).toEqual({ gfx: "26_2", colorRed: 255, colorGreen: 0, colorBlue: 0 });
  dc.Characters.setItemAt(5, null);
  expect(createCharacter(dc, 5, "y", { guild: "1" }).weapon.gfx).toBe("NaN_NaN");
});

test("EffectsManager: moderators, strict numeric types, and the splice(i, i + 1) bug", () => {
  const dc = new DataCenter();
  const c = createCharacter(dc, 1, "a", { AP: "6" });
  const eff = (type: unknown, value: unknown, remainingTurn: number) => Object.assign(new Effect(), { type, value, remainingTurn });
  const em = c.EffectsManager;
  em.addEffect(eff(1, 2, 5));
  em.addEffect(eff(1, 1, 0));
  em.addEffect(eff(19, 3, 5));
  em.addEffect(eff(1, 1, 5));
  em.addEffect(eff("1", 100, 5)); // string type: ignored by the strict switch
  expect(em.getModeratorValue(1)).toBe(4);
  c.initAP();
  expect(c.AP).toBe(10);
  em.nextTurn(); // i = 1 expires and splice(1, 2) also drops the range effect without ending it
  expect(em.Effects.map((e) => e.type)).toEqual([1, 1, "1"]);
  expect(em.getModeratorValue(1)).toBe(3);
  expect(em.getModeratorValue(19)).toBe(3);
});

test("Game flags and Channel name setter quirk", () => {
  const dc = new DataCenter();
  expect(dc.Game.isFull).toBe(true); // null >= null
  dc.Game.state = 2;
  expect([dc.Game.isMultiplayer, dc.Game.isFight, dc.Game.isFree, dc.Game.isRandom]).toEqual([true, true, true, false]);
  dc.Channel.m_name = "a";
  dc.Channel.name = "b";
  expect([dc.Channel.name, dc.Channel.lastChannel]).toEqual(["a", "a"]);
});
