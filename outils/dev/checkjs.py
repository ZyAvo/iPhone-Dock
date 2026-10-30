# mon-ecran-version: 5f6b32db
import re,subprocess,sys,glob,os
d=sys.argv[1]; bad=0
for f in sorted(glob.glob(d+'/*.html')):
    s=open(f).read()
    for i,m in enumerate(re.finditer(r'<script>(.*?)</script>', s, re.S)):
        p=os.path.join(os.environ.get('TMPDIR', '/tmp'), '_sc.js'); open(p,'w').write(m.group(1))
        r=subprocess.run(['node','--check',p],capture_output=True,text=True)
        if r.returncode: bad+=1; print(os.path.basename(f), i, r.stderr[:500])
for f in glob.glob(d+'/outils/*.mjs')+glob.glob(d+'/*.js'):          # sw.js, noyau.js, synchro.js
    r=subprocess.run(['node','--check',f],capture_output=True,text=True)
    if r.returncode: bad+=1; print(f, r.stderr[:300])
print('erreurs de syntaxe :', bad)
