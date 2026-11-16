#!/usr/bin/env python3
# mon-ecran-version: e6e98879
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
v139 : RETOUCHES[lieu]['taille'] = (largeur, hauteur) pour une autre taille que 1024 × 1536 (le stade en panorama paysage) ;
les calques de Qwen sont agrandis à cette taille.
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
RETOUCHES['bureau'] = {'zones':{'chapeau':[10, 110, 225, 310], 'echarpe':[800, 270, 1024, 860], 'gazette':[610, 820, 945, 1000], 'lettre':[110, 880, 345, 990],
                                 'bourse':[0, 1020, 260, 1310]},
                        'pieces':[('chapeau', 'B'), ('echarpe', 'B'), ('gazette', 'B'), ('lettre', 'B'), ('lettre', 'C'), ('lettre', 'D'), ('bourse', 'B')],
                        # v131 : bureau repeint, écharpe BLANC et GRIS (A au repos, B qui ondule) ; couche « gris » teinte aux couleurs du club (on écarte la bougie)
                        'gris':[('echarpe', 'A', 172, [[795, 530, 828, 615]]), ('echarpe', 'B', 172, [[795, 530, 828, 615]])]}

# v147 : le vestiaire repeint (lumière chaude) : A (repos), B robes au vent, C portes du tunnel grandes ouvertes, D la plume écrit,
# E balais en l'air, F mannequin frappé et souafle qui s'élève, G cognards qui tirent sur leurs sangles, H potions qui brillent ;
# robes BLANC et ANTHRACITE (A et B), couches « gris » teintes aux couleurs du club (le cuir des gants et ceintures, saturé, reste)
RETOUCHES['equipe'] = {'zones':{'robes':[0, 370, 385, 835], 'porte':[330, 340, 730, 1080], 'plume':[35, 1105, 300, 1305], 'balais':[700, 515, 1024, 950],
                                 'mannequin':[375, 720, 655, 1060], 'malle':[755, 985, 1024, 1510], 'potions':[908, 225, 1024, 535]},
                        'pieces':[('robes', 'B'), ('porte', 'C'), ('plume', 'D'), ('balais', 'E'), ('mannequin', 'F'), ('malle', 'G'), ('potions', 'H')],
                        'gris':[('robes', 'A', 150, []), ('robes', 'B', 150, [])]}

RETOUCHES['recrutement'] = {'zones':{'portraits':[40, 125, 435, 498], 'dossiers':[80, 495, 300, 820], 'sorciere':[330, 400, 690, 780], 'hibou':[745, 340, 1024, 790],
                                      'globe':[740, 875, 1024, 1450]},
                             'pieces':[('portraits', 'B'), ('dossiers', 'B'), ('sorciere', 'B'), ('hibou', 'B'), ('globe', 'B')]}   # v122 : le bureau du recrutement

# v132 : quatre nouvelles pièces, images A (repos) et B (tout bouge)
RETOUCHES['salon'] = {'zones':{'carte':[350, 90, 730, 525], 'malle':[125, 1080, 810, 1485], 'lettre':[770, 840, 1024, 1110]},   # le salon du manager
                      'pieces':[('carte', 'B'), ('malle', 'B'), ('lettre', 'B')]}
RETOUCHES['pensionnat'] = {'zones':{'portrait':[0, 130, 248, 556], 'livre':[340, 470, 820, 728], 'hibou':[660, 195, 1024, 560], 'balais':[575, 940, 1024, 1475]},   # le centre de formation
                           'pieces':[('portrait', 'B'), ('livre', 'B'), ('hibou', 'B'), ('balais', 'B')]}
RETOUCHES['hall'] = {'zones':{'hiboux':[0, 40, 410, 1085], 'calendrier':[620, 265, 1024, 760], 'livre':[695, 725, 1015, 1420]},   # le hall d'entrée du club
                     'pieces':[('hiboux', 'B'), ('calendrier', 'B'), ('livre', 'B')]}
# la Fédération : bannières, coupe et globe s'animent ensemble (les bannières qui ondulent débordent les unes sur les autres et sur la coupe) :
# une seule retouche, l'image B entière
RETOUCHES['federation'] = {'zones':{'tout':[0, 0, 1024, 1536]}, 'pieces':[('tout', 'B')]}

