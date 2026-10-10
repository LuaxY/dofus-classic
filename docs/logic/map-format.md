# Map format (beta 5b)

Sources: `AKSClient/Dofus.Compressor.as`, `AKSClient/Dofus.Client.Game.as:274-292`,
`AKSClient/Events.AKS.Game.as:14-25`, `AKSClient/Dofus.BattleField.Map.as`, `AKSClient/Dofus.Kernel.as:56-62`.
The wire message itself (`GD` + `M`/`C`) is documented in `docs/protocol/`.

## 1. Arrival

| Step | Code |
|---|---|
| `Game.GetMapData()` shows `LOADING_MAP`, hides and clears the battlefield, sends `GD` | `AKSClient/Dofus.Client.Game.as:56-62` |
| full map reply is split on `\|`: `[1]=id, [2]=width, [3]=height, [4]=bRolePlay ("1" → true), [5]=backgroundNum, [6]=mapData` | `AKSClient/Dofus.Client.Game.as:274-284` |
| `AKS.Game.onMapData` → `KERNEL.Compressor.uncompressMap(Number(id), getMapText(id).n, width, height, bRolePlay, backgroundNum, data)` then `KERNEL.drawCurrentMap()` | `AKSClient/Events.AKS.Game.as:14-20` |
| `drawCurrentMap`: `BATTLEFIELD.clear()`, hide Container, `BATTLEFIELD.Map.build(DATACENTER.Map)` | `AKSClient/Dofus.Kernel.as:56-62` |
| single-cell reply: cell number = `Number(parts[0].substr(3))`, `parts[1]` = 10 data chars + 10 hex mask chars | `AKSClient/Dofus.Client.Game.as:285-292` |
| `AKS.Game.onCellData` → `uncompressCell(cellNum, data, mask)` then `BATTLEFIELD.Map.updateCell(cellNum)` | `AKSClient/Events.AKS.Game.as:21-25` |

The map is always pushed by the server; the client has no local map files (only a preview image per map id
for the lobby, `missing-content.md`).

## 2. `DATACENTER.Map` object

`uncompressMap` **replaces** `DATACENTER.Map` (initially a `DofusDataProviderClass`) with a plain object
(`AKSClient/Dofus.Compressor.as:22-30`):

| Field | Value |
|---|---|
| `id` | `Number(mapId)` |
| `name` | `getMapText(id).n` (lang table `M`, `"?"` if absent) |
| `width`, `height` | `Number(...)` — see §4 for meaning |
| `bRolePlay` | boolean (`"1"`) — non-fight map: changes which cells get a grid/interaction cell, chat bubbles shown over characters (`AKSClient/Events.AKS.Chat.as:46-49`) |
| `backgroundNum` | string as received |
| `data` | `Array` of cell objects, index = cell number |
| `TacleZoneTeam0/1` | added later by `BATTLEFIELD.Map.calculateTacleZone` (`pathfinding.md`) |

## 3. Cell encoding (10 characters per cell)

Alphabet (value = index): `a–z` = 0–25, `A–Z` = 26–51, `0–9` = 52–61, `-` = 62, `_` = 63
(`AKSClient/Dofus.Compressor.as:10,17`). Decoding (`decode64`, `:161-169`): characters `> "_"` (i.e. lowercase)
are looked up as `"_" + c` because of SWF6 case-insensitive keys (README §0).

Each character is a 6-bit value `cK` (bit 5 = 0x20 … bit 0 = 0x01). `uncompressMap` (`:43-74`):

| Char | Bits | Field | Range |
|---|---|---|---|
| c0 | 5 | `active` | bool — if false **no other field is set** (cell object = `{active:false}`) |
| c0 | 0 | `lineOfSight` | bool |
| c0 | 1–4 | — | not read by beta |
| c1 | 4–5 | `layerGroundRot` | 0–3 (× 90°) |
| c1 | 0–3 | `groundLevel` | 0–15 (7 = reference height) |
| c2 | 3–5 | `movement` | 0–7 (0 = blocked, 1 = only as last step, >1 walkable; also a speed/cost term) |
| c2 0–2, c3 | | `layerGroundNum` | `((c2 & 7) << 6) + c3` → 0–511 |
| c4 | 2–5 | `groundSlope` | 0–15 (1 = flat; see §6) |
| c4 | 1 | `layerGroundFlip` | **bug: read from undefined `octets[4]` → always `false`** in full maps (`:61`); correct only in `uncompressCell` (`:134`) |
| c4 0, c5, c6 | | `layerObject1Num` | `((c4 & 1) << 12) + (c5 << 6) + c6` → 0–8191 |
| c7 | 4–5 | `layerObject1Rot` | 0–3 |
| c7 | 3 | `layerObject1Flip` | bool |
| c7 | 2 | `layerObject2Flip` | bool |
| c7 | 1 | `layerObject2Interactive` | bool |
| c7 0, c8, c9 | | `layerObject2Num` | `((c7 & 1) << 12) + (c8 << 6) + c9` → 0–8191 |

