# Path finding, range and line of sight

Source: `AKSClient/Dofus.PathFinding.as` (`KERNEL.PathFinding`), path encoding in `AKSClient/Dofus.Compressor.as`,
callers in `AKSClient/Events.Battlefield.Interaction.as`. Coordinates and the cell walk are defined in
`map-format.md` §4 (`W` = `DATACENTER.Map.width`).

## 1. Coordinates and directions

* `getCaseCoordonnee(n)` → diagonal `{x: X, y: Y}`; `getCaseNum(X, Y) = X·W + Y·(W−1)` (`:89-104`).
* Neighbour offsets (4-connected, diagonal on screen): `[+W, +(W−1), −(W−1), −W]` (`:128`).
* Direction ids (shared by path encoding, characters and pointer):

| dir | diagonal step | cell offset | screen direction |
|---|---|---|---|
| 0 | X+1 | `+W` | down-right |
| 1 | Y+1 | `+(W−1)` | down-left |
| 2 | X−1 | `−W` | up-left |
| 3 | Y−1 | `−(W−1)` | up-right |

* `getDirection(c1, c2)` (`:256-283`): `dx = X1−X2`, `dy = Y1−Y2`; `dx == 0 → (dy > 0 ? 1 : 3)`; `dx > 0 → 0`;
  else `2`. It is the direction of the step **from `c2` to `c1`**; non-aligned pairs are classified by `dx` only.
* `getAbsoluteDirection(c1, c2)` (`:284-314`): same, but `−1` when neither `X` nor `Y` is equal.
* `checkAlign(c1, c2)`: `X1 == X2 || Y1 == Y2` (`:315-328`).
* Characters use a screen-angle version (`calculateCharacterDirection`, `characters.md` §3) that yields the
  same 0–3 ids.

## 2. State machine (`State`)

| State | Set by | Meaning |
|---|---|---|
| `STATE_MOVE_SINGLE` = 0 | `setInitState(false)`: solo game start (`AKSClient/Events.AKS.Game.as:6`), `KERNEL.cleanUpGameArea` outside fights (`AKSClient/Dofus.Kernel.as:241`) | click = compute and move |
| `STATE_SELECT` = 1 | `setInitState(true)`: fight rollover (`AKSClient/Events.Battlefield.Interaction.as:75`), turn end cleanup | rollover previews, release validates |
| `STATE_MOVE` = 2 | never assigned | dead branch (`:57-64`) |

`setInitState(true)` also resets `DATACENTER.Player.lastClickedCell` (`:12-16`).

## 3. `calculatePath(character, cell, bRelease)` (`:22-66`)

```
if map[cell].playerOnID != undefined → false            // occupied target
if map[cell].movement == 0          → false
MOVE_SINGLE: pathFind(from, cell, bFull=false)
             tmpPath != null → true, else character.say(getText("I_CANT_GO"), "center") → false
SELECT:      pathFind(from, cell, bFull=true)
             bRelease → lastClickedCell = cell; draw tmpFullPath in CELL_PATH_SELECT_COLOR; → true
             else     → draw tmpFullPath in CELL_PATH_OVER_COLOR;                         → false
```

`drawPathSelection(col)` = `BATTLEFIELD.Selection.unSelectAll()` then select every `tmpFullPath[i].num` at depth 8
(`:67-78`). In SELECT mode a release returns `true` even when no path exists; the caller then finds
`compressPath(null) == undefined` and sends nothing.

Callers:

| Event | Code | Behaviour |
|---|---|---|
| cell release, interaction type `move` | `AKSClient/Events.Battlefield.Interaction.as:8-26` | `calculatePath(player.clip, cell, true)`; drop if `getTimer() − lastActionTime < CLICK_MINIMUM_TIMER` (500 ms); `compressPath(tmpPath)` → `GameActionsManager.transmittingMove(1, [path])` (sends game action 1, `sequencer.md`), clear temp paths, `INTERFACE.drawAnimSelection` at the cell |
| cell roll-over, type `move`, fights only | `:68-79` | if `checkRange(playerCell, cell, false, player.AP, false)` → `setInitState(true)`, `calculatePath(clip, cell, false)` (preview) |
| cell roll-out, type `move`, fights only | `:155-160` | `Selection.unSelectAll()` |

## 4. `pathFind(cellBegin, cellEnd, bFull)` — A* variant (`:112-255`)

