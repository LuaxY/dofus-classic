// AKSClient/Dofus.BattleField.Characters.as (`Dofus::BattleField::Characters`, BATTLEFIELD.Characters, depth 600) and
// AKSClient/Dofus.BattleField.Characters.Character.as (`Dofus::BattleField::Characters::Character`): one controller
// per character in `list`, whose visible sprite lives in Container.Object2.clips (docs/logic/characters.md).
// Cell occupancy (playerOnID, tackle zones) is the data-side helper ./occupancy.ts; this file keeps the display part.
import { makeFullPath } from "../../core/compressor.ts";
import { ACTION_POINT_COLOR, CELL_PATH_COLOR, CELL_PATH_USED_COLOR, CLIPS_PATH, LIFE_POINT_COLOR, TEAMS_COLOR } from "../../core/constants.ts";
import { getDirection } from "../../core/pathfinding.ts";
import { str, toNumber } from "../../core/swf6.ts";
import { clearInterval, Color, MovieClip, registerClass, type TextField } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldContainer } from "./container.ts";
import { deps, type CharacterData, type Sequencer, type SpellData } from "./deps.ts";
import type { DialogBubble, SmileyOverHead } from "./dialogBubble.ts";
import { Cell } from "./interaction.ts";
import type { BattleFieldMap } from "./map.ts";
import { leaveCell, setNewCell } from "./occupancy.ts";

type CircleClip = MovieClip & { animate?(b: boolean): void; setColor?(col: number): void };
type Sprite = MovieClip & { clip: MovieClip; circle?: CircleClip; obj?: BattleFieldCharacter };
type PointClip = MovieClip & { previous?: MovieClip; VorA?: string; debug?: number };

export class BattleFieldCharacters extends MovieClip {
  declare list: MovieClip;

  constructor() {
    super();
    this.init();
  }

  /** Characters.as:7-10 */
  init(): void {
    this.createEmptyMovieClip("list", 1);
  }

  /** Characters.as:11-26 — replaces the controller of `index`, team circle in multiplayer games. */
  build(characterData: CharacterData): BattleFieldCharacter {
    const i = characterData.index;
    (this.list["character" + i] as MovieClip | undefined)?.removeMovieClip();
    this.list.attachMovie("Dofus::BattleField::Characters::Character", "character" + i, Number(i));
    const c = this.list["character" + i] as BattleFieldCharacter;
    c.init(characterData);
    c.setInteraction(true);
    if (deps.DATACENTER.Game.isMultiplayer) c.select(true);
    characterData.clip = c;
    return c;
  }

  /** Characters.as:27-30 */
  get(characterNum: number): BattleFieldCharacter | undefined {
    return this.list["character" + characterNum] as BattleFieldCharacter | undefined;
  }

  /** Characters.as:31-34 (shadows MovieClip.clear, as the AS prototype does). */
  clear(characterNum?: number): void {
    this.get(characterNum as number)?.clear();
  }

  /** Characters.as:35-42 — removes every sprite; the controllers stay. */
  clearAll(): void {
    for (const k in this.list) (this.list[k] as BattleFieldCharacter).clear?.();
  }

  /** Characters.as:43-51 */
  selectAll(bool: boolean): void {
    for (const k in this.list) (this.list[k] as BattleFieldCharacter).select?.(bool);
  }
}
registerClass("Dofus::BattleField::Characters", BattleFieldCharacters);

export class BattleFieldCharacter extends MovieClip {
  declare intervalID: number;
  declare container: BattleFieldContainer;
  declare map: BattleFieldMap;
  declare data: CharacterData;
  /** Initialised by init but never used: showPoints counts in `PointLevellife` / `PointLevelaction`. */
  declare PointLevelV: number;
  declare PointLevelA: number;
  declare PointLevel?: number;
  declare sprite: Sprite;
  declare smiley_mc?: SmileyOverHead;
  declare bubble?: DialogBubble;
  declare bSelectAnimForced?: boolean;
  declare xDest: number;
  declare yDest: number;
  declare speed: number;
  declare rot: number;

  constructor() {
    super();
    this.intervalID = 0;
  }

