# Console commands (client side → protocol)

The chat input line goes through `Class_Client_Console.prototype.process` (`AKSClient/Dofus.Client.Console.as:12-113`).
It is purely client-side parsing; this table shows which frame each command produces. Command names are
case-insensitive (`toUpperCase`, `:28`). Text not starting with `/` is sent as `BM*|<text>` (`:109-112`).

Triggers: Enter in `txtConsole` (`AKSClient/Dofus.KeyListener.as:99-105`), the multiplayer "send" button
(`modules_Interfaces/DefineSprite_430_Interface.MultiPlayer/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_7/CLIPACTIONRECORD on(release).as:5`),
and remote `/##` chat ([chat.md](chat.md#cm--chat-message-delivery-sc)).

| Command | Frame sent | Source |
|---|---|---|
| `/version`, `/ver` | none (prints `DOFUS v5`) | `:31-34` |
| `/c <raw>` | `<raw>\n\0` — **raw packet**, `substr(3)` of the line, no escaping | `:35-37` |
| `/count` | `IC\n` | `:38-40` |
| `/t <msg>` | `BM#\|<msg>\n` | `:41-43` |
| `/w <name> <msg>`, `/msg …`, `/whisper …` | `BM<name>\|<msg>\n` (syntax error if no space after name) | `:44-58` |
| `/j <name>`, `/join <name>` | `CJ<name>\n` | `:59-63` |
| `/whoami` | `BW\n` | `:64-66` |
| `/whois <name>` | `BW<name>\n` (line must be ≥ 8 chars) | `:67-75` |
| `/f a\|+ <name>`, `/friend …`, `/friends …` | `FA<name>\n` | `:76-92` |
| `/f d\|r\|- <name>` | `FD<name>\n` | `:93-97` |
| `/f l` | `FL\n` | `:98-100` |
| anything else starting with `/` | none (`UNKNOW_COMMAND`) | `:105-106` |

Server implication: `/c` lets any user send arbitrary frames (up to 200 chars); validate everything.
