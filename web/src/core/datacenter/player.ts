// Port of Dofus.DataCenter.Player.as (Class_DataCenter_Player), minus SpellsManager (Dofus.SpellsManager.as,
// next phase). The AS reads the DATACENTER global; the owning DataCenter is passed in.
import { CLIPS_PATH } from "../constants.ts";
import type { PathStep } from "../compressor.ts";
import { getCCText } from "../lang.ts";
import { toNumber } from "../swf6.ts";
import { Broadcaster, type Character } from "./character.ts";
import { DofusDataProvider } from "./dataProvider.ts";
import type { Game } from "./game.ts";
import type { Item } from "./item.ts";
import type { Spell } from "./spell.ts";

/** Player.setCCData — the "close combat" pseudo-spell. */
export interface CCData {
  m_APCost?: string;
  m_Description?: string;
  m_bOnItSelf?: boolean;
  iconFile?: string;
}

type SpellList = "SpellsAir" | "SpellsWater" | "SpellsEarth" | "SpellsFire" | "SpellsGuild";

export class Player extends Broadcaster {
  ID: string | null = null;
  name: string | null = null;
  Language: string | null = null;
  Inventory: Item[] = [];
  Spells = new DofusDataProvider<Spell>();
  SpellsObjects = new DofusDataProvider<object>();
  SpellsUsed = new DofusDataProvider<Spell>();
  SpellsAir: Spell[] = [];
  SpellsWater: Spell[] = [];
  SpellsEarth: Spell[] = [];
  SpellsFire: Spell[] = [];
  SpellsGuild: Spell[] = [];
  CCData: CCData = {};
  Friends: unknown[] = [];
  currentSpell: Spell | (CCData & { m_bOnItSelf: boolean }) | null = null;
  bWinner = false;
  lastClickedCell: number | null = null;
  tmpFullPath: PathStep[] | null = [];
  tmpPath: PathStep[] | null = [];

  constructor(
    private readonly dc: { Characters: DofusDataProvider<Character>; Game: Game },
    public login?: string,
    public password?: string,
  ) {
    super();
  }

  /** Player.as:29-33 */
  get clip() {
    return this.data?.clip;
  }
  /** Player.as:34-38 */
  get data(): Character | undefined {
    return this.dc.Characters.getItemAt(this.ID ?? NaN);
  }
  /** Player.as:39-43 (loose ==: the ID is a string, currentPlayerID may be a number). */
  get isCurrentPlayer(): boolean {
    return (this.dc.Game.currentPlayerID as unknown) == this.ID;
  }
  /** Player.as:44-48 — true without character data (SWF 6: undefined <= 0). */
  get noMoreAP(): boolean {
    return toNumber(this.data?.AP) <= 0;
  }

  /** Player.as:49-57 */
  reset(): void {
    this.currentSpell = null;
    this.lastClickedCell = null;
    this.tmpFullPath = [];
    this.tmpPath = [];
    if (this.data) this.data.bDied = false;
  }
  /** Player.as:58-62 */
  clearTmpPaths(): void {
    this.tmpFullPath = [];
    this.tmpPath = [];
  }
  /** Player.as:63-66 */
  hasEnoughAP(wantedAP: number | string | null | undefined): boolean {
    return toNumber(this.data?.AP) >= toNumber(wantedAP);
  }

  /**
   * Player.as:67-75. AS BUG kept: reads `this.guild`, which a Player never has, so the description is
   * getCCText(undefined) (normally "?").
   */
  setCCData(APCost: string): void {
    this.CCData = { m_APCost: APCost, m_Description: getCCText(undefined), m_bOnItSelf: false, iconFile: CLIPS_PATH + "ccicon.swf" };
  }

  /** Player.as:76-80 */
  addItem(itemData: Item): void {
    this.Inventory.push(itemData);
    this.broadcastMessage("onInventoryChange");
  }

  /** Player.as:81-97 — removes the first item whose m_ID == Number(itemNum). */
  dropItem(itemNum: number | string): void {
    const i = this.Inventory.findIndex((it) => it.m_ID == Number(itemNum));
    if (i >= 0) this.Inventory.splice(i, 1);
    this.broadcastMessage("onInventoryChange");
  }

  /**
   * Player.as:98-150 — files the spell by element (m_type is m_Type, SWF 6) or as guild spell, replacing an
   * existing entry with the same id (keeping its position).
   * AS quirks kept: `index` is the 0-based slot when replacing but the new array LENGTH (1-based) when appending;
   * an unknown element on a non-guild spell selects `this["Spells"]` (the DataProvider): no scan, no push,
   * index undefined.
   * Deviation: for m_Position null/undefined the AS still calls SpellsUsed.setItemAt(null, spell) (SWF 6
   * isNaN(null) and isNaN(undefined) are false), which stores it under the array property "null"; skipped here.
   */
  addSpell(spellObject: Spell): { index: number | undefined; location: string } {
    let strDest = "";
    switch (spellObject.m_Type) {
      case "A": strDest = "Air"; break;
      case "W": strDest = "Water"; break;
      case "E": strDest = "Earth"; break;
      case "F": strDest = "Fire";
    }
    if (spellObject.m_bGuildSpell) strDest = "Guild";
    let i: number | undefined;
    let bExist = false;
    const list = strDest == "" ? undefined : this[("Spells" + strDest) as SpellList];
    if (list) {
      for (let k = 0; k < list.length; k++) {
        if (list[k]!.m_ID == spellObject.m_ID) {
          spellObject.m_Position = list[k]!.m_Position;
          list[k] = spellObject;
          i = k;
          bExist = true;
          break;
        }
      }
    }
    this.Spells.setItemAt(Number(spellObject.m_ID), spellObject);
    if (!bExist && list) i = list.push(spellObject);
    if (spellObject.m_Position != null && !Number.isNaN(spellObject.m_Position)) {
      this.SpellsUsed.setItemAt(spellObject.m_Position, spellObject);
    }
    return { index: i, location: strDest };
  }

  /** Player.as:151-162 (`IsRunning` is `isRunning`, SWF 6). */
  canBoost(value: number): boolean {
    if (this.dc.Game.isRunning) return false;
    return toNumber(this.data?.bonusPoints) >= value;
  }
}
