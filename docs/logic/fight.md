# Fights: games, turns, points, spells, effects, boosts

Server rules (damage, turn order, timer length, AI, XP) are not in the client: UNKNOWN — not in code. This file
documents what the client checks, displays and sends. Action-by-action reactions are in `sequencer.md` §4;
lobby UI in `ui.md`; message formats in `docs/protocol/`.

Note on the brief: range and area are **not** computed in `Dofus.BattleField.Spells.as` — range is
`PathFinding.checkRange`/`checkView` (`pathfinding.md` §6–7), the area preview is drawn by
`BattleField.Pointer` (`battlefield.md` §6); `BattleField.Spells` only plays projectile visuals (§6 below).

## 1. Game kinds and `DATACENTER.Game`

`Game.state` (`AKSClient/Dofus.DataCenter.Game.as`): `null` = none, `1` solo (village), `2` free (named game,
2 teams, creator starts), `3` random (team-mates + matchmaking). `isMultiplayer` and `isFight` are both
`state > 1` (`:38-57`) — a "fight" is any multiplayer game; the solo village has no turns.

| Phase | Trigger | Client logic | Site |
|---|---|---|---|
| create/join | game create/join replies | new `DATACENTER.Game`, `Player.data.initAP(false)`, `SpellsManager.init()`, `EffectsManager.init()`, drop other characters; free: name + `m_maxPlayerCount = (c0−64) + (c1−64)` from `params[1]`; random: name `getText("RANDOM")` | `AKSClient/Dofus.Client.Game.as:133-195` |
| lobby | movement messages | `m_playerCount ±1`, `Game.players[joinPosition]`, team radio buttons for own slot, `changeTeam(t)` only while not full; creator sees "play" button; start (`GS`) only when `isFull` | `AKSClient/Events.AKS.Game.as:65-228`, `Dofus.Client.Game.as:79-85,126-132` |
| placement | start-position message (`S` sub-code) | `allowedCells = [team0[], team1[]]`, `m_bRunning = true`, banner UI, team watcher, request map; on map load → ready → placement (`battlefield.md` §2.1) | `AKSClient/Events.AKS.Game.as:290-338` |
| start | start message | `SOMA.onGameStart` (fight music), hide team watcher, text `GAME_LAUNCH`, type `move`, interaction off until own turn | `:410-420` |
| turn order | turn list | `Game.turnSequence = ids`, `UIInterfaceBanner.activateTimeline(true)` | `Dofus.Client.Game.as:357-361`, `Events.AKS.Game.as:406-409` |
| turn start | `id\|durationMs` | timeline next, `currentPlayerID = id`, `AKS.Game.output.startTimer(ms/1000)`; own turn → `Interaction.setEnabled(3)`, `SpellsManager.nextTurn()`; `KERNEL.cleanPlayer(lastPlayerID)`; text `PLAYER_TURN(name)` (+ `" (<AP> AP)"` for self); unselect | `Events.AKS.Game.as:426-442` |
| turn finish | `id` | own → hide "next turn" box, interaction off; `lastPlayerID = currentPlayerID; currentPlayerID = null`; stop timer; `KERNEL.cleanUpGameArea(true)` (cursors off, pointer cleared, type `move`, path state reset) | `:443-454`, `AKSClient/Dofus.Kernel.as:230-242` |
| end turn (player) | "next turn" buttons | `AKS.Game.turnEnd()` sends `GT` only if `isCurrentPlayer` | `AKSClient/Dofus.Client.Game.as:119-125`, `modules_Interfaces/DefineButton2_923/…`, `DefineButton2_981/…` |
| end | game end message | `Game.Results = {winners[], losers[]}` with `{id, name, level, bDead, lowXp, xp, fullxp = lowXp + xp, highXp, winxp, gold}` (winner flag `"2"`); local player's `XP = fullxp`; result panel queued after the animations | `Dofus.Client.Game.as:378-420`, `Events.AKS.Game.as:366-394` |
| leave | leave reply / give up | `onActionsFinish(self)`, new Game, `Player.reset()`; running → `KERNEL.changeToMultiplayer()`; lobby → rejoin last channel and show the join tab | `Events.AKS.Game.as:229-256`, `AKSClient/Dofus.Kernel.as:320-328` |

A character leaving a running game dies visually (`clip.die`) unless in matchmaking search
(`AKSClient/Events.AKS.Game.as:136-146`).

## 2. Points

