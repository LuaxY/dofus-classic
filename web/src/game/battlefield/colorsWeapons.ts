// AKSClient/Dofus.CharactersColors.as (`_global.CCOLORS`) and AKSClient/Dofus.CharactersWeapons.as (`_global.WEAPONS`),
// instantiated by Kernel.Init (Dofus.Kernel.Init.as:66-67, owner C). The sprite SWFs call back into them from their
// own timeline scripts: `cColors.applyColor(<child>, zone)` and `WEAPONS.applyWeapon(this, "R"|"L")`
// (docs/logic/characters.md §5). `cColors` reaches `_global.CCOLORS` through the AVM1 interpreter's case-insensitive
// global lookup (runtime/avm1.ts getVar → findKey over `_global`'s own names), so only `G.CCOLORS` must be set.
import { getGuildText } from "../../core/lang.ts";
import { str, toNumber } from "../../core/swf6.ts";
import { Color, DisplayObject, MovieClip } from "../../runtime/player.ts";
import { deps } from "./deps.ts";

/**
 * Flash: a reference to a removed clip has `_target == undefined`; the runtime keeps a JS reference whose `_target`
 * still reads a path, so "gone" is the removed flag.
 */
const gone = (o: unknown): boolean => !(o instanceof DisplayObject) || o.$.removed;
/**
 * `for (k in characters)` order. AVM1 enumerates the most recently added property first (same assumption as
 * core/pathfinding.ts selectBest); JS keeps insertion order, so walk it backwards. Matters only when two registered
 * paths are prefixes of the same clip.
 */
const keysAvm1 = (o: object) => Object.keys(o).reverse();

interface ColorEntry {
  obj: DisplayObject;
  color1?: unknown;
  color2?: unknown;
  color3?: unknown;
}

export class CharactersColors {
  characters: Record<string, ColorEntry> = {};

  /** CharactersColors.as:6-10 */
  addCharacter(obj: unknown): void {
    if (gone(obj)) return; // AS: stores {obj: undefined} under "", which garbageCollector drops at once
    this.characters[(obj as DisplayObject)._target] = { obj: obj as DisplayObject };
    this.garbageCollector();
  }

  /** CharactersColors.as:11-21 */
  garbageCollector(): void {
    for (const o of keysAvm1(this.characters)) if (gone(this.characters[o]!.obj)) delete this.characters[o];
  }

  /** CharactersColors.as:22-38 — `-1` keeps the sprite's own colour for that zone; an unknown target is a no-op. */
  setColor(objName: string, color1: unknown, color2: unknown, color3: unknown): void {
    const c = this.characters[objName];
    if (!c) return;
    if (color1 != -1) c.color1 = color1;
    if (color2 != -1) c.color2 = color2;
    if (color3 != -1) c.color3 = color3;
  }

  /**
   * CharactersColors.as:39-58 — first registered clip whose path prefixes `obj._target` and has `color<zone>`: flat
   * fill of that colour (multipliers 0, offsets = RGB, alpha ×100 %). A colour stored as NaN (createCharacter with no
   * colour: `Number("0x")`) is not undefined, so it paints black, as in the AS.
   */
  applyColor(obj: unknown, zone: unknown): void {
    if (!(obj instanceof DisplayObject)) return; // AS: undefined._target.substring → undefined, never equal
    const objName = obj._target;
    for (const k of keysAvm1(this.characters)) {
      const col = this.characters[k]!["color" + str(zone) as "color1"];
      if (objName.substring(0, k.length) == k && col != undefined) {
        const n = toNumber(col);
        // AS passes ra/ga/ba/aa/ab as strings ("0", "100"); Color.setTransform converts with Number().
        new Color(obj).setTransform({ ra: 0, rb: (n & 0xff0000) >> 16, ga: 0, gb: (n & 0xff00) >> 8, ba: 0, bb: n & 0xff, aa: 100, ab: 0 });
        break;
      }
    }
  }
}

interface WeaponEntry {
  obj: DisplayObject;
  data?: { weapon?: { gfx?: string } };
}

export class CharactersWeapons {
  characters: Record<string, WeaponEntry> = {};

  /** CharactersWeapons.as:6-10 */
  addCharacter(obj: unknown): void {
    if (gone(obj)) return;
    this.characters[(obj as DisplayObject)._target] = { obj: obj as DisplayObject };
    this.garbageCollector();
  }

  /** CharactersWeapons.as:11-21 */
  garbageCollector(): void {
    for (const o of keysAvm1(this.characters)) if (gone(this.characters[o]!.obj)) delete this.characters[o];
  }

  /** CharactersWeapons.as:22-25 */
  setData(objName: string, characData: WeaponEntry["data"]): void {
    const c = this.characters[objName];
    if (c) c.data = characData;
  }

  /**
   * CharactersWeapons.as:26-50 — linkage `data.weapon.gfx` ("<type>_<gfx>"), else the LOCAL PLAYER's guild first
   * weapon type + "_1" (AS bug: not this character's guild; without lang `w` it is "_1", which attaches nothing).
   * `attachMovie` resolves in the sprite SWF's own library, so only the weapon that sprite imports can show.
   */
  applyWeapon(obj: unknown, side: unknown): void {
    if (!(obj instanceof MovieClip)) return;
    const objName = obj._target;
    for (const name of keysAvm1(this.characters)) {
      const c = this.characters[name];
      if (objName.substring(0, name.length) == name && c != undefined) {
        const gfx = c.data?.weapon?.gfx;
        const linkage = gfx == undefined ? str(getGuildText(deps.DATACENTER.Player.data?.guild).w?.[0]) + "_1" : gfx;
        (obj.clip as MovieClip | undefined)?.removeMovieClip?.();
        obj.attachMovie(linkage, "clip", 10);
        (obj.clip as MovieClip | undefined)?.gotoAndStop?.(side as string);
        break;
      }
    }
  }
}
