# DATACENTER — client data model

`_global.DATACENTER = new Class_DataCenter()` (`AKSClient/Dofus.Kernel.Init.as:61`, `AKSClient/Dofus.DataCenter.as`).
Pure state; rendering objects hold back-references (`character.clip`).

## 1. `DofusDataProviderClass` (`AKSClient/DofusDataProviderSymbol.as`)

Sparse list used as an id-keyed map. Fields `items[]`, `keys{}` (set of used indices — iterate with
`for (k in provider.keys)`), `uniqueID`, `views[]`.

| Method | Behaviour |
|---|---|
| `setItemAt(i, v)` | ignored if `i < 0`; `i >= length` → `addItemAt`; else `replaceItemAt` (`:86-98`) |
| `addItemAt(i, v)` | `keys[i] = null`; if `i < length` inserts (shifting later items!); stores objects as-is, scalars as `{label: v}`; sets `v.index = i` and `v.__ID__`; notifies views `addRows` (`:19-42`) |
| `replaceItemAt(i, v)` | in-range only; keeps `__ID__`; `updateRows` (`:65-85`) |
| `deleteItemAt(i)` | `delete keys[i]; items[i] = undefined` (no shift, no view event) (`:99-103`) |
| `removeItemAt(i)` | splice + `deleteRows` |
| `getItemAt(i)`, `getLength()`, `getItemIndex(value, field)`, `sortItemsBy(field, "DESC"?)`, `moveItem`, `removeAll`, `addView(view)` → `view.modelChanged(evt)` | |

Port notes: characters are stored at their **server id** (`setItemAt(id, character)`), so `items` is sparse; a
negative id would be silently dropped (`i >= 0` test) — whether ids can be negative is UNKNOWN — not in code.
`setItemAt(id, undefined)` (used to remove characters, `AKSClient/Dofus.Client.Game.as:262`,
`Dofus.CharactersManager.as:14`) keeps the key in `keys` (only `deleteItemAt` removes it), so iterations over
`keys` must tolerate `undefined` entries (the code does `getItemAt(k).clip` etc. and relies on `undefined.x`
being harmless).

## 2. `Class_DataCenter`

| Field | Init (`:8-19`) | Notes |
|---|---|---|
| `Player` | `Class_DataCenter_Player` | §3 |
| `Game` | `Class_DataCenter_Game` | replaced on every channel join, game create/join/leave (`fight.md` §1) |
| `Channel` | `Class_DataCenter_Channel` | §6 |
| `Characters` | provider | all characters (local player included), keyed by id |
| `Map` | provider, then **replaced by a plain object** in `uncompressMap` | `map-format.md` §2 |
| `Clips`, `Objects`, `Spells` | providers | unused (`Clips` read into a dead local, `AKSClient/Dofus.Compressor.as:39`) |

`clear()` (on disconnect) rebuilds everything, keeping `Player.login/password` (`:20-31`).

## 3. `Class_DataCenter_Player` — the account / local player (`AKSClient/Dofus.DataCenter.Player.as`)

Broadcaster (`ASBroadcaster.initialize`); event `onInventoryChange`.

| Field | Meaning |
|---|---|
| `login`, `password` | credentials (password kept in clear for reconnect / `cryptPassword`) |
| `ID`, `name` | selected character id/name (set after character selection, `AKSClient/Dofus.Client.DataProcessor.as:194-195`) |
| `Language` | from the login reply (`AKSClient/Events.AKS.as:48`) — never read |
| `Inventory[]` | `Class_DataCenter_Item` list (`addItem`, `dropItem(id)` by `m_ID`) |
| `Spells` | provider spellId → spell |
| `SpellsAir/Water/Earth/Fire/Guild[]` | spell book by element (`fight.md` §8) |
| `SpellsUsed` | provider slot 1–8 → spell |
| `SpellsObjects` | provider, unused |
| `CCData` | close-combat pseudo-spell (`fight.md` §3.4) |
| `Friends[]` | `{account, state, name, level, guild, sex, gfxID}` (`AKSClient/Dofus.Client.Account.as:76-122`) |
| `currentSpell` | spell/CC being targeted |
| `bWinner` | unused |
| `lastClickedCell`, `tmpPath`, `tmpFullPath` | path finding scratch (`pathfinding.md`) |
| `SpellsManager` | `Class_SpellsManager` (`fight.md` §4) |

