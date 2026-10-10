# Friends (`F` family)

Conventions: see [account.md](account.md) header. Client-side code: `AKSClient/Dofus.Client.Account.as`,
callbacks `AKSClient/Events.AKS.Account.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:407-408` + `459-492`.

**Dispatcher structure (verified on P-code, not just the decompiled AS).** The decompiled `case 70: break;` followed
by a second `switch(codeAction)` after the main switch (`AKSClient/Dofus.Client.DataProcessor.as:407-408,459-492`) is a decompiler artefact.
In the bytecode, rubrique `F` (70) jumps straight into that inner switch on the 2nd char. The `c` (chat) rubrique has
no `break` and also falls into it after its own handling — harmless because chat only uses `cM`/`cS`, and `M`/`S`
are not friend sub-codes. Reproduce with
`tools/ffdec.sh -format script:pcode -export script <out> dofus-5b/AKSClient.swf` and read
`Dofus%3A%3AClient%3A%3ADataProcessor.pcode` (labels `loc217b` = `c`, `loc2340` = `F`, `loc281b` = end).

Friend sub-codes (2nd char): `A` add, `D` delete, `L` list, `l` list for random game, `I` friend came online,
`O` friend went offline.

---

## Friend entry format (used by `FL`, `FAK`)

```
<account>                                                     offline friend
<account>;<state>;<characterName>;<level>;<guild>;<sex>;<gfxID>   online friend
```
Parsed by `innerOnAddFirend` (`AKSClient/Dofus.Client.Account.as:76-122`).

| # | Field | Notes |
|---|---|---|
| 0 | `account` | entries with empty account are not stored (`:113-116`) |
| 1 | `state` | presence of this field = online. `C`→`IN_CHANNEL`, `1`→`IN_SOLO`, `2`→`IN_MULTI`, `3`→`IN_RANDOM`, `?`→`IN_UNKNOW`; any other value leaves `state` undefined (`:86-102`). The resulting string is a lang key shown via `getText(state)` (`AKSClient/Events.AKS.Account.as:139`). **Note:** this mapping differs from `AW` (where `1` = entering a game and `4` = solo). |
| 2 | `characterName` | online list label |
| 3 | `level` | shown in chat listing |
| 4 | `guild` | only tested for presence: if defined, the friends-tab row shows the mini artwork (`modules_Interfaces/FFriendsListItemSymbol.as:38-42`) |
| 5 | `sex` | **read but unused** |
| 6 | `gfxID` | mini artwork `clips/guilds/artwork/mini/<gfxID>.swf` (`modules_Interfaces/FFriendsListItemSymbol.as:40`, `modules_Interfaces/Interface.GuildsArtworkMini.as:11-14`) |

No field present after the account → `state = "DISCONNECT"` (offline list).

---

## FL — friends list (C→S, S→C)

C→S `FL\n\0` (`AKSClient/Dofus.Client.Account.as:52-55`, no waiting spinner). Triggers: friends tab focus/buttons
(`modules_Interfaces/DefineSprite_328/frame_1/DoAction.as:4`, `modules_Interfaces/DefineButton2_327/BUTTONCONDACTION on(release).as:2`),
console `/f l` (`AKSClient/Dofus.Client.Console.as:98-100`), after a successful remove (`AKSClient/Events.AKS.Account.as:151`),
after `FI`/`FO` while the friends tab is open (`AKSClient/Events.AKS.Account.as:160-163,169-172`).

S→C:
```
FL?<entry>|<entry>|…\0
```
`innerOnFirendsList(substr(3))` (`AKSClient/Dofus.Client.Account.as:123-135`): the 3rd char is skipped, not checked (send `K`).
Rebuilds `DATACENTER.Player.Friends`. Display: the friends tab lists (online rows `account (name)`, level, mini
artwork, state picto clip `pic_<state>`, `modules_Interfaces/FFriendsListItemSymbol.as:33-49`; offline by account)
if open (`AKS.Account.output`), otherwise chat lines `" - account (name) LEVEL:lvl, <state text>"`
(`AKSClient/Events.AKS.Account.as:96-145`). Empty list → `FLK\0` (`EMPTY_FRIEND_LIST`).

