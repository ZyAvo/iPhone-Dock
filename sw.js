// mon-ecran-version: 02fceb80
/* Mon Écran — mise en mémoire sur l'iPhone pour un démarrage instantané, même sans réseau.
   - Pages (accueil, actus, sport, état) : dernière version si le réseau répond en moins de 1,5 s,
     sinon la version en mémoire tout de suite, mise à jour en arrière-plan (la page se recharge seule
     ou propose la nouvelle version).
   - Données (matchs, programme TV, actus, état) : réseau d'abord ; sans réseau, dernière version connue.
   - Polices Google : gardées en mémoire.
   Les sites extérieurs (ESPN, Spotify, flux RSS…) ne passent pas par ici. */
const PAGES = 'pages-v1', DATA = 'donnees-v1', FONTS = 'polices-v1', IMAGES = 'images-v1';   // v93 : illustrations de QM27
const SHELL = ['./', 'index.html', 'actus.html', 'sport.html', 'etat.html', 'invest.html', 'videos.html', 'cachee.html', 'ecarts.html', 'pronos.html', 'reglages.html', 'tv.html', 'ambreval.html', 'ambreval.js', 'ambreval-art.js', 'ambreval-ui.js', 'qm27.html', 'qm27.js', 'qm27-donnees.js', 'qm27-club.js', 'qm27-carriere.js', 'qm27-domaine.js', 'qm27-vestiaire.js', 'qm27-presse.js', 'qm27-tactique.js', 'qm27-bureau.js', 'qm27-prix.js', 'qm27-europe.js', 'qm27-visuel.js', 'qm27-ui.js', 'qm27-ecrans.js', 'qm27-stats.js', 'noyau.js', 'themes.js', 'tv.js', 'match.js', 'synchro.js', 'commun.js', 'commun.css', 'polices/Geist-Variable.woff2', 'manifest.json', 'manifest-pronos.json', 'apple-touch-icon.png', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  // v70 : la police va dans la réserve des polices, là où elle est cherchée ensuite (avant : retéléchargée au 2e passage)
  e.waitUntil(Promise.all([caches.open(PAGES), caches.open(FONTS)]).then(([p, f]) => Promise.all(SHELL.map(u => (/^polices\//.test(u) ? f : p).add(new Request(u, {cache:'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![PAGES, DATA, FONTS, IMAGES].includes(k)).map(k => caches.delete(k))))
    .then(() => caches.open(DATA)).then(c => c.keys().then(l => Promise.all(l.filter(r => /\/donnees\/tv\//.test(r.url)).map(r => c.delete(r)))))   // v52 : catalogue TV (19 Mo) retiré de la mémoire
    .then(() => self.clients.claim()));
});

const isPage = (req, url) => req.mode === 'navigate' || /\.html$|\/$|\/(noyau|themes|synchro|tv|match|commun|ambreval|ambreval-art|ambreval-ui|qm27|qm27-donnees|qm27-club|qm27-carriere|qm27-domaine|qm27-vestiaire|qm27-bureau|qm27-prix|qm27-europe|qm27-visuel|qm27-ui|qm27-ecrans|qm27-stats)\.js$|\/commun\.css$|\/config\/config\.js$/.test(url.pathname);   // noyau.js, themes.js, synchro.js : même règle que les pages
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
const DATA_MAX = 40;        // v52 : au plus 40 fichiers de données gardés (les plus anciens partent)
async function limiter(cache){ const l = await cache.keys(); for (let i = 0; i < l.length - DATA_MAX; i++) await cache.delete(l[i]); }
async function networkFirst(e){
  const cache = await caches.open(DATA), key = e.request.url.split('?')[0];
  const net = fetch(e.request).then(r => { if (r.status === 200) cache.put(key, r.clone()).then(() => limiter(cache)).catch(() => {}); return r; });   // v52 : 200 seulement (une réponse partielle 206 ne se garde pas)
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
  if (/\/polices\//.test(url.pathname)) return e.respondWith(cacheFirst(e, FONTS));      // v53 : polices hébergées avec le dock
  if (/\/images\/qm27\//.test(url.pathname)) return e.respondWith(cacheFirst(e, IMAGES));   // v93 : illustrations, gardées après le premier affichage
  // v52 : catalogue TV (19 Mo, relu une fois par jour) et lectures partielles (Range) : directement au réseau, sans mémoire
  if (/\/donnees\/tv\//.test(url.pathname) || req.headers.has('range')) return;
  if (/\.json$/.test(url.pathname)) return e.respondWith(networkFirst(e));
  if (isPage(req, url)) return e.respondWith(pageFirstFromCache(e, url));
});

/* v72 : rappels des Pronos (tâche GitHub « Rappels des pronos », notifications web) : {titre, texte, url, tag} */
self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch{ d = {texte:e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Pronos', {
    body:d.texte || 'Un prono t\'attend.', icon:'icone-192.png', badge:'icone-192.png', tag:d.tag || 'pronos', data:{url:d.url || 'pronos.html'}}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'pronos.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(l => {
    const c = l.find(x => x.url.split('?')[0] === url.split('?')[0]);
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
