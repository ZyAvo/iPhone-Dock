# mon-ecran-version: 73af90d9
# Prépare un lot : marque chaque page/script avec l'empreinte de son contenu, écrit lot.json, fait le zip.
# Usage : python3 empaqueter.py <dossier> <nom du lot> <zip de sortie> [--sans-essai]
# v51 : avant tout, « essai à sec » des scripts des tâches (outils/*.mjs lancés sans réseau, outils/*.py compilés) :
# un script qui ne passe plus sa phase de chargement (fonction déplacée, repère introuvable, erreur de syntaxe) bloque le lot.
import sys, os, re, json, hashlib, zipfile, datetime, shutil, subprocess, tempfile
args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, lot, out = args[0], args[1], args[2]

def essai_a_sec(src):
    if not shutil.which('node'): print('Essai à sec : node absent, essai sauté.'); return True
    tmp = tempfile.mkdtemp(prefix='essai-'); copie = os.path.join(tmp, 'depot')
    shutil.copytree(src, copie, ignore=shutil.ignore_patterns('.git', 'icones', 'logos', '*.zip'))
    pre = os.path.join(tmp, 'sans-reseau.mjs')
    open(pre, 'w').write("globalThis.fetch = async () => { throw new Error('essai à sec : pas de réseau'); };\n")
    MOTIFS = re.compile(r'SyntaxError|ReferenceError|introuvable dans|Fonction introuvable|Repère introuvable|Fin introuvable|Cannot find module|does not provide an export|is not a function')
    env = {k: v for k, v in os.environ.items() if not re.match(r'(XT_|TV_CLE|ODDS|TMDB|MAIL_|GH_|GITHUB_)', k)}
    ok = True
    for f in sorted(os.listdir(os.path.join(copie, 'outils'))):
        chemin = os.path.join('outils', f)
        if f.endswith('.mjs'):
            try:
                r = subprocess.run(['node', '--import', pre, chemin], cwd=copie, env=env, capture_output=True, text=True, timeout=15)
                txt = r.stdout + r.stderr
            except subprocess.TimeoutExpired as e:
                txt = (e.stdout or b'').decode(errors='ignore') + (e.stderr or b'').decode(errors='ignore')   # a dépassé le chargement : bon signe
            m = MOTIFS.search(txt)
            if m:
                ok = False; i = txt.find(m.group(0)); print(f'Essai à sec ÉCHEC {chemin} : {txt[max(0, i - 120):i + 160].strip()}')
        elif f.endswith('.py'):
            r = subprocess.run([sys.executable, '-m', 'py_compile', chemin], cwd=copie, capture_output=True, text=True)
            if r.returncode: ok = False; print(f'Essai à sec ÉCHEC {chemin} : {r.stderr.strip()[:300]}')
    shutil.rmtree(tmp, ignore_errors=True)
    print('Essai à sec :', 'scripts des tâches OK' if ok else 'ÉCHEC — lot non fabriqué (ajouter --sans-essai pour passer outre)')
    return ok
if '--sans-essai' not in sys.argv and not essai_a_sec(src): sys.exit(1)
SUPPRIMER = ['tv.json', 'donnees', 'outils/prix-test.mjs', 'outils/tv-test.mjs']   # restes de l'ancien fonctionnement ; test des prix abandonné (31/10/2026) ; test TV retiré (v48)
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
