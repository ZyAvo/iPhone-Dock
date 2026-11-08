# Mon Écran — notes techniques (pour reprendre le projet dans une nouvelle conversation)

État au 08/11/2026 : **lot v73** (Pronos et Paris : score en direct et points « pour l'instant », voir « v73 ») ; **lot v72** (partage des Pronos avec des amis et rappels sur le téléphone, Code.gs v72, voir « v72 » et `PRONOS.md`) ; **lot v71** (appli iOS d'essai fabriquée sur GitHub, voir « v71 » et `APPLIS.md`) ; **lot v70** (suites de l'audit : Sport plus léger, « ‹ Dock » partout, zones tactiles, Pronos allégé et lisible hors ligne, voir « v70 ») ; **lot v69** (photo de profil, forme et classement des équipes dans les Pronos et les Paris, accueil PC plus grand, badges € / $ des médias payants, classeur v6, Code.gs v69, voir « v69 ») ; **lot v68** (Premier League et « Pronos en plus » dans les Pronos, Code.gs v68, voir « v68 ») ; **lot v67** (tâche Sport toutes les 30 min pendant les créneaux de match, voir « v67 ») ; **lot v66** (Pronos : page à part, tuile avec pastille, bouton dans Sport, voir « v66 ») ; **lot v65** (dock prêt pour les copies : départs neutres, premier lancement, Pronos par le classeur, voir « v65 ») ; **lot v64** (libellé de saison du classement, voir « v64 ») ; **lot v63** (Pronos : identité partagée par la synchro, lien de reconnexion, voir « v63 ») ; **lot v62** (accueil Pronos / Paris / Règles, points du rugby, logos manuels partout, voir « v62 ») ; **lot v60** (Pronos : onglet Paris en crédits fictifs, voir « v60 » et `PRONOS.md`) ; **lot v59** (logos de Bayonne et Vannes : matchs TheSportsDB, voir « v58 » ; logos des compétitions, voir « v59 ») ; **lot v58** (logos de clubs manquants pris sur TheSportsDB, classement compris, voir « v58 ») ; **lot v57** (fiches en double d'ESPN et drapeaux de pays sur des clubs, voir « v57 ») ; **lot v56** (Pronos plus fun : jour › compétition, logos, avatars, podium, trophées, voir « v56 ») ; **lot v55** (Pronos en mode partagé : serveur Apps Script du compte perso, voir « v55 » et `outils/dev/PRONOS.md`) ; **lot v54** (dernier lot de l'audit : écarts communs, catalogue TV en 3 fichiers, crochets pour les applis, voir « v54 » et `outils/dev/APPLIS.md`) ; **lot v53** (socle commun, polices hébergées, ergonomie, voir « v53 ») ; **lot v52** (Sport plus rapide, sécurité, voir « v52 ») ; **lot v51** (tâches réparées et allégées, voir « v51 » ; audit complet et plan des lots v52 à v54 : rapport `audit-mon-ecran-v50.pdf`) ; **lot v50** (module d'essai Pronos : `pronos.html`, simulation sur l'appareil, serveur Google Apps Script prêt — voir `outils/dev/PRONOS.md`) ; **v49** (rugby : détail complet après le match ; VLC remplace Infuse sur iPhone) ; **v48** (lecteur TV tolérant aux coupures, ±s, sous-titres, favoris films/séries ; détail de match commun `match.js` ; sports US domicile à droite ; Top 14 : colonne Diff et bonus ; État réduit et regroupé ; Spotify complet ; thème avancé ; mail des cotes) ; v47 accueil PC (écarts, matchs, détail) et page Sport PC ; **lot v46** (matchs : minute, score, drapeau et logo ; mode TV réorganisé ; lecteur protégé des rechargements, image dans l'image) ; v45 films et séries ; v44 TV (Xtream, relais du PC, mode TV) ; v43 logos de l'appli ; v42 (thèmes centralisés et thème perso, fond fixe, source musique, renommage du dépôt sans retoucher le code, installation Android/PC). Phase 2 terminée (v37 à v40) ; v41 : Écarts de cotes (jour du match, filtre « Aujourd'hui et demain »).

## Organisation du dépôt
- Pages (racine) : `index.html` (accueil), `actus.html`, `sport.html`, `ecarts.html` (écarts de cotes), `invest.html`, `videos.html`, `etat.html`, `cachee.html` (coffre), `reglages.html` (réglages), `noyau.js` (noyau commun), `themes.js` (thèmes et fond, v42), `synchro.js` (synchro chiffrée), `sw.js` (service worker).
- Chaque page charge dans `<head>` : `config/config.js`, `noyau.js`, `themes.js` (dans cet ordre), puis `commun.css` (v53, avant ses styles) ; en fin de page : `commun.js` (après le `#ptr`).
- `config/` : réglages écrits par la tâche **Configuration** depuis `configuration.xlsx` (racine). Chaque page charge `config/config.js` (`window.MON_ECRAN_CONFIG`) puis `noyau.js`, et lit ses réglages avec `CFG('module.clé', valeur par défaut)` (= `Noyau.config`) ; sans config, elle garde ses valeurs intégrées. Les expressions régulières sont stockées `{re, flags}`.
- `outils/` : scripts des tâches GitHub (`*-data.mjs`, `tv-tri.mjs`, `etat.mjs`), lecteur de config commun `config-lire.mjs`, convertisseur du classeur `configuration.py`.
- Branche `donnees` : données publiées par les tâches (`donnees/…`). Branche `donnees-tv` (v51) : catalogue TV chiffré (`donnees/tv/`), récupéré seulement par la Publication. Branche `synchro` : fichier chiffré de synchronisation.
- `.github/workflows/` : tâches (ne peuvent pas être modifiées par une tâche : à déposer à la main).

## Livraison d'une mise à jour
1. Partir du dernier lot (dépôt cloné), modifier, vérifier : `python3 outils/dev/checkjs.py .` (syntaxe JS de toutes les pages et scripts).
2. Empaqueter : `python3 outils/dev/empaqueter.py <dossier> vNN mise-a-jour-vNN.zip` (marque chaque fichier de son empreinte, écrit `lot.json`, ignore `config/`).
3. Yoann dépose le zip à la racine ; la tâche **Mise à jour** l'installe et relance les tâches concernées. Les fichiers `.github/workflows` sont à déposer à la main.
4. Ne jamais livrer `config/` ni `configuration.xlsx` dans un zip : ce sont les réglages de l'utilisateur.

## Classeur de configuration (`outils/dev/classeur/`)
- `modele.py` (+ `cat_sport.py`, `cat_actus.py`, `cat_autres.py`, `tuto.py`) : contenu des onglets ; chaque ligne a un identifiant fixe (colonne A cachée) et sa définition technique (colonne « Technique » cachée, JSON).
- Nouvelle version du classeur en reprenant les choix de l'ancien : `python3 construire.py reference.json nouveau.xlsx ancien.xlsx` (puis incrémenter `VERSION_CLASSEUR` et le journal dans `tuto.py`). Onglet Applis : la disposition de l'ancien (ordre, dossiers créés ou renommés, applis déplacées, ajouts placés, emplacements, noms) est reprise telle quelle (`ancienne_disposition`), les lignes nouvelles du modèle s'ajoutent à la fin de leur section.
- `extraire.mjs <dossier> reference.json` : réglages d'origine écrits dans les pages → `reference.json` (reconnaît `const X = [ … ]` et `const X = CFG('…', [ … ])` : on lit les lignes jusqu'à une expression complète, `CFG` rend sa valeur par défaut, les constantes citées sont lues de la même façon). `comparer.py <dossier config>` (lancé là où est `reference.json`) : vérification « zéro différence » entre la config produite et ces réglages. Procédure : `construire.py reference.json neuf.xlsx` → `configuration.py neuf.xlsx --sortie out` → `comparer.py out` (pas sur `config/` du dépôt, qui contient les choix de Yoann).
- Choix personnels (favoris, abonnements vidéo, villes météo) : **pas** dans le classeur ; réglés dans l'appli et partagés par la partie « prefs » de la synchro.

