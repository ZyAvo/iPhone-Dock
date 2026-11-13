#!/usr/bin/env python3
# mon-ecran-version: 7caf9edf
"""QM27 (v115) — Série 5 : logos des sponsors, icônes des postes et de l'entraînement, vitrine de la salle des trophées.
Planches (ChatGPT, fond uni beige clair) :
- logos.png (1536 × 1024, 5 × 4) : les 20 sponsors dans l'ordre de QMD.SPONSORS → images/qm27/sponsors/01.webp à 20.webp (160 px) ;
- postes-entrainement.png (1536 × 1024, 6 × 4) : rangée 1 postes P, B, A, G + repos + jour de match, rangée 2 les six séances
  (QMG.SEANCES), rangées 3-4 les ateliers (QMG.ATELIERS, P puis B, A puis G) → images/qm27/postes/<P|B|A|G>.webp et
  images/qm27/entrainement/<id>.webp (128 px) ;
- vitrine.png (1536 × 1024, plein cadre) → images/qm27/trophees/vitrine.webp (1152 × 768).
Chaque pièce = toutes les composantes (sur le fond) dont le centre tombe dans sa case : les traînées, étincelles, flèches
pointillées et vapeurs détachées suivent leur objet. Les trous fermés qui sont du vrai fond (intérieur d'un anneau) restent transparents.
Usage : python3 outils/dev/qm27-decoupe5.py <dossier des planches> [dossier images, défaut images/qm27] ; une planche absente est sautée."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

A = sys.argv[1]; O = sys.argv[2] if len(sys.argv) > 2 else 'images/qm27'
ici = lambda f: os.path.exists(os.path.join(A, f))

def decouper(fichier, cols, rows, noms, cote, dossier, seuil=26):
    a = np.asarray(Image.open(os.path.join(A, fichier)).convert('RGB')).astype(np.int16); H, W = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    dist = np.sqrt(((a - ref) ** 2).sum(-1)); fg = dist > seuil
    lab, N = nd.label(fg); t = nd.sum(fg, lab, range(1, N + 1)); cent = nd.center_of_mass(fg, lab, range(1, N + 1))
    cases = {}
    for k in range(N):
        if t[k] < 25: continue   # poussières
        cy, cx = cent[k]; cases.setdefault((min(rows - 1, int(cy // (H / rows))), min(cols - 1, int(cx // (W / cols)))), []).append(k + 1)
    os.makedirs(os.path.join(O, dossier), exist_ok=True)
    for i, nom in enumerate(noms):
        if not nom: continue
        m0 = np.isin(lab, cases.get(divmod(i, cols), [])); m = nd.binary_fill_holes(m0)
        tr, nt = nd.label(m & ~m0)
        for h in range(1, nt + 1):
            z = tr == h
            if np.median(dist[z]) < 9: m[z] = False   # vrai fond enfermé
        ys, xs = np.nonzero(m)
        assert len(ys), f'{fichier} : case {i} ({nom}) vide'
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        al = np.where(m, 255.0, 0.0); bord = m & nd.binary_dilation(~m, iterations=2); al[bord] = np.clip((dist[bord] - 8) / 40, 0, 1) * 255
        img = Image.fromarray(np.dstack([a.astype(np.uint8), al.astype(np.uint8)])[y0:y1, x0:x1], 'RGBA')
        c = max(img.size); pad = int(c * 0.04)
        carre = Image.new('RGBA', (c + 2 * pad, c + 2 * pad), (0, 0, 0, 0))
        carre.paste(img, ((carre.width - img.width) // 2, (carre.height - img.height) // 2), img)
        carre.resize((cote, cote), Image.LANCZOS).save(os.path.join(O, dossier, nom + '.webp'), 'WEBP', quality=86, method=6)
    print(fichier, 'ok', len([n for n in noms if n]), 'pièces')

if ici('logos.png'): decouper('logos.png', 5, 4, [f'{k:02d}' for k in range(1, 21)], 160, 'sponsors')
if ici('postes-entrainement.png'):
    E = ['repos', 'jour-match', 'physique', 'vol', 'balle', 'tactique', 'match', 'recup',
         'P-tirs', 'P-passes', 'P-duels', 'B-frappe', 'B-protection', 'B-volserre', 'A-pique', 'A-lynx', 'A-duel', 'G-arrets', 'G-sorties', 'G-relance']
    noms = ['../postes/P', '../postes/B', '../postes/A', '../postes/G'] + E
    os.makedirs(os.path.join(O, 'postes'), exist_ok=True)
    decouper('postes-entrainement.png', 6, 4, noms, 128, 'entrainement')
if ici('vitrine.png'):
    os.makedirs(os.path.join(O, 'trophees'), exist_ok=True)
    Image.open(os.path.join(A, 'vitrine.png')).convert('RGB').resize((1152, 768), Image.LANCZOS).save(os.path.join(O, 'trophees', 'vitrine.webp'), 'WEBP', quality=80, method=6)
    print('vitrine.png ok')
