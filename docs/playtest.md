# Playtest: two real clients against the real server

The ported client (`web/src/`, headless on `@napi-rs/canvas`) plays complete games against the Rust server
(`server/`), driven **only through its UI**: the mouse goes over a clip and presses/releases, text is typed into a
focused input field the way the DOM editor does it, keys go through the runtime's key path. Game state is only read,
to wait and to assert. Each client is its own bun process (the runtime has process-wide singletons).

## Run

```sh
bun scripts/playtest.ts            # all seven scenarios (≈ 17 min)
bun scripts/playtest.ts fresh      # or any of: fresh reconnect disruption coverage random social polish items
```

Prerequisites: the converted assets (`web/public/assets/swf/`, `media/`), `web/public/lang/fr.json`, cargo. The script
builds `server/target/release/dofus-server` (`cargo build --release`), starts it on a random port with a scratch store
(`$TMPDIR/dofus-playtest-*`, deleted at the end), `DOFUS_TURN_MS=20000`, `DOFUS_PLACEMENT_MS=25000`, `DOFUS_SEED=7`,
then spawns the bots. Exit code 0 only if every scenario passes.

Output, per run: `web/public/assets/port-preview/playtest/<run>/`
- `playtest.log`: every step of every client with its result (one line each);
- `<scenario>/<client>/NNN-<label>.png`: the numbered screen timeline of that client (login, creation, lobby, chat,
  placement, each turn, each aim, each refused action, results, back to the lobby, failures as `FAIL-<step>.png`);
- `<scenario>/<client>/console.log`: what the client printed (runtime warnings).

## How it is built

