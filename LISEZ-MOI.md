# Mon Écran

Un écran d'accueil façon iPhone, dans le navigateur : applis et dossiers, horloge et météo, « À la une », investissements, musique,
et des pages **Actus**, **Sport** (matchs, classements, programme TV, écarts de cotes), **Vidéos** (films, séries, YouTube),
**Investissements**, un **coffre** chiffré et une page **État** (santé des données, thème, synchronisation).
Tout tourne sur GitHub : des tâches automatiques récupèrent les données, GitHub Pages publie le site. Rien à installer, rien de payant.

- **iPhone** : ouvrir l'adresse du dock dans Safari → Partager → « Sur l'écran d'accueil ».
- **Android, PC** : Chrome ou Edge → « Installer l'appli » (menu ⋮ ou icône dans la barre d'adresse).

## Avoir son propre dock

Tout est expliqué pas à pas dans l'onglet **Tuto** du classeur `configuration.xlsx` (30 à 45 minutes, une seule fois) :
copie du dépôt (Fork), activation des tâches et de GitHub Pages, clés facultatives (TMDB pour Vidéos, The Odds API pour les cotes, Spotify).

## Régler son dock

- **Dans l'appli** : roue ⚙︎ en bas de l'accueil → Réglages (pages et widgets, écran d'accueil, médias, chaînes, compétitions, marchés).
  Thème de couleurs et mode clair/sombre : page **État** (on peut aussi y créer son propre thème à partir d'une palette coolors.co).
- **Dans le classeur** `configuration.xlsx` : tout ce que le dock affiche, coché ligne par ligne ; le déposer à la racine du dépôt suffit.
- **Choix personnels** (équipes favorites, abonnements vidéo, villes météo) : dans l'appli ; ils passent d'un appareil à l'autre par la synchronisation chiffrée.

Aucun secret dans le dépôt : codes, montants, clés restent sur l'appareil ou dans les secrets GitHub.

## Organisation du dépôt

```
(racine du dépôt)
├── index.html                 ← écran d'accueil
├── actus.html, sport.html, ecarts.html, videos.html, invest.html, cachee.html, etat.html, reglages.html
├── noyau.js, themes.js, synchro.js, sw.js   ← noyau commun, thèmes, synchronisation, mise en mémoire
├── configuration.xlsx         ← tes réglages (classeur)
├── config/                    ← réglages produits depuis le classeur (tâche « Configuration »)
├── outils/                    ← scripts des tâches (outils/dev : notes techniques)
├── .github/workflows/         ← tâches automatiques
├── calendriers/2026-27/       ← calendriers fournis à la main (voir plus bas)
└── logos/                     ← logos de clubs et de compétitions (voir plus bas)
```
Les données récupérées par les tâches sont publiées sur la branche `donnees`.

Mises à jour du dock : déposer `mise-a-jour-vNN.zip` à la racine ; la tâche « Mise à jour » l'installe.
Les fichiers de `.github/workflows` éventuellement fournis sont à déposer à la main (GitHub interdit aux tâches de les modifier).

---

Tu peux aussi compléter deux types de données sans toucher au code : **les calendriers** et **les logos**.

## Ajouter un calendrier

1. Copie le calendrier depuis le site officiel ou un PDF (LFP, LNR…).
2. Colle-le dans un fichier texte nommé d'après la compétition (voir le tableau plus bas),
   dans le dossier de la saison : `calendriers/2026-27/top-14.txt`.
3. Dépose-le sur GitHub. La tâche automatique met l'index à jour en 1 à 2 minutes.

Format attendu, très souple : un titre de journée, puis une ligne par match.

```
Journée 1
Castres Olympique - RC Toulon
Sam. 05/09 15h00  Stade Toulousain / Stade Rochelais

J2 : Section Paloise vs Racing 92
```

- Titres reconnus : `Journée 9`, `J9`, `9e journée`.
- Séparateurs reconnus entre les équipes : ` - `, ` – `, ` / `, ` vs `, ` contre `.
- Les dates, heures et scores sur la ligne sont ignorés.
- Une ligne commençant par `#` est un commentaire.

La tâche automatique utilise ce fichier en priorité pour numéroter les journées
(les dates et scores restent ceux d'ESPN). Si des matchs ne s'y retrouvent pas,
le voyant ⚠ de la page Sport te le signale.

## Ajouter des logos

- **Format** : PNG à fond transparent (idéal), ou SVG, WEBP, JPG. Carré, environ 200 × 200 px.
- **Clubs** : dans `logos/clubs/<pays>/`, nommé avec le nom du club :
  `castres.png`, `stade-toulousain.png`, `paris-saint-germain.png`.
  Le nom n'a pas besoin d'être exact : la page le rapproche du nom ESPN.
- **Compétitions** : dans `logos/competitions/`, nommé avec le code du tableau ci-dessous :
  `ligue-1.png`, `top-14.png`.
- Tes logos passent avant ceux d'ESPN et de TheSportsDB.

## Codes des compétitions

| Compétition | Code (nom du fichier) | Rubrique |
|---|---|---|
| Ligue 1 | `ligue-1` | France |
| Ligue 2 | `ligue-2` | France |
| Coupe de France | `coupe-de-france` | France |
| Trophée des champions | `trophee-des-champions` | France |
| Ligue des champions | `ligue-des-champions` | Compétitions européennes |
| Ligue Europa | `ligue-europa` | Compétitions européennes |
| Ligue Conférence | `ligue-conference` | Compétitions européennes |
| Supercoupe d'Europe | `supercoupe-d-europe` | Compétitions européennes |
| Coupe du monde | `coupe-du-monde` | Football international |
| Euro | `euro` | Football international |
| Qualifications Coupe du monde | `qualifications-coupe-du-monde` | Football international |
| Qualifications Euro | `qualifications-euro` | Football international |
| Ligue des nations | `ligue-des-nations` | Football international |
| Amicaux internationaux | `amicaux-internationaux` | Football international |
| Jeux olympiques | `jeux-olympiques` | Football international |
| Coupe du monde des clubs | `coupe-du-monde-des-clubs` | Football international |
| Premier League | `premier-league` | Angleterre |
| Championship | `championship` | Angleterre |
| Liga | `liga` | Espagne · Italie · Allemagne |
| Serie A | `serie-a` | Espagne · Italie · Allemagne |
| Bundesliga | `bundesliga` | Espagne · Italie · Allemagne |
| Top 14 | `top-14` | Rugby · France |
| Champions Cup | `champions-cup` | Rugby · Europe |
| Coupe du monde de rugby | `coupe-du-monde-de-rugby` | Rugby · International |
| Six Nations | `six-nations` | Rugby · International |
| Tests internationaux | `tests-internationaux` | Rugby · International |
| NBA | `nba` | Sports US |
| NFL | `nfl` | Sports US |
| NHL | `nhl` | Sports US |

## Le voyant ⚠ « État des données » (page Sport)

Il apparaît en haut de la page Sport quand quelque chose demande ton attention :

- programme TV absent ou pas mis à jour depuis plus de 12 h (la tâche GitHub a échoué) ;
- index des fichiers absent ;
- calendrier à fournir pour une compétition dont aucune source ne confirme les journées ;
- matchs introuvables dans un calendrier que tu as fourni ;
- diffuseurs TV à revérifier (à partir du 1er juillet 2027).

## Changement de saison

Crée simplement le dossier de la nouvelle saison (`calendriers/2027-28/`) et dépose les calendriers.
