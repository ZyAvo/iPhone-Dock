// mon-ecran-version: 46c15f05
// Trie le programme TV (XMLTV) et ne garde que le sport -> tv.json
import fs from 'node:fs';
const [,, src = 'guide.xml', out = 'tv.json', logFile = ''] = process.argv;
const NAMES = {
  CPLUS: 'Canal+',
  CPLUS_B: 'Canal+',
  CPSPORT: 'Canal+ Sport',
  CPSPORT_B: 'Canal+ Sport',
  CPFOOT: 'Canal+ Foot',
  CPFOOT_B: 'Canal+ Foot',
  CP360: 'Canal+ Sport 360',
  CP360_B: 'Canal+ Sport 360',
  CPLIVE1: 'Canal+ Live 1',
  CPLIVE2: 'Canal+ Live 2',
  CPLIVE3: 'Canal+ Live 3',
  CPLIVE4: 'Canal+ Live 4',
  CPLIVE5: 'Canal+ Live 5',
  CPLIVE6: 'Canal+ Live 6',
  CPLIVE7: 'Canal+ Live 7',
  CPLIVE8: 'Canal+ Live 8',
  CPLIVE9: 'Canal+ Live 9',
  CPLIVE10: 'Canal+ Live 10',
  CPLIVE11: 'Canal+ Live 11',
  CPLIVE12: 'Canal+ Live 12',
  CPLIVE13: 'Canal+ Live 13',
  CPLIVE14: 'Canal+ Live 14',
  CPLIVE15: 'Canal+ Live 15',
  CPLIVE16: 'Canal+ Live 16',
  CPLIVE17: 'Canal+ Live 17',
  CPLIVE18: 'Canal+ Live 18',
  CPLIVE19: 'Canal+ Live 19',
  BEIN1: 'beIN Sports 1',
  BEIN2: 'beIN Sports 2',
  BEIN3: 'beIN Sports 3',
  BEINMAX4: 'beIN Sports Max 4',
  BEINMAX5: 'beIN Sports Max 5',
  BEINMAX6: 'beIN Sports Max 6',
  BEINMAX7: 'beIN Sports Max 7',
  BEINMAX8: 'beIN Sports Max 8',
  BEINMAX9: 'beIN Sports Max 9',
  BEINMAX10: 'beIN Sports Max 10',
  DAZN1: 'DAZN 1',
  DAZN2: 'DAZN 2',
  DAZN3: 'DAZN 3',
  DAZN4: 'DAZN 4',
  DAZN5: 'DAZN 5',
  L1P1: 'Ligue 1+',
  L1P2: 'Ligue 1+ 2',
  L1P3: 'Ligue 1+ 3',
  L1P4: 'Ligue 1+ 4',
  L1P5: 'Ligue 1+ 5',
  L1P6: 'Ligue 1+ 6',
  L1P7: 'Ligue 1+ 7',
  L1P8: 'Ligue 1+ 8',
  L1P9: 'Ligue 1+ 9',
  EQUIPE: "La chaîne L'Équipe",
  EUROSPORT1: 'Eurosport 1',
  EUROSPORT2: 'Eurosport 2',
  INFOSPORT: 'Infosport+',
  CPPL: 'Canal+ Premier League',
  CPTOP14: 'Canal+ Top 14',
  RMC1: 'RMC Sport 1',
  RMC2: 'RMC Sport 2'
};
const xml = fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '';
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').trim();
const tag = (body, t) => { const m = body.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? dec(m[1]) : ''; };
const tags = (body, t) => [...body.matchAll(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'g'))].map(m => dec(m[1]));
const time = s => { const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-]\d{4})?/.exec(s || ''); if (!m) return null;
  const z = m[7] ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : 'Z'; return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${z}`).toISOString(); };
const SPORT = /sport|foot|soccer|rugby|basket|nba|nfl|nhl|hockey|ligue|league|liga|serie a|bundesliga|top 14|pro d2|champions|europa|coupe|cup|tournoi|nations|match|multiplex/i;
const now = Date.now(), seen = new Set(), list = [];
for (const m of xml.matchAll(/<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g)){
  const attr = k => (m[1].match(new RegExp(`${k}="([^"]*)"`)) || [])[1];
  // Plusieurs sources par chaîne : sans suffixe = principale, puis _S (SFR), _E (epgshare01), _W (site beIN)
  const id = attr('channel') || '', sfx = (id.match(/_(S|E|W)$/) || [''])[0], c = NAMES[sfx ? id.slice(0, -sfx.length) : id]; if (!c) continue;
  const prio = {'':0, _S:1, _E:2, _W:3}[sfx];
  const s = time(attr('start')), e = time(attr('stop')); if (!s) continue;
  if (Date.parse(e || s) < now - 6 * 3600e3) continue;
  const title = tag(m[2], 'title'), sub = tag(m[2], 'sub-title'), desc = tag(m[2], 'desc'), cats = tags(m[2], 'category').join(' ');
  if (c === 'Canal+' && !SPORT.test(`${title} ${sub} ${cats} ${desc}`)) continue;   // Canal+ : seulement le sport
  const key = `${c}|${prio}|${s}|${title}`; if (seen.has(key)) continue; seen.add(key);
  list.push({c, s, e, t: title, d: [sub, desc].filter(Boolean).join(' — ').slice(0, 240), prio});
}
// Pour chaque chaîne, on ne garde que la meilleure source qui a répondu
const best = {}; list.forEach(p => { if (best[p.c] == null || p.prio < best[p.c]) best[p.c] = p.prio; });
const source = {}; Object.entries(best).forEach(([c, p]) => { source[c] = ['principale', 'SFR', 'epgshare01', 'site beIN'][p]; });
for (let i = list.length - 1; i >= 0; i--){ if (list[i].prio !== best[list[i].c]) list.splice(i, 1); else delete list[i].prio; }
// Si une chaîne n'a rien renvoyé pour un jour (site saturé, erreur passagère), on garde ce que l'on avait déjà pour ce jour-là
let prev = []; try{ prev = JSON.parse(fs.readFileSync(out, 'utf8')).programmes || []; }catch{}
const have = new Set(list.map(p => `${p.c}|${p.s.slice(0, 10)}`));
const kept = prev.filter(p => Date.parse(p.e || p.s) >= now - 6 * 3600e3 && !have.has(`${p.c}|${p.s.slice(0, 10)}`));
list.push(...kept);
list.sort((a, b) => a.s.localeCompare(b.s));

