# Third-party data: official Dofus / Ankama websites, beta era (Jun 2003 – Aug 2004)

Fetched 2026-10-12 from the Internet Archive using raw `id_` URLs:
`http://web.archive.org/web/<timestamp>id_/<original>` (about 1 request per second, with retry and backoff). Content is
© Ankama Studio. No licence is stated. This is reference material for a fan landing page in the beta-era style.

Untrusted data. SWFs were inspected only with JPEXS (`tools/ffdec.sh -export …`); none was run in a player.
The renders in `renders/` were taken in a throwaway headless Chrome with page JavaScript disabled. Every request went
through a CDP `Fetch` interceptor that failed any `*ruffle*` or `*.swf` URL (see "Renders"). One earlier test render,
since deleted, did let the Wayback-injected Ruffle script start; it failed with a CORS error before loading the SWF.

Companion folder: `vendor/wayback-dofus-2004/` (already holds `pages/dofus.com_betatests_20040124.html`,
`pages/dofus.com_screenshots_20040124.html` and jouer.dofus.com `DofusLogin.swf`; those are not duplicated here).

## Timeline (OBSERVED from captures unless marked)

| Period | dofus.com | Evidence |
|---|---|---|
| 2003-06-28 | Placeholder "DOFUS sera bientôt disponible" | `pages/dofus.com_root_20030628.html` |
| 2003-08 → 2003-12-06 | **Old ASP site**, blue (`#37A6DF`) splash `accueil/accueil.asp` (comment "Date de création: 31/07/2003") → `home/home.asp` | `pages/dofus.com_accueil-accueil.asp_20031115.html`, `pages/dofus.com_root_20031206.html`, `css/dofus.com_style.css_2003*.css` |
| **2003-12-22 → 2004-08** | **New PHP site** `index.php?page=…`: 750 px box, Flash header `swf/bandeau.swf`, blue/orange/grey | News of 22/12/2003 (`pages/dofus.com_news1_20040121.html`): "un site tout beau tout neuf", "des forums plus pratiques", "une nouvelle version bêta". The first capture is 2004-01-21. **This is the version that was live on 13 Jan 2004 (beta 5b)**: inferred from that news plus the 2004-01-22 homepage, whose newest news item is still the 22/12/2003 one |
| 2004-01-28 | Same layout. Title images switch from `.jpg` to `.gif`; the HTML contains a commented-out `<link HREF="style_130104.css">` (13/01/04) | `pages/dofus.com_root_20040128.html` (`style_130104.css` was never archived) |
| 2004-05-16 | Same frame; the right column is rebuilt (`titreR`, `pct_*.gif` icons, poll, orange pill buttons) | `pages/dofus.com_index.php_20040516.html` |
| 2004-08-29 | Site redesigned (homepage drops to ~3.7 kB); out of scope | CDX only |

| Host | Beta-era state | Evidence |
|---|---|---|
| jouer.dofus.com | 2003-11/12: tester portal `betatest/` and sign-up page `sinscrire/betatest.php` in the **old ASP skin**, "Bêta-test ouverte le 15 octobre 2003". From 2004-02: `login.php` = 742×550 Flash on `#203040` in a 2 px white frame (same as `dofus-5b/lancement.html`) | `pages/jouer.dofus.com_*` |
| Forum | 2004-01-08 / 01-10 / 01-13 / 01-14: the **ASP forum**, served both at `ankama-studio.com/forumdofus/` and `forum.dofus.com/` with identical HTML and CSS. The 2004-01-23 `bandeau.swf` "Forums" button points to `http://www.ankama-studio.com/forumdofus/`; from the 2004-01-30 SWF it points to `http://forum.dofus.com`. 2004-02-02/03: a new forum ("WowCToutNeuf" threads). Its CSS `/style/default/default.css` is archived only from 2004-04-13; it uses the same frame as the 2004 dofus.com site (750 px, 1 px black border, orange `#F90` menu, `#EFEFEF` content, `#1375C9` category band). Its `/res/*` images are not archived | `pages/forum.dofus.com_*`, `pages/ankama-studio.com_forumdofus*`, `swf-export/bandeau_*/scripts` |
| ankama-studio.com | Full-Flash studio site (`Ankama Studio.swf`, white bg, pixel-art runners as nav) | `pages/ankama-studio.com_*`, `swf-export/ankama_studio_20040609` |

## Design of the 2004 site (dofus.com, Dec 2003 – Aug 2004)

Sources: `css/dofus.com_style.css_20040423.css` (the earliest archived CSS with the 2004 class names), the 2004 HTML,
`swf-export/bandeau_20040123/`, and pixel sampling of the images (ImageMagick, run outside this folder).
The **January 2004 CSS is not archived**. The April 2004 CSS covers the Jan-2004 class names except the right
column (`idtitre idform idbottom titregris bottomgris bottomgris2 titresondage titreplan titrepresse`).

- **Frame** (OBSERVED, CSS): `body` white (no colour set) · `.centreur` margin-top 15 px · `.general` 750 px centred,
  `border: 1px solid` (renders black) · `* { font-family: Verdana, sans-serif }`, 11 px.
- **Header** `div#top` 750×139 = `swf/bandeau.swf?choix1=N&choix2=M`. In JPEXS `frames/2.png`, the columns at x=400 are:
  y 0–107 blue `#2F9BDA` (gold *Dofus* logo, top left), y 108–109 white, y 110–134 orange `#FF9900` nav bar,
  y 135–138 blue. A top-right orange tab (x ≥ 636, slanted left edge) holds UK/DE flags.
  The scripts load `swf/decor.swf` (backdrop) and `swf/clipperso.swf`, plus two characters `swf/perso/<choix1>.swf` and
  `swf/perso/<choix2>.swf` that drift with the mouse and show a red "VS" badge when they overlap. **None of these
  four SWF paths is archived**, so the header backdrop and characters are lost.
