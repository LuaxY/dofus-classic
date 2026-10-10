# Flash 6 MovieClip runtime (`web/src/runtime/`)

A retained-mode display list that mimics the AVM1 MovieClip API used by the beta 5b client, drawn with
Canvas2D on a 742×550 stage at 25 fps. The game code (AKSClient, Interfaces, Sound) is ported by hand onto it;
the asset SWFs' own timeline scripts run in a small AVM1 interpreter.

All citations are relative to `decompiled/clean/` unless prefixed.

## 1. API census (game code)

Counted with a word-boundary regex over `AKSClient/`, `modules_Interfaces/`, `modules_Sound/` (`.as` files,
including the timeline/clip/button scripts of those SWFs). Columns: AKSClient / Interfaces / Sound. Some
tokens collide with game names (`clear`, `play`, `stop`, `Selection` = `BATTLEFIELD.Selection` too); the
"forms" column is what the call sites actually look like.

### MovieClip

| API | counts | forms / notes |
|---|---|---|
| `attachMovie` | 31 / 99 / 2 | `(linkage, name, depth[, initObject])`; initObject used (`{_x:366,_y:419}`, `{owner:…}`) |
| `createEmptyMovieClip` | 49 / 55 / 4 | `(name, depth)` |
| `removeMovieClip` | 32 / 50 / 1 | method form; asset scripts also `removeMovieClip(this)` |
| `swapDepths` | 4 / 6 / 0 | number and clip forms (`swapDepths(_loc1_.woman_mc)`) |
| `getDepth` | 1 / 0 / 0 | `Character.as:540` |
| `gotoAndPlay` / `gotoAndStop` | 2+14 / 93+66 | numbers and labels (`gotoAndStop(anim + "R")`, case differs from the label) |
| `play` / `stop` | 13+9 / 2+53 / 5+2 | (includes Sequencer `play/stop`) |
| `_currentframe` | 1 / 58 / 0 | read |
| `loadMovie` / `unloadMovie` | 19+0 / 18+2 | `loadMovie(url)`; one `loadMovie(file, 10)` (2nd arg ignored by Flash for clips) |
| `getBytesLoaded/Total` | 1 / 0 / 0 | only in `MovieClip.onInitFrame.as` |
| `createTextField` | 3 / 3 / 0 | `(name, depth, x, y, w, h)`, often 0×0 + `autoSize` |
| `getBounds` | 2 / 6 / 0 | `getBounds()` and `getBounds(targetClip)` |
| `hitTest` | 1 / 22 / 0 | `hitTest(x, y[, shapeFlag])` and `hitTest(clip)` (`_parent.pos1..16`) |
| `localToGlobal` / `globalToLocal` | 0 / 1+1 | point objects |
| `setMask` | 2 / 1 / 0 | `setMask(clip)` |
| `startDrag` / `stopDrag` | 1+1 / 7+4 | `startDrag(lock[, l, t, r, b])` |
| drawing | `beginFill` 6/3, `beginGradientFill` 0/3, `endFill` 6/6, `lineStyle` 5/7, `moveTo` 7/14, `lineTo` 35/42, `curveTo` 6/0, `clear` | gradient only `"linear"` with `{matrixType:"box"}` (`ank/components/ColorPicker.as:43-45`); colours also as strings `"0xFFFFCE"` |
| `attachClassMovie` | 3 / 4 / 0 | `__Packages/ank/ext/MovieClipExtensions.as` |
| `onInitFrame` | 13 / 10 / 0 | custom "loaded" hook, `AKSClient/MovieClip.onInitFrame.as` |

### Display properties

| property | AKSClient / Interfaces | | property | AKSClient / Interfaces |
|---|---|---|---|---|
| `_x` | 46 / 145 | | `_width` | 1 / 86 |
| `_y` | 62 / 158 | | `_height` | 7 / 83 |
| `_xscale` | 33 / 70 | | `_xmouse` | 1 / 9 (+2 `_level0._xmouse`) |
| `_yscale` | 24 / 68 | | `_ymouse` | 1 / 17 |
| `_rotation` | 10 / 10 | | `_name` | 5 / 9 |
| `_alpha` | 11 / 12 | | `_parent` | 133 / 565 |
| `_visible` | 23 / 119 | | `_root` / `_level0` | 2+3 / 7+4 |
| `_target` | 8 / 15 | | `_url` | 1 / 0 |
| `_quality` | 1 / 0 (`= "HIGH"`) | | `_focusrect` | 0 / 1 (`= false`) |

Not used anywhere: `_totalframes` (game code), `_framesloaded`, `_droptarget`, `_lockroot`, `tabIndex`,
`duplicateMovieClip`, `getNextHighestDepth`, `getInstanceAtDepth`, `nextFrame`, `prevFrame`, `loadMovieNum`,
`getURL` with targets other than `_blank`/`javascript:` (6 uses, UI links), `fscommand`, `tellTarget`.

### Events and input

