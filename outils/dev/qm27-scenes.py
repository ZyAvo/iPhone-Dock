#!/usr/bin/env python3
# mon-ecran-version: 6318f3f1
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
    'banque': (3, 3, ['coffre-1', 'coffre-2', 'coffre-3', 'plan-vide', 'plan-plein', 'gobelin', 'gobelin-monocle', 'plaque', 'etiquette']),   # v117
}
LARG = 420
# v117 : les images d'une même animation, recalées sur la première (ORB + similitude RANSAC : les parties fixes, l'arche du coffre ou le cadre
# du plan, se superposent au pixel près, seule la partie animée change)
ALIGNER = {'banque-coffre-2':'banque-coffre-1', 'banque-coffre-3':'banque-coffre-1', 'banque-plan-plein':'banque-plan-vide'}

def retoucher_banque(img):
    """Le fond de la banque est arrivé avec un cadre vide au mur de gauche : on le recouvre d'un pan de marbre pris au mur de droite
    (caché ensuite par le coffre), en épargnant le lustre, puis on raccorde le reste du cadre derrière le lustre."""
    import cv2
    im0 = cv2.cvtColor(np.asarray(img.convert('RGB')), cv2.COLOR_RGB2BGR); im = im0.astype(np.float32)
    x0, y0, W, H = 50, 266, 262, 400
    p = cv2.resize(im[345:690, 792:990], (W, H), interpolation=cv2.INTER_CUBIC)
    ref = np.concatenate([im[y0 + 60:y0 + H - 40, x0 - 10:x0].reshape(-1, 3), im[y0 + 60:y0 + H - 40, x0 + W:x0 + W + 6].reshape(-1, 3)]); p = p * (ref.mean(0) / p.mean((0, 1)))
    m = np.zeros(im.shape[:2], np.uint8); cv2.fillPoly(m, [np.array([[57, 273], [307, 337], [307, 658], [57, 642]], np.int32)], 255); m = cv2.dilate(m, np.ones((9, 9), np.uint8))
    hsv = cv2.cvtColor(im0, cv2.COLOR_BGR2HSV); vif = ((hsv[..., 2] > 215) | (hsv[..., 1] > 150)).astype(np.uint8) * 255
    lustre = np.zeros_like(m); lustre[150:332, 188:300] = 255; garde = cv2.dilate(cv2.bitwise_and(lustre, vif), np.ones((5, 5), np.uint8))
    a = cv2.GaussianBlur(cv2.bitwise_and(m, cv2.bitwise_not(garde)).astype(np.float32) / 255, (0, 0), 4)[..., None]
    P = im.copy(); P[y0:y0 + H, x0:x0 + W] = p; out = np.clip(im * (1 - a) + P * a, 0, 255).astype(np.uint8)
    rest = np.zeros_like(m); cv2.line(rest, (190, 305), (300, 336), 255, 14); out = cv2.inpaint(out, cv2.bitwise_and(rest, cv2.bitwise_not(cv2.dilate(garde, np.ones((3, 3), np.uint8)))), 5, cv2.INPAINT_TELEA)
    hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV); z = np.zeros(m.shape, np.uint8); z[312:342, 180:300] = 255
    out = cv2.inpaint(out, cv2.dilate(cv2.bitwise_and(z, ((hsv[..., 1] > 120) & (hsv[..., 2] < 235)).astype(np.uint8) * 255), np.ones((5, 5), np.uint8)), 6, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
RETOUCHE = {'banque':retoucher_banque}

def aligner(nom, base):
    import cv2
    A_ = np.asarray(Image.open(os.path.join(O, base + '.webp')).convert('RGBA')); B_ = np.asarray(Image.open(os.path.join(O, nom + '.webp')).convert('RGBA'))
    orb = cv2.ORB_create(4000); g = lambda X: cv2.cvtColor(X[..., :3], cv2.COLOR_RGB2GRAY)
    ka, da = orb.detectAndCompute(g(A_), (A_[..., 3] > 128).astype(np.uint8)); kb, db = orb.detectAndCompute(g(B_), (B_[..., 3] > 128).astype(np.uint8))
    mt = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(db, da), key=lambda x: x.distance)[:400]
    src = np.float32([kb[x.queryIdx].pt for x in mt]); dst = np.float32([ka[x.trainIdx].pt for x in mt])
    T, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3)
    w = cv2.warpAffine(B_, T, (A_.shape[1], A_.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    Image.fromarray(w, 'RGBA').save(os.path.join(O, nom + '.webp'), 'WEBP', quality=88, method=6)
    print('  recalé', nom, 'sur', base, f'({int(inl.sum())} points, échelle {np.hypot(T[0, 0], T[0, 1]):.3f})')
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
        im = Image.open(f).convert('RGB').resize((1024, 1536), Image.LANCZOS)
        if lieu in RETOUCHE: im = RETOUCHE[lieu](im)
        im.save(os.path.join(O, f'{lieu}-fond.webp'), 'WEBP', quality=80, method=6); print(lieu, 'fond ok')
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
    for nom, base in ALIGNER.items():
        if nom.startswith(lieu + '-'): aligner(nom, base)
print(json.dumps(tailles))