- **Nav** (header SWF, OBSERVED): S'inscrire · Explorations · Informations · Forums · Bonus · Contacts. From 2004-07 the last
  item is "Questions ?". Labels are Verdana Bold 11 px white with a dotted-square + white ▶ bullet. Rollover lines
  (Verdana 10 px white, in a dark-blue bubble with a Tofu from 2004-02-13 on): "Inscrivez-vous pour faire partie de la
  communauté DOFUS" / "Partez à la découverte de l'univers du Jeu DOFUS" / "Restez informé de l'actualité du Jeu DOFUS"
  / "Venez converser avec les membres de la communauté" / "Obtenez encore plus d'informations et de surprises" /
  "Entrez en contact avec les créateurs du Jeu DOFUS".
- **Homepage columns** (OBSERVED, CSS + HTML 2004-01-22): left `.columnleft` 170 px bg `#2F9BDA` (`.bienvenue` 170×362
  image `img/bandeau_gauche.gif` [not archived], teaser 170×72 SWF, "STATISTIQUES :" box, "Partenaires" logos). Then
  `.conteneur01` 570 px: a strip of 76×44 screenshots, two 190 px columns (`.centerleft` NEWS + ON PARLE DE DOFUS;
  `.centerright` JOUER A LA BETA + SUR LES FORUMS), and the right column `.columnright` 170 px (IDENTIFICATION,
  COMPTOIR DE DOFUS t-shirt, Plan du Site, Espace Presse). Footer `div#bottom` 750 px bg `#FF9900`, text `#555555`
  11 px: "Conditions d'utilisation - Politique de confidentialité / D O F U S 2003/2004 - Ankama Studio - Tous droits réservés."
- **Windows**: a 190×65 ribbon title image (`img/titre_*.gif`: blue `#1275CA` slanted ribbon, white serif-caps label,
  creature/character on the right) over 190×71 cards `.infoconteneur` bg `#EFEFEF` with a rounded left edge
  (`bordure_fenetre.gif`). Dates are `h2.date` 10 px bold black, text 10 px black. Cards are separated by
  `.bordure`, a 1 px dotted line (`point_bleu.gif`: one `#2F9BDA` dot per 5 px on `#EFEFEF`).
- **Left-column boxes**: `.titreorange` bg `#FF9900` · `.titrebleu` bg `#2A82CE` · `.contenubleu` bg `#2F9BDA`, white 10 px.
- **Inner pages**: left menu `.menupagecontenu` bg `#2F9BDA`, `h1` white links with `pct_menu_page.gif` bullet [not archived],
  sub-items `h2` bg `#57AEE1`; title image 170×70 `img/titre_<section>.gif` [not archived]. Content `.columncenter` 404 px:
  `h1` 14 px `#444444` with `pages/img/marque1.gif` bullet [not archived], `h2` 13 px `#555555`, `p` 11 px `#666666`
  justified, links `#FF9900`.
- **Forms**: inputs 1 px `#08518C` border, `.textfield` bg `#EFEFEF`. Buttons are orange pill GIFs (`btvalider.gif`,
  `btvoter.gif`: `#FF9801` fill, white Verdana-like text).
- **Copy** (OBSERVED unless marked): French. The site addresses readers as *vous* ("Inscrivez vous maintenant à Dofus !", "Venez les
  rejoindre !", `pages/dofus.com_inscription_20040123.html`). The 2003 tester portal uses *tu* ("Accéder à ton compte",
  `pages/jouer.dofus.com_betatest_20031101.html`). News titles (`pages/dofus.com_index.php_20040122.html`): "Oui, oui, tout
  a changé et tout, tout va cartonner... Hé ! Hé !" (22/12/2003), "Dirladada aux E-Magiciens…", "Voyage voyage…", "Tu veux
  ou tu veux pas du logo Dofus…"; INFERRED: these riff on French pop-song titles/lyrics. Jokey body text: "(lol)", "bande de
  petits veinards" (`pages/dofus.com_home-home.asp_20031006.html`), "Merci Khalzaam ;)" (`pages/dofus.com_index.php_20040122.html`). Taglines: "Jeu de rôle tactique multijoueurs" (2003 page title),
  "Seul ou à plusieurs, découvrez un univers sans limite", "Une nouvelle dimension du Jeu sur Internet",
  "le premier jeu de rôle massivement multijoueur développé intégralement en Flash MX®" (`pages/dofus.com_presentation_20040124.html`),
  "partez à la recherche des 6 précieux Dofus et devenez maître d'Amakna" (`pages/dofus.com_root_20040727.html`).

Palette summary: `#2F9BDA` main blue · `#FF9900` orange · `#EFEFEF` card grey · `#1275CA` / `#1375C9` ribbon and ID-bar blue · `#2A82CE`
sub-title blue · `#57AEE1` light blue · `#08518C` input border · `#444/#555/#666` text greys · white page · logo
`#0C0604` outline, `#EAC74C` / `#EFD68E` golds, `#62351F` brown.

Old 2003 ASP skin (OBSERVED, `css/dofus.com_style.css_20031202.css`, also reused by the 2004 forum and by
`pages/presse/style.css`): body `#37A6DF`, white Verdana 11 px, links white (base `#FFFFAA`), cells `#258DD4`, frame/title
`#0A508E` / `#08518C` / `#0D528D`, orange button `#FF6533`. The 2003 HTML also uses table `bgcolor` `#1465A2`
(`pages/dofus.com_home-home.asp_20031006.html`).

## Files