| File | Role |
|---|---|
| `web/src/dev/headless-client.ts` | `Headless.boot()` = `main.ts`'s `boot()` with the fs loader and canvas; real-time clock (`advance(elapsed)` every 16 ms, like `requestAnimationFrame`) or the replay test's fast clock; `click` (aims at the centre, else at the first point of a grid over the bounds that the runtime's mouse target confirms), `type`, `key`, `clickCell`/`hoverCell` (a point of the cell's diamond that reaches the cell: the cell clip or a sprite forwarding to its own cell), `shot`, `dump` (display tree). Records the wire under the client (sent/received frames, never altered), runtime `console.error`s, sequencer timeouts (with the action that timed out), and frames the client's own parser drops. `replay.test.ts` uses the same helpers. |
| `web/src/dev/bot.ts` | One client: JSON steps on stdin, one JSON result per step on stdout. Steps: `login` (OK; also `expect: "refused"`), `register` (the login screen's authored "S'inscrire" button: the register frame `<account>\n+<crypt>`, `docs/protocol/account.md`; `expect: "refused"` for an existing account, `AlEe`), `characters`, `createCharacter` (guild, sex, three colours picked on the gradient, name), `selectCharacter`, `channel` (combo pick → `CJ<name>`), `chat` (Enter or Send), `waitChat`, `freeGames`, `createGame` (name, map scrolled to in the combo), `joinGame` (refresh, pick in the combo), `team` (radio button), `waitPlayers`, `start` (creator's Play / wait for placement), `place`, `fight` (policy below), `leaveResult`, `logout` (menu → Déconnexion → Oui, then closes the "connexion interrompue" box), `village` ("Retour au village" → the shared map), `addFriend` (Amis tab), random games: `playAlone` ("Jouer" → "Jouer seul"; already matched if someone was waiting), `makeTeam` ("Jouer" → "Constituer une équipe"), `invite` (pick a friend or "Aléatoire" in the list → Inviter), `invitation` (the invitee's box: Oui / Non / wait until shown / until closed), `waitCard`, `cancelCard` (a card's Annuler), `search` (Rechercher), `gift` (random result's "Ta récompense" → the shared map), social village map: `joinMap` (pick the card → "Rejoindre la carte": `PS` + `GW` → the map with my sprite drawn, never `GAx;3`), `walk` (click a cell, by default a free one 4-8 steps away by the client path-finder nearest the middle of the map → the server's `GA<n>;1;<me>`, my `GKK<n>`, my sprite standing on it), `travel` (`walk` onto a given map-change plate → my `GKK<n>`, then the expected map drawn with my sprite on my cell of its `GM`; fails if a sprite of the old map is left), `sprite` (wait until another character's sprite is drawn — its SWF loaded, not just its controller — and stands on a given cell, or until it is gone), `changeCharacter` (menu → "Changer de perso" → Oui → reconnect → character list), `toLobby` (menu → the authored "Aller aux combats" → `GX`, `GAx;3` → the multiplayer screen with the channel joined), `smiley` (banner smiley bar → a smiley → `BS`, `cS`, drawn over my sprite; with `from`, wait for the smiley over that character's sprite), `waitChat` with `bubble` (the speech bubble over the speaker's sprite), items: `inventory` (banner button → the Inventory panel), `equip` (drag the centred bag item, turned to with the carousel arrow, onto `equipement<slot>_mc` → `OM<id>|<slot>`; `slot: -1` drags it off its slot onto the info box → `OM<id>|-1`; the panel must stay open), `drop` (drag onto the drop zone → the question box → Oui → `OD<id>`, `ODK<id>`, item gone), plus `dump`, `shot`, `frames`, `click`, `wait` for ad-hoc work. |
| `scripts/playtest.ts` | Orchestrator, never loads canvas (a bun process that has loaded `@napi-rs/canvas` cannot spawn: `posix_spawn EBADF`). Exports `Bot`, `bots`, `enter`, `duel`, `startServer`, `stopServer` behind an `import.meta.main` guard, so an ad-hoc driver is a few lines: `import { bots, enter, duel, startServer } from "./playtest.ts"` (it must build the server itself first). |

**Fight policy** (`fight` step): the bot plays every one of its turns until the result panel shows (or it leaves).
Each turn: cast the `want` spells in order when the client accepts the aim (self spells on its own cell, free-cell
spells on the free cell nearest the enemy, others on the enemy), a close combat when `cc` and adjacent, otherwise any
attack the client accepts; else walk along the client path-finder's route toward the enemy (a scratch `PathFinding`
over the live map, never the client's own instance), keeping the AP of the next goal. Turn 1 options: `apCap`
(click a cell beyond the AP: no `GA001` may leave), `outOfRange` (aim a spell and the close combat at the enemy out of
range: no `GA300`/`GA303`, back to move mode). `idleTurns` lets the server's turn timer end a turn; `giveUpAtTurn`
uses menu → Abandonner → Oui; `say`/`hear` check the fight chat. Every action waits for the whole exchange: request
frame sent, `GA<n>;<type>;<me>` + `GAF`, the client's `GKK<n>` after the animation, the actor's sequencer idle and the
interaction re-enabled. A critical miss (`GA<n>;302` / `305` instead of `300` / `303`) counts in `misses`: the server
ends the turn, and a missed wanted spell or close combat is tried again on a later turn. After the result, an open message box (a winner's `Nouvel objet : …`, `OAKO`) is read into the
step's `award` and closed, so every scenario's winners get past it.

**What fails a step**: the step's own condition times out; the client logged an error; a sequencer timeout fired in a
running game (an awaited animation never called `end()`; timeouts outside a game, e.g. a departed fighter's `die`
cut by the return to the lobby, are noted and tolerated: that is the sequencer's own safety net); a received frame the
client's parser drops; the server refused an action the client allowed (`GAF` without `GA`); three turns in a row
without any possible action (`stalled`, with a diagnosis of positions, reach and the client's own aim verdict).
`DOFUS_TRACE_REMOVE=<regex>` makes a client log a stack whenever a clip whose name matches is removed.

## Scenarios

1. **fresh** — accounts `alice`/`bob` registered through "S'inscrire" (every scenario registers an account the first
   time it uses it in the run, then logs in with OK; the server no longer creates accounts on login); characters created
   through the accordion (Iop female, Osamodas male, different colours); select → village → multiplayer screen (bare `CJ`); both pick channel `Dofus`
   in the combo (`CJDofus`); chat both ways (Enter, then the Send button), each line checked in the other's chat log;
   A creates "Duel" on map 1426, switches team 1 → 0 (`Gt` is only sent while the game is not full,
   `AKSClient/Dofus.Client.Game.as:126-132`), B joins (lands on team 1); Play → `GPS` → `GD`/`GR` → placement, both
   click a cell; fight to a death: AP-capped move refused, spell and close combat out of range refused, a turn left to
   the timer, fight chat both ways, every class spell, close combats; results; leave (`GQ`, `GV`, two `CJ`); chat;
   second game created by B on map 53, fought to a death, results, back to the lobby.
2. **reconnect** — create, log out through the menu, wrong password refused (`AlEf`, error box), right password in the
   same client (character listed, selected), log out; server restarted on the same store; a new client: wrong password
   refused, right one, character still there.
3. **disruption** — (a) B gives up on its 2nd turn (menu → Abandonner): A gets the result panel (won), B is back in
   the lobby; (b) B's process is killed (SIGKILL) during the fight: A wins and returns to the lobby; (c) B (new
   process) is killed during placement: A gets the result panel and returns to the lobby. Each time B is listed among
   A's losers. No client error anywhere.
4. **coverage** — five pairings, every class casting each of its level-1 spells (and a close combat); a pairing that
   ends before its lists are done is replayed once on a spare map; the scenario fails if any spell was never cast.
5. **random** — four players (Enutrof A, Crâ B, Féca C, Sadida D). A takes "Retour au village" to the shared
   map, then the menu's "Aller aux combats" (authored `GX`) back to the lobby. A and B "Jouer seul": B is matched at
   once with the waiting A, random 1v1 on a random map, `GameResultRandom`; the winner takes "Ta récompense" (`GQ` +
   `GC1` → shared map, then "Aller aux combats"), the loser "Quitter". C adds
   D as a friend (Amis tab), "Constituer une équipe", invites D: D says Non (`REFUSE_INVITATION` in C's chat); C
   invites again and withdraws it (D's box closes); C invites a third time, D says Oui: both see both cards; C adds an
   "Aléatoire" slot ("?" card on both sides) and removes it; C "Rechercher" (both under the search mask); A and B
   "Jouer seul" and become the other team: 2v2, results with all four names, everybody back to the lobby.
6. **social** — "Rejoindre la carte" (authored `GW`, `docs/protocol/game.md`): Sram A joins the village map, then
   Ecaflip B, after A's map is drawn, so A loads B's sprite on demand (the late `GM|+`); each sees the other's sprite
   drawn on its spawn cell; A walks, B sees A's sprite stop on the new cell, and the other way round; chat both ways
   (banner console + Enter), each line in the other's log and in a speech bubble; A walks onto the village's first
   linked map-change plate (`travel`: its `GKK`, then the next map drawn with only its own sprite, on the arrival
   plate) and B sees A's sprite go; B follows (lands next to A, whose plate is taken) and each sees the other there;
   B leaves through the menu's "Changer de perso" (back on its character list) and A sees B's sprite go; A walks on,
   plate by plate, along the shortest route to world map 591 (12 obstacle cells drawn as bare grass before the
   missing graphics were filled, `docs/assets-format.md` §11; the route is computed from `maps.json` and must have 3+
   plates).
7. **polish** — the shared map and the lobby: Eniripsa A joins with "Rejoindre la carte" (`GW`), Féca B with "Jouer"
   then "Retour au village" (a "Jouer" session, flagged at its first bounce); each sees the other's sprite; A picks a
   smiley in the banner's smiley bar and B sees it over A's sprite (`cS` to every occupant of the map); B takes the
   menu's authored "Aller aux combats" (`GX` → `GAx;3` → the multiplayer screen, `CJK`) and A sees B's sprite go;
   B's "Retour au village" brings it back next to A; then A (the `GW` session) does the same both ways.
8. **items** — Iop A beats Crâ B in a free game ("Butin") and gets the `Nouvel objet : <name>` box (B none); in the
   village A opens the inventory, finds that item in the bag, drags it onto its slot (by its type's super type),
   off the slot, back on; after "Changer de perso" the item is still in its slot; a second win ("Butin 2") adds a
   second item to the bag, which A drops (question box, Oui): one item left, still equipped.

| Pairing (A vs B) | Map | Spare |
|---|---|---|
| Iop 8 vs Osamodas 2 (scenario 1) | 1426, then 53 | |
| Féca 1 vs Enutrof 3 | 101 | 1561 |
| Sram 4 vs Xélor 5 | 161 | 1610 |
| Ecaflip 6 vs Eniripsa 7 | 504 | 57 |
| Crâ 9 vs Sadida 10 | 1594 | 1370 |
| Iop 8 vs Osamodas 2 | 1665 | 42 |
| disruption fights | 501, 505, 509 | |
| random games | picked by the server | |
| social village map | 567 (`rules.village_map`), then 555 (plate 24; below the old 0.80 bar), 554 (plate 276), 591 (plate 334) | |
| shared map ↔ lobby (polish) | 567 | |
| items: Iop 8 vs Crâ 9 | 1426 twice, then 567 | |

## Bugs found and fixed

| # | Side | Symptom | Root cause | Fix | Test |
|---|---|---|---|---|---|
| 1 | client (runtime) | After placement every fighter had a ghost copy; once it moved, the ghost stayed on the start cell (own drag sprite, and others re-built by each `GIC`) | `Characters.build` re-creates `sprite<i>` at depth `i+200000` while the previous sprite was swapped to its cell depth (`Character.as:295`); the runtime bound `parent[name]` to the newest clip. Flash resolves a name shared by several children to the first in depth order (Ruffle `ChildContainer::get_name`), so the AS keeps using the old sprite and the new one stays empty | `bindName` in `web/src/runtime/object.ts`: on add, removal, swapDepths and rename, `parent[name]` = first child with that name in depth order (a variable of that name is left alone) | `runtime.test.ts` "children sharing a name…" |
| 2 | server | A character vanished mid-fight and every later animation of it waited the 10 s sequencer timeout (fights took minutes, death animations never played) | The server always sent `inFront` 0. The client then creates spell clips at depth `cell*100+50-20+index`, which is the target character's sprite depth once the spell index reaches 20, and `createEmptyMovieClip` replaces the sprite (`AKSClient/Dofus.BattleField.Spells.as:41-58`) | `inFront` is always 1 (`server/src/fight.rs`); the unused `in_front` data field is gone; `docs/protocol/game-actions.md` explains the collision | `fight.rs` `spells_check_range_ap_and_limits_and_kill` asserts `…,11,1` |
| 3 | client (runtime) | A second close combat (or spell) while the first animation still played waited 10 s for the sequencer timeout | `Character.setAnim` replays the same label and relies on `playFirstChildren()` (`for…in` over the clip, `AKSClient/MovieClip.playFirstChildren.as`) to restart the animation clip whose frame script calls `end()` (`clips/sprites/40.swf` sprite 154 frame 9). Flash names unnamed timeline instances `instance<N>` (Ruffle `set_default_instance_name`), so `for…in` sees them; the runtime left them nameless and invisible to `for…in` | timeline-placed sprites, buttons and edit texts without a name get `instance<N>` (one counter per player, `web/src/runtime/movieclip.ts`) | `runtime.test.ts` "unnamed timeline instances are named instance<N>…" |
| 4 | server | A caster hit by reflected damage (Contre / Renvoi de sorts on its target) waited 10 s for the sequencer timeout | The reflected damage was sent as `GAx;100;<reflector>;<caster>,-n`. The client queues each game action on its actor's sequencer (`AKSClient/Events.AKS.Game.as:495-500`); the reflector's idle queue played it at once, so the caster's `hit` animation replaced its own `cast` while it was waiting for `end()` | reflected damage (and a death by it) keeps the action's actor: `GAx;100;<caster>;<caster>,-n` (`server/src/fight.rs` `damage`) | `fight.rs` `reflected_damage_is_queued_on_the_casters_actions` |

| 5 | client (port) | After "Amis", the lobby's tab area stayed empty and no tab button worked any more | `Tabs.showLayer("TabFriends")` looked up `this["TabFriends"]`; the child is `tabFriends` (swf sprite 372) and SWF 6 member names are case-insensitive. The slide never ended (`bInMove` stuck), and `showLayer` ignores calls while it is set | `getMember` (the runtime's case-insensitive lookup) in `Tabs.showLayer`/`finishMove` (and `Help.showLayer`, whose child is `HelpPLayDofusStart`), `web/src/game/ui/screens/multiplayer.ts` | `screens.test.ts` "multiplayer lobby…" (TabFriends slide ends) |
| 6 | server | (found reading the AS) "Retour au village" from a lobby or the random result's gift button would leave the client on "Chargement de la carte" | both send `GQ` + `GC1`; `GV` runs `onLeave`, which sends `CJ` (`Events.AKS.Game.as:245`) after `GC1` and before the client's `GD`; the server only answered `GD` in the village place, which the `CJ` had replaced | any `GD` outside a game answers the village map; the village leaves the channel with `CM|-` (`server/src/world.rs`) | playtest "random" (`village`, `gift`) |
| 7 | server | After a give-up or a disconnect the result panel's "Perdants" list was empty | leavers were left out of `GE` on the premise that `GM|-id` deleted their record; it does not (`setItemAt(id, undefined)` keeps the object) | leavers listed as dead losers without XP (`server/src/world.rs` `end_game`) | integration `timers_end_placement_and_turns_and_a_leaver_loses`, `kernel.test.ts`, playtest "disruption" |

Bot-side problems met on the way (not game bugs): `changeTeam` only works before the game is full (AS); the
"Connexion interrompue avec le serveur." box after a logout must be closed first (AS, `Events.AKS.as:17-42`); the
action manager is reset by `GAF` before the animations play, so "action done" is `GKK` + idle sequencer; a cell's
centre can be covered by the sprite of a character standing on the next cell, which forwards the click to its own cell;
`calculatePath` refuses movement-0 cells that `pathFind` alone would end on (a tackle-zone cell, AS `bOnthelast`
quirk), so the bot never aims a move there; the chat log keeps its last 30 lines (`Dofus.Chat.as:77-110`), so a fight
chat line is looked for while the fight goes on; a ListBox's first click only arms `clickFilter` and selects nothing
(`Ank.Dofus.ListBox.as:120-125`), so the bot clicks a friend twice like a player would; `isDied` is always false
(nothing sets `bDied`), so the bot tells living enemies by their LP (it only mattered once a 2v2 lost a fighter); the
second "Jouer seul" is matched at once (`GPS` right after `Gs`), so its lobby never shows the search mask.

Flags added: none. Bugs 1, 3 and 5 were runtime/port fidelity gaps (Flash semantics, not AS bugs); bugs 2, 4, 6 and 7
were fixed on the server so the AS code stays as it is.

## Last run

`bun scripts/playtest.ts` → `web/public/assets/port-preview/playtest/2026-10-10T23-37-26/` (exit 0, ≈ 16 min):
fresh PASS (198 s), reconnect PASS (20 s), disruption PASS (47 s), coverage PASS (413 s), random PASS (280 s), social
PASS (20 s). After the last social-only server changes (no-op walk refused, `GKE` onto an occupied cell ignored),
`bun scripts/playtest.ts social` → `…/playtest/2026-10-10T23-55-51/`: PASS (20 s); Leonard joined after Kimette's map
was drawn, and her `sprite` step found his gfx loaded and drawn on his cell (0.4 s), so a late `GM` loads its gfx on
demand. With map travel (village 567, world maps): `bun scripts/playtest.ts social` → `…/playtest/2026-10-11T00-53-32/`:
PASS (31 s), Kimette 567 → 563 (plate 115 → cell 102, `A/012-travel-563.png`), Leonard after her onto cell 88
(`B/013-travel-563.png`, `B/014-sees-Kimette.png`). With the 90-map world on the filled graphics:
`bun scripts/playtest.ts social` → `…/playtest/2026-10-11T03-51-52/`: PASS (42 s), Kimette 567 → 555 → 554 → 591
(`A/012-travel-555.png`, `A/015-travel-554.png`, `A/016-travel-591.png`), Leonard after her onto 555. Every
class cast all its level-1 spells (1: 1 2 4 · 2: 21 22 23 24 32 · 3: 41 42 43 · 4: 61 63 67 · 5: 81 82 83 84 ·
6: 101 102 103 · 7: 121 122 123 124 126 · 8: 141 142 143 · 9: 161 162 163 166 · 10: 181 182 183) and did close
combats; maps 1426, 53, 501, 505, 509, 101, 161, 504, 1594, 1665, and the random games' 1610 (1v1) and 671 (2v2). The
leaver was in the losers in all three disruption cases. No client error, no in-game sequencer timeout, no dropped
frame.

Items: `bun scripts/playtest.ts items` → `…/playtest/2026-10-11T04-00-11/`: PASS (127 s); A won "Anneau karmique"
(`A/025-result.png`), equipped it in slot 2 and back (`A/028-inventory.png`, `A/029-equipped-2.png`,
`A/030-unequipped.png`, `A/031-equipped-2.png`), found it equipped after "Changer de perso" (`A/036-inventory.png`),
won "Ceinture karmique" and dropped it (`A/057-inventory.png`, `A/058-drop-question.png`, `A/059-dropped.png`).

Shared map ↔ lobby (authored `GX`, smileys on the map, the `onLeave` `CJ` left unanswered): `bun scripts/playtest.ts
polish` → `…/playtest/2026-10-11T04-07-14/`: PASS (20 s); Ninoche sees Mialou's smiley (`B/010-smiley-of-Mialou.png`),
the menu with "Aller aux combats" (`B/011-menu-box-village.png`), Mialou sees Ninoche go and come back
(`A/010-Ninoche-gone.png`, `A/011-sees-Ninoche.png`), then the other way round (`B/014-Mialou-gone.png`,
`B/015-sees-Mialou.png`). `bun scripts/playtest.ts random` → `…/playtest/2026-10-11T04-00-46/`: PASS (312 s), back to
the lobby with "Aller aux combats" after "Retour au village" (`A/009-menu-box-village.png`) and after the gift button
(`A/030-village-from-gift.png`, `A/032-lobby-from-map.png`).

## Observations (not fixed)

- The free-game result panel shows no XP or gold, the random one does: that matches the original. `GameResultFree`
  writes name, level and alive/dead only (`modules_Interfaces/Interface.Banner.Panel.GameResultFree.as:29-33,44-48`)
  and its row symbol (`DefineSprite_942`, `…GameResult.PlayerFree`) has no `txtXP`/`txtGold`, unlike `PlayerRandom`
  (`DefineSprite_948`; `GameResultRandom.as:31-32,35-37`); the server still awards the XP and gold of a free game
  (`docs/protocol/game.md` `GE`).
- The lobby's channel combo shows the random game's name `getText("RANDOM")` as "Al☐atoire": its font has no "é"
  glyph (the other labels show it). Font coverage of the embedded font, not the protocol.
- `docs/runtime.md` §3 should state the shared-name rule of bug 1 and the `instance<N>` names of bug 3 (runtime owner).
- The creation screen's spell bar asks for `clips/spells/icons/{49,50,184,185,186,187,188}.swf` (`GUILD_SPELLS` of
  Enutrof and Sadida); they are missing from `dofus-5b/` itself (asset gap, logged by the bots).
