# Wave 2 — porting the game code (read with `docs/BRIEF.md`)

Wave 1 produced: protocol docs (`docs/protocol/`), logic docs (`docs/logic/`), the asset converter
(`docs/assets-format.md`, output in `web/public/assets/swf/`), media (`docs/assets-media.md`), the pure core
(`web/src/core/`), and the Flash 6 MovieClip runtime (`docs/runtime.md` — **read §4.6 "How the game port plugs
in"**). Wave 2 ports the game code itself onto the runtime, almost line by line.

## Contract between agents

- **Names are fixed by the AS.** Keep original class, method, field and instance names (TS-cased only when Flash 6
  case-insensitivity forces a choice — pick the spelling used most and note the variants). That way every agent
  can code against a sibling's API by reading the AS, before the sibling has written it.
- **`docs/port-surface.md`** (generated) lists every `INTERFACE.*`, `BATTLEFIELD.*`, `KERNEL.*`, `AKS.*`,
  `SOMA.*`, `CHAT.*`, `CCOLORS.*`, `WEAPONS.*`, `DATACENTER.*`, `DOFUS.*` member used anywhere, with call sites.
  That is the cross-agent API.
- **Globals:** `web/src/game/globals.ts` exports `G`, the runtime's `_global` object typed as `interface Globals`.
  The owner of a singleton adds its type from its own module and assigns it where the AS does:
  ```ts
  declare module "../globals.ts" { interface Globals { BATTLEFIELD: BattleField } }
  ```
  Use `G.X` for AS `_global.X` / bare `X` globals. Asset scripts executed by the runtime's AVM1 interpreter read the
  same object.
- **Skeleton first.** Within your first few steps, create your singleton class(es) with **every member listed for
  them in `docs/port-surface.md`** — signatures from the AS, bodies `throw new Error("not ported: <name>")` — and
  register the `Globals` type. Then fill bodies in. Consumers import types from the owner's path. If you need a
  member a sibling's class lacks, do **not** stub it in your tree: use it as the AS does and list it in your report.
- **Do not re-port wave-1 code.** Already ported in `web/src/core/` (import it): `Crypt`, `Compressor`,
  `PathFinding`, every `Dofus.DataCenter*` model (+ `Copie de Dofus.DataCenter.Spell`), `PatternDecoder`,
  `DofusDataProviderSymbol`, the data half of `CharactersManager` and `EffectsManager`, `dofus/Constants`, the
  `Console` command parser, and **`Dofus.Client.DataProcessor` + every outgoing message** (`protocol.ts`:
  `parseServerMessage` → typed events, builders → strings; `connection.ts`). The MovieClip / TextField / String
  prototype extensions (`MovieClip.*.as`, `TextField.*.as`, `ank/ext/*`) are already in the runtime — verify, don't redo.
- **Provenance** of any reconstructed string or content: tag `beta` (baked in a beta SWF), `retro_fr` (dofedex,
  post-beta), or `authored` (written by us). Never present `retro_fr`/`authored` as beta.

## Gates

- Your own tests stay green throughout: `bun test web/src/game/<your dir>`.
- Typecheck gate **for your files only** while siblings are mid-flight:
  `bun run typecheck 2>&1 | grep 'web/src/game/<your dir>'` must print nothing. The orchestrator runs the full gate
  at the end of the wave.
- Headless verification with `@napi-rs/canvas` like `web/src/runtime/assets.test.ts`; write PNGs under
  `web/public/assets/port-preview/<your dir>/` and LOOK at them (Read tool).

## Ownership (every code file has exactly one owner)

Paths are relative to `decompiled/clean/`. Scripts inside a symbol's folder (`DefineSprite_<id>_<Name>/…`,
`DefineButton2_*`, `PlaceObject2_*/CLIPACTIONRECORD …`) belong to the owner of that symbol; unnamed
`DefineSprite_<id>/` folders and unassigned `DefineButton2_*` go to **B2** unless they are component internals
(B1). Timeline scripts of code SWFs are supplied through the runtime's `scriptHook` (key format in
`docs/runtime.md` §4.6) — each owner exports its hook entries from `<dir>/scripts.ts`; C merges them.

### A — battlefield → `web/src/game/battlefield/`
`AKSClient/Dofus.BattleField*.as` (12 files), `Dofus.Cell.as`, `DefineSprite_15_Mc_Selection`,
`DefineSprite_31_MC_Cell_Grid`, `DefineSprite_48_MC_Cell_Full`, `DefineSprite_50_Dofus.Cell`,
`Dofus.CharactersColors.as` (CCOLORS), `Dofus.CharactersWeapons.as` (WEAPONS), `Dofus.CharactersManager.as`
(visual half), `Events.Battlefield.Interaction.as`, `Events.Battlefield.Map.as`, `DialogBubbleSymbol.as`,
`SmileyOverHead.as` + `__Packages/dofus/graphics/battlefield/character/SmileyOverHead.as`, `Math.getSlope.as`.
Also: move cell occupancy (`playerOnID`, `calculateTacleZone` trigger) out of the character display code into a
data-side helper, as flagged by the core port.

