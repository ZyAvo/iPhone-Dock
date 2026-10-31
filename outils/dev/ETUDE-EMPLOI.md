# Agrégateur d'offres d'emploi — étude des sources (v42, à décider avec Yoann)

But : une page « Emploi » avec des recherches enregistrées (intitulé, mots-clés, métier, lieu + distance, type de contrat) et une alerte sur les nouvelles offres.
Rien n'est développé dans la v42 : ce document sert à choisir.

## Sources

| Source | Accès | Coût | Ce qu'on peut chercher | Verdict |
|---|---|---|---|---|
| **France Travail** — API « Offres d'emploi v2 » (francetravail.io) | Compte gratuit, une « application » déclarée → identifiant + secret (OAuth2 client credentials, scope `api_offresdemploiv2`) | Gratuit | `motsCles`, `codeROME` (métier), `commune` / `departement` + `distance`, `typeContrat`, dates de création ; 150 offres par page, 1 150 au plus par recherche, 10 appels/s | **Source principale** : officielle, stable, en temps réel. Diffuse aussi une partie des offres de sites partenaires. |
| **Adzuna** (developer.adzuna.com) | Inscription libre → `app_id` + `app_key` | Gratuit avec quota (de l'ordre de 250 appels/jour, 2 500/mois) | `what`, `where`, pays dans l'adresse (`/jobs/fr/search/…` — couverture France à confirmer à l'inscription) ; salaires parfois estimés | **Complément** : agrège de nombreux sites privés. Lien d'annonce qui passe par Adzuna. |
| **Indeed** | API « Publisher » fermée (plus d'inscription depuis 2020, plus de réponse depuis 2024) ; les API actuelles servent aux employeurs | — | — | **Non** (seul le scraping resterait, contraire à leurs conditions). |
| **LinkedIn, Welcome to the Jungle, Apec, HelloWork** | Pas d'API publique de recherche pour un particulier | — | — | **Non** en direct ; une partie de leurs offres arrive via France Travail ou Adzuna. Possible : lien « Chercher aussi sur… » qui ouvre leur site avec les mêmes mots. |

## Fonctionnement proposé

- Une tâche GitHub « Emploi » (2 à 4 fois par jour) interroge France Travail (+ Adzuna si retenu) pour chaque recherche enregistrée, dédoublonne
  (même intitulé + entreprise + ville), marque les offres nouvelles depuis le passage précédent.
- Page `emploi.html` : une carte par recherche (nombre de nouvelles offres), liste triée par date, filtres contrat / distance, bouton « Voir l'offre ».
- Alerte : pastille sur l'icône de la page dans l'accueil + bandeau « 5 nouvelles offres » ; plus tard, notification si le dock passe en appli dédiée.
- Secrets GitHub : `FT_CLIENT_ID`, `FT_CLIENT_SECRET` (et `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`).

## Point clé : la confidentialité

Le dépôt et le site sont **publics**. Des recherches d'emploi écrites dans le classeur ou des résultats publiés tels quels sur la branche `donnees`
montreraient à tout le monde quel poste est recherché, et où. Deux façons de l'éviter :
1. **Recherches dans un secret GitHub** (`EMPLOI_RECHERCHES`, texte JSON modifié à la main) et **résultats chiffrés** par la tâche avec une clé
   gardée elle aussi en secret ; l'appli déchiffre avec la même clé, saisie une fois (comme la synchronisation).
2. **Recherches réglées dans l'appli**, envoyées chiffrées (comme la partie « prefs » de la synchro) ; la tâche les déchiffre avec la clé en secret,
   publie les résultats chiffrés. Plus confortable (pas de JSON à la main), un peu plus long à faire.

Recommandation : France Travail seul pour commencer, option 2 pour la confidentialité, Adzuna en second temps si France Travail ne suffit pas.

Sources consultées (31/10/2026) : présentation de l'API France Travail et de l'API Adzuna, historique de l'API Indeed Publisher
(jobspipe.dev, guides comparatifs) ; à recouper avec la documentation officielle (francetravail.io, developer.adzuna.com) au moment du développement.
