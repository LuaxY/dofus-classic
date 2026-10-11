# French lang data reconstruction (agent D, wave 2)

The beta 5b language data (`langupdater.php` → `SharedObject "DofusSO"`) is lost. This file documents how
`web/public/lang/fr.json` was rebuilt, where each value comes from, and what is still uncertain.

| File | What |
|---|---|
| `web/public/lang/fr.json` | The `SHARED_OBJECT.data` object `core/lang.ts` expects (`setLangData`): 300 string keys (the 289 inventory keys of `docs/logic/lang-keys.json` + 11 dynamic `SRV_MSG_<id>` / `ERROR_*_<c>` keys) and the tables `S`, `CC`, `M`, `G`, `I.t`, `I.st`, `I.e` |
| `web/public/lang/fr.provenance.json` | One provenance record (`source`, `evidence`, `note`, `original` when a retro string was adapted) per key, and per field of every table entry. `S`/`M`/`I.e` entries also carry a `confidence`, unidentified spells a `candidates` object |
| `web/src/core/lang.fr.test.ts` | Loads `fr.json` through `setLangData` and checks it (see Verification) |

Both JSON files were written by one throwaway generator (not kept in the repo) so they started in sync. Edit
`fr.json` and `fr.provenance.json` together from now on: `lang.fr.test.ts` fails if they stop describing the same keys
and fields. Vite serves the file as `/lang/fr.json` (public root `web/public`); the boot code has to fetch it and call
`setLangData`.

## 1. Method

### 1.1 Source tiers

Every value is tagged with the first tier that supplies it.

| Tier | Meaning | Where |
|---|---|---|
| `beta` | Text baked in a beta 5b SWF, or a 5b code/asset fact | `dofus-5b/modules/Interfaces.swf` field texts and PushButton default labels; `dofus-5b/clips/guilds/descriptions/*.swf`; `GUILD_NAMES`; weapon imports of the class sprites |
| `beta_screenshot` | Rendered in a dated beta screenshot (v4b–v6b) | `vendor/wayback-dofus-2004/screenshots/` (`docs/missing-data-search.md` §4) |
| `beta_forum` | **Added tier** (not in the brief): named in a beta-era official forum post | `vendor/wayback-dofus-2004/pages/ankama-studio_forumdofus_tid1448_20040711.html` (8 Jan 2004) |
| `beta_sibling` | Later beta material | `vendor/dofushistory/changelogsbeta.md` (v9b), `vendor/archive-dofus-1/` (v7b-v17_2b; also the ground/object graphics beta 5b lacks, `web/public/assets/swf/clips/*.fill.json`, `docs/assets-format.md` §11) |
| `release_sibling` | **Added tier** (assets only, no lang value uses it): the first non-beta official client, Dofus 1.0 (23 Aug 2004), unpacked from Ankama's installer | `vendor/archive-dofus-1/v1_0/` (ground/object graphics that no beta build has, `docs/assets-format.md` §11) |
| `retro_fr` | dofedex 2004+ lang SWFs, post-beta | `vendor/dofedex/lang-fr/` (`lang_fr_7`, `spells_fr_100`, `classes_fr_31`, `items_fr_13`, `maps_fr_35`) |
| `retro_emulator` | **Added tier** (server data only, no lang value uses it): a Dofus Retro emulator's database, community-sniffed, much later than beta 5b (1.39.8) | `vendor/starloco/` (map teleport cells and positions; used for the links of the world maps, `server/data/maps.json`, `docs/server.md` "World maps") |
| `owner` | **Added tier**. Stated by the project owner (answers to §7 and checks of authored rules) | — |
| `authored` | Written for this port | — |

### 1.2 Rules

- **Baked texts.** The initial text of a field (or the `on(initialize)` default `label` of an `Ank::Dofus::PushButton`)
  is a design-time value that `getText` overwrites at runtime. It counts as `beta` only when (a) it sits in the exact
  instance the `getText` call sets (instance name checked in `web/public/assets/swf/modules/Interfaces.json`), and
  (b) it is a plausible label, not sample data. Rejected as placeholders: `mmmm`, `hoho`, `aa`, `Bo`, `bb`, `18`,
  `200`, `99999`, `guilde 1`, `cout : 9`, `sdfsdf…`, the one-letter button labels (`C`, `Y`, `N`, `V`, `J`, `S`, `Q`).
  Where the call site appends text (`IN_WAINTING + "..."`, `SEARCHING_RANDOM + "..."`), the suffix is stripped from
  the baked text (`"En attente ..."` → `"En attente "`).
- **Screenshots** give the rendered lang value of a widget; the call site's own suffix is stripped
  (`CHANNEL + " : "` renders `Salon :` → `CHANNEL = "Salon"`). Where a screenshot and a baked text agree, the key is
  tagged `beta` and both are cited. One conflict, see §5.
- **Retro strings** are used verbatim unless they are wrong for 5b; then the key becomes `authored` with the retro
  text kept in `original`. Reasons found: `{~…}` combine markup (5b `getText` has no PatternDecoder pass, it would
  print), a `%2` the 5b call never passes (`BAD_VERSION`), later vocabulary that contradicts beta SWF text (`kama`
  vs *pièces d'or*, `Classe` vs *Guilde*, `Invocation/Maîtrise/Spécial/Elémentaire` vs *Feu/Terre/Air/Eau*,
  `sagesse/chance` vs *Charisme/Karma*, `salon de discussion` vs *channel*), a 2007 support URL, a text describing
  another effect (`BOOST_FRIEND_ACTION_POINTS`), and a final period before the `" : "` the 5b site appends
  (`ERROR_CREATING_GAME`, `ERROR_JOINING_GAME`).
- **Authored text** follows the beta register: informal *tu*, `<b>name</b>` in chat lines, `(s)` plurals
  (`tour(s)`, `case(s)`), *perso*, *channel*, *guilde*, *pièces d'or*. Each key uses exactly `%1..%n` for the
  `n` params its call sites pass. HTML only where the target renders HTML (chat lines, `msgBox`, tooltips,
  `DESCRIPTION_RANDOM`); `boxYesNo` uses `setText`, so `DO_U_ACCEPT_INVITATION` is plain text.
