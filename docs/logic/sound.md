# Sound module (`modules/Sound.swf`, `_global.SOMA`)

Sources: `modules_Sound/Dofus.Sound.Manager.as`, `Dofus.Sound.ParamsManager.as`, `Dofus.Sound.Params.as`,
`Dofus.Sound.Event.as`.

## 1. Loading

`KERNEL.init` loads `modules/Sound.swf` into `_root.SoundManager` (depth 4) in parallel with Interfaces
(`AKSClient/Dofus.Kernel.as:25-26`). Init-action order in Sound.swf (tag order): `ParamsManager` → `Manager`
→ `Params` → `Event`. `Dofus.Sound.Manager.as:206`:

```
_global.SOMA = this.attachMovie("Dofus::Sound::Manager", "sm", 1);   // `this` = the SWF's root (presumably _root.SoundManager)
```

Until Sound.swf has loaded, `SOMA` is undefined and every `SOMA.onX()` call is a silent no-op.

## 2. `Class_Sound_Manager` (MovieClip)

| Member | Behaviour | Site |
|---|---|---|
| `COOKIE_NAME = "DofusSO"` | settings live in the **same SharedObject as the language data** | `:3` |
| `init()` | reads `muteSound`, `muteMusic` (booleans), `volumeMusic`, `volumeSound` (default 70); creates `mc_sound` (1), `mc_music` (2), attaches `paramsManager` (3) | `:101-112` |
| `getSoundVolume(file, "Sound"\|"Music")` | `volume<kind> · (params[file]?.volume ?? 100) / 100` | `:113-127` |
| `playMusic(file, volume?, loops)` | if not muted and `file` differs from the current music: `new Sound(mc_music)`, `loadSound(MUSIC_PATH + file)` (event sound, not streaming), on load `start(0, loops)` + `setVolume`; on complete calls `onFinish` (if set). The previous music Sound object is not stopped explicitly | `:128-162` |
| `playSound(linkage, volume?, loops)` | if not muted: new clip `mc_sound<id>` (`id` incrementing), `Sound.attachSound(linkage)` (Sound.swf library), `start(0, loops)`, `setVolume`; on complete → `onFinish()` then remove the clip; returns the Sound | `:163-196` |
| `setMuteSound(b)` / `setMuteMusic(b)` | persist in the cookie; muting sounds stops all playing sounds (`stopSound`); muting music stops it, unmuting calls `play()` on the current music object (nothing if none was loaded) | `:12-42` |
| `setVolumeMusic(v)` / `setVolumeSound(v)` | clamp 1–100, persist, rescale playing sounds `s.volume = v · s.volume / oldVolume` | `:51-92` |
| `getMuteSound/getMuteMusic/getVolumeSound/getVolumeMusic` | getters (used by the options box) | `:43-50,93-100` |
| `stopMusic()` | `setMuteMusic(true)` (persists the mute) | `:197-200` |
| `stopSound(s)` | `s.stop(); s.onSoundComplete()` | `:201-205` |

UI: options box mute buttons and volume gauges call the setters/getters
(`modules_Interfaces/DefineSprite_906_boxOptions/frame_1/…`, see `ui.md`).

## 3. Per-file volume table (`Dofus.Sound.Params.as:1-53`)

`SOMA.paramsManager.addParams(file, volume%)`:

