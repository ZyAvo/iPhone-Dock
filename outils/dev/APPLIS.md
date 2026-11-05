# Applis Android / iOS — ce qui est prêt, ce qui reste (v54)

Idée : une appli « coquille » (Capacitor ou équivalent) qui affiche les pages du dock et leur fournit `window.MonEcranNatif`.
Sans ce pont, tout marche comme sur le web : chaque crochet ci-dessous n'est utilisé que s'il existe.

## Contrat `window.MonEcranNatif` (tout est facultatif)
| Membre | Utilisé par | Rôle |
|---|---|---|
| `ouvrir(item)` → `false` si rien | `Noyau.lien.ouvrir` | ouvrir une appli / un lien (schémas iOS, intents Android) |
| `jeton()` → promesse du jeton GitHub | `Noyau.depot` | clé GitHub gardée dans le trousseau (iOS) / Keystore (Android) |
| `stockage` (`getItem`, `setItem`, `removeItem`, synchrones) | `Noyau.stockage` (v54) | mémoire durable de l'appli à la place de `localStorage` |
| `tv.adresse(chemin, url)` (`chemin` = `api` ou `flux`) et `tv.pret()` | `tv.js` `viaRelais`, `relaisOK` (v54) | lire le serveur TV en http sans le relais du PC |
| `retourSpotify` (texte) | accueil `SP_REDIRECT` (v54) | adresse de retour Spotify propre à l'appli (schéma `monecran://…`), à déclarer chez Spotify |

## Déjà prêt
- Liens selon l'appareil (`Noyau.lien`, `Noyau.appareil`), glisser-déposer sans astuce Safari, pages autonomes (rechargement complet entre pages).
- Plus de code tiers chargé dans les pages (v52-v53 : icônes App Store par la tâche, hls.js et police Geist dans le dépôt).
- Pages utilisables sans service worker (absent des vues web d'appli) : il ne sert qu'au hors ligne.

## Reste à faire (le jour où l'appli est lancée)
1. **Stockage** : environ 90 mentions de `localStorage` (66) et `sessionStorage` (25) dans 13 fichiers (chaque page a son petit `LS` / `store`). Les faire passer par `Noyau.stockage` page par page (le crochet `MonEcranNatif.stockage` le prendra alors partout).
2. **Secrets de session** (`synchro:session` : clé + jeton GitHub ; `tv:acces` : accès Xtream ; clé du Coffre) : aujourd'hui en `sessionStorage` ; dans l'appli, les confier à `MonEcranNatif` (trousseau / Keystore) plutôt qu'à la mémoire de la page.
3. **Hors ligne** : sans service worker, prévoir dans l'appli un cache des fichiers `donnees/…` (ou garder les dernières réponses dans `MonEcranNatif.stockage`).
4. **TV** : implémenter `MonEcranNatif.tv` (petit serveur local de l'appli, comme `outils/tv-relais.mjs`) ; iOS : autoriser le http pour les flux (ATS, `NSAllowsArbitraryLoads` limité aux médias).
5. **Spotify** : déclarer `retourSpotify` dans le tableau de bord Spotify ; l'accueil lit déjà `?code=` au retour.
6. **iOS** : `DecompressionStream` (catalogue TV) demande iOS 16.4 ou plus.
