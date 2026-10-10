# Game sessions: village, lobby, map, placement, turns, end (`G` family + `BL`/`m`)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Game.as`, callbacks
`AKSClient/Events.AKS.Game.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:229-380`.
Game actions (`GA`, `GAS`, `GAF`, `GK`) are in [game-actions.md](game-actions.md).

## Game states

`DATACENTER.Game.state` (`AKSClient/Dofus.DataCenter.Game.as`) is set by `GCK`/`GJK` only:

| state | Constant (`AKSClient/Dofus.Client.Game.as:6-9`) | Meaning | `isMultiplayer` / `isFight` (`state > 1`, `AKSClient/Dofus.DataCenter.Game.as:38-57`) |
|---|---|---|---|
| 1 | `STATE_SOLO` | the village / single-player map (`createSolo`) | false |
| 2 | `STATE_FREE` | free (named, optional password) multiplayer game | true |
| 3 | `STATE_RANDOM_TEAM` | random-team match-making | true |
| 0 / null | `STATE_UNKNOWN` | no game | false |

`isFull` = `m_playerCount >= m_maxPlayerCount` (`AKSClient/Dofus.DataCenter.Game.as:33-37`); `m_playerCount` is incremented by each
`GM +` and decremented by each `GM -` while multiplayer (`AKSClient/Events.AKS.Game.as:118-127`); `m_maxPlayerCount` comes from
the game options string.

**Game options string** (2 chars): `chr(64+n0) chr(64+n1)` = team 0 size, team 1 size. The UI only offers
`AA`, `BB`, `CC`, `DD` = 1v1 … 4v4 (`modules_Interfaces/DefineSprite_345/frame_1/PlaceObject2_244_Ank.Dofus.ComboBox_32/CLIPACTIONRECORD on(initialize).as:3-12`).
Max players = `(c0-64)+(c1-64)` (`AKSClient/Dofus.Client.Game.as:184`); label `n0 VERSUS n1` (`AKSClient/Events.AKS.Game.as:83`).

---

## GC — create a game (C→S, S→C)

C→S, three variants:
```
GC1\n\0                                               solo / village   (createSolo, Dofus.Client.Game.as:33-36)
GC2<gameName>|<mapId>|<options>|<password>\n\0        free game        (createFree, :28-32; type forced to 2)
GC3\n\0                                               random team      (createRandom, :37-43; not sent if already random)
```
No separator between the type digit and `gameName`. Fields are not escaped (`|` in a name breaks the split).

Triggers: `GC1` — automatically after `ASK` (`AKSClient/Events.AKS.Account.as:12`), "return to village" button
(`modules_Interfaces/DefineSprite_430_Interface.MultiPlayer/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_13/CLIPACTIONRECORD on(release).as:1-7`,
preceded by `GQ` if in a multiplayer game), random-result "replay" button
(`modules_Interfaces/DefineSprite_956_Interface.Banner.Panel.GameResultRandom/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_17/CLIPACTIONRECORD on(release).as:2-3`,
`GQ` then `GC1` via `CreateSolo` = `createSolo` under SWF6 case-insensitivity). `GC2` — "Creer" button of the free-game tab, only with a
non-empty name; `mapId` = selected map (from `m`), `options` = combo data, password may be empty
(`modules_Interfaces/DefineSprite_345/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_71/CLIPACTIONRECORD on(release).as:1-9`).
`GC3` — random tab focus / "play duel" button (`modules_Interfaces/DefineSprite_286/frame_1/DoAction.as:16-20`,
`modules_Interfaces/DefineSprite_263_TabPlayDofusStart/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_15/CLIPACTIONRECORD on(release).as:2`).

S→C:
```
GCK|<state>|<gameName>|<p0>|<p1>|…\0
GCE<code>\0
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:232-249`: split on `|`; `state = Number(part1)`, `name = part2`, `params = parts[3..]`;
on OK `DATACENTER.Channel.m_name = null`. `innerOnCreate` (`AKSClient/Dofus.Client.Game.as:133-162`) always first resets
`DATACENTER.Game`, the player's AP (`initAP(false)`), spell and effect managers, and **removes every other character**
from `DATACENTER.Characters`.

