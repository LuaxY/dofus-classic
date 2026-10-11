# Game server (`server/`)

A lightweight Rust server for the Dofus beta 5b client (13 January 2004): browser tabs can log in, create
characters, chat, create or join a free game, or search a random game alone or as a team built by invitation, play a
1v1 (up to 4v4) fight to the end, then go back to the lobby.
Protocol reference: `docs/protocol/` (every frame below is documented there); client logic: `docs/logic/`.

One process, one WebSocket port, all state in memory, accounts and characters persisted to one JSON file.
Dependencies: tokio, tokio-tungstenite, futures-util, serde, serde_json.

## Run

```sh
cd server
cargo run --release                 # ws://127.0.0.1:5555 (the beta's SERVER_PORT)
cargo run --release -- 0.0.0.0:5555 # other address: first argument, or DOFUS_ADDR
```

| Env | Default | |
|---|---|---|
| `DOFUS_ADDR` | `127.0.0.1:5555` | listen address (the first CLI argument wins) |
| `DOFUS_DATA` | `server/data` | game data directory |
| `DOFUS_STORE` | `<data>/runtime/store.json` | accounts + characters (gitignored, created on first write) |
| `DOFUS_TURN_MS`, `DOFUS_PLACEMENT_MS` | from `rules.json` (30000 each) | timers |
| `DOFUS_SEED` | time | dice RNG seed |

**Pointing the client at it.** The browser client opens `connect("ws://127.0.0.1:5555", handlers)`
(`web/src/core/connection.ts`): one protocol message per WebSocket text frame, no `\0`, client frames as built by
`web/src/core/protocol.ts` (they keep their trailing `\n`). The server also splits a text frame on `\0` and strips one
trailing `\n` per message, and accepts binary frames as UTF-8, so Ruffle's XMLSocket-to-WebSocket proxy can point the
original `AKSClient.swf` at the same address.

