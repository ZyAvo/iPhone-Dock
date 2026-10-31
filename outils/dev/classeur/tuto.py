# mon-ecran-version: 8474672a
# Textes des onglets « Lisez-moi » et « Tuto ».
LISEZMOI = [
    ('h', 'À quoi sert ce classeur'),
    ('p', "Il décrit tout ce que ton dock affiche : compétitions de sport, rubriques et médias d'actus, marchés, plateformes vidéo, chaînes YouTube, "
          "chaînes TV, cotes, pages, widgets et thèmes. Tu coches, tu déposes le fichier sur GitHub, et le dock se règle tout seul."),
    ('p', "Les lignes déjà cochées correspondent exactement au dock actuel. Le reste est un catalogue de ce que le dock sait récupérer : il suffit de cocher."),
    ('h', 'En 4 étapes'),
    ('p', "1. Ouvre un onglet (Sport, Actus, Marchés…). Mets « Oui » dans la colonne jaune des lignes que tu veux, « Non » pour en exclure une d'une section entière."),
    ('p', "2. Pour ajouter quelque chose qui n'est pas listé, va tout en bas de l'onglet, bloc « MES AJOUTS ». Une rubrique, une région ou un thème qui n'existe pas encore crée une nouvelle section."),
    ('p', "3. Enregistre le fichier sous le nom configuration.xlsx et dépose-le à la racine de ton dépôt GitHub (détail dans l'onglet Tuto)."),
    ('p', "4. La tâche GitHub « Configuration » lit le classeur, écrit les réglages du dock, teste les nouveautés et range une copie avec la colonne « Résultat » remplie "
          "(config/configuration-resultat.xlsx). Le résumé s'affiche aussi dans la page État de l'appli."),
    ('h', 'Règles de sélection'),
    ('p', "• « Oui » sur la ligne « ▸ toute la section » prend tous les éléments de la section, sauf ceux marqués « Non »."),
    ('p', "• « Oui » sur un seul élément suffit : sa section apparaît dans l'appli avec cet élément seulement."),
    ('p', "• Les sections et éléments s'affichent dans l'ordre du classeur."),
    ('p', "• Ce qui est marqué « À développer » ou « Non disponible » (colonne « Prise en charge ») peut être coché, mais ne s'affichera qu'une fois l'appli prête : le résultat le signale."),
    ('h', 'Ce que le classeur ne contient jamais'),
    ('p', "Aucun secret : ni code PIN, ni clé d'API, ni jeton GitHub, ni montant ou quantité de placements. Le dépôt est public : seuls tes choix d'affichage y sont visibles. "
          "Les clés vont dans les secrets GitHub ou restent sur ton appareil (voir Tuto)."),
    ('h', 'Nouvelles versions du classeur'),
    ('p', "Chaque ligne a un identifiant fixe (colonne cachée A). Quand une nouvelle version du classeur arrive (nouvel onglet, nouveau module…), tes « Oui », « Non » et ajouts "
          "sont repris automatiquement : tu n'as rien à recocher. Ne supprime pas les colonnes cachées A et « Technique »."),
]

