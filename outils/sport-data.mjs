// Prépare les données de la page Sport (lancé par la tâche GitHub « Programme TV sport »).
// Lit la liste des compétitions et les fonctions de lecture directement dans sport.html,
// interroge ESPN côté serveur, numérote les journées et écrit :
//   donnees/sport/jours.json     → matchs de J-4 à J+17, toutes compétitions (page d'accueil Sport)
//   donnees/sport/<id>.json      → saison complète, journées, classement d'une compétition
//   donnees/sport/index.json     → état de chaque compétition (à jour, en pause…)
import fs from 'node:fs';
import vm from 'node:vm';

const PAGE = process.env.SPORT_PAGE || 'sport.html';
const OUT = process.env.SPORT_OUT || 'donnees/sport';
const API = 'https://site.api.espn.com/apis/site/v2/sports';
const TSDB = 'https://www.thesportsdb.com/api/v1/json/123';
const NOW = Date.now();
const DAY = 864e5;

/* ---------- Code partagé avec sport.html ---------- */
const page = fs.readFileSync(PAGE, 'utf8');
const grab = (a, b) => {
  const i = page.indexOf(a); if (i < 0) throw new Error(`Repère introuvable dans ${PAGE} : ${a}`);
  const j = page.indexOf(b, i + a.length); if (j < 0) throw new Error(`Fin introuvable après : ${a}`);
  return page.slice(i, j);
};
const fnBlock = name => { const i = page.indexOf(`function ${name}(`); if (i < 0) throw new Error(`Fonction introuvable : ${name}`); return page.slice(i, page.indexOf('\n}\n', i) + 3); };
const shared = [
  grab('const REGIONS = [', '\nconst VERSION'),
  grab('const normTxt', 'async function loadTV'),
  grab('const same = ', '/* Numéros de journée'),
  fnBlock('applyRefs'), fnBlock('parseCalendar'), fnBlock('classify'), fnBlock('norm'), fnBlock('logosOf'),
  fnBlock('num'), grab('const statOf', 'function sortEntries'), fnBlock('sortEntries'), fnBlock('tableFrom'),
  fnBlock('summaryEvents'), fnBlock('assignRounds'),
  page.slice(page.indexOf('const slug = '), page.indexOf('\n', page.indexOf('const slug = ')))
].map(c => c.replace(/^(const|let) /gm, 'var ')).join('\n');
vm.runInThisContext(shared, {filename:'sport.html (extraits)'});
const {LEAGUES, applyRefs, parseCalendar, norm, logosOf, tableFrom, summaryEvents, assignRounds, slug, tokens} = globalThis;

/* ---------- Outils ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ymd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
const days = (a, b) => { const out = []; for (let t = a; t <= b; t += DAY) out.push(ymd(t)); return out; };
const read = f => { try{ return JSON.parse(fs.readFileSync(f, 'utf8')); }catch{ return null; } };
const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v));
let calls = 0, fails = 0;
async function get(url, tries = 3){
  for (let i = 0; i < tries; i++){
    try{
      calls++;
      const r = await fetch(url, {signal:AbortSignal.timeout(20000), headers:{'user-agent':'Mozilla/5.0 (mon-ecran)'}});
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    }catch{}
    await sleep(700 * (i + 1));
  }
  fails++; throw new Error(`échec ${url}`);
}
async function pool(tasks, n){
  const out = []; let i = 0;
  await Promise.all(Array.from({length:Math.min(n, tasks.length)}, async () => {
    while (i < tasks.length){ const k = i++; try{ out[k] = await tasks[k](); }catch{ out[k] = null; } }
  }));
  return out;
}

/* ---------- Saisons ---------- */
function seasonOf(L){
  const d = new Date(NOW), y = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  if (['basketball', 'football', 'hockey'].includes(L.sport))     // sports US : fenêtre glissante, pour garder des fichiers légers
    return {label:`${y}-${String(y + 1).slice(2)}`, start:NOW - 30 * DAY, end:NOW + 60 * DAY, y};
  return {label:`${y}-${String(y + 1).slice(2)}`, start:Date.UTC(y, 6, 1), end:Date.UTC(y + 1, 5, 30), y};
}

