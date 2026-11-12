#!/usr/bin/env python3
# mon-ecran-version: 6673389a
"""QM27 (v99) — découpe la deuxième série de planches ChatGPT et produit les images du jeu (WebP).
Usage : python3 outils/dev/qm27-decoupe2.py <dossier des planches> <couleurs.json>
Planches attendues : visages-1.png et visages-2.png (4 × 4), visages-3.png à visages-5.png (5 × 5),
emblemes-pieces.png (3 × 3), menu.png (7 × 4), modeles.png (4 × 3), fond-nuit.png.
couleurs.json : {"clubs":[{"id","c":[c1,c2]}], "nations":[…]} (exporté depuis QMD.CLUBS et QMV.couleursNation).
Sortie : images/qm27/visages/<groupe>-<n>.webp, emblemes/<NAT>.webp, pieces/<g|m|n>.webp, icones/<vue>.webp,
maillots/<id>-d.webp et <id>-e.webp (domicile, extérieur), fond-nuit.webp."""
import sys, json, os, colorsys, hashlib
import numpy as np
from PIL import Image

A, COUL = sys.argv[1], sys.argv[2]
O = 'images/qm27'
FOND = np.array([244, 241, 234])

def ouvrir(n): return Image.open(os.path.join(A, n)).convert('RGB')
def masque(im, tol=34):
    a = np.asarray(im).astype(int)
    return np.abs(a - a[4:20, 4:20].reshape(-1, 3).mean(0)).sum(2) > tol
def coupes(prof, n, taille):
    """bornes de n segments séparés par des bandes vides ; à défaut, découpe régulière"""
    vide = prof < max(2, prof.max() * 0.01)
    seg, debut = [], None
    for i, v in enumerate(vide):
        if not v and debut is None: debut = i
        if v and debut is not None: seg.append((debut, i)); debut = None
    if debut is not None: seg.append((debut, len(vide)))
    seg = [s for s in seg if s[1] - s[0] > taille / n * 0.25]
    if len(seg) == n:   # milieu des bandes vides comme limites
        b = [0] + [(seg[k][1] + seg[k + 1][0]) // 2 for k in range(n - 1)] + [taille]
        return list(zip(b[:-1], b[1:]))
    pas = taille / n
    return [(round(k * pas), round((k + 1) * pas)) for k in range(n)]
def grille(im, nc, nl):
    m = masque(im)
    cols, lignes = coupes(m.sum(0), nc, im.width), coupes(m.sum(1), nl, im.height)
    return [(x0, y0, x1, y1) for (y0, y1) in lignes for (x0, x1) in cols]
def transparent(im, tol=40):
    """fond uni → transparent (remplissage depuis les bords)"""
    a = np.asarray(im.convert('RGB')).astype(int); h, w = a.shape[:2]
    ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)
    proche = np.abs(a - ref).sum(2) < tol
    vu = np.zeros((h, w), bool); pile = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while pile:
        y, x = pile.pop()
        if vu[y, x] or not proche[y, x]: continue
        vu[y, x] = True
        if y > 0: pile.append((y - 1, x))
        if y < h - 1: pile.append((y + 1, x))
        if x > 0: pile.append((y, x - 1))
        if x < w - 1: pile.append((y, x + 1))
    rgba = np.dstack([a, np.where(vu, 0, 255)]).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bb = out.getbbox()
    return out.crop(bb) if bb else out
