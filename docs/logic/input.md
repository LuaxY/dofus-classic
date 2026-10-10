# Input: keyboard shortcuts, chat console, chat display

Sources: `AKSClient/Dofus.KeyListener.as` (`KERNEL.KeyListener`), `AKSClient/Dofus.Client.Console.as`
(`AKS.Console`), `AKSClient/Dofus.Client.Chat.as`, `AKSClient/Events.AKS.Chat.as`, `AKSClient/Dofus.Chat.as`.
Mouse input on the map: `battlefield.md` §3. Key codes are Flash `Key` codes.

## 1. KeyListener

Registered with `Key.addListener` as soon as `KERNEL` is created (`:330-342`).

### 1.1 `onKeyUp` (`:9-35`)

| Key | Action |
|---|---|
| Enter (13), unless Enter was just consumed by `onKeyDown` | focus the chat input `AKS.Chat.output.txtConsole` |
| Up (38) / PageUp (33) / Down (40) / PageDown (34) | focus the chat input and put the caret at the end |

### 1.2 `onKeyDown` (`:36-329`) — evaluated top to bottom, several can fire

History (only when a chat output exists):

| Key | Action |
|---|---|
| PageUp (33) / PageDown (34) | input text = previous / next whisper prefix (`getWhisperHistoryUp/Down`) |
| Up (38) / Down (40) | input text = previous / next console line; with Shift: whisper prefixes |

Enter (13) — dispatch on the `_name` of the focused text field, then stop (`:82-120`):

| Focused field | Action |
|---|---|
| `txtName` or `txtPass` (login SWF) | `Player.login/password` = sibling fields `txtName.text`/`txtPass.text`; `AKS.connect(SERVER_NAME, SERVER_PORT)` |
| `txtConsole` | if not empty: `AKS.Console.process(text)`, clear |
| `txtZone` (whisper box) | if not empty `AKS.Chat.send(text, box.to)` (box = `txt._parent._parent`); remove the box |
| other | trace only |

If any text field has focus, no shortcut below is processed (`:121-124`). Shortcuts:

| Key | Action | Site |
|---|---|---|
| Space (32) | `UIInterfaceBanner.showNextSpellTab()` | `:125-128` |
| A (65), I (73), C (67) | `UIInterfaceBanner.showPanel("Inventory")` (all three) | `:129-140` |
| S (83) | `showPanel("Spells")` | `:141-144` |
| B (66) or 222 | `KERNEL.switchToCC(Player.CCData)` (close combat targeting) | `:145-148` |
| 1–8 (49–56), no Shift | press banner shortcut slot `us1`…`us8` (`container.onRelease()` → cast that spell) | `:200-231` |
| Shift + 1 | toggle the cell grid (`Container.show("Grid")`) | `:149-154` |

`DEBUG_MODE` only (`false` in this build): Shift+2…Shift+9 and key 58 toggle layers (`Ground1`, `Ground2`,
`Object` do not exist; `Selection`, `Effect`, `Interaction`, characters, `INTERFACE`, `BATTLEFIELD`); numeric
keypad 96–111 and Home/End: player-info panel, interaction state, forced animations (`shoot`, `cast`, `die`,
`hit`), `weaponID ± 1000`, zoom ±10, day/night tint, FPS counter (`:155-196,233-328`).

## 2. Console (`AKS.Console.process(text)`, `AKSClient/Dofus.Client.Console.as:12-113`)

Every line is pushed to `consoleHistory` (max 50, consecutive duplicates skipped). Lines not starting with `/`
→ `AKS.Chat.send(text, "*")` (public channel). Otherwise `command` = text between `/` and the first space,
upper-cased:

