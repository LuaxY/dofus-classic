# Language data (`SHARED_OBJECT.data`)

The French strings of beta 5b are lost (the lang SWF from `langupdater.php` is missing, `missing-content.md` #1).
This file + `lang-keys.json` are the complete inventory of what the client reads, so the strings can be rebuilt.

## 1. Lookup functions (`AKSClient/Dofus.Kernel.Init.as:80-155`)

| Function | Reads | Fallback |
|---|---|---|
| `getText(ref, params)` | `SHARED_OBJECT.data[ref]`, then `.replace(["%1".."%n"], params)` (array-aware `String.replace`, README §5) | none — a missing key yields `undefined` (rendered as `""` in SWF6) |
| `getSpellText(id)` | `data.S[id]` | none |
| `getCCText(guildID)` | `data.CC[guildID]` | `"?"` |
| `getMapText(id)` | `data.M[Number(id)]` | `{n:"?", d:"?"}` |
| `getGuildText(id)` | `data.G[Number(id)]` | `{sn:"?", ln:"?", d:"?", cc:"?"}` |
| `getItemTypeText(id)` | `data.I.t[Number(id)]` | `{n:"?", t:"?", g:"?", s:"?"}` |
| `getItemSuperTypeText(id)` | `data.I.st[Number(id)]` | `"?"` only when the entry's `.length == 0` |
| `getItemEffectText(id)` | `data.I.e[Number(id)]` | `{n:"?", c:"?"}` |

`modules_Interfaces/__Packages/dofus/Translator.as:6-17` wraps `getText`, `getGuildText` (`getGuildInfos`),
`getSpellText` (`getSpellInfos`) for the AS2 UI classes. `modules_Sound` reads no language data.

Placeholders are `%1…%9` (multi-digit would collide: `"%1"` is replaced before `"%10"`). SWF6 property lookup is
case-insensitive (README §0), so `data["Range"]` and `data["RANGE"]` are the same entry.

## 2. Key inventory — summary

`lang-keys.json` → `keys`: **289 keys** = 282 literal `getText("KEY", …)` keys (378 call sites) + 7 keys whose name
is chosen at runtime but resolvable from code (`WIN_LP`, `LOST_LP`, `IN_CHANNEL`, `IN_SOLO`, `IN_MULTI`,
`IN_RANDOM`, `IN_UNKNOW`). Split: 102 keys used only in AKSClient, 183 only in Interfaces, 4 in both.
61 keys take parameters (`params` = length of the array passed = highest `%n` the string may use).

Plus 3 **dynamic patterns** with unknown value sets (`dynamic_patterns` in the JSON):

| Pattern | Built at | Suffix source |
|---|---|---|
| `SRV_MSG_<id>` | `AKSClient/Events.AKS.as:25,74` | server message id (`M` packet, `AKSClient/Dofus.Client.DataProcessor.as:34-36`); shown in a box when the display flag is `"1"`, or appended to the disconnect box |
| `ERROR_CREATING_<c>` | `AKSClient/Events.AKS.Game.as:62` | 4th char of a failed game-create reply (`Dofus.Client.DataProcessor.as:236`) |
| `ERROR_JOINING_<c>` | `AKSClient/Events.AKS.Game.as:100` | 4th char of a failed join reply (`Dofus.Client.DataProcessor.as:254`) |

Resolved dynamic keys: `getText(dLP >= 0 ? "WIN_LP" : "LOST_LP", [name, dLP])` (`Events.AKS.Game.as:572-575`);
friend list `getText(friend.state)` (`Events.AKS.Account.as:139`) where `state` comes from the server state code:
`C → IN_CHANNEL`, `1 → IN_SOLO`, `2 → IN_MULTI`, `3 → IN_RANDOM`, `? → IN_UNKNOW`, absent → `DISCONNECT` (never
passed to `getText`); other codes (e.g. `4`) leave `state` undefined (`AKSClient/Dofus.Client.Account.as:86-112`).
Note this mapping disagrees with `AKS.STATE_IN_GAME_*` (`1` = unknown, `4` = solo, `Dofus.Client.as:23-28`).

Interfaces also attaches `pic_<state>` icons (`pic_IN_CHANNEL`, `pic_IN_MULTI`, `pic_IN_RANDOM`, `pic_IN_SOLO` are
exported by Interfaces.swf; `modules_Interfaces/FFriendsListItemSymbol.as:46`).

## 3. Substitute strings (`retro_fr`)

`vendor/dofedex/lang-fr/lang_fr_7.swf` (earliest available French UI lang, **post-beta**, decompiled with
`tools/ffdec.sh -format script:as`; 1 319 string variables `KEY = "…"` plus `set("delete", …)`) supplies
`retro_fr` for **203 / 289** keys:

* 195 exact name matches;
* 3 matches only case-insensitively (valid under SWF6): `RANDOM` → `random`, `DELETE` → `delete` (set via
  `set("delete",…)` because `delete` is reserved), `Range` → `RANGE`;
* 5 of the 7 resolved dynamic keys (`WIN_LP`, `LOST_LP`, `IN_MULTI`, `IN_SOLO`, `IN_UNKNOW`).

86 keys have `retro_fr: null`, chiefly: the lobby help texts `HELP_*` (≈ 50 keys), the `/whoami`/`/whois` texts
(`I_AM_*`, `IS_*`), team/lobby labels (`ADD_TEAMMATE`, `FREE_TEAMMATE`, `MAKE_TEAM`, `JOIN_GAME`, `GAME_NAME`,
`PLAY_DUEL`, `DESCRIPTION_RANDOM`, `LOSERS`, …), `ENTER_DOFUS`, `LEAVE_DOFUS`, `DO_U_ACCEPT_INVITATION`,
`IN_CHANNEL`, `IN_RANDOM`. Retro strings use the same `%n` convention; only `BAD_VERSION` differs (beta passes
1 param, retro text uses `%2`) — recorded as `retro_params`. Retro `SRV_MSG_0…17`, `ERROR_CREATING_GAME`,
`ERROR_JOINING_GAME` are listed as `retro_fr_candidates` under the dynamic patterns; their ids are not known to
match beta ids. Retro texts describe the later MMO (houses, guilds, kamas…), so wording may not fit the beta.

For reconciliation: the coordinator's brief counts 284 beta keys / 197 retro matches; the numbers above are
from a full parse of every `getText(` call (literal keys 282, +7 resolved dynamic) and include case-insensitive
matches.

## 4. Structured tables

Field shapes are inferred from every read site (no writer exists in the decompiled code).

| Table | Shape read by beta | Read sites | Retro substitute (post-beta, ids may differ) |
|---|---|---|---|
| `S` | `S[spellID] = { n: name, d: description, l1…lN: [normalHitText, criticalHitText, apCost, range, …] }` — key `"l" + m_Level`; `[0]`/`[1]` via `Spell.m_DescriptionNormalHit/CriticalHit`; `l1[2]`/`l1[3]` only for the creation preview | `AKSClient/Copie de Dofus.DataCenter.Spell.as:78-102`, `Events.AKS.Game.as:773,800`, `modules_Interfaces/__Packages/dofus/graphics/gui/common/SpellInfosViewer.as:33-43`, `Interface.Banner.Panel.Spells.Infos.as:10-14`, `Interface.Banner.Panel.Spells.BoostInfos.as:12-21`, `Interface.ButtonSpellBanner.as:21` | `spells_fr_100`: `S[id] = {n, d, l1…l6}` — `n`/`d` compatible; `l<N>[0]`/`[1]` are **effect arrays**, not text; `l<N>[2]` = AP cost, later indices differ |
| `CC` | `CC[guildID] = string` (close-combat description, stored in `Player.CCData.m_Description`) | `AKSClient/Dofus.Kernel.Init.as:102-110`, `Dofus.DataCenter.Player.as:72` | none |
| `M` | `M[mapID] = { n: map name, d: description (never read) }` | `AKSClient/Events.AKS.Game.as:17,36,84` | `maps_fr_35`: `MA.m[id] = {x, y, sa, d?}`, `MA.sa`, `MA.a[id] = {n, sua}`, `MA.sua[id]` — no per-map name; beta map ids UNKNOWN |
| `G` | `G[guildID] = { sn: short name, ln: long name, d: description, cc: [p1, p2, p3, apCost], w: [weaponType, …] }` — `cc` fills `"#1{~1D}#2{~2~3+}#3"` (dice) and `cc[3]` = AP; `w[0]` = default weapon type (`w[0] + "_1"` linkage) and `w` = equippable weapon types | `AKSClient/Dofus.CharactersManager.as:53`, `Dofus.CharactersWeapons.as:38`, `Dofus.DataCenter.Item.as:115`, `modules_Interfaces/DefineButton2_970/BUTTONCONDACTION on(rollOver).as:4-5`, `__Packages/dofus/graphics/gui/UICreateCharacter.as:47-48`, `DefineSprite_64/frame_2…11/DoAction.as:1` | `classes_fr_31`: `G[1..10] = {sn, ln, d, s: spellIds, cc: [[effects]…], b10…b15}` — `sn/ln/d` compatible (same class ids as `GUILD_NAMES`); `cc` shape differs; no `w` (asset-side hint for `w[0]`: `characters.md` §5) |
| `I.t` | `I.t[typeID] = { n: type name, t: superType id, g: 0/1/2 → "m"/"f"/"n", s: bool }` | `AKSClient/Dofus.DataCenter.Item.as:48-86` | `items_fr_13`: `I.t[id] = {n, t, z?}` — `n`/`t` compatible, no `g`/`s` |
| `I.st` | `I.st[superTypeID] = string` | `AKSClient/Dofus.DataCenter.Item.as:58-61`, `modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:191` | `items_fr_13`: `I.st[id] = boolean` — incompatible |
| `I.e` | `I.e[effectID] = { n: name-suffix pattern (combine), d: description pattern (getDescription) }` | `AKSClient/Dofus.DataCenter.Item.as:82,99` | `effects_fr_90`: `E[id] = {d, c, o, e?}` — `d` uses the same `#1{~1~2 à }#2` syntax; no `n` |

Super type 2 is special: `Item.canEquip` checks `m_Type ∈ G[player.guild].w` only when `superType == 2`
(weapons, `AKSClient/Dofus.DataCenter.Item.as:107-130`).

### 4.1 Pattern syntax (`AKSClient/__Packages/ank/PatternDecoder.as`)

`getDescription(str, params)` (`:6-12,26-74`), used for `I.e[].d` and `G[].cc`:

| Token | Meaning |
|---|---|
| `#N` (N = one digit) | replaced by `params[N−1]`; removed if undefined |
| `~N` | if `params[N−1]` is undefined → **truncate** the (sub)string here; else the marker is removed |
| `{…}` | sub-pattern (up to the first `}`) decoded recursively with the same params |

Example: `"#1{~1~2 à }#2"` with `[3,5]` → `"3 à 5"`; with `[3]` → `"3"`.

`combine(str, gender, singular)` (`:13-25,75-104`), used for item names (`I.e[].n`): flags
`m/f/n` (gender), `p = !singular`, `s = singular`; `~X` truncates when flag `X` is false, else is removed; `{…}`
recursive. `Item.name` = `capitalize(I.t[type].n)` + `" " + combine(I.e[e].n, gender, !I.t[type].s)` for each
effect (`AKSClient/Dofus.DataCenter.Item.as:69-87`) — note the **negated** `s` passed as `singular`; whether
`s` means singular or plural in the original data is UNKNOWN — not in code.

## 5. Hard-coded French literals (not in the lang data)

| Text | Site |
|---|---|
| `"Fin de partie"` | `AKSClient/Events.AKS.Game.as:381` |
| `"Je suis trop nul"` (critical miss bubble) | `AKSClient/Events.AKS.Game.as:802,824` |
| `"vous passez niveau " + level` | `AKSClient/Events.AKS.Account.as:182` |
| `"Ce nom existe déjà"` | `AKSClient/Events.AKS.Account.as:188` |
| `"Equipe "` (team chat prefix) | `AKSClient/Events.AKS.Chat.as:44` |
| `"Retour bizarre lors de la sélection du personnage"`, `"Erreur lors de la sélection du personnage"` | `AKSClient/Dofus.Client.DataProcessor.as:159,201` |
| `"Impossible de joindre le channel <b>…</b>"` (log only) | `AKSClient/Events.AKS.Channel.as:6` |
| debug overlays `"Nuit"`, `"Jour"`, `"Weapon : "`… (DEBUG_MODE only) | `AKSClient/Dofus.KeyListener.as:239-318` |
| `GUILD_NAMES` class names | `AKSClient/Dofus.Kernel.Init.as:56` |

Interfaces' hard-coded strings are listed in `ui.md`.

## 6. `lang-keys.json` format

```
{
  "_about": "…",
  "keys": { "KEY": { "params": n, "sites": ["path:line", …], "retro_fr": "…" | null,
                     "retro_match"?: "case-insensitive (key)", "retro_params"?: n, "dynamic"?: "how the name is built" } },
  "dynamic_patterns": { "SRV_MSG_<id>": { "params", "sites", "dynamic", "retro_fr_candidates": {…} }, … },
  "tables": { "S": { "accessor", "shape", "sites", "retro_substitute" }, "CC", "M", "G", "I.t", "I.st", "I.e" }
}
```

`_about` and `dynamic_patterns` are additions to the requested `{keys, tables}` shape. Sites are relative to
`decompiled/clean/`; a key's sites may list the same file several times (one per call).
