# mon-ecran-version: 20b346a9
# Catalogues Marchés, Vidéos, YouTube, Programme TV, Cotes, Accueil.

# ---------- Marchés : (section, id, code Yahoo, nom, note) ----------
MARCHES_SECTIONS = [('idx_eu', 'Indices · Europe'), ('idx_us', 'Indices · États-Unis'), ('idx_monde', 'Indices · Monde'),
                    ('devises', 'Devises'), ('matieres', 'Matières premières'), ('taux', 'Taux d\'intérêt'), ('crypto', 'Cryptomonnaies')]
MARCHES = [
    ('idx_eu', 'sbf120', '^SBF120', 'SBF 120', ''), ('idx_eu', 'stoxx600', '^STOXX', 'Stoxx Europe 600', ''),
    ('idx_eu', 'dax', '^GDAXI', 'DAX (Allemagne)', ''), ('idx_eu', 'ftse100', '^FTSE', 'FTSE 100 (Royaume-Uni)', ''),
    ('idx_eu', 'ibex35', '^IBEX', 'IBEX 35 (Espagne)', ''), ('idx_eu', 'ftsemib', 'FTSEMIB.MI', 'FTSE MIB (Italie)', ''),
    ('idx_eu', 'aex', '^AEX', 'AEX (Pays-Bas)', ''), ('idx_eu', 'smi', '^SSMI', 'SMI (Suisse)', ''), ('idx_eu', 'bel20', '^BFX', 'BEL 20 (Belgique)', ''),
    ('idx_us', 'dowjones', '^DJI', 'Dow Jones', ''), ('idx_us', 'nasdaq', '^IXIC', 'Nasdaq Composite', ''),
    ('idx_us', 'russell2000', '^RUT', 'Russell 2000', ''), ('idx_us', 'vix', '^VIX', 'VIX (volatilité)', ''),
    ('idx_monde', 'nikkei', '^N225', 'Nikkei 225 (Japon)', ''), ('idx_monde', 'hangseng', '^HSI', 'Hang Seng (Hong Kong)', ''),
    ('idx_monde', 'shanghai', '000001.SS', 'Shanghai Composite', ''), ('idx_monde', 'sensex', '^BSESN', 'Sensex (Inde)', ''),
    ('idx_monde', 'kospi', '^KS11', 'KOSPI (Corée)', ''), ('idx_monde', 'asx200', '^AXJO', 'ASX 200 (Australie)', ''),
    ('idx_monde', 'tsx', '^GSPTSE', 'TSX (Canada)', ''), ('idx_monde', 'bovespa', '^BVSP', 'Bovespa (Brésil)', ''),
    ('devises', 'eurgbp', 'EURGBP=X', 'EUR / GBP', 'change'), ('devises', 'eurchf', 'EURCHF=X', 'EUR / CHF', 'change'),
    ('devises', 'eurjpy', 'EURJPY=X', 'EUR / JPY', 'change'), ('devises', 'eurcad', 'EURCAD=X', 'EUR / CAD', 'change'),
    ('devises', 'eurcny', 'EURCNY=X', 'EUR / CNY', 'change'), ('devises', 'gbpusd', 'GBPUSD=X', 'GBP / USD', 'change'),
    ('devises', 'usdjpy', 'USDJPY=X', 'USD / JPY', 'change'), ('devises', 'dxy', 'DX-Y.NYB', 'Indice dollar (DXY)', ''),
    ('matieres', 'argent', 'SI=F', 'Argent', 'en dollars'), ('matieres', 'platine', 'PL=F', 'Platine', 'en dollars'),
    ('matieres', 'cuivre', 'HG=F', 'Cuivre', 'en dollars'), ('matieres', 'wti', 'CL=F', 'Pétrole WTI', 'en dollars'),
    ('matieres', 'gaz', 'NG=F', 'Gaz naturel', 'en dollars'), ('matieres', 'ble', 'ZW=F', 'Blé', 'en dollars'),
    ('matieres', 'mais', 'ZC=F', 'Maïs', 'en dollars'), ('matieres', 'cacao', 'CC=F', 'Cacao', 'en dollars'), ('matieres', 'cafe', 'KC=F', 'Café', 'en dollars'),
    ('taux', 'us10', '^TNX', 'Taux US 10 ans', ''), ('taux', 'us30', '^TYX', 'Taux US 30 ans', ''), ('taux', 'us3m', '^IRX', 'Taux US 3 mois', ''),
    ('crypto', 'btc', 'BTC-EUR', 'Bitcoin', 'en euros'), ('crypto', 'eth', 'ETH-EUR', 'Ethereum', 'en euros'),
    ('crypto', 'sol', 'SOL-EUR', 'Solana', 'en euros'), ('crypto', 'xrp', 'XRP-EUR', 'XRP', 'en euros'),
    ('crypto', 'bnb', 'BNB-EUR', 'BNB', 'en euros'), ('crypto', 'ada', 'ADA-EUR', 'Cardano', 'en euros'), ('crypto', 'doge', 'DOGE-EUR', 'Dogecoin', 'en euros'),
]
# Fonds et ETF suivis (ISIN uniquement, jamais de quantités) : (isin, code, nom)
FONDS = [
    ('LU1681043599', 'CW8.PA', 'Amundi MSCI World (Acc)'),
    ('FR0011869353', 'EWLD.PA', 'Amundi PEA Monde (MSCI World)'),
    ('FR0011871128', 'PSP5.PA', 'Amundi PEA S&P 500'),
    ('FR0011871110', 'PUST.PA', 'Amundi PEA Nasdaq-100'),
    ('FR0011550185', 'ESE.PA', 'BNP Paribas Easy S&P 500'),
    ('IE00B5BMR087', 'SXR8.DE', 'iShares Core S&P 500 (Acc)'),
    ('IE00BK5BQT80', 'VWCE.DE', 'Vanguard FTSE All-World (Acc)'),
    ('IE00B6R52259', 'IUSQ.DE', 'iShares MSCI ACWI (Acc)'),
    ('IE00BKM4GZ66', 'IS3N.DE', 'iShares Core MSCI EM IMI (Acc)'),
    ('LU0908500753', 'MEUD.PA', 'Amundi Stoxx Europe 600 (Acc)'),
]

