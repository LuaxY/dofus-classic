# Converted SWF asset format (`dofus-swf-json` v1)

Output of `bun scripts/assets/convert.ts`. One JSON file per source SWF plus side bitmap files, under
`web/public/assets/swf/`, mirroring `dofus-5b/`. TypeScript types: `web/src/swf/types.ts` (the single source
of truth; this document explains the semantics). Renderer: `web/src/swf/render.ts`.

Scope: everything a Flash 6/7 MovieClip runtime needs to reproduce the display side of the original SWFs —
symbols, linkage names, timelines (display-list deltas, labels, frame scripts as AVM1 bytecode), shapes as
vector paths, morph shapes, buttons, text, fonts, bitmaps. Audio data is **not** here (produced by the
assets-media agent from the same SWFs; this format only carries sound ids/metadata and timeline sound
triggers).

## 1. Why a direct SWF parser (not JPEXS)

The converter parses the SWF binary itself (`scripts/assets/swf.ts`); JPEXS is used only as the visual
reference oracle in verification.

- Timelines need MATRIX/CXFORM/RECT bit-level decoding anyway; shape records use the same bit reader, so
  shapes cost ~150 extra lines. `-swf2xml` is a 1:1 tag dump (2.4 MB for `clips/sprites/10.swf`, ~1 s/file
  of JVM) that would still need the same record → path conversion.
- Morph shapes need record-level pairing of start/end edges; JPEXS's morph SVG export flattens that into SMIL
  `<animate>` values, and its shape SVG would need regex parsing (Bun has no `DOMParser`) of `<defs>`
  gradients and base64 `<pattern>` images.
- No JVM: all 487 SWFs convert in seconds; coordinates stay exact (twips/20).
- Images: JPEG streams are cleaned/merged in TS (JPEGTables, erroneous SOI/EOI headers); decoding (for
  alpha merging) and PNG encoding use `@napi-rs/canvas`, already a dependency.

## 2. Files

```
web/public/assets/swf/
  index.json                      manifest of all converted SWFs (§9)
  <dir>/<name>.json               one per SWF, e.g. clips/sprites/10.json, modules/Interfaces.json
  <dir>/<name>/<characterId>.png  bitmaps with alpha (DefineBitsJPEG3, DefineBitsLossless*)
  <dir>/<name>/<characterId>.jpg  opaque JPEG bitmaps (DefineBits+JPEGTables, DefineBitsJPEG2), bytes copied
  clips/{ground,objects}.fill.json  provenance of the linkage ids filled from later clients (§11)
  _preview/                       verification renders written by the test (not part of the format)
```

Bitmap `file` fields are relative to the JSON file's directory (`"10/12.png"` for `clips/sprites/10.json`).
`src` and import `url`s are relative to the archive root `dofus-5b/` (the game loads everything relative to
`AKSClient.swf`), so `clips/sprites/weapons/weapons.swf` ↔ `clips/sprites/weapons/weapons.json`.

## 3. Conventions

| Thing | Encoding |
|---|---|
| Lengths / coordinates | **pixels** as JSON numbers = twips / 20 (always a multiple of 0.05, printed exactly). Exception: font glyphs (§6.7). |
| `Rect` | `[xMin, yMin, xMax, yMax]` px |
| `Matrix` | `[a, b, c, d, tx, ty]`; `x' = a·x + c·y + tx`, `y' = b·x + d·y + ty` (same order as Canvas `setTransform`). SWF ScaleX=a, RotateSkew0=b, RotateSkew1=c, ScaleY=d. **Every matrix maps its source space to the parent's px space.** Display-list matrices: a–d unchanged, tx/ty px. Gradient matrices: source = gradient square (§6.1), a–d **and** tx/ty divided by 20. Bitmap-fill matrices: source = bitmap pixels, a–d and tx/ty divided by 20 (so `[1,0,0,1,x,y]` = 1:1 pixels). |
| `RGBA` | `[r, g, b, a]` integers 0–255 (straight alpha). RGB-only SWF colours get `a = 255`. |
| `ColorTransform` | `[rMul, gMul, bMul, aMul, rAdd, gAdd, bAdd, aAdd]`; muls are floats (SWF 8.8 fixed / 256, 1 = identity), adds integers −255…255. Applied per channel: `c' = clamp(c·mul + add, 0, 255)`. |
| Path `d` | SVG path subset, absolute commands only, space separated: `M x y`, `L x y`, `Q cx cy x y`. No `Z` (fills close implicitly). Valid input for `new Path2D(d)`. |
| Character ids | decimal string keys of `symbols`; id `0` is never used by SWF (the root timeline is `root`). |
| Frame numbers | `frames[i]` is Flash frame **i + 1** (`gotoAndPlay(1)` ↔ `frames[0]`). Labels are per frame. |
| Strings | SWF 6/7 strings are UTF-8; decoded as such. |
| Bytecode | AVM1 action bytes, **base64**, exactly as in the tag (ends with `ActionEnd` 0x00). |
| Optional fields | omitted when absent in the SWF (never `null`, except `background`). |

