# mon-ecran-version: a2873760
# Vérification « avant / après » : la configuration produite par le classeur pré-coché doit être identique aux réglages du code.
import json, sys
ref = json.load(open('reference.json')); D = sys.argv[1]
c = {k: json.load(open(f'{D}/{k}.json')) for k in ('sport', 'actus', 'marches', 'videos', 'tv', 'cotes', 'accueil', 'apparence', 'applis') if __import__('os').path.exists(f'{D}/{k}.json')}
attendu = {
  'sport': {'regions': ref['sport']['regions'], 'leagues': ref['sport']['leagues']}, 'actus': ref['actus'], 'marches': ref['marches'], 'videos': ref['videos'],
  'tv': {'chaines': ref['tv']['chaines'], 'a_trouver': []},
  'cotes': {'sites': ref['cotes']['sites'], 'comps': ref['cotes']['comps']},
  'accueil': {'pages': ['actus', 'sport', 'videos', 'invest', 'cachee', 'etat'], 'widgets': ['meteo', 'une', 'invest', 'spotify', 'sport', 'live'],
              'une': ref['accueil']['une'], 'indices_widget': ref['accueil']['indices_widget']},
  'applis': ref.get('applis'),
  'apparence': {'palettes': ref['apparence']['palettes'], 'palette': ref['apparence']['palette'], 'mode': ref['apparence']['mode']},
}
for x in ref['tv']['chaines']: x.pop('ordre', None)
if 'cotes' in c: c['cotes'].pop('rapport', None)
nand = 0
if 'applis' in c:
    A = c['applis']; A.pop('reserve', None)                               # réserve des masqués et identifiants : pour l'appli (v40), pas dans le code d'origine
    for f in A['dossiers'].values(): f.pop('id', None)
    for L in [A['accueil'], A['bas_gauche'], A['bas_droite'], A['navigation']] + [f['items'] for f in A['dossiers'].values()]:
        for a in L: nand += 'android' in a; a.pop('android', None); a.pop('id', None)
else: attendu.pop('applis')
def diff(a, b, p=''):
    if type(a) != type(b): yield f'{p}: type {type(a).__name__} ≠ {type(b).__name__}'; return
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a: yield f'{p}.{k}: en trop après'
            elif k not in b: yield f'{p}.{k}: manquant après'
            else: yield from diff(a[k], b[k], f'{p}.{k}')
    elif isinstance(a, list):
        if len(a) != len(b): yield f'{p}: {len(a)} éléments avant, {len(b)} après'
        for i, (x, y) in enumerate(zip(a, b)): yield from diff(x, y, f'{p}[{i}]')
    elif a != b: yield f'{p}: {a!r} ≠ {b!r}'
tot = 0
import re as _re
vides = len(_re.findall(r'"re": ?\{\}', json.dumps(c)))
if vides: print('ATTENTION expressions vides :', vides); tot += vides
for k in attendu:
    d = list(diff(attendu[k], c[k], k)); tot += len(d)
    n = sum(len(v) if isinstance(v, (list, dict)) else 1 for v in attendu[k].values())
    print(f"{k:10} {'identique' if not d else str(len(d)) + ' différence(s)'}")
    for x in d[:12]: print('   ', x)
print('TOTAL différences :', tot, f'(liens Android ajoutés : {nand})' if nand else '')
