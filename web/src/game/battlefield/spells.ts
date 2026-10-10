// AKSClient/Dofus.BattleField.Spells.as — `Dofus::BattleField::Spells` (BATTLEFIELD.Spells, depth 700): spell visuals in
// Container.Object2.clips (docs/logic/fight.md §6, battlefield.md §1 depths). Each clip gets `_ACTION = caster` so
// `this.end()` inside the spell SWF (or here, on arrival) ends the caster's SEQUENCER_anim step (sequencer.md §1.1).
// The AS class has `prototype = new Object()`; the runtime's registerClass needs a MovieClip constructor, so it
// extends MovieClip (unused API).
import { SEQUENCER_TIMEOUT } from "../../core/constants.ts";
import { toNumber } from "../../core/swf6.ts";
import { getTimer, MovieClip, registerClass } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import type { BattleFieldCharacter } from "./characters.ts";
import type { BattleFieldContainer } from "./container.ts";
import type { SpellData } from "./deps.ts";
import type { BattleFieldMap } from "./map.ts";

type SpellClip = MovieClip & { clip: MovieClip & Record<string, unknown>; _launchTime?: number };
type Handler = (this: MovieClip) => void;

export class BattleFieldSpells extends MovieClip {
  declare container: BattleFieldContainer;
  declare map: BattleFieldMap;
  declare incIndex: number;
  declare Garbage: (SpellClip | undefined)[];

  constructor() {
    super();
    this.init();
  }

  /** Spells.as:7-14 */
  init(): void {
    this.container = G.BATTLEFIELD.Container;
    this.map = G.BATTLEFIELD.Map;
    this.incIndex = 0;
    this.Garbage = [];
  }

  /**
   * Spells.as:15-35 — removes spell clips older than 2 × SEQUENCER_TIMEOUT. AS bugs kept: splices while iterating
   * (skips the next entry), and an undefined entry is spliced then also tested (`getTimer() - undefined`).
   */
  clear(): void {
    for (let i = 0; i < this.Garbage.length; i++) {
      const s = this.Garbage[i];
      if (s == undefined) this.Garbage.splice(i, 1);
      if (getTimer() - toNumber(s?._launchTime) > SEQUENCER_TIMEOUT * 2) {
        s?.removeMovieClip();
        this.Garbage.splice(i, 1);
      }
    }
  }

  /** Spells.as:36-40 */
  addToGarbageCollector(spell_mc: SpellClip | undefined): void {
    if (spell_mc) spell_mc._launchTime = getTimer();
    this.Garbage.push(spell_mc);
  }

  /** Spells.as:41-50 — 1..20 then 0. */
  getNextIndex(): number {
    this.incIndex = this.incIndex + 1;
    if (this.incIndex > 20) this.incIndex = 0;
    return this.incIndex;
  }

  /** createEmptyMovieClip in Object2.clips + garbage list + inner `clip` (the common prologue of every launch*). */
  private newSpell(parent: MovieClip | undefined, name: string, depth: number): SpellClip | undefined {
    const s = parent?.createEmptyMovieClip(name, depth) as SpellClip | undefined;
    this.addToGarbageCollector(s);
    s?.createEmptyMovieClip("clip", 1);
    return s;
  }

  /** Spells.as:51-67 — spell SWF at a cell centre (spell types 10/11, not awaited). */
  launch(character: BattleFieldCharacter, spellData: SpellData, cellNum: number): void {
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    const idx = this.getNextIndex(), cellData = this.map.getData(cellNum);
    this.clear();
    const s = this.newSpell(this.container.Object2.clips, "spell" + idx, cellNum * 100 + 50 + d + idx);
    if (!s) return;
    s._ACTION = character;
    s._OBJECT = this;
    s._x = toNumber(cellData?.x);
    s._y = toNumber(cellData?.y);
    s.clip.loadMovie(spellData.file);
  }

  /** Spells.as:68-89 — at the origin, the SWF reads `level`, `cellFrom{x,y}`, `cellTo{x,y}`. No `_OBJECT`. */
  launchFree(character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number): void {
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    const idx = this.getNextIndex(), from = this.map.getData(cellNumFrom), to = this.map.getData(cellNumTo);
    const s = this.newSpell(this.container.Object2.clips, "shoot" + idx, cellNumTo * 100 + 51 + d + idx);
    if (!s) return;
    s._ACTION = character;
    s.clip.onInitFrame = function (this: MovieClip) {
      this.level = Number(spellData.m_Level);
      this.cellFrom = { x: from?.x, y: from?.y };
      this.cellTo = { x: to?.x, y: to?.y };
    } as Handler;
    s.clip.loadMovie(spellData.file);
  }

