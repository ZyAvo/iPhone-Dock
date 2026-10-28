// Prépare la page Vidéos (lancé par la tâche GitHub « Vidéos »).
// Lit dans videos.html les plateformes (PLATEFORMES) et les chaînes YouTube (CHAINES_YT), puis écrit :
//   donnees/videos/catalogue-<id>.json → titres disponibles en France sur la plateforme (données TMDB / JustWatch)
//   donnees/videos/youtube.json        → dernières vidéos de chaque chaîne (flux public de YouTube, sans clé)
// Clé TMDB : secret GitHub « TMDB_TOKEN » (jeton « API Read Access Token » ou clé API v3).
// Le catalogue n'est relu qu'une fois par jour ; YouTube à chaque passage.
import fs from 'node:fs';
import vm from 'node:vm';

const PAGE = process.env.VIDEOS_PAGE || 'videos.html';
const OUT = process.env.VIDEOS_OUT || 'donnees/videos';
const NOW = Date.now(), DAY = 864e5;
const TOKEN = (process.env.TMDB_TOKEN || '').trim();
const PAGES = +(process.env.TMDB_PAGES || 12);               // 20 titres par page, films et séries

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

for (const P of PLATEFORMES){
  const file = `${OUT}/catalogue-${P.id}.json`, prev = read(file);
  if (!TOKEN){ log.push(`${P.nom} : pas de clé TMDB (secret TMDB_TOKEN)`); if (!prev) fs.writeFileSync(file, JSON.stringify({v:1, updated:null, erreur:'Clé TMDB manquante', titres:[]})); continue; }
  if (prev && prev.updated && NOW - Date.parse(prev.updated) < 20 * 3600e3 && !process.env.FORCER){ log.push(`${P.nom} : catalogue du ${prev.updated} gardé (moins de 20 h)`); continue; }
  try{
    // identifiant(s) de la plateforme chez TMDB, cherché(s) par nom pour la France
    const ids = new Set();
    for (const t of ['movie', 'tv']){
      const pr = await tmdb(`/watch/providers/${t}`, {watch_region:'FR'});
      (pr.results || []).filter(x => new RegExp(P.tmdb, 'i').test(x.provider_name) && !/channel/i.test(x.provider_name)).forEach(x => ids.add(x.provider_id));
    }
    if (!ids.size) throw new Error(`plateforme « ${P.tmdb} » introuvable chez TMDB pour la France`);
    const genres = {};
    for (const t of ['movie', 'tv']) ((await tmdb(`/genre/${t}/list`)).genres || []).forEach(g => { genres[g.id] = g.name; });
    const seen = new Map(((prev && prev.titres) || []).map(x => [x.k, x.vu]));        // première apparition de chaque titre
    const titres = [];
    for (const t of ['movie', 'tv']){
      for (let p = 1; p <= PAGES; p++){
        const d = await tmdb(`/discover/${t}`, {watch_region:'FR', with_watch_providers:[...ids].join('|'), with_watch_monetization_types:'flatrate', sort_by:'popularity.desc', include_adult:'false', page:String(p)});
        (d.results || []).forEach((x, i) => {
          const k = (t === 'movie' ? 'f' : 's') + x.id;
          if (titres.some(y => y.k === k)) return;
          titres.push({k, t:t === 'movie' ? 'film' : 'serie', titre:x.title || x.name, orig:(x.original_title || x.original_name) !== (x.title || x.name) ? (x.original_title || x.original_name) : undefined,
            an:(x.release_date || x.first_air_date || '').slice(0, 4) || undefined, sortie:x.release_date || x.first_air_date || undefined,
            note:x.vote_count >= 20 ? Math.round(x.vote_average * 10) / 10 : undefined, votes:x.vote_count,
            pop:Math.round(x.popularity), rang:titres.length + 1, affiche:x.poster_path || undefined,
            genres:(x.genre_ids || []).map(g => genres[g]).filter(Boolean).slice(0, 3), resume:trim(x.overview, 320) || undefined,
            vu:seen.has(k) ? seen.get(k) : (prev && prev.titres && prev.titres.length ? new Date(NOW).toISOString().slice(0, 10) : null)});   // date d'arrivée (inconnue au tout premier passage)
        });
        if (p >= (d.total_pages || 1)) break;
        await sleep(120);
      }
    }
    fs.writeFileSync(file, JSON.stringify({v:1, updated:new Date(NOW).toISOString(), plateforme:P.nom, providers:[...ids], titres}));
    log.push(`${P.nom} : ${titres.length} titres (TMDB ${[...ids].join(', ')})`);
  }catch(e){
    log.push(`${P.nom} : échec ${e.message}`);
    if (prev) fs.writeFileSync(file, JSON.stringify({...prev, erreur:e.message}));
    else fs.writeFileSync(file, JSON.stringify({v:1, updated:null, erreur:e.message, titres:[]}));
  }
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