def carre(im, cote, marge=0.06):
    w, h = im.size; s = int(max(w, h) * (1 + marge * 2))
    fond = Image.new('RGBA', (s, s), (0, 0, 0, 0)); fond.paste(im, ((s - w) // 2, (s - h) // 2), im if im.mode == 'RGBA' else None)
    return fond.resize((cote, cote), Image.LANCZOS)
def ecrire(im, chemin, q=82):
    os.makedirs(os.path.dirname(chemin), exist_ok=True); im.save(chemin, 'WEBP', quality=q, method=6)

# ---------- visages : un carré tête et épaules par case ----------
GROUPES = [('visages-1.png', 4, [('h1', 16)]), ('visages-2.png', 4, [('h2', 16)]), ('visages-3.png', 5, [('h3', 13), ('hs', 12)]),
           ('visages-4.png', 5, [('f1', 25)]), ('visages-5.png', 5, [('f2', 13), ('fs', 12)])]
compte = {}
for f, n, groupes in GROUPES:
    im = ouvrir(f); cases = grille(im, n, n); i = 0
    for g, k in groupes:
        for z in range(k):
            x0, y0, x1, y1 = cases[i]; i += 1
            w, h = x1 - x0, y1 - y0; s = min(w, h)
            cx = (x0 + x1) // 2; top = y0 + max(0, (h - s) // 4)
            c = im.crop((cx - s // 2, top, cx + s // 2, top + s)).resize((160, 160), Image.LANCZOS)
            ecrire(c, f'{O}/visages/{g}-{z}.webp', 80)
        compte[g] = k
print('visages', compte)

# ---------- emblèmes et pièces ----------
im = ouvrir('emblemes-pieces.png'); cases = grille(im, 3, 3)
for nom, (x0, y0, x1, y1) in zip(['ENG', 'FRA', 'IRL', 'SCO', 'WAL', 'ITA', 'g', 'm', 'n'], cases):
    t = transparent(im.crop((x0, y0, x1, y1)))
    if len(nom) == 3: ecrire(carre(t, 96, 0.02), f'{O}/emblemes/{nom}.webp', 85)
    else: ecrire(carre(t, 48, 0.02), f'{O}/pieces/{nom}.webp', 85)
print('emblèmes et pièces')

# ---------- icônes du menu ----------
VUES = ['accueil', 'boite', 'calendrier', 'effectif', 'tactique', 'entrainement', 'vestiaire', 'formation', 'selection', 'mercato', 'clubs', 'staff', 'club',
        'direction', 'finances', 'stade', 'boutique', 'partenaires', 'domaine', 'trophees', 'classements', 'profil', 'carriere', 'sauvegardes', 'aide',
        'quitterKiosk', 'presse', 'reunion']
im = ouvrir('menu.png'); cases = grille(im, 7, 4)
for v, (x0, y0, x1, y1) in zip(VUES, cases):
    ecrire(carre(transparent(im.crop((x0, y0, x1, y1))), 64, 0.04), f'{O}/icones/{v}.webp', 85)
print('icônes', len(VUES))

# ---------- maillots : 12 modèles rouge / bleu / jaune, recolorés pour chaque équipe ----------
def hexa(c): c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], float)
def lum(c): return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
im = ouvrir('modeles.png'); cases = grille(im, 4, 3)
modeles = []
for (x0, y0, x1, y1) in cases:
    t = transparent(im.crop((x0, y0, x1, y1)), 46)
    a = np.asarray(t).astype(float); rgb = a[..., :3] / 255
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in rgb.reshape(-1, 3)]).reshape(rgb.shape)
    hh, ss, vv = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    coul = (ss > 0.35) & (vv > 0.28)
    cle = np.full(hh.shape, -1)
    cle[coul & ((hh < 22) | (hh > 330))] = 0          # rouge → principale
    cle[coul & (hh >= 200) & (hh <= 275)] = 1         # bleu → secondaire
    cle[coul & (hh >= 22) & (hh < 75)] = 2            # jaune / orangé → liserés
    modeles.append((a, cle, vv))
def peindre(m, c1, c2, c3):
    a, cle, vv = m; out = a.copy()
    for k, c in enumerate([c1, c2, c3]):
        sel = cle == k
        ombre = np.clip(vv[sel] / 0.97, 0.55, 1.05)[:, None]
        out[sel, :3] = np.clip(c[None, :] * ombre, 0, 255)
    return carre(Image.fromarray(out.astype(np.uint8), 'RGBA'), 96, 0.03)
COULEURS = json.load(open(COUL))
CLAIR = hexa('#f2efe6')
for e in COULEURS['clubs'] + COULEURS['nations']:
    c1, c2 = hexa(e['c'][0]), hexa(e['c'][1])
    idx = int(hashlib.md5(('maillot' + e['id']).encode()).hexdigest(), 16) % 12
    lis = c2 if abs(lum(c1) - lum(c2)) > 0.25 else (CLAIR if lum(c1) < 0.5 else hexa('#1d2533'))
    ecrire(peindre(modeles[idx], c1, c2, lis), f'{O}/maillots/{e["id"]}-d.webp', 84)
    ext1 = CLAIR if lum(c1) < 0.6 else hexa('#1d2533')   # extérieur : maillot clair (ou sombre si le domicile est clair)
    ecrire(peindre(modeles[idx], ext1, c1, c1), f'{O}/maillots/{e["id"]}-e.webp', 84)
print('maillots', len(COULEURS['clubs']) + len(COULEURS['nations']), 'équipes × 2')

# ---------- carte de nuit ----------
ouvrir('fond-nuit.png').resize((720, 1080), Image.LANCZOS).save(f'{O}/fond-nuit.webp', 'WEBP', quality=80, method=6)
print('fond de nuit')
