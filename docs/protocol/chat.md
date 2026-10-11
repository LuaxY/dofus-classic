# Chat & smileys (`BM`/`cM`, `BS`/`cS`)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Chat.as`, callbacks
`AKSClient/Events.AKS.Chat.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:381-406`.
Chat text is rendered as Flash HTML (`out.htmlText`, `AKSClient/Dofus.Chat.as:99,103`).

---

## BM — send chat message (C→S)

```
BM<dest>|<message>\n\0
```
`Class_Client_Chat.prototype.send(msg, dest)` (`AKSClient/Dofus.Client.Chat.as:8-20`).

| Field | Values |
|---|---|
| `dest` | `*` = current channel / map (plain console text, `AKSClient/Dofus.Client.Console.as:109-112`); `#` = team (`/t`, `AKSClient/Dofus.Client.Console.as:41-43`); otherwise a character name = whisper (`/w`, `/msg`, `/whisper`, `AKSClient/Dofus.Client.Console.as:44-58`; whisper box `modules_Interfaces/boxWhisper.as:19`, `AKSClient/Dofus.KeyListener.as:107-115`). Raw, not escaped. |
| `message` | escaped by sequential replace: `<` → `&lt;`, `>` → `&gt;`, `\|` → space (`AKSClient/Dofus.Client.Chat.as:17`). `&` is **not** escaped. |

Not sent when `dest` equals the player's own name (chat error `CANT_WISP_YOURSELF`, `AKSClient/Dofus.Client.Chat.as:11-14`).
The whole frame is cut at 200 chars (`AKSClient/Dofus.Client.as:78-81`), so a long message arrives without `\n`.

Examples: `BM*|Salut tout le monde\n\0`, `BM#|on attaque\n\0`, `BMAli|coucou &lt;3\n\0`.

---

## cM — chat message delivery (S→C)

```
cMK<kind>|<fromId>|<fromName>|<message>\0      message
cME<code><rest>\0                              error
```
Handler `AKSClient/Dofus.Client.DataProcessor.as:384-400` → `Chat.onMessage(msgData[3], msgData[2], msgData[1], charCodeAt(3))`
(`AKSClient/Events.AKS.Chat.as:6-61`). Split on `|`: part 0 = `cMK<kind>` (its content after index 3 ignored), part 3 = text.
Parts past 3 are dropped, so **the text must not contain `|`** (the client never sends one).

| Field | Notes |
|---|---|
| `kind` (4th char) | `F` (70) whisper received → prefix `FROM`, whisper colour, stores `/w <fromName> ` in whisper history; `T` (84) whisper echo to sender → prefix `TO`; `#` (35) team → prefix `Equipe `; anything else → normal line `<b>name</b> : text` (`AKSClient/Events.AKS.Chat.as:31-59`). The original server sent no kind char for normal lines: `cMK|…` (`owner`, stated by the project owner); the 4th char is then the `|` itself. |
| `fromId` | character id; used for the speech bubble on maps with `bRolePlay` (`AKSClient/Events.AKS.Chat.as:46-49`), passed to `traceToChat` (unused there, `AKSClient/Dofus.Kernel.as:67-77`), and compared with the player id for `/##` |
| `fromName` | shown in bold |
| `message` | inserted into HTML as-is |

Special content handled by the client:
- **`/##` remote command.** If the text contains `/##` and `fromId` is not the receiving player, everything after it is
  executed as a console command on the receiver: `AKS.Console.process(msg.substr(pos+3))`
  (`AKSClient/Events.AKS.Chat.as:17-26`) — e.g. `/##/c XYZ` makes the receiver send the raw frame `XYZ\n`. A server should strip
  or refuse `/##` in relayed player text unless it wants this admin hook.
- **`tppttp`** anywhere in the text plays `SOMA.onTotProut()` (`AKSClient/Events.AKS.Chat.as:9-16`); the following
  `length == 4` early return can never be true.

Error form: the 4th char `S` (83) → `SYNTAX_ERROR` with the `/w <name> <msg>` hint; any other char →
`USER_NOT_CONNECTED` with `%1 = substring(4)` (the target name) (`AKSClient/Dofus.Client.DataProcessor.as:391-399`). For
an offline whisper target the original server sent `f`: `cMEf<name>` (`owner`).

Examples: `cMK|12|Bobby|Salut\0`, `cMKF|7|Ali|coucou\0` (whisper to me), `cMKT|7|Ali|coucou\0` (echo of my whisper
to Ali — `fromName` shown after `TO`), `cMK#|12|Bobby|go\0`, `cMES\0`, `cMEfZed\0`.

The rubrique `c` falls through into the friends dispatcher after handling (see [friends.md](friends.md)); this is
harmless for `cM`/`cS`. Consequently a server must **not** send `cA`, `cD`, `cL`, `cl`, `cI`, `cO`: they would run the friend handlers `FA`, `FD`, `FL`, `Fl`, `FI`, `FO`. Other `c?` codes do nothing.

---

## BS — smiley (C→S)

```
BS<smileyId>\n\0
```
`AKSClient/Dofus.Client.Chat.as:21-24`. Trigger: smiley bar button `this._index`
(`modules_Interfaces/__Packages/dofus/graphics/gui/common/SmileyBar.as:52`). Smiley graphics: `clips/smileys.swf`
(`AKSClient/__Packages/dofus/Constants.as:21`).

## cS — show smiley (S→C)

```
cS<characterId>|<smileyId>\0
```
`AKSClient/Dofus.Client.DataProcessor.as:401-403` → `innerOnSmiley(substr(2))` (`AKSClient/Dofus.Client.Chat.as:25-31`) → the character's clip draws
the smiley over its head (`AKSClient/Events.AKS.Chat.as:1-5`, `AKSClient/Dofus.BattleField.Characters.Character.as:318-324`).
The character must exist on the current map. Example: `cS12|3\0`.