/* ---------- Matchs d'une compétition ---------- */
async function eventsFor(L, S, prev){
  const base = `${API}/${L.sport}/${L.id}/scoreboard`;
  const today = await get(`${base}?dates=${ymd(NOW)}&limit=300`).catch(() => null);
  const lg = ((today || {}).leagues || [])[0] || {};
  const cal = !Array.isArray(lg.calendar) ? null : !lg.calendar.length ? [] :
    typeof lg.calendar[0] === 'string' ? lg.calendar.map(x => x.slice(0, 10).replace(/-/g, '')) : null;
  const info = logosOf(today ? today.leagues : null);

  // Tournoi ponctuel sans match proche : on le met en pause
  if (L.seasonal){
    const near = (cal || []).some(d => d >= ymd(NOW - 7 * DAY) && d <= ymd(NOW + 45 * DAY)) || ((today || {}).events || []).length;
    if (!near) return {idle:true, info};
  }

  let raw = null;
  for (const lim of [1000, 400]){                              // 1) toute la période d'un coup
    try{
      const j = await get(`${base}?dates=${ymd(S.start)}-${ymd(S.end)}&limit=${lim}`, 2);
      if (j && Array.isArray(j.events) && j.events.length){ raw = j.events.map(e => norm(e, L)); break; }
    }catch{}
  }
  if (!raw){                                                    // 2) sinon jour par jour, sur les seuls jours de match
    let want = cal ? days(S.start, S.end).filter(d => cal.includes(d))
                   : days(Math.max(S.start, NOW - 10 * DAY), Math.min(S.end, NOW + 25 * DAY));   // sans calendrier : fenêtre courte
    const keep = new Map();
    const cutoff = ymd(NOW - 3 * DAY);                          // les matchs anciens et terminés sont repris du fichier précédent
    ((prev && prev.events) || []).forEach(m => { if (ymd(m.t) < cutoff && m.state === 'post') keep.set(m.id, m); });
    const doneDays = new Set([...keep.values()].map(m => ymd(m.t)));
    want = want.filter(d => d >= cutoff || !doneDays.has(d));
    const res = await pool(want.map(d => () => get(`${base}?dates=${d}&limit=300`)), 10);
    raw = [...keep.values(), ...res.flatMap(j => ((j || {}).events || []).map(e => norm(e, L)))];
  }
  const map = new Map(); raw.forEach(m => map.set(m.id, m));
  return {events:[...map.values()].sort((a, b) => a.t - b.t), info, calendar:cal};
}

/* ---------- Journées ---------- */
const REFS = {};
async function userCalendar(L, S){
  const f = `calendriers/${S.label}/${slug(L.name)}.txt`;
  return fs.existsSync(f) ? parseCalendar(fs.readFileSync(f, 'utf8')) : [];
}
async function openfootball(L, S){
  if (!L.of) return [];
  try{
    const j = await get(`https://raw.githubusercontent.com/openfootball/football.json/master/${S.y}-${String(S.y + 1).slice(2)}/${L.of}.json`, 2);
    return ((j || {}).matches || []).map(x => ({h:tokens({full:x.team1}), a:tokens({full:x.team2}), r:+(String(x.round || '').match(/\d+/) || [])[0] || null})).filter(x => x.r);
  }catch{ return []; }
}
async function thesportsdb(L, S, nRounds){
  if (!L.tsdb) return [];
  const file = `${OUT}/_tsdb-${slug(L.id)}.json`;
  let cache = read(file);
  if (cache && cache.season === S.label && NOW - cache.at < 3 * DAY) return cache.ref;
  try{
    const lj = await get(`${TSDB}/search_all_leagues.php?c=${encodeURIComponent(L.tsdb.c)}&s=${encodeURIComponent(L.tsdb.s)}`, 2);
    const hit = ((lj || {}).countries || (lj || {}).leagues || []).find(x => [x.strLeague, x.strLeagueAlternate].some(n => n && L.tsdb.re.test(n)));
    if (!hit) return [];
    const season = `${S.y}-${S.y + 1}`, ref = [];
    for (let r = 1; r <= nRounds; r++){
      try{
        const j = await get(`${TSDB}/eventsround.php?id=${hit.idLeague}&r=${r}&s=${season}`, 2);
        ((j || {}).events || []).forEach(e => ref.push({h:tokens({full:e.strHomeTeam}), a:tokens({full:e.strAwayTeam}), r}));
      }catch{}
      await sleep(2100);                                        // limite de la clé gratuite : 30 appels par minute
    }
    cache = {season:S.label, at:NOW, ref};
    write(file, cache);
    return ref;
  }catch{ return cache ? cache.ref : []; }
}
async function numberRounds(L, S, evs){
  if (!L.rounds) return {};
  if (L.id === 'nfl') return {src:'espn'};
  evs.forEach(m => { m.round = null; m.roundSrc = null; });
  const stats = {};
  for (const [src, fn] of [['ref', userCalendar], ['of', openfootball]]){
    const ref = await fn(L, S, 0);
    stats[src] = ref.length ? applyRefs(evs, ref, src) : 0;
  }
  if (evs.some(m => !m.roundSrc) && L.tsdb){
    const teams = new Set(evs.flatMap(m => [m.home.id, m.away.id])).size;
    stats.tsdb = applyRefs(evs, await thesportsdb(L, S, Math.max(2, (teams - 1) * 2)), 'tsdb');
  }
  assignRounds(evs);
  stats.calc = evs.filter(m => m.roundSrc === 'calc').length;
  stats.missRef = stats.ref ? evs.length - stats.ref : null;
  return stats;
}

