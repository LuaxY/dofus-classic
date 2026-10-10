# BattleField (map view, cells, objects, selection, pointer, interaction)

`_global.BATTLEFIELD` is the `Dofus::BattleField` clip attached as `bf` (depth 2) by
`AKSClient/Dofus.Kernel.Init.as:64`; its constructor sets the global and builds the children
(`AKSClient/Dofus.BattleField.as:1-20`). Map decoding and projection: `map-format.md`. Characters: `characters.md`.
Spell visuals: `fight.md` §6.

## 1. Clip tree and depths

| Path | Depth | Class / content | Role |
|---|---|---|---|
| `BATTLEFIELD.Container` | 100 | `Class_BattleField_Container` | everything visible; masked, centred, zoomable |
| `BATTLEFIELD.Objects` | 200 | `Class_BattleField_Objects` (`list` child) | controllers for layer-2 objects |
| `BATTLEFIELD.Map` | 300 | `Class_BattleField_Map` | build/update, geometry helpers, tackle zones |
| `BATTLEFIELD.Selection` | 400 | `Class_Battlefield_Selection` | coloured full cells |
| `BATTLEFIELD.Pointer` | 500 | `Class_Battlefield_Pointer` | spell range/area shapes |
| `BATTLEFIELD.Characters` | 600 | `Class_BattleField_Characters` (`list` child) | character controllers |
| `BATTLEFIELD.Spells` | 700 | `Class_BattleField_Spells` (prototype `new Object()`) | spell projectiles |
| `BATTLEFIELD.Effects` | 800 | `Class_BattleField_Effects` | full-screen effect SWF (no caller) |
| `BATTLEFIELD.Interaction` | 900 | `Class_Battlefield_Interaction` | input state machine |
| `BATTLEFIELD.MaskClip` | 1100 | `maskRond` (not exported) | `setRoundMask`, no caller |

`Container` children (`AKSClient/Dofus.BattleField.Container.as:7-47`):

| Child | Depth | Content |
|---|---|---|
| `mask` | 2 | rectangle mask from `applyMask` |
| `Interaction` | 100 | `layer0` (100): map cells; `layer1` (200): placement cells — `Dofus::Cell` clips |
| `Ground` | 200 | `clips/ground.swf` (loaded once, then `Ground.clear()` on reset) |
| `Object1` | 300 | `clips/objects.swf` — object layer 1 |
| `Selection` | 400 | `MC_Cell_Full` highlights |
| `Grid` | 500 | `MC_Cell_Grid` per cell, `_alpha = 15`, hidden by default (toggle Shift+1 or placement phase) |
| `Pointer` | 600 | `fixedZone` (1), `dragZone` (2) drawing-API shapes |
| `Object2` | 700 | `clips/objects.swf`; **`Object2.clips` holds layer-2 objects, characters and spells** |
| `Text` | 800 | `DialogBubbleSymbol` speech bubbles (`text<index>`, depth `maxDepth`) |
| `Effect` | 900 | `Effects.load(file)` target |

Z-order inside `Object2.clips` (single sorted list):

| Item | Depth | Site |
|---|---|---|
| layer-2 object of cell `n` | `n·100` | `AKSClient/Dofus.BattleField.Objects.Object.as:12` |
| character standing on cell `n` | `n·100 + 50` (created at `index + 200000`, then `swapDepths`) | `AKSClient/Dofus.BattleField.Characters.Character.as:15,295,491,542` |
| spell clip at cell `n` | `n·100 + 50 ± 20 + idx` (`+20` if `m_bInFrontOfPlayer`, `idx` 1–20 rotating; `+51` for shoot/free variants) | `AKSClient/Dofus.BattleField.Spells.as:58,76,97,138` |
| arc projectile on arrival | `cellTo·100 + 70` | `AKSClient/Dofus.BattleField.Spells.as:298,322` |

Since cell numbers grow row by row (top to bottom), `n·100` gives painter's order. While walking, a character
switches to the destination depth when the destination number is higher, otherwise on arrival
(`Character.move`, `characters.md` §4).

