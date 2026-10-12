# Third-party data: Wayback Machine captures of the post-beta Dofus site (Aug 2004 – Dec 2006)

Fetched 2026-10-12 from the Internet Archive using raw `id_` URLs:
`http(s)://web.archive.org/web/<timestamp>id_/<original>`. The timestamps below are the **effective** capture
timestamps that the Archive served, which can differ from the ones requested. No licence is stated. All pages, images
and SWFs are © Ankama Studio (the footer reads "Ankama Games" from Dec 2006). This is untrusted data. The SWFs
were never run. They were inspected only through JPEXS (`tools/ffdec.sh -dumpSWF`, `-export image,text,frame,script`).
The beta-era banners in `swf/beta_*` are kept **only for contrast** with the launch-era banner. The beta-era site
itself is documented elsewhere.

## Design timeline (dofus.com root and FR home)

| # | Period (first → last capture seen) | What the root URL served | Key evidence |
|---|---|---|---|
| beta | … → 2004-07-27 | Beta-era homepage (`style_home.css`) with the **blue/orange** Flash banner `swf/bandeau.swf` | root 2004-07-27 14:08; banner digest `5UI7…` last seen 2004-08-23 06:11 |
| D1 | banner swapped between 2004-08-23 06:11 and 2004-08-26 02:04; new homepage first seen 2004-08-29, last 2005-05-17 | HTML/CSS homepage (`css/basic.css`, `generic.css`, `home.css`), page background `#2A2E09`, **parchment** 760×139 Flash banner, Flash blocks `swf/communaute_home.swf` and `img/home/comptoir.swf` | banner digest `C4HO…` first seen 2004-08-26 02:04; home news "23/08/2004 La version 1 de DOFUS est sortie..." |
| D2a | 2005-05-18 → 2006-05-05 | Root returns 302 → `/home.htm` (to 2005-07-17), then serves directly: a 650×500 FR/EN **language splash** `img/home.jpg`, background `#442E21`, later `#3A261B` (by 2006-02-01; root size changed on 2006-01-17) | root 302 from 2005-05-18; `home.htm` 2005-05-31 |
| D2b | `/fr/` first captured 2005-07-06 → still in Dec 2006 | Full-Flash FR site `0-Conteneur.swf` (950×650 stage, background `#452E2E`), "DOFUS – MMORPG Tactique". From 2006-06 it is loaded through `flashobject.js` from `webdata.ankama-gamez.com/flash/teaser/fr/` | `/fr/` 2005-08-08, 2006-08-24 |
| D3 | 2006-06-11 → 2006-12-05 (root redirects to `www1` from 2006-05-06/12; the 2006-05-17 `www1` root is 1.2 KB, size-consistent with the old splash, not fetched) | Root 302 → `www1.dofus.com/`: an 800×570 splash `home_0.en.jpg` with EN/FR/DE links (ES added by 2006-12-05) plus Community/Support links per language. Background `#3A261B` | `www1` 2006-06-11, `www` 2006-12-05 |
| Dc | 2005-07-27 (communaute.dofus.com, FR) / 2005-07-29 (community.dofus.com, EN) → 2006-05-17 moved to `www1.dofus.com/community/` | HTML **community portal** "DOFUS - Site de la communauté" that the Flash site links to: news, poll, screenshots, menu of green image buttons; page background `#3A261B`, content `#FAF8F2`, green `#00863F` / `#6EAF7C`, Verdana 11 px (`styles/global.css`); logo = gold wordmark set in green foliage | `communaute.dofus.com` 2005-07-27, `www1.dofus.com/community/` 2006-05-17 |
| D4 | 2006-12-14 → (beyond scope) | New root built from tables: Ankama Games "quickjump" bar (`webdata.ankama-games.com/misc/quickjump_*.jpg`), `logo_dofus.jpg`, `main_illu.jpg`, buttons `btn_community/download/forum/support.en.jpg`, background `#422c2c` | root 2006-12-14 17:50. HTML only: `logo_dofus.jpg` and `main_illu.jpg` return 403 in the Archive |

jouer.dofus.com: from 2004-08-04 to 2005-02-06 it served a 1×1 Flash-detection page (background `#203040`) that
redirected to `login.php`. A `css/style.css` was added by 2005-03-06. By 2005-07-14 it was a 760-px table page titled
"Dofus - Tactical MMORPG" with sliced `images/logo_*.jpg`, telling players to launch `Dofus.exe` / `Dofus.html`.