/* ---------- Détail des matchs de rugby ---------- */
async function rugbyDetails(L, evs, prev){
  if (L.sport !== 'rugby') return 0;
  const old = new Map(((prev && prev.events) || []).filter(m => m.full).map(m => [m.id, m.full]));
  const todo = [];
  evs.forEach(m => { if (old.has(m.id) && m.state === 'post') m.full = old.get(m.id); else if (m.state !== 'pre' && m.t > NOW - 120 * DAY) todo.push(m); });
  await pool(todo.slice(0, 80).map(m => async () => {
    const j = await get(`${API}/${L.sport}/${L.id}/summary?event=${encodeURIComponent(m.id)}`, 2);
    if (j){ const {evs:list} = summaryEvents(j); if (list.length) m.full = list; }
  }), 6);
  return todo.length;
}

/* ---------- Programme ---------- */
fs.mkdirSync(OUT, {recursive:true});
const index = {updated:new Date(NOW).toISOString(), leagues:{}};
const upcoming = [];
for (const L of LEAGUES){
  const t0 = Date.now(), file = `${OUT}/${slug(L.id)}.json`, prev = read(file), S = seasonOf(L);
  try{
    const r = await eventsFor(L, S, prev);
    if (r.idle){
      write(file, {v:1, id:L.id, ...r.info, updated:index.updated, idle:true, season:S.label});
      index.leagues[L.id] = {idle:true, file:`${slug(L.id)}.json`};
      console.log(`${L.name} : en pause`);
      continue;
    }
    const rounds = await numberRounds(L, S, r.events);
    await rugbyDetails(L, r.events, prev);
    let table = null;
    try{ const j = await get(`https://site.api.espn.com/apis/v2/sports/${L.sport}/${L.id}/standings`, 2); if (j) table = tableFrom(j); }catch{}
    if (!table && prev && prev.table) table = prev.table;
    write(file, {v:1, id:L.id, ...r.info, updated:index.updated, season:S.label, range:{start:S.start, end:S.end}, calendar:r.calendar, rounds, table, events:r.events});
    index.leagues[L.id] = {count:r.events.length, rounds, table:!!table, file:`${slug(L.id)}.json`};
    r.events.filter(m => m.t >= NOW - 5 * DAY && m.t <= NOW + 18 * DAY).forEach(m => upcoming.push(m));
    console.log(`${L.name} : ${r.events.length} matchs, ${Math.round((Date.now() - t0) / 1000)} s`, JSON.stringify(rounds));
  }catch(e){
    index.leagues[L.id] = {error:String(e.message || e)};
    if (prev && prev.events) prev.events.filter(m => m.t >= NOW - 5 * DAY && m.t <= NOW + 18 * DAY).forEach(m => upcoming.push(m));
    console.log(`${L.name} : ERREUR ${e.message}`);
  }
}
const logos = {};
for (const L of LEAGUES){ const f = read(`${OUT}/${slug(L.id)}.json`); if (f) logos[L.id] = {logo:f.logo || '', logoDark:f.logoDark || '', season:f.season || ''}; }
write(`${OUT}/jours.json`, {v:1, updated:index.updated, leagues:logos, events:upcoming.sort((a, b) => a.t - b.t)});
write(`${OUT}/index.json`, index);
console.log(`Terminé : ${calls} appels, ${fails} échecs, ${upcoming.length} matchs dans jours.json`);