import os
DEPOT = 'https://github.com/' + os.environ.get('MON_ECRAN_DEPOT', 'ZyAvo/iPhone-Dock')   # dépôt d'origine (lien « Copier le dépôt » du Tuto)
TUTO_REMPLIR = [
    ('Partie 1 · Remplir et déposer le classeur', "Pour tout le monde, à chaque changement de réglages.", [
        ('Ouvrir le classeur', 'Excel, Numbers ou Google Sheets', "Sur iPhone, Numbers ou l'appli Excel conviennent. Les colonnes jaunes sont les seules à remplir.", None),
        ('Cocher ce que tu veux', 'Onglets Sport, Actus, Marchés…', "« Oui » dans la colonne Oui. « Non » pour exclure un élément d'une section prise en entier. Laisse vide pour ne rien changer.", None),
        ('Ajouter un élément absent', 'Bas de chaque onglet, bloc MES AJOUTS', "Remplis Section (existante ou nouvelle), Nom et Source (adresse d'un site, @nom YouTube, ISIN, clé ESPN…), puis « Oui ». La ligne d'exemple grise est ignorée.", None),
        ('Vérifier la synthèse', 'Onglet Lisez-moi', "Le tableau compte tes éléments cochés par onglet : un moyen rapide de voir si rien n'a été oublié.", None),
        ('Enregistrer', 'Format .xlsx', "Nom du fichier : configuration.xlsx (exactement). Garde le format Excel, pas .numbers ni .csv.", None),
        ('Déposer sur GitHub', 'Page de ton dépôt GitHub', "Sur la page du dépôt : Add file → Upload files → glisse configuration.xlsx → Commit changes. Il remplace l'ancien.", DEPOT),
        ('Suivre la tâche', 'Onglet Actions du dépôt', "La tâche « Configuration » démarre seule (1 à 3 minutes). Coche verte = réglages appliqués ; croix rouge = ouvre-la pour lire l'erreur.", DEPOT + '/actions'),
        ('Lire le résultat', 'Page État de l\'appli, ou config/configuration-resultat.xlsx', "Chaque nouveauté reçoit ✅ (fonctionne), ⚠️ (trouvé, à vérifier) ou ❌ (introuvable, avec la raison). Corrige et redépose si besoin.", None),
    ]),
]
TUTO_PRIVE = [
    ('Partie 2 · Installer sa propre version (une seule fois)', "Pour un ami qui veut son dock à lui. Compter 30 à 45 minutes. Rien de payant.", [
        ('Créer un compte GitHub', 'github.com', "Gratuit. Choisis un pseudo : il apparaîtra dans l'adresse du dock (https://pseudo.github.io/…).", 'https://github.com/signup'),
        ('Copier le dépôt', "Dépôt d'origine (lien)", "Bouton « Fork » → Create fork (le nom proposé convient ; un autre nom marche aussi : le dock le lit dans son adresse). Tu as maintenant ta propre copie.", DEPOT),
        ('Activer les tâches', 'Ta copie → onglet Actions', "Sur une copie, GitHub les désactive : bouton « I understand my workflows, go ahead and enable them ».", None),
        ('Publier le site', 'Settings → Pages', "Source : GitHub Actions. Après la première tâche « Publication », le dock est en ligne à l'adresse affichée en haut de cette page.", None),
        ('Autoriser les tâches à écrire', 'Settings → Actions → General', "Tout en bas, Workflow permissions : « Read and write permissions » → Save. Sans ça, les données ne peuvent pas être enregistrées.", None),
        ('Clé TMDB (catalogue vidéo)', 'themoviedb.org', "Crée un compte, puis Paramètres → API → demande une clé « Developer » (usage personnel, gratuit). Copie le long « API Read Access Token » (commence par eyJ…).", 'https://www.themoviedb.org/settings/api'),
        ('Enregistrer la clé TMDB', 'Settings → Secrets and variables → Actions', "New repository secret : nom TMDB_TOKEN, valeur = le jeton copié. Les secrets ne sont jamais visibles publiquement.", None),
        ('Clé des cotes (facultatif)', 'the-odds-api.com', "Offre gratuite (500 crédits par mois) : la clé arrive par e-mail. Secret GitHub ODDS_API_KEY. Pour l'actualisation à la main, colle aussi la clé dans État → Cotes des matchs (elle reste sur l'appareil).", 'https://the-odds-api.com/'),
        ('Lancer les tâches une première fois', 'Onglet Actions', "Ouvre chaque tâche (Actus, Marchés, Vidéos, Programme TV sport, Cotes, Publication) → Run workflow. Ensuite elles tournent seules.", None),
        ('Ajouter le dock à l\'iPhone', 'Safari, sur l\'adresse du dock', "Bouton Partager → « Sur l'écran d'accueil ». Le dock s'ouvre alors en plein écran comme une appli.", None),
        ('Choisir son code', 'Page Investissements ou Coffre', "Au premier usage, l'appli demande un code PIN : il chiffre tes montants et ton coffre sur l'appareil. Il n'est jamais envoyé nulle part.", None),
        ('Synchroniser ses appareils (facultatif)', 'État → Synchronisation', "Crée une clé GitHub « fine-grained » (Repository access : seulement ta copie ; Permissions → Contents : Read and write), puis suis l'assistant : il génère une phrase de 6 mots à garder précieusement. "
         "La même clé sert aussi à envoyer les choix faits dans Réglages vers le classeur.", 'https://github.com/settings/personal-access-tokens/new'),
        ('Spotify (facultatif)', 'developer.spotify.com', "Create app → coche Web API → Redirect URI = l'adresse de ton dock → copie le Client ID et colle-le dans le widget Spotify de l'accueil.", 'https://developer.spotify.com/dashboard'),
        ('Déposer ton classeur', 'Partie 1, étapes 5 à 8', "Décoche ce qui ne t'intéresse pas (les choix de départ sont ceux de Yoann), ajoute tes fonds, médias et chaînes, puis dépose configuration.xlsx. Tes équipes favorites, abonnements et villes se choisissent ensuite dans l'appli.", None),
    ]),
    ('Mises à jour de l\'appli', "Quand une nouvelle version du dock est publiée.", [
        ('Récupérer la mise à jour', 'Fichier mise-a-jour-vNN.zip', "Dépose-le à la racine de ta copie (Add file → Upload files). La tâche « Mise à jour » l'installe toute seule.", None),
        ('Fichiers de tâches', 'Dossier .github/workflows', "GitHub interdit aux tâches de modifier ce dossier : si la mise à jour en contient, la tâche les liste et il faut les déposer à la main dans .github/workflows.", None),
        ('Tes réglages restent', 'configuration.xlsx', "Une mise à jour ne touche jamais tes choix. Si une nouvelle version du classeur est livrée, tes choix sont repris par identifiant.", None),
    ]),
]
JOURNAL = [
    (1, '30/10/2026', "Première version : 11 onglets (Sport, Équipes favorites, Actus, Actus International, Marchés, Vidéos, YouTube, Programme TV, Cotes, Accueil, Apparence), "
                      "pré-cochés à l'identique du dock actuel, catalogue de plus de 500 éléments à essayer, blocs « Mes ajouts », Tuto."),
    (2, '30/10/2026', "Onglet Applis : dossiers, bandeau du bas et navigation, avec 3 liens par appli (iPhone, Android, web) modifiables. "
                      "Onglet Cotes : réglages du rapport des écarts. Les pages lisent désormais ces réglages (config/config.js)."),
    (3, '30/10/2026', "Les choix personnels sortent du classeur : équipes et compétitions favorites, abonnements vidéo, villes météo. "
                      "Ils se règlent dans l'appli et passent d'un appareil à l'autre par la synchronisation chiffrée."),
]
