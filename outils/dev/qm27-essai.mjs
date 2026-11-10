// mon-ecran-version: 395a1337
// QM27 : vérifie l'équilibrage du moteur. Usage : node outils/dev/qm27-essai.mjs [nb de matchs] [nb de saisons]
// Joue des matchs et des saisons complètes sans affichage, puis compare les moyennes aux cibles du GDD
// (buts par équipe, durée, part des matchs décidés par le vif d'or, blessures, avantage du terrain).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {console, Date, Math, JSON};
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['qm27-donnees.js', 'qm27.js']) vm.runInContext(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'), ctx, {filename:f});
const QM = ctx.QM, D = ctx.QMD;

const nbMatchs = +(process.argv[2] || 1000), nbSaisons = +(process.argv[3] || 2);
const t0 = Date.now();
const M = QM.nouveauMonde(20261110);
const R = [];
let s = 0;
while (R.length < nbMatchs){
  const S = M.calendrier[s % M.calendrier.length]; s++;
  for (const m of S.matchs){ if (R.length >= nbMatchs) break; R.push(QM.simulerMatch(M, m)); }
}
const moy = L => L.reduce((a, b) => a + b, 0) / (L.length || 1);
const med = L => { const t = L.slice().sort((a, b) => a - b); return t[Math.floor(t.length / 2)]; };
const buts = R.flatMap(X => X.stats.map(x => x.buts));
const duree = R.map(X => X.t / 60);
let decisif = 0, perdant = 0, nul = 0, dom = 0, ext = 0, bless = 0, ecart = [];
for (const X of R){
  const k = X.vif, avant = X.score[k] - D.EQ.points.vif, autre = X.score[1 - k];
  if (avant <= autre && X.score[k] > autre) decisif++;
  if (X.score[k] < autre) perdant++;
  if (X.score[0] === X.score[1]) nul++;
  if (X.score[0] > X.score[1]) dom++; else if (X.score[1] > X.score[0]) ext++;
  bless += X.bless.length;
  ecart.push(Math.abs(X.stats[0].buts - X.stats[1].buts));
}
const pc = n => (100 * n / R.length).toFixed(1) + ' %';
const ok = (v, a, b) => (v >= a && v <= b ? 'OK ' : '!! ') ;
const b = moy(buts), d = moy(duree), dc = decisif / R.length;
console.log(`QM27 — ${R.length} matchs (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(`${ok(b, 18, 26)}buts par équipe      : ${b.toFixed(1)} (cible 18 à 26)  min ${Math.min(...buts)}  max ${Math.max(...buts)}`);
console.log(`${ok(d, 60, 90)}durée moyenne        : ${d.toFixed(0)} min (cible 60 à 90)  médiane ${med(duree).toFixed(0)}  max ${Math.max(...duree).toFixed(0)}  > 150 min : ${pc(duree.filter(x => x > 150).length)}`);
console.log(`${ok(dc, 0.35, 0.6)}vif d'or décisif     : ${pc(decisif)} (cible environ un match sur deux)`);
console.log(`   attrapeur perdant  : ${pc(perdant)} (le 220-180)`);
console.log(`   écart moyen de buts: ${moy(ecart).toFixed(1)}  nuls : ${pc(nul)}`);
console.log(`   victoires domicile : ${pc(dom)}  extérieur : ${pc(ext)}`);
console.log(`   blessures par match: ${(bless / R.length).toFixed(2)}`);

/* saisons complètes, sans manager */
for (let i = 0; i < nbSaisons; i++){
  const W = QM.nouveauMonde(1000 + i), t1 = Date.now();
  while (QM.semaine(W) && QM.semaine(W).type !== 'bilan') QM.terminerSemaine(W, null);
  const lab = `${W.saison}-${String(W.saison + 1).slice(2)}`;
  console.log(`\nSaison ${lab} simulée en ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  for (const L of Object.values(W.ligues)){
    const C = QM.classement(W, L.id);
    const f = r => `${W.clubs[r.id].nom} (rép. ${W.clubs[r.id].rep}) ${r.pts} pts`;
    console.log(`  ${L.court.padEnd(10)} 1. ${f(C[0])} · 2. ${f(C[1])} · 16. ${f(C[C.length - 1])}`);
  }
  const SN = QM.classement(W, 'sixn');
  console.log(`  Six Nations : ${SN.map(r => `${D.NATIONS[r.id].nom} ${r.pts}`).join(', ')}`);
  QM.saisonSuivante(W);
  const json = QM.serialiser(W);
  console.log(`  saison suivante : ${W.saison}-${String(W.saison + 1).slice(2)}, ${Object.keys(W.joueurs).length} joueurs, sauvegarde ${(json.length / 1024).toFixed(0)} Ko`);
}