## 4. Per-SWF file (`SwfFile`)

```ts
{
  format: "dofus-swf-json", formatVersion: 1,
  src: "clips/sprites/10.swf",      // relative to dofus-5b/
  version: 6,                        // SWF version (archive: 6 or 7)
  width: 742, height: 550,           // stage size px (header frame rect)
  frameRate: 25,
  background: "#ffffff" | null,      // SetBackgroundColor
  root: Timeline,                    // main timeline (§7)
  symbols: { [id: string]: Symbol }, // every DefineXxx character (§6)
  exports: { [linkage: string]: number },  // ExportAssets: linkage name → id (attachMovie / attachSound)
  imports: [{ url: string, items: [{ name: string, id: number }] }]  // ImportAssets
}
```

- `exports`: duplicate ExportAssets for the same name are deduped (e.g. `circle.swf` exports
  `Mc_SelectionAnimate` twice). Several names may map to the same id.
- `imports`: `id` is the **local** character id that stands for `exports[name]` of the SWF at `url`.
  Example: `clips/sprites/10.swf` imports `4_1` from `clips/sprites/weapons/weapons.swf` as local id 1.
  An imported id has no entry in `symbols`; resolve it through the other file.

## 5. Symbol types (`symbols[id].type`)

`shape`, `morph`, `sprite`, `button`, `text` (DefineText static text), `edittext`, `font`, `bitmap`,
`sound`. Each has `id` (number) and `type`.

## 6. Symbols

### 6.1 `shape` (DefineShape, DefineShape2, DefineShape3)

```ts
{ type: "shape", id, bounds: Rect, paths: ShapePath[] }
ShapePath = { fill: Fill, d: string } | { line: Line, d: string }
Fill =
  | { type: "solid", color: RGBA }
  | { type: "linear" | "radial", matrix: Matrix, stops: { ratio: number /*0..255*/, color: RGBA }[] }
  | { type: "bitmap", bitmap: number /*character id*/, matrix: Matrix, repeat: boolean, smooth: boolean }
Line = { width: number /*px, 0 = hairline*/, color: RGBA }
```

- `paths` is in **draw order**: for each SWF style group (a new group starts at every StateNewStyles record)
  all fill paths ordered by fill-style index, then all line paths ordered by line-style index. Draw them in
  array order.
- Fill paths: the converter collects every edge that has the style on either side (edges with
  `fillStyle1 = f` forward, `fillStyle0 = f` reversed), then chains them into closed contours. Fill with the
  **even-odd** rule (matches JPEXS output). Contours are consistently oriented, so the non-zero rule also
  works (used for mask unions).
- Line paths: edges of that line style in record order; a new `M` whenever the pen jumps. Stroke with round
  caps and round joins (LINESTYLE v1). `width` scales with the transform; draw at least 1 device pixel wide
  (`width 0` and sub-pixel widths become 1 px hairlines, as Flash and JPEXS do).
- Gradients: source space is the SWF gradient square. Linear: colour ramp along x from x = −16384 to +16384
  (`ratio` 0 → 255), constant along y. Radial: centred at (0,0), radius 16384. Beyond the ends: pad. Stops are
  RGB-interpolated. Canvas: `createLinearGradient(-16384,0,16384,0)` / `createRadialGradient(0,0,0,0,0,16384)`
  drawn under `matrix`, clipped by the path.
