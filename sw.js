/* Mon Écran — mise en mémoire sur l'iPhone pour un démarrage instantané, même sans réseau.
   - Pages (accueil, actus, sport, état) : dernière version si le réseau répond en moins de 1,5 s,
     sinon la version en mémoire tout de suite, mise à jour en arrière-plan (la page se recharge seule
     ou propose la nouvelle version).
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

/* Pages : réseau d'abord s'il répond vite (1,5 s), sinon la version en mémoire (affichage immédiat),
   mise à jour en arrière-plan puis avis à la page si elle a changé */
async function pageFirstFromCache(e, url){
  const cache = await caches.open(PAGES), key = pageKey(url);
  const cached = await cache.match(key), st = {fromCache:false};
  const old = cached ? await cached.clone().text() : null;      // lu tout de suite : la réponse en mémoire sera ensuite donnée à la page
  const fresh = fetch(new Request(url.href, {cache:'no-cache', credentials:'same-origin'})).then(async r => {   // (une requête de navigation ne peut pas être recopiée avec des options)
    if (r && r.ok && r.type === 'basic'){
      const txt = await r.clone().text();
      await cache.put(key, r.clone());
      if (st.fromCache && old !== null && old !== txt){          // la page affichée vient de la mémoire et une nouvelle version existe
        const all = await self.clients.matchAll({type:'window', includeUncontrolled:true});
        all.forEach(c => { if (pageKey(new URL(c.url)) === key) c.postMessage({type:'nouvelle-version'}); });
      }
    }
    return r;
  }).catch(() => null);
  if (!cached) return (await fresh) || new Response('<h1>Hors ligne</h1><p>Cette page n\'est pas encore en mémoire.</p>', {headers:{'content-type':'text/html; charset=utf-8'}});
  const quick = await Promise.race([fresh, new Promise(res => setTimeout(() => res('lent'), 1500))]);
  if (quick && quick !== 'lent' && quick.ok) return quick;      // réseau rapide : toujours la dernière version
  st.fromCache = true; e.waitUntil(fresh); return cached;
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