| state | What the client does | Params used |
|---|---|---|
| 1 | `Game.state = 1`, `currentPlayerID = player`, `onCreateSolo` → player interface (banner), next frame **sends `GD`** (`AKSClient/Events.AKS.Game.as:1-13`) | none (minimal frame `GCK\|1`) |
| 2 | handled as a join with `bCreator = true` (see `GJK`): `Game.m_name = gameName`, max players from `p1`, lobby tab with the Play button visible | `p0` = mapId, `p1` = options |
| 3 | handled as a join with `bCreator = true`: `Game.m_name = getText("RANDOM")`, team-mate chooser visible, tab `TabPlayDofus` (`AKSClient/Events.AKS.Game.as:103-112`) | none |

Error: `GCE<code>` → `innerOnCreate(false,null,null,charAt(3))` → state `Number(null) = 0` → chat
`ERROR_CREATING_GAME : ` + `getText("ERROR_CREATING_" + code)` (`AKSClient/Events.AKS.Game.as:54-64`). Only the 4th char is the
code. Code values — **UNKNOWN — not in code** (lang keys missing).

Examples: `GCK|1\0`, `GCK|2|MaPartie|12|AA\0`, `GCK|3\0`, `GCEn\0`.

---

## GJ — join a game (C→S, S→C)

C→S:
```
GJ<type><gameName>|<password>\n\0
```
`AKSClient/Dofus.Client.Game.as:71-74`. Triggers:
- Free game "Rejoindre": `GJ2<name>|<password>` where `name` is the combo label cut at `" ("`
  (`modules_Interfaces/DefineSprite_345/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_92/CLIPACTIONRECORD on(release).as:1-11`).
- Accepting a random-team invitation: `AKS.Game.join(3, characID)` → `GJ3<inviterCharacterId>|` + `undefined`
  (`AKSClient/Events.AKS.Game.as:259-262`). The password is `undefined`; string coercion gives `""` under SWF6 rules
  [SWF6 runtime]. **Accept both `GJ3<id>|` and `GJ3<id>|undefined`.**

S→C:
```
GJK|<state>|<gameName>|<mapId>|<options>\0
GJE<code>\0
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:250-267` → `innerOnJoin(true, name, state, params, false)` (`AKSClient/Dofus.Client.Game.as:163-195`):
resets like `GC`, then:
- state 2: `Game.state=2`, `m_name`, `m_maxPlayerCount` from `options` → `onJoin(true, params, bCreator)`
  (`AKSClient/Events.AKS.Game.as:65-102`): lobby tab `TabGameJoined`, Play button visible only for the creator, shows game
  name / map name (`getMapText(mapId).n`) / `n0 VERSUS n1`, map preview `http://jouer.dofus.com/files/maps/<mapId>.swf`
  (`modules_Interfaces/Interface.MapImage.as:13`), the password typed locally (`AKS.Game.tmpPassword`), and
  `m_maxPlayerCount` empty player slots `player0..` (rows 16 px apart). Clears the chat.
- state 3: `m_name = RANDOM`, `onJoinRandom(bCreator)`.
- other states: nothing after the reset.

Error: `GJE<code>` → chat `ERROR_JOINING_GAME : ` + `getText("ERROR_JOINING_" + code)` (4th char). Codes **UNKNOWN —
not in code**.

Examples: `GJK|2|MaPartie|12|AA\0`, `GJK|3|x\0`, `GJEp\0`.

---

## BL / m — maps list (C→S, S→C)

C→S `BL\n\0` (`AKSClient/Dofus.Client.Game.as:52-55`). Trigger: free-game tab focus
(`modules_Interfaces/DefineSprite_345/frame_1/DoAction.as:5`).