### pages/

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `dofus.com_root_20030628.html` | 2003-06-28 05:00:03 | `http://www.dofus.com/` | Placeholder page: "DOFUS sera bientôt disponible", Verdana 11 px `#3A6EA5` |
| `dofus.com_accueil-accueil.asp_20031115.html` | 2003-11-15 03:33:56 | `http://www.dofus.com/accueil/accueil.asp` | Old splash: 788 px table, 1 px `#0A508E` frame, 10 px `#37A6DF` padding, images `illu3_1/2.jpg`, `ligne01.jpg`, `logo.jpg`, `texte.gif`, `entrer.jpg` → `/home/home.asp`, `cop.gif`. Title "DOFUS - Jeu de rôle tactique multijoueurs" |
| `dofus.com_root_20031206.html` | 2003-12-06 23:27:41 | `http://dofus.com/` | The same splash served at `/` (the `illuN` pair rotates: `illu0` on 2003-10-18, `illu1` here) |
| `dofus.com_home-home.asp_20031006.html` | 2003-10-06 10:58:05 | `http://dofus.com/home/home.asp` | Old ASP inner home page. Counters "BETA-TESTS : Nombre d'inscrits 1602 / Testeurs recrutés 79 / Places restantes 421/500"; news 01/10/2003 "Je voulais te dire que je t'attends... Dofus!" announces the beta start "le 15 octobre 2003"; 23/09/2003 "C'est quand le Bonheur ? C'est quand le Dofus ?". Table cells `#08518C` / `#37A6DF` / `#1465A2`, Verdana |
| `dofus.com_home-jeu_flash_multijoueur.asp_20031105.html` | 2003-11-05 23:19:32 | `http://dofus.com/home/jeu_flash_multijoueur.asp` | Old ASP SEO landing page, same skin: "Les bêta-tests ont commencé. 500 personnes y participent actuellement." News 03/11/2003 (33 players on one map in the village of Amakna; video + screenshots), 29/10/2003 (new client version: "l'accès aux bâtiments!"), 20/10/2003 (top 10 of the first beta evening) |
| `dofus.com_index.php_20040122.html` | 2004-01-22 23:41:46 | `http://www.dofus.com/index.php` | **New-site homepage closest to 5b.** News 22/12, 03/12, 20/11, 07/11/2003. "Nombre d'inscrits à Dofus : 4904", "Nombre de testeurs : 560". Title images still `.jpg` |
| `dofus.com_root_20040128.html` | 2004-01-28 04:22:20 | `http://www.dofus.com/` | Same, `.gif` titles, `<!--<link … style_130104.css>-->`, 5109 inscrits |
| `dofus.com_root_20040205.html` | 2004-02-05 23:56:26 | `http://dofus.com/` | Adds a `<noembed>` SEO block ("jeu de role massivement multijoueur… développé intégralement en Flash MX") |
| `dofus.com_index.php_20040516.html` | 2004-05-16 06:24:16 | `http://www.dofus.com/index.php` | Rebuilt right column; 17724 inscrits / 15286 testeurs |
| `dofus.com_root_20040524.html` | 2004-05-24 22:26:13 | `http://www.dofus.com/` | Late-beta homepage |
| `dofus.com_root_20040727.html` | 2004-07-27 14:08:22 | `http://www.dofus.com/` | Last beta-era homepage before the 2004-08-29 redesign |
| `dofus.com_page-informations_20040121.html` | 2004-01-21 11:14:22 | `http://dofus.com/?page=informations` | Inner page "Toutes les news de Dofus"; left menu News / Présentation de Dofus / Actuellement en bêta-tests / Abonnement / Sondages / Screenshots |
| `dofus.com_news1_20040121.html` | 2004-01-21 11:19:25 | `…?page=informations&rubrique=news1&contenu=news1` | 22/12/2003 "Oui, oui, tout a changé et tout, tout va cartonner… Hé ! Hé !" (new site, new beta, new forums) |
| `dofus.com_news2_20040121.html` | 2004-01-21 11:26:25 | `…rubrique=news2…` | 03/12/2003 "Dirladada aux E-Magiciens…"; announces wider access with 4b |
| `dofus.com_news3_20040121.html` | 2004-01-21 11:34:11 | `…rubrique=news3…` | 20/11/2003 "Voyage voyage…" (E-Magiciens, Valenciennes) |
| `dofus.com_news4_20040123.html` | 2004-01-23 03:31:47 | `…rubrique=news4…` | 07/11/2003 "Tu veux ou tu veux pas du logo Dofus…" (logo poll) |
| `dofus.com_presentation_20040124.html` | 2004-01-24 15:58:59 | `…rubrique=presentation…` | "Présentation de Dofus": "Seul ou à plusieurs, découvrez un univers sans limite", "le premier jeu de rôle massivement multijoueur développé intégralement en Flash MX®", 10 guildes, 6 Dofus |
| `dofus.com_abonnement_20040124.html` | 2004-01-24 16:02:48 | `…rubrique=abonnement…` | Planned free/paid versions, "5€/mois" |
| `dofus.com_inscription_20040123.html` | 2004-01-23 03:41:23 | `http://dofus.com/?page=inscription` | "S'inscrire aux bêta-tests de Dofus: … 650 joueurs sélectionnés testent Dofus !" sign-up form |
| `dofus.com_page-explorations_20040315.html` | 2004-03-15 04:28:37 | `http://www.dofus.com/?page=explorations` | Menu: L'histoire / La province / Les guildes / Le bestiaire / La population |
| `dofus.com_page-bonus_20040201.html` | 2004-02-01 09:50:02 | `http://dofus.com/?page=bonus` | Menu: Genèse de Dofus / Vidéos / Fonds d'écrans / Chat IRC |
| `dofus.com_page-presse_20040213.html` | 2004-02-13 03:41:12 | `http://www.dofus.com/?page=presse` | Menu: Documents Presse / Communiqués / Revue de Presse / Iconographie / Vidéos / Partenaires |
| `dofus.com_pages-presse-espace_presse.php_20040122.html` | 2004-01-22 23:41:54 | `http://www.dofus.com/pages/presse/espace_presse.php` | 750×700 press pop-up (old blue skin, `frise.jpg` + `haut.jpg` header) listing the press kit downloads |
| `dofus.com_pages-presse-partenaires.php_20040130.html` | 2004-01-30 03:17:21 | `http://www.dofus.com/pages/presse/partenaires.php` | Partners: CNC, Conseil Régional Nord-Pas de Calais, ANVAR; "membre de l'Arc Numérique" |
| `jouer.dofus.com_betatest_20031101.html` | 2003-11-01 15:35:49 | `http://jouer.dofus.com/betatest/` | Tester login "Accéder à ton compte" (tutoiement), old ASP skin, banner "Jeu de rôle tactique multijoueurs - Bêta-test ouverte le 15 octobre 2003", form table `#0A508E` / `#258DD4` |
| `jouer.dofus.com_betatest-forgetAccount.php_20031102.html` | 2003-11-02 00:59:35 | `http://jouer.dofus.com/betatest/forgetAccount.php` | Lost login/password page, same skin |
| `jouer.dofus.com_sinscrire-betatest.php_20031107.html` | 2003-11-07 03:21:09 | `http://jouer.dofus.com/sinscrire/betatest.php` | Beta sign-up, old skin |
| `jouer.dofus.com_sinscrire-betatest.php_20031209.html` | 2003-12-09 12:52:00 | same | Same page: "plus de 500 joueurs sélectionnés" |
| `jouer.dofus.com_js-menu_dyn.js_20031102.js.txt` | 2003-11-02 01:02:54 | `http://jouer.dofus.com/js/menu_dyn.js` | Menu script of the old skin (renamed `.txt`; data only) |
| `jouer.dofus.com_login.php_20040212.html` | 2004-02-12 03:03:33 | `http://jouer.dofus.com/login.php` | Body `#203040`, centred table with 2 px white frame → black table → 742×550 `files/login/swf/DofusLogin.swf` |
| `jouer.dofus.com_root_20040225.html` | 2004-02-25 07:17:33 | `http://jouer.dofus.com/` | Flash-detection page on `#203040` → `login.php` / `alternate.html` |
| `jouer.dofus.com_alternate.html_20040421.html` | 2004-04-21 04:03:16 | `http://jouer.dofus.com/alternate.html` | "Vous ne disposez pas de la version la plus récente de Macromedia Flash Player" (white/red on `#203040`) |
| `forum.dofus.com_root_20040110.html` | 2004-01-10 22:36:39 | `http://forum.dofus.com/` | ASP forum index (same HTML as `ankama-studio.com/forumdofus/`): "Site Dofus > Forums Dofus", table `forumListe` |
| `forum.dofus.com_category_view.asp-cid6_20040113.html` | 2004-01-13 22:06:56 | `http://forum.dofus.com/category_view.asp?cid=6` | **Captured on 5b day**: "[Role Play] La vie à Dofus" topic list (first topic "[HRP] Règles du Topic" by Kam) |
| `forum.dofus.com_default.asp_20040114.html` | 2004-01-14 23:13:01 | `http://forum.dofus.com/default.asp` | Forum index, 14 Jan 2004 |
| `forum.dofus.com_Autres-Divers_20040203.html` | 2004-02-03 16:25:22 | `http://forum.dofus.com/Autres/Divers` | The new forum after 2004-02-02. CSS: `css/forum.dofus.com_style-default-default.css_20040413.css` (later capture); its `/res/*` images are not archived |
| `ankama-studio.com_forumdofus_20040108.html` | 2004-01-08 21:57:12 | `http://www.ankama-studio.com/forumdofus/` | The same ASP forum at its original address, five days before 5b |
| `ankama-studio.com_forumdofus-category_view.asp-cid6_20040113.html` | 2004-01-13 07:21:55 | `http://www.ankama-studio.com/forumdofus/category_view.asp?cid=6&p=1` | Same category, 5b day |
| `ankama-studio.com_root_20030623.html` | 2003-06-23 05:24:27 | `http://www.ankama-studio.com/` | Flash-detection page of the studio site ("Studio de création de jeux flash multijoueur (Dofus, Moon)") |
| `ankama-studio.com_accueil.html_20030818.html` | 2003-08-18 13:05:04 | `http://www.ankama-studio.com/accueil.html` | 100 % Flash studio page embedding `Ankama Studio.swf` on white |

