# Mon Écran — notes techniques (pour reprendre le projet dans une nouvelle conversation)

État au 30/10/2026 : **lot v38**, phase 2 : lot 1 technique (report des choix de l'appli, catalogue, `noyau.js`) et lot 2 (page Réglages, écrans à cocher) faits.

## Organisation du dépôt
- Pages (racine) : `index.html` (accueil), `actus.html`, `sport.html`, `ecarts.html` (écarts de cotes), `invest.html`, `videos.html`, `etat.html`, `cachee.html` (coffre), `reglages.html` (réglages), `noyau.js` (noyau commun), `synchro.js` (synchro chiffrée), `sw.js` (service worker).
- `config/` : réglages écrits par la tâche **Configuration** depuis `configuration.xlsx` (racine). Chaque page charge `config/config.js` (`window.MON_ECRAN_CONFIG`) puis `noyau.js`, et lit ses réglages avec `CFG('module.clé', valeur par défaut)` (= `Noyau.config`) ; sans config, elle garde ses valeurs intégrées. Les expressions régulières sont stockées `{re, flags}`.
- `outils/` : scripts des tâches GitHub (`*-data.mjs`, `tv-tri.mjs`, `etat.mjs`), lecteur de config commun `config-lire.mjs`, convertisseur du classeur `configuration.py`.
- Branche `donnees` : données publiées par les tâches (`donnees/…`). Branche `synchro` : fichier chiffré de synchronisation.
- `.github/workflows/` : tâches (ne peuvent pas être modifiées par une tâche : à déposer à la main).

## Livraison d'une mise à jour
1. Partir du dernier lot (dépôt cloné), modifier, vérifier : `python3 outils/dev/checkjs.py .` (syntaxe JS de toutes les pages et scripts).
2. Empaqueter : `python3 outils/dev/empaqueter.py <dossier> vNN mise-a-jour-vNN.zip` (marque chaque fichier de son empreinte, écrit `lot.json`, ignore `config/`).
3. Yoann dépose le zip à la racine ; la tâche **Mise à jour** l'installe et relance les tâches concernées. Les fichiers `.github/workflows` sont à déposer à la main.
4. Ne jamais livrer `config/` ni `configuration.xlsx` dans un zip : ce sont les réglages de l'utilisateur.

## Classeur de configuration (`outils/dev/classeur/`)
- `modele.py` (+ `cat_sport.py`, `cat_actus.py`, `cat_autres.py`, `tuto.py`) : contenu des onglets ; chaque ligne a un identifiant fixe (colonne A cachée) et sa définition technique (colonne « Technique » cachée, JSON).
- Nouvelle version du classeur en reprenant les choix de l'ancien : `python3 construire.py reference.json nouveau.xlsx ancien.xlsx` (puis incrémenter `VERSION_CLASSEUR` et le journal dans `tuto.py`).
- `extraire.mjs <dossier>` : réglages d'origine écrits dans les pages → `reference.json`. `comparer.py <dossier config>` : vérification « zéro différence » entre la config produite et ces réglages.
- Choix personnels (favoris, abonnements vidéo, villes météo) : **pas** dans le classeur ; réglés dans l'appli et partagés par la partie « prefs » de la synchro.

## Noyau commun (`noyau.js`, `window.Noyau`)
Base des écrans de réglages et des futures applis dédiées. Rien de propre à Safari en dehors de `Noyau.iphoneWeb` ; une appli dédiée pourra fournir `window.MonEcranNatif` (`ouvrir(item)`, `jeton()`), utilisé en priorité.
- `config(chemin, défaut)` (aussi `window.CFG`) ; `stockage.lire/ecrire/texte/effacer`, `stockage.session.*`, `stockage.ecouter(clé, fn)`.
- `appareil()` → `{type: iphone|ipad|android|ordinateur, os: ios|android|autre, nom, installe, dediee, tactile}`.
- `lien.chaine(item)` / `lien.pour(item)` / `lien.ouvrir(item)` : iPhone → `app`, raccourci `alt`, `web` (1,5 s entre chaque essai) ; Android → `android`, `web` ; ordinateur → `web` (nouvel onglet). `ouvrir` renvoie `false` s'il n'y a rien pour cet appareil. Utilisé par l'accueil et Vidéos.
- `depot.lire(chemin)` → `{texte, sha}` | null, `depot.ecrire(chemin, texte, {sha, message})` : API GitHub (branche main) avec la clé de la session de synchro (`Synchro.jeton()`). Erreurs : `verrou` (code pas saisi), `inactif` (synchro pas activée), `jeton`, `droits`, `limite`, `reseau`, `conflit` ; `Noyau.message(code)` donne le texte.
- `catalogue.charger({frais})` (site publié, ou GitHub si `frais`), `catalogue.element(id)`, `catalogue.etat(id)` (valeurs avec les modifs en attente appliquées), `catalogue.resultat(uid)`.
- `modifs.modifier(id, {Oui:'Non'})`, `modifs.choisir(id, true|false|'')`, `modifs.ajouter(module, {section, nom, source, champs})`, `modifs.effacer(idAjout, nom)`, `modifs.verifier()`, `modifs.annuler(uid)`, `modifs.enAttente()`, `modifs.envoyer()` (→ `envoye|rien|verrou|inactif|erreur:code`), `modifs.envoyerPlusTard(ms)` (promesse du résultat ; `modifs.plusTard()` : envoi programmé ?), `modifs.reportees()`, `modifs.dernierResultat(id)` (`{statut, message, id, le}`, cet appareil ou le catalogue). Évènements `noyau:modifs` à chaque changement, `noyau:envoi` (`detail.resultat` : `encours`, `envoye`, `rien`, `verrou`, `inactif`, `erreur:…`) à chaque envoi. Mémoire : `modifs:attente` (pas envoyées ; une modif pas encore envoyée sur le même identifiant est complétée), `modifs:envoyees` (envoyées, oubliées quand le catalogue les donne traitées), `modifs:reportees` (traitées, avec leur résultat, 200 dernières). Ces clés ne vont pas dans la sauvegarde (une restauration renverrait des modifs déjà reportées).

## Choix faits dans l'appli → classeur
- **`config/modifs.json`** — écrit seulement par l'appli (`Noyau.modifs.envoyer`, clé GitHub de la synchro) ; la tâche ne le modifie jamais (un seul rédacteur par fichier, pas de conflit) :
  `{"v":1, "maj", "par", "modifs":[…]}`, chaque modif a un `uid` unique, `at`, `par` et l'une des formes :
  `{id, champs:{"Oui":"Non"}}` (ligne ou section `sec:…` ; sur une section seule `Oui` se règle) · `{ajout:{module, section, nom, source}, champs}` (première ligne « Mes ajouts » libre de l'onglet, une nouvelle est créée au-delà ; même nom + source = mise à jour) · `{id:"ajout:<module>:<n>", nom, champs}` ou `{…, effacer:true}` (retrouvé par son nom si le classeur a été reconstruit) · `{verif:true}` (test de bout en bout, rien ne change).
  Colonnes modifiables : `Oui`, `Widget accueil`, `Par défaut` (Oui / Non / vide) et `Lien iPhone`, `Lien Android`, `Lien web` (refusés : `javascript:`, `data:`…).
- **Tâche Configuration** (déclenchée par le dépôt de `configuration.xlsx` ou de `config/modifs.json`) : `configuration.py --modifs config/modifs.json` applique les modifs pas encore traitées (uid absents de `catalogue.json` → `modifs.traitees`), réenregistre `configuration.xlsx` seulement si une cellule a vraiment changé, puis produit config/ comme avant. Une modif déjà traitée n'est jamais refaite (sinon elle écraserait un classeur retouché depuis) ; `traitees` ne garde que les uid encore présents dans `modifs.json`, et l'appli retire de `modifs.json` ceux qui sont traités à son envoi suivant. Si l'appli écrit pendant la tâche, la tâche se replace après son dépôt (`git pull --rebase`, fichiers différents) et le passage suivant, déjà en file, traite les nouvelles.
- **`config/catalogue.json`** (≈ 300 Ko, 38 Ko compressé) : `{v, genere, classeur:{fichier, version}, colonnes_modifiables, modifs:{date, traitees:{uid:{statut, message, id, le, par}}}, modules:{<module>:{onglet, titre, intro, colonnes:{nom, infos, modifiables}, sections:[{id, cle, label, oui, affichee, tech, items:[{id, nom, oui, choisi, support, infos, champs, resultat, note, def}]}], ajouts:[{id, section, section_id, nom, source, oui, choisi, champs, resultat}], ajout:{libres, entetes:{section, nom, source}} | null}}}`. `oui` = valeur brute de la case (Oui / Non / vide), `choisi` = retenu (case ou section), `support` = ok / dev / non.
- `rapport.json` → `modifs:{recues, nouvelles:[…]}` (affiché dans État, partie Configuration, avec le bouton « Vérifier la liaison appli → classeur »).
- `construire.py` reprend aussi les liens d'applis modifiés et garde tous les ajouts (20 lignes libres au minimum).

## Page Réglages (`reglages.html`, v38)
- Accès : roue ⚙︎ au bout gauche du bandeau du bas de l'accueil (dans le code, pas dans le classeur : on ne peut pas la perdre), « Choisir les médias… » (menu de langue d'Actus), liens en bas de Sport, de l'onglet YouTube de Vidéos, de l'onglet Marchés d'Investissements, bouton « Réglages › » dans État.
- Adresses : `reglages.html#actus | #actus-en | #youtube | #sport | #marches`, `?retour=actus|sport|videos|invest|etat` (le retour ramène à cette page). Téléphone : menu puis écran ; ordinateur (`html.desk`) : côte à côte.
- Écrans de choix (modules `actus`, `actus-en`, `youtube`, `sport`, `marches` du catalogue) : sections repliables (mémoire de session `reglages:ouverts`), case ronde « Tout » = ligne `sec:` du classeur (cochée : section Oui et les « Non » de la section remis à vide ; décochée : section et ses « Oui » remis à vide ; à moitié = choix partiel), interrupteur par élément (décocher met « Non » si la section est à Oui, sinon vide), case maison = `Widget accueil` (marchés, hors liste « suivi »). Recherche sans accents sur le nom et les infos. Éléments `dev` / `non` grisés : on peut seulement les décocher.
- Badges : « pas encore envoyé » / « en attente de report » (modifs en attente), ❌ + motif (dernier résultat refusé), ✅ reporté (3 jours). Une modif pas encore envoyée qui revient à la valeur du classeur est annulée toute seule.
- Mes ajouts : ajouts du catalogue (interrupteur `Oui`, effacement après confirmation), ajouts en attente (annulables tant qu'ils ne sont pas envoyés), refus de la tâche (masqués par « OK », clé `reglages:vus`). Formulaire : section existante ou nouvelle, nom, source (en-têtes du classeur) ; liens `javascript:`… refusés.
- Envoi : chaque changement relance `envoyerPlusTard(4000)` (un seul `modifs.json` pour une série de changements) ; synchro pas activée → message et lien État (les choix restent en attente sur l'appareil) ; verrouillée → code dans la barre du bas (`invest:pin` puis `Synchro.ouvrirAvecCode`) ; après un envoi, catalogue relu toutes les 30 s (GitHub si la clé est là) jusqu'au report, 15 min au plus.
- Mes choix personnels : raccourcis seulement, `?ouvrir=` géré par chaque page : `sport.html?ouvrir=favoris` (onglet Favoris), `videos.html?ouvrir=abos`, `index.html?ouvrir=villes|spotify`, `invest.html?ouvrir=reglages`. Rien ne change pour les favoris (partie « prefs » de la synchro).

## Phase 2 (prévue)
1. ~~Lot technique~~ (v37).
2. ~~Écrans à cocher : médias d'actus, chaînes YouTube, compétitions, marchés/fonds~~ (v38, page Réglages).
3. Activer/désactiver pages et widgets (déjà dans `config/accueil.json`, pas encore appliqué) : une entrée de plus dans le menu de Réglages.
4. Éditeur de l'accueil (applis, dossiers, bandeau ; 3 liens par appli déjà dans `config/applis.json`) : idem. Le bouton « ＋ Chaîne » de Vidéos écrit encore dans `chaines.txt` (ancien fonctionnement) : à rediriger vers Réglages › Chaînes YouTube › Mes ajouts.
Anticiper des applis dédiées : `noyau.js` commun (config, stockage, synchro, lien selon l'appareil), écrans sans astuce propre à Safari, fonctions propres à l'iPhone web isolées.

## Tests
Playwright + Chromium : servir une copie du dépôt avec `donnees/` (branche `donnees`) et `config/`, comparer le texte rendu des pages avant/après, capturer en 390×844 clair/sombre.
Report des modifs : lancer `configuration.py` sur une copie du classeur avec un `modifs.json` d'essai, vérifier les messages, l'effet dans config/, puis relancer (rien ne doit changer). `noyau.js` : simuler l'API GitHub (interception des requêtes `api.github.com`) et `window.Synchro.jeton`.