* **LP** (`Character.LP`, `LPmax`): `updateLP(d)` adds and shows a floating number; `initLP()` = `LPmax`
  (`AKSClient/Dofus.DataCenter.Character.as:207-217`). Only the server changes LP (actions 100/110/120).
* **AP** (`AP`, `APinit`): `updateAP(d)` adds, shows a blue floating number, and opens the "next turn" box
  (`INTERFACE.messageNextTurn()`) when the local player reaches `AP <= 0` (`:218-234`).
  `initAP(withModerator = true)`: `AP = APinit + EffectsManager.getModeratorValue(1)` (`:235-253`) — run for a
  character by `KERNEL.cleanPlayer(id)` when its turn is over (next turn start), and without moderator at game
  create/join. `KERNEL.changeToMultiplayer` resets AP and LP (`AKSClient/Dofus.Kernel.as:103-112`).
* **No movement points** in this beta: path length in a fight is capped by current AP (`pathfinding.md` §4) and
  the preview only shows cells within `AP` (Manhattan, no range moderator). The AP decrease after a move comes
  from the server (silent action 102 is the likely carrier; UNKNOWN — not in code).
* **GP**: boost id 2 / EffectsManager constant `GOLD = 2` (`AKSClient/Dofus.Client.Account.as:193-195`,
  `Dofus.EffectsManager.as:8`) — meaning beyond "gold" UNKNOWN.

## 3. Casting a spell

### 3.1 Entering targeting mode — `KERNEL.switchToSpellLaunch(spell)` (`AKSClient/Dofus.Kernel.as:113-186`)

Triggered by a banner spell slot (`modules_Interfaces/Interface.ButtonSpellBanner.as:75`) or keys 1–8
(`input.md`). Checks, in order (silently ignored if not in a fight or `GameActionsManager.isWaiting()`):

1. `Player.hasEnoughAP(m_APCost)` else chat `NOT_ENOUGH_AP`;
2. `SpellsManager.checkCanLaunchSpell(m_ID, undefined)` else chat its `errorMessage` (§4).

Then: unselect, `Player.currentSpell = spell`, `Pointer.clearAll()`;

```
if m_Range != 63:
   range = max(0, m_Range + moderator[19])
   for each zone in m_EffectZones: Pointer.addShape(zone.shape, zone.size, CELL_SPELL_EFFECT_COLOR)
   m_bLineOnly ? Pointer.drawFixedCross(range, CELL_SPELL_RANGE_COLOR, playerCell)
               : Pointer.drawFixedCircle(range, CELL_SPELL_RANGE_COLOR, playerCell)
else:
   Pointer.drawFixedRect(CELL_SPELL_RANGE_COLOR)        // whole screen; NOTE no area shapes are added
Interaction.setType("spell"); cursor = spell icon (clearing the cursor clears the pointer)
one-shot Mouse onMouseUp → setType("move")   // removed while hovering a cell, re-added on roll-out
KERNEL.forceOver()                           // synthetic rollover on the cell under the mouse
```

### 3.2 Target validity — roll-over (`AKSClient/Events.Battlefield.Interaction.as:80-118`)

```
canLaunch = false
if checkRange(playerCell, cell, m_bLineOnly, m_Range):            // moderated, min 1; own cell only if m_bOnItSelf
   if m_bFreeCell && cell.movement > 1 && cell.playerOnID == undefined:
       canLaunch = checkCanLaunchSpell(m_ID, occupant)
   if m_bLineOfSight:
       if checkView(playerCell, cell): canLaunch = checkCanLaunchSpell(m_ID, occupant)
   else if !m_bFreeCell:
       canLaunch = checkCanLaunchSpell(m_ID, occupant)
canLaunch ? (cursor allowed, Pointer.setVisible(true), Pointer.draw(cell)) : cursor forbidden
```

Quirk (verbatim behaviour): for a spell that needs both a free cell and line of sight, a free cell passes even
without line of sight, and an occupied cell passes when in line of sight. `occupant` = `map[cell].playerOnID`.

### 3.3 Release (`:27-41`)

`canLaunchSpell` → `BATTLEFIELD.Spells.clear()`, `GameActionsManager.transmittingOther(300, [m_ID, cell])`,
`currentSpell = null`; otherwise show `errorMessage` (if any). Always back to type `move`. The server's game
action 300 plays the cast and, for the local player, registers the launch in the SpellsManager
(`sequencer.md` §4).

### 3.4 Close combat (CC)

