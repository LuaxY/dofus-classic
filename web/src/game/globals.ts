// The AS `_global` singletons (AKS, DATACENTER, KERNEL, INTERFACE, BATTLEFIELD, SOMA, CHAT, CCOLORS, WEAPONS, …).
// Same object as the runtime's `_global`, so asset scripts run by the AVM1 interpreter see them too.
// Each owner adds its singleton's type from its own module (see docs/PORTING.md):
//   declare module "../globals.ts" { interface Globals { BATTLEFIELD: BattleField } }
import { _global } from "../runtime/player.ts";

// biome-ignore lint/suspicious/noEmptyInterface: augmented by each subsystem
export interface Globals {}

export const G = _global as unknown as Globals;