  /** Character.as:7-34 */
  init(characterData: CharacterData): void {
    this.container = G.BATTLEFIELD.Container;
    this.map = G.BATTLEFIELD.Map;
    this.data = characterData;
    this.PointLevelV = 0;
    this.PointLevelA = 0;
    const clips = this.container.Object2.clips as MovieClip;
    clips.createEmptyMovieClip("sprite" + this.data.index, Number(this.data.index) + 200000);
    this.sprite = clips["sprite" + this.data.index] as Sprite; // `sprite.__proto__ = MovieClip.prototype`: already one
    this.sprite.createEmptyMovieClip("clip", 2);
    this.sprite._ACTION = this;
    this.sprite._OBJECT = this;
    // On the controller, not the sprite: runs next frame whether or not the sprite SWF has arrived.
    this.onInitFrame = function (this: BattleFieldCharacter) {
      this.setPosition(this.data.cell as number, this.data.dir as number);
      this.wait();
    };
    this.sprite.clip.loadMovie(this.data.file);
    G.CCOLORS?.addCharacter(this.sprite.clip);
    G.CCOLORS?.setColor(this.sprite.clip._target, this.data.color1, this.data.color2, this.data.color3);
    G.WEAPONS?.addCharacter(this.sprite.clip);
    G.WEAPONS?.setData(this.sprite.clip._target, this.data);
    // AS: `data.SEQUENCER_action.clear()` — typo (no `s`), calls nothing (README §0 defects).
    this.data.SEQUENCER_anim?.clear();
  }

  /** Character.as:35-42 — AS bug kept: calls `endSmile()` (the method is endSmiley), so the smiley stays. */
  clear(): void {
    leaveCell(this.map.data, this.data);
    this.sprite.removeMovieClip();
    clearInterval(this.intervalID);
  }

  /** Character.as:43-58 — tooltip above the sprite (below it near the top); y also uses `_xscale`, as the AS. */
  showName(bool: boolean): void {
    if (!bool) return deps.INTERFACE?.hideToolTip();
    const C = G.BATTLEFIELD.Container;
    const txt = !deps.DATACENTER.Game.isFight ? str(this.data.name) : str(this.data.name) + " (" + str(this.data.LP) + ")";
    const y = this.sprite._y >= 70 ? this.sprite._y - 65 : this.sprite._y + 30;
    deps.INTERFACE?.drawToolTip(txt, Math.ceil(this.sprite._x) * (C._xscale / 100) + C._x, Math.ceil(y) * (C._xscale / 100) + C._y, false, true, 0);
  }

  /**
   * Character.as:59-123 — floating LP (red, x −25, depth (3+k)·100) or AP (blue, x 0, depth 3+k) number that fades once
   * the previous one is below 50 % (or after 20 stalled frames); negative life also plays `hit`.
   * The counter is `this["PointLevel" + VorA]` (`PointLevellife`/`PointLevelaction`): its first postfix `++` yields
   * undefined (AVM1 keeps the raw old value), so the first clip is "pointlife" at depth 3·k and the second one's
   * `previous` ("pointlife0") does not exist. `delete points` deletes nothing.
   */
  showPoints(VorA: string, Points: unknown): void {
    const key = "PointLevel" + VorA;
    const pl = this[key] as number | undefined;
    this[key] = toNumber(pl) + 1;
    const depth = VorA == "life" ? 100 : 1;
    const name = "point" + VorA + str(pl);
    this.sprite.createEmptyMovieClip(name, (3 + toNumber(pl)) * depth);
    const p = this.sprite[name] as PointClip;
    p._y = -this.sprite.clip._height;
    p.previous = this.sprite["point" + VorA + (toNumber(pl) - 1)] as MovieClip | undefined;
    p.VorA = VorA;
    if (!Points) return;
    let col = 0, x = 0;
    if (VorA == "life") {
      col = LIFE_POINT_COLOR;
      if ((Points as number) < 0) {
        this.setAnim("hit");
        if (this.data.num == (deps.DATACENTER.Player.ID as unknown)) deps.INTERFACE?.InterfaceBanner?.setPlayerHeadAnim("hit");
      }
      x = -25;
    } else if (VorA == "action") col = ACTION_POINT_COLOR;
    (p.createTextField(VorA, 1, x, 0, 40, 30) as TextField).setText(Points, "Font2", col, 18);
    p._alpha = 150;
    p.onEnterFrame = function (this: PointClip) {
      const a = this._alpha;
      const prev = this.previous && !this.previous.$.removed ? this.previous._alpha : undefined; // removed/undefined: `undefined < 50` is 0 < 50
      if (toNumber(prev) < 50 || prev == undefined || toNumber(this.debug) > 20) {
        this._alpha -= 5;
        if (this._alpha <= 0) {
          const ctrl = this._parent?._ACTION as Record<string, unknown>;
          ctrl["PointLevel" + this.VorA] = toNumber(ctrl["PointLevel" + this.VorA]) - 1;
          this.removeMovieClip();
        }
        this._y -= 2;
      }
      if (this._alpha == a) this.debug = toNumber(this.debug) + 1;
    };
  }