```
adverseTeam = player.team != 0 ? 0 : 1
maxLength   = Game.isFight ? player.AP : 500          // in fights the path length is capped by ACTION points
open["cell"+begin] = {num, g:0, v:0, h:est(begin,end), f:h, parent:null}
loop:
  if open is empty: tmpPath = null (and tmpFullPath = null if bFull); stop
  cur = open node with smallest f (strict <, initial min 5000; ties → first in for..in order)
  remove cur from open
  if cur.num == end: reconstruct (below); stop
  for d in [W, W−1, −(W−1), −W]:
     n = cur.num + d
     if |Map.data[n].x − Map.data[cur].x| >= 27: skip           // row-wrap guard (real neighbours differ by 26.5)
     c  = Map.data[n]; tz = Map.TacleZoneTeam<adverseTeam>[n]
     onLast = (n == end) && (c.movement == 1 || tz)
     free   = c.playerOnID == undefined                          // (BATTLEFIELD.Map.bRolePlay is never set → always checked)
     tackleOK = !Game.isFight || !(tz && !onLast)
     if c.active && (c.movement > 1 || onLast) && free && tackleOK:
        newv = cur.v + 1 + (5 − c.movement)/5                   // step cost: movement 5 → 1, 7 → 0.6, 2 → 1.6, 1 → 1.8
        newg = cur.g + 1                                        // step count
        oldv = open[n].v ?? closed[n].v ?? null
        if (oldv == null || oldv > newv) && newg <= maxLength:
           remove n from closed; (re)write open[n] = {num:n, g:newg, v:newv, h:est(n,end), f:newv+h, parent:cur}
  closed["cell"+cur.num] = copy of cur
```

* Heuristic `est = goalDistEstimate(a, b) = |Xa−Xb| + |Ya−Yb|` (`:79-88`). Not admissible when `movement > 5`
  (step cost < 1), so paths are not guaranteed optimal; port verbatim (including tie order) if exact parity matters.
* `movement == 1` cells and enemy tackle-zone cells can only be the **last** step.
* Occupied cells are never crossed (in or out of fight).
* Reconstruction (`:156-189`), walking from the end to the start (start cell excluded):
  `tmpDir = getDirection(node, node.parent)` = direction of the step arriving at `node`;
  * `bFull`: prepend `{num, dir}` to `tmpFullPath`; if its length exceeds `maxLength` → both paths `null`;
  * prepend `{num, dir}` to `tmpPath` only when `tmpDir` differs from the previously seen direction →
    `tmpPath` = the end cell plus every corner cell (last cell before a turn).
* All temp variables (`first`, `p1`, `p2`, `dist`…) are undeclared globals in the original.

### 4.1 Tackle zones (`AKSClient/Dofus.BattleField.Map.as:309-339`)

`calculateTacleZone()` rebuilds `DATACENTER.Map.TacleZoneTeam0/1` from scratch: for every entry of
`DATACENTER.Characters`, each of the 4 neighbours of `Number(character.cell)` whose screen x differs by exactly
26.5 is marked in `TacleZoneTeam<character.team>`. Called from `setNewCell(cell, true)` — every `setPosition` and
the last step of each move (`AKSClient/Dofus.BattleField.Characters.Character.as:297-307,534`). Dead
characters are moved with `setNewCell(undefined, true)`, i.e. to cell `Number(undefined) = 0` under SWF6 (README §0),
so they still project a zone around cell 0. `Map.init` also writes `data.ArrayTacleTeam0/1`, but `data` is
undefined at that time (dead code, `:13-14`).

## 5. Path encoding

Client → server (`compressPath`, `AKSClient/Dofus.Compressor.as:170-191`): for each `tmpPath` entry
(corners + end, start excluded) two characters from the `a–z A–Z 0–9 - _` alphabet:

```
c1 = alphabet[(dir << 4) + ((num >> 6) & 0x0F)]   // dir 0–3 in bits 4–5, cell bits 6–9
c2 = alphabet[num & 0x3F]                          // cell bits 0–5   → cell numbers limited to 0–1023
```

