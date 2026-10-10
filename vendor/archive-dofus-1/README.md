# Third-party data: archive.org "Archive Dofus 1"

Source: https://archive.org/details/archive-dofus-1 (uploader `lounek09@proton.me`, published 2026-09-09,
description "Official installer for old version of Dofus 1"). Fetched 2026-10-10.
Licence stated by the uploader: CC BY-NC-ND 4.0. The content itself is Ankama's (© 2003-2004 Ankama Studio);
the uploader's licence does not change that.
Untrusted data: parse only, never execute. The `.exe` files are WinRAR self-extracting archives. They were
**not run**. They were unpacked with `bsdtar -xf` (libarchive). `v17_1b` was unpacked by carving the RAR
payload at byte offset 55199 and passing it to bsdtar. All MD5s match the archive.org metadata.

## downloads/ (original files, 105 MB)

Kept only for provenance (the hashes prove which build is which). They are safe to delete: archive.org stays the
source and everything needed is already unpacked next to them. **Never run them.**

| File | Size | MD5 |
|---|---|---|
| Installation_Dofus_v5b.exe | 4 373 746 | 563bade1ce5a4c083862e0dd3bc3df6f |
| Music_Dofus_v3b.exe | 1 676 083 | 6f8ea619cd57a50fd6cba684518f2d9f |
| Installation_Dofus_v7b.exe | 4 976 848 | cde5cb80147a0f07e814e841db1e3caf |
| Installation_Dofus_v10b.exe | 5 701 048 | e603190c9321cd5fc839c7062125d313 |
| Installation_Dofus_v11b.exe | 7 256 905 | 24ca66adf997a98a65835768824ad399 |
| Installation_Dofus_v12b.exe | 7 893 184 | fa105cc0b4c72f61da01eb624da8b582 |
| Installation_Dofus_v13b.exe | 8 808 321 | 4b3d6583b7fd35f01944771dba35bd1b |
| DofusPatch_v13b_to_v13_1b.zip | 170 256 | 6900c5db78f7232f815f1903452f3eb6 |
| Installation_Dofus_v15b.exe | 10 695 087 | 865e25cda8e2494d760e4189e9b98d09 |
| Installation_Dofus_v16b.exe | 10 839 121 | ca67a18aecd56713ae5392d93a933a96 |
| Installation_Dofus_v17_1b.exe | 13 440 341 | a380fbc1b9014d6b0466385b3056798a |
| Installation_Dofus_v17_2b.exe | 13 477 851 | 8ae87e4f81ce2b051c3bbbeaae1027c3 |
| Installation_Dofus_v1_0.exe | 14 747 864 | df3866bd0572768d02f7650e6172ad2a |
| DofusGuideUtilisateur.pdf | 71 604 | ac5ba3c964dea47e391725839854d7af |

Not downloaded from the same item: the 1.4–1.29 zips and installers (20–355 MB each, post-beta).

## Unpacked builds

Each build's date comes from its own `LIS-MOI.txt`, and its version from `static var VERSION` in the decompiled
`dofus.Constants` (or `_global.VERSION` for 5b).

| Dir | LIS-MOI date | Code VERSION | Notes |
|---|---|---|---|
| (v5b) | 13 Jan 2004 | 5 | **Byte-identical to `dofus-5b/`** (489 files, every MD5 equal). The unpacked copy was deleted; only the installer is kept |
| `music-v3b/` | files dated 26 Oct 2003 | — | `music/02,04,08,10,11,12.mp3` (MPEG-1 layer III 40 kbps 22 kHz mono). Beta 5b loads these names from `MUSIC_PATH`. **`07.mp3` (lobby) is not in the pack** |
| `v7b/` | 25 Feb 2004 | 7 (`modules/Sound.swf` still has 6) | Same AS1 architecture as 5b (`Dofus::Client::DataProcessor`, channels, `Copie de Dofus::DataCenter::Spell`). Uses 274 of the 289 beta 5b `getText` keys, including 83 of the 86 keys missing from `lang_fr_7`. Still loads lang from `langupdater.php` and the login UI from `DofusLoginInterface.swf`; neither is included. Adds `clips/effectsicons.swf`, `clips/ready.swf`, `clips/sprites/0.swf`, `<class>2.swf` sprites, spells 409–411, spell icons 34–40/49–53/131–140. Lacks 5b's `clips/guilds/descriptions/*` and `clips/sprites/1004.swf` |
| `v10b/` | 7 Apr 2004 | 10 | `ank.utils.Translator.loadLanguage`: same `checkLanguage(lang, so, gui, kernel)` contract |
| `v11b/` | 5 May 2004 | 11 | |
| `v12b/` | 12 May 2004 | 12 | `loader.swf` + `modules/core.swf`; introduces `modules/sounds.swf` |
| `v13b/` | 28 May 2004 | 13 | |
| `patch-v13b-to-v13_1b/` | 1 Jun 2004 | — | `loader.swf`, `modules/core.swf` |
| `v15b/` | 5 Jul 2004 | 15 | |
| `v16b/` | 6 Jul 2004 | 16 | |
| `v17_1b/` | 30 Jul 2004 | 17.1 | `audio/musics.swf` (42 new tracks, a different soundtrack), `audio/sounds.swf` |
| `v17_2b/` | 4 Aug 2004 | 17.2 | |
| `v1_0/` | 23 Aug 2004 | 1.0 | |

No build contains a lang file, a `DofusSO` SharedObject, map data, map previews or `DofusLoginInterface.swf`.
Lang, maps and login stayed server-side in every build up to 1.0.

`DofusGuideUtilisateur.pdf`: beta user guide (PDF CreationDate 2004-02-27, two days after v7b). It covers
keyboard shortcuts (A/C/I inventory, B close combat, Shift+1 grid, 1–8 spell slots), chat colours and chat
commands (`/w`, `/msg` …). It sends new players to the Kanojedo; according to `vendor/dofushistory/` the
Kanojedo first appeared in v7b. So the guide most likely describes v7b, not 5b.