  /** Character.as:124-156 — unused older version of showPoints. */
  showActionPoints(AP: unknown): void {
    this.PointLevel = toNumber(this.PointLevel) + 1;
    this.sprite.createEmptyMovieClip("point" + this.PointLevel, 3 + this.PointLevel);
    const p = this.sprite["point" + this.PointLevel] as PointClip;
    p._y = -this.sprite.clip._height;
    p.previous = this.sprite["point" + (this.PointLevel - 1)] as MovieClip | undefined;
    if (!AP) return;
    p.createTextField("action", 2, 0, 0, 40, 30).setText(AP, "Font2", ACTION_POINT_COLOR, 18);
    p.onEnterFrame = function (this: PointClip) {
      const prev = this.previous && !this.previous.$.removed ? this.previous._alpha : 0;
      if (prev < 50) {
        this._alpha -= 5;
        if (this._alpha <= 0) {
          const ctrl = this._parent?._ACTION as BattleFieldCharacter;
          ctrl.PointLevel = toNumber(ctrl.PointLevel) - 1;
          this.removeMovieClip();
        }
        this._y -= 2;
      }
    };
  }

  /** Character.as:157-160 */
  setVisible(bool: boolean): void {
    this.sprite._visible = bool;
  }

  /**
   * Character.as:161-200 — team circle (clips/circle.swf, depth 1 of the sprite): `animate(bAnim)` and the team colour
   * once loaded; `bAnimForced` makes the animated state sticky. The AS also defaults an undeclared `bForced` (no effect).
   */
  select(bool: boolean, bAnim: boolean = false, bAnimForced?: boolean): void {
    const s = this.sprite;
    if (bAnimForced) this.bSelectAnimForced = bAnim;
    const anim = this.bSelectAnimForced || bAnim;
    if (!bool) return s.circle?.removeMovieClip();
    if (s.circle) return s.circle.animate?.(anim);
    const circle = s.createEmptyMovieClip("circle", 1) as CircleClip;
    circle.onInitFrame = function (this: CircleClip) {
      this.animate?.(anim);
      this.setColor?.(TEAMS_COLOR[(this._parent?._ACTION as BattleFieldCharacter).data.team as 0 | 1]);
    };
    circle.loadMovie(CLIPS_PATH + "circle.swf");
  }

  /** Character.as:201-208 */
  isSelect(): boolean {
    return !!this.sprite.circle;
  }

  /** Character.as:209-215 */
  stopMove(): void {
    this.data.SEQUENCER_actions.clear();
    this.data.SEQUENCER_anim.clearAllNextActions();
    this.data.SEQUENCER_anim.addAction(false, this, this.wait, []);
  }

  /** Character.as:216-274 — name tooltip + brighten on roll-over; forwards to the cell handlers while they are on. */
  setInteraction(bool: boolean): void {
    const s = this.sprite;
    if (!bool) {
      delete s.onPress;
      delete s.onRelease;
      delete s.onReleaseOutside;
      delete s.onRollOver;
      delete s.onRollOut;
      return;
    }
    s.obj = this;
    s.onRelease = function (this: Sprite) {
      if (Cell.prototype.onRelease) G.BATTLEFIELD.Interaction.onCellRelease(this.obj!.data.cell as number);
    };
    s.onRollOut = s.onReleaseOutside = function (this: Sprite) {
      this.obj!.showName(false);
      new Color(this.clip).setTransform({ ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0 });
      if (Cell.prototype.onRelease) G.BATTLEFIELD.Interaction.onCellRollOut(this.obj!.data.cell as number);
    };
    s.onRollOver = function (this: Sprite) {
      this.obj!.showName(true);
      new Color(this.clip).setTransform({ ra: 60, rb: 100, ga: 60, gb: 100, ba: 60, bb: 100 });
      if (Cell.prototype.onRelease) G.BATTLEFIELD.Interaction.onCellRollOver(this.obj!.data.cell as number);
    };
  }