### css/

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `dofus.com_style.css_20030805.css` | 2003-08-05 07:31:32 | `http://www.dofus.com/style.css` | Old ASP-site CSS (`body #37A6DF`). Differs from the next file only in `A:link.lienshaut` colour (`#37A6DF`) |
| `dofus.com_style.css_20031202.css` | 2003-12-02 23:21:47 | `http://dofus.com/style.css` | Old ASP-site CSS (same digest 2003-10-06). Byte-identical to `ankama-studio.com_forumdofus-style.css_20040109.css` and `dofus.com_pages-presse-style.css_20040130.css` |
| `dofus.com_style.css_20040423.css` | 2004-04-23 03:13:43 | `http://dofus.com/style.css` | **2004 site CSS** (same digest on 2004-04-23 and 2004-06-23); the closest archived CSS to Jan 2004 |
| `dofus.com_style.css_20040821.css` | 2004-08-21 03:49:08 | `http://dofus.com/style.css` | Content-page subset, just before the redesign |
| `dofus.com_pages-presse-style.css_20040130.css` | 2004-01-30 03:18:35 | `http://www.dofus.com/pages/presse/style.css` | Press pop-up CSS (= old blue CSS) |
| `ankama-studio.com_forumdofus-style.css_20040109.css` | 2004-01-09 20:45:09 | `http://www.ankama-studio.com/forumdofus/style.css` | Forum base CSS (= old blue CSS) |
| `ankama-studio.com_forumdofus-style_forum.css_20040121.css` | 2004-01-21 04:46:02 | `http://www.ankama-studio.com/forumdofus/style_forum.css` | Forum tables: `forumListe` bg `#0D528D`, cells `#258DD4`, alternating rows `#258DD4` / `#1777C0`, sticky `#0099FF`, admin `#D4D0C8`, path `#0D528D` 14 px bold |
| `forum.dofus.com_style.css_20040113.css` | 2004-01-13 22:21:32 | `http://forum.dofus.com/style.css` | **ASP-forum CSS on 5b day.** Byte-identical to `ankama-studio.com_forumdofus-style.css_20040109.css` (= old blue CSS) |
| `forum.dofus.com_style_forum.css_20040113.css` | 2004-01-13 22:25:53 | `http://forum.dofus.com/style_forum.css` | Byte-identical to `ankama-studio.com_forumdofus-style_forum.css_20040121.css` |
| `forum.dofus.com_style-default-default.css_20040413.css` | 2004-04-13 12:08:34 | `http://forum.dofus.com/style/default/default.css` | New-forum CSS (forum opened 2004-02-02): `#all` 750 px, centred, margin-top 15 px, 1 px black border; `#top` uses `/res/bandeau_anim_dofus.gif`; `#menu` `#F90` with bold white links; `#content` `#EFEFEF` + `/res/Fond_vague.gif`; category band `#1375C9` + `/res/Bande_Titre_Debut.png`, 17 px bold title; text `#525252`, links `#1275CA`, Verdana 11 px |
| `dofus.com_style_home.css_20040816.css` | 2004-08-16 10:12:01 | `http://dofus.com/style_home.css` | Homepage CSS linked by `pages/dofus.com_root_20040727.html`. Same class names as the 2004 `style.css` (`.columnleft` `#2F9BDA`, footer `#FF9900` / `#555555`), plus `#57AEE1` and `#D2E7F4` |
| `jouer.dofus.com_css-style.css_20040729.css` | 2004-07-29 07:07:02 | `http://jouer.dofus.com/css/style.css` | Later jouer CSS (= old CSS with `body #29261F`) |