  /** Spells.as:90-113 — at the target: `level`, `angle` (radians); swaps out the `rotate` child, attaches `shoot`. */
  launchShoot(_character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number): void {
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    const map = this.map, idx = this.getNextIndex(), cellData = map.getData(cellNumTo);
    const s = this.newSpell(this.container.Object2.clips, "shoot" + idx, cellNumTo * 100 + 51 + d + idx);
    if (!s) return;
    s._x = toNumber(cellData?.x);
    s._y = toNumber(cellData?.y);
    s.clip.onInitFrame = function (this: MovieClip) {
      this.level = Number(spellData.m_Level);
      this.angle = map.calculateRotation(cellNumFrom, cellNumTo);
      const rotate = this.rotate as MovieClip | undefined;
      rotate?.swapDepths(1);
      rotate?.removeMovieClip();
      this.attachMovie("shoot", "shoot", 10);
    } as Handler;
    s.clip.loadMovie(spellData.file);
  }

  /** Spells.as:114-131 — inside the caster's sprite (depth 100+idx); reads an undeclared `cellNum` (dead line). */
  launchOnCharacter(character: BattleFieldCharacter, spellData: SpellData): void {
    const idx = this.getNextIndex();
    this.clear();
    const s = this.newSpell(character.sprite, "spell" + idx, 100 + idx);
    if (!s) return;
    s._ACTION = character;
    s._OBJECT = this;
    s.clip.onInitFrame = function (this: MovieClip) {
      this.level = Number(spellData.m_Level);
    } as Handler;
    s.clip.loadMovie(spellData.file);
  }

  /**
   * Spells.as:132-189 — no caller. Draws a debug curve on Object2 itself. AS bugs kept: tests `groundFrame` (no such
   * cell field) on a `yDest` member that is never read, and compares `dist <= this.speed` with `speed` a local
   * (undefined → 0), so the clip never stops.
   */
  launchToLine(character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number): void {
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    const depthIndex = this.getNextIndex();
    this.clear();
    const spell = this.newSpell(this.container.Object2.clips, "spell" + depthIndex, cellNumTo * 100 + 50 + d + depthIndex);
    if (!spell) return;
    spell._ACTION = character;
    spell._OBJECT = this;
    const a = this.map.getData(cellNumFrom), b = this.map.getData(cellNumTo);
    const ax = toNumber(a?.x), ay = toNumber(a?.y), bx = toNumber(b?.x), by = toNumber(b?.y);
    spell._x = ax;
    spell._y = ay - 10;
    const o2 = this.container.Object2;
    o2.lineStyle(0, 255, 100);
    o2.moveTo(ax, ay - 10);
    o2.curveTo(ax + (bx - ax) / 2, Math.min(ay, by) - 60, bx, by - 10);
    spell.cellNumFrom = cellNumFrom;
    spell.cellNumTo = cellNumTo;
    spell.clip.loadMovie(spellData.file);
    spell.clip.onInitFrame = function (this: MovieClip) {
      const sp = this._parent as SpellClip, ch = sp._ACTION as BattleFieldCharacter;
      const c1 = ch.map.getData(sp.cellNumFrom), c2 = ch.map.getData(sp.cellNumTo);
      const speed = 40, xStart = toNumber(c1?.x), yStart = toNumber(c1?.y), xDest = toNumber(c2?.x), yDest = toNumber(c2?.y) - 10;
      const rot = Math.atan2(yDest - yStart, xDest - xStart);
      this._rotation = (rot * 180) / Math.PI;
      let dist = Math.sqrt(Math.pow(xStart - xDest, 2) + Math.pow(yStart - yDest, 2));
      this.onEnterFrame = function (this: MovieClip) {
        if (dist <= toNumber(this.speed)) {
          sp._x += dist * Math.cos(rot);
          sp._y += dist * Math.sin(rot);
          delete this.onEnterFrame;
        } else {
          sp._x += speed * Math.cos(rot);
          sp._y += speed * Math.sin(rot);
          dist -= speed;
        }
      };
    } as Handler;
  }

  /**
   * Spells.as:190-258 — every frame one `duplicate` copy each `fullDist / floor(fullDist / (20 + level))` px along the
   * line, `end()` past the target; ends at once when the caster targets its own cell. AS bug kept: the −10 px offset
   * of sloped cells tests `groundFrame`, which no cell has, so it never applies.
   */
  launchToDuplicate(character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number): void {
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    const depthIndex = this.getNextIndex();
    this.clear();
    const spell = this.newSpell(this.container.Object2.clips, "spell" + depthIndex, cellNumTo * 100 + 50 + d + depthIndex);
    if (!spell) return;
    spell._ACTION = character;
    spell._OBJECT = this;
    if (character.getCellNum() == cellNumTo) return spell.clip.end();
    const a = this.map.getData(cellNumFrom), b = this.map.getData(cellNumTo);
    const xStart = toNumber(a?.x), yStart = toNumber(a?.y), xDest = toNumber(b?.x), yDest = toNumber(b?.y);
    spell._x = xStart;
    spell._y = yStart;
    spell.clip.onInitFrame = function (this: MovieClip) {
      this.level = Number(spellData.m_Level);
      const step = 20 + (this.level as number);
      const rot = Math.atan2(yDest - yStart, xDest - xStart);
      const fullDist = Math.sqrt(Math.pow(xStart - xDest, 2) + Math.pow(yStart - yDest, 2));
      const interval = fullDist / Math.floor(fullDist / step);
      let dist = 0, inc = 1;
      this.onEnterFrame = function (this: MovieClip) {
        dist += interval;
        if (dist > fullDist) {
          this.end();
          delete this.onEnterFrame;
        } else {
          const dup = this.attachMovie("duplicate", "duplicate" + inc, inc);
          if (dup) (dup._x = dist * Math.cos(rot)), (dup._y = dist * Math.sin(rot));
          inc++;
        }
      };
    } as Handler;
    spell.clip.loadMovie(spellData.file);
  }

