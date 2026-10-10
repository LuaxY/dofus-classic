# Media assets (sounds, fonts, bitmaps, texts) and reference renders

Everything that is not vector/timeline: extracted from `dofus-5b/` (read-only) by scripts in `scripts/assets-media/`.
Vector shapes/sprites/timelines are assets-core's job (`docs/assets-format.md`); the reference renders and
`compare.ts` below exist to verify that renderer.

## How to run

```sh
bun scripts/assets-media/extract.ts     # ~6 s  -> web/public/assets/media/ (wiped and regenerated) + French strings section below
bun scripts/assets-media/reference.ts   # ~40 s -> decompiled/reference/*.png + index.json (wiped and regenerated)
bun scripts/assets-media/compare.ts <reference.png> <candidate.png> [options]   # pixel diff, see below
bun test scripts/assets-media           # swf.test.ts (tag reader), compare.test.ts (synthetic image pair)
```

`swf.ts` is a ~150-line SWF tag reader (handles `CWS`, nested sprite tags, frame index per tag) that indexes
media tags and decodes texts. Pixel/audio/outline decoding is done by JPEXS (`tools/ffdec.sh`), run **once** over
a temporary directory of symlinks named `clips~spells~icons~23.swf` (JPEXS directory input is not recursive), plus
a second run for WOFF. Scratch dirs (`.work/`) are deleted at the end of each script.

## Output (`web/public/assets/media/`, 4.7 MB, 428 files)

| What | Count | Files | Size |
|---|---|---|---|
| Sounds | 57 DefineSound (55 in `modules/Sound.swf`, 1 each in `clips/sprites/1003.swf`, `1004.swf`) | `sounds/<linkage>.mp3`, `sounds.json` | 404 KB, 90.9 s total |
| Fonts | 50 DefineFont2: 42 embedded → 37 unique faces, 8 device fonts | `fonts/<name>[-bold][-italic]-<hash>.{woff,ttf}`, `fonts.css`, `fonts.json` | 1.1 MB |
| Bitmaps | 278: 186 DefineBits(+JPEGTables), 15 DefineBitsJPEG2, 41 DefineBitsJPEG3, 36 DefineBitsLossless2 | `bitmaps/<swf-path>/<characterId>.{jpg,png}`, `bitmaps.json` | 2.9 MB |
| Texts | 288 (68 DefineText, 220 DefineEditText) in 14 SWFs | `texts/<swf-path>.json`, `texts/index.json` | 184 KB |

`<swf-path>` is the path relative to `dofus-5b/` **including** `.swf`, e.g.
`bitmaps/clips/spells/icons/23.swf/1.jpg`, `texts/modules/Interfaces.swf.json`.

487 SWFs were found (the brief says 489; not investigated).

### Sounds — `sounds.json`

Keyed by ExportAssets linkage name (what `Sound.attachSound(file)` in
`modules_Sound/Dofus.Sound.Manager.as:192` receives), or `<swf>#<characterId>` for the two unnamed timeline sounds.

```json
"death": { "file": "sounds/death.mp3", "swf": "modules/Sound.swf", "id": 38, "linkage": "death",
  "swfFormat": 2, "rate": 22050, "stereo": false, "duration": 4.101333, "declaredDuration": 4.101,
  "bytes": 12304, "startSounds": [] }
"clips/sprites/1003.swf#109": { ..., "linkage": null, "startSounds": [{ "sprite": 116, "frame": 0 }, { "sprite": 116, "frame": 2 }, ...] }
```

- **Format: MP3.** Every DefineSound in the corpus is already MP3 (`swfFormat` 2; 56 × 22050 Hz mono, 1 × 11025 Hz
  mono), so the files are copied byte-for-byte (no re-encode loss) and MP3 plays in every modern browser including
  Safari, which Ogg Vorbis does not reliably do. The script transcodes anything else (ADPCM/PCM WAV) to MP3 with
  `ffmpeg -codec:a libmp3lame`; that path never executes on this corpus.
- `duration` is from `ffprobe`; `declaredDuration` = DefineSound SampleCount / rate. All agree within 1 ms except
  `lakam_404`: the MP3 stream decodes to 3.224 s but SampleCount says 3.000 s. Which one the Flash player honoured is
  UNKNOWN.