- **Keys are case-sensitive in the port.** SWF 6 looked them up case-insensitively; `lang.ts` does `data[ref]`, so
  `RANGE` and `Range` are both present, and `DELETE`/`RANDOM` use the spelling the AS calls.
- **No game numbers invented.** Numbers appear only where a beta source gives them (spell `l1` from the description
  SWFs, Iop/Ecaflip close combat from the v9b changelog); everything else is left empty.

## 2. Counts per provenance

Keys are counted per key; tables per field (one field of one entry = 1).

| Source | Inventory keys (289) | Dynamic keys (11) | Table fields (750) |
|---|---|---|---|
| `beta` | 59 | 0 | 100 (S 63, G 37) |
| `beta_screenshot` | 27 | 0 | 6 (I.e 6) |
| `beta_forum` | 0 | 0 | 2 (S 2) |
| `beta_sibling` | 0 | 0 | 2 (G 2) |
| `retro_fr` | 119 | 6 | 163 (M 139, I.t 22, S 2) |
| `authored` | 84 (15 adapted from retro_fr, 69 written) | 5 | 477 (S 280, M 147, I.t 22, G 11, CC 10, I.st 7) |

Most authored table fields are the 140 placeholder spells (`n` = `"Sort <id>"`, `d` = `""`).

## 3. Tables

### `S` (spells)

The lang key of a spell is its `m_ID`, which is also its icon file (`Spell.iconFile` = `clips/spells/icons/<m_ID>.swf`).
The 163 icons (ids 1–33, 41–48, 61–130, 141–183, 189–194, 198–200) all get an entry. The animation files
`clips/spells/<animID>.swf` (101…1107) are a different id space and are not lang keys.

**The 21 level-1 spells come from the beta SWFs.** Each guild description SWF (2, 3, 5–9) embeds three 40×40 JPEGs.
Every one matches a spell icon pixel for pixel (mean abs difference ≤ 13/255 across RGB, next best ≥ 13.5), and its
y position pairs it with a `+ Name   PO : x   PA : y   effect` title line and the paragraph under it. This gives
`n`, `d` and `l1 = [effect column, "", PA, PO]` (PA/PO only when the line has them). It also shows that retro ids
cannot be trusted: beta Osamodas 22 = *Cri de l'ours* and 23 = *Chat*, where retro has 22 = Déplacement Félin and
23 = Cri de l'Ours. Retro `spells_fr_100` names are therefore only listed as candidates.

`l1[2]`/`l1[3]` are read only by the character-creation preview (`SpellInfosViewer`). The description SWFs belong to the
older, unused creation UI (`docs/logic/ui.md` §2.6, `Interface::GuildsDescriptions`) and predate 5b balance: the
8 Jan 2004 post already moves Cri de l'Ours from 4 to 2 PA and Bond's range, which the SWF still shows as 4 PA /
PO 6. In game the server sends the real AP/range.

| Id | Class | fr.json `n` | Confidence | Evidence | Retro id candidate |
|---|---|---|---|---|---|
| 4 | Féca | Renvoi de sorts | medium | three sources agree: forum name, retro id 4 = 'Renvoi de Sort', icon 4 shows an arrow bouncing back off a crescent |  |
| 21 | Osamodas | Chien | high | description SWF 2.swf: icon pixel-match + title/paragraph by y | Griffe Spectrale |
| 22 | Osamodas | Cri de l'ours | high | description SWF 2.swf: icon pixel-match + title/paragraph by y | Déplacement Félin |
| 23 | Osamodas | Chat | high | description SWF 2.swf: icon pixel-match + title/paragraph by y | Cri de l'Ours |
| 24 | Osamodas | Corbeau | medium | three sources agree: forum name, retro id 24 = 'Corbeau', icon 24 shows a bird in flight |  |
| 41 | Enutrof | Armure pelleteuse | high | description SWF 3.swf: icon pixel-match + title/paragraph by y | Sac Animé |
| 42 | Enutrof | Troc | high | description SWF 3.swf: icon pixel-match + title/paragraph by y | Chance |
| 43 | Enutrof | Lancer de pelle | high | description SWF 3.swf: icon pixel-match + title/paragraph by y | = same name |
| 81 | Xélor | Ralentissement | high | description SWF 5.swf: icon pixel-match + title/paragraph by y | = same name |
| 82 | Xélor | Contre | high | description SWF 5.swf: icon pixel-match + title/paragraph by y | = same name |
| 83 | Xélor | Aiguille | high | description SWF 5.swf: icon pixel-match + title/paragraph by y | = same name |
| 101 | Ecaflip | Roulette | high | description SWF 6.swf: icon pixel-match + title/paragraph by y | = same name |
| 102 | Ecaflip | Pile ou face | high | description SWF 6.swf: icon pixel-match + title/paragraph by y | = same name |
| 103 | Ecaflip | Chance d'Ecaflip | high | description SWF 6.swf: icon pixel-match + title/paragraph by y | = same name |
| 121 | Eniripsa | Mot curatif | high | description SWF 7.swf: icon pixel-match + title/paragraph by y | = same name |
| 122 | Eniripsa | Mot blessant | high | description SWF 7.swf: icon pixel-match + title/paragraph by y | = same name |
| 123 | Eniripsa | Mot drainant | high | description SWF 7.swf: icon pixel-match + title/paragraph by y | = same name |
| 141 | Iop | Pression | high | description SWF 8.swf: icon pixel-match + title/paragraph by y | = same name |
| 142 | Iop | Bond | high | description SWF 8.swf: icon pixel-match + title/paragraph by y | = same name |
| 143 | Iop | Intimidation | high | description SWF 8.swf: icon pixel-match + title/paragraph by y | = same name |
| 161 | Crâ | Flèche magique | high | description SWF 9.swf: icon pixel-match + title/paragraph by y | = same name |
| 162 | Crâ | Tir critique | high | description SWF 9.swf: icon pixel-match + title/paragraph by y | = same name |
| 163 | Crâ | Flèche glacée | high | description SWF 9.swf: icon pixel-match + title/paragraph by y | = same name |