# v124 : le Bazar ; l'ardoise s'efface (B), et une couche « articles » = les tissus rouge et jaune des rayons, recoloriés aux couleurs du club
# v134 : l'entrée du stade. A (repos), B (la gobeline tend un billet), C (les chopes de l'enseigne trinquent). La tente est peinte en BLANC et
# GRIS ANTHRACITE (sorti bleu marine) : couches « gris » détourées dans sa silhouette (calque 1 de Qwen-Image-Layered), sans l'enseigne (cercle)
# ni le comptoir et ses chopes d'étain. « avant » = le premier plan (piliers, grille, guichet…) détouré d'après le calque 3 de Qwen, pour que
# le vif d'or vole DERRIÈRE la grille et les piliers. Calques de Qwen : <dossier>/entree-calques/<n>.png (512 × 768, agrandis ×2).
CHOPES = (679, 669, 45)
RETOUCHES['entree'] = {'zones':{'gobeline':[12, 760, 238, 978], 'chopes':[626, 614, 732, 724], 'tente':[570, 465, 735, 864]},
                       'pieces':[('gobeline', 'B'), ('chopes', 'C')],
                       # v134 : ChatGPT a légèrement redessiné le guichet dans B : recalage LOCAL (sur la pierre et la marquise autour de la niche, sans
                       # la gobeline), et on ne pose que l'intérieur de la niche (le sombre de A, bouché ligne à ligne jusqu'à l'appui) : la fenêtre reste celle de A
                       'locaux':{'gobeline':{'region':[0, 640, 262, 1060], 'sans':[[60, 770, 190, 950]]}},
                       'interieurs':{'gobeline':{'boite':[40, 725, 210, 960], 'vmax':105, 'ymax':944, 'marge':2}},
                       'gris':[('tente', 'A', 130, [CHOPES, [640, 772, 735, 864], [668, 716, 735, 772]], {'calque':1}), ('chopes', 'C', 130, [CHOPES], {'calque':1})],
                       'avant':{'calque':3, 'fer':[[232, 230, 322, 1150], [724, 236, 804, 1150]],
                                'plein':[[30, 135, 238, 1190], [782, 135, 1000, 1190], [0, 452, 56, 1190], [972, 452, 1024, 1190], [0, 1030, 1024, 1536]],
                                'vide':[[560, 460, 724, 866]], 'haut':1060},
                       # v136 : le masque du ciel (bleu franc et clair) pour la brume qui le traverse, sans la tente
                       'ciel':{'haut':720, 'vide':[]}}

def calque_qwen(lieu, n):
    import cv2
    f = os.path.join(A, f'{lieu}-calques', f'{n}.png')
    if not os.path.exists(f): return None
    q = np.asarray(Image.open(f).convert('RGBA'))[..., 3].astype(np.float32) / 255
    return np.clip((cv2.resize(q, (W, H), interpolation=cv2.INTER_CUBIC) - .3) / .4, 0, 1)

def couche_avant(a, al, R):
    """Le premier plan : calque de Qwen agrandi ; dans la grille (« fer »), seuls le fer vert-de-gris, l'or des pointes et le très sombre restent
    (le ciel et la pelouse entre les barreaux redeviennent transparents) ; « plein » : opaque (piliers, murs, dallage) ; « vide » : transparent."""
    import cv2
    h = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(int); H, S, V = h[..., 0], h[..., 1], h[..., 2]
    fer = (((H >= 75) & (H <= 102) & (S > 45)) | ((H >= 10) & (H <= 34) & (S > 90) & (V > 110)) | (V < 75)).astype(np.uint8)
    fer = cv2.morphologyEx(fer, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    for x0, y0, x1, y1 in R['fer']: al[y0:y1, x0:x1] *= cv2.GaussianBlur(fer[y0:y1, x0:x1].astype(np.float32), (0, 0), .6)
    for x0, y0, x1, y1 in R['plein']: al[y0:y1, x0:x1] = 1
    for x0, y0, x1, y1 in R['vide']: al[y0:y1, x0:x1] = 0
    return np.dstack([cv2.cvtColor(a, cv2.COLOR_BGR2RGB), (al * 255).astype(np.uint8)])[:R['haut']]

def bord_nuit(a, haut):
    """v149 : ligne du haut des murs sous un ciel de nuit, colonne par colonne. Deux lectures : avec les nuages (bleu ou clair peu saturé), qui
    prend aussi le liseré bleuté du haut des murs ; sans eux (bleu nuit profond, rouge < 52), juste là où il n'y a pas de nuage. Là où les
    deux s'écartent trop (un nuage posé sur le mur), on garde la première remontée de l'écart habituel."""
    import cv2
    from scipy import ndimage as nd
    H, W = a.shape[:2]; k = W / 1536; f = a.astype(int); b, g, r = f[..., 0], f[..., 1], f[..., 2]
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(int); clair = (hsv[..., 2] > 150) & (hsv[..., 1] < 70)
    def bord(c, run=int(12 * k)):
        c = c.copy(); c[haut:] = False; out = np.zeros(W, int)
        for x in range(W):
            rr = np.convolve((~c[:, x]).astype(int), np.ones(run, int), 'valid'); out[x] = np.argmax(rr >= run)
        return nd.median_filter(out, size=int(41 * k) | 1)
    b1 = bord(((b > r + 25) & (b > g + 8)) | clair); b2 = bord(((b > r + 25) & (b > g + 8) & (r < 52)) | clair)
    d = b1 - b2; ok = d < int(40 * k); delta = int(np.median(d[ok])) if ok.any() else 0
    return nd.median_filter(np.where(d > delta + int(15 * k), b1 - delta, b2), size=int(9 * k) | 1)

def couche_ciel(a, R):
    """v136 : masque du ciel (alpha) : bleu franc et clair (teinte 96-114, saturation > 55, valeur > 215), un pixel rogné et adouci
    (pas de liseré clair contre la cime des arbres) ; la brume du jeu n'apparaît qu'à travers lui.
    v149 : regle 'nuit' (plafond enchanté de la grande salle) : tout ce qui est au-dessus du haut des murs (bord_nuit), rogné de `rogne` px."""
    import cv2
    if R.get('regle') == 'nuit':
        H, W = a.shape[:2]; bm = bord_nuit(a, R['haut']); m = (np.arange(R['haut'])[:, None] < bm[None, :]).astype(np.uint8)
        for P in R.get('sans', []): cv2.fillPoly(m, [np.array(P, np.int32)], 0)   # v150 : zones gardées hors du ciel (polygones)
        m = cv2.erode(m, np.ones((2 * R.get('rogne', 6) + 1,) * 2, np.uint8)); al = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2)
        return np.dstack([np.full(al.shape + (3,), 255, np.uint8), (al * 255).astype(np.uint8)])
    h = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(int)[:R['haut']]
    m = ((h[..., 0] >= 96) & (h[..., 0] <= 114) & (h[..., 1] > 55) & (h[..., 2] > 215)).astype(np.uint8)
    for x0, y0, x1, y1 in R['vide']: m[y0:y1, x0:x1] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); m = cv2.erode(m, np.ones((3, 3), np.uint8))
    al = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)
    return np.dstack([np.full(al.shape + (3,), 255, np.uint8), (al * 255).astype(np.uint8)])