## Noyau commun (`noyau.js`, `window.Noyau`)
Base des écrans de réglages et des futures applis dédiées. Rien de propre à Safari en dehors de `Noyau.iphoneWeb` ; une appli dédiée pourra fournir `window.MonEcranNatif` (`ouvrir(item)`, `jeton()`), utilisé en priorité.
- `config(chemin, défaut)` (aussi `window.CFG`) ; `stockage.lire/ecrire/texte/effacer`, `stockage.session.*`, `stockage.ecouter(clé, fn)`.
- `appareil()` → `{type: iphone|ipad|android|ordinateur, os: ios|android|autre, nom, installe, dediee, tactile}`.
- `lien.chaine(item)` / `lien.pour(item)` / `lien.ouvrir(item)` : iPhone → `app`, raccourci `alt`, `web` (1,5 s entre chaque essai) ; Android → `android`, `web` ; ordinateur → `web` (nouvel onglet). `ouvrir` renvoie `false` s'il n'y a rien pour cet appareil. Utilisé par l'accueil et Vidéos.
- `depot.lire(chemin)` → `{texte, sha}` | null, `depot.ecrire(chemin, texte, {sha, message})` : API GitHub (branche main) avec la clé de la session de synchro (`Synchro.jeton()`). Erreurs : `verrou` (code pas saisi), `inactif` (synchro pas activée), `jeton`, `droits`, `limite`, `reseau`, `conflit` ; `Noyau.message(code)` donne le texte.
- `icones` : pictogrammes des tuiles et du bandeau (sortis de l'accueil en v40, communs avec Réglages).
- `applis` (v40) : modèle de l'écran d'accueil `{listes:{accueil, bas_gauche, bas_droite, navigation, 'd:<dossier>'}, dossiers:{clé:{nom, id}}, ordreD}`, éléments `{id, def, cache}`. `depuisConfig(applis.json)` (visibles + `reserve`), `depuisCatalogue(module applis)` (tout l'onglet, noms et liens du classeur), `appliquer(base, modifs en attente)` (champs `Oui`/`Appli`/liens, ajouts « uid:<uid> », effacements, dispositions), `vers(modèle)` (forme de `applis.json`), `disposition(modèle)` (à envoyer), `permis(def, liste)` (dossiers, emplacements et tuile LIVE : accueil seulement ; Navigation : bandeau ; menu Navigation : des applis).
- `catalogue.charger({frais})` (site publié, ou GitHub si `frais`), `catalogue.element(id)`, `catalogue.etat(id)` (valeurs avec les modifs en attente appliquées), `catalogue.resultat(uid)`.
- `accueil.page(id)` / `accueil.widget(id)` (`pg:…` / `wg:…` acceptés) : `config/accueil.json` + dernière modif en attente sur cet identifiant (envoyée ou non), **sans charger le catalogue** ; État et Réglages toujours actifs ; sans config, tout est actif. `accueil.uneChoisie()` : source choisie du widget « À la une » ou `null` (Automatique) ; `accueil.une(défaut)` : la choisie sinon le défaut (flux direct) ; un choix en attente l'emporte (Réglages garde sa définition dans `accueil:une-choix` avec `accueil.choisirUne(id, def, ids)`, `'auto'` + ids des sources). `accueil.applis(défauts)` : applis telles qu'affichées sur cet appareil (config + choix en attente). `accueil.disposition()` / `choisirDisposition('large'|'carre')` (clé `accueil:disposition`, propre à l'appareil, pas dans le classeur). `accueil.signature()` (l'accueil se recharge au retour si elle a changé ; comprend les choix en attente sur les applis). `accueil.garde(id)` : en tête de page ; si la page est désactivée, écrit « Page désactivée » + « Réactiver dans Réglages » puis `<plaintext hidden>` : le reste du fichier n'est pas lu (aucun script, aucune donnée). Ne pas utiliser `window.stop()` : Chrome n'affiche alors plus rien.
- `modifs.modifier(id, {Oui:'Non'})`, `modifs.choisir(id, true|false|'')`, `modifs.ajouter(module, {section, nom, source, champs})`, `modifs.majAjout(uid, {nom, source, champs})` (ajout pas encore parti), `modifs.disposer(module, listes|null)` (disposition complète : remplace celle pas encore partie et se place en dernier), `modifs.effacer(idAjout, nom)`, `modifs.verifier()`, `modifs.annuler(uid)`, `modifs.enAttente()`, `modifs.envoyer()` (→ `envoye|rien|verrou|inactif|erreur:code`), `modifs.envoyerPlusTard(ms)` (promesse du résultat ; `modifs.plusTard()` : envoi programmé ?), `modifs.reportees()`, `modifs.dernierResultat(id)` (`{statut, message, id, le}`, cet appareil ou le catalogue). Évènements `noyau:modifs` à chaque changement, `noyau:envoi` (`detail.resultat` : `encours`, `envoye`, `rien`, `verrou`, `inactif`, `erreur:…`) à chaque envoi. Mémoire : `modifs:attente` (pas envoyées ; une modif pas encore envoyée sur le même identifiant est complétée), `modifs:envoyees` (envoyées, oubliées quand le catalogue les donne traitées), `modifs:reportees` (traitées, avec leur résultat, 200 dernières). Ces clés ne vont pas dans la sauvegarde (une restauration renverrait des modifs déjà reportées).

## Choix faits dans l'appli → classeur
- **`config/modifs.json`** — écrit seulement par l'appli (`Noyau.modifs.envoyer`, clé GitHub de la synchro) ; la tâche ne le modifie jamais (un seul rédacteur par fichier, pas de conflit) :
  `{"v":1, "maj", "par", "modifs":[…]}`, chaque modif a un `uid` unique, `at`, `par` et l'une des formes :
  `{id, champs:{"Oui":"Non"}}` (ligne ou section `sec:…` ; sur une section seule `Oui` se règle) · `{ajout:{module, section, nom, source}, champs}` (première ligne « Mes ajouts » libre de l'onglet, une nouvelle est créée au-delà ; même nom + source = mise à jour) · `{id:"ajout:<module>:<n>", nom, champs}` ou `{…, effacer:true}` (retrouvé par son nom si le classeur a été reconstruit) · `{verif:true}` (test de bout en bout, rien ne change) · `{disposition:{module:'applis', listes:[{cle:'accueil', ids}, {cle:<dossier>, dossier:true, nom, ids}, {cle:'bas_gauche'|'bas_droite'|'navigation', ids}]}}` (v40, ordre complet de l'écran, masqués compris).
  Colonnes modifiables : `Oui`, `Widget accueil`, `Par défaut` (Oui / Non / vide), `Lien iPhone`, `Lien Android`, `Lien web` (refusés : `javascript:`, `data:`…) et `Appli` (nom d'une appli, 40 caractères).
  Disposition (`ranger_applis`) : l'onglet Applis est réécrit dans l'ordre de l'écran (ordre des lignes = ordre affiché ; sections : accueil, dossiers dans l'ordre de leurs tuiles, bandeau, Navigation) ; une appli déplacée garde son identifiant ; dossier renommé (section + tuile) ou créé (`sec:applis:dossier-<clé>` + tuile `ap:accueil:<clé>`) ; ajout cité (`ajout:applis:n`, ou `uid:<uid>` d'un ajout du même envoi) : devient une ligne `ap:<section>:<nom>` et sa ligne « Mes ajouts » est libérée ; `auto:actus|invest|sport` : ligne d'emplacement `ap:accueil:auto-<x>` ; `dossier:<clé>` : tuile d'un dossier qui n'en a pas. Rien n'est supprimé ; ce qui n'est pas cité reste en fin de sa section ; une place interdite est ignorée (signalée). Le bloc « Mes ajouts » descend d'autant (fusions, liste Oui/Non, mises en forme, filtre et synthèse du Lisez-moi suivent).
- `config/config.js` contient aussi `modifs_traitees` (uid traités) : `modifs.enAttente()` les écarte même sans catalogue (accueil).
- `config/applis.json` (v40) : chaque élément a son `id` (`ap:…`, `ajout:applis:n`, `dossier:<clé>` pour la tuile d'un dossier venu d'un ajout) ; dossiers `{title, id, items}` ; `reserve` : éléments masqués `{…def, ou, ou_nom, apres}` (pour les réafficher sur l'appareil sans catalogue). Emplacements : `{type:'auto', auto:'actus'|'invest'|'sport'}`. Nom affiché = colonne Appli.
- **Tâche Configuration** (déclenchée par le dépôt de `configuration.xlsx` ou de `config/modifs.json`) : `configuration.py --modifs config/modifs.json` applique les modifs pas encore traitées (uid absents de `catalogue.json` → `modifs.traitees`), réenregistre `configuration.xlsx` seulement si une cellule a vraiment changé, puis produit config/ comme avant. Une modif déjà traitée n'est jamais refaite (sinon elle écraserait un classeur retouché depuis) ; `traitees` ne garde que les uid encore présents dans `modifs.json`, et l'appli retire de `modifs.json` ceux qui sont traités à son envoi suivant. Si l'appli écrit pendant la tâche, la tâche se replace après son dépôt (`git pull --rebase`, fichiers différents) et le passage suivant, déjà en file, traite les nouvelles.
- **`config/catalogue.json`** (≈ 300 Ko, 38 Ko compressé) : `{v, genere, classeur:{fichier, version}, colonnes_modifiables, modifs:{date, traitees:{uid:{statut, message, id, le, par}}}, modules:{<module>:{onglet, titre, intro, colonnes:{nom, infos, modifiables}, sections:[{id, cle, label, oui, affichee, tech, items:[{id, nom, oui, choisi, support, infos, champs, resultat, note, def}]}], ajouts:[{id, section, section_id, nom, source, oui, choisi, champs, resultat}], ajout:{libres, entetes:{section, nom, source}} | null}}}`. `oui` = valeur brute de la case (Oui / Non / vide), `choisi` = retenu (case ou section), `support` = ok / dev / non.
- `rapport.json` → `modifs:{recues, nouvelles:[…]}` (affiché dans État, partie Configuration, avec le bouton « Vérifier la liaison appli → classeur »).
- `construire.py` reprend aussi les liens d'applis modifiés et garde tous les ajouts (20 lignes libres au minimum).

## Page Réglages (`reglages.html`, v38)
- Accès : roue ⚙︎ au bout gauche du bandeau du bas de l'accueil (dans le code, pas dans le classeur : on ne peut pas la perdre), « Choisir les médias… » (menu de langue d'Actus), liens en bas de Sport, de l'onglet YouTube de Vidéos, de l'onglet Marchés d'Investissements, bouton « Réglages › » dans État.
- Adresses : `reglages.html#accueil | #applis | #actus | #actus-en | #youtube | #sport | #marches`, `?retour=index|actus|sport|videos|invest|etat` (le retour ramène à cette page), `?ajout=<module>` (Mes ajouts dépliée, formulaire ouvert : bouton « ＋ Chaîne » de Vidéos → `?retour=videos&ajout=youtube#youtube`). Téléphone : menu puis écran ; ordinateur (`html.desk`) : côte à côte (écran Pages et widgets par défaut).
- Écrans de choix (modules `actus`, `actus-en`, `youtube`, `sport`, `marches` du catalogue) : sections repliables (mémoire de session `reglages:ouverts`), case ronde « Tout » = ligne `sec:` du classeur (cochée : section Oui et les « Non » de la section remis à vide ; décochée : section et ses « Oui » remis à vide ; à moitié = choix partiel), interrupteur par élément (décocher met « Non » si la section est à Oui, sinon vide), case maison = `Widget accueil` (marchés, hors liste « suivi »). Recherche sans accents sur le nom et les infos. Éléments `dev` / `non` grisés : on peut seulement les décocher.
- Badges : « pas encore envoyé » / « en attente de report » (modifs en attente), ❌ + motif (dernier résultat refusé), ✅ reporté (3 jours). Une modif pas encore envoyée qui revient à la valeur du classeur est annulée toute seule.
- Mes ajouts : ajouts du catalogue (interrupteur `Oui`, effacement après confirmation), ajouts en attente (annulables tant qu'ils ne sont pas envoyés), refus de la tâche (masqués par « OK », clé `reglages:vus`). Formulaire : section existante ou nouvelle, nom, source (en-têtes du classeur) ; liens `javascript:`… refusés.
- Envoi : chaque changement relance `envoyerPlusTard(4000)` (un seul `modifs.json` pour une série de changements) ; synchro pas activée → message et lien État (les choix restent en attente sur l'appareil) ; verrouillée → code dans la barre du bas (`invest:pin` puis `Synchro.ouvrirAvecCode`) ; après un envoi, catalogue relu toutes les 30 s (GitHub si la clé est là) jusqu'au report, 15 min au plus.
- Mes choix personnels : raccourcis seulement, `?ouvrir=` géré par chaque page : `sport.html?ouvrir=favoris` (onglet Favoris), `videos.html?ouvrir=abos`, `index.html?ouvrir=villes|spotify`, `invest.html?ouvrir=reglages`. Rien ne change pour les favoris (partie « prefs » de la synchro).

## Pages et widgets (v39)
- Réglages › **Pages et widgets** (module `accueil`, écran `special`) : interrupteurs Pages (`pg:actus|sport|videos|invest|cachee` ; État et Réglages grisés « toujours active », `pg:etat` ignoré) et Widgets (`wg:meteo|une|invest|spotify|sport|live`), ligne « Widget seul en haut » (Large / Carré, sur l'appareil), source « À la une » en boutons radio (`un:…` : Oui sur le choix, les autres vides, ou « Non » si la section est à Oui). Petites notes grises : ce qui remplace un élément coupé. Pas de case « Tout » ni de recherche.
- Accueil (`index.html`, bloc « Pages et widgets activés ») : widget coupé retiré du DOM (`.w-clock`, `#newsWidget`+`#deskNews`, `#inv`, `#spot`, `#sportBand`+`#deskSport`) et ses chargements sautés ; classes `sans-<widget>`, `haut-seul`, `haut-vide`, `dispo-carre` sur `<html>`. Page coupée : retirée de `HOME`, dossiers, bandeau (d'après l'adresse `xxx.html` ; `ecarts` = `sport`), widgets gardés sans lien (`.sans-lien`). Accès de remplacement : tuile Actus / « Invest. » si le widget est coupé et la page active ; Sport : la tuile LIVE s'affiche aussi sur téléphone (`live-tel`), sinon tuile Sport. Coffre : appui long sur le bouton État si l'horloge est coupée, rien si la page est coupée.
- PC : `grilleDesk()` recalcule `grid-template-*` de `#home` (colonne gauche = horloge/invest/Spotify actifs, centre = À la une, droite = Sports ; seulement la gauche → côte à côte) ; rien n'est touché quand tout est actif.
- Source « À la une » : voir « Écran d'accueil (v40) » (Automatique, ou source choisie en premier).

## Écran d'accueil (v40)
- Réglages › **Écran d'accueil** (`reglages.html#applis`, module `applis`, écran `special:'applis'`) : grille de l'accueil (5 colonnes, 7 sur ordinateur), bandeau (gauche · ⚙︎ verrouillé · État verrouillé · droite), menu Navigation (liste), Masquées (« Afficher »), refus ❌ de la tâche.
- Glisser-déposer sans astuce propre à Safari : doigt (évènements touch standard) = appui de 0,3 s puis glisser, la page ne défile pas pendant le glisser (`touchmove` non passif) ; un doigt qui bouge avant l'appui long fait défiler normalement ; souris : glisser dès 6 px. Une place n'est prise qu'après 110 ms de survol (pas de remue-ménage pendant le trajet) ; au milieu d'un dossier de l'accueil pendant 420 ms, il s'entoure : l'appli y est rangée au lâcher. Défilement automatique près des bords. Clavier / secours : fiche › Place et ◀ ▶.
- Fiche (feuille du bas ; fenêtre au centre sur ordinateur) : nom (colonne Appli), 3 liens, Place (accueil, dossiers, nouveau dossier, bandeau, Navigation, selon `permis`), ◀ ▶, Masquer / Afficher, Effacer (ajout reporté), Annuler (ajout pas encore envoyé). Dossier : nom, ordre de ses applis, « Ajouter une appli ici ». Nouvelle appli : nom, où, 3 liens → `modifs.ajouter('applis', …)`.
- Chaque déplacement envoie la disposition complète (`modifs.disposer`) ; revenue à l'ordre déjà connu, elle est retirée. Noms, liens, masquer : modifs par identifiant. Tout part groupé comme dans les lots 2-3.
- Accueil : `Noyau.accueil.applis(valeurs écrites dans la page)` remplace HOME, FOLDERS, QUICK_LEFT/RIGHT, NAV_APPS (les constantes `CFG('applis.…', […])` restent lisibles par `extraire.mjs`) ; tuiles de remplacement à leur emplacement s'il existe (sinon en fin de grille, comme avant) ; dossier vide : pas de tuile ; appli sans pictogramme dans le bandeau : ses initiales ; page dans le bandeau : même onglet.
- « À la une » : Réglages › Pages et widgets propose **Automatique** (aucune source cochée : l'info la plus reprise, `une.json` « top ») ou une source, qui passe alors en premier : `une.json` « choix » (écrit par la tâche Actus pour `config/accueil.json` « une ») s'il vient de cette source et a moins de 3 h, sinon son flux direct (choix pas encore reporté), sinon « top ».

## Thèmes (v42, `themes.js`)
- `THEMES` : `{id, nom, d, c:[5 couleurs], accent?, glyphe?, clair?, sombre?}`. Les 7 thèmes d'avant gardent leurs valeurs écrites à la main (`clair`/`sombre`, noms des variables sans `--` ; `bleu` = valeurs des pages + taches du fond) ; les autres sont **calculés** depuis `c` (OKLCH : fond clair/sombre, encre, accent lisible, 4 taches, 8 teintes de tuiles). Ajouter un thème = une ligne. Les blocs `==PALETTES==` des 9 pages sont supprimés (seul reste à l'accueil `--sport-accent` du thème gris).
- CSS écrit dans `<style id="themes-css">` : `:root[data-palette="x"]` (clair), même chose `:not([data-theme="light"])` sous `prefers-color-scheme: dark`, et `[data-theme="dark"]` ; bleu : `:root:not([data-palette])`. Fond : `body::after` fixe (`top/bottom:-12vh`, `z-index:-1`), 4 `radial-gradient` (en `oklab` si possible) + grain SVG ; les pages n'ont plus de `background-image` sur `body` (Safari iPhone ignorait `background-attachment:fixed` et étirait le dégradé). `body::before` reste la bande de la zone sûre.
- Remplace le petit script de tête : thème (`palette`), mode (`mode`), classe `desk`. API `window.Themes` : `liste()` (proposés dans État : `apparence.palettes` du classeur + ceux absents de `apparence.palettes_connues`, + perso), `actuel()`, `choisir(id)`, `apercu(couleurs|null)`, `perso()`, `enregistrerPerso(nom, c)`, `effacerPerso()`, `lireCouleurs(texte)` (adresse coolors.co ou codes #rrggbb), `variables(t)`, `rafraichir()`.
- Thème perso : `theme:perso` = `{nom, c}`, palette `perso` ; partagé par la partie « prefs » de la synchro (clé `theme`, absente du contenu tant qu'elle est vide : l'empreinte des favoris d'avant ne change pas) ; dans la sauvegarde. État › Thème › « Créer mon thème » : lien coolors ou 5 sélecteurs de couleur, aperçu en direct (palette `apercu`), Enregistrer / Annuler / Supprimer.
- Classeur : `configuration.py` écrit aussi `apparence.palettes_connues` (toutes les lignes de l'onglet Apparence) ; `extraire.mjs` lit `THEMES` dans `themes.js` (ids et noms → `modele.py`).

## TV (v44)
- **Accès** : fiche `{type:'tv', titre, serveur, identifiant, motdepasse}` du Coffre (`cachee.html`, section « Accès TV », `editerTV`), chiffrée avec le code, synchronisée avec le Coffre. Jamais dans le dépôt. `tv.js` la lit avec la clé de session du Coffre (`coffre:cle`, ouvert depuis < 10 min) ou en demandant le code, puis la garde en `sessionStorage` (`tv:acces`).
- **Relais** `outils/tv-relais.mjs` (+ `tv-relais.cmd`) : Node sur le PC, écoute 127.0.0.1:8765, `/ping`, `/api?u=` (appels Xtream `player_api.php`), `/flux?u=` (listes HLS réécrites pour que les morceaux passent aussi par lui, morceaux transmis). Origines autorisées : `https://zyavo.github.io`, localhost (`TV_ORIGINES`). Une page https peut appeler 127.0.0.1 (adresse de confiance) ; Chrome peut demander l'accès au réseau local.
- `tv.js` (`window.TV`) : `monter({lecteur, chaines, quitter})` (lecteur absent : liste seule ; sans relais : favoris et lecteur externe), liste `get_live_categories` + `get_live_streams` (mémoire de session `tv:liste`), programme `get_short_epg` (titres en base64), lecture HLS native (Safari) ou hls.js (jsdelivr), VLC (`vlc-x-callback://x-callback-url/stream?url=`, flux `.ts`, v48 : remplace Infuse) sur iPhone, fichier `.m3u` d'une chaîne ailleurs. Favoris `tv:favoris` (partie « prefs » de la synchro, clé `tv`, absente tant qu'elle est vide), catégorie `tv:cat`, relais `tv:relais` (adresse, défaut http://127.0.0.1:8765).
- `tv.html` : page TV (lecteur + chaînes ; iPhone : liste seule), lien « TV » dans les onglets de Vidéos.
- **Mode TV de l'accueil (PC)** : bouton « Mode TV » dans « À la une » ; `html.tv-on` (clé `accueil:tv`) ; zones `#tvLecteur`, `#tvChainesZ`, `#tvMatchsZ` (matchs du jour, `renderTvMatchs`, données de `renderDeskSport`), `#tvDetailZ` (`renderTvDetail` : `summary` ESPN, score, faits du match, statistiques, relu chaque minute pendant le match), `#tvActuZ` (actus en liste) ; contenu des zones en `position:absolute` pour ne pas agrandir la grille.
- Spotify : bouton « Code pour l'icône de l'écran d'accueil » dans le panneau connecté (Safari).
- **Films et séries (v45)** : tâche **TV** (`.github/workflows/tv.yml`, chaque nuit + à la main) → `outils/tv-catalogue.mjs` : 7 appels Xtream (connexion, 3 catégories, `get_vod_streams`, `get_series`, `get.php?type=m3u_plus`), directs et épisodes lus dans le M3U, épisodes rattachés aux fiches de séries par le nom (sans accents ni année) ; catalogue compact `{v, genere, fin, d:{cats, ch:[id, nom, logo, cat, epg]}, f:{cats, f:[id, nom, affiche, cat, ext, note, an, tmdb, ajout]}, s:{cats, s:[id, nom, affiche, cat, note, an, genre, eps:[[saison, ép, id, ext, titre]]]}}`, gzip puis AES-256-GCM (clé `TV_CLE`) → `donnees/tv/catalogue.json` (`{v, genere, iv, ct}`), puis lance Publication. Aucun accès dans le catalogue ni dans les journaux (dépôt public). Test préalable : tâche **TV (test)** (`outils/tv-test.mjs`).
- Clé : générée dans la fiche Accès TV du Coffre (champ `cle`, 32 octets base64, Générer / Copier), recopiée par l'utilisateur dans le secret `TV_CLE`.
- `tv.js` : `catalogue(a)` (déchiffre et décompresse avec `DecompressionStream`), onglets Directs / Films / Séries / À regarder (`tv:onglet`, catégories `tv:cats`), fiches film et série (saisons, épisodes, « Reprendre SxxEyy »), adresses reconstruites par `urlDe(a, it)` (`/live/…/id.m3u8|ts`, `/movie/…/id.ext`, `/series/…/id.ext`). Films et épisodes lus en fichier par le relais (avance rapide : `Range`), sinon Infuse / VLC. « À regarder » `tv:liste`, séries vues `tv:vus` (partie « prefs », clés `tvliste`, `tvvus`).

## v46
- `ligneMatch(e, liveIds, F)` (accueil PC et mode TV) : LIVE + minute (`displayClock` / `shortDetail` du tableau ESPN), score entre les équipes, drapeau (`CFG('sport.leagues')`) et logo de la compétition (`leagues[0].logos` du tableau ESPN) ; `LIVE_NOW.minutes`, `LIVE_NOW.logos`.
- Mode TV : colonne de gauche horloge compacte, Spotify, actus sur toute la hauteur restante ; Investissements masqué. `enLecture()` : pas de rechargement automatique (signature de l'accueil, nouvelle version) pendant une lecture ou en image dans l'image.
- `tv.js` : la liste garde sa position, bouton « Image dans l'image », alerte « pas de son (AC3/DTS) : Edge ou VLC » (`webkitAudioDecodedByteCount` à 0 après 6 s).

## v47
- Accueil PC : colonnes `minmax(276px,304px) 1fr minmax(340px,400px)` (CSS et `grilleDesk()`), Investissements resserré (`html.desk .inv-r`). Colonne de droite `#deskSport > .ds-in` : `#dsCotes` (4 meilleurs écarts, même calcul que `ecarts.html` sur le dernier relevé de `donnees/cotes/cotes.json`, seuil `cotes.rapport`, rechargé toutes les 30 min), `#dsList` (lignes `data-dsmatch`, position gardée), `#dsDet` (détail au clic, bouton ×).
- Détail de match commun : `renderDetail(id, 'tv'|'ds')`, état dans `DET.tv` / `DET.ds` (sélection, minuteur 60 s en direct) ; remplace `renderTvDetail`, `TVM.sel`, `TVM.tDetail`.
- Page Sport PC (`html.desk`) : un match touché → `ouvrirDuo(m)` : `openComp(L, …, duo=true)` ouvre `#csheet.gauche` (classement + calendrier, sans onglets) et `#dsheet` à droite (tuile ouverte + `loadFull`) ; matchs US commencés : feuille `#sheet` à droite comme avant. `suivreDuo()` à chaque `render()`. `provisoire(L, data)` : foot et rugby, scores en cours ajoutés (J, G/N/P, diff, points 3/1/0 ou 4/2/0, sans bonus), retri et rangs refaits, zones gardées par place, équipes en train de jouer marquées ●. Mobile inchangé.

## v48
- **Mode TV** : `html:not(.tv-on) .tvm{display:none!important}` (le `.tv-z` de tv.js, `display:flex`, gardait le lecteur affiché en bas après « Quitter », mise en page cassée et bouton sans effet).
- **tv.js, lecture** : `lire(video, a, it, surEtat)` → `brancher()` ; hls.js passe avant le HLS natif hors Safari (Chrome lit le HLS en natif depuis 2025, mais sans tampon réglable ni retour en arrière) ; `HLS_CFG` (tampon 60–120 s, mémoire arrière 300 s, relances réseau) ; erreur fatale : média → `recoverMediaError` (puis `swapAudioCodec`), sinon `relancer()` (6 essais, 1 → 8 s) ; chien de garde `garde()` toutes les 2 s : image figée 4 s → « Reconnexion… » (`.tv-rc`), 10 s → rechargement (direct : point de direct ; film : même position). Test : faux serveur Xtream + relais, panne de 15 s et 45 s : reprise seule (v47 : bloqué sur « Flux illisible »).
- Commandes (`#tvCmd`) : ↺ x s / x s ↻ (`CFG('tv.sauts', [10, 30])`, flèches ← → sur PC), « ● Direct » (retard affiché au-delà de 20 s ; `plageDirect()` déclare la mémoire comme plage atteignable), sous-titres (pistes hls.js ou natives + fichier .srt/.vtt local converti), pistes audio s'il y en a plusieurs. Position des films/épisodes `tv:pos` (sur l'appareil, 150 derniers, reprise et « depuis le début »).
- Favoris films/séries : onglet « ★ Favoris » (`tv:favf`, partie « prefs » de la synchro, clé `tvfav`), bouton ☆ sur les fiches.
- `tv-relais.mjs` : 20 s au plus pour une réponse, 3 essais (0,6 s puis 1,5 s) sur les flux.
- **`match.js`** (`window.Match`, chargé par sport.html et à la demande par l'accueil) : `classify`, `summaryEvents`, `soccerEvents`, `shootoutTable`, `markShootout` sortis de sport.html sans changement (globales) ; `Match.lire(j, sport)` → `{m, evs}` ; `Match.minute(status, evs, début)` : minute estimée au rugby (ESPN reste à 1'). Accueil `renderDetail` : bloc « Buts » (buteurs, minutes, pén., csc, rouges) ou « Points marqués » (essais, transformations, pénalités, drops, cartons par équipe), puis tous les faits du match (fini la coupe à 14 et le filtre qui écartait les essais), puis statistiques. `minRugby()` pour les lignes LIVE.
- Sports US (`US_SP` : basketball, football, hockey, baseball) : « Visiteur @ Domicile » (lignes et détail de l'accueil, bandeau), visiteur au-dessus sur la page Sport.
- Page Sport : `statOf(e, noms)` essaie les noms **dans l'ordre** (au rugby, `differential` = écart moyen +7.2 passait devant `pointsDifference` +58 dans la colonne Diff). `provisoire()` : bonus Top 14 (offensif : 3 essais de plus, si les essais sont connus ; défensif : défaite ≤ 5 points), match déjà compté par ESPN repéré (plus de matchs joués que les équipes qui n'ont pas encore joué la journée), match fini depuis < 12 h encore absent compté sans ●. `liveLabel` : minute estimée au rugby.
- **État** : parties fermées par défaut (`OUVERTS`, session `etat:ouverts`), groupes Contenu · Paramétrage · Technique (`groupes()`), Thème dans une partie, partie « Films et séries (tâche TV) » (début de `donnees/tv/catalogue.json` : date `genere`).
- **Spotify** : fenêtre (touche l'en-tête du widget) avec aléatoire, répétition, volume, sortie, playlists (`spLecteur`, `spAction` ; portée `playlist-read-*` ajoutée : reconnexion une fois) ; Client ID partagé par la synchro (clé `spotify` → `spotify:client`), jamais le jeton.
- **Thème avancé** : `theme:perso` peut porter `av:{fond, texte, accent, neon, taches}` ; `avance()` dans `themes.js` (fond et texte imposés en clair, accent dans les deux modes, néon = accent non assombri, taches = intensité 0–100 %) ; État › Créer mon thème › « Avancé ». `Themes.apercu(c, av)`, `enregistrerPerso(nom, c, av)`.
- **Mail des cotes** : `outils/cotes-mail.mjs` + `.github/workflows/cotes-mail.yml` (7 h 40 UTC) : matchs du jour × sites, meilleure cote en gras, écarts ≥ seuil surlignés ; Gmail par `nodemailer` ; secrets `MAIL_UTILISATEUR`, `MAIL_MDP_APPLI`, `MAIL_DESTINATAIRE` (facultatif) ; sans secrets, rien n'est envoyé. Essai : `COTES_MAIL_APERCU=x.html COTES_JOUR=AAAA-MM-JJ`.
- `empaqueter.py` : `outils/tv-test.mjs` dans `SUPPRIMER` (le workflow `tv-test.yml` se supprime à la main : une tâche ne peut pas toucher `.github`).

## v49
- Rugby : le détail lu par la tâche pendant le match (`m.full`, ex. à la mi-temps) restait figé une fois le match fini (Montpellier–Castres 69-10 : actions jusqu'à 38'). `sport-data.mjs` ne le garde que si ses points collent au score (essai 5, transformation 2, pénalité 3, drop 3), sinon le relit, et prend la liste du tableau des scores si elle est plus complète. Page Sport : `Match.meilleur(m, …listes)` choisit la liste la plus proche du score ; `loadFull` relit la fiche si `m.full` ne colle pas.
- iPhone : lecteur externe VLC (`vlc-x-callback://x-callback-url/stream?url=`) au lieu d'Infuse (devenu payant).

## v73 (Pronos et Paris : score en direct)
- Match commencé : le vrai score au centre de la carte (rouge pendant le match, minute ou « Mi-temps » à gauche), « Ton prono x–y » dessous avec les points
  qu'il rapporterait si le match s'arrêtait là (« pour l'instant ») ; fini mais pas encore dans les données : « 🏁 Terminé », « en attente du classement ».
  Pastilles des autres en pointillé tant que c'est provisoire. NBA, NFL : score et « mène / est mené / égalité » pour le vainqueur choisi.
  Paris : score et « gagne / perd pour l'instant » (« en attente du règlement » à la fin).
- Source : le tableau des scores ESPN (`site.api.espn.com/…/{sport}/{ligue}/scoreboard?dates=`, hier et aujourd'hui) lu par la page, seulement pour les
  compétitions qui ont un match commencé depuis moins de 4 h et pas fini (`candidatsDirect`, `lireDirects`, mémoire `DIRECT`) ; à l'ouverture, à chaque
  actualisation, puis toutes les minutes page visible. Sans réponse : score des données de la tâche Sport s'il y en a, sinon « 🔒 Commencé » comme avant.
  Minute NBA / NFL traduite (« 5:21 - 3rd » → « 3e qt 5:21 »).
- Pas de nouveau rendu pendant une saisie (score, mise) : fait au passage suivant (`MAJ_ATTENTE`).
- Classement, trophées, soldes : inchangés, calculés sur les matchs terminés des données. Rien ne change côté serveur (Code.gs v72) ni dans les tâches.
- Contient aussi tout le lot v72 (Code.gs v72, tâche « Rappels des pronos »).
- Vérifié : faux tableau ESPN (foot en cours, mi-temps, fini, pas encore commencé ; NBA à 3 chiffres), points provisoires (exact, bon résultat, raté),
  pastilles, Paris (1 / N / 2), classement inchangé, pas de rendu pendant la saisie puis rendu ensuite, ESPN lu seulement pour les compétitions concernées ;
  390 px clair et sombre, 1440 px ; tests v69-v72.

## v72 (Pronos : partage avec des amis, rappels)
- **Installer** : `manifest-pronos.json` (« Pronos », `start_url` pronos.html, même portée que le dock), `apple-mobile-web-app-title` ; carte « 📲 Installer les Pronos »
  (inscription et accueil des Pronos, téléphone pas encore installé ; Android : `beforeinstallprompt` → bouton « Installer » ; rien sur ordinateur ni dans
  la vue web iOS de l'appli KiosK ; « Plus tard » → `pronos:installer-vu`). Message d'invitation : code de groupe, « gratuit et sans argent », installation.
- **Rappels (notifications web)** : Mon profil › 🔔 Rappels (`notifMaj`, `notifActiver` : permission demandée dans le geste, puis abonnement
  `pushManager.subscribe` avec la clé de `donnees/pronos/notifications.json` ; `notifCouper` ; `notifResync` quand les pronos en plus changent ;
  changement de joueur → désabonnement). `pronos:notif` = qui est abonné sur cet appareil. `sw.js` : événements `push` (`{titre, texte, url, tag}`)
  et `notificationclick`.
- **Code.gs v72** : onglet « Abonnements » (groupe, pseudo, adresse, p256dh, auth, ligues, appareil, le) ; actions `abonner` (joueur ; une ligne par adresse),
  `desabonner` (joueur ou tâche), `rappels` (tâche seulement : propriété du script `CLE_TACHE` ; abonnements + matchs déjà pronostiqués de moins de 3 h).
- **Tâche « Rappels des pronos »** (`.github/workflows/rappels-pronos.yml`, à déposer à la main ; :07 et :37 de 8 h à 23 h, heure de Paris en hiver) :
  `outils/rappels-pronos.mjs` (web-push 3.6.7) : résumé du matin (premier passage après 9 h : pronos à faire jusqu'au lendemain 8 h), puis « bientôt »
  (coup d'envoi dans 80 min, pas de prono) ; un seul message par passage et par appareil ; abonnement expiré (404 / 410) → `desabonner`.
  `donnees/pronos/rappels.json` : déjà envoyés, en empreintes (ni pseudo ni match en clair), gardés 3 jours. Sans secrets : la tâche ne fait rien.
- **Clés** : `outils/cles-notifications.html` les crée dans le navigateur (VAPID P-256 + clé partagée), rien n'est envoyé ; secrets `PUSH_PUBLIC`,
  `PUSH_PRIVE`, `PRONOS_CLE` ; propriété du script `CLE_TACHE`.
- Vérifié : vrai Code.gs v72 (abonnement refusé s'il est invalide, `rappels` refusé sans la bonne clé, ligne par appareil, retrait) ; page (interrupteur,
  abonnement, compétitions « en plus » mises à jour, coupure, notification affichée par le service worker) ; tâche contre un faux service d'envoi qui
  déchiffre les messages (résumé du matin, pas de doublon au passage suivant, « bientôt » pour un match dans 50 min, rien pour un joueur à jour,
  abonnement expiré retiré) ; carte « Installer » (iPhone Safari, Android Chrome, rien sur ordinateur ni dans l'appli KiosK) ; tests v69-v70.

## v71 (appli iOS d'essai)
- `appli-ios/` : coquille SwiftUI + vue web qui affiche le dock publié ; `.github/workflows/appli-ios.yml` (à déposer à la main, lancée à la main) la fabrique
  sans signature sur un Mac de GitHub et dépose `KiosK.ipa` dans les Artifacts ; installation depuis Windows avec Sideloadly (détail : `APPLIS.md`).
- Pas vérifiable ici (pas de Mac) : la première fabrication se fait sur GitHub ; en cas d'échec, le journal de l'étape « Construction » dit quoi corriger.
- Contient aussi tout le lot v70.

## v70 (suites de l'audit de performances et d'ergonomie)
Audit du 08/11/2026 (document « Audit KiosK v69 ») : mesures sur iPhone 390 px en 4G bridée (1,6 Mb/s, 150 ms, processeur ÷ 4) et PC 1440 px.
- **Sport** : `render()` ne reconstruit plus la page si le HTML n'a pas changé (`RENDU`) ; avec les données préparées, un seul affichage à la fin de `loadAll`
  (avant : toutes les 3 compétitions, 18 redessins au chargement → 4). Détail d'un match (`moreHTML`) construit à l'ouverture (`<div class="more" hidden></div>` sinon) :
  3 919 → 2 140 éléments. PC : place du duo réservée dès l'ouverture (`body.duo-prevu`, retirée par `autoDuo`) ; lien « Choisir les compétitions » caché pendant
  le chargement (`main.charge`, `CHARGE_FINI`) : plus de saut (décalage 0,85 → 0,01). Repli ESPN : une coupure réseau ne marque plus une compétition
  `sport:norange` (8 appels par jour ensuite) ; marques existantes remises à zéro une fois (`sport:norange:v70`). Mesuré : blocage 865 → 380 ms, décalage 0.
- **Pronos** : `outils/sport-data.mjs` écrit `donnees/sport/pronos.json` (compétitions des Pronos et « en plus » : matchs J-46 à J+8 sans déroulé, logos,
  classement résumé, forme des 5 derniers matchs sur la saison) ; la page le lit (`PRONOS_F`) pour les pronos, les paris (`JOURS`) et la forme des équipes,
  et retombe sur les fichiers de saison (et `jours.json`) pour une compétition absente. 122 Ko → 31 Ko compressés, toutes compétitions comprises.
  Ordre stable des matchs à la même heure. Dernier état du groupe gardé (`pronos:etat`, par groupe et pseudo) : serveur injoignable → groupe et pronos
  du dernier passage, avec la date. Son avatar (en-têtes accueil, À pronostiquer, Paris) ouvre Mon profil (`data-profil`, `avMoi`).
- **Partout** : retour « ‹ Dock » (8 pages + Réglages + page coupée de `noyau.js`). `commun.css` : zone tactile de 44 px (pseudo-élément invisible) pour
  le retour, les onglets, les pastilles, les filtres, « Aussi », les mises des paris ; + / − des scores 38 px + 6 px vers l'extérieur ; Vidéos : onglets 35 px ;
  accueil : date et lieu agrandis vers le haut / le bas. Pastille « Hors ligne · dernières données gardées » (`commun.js`, événements online / offline).
- **Petits plus** : accueil, `prochains.json` lu une fois (`lireProchains`, pastille Pronos + bandeau) ; `sw.js`, police rangée dans la réserve des polices
  à l'installation ; contrastes : nombre de matchs de Sport (`--ink-soft`), pastilles des plateformes Vidéos (couleur assombrie), texte de bienvenue (`--ink`).
- Non changé : barre du bas de l'accueil (Réglages ⚙︎ et État, règle du projet). Prochain : lot « Publication » (mise en ligne seulement si changement,
  site sans outils/ ni classeur ; fichiers `.github/workflows` à déposer à la main).
- Vérifié : textes des Pronos v69 / v70 identiques (accueil, à pronostiquer, résultats, classement, en plus, paris), sans `pronos.json` aussi ; tests v68-v69
  (photo, forme, pronos en plus, scénarios) ; aucune erreur JS sur 14 écrans × 3 affichages ; captures 390 clair / sombre, 1440.

## v69 (photo de profil, forme des équipes, accueil PC, médias payants)
- **Photo de profil** (Pronos › Classement › Mon profil : « 📷 Choisir une photo » / « Retirer la photo ») : carré du centre, 128 × 128, JPEG (qualité baissée tant que > 30 000 car.).
  **`Code.gs` v69** (à coller, puis Gérer les déploiements › ✏️ › Nouvelle version) : onglet Joueurs + colonnes F `photo` (data URL) et G `photo v` (version) ; action `photo`
  (`data:image/jpeg;base64,…` < 40 000 car., vide = retirer), `etat` donne `photos:{pseudo: version}`, action `photos {noms}` donne les images. Page : cache `pronos:photos`
  (`{g, l:{pseudo:{v, d}}}`, par groupe, pas synchronisé), feuille de style `#photosCSS` (`.p-av.ph-<hash>`) : l'image n'est pas recopiée dans chaque avatar ; l'emoji reste
  (caché) pour garder l'alignement. Serveur v68 : « Le serveur des pronos doit être mis à jour (v69) ». Simulation : version seule côté serveur fictif, image dans le cache.
- **Forme et classement des équipes** (interrupteur dans « À pronostiquer », pronos en plus compris, et dans les paris du jour ; `pronos:infos`, masqué par défaut) :
  sous chaque équipe, rang et points (foot, Top 14 : `table.tables[].entries[].stats` rank / points), NBA et NFL : bilan et place dans la conférence (playoffSeed, Est / Ouest / AFC / NFC),
  et les 5 derniers matchs (● vert victoire, gris nul, rouge défaite, du plus ancien au plus récent) calculés d'après les matchs terminés du fichier de la compétition.
  `TABLES` rempli par `chargerLigues` ; paris : `chargerTables` charge à la demande les compétitions absentes des pronos (Serie A…).
- **Accueil PC** (`index.html`, `html.desk`) : tuiles 118 px (100 px si hauteur ≤ 960 px), noms plus lisibles, barre du bas en dock vitré centré (boutons 50 px, icônes 25 px).
- **Médias payants** : classeur v6, colonne « Payant » des onglets Actus (Oui = surtout réservé aux abonnés, Partiel = en partie, vide = gratuit ; pré-remplie d'après
  `cat_actus.PAYANTS`) → `feeds[].payant` = oui / partiel / non (`configuration.py`). `Noyau.payant.badge(source, p)` : € (médias français) ou $ (onglet Actus anglais),
  contour = Partiel, plein = Oui ou article repéré « abonnés » dans son flux. Classeur d'avant la v6 : liste intégrée (`PAYANTS_DEF` de `noyau.js`).
  `outils/actus-data.mjs` `payant()` : catégories (Premium, Abonnés, Réservé aux abonnés…), balises premium / paywall, `isAccessibleForFree false`, titres « [Abonnés] » / 🔒
  (préfixe retiré) → `p:1` ; nombre par source dans l'état (`payants`). Badges : page Actus (articles et légende des sources), widget et liste « À la une » de l'accueil, mode TV, Investissements.
- Vérifié : vrai Code.gs v69 (image refusée si PNG, trop lourde ou mauvais code ; envoi, version, retrait) et v68 (« action ») ; Marc voit la photo de Yoann, gardée, pas redemandée
  au rechargement, retirée ensuite ; interrupteur (masqué par défaut, gardé, foot / NBA-NFL / paris Serie A chargée à la demande) ; classeur v6 : configuration identique
  hors `payant` ; textes des pages v68 / v69 identiques hors badges ; captures 390 clair/sombre, 1440 et 1920.

## v68 (Premier League et « Pronos en plus »)
- `noyau.js` `Noyau.pronos.ligues()` : + `eng.1` (fichier `eng-1`), entre Ligue 1 et Top 14 ; page Pronos et pastille de l'accueil. Règles : Premier League citée.
- `pronos.html` : bouton du haut « ‹ Dock » (retour au dock), la pastille « ‹ Accueil » ramène à l'accueil des Pronos (deux « Accueil » prêtaient à confusion).
- `pronos.html` `logoManuel` : clubs de `eng.1` cherchés dans `logos/clubs/angleterre` (absent : logo ESPN), jamais parmi les clubs français.
- **`Code.gs` v68 (à coller dans Apps Script, puis Gérer les déploiements › ✏️ › Nouvelle version)** : `LIGUES` + `'eng.1':'eng-1'` (horaires des pronos).
  Sans lui, un prono de Premier League est refusé (`err:'match'`, « Match pas encore connu du serveur »). Les paris n'en dépendent pas (cotes du matin, déjà relevées pour la Premier League).
- **Pronos en plus** (au choix de chaque joueur) : Liga, Serie A, Bundesliga, Ligue Europa, Ligue Conférence, NBA, NFL (`Noyau.pronos.extras()`, `EXTRAS` dans Code.gs).
  Choix `pronos:extras` = `{on, tout, ids}` (`Noyau.pronos.extrasActifs()`), partagé par la synchro (prefs `pronosx`, « si présent » ; ne diffère que par lui → pas de question).
  Page : 4e carte de l'accueil (`carteExtras`), réglage `SECTION = 'extras'` (`extrasHTML`, interrupteur, Tout / au cas par cas), sous-section `SECTION = 'plus'` (`JEU = 'plus'`) :
  mêmes onglets, `aJouer()` = compétitions choisies, `liste()` = tous les matchs en plus (`PLUSM`, chargés dès qu'une compétition est choisie) pour un classement juste.
  Classement en plus : seulement ceux qui y ont un prono (et moi). Le classement principal (`MATCHS`) ne change pas.
  **NBA, NFL : vainqueur seulement** (`VAINQUEUR`, `matchVainqueur`, `choisirVainqueur`) : deux boutons, prono gardé en `[1, 0]` / `[0, 1]` (serveur inchangé), 1 point s'il gagne (nul NFL : 0).
  Pastille de l'accueil : + compétitions choisies (clé de session avec le choix).
- `Code.gs` : horaires gardés par compétition (`h:<fichier>`, `getAll` / `putAll`, plus grosse : NBA ≈ 13 Ko, limite 100 Ko) et lus en parallèle (`fetchAll`). `verifier` vide ces clés.
- Vérifié (en plus) : pronos NBA, NFL, Liga acceptés par le vrai Code.gs ; 11 valeurs en mémoire < 100 Ko ; réglage Tout puis NBA + NFL ; vainqueur NBA choisi puis changé (une seule ligne, [0, 1] puis [1, 0]) ;
  classement en plus (Yoann 3, Julie 8, Marc absent) ; classement principal inchangé ; Marc sans choix : rien de chargé, pas de NBA ; pastille ; choix reçu sur un 2ᵉ appareil par la synchro.
- Vérifié : vrai Code.gs v67 (prono PL refusé) et v68 (accepté ; commencé → refusé ; Ligue 1 inchangée ; pronos des autres cachés avant le coup d'envoi) ; page : section Premier League,
  logos ESPN, pastille avec les matchs anglais ; captures 390 clair/sombre et 1440.

## v67 (Sport plus souvent pendant les matchs)
- `sport.yml` (à déposer à la main) : en plus du passage toutes les 2 h, :07 et :37 chaque soir de 17 h à 23 h UTC (18 h - 1 h à Paris en hiver, 19 h - 2 h en été)
  et samedi-dimanche de 11 h à 16 h UTC (dès 12 h à Paris). 179 passages par semaine au lieu de 84, jamais deux à la même minute (vérifié sur une semaine simulée).
  Pronos et Paris se règlent sur ces fichiers : 15 à 45 min après le coup de sifflet pendant ces créneaux (avant : jusqu'à 2 h 15). La relecture complète reste une fois par jour (`completLe`).

## v66 (Pronos : accès dédié, classeur version 5)
- **Page à part entière** : `noyau.js` `PAGES` + `pronos`, `NOMS_PAGES`, `pronos.html` `garde('pronos')`, retour « ‹ Accueil ». Classeur sans ligne Pronos (pas dans `accueil.pages_connues`, écrit par `configuration.py`) :
  la page suit Sport (`SUIT`), comme avant. Réglages › Pages et widgets : avertit que couper la page la ferme aussi aux amis.
- **Tuile « Pronos »** (icône `pronos`, trophée, `Noyau.icones`) : ligne `ap:accueil:pronos` du classeur (fin de l'écran d'accueil) ; sans elle, l'accueil ajoute une tuile automatique si la page n'a aucun accès (`placer('pronos', …)`).
  `pageDe` (accueil, Réglages) reconnaît `pronos.html`.
- **Pastille** (accueil, `pronosPastille`) : appareil connecté aux Pronos (`pronos:moi`) et serveur connu (`Noyau.pronos.serveur()`) → une action `etat` + `donnees/sport/prochains.json` (compétitions `Noyau.pronos.ligues()`, 7 jours, pas commencés)
  → nombre de matchs sans ton prono, sur toute tuile ou raccourci vers `pronos.html`. Mémoire de session 5 min (`pronos:pastille`), effacée par la page Pronos après un prono.
- **Sport** : bouton trophée dans l'en-tête (`#pronosBtn`, retiré si la page est coupée) ; le lien du bas de page disparaît.
- `manifest.json` : raccourcis Pronos et Sport (appui long sur l'icône Android, clic droit sur PC).
- `configuration.yml` (à déposer à la main) : `actions/checkout` sur la dernière version de la branche. Le 07/11, la Configuration lancée par le classeur v4 déposé pendant la mise à jour v65
  est partie de l'état du dépôt au moment du dépôt, a buté sur le commit de la Configuration lancée par la mise à jour, et n'a rien enregistré (config sans `pronos` : adresse de secours).
- Vérifié : config actuelle (tuile automatique, pastille 13 puis 12 après un prono, bouton Sport, retour Accueil), classeur v5 (une seule tuile), page coupée (pas de tuile, pas de bouton, page désactivée),
  appareil sans compte Pronos (aucune demande au serveur) ; textes avant / après identiques ailleurs ; captures 390 clair/sombre et 1440. Classeur v5 : config identique à la v4 sauf `accueil` (+ pronos, `pages_connues`) et `applis` (+ tuile).

## v65 (dock prêt pour les copies, classeur version 4)
- **Départs neutres** : ville Paris (`index.html` `FAV_DEFAULT`), aucune équipe (`sport.html` `FAV_DEFAULT`, accueil `SPORT_FAV`), aucun abonnement (`videos.html`). Les constantes littérales restent (lues par `extraire.mjs`) ;
  les pages utilisent `Noyau.depart(clé, neuf)` (`FAV_DEPART`, `ABOS_DEPART`). `noyau.js` : `noyau:departs` fixé au premier passage, `ancien` si une clé du dock existe déjà (hors `pronos:*`) → anciennes valeurs (`ANCIENS`), sinon `neuf`.
  Rien n'est écrit dans les choix (`lieu:favoris`, `sport:favoris`, `videos:abos`) : pas d'effet sur la synchro. Nouvelle icône d'écran d'accueil = appareil neuf : la synchro ramène les choix enregistrés.
- **Premier lancement** (`index.html`, `bvScrim`) : seulement si `noyau:departs` = `neuf` ; ville (fenêtre des villes, retour à la liste à la fermeture), équipes (`sport.html?ouvrir=favoris`), plateformes (`videos.html?ouvrir=abos`), lien vers la synchro.
  ✅ quand la clé existe ; « C'est fait » → `accueil:bienvenue` ; « Plus tard » → session seulement. Pas affiché avec `?ouvrir=`.
- **Vidéos** sans abonnement : toutes les plateformes + encadré « Choisis tes plateformes ». Clé TMDB manquante : message déjà présent dans la page ; **État** : partie « Catalogue Vidéos (TMDB) » (`etat.mjs` → `videos`).
- **État** : « Tâches GitHub · Aucune donnée publiée depuis l'installation » quand ni matchs, ni programme TV, ni actus, ni marchés (copie aux tâches désactivées) ; partie « Pronos entre amis » (source du serveur).
- **Pronos** : `Noyau.pronos.serveur()` → `{api, source}` : `classeur` (`pronos.api`, et `pronos.compte` = propriétaire du dépôt ou vide), `autre` (le classeur vise un autre compte : copie → simulation),
  `secours` (classeur sans adresse, dépôt du compte zyavo : ancienne `API_TEST`, dans `noyau.js`), `aucun` (simulation). Compte du dépôt : `Noyau.depot.nom` (adresse github.io, sinon `config.js`).
  `pronos.html` : `const API = SERVEUR.api` (`API_TEST` retirée de la page).
- **Classeur version 4** : onglet **Pronos** (`pr:api`, `pr:compte`, colonne « Valeur » à remplir, reprise d'une version à l'autre : `LIENS` de `construire.py`) ; `configuration.py` `m_pronos` (onglet facultatif : config `pronos`).
  Tuto : export Excel depuis Numbers, Spotify en mode développement, Pronos entre amis, premier lancement. Ton classeur v4 : construit depuis le tien, adresse et compte ZyAvo remplis ;
  config produite identique à l'ancienne (tous les fichiers) sauf `pronos`.
- Vérifié : appareil neuf (390 clair/sombre, 1440) : bienvenue, Paris, Sport et Vidéos sans favori ; appareil déjà utilisé : Réalmont, anciens favoris et abonnements, rien d'écrit, pas de bienvenue ;
  textes avant / après identiques (accueil, Sport, Vidéos, Actus, Réglages, Investissements ; État : parties ajoutées) ; Pronos sur zyavo.github.io (secours, puis classeur v4) et sur une copie (simulation) ;
  État d'une copie vide sans clé TMDB ; scénarios v63 (synchro, reconnexion) toujours bons.

## v64 (libellé de saison)
- `sport.html` `saisonTxt(L, s)` (classement, `tableHTML`) : ESPN donne « 2026-27 French Ligue 1 », « 2027 » (Top 14), « 2026-27 » (NBA, NHL) → « Saison 2026-2027 ».
  Une seule année pour F1, MotoGP (`racing`), NFL et les tournois (`seasonal`). Année seule ailleurs : bornes de la saison (`seasonBounds`) sur deux années → « AAAA-AAAA ».
- Vérifié : 19 compétitions avec classement (Top 14 et Ligue 1 ouverts en 390 clair/sombre et 1440, avant « Saison 2027 » / « Saison 2026-27 French Ligue 1 »).

## v63 (Pronos : identité sur tous les appareils, lien de reconnexion)
- `synchro.js` : `pronos:'pronos:moi'` dans `PREFS` (« si présent » : empreinte des prefs inchangée tant qu'elle est vide). Le code à 4 chiffres ne voyage que dans le fichier chiffré.
  `choisir` : si les deux côtés ne diffèrent que par `pronos` (deux appareils déjà connectés au passage à la v63, avatar changé), pas de question : la version déjà partagée gagne.
  Libellé du conflit : « …, identité Pronos ». « Changer de joueur » n'oublie l'identité que sur cet appareil (les autres la gardent et la renvoient) ; une nouvelle identité part sur tous.
- `pronos.html` charge `synchro.js` ; `prefsPlusTard()` après inscription, avatar, reconnexion ; `synchro:prefs` → nouvelle identité → `actualiser()`.
  Synchro activée mais verrouillée et personne de connecté : carte « Déjà joué sur un autre de tes appareils ? » (code d'Investissements → `ouvrirAvecCode` → `Synchro.prefs()`). Jamais chez un ami (pas de synchro).
- Lien de reconnexion `pronos.html?groupe=G&pseudo=P` (jamais le code) : formulaire « Bon retour P » (`recoHTML`, `RECO`, `PRE`) ; bouton « Déjà inscrit ? Me reconnecter » sur l'inscription ;
  « pseudo pris » → bouton « C'est moi : me reconnecter ». Mon profil : choix du joueur (moi ou un ami) + « Partager le lien » (`lienRecoHTML`, `partager`).
  Reconnexion = action serveur `etat` (`DISTANT.reconnecter`) : refusée si le joueur n'existe pas (pas de compte créé par une faute de frappe), avatar gardé (l'inscription renvoyait un avatar tiré au hasard), pseudo écrit comme sur le serveur.
  Lien d'un autre joueur ouvert sur un appareil déjà connecté : bandeau « Me connecter en P » / « Rester ». Après connexion, `pseudo=` est retiré de l'adresse.
- `actualiser` : pseudo local corrigé s'il ne diffère du serveur que par les majuscules. Rien à faire dans Apps Script (serveur v61).
- Vérifié : avant / après (texte rendu identique hors ajouts), vrai `Code.gs` dans un vm + API GitHub simulée : inscription sur A → identité reçue sur B ; C verrouillée → code → compte repris ;
  passage à la v63 sans question, vrai conflit de favoris toujours posé ; lien Marc (mauvais code, faute de frappe sans création, « marc » → « Marc », avatar gardé) ; bandeau ; lien pour un ami sans code ; simulation inchangée ; captures 390 clair/sombre et 1440.

## v62 (accueil, points du rugby, logos manuels)
- `pronos.html` : `SECTION` (non gardée : `accueil` à chaque ouverture, puis `pronos`, `paris`, `regles`). Accueil : avatar, cartes Pronos (pronos à faire, rang, prochain match),
  Paris (crédits, en jeu, matchs avec cote ; `chargerParis()` en arrière-plan) et Règles (`reglesHTML()`, lisible aussi avant l'inscription). Bouton « ‹ Accueil » dans chaque section ;
  la barre à 4 onglets disparaît (Pronos : À pronostiquer / Résultats / Classement ; Paris : ses sous-onglets). Sur PC : 3 cartes côte à côte.
- `pronos.html` : `points(p, m)` rugby = 1 pour le bon résultat, 3 pour le plus proche du score parmi eux (règle dans `PRONOS.md`). Logos : `chargerFichiers()` lit `fichiers.json`,
  `logoManuel(m, t)` (mots du nom du club / du fichier, 6 premières lettres, ex æquo : aucun ; clubs de `france` pour Ligue 1 et Top 14) passe avant les logos des données ;
  `compLogo` prend `logos/competitions/<nom>[-sombre]` d'abord.
- `sport.html` : `logoLigne` (classement) commence par `userLogo` (tes logos), comme la liste des matchs.
- `sport-data.mjs` `logosClubs` : remplace sur les matchs déjà joués le lien ESPN inexistant laissé par la v57 (`rugby/teams/500/<id>.png`, Perpignan et Vannes : 16 matchs) par le logo TheSportsDB en mémoire.
- `Code.gs` v61 (déjà déployé le 06/11) : lignes écrites par `setValues`, mois d'un pari = mois du coup d'envoi.
- Vérifié : page par page, source de chaque logo (Bayonne et Vannes : tes fichiers partout ; Top 14 et Champions Cup : tes fichiers) ; règle rugby (ex æquo, seul bon résultat) ; foot inchangé.

## v60 (Pronos : paris en crédits fictifs)
- `pronos.html` : 4ᵉ onglet « Paris » (onglets : Pronos, Résultats, Classement, Paris) ; sous-onglets Aujourd'hui / Mes paris / Classement (Ce mois-ci, Général, palmarès). `chargerParis()` lit `jours.json`
  (équipes, logos des compétitions) puis l'action serveur `paris` ; `validerPari()` → `miser`. Clés `pronos:pvue`. Serveur v56 : message « à mettre à jour ».
- `Code.gs` v60 (Nouvelle version à déployer) : onglet Paris, `cotesMatin()`, `resultats()`, `regler()`, `bilan()` (règles dans `PRONOS.md`). Test : vrai `Code.gs` dans un vm, cotes du matin fictives sur 138 matchs,
  5 joueurs, paris depuis octobre : podium d'octobre → bonus de novembre (120 / 110 / 105), règlements, refus (solde, coup d'envoi, sans cote, mauvais code), parcours page (parier, modifier, annuler).

## v59 (logos des compétitions)
- Rugby : ESPN n'a que l'icône générique `ESPN-icon-rugby`. `sport-data.mjs` `logoCompetition(L, info)` : badge TheSportsDB (`lookupleague.php?id=`, `TSDB_LIGUE` : Top 14 4430, Champions Cup 4550,
  Six Nations 4714, Coupe du monde 4574) → `logo` du fichier de la compétition (donc `jours.json`, la page Sport, Pronos). Mémoire `_logos-competitions.json` (30 jours ; 1 jour si rien).
- Foot (sélections) : `COMP_LOGOS` dans `sport.html` : Coupe du monde et ses qualifications = logo ESPN 4, Euro et ses qualifications = 74, Ligue des nations 2395, Coupe du monde des clubs 1932,
  amicaux 53, JO = anneaux (`upload.wikimedia.org/…/Olympic_rings_without_rims.svg`, repli logo ESPN 71 par `data-r`). `LOGO_PRE` : logos de `jours.json`, aussi pour les compétitions en pause.
- `compBadge` : avec un vrai logo (pas l'icône ESPN), pas de drapeau ni de globe pour les régions `intl` et `rintl` ; les autres compétitions gardent leur drapeau.

## v58 (logos de clubs manquants)
- ESPN n'a pas de logo de club pour Perpignan et Vannes (le `rugby/teams/500/<id>.png` de la v57 n'existe pas) ni pour Bayonne (vide). `Match.equipeClub` retire maintenant le drapeau sans rien mettre.
- `sport-data.mjs` `logosClubs(L, events, table)` (rugby hors sélections) : clubs sans logo (matchs et classement) → TheSportsDB : `lookup_all_teams` de la compétition (`L.tsdb`, ou celle citée par `L.badges`),
  sinon `searchteams.php?t=<nom>` (rugby, 8 au plus) ; rapprochement par mots (même mot, ou 6 premières lettres communes : Bayonne / Aviron Bayonnais ; ex æquo : rien). Mémoire `_logos-<compétition>.json`
  (7 jours ; 1 jour si un club reste sans logo). Journal de la tâche : « logos TheSportsDB x/y [club ✓|✗] » ; `diag.logos`.
- v59 : 1ᵉʳ passage réel : Perpignan ✓, Bayonne et Vannes ✗ (liste des équipes incomplète avec la clé gratuite, `searchteams` veut le nom exact). On lit aussi les matchs
  TheSportsDB de la compétition (`eventsseason`, `eventspastleague`, `eventsnextleague` : `strHomeTeam` + `strHomeTeamBadge`…) tant qu'il manque un club ; mémoire `v:2` (l'ancienne est relue).
- `sport.html` : `logoLigne(L, e)` pour le classement (pas de drapeau ; sinon logo du même club dans les matchs) ; `mergeLive` garde le logo des données préparées si ESPN n'en donne pas.
- `pronos.html` : drapeau sur un club → pas de logo (celui de la tâche, sinon pastille).

## v57 (données ESPN : doublons, logos)
- **Fiche en double** (Top 14, 07/11/2026 : « Perpignan – Section Paloise » 16 h 30, équipes 289360 / 289553 vues nulle part ailleurs, à côté du vrai « Pau – Perpignan » 16 h 35) :
  `Match.doublons(liste)` (`match.js`) écarte un match dont les deux équipes n'ont aucun autre match de la même compétition dans la liste, quand un autre match de la compétition
  à moins de 36 h a une équipe connue du même nom ; liste de moins de 12 matchs : rien. Utilisé par `sport-data.mjs` (avant d'écrire chaque compétition ; compté dans `diag.ghosts`),
  `sport.html` (`sansDoublons` : données préparées, après l'ajout des jours passés, `mergeLive`). Vérifié sur les 6 988 matchs publiés : seul 604881 est écarté ; page Sport : 880 → 879 matchs.
- **Drapeau de pays sur un club** (ESPN : Perpignan « USA » → `countries/usa.png`, Vannes « VAN » → Vanuatu) : `Match.equipeClub(t, L)` hors régions `intl` / `rintl` → code tiré du nom (PER, VAN) ;
  logo : voir v58. Appelé par `norm()` (page et tâche ; `sport-data.mjs` fournit `globalThis.equipeClub`), `expand()` et, avant écriture,
  sur tous les matchs de la compétition (y compris ceux repris du fichier précédent). `pronos.html` : même règle dans `logoEq`.

## v56 (Pronos : présentation)
- `pronos.html` réécrite côté affichage (détail dans `outils/dev/PRONOS.md`, « Présentation ») ; même interface `BASE` (+ `avatar(av)`), mêmes clés (`pronos:moi` reçoit `avatar`, nouvelle `pronos:fete`).
  Rafraîchissement : comptes à rebours toutes les 30 s, nouveau rendu au coup d'envoi seulement hors saisie. Styles `p-*` ; sur PC (`html.desk`) compétitions sur deux colonnes.
- `Code.gs` v56 (à redéployer : Gérer les déploiements › Nouvelle version) : avatars et « qui a joué ». Test : vrai `Code.gs` dans un vm (faux tableur), 5 joueurs, pronos sur 76 matchs passés ;
  − / + et clavier, avatar, serveur v55 simulé, simulation, captures 390 clair/sombre et 1440.

## v55 (Pronos partagé)
- `pronos.html` (v65 : remplacé par `Noyau.pronos.serveur()`) : `API_TEST` (adresse /exec du serveur de test, compte perso) = valeur par défaut de `CFG('pronos.api')` ; `pronos.api` vide → simulation (texte rendu identique à la v54). À retirer avant de rendre le dock public (ligne du classeur à créer).
- Page : bandeau `PANNE` (serveur injoignable, code non reconnu → identité oubliée, retour à l'inscription) ; messages `code` / `match` au prono ; Classement › « Changer de joueur ou de groupe » (`data-quitter`).
- `Code.gs` : colonnes texte (`setNumberFormat('@')`) et comparaisons `T()` ; fonction `verifier()` (autorisations + nombre de matchs lus). Test : vrai `Code.gs` dans un vm avec un faux tableur qui change les chiffres en nombres, branché sur deux pages Playwright (inscription, prono modifié, refus après coup d'envoi, pronos des autres cachés puis visibles, classement, mauvais code, panne).

## v54 (logique commune, TV, applis)
- **Écarts de cotes** : `Match.ecarts(vals, mediane)` (`match.js` ; aussi `Match.moyenne`, `Match.mediane`) → `[{s, v, ref, e}]` (3 sites au moins). Utilisé par `ecarts.html` (charge maintenant `match.js`), l'accueil PC (`chargerCotes`, après `chargerJS('match.js')`) et `cotes-mail.mjs` (exécute `match.js` par vm). Résultats identiques (page, encadré PC, aperçu du mail comparés avant/après).
- **Catalogue TV en 3 fichiers** : `tv-catalogue.mjs` écrit `donnees/tv/directs.json`, `films.json`, `series.json` (`{v:2, genere, iv, ct}`, gzip puis AES-GCM, même clé ; contenu `{v:2, genere, fin, d|f|s}`) et supprime `catalogue.json`. `tv.js` : `catalogue()` lit `directs.json` (sinon l'ancien `catalogue.json`), `CATA.parts` ; `section(a, 'f'|'s')` charge Films / Séries au premier passage sur leur onglet ou à l'ouverture d'une fiche depuis Favoris / À regarder. État lit le début de `directs.json`. Test (faux serveur Xtream, 3 000 directs, 20 000 films, 3 000 séries) : listes et fiches identiques ; à l'ouverture 34 Ko au lieu de 722 Ko.
- **Lecteur** : `backBufferLength` 300 → 120 s, `maxMaxBufferLength` 120 → 90 s.
- **Crochets d'appli dédiée** (`outils/dev/APPLIS.md`) : `MonEcranNatif.stockage` (derrière `Noyau.stockage`), `MonEcranNatif.tv.adresse/pret` (à la place du relais dans `viaRelais` / `relaisOK`), `MonEcranNatif.retourSpotify` (`SP_REDIRECT`). Sans pont : rien ne change.

## v53 (socle commun, ergonomie)
- **`commun.js`** (fin de page, à la place des 3 blocs recopiés dans 10 pages) : rond de toucher, service worker + avis « Nouvelle version » (pas de rechargement automatique pendant une lecture : `enLecture()` de l'accueil s'il existe, sinon vidéo en cours ou image dans l'image), « tirer pour rafraîchir » (si `#ptr`). `tv.html` le charge aussi (elle a maintenant le service worker).
- **`commun.css`** (avant les styles de la page, qui peuvent préciser) : `@font-face` Geist et Geist Mono (`polices/*.woff2`, variables, réduites au latin et latin étendu, 42 Ko chacune, licence `polices/LICENCE-Geist.txt`) au lieu de Google Fonts ; règles `.tap-dot`, `.maj-toast`, `.ptr` (sorties des pages) ; zone tactile de 44 px des `.icon-btn.glass` (padding 3 px + marge −3 px, `background-clip:content-box`, reflets `inset:3px` : dessin identique, vérifié au pixel). Pages : `<link rel=preload>` de la police (+ Geist Mono sur Sport). Service worker : `commun.js`, `commun.css` et Geist dans `SHELL`, `polices/` en mémoire (`cacheFirst`).
- **`Noyau.json(url, {defaut, verif, cache})`** → `{ok, statut (200 | code | 'forme' | 'reseau'), donnees}`, jamais d'exception ; utilisé par Vidéos (catalogue sans `titres` : message au lieu de « Chargement du catalogue… » figé).
- **`config.js`** sans `tv.chaines` (≈ 10 Ko ; reste dans `config/tv.json` pour les tâches) : 39,6 → 29,4 Ko.
- **Sport PC** : `autoDuo()` (après `suivreDuo()` dans `render`) ouvre le duo à l'ouverture sur aujourd'hui (favori en direct, en direct, prochain favori, prochain match) ; `fermerDuo()` note `sport:duo-ferme` (session) : plus d'ouverture automatique. Pastilles de chaînes `.pill.fr` sur deux lignes si besoin.
- **Vidéos** (≤ 480 px) : onglets sur leur ligne sous la barre du haut. **État** sombre : badges `.tag` à 40 % de la couleur (contraste « ok » 3,1 → 5,6).
- Ménage : `pasEnvoyee` (Réglages) retirée ; liste des chaînes de la session `tv:chaines` (« tv:liste » = À regarder). `favLinks` (Sport, favoris) laissée en place.

## v52 (Sport rapide, sécurité)
- **Sport** : formateurs `Intl` gardés (`HHMM`, `JOUR_C`, `JOUR_L`, `COTE_F`), `plain` et `tokens` mémorisés (`PLAIN`, `TOKENS` : listes lues seulement), matchs mis à plat une fois par rendu (`tousMatchs()`, `TOUS` remis à zéro au début de `render` et `renderDays`). Calcul au démarrage (profil mobile, CPU ×4) : 3,8 s → 1,7 s ; rendu identique sur les 21 jours en 390 et 1440 px. `finiSansNouvelles()` : un match « in » des données préparées commencé depuis plus que sa durée (`DUREE_SPORT`) + 1 h passe « post » (plus de faux « EN DIRECT » si ESPN ne répond pas).
- **Accueil PC et mode TV** : `donnees/actus/une-liste.json` (14 titres, résumé du premier seulement, écrit par `actus-data.mjs`) au lieu de `actus-fr.json` (≈ 3 Ko au lieu de 82 Ko) ; `uneListe()` revient à l'ancien fichier tant que la tâche ne l'a pas produit.
- **Icônes App Store** : plus de JSONP `itunes.apple.com` dans l'accueil ; `configuration.py` `icones_appstore()` les cherche (API Apple, 60 au plus par passage, celles déjà trouvées gardées) → `config/icones.json` et `config.js` module `icones` (clés `id:<numéro>` / `s:<nom>`, comme `iconKey`). L'accueil lit `CFG('icones')` + `icons:v1` de l'appareil.
- **hls.js** : copie figée `vendor/hls.min.js` (1.7.4, licence `vendor/hls-LICENSE.txt`) au lieu de jsDelivr `@1`.
- **Sauvegarde** (État) : nouveau format `MONECRAN2.` chiffré avec une phrase de 6 mots (`Synchro.genererPhrase`, PBKDF2 310 000 tours, `phraseNette` : minuscules, sans accents, espaces) ; `MONECRAN0.` / `MONECRAN1.` toujours lus ; champ code ou phrase selon le préfixe collé.
- **Service worker** : `donnees/tv/` et requêtes `Range` hors service worker ; seules les réponses 200 sont gardées ; `donnees-v1` limité à 40 fichiers ; à l'activation, l'ancien catalogue TV est retiré de la mémoire (mesuré : 22 Mo → 2,6 Mo après une visite de chaque page).
- **Relais TV** : ne relaie que les serveurs vus depuis le dock (demande avec Origine autorisée), ceux cités dans une liste HLS ou atteints par redirection, ou `TV_SERVEUR` ; journal masqué aussi pour `/movie/` et `/series/`.
- **Synchro** : une branche `synchro` absente est créée orpheline avec le seul fichier chiffré (API Git : blob, arbre, commit sans parent, ref). Pour nettoyer l'ancienne : synchroniser, supprimer la branche sur GitHub, resynchroniser.

## v51 (tâches)
- **Correctif** : depuis la v48, `sport-data.mjs` plantait au démarrage (`classify`, `summaryEvents` partis dans `match.js`, `statOf` devenue une fonction) sans le signaler (`continue-on-error`) : données Sport figées. Il exécute maintenant `match.js` (vm, `window` = objet global) avant les extraits de `sport.html`.
- **Essai à sec** dans `empaqueter.py` : chaque `outils/*.mjs` lancé 15 s sans réseau (fetch refusé, secrets retirés), `outils/*.py` compilés ; un motif `SyntaxError`, `ReferenceError`, « introuvable », `Cannot find module`… bloque le lot (`--sans-essai` pour passer outre). Le lot v50 y échoue.
- **Tâche « Sport »** (`sport.yml`, `7 */2`, nouvelle) : `sport-data.mjs` seul, sans `continue-on-error` (un plantage = tâche rouge) ; reprend les déclencheurs logos/calendriers. **Programme TV sport** (`programme-tv.yml`) : guide TV seul, `17 1,5,9,13,17,21` ; 7 jours au passage de la nuit (1 h à 4 h UTC) ou à la main, sinon 2 jours (les jours suivants sont repris par `tv-tri.mjs`).
- **ESPN** (`eventsFor`) : demande « toute la période » retirée (jamais remplie) ; de J-3 à J+14, seuls les jours utiles sont relus (calendrier ESPN, jours de match déjà connus, hier, aujourd'hui), sauf au premier passage de chaque jour UTC (`completLe` dans le fichier de la compétition, `SPORT_COMPLET=1` pour forcer) ; `diag.complet`.
- **Catalogue TV** sur la branche `donnees-tv` : `publier-donnees.sh [--branche NOM] [--retirer CHEMIN]… [CHEMIN…]` (n'envoie rien si l'arbre ne change pas ; écrit `change=0|1`), `reprendre-donnees.sh [branche…]` (défaut `donnees` ; la Publication prend `donnees donnees-tv`). `tv.yml` publie sur `donnees-tv` puis retire `donnees/tv` de `donnees`. Adresse publiée inchangée (`donnees/tv/catalogue.json`).
- **Publication** : aussi après « Sport » ; plus de mise en ligne après une tâche de données en échec.
- **Mise à jour** : `config/` et `configuration.xlsx` d'un zip ignorés (signalés dans le résumé) ; envoi en 3 essais (`pull --rebase`) ; relance `sport.yml` pour `sport.html`, `match.js`, `outils/sport-*.mjs`, logos, calendriers, et `programme-tv.yml` pour `tv-tri.mjs`. **Configuration** : `config/sport.json` → `sport.yml`.
- **Cotes** : `*/10 6-23` (UTC) ; mi-temps 45 à 80 min après le coup d'envoi. État : programme TV orange après 6 h, rouge après 14 h.

## Logos de l'appli (v43)
- `themes.js` : `LOGOS` (7 dessins SVG 512 × 512 : origine, grille, monogramme, ecran, horizon, cadran, point), couleurs tirées du thème par `logoCouleurs(t)` (fond `f1`→`f2`, `encre`, tuiles `a`/`b`/`clair`/`gris`, accent `vif` — orange si l'accent sombre du thème est trop terne). API : `Themes.logos`, `logoSVG(id, thème?)`, `logoActuel()`, `choisirLogo(id)` (clé `logo`, sur l'appareil, dans la sauvegarde), `logoCouleurs(t)`.
- `poserIcones()` (au chargement et à chaque changement de thème ou de logo) : favicon SVG en direct ; `apple-touch-icon` et `manifest` → `icones/<logo>-<thème>-180.png` et `icones/manifest-<logo>-<thème>.json` (192 et 512 px) ; logo d'origine + Bleu → fichiers de toujours ; thème perso → PNG dessiné sur l'appareil (repli : version Bleu). `[data-logo-app]` (titres d'État et de Réglages) rempli avec le logo.
- **`outils/dev/icones.py <dépôt>`** fabrique les 77 jeux d'images (Playwright + Pillow, 256 couleurs tramées, ≈ 4 Mo) : à relancer après l'ajout ou la retouche d'un thème ou d'un logo, avant d'empaqueter.
- État › Thème : « Icône de l'appli » (7 choix aux couleurs du thème) ; l'icône d'écran d'accueil ne change qu'en la supprimant puis en la rajoutant (nouvelle mémoire : sauvegarde ou synchro d'abord).

## Musique, dépôt, installation (v42)
- `Noyau.accueil.musiques` / `musique()` / `choisirMusique(id)` (clé `musique:source`, propre à l'appareil, dans la sauvegarde, dans `signature()`) : Spotify (widget complet), Deezer, Apple Music, YouTube Music, Amazon Music (widget raccourci : `Noyau.lien.ouvrir` → app / android / web). Réglages › Pages et widgets : ligne « Source musique ».
- Nom du dépôt : adresse `pseudo.github.io/<dépôt>/`, sinon `config.js` `depot.nom` (écrit par `configuration.py` depuis `GITHUB_REPOSITORY`), sinon `ZyAvo/iPhone-Dock`. État › lien Actions : `Noyau.depot.nom`. Procédure : `outils/dev/RENOMMER-LE-DEPOT.md`.
- `manifest.json` : icônes `icone-192.png` et `icone-512.png` (maskable), `id`, `scope`, `lang` : installable sous Android et PC (Chrome, Edge). `sw.js` met `themes.js` et les icônes en mémoire.
- Études et relectures : `outils/dev/ETUDE-EMPLOI.md` (sources d'offres d'emploi), `outils/dev/DOCK-PUBLIC.md` (rendre le dock public).

## Idées abandonnées
- **Agrégateur de prix des enseignes** (31/10/2026) : test `prix-test.mjs` lancé depuis GitHub et depuis le PC. Carrefour, Intermarché et Super U bloquent les robots (Cloudflare, DataDome) même depuis une connexion de particulier ; E.Leclerc et Auchan seulement depuis le PC ; Monoprix et Lidl lisibles partout. Open Prices : environ 1 500 relevés en France en deux semaines, concentrés sur peu de magasins. Jugé trop peu intéressant. Script retiré (liste `SUPPRIMER` d'`empaqueter.py`) ; `.github/workflows/prix-test.yml` à supprimer à la main.

## Phase 2 (faite)
1. ~~Lot technique~~ (v37).
2. ~~Écrans à cocher : médias d'actus, chaînes YouTube, compétitions, marchés/fonds~~ (v38, page Réglages).
3. ~~Activer/désactiver pages et widgets~~ (v39, Réglages › Pages et widgets).
4. ~~Éditeur de l'accueil (applis, dossiers, bandeau, Navigation, 3 liens, ordre des tuiles et emplacements)~~ (v40, Réglages › Écran d'accueil). (`chaines.txt` est toujours lu par la tâche « Vidéos » pour les chaînes déjà ajoutées.)
Anticiper des applis dédiées : `noyau.js` commun (config, stockage, synchro, lien selon l'appareil), écrans sans astuce propre à Safari, fonctions propres à l'iPhone web isolées.

## Tests
Thèmes (v42) : capture de l'accueil pour chaque thème en clair et en sombre ; État : formulaire « Créer mon thème » (coller une adresse coolors, vérifier `data-palette` = `apercu`, Enregistrer → `perso`, Annuler → thème choisi) ; recherche « zéro différence » du classeur toujours à 0.
Playwright + Chromium : servir une copie du dépôt avec `donnees/` (branche `donnees`) et `config/`, comparer le texte rendu des pages avant/après, capturer en 390×844 clair/sombre. Pages et widgets : mettre des modifs dans `modifs:attente` (localStorage) avant le chargement, vérifier le DOM et la liste des requêtes (aucune vers `donnees/…` pour un widget coupé, aucune pour une page coupée).
Report des modifs : lancer `configuration.py` sur une copie du classeur avec un `modifs.json` d'essai, vérifier les messages, l'effet dans config/, puis relancer (rien ne doit changer). `noyau.js` : simuler l'API GitHub (interception des requêtes `api.github.com`) et `window.Synchro.jeton`.
Écran d'accueil (v40) : glisser au doigt avec CDP `Input.dispatchTouchEvent` (Chromium mobile, `has_touch`), à la souris avec `page.mouse` ; vérifier que l'accueil de l'appareil (choix en attente) = l'accueil après la tâche (même affichage ; seule la clé interne d'un nouveau dossier change), que le catalogue après la tâche redonne le même affichage, et que `construire.py` reprend la disposition (config identique).