S→C:
```
m<x><mapId>|<mapId>|…\0
```
Rubrique `m` (109) → `innerOnMapsList(substr(2))` (`AKSClient/Dofus.Client.DataProcessor.as:38-40`, `AKSClient/Dofus.Client.Game.as:268-273`): the 2nd
char `<x>` is skipped; its expected value is **UNKNOWN — not in code** (any char works) **[inference]**. Fills the
maps combo with `getMapText(id).n` / data = id, selects the first (`AKSClient/Events.AKS.Game.as:26-40`), which loads its
preview. Example: `mL12|15|20\0`.

---

## GL — list open games (C→S, S→C)

C→S `GL<gameType>\n\0` (`AKSClient/Dofus.Client.Game.as:24-27`); the UI always sends `GL2` (free-game tab focus and refresh,
`modules_Interfaces/DefineSprite_345/frame_1/DoAction.as:6`, `modules_Interfaces/DefineButton2_344/BUTTONCONDACTION on(release).as:2`).

S→C:
```
GL<anything>|<gameName>;<o0><o1><count>|…\0
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:271-290`: part 0 ignored; each part split on `;`: `name = f0`; from `f1`:
`maxPlayersCount = (f1[0]-64) + (f1[0]-64)` (**client bug: uses char 0 twice**, correct only for symmetric options),
`playersCount = f1[2]-64` (3rd char = player count encoded as `chr(64+n)`). Combo label `name (count / max)`, data
`name` (`AKSClient/Events.AKS.Game.as:41-53`). Fewer than 2 parts → empty list.

Example: `GLK|MaPartie;AAA|Duel;BBC\0` → "MaPartie (1 / 2)", "Duel (3 / 4)".

---

## GM — characters entering / leaving the current game (S→C)

```
GM<anything>|<entry>|<entry>|…\0
<entry> = +<characterFields>   add
        | -<characterId>       remove
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:304-306` → `innerOnMovement(fullFrame)` (`AKSClient/Dofus.Client.Game.as:196-267`). Part 0 ignored,
processing stops at the first empty part.

Add entry, split on `;` (the layout depends on `DATACENTER.Game.isMultiplayer` **at reception time**):

| # | Solo (state 1) | Multiplayer (state 2/3) | Notes |
|---|---|---|---|
| 0 | id | id | `0` → placeholder object `{num:0}`, not a character (`:216-219`) |
| 1 | name | name | |
| 2 | level | level | |
| 3 | guild | guild | class 1..10 |
| 4 | sex | sex | |
| 5 | gfxID | gfxID | sprite file |
| 6-8 | colours hex / `-1` | colours hex / `-1` | as `AS` |
| 9 | weapon `type,gfx,RRGGBB` (hex) or empty | same | as `AS` part 10 |
| 10 | **cell** | **LP** (sets `LP` and `LPmax`) | |
| 11 | **dir** | **team** `0`/`1` | |
| 12 | — | **joinPosition** `0..maxPlayers-1` (lobby slot) | |

Every entry goes through `CharactersManager.createCharacter` (`AKSClient/Dofus.CharactersManager.as:18-160`), which
creates or **overwrites** the character (it resets `items`, `weapon`, `team`, `joinPosition`, `cell`, `dir`, the
action manager; `AP`/`GP`/stats are kept unless given). Quirk: `dir` is assigned `Number(_loc1_.celdirl)` — a typo
(`AKSClient/Dofus.CharactersManager.as:134`) — so the received `dir` is lost (NaN). The sprite's initial facing therefore cannot be
set by `GM`; `GIC` and `GA` movements set it later.

Client behaviour on add (`AKSClient/Events.AKS.Game.as:113-228`):
- Solo: builds the sprite and places it on `cell` (`BATTLEFIELD.Characters.build` + `setPosition`). **The map must
  already be built** (positions come from `DATACENTER.Map.data[cell].x/y`), i.e. send `GM` after `GDM`.
