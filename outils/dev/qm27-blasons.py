#!/usr/bin/env python3
# mon-ecran-version: 70b1fbab
"""QM27 (v108) — redécoupe les blasons des clubs à partir des planches ChatGPT d'origine (blasons-1.png à blasons-4.png, 4 × 3,
dans l'ordre de QMD.CLUBS), sans les rogner : chaque blason est repéré en entier (composantes connexes sur le fond clair),
quelle que soit sa place dans la case, puis détouré (fond transparent, bord adouci) et centré dans un carré de 192 px.
Usage : python3 outils/dev/qm27-blasons.py <dossier des planches> [dossier de sortie, défaut images/qm27/blasons]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27/blasons'
PLANCHES = [
    ['bath', 'york', 'canterbury', 'glastonbury', 'whitby', 'norwich', 'oxford', 'inverness', 'aberdeen', 'stirling', 'conwy', 'swansea'],
    ['aberystwyth', 'galway', 'cork', 'dublin', 'rennes', 'paris', 'lyon', 'carcassonne', 'nantes', 'strasbourg', 'besancon', 'brest'],
    ['toulouse', 'bordeaux', 'marseille', 'poitiers', 'lille', 'montpellier', 'reims', 'grenoble', 'benevento', 'perugia', 'venezia', 'milano'],
    ['torino', 'arezzo', 'napoli', 'roma', 'firenze', 'palermo', 'bologna', 'genova', 'verona', 'trieste', 'bari', 'bergamo'],
]
COTE, MARGE = 192, 0.04

def blasons(path, n):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    dist = np.sqrt(((a - ref) ** 2).sum(-1))
    fg = dist > 30
    lab, N = nd.label(fg); tailles = nd.sum(fg, lab, range(1, N + 1))
    gros = sorted(range(N), key=lambda k: -tailles[k])[:n]
    assert all(tailles[k] > 0.2 * tailles[gros[0]] for k in gros), 'moins de blasons que prévu'
    figs = []
    for k in gros:
        m = nd.binary_fill_holes(lab == k + 1)   # l'intérieur clair du blason (fumée, fantôme, plumes) reste dedans
        ys, xs = np.nonzero(m); figs.append((ys.min(), xs.min(), m))
    hmed = np.median([f[2].any(1).sum() for f in figs])
    figs.sort(key=lambda t: t[0]); rangs, cur = [], []
    for t in figs:
        if cur and t[0] - cur[0][0] > hmed * 0.5: rangs.append(cur); cur = []
        cur.append(t)
    rangs.append(cur)
    return a, dist, [m for r in rangs for (_, _, m) in sorted(r, key=lambda t: t[1])]

def ecrire(a, dist, m, nom):
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    alpha = np.where(m, 255.0, 0.0)
    bord = m & nd.binary_dilation(~m, iterations=2)   # liseré adouci selon l'écart au fond
    alpha[bord] = np.clip((dist[bord] - 10) / 40, 0, 1) * 255
    rgba = np.dstack([a.astype(np.uint8), alpha.astype(np.uint8)])[y0:y1, x0:x1]
    img = Image.fromarray(rgba, 'RGBA'); c = max(img.size); pad = int(c * MARGE)
    carre = Image.new('RGBA', (c + 2 * pad, c + 2 * pad), (0, 0, 0, 0))
    carre.paste(img, ((carre.width - img.width) // 2, (carre.height - img.height) // 2), img)
    os.makedirs(O, exist_ok=True)
    carre.resize((COTE, COTE), Image.LANCZOS).save(os.path.join(O, nom + '.webp'), 'WEBP', quality=86, method=6)

for i, noms in enumerate(PLANCHES):
    a, dist, L = blasons(os.path.join(A, f'blasons-{i + 1}.png'), len(noms))
    for nom, m in zip(noms, L): ecrire(a, dist, m, nom)
    print('blasons', i + 1, 'ok')
