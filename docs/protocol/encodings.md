# Encodings

Every compact encoding the protocol uses, with language-neutral pseudocode. Conventions: see
[account.md](account.md) header (`[code]`, `[SWF6 runtime]`, `[inference]` tags; paths relative to `decompiled/clean/`).

Contents: [base64 alphabet](#base64-alphabet) · [password crypt](#password-crypt) · [map data (GDM)](#map-data-gdm) ·
[cell update (GDC)](#cell-update-gdc) · [cell ids, coordinates, directions](#cell-ids-coordinates-directions) ·
[path encoding](#path-encoding) · [cell lists (GPS)](#cell-lists-gps) · [other field encodings](#other-field-encodings) ·
[PatternDecoder](#patterndecoder-lang-templates) · [worked example: map 507](#worked-example-map-507)

---

## Base64 alphabet

One alphabet is used everywhere (it is *not* RFC 4648 order):

```
index:  0         1         2         3         4         5         6
        0123456789012345678901234567890123456789012345678901234567890123
char:   abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_
```

- `ank.Crypt.HASH` (`AKSClient/__Packages/ank/Crypt.as:3`) and `Compressor.zkArray` (`AKSClient/Dofus.Compressor.as:17`)
  list it directly (index → char).
- Decoding uses `Compressor.hashCodes`, built from `ZipKey` where the 26 lowercase letters are stored as `"_a".."_z"`
  (`AKSClient/Dofus.Compressor.as:10-16`); `decode64(c)` looks up `"_"+c` when `c > "_"` (i.e. a lowercase letter, 0x61-0x7A), else `c`
  (`AKSClient/Dofus.Compressor.as:161-169`). The prefix exists because SWF6 property names are case-insensitive, so `a` and `A` would
  collide [SWF6 runtime]. Net effect: exactly the table above. A char outside the alphabet decodes to `undefined`,
  which behaves as 0 in the bit operations [SWF6 runtime] — never send one.

```
encode64(v: 0..63) -> char  = ALPHABET[v]
decode64(c: char)  -> 0..63 = ALPHABET.indexOf(c)
```

---

## Password crypt

`ank.Crypt.cryptPassword(pwd, key)` (`AKSClient/__Packages/ank/Crypt.as:7-33`), `key` = the string after `H`
([account.md](account.md#h--handshake-key-sc)). Operates on UTF-16 code units (`charCodeAt`), outputs only alphabet chars.

```
function cryptPassword(pwd, key):
    n = len(pwd)
    if n % 8 != 0:
        pwd = pwd + pwd[0 : 8 - n % 8]        # ONE padding step, substr may be shorter than asked
    n = len(pwd)
    s1 = ""
    for i in 0 .. n-1:
        s1 += ALPHABET[(code(pwd[i]) XOR code(key[i % 32])) % 64]
    out = ""
    for i in 0 .. n-1:
        out += ALPHABET[(code(s1[n-1-i]) XOR code(key[(i + 8) % 32])) % 64]
    return out
```

Byte-exact rules:
- `code(key[j])` for `j >= len(key)` is NaN in Flash; `NaN XOR x == x` (ToInt32(NaN) = 0) [SWF6 runtime]. A server that
  sends exactly 32 key chars never hits this. Only `key[0..31]` is ever read.
- Padding is a single `substr`: a 3-char password `abc` becomes `abcabc` (length 6, not 8); a 9-char password gets 7
  chars appended → 16. Empty password → empty result.
- `% 64` loses bits: the mapping is not invertible. **The server must know the plaintext password (or something it can
  recompute it from) and recompute the expected string**, then compare.
- Code units ≥ 128 are fine (XOR then `% 64`); the client sends whatever UTF-16 units the user typed.

### Worked example (computed by hand, cross-checked with a throw-away script)

`pwd = "pass"` (the DEBUG default, `AKSClient/Dofus.Kernel.Start.as:4`), `key = "abcdefghijklmnopqrstuvwxyzABCDEF"`.

Padding: length 4 → append `pwd[0:4]` → `passpass`.

Pass 1 (`pwd[i] XOR key[i]`, then `% 64`, then alphabet):

| i | pwd[i] | key[i] | XOR | %64 | char |
|---|---|---|---|---|---|
| 0 | p 112 | a 97 | 17 | 17 | r |
| 1 | a 97 | b 98 | 3 | 3 | d |
| 2 | s 115 | c 99 | 16 | 16 | q |
| 3 | s 115 | d 100 | 23 | 23 | x |
| 4 | p 112 | e 101 | 21 | 21 | v |
| 5 | a 97 | f 102 | 7 | 7 | h |
| 6 | s 115 | g 103 | 20 | 20 | u |
| 7 | s 115 | h 104 | 27 | 27 | B |

`s1 = "rdqxvhuB"`

Pass 2 (`s1[7-i] XOR key[i+8]`):

| i | s1[7-i] | key[i+8] | XOR | %64 | char |
|---|---|---|---|---|---|
| 0 | B 66 | i 105 | 43 | 43 | R |
| 1 | u 117 | j 106 | 31 | 31 | F |
| 2 | h 104 | k 107 | 3 | 3 | d |
| 3 | v 118 | l 108 | 26 | 26 | A |
| 4 | x 120 | m 109 | 21 | 21 | v |
| 5 | q 113 | n 110 | 31 | 31 | F |
| 6 | d 100 | o 111 | 11 | 11 | l |
| 7 | r 114 | p 112 | 2 | 2 | c |

Result **`RFdAvFlc`**. Login frames: `5\n\0` then `bo\nRFdAvFlc\n\0`.

Second vector (same key): `dofus2004` → padded `dofus2004dofus20` → `s1 = fnfrwuxyDoekyDDa` → **`iUVvgla0ikgdhqzE`**.

---

## Map data (GDM)

Frame: `GDM|<mapId>|<width>|<height>|<bRolePlay>|<backgroundNum>|<mapData>\0`
([game.md](game.md#gd--gdm--gdc--map-data-cs-sc)). Decoder: `Class_Compressor.prototype.uncompressMap`
(`AKSClient/Dofus.Compressor.as:19-76`). Renderer: `Class_BattleField_Map.prototype.build`
(`AKSClient/Dofus.BattleField.Map.as:34-155`).

### Cell record: 10 chars = 10 × 6 bits

`mapData.length / 10` cells, in cell-id order (cell id = index), no separators (`AKSClient/Dofus.Compressor.as:43-74`). Let
`o[k] = decode64(char k)`.

| Char | Bits (5..0) | Field | Range | Meaning / use |
|---|---|---|---|---|
| o0 | bit 5 | `active` | 0/1 | cell exists. **If 0, nothing else is decoded** (record still 10 chars; only `active=false` stored) |
| o0 | bit 0 | `lineOfSight` | 0/1 | 1 = does not block line of sight (`AKSClient/Dofus.PathFinding.as:453`); fight maps draw the grid only on these cells |
| o0 | bits 4..1 | — | | unused |
| o1 | bits 5..4 | `layerGroundRot` | 0..3 | ground clip rotation × 90° (flat cells only) |
| o1 | bits 3..0 | `groundLevel` | 0..15 | height; 7 = base, each level lifts the cell 20 px (`AKSClient/Dofus.BattleField.Map.as:61`) |
| o2 | bits 5..3 | `movement` | 0..7 | 0 = not walkable (click rejected, `AKSClient/Dofus.PathFinding.as:32-35`); 1 = can only be a path's last cell (`AKSClient/Dofus.PathFinding.as:200-206`); ≥ 2 walkable (path cost `(5-movement)/5`, walk speed = movement, `AKSClient/Dofus.BattleField.Characters.Character.as:488`); spells needing a free cell and close combat need > 1 |
| o2 | bits 2..0 + o3 | `layerGroundNum` | 0..511 (9 bits) | `((o2 & 7) << 6) + o3`; ground clip id in `clips/ground.swf`, 0 = none |
| o4 | bits 5..2 | `groundSlope` | 0..15 | 1 = flat; other values select frame `groundSlope` of the grid/ground clip and lower characters by 10 px |
| o4 | bit 1 | `layerGroundFlip` | 0/1 | **client bug:** `uncompressMap` reads `octets[4]` (undefined) instead of the char (`AKSClient/Dofus.Compressor.as:61`) → always false from `GDM` |
| o4 | bit 0 + o5 + o6 | `layerObject1Num` | 0..8191 (13 bits) | `((o4 & 1) << 12) + (o5 << 6) + o6`; layer-1 object clip in `clips/objects.swf`, 0 = none |
| o7 | bits 5..4 | `layerObject1Rot` | 0..3 | × 90°, flat cells only |
| o7 | bit 3 | `layerObject1Flip` | 0/1 | mirror |
| o7 | bit 2 | `layerObject2Flip` | 0/1 | mirror of the layer-2 object (`AKSClient/Dofus.BattleField.Objects.Object.as:18-21`) |
| o7 | bit 1 | `layerObject2Interactive` | 0/1 | layer-2 object clickable (acts as a click on its cell); target of `GA` type 200 animations |
| o7 | bit 0 + o8 + o9 | `layerObject2Num` | 0..8191 (13 bits) | `((o7 & 1) << 12) + (o8 << 6) + o9`; layer-2 object clip, 0 = none |

Encoder (server side, the exact inverse; `flip` of the ground can be set but is ignored by `GDM` decoding):

```
function encodeCell(c) -> 10 chars:
    if not c.active: return encode64(0) * 10          # any record with o0 bit5 = 0 works, e.g. "aaaaaaaaaa"
    o0 = (1 << 5) | (c.lineOfSight ? 1 : 0)
    o1 = (c.layerGroundRot << 4) | c.groundLevel
    o2 = (c.movement << 3) | (c.layerGroundNum >> 6)
    o3 = c.layerGroundNum & 63
    o4 = (c.groundSlope << 2) | (c.layerGroundFlip << 1) | (c.layerObject1Num >> 12)
    o5 = (c.layerObject1Num >> 6) & 63
    o6 = c.layerObject1Num & 63
    o7 = (c.layerObject1Rot << 4) | (c.layerObject1Flip << 3) | (c.layerObject2Flip << 2)
         | (c.layerObject2Interactive << 1) | (c.layerObject2Num >> 12)
    o8 = (c.layerObject2Num >> 6) & 63
    o9 = c.layerObject2Num & 63
    return concat(encode64(o0..o9))
```

### Grid geometry

`build` walks the cells in order with `x`, `y` (row), `dec` (row offset) (`AKSClient/Dofus.BattleField.Map.as:40-47,133-152`); cell size 53 × 27 px
(`AKSClient/Dofus.BattleField.Map.as:15-16`):

```
lastX = W - 1; x = 0; y = 0; dec = 0
for id in 0 .. cellCount-1:
    pixelX(id) = x * 53 + dec
    pixelY(id) = y * 13.5 - 20 * (groundLevel(id) - 7)       # only for active cells
    if x == lastX:  x = 0; y += 1; (dec, lastX) = dec == 0 ? (26.5, lastX - 1) : (0, lastX + 1)
    else:           x += 1
```

So even rows hold `W` cells and odd rows `W - 1` cells shifted half a cell right; two rows = `2W - 1` cells. The client
derives the row count from the data length; `height` only sizes the mask `(W-1)·53 × (H-1)·27` px
(`AKSClient/Dofus.BattleField.Container.as:48-62`), centring and zoom (`AKSClient/Dofus.BattleField.Container.as:63-92`). A map that exactly fills
the mask has `2H - 1` rows, i.e. **cellCount = H·W + (H−1)·(W−1)** **[inference]** — confirmed by the real map 507
below (W 9, H 12 → 196 cells, 1960 chars).

### Fields of the frame

- `mapId` → `DATACENTER.Map.id`; the map **name is not transmitted**, the client reads `getMapText(id).n` from the lang
  shared object (`AKSClient/Events.AKS.Game.as:17`, `AKSClient/Dofus.Kernel.Init.as:111-119`).
- `bRolePlay` (`"1"` = true, `AKSClient/Dofus.Client.Game.as:280`) has three visible effects: grid predicate (role-play:
  `movement != 0`; otherwise `lineOfSight`) (`AKSClient/Dofus.BattleField.Map.as:64`); speech bubbles for chat (`AKSClient/Events.AKS.Chat.as:46-49`);
  and the path-finder's "ignore players" switch, which reads `BATTLEFIELD.Map.bRolePlay` — a property that is never set
  (the flag lives in `Map.data.bRolePlay`) — so path-finding always avoids occupied cells (`AKSClient/Dofus.PathFinding.as:204`).
- `backgroundNum`: 0 = none; otherwise ground clip `backgroundNum` attached under everything (`AKSClient/Dofus.BattleField.Map.as:49-52`).

### Wrapping a dofedex `maps-2004` SWF into `GDM`

The vendor SWFs (`vendor/dofedex/maps-2004/<id>_<stamp>.swf`, see `vendor/dofedex/README.md`) define
`id, width, height, backgroundNum, ambianceId, musicId, bOutdoor, capabilities, mapData`. Mapping:

| Vendor var | `GDM` part | Notes |
|---|---|---|
| `id` | 1 | decimal |
| `width` | 2 | decimal |
| `height` | 3 | decimal |
| — | 4 `bRolePlay` | not in the vendor file; choose per use (village/role-play `1`, fight `0`) **[inference]** |
| `backgroundNum` | 5 | decimal |
| `mapData` | 6 | copied verbatim (same 10-char format, decodes with `uncompressMap`) |
| `ambianceId`, `musicId`, `bOutdoor`, `capabilities` | — | no counterpart in beta 5b's map message |
| (name) | — | not on the wire; comes from the lang file `M[id].n` |

```
frame = "GDM|" + id + "|" + width + "|" + height + "|" + bRolePlay + "|" + backgroundNum + "|" + mapData + "\0"
```

The receive side has no length limit (the 200-char cap only applies to client sends, `AKSClient/Dofus.Client.as:78-81`).
Only ground ids 1-511 and object ids present in beta 5b's `clips/ground.swf` / `clips/objects.swf` render (see the vendor
README for coverage).

---

## Cell update (GDC)

Frame: `GDC<cellNum>|<10 chars><maskHex>\0` → `uncompressCell(cellNum, chars, mask)` (`AKSClient/Dofus.Compressor.as:77-160`)
→ `Map.updateCell` (`AKSClient/Dofus.BattleField.Map.as:156-291`). The 10 chars use the same layout as a `GDM` record.
The mask (hex text, `parseInt(mask,16)`, `AKSClient/Dofus.Compressor.as:82`) selects which fields are applied:

| Mask bit | Field | Applied? |
|---|---|---|
| `0x2000` | active | yes |
| `0x1000` | lineOfSight | yes |
| `0x0800` | movement | yes |
| `0x0400` | groundLevel | **no** — flag variable `bGroundLevel`, test uses undefined `bLayerGroundLevel` (`:86,116`) |
| `0x0200` | groundSlope | **no** — `bGroundSlope` vs `bLayerGroundSlope` (`:87,128`) |
| `0x0100` | layerGroundNum | yes |
| `0x0080` | layerGroundFlip | **no** — `bLayerGroundFilp` vs `bLayerGroundFlip` (`:89,132`) |
| `0x0040` | layerGroundRot | yes |
| `0x0020` | layerObject1Num | yes |
| `0x0010` | layerObject1Flip | yes |
| `0x0008` | layerObject1Rot | yes |
| `0x0004` | layerObject2Num | yes |
| `0x0002` | layerObject2Flip | yes |
| `0x0001` | layerObject2Interactive | yes |

Unlike `uncompressMap`, an inactive record does not skip the other fields. The cell must exist in the current map.
Example: `GDC233|HhGieaaaaa3FFF\0` (all fields).

---

## Cell ids, coordinates, directions

`W` = map width (`DATACENTER.Map.width`). Cell ids are the record indices (decimal on the wire everywhere except path /
`GPS` codes).

Diagonal coordinates (`AKSClient/Dofus.PathFinding.as:89-104`):

```
cellId(x, y)  = x * W + y * (W - 1)
coords(id):   r   = floor(id / (2W - 1))
              col = (id - r * (2W - 1)) % W
              y   = r - col
              x   = (id - (W - 1) * y) / W
```

Neighbours and directions (`Compressor.makeFullPath` `nextDist`, `AKSClient/Dofus.Compressor.as:217`; `getDirection` /
`getAbsoluteDirection`, `AKSClient/Dofus.PathFinding.as:256-314`; sprite facing, `AKSClient/Dofus.BattleField.Characters.Character.as:735-754,786-809`):

| dir | cell delta | coordinate change | on screen |
|---|---|---|---|
| 0 | `+W` | x + 1 | down-right |
| 1 | `+(W-1)` | y + 1 | down-left |
| 2 | `-W` | x − 1 | up-left |
| 3 | `-(W-1)` | y − 1 | up-right |

Only these 4 neighbours exist (no diagonals). The path-finder rejects a "neighbour" whose pixel x differs by ≥ 27
(row wrap-around) (`AKSClient/Dofus.PathFinding.as:196`). Distance used for ranges = `|Δx| + |Δy|` (`AKSClient/Dofus.PathFinding.as:79-88`).
`getAbsoluteDirection(a, b)` returns -1 when `a` and `b` are not on a common axis.

---

## Path encoding

### Client → server (`GA001`)

`Compressor.compressPath(DATACENTER.Player.tmpPath)` (`AKSClient/Dofus.Compressor.as:170-191`). `tmpPath` is built by
`pathFind` while walking back from the target (`AKSClient/Dofus.PathFinding.as:156-189`): it contains the **target cell and every cell
where the direction changes**, each with the direction of the step that *enters* it, in walking order. The start cell is
**not** included.

```
for each {num, dir} in tmpPath:
    out += ALPHABET[((num >> 6) & 15) + (dir << 4)] + ALPHABET[num & 63]
```

Cell ids are therefore limited to 10 bits (0..1023); `dir` 0..3 sits in bits 4-5 of the first char.

### Server → client (`GA` type 1)

`Compressor.extractFullPath(s)` + `makeFullPath` (`AKSClient/Dofus.Compressor.as:192-236`):

```
light = [ ((decode64(s[i]) & 15) << 6) | decode64(s[i+1])  for i in 0, 2, 4, … ]   # direction bits ignored
full  = []; from = light[0]
for c in light:
    full.append(from)
    d = absoluteDirection(c, from)            # -1 if not aligned
    if d != -1:
        while full.last != c: full.append(full.last + nextDist[d])
    from = c
```

- `light[0]` must be the **start cell**: `moveCharacterThroughPath` first teleports the sprite to `full[0]`
  (`AKSClient/Dofus.BattleField.Characters.Character.as:412`).
- Consecutive waypoints must be aligned (same x or same y); otherwise the sprite jumps straight to the next waypoint.
- Waypoints appear twice in `full` (`[100,100,115,130,130,144]` below); a "move" to the same cell is a no-op
  (`AKSClient/Dofus.BattleField.Characters.Character.as:479-484,569-572`).
- Direction bits are ignored on decode, so the server may echo the client's codes (with dirs) after prepending the start.

### Worked example (W = 15)

Start 100 (x 16, y −10), path 100 → 115 → 130 (dir 0, x+1 twice) → 144 (dir 1, y+1).

- Client `tmpPath` = `[{130,0}, {144,1}]` → `130`: `(130>>6)&15 = 2` + `0<<4` = 2 → `c`; `130 & 63 = 2` → `c`;
  `144`: `2 + (1<<4) = 18` → `s`; `144 & 63 = 16` → `q` → frame **`GA001ccsq\n\0`**.
- Server result: start `100` → `b` (1) `K` (36), then `cc`, `sq` → **`GA1;1;12;bKccsq\0`**; `makeFullPath` →
  `[100, 100, 115, 130, 130, 144]`.

---

## Cell lists (GPS)

`GPS<team0>|<team1>`: each cell = 2 chars `encode64(cell >> 6) + encode64(cell & 63)`, concatenated
(`AKSClient/Events.AKS.Game.as:298-312`). Example: 100, 115 → `bKbZ`; 300 → `eS`.

---

## Other field encodings

| Where | Encoding | Source |
|---|---|---|
| `AL`, `AS`, `GM` colours | hex `RRGGBB` without prefix, or `-1` | `AKSClient/Dofus.Client.DataProcessor.as:144-146`, `AKSClient/Dofus.CharactersManager.as:38-40` |
| `PA` colours | decimal integer of `0xRRGGBB`, or `-1` | `modules_Interfaces/__Packages/ank/components/ColorPicker.as:187` |
| `IP` colours | used raw in `&` ops → decimal (or `0x`-prefixed) | `AKSClient/Dofus.CharactersColors.as:49-51` |
| weapon (`AS` part 10, `GM` field 9) | `<typeHex>,<gfxHex>,<RRGGBB>` → linkage `"<type>_<gfx>"` (decimal) | `AKSClient/Dofus.CharactersManager.as:41-49` |
| `OW` | `<charId>\|<typeHex>\|<gfxHex>\|<colour>` | `AKSClient/Dofus.Client.Items.as:18-26` |
| item entry | `~`-separated hex fields, effects `,` / `#` | [items.md](items.md#item-entry-format) |
| spell entry | `~`-separated, zones and 15 flag chars, numbers in base64 chars | [spells.md](spells.md#spell-entry-format) |
| game options | 2 chars `chr(64+n0) chr(64+n1)`; `GL` adds `chr(64+playerCount)` | `AKSClient/Dofus.Client.Game.as:184`, `AKSClient/Dofus.Client.DataProcessor.as:284-285` |
| `GA` type field (C→S) | 3 decimal digits, zero-padded | `AKSClient/String.getAddLeftChar.as:1-13` |
| `GTS` duration | milliseconds (decimal), divided by 1000 | `AKSClient/Dofus.Client.Game.as:351` |

String escaping done by the client before sending (only these two places):

| Message | Rule | Source |
|---|---|---|
| `BM` text | `<` → `&lt;`, `>` → `&gt;`, `\|` → ` ` (in that order) | `AKSClient/Dofus.Client.Chat.as:17` |
| `CJ` name | `<`, `>`, `\|` → `_` | `AKSClient/Dofus.Client.Channels.as:22` |

Every other user string (login, character / game names, passwords, friend names, whisper targets, `/c` raw frames) is
sent verbatim and may contain `|`, `;`, `~`, `,` — the server must validate.

---

## PatternDecoder (lang templates)

Not on the wire: `ank.PatternDecoder` (`AKSClient/__Packages/ank/PatternDecoder.as`) renders lang strings for items using
the item effect parameters received in item entries (`AKSClient/Dofus.DataCenter.Item.as:69-106`). Documented so a
server author knows what `p1..p3` feed.

```
getDescription(str, params):            # item effect description, params = [p1, p2, p3]
    "#n"    (n digit) -> params[n-1], or removed if undefined
    "~n"    (n digit) -> if params[n-1] undefined: cut the string here; else remove the marker
    "{...}" -> recursively decoded group (lets "~n" cut only inside the group)

combine(str, gender, singular):         # item name suffix agreement
    flags m/f/n = gender, p = !singular, s = singular
    "~k"    -> if flag k false: cut here; else remove the marker
    "{...}" -> recursive group
```
(`AKSClient/__Packages/ank/PatternDecoder.as:6-104`). The lang data itself is **UNKNOWN — not in code** (missing `langupdater.php` output).

---

## Worked example: map 507

Source: `vendor/dofedex/maps-2004/507_0407151006.swf` (decompiled with `tools/ffdec.sh -export script`):
`id = 507; width = 9; height = 12; backgroundNum = 0; ambianceId = 0; musicId = 115; bOutdoor = false; capabilities = 0;`
`mapData` = 1960 chars = 196 cells (= 12·9 + 11·8). 49 cells are active; movement histogram of active cells:
0 → 26, 2 → 1, 4 → 22. The beta lang name of map 507 is unknown, and nothing in the client requires it.

Self-check — five decoded records (cell id: chars → fields):

| cell | chars | decoded |
|---|---|---|
| 0 | `bhGaeaaaaa` | o0 = 1 → inactive (bit 5 clear); rest ignored |
| 72 | `HhaaejTaaa` | active, LoS 1, groundRot 0, level 7, movement 0, groundNum 0, slope 1, object1 621 |
| 89 | `HhGieaaaaa` | active, LoS 1, level 7, movement 4, groundNum 8, slope 1, no objects |
| 107 | `HhGienViaa` | active, LoS 1, level 7, movement 4, groundNum 8, slope 1, object1 879, object1Flip 1 |
| 121 | `Hhqieqgaaa` | active, LoS 1, level 7, movement 2, groundNum 8, slope 1, object1 1030 |

Active cell ids: 72, 80, 81, 88, 89, 90, 96-99, 104-108, 112-117, 120-126, 129-134, 138-142, 147-150, 156-158, 165, 166, 174.

Complete frame with `bRolePlay = 0` (1977 characters, then the `\0` terminator):

```
GDM|507|9|12|0|0|bhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaejTaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaeaaaaaHhaaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaejRaaaHhGieaaaaaHhaaejSaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaejRaaaHhaieaaag9HhGieaaaaaHhaaejSaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaejRaaaHhaieaaaaaHhaieaaahfHhGienViaaHhaaejSaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaaejRaaaHhGienVegXHhaieaaaaaHhGieaaaaaHhaieaaag7HhaaejSaaabhGaeaaaaabhGaeaaaaaHhaaejRaaaHhqieqgaaaHhGieaaaaaHhGiem8aaaHhGieaaaaaHhaieaaaaaHhaaejSaaabhGaeaaaaabhGaeaaaaaHhaieaaanRHhGieaaaaaHhGieaaaaaHhGieaaag6HhaieaaaaaHhaieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhaieaaaaaHhGieaaaaaHhGieaaaaaHhaieaaaaaHhaieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhGieaaaaaHhGieaaaaaHhGieaaaaaHhaieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhGieaaaaaHhGieaaaaaHhGieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhGieaaaaaHhGieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaaHhGieaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaabhGaeaaaaa
```
