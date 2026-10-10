// Small AKSClient helpers: __Packages/ank/{Timer,SWFLoader,Extensions}.as, ank.SWFLoader.as (linkage), and the
// prototype extensions Array.indexOf.as, Object.copyValues.as, String.getAddLeftChar.as as plain functions —
// installing them on the JS built-ins would change every JS caller (Array.prototype.indexOf returning null…).
import { clearInterval, MovieClip, registerClass, setInterval } from "../../runtime/player.ts";
import { G } from "../globals.ts";

/** Array.indexOf.as:1-14 — searches from the end, loose `==`, `null` when absent. */
export function indexOf(arr: readonly unknown[], value: unknown): number | null {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] == value) return i;
  return null;
}

/** Object.copyValues.as:1-9 — shallow copy of the enumerable members of `objInit`. */
export function copyValues(target: object, objInit: object): void {
  Object.assign(target, objInit);
}

/** String.getAddLeftChar.as:1-13 — left-pad with `char` up to `size` (`"7"` → `"007"`). */
export function getAddLeftChar(s: string, char: string, size: number): string {
  let pad = "";
  for (let i = 0; i < size - s.length; i++) pad += char;
  return pad + s;
}

/**
 * __Packages/ank/Extensions.as:7-19 — installs `MovieClip.prototype.attachClassMovie` (in the runtime) and the
 * array-aware `String.prototype.replace` (core/lang.ts `getText` does that replacement itself). Nothing left to
 * install; kept for Kernel.Start. AS quirk (never sets `bExtended`) is irrelevant here.
 */
export const Extensions = { bExtended: false, addExtensions: (): boolean => true };

type TimerObj = object & { __ANKTIMERID__?: number };

/** __Packages/ank/Timer.as — one-shot timer bound to `obj`; a newer timer on the same object replaces it. */
export const Timer = {
  _IDs: [] as [TimerObj, number | undefined][],
  /** :9-15 */
  setTimer(obj: TimerObj, fn: (...a: never[]) => unknown, interval: number, args?: readonly unknown[]): void {
    Timer.garbageCollector();
    obj.__ANKTIMERID__ = setInterval(Timer, "onTimer", interval, obj, fn, args);
    Timer._IDs.push([obj, obj.__ANKTIMERID__]);
  },
  /** :20-34 — drops timers whose object is gone (removed clip) or was re-armed. Same index skip as the AS. */
  garbageCollector(): void {
    const len = Timer._IDs.length;
    for (let i = 0; i < len; i++) {
      const e = Timer._IDs[i];
      if (!e) continue;
      const [o, id] = e;
      if (o == undefined || (o instanceof MovieClip && o.$.removed) || o.__ANKTIMERID__ != id) {
        clearInterval(id);
        Timer._IDs.splice(i, 1);
      }
    }
  },
  /** :35-48 */
  onTimer(obj: TimerObj | undefined, fn: (...a: never[]) => unknown, args?: readonly unknown[]): void {
    if (obj?.__ANKTIMERID__ == undefined) return;
    clearInterval(obj.__ANKTIMERID__);
    delete obj.__ANKTIMERID__;
    fn.apply(obj, (args ?? []) as never[]);
    Timer.garbageCollector();
  },
};

/** __Packages/ank/SWFLoader.as — loads a SWF into `swf_mc`, stops it on `_frameStart`, broadcasts onLoadComplete. */
export class SWFLoader extends MovieClip {
  declare _frameStart: number | string;
  declare _listeners: Record<string, unknown>[];
  declare swf_mc: MovieClip;

  constructor() {
    super();
    this._listeners = []; // AsBroadcaster.initialize(this)
    this.initialize(0);
  }
  addListener(l: Record<string, unknown>): boolean {
    this.removeListener(l);
    this._listeners.push(l);
    return true;
  }
  removeListener(l: Record<string, unknown>): boolean {
    const i = this._listeners.indexOf(l);
    if (i >= 0) this._listeners.splice(i, 1);
    return i >= 0;
  }
  broadcastMessage(name: string, ...args: unknown[]): void {
    for (const l of [...this._listeners]) if (typeof l[name] === "function") (l[name] as (...a: unknown[]) => void).apply(l, args);
  }
  /** :10-14 — `frame != undefined ? frame : 1`, so the constructor's 0 is kept (gotoAndStop(0) clamps to 1). */
  initialize(frame?: number | string): void {
    this.clear();
    this._frameStart = frame != undefined ? frame : 1;
  }
  /** :15-18 */
  override clear(): void {
    this.createEmptyMovieClip("swf_mc", 10);
  }
  /** :19-35 (the unused `clips/items/` test is dropped). */
  loadSWF(file: string, frame?: number | string): void {
    this.initialize(frame);
    this.swf_mc.onInitFrame = function (this: MovieClip) {
      this.gotoAndStop((this._parent as SWFLoader)._frameStart);
      (this._parent as SWFLoader).broadcastMessage("onLoadComplete", this);
    };
    this.swf_mc.loadMovie(file);
  }
}
registerClass("ank::SWFLoader", SWFLoader); // ank.SWFLoader.as:1

/** The AS2 package object `_global.ank` (AKSClient __Packages): `ank.Timer.setTimer(…)` from SmileyOverHead.as:39. */
const g = G as unknown as { ank?: Record<string, unknown> };
g.ank = Object.assign(g.ank ?? {}, { Timer, SWFLoader, Extensions });