## pages/ (HTML)

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `www.dofus.com_20040829113528.html` | 2004-08-29 11:35:28 | `http://www.dofus.com:80/` | D1 homepage, first capture. Title "DOFUS - Jeu de role massivement multijoueur sur Internet". News 23–27/08/2004; poll; "41864 inscrits"; footer "Copyright © 2003/2004 - Ankama Studio" |
| `www.dofus.com_20050511001239.html` | 2005-05-11 00:12:39 | `http://www.dofus.com:80/` | D1 homepage, late capture (same layout, SEO title "...MMORPG...") |
| `www.dofus.com_home.htm_20050531011947.html` | 2005-05-31 01:19:47 | `http://www.dofus.com:80/home.htm` | D2a splash (target of the root 302): `img/home.jpg` image map → `/en/`, `/?l=fr`; background `#442E21` |
| `www.dofus.com_20050718235221.html` | 2005-07-18 23:52:21 | `http://www.dofus.com:80/` | D2a splash served at root; links `/en/`, `/fr/` |
| `www.dofus.com_fr_20050808011605.html` | 2005-08-08 01:16:05 | `http://www.dofus.com:80/fr/` | D2b full-Flash FR site wrapper (`0-Conteneur.swf?SERVER_NAME=.dofus.com`, `#452E2E`, Flash 7) |
| `www.dofus.com_20060201012322.html` | 2006-02-01 01:23:22 | `http://www.dofus.com:80/` | D2a splash, background now `#3A261B`, Google Analytics, links to the Ankama group sites |
| `www1.dofus.com_20060611180900.html` | 2006-06-11 18:09:00 | `http://www1.dofus.com:80/` | D3 splash (`data.ankama-games.com/dofus/home_0.en.jpg`, 800×570), EN/FR/DE + Community + Support; footer "Ankama Studio © 2003-2006" |
| `www1.dofus.com_fr_20060824004555.html` | 2006-08-24 00:45:55 | `http://www1.dofus.com:80/fr/` | D2b Flash site via `flashobject.js` from `webdata.ankama-gamez.com/flash/teaser/fr/`; popups for the trailer videos |
| `www.dofus.com_20061205040344.html` | 2006-12-05 04:03:44 | `http://www.dofus.com:80/` | D3 splash (`webdata.ankama-games.com/www.dofus.com/home_0.en.jpg`), ES added; footer "Ankama Games © 2003-2006" |
| `www.dofus.com_20061214175000.html` | 2006-12-14 17:50:00 | `http://www.dofus.com:80/` | D4 root with the Ankama Games quickjump bar (images not fetched) |
| `communaute.dofus.com_20050727011013.html` | 2005-07-27 01:10:13 | `http://communaute.dofus.com:80/` | Dc community portal (FR), first capture. Title "DOFUS - Site de la communauté"; menu images `menuHome/Game/Infos/Play/Download/Subscribe/Forum/Fans/Goodies/Rules/Support_FR.jpg` |
| `www1.dofus.com_community_20060517190632.html` | 2006-05-17 19:06:32 | `http://www1.dofus.com:80/community/?` | Dc community portal after the move to www1 (same structure, lowercase `menu_*.fr.jpg`, assets on `data.ankama-games.com`, E3 logo, "blackwabbit" news icons) |
| `www.dofus.com_pages_conditions.php_20040915185901.html` | 2004-09-15 18:59:01 | `http://www.dofus.com:80/pages/conditions.php` | Launch-era **Conditions d'Utilisation** (linked from the D1 footer). Contains the section "Particularités : Sites de Fan" (non-commercial fan use allowed if Ankama is told at info@dofus.com, no direct profit, origin shown with the line "www.DOFUS.com (c) 2004 Ankama Studio . Tous droits réeervés." [sic]) and "Fan Art". Same URL is a 404 by 2005-10-17 |
| `jouer.dofus.com_20040804033528.html` | 2004-08-04 03:35:28 | `http://jouer.dofus.com:80/` | Flash-detection redirect page, background `#203040` |
| `jouer.dofus.com_20050714005749.html` | 2005-07-14 00:57:49 | `http://jouer.dofus.com:80/` | "Dofus - Tactical MMORPG" page: launch `Dofus.exe` / `Dofus.html` / `lancement.html` |