# ---------- Vidéos : plateformes (id, nom, court, couleur, motif TMDB, lien appli, recherche web, note) ----------
PLATEFORMES = [
    ('paramount', 'Paramount+', 'P+', '#0064ff', '^paramount ?(\\+|plus)', 'paramountplus://', 'https://www.paramountplus.com/fr/search/?q=', ''),
    ('crunchyroll', 'Crunchyroll', 'CR', '#f47521', '^crunchyroll', 'crunchyroll://', 'https://www.crunchyroll.com/fr/search?q=', 'animation japonaise'),
    ('adn', 'ADN', 'ADN', '#0096d6', '^(adn|animation digital network)', 'adn://', 'https://animationdigitalnetwork.com/search?query=', 'animation japonaise'),
    ('arte', 'Arte', 'arte', '#fa481c', '^arte', 'arte://', 'https://www.arte.tv/fr/search/?q=', 'gratuit'),
    ('francetv', 'france.tv', 'f.tv', '#2a2aff', '^france ?tv', 'francetv://', 'https://www.france.tv/recherche/?q=', 'gratuit'),
    ('tf1', 'TF1+', 'TF1', '#0067b1', '^tf1', 'tf1plus://', 'https://www.tf1.fr/recherche?q=', 'gratuit'),
    ('m6', 'M6+', 'M6', '#ff0f64', '^(m6|6play)', 'm6plus://', 'https://www.m6.fr/recherche?q=', 'gratuit'),
    ('pluto', 'Pluto TV', 'PL', '#2f2f2f', '^pluto', 'plutotv://', 'https://pluto.tv/fr/search/details?query=', 'gratuit avec pubs'),
    ('mubi', 'MUBI', 'MUBI', '#001489', '^mubi', 'mubi://', 'https://mubi.com/fr/search/films?query=', 'cinéma d\'auteur'),
    ('universcine', 'UniversCiné', 'UC', '#e30613', '^universcin', '', 'https://www.universcine.com/recherche?q=', 'cinéma indépendant'),
    ('shadowz', 'Shadowz', 'SZ', '#7a0000', '^shadowz', '', 'https://www.shadowz.fr/search?q=', 'horreur'),
    ('filmo', 'FILMO', 'FO', '#ff5a00', '^filmo', '', 'https://www.filmo.tv/recherche?q=', ''),
    ('rakuten', 'Rakuten TV', 'RK', '#bf0000', '^rakuten', 'rakutentv://', 'https://www.rakuten.tv/fr/search?q=', 'partie gratuite'),
]

