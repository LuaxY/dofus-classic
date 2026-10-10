// AKSClient/Dofus.BattleField.Container.as — `Dofus::BattleField::Container` (BATTLEFIELD.Container, depth 100): every
// visible layer of the map, masked, centred, zoomable (docs/logic/battlefield.md §1, map-format.md §4).
import { CLIPS_PATH } from "../../core/constants.ts";
import { Color, DisplayObject, MovieClip, registerClass } from "../../runtime/player.ts";
import { deps } from "./deps.ts";

/**
 * `clips/ground.swf` / `clips/objects.swf` loaded into a layer clip. Their frame-1 script (clips/ground.swf/frame_1/
 * DoAction.as:1-12, same in objects.swf) defines `clear()` (new empty `clips`) and `attach(symbol, name, depth)` (holder
 * `clips[name]` with the symbol as its `clip`). All three exist only once the load arrived and that frame ran.
 */
export type LayerSwf = MovieClip & {
  clips?: MovieClip;
  attach?(symbol: unknown, name: string, depth: number): MovieClip | undefined;
  clear?(): void;
};

export class BattleFieldContainer extends MovieClip {
  declare Interaction: MovieClip;
  declare Ground: LayerSwf;
  declare Object1: LayerSwf;
  declare Object2: LayerSwf;
  declare Selection: MovieClip;
  declare Grid: MovieClip;
  declare Pointer: MovieClip;
  /** Also read as `container.text` by Character.say/smiley (SWF 6 case-insensitive, Character.as:321,348-369). */
  declare Text: MovieClip & { maxDepth?: number };
  declare Effect: MovieClip;
  declare mask?: MovieClip;

  constructor() {
    super();
    this.init();
  }

  /** Container.as:7-47 — the three asset layers load once; later calls (clear) only empty them. */
  init(): void {
    this.createEmptyMovieClip("Interaction", 100);
    this.Interaction.createEmptyMovieClip("layer0", 100);
    this.Interaction.createEmptyMovieClip("layer1", 200);
    if (this.Ground == undefined) this.createEmptyMovieClip("Ground", 200).loadMovie(CLIPS_PATH + "ground.swf");
    else this.Ground.clear?.();
    if (this.Object1 == undefined) this.createEmptyMovieClip("Object1", 300).loadMovie(CLIPS_PATH + "objects.swf");
    else this.Object1.clear?.();
    this.createEmptyMovieClip("Selection", 400);
    this.createEmptyMovieClip("Grid", 500);
    this.Grid._alpha = 15;
    this.Grid._visible = false;
    this.createEmptyMovieClip("Pointer", 600);
    if (this.Object2 == undefined) this.createEmptyMovieClip("Object2", 700).loadMovie(CLIPS_PATH + "objects.swf");
    else this.Object2.clear?.();
    this.createEmptyMovieClip("Text", 800);
    this.createEmptyMovieClip("Effect", 900);
  }

  /** Container.as:48-62 — `w`, `h` in cells (Map.build passes width−1, height−1). */
  applyMask(w: number, h: number): void {
    const m = this.createEmptyMovieClip("mask", 2);
    m.beginFill("0x000000", 100);
    m.moveTo(0, 0);
    m.lineTo(w * 53, 0);
    m.lineTo(w * 53, h * 27);
    m.lineTo(0, h * 27);
    m.lineTo(0, 0);
    m.endFill();
    this.setMask(this.mask);
  }

  /** Container.as:63-71 — centre in the 742×432 viewport above the banner. */
  centerMap(): void {
    const sx = this._xscale / 100, sy = this._yscale / 100, map = deps.DATACENTER.Map;
    this.setXY((742 - 53 * sx * (map.width - 1)) / 2, (432 - 27 * sy * (map.height - 1)) / 2);
  }

  /** Container.as:72-92 — only maps wider than 15 AND taller than 17 cells are scaled to fit. */
  zoomMap(): void {
    const w = deps.DATACENTER.Map.width - 1, h = deps.DATACENTER.Map.height - 1;
    if (w > 15 && h > 17) this.zoom(h > w ? (742 / (53 * w)) * 100 : (432 / (27 * h)) * 100, false);
  }

  /** Container.as:93-97 */
  setXY(x: number, y: number): void {
    this._x = x;
    this._y = y;
  }

  /** Container.as:98-106 */
  showAll(bool: unknown): void {
    for (const k in this) this.show(k, bool);
  }

  /** Container.as:107-110 — a falsy `bool` toggles. */
  show(layer: string, bool?: unknown): void {
    const o = this[layer];
    if (o instanceof DisplayObject) o._visible = (bool ? bool : !o._visible) as boolean;
  }

  /** Container.as:111-114 */
  clear(): void {
    this.init();
  }

  /** Container.as:115-127 */
  zoom(f: number, bAdd: boolean = true): void {
    this._xscale = !bAdd ? f : this._xscale + f;
    this._yscale = !bAdd ? f : this._yscale + f;
    this.centerMap();
  }

  /** Container.as:128-156 — identity, or the night tint of the debug keys (Dofus.KeyListener.as:312). */
  setColor(bDefault: boolean): void {
    new Color(this).setTransform(bDefault ? { ra: 100, rb: 0, ga: 100, gb: 0, ba: 100, bb: 0 } : { ra: 38, rb: 0, ga: 38, gb: 0, ba: 60, bb: 0 });
  }
}
registerClass("Dofus::BattleField::Container", BattleFieldContainer);
