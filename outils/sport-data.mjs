// mon-ecran-version: 719ca7ca
// Prépare les données de la page Sport (lancé par la tâche GitHub « Sport », v51 ; avant : « Programme TV sport »).
// Lit la liste des compétitions et les fonctions de lecture dans sport.html et match.js,
// interroge ESPN côté serveur, numérote les journées et écrit :
//   donnees/sport/jours.json     → matchs de J-4 à J+15, toutes compétitions (ouverture de la page Sport)
//   donnees/sport/passe.json     → matchs de J-11 à J-4 (chargés juste après)
//   donnees/sport/<id>.json      → saison complète, journées, classement d'une compétition
//   donnees/sport/index.json     → état de chaque compétition (à jour, en pause…)
import fs from 'node:fs';
import vm from 'node:vm';
import {racing} from './sport-course.mjs';
import {CFG} from './config-lire.mjs';
globalThis.CFG = CFG;          // les listes de sport.html passent par CFG('sport.…', valeurs de la page) : réglages du classeur s'ils existent

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
// v51 : classify, summaryEvents… vivent dans match.js depuis la v48 (lecture des fiches de match commune à Sport et à l'accueil) :
// on exécute ce fichier tel quel (il range ses fonctions dans window, ici l'objet global) au lieu de les chercher dans sport.html
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(new URL('../match.js', import.meta.url), 'utf8'), {filename:'match.js'});
if (typeof globalThis.classify !== 'function' || typeof globalThis.summaryEvents !== 'function') throw new Error('match.js : classify / summaryEvents absents');
if (typeof globalThis.Match.doublons !== 'function' || typeof globalThis.Match.equipeClub !== 'function') throw new Error('match.js : doublons / equipeClub absents (v57)');
globalThis.equipeClub = (t, L) => globalThis.Match.equipeClub(t, L);   // appelée par norm() (sport.html)
const shared = [
  grab('const REGIONS = ', '\nconst VERSION'),
  grab('const LETTRES', 'async function loadTV'),
  grab('const same = ', '/* Numéros de journée'),
  fnBlock('applyRefs'), fnBlock('parseCalendar'), fnBlock('norm'), fnBlock('logosOf'),
  fnBlock('num'), grab(page.includes('\nfunction statOf(') ? 'function statOf(' : 'const statOf', 'function sortEntries')   /* v48 : statOf devenue une fonction */, fnBlock('sortEntries'), fnBlock('tableFrom'),
  fnBlock('assignRounds'),
  page.slice(page.indexOf('const slug = '), page.indexOf('\n', page.indexOf('const slug = ')))
].map(c => c.replace(/^(const|let) /gm, 'var ')).join('\n');
vm.runInThisContext(shared, {filename:'sport.html (extraits)'});
const {LEAGUES, applyRefs, parseCalendar, norm, logosOf, tableFrom, summaryEvents, assignRounds, slug, tokens} = globalThis;

