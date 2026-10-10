// AKSClient/Dofus.Kernel.as (Class_Kernel, `_global.KERNEL`): boot of the modules, lang and login, map drawing,
// the player banner, spell/close-combat targeting, turn cleanup and the quit/disconnect/give-up dialogs.
// Also builds KERNEL.PathFinding / Compressor / CharactersManager as adapters over web/src/core (the AS objects
// read DATACENTER and BATTLEFIELD globals; the core ports take them as arguments).
import { CELL_SPELL_EFFECT_COLOR, CELL_SPELL_RANGE_COLOR, ERROR_CHAT_COLOR, MODULE_PATH, SERVER_NAME, SERVER_PORT } from "../../core/constants.ts";
import * as Cmp from "../../core/compressor.ts";
import type { PathStep } from "../../core/compressor.ts";
import type { Character } from "../../core/datacenter/character.ts";
import { clearAllOthersCharacters, createCharacter, type CharacterInit } from "../../core/datacenter/charactersManager.ts";
import { Effect } from "../../core/datacenter/effect.ts";
import { getItemObjectFromData } from "../../core/datacenter/item.ts";
import type { CCData } from "../../core/datacenter/player.ts";
import { getSpellObjectFromData, type Spell } from "../../core/datacenter/spell.ts";
import { getText, type LangData, setLangData } from "../../core/lang.ts";
import { PathFinding } from "../../core/pathfinding.ts";
import { Mouse, type MovieClip, player } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { Class_InterfaceBanner } from "../ui/screens/banner.ts";
import { GameActionsManager } from "./gameActionsManager.ts";
import { KeyListener } from "./keyListener.ts";
import { Sequencer } from "./sequencer.ts";

declare module "../globals.ts" {
  interface Globals {
    KERNEL: Kernel;
  }
}

declare module "../../core/datacenter/character.ts" {
  interface Character {
    /** Dofus.DataCenter.Character.as:25-27 (attached by KERNEL.CharactersManager.createCharacter). */
    SEQUENCER_anim: Sequencer;
    SEQUENCER_actions: Sequencer;
    GameActionsManager: GameActionsManager;
  }
}

/** `INTERFACE.UIInterfaceBanner` (set by `INTERFACE.draw("Interface::Banner")`, typed by its owner's class). */
export const banner = (): Class_InterfaceBanner | undefined => G.INTERFACE?.UIInterfaceBanner as Class_InterfaceBanner | undefined;

/**
 * Port of the missing lang SWF's contract (`checkLanguage` → fill the lang store → `KERNEL.onLangOK()`,
 * docs/logic/missing-content.md #1): `load` fetches web/public/lang/fr.json (agent D). A missing file boots with
 * no texts rather than blocking.
 */
export const langSource = {
  load: async (): Promise<LangData> => (await fetch("/lang/fr.json")).json(),
};

/** The renderer clip of a character as Kernel uses it (BattleField.Characters.Character, owner A). */
type CharClip = { getCellNum(): number; setAnim?(anim: string): void };

/** KERNEL.CharactersManager: Dofus.CharactersManager.as (data half in core/datacenter/charactersManager.ts). */
export class CharactersManager {
  /** :5-17 */
  clearAllOthersCharacters(): void {
    clearAllOthersCharacters(G.DATACENTER);
  }
  /** :18-160 — plus what core leaves out: the Character's sequencers and actions manager, and `GameActionsManager.init()`. */
  createCharacter(i: string | number | undefined, name: string | undefined, ca: CharacterInit): Character {
    const c = createCharacter(G.DATACENTER, i as string | number, name, ca);
    if (!c.GameActionsManager) {
      c.SEQUENCER_anim = new Sequencer();
      c.SEQUENCER_actions = new Sequencer();
      c.GameActionsManager = new GameActionsManager(c);
    }
    c.GameActionsManager.init();
    return c;
  }
  /** :161-165 */
  createNewCharacter(): void {
    G.INTERFACE.clear();
    G.INTERFACE.draw("dofus::graphics::gui::UICreateCharacter", 1);
  }
  getSpellObjectFromData(data: string): Spell {
    return getSpellObjectFromData(data);
  }
  getItemObjectFromData(data: string) {
    return getItemObjectFromData(data);
  }
}

