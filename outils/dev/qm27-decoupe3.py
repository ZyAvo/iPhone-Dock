#!/usr/bin/env python3
# mon-ecran-version: 3b439ba9
"""QM27 (v111) — Série 3 : trophées, récompenses, produits du Bazar et nouvelle carte du domaine.
Chaque planche est découpée objet par objet : les morceaux (composantes connexes sur le fond clair, trous remplis) sont
rangés dans la case de la grille où tombe leur centre, puis réunis ; rien n'est rogné, les étincelles détachées suivent leur objet.
Usage : python3 outils/dev/qm27-decoupe3.py <dossier des planches> [dossier de sortie, défaut images/qm27]
Planches : coupes.png (3 × 2), prix.png (4 × 4), produits.png (3 × 3), carte-jour.png et carte-nuit.png (1024 × 1536)."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27'

def planche(fichier, cols, rows, noms, dossier, cote, marge=0.04):
    a = np.asarray(Image.open(os.path.join(A, fichier)).convert('RGB')).astype(np.int16); H, W = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > 28
    lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1)); cent = nd.center_of_mass(fg, lab, range(1, N + 1))
    cases = {}
    for k in range(N):
        if t[k] < 40: continue   # poussières
        cy, cx = cent[k]; cases.setdefault((int(cy // (H / rows)), int(cx // (W / cols))), []).append(k + 1)
    os.makedirs(os.path.join(O, dossier), exist_ok=True)
    for i, nom in enumerate(noms):
        if not nom: continue
        L = cases.get(divmod(i, cols), [])
        m0 = np.isin(lab, L); m = nd.binary_fill_holes(m0)
        tr, nt = nd.label(m & ~m0)   # trous : blancs de l'objet (gardés) ou vrai fond enfermé, entre une anse et la coupe (rendu transparent)
        for h in range(1, nt + 1):
            z = tr == h
            if np.median(dist[z]) < 9: m[z] = False
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 8) / 40, 0, 1) * 255
        img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA')
        c = max(img.size); pad = int(c * marge); sq = Image.new('RGBA', (c + 2 * pad, c + 2 * pad), (0, 0, 0, 0))
        sq.paste(img, ((sq.width - img.width) // 2, sq.height - pad - img.height), img)   # posé en bas de son carré (socles alignés)
        sq.resize((cote, cote), Image.LANCZOS).save(os.path.join(O, dossier, nom + '.webp'), 'WEBP', quality=86, method=6)
    print(fichier, len([n for n in noms if n]))

planche('coupes.png', 3, 2, ['coupe-bi', 'coupe-la', 'coupe-sc', 'coupe-ce', 'coupe-eu', 'coupe-ln'], 'trophees', 192)
planche('prix.png', 4, 4, ['prix-em', 'prix-jm', 'prix-mm', 'prix-je', 'prix-bu', 'prix-rv', 'prix-paP', 'prix-paB', 'prix-paG', 'prix-paA', 'prix-ea', 'prix-ma', 'prix-ja', 'prix-ee', 'prix-me', 'prix-bo'], 'trophees', 128)
planche('produits.png', 3, 3, ['echarpe', 'maillot', 'peluche', 'balai', 'chapeau', 'fanion', 'edition', 'echarpe2', 'choco'], 'bazar', 160)
for n in ['carte-jour', 'carte-nuit']:
    Image.open(os.path.join(A, n + '.png')).convert('RGB').resize((768, 1152), Image.LANCZOS).save(os.path.join(O, 'domaine', n + '.webp') if os.makedirs(os.path.join(O, 'domaine'), exist_ok=True) is None else '', 'WEBP', quality=80, method=6)
print('carte du domaine')
