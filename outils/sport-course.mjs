// mon-ecran-version: f0ac3670
// Sports mécaniques pour la page Sport : Formule 1 et MotoGP (catégorie reine).
// - F1 : base ouverte Jolpica (suite d'Ergast) → calendrier, horaires de chaque séance, résultats, classements.
// - MotoGP : données publiques du site officiel (api.motogp.pulselive.com) → mêmes informations.
// Chaque séance devient un « événement » de la page Sport : {id, league, t, dur, state, ses, label, gp, top}.
const DAY = 864e5;
const JOL = 'https://api.jolpi.ca/ergast/f1';
const MGP = 'https://api.motogp.pulselive.com/motogp/v1';

export const LABEL = {
  FP1:'Essais libres 1', FP2:'Essais libres 2', FP3:'Essais libres 3', SQ:'Qualifications sprint', S:'Sprint', Q:'Qualifications', R:'Course',
  PR:'Essais', Q1:'Qualifications 1', Q2:'Qualifications 2', SPR:'Sprint', WUP:'Warm-up', RAC:'Course'
};
const DUR = {f1:{FP1:60, FP2:60, FP3:60, SQ:45, S:60, Q:60, R:120}, motogp:{FP1:45, FP2:30, PR:60, Q1:15, Q2:15, SPR:45, WUP:10, RAC:60}};
const RESULTS = {f1:['Q', 'S', 'R'], motogp:['Q2', 'SPR', 'RAC']};          // séances dont on garde le classement

/* Pays : nom français et drapeau à partir du code ISO */
const FR = new Intl.DisplayNames(['fr'], {type:'region'});
const ISO = {Australia:'AU', China:'CN', Japan:'JP', Bahrain:'BH', 'Saudi Arabia':'SA', USA:'US', 'United States':'US', Italy:'IT', Monaco:'MC',
  Spain:'ES', Canada:'CA', Austria:'AT', UK:'GB', 'United Kingdom':'GB', 'Great Britain':'GB', Belgium:'BE', Hungary:'HU', Netherlands:'NL',
  Azerbaijan:'AZ', Singapore:'SG', Mexico:'MX', Brazil:'BR', Qatar:'QA', UAE:'AE', 'United Arab Emirates':'AE', Portugal:'PT', France:'FR',
  Germany:'DE', Turkey:'TR', Argentina:'AR', Thailand:'TH', Malaysia:'MY', Indonesia:'ID', India:'IN', 'San Marino':'SM', 'Czech Republic':'CZ', Czechia:'CZ', Finland:'FI'};
const flagOf = iso => iso && /^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🏁';
const countryFR = iso => { try{ return iso === 'AE' ? 'Abou Dhabi' : FR.of(iso); }catch{ return iso || ''; } };
const PLACE_FR = {Barcelona:'Barcelone', 'Mexico City':'Mexico', 'São Paulo':'São Paulo', Montmeló:'Barcelone', Spielberg:'Spielberg'};