# ---------- YouTube : (thème, @nom ou identifiant, nom affiché) — tous « à vérifier » ----------
YOUTUBE = [
    ('Actualité', '@HugoDecrypte', 'HugoDécrypte'), ('Actualité', '@franceinfo', 'franceinfo'), ('Actualité', '@ARTEfr', 'ARTE'),
    ('Actualité', '@LeMondefr', 'Le Monde'), ('Actualité', '@Mediapart', 'Mediapart'),
    ('Sciences', '@ScienceEtonnante', 'ScienceÉtonnante'), ('Sciences', '@DirtyBiology', 'DirtyBiology'), ('Sciences', '@Fouloscopie', 'Fouloscopie'),
    ('Sciences', '@veritasium', 'Veritasium'), ('Sciences', '@kurzgesagt', 'Kurzgesagt'), ('Sciences', '@3blue1brown', '3Blue1Brown'),
    ('Sciences', '@MarkRober', 'Mark Rober'), ('Sciences', '@smartereveryday', 'SmarterEveryDay'),
    ('Astronomie et espace', '@NASA', 'NASA'), ('Astronomie et espace', '@SpaceX', 'SpaceX'), ('Astronomie et espace', '@EuropeanSpaceAgency', 'ESA'),
    ('Astronomie et espace', '@scottmanley', 'Scott Manley'), ('Astronomie et espace', '@EverydayAstronaut', 'Everyday Astronaut'),
    ('Histoire et géopolitique', '@NotaBeneMovies', 'Nota Bene'), ('Histoire et géopolitique', '@LeDessousDesCartes', 'Le Dessous des cartes'),
    ('Histoire et géopolitique', '@RealLifeLore', 'RealLifeLore'), ('Histoire et géopolitique', '@PerunAU', 'Perun (défense)'),
    ('Histoire et géopolitique', '@TaskandPurpose', 'Task & Purpose (défense)'),
    ('Tech', '@Micode', 'Micode'), ('Tech', '@UnderscoreTalk', 'Underscore_'), ('Tech', '@mkbhd', 'Marques Brownlee'),
    ('Tech', '@LinusTechTips', 'Linus Tech Tips'), ('Tech', '@Monsieurdream', 'Monsieur Dream'),
    ('Jeux vidéo', '@joueurdugrenier', 'Joueur du Grenier'), ('Jeux vidéo', '@Squeezie', 'Squeezie'), ('Jeux vidéo', '@Gotaga', 'Gotaga'),
    ('Jeux vidéo', '@gameblogfr', 'Gameblog'), ('Jeux vidéo', '@IGN', 'IGN'),
    ('Sport', '@Ligue1', 'Ligue 1'), ('Sport', '@lequipe', "L'Équipe"), ('Sport', '@Formula1', 'Formule 1'), ('Sport', '@MotoGP', 'MotoGP'),
    ('Sport', '@Top14Rugby', 'Top 14'), ('Sport', '@NBA', 'NBA'),
    ('Cuisine', '@Chefmichaeldusseldorf', 'Chef Michael'), ('Cuisine', '@JoshuaWeissman', 'Joshua Weissman'),
    ('Divertissement', '@Cyprien', 'Cyprien'), ('Divertissement', '@Mcfly-et-Carlito', 'McFly & Carlito'),
]

# ---------- Programme TV : chaînes en plus (nom, note) — la tâche cherche l'identifiant dans les guides publics ----------
TV_PLUS = [
    ('TF1', 'Matchs des Bleus, Coupe du monde de rugby'), ('France 2', 'Six Nations, Roland-Garros, Tour de France'), ('France 3', 'Tour de France, régions'),
    ('France 4', 'Événements sportifs'), ('M6', 'Coupe du monde, Euro'), ('W9', 'Football ponctuel'), ('TMC', 'Sport ponctuel'), ('TFX', 'Sport ponctuel'),
    ('Sport en France', 'Sports olympiques, féminins'), ('Automoto La Chaîne', 'Sports mécaniques'), ('Equidia', 'Courses hippiques'),
    ('Golf+', 'Golf (Canal+)'), ('Canal+ Sport 360 (bis)', ''), ('Eurosport 360 (multiplex)', 'Tennis, cyclisme'),
    ('beIN Sports Max 11', ''), ('Ligue 1+ 10', ''), ('Canal+ Docs', 'Documentaires'), ('Arte', ''),
]

# ---------- Cotes : sites (clé, nom, note) et compétitions (id dock, clé The Odds API supposée, nom) ----------
SITES_COTES = [('parionssport_fr', 'Parions Sport (FDJ)', 'à vérifier dans la région « fr » de l\'API')]
COMPS_COTES = [
    ('fra.2', 'soccer_france_ligue_two', 'Ligue 2'), ('eng.2', 'soccer_efl_champ', 'Championship'),
    ('ger.2', 'soccer_germany_bundesliga2', '2. Bundesliga'), ('ita.2', 'soccer_italy_serie_b', 'Serie B'),
    ('esp.2', 'soccer_spain_segunda_division', 'Liga 2'), ('ned.1', 'soccer_netherlands_eredivisie', 'Eredivisie'),
    ('por.1', 'soccer_portugal_primeira_liga', 'Liga Portugal'), ('eng.fa', 'soccer_fa_cup', 'FA Cup'),
    ('fra.coupe_de_france', 'soccer_france_coupe_de_france', 'Coupe de France'), ('fifa.world', 'soccer_fifa_world_cup', 'Coupe du monde'),
    ('uefa.euro', 'soccer_uefa_european_championship', 'Euro'), ('uefa.nations', 'soccer_uefa_nations_league', 'Ligue des nations'),
    ('180659', 'rugbyunion_six_nations', 'Six Nations'), ('270559', 'rugbyunion_top_14', 'Top 14 (si proposé par l\'API)'),
    ('nba', 'basketball_nba', 'NBA'), ('nfl', 'americanfootball_nfl', 'NFL'), ('nhl', 'icehockey_nhl', 'NHL'), ('mlb', 'baseball_mlb', 'MLB'),
    ('ufc', 'mma_mixed_martial_arts', 'MMA'),
]