### B1 — UI shell + components → `web/src/game/ui/`
`modules_Interfaces/frame_1/DoAction.as` (INTERFACE creation), `Dofus.Interface.as` (INTERFACE: layers,
`draw*Interface`, `msgBox`, tooltips, cursor, `clear`…), `Interface.Window`, `Interface.WindowBox`,
`Ank.Dofus.{ComboBox,ListBox,PushButton,ScrollBar}`, `Com.GenericButton`, `__Packages/ank/components/*`,
`ank.components.ColorPicker`, `PalletsColorSelectorSymbol`, `ColorDrip`, the Flash MX component framework
(`F*Symbol`, `DataProviderSymbol`, `FHighlightSymbol`, `FBoundingBoxSymbol`, `fpb_states`, `frb_states`,
`ScrollThumb`, `UpArrow`, `DownArrow`, `DownArrowComboBox` — **port only members Dofus code calls, cite call
sites**), `Interface.{CheckBox,RadioButton,ToolTip,Waiting,Text,Text.Clip,Cursor,ProgressBar,ButtonMute,VolumeGauge,VolumeGaugeMarker}`,
`box{Menu,Message,Options,Whisper,YesNo}`, `FilterButton1–5`, `fpsDetectorSymbol`, `__Packages/dofus/Translator`,
`__Packages/ank/*` duplicates in Interfaces (reuse AKSClient/runtime versions).

### B2 — UI screens → `web/src/game/ui/screens/`
`DoInitAction.as` (`Interface::CreateCharacter`), `UIStartMenu` (+ `__Packages/dofus/graphics/gui/UIStartMenu`),
`dofus.graphics.gui.UICreateCharacter` (+ package version), `AnimUICreateCharacterSymbol`, `AnimSelectionSymbol`,
`SexChoice`, `SexChoiceMan`, `SpellViewerCreate`, `Tab*` (all), `Interface.Characters`, `Interface.Characters.Choice`,
`Interface.MultiPlayer`, `Interface.MultiPlayer.Tabs`, `Interface.Multiplayer.Help`, `Interface.Banner*` (all
panels), `Interface.Timeline*`, `Interface.TimelineItem`, `SpellBar`, `Interface.ButtonSpell*`,
`__Packages/dofus/graphics/gui/common/*` and their top-level twins (`InventoryViewer`, `InventoryScroller`,
`InventoryItemContainer`, `EquipementItemContainer`, `DropItemContainer`, `ObjectInfosViewer`, `SmileyBar`,
`GuildArtworkBig*`, `GuildSpellBar`, `SpellInfosViewer`, `ItemContainer`), `Interface.{Chrono,ChronoVerti,TeamWatcher,TeamWatcherCharacter,NewsScroller,NewsScrollerItem,HTMLViewer,GuildsArtworkMini,GuildsDescriptions,MapImage,ActionPoints,Heart,NextTurn,PlayerCircle}`,
`FChatListItemSymbol`/`FFriendsList*` screen usages. **Plus the login substitute**: `DofusLoginInterface.swf` is
missing; build a minimal login screen (account + password + connect) from Interfaces.swf components exposing what
the kernel expects (`CommonLayer_mc.loginInterface`, `drawLoginInterface`), labelled `authored` reconstruction.

### C — kernel, client, events, fight flow, sound, boot → `web/src/game/kernel/`, `web/src/main.ts`, `web/src/dev/`
`Dofus.Kernel.as`, `Dofus.Kernel.Init.as`, `Dofus.Kernel.Start.as`, `Dofus.Client.as` + `Dofus.Client.*.as`
(as a facade on `core/protocol.ts` — same sub-objects `Account/Channels/Chat/Console/Game/Spells/Items/Infos` and
`on*`/`innerOn*` names; `parseServerMessage` replaces `DataProcessor`), `Events.AKS*.as` (8 files),
`Dofus.Sequencer.as`, `Dofus.GameActionsManager.as`, `Dofus.SpellsManager.as`, `Dofus.EffectsManager.as`
(wiring), `Dofus.KeyListener.as`, `Dofus.Chat.as` (CHAT), `modules_Sound/*` (SOMA), `ank.SWFLoader` (+ package),
`__Packages/ank/{Extensions,Timer}`, `Array.indexOf`, `Object.copyValues`, `String.getAddLeftChar`,
`DefineSprite_80_Dofus.DataCenter` clip action, `DefineButton2_123`, `DOFUS.swf` scripts. Boot in `main.ts`, and
the **replay harness** in `web/src/dev/`.

### D — content → `web/public/lang/fr.json`, `docs/content-reconstruction.md`
French language data for `core/lang.ts`.

## Extra sources found by the data search (`docs/missing-data-search.md`)

- **Music:** `vendor/archive-dofus-1/music-v3b/music/` has 6 of the 7 tracks beta 5b plays (`02, 04, 08, 10, 11, 12.mp3`;
  `07.mp3`, the lobby music, is missing everywhere). Official beta 3b pack. Owner: C (wire into SOMA's `MUSIC_PATH`
  via a reproducible copy step into `web/public/assets/media/music/`).
- **Login flow reference:** `vendor/wayback-dofus-2004/DofusLogin.swf` (June 2004 jouer.dofus.com login page) shows
  how the lang SWF was loaded into `DofusSO` and which functions the login interface exposed. Reference only
  (post-5b). Owners: B2 (login substitute), C (`Kernel` login/lang boot), D (lang data shape).
- **Beta screenshots and forum pages:** `vendor/wayback-dofus-2004/screenshots/`, `pages/`; §4 of
  `docs/missing-data-search.md` maps visible French strings to 5b keys (e.g. `DOFUS_STATS` = "Stats Dofus"). Visual
  reference for B1/B2; text source for D (provenance `beta_screenshot`, ranks above `retro_fr`).
- **Sibling beta builds** `vendor/archive-dofus-1/v7b/` … `v1_0/` (unpacked, never execute). v7b (25 Feb 2004) is the
  closest code base. Reference only: **do not port 7b behaviour into 5b** — protocol differences are listed in the
  search doc.
