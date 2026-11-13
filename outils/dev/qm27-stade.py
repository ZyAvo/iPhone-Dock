#!/usr/bin/env python3
# mon-ecran-version: 9f9f7e6f
"""QM27 (v112) — stade façon FM98 : terrain vide + pièces de tribunes (Série 3).
Planches : terrain.png (1536 × 1024), longues.png (4 × 2 : ligne 1 tribune du fond vue de face, ligne 2 tribune du premier plan
vue de dos ; colonnes bois, pierre, grande, chantier), virages.png (4 × 3 : ligne 1 virage gauche, ligne 2 angle arrière gauche,
ligne 3 angle avant gauche ; mêmes colonnes). Chaque pièce est découpée au plus près (composantes connexes rangées dans la case
de leur centre), fond transparent, sans carré autour : le jeu la pose sur son emplacement du terrain (la droite = miroir).
Usage : python3 outils/dev/qm27-stade.py <dossier des planches> [dossier de sortie, défaut images/qm27/stade]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27/stade'
os.makedirs(O, exist_ok=True)
NIV = ['bois', 'pierre', 'grande', 'chantier']
MIROIR = tuple(int(x) for x in os.environ.get('MIROIR', '').split(',') if x)   # rangées de virages2.png à retourner (0 = virage, 1 = angle arrière, 2 = angle avant)
def pieces(fichier, cols, rows, noms, larg, miroir=()):
    a = np.asarray(Image.open(os.path.join(A, fichier)).convert('RGB')).astype(np.int16); H, W = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > 26
    lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1)); cent = nd.center_of_mass(fg, lab, range(1, N + 1))
    cases = {}
    for k in range(N):
        if t[k] < 30: continue
        cy, cx = cent[k]; cases.setdefault((int(cy // (H / rows)), int(cx // (W / cols))), []).append(k + 1)
    tailles = {}
    for i, nom in enumerate(noms):
        m0 = np.isin(lab, cases.get(divmod(i, cols), [])); m = nd.binary_fill_holes(m0)
        tr, nt = nd.label(m & ~m0)
        for h in range(1, nt + 1):
            z = tr == h
            if np.median(dist[z]) < 9: m[z] = False   # vrai fond enfermé (sous une grue, entre deux poteaux)
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 8) / 40, 0, 1) * 255
        img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA')
        img = img.resize((larg, max(1, round(img.height * larg / img.width))), Image.LANCZOS)
        if i // cols in miroir: img = img.transpose(Image.FLIP_LEFT_RIGHT)   # v115 : pièce dessinée tournée vers la gauche
        img.save(os.path.join(O, nom + '.webp'), 'WEBP', quality=86, method=6); tailles[nom] = img.size
    return tailles
T = {}
ici = lambda f: os.path.exists(os.path.join(A, f))   # v115 : on peut ne passer que certaines planches
if ici('longues.png'): T.update(pieces('longues.png', 4, 2, [f'fond-{n}' for n in NIV] + [f'avant-{n}' for n in NIV], 512))
VIR = [f'virage-{n}' for n in NIV] + [f'angle-fond-{n}' for n in NIV] + [f'angle-avant-{n}' for n in NIV]
if ici('virages2.png'): T.update(pieces('virages2.png', 4, 3, VIR, 320, MIROIR))   # v115 : virages tournés vers le terrain
elif ici('virages.png'): T.update(pieces('virages.png', 4, 3, VIR, 320))
if ici('terrain.png'): Image.open(os.path.join(A, 'terrain.png')).convert('RGB').resize((1152, 768), Image.LANCZOS).save(os.path.join(O, 'terrain.webp'), 'WEBP', quality=82, method=6)
for k, v in sorted(T.items()): print(k, v)
