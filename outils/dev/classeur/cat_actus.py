# mon-ecran-version: 63822f0f
# Catalogue Actus : rubriques et médias en plus de ceux du dock actuel.
# url = flux RSS supposé ; site = page d'accueil (la tâche y cherche le bon flux si l'adresse ne répond pas) ;
# alt = secours Google Actualités limité au site. Tout ce qui est nouveau est « à vérifier » par la tâche.
from urllib.parse import quote

def G(q, lang='fr'):
    hl = 'hl=fr&gl=FR&ceid=FR:fr' if lang == 'fr' else 'hl=en-US&gl=US&ceid=US:en'
    return f'https://news.google.com/rss/search?q={quote(q, safe=":/+")}&{hl}'

def f(name, color, url, site=None, alt=None, lang='fr'):
    d = {'name': name, 'color': color, 'url': url}
    if site: d['site'] = site
    dom = (site or url).split('/')[2].replace('www.', '')
    d['alt'] = alt if alt is not None else [G('site:' + dom, lang)]
    if not d['alt']: del d['alt']
    return d

def g(name, color, query, lang='fr'):          # flux thématique Google Actualités (mot-clé)
    return {'name': name, 'color': color, 'url': G(query, lang), 'google': True}

LM = '#2b2b2b'; FI = '#f2b705'
# ---------- Français : nouvelles rubriques (id, libellé) ----------
SECTIONS_FR = [
    ('sciences', 'Sciences'), ('espace', 'Astronomie et espace'), ('jeux', 'Jeux vidéo'), ('defense', 'Défense et conflits'),
    ('ia', 'Intelligence artificielle'), ('planete', 'Environnement et climat'), ('sante', 'Santé'), ('culture', 'Culture'),
    ('cine', 'Cinéma et séries'), ('musique', 'Musique'), ('auto', 'Auto et moto'), ('verif', 'Vérification des faits'),
    ('histoire', 'Histoire'), ('conso', 'Consommation et argent'), ('emploi', 'Travail et emploi'), ('regions', 'Régions (France 3)'),
    ('occitanie', 'Occitanie (départements)'),
]
# Médias en plus, par rubrique (les rubriques existantes : une, france, monde, eco, sport, tech, local, marches)
FEEDS_FR = {
    'une': [
        f('Ouest-France', '#e2001a', 'https://www.ouest-france.fr/rss/une', 'https://www.ouest-france.fr/'),
        f('Le Parisien', '#1a4c8b', 'https://feeds.leparisien.fr/leparisien/rss', 'https://www.leparisien.fr/'),
        f('Le Point', '#c8102e', 'https://www.lepoint.fr/rss.xml', 'https://www.lepoint.fr/'),
        f("L'Express", '#e2001a', 'https://www.lexpress.fr/arc/outboundfeeds/rss/alaune.xml', 'https://www.lexpress.fr/'),
        f('La Croix', '#1f3f75', 'https://www.la-croix.com/RSS/UNIVERS', 'https://www.la-croix.com/'),
        f('HuffPost', '#0dbe98', 'https://www.huffingtonpost.fr/feeds/index.xml', 'https://www.huffingtonpost.fr/'),
        f('BFMTV', '#0a2c5a', 'https://www.bfmtv.com/rss/news-24-7/', 'https://www.bfmtv.com/'),
        f('TF1 Info', '#0067b1', 'https://www.tf1info.fr/feeds/rss-une.xml', 'https://www.tf1info.fr/'),
        f('France 24', '#00a3e0', 'https://www.france24.com/fr/rss', 'https://www.france24.com/fr/'),
        f('RFI', '#e5004d', 'https://www.rfi.fr/fr/rss', 'https://www.rfi.fr/fr/'),
        f('Mediapart', '#e5004c', 'https://www.mediapart.fr/articles/feed', 'https://www.mediapart.fr/'),
        f("L'Humanité", '#d30000', 'https://www.humanite.fr/feed', 'https://www.humanite.fr/'),
        f('Le JDD', '#d6001c', 'https://www.lejdd.fr/rss.xml', 'https://www.lejdd.fr/'),
        f('Europe 1', '#e30613', 'https://www.europe1.fr/rss.xml', 'https://www.europe1.fr/'),
    ],
    'france': [
        f('Public Sénat', '#c8102e', 'https://www.publicsenat.fr/rss.xml', 'https://www.publicsenat.fr/'),
        f('LCP', '#003c71', 'https://lcp.fr/rss.xml', 'https://lcp.fr/'),
        f('France Info · Politique', FI, 'https://www.francetvinfo.fr/politique.rss'),
        f('Vie-publique.fr', '#000091', 'https://www.vie-publique.fr/actualites.xml', 'https://www.vie-publique.fr/'),
    ],
    'monde': [
        f('France 24 · Monde', '#00a3e0', 'https://www.france24.com/fr/monde/rss', 'https://www.france24.com/fr/'),
        f('RFI · Monde', '#e5004d', 'https://www.rfi.fr/fr/monde/rss', 'https://www.rfi.fr/fr/'),
        f('Le Grand Continent', '#111111', 'https://legrandcontinent.eu/fr/feed/', 'https://legrandcontinent.eu/fr/'),
        f('Le Monde diplomatique', '#5a0f0f', 'https://www.monde-diplomatique.fr/rss/', 'https://www.monde-diplomatique.fr/'),
        f('TV5Monde Info', '#2a2a7a', 'https://information.tv5monde.com/rss.xml', 'https://information.tv5monde.com/'),
    ],
    'eco': [
        f('Capital', '#e2001a', 'https://www.capital.fr/rss', 'https://www.capital.fr/'),
        f('Challenges', '#c8102e', 'https://www.challenges.fr/rss.xml', 'https://www.challenges.fr/'),
        f('BFM Business', '#0a2c5a', 'https://www.bfmtv.com/rss/economie/', 'https://www.bfmtv.com/economie/'),
        f('Alternatives Économiques', '#e94e1b', 'https://www.alternatives-economiques.fr/rss.xml', 'https://www.alternatives-economiques.fr/'),
        f('Le Figaro Économie', '#163860', 'https://www.lefigaro.fr/rss/figaro_economie.xml'),
        f('Insee', '#ab1f33', 'https://www.insee.fr/fr/flux/1', 'https://www.insee.fr/fr/accueil'),
    ],
    'sport': [
        f("L'Équipe Football", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Football/', None, []),
        f("L'Équipe Tennis", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Tennis/', None, []),
        f("L'Équipe Cyclisme", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Cyclisme/', None, []),
        f("L'Équipe Basket", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Basket/', None, []),
        f("L'Équipe Formule 1", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Formule-1/', None, []),
        f("L'Équipe Handball", '#e30613', 'https://dwh.lequipe.fr/api/edito/rss?path=/Handball/', None, []),
        f('Eurosport', '#141b4d', 'https://www.eurosport.fr/rss.xml', 'https://www.eurosport.fr/'),
        f('So Foot', '#111111', 'https://www.sofoot.com/rss.xml', 'https://www.sofoot.com/'),
        f('Foot Mercato', '#0e9f6e', 'https://www.footmercato.net/flux-rss', 'https://www.footmercato.net/'),
        f('Rugbyrama', '#0b6e4f', 'https://www.rugbyrama.fr/rss.xml', 'https://www.rugbyrama.fr/'),
        f('Midi Olympique', '#c8102e', 'https://www.midi-olympique.fr/rss', 'https://www.midi-olympique.fr/'),
        f('Le Rugbynistère', '#1d5c2e', 'https://www.lerugbynistere.fr/feed', 'https://www.lerugbynistere.fr/'),
    ],
    'tech': [
        f('Next', '#ff5a1f', 'https://next.ink/feed/', 'https://next.ink/'),
        f('Clubic', '#0057b8', 'https://www.clubic.com/feed/news.rss', 'https://www.clubic.com/'),
        f('Korben', '#1e1e1e', 'https://korben.info/feed', 'https://korben.info/'),
        f('Journal du Geek', '#e5004d', 'https://www.journaldugeek.com/feed/', 'https://www.journaldugeek.com/'),
        f('Presse-citron', '#f5a300', 'https://www.presse-citron.net/feed/', 'https://www.presse-citron.net/'),
        f('iGeneration (Apple)', '#3b82f6', 'https://www.igen.fr/rss.xml', 'https://www.igen.fr/'),
        f('MacGeneration', '#4c4c4c', 'https://www.macg.co/rss.xml', 'https://www.macg.co/'),
        f('ZDNet France', '#d41f2b', 'https://www.zdnet.fr/feeds/rss/', 'https://www.zdnet.fr/'),
        f('Le Monde Informatique', '#00539f', 'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml', 'https://www.lemondeinformatique.fr/'),
        f('Le Monde Pixels', LM, 'https://www.lemonde.fr/pixels/rss_full.xml'),
        f('Siècle Digital', '#7c3aed', 'https://siecledigital.fr/feed/', 'https://siecledigital.fr/'),
    ],
    'local': [
        f('La Dépêche Toulouse', '#d4021d', 'https://www.ladepeche.fr/communes/toulouse,31555/rss.xml', 'https://www.ladepeche.fr/communes/toulouse,31555.html', [G('site:ladepeche.fr Toulouse')]),
        f('Actu Toulouse', '#ff3d00', 'https://actu.fr/occitanie/toulouse_31555/rss.xml', 'https://actu.fr/toulouse/'),
        f('Mazamet / Castres (Google)', '#6b7280', G('Mazamet OR Castres'), None, []),
        f('Albi (Google)', '#6b7280', G('Albi Tarn'), None, []),
    ],
    'marches': [
        f('Boursier.com', '#0b4f8a', 'https://www.boursier.com/rss.xml', 'https://www.boursier.com/'),
        f('Le Revenu', '#0a6b3d', 'https://www.lerevenu.com/rss.xml', 'https://www.lerevenu.com/'),
        f('Banque de France', '#002654', 'https://www.banque-france.fr/fr/rss.xml', 'https://www.banque-france.fr/fr'),
        f('BCE (communiqués)', '#003299', 'https://www.ecb.europa.eu/rss/press.html', 'https://www.ecb.europa.eu/', []),
    ],
    'sciences': [
        f('Le Monde Sciences', LM, 'https://www.lemonde.fr/sciences/rss_full.xml'),
        f('France Info Sciences', FI, 'https://www.francetvinfo.fr/sciences.rss'),
        f('Futura', '#0aa0d6', 'https://www.futura-sciences.com/rss/actualites.xml', 'https://www.futura-sciences.com/'),
        f('Sciences et Avenir', '#e2001a', 'https://www.sciencesetavenir.fr/rss.xml', 'https://www.sciencesetavenir.fr/'),
        f('Science & Vie', '#d6001c', 'https://www.science-et-vie.com/feed', 'https://www.science-et-vie.com/'),
        f('Pour la Science', '#0067a5', 'https://www.pourlascience.fr/rss.xml', 'https://www.pourlascience.fr/'),
        f('CNRS Le journal', '#1b3a6b', 'https://lejournal.cnrs.fr/rss', 'https://lejournal.cnrs.fr/'),
        f('The Conversation France', '#d8352a', 'https://theconversation.com/fr/articles.atom', 'https://theconversation.com/fr'),
        f('Numerama Sciences', '#e4007c', 'https://www.numerama.com/sciences/feed/'),
    ],
    'espace': [
        f('Ciel & Espace', '#0b1e3f', 'https://www.cieletespace.fr/rss', 'https://www.cieletespace.fr/'),
        f('Futura Espace', '#0aa0d6', 'https://www.futura-sciences.com/rss/espace/actualites.xml', 'https://www.futura-sciences.com/sciences/espace/'),
        f('Sciences et Avenir Espace', '#e2001a', 'https://www.sciencesetavenir.fr/espace/rss.xml', 'https://www.sciencesetavenir.fr/espace/'),
        f('Le Monde Espace', LM, 'https://www.lemonde.fr/espace/rss_full.xml'),
        f('CNES', '#003b71', 'https://cnes.fr/fr/rss.xml', 'https://cnes.fr/'),
        f('ESA (français)', '#003247', 'https://www.esa.int/rssfeed/France', 'https://www.esa.int/Space_in_Member_States/France'),
        f('Astronomie (Google)', '#6b7280', G('astronomie OR astrophysique OR télescope'), None, []),
    ],
    'jeux': [
        f('Gamekult', '#e30613', 'https://www.gamekult.com/feed.xml', 'https://www.gamekult.com/'),
        f('Jeuxvideo.com', '#f26a1b', 'https://www.jeuxvideo.com/rss/rss.xml', 'https://www.jeuxvideo.com/'),
        f('Gameblog', '#ff4b2b', 'https://www.gameblog.fr/rss.php', 'https://www.gameblog.fr/'),
        f('IGN France', '#bf1313', 'https://fr.ign.com/feed.xml', 'https://fr.ign.com/'),
        f('ActuGaming', '#2563eb', 'https://www.actugaming.net/feed/', 'https://www.actugaming.net/'),
        f('Millenium', '#0f172a', 'https://www.millenium.org/rss', 'https://www.millenium.org/'),
        f('Gamergen', '#e11d48', 'https://gamergen.com/rss', 'https://gamergen.com/'),
        f('Numerama Jeux vidéo', '#e4007c', 'https://www.numerama.com/tech/jeux-video/feed/'),
    ],
    'defense': [
        f('Opex360 (Zone militaire)', '#4b5320', 'https://www.opex360.com/feed/', 'https://www.opex360.com/'),
        f('Meta-Defense', '#1f2937', 'https://meta-defense.fr/feed/', 'https://meta-defense.fr/'),
        f('IRIS', '#0d4c92', 'https://www.iris-france.org/feed/', 'https://www.iris-france.org/'),
        f('Le Monde International', LM, 'https://www.lemonde.fr/international/rss_full.xml'),
        f('France 24 · Moyen-Orient', '#00a3e0', 'https://www.france24.com/fr/moyen-orient/rss', 'https://www.france24.com/fr/'),
        f('Guerre en Ukraine (Google)', '#6b7280', G('guerre Ukraine'), None, []),
        f('Conflits au Proche-Orient (Google)', '#6b7280', G('Gaza OR Israël OR Liban OR Iran conflit'), None, []),
        f('Ministère des Armées', '#000091', 'https://www.defense.gouv.fr/rss.xml', 'https://www.defense.gouv.fr/'),
    ],
    'ia': [
        f('ActuIA', '#6d28d9', 'https://www.actuia.com/feed/', 'https://www.actuia.com/'),
        f('Numerama IA', '#e4007c', 'https://www.numerama.com/tech/intelligence-artificielle/feed/'),
        f('Le Monde IA (Google)', '#6b7280', G('intelligence artificielle site:lemonde.fr'), None, []),
        f('Intelligence artificielle (Google)', '#6b7280', G('"intelligence artificielle"'), None, []),
    ],
    'planete': [
        f('Le Monde Planète', LM, 'https://www.lemonde.fr/planete/rss_full.xml'),
        f('Reporterre', '#2f7d32', 'https://reporterre.net/spip.php?page=backend', 'https://reporterre.net/'),
        f('Vert', '#16a34a', 'https://vert.eco/feed', 'https://vert.eco/'),
        f('Bon Pote', '#0f766e', 'https://bonpote.com/feed/', 'https://bonpote.com/'),
        f('Novethic', '#1e7f5c', 'https://www.novethic.fr/rss.xml', 'https://www.novethic.fr/'),
        f('France Info Environnement', FI, 'https://www.francetvinfo.fr/monde/environnement.rss'),
        f('Météo-France (actualités)', '#0072bb', 'https://meteofrance.com/rss', 'https://meteofrance.com/actualites'),
    ],
    'sante': [
        f('Le Monde Santé', LM, 'https://www.lemonde.fr/sante/rss_full.xml'),
        f('France Info Santé', FI, 'https://www.francetvinfo.fr/sante.rss'),
        f('Inserm', '#ab1f33', 'https://www.inserm.fr/feed/', 'https://www.inserm.fr/'),
        f('Pourquoi Docteur', '#0ea5e9', 'https://www.pourquoidocteur.fr/rss.xml', 'https://www.pourquoidocteur.fr/'),
        f('Santé publique France', '#003c71', 'https://www.santepubliquefrance.fr/rss/actualites', 'https://www.santepubliquefrance.fr/'),
    ],
    'culture': [
        f('Le Monde Culture', LM, 'https://www.lemonde.fr/culture/rss_full.xml'),
        f('France Info Culture', FI, 'https://www.francetvinfo.fr/culture.rss'),
        f('Télérama', '#e30613', 'https://www.telerama.fr/rss/une.xml', 'https://www.telerama.fr/'),
        f('Les Inrocks', '#111111', 'https://www.lesinrocks.com/feed/', 'https://www.lesinrocks.com/'),
        f('Konbini', '#ffcc00', 'https://www.konbini.com/fr/feed/', 'https://www.konbini.com/fr/'),
        f('ActuaLitté (livres)', '#c2410c', 'https://actualitte.com/rss', 'https://actualitte.com/'),
    ],
    'cine': [
        f('AlloCiné', '#fecc00', 'https://www.allocine.fr/rss/news.xml', 'https://www.allocine.fr/'),
        f('Première', '#e30613', 'https://www.premiere.fr/rss/actu-live', 'https://www.premiere.fr/'),
        f('Écran Large', '#111111', 'https://www.ecranlarge.com/rss', 'https://www.ecranlarge.com/'),
        f('Le Monde Cinéma', LM, 'https://www.lemonde.fr/cinema/rss_full.xml'),
        f('Numerama Pop culture', '#e4007c', 'https://www.numerama.com/pop-culture/feed/'),
        f('Serieously (séries)', '#7c3aed', 'https://serieously.com/feed/', 'https://serieously.com/'),
    ],
    'musique': [
        f('Le Monde Musiques', LM, 'https://www.lemonde.fr/musiques/rss_full.xml'),
        f('Les Inrocks Musique', '#111111', 'https://www.lesinrocks.com/musique/feed/'),
        f('Rolling Stone France', '#d6001c', 'https://www.rollingstone.fr/feed/', 'https://www.rollingstone.fr/'),
        f('Abcdr du Son (rap)', '#222222', 'https://www.abcdrduson.com/feed/', 'https://www.abcdrduson.com/'),
    ],
    'auto': [
        f('Caradisiac', '#e30613', 'https://www.caradisiac.com/rss/', 'https://www.caradisiac.com/'),
        f('Auto Plus', '#0055a4', 'https://www.autoplus.fr/rss.xml', 'https://www.autoplus.fr/'),
        f("L'Automobile Magazine", '#111111', 'https://www.automobile-magazine.fr/rss', 'https://www.automobile-magazine.fr/'),
        f('Motorsport.com France', '#e10600', 'https://fr.motorsport.com/rss/all/news/', 'https://fr.motorsport.com/'),
        f('Moto Journal', '#f59e0b', 'https://www.moto-journal.fr/rss', 'https://www.moto-journal.fr/'),
        f('Automobile Propre (électrique)', '#16a34a', 'https://www.automobile-propre.com/feed/', 'https://www.automobile-propre.com/'),
    ],
    'verif': [
        f('Les Décodeurs (Le Monde)', LM, 'https://www.lemonde.fr/les-decodeurs/rss_full.xml'),
        f('AFP Factuel', '#003a70', 'https://factuel.afp.com/rss.xml', 'https://factuel.afp.com/'),
        f('Vrai ou fake (France Info)', FI, 'https://www.francetvinfo.fr/vrai-ou-fake.rss'),
        f('CheckNews (Libération)', '#e2001a', 'https://www.liberation.fr/arc/outboundfeeds/rss/category/checknews/?outputType=xml', 'https://www.liberation.fr/checknews/'),
    ],
    'histoire': [
        f('Historia', '#7c2d12', 'https://www.historia.fr/rss.xml', 'https://www.historia.fr/'),
        f('Geo Histoire', '#facc15', 'https://www.geo.fr/rss/histoire', 'https://www.geo.fr/histoire'),
        f('Retronews (BnF)', '#1f2937', 'https://www.retronews.fr/rss.xml', 'https://www.retronews.fr/'),
    ],
    'conso': [
        f('60 Millions de consommateurs', '#e30613', 'https://www.60millions-mag.com/rss.xml', 'https://www.60millions-mag.com/'),
        f('Que Choisir', '#e2001a', 'https://www.quechoisir.org/rss/actualites.xml', 'https://www.quechoisir.org/'),
        f('Service-public.fr (actualités)', '#000091', 'https://www.service-public.fr/abonnements/rss/actu-actu-particuliers.rss', 'https://www.service-public.fr/'),
        f('Le Monde Argent', LM, 'https://www.lemonde.fr/argent/rss_full.xml'),
    ],
    'emploi': [
        f('Welcome to the Jungle (Media)', '#ffcd00', 'https://www.welcometothejungle.com/fr/feed', 'https://www.welcometothejungle.com/fr/articles'),
        f('Le Monde Emploi', LM, 'https://www.lemonde.fr/emploi/rss_full.xml'),
        f('Cadremploi (actualités)', '#e30613', 'https://www.cadremploi.fr/editorial/rss', 'https://www.cadremploi.fr/editorial/'),
        f('Supply chain (Google)', '#6b7280', G('"supply chain" OR logistique industrie'), None, []),
    ],
    'regions': [f(f'France 3 {n}', '#1f5ba8', f'https://france3-regions.franceinfo.fr/{s}/rss', None, []) for s, n in [
        ('auvergne-rhone-alpes', 'Auvergne-Rhône-Alpes'), ('bourgogne-franche-comte', 'Bourgogne-Franche-Comté'), ('bretagne', 'Bretagne'),
        ('centre-val-de-loire', 'Centre-Val de Loire'), ('corse', 'Corse'), ('grand-est', 'Grand Est'), ('hauts-de-france', 'Hauts-de-France'),
        ('normandie', 'Normandie'), ('nouvelle-aquitaine', 'Nouvelle-Aquitaine'), ('paris-ile-de-france', 'Paris Île-de-France'),
        ('pays-de-la-loire', 'Pays de la Loire'), ('provence-alpes-cote-d-azur', "Provence-Alpes-Côte d'Azur")]],
    'occitanie': [f(f'La Dépêche {n}', '#d4021d', f'https://www.ladepeche.fr/{s}/rss.xml', f'https://www.ladepeche.fr/{s}/', [G(f'site:ladepeche.fr {n}')]) for s, n in [
        ('ariege', 'Ariège'), ('aude', 'Aude'), ('aveyron', 'Aveyron'), ('gers', 'Gers'), ('haute-garonne', 'Haute-Garonne'),
        ('hautes-pyrenees', 'Hautes-Pyrénées'), ('lot', 'Lot'), ('lot-et-garonne', 'Lot-et-Garonne'), ('tarn-et-garonne', 'Tarn-et-Garonne')]]
        + [f('Midi Libre', '#0072bc', 'https://www.midilibre.fr/rss.xml', 'https://www.midilibre.fr/'),
           f("L'Indépendant", '#e30613', 'https://www.lindependant.fr/rss.xml', 'https://www.lindependant.fr/'),
           f('Centre Presse Aveyron', '#c8102e', 'https://www.centrepresseaveyron.fr/rss.xml', 'https://www.centrepresseaveyron.fr/')],
}

# ---------- International (anglais) ----------
SECTIONS_EN = [
    ('sciences', 'Sciences'), ('espace', 'Astronomie et espace'), ('jeux', 'Jeux vidéo'), ('defense', 'Défense et conflits'),
    ('ia', 'Intelligence artificielle'), ('planete', 'Environnement et climat'), ('sante', 'Santé'), ('cine', 'Cinéma et séries'), ('musique', 'Musique'),
]
def e(name, color, url, site=None, alt=None): return f(name, color, url, site, alt, 'en')
FEEDS_EN = {
    'une': [
        e('NPR', '#2b2b2b', 'https://feeds.npr.org/1001/rss.xml', 'https://www.npr.org/'),
        e('Reuters (Google)', '#ff8000', G('site:reuters.com', 'en'), None, []),
        e('Associated Press (Google)', '#e2001a', G('site:apnews.com', 'en'), None, []),
        e('CNN', '#cc0000', 'http://rss.cnn.com/rss/edition.rss', 'https://edition.cnn.com/'),
        e('Washington Post', '#111111', 'https://feeds.washingtonpost.com/rss/world', 'https://www.washingtonpost.com/'),
        e('The Independent', '#e2001a', 'https://www.independent.co.uk/news/rss', 'https://www.independent.co.uk/'),
    ],
    'monde': [
        e('Deutsche Welle', '#0c4da2', 'https://rss.dw.com/rdf/rss-en-all', 'https://www.dw.com/en/'),
        e('Politico Europe', '#d6001c', 'https://www.politico.eu/feed/', 'https://www.politico.eu/'),
        e('Foreign Policy', '#111111', 'https://foreignpolicy.com/feed/', 'https://foreignpolicy.com/'),
        e('The Atlantic', '#111111', 'https://www.theatlantic.com/feed/all/', 'https://www.theatlantic.com/'),
    ],
    'eco': [
        e('CNBC', '#005594', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'https://www.cnbc.com/'),
        e('Bloomberg (Google)', '#111111', G('site:bloomberg.com', 'en'), None, []),
        e('MarketWatch', '#0a7a3b', 'https://feeds.content.dowjones.io/public/rss/mw_topstories', 'https://www.marketwatch.com/'),
    ],
    'sport': [
        e('ESPN', '#d00', 'https://www.espn.com/espn/rss/news', 'https://www.espn.com/'),
        e('BBC Sport · Football', '#e8b400', 'https://feeds.bbci.co.uk/sport/football/rss.xml'),
        e('BBC Sport · Rugby', '#e8b400', 'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml'),
        e('The Athletic (Google)', '#111111', G('site:nytimes.com/athletic', 'en'), None, []),
    ],
    'tech': [
        e('TechCrunch', '#0a9e01', 'https://techcrunch.com/feed/', 'https://techcrunch.com/'),
        e('Wired', '#111111', 'https://www.wired.com/feed/rss', 'https://www.wired.com/'),
        e('Engadget', '#7b2bf9', 'https://www.engadget.com/rss.xml', 'https://www.engadget.com/'),
        e('MIT Technology Review', '#111111', 'https://www.technologyreview.com/feed/', 'https://www.technologyreview.com/'),
        e('Hacker News', '#ff6600', 'https://hnrss.org/frontpage', 'https://news.ycombinator.com/', []),
        e('9to5Mac', '#1f6feb', 'https://9to5mac.com/feed/', 'https://9to5mac.com/'),
    ],
    'sciences': [
        e('Nature News', '#c00', 'https://www.nature.com/nature.rss', 'https://www.nature.com/'),
        e('New Scientist', '#d6001c', 'https://www.newscientist.com/feed/home/', 'https://www.newscientist.com/'),
        e('ScienceDaily', '#1f4e79', 'https://www.sciencedaily.com/rss/all.xml', 'https://www.sciencedaily.com/'),
        e('Quanta Magazine', '#111111', 'https://www.quantamagazine.org/feed/', 'https://www.quantamagazine.org/'),
        e('Ars Technica Science', '#ff4e00', 'https://feeds.arstechnica.com/arstechnica/science'),
    ],
    'espace': [
        e('NASA', '#0b3d91', 'https://www.nasa.gov/news-release/feed/', 'https://www.nasa.gov/'),
        e('Space.com', '#111111', 'https://www.space.com/feeds/all', 'https://www.space.com/'),
        e('ESA', '#003247', 'https://www.esa.int/rssfeed/Our_Activities/Space_Science', 'https://www.esa.int/'),
        e('SpaceNews', '#0f172a', 'https://spacenews.com/feed/', 'https://spacenews.com/'),
        e('Universe Today', '#1e3a8a', 'https://www.universetoday.com/feed/', 'https://www.universetoday.com/'),
        e('Sky & Telescope', '#0b1e3f', 'https://skyandtelescope.org/feed/', 'https://skyandtelescope.org/'),
    ],
    'jeux': [
        e('IGN', '#bf1313', 'https://feeds.feedburner.com/ign/all', 'https://www.ign.com/'),
        e('Eurogamer', '#1f6feb', 'https://www.eurogamer.net/feed', 'https://www.eurogamer.net/'),
        e('Polygon', '#ff0090', 'https://www.polygon.com/rss/index.xml', 'https://www.polygon.com/'),
        e('PC Gamer', '#c8102e', 'https://www.pcgamer.com/rss/', 'https://www.pcgamer.com/'),
        e('Kotaku', '#111111', 'https://kotaku.com/rss', 'https://kotaku.com/'),
        e('Rock Paper Shotgun', '#c8102e', 'https://www.rockpapershotgun.com/feed', 'https://www.rockpapershotgun.com/'),
    ],
    'defense': [
        e('Defense News', '#0f172a', 'https://www.defensenews.com/arc/outboundfeeds/rss/', 'https://www.defensenews.com/'),
        e('Breaking Defense', '#c8102e', 'https://breakingdefense.com/feed/', 'https://breakingdefense.com/'),
        e('The War Zone', '#111111', 'https://www.twz.com/feed', 'https://www.twz.com/'),
        e('War on the Rocks', '#7f1d1d', 'https://warontherocks.com/feed/', 'https://warontherocks.com/'),
        e('Institute for the Study of War', '#1e3a8a', 'https://www.understandingwar.org/rss.xml', 'https://www.understandingwar.org/'),
        e('Kyiv Independent', '#0057b7', 'https://kyivindependent.com/news-archive/rss/', 'https://kyivindependent.com/'),
    ],
    'ia': [
        e('The Verge AI', '#5200ff', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'),
        e('VentureBeat AI', '#ed1c24', 'https://venturebeat.com/category/ai/feed/', 'https://venturebeat.com/ai/'),
        e('MIT News AI', '#a31f34', 'https://news.mit.edu/rss/topic/artificial-intelligence2', 'https://news.mit.edu/'),
    ],
    'planete': [
        e('The Guardian Environment', '#052962', 'https://www.theguardian.com/environment/rss'),
        e('Carbon Brief', '#0f766e', 'https://www.carbonbrief.org/feed/', 'https://www.carbonbrief.org/'),
        e('Inside Climate News', '#065f46', 'https://insideclimatenews.org/feed/', 'https://insideclimatenews.org/'),
    ],
    'sante': [
        e('BBC Health', '#bb1919', 'https://feeds.bbci.co.uk/news/health/rss.xml'),
        e('STAT', '#e11d48', 'https://www.statnews.com/feed/', 'https://www.statnews.com/'),
    ],
    'cine': [
        e('Variety', '#111111', 'https://variety.com/feed/', 'https://variety.com/'),
        e('Deadline', '#111111', 'https://deadline.com/feed/', 'https://deadline.com/'),
        e('The Hollywood Reporter', '#111111', 'https://www.hollywoodreporter.com/feed/', 'https://www.hollywoodreporter.com/'),
    ],
    'musique': [
        e('Pitchfork', '#111111', 'https://pitchfork.com/rss/news/', 'https://pitchfork.com/'),
        e('NME', '#e2001a', 'https://www.nme.com/feed', 'https://www.nme.com/'),
        e('Rolling Stone', '#d6001c', 'https://www.rollingstone.com/feed/', 'https://www.rollingstone.com/'),
    ],
}
