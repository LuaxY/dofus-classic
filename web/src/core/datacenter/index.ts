// Port of Dofus.DataCenter.as (Class_DataCenter, `_global.DATACENTER`). Map starts as an empty MapData
// (the AS starts it as an empty DataProvider and replaces it in Compressor.uncompressMap).
import type { MapData } from "../compressor.ts";
import type { Character } from "./character.ts";
import { DofusDataProvider } from "./dataProvider.ts";
import { Channel, Game } from "./game.ts";
import { Player } from "./player.ts";

export const emptyMap = (): MapData => ({ id: 0, name: undefined, width: 0, height: 0, bRolePlay: false, backgroundNum: 0, data: [] });

export class DataCenter {
  Player!: Player;
  Clips!: DofusDataProvider<object>;
  Game!: Game;
  Channel!: Channel;
  Characters!: DofusDataProvider<Character>;
  Map!: MapData;
  Objects!: DofusDataProvider<object>;
  Spells!: DofusDataProvider<object>;

  constructor() {
    this.init();
  }

  /** DataCenter.as:8-19 */
  init(login?: string, password?: string): void {
    this.Player = new Player(this, login, password);
    this.Clips = new DofusDataProvider();
    this.Game = new Game();
    this.Channel = new Channel();
    this.Characters = new DofusDataProvider();
    this.Map = emptyMap();
    this.Objects = new DofusDataProvider();
    this.Spells = new DofusDataProvider();
  }

  /** DataCenter.as:20-31 — same as init but keeps the player's login/password. */
  clear(): void {
    this.init(this.Player.login, this.Player.password);
  }
}

export { Character, Broadcaster } from "./character.ts";
export { clearAllOthersCharacters, createCharacter, type CharacterInit } from "./charactersManager.ts";
export { DofusDataProvider } from "./dataProvider.ts";
export { Effect } from "./effect.ts";
export { EffectsManager } from "./effectsManager.ts";
export { Channel, Game } from "./game.ts";
export { Item, getItemObjectFromData } from "./item.ts";
export { Player } from "./player.ts";
export { Spell, getSpellObjectFromData } from "./spell.ts";
export { SpellLaunch } from "./spellLaunch.ts";
