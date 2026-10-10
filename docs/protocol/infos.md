# Server information (`I` family)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Infos.as`, callbacks
`AKSClient/Events.AKS.Infos.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:41-53`. The 3rd char is not
checked by any of these handlers.

---

## IC — connected player count (C→S, S→C)

C→S `IC\n\0` (`AKSClient/Dofus.Client.Infos.as:11-14`). Trigger: console `/count` (`AKSClient/Dofus.Client.Console.as:38-40`).

S→C `IC<count>\0` → `innerOnPlayerCount(substr(2))` (`AKSClient/Dofus.Client.Infos.as:23-26`) → chat
`PLAYER_CONNECTED [count]` (`AKSClient/Events.AKS.Infos.as:1-4`). `count` is shown as-is. Example: `IC42\0`.

---

## IP — podium (C→S, S→C)

C→S `IP\n\0` (`AKSClient/Dofus.Client.Infos.as:15-18`). Trigger: the start tab of the multiplayer screen, `onFocusFinal`
(`modules_Interfaces/DefineSprite_371/frame_1/DoAction.as:7-11`).

S→C:
```
IP<entry>|<entry>|<entry>\0
<entry> = <account>;<name>;<guild>;<sex>;<gfxID>;<color1>;<color2>;<color3>;<xp>;<level>
```
`innerOnPodium(substr(2))` (`AKSClient/Dofus.Client.Infos.as:27-55`): split from index 0 (no prefix part), entry `i` is drawn at
podium place `i` (`AKSClient/Events.AKS.Infos.as:5-17`, `modules_Interfaces/TabStart_Podium.as:14-32`). The podium has 3 places
(`modules_Interfaces/TabStart_Podium.as:38` clears 0..2); send at most 3 entries **[inference]**.

| # | Field | Use |
|---|---|---|
| 0 | `account` | **read but unused** |
| 1 | `name` | label |
| 2 | `guild` | **read but unused** |
| 3 | `sex` | **read but unused** |
| 4 | `gfxID` | sprite `clips/sprites/<gfxID>.swf`, frame `Podium` |
| 5-7 | colours | passed **raw** to `CCOLORS.setColor` (no `"0x"` prefixing, unlike `AL`/`AS`); later used in `&` bit operations (`AKSClient/Dofus.CharactersColors.as:49-51`), i.e. coerced with ToNumber → send **decimal** (or a `0x`-prefixed hex literal); `-1` = keep sprite colour [SWF6 runtime for the coercion] |
| 8 | `xp` | label `XP : <xp>` |
| 9 | `level` | label |

Example: `IPbob;Bobby;8;0;80;16711680;-1;65280;12000;12|alice;Ali;3;1;31;-1;-1;-1;9000;10\0`

---

## IG — general statistics (C→S, S→C)

C→S `IG\n\0` (`AKSClient/Dofus.Client.Infos.as:19-22`). Trigger: start tab `onFocus`
(`modules_Interfaces/DefineSprite_371/frame_1/DoAction.as:1-6`).

S→C:
```
IG<playerCount>|<soloGameCount>|<freeGameCount>|<randomGameCount>|<waitingCount>\0
```
`innerOnGeneral(substr(2))` (`AKSClient/Dofus.Client.Infos.as:56-65`) → `GeneralStats.setValues`
(`modules_Interfaces/TabStart_GlobalStats.as:15-21`): shows `playerCount`, `soloGameCount` ("in village"), and
`Number(free) + Number(random)` (game count). `waitingCount` is **read but unused**.

Example: `IG42|10|3|2|1\0`
