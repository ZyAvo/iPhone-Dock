# mon-ecran-version: db2509e3
# QM27 (v93) : découpe les planches d'illustrations générées (grille régulière, fond uni clair) en images WebP à fond transparent.
# Usage : python3 outils/dev/qm27-decoupe.py <dossier des planches> <dossier de sortie, ex. images/qm27>
# Planches attendues : blasons-1..4.png (4 × 3, ordre de QMD.CLUBS), lieux-1.png (4 × 2), batiments-1.png (4 × 3, ordre de QMD.BATIMENTS), fond-jour.png.
# Le fond de chaque case est retiré par remplissage depuis les bords ; les morceaux des cases voisines (qui touchent le bord) sont écartés.
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
def decouper(path, cols, rows, noms, sortie, taille, marge=0.04, T=34):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int16); H, W, _ = im.shape
    os.makedirs(sortie, exist_ok=True)
    for k, nom in enumerate(noms):
        if not nom: continue
        r, c = divmod(k, cols)
        y0, y1 = round(r * H / rows), round((r + 1) * H / rows); x0, x1 = round(c * W / cols), round((c + 1) * W / cols)
        # on rogne un peu le bord de la case (traits de grille)
        my, mx = int((y1 - y0) * 0.012) + 2, int((x1 - x0) * 0.012) + 2
        cell = im[y0 + my:y1 - my, x0 + mx:x1 - mx]
        h, w, _ = cell.shape
        bords = np.concatenate([cell[0], cell[-1], cell[:, 0], cell[:, -1]])
        bg = np.median(bords, axis=0)
        dist = np.sqrt(((cell - bg) ** 2).sum(-1))
        proche = dist < T
        lab, n = nd.label(proche)
        touche = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fond = np.isin(lab, list(touche))
        fg = ~fond
        # composantes de premier plan : on garde celles qui comptent (> 0,25 % de la case)
        lf, nf = nd.label(fg)
        tailles = nd.sum(fg, lf, range(1, nf + 1))
        grand = int(np.argmax(tailles)) + 1 if nf else 0
        bordL = set(np.unique(np.concatenate([lf[0], lf[-1], lf[:, 0], lf[:, -1]]))) - {0}
        garde = [i + 1 for i, t in enumerate(tailles) if (i + 1 == grand) or (t > 0.0025 * h * w and (i + 1) not in bordL)]   # morceaux des cases voisines : ils touchent le bord
        fg = np.isin(lf, garde)
        fg = nd.binary_fill_holes(fg) if False else fg
        alpha = np.where(fg, 255, 0).astype(np.float32)
        # bord adouci : pixels de premier plan voisins du fond, alpha selon l'écart au fond
        bordure = fg & nd.binary_dilation(~fg, iterations=2)
        alpha[bordure] = np.clip((dist[bordure] - 8) / 40, 0, 1) * 255
        ys, xs = np.where(fg)
        if not len(ys): print('vide', nom); continue
        a, b, cc, d = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([cell.astype(np.uint8), alpha.astype(np.uint8)])[a:b, cc:d]
        img = Image.fromarray(rgba, 'RGBA')
        cote = max(img.size); pad = int(cote * marge)
        carre = Image.new('RGBA', (cote + 2 * pad, cote + 2 * pad), (0, 0, 0, 0))
        carre.paste(img, ((carre.width - img.width) // 2, carre.height - pad - img.height if taille[1] == 'bas' else (carre.height - img.height) // 2), img)
        carre = carre.resize((taille[0], taille[0]), Image.LANCZOS)
        carre.save(os.path.join(sortie, nom + '.webp'), 'WEBP', quality=86, method=6)
    print('ok', path)
A = sys.argv[1]; O = sys.argv[2]
B1 = ['bath','york','canterbury','glastonbury','whitby','norwich','oxford','inverness','aberdeen','stirling','conwy','swansea']
B2 = ['aberystwyth','galway','cork','dublin','rennes','paris','lyon','carcassonne','nantes','strasbourg','besancon','brest']
B3 = ['toulouse','bordeaux','marseille','poitiers','lille','montpellier','reims','grenoble','benevento','perugia','venezia','milano']
B4 = ['torino','arezzo','napoli','roma','firenze','palermo','bologna','genova','verona','trieste','bari','bergamo']
for i, L in enumerate([B1, B2, B3, B4]): decouper(f'{A}/blasons-{i+1}.png', 4, 3, L, f'{O}/blasons', (192, 'centre'))
decouper(f'{A}/lieux-1.png', 4, 2, ['vestiaire','stade','direction','voliere','technique','gringotts','poudlard','trophees'], f'{O}/lieux', (320, 'bas'), marge=0.02)
decouper(f'{A}/batiments-1.png', 4, 3, ['tribunes','boutique','buvettes','formation','infirmerie','aire','hangar','salle','voliere','divination','trophees','residence'], f'{O}/batiments', (256, 'bas'), marge=0.02)
import os.path
if os.path.exists(f'{A}/fond-nuit.png'): Image.open(f'{A}/fond-nuit.png').convert('RGB').resize((720, 1080), Image.LANCZOS).save(f'{O}/fond-nuit.webp', 'WEBP', quality=80, method=6)
f = Image.open(f'{A}/fond-jour.png').convert('RGB').resize((720, 1080), Image.LANCZOS); f.save(f'{O}/fond-jour.webp', 'WEBP', quality=80, method=6)
