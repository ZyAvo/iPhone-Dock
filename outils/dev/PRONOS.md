# Pronos entre amis (v50, module d'essai)

Page `pronos.html` (lien en bas de la page Sport). Lien à partager : `https://zyavo.github.io/iPhone-Dock/pronos.html?groupe=CODE`
(bouton de partage en haut de la page une fois inscrit).

## Mode simulation (par défaut)
Sans adresse de serveur, tout reste sur l'appareil (clé `pronos:sim`) : 3 amis fictifs (Lucas, Inès, Théo) avec des pronos tirés au hasard,
vrais matchs et vrais résultats (Ligue 1, Top 14, Ligue des champions ; 7 jours à venir, 45 jours passés). Classement › « Simuler mes pronos passés »
remplit tes pronos sur les matchs déjà joués pour voir le classement ; « Tout effacer » repart de zéro.

## Passer en mode partagé (Google Sheets + Apps Script, gratuit)
1. Avec la boîte Gmail dédiée : créer un Google Sheets vide « Pronos Mon Écran ».
2. Extensions › Apps Script : remplacer le contenu par `outils/pronos/Code.gs`, enregistrer.
3. Déployer › Nouveau déploiement › type « Application Web » : exécuter en tant que **moi**, accès **Tout le monde** → Autoriser → copier l'adresse `https://script.google.com/macros/s/…/exec`.
4. Donner cette adresse à Claude : elle va dans le classeur (réglage `pronos.api`) et la page passe en mode partagé.
Les onglets Joueurs et Pronos se créent au premier usage ; tu peux les lire et corriger dans le tableau (le code des joueurs n'y est qu'en empreinte).

## Règles
Score exact 3 points, bon résultat (vainqueur ou nul) 1 point. Prono modifiable jusqu'au coup d'envoi (vérifié par le script avec les horaires
publiés par la tâche Sport) ; pronos des autres visibles une fois le match commencé. Classement du mois et de la saison, calculé par la page.
Compétitions : `CFG('pronos.ligues', [{id, f, nom}])` dans la page et `LIGUES` dans Code.gs (à garder identiques).
Gratuit, entre amis, sans mise ni gain : rester hors des jeux d'argent (pas de droit d'entrée, pas de lot).
