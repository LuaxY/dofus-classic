// Boot (docs/runtime.md §4.6): Player with the merged scriptHook, AKSClient.swf as the root library, then the
// AKSClient #initclip order: classes registered (module imports) → Dofus.Kernel.Init → Events.AKS* → Kernel.Start.
// Kernel.init then loads modules/Interfaces.swf (→ lang → login screen) and modules/Sound.swf (→ SOMA).
import type { SwfLoader } from "../../swf/render.ts";
import { type AudioBackend, Player } from "../../runtime/player.ts";
import { G } from "../globals.ts";
import "./ank.ts"; // ank::SWFLoader linkage
import { installEvents } from "./events.ts";
import { kernelInit, kernelStart } from "./init.ts";
import { loadScriptHook } from "./scripts.ts";
import "./sound.ts"; // Dofus::Sound::* linkages

/**
 * Modules of the other trees whose import registers their classes (Object.registerClass): the battlefield entry;
 * ui/scripts.ts and ui/screens/scripts.ts register theirs when loadScriptHook imports them. Literal import() so the
 * production build bundles them; imported tolerantly, failures are logged.
 */
const SIBLING_MODULES = { "../battlefield/battlefield.ts": () => import("../battlefield/battlefield.ts") };

export interface BootOptions {
  loader: SwfLoader;
  createCanvas?: (w: number, h: number) => { getContext(type: "2d"): unknown };
  audio?: AudioBackend;
  /** WebSocket URL for AKS.connect (`replay:<fixture>` with the replay harness). */
  serverURL?: string;
}

export async function boot(o: BootOptions): Promise<Player> {
  const missing: string[] = [];
  for (const [m, load] of Object.entries(SIBLING_MODULES)) {
    await load().catch((e: unknown) => missing.push(`${m}: ${(e as Error).message.split("\n")[0]}`));
  }
  if (missing.length) console.info("boot: modules not loaded —\n  " + missing.join("\n  "));
  const scriptHook = await loadScriptHook();
  const p = new Player({ loader: o.loader, createCanvas: o.createCanvas, audio: o.audio, scriptHook });
  p.root.$replaceContent(await p.load("AKSClient.swf"));
  kernelInit();
  G.AKS.serverURL = o.serverURL;
  installEvents(G.AKS);
  kernelStart();
  p.runQueue();
  return p;
}
