# mon-ecran-version: 4a5267a3
# Prépare un lot : marque chaque page/script avec l'empreinte de son contenu, écrit lot.json, fait le zip.
# Usage : python3 empaqueter.py <dossier> <nom du lot> <zip de sortie>
import sys, os, re, json, hashlib, zipfile, datetime
src, lot, out = sys.argv[1], sys.argv[2], sys.argv[3]
SUPPRIMER = ['tv.json', 'donnees']          # restes de l'ancien fonctionnement sur la branche principale
STAMP_RE = re.compile(r'(<meta name="mon-ecran-version" content="[^"]*">\n?|^(//|#) mon-ecran-version: [\w.-]+\n)', re.M)
def stamp(path, text):
    base = STAMP_RE.sub('', text)
    h = hashlib.sha1(base.encode()).hexdigest()[:8]
    if path.endswith('.html'):
        i = base.index('<meta charset="utf-8">') + len('<meta charset="utf-8">\n')
        return base[:i] + '<meta name="mon-ecran-version" ' + f'content="{h}">\n' + base[i:], h      # chaîne coupée : sinon STAMP_RE l'efface quand ce script se marque lui-même
    c = '//' if path.endswith(('.js', '.mjs')) else '#'
    if base.startswith('#!'):
        i = base.index('\n') + 1; return base[:i] + f'{c} mon-ecran-version: {h}\n' + base[i:], h
    return f'{c} mon-ecran-version: {h}\n' + base, h
fichiers = {}
for root, _, files in os.walk(src):
    for f in files:
        p = os.path.join(root, f); rel = os.path.relpath(p, src).replace(os.sep, '/')
        if rel == 'lot.json' or rel.startswith('config/') or not rel.endswith(('.html', '.js', '.mjs', '.py', '.sh', '.yml')): continue   # config/ : réglages de l'utilisateur, pas des fichiers de l'appli
        t, h = stamp(rel, open(p, encoding='utf-8').read())
        open(p, 'w', encoding='utf-8').write(t); fichiers[rel] = h
json.dump({'lot':lot, 'date':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'fichiers':dict(sorted(fichiers.items())), 'supprimer':SUPPRIMER},
          open(os.path.join(src, 'lot.json'), 'w'), ensure_ascii=False, indent=1)
if os.path.exists(out): os.remove(out)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(src):
        for f in files:
            p = os.path.join(root, f); z.write(p, os.path.relpath(p, src))
print(lot, len(fichiers), 'fichiers marqués →', out)
