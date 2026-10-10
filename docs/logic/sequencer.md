# Sequencer, GameActionsManager and the game-action stream

Sources: `AKSClient/Dofus.Sequencer.as`, `AKSClient/Dofus.GameActionsManager.as`, `AKSClient/MovieClip.end.as`,
`AKSClient/Events.AKS.Game.as:455-838`, `AKSClient/Dofus.Client.Game.as:98-118,300-303`. Message framing of
`GA`/`GAS`/`GAF`/`GKK`/`GKE`: `docs/protocol/`.

Every `DATACENTER` character owns two sequencers and one actions manager
(`AKSClient/Dofus.DataCenter.Character.as:25-27`):

| Object | Role |
|---|---|
| `SEQUENCER_actions` | queue of game actions received for (or performed by) this character: chat lines, LP/AP updates, whole moves/casts |
| `SEQUENCER_anim` | queue of animation steps inside one action (each path step, cast animation, projectile) |
| `GameActionsManager` | client side of the request/ack protocol for actions the local player initiates |

## 1. `Class_Sequencer`

Fields: `unicID = String(getTimer()) + random(10000)` (unique key, `:4`), `ActionIndex` (0–10000 wrapping,
`:101-111`), `actions[]`, `bPlaying`, `timeoutID`, `onSequenceEnd` (callback, default `null`), `referer` (set by
users).

```
addAction(waitEnd, object, fn, params): actions.push({id: nextIndex, waitEnd, object, fn, parameters: params})   // :10-19
play():                                                                                                          // :20-48
  bPlaying = true
  if actions empty: stop(); return
  a = actions[0]
  if a.waitEnd: a.object[unicID] = a.id            // the object remembers which action it must end
  a.fn.apply(a.object, a.parameters)
  if !a.waitEnd: onActionEnd(a.id)                 // synchronous: a chain of non-waiting actions runs in one call
  else: clearTimeOut(); timeoutID = setInterval(this, "onActionTimeOut", SEQUENCER_TIMEOUT /*10000 ms*/, a.id)
onActionEnd(actionID):                                                                                           // :73-96
  // actionID is IGNORED: whatever action is at the head is finished
  clearTimeOut()
  if actions empty: return
  actions.shift()
  if actions empty: clear(); onSequenceEnd()       // clear() = no timeout, actions = [], bPlaying = false
  else if bPlaying: play()
onActionTimeOut(id): trace("TIMEOUT !!!"); onActionEnd(id)                                                       // :68-72
stop(): bPlaying = false        clearAllNextActions(): keep only actions[0]        isPlaying(): bPlaying
```

Consequences a port must keep or consciously fix:

* A waiting action ends on its completion signal **or** after 10 s. The timer is cleared on every
  `onActionEnd`, so it fires at most once per action.
* Because the id is ignored, a completion signal that arrives late (after a timeout already advanced the queue)
  ends the *next* action early.
* `stop()` does not drop actions; `clear()` does.
* Callers check `if (!seq.isPlaying()) seq.play()` after enqueuing, so new actions append to a running queue.

### 1.1 Completion signals

| Waiting action | How it ends |
|---|---|
| `Character.move(cell, …)` (anim queue) | on arrival `sprite.end(data.SEQUENCER_anim)` (`AKSClient/Dofus.BattleField.Characters.Character.as:551,571`) |
| `Character.setAnim("cast"/"shoot"/"die")` with `waitEnd = true` (anim queue) | the animation sub-symbol inside the sprite SWF calls `this.end()` at a fixed frame (table below); sprites without that call fall back to the 10 s timeout |
| `BATTLEFIELD.Spells.launch*` with `waitEnd = true` | `launchToArc`/`launchToDuplicate` call `end()` themselves on arrival (`AKSClient/Dofus.BattleField.Spells.as:207,244,327`); the other variants rely on a `this.end()` inside the spell SWF (list below) |
| `moveCharacterThroughPath`, `slide`, `shoot`, `cast`, `die` (actions queue) | they fill `SEQUENCER_anim` and set `SEQUENCER_anim.onSequenceEnd = () => SEQUENCER_actions.onActionEnd(referer[SEQUENCER_actions.unicID])` — the outer action ends when the inner animation queue empties (`Character.as:435-439,469-473,583-587,691-695,711-715`) |

**Sprite animations** — frame (of the animation sub-symbol, 25 fps) at which `this.end()` is called; the same
sub-symbol later calls `this.getActionClip().wait()` to return to `static`. Sites: `clips/sprites/<n>.swf/DefineSprite_<id>/frame_<f>/DoAction.as:1`
(e.g. Féca ♂ CastR `clips/sprites/10.swf/DefineSprite_147/frame_20/DoAction.as:1`, its `wait()` at `frame_33`).

