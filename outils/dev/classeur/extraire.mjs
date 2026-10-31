// mon-ecran-version: eb5e9d83
// Extrait les réglages actuels écrits dans le code des pages → reference.json (état « avant »)
import fs from 'node:fs'; import vm from 'node:vm';
const D = process.argv[2], OUT = process.argv[3];
const rd = f => fs.readFileSync(`${D}/${f}`, 'utf8');
const rx = v => Object.prototype.toString.call(v) === '[object RegExp]' ? {re:v.source, flags:v.flags} : Array.isArray(v) ? v.map(rx) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rx(x)])) : v;
/* valeur d'origine d'une constante écrite dans une page : « const X = [ … ]; », ou depuis la phase 2 « const X = CFG('…', [ … ]); »
   (ou Noyau.config / Noyau.accueil.une) : CFG renvoie ici sa valeur par défaut, celle écrite dans la page.
   On prend les lignes qui suivent « const X = » jusqu'à obtenir une expression JavaScript complète. */
const CTX = {sc:n => `shortcuts://run-shortcut?name=${encodeURIComponent(n)}`, CFG:(k, d) => d,
             Noyau:{config:(k, d) => d, accueil:{une:d => d, page:() => true, widget:() => true}}};
function lit(src, name){ return rx(brut(src, name)); }
function brut(src, name){
  const debut = `const ${name} = `, a = src.indexOf(debut); if (a < 0) throw new Error('introuvable ' + name);
  const lignes = src.slice(a + debut.length).split('\n');
  for (let n = 1; n <= lignes.length && n <= 2000; n++){
    const txt = lignes.slice(0, n).join('\n').replace(/;\s*(\/\/.*)?$/, '');
    try{ new vm.Script('(' + txt + '\n)'); }catch{ continue; }               // expression pas encore complète : une ligne de plus
    const ctx = {...CTX};
    for (let k = 0; k < 20; k++){                                            // une autre constante de la page : lue de la même façon
      try{ return vm.runInNewContext('(' + txt + '\n)', ctx); }
      catch(e){ const m = e instanceof ReferenceError || e.name === 'ReferenceError' ? /^(\w+) is not defined/.exec(e.message) : null; if (!m) throw e; ctx[m[1]] = brut(src, m[1]); }
    }
  }
  throw new Error('expression illisible ' + name);
}
const one = lit;
const sport = rd('sport.html'), actus = rd('actus.html'), invest = rd('invest.html'), videos = rd('videos.html'), index = rd('index.html'), cotes = rd('outils/cotes-data.mjs'), tvxml = rd('outils/chaines-tv.xml'), themes = rd('themes.js');
const ref = {
  sport:{regions:lit(sport, 'REGIONS'), leagues:lit(sport, 'LEAGUES'), favoris:one(sport, 'FAV_DEFAULT')},
  actus:{fr:lit(actus, 'TABS_FR'), autres:lit(actus, 'TABS_AUTRES'), en:lit(actus, 'TABS_EN')},
  marches:{indices:lit(invest, 'INDICES'), suivi:lit(invest, 'SUIVI')},
  videos:{plateformes:lit(videos, 'PLATEFORMES'), chaines_yt:lit(videos, 'CHAINES_YT')},
  tv:{chaines:[...tvxml.matchAll(/<channel site="([^"]*)" site_id="([^"]*)" lang="([^"]*)" xmltv_id="([^"]*)">([^<]*)<\/channel>/g)].map(m => ({site:m[1], site_id:m[2], lang:m[3], xmltv_id:m[4], nom:m[5]}))},
  cotes:{sites:one(cotes, 'BOOKS'), comps:lit(cotes, 'COMPS')},
  accueil:{meteo:lit(index, 'FAV_DEFAULT'), une:one(index, 'WIDGET_FEED'), indices_widget:lit(index, 'INV_IDX').map(x => x[0])},
  apparence:{palettes:lit(themes, 'THEMES').map(p => p.id), noms:lit(themes, 'THEMES').map(p => [p.id, p.nom]), palette:'bleu', mode:'auto'},
  applis:{dossiers:lit(index, 'FOLDERS'), accueil:lit(index, 'HOME'), bas_gauche:lit(index, 'QUICK_LEFT'), bas_droite:lit(index, 'QUICK_RIGHT'), navigation:lit(index, 'NAV_APPS')}
};
fs.writeFileSync(OUT, JSON.stringify(ref, null, 1));
console.log(Object.entries(ref).map(([k, v]) => k + ':' + Object.entries(v).map(([a, b]) => `${a}=${Array.isArray(b) ? b.length : typeof b === 'object' ? Object.keys(b).length : b}`).join(',')).join('\n'));