`BATTLEFIELD.clear()` = `Characters.clearAll()`, `Objects.clearAll()`, `Container.clear()` (re-runs `init`:
recreates `Interaction`, `Selection`, `Grid`, `Pointer`, `Text`, `Effect`; calls `clear()` on the three loaded
SWFs), `Interaction.init()` (`AKSClient/Dofus.BattleField.as:21-28`).

Container helpers: `centerMap`, `zoomMap`, `applyMask` (`map-format.md` §4); `zoom(f, bAdd=true)` adds or sets
`_xscale/_yscale` then recentres; `show(layer, bool)` sets `_visible` (or toggles when `bool` is falsy);
`setColor(true)` = identity transform, `setColor(false)` = night tint `ra=ga=38, ba=60` (debug keys only)
(`AKSClient/Dofus.BattleField.Container.as:93-156`).

## 2. Map controller (`AKSClient/Dofus.BattleField.Map.as`)

| Member | Behaviour |
|---|---|
| `cell_width = 53`, `cell_height = 27` | `:15-16` |
| `data` | `DATACENTER.Map` after `build` |
| `getData(n)` | `data.data[Number(n)]` |
| `getWidth()/getHeight()` | `data.width/height` |
| `build(map)`, `updateCell(n)` | `map-format.md` §5 |
| `getCellHeight(n)` | `(groundLevel−7) + (slope ≠ 1 ? 0.5 : 0)` (`:302-308`) |
| `calculateTacleZone()` | `pathfinding.md` §4.1 |
| `calculateRotation(c1, c2)` | `atan2(y2−y1, x2−x1)` in screen space, radians (`:340-350`) |
| `getCaseNum`, `getCellHeightXY` | duplicate/unused helpers (`getCellHeightXY` returns nothing) |

### 2.1 After build: `onMapLoad` (`AKSClient/Events.Battlefield.Map.as:1-64`)

Shows the Container, then:

* **Solo / roleplay** (`!Game.isMultiplayer`): clear text, `Interaction.setEnabled(1)` (release only), build the
  player's character if it exists (`Characters.build(player)`, which positions it via `onInitFrame`), type `move`.
  Other characters arrive through the game movement/coordinates messages (`AKSClient/Events.AKS.Game.as:219-223,339-365`).
* **Multiplayer**: text `WAITING_OTHER`, define `AKS.Game.onEverybodyIsReady` and send ready (`AKS.Game.ready()`).
  When everybody is ready (placement phase, `:10-50`):
  1. the player's character gets `cell = 500` (**hard-coded**), is built and `sprite.startDrag(true)` (follows the
     mouse);
  2. every allowed start cell of team 0/1 (`Game.allowedCells`, `AKSClient/Events.AKS.Game.as:290-313`) is
     highlighted with `Selection.select(cell, true, 0, TEAMS_COLOR[team])`; the player's own team cells also get
     an interaction cell on `layer1`;
  3. `layer0` hidden, `layer1` shown, player sprite non-interactive, type `place`, `setEnabled(1)`,
     text `PLACE_CHARACTER` (4 s), grid shown.

  Releasing a placement cell (type `place`) sends `AKS.Game.setPlayerPosition(cell)` unless it is the current cell,
  and re-enables the player sprite (`AKSClient/Events.Battlefield.Interaction.as:51-56`). Positions come back as
  coordinates → `Characters.build` + `setPosition`, own sprite `stopDrag()` (`AKSClient/Events.AKS.Game.as:339-365`).
  Fight start (`onStartToPlay`, `:410-420`): type `move`, interaction disabled until the player's turn, `layer0`
  shown, `layer1` hidden.

## 3. Cells and interaction (`AKSClient/Dofus.BattleField.Interaction.as`, `Events.Battlefield.Interaction.as`)