Unidentified spells (confidence `unknown`, 140) have `n = "Sort <id>"`, `d = ""` and no `l1`. Candidates
(not in `fr.json`):

| Class (ids) | Unidentified ids with the retro name at the same id (`spells_fr_100`, candidates only) |
|---|---|
| Féca | 1 Armure Incandescente; 2 Aveuglement; 3 Attaque Naturelle; 5 Trêve; 6 Armure Terrestre; 7 Bouclier Féca; 8 Retour du bâton; 9 Attaque Nuageuse; 10 Glyphe Enflammé; 11 Téléportation; 12 Glyphe d'Aveuglement; 13 Glyphe de Silence; 14 Armure Venteuse; 15 Glyphe d'immobilisation; 16 Science du bâton; 17 Glyphe Agressif; 18 Armure Aqueuse; 19 Bulle; 20 Immunité |
| Osamodas | 25 Soin Animal; 26 Bénédiction Animale; 27 Piqûre Motivante; 28 Crapaud; 29 Crocs du Mulou; 30 Fouet; 31 Invocation de Dragonnet Rouge; 32 Résistance Naturelle (**forum: La Mouche Tueuse? (forum, Osamodas; icon 32 looks like a winged insect; no retro equivalent)**); 33 Griffe Cinglante |
| Enutrof | 44 Roulage de Pelle; 45 Clé Réductrice; 46 Désinvocation; 47 Boîte de Pandore; 48 Tanière des Roches |
| Sram | 61 Sournoiserie; 62 Concentration de Chakra; 63 Coup Sournois; 64 Repérage; 65 Piège Sournois; 66 Attaque Trompeuse; 67 Peur (**forum: Peur (forum, Sram; retro 67 = Peur; icons 67 and 68 are the same mask)**); 68 Fourvoiement; 69 Piège d'Immobilisation; 70 Arnaque; 71 Piège Empoisonné; 72 Invisibilité; 73 Piège Désinvocateur; 74 Double; 75 Pulsion de Chakra; 76 Attaque mortelle; 77 Piège de Silence; 78 Invisibilité d'Autrui; 79 Piège de Masse; 80 Piège Mortel |
| Xélor | 84 Gelure; 85 Flou; 86 Aiguille Chercheuse; 87 Démotivation; 88 Téléportation; 89 Dévouement; 90 Fuite; 91 Frappe de Xélor; 92 Rayon Obscur; 93 Flétrissement; 94 Protection Aveuglante; 95 Horloge; 96 Poussière Temporelle; 97 Cadran de Xélor; 98 Vol du Temps; 99 Momification; 100 Sablier de Xélor |
| Ecaflip | 104 Trèfle; 105 Bond du Félin; 106 Roue de la Fortune; 107 Topkaj; 108 Esprit Félin; 109 Bluff; 110 Griffe Joueuse; 111 Contrecoup; 112 Griffe de Ceangal; 113 Perception; 114 Rekop; 115 Odorat; 116 Langue Râpeuse; 117 Griffe Invocatrice; 118 Réflexes; 119 Tout ou rien; 120 Destin d'Ecaflip |
| Eniripsa | 124 Mot Soignant (**forum: Mot Soignant (forum; retro 124)**); 125 Mot Interdit (**forum: Mot interdit (beta 2b thread tid768; retro 125)**); 126 Mot Stimulant (**forum: Mot Stimulant (forum; retro 126)**); 127 Mot de Prévention; 128 Mot de Frayeur; 129 Mot d'Amitié; 130 Mot Revitalisant |
| Iop | 144 Compulsion; 145 Epée Divine; 146 Epée du destin; 147 Guide de Bravoure; 148 Amplification; 149 Mutilation; 150 Couper; 151 Souffle; 152 Epée du Jugement; 153 Puissance; 154 Epée Destructrice; 155 Vitalité; 156 Tempête de Puissance; 157 Epée Céleste; 158 Concentration; 159 Colère de Iop; 160 Epée de Iop |
| Crâ | 164 Flèche Chercheuse; 165 Flèche Enflammée; 166 Tir Puissant (**forum: Tir puissant (forum; retro 166)**); 167 Flèche d'Expiation; 168 Oeil de Taupe; 169 Flèche de Recul; 170 Flèche d'Immobilisation; 171 Flèche Punitive; 172 Tir Eloigné; 173 Flèche Harcelante; 174 Flèche Cinglante; 175 Flèche Destructrice; 176 Oeil de Lynx; 177 Flèche Ralentissante; 178 Flèche Absorbante; 179 Flèche Explosive; 180 Maîtrise de l'Arc |
| Sadida | 181 Tremblement; 182 La Folle; 183 Ronce; 189 La Sacrifiée; 190 La Gonflable; 191 Ronces Multiples; 192 Ronce Apaisante; 193 La Bloqueuse; 194 Ronces Agressives; 198 Sacrifice Poupesque; 199 Connaissance des Poupées; 200 Poison Paralysant |

Forum names not placed at all: **Double dégâts** (Féca), **Lévitation** (Xélor) — no retro equivalent and no
distinctive icon.

### `M` (maps)

143 entries: the 53 maps of `server/data/maps.json` (`retro_fr`, confidence low), 86 world maps (`retro_fr`, below)
and 4 authored placeholders.