def rechauffer(img, C):
    """v149 : réchauffe la pierre grise du haut des murs : gains R, V, B pondérés par la hauteur (plein au-dessus de y0, rien sous y1) et par
    le gris (couleurs franches, bleu du ciel, des vitraux et du liseré de lune intacts). Appliqué de la même façon à A et aux retouches."""
    import cv2
    H, W = img.shape[:2]; f = img.astype(np.float32)
    yy = np.clip((C['y1'] - np.arange(H)) / (C['y1'] - C['y0']), 0, 1)[:, None]
    gris = np.clip(1 - cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 1].astype(np.float32) / 255 / C['smax'], 0, 1)
    bleu = np.clip((f[..., 0] - f[..., 2] - 8) / 25, 0, 1)
    w = yy * gris * (1 - bleu); g = np.array(C['gain'], np.float32)[::-1]
    if 'bord' in C: w = w * np.clip((np.arange(H)[:, None] - C['bord'][None, :] - 4) / 10, 0, 1)   # rien au-dessus du haut des murs
    return np.clip(f * (1 + w[..., None] * (g - 1)), 0, 255).astype(np.uint8)

def couche_nuages(a, ciel_al, N, l, h):
    """v150 : gros nuages qui passent devant la lune : des nuages PEINTS de l'image A, détourés (plus clairs que le ciel de leur ligne, bleutés,
    sans étoiles ni lune, dans le masque du ciel, bords adoucis), puis posés agrandis (et retournés au besoin) sur une tuile transparente de
    la largeur de la scène × la bande du ciel, qui se raccorde de gauche à droite. N = {'boites':[[x0, y0, x1, y1]], 'poses':[(i, x, y, k, miroir)],
    'lune':(x, y, r)} ; tuile rendue à moitié de sa taille."""
    import cv2
    from scipy import ndimage as nd
    H, W = a.shape[:2]; cm = np.zeros((H, W), np.float32); cm[:ciel_al.shape[0]] = ciel_al
    yy, xx = np.mgrid[0:H, 0:W]; lx, ly, lr = N['lune']; dl = np.sqrt((xx - lx) ** 2 + (yy - ly) ** 2)
    hors_lune = np.clip((dl - lr) / (lr * .8), 0, 1)
    def extraire(x0, y0, x1, y1):
        cc = a[y0:y1, x0:x1].astype(np.float32); hsv = cv2.cvtColor(a[y0:y1, x0:x1], cv2.COLOR_BGR2HSV).astype(np.float32); v = cc.mean(2)
        m = (cm[y0:y1, x0:x1] > .5) & (hors_lune[y0:y1, x0:x1] > .99)
        ciel = np.array([np.percentile(v[i][m[i]], 20) if m[i].any() else np.nan for i in range(v.shape[0])]); ciel = np.nan_to_num(ciel, nan=np.nanmedian(ciel))[:, None]
        al = np.clip((v - ciel - 5) / 55, 0, 1) * np.clip(1.25 - hsv[..., 1] / 255, 0, 1)
        op = nd.grey_opening(al, size=(9, 9)); et = al > op + .3; al[et] = op[et]   # les étoiles
        al = al * cm[y0:y1, x0:x1] * (((hsv[..., 0] >= 95) & (hsv[..., 0] <= 135)) | (hsv[..., 1] < 40))
        al = np.clip((al - .14) / .86, 0, 1)
        lab, n = nd.label(al > .05); t = nd.sum(al > .05, lab, range(1, n + 1)); al = al * nd.binary_dilation(np.isin(lab, 1 + np.nonzero(t > 1500)[0]), iterations=3)
        al = np.clip(nd.gaussian_filter(al, .9) * 1.35, 0, 1) * hors_lune[y0:y1, x0:x1]
        fy = np.clip(np.minimum(np.arange(al.shape[0]), al.shape[0] - 1 - np.arange(al.shape[0])) / 40, 0, 1); fx = np.clip(np.minimum(np.arange(al.shape[1]), al.shape[1] - 1 - np.arange(al.shape[1])) / 40, 0, 1)
        al = al * fy[:, None] * fx[None, :]
        sk = np.array([[np.percentile(cc[i, :, k], 20) for k in range(3)] for i in range(cc.shape[0])])[:, None, :]
        col = np.clip((cc - sk * (1 - al[..., None] / 1.35)) / np.maximum(al[..., None] / 1.35, .08), 0, 255)
        return Image.fromarray(np.dstack([col[..., ::-1], al * 255]).astype(np.uint8), 'RGBA')
    nuages = [extraire(*b) for b in N['boites']]; T = Image.new('RGBA', (l, h), (0, 0, 0, 0))
    for i, x, y, k, miroir in N['poses']:
        im = nuages[i].resize((int(nuages[i].width * k), int(nuages[i].height * k)), Image.LANCZOS)
        if miroir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        for dx in (-l, 0, l):
            px = int(x - im.width / 2 + dx)
            if -im.width < px < l: T.alpha_composite(im, (px, int(y - im.height / 2)))
    return T.resize((l // 2, h // 2), Image.LANCZOS)

def texture_brume(l=1024, h=360, graine=27):
    """v136 : voiles de brume blanche, raccord sans couture de gauche à droite (bruit périodique), une tuile = deux largeurs de scène."""
    from scipy import ndimage as nd
    rng = np.random.default_rng(graine); n = np.zeros((h, l), np.float32)
    for sig, poids in [(90, 1), (40, .5), (16, .18)]:   # de longs voiles étirés à l'horizontale, peu de détail
        f = nd.gaussian_filter(rng.standard_normal((h, l)).astype(np.float32), (sig * .3, sig), mode=('nearest', 'wrap'))
        n += poids * f / f.std()
    yy = np.linspace(0, 1, h)[:, None]; n += .9 * np.exp(-((yy - .45) / .3) ** 2) - .5   # plus dense au milieu de la bande, rien en haut ni en bas
    al = np.clip((n + .1) / 2.6, 0, 1) ** 1.5 * .85
    ombre = np.clip(nd.gaussian_filter(al, 6, mode='wrap') - al, 0, 1)   # dessous des voiles un peu bleuté
    rgb = np.dstack([255 - 40 * ombre, 255 - 30 * ombre, np.full_like(al, 255)])
    return np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8)

# v139 : le stade, panorama paysage : image A de ChatGPT 1536 × 1024, recadrée en haut (0-900) puis agrandie ×2 (qm27-agrandir.py) : 3072 × 1800 ;
# B portail du château ouvert, C tunnel illuminé, D chopes qui trinquent, E écharpes au vent et balais qui flottent (chacune refaite depuis A).
# Tissus blanc et anthracite (tente, articles de l'échoppe, fanions de la balustrade) détourés par la règle « tissu » ; premier plan = les trois
# perches et leurs anneaux (calque 3 de Qwen) : le vif d'or passe derrière ; le ciel pour la brume.
CHOPES_ST = (937, 1062, 71)
RETOUCHES['stade'] = {'taille':(3072, 1800),
    'zones':{'grille':[0, 750, 372, 1252], 'echoppe':[345, 985, 740, 1372], 'tente':[735, 790, 1140, 1310], 'chopes':[858, 985, 1018, 1142],
             'tunnel':[1600, 1100, 2056, 1380], 'portail':[2525, 895, 2975, 1350], 'fanions':[1100, 985, 2480, 1082]},
    'pieces':[('portail', 'B'), ('tunnel', 'C'), ('chopes', 'D'), ('echoppe', 'E')],
    'gris':[('tente', 'A', 0, [CHOPES_ST, [850, 1150, 1030, 1310]], {'regle':'tissu', 'aire':8000}), ('chopes', 'D', 0, [CHOPES_ST], {'regle':'tissu', 'aire':200}),
            ('echoppe', 'A', 0, [[470, 1180, 560, 1225]], {'regle':'tissu', 'aire':300, 'blanc':(50, 160)}), ('echoppe', 'E', 0, [[470, 1180, 560, 1225]], {'regle':'tissu', 'aire':300, 'blanc':(50, 160)}),
            ('fanions', 'A', 0, [], {'regle':'tissu', 'aire':150})],
    'avant':{'calque':3, 'fer':[], 'plein':[], 'vide':[], 'haut':1500},
    'ciel':{'haut':1000, 'vide':[]}}

# v149 : la grande salle, panorama paysage sous un plafond enchanté de nuit : A de ChatGPT 1536 × 1024 agrandie ×2 (qm27-agrandir.py) : 3072 × 2048 ;
# B bannières au vent et éclat sur la coupe, C hibou qui déploie ses ailes et lettre qui s'envole, D la Gazette s'ouvre, F porte entrouverte sur le
# couloir (E, l'almanach aux pages en éventail, écartée : le jeu fait le halo et les dates qui s'élèvent). Pierre du haut des murs réchauffée
# (`chaud`), ciel de nuit au-dessus du haut des murs (`ciel` règle « nuit ») pour les étoiles, les nuages et les bougies flottantes.
RETOUCHES['grandesalle'] = {'taille':(3072, 2048), 'chaud':{'y0':840, 'y1':1280, 'gain':(1.22, 1.06, .8), 'smax':.45},
    'zones':{'porte':[0, 730, 324, 1210], 'gazette':[30, 1160, 530, 1430], 'estrade':[1100, 480, 1990, 1200], 'hiboux':[2470, 590, 2968, 1280]},
    'pieces':[('porte', 'F'), ('gazette', 'D'), ('estrade', 'B'), ('hiboux', 'C')],
    'ciel':{'regle':'nuit', 'haut':560, 'rogne':8,
            # v150 : le parapet bleuté des murs de côté reste hors du ciel (les nuages qui passent glissaient dessus)
            'sans':[[(0, 0), (160, 0), (400, 262), (690, 398), (690, 560), (0, 560)], [(2935, 0), (3072, 0), (3072, 560), (2340, 560), (2345, 392), (2625, 300)]],
            # v150 : deux nuages peints de A (le nuage voisin de la lune et la longue traînée de gauche), agrandis : ils passent devant la lune
            'nuages':{'boites':[[1620, 230, 2200, 440], [330, 90, 1230, 440]], 'poses':[(0, 700, 220, 1.7, False), (1, 2150, 230, 1.15, True)], 'lune':(2226, 206, 140)}}}

# v143 : le hall du château (remplace l'ancien hall) : B porte de l'infirmerie entrouverte, C double porte de la grande salle ouverte et bannières au vent,
# D lueur et vapeur vertes du sous-sol, E grande bannière qui ondule et lustre plus brillant ; la grande bannière blanc et gris (A et E) est teinte.
RETOUCHES['chateau'] = {'zones':{'infirmerie':[62, 635, 292, 960], 'salle':[725, 530, 1000, 975], 'soussol':[0, 960, 320, 1360],
                                 'escalier':[330, 0, 700, 960], 'banniere':[440, 170, 590, 612]},
                        'pieces':[('infirmerie', 'B'), ('salle', 'C'), ('soussol', 'D'), ('escalier', 'E')],
                        'gris':[('banniere', 'A', 95, [], {'aire':400}), ('banniere', 'E', 95, [], {'aire':400})]}   # blanc chaud ici : seuil de saturation simple

RETOUCHES['boutique'] = {'zones':{'ardoise':[285, 728, 745, 1325]}, 'pieces':[('ardoise', 'B')],   # v128 : la couche « articles » recoloriée est retirée (« couches_v124 » n'est plus lu)
                         'couches_v124':[('articles', [0, 110, 1004, 1040],
                                     [[0, 110, 236, 572], [236, 272, 392, 702], [0, 636, 272, 1036], [625, 178, 812, 552], [808, 446, 1004, 752], [652, 556, 802, 752]],
                                     [[212, 186, 300, 362], [726, 316, 788, 412], [280, 720, 752, 1040]])]}   # (nom, cadre, rayons, écartés : lanternes et cadre de l'ardoise)

def couche_tissus(img, cadre, boites, sans):
    import cv2
    x0, y0, x1, y1 = cadre; z = img[y0:y1, x0:x1]; hsv = cv2.cvtColor(z, cv2.COLOR_BGR2HSV).astype(int); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = (((H <= 11) | (H >= 165) | ((H >= 11) & (H <= 36))) & (S > 105) & (V > 75)).astype(np.uint8)
    garde = np.zeros_like(m)
    for bx0, by0, bx1, by1 in boites: garde[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0] = 1
    for bx0, by0, bx1, by1 in sans: garde[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0] = 0
    m = cv2.morphologyEx(m * garde, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.isin(lab, [k for k in range(1, n) if st[k, 4] > 150]).astype(np.float32)
    return z, cv2.GaussianBlur(m, (0, 0), 0.7)

def jaunir(z):
    """Les jaunes tirant sur l'orange (22-38°) passent au jaune franc (50°) : l'écran ne recolorie que le rouge et le jaune (pas l'orange),
    sinon une partie des rayures gardait sa couleur d'origine. Seulement sur les couches détourées (tissus), jamais sur le décor."""
    import cv2
    hsv = cv2.cvtColor(z, cv2.COLOR_BGR2HSV); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    w = (H >= 11) & (H <= 19) & (S > 105) & (V > 120); hsv[..., 0] = np.where(w, 25, H)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

# v129 : le Bazar refait avec des tissus BLANC et GRIS ANTHRACITE (images A, B) et un MASQUE (image C : tissus en magenta, le reste en noir).
# Couche « tissus » = magenta de C (bien calé sur A) ∩ pixels peu saturés de A (les lanternes, balais, vifs d'or que le masque prend aussi
# sont saturés) − la fenêtre et les lanternes. L'écran la teinte aux couleurs du club (QMV, data-prod="gris:…") : gris foncé → couleur 1,
# blanc → couleur 2, en gardant ombres et plis (une teinte sur du gris, pas un changement de couleur).
MASQUES = {'boutique':{'image':'C', 'sans':[[330, 30, 600, 385], [430, 385, 600, 560], [245, 170, 330, 360], [720, 330, 800, 520], [650, 440, 740, 630]], 'nom':'tissus'}}
def couche_masque(a, c, sans):
    import cv2
    mag = ((c[..., 2] > 150) & (c[..., 0] > 150) & (c[..., 1] < 120)).astype(np.uint8); mag = cv2.dilate(mag, np.ones((5, 5), np.uint8))
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(int); m = mag * ((hsv[..., 1] < 125) & (hsv[..., 2] > 22)).astype(np.uint8)
    for x0, y0, x1, y1 in sans: m[y0:y1, x0:x1] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.isin(lab, [k for k in range(1, n) if st[k, 4] > 120]).astype(np.float32)
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    al = cv2.GaussianBlur(m, (0, 0), 0.7)[y0:y1, x0:x1]
    return a[y0:y1, x0:x1], al, [int(x0), int(y0), int(x1), int(y1)]

# v131 : les tissus BLANC et GRIS d'une zone, détourés par la couleur (pas par le masque magenta : ChatGPT l'a dessiné décalé et incomplet).
# Sous la lumière chaude, le « blanc » et le « gris » restent peu saturés (S ≈ 100-150) alors que pierre, bois, laiton et bougies flambent (S > 170).
# La couche a la taille de la zone (transparente ailleurs) : l'écran la pose sur l'objet et la teint (QMV.colorierGris, data-prod="gris:…").
# v134 : silh = silhouette de l'objet (calque de Qwen-Image-Layered, 1024 × 1536, 0 à 1) : on ne garde que le peu saturé DANS l'objet
# (le ciel pâle et les arbres derrière la tente de l'entrée sont aussi peu saturés) ; « sans » accepte aussi des cercles (cx, cy, r)
# v139 : regle='tissu' : seulement le blanc franc (S < 32, V > 180) et l'anthracite (sombre bleu-gris : V < 125, teinte 95-135, S < 140),
# pas la pierre beige ni le bois sombre (teinte 8-20) ;
# aire : taille minimale d'un morceau gardé (petits fanions)
def couche_grise(img, zone, smax, sans, silh=None, regle=None, aire=1500, blanc=(32, 180)):
    import cv2
    x0, y0, x1, y1 = zone; z = img[y0:y1, x0:x1]; hsv = cv2.cvtColor(z, cv2.COLOR_BGR2HSV).astype(int)
    if regle == 'tissu': m = (((hsv[..., 1] < blanc[0]) & (hsv[..., 2] > blanc[1])) | ((hsv[..., 2] < 125) & (hsv[..., 2] > 20) & (hsv[..., 0] >= 95) & (hsv[..., 0] <= 135) & (hsv[..., 1] < 140))).astype(np.uint8)
    else: m = ((hsv[..., 1] < smax) & (hsv[..., 2] > 25)).astype(np.uint8)
    if silh is not None: m &= (silh[y0:y1, x0:x1] > .5).astype(np.uint8)
    ex = np.zeros(m.shape, bool)
    for b in sans:
        if len(b) == 3:
            yy, xx = np.mgrid[y0:y1, x0:x1]; ex |= (xx - b[0]) ** 2 + (yy - b[1]) ** 2 <= b[2] ** 2; continue
        bx0, by0, bx1, by1 = b; ex[max(0, by0 - y0):max(0, by1 - y0), max(0, bx0 - x0):max(0, bx1 - x0)] = True
    m[ex] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = nd.binary_fill_holes(np.isin(lab, [k for k in range(1, n) if st[k, 4] > aire])); m[ex] = False   # v134 : le bouchage des trous ne rend pas ce qu'on a écarté (l'enseigne)
    return z, cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.7)

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
    W, H = R.get('taille', (1024, 1536))   # v139 : taille propre au lieu (le stade en panorama paysage)
    a = cv2.imread(fA); a = cv2.resize(a, (W, H), interpolation=cv2.INTER_AREA)
    a_brut = a   # v149 : la pierre réchauffée, mais jamais le ciel (le bord des murs est lu sur l'image d'origine)
    if 'chaud' in R:
        Cc = dict(R['chaud'])
        if R.get('ciel', {}).get('regle') == 'nuit': Cc['bord'] = bord_nuit(a_brut, R['ciel']['haut'])
        chaud = lambda im: rechauffer(im, Cc)
    else: chaud = lambda im: im
    a = chaud(a)
    cv2.imwrite(os.path.join(O, f'{lieu}-fond.webp'), a, [cv2.IMWRITE_WEBP_QUALITY, 82]); print(lieu, 'fond (image A) ok')
    orb = cv2.ORB_create(6000); ka, da = orb.detectAndCompute(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), None); regs = {}
    for obj, im in R['pieces']:
        if im not in regs:
            b = chaud(cv2.resize(cv2.imread(os.path.join(A, f'{lieu}-{im}.png')), (W, H), interpolation=cv2.INTER_AREA))
            kb, db = orb.detectAndCompute(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), None)
            mt = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(db, da), key=lambda x: x.distance)[:1500]
            T, inl = cv2.estimateAffinePartial2D(np.float32([kb[m.queryIdx].pt for m in mt]), np.float32([ka[m.trainIdx].pt for m in mt]), method=cv2.RANSAC, ransacReprojThreshold=2)
            regs[im] = cv2.warpAffine(b, T, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); print(f'  image {im} recalée ({int(inl.sum())} points)')
        x0, y0, x1, y1 = R['zones'][obj]; src_ = regs[im]
        if obj in R.get('locaux', {}):   # v134 : recalage propre à cet objet, sur son voisinage seulement
            L = R['locaux'][obj]; mk = np.zeros((H, W), np.uint8); rx0, ry0, rx1, ry1 = L['region']; mk[ry0:ry1, rx0:rx1] = 255
            for sx0, sy0, sx1, sy1 in L.get('sans', []): mk[sy0:sy1, sx0:sx1] = 0
            b = chaud(cv2.resize(cv2.imread(os.path.join(A, f'{lieu}-{im}.png')), (W, H), interpolation=cv2.INTER_AREA))
            kl, dl = orb.detectAndCompute(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), mk); kb, db = orb.detectAndCompute(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), None)
            mt = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(db, dl), key=lambda x: x.distance)[:1500]
            T, inl = cv2.estimateAffinePartial2D(np.float32([kb[m.queryIdx].pt for m in mt]), np.float32([kl[m.trainIdx].pt for m in mt]), method=cv2.RANSAC, ransacReprojThreshold=2)
            src_ = cv2.warpAffine(b, T, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); print(f'  {obj}-{im} recalé localement ({int(inl.sum())} points)')
        p = src_[y0:y1, x0:x1]
        if obj in R.get('interieurs', {}):   # v134 : seulement l'intérieur sombre de la niche (pris dans A), pas de rectangle
            I = R['interieurs'][obj]; bx0, by0, bx1, by1 = I['boite']; hv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV)[by0:by1, bx0:bx1, 2]
            n, lab, st, _ = cv2.connectedComponentsWithStats((hv < I['vmax']).astype(np.uint8)); cm = lab == 1 + np.argmax(st[1:, 4])
            mm = np.zeros((H, W), bool)
            for yy in range(cm.shape[0]):
                if by0 + yy > I['ymax']: break
                xs = np.nonzero(cm[yy])[0]
                if len(xs): mm[by0 + yy, bx0 + xs.min():bx0 + xs.max() + 1] = True
            mm = cv2.dilate(mm.astype(np.uint8), np.ones((2 * I['marge'] + 1,) * 2, np.uint8)).astype(np.float32)
            al = cv2.GaussianBlur(mm, (0, 0), 1.2)[y0:y1, x0:x1]
        else:
            al = np.zeros(p.shape[:2], np.float32); al[0 if y0 == 0 else FONDU:p.shape[0] if y1 >= H else -FONDU, 0 if x0 == 0 else FONDU:p.shape[1] if x1 >= W else -FONDU] = 1
            al = cv2.GaussianBlur(al, (0, 0), FONDU / 2.2)   # v131 : pas de fondu le long des bords de l'image (rien à raccorder)
        rgba = np.dstack([cv2.cvtColor(p, cv2.COLOR_BGR2RGB), (al * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(O, f'{lieu}-{obj}-{im}.webp'), 'WEBP', quality=86, method=6)
        tailles[f'{lieu}-{obj}-{im}'] = [x0, y0, x1, y1]
    if lieu in MASQUES and os.path.exists(os.path.join(A, f'{lieu}-{MASQUES[lieu]["image"]}.png')):
        Q = MASQUES[lieu]; cm = cv2.resize(cv2.imread(os.path.join(A, f'{lieu}-{Q["image"]}.png')), (W, H), interpolation=cv2.INTER_NEAREST)
        z, al, cadre = couche_masque(a, cm, Q['sans'])
        Image.fromarray(np.dstack([cv2.cvtColor(z, cv2.COLOR_BGR2RGB), (np.clip(al, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(O, f'{lieu}-{Q["nom"]}.webp'), 'WEBP', quality=88, method=6)
        tailles[f'{lieu}-{Q["nom"]}'] = cadre; print(f'  couche {Q["nom"]} (masque {Q["image"]}) : cadre {cadre}')
    for nom, cadre, boites, sans in R.get('couches', []):
        z, al = couche_tissus(a, cadre, boites, sans)
        Image.fromarray(np.dstack([cv2.cvtColor(jaunir(z), cv2.COLOR_BGR2RGB), (np.clip(al, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(O, f'{lieu}-{nom}-A-seule.webp'), 'WEBP', quality=88, method=6)
        tailles[f'{lieu}-{nom}'] = cadre
    for obj, im, smax, sans, *opt in R.get('gris', []):
        silh = calque_qwen(lieu, opt[0]['calque']) if opt and 'calque' in opt[0] else None
        o_ = opt[0] if opt else {}
        z, al = couche_grise(a if im == 'A' else regs[im], R['zones'][obj], smax, sans, silh, o_.get('regle'), o_.get('aire', 1500), o_.get('blanc', (32, 180)))
        Image.fromarray(np.dstack([cv2.cvtColor(z, cv2.COLOR_BGR2RGB), (np.clip(al, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(O, f'{lieu}-{obj}-gris-{im}.webp'), 'WEBP', quality=88, method=6)
        print(f'  couche grise {obj}-{im} : {int((al > 0.5).sum())} px')
    if 'avant' in R and calque_qwen(lieu, R['avant']['calque']) is not None:
        rgba = couche_avant(a, calque_qwen(lieu, R['avant']['calque']), R['avant'])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(O, f'{lieu}-avant.webp'), 'WEBP', quality=84, method=6)
        tailles[f'{lieu}-avant'] = [0, 0, W, R['avant']['haut']]; print(f'  premier plan {lieu}-avant : {rgba.shape[1]} × {rgba.shape[0]}')
    if 'ciel' in R:   # v136
        Image.fromarray(couche_ciel(a_brut, R['ciel']), 'RGBA').save(os.path.join(O, f'{lieu}-ciel.webp'), 'WEBP', quality=90, method=6)
        if R['ciel'].get('nuages'):   # v150
            cie = couche_ciel(a_brut, R['ciel'])[..., 3].astype(np.float32) / 255
            couche_nuages(a_brut, cie, R['ciel']['nuages'], W, R['ciel']['haut']).save(os.path.join(O, f'{lieu}-nuages.webp'), 'WEBP', quality=86, method=6); print('  gros nuages', f'{lieu}-nuages')
        Image.fromarray(texture_brume(), 'RGBA').save(os.path.join(O, 'brume.webp'), 'WEBP', quality=82, method=6)
        print(f'  masque du ciel {lieu}-ciel et texture de brume')
    for obj, im, sans in R.get('seules', []):
        x0, y0, x1, y1 = R['zones'][obj]; p = (a if im == 'A' else regs[im])[y0:y1, x0:x1]; al = seule_echarpe(p, sans, obj == 'robes')
        Image.fromarray(np.dstack([cv2.cvtColor(jaunir(p), cv2.COLOR_BGR2RGB), (np.clip(al, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(O, f'{lieu}-{obj}-{im}-seule.webp'), 'WEBP', quality=88, method=6)
print(json.dumps(tailles))
