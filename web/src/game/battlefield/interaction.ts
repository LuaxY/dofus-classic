// AKSClient/Dofus.Cell.as (`Dofus::Cell`), AKSClient/Dofus.BattleField.Interaction.as (`Dofus::BattleField::Interaction`,
// BATTLEFIELD.Interaction, depth 900) and AKSClient/Events.Battlefield.Interaction.as (onCellRelease / onCellRollOver /
// onCellRollOut, assigned onto BATTLEFIELD.Interaction in the AS). docs/logic/battlefield.md §3, pathfinding.md §3,
// fight.md §3. Cell handlers are installed on `Cell.prototype` (one global switch shared by every cell); character
// and object sprites forward their events only while `Cell.prototype.onRelease` exists.
import { compressPath } from "../../core/compressor.ts";
import { CLICK_MINIMUM_TIMER, ERROR_CHAT_COLOR } from "../../core/constants.ts";
import type { Player, Spell } from "../../core/datacenter/index.ts";
import { convertCoordToxy } from "../../core/pathfinding.ts";
import { getTimer, Mouse, MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldCharacter } from "./characters.ts";
import type { BattleFieldContainer } from "./container.ts";
import { deps, type CharacterData, type PlayerSpellsManager } from "./deps.ts";
import type { BattleFieldMap } from "./map.ts";

/** Dofus.Cell.as — empty MovieClip subclass; `num` is set by addCell. */
export class Cell extends MovieClip {
  declare num: number;
}
registerClass("Dofus::Cell", Cell);

type CellHandler = (this: Cell) => void;
const player = () => deps.DATACENTER.Player as Player & { SpellsManager?: PlayerSpellsManager };
const playerData = () => player().data as CharacterData | undefined;
const playerClip = () => player().clip as BattleFieldCharacter | null | undefined;

export class BattlefieldInteraction extends MovieClip {
  declare STATE_NONE: number;
  declare STATE_RELEASE: number;
  declare STATE_OVER_OUT: number;
  declare STATE_RELEASE_OVER_OUT: number;
  declare type: number | undefined;
  declare allTypes: Record<string, number>;
  declare container: BattleFieldContainer;
  declare map: BattleFieldMap;
  declare lastActionTime: number;
  declare canLaunchSpell: boolean | undefined;
  declare errorMessage: string | undefined;
  declare currentState: number;
  declare bEnable: boolean;
  /** One-shot Mouse listener set by KERNEL.switchToSpellLaunch/switchToCC (Dofus.Kernel.as:174,216) and onCellRollOut. */
  declare onMouseUp?: () => void;
  /** Called by onPressFct but defined nowhere in the code (and onPressFct is never installed): dead. */
  declare onCellPress?: (cellNum: number) => void;

  constructor() {
    super();
    this.STATE_NONE = 0;
    this.STATE_RELEASE = 1;
    this.STATE_OVER_OUT = 2;
    this.STATE_RELEASE_OVER_OUT = 3;
    this.init();
  }

  /** Interaction.as:12-23 */
  init(): void {
    this.type = 1;
    this.allTypes = { move: 1, spell: 2, cc: 3, place: 4 };
    this.container = G.BATTLEFIELD.Container;
    this.map = G.BATTLEFIELD.Map;
    this.lastActionTime = 0;
    this.canLaunchSpell = false;
    this.errorMessage = undefined;
    this.currentState = this.STATE_NONE;
  }

  /** Interaction.as:24-28 — AS bug kept: passes `groundFrame`, a field no cell has (undefined → gotoAndStop no-op, stopped on frame 1). */
  addCellNum(cellNum: number, layerID: number): void {
    const d = this.map.getData(cellNum) as { x?: number; y?: number; groundFrame?: number } | undefined;
    this.addCell(cellNum, d?.x as number, d?.y as number, layerID, d?.groundFrame);
  }

  /** Interaction.as:29-43 */
  addCell(cellNum: number, cell_x: number, cell_y: number, layerID: number, groundFrame?: unknown): void {
    const layer = this.container.Interaction["layer" + layerID] as MovieClip | undefined;
    const c = layer?.attachMovie("Dofus::Cell", "cell" + cellNum, cellNum) as Cell | undefined;
    if (!c) return;
    c._xscale = c._yscale = 105;
    c._x = cell_x;
    c._y = cell_y;
    if (groundFrame != 1) c.gotoAndStop(groundFrame as number);
    c.num = cellNum;
  }

  /** Interaction.as:44-47 */
  delCell(cellNum: number, layerID: number): void {
    ((this.container.Interaction["layer" + layerID] as MovieClip | undefined)?.["cell" + cellNum] as MovieClip | undefined)?.removeMovieClip();
  }

