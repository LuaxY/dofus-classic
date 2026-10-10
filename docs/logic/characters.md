# Characters on the battlefield

Sources: `AKSClient/Dofus.BattleField.Characters.as`, `AKSClient/Dofus.BattleField.Characters.Character.as`
(here "Character.as"), `AKSClient/Dofus.CharactersColors.as`, `AKSClient/Dofus.CharactersWeapons.as`,
`AKSClient/DialogBubbleSymbol.as`, `AKSClient/__Packages/dofus/graphics/battlefield/character/SmileyOverHead.as`.
Data model: `datacenter.md` §4. Movement queueing: `sequencer.md`.

## 1. Building a character

`BATTLEFIELD.Characters.build(data)` (`AKSClient/Dofus.BattleField.Characters.as:11-26`): removes the previous
controller `list.character<index>`, attaches `Dofus::BattleField::Characters::Character` at depth `index`,
`init(data)`, `setInteraction(true)`, `select(true)` (team circle) in multiplayer games, and sets
`data.clip = controller`. Called for the local player on map load, for others on movement/coordinate messages
(`AKSClient/Events.Battlefield.Map.as`, `Events.AKS.Game.as:219-223,354`).

`init(data)` (`Character.as:7-34`):

```
sprite = Container.Object2.clips.createEmptyMovieClip("sprite"+index, index + 200000)
sprite.__proto__ = MovieClip.prototype; sprite.createEmptyMovieClip("clip", 2)
sprite._ACTION = sprite._OBJECT = controller          // lets MovieClip.end() find the character
controller.onInitFrame = () => { setPosition(data.cell, data.dir); wait(); }
sprite.clip.loadMovie(data.file)                      // clips/sprites/<gfxID>.swf
CCOLORS.addCharacter(sprite.clip); CCOLORS.setColor(sprite.clip._target, color1, color2, color3)
WEAPONS.addCharacter(sprite.clip); WEAPONS.setData(sprite.clip._target, data)
data.SEQUENCER_action.clear()  /* typo: no-op */ ; data.SEQUENCER_anim.clear()
```

`onInitFrame` is set on the *controller* (an attached symbol, complete immediately), so the initial
`setPosition`/`wait` runs on the next frame regardless of whether the sprite SWF has finished loading.

Sprite files: `clips/sprites/<gfxID>.swf` with `gfxID = class·10 + sex` for player classes (10…101) and
1000–1007 for monsters (`dofus-5b/clips/sprites/`; gfxID comes from the server).

`clear()` (`:35-42`): forgets cell occupancy, removes the sprite, `endSmile()` (typo → smiley stays).
`Characters.clearAll()` clears every controller's sprite (controllers remain).

## 2. Animations and directions

`setAnim(anim)` (`:726-765`):

| `data.dir` | frame label | `_xscale` |
|---|---|---|
| 0 (down-right) | `anim + "R"` | 100 |
| 1 (down-left) | `anim + "R"` | −100 (mirrored) |
| 2 (up-left) | `anim + "L"` | 100 |
| 3 (up-right) | `anim + "L"` | −100 |
| other (null/undefined) | no jump | — |

Then: if the previous animation was `walk`/`run` and the new one is the same (case-insensitive), return
(keeps the walk cycle running); otherwise `clip.playFirstChildren()` (restart nested animations at frame 1) and
`data.anim = anim`. Animation names used by code: `static` (idle, via `wait()`), `Walk`, `Run`, `hit`,
`shoot`, `cast`, `die`, `bonus` (critical hit). `setDir(d)` stores `dir` and replays `data.anim`.

Frame labels (asset-side, read from the SWF tags): every class sprite has `Init`, `StaticR/L`, `WaitR/L`, `WalkR/L`,
`RunR/L`, `CastR/L`, `ShootR/L`, `BonusR/L`, `HitR/L`, `DieR/L`, `Podium` (monsters 1000–1007: no `Podium`). Labels are
matched case-insensitively under SWF6 (README §0, assumption; `50/51.swf` spell it `podium`). **Label typos**: `Bonus R`
(with a space) in `20.swf`/`21.swf`, `Bonus L` and `Bonus R` in `100.swf`/`101.swf` and `1000.swf` — `setAnim("bonus")`
cannot reach those frames (the critical-hit animation of Osamodas facing R, Sadida and monster 1000 does not play).
`Wait*` and `Podium` are not requested by AKSClient (`Podium` is used by UI podium clips, see `ui.md`).