## css/ (D1)

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `d1_basic.css` | 2004-09-10 05:24:49 | `http://www.dofus.com:80/css/basic.css` | Layout: `body` background `#2A2E09` (comment: old `#AEBC45`), `.general` 765 px centred, Verdana everywhere, left column `#E5DDB5` with border `#AF8B67`, footer text `#555555` |
| `d1_generic.css` | 2004-09-10 05:24:56 | `http://www.dofus.com:80/css/generic.css` | Links `#A37A54` 11 px Verdana; table header `#D5CFAF`, rows `#F3F0E3` / `#E9E5D4`, hover `#CCC7B3`; inputs border `#88501B`; parchment corner images `tlcorner.gif` etc. (not fetched) |
| `d1_home.css` | 2004-09-15 23:38:41 | `http://www.dofus.com:80/css/home.css` | Homepage grid: top row 760×198 (518-px Flash + 242-px subscription box), three 242-px columns `#bg`, `#bm`, `#bd`, each built from `img/home/fond_*.gif` / `titre_*.gif` |
| `d1_menu.css` | 2004-09-10 05:24:45 | `http://www.dofus.com:80/css/menu.css` | Subpage left menu |
| `d2c_communaute_global.css` | 2005-10-12 09:38:14 | `http://communaute.dofus.com/styles/global.css` | Community portal CSS: `* { font-family: Verdana; font-size: 11px }`, `BODY` background `#3A261B`, greens `#00863F` / `#6EAF7C` / `#13792D` / `#4B945E`, tan `#A68365`, cream `#FDF8E9` / `#F5F0E2`, link blue `#0D4C7A` |
| `d3c_www1_global.css` | 2006-06-15 01:08:55 | `http://www1.dofus.com/styles/global.css` | 2006 version of the same stylesheet |
| `d1_textes.css` | 2004-09-10 05:24:52 | `http://www.dofus.com:80/css/textes.css` | Subpage text styles |

## img/

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `d1_home_titre_jouer.gif`, `_titre_new.gif`, `_titre_proch.gif`, `_titre_savoir.gif`, `_titre_sond.gif` | 2005-01-26 (00:37:24, 00:38:08, 00:37:56, 00:37:43, 00:38:26) | `http://www.dofus.com/img/home/titre_*.gif` | 242-px section headers: dark-brown (`#432407`) calligraphic lettering on a parchment tab with a folded corner and a monster vignette ("Jouer directement", "News", "Prochainement sur Dofus", ...) |
| `d1_home_titre_abo.gif` | 2004-11-07 06:07:20 | `…/img/home/titre_abo.gif` | "Abonnez vous à Dofus" header |
| `d1_home_fond_*.gif`, `d1_home_fond_new.png` | 2005-01-26 00:46–00:47 | `…/img/home/fond_*` | Box backgrounds: `#FDF8E9` (cream), `#DCD5B6`, `#E8E2C6`, `#F2EDD6`, edged `#B4926F` |
| `d1_home_fd_bt_voter.gif`, `d1_home_fd_bt_valider.gif` | 2005-01-26 00:46:46 / 00:47:10 | `…/img/home/fd_bt_*.gif` | Brown buttons `#88501B` with white bold text |
| `d1_home_footer_simple.gif` | 2005-01-26 00:48:16 | `…/img/home/footer_simple.gif` | 763×51 cream footer strip |
| `d1_home_crabe.jpg` | 2004-11-07 05:37:55 | `…/img/home/crabe.jpg` | Orange crab blowing a "5€ par mois" bubble (subscription price) |
| `d1_home_vignette_jeu.gif` | 2005-01-26 00:37:51 | `…/img/home/vignette_jeu.gif` | 94×94 in-game thumbnail (1.x UI, clock "15:02") |
| `d1_home_vases.gif`, `d1_home_comptoir.gif`, `d1_home_communaute.jpg` | 2004-11-07 07:12:58 / 2004-11-07 05:25:32 / 2005-01-26 00:38:22 | `…/img/home/*` | Box illustrations / fallback images for the Flash blocks |
| `d2c_logo.gif` | 2005-10-12 15:24:28 | `http://www.dofus.com/img/logo.gif` | 315×253 gold "Dofus" wordmark set in a cluster of green leaves, used by the community portal. The 2006 `data(3).ankama-games.com/misc/logo_dofus.gif` (2006-06-15) is byte-identical (MD5 `71294d9a…`), so it was not kept |
| `d2c_banner_top.jpg` | 2005-10-12 10:04:59 | `http://communaute.dofus.com/img/banner_top.jpg` | 1024×119 portal header: sky background with a line-up of class characters (CSS background of the header) |
| `d2c_footerbg.gif` | 2005-10-12 10:04:32 | `http://communaute.dofus.com/img/footerbg.gif` | 1000×60 orange footer bar (`#D68A00`-ish) with two small creatures |
| `d2c_banner_home_FR.jpg` | 2005-10-12 09:29:42 | `http://communaute.dofus.com/img/banner_home_FR.jpg` | 624×220 portal banner "DOFUS, au monde du jeu... cliquez ici !!!" with a "Paris" signpost. Inferred to be the Monde du Jeu fair, Oct 2005, from the CDX entries `communaute.dofus.com/convention/20051014/` and `…/img/baniere_monde_du_jeu.jpg` (captured 2005-10-12) |
| `d2c_menuHome_FR.jpg`, `d2c_menuGame_FR.jpg`, `d2c_menuInfos_FR.jpg`, `d2c_menuFans_FR.jpg` | 2005-10-12 15:24–15:25 | `http://www.dofus.com/img/menu*_FR.jpg` | 151×20 portal menu buttons (green `#058646` with white lettering) |
| `d2c_title_news_FR.gif` | 2005-10-12 09:32:31 | `http://communaute.dofus.com/img/title_news_FR.gif` | Portal "News" title |
| `d3_fr_no_plugin.jpg` | 2006-11-01 20:32:55 | `http://www1.dofus.com:80/fr/no_plugin.jpg` | Image on the "no Flash plugin" page: foliage logo above a mechanical armoured creature |
| `d1_etoilem.gif` | 2005-01-26 00:46:42 | `http://www.dofus.com/img/etoilem.gif` | List bullet star |
| `d2_splash_home.jpg` | 2005-10-12 09:04:31 | `http://www.dofus.com/img/home.jpg` | 650×500 FR/EN splash: "TACTICAL MMORPG", gold logo in green foliage, a yellow bird on a branch (a Tofu, inferred), two character illustrations, green links "DISCOVER DOFUS (IN ENGLISH)" / "JOUER A DOFUS (EN FRANCAIS)". The HTML used this file name from 2005-05-18, but the image may have changed before this October capture |
| `d3_splash_home_0.en_200612.jpg` | 2006-12-02 01:32:47 | `http://webdata.ankama-games.com/www.dofus.com/home_0.en.jpg` | 800×570 four-language splash (EN/FR/DE/ES) with a panda-like warrior on the right (a Pandawa, inferred). The 2006-06 `data.ankama-games.com/dofus/home_0.en.jpg` was **not archived** (404) |

