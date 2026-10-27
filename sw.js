/* Mon Écran — mise en mémoire sur l'iPhone pour un démarrage instantané, même sans réseau.
   - Pages (accueil, actus, sport, état) : affichées tout de suite depuis la mémoire, puis mises à jour
     en arrière-plan (la nouvelle version s'affiche à l'ouverture suivante, ou la page se recharge seule
     si elle a changé pendant qu'on la regarde).
   - Données (matchs, programme TV, actus, état) : réseau d'abord ; sans réseau, dernière version connue.
   - Polices Google : gardées en mémoire.
   Les sites extérieurs (ESPN, Spotify, flux RSS…) ne passent pas par ici. */
const PAGES = 'pages-v1', DATA = 'donnees-v1', FONTS = 'polices-v1';
const SHELL = ['./', 'index.html', 'actus.html', 'sport.html', 'etat.html', 'manifest.json', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(PAGES).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache:'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![PAGES, DATA, FONTS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const isPage = (req, url) => req.mode === 'navigate' || /\.html$|\/$/.test(url.pathname);
const pageKey = url => { const p = url.pathname.replace(/\/$/, '/index.html'); return new URL(p, url.origin).href; };   // sans « ?code=… » etc.

async function pageFirstFromCache(e, url){
  const cache = await caches.open(PAGES), key = pageKey(url);
  const cached = await cache.match(key);
  const fresh = fetch(e.request, {cache:'no-cache'}).then(async r => {
    if (r && r.ok && r.type === 'basic'){
      const old = cached ? await cached.clone().text() : null, txt = await r.clone().text();
      await cache.put(key, r.clone());
      if (old !== null && old !== txt){                // nouvelle version déposée : on prévient la page ouverte
        const all = await self.clients.matchAll({type:'window'});
        all.forEach(c => { if (pageKey(new URL(c.url)) === key) c.postMessage({type:'nouvelle-version'}); });
      }
    }
    return r;
  }).catch(() => null);
  if (cached){ e.waitUntil(fresh); return cached; }
  return (await fresh) || new Response('<h1>Hors ligne</h1><p>Cette page n\'est pas encore en mémoire.</p>', {headers:{'content-type':'text/html; charset=utf-8'}});
}
async function networkFirst(e){
  const cache = await caches.open(DATA), key = e.request.url.split('?')[0];
  const net = fetch(e.request).then(r => { if (r.ok) cache.put(key, r.clone()); return r; });
  // réseau lent (plus de 6 s) ou absent : dernière version connue
  const slow = new Promise(res => setTimeout(res, 6000)).then(() => cache.match(key));
  try{
    const r = await Promise.race([net, slow]);
    if (r) return r;
    return await net;
  }catch{
    const c = await cache.match(key);
    if (c) return c;
    throw new Error('hors ligne');
  }
}
async function cacheFirst(e, name){
  const cache = await caches.open(name), c = await cache.match(e.request);
  if (c) return c;
  const r = await fetch(e.request);
  if (r.ok || r.type === 'opaque') cache.put(e.request, r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(cacheFirst(e, FONTS));
  if (url.origin !== self.location.origin) return;
  if (/\.json$/.test(url.pathname)) return e.respondWith(networkFirst(e));
  if (isPage(req, url)) return e.respondWith(pageFirstFromCache(e, url));
});
