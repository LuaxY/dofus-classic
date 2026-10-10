# Content the client needs that is not in `dofus-5b/`

For each item: URL/path as built by the code, what the code expects, where it is consumed, and any
**substitute** (post-beta data in `vendor/dofedex/`, never to be presented as beta data). Server *messages* are
specified in `docs/protocol/`; §3 only lists the payload decoders that game logic depends on.

## 1. Files and URLs

| # | Resource | Built at | Expected content / contract | Consumed by | Substitute |
|---|---|---|---|---|---|
| 1 | **Language SWF** `http://jouer.dofus.com/files/lang/langupdater.php` | `AKSClient/Dofus.Kernel.Init.as:28` | a SWF loaded into `_root.lang`; its root must define `checkLanguage(lang, so, iface, kernel)`, called with `("fr", SHARED_OBJECT, INTERFACE, KERNEL)` once loaded. Must populate `SHARED_OBJECT.data` (SharedObject `DofusSO`) with every key and table in `lang.md` and then call `KERNEL.onLangOK()` (the only place that continues the boot; it begins with `INTERFACE.hideProgressBar()`, so the lang SWF presumably shows/updates the progress bar). Versioning/caching behaviour UNKNOWN — not in code | `AKSClient/Dofus.Kernel.as:15-24,28-55` | `vendor/dofedex/lang-fr/lang_fr_7.swf` and siblings (post-beta, different file format: plain variables, no `checkLanguage`); mapping in `lang.md` / `lang-keys.json` (`retro_fr`) |
| 2 | **Auto-login** `http://jouer.dofus.com/files/login/getuser.php` | `AKSClient/Dofus.Kernel.as:54` | `LoadVars.sendAndLoad(…, "POST")` (nothing posted); response URL-encoded vars `l` (login) and `p` (password, used as the clear-text password for `cryptPassword`). Missing/failed → login UI | `AKSClient/Dofus.Kernel.as:31-53` | none — port can skip (always show login) |
| 3 | **Login UI** `http://jouer.dofus.com/files/login/swf/DofusLoginInterface.swf` | `modules_Interfaces/Dofus.Interface.as:79` (`HTTP_LOGIN_PATH + "swf/" + LOGIN_INTERFACE_FILE + ".swf"`) | loaded into `INTERFACE.CommonLayer_mc.loginInterface` (`INTERFACE.UILoginInterface`); after load the client sets `loginInterface.onLogin = function(login, password)` which stores the credentials and connects. Text fields named `txtName` and `txtPass` (same parent) are recognised by the Enter key handler (`AKSClient/Dofus.KeyListener.as:93-98`). Layout/other behaviour UNKNOWN — not in code | `modules_Interfaces/Dofus.Interface.as:63-81`, `AKSClient/Events.AKS.as:9-12,62-65` | none |
| 4 | **Bad-version hook** `http://jouer.dofus.com/files/login/delpath.php` | `AKSClient/Events.AKS.as:91` | `_root.pathData.loadVariables(url, "POST")` posting `path = <directory of _root._url> + "DOFUS.swf"`; response ignored. Purpose (inferred from `dofus-5b/LIS-MOI.txt` + `DOFUS/frame_1/DoAction.as`): make the web site forget the stored install path | `AKSClient/Events.AKS.as:78-92` (on login error `v`) | none — drop in a port |
| 5 | Web page container for `DOFUS.swf` | `DOFUS/frame_1/DoAction.as:17` | the page that loads `DOFUS.swf` must provide `_parent.funcloaded(url)`; `DOFUS.swf` computes its own directory URL. `lancement.html` (in `dofus-5b/`) loads `AKSClient.swf` directly and defines the JS `winopen(page, w, h)` used by the menu | — | not needed for a port |
| 6 | **News** `http://jouer.dofus.com/files/news/news.php` | `AKSClient/Dofus.Kernel.Init.as:32`, loaded `modules_Interfaces/DefineSprite_371/frame_1/DoAction.as:9` | XML: root element `news`, each child element = one news item with attribute `title`; its child nodes are concatenated as HTML text (`Interface.NewsScroller.parseXML`, `modules_Interfaces/Interface.NewsScroller.as:36-58`; `NewsScrollerItem.parseXHTML`, `Interface.NewsScrollerItem.as:22-43`). Rotates every `NEWS_DELAY` = 10 s | lobby start tab | none |
| 7 | **Bug report** `http://jouer.dofus.com/files/bugreport/index.php` | `AKSClient/Dofus.Kernel.Init.as:33` | `DOFUS.debug.getURL(url, "_blank", "POST")` posting the `debug` clip's variables: `login`, **`pass` (clear text)**, `cid`, `log` (last 2000 chars) | `modules_Interfaces/DefineButton2_933/BUTTONCONDACTION on(release).as:1-8` | drop |
| 8 | **Map preview images** `http://jouer.dofus.com/files/maps/<mapID>.swf` | `modules_Interfaces/Interface.MapImage.as:13` | any SWF/image, loaded into `MapImage.image` | lobby game info (`AKSClient/Events.AKS.Game.as:86`) | none (could be rendered from map data) |
| 9 | Menu web pages `download.php`, `modifyAccount.php`, `bugreport/index.php`, `charteBeta.php` under `http://jouer.dofus.com/files/` | `modules_Interfaces/__Packages/dofus/graphics/gui/UIStartMenu.as:30-46` | opened through `javascript:winopen(...)` | start menu | drop |
| 10 | **Music** `music/<file>` (relative to the client) | `modules_Sound/Dofus.Sound.Manager.as:159` (`MUSIC_PATH + file`) | MP3 files loaded with `Sound.loadSound` (non-streaming), played on load: `02.mp3` (character list), `04.mp3` (solo village), `07.mp3` (multiplayer lobby), `08.mp3`, `10.mp3`, `11.mp3`, `12.mp3` (fight, random pick) — `modules_Sound/Dofus.Sound.Event.as:2,28,32,48`; per-file volume in `Dofus.Sound.Params.as:46-52` | `sound.md` | none |
| 11 | `modules/sounds.swf` | `AKSClient/__Packages/dofus/Constants.as:8` (`SOUNDS_PATH`) | never loaded by any code in `decompiled/clean/` | — | not needed |
| 12 | `clips/items/0.swf` | `AKSClient/Dofus.DataCenter.Item.as:41-44` | icon for an item with no effects; absent from `dofus-5b/clips/items/` (only sub-folders `1`–`11`) | inventory UI | any placeholder |
| 13 | Map data | server | see `map-format.md` (the client has no local maps) | `AKSClient/Dofus.Compressor.as` | `vendor/dofedex/maps-2004/` — post-beta world maps; `id,width,height,backgroundNum,mapData` usable, `ambianceId,musicId,bOutdoor,capabilities` not read by beta; no `bRolePlay`; graphics coverage partial (`map-format.md` §7) |