## swf/ and swf-export/ (JPEXS output)

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `swf/d1_bandeau_20040826.swf` → `swf-export/d1_bandeau_20040826_frame3.png`, `_texts.tsv` | 2004-08-26 02:04:58 | `http://dofus.com:80/swf/bandeau.swf?choix1=11&choix2=10` | **First launch-era banner** (CWS SWF6, 760×138, background `#2A2E09`). Frame 3 = idle state: cream parchment `#FEF8E8`, brown rounded frame, gold "Dofus" logo, a yellow bird mascot (a Tofu, inferred) with a speech bubble "S'inscrire et jouer à DOFUS en quelques clics de souris", top-right tab "Forum - S'inscrire - Identification", bottom tabs **JOUER · Découvrir · News · Téléchargements · Abonnement · Aide** |
| `swf/d1_bandeau_20040916.swf` → `_frame3.png`, `_frame1_preloader.png`, `_texts.tsv` | 2004-09-16 22:18:11 | `http://www.dofus.com:80/swf/bandeau.swf?choix1=10&amp` | Same banner, revised: tab "S'inscrire - Votre compte - Forum", "Télécharger". Frame 1 = "Loading" bar with two daggers. Frame 2 loads `swf/decor.swf` + `swf/perso/<1-19>.swf` (two random characters with a "VS"); **those were not archived** |
| `swf/d1_communaute_home.swf` → `swf-export/d1_communaute_home_frame1.png`, `_texts.tsv` | 2005-01-26 00:37:29 | `http://www.dofus.com/swf/communaute_home.swf` | 518×197 block: "DOFUS, rejoignez la communauté ! / Jeu de rôle massivement multijoueur sur Internet", a group of class characters and monsters, "GRATUIT Bénéficiez d'une semaine de test !!!", quote "Découvrez un univers sans limite et partez à la recherche des précieux Dofus !" |
| `swf/d1_comptoir.swf` → `swf-export/d1_comptoir_frame1.png` | 2005-01-26 00:38:31 | `http://www.dofus.com/img/home/comptoir.swf` | 242×211 "Le Comptoir" T-shirt shop block (background `#272A18`) |
| `swf/d2_0-Conteneur_fr.swf` → `swf-export/d2_0-Conteneur_fr_frame40.png`, `_frame117.png`, `_img132_castle.jpg`, `_texts.tsv` | 2005-10-12 09:05:15 | `http://www.dofus.com/fr/0-Conteneur.swf?SERVER_NAME=.dofus.com` | SWF7 (uncompressed), 950×650, background `#452E2E`, 117 frames. Container only: it loads `00-Intro.swf`, `1-Accueil.swf`, `2-Jeu.swf`, `3-Personnages.swf`, `4-Exploration.swf`, `5-Galerie.swf`, `ImageAccueil_N.swf` and `SonBoucle_0N.swf`, **none of which were archived**, so the inner panel content cannot be recovered. Texts: "Jeu de rôle massivement multijoueur sur Internet", "DOFUS – MMORPG Tactique", nav "Le jeu · Les personnages · Exploration · Galerie", "Inscription", "Téléchargement · Abonnement", "Forum · Support · La boutique Dofus", "Accéder au site de la communauté Dofus", ">> Envoyer à un ami <<", "Ankama Studio ©2003-2005. Tous droits réservés." `img132` is the 790×1142 sepia watercolour of a castle on a hill used as the panel backdrop |
| `swf-export/logo_dofus_154x84_bandeau.png` | from `d1_bandeau_20040916.swf` | — | Gold "Dofus" logo bitmap. **Byte-identical (MD5 `77649d4a…`) to the bitmap in the Jan 2004 beta banner**, so this logo is not a post-beta change |
| `swf/beta_bandeau_20040131.swf` → `swf-export/beta_bandeau_20040131_frame1.png`, `_texts.tsv` | 2004-01-31 09:20:40 | `http://dofus.com:80/swf/bandeau.swf?choix1=1&choix2=19` | **Beta-era, kept for contrast.** 750×139, background `#FFFFFF`, orange `#FF9900` nav bar, UK/DE flags. Nav **S'inscrire · Explorations · Informations · Forums · Bonus · Contacts**. Bubble texts: "Inscrivez-vous pour faire partie de la communauté DOFUS", "Partez à la découverte de l'univers du Jeu DOFUS", "Restez informé de l'actualité du Jeu DOFUS", "Venez converser avec les membres de la communauté", "Obtenez encore plus d'informations et de surprises", "Entrez en contact avec les créateurs du Jeu DOFUS". This is the capture closest to beta 5b (13 Jan 2004) in this folder. By 2004-07-13 the last tab read "Questions ?" |
| `swf/beta_bandeau_20040713.swf` → `swf-export/beta_bandeau_20040713_frame3.png` | 2004-07-13 14:39:07 | `http://www.dofus.com:80/swf/bandeau.swf?choix1=10&choix2=1` | **Beta-era (late), kept for contrast.** Sky blue `#2F9BDA` with orange `#FF9900` nav, the same yellow-bird speech bubble ("Inscrivez-vous pour faire partie de la communauté DOFUS"). Nav S'inscrire · Explorations · Informations · Forums · Bonus · Questions ? |

