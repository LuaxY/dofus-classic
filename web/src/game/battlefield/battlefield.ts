// AKSClient/Dofus.BattleField.as — `Dofus::BattleField`, attached as `bf` (depth 2) by Kernel.Init
// (`this.attachMovie("Dofus::BattleField","bf",2)`, Dofus.Kernel.Init.as:64) from AKSClient's library; the
// constructor publishes `_global.BATTLEFIELD`. Importing this module runs every battlefield `registerClass` (the
// AS #initclip blocks) and declares BATTLEFIELD / CCOLORS / WEAPONS on Globals. Kernel.Init (owner C) creates
// `G.CCOLORS = new CharactersColors()` and `G.WEAPONS = new CharactersWeapons()` (Dofus.Kernel.Init.as:66-67).
import { MovieClip, registerClass } from "../../runtime/player.ts";
import { toNumber } from "../../core/swf6.ts";
import { G } from "../globals.ts";
import type { BattleFieldCharacters } from "./characters.ts";
import type { CharactersColors, CharactersWeapons } from "./colorsWeapons.ts";
import type { BattleFieldContainer } from "./container.ts";
import type { BattleFieldEffects } from "./effects.ts";
import type { BattlefieldInteraction } from "./interaction.ts";
import type { BattleFieldMap } from "./map.ts";
import type { BattleFieldObjects } from "./objects.ts";
import type { BattlefieldPointer } from "./pointer.ts";
import type { BattlefieldSelection } from "./selection.ts";
import type { BattleFieldSpells } from "./spells.ts";
import { deps } from "./deps.ts";
import "./characters.ts";
import "./container.ts";
import "./dialogBubble.ts";
import "./effects.ts";
import "./interaction.ts";
import "./map.ts";
import "./objects.ts";
import "./pointer.ts";
import "./selection.ts";
import "./spells.ts";

declare module "../globals.ts" {
  interface Globals {
    BATTLEFIELD: BattleField;
    CCOLORS: CharactersColors;
    WEAPONS: CharactersWeapons;
  }
}

export class BattleField extends MovieClip {
  declare Container: BattleFieldContainer;
  declare Objects: BattleFieldObjects;
  declare Map: BattleFieldMap;
  declare Selection: BattlefieldSelection;
  declare Pointer: BattlefieldPointer;
  declare Characters: BattleFieldCharacters;
  declare Spells: BattleFieldSpells;
  declare Effects: BattleFieldEffects;
  declare Interaction: BattlefieldInteraction;
  declare MaskClip?: MovieClip;

  constructor() {
    super();
    G.BATTLEFIELD = this;
    this.init();
  }

  /** BattleField.as:8-20 — each child's constructor reads the siblings attached before it. */
  init(): void {
    this.attachMovie("Dofus::BattleField::Container", "Container", 100);
    this.attachMovie("Dofus::BattleField::Objects", "Objects", 200);
    this.attachMovie("Dofus::BattleField::Map", "Map", 300);
    this.attachMovie("Dofus::BattleField::Selection", "Selection", 400);
    this.attachMovie("Dofus::BattleField::Pointer", "Pointer", 500);
    this.attachMovie("Dofus::BattleField::Characters", "Characters", 600);
    this.attachMovie("Dofus::BattleField::Spells", "Spells", 700);
    this.attachMovie("Dofus::BattleField::Effects", "Effects", 800);
    this.attachMovie("Dofus::BattleField::Interaction", "Interaction", 900);
  }

  /** BattleField.as:21-28 */
  clear(): void {
    this.Characters.clearAll();
    this.Objects.clearAll();
    this.Container.clear();
    this.Interaction.init();
  }

  /** BattleField.as:29-39 — no caller; `maskRond` is not exported by AKSClient, so the attach gives nothing. */
  setRoundMask(_ray: number, cell: number): void {
    if (!this.MaskClip) {
      this.attachMovie("maskRond", "MaskClip", 1100);
      this.Container.setMask(this.MaskClip);
    }
    const c = deps.DATACENTER.Map.data[cell];
    if (this.MaskClip) {
      this.MaskClip._x = toNumber(c?.x);
      this.MaskClip._y = toNumber(c?.y);
    }
  }
}
registerClass("Dofus::BattleField", BattleField);
