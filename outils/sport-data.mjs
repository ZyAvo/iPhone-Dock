// Prépare les données de la page Sport (lancé par la tâche GitHub « Programme TV sport »).
// Lit la liste des compétitions et les fonctions de lecture directement dans sport.html,
// interroge ESPN côté serveur, numérote les journées et écrit :
//   donnees/sport/jours.json     → matchs de J-4 à J+17, toutes compétitions (page d'accueil Sport)
//   donnees/sport/<id>.json      → saison complète, journées, classement d'une compétition
//   donnees/sport/index.json     → état de chaque compétition (à jour, en pause…)
import fs from 'node:fs';
import vm from 'node:vm';
import {racing} from './sport-course.mjs';

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

/* ---------- Fichiers plus légers : on retire ce que la page sait reconstituer (voir expand() dans sport.html) ---------- */
const SPORT_OF = Object.fromEntries(LEAGUES.map(L => [L.id, L.sport]));
const LOGO = (sport, id) => sport === 'soccer' && id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` : null;
function slimSide(t, sport){
  const o = {...t};
  if (o.full === o.name) delete o.full;
  if (o.logo && o.logo === LOGO(sport, o.id)) delete o.logo;
  if (!o.win) delete o.win;
  if (o.so == null) delete o.so;
  return o;
}
function slim(m){
  if (!m.home) return m;                                   // séances F1 / MotoGP : déjà compactes
  const sport = SPORT_OF[m.league], o = {...m, home:slimSide(m.home, sport), away:slimSide(m.away, sport)};
  o.details = (m.details || []).map(d => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== false && v !== null && v !== '' && v !== undefined)));
  if (!o.details.length) delete o.details;
  if (!(o.us || []).length) delete o.us;
  if (o.round == null) delete o.round;
  if (!o.roundSrc) delete o.roundSrc;
  return o;
}

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

/* Match « fantôme » : ESPN garde parfois une ancienne fiche « à venir » déjà dépassée (souvent l'affiche inversée,
   avec une date fausse). On l'écarte s'il est dépassé de plus d'un jour et jamais commencé. */
function ghost(m, all){
  if (m.state !== 'pre' || !/SCHEDULED/.test(m.code || '') || m.t > NOW - 1.5 * DAY) return false;
  return true;
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

  // 1) toute la période d'un coup (ESPN tronque parfois la réponse : on complète ensuite jour par jour)
  let ranged = [];
  for (const lim of [1000, 400]){
    try{
      const j = await get(`${base}?dates=${ymd(S.start)}-${ymd(S.end)}&limit=${lim}`, 2);
      if (j && Array.isArray(j.events) && j.events.length){ ranged = j.events.map(e => norm(e, L)); break; }
    }catch{}
  }
  // 2) jours à vérifier : les jours de match du calendrier ESPN s'il est vraiment à jour, sinon tous les jours de la saison.
  //    ESPN mélange parfois l'ancienne saison et quelques dates de la nouvelle (Top 14) : on ne s'y fie que s'il
  //    annonce des matchs à venir. Les 3 semaines autour d'aujourd'hui sont toujours relues.
  const lo = ymd(S.start), hi = ymd(S.end), todayK = ymd(NOW);
  const calIn = (cal || []).filter(d => d >= lo && d <= hi);
  const calOk = calIn.length > 0 && (calIn[calIn.length - 1] >= ymd(NOW - 2 * DAY) || todayK > hi);
  const near = days(Math.max(S.start, NOW - 7 * DAY), Math.min(S.end, NOW + 21 * DAY));
  const cand = [...new Set([...(calOk ? calIn : days(S.start, S.end)), ...near])].sort();
  const covered = new Set(ranged.map(m => ymd(m.t)));
  const lastCovered = [...covered].sort().pop(); covered.delete(lastCovered);        // le dernier jour peut être incomplet
  const cutoff = ymd(NOW - 3 * DAY);
  const checked = new Set(((prev && prev.checked) || []).filter(d => d < cutoff));   // jours passés déjà lus aux passages précédents
  const far = ymd(NOW + 14 * DAY), future = {...((prev && prev.future) || {})};    // jours lointains : relus une fois par jour seulement
  const keepDay = d => (d < cutoff && checked.has(d)) || (d > far && future[d] && NOW - future[d] < DAY);
  const keep = ((prev && prev.events) || []).filter(m => keepDay(ymd(m.t)));
  const todo = cand.filter(d => !covered.has(d) && !keepDay(d));
  let ok = 0;
  const res = await pool(todo.map(d => async () => { const j = await get(`${base}?dates=${d}&limit=300`); ok++; if (d < cutoff) checked.add(d); else if (d > far) future[d] = NOW; return j; }), 8);
  covered.forEach(d => { if (d < cutoff) checked.add(d); });
  const raw = [...keep, ...ranged, ...res.flatMap(j => ((j || {}).events || []).map(e => norm(e, L)))];
  const map = new Map(); raw.forEach(m => map.set(m.id, m));
  const all = [...map.values()], events = all.filter(m => !ghost(m, all)).sort((a, b) => a.t - b.t);
  const diag = {range:ranged.length, days:todo.length, ok, failed:todo.length - ok, calendar:calOk ? 'espn' : 'tous les jours', ghosts:all.length - events.length};
  console.log(`  ${L.name} : ${JSON.stringify(diag)}`);
  Object.keys(future).forEach(d => { if (d <= far) delete future[d]; });
  return {events, info, calendar:cal, checked:[...checked].sort(), future, diag};
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
  // on réutilise le détail déjà lu (s'il indique bien le camp de chaque action), sinon on le relit
  evs.forEach(m => { const f = old.get(m.id); if (f && m.state === 'post' && f.some(d => d.side)) m.full = f; else if (m.state !== 'pre' && m.t > NOW - 120 * DAY) todo.push(m); });
  await pool(todo.slice(0, 80).map(m => async () => {
    const j = await get(`${API}/${L.sport}/${L.id}/summary?event=${encodeURIComponent(m.id)}`, 2);
    if (j){ const {evs:list} = summaryEvents(j); if (list.length) m.full = list; }
  }), 6);
  return todo.length;
}

/* ---------- Classement ----------
   ESPN renvoie parfois le classement final de la saison passée (Top 14 : 26 matchs joués fin octobre).
   On le vérifie avec les matchs joués ; s'il ne colle pas, on essaie la saison demandée explicitement,
   puis on recalcule le classement à partir des résultats. */
const gpOf = e => +((e.stats || []).find(s => s.name === 'gamesPlayed') || {}).v || 0;
function tableStale(L, table, evs){
  if (!table || !(table.tables || []).length) return true;
  if (!['soccer', 'rugby'].includes(L.sport)) return false;
  const played = {};
  evs.filter(m => m.state === 'post').forEach(m => [m.home.id, m.away.id].forEach(id => { played[id] = (played[id] || 0) + 1; }));
  const maxGP = Math.max(0, ...table.tables.flatMap(t => t.entries).map(gpOf));
  const maxPlayed = Math.max(0, ...Object.values(played));
  return maxGP > maxPlayed + 3;
}
function computeTable(L, S, evs){
  const rugby = L.sport === 'rugby', T = new Map();
  const row = t => { if (!T.has(t.id)) T.set(t.id, {name:t.name, abbr:t.abbr, logo:t.logo, gp:0, w:0, d:0, l:0, pf:0, pa:0, bonus:0}); const r = T.get(t.id); r.name = t.name; if (t.logo) r.logo = t.logo; return r; };
  let noTries = 0;
  const post = evs.filter(m => m.state === 'post' && m.home.score !== '' && m.away.score !== '');
  post.forEach(m => {
    const h = row(m.home), a = row(m.away), hs = +m.home.score, as = +m.away.score;
    [[h, hs, as], [a, as, hs]].forEach(([r, f, c]) => { r.gp++; r.pf += f; r.pa += c; if (f > c) r.w++; else if (f === c) r.d++; else r.l++; });
    if (!rugby) return;
    const tries = m.full && m.full.some(d => d.side) ? ['home', 'away'].map(sd => m.full.filter(d => d.kind === 'try' && d.side === sd).length) : null;
    if (!tries) noTries++;
    [[h, hs, as, 0], [a, as, hs, 1]].forEach(([r, f, c, i]) => {
      if (f > c && tries && tries[i] - tries[1 - i] >= 3) r.bonus++;          // bonus offensif : 3 essais de plus
      if (f < c && c - f <= 5) r.bonus++;                                      // bonus défensif : défaite de 5 points ou moins
    });
  });
  if (!post.length) return null;
  const rows = [...T.values()].map(r => ({...r, pts:rugby ? r.w * 4 + r.d * 2 + r.bonus : r.w * 3 + r.d}))
    .sort((x, y) => y.pts - x.pts || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf);
  const st = (name, v, abbr) => ({name, type:name.toLowerCase(), v:String(v), abbr});
  return {season:S.label, src:'calc',
    note:`Classement recalculé à partir des ${post.length} matchs joués connus (ESPN ne donne pas encore celui de cette saison)${noTries ? ` ; bonus offensif inconnu pour ${noTries} match${noTries > 1 ? 's' : ''}` : ''}.`,
    tables:[{title:'', entries:rows.map((r, i) => ({name:r.name, abbr:r.abbr, logo:r.logo || '', note:null, stats:[
      st('rank', i + 1, 'RK'), st('gamesPlayed', r.gp, 'J'), st('wins', r.w, 'G'), st('ties', r.d, 'N'), st('losses', r.l, 'P'),
      st('pointDifferential', (r.pf - r.pa > 0 ? '+' : '') + (r.pf - r.pa), 'Diff'), ...(rugby ? [st('bonusPoints', r.bonus, 'Bonus')] : []), st('points', r.pts, 'Pts')]}))}]};
}
async function standings(L, S, evs, prev){
  const url = `https://site.api.espn.com/apis/v2/sports/${L.sport}/${L.id}/standings`;
  for (const q of ['', `?season=${S.y}`, `?season=${S.y + 1}`]){
    try{
      const j = await get(url + q, 2); if (!j) continue;
      const t = tableFrom(j);
      if (!tableStale(L, t, evs)) return {...t, src:'espn'};
    }catch{}
    if (!['soccer', 'rugby'].includes(L.sport)) break;
  }
  const calc = ['soccer', 'rugby'].includes(L.sport) && L.rounds ? computeTable(L, S, evs) : null;
  if (calc) return calc;
  return prev && prev.table && !tableStale(L, prev.table, evs) ? prev.table : null;
}