`Player.CCData = {m_APCost: <cc field of the selected character>, m_Description: getCCText(guild),
m_bOnItSelf: false, iconFile: "clips/ccicon.swf"}` (`AKSClient/Dofus.DataCenter.Player.as:67-75`, set from
`createCharacter`, `Dofus.CharactersManager.as:136-139`). `KERNEL.switchToCC(CCData)` (`AKSClient/Dofus.Kernel.as:187-229`,
key B/² or banner button): needs `Interaction.isEnable()`, a fight, not waiting, enough AP; area shape `C` size 0,
range circle 1. Valid target (`AKSClient/Events.Battlefield.Interaction.as:119-145`): `checkRange(…, false, 1)`
(moderated: `max(1, 1 + moderator[19])`, own cell excluded), target cell `movement > 1` **and occupied**, and
`checkView`. Release sends game action 303 `[cell]`. Damage tooltip from `G[guild].cc` (`lang.md` §4).

### 3.5 Spell record (`Class_DataCenter_Spell`)

Built from server data (`missing-content.md` §3): `m_ID, m_Level, m_EffectZones [{shape, size}], m_bGuildSpell,
m_Type (A/W/E/F), m_EffectType, m_bOnItSelf, m_bLineOnly, m_Range (63 = unlimited), m_APCost, m_bLineOfSight,
m_bFreeCell, m_CriticalHit, m_Criticalfailure, m_LaunchCountByTurn, m_LaunchCountByPlayerTurn,
m_DelayBetweenLaunch, m_Position (1–8 or null)`; for cast messages also `m_AnimID`, `m_bInFrontOfPlayer`.
Derived: `iconFile = clips/spells/icons/<id>.swf`, `file = clips/spells/<animID>.swf`, names/descriptions from
`S` (`AKSClient/Copie de Dofus.DataCenter.Spell.as`). `m_CriticalHit`, `m_Criticalfailure`, `m_EffectType` are
never read by the client.

## 4. `SpellsManager` — launch limits (`AKSClient/Dofus.SpellsManager.as`)

Owned by `DATACENTER.Player` (local player only). A `SpellLaunch` = `{m_SpellID, m_characOnID (target occupant),
m_spellData = Player.Spells[id], m_RemainingTurn = m_DelayBetweenLaunch (≥ 63 → Number.MAX_VALUE)}`
(`AKSClient/Dofus.DataCenter.SpellLaunch.as`).

| Method | Behaviour |
|---|---|
| `init()` | empty `SpellsCountByTurn[]`, `SpellsCountByTurn_Counter{}`, `SpellsCountByPlayer[]`, `SpellsCountByPlayer_Counter{}`, `SpellsDelay[]` (game create/join) |
| `addLaunchedSpell(l)` | per-turn limit ≠ 0 → record + `counter[id]++`; per-target limit ≠ 0 and target defined → record + `counterByPlayer[id]++`; delay ≠ 0 → record in `SpellsDelay` |
| `checkCanLaunchSpell(id, target)` | if a per-turn record of `id` exists and `counter[id] >= limit` → `CANT_LAUNCH_MORE(limit)`; if a per-target record of `id` **with the same target** exists and `counterByPlayer[id] >= limit` → `CANT_ON_THIS_PLAYER`; if `id` is in `SpellsDelay` → `CANT_RELAUNCH` (remaining ≥ 63) or `CANT_LAUNCH_BEFORE(remaining)`. Message stored in `BATTLEFIELD.Interaction.errorMessage` |
| `nextTurn()` | at the start of the local player's turn: clear both per-turn structures; decrement each delay record, remove those `<= 0` (with the `splice(i, i+1)` bug, README §0) |

Notes: the per-target counter is per spell, not per target (two casts on A and B block a third on A when the
limit is 2). With delay `N`, the spell is usable again at the start of the player's `N`-th next turn.
`initSpellLaunchData` is dead code (undefined constants, `:129-149`).

## 5. `EffectsManager` — timed modifiers (`AKSClient/Dofus.EffectsManager.as`)

One per character. Type ids (`:6-25`): 0 LIFE_POINTS, 1 ACTION_POINTS, 2 GOLD, 3 STATS_POINTS, 4 EXPERIENCE,
5 LEVEL, 6 RES_FIRE, 7 RES_AIR, 8 RES_WATER, 9 RES_EARTH, 10 STRENGTH, 11 VITALITY, 12 CHARISM, 13 KARMA,
14 AGILITY, 15 INTELLIGENCE, 16 DAMAGES, 17 DAMAGES_FACTOR, 18 CRITICAL_HIT, 19 RANGE (same ids as the
characteristic boost ids, §7).