| Sprite | Cast R / L | Shoot R / L | Die R, L |
|---|---|---|---|
| 10, 11 Féca | 20 / 13 (♀ 14 / 13) | 11 / 10 | 100 |
| 20, 21 Osamodas | 20 / 15 (♀ 20 / 19) | 21 / 24 | 100 |
| 30, 31 Enutrof | 24 / 24 | 20 / 18 | 50 |
| 40, 41 Sram | 18 / 18 | 9 / 9 | 50 |
| 50, 51 Xélor | 14 / 14 | 30 / 14 | 100 |
| 60, 61 Ecaflip | 21 / 21 | 20 / 21 | 100 |
| 70, 71 Eniripsa | 18 / 18 | 4 / 4 | 50 |
| 80, 81 Iop | 23 / 24 | 20 / 18 | 50 |
| 90, 91 Crâ | 16 / 15 | 26 / 30 (♀ 27 / 29) | 50 |
| 100, 101 Sadida | 22 / 17 | 23 / 23 | 50 |
| 1003, 1004 | 21 / 21 | — | 50 |
| 1005, 1006 | — | — | 50 |
| 1007 | — | — | 49 |
| 1000, 1001, 1002 | — | — | — |

"—" = no `end()`: the awaited step times out after `SEQUENCER_TIMEOUT` (10 s), e.g. any cast or death of monsters
1000–1002 and close combat of every monster. Steps queued after the anim (e.g. `Spells.launch` for spell types
10/11, not awaited) therefore start at the `end()` frame — the "release" moment — while the caster animation keeps
playing. `Hit` and `Bonus` animations only call `wait()` (they are not awaited).