  /**
   * Spells.as:259-339 — ballistic projectile (`move`), mirrored for leftward targets; on arrival it re-depths to
   * cellTo·100+70, attaches `shoot` at the destination along the velocity and calls `end()`.
   */
  launchToArc(character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number, angleCoef: number, speed: number): void {
    const depthIndex = this.getNextIndex(), PI2 = Math.PI / 2;
    const from = this.map.getData(cellNumFrom), to = this.map.getData(cellNumTo);
    const dirx = toNumber(to?.x) - toNumber(from?.x), diry = toNumber(to?.y) - toNumber(from?.y);
    const angle = (Math.atan2(diry, Math.abs(dirx)) + PI2) * angleCoef - PI2;
    const xDest = Math.abs(dirx);
    let yDest = diry;
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    this.clear();
    const spell = this.newSpell(this.container.Object2.clips, "spell" + depthIndex, cellNumFrom * 100 + 50 + d + depthIndex);
    if (!spell) return;
    spell._ACTION = character;
    spell._OBJECT = this;
    spell._ROOTANIM = spell.clip;
    spell.clip._x = toNumber(from?.x);
    spell.clip._y = toNumber(from?.y) - 20;
    if (dirx <= 0) {
      if (dirx == 0 && diry < 0) {
        spell.clip._yscale = -spell.clip._yscale;
        yDest = -yDest;
      }
      spell.clip._xscale = -spell.clip._xscale;
    }
    spell.angle = angle;
    spell.xDest = xDest;
    spell.yDest = yDest;
    spell.speed = speed;
    spell.depthDest = cellNumTo * 100 + 50 + 20;
    spell.clip.onInitFrame = function (this: MovieClip) {
      this.level = spellData.m_Level;
      this.attachMovie("move", "move", 2);
      const sp = this._parent as SpellClip & { angle: number; xDest: number; yDest: number; speed: number; depthDest: number };
      const g = 9.81, halfg = g / 2;
      let t = 0, vyi = 0;
      const vx = Math.sqrt(Math.abs((halfg * Math.pow(sp.xDest, 2)) / Math.abs(sp.yDest - Math.tan(sp.angle) * sp.xDest)));
      const vy = Math.tan(sp.angle) * vx;
      this.onEnterFrame = function (this: MovieClip) {
        vyi = vy + g * t;
        const x = t * vx, y = halfg * Math.pow(t, 2) + vy * t;
        t += sp.speed;
        if ((Math.abs(y) >= Math.abs(sp.yDest) && x >= sp.xDest) || x > sp.xDest) {
          sp.swapDepths(sp.depthDest);
          const shoot = this.attachMovie("shoot", "shoot", 2);
          if (shoot) {
            shoot._x = xDest;
            shoot._y = yDest;
            shoot._rotation = (Math.atan(vyi / vx) * 180) / Math.PI;
          }
          this.end();
          delete this.onEnterFrame;
        } else {
          const move = this.move as MovieClip | undefined;
          if (move) {
            move._x = x;
            move._y = y;
            move._rotation = (Math.atan(vyi / vx) * 180) / Math.PI;
          }
        }
      };
    } as Handler;
    spell.clip.loadMovie(spellData.file);
  }

  /**
   * Spells.as:340-375 — at the caster: `level`, `angle` (degrees), `rotate._rotation = angle; rotate.play()`. The AS
   * also does `this.yDest -= 10` on the Spells object when `groundFrame != 1` (always): an unused member.
   */
  launchRotate(character: BattleFieldCharacter, spellData: SpellData, cellNumFrom: number, cellNumTo: number): void {
    const a = this.map.getData(cellNumFrom), b = this.map.getData(cellNumTo);
    const depthIndex = this.getNextIndex();
    const d = !spellData.m_bInFrontOfPlayer ? -20 : 20;
    this.clear();
    const spell = this.newSpell(this.container.Object2.clips, "spell" + depthIndex, cellNumFrom * 100 + 50 + d + depthIndex);
    if (!spell) return;
    spell._ACTION = character;
    spell._OBJECT = this;
    spell.clip._x = toNumber(a?.x);
    spell.clip._y = toNumber(a?.y);
    const rot = (Math.atan2(toNumber(b?.y) - toNumber(a?.y), toNumber(b?.x) - toNumber(a?.x)) * 180) / Math.PI;
    spell.clip.onInitFrame = function (this: MovieClip) {
      this.level = spellData.m_Level;
      this.angle = rot;
      const rotate = this.rotate as MovieClip | undefined;
      if (rotate) rotate._rotation = rot;
      rotate?.play();
    } as Handler;
    spell.clip.loadMovie(spellData.file);
  }
}
registerClass("Dofus::BattleField::Spells", BattleFieldSpells);