- Bitmap fills: `repeat` = fill types 0x40/0x42 (tile), else clipped (0x41/0x43, outside pixels are the
  clamped edge colour in Flash; the renderer leaves them transparent). `smooth` false only for 0x42/0x43
  (SWF 8 types, not present in this archive). A bitmap id of 65535 (no bitmap) is dropped.

### 6.2 `morph` (DefineMorphShape)

```ts
{ type: "morph", id, bounds: [Rect, Rect], paths: MorphPath[] }
MorphPath = { fill: [Fill, Fill], d: [string, string] } | { line: [Line, Line], d: [string, string] }
```

Index 0 = start shape (ratio 0), 1 = end shape (ratio 65535). `d[0]` and `d[1]` have **identical command
sequences** (a straight edge paired with a curve is emitted as `Q` with the control point at the midpoint),
so interpolate token by token. Both `Fill`s have the same `type` and stop count. At `t = ratio / 65535`
interpolate linearly: every path number, colours (each channel), gradient stop ratios, matrix components,
line widths, bounds. Order, fill rule and stroke rules as for `shape`.

### 6.3 `sprite` (DefineSprite)

```ts
{ type: "sprite", id, frameCount: number, frames: Frame[] }   // frames.length === frameCount
```

Timeline semantics in §7. `frameCount` is the header value; if the tag stream has a different number of
ShowFrame tags the converter pads with empty frames / keeps trailing tags as a last frame and logs a warning.

### 6.4 `button` (DefineButton2)

```ts
{ type: "button", id, trackAsMenu: boolean,
  records: { states: ("up"|"over"|"down"|"hit")[], id: number, depth: number, matrix: Matrix, cxform?: ColorTransform }[],
  actions: { conditions: ButtonCondition[], key?: number, bytecode: string }[] }
```

Each state is the display list of the records whose `states` contain it, drawn by ascending `depth`
(record characters are instantiated like placed objects; sprites in states play). `hit` is the invisible
hit area. `conditions` are the SWF state transitions (SWF19 `BUTTONCONDACTION` flags), mapping to AS
`on(...)` handlers as follows:

| condition | AS handler |
|---|---|
| `idleToOverUp` | `rollOver` |
| `overUpToIdle` | `rollOut` |
| `overUpToOverDown` | `press` |
| `overDownToOverUp` | `release` |
| `outDownToIdle` | `releaseOutside` |
| `overDownToOutDown` | `dragOut` |
| `outDownToOverDown` | `dragOver` |
| `idleToOverDown` | `dragOver` (trackAsMenu) |
| `overDownToIdle` | `dragOut` (trackAsMenu) |

`key` = `CondKeyPress` code (`on(keyPress "...")`) when non-zero. Static rendering shows `up`.

### 6.5 `text` (DefineText — static text)

```ts
{ type: "text", id, bounds: Rect, matrix: Matrix,
  records: { font: number, size: number /*px*/, color: RGBA, x: number, y: number, glyphs: [index: number, advance: number /*px*/][] }[] }
```

