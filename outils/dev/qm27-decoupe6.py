#!/usr/bin/env python3
# mon-ecran-version: 4878c474
"""QM27 (v129) — Série 6 : icônes du menu et des nouvelles séances, emblèmes des nations sans médaillon.
- icones-menu.png (1536 × 1024, 3 × 2) : vestiaire, bureau du recrutement, progression, travail technique, cohésion, maîtrise tactique
  → images/qm27/icones/equipe.webp, recrutement.webp, progression.webp, maitrise.webp (64 px) et images/qm27/entrainement/technique.webp,
  cohesion.webp (128 px) ;
- emblemes-3.png (1536 × 1024, 6 × 4, 22 cases) : les emblèmes seuls, sans cercle ni liseré → images/qm27/emblemes/<CODE>.webp (128 px,
  remplacent les médaillons de v99 / v109).
Découpe : comme qm27-decoupe5.py (composantes dont le centre tombe dans la case ; trous de vrai fond transparents).
Usage : python3 outils/dev/qm27-decoupe6.py <dossier des planches> [dossier images, défaut images/qm27]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27'

def decouper(fichier, cols, rows, sorties, seuil=26, marge=0.04):
    a = np.asarray(Image.open(os.path.join(A, fichier)).convert('RGB')).astype(np.int16); H, W = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > seuil
    lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1)); cent = nd.center_of_mass(fg, lab, range(1, N + 1)); cases = {}
    for k in range(N):
        if t[k] < 25: continue
        cy, cx = cent[k]; cases.setdefault((min(rows - 1, int(cy // (H / rows))), min(cols - 1, int(cx // (W / cols)))), []).append(k + 1)
    for i, (chemin, cote) in enumerate(sorties):
        if not chemin: continue
        m0 = np.isin(lab, cases.get(divmod(i, cols), [])); m = nd.binary_fill_holes(m0); tr, nt = nd.label(m & ~m0)
        for h in range(1, nt + 1):
            z = tr == h
            if np.median(dist[z]) < 9: m[z] = False
        ys, xs = np.nonzero(m); assert len(ys), f'{fichier} : case {i} vide'
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 8) / 40, 0, 1) * 255
        img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA'); c = max(img.size); pad = int(c * marge)
        sq = Image.new('RGBA', (c + 2 * pad, c + 2 * pad), (0, 0, 0, 0)); sq.paste(img, ((sq.width - img.width) // 2, (sq.height - img.height) // 2), img)
        os.makedirs(os.path.dirname(os.path.join(O, chemin)), exist_ok=True)
        sq.resize((cote, cote), Image.LANCZOS).save(os.path.join(O, chemin), 'WEBP', quality=88, method=6)
    print(fichier, 'ok')

if os.path.exists(os.path.join(A, 'icones-menu.png')):
    decouper('icones-menu.png', 3, 2, [('icones/equipe.webp', 64), ('icones/recrutement.webp', 64), ('icones/progression.webp', 64),
                                       ('entrainement/technique.webp', 128), ('entrainement/cohesion.webp', 128), ('icones/maitrise.webp', 64)])
EMB = ['AUT', 'BEL', 'CZE', 'DEN', 'ENG', 'ESP', 'FIN', 'FRA', 'GER', 'HUN', 'IRL', 'ISL', 'ITA', 'LUX', 'NED', 'NOR', 'POL', 'POR', 'SCO', 'SUI', 'SWE', 'WAL']
if os.path.exists(os.path.join(A, 'emblemes-3.png')):
    decouper('emblemes-3.png', 6, 4, [(f'emblemes/{k}.webp', 128) for k in EMB], marge=0.02)
