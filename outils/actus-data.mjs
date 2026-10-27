// Prépare les actus de la page Actus (lancé par la tâche GitHub « Actus », toutes les 30 min).
// Lit la liste des onglets et des flux directement dans actus.html, télécharge chaque flux RSS/Atom
// sans passer par un service tiers, regroupe les mêmes infos venant de plusieurs sites et écrit :
//   donnees/actus/actus.json → {updated, tabs:{id:{items}}, sources:[état de chaque flux]}
import fs from 'node:fs';
import vm from 'node:vm';

const PAGE = process.env.ACTUS_PAGE || 'actus.html';
const OUT = process.env.ACTUS_OUT || 'donnees/actus';
const NOW = Date.now(), H = 3600e3;
const MAX_AGE = 72 * H, MAX_ITEMS = 45, PER_FEED = 25;

/* ---------- Onglets et flux : lus dans actus.html ---------- */
const page = fs.readFileSync(PAGE, 'utf8');
const a = page.indexOf('const TABS = ['), b = page.indexOf('\n];', a);
if (a < 0 || b < 0) throw new Error('Liste TABS introuvable dans ' + PAGE);
const TABS = vm.runInNewContext(page.slice(a + 'const TABS = '.length, b + 2));

/* ---------- Lecture XML (RSS 2.0, RSS 1.0, Atom) ---------- */
const ENT = {amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', laquo:'«', raquo:'»', rsquo:'’', lsquo:'‘', ldquo:'“', rdquo:'”', hellip:'…', ndash:'–', mdash:'—', eacute:'é', egrave:'è', agrave:'à', ccedil:'ç', ecirc:'ê', ocirc:'ô', icirc:'î', ucirc:'û'};
const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const strip = s => decode(decode(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (x, names) => { for (const n of names){ const m = x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i')); if (m) return m[1]; } return ''; };
const attr = (x, t, at, cond) => {
  for (const m of x.matchAll(new RegExp(`<${t}\\b([^>]*)/?>`, 'gi'))){
    const v = (m[1].match(new RegExp(`${at}\\s*=\\s*["']([^"']+)`, 'i')) || [])[1];
    if (v && (!cond || cond(m[1]))) return decode(v);
  }
  return '';
};
function imageOf(x){
  const isImg = s => !/type\s*=\s*["'](?!image)/i.test(s) || /medium\s*=\s*["']image/i.test(s);
  const big = [...x.matchAll(/<media:content\b([^>]*)>/gi)].map(m => ({url:(m[1].match(/url\s*=\s*["']([^"']+)/i) || [])[1], w:+((m[1].match(/width\s*=\s*["'](\d+)/i) || [])[1] || 0), ok:isImg(m[1])}))
    .filter(m => m.url && m.ok).sort((p, q) => q.w - p.w)[0];
  const img = (big && decode(big.url)) || attr(x, 'media:thumbnail', 'url') || attr(x, 'enclosure', 'url', s => /image|\.jpe?g|\.png|\.webp/i.test(s))
    || attr(x, 'itunes:image', 'href') || (decode(tag(x, ['content:encoded', 'description', 'summary', 'content'])).match(/<img[^>]+src=["']([^"']+)/i) || [])[1] || '';
  return /^https?:\/\//.test(img) ? img.replace(/^http:/, 'https:') : '';
}
function parse(xml){
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  return blocks.map(x => {
    const link = strip(tag(x, ['link'])) || attr(x, 'link', 'href', s => !/rel\s*=\s*["'](?!alternate)/i.test(s)) || strip(tag(x, ['guid']));
    const when = strip(tag(x, ['pubDate', 'dc:date', 'published', 'updated']));
    const g = /news\.google\./.test(link);              // Google Actualités : « Titre - Média », sans résumé utile
    const title = strip(tag(x, ['title']));
    return {title:g ? title.replace(/\s+[-–]\s+[^-–]+$/, '') : title, link:link.trim(), date:Date.parse(when) || null,
            desc:g ? '' : strip(tag(x, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 260), img:imageOf(x)};
  }).filter(i => i.title && /^https?:\/\//.test(i.link));
}

/* ---------- Téléchargement ---------- */
async function get(url){
  let last;
  for (let i = 0; i < 2; i++){
    try{
      const r = await fetch(url, {signal:AbortSignal.timeout(15000), redirect:'follow',
        headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', accept:'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'}});
      if (!r.ok){ last = `erreur ${r.status}`; if (r.status === 404 || r.status === 403) break; continue; }
      return await r.text();
    }catch(e){ last = e.name === 'TimeoutError' ? 'trop lent' : (e.cause && e.cause.code) || e.message; }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(last || 'échec');
}
async function pool(tasks, n){
  const out = []; let k = 0;
  await Promise.all(Array.from({length:Math.min(n, tasks.length)}, async () => { while (k < tasks.length){ const i = k++; out[i] = await tasks[i](); } }));
  return out;
}

/* ---------- Regroupement des mêmes infos ---------- */
const STOP = new Set('les des une pour dans avec sans sur par aux est sont ont plus mais tout tous cette ces son ses leur leurs qui que quoi dont elle elles ils nous vous pas apres avant entre selon face contre comme fait faire ete etre avoir deux trois veut doit peut va vont dit selon video direct live info infos'.split(' '));
const words = t => new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length >= 4 && !STOP.has(w)));
const sim = (x, y) => { let n = 0; x.forEach(w => { if (y.has(w)) n++; }); return n / Math.max(1, Math.min(x.size, y.size)); };
function cluster(items){
  const out = [];
  for (const it of items){
    const w = words(it.title);
    const g = w.size >= 3 && out.find(o => o.source !== it.source && !o.also.some(x => x.source === it.source) && Math.abs(o.date - it.date) < 36 * H && sim(o.w, w) >= .6);
    if (g){ g.also.push({source:it.source, link:it.link}); if (!g.img && it.img) g.img = it.img; continue; }
    out.push({...it, w, also:[]});
  }
  return out.map(({w, ...i}) => i);
}

/* ---------- Programme ---------- */
const feeds = [...new Map(TABS.flatMap(t => t.feeds).map(f => [f.url, f])).values()];
const state = {};
/* Flux en panne (adresse changée…) : on cherche le flux annoncé par la page du site
   (<link rel="alternate" type="application/rss+xml">), en préférant celui qui contient f.hint */
async function discover(f){
  const u = new URL(f.url), pages = [...new Set([new URL('.', u).href, f.site, u.origin + '/'].filter(Boolean))];
  for (const pg of pages){
    try{
      const html = await get(pg);
      const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0])
        .filter(l => /rel\s*=\s*["']?alternate/i.test(l) && /application\/(rss|atom)\+xml/i.test(l))
        .map(l => decode((l.match(/href\s*=\s*["']([^"']+)/i) || [])[1] || '')).filter(Boolean).map(h => new URL(h, pg).href);
      const pick = links.find(h => f.hint && h.toLowerCase().includes(f.hint)) || (!f.hint && links[0]);
      if (pick && pick !== f.url){
        const items = parse(await get(pick));
        if (items.length) return {url:pick, items};
      }
    }catch{}
  }
  return null;
}
const got = await pool(feeds.map(f => async () => {
  let items = [], err = '';
  try{ items = parse(await get(f.url)); if (!items.length) err = 'flux vide ou illisible'; }catch(e){ err = String(e.message || e); }
  for (const alt of (items.length ? [] : f.alt || [])){               // adresses de secours (ex. Google Actualités limité au site)
    try{ const it = parse(await get(alt)); if (it.length){ state[f.url] = {name:f.name, url:f.url, ok:true, n:it.length, img:it.filter(i => i.img).length, trouve:alt, err:`flux principal : ${err}`}; return [f.url, it]; } }catch{}
  }
  if (!items.length){
    const d = await discover(f);
    if (d){ items = d.items; state[f.url] = {name:f.name, url:f.url, ok:true, n:items.length, img:items.filter(i => i.img).length, trouve:d.url, err:`adresse à mettre à jour (${err})`}; return [f.url, items]; }
  }
  state[f.url] = items.length ? {name:f.name, url:f.url, ok:true, n:items.length, img:items.filter(i => i.img).length} : {name:f.name, url:f.url, ok:false, err};
  return [f.url, items];
}), 6);
const BY = Object.fromEntries(got);

let prev = null; try{ prev = JSON.parse(fs.readFileSync(`${OUT}/actus.json`, 'utf8')); }catch{}
const tabs = {};
for (const t of TABS){
  let items = t.feeds.flatMap(f => (BY[f.url] || []).slice(0, PER_FEED).map(i => ({...i, source:f.name, color:f.color, date:i.date || NOW})));   // une source ne peut pas noyer les autres
  // flux en panne : on garde ses articles du passage précédent
  t.feeds.filter(f => !state[f.url].ok).forEach(f => {
    const old = ((prev && prev.tabs && prev.tabs[t.id] && prev.tabs[t.id].items) || []).filter(i => i.source === f.name);
    items.push(...old);
  });
  const seen = new Set();
  items = items.filter(i => NOW - i.date < MAX_AGE && i.date < NOW + H).sort((x, y) => y.date - x.date)
    .filter(i => { const k = i.link.replace(/#.*$/, '').replace(/([?&])(utm_[a-z]+|xtor|at_[a-z]+|origin)=[^&]*/gi, '$1').replace(/[?&]+$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
  tabs[t.id] = {items:cluster(items).slice(0, MAX_ITEMS)};
}
fs.mkdirSync(OUT, {recursive:true});
Object.values(state).forEach(st => { st.onglets = TABS.filter(t => t.feeds.some(f => f.url === st.url)).map(t => t.label); });
fs.writeFileSync(`${OUT}/actus.json`, JSON.stringify({v:1, updated:new Date(NOW).toISOString(), tabs, sources:Object.values(state)}));
const ko = Object.values(state).filter(s => !s.ok);
console.log(`${feeds.length - ko.length}/${feeds.length} flux lus.` + Object.entries(tabs).map(([k, v]) => ` ${k}:${v.items.length}`).join(''));
ko.forEach(s => console.log(`  ✗ ${s.name} (${s.url}) : ${s.err}`));
Object.values(state).filter(s => s.trouve).forEach(s => console.log(`  ↻ ${s.name} : flux trouvé à ${s.trouve}`));
