// mon-ecran-version: 2accd45c
// Cotes des matchs (lancé toutes les 10 min par la tâche GitHub « Cotes », avec le secret ODDS_API_KEY de The Odds API).
// Plan (option 1) pour les 5 grands championnats et les 3 coupes d'Europe, cote 1 / N / 2 des sites français :
//   - un relevé le matin (à partir de 8 h) pour chaque compétition qui joue ce jour-là ;
//   - un relevé 15 min avant chaque horaire de coup d'envoi ;
//   - un relevé à la mi-temps (50 à 70 min après le coup d'envoi).
// Une demande = 1 crédit et rapporte tous les matchs de la compétition. Le compteur vient des en-têtes de l'API.
// Garde-fous : sous 120 crédits restants, plus de relevé de mi-temps ; sous 40, plus aucun relevé automatique
// (les derniers crédits restent pour l'actualisation à la main depuis la page Sport).
// Écrit donnees/cotes/cotes.json et indique au workflow s'il faut publier (CHANGE=1).
import fs from 'node:fs';
import {CFG} from './config-lire.mjs';

const KEY = (process.env.ODDS_API_KEY || '').trim();
const OUT = process.env.COTES_OUT || 'donnees/cotes';
const NOW = Date.now(), MIN = 60e3, DAY = 864e5;
const API = process.env.COTES_API || 'https://api.the-odds-api.com/v4';
const BOOKS = CFG('cotes.sites', ['winamax_fr', 'betclic_fr', 'unibet_fr', 'pmu_fr', 'netbet_fr']);     // sites français (moins de 10 : 1 crédit par demande)
const SEUIL_MT = 120, SEUIL_AUTO = 40;
/* compétition ESPN → clé The Odds API (vérifiée avec la liste gratuite /sports ; à défaut, recherche par nom) */
const COMPS = CFG('cotes.comps', null) || {
  'fra.1':{cle:'soccer_france_ligue_one', re:/ligue 1/i},
  'eng.1':{cle:'soccer_epl', re:/^epl$|premier league/i},
  'esp.1':{cle:'soccer_spain_la_liga', re:/la ?liga/i},
  'ita.1':{cle:'soccer_italy_serie_a', re:/serie a/i},
  'ger.1':{cle:'soccer_germany_bundesliga', re:/^bundesliga(?! 2)/i},
  'uefa.champions':{cle:'soccer_uefa_champs_league', re:/champions league(?!.*qualif)/i},
  'uefa.europa':{cle:'soccer_uefa_europa_league', re:/europa league/i},
  'uefa.europa.conf':{cle:'soccer_uefa_europa_conference_league', re:/conference league/i}
};
const read = f => { try{ return JSON.parse(fs.readFileSync(f, 'utf8')); }catch{ return null; } };
fs.mkdirSync(OUT, {recursive:true});
const FILE = `${OUT}/cotes.json`;
const prev = read(FILE) || {};
const quota0 = prev.quota ? prev.quota.restants : null;
const st = {v:1, maj:prev.maj || null, quota:prev.quota || null, cles:prev.cles || {}, fait:prev.fait || {}, matchs:prev.matchs || {}, journal:(prev.journal || []).slice(-40), plan:prev.plan || null};
let change = false;
const note = t => { st.journal.push(`${new Date(NOW).toISOString().slice(0, 16)}Z ${t}`); console.log(t); };
const fin = () => {
  // ménage : matchs et relevés de plus de 3 jours
  for (const [id, m] of Object.entries(st.matchs)) if (m.t < NOW - 3 * DAY) delete st.matchs[id];
  for (const k of Object.keys(st.fait)) if (st.fait[k] < NOW - 4 * DAY) delete st.fait[k];
  if (st.quota && st.quota.restants !== quota0) change = true;      // crédits dépensés ailleurs (à la main) : compteur republié
  fs.writeFileSync(FILE, JSON.stringify(st));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `change=${change ? 1 : 0}\n`);
};
if (!KEY){ console.log('Pas de clé (secret ODDS_API_KEY) : rien à faire.'); st.erreur = 'Clé ODDS_API_KEY absente'; fin(); process.exit(0); }