* `Moderators[0..19]` start at 0 (`init`, `:28-39`; reset at game create/join for the local player).
* `KERNEL.addToEffectsManager(char, type, value, turns, bOnItSelf)` creates `{type, value, remainingTurn}` with
  `remainingTurn = bOnItSelf ? turns : turns − 1` (`AKSClient/Dofus.Kernel.as:285-293`) — `bOnItSelf` is
  `target == actor`. `addEffect` → `onEffectStart`: `Moderators[type] += value` (`:49-116`).
* `nextTurn()` — called through `KERNEL.cleanPlayer(id)` for the character whose turn just ended
  (`AKSClient/Dofus.Kernel.as:243-258`): each effect `remainingTurn −= 1`; when `< 0` → `onEffectEnd`
  (`Moderators[type] −= value`; for STRENGTH also `force −= value`) and removal (splice bug).
* Consumers: moderator 1 in `initAP`; moderator 19 in range checks/drawing. Others are only listed in the
  player-info panel (`"t:… v:… r:…"`, `modules_Interfaces/Interface.Banner.Panel.PlayerInfos.as:31-45`).
* Asymmetry: actions 118/119/123–126 change the stat immediately, but only STRENGTH is reverted when the effect
  ends; LP/AP boosts (110/111) change LP/AP immediately and are never reverted by the client.

## 6. Spell visuals (`Character.cast`, `AKSClient/Dofus.BattleField.Characters.Character.as:590-700`; `AKSClient/Dofus.BattleField.Spells.as`)

`cast(spellType, spell, {cellFrom, cellTo})` clears the anim queue, faces the target (screen angle) and queues:

| spellType | caster anim | then |
|---|---|---|
| 0 | `shoot` | — |
| 10 / 11 | `cast` | `Spells.launch(char, spell, cell)` at caster cell (10) / target cell (11), not awaited |
| 12 | `cast` | **W** `launchOnCharacter` (spell clip inside the caster sprite) |
| 20 / 21 / 22 / 23 | `cast` / `shoot` / `cast` / `shoot` | `launchRotate` (W for 20, 22, 23); 22/23 add `launchShoot` at the target |
| 30 / 31 | `cast` | **W** `launchToArc` with (angle, speed) = (0.5, 0.5) / (0.9, 0.4) |
| 32 / 33 | `shoot` | **W** `launchToArc` (0.5, 0.5) / (0.9, 0.4) |
| 40 / 41 | `shoot` | **W** `launchToDuplicate`; 41 adds `launchShoot` |
| 50 / 51 | `cast` / `shoot` | **W** `launchFree` |
| other | `cast` | trace "ERREUR : Le type de lancé n'est pas bon." |

Every caster animation step waits (`setAnim` with `waitEnd = true`) until the sprite animation calls `this.end()` (frames per class in `sequencer.md` §1.1; monsters without it time out after 10 s).
Spell clips are created in `Container.Object2.clips` (depths in `battlefield.md` §1), get `_ACTION = caster`,
load `clips/spells/<animID>.swf` into `clip`, and receive, on load (`onInitFrame`):

| Function | Position | Values given to the spell SWF |
|---|---|---|
| `launch` | cell centre | none (`:51-67`) |
| `launchFree` | origin | `level`, `cellFrom{x,y}`, `cellTo{x,y}` (`:68-89`) |
| `launchShoot` | target cell | `level`, `angle` (radians, `Map.calculateRotation`); removes child `rotate`; attaches library symbol `shoot` (`:90-113`) |
| `launchOnCharacter` | inside caster sprite (depth `100+idx`) | `level` (`:114-131`) |
| `launchRotate` | caster cell | `level`, `angle` (degrees); `rotate._rotation = angle; rotate.play()` (`:340-375`) |
| `launchToArc` | caster cell, `−20` y | attaches `move`; ballistic flight: `g = 9.81`, `vx = sqrt(|g/2·xDest² / (yDest − tan(angle)·xDest)|)`, `vy = tan(angle)·vx`, `t += speed` per frame, `angle = ((atan2(dy,|dx|) + π/2)·coef) − π/2`; mirrored for leftward targets; on arrival re-depth to `cellTo·100+70`, attach `shoot` at the destination rotated along the velocity, `end()` (`:259-339`) |
| `launchToDuplicate` | caster cell (−10 y on sloped cells) | `level`; every frame attaches a `duplicate` copy each `fullDist / floor(fullDist / (20 + level))` px along the line, `end()` past the target; ends immediately when caster == target (`:190-258`) |
| `launchToLine` | — | no caller (draws a debug curve on `Object2`) |