Records are resolved by the converter (font/size/colour/x/y carried over from previous records; x continues
after the previous record's advances), so each is self-contained. Draw: for each glyph,
`font.glyphs[index].d` scaled by `size / 1024`, origin at (`x`, `y` = baseline), then `x += advance`. The
whole thing is under `matrix` (text space → symbol space). Fill glyphs even-odd with `color`.

### 6.6 `edittext` (DefineEditText)

```ts
{ type: "edittext", id, bounds: Rect, variable?: string, text?: string, html: boolean,
  font?: number, size?: number /*px*/, color?: RGBA, maxLength?: number,
  align?: "left"|"right"|"center"|"justify", leftMargin?, rightMargin?, indent?, leading? /*px*/,
  wordWrap, multiline, password, readOnly, selectable, border, autoSize, useOutlines: boolean }
```

`text` is the initial text (HTML when `html`). `variable` is the bound AS variable path. `font` is a `font`
symbol id: use its `name` as device font when `useOutlines` is false; when true the glyph outlines
(`font.glyphs`) are the embedded font (layout with `advance`/`ascent`/`descent`/`leading`). Flash draws text
with a 2 px gutter inside `bounds`. Static renderer: canvas `fillText` with the font name (tags stripped),
no wrapping. The runtime TextField (wrap, HTML, scrolling, input) is in `web/src/runtime/text.ts` (`docs/runtime.md`).

### 6.7 `font` (DefineFont2)

```ts
{ type: "font", id, name: string, bold: boolean, italic: boolean,
  glyphs: { code: number /*UCS-2*/, d: string, advance?: number }[],
  ascent?: number, descent?: number, leading?: number }
```

Glyph paths, `advance`, `ascent`, `descent`, `leading` are in **EM units, 1024 per em** (raw SWF glyph
coordinates, *not* divided by 20; y down, baseline 0). At a font size of S px scale by `S / 1024`. Layout
fields are present only when the font has layout info (`hasLayout`). Fill even-odd.

### 6.8 `bitmap` (DefineBits, DefineBitsJPEG2/3, DefineBitsLossless/2)

```ts
{ type: "bitmap", id, width: number, height: number, file: string }
```

- DefineBits: tag data appended to the SWF's `JPEGTables`; DefineBitsJPEG2/3 carry their own tables. The
  converter rebuilds a single clean JPEG stream (drops stray SOI/EOI markers incl. the `FF D9 FF D8`
  erroneous header) → `.jpg`, original compressed data, no re-encode.
- DefineBitsJPEG3: JPEG + zlib alpha plane → `.png`. The JPEG colour is premultiplied; Flash clamps
  colour to alpha; the PNG stores straight alpha (`min(c, a) · 255 / a`).
- DefineBitsLossless/2 (formats 3 colour-mapped, 4 RGB15, 5 (A)RGB, premultiplied in Lossless2) → `.png`,
  straight alpha.

Bitmaps are referenced only through bitmap fills (and AS `attachBitmap` does not exist in Flash 6).

### 6.9 `sound` (DefineSound)

```ts
{ type: "sound", id, format: number, rate: number /*Hz*/, is16Bit: boolean, stereo: boolean, samples: number }
```

Metadata only (`format`: 0 raw, 1 ADPCM, 2 MP3, 3 raw LE, 6 Nellymoser). Audio files are produced by the
assets-media agent; match by SWF path + character id or linkage name (`exports`).

## 7. Timeline (`root` and `sprite`)

```ts
Timeline = { frameCount: number, frames: Frame[] }
Frame = {
  label?: string,                 // FrameLabel
  ops?: DisplayOp[],              // display-list changes, in tag order
  actions?: string[],             // DoAction bytecode (base64), in tag order
  initActions?: { id: number, bytecode: string }[],   // DoInitAction (root timeline only)
  sounds?: StartSound[]           // StartSound, in tag order
}
DisplayOp =
  | { op: "place", depth: number, id?: number, move?: true, matrix?: Matrix, cxform?: ColorTransform,
      ratio?: number /*0..65535*/, name?: string, clipDepth?: number, clipActions?: ClipAction[] }
  | { op: "remove", depth: number }
ClipAction = { events: ClipEvent[], key?: number, bytecode: string }
StartSound = { id: number, stop?: true, noMultiple?: true, loops?: number, inPoint?: number, outPoint?: number,
               envelope?: [pos44: number, left: number, right: number][] }
```

Frames are **deltas** exactly as the SWF stores them (no resolved display lists) because the runtime must
implement Flash's instance identity: an instance placed on frame 3 and moved on frames 4–10 is the same
object (keeps its AS properties, its own playhead, colour set by `Color.setRGB`, attached children).

Applying a frame (Flash semantics, PlaceObject2 per SWF19):

| op | meaning |
|---|---|
| `place`, `id`, no `move` | create a new instance of `id` at `depth` (depth is expected to be empty). Absent matrix = identity, absent cxform = identity, absent ratio = 0. |
| `place`, `move`, no `id` | modify the instance at `depth`: apply only the fields present. |
| `place`, `move`, `id` | replace the character at `depth` by `id`; fields absent keep the old instance's values (matrix, cxform, ratio, name, clipDepth). |
| `remove` | remove the instance at `depth`. |

- `name`: instance name (`_name`; reachable as `parent[name]`, e.g. body parts recoloured by
  `Dofus.CharactersColors.as`).
- `ratio`: morph interpolation for `morph` characters (`t = ratio / 65535`); for other characters it is the
  tween identity Flash uses when rewinding.
- `clipDepth`: this instance is a **mask**: it is not drawn; its shape (fills, union of all its descendants)
  clips every instance with `depth < d ≤ clipDepth`. Used heavily (`clips/ground.swf`: 776 masks).
- PlaceObject/RemoveObject v1 tags are mapped to the same ops (`place` with `id`, `remove`).
- Order within a frame (Flash 6): apply `ops`; run `initActions` (first time the frame is reached, before
  the frame's other scripts; each initializes the class for sprite `id`); run `actions`; trigger `sounds`.
- `actions` run with `this` = the timeline's MovieClip. Common clip scripts in this archive:
  `stop()`, `this.end()`, `this.getActionClip().wait()`, `_parent.removeMovieClip()`,
  `SOMA.playSound("…")`, `WEAPONS.applyWeapon(this, "R")`, `cColors.applyColor(this, "…")`.
  Readable source for any SWF: `tools/ffdec.sh -export script <outdir> dofus-5b/<file>.swf`
  (`DefineSprite_<id>[_<linkage>]/frame_<n>/DoAction.as`; frame n ↔ `frames[n-1]`).
- `ClipEvent` (PlaceObject2 `onClipEvent`): `load`, `enterFrame`, `unload`, `mouseMove`, `mouseDown`,
  `mouseUp`, `keyDown`, `keyUp`, `data`, `initialize`, `press`, `release`, `releaseOutside`, `rollOver`,
  `rollOut`, `dragOver`, `dragOut`, `keyPress` (with `key`), `construct`.
- Nested sprites have their own playheads (they start at frame 1 when created and advance every tick
  independently of the parent unless stopped by script).

## 8. Rendering contract (what `web/src/swf/render.ts` implements)

1. A display list is drawn in ascending depth. Each child: `ctx.transform(matrix)`; colour transform
   composed with the parent's (`mul = p.mul·c.mul`, `add = p.mul·c.add + p.add`, child applied first).
2. Vector colours (solid fills, strokes, gradient stops) are transformed exactly on the CPU before drawing,
   so per-shape alpha is faithful. Bitmaps receive only the alpha part (`globalAlpha`).
3. Masks per §7 (`clipDepth`), clip path = union (non-zero) of the mask's fill paths in local space.
4. Morph shapes at the instance `ratio`.
5. Static frame N of a sprite = its playhead has run `N − 1` ticks: replay `ops` of frames 1…N; every
   nested sprite runs its own playhead for the ticks elapsed since its instance was created, looping
   (`frame = elapsed mod frameCount`). Instances created on frame 1 that are still alive on the last frame
   are not recreated when a timeline loops, so their elapsed time keeps running (e.g. a 1-frame container's
   children keep animating). Scripts are not executed. This matches JPEXS's `sprite:png` export.
6. Buttons show their `up` state. Edit text uses device-font `fillText` (see §6.6).

## 9. Manifest (`index.json`)

```ts
{ format: "dofus-swf-index", formatVersion: 1,
  files: { src: string, json: string, version: number, width: number, height: number, frameRate: number,
           frameCount: number, symbols: number, bitmaps: number, exports: number, warnings?: string[] }[],
  failures: { src: string, error: string }[] }
```

`json` is relative to `web/public/assets/swf/`. Converting a subset updates only those entries.

## 10. Not carried

- Audio sample data (assets-media), SoundStreamHead2 (124 heads, no stream blocks in the archive).
- Protect / EnableDebugger / DebugID tags. Nothing else in the archive is dropped; unknown tags are logged
  as warnings in `index.json`.

## 11. Filled ground/object ids (`clips/ground.json`, `clips/objects.json`)

The 2004 maps the server uses (`vendor/dofedex/maps-2004/`) reference ground and object linkage ids that beta 5b's
`clips/ground.swf` (105 exports, ids 1-511) and `clips/objects.swf` (493 exports, ids 1-1070) lack. `convertFile`
therefore adds to these two files every export that 5b lacks and a later archived client has
(`vendor/archive-dofus-1/<v>/clips/{ground,objects}.swf`, v7b … v1_0), taken from the **earliest** version that has
it. 5b's own graphic always wins when 5b has the id. The client is unchanged: `attachMovie("<id>")` on the loaded layer
clip (`AKSClient/Dofus.BattleField.Container.as:16-39`, `clips/ground.swf/frame_1/DoAction.as:1-12`) finds the id in
`exports` either way.

**Same id scheme.** Every version exports only numeric linkage names (ground 1-511 throughout; objects 1-1070 up to
v7b, up to 8013 later), and the ids both have show the same subject. Rendering each id 5b shares with a later version
(frame 1) and comparing pixels (`scripts/assets-media/compare.ts`, ≤ 1 % differing pixels = same): v7b 100 of 105
ground and 382 of 493 objects, v10b 94/104 and 334/492, v1_0 90/104 and 263/477. The others are the same subject
redrawn or recoloured (water ground 27-31 blue → green from v10b, house object 315 recoloured, stump 20 and rack 402
smaller, rock 72 with a water ring in v1_0); only ground 1 and 2 (editor tiles: 5b's 1 is an axis marker, 2 sand)
became unrelated tiles. Ids are never renumbered, so the same id from a later version is the best available
substitute.

| Earliest version | Ground ids | Object ids | Provenance tag |
|---|---|---|---|
| v7b (25 Feb 2004) | 8 | 30 | `beta_sibling` |
| v10b | 9 | 40 | `beta_sibling` |
| v11b | 0 | 15 | `beta_sibling` |
| v12b | 5 | 42 | `beta_sibling` |
| v13b | 0 | 11 | `beta_sibling` |
| v15b (v16b is byte-identical) | 13 | 127 | `beta_sibling` |
| v17_1b | 2 | 71 | `beta_sibling` |
| v17_2b | 0 | 9 | `beta_sibling` |
| v1_0 (23 Aug 2004, the release) | 4 | 59 | `release_sibling` |
| **total** | **41** | **404** | |

Tags: `docs/content-reconstruction.md` §1.1. Of the ids beta 5b lacks that the 565 dofedex maps reference, 27 of 35
ground and 242 of 397 object ids are filled; ground 110, 137-143 and 155 object ids (between 701 and 7535) are in no
archived client up to v1_0 and stay missing.

- **Manifest** `clips/<name>.fill.json`: `{ "<linkage id>": { from: "vendor/archive-dofus-1/<v>/clips/<name>.swf",
  provenance: "beta_sibling" | "release_sibling" } }` (`FillManifest` in `scripts/assets/convert.ts`). Generated
  with the JSON, so it always matches it; `scripts/server-data/maps.ts` reads it to tell beta 5b ids from filled ones.
- **Copy.** Each filled export's symbol closure gets fresh character ids above 5b's highest (children shared within a
  version are copied once); references are remapped (place-op, button-record and StartSound `id`, fill `bitmap`,
  text/edittext `font`), bitmaps are written as `<name>/<new id>.<ext>`. The root timeline (frame-1 `clear`/`attach`
  script) stays 5b's.
- **No new SWF features.** The tag census (`python3 -I scripts/swf-tags.py`) of every later `ground.swf`/`objects.swf`
  shows only tag types the converter already reads (DefineShape 1-3, DefineMorphShape, DefineBits/JPEG2/JPEG3 +
  JPEGTables, DefineBitsLossless/2, DefineFont2, DefineText, DefineEditText, DefineSprite, PlaceObject2,
  RemoveObject2, DoAction, FrameLabel, ExportAssets); parsing them gives no warning. Their clip scripts are plain AS1
  (random frames, `_parent` reads, `SOMA.playSound`).
- **Verified**: the filled ids render pixel-identically to their source version's own conversion (290 ids from v7b,
  v10b, v15b and v1_0 compared, no differing pixel); `scripts/assets/convert.test.ts` renders ground 10 (v7b) and
  object 835 (v1_0) and checks the manifest; the 90 world maps and the 49 fight maps render headless for 60 frames
  with no runtime error.
- **Size**: `ground.json` 865,851 → 953,601 bytes, `objects.json` 5,636,513 → 12,553,982; bitmap directories
  656 KB → 1.1 MB and 800 KB → 2.0 MB. The client fetches both libraries whole before the login screen, behind the
  boot loading bar (`web/src/game/kernel/kernel.ts` `checkLanguage`, `docs/runtime.md` §4.6): ≈ 16.6 MB instead of
  ≈ 7.9 MB. Not done: loading ids on demand, or filling only the ids the maps reference.
