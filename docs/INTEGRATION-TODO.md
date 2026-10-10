# Integration wave — collected issues (orchestrator notes)

Collected from wave-2 agent reports; resolve after all wave-2 agents finish. Resolution notes (integration agent) in
_italics_.

- [x] **Runtime internal names clash with AS methods** (B1): `setSize(axis,v)`, `draw(ctx,cx)`, `remove`, `unload`.
      Root fix: rename runtime internals (`$setSize`, `$draw`, …) in `web/src/runtime/`, then delete
      `SetSizeClip`/`isRenderCall` workarounds in `web/src/game/ui/framework.ts`, `interface.ts`, `ank.ts`, and B2/A usages.
      _Every non-AS member of DisplayObject/MovieClip/Button/Graphic/TextField is `$`-prefixed (also `build`,
      `setState`, `dec`, `layout`, `goto`, `advance`, …: `Map.as:43` sets `this.dec`). Workarounds deleted
      (SetSizeClip, isRenderCall, the draw overloads of INTERFACE/ColorPicker/GuildSpellBar/Pointer, the merged
      `remove` of DialogBubble/SmileyOverHead); `Effects.unload` ported under its name. docs/runtime.md §4._
- [x] **Removed clips keep live references** (B1): Flash makes members of removed clips undefined; listeners that
      outlive their clip need `if (this.$.removed) return`. Consider a runtime-level fix (Key/Mouse listeners on
      removed clips ignored).
      _`call()` (runtime/object.ts) skips removed clips for Key, Mouse, Selection, TextField listeners and focus
      handlers; the guards in boxWhisper and Interface.Cursor are gone. Stale reads: see soft references below._
- [x] **No `TextField.addListener`/`watch`** in runtime; B1 worked around in ScrollBar `setScrollTarget`.
      _`TextField.addListener/removeListener` (onChanged on user edits, onScroller); ScrollBar uses it as the AS does.
      `Object.watch` stays unsupported (own text/htmlText accessors, runtime.md §5). Also fixed: user edits fired
      `onChanged` twice._
- [x] Merge all `scripts.ts` records in C's scriptHook; assert no duplicate keys.
      _`loadScriptHook` throws on a key defined twice (519 keys today, none duplicated)._
- [x] B1 needs from siblings: KERNEL `KeyListener.setEnabled`, `quit`, `giveUpGame`, `disconnect`; AKS `connect`,
      `Account.getCharacters`, `Account.addFriend`, `Chat.send`; DATACENTER `Player.login/password`,
      `Player.data.removeListener`, `Game.isRunning`; SOMA volume/mute getters/setters; BATTLEFIELD `Container._xscale`.
      _All present._
- [ ] Decide: delete `vendor/archive-dofus-1/downloads/` installers (user's call).
- [x] `core/lang.ts` types don't match reconstructed `fr.json` (spell `l1` numbers at [2]/[3], `cc` array, effects
      without `c`) — tighten types to the real shape; boot loads `/lang/fr.json` via `setLangData` (D).
      _`l<n>: [string, string, number?, number?]`, `cc: string | (number | null)[]` ("?" fallback), `c?`; casts removed._
- [ ] Ask user the content questions in `docs/content-reconstruction.md` §7 (spell names/ids, close-combat dice, maps).
- [x] Runtime: `onInitFrame` never fires for attached library symbols (`getBytesTotal()` = 4 unless loadMovie) (A).
      _Library symbols report complete (pending loads 4/0); Character's getBytes overrides removed._
- [x] Runtime: Flash 6 **soft clip references** — a reference to a removed clip re-resolves by path to a new clip
      at the same path; runtime keeps the stale object. A worked around with a getter for `Pointer.container`.
      Root fix in runtime would remove a class of bugs (A).
      _Not implemented (would need a Proxy around every display object); documented in runtime.md §7. The
      `Pointer.container` getter stays as the pattern._
- [ ] Runtime: `registerClass` only accepts MovieClip constructors (AS `Spells`/`Effects` use `new Object()`) (A).
      _Deferred: the runtime keeps its `$` internals on the prototype chain, so a faithful version means splitting
      MovieClip into core + AS API. With the `$`-rename the only concrete harm (`Effects.unload`) is gone. runtime.md §7._
- [x] Runtime internal name clashes also include `fire`, `bounds` (A) — fold into the `$`-rename.
- [x] Range/area shading on map 507 spills onto cells outside the room (pointer preview) — check vs Flash mask
      semantics.
      _No deviation: Pointer.as draws the staircase with no active-cell test and the only clip is the Container's own
      rect mask (stage 159,67.5 → 583,364.5 on map 507), which the port applies; the spill lies inside it._
- [x] Map build races asset load: `Map.build`/`Container.clear()` need ground.swf/objects.swf loaded; in the
      browser they're fetched — preload before the first `GDM` (C/A).
      _Client.receive holds server frames, in order, from a map frame on until the three layer SWFs ran frame 1
      (port addition; the loads already start at boot, Kernel.Init → Container.init). Test in kernel.test.ts._
- [x] Test isolation: bun runs test files in one process; shared `_global`/runtime state makes B2's
      `screens.test.ts` fail when run with others. Reset state per file or run per-dir.
      _ui.test.ts deleted B2's `loginSubstitute.draw` registration (now restored); `game/testGlobals.ts`
      `isolateGlobals()` drops what each game test file put on `_global` (stale INTERFACE seen by the next file)._