### img/

Dimensions are W×H px. "Post-beta capture" means the 2004 CSS references this exact filename, but the only capture
is from 2005, so the file may have changed since 2004.

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `dofus.com_pages-presse-kits-dofusbig_20040304.png` | 2004-03-04 01:16:35 | `http://www.dofus.com/pages/presse/kits/dofusbig.png` | **Official Dofus logo, 1000×521 RGBA, transparent.** Carved gold letters, dark outline `#0C0604`, golds `#EAC74C` / `#EFD68E`, brown `#62351F` |
| `dofus.com_pages-presse-kits-ankamamedium_20040304.png` | 2004-03-04 00:14:11 | `…/pages/presse/kits/ankamamedium.png` | Ankama Studio logo 400×119 RGBA (blue wordmark + "iii" figure mark) |
| `dofus.com_pages-presse-kits-ankamasmall_20040304.png` | 2004-03-04 00:39:38 | `…/pages/presse/kits/ankamasmall.png` | Same, 100×30 |
| `dofus.com_pages-presse-docs-DOFUS_fichetechnique_20040124.pdf` | 2004-01-24 13:03:38 | `…/pages/presse/docs/DOFUS_fichetechnique.pdf` | 1-page fact sheet "DOFUS – Innovations Techniques", dated 26 novembre 2003, orange headings, "L'aventure commence au 1er trimestre 2004", screenshots of the 2003 client and editors |
| `dofus.com_pages-presse-docs-AnkamaStudio_dossierdepresse_20040114.pdf` | 2004-01-14 06:39:29 | `…/pages/presse/docs/AnkamaStudio_dossierdepresse.pdf` | 5-page Ankama Studio press kit (PDF 1.4) |
| `dofus.com_pages-presse-images-frise_20040124.jpg` | 2004-01-24 05:46:35 | `…/pages/presse/images/frise.jpg` | 750×46 strip of an isometric game map (village, trees, river): press pop-up top |
| `dofus.com_pages-presse-images-haut_20040124.jpg` | 2004-01-24 06:09:50 | `…/pages/presse/images/haut.jpg` | 542×52 blue gradient bar (`#0084E9` / `#085DA6`) with a small Dofus logo |
| `dofus.com_pages-presse-images-fond_gauche_20040124.gif` | 2004-01-24 05:12:18 | `…/pages/presse/images/fond_gauche.gif` | 123×1 left-column fill `#37A6DF` with a `#258DD4` edge |
| `dofus.com_img-titre_news_20040331.gif` | 2004-03-31 04:47:05 | `http://www.dofus.com/img/titre_news.gif` | 190×65 window title "NEWS" (blue ribbon, red-haired swordsman) |
| `dofus.com_img-titre_parle_20040331.gif` | 2004-03-31 05:28:04 | `…/img/titre_parle.gif` | 190×65 "ON PARLE DE DOFUS" (Bouftou) |
| `dofus.com_img-titre_jouerbeta_20040331.gif` | 2004-03-31 04:10:29 | `…/img/titre_jouerbeta.gif` | 190×65 "JOUER A LA BETA" (Cra-like archer) |
| `dofus.com_img-titre_forum_20040331.gif` | 2004-03-31 02:28:08 | `…/img/titre_forum.gif` | 190×65 "SUR LES FORUMS" (character with horned helmet) |
| `dofus.com_img-img_illu_20040405.gif` | 2004-04-05 04:53:46 | `…/img/img_illu.gif` | 190×198 "Jouer à la bêta" illustration (Dofus logo, rock golem + adventurers in bracket frame) |
| `dofus.com_img-t-shirt_20040331.gif` | 2004-03-31 01:50:37 | `…/img/t-shirt.gif` | 170×145 "T-Shirt DOFUS 15€" |
| `dofus.com_img-pct_id_20040405.gif` / `pct_comptoir` / `pct_sondage` | 2004-04-05 10:05:53 / 09:31:40 / 13:24:11 | `…/img/pct_*.gif` | 40×22 right-column title pictos (orange "?" / "B" sign / bar chart on blue slant) |
| `dofus.com_img-pct_plan_20040405.gif` / `pct_presse` | 2004-04-05 11:25:57 / 12:02:45 | `…/img/pct_*.gif` | 170×30 grey `#DADADA` bars "Plan du Site" / "Espace Presse" with orange round icon |
| `dofus.com_img-btvalider_20040405.gif` / `btvoter` | 2004-04-05 02:48:08 / 04:00:52 | `…/img/bt*.gif` | 70×21 / 70×18 orange `#FF9801` pill buttons "Validation" / "Voter" |
| `dofus.com_img-logocnc_20040405.gif` / `logoconseil` | 2004-04-05 07:45:02 / 08:36:12 | `…/img/logo*.gif` | 78×22 CNC, 34×46 Région Nord-Pas de Calais (white on blue) |
| `dofus.com_img-screen-02…05_20040330.jpg`, `-07_20040331.jpg` | 2004-03-30 / 31 | `…/img/screen/0N.jpg` | 76×44 screenshot thumbnails (village, shop, forge, whale, meeting); `01` and `06` not archived |
| `dofus.com_img-screen-grand-07_20040507.jpg` | 2004-05-07 20:30:33 | `http://dofus.com/img/screen/grand/07.jpg` | 500×300 full screenshot "Réunion en Amakna" |
| `dofus.com_img-bordure_fenetre_20050124.gif` | 2005-01-24 05:23:04 | `…/img/bordure_fenetre.gif` | 5×71 rounded left edge of the grey cards. Post-beta capture |
| `dofus.com_img-point_bleu_20050124.gif` / `point_blanc` | 2005-01-24 05:23:06 / 05:22:59 | `…/img/point_*.gif` | 5×2 dotted-separator tile: one anti-aliased `#2F9BDA` dot on `#EFEFEF`. Despite its name, `point_blanc` is the same tile mirrored. Post-beta capture |
| `dofus.com_img-test_blue_20050124.gif` | 2005-01-24 05:22:56 | `…/img/test_blue.gif` | 170×1 `#2F9BDA` left-column fill (`#main1` background). Post-beta capture |
| `dofus.com_img-bordure_menu_page_20050126.gif` | 2005-01-26 00:49:04 | `…/img/bordure_menu_page.gif` | 157×5 inner-menu separator (brown `#88501B` beads on white; Jan-2005 digest, changed again Jun 2005). Post-beta capture |
| `dofus.com_accueil-images-cop_20031221.gif` | 2003-12-21 23:04:05 | `http://dofus.com/accueil/images/cop.gif` | 392×31 old-splash footer "www.dofus.com >>> / <<< © Copyright Ankama-Studio" (spaced caps, on `#37A6DF`) |
| `dofus.com_accueil-images-illu2_1_20031221.jpg` | 2003-12-21 23:31:09 | `http://dofus.com/accueil/images/illu2_1.jpg` | 332×165 top of an old-splash illustration (only light-blue sky survives) |
| `dofus.com_images-accueil_r1_c9_20030806.gif` | 2003-08-06 03:49:07 | `http://www.dofus.com/images/accueil_r1_c9.gif` | 194×103 old-ASP-site header slice: bearded old man with a staff and a pink pig-like creature on dark rocks, blue `#1871B5` background |
| `dofus.com_images-accueil_r5_c1_20030806.gif` | 2003-08-06 04:27:50 | `…/images/accueil_r5_c1.gif` | 326×90 footer slice: Ankama Studio logo, "© 2003- Tous droits réservés", faint character silhouettes, `#37A5DF` with `#248CD3` swooshes |
| `dofus.com_images-accueil_r5_c6_20030806.gif` | 2003-08-06 04:43:15 | `…/images/accueil_r5_c6.gif` | 412×90 footer slice: blue swooshes (`#37A5DF` / `#258DD4`) |
| `dofus.com_images-bt_galerie_20030806.gif` / `bt_musiques` | 2003-08-06 05:00:44 / 05:17:51 | `…/images/bt_*.gif` | 118×31 / 45×30 round red-orange buttons (brush / music note) on a white wave over `#37A6DF` |
| `dofus.com_home-images-screen3_20030806.gif` | 2003-08-06 00:45:42 | `http://www.dofus.com/home/images/screen3.gif` | 98×60 screenshot thumbnail (village of huts) |
| `dofus.com_favicon_20030805.ico` | 2003-08-05 14:05:17 | `http://www.dofus.com/favicon.ico` | 16×16 favicon (same digest 2003-11-01) |
| `jouer.dofus.com_images-logo_20040728.gif` | 2004-07-28 19:25:04 | `http://jouer.dofus.com/images/logo.gif` | 145×77 Dofus logo on white (GIF) |
| `jouer.dofus.com_images-btn_download_beta_20040728.gif` | 2004-07-28 19:13:59 | `…/images/btn_download_beta.gif` | 129×36 orange `#FF6600` button "Télécharger la version bêta" |
| `jouer.dofus.com_images-bt_valider_20040728.gif` | 2004-07-28 18:41:54 | `…/images/bt_valider.gif` | 55×18 orange pill "Valider" |
| `ankama-studio.com_forumdofus-images-pictoOurs2_20040520.gif` | 2004-05-20 11:52:00 | `http://www.ankama-studio.com/forumdofus/images/pictoOurs2.gif` | 37×50 forum bear picto |
| `ankama-studio.com_forumdofus-img-smiley1_20040718.gif` | 2004-07-18 07:54:15 | `…/forumdofus/img/smiley1.gif` | 20×20 yellow grimacing smiley |
| `forum.dofus.com_style-avatar-pictoCrabe_20040414.gif` / `pictoSnootz_20040627` | 2004-04-14 13:18:47 / 2004-06-27 00:45:09 | `http://forum.dofus.com/style/avatar/picto*.gif` | 80×80 new-forum avatars (crab; horned creature with red eyes) on transparent. Also archived but not fetched: `pictoSirano`, `pictoSnaki`, `pictoSnaki2` (2004-08-21) |
| `forum.dofus.com_style-images-fr-bt_repondre_20040719.gif` | 2004-07-19 05:37:20 | `…/style/images/fr/bt_repondre.gif` | 114×23 new-forum button "Répondre" (light grey, blue bold text, icon) |
| `ankama-studio.com_Flash_Plug-ins-install_flash-images-Logo_Ankama_Studio_20030627.jpg` | 2003-06-27 16:15:15 | `http://www.ankama-studio.com/Flash_Plug-ins/install_flash/images/Logo_Ankama_Studio.jpg` | 235×51 Ankama Studio logo |