| Command | Action | Messages |
|---|---|---|
| `/version`, `/ver` | chat `"DOFUS v" + VERSION` | — |
| `/c <raw>` | `AKS.send(text.substr(3) + "\n")` — **raw protocol line** | — |
| `/count` | `AKS.Infos.getInfos()` | reply shown as `PLAYER_CONNECTED(n)` (`AKSClient/Events.AKS.Infos.as:1-4`) |
| `/t <msg>` | `AKS.Chat.send(msg, "#")` (team chat) | — |
| `/w`, `/msg`, `/whisper <name> <msg>` | push `"/w name "` to whisper history; `AKS.Chat.send(msg, name)` | missing message → `SYNTAX_ERROR(" /w &lt;NAME&gt; &lt;MSG&gt;")` |
| `/j`, `/join <channel>` | `AKS.Channels.join(name)` (`<`, `>`, `\|` → `_`) | join failure only logged |
| `/whoami` | `AKS.Account.whoAmI()` | `I_AM_IN_CHANNEL`, `I_AM_ENTERING_GAME`, `I_AM_IN_OPEN_GAME`, `I_AM_IN_CLOSE_GAME`, `I_AM_IN_SINGLE_GAME`, `I_AM_BUT_WHERE` (`AKSClient/Events.AKS.Account.as:19-45`) |
| `/whois <name>` | `AKS.Account.whoIs(text.substring(7))` (line must be ≥ 8 chars) | `IS_IN_CHANNEL`, `IS_ENTERING_GAME`, `IS_IN_OPEN_GAME`, `IS_INCLOSE_GAME`, `IS_IN_SINGLE_GAME`, `IS_BUT_WHERE` |
| `/f`, `/friend`, `/friends <A\|+\|D\|R\|-\|L> [name]` | add / remove / list friends | `ADD_TO_FRIEND_LIST`, `CANT_ADD_FRIEND_NOT_FOUND` (`f`), `CANT_ADD_YOU` (`y`), `ALREADY_YOUR_FRIEND` (`a`), `REMOVE_FRIEND_OK`, `YOUR_FRIEND_LIST`, `EMPTY_FRIEND_LIST`, syntax errors |
| anything else | chat `UNKNOW_COMMAND(command)` | — |

`/whois` parsing quirk: the name is `substring(7)` regardless of the alias length.
Friend arrivals/departures print `ENTER_DOFUS`/`LEAVE_DOFUS` (`AKSClient/Events.AKS.Account.as:158-175`).

## 3. Sending and receiving chat

* `AKS.Chat.send(msg, dest)` (`AKSClient/Dofus.Client.Chat.as:8-20`): refuses whispers to yourself
  (`CANT_WISP_YOURSELF`); escapes `<` → `&lt;`, `>` → `&gt;`, `|` → space; `dest` `"*"` = channel, `"#"` = team,
  otherwise a character name. 200-char truncation applies to the whole line (`MAX_DATA_LENGTH`).
* Incoming message (`AKSClient/Events.AKS.Chat.as:6-61`), parameters `(msg, fromName, fromID, kind)`:
  * contains `tppttp` → fart sound (`SOMA.onTotProut`);
  * contains `/##` and comes from **another** player → `AKS.Console.process(text after "/##")` is executed
    locally — any player can make others run console commands, including `/c <raw protocol>`. A server must
    filter `/##` (or the port must drop this behaviour);
  * otherwise prefix by kind: `F` (70) whisper received → `getText("FROM") + " "`, and `"/w name "` pushed to the
    whisper history; `T` (84) whisper sent → `getText("TO") + " "`; `#` (35) team → `"Equipe "`;
    whispers/team: `prefix + "<b>name : msg</b>"` in `MSGCHUCHOTE_CHAT_COLOR`; others:
    `"<b>name</b> : msg"` in `MSG_CHAT_COLOR`; speech bubble on role-play maps.
  * Errors: whisper target offline → `USER_NOT_CONNECTED(name)`; syntax → `SYNTAX_ERROR`
    (`AKSClient/Dofus.Client.DataProcessor.as:381-406`), shown via `ERROR(msg)`.
* Smileys: `AKS.Chat.smiley(id)` / broadcast → `characters.md` §7.

## 4. Chat log (`CHAT`, `AKSClient/Dofus.Chat.as`)

`KERNEL.traceToChat(txt, colour)` → `CHAT.addText(txt, colour)` (or `log` before the chat UI exists,
`AKSClient/Dofus.Kernel.as:67-77`). The colour selects the category: `MSG_CHAT_COLOR` → 1 messages,
`MSGCHUCHOTE_CHAT_COLOR` → 2 whispers (+ `SOMA.onChatWisper`), `INFO_CHAT_COLOR` → 3 infos,
`ERROR_CHAT_COLOR` → 4 errors (+ `SOMA.onError`); any other colour is dropped with a trace (`:46-76`).
`setTypes(b1..b4)` filters categories (UI filter buttons). `refresh()` renders the last 30 visible lines as
`<br><font color='#RRGGBB'>text</font>` into `AKS.Chat.output.txtChat`; with fewer than 15 lines it pads the field
(`initChat`) so text starts at the bottom; auto-scrolls when within 4 lines of the end (`:77-110`).