| API | counts | notes |
|---|---|---|
| `onEnterFrame` | 24 / 48 | also used as one-frame defer (`DOFUS.onEnterFrame`) |
| `onPress` / `onRelease` / `onReleaseOutside` | 1+22+4 / 26+43+13 | plus 59+71 `on(release)` clip/button actions in Interfaces |
| `onRollOver` / `onRollOut` | 8+8 / 18+17 | |
| `onDragOver` / `onDragOut` | 0 / 14+15 | |
| `onMouseDown` / `onMouseUp` / `onMouseMove` | 0+9+0 / 2+20+6 | on clips and on `Mouse` listeners |
| `useHandCursor`, `enabled`, `trackAsMenu`, `hitArea`, `tabEnabled` | 0+1+0+0+0 / 15+14+7+2+12 | |
| `onKeyDown` / `onKeyUp` | 1+1 / 4+1 | `Key` listeners (`Dofus.KeyListener.as:9,36`) and focused clips (`boxWhisper.as:12`) |
| `Key.isDown` 59, `Key.getCode` 11, `Key.getAscii` 1, `Key.addListener` 4, `Key.removeListener` 3 | | codes: 13, 16, 17, 32, 33, 34, 38, 40, 48–58, 65–83, 96–99 |
| `Mouse.addListener` 10, `Mouse.removeListener` 9 | | `Mouse.hide/show` unused |
| `Selection.setFocus` 12 (clip, `undefined`, or variable name string), `getFocus` 3, `setSelection` 2, `addListener` 2 | | |
| `Stage.width/height` 3+3, `Stage.scaleMode` 1, `Stage.addListener` 1 | | |
| `setInterval` 3 / 14, `clearInterval` 9 / 16 | | always the `(obj, "method", ms, …args)` form except `ank.Timer` |
| `getTimer` 13 / 7, `updateAfterEvent` 0 / 1 | | |
| `AsBroadcaster.initialize` 8, `broadcastMessage` 45, `addListener` 56 | | plain-object pattern, ported as TS |

### Text, colour, sound, persistence, network

| API | counts | notes |
|---|---|---|
| `TextField.text` 86, `htmlText` 7, `html` 3, `type = "input"` 1, `password` 9, `maxChars` 2, `restrict` 2, `selectable` 6, `wordWrap` 1, `multiline` 1, `autoSize` 7 (`"center"`, `"CENTER"`, `"left"`, `true`), `border` 1, `background` 2, `textColor` 4, `scroll` 6, `maxscroll` 6, `hscroll` 4, `maxhscroll` 2, `bottomScroll` 1, `embedFonts` 10, `textWidth` 9, `textHeight` 12 | | `variable` binding is used by the SWFs (`fps`, `nomPerso`, `consoleContent`, `chatContent`, `xp`, `name`, `level` on DefineEditText) |
| `TextFormat` 7 (`font`, `size`, `color`, `bold`, `italic`, `align`, `leftMargin`, `rightMargin`), `setTextFormat` 7, `getTextFormat` 2, `setNewTextFormat` 1 | | font names are linkages `Font1/2/3` (AKSClient exports 3, 2, 1) |
| HTML used | `<b>` 6, `<font>` 3, `<u>` 2, `<a>` 2, `<p align>` 1, `<br>` 1 | `out.htmlText += line` (`Dofus.Chat.as:99`) |
| `new Color` 31, `setRGB` 14, `setTransform` 20 | | `getRGB`, `getTransform` unused |
| `new Sound` 2, `attachSound` 1, `start`, `stop`, `setVolume`, `onSoundComplete`, `loadSound` (music) | `modules_Sound/Dofus.Sound.Manager.as:131-205` | |
| `SharedObject.getLocal` 6 (`"DofusSO"`) | | `.data.*`, no `flush` call |
| `XMLSocket` 1, `LoadVars` 1, `XML` 2, `System.security.allowDomain` 4+2 | | network: not the runtime's job (§6) |
| `Object.registerClass` 46 / 102 / 2, `ASSetPropFlags` 25, `addProperty` 54, `__proto__` 7 | | AS1 class pattern (`docs/logic/README.md` §4) |
| `eval` 9 / 23 | | AS2 class lookup `eval("ank.SWFLoader")` and `eval(sel)` paths |

### Prototype extensions (AKSClient), provided by the runtime

