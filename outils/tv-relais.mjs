// mon-ecran-version: dc2b5fb7
// Mon Écran — relais TV pour le PC (v44). Rien à installer à part Node.js 18 ou plus récent.
// Le dock (page sécurisée en https) ne peut ni interroger un serveur TV en http ni lire ses flux. Ce relais tourne sur ton PC,
// n'écoute que la machine elle-même (127.0.0.1) et fait l'intermédiaire :
//   /ping            le dock vérifie que le relais est lancé
//   /api?u=…         appel au serveur TV (liste des chaînes, programme) ; renvoie la réponse telle quelle
//   /flux?u=…        flux vidéo : listes HLS (.m3u8) réécrites pour que chaque morceau passe aussi par le relais, morceaux transmis tels quels
// Seules les pages du dock (et celles ouvertes sur ce PC) peuvent s'en servir. Il ne garde rien : ni accès, ni historique.
// Lancement : double-clic sur tv-relais.cmd (Windows), ou  node tv-relais.mjs . Laisse la fenêtre ouverte pendant que tu regardes.
// Réglages facultatifs : TV_PORT (8765), TV_ORIGINES (adresses autorisées, séparées par des virgules).
import http from 'node:http';
import { Readable } from 'node:stream';

const PORT = +process.env.TV_PORT || 8765;
const ORIGINES = (process.env.TV_ORIGINES || 'https://zyavo.github.io,http://localhost,http://127.0.0.1').split(',').map(s => s.trim()).filter(Boolean);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const autorise = o => !o || ORIGINES.some(x => o === x || o.startsWith(x + ':') || o.startsWith(x + '/'));
const entetes = o => ({'Access-Control-Allow-Origin':o || '*', 'Vary':'Origin', 'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'*', 'Access-Control-Allow-Private-Network':'true', 'Access-Control-Expose-Headers':'Content-Length, Content-Type'});
const cible = q => { try{ const u = new URL(q || ''); return /^https?:$/.test(u.protocol) ? u : null; }catch{ return null; } };
const journal = (...a) => console.log(new Date().toLocaleTimeString('fr-FR'), ...a);
const masque = u => String(u).replace(/(\/(?:live|movie|series)\/|username=)[^/&]+/g, '$1•••').replace(/(\/(?:live|movie|series)\/•••\/|password=)[^/&.]+/g, '$1•••');   // v52 : films et séries aussi
/* v52 : le relais ne sert que les serveurs vus depuis le dock. Une demande avec une Origine autorisée (fetch/hls.js des pages du dock)
   fait connaître son serveur ; une demande sans Origine (<video src>, lecteur) n'est relayée que vers un serveur déjà connu,
   ou vers TV_SERVEUR s'il est réglé. Les serveurs cités dans une liste HLS relayée ou atteints par redirection sont ajoutés. */
const CONNUS = new Set((process.env.TV_SERVEUR || '').split(',').map(x => { try{ return new URL(x.trim()).host; }catch{ return ''; } }).filter(Boolean));
const connu = u => CONNUS.has(u.host);

/* liste HLS : chaque adresse (lignes, URI="…") devient /flux?u=<adresse absolue> */
function reecrire(texte, base){
  const abs = x => { try{ const v = new URL(x.trim(), base); CONNUS.add(v.host); return v.href; }catch{ return x; } };
  const via = x => `/flux?u=${encodeURIComponent(abs(x))}`;
  return texte.split(/\r?\n/).map(l => {
    if (!l.trim()) return l;
    if (l.startsWith('#')) return l.replace(/URI="([^"]+)"/g, (m, x) => `URI="${via(x)}"`);
    return via(l);
  }).join('\n');
}

const serveur = http.createServer(async (req, res) => {
  const o = req.headers.origin || '';
  if (!autorise(o)){ res.writeHead(403, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Origine refusée'); return; }
  const H = entetes(o);
  if (req.method === 'OPTIONS'){ res.writeHead(204, H); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/ping'){ res.writeHead(200, {...H, 'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true, v:1})); return; }
  if (url.pathname !== '/api' && url.pathname !== '/flux'){ res.writeHead(404, H); res.end(); return; }
  const u = cible(url.searchParams.get('u'));
  if (!u){ res.writeHead(400, H); res.end('Adresse invalide'); return; }
  if (o) CONNUS.add(u.host);
  else if (!connu(u)){ journal('refusé (serveur pas encore vu depuis le dock : recharge la page TV)', u.host); res.writeHead(403, H); res.end('Serveur inconnu du relais'); return; }
  const stop = new AbortController(); req.on('close', () => stop.abort());
  try{
    /* v48 : serveur lent ou coupure brève : 20 s au plus pour obtenir la réponse, jusqu'à 3 essais (0,6 s puis 1,5 s d'écart) avant d'abandonner */
    let r, essai = 0;
    for (;;){
      try{ r = await fetch(u, {redirect:'follow', signal:AbortSignal.any([stop.signal, AbortSignal.timeout(20000)]), headers:{'User-Agent':UA, 'Accept':'*/*', ...(req.headers.range ? {Range:req.headers.range} : {})}});
        if (r.status >= 500 && essai < 2 && url.pathname === '/flux') throw new Error('serveur ' + r.status);
        break; }
      catch(e){ if (stop.signal.aborted || ++essai > 2) throw e; await new Promise(ok => setTimeout(ok, essai === 1 ? 600 : 1500)); }
    }
    try{ CONNUS.add(new URL(r.url).host); }catch{}                  // redirection suivie : serveur des flux
    const type = r.headers.get('content-type') || '';
    if (url.pathname === '/flux' && (/mpegurl/i.test(type) || /\.m3u8(\?|$)/i.test(r.url))){
      const t = reecrire(await r.text(), r.url);
      res.writeHead(r.status, {...H, 'Content-Type':'application/vnd.apple.mpegurl', 'Cache-Control':'no-cache'}); res.end(t);
      return;
    }
    const h = {...H, 'Content-Type':type || 'application/octet-stream', 'Cache-Control':'no-cache'};
    ['content-length', 'content-range', 'accept-ranges'].forEach(k => { const v = r.headers.get(k); if (v) h[k.replace(/(^|-)\w/g, c => c.toUpperCase())] = v; });
    res.writeHead(r.status, h);
    if (!r.body){ res.end(); return; }
    Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
    if (url.pathname === '/api') journal('liste', r.status, masque(u.href).slice(0, 90));
  }catch(e){
    if (stop.signal.aborted) return;
    journal('erreur', masque(u.href).slice(0, 90), e.cause && e.cause.code || e.message);
    if (!res.headersSent){ res.writeHead(502, {...H, 'Content-Type':'text/plain; charset=utf-8'}); res.end('Serveur TV injoignable'); } else res.destroy();
  }
});
serveur.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Le port ${PORT} est déjà utilisé : le relais est peut-être déjà lancé.` : e.message); process.exitCode = 1; });
serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`Relais TV de Mon Écran lancé : http://127.0.0.1:${PORT}`);
  console.log('Laisse cette fenêtre ouverte pendant que tu regardes la TV dans le dock. Ctrl + C pour arrêter.');
});
