#!/usr/bin/env python3
# mon-ecran-version: 1c592872
"""QM27 (v116) — lieux illustrés façon FM98 : découpe le fond et les objets animés d'un lieu.
- <lieu>-fond.png (portrait 1024 × 1536) → images/qm27/scenes/<lieu>-fond.webp ;
- <lieu>-objets.png (planche, fond uni clair, grille cols × rangs) → images/qm27/scenes/<lieu>-<nom>.webp, recadrés au plus juste
  (pas de carré : l'écran place chaque objet par son centre et sa largeur). Une case peut donner deux pièces (« g » et « d ») :
  ses composantes sont partagées par le milieu, chaque moitié gardant le cadre de la case entière (pour se superposer exactement).
Trous fermés de vrai fond (intérieur du cadre doré) : transparents.
Usage : python3 outils/dev/qm27-scenes.py <dossier des planches> [dossier de sortie, défaut images/qm27/scenes]"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27/scenes'
LIEUX = {
    'bureau': (4, 3, ['choixpeau', 'choixpeau-ouvert', 'echarpe', 'gazette', 'page', 'lettre', 'cachet', ('cachet-g', 'cachet-d'),
                      'lettre-ouverte', 'bourse', 'piece', 'cadre']),
}
LARG = 420
os.makedirs(O, exist_ok=True); tailles = {}

def masque(a, dist, lab, ids):
    m0 = np.isin(lab, ids); m = nd.binary_fill_holes(m0); tr, nt = nd.label(m & ~m0)
    for h in range(1, nt + 1):
        z = tr == h
        if np.median(dist[z]) < 9: m[z] = False
    return m

def ecrire(a, dist, m, boite, nom):
    y0, y1, x0, x1 = boite
    al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 8) / 40, 0, 1) * 255
    img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA')
    if img.width > LARG: img = img.resize((LARG, round(img.height * LARG / img.width)), Image.LANCZOS)
    img.save(os.path.join(O, nom + '.webp'), 'WEBP', quality=88, method=6); tailles[nom] = [int(x1 - x0), int(y1 - y0), int(x0), int(y0)]

for lieu, (cols, rows, noms) in LIEUX.items():
    f = os.path.join(A, f'{lieu}-fond.png')
    if os.path.exists(f):
        Image.open(f).convert('RGB').resize((1024, 1536), Image.LANCZOS).save(os.path.join(O, f'{lieu}-fond.webp'), 'WEBP', quality=80, method=6); print(lieu, 'fond ok')
    f = os.path.join(A, f'{lieu}-objets.png')
    if not os.path.exists(f): continue
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.int16); H, W = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0); dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > 26
    lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1)); cent = nd.center_of_mass(fg, lab, range(1, N + 1)); cases = {}
    for k in range(N):
        if t[k] < 30: continue
        cy, cx = cent[k]; cases.setdefault((min(rows - 1, int(cy // (H / rows))), min(cols - 1, int(cx // (W / cols)))), []).append((k + 1, cx))
    for i, nom in enumerate(noms):
        L = cases.get(divmod(i, cols), []); assert L, f'case {i} vide'
        m = masque(a, dist, lab, [k for k, _ in L]); ys, xs = np.nonzero(m); boite = (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1)
        if isinstance(nom, tuple):   # deux moitiés côte à côte
            mx = (boite[2] + boite[3]) / 2
            for part, garde in zip(nom, [lambda x: x < mx, lambda x: x >= mx]):
                ecrire(a, dist, masque(a, dist, lab, [k for k, x in L if garde(x)]), boite, f'{lieu}-{part}')
        else: ecrire(a, dist, m, boite, f'{lieu}-{nom}')
    print(lieu, 'objets ok', len(noms))
print(json.dumps(tailles))