**Spell SWFs** — `this.end()` sits in a sub-symbol of the spell (`MovieClip.end` walks up to the spell holder whose
`_ACTION` is the caster, so it ends the caster's `SEQUENCER_anim` head step): `0, 101, 104, 105, 202, 205, 206, 209,
301–304, 401–408, 501, 502, 505, 506, 507, 602, 603, 702–707, 801–804, 806–809, 903, 904, 906, 907, 1001–1010,
1101–1107` (e.g. `clips/spells/101.swf/DefineSprite_14/frame_53/DoAction.as:1`; `705–707` and `1101–1107` call it from
the root timeline, `clips/spells/705.swf/frame_69/DoAction.as:1`). No `end()`: `103, 207, 208, 305, 601, 701, 901,
902, 905, 908` (arc projectiles — export `move`/`shoot`, ended by `launchToArc`), `604, 805` (export `duplicate`, ended
by `launchToDuplicate`), and `102, 201, 503, 504`, which time out (10 s) if the server pairs them with an awaited
launch variant (spell type 12, 20, 22, 23, 50, 51). The animID ↔ spellType pairing comes from the server —
UNKNOWN — not in code.

Object animations (`clips/objects.swf`) also call `this.end()` (e.g. `clips/objects.swf/DefineSprite_393/frame_34/DoAction.as:2`),
but `Object2` sprites have no `_ACTION` ancestor, so the call does nothing.

`MovieClip.prototype.end(sequencer)` (`AKSClient/MovieClip.end.as:1-12`): `owner = getActionClip()` (first
ancestor with `_ACTION`), `obj = getObjectClip()`, `sequencer ??= owner.data.SEQUENCER_anim`,
`sequencer.onActionEnd(obj[sequencer.unicID])`. Character sprites set `_ACTION = _OBJECT = character clip`
(`Character.as:19-20`); spell clips set `_ACTION = character`, `_OBJECT = BATTLEFIELD.Spells` (not for
`launchFree`/`launchShoot`, harmless since the id is ignored).

## 2. `Class_GameActionsManager` (`AKSClient/Dofus.GameActionsManager.as`)

States: `STATE_READY = 0`, `STATE_IN_PROGRESS = 1`, `STATE_TRANSMITTING = 2`; fields `m_id`, `m_bNextAction`,
`currentType`, `_DATA` (owner character).

| Method | Behaviour |
|---|---|
| `init()` | `m_id = undefined, m_bNextAction = false, READY, currentType = null` (`:11-18`) |
| `isWaiting()` | `TRANSMITTING` or `IN_PROGRESS` (`:88-101`) |
| `canCancel(type)` | `type == currentType` and state is `READY` or `IN_PROGRESS` (`:102-119`) |
| `transmittingMove(type, params)` | not waiting → `AKS.Game.sendActions(type, params)` (`"GA" + zeroPad3(type) + params.join(";")`, `AKSClient/Dofus.Client.Game.as:98-101`), state `TRANSMITTING`, `currentType = type`; else if `canCancel(type)` → `cancel(currentCell)` then retry; else ignored (`:19-38`) |
| `transmittingOther(type, params)` | send only when not waiting (`:39-52`) |
| `cancel(params)` | sets `currentType = null`, then if `canCancel()` (no argument: `undefined != null` is false in AS1, so only the state test applies) → `AKS.Game.ActionCancel(m_id, params)` (sends `GKE<id>\|<params>`), `_DATA.clip.stopMove()`, `init()` (`:59-69`) |
| `onServerResponse(id)` | `m_id = id`, `IN_PROGRESS` — called for every received game action of that character (`AKSClient/Events.AKS.Game.as:504`) |
| `end(IAmSender)` | `if (!m_bNextAction \|\| !IAmSender) init(); else { TRANSMITTING; m_id = undefined }` (`:70-82`) |
| `ack(id)` | `AKS.Game.ActionAck(id)` (sends `GKK<id>`, then calls `KERNEL.GameActionsManager.end()` which does not exist → no-op, `AKSClient/Dofus.Client.Game.as:110-114`), then `end(true)` |

Cancel-and-replace therefore happens when the player clicks a new destination while the previous move is
`IN_PROGRESS` (server already answered with an action id): `GKE<oldId>|<currentCell>` is sent, the character stops,
and the new move is sent immediately.

## 3. Turn-level wrappers

| Event | Effect | Site |
|---|---|---|
| actions start (local player) | `GameActionsManager.m_bNextAction = true`; in fights enqueue `Interaction.setEnabled(0)` | `AKSClient/Events.AKS.Game.as:455-473` |
| actions finish (local player) | `m_bNextAction = false`, `GameActionsManager.end(true)` (→ `init`); in fights enqueue `KERNEL.setEnabledInteractionIfICan(3)` and `KERNEL.cleanPlayer(id)` | `:474-494` |
| leave game / game end by self | `onActionsFinish(player.ID)` is replayed | `:229-231,366-371` |

So while a server-side action block is running for the local player the map is not clickable; it re-enables
(state 3) at the end of the block if it is still the player's turn.

## 4. Received game actions (`AKS.Game.onActions`, `AKSClient/Events.AKS.Game.as:495-838`)

Input: `[idAction, type, actorID, params]` (`data.substr(2).split(";")`, `AKSClient/Dofus.Client.Game.as:300-303`).
Common prologue/epilogue:

```
actor = DATACENTER.Characters[actorID]; Q = actor.SEQUENCER_actions; G = actor.GameActionsManager
G.onServerResponse(idAction)
switch(type) { … enqueue steps on Q … }
if (!isNaN(Number(idAction)) && actorID == Player.ID)  Q.addAction(false, G, G.ack, [idAction])   // GKK after the visuals
else                                                   G.end(actorID == Player.ID)
if (!Q.isPlaying()) Q.play()
```

Steps marked **W** wait for completion; others run instantly in queue order. "chat X" = `KERNEL.traceToChat(getText(X, …), INFO_CHAT_COLOR)`.

| Type | Params (as parsed) | Client reaction |
|---|---|---|
| 1 | compressed path | if `actor.SEQUENCER_anim` is playing → `clip.stopMove()`; **W** `clip.moveCharacterThroughPath(extractFullPath(p), Game.isMultiplayer)` (path cells highlighted/marked as walked in multiplayer) |
| 2 | — | not queued: text `LOADING_MAP`, hide anim-selection and tooltip, next frame `GetMapData` (map change) |
| 3 | — | not queued: `KERNEL.changeToMultiplayer()` (to the multiplayer lobby) |
| 4 | `charID,cell` | `chars[charID].clip.setPosition(cell, undefined, false)` (teleport, keeps direction) |
| 5 | `charID,cell` | **W** `chars[charID].clip.slide(Q, cell)` — straight push/pull at 15 px/frame, no walk anim |
| 10 | `*`-separated awards | not queued: `G<n>` → box `YOU_FIND_GOLD(n)`; `O<item>` → `Player.addItem` + box `YOU_FIND_NEW_ITEM : name`; other → `YOU_FIND_SOMTHING` |
| 100 | `charID,dLP` | `dLP != 0`: chat `WIN_LP`/`LOST_LP(name, dLP)`, `updateLP(dLP)` (floating red number, `hit` anim if negative); `0`: chat `NOCHANGE_LP(name)` |
| 101 | `charID,dAP` | (skip if 0) chat `LOST_AP(name, dAP)`, `updateAP(dAP)` |
| 102 | `charID,dAP` | (skip if 0) silent `updateAP(dAP)` — presumably the AP spent by a move (UNKNOWN — not in code) |
| 103 | `charID` | chat `DIE(name)`, `removePlayerTimeline(chracData.num)` (typo, no-op), **W** `clip.die(Q)` (anim `die`, remove sprite, move data to cell 0) |
| 104 | — | chat `CANT_MOVEOUT`, actor anim `hit` |
| 105 | `charID,v` | chat `REDUCE_DAMAGES(name, v)` |
| 106 | `charID,ok` | chat `RETURN_SPELL_OK(name)` if `ok == 1` else `RETURN_SPELL_NO(name)` |
| 107 | `charID,v` | chat `RETURN_DAMAGES(name, v)` |
| 110 | `charID,v,turns` | chat `BOOST_LIFE_POINTS`, `updateLP(v)`, effect type 0 |
| 111 | `charID,v,turns` | chat `BOOST_ACTION_POINTS`, `updateAP(v)`, effect type 1 |
| 112 | `charID,v,turns` | chat `BOOST_DAMAGES`, effect 16 |
| 114 | `charID,v,turns` | chat `MULTIPLICATE_DAMAGES`, effect 17 |
| 115 | `charID,v,turns` | chat `BOOST_CRITICAL_HIT`, effect 18 |
| 117 | `charID,v,turns` | chat `MODERATE_RANGE`, effect 19 |
| 118 | `charID,v,turns` | chat `MODERATE_STRENGTH`, `force += v`, effect 10 |
| 119 | `charID,v,turns` | chat `MODERATE_AGILITY`, `agility += v`, effect 14 |
| 120 | `charID,v` | `updateLP(v)`; chat `BOOST_FRIEND_LIFE_POINTS` only if `charID == actorID` |
| 121 | `charID,v` | `updateAP(v)`; chat `BOOST_FRIEND_ACTION_POINTS` only if `charID == actorID` |
| 122 | `charID,v` | intended chat `BOOST_FRIEND_DAMAGES`; never shown (reads `tmpArray` before assigning it) |
| 123 | `charID,v,turns` | chat `MODERATE_KARMA`, `karma += v`, effect 13 |
| 124 | `charID,v,turns` | chat `MODERATE_CHARISM`, `charism += v`, effect 12 |
| 125 | `charID,v,turns` | chat `MODERATE_VITALITY`, `vitality += v`, effect 11 |
| 126 | `charID,v,turns` | chat `MODERATE_INTELLIGENCE`, `intelligence += v`, effect 15 |
| 130 | `gold` | chat `STEAL_GOLD(actorName, gold)` |
| 150 | `charID` | chat `INVISIBILITY(name)` (no visual change) |
| 200 | `cell,state` | `KERNEL.ExecuteAnim(cell, state)` → layer-2 object `gotoAndStop("state"+state)` |
| 300 | `spellID,cell,animID,level,spellType,inFront` | chat `HAS_LAUNCH_SPELL(name, S[spellID].n)`; **W** `clip.cast(Number(spellType), spell{m_ID, m_AnimID, m_Level, m_bInFrontOfPlayer: inFront=="1"}, {cellFrom: actor cell, cellTo: cell})`; if actor is the local player: `SpellsManager.addLaunchedSpell(new SpellLaunch(spellID, map[cell].playerOnID))` immediately |
| 301 | `spellID` | spell critical hit: `SOMA.onGameCriticalHit`, chat `" (" + CRITICAL_HIT + ")"`, anim `bonus`; local player → banner head anim `smile` |
| 302 | `spellID` | spell critical miss: `SOMA.onGameCriticalMiss`, chat `HAS_LAUNCH_SPELL` + `" (CRITICAL_MISS)"`, bubble `"Je suis trop nul"` (no cast animation) |
| 303 | `cell` | chat `HAS_ATTACK_CC(name)`; **W** `clip.shoot(cell)` (face the cell, anim `shoot`) |
| 304 | — | close-combat critical hit: sound, chat `(CRITICAL_HIT)`, anim `bonus` |
| 305 | — | close-combat critical miss: sound, chat `HAS_ATTACK_CC` + `(CRITICAL_MISS)`, bubble |

"effect N" = `KERNEL.addToEffectsManager(target, N, v, turns, charID == actorID)` (`fight.md` §5).
`traceToChat`'s third argument (`true` = same line) is ignored, so "(CRITICAL_HIT)" is a separate chat line
(`AKSClient/Dofus.Kernel.as:67-77`). Unknown types only get the epilogue.

Actions the client sends (all through `GameActionsManager`): 1 = move (`[compressedPath]`,
`AKSClient/Events.Battlefield.Interaction.as:21`), 300 = cast (`[spellID, cell]`, `:32`), 303 = close combat
(`[cell]`, `:46`). Turn end (`GT`) and placement (`Gp`) are separate messages (`AKSClient/Dofus.Client.Game.as:94-125`).

Game end (`AKS.Game.onEnd`, `AKSClient/Events.AKS.Game.as:366-394`) is also queued on the *sender's* action
queue (timeline off, timer stop, hide team watcher/tooltip/next-turn box, `SOMA.onGameEnd`, chat
`"Fin de partie"`, result panel `GameResultRandom` or `GameResultFree`), so results appear after the last
animation.