| Extension | Source | In runtime |
|---|---|---|
| `MovieClip.prototype.end(sequencer)` | `AKSClient/MovieClip.end.as` | `MovieClip.end` |
| `getActionClip()`, `getObjectClip()`, `getRootAnimClip()` | `AKSClient/MovieClip.get*Clip.as` | same names |
| `playFirstChildren()`, `playAllClip()`, `stopAllClip()` | `AKSClient/MovieClip.play*.as`, `.stopAllClip.as` | same names (literal `for…in` + `__proto__ == MovieClip.prototype` test) |
| `getAllCurrentFrames()`, `setAllCurrentFrames(o, stop)` | `AKSClient/MovieClip.*AllCurrentFrames.as` | same names |
| `drawArc(x, y, r, arc, start, yr)` | `AKSClient/MovieClip.drawArc.as` | same name |
| `onInitFrame` (setter property) | `AKSClient/MovieClip.onInitFrame.as` | accessor on `MovieClip.prototype`, literal port (watcher clip under `_level0._onInitFrameClips_`) |
| `attachClassMovie(ctor, name, depth)` | `__Packages/ank/ext/MovieClipExtensions.as` | same name (TS class instead of AS1 function) |
| `TextField.prototype.setText`, `setHtmlText`, `initChat` | `AKSClient/TextField.*.as` | same names |
| `String.prototype.replace`, `getAddLeftChar`, `Array.prototype.indexOf`, `Object.prototype.copyValues`, `Math.getSlope` | | **not** runtime: pure logic, ported in `web/src/core/` |

## 2. Asset timeline scripts

All 483 non-code SWFs (everything except `AKSClient.swf`, `modules/Interfaces.swf`, `modules/Sound.swf`,
`DOFUS.swf`): **1694 DoAction** (583 distinct bytecodes), **1195 clip actions** (142 distinct; events only
`load` ×1064 and `enterFrame` ×131), **0 button actions**, 0 DoInitAction, 8 StartSound (sprites 1003/1004).
Readable bodies: `decompiled/clean/clips/<path>.swf/…` (2889 files; JPEXS naming
`DefineSprite_<id>[_<linkage>]/frame_<n>/DoAction.as`, `…/PlaceObject2_<charId>_<depth>/CLIPACTIONRECORD onClipEvent(<event>).as`).

Distinct bodies: 727 exact, **514 after replacing string/number literals**. The head of the distribution:

| × | body |
|---|---|
| 792 | `onClipEvent(load){ if(random(N)==N) gotoAndStop(random(_totalframes-N)+N); }` (ground tiles) |
| 300 | `SOMA.playSound("…")` |
| 202 | `stop()` / `this.stop()` |
| 188 | `this.end()` |
| 180 | `this.getActionClip().wait()` |
| 627 calls | `cColors.applyColor(<child instance>, zone)` — note `cColors` = `CCOLORS` (case-insensitive) and the first argument is a **variable lookup** of a named child |
| 64 | `onClipEvent(load){ _alpha = N + N*Math.random(); }` |
| 36 | `WEAPONS.applyWeapon(this, "R"|"L")` |
| 32+9+18+7+5 | `_parent.removeMovieClip()`, `this.removeMovieClip()`, `_parent._parent.removeMovieClip()`, `removeMovieClip(this)` (+`stop()`) |

The tail (≈450 patterns, mostly spells) is hand-written particle code: `while` loops of
`attachMovie("fumee", "fumee"+c, c)`, `eval("this.plumes"+c).vx = …`, `onClipEvent(enterFrame)` physics with
`Math.cos/sin/random`, `_root.i` shared state, `this.onEnterFrame = function(){…}` closures, reads of
`_parent._parent.level`/`angle`/`rotate._rotation` set by the game. `clips/ground.swf`, `clips/objects.swf`
and `clips/circle.swf` define the **functions the game calls** (`Ground.attach(symbol, name, depth)`,
`clear()`, `circle.animate(bool)`, `circle.setColor(rgb)`) in their frame 1. Typos rely on SWF6
case-insensitivity: `MAth.random`, `math.`, `_X`/`_Y`, `cArtyslot_R_epaule`.

AVM1 opcodes present (weighted by occurrence): Push 12586, GetVariable 4219, CallMethod 2185,
RandomNumber 1883, Pop, Add2, GetProperty, Not, Subtract, If, GotoFrame2, Equals2, SetVariable, SetProperty,
Multiply, GetMember, ConstantPool, Stop, SetMember, Less2, Divide, Increment, StoreRegister, Greater,
GotoFrame, Jump, Play, DefineFunction 35, BitAnd, RemoveSprite, DefineLocal, Modulo, GoToLabel, Return,
DefineFunction2 2 (`clips/guilds/artwork/mini/80.swf`), NewObject 1 (`new Color` in `circle.swf`), Trace 1.
**37 opcodes**; no CallFunction, InitObject, InitArray, With, SetTarget, Enumerate, Try.

**Approach: (c) a minimal AVM1 interpreter** (`web/src/runtime/avm1.ts`, the 37 opcodes plus the trivially
adjacent ones). (a) an action list cannot express the `while`/physics/closure tail, and the game calls
functions defined by asset bytecode; (b) would mean hand-porting ~500 scripts. The interpreter is smaller than
either and runs every asset script unchanged. AVM1 functions become real JS closures, so TS game code calls
`Ground.attach(…)` or `circle.animate(true)` like any method. The interpreter never runs the bytecode of the
four code SWFs; their scripts reach the runtime through `Runtime.scriptHook` (§4.6).

## 3. Semantics implemented (and the evidence that needs them)