- `startSounds` lists `StartSound` tags (sprite id, 0-based frame index within that sprite's timeline). These are the
  only 8 StartSound tags in the corpus (sprites 1003/1004, monster animations) — a timeline renderer must play them.
- The 124 `SoundStreamHead2` tags are empty Flash-IDE headers: there is no `SoundStreamBlock` anywhere, so no
  streamed audio exists (JPEXS still writes 44-byte `-1.wav` stubs for them; they are ignored).
- Sound names used by code: `bip`, `error`, `pet`, `start_fight`, `coup_critique` (`modules_Sound/Dofus.Sound.Event.as`);
  spell SWFs call `playSound("<guild>_<spell>")` from frame actions and character sprites call `pas_homme_normal`,
  `hit_defaut`, `cc_<guild>`, `death`. Scanning frame-action constant pools finds 5 names **used but not present** in
  any SWF: `arty_105` (`clips/spells/105.swf`), `lakam_401`, `lakam_402`, `lakam_403`, `lakam_407`
  (`clips/spells/40x.swf`). Probably in the missing `modules/sounds.swf` — UNKNOWN. Unused here: `Pages`, `boum`,
  `tchak`. Music (`02.mp3`, `04.mp3`, `07.mp3`, `08.mp3`, `10.mp3`–`12.mp3`, loaded from `MUSIC_PATH`) is missing
  from the archive.
- Per-sound volumes live in code (`modules_Sound/Dofus.Sound.Params.as`, `addParams(name, volume)`), not here.

### Fonts — `fonts.css`, `fonts.json`

- JPEXS exports TTF and WOFF (1.0). No WOFF2 encoder is available without installing something (`woff2_compress`,
  fontTools and brotli for Python are absent), so WOFF is shipped (supported by every modern browser) with TTF as
  fallback/for tooling (`GlobalFonts.registerFromPath` in `@napi-rs/canvas` loads them; checked by rendering
  bitMini6, Verdana, Lithograph, impact).
- Faces are deduplicated by the DefineFont2 tag bytes minus the font id (the TTFs differ only by timestamps):
  AKSClient.swf and Interfaces.swf embed byte-identical `bitMini6`, `Verdana`, `Verdana` bold (1108 glyphs each).
  The guild description SWFs embed tiny per-file subsets of Verdana (11–39 glyphs; some lack even the space).
- `fonts.css` uses the **original names** as `font-family`. Several embedded subsets share a family, so each
  `@font-face` carries a `unicode-range` computed from its code table and the browser composes them; faces are sorted
  by glyph count so the fullest subset is defined last (= consulted first). Because a family declared by `@font-face`
  hides the system font of the same name, the file starts with one full-range `src: local("<name>[ Bold][ Italic]")`
  face per name/style (defined first = consulted last).
- `fonts.json` maps `swf → fontId → entry`, so a DefineEditText/DefineText `font` id resolves directly:

  ```json
  "AKSClient.swf": { "1": { "name": "bitMini6", "bold": false, "italic": false, "glyphs": 1108, "linkage": "Font3",
                            "file": "fonts/bitMini6-477eb65d.woff", "ttf": "fonts/bitMini6-477eb65d.ttf" } }
  "modules/Interfaces.swf": { "459": { "name": "_sans", ..., "glyphs": 0, "device": true, "fallback": "sans-serif" } }
  ```

- **Device fonts** (DefineFont2 with no glyphs — Flash used the system font; need a CSS fallback):

  | SWF | id | name | fallback |
  |---|---|---|---|
  | `DOFUS.swf` | 2 | Times New Roman | `"Times New Roman", serif` |
  | `clips/objects.swf` | 448 | Arial bold | `"Arial", sans-serif` |
  | `modules/Interfaces.swf` | 4, 459 | `_sans` bold, `_sans` (Flash alias) | `sans-serif` |
  | `modules/Interfaces.swf` | 14, 66 | Verdana, verdana | `"Verdana", sans-serif` |
  | `modules/Interfaces.swf` | 218 | Times New Roman | `"Times New Roman", serif` |
  | `modules/Interfaces.swf` | 951 | Arial bold | `"Arial", sans-serif` |

### Bitmaps — `bitmaps.json`

`swf → [{ id, tag, file, width, height, linkage? }]`. JPEG-only tags (DefineBits with the SWF's JPEGTables,
DefineBitsJPEG2) → `.jpg` as stored; tags with alpha (DefineBitsJPEG3 = JPEG + zlib alpha plane, DefineBitsLossless2
= zlib premultiplied ARGB) → `.png` with straight (un-premultiplied) alpha. Checked: corners fully transparent,
semi-transparent edge pixels keep the solid colour (not darkened), e.g. `clips/ground.swf/9.png`, `17.png`,
`clips/objects.swf/654.png`, `694.png`, `clips/guilds/artwork/big/50.swf/1.png`. Spell icons are one 40×40 JPEG each
(`clips/spells/icons/<id>.swf/1.jpg`), the Interfaces background is `modules/Interfaces.swf/8.jpg` (742×550). No
bitmap carries a linkage name. Bitmaps are referenced by shape fill styles (`bitmapId`), which is assets-core's side.

### Texts — `texts/<swf>.json`

`{ swf, texts: [...] }` with every DefineText and DefineEditText (empty ones too: their `variable` names, e.g.
`chatContent`, `xp`, `name`, `level`, are the dynamic fields the UI code fills). Units are pixels.

- DefineText: `{ id, tag, bounds, text, records: [{ font, height, color, x, y, text }], usedIn }`. Glyph indices are
  mapped through the code table of the referenced DefineFont2 of the same SWF. `text` joins records, starting a new
  line (`\r`) at each record that sets a y offset.
- DefineEditText: `{ id, tag, bounds, font, height, color (#rrggbbaa), maxLength?, align, leftMargin, rightMargin,
  indent, leading, variable, text, flags: [wordWrap, multiline, password, readOnly, autoSize, noSelect, border, html,
  useOutlines], usedIn }`. `text` is the initial text, HTML when `html` is set; `\r` kept as in the SWF.
- `usedIn`: nearest exported (linkage-named) sprites/buttons that place the text, following PlaceObject/PlaceObject2
  and DefineButton2 records upwards; `(root)` = main timeline.

## Reference renders (`decompiled/reference/`, 114 PNGs, 1.6 MB)

JPEXS 26.3.0 renders of 54 symbols from 18 SWFs: `clips/sprites/10.swf` (StaticR 63, WalkR 99, CastR 147, main
frames 2/29/30/31/110), `clips/sprites/1000.swf` (43, 77, shape 1, main frames 2/28/30), spells `101.swf` (sprite 14),
`903.swf` (15 and `fumee` — DefineMorphShape), `305.swf` (`shoot` — DefineMorphShape + DefineBitsJPEG3), 10 ground
tiles and 10 objects by linkage name (bitmap-filled, vector, animated, morph-shape users), spell icons 23/31/122,
items `1/1`, `5/1`, `10/1`, guild artworks `big/50`, `mini/10`, `circle.swf`, `ccicon.swf`, and Interfaces.swf
(`Interface::Window`, `Interface::WindowBox`, `Interface::CheckBox`, `SpellBar`, `Ank::Dofus::PushButton`,
`Interface::BtnQuit`, `dofus::graphics::gui::UICreateCharacter`, buttons `ButtonClose` 210 and `BtnRefresh` 258).
The sample list is `SAMPLES` in `scripts/assets-media/reference.ts`. Sprites without explicit frames get 4 frames
spread over their timeline.

**Names:** `<swf path without .swf, / → ->__<linkage, else characterId>__f<frame>.png`; the main timeline is
characterId `0`; characters other than `[A-Za-z0-9_.-]` in linkage names become `_`
(`dofus::graphics::gui::UICreateCharacter` → `dofus_graphics_gui_UICreateCharacter`). Ground/objects linkage names
are numbers ("49" is linkage, characterId 37) — `index.json` is authoritative. Buttons: f1 = up, f2 = over, f3 = down
(hit-test state not rendered).

**`index.json`:** `[{ file, swf, kind: sprite|button|shape|frame, characterId, linkage, frame, state?, frameCount,
size: [w, h], origin: [x, y], cropped? }]`. `origin` is the pixel position of the symbol's registration point (0,0)
inside the PNG, fractional.

**How JPEXS positions things** (all verified, see below):

- `sprite` / `button` / `shape` (`-export sprite|button|shape -format …:png`): the canvas covers the symbol's bounds
  — for sprites the **union over all frames** (so every frame of a symbol has the same size and origin), for shapes
  the DefineShape `ShapeBounds` RECT. `origin = (-xMin, -yMin)` in px (twips/20, fractional, not rounded),
  `size = ceil(width), ceil(height)` (checked by `reference.ts` against the SVG size on all 97 symbol renders; shape
  example: `1000.swf` shape 1 RECT (−373, −89)–(373, 89) twips → origin 18.65, 4.45, size 38×9).
  The origin is read from the matching SVG export (`<g transform="matrix(1,0,0,1,ox,oy)">`).
- `frame` (main timeline): JPEXS frame export renders the **stage rectangle** (white background, content at negative
  coordinates clipped). So `reference.ts` renders a copy of the SWF whose header rect is patched to ±1000 px with
  `-ignorebackground`, then crops to the non-transparent pixels: `origin = (1000 − cropX, 1000 − cropY)`, always
  integral; `cropped: true`. (Post-processing of ours, not native JPEXS output.)
- Nested sprites advance with their parent (`animateSubsprites=true`): a child placed at parent frame P shows its own
  frame `F − P + 1` at parent frame F. Verified: `10.swf` main frames 29 and 31 equal sprite 99 frames 1 and 3.
- Main-timeline placements carry their matrices: `1000.swf` places its animations mirrored (`a = −1`) with fractional
  translations, so its main frames are mirror images of the sprite renders — expected.
- Verification of the origin convention: rasterising JPEXS's own SVG export with Skia (`@napi-rs/canvas`) at (0,0) and
  comparing with the JPEXS PNG gives 0.6–3.2 % bad pixels unblurred, 0 % with `--blur 1`, best at zero offset
  (`10.swf` sprite 99, `items/1/1.swf` shape 1).

**JPEXS caveats:** ActionScript is not executed (e.g. `circle.swf` frame action `setColor` not applied; spells/UI
assembled by code look bare); text fields whose glyphs are not embedded render as boxes (visible in
`UICreateCharacter`) — mask text areas when comparing; `ImportAssets` is ignored (the 20 character SWFs import one
symbol from `clips/sprites/weapons/weapons.swf`; in `10.swf` it is placed only in sprite 2 = main frame 1 "Init");
anti-aliasing is Java2D's, so expect edge differences against Canvas2D.

## compare.ts

```sh
# reference = main frame of items/1/1.swf, candidate = its shape 1 rendered elsewhere (origin -255.7,-181.55)
bun scripts/assets-media/compare.ts decompiled/reference/clips-items-1-1__0__f1.png \
  decompiled/reference/clips-items-1-1__1__f1.png --cand-origin -255.7,-181.55 --diff diff.png
# {"dx":1,"dy":1,"covered":709,"bad":19,"badRatio":0.0268,"meanDiff":0.0325,"threshold":0.05,"pass":true}
```

- Alignment: `--ref-origin x,y --cand-origin x,y` (registration point in each image). When only `--cand-origin` is
  given, the reference origin is looked up in `index.json` next to the reference PNG. Without origins: alpha
  bounding-box alignment, then a ±2 px search. `--search N` forces a search window.
- Score: both images premultiplied, box-blurred by `--blur` (default 1 px) to absorb anti-aliasing; a pixel is bad
  when any channel differs by more than `--tolerance` (default 48/255); `badRatio = bad / covered`, where covered =
  alpha > 0 in either (unblurred) image. Exit 1 when `badRatio > --threshold` (default 0.05). `--diff` writes red =
  bad, yellow = small difference, grey = reference.
- Calibration on JPEXS output: same content at the same sub-pixel phase → ~0; same content shifted by a fraction of a
  pixel → 2.7 % (`items/1/1` main frame vs its shape, 0.3/0.45 px) up to 8 % for thin 1-px strokes (`circle.swf`).
  **Render candidates into a canvas of `size` with the registration point at the exact fractional `origin`** and
  compare with `--cand-origin` = that origin; then only rasteriser differences remain.

## Gaps and unknowns

- Missing sounds referenced by code: `arty_105`, `lakam_401`, `lakam_402`, `lakam_403`, `lakam_407`; all music.
- `lakam_404` duration: MP3 data 3.224 s vs SampleCount 3.000 s — which the player used is UNKNOWN.
- Duplicate linkage names (same name exported for several characterIds): `clips/ground.swf` `503` (70, 370);
  `clips/objects.swf` `72` (11, 1990); `modules/Interfaces.swf` `ButtonClose` (210, 494, 859, 873), `BtnRefresh`
  (258, 327, 344, 914), `ScrollMover` (481, 482), `btVideSymbol` (650, 65533), `btPastilleSymbol` (647, 648),
  `ButtonInventory` (752, 861), `ButtonSpells` (755, 860). The tooling keeps the first; which one Flash's
  `attachMovie` resolves is UNKNOWN — not in code.
- No WOFF2 (no encoder available). Device-font text needs system fonts; metrics will differ from 2004 Windows.
- `clips/items/*/*.swf` are SWF version 7 (all others 6); irrelevant for extraction.
- Language strings are lost (see brief); the strings below are only what was baked into SWFs.

## French strings baked in SWFs

Every non-empty DefineText/DefineEditText initial text, verbatim (dev placeholders included; trailing blank lines
trimmed), grouped by file. Line breaks are the SWF's `\r`; HTML text fields are shown as raw HTML. `in …` = the
exported symbol(s) that contain the field. Order is by characterId, not on-screen position (guild description
titles and paragraphs are interleaved by placement). Exact text, fonts and bounds: `web/public/assets/media/texts/`.

<!-- french-strings:start (generated by scripts/assets-media/extract.ts) -->

### `AKSClient.swf` (1 of 1 text fields non-empty)

- **#79** (DefineText, in `Dofus::DataCenter`)
  ```text
  DataCenter
  ```

### `DOFUS.swf` (1 of 1 text fields non-empty)

- **#3** (DefineEditText, in `(root)`)
  ```text
  Test des path
  ```

### `clips/guilds/descriptions/1.swf` (1 of 1 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Non disponible
  ```

### `clips/guilds/descriptions/10.swf` (1 of 1 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Non disponible
  ```

### `clips/guilds/descriptions/2.swf` (8 of 8 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Le Cri de l’ours permet de retirer des PA à plusieurs cibles dans un 
  rayon délimité.
  ```
- **#4** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```
- **#7** (DefineText, in `(root)`)
  ```text
  >>> Guilde du fouet d'Osamodas
  Les disciples de cette guilde élèvent des créatures et les dressent pour 
  qu'elles combattent pour eux. Ils possèdent une parfaite connaissance de la 
  nature. Leur dieu, Osamodas est le maître de trois dragons rouges qui 
  règnent sur toutes les créatures du monde.
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Chien                                                  PO : 3    PA : 4   1dé5+2
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Le chien inflige des dégâts aux ennemis.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Chat                                                    PO : 3    PA : 4   1dé3+2
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  + Cri de l'ours                                                          PO : 6 PA : 4
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Le chat peut toucher 2 cibles différentes dans un rayon inférieur 5 
  cases.
  ```

### `clips/guilds/descriptions/3.swf` (8 of 8 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Le lancer de pelle est la spécialité du disciple d'Enutrof. Ce sort 
  occasionne des dégats important mais n'a qu'un faible portée.
  ```
- **#4** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```
- **#7** (DefineText, in `(root)`)
  ```text
  >>> Guilde des chercheurs d'Enutrof
  Ils sont à même de découvrir les meilleurs objets de l'univers d'Amakna. Les 
  bons chasseurs de trésors ne sont pas vraiment bercés dans l'art du combat, 
  mais peuvent au fil du temps devenir des adversaires redoutables grâce à 
  leurs objets.
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Armure pelleteuse                                                        PO : +1
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Cette armure permet aux disciples de cette guilde d'augmenter sa 
  portée pendant quelques tours.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Troc                                             1 dé10 d'or volé par attaque
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  +  Lancer de pelle                                                          1dé6 +1
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Le troc permet à chaque joueur infligeant des points de dégâts de 
  voler de l'or.
  ```

### `clips/guilds/descriptions/4.swf` (1 of 1 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Non disponible
  ```

### `clips/guilds/descriptions/5.swf` (8 of 8 text fields non-empty)

- **#3** (DefineText, in `(root)`)
  ```text
  >>> Guilde du sablier de Xélor
  Les disciples du sablier de Xélor jouent sur les distorsions du temps. Ils 
  peuvent ralentir ou accélérer ennemis et alliés. Leur dieu Xélor a, paraît-il, la 
  forme d'une horloge.
  Ses disciples vivent beaucoup plus longtemps que des êtres humains 
  ordinaires - ils ont une moyenne d'âge de 150 ans. Cette longévité leur vient 
  de leur connaissance du temps et de l'évolution des entités.
  ```
- **#15** (DefineText, in `(root)`)
  ```text
  + Ralentissement                     PA : 1  PO : 4  - 1 PA à l'ennemi
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  Retire des PA à une cible unique. Un même joueur ne peut être ciblé 
  qu'une fois par tour par ce sort.
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  + Contre                   PA : 2    PO : 10   Dégâts : 1dé2 retournés
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  Sort d'attaque qui occasionne des dégâts directs.
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  + Aiguille                              PA : 4    PO : 6    dégâts : 1dé6 +2
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Le disciple de cette guilde peut renvoyer des dégâts à son ennemi 
  lorsque ce dernier lui lance une attaque magique ou de CAC.
  ```
- **#22** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```

### `clips/guilds/descriptions/6.swf` (8 of 8 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Le disciple à l'occasion une fois par tour de tenter de ne se prendre 
  aucun dommage sur une attaque.
  ```
- **#4** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```
- **#7** (DefineText, in `(root)`)
  ```text
  >>> Guilde de la pièce d'Ecaflip
  Les disciples de cette guilde sont des joueurs-nés. Ils sont capables de 
  risquer leur vie pour l'amour du jeu. Leurs sorts risquent donc à tout instant 
  de se retourner contre eux. Dans la guilde Ecaflip, manquer l’incantation d’un 
  sort signifie en assumer les conséquences et en subir les effets.
  Leur dieu, Ecaflip, a perdu sa compagne la déesse Tarot lors d'une partie...
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Roulette             PO : -1   PA : 4  +1 dég. pour 2 PA    2 tours
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Ce sort occasionne des dégâts à tous les joueurs utilisant des PA. 
  Plus le sort est puissant plus il fait mal et plus il reste en jeu.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Pile ou face        PO : 6  PA : 2   1dé8 de dég. et 1dé4 de PDV
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  + Chance d'Ecaflip  PO : -1   vPA : 2    1dé4 dég. récup en PDV
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Enlève des PDV à l'ennemi et lui en rend en cas d'échec
  ```

### `clips/guilds/descriptions/7.swf` (8 of 8 text fields non-empty)

- **#2** (DefineText, in `(root)`)
  ```text
  Ce sort permet aux disciples de cette guilde de retirer des PA à leurs 
  ennemis mais lui inflige des points de dégâts.
  ```
- **#4** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```
- **#7** (DefineText, in `(root)`)
  ```text
  >>> Guilde des mains d'Eniripsa
  Les sorts des guérisseurs sont des paroles, des mots, des prières. La plupart 
  d'entre eux fonctionnent donc si la portée permet à l'ennemi d'entendre le 
  sort. Très respectueux de la vie, les disciples de cette guilde passent leur 
  temps à soigner et à prévenir des attaques.
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Mot curatif             PO : -1        PA : 4        rend 1dé4 de PDV
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Le mot curatif permet au disciple de cette guilde de récupérer des 
  points de vie.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Mot blessant             PO : 5     PA : 3         1dé4 +1 de dégâts
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  + Mot drainant                                                        PO : 1  PA : 1
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Ce mot blesse les ennemis du disciple de cette guilde.
  ```

### `clips/guilds/descriptions/8.swf` (8 of 8 text fields non-empty)

- **#3** (DefineText, in `(root)`)
  ```text
  >>> Guilde du coeur d'Iop
  Iop, dieu de la puissance et du pouvoir, méprise les faibles et ses disciples 
  qui ne doivent pas s'attendre à le voir intervenir à tout moment. Ce dieu ne 
  vient en aide qu'aux plus braves.
  Le courage et la confiance en soi sont les deux qualités premières pour faire 
  partie de la guilde d'Iop.
  ```
- **#14** (DefineText, in `(root)`)
  ```text
  + Pression                             PA : 3    PO : 2   Dégâts : 1dé6 +2
  ```
- **#16** (DefineText, in `(root)`)
  ```text
  Ce sort permet d'augmenter considérablement les dégâts infligés par 
  les disciples de cette guilde.
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Bond                                                                  PA : 4    PO : 6
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Ce sort permet de faire reculer un ennemi.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Intimidation                PA : 2    PO : 1    dégâts : 1    recul : 2
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  Ce sort permet de sauter pour attaquer un ennemi plus vite. En cas 
  d'échec, le joueur passe son tour.
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```

### `clips/guilds/descriptions/9.swf` (8 of 8 text fields non-empty)

- **#3** (DefineText, in `(root)`)
  ```text
  >>> Guilde de l'Etendue de Crâ
  Précision, agilité et dextérité sont les maîtres mots de cette guilde. Ces 
  disciples sont, tout simplement, des archers reconvertis. Leur arc ne suffisant 
  plus à se défendre des monstres de plus en plus résistant, leur dieu, Crâ, leur 
  a légué une partie de sa puissance. Crâ est certainement la divinité la plus 
  proche de ses disciples, car il est le seul dieu à avoir accepté de perdre une 
  partie de son pouvoir.
  ```
- **#14** (DefineText, in `(root)`)
  ```text
  + Flèche magique                       PA : 4    PO : 4   Dégâts : 2dé4
  ```
- **#16** (DefineText, in `(root)`)
  ```text
  Cette flèche enchantée occasionne plus de dégâts que n'importe 
  qu'elle autre simple flèche.
  ```
- **#17** (DefineText, in `(root)`)
  ```text
  + Tir critique                                PA : 4    + aux coups critiques
  ```
- **#18** (DefineText, in `(root)`)
  ```text
  Sort d'attaque qui occasionne des dégâts directs et fait perdre des 
  points d'action.
  ```
- **#19** (DefineText, in `(root)`)
  ```text
  + Flèche glacée             PA : 3    PO : 3    dégâts : 1dé3 +-1 PA
  ```
- **#20** (DefineText, in `(root)`)
  ```text
  Une fois le tir critique lancé, les disciples de cette guilde bénéficient 
  d'un bonus aux coups critique pendant toute la partie.
  ```
- **#21** (DefineText, in `(root)`)
  ```text
  Sorts disponibles au niveau 1
  ```

### `clips/objects.swf` (1 of 1 text fields non-empty)

- **#449** (DefineEditText, in `432`)
  ```text
  y
  ```

### `modules/Interfaces.swf` (133 of 226 text fields non-empty)

- **#5** (DefineEditText, var `fps`, in `fpsDetectorSymbol`)
  ```text
  fps
  ```
- **#6** (DefineEditText, in `fpsDetectorSymbol`)
  ```text
  <p align="left"><font face="_sans" size="12" color="#ffffff"><b>fps</b></font></p>
  ```
- **#40** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#42** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#44** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#46** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#48** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#50** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#52** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#54** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#56** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#58** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  guilde 1
  ```
- **#104** (DefineEditText, in `dofus::graphics::gui::UICreateCharacter`)
  ```text
  Nom du personnage
  ```
- **#158** (DefineEditText, in `Interface::TeamWatcherCharacter`)
  ```text
  Bo
  ```
- **#159** (DefineEditText, in `Interface::TeamWatcherCharacter`)
  ```text
  Bo
  ```
- **#232** (DefineEditText, var `chatContent`, in `Interface::MultiPlayer`)
  ```text
  <p align="left"></p>
  ```
- **#253** (DefineEditText, in `TabPlayDofus_TeamMateFree`)
  ```text
  Ajouter
  ```
- **#261** (DefineEditText, in `TabPlayDofusStart`)
  ```text
  Parties aléatoires
  ```
- **#262** (DefineEditText, in `TabPlayDofusStart`)
  ```text
  <p align="left"><font face="Verdana" size="11" color="#ffffff">- description</font></p><p align="left"><font face="Verdana" size="11" color="#ffffff">sdfsdf</font></p><p align="left"><font face="Verdana" size="11" color="#ffffff">- sdfsdfsdsf</font></p><p align="left"><font face="Verdana" size="11" color="#ffffff">sdfsd</font></p><p align="left"></p>
  ```
- **#272** (DefineEditText, in `TabPlayDofus_TeamMateChoose`)
  ```text
  Ajouter
  ```
- **#274** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Critères de recherche de parties aléatoires
  ```
- **#278** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Recherche en cours ...
  ```
- **#287** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Nom de Partie
  ```
- **#288** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Carte
  ```
- **#291** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Mot de passe
  ```
- **#294** (DefineText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Guilde
  ```
- **#295** (DefineText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Niv.
  ```
- **#296** (DefineText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Joueurs
  ```
- **#298** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Niveaux d'écart
  ```
- **#300** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Temps par tour
  ```
- **#302** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Nombre de joueurs
  ```
- **#310** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Ajouter
  ```
- **#312** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Compte
  ```
- **#316** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Perso
  ```
- **#319** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Compte (Nom)
  ```
- **#320** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Niveau
  ```
- **#322** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Connectés
  ```
- **#324** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Compte
  ```
- **#325** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Non connectés
  ```
- **#330** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Nom de Partie
  ```
- **#331** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Mot de passe
  ```
- **#333** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Rejoindre une partie
  ```
- **#334** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Créer une partie
  ```
- **#335** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Nom de Partie
  ```
- **#336** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Mot de passe
  ```
- **#337** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  aa
  ```
- **#339** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Nombre de joueurs
  ```
- **#340** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Carte
  ```
- **#341** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Temps par tour
  ```
- **#342** (DefineEditText, in `Interface::MultiPlayer::Tabs`)
  ```text
  Niveaux d'écart
  ```
- **#361** (DefineEditText, in `TabStart_GlobalStats`)
  ```text
  Stats Dofus
  ```
- **#367** (DefineEditText, in `TabStart_SelfStats`)
  ```text
  Stats perso
  ```
- **#460** (DefineEditText, in `FLabelSymbol`)
  ```text
  <p align="left"><font face="_sans" size="12" color="#000000"> </font></p>
  ```
- **#493** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  Nom du joueur
  ```
- **#495** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  Expérience
  ```
- **#496** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  18
  ```
- **#497** (DefineEditText, var `xp`, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  200
  ```
- **#499** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  Points de vie
  ```
- **#500** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  Caractéristiques
  ```
- **#501** (DefineEditText, in `Interface::Banner::Panel::PlayerInfos`)
  ```text
  Points d'action
  ```
- **#507** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Nom du joueur
  ```
- **#508** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Expérience
  ```
- **#509** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  18
  ```
- **#510** (DefineEditText, var `xp`, in `Interface::Banner::Panel::Inventory`)
  ```text
  200
  ```
- **#512** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Points de vie
  ```
- **#513** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Caractéristiques
  ```
- **#514** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Points d'action
  ```
- **#515** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Feu
  ```
- **#520** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Air
  ```
- **#522** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Eau
  ```
- **#524** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Terre
  ```
- **#526** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Force
  ```
- **#528** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Charisme
  ```
- **#530** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Karma
  ```
- **#532** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Agilité
  ```
- **#534** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Intelligence
  ```
- **#536** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Résistances
  ```
- **#548** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Bonus
  ```
- **#550** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  Vitalité
  ```
- **#601** (DefineEditText, in `Interface::Banner::Panel::Inventory`)
  ```text
  99999
  ```
- **#636** (DefineEditText, var `name`, in `Interface::Characters::Choice`)
  ```text
  bb
  ```
- **#637** (DefineEditText, var `level`, in `Interface::Characters::Choice`)
  ```text
  bb
  ```
- **#701** (DefineEditText, in `AnimUICreateCharacterSymbol`)
  ```text
  F
  ```
- **#702** (DefineEditText, in `AnimUICreateCharacterSymbol`)
  ```text
  H
  ```
- **#716** (DefineText, in `AnimUICreateCharacterSymbol`)
  ```text
  Nom :
  ```
- **#720** (DefineText, in `AnimUICreateCharacterSymbol`)
  ```text
  réez votre personnage
  ```
- **#721** (DefineText, in `AnimUICreateCharacterSymbol`)
  ```text
  C
  ```
- **#728** (DefineEditText, in `Interface::ToolTip`)
  ```text
  <p align="left"></p>
  ```
- **#766** (DefineEditText, var `chatContent`, in `Interface::Banner::Main`)
  ```text
  <p align="left"></p>
  ```
- **#787** (DefineEditText, in `Interface::Chrono`)
  ```text
  5
  ```
- **#820** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  0
  ```
- **#821** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  Bonus
  ```
- **#823** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  cout : 9
  ```
- **#832** (DefineEditText, in `Interface::Banner::Panel::Spells::Water`)
  ```text
  Sorts d'Eau
  ```
- **#845** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  Sorts de Feu
  ```
- **#847** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  Sorts de Terre
  ```
- **#849** (DefineEditText, in `Interface::Banner::Panel::Spells::Air`)
  ```text
  Sorts d'Air
  ```
- **#851** (DefineEditText, in `Interface::Banner::Panel::Spells::Guild`)
  ```text
  Sorts de Guilde
  ```
- **#853** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  mmmm
  ```
- **#854** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  mmmm
  ```
- **#855** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  mmmm
  ```
- **#856** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  mmmm
  ```
- **#857** (DefineEditText, in `Interface::Banner::Panel::Spells`)
  ```text
  mmmm
  ```
- **#868** (DefineEditText, in `Interface::Heart`)
  ```text
  999
  ```
- **#883** (DefineEditText, in `TabPlayDofus_TeamMateWaiting`)
  ```text
  En attente ...
  ```
- **#885** (DefineEditText, in `TabPlayDofus_TeamMate`)
  ```text
  hoho
  ```
- **#889** (DefineEditText, in `TabPlayDofus_TeamMate`)
  ```text
  ?
  ```
- **#891** (DefineEditText, in `TabGameJoined_PlayerEmpty`)
  ```text
  vide
  ```
- **#904** (DefineEditText, in `boxOptions`)
  ```text
  Musiques
  ```
- **#905** (DefineEditText, in `boxOptions`)
  ```text
  Sons
  ```
- **#908** (DefineEditText, in `boxMessage`)
  ```text
  <p align="center"></p>
  ```
- **#924** (DefineEditText, in `Interface::NextTurn`)
  ```text
  Joueur suivant
  ```
- **#930** (DefineText, in `Interface::BugReport`)
  ```text
  BUGS
  ```
- **#937** (DefineEditText, in `Interface::ActionPoints`)
  ```text
  99
  ```
- **#939** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerFree`)
  ```text
  Nom
  ```
