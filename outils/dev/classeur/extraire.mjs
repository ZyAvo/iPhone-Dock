// mon-ecran-version: 6cad0c13
// Extrait les réglages actuels écrits dans le code des pages → reference.json (état « avant »)
import fs from 'node:fs'; import vm from 'node:vm';
const D = process.argv[2], OUT = process.argv[3];
const rd = f => fs.readFileSync(`${D}/${f}`, 'utf8');
const rx = v => Object.prototype.toString.call(v) === '[object RegExp]' ? {re:v.source, flags:v.flags} : Array.isArray(v) ? v.map(rx) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rx(x)])) : v;
function lit(src, name, open = '['){
  const a = src.indexOf(`const ${name} = ${open}`); if (a < 0) throw new Error('introuvable ' + name);
  const close = open === '[' ? '\n];' : '\n};';
  let b = src.indexOf(close, a); let txt;
  if (b < 0 || src.slice(a, b).split('\n').length < 2 && !src.slice(a, b).includes('\n')){ const e = src.indexOf('\n', a); txt = src.slice(a + `const ${name} = `.length, e).replace(/;\s*(\/\/.*)?$/, ''); }
  else txt = src.slice(a + `const ${name} = `.length, b + 2);
  return rx(vm.runInNewContext('(' + txt + ')', {sc:n => `shortcuts://run-shortcut?name=${encodeURIComponent(n)}`}));
}
const one = (src, name) => { const a = src.indexOf(`const ${name} = `); const e = src.indexOf('\n', a); return rx(vm.runInNewContext('(' + src.slice(a + `const ${name} = `.length, e).replace(/;\s*(\/\/.*)?$/, '') + ')')); };
const sport = rd('sport.html'), actus = rd('actus.html'), invest = rd('invest.html'), videos = rd('videos.html'), index = rd('index.html'), cotes = rd('outils/cotes-data.mjs'), tvxml = rd('outils/chaines-tv.xml'), etat = rd('etat.html');
const ref = {
  sport:{regions:lit(sport, 'REGIONS'), leagues:lit(sport, 'LEAGUES'), favoris:one(sport, 'FAV_DEFAULT')},
  actus:{fr:lit(actus, 'TABS_FR'), autres:lit(actus, 'TABS_AUTRES'), en:lit(actus, 'TABS_EN')},
  marches:{indices:lit(invest, 'INDICES'), suivi:lit(invest, 'SUIVI')},
  videos:{plateformes:lit(videos, 'PLATEFORMES'), chaines_yt:lit(videos, 'CHAINES_YT')},
  tv:{chaines:[...tvxml.matchAll(/<channel site="([^"]*)" site_id="([^"]*)" lang="([^"]*)" xmltv_id="([^"]*)">([^<]*)<\/channel>/g)].map(m => ({site:m[1], site_id:m[2], lang:m[3], xmltv_id:m[4], nom:m[5]}))},
  cotes:{sites:one(cotes, 'BOOKS'), comps:lit(cotes, 'COMPS', '{')},
  accueil:{meteo:lit(index, 'FAV_DEFAULT'), une:one(index, 'WIDGET_FEED'), indices_widget:lit(index, 'INV_IDX').map(x => x[0])},
  apparence:{palettes:lit(etat, 'PALETTES').map(p => p.id), palette:'bleu', mode:'auto'},
  applis:{dossiers:lit(index, 'FOLDERS', '{'), accueil:lit(index, 'HOME'), bas_gauche:lit(index, 'QUICK_LEFT'), bas_droite:lit(index, 'QUICK_RIGHT'), navigation:lit(index, 'NAV_APPS')}
};
fs.writeFileSync(OUT, JSON.stringify(ref, null, 1));
console.log(Object.entries(ref).map(([k, v]) => k + ':' + Object.entries(v).map(([a, b]) => `${a}=${Array.isArray(b) ? b.length : typeof b === 'object' ? Object.keys(b).length : b}`).join(',')).join('\n'));