/* ---------- Fichiers plus légers : on retire ce que la page sait reconstituer (voir expand() dans sport.html) ---------- */
const SPORT_OF = Object.fromEntries(LEAGUES.map(L => [L.id, L.sport]));
const NAME_OF = Object.fromEntries(LEAGUES.map(L => [L.id, L.name]));
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

  // 1) (jusqu'à la v50 : demande de toute la période d'un coup ; ESPN ne la remplissait jamais — « range: 0 » partout — v51 : retirée)
  const ranged = [];
  // 2) jours à vérifier : les jours de match du calendrier ESPN s'il est vraiment à jour, sinon tous les jours de la saison.
  //    ESPN mélange parfois l'ancienne saison et quelques dates de la nouvelle (Top 14) : on ne s'y fie que s'il
  //    annonce des matchs à venir. Les 3 semaines autour d'aujourd'hui sont toujours relues.
  const lo = ymd(S.start), hi = ymd(S.end), todayK = ymd(NOW);
  const calIn = (cal || []).filter(d => d >= lo && d <= hi);
  const calOk = calIn.length > 0 && (calIn[calIn.length - 1] >= ymd(NOW - 2 * DAY) || todayK > hi);
  const near = days(Math.max(S.start, NOW - 7 * DAY), Math.min(S.end, NOW + 21 * DAY));
  let cand = [...new Set([...(calOk ? calIn : days(S.start, S.end)), ...near])].sort();
  // v51 : en journée, de J-3 à J+14, on ne relit que les jours utiles (jours de match du calendrier ESPN ou déjà connus, hier, aujourd'hui) ;
  // le premier passage de chaque jour (UTC) relit tout, pour attraper les matchs ajoutés ou déplacés (SPORT_COMPLET=1 : tout, tout de suite)
  const COMPLET = process.env.SPORT_COMPLET === '1' || !(prev && prev.events && prev.events.length) || prev.completLe !== ymd(NOW);
  if (!COMPLET){
    const utiles = new Set([...calIn, ...prev.events.map(m => ymd(m.t)), todayK, ymd(NOW - DAY)]), bas = ymd(NOW - 3 * DAY), haut = ymd(NOW + 14 * DAY);
    cand = cand.filter(d => d < bas || d > haut || utiles.has(d));
  }
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
  const all = [...map.values()], events = globalThis.Match.doublons(all.filter(m => !ghost(m, all))).sort((a, b) => a.t - b.t);   // v57 : + fiches en double d'ESPN
  events.forEach(m => { if (m.home) [m.home, m.away].forEach(t => globalThis.Match.equipeClub(t, L)); });   // v57 : logos de pays sur des clubs (aussi les matchs repris du fichier précédent)
  const diag = {range:ranged.length, complet:COMPLET, days:todo.length, ok, failed:todo.length - ok, calendar:calOk ? 'espn' : 'tous les jours', ghosts:all.length - events.length};
  console.log(`  ${L.name} : ${JSON.stringify(diag)}`);
  Object.keys(future).forEach(d => { if (d <= far) delete future[d]; });
  return {events, info, calendar:cal, checked:[...checked].sort(), future, diag, completLe:COMPLET ? ymd(NOW) : prev.completLe};
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
    const hit = ((lj || {}).countries || (lj || {}).leagues || []).find(x => [x.strLeague, x.strLeagueAlternate].some(n => n && L.tsdb.re instanceof RegExp && L.tsdb.re.test(n)));
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
  // v48 : un détail lu pendant le match (mi-temps…) restait figé une fois le match fini ; il n'est gardé que si ses points collent au score
  const PTS = {try:5, conv:2, pen:3, drop:3};
  const pts = (l, m, sd) => (l || []).filter(d => (d.side || (String(d.team) === String(m[sd].id) ? sd : '')) === sd).reduce((a, d) => a + (PTS[d.kind] || 0), 0);
  const ecart = (l, m) => m.home.score === '' || m.away.score === '' ? 0 : Math.abs(pts(l, m, 'home') - (+m.home.score || 0)) + Math.abs(pts(l, m, 'away') - (+m.away.score || 0));
  evs.forEach(m => { const f = old.get(m.id);
    if (f && m.state === 'post' && f.some(d => d.side) && (ecart(f, m) === 0 || m.t < NOW - 3 * DAY)) m.full = f;
    else if (m.state !== 'pre' && m.t > NOW - 120 * DAY) todo.push(m); });
  await pool(todo.slice(0, 80).map(m => async () => {
    const j = await get(`${API}/${L.sport}/${L.id}/summary?event=${encodeURIComponent(m.id)}`, 2);
    if (j){ const {evs:list} = summaryEvents(j); if (list.length) m.full = list; }
    // fiche moins complète que la liste du tableau des scores : on garde celle du tableau
    if (m.full && m.details && m.details.length && ecart(m.details, m) < ecart(m.full, m)) m.full = m.details.map(d => ({...d, side:String(d.team) === String(m.home.id) ? 'home' : String(d.team) === String(m.away.id) ? 'away' : ''}));
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

/* ---------- Logos de clubs manquants (v58) ----------
   ESPN n'a pas de logo pour certains clubs de rugby (Bayonne : vide ; Perpignan, Vannes : drapeau de pays, retiré par Match.equipeClub).
   On les prend sur TheSportsDB : équipes de la compétition (lookup_all_teams, via L.tsdb ou la compétition citée par L.badges), sinon recherche
   par nom (searchteams, rugby). Mémoire _logos-<compétition>.json : 7 jours (1 jour si un club reste sans logo). Aussi pour le classement.
   v59 : la liste des équipes de la clé gratuite est incomplète et la recherche veut le nom exact (« Aviron Bayonnais ») : on lit aussi les matchs de la
   compétition sur TheSportsDB (saison, derniers et prochains), qui donnent le nom et le logo de chaque équipe (strHomeTeamBadge…). */
const motsClub = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4);
function scoreClub(nom, cand){                                   // mots communs (même mot, ou mêmes 6 premières lettres : Bayonne / Bayonnais)
  const a = motsClub(nom), b = cand.flatMap(motsClub);
  return a.filter(w => b.some(v => v === w || (w.length >= 6 && v.length >= 6 && v.slice(0, 6) === w.slice(0, 6)))).length;
}
function meilleurClub(nom, equipes){
  const sc = equipes.map(x => ({x, s:scoreClub(nom, [x.strTeam, x.strTeamShort, ...String(x.strAlternate || '').split(',')])})).filter(y => y.s > 0).sort((p, q) => q.s - p.s);
  return sc.length && (sc.length === 1 || sc[0].s > sc[1].s) ? sc[0].x : null;    // ex æquo : on ne choisit pas
}
async function logosClubs(L, events, table){
  if (L.sport !== 'rugby' || ['intl', 'rintl'].includes(L.region)) return null;
  const sansLogo = new Map();
  const voir = t => { if (!t || !t.name) return; globalThis.Match.equipeClub(t, L); if (!t.logo) sansLogo.set(t.name, t); };
  events.forEach(m => { if (m.home){ voir(m.home); voir(m.away); } });
  const lignes = ((table && table.tables) || []).flatMap(x => x.entries || []);
  lignes.forEach(voir);
  const file = `${OUT}/_logos-${slug(L.id)}.json`;
  let c = read(file);
  // v62 : la v57 a laissé sur les matchs déjà joués un logo ESPN qui n'existe pas (rugby/teams/500/<id>.png, Perpignan et Vannes) : logo trouvé sur TheSportsDB
  if (c && c.u) events.forEach(m => { if (m.home) [m.home, m.away].forEach(t => { if (c.u[t.name] && /\/teamlogos\/rugby\/teams\/500\/\d+\.png$/.test(t.logo || '')) t.logo = c.u[t.name]; }); });
  if (!sansLogo.size) return {manque:0};
  const tous = () => [...sansLogo.keys()].every(n => c.u[n] !== undefined), vide = () => [...sansLogo.keys()].some(n => !c.u[n]);
  if (!c || c.v !== 2 || !c.u || !tous() || NOW - c.at > (vide() ? DAY : 7 * DAY)){
    c = {v:2, at:NOW, u:{...((c && c.v === 2 && c.u) || {})}};
    let equipes = [];
    try{
      const ref = L.tsdb ? L : LEAGUES.find(x => x.id === L.badges);
      if (ref && ref.tsdb){
        const lj = await get(`${TSDB}/search_all_leagues.php?c=${encodeURIComponent(ref.tsdb.c)}&s=${encodeURIComponent(ref.tsdb.s)}`, 2);
        const hit = ((lj || {}).countries || (lj || {}).leagues || []).find(x => [x.strLeague, x.strLeagueAlternate].some(n => n && ref.tsdb.re instanceof RegExp && ref.tsdb.re.test(n)));
        if (hit){
          await sleep(2100); equipes = (((await get(`${TSDB}/lookup_all_teams.php?id=${hit.idLeague}`, 2)) || {}).teams || []).filter(x => x.strBadge);
          const manque = () => [...sansLogo.keys()].some(n => !meilleurClub(n, equipes));
          const saison = `${new Date(NOW).getUTCMonth() >= 6 ? new Date(NOW).getUTCFullYear() : new Date(NOW).getUTCFullYear() - 1}`;
          for (const q of [`eventsseason.php?id=${hit.idLeague}&s=${saison}-${+saison + 1}`, `eventspastleague.php?id=${hit.idLeague}`, `eventsnextleague.php?id=${hit.idLeague}`]){
            if (!manque()) break;
            await sleep(2100);
            try{ const j = (await get(`${TSDB}/${q}`, 2)) || {};
              (j.events || j.results || []).forEach(e => [[e.strHomeTeam, e.strHomeTeamBadge], [e.strAwayTeam, e.strAwayTeamBadge]].forEach(([n, b]) => {
                if (n && b && !equipes.some(x => x.strTeam === n)) equipes.push({strTeam:n, strBadge:b}); })); }catch{}
          }
        }
      }
    }catch{}
    let recherches = 0;
    for (const nom of sansLogo.keys()){
      let x = meilleurClub(nom, equipes);
      if (!x && recherches < 8){                                   // pas dans la liste (clé gratuite : liste parfois tronquée) : recherche par nom
        recherches++; await sleep(2100);
        try{ x = meilleurClub(nom, ((await get(`${TSDB}/searchteams.php?t=${encodeURIComponent(nom)}`, 2)) || {}).teams?.filter(y => y.strBadge && /rugby/i.test(y.strSport || '')) || []); }catch{}
      }
      c.u[nom] = x ? `${x.strBadge.replace(/^http:/, 'https:')}/small` : '';
    }
    write(file, c);
  }
  let poses = 0;
  sansLogo.forEach((t, nom) => { if (c.u[nom]) poses++; });
  [...events.flatMap(m => m.home ? [m.home, m.away] : []), ...lignes].forEach(t => { if (t && !t.logo && c.u[t.name]) t.logo = c.u[t.name]; });
  console.log(`  ${L.name} : logos TheSportsDB ${poses}/${sansLogo.size}`, JSON.stringify([...sansLogo.keys()].map(n => `${n}${c.u[n] ? ' ✓' : ' ✗'}`)));
  return {manque:sansLogo.size, poses};
}

/* v59 : logo des compétitions de rugby : ESPN n'a qu'une icône générique (ESPN-icon-rugby) → badge TheSportsDB (lookupleague).
   Identifiants TheSportsDB : Top 14 4430, Champions Cup 4550, Six Nations 4714, Coupe du monde 4574. Mémoire _logos-competitions.json (30 jours ; 1 jour si rien). */
const TSDB_LIGUE = {'270559':'4430', '271937':'4550', '180659':'4714', '164205':'4574'};
async function logoCompetition(L, info){
  const id = TSDB_LIGUE[L.id]; if (!id || !info || (info.logo && !/ESPN-icon/i.test(info.logo))) return;
  const file = `${OUT}/_logos-competitions.json`, c = read(file) || {};
  let x = c[L.id];
  if (!x || NOW - x.at > (x.u ? 30 : 1) * DAY){
    let u = '';
    try{ await sleep(2100); const lg = (((await get(`${TSDB}/lookupleague.php?id=${id}`, 2)) || {}).leagues || [])[0] || {};
      const b = lg.strBadge || lg.strLogo; if (b) u = `${b.replace(/^http:/, 'https:')}/small`; }catch{}
    x = c[L.id] = {u, at:NOW}; write(file, c);
  }
  console.log(`  ${L.name} : logo de la compétition ${x.u ? 'TheSportsDB ✓' : '✗ (icône ESPN gardée)'}`);
  if (x.u){ info.logo = x.u; info.logoDark = ''; }
}

/* ---------- Programme ---------- */
fs.mkdirSync(OUT, {recursive:true});
const index = {updated:new Date(NOW).toISOString(), leagues:{}};
const upcoming = [], passe = [];      // jours.json : J-4 à J+15 (chargé à l'ouverture) ; passe.json : J-11 à J-4 (chargé ensuite)
for (const L of LEAGUES){
  const t0 = Date.now(), file = `${OUT}/${slug(L.id)}.json`, prev = read(file), S = seasonOf(L);
  if (L.sport === 'racing'){                              // F1, MotoGP : séances, résultats et classements (outils/sport-course.mjs)
    try{
      const r = await racing(L, {get, NOW, prev});
      write(file, {v:1, id:L.id, updated:index.updated, season:r.season, diag:r.diag, gps:r.gps, catId:r.catId, table:r.table, events:r.events});
      index.leagues[L.id] = {count:r.events.length, gps:r.gps.length, table:r.table ? r.table.src : false, diag:{appels:r.diag.appels, erreurs:r.diag.erreurs.length}, file:`${slug(L.id)}.json`};
      r.events.filter(m => m.t >= NOW - 11 * DAY && m.t <= NOW + 15 * DAY).forEach(m => (m.t < NOW - 4 * DAY ? passe : upcoming).push(m));
      console.log(`${L.name} : ${r.gps.length} Grands Prix, ${r.events.length} séances, ${Math.round((Date.now() - t0) / 1000)} s`, r.diag.erreurs.slice(0, 3).join(' | '));
    }catch(e){
      index.leagues[L.id] = {error:String(e.message || e)};
      if (prev && prev.events) prev.events.filter(m => m.t >= NOW - 11 * DAY && m.t <= NOW + 15 * DAY).forEach(m => (m.t < NOW - 4 * DAY ? passe : upcoming).push(m));
      console.log(`${L.name} : ERREUR ${e.message}`);
    }
    continue;
  }
  try{
    const r = await eventsFor(L, S, prev);
    try{ await logoCompetition(L, r.info); }catch{}                          // v59
    if (r.idle){
      write(file, {v:1, id:L.id, ...r.info, updated:index.updated, idle:true, season:S.label});
      index.leagues[L.id] = {idle:true, file:`${slug(L.id)}.json`};
      console.log(`${L.name} : en pause`);
      continue;
    }
    const rounds = await numberRounds(L, S, r.events);
    await rugbyDetails(L, r.events, prev);
    const table = await standings(L, S, r.events, prev);
    try{ r.diag.logos = await logosClubs(L, r.events, table); }catch(e){ console.log(`  ${L.name} : logos TheSportsDB en échec (${e.message || e})`); }   // v58
    write(file, {v:1, id:L.id, ...r.info, updated:index.updated, season:S.label, range:{start:S.start, end:S.end}, diag:r.diag, calendar:r.calendar, checked:r.checked, future:r.future, completLe:r.completLe, rounds, table, events:r.events.map(slim)});
    index.leagues[L.id] = {count:r.events.length, rounds, table:table ? table.src || 'espn' : false, diag:r.diag, file:`${slug(L.id)}.json`};
    r.events.filter(m => m.t >= NOW - 11 * DAY && m.t <= NOW + 15 * DAY).forEach(m => (m.t < NOW - 4 * DAY ? passe : upcoming).push(m));
    console.log(`${L.name} : ${r.events.length} matchs, ${Math.round((Date.now() - t0) / 1000)} s`, JSON.stringify(rounds));
  }catch(e){
    index.leagues[L.id] = {error:String(e.message || e)};
    if (prev && prev.events) prev.events.filter(m => m.t >= NOW - 11 * DAY && m.t <= NOW + 15 * DAY).forEach(m => (m.t < NOW - 4 * DAY ? passe : upcoming).push(m));
    console.log(`${L.name} : ERREUR ${e.message}`);
  }
}
const logos = {};
for (const L of LEAGUES){ const f = read(`${OUT}/${slug(L.id)}.json`); if (f) logos[L.id] = {logo:f.logo || '', logoDark:f.logoDark || '', season:f.season || ''}; }
write(`${OUT}/jours.json`, {v:2, updated:index.updated, leagues:logos, events:upcoming.sort((a, b) => a.t - b.t).map(slim)});
write(`${OUT}/index.json`, index);
write(`${OUT}/passe.json`, {v:1, updated:index.updated, events:passe.sort((a, b) => a.t - b.t).map(slim)});
// Petit fichier pour le témoin « LIVE Sports » de l'accueil : matchs et séances d'hier soir à demain
const DUREE = {soccer:115, rugby:110, basketball:150, football:200, hockey:165};
write(`${OUT}/aujourdhui.json`, {v:1, updated:index.updated, events:upcoming.filter(m => m.t >= NOW - 8 * 3600e3 && m.t <= NOW + 30 * 3600e3).sort((a, b) => a.t - b.t).map(m => m.home
  ? {id:m.id, l:m.league, ln:NAME_OF[m.league], sp:SPORT_OF[m.league], t:m.t, d:DUREE[SPORT_OF[m.league]] || 120, s:m.state, h:m.home.full || m.home.name, a:m.away.full || m.away.name}
  : {id:m.id, l:m.league, ln:NAME_OF[m.league], t:m.t, d:m.dur || 60, s:m.state, h:m.gp ? m.gp.name : '', a:m.label || ''})});
// Prochains matchs (8 jours) pour l'accueil : la page y cherche ceux de tes favoris
const TV_OF = Object.fromEntries(LEAGUES.map(L => [L.id, (L.tv || [])[0] || '']));
write(`${OUT}/prochains.json`, {v:1, updated:index.updated, events:upcoming.filter(m => m.t >= NOW - 4 * 3600e3 && m.t <= NOW + 8 * DAY && m.state !== 'post').sort((a, b) => a.t - b.t).map(m => m.home
  ? {id:m.id, l:m.league, ln:NAME_OF[m.league], sp:SPORT_OF[m.league], t:m.t, d:DUREE[SPORT_OF[m.league]] || 120, s:m.state, h:m.home.full || m.home.name, a:m.away.full || m.away.name, hc:m.home.name, ac:m.away.name, tv:TV_OF[m.league] || undefined}
  : {id:m.id, l:m.league, ln:NAME_OF[m.league], sp:'racing', t:m.t, d:m.dur || 60, s:m.state, h:m.gp ? m.gp.name : '', a:m.label || ''})});
// v70 : fichier allégé pour la page Pronos et ses paris : compétitions des Pronos (et « en plus »), matchs de J-46 à J+8 sans le déroulé,
// logos et classement résumé (rang, points, bilan, place en conférence). Avant : les fichiers de saison complets, environ 4 fois plus lourds.
{
  const DEF_L = [{id:'fra.1'}, {id:'eng.1'}, {id:'270559'}, {id:'uefa.champions'}], DEF_X = ['esp.1', 'ita.1', 'ger.1', 'uefa.europa', 'uefa.europa.conf', 'nba', 'nfl'].map(id => ({id}));
  const ids = [...new Set([...CFG('pronos.ligues', DEF_L), ...CFG('pronos.extras', DEF_X)].map(x => String(x && x.id || '')).filter(Boolean))];
  const GARDE = ['rank', 'points', 'overall', 'playoffSeed'], pr = {v:1, updated:index.updated, leagues:{}};
  for (const id of ids){
    const f = read(`${OUT}/${slug(id)}.json`); if (!f || f.idle) continue;
    const forme = {};                                       // 5 derniers résultats de chaque équipe, du plus récent au plus ancien (v, n, d), sur toute la saison
    (f.events || []).filter(m => m.home && m.away && m.state === 'post' && m.home.score != null && m.away.score != null && m.home.score !== '' && m.away.score !== '')
      .sort((a, b) => b.t - a.t).forEach(m => [[m.home, m.away], [m.away, m.home]].forEach(([a, b]) => { const x = forme[a.id] || ''; if (x.length < 5) forme[a.id] = x + (+a.score > +b.score ? 'v' : +a.score < +b.score ? 'd' : 'n'); }));
    pr.leagues[id] = {logo:f.logo || '', logoDark:f.logoDark || '', forme,
      table:f.table && f.table.tables ? {tables:f.table.tables.map(tb => ({title:tb.title, entries:(tb.entries || []).map(e => ({id:e.id, stats:(e.stats || []).filter(x => GARDE.includes(x.name)).map(x => ({name:x.name, v:x.v}))}))}))} : null,
      events:(f.events || []).filter(m => m.home && m.t >= NOW - 46 * DAY && m.t <= NOW + 8 * DAY).map(({details, link, detail, roundSrc, ...m}) => m)};
  }
  write(`${OUT}/pronos.json`, pr);
}
console.log(`Terminé : ${calls} appels, ${fails} échecs, ${upcoming.length} matchs dans jours.json`);
