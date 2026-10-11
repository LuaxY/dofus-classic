# Server checklist: from TCP connect to a playable fight

The minimal ordered set of frames a server must send so that two beta 5b clients reach a 1v1 fight. Every step lists
what the client sends, what the server must answer, and the ordering constraint that the client code imposes.
Details per message are linked. `\0` terminators are omitted below except where noted; every server frame ends with
one `\0`, every client frame ends with `\n\0` (or just `\0` if cut at 200 chars).

Example cast: player A = account `bo`, character Bobby, id `12`, Iop (`8`); player B = character Ali, id `7`,
Osamodas (`2`). Map width `W` matters for paths; ids/cells are illustrative.

Legend: ☐ must implement · (opt) optional for the first fight · **[inference]** = required by observed client logic but
not spelled out by it.

---

## 0. Transport

- ☐ TCP listen on **5555** (`AKSClient/Dofus.Kernel.Init.as:6`).
- ☐ Read: split the byte stream on `0x00`; each piece is one client message, usually ending with `\n` (strip one trailing
  `\n` if present, never require it — 200-char cap, `AKSClient/Dofus.Client.as:78-81`).
- ☐ Write: one message per frame, `message + "\0"`; never put two messages in one frame (the client dispatches on the
  first chars of each frame only, `AKSClient/Dofus.Client.DataProcessor.as:13-15`). Text is UTF-8 [SWF6 runtime].