**Server maps (53, `retro_fr`).** Names come from `vendor/dofedex/lang-fr/maps_fr_35.swf` (decompiled with
`tools/ffdec.sh -format script:as`). All 53 ids are in `MA.m`, but `MA.m[id]` is only `{x, y, sa}` (104 of the
7,301 entries add a `d`) and has **no name field**. The most specific name is therefore the sub-area `MA.sa[sa].n`.
For sub-area 0 that text is `//Amakna`, the same text as its area with a `//` prefix (49 of the 320 sub-area names carry
one), so those 16 maps use the area name `MA.a[0].n`. Each record in `fr.provenance.json` gives `x, y, sa`
and the field used. These are post-beta 2004 maps. Beta 5b arena ids and names are UNKNOWN.

| Ids | `n` | Count | Field |
|---|---|---|---|
| 53, 57, 101, 181, 489, 567, 1426, 1586, 1589, 1590, 1594, 1601, 1607, 1608, 1610, 1621 | `Amakna` | 16 | `MA.a[0].n` (area; sub-area 0 is `//Amakna`) |
| 35, 42, 48, 52, 161, 501, 504, 505, 507, 509, 661, 1427, 1605, 1665 | `Le village` | 14 | `MA.sa[10].n` (sub-area; area `Amakna`) |
| 178, 182, 909, 914, 1561, 1562, 1611, 1634, 1636 | `Port de Madrestam` | 9 | `MA.sa[1].n` (sub-area; area `Amakna`) |
| 1275, 1278, 1370, 1371, 1375 | `La péninsule des gelées` | 5 | `MA.sa[12].n` (sub-area; area `Amakna`) |
| 671, 673, 946 | `Le coin des Boos` | 3 | `MA.sa[179].n` (sub-area; area `Amakna`) |
| 1490, 1493 | `Garnison d'Amakna` | 2 | `MA.sa[28].n` (sub-area; area `Amakna`) |
| 740, 1520 | `La montagne des Craqueleurs` | 2 | `MA.sa[2].n` (sub-area; area `Amakna`) |
| 578 | `La forêt d'Amakna` | 1 | `MA.sa[4].n` (sub-area; area `Amakna`) |
| 1117 | `La plage de Moon` | 1 | `MA.sa[93].n` (sub-area; area `L'île de Moon`) |

507 (the map of `map507.fixture.ts`) was already present, and the table confirms it. Names repeat because the
table only resolves to sub-areas. The map combo (`AKSClient/Events.AKS.Game.as:36`) therefore lists e.g. 14 ×
`Le village`. Coordinates were not added to `n`: that would be authored text, and they don't separate every map
anyway (501, 504 and 505 are all at 2,-2).

**World maps (86, `retro_fr`, confidence low).** The maps of `server/data/maps.json` `world` that had no entry
(42, 48, 567 and 578 are also fight maps), added by `scripts/server-data/maps.ts` with the same rule and record
format: `La forêt d'Amakna` (`MA.sa[4]`) 37, `Le coin des Bouftous` (`MA.sa[5]`) 19, `Amakna` (`MA.a[0]`, sub-area 0)
14, `Le champ des Ingals` (`MA.sa[3]`) 8, `Le village` (`MA.sa[10]`) 5, `Bord de la fôret maléfique` (sic,
`MA.sa[22]`) 2, `Le temple Xélor` (`MA.sa[17]`) 1. 49 came with the first 51-map world, 37 with the 90-map world built
on the filled graphics (`docs/server.md` "World maps"). `getMapText` is only used for `DATACENTER.Map.name` there.

**Placeholders (4, `authored`, confidence unknown).** `Carte 12`, `Carte 13`, `Carte 15`, `Carte 20`. The ids
are the examples of `docs/protocol/game.md` and `protocol.test.ts`, and none of them is in `MA.m`.

`d` is `""` everywhere. The AS reads only `.n` (`AKSClient/Events.AKS.Game.as:17, 36, 84`). The only beta fight
map seen (`booge_wp_04.jpg`, a village square with a well) has no id.

### `G` (classes) and `CC`

| Field | Value | Source |
|---|---|---|
| `sn` | `GUILD_NAMES` | beta code (`AKSClient/Dofus.Kernel.Init.as:56`) |
| `ln` | first line of the description SWF without `>>> ` (`Guilde du fouet d'Osamodas` …) | beta; for 1, 4, 10 authored from retro `ln` in the beta pattern (`Guilde du bouclier Féca`, `Guilde de l'ombre de Sram`, `Guilde du soulier de Sadida`) |
| `d` | description paragraph, wraps joined, hard breaks kept, typos kept | beta; 1, 4, 10 = `Non disponible` as in the SWFs (no lore added) |
| `cc` | Iop, Ecaflip `[1, 5, null, 3]` (1D5, 3 PA, pre-v9b); others `[]` | beta_sibling (v9b changelog) / unknown |
| `w` | `[4]`, `[7]`, `[8]`, `[5]`, `[7]`, `[6]`, `[3]`, `[6]`, `[2]`, `[4]` | beta asset: every class sprite imports exactly `<type>_1` from `weapons.swf`, and the code builds `w[0] + "_1"` |

`CC[1..10]` = `Attaque au corps à corps avec <weapon of w>.` (authored). In 5b `Player.setCCData` passes `this.guild`,
which is undefined, so the game always gets the `"?"` fallback (`web/src/core/datacenter/player.ts:89`).

### `I.t`, `I.st`, `I.e` (items)

- `I.t[1..11]` (the 11 `clips/items/<type>/` folders): `n` and `t` from retro `items_fr_13` (Amulette, Arc, Baguette,
  Bâton, Dagues, Epée, Marteau, Pelle, Anneau, Ceinture, Bottes; super types 1–5). Both are consistent with 5b: the
  weapon types 2–8 are the ones the class sprites import, and the equipment slots take super types 1, 2, 3 (twice), 4, 5.
  `g` (0 m, 1 f) authored. `s` authored as a **plural** flag: `Dofus.DataCenter.Item.as:77` passes `!s` as `combine()`'s `singular`,
  so `s: false` renders singular names correctly; `true` for Dagues and Bottes.
- `I.st[1..7]` authored plurals for the inventory filter tooltips (`Afficher (Armes)`); 6 `Consommables` and
  7 `Boucliers` are named after the retro types filed under them — no 5b item uses them.
