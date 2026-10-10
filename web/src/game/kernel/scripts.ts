// Timeline scripts of the code SWFs owned by the kernel, for the runtime's scriptHook (docs/runtime.md §4.6), and
// the merge of every owner's table (ui/scripts.ts, ui/screens/scripts.ts, battlefield/scripts.ts — each optional).
import type { DisplayObject, MovieClip, ScriptHook } from "../../runtime/player.ts";
import { soundSwfInit } from "./sound.ts";

type Script = (this: DisplayObject) => void;

export const kernelScripts: Record<string, Script> = {
  // modules_Sound/frame_1/DoAction.as is empty: it carries Sound.swf's #initclip blocks (sound.ts)
  "modules/Sound.swf#0@1": soundSwfInit as Script,
  // AKSClient/DefineButton2_123/BUTTONCONDACTION on(rollOver, rollOut).as — inside `clipOver` (KERNEL.forceOver)
  "AKSClient.swf#btn123:rollOver": function () { (this as MovieClip).removeMovieClip(); },
  "AKSClient.swf#btn123:rollOut": function () { (this as MovieClip).removeMovieClip(); },
  // AKSClient/DefineSprite_80_Dofus.DataCenter/…/PlaceObject2_77_DofusDataProviderSymbol_1/on(initialize).as: `if(false){}`
  "AKSClient.swf#80@1:1:initialize": () => {},
};

/** Sibling tables, by path relative to this file; a missing file is skipped. */
const OWNER_TABLES = ["../ui/scripts.ts", "../ui/screens/scripts.ts", "../battlefield/scripts.ts"];

/** Every exported `{ key: fn }` table of the owners' scripts.ts, merged with the kernel's; a key defined twice throws. */
export async function loadScriptHook(): Promise<ScriptHook> {
  const table: Record<string, Script> = {};
  const add = (from: string, t: object) => {
    for (const [k, f] of Object.entries(t)) {
      if (!k.includes(".swf#") || typeof f !== "function") continue;
      if (k in table) throw new Error(`scriptHook: ${k} defined twice (${from})`);
      table[k] = f as Script;
    }
  };
  for (const path of OWNER_TABLES) {
    const mod = (await import(/* @vite-ignore */ new URL(path, import.meta.url).href).catch(() => ({}))) as Record<string, unknown>;
    for (const v of Object.values(mod)) if (v && typeof v === "object") add(path, v);
  }
  add("kernel/scripts.ts", kernelScripts);
  return (key) => table[key];
}