* `addCell(n, x, y, layer, slope)`: attaches `Dofus::Cell` as `layer<layer>.cell<n>` (depth `n`), scale 105 %,
  frame = slope (if ≠ 1), `clip.num = n` (`:29-43`); `addCellNum(n, layer)` uses the map position (`:24-28`).
  `Class_Cell` is an empty MovieClip subclass (`AKSClient/Dofus.Cell.as`).
* **Global enable switch**: handlers are installed on `Class_Cell.prototype` (shared by every cell), not per cell
  (`:112-153`):

| `setEnabled(state)` | onRelease | onRollOver/onRollOut |
|---|---|---|
| 0 `STATE_NONE` (or unknown) | removed | removed |
| 1 `STATE_RELEASE` | set | removed |
| 2 `STATE_OVER_OUT` | removed | set |
| 3 `STATE_RELEASE_OVER_OUT` | set | set |

  Character and object sprites forward their events to the cell handlers **only if
  `Class_Cell.prototype.onRelease` exists** (`AKSClient/Dofus.BattleField.Characters.Character.as:224,242,260`,
  `Dofus.BattleField.Objects.Object.as:37,44,52`) — `onRelease` doubles as the "interaction on" flag.
  `isEnable()` returns the last value passed to `setEnabledAll/setEnabledRelease`. `hideInteractions(true)` (used
  when banner panels open, `modules_Interfaces/Interface.Banner.as:85,118`) disables everything;
  `hideInteractions(false)` restores `currentState`.
* Typical states: 0 outside the player's turn and while the player's own actions are playing; 3 during the
  player's turn (`AKSClient/Events.AKS.Game.as:435`, `KERNEL.setEnabledInteractionIfICan(3)`); 1 in solo maps and
  during placement.
* **Types** (`allTypes = {move:1, spell:2, cc:3, place:4}`, `setType(name)`, `:15-16,158-161`):

| Type | Release | RollOver | RollOut |
|---|---|---|---|
| 1 move | path + send move (`pathfinding.md` §3) | fights: path preview within AP | fights: clear preview |
| 2 spell | if `canLaunchSpell`: `Spells.clear()`, send game action 300 `[spellID, cell]`, `currentSpell = null`; else show `errorMessage`; back to `move` (`:27-41`) | validity test, cursor forbidden or `Pointer.draw(cell)` (`fight.md` §3) | install a one-shot `Mouse` `onMouseUp` → back to `move`; cursor forbidden; hide pointer |
| 3 cc | if `canLaunchSpell`: send action 303 `[cell]` (`:42-50`) | valid if range ≤ 1, target cell has `movement > 1` and an occupant, and `checkView` | same as spell |
| 4 place | `setPlayerPosition(cell)` | — | — |

* `errorMessage`, `canLaunchSpell`, `lastActionTime` live on the Interaction object; `init()` resets them and
  sets type `move` (`:12-23`).
* `Round(cellnum, ray, layer)` (diamond of interaction cells) has no caller.

## 4. Layer-2 objects (`AKSClient/Dofus.BattleField.Objects*.as`)

* `Objects.build(objectData, n, cellData)` attaches a controller `list.object<n>` (depth `n`) and calls
  `init`, which creates the visible sprite `Container.Object2.clips.cell<n>` (depth `n·100`), attaches the linkage
  `objectData.fileNum` as `clip`, positions it at the cell and applies `layerObject2Flip` (`_xscale *= −1`)
  (`Objects.as:11-18`, `Objects.Object.as:6-23`).
* `setInteraction(true)`: sprite forwards release/rollover/rollout to the cell handlers and highlights itself
  (`select(true)` = colour transform `ra=ga=ba=30 %, rb=gb=bb=+180`; `select(false)` = identity; no argument =
  toggle) (`:29-66,80-120`).
* `setAnim(anim)`: `data.anim = anim; sprite.clip.gotoAndStop(anim)` — game action 200 calls
  `KERNEL.ExecuteAnim(cell, state)` → `Objects.list["object"+cell].setAnim("state"+state)`
  (`AKSClient/Dofus.Kernel.as:63-66`; `sequencer.md` §4). Frame labels `state<k>` must exist in the object symbol.