**Accounts are created by registering.** The login screen's authored "S'inscrire" button sends the register frame
`<login>\n+<crypt>` (`docs/protocol/account.md`, authored): any login of 1-32 chars `[A-Za-z0-9._-]` with a non-empty
password creates the account and logs in (`AlKfr`), or gets `AlEe` if the account exists. Logins (OK) never create
accounts: an unknown account gets `AlEx`, like a wrong password. The server never sees the plaintext:
`ank.Crypt.cryptPassword` only reveals the low 6 bits of each (padded) password char, and even those are ambiguous
between `0`-`9`/`p`-`y` and `-`/`m`. The account stores, per padded position, a 64-bit mask of the possible values and
intersects it with what each later login (under a fresh 32-char `H` key) reveals (`server/src/crypt.rs`). Two passwords
with the same low-6-bit pattern are indistinguishable by any server. Empty passwords are refused (`AlEx`). No account
is seeded: register first (even `bo` / `pass`, the client's DEBUG default).

## Implemented, against `docs/protocol/server-checklist.md`

| Stage | Frames | Notes |
|---|---|---|
| 0. Transport | WebSocket text frames | one message per frame, never a trailing `\n`; 200-char client cap respected (a cut frame without `\n` still parses) |
| 1. Handshake & login | `H<32>` → `5` → `<login>\n<crypt>` → `AlKfr` / `AlEv` / `AlEx` / `AlEa`; register (authored) `<login>\n+<crypt>` → `AlKfr` / `AlEe` | password checked before the "already logged" test, so `AlEa` does not leak presence to a wrong password |
| 2. Characters | `PL`→`ALK|…`, `PA`→`AAK`+`ALK`/`AAE`, `PD`→`ALK`, `PS`→`ASK|…` (31 parts) | names 2-20 chars, start with a letter, no `\| ; , ~ * # < > & % " ' \ /`, unique; class 1-10; sex `0`/`1`/`""`/`undefined`; `PA` colours decimal or `-1`, `AL`/`AS`/`GM` colours hex `RRGGBB`; max 10 per account; the weapon field is empty (client draws the class default) |
| 3. Village | `GC1`→`GCK|1`, `GD`→`GDM|…|1|…` + solo `GM|+…;cell;dir` + `GAx;3;<id>` | beta 5 "ne contient que les combats": the server sends players straight to the multiplayer screen. Also reached from the lobby's "Retour au village" and the random result's gift button (`GQ` + `GC1`): `GV` makes the client send a `CJ` before its `GD`, so any `GD` outside a game answers the village |
| 3b. Social village (authored) | `PS<id>` + `GW` ("Rejoindre la carte") → `GD`→`GDM` + one `GM|+…|+…` (every occupant, itself included) and `GM|+me` to the others, no `GAx;3`; `GA001`→`GA<n>;1;<id>;…` to every occupant of its map / `GAF<id>` if refused; `GKE<n>|<cell>`; `GKK<n>` standing on a map-change plate → to the walker `GM|-<id>` per old occupant, `GM|+me` on the arrival cell, `GDM` of the next map, one `GM|+…` of its occupants; `GM|-me` to the old map, `GM|+me` to the new one; `BM*`→`cMK*` to every occupant of its map; `GM|-<id>` on disconnect or place change | 51 role-play maps linked by their plates ("World maps" below), entered on `village_map` (567), no fights; spawn on the free walkable cell nearest the middle of the map, arrival on the plate that leads back (or the free walkable cell nearest it); occupants, moves and chat per map; moves validated by `pathfinding.rs` with every occupant of the map as a blocker (as on the client, `docs/protocol/game.md` `GW`); leaving = "Changer de perso" (a new session) → "Jouer" |
| 4. Multiplayer screen | `CJ`→`CJK<name>` (+`CM|+…` to the channel), `CL`→`CLK|…`, `IP`, `IG`, `IC`, `BW`→`AW` | `CJ`/`CJundefined` rejoin the last channel (default `France`); leaving sends `CM|-name`. Verified by the playtest (`docs/playtest.md`) through the UI: the bare `CJ` of the screen's combo on draw, `CJDofus` picked in the combo, and the two `CJ` after leaving a result panel, each answered `CJK<name>` |
| Chat | `BM*`, `BM#`, `BM<name>` → `cMK*` / `cMK#` / `cMKF`+`cMKT` / `cMEn<name>` / `cMES`; `BS`→`cS` | relayed text: `|` → space, every `/##` removed; `*` = channel, game or village map (stage 3b), `#` = own team; `cS` goes to the game, or only back to the sender outside games |
| Friends | `FL`→`FLK…`, `FA`→`FAK<entry>`/`FAEf`/`FAEy`/`FAEa`, `FD`→`FDK`/`FDEf`, `Fl`→`FlK…`, `FI`/`FO` | by character name or `*account`; `FI`/`FO<account>;<character>` on character select / disconnect |
| 5. Free-game lobby | `BL`→`mL…`, `GL2`→`GLK|name;<o0><o1><count>|…`, `GC2…`→`GCK|2|…`+`GM`, `GJ2…`→`GJK|2|…`+`GM` (all members) / `GM|+` (others), `Gt`→`GtK`/`GtE`, `GQ`/`GQ<id>`→`GV`+`GM|-id` | options `AA`-`DD`, optional password; the creator leaving closes the lobby (`GV` to all); one `GM|-id` per frame |
| 6. Placement | `GS` (creator, full) → `GPS…`; `GD`→`GDM|…|0|…`; all `GR` → `GR`; `Gp<cell>` → `GIC|…` | `GIC` lists only fighters who have picked a cell (listing others would end their drag); the fight starts when everybody picked, or `placement_ms` after the `GR` broadcast (unplaced fighters get their team's first free cell) |
| 7. Fight | `GS`, `GTL|…`, `GTS<id>|<ms>`; `GA001`/`GA300`/`GA303` → `GAS<id>`, `GA<n>;…`, `GAx;…`, `GAF<id>`; `GT` or timeout → `GTF<id>`, `GTS<next>|<ms>` | see "Fight rules" |
| 5b. Random games | `GC3`→`GCK|3`+`GM`; `Gi<id>`→`GY<me>|<name>` to the invitee / `GiE<id>|<name>`; `Gi0`→`GM|+0`; `GY<inviter>`→`GiC<me>|<name>` to the inviter; `GJ3<inviter>|…`→`GJK|3`+`GM` / `GJEn`; `GU<id>`→`Gy` to the invitee, `GM|-0`, or a team-mate sent away (`GV` + `GM|-id`); `Gs`→`Gs` to the party, then on a match `GM|-0` per random slot, `GM` of every fighter, `GPS…` | see "Random games" |
| 8. End | `GE<sender>|…` (+`AN`, `ABK…|2;<gold>`), `GQ`→`GV`, then the client's `CJ` → `CJK` | leavers are listed as dead losers |
| Progression | `PB`→`ABK<id>|<stat>;<v>|3;<bonus>`, `SB`→`SUK<entry>`+`ABK…|3;<bonus>`/`SUE`, `SI`→`SI<id>|<lvl>|<ap>|<range>`, `SM` (saved, no answer) | level-ups give `bonus_per_level` points; spell boosts cost `SPELL_BOOST_BONUS[level]`; no boosts inside a game |
| Not implemented | `OM`, `OD` (no items: `ASK` part 30 empty); `GKE` in fights (moves are applied at once); `GP`, `Gc`, `GI` (no caller in the client); the `R` family (dead in the client, `docs/protocol/misc.md`) | |

Every spinner-opening request gets an answer, with documented exceptions: `GS` from a non-creator or a lobby that is
not full (the client never sends it), a refused `Gp` while nobody is placed yet (an empty `GIC|` would make the client
look up an empty id; the client only offers its own team's cells anyway), and malformed requests the real UI cannot
produce (`BS` with a non-numeric id, `Gt`/`GS`/`GR`/`Gp` outside their phase, `GA` from a fighter whose turn it is
not). Any text can reach the server through the console's `/c <raw>`; every handler treats it as untrusted (tested
with non-ASCII junk in every command).

## Fight rules (server-side, mirrored on what the client checks)

- **Turns**: order alternates teams in lobby-slot order (team 0 first); `GTS<id>|turn_ms`, ended by `GT` from the
  current player or the timer. Dead and departed fighters are skipped.
- **AP** (no movement points in this beta): each move costs one AP per cell, each spell its AP cost, close combat the
  class `cc.ap` (also sent as `ASK` part 28). The client deducts nothing itself, so every cost is broadcast as
  `GAx;102;<id>;<id>,-<n>`. A fighter's AP returns to `APinit + moderator[1]` and its timed effects tick **when its
  own turn ends** — exactly when the client runs `KERNEL.cleanPlayer(lastPlayerID)` at the next `GTS` — so AP lost
  during the opponent's turn (`GAx;101`) is missing from the victim's next turn.
- **Movement**: the server takes the destination of the client's `GA001<path>` and runs its own port of the client
  path-finder (`server/src/pathfinding.rs`, identical tie-breaking, AP-capped, occupied cells and enemy tackle zones
  respected, dead fighters still project a zone from cell 0 like on the client). The broadcast path is
  `<startCellCode><compressed tmpPath>`, i.e. it starts on the mover's current cell.
- **Spells** (`GA300<id>;<cell>`): AP, per-turn / per-target / delay limits (a verbatim port of
  `Dofus.SpellsManager.as`, `splice` bug included), range (`checkRange`, moderated by effect 19, own cell only for
  self spells), and the roll-over test of `Events.Battlefield.Interaction.as:80-118` verbatim (free-cell spells pass
  on a free walkable cell even without line of sight; others need `checkView` when `los`). Result:
  `GA<n>;300;<id>;<spell>,<cell>,<anim>,<level>,<launchType>,1`, `GAx;102`, then the effects. `inFront` is always
  1: with 0 the client puts every 21st spell clip at the target character's sprite depth and replaces the sprite
  (`docs/protocol/game-actions.md`, found by the playtest).
- **Close combat** (`GA303<cell>`): moderated range 1, adjacent walkable occupied cell, line of sight; damage =
  class `cc.dice` (+ damage moderator). `GA<n>;303;<id>;<cell>`.
- **Effects** (`spells.json`): `damage` → `GAx;100;<caster>;<t>,-<n>`; `heal` → `100` positive; `drain`;
  `ap_loss` → `101`; `ap_gain` → `121`; `push` → `5` (slide, stops at obstacles); `jump` → `4` (teleport the caster);
  `buff` → `111` (AP, effect 1) / `112` (damage, 16) / `117` (range, 19) with `<t>,<value>,<turns>`, tracked like
  `Dofus.EffectsManager.as` (remaining = turns on itself, turns − 1 on others, `splice` bug included); `reflect` →
  `107` then reflected damage as `100` with the caster as actor (`GAx;100;<caster>;<caster>,-<n>`: the client
  queues each action on its actor's sequencer, so another actor would play it in the middle of the cast); `self_damage`; `steal_gold` → `130`. Zones: `P` point, `C<n>` radius n.
- **Death**: LP 0 → `GAx;103;<actor>;<target>`; a team with nobody alive loses. Leaving a running fight (`GQ` or
  disconnect) sends `GTF` if it was that fighter's turn, then `GM|-<id>` to the others. The leaver is listed in `GE`
  as a dead loser with no XP or gold (`1;<id>;<level>;1;<low>;<xp − low>;<high>;0;0`) and still counts as an opponent
  for the XP of the others. Every `GE` id must exist on each receiver: `GM|-id` "deletes" with
  `DATACENTER.Characters.setItemAt(id, undefined)`, which keeps the record (`replaceItemAt` only sets `label`,
  `AKSClient/DofusDataProviderSymbol.as:65-98`, `Dofus.Client.Game.as:262`), so the panel shows its name
  (`web/src/game/kernel/kernel.test.ts`, integration test, playtest "disruption").
- **Results**: `GE<lastActor>|<2 winner / 1 loser>;<id>;<level>;<dead>;<lowXp>;<xp − lowXp>;<highXp>;<won XP>;<gold>`.
  XP = `xp_win_per_opponent_level` (40) or `xp_loss_per_opponent_level` (10) × sum of opponent levels, gold for
  winners; then `AN<level>|…` on level-up (max level 30) and `ABK<id>|2;<gold>`.
- No critical hits/failures (`GA` 301/302/304/305 never sent).

Action ids: numeric per game for the requested action (`GA<n>;1`, `;300`, `;303`, which the actor acknowledges with
`GKK<n>`), `x` for the side effects. A refused request of the current player gets `GAF<id>` alone (resets the
client's action manager); requests from anyone else are ignored, because `GAF` for a non-current character runs
`KERNEL.cleanPlayer` on it (AP reset, effects tick).

## Random games (state 3)

What the lobby's buttons send (`modules_Interfaces/DefineSprite_430_Interface.MultiPlayer`, tabs `S263`/`S286`, cards
`S884`/`S890`, `docs/logic/ui.md` §2.7-2.8) and what the 5b client can show in reply. The `R` handlers are dead (no
`AKS.RandomGame`), so everything goes through `G` frames:

| Button | Sends | Server |
|---|---|---|
| "Jouer" (`btnPlayDofus`) | `Fl` (TabPlayDofusStart's `onFocus`) | `FlK` of online friends |
| "Jouer seul" (`S263/PB_15`) | `GC3` + `Gs` | `GCK|3`, the creator's `GM`, `Gs` (search mask); a match later |
| "Constituer une équipe" (`S263/PB_21` → TabPlayDofus `onFocus`) | `GC3` + `Fl` | `GCK|3`, `GM` (own card), `FlK` (the friends to invite, after "Aléatoire") |
| "Inviter" (`S273/PB_5`, named `btnCancel`) | `Gi<id>` (`Gi0` for "Aléatoire") | invitee online and outside any game: `GY<me>|<name>` (its yes/no box); else `GiE<id>|<name>` (`IMPOSSIBLE_INVITATION`, card removed; also sent if the invitee disconnects before answering); `Gi0`: `GM|+0` to the party (a "?" card) |
| invitee "Non" / "Oui" (`Events.AKS.Game.as:257-269`) | `GY<inviter>` / `GJ3<inviter>|undefined` | `GiC<me>|<name>` to the inviter (`REFUSE_INVITATION`, card removed) / `GJK|3`, the party's `GM` (members and `+0` slots) to the joiner, its `GM +` to the others (waiting card → team-mate card); `GJEn` if the invitation is gone |
| "Annuler" on a waiting card (`S884/PB_6`) | `GU<id>` (+ `Fl` from `onRemoveCharacter`) | `Gy` to the invitee (its box closes); the `FlK` ends the inviter's spinner |
| "Annuler" on a card (`S890/PB_13`) | `GU<id>` | own card: leave (`GV`, `GM|-me` to the others; the creator leaving dissolves the party, `GV` to all and `Gy` to pending invitees); creator on a team-mate: `GV` to it, `GM|-id` to the others; on a "?" card: `GM|-0` |
| "Rechercher" (`S890/PB_3`, own card of the creator) | `Gs` | `Gs` to every member (search mask), pending invitations withdrawn (`Gy`) |
| search mask "Annuler" (`S285/PB_11`) | `GQ` | leave as above (`GV` → `onLeave` rejoins the channel and shows TabPlayDofusStart) |
| "Entraînement" (`btnMulti`) | free games (stage 5) | (leaves a random party first, `S430/PB_19`) |
| "Retour au village" (`btnReturn`) | `GQ` if in a game, `GC1` | village, then straight back (stage 3) |
| random result "Quitter" / "Ta récompense" (`S956/PB_11`, `PB_17`) | `GQ` / `GQ` + `GC1` | `GV` / `GV`, then the village |

**Match-making** (`World::match_random`, after every `Gs` and every departure): parties searching, oldest first; a
party's size is members + random slots. Two parties of the same size meet; the first party's random slots, the
other's, or a whole missing opposing team are filled with players searching alone (parties of one without random
slots). So "Jouer seul" meets another solo player (1v1); a team of 2 meets another team of 2 or two solo players.
On a match the parties are replaced by one game on a random map: `GM|-0` per random slot (one per frame, they remove
the "?" cards), then one `GM` frame with every fighter and its final `team`/`joinPosition` (silent while `bInSearch`:
no card, no chat user, `Events.AKS.Game.as:141-158,195`; but `team` decides which `GPS` cells are the client's own,
so team 1 clients must receive it), then `GPS`; from there the fight is a free game's (`GE` → `GameResultRandom`).
Parties are invisible to `GL2`/`GJ2` (named `#<id>`, a `#` no free-game name can contain). `BW` answers state `3` and
that name, friends see state `3` (`IN_RANDOM`), `IG` counts them as random games.

A party holds at most 4 (members + random slots + pending invitations), the client's own limit
(`DATACENTER.Game.m_playerCount == 4`, `S273/PB_5`). Only the creator invites, searches and sends cards away (the
client shows those buttons to the creator only, `TabPlayDofus_TeamMate.as:7-23`). There is no solo "training" mode in
this client: "Entraînement" is the free-game tab, and the only solo state (1, whois `4`) is the village, which the
server bounces to the lobby (unless the session sent `GW`, stage 3b).

## Data (`server/data/`)

| File | Content | Provenance |
|---|---|---|
| `maps.json` | 49 maps: `id, width, height, backgroundNum, mapData` (verbatim but for `losCleared`), `coverage`, `places` (4 cells per team), `losCleared` (cells whose line-of-sight bit was cleared), `source` | **post-beta 2004 maps** from `vendor/dofedex/maps-2004` (July 2004+), not beta 5b arena maps: 18 fully drawn by beta 5b graphics + 31 with ≥ 98 % coverage and a walkable area ≥ 40 cells. Placement cells and `losCleared` authored by the script, which runs the client's own `Map.build` headless (below). Generated by `bun scripts/server-data/maps.ts` (reproducible: `Math.random` is seeded for the objects that pick a random variant) |
| `maps.json` `world` | 51 role-play maps of the social village: `id, width, height, backgroundNum, mapData` (verbatim), `coverage`, `links` (plate cell → `[map, arrival cell]`), `source`. Not fight maps: never offered by `BL`/`GC2` or drawn for random games | same 2004 maps (coverage ≥ 80 %); `links` `retro_emulator` (`vendor/starloco/`), see "World maps". Same script |
| `classes.json` | per class: `lp`, `ap`, close combat `cc` (`ap`, `dice`), spell ids | `lp`/`ap`/`cc` authored (10); `cc` of Iop and Ecaflip `beta_sibling` (1D5 for 3 PA before 9b, v9b changelog) |
| `spells.json` | 36 spells, 5 levels each: AP, range, flags, zone, effects; `anim`, `launch_type` | spell identity: 21 `beta` (guild description SWFs, icon pixel-match), 9 `beta_forum` (8 Jan 2004 post), 6 `authored`; levels: 20 `beta`, 6 `beta_forum`, 154 `authored` (levels 2-5 mostly). Ids follow the lang reconstruction (`web/public/lang/fr.json` `S`, `docs/content-reconstruction.md`) so client tooltips and server rules agree; `anim`/`launch_type` pairings authored |
| `rules.json` | timers, XP table, level cap, bonus points, LP per level, XP/gold gains, `SPELL_BOOST_BONUS`, village map, default channel, max characters | 3 `beta` (client constants), 1 `beta_faq` (max level 30), 9 `authored` |

**Placement cells.** A character on cell n is drawn at depth n·100+50 in `Object2.clips`, so the layer-2 objects of
cells > n are drawn over it (`docs/logic/battlefield.md` §1; layer-1 objects are under every character). The script
renders each layer-2 object alone, keeps per pixel the highest cell covering it, and rejects cells where objects of
later cells or the edges of the view (the Container mask within the 742×432 area above the banner) hide more than
20 % of a standing character's body box (22×46 px above the cell centre, measured on the class sprites); `places` are
the first and last 4 remaining cells of the largest walkable line-of-sight area. Map 1426 cell 153 (behind the table)
is gone; 36 maps changed cells, e.g. outdoor maps whose first row put the heads above the view.

**White tiles.** The client attaches an opaque white `Dofus::Cell` diamond under the ground layer for every
line-of-sight cell of a fight map (`AKSClient/Dofus.BattleField.Map.as`, `Dofus.BattleField.Interaction.as:29-43`,
sprite 50 = a white diamond shape). Beta arenas drew ground over every one; these 2004 maps leave some line-of-sight
cells bare (beside the room, under furniture sticking out, wall bases), so the diamond shows: map 101 cells 308 and
338, map 507 cell 126 (the battlefield agent's case), 1426 cell 177, … — faithful to Flash given that data. The
script finds them by rendering each map with and without the Interaction layer (a cell counts when ≥ 150 visible
pixels of its ~700-pixel diamond differ; thinner slivers at wall bases stay). For each map: if a white cell is one a
character can stand on (movement ≠ 0), the map is dropped (1117); otherwise their line-of-sight bit is cleared (no
diamond, not clickable — they are unwalkable anyway) **only if** that changes no line of sight from any cell a
character can stand on to any line-of-sight cell (checked with the client's `checkView`, both ends raised by a
character's height, the most permissive case); else the map is dropped (740, 1490, 1493, whose bare cells are
inside the room). 27 maps got `losCleared`. Why clearing rather than dropping every affected map: dropping all 31
would leave 22 maps, 5 of the 19 fully covered ones; the cleared cells are unwalkable and the edit is proven
neutral for line of sight, so the only gameplay difference is that a spell can no longer target those bare cells.
The client and the map data's other cells stay verbatim.

**World maps.** Beta 5b had no world maps (no beta map data survives, `docs/missing-data-search.md` §2.2), so the
social village walks the 2004 maps. The map-change plate is object **1030** of `clips/objects.swf` (the round "sun"
tile at the map edges), usually on object layer 1, sometimes 2. Links come from the teleport cells of the StarLoco
emulator dump (Dofus Retro 1.39.8, `vendor/starloco/README.md`): 94 % of its unconditional teleports from a dofedex map
sit on a 2004 plate. `maps.ts` keeps plate p of map A → (B, c) when B has coverage ≥ 0.80 and A's size, and a walkable
plate of B within 2 cells of c teleports back to A; the arrival cell is that plate (the 1.39 destination cells are
one cell inside the plate; using them instead is a one-line change), and only links that exist both ways stay. The
largest set of maps connected this way is 51 maps of Amakna's fields and forest (sub-areas `Amakna`, `Le champ des
Ingals`, `La forêt d'Amakna`, `Le coin des Bouftous`), 136 links: 276, 279, 286, 525, 526, 530, 536, 544-546, 549-551,
554, 561, 563, 564, 566-570, 578-584, 586-600, 603, 607-609, 611, 612, 1012. `village_map` moved from 914 (not in it)
to 567, the only fully covered one, also the solo village of the "Jouer" flow. Bar choice: at 0.98 the largest set is
9 maps (a mine), at 0.85 13, at 0.80 51; their missing graphics are mostly ground 10 under background 71 (Ground sits
above the Interaction layer, so no white diamonds) and small layer-2 objects (40, 43, 125, 126, 218, 75xx): 2-14
unwalkable cells per map that draw nothing (invisible obstacles the path-finders walk around). A fallback on `mappos`
neighbours + opposite-side plates for plates without a matching teleport was measured and adds no map to the set, so
it is not implemented. Plates leading out of the set, and plates of fight maps, do nothing.

Spell entries are built by `GameData::spell_entry`: guild-tab flag `1`, element `A/W/E/F`, bar slots 1..n in class
order, criticals `a` (unused by the client). The descriptions' `PO : -1` is encoded as range 0 + `on_itself`.
Spells castable on oneself never require line of sight (`checkView` of a cell to itself is false in the client).

## Tests

```sh
cd server && cargo test && cargo clippy --all-targets -- -D warnings
bun test web/src/core/pathfinding.parity.test.ts   # rewrites server/tests/fixtures/pathfinding.json
(cd server && cargo build) && bun scripts/server-data/smoke.ts
```

- Unit (`cargo test --lib`): crypt vectors (`pass` + `abcdefghijklmnopqrstuvwxyzABCDEF` → `RFdAvFlc`,
  `dofus2004` → `iUVvgla0ikgdhqzE`) and the login verifier under new keys; map encoding round trip on all 49 maps;
  path/cell codes; pathfinding basics; turns, AP reset, AP-capped moves, spell range/AP/limits, kill, effect ticks.
- Parity (`tests/pathfinding_parity.rs`): 784 path cases (in and out of fights, AP 1-12, occupants, tackle zones of
  both teams, unreachable goals) and 490 line-of-sight cases on every map, generated by the TS client port.
- Integration (`tests/integration.rs`): the real server on a random port and two scripted WebSocket clients sending
  the exact client frames — login, double login, bad version, character creation (incl. `undefined` sex), village,
  channel, chat with `/##` stripping, whisper, friends, whois, free game create/list/join/team, placement, a full duel
  (moves computed with the client path-finder, spells, until a death), results, `CJ`/`CJundefined` back to the
  channel, persistence and a second login under a new key; a second test covers the placement and turn timers,
  malformed actions in a fight and a leaver losing (listed in `GE`); a third sends non-ASCII junk to every command and
  checks the server still answers; a fourth plays random games with four clients: two solo searches matched, a leaver
  during placement in the results, a party built by invitation (refused, withdrawn, too late, oneself, invitee
  disconnected, accepted), a
  random slot added and removed, whois state `3`, then searching and matched against the two solo players with
  consistent teams; a fifth puts two `GW` sessions on the village map (mutual `GM`, a normal session still bounced,
  moves broadcast with the stored cell following, a move onto the other's cell refused, `GKE`, chat with the sender id,
  `GM|-` on disconnect); a sixth walks one onto a map-change plate (`GM|-` to the old map, the walker's
  `GM|-`/`GM|+`/`GDM`/`GM`, `GM|+` to the new map when the second follows and lands next to the occupied plate) and
  back onto the plate it arrived on. Every server frame is validated against its documented format.
- Playtest (`bun scripts/playtest.ts`, `docs/playtest.md`): the real client, headless, one process per client, driven
  only through its UI against this server: accounts, characters, chat, free games, random games (solo and team, with
  invitations), the village, placement, full fights with every class spell, results, reconnects, give-ups and killed
  clients, the social village map (walks, chat bubbles, travel through a map-change plate, "Changer de perso").
- Smoke (`scripts/server-data/smoke.ts`): the server binary driven by `web/src/core/protocol.ts` builders; every
  received frame goes through `parseServerMessage` (none may be ignored), moves and targets come from the TS
  `PathFinding`, and any action the TS client allows but the server refuses fails the run.

## Protocol ambiguities and how they were resolved

| Question | Resolution |
|---|---|
| Password verification without a plaintext | low-6-bit candidate masks per padded position, narrowed on every login (see above) |
| What the `AlK` language suffix is | `AlKfr` (unused by the client) |
| How the player gets from the village to the multiplayer screen | `GAx;3;<id>` right after the village `GM` (only way in; beta 5 had fights only) |
| How players meet without fighting | authored `GW` after `PS` keeps the session on the village map (stage 3b); everything else there is beta frames |
| Which char `cM` uses for normal lines | `*` (anything but `F`, `T`, `#`); team = `#` |
| `m` 2nd char, `GCE`/`GJE` codes | `mL…`; `GCEn` bad/taken name, `GCEm` unknown map, `GCEo` bad options, `GCEr` unknown game type (console only); `GJEn` no such game or invitation gone, `GJEs` started, `GJEf` full, `GJEp` wrong password, `GJEa` already in a game (lang texts authored, `ERROR_CREATING_<c>`/`ERROR_JOINING_<c>` in `fr.json`) |
| `GCK|3` / `GJK|3` fields | none: the client names a random game `getText("RANDOM")` and reads no params for state 3 (`Dofus.Client.Game.as:187-190`) |
| Random team-mate slot | `Gi0` (the list's first entry "Aléatoire", data 0, `TabPlayDofus_TeamMateChoose.as:18`) adds a slot shown as `GM|+0` (the `{num:0}` placeholder, `Dofus.Client.Game.as:216-219`); removed with `GM|-0` by `GU0` or at the match |
| Who invites, searches, sends away | the party creator (the client only shows those buttons to it) |
| Reply to `GU` on a pending invitation | none to the inviter: the waiting card already removed itself and its `Fl` gets `FlK` (any frame ends the spinner); `Gy` to the invitee. A `Gi<why>` would make `onRemoveCharacter` run on a card that is gone (count and array wrong) |
| When placement ends | when every fighter has sent `Gp`, or `placement_ms` after `GR` was broadcast (i.e. once every client built the map; unplaced fighters get their team's first free cell) |
| What `Gp` answers | `GIC` of the placed fighters, to everybody (to the requester only when refused) |
| Who starts | team 0 (creator's team), then alternating |
| How AP costs reach the client | `GAx;102` after every action (the client never deducts by itself) |
| How moves are validated | server-side path-finding to the requested destination; the server broadcasts its own path (identical to the client's by parity) |
| `GKK`/`GKE` | `GKK` accepted, nothing waits on it; `GKE` ignored in fights (moves are applied at once; the client cannot cancel because `GAF` arrives first); on the village map (stage 3b) it moves the stored cell to the stop cell |
| `GE` sender and xp fields | sender = last actor still in the game; `xp` relative to `lowXp`, `highXp` absolute (the client computes `XP = lowXp + xp`) |
| Who a leaver's departure is reported to | `GM|-id` (one per frame) during lobby/placement/fight; nothing after `GE` |
| `AW` state codes | `C` channel (param = channel), `2` free game (param = game name), `3` random game (param = `#<id>`), `4` village, `?` elsewhere |
| Friend presence codes | `C` channel, `1` village, `2` free game, `3` random game, `?` multiplayer screen |
| What `PD` answers | a fresh `ALK|…` (a character currently online cannot be deleted) |

## What the client side must know

- Connect to `ws://127.0.0.1:5555`; send the strings protocol.ts builds unchanged; expect exactly one message per
  text frame and no `\n`/`\0`.
- Character ids are global integers from 1; map ids are those of `maps.json` (no names are sent: `getMapText(id)`
  falls back to `"?"` unless the lang file has them).
- After `ASK` the server expects `GC1`, then `GD`; it answers `GDM` (role-play), the solo `GM`, then `GAx;3;<id>`
  (with `GW` sent after `PS`: no `GAx;3`, the `GM` lists every player on the village map, see stage 3b)
  (draw the multiplayer screen, which sends a bare `CJ`, not `CJFrance`: the combo's callback fires before its label
  is set; leaving from the result panel sends `CJ` twice; see `docs/protocol/channel.md`).
- Free games: after `GPS` send `GD`, then `GR` once the map is built; the placement drag stops when the own entry
  appears in a `GIC`.
- Placement and turn timers run server-side (30 s each by default; placement counts from the `GR` broadcast); `GTS`
  carries the duration in ms.
- When the **current** fighter leaves, the others receive `GTF<id>`, `GM|-<id>`, then `GTS<next>`: on that `GTS` the
  client runs `KERNEL.cleanPlayer(lastPlayerID)` on an id `GM|-` already deleted. Flash ignored the `undefined`
  dereference; the TS port must guard it.
- Spells: ids, levels and bar slots come in `ASK` part 29 (`<id>~<level>~<zone>~<15 flags>`), all class spells are
  guild-tab spells; spell animations use launch types 10, 11, 30, 31 only.
- No items, no criticals; `GCE`/`GJE` codes as in the table above.
- Random games: after `GCK|3`/`GJK|3` the creator's / party's `GM`; during a search (`Gs`) the `GM` of every fighter
  then `GPS` start the fight; `GM|+0`/`GM|-0` are the random team-mate slots.
