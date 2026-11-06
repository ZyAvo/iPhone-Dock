# Pronos entre amis (v50, module d'essai ; v55 : mode partagé branché ; v56 : présentation « fun » ; v60 : paris en crédits fictifs)

Page `pronos.html` (lien en bas de la page Sport). Lien à partager : `https://zyavo.github.io/iPhone-Dock/pronos.html?groupe=CODE`
(bouton de partage en haut de la page une fois inscrit).

## Serveur en service (v55)
Appli web Apps Script du **compte Google perso** de Yoann (tableur « Pronos KiosK », déploiement `v55`) :
`https://script.google.com/macros/s/AKfycby6vzzsVzPJ8DuTBqexvEqGBnqMGZy2Os5RU5DDvTxEAvUwFlbH9S9StR2nVjpLuGCLug/exec`
Écrite comme valeur par défaut dans `pronos.html` (`API_TEST`) : `CFG('pronos.api', API_TEST)`. Une ligne `pronos.api` du classeur (à créer) passera devant ;
`pronos.api` = vide → simulation. **À retirer avant de rendre le dock public** (sinon les copies du dépôt écrivent dans ce tableur).
Adresse publique (lisible dans la page) : risque = faux joueurs dans le tableur, sans accès au reste du compte Google.

## Présentation (v56)
- **À pronostiquer** : en-tête (avatar, rang du mois, compte à rebours du prochain coup d'envoi, barre « pronos faits / matchs ouverts »), matchs par jour puis
  par compétition (logo de la compétition, sinon ⚽/🏉 ; n° de journée), logos des équipes (`t.logo`, sinon logo ESPN foot d'après l'identifiant ; repli : pastille
  colorée), score au clavier (toucher le chiffre) ou avec − / + (un seul côté touché : l'autre passe à 0), « x/y amis ont joué » (serveur v56).
- **Résultats** : bilan du mois, score réel, ton prono + badge (🎯 +3, ✓ +1, ✗ 0), pastilles des amis ; confettis + message à la première vue d'un score exact
  de moins de 4 jours (`pronos:fete` ; la première visite retient sans fêter).
- **Classement** : podium, ▲▼ depuis la dernière journée (classement sans le dernier jour joué), stats (🎯 exacts, ✓ %, 🔥 série), trophées de la période
  (🎯 Sniper, 🔥 En feu ≥ 2, 💪 Assidu, 🐢 Lanterne rouge dès 3 joueurs), Mon profil (changer d'avatar, changer de joueur).
- **Avatars** : « emoji|n° de couleur » (16 emojis, 8 couleurs) choisis à l'inscription ; sans avatar enregistré, tirage stable d'après le pseudo.
- Serveur v55 : la page marche (pas d'avatars des autres ni de « qui a joué » ; changer d'avatar → message « serveur à mettre à jour »).

## Paris en crédits fictifs (v60, onglet « Paris »)
Jeu entre amis **sans argent** : les crédits ne s'achètent pas, ne s'échangent pas, ne valent rien ; aucun lot réel, aucun lien vers un site de paris.
- **Crédits** : 100 au début de chaque mois (mois du coup d'envoi, heure de Paris) ; podium du mois fini (joueurs ayant parié au moins une fois ; égalité : ordre alphabétique) :
  +20 / +10 / +5 au départ du mois suivant. À 0 (et rien en jeu) : plus de pari jusqu'au 1ᵉʳ. **Général** : cumul des soldes de fin de mois (mois joués).
- **Pari** : simple 1 / N / 2, un par match, mise entière de 1 au solde disponible, modifiable ou annulable jusqu'au coup d'envoi. Ouvert dès qu'il y a la cote du matin (le jour du match,
  vers 8 h ; compétitions de la tâche Cotes : 5 grands championnats et 3 coupes d'Europe ; pas de rugby). Cote figée = moyenne des sites du relevé « matin » (`donnees/cotes/cotes.json`).
- **Règlement** (serveur, à chaque appel `paris` ou `miser`) : score final de `jours.json` / `passe.json` (sinon fichier de la compétition) ; gain = arrondi(mise × cote), 0 si perdu ;
  match reporté ou annulé depuis plus d'un jour : remboursé. Paris des autres visibles au coup d'envoi (avant : seulement qui a parié).
- **Onglet Paris** du tableur : groupe, pseudo, match, ligue, choix (h/d/a), mise, cote, le, mois, dom, ext, coup d'envoi, gain (vide = en cours).
- Serveur : actions `miser` (`choix` vide = annuler) et `paris` (soldes du mois, podiums, général, cotes du jour, paris, qui). Simulation : pas de paris (message).

## Mode simulation (sans serveur)
Sans adresse de serveur, tout reste sur l'appareil (clé `pronos:sim`) : 3 amis fictifs (Lucas, Inès, Théo) avec des pronos tirés au hasard,
vrais matchs et vrais résultats (Ligue 1, Top 14, Ligue des champions ; 7 jours à venir, 45 jours passés). Classement › « Simuler mes pronos passés »
remplit tes pronos sur les matchs déjà joués pour voir le classement ; « Tout effacer » repart de zéro.

## Passer en mode partagé (Google Sheets + Apps Script, gratuit)
1. Créer un Google Sheets vide « Pronos KiosK ».
2. Extensions › Apps Script : remplacer le contenu par `outils/pronos/Code.gs`, enregistrer.
3. Choisir la fonction **verifier** (menu à côté de Exécuter, sinon c'est `doPost` qui tourne) › Exécuter › Examiner les autorisations ›
   « Google n'a pas validé cette application » : Paramètres avancés › Accéder à … (non sécurisé) › Autoriser. Journal : « N matchs trouvés sur … ».
4. Déployer › Nouveau déploiement › type « Application Web » : exécuter en tant que **moi**, accès **Tout le monde** → copier l'adresse
   `https://script.google.com/macros/s/…/exec` (pas l'adresse `script.googleusercontent.com/macros/echo…` vue après ouverture : temporaire).
   Vérifier en fenêtre privée : `{"ok":true,"service":"pronos"}`.
5. Donner cette adresse à Claude (classeur `pronos.api`, ou `API_TEST` dans la page).
Modifier le script ensuite : Déployer › Gérer les déploiements › crayon › Version : **Nouvelle version** › Déployer (l'adresse /exec ne change pas).
Les onglets Joueurs et Pronos se créent au premier usage (ou par `verifier`) ; tu peux les lire et corriger dans le tableau (le code des joueurs n'y est qu'en empreinte).
v55 : colonnes groupe, pseudo, match, ligue au format texte et comparaisons en texte (sinon un groupe « 2026 » devenait un nombre : doublons, « mauvais code »).
v56 : colonne E `avatar` de Joueurs (ajoutée toute seule à un onglet existant), action `avatar`, `etat` renvoie aussi `avatars` et `qui` (pseudos ayant pronostiqué un match pas commencé, sans le score).
Page : bandeau si le serveur ne répond pas ; « code non reconnu » → retour à l'inscription ; Classement › « Changer de joueur ou de groupe » (oublie l'identité sur l'appareil).

## Règles
Score exact 3 points, bon résultat (vainqueur ou nul) 1 point. Prono modifiable jusqu'au coup d'envoi (vérifié par le script avec les horaires
publiés par la tâche Sport) ; pronos des autres visibles une fois le match commencé. Classement du mois et de la saison, calculé par la page.
Compétitions : `CFG('pronos.ligues', [{id, f, nom}])` dans la page et `LIGUES` dans Code.gs (à garder identiques).
Gratuit, entre amis, sans mise ni gain : rester hors des jeux d'argent (pas de droit d'entrée, pas de lot).

## Renommage du dépôt (iPhone-Dock → kiosk)
- `Code.gs` : changer `SITE` (`https://zyavo.github.io/kiosk/`), puis Gérer les déploiements › Nouvelle version (adresse /exec inchangée, rien à refaire dans le dock).
  Sans ça, le serveur ne lit plus les horaires : tous les pronos sont refusés (« Match pas encore connu du serveur »).
- Lien d'invitation : construit à partir de l'adresse de la page, il suit tout seul. Mais l'ancien site ne répond plus : renvoyer le lien aux amis.
  Le Sheets garde joueurs et pronos ; sur un nouveau site, chacun se reconnecte avec le même groupe, pseudo et code.
