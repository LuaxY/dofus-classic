# Search for data missing from the beta 5b archive

Searched 2026-10-10 on GitHub (`gh search repos|code`, `gh api` trees), the Wayback Machine (CDX + raw `id_`
fetches) and archive.org (advancedsearch + item metadata). Everything downloaded is under `vendor/` (one
directory per source, each with a README). Nothing was executed: installers were unpacked with `bsdtar`, and SWFs
were inspected only with `tools/ffdec.sh`.

## Top findings

1. **archive.org item `archive-dofus-1`** has official beta installers: **v5b, v7b, v10b–v17.2b, 1.0** and a
   **beta 3b music pack**. The v5b installer is byte-identical to `dofus-5b/`. The music pack supplies 6 of the 7 MP3s
   beta 5b plays (`07.mp3` is missing). **v7b (25 Feb 2004)** is the closest sibling build: same AS1 code base,
   274/289 of the 5b `getText` keys. But no build ships lang data, maps, map previews or the login UI.
2. **`DofusLogin.swf` (Wayback, June 2004)**: the jouer.dofus.com page that hosted the login flow. It shows the exact
   `langupdater.php` → `checkLanguage("fr", SharedObject "DofusSO", …)` contract, `getText = SHARED_OBJECT.data[key]`,
   and the API the missing `DofusLoginInterface.swf` exposed (`onLogin`, `onLoginResult`, `setTextError`). It is a
   substitute reference, **not** the beta 5b login UI.
3. **Beta-era screenshots** (Dec 2003 – Feb 2004) of the Console Multi lobby, character select, fight UI and
   inventory. They show the **rendered French text of several beta-only keys** (e.g. `DOFUS_STATS` = "Stats Dofus",
   `USER_STATS` = "Stats perso", `YOU_ARE_IN_CHANNEL` → "Tu es désormais dans le channel france"). See §4.
4. **Primary beta forum posts**: the spell-animation-type codes from `_spells.txt` (beta 6b, 27 Jan 2004) match
   the 5b `switch(spellType)` cases; the 8 Jan 2004 spell balancing list names beta spells per class; and a beta 5 FAQ.

## 1. Sources, ranked by usefulness for beta 5b

