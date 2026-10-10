// Test isolation: `bun test` runs every file in one process and `_global` (the game singletons INTERFACE, KERNEL,
// BATTLEFIELD…) is shared. Each game test file calls this once: what it put on `_global` is dropped after its tests,
// so the next file's Player does not find a stale singleton of the previous one. Module-level registrations made by
// the file's imports (e.g. `_global.ank`, game/kernel/ank.ts) predate the snapshot and stay.
import { afterAll } from "bun:test";
import { _global } from "../runtime/player.ts";

export function isolateGlobals(): void {
  const before = new Set(Object.keys(_global));
  afterAll(() => {
    for (const k of Object.keys(_global)) if (!before.has(k)) delete _global[k];
  });
}
