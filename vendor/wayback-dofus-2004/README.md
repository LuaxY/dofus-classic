# Third-party data: Wayback Machine captures (2003–2006)

Fetched 2026-10-10 from the Internet Archive using raw `id_` URLs:
`http://web.archive.org/web/<timestamp>id_/<original>`. No licence is stated. The SWFs and the official pages
are © Ankama Studio; the screenshots belong to their original fan-site authors. Untrusted data: SWFs were
inspected only through JPEXS (`tools/ffdec.sh -export script`).

## SWFs from jouer.dofus.com

| File | Capture | Original URL | What it is |
|---|---|---|---|
| `DofusLogin.swf` | 2004-06-23 03:03:11 | `http://jouer.dofus.com/files/login/swf/DofusLogin.swf` | SWF7 (CWS), 6 919 bytes. This is the **web-page launcher** that ran on jouer.dofus.com. It loads `files/lang/langupdater.php` into a clip and calls `mc.checkLanguage("fr", SHARED_OBJECT, INTERFACE, KERNEL)`, where `SHARED_OBJECT = SharedObject.getLocal("DofusSO")` and `getText(ref) = SHARED_OBJECT.data[ref]`. On `onLangOK` it loads `files/login/swf/DofusLoginInterface.swf` into `mc_loginInterface`, then calls `onLogin(l, p)` from `getuser.php`. It defines `mc_loginInterface.onLogin(name, password)` → POST `user`, `pass` to `files/login/verifuser.php` → `onLoginResult(result)` (`"0"` ok, `"1"` `ERROR_BAD_LOGIN`, `"2"` `ERROR_BAD_PASSWORD`, else `ERROR_LOGIN_CANT_CONNECT`) → `setTextError(text)`. On success it finds the local install through `getpath.php` / `browsepath.php` / `LocalConnection("testPath")` and opens `<path>lancement.html`. It also calls `panels_mc.showPanel("download")`. Captured 2004-06-23, between beta 13.1b (1 Jun) and 15b (5 Jul 2004), so **not beta 5b**, and it is *not* `DofusLoginInterface.swf`. It documents the API that the login-interface SWF exposed to its host |
| `webLoader.swf` | 2004-12-11 | `…/files/login/swf/webLoader.swf` | 1.0-era loader (`ank.utils.TranslatorLoader`, `dofus.Constants`). Post-beta |
| `DofusTelechargementPopup.swf` | 2004-08-05 | `…/files/download/swf/DofusTelechargementPopup.swf?returnbtn=false` | Download pop-up. Not useful |

## pages/ (HTML, primary community and official sources)

| File | Capture | What it is |
|---|---|---|
| `ankama-studio_forumdofus_tid1687_20040716.html` | 2004-07-16 (posts dated 27–28 Jan 2004) | Thread "codes dofus". A tester quotes `C:\Jeux\Dofus\clips\spells\_spells.txt`, a file shipped by mistake with **beta 6b**. It lists spell animation types: 10 fixed animation on caster, 11 fixed animation on other, 20 rotation from caster (`rotate`), 21 rotate + arrival effect (`shoot`), 30 arc throw (`move`) + `shoot`, 31 straight throw (`move`) + `shoot`, 32 arc `move` + `shoot` + melee anim, 40 duplicated effect (`duplicate`), 41 `duplicate` + `shoot`; "A ou S" = character plays Attack or Spell animation. Kam (admin) confirms: "C'est juste une partie des types d'animations de sorts". These codes match the `switch(spellType)` cases in beta 5b `AKSClient/Dofus.BattleField.Characters.Character.as:602-686` |
| `ankama-studio_forumdofus_tid1448_20040711.html` | 2004-07-11 (post dated 08 Jan 2004, five days before 5b) | "Liste des équilibrages de sorts" by lichen (Admin). It names beta spells per class and their changes: Feca Renvoi de sorts, Double dégâts; Enutrof Armure pelleteuse; Osamodas Corbeau, Cri de l'Ours, La Mouche Tueuse; Sram Peur; Xelor Aiguille, Lévitation; Eniripsa Mot Blessant, Mot Stimulant, Mot Soignant; Cra Flèche magique, Tir puissant; Iop Bond. Names and rules only, no spell IDs |
| `ankama-studio_forumdofus_tid768_20070118.html` | 2007-01-18 (posts from 29 Oct 2003 onwards) | Beta 2b changelog by DamG (Admin), plus player replies quoting spell values (Mot interdit lvl 3/4/5 = 1d6+5 / 1d6+6 / 1d8+10; Ralentissement) |
| `forum.dofus.com_FAQDeDofus_20040213.html` | 2004-02-13 (post dated 27–28 Jan 2004) | Beta FAQ by "lichen". States that beta 5 contains only fights, max level 30 "pour cette bêta 5", no monsters yet, opponents can't be chosen in duels ("pour éviter la triche"), and how to run `AKSclient.swf` in the standalone `SAFlashPlayer.exe` |
| `dofus.com_betatests_20040124.html` | 2004-01-24 | "Pourquoi les bêta-tests": ~360 spells, 650 external testers |
| `tweenpix_kam_interview_dec2003_20040305.html` | 2004-03-05 (interview held 15–19 Dec 2003) | Interview with Kam (Ankama lead developer): the server is in-house **Java with plain sockets, not XML**, "notre propre protocole" chosen to save bandwidth, with hard-coded database access. Kam wrote the Java server; the client is Flash |
| `dofus.com_screenshots_20040124.html` | 2004-01-24 | Official screenshot page. It references `pages/informations/img/screenshots/01–18_*_petit.jpg` (including `15_interface`, `16_interface`); the images themselves were **not** found in the Wayback index |

