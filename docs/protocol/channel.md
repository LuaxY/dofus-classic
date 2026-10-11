# Channels (`C` family)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Channels.as`, callbacks
`AKSClient/Events.AKS.Channel.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:214-228`.

Channels are the chat rooms of the multiplayer lobby (`Interface::MultiPlayer`). Chat messages themselves use `BM` /
`cM` ([chat.md](chat.md)).

---

## CJ — join channel (C→S, S→C)

C→S:
```
CJ<channelName>\n\0
```
`Class_Client_Channels.prototype.join` (`AKSClient/Dofus.Client.Channels.as:13-25`). The name is escaped:
`<`, `>`, `|` → `_` (`:22`, `String.replace` with arrays = sequential split/join,
`AKSClient/__Packages/ank/ext/StringExtensions.as:26-47`).

Triggers:
- The channel combo of `Interface::MultiPlayer` (editable; preset labels `France`, `Dofus`, `Roleplay`) calls
  `AKS.Channels.join(this.getValue())` from its change handler
  (`modules_Interfaces/DefineSprite_430_Interface.MultiPlayer/frame_1/PlaceObject2_244_Ank.Dofus.ComboBox_80/CLIPACTIONRECORD on(initialize).as:2-6`,
  `modules_Interfaces/DefineSprite_430_Interface.MultiPlayer/frame_1/PlaceObject2_244_Ank.Dofus.ComboBox_80/CLIPACTIONRECORD onClipEvent(load).as:3-10`).
  For an editable combo `getValue()` is the text of the label field (`modules_Interfaces/Ank.Dofus.ComboBox.as:150-155`,
  `modules_Interfaces/FLabelSymbol.as:40-43`). What it sends depends on the path:
  - **Drawing the multiplayer screen sends `CJ\n` (empty name), not `CJFrance`.** The clip's `setSelectedIndex(0)`
    (`…/CLIPACTIONRECORD onClipEvent(load).as:11`) runs `super.setSelectedIndex` first (`modules_Interfaces/Ank.Dofus.ComboBox.as:243`),
    which fires the callback because `flag` is undefined (`modules_Interfaces/FSelectableListSymbol.as:115-117` →
    `executeCallBack`, `modules_Interfaces/FUIComponentSymbol.as:177-181`). At that point the label is still the `""` the
    constructor set (`modules_Interfaces/Ank.Dofus.ComboBox.as:49-50`, via `:251-252` with `flag = false`); the label becomes
    `France` only afterwards (`:251-252`). `join("")` takes the else-branch and sends `"CJ" + "" + "\n"`
    (`AKSClient/Dofus.Client.Channels.as:20-23`). The combo shows `France` while the server was asked for an empty name.
    Order initialize → constructor → `load` **[Flash runtime]**.
  - Picking an entry with the mouse sends the label: `clickHandler` → `releaseHandler` → `fireChange`
    (`modules_Interfaces/Ank.Dofus.ComboBox.as:295-309`, `:416-428`), which sets the label (`:411-412`) before
    `executeCallback` (`:414`; resolves to `executeCallBack` under SWF6 case-insensitivity [SWF6 runtime]), e.g. `CJDofus\n`. Same for arrow keys with the list closed (`:451-469`) and for a typed
    name + Enter (`setValue` then `executeCallback`, `:475-479`).