### swf/ and swf-export/

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `swf/dofus.com_swf-bandeau_20040123.swf` | 2004-01-23 04:16:25 | `http://dofus.com/swf/bandeau.swf?choix1=9&choix2=16` | **Header closest to 5b** (digest WLZ2…, the only version before 2004-01-30). "Forums" → `http://www.ankama-studio.com/forumdofus/`, logo → `/index.php?page=accueil`, others → `/index.php?page=inscription|explorations|informations|bonus|contacts` |
| `swf/dofus.com_swf-bandeau_20040130.swf` | 2004-01-30 02:56:23 | `…bandeau.swf?choix1=19&choix2=7` | Digest WBR2…: "Forums" → `http://forum.dofus.com` |
| `swf/dofus.com_swf-bandeau_20040213.swf` | 2004-02-13 06:28:24 | `…bandeau.swf?choix1=4&choix2=19` | Digest ECP7…: adds the Tofu rollover bubble (third frame) |
| `swf/dofus.com_swf-bandeau_20040712.swf` | 2004-07-12 23:20:17 | `…bandeau.swf?choix1=19&choix2=11` | Digest 5UI7…: "Contacts" → "Questions ?" |
| `swf/dofus.com_swf-teaser_20040329.swf` | 2004-03-29 09:45:04 | `http://www.dofus.com/swf/teaser.swf` | 170×72 left-column "TEASER" box (orange band, hooded character thumbnail) |
| `swf/ankama-studio.com_Ankama_Studio_20040609.swf` | 2004-06-09 03:16:12 | `http://www.ankama-studio.com/Ankama%20Studio.swf` | Studio site: "Ankama Studio" logo, blue gradient with a silhouetted landscape, pixel-art runners over nav News / Présentation / Projets / Détente / Atelier / Labo / Liens / Contact; fonts Bandy + Verdana |