Example: `FLKalice;C;Ali;5;3;1;31|bob\0` (a `|` right after `FLK` would add an empty first entry, which is skipped)

---

## Fl — friends list for random-team invitation (C→S, S→C)

C→S `Fl\n\0` (`AKSClient/Dofus.Client.Account.as:56-59`, no spinner). Triggers: random-game tabs
(`modules_Interfaces/DefineSprite_286/frame_1/DoAction.as:19,69`,
`modules_Interfaces/DefineSprite_263_TabPlayDofusStart/frame_1/DoAction.as:6`,
`modules_Interfaces/DefineButton2_258_BtnRefresh/BUTTONCONDACTION on(release).as:2`, …).

S→C:
```
Fl?<name>;<characterId>;<level>|…\0
```
`innerOnFirendsListForRandomGame(substr(3))` (`AKSClient/Dofus.Client.Account.as:136-157`); entries without an id are dropped.
`level` is **read but unused**. Shown in `TabPlayDofus_TeamMateChoose.lstFriends` (label = name, data = id) after a
"random" entry with data 0 (`modules_Interfaces/TabPlayDofus_TeamMateChoose.as:12-26`). The id is what `Gi` sends.

Example: `FlKAli;7;5|Zed;9;2\0` (a leading `|` gives an empty entry without id, which is dropped)

---

## FA — add friend (C→S, S→C)

C→S:
```
FA<characterName>\n\0
FA*<accountName>\n\0
```
`AKSClient/Dofus.Client.Account.as:60-67` (not sent if empty or exactly `*`). The `*` prefix is added by the UI when adding by
account (`modules_Interfaces/DefineSprite_328/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_11/CLIPACTIONRECORD on(release).as:4`);
by character name: `modules_Interfaces/DefineSprite_328/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_21/CLIPACTIONRECORD on(release).as:4`, whisper box button
(`modules_Interfaces/DefineSprite_895_boxWhisper/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_9/CLIPACTIONRECORD on(release).as:2`),
console `/f a <name>` / `/f + <name>` (`AKSClient/Dofus.Client.Console.as:89-92`). Not escaped.

S→C:
```
FAK<friend entry>\0      added (entry format above)
FAE<code>\0              refused
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:461-470` → `innerOnAddFirend(ok, substr(3), false)`. OK: pushes the entry, chat
`ADD_TO_FRIEND_LIST [account]` (`AKSClient/Events.AKS.Account.as:73-78`). Error codes (whole `substr(3)` up to the first `;`):
`f` not found, `y` cannot add yourself, `a` already a friend; others silent (`AKSClient/Events.AKS.Account.as:81-93`).

Examples: `FAKalice;C;Ali;5;3;1;31\0`, `FAEf\0`.

---

## FD — remove friend (C→S, S→C)

C→S `FD<characterName>\n\0` or `FD*<accountName>\n\0` (`AKSClient/Dofus.Client.Account.as:68-75`). Triggers: close button on a
friend line (`modules_Interfaces/DefineButton2_210_ButtonClose/BUTTONCONDACTION on(release).as:2` → `"*" + friendAccount`),
console `/f d|r|- <name>` (`AKSClient/Dofus.Client.Console.as:93-97`).

S→C:
```
FDK\0        removed → chat REMOVE_FRIEND_OK, then the client sends FL
FDEf\0       not found → chat CANT_ADD_FRIEND_NOT_FOUND (other codes silent)
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:471-480`, `AKSClient/Events.AKS.Account.as:146-157`.

---

## FI / FO — friend online / offline notifications (S→C)

```
FI<p1>;<p2>\0
FO<p1>;<p2>\0
```
`AKSClient/Dofus.Client.DataProcessor.as:487-491` → `onFirendIn` / `onFirendOut(substr(2))` (`AKSClient/Events.AKS.Account.as:158-175`): chat line
`ENTER_DOFUS`/`LEAVE_DOFUS` with substitutions `%1=p1`, `%2=p2`; refreshes the list (`FL`) if the friends tab is open.
Meaning of `p1`/`p2` (account? character?) — **UNKNOWN — not in code** (lang strings missing).

Example: `FIalice;Ali\0`.