1. **SWF6 case-insensitive names** for variables, members, globals and frame labels
   (`gotoAndStop(anim + "R")` vs label `StaticR`, `Character.as:742`; `cColors`, `MAth`). The interpreter
   resolves members exactly first, then case-insensitively. TS code is case-sensitive as usual.
2. **SWF6 coercions** in `Add2`/`Less2`/`Greater`/`Increment`/arithmetic: `undefined → 0` / `""`
   (`_parent._parent.level < 3` with no level → `0 < 3`).
3. **Script-transformed instances ignore later timeline transforms**: once script sets `_x`, `_y`,
   `_xscale`, `_yscale`, `_rotation`, `_width`, `_height`, `_alpha` or a `Color`, PlaceObject moves no longer
   change the instance's matrix/colour transform. Character sprites recolour children of one-frame wrapper
   sprites (`cColors.applyColor(cArtySlot_R_cape02, 2)`) while the outer animation moves the wrapper.
4. `_x`/`_y` are stored in twips (truncated, as Flash), `_alpha` in 8.8 fixed point; `_xscale`/`_yscale`/
   `_rotation` are cached so `_xscale = -100` reads back as −100 (direction flip, `Character.as:745`).
5. **Timeline**: frames are deltas; `goto` forward merges the skipped frames' ops (instances created and
   removed in between are never constructed); backward goto removes timeline instances placed after the target
   frame and rebuilds, keeping instances whose depth and character are unchanged; looping = backward goto to
   frame 1. `gotoAndStop(current)` is a no-op; single-frame clips never re-run frame 1. Labels match
   case-insensitively; a string that is not a label but is numeric is a frame number. Out-of-range frames
   clamp to the last frame.
6. **Tick order** (25 fps): pre-order walk of the display list; for each clip that existed at the start of the
   tick, queue its `enterFrame` (clip actions, then `onEnterFrame`), then, if playing, advance one frame:
   apply ops (newly placed children run their own frame 1 immediately: ops, queue frame actions, queue `load`),
   then queue the frame's DoActions. Then the action queue runs to empty. Actions of a clip removed before its
   turn are skipped; a running script continues after removing its own clip (903 `rotate` frame 25:
   `this.end(); this._parent.removeMovieClip();`). Approximation: Flash's exact cross-clip order is
   undocumented; the converter does not keep the interleaving of PlaceObject and DoAction tags, the runtime
   assumes DoAction after the frame's display tags (Flash IDE output).
7. **attachMovie / registered classes**: create the instance at the depth (replacing an occupant), copy
   initObject, build frame 1 (children fully constructed, recursively), then run the constructor
   synchronously (`Interface.WindowBox.as:17-19` reads `window_mc._width` right after attaching). Frame 1
   actions and `load`/`onLoad` are queued and run after the calling script. Timeline-placed instances of a
   registered class: `initialize` clip actions (component parameters, 124 in Interfaces) run before the
   constructor.
8. **loadMovie** is asynchronous (fetch of the converted JSON). When the SWF arrives, at the start of the next
   tick: the clip keeps its identity, depth, name and transform, but its children, dynamic properties and event
   handlers are wiped (that is why `onInitFrame` re-copies `data`, `MovieClip.onInitFrame.as:15`), its library
   becomes the loaded SWF and it plays from frame 1. `getBytesTotal()` is 4 for an empty clip and while a load is
   pending, then a placeholder > 4, `getBytesLoaded()` 0 then equal, so the literal `onInitFrame` port fires one frame
   after the load. A library symbol (attached or timeline-placed) is complete at once, as in Flash: `onInitFrame` set on
   it fires on the next frame (the battlefield Character positions itself that way, `Events.Battlefield.Map.as:57-61`).
9. `_root` / `_level0` is the stage root for every SWF (SWF6: no `_lockroot`), e.g. spells sharing `_root.i`.
10. Calling a method on `undefined` (or a missing method) is a silent no-op in scripts (tests run without
    `CCOLORS`/`WEAPONS`/`SOMA`).
11. Linkage resolution is per SWF: `attachMovie` looks in the library of the SWF the clip belongs to
    (`exports`, then `imports` by name), as Flash does (`docs/logic/characters.md` §5: a class sprite can only
    attach the one weapon it imports). Registered classes are global by linkage name.
