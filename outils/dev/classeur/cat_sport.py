# mon-ecran-version: ba49375d
# Catalogue Sport : compétitions en plus de celles du dock actuel.
# Clés ESPN (site.api.espn.com/apis/site/v2/sports/<sport>/<clé>/scoreboard) ; « verif » = à confirmer par la tâche.
# support : 'ok' = l'appli sait déjà afficher ce sport · 'dev' = données récupérables, affichage à développer · 'non' = pas de source gratuite fiable

REGIONS_NOUVELLES = [
    ('eur',    'Europe · autres championnats'),
    ('am',     'Amériques'),
    ('monde',  'Asie · Afrique · Océanie'),
    ('ffem',   'Football féminin'),
    ('rmonde', 'Rugby · Hémisphère sud'),
    ('ind',    'Sports individuels'),
    ('autres', 'Non disponibles pour l\'instant'),
]

# (id, region, drapeau, sport, groupe, nom, diffuseur FR connu, support, note)
F = '🇫🇷'; E = '🏴\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F'; S = '🏴\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F'
LIGUES_NOUVELLES = [
    # France
    ('fra.3', 'fr', F, 'soccer', 'foot', 'National', '', 'ok', ''),
    # Europe (coupes) — tours préliminaires
    ('uefa.champions_qual', 'ec', '🇪🇺', 'soccer', 'foot', 'Ligue des champions · qualifications', '', 'ok', ''),
    ('uefa.europa_qual', 'ec', '🇪🇺', 'soccer', 'foot', 'Ligue Europa · qualifications', '', 'ok', ''),
    ('uefa.europa.conf_qual', 'ec', '🇪🇺', 'soccer', 'foot', 'Ligue Conférence · qualifications', '', 'ok', ''),
    ('uefa.youth_league', 'ec', '🇪🇺', 'soccer', 'foot', 'UEFA Youth League', '', 'ok', ''),
    # International
    ('fifa.worldq.conmebol', 'intl', '🌍', 'soccer', 'foot', 'Qualifications Coupe du monde · Amérique du Sud', '', 'ok', ''),
    ('fifa.worldq.concacaf', 'intl', '🌍', 'soccer', 'foot', 'Qualifications Coupe du monde · Amérique du Nord', '', 'ok', ''),
    ('fifa.worldq.caf', 'intl', '🌍', 'soccer', 'foot', 'Qualifications Coupe du monde · Afrique', '', 'ok', ''),
    ('fifa.worldq.afc', 'intl', '🌍', 'soccer', 'foot', 'Qualifications Coupe du monde · Asie', '', 'ok', ''),
    ('uefa.euro_u21', 'intl', '🇪🇺', 'soccer', 'foot', 'Euro Espoirs (U21)', '', 'ok', ''),
    ('caf.nations', 'intl', '🌍', 'soccer', 'foot', 'Coupe d\'Afrique des nations', '', 'ok', ''),
    ('conmebol.america', 'intl', '🌎', 'soccer', 'foot', 'Copa América', '', 'ok', ''),
    ('concacaf.gold', 'intl', '🌎', 'soccer', 'foot', 'Gold Cup', '', 'ok', ''),
    ('afc.asian.cup', 'intl', '🌏', 'soccer', 'foot', 'Coupe d\'Asie des nations', '', 'ok', ''),
    # Angleterre
    ('eng.3', 'en', E, 'soccer', 'foot', 'League One', '', 'ok', ''),
    ('eng.4', 'en', E, 'soccer', 'foot', 'League Two', '', 'ok', ''),
    ('eng.5', 'en', E, 'soccer', 'foot', 'National League', '', 'ok', ''),
    ('eng.trophy', 'en', E, 'soccer', 'foot', 'EFL Trophy', '', 'ok', ''),
    # Espagne · Italie · Allemagne
    ('esp.2', 'big', '🇪🇸', 'soccer', 'foot', 'Liga 2', '', 'ok', ''),
    ('ita.2', 'big', '🇮🇹', 'soccer', 'foot', 'Serie B', '', 'ok', ''),
    ('ger.2', 'big', '🇩🇪', 'soccer', 'foot', '2. Bundesliga', '', 'ok', ''),
    ('ger.3', 'big', '🇩🇪', 'soccer', 'foot', '3. Liga', '', 'ok', ''),
    # Europe · autres championnats
    ('sco.1', 'eur', S, 'soccer', 'foot', 'Écosse · Premiership', '', 'ok', ''),
    ('sco.2', 'eur', S, 'soccer', 'foot', 'Écosse · Championship', '', 'ok', ''),
    ('sco.tennents', 'eur', S, 'soccer', 'foot', 'Écosse · Coupe d\'Écosse', '', 'ok', ''),
    ('sco.cis', 'eur', S, 'soccer', 'foot', 'Écosse · Coupe de la Ligue', '', 'ok', ''),
    ('ned.1', 'eur', '🇳🇱', 'soccer', 'foot', 'Pays-Bas · Eredivisie', '', 'ok', ''),
    ('ned.2', 'eur', '🇳🇱', 'soccer', 'foot', 'Pays-Bas · Eerste Divisie', '', 'ok', ''),
    ('ned.cup', 'eur', '🇳🇱', 'soccer', 'foot', 'Pays-Bas · Coupe (KNVB Beker)', '', 'ok', ''),
    ('por.1', 'eur', '🇵🇹', 'soccer', 'foot', 'Portugal · Liga Portugal', '', 'ok', ''),
    ('por.taca.portugal', 'eur', '🇵🇹', 'soccer', 'foot', 'Portugal · Coupe du Portugal', '', 'ok', ''),
    ('bel.1', 'eur', '🇧🇪', 'soccer', 'foot', 'Belgique · Pro League', '', 'ok', ''),
    ('sui.1', 'eur', '🇨🇭', 'soccer', 'foot', 'Suisse · Super League', '', 'ok', ''),
    ('aut.1', 'eur', '🇦🇹', 'soccer', 'foot', 'Autriche · Bundesliga', '', 'ok', ''),
    ('tur.1', 'eur', '🇹🇷', 'soccer', 'foot', 'Turquie · Süper Lig', '', 'ok', ''),
    ('gre.1', 'eur', '🇬🇷', 'soccer', 'foot', 'Grèce · Super League', '', 'ok', ''),
    ('den.1', 'eur', '🇩🇰', 'soccer', 'foot', 'Danemark · Superliga', '', 'ok', ''),
    ('nor.1', 'eur', '🇳🇴', 'soccer', 'foot', 'Norvège · Eliteserien', '', 'ok', ''),
    ('swe.1', 'eur', '🇸🇪', 'soccer', 'foot', 'Suède · Allsvenskan', '', 'ok', ''),
    ('irl.1', 'eur', '🇮🇪', 'soccer', 'foot', 'Irlande · Premier Division', '', 'ok', ''),
    ('rus.1', 'eur', '🇷🇺', 'soccer', 'foot', 'Russie · Premier League', '', 'ok', ''),
    # Amériques
    ('usa.1', 'am', '🇺🇸', 'soccer', 'foot', 'MLS', 'Apple TV', 'ok', ''),
    ('usa.open', 'am', '🇺🇸', 'soccer', 'foot', 'US Open Cup', '', 'ok', ''),
    ('concacaf.champions', 'am', '🌎', 'soccer', 'foot', 'Coupe des champions CONCACAF', '', 'ok', ''),
    ('mex.1', 'am', '🇲🇽', 'soccer', 'foot', 'Mexique · Liga MX', '', 'ok', ''),
    ('bra.1', 'am', '🇧🇷', 'soccer', 'foot', 'Brésil · Série A', '', 'ok', ''),
    ('bra.2', 'am', '🇧🇷', 'soccer', 'foot', 'Brésil · Série B', '', 'ok', ''),
    ('arg.1', 'am', '🇦🇷', 'soccer', 'foot', 'Argentine · Liga Profesional', '', 'ok', ''),
    ('col.1', 'am', '🇨🇴', 'soccer', 'foot', 'Colombie · Primera A', '', 'ok', ''),
    ('chi.1', 'am', '🇨🇱', 'soccer', 'foot', 'Chili · Primera División', '', 'ok', ''),
    ('conmebol.libertadores', 'am', '🌎', 'soccer', 'foot', 'Copa Libertadores', '', 'ok', ''),
    ('conmebol.sudamericana', 'am', '🌎', 'soccer', 'foot', 'Copa Sudamericana', '', 'ok', ''),
    # Asie · Afrique · Océanie
    ('ksa.1', 'monde', '🇸🇦', 'soccer', 'foot', 'Arabie saoudite · Saudi Pro League', '', 'ok', ''),
    ('jpn.1', 'monde', '🇯🇵', 'soccer', 'foot', 'Japon · J1 League', '', 'ok', ''),
    ('chn.1', 'monde', '🇨🇳', 'soccer', 'foot', 'Chine · Super League', '', 'ok', ''),
    ('aus.1', 'monde', '🇦🇺', 'soccer', 'foot', 'Australie · A-League', '', 'ok', ''),
    ('ind.1', 'monde', '🇮🇳', 'soccer', 'foot', 'Inde · Indian Super League', '', 'ok', ''),
    ('rsa.1', 'monde', '🇿🇦', 'soccer', 'foot', 'Afrique du Sud · Premiership', '', 'ok', ''),
    ('afc.champions', 'monde', '🌏', 'soccer', 'foot', 'Ligue des champions d\'Asie', '', 'ok', ''),
    ('caf.champions', 'monde', '🌍', 'soccer', 'foot', 'Ligue des champions africaine', '', 'ok', ''),
    # Football féminin
    ('fra.w.1', 'ffem', F, 'soccer', 'foot', 'Première Ligue (D1 féminine)', '', 'ok', ''),
    ('eng.w.1', 'ffem', E, 'soccer', 'foot', 'Women\'s Super League', '', 'ok', ''),
    ('esp.w.1', 'ffem', '🇪🇸', 'soccer', 'foot', 'Liga F', '', 'ok', ''),
    ('ger.w.1', 'ffem', '🇩🇪', 'soccer', 'foot', 'Frauen-Bundesliga', '', 'ok', ''),
    ('usa.nwsl', 'ffem', '🇺🇸', 'soccer', 'foot', 'NWSL', '', 'ok', ''),
    ('uefa.wchampions', 'ffem', '🇪🇺', 'soccer', 'foot', 'Ligue des champions féminine', '', 'ok', ''),
    ('fifa.wwc', 'ffem', '🌍', 'soccer', 'foot', 'Coupe du monde féminine', '', 'ok', ''),
    ('uefa.weuro', 'ffem', '🇪🇺', 'soccer', 'foot', 'Euro féminin', '', 'ok', ''),
    # Rugby
    ('prod2', 'rfr', F, 'rugby', 'rugby', 'Pro D2', '', 'dev', 'Absent d\'ESPN : passerait par TheSportsDB'),
    ('272073', 'reu', '🇪🇺', 'rugby', 'rugby', 'Challenge Cup', '', 'ok', ''),
    ('267979', 'reu', E, 'rugby', 'rugby', 'Premiership (Angleterre)', '', 'ok', ''),
    ('270557', 'reu', '🇪🇺', 'rugby', 'rugby', 'United Rugby Championship', '', 'ok', ''),
    ('six-nations-f', 'rintl', '🇪🇺', 'rugby', 'rugby', 'Six Nations féminin', '', 'dev', 'Clé ESPN à trouver'),
    ('242041', 'rmonde', '🌏', 'rugby', 'rugby', 'Super Rugby Pacific', '', 'ok', ''),
    ('244293', 'rmonde', '🌏', 'rugby', 'rugby', 'Rugby Championship', '', 'ok', ''),
    # Sports US
    ('wnba', 'us', '🇺🇸', 'basketball', 'basket', 'WNBA', '', 'ok', ''),
    ('mens-college-basketball', 'us', '🇺🇸', 'basketball', 'basket', 'Basket universitaire (NCAA)', '', 'ok', ''),
    ('womens-college-basketball', 'us', '🇺🇸', 'basketball', 'basket', 'Basket universitaire féminin (NCAA)', '', 'ok', ''),
    ('college-football', 'us', '🇺🇸', 'football', 'nfl', 'Football américain universitaire (NCAA)', '', 'ok', ''),
    ('mlb', 'us', '🇺🇸', 'baseball', 'baseball', 'MLB (baseball)', '', 'dev', 'Fiche de match baseball à développer'),
    # Sports mécaniques
    ('irl', 'moto', '🏁', 'racing', 'indycar', 'IndyCar', '', 'dev', 'Calendrier et résultats via ESPN'),
    ('nascar-premier', 'moto', '🏁', 'racing', 'nascar', 'NASCAR Cup Series', '', 'dev', 'Calendrier et résultats via ESPN'),
    # Sports individuels
    ('atp', 'ind', '🎾', 'tennis', 'tennis', 'Tennis · ATP', '', 'dev', 'Tableaux par tournoi : affichage à développer'),
    ('wta', 'ind', '🎾', 'tennis', 'tennis', 'Tennis · WTA', '', 'dev', 'Tableaux par tournoi : affichage à développer'),
    ('pga', 'ind', '⛳', 'golf', 'golf', 'Golf · PGA Tour', '', 'dev', 'Classements de tournoi : affichage à développer'),
    ('eur', 'ind', '⛳', 'golf', 'golf', 'Golf · DP World Tour', '', 'dev', ''),
    ('lpga', 'ind', '⛳', 'golf', 'golf', 'Golf · LPGA', '', 'dev', ''),
    ('ufc', 'ind', '🥊', 'mma', 'mma', 'MMA · UFC', '', 'dev', 'Cartes de combats : affichage à développer'),
    # Non disponibles (pas de source gratuite et fiable connue à ce jour)
    ('handball', 'autres', '🤾', 'handball', 'autres', 'Handball (Starligue, Ligue des champions)', '', 'non', 'Pas de source gratuite fiable'),
    ('cyclisme', 'autres', '🚴', 'cycling', 'autres', 'Cyclisme (Tour de France, classiques)', '', 'non', 'Pas de source gratuite fiable'),
    ('basket-europe', 'autres', '🏀', 'basketball', 'autres', 'Basket européen (Betclic Élite, EuroLeague)', '', 'non', 'Pas de source gratuite fiable'),
    ('biathlon', 'autres', '🎿', 'winter', 'autres', 'Biathlon et ski', '', 'non', 'Pas de source gratuite fiable'),
    ('volley', 'autres', '🏐', 'volleyball', 'autres', 'Volley-ball', '', 'non', 'Pas de source gratuite fiable'),
    ('athletisme', 'autres', '🏃', 'athletics', 'autres', 'Athlétisme', '', 'non', 'Pas de source gratuite fiable'),
    ('xiii', 'autres', '🏉', 'rugby-league', 'autres', 'Rugby à XIII (Super League, Dragons Catalans)', '', 'non', 'Pas de source gratuite fiable'),
]

# Équipes proposées en plus des favorites actuelles (exemples, toutes modifiables)
EQUIPES_PROPOSEES = [
    ('Foot · France', ['Paris SG', 'Lyon', 'Lens', 'Lille', 'Monaco', 'Nice', 'Rennes', 'Nantes', 'Strasbourg', 'Montpellier', 'Saint-Étienne', 'Bordeaux']),
    ('Foot · Europe', ['Real Madrid', 'FC Barcelone', 'Bayern Munich', 'Manchester City', 'Manchester United', 'Chelsea', 'Juventus', 'Inter Milan', 'AC Milan']),
    ('Rugby', ['Stade Rochelais', 'Union Bordeaux-Bègles', 'Racing 92', 'Stade Français', 'Montpellier Hérault Rugby', 'Clermont', 'Toulon', 'Section Paloise', 'Bayonne', 'Perpignan', 'Colomiers', 'Béziers', 'Carcassonne']),
    ('Sélections', ['France', 'XV de France']),
    ('US', ['Celtics', 'Warriors', 'Spurs', 'Chiefs', 'Eagles', 'Canadiens', 'Yankees']),
]