  // Interaction.as:48-68 — installed on Cell.prototype, `this` is the cell.
  onPressFct(this: Cell): void {
    G.BATTLEFIELD.Interaction.onCellPress?.(this.num);
  }
  onReleaseFct(this: Cell): void {
    G.BATTLEFIELD.Interaction.onCellRelease(this.num);
  }
  onRollOverFct(this: Cell): void {
    G.BATTLEFIELD.Interaction.onCellRollOver(this.num);
  }
  onRollOutFct(this: Cell): void {
    G.BATTLEFIELD.Interaction.onCellRollOut(this.num);
  }
  onReleaseOutsideFct(this: Cell): void {
    G.BATTLEFIELD.Interaction.onCellRelease(this.num);
    G.BATTLEFIELD.Interaction.onCellRollOut(this.num);
  }

  /** Interaction.as:69-72 */
  setLayerVisible(bool: boolean, layerID: number): void {
    const layer = this.container.Interaction["layer" + layerID] as MovieClip | undefined;
    if (layer) layer._visible = bool;
  }

  /** Interaction.as:73-86 — banner panels (modules_Interfaces/Interface.Banner.as:85,118). */
  hideInteractions(bool: boolean): void {
    delete this.onMouseUp;
    Mouse.removeListener(this);
    if (bool) this.setEnabledAll(false);
    else this.setEnabled(this.currentState);
  }

  /** Interaction.as:87-111 */
  setEnabled(state: number): void {
    this.currentState = state;
    switch (state) {
      case this.STATE_RELEASE:
        this.setEnabledRelease(true);
        this.setEnabledOverOut(false);
        return;
      case this.STATE_OVER_OUT:
        this.setEnabledRelease(false);
        this.setEnabledOverOut(true);
        return;
      case this.STATE_RELEASE_OVER_OUT:
        this.setEnabledAll(true);
        return;
      default: // STATE_NONE and unknown
        this.setEnabledAll(false);
    }
  }

  /** Interaction.as:112-128 */
  setEnabledAll(bool: boolean): void {
    this.bEnable = bool;
    this.setHandlers(bool, ["onRelease", this.onReleaseFct], ["onRollOver", this.onRollOverFct], ["onRollOut", this.onRollOutFct]);
  }

  /** Interaction.as:129-141 */
  setEnabledOverOut(bool: boolean): void {
    this.setHandlers(bool, ["onRollOver", this.onRollOverFct], ["onRollOut", this.onRollOutFct]);
  }

  /** Interaction.as:142-153 */
  setEnabledRelease(bool: boolean): void {
    this.bEnable = bool;
    this.setHandlers(bool, ["onRelease", this.onReleaseFct]);
  }

  private setHandlers(bool: boolean, ...pairs: [string, CellHandler][]): void {
    const proto = Cell.prototype as unknown as Record<string, unknown>;
    for (const [k, f] of pairs) bool ? (proto[k] = f) : delete proto[k];
  }

  /** Interaction.as:154-157 — last value given to setEnabledAll / setEnabledRelease. */
  isEnable(): boolean {
    return this.bEnable;
  }

  /** Interaction.as:158-161 — an unknown name gives undefined (no case matches). */
  setType(type: string): void {
    this.type = this.allTypes[type];
  }

  /** Interaction.as:162-165 */
  getType(): number | undefined {
    return this.type;
  }

  /** Interaction.as:166-190 — no caller. `cellNum` is `cellnum` (SWF 6); `celly = width * j / ray` with width = ray. */
  Round(cellnum: number, ray: number, layerID: number): void {
    const mapWidth = this.map.getWidth(), cellData = this.map.getData(cellnum);
    for (let i = -ray; i <= ray; i++) {
      const lim = ray - Math.abs(i);
      for (let j = -lim; j <= lim; j++) {
        const p = convertCoordToxy(i, (ray * j) / ray);
        this.addCell(cellnum + mapWidth * i + (mapWidth - 1) * j, (cellData?.x as number) + p.x, (cellData?.y as number) + p.y, layerID);
      }
    }
  }

  /** Events.Battlefield.Interaction.as:1-60 */
  onCellRelease(cellNum: number): void {
    const dc = deps.DATACENTER, bf = G.BATTLEFIELD;
    switch (this.type) {
      case 1: {
        const characData = playerData();
        const clip = characData?.clip as BattleFieldCharacter | null | undefined;
        if (clip && deps.KERNEL?.PathFinding.calculatePath(clip, cellNum, true)) {
          if (getTimer() - this.lastActionTime < CLICK_MINIMUM_TIMER) return; // trace("T trop rapide du clic")
          this.lastActionTime = getTimer();
          const path = compressPath(dc.Player.tmpPath);
          if (path != undefined) {
            characData!.GameActionsManager?.transmittingMove(1, [path]);
            dc.Player.clearTmpPaths();
            const c = dc.Map.data[cellNum];
            deps.INTERFACE?.drawAnimSelection(
              (c?.x as number) * (bf.Container._xscale / 100) + bf.Container._x,
              (c?.y as number) * (bf.Container._yscale / 100) + bf.Container._y,
            );
          }
        }
        break;
      }
      case 2:
        if (dc.Player.currentSpell != null && this.canLaunchSpell == true) {
          bf.Spells.clear();
          playerData()?.GameActionsManager?.transmittingOther(300, [(dc.Player.currentSpell as Spell).m_ID, cellNum]);
          dc.Player.currentSpell = null;
        } else if (this.errorMessage != undefined) {
          deps.KERNEL?.traceToChat(this.errorMessage, ERROR_CHAT_COLOR);
          delete bf.Interaction.errorMessage;
        }
        this.setType("move");
        break;
      case 3:
        if (dc.Player.currentSpell != null && this.canLaunchSpell == true) {
          playerData()?.GameActionsManager?.transmittingOther(303, [cellNum]);
          dc.Player.currentSpell = null;
        }
        this.setType("move");
        break;
      case 4:
        if (cellNum != playerData()?.cell) deps.AKS?.Game.setPlayerPosition(cellNum);
        playerClip()?.setInteraction(true);
    }
  }

