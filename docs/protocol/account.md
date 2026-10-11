# Account, connection & characters

Covers the handshake (`H`), version + credentials, the port's register frame (authored), login answer (`Al`), server
notices (`M`), who-is (`BW`/`AW`), character list / select / create / delete (`P*`/`A*`), stat boosts (`PB`/`AB`) and level-up (`AN`).

Conventions used in every protocol file:

- `\n` = byte 0x0A, `\0` = byte 0x00 (frame terminator added by `XMLSocket`, see [README](README.md#transport)).
- Citations are `path:line` relative to `decompiled/clean/`. Tags: **[code]** = read from the AS source,
  **[SWF6 runtime]** = Flash Player behaviour for SWF version 6 (not game code), **[inference]** = deduction not
  enforced by the client.
- "C→S" = client to server, "S→C" = server to client. "3rd char" = `data.charAt(2)` (`K` = OK, anything else = error,
  but only for handlers that look at it, see [README](README.md#okerror-convention)).

---

## H — handshake key (S→C)

```
H<key>\0
```

| Field | Type | Notes |
|---|---|---|
| `key` | string, everything after `H` | Stored as `AKS.m_UID` (`AKSClient/Dofus.Client.DataProcessor.as:30`). Used as XOR key by `ank.Crypt.cryptPassword`, which reads only `key.charCodeAt(0..31)` (`AKSClient/__Packages/ank/Crypt.as:20,29`). |

Client behaviour: sets `m_bConnected = true` and calls `AKS.onConnect(true)` (`AKSClient/Dofus.Client.DataProcessor.as:29-33`), which
immediately calls `AKS.logon(login, password)` (`AKSClient/Events.AKS.as:3-6`). The TCP `onConnect(success)` callback
only handles failure (`AKSClient/Dofus.Client.as:90-96`): **nothing is sent until the server sends `H`.**

Server rules:
- Send `H` first, right after accepting the TCP connection.
- Send at least 32 characters. Shorter keys still "work": `charCodeAt` past the end returns NaN and
  `NaN ^ x == x` (ToInt32(NaN) = 0) [SWF6 runtime] — the password is then weakly mixed.
- The key must not contain `\0`. Any other character is fine (only char codes are used).

Example: `Habcdefghijklmnopqrstuvwxyz012345\0`

---

## Version + credentials (C→S)

Sent by `Class_Client.prototype.logon` (`AKSClient/Dofus.Client.as:57-74`) as **two frames**:

```
5\n\0                                    (VERSION + "\n", AKSClient/Dofus.Client.as:72; VERSION = 5, AKSClient/Dofus.Kernel.Init.as:5)
<login>\n<cryptedPassword>\n\0           (AKSClient/Dofus.Client.as:73)
```

| Field | Type | Encoding |
|---|---|---|
| version | decimal integer | always `5` for this client |
| `login` | string | raw, not escaped; can contain anything except `\n`/`\0` the user typed |
| `cryptedPassword` | string over `[a-zA-Z0-9-_]` | `ank.Crypt.cryptPassword(password, key)` — see [encodings.md](encodings.md#password-crypt) |

Notes:
- Both frames can arrive in a single TCP read (`5\n\0bob\nRFdAvFlc\n\0`); split on `\0`, then on `\n`.
- The credentials frame is subject to the 200-char cap (`AKSClient/Dofus.Client.as:78-81`). A very long login/password would
  lose the trailing `\n` — accept a missing final `\n`.
- `logon` does **not** return early when already authenticated or when `m_UID` is null; it calls
  `onLogin(false, …)` and still sends both frames (`AKSClient/Dofus.Client.as:61-73`). In practice it is only called from
  `onConnect` after `H`.
- Where login/password come from: the external login SWF (`DofusLoginInterface.swf`, missing — calls
  `onLogin(login,password)` then `AKS.connect`, `modules_Interfaces/Dofus.Interface.as:63-81`), the HTTP
  `getuser.php` auto-login (`l`/`p` vars, `AKSClient/Dofus.Kernel.as:28-55`), the `txtName`/`txtPass` fields
  (`AKSClient/Dofus.KeyListener.as:93-98`), or the DEBUG defaults `bo`/`pass` (`AKSClient/Dofus.Kernel.Start.as:1-5`).

Trigger: TCP connect is started by `AKS.connect(SERVER_NAME, SERVER_PORT)` (port 5555, `AKSClient/Dofus.Kernel.Init.as:6`;
host `server01.dofus.com`, `AKSClient/Dofus.Kernel.Init.as:26`).

---

## Register (C→S) — **authored** by this port, not in the beta client

```
5\n\0                                    (version frame, unchanged)
<login>\n+<cryptedPassword>\n\0          (instead of the credentials frame)
```

The beta has no account creation (accounts came from the web site; the login UI is lost). The port's login screen
(`web/src/game/ui/screens/login.ts`) has a second button, "S'inscrire" (authored lang key `REGISTER`): same fields, same
`onLogin`/`AKS.connect`, but it sets `AKS.register`, so the `logon` that follows `H<key>` sends this frame
(`web/src/game/kernel/client.ts`, `login(…, register)` in `web/src/core/protocol.ts`). Same connection, after `H`, so the
crypt uses the session key exactly like a login.

- **Discriminator**: a `+` right after the first `\n`. `+` is not in the crypt alphabet (`HASH`,
  `AKSClient/__Packages/ank/Crypt.as:3`), so no credentials frame (`AKSClient/Dofus.Client.as:73`) can carry it, whatever
  the user typed as login; it precedes the crypt, so the 200-char cap cannot cut it off. A server that does not know the
  frame refuses it as a bad crypt (`AlEf`).
- **Answer**: as a successful login (`AlK<language>`, the account is created and authenticated); `AlEe` if the account
  exists (whatever the password); `AlEf` for an invalid login or empty password, and for a register frame cut at 200 chars
  (no trailing `\n`): the later login frame is one char shorter, so its crypt would never match the stored one.
- Login never creates an account: an unknown account answers `AlEf` (ACCESS_DENIED), like a wrong password.

Example (password `pass`, crypt of [encodings.md](encodings.md#password-crypt)): `bob\n+RFdAvFlc\n\0` → `AlKfr\0`; the
same register on a new connection → `AlEe\0`.

---

## Al — login result (S→C)

```
AlK<language>\0          success
AlE<code>\0              failure
```

Handler: `AKSClient/Dofus.Client.DataProcessor.as:73-96` → `AKS.onLogin` (`AKSClient/Events.AKS.as:43-69`).

| Field | Notes |
|---|---|
| `language` | everything after `AlK` (`substr(3)`, `AKSClient/Dofus.Client.DataProcessor.as:77`). Stored in `DATACENTER.Player.Language` (`AKSClient/Events.AKS.as:48`); **read but unused** (no other reference). May be empty. |
| `code` | 4th char (`charCodeAt(3)`, `AKSClient/Dofus.Client.DataProcessor.as:81`): `a` (97) → `ALREADY_LOGGED`; `v` (118) → `BAD_VERSION` + `AKS.onBadVersion()`; anything else (or nothing) → `ACCESS_DENIED` (`AKSClient/Dofus.Client.DataProcessor.as:84-93`). **Authored:** `e` (101) → `ACCOUNT_EXISTS` in the port (`web/src/game/kernel/client.ts`), answer to the register frame only; the stock client shows it as `ACCESS_DENIED`. `f` (102) = not found / bad credentials, the original server's answer to an unknown account or a wrong password (`owner`, stated by the project owner); this server also sends it for an invalid or cut register frame (`ACCESS_DENIED` either way). |

Success behaviour: `m_bAuthentified = true`, `INTERFACE.clear()`, then either the start menu (`drawMenuInterface`,
`modules_Interfaces/Dofus.Interface.as:82-94`) or, if `AKS.m_bSkipMenu` (set by "quit to character list",
`AKSClient/Dofus.Kernel.as:294-303`), it sends `PL` directly (`AKSClient/Events.AKS.as:49-52`). Sets the module-level
`isLogged = true` used by `onDisconnect`.

Failure behaviour: redraws the login UI if absent, plays an error sound, shows a message box (`AKSClient/Events.AKS.as:62-67`).
`onBadVersion` POSTs the SWF path to `http://jouer.dofus.com/files/login/delpath.php` (`AKSClient/Events.AKS.as:78-92`) —
HTTP, not socket. The socket stays open; the client does not retry.

Examples: `AlKfr\0`, `AlEa\0`, `AlEv\0`, `AlEf\0`, `AlEe\0` (authored).

---

## M — server notice (S→C)

```
M<display><messageId>\0
```

Handler: `AKSClient/Dofus.Client.DataProcessor.as:34-37` → `AKS.onServerMessage(display, messageId)` (`AKSClient/Events.AKS.as:70-77`).

| Field | Notes |
|---|---|
| `display` | 1 char (`substring(1,2)`). `1` → message box `getText("SRV_MSG_" + messageId)` now and resets the stored id to -1. Any other value → only stored. |
| `messageId` | rest of the frame (`substr(2)`), stored in `AKS.m_serverMessageID` (`AKSClient/Dofus.Client.DataProcessor.as:35`). Text comes from the lang key `SRV_MSG_<id>` — **UNKNOWN — not in code** (lang file missing). Ids (`owner`, stated by the project owner): `0` spam, `1` idle, `2` max level, `3` and `4` maintenance. |

The stored id is shown together with `DISCONNECT` when the socket closes (`AKSClient/Events.AKS.as:23-27`, reads
`m_ServerMessageID` — same property as `m_serverMessageID` because SWF6 identifiers are case-insensitive
[SWF6 runtime]). **Kick-with-reason sequence:** send `M0<id>\0`, then close the TCP connection.

Examples: `M1001\0` (show `SRV_MSG_001`), `M042\0` then close.

This server (`owner`): `M10` (spam) to a session that sends more than 5 `BM` within 15 s, the line that crosses the
limit dropped, no disconnect; `M01` (idle, stored) to a session without any frame for 25 min, then the socket is closed
(checked once a minute); `M12` (max level) right after the `AN` of a fight that takes a character to the max level (30).

---

## BW / AW — who am I / who is (C→S, S→C)

### BW (C→S)

```
BW\n\0            who am I       (AKSClient/Dofus.Client.Account.as:15-18)
BW<name>\n\0      who is <name>  (AKSClient/Dofus.Client.Account.as:19-22)
```

Triggers: console `/whoami` and `/whois <name>` (`AKSClient/Dofus.Client.Console.as:64-75`). `name` is the raw text
after `/whois ` (`substring(7)`); whether it is an account or character name is **UNKNOWN — not in code**.

### AW (S→C)

```
AW|<account>|<character>|<state>|<param>|\0       found (must split into exactly 6 parts)
AW|<name>\0                                        2-part form
```

Handler: `AKSClient/Dofus.Client.DataProcessor.as:97-125`. Split on `|`; part 0 (`AW…`) ignored.

| Part | Field | Notes |
|---|---|---|
| 1 | `account` | compared with the login used at logon (`m_login`, `AKSClient/Dofus.Client.as:71`): equal → `onWhoAmI`, else `onWhoIs` (`AKSClient/Dofus.Client.DataProcessor.as:117-124`) |
| 2 | `character` | character name |
| 3 | `state` | `C` in channel, `1` entering a game, `2` free game, `3` random game, `4` solo, anything else → "but where?" (`AKSClient/Events.AKS.Account.as:19-72`, constants `AKSClient/Dofus.Client.as:23-28`) |
| 4 | `param` | 3rd substitution of the lang strings `I_AM_IN_CHANNEL`/`IS_IN_CHANNEL`, `*_OPEN_GAME`, `*_CLOSE_GAME` (`AKSClient/Events.AKS.Account.as:27,33,36,54,60,63`); presumably channel or game name **[inference]** |
| 5 | (empty) | required only so that the split yields 6 parts; content ignored |

Any other part count → `trace("Infos Whois Erronées")`, nothing shown (`AKSClient/Dofus.Client.DataProcessor.as:108-112`).
2-part form calls `onWhoIs(name, "!", null)` (`AKSClient/Dofus.Client.DataProcessor.as:103-107`) → state `null` → `IS_BUT_WHERE` with
character `!` — the only "not found / offline" answer the client understands **[inference]**.

Output: one chat line (`KERNEL.traceToChat`). Examples: `AW|bob|Bobby|C|France|\0`, `AW|alice|Ali|4||\0`, `AW|nobody\0`.

---

## PL / AL — character list (C→S, S→C)

### PL (C→S)

```
PL\n\0
```
`AKSClient/Dofus.Client.Account.as:23-26`. Triggers: start-menu "play" (`modules_Interfaces/Dofus.Interface.as:89-92`,
`modules_Interfaces/__Packages/dofus/graphics/gui/UIStartMenu.as:26`), `AlK` with `m_bSkipMenu`
(`AKSClient/Events.AKS.as:49-52`), back buttons of the creation screen
(`modules_Interfaces/DefineSprite_141_dofus.graphics.gui.UICreateCharacter/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_15/CLIPACTIONRECORD on(release).as:2`,
`modules_Interfaces/DefineButton2_725/BUTTONCONDACTION on(release).as:2`).

### AL (S→C)

```
ALK|<char>|<char>|…\0
<char> = <id>;<name>;<level>;<model>;<sex>;<gfxID>;<color1>;<color2>;<color3>
```

Handler: `AKSClient/Dofus.Client.DataProcessor.as:126-152`. If the 3rd char is not `K` the frame is ignored (`AKSClient/Dofus.Client.DataProcessor.as:127-130`).
Split on `|`, part 0 ignored, each part split on `;`.

| # | Field | Type | Use |
|---|---|---|---|
| 0 | `id` | decimal | `Number()`; sent back in `PS`/`PD` (`modules_Interfaces/Interface.Characters.as:24-32,53`) |
| 1 | `name` | string | label |
| 2 | `level` | decimal | label `LEVEL <level>` (`modules_Interfaces/Interface.Characters.as:51`) |
| 3 | `model` | string | **read but unused** (`AKSClient/Dofus.Client.DataProcessor.as:141`) |
| 4 | `sex` | string | **read but unused** by the list screen |
| 5 | `gfxID` | string | sprite file `clips/sprites/<gfxID>.swf` (`AKSClient/Dofus.Client.DataProcessor.as:147`). Convention `<classId><sex>` (BRIEF) |
| 6-8 | `color1..3` | hex RRGGBB without `0x`, or `-1` | `Number("0x"+c)` unless `-1` (`AKSClient/Dofus.Client.DataProcessor.as:144-146`); `-1` = keep sprite colour (`AKSClient/Dofus.CharactersColors.as:26-37`) |

Client behaviour: draws `Interface::Characters` (`AKSClient/Events.AKS.Account.as:1-6`), max 10 slots, create button disabled
at 10 (`modules_Interfaces/Interface.Characters.as:40-73`). Weapon on the preview falls back to the class default
(`AKSClient/Dofus.CharactersWeapons.as:36-39`).

Examples: `ALK\0` (no characters: `"ALK".split("|")` has length 1, the loop starts at 1 → empty list),
`ALK|12;Bobby;3;0;0;80;FF0000;-1;00FF00\0`.

---

## PS / AS — select character (C→S, S→C)

### PS (C→S)

```
PS<characterId>\n\0
```
`AKSClient/Dofus.Client.Account.as:27-35`. Sent only if `Account.isSet` is false; sets it to true. Triggers: play button /
double-click on a slot (`modules_Interfaces/DefineSprite_644_Interface.Characters/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_83/CLIPACTIONRECORD on(release).as:8`,
`modules_Interfaces/DefineSprite_639_Interface.Characters.Choice/frame_1/PlaceObject2_635_3/CLIPACTIONRECORD on(release).as:2`).

### AS (S→C)

```
ASK|<id>|<name>|<level>|<guild>|<sex>|<gfxID>|<color1>|<color2>|<color3>|<weapon>|<XPlow>|<XP>|<XPhigh>|<LP>|<AP>|<GP>|<force>|<vitality>|<rFire>|<rAir>|<rWater>|<rEarth>|<charism>|<karma>|<agility>|<intelligence>|<bonusPoints>|<cc>|<spells>|<items>\0
ASE…\0
```

Handler: `AKSClient/Dofus.Client.DataProcessor.as:153-203`. **Must split into exactly 31 parts** (30 `|`), else
`onSetCharacter(false,"Retour bizarre…")` (`AKSClient/Dofus.Client.DataProcessor.as:157-160`). Fields go through
`KERNEL.CharactersManager.createCharacter(id, name, c)` (`AKSClient/Dofus.CharactersManager.as:18-160`).

| Part | Field | Type / encoding | Use |
|---|---|---|---|
| 1 | `id` | decimal | `DATACENTER.Player.ID`; key in `DATACENTER.Characters` (`AKSClient/Dofus.Client.DataProcessor.as:194`) |
| 2 | `name` | string | `DATACENTER.Player.name` |
| 3 | `level` | decimal | `Character.level` (`Number`) |
| 4 | `guild` | decimal 1..10 | class id, `GUILD_NAMES[guild]` (`AKSClient/Dofus.Kernel.Init.as:56`) |
| 5 | `sex` | `0`/`1` | default 1 if absent (`AKSClient/Dofus.CharactersManager.as:36`) |
| 6 | `gfxID` | string | sprite file `clips/sprites/<gfxID>.swf`; banner face `clips/guilds/artwork/faces/<gfxID>.swf` (`modules_Interfaces/Interface.PlayerCircle.as:11-19`) |
| 7-9 | colours | hex RRGGBB or `-1` | `Number("0x"+c)` (`AKSClient/Dofus.CharactersManager.as:38-40`) |
| 10 | `weapon` | `<typeHex>,<gfxHex>,<RRGGBB>` or empty | `weapon.gfx = parseInt(type,16)+"_"+parseInt(gfx,16)` (linkage name), colour split in 3 hex bytes (`AKSClient/Dofus.CharactersManager.as:41-49`); empty → class default `getGuildText(guild).w[0]+"_1"` (`AKSClient/Dofus.CharactersManager.as:50-54`) |
| 11-13 | `XPlow`,`XP`,`XPhigh` | decimal | XP bar bounds/value (strings kept as-is except `XP` → `Number`) |
| 14 | `LP` | decimal | sets `LP` **and** `LPmax` (`AKSClient/Dofus.CharactersManager.as:55-62`) |
| 15 | `AP` | decimal | sets `AP` **and** `APinit` (`AKSClient/Dofus.CharactersManager.as:63-70`) |
| 16 | `GP` | decimal | gold |
| 17-26 | `force, vitality, rFire, rAir, rWater, rEarth, charism, karma, agility, intelligence` | decimal | stats (setters `Number()`, `AKSClient/Dofus.DataCenter.Character.as:82-181`) |
| 27 | `bonusPoints` | decimal | points to spend with `PB`/`SB` |
| 28 | `cc` | decimal | AP cost of the close-combat attack; `DATACENTER.Player.setCCData(cc)` only if truthy (`AKSClient/Dofus.CharactersManager.as:136-139`, `AKSClient/Dofus.DataCenter.Player.as:67-75`) |
| 29 | `spells` | spell entries joined by `;` | each → `getSpellObjectFromData` → `Player.addSpell` (`AKSClient/Dofus.CharactersManager.as:140-147`); format in [spells.md](spells.md#spell-entry-format) |
| 30 | `items` | item entries joined by `;` | each → `getItemObjectFromData` → `Player.addItem` (`AKSClient/Dofus.CharactersManager.as:148-158`); format in [items.md](items.md#item-entry-format) |

Success behaviour: `Account.isSet = false`; `onSetCharacter(true)` → `INTERFACE.clear()` and **the client sends
`GC1` (create solo game) by itself** (`AKSClient/Events.AKS.Account.as:7-13`). Next step: [game.md → GC](game.md#gc--create-a-game-cs-sc).

Failure (`ASE…` or wrong part count): `Account.onSetCharacter(false,msg)` → `this.onError(msg)`, but
`AKS.Account.onError` is never defined (grep) → **silent**, and `Account.isSet` stays `true`, so further `PS` are
suppressed until the client object is rebuilt (`Client.clear()` resets `Client.isSet`, not `Account.isSet`,
`AKSClient/Dofus.Client.as:42`).

Example (2 spells, 1 item):
```
ASK|12|Bobby|3|8|0|80|FF0000|-1|00FF00||100|150|300|55|6|120|10|12|0|0|5|0|1|0|8|3|2|4|141~1~Pb~1F000bd10bbcbab;142~1~Cb~1F000ce10bbbbac|1a~5~3~FF8800~~64#a#0#0\0
```

---

## PA / AA — create character (C→S, S→C)

### PA (C→S)

```
PA<name>|<guild>|<sex>|<color1>|<color2>|<color3>\n\0
```
`AKSClient/Dofus.Client.Account.as:36-39`. Trigger: creation screen `createCharacter(name)`
(`modules_Interfaces/__Packages/dofus/graphics/gui/UICreateCharacter.as:69-88`, button
`modules_Interfaces/DefineSprite_107/frame_14/PlaceObject2_27_Ank.Dofus.PushButton_10/CLIPACTIONRECORD on(release).as:2`).

| Field | Encoding |
|---|---|
| `name` | raw string, 1..20 chars checked client-side (`modules_Interfaces/__Packages/dofus/graphics/gui/UICreateCharacter.as:74-83`); **not escaped** — may contain `\|` |
| `guild` | decimal 1..10 (default 1, `modules_Interfaces/__Packages/dofus/graphics/gui/UICreateCharacter.as:34`) |
| `sex` | `0` or `1` (default 0, `modules_Interfaces/__Packages/dofus/graphics/gui/UICreateCharacter.as:35`) |
| `color1..3` | **decimal** integer `0xRRGGBB` value (`ank.components.ColorPicker` returns `(r<<16)+(g<<8)+b`, `modules_Interfaces/__Packages/ank/components/ColorPicker.as:187,191`), or `-1` if not chosen (`modules_Interfaces/__Packages/dofus/graphics/gui/UICreateCharacter.as:29`) |

Legacy variant: `modules_Interfaces/DefineButton2_711/BUTTONCONDACTION on(release).as:13-24` calls
`addCharacter(name,guild,c1,c2,c3)` without `sex` (and refuses guilds 1, 4, 10). The 6th field is then `undefined`
coerced to string — `""` under SWF6 rules [SWF6 runtime]; accept both `""` and `undefined` as "unspecified".

Example: `PABobby|8|0|16711680|-1|65280\n\0`

### AA (S→C)

```
AAK\0       created
AAE…\0      refused
```
Handler: `AKSClient/Dofus.Client.DataProcessor.as:210-211` → `onAddCharacter(!error)` (`AKSClient/Events.AKS.Account.as:184-190`).
`AAK` does **nothing** on the client. `AAE` shows "Ce nom existe déjà" (hard-coded). To leave the creation screen
the server must follow `AAK` with a fresh `AL` (which redraws `Interface::Characters` at the same depth 1)
**[inference]**.

---

## PD — delete character (C→S)

```
PD<characterId>\n\0
```
`AKSClient/Dofus.Client.Account.as:40-47` (not sent if id empty). Characters whose name contains `_emag` cannot be deleted
(client-side message box, button script line 2-6). Trigger: delete button
(`modules_Interfaces/DefineSprite_644_Interface.Characters/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_77/CLIPACTIONRECORD on(release).as:13`).
No dedicated answer exists in the dispatcher; the server should answer with a new `AL` **[inference]** (otherwise the
"waiting" spinner stays open, see [README](README.md#waiting-indicator)).

---

## PB / AB — boost a characteristic (C→S, S→C)

### PB (C→S)

```
PB<statId>\n\0
```
`AKSClient/Dofus.Client.Account.as:48-51`. Triggers: the + buttons of the player-info panel, each guarded by
`DATACENTER.Player.canBoost(1)` (`bonusPoints >= 1` and not in a running game, `AKSClient/Dofus.DataCenter.Player.as:151-162`):
ids sent are `6,7,8,9,10,11,12,13,14,15` (`modules_Interfaces/DefineButton2_519` … `DefineButton2_535`, e.g.
`modules_Interfaces/DefineButton2_519/BUTTONCONDACTION on(release).as:4` → `boost(6)`).

### AB (S→C)

```
AB?<characterId>|<statId>;<value>|<statId>;<value>|…\0
```
Handler: `AKSClient/Dofus.Client.DataProcessor.as:207-209` → `innerOnBoost(substr(3))` (`AKSClient/Dofus.Client.Account.as:169-231`). The 3rd char is
skipped and not checked (send `K`). Values are absolute (assigned, not added).

| `statId` | Field(s) set on the character |
|---|---|
| 0 | `LPmax` and `LP` |
| 1 | `APinit` and `AP` |
| 2 | `GP` |
| 3 | `bonusPoints` |
| 4, 5 | ignored |
| 6 | `rFire` · 7 `rAir` · 8 `rWater` · 9 `rEarth` |
| 10 | `force` · 11 `vitality` · 12 `charism` · 13 `karma` (this server: boosted points plus the karma effects of equipped items, [items.md](items.md#item-entry-format)) · 14 `agility` · 15 `intelligence` |

The same numbering is the effect/moderator numbering of `AKSClient/Dofus.EffectsManager.as:6-25`.
Example: `ABK12|10;13|3;4\0` (force 13, 4 bonus points left). No `|` right after the 3rd char: `substr(3)` must start with the character id.

---

## AN — new level (S→C)

```
AN<level>|<XPlow>|<XP>|<XPhigh>|<bonusPoints>\0
```
Handler: `AKSClient/Dofus.Client.DataProcessor.as:204-206` → `innerOnNewLevel(substr(2))` (`AKSClient/Dofus.Client.Account.as:158-168`): writes the
five fields on the player's character, then `onNewLevel(level)` shows "vous passez niveau <level>" for 2 s
(`AKSClient/Events.AKS.Account.as:180-183`). Example: `AN4|300|310|600|5\0`.
