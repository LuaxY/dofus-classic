---
title: "Des Premières Beta À Dofus 1.9"
date: 2022-12-26T11:24:28+01:00
draft: false
---

## Introduction

Je reflechis à documenter les versions de Dofus depuis un moment. L'idée de départ est de permettre l'identification d'une version de Dofus à l'aide d'une capture qui n'est pas datée, au final cet article va un peu plus loin et s'attarde sur le coté technique et le fonctionnement du jeu, certains éléments de Dofus Retro sont les mêmes que ceux des premières betas. Je m'arrête à la version 1.9 car il s'agit de la sortie internationnale ainsi qu'une version que je considère comme étant les bases de la version 1.29.

## Les technologies utilisées pour le jeu

Pour commencer, un peu d'explication et d'informations sur les technologies utilisées. L'interview de Kam réalisée entre le 15 et 19 décembre 2003 explique beaucoup de choses sur les débuts du développment ([lien de l'interview](https://web.archive.org/web/20040305103937/http://www.tweenpix.net/portraits/ankama/ankama.htm)).
Pour le serveur de jeu, il était développé en Java, la base de données est inconnue mais les premières versions utilisaient surement MySQL qui est un standard, la connexion au jeu se faisait en PHP (a connexion se faisait via flash qui envoyait les informations à un script PHP pour vérifier l'identification). Je pense que le livre *les cahiers du programmeur: Flash MX jeu en réseau avec actionscript et XML* à pu être utilisé pour les premières versions du jeu (pour les versions avant la beta et peux être les premières betas), le livre explique comment créer un jeu multijoueur avec flash et Java.  

Du coté de Flash, comme l'explique Kam dans l'interview cité précédement, le développement semble avoir commencé fin 2001, il s'agit également de la période Duel qui deviendra Dofus. Le projet était développer en Actionscript 1 pour Flash 5. Après la période Duel, le projet est toujours développer en Actionscript 1 avec Macromedia Flash MX à destination de Flash 6, les premières Beta du jeu tournerons sur ce moteur jusqu'au passage à Flash MX 2004 et Flash 7 qui apportera beaucoup de fonctionnalité mais les premières versions développées pour Flash 7 resteront compilées à destination de Flash 6. D'après ce que j'en déduis, le moteur passera totalement à Flash 7 entre les versions 1.0 et 1.9 (entre septembre 2004 et septembre 2005).

## Le fonctionnement du client

Pour les premières versions de Dofus, le client est un simple interpréteur: il lis les données reçues par le serveur et envoi les données qu'on lui dit d'envoyer, la manipulation du client est également assez simple et il manque beaucoup de protections de sécurité. Les versions après la 1.14 ont corrigé beaucoup de problèmes pour rendre le jeu plus sécurisé.  

En 2022, il est impenssable de ressortir un serveur tel quel, même si l'on possèderai le code d'origine, tous est trop ancien, les versions du jeu qui demandent flash 7 ne sont pas utilisable avec Flash player 10 et +, faisaint de la version 1.9 la plus ancienne version réellement rejouable. Voici quelques informations sur le fonctionnement du jeu:
- Pour les versions Beta puis jusqu'au passage complet à flash 7, il fallais utiliser le fichier lancement.html dans le dossier d'installation du jeu, sinon il était possible de jouer directement depuis le navigateur par le site de dofus (à traver le lien jouer.dofus.com). Après avoir charger le premier fichier swf, le jeu allais chercher le fichier de langue contenant les textes du jeu puis il charge un autre fichier swf permettant l'accès à l'interface de connexion. Le fichier contenant l'interface de connexion n'a pas été archivé et il est actuellement impossible de relancer les versions beta du jeu car elles ont besoin de ce fichier pour démarrer, cependant il semble qu'un système d'autoconnexion était disponible. La plupart des données étaient sur le serveur, il n'est donc pas possible de récupérer les fichiers officiels.
- Pour les versions 1.0 à 1.4, le fonctionnement est le même que celui des beta cependant le fichier de l'interface de connexion à changer.

- A partir d'une version inconnue, les fichiers ont été recompilée pour flash player 7, il semble qu'au même moment un fichier .exe est ajouté aux versions Windows du jeu et l'interface de connexion est intégrée au client. Ces versions pourraient être aujourd'hui au moins relançable.  

Enfin, il serait impossible de recréer le jeu à 100% pour les versions d'avant dofus 1.14, les cartes ainsi que les données des objets étaient stockées sur les serveurs d'ankama et irrécupérable aujourd'hui. Avec un peu d'adaptation je pense qu'il serait possible de recréer à quasi 100% le jeu à partir du moment ou le jeu est passé à 100% sur Flash player 7, même si des choses ont changées, les bases du jeu étaient présentes, ce qui n'est pas le case avec les versions précédentes.

## Les screens d'avant la beta

Certains screens utilisés pour la communication pour la version beta du jeu semblent être tiré d'une version alpha du jeu. Ces screens sont proche de dofus, ils sont surement issu du projet Duel qui est le nom du projet de base ([source sur le nom du projet Duel](https://web.archive.org/web/20230519093332/http://planetsrc.free.fr/emag/interviews/ankama/index.html)).  

Un premier screen disponible [ici](https://web.archive.org/web/20041226094652/http://dofus.online.fr/img/image2.jpg) montre un xel sur la map de la fontaine d'amakna, bien que tout est proche de la v1b, ce n'est pas la v1b car le changement de carte se fait avec des triangles orange, il semble que ca soit une version où les dev cherchaient comment faire le changement de carte.  

Un second screen disponible [ici](https://web.archive.org/web/20050206020058im_/http://www.tweenpix.net/portraits/ankama/s0.jpg) montre également une carte avec le changement de carte avec des flèches de couleur, ces flèches semblent être le moyen de changement de carte qui était souhaité au tout début mais qui a été modifié.  

D'autres screen des version précédents la beta sont disponible [ici](https://web.archive.org/web/20040110180128/http://www.youngcreation.net:80/site2003/site_html/ankama.html#), on peux y avoir l'interface de sort qui est restée la même (ou presque) jusqu'à Dofus 1.13.  

Un trailer qui prête à confusion a été publié, il est disponible [ici](https://web.archive.org/web/20061201000000*/http://dofus.fileburst.com:80/swf/Dofus_Trailer_medium.swf), il montre le "Bureau des affaires de dofus" avec la possibilité de faire des quêtes cependant dans ce trailer il s'agit clairement de Duel et non de Dofus, les différences sont très visible, les combats sont différents et le principe de changement de carte est totalement différent, l'interface est également totalement différente, il ne s'agit clairement pas d'une beta de Dofus cependant une grande partie du trailer est réutilisée pour Dofus (les cartes) et le batiment du bureau des affaires ainsi que d'autres éléments prévus pour Duel sont disponible dans le client Dofus Rétro alors qu'ils n'ont jamais été utilisés.

## 1. La sortie du jeu et les premières versions de la beta

Le tout premier lieu où l'on pouvais parler de dofus était un forum hébergé sur le site d'ankama studio, il est accessible [ici](https://web.archive.org/web/20040108215712/http://www.ankama-studio.com:80/forumdofus/).  

Pour le site, il semble avoir été reservé dès septembre 2002 (peux être avant) mais il n'était pas configuré, il sera configuré vers mi juillet 2003 ([lien vers la première news archivée](https://web.archive.org/web/20040327203703/http://www.dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=24)). Pour l'accès à la beta test, il à été attribué via des concours, le dernier concours avant la beta à été effectué le 12 octobre 2003, il s'agissait d'un quizz ([Lien vers la news du concours](https://web.archive.org/web/20040326092858/http://www.dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=27)).  

La présentation du jeu à eu lieu au mois de septembre 2004 via le site dofus.com, les news associées sont disponible [ici](https://web.archive.org/web/20040504014050/http://dofus.com:80/?page=presse&rubrique=communiques&contenu=communiques) et [ici](https://web.archive.org/web/20040531062958/http://dofus.com/index.php?page=presse&rubrique=communiques&ssrubrique=030913&contenu=030913)

En septembre 2003, il semble également y avoir eu un concours pour les noms des monstres, il s'agit des tous premiers monstres crées et qui étais présents dans les fichiers des premières beta ([lien vers les posts du concours](https://web.archive.org/web/20040113072222/http://www.ankama-studio.com:80/forumdofus/category_view.asp?cid=8&p=1), [second lien](https://web.archive.org/web/20040211203755/http://www.ankama-studio.com:80/forumdofus/category_view.asp?cid=8)), on peux citer le Moon qui étais déja au rendez-vous et qui est surement un des tous premiers monstres créer (peux être même le premier). Les quelques monstres déja présents dans les premières version seront modifié ou revu, il s'agit juste de skin de tests.


### Dofus v1b

D'après [Liche dans sa vidéo *Les incroyables screens des débuts de DOFUS #1 (2003-2004)*](https://youtu.be/yemP7QTWTxw?t=631), la beta v1 est sortie le 15 octobre 2003. On peux y voir un screen de cette version avec un iop, sur la map les plots de changement de carte ne sont pas des soleils mais des cases grises et blanches ([source](https://youtu.be/yemP7QTWTxw?t=661)). On peux également remarquer la coiffure du iop: celle du personnage possède les cheveux coupés tandis que l'image du médaillon semble avoir les cheveux avec les cheveux long, la coiffure des iop changera plusieurs fois jusqu'à dofus 1.13 (cheveux coupés / cheveux en l'air). Il semble y avoir un seul canal de chat et il n'y a pas de smiley. L'interface possédais 2 boutons: un pour les sorts et un autre pour l'inventaire et les caractéristiques. L'accès aux combat se faisait via des stèles qui permettaient l'ouverture d'une interface qui permettait de faire des combats pvp, les combats se déroulais sur des cartes séparées du reste du monde, à la manières des cartes koli des dernières version de dofus 2. Cette interface permettais également l'accès à la liste d'amis.  
Les armes des personnages étaient visibles et chaque personnage ne pouvais équiper qu'un seul type d'arme (par exemple, les épées pour les iop, batons pour les féca). Il est également à noter qu'il n'y a pas de PM sur les premières versions de la beta, le système de déplacement se fait avec les PA, 1PA = 1 déplcement d'une case et le corps à corps coutait un nombre fixe de PA. Enfin, il semble que sur cette version toutes les classes (les 10 premières) étaient graphiquement prêtes mais certaines n'étaient pas jouables.

### Dofus v2b
Cette version est sortie le 28 octobre 2003 et son changelog peux être consulté [ici](https://web.archive.org/web/20070118155852/http://www.ankama-studio.com/forumdofus/topic_view.asp?tid=768). Il y a l'ajout de l'intérieur des batiments, la possibilité d'arriver au niveau 15, le gains de pièces d'or (pas encore appelées kamas) et d'autres modifications. Les classes osa et enu ont été ajoutées, je pense quelles étaient déja dans la v1b mais non activées, il manquais peux être quelques ajustement à faire.  
Il est également intéressant de noter que l'interface de la console multi à été modifiée, la console de la v2b est visible sur la vidéo citée précédemment et également dans la vidéo *Les incroyables screens des débuts de DOFUS #2 (2003-2004)* de Liche, on peux également y voir l'interface ([lien vers la video](https://youtu.be/zpcTDtF2NQU?t=38)).  

Le Moon était déja présent sur cette version, un titre de sujet du forum en parle [ici](https://web.archive.org/web/20040113072155/http://www.ankama-studio.com:80/forumdofus/category_view.asp?cid=6&p=1). Le projet Moon était développé en parallèle ([vidéo de Liche sur le sujet](https://youtu.be/2qZfNjmEpdc?t=697)).

Un changement sur les cellules de changement de carte semble avoir eu lieu, la case reste grise mais la partie blanche est retiré et remplacée par une spirale avec des petits traits([voir le screen du 1ier novembre sur cette video de Liche](https://youtu.be/yemP7QTWTxw?t=878)). 

Pour terminer avec cette version, [ce screen](https://web.archive.org/web/20040826105805/http://booge.net/dofus/wp/06.jpg) ainsi [que ce passage de vidéo de Liche](https://youtu.be/yemP7QTWTxw?t=1054) montre la salle des cadeaux sur cette version, la version du screen est identifiable par le bouton de controle du son sur la droite de l'interface.


### Dofus v3b

Je n'ai aucune information sur cette version, elle est sortie entre le 1/11/2003 et le 22/12/2003 mais je n'ai pas de date ni d'autres informations.


### Dofus v4b

Cette version est sortie le 22 décembre 2003 et a été accompagnée d'une refonte du site et du forum ([source](https://web.archive.org/web/20040121111925/http://dofus.com:80/?page=informations&rubrique=news1&contenu=news1)).  
Cette mise à jour est celle qui a connu le dofus match, un fan magazine crée par la communaute et dont le contenu à eu lieu pendant les fêtes de fin d'années de 2003 ([lien vers le post forum de dofus match](https://web.archive.org/web/20040720212800/http://www.ankama-studio.com:80/forumdofus/topic_view.asp?tid=1351)).

Une capture d'écran de cette version est disponible [ici](https://web.archive.org/web/20040307052535/http://naholyr.free.fr:80/bug_dofus.png), par rapport à la v1 on remarque l'ajout des smiley et le controle du son qui semble passer du bord droit au coin bas droit avec le bouton de fermeture du jeu. On remarque également l'utilisation de Mozilla Firebird qui est Mozilla Firefox avant d'être renommé ([source](https://fr.wikipedia.org/wiki/Mozilla_Firefox#Changements_de_noms)).  

Un combat du 30 décembre 2003 peux être vu [dans cette video de Liche](https://youtu.be/zpcTDtF2NQU?t=201) et également [ici](https://web.archive.org/web/20060203024812/http://www.booge.net/dofus/wp/04.jpg), on remarque que les classes ont plus que 3 sorts ce qui montre que les 10 premières classes devaient être sorties et que le développement s'orientait plutot vers des amélioration des classes et du gameplay.  
Dans la même vidéo de Liche, [à ce timecode](https://youtu.be/zpcTDtF2NQU?t=254), sur cette carte qui deviendra la banque d'amakna, on remarque que le batiment qui semble être le bureau des affaires de dofus qui devait servir à lancer des quêtes a été déplacé, [un screen de cette map est disponible dans l'interview de Kam de décembre 2003](https://web.archive.org/web/20050206020058im_/http://www.tweenpix.net/portraits/ankama/s0.jpg) qui montre les 2 batiments de droite inversé.  

Une mise à jour d'équilibrage semble avoir eu lieu le 8 janvier 2004 ([source](https://web.archive.org/web/20040711133953/http://www.ankama-studio.com:80/forumdofus/topic_view.asp?tid=1448)).

### Dofus v5b

Cette version est la plus ancienne qu'il est possible de récupérer aujourd'hui, elle est sortie le 13 janvier 2004. D'après [la video de Liche sur les screens #2](https://youtu.be/zpcTDtF2NQU?t=548), cette version ajoute la possibilité d'échange via un système de drop depuis l'inventaire.  

Postée sur le forum, une FAQ réalisée dans les moments de la v5b est sortie [ici](https://web.archive.org/web/20040213002524/http://forum.dofus.com:80/LesBetaTest/CompteRendu/2-FAQDeDofus), le poste semble avoir été modifié au moment de la sortie de la v6b mais il apporte des éléments intéressants. On y apprend que le niveau max est le niveau 30, la limitation était au niveau 15 depuis la v2b. Les métiers ne sont toujours pas disponible mais prévu, pareil pour les monstres et quêtes. Il est également question des configurations minimales pour dofus et il est indiqué comment lancé dofus sans passer par un navigateur web (je rappel qu'il n'y avais pas de dofus.exe à l'époque, il fallais passer obligatoirement par un navigateur web, le flash player en standalone est sorti avec Flash player 7).  

Il y a très peu d'autres informations sur cette mise à jour, je pense qu'il s'agit d'une mise à jour mineure.

### Dofus v6b

Cette version est sortie le 27 janvier 2004, [ce post sur le forum](https://web.archive.org/web/20040716222230/http://www.ankama-studio.com:80/forumdofus/topic_view.asp?tid=1687) explique la présence d'un fichier _spells.txt qui n'est présent ni sur la v5b ni sur la v7b, il s'agit surement d'une erreur des développeurs.  

Cette mise à jour s'accompagne d'une mise à jour du site internet ainsi que du forum qui passe du site d'ankama studio vers forum.dofus.com, la news associée à cette information est disponible [ici](https://web.archive.org/web/20040220232419/http://dofus.com/?page=informations&rubrique=news&contenu=news_display&idnews=52) et la fermeture de l'ancien forum est disponible [ici](https://web.archive.org/web/20040708144542/http://www.ankama-studio.com:80/forumdofus/topic_view.asp?tid=1693). Sur [cette news](https://web.archive.org/web/20040220233020/http://dofus.com:80/?page=presse&rubrique=onparle&contenu=onparle), il est évoqué que le magazine PIXEL parle du jeu dans sont numéro de début février 2004, ce CD ROM contient peux être des éléments exclusifs sur le jeu (peux être même une beta?).

Du coté de la mise à jour, en me basant sur [la video de Liche des anciens screen #2](https://youtu.be/zpcTDtF2NQU?t=664), l'interface de choix des personnages a changé mais la modification a pu avoir lieu avant la v6b. 

Un test de dofus au moment de la v6b est [disponible ici](https://web.archive.org/web/20040706223930/http://www.warparadise.com/wpr/rpg/?p=123&id=40). [Ce screen](https://web.archive.org/web/20060216035022/http://www.booge.net/dofus/wp/02.jpg) montre la v6b avec l'utilisation de l'outil dofus+ qui permettais d'avoir des fonctionnalités supplémentaires, cet outil étais développé par des joueurs.

([Dans cette vidéo de Liche](https://web.archive.org/web/20051224213009/http://www.booge.net/dofus/wp/05.jpg)), il est intéressant de remarquer que le baton faisait reculer d'une case et que le nom des équipements semble se faire à la manière de certains autres jeux comme Diablo 2, le nom change en fonction de ses caractéristiques. Dans l'inventaire, on peux voir des armes sous les équipements équipés, il pourrais s'agir d'un système pour voir les objets de l'inventaire. Une supposition: Le iop dans le médaillon a les yeux fermés, l'animation concernant sur les yeux du iop qui s'ouvrent et se ferme existait peux être déja.

La v6b avait un bug sur la couleur des cheveux de iop, ce bug est évoqué par Liche [dans cette vidéo](https://youtu.be/4GuvZsz9OVc?t=192). Le médaillon du portrait du iop a changé par rapport aux versions précédentes (cependant, dans la beta v7b, le iop reprend l'ancienne image dans le médaillon). Le skin du iop jusqu'à la v5b a les cheveux cours alors que dans la v6b il semble avoir les cheveux long (la v7b intègre le iop avec des cheveux long). Je pense a une erreur de date pour les screens du Liche (Windows indique parfois des modification alors qu'il n'y en a pas eu), sinon il y a peux être eu une version v6.1b voir v6.2b, la correction de se bug impliquerai un patch client. 

Il est possible de voir les cartes composant amakna pendant la beta v6b [ici](https://web.archive.org/web/20041212084754/http://www.booge.net:80/dofus/carte-dofus2.jpg), on remarque qu'il y a assez peu de cartes, ces cartes ne servent qu'a se promener et certaines sont très fortement inspirées de ce qui était prévu pour Duel (la carte au dessus de la taverne d'amakna où est le bureau des affaires par exemple). Je pense que certaines de ces cartes ont été crées bien avant la beta pour avoir un aperçu des environnements qu'il était possible de créer et la cohérence n'était pas l'objectif ce qui expliquerait que très peu d'élements de décors sont dupliqués.

Un screen de la console multi est disponible [ici](https://web.archive.org/web/20071022214039/http://xenografter.chez-alice.fr/Screenshots/souvenir.JPG), il est indiqué que cette version a ajouté des sorts et les effets en combat.  

La version v6b est la dernière version qui utilise les éléments développés pour le premier trailer du jeu, après cette version Dofus progressivement s'orienter vers des modification profondes qui vont mettre fin au contenu prévu avant la beta et qui vont totalement transformer le jeu.

## 2. La transition vers ce qui deviendra Dofus 1.0

### Dofus v7b

D'après le fichier LIS-MOI.txt présent dans les fichiers du jeu, la v7b est sortie le 25 février 2004. 

En se basant sur [ce screen montré par Liche](https://youtu.be/4GuvZsz9OVc?t=376), on vois les PM qui arrivent, l'interface a également été épurée, le chat est mieux présenter, il y a l'arrivée du bouton + au dessus du chat pour l'agrandir, la barre de défilement du chat est mieux présentée et sur la barre des sorts il y a une grosse modification: le corps à corps est désormais symbolisé par une case orange et est séparée du reste de la barre qui contient les sorts. Il semble également y avoir plus de place pour les sorts (passage de 8 à 12 sorts). Le personnage à 6pa/3pm, avant les personnages avait plutot 4/5pa, cette mise à jour à peux être été la première avec le fonctionnement du 6pa 3pm de base. Cette mise à jour semble également être celle qui a ajouté le mode créature (au moins les sprites).

Cette mise à jour a également ajouté des nouvelles cartes, mais je n'en sais pas plus ([voir la video de Liche sur le sujet](https://youtu.be/4GuvZsz9OVc?t=392)). Le kanojedo est apparu avec cette mise à jour, le batiment semble avoir été simplement ajouté sur la map sans quelle soit modifiée, en revanche la carte de l'intérieur du kanojedo ne semble pas du tout prête, les cases de la carte ne sont pas toutes valides. Le kanojedo sera également le point d'arrivée des nouveaux joueurs.    

Un changement de cette version (note: ou de la v6b) est le passage des calculs de chemin dans le village de 4 à 8 directions. Avant les personnages ne pouvaient se déplacer que sur les cases adjacentes à la case (les bords long se touche, comme les déplacements en combat de dofus retro), à partir de cette version le personnage peux se déplacer "en diagonale" sur les cases (aller sur les cases qui sont en contact via un angle de la celulle courante).

Un autre changement est le changement de fonctionnement de la pile d'action. Sur la version 5 plusieurs actions peuvent s'exécuter en même temps (par exemple, utiliser un smiley pendant un déplacement, chose supprimée à partir de la v7).

Les changements précédents ainsi que les autres changements marquent la rupture avec le projet initial et qui permet de dater plus simplement un screen est le passage des cases grises avec spirale au soleil pour le changement de carte, cette modification montre bien que l'on perd le coté moderne du trailer (le trailer de 2003 montre beaucoup d'animations) et son environement un peu futuriste (le bureau des affaires), on reste sur un univers du moyen age sans ajouter d'éléments moderne.  

### Dofus v8b

Après la v7b arrive la v8b mais j'ai très peu d' informations sur cette version, le dofus time n°1 l'évoque vaguement. Si on part du principe que les mises à jour sortent le mercredi, la mise à jour v7b a eu lieu le 25 février 2004 et la v9b a eu lieu le 10 mars 2004, la version v8b serait donc sortie le 3 mars 2004 et aurais seulement apporter des petites modifications.  

#### La fin de la console multi

D'après le changelog de la v9b, cette version retire la console multi du jeu, les combats se lancent et se produisent désormais directement sur les cartes de l'ancien mode libre (Amakna), pour l'occasion les stèles des cartes sont modifiées par le sprite où il n'y a plus le symbole ?. Le client v7b intègre déja les épées visible sur la carte au lancement d'un combat ainsi que les stèles qui remplacent les stèles originales qui permettaient l'accès à la console multi, les v7b et v8b sont actuellement compliquées à différencier et surtout il est difficile de savoir si la v7b permettait déja de se passer de la console multi. Sur les screens de la v7b les combats se font déja sur les cartes d'amakna. L'interface des amis semble être revenue avec la version v9b (la v7b n'intègre aucune interface pour la gestion des amis en dehors de la console). Le retrait de la console multi est une grosse évolution par rapport au trailer de dofus de 2003, le bureau des affaires de dofus devait être un lieu qui permettais de lancer des combats ainsi que de prendre les quetes.  

Pour les v7b et v8b, il s'agit des dernières versions avec peu de documentation(surtout causé par la beta fermée), les versions suivantes seront mieux documentées.

Ces version v8b -v9b sont également le passage de l'or en kama pour la monnaie du jeu. (sources: clients beta v10 qui intègre le kama)

### Dofus v9bs

La version v9b arrive le 10 mars 2004 avec beaucoup de modification lourdes. Le changelog est consultable [ici](https://web.archive.org/web/20040504015817/http://dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=56), même si il n'est pas long, il est très important. Une image de cette version 9b semble disponible [ici](https://web.archive.org/web/20040413155200/http://www.dofus.com:80/bonus/images/screenshots/09_intermaison_grand.jpg).  

Coté correctif il y a eu des petites modification, surtout sur le bug des "ghost", probablement à cause de personnages qui était invisible.  
La nouvelle interface de la liste des amis n'est autre que la partie Amis de l'ancienne console multi qui a été légèrement retravaillée.  
Coté serveur, le serveur à été totalement réecris en Java pour obtenir des meilleures performances et avec un peu plus de recul concernant le développement de serveur (le développement de serveur est un domaine assez compliqué et les outils de l'époque ne sont pas les mêmes que ceux d'aujourd'hui).  
Coté client, il y a eu beaucoup de modifications, et il y a un tournant avec cette version, sur le screen évoqué précédemment et le changelog, on peux voir l'ajout de l'interface des amis dans l'interface ainsi que l'icone de la  géoposition dont je n'ai aucune idée de l'utilité à l'époque (la carte semble être apparue dans la v11b avec la création de l'icone du livre de quete qui permettait d'ouvrir un livre contenant la carte). La barre des sorts est réduite de 12 à 10 emplacement pour faire de la place pour les nouveaux icones et cette version marque le passage de la gestion du son et de la fermeture du jeu du coin bas droite au coin haut droite. En me basant sur le Dofus Times 2 ([video de Liche sur le sujet](https://youtu.be/8-UccQVyeDc?t=519)), on remarque que les coins des bulles de discussion ne sont plus arrondies mais carrées, le jeu s'éloigne encore plus de la v1b.   

Du coté du contenu du jeu, il y a l'ajout de nouvelles zones (je ne sais pas quelle zone à été ajoutée, je pense qu'il s'agit des temples de classes) et certaines cartes ont été modifiées pour être modernisée.  

2 jours après la mise à jour v9b, la version v9.1b est sortie, elle contient des  mises à jours graphiques ainsi qu'un correctif d'un problème qui faisait crash le jeu. [Changelog de la v9.1b](https://web.archive.org/web/20040403200327/http://dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=57).  

Sur le site il était déja possible de consulter le bestiaire ainsi que quelques informations sur le jeu, attention car ces pages indique ce qui était prévu pour le jeu, une grande partie des monstre n'est jamais sorti et/ou ne porte pas le même nom. [Bestiaire page 1](https://web.archive.org/web/20040315044531/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=vegetation&contenu=bestiaire_display), [Bestiaire page 2](https://web.archive.org/web/20040315044229/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=insectes&contenu=bestiaire_display), [Bestiaire page 3](https://web.archive.org/web/20040315043159/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=forces_de_la_nuit&contenu=bestiaire_display), [Bestiaire page 4](https://web.archive.org/web/20040315043118/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=boss&contenu=bestiaire_display), [Bestiaire page 5](https://web.archive.org/web/20040315042937/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=orcs&contenu=bestiaire_display), [Le monde de Dofus v1b à v9b](https://web.archive.org/web/20040315044318/http://www.dofus.com:80/?page=explorations&rubrique=province&ssrubrique=province_village&contenu=province_village) (certains lieu ont été retiré plus tard), [Ce qui était prévu pour les dofus](https://web.archive.org/web/20040315043151/http://www.dofus.com:80/?page=explorations&rubrique=province&ssrubrique=province_dofus&contenu=province_dofus).  


D'autres modifications de cartes sont disponibles dans le dofus Times 2 à la page 8 ([visible sur une vidéo de Liche](https://youtu.be/8-UccQVyeDc?t=590)) il y a 4 captures d'écrans. Les 2 images les plus à droites sont la même carte, il s'agit de la carte [5,0] et la carte de dofus retro est presque identique. En revanche, la seconde image en partant de la gauche montre la carte [6,-1], dans la v10b on vois une deuxième version de la carte, dans les premières versions on trouve la ferme sur carte, dans la v10b la ferme a été déplacée, cette map accueillera plus tard le transporteur brigandin. Enfin l'image en bas à gauche étais un enclos dans les premières versions, on vois que l'enclo a été retiré et une maison a été ajoutée. Plus tard dans les dernières versions de la beta cette map sera de nouveau modifiée, la maison est remplacée par un atelier forgeron. Toujours dans le dofus time 2, à la page 7 [visible ici](https://youtu.be/8-UccQVyeDc?t=570), on remarque que la stèle à changée et n'a plus le point d'interrogation, ce qui correspond au retrait de la console de la v8b.

Je pense que les cartes ajoutées avec cette mise à jour sont les temples de classe avec leurs alentours, cela ferais une grande zone pour l'ajout futur des monstres.

### Dofus v10b

Cette version est sortie le 7 avril 2004, l'annonce de la mise à jour à été faite le même jour qu'une news sur l'amélioration du forum [disponible ici](https://web.archive.org/web/20040512024408/http://dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=66). Cette version marque également le début de la beta ouverte du jeu comme indiqué [ici](https://web.archive.org/web/20040525124633/http://dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=75).  

Le changelog est disponible dans le dofus times 3, il y est évoqué l'apparition des interfaces de magasin et également des premiers pnj, ces pnj permettait d'acheter des object grâce à l'or gagné. Les invocations ont également fait leur apparition avec cette version. Il y a également eu des nouveaux sorts et des corrections de bug d'affichage et un nouveau skin lion pour les membres du kanojedo (d'autres skins seront utilisés plus tard en clin d'oeil pour les gardien du kanojedo). Des nouvelles cartes ont fait leur apparition, parmis celles-ci, grace au dofus times 3 en dernière page, on vois une carte de la zone de la rivière kawaii / port de madrestam. L'xp a été multipliée par 5 pour cette beta et lle niveau maximal est plus haut que 30 comme il est possible de le voir [dans la signature du premier message de ce post du forum](https://web.archive.org/web/20040630173043/http://forum.dofus.com:80/Autres/Divers/58840-NouveauTypeDeTesteurLeTricheur), cette modification a pu avoir lieu avant mais je n'ai aucune autre information.  

Un premier screen de cette version v10b est disponible [ici](https://web.archive.org/web/20221220145215/http://xenografter.chez-alice.fr/Screenshots/Anniversaire%20fleur.JPG), on remarque par rapport à la version v9b que les icones de géoposition et de la liste d'amis sont alignées par rapport à la barre des sorts et plus surprenant, une icone est ajoutée dans la barre blanche qui deviendra l'emplacement des accès aux caractéristiques, de l'inventaire, de la liste d'amis et de l'icone de géoposition. 
Sur ce second [screen](https://web.archive.org/web/20221220182508/http://xenografter.chez-alice.fr/Screenshots/EnePower.JPG) on peux voir l'interface de combat de la v10b, il s'agit de cette version car les 2 icones géoposition et amis sont alignées par rapport à la barre de sort, on y vois un bouton d'abandon du combat ainsi que la timeline des personnages qui a été déplacée sur la partie de l'écran où s'affiche la carte du jeu, comme sur dofus 1.29. [Un troisième screen](https://web.archive.org/web/20221220185340/http://xenografter.chez-alice.fr/Screenshots/terrain%20Mine.JPG) est disponible, on y vois un sram avec des pièges.


On peux voir des nouvelles cartes sur [cette capture](https://web.archive.org/web/20221220193146/http://xenografter.chez-alice.fr/Screenshots/Invite%20Surprise.JPG) ainsi que sur [cette capture](https://web.archive.org/web/20221220193045/http://xenografter.chez-alice.fr/Screenshots/Mariage.JPG), on vois le temple sram et le chateau d'amakna. Il est probable que les nouvelles cartes sont apparues avec la version v9b cependant les captures d'écran correspondent à la v10b.

Si on reviens sur [ce screen](https://web.archive.org/web/20221220193045/http://xenografter.chez-alice.fr/Screenshots/Mariage.JPG), on remarque que dans la barre blanche au dessus des sorts il y a un nouveau bouton, je n'ai aucune idée de l'utilité de ce bouton, en cherchant un peu, il s'agit d'un bouton présent lorsque le joueur n'est pas en combat, peux être qu'il s'agit du bouton qui permet de changer l'affichage de la barre de sorts?  

Un dernier screenshot peux être trouvé [ici](https://web.archive.org/web/20221220181606/http://xenografter.chez-alice.fr/Screenshots/FearNaho.jpg), ce screenshot est très important, derrière le gros smiley on peux voir une épée de combat, il montre que les combats ne sont plus effectués sur des cartes séparées mais directement sur la carte, même si je ne peux pas confirmer ce screen date de la v10b, il date d'avant la beta v13b (on vois les armes des personnages).

Cette version est la dernière qui utilise l'interface de couleur bleue, un des derniers éléments de l'interface prévu au début du développement, après cette version l'interface sera de couleur beige et en dehors de quelques éléments, ca sera la même interface que Dofus 1.29. Après cette version il sera également difficile de dater précisément la sortie de certains monstres et d'autres contenu, les graphistes et dev ont plusieurs versions d'avance sur le contenu.

## 3. En route vers Dofus 1.0

### La fin d'une ère

A partir de la v11, nous avons le dofus "moderne" que nous connaissons encore avec dofus retro. Jusqu'à la v10, nous avons beaucoup de fonctionnalités du client qui ont été modifiées, à partir de la v11 ces fonctionnalités sont "stables" et ne seront plus beaucoup retouchées.  
Beaucoup de choses vont être revues avec la v11:
- L'interface intégralement revue, surtout la partie inventaire avec l'ajout du système de pods et amélioration de la visibilité des items en possession du personnage, dissociation des caractéristiques et de l'inventaire.
- Retrait du bouton jeter depuis l'inventaire, désormais il faut faire glisser un item au sol
- Ajout des slots des dofus ainsi que des slots de familier, cape et chapeau
- Ajout d'un livre en jeu (icone du livre de quêtes de dofus 1.10+), ce livre permet de voir la carte du monde découpée en petite zones (comme un atlas, pour les plus agés qui liront ce poste). Il est la en cohabitation avec la carte ingame des défis et des personnes connectées en jeu.  
- Ajout de cases dans la barre de sorts qui passe à 14 emplacements
- Refonte complète des objets:
    - Les objets ont désormais des descriptions
    - La description et les effets des objets sont séparés
    - Chaque objet à un nom et des effets. Jusqu'à la v10 un objet était "unique": le nom de l'objet correspondait à ses effets

Pour l'occasion le système de lang sera modifié à partir de la v12 pour quelque chose de plus moderne qui restera jusqu'à la verson 1.13.2.

### Dofus v11b

Cette version est sortie le 5 mai 2004. Son changelog est disponible [ici](https://web.archive.org/web/20040605182939/http://dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=82), bien quelle soit une version de transition vers la v12b et l'ajout des monstres, elle apporte beaucoup de modification dans le gameplay et une modfication de l'interface en jeu. Dans les petits ajouts de cette version il y a l'ajout du système de pdv à restaurer après un combat, l'amélioration de la gestion des combats et la création des objets pour récupérer de la vie.

Du coté du client il y a plusieurs modifications importantes, tout d'abord l'interface de jeu est modifiée, on peux la voir dans une vidéo de Liche [ici](https://youtu.be/4GuvZsz9OVc?t=422). Attention, seule l'interface de jeu a été modifié, l'interface de connexion ainsi que l'interface de choix de personnage restera la même (en  bleu) jusqu'à la dernière beta du jeu (v17.2b). Cette version est reconnaissable car la couleur de fond du chat est foncée, elle sera dans les versions suivantes uniformisée avec les autres beiges du jeu. On remarque également la mise en place de la barre des icones de caractéristique, d'inventaire, ... . Sur celle-ci, comme on peux le voir dans le changelog, les caractéristiques ont leur propre interface. L'interface de l'inventaire est devenue celle qui sera utilisée sur Dofus 1.29, cependant pour l'équipement il devais encore manquer les capes, coiffes, familiers et les emplacements des Dofus, la case qui servais à jeter les objets à également été retirée avec cette version. A droite du bouton d'inventaire, le bouton avec le livre fait son apparition, dans le changelog il est mention d'un carnet de bord, il s'agissait d'un livre qui permettait de voir la carte du monde découpée en petit carré de cartes et il semblait prévu d'ajouter des guides et des suivis de progressions dans ce livre. Du coté de la barre des sorts, elle passe de 10 sorts à 14 sorts ce qui montre que les classes avaient de plus en plus de sort.  
La dernière grosse mise à jour du client semble provenir du moteur de son qui a été modifié et qui permet d'avoir différents son en fonction des zones.

### Dofus v12b

Cette version est sortie le 12 mai 2004,  12 [en me basant sur cette page](https://web.archive.org/web/20040624170449/http://forum.dofus.com:80/Autres/Divers,11). Je n'ai pas le changelog de cette version, cependant cette version retire le marron foncé du chat pour avoir le même beige que le reste de l'interface. Il est possible de récupérer quelques informations sur cette version à l'aide du forum.  

La première information est l'ajout des monstres, annoncée pour la beta v12b, il semble qu'une sélection de joueurs ont eu accès en avant première à certaines zones du jeu pour essayer les combats contre les monstres, ces joueurs ont reçu les caractères [M] à la fin du nom de leur personnage. En terme de fonctionnalité cette période de test a peux être pu servir pour tester la mise en place du système d'abonnement (seuls les comptes validés pouvais accéder aux zones). [Ce screen](https://web.archive.org/web/20221221131636/http://xenografter.chez-alice.fr/Screenshots/cradesbois.jpg) proviens de la v12b, on y vois les joueurs avec le suffixe [M] et une nouvelle carte avec des monstres (les crabes) et les armes sont encore visible. La couleur de fond  du chat est plus clair que sur la v11b.  

[Un sujet du forum](https://web.archive.org/web/20040630173043/http://forum.dofus.com:80/Autres/Divers/58840-NouveauTypeDeTesteurLeTricheur) évoque la triche et la grande différence entre les joueurs qui vont farm les monstres et les autres, l'xp semble longue et il semble y avoir des problème sur l'accès aux équipements (message du 29/05 à 23h48). On apprend beaucoup de choses à travers ce sujet:
- Pour xp, il faut farm beaucoup de monstre
- Il y a un déséquilibre en fonction des activités des joueurs, le gain d'xp via le pvp est faible et ammène de la triche tandis que les joueurs qui peuvent aller xp contre les monstres peuvent xp rapidement.
- Des équipements sont achetable directement aux pnj mais il faut des pièces d'or qui ne sont pas échangeable facilement.
- Il est évoqué les wabbits dans le sujet, or les wabbits sortent avec l'ile des wabbits pendant la mise à jour 1.1 (avec un reskin des monstres), les wabbits ont été utilisés, comme d'autres monstres pour les tests du pvm.

Toujours sur le forum, [la catégorie Divers](https://web.archive.org/web/20040624170449/http://forum.dofus.com:80/Autres/Divers,11) permet de voir les sujets évoqué en mai 2004, on vois plusieurs sujets intéressants:
- un sujet sur les joueurs M
- un autre sujet évoquant l'xp sur la v12b,
- un sujet sur les monstres

Le bestiaire de la v12b est accessible à travers ces liens: [forces naturelles](https://web.archive.org/web/20040512030919/http://www.dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=forces_naturelles&contenu=bestiaire_display), [insectes](https://web.archive.org/web/20040512025509/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=insectes&contenu=bestiaire_display), [vegetation](https://web.archive.org/web/20040516093529/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=vegetation&contenu=bestiaire_display), [forces de la nuit](https://web.archive.org/web/20040512030206/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=forces_de_la_nuit&contenu=bestiaire_display), [boss](https://web.archive.org/web/20040512032710/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=boss&contenu=bestiaire_display), [orcs](https://web.archive.org/web/20040516095154/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=orcs&contenu=bestiaire_display), [gobelins](https://web.archive.org/web/20040512032356/http://www.dofus.com/?page=explorations&rubrique=bestiaire&ssrubrique=gobelins&contenu=bestiaire_display). Une grande partie de ces monstres ont été retirés entre ce moment et la 1.0, les noms d'une partie des monstre a été grandement modifié et les skins aussi.  
Le bestiaire possède également une partie familiers visible [ici](https://web.archive.org/web/20040816172742/http://dofus.com:80/?page=explorations&rubrique=bestiaire&ssrubrique=familiers&contenu=bestiaire_display), même si la sauvegarde du site a été effectuée pendant la v17b, il est intéressant de voir que le bouftou et le tofu sont pensés pour être des familliers, il y a également d'autres familiers que l'on ne reverra pas et je pense que le famillier nommé Hertuy correspond en réalité à la moumoule (la description correspond). Les familiers seront ajoutés au jeu mais seront retirés puis re-ajoutés plus tard (ils ont le type d'item 18 et il n'est pas présent dans les versions v17b et 1.0).
Le Tabi est également présent et sa description correspond à ce que seront plus tard les dragodindes, cette page permet de voir que les montures devaient être les Tabi, je pense que l'abandon du Tabi proviens du skin trop petit et surement mal adaptable aux sprite des personnages ce qui poussera à faire une refonte des skins des personnages avec la version 1.2.  

Chose que je trouve intéressante à savoir, il est possible que cette version qui ajoute les monstres s'accompagne d'une refonte des noms et numéros des sprites des monstres avec le retrait de certains monstres comme le Moon blanc, la version exacte de cette mise à jour m'est inconnue actuellement.  
> Le paragraphe au dessus n'est plus à jour, en réalité il y a eu plusieurs modifications tout au long de la beta.  

Un screen de cette version peux être vu [ici](https://web.archive.org/web/20221223110331/https://www.eclypsia.com/public/upload/cke/Games/Dofus/Article%20Dofus%20Tapir/dofus%20beta.jpg), ce screen qu'il y a des combats sur la carte de la fontaine. Sinon les modifications de cette version sont surtout orientée sur des modifications serveur (limitation des zones au personnages [M]) et sur l'ajout des monstres donc il y a peux être rien d'autre de nouveau. Une information intéressante sur la position des monstres peux être trouvée [ici](https://web.archive.org/web/20230519093634/https://forums.jeuxonline.info/sujet/1102255-29/ancien-joueur-2004-2005), il est mention des wabbits et des gelées ajoutées dans les premières versions et a prioris les gelées étaient sur la carte en dessous du temple sram.

Pour terminer sur cette version, je souhaite revenir sur [ce screen](https://web.archive.org/web/20221221143548/http://xenografter.chez-alice.fr/Screenshots/Blonde%20Powa.JPG), Liche évoque dans une vidéo la v12b car on vois l'arme du personnage, cependant lors de recherches j'avais lu que le Dark Vlad a été implanté avec la v15b avec la forêt maléfique (je n'ai plus la source). J'ai un doute sur la version du jeu, la carte correspond à celle de la forêt maléfique mais le fichier du Dark Vlad de la v17.1b indique que le sprite proviens de la v13b. Je n'ai pas non plus d'information si le personnage est un [M] mais peux être qu'il s'agit juste d'une carte de test avec le Dark Vlad sans que la forêt maléfique ne soit ajoutée au jeu, cela expliquerai la v12b du screen.

#### Reconnaire un screen de la v12b par rapport à la v13b

Comme il est compliqué de reconnaitres les différentes versions beta de cette périodes et que les version 12 et 13 sont très proches sur l'interface, pour reconnaitre simplement la v12b de la v13b il faut regarder le palcement du bouton bug en haut de l'écran: sur la v12b il est en haut à gauche, sur la v13b, il est en haut à droite.

### Ce qui est planifié pour Dofus au moment de la v12b

Je m'arrête sur [ce sujet](https://web.archive.org/web/20040607043411/http://forum.dofus.com:80/CarnetBord/Graph/54549-TempsEtFonctionsDeLaVersionFinale) publié par Tot sur le forum le 23 mai 2004. Il évoque ce qui est prévu d'être fait pour les prochaines versions du jeu, tous ne sera pas réalisé mais voici ce qu'il évoque comme changement:
- La première partie sur les chapeaux de métier, le métier de tailleur devais pouvoir craft des chapeaux pour reconnaitre les artisans cependant cette fonctionnalité deviendra le livre des artisans et les chapeaux à craft deviendrons les runes de métier mais je n'ai pas la date de cet ajout dans le jeu.
- L'amélioration de l'interface d'échange, jusqu'à cette version v12b je crois que les échanges sont les mêmes que les premières versions: il faut jeter un objet par terre puis l'autre joueur le récupère, la v13b ajoute cette interface quelques jours après la publication de ce message.
- Les ressources sont déja disponible sur cette version mais elles sont inutile, le développement des métiers semble être en cours de développement au moment de la rédaction de ce message (les métiers sortiront quelques versions beta plus tard).
- Le nombre de carte, à l'heure de la v12b, Tot annonce 300 à 400 carte pour les joueurs [M], il évoque également qu'amakna n'est pas terminée. D'après [cette carte](https://web.archive.org/web/20161017180243im_/http://ophmialeen.free.fr/MapDofusQM/1024.jpg) de la v16b, il semble manquer tous le sud d'amakna et le cimetière d'amakna, la forêt maléfique, le village bwork ainsi que la forêt abraknydes. Je pense que ces zones ont été ajoutées avec la v17b, la version 1.3 qui ajoutera l'ile de Moon comporte environ 2000 cartes, ce qui est prévu ici par Tot.
- Pour terminer Tot évoque les chasses au trésor, le concept évoqué par Tot ne sera pas le même dans la version finale mais il semble que les différents coffres trouvable un peu partout dans la province d'amakna proviennent de cette idée (et en particulier les coffres disponibles sur les petites iles au large de l'ile des porcos ainsi que l'ile des dragoeuf qui ont besoin d'avoir une carte au trésor associée pour y avoir accès, un screen est disponible [ici](https://web.archive.org/web/20071022214001/http://xenografter.chez-alice.fr/Screenshots/Fort%20Bobard.JPG)).


### Dofus v13b

Cette version devait sortir le 1er juin 2004 comme le montre [cette page du forum](https://web.archive.org/web/20040803100722/http://forum.dofus.com/CarnetBord/Graph), cependant elle a été avancée au week end précédent pour correspondre aux dates d'un tournoi, elle est sortie le 28 mai 2004 ([news sur le passage à la v13b](https://web.archive.org/web/20040701092125/http://dofus.com/?page=informations&rubrique=news&contenu=news_display&idnews=86)). Le changelog de la mise à jour est disponible [ici](https://web.archive.org/web/20040706115519/http://www.dofus.com/index.php?page=informations&rubrique=betatests&ssrubrique=beta13&contenu=beta13).  
La première nouveauté de ce patch est l'ajout de l'interface d'échange, elle sécurise les échange entre les joueurs et évite de devoir déposer un objet par terre et que quelqu'un de mal intentionné s'en empare. Une seconde nouveauté est l'ajout de vendeurs, je crois que le changelog fait référence aux vendeurs dans les temples mais c'est à confirmer. L'apparition des artworks est arrivée avec cette mise à jour, les artworks sont les illustrations qui s'affichent en début de tour d'un joueur ou monstre, ou bien l'image du pnj qui s'affiche lors d'un échange. La plupart des artworks sont issus des skins des monstres dans les versions précédent la v12b et certains le resteront jusqu'à dofus retro. Dans les petites autres modifications, il est possible d'afficher les personnages cachés derrière les murs et il y a eu des corrections d'autres petits problèmes comme celui du chargement du fichier de langue. Les personnages n'ont pas été supprimés comme pour les autres beta, preuve que le contenu et l'équilibrage commençais à s'orienter vers des niveaux plus élevés.

La v13b est également arrivée avec une très grosse mise à jour des armes: il n'y a plus d'armes fournie au niveau 1, il faut les acheter ou les dropper, les armes ont un niveau d'équipement et il est possible de s'équiper de n'importe quelle arme, en contrepartie les armes ne sont plus visibles, ce changement est un très gros changement par rapport au début de la beta du jeu et elle permet d'identifier simplement une version du jeu.

Il semble également que le dragon cochon soit apparu avec cette version et qu'il avais un bug comme l'évoque [ce sujet sur le forum](https://web.archive.org/web/20040701071818/http://forum.dofus.com:80/Autres/Divers/59402-LeCochonDragon), son niveau devais être très faible et il apparaissait dans une grotte de la montagne des craqueleurs. 

Cette version de la beta est restée en ligne 1mois, c'est surement une des plus longues beta, il est sur une des sujet disponible [ici](https://web.archive.org/web/20040803095952/http://forum.dofus.com/CarnetBord/Dev) question d'un patch v13.1b mais je n'ai aucune informations.

### Dofus v14b ... ou pas?

Cette version n'est jamais sortie mais... a eu beaucoup de communication. Elle devait sortir début juillet 2004, mais elle n'est jamais sortie et finalement la v15 est sortie à la place. Un changelog sur les nouveautés graphiques est disponible [ici](https://web.archive.org/web/20040803101443/http://forum.dofus.com:80/CarnetBord/Graph/74659-NouveautesGraphiquesDeLaV14). Il est évoqué l'ajout d'un port, il s'agit surement du port de madrestam. Il y a également l'ajout des batiments des métiers et des nouveaux pnj, monstres et objets. Ce changelog a été publié le 30 juin 2004 donc la beta étais très proche (la date cible devais être le 5-6 juillet 2004).

Une autre liste de changement a été publiée officieusement sur le site test de warparadise (celui de la beta v6b disponible [ici](https://web.archive.org/web/20040706223930/http://www.warparadise.com/wpr/rpg/?p=123&id=40)), le message d'origine a été publié le 24 juin 2004. Le message évoque la fin des accès limités aux zones des monstres, à partir de ce moment le jeu est en beta ouverte pour tous, cette version devais également ajouter les premiers métiers au jeu avec les métiers de forgeron, paysans, boulanger, bucheron, bijoutier, cordonnier, sculpteur. Le métier alchimiste est apparu plus tard. Enfin, les personnages ont été remis à zéro pour cette beta suite à l'ajout de beaucoup de contenu.

### Dofus v15b

Cette version est sortie le 5 juillet 2004, elle correspond aux modifications de la v14b et de la v15b, la v14b n'étant pas sortie réellement. Le changelog est disponible [ici](https://web.archive.org/web/20040723072021/http://www.dofus.fr:80/?page=informations&rubrique=betatests&ssrubrique=beta15&contenu=beta15) et est plus gros que les changelog précédents.

Cette mise à jour est conséquente en améliorations sur les intéractions des joueurs, les pnj peuvent désormais avoir des dialogues et des intéractions avec les joueurs, il est possible d'intéragir avec des éléments du décors (ressources métiers, craft, fontaines de jouvence pour récupérer des points de vie) et les métiers sont ajoutés. Les alignements font également leur apparition, il s'agit des anges et des démons, le système d'honneur et déshonneur est mis en place en même temps et le perdant d'un combat d'alignement se retrouve en prison a devoir récolter des patates. L'interface des caractéristique a été modifiée pour ajouter les métiers et l'alignement. Les monstres ont désormais un temps avant leur réapparition et enfin il n'y a plus de zones réservées aux joueurs [M].  

Fait intéressant: sur cette version tous les monstres pouvais agresser à partir du moment où le personnage passais à coté d'eux, c'est à dire même lors d'un déplacement, ce comportement a rapidement été modifié comme expliqué [ici](https://web.archive.org/web/20040713145117/http://forum.dofus.fr:80/CarnetBord/Rules/92161-AgressiviteDesMonstresCorrigee)

Sur l'aspect technique, cette version améliore encore l'utilisation de flash player 7 et le client commence à vraiment exploiter ces nouvelles fonctionnalités.

### Dofus v16b

Cette version est sortie le 6 juillet 2004 soit le lendemain de la v15b, le changelog est disponible [ici](https://web.archive.org/web/20040812144352/http://www.dofus.fr:80/?page=informations&rubrique=news&contenu=news_display&idnews=100). La v16b ajoute essentiellement des corrections de bug. Il est également question dans la news d'un record du nombre de connecté a 990 et du changement du serveur. Une carte du monde de la v16b est disponible [ici](https://web.archive.org/web/20161017180243im_/http://ophmialeen.free.fr/MapDofusQM/1024.jpg), il semble manquer quelques cartes mais ca permet d'avoir une idée de la surface de jeu à ce moment.

Une image très rare de l'interface de connexion de la beta (ici pour la v16b) est visible [ici](https://web.archive.org/web/20221222090950/https://i75.servimg.com/u/f75/09/01/97/69/beta1610.jpg), ce fichier était sur le serveur et il est le seul obstacle pour permettre de relancer les versions beta du jeu aujourd'hui. L'image a été postée en 2013 [ici sur le forum jeuxonline](https://web.archive.org/web/20230519094036/https://forums.jeuxonline.info/sujet/1102255-27/ancien-joueur-2004-2005). Sur cette capture, dans le coin haut droit on remarque l'icone de report de bug, cette icone a été déplacé du coin haut gauche au coin haut droite entre la v12b et la v16b.

### Le changement du serveur de la beta

Je fait une petite partie sur le changement du serveur car il y a plusieurs news qui en parle, cette partie ne va pas parler de dofus mais purement d'histoire de l'informatique et elle peux être ignorée si ca ne vous intéresse pas.

Un ancien serveur est visible [sur cette vidéo de Liche](https://youtu.be/2qZfNjmEpdc?t=185), mais je ne pense pas que c'est ce serveur qui hébergais le jeu. Sur [l'annonce de la v16b(https://web.archive.org/web/20040812144352/http://www.dofus.fr:80/?page=informations&rubrique=news&contenu=news_display&idnews=100) il est question d'un celeron 400, ce processeur étais déja ancien à l'époque, les années 2000 ont connus de grosses évolution des processeur (rapide montée en fréquence et multiplication du nombre de coeur). Une description du processeur est disponible [ici](https://web.archive.org/web/20050315213918/https://www.cpu-world.com/CPUs/Celeron/Intel-Celeron%20400%20-%20FV80524RX400128%20(FV524RX400%20128).html), le serveur évoqué pourrais être un Dell poweredge 1300 ou un [IBM eserver xseries 200](https://web.archive.org/web/20210721040248/https://www.ibm.com/support/pages/overview-ibm-eserver-xseries-200). Le serveur était déja obsolète en 2003 mais ils a tenu la charge, le chiffre de 990 personnages connectés sur le serveur montre que le serveur développé en Java de dofus était bien pensé, surtout qu'à l'époque le développement multithread ou asynchrone n'étais pas aussi simple qu'aujourd'hui.  
Les caractéristiques du nouveau serveur sont disponibles [ici](https://web.archive.org/web/20040812163804/http://www.dofus.fr:80/?page=informations&rubrique=news&contenu=news_display&idnews=103), les performances sont surement bien meilleures avec ce serveur, il étais espéré pouvoir tenir jusqu'à 3000 personnes connecté en simultanée. La quantité de RAM à également dû être augmentée avec le nouveau serveur, même si 1go de ram aujourd'hui c'est même pas ce qu'il faut pour les dernières versions de Dofus 2 sous flash, pour l'époque c'était beaucoup. Le nouveau serveur semble être un IBM eServer xSeries 306. Malheureusement, il n'y a aucune information sur les systèmes d'exploitation utilisés à l'époque.

Pour terminer sur ce serveur, le serveur physique a été nommé Counch, il semble avoir été mis en place le 23 juillet 2004 pour la version v17b qui sortira la semaine suivante ([source](https://web.archive.org/web/20040812162846/http://www.dofus.fr:80/?page=informations&rubrique=news&contenu=news_display&idnews=102)).

Avant de revenir à Dofus, il est évoqué [le 21 juillet 2004](https://web.archive.org/web/20040812162003/http://www.dofus.fr:80/?page=informations&rubrique=news&contenu=news_display&idnews=101) que tous le nombre est au travail pour la sortie du jeu, dernière ligne droite avant la sortie.

### Dofus v17b

Après d'autres recherche, il est possible qu'une version v17b soit sortie avant la v17.1b (qui serait sortie le lendemain), cependant je ne peux malheureusement pas le confirmer.

#### Dofus v17.1b

Officiellement la dernière version beta, la version v17.1b est sortie le 30 juillet 2004, la news du passage à cette version est disponible [ici](https://web.archive.org/web/20040823072733/http://www.dofus.com:80/?page=informations&rubrique=news&contenu=news_display&idnews=106). Cette mise à jour ajoute les dofus et divers équilibrages. Sur les éléments non documentés, cette mise à jour ajoute des monstres ainsi que des nouvelles cartes, une partie du sud d'amakna est ajoutée (porcos, géles, scarafeuilles), la maison arbre est déplacée, l'ile du cimetière d'amakna est arrivée et pour le reste des nouvelles cartes je ne sais pas exactement. Il y a également l'ajout des dofus obtenu via le drop, j'ai comme information que le minotoror dropais le dofus pourpre et avais un temps de réapparition qui était plutot long, il apparaissait dans les champs d'amakna et dans les plaines des scarafeuilles. Un autre ajout est les runes de téléportations, elles permettaient de se déplacer partout, je n'ai pas plus d'information sur ces rune mais le système était bien plus souple que celui des zaaps.  

#### Dofus v17.2b

Une deuxième version de cette beta a vu le jour, cette version corrige les problèmes de la v17.1b et est sortie le 4 aout 2004, son changelog peux être consulté [ici](https://web.archive.org/web/20040817025604/http://forum.dofus.com/CarnetBord/Dev/121065-ReV172bCorrectionsApporteesSuite). Il y a beaucoup de modifications, je ne vais reprendre que le plus intéressant.  
On commence avec le nerf des runes de téléportation avec le retrait de la possibilité de se tp sur certaines cartes. Les plus grosses modifications sont sur le serveur avec l'ajout des ia pour les invocations. Il est également question des parchemins de caractéristiques, ce qui pourrais expliquer l'apparition de Loopine, les parchemin étant décris comme comportant un bug qui est corrigé, il est possible qu'ils aient été ajouté avec la v17b. L'obtention de ces parchemins est considéré comme des quêtes.

Le 6 aout 2004 le serveur est mis à jour et ajoute le bonus d'xp lors de combat en groupe, jusqu'à 200% à 8.

#### Les images de ces versions

On peux voir [cette capture](https://web.archive.org/web/20230519104623/http://xenografter.chez-alice.fr/Screenshots/Bar.jpg) qui est réalisée sur les dernières versions de la beta (présence de pnj et de l'icone de bug à droite). [Cette capture](https://web.archive.org/web/20230519105123/http://xenografter.chez-alice.fr/fin%20beta/Dolmen.jpg) montre le jeu juste avant la fin de la beta v17.2b. [Un autre screen](https://web.archive.org/web/20050119200759/http://www.dofus.com/bonus/forums/dofus_clubic01.jpg) montre l'interface des caractéristiques avec les métiers, ce screen a été fait entre la v15b et 1.0 mais je ne sais pas quand exactement.  

Une carte du monde est disponible [ici](https://web.archive.org/web/20040805043936/http://ophmialeen.free.fr:80/map.htm) ***mais attention*** certaines images des cartes proviennent de la version 1.0 (la banque d'amakna par exemple). Enfin, la carte du monde qui correspond a peu près à cette version est disponible [ici](https://web.archive.org/web/20050122194306/http://magoliroub2.online.fr/logitheque/Dofus/carte_dofus.png), la zone de la forêt maléfique était peux être déja disponible cependant à l'époque il est "interdit" de spoil le chemin donc il n'y a aucune information dessus.

#### Flash player

Sur cette page [du forum](https://web.archive.org/web/20040728034405/http://forum.dofus.com/) il y a un sujet nommé "Nouveautés au niveau du Client Flash v17b", de ce que je sais, les versions de dofus v17b à 1.13 ont besoin d'une version du lecteur flash entre la version 7 et 9, peux être que la v17b est la première à obliger le passage à flash player 7 sans pour autant en utiliser toutes les fonctionnalités.

## 4. Les premières versions officielles

### Avertissement

Bien que à partir de maintenant je parle des version de dofus 1.0 et supérieur, je considère le jeu toujours comme étant en beta car il va subir beaucoup de modification jusqu'à sa sortie internationale le 1er septembre 2005 avec dofus 1.9.

### Dofus 1.0

La première version officielle, elle est sortie le 23 aout 2004 pour une sortie "officielle" le 1er septembre 2004. Les modifications depuis la v17.2b sont disponibles [ici](https://web.archive.org/web/20040921070937/http://www.dofus.com/?page=news&rubrique=v1.0&contenu=v1.0), il y a l'ajout du système jour/nuit, le mode marchand, l'achat des maisons, des banques, les monstres sont déplacés dans leur zone respectives et différents correctifs de problèmes. Plusieurs patch correctif ont eu lieu après cette mise à jour mais il s'agissait de patch du coté du serveur, le client n'ayant pas besoin de ces patch, ils sont disponible [ici](https://web.archive.org/web/20040918054310/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=125) pour celui du 1er septembre, [ici](https://web.archive.org/web/20040921070843/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=128) pour celui du 8 septembre et [ici](https://web.archive.org/web/20041010191712/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=132) pour celui du 20 septembre 2004.


Du coté du client, l'interface de connexion et de choix de personnage est modifiée pour s'approcher des couleurs de l'interface de jeu (les interfaces sont visible [ici](https://web.archive.org/web/20040925001211/http://www.dofus.com:80/?page=decouvrir&rubrique=presentation&contenu=guide_pas01)), le nombre de personnages passe de 10 à 5, cette interface restera la même jusqu'à la version 1.13.1. Il y a également une modification sur l'interface de jeu, les icones en haut à droite sont désormais 3 et le bouton qui permettais de reporter un bug pendant la beta a disparu, l'interface de cette version est visible [ici](https://web.archive.org/web/20221222185806/http://xenografter.chez-alice.fr/Screenshots/Chasse%20au%20Mulou.JPG) (la carte possède également quelques élément intéressant, il s'agit d'une des 2 mines de la foret abraknyde et elle possède un soleil qui a disparu depuis. Sur le screen on peux également voir le sort foudroiement qui est déja sorti).  

[Ce screen](https://web.archive.org/web/20221222195805/http://xenografter.chez-alice.fr/Screenshots/Fort%20Bobard.JPG) montre l'apparion des coffres aux trésor sur cette version. En plus des Cartes au trésor des mineurs et boulangers sombre, il est possible de voir qu'une carte au trésor des bworks ainsi qu'une carte au trésor des forgerons sombres ont été crées, ces 2 cartes ne sont jamais sorties mais sembles avoir été crées au même moment que les autres.

D'autres informations:
- Les cartes qui contenaient le batiment extérieur du bureau des affaires sont modifiées: sur la carte au dessus de la taverne d'amakna il y est placé une banque et sur la carte en dessous du kanojedo en [4,4] il y a une maison. on perd encore un élément de l'idée originale du jeu.
- Les changelogs font mention d'une caverne des roublard mais je ne sais pas du tout à quoi il est fait référence, peux être au temple du cimetière d'amakna?

Je pense qu'il s'agit de la plus ancienne version qu'il serait possible de recréer de manière plus ou moins fidèle, bien qu'il faudrais le fichier de l'interface de connexion, cette version est très bien documentée.

### Le futur prévu par les développeurs

Dans un sondage publié à la sortie de la 1.0 et terminé le 3 septembre 2004 ([lien](https://web.archive.org/web/20040918083314/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=126)) sur les futures fonctionnalitées, on y retrouve l'élevage de Tabi qui arrivera finalement avec la version 1.15 mais les tabis seront remplacés par les dragodindes. Il est évoqué également la création de guilde, il y a donc eu un changement d'appelation entre la beta et la sortie officielle: dans les betas, les guildes sont les classes. Enfin il est question d'un jeu de carte à collection et à jouer, la version 1.39 de Dofus rétro s'inspire de cette idée, une première version de ce système de collection de cartes est intégrée au jeu peu après la version 1.0 (elle n'est pas présente dans la 1.0 mais est présent dans la 1.9), d'après les fichiers du jeu, l'interface est partiellement ajoutée au client et différents types de cartes sont crées cependant l'idée ne sera pas développée avant dofus 1.39.  
Au final, la fonctionnalité gagnante du sondage est l'élevage mais les guildes arriveront avant, cette mise à jour devais être la version 2.0 du jeu et sera au final déployé en tant que version 1.x.  

Dans une news du 22 septembre 2004 il est question de modifications sur les skins des personnages pour simplifier l'utilisation des montures, cette modification sera effectuée avec la version 1.2 du 18 octobre 2004, il est possible de voir les nouveaux et anciens skins [ici](https://web.archive.org/web/20041010192358/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=134), une news du 6 octobre 2004 montre des modifications avant la sortie de la mise à jour suite au retour des joueurs, les skins remodifiées sont visible [ici](https://web.archive.org/web/20041010194024/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=138).  

Avant la sortie de la version 1.2, [une liste des prochaines évolutions] (https://web.archive.org/web/20041011023622/http://www.dofus.com/index.php?page=news&rubrique=evolutions&contenu=evolutions) est publiée, elle évoque la version 1.1 (je reviens à son contenu plus tard) avec sa date de sortie (le 11 octobre 2004). La sortie de la version 1.3 est annoncée au 15 novembre avec l'ile de moon. La news évoque les nouveaux skins des personnages et la nouvelle classe qui arriveront plus tard que prévu. La fin de la mise à jour parle également de la possibilité de jouer à dofus derrière un pare feu ou un proxy, de la sortie du chateau d'amakna (version 1.14) et des montures et de l'élevage (version 1.15).


### Dofus 1.1 

La sortie de cette version a eu lieu le 11 octobre 2004, la news de la sortie est disponible [ici](https://web.archive.org/web/20041026161611/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=142). Le changelog de la mise à jour est disponible [ici](https://web.archive.org/web/20041028220648/http://www.dofus.com/?page=news&rubrique=v1.1&contenu=v1.1) et la news du changelog [ici](https://web.archive.org/web/20041026160759/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=141). La mise à jour 1.1 ajoute l'ile des wabbits, le métier de tailleur et de forgeur de haches ainsi que l'updater en plus de l'habituel équilibrage. Le changelog rappel également qu'à l'époque, les aggressions faisaient perdre les équipements des perdant. L'updater arrive pour la première fois avec cette version, il permettais de mettre automatiquement le jeu à jour.

### Dofus 1.2

Le 18 octobre 2004, lors [d'un reboot du serveur](https://web.archive.org/web/20041027174351/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=143) [la mise à jour 1.2 est déployé](https://web.archive.org/web/20041112070926/http://www.dofus.com/?page=news&rubrique=v1.2.1&contenu=v1.2.1), elle apporte la nouvelle apparence des personnages ainsi que des correctifs, le 29 octobre 2004 [la mise à jour 1.2.1 est déployé](https://web.archive.org/web/20041103233231/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=148) et corrige les problèmes de la version 1.2.

[Une base de donnée correspondant à cette version du jeu est disponible ici](https://web.archive.org/web/20041129153944/http://magoliroub2.online.fr:80/logitheque/Dofus/dofus_bdd.PDF)

### Dofus 1.3

Cette mise à jour est sortie le 15 novembre 2004 et les changements sont disponible [ici](https://web.archive.org/web/20041116110846/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=152). L'ile de moon est ajoutée et il y a une phase d'équilibrage. Pour les nouveaux personnages, ils arrivent désormais dans le temple de leur classe et il est prévu d'ajouter un tutoriel au jeu. Pour l'ile de moon, il semble quelle provient directement des restes du projet moon qui est à la base un jeu GBA mais qui a finalement été abandonné.  

La mise à jour 1.3.1 est sortie le 30 octobre 2004, les changements sont disponible [ici](https://web.archive.org/web/20041208173514/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=155), il y est question de diverses petites modifications, de l'ajout des sacrieur a des fins de test (pour le staff ou pour des testeurs?) et enfin un tutoriel est ajouté, il semble s'agir du tutoriel avec l'aigle qui a été remis en place avec dofus rétro.  

A partir du 23 novembre 2004, les maintenances et mises à jour passent du mercredi au mardi, la news est disponible [ici](https://web.archive.org/web/20041120124214/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=153). Finalement sur dofus retro il est décidé que le jour des maintenances sera le mercredi, un retour aux sources en quelque sorte.

### Dofus 1.4

Cette mise à jour est sortie le 15 décembre 2004 et le changelog est divisé entre [un premier changelog](https://web.archive.org/web/20050126134629/http://www.dofus.com/?page=news&rubrique=news&contenu=news_display&idnews=156) qui est officiel et [un autre changelog](https://web.archive.org/web/20041221193242/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=158) qui ajoute des éléments oubliés au changelog. Cette mise à jour ajoute les sacrieur, le métier d'alchimiste (qui permettait de créer des potions d'oubli de sort), les attitudes hors combat, Sufokia, le systèmes des armes de prédilections, le système du mariage et d'autres modifications mineures. L'aura du niveau 100 qui fait son apparition dans cette mise à jour montre que les joueurs commencaient à arriver à des niveau plutot élevé.  

Sur le client, cette mise à jour apporte de grosses modifications: 
- En jeu, parmis les trois boutons en haut à droite, le plus à gauche sert désormais a accéder à un menu d'options.
- L'interface de personnage est totalement revue, même si elle sera encore modifiée, elle restera assez proche jusqu'à dofus 1.13, un aperçu est visible [ici](images/choixperso1.4.png), elle changera ensuite encore au moins 2 fois: une première fois à partir de la 1.14 puis une seconde fois plus tard pour être celle de dofus 1.29/dofus retro.  

Les correctifs version [1.4.1](https://web.archive.org/web/20041223175823/http://www.dofus.com:80/?page=news&rubrique=news&contenu=news_display&idnews=160) puis [1.4.2](https://web.archive.org/web/20050126004915/http://www.dofus.com/?page=news&rubrique=v1.4.2&contenu=v1.4.2) sont sortis les 17 et 20 décembre 2004. Les modifications les plus importantes sont le passage de Foudroiement et Glyphe enflammée en dégats feu.  

[Une base de donnée avec les informations qui correpondent à cette version est disponible ici](https://web.archive.org/web/*/http://magoliroub2.online.fr:80/logitheque/Dofus/dofus_bdd_old.xls).

### Dofus 1.5

Cette mise à jour est sortie le 8 février 2005, le changelog est disponible [ici](https://web.archive.org/web/20050228173433/http://www.dofus.com/index.php?page=news&rubrique=v1.5.0&contenu=v1.5.0) et il est compliqué de suivre correctement les modifications, le forum est modifié et à l'époque les posts des développeurs étaient crées parfois pour des changelog complet et parfois pour un simple petit message. Cette mise à jour aura 2 mises à jour mineure: [la version 1.5.1](https://web.archive.org/web/20050325035159/http://www.dofus.com/index.php?page=news&rubrique=v1.5.1&contenu=v1.5.1) le 1er mars 2005 qui apporte des changements importants comme le système de phénix et [la 1.5.2](https://web.archive.org/web/20050310081157/http://www.dofus.com/?page=news&rubrique=v1.5.2&contenu=v1.5.2) le 2 mars 2005 qui corrige des problèmes.

La version 1.5.0 apporte l'ajout des guildes, les classes ne sont donc plus appelées guildes. Les guildes ne seront que très peu modifiées sur la version 1 de Dofus. Ensuite, le livre de l'interface ne sert plus pour l'ouverture de la carte, le livre est donc remplacé par l'icone de la géoposition (qui étais présent lors des betas mais retiré), on peux donc voir la carte du jeu de manière simple. Les livres sont désormais des éléments à part entière du gameplay et ils prmettent d'avoir les informations que le carnet de bord devais donner.  
Dans les améliorations ont retrouve une nouvelle région: Tainéla semble avoir été ajoutée avec cette version, d'autres version semblent avoir été ajoutées mais je ne sais pas lesquelles. La manière de déplacement est également modifiée: les runes de téléporations sont remplacées par des zaap qui sont fixes. Enfin, cette version vois apparaitre la forgemagie.
Des infos sur les guildes peuvent être trouvées [ici](https://web.archive.org/web/20061128063026/http://dofus.jeuxonline.info/articles/2198/Les-guildes) et [ici](https://www.dofus.com/fr/forum/1750-dofus/6337-mise-jour-07-02-2005) (si non disponible, voir le changelog de la 1.5 sur ce site).

La version 1.5.1 est une version avec de grosses modifications malgré que ca soit une version mineure, elle ajoute le système d'énergie tel qu'il est dans dofus retro et modifie beaucoup de sorts de classes. En parallèle, il est deviens impossible de voler les équipements des adversaires lors d'aggression et le système ange/démon commence à disparaitre. Pour les interfaces, il y a différentes petites modification qui permettent l'optimisation du client, ces modification sont surement liées au support total de Flash 7 (et d'actionscript 2).  

La version 1.5.2 n'est qu'une mise à jour mineure qui apporte quelques correctif.  

Il semble que cette version corresponde à la recompilation de beaucoup de fichiers sprite pour les faire correspondre à Flash Player 7, il est également possible que ca soit à ce moment que le bitolder ai été rendu disponible dans les fichiers du jeu (mais non fonctionnel). 

### Dofus 1.6

Pour cette version, il est compliqué d'avoir une liste des changements réelle et complète. Elle est sortie le 19 avril 2005. Officiellement le changelog est [ici](https://web.archive.org/web/20050420234353/http://www.dofus.com/?page=news&rubrique=v1.6.0&contenu=v1.6.0) mais d'autres détails sont disponible [ici](https://web.archive.org/web/20051026094034/http://forum.dofus.com/topic.php?id=11053), [ici](https://web.archive.org/web/20051027025114/http://forum.dofus.com/topic.php?id=11894), [ici](https://web.archive.org/web/20051026094015/http://forum.dofus.com/topic.php?id=12433), [ici](https://web.archive.org/web/20051027143104/http://forum.dofus.com/topic.php?id=12404) et le 21 avril un patch est déployé, [source](https://web.archive.org/web/20051026140809/http://forum.dofus.com/topic.php?id=12669). La mise à jour 1.6.1 est sortie le 26 avril 2005 pour corriger certains problèmes ([source](https://web.archive.org/web/20061116033119/http://dofus.jeuxonline.info/index.php?page=archives&mois=4&annee=2005)).  

Une liste des changements de la version 1.6.3 est disponible [ici](https://web.archive.org/web/20061116032938/http://dofus.jeuxonline.info/index.php?page=archives&mois=6&annee=2005), elle est sortie le 2 juin 2005.  

Cette mise à jour ajoute beaucoup de contenu:
- La carte du monde fait x3 (d'après Tot), il est annoncé 2000 nouvelles carte (brakmar, sidimote, cania, bonta). Un nouveau système d'alignement avec Bonta et Brakmar qui remplace le système ange/démon. Les zones enclos de bonta et brakmar ne sont pas encore disponible, les cités sont plus petites que ce quelles deviendront.
- Cette version vois l'ajout du mode spectateur.
- Les métiers chasseur/boucher et pecheur/poissonnier font leur arrivée, ils permettent de créer de la concurence au métier de paysan/boulanger (je rappel qu'avant cette version, seules les céréales à amakna sont disponible donc c'est assez peu). Il est également ajouté les drop spéciaux aux métiers de récolte.
- Amélioration de l'interface de géoposition.
- Arrivée de la barre d'inventaire: on peux désormais afficher les sorts ou des objets (fonctionnement comme sur Dofus rétro).
- Le médaillon peux servir à autre chose qu'afficher le portrait du personnage.
- Le chat reçoit également des nouvelles commandes.

La version 1.6.1 viens corriger les bugs de la version 1.6.0, d'après [ce lien](https://web.archive.org/web/20061116032806/http://dofus.jeuxonline.info/index.php?page=archives&mois=5&annee=2005), je suppose que la version 1.6.2 est sortie le 3 mai 2005, elle vient corriger des bugs et ajouter un peu de contenu (surtout est batiments à Brakmar).
Pour la version 1.6.3, elle semble ajouter plus de choses, il est possible que cette mise à jour 1.6 soit sortie en plusieurs parties car le changelog de la 1.6.3 évoque l'ajout de quetes d'alignement, de cartes et de monstres.

Sur cette version il semble que le fonctionnement du lancement du jeu est toujours le même: il faut passer par un navigateur ou par le fichier lancement.html, [ce sujet sur jol](https://web.archive.org/web/20230501111511/https://forums.jeuxonline.info/sujet/507661/probleme-arret-du-lancement-de-dofus-a-cors-swf) évoque encore l'utilisation du fichier dofus.swf, l'executable n'était toujours pas disponible.

Il y a surement d'autres choses à dire mais actuellement je n'ai rien trouvé d'autre pour le moment.


## 5. La sortie internationnale


On entre dans une période de flou, aucune version n'est indiquée dans les notes de modifications, il s'agit d'une période de correction de problème et de petites modifications, ca va durer jusqu'à la 1.9.0 qui est sortie le 1er septembre 2005. 

### Dofus 1.7

Cette mise à jour semble être sortie le 28 juin 2005, un changelog est disponible [ici](https://web.archive.org/web/20051022111048/http://forum.dofus.com/topic.php?id=15913), sa news d'annonce est diponible [ici](https://web.archive.org/web/20051022111014/http://forum.dofus.com/topic.php?id=15057), un premier patch correctif est disponible [ici](https://web.archive.org/web/20051022111152/http://forum.dofus.com/topic.php?id=16069) et un autre correctif est disponible [ici](https://web.archive.org/web/20051022230907/http://forum.dofus.com/topic.php?id=16145). Encore un autre patch est disponible [ici](https://web.archive.org/web/20051022111140/http://forum.dofus.com/topic.php?id=16199) et un correctif d'une arme est [ici](https://web.archive.org/web/20051022111202/http://forum.dofus.com/topic.php?id=16434), beaucoup d'autres patch sont sortie pour cette mise à jour, il s'agit généralement de petits patch.

Dans les changements majeurs, on trouve l'ajout du village brigandin (et donc des transporteurs brigandin un peu partout), la caractéristique chance qui au passage est dissociée de la prospection (même si la chance continue de donner de la prospection) et enfin il y a le début du niveau 6 des sorts (chantier qui sera terminé avec la version 1.21).  

Il est question [ici](https://web.archive.org/web/20230501112724/https://forums.jeuxonline.info/sujet/550404/version-1-8-0) d'une version 1.7.1 mais il n'y a aucune information sur sa sortie.

### Dofus 1.8 et beta du serveur anglais

Cette mise à jour est sortie le 20 juillet 2005, le changelog peux être consulté [ici](https://web.archive.org/web/20051028174559/http://forum.dofus.com/topic.php?id=17140), pour les joueurs, elle n'ajoute rien. Mais pour les développeurs elle change beaucoup de choses, le client est modifié pour pouvoir être utilisé avec plusieurs langues. En même temps que la sortie de cette mise à jour, une nouvelle version du site est sortie (pour la version anglaise) ainsi que la partie communauté du forum est ajoutée. 
Le 16 aout 2005 un reboot avec des modifications a eu lieu ([source](https://web.archive.org/web/20061117004523/http://dofus.jeuxonline.info/actualites/8250.html)). 

Cette version est une beta pour la version internationale et elle corrige les bugs pour la version internationale et repartir sur une bonne base pour la suite. Le client de la première version anglaise semble être un client spécifique indépendant de la "vraie" version 1.8 du jeu mais sur [ce lien](https://web.archive.org/web/20050724014910/http://download.dofus.com:80/), les liens de téléchargement sont ceux de la version 1.8.0 classique malgré qu'il soit indiqué sur le site qu'il s'agit de la version 1.0 beta. A partir de la version 1.9, la version anglaise semble avoir repris ce numéro de version, ainsi il n'y a jamais eu de différence de version entre la version française et la version internationale.

### Dofus 1.9

LA version, pour moi il s'agit de la vraie version 1.0 du jeu, elle est sortie le 1er septembre 2005 (1 an après la sortie officielle du jeu), elle intègre des petits correctifs mais surtout elle pose les bases des prochains clients du jeu. Le lendemain, le 2 septembre 2005, le patch 1.9.1 a été déployé. Le changelog officiel est disponible [ici](https://web.archive.org/web/20051012094317/http://communaute.dofus.com/infos/versions.php) et sa version plus complète sur le forum est disponible [ici](https://web.archive.org/web/20060327122608/http://forum.dofus.com/topic.php?id=18637). La note du patch 1.9.1 est disponible [ici](https://web.archive.org/web/20060302110124/http://forum.dofus.com/topic.php?id=18854), ce patch est sorti le 2 septembre 2005 et il est sorti pour corriger un bug qui jetais au sol un équipement au lieu de l'équiper sur le personnage.

Cette version est la première qui ne permet plus de jouer depuis le site internet jouer.dofus.com. Depuis les beta, cette page permettait de lancer le jeu depuis le navigateur, cette version intègre l'interface de connexion directement dans et client et comme il s'agit de la première version avec un vrai serveur de connexion, l'accès au jeu depuis le site web est surement devenue trop complexe à développer. Désormais un fichier exe est intégré au client et il permet de lancer le jeu sans passer par le navigateur. Ces modifications expliquent que els screens avant septembre 2005 soient en très grande majorité pris sur un navigateur internet tandis qu'à partir de septembre 2005 on ne vois plus de navigateur.


La vitesse des animations en combat du jeu est augmentée par 1.5, les combats de dofus 1.29 était déja lent mais ca ne devais pas être mieux avant la version 1.9.    

Sur les modifications du client, il y a beaucoup à dire:
- La manière dont son gérés les textes, désormais le client va vérifier la langue de l'ordinateur et pouvoir afficher le texte en anglais ou en français en fonction de la langue de l'ordinateur.
- Il deviens fortement conseillé de jouer via le dofus.exe plutot que par un navigateur internet. Il n'est plus question de lancer le jeu depuis jouer.dofus.com, j'ignore quand a eu lieu cette modification mais pour jouer avec un navigateur il fallais passer par le fichier html dans l'installation du jeu.
- Le système des connexion est revu, avant cette version, le système de connexion se faisait à l'aide du serveur php présent pour le téléchagement des fichiers de langue. Le serveur php gérait la connexion du client flash player et il envoyait au joueur la liste de ces perosnnages puis le jeu se connectais au serveur de jeu. A partir de cette version, la partie connexion et chargement des personnages se fait à l'aide d'un serveur de connexion, surement redéveloppé en java comme le serveur de jeu. De plus, une interface est ajoutée au moment de la création du personnage où le joueur doit choisir le serveur de jeu sur lequel sera le personnage. Ce nouveau serveur permet l'utilisation de plusieurs serveurs de jeu et il sera le même jusqu'à la version 1.13.1.

Un nouveau serveur est sorti, il s'agit du serveur Rushu qui est le premier serveur international.  

Les serveurs ont également été modifiés physiquement, un serveur est dédiée aux bases de données et les serveur de jeux ont désormais 1 serveur physique/serveur ainsi si un serveur s'arrête il est toujours possible d'accéder aux autres. Cette modification fait de la version 1.9 une version "1.0" n°2.  

## 6. Conclusion

Pour terminer, à partir de la version 1.9.1, même si il y aura beaucoup de modifications les bases sont la, quasiment tous le contenu de la v1b a disparu et a progressivement été remplacé, même si il reste beaucoup à faire comme les montures qui ne sont toujours pas disponible en 1.9, dofus 1.29 sera basé beaucoup plus sur cette version 1.9 que sur la version 1.0.


