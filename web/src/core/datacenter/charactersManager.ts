// Port of the data part of Dofus.CharactersManager.as (Class_CharactersManager): clearAllOthersCharacters and
// createCharacter (getSpellObjectFromData / getItemObjectFromData live in spell.ts / item.ts;
// createNewCharacter only draws UI). The AS reads DATACENTER; the DataCenter is passed in.
import { getGuildText } from "../lang.ts";
import { str } from "../swf6.ts";
import { Character } from "./character.ts";
import type { DataCenter } from "./index.ts";
import { getItemObjectFromData } from "./item.ts";
import { getSpellObjectFromData } from "./spell.ts";

/** The `ca` object the protocol handlers build (all raw strings from the wire). */
export interface CharacterInit {
  guild?: string;
  level?: string;
  sex?: string;
  gfxID?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  weapon?: string;
  LP?: string;
  AP?: string;
  GP?: string;
  XPlow?: string;
  XP?: string;
  XPhigh?: string;
  force?: string;
  vitality?: string;
  rFire?: string;
  rAir?: string;
  rWater?: string;
  rEarth?: string;
  charism?: string;
  karma?: string;
  agility?: string;
  intelligence?: string;
  bonusPoints?: string;
  team?: string;
  joinPosition?: string;
  cell?: string;
  dir?: string;
  cc?: string;
  spells?: string;
  items?: string;
}

/** CharactersManager.as:5-17 — "removes" (see dataProvider.ts: it does not really) every character but the player. */
export function clearAllOthersCharacters(dc: DataCenter): void {
  for (const k of Object.keys(dc.Characters.keys)) {
    if ((dc.Characters.getItemAt(k)?.num as unknown) != dc.Player.ID) dc.Characters.setItemAt(Number(k), undefined);
  }
}

/** `x != -1 ? Number("0x" + x) : x` — the "-1" string compares equal to -1 and is kept as is. */
const color = (c: string | undefined): string | number => ((c as unknown) != -1 ? Number("0x" + str(c)) : c!);

/**
 * CharactersManager.as:18-160. Reuses the existing entry for id `i` (also a "removed" one). Every call adds
 * `ca.spells` / `ca.items` to the LOCAL PLAYER (not to this character), and `ca.cc` sets the player's CC data.
 * Not ported: `GameActionsManager.init()` on the character (next phase).
 * AS quirks kept: `dir` reads the misspelled `ca.celdirl`, so a given dir becomes Number(undefined) = 0 (SWF 6);
 * a missing `weapon` (undefined.length != 0) yields gfx "NaN_NaN"; an empty one falls back to the guild's first
 * weapon type + "_1" (or "_1" without lang data); an empty `spells` string still adds one empty spell.
 */
export function createCharacter(dc: DataCenter, i: string | number, name: string | undefined, ca: CharacterInit): Character {
  let c = dc.Characters.getItemAt(i);
  if (c == undefined) {
    c = new Character();
    dc.Characters.setItemAt(Number(i), c);
  }
  c.index = Number(i);
  c.num = Number(i);
  c.name = name ?? null;
  c.guild = ca.guild;
  c.level = ca.level;
  c.clip = null;
  c.items = [];
  c.sex = ca.sex == undefined ? 1 : ca.sex;
  c.gfxID = ca.gfxID == undefined ? 0 : ca.gfxID;
  c.color1 = color(ca.color1);
  c.color2 = color(ca.color2);
  c.color3 = color(ca.color3);
  if (ca.weapon === undefined || ca.weapon.length != 0) {
    const a = ca.weapon?.split(",") ?? [];
    c.weapon = {
      gfx: parseInt(str(a[0]), 16) + "_" + parseInt(str(a[1]), 16),
      colorRed: parseInt(str(a[2]?.substring(0, 2)), 16),
      colorGreen: parseInt(str(a[2]?.substring(2, 4)), 16),
      colorBlue: parseInt(str(a[2]?.substring(4, 6)), 16),
    };
  } else {
    c.weapon = { gfx: str(getGuildText(c.guild).w?.[0]) + "_1" };
  }
  if (ca.LP != undefined) c.LP = Number(ca.LP);
  if (ca.LP != undefined) c.LPmax = Number(ca.LP);
  if (ca.AP != undefined) c.AP = Number(ca.AP);
  if (ca.AP != undefined) c.APinit = Number(ca.AP);
  if (ca.GP != undefined) c.GP = Number(ca.GP);
  if (ca.XPlow != undefined) c.XPlow = ca.XPlow;
  if (ca.XP != undefined) c.XP = ca.XP;
  if (ca.XPhigh != undefined) c.XPhigh = ca.XPhigh;
  if (ca.force != undefined) c.force = ca.force;
  if (ca.vitality != undefined) c.vitality = ca.vitality;
  if (ca.rFire != undefined) c.rFire = ca.rFire;
  if (ca.rAir != undefined) c.rAir = ca.rAir;
  if (ca.rWater != undefined) c.rWater = ca.rWater;
  if (ca.rEarth != undefined) c.rEarth = ca.rEarth;
  if (ca.charism != undefined) c.charism = ca.charism;
  if (ca.karma != undefined) c.karma = ca.karma;
  if (ca.agility != undefined) c.agility = ca.agility;
  if (ca.intelligence != undefined) c.intelligence = ca.intelligence;
  if (ca.bonusPoints != undefined) c.bonusPoints = ca.bonusPoints;
  c.team = ca.team != undefined ? Number(ca.team) : null;
  c.joinPosition = ca.joinPosition != undefined ? Number(ca.joinPosition) : null;
  c.cell = ca.cell != undefined ? Number(ca.cell) : null;
  c.dir = ca.dir != undefined ? 0 : null; // Number(ca.celdirl)
  c.bDied = false;
  if (ca.cc) dc.Player.setCCData(ca.cc);
  for (const s of ca.spells?.split(";") ?? []) dc.Player.addSpell(getSpellObjectFromData(s));
  for (const d of ca.items?.split(";") ?? []) {
    const item = getItemObjectFromData(d);
    if (item != undefined) dc.Player.addItem(item);
  }
  return c;
}