  /** Character.as:275-296 — sloped cells draw the sprite 10 px higher; depth cell·100 + 50. */
  setPosition(cell: number, dir?: number | null, bSetDir?: boolean): void {
    if (dir == undefined) dir = this.data.dir;
    if (bSetDir == undefined) bSetDir = true;
    this.setNewCell(cell, true);
    if (bSetDir) this.setDir(dir);
    const d = this.map.getData(cell);
    const off = !(d?.groundSlope == undefined || d.groundSlope == 1) ? -10 : 0;
    this.sprite._x = toNumber(d?.x);
    this.sprite._y = toNumber(d?.y) + off;
    this.chgDepth(toNumber(this.data.cell) * 100 + 50);
  }

  /** Character.as:297-307 — data side in ./occupancy.ts (tackle zones only when `bCalculateTacle`). */
  setNewCell(cell: unknown, bCalculateTacle: boolean): void {
    setNewCell(this.map.data, deps.DATACENTER.Characters, this.data, cell, bCalculateTacle);
  }

  /** Character.as:308-311 */
  getDir(): number | null {
    return this.data.dir;
  }

  /** Character.as:312-317 — replays the current animation in the new direction. */
  setDir(dir: number | null | undefined): void {
    this.data.dir = dir as number | null;
    this.setAnim(this.data.anim as string);
  }

  /** Character.as:318-324 — on the controller (stage space), depth `container.text.maxDepth` (undefined → 0). */
  smiley(smileID: number): void {
    this.smiley_mc = this.attachMovie("SmileyOverHead", "smiley" + this.data.index + "_mc", toNumber(this.container.Text.maxDepth)) as SmileyOverHead | undefined;
    this.smiley_mc?.drawSmiley(smileID);
    this.placeSmiley();
  }

  /** Character.as:325-339 — above the sprite, below it near the top of the screen. */
  placeSmiley(): void {
    const C = G.BATTLEFIELD.Container, s = this.smiley_mc;
    if (!s) return;
    const b = this.sprite.getBounds(this.sprite._parent);
    s._x = Math.ceil(this.sprite._x) * (C._xscale / 100) + C._x;
    if (Math.ceil(this.sprite._y) * (C._yscale / 100) + C._y > 80) s._y = b.yMin * (C._yscale / 100) + C._y - 20;
    else s._y = b.yMax * (C._yscale / 100) + C._y + 20;
  }

  /** Character.as:340-343 */
  endSmiley(): void {
    this.smiley_mc?.remove();
  }

  /** Character.as:344-366 — one DialogBubbleSymbol per character in Container.Text (`container.text` in the AS). */
  say(txt: unknown, textAlign?: string): void {
    const T = this.container.Text;
    if (!T["text" + this.data.index]) {
      T.maxDepth = !T.maxDepth ? toNumber(this.data.index) : T.maxDepth + 1;
      if (!textAlign) textAlign = "left";
      this.bubble = T.attachMovie("DialogBubbleSymbol", "text" + this.data.index, T.maxDepth, { align: textAlign }) as DialogBubble | undefined;
    }
    this.bubble?.setText(str(txt));
    this.placeBubble();
  }

  /** Character.as:367-370 */
  endSay(): void {
    (this.container.Text["text" + this.data.index] as DialogBubble | undefined)?.remove();
  }

  /** Character.as:371-396 — right of the sprite in the left half, above it in the lower half (container space). */
  placeBubble(): void {
    const b = this.sprite.getBounds(this.sprite._parent), bubble = this.bubble;
    if (!bubble) return;
    if (this.sprite._x < 375) {
      bubble.flipRight();
      bubble._x = b.xMax;
    } else {
      bubble.flipLeft();
      bubble._x = b.xMin;
    }
    if (this.sprite._y > 225) {
      bubble.flipTop();
      bubble._y = b.yMin;
    } else {
      bubble.flipBottom();
      bubble._y = b.yMin + 20;
    }
  }

