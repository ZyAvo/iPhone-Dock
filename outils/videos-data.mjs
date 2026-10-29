// Prépare la page Vidéos (lancé par la tâche GitHub « Vidéos »).
// Lit dans videos.html les plateformes (PLATEFORMES) et les chaînes YouTube (CHAINES_YT), puis écrit :
//   donnees/videos/catalogue.json + resumes.json → titres disponibles en France sur les plateformes (données TMDB / JustWatch)
//   donnees/videos/youtube.json        → dernières vidéos de chaque chaîne (flux public de YouTube, sans clé)
// Clé TMDB : secret GitHub « TMDB_TOKEN » (jeton « API Read Access Token » ou clé API v3).
// Le catalogue n'est relu qu'une fois par jour ; YouTube à chaque passage.
import fs from 'node:fs';
import vm from 'node:vm';

const PAGE = process.env.VIDEOS_PAGE || 'videos.html';
const OUT = process.env.VIDEOS_OUT || 'donnees/videos';
const NOW = Date.now(), DAY = 864e5;
const TOKEN = (process.env.TMDB_TOKEN || '').trim();
const PAGES = +(process.env.TMDB_PAGES || 8);                // 20 titres par page, films et séries, par plateforme

const page = fs.readFileSync(PAGE, 'utf8');
function list(name){
  const a = page.indexOf(`const ${name} = [`), b = page.indexOf('\n];', a);
  return a < 0 || b < 0 ? [] : vm.runInNewContext(page.slice(a + `const ${name} = `.length, b + 2));
}
const PLATEFORMES = list('PLATEFORMES'), CHAINES = list('CHAINES_YT');
const read = f => { try{ return JSON.parse(fs.readFileSync(f, 'utf8')); }catch{ return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, {recursive:true});
const log = [];

/* ---------- TMDB ---------- */
async function tmdb(path, params = {}){
  const u = new URL('https://api.themoviedb.org/3' + path);
  Object.entries({language:'fr-FR', ...params}).forEach(([k, v]) => u.searchParams.set(k, v));
  const headers = {accept:'application/json'};
  if (TOKEN.startsWith('eyJ')) headers.authorization = 'Bearer ' + TOKEN; else u.searchParams.set('api_key', TOKEN);
  for (let i = 0; i < 3; i++){
    try{
      const r = await fetch(u, {headers, signal:AbortSignal.timeout(15000)});
      if (r.status === 429){ await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 ? ' (clé TMDB refusée)' : ''));
      return await r.json();
    }catch(e){ if (i === 2) throw e; await sleep(1000); }
  }
}
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };

/* Catalogue fusionné : un titre présent sur plusieurs plateformes n'apparaît qu'une fois, avec la liste de ses plateformes.
   catalogue.json (léger, pour la grille) + resumes.json (lu seulement à l'ouverture d'une fiche). */
const CAT_FILE = `${OUT}/catalogue.json`, RES_FILE = `${OUT}/resumes.json`;
const prevCat = read(CAT_FILE) || (() => {                       // reprise de l'ancien catalogue Prime seul, s'il existe
  const o = read(`${OUT}/catalogue-prime.json`); if (!o || !o.titres) return null;
  return {updated:o.updated, plateformes:{prime:{nom:'Prime Video', n:o.titres.length}}, titres:o.titres.map(x => ({...x, p:['prime'], arr:{prime:x.vu || null}}))};
})();
const fresh = prevCat && prevCat.updated && NOW - Date.parse(prevCat.updated) < 20 * 3600e3 && !process.env.FORCER
  && PLATEFORMES.every(P => prevCat.plateformes && prevCat.plateformes[P.id]);