- `I.e` holds only the three effects of the beta tooltip in `booge_wp_05.jpg`
  (`Bâton de boisaille karmique repoussant / dommages : 1D5 / +10 au karma / fait reculer de 1case(s)`): `100`
  `{n: "de boisaille", d: "dommages : #1{~1D}#2{~2~3+}#3"}`, `123` `{n: "karmique{~ps}", d: "+#1 au karma"}`,
  `5` `{n: "repoussant{~fe}{~ps}", d: "fait reculer de #1case(s)"}`. Text from the screenshot. The ids `100` (neutral
  damage, `#1`D`#2`+`#3`) and `123` (karma, `+#1`) and their parameter layout are `owner`, confidence high; `5` is
  authored (the retro id of push-back), confidence low.
  The field `c` of the lang.ts fallback is never read and is omitted.
- Server items (`server/data/items.json`, generated by `scripts/server-data/items.ts`, `docs/server.md` "Items"): one
  template per item icon (137), named by the client from `I.t` + `I.e`, so they rest on the effect ids above:
  weapons carry `100` (authored dice 1D4-1D8 +0-3, e.g. `Bâton de boisaille`, `dommages : 1D4`), the others `123`
  (`+<gfx> au karma`, e.g. `Anneau karmique`). `5` is not used. If the ids change here, re-run the script (it fails on
  any name or description showing `?`).

## 4. Authored keys

Inventory keys tagged `authored` (84) plus the 5 authored dynamic keys. *Adapted from retro_fr* rows keep the retro
text in `fr.provenance.json` (`original`). Help-tooltip targets were found by comparing each hotspot rectangle of the
help layers (Interfaces sprites 429, 392, 400, 413, 418, 428) with the tab layouts (sprite 372 and children).