/** KERNEL.Compressor: Dofus.Compressor.as with DATACENTER.Map as the implicit map. */
export const Compressor = {
  /** :19-76 — DATACENTER.Map is replaced. */
  uncompressMap(mapId: number, name: string | undefined, width: string | number | undefined, height: string | number | undefined, bRolePlay: boolean, backgroundNum: string | number | undefined, data: string | undefined): void {
    G.DATACENTER.Map = Cmp.uncompressMap(mapId, name, width ?? 0, height ?? 0, bRolePlay, backgroundNum ?? "", data ?? "");
  },
  uncompressCell: (cellNum: number, data: string, mask: string): void => Cmp.uncompressCell(G.DATACENTER.Map, cellNum, data, mask),
  decode64: Cmp.decode64,
  compressPath: (path: readonly PathStep[] | null | undefined): string | undefined => Cmp.compressPath(path),
  extractFullPath: (data: string | undefined): number[] => Cmp.extractFullPath(data ?? "", G.DATACENTER.Map.width),
  makeFullPath: (light: readonly number[]): number[] => Cmp.makeFullPath(light, G.DATACENTER.Map.width),
};

export class Kernel {
  declare PathFinding: PathFinding;
  declare Compressor: typeof Compressor;
  declare KeyListener: KeyListener;
  declare CharactersManager: CharactersManager;
  m_LoadVars: unknown;

  constructor() {
    this.init();
  }

  /** :5-27 */
  init(): void {
    const DOFUS = G.DOFUS;
    DOFUS.createEmptyMovieClip("debug", 9999999);
    // BATTLEFIELD does not exist yet (Kernel.Init.as:62 runs before :64): Selection is looked up per call.
    this.PathFinding = new PathFinding(G.DATACENTER, {
      unSelectAll: () => G.BATTLEFIELD.Selection.unSelectAll(),
      select: (cell, bool, size, color) => G.BATTLEFIELD.Selection.select(cell, bool, size, color),
    });
    this.Compressor = Compressor;
    this.KeyListener = new KeyListener();
    this.CharactersManager = new CharactersManager();
    const interfaces = DOFUS.createEmptyMovieClip("Interfaces", 3);
    interfaces.loadMovie(MODULE_PATH + "Interfaces.swf");
    interfaces.onInitFrame = () => {
      DOFUS.createEmptyMovieClip("lang", 5000);
      // System.security.allowDomain(SITE_PATH): no-op. `DOFUS.lang.loadMovie(HTTP_LANG_PATH)` + `checkLanguage`:
      checkLanguage("fr", G.SHARED_OBJECT, G.INTERFACE, this);
    };
    DOFUS.createEmptyMovieClip("SoundManager", 4).loadMovie(MODULE_PATH + "Sound.swf");
  }

  /**
   * :28-55. `getuser.php` (auto-login from the web session, docs/logic/missing-content.md #2) does not exist: the
   * LoadVars always fails, i.e. the login interface is drawn.
   */
  onLangOK(): void {
    G.INTERFACE.hideProgressBar();
    G.INTERFACE.drawLoginInterface();
  }

  /** :56-62 */
  drawCurrentMap(): void {
    G.DOFUS.t = player.time;
    G.BATTLEFIELD.clear();
    G.BATTLEFIELD.Container._visible = false;
    G.BATTLEFIELD.Map.build(G.DATACENTER.Map);
  }

  /** :63-66 */
  ExecuteAnim(cell: string | undefined, state: string | undefined): void {
    const o = G.BATTLEFIELD.Objects.list?.["object" + cell] as { setAnim?(s: string): void } | undefined;
    o?.setAnim?.("state" + state);
  }

  /** :67-77 — the third argument (same line) is ignored. */
  traceToChat(txt: string | undefined, color: string, _bSameLine?: unknown): void {
    if (G.AKS.Chat.output == undefined) G.log(txt, true);
    else G.CHAT.addText(txt, color);
  }

  /** :78-98 */
  drawPlayerInterface(): void {
    G.INTERFACE.removeAllListener();
    const b = G.INTERFACE.draw("Interface::Banner", 200) as Class_InterfaceBanner | undefined;
    if (!b) return;
    b.onAddUsedSpell = function (this: Class_InterfaceBanner, oldPosition: unknown, spellData: Spell) {
      if (oldPosition) {
        ((this.banner?.["us" + oldPosition] as MovieClip | undefined)?.container as { setItem?(v: null): void } | undefined)?.setItem?.(null);
        G.DATACENTER.Player.SpellsUsed.deleteItemAt(Number(oldPosition));
      }
      G.DATACENTER.Player.SpellsUsed.setItemAt(Number(spellData.m_Position), spellData);
      G.AKS.Spells.moveToUsed(spellData.m_ID, spellData.m_Position);
    };
    b.onWantBootSpell = (spellData: Spell) => G.AKS.Spells.getInfos(spellData.m_ID);
  }