- [ ] A's `deps.ts` typed view of sibling globals can collapse to `G` once siblings land.
      _Not done (pure typing cleanup; B1's `siblings.ts` is the same pattern)._
- [x] Runtime: TextField `variable` binding is one-way (variable → field every tick); Flash also writes field
      → variable on `text`/`htmlText` assignment. Breaks `txtChat`/`chatContent` (chat log empty) (C).
- [x] B1: `FPushButtonClass.txtFormat` crashes at `controls.ts:101` (`textStyle` undefined) while building
      `Interface::MultiPlayer`; and `Interface.draw()` records the layer only after `attachMovie` returns, so a
      half-built screen is never cleared and covers the fight (C).
      _Writes to an undefined `textStyle` are skipped and the rest of txtFormat runs (SWF 6); `Interface.draw` records
      the clip in a `finally`. The screens.test.ts patch is removed._
- [x] Core typing gaps: `PathFindingDataCenter.guild` optional, `LangData` vs fr.json, `Spell.m_bInFrontOfPlayer` (C).
- [ ] Flash 6 `Number("")` for empty GA action id (UNKNOWN; JS 0 → client acks `GKK`) — check vs Ruffle/AVM1 spec.
      _Not checked._
- [x] Replay: channel join + lobby done via direct calls (B1 bug) — redo through UI once fixed.
      _Every player action in replay.test.ts is a click (or typing into a focused field) through the runtime's
      mouse path. Fixture corrections from tracing the AS: the channel combo joins with `CJ\n` (not `CJFrance`,
      Ank.Dofus.ComboBox.as:243-253), and leaving a result panel sends two `CJ`._

## Playtest wave (two headless clients against the Rust server, `docs/playtest.md`)

- [x] **Runtime: children sharing a name.** `createEmptyMovieClip`/`attachMovie` replace by depth only, so a parent can
      hold several children with one name; Flash resolves the name to the first in depth order (Ruffle
      `ChildContainer::get_name`). The runtime bound the newest one, which gave every fighter a ghost sprite after
      placement (`Characters.build` re-creates `sprite<i>` above the swapped old one). `bindName` in
      `web/src/runtime/object.ts`, test "children sharing a name…" in `runtime.test.ts`. _To add to `docs/runtime.md` §3
      (runtime owner)._
- [x] **Runtime: unnamed timeline instances are `instance<N>`** (Flash/Ruffle default names), so `for…in` —
      `playFirstChildren` & co — reaches them. Without it a replayed animation label (second close combat during the
      first) never restarted its clip and waited for the 10 s sequencer timeout. `web/src/runtime/movieclip.ts`, test
      "unnamed timeline instances are named instance<N>…". _To add to `docs/runtime.md` §3 (runtime owner)._
- [x] **Server: `inFront` always 1.** With 0 the client creates every 21st spell clip at the target's sprite depth and
      replaces the sprite (`docs/protocol/game-actions.md`); `server/src/fight.rs`, asserted in its spell test.
- [x] **Server: reflected damage keeps the caster as actor** (`GAx;100;<caster>;<caster>,-n`): the client queues each
      action on its actor's sequencer, so the reflector's idle queue played it during the cast and the caster's `hit`
      cut its `cast` animation (10 s sequencer timeout). `server/src/fight.rs`, test
      `reflected_damage_is_queued_on_the_casters_actions`.
- [x] Coordinator item: the three channel-join paths (bare `CJ` on draw, `CJ<name>` from the combo, two `CJ` after a
      result panel) are exercised through the UI by the playtest and answered `CJK<name>` (`docs/server.md`).
- [x] Placement cells authored by `scripts/server-data/maps.ts` can stand behind furniture (map 1426 cell 153) —
      data owner.
      _The script runs the client's `Map.build` headless and rejects cells where layer-2 objects of later cells (or
      the view's edges) hide more than 20 % of a standing character (`docs/server.md` "Data")._

## Gameplay polish wave

- [x] **Random games** (lobby "Jouer" → "Jouer seul" / "Constituer une équipe", invitations, "Aléatoire" slots,
      search, match-making, `GameResultRandom`): implemented on the server with `G` frames only (the `R` handlers are
      dead); `docs/server.md` "Random games", integration test `random_games_match_solo_players_and_parties`, playtest
      "random".
- [x] **Leavers in `GE`**: listed as dead losers (the client keeps their record after `GM|-id`).
- [x] **Port: lobby tabs froze after "Amis"** (`showLayer("TabFriends")` vs child `tabFriends`, SWF 6 case
      insensitivity): `multiplayer.ts` uses the runtime's `getMember`; regression in `screens.test.ts`.
- [x] **Server: `GQ` + `GC1`** ("Retour au village" from a lobby, the random gift button) raced with `onLeave`'s `CJ`:
      any `GD` outside a game answers the village.
- [x] **White tiles** (map 101 cells 308/338, 507 cell 126, …): the opaque `Dofus::Cell` diamond under bare
      line-of-sight cells, faithful to Flash. The script clears the line-of-sight bit of those cells when they are
      unwalkable and the change is neutral for every line of sight, else drops the map (1117, 740, 1490, 1493);
      `docs/server.md` "Data".
- [ ] The channel combo shows `getText("RANDOM")` as "Al☐atoire" (its embedded font has no "é") — lang/font owner.
- [x] `Interface.Multiplayer.Help.showLayer` had the same case-sensitive lookup (child `HelpPLayDofusStart`): fixed the
      same way.
