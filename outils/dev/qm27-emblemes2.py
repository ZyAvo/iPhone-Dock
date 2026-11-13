#!/usr/bin/env python3
# mon-ecran-version: e2aec129
"""QM27 (v109) — emblèmes ronds des 13 nouvelles sélections (et 3 de réserve) à partir de la planche ChatGPT emblemes-2.png
(4 × 4, ordre ci-dessous). Même méthode que qm27-blasons.py : chaque médaillon est repéré en entier (composantes connexes
sur le fond clair, intérieur crème gardé), détouré et centré dans un carré de 96 px.
Usage : python3 outils/dev/qm27-emblemes2.py <dossier des planches> [dossier de sortie, défaut images/qm27/emblemes]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage as nd
A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27/emblemes'
ORDRE = ['ESP', 'DEN', 'SWE', 'NOR', 'FIN', 'ISL', 'GER', 'BEL', 'NED', 'LUX', 'POL', 'AUT', 'CZE', 'POR', 'SUI', 'HUN']   # POR, SUI, HUN : réserve
a = np.asarray(Image.open(os.path.join(A, 'emblemes-2.png')).convert('RGB')).astype(np.int16)
ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > 30
lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1))
gros = sorted(range(N), key=lambda k: -t[k])[:len(ORDRE)]
assert all(t[k] > 0.2 * t[gros[0]] for k in gros), 'moins d\'emblèmes que prévu'
F = []
for k in gros:
    m = nd.binary_fill_holes(lab == k + 1); ys, xs = np.nonzero(m); F.append((ys.min(), xs.min(), m))
h = np.median([f[2].any(1).sum() for f in F]); F.sort(key=lambda x: x[0]); R, cur = [], []
for f in F:
    if cur and f[0] - cur[0][0] > h * 0.5: R.append(cur); cur = []
    cur.append(f)
R.append(cur); L = [m for r in R for (_, _, m) in sorted(r, key=lambda x: x[1])]
os.makedirs(O, exist_ok=True)
for nom, m in zip(ORDRE, L):
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 10) / 40, 0, 1) * 255
    img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA'); c = max(img.size); pad = int(c * 0.02)
    sq = Image.new('RGBA', (c + 2 * pad, c + 2 * pad), (0, 0, 0, 0)); sq.paste(img, ((sq.width - img.width) // 2, (sq.height - img.height) // 2), img)
    sq.resize((96, 96), Image.LANCZOS).save(os.path.join(O, nom + '.webp'), 'WEBP', quality=85, method=6)
print('emblèmes', len(ORDRE))