Cells pushed in string order; the cell number is the array index (`:72`).

### 3.1 Single-cell update (`uncompressCell`, `:77-160`)

`mask` = 4 hex digits parsed with `parseInt(mask,16)`; each bit enables one field, decoded from the same
10-char layout:

| Mask bit | Field | Works? |
|---|---|---|
| `0x2000` | active | yes |
| `0x1000` | lineOfSight | yes |
| `0x0800` | movement | yes |
| `0x0400` | groundLevel | **no** — tested variable `bLayerGroundLevel` is undeclared (declared `bGroundLevel`) |
| `0x0200` | groundSlope | **no** — `bLayerGroundSlope` undeclared |
| `0x0100` | layerGroundNum | yes |
| `0x0080` | layerGroundFlip | **no** — declared `bLayerGroundFilp`, tested `bLayerGroundFlip` |
| `0x0040` | layerGroundRot | yes |
| `0x0020` | layerObject1Num | yes |
| `0x0010` | layerObject1Flip | yes |
| `0x0008` | layerObject1Rot | yes |
| `0x0004` | layerObject2Num | yes |
| `0x0002` | layerObject2Flip | yes |
| `0x0001` | layerObject2Interactive | yes |

The server sends 10 hex chars for the mask (`substring(10,20)`, `Dofus.Client.Game.as:290`); only the low 14 bits
matter. A cell that was inactive in the full map has no other fields; activating it later only sets the
masked fields.

## 4. Grid geometry

Rows alternate between `width` cells (offset 0) and `width − 1` cells (offset half a cell). Rendering walk
(`AKSClient/Dofus.BattleField.Map.as:41-153`): start `x=0, y=0, dec=0, rowMax=width−1`; after each cell, if
`x == rowMax` → `x = 0, y++`, toggle `dec`/`rowMax` between `(26.5, width−2)` and `(0, width−1)`; else `x++`.

Closed form for cell `n`, with `W = width`:

```
r2 = floor(n / (2W−1)), m = n mod (2W−1)
if m < W:  row = 2·r2,     col = m,      dec = 0
else:      row = 2·r2 + 1, col = m − W,  dec = 26.5
screenX = col·53 + dec
screenY = row·13.5 − 20·(groundLevel − 7)          // cell_width 53, cell_height 27  (Map.as:15-16, 60-61)
```

Total cells = `W·H + (W−1)·(H−1)` — `height` counts full-width rows. (Checked on a *substitute* 2004 map,
`vendor/dofedex/maps-2004/1011_0407151006.swf`: W=15, H=17, 479 cells = `mapData.length/10`.)

Diagonal ("case") coordinates used by path finding and line of sight
(`AKSClient/Dofus.PathFinding.as:89-111`):

```
getCaseCoordonnee(n): r = floor(n/(2W−1)); c = (n − r(2W−1)) mod W; Y = r − c; X = (n − (W−1)·Y) / W
getCaseNum(X, Y)    = X·W + Y·(W−1)
convertCoordToxy(X, Y) = { x: (X − Y)·26.5, y: (X + Y)·13.5 }     // flat projection relative to cell 0
```

Step `+W` = X+1 (down-right), `+(W−1)` = Y+1 (down-left), `−W` = X−1, `−(W−1)` = Y−1.
`BATTLEFIELD.Map.getCaseNum` duplicates the formula (`Dofus.BattleField.Map.as:292-296`).

The visible area: Container mask `(W−1)·53 × (H−1)·27` (`Dofus.BattleField.Container.as:48-62`); centred in a
742 × 432 viewport: `x = (742 − 53·s·(W−1))/2`, `y = (432 − 27·s·(H−1))/2` with `s = _xscale/100`
(`:63-71`); zoomed only when `W−1 > 15 && H−1 > 17` to `742/(53(W−1))` or `432/(27(H−1))` (`:72-92`).

## 5. Building the layers (`Map.build`, `Dofus.BattleField.Map.as:34-155`)

Per active cell (inactive cells draw nothing):

1. `cell.x/cell.y` = screen position (§4), stored back on the cell object.
2. **Grid + interaction**: if `(!bRolePlay && lineOfSight) || (bRolePlay && movement != 0)` →
   `Container.Grid.attachMovie("MC_Cell_Grid", "cell"+n, n)` (frame = `groundSlope` if ≠ 1) and
   `BATTLEFIELD.Interaction.addCell(n, x, y, 0, groundSlope)` (clickable `Dofus::Cell` on layer 0). In fight maps a
   cell without line of sight is therefore not clickable at all.