  /**
   * Events.Battlefield.Interaction.as:61-149. Spell targeting quirk kept (fight.md §3.2): a free-cell spell that also
   * needs line of sight passes on a free cell without line of sight, and on an occupied cell in line of sight.
   */
  onCellRollOver(cellNum: number): void {
    const dc = deps.DATACENTER, bf = G.BATTLEFIELD, pf = deps.KERNEL?.PathFinding;
    switch (this.type) {
      case 1:
        if (dc.Game.isFight) {
          const characData = playerData(), characClip = characData?.clip as BattleFieldCharacter | null | undefined;
          if (characClip && pf?.checkRange(characClip.getCellNum(), cellNum, false, characData!.AP as number, false)) {
            pf.setInitState(dc.Game.isFight);
            pf.calculatePath(characClip, cellNum, false);
          }
        }
        break;
      case 2: {
        delete this.onMouseUp;
        Mouse.removeListener(this);
        const cell1 = playerClip()?.getCellNum() as number, cell2Data = bf.Map.getData(cellNum);
        const spell = dc.Player.currentSpell as Spell | null;
        const sm = player().SpellsManager, characOnID = bf.Map.getData(cellNum)?.playerOnID;
        this.canLaunchSpell = false;
        if (pf?.checkRange(cell1, cellNum, !!spell?.m_bLineOnly, spell?.m_Range as number)) {
          if (spell?.m_bFreeCell && (cell2Data?.movement as number) > 1 && cell2Data?.playerOnID == undefined)
            this.canLaunchSpell = sm?.checkCanLaunchSpell(spell.m_ID, characOnID);
          if (spell?.m_bLineOfSight) {
            if (pf.checkView(cell1, cellNum)) this.canLaunchSpell = sm?.checkCanLaunchSpell(spell.m_ID, characOnID);
          } else if (!spell?.m_bFreeCell) this.canLaunchSpell = sm?.checkCanLaunchSpell(spell?.m_ID, characOnID);
        }
        this.showTarget(cellNum);
        break;
      }
      case 3: {
        delete this.onMouseUp;
        Mouse.removeListener(this);
        const cell1 = playerClip()?.getCellNum() as number, cell2Data = bf.Map.getData(cellNum);
        this.canLaunchSpell = false;
        if (pf?.checkRange(cell1, cellNum, false, 1)) {
          if ((cell2Data?.movement as number) > 1 && cell2Data?.playerOnID != undefined && pf.checkView(cell1, cellNum)) this.canLaunchSpell = true;
        }
        this.showTarget(cellNum);
      }
    }
  }

  /** The shared tail of the spell / cc roll-over cases (Events.Battlefield.Interaction.as:108-117,136-145). */
  private showTarget(cellNum: number): void {
    if (this.canLaunchSpell) {
      deps.INTERFACE?.getCursor()?.setForbidden(false);
      G.BATTLEFIELD.Pointer.setVisible(true);
      G.BATTLEFIELD.Pointer.draw(cellNum);
    } else deps.INTERFACE?.getCursor()?.setForbidden(true);
  }

  /** Events.Battlefield.Interaction.as:150-177 — leaving a cell in spell/cc mode arms a one-shot "click elsewhere = cancel". */
  onCellRollOut(_cellNum: number): void {
    switch (this.type) {
      case 1:
        if (deps.DATACENTER.Game.isFight) G.BATTLEFIELD.Selection.unSelectAll();
        break;
      case 2:
      case 3:
        this.onMouseUp = () => {
          this.setType("move");
          Mouse.removeListener(this);
          delete this.onMouseUp;
        };
        Mouse.addListener(this);
        deps.INTERFACE?.getCursor()?.setForbidden(true);
        G.BATTLEFIELD.Pointer.setVisible(false);
        this.canLaunchSpell = false;
    }
  }
}
registerClass("Dofus::BattleField::Interaction", BattlefieldInteraction);