  /**
   * Character.as:397-444 — one waiting `move` per path cell on SEQUENCER_anim (run when the path is longer than 15,
   * duplicated waypoints included); with `bSel` the cells are pre-selected (depth 8) and marked walked (depth 9).
   * The outer SEQUENCER_actions step ends when the anim queue empties.
   */
  moveCharacterThroughPath(path: number[] | null, bSel: boolean): boolean {
    const len = toNumber(path?.length), seq = this.data.SEQUENCER_anim, actions = this.data.SEQUENCER_actions, sel = G.BATTLEFIELD.Selection;
    seq.referer = this;
    if (path == null) return false;
    sel.unSelectAll();
    seq.clear();
    let stopWalk = false;
    const bRun = len <= 15 ? false : true;
    seq.addAction(false, this, this.setPosition, [path[0], getDirection(path[0]!, toNumber(path[1]), this.map.getWidth())]);
    for (let i = 1; i < len; i++) {
      if (i == len - 1) stopWalk = true;
      seq.addAction(true, this, this.move, [path[i], stopWalk, bRun, false]);
      if (bSel) {
        sel.select(path[i]!, true, 8, CELL_PATH_COLOR);
        seq.addAction(false, sel, sel.select, [path[i], true, 9, CELL_PATH_USED_COLOR]);
      }
    }
    if (bSel) seq.addAction(false, sel, sel.unSelectAll, []);
    seq.onSequenceEnd = function (this: Sequencer) {
      actions.onActionEnd((this.referer as Record<string, unknown>)[actions.unicID]);
      delete this.onSequenceEnd;
    };
    seq.play();
    return true;
  }

  /** Character.as:445-478 — push/pull (game action 5): straight path at 15 px/frame, idle animation. */
  slide(SEQUENCER_actions: Sequencer, cell: number): boolean {
    const W = this.map.getWidth();
    const path = makeFullPath([toNumber(this.data.cell), cell], W);
    const len = path.length, seq = this.data.SEQUENCER_anim;
    let bLast = false;
    seq.referer = this;
    seq.clear();
    seq.addAction(false, this, this.setPosition, [path[0], getDirection(path[0]!, toNumber(path[1]), W)]);
    for (let i = 1; i < len; i++) {
      if (i == len - 1) bLast = true;
      seq.addAction(true, this, this.move, [path[i], bLast, false, true]);
    }
    seq.onSequenceEnd = function (this: Sequencer) {
      SEQUENCER_actions.onActionEnd((this.referer as Record<string, unknown>)[SEQUENCER_actions.unicID]);
      delete this.onSequenceEnd;
    };
    seq.play();
    return true;
  }

  /**
   * Character.as:479-573 — one path step: `movement` px/frame (+3 running, 15 sliding), ±30 % on level/slope changes,
   * depth switched now when going to a higher cell number (else on arrival); occupancy moves at once, tackle zones
   * only on the last step. Ends the step with `sprite.end(SEQUENCER_anim)`.
   */
  move(cell: number, stopMove: boolean, bRun: boolean, bSlide: boolean): void {
    if (cell == this.data.cell) return this.sprite.end(this.data.SEQUENCER_anim);
    const from = this.map.getData(this.data.cell), to = this.map.getData(cell);
    const speed = !bSlide ? toNumber(from?.movement) + (!bRun ? 0 : 3) : 15;
    if (cell > toNumber(this.data.cell)) this.chgDepth(cell * 100 + 50);
    this.xDest = toNumber(to?.x);
    this.yDest = toNumber(to?.y);
    this.speed = speed;
    const variation = (30 * this.speed) / 100;
    const gTo = toNumber(to?.groundLevel), gFrom = toNumber(from?.groundLevel);
    if (gTo < gFrom) this.speed += variation;
    else if (gTo > gFrom) this.speed -= variation;
    else if (from?.groundSlope != to?.groundSlope) {
      if (to?.groundSlope == 1) this.speed += variation;
      else if (from?.groundSlope == 1) this.speed -= variation;
    }
    if (to?.groundSlope != 1) this.yDest -= 10;
    this.calculateCharacterDirection(this.sprite._x, this.sprite._y, this.xDest, this.yDest);
    if (bSlide) this.wait();
    else if (bRun) this.setAnim("Run");
    else this.setAnim("Walk");
    let dist = Math.sqrt(Math.pow(this.sprite._x - this.xDest, 2) + Math.pow(this.sprite._y - this.yDest, 2));
    this.setNewCell(cell, stopMove);
    this.onEnterFrame = function (this: BattleFieldCharacter) {
      if (dist <= this.speed) {
        if (this.sprite.getDepth() != cell * 100 + 50) this.chgDepth(cell * 100 + 50);
        this.sprite._x += dist * Math.cos(this.rot);
        this.sprite._y += dist * Math.sin(this.rot);
        if (stopMove && !bSlide) this.wait();
        delete this.onEnterFrame;
        this.sprite.end(this.data.SEQUENCER_anim);
      } else {
        this.sprite._x += this.speed * Math.cos(this.rot);
        this.sprite._y += this.speed * Math.sin(this.rot);
        dist -= this.speed;
      }
      if (this.container.Text["text" + this.data.index]) this.placeBubble();
      if (this.smiley_mc) this.placeSmiley();
    };
  }

