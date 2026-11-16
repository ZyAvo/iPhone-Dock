# mon-ecran-version: 165c3e0e
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
        i = base.index('<meta charset="utf-8">') + len('<meta charset="utf-8">'); i += base[i] == '\n'   # la balise peut être suivie d'une autre sur la même ligne
        return base[:i] + '<meta name="mon-ecran-version" ' + f'content="{h}">\n' + base[i:], h      # chaîne coupée : sinon STAMP_RE l'efface quand ce script se marque lui-même
    c = '//' if path.endswith(('.js', '.mjs')) else '#'
    if base.startswith('#!'):
        i = base.index('\n') + 1; return base[:i] + f'{c} mon-ecran-version: {h}\n' + base[i:], h
    return f'{c} mon-ecran-version: {h}\n' + base, h
fichiers = {}
a_marquer = []
for root, _, files in os.walk(src):
    for f in files:
        p = os.path.join(root, f); rel = os.path.relpath(p, src).replace(os.sep, '/')
        if rel == 'lot.json' or rel.startswith('config/') or not rel.endswith(('.html', '.js', '.mjs', '.py', '.sh', '.yml')): continue   # config/ : réglages de l'utilisateur, pas des fichiers de l'appli
        a_marquer.append((p, rel))
# v144 : adresses versionnées : chaque <script src="x.js"> et <link href="x.css"> local des pages, et la liste SHELL du service worker,
# reçoivent « ?v=<empreinte du fichier> » ; un fichier inchangé garde son adresse (l'iPhone le reprend en mémoire), un fichier modifié
# change d'adresse et est forcément rechargé. Les scripts sont marqués d'abord, puis les pages et sw.js (qui contiennent les empreintes).
ADRESSE_RE = re.compile(r'((?:<script src|<link rel="stylesheet" href)=")([\w./-]+\.(?:js|css))(?:\?v=\w+)?(")')
SHELL_RE = re.compile(r"(const SHELL = \[)([^\]]*)(\])")
def empreinte(rel):
    if rel in fichiers: return fichiers[rel]
    q = os.path.join(src, rel)
    if not os.path.exists(q) or rel.startswith('config/'): return None
    return hashlib.sha1(STAMP_RE.sub('', open(q, encoding='utf-8').read()).encode()).hexdigest()[:8]
def versionner(rel, t):
    base_dir = os.path.dirname(rel)
    def r(m):
        cible = os.path.normpath(os.path.join(base_dir, m.group(2))).replace(os.sep, '/'); h = empreinte(cible)
        return m.group(1) + m.group(2) + (f'?v={h}' if h else '') + m.group(3)
    t = ADRESSE_RE.sub(r, t)
    if rel == 'sw.js':
        def sh(m):
            def e(mm):
                nom = mm.group(1); h = empreinte(nom) if nom.endswith(('.js', '.css')) else None
                return "'" + nom + (f'?v={h}' if h else '') + "'"
            return m.group(1) + re.sub(r"'([^'?]+)(?:\?v=\w+)?'", e, m.group(2)) + m.group(3)
        t = SHELL_RE.sub(sh, t, count=1)
    return t
for p, rel in sorted(a_marquer, key=lambda x: x[1].endswith('.html') or x[1] == 'sw.js'):
    txt = open(p, encoding='utf-8').read()
    if rel.endswith('.html') or rel == 'sw.js': txt = versionner(rel, txt)
    t, h = stamp(rel, txt)
    open(p, 'w', encoding='utf-8').write(t); fichiers[rel] = h
json.dump({'lot':lot, 'date':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'fichiers':dict(sorted(fichiers.items())), 'supprimer':SUPPRIMER},
          open(os.path.join(src, 'lot.json'), 'w'), ensure_ascii=False, indent=1)
if os.path.exists(out): os.remove(out)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(src):
        for f in files:
            p = os.path.join(root, f); z.write(p, os.path.relpath(p, src))
print(lot, len(fichiers), 'fichiers marqués →', out)