| # | Source (URL) | Contents | Era / version evidence | Size | Licence | Downloaded → path |
|---|---|---|---|---|---|---|
| 1 | https://archive.org/details/archive-dofus-1 `Music_Dofus_v3b.exe` | `music/02,04,08,10,11,12.mp3` | file dates 26 Oct 2003; names match `modules_Sound/Dofus.Sound.Params.as:46-52` | 1.7 MB | uploader: CC BY-NC-ND 4.0; content © Ankama | yes → `vendor/archive-dofus-1/music-v3b/` |
| 2 | same item, `Installation_Dofus_v7b.exe` | full beta 7b client (AKSClient, Interfaces, Sound, clips) | `LIS-MOI.txt` "VERSION BETA 7b, Le 25 février 2004"; `dofus.Constants.VERSION = 7` | 5.0 MB (5.9 MB unpacked) | same | yes → `vendor/archive-dofus-1/v7b/` |
| 3 | `http://jouer.dofus.com/files/login/swf/DofusLogin.swf` (Wayback 20040623030311) | web launcher: lang loading, login flow, `DofusLoginInterface.swf` host API | captured 2004-06-23, i.e. between 13.1b (1 Jun) and 15b (5 Jul 2004); SWF7 | 6.9 KB | © Ankama, none stated | yes → `vendor/wayback-dofus-2004/DofusLogin.swf` |
| 4 | booge.net `/dofus/wp/0[1-6].jpg`, `carte-dofus2.jpg`; xenografter `Screenshots/souvenir.JPG`; naholyr `bug_dofus.png` (Wayback) | beta UI screenshots (lobby, character select, fight, inventory) and a stitched map of beta Amakna | v2b–v6b per `vendor/dofushistory/` + in-image date 2 Feb 2004 + "Nouvelle version bêta (6b)" news | 1.6 MB total | fan sites, none stated | yes → `vendor/wayback-dofus-2004/screenshots/` |
| 5 | ankama-studio.com forum `topic_view.asp?tid=1687` (Wayback 20040716222230) | quote of `clips/spells/_spells.txt` spell animation types | posts 27–28 Jan 2004 (beta 6b), confirmed by Kam (admin) | 4 KB | © Ankama | yes → `vendor/wayback-dofus-2004/pages/` |
| 6 | ankama-studio.com forum `tid=1448` (Wayback 20040711133953) | beta spell balancing list: spell names per class + rule changes | post 08 Jan 2004 (lichen, Admin), 5 days before 5b | 3 KB | © Ankama | yes → same |
| 7 | forum.dofus.com `LesBetaTest/CompteRendu/2-FAQDeDofus` (Wayback 20040213002524) | beta FAQ: "la bêta 5 ne contient que les combats", max level 30 "pour cette bêta 5", no monsters, duel opponents not choosable | edited 27–28 Jan 2004, explicitly about beta 5 | 16 KB | © Ankama | yes → same |
| 8 | tweenpix.net Kam interview (Wayback 20040305103937) | server = in-house Java sockets, own non-XML protocol | interview 15–19 Dec 2003 | 49 KB | © tweenpix | yes → same |
| 9 | https://github.com/loonaire/dofushistory | beta history and changelogs, dates per version, link list | community, cites Wayback | 130 KB (5 pages) | CC-BY-SA-4.0 | yes → `vendor/dofushistory/` |
| 10 | archive-dofus-1 `DofusGuideUtilisateur.pdf` | beta user guide: shortcuts, chat colours and commands | PDF CreationDate 2004-02-27 (≈ v7b) | 72 KB | uploader CC BY-NC-ND | yes → `vendor/archive-dofus-1/downloads/` |
| 11 | archive-dofus-1 `Installation_Dofus_v10b…v17_2b.exe`, `v1_0.exe`, `DofusPatch_v13b_to_v13_1b.zip` | later beta clients (loader/core split from v12b, `modules/sounds.swf` from v12b, `audio/musics.swf` from v17.1b) | LIS-MOI dates 7 Apr – 23 Aug 2004; VERSION 10…17.2, 1.0 | 95 MB installers, 108 MB unpacked | same | yes → `vendor/archive-dofus-1/v10b … v1_0/` |
| 12 | archive-dofus-1 `Installation_Dofus_v5b.exe` | beta 5b installer | **identical** to `dofus-5b/` (489/489 MD5) | 4.4 MB | same | installer kept in `downloads/`; unpacked copy deleted |
| 13 | jouer.dofus.com `files/login/swf/webLoader.swf` (Wayback 20041211) | 1.0-era loader | Dec 2004 | 8.5 KB | © Ankama | yes → `vendor/wayback-dofus-2004/` |
| 14 | dofus.com `?page=informations&rubrique=betatests` + screenshots page (Wayback 20040124) | "~360 sorts", 650 testers; list of official screenshot names | Jan 2004 | 23 KB | © Ankama | yes → `vendor/wayback-dofus-2004/pages/` |
| 15 | github.com/dofera/dofedex | 2004 maps, `lang_fr_7` and the earliest data tables | ≥ July 2004 | 3 GB | — | already in `vendor/dofedex/` (not re-fetched) |

## 2. Status per missing item

### 2.1 Language data (`langupdater.php` / `DofusSO` / `getText` keys, tables `S`, `CC`, `M`, `G`, `I.*`): **partially found (indirect only)**

- No beta lang SWF, no langupdater dump and no `DofusSO.sol` exist in any source found. All 11 installers
  (5b–1.0) still load `…/files/lang/langupdater.php` remotely (`v7b`: `dofus.Constants.HTTP_LANG_FILE`; `v10b`:
  `ank.utils.Translator.loadLanguage` with the same `checkLanguage(lang, so, gui, kernel)` signature).
  Wayback has `jouer.dofus.com/files/lang/langupdater.php` only as a 2011 HTTP 301.