- Console `/j <name>`, `/join <name>` (`AKSClient/Dofus.Client.Console.as:59-63`).
- `AKS.Channels.join()` without argument after leaving a non-running multiplayer game
  (`AKSClient/Events.AKS.Game.as:245`). It would send `CJ<lastChannel>`, but `DATACENTER.Channel.lastChannel` is only
  set through the `name` setter, which nothing calls (the dispatcher writes `m_name` directly,
  `AKSClient/Dofus.Client.DataProcessor.as:219`; setter `AKSClient/Dofus.DataCenter.Channel.as:7-15`), so the else-branch runs with
  `name = undefined`: `undefined.replace(...)` is undefined and the frame is `"CJ" + undefined`.
  Under SWF6 rules that is `CJ\n` [SWF6 runtime]. **Accept both `CJ` and `CJundefined` and treat them as "rejoin
  my previous channel".** When the game was left with `GQ` + `GC1` ("Retour au village" from a lobby, the random
  result's gift button), this `CJ` arrives between `GC1` and `GD`; this server leaves it unanswered, since a `CJK`
  would reset `DATACENTER.Game` (`AKSClient/Events.AKS.Channel.as:3`) after `GCK|1` (`docs/server.md` stage 3). Bare
  `CJ` also comes from the combo on every draw of the multiplayer screen (above), with no SWF6 quirk involved.
- Leaving a finished fight from the result panel sends `CJ\n` **twice**. The button sends `GQ` and redraws the
  multiplayer screen (`modules_Interfaces/DefineSprite_956_Interface.Banner.Panel.GameResultRandom/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_11/CLIPACTIONRECORD on(release).as:2-3`,
  same in `DefineSprite_962_Interface.Banner.Panel.GameResultFree`; `AKSClient/Dofus.Kernel.as:103-112`), so the new
  combo sends `CJ`. The server's `GV` then runs `onLeave`; the game stopped running at `GE`
  (`AKSClient/Events.AKS.Game.as:372`), so it takes the `AKS.Channels.join()` branch (`:245`) and sends the second
  `CJ`. Their order is not fixed by the code. If the server answers both, the client runs `onJoin` twice (chat
  cleared and `CL` sent twice). This server answers both with `CJK` but treats a `CJ` for the channel the player is
  already in as a no-op for the others: no `CM|-`/`CM|+`, so they see "arrive dans le channel" once (`docs/server.md`).

S→C:
```
CJK<channelName>\0      joined
CJE…\0                  refused
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:217-221`: the name is `substring(3)` in both cases and is written to
`DATACENTER.Channel.m_name`. OK → `Channels.onJoin(name,true)` (`AKSClient/Events.AKS.Channel.as:1-11`): resets
`DATACENTER.Game`, clears the chat (`YOU_ARE_IN_CHANNEL`), **and sends `CL`**. Error → only a `trace` log.

Example: `CJKFrance\0`.

---

## CL — channel user list (C→S, S→C)

C→S `CL\n\0` (`AKSClient/Dofus.Client.Channels.as:26-29`). Trigger: automatically after `CJK` (`AKSClient/Events.AKS.Channel.as:10`).

S→C:
```
CL<anything>|<user>|<user>|…\0
<user> = <name>;<level>;<gfxID>
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:225-226` → `innerOnList(substr(2))` (`AKSClient/Dofus.Client.Channels.as:56-74`): clears the user
list, then part 0 is ignored and each part `1..n` is added (`onMovement(true,user,true)`, no join message).
The user-list row shows `name (level)` and the mini artwork `clips/guilds/artwork/mini/<gfxID>.swf`
(`modules_Interfaces/FChatListItemSymbol.as:28-36`, `modules_Interfaces/Interface.GuildsArtworkMini.as:11-14`).

Example: `CLK|Bobby;3;80|Ali;5;31\0` (anything between `CL` and the first `|` is ignored; `CL|…` works too).

---

## CM — channel movement (S→C)

```
CM<anything>|+<name>;<level>;<gfxID>|-<name>|…\0
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:222-223` → `innerOnMovement(fullFrame)` (`AKSClient/Dofus.Client.Channels.as:30-55`): part 0 ignored;
each part: first char `+` = joined (adds user, chat `ENTER_CHANNEL [name]`), anything else = left (removes user).
The name is `substr(1)` of field 0; `level`/`gfxID` read for both kinds (unused for removals).
Quirk: the same object is reused for every part (`:35`) — harmless for the protocol.

Examples: `CM|+Zed;2;101\0`, `CM|-Zed\0`.
