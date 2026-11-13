#!/usr/bin/env python3
# mon-ecran-version: ab05f192
"""QM27 (v116) — lieux illustrés façon FM98 : découpe le fond et les objets animés d'un lieu.
- <lieu>-fond.png (portrait 1024 × 1536) → images/qm27/scenes/<lieu>-fond.webp ;
- <lieu>-objets.png (planche, fond uni clair, grille cols × rangs) → images/qm27/scenes/<lieu>-<nom>.webp, recadrés au plus juste
  (pas de carré : l'écran place chaque objet par son centre et sa largeur). Une case peut donner deux pièces (« g » et « d ») :
  ses composantes sont partagées par le milieu, chaque moitié gardant le cadre de la case entière (pour se superposer exactement).
Trous fermés de vrai fond (intérieur du cadre doré) : transparents.
v118 — méthode des RETOUCHES (bien meilleure) : ChatGPT peint la pièce complète, objets en place (image A = le fond), puis la
retouche dans la même conversation (images B, C… : seuls les objets changent). Chaque retouche est recalée sur A (ORB + similitude), puis
on découpe autour de chaque objet un rectangle aux bords fondus, avec son vrai décor : <lieu>-<objet>-<image>.webp, posé à sa place exacte.
RETOUCHES[lieu] = {'zones': {objet: [x0, y0, x1, y1] dans A (1024 × 1536)}, 'pieces': [(objet, image)]}.
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
# v117 : les images d'une même animation, recalées sur la première (ORB + similitude RANSAC : les parties fixes, l'arche du coffre ou le cadre
# du plan, se superposent au pixel près, seule la partie animée change)
ALIGNER = {}   # v117 : {'<lieu>-<objet 2>': '<lieu>-<objet 1>'} (méthode des planches, abandonnée en v118)

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
RETOUCHE = {}   # v117 : {'banque':retoucher_banque} pour l'ancien fond de la banque

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
RETOUCHES = {
    'banque': {'zones':{'coffre':[770, 488, 1016, 798], 'plan':[95, 405, 422, 642], 'gobelin':[388, 632, 676, 850]},
               'pieces':[('coffre', 'B'), ('coffre', 'C'), ('plan', 'C'), ('gobelin', 'B')]},
}
RETOUCHES['bureau'] = {'zones':{'chapeau':[40, 100, 285, 300], 'echarpe':[780, 420, 1024, 830], 'gazette':[548, 760, 870, 905], 'lettre':[190, 800, 448, 902],
                                 'bourse':[10, 1050, 330, 1380]},
                        'pieces':[('chapeau', 'B'), ('echarpe', 'B'), ('gazette', 'B'), ('lettre', 'B'), ('lettre', 'C'), ('lettre', 'D'), ('bourse', 'B')],
                        # l'écharpe seule (détourée sur ses rayures rouges et jaunes), recoloriée par l'écran aux couleurs du club ; on écarte la lanterne
                        'seules':[('echarpe', 'A', None), ('echarpe', 'B', (268, 160, 336, 236))]}

RETOUCHES['equipe'] = {'zones':{'robes':[5, 290, 400, 730], 'couloir':[400, 370, 560, 680], 'tableau':[672, 158, 922, 492], 'balais':[665, 466, 952, 892],
                                 'potions':[918, 86, 1024, 592], 'journal':[0, 972, 322, 1208], 'souaffle':[320, 858, 702, 1232], 'malle':[728, 898, 1024, 1482]},
                        'pieces':[('robes', 'B'), ('couloir', 'B'), ('tableau', 'B'), ('tableau', 'C'), ('balais', 'B'), ('potions', 'B'), ('journal', 'B'), ('souaffle', 'B'), ('malle', 'B')],
                        'seules':[('robes', 'A', (0, 0, 400, 48)), ('robes', 'B', (0, 0, 400, 48))]}   # v121 : le vestiaire (page Équipe), robes aux couleurs du club

def seule_echarpe(img, sans, plusieurs=False):
    import cv2
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    rouge = ((H <= 6) | (H >= 170)) & (S > 150) & (V > 90)
    m = (rouge | ((H >= 17) & (H <= 32) & (S > 150) & (V > 170))).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    # plusieurs : les quatre robes ; un morceau garde du rouge vif et de la hauteur (les patères et l'anneau de laiton de la porte n'en ont pas)
    garde = [k for k in range(1, n) if st[k, 4] > 2500 and st[k, 3] > 120 and rouge[lab == k].mean() > 0.15] if plusieurs else [1 + np.argmax(st[1:, 4])]
    m = nd.binary_fill_holes(np.isin(lab, garde)).astype(np.uint8); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    if sans: x0, y0, x1, y1 = sans; m[y0:y1, x0:x1] = 0
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)
FONDU = 14
for lieu, R in RETOUCHES.items():
    fA = os.path.join(A, f'{lieu}-A.png')
    if not os.path.exists(fA): continue
    import cv2
    a = cv2.imread(fA); a = cv2.resize(a, (1024, 1536), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(O, f'{lieu}-fond.webp'), a, [cv2.IMWRITE_WEBP_QUALITY, 82]); print(lieu, 'fond (image A) ok')
    orb = cv2.ORB_create(6000); ka, da = orb.detectAndCompute(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), None); regs = {}
    for obj, im in R['pieces']:
        if im not in regs:
            b = cv2.resize(cv2.imread(os.path.join(A, f'{lieu}-{im}.png')), (1024, 1536), interpolation=cv2.INTER_AREA)
            kb, db = orb.detectAndCompute(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), None)
            mt = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(db, da), key=lambda x: x.distance)[:1500]
            T, inl = cv2.estimateAffinePartial2D(np.float32([kb[m.queryIdx].pt for m in mt]), np.float32([ka[m.trainIdx].pt for m in mt]), method=cv2.RANSAC, ransacReprojThreshold=2)
            regs[im] = cv2.warpAffine(b, T, (1024, 1536), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); print(f'  image {im} recalée ({int(inl.sum())} points)')
        x0, y0, x1, y1 = R['zones'][obj]; p = regs[im][y0:y1, x0:x1]
        al = np.zeros(p.shape[:2], np.float32); al[FONDU:-FONDU, FONDU:-FONDU] = 1; al = cv2.GaussianBlur(al, (0, 0), FONDU / 2.2)
        rgba = np.dstack([cv2.cvtColor(p, cv2.COLOR_BGR2RGB), (al * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(O, f'{lieu}-{obj}-{im}.webp'), 'WEBP', quality=86, method=6)
        tailles[f'{lieu}-{obj}-{im}'] = [x0, y0, x1, y1]
    for obj, im, sans in R.get('seules', []):
        x0, y0, x1, y1 = R['zones'][obj]; p = (a if im == 'A' else regs[im])[y0:y1, x0:x1]; al = seule_echarpe(p, sans, obj == 'robes')
        Image.fromarray(np.dstack([cv2.cvtColor(p, cv2.COLOR_BGR2RGB), (np.clip(al, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(O, f'{lieu}-{obj}-{im}-seule.webp'), 'WEBP', quality=88, method=6)
print(json.dumps(tailles))