- What was found instead:
  - `DofusLogin.swf` confirms the loader contract: `mc.checkLanguage("fr", SHARED_OBJECT, INTERFACE, KERNEL)`,
    `SHARED_OBJECT = SharedObject.getLocal("DofusSO")`, `getText(ref) = SHARED_OBJECT.data[ref]`, a progress bar
    driven by `showProgressBar` / `updateProgressBar` / `hideProgressBar`, and `onLangOK` as the continuation.
    It uses the keys `ERROR_BAD_LOGIN`, `ERROR_BAD_PASSWORD`, `ERROR_LOGIN_CANT_CONNECT`, `ERROR_NO_LOGIN_INTERFACE`.
  - Screenshots give rendered beta-era text for some keys (§4). Some differ from `lang_fr_7` (beta "arrive dans
    le channel" vs `lang_fr_7` `ENTER_CHANNEL` "arrive dans le salon de discussion"; lobby label "Salon :" vs
    `CHANNEL` "Salon de discussion").
  - `S` (spells): spell **names** but not IDs from the 8 Jan 2004 balancing post (§1 #6) and `changelogsbeta.md`.
  - `G`/`CC`: no beta text found.
  - `I.e` (effects): beta tooltip strings in `booge_wp_05.jpg` ("dommages : 1D5", "+10 au karma",
    "fait reculer de 1case(s)").
- Key overlap of later builds with the 86 beta keys absent from `lang_fr_7`: v7b 83, v10b–v13b 10, v15b–1.0 ≤ 7.
  If a v7b-era lang dump ever surfaces, it would cover nearly all 5b keys.
- Searches tried: `gh search code` for `ADD_TEAMMATE`, `FREE_TEAMMATE`, `DOFUS_STATS`, `DESCRIPTION_RANDOM`,
  `ENTER_DOFUS`, `HELP_JOIN_12`, `HELP_PLAYSTART_12`, `HELP_FRIENDS_12B`, `DO_U_ACCEPT_INVITATION`,
  `I_AM_IN_CLOSE_GAME`, `IS_INCLOSE_GAME`, `HELP_PLAY_12`, `YOU_ARE_IN_CHANNEL`, `PLAY_DUEL`, `langupdater`,
  `langupdater.php`, `DofusSO`, `checkLanguage SHARED_OBJECT`, `getSpellText`, `filename:DofusSO.sol`,
  `extension:sol dofus`, `filename:langupdater.php`, `filename:lang_fr_7.swf`. All returned nothing Dofus-related,
  except `DofusSO` hits in 1.29/2.x bots. Code search does not index binaries, so this only rules out committed
  text files. Repo searches: "dofus lang", "dofus retro data", "dofus swf". Wayback CDX for `jouer.dofus.com/files/*`
  (all years); archive.org `q=dofus`.

### 2.2 Beta-era maps (arena maps, `files/maps/<id>.swf`, map data before July 2004): **not found (visual reference only)**

- No installer contains map data or map previews (maps were server-sent through 1.0). Wayback has no
  `jouer.dofus.com/files/maps/*` captures.
- Visual substitutes: `booge_carte-dofus2.jpg` / `booge_carte-dofuspetit.jpg` (stitched beta Amakna village maps,
  "pendant la beta v6b"), and the fight screenshot `booge_wp_04.jpg` (30 Dec 2003) showing one combat map.
  Not machine-readable. Map IDs and cell data stay UNKNOWN.
- Searches tried: CDX `jouer.dofus.com/files/*`, `dofus.com` domain (2003–2005), `booge.net/dofus/*`,
  `xenografter.chez-alice.fr/*`, `magoliroub2.online.fr/logitheque/Dofus/*`; GitHub "dofus maps swf"; the unpacked
  file lists of all 11 builds.
- Links between the 2004 substitute maps (2026-10-11): map positions and teleport cells from the StarLoco emulator
  database (Dofus Retro 1.39.8, github.com/StarLoco/StarLoco), extracts in `vendor/starloco/` (see its README); used
  for the world maps of `docs/server.md`. Not beta data either.

### 2.3 Missing client files: **partially found**

| File | Status |
|---|---|
| `music/` | **6 of 7 found**: `02, 04, 08, 10, 11, 12.mp3` in `vendor/archive-dofus-1/music-v3b/music/` (beta 3b pack, Oct 2003; beta 5b references exactly these names plus `07.mp3`). **`07.mp3` (multiplayer lobby, `modules_Sound/Dofus.Sound.Event.as:32`) not found.** The v17.1b+ `audio/musics.swf` is a different, later soundtrack (42 tracks with names like `1_lieu_village`) |
| `DofusLoginInterface.swf` | **not found.** Not in any installer and not on Wayback. loonaire (dofushistory) is looking for it too. `DofusLogin.swf` (June 2004) documents the host side of its API |
| `modules/sounds.swf` | A file with this exact name exists from **v12b** (12 May 2004) onward (`vendor/archive-dofus-1/v12b/modules/sounds.swf`). It is a later build, and beta 5b never loads `SOUNDS_PATH` (see `docs/logic/missing-content.md` #11) |
| other beta builds | **found: v7b, v10b, v11b, v12b, v13b (+13.1b patch), v15b, v16b, v17.1b, v17.2b, 1.0.** Not found: v1b–v4b, v6b, v8b, v9b, v9.1b, v14b (never released) |
| `clips/items/0.swf`, linkage `forbidden`, `BackgroundComboBox`, `Interface::BtnCC`, `maskRond` | not in v7b or v10b either. 1.0 has a `clips/forbidden.swf` (different mechanism) |

Searches tried: archive.org `q=dofus` (190 items), `uploader:(lounek09@proton.me)` (only this item and a
music-only duplicate `archive-dofus-1_202609`), `title:(dofus) AND mediatype:(software)`, `"dofus beta"`, `ankama`;
CDX `jouer.dofus.com/*`, `files/login/swf/*`; GitHub `DofusLoginInterface`, `DofusLoginInterface.swf`,
`filename:AKSClient.swf`, repos "dofus beta", "dofus 1.0", "dofus 2004", "dofus old client", "aksclient".

### 2.4 Beta server data / emulators / spell tables: **partially found (rules and names, no IDs)**

- **No emulator of the beta protocol exists** on GitHub. Every Dofus 1 emulator found targets 1.29 or later
  (Ancestra and forks, Shivas, Nao, PeakEmu, StarLoco, etc.). The Dofus Arena emulators (dArena, Divarena,
  StarLoco-Arena) target a different 2006 game.
- Beta 7b protocol, for cross-checking. `Dofus::Client::DataProcessor` differs from 5b in 93 lines: `AS` grows
  from 31 to 32 `|` fields (MP inserted at index 16); new `As` → `Account.innerOnStats`; new `Al` error `p` (112) →
  `NOT_PLAYER`; new `GIE` (effects), `Gc` (challenge), `Gt` (team); `GJ` join payload simplified. **These are 7b
  facts. Do not port them into 5b.** Decompile with
  `tools/ffdec.sh -format script:as -export script <out> vendor/archive-dofus-1/v7b/AKSClient.swf`.
- Spell animation types (beta 6b `_spells.txt`, quoted on the forum and confirmed by an admin): 10 fixed anim on
  caster, 11 fixed anim on other, 20 `rotate` from caster, 21 `rotate` + `shoot`, 30 arc `move` + `shoot`,
  31 straight `move` + `shoot`, 32 arc `move` + `shoot` + melee anim, 40 `duplicate`, 41 `duplicate` + `shoot`.
  The file also says "A ou S" = the caster plays its Attack or Spell animation. These codes match the
  `switch(spellType)` cases in `AKSClient/Dofus.BattleField.Characters.Character.as:602-686` (cases 0, 12, 22, 23,
  33, 50, 51 are not described).
- Beta spell names per class with balancing rules (8 Jan 2004): see `vendor/wayback-dofus-2004/README.md`. Mapping
  names to the 5b IDs (101–105, …, 1101–1107) is UNKNOWN. Spell icons `clips/spells/icons/<id>.swf` might allow a
  manual visual match; this was not attempted.
- Searches tried: GitHub `Dofus::Compressor`, `Class_Client_DataProcessor`, `uncompressMap`, `cryptPassword`,
  `Copie de Dofus`, `BattleField.Spells`, `GameResultRandom`, `Interface.Banner.Panel`, `MultiPlayer.Tabs`,
  `GUILD_NAMES Feca`, `AKSClient`; repos "ancestra", "emulateur dofus", "dofus emulator 1.0", "dofus arena",
  "dofus protocol 1.29". Hits were only `Compressor.as` from dofedex and Guinness-Bot (1.29-era, not beta).

### 2.5 Community knowledge and visual references: **found**

- Protocol and architecture: Kam interview (Dec 2003): Java socket server, own non-XML protocol. FAQ (beta 5):
  fights only, max level 30, no monsters, duel opponents random. Beta forum posts (spell animation types, spell
  balancing, v2b changelog). `vendor/dofushistory/` (dates of every beta, changelogs).
- UI screenshots: `vendor/wayback-dofus-2004/screenshots/` (lobby, character select, fight, inventory, gift room,
  beta map composite). `booge_wp_04.jpg` (30 Dec 2003) and `booge_wp_03.jpg` are the closest visual matches to the
  5b `Interfaces.swf`.

## 3. Build summary (`vendor/archive-dofus-1/`)

| Build | LIS-MOI date | `VERSION` | getText keys | shared with 5b (289) | of 86 beta-only |
|---|---|---|---|---|---|
| 5b | 13 Jan 2004 | 5 | 289 | 289 | 86 |
| 7b | 25 Feb 2004 | 7 | 295 | 274 | 83 |
| 10b | 7 Apr 2004 | 10 | 232 | 178 | 10 |
| 11b | 5 May 2004 | 11 | 225 | 174 | 10 |
| 12b | 12 May 2004 | 12 | 227 | 173 | 10 |
| 13b | 28 May 2004 | 13 | 230 | 169 | 10 |
| 15b | 5 Jul 2004 | 15 | 235 | 155 | 7 |
| 16b | 6 Jul 2004 | 16 | 236 | 155 | 7 |
| 17.1b | 30 Jul 2004 | 17 / SUBVERSION 1 | 236 | 144 | 6 |
| 17.2b | 4 Aug 2004 | 17 / SUBVERSION 2 | 237 | 145 | 6 |
| 1.0 | 23 Aug 2004 | 1 | 221 | 125 | 6 |

Key counts come from `grep -o 'getText("KEY"'` over each build's decompiled scripts (AKSClient/Interfaces up to
11b; loader/core/interfaces from 12b on). Beta-only = keys with `retro_fr: null` in `docs/logic/lang-keys.json`.

## 4. Beta-era text visible in screenshots (for the lang work, not verified as 5b strings)

The screenshots are dated v4b–v6b (Dec 2003 – early Feb 2004), so they bracket 5b. Strings are transcribed from
the images. Mapping each string to a key uses the 5b call site that renders that widget.

| Key (5b site) | Text shown | Screenshot |
|---|---|---|
| `DOFUS_STATS` (`modules_Interfaces/TabStart_GlobalStats.as:10`) | "Stats Dofus" | `booge_wp_03.jpg`, `xenografter_souvenir.jpg` |
| `CONNECTED` / `GAMECOUNT` / `INVILLAGECOUNT` (`TabStart_GlobalStats.as:11-13`) | "Connectés" / "Nb de parties" / "Dans le village" (all followed by " :") | same |
| `USER_STATS` (`TabStart_SelfStats.as:13`) | "Stats perso" | same |
| `EXPERIMENT` (`TabStart_SelfStats.as:22`) | "Expérience : 9729" | same |
| `YOU_ARE_IN_CHANNEL` [1 param] (`Interface.MultiPlayer.as:36`) | "Tu es désormais dans le channel france" | same |
| `ENTER_CHANNEL` [1] (`AKSClient/Events.AKS.Channel.as:20`) | "momifier arrive dans le channel" (`lang_fr_7`: "… arrive dans le salon de discussion") | `xenografter_souvenir.jpg` |
| `PLAY_DOFUS` / `MULTI_GAME` / `FRIENDS` / `RETURN_TO_VILLAGE` / `SEND` / `CHANNEL` (`Interface.MultiPlayer.as:14-19`) | "Jouer" / "Entraînement" / "Amis" / "Retour au village" / "Envoyer" / "Salon :" | same |
| `XP` + `LEVEL_SMALL` (`TabStart_Podium.as:31`) | "XP : 8490 - Niv. 13" | same |
| `CHOOSE_TITLE` / `PLAY` / `CREATE` / `DELETE` (`Interface.Characters.as:20,19,17,18`) | "Choisis ton personnage" / "Jouer" / "Créer" / "Supprimer" | `booge_wp_01.jpg` |
| `CHARISM` / `KARMA` (`Interface.Banner.Panel.Inventory.as:21-22`) | "Charisme" / "Karma" | `booge_wp_05.jpg` |
| header text above the stats, most likely a news item (`Interface.NewsScroller`, title + body; unverified) | "Bienvenue dans la Console Multi de Dofus – version bêta" / "Ici, tu peux affronter tes ennemis, choisir tes compagnons, t'entraîner avec tes amis, discuter sur les différents chats."; and "Nouvelle version bêta (6b)" / "Des nouveaux sorts, la gestion des effets en combat et tant d'autres choses !" | `booge_wp_03.jpg`, `xenografter_souvenir.jpg` |

## 5. Dead ends (do not repeat)

- GitHub code search for any beta-only lang key, `langupdater`, `DofusLoginInterface`, `AKSClient`, `DofusSO.sol`:
  no beta material. The only `DofusLoginInterface` hit is loonaire's wanted list.
- GitHub repos `Coronae/Dofus1.0` (AutoIt bot), `bazoabi/DofusBetaDemo` (JS demo), `aur-archive/dofus-beta-transition`
  (Dofus 2 AUR package), `karbomusic/AKSClient` (Azure AKS), `Elendan/Dofus-Arena-Clients` and all Dofus Arena
  emulators (different game): unrelated.
- Wayback: `jouer.dofus.com/files/lang/langupdater.php`, `files/login/getuser.php` (2011 301s only); no
  `DofusLoginInterface.swf`, no `files/maps/*`, no `files/news/news.php`. dofus.com official screenshots
  `pages/informations/img/screenshots/*` and `bonus/images/screenshots/*` are not in the CDX index (except
  `09_intermaison_grand.jpg`, a house interior). The `dofus.com/swf/bandeau.swf` banners, `pages/explorations/swf/*`
  monster SWFs (Mar–Jun 2004) and `ankama.com` calendar SWFs are website material.
- archive.org: `bandeau`, `dofus-teaser-button` (site banners), `dofus-1.2.45` (Android), `dofus-retro-*`,
  `DofusGerman`, `dofus-mag-04`, `AnkamaGamesDofusDofusArenaWakfuGerman`: later or unrelated.
  `archive-dofus-1_202609` contains only a duplicate of `Music_Dofus_v3b.exe`.
- `magoliroub2.online.fr/logitheque/Dofus/dofus_bdd_old.xls` (Wayback 2005-12-27): fan database last saved April
  2005 with resources and recipes, so post-beta. Downloaded, inspected and deleted.
- `xenografter.chez-alice.fr/Download/Dofus++.zip` (28 Jan 2004): fan add-on (replacement `lancement.html` with a
  shoutbox, a level-based team balancer and a clock). No game data. Not kept.
- Unpacked builds v7b–1.0: no lang, no maps, no login UI, no `07.mp3`, no `clips/items/0.swf`.
- HTTP (port 80) requests to web.archive.org failed intermittently during this search; HTTPS worked. Domain-wide CDX
  filter queries (`url=dofus.com&matchType=domain&filter=original:.*DofusLoginInterface.*`, same for `langupdater`,
  `.sol`, `/files/maps/`) timed out every time; the per-host prefix listings above were used instead.

## 6. Leads not followed up or not accessible

- **v6b** (27 Jan 2004) is not in `archive-dofus-1`. It is the only build known to ship a data text file
  (`clips/spells/_spells.txt`). v1b–v4b, v8b and v9b are also missing. Ask the uploader (`lounek09@proton.me`,
  archive.org) and loonaire (`@loonaire` on Twitter/Discord; has v5b and v7b) whether they have them, a
  `DofusLoginInterface.swf`, or an old `DofusSO.sol` from a beta tester's Flash Player profile. 5b calls
  `SharedObject.getLocal("DofusSO")` without a local path, so the `.sol` sits under the URL the SWF ran from:
  `#SharedObjects/<random>/localhost/…/AKSClient.swf/DofusSO.sol` when launched from `lancement.html` on disk, or
  under `jouer.dofus.com/…` when run from the web site.
- Liche's YouTube videos "Les incroyables screens des débuts de DOFUS #1/#2" (https://youtu.be/yemP7QTWTxw,
  https://youtu.be/zpcTDtF2NQU, https://youtu.be/4GuvZsz9OVc): many v1b–v7b screenshots. Video, not downloaded.
- 61 captured topics of the beta forum `ankama-studio.com/forumdofus/` (CDX list; topic titles were resolved for
  238 tids). Only tid 768, 1233, 1448, 1584 and 1687 were read. tid 1351 ("Dofus match" fan magazine) and the
  bestiary threads were not read.
- Magazine CDs: PIXEL (early Feb 2004, mentioned by dofus.com) was not found on archive.org. `pc-jeux-77-juin-2004-cd`
  (1.5 GB, June 2004) and Joystick (France) 155–160 (2004) exist on archive.org but were not checked; at best
  they would hold ≈13b-era material.
- `xenografter.chez-alice.fr/Dofus/DOF1-6.BMP` (Wayback 2007) and `fin beta/*` screenshots are late-beta (≈17.2b), not fetched.