Properties: `clip` = `Characters[ID].clip`, `data` = `Characters[ID]`, `isCurrentPlayer` =
`Game.currentPlayerID == ID`, `noMoreAP` = `data.AP <= 0` (`:29-48`). Methods: `reset()` (clears targeting and
paths, `data.bDied = false`), `clearTmpPaths()`, `hasEnoughAP(n)`, `setCCData(apCost)`, `addItem`, `dropItem`,
`addSpell`, `canBoost(n)` (`fight.md` §7).

### 3.1 Selected-character record (`AS…`, 31 `|` fields → `createCharacter`)

`AKSClient/Dofus.Client.DataProcessor.as:153-203`: `[1]` id, `[2]` name, `[3]` level, `[4]` guild (class 1–10),
`[5]` sex, `[6]` gfxID, `[7..9]` colours (hex, `-1` = default), `[10]` weapon (`type,gfx,RRGGBB` hex or empty),
`[11]` XPlow, `[12]` XP, `[13]` XPhigh, `[14]` LP, `[15]` AP, `[16]` GP, `[17]` force, `[18]` vitality,
`[19]` rFire, `[20]` rAir, `[21]` rWater, `[22]` rEarth, `[23]` charism, `[24]` karma, `[25]` agility,
`[26]` intelligence, `[27]` bonusPoints, `[28]` cc (close-combat AP cost), `[29]` spells (`;`-separated spell
records), `[30]` items (`;`-separated item records). Exact framing: `docs/protocol/`.

## 4. `Class_DataCenter_Character` (`AKSClient/Dofus.DataCenter.Character.as`)

Created/updated only by `KERNEL.CharactersManager.createCharacter(id, name, attrs)`
(`AKSClient/Dofus.CharactersManager.as:18-160`). Broadcaster.

| Field | Source / meaning |
|---|---|
| `index`, `num` | `Number(id)` |
| `name`, `guild` (class id), `sex` (default 1), `gfxID` (default 0) | attrs |
| `color1..3` | `Number("0x" + hex)`, or `-1` (keep sprite colour) |
| `weapon` | `{gfx: "<type>_<gfx>" (decimal), colorRed, colorGreen, colorBlue}` from hex `type,gfx,RRGGBB`; no weapon → `{gfx: G[guild].w[0] + "_1"}` |
| `LP` & `LPmax`, `AP` & `APinit`, `GP` | attrs (both of a pair set from the same value) |
| `XPlow`, `XP`, `XPhigh`, stats, `bonusPoints` | attrs when present |
| `team`, `joinPosition` | multiplayer lobby (`Number` or `null`) |
| `cell` | `Number(attrs.cell)` or `null` |
| `dir` | **`Number(attrs.celdirl)` (typo) → 0** when the server sent a direction, else `null` (`:134`) |
| `bDied` | false |
| `clip` | battlefield controller (set by `BATTLEFIELD.Characters.build`) |
| `items` | `[]` (never filled) |
| `anim` | current animation name (set by the clip) |
| `mainPlayer`, `weaponID` | unused / debug only |
| `SEQUENCER_anim`, `SEQUENCER_actions`, `GameActionsManager`, `EffectsManager` | `sequencer.md`, `fight.md` §5 |

If `attrs.cc` is set → `Player.setCCData(cc)`; `attrs.spells` → each record `Player.addSpell`; `attrs.items` →
`Player.addItem` (only the selected-character record carries them) (`:136-158`).

Accessor properties with change events (`:31-191`):

| Property | Backing | Event |
|---|---|---|
| `level` | `m_Level` | `onSetLevel(v)` |
| `XP` | `m_XP` | `onSetXP(v)` |
| `LP` | `m_LP` | `onSetLP(v, LPmax)` |
| `AP` | `m_AP` | `onSetAP(v)` |
| `GP` | `m_GP` | `onSetGP(v)` |
| `force`, `vitality`, `charism`, `karma`, `agility`, `intelligence` | `m_Force`… | `onSetForce`, `onSetVitality`, `onSetCharism`, `onSetKarma`, `onSetAgility`, `onSetIntelligence` |
| `rFire`, `rAir`, `rWater`, `rEarth` | `m_rFire`… | `onSetFire`, `onSetAir`, `onSetWater`, `onSetEarth` |
| `bonusPoints` | `m_BonusPoints` | `onSetBonus` |

Setters coerce with `Number()`. Read-only: `file` = `clips/sprites/<gfxID>.swf`, `guildName` =
`GUILD_NAMES[guild]`, `isDied` = `bDied`. Methods: `updateLP(d)`, `initLP()`, `updateAP(d)`, `initAP(mod=true)`,
`update(key, d)` (`this[key] += d`), `getEffects()` (`fight.md` §2, §5).

