// mon-ecran-version: c1edba56
/* QM27 (v103) — récompenses : équipe, joueur et manager du mois, prix de fin de saison par ligue, palmarès des joueurs,
   Hall of Fame à la retraite. Sans affichage : expose window.QMR et se branche sur QMC.semaine / avantSaison / apresSaison.
   Chargé après qm27-bureau.js. Rien ici ne tire au hasard dans le moteur des matchs (les noms des managers de l'ordinateur
   viennent de leur propre graine). Données : M.prix = {mois, saisons, hist, mgr, ndeb, hof, candidats}. */
(function(root){
'use strict';
const D = root.QMD, QMC = root.QMC;
const Q = () => root.QM;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const ORDRE = [['P', 3], ['B', 2], ['A', 1], ['G', 1]];   // une équipe-type = la composition d'un match
/* [code, nom, points au Hall of Fame] — l'Europe arrivera avec la Coupe d'Europe (v104) */
const PRIX = {
  em:['Équipe du mois', 0.2], jm:['Joueur du mois', 0.5], mm:['Manager du mois', 0],
  ea:['Équipe de l\'année', 2], ja:['Joueur de l\'année', 5], pa:['Meilleur à son poste', 3], bu:['Meilleur buteur', 2], je:['Meilleur jeune', 1], rv:['Révélation de l\'année', 1], ma:['Manager de l\'année', 0],
  ch:['Champion', 2], sx:['Vainqueur du Six Emblèmes', 2], ln:['Vainqueur de la Ligue des nations', 3],
};
const SEUIL_HOF = 30, MAX_HOF = 3;   // au plus 3 entrées par été, les meilleurs scores
const P = M => M.prix || (M.prix = {debut:M.saison, mois:null, saisons:[], hist:[], mgr:{}, ndeb:null, hof:[], candidats:null});
const sj = (j, k) => (j.saison && j.saison[k]) || 0;
const clubsDe = (M, l) => M.ligues[l].clubs.map(id => M.clubs[id]).filter(Boolean);
const joueursDe = (M, l) => clubsDe(M, l).flatMap(c => c.effectif).map(id => M.joueurs[id]).filter(Boolean);
const nomJ = j => `${j.p} ${j.n}`;
const nomPoste = (p, pl) => D.POSTES[p][pl ? 'pl' : 'nom'].toLowerCase();

/* ---------- managers de l'ordinateur : un nom stable par club ---------- */
function managerDe(M, clubId){
  if (M.manager && M.manager.club === clubId) return {nom:M.manager.nom || 'Toi', moi:true};
  const g = P(M).mgr; if (g[clubId]) return {nom:g[clubId]};
  const c = M.clubs[clubId], r = Q().hasard(Q().melange(M.graine, 'manager', clubId)), N = D.NOMS[c.nat] || D.NOMS.ENG;
  g[clubId] = `${r.choix(N.p)} ${r.choix(N.n)}`;
  return {nom:g[clubId]};
}
function donner(M, j, code, ligue, quand){ (j.prix || (j.prix = [])).push([M.saison, code, ligue || null, quand ?? null]); if (j.prix.length > 60) j.prix.splice(0, j.prix.length - 60); }
function donnerMgr(M, clubId, code, ligue, quand){ if (M.manager && M.manager.club === clubId) (M.manager.prix || (M.manager.prix = [])).push([M.saison, code, ligue, quand ?? null, clubId]); }

/* ---------- photo des compteurs (début d'un mois) ---------- */
function photo(M){
  const s = {}; for (const j of Object.values(M.joueurs)) if (j.club) s[j.id] = [sj(j, 'm'), sj(j, 'notes'), sj(j, 'b')];
  return s;
}
function nouveauMois(M, S){ P(M).mois = {saison:M.saison, debut:new Date(S.date).getUTCMonth(), mois:[], n:0, snap:photo(M), clubs:{}}; }
/* points attendus d'un match selon les réputations (le vif d'or rend les nuls rares) */
const attendu = (rep, repAdv, dom) => 3 / (1 + Math.exp(-((rep - repAdv) / 9 + (dom ? 0.2 : -0.2))));

/* équipe-type : meilleurs « score » par poste */
function equipeType(L, score){
  const pris = [];
  for (const [p, n] of ORDRE) pris.push(...L.filter(x => x.j.poste === p).sort((a, b) => score(b) - score(a)).slice(0, n));
  return pris;
}

/* ---------- chaque semaine : compter les points des clubs, fermer le mois ---------- */
function semaine(M, S){
  if (!S) return;
  const pr = P(M);
  if (!pr.ndeb || pr.ndeb.saison !== M.saison){ pr.ndeb = {saison:M.saison, n:{}}; for (const j of Object.values(M.joueurs)) if (j.club) pr.ndeb.n[j.id] = Q().note(j); }
  if (!pr.mois || pr.mois.saison !== M.saison){
    nouveauMois(M, S);   // la photo des compteurs se prend avant les matchs du mois (semaines de préparation)…
    if (S.type !== 'ligue') return;
    pr.mois.partiel = true;   // …sinon (partie commencée avant v103, en pleine saison) le premier mois n'est pas primé
  }
  if (S.type !== 'ligue') return;
  const mo = pr.mois, mois = new Date(S.date).getUTCMonth();
  if (!mo.mois.includes(mois)) mo.mois.push(mois);
  mo.n++;
  for (const m of S.matchs){ if (!M.ligues[m.ligue] || !m.res) continue;   // championnat seulement
    for (const [id, adv, dom, k] of [[m.dom, m.ext, true, 0], [m.ext, m.dom, false, 1]]){
      const c = mo.clubs[id] || (mo.clubs[id] = {pts:0, exp:0, j:0}), s1 = m.res.score[k], s2 = m.res.score[1 - k];
      c.j++; c.pts += s1 > s2 ? 3 : s1 === s2 ? 1 : 0; c.exp += attendu(M.clubs[id].rep, M.clubs[adv].rep, dom);
    } }
  const N = M.calendrier[M.semaine + 1];
  const finSaison = !M.calendrier.slice(M.semaine + 1).some(s => s.type === 'ligue'), finMois = finSaison || new Date(N.date).getUTCMonth() !== mois;   // v104 : la finale européenne se joue après la dernière journée
  if (finMois && (mo.n >= 2 || finSaison)){ if (!mo.partiel) primerMois(M); nouveauMois(M, N && N.type === 'ligue' ? N : S); }
  if (finSaison) primerSaison(M);
}
function primerMois(M){
  const pr = P(M), mo = pr.mois, quand = mo.mois.map(k => MOIS[k]).join('-'), moi = M.manager && M.manager.club;
  for (const L of Object.values(M.ligues)){
    const seuil = Math.max(1, Math.ceil(mo.n / 2));
    const C = joueursDe(M, L.id).map(j => { const s = mo.snap[j.id] || [0, 0, 0], m = sj(j, 'm') - s[0], n = sj(j, 'notes') - s[1], b = sj(j, 'b') - s[2]; return {j, m, moy:m ? n / m : 0, b}; }).filter(x => x.m >= seuil);
    if (!C.length) continue;
    const score = x => x.moy + x.m * 0.01 + x.b * 0.001;
    const eq = equipeType(C, score), top = eq.slice().sort((a, b) => score(b) - score(a))[0];
    const cl = Object.entries(mo.clubs).filter(([id]) => M.clubs[id] && M.clubs[id].ligue === L.id && mo.clubs[id].j);
    const best = cl.sort((a, b) => (b[1].pts - b[1].exp) - (a[1].pts - a[1].exp) || b[1].pts - a[1].pts)[0];
    const e = {saison:M.saison, quand, ligue:L.id, equipe:eq.map(x => [x.j.id, x.j.poste, Math.round(x.moy * 10) / 10, x.j.club, x.j.p, x.j.n]), joueur:top.j.id,
      manager:best ? {club:best[0], nom:managerDe(M, best[0]).nom, pts:best[1].pts, exp:Math.round(best[1].exp * 10) / 10, j:best[1].j} : null};
    pr.hist.push(e);
    for (const x of eq) donner(M, x.j, 'em', L.id, quand);
    donner(M, top.j, 'jm', L.id, quand);
    if (best) donnerMgr(M, best[0], 'mm', L.id, quand);
    if (moi && M.clubs[moi].ligue === L.id && Q().message){
      const miens = eq.filter(x => x.j.club === moi).map(x => nomJ(x.j));
      Q().message(M, `Prix du mois (${quand}) · ${L.court}`, `Joueur du mois : ${nomJ(top.j)} (${M.clubs[top.j.club].nom}, ${nb(top.moy)} de moyenne). Manager du mois : ${best ? (best[0] === moi ? 'toi' : e.manager.nom + ' (' + M.clubs[best[0]].nom + ')') + `, ${best[1].pts} points pris pour ${nb(best[1].exp)} attendus` : '—'}. ${miens.length ? `Dans l'équipe du mois : ${miens.join(', ')}.` : 'Aucun de tes joueurs dans l\'équipe du mois.'} Tout est dans Classements › Prix.`, 'prix');
    }
  }
  const garder = M.saison - 1; pr.hist = pr.hist.filter(h => h.saison >= garder);   // le détail des mois : saison en cours et précédente
}
const nb = x => (Math.round(x * 10) / 10).toLocaleString('fr-FR');

/* ---------- fin de saison ---------- */
function primerSaison(M){
  const pr = P(M), moi = M.manager && M.manager.club, rec = {saison:M.saison, ligues:{}};
  if (pr.saisons.some(s => s.saison === M.saison)) return;
  for (const L of Object.values(M.ligues)){
    const CL = Q().classement(M, L.id), champion = CL[0] && CL[0].id, maxJ = Math.max(...CL.map(x => x.j));
    const C = joueursDe(M, L.id).map(j => ({j, m:sj(j, 'm'), moy:sj(j, 'm') ? sj(j, 'notes') / sj(j, 'm') : 0, b:sj(j, 'b')})).filter(x => x.m >= Math.ceil(maxJ / 2));
    if (!C.length) continue;
    const score = x => x.moy + x.m * 0.02 + (x.j.club === champion ? 0.15 : 0);
    const eq = equipeType(C, score), tri = C.slice().sort((a, b) => score(b) - score(a));
    const r = {equipe:eq.map(x => [x.j.id, x.j.poste, Math.round(x.moy * 10) / 10, x.j.club, x.j.p, x.j.n]), joueur:fiche(tri[0]), postes:{}, champion};
    for (const [p] of ORDRE){ const t = tri.find(x => x.j.poste === p); if (t){ r.postes[p] = fiche(t); donner(M, t.j, 'pa', L.id, p); } }
    const bu = C.filter(x => x.j.poste === 'P').sort((a, b) => b.b - a.b || a.m - b.m)[0]; if (bu){ r.buteur = {...fiche(bu), b:bu.b}; donner(M, bu.j, 'bu', L.id); }
    const je = tri.find(x => x.j.age <= 21); if (je){ r.jeune = fiche(je); donner(M, je.j, 'je', L.id); }
    const nd = pr.ndeb && pr.ndeb.saison === M.saison ? pr.ndeb.n : {};
    const rv = C.filter(x => nd[x.j.id] != null).map(x => ({...x, g:Q().note(x.j) - nd[x.j.id]})).sort((a, b) => b.g - a.g)[0];
    if (rv && rv.g >= 2){ r.revelation = {...fiche(rv), g:rv.g}; donner(M, rv.j, 'rv', L.id); }
    for (const x of eq) donner(M, x.j, 'ea', L.id);
    donner(M, tri[0].j, 'ja', L.id);
    /* manager de l'année : le plus beau dépassement du rang attendu (réputation), titre en bonus */
    const parRep = CL.slice().sort((a, b) => M.clubs[b.id].rep - M.clubs[a.id].rep).map(x => x.id);
    const mg = CL.map((x, i) => ({id:x.id, gain:parRep.indexOf(x.id) - i + (i === 0 ? 3 : 0), pts:x.pts})).sort((a, b) => b.gain - a.gain || b.pts - a.pts)[0];
    r.manager = {club:mg.id, nom:managerDe(M, mg.id).nom, rang:CL.findIndex(x => x.id === mg.id) + 1, attendu:parRep.indexOf(mg.id) + 1};
    donnerMgr(M, mg.id, 'ma', L.id);
    /* titres de champion : joueurs du club qui ont joué */
    for (const id of M.clubs[champion].effectif){ const j = M.joueurs[id]; if (j && sj(j, 'm')) donner(M, j, 'ch', L.id); }
    rec.ligues[L.id] = r;
  }
  const sx = M.calendrier.some(s => s.tour) && Q().classement(M, 'sixn')[0]; if (sx){   // v106 : seulement pour une saison d'avant v106 (Six Emblèmes)
    rec.sixn = sx.id; for (const j of Object.values(M.joueurs)) if (j.nat === sx.id && j.selS && j.selS[0] === M.saison) donner(M, j, 'sx', 'sixn'); }
  pr.saisons.push(rec);
  if (moi && Q().message){
    const L = M.clubs[moi].ligue, r = rec.ligues[L]; if (r){
      const nm = f => f ? `${f.p} ${f.n} (${M.clubs[f.club] ? M.clubs[f.club].nom : '—'})` : '—';
      Q().message(M, `Prix de la saison · ${M.ligues[L].court}`, `Joueur de l'année : ${nm(r.joueur)}. Manager de l'année : ${r.manager.club === moi ? 'toi' : r.manager.nom + ' (' + M.clubs[r.manager.club].nom + ')'}, ${r.manager.rang}e pour un ${r.manager.attendu}e rang attendu. Meilleur buteur : ${r.buteur ? nm(r.buteur) + ', ' + r.buteur.b + ' buts' : '—'}. Meilleur jeune : ${nm(r.jeune)}.${r.revelation ? ` Révélation : ${nm(r.revelation)}.` : ''} L'équipe de l'année et les meilleurs à chaque poste sont dans Classements › Prix.`, 'prix');
    }
  }
}
const fiche = x => ({id:x.j.id, p:x.j.p, n:x.j.n, club:x.j.club, poste:x.j.poste, moy:Math.round(x.moy * 10) / 10, m:x.m});

/* ---------- Hall of Fame : un score d'héritage à la retraite ---------- */
function scoreHeritage(j, M){
  let s = 0; for (const x of j.prix || []) s += (PRIX[x[1]] || [, 0])[1];
  const k = j.carr && j.carr.s || [];
  s += k.reduce((t, x) => t + x[2], 0) / 60;            // longévité : 1 point pour 60 matchs de championnat
  s += (j.sel || 0) / 10;                               // sélections : 1 point pour 10
  /* joueurs déjà en carrière au début de la partie : les saisons d'avant sont inconnues, on les estime à 70 % du rythme observé */
  const debut = M && M.prix ? M.prix.debut : 2026;
  if (k.length && k[0][0] <= debut){ const avant = Math.max(0, j.age - k.length - 20); s += s / k.length * avant * 0.7; }
  return Math.round(s * 10) / 10;
}
function resumeCarriere(M, j){
  const k = j.carr && j.carr.s || [], clubs = [...new Set(k.map(x => x[1]).filter(Boolean))];
  const comp = {}; for (const x of j.prix || []) comp[x[1]] = (comp[x[1]] || 0) + 1;
  return {id:j.id, p:j.p, n:j.n, nat:j.nat, poste:j.poste, age:j.age, fin:M.saison, debut:k.length ? k[0][0] : M.saison, clubs, m:k.reduce((t, x) => t + x[2], 0), b:k.reduce((t, x) => t + x[3], 0),
    v:k.reduce((t, x) => t + x[5], 0), sel:j.sel || 0, prix:comp, score:scoreHeritage(j, M)};
}
/* avant les départs à la retraite (saisonSuivante) : on garde une copie des joueurs qui peuvent partir */
function avantDeparts(M){ const pr = P(M); pr.candidats = {}; for (const j of Object.values(M.joueurs)) if (j.club && j.age >= 31) pr.candidats[j.id] = resumeCarriere(M, j); }
function apresDeparts(M){
  const pr = P(M), c = pr.candidats || {}, entres = [];
  const partis = Object.entries(c).filter(([id, r]) => !M.joueurs[id] && r.score >= SEUIL_HOF && !pr.hof.some(h => h.id === id)).map(x => x[1]).sort((a, b) => b.score - a.score).slice(0, MAX_HOF);
  for (const r of partis){ pr.hof.push(r); entres.push(r); }
  pr.candidats = null;
  pr.hof.sort((a, b) => b.score - a.score); if (pr.hof.length > 80) pr.hof.length = 80;
  if (entres.length && M.manager && Q().message) Q().message(M, entres.length > 1 ? `${entres.length} légendes entrent au Hall of Fame` : 'Une légende entre au Hall of Fame',
    entres.map(r => `${r.p} ${r.n} (${nomPoste(r.poste)}, ${r.m} matchs, score ${nb(r.score)})`).join(' · ') + '. Classements › Prix › Hall of Fame.', 'prix');
}

/* ---------- branchements ---------- */
const base = {semaine:QMC.semaine, avantSaison:QMC.avantSaison, apresSaison:QMC.apresSaison};
Object.assign(QMC, {
  semaine(M, S){ base.semaine(M, S); semaine(M, S); },
  avantSaison(M, r){ base.avantSaison(M, r); avantDeparts(M); },
  apresSaison(M, r){ base.apresSaison(M, r); apresDeparts(M); },
});
/* palmarès lisible d'un joueur ou du manager : [{saison, code, nom, ligue, quand, n}] regroupés par prix */
function palmares(L){
  const g = {}; for (const x of L || []){ const k = x[1] + (x[1] === 'pa' ? x[3] : ''); (g[k] = g[k] || {code:x[1], nom:x[1] === 'pa' ? `Meilleur ${nomPoste(x[3])}` : (PRIX[x[1]] || [x[1]])[0], fois:[]}).fois.push(x); }
  const ordre = ['ld', 'bo', 'ch', 'ln', 'sx', 'ja', 'ee', 'pa', 'me', 'ma', 'ea', 'bu', 'je', 'rv', 'jm', 'mm', 'em'];
  return Object.values(g).sort((a, b) => ordre.indexOf(a.code) - ordre.indexOf(b.code));
}
/* « 2026-27 » pour un prix de saison, « novembre 2026 » pour un prix du mois (janvier à août : année suivante) */
const quandTxt = x => { if (x[1] === 'pa' || !x[3]) return `${x[0]}-${String(x[0] + 1).slice(2)}`; const k = MOIS.indexOf(String(x[3]).split('-').pop()); return `${x[3]} ${k >= 0 && k < 8 ? x[0] + 1 : x[0]}`; };
/* HTML commun : palmarès en pastilles (fiche joueur, profil du manager, Hall of Fame) */
function palmaresHTML(L, esc){ const G = palmares(L); return G.length ? `<div class="palm">${G.map(g => `<span class="palm-i ${g.code}"><b>${esc(g.nom)}${g.fois.length > 1 ? ' ×' + g.fois.length : ''}</b><small>${g.fois.slice(-6).map(quandTxt).map(esc).join(' · ')}${g.fois.length > 6 ? ' …' : ''}</small></span>`).join('')}</div>` : ''; }
root.QMR = {donner, quandTxt, palmaresHTML, PRIX, MOIS, SEUIL_HOF, MAX_HOF, managerDe, palmares, scoreHeritage, resumeCarriere, primerMois, primerSaison, attendu, nomPoste};
})(typeof window !== 'undefined' ? window : globalThis);