- Multiplayer, game not running: `m_playerCount++`, `Game.players[id] = character`; free game → slot `player<joinPosition>`
  replaced with a filled row (name, class name `GUILD_NAMES[guild]`, level, team radio; the local player's own row gets
  clickable team radios that send `Gt0`/`Gt1`); random game → `onValidateInvitation(id)` unless searching; adds the name
  to the chat user list (unless `id == 0` or searching).
- Multiplayer, running: only the counters/maps above (no sprite; sprites are built by `GIC`).

Remove entry `-<id>`: **client bug** — the id is always taken from part 1 (`dataArray[1].substring(1)`,
`AKSClient/Dofus.Client.Game.as:249`), whatever the loop index, so **send one removal per `GM` frame** (and as the first entry).
Effects: multiplayer → `m_playerCount--`, `players.deleteItemAt`; running → chat `LEAVE_GAME` and death animation
(unless searching); lobby → slot emptied / random chooser updated, user removed from the chat list; solo → sprite
removed. The character is then deleted from `DATACENTER.Characters`.

Examples:
```
GM|+12;Bobby;3;8;0;80;FF0000;-1;00FF00;;233;1\0                     solo: Bobby on cell 233
GM|+12;Bobby;3;8;0;80;FF0000;-1;00FF00;;55;0;0|+7;Ali;5;3;1;31;-1;-1;-1;;48;1;1\0   lobby 1v1
GM|-7\0
```

---

## Gt — change team in the lobby (C→S, S→C)

C→S `Gt<team>\n\0`, team `0`/`1`, only if the game is not full (`AKSClient/Dofus.Client.Game.as:126-132`). Trigger: the team
radios of the player's own lobby row (`AKSClient/Events.AKS.Game.as:171-186`).

S→C:
```
GtK<characterId>|<team>\0
GtE…\0
```
`AKSClient/Dofus.Client.DataProcessor.as:358-370`: fewer than 2 fields or error → chat `CANT_CHANGE_TEAM`. OK → `character.team = Number(team)`
and the radio of row `player<joinPosition>` is updated (`AKSClient/Dofus.Client.Game.as:362-377`, `AKSClient/Events.AKS.Game.as:395-405`).
Example: `GtK12|1\0`.

---

## GS — start the game (C→S) / fight starts (S→C)

C→S `GS\n\0` (`AKSClient/Dofus.Client.Game.as:79-85`), only if `isFull`. Trigger: creator's Play button in `TabGameJoined`
(`modules_Interfaces/DefineSprite_309/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_3/CLIPACTIONRECORD on(release).as:2`).
The client expects the server to start placement with `GPS` **[inference]** (nothing else reacts to it).

S→C `GS\0` (any suffix ignored) → `onStartToPlay` (`AKSClient/Dofus.Client.DataProcessor.as:339-341`, `AKSClient/Events.AKS.Game.as:410-420`): end of
the placement phase — sound, hides the team watcher, shows `GAME_LAUNCH`, selection cleared, interaction type `move`
but **disabled** (`setEnabled(0)`) until the player's `GTS`.

---

## Random-team invitations: Gi, GY, Gy, GU, Gs