3. **Ground** (`layerGroundNum != 0`): `path = Container.Ground.attach(layerGroundNum, "cell"+n, n)`;
   `path._x/_y` = cell position; if `groundSlope != 1` → `path.clip.gotoAndStop(groundSlope)`; else if
   `layerGroundRot != 0` → `path.clip._rotation = rot·90` and, for 90°/270°, `_yscale = 192.86`, `_xscale = 51.85`
   (squash to keep the iso diamond); then if flip → `path.clip._xscale *= −1`.
4. **Object layer 1** (`layerObject1Num != 0`): `Container.Object1.attach(num, "cell"+n, n)`, positioned; rotation
   only when `groundSlope == 1 && rot != 0` (same 192.86/51.85 squash); flip → `_xscale *= −1`. No slope frame.
5. **Object layer 2** (`layerObject2Num != 0`): `BATTLEFIELD.Objects.build({fileNum:num, walkable:true}, n, cell)`
   → creates `Container.Object2.clips["cell"+n]` at depth `n·100` and `attachMovie(String(num), "clip", 10)`;
   flip on the sprite; `setInteraction(true)` if `layerObject2Interactive` (`AKSClient/Dofus.BattleField.Objects.Object.as:6-23`).
   Layer-2 objects z-sort with characters (`battlefield.md` §2). No rotation.
6. After the loop `BATTLEFIELD.Map.onMapLoad()` (`AKSClient/Events.Battlefield.Map.as:1-64`, `battlefield.md` §6).

`backgroundNum != 0` → `Container.Ground.attach(backgroundNum, "background", -1)` before the cells (`:49-52`),
not positioned (stays at 0,0 of the container).

`updateCell(n)` (`:156-291`) recomputes the position by repeating the row walk up to `n`, then re-attaches or
removes each layer (`Ground.clips["cell"+n]`, `Object1.clips[…]`, `Object2.clips[…]`, `Grid["cell"+n]`). It never
removes an existing interaction cell.

### 5.1 Linkage / asset resolution — `attach`, `clips`, `clear`

`clips/ground.swf` and `clips/objects.swf` carry the same three-statement root script (their only root frame):

```
this.clear  = function() { this.createEmptyMovieClip("clips", 1); };                  // clips/ground.swf/frame_1/DoAction.as:1-4
this.attach = function(symbol, name, depth) {                                          // :5-11
   this.clips.createEmptyMovieClip(name, depth);
   var holder = this.clips[name];
   holder.attachMovie(symbol, "clip", 20);
   return holder;
};
this.clear();                                                                          // :12
```

(identical in `clips/objects.swf/frame_1/DoAction.as:1-12`.) Consequences:

| Item | Meaning |
|---|---|
| `Ground.attach(n, "cell"+i, i)` / `Object1.attach(…)` | returns the empty **holder** `clips.cell<i>` (depth `i`); `Map.build` positions the holder (`path._x/_y`) and transforms the attached symbol `path.clip` (slope frame, rotation/squash, flip) |
| linkage | `symbol` = the cell's number (`layerGroundNum`, `layerObject1Num`, `backgroundNum`), resolved in the loaded SWF's library — the numeric export names (`ground.swf`: 132 exports, e.g. `49`, `59`, `503`; `objects.swf`: 524, e.g. `72`, `1030`) |
| `background` | `Ground.attach(backgroundNum, "background", -1)` → holder at depth −1 inside `Ground.clips`, i.e. under every ground cell |
| `clear()` | replaces `clips` with a new empty clip (same name and depth) → every attached piece disappears; called once at load and by `Container.clear()` (`AKSClient/Dofus.BattleField.Container.as:20,29,43`) |
| Object 2 | `Object2` is a second copy of `objects.swf`; the client does not use its `attach` but creates `Object2.clips.cell<n>` (depth `n·100`) itself and `attachMovie(fileNum, "clip", 10)` (`AKSClient/Dofus.BattleField.Objects.Object.as:12-15`). Characters (`sprite<i>`) and spell clips also live in `Object2.clips`, so `Object2.clear()` wipes objects, characters and spells together |
| removal | `updateCell` removes `Ground.clips["cell"+n]`, `Object1.clips[…]`, `Object2.clips[…]` directly (`AKSClient/Dofus.BattleField.Map.as:242,266,281`) |

**Client-side random variation** (not in the map data; a port should use a seeded RNG if it wants stable maps):