`Spells.clear()` removes spell clips older than `2 × SEQUENCER_TIMEOUT` = 20 s (garbage list, `:15-35`).
Spell sounds are played by the spell SWF itself when it loads (`sound.md` §5.1). Spell SWFs read `level` to scale effects (e.g. `t = 50 + 20 * _parent._parent.level`, `clips/spells/207.swf/DefineSprite_12_shoot/frame_1/PlaceObject2_11_1/CLIPACTIONRECORD onClipEvent(load).as:2`), `angle` to orient `shoot` (`clips/spells/103.swf/DefineSprite_8_shoot/frame_1/DoAction.as:2`), and `cellFrom`/`cellTo` for free-moving effects (`clips/spells/205.swf/DefineSprite_22/…`, `1010.swf`).

## 7. Boosts and progression

* **Spell boost** (banner spell panel, `modules_Interfaces/DefineSprite_858_Interface.Banner.Panel.Spells/…/on(release).as:1-20`):
  refused during a game (`CANT_BOOST_IN_GAME`); needs `bonusPoints >= SPELL_BOOST_BONUS[m_Level]`
  (`[0,5,8,13,20]` → level 1→2 costs 5, 2→3 8, 3→4 13, 4→5 20) else `NOT_ENOUGTH_BONUSPOINTS`; sends
  `AKS.Spells.boost(id)`. The info request (`AKS.Spells.getInfos`, from the banner "want boost") returns the
  upgraded level's `{m_ID, m_Level, m_APCost, m_Range}` shown next to the current one, with cost
  `SPELL_BOOST_BONUS[m_Level − 1]` (`AKSClient/Events.AKS.Spells.as:15-24`, `Dofus.Client.Spells.as:57-66`).
  The upgrade reply replaces the spell (`Player.addSpell`) and refreshes the banner
  (`AKSClient/Dofus.Client.Spells.as:51-56`). `SPELL_BOOST_COST` is unused.
* **Characteristic boost**: 10 buttons, each `if (Player.canBoost(1)) AKS.Account.boost(id)` with
  ids 6 rFire, 7 rAir, 8 rWater, 9 rEarth, 10 force, 11 vitality, 12 charism, 13 karma, 14 agility,
  15 intelligence (`modules_Interfaces/DefineButton2_527…551`). `canBoost(v)` = not in a running game and
  `bonusPoints >= v` (`AKSClient/Dofus.DataCenter.Player.as:151-162`). The server's boost reply lists
  `id;value` pairs: 0 → `LPmax = LP = v`, 1 → `APinit = AP = v`, 2 → `GP`, 3 → `bonusPoints`, 6–15 → the stat
  (`AKSClient/Dofus.Client.Account.as:169-231`). Point costs per stat are server-side (UNKNOWN).
* **Level up**: `level, XPlow, XP, XPhigh, bonusPoints` replaced; text `"vous passez niveau " + level`
  (`AKSClient/Dofus.Client.Account.as:158-168`, `Events.AKS.Account.as:180-183`). The XP gauge spans
  `XPlow…XPhigh` (`modules_Interfaces/Interface.Banner.Panel.PlayerInfos.as:56-61`).

## 8. Spell book and shortcut slots

`Player.addSpell(spell)` files the spell under `SpellsAir/Water/Earth/Fire` by `m_Type` `A/W/E/F`, or
`SpellsGuild` when `m_bGuildSpell` (replacing a same-id entry and keeping its `m_Position`), stores it in
`Player.Spells[id]`, and in `SpellsUsed[m_Position]` when it has a slot; returns `{index, location}`
(`AKSClient/Dofus.DataCenter.Player.as:98-150`). Dropping a spell on banner slot `us<k>` (k = 1–8) calls
`onAddUsedSpell(oldPos, spell)` → `SpellsUsed` update + `AKS.Spells.moveToUsed(id, k)`
(`AKSClient/Dofus.Kernel.as:78-98`, `modules_Interfaces/Interface.ButtonSpellBanner.as:55-71`). Class spell
lists for the creation screen: `dofus.Constants.GUILD_SPELLS` (20 ids per class, 1–220,
`AKSClient/__Packages/dofus/Constants.as:23`).
