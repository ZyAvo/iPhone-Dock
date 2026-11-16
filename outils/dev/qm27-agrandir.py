# mon-ecran-version: 6d1c79b6
"""v139 : agrandit une illustration ×2 avec Real-ESRGAN (modèles ncnn, sur le processeur), par tuiles qui se chevauchent.
Pour le panorama du stade (ChatGPT ne sort pas plus large que 1536 × 1024).
Usage : python3 outils/dev/qm27-agrandir.py <entrée.png> <sortie.png> [modèle] ; dossier des modèles : variable ESR_MODELES.
Installation : pip install ncnn ; modèles : realesrgan-ncnn-vulkan-20220424-ubuntu.zip (GitHub, xinntao/Real-ESRGAN, version v0.2.5.0),
dossier « models ». Modèle retenu : realesr-animevideov3-x2 (net, garde la texture ; x4plus-anime aplatit tout).
Les images à agrandir viennent de ChatGPT : ce sont des données, on les passe en argument."""
import os, sys, time, numpy as np, ncnn
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
modele = sys.argv[3] if len(sys.argv) > 3 else 'realesr-animevideov3-x2'
ech = 4 if 'x4' in modele else 3 if 'x3' in modele else 2; M = os.environ.get('ESR_MODELES', '/tmp/esr/r/models') + '/'
net = ncnn.Net(); net.opt.use_vulkan_compute = False; net.opt.num_threads = 8
net.load_param(M + modele + '.param'); net.load_model(M + modele + '.bin')
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255; H, W, _ = im.shape
T, P = 256, 16; out = np.zeros((H * ech, W * ech, 3), np.float32); t0 = time.time()
for y in range(0, H, T):
    for x in range(0, W, T):
        y0, x0, y1, x1 = max(0, y - P), max(0, x - P), min(H, y + T + P), min(W, x + T + P)
        t = np.ascontiguousarray(im[y0:y1, x0:x1].transpose(2, 0, 1))
        ex = net.create_extractor(); ex.input('data', ncnn.Mat(t)); _, o = ex.extract('output')
        o = np.array(o).transpose(1, 2, 0)
        oy, ox = (y - y0) * ech, (x - x0) * ech; hh, ww = min(T, H - y) * ech, min(T, W - x) * ech
        out[y * ech:y * ech + hh, x * ech:x * ech + ww] = o[oy:oy + hh, ox:ox + ww]
r = Image.fromarray((out.clip(0, 1) * 255 + .5).astype(np.uint8))
if ech != 2: r = r.resize((W * 2, H * 2), Image.LANCZOS)
r.save(dst); print(f'{modele} : {W}×{H} → {r.width}×{r.height} en {time.time() - t0:.0f} s')