* ground symbols `2, 5, 27, 28, 39, 57, 59, 92, 455, 503, 510` jump to a random frame from their own first frame,
  e.g. `this.gotoAndStop(random(this._totalframes) + 1)` (`clips/ground.swf/DefineSprite_58_57/frame_1/DoAction.as:1`),
  `gotoAndStop(random(35) + 2)` (`clips/ground.swf/DefineSprite_215_455/frame_1/DoAction.as:1`);
* ground symbol `4` places 791 small sub-clips (and symbol `49` one) whose `onClipEvent(load)` is
  `if (random(3) == 1) gotoAndStop(random(_totalframes − 1) + 2)` — each decoration shows a random variant one time
  in three (e.g. `clips/ground.swf/DefineSprite_368_4/frame_7/PlaceObject2_8_363/CLIPACTIONRECORD onClipEvent(load).as:2-5`);
* sub-clips of ground symbols `50, 51, 52, 78, 79, 130, 511` pick `random(3)+1` or a random frame on load
  (e.g. `clips/ground.swf/DefineSprite_241_50/frame_1/PlaceObject2_240_1/CLIPACTIONRECORD onClipEvent(load).as:2`);
* objects: many symbols (`151–155`, `23`, `24`, `30`, `35`, `225`, `343`, `628`, `630`, `801`, `876`, `891`, `892`,
  `894`, `1011`, `1045–1047`, `1063`) randomise frames or alpha on load (`_alpha = -10 + 120 * Math.random()`), and some
  animate occasionally (`if (random(200) == 1) play()`, `clips/objects.swf/DefineSprite_635_630/frame_1/PlaceObject2_634_14/CLIPACTIONRECORD onClipEvent(enterFrame).as:2-5`).

Whether a randomising ground symbol is ever used on a sloped cell (where `Map.build` also calls
`path.clip.gotoAndStop(groundSlope)`, and the symbol's own frame script would run afterwards) depends on map
data — UNKNOWN for beta maps.

Interactive objects (game action 200 → `gotoAndStop("state"+k)`): some object animations end with `this.end()`
(e.g. `clips/objects.swf/DefineSprite_393/frame_34/DoAction.as:1-2`); no ancestor of an `Object2` sprite has `_ACTION`,
so `MovieClip.end` finds no sequencer and the call is a no-op (`AKSClient/MovieClip.end.as`).

## 6. `groundSlope` corner table

`BATTLEFIELD.Pointer.cellCoord[groundSlope]` gives the 4 corner offsets `[left, top, right, bottom]` of a cell
relative to its centre (`AKSClient/Dofus.BattleField.Pointer.as:3`). Flat corners: left `(−26.5,0)`,
top `(0,−13.5)`, right `(26.5,0)`, bottom `(0,13.5)`. A raised corner is 20 px higher. With `k = groundSlope − 1`:

| bit of k | raised corner |
|---|---|
| 0 (1) | left |
| 1 (2) | top |
| 2 (4) | right |
| 3 (8) | bottom |

so slope 1 = flat, 2 = left up, 3 = top up, 5 = right up, 9 = bottom up, …, 15 = top+right+bottom up.
Index 0 is an empty entry (slope 0 is not expected). Sloped cells: characters drawn 10 px higher
(`Dofus.BattleField.Characters.Character.as:292`), +0.5 height for line of sight
(`Dofus.BattleField.Map.as:305`), speed modifiers (`characters.md`).

## 7. Substitute data (post-beta) — `vendor/dofedex/maps-2004/`

565 map SWFs from July–December 2004 (later than beta 5b; **not beta data**). Each holds plain AS variables
`id, width, height, backgroundNum, ambianceId, musicId, bOutdoor, capabilities, mapData`
(per `vendor/dofedex/README.md`; inspected on `1011_0407151006.swf`).

| Field | Read by beta 5b? |
|---|---|
| `id`, `width`, `height`, `backgroundNum`, `mapData` | yes — same meaning as the `GD…M` reply fields (`mapData` decodes with this `uncompressMap` unchanged; c0 bits 1–4 unused, per the vendor README no cell uses later extended-id bits) |
| bRolePlay | beta field with no equivalent in the files; must be chosen by the server |
| `ambianceId`, `musicId`, `bOutdoor`, `capabilities` | **no** — added by later versions |

Coverage by beta graphics (per `vendor/dofedex/README.md`): 19 maps fully covered by beta `ground.swf` ids (1–511) and
`objects.swf` ids (1–1070), ~250 ≥ 80 %. These are 1.0-era world maps, not the beta's arena maps; beta map ids,
names (`M` table) and placement cells (`GP…` start cells) for them are UNKNOWN — not in code.
