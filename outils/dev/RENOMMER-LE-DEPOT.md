# Renommer le dépôt (et garder une copie de sauvegarde)

Depuis la v42, le dock n'a plus besoin du nom `iPhone-Dock` écrit dans son code :
- sur le site (`pseudo.github.io/<dépôt>/`), le nom est lu dans l'adresse ;
- ailleurs (fichier ouvert sur le PC…), il vient de `config/config.js` (`depot.nom`), écrit par la tâche **Configuration** à partir du nom réel du dépôt ;
- en dernier recours seulement : `ZyAvo/iPhone-Dock` (nom d'origine).

Rien d'autre ne cite le nom : les tâches GitHub utilisent le dépôt où elles tournent, le manifeste et le service worker utilisent des adresses relatives.

## 1. Copie de sauvegarde (avant de renommer)

**Depuis le PC (recommandé, copie complète avec toutes les branches `main`, `donnees`, `synchro`)** :
```
git clone --mirror https://github.com/ZyAvo/iPhone-Dock.git iPhone-Dock-sauvegarde.git
```
Pour en faire aussi une copie sur GitHub : crée un dépôt vide **privé** (ex. `iPhone-Dock-sauvegarde`, sans README), puis
```
cd iPhone-Dock-sauvegarde.git
git push --mirror https://github.com/ZyAvo/iPhone-Dock-sauvegarde.git
```
(Les tâches ne tournent pas sur cette copie tant que tu ne les actives pas dans son onglet Actions : laisse-les désactivées.)

**Sans PC** : github.com → ＋ → **Import repository** (si l'option est proposée sur ton compte), adresse `https://github.com/ZyAvo/iPhone-Dock`, dépôt **privé**.

Les secrets (`TMDB_TOKEN`, `ODDS_API_KEY`) ne sont **pas** copiés : ils restent dans le dépôt renommé ; note-les ailleurs si tu veux pouvoir repartir de la copie.

## 2. Préparer (une fois la v42 installée)

1. Lance une fois la tâche **Configuration** (Actions → Configuration → Run workflow) : `config/config.js` contient alors `"depot":{"nom":"ZyAvo/iPhone-Dock"}`.
2. Vérifie que la synchronisation marche (État → Synchronisation : « à jour »).

## 3. Renommer

1. Dépôt → **Settings → General → Repository name** → nouveau nom → **Rename**.
2. GitHub redirige l'ancienne adresse du dépôt (`github.com/ZyAvo/iPhone-Dock`) vers la nouvelle, **mais pas l'adresse du site** :
   `zyavo.github.io/iPhone-Dock/` ne répond plus, le site devient `zyavo.github.io/<nouveau-nom>/`.
3. Actions → **Publication** → Run workflow (remet le site en ligne à la nouvelle adresse), puis **Configuration** → Run workflow (met le nouveau nom dans `config.js`).

## 4. Sur chaque appareil

- **iPhone** : supprime l'ancienne icône de l'écran d'accueil, ouvre la nouvelle adresse dans Safari → Partager → « Sur l'écran d'accueil ».
  Une appli ajoutée à l'écran d'accueil a sa propre mémoire : **la nouvelle icône repart de zéro** (code PIN, placements, coffre, favoris, thème…).
  Avant de renommer : **État → Sauvegarde** dans l'ancienne icône (code à garder dans Notes), puis restauration dans la nouvelle.
  Avec la synchronisation, il suffit de la réactiver (phrase de 6 mots + clé GitHub) : favoris, placements et coffre reviennent.
- **Navigateur du PC ou Safari (hors écran d'accueil)** : le site reste sur `zyavo.github.io`, la mémoire du navigateur est gardée.
- **Clé GitHub de la synchro** : si elle est limitée à « Only select repositories », elle suit le renommage (rien à faire).
- **Spotify** (si le widget est connecté) : developer.spotify.com → ton appli → Redirect URIs → ajoute la nouvelle adresse du dock.
- **PC** : dans le dossier du clone, `git remote set-url origin https://github.com/ZyAvo/<nouveau-nom>.git` (l'ancienne adresse marche encore grâce à la redirection, mais autant la changer) ; renomme le dossier si tu veux, rien n'en dépend.
- **Raccourcis iOS** ou favoris qui ouvrent `zyavo.github.io/iPhone-Dock/…` : à mettre à jour.

## 5. Après

- Le lien « Dépôt d'origine » du Tuto du classeur pointe encore vers `ZyAvo/iPhone-Dock` (redirigé) : il sera mis à jour à la prochaine version du classeur
  (`DEPOT` dans `outils/dev/classeur/tuto.py`, ou variable d'environnement `MON_ECRAN_DEPOT` au moment de construire le classeur).
- Ne réutilise jamais l'ancien nom pour un autre dépôt : la redirection GitHub serait cassée.