JPEXS exports (`tools/ffdec.sh -onerror ignore -format script:as,shape:svg,frame:png,font:ttf,text:plain,image:png_gif_jpeg -export script,text,font,image,shape,frame <out> <swf>`; sprites/buttons with `-format sprite:png,button:png -export sprite,button`, multi-frame sprites pruned to 1–3 frames):

- `swf-export/bandeau_20040123/frames/2.png`: **750×139 header as displayed** (static parts only; `frames/1.png` is the loading state on white).
- `…/images/22.png`: 154×84 gold Dofus logo bitmap. `…/sprites/DefineSprite_24/1.png`: 206×112 logo with its frame.
- `…/sprites/DefineSprite_13,14,18`: rune-circle star medallion that animates into a red "VS" badge (543×543 / 177×177).
- `…/sprites/DefineSprite_61/{1,9,17}.png`: 228×90 loading bar with two crossing daggers. `DefineSprite_60`: dagger.
- `…/sprites/DefineSprite_34/1.png`: 66×18 UK + DE flags. `…/sprites/DefineSprite_77/1–7.png`: 742×69 rollover-text states.
- `…/buttons/DefineButton2_47…52`: 106×19 nav buttons (4 states each). `…/shapes/*.svg`: 29 vector shapes.
- `…/fonts/37_Verdana.ttf` (Verdana **Bold** subset, 26 glyphs: nav labels 11 px white), `53_Verdana.ttf` (regular, 37 glyphs:
  rollover lines 10 px white, "Loading" 15 px), `15_Wide awake.ttf` (6 glyphs: the "VS", 60 px black). Subsets only.
- `…/texts/*.txt`, `…/scripts/**.as`: nav labels, rollover lines, `getURL` targets, `loadMovie("swf/perso/" + choix + ".swf")`.
- `swf-export/bandeau_20040130|20040213|20040712/`: frames, texts and scripts only (for comparison).
- `swf-export/teaser_20040329/`: `frames/1.png` 170×72, `images/18.png` (550×400 dark-blue cloak silhouette), `images/2.jpg`.
- `swf-export/ankama_studio_20040609/`: `frames/1.png` 750×450, texts, `fonts/32_Bandy.ttf` (27 glyphs), shapes.

## Renders (renders/)

Method: `bun` + CDP against a throwaway headless Chrome (fresh `/tmp` profile, not the user's browser; the
chrome-devtools MCP could not attach because its profile was locked). Viewport 1024×768, deviceScaleFactor 1.
`Emulation.setScriptExecutionDisabled(true)`, and every request was intercepted (`Fetch`) and fetched serially with
backoff; `*ruffle*` / `*.swf` were failed. So **Flash areas show Chrome's "Adobe Flash Player is no longer supported"
placeholder**; the header's look is `swf-export/bandeau_20040123/frames/2.png`. URLs: `https://web.archive.org/web/<ts>if_/<original>`.
`<name>_requests.txt` lists every response actually served (status + resolved Wayback timestamp), so you can check
which capture of each sub-resource Wayback substituted.

"CSS served" is the stylesheet capture that Wayback actually returned, which can differ from the page date (nearest-capture
substitution). Image counts are 200 vs 404/redirect; a 200 can still be a 2011 HTML page, which shows as a broken image.

