# Rendre le dock public — relecture « nouvel utilisateur » (v42)

Relu : `LISEZ-MOI.md`, les onglets Lisez-moi et Tuto du classeur (`outils/dev/classeur/tuto.py`), les tâches GitHub, ce qui est visible
sur le dépôt et le site.

## Déjà corrigé dans la v42
- **Nom du dépôt** : plus besoin de garder « iPhone-Dock » en faisant une copie (le dock lit son nom dans l'adresse ; `config.js` sinon).
  Tuto : « garde le même nom » remplacé.
- **Tuto, synchronisation** : la remarque périmée « l'adresse du dépôt est écrite dans synchro.js » est retirée ; ajout : la même clé GitHub sert à envoyer les choix de Réglages.
- **Installation Android / PC** : manifeste complété (icônes 192 et 512 px, `id`, `scope`, `lang`) : Chrome et Edge proposent « Installer l'appli ».
- **`LISEZ-MOI.md`** réécrit en tête (ce qu'est le dock, ses pages, comment l'installer ; il ne parlait que d'Actus et Sport) et **`README.md`** ajouté : GitHub n'affiche sur la page du dépôt qu'un fichier nommé README.
- Ces textes du Tuto arrivent dans le classeur avec sa prochaine version (le classeur n'est jamais livré dans le zip).

## Ce qui bloquerait un nouvel utilisateur
1. **Valeurs de départ = les tiennes**, écrites dans le code : ville météo **Réalmont (Tarn)** (`index.html`, `FAV_DEFAULT`), équipes favorites
   (Liverpool, Marseille, Castres…, `sport.html`), abonnements vidéo cochés (`videos.html`, colonne « abo » des plateformes), médias et fonds pré-cochés du classeur.
   → Proposition : des départs neutres (Paris ou « position actuelle », aucune équipe, aucun abonnement) et un écran d'accueil au premier lancement
   « Choisis ta ville, tes équipes, tes plateformes ». Tes propres choix ne bougent pas (ils sont sur tes appareils et dans la synchro).
2. **Vidéos sans clé TMDB** : la tâche ne construit pas le catalogue et ne le signale que dans son journal. → Le dire dans la page Vidéos
   (« catalogue : clé TMDB manquante, voir Tuto ») et dans État.
3. **Étape « Autoriser les tâches à écrire »** (Settings → Actions → Workflow permissions) : chaque tâche déclare déjà ses propres droits,
   l'étape est sans doute superflue. → À vérifier sur une copie d'essai avant de la retirer du Tuto (une étape de moins).
4. **Tâches désactivées sur une copie** (dont les tâches planifiées) : bien dit dans le Tuto, mais aucun signal dans l'appli. → La page État pourrait
   afficher « aucune donnée depuis l'installation : as-tu activé les tâches ? ».
5. **Classeur sur iPhone** : Numbers enregistre en .numbers par défaut ; le Tuto le dit (« Garde le format Excel ») mais sans le geste
   (Numbers → Exporter → Excel). → Ajouter le geste.
6. **Spotify** : chacun crée sa propre appli Spotify (Client ID) ; une appli en mode « développement » n'accepte que le compte qui l'a créée
   et ceux ajoutés dans sa liste d'utilisateurs. Le Tuto pourrait le préciser.
7. **Cotes** : clé The Odds API à mettre à deux endroits (secret GitHub et page État) ; c'est expliqué, mais c'est la seule clé à double emploi.

## Ce qui est visible publiquement (à savoir avant d'ouvrir le dock aux autres)
- **Tout le dépôt et le site** : code, `configuration.xlsx`, `config/` (tes choix d'affichage : médias, compétitions, fonds suivis, applis et leurs liens),
  la branche `donnees` (données publiques déjà : matchs, cotes, cours, actus).
- **`config/modifs.json`** : tes changements faits dans Réglages, avec l'heure et le type d'appareil (« iPhone »).
- **Branche `synchro`** : le contenu est chiffré (favoris, placements, coffre, thème perso) ; seuls la date de mise à jour et le type d'appareil sont lisibles.
- **Jamais publics** : code PIN, montants et quantités des placements, coffre, clés (TMDB, cotes, GitHub, Spotify) — secrets GitHub ou appareil seulement.
- **Les liens d'applis** de l'onglet Applis (raccourcis iOS nommés, applis bancaires ou de travail dans les dossiers « Finance », « Travail ») se voient
  dans `config/applis.json`. Rien de secret, mais ça dit quelles applis tu utilises. → Si gênant : un dossier « privé » rangé dans la synchro chiffrée.

## Prochaines étapes proposées (un lot)
1. Départs neutres + écran de premier lancement (point 1).
2. Message « clé TMDB manquante » (point 2), Tuto allégé et complété (points 3, 5, 6), signal « tâches désactivées » dans État (point 4).
3. Nouvelle version du classeur avec le Tuto à jour et les nouveaux thèmes dans l'onglet Apparence.
