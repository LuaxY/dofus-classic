// Port of Dofus.DataCenter.Character.as (Class_DataCenter_Character), minus the renderer/sequencing members:
// SEQUENCER_anim / SEQUENCER_actions (Dofus.Sequencer) and GameActionsManager are not ported (next phase);
// `clip` stays an opaque renderer handle. Stat setters coerce with Number() and broadcast like the AS.
import { CLIPS_PERSOS_PATH, GUILD_NAMES } from "../constants.ts";
import { str, toNumber } from "../swf6.ts";
import { EffectsManager } from "./effectsManager.ts";

export type Listener = Partial<Record<string, (...args: unknown[]) => void>>;

/** ASBroadcaster.initialize(this): addListener / removeListener / broadcastMessage. */
export class Broadcaster {
  _listeners: Listener[] = [];
  addListener(l: Listener): boolean {
    this.removeListener(l);
    this._listeners.push(l);
    return true;
  }
  removeListener(l: Listener): boolean {
    const i = this._listeners.indexOf(l);
    if (i < 0) return false;
    this._listeners.splice(i, 1);
    return true;
  }
  broadcastMessage(name: string, ...args: unknown[]): void {
    for (const l of [...this._listeners]) l[name]?.(...args);
  }
}

/** The renderer's character clip as seen from the data side (BattleField.Characters.Character). */
export interface CharacterClip {
  showPoints?(kind: string, value: unknown): void;
}

export interface Weapon {
  gfx?: string;
  colorRed?: number;
  colorGreen?: number;
  colorBlue?: number;
}

type Raw = string | number | null | undefined;

export class Character extends Broadcaster {
  index: number | null = null;
  num: number | null = null;
  name: string | null = null;
  guild: Raw = null;
  clip: CharacterClip | null = null;
  items: unknown[] | null = null;
  sex: Raw = null;
  gfxID: Raw = null;
  color1: Raw = null;
  color2: Raw = null;
  color3: Raw = null;
  LPmax: Raw = null;
  APinit: Raw = null;
  team: number | null = null;
  joinPosition: number | null = null;
  mainPlayer = false;
  cell: number | null = null;
  dir: number | null = null;
  bDied = false;
  weapon: Weapon = {};
  /** Set by CharactersManager.createCharacter / Client.Account.innerOnNewLevel (raw strings, no accessor). */
  XPlow: Raw;
  XPhigh: Raw;
  label?: unknown;
  EffectsManager: EffectsManager = new EffectsManager(this);

  private m_Level: number | undefined;
  private m_XP: number | undefined;
  private m_LP: number | undefined;
  private m_AP: number | undefined;
  private m_GP: number | undefined;
  private m_Force: number | undefined;
  private m_Vitality: number | undefined;
  private m_rFire: number | undefined;
  private m_rAir: number | undefined;
  private m_rWater: number | undefined;
  private m_rEarth: number | undefined;
  private m_Charism: number | undefined;
  private m_Karma: number | undefined;
  private m_Agility: number | undefined;
  private m_Intelligence: number | undefined;
  private m_BonusPoints: number | undefined;