  /** Character.as:574-589 — close combat (game action 303): face the cell, waiting `shoot`. */
  shoot(cellNumTo: number): void {
    const seq = this.data.SEQUENCER_anim, actions = this.data.SEQUENCER_actions, d = this.map.getData(cellNumTo), obj = this;
    this.calculateCharacterDirection(this.sprite._x, this.sprite._y, toNumber(d?.x), toNumber(d?.y));
    seq.addAction(true, this, this.setAnim, ["shoot"]);
    seq.onSequenceEnd = function (this: Sequencer) {
      actions.onActionEnd(obj[actions.unicID]);
      delete this.onSequenceEnd;
    };
    seq.play();
  }

  /**
   * Character.as:590-700 — game action 300 (docs/logic/fight.md §6 table): caster animation (waits for the sprite's
   * `this.end()`), then the projectile variant. Clearing the queue first also fires the previous `onSequenceEnd`.
   */
  cast(spellType: number, spellData: SpellData, params: { cellFrom: number; cellTo: number }): void {
    const seq = this.data.SEQUENCER_anim, actions = this.data.SEQUENCER_actions, Spells = G.BATTLEFIELD.Spells;
    clearInterval(this.intervalID);
    seq.clear();
    seq.onSequenceEnd?.();
    const cellNumFrom = params.cellFrom, cellTo = params.cellTo, cellToData = this.map.getData(cellTo);
    this.calculateCharacterDirection(this.sprite._x, this.sprite._y, toNumber(cellToData?.x), toNumber(cellToData?.y));
    const anim = (a: string) => seq.addAction(true, this, this.setAnim, [a]);
    const rotate = (wait: boolean) => seq.addAction(wait, Spells, Spells.launchRotate, [this, spellData, cellNumFrom, cellTo]);
    const shoot = () => seq.addAction(false, Spells, Spells.launchShoot, [this, spellData, cellNumFrom, cellTo]);
    const arc = (a: number, s: number) => seq.addAction(true, Spells, Spells.launchToArc, [this, spellData, cellNumFrom, cellTo, a, s]);
    switch (spellType) {
      case 0:
        anim("shoot");
        break;
      case 10:
      case 11:
        anim("cast");
        seq.addAction(false, Spells, Spells.launch, [this, spellData, spellType != 10 ? cellTo : cellNumFrom]);
        break;
      case 12:
        anim("cast");
        seq.addAction(true, Spells, Spells.launchOnCharacter, [this, spellData]);
        break;
      case 20:
        anim("cast");
        rotate(true);
        break;
      case 21:
        anim("shoot");
        rotate(false);
        break;
      case 22:
        anim("cast");
        rotate(true);
        shoot();
        break;
      case 23:
        anim("shoot");
        rotate(true);
        shoot();
        break;
      case 30:
      case 31:
        anim("cast");
        spellType == 30 ? arc(0.5, 0.5) : arc(0.9, 0.4);
        break;
      case 32:
      case 33:
        anim("shoot");
        spellType == 32 ? arc(0.5, 0.5) : arc(0.9, 0.4);
        break;
      case 40:
        anim("shoot");
        seq.addAction(true, Spells, Spells.launchToDuplicate, [this, spellData, cellNumFrom, cellTo]);
        break;
      case 41:
        anim("shoot");
        seq.addAction(true, Spells, Spells.launchToDuplicate, [this, spellData, cellNumFrom, cellTo]);
        shoot();
        break;
      case 50:
        anim("cast");
        seq.addAction(true, Spells, Spells.launchFree, [this, spellData, cellNumFrom, cellTo]);
        break;
      case 51:
        anim("shoot");
        seq.addAction(true, Spells, Spells.launchFree, [this, spellData, cellNumFrom, cellTo]);
        break;
      default:
        // trace("ERREUR : Le type de lancé n'est pas bon.")
        anim("cast");
    }
    const obj = this;
    seq.onSequenceEnd = function (this: Sequencer) {
      actions.onActionEnd(obj[actions.unicID]);
      delete this.onSequenceEnd;
    };
    if (!seq.isPlaying()) seq.play();
  }

