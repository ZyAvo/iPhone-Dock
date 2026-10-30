# mon-ecran-version: 0985d878
# Modèle du classeur : réglages actuels (reference.json, cochés « Oui ») + catalogue (non cochés).
# Chaque module = un onglet ; chaque ligne a un identifiant fixe (colonne cachée) et sa définition technique (JSON caché).
import json, re, unicodedata
from cat_sport import REGIONS_NOUVELLES, LIGUES_NOUVELLES, EQUIPES_PROPOSEES
from cat_actus import SECTIONS_FR, FEEDS_FR, SECTIONS_EN, FEEDS_EN, G
from cat_autres import *

VERSION_CLASSEUR = 3

def slug(s):
    s = unicodedata.normalize('NFD', str(s).lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def row(id, vals, oui='', tech=None, oui2='', resultat='', note='', support='ok'):
    return dict(id=id, vals=vals, oui=oui, oui2=oui2, tech=tech, resultat=resultat, note=note, support=support)

def section(id, label, rows, tech=None, note=''):
    return dict(id=id, label=label, rows=rows, tech=tech if tech is not None else {'id': id, 'label': label}, note=note)

NOUVEAU = 'à vérifier'

def construire(ref):
    M = []
    # ================= SPORT =================
    leagues = ref['sport']['leagues']; favl = set(ref['sport']['favoris']['ligues'])
    regs = [(r['id'], r['label']) for r in ref['sport']['regions']]
    ids_reg = [r for r, _ in regs]
    for r, l in REGIONS_NOUVELLES:
        if r not in ids_reg: regs.append((r, l))
    SUP = {'ok': 'Oui', 'dev': 'À développer', 'non': 'Non disponible'}
    secs = []
    for rid, rlab in regs:
        rows = []
        for L in [x for x in leagues if x['region'] == rid]:
            rows.append(row(f"sp:{L['id']}", {'nom': L['name'], 'sport': L['sport'], 'cle': L['id'], 'tv': ', '.join(L.get('tv', [])), 'prise': 'Oui'},
                            'Oui', L))
        for (lid, reg, flag, sp, grp, nom, tv, sup, note) in LIGUES_NOUVELLES:
            if reg != rid: continue
            t = {'id': lid, 'region': reg, 'flag': flag, 'sport': sp, 'group': grp, 'name': nom}
            if tv: t['tv'] = [tv]
            rows.append(row(f"sp:{lid}", {'nom': nom, 'sport': sp, 'cle': lid, 'tv': tv, 'prise': SUP[sup]}, '', t,
                            resultat='' if sup == 'non' else NOUVEAU, note=note, support=sup))
        secs.append(section(rid, rlab, rows))
    M.append(dict(id='sport', feuille='Sport', titre='Sport · compétitions suivies',
        intro="Coche « Oui » pour afficher une compétition dans la page Sport (les favoris se choisissent dans l'appli, avec l'étoile). "
              "« Prise en charge » : Oui = l'appli sait déjà l'afficher · À développer = données disponibles, affichage à coder · Non disponible = pas de source gratuite fiable.",
        cols=[('nom', 'Compétition', 40), ('sport', 'Sport', 12), ('cle', 'Clé ESPN', 22), ('tv', 'Diffuseur(s) en France', 24), ('prise', 'Prise en charge', 16)],
        sections=secs,
        ajout=('Région (existante ou nouvelle)', 'Nom de la compétition', 'Clé ESPN si connue, sinon laisse vide', 'Exemple', 'Coupe de la Ligue (Écosse)', 'sco.cis')))

    # ================= ACTUS =================
    def actus_module(mid, feuille, titre, langue, tabs_ref, autres_ref, sections_new, feeds_new, intro):
        secs = []; vus = []
        def feed_row(tab, F, oui):
            fid = f"{mid}:{tab}:{slug(F['name'])}"
            t = {k: v for k, v in F.items() if k != 'google'}
            return row(fid, {'nom': F['name'], 'url': F['url'], 'site': F.get('site', '')}, oui, t, resultat='' if oui else NOUVEAU,
                       note='Flux Google Actualités (mot-clé)' if F.get('google') or 'news.google.com' in F['url'] else '')
        for liste, tabs in (('principal', tabs_ref), ('autres', autres_ref)):
            for T in tabs:
                rows = [feed_row(T['id'], F, 'Oui') for F in T['feeds']]
                deja = {r['vals']['url'] for r in rows}
                rows += [feed_row(T['id'], F, '') for F in feeds_new.get(T['id'], []) if F['url'] not in deja]
                lab = T['label'] + (' (page Investissements)' if liste == 'autres' else '')
                secs.append(section(T['id'], lab, rows, {'id': T['id'], 'label': T['label'], 'liste': liste})); vus.append(T['id'])
        for sid, lab in sections_new:
            if sid in vus: continue
            secs.append(section(sid, lab, [feed_row(sid, F, '') for F in feeds_new.get(sid, [])], {'id': sid, 'label': lab, 'liste': 'principal'}))
        return dict(id=mid, feuille=feuille, titre=titre, intro=intro,
            cols=[('nom', 'Média', 30), ('url', 'Adresse du flux', 52), ('site', 'Site (secours)', 30)], sections=secs,
            ajout=('Rubrique (existante ou nouvelle)', 'Nom du média', "Adresse du site ou du flux, ou un mot-clé", 'Exemple', 'Numerama', 'https://www.numerama.com/'))
    M.append(actus_module('actus', 'Actus', 'Actus · rubriques et médias (français)', 'fr', ref['actus']['fr'], ref['actus']['autres'], SECTIONS_FR, FEEDS_FR,
        "Une rubrique = un onglet de la page Actus. Coche un média : sa rubrique apparaît avec lui. Coche la ligne « toute la rubrique » pour prendre tous ses médias "
        "(et mets « Non » sur ceux que tu ne veux pas). Les flux « Google » suivent un mot-clé plutôt qu'un site."))
    M.append(actus_module('actus-en', 'Actus International', 'Actus · mode International (anglais)', 'en', ref['actus']['en'], [], SECTIONS_EN, FEEDS_EN,
        "Mêmes rubriques, médias anglophones : affichés quand tu touches la bulle 🇺🇸 de la page Actus."))

    # ================= MARCHÉS =================
    ind = ref['marches']['indices']; suivi = ref['marches']['suivi']
    place = {'cac40': 'idx_eu', 'eurostoxx50': 'idx_eu', 'sp500': 'idx_us', 'nasdaq100': 'idx_us', 'monde': 'idx_monde', 'emergents': 'idx_monde',
             'or': 'matieres', 'brent': 'matieres', 'eurusd': 'devises'}
    ordre = ['idx_eu', 'idx_us', 'idx_monde', 'matieres', 'devises', 'taux', 'crypto']
    labs = dict(MARCHES_SECTIONS)
    secs = []
    for s in ordre:
        rows = []
        for I in ind:
            if place.get(I['id'], 'idx_monde') != s: continue
            t = {k: v for k, v in I.items() if k != 'accueil'}
            rows.append(row(f"mk:{I['id']}", {'nom': I['nom'], 'code': I['code'], 'isin': '', 'note': I.get('note', '')}, 'Oui', t, 'Oui' if I.get('accueil') else ''))
        for (sec, mid, code, nom, note) in MARCHES:
            if sec != s: continue
            t = {'id': mid, 'code': code, 'nom': nom}
            if note == 'change': t['change'] = True
            elif note: t['note'] = note
            rows.append(row(f"mk:{mid}", {'nom': nom, 'code': code, 'isin': '', 'note': '' if note == 'change' else note}, '', t, resultat=NOUVEAU))
        secs.append(section(s, labs[s], rows, {'id': s, 'label': labs[s], 'liste': 'indices'}))
    rows = [row(f"fd:{F['isin']}", {'nom': F['nom'], 'code': F.get('code', ''), 'isin': F['isin'], 'note': ''}, 'Oui', F) for F in suivi]
    deja = {F['isin'] for F in suivi}
    rows += [row(f"fd:{i}", {'nom': n, 'code': c, 'isin': i, 'note': ''}, '', {'isin': i, 'code': c, 'nom': n}, resultat=NOUVEAU) for i, c, n in FONDS if i not in deja]
    secs.append(section('fonds', 'Fonds et ETF suivis (ISIN)', rows, {'id': 'fonds', 'label': 'Fonds et ETF suivis', 'liste': 'suivi'}))
    M.append(dict(id='marches', feuille='Marchés', titre='Investissements · marchés et fonds suivis',
        intro="Indices, devises, matières premières, taux, cryptos et fonds affichés dans la page Investissements. « Widget accueil » : affiché aussi sur l'écran d'accueil. "
              "Pour tes fonds, l'ISIN suffit (jamais de quantités ni de montants ici : le dépôt est public).",
        cols=[('nom', 'Nom', 34), ('code', 'Code de cotation', 16), ('isin', 'ISIN', 16), ('note', 'Précision', 18)], coche2='Widget accueil', sections=secs,
        ajout=('Section (Fonds et ETF suivis, ou autre)', 'Nom', 'ISIN ou code de cotation', 'Exemple', 'Amundi PEA Monde', 'FR0011869353')))

    # ================= VIDÉOS =================
    pl = ref['videos']['plateformes']
    rows = [row(f"pf:{P['id']}", {'nom': P['nom'], 'court': P['court'], 'app': P.get('app', ''), 'note': ''}, 'Oui', P) for P in pl]
    for (pid, nom, court, coul, tm, app, web, note) in PLATEFORMES:
        rows.append(row(f"pf:{pid}", {'nom': nom, 'court': court, 'app': app, 'note': note}, '',
                        {'id': pid, 'nom': nom, 'court': court, 'coul': coul, 'tmdb': tm, 'app': app, 'web': web}, resultat=NOUVEAU))
    secs = [section('plateformes', 'Plateformes', rows, {'id': 'plateformes', 'label': 'Plateformes'})]
    M.append(dict(id='videos', feuille='Vidéos', titre='Vidéos · plateformes de streaming',
        intro="« Oui » = la plateforme apparaît dans les filtres de la page Vidéos (tes abonnements se cochent dans la page, bouton ⚙︎ Mes abonnements). "
              "Seuls les titres inclus dans l'abonnement sont listés (pas la location ni l'achat).",
        cols=[('nom', 'Plateforme', 22), ('court', 'Badge', 9), ('app', "Lien d'ouverture de l'appli", 26), ('note', 'Précision', 22)], sections=secs,
        ajout=('Section', 'Nom de la plateforme', 'Nom exact chez JustWatch / TMDB', 'Exemple', 'Molotov', 'Molotov TV')))

    # ================= YOUTUBE =================
    ch = ref['videos']['chaines_yt']
    secs = [section('actuelles', 'Mes chaînes actuelles', [row(f"yt:{C['id']}", {'nom': C['nom'], 'ident': C['id']}, 'Oui', C) for C in ch])]
    themes = []
    for th, h, n in YOUTUBE:
        if th not in themes: themes.append(th)
    for th in themes:
        secs.append(section(slug(th), th, [row(f"yt:{h.lower()}", {'nom': n, 'ident': h}, '', {'id': h, 'nom': n}, resultat=NOUVEAU) for t, h, n in YOUTUBE if t == th]))
    M.append(dict(id='youtube', feuille='YouTube', titre='Vidéos · chaînes YouTube',
        intro="Les vidéos récentes des chaînes cochées s'affichent dans l'onglet YouTube de la page Vidéos. L'identifiant peut être un @nom, un lien de chaîne ou un identifiant UC….",
        cols=[('nom', 'Chaîne', 30), ('ident', 'Identifiant (@nom, lien ou UC…)', 34)], sections=secs,
        ajout=('Thème (existant ou nouveau)', 'Nom de la chaîne', '@nom, lien ou identifiant UC…', 'Exemple', 'Astronogeek', '@astronogeek')))

    # ================= PROGRAMME TV =================
    src = ref['tv']['chaines']
    noms = []
    for i, c in enumerate(src):
        c['ordre'] = i
        if c['nom'] not in noms: noms.append(c['nom'])
    def bouquet(n):
        for p, b in (('Canal+', 'canal'), ('Infosport', 'canal'), ('beIN', 'bein'), ('DAZN', 'dazn'), ('Ligue 1+', 'l1')):
            if n.startswith(p): return b
        return 'autres'
    BQ = [('canal', 'Canal+'), ('bein', 'beIN Sports'), ('dazn', 'DAZN'), ('l1', 'Ligue 1+'), ('autres', 'Autres chaînes sport'), ('gratuites', 'Chaînes gratuites et autres')]
    secs = []
    for b, lab in BQ:
        rows = []
        for n in noms:
            if bouquet(n) != b: continue
            S = [c for c in src if c['nom'] == n]
            rows.append(row(f"tv:{slug(n)}", {'nom': n, 'sources': ', '.join(dict.fromkeys(c['site'] for c in S))}, 'Oui', {'nom': n, 'sources': S}))
        if b == 'gratuites':
            rows = [row(f"tv:{slug(n)}", {'nom': n, 'sources': 'à trouver par la tâche'}, '', {'nom': n, 'sources': []}, resultat=NOUVEAU, note=note) for n, note in TV_PLUS if '(bis)' not in n]
        secs.append(section(b, lab, rows))
    M.append(dict(id='tv', feuille='Programme TV', titre='Programme TV · chaînes lues pour les matchs',
        intro="Chaînes dont le programme est récupéré pour savoir où regarder un match (page Sport). Les sources sont des guides TV publics ; une chaîne peut avoir plusieurs sources de secours.",
        cols=[('nom', 'Chaîne', 30), ('sources', 'Sources du programme', 46)], sections=secs,
        ajout=('Bouquet', 'Nom de la chaîne', 'Nom exact dans le guide TV si connu', 'Exemple', 'Sport en France', '')))

    # ================= COTES =================
    books = ref['cotes']['sites']; comps = ref['cotes']['comps']
    NOMS = {'winamax_fr': 'Winamax', 'betclic_fr': 'Betclic', 'unibet_fr': 'Unibet', 'pmu_fr': 'PMU', 'netbet_fr': 'NetBet'}
    srows = [row(f"cs:{b}", {'nom': NOMS.get(b, b), 'cle': b, 'detail': ''}, 'Oui', b) for b in books]
    srows += [row(f"cs:{k}", {'nom': n, 'cle': k, 'detail': note}, '', k, resultat=NOUVEAU) for k, n, note in SITES_COTES]
    lname = {L['id']: L['name'] for L in leagues}
    crows = [row(f"cc:{k}", {'nom': lname.get(k, k), 'cle': v['cle'], 'detail': k}, 'Oui', {'id': k, **v}) for k, v in comps.items()]
    crows += [row(f"cc:{k}", {'nom': n, 'cle': c, 'detail': k}, '', {'id': k, 'cle': c, 're': {'re': re.escape(n.split(' (')[0]).replace('\\ ', ' '), 'flags': 'i'}}, resultat=NOUVEAU)
              for k, c, n in COMPS_COTES]
    M.append(dict(id='cotes', feuille='Cotes', titre='Cotes des matchs · sites et compétitions',
        intro="Relevés automatiques (le matin, 15 min avant, à la mi-temps) avec la clé gratuite The Odds API (500 crédits par mois). Chaque compétition ajoutée consomme des crédits : "
              "vérifie la jauge dans État. Moins de 10 sites = 1 crédit par relevé.",
        cols=[('nom', 'Nom', 30), ('cle', 'Clé The Odds API', 32), ('detail', 'Détail', 30)],
        sections=[section('sites', 'Sites de paris', srows), section('compets', 'Compétitions relevées', crows),
                  section('rapport_seuil', 'Rapport des écarts · seuil d\'affichage (un seul)', [row(f"cr:seuil:{int(v * 100)}", {'nom': f'Écart d\'au moins {t}', 'cle': '', 'detail': ''}, 'Oui' if v == 0.05 else '', v) for v, t in RAPPORT_SEUILS]),
                  section('rapport_ref', 'Rapport des écarts · comparaison (une seule)', [row(f"cr:ref:{k}", {'nom': n, 'cle': '', 'detail': d}, 'Oui' if k == 'moyenne' else '', k) for k, n, d in RAPPORT_REFS])],
        ajout=('Section (Sites de paris ou Compétitions relevées)', 'Nom', 'Clé The Odds API ou id de compétition du dock', 'Exemple', 'Ligue 2', 'fra.2')))

    # ================= ACCUEIL (minimal) =================
    met = ref['accueil']['meteo']; une = ref['accueil']['une']
    secs = [
        section('pages', 'Pages de l\'appli', [row(f"pg:{i}", {'nom': n, 'detail': ''}, 'Oui' if a else '', i) for i, n, a in MODULES_PAGES]),
        section('widgets', 'Widgets de l\'écran d\'accueil', [row(f"wg:{i}", {'nom': n, 'detail': note}, 'Oui' if a else '', i) for i, n, a, note in WIDGETS]),
        section('une', 'Source du widget « À la une » (une seule)', [row(f"un:{slug(une['name'])}", {'nom': une['name'], 'detail': une['url']}, 'Oui', une)] +
                [row(f"un:{slug(n)}", {'nom': n, 'detail': u}, '', {'name': n, 'color': '--t-slate', 'url': u}) for n, u in
                 [('Le Monde', 'https://www.lemonde.fr/rss/une.xml'), ('Le Figaro', 'https://www.lefigaro.fr/rss/figaro_actualites.xml'),
                  ('20 Minutes', 'https://www.20minutes.fr/feeds/rss-une.xml'), ('Libération', 'https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml')]]),
    ]
    M.append(dict(id='accueil', feuille='Accueil', titre="Accueil · pages, widgets et météo",
        intro="Pages et widgets du dock. Tes villes météo se gèrent dans l'appli (touche le nom de la ville sur l'accueil).",
        cols=[('nom', 'Élément', 34), ('detail', 'Détail', 52)], sections=secs, ajout=None))

    # ================= APPLIS (3 liens par appli) =================
    A = ref['applis']
    def arow(sec, a, i):
        t = dict(a); lab = a['label']
        if lab in ANDROID: t['android'] = lien_android(ANDROID[lab])
        typ = a.get('type') or ('action' if a.get('action') else 'appli')
        if typ in ('folder', 'page', 'action'):
            vals = {'nom': lab, 'ios': {'folder': 'dossier ' + a.get('target', ''), 'page': 'page ' + a.get('url', ''), 'action': 'choix de l\'appli de navigation'}[typ], 'android': '', 'web': ''}
        else:
            vals = {'nom': lab, 'ios': a.get('app', ''), 'android': t.get('android', ''), 'web': a.get('web', '')}
        return row(f"ap:{sec}:{slug(lab)}", vals, 'Oui', t, note=NOTE_ANDROID.get(lab, ''))
    secs = [section('accueil', "Écran d'accueil (dossiers et pages)", [arow('accueil', a, i) for i, a in enumerate(A['accueil'])], {'id': 'accueil', 'label': "Écran d'accueil", 'type': 'liste'})]
    for k, f in A['dossiers'].items():
        secs.append(section(f'dossier-{k}', f"Dossier {f['title']}", [arow(k, a, i) for i, a in enumerate(f['items'])], {'id': k, 'label': f['title'], 'type': 'dossier'}))
    for k, lab in (('bas_gauche', 'Bandeau du bas · gauche'), ('bas_droite', 'Bandeau du bas · droite'), ('navigation', 'Applis proposées par Navigation')):
        secs.append(section(k, lab, [arow(k, a, i) for i, a in enumerate(A[k])], {'id': k, 'label': lab, 'type': 'liste'}))
    M.append(dict(id='applis', feuille='Applis', titre='Accueil · applis, dossiers et liens',
        intro="Chaque appli a 3 liens : iPhone (lien d'ouverture de l'appli), Android (ouvre l'appli ou sa page Google Play) et web (site, utilisé sur PC ou si l'appli manque). "
              "Ces liens sont modifiables directement dans le tableau. Aujourd'hui le dock utilise les liens iPhone et web ; les liens Android préparent la version multi-plateforme.",
        cols=[('nom', 'Appli', 22), ('ios', 'Lien iPhone', 34), ('android', 'Lien Android', 40), ('web', 'Lien web', 30)], sections=secs,
        ajout=('Dossier (Finance, Travail… ou nouveau)', "Nom de l'appli", 'Lien iPhone (ex. spotify://)', 'Exemple', 'Spotify', 'spotify://')))

    # ================= APPARENCE =================
    PAL = [('bleu', 'Bleu'), ('gris', 'Gris'), ('ardoise', 'Ardoise et corail'), ('minuit', 'Minuit et or'), ('encre', 'Encre et ambre'),
           ('petrole', 'Pétrole et cuivre'), ('azur', 'Azur et mandarine')]
    secs = [section('themes', 'Thèmes proposés dans État', [row(f"th:{i}", {'nom': n, 'detail': i}, 'Oui' if i in ref['apparence']['palettes'] else '', i,
                                                               'Oui' if i == ref['apparence']['palette'] else '') for i, n in PAL]),
            section('mode', 'Mode clair / sombre par défaut', [row(f"md:{i}", {'nom': n, 'detail': d}, 'Oui' if i == ref['apparence']['mode'] else '', i) for i, n, d in
                                                               [('auto', 'Défaut', "suit le réglage de l'iPhone"), ('clair', 'Clair', 'toujours'), ('sombre', 'Sombre', 'toujours')]])]
    M.append(dict(id='apparence', feuille='Apparence', titre='Apparence · thèmes et mode',
        intro="Thèmes proposés dans la page État et thème de départ (« Par défaut ») pour un nouvel appareil. Chacun peut ensuite changer sur son appareil.",
        cols=[('nom', 'Thème / mode', 30), ('detail', 'Détail', 30)], coche2='Par défaut', sections=secs, ajout=None))
    return M

if __name__ == '__main__':
    ref = json.load(open('reference.json'))
    M = construire(ref)
    for m in M:
        n = sum(len(s['rows']) for s in m['sections']); o = sum(r['oui'] == 'Oui' for s in m['sections'] for r in s['rows'])
        print(f"{m['feuille']:22} sections={len(m['sections']):3} lignes={n:4} cochées={o}")
    ids = [r['id'] for m in M for s in m['sections'] for r in s['rows']]
    dup = {i for i in ids if ids.count(i) > 1}; print('total', len(ids), 'doublons', dup)