## 2. Asset SWF scripts (decompiled in `decompiled/clean/clips/`)

The asset SWFs the client calls into carry their own scripts (now decompiled under `decompiled/clean/clips/<file>.swf/`).
What they provide:

| File(s) | Provides | Documented in |
|---|---|---|
| `clips/ground.swf`, `clips/objects.swf` | root `clear()` / `attach(symbol, name, depth)` (`clips/ground.swf/frame_1/DoAction.as:1-12`, `clips/objects.swf/frame_1/DoAction.as:1-12`); random visual variants; object state animations | `map-format.md` §5.1 |
| `clips/circle.swf` | `setColor(col)` = `new Color(this.circle).setRGB(col)`, `animate(bool)` = `circle.play()` / `circle.gotoAndStop(1)` (`clips/circle.swf/frame_1/DoAction.as:1-16`); the inner clip loops from label `anim` (`clips/circle.swf/DefineSprite_5/frame_6/DoAction.as:1-2`) | `characters.md` §6 |
| `clips/sprites/*.swf` (28) | `applyColor` zones, `applyWeapon(this, "R"/"L")`, `end()`/`wait()` callbacks, footstep/combat sounds | `characters.md` §2.1, §5; `sequencer.md` §1.1; `sound.md` §5.1 |
| `clips/spells/*.swf` (77) | consume `level`, `angle`, `cellFrom`, `cellTo`; export `move`/`shoot`/`duplicate`; `end()`; spell sounds | `fight.md` §6; `sequencer.md` §1.1; `sound.md` §5.1 |
| `clips/guilds/artwork/faces/*.swf`, some `mini/*.swf` | `cColors.applyColor` recolouring of portraits | `characters.md` §5 |
| `clips/smileys.swf`, `clips/ccicon.swf`, spell icons, items | no scripts relevant to the client | `characters.md`, `ui.md` |

Linkage names attached by code but **not exported** by `AKSClient.swf`, `Interfaces.swf` or `Sound.swf`
(asset check of ExportAssets tags):