  /** Character.as:701-720 — game action 103: waiting `die`, remove the sprite, data moved to cell 0 (see occupancy). */
  die(SEQUENCER_actions: Sequencer): void {
    deps.INTERFACE?.UIInterfaceBanner?.removePlayerTimeline(this.data.num);
    const seq = this.data.SEQUENCER_anim, obj = this;
    seq.clear();
    seq.addAction(true, this, this.setAnim, ["die"]);
    seq.addAction(false, this, this.clear, []);
    seq.addAction(false, this, this.setNewCell, [undefined, true]);
    seq.onSequenceEnd = function (this: Sequencer) {
      SEQUENCER_actions.onActionEnd(obj[SEQUENCER_actions.unicID]);
      delete this.onSequenceEnd;
    };
    if (!seq.isPlaying()) seq.play();
  }

  /** Character.as:721-725 — `intervalID` is never set to a live interval. */
  wait(): void {
    this.setAnim("static");
    clearInterval(this.intervalID);
  }

  /**
   * Character.as:726-765 — label `anim + "R"` for dirs 0/1, `anim + "L"` for 2/3, mirrored for 1 and 3; any other dir
   * does not jump. Repeating walk/run keeps the cycle; otherwise nested clips restart at frame 1.
   */
  setAnim(anim: string): void {
    const clip = this.sprite.clip, dir = this.data.dir;
    if (anim != "static" && anim != "wait") clearInterval(this.intervalID);
    if (dir == 0 || dir == 1) {
      clip.gotoAndStop(str(anim) + "R");
      clip._xscale = dir == 0 ? 100 : -100;
    } else if (dir == 2 || dir == 3) {
      clip.gotoAndStop(str(anim) + "L");
      clip._xscale = dir == 2 ? 100 : -100;
    }
    const oldAnim = this.data.anim?.toLowerCase();
    if ((oldAnim == "walk" || oldAnim == "run") && anim?.toLowerCase() == oldAnim) return;
    clip.playFirstChildren();
    this.data.anim = anim;
  }

  /** Character.as:766-769 */
  getAnim(): string | undefined {
    return this.data.anim;
  }

  /** Character.as:770-773 */
  chgDepth(depth: number): void {
    this.sprite.swapDepths(depth);
  }

  /** Character.as:774-777 */
  getCellNum(): number {
    return this.data.cell as number;
  }

  /** Character.as:778-785 */
  stopAnim(): void {
    this.sprite.stopAllClip();
  }
  playAnim(): void {
    this.sprite.playAllClip();
  }

  /** Character.as:786-809 — screen angle → direction id 0-3 (same ids as path directions). */
  calculateCharacterDirection(x1: number, y1: number, x2: number, y2: number): void {
    this.rot = Math.atan2(y2 - y1, x2 - x1);
    if (this.rot < 0) this.data.dir = Math.abs(this.rot) > Math.PI / 2 ? 2 : 3;
    else this.data.dir = this.rot < Math.PI / 2 ? 0 : 1;
  }
}
registerClass("Dofus::BattleField::Characters::Character", BattleFieldCharacter);
