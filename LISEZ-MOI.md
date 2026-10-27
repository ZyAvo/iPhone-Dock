# Mon Écran — comment intervenir

Ce dépôt contient la page d'accueil « Mon Écran » et ses pages Actus et Sport.
Tu peux compléter deux types de données sans toucher au code : **les calendriers** et **les logos**.

```
(racine du dépôt)
├── index.html              ← écran d'accueil (applis, dossiers, dock)
├── actus.html              ← actualités par thème
├── sport.html              ← matchs, classements, calendriers
├── manifest.json, apple-touch-icon.png
├── tv.json                 ← créé automatiquement (programme TV)
├── fichiers.json           ← créé automatiquement (index des logos et calendriers)
├── donnees/sport/          ← créé automatiquement (matchs, journées, classements)
├── outils/                 ← scripts utilisés par la tâche automatique (ne pas modifier)
├── .github/workflows/programme-tv.yml   ← la tâche automatique (toutes les 2 heures)
├── calendriers/
│   └── 2026-27/            ← un dossier par saison
│       └── top-14.txt      ← un fichier texte par compétition
└── logos/
    ├── competitions/       ← logos des compétitions : ligue-1.png, top-14.png…
    └── clubs/
        ├── france/         ← castres.png, stade-toulousain.png…
        ├── angleterre/
        ├── espagne/
        ├── italie/
        ├── allemagne/
        ├── etats-unis/
        ├── selections/
        └── autres/
```

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