function stateOf(t, dur, hasTop, now){
  if (now < t) return 'pre';
  if (now < t + dur * 60e3) return 'in';
  return 'post';
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Formule 1 ---------- */
const F1KEYS = [['FirstPractice', 'FP1'], ['SecondPractice', 'FP2'], ['ThirdPractice', 'FP3'], ['SprintQualifying', 'SQ'], ['SprintShootout', 'SQ'], ['Sprint', 'S'], ['Qualifying', 'Q']];
const f1Name = d => d ? `${(d.givenName || '')[0] || ''}. ${d.familyName || ''}`.trim() : '?';
const at = x => x && x.date ? Date.parse(`${x.date}T${x.time || '12:00:00Z'}`) : null;

async function f1(L, {get, NOW, prev}){
  const diag = {source:'Jolpica', appels:0, erreurs:[]};
  const call = async url => { diag.appels++; await sleep(300); try{ return await get(url, 2); }catch(e){ diag.erreurs.push(`${url.replace(JOL, '')} : ${e.message}`); return null; } };
  let y = new Date(NOW).getUTCFullYear();
  let races = ((await call(`${JOL}/${y}/races/?limit=100`)) || {}).MRData?.RaceTable?.Races || [];
  const last = races.length ? at(races[races.length - 1]) : 0;
  if (last && last < NOW - 7 * DAY){                       // saison finie : on passe à la suivante si elle est publiée
    const nx = ((await call(`${JOL}/${y + 1}/races/?limit=100`)) || {}).MRData?.RaceTable?.Races || [];
    if (nx.length){ races = nx; y++; }
  }
  if (!races.length) throw new Error('calendrier F1 introuvable');
  const per = {}; races.forEach(r => { const c = r.Circuit.Location.country; per[c] = (per[c] || 0) + 1; });
  const old = new Map(((prev && prev.events) || []).filter(m => m.top && m.top.length).map(m => [m.id, m.top]));
  const events = [], gps = [];
  for (const r of races){
    const loc = r.Circuit.Location, iso = ISO[loc.country] || '';
    const place = per[loc.country] > 1 ? (PLACE_FR[loc.locality] || loc.locality) : countryFR(iso);
    const gp = {id:`f1-${y}-${r.round}`, round:+r.round, name:place, flag:flagOf(iso), circuit:r.Circuit.circuitName, ville:PLACE_FR[loc.locality] || loc.locality};
    const ses = F1KEYS.filter(([k]) => r[k]).map(([k, c]) => ({c, t:at(r[k])})).concat([{c:'R', t:at(r)}])
      .filter((s, i, a) => s.t && a.findIndex(x => x.c === s.c) === i).sort((a, b) => a.t - b.t);
    gp.start = ses[0] ? ses[0].t : at(r); gp.end = at(r);
    for (const s of ses){
      const id = `${gp.id}-${s.c}`, dur = DUR.f1[s.c] || 60;
      let top = old.get(id) || null;
      if (!top && RESULTS.f1.includes(s.c) && NOW > s.t + dur * 60e3 && NOW - s.t < 400 * DAY){
        const path = {R:'results', Q:'qualifying', S:'sprint'}[s.c];
        const j = await call(`${JOL}/${y}/${r.round}/${path}/`);
        const race = (((j || {}).MRData || {}).RaceTable || {}).Races?.[0] || {};
        const rows = race.Results || race.QualifyingResults || race.SprintResults || [];
        if (rows.length) top = rows.slice(0, 10).map(x => ({pos:+x.position, name:f1Name(x.Driver), team:(x.Constructor || {}).name || '',
          info:s.c === 'Q' ? (x.Q3 || x.Q2 || x.Q1 || '') : x.Time ? x.Time.time : (x.status || '')}));
      }
      events.push({id, league:L.id, t:s.t, dur, state:stateOf(s.t, dur, !!top, NOW), code:'SESSION', ses:s.c, label:LABEL[s.c], gp, ...(top ? {top} : {})});
    }
    gps.push(gp);
  }
  // Classements
  const ds = ((await call(`${JOL}/${y}/driverstandings/`)) || {}).MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  const cs = ((await call(`${JOL}/${y}/constructorstandings/`)) || {}).MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
  const st = (name, v, abbr) => ({name, type:name, v:String(v), abbr});
  const tables = [];
  if (ds.length) tables.push({title:'Pilotes', entries:ds.map(d => ({name:`${d.Driver.givenName} ${d.Driver.familyName}`, abbr:d.Driver.code || '', logo:'', note:null,
    stats:[st('rank', d.position || d.positionText, 'RK'), st('team', ((d.Constructors || [])[0] || {}).name || '', 'Écurie'), st('wins', d.wins, 'V'), st('points', d.points, 'Pts')]}))});
  if (cs.length) tables.push({title:'Écuries', entries:cs.map(c => ({name:c.Constructor.name, abbr:'', logo:'', note:null,
    stats:[st('rank', c.position || c.positionText, 'RK'), st('wins', c.wins, 'V'), st('points', c.points, 'Pts')]}))});
  const table = tables.length ? {season:String(y), src:'Jolpica', tables} : (prev && prev.table) || null;
  return {season:String(y), events, gps, table, diag};
}

/* ---------- MotoGP ---------- */
const MGP_PLACE = {'Jerez de la Frontera':'Jerez', Barcelona:'Barcelone', 'Montmeló':'Barcelone', 'Alcañiz':'Aragón', Cheste:'Valence', Valencia:'Valence', 'Le Mans':'Le Mans', 'Misano Adriatico':'Misano'};
async function motogp(L, {get, NOW, prev}){
  const diag = {source:'MotoGP', appels:0, erreurs:[]};
  const call = async url => { diag.appels++; try{ return await get(url, 2); }catch(e){ diag.erreurs.push(`${url.replace(MGP, '')} : ${e.message}`); return null; } };
  const seasons = (await call(`${MGP}/results/seasons`)) || [];
  let y = new Date(NOW).getUTCFullYear();
  let season = seasons.find(s => +s.year === y) || seasons.find(s => s.current);
  if (!season) throw new Error('saison MotoGP introuvable');
  const list = async s => [...((await call(`${MGP}/results/events?seasonUuid=${s.id}&isFinished=true`)) || []),
                           ...((await call(`${MGP}/results/events?seasonUuid=${s.id}&isFinished=false`)) || [])];
  let evs = (await list(season)).filter(e => !e.test && !/test/i.test(e.name || ''));
  const lastEnd = Math.max(0, ...evs.map(e => Date.parse(e.date_end) || 0));
  if (lastEnd && lastEnd < NOW - 7 * DAY){
    const nx = seasons.find(s => +s.year === y + 1);
    if (nx){ const n = (await list(nx)).filter(e => !e.test); if (n.length){ evs = n; season = nx; y++; } }
  }
  if (!evs.length) throw new Error('calendrier MotoGP introuvable');
  evs.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  const per = {}; evs.forEach(e => { const c = (e.country || {}).iso; per[c] = (per[c] || 0) + 1; });
  const prevGp = new Map(((prev && prev.gps) || []).map(g => [g.id, g]));
  const prevEv = new Map(((prev && prev.events) || []).map(m => [m.id, m]));
  const events = [], gps = [];
  let catId = prev && prev.catId, round = 0;
  for (const e of evs){
    round++;
    const iso = ((e.country || {}).iso || '').toUpperCase(), raw = (e.circuit && (e.circuit.place || e.circuit.name)) || '';
    const place = MGP_PLACE[raw] || raw;
    const gp = {id:`mgp-${e.id}`, round, name:per[(e.country || {}).iso] > 1 ? place : countryFR(iso), flag:flagOf(iso), circuit:(e.circuit || {}).name || '', ville:place,
                start:Date.parse(e.date_start), end:Date.parse(e.date_end) + DAY - 1};
    const was = prevGp.get(gp.id);
    // week-end terminé depuis plus de 3 jours et déjà lu : on garde ce qu'on a
    if (was && was.fini && gp.end < NOW - 3 * DAY){
      gps.push(was); (prev.events || []).filter(m => m.gp && m.gp.id === gp.id).forEach(m => events.push(m)); continue;
    }
    const cats = (await call(`${MGP}/results/categories?eventUuid=${e.id}`)) || [];
    const cat = cats.find(c => /moto\s*gp/i.test(c.name || '') && !/moto[23]/i.test(c.name || '')) || cats.find(c => c.id === catId);
    if (cat) catId = cat.id;
    const sessions = cat ? ((await call(`${MGP}/results/sessions?eventUuid=${e.id}&categoryUuid=${cat.id}`)) || []) : [];
    let done = 0, total = 0;
    for (const s of sessions){
      const type = String(s.type || '').toUpperCase(), code = type === 'FP' ? `FP${s.number || 1}` : type === 'Q' ? `Q${s.number || 1}` : type;
      if (!LABEL[code]) continue;
      const t = Date.parse(s.date); if (!t) continue;
      const id = `${gp.id}-${code}`, dur = DUR.motogp[code] || 45;
      let top = (prevEv.get(id) || {}).top || null;
      const over = NOW > t + dur * 60e3;
      if (!top && over && RESULTS.motogp.includes(code)){
        const c = await call(`${MGP}/results/session/${s.id}/classification?test=false`);
        const rows = ((c || {}).classification || []).filter(x => x.position);
        if (rows.length) top = rows.slice(0, 10).map(x => ({pos:+x.position, name:(x.rider || {}).full_name || '?', team:(x.team || {}).name || '',
          info:x.time || (x.gap && x.gap.first ? '+' + x.gap.first : '') || x.status || ''}));
      }
      total++; if (over) done++;
      events.push({id, league:L.id, t, dur, state:stateOf(t, dur, !!top, NOW), code:'SESSION', ses:code, label:LABEL[code], gp, sid:s.id, ...(top ? {top} : {})});
    }
    gp.fini = total > 0 && done === total;
    gp.horaires = total > 0;                             // sinon : seules les dates du week-end sont connues
    gps.push(gp);
  }
  // Classement des pilotes
  let table = null;
  if (catId){
    const sj = await call(`${MGP}/results/standings?seasonUuid=${season.id}&categoryUuid=${catId}`);
    const rows = ((sj || {}).classification || []);
    const st = (name, v, abbr) => ({name, type:name, v:String(v ?? ''), abbr});
    if (rows.length) table = {season:String(y), src:'MotoGP', tables:[{title:'Pilotes', entries:rows.map(x => ({name:(x.rider || {}).full_name || '?', abbr:'', logo:'', note:null,
      stats:[st('rank', x.position, 'RK'), st('team', (x.team || {}).name || (x.constructor || {}).name || '', 'Équipe'), st('wins', x.race_wins ?? '', 'V'), st('points', x.points, 'Pts')]}))}]};
  }
  if (!table && prev && prev.table) table = prev.table;
  return {season:String(y), events, gps, table, catId, diag};
}

export async function racing(L, ctx){
  if (L.id === 'f1') return f1(L, ctx);
  if (L.id === 'motogp') return motogp(L, ctx);
  throw new Error('sport mécanique inconnu : ' + L.id);
}