| Name | Site | Note |
|---|---|---|
| `maskRond` | `AKSClient/Dofus.BattleField.as:34` | `setRoundMask` has no caller — dead code |
| `move`, `shoot`, `duplicate` | `AKSClient/Dofus.BattleField.Spells.as:110,249,303,323` | attached inside a loaded spell SWF; exported by some `clips/spells/*.swf` (`shoot` ×16, `move` ×10, `duplicate` ×3) |
| `BackgroundComboBox` | `modules_Interfaces/Ank.Dofus.ComboBox.as:127` | not found anywhere — UI degrades |
| `Interface::BtnCC` | `modules_Interfaces/Interface.Banner.Main.as:15` | not found — see `ui.md` |
| `forbidden` | `modules_Interfaces/Interface.Cursor.as:34` | not found — "forbidden" cursor overlay missing |
| `Interface::Banner::Panel::` + name | `modules_Interfaces/Interface.Banner.as:120` | dynamic; `…GameResultFree`/`…GameResultRandom` are exported |

Weapons (asset-side, not code): each class sprite `clips/sprites/<class><sex>.swf` imports exactly one symbol
from `clips/sprites/weapons/weapons.swf` via ImportAssets (`10/11`, `100/101` → `4_1`; `20/21`, `50/51` → `7_1`;
`30/31` → `8_1`; `40/41` → `5_1`; `60/61`, `80/81` → `6_1`; `70/71` → `3_1`; `90/91` → `2_1`); monster sprites import
nothing. See `characters.md` §5.

## 3. Server-supplied data the logic decodes (formats as consumed)

Framing and full field lists: `docs/protocol/`. These decoders define what the server must produce:

| Data | Decoder | Format consumed |
|---|---|---|
| Spell | `KERNEL.CharactersManager.getSpellObjectFromData` (`AKSClient/Dofus.CharactersManager.as:166-175`) | `id~level~effectZones~additional`; `effectZones` = pairs `<shape><size64>` with shape `P`/`C`/`L`/`X` (`Copie de Dofus.DataCenter.Spell.as:26-37`); `additional` = 15 chars: `[0]` guild spell `1`, `[1]` element type `A/W/E/F`, `[2]` effect type, `[3]` on-itself `1`, `[4]` line only `1`, `[5]` range (base64), `[6]` AP cost, `[7]` line of sight `1`, `[8]` free cell `1`, `[9]` critical hit, `[10]` critical failure, `[11]` launches per turn, `[12]` launches per target per turn, `[13]` turns between launches (≥ 63 = once per fight), `[14]` shortcut slot 1–8 (else none) (`:38-61`) |
| Item | `getItemObjectFromData` (`AKSClient/Dofus.CharactersManager.as:176-194`) | `id~type~gfx~RRGGBB~position~effects`, numbers hex; `position` empty → −1; `effects` = `,`-separated `type#p1#p2#p3` (hex, `"0"` → undefined) or bare `type` (`Dofus.DataCenter.Item.as:12-37`) |
| Weapon | `createCharacter` / `Items.innerOnWeapon` | `type,gfx,RRGGBB` hex (`AKSClient/Dofus.CharactersManager.as:41-49`); `OW` reply `charId|type|gfx|col` (`Dofus.Client.Items.as:18-26`) |
| Selected character | `DataProcessor` `AS` (31 `\|` fields) → `createCharacter` | `datacenter.md` §3 |
| Placement cells | `AKS.Game.onPositionStart` | two strings (team 0, team 1) of 2-char base64 cell numbers `(c0 << 6) + c1` (`AKSClient/Events.AKS.Game.as:290-313`) |
| Maps / cells | `uncompressMap` / `uncompressCell` | `map-format.md` |
| Paths | `extractFullPath` | `pathfinding.md` §5 |
| Game actions | `AKS.Game.onActions` | `sequencer.md` §4 |
| Ids that index lang tables | spell ids (`S`), map ids (`M`), class ids 1–10 (`G`, `CC`), item type/supertype/effect ids (`I.*`), server message ids (`SRV_MSG_*`), error codes (`ERROR_CREATING_*`, `ERROR_JOINING_*`) | all value sets UNKNOWN — not in code (`lang.md`) |

Server behaviour (rules, damage, AI, XP, turn timer duration, AP regeneration) is entirely server-side and
UNKNOWN — not in code; the client only renders the action stream.