* `clear()` resets `layerObject`/`layerObjectNum` (names that do not exist on cells) and removes both clips;
  `stopAnim/playAnim` recursive stop/play; `chgCell` re-depths (no caller); `setVisible`.

## 5. Selection (`AKSClient/Dofus.BattleField.Selection.as`)

`select(n, bool, depth, col)`: when the cell exists, attaches `MC_Cell_Full` as `Container.Selection["cell"+n+depth]`
at depth `n·100 + depth`, at the cell position, frame = `groundSlope`, `Color.setRGB(col)`, and records it in
`selectedCells`; `bool=false` removes that name (`:23-48`). `unSelectAll()` removes recorded clips only;
`clearAll()` removes every child; `selectAll(bool, depth, col)` loops all cells; `chgColor` recolours (no caller).
Depths in use: 0 = placement cells, 8 = path preview/selected path, 9 = path already walked
(`AKSClient/Dofus.BattleField.Characters.Character.as:426-427`).

## 6. Pointer — range and area shapes (`AKSClient/Dofus.BattleField.Pointer.as`)

* `shapes` = list of `{shape, size, col}` (`addShape`, `:64-67`), reset by `clearAll()` together with both zones
  (`:22-38`). `draw(cell)` redraws `dragZone` with every shape centred on `cell` (`:39-63`):

| Shape | Drawn |
|---|---|
| `P` | `drawCircle(radius 0)` = the cell itself |
| `C` | `drawCircle(size)` = all cells with `|ΔX|+|ΔY| <= size` (diamond) |
| `X` | `drawCross(size)` = the cell plus 4 arms of `size` cells along ±X and ±Y |
| `L` | `drawLine(size, cell, playerCell)` = the cell plus one arm of `size` cells, on the arm index `getDirection(playerCell, cell)` (arm 0 = X−1, 1 = Y−1, 2 = X+1, 3 = Y+1) — i.e. extending **away from the caster** behind the target; no arm when targeting the own cell |

* Fixed (range) zones: `drawFixedCircle(r, col, centre)`, `drawFixedCross(r, col, centre)` into `fixedZone`;
  `drawFixedRect(col)` = whole 742×432 viewport (range 63) (`:68-85`).
* Outlines follow each traversed cell's real corners (`cellCoord[slope]` and `−20·(groundLevel−7)`), fill colour
  at 50 % alpha with a 1 px line; the zone clip is then moved to the centre cell with the ground offset removed
  (`movePointerTo`, `:86-91`). Out-of-map cells count as flat level 7 (`getGroundData`, `:370-376`).
* `selectCharactersIn(zone, centre, bFixed)` (`:377-407`): for every character clip except the local player
  (unless the current spell is `m_bOnItSelf`): `select(true, false, bFixed)`; if `zone.hitTest(sprite._x,
  sprite._y, true)` → animated selection — for fixed (range) zones only when `checkView(centre, characterCell)`.
  `unselectAllCharacters(bFixed)` resets circles to `select(Game.isFight, false, bFixed)`; `setVisible(b)` shows
  or hides the drag zone.

## 7. Effects (`AKSClient/Dofus.BattleField.Effects.as`)

`load(file)` → `Container.Effect.loadMovie(file)`, `unload()` → `loadMovie("")`; `setVisible` targets a
non-existent `Container.Effects`. No caller in the decompiled code.

## 8. Screen ↔ map

Mouse picking is done by the player's hit-testing of `Dofus::Cell` clips (diamond-shaped symbol scaled 105 %),
character and object sprites — there is no analytic screen→cell conversion in the code. Screen positions of
map points are converted to stage coordinates with `cell.x · (Container._xscale/100) + Container._x` (e.g.
`AKSClient/Events.Battlefield.Interaction.as:23`, `Dofus.BattleField.Characters.Character.as:52`).