`createCharacter` reuses an existing record with the same id (resets its GameActionsManager) — the lobby
player list and the fight share records.

Other character constructors from the network (`AKSClient/Dofus.Client.Game.as:196-267`): movement entries
`+id;name;level;guild;sex;gfxID;c1;c2;c3;weapon;…` with `cell;dir` (solo/roleplay) or `LP;team;joinPosition`
(multiplayer); `id == 0` denotes an empty slot (`{num: 0}`). Removals use `"-"` entries — note the removed id
is always read from the **first** entry (`dataArray[1]`, `:249`), a bug when several removals are batched.

## 5. `Class_DataCenter_Game` — see `fight.md` §1

Fields: `m_bRunning`, `m_name`, `m_playerCount`, `m_maxPlayerCount`, `currentPlayerID`, `lastPlayerID`,
`state`, `turnSequence[]`, `Results{winners, losers}`, `bYouAreCreator`, `bInSearch`, `players` (provider by
`joinPosition`), `allowedCells` (added at placement). Properties: `isPlayerIn` (`state != null`), `isRunning`,
`name`, `isFull` (`m_playerCount >= m_maxPlayerCount`), `isMultiplayer` = `isFight` (`state > 1`), `isFree`
(`state == 2`), `isRandom` (`state == 3`) (`AKSClient/Dofus.DataCenter.Game.as`).

## 6. `Class_DataCenter_Channel` (`AKSClient/Dofus.DataCenter.Channel.as`)

`m_name`, `m_lastChannel`; property `name` (getter `m_name`; the setter ignores its argument and copies
`m_name` into `m_lastChannel`), `lastChannel`. The join handler writes `m_name` directly
(`AKSClient/Dofus.Client.DataProcessor.as:218-219`), so `m_lastChannel` is never set and
`AKS.Channels.join()` without a name sends `CJ` with an empty name (`undefined` → `""` in SWF6,
`AKSClient/Dofus.Client.Channels.as:13-25`). Game create/join set `m_name = null`.

## 7. Spells, launches, effects

* `Class_DataCenter_Spell` — `fight.md` §3.5. Also exposes `data` (`{name, file, type, infos, effects}` from
  non-existent `m_name/m_file/...` fields, unused).
* `Class_DataCenter_SpellLaunch` — `fight.md` §4.
* `Class_DataCenter_Effect` — `{m_Type, m_Value, m_RemainingTurn}`, but because its accessors were attached to
  the Spell prototype, effects are used through plain fields `type`, `value`, `remainingTurn`
  (`AKSClient/Dofus.DataCenter.Effect.as`; `fight.md` §5).

## 8. `Class_DataCenter_Item` (`AKSClient/Dofus.DataCenter.Item.as`)

Fields: `m_ID`, `m_Type`, `m_Gfx`, `m_ColorRed/Green/Blue` (0–255), `m_Position` (−1 = in bag), `m_Effects[]`
(`{type, bDescription, param1..3}`), from `getItemObjectFromData` (`missing-content.md` §3).

| Property | Value |
|---|---|
| `iconFile` | `clips/items/<m_Type>/<m_Gfx>.swf`; `clips/items/0.swf` when there are no effects (`:38-47`) |
| `typeText` | `I.t[m_Type]` |
| `superType` | `typeText.t`; `superTypeText` = `I.st[superType]` |
| `gender` | `["m","f","n"][typeText.g]` |
| `name` | capitalised type name + one `combine(I.e[e].n, gender, !typeText.s)` suffix per effect (`lang.md` §4.1) |
| `description` | lines of `getDescription(I.e[e].d, [p1,p2,p3])` for effects with parameters |
| `canEquip` | `true` unless `superType == 2` and `m_Type ∉ G[player.guild].w` |
| `colorObject` | `{ra: m_ColorRed, rb: 20, ga: m_ColorGreen, gb: 20, ba: m_ColorBlue, bb: 20}` when `m_ColorRed` is a number (`ra` etc. are *percentages* in a Flash colour transform) |

Inventory moves/drops: `AKS.Items.movement(id, position)`, `AKS.Items.drop(id)` from the inventory UI
(`modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:152,164`); drop confirmation →
`Player.dropItem` (`AKSClient/Events.AKS.Items.as:14-24`). Weapon change broadcast →
`character.weapon.gfx = "<type>_<gfx>"` (`:9-13`) — the sprite is not refreshed until rebuilt.