- ☐ Reply to every client message that opens the waiting spinner (all except `FL Fl OM OD SM SI Gi GY Gs GKK GKE GT`);
  any frame closes it ([README](README.md#waiting-indicator)).

## 1. Handshake & login ([account.md](account.md))

1. ☐ On accept send `H<32 chars>` — e.g. `Habcdefghijklmnopqrstuvwxyz012345`. Nothing comes from the client before.
2. ☐ Receive `5\n` (version). Wrong version → `AlEv` (stop).
3. ☐ Receive `<login>\n<crypt>\n`; recompute `cryptPassword(storedPassword, key)` ([encodings.md](encodings.md#password-crypt))
   and compare. Fail → `AlEf` (`f` = not found / bad credentials, `owner`; or `AlEa` if already connected). Success → `AlK` (language suffix optional, unused).
3b. (opt, **authored** by this port, not in the beta client) Register: `<login>\n+<crypt>\n` in place of step 3's frame
   (`+` is outside the crypt alphabet) → store the account and answer as a successful login (`AlK`), or `AlEe` if it
   exists ([account.md](account.md#register-cs--authored-by-this-port-not-in-the-beta-client)). This server's step 3
   then never creates accounts: unknown account → `AlEf`.

## 2. Character choice

4. ☐ Client sends `PL` (start-menu "play"). Send `ALK|12;Bobby;1;0;0;80;-1;-1;-1` (or `ALK` for none).
5. (opt) `PA…` → `AAK` **then** a fresh `AL…` (client does nothing on `AAK`) **[inference]**; `PD<id>` → fresh `AL`.
6. ☐ Client sends `PS12`. Send `ASK|…` with **exactly 31 `|`-parts** ([account.md](account.md#ps--as--select-character-cs-sc)).
   Include `LP` (part 14), `AP` (15), `cc` AP cost (28) and the spells (29) the player will cast. Example:
   `ASK|12|Bobby|1|8|0|80|-1|-1|-1||0|0|100|50|6|0|0|0|0|0|0|0|0|0|0|0|0|4|141~1~Pb~1F000bd10bbcbab|`

## 3. Village (solo game, state 1)

7. ☐ Client sends `GC1` by itself after `ASK`. Send `GCK|1`.
8. ☐ One frame later the client sends `GD`. Send the map: `GDM|<id>|<W>|<H>|1|<bg>|<mapData>`
   ([encodings.md](encodings.md#map-data-gdm); real example map 507).
9. ☐ **After** `GDM`, place the player: `GM|+12;Bobby;1;8;0;80;-1;-1;-1;;<cell>;<dir>` — the solo layout puts the cell in
   field 10 ([game.md](game.md#gm--characters-entering--leaving-the-current-game-sc)). Without it the sprite has no
   cell (`ASK` carries none).
10. (opt) Village movement: client `GA001<codes>` → server `GA<n>;1;12;<startCode><codes>`; the client answers `GKK<n>`
    after walking ([game-actions.md](game-actions.md)).
10b. (opt, **authored** by this port, not in the beta client) Social village: `GW` right after `PS12` (no spinner, no
    reply) flags the session. Its `GD` gets `GDM`, then one `GM|+<every occupant>|…` (itself included, solo layout), and
    the others get its `GM|+`; no step 11. Moves as in step 10, broadcast to every occupant (no `GAS`/`GAF`; refused →
    `GAF12` to the mover alone), `GKE<n>|<cell>` moves its stored cell, `BM*` → `cMK|12|Bobby|…` to every occupant,
    `GM|-12` to them when it leaves ([game.md](game.md#gw--stay-on-the-village-map-cs-authored-not-in-the-beta-client)).
    `BS3` → `cS12|3` to every occupant.
10c. (opt, **authored** by this port, not in the beta client) Back to the lobby: `GX` (banner menu "Aller aux combats",
    no spinner) from a session on the village map → `GM|-12` to the other occupants, then `GAx;3;12` (step 11); ignore it
    anywhere else. The session stays flagged, so a later `GC1` + `GD` lands on the map again
    ([game.md](game.md#gx--leave-the-village-map-for-the-multiplayer-screen-cs-authored-not-in-the-beta-client)).

## 4. Into the multiplayer screen

11. ☐ Send `GAx;3;12` (game action type 3, actor = player) when the player should leave the village (only way in, besides
    leaving a running fight). The client draws `Interface::MultiPlayer`.
12. ☐ The channel combo sends `CJFrance` (or another name; possibly `CJ` empty, see [channel.md](channel.md)). Send
    `CJKFrance`. The client then sends `CL`; send `CLK|Bobby;1;80|…`. (opt) `CM|+name;lvl;gfx` / `CM|-name` to others.

## 5. Free-game lobby (state 2)

13. ☐ Free-game tab sends `BL` and `GL2`. Send `mL<mapId>|<mapId>…` (2nd char free) and `GLK|<name>;<o0><o1><count>|…`
    (or `GLK` for none).
14. ☐ A creates: `GC2Duel|<mapId>|AA|<pw>`. Send to A: `GCK|2|Duel|<mapId>|AA`, **then** `GM|+12;Bobby;1;8;0;80;-1;-1;-1;;<LP>;0;0`
    (multiplayer layout: LP, team, joinPosition). Order matters: `GCK`/`GJK` wipe all other characters and the game state.
15. ☐ B joins: `GJ2Duel|<pw>`. Send to B: `GJK|2|Duel|<mapId>|AA`, then `GM|+12;…;<LP>;0;0|+7;Ali;1;2;0;20;-1;-1;-1;;<LP>;1;1`.
    Send to A: `GM|+7;…;<LP>;1;1`. Every member, including the receiver itself, needs a `GM +` entry: `isFull` counts them
    and `GS` is only sent when full (`AKSClient/Dofus.DataCenter.Game.as:33-37`, `AKSClient/Dofus.Client.Game.as:79-85`).
16. (opt) `Gt<team>` → `GtK<id>|<team>` to everybody.

## 6. Placement

17. ☐ A (creator) clicks Play → `GS`. Send to both: `GPS<team0Cells>|<team1Cells>` (2-char codes,
    [encodings.md](encodings.md#cell-lists-gps)), e.g. `GPSbKbZ|eS`. Needs: `Game.state` 2/3 and all `GM` already sent
    (the team watcher is built from them).
18. ☐ Each client sends `GD` → send `GDM|<id>|<W>|<H>|0|<bg>|<mapData>` (fight map; the allowed cells must exist on it).
19. ☐ Each client sends `GR` after building the map. When **all** have sent it, send `GR` to all → placement mode
    **[inference: "everybody is ready" semantics]**. The client puts its own sprite at cell 500 and drags it.
20. ☐ Clients send `Gp<cell>` (must be one of their team's cells; cell 500 can never be chosen). Send to all
    `GIC|12;<cell>;<dir>|7;<cell>;<dir>` with **every** player (other players' sprites are only built by `GIC`).
21. ☐ Start the fight: send `GS` to all (placement ends, interaction disabled), then `GTL|12|7` (characters must exist),
    then `GTS12|30000` (turn of 12, 30 s).

## 7. Fight loop ([game-actions.md](game-actions.md), [game.md](game.md#turns-gtl-gts-gtf-gt))

22. ☐ Move: client `GA001<codes>` → send to all `GAS12`, `GA<n>;1;12;<startCode><codes>`, an AP/MP cost if desired
    (e.g. `GAx;102;12;12,-<steps>`, the client does not deduct anything itself **[inference]**), `GAF12`. The mover
    answers `GKK<n>`.
23. ☐ Spell: client `GA300141;<cell>` → send to all `GAS12`, `GA<n>;300;12;141,<cell>,<animId>,1,<launchType>,0`,
    `GAx;102;12;12,-3` (AP spent), `GAx;100;12;7,-<dmg>` (damage), optionally `GAx;103;12;7` (death), `GAF12`.
    Close combat: `GA303<cell>` → `GA<n>;303;12;<cell>` + damage.
24. ☐ End of turn: client `GT` (or timeout) → send to all `GTF12`, then `GTS7|30000`. The next `GTS` also resets the
    previous player's AP to `APinit` client-side (`AKSClient/Dofus.Kernel.as:243-258`).
25. (opt) Wait for `GKK` before broadcasting the next action of the same actor **[inference]**.

## 8. End

26. ☐ Send to all `GE<senderId>|2;12;1;0;0;10;100;10;5|0;7;1;1;0;0;100;0;0`. `senderId` must be an existing character
    (the result panel is queued on its action sequencer) and every listed id must exist.
27. ☐ Client sends `GQ` from the result panel → send `GV`. The client (game no longer running) then sends `CJ…` again
    → step 12; the "replay" button of the random result panel sends `GQ` + `GC1` → step 7.

## Ordering constraints (summary)

| Constraint | Why (code) |
|---|---|
| `H` before anything | `logon` runs from `onConnect(true)`, triggered by `H` only (`AKSClient/Events.AKS.as:3-6`) |
| `ASK` has exactly 31 parts | `AKSClient/Dofus.Client.DataProcessor.as:157` |
| `GDM` before `GM` (solo) and before `GIC` | sprites read `DATACENTER.Map.data[cell].x/y` |
| `GCK`/`GJK` before that game's `GM` | they reset `DATACENTER.Game` and delete other characters (`AKSClient/Dofus.Client.Game.as:138-142,168-172`) |
| one `GM -` removal per frame | removal id always read from part 1 (`AKSClient/Dofus.Client.Game.as:249`) |
| all `GM +` before `GPS` | team watcher built from `Game.players` (`AKSClient/Events.AKS.Game.as:317-332`) |
| `GR` (server) after the client's `GR` | `onEverybodyIsReady` is installed by `onMapLoad` just before the client sends `GR` (`AKSClient/Events.Battlefield.Map.as:10-51`) |
| `GTL`/`GTS`/`GA`/`GE` ids exist | lookups in `DATACENTER.Characters` |
| `GA` params without `;` | only 4 `;`-fields read (`AKSClient/Events.AKS.Game.as:497-500`) |
| `GE` before `GV` for a clean return | `GE` clears `m_bRunning`; `GV` while running goes back to the multiplayer screen instead (`AKSClient/Events.AKS.Game.as:237-255`) |