  // Character.as:31-191 — getter/setter pairs. Setters: m_X = Number(value) (SWF 6: undefined → 0); broadcastMessage("onSetX", value).
  get level(): number | undefined { return this.m_Level; }
  set level(v: Raw) { this.m_Level = toNumber(v); this.broadcastMessage("onSetLevel", v); }
  get XP(): number | undefined { return this.m_XP; }
  set XP(v: Raw) { this.m_XP = toNumber(v); this.broadcastMessage("onSetXP", v); }
  get LP(): number | undefined { return this.m_LP; }
  set LP(v: Raw) { this.m_LP = toNumber(v); this.broadcastMessage("onSetLP", v, this.LPmax); }
  get AP(): number | undefined { return this.m_AP; }
  set AP(v: Raw) { this.m_AP = toNumber(v); this.broadcastMessage("onSetAP", v); }
  get GP(): number | undefined { return this.m_GP; }
  set GP(v: Raw) { this.m_GP = toNumber(v); this.broadcastMessage("onSetGP", v); }
  get force(): number | undefined { return this.m_Force; }
  set force(v: Raw) { this.m_Force = toNumber(v); this.broadcastMessage("onSetForce", v); }
  get vitality(): number | undefined { return this.m_Vitality; }
  set vitality(v: Raw) { this.m_Vitality = toNumber(v); this.broadcastMessage("onSetVitality", v); }
  get rFire(): number | undefined { return this.m_rFire; }
  set rFire(v: Raw) { this.m_rFire = toNumber(v); this.broadcastMessage("onSetFire", v); }
  get rAir(): number | undefined { return this.m_rAir; }
  set rAir(v: Raw) { this.m_rAir = toNumber(v); this.broadcastMessage("onSetAir", v); }
  get rWater(): number | undefined { return this.m_rWater; }
  set rWater(v: Raw) { this.m_rWater = toNumber(v); this.broadcastMessage("onSetWater", v); }
  get rEarth(): number | undefined { return this.m_rEarth; }
  set rEarth(v: Raw) { this.m_rEarth = toNumber(v); this.broadcastMessage("onSetEarth", v); }
  get charism(): number | undefined { return this.m_Charism; }
  set charism(v: Raw) { this.m_Charism = toNumber(v); this.broadcastMessage("onSetCharism", v); }
  get karma(): number | undefined { return this.m_Karma; }
  set karma(v: Raw) { this.m_Karma = toNumber(v); this.broadcastMessage("onSetKarma", v); }
  get agility(): number | undefined { return this.m_Agility; }
  set agility(v: Raw) { this.m_Agility = toNumber(v); this.broadcastMessage("onSetAgility", v); }
  get intelligence(): number | undefined { return this.m_Intelligence; }
  set intelligence(v: Raw) { this.m_Intelligence = toNumber(v); this.broadcastMessage("onSetIntelligence", v); }
  get bonusPoints(): number | undefined { return this.m_BonusPoints; }
  set bonusPoints(v: Raw) { this.m_BonusPoints = toNumber(v); this.broadcastMessage("onSetBonus", v); }

  /** Character.as:192-196 */
  get file(): string { return CLIPS_PERSOS_PATH + str(this.gfxID) + ".swf"; }
  /** Character.as:197-201 */
  get guildName(): string | null | undefined { return GUILD_NAMES[Number(this.guild)]; }
  /** Character.as:202-206 */
  get isDied(): boolean { return this.bDied; }

  /** Character.as:207-211 */
  updateLP(dLP: Raw): void {
    this.LP = toNumber(this.LP) + toNumber(dLP);
    this.clip?.showPoints?.("life", toNumber(dLP));
  }

  /** Character.as:212-217 (passes an undefined `dLP` to showPoints, as the AS does). */
  initLP(): void {
    this.LP = this.LPmax;
    this.clip?.showPoints?.("life", undefined);
  }

  /**
   * Character.as:218-234, data part. The AS then calls INTERFACE.messageNextTurn() when this is the local
   * player and Player.noMoreAP — UI, left to the caller.
   */
  updateAP(dAP: Raw): void {
    this.AP = toNumber(this.AP) + toNumber(dAP);
    this.clip?.showPoints?.("action", dAP);
  }

  /** Character.as:235-253 — AP = APinit (+ moderator of effect type 1 unless bWithModerator === false). */
  initAP(bWithModerator: boolean = true): void {
    this.AP = bWithModerator
      ? toNumber(this.APinit) + toNumber(this.EffectsManager.getModeratorValue(1))
      : toNumber(this.APinit);
  }

  /** Character.as:254-257 — `this[key] += Number(value)`. */
  update(key: "level" | "XP" | "LP" | "AP" | "GP" | "force" | "vitality" | "rFire" | "rAir" | "rWater" | "rEarth" | "charism" | "karma" | "agility" | "intelligence" | "bonusPoints", value: Raw): void {
    this[key] = toNumber(this[key]) + toNumber(value);
  }

  getEffects() {
    return this.EffectsManager.getEffects();
  }
}