| File / linkage | Vol | File / linkage | Vol | File / linkage | Vol |
|---|---|---|---|---|---|
| `crockette_201` | 65 | `many_501` | 85 | `cc_arty` | 95 |
| `crockette_202` | 40 | `many_502` | 40 | `cc_dodge` | 50 |
| `dodge_601` | 65 | `many_503` | 100 | `cc_grina` | 75 |
| `dodge_602` | 100 | `many_504` | 100 | `cc_grina2` | 75 |
| `dodge_603` | 100 | `many_505` | 65 | `cc_jet` | 100 |
| `grina_701` | 35 | `vlad_801` | 65 | `cc_many` | 64 |
| `grina_702` | 67 | `vlad_802` | 60 | `cc_setag` | 40 |
| `grina_703` | 55 | `vlad_804` | 45 | `cc_vlad` | 45 |
| `grina_704` | 85 | `vlad_806` | 40 | `death` | 75 |
| `grina_705` | 91 | `vlad_807` | 50 | `hit_defaut` | 70 |
| `grina_706` | 65 | `setag_301` | 75 | `hit_dodge` | 35 |
| `grina_707` | 65 | `setag_303` | 60 | `pas_homme_normal` | 100 |
| `jet_903` | 42 | `setag_305` | 85 | `pas_homme_petit` | 90 |
| `jet_904` | 65 | `coup_critique` | 35 | `pet` | 43 |
| `start_fight` | 100 | `02.mp3` | 32 | `07.mp3` | 22 |
| `04.mp3` | 27 | `08.mp3` | 29 | `10.mp3` | 25 |
| `11.mp3` | 30 | `12.mp3` | 30 | | |

## 4. Events (`Dofus.Sound.Event.as`)

`BOUCLE_INFINIE = 9999` loops; `MUSIC_FIGHT = ["10.mp3","11.mp3","12.mp3","08.mp3"]` (`:1-2`).

| Event | Effect | Called from |
|---|---|---|
| `onGameStart` | `playSound("start_fight", , 2)`, when it finishes a random `MUSIC_FIGHT` track looped | fight start, `AKSClient/Events.AKS.Game.as:412` |
| `onGameEnd` | nothing | game end queue, `Events.AKS.Game.as:380` |
| `onGameInvitation` | `"bip"` | never (caller typo `SONA`, `Events.AKS.Game.as:268`) |
| `onGameCriticalHit` | `"bip"` | actions 301/304, `Events.AKS.Game.as:787,814` |
| `onGameCriticalMiss` | `"coup_critique"` | actions 302/305, `Events.AKS.Game.as:799,821` |
| `onGetCharacters` | music `02.mp3` | character list, `AKSClient/Events.AKS.Account.as:5` |
| `onEnterMulti` | music `07.mp3` | multiplayer lobby, `AKSClient/Dofus.Kernel.as:111` |
| `onEnterVillage` | music `04.mp3` | solo game created, `Events.AKS.Game.as:12` |
| `onChatWisper` | `"bip"` | every whisper-coloured chat line, `AKSClient/Dofus.Chat.as:59` |
| `onError` | `"error"` | every error-coloured chat line and connection/login errors, `Dofus.Chat.as:66`, `Events.AKS.as:13,66` |
| `onTotProut` | `"pet"` | any chat message containing `tppttp`, `AKSClient/Events.AKS.Chat.as:9-16` |

## 5. Assets

* Sound.swf exports these sound linkages (asset-side): `arty_101 arty_102 arty_104 bip boum cc_arty cc_dodge
  cc_grina cc_grina2 cc_jet cc_lakam cc_many cc_setag cc_vlad coup_critique crockette_201 crockette_202 death
  dodge_601–603 error grina_701–707 hit_defaut hit_dodge jet_903 jet_904 lakam_404 lakam_405 many_501–505
  pas_homme_normal pas_homme_petit pet setag_301 setag_303 setag_305 start_fight tchak vlad_801 vlad_802
  vlad_804–807`. All linkages used by `Event.as` exist.
* `boum` and `tchak` are exported but played by no script.

### 5.1 Triggers inside the asset SWFs (`decompiled/clean/clips/…`)

All asset sounds go through `SOMA.playSound(linkage)`, so they obey the sound mute/volume settings and resolve the
linkage in Sound.swf's library (`playSound` attaches to a clip inside `SOMA`).

