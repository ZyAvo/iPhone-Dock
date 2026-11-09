// mon-ecran-version: b886516c
// Ambreval : joueur simulé qui vérifie le rythme de la partie. Usage : node outils/dev/ambreval-essai.mjs [nb de parties]
// Il joue « tranquille » : une décision toutes les 20 s de jeu, sans cueillir de bulles ni lancer de sorts ; temps donnés en temps de jeu.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../../ambreval.js', import.meta.url), 'utf8');
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(code, ctx);
const J = ctx.Jeu, { W, BAT, RECH, PAL } = J;
const hms = s => s < 3600 ? `${Math.round(s / 60)} min` : s < 172800 ? `${(s / 3600).toFixed(1)} h` : `${(s / 86400).toFixed(1)} j`;

function meilleurePlace(S, k){
  const s = BAT[k].s || 1; let best = null;
  for (let y = 0; y < W - s + 1; y++) for (let x = 0; x < W - s + 1; x++){ const p = J.placement(S, k, x, y); if (p.ok){
    const d = Math.abs(x - J.CX) + Math.abs(y - J.CY), v = (p.bonus || 1) * 10 - d * .05; if (!best || v > best.v) best = {x, y, v}; } }
  return best;
}
function construit(S, k){ if (!J.disponible(S, k) || !J.peutPayer(S, J.cout(S, k, 1))) return false; const p = meilleurePlace(S, k); return p ? J.batir(S, k, p.x, p.y) : false; }
function ameliore(S, k){ const L = S.bats.filter(b => b.k === k && b.con <= 0 && b.n > 0 && b.n < J.maxNiveau(S, k)).sort((a, b) => a.n - b.n); if (!L.length || !J.peutPayer(S, J.cout(S, k, L[0].n + 1))) return false; return J.ameliorer(S, L[0]); }
const nb = (S, k) => J.compteK(S, k);

function decide(S){
  const D = J.dd(S), P = PAL[S.palier];
  if (P && J.peutMonter(S)) { J.monterPalier(S); return; }
  for (const q of [...S.quetes]) if (J.queteFaite(S, q)) J.encaisserQuete(S, q);
  // fleche
  if (S.palier >= 5){ const f = S.bats.find(b => b.k === 'fleche'); if (!f){ const p = meilleurePlace(S, 'fleche'); if (p) S.bats.push({i:S.next++, k:'fleche', x:p.x, y:p.y, n:1, con:0, tot:1}), J.inv(S); }
    else if (f.con <= 0 && f.n < 5 && J.peutPayer(S, J.cout(S, 'fleche', f.n + 1))) { J.ameliorer(S, f); } }
  // recherche : la moins chère
  if (!S.cour){ const L = Object.keys(RECH).filter(k => J.rechOk(S, k) && S.r.savoir >= RECH[k].c).sort((a, b) => RECH[a].c - RECH[b].c); if (L[0]) J.chercher(S, L[0]); }
  // logement si la main-d'œuvre manque ou la population plafonne
  const veutLoge = S.pop >= D.loge - 1 || D.jobs > S.pop * .95;
  const faimProche = S.r.vivres < J.capDe(S, 'vivres') * .15;
  const order = [];
  if (faimProche) order.push(['ferme'], ['peche']);
  if (veutLoge) order.push(['chaumiere']);
  const objectifs = {1:[['ferme', 2], ['bucheron', 2], ['carriere', 2], ['entrepot', 1]], 2:[['marche', 1], ['scierie', 2], ['biblio', 2], ['brasserie', 1], ['taverne', 1], ['peche', 2], ['entrepot', 3], ['ferme', 3], ['carriere', 3], ['bucheron', 3]],
    3:[['mine', 2], ['forge', 2], ['tour', 2], ['temple', 1], ['moulin', 1], ['jardin', 2], ['entrepot', 5], ['scierie', 4], ['biblio', 3], ['ferme', 5], ['carriere', 5]],
    4:[['academie', 1], ['guilde', 1], ['minear', 2], ['bosquet', 1], ['griffon', 1], ['forge', 4], ['mine', 4], ['tour', 4], ['temple', 2], ['entrepot', 7], ['scierie', 6], ['carriere', 7]],
    5:[['brasserie', 3], ['observatoire', 2], ['academie', 2], ['minear', 4], ['forge', 6], ['mine', 6], ['entrepot', 9]]};
  for (let t = 1; t <= S.palier; t++) for (const [k, n] of objectifs[t]) if (nb(S, k) < n) { order.push([k]); }
  for (const [k] of order){ if (construit(S, k)) return; }
  for (const k of ['entrepot', 'brasserie', 'chaumiere', 'ferme', 'carriere', 'bucheron', 'scierie', 'peche', 'biblio', 'mine', 'forge', 'tour', 'entrepot', 'marche', 'academie', 'minear', 'observatoire', 'guilde', 'taverne', 'temple']) if (ameliore(S, k)) return;
  // commerce simple : vend le surplus
  if (J.carLibres(S) > 0 && S.bats.some(b => b.k === 'marche' && b.n > 0)){
    for (const k in S.rois) if (J.royOuvert(S, k)) for (const r in S.rois[k].s){ if (r !== 'or' && S.r[r] > J.capDe(S, r) * .85){ J.caravane(S, k, r, Math.min(J.carMax(S), S.r[r] * .4), 'v'); return; } }
  }
}
const N = +(process.argv[2] || 5), res = [];
for (let n = 0; n < N; n++){
  const S = J.nouvelle(1000 + n * 77), t0 = {}; let t = 0; const FIN = 86400 * +(process.env.JOURS || 4);
  let noter = -1;
  while (t < FIN && !J.peutRenaitre(S)){
    J.avancer(S, 5); t += 5;
    if (t % 20 === 0) decide(S);
    if (!t0[S.palier]) t0[S.palier] = t;
    if (t0[5] && J.dd(S).fleche !== noter){ noter = J.dd(S).fleche; t0['f' + noter] = t; }
    for (const m of [...S.msg]) J.repondre(S, m, 0) || (S.msg = S.msg.filter(x => x !== m));
  }
  res.push({t0, pop:Math.floor(S.pop), joie:Math.round(S.joie), b:S.bats.length, rech:Object.keys(S.fait).length, r:Object.fromEntries(Object.entries(S.r).map(([a, b]) => [a, Math.round(b)])), lg:JSON.stringify(S).length});
  const f = t0; console.log(`#${n}`, [2, 3, 4, 5].map(p => `${PAL[p - 1].n}: ${f[p] ? hms(f[p]) : '—'}`).join(' | '), `| Flèche finie : ${f.f5 ? hms(f.f5) : '—'}`, `| étape ${J.dd(S).fleche}, or ${Math.round(S.r.or)}/${Math.round(J.capDe(S,'or'))}, cristal ${Math.round(S.r.cristal)}, outils ${Math.round(S.r.outils)}, pl ${Math.round(S.r.planches)}, ${Math.round(J.dd(S).travail*100)} % travail`, `| pop ${Math.floor(S.pop)}, joie ${Math.round(S.joie)}, ${S.bats.length} bât., ${Object.keys(S.fait).length} rech., ${JSON.stringify(S).length} o`);
}
