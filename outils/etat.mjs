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
const sport = idx && {
  updated:idx.updated, version:VERSION,
  ligues:Object.entries(idx.leagues || {}).map(([id, v]) => ({
    id, nom:NAME[id] || id, pause:!!v.idle, erreur:v.error || '', matchs:v.count ?? null,
    classement:v.table === false ? 'absent' : v.table === 'calc' ? 'recalculé' : v.table ? 'ESPN' : 'absent',
    journees:v.rounds && v.rounds.ref != null ? `${v.rounds.ref} d'après ton calendrier` : '',
    joursEnEchec:(v.diag && v.diag.failed) || 0
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

const fj = read('fichiers.json');
const fichiers = fj && {calendriers:fj.calendriers || [], logos:(fj.logos || []).length};

fs.writeFileSync('etat.json', JSON.stringify({genere:new Date().toISOString(), sport, tv, actus, fichiers}));
console.log('etat.json écrit', JSON.stringify({sport:!!sport, tv:!!tv, actus:!!actus, fichiers:!!fichiers}));