  /** :99-102 (`drawTeamWacher` sic; no caller — onPositionStart calls INTERFACE.drawTeamWatcher directly). */
  drawTeamWacher(team0: unknown, team1: unknown): void {
    G.INTERFACE.drawTeamWatcher(team0, team1);
  }

  /** :103-112 */
  changeToMultiplayer(): void {
    G.DATACENTER.Player.data?.initAP();
    G.DATACENTER.Player.data?.initLP();
    G.BATTLEFIELD.Container._visible = false;
    G.BATTLEFIELD.clear();
    G.INTERFACE.clear();
    G.INTERFACE.draw("Interface::MultiPlayer", 1);
    G.SOMA?.onEnterMulti();
  }

  /** :113-186 — enter spell targeting (range drawn around the player, cursor = spell icon). */
  switchToSpellLaunch(spellData: Spell): void {
    const DC = G.DATACENTER, BF = G.BATTLEFIELD;
    if (!DC.Game.isFight || DC.Player.data?.GameActionsManager.isWaiting()) return;
    if (!DC.Player.hasEnoughAP(spellData.m_APCost)) return this.traceToChat(getText("NOT_ENOUGH_AP"), ERROR_CHAT_COLOR);
    if (!DC.Player.SpellsManager.checkCanLaunchSpell(spellData.m_ID, undefined)) {
      if (BF.Interaction.errorMessage != undefined) {
        this.traceToChat(BF.Interaction.errorMessage, ERROR_CHAT_COLOR);
        delete BF.Interaction.errorMessage;
      }
      return;
    }
    BF.Selection.unSelectAll();
    DC.Player.currentSpell = spellData;
    BF.Pointer.clearAll();
    const zones = spellData.m_EffectZones ?? [];
    const cell = (DC.Player.clip as CharClip | null | undefined)?.getCellNum() as number; // undefined passes through, as in the AS
    if (spellData.m_Range != 63) {
      let range = Number(spellData.m_Range) + Number(DC.Player.data?.EffectsManager.getModeratorValue(19));
      if (range < 0) range = 0;
      for (const z of zones) BF.Pointer.addShape(z.shape, z.size, CELL_SPELL_EFFECT_COLOR);
      if (spellData.m_bLineOnly) BF.Pointer.drawFixedCross(range, CELL_SPELL_RANGE_COLOR, cell);
      else BF.Pointer.drawFixedCircle(range, CELL_SPELL_RANGE_COLOR, cell);
    } else BF.Pointer.drawFixedRect(CELL_SPELL_RANGE_COLOR);
    BF.Interaction.setType("spell");
    this.armTargeting(G.INTERFACE.setCursor(spellData.iconFile));
  }

  /** :187-229 — close-combat targeting (area "C" 0, range 1). */
  switchToCC(CCData: CCData): void {
    const DC = G.DATACENTER, BF = G.BATTLEFIELD;
    if (!BF.Interaction.isEnable() || !DC.Game.isFight || DC.Player.data?.GameActionsManager.isWaiting()) return;
    if (!DC.Player.hasEnoughAP(CCData.m_APCost)) return this.traceToChat(getText("NOT_ENOUGH_AP"), ERROR_CHAT_COLOR);
    BF.Selection.unSelectAll();
    DC.Player.currentSpell = CCData as CCData & { m_bOnItSelf: boolean };
    BF.Pointer.clearAll();
    BF.Pointer.addShape("C", 0, CELL_SPELL_EFFECT_COLOR);
    BF.Pointer.drawFixedCircle(1, CELL_SPELL_RANGE_COLOR, (DC.Player.clip as CharClip | null | undefined)?.getCellNum() as number);
    BF.Interaction.setType("cc");
    this.armTargeting(G.INTERFACE.setCursor(CCData.iconFile));
  }

