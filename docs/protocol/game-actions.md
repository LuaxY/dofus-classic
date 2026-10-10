# Game actions (`GA`, `GAS`, `GAF`, `GKK`, `GKE`)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Game.as`, per-character action
state machine `AKSClient/Dofus.GameActionsManager.as`, server handler `AKSClient/Events.AKS.Game.as:495-838`,
dispatch `AKSClient/Dofus.Client.DataProcessor.as:320-332`.

Game actions carry everything that happens on a map: movement, map change, spell casts, damage, buffs, deaths,
object animations, loot. The client requests an action, the server broadcasts the resulting action(s), the acting
client animates them and acknowledges.

---

## GA — action request (C→S)

```
GA<typeDDD><params joined by ";">\n\0
```
`sendActions(actionType, params)` (`AKSClient/Dofus.Client.Game.as:98-101`): type left-padded with `0` to 3 digits
(`AKSClient/String.getAddLeftChar.as:1-13`), **no separator** between type and params.

| Type | Frame | Trigger | Params |
|---|---|---|---|
| 1 move | `GA001<path>` | click on a reachable cell, interaction type `move`, ≥ 500 ms after the previous click (`AKSClient/Events.Battlefield.Interaction.as:8-26`, `CLICK_MINIMUM_TIMER`, `AKSClient/Dofus.Kernel.Init.as:37`) | compressed path of the direction-change cells, **start cell excluded** — [encodings.md](encodings.md#path-encoding) |
| 300 cast spell | `GA300<spellId>;<cellNum>` | click on a valid target in `spell` mode (`AKSClient/Events.Battlefield.Interaction.as:27-41`); mode entered by `KERNEL.switchToSpellLaunch` after client-side AP / count / delay checks (`AKSClient/Dofus.Kernel.as:113-186`) | spell id, target cell (decimal) |
| 303 close combat | `GA303<cellNum>` | click on an adjacent occupied cell in `cc` mode (`AKSClient/Events.Battlefield.Interaction.as:42-50`); mode from `KERNEL.switchToCC` (`AKSClient/Dofus.Kernel.as:187-229`) | target cell |

Sending goes through `GameActionsManager.transmittingMove` (type 1) / `transmittingOther` (`AKSClient/Dofus.GameActionsManager.as:19-52`):
a new request is only sent when the manager is `READY` (state 0). For moves, if the previous move is `IN_PROGRESS`
(state 1, i.e. the server already answered), the client first sends a cancel (`GKE`) with its current cell, then the new
`GA001`. Otherwise it is silently dropped (`trace`).

Examples (map width 15): `GA001ccsq\n\0` (from 100 via 130 to 144, see encodings), `GA300141;233\n\0`, `GA303115\n\0`.

---

## GA — action result (S→C)

```
GA<actionId>;<type>;<actorId>;<params>\0
```
Dispatch: rubrique `G`, 2nd char `A`, 3rd char **not** `S`/`F` (those are `GAS`/`GAF`) (`AKSClient/Dofus.Client.DataProcessor.as:320-331`) →
`innerOnActions(fullFrame)` → `data.substr(2).split(";")` (`AKSClient/Dofus.Client.Game.as:300-303`). Only the first four
`;`-fields are used, so **`params` must not contain `;`**; inside `params` the separators are `,` (and `*` for type 10).

| Field | Notes |
|---|---|
| `actionId` | stored as the actor's current action id (`GameActionsManager.onServerResponse`, `AKSClient/Dofus.GameActionsManager.as:53-58`); used for `GKK`/`GKE`. Must not start with `S` or `F`. |
| `type` | `Number(type)`, table below |
| `actorId` | character whose action sequencer plays the action; must exist in `DATACENTER.Characters` |
| `params` | type-specific |

**Acknowledgement rule** (`AKSClient/Events.AKS.Game.as:826-833`): if `actorId` is the local player **and** `Number(actionId)` is
not NaN, the client queues `GameActionsManager.ack(actionId)` at the end of the actor's sequence → sends
`GKK<actionId>` once the animation has played. Otherwise it ends the action immediately (no frame). Use a non-numeric,
non-empty id (e.g. `x`) for results that need no ack; do not rely on an empty id (`Number("")` coercion differs between
Flash versions [SWF6 runtime]).

### Result types

All `params` below are split on `,` unless stated. "chat" = `KERNEL.traceToChat(getText(KEY,[…]))` queued on the actor's
sequencer; lang texts are missing (**UNKNOWN — not in code**), only the substitution order is known.

| Type | Params | Client effect | Code |
|---|---|---|---|
| 1 | `<fullPath>` (2-char cell codes, see [encodings.md](encodings.md#path-encoding); **first cell = start cell**) | stops a running move, then `moveCharacterThroughPath(makeFullPath(cells), isMultiplayer)` — walk (run if > 15 cells), path highlighted in multiplayer | `:507-516`, `AKSClient/Dofus.BattleField.Characters.Character.as:397-444` |
| 2 | (none) | map change: `LOADING_MAP`, client sends `GD` next frame | `:517-526` |
| 3 | (none) | `KERNEL.changeToMultiplayer()`: AP/LP reset, battlefield cleared, `Interface::MultiPlayer` drawn (which joins a channel, see [channel.md](channel.md)) | `:527-529`, `AKSClient/Dofus.Kernel.as:103-112` |
| 4 | `<charId>,<cell>` | teleport: `setPosition(cell, undefined, false)` (facing kept) | `:530-534` |
| 5 | `<charId>,<cell>` | slide (push) the character to `cell` along a straight line (`makeFullPath([current,cell])`) | `:535-540`, `AKSClient/Dofus.BattleField.Characters.Character.as:445-478` |
| 10 | `<award>*<award>*…` with `G<gold>` / `O<itemEntry>` / other | message boxes `YOU_FIND_GOLD [gold]`, `YOU_FIND_NEW_ITEM : <name>` (+ `Player.addItem`), `YOU_FIND_SOMTHING`. One item per `O` award ([items.md](items.md#item-entry-format)) | `:541-567` |
| 100 | `<charId>,<dLP>` | `dLP ≠ 0`: chat `WIN_LP`/`LOST_LP [name, dLP]` and `LP += dLP` with floating number; `0`: chat `NOCHANGE_LP [name]` | `:568-582` |
| 101 | `<charId>,<dAP>` | `dAP ≠ 0`: chat `LOST_AP [name, dAP]`, `AP += dAP` (shows "next turn" box if local player reaches ≤ 0) | `:583-597`, `AKSClient/Dofus.DataCenter.Character.as:218-234` |
| 102 | `<charId>,<dAP>` | as 101 without chat (AP spent) | `:583-597` |
| 103 | `<charId>` (no comma) | chat `DIE [name]`, death animation, sprite removed, timeline entry greyed (the extra `removePlayerTimeline(chracData.num)` uses a typo → undefined, harmless) | `:598-605`, `AKSClient/Dofus.BattleField.Characters.Character.as:701-720` |
| 104 | (ignored) | chat `CANT_MOVEOUT`, actor plays `hit` (tackled) | `:606-610` |
| 105 | `<charId>,<value>` | chat `REDUCE_DAMAGES [name, value]` | `:611-615` |
| 106 | `<charId>,<flag>` | chat `RETURN_SPELL_OK` if `flag == 1` else `RETURN_SPELL_NO` | `:616-621` |
| 107 | `<charId>,<value>` | chat `RETURN_DAMAGES [name, value]` | `:622-627` |
| 110 | `<charId>,<value>,<turns>` | chat `BOOST_LIFE_POINTS`, `LP += value`, effect type 0 added | `:628-635` |
| 111 | `<charId>,<value>,<turns>` | chat `BOOST_ACTION_POINTS`, `AP += value`, effect type 1 | `:636-643` |
| 112 | `<charId>,<value>,<turns>` | chat `BOOST_DAMAGES`, effect type 16 | `:644-650` |
| 114 | `<charId>,<value>,<turns>` | chat `MULTIPLICATE_DAMAGES`, effect type 17 | `:651-657` |
| 115 | `<charId>,<value>,<turns>` | chat `BOOST_CRITICAL_HIT`, effect type 18 | `:658-664` |
| 117 | `<charId>,<value>,<turns>` | chat `MODERATE_RANGE`, effect type 19 (range moderator used by spell range checks) | `:665-671` |
| 118 | `<charId>,<value>,<turns>` | chat `MODERATE_STRENGTH`, `force += value`, effect 10 | `:672-679` |
| 119 | `<charId>,<value>,<turns>` | chat `MODERATE_AGILITY`, `agility += value`, effect 14 | `:680-687` |
| 120 | `<charId>,<dLP>` | `LP += dLP`; chat `BOOST_FRIEND_LIFE_POINTS` only if `charId == actorId` | `:688-697` |
| 121 | `<charId>,<dAP>` | `AP += dAP` (the "next turn" box logic applies); chat `BOOST_FRIEND_ACTION_POINTS` only if `charId == actorId` | `:698-707` |
| 122 | `<charId>,<value>` | **no effect** (client bug: tests `tmpArray[0]` before assigning it) | `:708-715` |
| 123 | `<charId>,<value>,<turns>` | chat `MODERATE_KARMA`, `karma += value`, effect 13 | `:716-723` |
| 124 | `<charId>,<value>,<turns>` | chat `MODERATE_CHARISM`, `charism += value`, effect 12 | `:724-731` |
| 125 | `<charId>,<value>,<turns>` | chat `MODERATE_VITALITY`, `vitality += value`, effect 11 | `:732-739` |
| 126 | `<charId>,<value>,<turns>` | chat `MODERATE_INTELLIGENCE`, `intelligence += value`, effect 15 | `:740-747` |
| 130 | `<gold>` | chat `STEAL_GOLD [actorName, gold]` | `:748-752` |
| 150 | `<charId>` | chat `INVISIBILITY [name]` (no visual change) | `:753-758` |
| 200 | `<cellNum>,<state>` | `KERNEL.ExecuteAnim`: the layer-2 object on `cellNum` jumps to frame `state<state>` (interactive map objects) | `:759-762`, `AKSClient/Dofus.Kernel.as:63-66` |
| 300 | `<spellId>,<cellNum>,<animId>,<level>,<launchType>,<inFront>` | chat `HAS_LAUNCH_SPELL [actorName, spell name]`; actor casts animation `clips/spells/<animId>.swf` toward `cellNum` with launch type `launchType` (0,10,11,12,20-23,30-33,40,41,50,51 — see below); `inFront == "1"` → spell drawn in front of the player. If actor = local player, the cast is recorded for per-turn / per-target / delay limits | `:763-782`, `AKSClient/Dofus.BattleField.Characters.Character.as:590-700` |
| 301 | `<spellId>` (unused) | critical hit: sound, chat ` (CRITICAL_HIT)`, actor anim `bonus`, own head smiles | `:783-794` |
| 302 | `<spellId>` | critical failure: sound, chat `HAS_LAUNCH_SPELL` + ` (CRITICAL_MISS)`, actor says "Je suis trop nul" | `:795-803` |
| 303 | `<cellNum>` | chat `HAS_ATTACK_CC [actorName]`, close-combat anim `shoot` toward the cell | `:804-810`, `AKSClient/Dofus.BattleField.Characters.Character.as:574-589` |
| 304 | (none) | close-combat critical hit (sound, chat, anim `bonus`) | `:811-817` |
| 305 | (none) | close-combat critical failure (sound, chat `HAS_ATTACK_CC` + ` (CRITICAL_MISS)`, "Je suis trop nul") | `:818-824` |
| other | — | nothing besides the ack rule | |

"effect type N" = `KERNEL.addToEffectsManager(character, N, value, turns, charId == actorId)` (`AKSClient/Dofus.Kernel.as:285-293`):
remaining turns = `turns` if the target is the actor, else `turns - 1`. Type numbers = `AKSClient/Dofus.EffectsManager.as:6-25`.

Spell launch types (`Character.cast`, `AKSClient/Dofus.BattleField.Characters.Character.as:602-689`): `0` shoot anim only; `10` cast + spell at caster cell;
`11` cast + spell at target cell; `12` cast + spell on caster; `20`/`22` cast + rotate (22 + projectile); `21`/`23` shoot +
rotate (23 + projectile); `30`/`31` cast + arc (angle/speed 0.5/0.5 or 0.9/0.4); `32`/`33` shoot + arc; `40` shoot +
duplicate; `41` shoot + duplicate + projectile; `50`/`51` cast/shoot + free; other → trace "type de lancé pas bon" +
cast anim.

**`inFront` = 0 destroys a character sprite once every 21 launches** (found by the playtest, `docs/playtest.md`). The spell
clip goes into `Object2.clips` at depth `cell*100 + 50 + d + index` (`+ 51` for `shoot` clips), `d = inFront ? 20 : -20`,
`index` = `getNextIndex()` cycling 1..20, 0 (`AKSClient/Dofus.BattleField.Spells.as:41-50,54-58,71-76`), while a character
standing on a cell has its sprite at `cell*100 + 50` in the same clip (`AKSClient/Dofus.BattleField.Characters.Character.as:295,491,542`).
With `d = -20` the depths meet at index 20 (`+51`: 19), and `createEmptyMovieClip` replaces the occupant: the target's sprite
is gone and each later awaited animation of that character ends only on the 10 s sequencer timeout
(`AKSClient/Dofus.Sequencer.as:41`). With `d = 20` no launch depth can reach a character (`+50`) or the next cell's object
(`+100`). A server should send `inFront` = 1.

Examples:
```
GA1;1;12;bKccsq\0              Bobby (12) walks 100 → 115 → 130 → 144 (map width 15); 12 is the local player → GKK1
GAx;100;12;7,-12\0             no ack: Ali (7) loses 12 LP
GA2;300;12;141,233,141,1,11,0\0
GA3;103;12;7\0
```

---

## GAS / GAF — action block start / finish (S→C)

```
GAS<actorId>\0
GAF<actorId>\0
```
`AKSClient/Dofus.Client.DataProcessor.as:323-328` → `onActionsStart` / `onActionsFinish(substr(3))` (`AKSClient/Events.AKS.Game.as:455-494`). Only matter
when `actorId` is the local player:
- `GAS`: `m_bNextAction = true` → after each acked result the manager stays "transmitting" instead of returning to
  READY (`AKSClient/Dofus.GameActionsManager.as:70-82`), so the player cannot send another action; in a fight, interaction is disabled.
- `GAF`: `m_bNextAction = false`, manager reset; in a fight, re-enables interaction (`setEnabledInteractionIfICan(3)`,
  only during the player's own turn) and runs `KERNEL.cleanPlayer`.

Use `GAS<id>` … all `GA` results of one request … `GAF<id>` to make a multi-result action (spell + damage + death)
atomic for the requester **[inference from the state machine]**. `GV` and `GE` (sender = local player) also call
`onActionsFinish`.

Examples: `GAS12\0`, `GAF12\0`.

---

## GKK / GKE — acknowledge / cancel an action (C→S)

```
GKK<actionId>\n\0                     action played (no spinner)
GKE<actionId>|<cellNum>\n\0           move interrupted at cellNum (no spinner)
```
- `GKK`: `ActionAck` (`AKSClient/Dofus.Client.Game.as:110-114`), queued by the ack rule above. (It also calls
  `KERNEL.GameActionsManager.end()`, which does not exist — no-op.)
- `GKE`: `ActionCancel` (`AKSClient/Dofus.Client.Game.as:115-118`) from `GameActionsManager.cancel`
  (`AKSClient/Dofus.GameActionsManager.as:59-69`): only for a move (`canCancel` requires the same action type,
  `AKSClient/Dofus.GameActionsManager.as:102-119`), sent with the action id of the last `GA` result received for this character (`m_id`) and the cell the sprite is on
  (`clip.getCellNum()`), immediately followed by the new `GA001…`. The sprite stops where it is.

Examples: `GKK1\n\0`, `GKE1|115\n\0`.