- **#940** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerFree`)
  ```text
  dead
  ```
- **#941** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerFree`)
  ```text
  Niveau 150
  ```
- **#943** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerRandom`)
  ```text
  Nom
  ```
- **#944** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerRandom`)
  ```text
  xp
  ```
- **#945** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerRandom`)
  ```text
  gold
  ```
- **#946** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerRandom`)
  ```text
  dead
  ```
- **#947** (DefineEditText, in `Interface::Banner::Panel::GameResult::PlayerRandom`)
  ```text
  Niveau 150
  ```
- **#952** (DefineEditText, in `Interface::Banner::Panel::GameResultRandom`)
  ```text
  Gagnants
  ```
- **#953** (DefineEditText, in `Interface::Banner::Panel::GameResultRandom`)
  ```text
  Perdants
  ```
- **#954** (DefineEditText, in `Interface::Banner::Panel::GameResultRandom`)
  ```text
  Résultats du combat
  ```
- **#955** (DefineEditText, in `Interface::Banner::Panel::GameResultRandom`)
  ```text
  Statistiques
  ```
- **#958** (DefineEditText, in `Interface::Banner::Panel::GameResultFree`)
  ```text
  Gagnants
  ```
- **#959** (DefineEditText, in `Interface::Banner::Panel::GameResultFree`)
  ```text
  Perdants
  ```
- **#960** (DefineEditText, in `Interface::Banner::Panel::GameResultFree`)
  ```text
  Résultats du combat
  ```
- **#961** (DefineEditText, in `Interface::Banner::Panel::GameResultFree`)
  ```text
  Statistiques
  ```
- **#963** (DefineEditText, in `Interface::NewsScrollerItem`)
  ```text
  <p align="left"><font face="Verdana" size="13" color="#ffffff"><b>Titre</b></font></p>
  ```
- **#964** (DefineEditText, in `Interface::NewsScrollerItem`)
  ```text
  <p align="left"></p>
  ```
- **#966** (DefineEditText, in `Interface::HTMLViewer`)
  ```text
  <p align="left"></p>
  ```

<!-- french-strings:end -->
