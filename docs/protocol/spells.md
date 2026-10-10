# Spells (`S` family)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Spells.as`, callbacks
`AKSClient/Events.AKS.Spells.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:54-69`. Spell casting in a fight
is a game action (`GA300`, [game-actions.md](game-actions.md)).

---

## Spell entry format

Used in `AS` part 29 (joined by `;`), `SM` (`+` entries) and `SUK`.

```
<spellId>~<level>~<zones>~<flags15>
<zones>   = (<shapeChar><sizeB64>)*          pairs of chars
<flags15> = 15 chars, see table
```
Parsed by `KERNEL.CharactersManager.getSpellObjectFromData` (`AKSClient/Dofus.CharactersManager.as:166-175`),
`setEffectZones` and `setAdditionalData` (`AKSClient/Copie de Dofus.DataCenter.Spell.as:26-61`).
`B64` = one char of the 64-char alphabet `a-z A-Z 0-9 - _` = values 0..63 ([encodings.md](encodings.md#base64-alphabet)).

| Part | Field | Decoding | Use |
|---|---|---|---|
| 0 | `spellId` | string (decimal) | key in `Player.Spells`; lang `S[id]` (name/description); icon `clips/spells/icons/<id>.swf` (`AKSClient/Copie de Dofus.DataCenter.Spell.as:68-72`). Class spells are `GUILD_SPELLS[guild]` = 20 consecutive ids per class (`AKSClient/__Packages/dofus/Constants.as:23`) |
| 1 | `level` | `Number` | lang `S[id]["l"+level]` texts; boost cost `SPELL_BOOST_BONUS[level]` (`AKSClient/Dofus.Kernel.Init.as:58`) |
| 2 | `zones` | per pair: `shape` = raw char, `size` = B64 | effect area drawn on hover: `P` point, `C` circle(size), `L` line(size), `X` cross(size) (`AKSClient/Dofus.BattleField.Pointer.as:47-60`) |
| 3 | `flags15` | see below | |

`flags15` (index = char position):

| # | Field | Decoding | Use |
|---|---|---|---|
| 0 | `m_bGuildSpell` | `"1"` = true | stored in the `Guild` tab instead of an element tab (`AKSClient/Dofus.DataCenter.Player.as:117-120`) |
| 1 | `m_Type` | raw char | element tab: `A` Air, `W` Water, `E` Earth, `F` Fire (`AKSClient/Dofus.DataCenter.Player.as:103-116`; read through `m_type`, same property under SWF6 case-insensitivity [SWF6 runtime]). Other values break `addSpell` (no tab) |
| 2 | `m_EffectType` | raw char | **read but unused** |
| 3 | `m_bOnItSelf` | `"1"` | may target own cell (`AKSClient/Dofus.PathFinding.as:337-341`) |
| 4 | `m_bLineOnly` | `"1"` | range drawn/checked as a cross (`AKSClient/Dofus.Kernel.as:154-161`, `AKSClient/Dofus.PathFinding.as:356-362`) |
| 5 | `m_Range` | B64 | range; `63` = whole map (`AKSClient/Dofus.Kernel.as:140,165`) |
| 6 | `m_APCost` | B64 | AP cost, checked client-side (`AKSClient/Dofus.Kernel.as:122`) |
| 7 | `m_bLineOfSight` | `"1"` | requires line of sight (`AKSClient/Events.Battlefield.Interaction.as:96-102`) |
| 8 | `m_bFreeCell` | `"1"` | target must be a free walkable cell (`AKSClient/Events.Battlefield.Interaction.as:92-95`) |
| 9 | `m_CriticalHit` | B64 | **read but unused** |
| 10 | `m_Criticalfailure` | B64 | **read but unused** |
| 11 | `m_LaunchCountByTurn` | B64 | casts per turn (`AKSClient/Dofus.SpellsManager.as:74-90`) |
| 12 | `m_LaunchCountByPlayerTurn` | B64 | casts per target per turn (`AKSClient/Dofus.SpellsManager.as:91-107`) |
| 13 | `m_DelayBetweenLaunch` | B64 | turns between casts; ≥ 63 = never again (`AKSClient/Dofus.DataCenter.SpellLaunch.as:16-28`) |
| 14 | `m_Position` | B64 | slot 1..8 in the used-spells bar; other values → `null` (`AKSClient/Copie de Dofus.DataCenter.Spell.as:56-60`) |

Example: `141~1~Pb~1F000bd10bbcbab` → spell 141, level 1, point zone, class spell, Fire tab, range 1, 3 AP, needs
LoS, 2 casts per turn, 1 per target, no delay, bar slot 1.

---

## SM — move a spell to the used-spells bar (C→S, S→C)

C→S:
```
SM<spellId>|<position>\n\0
```
`AKSClient/Dofus.Client.Spells.as:11-14` (no spinner). Trigger: the banner's `onAddUsedSpell(oldPosition, spellData)`
(`AKSClient/Dofus.Kernel.as:82-93`); `position` = bar slot (`spellData.m_Position`).

S→C:
```
SM<anything>|+<spellEntry>|-<anything>|…\0
```
`AKSClient/Dofus.Client.DataProcessor.as:60-61` → `innerOnMovement(fullFrame)` (`AKSClient/Dofus.Client.Spells.as:23-50`): part 0 ignored, stops at
the first empty part. `+` → the spell is (re)added and put into its spell-panel slot (`AKSClient/Events.AKS.Spells.as:1-10`);
any other first char → `onMovement(false,null)` → nothing. Example: `SM|+141~1~Pb~1F000bd10bbcbab\0`.

---

## SB / SU — boost (upgrade) a spell (C→S, S→C)

C→S `SB<spellId>\n\0` (`AKSClient/Dofus.Client.Spells.as:15-18`, spinner explicitly on). Trigger: spell panel boost button,
only out of game and if `bonusPoints >= SPELL_BOOST_BONUS[level]`
(`modules_Interfaces/DefineSprite_858_Interface.Banner.Panel.Spells/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_49/CLIPACTIONRECORD on(release).as:1-20`).

S→C:
```
SUK<spellEntry>\0     upgraded → Player.addSpell + banner refresh
SUE…\0                ignored
```
`AKSClient/Dofus.Client.DataProcessor.as:63-67` → `innerOnUpgradeSpell(substr(3))` (`AKSClient/Dofus.Client.Spells.as:51-56`, `AKSClient/Events.AKS.Spells.as:11-14`).
Bonus points are not decremented by the client; send `AB` stat 3 **[inference]**.

---

## SI — spell boost information (C→S, S→C)

C→S `SI<spellId>\n\0` (`AKSClient/Dofus.Client.Spells.as:19-22`, no spinner). Trigger: banner `onWantBootSpell(spellData)`
(`AKSClient/Dofus.Kernel.as:94-97`).

S→C:
```
SI<spellId>|<level>|<APCost>|<range>\0
```
`AKSClient/Dofus.Client.DataProcessor.as:57-58` → `innerOnInfos(substr(2))` (`AKSClient/Dofus.Client.Spells.as:57-66`) → boost panel shows
`LEVEL <level>` and `COST : SPELL_BOOST_BONUS[level-1]`, plus a spell-info viewer fed with `APCost`/`range`
(`AKSClient/Events.AKS.Spells.as:15-24`). Plain decimal fields here (not B64). Example: `SI141|2|3|1\0`.