async function api(path, params = {}){
  const u = new URL(API + path); u.searchParams.set('apiKey', KEY);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, {signal:AbortSignal.timeout(20000)});
  const rest = r.headers.get('x-requests-remaining'), used = r.headers.get('x-requests-used');
  if (rest != null) st.quota = {restants:+rest, utilises:+used, total:+rest + +used, at:NOW};
  if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 ? ' (clé refusée ou crédits épuisés)' : ''));
  return r.json();
}

/* matchs prévus (préparés par la tâche « Programme TV sport ») */
const jours = read('donnees/sport/jours.json') || {events:[]};
const matchs = (jours.events || []).filter(m => COMPS[m.league] && m.home && m.t > NOW - 3 * 3600e3 && m.t < NOW + 2 * DAY);
const paris = new Intl.DateTimeFormat('fr-CA', {timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit'});
const jourDe = t => paris.format(new Date(t));
const heureParis = +new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Paris', hour:'2-digit', hour12:false}).format(new Date(NOW));

/* relevés dus maintenant */
const dus = [];   // {lg, phase, slot}
const parComp = {};
matchs.forEach(m => { (parComp[m.league] = parComp[m.league] || []).push(m); });
for (const [lg, ms] of Object.entries(parComp)){
  const auj = ms.filter(m => jourDe(m.t) === jourDe(NOW));
  const kMatin = `${lg}|${jourDe(NOW)}|matin`;
  if (auj.length && heureParis >= 8 && !st.fait[kMatin] && auj.some(m => m.t > NOW + 20 * MIN)) dus.push({lg, phase:'matin', k:kMatin, ids:auj.map(m => m.id)});
  for (const t of [...new Set(ms.map(m => m.t))]){
    const ids = ms.filter(m => m.t === t).map(m => m.id);
    const kAv = `${lg}|${t}|avant`, kMt = `${lg}|${t}|mi-temps`;
    // fenêtres larges : les tâches programmées de GitHub partent souvent avec 10 à 45 min de retard
    if (!st.fait[kAv] && NOW >= t - 45 * MIN && NOW < t) dus.push({lg, phase:'avant', k:kAv, ids});
    if (!st.fait[kMt] && NOW >= t + 48 * MIN && NOW < t + 80 * MIN) dus.push({lg, phase:'mi-temps', k:kMt, ids});
  }
}
// une seule demande par compétition, même si plusieurs relevés tombent en même temps
const demandes = {};
dus.forEach(d => { (demandes[d.lg] = demandes[d.lg] || []).push(d); });
if (!Object.keys(demandes).length){
  // rien à relever : on lit quand même le compteur (liste /sports, gratuite) pour voir les crédits dépensés à la main
  console.log('Aucun relevé à faire maintenant.');
  try{ await api('/sports'); }catch(e){ console.log('Compteur non lu : ' + e.message); }
  fin(); process.exit(0);
}

/* noms d'équipes comparables (ESPN / The Odds API) */
const ALIAS = {psg:'paris', utd:'united', man:'manchester', spurs:'tottenham', wolves:'wolverhampton', nottm:'nottingham', inter:'internazionale', gladbach:'monchengladbach', leverkusen:'leverkusen', atleti:'atletico', bilbao:'athletic', betis:'betis', om:'marseille', ol:'lyon', rennais:'rennes', toulousain:'toulouse', rochelais:'rochelle', nantais:'nantes', brestois:'brest', lorientais:'lorient', havrais:'havre', auxerrois:'auxerre', messin:'metz', st:'saint'};
const mots = s => String(s || '').toLowerCase().replace(/[ßæœø]/g, c => ({ß:'ss', æ:'ae', œ:'oe', ø:'o'})[c]).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(w => ALIAS[w] || w)
  .filter(w => w.length >= 3 && !['fc', 'cf', 'afc', 'club', 'calcio', 'football', 'sporting', 'olympique', 'stade', 'real', 'and', 'the', 'ssc', 'acf'].includes(w));
const proche = (a, b) => { const A = mots(a), B = mots(b); return A.some(w => B.some(x => x === w || (w.length > 4 && x.length > 4 && (x.startsWith(w) || w.startsWith(x))))); };

/* rapprochement ESPN ↔ The Odds API : les deux équipes si possible ; sinon une seule (ex. « Stade Rennais » / « Rennes »),
   à condition que ce soit le seul match du créneau qui lui corresponde */
function apparier(evs, m, proche){
  const H = m.home.full || m.home.name, A = m.away.full || m.away.name;
  const cand = evs.filter(x => Math.abs(x.commence_time * 1000 - m.t) < 3 * 3600e3).map(x => {
    const droit = proche(x.home_team, H) + proche(x.away_team, A), inverse = proche(x.home_team, A) + proche(x.away_team, H);
    return {x, droit, inverse, s:Math.max(droit, inverse)};
  });
  for (const s of [2, 1]){ const l = cand.filter(c => c.s === s); if (l.length === 1) return {e:l[0].x, inv:l[0].inverse > l[0].droit}; if (l.length > 1) return null; }
  return null;
}

(async () => {
  try{
    // liste gratuite des compétitions : vérifie les clés (une fois par jour)
    if (!st.cles._at || NOW - st.cles._at > DAY){
      const sports = await api('/sports');
      for (const [lg, c] of Object.entries(COMPS)){
        const hit = sports.find(s => s.key === c.cle) || sports.find(s => s.group === 'Soccer' && c.re instanceof RegExp && c.re.test(s.title) && !/winner|qualif/i.test(s.title + ' ' + s.description));
        st.cles[lg] = hit ? hit.key : null;
      }
      st.cles._at = NOW;
    }
    // compteur à jour avant de dépenser (la liste /sports est gratuite et renvoie aussi le compteur)
    else await api('/sports');
    const rest = st.quota ? st.quota.restants : 500;
    for (const [lg, liste] of Object.entries(demandes)){
      const cle = st.cles[lg];
      if (!cle){ note(`${lg} : pas couverte par The Odds API`); liste.forEach(d => { st.fait[d.k] = NOW; }); change = true; continue; }
      const r0 = st.quota ? st.quota.restants : rest;
      const garder = liste.filter(d => r0 > SEUIL_AUTO && (d.phase !== 'mi-temps' || r0 > SEUIL_MT));
      if (!garder.length){ note(`${lg} : relevé ${liste.map(d => d.phase).join('+')} sauté (plus que ${r0} crédits)`); liste.forEach(d => { st.fait[d.k] = NOW; }); change = true; continue; }
      const evs = await api(`/sports/${cle}/odds`, {bookmakers:BOOKS.join(','), markets:'h2h', oddsFormat:'decimal', dateFormat:'unix'});
      let n = 0;
      for (const m of matchs.filter(x => x.league === lg)){
        const ap = apparier(evs, m, proche);
        if (!ap){ if (liste.some(d => d.ids.includes(m.id))) note(`${lg} : ${m.home.name} – ${m.away.name} introuvable chez les sites de paris`); continue; }
        const {e, inv} = ap;
        const sites = {};
        for (const b of e.bookmakers || []){
          const mk = (b.markets || []).find(x => x.key === 'h2h'); if (!mk) continue;
          const o = n2 => (mk.outcomes.find(x => x.name === n2) || {}).price;
          const h = o(e.home_team), a = o(e.away_team), d = o('Draw');
          if (h && a) sites[b.key] = inv ? {h:a, d, a:h} : {h, d, a};
        }
        if (!Object.keys(sites).length) continue;
        const rec = st.matchs[m.id] = st.matchs[m.id] || {t:m.t, lg, releves:[]};
        rec.eq = [m.home.name, m.away.name];          // noms des équipes, pour la page « Écarts de cotes »
        rec.t = m.t; rec.dernier = {at:NOW, sites};
        for (const d of garder.filter(d => d.ids.includes(m.id))) rec.releves = [...rec.releves.filter(x => x.phase !== d.phase), {phase:d.phase, at:NOW, sites}];
        n++;
      }
      garder.forEach(d => { st.fait[d.k] = NOW; }); liste.forEach(d => { st.fait[d.k] = st.fait[d.k] || NOW; });
      note(`${lg} : ${garder.map(d => d.phase).join('+')} · ${n} match${n > 1 ? 's' : ''} · reste ${st.quota ? st.quota.restants : '?'} crédits`);
      change = true;
    }
    st.maj = NOW; delete st.erreur;
  }catch(e){ note('Erreur : ' + e.message); st.erreur = e.message; change = true; }
  fin();
})();