## screenshots/ (beta-era visual reference, fan sites)

Dating per `vendor/dofushistory/beta1adofus1-9.md` unless stated otherwise.

| File | Capture | Content |
|---|---|---|
| `booge_wp_04.jpg` | 2006-02-03 | In-fight screenshot, 30 Dec 2003 (beta 4b): full 742×550 UI with chat, smileys, heart/PA, 8 spell slots, turn timeline. Closest visual match to 5b |
| `booge_wp_06.jpg` | 2004-08-26 | beta 2b, gift room |
| `booge_wp_02.jpg` | 2006-02-16 | Village map with a "!" stele, wrapped in the fan tool "Dofus 3(+)"; the in-image clock reads "Lundi 2 Février 2004", so beta 6b |
| `booge_wp_05.jpg` | 2005-12-24 | beta 6b (per article). Character/inventory panel with every label visible (Niveau, Expérience, Caractéristiques, Points de vie, Points d'action, Force, Vitalité, Charisme, Karma, Agilité, Intelligence, Résistances Feu/Air/Eau/Terre, Bonus) and an item tooltip "Bâton de boisaille karmique repoussant / dommages : 1D5 / +10 au karma / fait reculer de 1case(s)" |
| `booge_wp_01.jpg` | 2005-12-24 | Undated beta character select "Choisis ton personnage" (Retour / Jouer / Créer / Supprimer, "Niveau N") |
| `booge_wp_03.jpg` | 2006-02-16 | Undated beta **Console Multi** (lobby): tabs Jouer / Entraînement / Amis / Retour au village, "Stats Dofus" (Connectés, Dans le village, Nb de parties), "Stats perso" (Niveau, Expérience), 3-player podium "XP : 8490 - Niv. 13", channel list "Salon :", chat line "Tu es désormais dans le channel france", news header "Bienvenue dans la Console Multi de Dofus – version bêta" |
| `booge_carte-dofus2.jpg`, `booge_carte-dofuspetit.jpg` | 2004-12-12 | Stitched map of the beta Amakna village maps "pendant la beta v6b" (credited Bugyq, dofus.freegaia.net). Visual reference for the free-mode world maps of the era |
| `naholyr_bug_dofus.png` | 2004-03-07 | 1024×768 browser screenshot of beta 4b |
| `xenografter_souvenir.jpg` | 2007-10-22 | Same Console Multi as `booge_wp_03`, with news item "Nouvelle version bêta (6b) / Des nouveaux sorts, la gestion des effets en combat et tant d'autres choses !" and chat lines "<name> arrive dans le channel" |

Not kept: `magoliroub2.online.fr/logitheque/Dofus/dofus_bdd_old.xls`. It is a fan database last saved in April
2005 with sheets for resources, recipes and scrolls, so it is post-beta (1.x).
