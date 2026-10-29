// Résumé « État des données » (etat.json) : un petit fichier lu par l'accueil (pastille) et par etat.html.
// Lancé par la tâche « Publication », après la reprise des dernières données.
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => { try{ return JSON.parse(fs.readFileSync(f, 'utf8')); }catch{ return null; } };

/* Noms des compétitions : lus dans sport.html */
let LEAGUES = [], VERSION = '';
try{
  const page = fs.readFileSync('sport.html', 'utf8');
  const a = page.indexOf('const LEAGUES = ['), b = page.indexOf('\n];', a);
  LEAGUES = vm.runInNewContext('(' + page.slice(a + 'const LEAGUES = '.length, b + 2) + ')');
  VERSION = (page.match(/const VERSION = '([^']+)'/) || [])[1] || '';
}catch{}
const NAME = Object.fromEntries(LEAGUES.map(L => [L.id, L.name]));
const ORDER = id => { const i = LEAGUES.findIndex(L => L.id === id); return i < 0 ? 999 : i; };

const idx = read('donnees/sport/index.json');
/* Logos des compétitions : le tien (logos/competitions/<nom>.png) ou celui d'ESPN */
const slugify = x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fjLogos = (read('fichiers.json') || {}).logos || [];
const mesLogos = new Set(fjLogos.filter(f => f.startsWith('logos/competitions/')).map(f => slugify(f.split('/').pop().replace(/\.[a-z0-9]+$/i, ''))));
const logoDe = id => { const nom = NAME[id] || id, f = read(`donnees/sport/${slugify(id)}.json`);
  return {fichier:`logos/competitions/${slugify(nom)}.png`, perso:mesLogos.has(slugify(nom)) || mesLogos.has(slugify(id)), espn:!!(f && f.logo)}; };
const sport = idx && {
  updated:idx.updated, version:VERSION,
  ligues:Object.entries(idx.leagues || {}).map(([id, v]) => ({
    id, nom:NAME[id] || id, pause:!!v.idle, erreur:v.error || '', matchs:v.count ?? null,
    classement:v.table === false || !v.table ? 'absent' : v.table === 'calc' ? 'recalculé' : typeof v.table === 'string' && v.table !== 'espn' ? v.table : 'ESPN',
    avert:v.diag && v.diag.erreurs ? `${v.diag.erreurs} requête${v.diag.erreurs > 1 ? 's' : ''} en échec` : '',
    journees:v.rounds && v.rounds.ref != null ? `${v.rounds.ref} d'après ton calendrier` : '',
    joursEnEchec:(v.diag && v.diag.failed) || 0,
    logo:logoDe(id)
  })).sort((x, y) => ORDER(x.id) - ORDER(y.id))
};

const tvj = read('tv.json');
const tv = tvj && {
  updated:tvj.updated, programmes:(tvj.programmes || []).length,
  chaines:Object.entries((tvj.etat && tvj.etat.chaines) || {}).map(([nom, x]) => ({nom, n:x.n, jusqu:x.jusqu, source:x.source || ''})).sort((x, y) => x.nom.localeCompare(y.nom, 'fr', {numeric:true})),
  vides:(tvj.etat && tvj.etat.vides) || [],
  erreurs:((tvj.etat && tvj.etat.erreurs) || []).filter(l => /ERR|status|fail|timeout/i.test(l)).slice(-8)
};

const aj = read('donnees/actus/actus.json');
const actus = aj && {
  updated:aj.updated,
  sources:(aj.sources || []).map(s => ({nom:s.name, onglets:(s.onglets || []).join(', '), ok:s.ok, n:s.n || 0, erreur:s.ok ? '' : s.err || '', secours:s.trouve || ''}))
    .sort((x, y) => (x.ok - y.ok) || (!!y.secours - !!x.secours)),
  onglets:Object.fromEntries(Object.entries(aj.tabs || {}).map(([k, v]) => [k, (v.items || []).length]))
};

const mj = read('donnees/marches/marches.json');
const marches = mj && {
  updated:mj.updated,
  series:Object.entries(mj.cours || {}).map(([k, c]) => ({cle:k, nom:c.n || k, symbole:c.s, ancien:!!c.ancien, au:c.at ? new Date(c.at).toISOString() : null})),
  taux:Object.values(mj.taux || {}).map(t => ({nom:t.nom, per:t.per, ancien:!!t.ancien})),
  erreurs:((mj.diag && mj.diag.ko) || []).slice(0, 12)
};

const fj = read('fichiers.json');
const fichiers = fj && {calendriers:fj.calendriers || [], logos:(fj.logos || []).length};

fs.writeFileSync('etat.json', JSON.stringify({genere:new Date().toISOString(), sport, tv, actus, marches, fichiers}));
console.log('etat.json écrit', JSON.stringify({sport:!!sport, tv:!!tv, actus:!!actus, marches:!!marches, fichiers:!!fichiers}));