Embedded fonts (JPEXS `-export font`, names only): both banners (beta 2004-01 and launch 2004-08) use **Verdana**
and **"Wide awake"**. `communaute_home.swf` uses **"Kharon4a Bold"** (the "DOFUS, rejoignez la communauté !" title)
and Verdana. `0-Conteneur.swf` uses **"Eras Demi ITC"** (titles and nav) and the pixel font **"Verdana_10pt_st"**. The
lettering in the D1 `titre_*.gif` images is bitmap and its font is not identified.

## renders/

The chrome-devtools MCP could not be used: its dedicated browser profile was locked by another running session, which
was left alone. Renders were made with a **separate headless Chrome** (`--headless=new`, fresh temporary
`--user-data-dir`, deleted afterwards). No existing browser or tab was touched. The Archive throttled this IP after
bursts (refused connections). So, apart from one splash, pages were rendered **from the files saved here**, served
locally with `<script>` tags stripped, rather than loading ~30 assets at once from `if_` URLs. Chrome has no Flash, so
the Flash areas show "Adobe Flash Player is no longer supported". The Flash site (D2b) can only be seen through the
JPEXS frames in `swf-export/`.

| File | Source | What it shows |
|---|---|---|
| `d1_home_20040829_local_1024x768.png`, `d1_home_20040829_local_full.png` (1024×1000) | `pages/www.dofus.com_20040829113528.html` + `css/d1_*.css` + `img/d1_*` (local) | D1 launch homepage as Chrome draws it today: banner and comptoir are blank Flash boxes, and the community block falls back to `communaute.jpg`. `titre_ami.gif` is missing (alt text shown) |
| `d1_home_20040829_COMPOSITE_flash-frames_full.png` | same, with the three `<object>`s replaced by `swf-export/d1_bandeau_20040916_frame3.png`, `d1_communaute_home_frame1.png`, `d1_comptoir_frame1.png` | **Composite (inferred):** the closest reconstruction of how the page looked with Flash. The banner frame comes from a 2004-09-16 SWF, not the 2004-08-29 one, and the banner's background/character SWFs (`decor.swf`, `perso/*.swf`) are unarchived, so the banner lacks its two duelling characters |
| `d2a_splash_20050718_wayback_1024x768.png` | `https://web.archive.org/web/20050718235221if_/http://www.dofus.com:80/` | D2a FR/EN splash in context (`#442E21` page, centred 650×500 image, white Verdana copyright line). The HTML is from July 2005, but the Archive served `img/home.jpg` from its nearest capture (2005-10-12, the earliest that exists) |
| `dc_communaute_20050727_local_1024x768.png`, `dc_communaute_20050727_local_full.png` (1024×1500) | `pages/communaute.dofus.com_20050727011013.html` with its 36 assets mirrored politely (one request every ~15 s) into a scratch dir and rewritten to local paths, scripts stripped | Dc community portal: foliage logo top-left, 1024×119 character-lineup header (`banner_top.jpg`), green tab nav **Télécharger · Jouer · Abonnement · Forum**, "Mon compte / Inscription" tab, left green menu **Accueil · Infos (News, Versions, Sondages) · Le jeu (Guide, Univers, Personnages, Bestiaire, Armes, Equipements, Potions, Ressources) · Goodies (Média, Wallpaper) · Règles · Fans · Support**, white news column (green dates, first item "18/07/2005 Nouveau site de la communauté DOFUS"), right column with "Recommander DOFUS à un ami", "SONDAGE", "SCREENSHOTS", and an orange footer bar "Ankama Studio © 2003-2005". **Mixed captures:** the page is 2005-07-27 but most images are the nearest 2005-10-12/13 captures (`illu_bwork.jpg` is 2006-12-05), so the "Paris / au monde du jeu" banner is the October one. One image fails to load at the top of the news column. The 2006 `www1` portal was not rendered, to spare the Archive. Its stylesheet `css/d3c_www1_global.css` has the same palette |
| `d3_splash_20061205_local_1024x768.png` | `pages/www.dofus.com_20061205040344.html` + `img/d3_splash_home_0.en_200612.jpg` (local) | D3 four-language splash on `#3A261B` with "Ankama Games © 2003-2006" |

## Not archived / gaps (checked 2026-10-12)

- `img/home/titre_ami.gif` (D1 "Recommander à un ami" header): the Archive only has a 2011 404.
- `swf/decor.swf`, `swf/perso/*.swf` (the banner's background and character duel): the nearest capture is a 2011 404.
- Every sub-SWF of the 2005–06 Flash site (`1-Accueil.swf` …) and the 2006 `webdata.ankama-gamez.com/flash/teaser/*/0-Conteneur.swf`.
- `data.ankama-games.com/dofus/home_0.en.jpg` (2006-06 splash image). Only the 2006-12 copy on `webdata.ankama-games.com` exists.
- D4 (2006-12-14) `webdata.ankama-games.com/www.dofus.com/logo_dofus.jpg` and `main_illu.jpg`: the Archive answers 403.
- jouer.dofus.com 2005 `images/logo_*.jpg`, `coin_*.jpg`: only 2011 redirects (301) are indexed. The 2004 `images/logo.gif` and `btn_download_beta.gif` (2004-07-28) are beta-era and were not fetched.
- Live dofus.com forum threads return a bot challenge (HTTP 202/403) to scripted clients. Legal-context pages were read via WebFetch, `curl`, or Wayback copies (see the report, not this folder).