| Render (`renders/<name>_1024x768.png`, `_full.png`) | Page capture | CSS served | Result |
|---|---|---|---|
| `RECONSTRUCTED_dofus.com_index.php_20040122` | 2004-01-22 23:41:46 | `css/dofus.com_style.css_20040423.css` (local copy) | **INFERRED approximation of the 5b-era homepage**, not a Wayback render. Source kept as `renders/RECONSTRUCTED_dofus.com_index.php_20040122_source.html.txt` (its `_requests.txt` shows `/tmp` paths). Built from `pages/dofus.com_index.php_20040122.html`: header `<object>` → `swf-export/bandeau_20040123/frames/2.png`, teaser → `swf-export/teaser_20040329/frames/1.png`, `img/*.jpg` titles → the archived `.gif` versions (2004-03/04), CSS → April 2004. Still missing: left welcome panel `bandeau_gauche.gif`, screenshots 01/06, header backdrop and characters. Full height 1569 px |
| `dofus.com_index.php_20040122` | 2004-01-22 23:41:46 | `style.css` @ 2003-12-02 (**old 2003 CSS, mismatch**) | Unstyled blue page; 7 images ok, 9 missing (all Jan `.jpg` titles). Shows why the reconstruction was needed |
| `dofus.com_betatests_20040124` | 2004-01-24 16:00:53 | `style.css` @ 2003-12-02 (mismatch) | Inner page, unstyled blue. HTML copy is in `vendor/wayback-dofus-2004/pages/` |
| `dofus.com_root_20040205` | 2004-02-05 23:56:26 | `style.css` @ 2003-12-02 (mismatch) | Unstyled blue; 21 images ok, 3 missing. Full height 2455 px |
| `dofus.com_page-explorations_20040315` | 2004-03-15 04:28:37 | `style.css` @ 2004-04-23 | **Coherent** inner page: blue left menu, white content column, right column (IDENTIFICATION, COMPTOIR DOFUS t-shirt, SONDAGE). Only `pct_menu_page.gif` missing |
| `dofus.com_index.php_20040516` | 2004-05-16 06:24:16 | `style.css` @ 2004-04-23 | **Coherent** homepage (27 images ok; missing `screen/01`, `06`, `logoanvar`, `pct_eurolan`). Full height 1841 px |
| `dofus.com_root_20040727` | 2004-07-27 14:08:22 | `style_home.css` @ 2004-08-16 | **Coherent** homepage with its own-period CSS and the "BIENVENUE SUR DOFUS" welcome text (20 images ok; missing `teaser.gif`, `logoanvar`, `titre_debuteracc`, `pct_sondage`). Full height 970 px |
| `dofus.com_pages-presse-espace_presse.php_20040122` | 2004-01-22 23:41:54 | `pages/presse/style.css` @ 2004-01-30 | Press pop-up in the old blue skin with `frise.jpg` + `haut.jpg`; `bt_fermer.gif`, `titre_presse.gif` missing |
| `dofus.com_root_20030628` | 2003-06-28 05:00:03 | none | Placeholder text on white |
| `dofus.com_accueil-accueil.asp_20031115` / `dofus.com_root_20031206` | 2003-11-15 / 2003-12-06 | `style.css` @ 2003-12-02 | Old splash: `#37A6DF` page, framed table; most illustration images are broken (archived only as 302s or 2006 HTML) |
| `jouer.dofus.com_betatest_20031101` / `jouer.dofus.com_sinscrire-betatest.php_20031209` | 2003-11-01 / 2003-12-09 | resolved to a 2011 `www.dofus.com/fr` HTML page (junk) | Unstyled. Only the HTML tables (`#0A508E` / `#258DD4` form blocks) show; the "200" images are 2011 HTML |
| `jouer.dofus.com_login.php_20040212` | 2004-02-12 03:03:33 | none | `#203040` page, white-framed box, Flash placeholder |
| `jouer.dofus.com_root_20040225` | 2004-02-25 07:17:33 | none | Empty `#203040` page (the Flash-detection script did not run) |
| `ankama-studio.com_forumdofus_20040108` | 2004-01-08 21:57:12 | forumdofus `style.css` @ 2004-01-09 + `style_forum.css` @ 2004-01-21 | **Coherent** ASP forum index: `#37A6DF` page, `#0D528D` table, `#258DD4` / `#1777C0` rows, white Verdana |
| `forum.dofus.com_root_20040110` | 2004-01-10 22:36:39 | `style.css` + `style_forum.css` @ 2004-01-13 | Same ASP forum, coherent |
| `forum.dofus.com_category_view.asp-cid6_20040113` | 2004-01-13 22:06:56 | same @ 2004-01-13 | **5b-day forum**: "[Role Play] La vie à Dofus" topic list; icons are 2011 junk |
| `forum.dofus.com_Autres-Divers_20040203` | 2004-02-03 16:25:22 | `style/default/default.css` @ 2004-04-13 | New forum in the 2004 frame (orange menu, blue category band, orange-headed table on `#EFEFEF`); logo/banner images are 2011 junk |
| `ankama-studio.com_root_20030623` / `ankama-studio.com_accueil.html_20030818` | 2003-06-23 / 2003-08-18 | none | Flash-only pages: blank / Flash placeholder on white |

## Not archived (checked with CDX; "–" = no capture at all)

- **January-2004 CSS**: `style.css` has captures only for 2003-08…12 (old skin) and 2004-04-23 onward; `style_130104.css`: –.
- Header sub-movies `swf/decor.swf`, `swf/clipperso.swf`, `swf/perso/*.swf`: only 2011+ crawler 301/404s.
- Jan-2004 `.jpg` titles (`img/titre_news|titre_parle|titre_jouerbeta|titre_forum|img_illu|logoconseil|t-shirt.jpg`): –
  (the `.gif` versions used from 2004-01-28 are archived, 2004-03-31 / 04-05).
- `img/bandeau_gauche.gif` (left welcome panel 170×362), `img/fond_menu_page.gif`, `img/pct_menu_page.gif`,
  `img/bouton.gif`, `img/titre_informations|explorations|bonus|debuteracc.gif`, `img/teaser.gif`, `img/logoanvar.gif`,
  `img/pct_ami.gif`, `img/pct_eurolan.gif`, `img/screen/01.jpg`, `06.jpg`: – (or 2011 404 only).
- `pages/img/marque1|2|3.gif` (content-title bullets), `pages/informations/img/screenshots/*` (see the 2004 folder), `pages/informations/img/infos.jpg`: –.
- Old ASP splash art `accueil/images/logo.jpg`, `texte.gif`, `ligne01.jpg`, `entrer.jpg`, `illu*_2.jpg`: 302s or 2006 HTML only.
- jouer.dofus.com 2003 skin images (`images/accueil_r1_c1.gif`, `haut_bleu_*.gif`, `milieu_centre_*.gif`, `betatest/images/titre_acceder.gif`, `images/bt_valider.gif` of 2003) and its `style.css`: – (only 2004-07 images exist).
- New forum (Feb 2004) images `forum.dofus.com/res/*` (`logo_Dofus.gif`, `bandeau_anim_dofus.gif`, `Fond_vague.gif`,
  `Bande_Titre_Debut.png`, `Bande_Orange_0*_page2.gif`, …): only 2011 captures that return HTML. Its CSS is archived
  (2004-04-13), as are three `style/` images (see css/ and img/).
- Old ASP forum icons `forum.dofus.com/img/icon*.gif`, `images/bt_ajoutersujet.gif`: 2011 HTML only.
