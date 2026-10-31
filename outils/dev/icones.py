# mon-ecran-version: 69297db2
# Images de l'icône d'écran d'accueil : chaque logo (themes.js, LOGOS) aux couleurs de chaque thème (THEMES).
# Écrit icones/<logo>-<thème>-180.png (iPhone), -192.png et -512.png (Android, PC) et icones/manifest-<logo>-<thème>.json.
# À relancer après l'ajout ou la retouche d'un thème ou d'un logo :  python3 outils/dev/icones.py <dossier du dépôt>
# Demande Playwright + Chromium (rendu des dessins) et Pillow (réductions).
import sys, os, json, asyncio, io
from PIL import Image
from playwright.async_api import async_playwright

DEPOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
SORTIE = os.path.join(DEPOT, 'icones')
CHROME = os.environ.get('CHROME') or next((c for c in ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'] if os.path.exists(c)), None)
TAILLES = (180, 192, 512)
PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}#z{width:512px;height:512px;line-height:0}</style>
<script>window.CFG = (k, d) => d;</script><script src="file://%s"></script></head><body><div id="z"></div></body></html>"""

async def main():
    os.makedirs(SORTIE, exist_ok=True)
    manifeste = json.load(open(os.path.join(DEPOT, 'manifest.json'), encoding='utf-8'))
    tmp = os.path.join(SORTIE, '_page.html')
    open(tmp, 'w', encoding='utf-8').write(PAGE % os.path.join(DEPOT, 'themes.js'))
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}))
        pg = await b.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=1)
        await pg.goto('file://' + tmp)
        logos = await pg.evaluate('Themes.logos.map(l => l.id)')
        themes = await pg.evaluate('Themes.toutes.map(t => t.id)')
        n = 0
        for t in themes:
            for l in logos:
                await pg.evaluate('([l, t]) => { document.getElementById("z").innerHTML = Themes.logoSVG(l, t); }', [l, t])
                png = await pg.locator('#z').screenshot(omit_background=False)
                im = Image.open(io.BytesIO(png)).convert('RGB')
                for px in TAILLES:   # 256 couleurs avec tramage : 2 à 3 fois plus léger, sans bandes visibles dans les dégradés
                    r = im if px == 512 else im.resize((px, px), Image.LANCZOS)
                    r.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(os.path.join(SORTIE, f'{l}-{t}-{px}.png'), optimize=True)
                m = dict(manifeste, id='../', start_url='../', scope='../',
                         icons=[{'src': f'{l}-{t}-180.png', 'sizes': '180x180', 'type': 'image/png'},
                                {'src': f'{l}-{t}-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
                                {'src': f'{l}-{t}-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}])
                json.dump(m, open(os.path.join(SORTIE, f'manifest-{l}-{t}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                n += 1
        await b.close()
    os.remove(tmp)
    print(f'{n} icônes ({len(logos)} logos × {len(themes)} thèmes) → {SORTIE}')

asyncio.run(main())