  /** Shared tail of :168-182 / :210-224: clearing the cursor clears the pointer; the next mouse-up returns to "move". */
  private armTargeting(c: MovieClip | undefined): void {
    const BF = G.BATTLEFIELD;
    if (c) {
      c.onClearCursor = function (this: MovieClip) {
        G.BATTLEFIELD.Pointer.clearAll();
        delete this.onClearCursor;
      };
    }
    const i = BF.Interaction;
    i.onMouseUp = () => {
      i.setType("move");
      delete i.onMouseUp;
      Mouse.removeListener(i);
    };
    Mouse.addListener(i);
    this.forceOver();
  }

  /** :230-242 */
  cleanUpGameArea(bkeepSelection?: boolean): void {
    G.INTERFACE.setCursor(null);
    G.INTERFACE.setSpellCursor(null);
    if (bkeepSelection) G.BATTLEFIELD.Selection.unSelectAll();
    G.BATTLEFIELD.Pointer.clearAll();
    G.DATACENTER.Player.currentSpell = null;
    G.BATTLEFIELD.Interaction.setType("move");
    this.PathFinding.setInitState(G.DATACENTER.Game.isFight);
  }

  /** :243-258 — end of a character's turn: effects tick, AP refill, actions manager reset. */
  cleanPlayer(characID: unknown): void {
    if (characID == G.DATACENTER.Game.currentPlayerID) return;
    const c = G.DATACENTER.Characters.getItemAt(characID as string);
    if (!c) return; // AS: every member of undefined is a no-op
    c.EffectsManager.nextTurn();
    c.initAP();
    c.GameActionsManager.init();
    if (characID == G.DATACENTER.Player.ID) G.INTERFACE.hideMessageNextTurn();
  }

  /** :259-265 */
  setEnabledInteractionIfICan(state: number): void {
    if (G.DATACENTER.Player.isCurrentPlayer) G.BATTLEFIELD.Interaction.setEnabled(state);
  }

  /** :266-269 — `clipOver` (button 123 removes itself on roll over/out) forces a fresh rollOver below the mouse. */
  forceOver(): void {
    const D = G.DOFUS;
    D.attachMovie("clipOver", "clipOver", 10, { _x: D._xmouse, _y: D._ymouse });
  }

  /** :270-284 (no caller). `iDied` (sic) is never set, so every character is animated. */
  animAllCharacters(anim: string): void {
    for (const k of Object.keys(G.DATACENTER.Characters.keys)) {
      const c = G.DATACENTER.Characters.getItemAt(k) as (Character & { iDied?: boolean }) | undefined;
      if (!c?.iDied) (c?.clip as CharClip | null | undefined)?.setAnim?.(anim);
    }
  }

  /** :285-293 — an effect on someone else loses its first turn. */
  addToEffectsManager(characData: Character, type: number, value: unknown, turnCount: unknown, bOnItSelf: boolean): void {
    const e = new Effect();
    e.type = type;
    e.value = value;
    e.remainingTurn = !bOnItSelf ? Number(turnCount) - 1 : (turnCount as number | string);
    characData.EffectsManager.addEffect(e);
  }

  /** :294-303 — reconnect and skip the start menu. */
  quit(): void {
    G.INTERFACE.onQuestionBoxYes = () => {
      G.AKS.disconnect(true);
      G.AKS.m_bSkipMenu = true;
      G.AKS.connect(SERVER_NAME, SERVER_PORT);
    };
    G.INTERFACE.questionBox(getText("DO_U_QUIT"));
  }

  /** :304-311 */
  disconnect(): void {
    G.INTERFACE.onQuestionBoxYes = () => G.AKS.disconnect();
    G.INTERFACE.questionBox(getText("DO_U_DISCONNECT"));
  }

  showSoundOptions(): void {
    G.INTERFACE.optionsBox();
  }
  showMenu(): void {
    G.INTERFACE.menuBox();
  }

  /** :320-328 */
  giveUpGame(): void {
    G.INTERFACE.onQuestionBoxYes = () => {
      G.AKS.Game.leave();
      G.KERNEL.changeToMultiplayer();
    };
    G.INTERFACE.questionBox(getText("DO_U_GIVEUP"));
  }
}

/** The lang SWF's `checkLanguage(lang, so, iface, kernel)` (missing-content.md #1), on core/lang.ts. */
function checkLanguage(_lang: string, _so: unknown, _iface: unknown, kernel: Kernel): void {
  langSource
    .load()
    .catch((e: unknown) => (console.warn("lang: " + (e as Error).message), {}))
    .then((data) => player.dispatch(() => (setLangData(data), kernel.onLangOK())));
}