12. **Duplicate linkage names** (`clips/ground.swf` `503` → 70 and 370; `clips/objects.swf` `72` → 11 and 1990;
    Interfaces `ButtonClose`, `BtnRefresh`, `ScrollMover`, `btVideSymbol`, `btPastilleSymbol`,
    `ButtonInventory`, `ButtonSpells`): the converter keeps the **last** ExportAssets (map overwrite), so
    `attachMovie` resolves to the last-exported character. What Flash 6 did is UNKNOWN — not in code. (The media
    tooling's "first wins" is the other direction, id → file name.)
13. **Children sharing a name**: a name lookup returns the **first** child in depth order, not the newest
    (found by the playtest: the AS reuses the existing character sprite after placement; returning the newest
    left a ghost sprite on the start cell). Behaviour taken from Ruffle, no Flash Player available to confirm.
14. **Unnamed timeline instances are named `instance<N>`** (global counter), so scripts that enumerate a clip's
    children with `for..in` find them (`playFirstChildren`/animation restart on a second close combat stalled
    for the 10 s sequencer timeout without it). Behaviour taken from Ruffle.

## 4. API surface

Files: `web/src/runtime/object.ts` (DisplayObject), `movieclip.ts` (MovieClip, Button, Graphic, registerClass),
`text.ts` (TextField, TextFormat), `player.ts` (Player and Flash globals; re-exports everything),
`avm1.ts` (interpreter). Import from `web/src/runtime/player.ts`.

Every display object keeps its runtime state in a non-enumerable `$`; everything else on it is AS-visible.
**Runtime internals are `$`-prefixed** (`$draw`, `$bounds`, `$hitLocal`, `$fills`, `$world`, `$setSize`, `$remove`,
`$unload`, `$replaceContent`, `$goto`, `$advance`, `$fire`, `$setState`, `$layout`, …), so every AS name (`draw`,
`setSize`, `remove`, `unload`, `build`, `setState`, `dec`…, all used by AS classes) is free for game subclasses: an AS
method shadows nothing the runtime calls.
`MovieClip`, `TextField`, `Button` carry an index signature `[key: string]: unknown` (AS1 dynamic properties:
`clip._ACTION = this`, `clip.data`, named children `clip.circle`). Subclass and narrow in TS.

### 4.1 Player

```ts
new Player({ loader: SwfLoader, createCanvas?, scriptHook?: (key) => fn | undefined, audio?: AudioBackend })
player.root: MovieClip                    // _root / _level0
player.load(src): Promise<LoadedSwf>      // "clips/sprites/10.swf" → converted JSON + bitmaps + imports
player.start(canvas)                      // browser: rAF clock, mouse/keyboard, rendering, DOM text editor
player.advance(ms) / player.tick()        // headless clock: intervals + 25 fps ticks / exactly one frame
player.runQueue()                         // run queued frame actions now (end of an external event)
player.render(ctx)                        // draw the 742×550 stage (ctx may be scaled)
player.mouseMove(x, y) / mouseDown() / mouseUp() / keyDown(code, ascii) / keyUp(code, ascii)   // input injection
player.target(): MovieClip | Button | undefined                                                 // mouse target
player.scriptHook, player.audio, player.ticks, player.time, player.focus
```

### 4.2 MovieClip

```ts
attachMovie(linkage, name, depth, initObject?): MovieClip | undefined   // library of the clip's SWF; registered class
createEmptyMovieClip(name, depth): MovieClip
createTextField(name, depth, x, y, w, h): TextField
attachClassMovie(Ctor, name, depth): T                                  // ank.ext.MovieClipExtensions
removeMovieClip()                                                       // only 0 ≤ depth < 1048576
swapDepths(depth | sibling), getDepth()
loadMovie(url), unloadMovie(), getBytesLoaded(), getBytesTotal()
gotoAndPlay(frame | label), gotoAndStop(frame | label), play(), stop(), nextFrame(), prevFrame()
_currentframe, _totalframes, _framesloaded                              // read-only
setMask(clip | null), startDrag(lock?, l?, t?, r?, b?), stopDrag()
clear(), lineStyle(w?, rgb?, alpha?), beginFill(rgb?, alpha?), beginGradientFill("linear"|"radial", colors, alphas, ratios, {matrixType:"box",x,y,w,h,r}),
endFill(), moveTo(x, y), lineTo(x, y), curveTo(cx, cy, x, y)
// handlers (assign functions): onEnterFrame, onLoad, onUnload, onPress, onRelease, onReleaseOutside, onRollOver,
// onRollOut, onDragOver, onDragOut, onMouseDown, onMouseUp, onMouseMove, onKeyDown, onKeyUp; useHandCursor,
// enabled, trackAsMenu, hitArea
// AKSClient extensions: end(seq?), getActionClip(), getObjectClip(), getRootAnimClip(), playFirstChildren(),
// playAllClip(), stopAllClip(), getAllCurrentFrames(), setAllCurrentFrames(o, stop?), drawArc(x, y, r, arc, start, yr?),
// onInitFrame (setter)
```

### 4.3 Every display object (MovieClip, Button, TextField)

```ts
_x, _y, _xscale, _yscale, _rotation, _alpha, _visible, _width, _height, _name     // read/write
_parent, _root, _target, _url, _xmouse, _ymouse                                    // read-only
getBounds(target?): {xMin, xMax, yMin, yMax}, hitTest(x, y, shapeFlag?) | hitTest(obj),
localToGlobal(pt), globalToLocal(pt), getDepth(), swapDepths(d), toString() → "_level0.a.b"
```

### 4.4 TextField / TextFormat

```ts
text, htmlText, html, length, variable, type ("dynamic" | "input"), wordWrap, multiline, selectable, password,
maxChars, restrict, border, borderColor, background, backgroundColor, embedFonts, autoSize ("none"|"left"|"center"|"right"|true),
textColor, textWidth, textHeight, scroll, maxscroll, bottomScroll, hscroll, maxhscroll
getTextFormat(), setTextFormat(fmt | index, fmt | begin, end, fmt), getNewTextFormat(), setNewTextFormat(fmt), removeTextField()
onChanged, onSetFocus, onKillFocus, onScroller
addListener(o), removeListener(o)   // o gets onChanged / onScroller with the field, after the field itself
setText(text, font = "Font2", color?, size?), setHtmlText(html, font = "Font2"), initChat()   // AKSClient extensions
new TextFormat(font?, size?, color?, bold?, italic?, underline?, url?, target?, align?, leftMargin?, rightMargin?, indent?, leading?)
```

HTML subset (Flash 6): `<p align>`, `<br>`, `<font face size color>`, `<b>`, `<i>`, `<u>`, `<a href>` (kept as
format, not clickable), `<li>`, `<textformat leftmargin rightmargin indent leading>`, entities. `htmlText` returns
the string last assigned (Flash would return its normalised HTML; appending with `+=` works the same).
Assigning `text` uses the new-text format (that is why `setText` re-applies the format afterwards).

**Rendering choice:** canvas `fillText` with the original font names, which `web/public/assets/media/fonts.css`
maps to the TTF/WOFF extracted from the SWFs (`Font1/2/3` linkages and DefineEditText font ids resolve to
Verdana / Verdana bold / bitMini6; device fonts fall back to `sans-serif`/`serif`). Layout: 2 px gutter, greedy
word wrap with `measureText`, line height = font ascent + descent (+ leading) from the DefineFont2 layout data.
**Input fields** use a DOM overlay: when an input field gets focus (click, `Selection.setFocus`) the player puts an
`<input>`/`<textarea>` exactly over it (same font, colour, maxChars, password, restrict), hides the canvas text,
and writes `text`/`variable`/`onChanged` back on every input event. This gives IME, clipboard, caret and
selection for free; the canvas still renders the field whenever it is not being edited. Key events keep reaching
`Key` listeners (the chat's Enter handling in `Dofus.KeyListener.as`).

`variable` binding is two-way: after every tick the field shows the parent-relative variable (an undefined variable
is initialised from the field text), and every `text`/`htmlText` assignment or edit writes the variable at once
(`DefineButton2_711/…on(release).as:23` reads `this.nomPerso`; `Dofus.Chat.as:99` `txtChat.htmlText += …` with
`chatContent` bound). `onChanged` fires for user edits only.

### 4.5 Globals

```ts
_global                                    // AS _global; the port sets AKS, DATACENTER, KERNEL, CCOLORS, WEAPONS, SOMA… here
registerClass(linkage, Ctor | null)        // Object.registerClass
setInterval(fn, ms, ...args) | setInterval(obj, "method", ms, ...args), clearInterval(id), getTimer()   // runtime clock
Key.isDown(code), Key.getCode(), Key.getAscii(), Key.addListener(o), Key.removeListener(o)
Mouse.addListener(o), Mouse.removeListener(o)   // Key/Mouse/Selection listeners that are removed clips are skipped
Stage.width (742), Stage.height (550), Stage.scaleMode, Stage.addListener(o)      // fixed stage, onResize never fires
Selection.setFocus(obj | path | variableName | null), Selection.getFocus(), Selection.setSelection(b, e), Selection.addListener(o)
SharedObject.getLocal(name) → { data, flush() }   // localStorage "SharedObject:<name>", flushed on page hide
new Color(clip | path): setRGB(rgb), getRGB(), setTransform({ra,rb,ga,gb,ba,bb,aa,ab}), getTransform()
new Sound(target?): attachSound(linkage), loadSound(url), start(offsetSec?, loops?), stop(), setVolume(v), getVolume(), onSoundComplete, onLoad
browserAudio(base = "/assets/media/"): AudioBackend    // MP3s from media/sounds.json
```

Asset scripts see `Math`, `Object`, `Array`, `String`, `Number`, `Boolean`, `parseInt`, `parseFloat`, `isNaN`,
`MovieClip`, `TextField`, `TextFormat`, `Color`, `Sound`, `Key`, `Mouse`, `Stage`, `Selection`, `SharedObject`,
`System.security.allowDomain` (no-op), `setInterval`, `clearInterval`, `getTimer`, `updateAfterEvent` (no-op),
plus whatever the port puts on `_global`.

### 4.6 How the game port plugs in

**Boot.** `const p = new Player({ loader: browserLoader(), audio: browserAudio(), scriptHook })`,
`p.root.$replaceContent(await p.load("AKSClient.swf"))` (the root's library becomes AKSClient's: `Font1/2/3`,
`Dofus::BattleField`, `clipOver`…), then run the ported `#initclip` code (DoInitAction is never executed, the
port calls its classes' registration and `Kernel.Init` itself), then `p.start(canvas)`.
`Kernel.init`'s `DOFUS.createEmptyMovieClip("Interfaces", 3).loadMovie("modules/Interfaces.swf")` works as is.

**Classes.** The AS1 pattern `Class_X = function(){ this.init(); }; Class_X.prototype = new MovieClip();
Object.registerClass("Dofus::X", Class_X)` becomes:

```ts
// AKSClient/Dofus.BattleField.Map.as
export class BattleFieldMap extends MovieClip {
  declare container: MovieClip;            // `declare`, not an initialiser: initializers run after super() and
  constructor() {                          // would overwrite initObject values
    super();                               // frame 1 is built and initObject copied here
    this.init();                           // = the AS1 constructor body
  }
  init() { /* … */ }
}
registerClass("Dofus::BattleField::Map", BattleFieldMap);
// then, as in the AS: BATTLEFIELD.attachMovie("Dofus::BattleField::Map", "Map", 3) → a BattleFieldMap
```

- Constructors take no arguments (the runtime constructs with a pending placement, like Flash).
- Prototype defaults (`Class_X.prototype.onAddUsedSpell = null`) go on the prototype, not as class fields.
- `onLoad()` defined on the class runs once, after the first frame's actions (queued).
- Plain objects registered with `Object.registerClass` (`Dofus::Client`, DataCenter classes) are just TS classes.
- `attachClassMovie(Ctor, name, depth)` and `sprite.__proto__ = MovieClip.prototype` → `Object.setPrototypeOf`.
- Prototype extensions of `MovieClip`/`TextField` from AKSClient are already in the runtime (§1); new ones can be
  added with `declare module` + assignment to `MovieClip.prototype`.

**Timeline scripts of the code SWFs** (`modules_Interfaces/DefineSprite_*/frame_*/DoAction.as`,
`…/PlaceObject2_<char>_<depth>/CLIPACTIONRECORD on(<event>).as`, `DefineButton2_<id>/BUTTONCONDACTION on(<event>).as`)
are ported as TS functions and returned by `scriptHook(key)`; the function runs with `this` = the timeline
(frame actions, button actions) or the clip (clip actions). Keys mirror the decompiled paths:

| script | key | example |
|---|---|---|
| frame actions (all DoActions of the frame) | `<src>#<spriteId, 0 = root>@<frame>` | `modules/Interfaces.swf#0@1` ↔ `modules_Interfaces/frame_1/DoAction.as` |
| clip action | `<src>#<parentSpriteId>@<frame>:<swfDepth>:<event>` | `modules/Interfaces.swf#430@1:13:initialize` ↔ `DefineSprite_430_…/frame_1/PlaceObject2_27_Ank.Dofus.PushButton_13/CLIPACTIONRECORD on(initialize).as` |
| button action | `<src>#btn<buttonId>:<event>` | `modules/Interfaces.swf#btn711:release` |

Events: `load`, `enterFrame`, `unload`, `initialize`, `mouseDown/Up/Move`, `keyDown/Up`, `press`, `release`,
`releaseOutside`, `rollOver`, `rollOut`, `dragOver`, `dragOut`. The hook is consulted for every SWF first, so it can
also override an asset script. Unported code-SWF scripts are skipped.

**Sound.** `SOMA` (`modules_Sound/Dofus.Sound.Manager.as`) ports directly onto `Sound`; `browserAudio()` resolves
`attachSound(name)` through `media/sounds.json` and plays the MP3 (loops, volume, `onSoundComplete`). Timeline
`StartSound` (sprites 1003/1004) is routed by linkage or `<swf>#<id>` key. Missing sounds (`arty_105`,
`lakam_401/402/403/407`, music) play nothing; `loadSound` reports `onLoad(false)` when the file is absent.

## 5. Deliberately not supported

| API | why |
|---|---|
| `duplicateMovieClip`, `getNextHighestDepth`, `getInstanceAtDepth`, `loadMovieNum`, `_droptarget`, `_lockroot`, `tabIndex` | 0 uses (game code and asset bytecode: no `CloneSprite`) |
| `XMLSocket`, `LoadVars`, `XML` | network, not display: `web/src/core/connection.ts`; `getuser.php`/news are missing anyway |
| `getURL`, `fscommand`, `System.security.allowDomain` | browser navigation is the port's call; `allowDomain` is a no-op |
| `Object.watch` (`Ank.Dofus.ScrollBar.as:344`, ported with own text/htmlText accessors), `addProperty`, `ASSetPropFlags`, `AsBroadcaster` | language/library features: port with TS accessors/arrays |
| movie clips as buttons via `_up`/`_over`/`_down` labels | no such labels in any SWF |
| `on(keyPress)` button events, `Mouse.hide/show`, `onMouseWheel`, tab focus | 0 uses |
| `Stage.onResize`, `_quality`, `_focusrect` | fixed `noScale` stage; plain properties |
| DoInitAction bytecode | it is the game code (ported by hand) |
| `<img>` in htmlText, clickable `<a href>` / `asfunction:` | Flash 7 / unused |

## 6. Verification

`bun test web/src/runtime` (30 tests): `runtime.test.ts` on synthetic SWFs — frame-1 and per-tick script order,
case-insensitive labels, forward/backward goto and instance identity, looping, attachMovie depth order /
replacement / swapDepths / removeMovieClip depth rule, registerClass construction order, `for…in` contents, shape
vs bounding-box hitTest, mouse event sequences (rollOver/press/release/dragOut/releaseOutside, topmost target,
parent capture, `enabled`), DefineButton2 states and hit area, Color/`_alpha`/script-transformed instances,
geometry, drawing API with pixel checks, HTML parsing, wrap/scroll/`initChat`/autoSize/`setText`/variable binding,
the interpreter (coercions, case, paths, closures, GotoFrame2), `ground.attach` and `circle.setColor/animate` from
real bytecode, loadMovie + `onInitFrame` (also reloading into a loaded clip), intervals, SharedObject. `assets.test.ts`: 10.swf CastR (`end()` on cast
frame 20, `wait()` → StaticR on frame 33), the walk loop, spell 903 (`end()` and self-removal on frame 25), pixel
comparison with the JPEXS references (`scripts/assets-media/compare.ts`, 11 frames, bad-pixel ratio 0.000), a sweep
that loads all 483 asset SWFs, attaches up to 40 exports each and runs 60 frames with zero errors (42 588 script
executions, no unsupported opcode), a full-stage render, and AKSClient as root library + an Interfaces symbol
(buttons, edit texts, masks) rendered without its scripts. `bun test scripts/assets/` stays green.
(`scripts/assets-media/compare.test.ts` fails here with `posix_spawn EBADF` when it spawns its CLI — a sandbox
issue in the media agent's test, independent of the runtime.)

Previews (`web/public/assets/runtime-preview/`): `character-10-castR.png`, `character-10-walkR.png`,
`spell-903.png`, `stage.png`, `interfaces-multiplayer.png`, and `ref-*.png` (the candidates compared with `decompiled/reference/`).
Browser demo: `web/runtime-demo.html` (`web/src/runtime-demo.ts`).

## 7. Known gaps

- Cross-clip script order within a frame follows Ruffle-like rules (§3.6); Flash's exact order is undocumented.
- `_width`/`_height` setters are exact only for unrotated objects; `getBounds` ignores masks; hairline/stroke
  hit-testing is bounding-box only for strokes (fills are exact).
- Bitmaps receive only the alpha of colour transforms (as in the static renderer).
- Text metrics come from the browser's font engine (2004 Windows rendering differs); no kerning, no justify.
- `getBytesTotal()` of a loaded SWF or a library symbol is a placeholder (> 4), not the original byte size.
- **Soft clip references are not implemented.** In Flash 6 a reference to a clip is resolved by target path: once the
  clip is removed it reads as `undefined`, and a new clip created at the same path is found through the old
  reference. The game holds plain JS references, so re-resolving them would mean wrapping every display object in a
  Proxy (cost on every member access, including the renderer's `$` reads; `===` and `instanceof` stop meaning the same
  thing). What the runtime does instead: a removed clip keeps its members, and the runtime ignores it as a listener
  (Key, Mouse, Selection, TextField: `call` in object.ts), as a focus target and in the action queue. Game code that
  must see the Flash behaviour reads the path again (`BattlefieldPointer.container` getter: `Container.clear()`
  recreates `Container.Pointer`) or tests `$.removed` where a stale reference is read as `undefined`
  (`Interface.setSpellCursor`, `Character` previous-step alpha, `ank.Timer`, CCOLORS/WEAPONS).
- `registerClass` takes MovieClip subclasses only. AS1 classes whose prototype is a plain object
  (`Dofus.BattleField.Spells.as`, `…Effects.as`: `prototype = new Object()`) are ported as MovieClip subclasses: the
  runtime needs its `$` internals on the instance's prototype chain, so a faithful version would split MovieClip into a
  runtime core and the AS-visible API. The only visible difference is that MovieClip methods exist on those two
  controllers; with the `$` prefix none of their AS names collides any more (`Effects.unload`).
- Button `outDown` shows the up state; `trackAsMenu` is handled for release/dragOver/dragOut only.
- Sound volume is per `Sound` object (Flash scopes it to the target clip); no pan, no `position`/`duration`.
- `onKeyDown`/`onKeyUp` on a MovieClip fire only while it has focus (`Selection.setFocus`); whether Flash 6 also
  fires them without focus (`modules_Interfaces/boxWhisper.as:12`, `Ank.Dofus.ComboBox.as:505`) is UNKNOWN.
- Mouse targeting walks the whole tree on every mouse move (fine for the battlefield's ~600 cells; index it if it
  ever shows in profiles).