/* ---------- Programme ---------- */
fs.mkdirSync(OUT, {recursive:true});
const index = {updated:new Date(NOW).toISOString(), leagues:{}};
const upcoming = [];
for (const L of LEAGUES){
  const t0 = Date.now(), file = `${OUT}/${slug(L.id)}.json`, prev = read(file), S = seasonOf(L);
  if (L.sport === 'racing'){                              // F1, MotoGP : séances, résultats et classements (outils/sport-course.mjs)
    try{
      const r = await racing(L, {get, NOW, prev});
      write(file, {v:1, id:L.id, updated:index.updated, season:r.season, diag:r.diag, gps:r.gps, catId:r.catId, table:r.table, events:r.events});
      index.leagues[L.id] = {count:r.events.length, gps:r.gps.length, table:r.table ? r.table.src : false, diag:{appels:r.diag.appels, erreurs:r.diag.erreurs.length}, file:`${slug(L.id)}.json`};
      r.events.filter(m => m.t >= NOW - 4 * DAY && m.t <= NOW + 15 * DAY).forEach(m => upcoming.push(m));
      console.log(`${L.name} : ${r.gps.length} Grands Prix, ${r.events.length} séances, ${Math.round((Date.now() - t0) / 1000)} s`, r.diag.erreurs.slice(0, 3).join(' | '));
    }catch(e){
      index.leagues[L.id] = {error:String(e.message || e)};
      if (prev && prev.events) prev.events.filter(m => m.t >= NOW - 4 * DAY && m.t <= NOW + 15 * DAY).forEach(m => upcoming.push(m));
      console.log(`${L.name} : ERREUR ${e.message}`);
    }
    continue;
  }
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
    const table = await standings(L, S, r.events, prev);
    write(file, {v:1, id:L.id, ...r.info, updated:index.updated, season:S.label, range:{start:S.start, end:S.end}, diag:r.diag, calendar:r.calendar, checked:r.checked, future:r.future, rounds, table, events:r.events.map(slim)});
    index.leagues[L.id] = {count:r.events.length, rounds, table:table ? table.src || 'espn' : false, diag:r.diag, file:`${slug(L.id)}.json`};
    r.events.filter(m => m.t >= NOW - 4 * DAY && m.t <= NOW + 15 * DAY).forEach(m => upcoming.push(m));
    console.log(`${L.name} : ${r.events.length} matchs, ${Math.round((Date.now() - t0) / 1000)} s`, JSON.stringify(rounds));
  }catch(e){
    index.leagues[L.id] = {error:String(e.message || e)};
    if (prev && prev.events) prev.events.filter(m => m.t >= NOW - 4 * DAY && m.t <= NOW + 15 * DAY).forEach(m => upcoming.push(m));
    console.log(`${L.name} : ERREUR ${e.message}`);
  }
}
const logos = {};
for (const L of LEAGUES){ const f = read(`${OUT}/${slug(L.id)}.json`); if (f) logos[L.id] = {logo:f.logo || '', logoDark:f.logoDark || '', season:f.season || ''}; }
write(`${OUT}/jours.json`, {v:2, updated:index.updated, leagues:logos, events:upcoming.sort((a, b) => a.t - b.t).map(slim)});
write(`${OUT}/index.json`, index);
console.log(`Terminé : ${calls} appels, ${fails} échecs, ${upcoming.length} matchs dans jours.json`);