| Frame | Dir | Format | Code | Effect |
|---|---|---|---|---|
| `Gi<characterId>\n` | C→S | invite a friend into my random team; `Gi0` = the list's first entry `RANDOM` (data 0, `modules_Interfaces/TabPlayDofus_TeamMateChoose.as:18`), a random team-mate, whose card is the `{num:0}` placeholder of `GM +0` (`AKSClient/Dofus.Client.Game.as:216-219`, `modules_Interfaces/TabPlayDofus_TeamMate.as:25-33`) | `AKSClient/Dofus.Client.Game.as:44-47` (no spinner); trigger `onNewCharacter(...,bInvite)` after picking in `lstFriends` (`modules_Interfaces/DefineSprite_286/frame_1/DoAction.as:27-42`) | |
| `GY<inviterId>\|<inviterName>` | S→C | invitation received | `AKSClient/Dofus.Client.DataProcessor.as:374-376`, `AKSClient/Dofus.Client.Game.as:429-435` | yes/no box `DO_U_ACCEPT_INVITATION [name]`; yes → `GJ3<inviterId>\|…`, no → `GY<inviterId>` (`AKSClient/Events.AKS.Game.as:257-269`) |
| `GY<characterId>\n` | C→S | refuse an invitation | `AKSClient/Dofus.Client.Game.as:48-51` (no spinner) | |
| `Gi<why><characterId>\|<characterName>` | S→C | my invitation failed | `AKSClient/Dofus.Client.DataProcessor.as:371-373`, `AKSClient/Dofus.Client.Game.as:421-428` | removes the waiting team-mate box; `why` = `E` → `IMPOSSIBLE_INVITATION`, `C` → `REFUSE_INVITATION`, other → silent (`AKSClient/Events.AKS.Game.as:276-289`) |
| `GU<characterId>\n` | C→S | cancel my invitation (waiting card), send a team-mate away (creator), or leave (the "Annuler" of one's own card sends one's own id) — with a spinner, so it needs a reply (the waiting card's button also sends `Fl`, `DefineSprite_286/frame_1/DoAction.as:69`) | `AKSClient/Dofus.Client.Game.as:106-109`; buttons in `modules_Interfaces/DefineSprite_884_TabPlayDofus_TeamMateWaiting/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_6/CLIPACTIONRECORD on(release).as:3`, `modules_Interfaces/DefineSprite_890_TabPlayDofus_TeamMate/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_13/CLIPACTIONRECORD on(release).as:2` | |
| `Gy` | S→C | the invitation shown to me was cancelled | `AKSClient/Dofus.Client.DataProcessor.as:377-378` | closes the yes/no box (`AKSClient/Events.AKS.Game.as:270-275`) |
| `Gs\n` | C→S | start match-making search | `AKSClient/Dofus.Client.Game.as:86-89` (no spinner); "search" buttons (`modules_Interfaces/DefineSprite_263_TabPlayDofusStart/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_15/CLIPACTIONRECORD on(release).as:3`, `modules_Interfaces/DefineSprite_890_TabPlayDofus_TeamMate/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_3/CLIPACTIONRECORD on(release).as:2`) | |
| `Gs` | S→C | search started | `AKSClient/Dofus.Client.DataProcessor.as:342-344` | search mask shown, `bInSearch = true` (suppresses lobby/chat updates of `GM` until `GPS`) (`AKSClient/Events.AKS.Game.as:421-425`) |

Accepted invitations show up on the inviter's side as a multiplayer `GM +` of the invitee (→ `onValidateInvitation`).
Examples: `GY7|Ali\0`, `GiC9|Zed\0`, `Gy\0`.

---

## GQ — leave a game / kick a player (C→S) and GV — left (S→C)

C→S:
```
GQ\n\0                 leave
GQ<characterId>\n\0    kick (creator)
```
`AKSClient/Dofus.Client.Game.as:102-105`. Triggers: many leave buttons (result panels, lobby, multiplayer screen,
`KERNEL.giveUpGame`, see `AKSClient/Dofus.Kernel.as:320-328`); kick = the creator's "kill" button on a lobby row
(`modules_Interfaces/DefineButton2_873/BUTTONCONDACTION on(release).as:2`, written `aks.Game.leave(this.playerID)` —
lower-case `aks` resolves to `AKS` under SWF6 case-insensitivity [SWF6 runtime]).

S→C `GV\0` → `onLeave` (`AKSClient/Dofus.Client.DataProcessor.as:307-309`, `AKSClient/Events.AKS.Game.as:229-256`): calls `onActionsFinish(player)`,
resets `DATACENTER.Game` and the player's temporary state, then, if the game was multiplayer:
running → `KERNEL.changeToMultiplayer()` (back to the multiplayer screen); not running → `AKS.Channels.join()` (sends
`CJ` / `CJundefined`, see [channel.md](channel.md)) and shows `TabJoinGame` (free) or `TabPlayDofusStart` (random).
After `GE` the game is no longer "running" (`AKSClient/Events.AKS.Game.as:372`), so `GV` after a finished fight takes the
channel-rejoin path. Solo → nothing visible.

---

## GD / GDM / GDC — map data (C→S, S→C)

C→S `GD\n\0` (`AKSClient/Dofus.Client.Game.as:56-62`): shows `LOADING_MAP`, hides and clears the battlefield first. Sent by the
client itself one frame after `GCK|1` (`AKSClient/Events.AKS.Game.as:7-11`), after `GPS` (`:333-337`) and on `GA` type 2
(`:517-526`).

S→C full map:
```
GDM|<mapId>|<width>|<height>|<bRolePlay>|<backgroundNum>|<mapData>\0
```
Dispatch: 2nd char `D` and 3rd char `M` (`AKSClient/Dofus.Client.DataProcessor.as:310-315`) → `innerOnMapData(fullFrame)`
(`AKSClient/Dofus.Client.Game.as:274-284`): split on `|`, part 0 (`GDM`) ignored.

| Part | Field | Notes |
|---|---|---|
| 1 | `mapId` | `Number(id)`; name = `getMapText(id).n` from the lang file — **the name is not on the wire** (`AKSClient/Events.AKS.Game.as:17`) |
| 2 | `width` | cells in a long row, `Number` |
| 3 | `height` | used for centring/mask/zoom only (`AKSClient/Dofus.BattleField.Container.as:48-92`) |
| 4 | `bRolePlay` | `"1"` → true, anything else false |
| 5 | `backgroundNum` | `0` = none, else ground clip `backgroundNum` attached as background (`AKSClient/Dofus.BattleField.Map.as:49-52`) |
| 6 | `mapData` | 10 chars per cell, no separators — [encodings.md](encodings.md#map-data-gdm) |

Behaviour: `Compressor.uncompressMap` → `KERNEL.drawCurrentMap` → `BATTLEFIELD.Map.build` → `onMapLoad`
(`AKSClient/Events.AKS.Game.as:14-20`, `AKSClient/Events.Battlefield.Map.as:1-64`):
- not multiplayer: rebuilds the player's sprite at `Player.data.cell` (null after `ASK`!) and enables movement.
- multiplayer: shows `WAITING_OTHER`, installs `onEverybodyIsReady` and **sends `GR`**.

S→C single cell update:
```
GDC<cellNum>|<10 cell chars><maskHex>\0
```
→ `innerOnCellData` (`AKSClient/Dofus.Client.Game.as:285-292`): `cellNum = Number(part0.substr(3))`, cell chars =
`part1[0..10)`, mask = `part1[10..20)` parsed with `parseInt(mask,16)`; then `uncompressCell` + `Map.updateCell`
(`AKSClient/Events.AKS.Game.as:21-25`). Mask bits in [encodings.md](encodings.md#cell-update-gdc).

Example (full real frame): [encodings.md → map 507](encodings.md#worked-example-map-507). Cell update:
`GDC233|HhGieaaaaa3FFF\0`.

---

## GR — ready (C→S) / everybody ready (S→C)

C→S `GR\n\0` (`AKSClient/Dofus.Client.Game.as:90-93`), sent automatically after a multiplayer map is built
(`AKSClient/Events.Battlefield.Map.as:51`).

S→C `GR\0` → `AKS.Game.onEverybodyIsReady` (`AKSClient/Dofus.Client.DataProcessor.as:336-338`), defined only by `onMapLoad` in multiplayer
(`AKSClient/Events.Battlefield.Map.as:10-50`): sets the player's cell to **500** and builds its sprite following the mouse
(`startDrag`), highlights `allowedCells[0]` (team colour 0) and `allowedCells[1]` (colour 1), makes the player's
team cells clickable, switches to interaction type `place` and shows `PLACE_CHARACTER`. Send it once all players of the
game have sent `GR` **[inference]**.

## GPS — placement start (S→C)

```
GPS<team0Cells>|<team1Cells>\0
<teamNCells> = concatenation of 2-char cell codes: chr64(cell >> 6) chr64(cell & 63)
```
`AKSClient/Dofus.Client.DataProcessor.as:333-335` → `innerOnPositionStart(charCodeAt(2), substr(3).split("|"))` — acts only if the 3rd char is
`S` (`AKSClient/Dofus.Client.Game.as:341-347`). `onPositionStart` (`AKSClient/Events.AKS.Game.as:290-338`): decodes both lists
(`decode64(c0) << 6 + decode64(c1)`), `allowedCells = [cells0, cells1]`, `bInSearch = false`, `m_bRunning = true`,
redraws the player interface and the team watcher (from `DATACENTER.Game.players` grouped by `team` — so all `GM +`
must precede `GPS`), then **sends `GD`** next frame. Requires `Game.state` 2 or 3 for the following steps.

Example: cells 100 and 115 for team 0, 300 for team 1 → `GPSbKbZ|eS\0`.

## Gp — choose a start cell (C→S)

```
Gp<cellNum>\n\0
```
`AKSClient/Dofus.Client.Game.as:94-97`. Trigger: click on an allowed cell in `place` mode, not sent if it is the current cell
(`AKSClient/Events.Battlefield.Interaction.as:51-56`). Because `GR` forces the cell to 500, a click on 500 sends
nothing. The server answers with `GIC` **[inference]**.

## GIC — characters' coordinates (S→C)

```
GIC|<id>;<cell>;<dir>|<id>;<cell>;<dir>|…\0
```
`AKSClient/Dofus.Client.DataProcessor.as:300-301` → `innerOnPlayersCoordinates(substring(4))` (`AKSClient/Dofus.Client.Game.as:304-317`) →
`onPlayersCoordinates` (`AKSClient/Events.AKS.Game.as:339-365`): for each entry, rebuilds the sprite, stops dragging if it is the
local player (multiplayer), `setPosition(cell, dir)`. `dir`: sprite facing 0..3 (0 down-right, 1 down-left, 2 up-left,
3 up-right on screen; `AKSClient/Dofus.BattleField.Characters.Character.as:735-754,786-809`). Characters must exist
(`GM`) and the map must be built. Example: `GIC|12;100;0|7;300;2\0`.

## GIM, GIP — map / players information (S→C, effectively dead)

- `GIM|<state>|<gameName>|<mapId>|<options>\0` → `innerOnMapInformations` (`AKSClient/Dofus.Client.Game.as:293-299`): sets
  `m_maxPlayerCount` from `options`, then calls `onMapInformations`, which is never defined (grep) → no visible effect.
  `state` is **read but unused**.
- `GIP|<id>;<name>;<guild>;<c1>;<c2>;<c3>;<LP>;<AP>;<GP>;<?>;<?>;<team>|…\0` → `innerOnPlayersInformations`
  (`AKSClient/Dofus.Client.Game.as:318-340`) calls `createCharacter(ID,name,Guild,Color1,…)` with 9 arguments while it takes 3
  (`AKSClient/Dofus.CharactersManager.as:18`) → only id and name are applied. Fields 9, 10 are never read; `team` is read but unused.

Dispatch: `GI` + 3rd char `M`/`P`/`C` (`AKSClient/Dofus.Client.DataProcessor.as:291-303`); `GIP`/`GIC` skip 4 chars (`GIx|`).

## GP, Gc, GI — client requests with no caller

Defined but never called anywhere in `decompiled/clean` (grep, case-insensitive): `GP\n` (`GetPlayersInformations`,
`AKSClient/Dofus.Client.Game.as:63-66`), `Gc\n` (`GetPlayersCoordinate`, `:67-70`), `GI\n` (`getInfos`, `:75-78`). Presumably
the requests for `GIP`, `GIC`, `GIM` **[inference]**. A server may ignore them.

---

## Turns: GTL, GTS, GTF, GT

| Frame | Dir | Code | Behaviour |
|---|---|---|---|
| `GTL\|<id>\|<id>\|…` | S→C | `AKSClient/Dofus.Client.DataProcessor.as:354-355` (`substr(4)`), `AKSClient/Dofus.Client.Game.as:357-361`, `AKSClient/Events.AKS.Game.as:406-409` | `Game.turnSequence` = ids; timeline built from `DATACENTER.Characters` (`modules_Interfaces/Interface.Timeline.as:37-62`) — characters must exist |
| `GTS<id>\|<durationMs>` | S→C | `AKSClient/Dofus.Client.DataProcessor.as:348-349`, `AKSClient/Dofus.Client.Game.as:348-352`, `AKSClient/Events.AKS.Game.as:426-442` | turn of `<id>` starts: timeline marker, `currentPlayerID`, chrono started with `durationMs/1000` s; if local player → interaction enabled (`setEnabled(3)`), spell counters `nextTurn`; `KERNEL.cleanPlayer(lastPlayerID)` (effects tick, AP reset to `APinit`+moderator); banner text `PLAYER_TURN` (+ own AP) |
| `GTF<id>` | S→C | `AKSClient/Dofus.Client.DataProcessor.as:351-352`, `AKSClient/Events.AKS.Game.as:443-454` | turn ends: local player → interaction disabled; `lastPlayerID = currentPlayerID`, `currentPlayerID = null`, chrono stopped, cursors/selection cleaned |
| `GT\n` | C→S | `AKSClient/Dofus.Client.Game.as:119-125` (no spinner), only if `currentPlayerID == Player.ID` | end my turn. Triggers: end-turn buttons (`modules_Interfaces/DefineButton2_923/BUTTONCONDACTION on(release).as:2`, `modules_Interfaces/DefineButton2_981/BUTTONCONDACTION on(release).as:4`) |

Examples: `GTL|12|7\0`, `GTS12|30000\0`, `GTF12\0`.

---

## GE — game end (S→C)

```
GE<senderId>|<result>|<result>|…\0
<result> = <winner>;<id>;<level>;<dead>;<lowXp>;<xp>;<highXp>;<winXp>;<gold>
```
`AKSClient/Dofus.Client.DataProcessor.as:268-270` → `innerOnEnd(substr(2))` (`AKSClient/Dofus.Client.Game.as:378-420`) → `onEnd(senderId)`
(`AKSClient/Events.AKS.Game.as:366-394`).

| Field | Notes |
|---|---|
| `senderId` | must be an **existing character id**: the end sequence (timeline off, chrono stop, team watcher/tooltips hidden, end sound, chat "Fin de partie", result panel) is queued on that character's action sequencer; an unknown id means nothing is shown. If it is the local player, `onActionsFinish` runs first. |
| `winner` | `"2"` → winners list, anything else → losers list |
| `id` | character id; name looked up in `DATACENTER.Characters` |
| `level` | `Number` |
| `dead` | `"1"` → DEAD else ALIVE |
| `lowXp`,`xp`,`highXp` | `Number`; progress bar `update(xp, highXp)`; for the local player `XP = lowXp + xp` (code writes `lowxp`, same property under SWF6 case-insensitivity [SWF6 runtime]) |
| `winXp` | XP won (label) |
| `gold` | gold won (label) |

Panels: `GameResultRandom` if `isRandom`, else `GameResultFree`
(`modules_Interfaces/Interface.Banner.Panel.GameResultRandom.as:7-60`, `modules_Interfaces/Interface.Banner.Panel.GameResultFree.as`). Sets
`m_bRunning = false`. Example: `GE12|2;12;3;0;100;180;300;80;25|1;7;5;1;400;420;600;10;0\0`.