### 2.1 Scripts inside the sprite SWFs (`clips/sprites/<n>.swf/…`)

Root timeline: frame 1 (`Init`) hides its placed child on load (`clips/sprites/10.swf/frame_1/PlaceObject2_2_1/CLIPACTIONRECORD onClipEvent(load).as:2`),
frame 2 `stop()` (`clips/sprites/10.swf/frame_2/DoAction.as:1`); most sprites also call `System.security.allowDomain("bo")`
there (e.g. `clips/sprites/30.swf/frame_2/DoAction.as`). Each label places animation sub-symbols whose frame scripts call
back into the client:

| Call | Where | Effect |
|---|---|---|
| `cColors.applyColor(<childInstance>, zone)` | frame 1 of body-part sub-symbols (§5) | recolour (`cColors` ≡ `CCOLORS` case-insensitively) |
| `WEAPONS.applyWeapon(this, "R"\|"L")` | frame 1 of the weapon-holder sub-symbol (§5) | attach the weapon |
| `this.end()` | Cast, Shoot and Die animations (frame list in `sequencer.md` §1.1) | ends the awaited anim step |
| `this.getActionClip().wait()` | last frame of Cast, Shoot, Hit and Bonus animations | back to `static` (`Character.wait`) |
| `this._parent.gotoAndStop("staticR"/"staticL")` | end of the Wait animation in Xélor, Iop, Sadida male (`clips/sprites/50.swf/DefineSprite_76/frame_55/DoAction.as:1`, `80.swf/DefineSprite_116/frame_35/…`, `100.swf/DefineSprite_73/frame_19/…`) | back to static (Wait is never requested by AKSClient) |
| `this.getActionClip().wait()` at frame 1 of a Static sub-clip | Xélor `50.swf`/`51.swf` (`clips/sprites/50.swf/DefineSprite_63/frame_1/DoAction.as:1`) | re-requests `static` whenever that child restarts |
| `SOMA.playSound(…)` | Walk/Run, Shoot, Hit, Die animations | footsteps and combat sounds (`sound.md` §5) |

Direction from movement (`calculateCharacterDirection(x1, y1, x2, y2)`, `:786-809`): `rot = atan2(y2−y1, x2−x1)`;
`rot < 0`: `|rot| > π/2 → 2` else `3`; `rot ≥ 0`: `rot < π/2 → 0` else `1`. The same 0–3 ids as path
directions (`pathfinding.md` §1).

## 3. Position and depth

`setPosition(cell, dir = data.dir, bSetDir = true)` (`:275-296`): `setNewCell(cell, true)` (occupancy
`map[cell].playerOnID = num`, `data.cell = cell`, tackle zones recomputed), `setDir(dir)` if requested, sprite at
the cell centre (`y − 10` when `groundSlope ∉ {1, undefined}`), depth `cell·100 + 50`.

## 4. Walking

`moveCharacterThroughPath(path, bSel)` (`:397-444`) — run as one waiting step of `SEQUENCER_actions`:

* `Selection.unSelectAll()`, clear the anim queue; `bRun = path.length > 15` (length counts the duplicated
  waypoints, `pathfinding.md` §5);
* queue `setPosition(path[0], getDirection(path[0], path[1]))`, then one waiting `move(path[i], i == last, bRun,
  false)` per cell; with `bSel` (multiplayer) every cell is pre-selected at depth 8 (`CELL_PATH_COLOR`) and a
  depth-9 `CELL_PATH_USED_COLOR` marker is queued after each step, then `unSelectAll`;
* `SEQUENCER_anim.onSequenceEnd` ends the outer action.

`move(cell, stopMove, bRun, bSlide)` (`:479-573`):

```
if cell == data.cell: end the anim step immediately; return
from = map[data.cell]; to = map[cell]
speed = bSlide ? 15 : from.movement + (bRun ? 3 : 0)          // px per frame (25 fps)
if cell > data.cell: depth = cell·100 + 50 now                  // else on arrival
variation = 0.3·speed
if to.groundLevel < from.groundLevel: speed += variation        // downhill faster
elif to.groundLevel > from.groundLevel: speed −= variation      // uphill slower
elif from.groundSlope != to.groundSlope: to flat → +variation, from flat → −variation
target = to.(x, y − (to.groundSlope != 1 ? 10 : 0))
calculateCharacterDirection(sprite → target); anim = bSlide ? static : (bRun ? "Run" : "Walk")
setNewCell(cell, stopMove)                                       // occupancy moves at step start; tackle zones only on the last step
every frame: advance `speed` px along rot; when remaining <= speed: snap, fix depth, (stopMove && !bSlide → static), end step
also re-place the speech bubble and smiley every frame
```

