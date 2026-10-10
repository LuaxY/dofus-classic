// AKSClient/Dofus.Kernel.Init.as (`#initclip` 91) and Dofus.Kernel.Start.as (`#initclip` 90): the `_global`
// constants, singletons and lang helpers. `kernelInit` must run after the battlefield classes are registered
// (boot.ts imports them) and before the Events install (events.ts), as in the SWF's tag order.
import * as C from "../../core/constants.ts";
import { DataCenter } from "../../core/datacenter/index.ts";
import {
  getCCText, getGuildText, getItemEffectText, getItemSuperTypeText, getItemTypeText, getMapText, getSpellText, getText,
} from "../../core/lang.ts";
import { str } from "../../core/swf6.ts";
import { type MovieClip, player, SharedObject, Stage } from "../../runtime/player.ts";
import { CharactersColors, CharactersWeapons } from "../battlefield/colorsWeapons.ts";
import { G } from "../globals.ts";
import { Extensions } from "./ank.ts";
import { Chat } from "./chat.ts";
import { Client } from "./client.ts";
import { Kernel } from "./kernel.ts";
import { SpellsManager } from "./spellsManager.ts";

declare module "../../core/datacenter/player.ts" {
  interface Player {
    /** Dofus.DataCenter.Player.as:26 `new Class_SpellsManager(this)` (attached by KernelDataCenter.init). */
    SpellsManager: SpellsManager;
  }
}

declare module "../globals.ts" {
  interface Globals {
    DOFUS: MovieClip;
    DATACENTER: KernelDataCenter;
    SHARED_OBJECT: { data: Record<string, unknown>; flush(): boolean };
    MUSIC_PATH: string;
    log: typeof log;
    getText: typeof getText;
  }
}

/** Dofus.DataCenter.as with the Player's SpellsManager, which core/datacenter leaves to this phase. */
export class KernelDataCenter extends DataCenter {
  override init(login?: string, password?: string): void {
    super.init(login, password);
    this.Player.SpellsManager = new SpellsManager(this.Player);
  }
}

/**
 * Init.as:68-79. `trace` → console.debug. ponytail: the `DOFUS.debug.log` buffer keeps its last 4000 chars (the AS
 * grows forever; only the last 2000 are ever read, by the bug-report button DefineButton2_933).
 */
export function log(txt: unknown, red?: boolean): void {
  const t = str(txt);
  if (red == true) console.debug(t);
  else if (t.length < 800) {
    const d = G.DOFUS?.debug as MovieClip | undefined;
    if (d) d.log = (str(d.log) + t + "\n").slice(-4000);
  }
}

/**
 * Init.as:1-67 + Kernel.Start.as. `this` of the init action is `_root`. Port deviations: MUSIC_PATH points at the
 * served copy of the beta 3b music pack (scripts/copy-music.ts) instead of "music/" next to the SWF.
 */
export function kernelInit(): void {
  const root = player.root;
  G.DOFUS = root; // :1
  Stage.scaleMode = "noScale"; // :2
  root._quality = "HIGH"; // :3
  const { Constants: _as2Constants, ...constants } = C; // dofus.Constants is the AS2 class, not a _global
  Object.assign(G, constants, { MUSIC_PATH: "/assets/media/music/" }); // :4-59 (core/constants.ts)
  G.AKS = new Client(); // :60
  G.DATACENTER = new KernelDataCenter(); // :61
  G.KERNEL = new Kernel(); // :62
  G.CHAT = new Chat(); // :63
  root.attachMovie("Dofus::BattleField", "bf", 2); // :64 — the constructor sets _global.BATTLEFIELD
  G.SHARED_OBJECT = SharedObject.getLocal("DofusSO"); // :65
  G.CCOLORS = new CharactersColors(); // :66
  G.WEAPONS = new CharactersWeapons(); // :67
  // :68-155 — lang lookups read core/lang.ts data (filled from /lang/fr.json by kernel.ts checkLanguage)
  Object.assign(G, { log, getText, getSpellText, getCCText, getMapText, getGuildText, getItemTypeText, getItemSuperTypeText, getItemEffectText });
}

/** Dofus.Kernel.Start.as:1-6 */
export function kernelStart(): void {
  if (C.DEBUG_MODE) {
    G.DATACENTER.Player.login = "bo";
    G.DATACENTER.Player.password = "pass";
  }
  Extensions.addExtensions();
}