| Key | Params | Value | Basis |
|---|---|---|---|
| `BAD_VERSION` | 1 | `La version %1 de DOFUS installée est trop ancienne. Pour accéder au jeu, installe la nouvelle version.` | adapted from retro_fr: retro uses %2 but the 5b call passes one param [VERSION] (Dofus.Client.DataProcessor.as:88); second sentence rewritten in 'tu' |
| `BOOST_FRIEND_ACTION_POINTS` | 2 | `<b>%1</b> augmente les points d'action de son équipe de <b>%2</b>.` | adapted from retro_fr: retro text speaks of physical damage; the 5b site (Events.AKS.Game.as:705, action 121) updates AP; wording follows BOOST_FRIEND_LIFE_POINTS |
| `CANT_CONNECT` | 0 | `Le serveur est introuvable. Connexion impossible.` | adapted from retro_fr: dropped the ankama-games.com support link (2007+ site) |
| `CANT_MOVE_ITEM_IN_GAME` | 0 | `Impossible de déplacer un objet en partie.` | modelled on retro CANT_BOOST_IN_GAME |
| `CREATE_GUILD` | 0 | `Guilde` | adapted from retro_fr: beta calls classes 'guildes' (GUILD_NAMES, baked 'Sorts de Guilde', 'Guilde' column #294) |
| `CREATE_NAME` | 0 | `Nom` | the unused older creation UI has a static 'Nom :' label (#716) |
| `DESCRIPTION_RANDOM` | 0 | HTML, 4 paragraphs: `- Jouer seul` / `Affronte un adversaire choisi au hasard.` / `- Constituer une équipe` / `Invite tes amis dans ton équipe et affrontez ensemble une autre équipe.` | htmlText; layout copied from the baked placeholder #262 ('- description / sdfsdf / - sdfsdfsdsf / sdfsd', Verdana 11 white); titles = the two button labels; 'adversaire choisi au hasard' per the beta 5 FAQ (vendor/wayback-dofus-2004/pages/forum.dofus.com_FAQDeDofus_20040213.html) |
| `DO_U_ACCEPT_INVITATION` | 1 | `%1 t'invite à rejoindre son équipe. Acceptes-tu ?` | plain text (boxYesNo uses setText); %1 = inviter's character name |
| `EMPTY` | 0 | `vide` | same word as the baked empty-slot label of TabGameJoined_PlayerEmpty (#891 'vide') |
| `ENTER_DOFUS` | 2 | `Ton ami <b>%2</b> (%1) vient de se connecter.` | `FI<p1>;<p2>;` assumed p1 = account, p2 = character (same order as the FL entries); open question |
| `ERROR_CREATING_GAME` | 0 | `Erreur lors de la création de la partie` | adapted from retro_fr: final period dropped: the 5b site appends " : " + `ERROR_CREATING_<c>` (Events.AKS.Game.as:62) |
| `ERROR_CREATING_n` | dyn | `ce nom de partie est déjà utilisé` | shown as ERROR_CREATING_GAME + ' : ' + this; meaning guessed from the letter (n = nom) |
| `ERROR_JOINING_GAME` | 0 | `Impossible de rejoindre la partie` | adapted from retro_fr: final period dropped: the 5b site appends " : " + `ERROR_JOINING_<c>` (Events.AKS.Game.as:100) |
| `ERROR_JOINING_f` | dyn | `la partie est complète` | meaning guessed from the letter (f = full) |
| `ERROR_JOINING_p` | dyn | `mot de passe incorrect` | meaning guessed from the letter (p = password) |
| `HELP_1` | 0 | `Jouer : affronte d'autres joueurs en partie aléatoire, seul ou en équipe.` | target: tab button 'Jouer' (hotspot 52,15) |
| `HELP_10` | 0 | `Envoie ton message aux joueurs du channel.` | target: button 'Envoyer' (424,512) |
| `HELP_11` | 0 | `Les joueurs présents dans le channel, avec leur niveau entre parenthèses.` | target: channel user list (558,287); '(9) Edenisia' in booge_wp_03.jpg |
| `HELP_2` | 0 | `Entraînement : crée ou rejoins une partie pour t'entraîner avec tes amis.` | target: tab button 'Entraînement' (200,15) |
| `HELP_3` | 0 | `Amis : gère ta liste d'amis et vois où ils se trouvent.` | target: tab button 'Amis' (348,15) |
| `HELP_4` | 0 | `Retour au village : quitte la Console Multi et retourne dans le village.` | target: button 'Retour au village' (436,15) |
| `HELP_5` | 0 | `Ouvre le menu principal.` | target: home button → KERNEL.showMenu() (616,15) |
| `HELP_6` | 0 | `Coche ou décoche ces cases pour afficher ou cacher les messages communs, privés, d'information et d'erreur.` | target: 4 chat filter checkboxes (436,259) |
| `HELP_7` | 0 | `Choisis le channel dans lequel tu veux discuter.` | target: channel combo 'Salon :' (558,257) |
| `HELP_8` | 0 | `Zone de chat : les messages des joueurs du channel et les informations du jeu s'affichent ici.` | target: chat window (18,257, 498×248) |
| `HELP_9` | 0 | `Tape ton message ici puis appuie sur Entrée. Pour un message privé : /w nom message` | target: chat input line (-2,512) |
| `HELP_FRIENDS_12` | 0 | `Entre le nom d'un perso puis clique sur Ajouter pour l'ajouter à ta liste d'amis.` | target: tabFriends.btnAddCharacter (66,83) |
| `HELP_FRIENDS_12B` | 0 | `Entre le nom d'un compte puis clique sur Ajouter : tous les persos de ce compte seront ajoutés à ta liste d'amis.` | target: tabFriends.btnAddAccount (66,147); account semantics as in DofusGuideUtilisateur.pdf (Feb 2004) |
| `HELP_FRIENDS_13` | 0 | `Tes amis connectés : le nom de leur compte et du perso qu'ils jouent.` | target: lstOnlineFriends, column 'Compte (Perso)' (171,31) |
| `HELP_FRIENDS_14` | 0 | `Le niveau du perso joué par ton ami.` | target: column 'Niveau' (439,31) |
| `HELP_FRIENDS_15` | 0 | `Indique où se trouve ton ami : dans un channel, dans le village ou en combat.` | target: state icon column pic_IN_* (499,31) |
| `HELP_FRIENDS_16` | 0 | `Tes amis qui ne sont pas connectés.` | target: lstOffLineFriends (549,31) |
| `HELP_FRIENDS_17` | 0 | `Met à jour ta liste d'amis.` | target: BtnRefresh 327 (718,5) |
| `HELP_JOINED_12` | 0 | `Les informations de la partie : nom, carte, mot de passe, temps par tour, niveaux d'écart et nombre de joueurs.` | target: TabGameJoined left panel (4,4, 241×167) |
| `HELP_JOINED_13` | 0 | `Aperçu de la carte sur laquelle se déroulera le combat.` | target: TabGameJoined.MapImage (258,33) |
| `HELP_JOINED_14` | 0 | `Lance le combat. Seul le créateur de la partie peut le faire.` | target: btnPlay → AKS.Game.start(), visible for the creator only (260,119) |
| `HELP_JOINED_15` | 0 | `Quitte cette partie.` | target: btnCancel → AKS.Game.leave() (260,144) |
| `HELP_JOINED_16` | 0 | `Le créateur de la partie peut exclure un joueur en cliquant ici.` | target: TabGameJoined_Player.btnKill, creator only (393,33) |
| `HELP_JOINED_17` | 0 | `Les joueurs inscrits dans la partie : nom, guilde et niveau.` | target: player rows txtName/txtGuild/txtLevel (417,33) |
| `HELP_JOINED_18` | 0 | `Choisis ton équipe.` | target: radioTeam0/radioTeam1 (683,13) |
| `HELP_JOIN_12` | 0 | `Choisis la partie que tu veux rejoindre. Le nombre de joueurs inscrits est indiqué entre parenthèses.` | target: comboGames (19,50); labels 'Name (n / max)' per docs/protocol/game.md GL |
| `HELP_JOIN_13` | 0 | `Met à jour la liste des parties.` | target: BtnRefresh 344 (161,50) |
| `HELP_JOIN_14` | 0 | `Si la partie est protégée, entre ici son mot de passe.` | target: txtGamePass1 (19,95) |
| `HELP_JOIN_15` | 0 | `Rejoins la partie choisie.` | target: btnJoin (53,141) |
| `HELP_JOIN_16` | 0 | `Donne un nom à ta partie.` | target: txtGameName (222,50) |
| `HELP_JOIN_17` | 0 | `Tu peux protéger ta partie par un mot de passe. Laisse vide pour l'ouvrir à tous.` | target: txtGamePass2 (222,94); empty password allowed (docs/protocol/game.md GC2) |
| `HELP_JOIN_18` | 0 | `Choisis le nombre de joueurs de chaque équipe.` | target: comboNumberPlayer (222,141) |
| `HELP_JOIN_19` | 0 | `Choisis l'écart de niveau maximum autorisé entre les joueurs.` | target: lstDeltaLevel (381,94) |
| `HELP_JOIN_20` | 0 | `Choisis la carte sur laquelle se déroulera le combat.` | target: comboMaps (379,50) |
| `HELP_JOIN_21` | 0 | `Choisis le temps dont chaque joueur dispose pour jouer son tour.` | target: lstTimePerTurn (504,94) |
| `HELP_JOIN_22` | 0 | `Aperçu de la carte choisie.` | target: TabJoinGame.MapImage (618,51) |
| `HELP_JOIN_23` | 0 | `Crée la partie. Tu pourras lancer le combat quand tous les joueurs seront là.` | target: btnCreate (618,141) |
| `HELP_PLAYSTART_12` | 0 | `Joue seul contre un adversaire choisi au hasard.` | target: playAlone_btn 'Jouer seul' (108,145); random opponent per the beta 5 FAQ |
| `HELP_PLAYSTART_13` | 0 | `Constitue une équipe avec tes amis pour affronter une autre équipe.` | target: makeTeam_btn 'Constituer une équipe' (274,145) |
| `HELP_PLAYSTART_15` | 0 | `Tes amis connectés. Double-clique sur un nom pour lui envoyer un message privé.` | target: TabPlayDofus_TeamMateFree list (533,20); onDblClick → wisperBox |
| `HELP_PLAYSTART_16` | 0 | `Met à jour la liste de tes amis connectés.` | target: BtnRefresh 258 in TeamMateFree (685,21) |
| `HELP_PLAY_12` | 0 | `Un membre de ton équipe, avec son nom, son niveau et ses points de vie.` | target: first team slot, character sprite area (19,55) |
| `HELP_PLAY_13` | 0 | `Rechercher : lance la recherche d'une équipe adverse. Seul le chef d'équipe peut le faire.` | target: TabPlayDofus_TeamMate.btnPlay 'Rechercher' → AKS.Game.startSearch(), creator only (19,120) |
| `HELP_PLAY_14` | 0 | `Retire ce joueur de l'équipe.` | target: TabPlayDofus_TeamMate.btnCancel 'Annuler' → invitationUndo(id) (19,145) |
| `HELP_PLAY_15` | 0 | `Un coéquipier. Un point d'interrogation indique un coéquipier choisi au hasard.` | target: team slot 2 (152,53); txtExclam '?' shown for id 0 = random |
| `HELP_PLAY_16` | 0 | `Un coéquipier.` | target: team slot 3 (285,53) |
| `HELP_PLAY_17` | 0 | `Un coéquipier.` | target: team slot 4 (417,53) |
| `HELP_PLAY_18` | 0 | `Choisis un ami à inviter, ou « Aléatoire » pour qu'un coéquipier soit choisi au hasard.` | target: TeamMateChoose.lstFriends, first item RANDOM (574,50) |
| `HELP_PLAY_19` | 0 | `Met à jour la liste de tes amis connectés.` | target: BtnRefresh 258 in TeamMateChoose (695,26) |
| `HELP_PLAY_20` | 0 | `Inviter : invite l'ami choisi à rejoindre ton équipe.` | target: TeamMateChoose button labelled 'Inviter' (instance btnCancel) (590,145) |
| `IN_CHANNEL` | 0 | `dans un channel.` | style of retro IN_SOLO 'dans le village.' |
| `IN_RANDOM` | 0 | `dans une partie aléatoire.` | style of retro IN_MULTI 'dans un combat.' |
| `IS_BUT_WHERE` | 2 | `<b>%1</b> (%2) : position inconnue` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME; also the not-found answer `'AW\|<name>'` calls it with %1 = "!" (Dofus.Client.DataProcessor.as:103-107) |
| `IS_ENTERING_GAME` | 2 | `<b>%1</b> (%2) entre dans une partie` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `IS_INCLOSE_GAME` | 3 | `<b>%1</b> (%2) est dans la partie aléatoire <b>%3</b>` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `IS_IN_CHANNEL` | 3 | `<b>%1</b> (%2) est dans le channel <b>%3</b>` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `IS_IN_OPEN_GAME` | 3 | `<b>%1</b> (%2) est dans la partie d'entraînement <b>%3</b>` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `I_AM_BUT_WHERE` | 2 | `Je suis <b>%1</b> (%2), mais je ne sais pas où !` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `I_AM_ENTERING_GAME` | 2 | `Je suis <b>%1</b> (%2) et j'entre dans une partie.` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `I_AM_IN_CHANNEL` | 3 | `Je suis <b>%1</b> (%2) dans le channel <b>%3</b>.` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME |
| `I_AM_IN_CLOSE_GAME` | 3 | `Je suis <b>%1</b> (%2) dans la partie aléatoire <b>%3</b>.` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME; state 3 = random game |
| `I_AM_IN_OPEN_GAME` | 3 | `Je suis <b>%1</b> (%2) dans la partie d'entraînement <b>%3</b>.` | params [characterName, accountName, channel/game name] (Events.AKS.Account.as:19-72); pattern of retro I_AM_IN_SINGLE_GAME / IS_IN_SINGLE_GAME; state 2 = free game = 'Entraînement' tab |
| `LEAVE_DOFUS` | 2 | `Ton ami <b>%2</b> (%1) vient de se déconnecter.` | same assumption as ENTER_DOFUS |
| `MODERATE_CHARISM` | 2 | `Le charisme de <b>%1</b> varie de <b>%2</b>` | adapted from retro_fr: retro 'sagesse' is the later name; beta label is Charisme |
| `MODERATE_KARMA` | 2 | `Le karma de <b>%1</b> varie de <b>%2</b>` | adapted from retro_fr: retro 'chance' is the later name; beta label is Karma |
| `SPELL_TAB_AIR` | 0 | `Air` | adapted from retro_fr: matches the beta tab title "Sorts d'Air" (#849) |
| `SPELL_TAB_EARTH` | 0 | `Terre` | adapted from retro_fr: matches the beta tab title 'Sorts de Terre' (#847) |
| `SPELL_TAB_FIRE` | 0 | `Feu` | adapted from retro_fr: matches the beta tab title 'Sorts de Feu' (#845) |
| `SPELL_TAB_GUILD` | 0 | `Guilde` | adapted from retro_fr: matches the beta tab title 'Sorts de Guilde' (#851) |
| `SPELL_TAB_WATER` | 0 | `Eau` | adapted from retro_fr: matches the beta tab title "Sorts d'Eau" (#832) |
| `SRV_MSG_001` | dyn | `Le serveur va redémarrer. Termine vite tes combats !` | id and meaning are placeholders; note "001" ≠ "1" (string key) |
| `SRV_MSG_42` | dyn | `Tu as été déconnecté par un administrateur.` | id and meaning are placeholders for the future server |
| `STEAL_GOLD` | 2 | `<b>%1</b> vole <b>%2</b> pièce(s) d'or` | adapted from retro_fr: 'kama{~ps}' → "pièce(s) d'or": beta currency was gold (beta 2b changelog 'Gain de pièces d'or', Enutrof 'Troc … d'or volé'), and getText does no combine pass |
| `YOU_FIND_GOLD` | 1 | `Tu as trouvé %1 pièce(s) d'or` | adapted from retro_fr: same reason as STEAL_GOLD |

## 5. Verification

`bun test web/src/core/lang.fr.test.ts` (6 tests, all passing):

1. All 289 inventory keys resolve through `getText`; each uses exactly `%1..%n` for its `n` params; no string-valued
   key contains `{~`.
2. Dynamic keys for the ids of fixtures and protocol docs: `SRV_MSG_42` (`M142`), `SRV_MSG_001` (`M1001`),
   `ERROR_CREATING_n`, `ERROR_JOINING_p`, `ERROR_JOINING_f`.
3. `S` has every id of `dofus-5b/clips/spells/icons/` (163); `getSpellText(141)` (the `spells.md` example) is complete.
4. `getGuildText(1..10)` with `w[0]`, `getCCText(1..10)`, `getMapText` for 12, 13, 15, 20 and every map id of
   `server/data/maps.json` (read at test time, not a fixed list), `getItemTypeText(1..11)`,
   `getItemSuperTypeText(1..7)`, `getItemEffectText(100)` are fallback-free; the `DefineButton2_970` close-combat
   tooltip with `G[8].cc` gives `1D5 (3PA)`; the `items.md` example item is a weapon (`Armes`).
5. `getItemObjectFromData` rebuilds the `booge_wp_05.jpg` tooltip: `Bâton de boisaille karmique repoussant` and its
   three description lines.
6. `fr.json` and `fr.provenance.json` list the same keys, entries and fields, with known source tags.

Also checked (not in the test): v7b `Interfaces.swf` baked texts are the same as 5b's plus `Effets :` — no extra
lang evidence in the sibling build.

## 6. Notes for other agents

- `lang.ts` types are narrower than the data: `S[id].l1` has numbers at `[2]`/`[3]`, `G[id].cc` is an array (not a
  string), `ItemEffectText.c` is absent. Load with `as unknown as LangData` (the test does).
- `G[id].cc = []` for 8 classes: the close-combat tooltip then shows no dice and `ccData[3]` is `undefined`
  (AS prints `" (PA)"`). B1/B2 should not assume four numbers.
- `CANCEL` is set on a PushButton through `setText`, which PushButton lacks: the visible label is the baked
  `Annuler`.
- `SRV_MSG_0..4, 16` are retro texts; the ids 0 (spam), 1 (idle), 2 (max level), 3 and 4 (maintenance) are `owner`
  (§7 Q5). `SRV_MSG_42`/`SRV_MSG_001` and the `ERROR_*_n/p/f` codes only exist because the
  protocol docs and tests use them as examples. The Rust server should pick its ids from this file.
- `Spell.m_DescriptionNormalHit` at level > 1 is `undefined` for every spell (no `l2..l5` data).
- `ACTIONPOINTS` (character panels) is the beta `Points d'action`; `ACTION_POINTS` (spell info panel) stays the retro
  `Points d'actions` for lack of evidence, so the game shows both spellings.

## 7. Open questions for the user

1. **Spells.** Do you remember the beta 5b names of the 140 unplaced ids? In particular: where did *Double dégâts*
   (Féca), *La Mouche Tueuse* (Osamodas, icon 32?) and *Lévitation* (Xélor) sit, and are *Peur* = 67,
   *Mot Soignant* = 124, *Mot interdit* = 125, *Mot Stimulant* = 126, *Tir puissant* = 166 right? Retro ids are
   known to be wrong at least for 22/23.
2. **Close combat.** Dice and AP of the eight other classes in beta 5b (`G[id].cc`); was it still 1D5 / 3 PA for
   Iop and Ecaflip in 5b?
   *Partly answered (project owner, `owner`):* the per-class dice and AP are still unknown. Mechanics: a critical hit
   adds the critical bonus to the dice count; a critical miss spends the AP and ends the turn. Not implemented (the
   server has no criticals).
3. **`GAME_RESULTS`.** The 4b screenshot shows `Résultat du combat`, the 5b SWF field is baked `Résultats du combat`.
   Which did 5b display?
4. **Map names and ids** of the beta 5b fight maps (the `m` list in the Entraînement tab).
5. **Server message ids** (`M` packet → `SRV_MSG_<id>`) and the error letters of `GCE<c>` / `GJE<c>`: any you remember?
   *Partly answered (project owner, `owner`):* `SRV_MSG` ids 0 spam, 1 idle, 2 max level, 3 and 4 maintenance
   (`M10`, `M01`, `M12` are sent by the server, `docs/server.md`). `GCE` had no letter and joining errors went
   through other means, so this port's `GCE`/`GJE` letters stay authored.
6. **`FI` / `FO`** (`ENTER_DOFUS` / `LEAVE_DOFUS`): is `p1` the account and `p2` the character?
7. **Lobby help tooltips** (`HELP_*`, 50 keys) and the `/whoami` `/whois` lines (`I_AM_*`, `IS_*`): any original
   wording you remember? All are authored.
8. **Item effects.** Did beta weapon names come from effects (`de boisaille` attached to the damage effect), and what
   were the effect ids? Which items existed in 5b, and how were they obtained (the server now awards one random item
   to each winner of a fight)?
   *Partly answered (project owner, `owner`):* effect ids `100` (neutral damage, `p1`D`p2`+`p3`) and `123` (karma,
   `+p1`, added to the karma characteristic while equipped) and the parameter layout are confirmed. The item list and
   how items were obtained remain unknown.
9. `ADD_A_FRIEND`, `ADD_TEAMMATE`, `FREE_TEAMMATE` are all `Ajouter` from baked fields; retro has `Ajouter un ami`.
   Were they longer?