`slide(SEQUENCER_actions, cell)` (`:445-478`): `makeFullPath([data.cell, cell])`, same queueing with
`bSlide = true` (15 px/frame, idle animation) — used for push/pull (game action 5).
`stopMove()` (`:209-215`): clear `SEQUENCER_actions`, drop queued anim steps after the current one, queue
`wait()`. `wait()` = `setAnim("static")` (+ clears an `intervalID` that is never set).

`shoot(cell)`: face the cell, waiting `setAnim("shoot")`. `cast(...)`: `fight.md` §6. `die(seq)`:
`removePlayerTimeline(num)`, waiting `setAnim("die")`, then `clear()` and `setNewCell(undefined, true)`
(`:701-720`).

## 5. Colours and weapons (callbacks used by the sprite SWFs)

**CCOLORS** (`AKSClient/Dofus.CharactersColors.as`):

* `addCharacter(clip)` stores `{obj: clip}` under `clip._target` and drops entries whose clip no longer exists.
* `setColor(target, c1, c2, c3)` stores each colour unless it is `-1` (`-1` = keep the sprite's own colours).
* `applyColor(obj, zone)` (zone 1–3): finds the first registered entry whose target path is a **prefix** of
  `obj._target` and has `color<zone>`; applies `new Color(obj).setTransform({ra:0, rb:R, ga:0, gb:G, ba:0, bb:B,
  aa:100, ab:0})` — the sub-clip becomes a flat fill of that colour, alpha kept (`:39-58`).
* Callers: frame-1 scripts of the sprite's body-part sub-symbols, one call per coloured child instance, e.g.
  `cColors.applyColor(cArtySlot_R_pied01,1);` (`clips/sprites/10.swf/DefineSprite_21/frame_1/DoAction.as:1`). The
  zone→part assignment is **per sprite**, not global (from the instance names, French part names):

| Sprite | Zone 1 (`color1`) | Zone 2 (`color2`) | Zone 3 (`color3`) | Example site |
|---|---|---|---|---|
| 10 Féca ♂ | feet, legs, pelvis, torso, shoulders | cape (incl. running cape, cape parts on torso/shoulders) | hair | `clips/sprites/10.swf/DefineSprite_21/frame_1/DoAction.as:1` |
| 11 Féca ♀ | body, pelvis, leg trim, shoulders | cape, cape tie | hair, legs, feet | `clips/sprites/11.swf/DefineSprite_81/frame_1/DoAction.as:1` |
| 20 Osamodas ♂ | body, pelvis, boots, horns, thighs, feet | belt buckle, hair, thigh trim, hands | skin: arms, ears, face, legs | `clips/sprites/20.swf/DefineSprite_43/frame_1/DoAction.as:1` |
| 21 Osamodas ♀ | body, pelvis, hat, shoulders, torso | hands, hat/shoulder/dress bands, feet | skin: neck, arms, ears, face, legs | `clips/sprites/21.swf/DefineSprite_105/frame_1/DoAction.as:1-3` |
| 30 Enutrof ♂ | arms, body, shoulders | strap, hat | beard, big bag | `clips/sprites/30.swf/DefineSprite_50/frame_1/DoAction.as:1` |
| 31 Enutrof ♀ | arms, pelvis, body, knot, shoulders | pelvis band, strap | hair, big bag | `clips/sprites/31.swf/DefineSprite_19/frame_1/DoAction.as:1` |
| 40 Sram ♂ | hands, feet | head, pelvis, cape, upper body, shoulders, legs | arms, body | `clips/sprites/40.swf/DefineSprite_29/frame_1/DoAction.as:1` |
| 41 Sram ♀ | cape decoration, veil | hands, feet, arms, cape, legs, hood, corset, briefs, bra | body, shoulders, thighs, chest, face | `clips/sprites/41.swf/DefineSprite_9/frame_1/DoAction.as:1-2` |
| 50 Xélor ♂ | arms | hat band, star | pelvis, hat, body, shoulders | `clips/sprites/50.swf/DefineSprite_17/frame_1/DoAction.as:1-2` |
| 51 Xélor ♀ | arms (+ a cape) | pelvis, hat, legs, star | body, shoulders | `clips/sprites/51.swf/DefineSprite_8/frame_1/DoAction.as:1` |
| 60 Ecaflip ♂ | cape, thighs | body | fur: head, face, neck, arms, hands, shoulders, legs, feet, ears, tail | `clips/sprites/60.swf/DefineSprite_88/frame_1/DoAction.as:2` |
| 61 Ecaflip ♀ | lock of hair, jacket | socks | fur/skin: body, shoulders, legs, face, arms, thighs, hands, ears, feet | `clips/sprites/61.swf/DefineSprite_34/frame_1/DoAction.as:1` |
| 70 Eniripsa ♂ | thighs, wings, briefs | jacket, legs, feet, head band | skin: arms, body, ears, face, pelvis, hands, head | `clips/sprites/70.swf/DefineSprite_8/frame_1/DoAction.as:1` |
| 71 Eniripsa ♀ | wings | head band, briefs, bra | skin: arms, body, head, pelvis, bust, thighs, legs, hands, feet, face | `clips/sprites/71.swf/DefineSprite_150/frame_1/DoAction.as:1` |
| 80 Iop ♂ | armbands, cross, epaulettes, ankles, feet | hair | pelvis, body, fur boots, arms | `clips/sprites/80.swf/DefineSprite_19/frame_1/DoAction.as:1` |
| 81 Iop ♀ | arm trim, cross, shoulders, legs, feet | hair, ponytail | pelvis, arms, head band, body | `clips/sprites/81.swf/DefineSprite_21/frame_1/DoAction.as:1` |
| 90 Crâ ♂ | face, hair | cape, pelvis, arms, hands, torso | shoulders, upper torso, legs, feet | `clips/sprites/90.swf/DefineSprite_202/frame_1/DoAction.as:1` |
| 91 Crâ ♀ | hair | pelvis | boots, arms, hands, jacket, feet | `clips/sprites/91.swf/DefineSprite_81/frame_1/DoAction.as:1` |
| 100 Sadida ♂ | staff, belt, loincloth | arms, body, thighs, shoulders, hands | lock of hair, head | `clips/sprites/100.swf/DefineSprite_44/frame_1/DoAction.as:1-3` |
| 101 Sadida ♀ | hair, corset, lock | arms, boots, straps, belt, corset, feet, briefs, bra | body, thighs, shoulders, legs, hands, face, chest | `clips/sprites/101.swf/DefineSprite_88/frame_1/DoAction.as:1` |
| 1000–1007 monsters | — | — | — | no `applyColor` call: monsters are never recoloured |

  The same calls exist in the portrait SWFs used by the UI (`clips/guilds/artwork/faces/*.swf`, some
  `artwork/mini/*.swf`, e.g. `clips/guilds/artwork/mini/20.swf/DefineSprite_19/frame_1/DoAction.as:1-5`), which
  Interfaces registers with `CCOLORS` (`modules_Interfaces/Interface.Characters.as:56`, `Interface.PlayerCircle.as:18`,
  `TabStart_Podium.as:27`). Some instance names in the calls may not exist in the symbol (e.g. `Krokett_cou` beside
  `cKrokett_cou` in `21.swf`); `new Color(undefined)` is then a no-op.

**WEAPONS** (`AKSClient/Dofus.CharactersWeapons.as`):

* `addCharacter(clip)`, `setData(target, characterData)`.
* `applyWeapon(obj, side)`: prefix match as above; linkage = `data.weapon.gfx` (`"<type>_<gfx>"`, decimal), or if
  undefined `G[DATACENTER.Player.data.guild].w[0] + "_1"` — the **local player's** class, not the character's;
  `obj.clip.removeMovieClip(); obj.attachMovie(linkage, "clip", 10); obj.clip.gotoAndStop(side)`.
* Callers: a weapon-holder sub-symbol in each sprite runs `WEAPONS.applyWeapon(this, "R")` or
  `WEAPONS.applyWeapon(this, "L")` on its first frame (`clips/sprites/10.swf/DefineSprite_62/frame_1/DoAction.as:1`,
  `clips/sprites/10.swf/DefineSprite_150/frame_1/DoAction.as:1`). Every weapon symbol in `weapons.swf` has two frames
  labelled `R` (1) and `L` (2) (asset-side), so `side` selects the weapon drawing for right- or left-facing poses.
  Which holder (R or L) a label uses varies per sprite (e.g. Féca ♂ uses the `R` holder everywhere except `CastL`;
  Osamodas ♂ uses `L` for most R-facing labels); monsters have no holder (no weapon).
* Asset-side: `clips/sprites/weapons/weapons.swf` exports `<type>_<gfx>` symbols (types 2–8, gfx 1–15 with gaps: no `6_6`, `8_15`)
  plus unprefixed `3000`–`3015` (some missing), `4015`, `6002`, `6005`, `6006`, `6008`, `6017`; each class sprite imports exactly one of them (`missing-content.md` §2).
  Because the attach happens on a clip inside the sprite SWF, `attachMovie` resolves in that SWF's library, so
  presumably only the imported weapon can be displayed (inference; any other `weapon.gfx` attaches nothing). It also suggests the default weapon types per class (`G[c].w[0]`): Féca 4,
  Osamodas 7, Enutrof 8, Sram 5, Xélor 7, Ecaflip 6, Eniripsa 3, Iop 6, Crâ 2, Sadida 4 (asset-side inference,
  not beta data).

## 6. Interaction, name, circle, floating numbers

* `setInteraction(true)` (`:216-274`): roll-over → `showName(true)` + brighten (`Color` transform 60 % + 100);
  roll-out/release-outside → normal colour, hide name; release → `Interaction.onCellRelease(data.cell)`;
  over/out also forwarded to the cell handlers — only when interaction is enabled
  (`Class_Cell.prototype.onRelease`, `battlefield.md` §3).
* `showName(bool)`: `INTERFACE.drawToolTip(name [+ " (LP)" in fights], …)` above the sprite (below when near
  the top) (`:43-58`).
* `select(bool, bAnim, bAnimForced)`: child `circle` (depth 1 of the sprite) loads `clips/circle.swf`, then
  `animate(bAnim)` (`circle.play()` — the inner clip loops from label `anim` — or `circle.gotoAndStop(1)`) and
  `setColor(TEAMS_COLOR[team])` (`new Color(this.circle).setRGB(col)`) (`clips/circle.swf/frame_1/DoAction.as:1-16`,
  `clips/circle.swf/DefineSprite_5/frame_6/DoAction.as:1-2`); `bAnimForced` makes the animated state sticky
  (`:161-200`). `isSelect()` = circle exists.
* `showPoints("life"|"action", n)` (`:59-123`): text clip inside the sprite at `y = −clip._height`,
  `Font2` size 18, red (`LIFE_POINT_COLOR`, x −25, depth `(3+k)·100`) or blue (`ACTION_POINT_COLOR`, x 0,
  depth `3+k`), alpha 150; starts fading (−5 alpha, −2 px per frame) once the previous number is below 50 alpha
  (or after 20 stalled frames); negative life also plays `hit` (and tries the banner head anim, broken —
  README §0). `showActionPoints` is an unused older version.

## 7. Speech bubbles and smileys

* `say(txt, align = "left")` (`:344-366`): one `DialogBubbleSymbol` per character in `Container.Text`
  (`text<index>`, depth `maxDepth`, first = index then +1). `DialogBubble.setText`: scale-in 80 → 100 %,
  text `Font1` 10 pt black, width 150 auto-height, rounded box radius 18, fill `0xFFFFCE`, outline `0x4B4B4B`,
  tail symbol `BubblePic`, removed after `5000 + 10·length` ms (`AKSClient/DialogBubbleSymbol.as`).
  `placeBubble`: flip right of the sprite when `sprite._x < 375`, above when `sprite._y > 225` (container
  coordinates) (`:371-396`).
* Chat messages show a bubble only on role-play maps (`charac` is only resolved when `DATACENTER.Map.bRolePlay`,
  `AKSClient/Events.AKS.Chat.as:46-58`); fight code calls `say` directly (critical miss, `I_CANT_GO`).
* `smiley(id)` (`:318-339`): attaches `SmileyOverHead` to the **controller** (stage coordinates computed from the
  container scale/offset), which loads `clips/smileys.swf` with `ank.SWFLoader` at frame `id`, scales in by
  40 % per frame and removes itself after `SMILEY_DELAY` = 3000 ms (`AKSClient/__Packages/dofus/Constants.as:21,24`).
  Triggered by the server smiley broadcast (`AKS.Chat.onSmiley`, `AKSClient/Events.AKS.Chat.as:1-5`); sent by the
  smiley bar (`AKS.Chat.smiley(id)`).

## 8. Podium / lobby / UI uses of sprites

Interfaces loads the same sprite SWFs for the character list, creation preview, podium and faces
(`clips/guilds/artwork/faces/<gfxID>.swf`); see `ui.md`.