**Spell SWFs** — the root frame 1 plays `"<prefix>_<animID>"` as soon as the spell clip loads, e.g.
`SOMA.playSound("arty_101");` (`clips/spells/101.swf/frame_1/DoAction.as:1`); for `501` and `701` the call sits in the
`shoot`/`move` sub-symbol (`clips/spells/501.swf/DefineSprite_16_shoot/frame_1/DoAction.as:1`,
`clips/spells/701.swf/DefineSprite_13_move/frame_1/DoAction.as:1`), for `804` in a sub-symbol frame 2.

| Prefix (class) | Spell files with a sound | Linkage missing from Sound.swf (silent) |
|---|---|---|
| `arty` (Féca) | 101, 102, 104, 105 | `arty_105` |
| `crockette` (Osamodas) | 201, 202 | — |
| `setag` (Enutrof) | 301, 303, 305 | — |
| `lakam` (Sram) | 401–405, 407; 406, 408 and 809 reuse `lakam_405` | `lakam_401`, `lakam_402`, `lakam_403`, `lakam_407` |
| `many` (Xélor) | 501–505; 907 reuses `many_504` | — |
| `dodge` (Ecaflip) | 601–603 | — |
| `grina` (Eniripsa) | 701–707 | — |
| `vlad` (Iop) | 801, 802, 804–807 | — |
| `jet` (Crâ) | 903, 904; 906 reuses `jet_903` | — |
| `licrounch` (Sadida) | 1001–1003 | all three |
| `autre` / `aute` (typo) | 1101, 1104, 1105, 1107 / 1102, 1103 | all six |

Spell files with no sound: `0, 103, 205–209, 302, 304, 506, 507, 604, 803, 808, 901, 902, 905, 908, 1004–1010`.
(Class attribution from the sprite instance-name prefixes in `characters.md` §5, e.g. `cArty*` in Féca sprites.)

**Character sprites** (`clips/sprites/<n>.swf`), played by the animation sub-symbols, so they repeat every time
an animation restarts:

| Sound | Where | Sprites |
|---|---|---|
| `pas_homme_normal` | 2 footsteps per Walk and Run cycle (e.g. `clips/sprites/10.swf/DefineSprite_99/frame_3/DoAction.as:1`, `frame_10`) | Féca, Enutrof, Ecaflip, Iop, Crâ (♂/♀), Sram ♀ (WalkR only), monster 1000 (Walk/Run) |
| `pas_homme_petit` | same | Osamodas, Xélor, Eniripsa |
| — | no footsteps | Sram ♂, Sadida, monsters 1001–1007 |
| `cc_<class>` | close-combat (`Shoot`) animation, around the `end()` frame (e.g. `clips/sprites/10.swf/DefineSprite_156/frame_9/DoAction.as:1`) | `cc_arty` Féca, `cc_many` Osamodas **and** Xélor, `cc_setag` Enutrof, `cc_lakam` (twice) Sram, `cc_dodge` Ecaflip, `cc_grina` + `cc_grina2` Eniripsa, `cc_vlad` Iop, `cc_jet` Crâ; none for Sadida and monsters |
| `hit_defaut` | frame 3 of the Hit animation (e.g. `clips/sprites/10.swf/DefineSprite_172/frame_3/DoAction.as:1`) | all classes except Sram, Ecaflip, Sadida; monster 1006 |
| `hit_dodge` | Hit animation (frames 1 and 3) | Ecaflip; its HitL also calls `SOMA.playSound(SP_PERSOS + "hit_dodge.mp3")` (`clips/sprites/60.swf/DefineSprite_140/frame_1/DoAction.as:1`) — `SP_PERSOS` is undefined, linkage `hit_dodge.mp3` does not exist → silent |
| `death` | frame 1 of the Die animation (e.g. `clips/sprites/20.swf/DefineSprite_173/frame_1/DoAction.as:1`) | all classes except Féca and Sadida; no monster |

No sounds in `ground.swf`, `objects.swf`, `circle.swf` or the guild artwork SWFs.

* Music files `music/*.mp3` are missing (`missing-content.md` #10); `modules/sounds.swf` is never loaded.