Server → client (`extractFullPath`, `:192-207`): pairs decoded to `cell = ((c1 & 0x0F) << 6) | c2` (dir bits
ignored), then `makeFullPath(cells)` (`:208-236`) expands every leg with `getAbsoluteDirection(next, from)` and
the offsets `[W, W−1, −W, −(W−1)]` indexed by dir (straight lines only; a non-aligned leg jumps directly).
Each waypoint is emitted twice (the loop re-pushes `cellfrom` before expanding the next leg); harmless because
`move()` to the current cell ends immediately (`AKSClient/Dofus.BattleField.Characters.Character.as:569-572`).
The first decoded cell is used as the starting position (`setPosition(path[0])`, `:412`), so the path the server
broadcasts must **start with the mover's current cell** — the client never sends it (inference from the two
call sites; the server format itself is UNKNOWN — not in code, see `docs/protocol/`).
`makeFullPath([from, to])` is also used for push-back slides (`slide`, `:448`).

## 6. Range (`checkRange(c1, c2, bLineOnly, range, bModerate = true)`, `:329-368`)

```
if Player.data.cell == c2 && !Player.currentSpell.m_bOnItSelf → false   // cannot target own cell unless self-castable
r = bModerate ? max(1, Number(range) + EffectsManager.getModeratorValue(19)) : Number(range)
if bLineOnly && !checkAlign(c1, c2) → false
return |ΔX| + |ΔY| <= r                                                    // no minimum range in this beta
```

Moderator 19 = `RANGE` effect (`fight.md` §5). Note: `KERNEL.switchToSpellLaunch` draws the range shape with
`max(0, range + mod)` while `checkRange` accepts `max(1, …)` (`AKSClient/Dofus.Kernel.as:142-147`).

## 7. Line of sight (`checkView(c1, c2)`, `:369-444`; `checkCellView`, `:445-462`)

Heights:

```
cellHeight(n) = (groundLevel − 7) + (groundSlope ∉ {undefined, 1} ? 0.5 : 0)      // Dofus.BattleField.Map.as:302-308 (+ undefined ph = 0)
z(cell)       = cellHeight(cell) + (cell occupied ? PLAYER_HEIGHT[occupant.guild] : 0)   // PLAYER_HEIGHT = 1.5 for every class
d             = max(|ΔX|, |ΔY|)   (Chebyshev, diagonal coords)
```

Scan (verbatim logic): `a = Math.getSlope(X1,Y1,X2,Y2)`, `b = Y1 − a·X1`, `dx = sign(X2−X1)` (0 → +1),
`dy = sign(Y2−Y1)` (0 → +1), `lastY = Y1`. For `x = X1 + 0.5·dx` while `x·dx <= X2·dx`:
`y = a·x + b`; if `dy > 0`: `destY = round(y)`, `scanY = ceil(y − 0.5)`, else `destY = ceil(y − 0.5)`,
`scanY = round(y)`; check cells `(x − dx/2, Y)` for `Y` from `lastY` to `scanY` (step `dy`, inclusive) — any
failure → `false`; then `lastY = destY`, `x += dx`. After the loop check column `x − dx/2` from `lastY` to `Y2`.
A final call with `bool = true` always passes. Vertical lines (`X1 == X2`, infinite slope) skip the first loop and
check the whole column. The start and end cells are part of the scan.

`checkCellView(X, Y, bool, p1, p2, zDiff, d)`:

```
n = getCaseNum(X, Y); c = Map.data[n]
eh = (max(|Y1−Y|, |X1−X|) / d) · (z2 − z1) + z1        // eye line, linear in Chebyshev distance
blocking player = c.playerOnID != undefined && not the start cell && not the end cell (and bool false)
pass = (c.lineOfSight && cellHeight(n) <= eh && !blocking player) || bool
```

So start and end cells need `lineOfSight` themselves; characters block only intermediate cells; terrain blocks
when it rises above the interpolated eye line.

Used by: spell targeting when `m_bLineOfSight` and close-combat targeting (`AKSClient/Events.Battlefield.Interaction.as:96-101,126-134`),
highlighting targets inside the fixed range zone (`AKSClient/Dofus.BattleField.Pointer.as:399`).

## 8. Port checklist

* Keep the strict-`<` minimum selection and neighbour order `[W, W−1, −(W−1), −W]` if you want identical paths.
* `tmpPath` excludes the start; `tmpFullPath` is only computed in fights.
* Outside fights `maxLength = 500` steps; in fights it is the player's current AP (there are no separate movement
  points in this beta — the AP decrease after a move comes from the server, presumably via game action 102,
  `sequencer.md` §4; amount UNKNOWN — not in code).
