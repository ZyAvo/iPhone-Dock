// mon-ecran-version: 5fc0eedd
// Programme TV (v182) : outils de la tâche « Programme TV sport » autour de l'outil iptv-org/epg.
// Canal+ refusait presque toutes ses grilles (403) : il recevait des centaines de demandes à la fois (chaque grille charge
// toutes les fiches détaillées de ses émissions d'un coup). Canal+ est maintenant demandé à part, une chaîne à la fois,
// fiches chargées l'une après l'autre, avec un second essai si trop de grilles sont refusées.
//
//   node tv-canaux.mjs <chaines.xml> <secours.xml> <canal.xml> <autres.xml>   sépare Canal+ du reste (+ sources de secours)
//   node tv-canaux.mjs --doux <canalplus.com.config.js>                      fiches détaillées une à une (pause 150 ms)
//   node tv-canaux.mjs --echec <grab.log>                                    code 0 si plus de 30 % des grilles ont échoué
//   node tv-canaux.mjs --meilleur <guide1> <guide2> <log1> <log2>            garde le guide qui a le plus d'émissions (dans guide1/log1)
import fs from 'node:fs';

const [,, mode, ...a] = process.argv;
const lire = f => { try{ return fs.readFileSync(f, 'utf8'); }catch{ return ''; } };
const canaux = xml => xml.match(/<channel\b[^>]*>[^<]*<\/channel>/g) || [];
const ecrire = (f, l) => { if (l.length) fs.writeFileSync(f, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n  ${l.join('\n  ')}\n</channels>\n`); else fs.rmSync(f, {force:true}); };
const progres = log => (log.match(/\[\d+\/\d+\]\s+\S+\s+\([^)]*\)\s+-/g) || []).length;
const echecs = log => (log.match(/^\s*(?:\[\w+\]\s*)?ERR:/gm) || []).length;
const emissions = f => (lire(f).match(/<programme\b/g) || []).length;

if (mode === '--doux'){
  const f = a[0], src = lire(f);
  const avant = 'const detailsArray = await Promise.all(items.map(loadProgramDetails))';
  if (!src.includes(avant)){ console.log('Canal+ : module changé, fiches chargées comme prévu par iptv-org'); process.exit(0); }
  fs.writeFileSync(f, src.replace(avant, `const detailsArray = []
    for (const it of items){ detailsArray.push(await loadProgramDetails(it)); await new Promise(r => setTimeout(r, 150)) }   // KiosK v182 : une à une`));
  console.log('Canal+ : fiches détaillées chargées une à une');
} else if (mode === '--echec'){
  const log = lire(a[0]), n = progres(log), ko = echecs(log);
  console.log(`Canal+ : ${ko} grille(s) en échec sur ${n}`);
  process.exit(n && ko > 0.3 * n ? 0 : 1);
} else if (mode === '--meilleur'){
  const [g1, g2, l1, l2] = a, n1 = emissions(g1), n2 = emissions(g2);
  console.log(`Canal+ : ${n1} émissions au premier essai, ${n2} au second`);
  if (n2 > n1){ fs.copyFileSync(g2, g1); if (l2 && fs.existsSync(l2)) fs.copyFileSync(l2, l1); console.log('Canal+ : second essai gardé'); }
} else {
  const [ch, secours, canal, autres] = [mode, ...a];
  const l = canaux(lire(ch)), s = canaux(lire(secours));
  const deja = new Set(l.map(c => (c.match(/xmltv_id="([^"]*)"/) || [])[1]));
  const sup = s.filter(c => !deja.has((c.match(/xmltv_id="([^"]*)"/) || [])[1]));
  const estCanal = c => /site="canalplus\.com"/.test(c);
  ecrire(canal, l.filter(estCanal));
  ecrire(autres, [...l.filter(c => !estCanal(c)), ...sup]);
  console.log(`Chaînes : ${l.filter(estCanal).length} Canal+, ${l.length - l.filter(estCanal).length} autres, ${sup.length} de secours`);
}