# ---------- Accueil (minimal : la personnalisation fine viendra dans l'appli, phase 2) ----------
WIDGETS = [  # (id, nom, actif aujourd'hui, note)
    ('meteo', 'Horloge et météo', True, ''), ('une', 'À la une (actus)', True, ''), ('invest', 'Investissements', True, 'glisser pour jour / mois / année'),
    ('spotify', 'Spotify', True, 'demande un compte Spotify'), ('sport', 'Bandeau Sports', True, 'sur iPhone'), ('live', 'Tuile LIVE Sports', True, 'sur ordinateur'),
]
MODULES_PAGES = [  # pages de l'appli
    ('actus', 'Actus', True), ('sport', 'Sport', True), ('videos', 'Vidéos', True), ('invest', 'Investissements', True),
    ('cachee', 'Coffre (page cachée)', True), ('etat', 'État des données', True),
]
VILLES_PLUS = [('Paris', 'Île-de-France', 48.8566, 2.3522), ('Montpellier', 'Hérault', 43.6108, 3.8767), ('Carcassonne', 'Aude', 43.2130, 2.3491),
               ('Rodez', 'Aveyron', 44.3506, 2.5750), ('Lavaur', 'Tarn', 43.6990, 1.8190), ('Gaillac', 'Tarn', 43.9016, 1.8970)]

# ---------- Applis : identifiant Android (package) par nom d'appli — préparation du multi-plateforme ----------
# Le lien Android ouvre l'appli si elle est installée, sinon sa page Google Play. Vide = à compléter (pas d'équivalent sûr).
ANDROID = {
    'Trade Republic': 'de.traderepublic.app', 'BoursoBank': 'com.boursorama.android.clients', 'Cyberplus': 'fr.banquepopulaire.cyberplus',
    'Canal+': 'com.canal.android.canal', 'Prime Video': 'com.amazon.avod.thirdpartyclient',
    'Chess': 'com.chess', 'Brawl Stars': 'com.supercell.brawlstars',
    'Outlook': 'com.microsoft.office.outlook', 'Teams': 'com.microsoft.teams', 'Word': 'com.microsoft.office.word',
    'PowerPoint': 'com.microsoft.office.powerpoint', 'OneNote': 'com.microsoft.office.onenote', 'Power BI': 'com.microsoft.powerbim',
    'SAP Concur': 'com.concur.breeze', 'Fichiers': 'com.google.android.apps.nbu.files', 'Proton Drive': 'me.proton.android.drive',
    'Portail Entreprise': 'com.microsoft.windowsintune.companyportal', 'Authenticator': 'com.azure.authenticator', 'LinkedIn': 'com.linkedin.android',
    'Claude': 'com.anthropic.claude', 'WhatsApp': 'com.whatsapp', 'Messenger': 'com.facebook.orca', 'X': 'com.twitter.android',
    'Proton VPN': 'ch.protonvpn.android', 'Bitwarden': 'com.x8bit.bitwarden', 'Cartes': 'com.google.android.apps.walletnfcrel',
    'Waze': 'com.waze', 'Google Maps': 'com.google.android.apps.maps',
}
NOTE_ANDROID = {'Fichiers': 'équivalent Android : Files by Google', 'Cartes': 'équivalent Android : Google Wallet',
                'Plans': "pas d'Apple Plans sur Android : Google Maps prend le relais", 'Swile': 'identifiant Android à compléter',
                'Esalia': 'identifiant Android à compléter', 'VideoLite': 'appli iPhone uniquement ?', 'SmartersPlayerLite': 'identifiant Android à compléter',
                'Songs of Conquest': 'version mobile à vérifier'}
def lien_android(pkg):
    from urllib.parse import quote
    return f"intent://#Intent;package={pkg};S.browser_fallback_url={quote('https://play.google.com/store/apps/details?id=' + pkg, safe='')};end" if pkg else ''

# ---------- Cotes : réglages du rapport des écarts ----------
RAPPORT_SEUILS = [(0.03, '3 %'), (0.05, '5 %'), (0.08, '8 %'), (0.10, '10 %')]
RAPPORT_REFS = [('moyenne', 'Moyenne des autres sites', 'la cote du site comparée à la moyenne des autres'),
                ('mediane', 'Médiane des autres sites', 'moins sensible à un autre site lui-même décalé')]