// État de la récupération (lu par Claude pour diagnostiquer, sans avoir besoin du journal GitHub)
const per = {}; list.forEach(p => { const x = per[p.c] || (per[p.c] = {n:0, jusqu:'', source:source[p.c] || 'passage précédent'}); x.n++; if (p.s > x.jusqu) x.jusqu = p.s.slice(0, 10); });
const vides = [...new Set(Object.values(NAMES))].filter(c => !per[c]);
let erreurs = [], zero = {};
if (logFile && fs.existsSync(logFile)){
  const lines = fs.readFileSync(logFile, 'utf8').split('\n');
  lines.forEach(l => { const m = l.match(/-\s*([A-Z0-9_]+)\s*-.*\((0) programs?\)/); if (m) zero[m[1]] = (zero[m[1]] || 0) + 1; });
  erreurs = [...new Set(lines.filter(l => /error|err!|fail|status code|timeout|ECONN|429|403|401/i.test(l)).map(l => l.trim().slice(0, 220)))].slice(-40);
}
const etat = {chaines:per, vides, joursVides:zero, reprisDeLaVeille:kept.length, erreurs};
fs.writeFileSync(out, JSON.stringify({updated: new Date().toISOString(), etat, programmes: list}));
console.log(`${list.length} programmes de sport écrits dans ${out} (dont ${kept.length} repris du passage précédent)`);
console.log(Object.entries(per).map(([c, x]) => `  ${c} : ${x.n} (jusqu'au ${x.jusqu})`).join('\n') || '  (aucune chaîne)');
if (vides.length) console.log(`Chaînes sans programme : ${vides.join(', ')}`);
if (erreurs.length) console.log(`Erreurs vues dans la récupération :\n  ${erreurs.slice(-10).join('\n  ')}`);