if (!TOKEN){
  log.push('Catalogue : pas de clé TMDB (secret TMDB_TOKEN)');
  if (!prevCat) fs.writeFileSync(CAT_FILE, JSON.stringify({v:2, updated:null, erreur:'Clé TMDB manquante', plateformes:{}, titres:[]}));
} else if (fresh){
  log.push(`Catalogue du ${prevCat.updated} gardé (moins de 20 h)`);
} else {
  const today = new Date(NOW).toISOString().slice(0, 10);
  const genres = {};
  try{ for (const t of ['movie', 'tv']) ((await tmdb(`/genre/${t}/list`)).genres || []).forEach(g => { genres[g.id] = g.name; }); }catch(e){ log.push('Genres : ' + e.message); }
  const provs = {};
  for (const t of ['movie', 'tv']){ try{ ((await tmdb(`/watch/providers/${t}`, {watch_region:'FR'})).results || []).forEach(x => { provs[x.provider_id] = x.provider_name; }); }catch{} }
  const old = new Map(((prevCat && prevCat.titres) || []).map(x => [x.k, x]));
  const byK = new Map(), resumes = {}, plateformes = {};
  for (const P of PLATEFORMES){
    const ids = Object.entries(provs).filter(([, n]) => new RegExp(P.tmdb, 'i').test(n) && !/channel/i.test(n)).map(([id]) => id);
    if (!ids.length){ plateformes[P.id] = {nom:P.nom, n:0, erreur:`introuvable chez TMDB pour la France (« ${P.tmdb} »)`}; log.push(`${P.nom} : introuvable chez TMDB`); continue; }
    const avant = prevCat && prevCat.plateformes && prevCat.plateformes[P.id] && prevCat.plateformes[P.id].n > 0;   // plateforme déjà lue : les titres en plus sont « nouveaux »
    let n = 0;
    try{
      for (const t of ['movie', 'tv']){
        for (let pg = 1; pg <= PAGES; pg++){
          const d = await tmdb(`/discover/${t}`, {watch_region:'FR', with_watch_providers:ids.join('|'), with_watch_monetization_types:'flatrate', sort_by:'popularity.desc', include_adult:'false', page:String(pg)});
          for (const x of d.results || []){
            const k = (t === 'movie' ? 'f' : 's') + x.id;
            let e = byK.get(k);
            if (!e){
              e = {k, t:t === 'movie' ? 'film' : 'serie', titre:x.title || x.name,
                orig:(x.original_title || x.original_name) !== (x.title || x.name) ? (x.original_title || x.original_name) : undefined,
                an:(x.release_date || x.first_air_date || '').slice(0, 4) || undefined, sortie:x.release_date || x.first_air_date || undefined,
                note:x.vote_count >= 20 ? Math.round(x.vote_average * 10) / 10 : undefined, votes:x.vote_count, pop:Math.round(x.popularity),
                affiche:x.poster_path || undefined, genres:(x.genre_ids || []).map(g => genres[g]).filter(Boolean).slice(0, 3), p:[], arr:{}};
              byK.set(k, e);
              if (x.overview) resumes[k] = trim(x.overview, 420);
            }
            if (!e.p.includes(P.id)){ e.p.push(P.id); n++;
              const o = old.get(k), deja = o && o.arr && P.id in o.arr;
              e.arr[P.id] = deja ? o.arr[P.id] : (avant ? today : null); }       // date d'arrivée sur la plateforme (inconnue au premier passage)
          }
          if (pg >= (d.total_pages || 1)) break;
          await sleep(120);
        }
      }
      plateformes[P.id] = {nom:P.nom, n, providers:ids.map(Number)};
      log.push(`${P.nom} : ${n} titres (TMDB ${ids.join(', ')})`);
    }catch(e){
      plateformes[P.id] = {nom:P.nom, n, erreur:e.message};
      log.push(`${P.nom} : échec ${e.message}`);
      // on garde les titres de cette plateforme connus la veille
      for (const o of old.values()) if ((o.p || []).includes(P.id)){ const e2 = byK.get(o.k) || (byK.set(o.k, {...o, p:[], arr:{}}), byK.get(o.k)); if (!e2.p.includes(P.id)){ e2.p.push(P.id); e2.arr[P.id] = (o.arr || {})[P.id] ?? null; } }
    }
  }
  const titres = [...byK.values()].sort((a, b) => b.pop - a.pop).map((x, i) => ({...x, rang:i + 1}));
  fs.writeFileSync(CAT_FILE, JSON.stringify({v:2, updated:new Date(NOW).toISOString(), plateformes, titres}));
  const oldRes = read(RES_FILE) || {};
  fs.writeFileSync(RES_FILE, JSON.stringify(Object.fromEntries(titres.map(x => [x.k, resumes[x.k] || oldRes[x.k]]).filter(([, v]) => v))));
  log.push(`Catalogue : ${titres.length} titres différents`);
}

/* ---------- YouTube : flux public de chaque chaîne ---------- */
const ENT = {amp:'&', lt:'<', gt:'>', quot:'"', apos:"'"};
const dec = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m);
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`)); return m ? dec(m[1]).trim() : ''; };
const attr = (x, t, a) => { const m = x.match(new RegExp(`<${t}\\b[^>]*\\b${a}="([^"]*)"`)); return m ? dec(m[1]) : ''; };
const prevYT = read(`${OUT}/youtube.json`), chaines = [];
for (const C of CHAINES){
  try{
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(C.id)}`, {headers:{'user-agent':'Mozilla/5.0 (Macintosh) MonEcran/1.0'}, signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const x = await r.text();
    const videos = [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]).map(e => ({
      id:tag(e, 'yt:videoId'), titre:tag(e, 'title'), date:Date.parse(tag(e, 'published')) || null,
      vues:+attr(e, 'media:statistics', 'views') || undefined, short:/\/shorts\//.test(attr(e, 'link', 'href')) || undefined,
      resume:trim(tag(e, 'media:description'), 220) || undefined
    })).filter(v => v.id);
    chaines.push({id:C.id, nom:C.nom || tag(x, 'title'), videos});
    log.push(`YouTube ${C.nom} : ${videos.length} vidéos`);
  }catch(e){
    const old = prevYT && (prevYT.chaines || []).find(c => c.id === C.id);
    chaines.push(old ? {...old, ancien:true} : {id:C.id, nom:C.nom, videos:[], erreur:e.message});
    log.push(`YouTube ${C.nom} : échec ${e.message}`);
  }
}
fs.writeFileSync(`${OUT}/youtube.json`, JSON.stringify({v:1, updated:new Date(NOW).toISOString(), chaines}));
log.forEach(l => console.log(l));
