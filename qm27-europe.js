// mon-ecran-version: 9d5d9458
/* QM27 (v104) — la Ligue des Anneaux, coupe d'Europe des clubs, et les prix européens.
   16 clubs : 5 par championnat, 6 pour celui du tenant du titre (ses 6 premiers s'il en fait partie, sinon ses 5 premiers et lui).
   4 groupes de 4 en aller-retour (mercredis des journées 3 à 13), quarts et demies en aller-retour (journées 16-18 et 27-28),
   finale sur un match en terrain neutre, une semaine après la dernière journée. Les matchs (ligue 'eu') sont rangés dans les
   semaines du calendrier, avec le championnat ; leur date affichée est le mercredi d'avant.
   Rien ici ne suppose 3 championnats ni 5 places : PLACES et le nombre de groupes se calculent.
   Sans affichage : window.QME. Chargé après qm27-prix.js. Données : M.europe (saison en cours) et M.europeHist (palmarès). */
(function(root){
'use strict';
const D = root.QMD, QMC = root.QMC;
const Q = () => root.QM, R = () => root.QMR;
const NOM = 'Ligue des Anneaux', COURT = 'Anneaux', TAILLE = 16, GROUPES = 'ABCD';
const J_GROUPES = [3, 5, 7, 9, 11, 13], J_QUARTS = [16, 18], J_DEMIS = [27, 28];
const PRIMES = {participation:120000, victoire:20000, nul:6000, quarts:60000, demis:100000, finale:150000, titre:250000};
const TOURS = {g:'Phase de groupes', qf:'Quarts de finale', sf:'Demi-finales', f:'Finale'};
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const rng = (M, ...k) => Q().hasard(Q().melange(M.graine, 'anneaux', ...k));
const semaineDe = (M, j) => M.calendrier.findIndex(s => s.type === 'ligue' && s.journee === j);
const ligneVide = id => ({id, j:0, g:0, n:0, p:0, pm:0, pe:0, vifs:0, pts:0});
const trierTable = T => Object.values(T).sort((a, b) => b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || b.vifs - a.vifs || String(a.id).localeCompare(b.id));
const msg = (M, t, c) => { if (M.manager && Q().message) Q().message(M, t, c, 'europe'); };
const nomC = (M, id) => (M.clubs[id] || {}).nom || id;
const moi = M => M.manager && M.manager.club;
const ou = (m, id) => m.dom === id || m.ext === id;

/* ---------- qualification ---------- */
function qualifies(M){
  const L = Object.values(M.ligues), h = M.europeHist || [], tenant = h.length && h[h.length - 1].saison === M.saison - 1 ? h[h.length - 1].v : null;
  const rangs = M.europeRangs && M.europeRangs.saison === M.saison - 1 ? M.europeRangs.ligues : null;
  const ordre = l => rangs && rangs[l.id] ? rangs[l.id].filter(id => M.clubs[id] && M.clubs[id].ligue === l.id) : l.clubs.slice().sort((a, b) => M.clubs[b].rep - M.clubs[a].rep);
  const base = Math.floor(TAILLE / L.length), Q_ = [];
  for (const l of L){ const o = ordre(l); Q_.push(...o.slice(0, base)); }
  let reste = TAILLE - Q_.length;
  if (tenant && M.clubs[tenant] && reste > 0){   // la ligue du tenant a une place de plus : son 6e, ou le tenant s'il n'est pas dans les 5
    const o = ordre(M.ligues[M.clubs[tenant].ligue]); Q_.push(Q_.includes(tenant) ? o[base] : tenant); reste--;
  }
  if (reste > 0){   // sans tenant (première saison) : les meilleures réputations parmi les suivants
    const suiv = L.flatMap(l => ordre(l).slice(base)).filter(id => !Q_.includes(id)).sort((a, b) => M.clubs[b].rep - M.clubs[a].rep);
    Q_.push(...suiv.slice(0, reste));
  }
  return Q_.filter(Boolean).slice(0, TAILLE);
}
/* tirage : 4 chapeaux par réputation, au plus 2 clubs d'un même championnat par groupe */
function tirage(M, ids){
  const r = rng(M, M.saison, 'tirage'), nG = Math.max(1, Math.floor(ids.length / 4)), G = GROUPES.slice(0, nG).split('');
  const tri = ids.slice().sort((a, b) => M.clubs[b].rep - M.clubs[a].rep);
  for (let essai = 0; essai < 300; essai++){
    const g = Object.fromEntries(G.map(k => [k, []])); let ok = true;
    for (let p = 0; p < 4 && ok; p++){
      const pot = tri.slice(p * nG, p * nG + nG); for (let i = pot.length - 1; i > 0; i--){ const k = Math.floor(r() * (i + 1)); [pot[i], pot[k]] = [pot[k], pot[i]]; }
      G.forEach((k, i) => { const id = pot[i]; if (!id) return; if (g[k].filter(x => M.clubs[x].ligue === M.clubs[id].ligue).length >= 2) ok = false; g[k].push(id); });
    }
    if (ok || essai === 299) return g;
  }
}
const ROUNDS = [[[0, 1], [2, 3]], [[2, 0], [1, 3]], [[0, 3], [1, 2]]];   // aller ; le retour inverse les domiciles
function creer(M){
  const ids = qualifies(M), G = tirage(M, ids), cal = M.calendrier;
  M.europe = {saison:M.saison, qual:ids, groupes:G, tables:{}, tours:{}, sortie:{}, vainqueur:null, finaliste:null};
  for (const [k, L] of Object.entries(G)){
    M.europe.tables[k] = Object.fromEntries(L.map(id => [id, ligneVide(id)]));
    const tours = [...ROUNDS, ...ROUNDS.map(r => r.map(([a, b]) => [b, a]))];
    tours.forEach((paires, t) => { const si = semaineDe(M, J_GROUPES[t]); if (si < 0) return; const S = cal[si];
      for (const [a, b] of paires){ if (!L[a] || !L[b]) continue; S.matchs.push(match(M, S, 'g' + (t + 1), L[a], L[b], {groupe:k})); } });
  }
  /* la finale : une semaine à part, après la dernière journée */
  const bi = cal.findIndex(s => s.type === 'bilan');
  if (bi > 0 && !cal.some(s => s.type === 'europe')){ const d = cal[bi - 1].date + 7 * 864e5; cal.splice(bi, 0, {date:d, type:'europe', matchs:[]}); }
  /* primes de participation */
  for (const id of ids) QMC.compter(M.clubs[id], 'rec', 'europe', PRIMES.participation);
  const u = moi(M);
  if (u && ids.includes(u)){ const g = Object.entries(G).find(([, L]) => L.includes(u));
    msg(M, `${NOM} : tu es qualifié`, `Groupe ${g[0]} avec ${g[1].filter(x => x !== u).map(x => nomC(M, x)).join(', ')}. Matchs le mercredi, entre deux journées de championnat : pense à faire tourner l'effectif. Prime de participation : ${QMC.euros(PRIMES.participation)}.`); }
  else if (u) msg(M, `${NOM} ${lab(M.saison)}`, `Le tirage est fait : ${Object.entries(G).map(([k, L]) => `groupe ${k} : ${L.map(x => nomC(M, x)).join(', ')}`).join(' · ')}. Ton club n'est pas qualifié cette saison.`);
}
function match(M, S, tour, dom, ext, extra){
  return {id:`${M.saison}-eu-${tour}-${dom}`, ligue:'eu', tour, dom, ext, res:null, date:S.date - 3 * 864e5, ...(extra || {})};
}
/* une partie sans Ligue des Anneaux pour la saison en cours : on la crée tant que les poules n'ont pas commencé */
function assurer(M){
  if (!M || !M.calendrier || !M.calendrier.length) return null;
  if (M.europe && M.europe.saison === M.saison) return M.europe;
  const si = semaineDe(M, J_GROUPES[0]);
  if (si >= 0 && si >= M.semaine && !M.calendrier.some(s => s.matchs && s.matchs.some(m => m.ligue === 'eu'))){ creer(M); return M.europe; }
  return null;
}

/* ---------- résultats ---------- */
function resultat(M, m){
  const E = M.europe; if (!E || !m.res) return;
  const [s1, s2] = m.res.score;
  if (m.groupe){
    const T = E.tables[m.groupe], a = T[m.dom], b = T[m.ext]; if (!a || !b) return;
    for (const [x, p, c, k] of [[a, s1, s2, 0], [b, s2, s1, 1]]){ x.j++; x.pm += p; x.pe += c; if (m.res.vif === k) x.vifs++;
      const r = p > c ? 'g' : p < c ? 'p' : 'n'; x[r]++; x.pts += r === 'g' ? 3 : r === 'n' ? 1 : 0;
      QMC.compter(M.clubs[x.id], 'rec', 'europe', r === 'g' ? PRIMES.victoire : r === 'n' ? PRIMES.nul : 0); }
  }
  /* billetterie des matchs européens à domicile (la finale est en terrain neutre) */
  const c = M.clubs[m.dom];
  if (c && !m.neutre && QMC.remplissage){ const aff = Math.round(c.stade * Math.min(1, QMC.remplissage(M, c, M.clubs[m.ext]) * 1.1)); QMC.compter(c, 'rec', 'europe', aff * (c.prix || 8) * 0.9); if (moi(M) === c.id) m.res.affluence = aff; }
}
const buts = (m, k) => (m.res.score[k] - (m.res.vif === k ? 150 : 0)) / 10;
/* qualifié d'une double confrontation : points cumulés, puis buts, puis vifs, puis réputation */
function qualifie(M, a, b, L){
  const tot = id => L.reduce((t, m) => t + (m.dom === id ? m.res.score[0] : m.ext === id ? m.res.score[1] : 0), 0);
  const bt = id => L.reduce((t, m) => t + (m.dom === id ? buts(m, 0) : m.ext === id ? buts(m, 1) : 0), 0);
  const vf = id => L.filter(m => (m.dom === id && m.res.vif === 0) || (m.ext === id && m.res.vif === 1)).length;
  const k = [tot, bt, vf, id => M.clubs[id].rep].map(f => f(a) - f(b)).find(x => x !== 0) || 0;
  return k >= 0 ? a : b;
}
const matchsEu = (M, tour) => M.calendrier.flatMap(s => (s.matchs || []).filter(m => m.ligue === 'eu' && m.tour === tour));

/* ---------- après chaque semaine ---------- */
function semaine(M, S){
  assurer(M);
  if (!M.europe && !M.europeAnnonce && M.manager){ M.europeAnnonce = 1;   // partie commencée avant v104, en pleine saison
    msg(M, `Nouveau : la ${NOM}`, `La coupe d'Europe des clubs commence la saison prochaine : 16 clubs (les 5 premiers de chaque championnat, 6 pour celui du tenant du titre), des groupes le mercredi, puis quarts, demies et une finale sur terrain neutre. Finis dans les 5 premiers pour en être.`); }
  const E = M.europe; if (!E || E.saison !== M.saison || !S || !S.matchs) return;
  const L = S.matchs.filter(m => m.ligue === 'eu' && m.res); if (!L.length) return;
  const u = moi(M), cal = M.calendrier;
  if (L.some(m => m.tour === 'g6')){
    const cl = Object.fromEntries(Object.entries(E.tables).map(([k, T]) => [k, trierTable(T).map(x => x.id)]));
    for (const [k, o] of Object.entries(cl)) o.slice(2).forEach(id => { E.sortie[id] = 'g'; });
    const G = Object.keys(cl), paires = [];
    for (let i = 0; i < G.length; i += 2){ const A = cl[G[i]], B = cl[G[i + 1]] || cl[G[0]]; paires.push([A[0], B[1]], [B[0], A[1]]); }
    E.tours.qf = paires;
    const [s1, s2] = J_QUARTS.map(j => cal[semaineDe(M, j)]);
    paires.forEach(([w, r]) => { s1.matchs.push(match(M, s1, 'qf1', r, w)); s2.matchs.push(match(M, s2, 'qf2', w, r)); });
    E.qualifsQf = paires.flat(); for (const id of E.qualifsQf) QMC.compter(M.clubs[id], 'rec', 'europe', PRIMES.quarts);
    if (u && Object.values(E.groupes).some(g => g.includes(u))){
      const p = paires.find(x => x.includes(u));
      msg(M, p ? `${NOM} : en quarts de finale !` : `${NOM} : éliminé en poule`, p ? `Adversaire : ${nomC(M, p[0] === u ? p[1] : p[0])}, en janvier (aller-retour). Prime : ${QMC.euros(PRIMES.quarts)}.` : `Ton club termine ${cl[Object.keys(cl).find(k => cl[k].includes(u))].indexOf(u) + 1}e de son groupe. Les quarts : ${paires.map(([a, b]) => nomC(M, a) + ' – ' + nomC(M, b)).join(' · ')}.`);
    }
  }
  if (L.some(m => m.tour === 'qf2')){
    const tous = [...matchsEu(M, 'qf1'), ...matchsEu(M, 'qf2')];
    const W = E.tours.qf.map(([a, b]) => { const w = qualifie(M, a, b, tous.filter(m => ou(m, a) && ou(m, b))); E.sortie[w === a ? b : a] = 'qf'; return w; });
    const paires = []; for (let i = 0; i < W.length; i += 2) paires.push([W[i], W[i + 1]]);
    E.tours.sf = paires;
    const [s1, s2] = J_DEMIS.map(j => cal[semaineDe(M, j)]);
    paires.forEach(([a, b]) => { s1.matchs.push(match(M, s1, 'sf1', b, a)); s2.matchs.push(match(M, s2, 'sf2', a, b)); });
    for (const id of W) QMC.compter(M.clubs[id], 'rec', 'europe', PRIMES.demis);
    if (u && E.qualifsQf.includes(u)) msg(M, W.includes(u) ? `${NOM} : en demi-finale !` : `${NOM} : éliminé en quarts`, `Demi-finales (fin mars, début avril) : ${paires.map(([a, b]) => nomC(M, a) + ' – ' + nomC(M, b)).join(' · ')}.${W.includes(u) ? ` Prime : ${QMC.euros(PRIMES.demis)}.` : ''}`);
  }
  if (L.some(m => m.tour === 'sf2')){
    const tous = [...matchsEu(M, 'sf1'), ...matchsEu(M, 'sf2')];
    const W = E.tours.sf.map(([a, b]) => { const w = qualifie(M, a, b, tous.filter(m => ou(m, a) && ou(m, b))); E.sortie[w === a ? b : a] = 'sf'; return w; });
    E.tours.f = W;
    const sf = cal.find(s => s.type === 'europe'); if (sf && W.length === 2) sf.matchs.push({...match(M, sf, 'f', W[0], W[1], {neutre:true}), date:sf.date});
    for (const id of W) QMC.compter(M.clubs[id], 'rec', 'europe', PRIMES.finale);
    if (u && E.tours.sf.flat().includes(u)) msg(M, W.includes(u) ? `${NOM} : en finale !` : `${NOM} : éliminé en demi-finale`, `Finale sur un seul match, en terrain neutre, une semaine après la dernière journée : ${nomC(M, W[0])} – ${nomC(M, W[1])}.${W.includes(u) ? ` Prime : ${QMC.euros(PRIMES.finale)}.` : ''}`);
  }
  const f = L.find(m => m.tour === 'f');
  if (f){
    const k = f.res.score[0] > f.res.score[1] ? 0 : f.res.score[1] > f.res.score[0] ? 1 : (f.res.vif === 0 ? 0 : 1);
    const v = k ? f.ext : f.dom, perd = k ? f.dom : f.ext;
    E.vainqueur = v; E.finaliste = perd; E.sortie[v] = 'v'; E.sortie[perd] = 'f';
    QMC.compter(M.clubs[v], 'rec', 'europe', PRIMES.titre);
    (M.europeHist || (M.europeHist = [])).push({saison:M.saison, v, f:perd, score:f.res.score.slice()});
    if (M.europeHist.length > 40) M.europeHist.shift();
    primerEurope(M);
    msg(M, `${NOM} : ${nomC(M, v)} sacré`, `${nomC(M, f.dom)} ${f.res.score[0]}–${f.res.score[1]} ${nomC(M, f.ext)}${v === u ? ' : tu remportes la ' + NOM + ' ! Prime : ' + QMC.euros(PRIMES.titre) + '.' : '.'} Les prix européens (Balai d'or, manager et équipe européenne de l'année) sont dans Classements › Prix.`);
  }
}

/* ---------- prix européens (après la finale) ---------- */
function primerEurope(M){
  const Rr = R(); if (!Rr) return;
  const E = M.europe, pr = M.prix || {saisons:[]}, rec = (pr.saisons || []).find(s => s.saison === M.saison); if (!rec) return;
  const ligues = Object.values(M.ligues), repL = Object.fromEntries(ligues.map(l => [l.id, l.clubs.reduce((t, id) => t + M.clubs[id].rep, 0) / l.clubs.length]));
  const repTous = ligues.reduce((t, l) => t + repL[l.id], 0) / ligues.length, sx = rec.sixn;
  const bonusEu = id => ({v:0.5, f:0.35, sf:0.2, qf:0.1, g:0.04})[E.sortie[id]] || 0;   // le Balai d'or récompense aussi la scène européenne
  const C = ligues.flatMap(l => {
    const maxJ = Math.max(...Q().classement(M, l.id).map(x => x.j));
    return l.clubs.flatMap(id => M.clubs[id].effectif).map(id => M.joueurs[id]).filter(j => j && (j.saison.m || 0) >= Math.ceil(maxJ / 2)).map(j => {
      const s = j.saison, moy = s.notes / s.m, em = s.em || 0, euMoy = em ? s.en / em : 0;
      const sc = moy + s.m * 0.02 + (repL[l.id] - repTous) / 15 + bonusEu(j.club) + (em ? (euMoy - moy) * 0.2 + em * 0.01 : 0) + (sx && j.nat === sx && j.selS && j.selS[0] === M.saison ? 0.1 : 0);
      return {j, m:s.m, moy, sc};
    }); });
  if (!C.length) return;
  const ordre = [['P', 3], ['B', 2], ['A', 1], ['G', 1]], eq = [];
  for (const [p, n] of ordre) eq.push(...C.filter(x => x.j.poste === p).sort((a, b) => b.sc - a.sc).slice(0, n));
  const top = C.slice().sort((a, b) => b.sc - a.sc)[0];
  const fiche = x => ({id:x.j.id, p:x.j.p, n:x.j.n, club:x.j.club, poste:x.j.poste, moy:Math.round(x.moy * 10) / 10, m:x.m});
  /* manager européen : rang dépassé dans son championnat + parcours européen */
  const parcours = {v:10, f:7, sf:4, qf:2, g:1};
  const mg = Object.values(M.clubs).map(c => { const CL = Q().classement(M, c.ligue), parRep = CL.slice().sort((a, b) => M.clubs[b.id].rep - M.clubs[a.id].rep).map(x => x.id), i = CL.findIndex(x => x.id === c.id);
    return {id:c.id, s:parRep.indexOf(c.id) - i + (i === 0 ? 3 : 0) + (parcours[E.sortie[c.id]] || 0)}; }).sort((a, b) => b.s - a.s)[0];
  rec.europe = {vainqueur:E.vainqueur, finaliste:E.finaliste, balai:fiche(top), equipe:eq.map(x => [x.j.id, x.j.poste, Math.round(x.moy * 10) / 10, x.j.club, x.j.p, x.j.n]),
    manager:{club:mg.id, nom:Rr.managerDe(M, mg.id).nom, parcours:E.sortie[mg.id] || null}};
  const donner = (j, code, q) => { (j.prix || (j.prix = [])).push([M.saison, code, 'eu', q ?? null]); };
  donner(top.j, 'bo'); for (const x of eq) donner(x.j, 'ee');
  for (const id of M.clubs[E.vainqueur].effectif){ const j = M.joueurs[id]; if (j && j.saison && j.saison.em) donner(j, 'ld'); }
  if (moi(M) === mg.id) (M.manager.prix || (M.manager.prix = [])).push([M.saison, 'me', 'eu', null, mg.id]);
  if (moi(M) === E.vainqueur) (M.manager.prix || (M.manager.prix = [])).push([M.saison, 'ld', 'eu', null, E.vainqueur]);
}

/* ---------- fin de saison : classements gardés pour qualifier la saison suivante ---------- */
function garderRangs(M){ M.europeRangs = {saison:M.saison, ligues:Object.fromEntries(Object.values(M.ligues).map(l => [l.id, Q().classement(M, l.id).map(x => x.id)]))}; }

/* ---------- branchements ---------- */
if (R()){ Object.assign(R().PRIX, {bo:['Balai d\'or', 10], ld:['Vainqueur de la ' + NOM, 4], ee:['Équipe européenne de l\'année', 3], me:['Manager européen de l\'année', 0]}); }
if (QMC.NOMS_REC) QMC.NOMS_REC.europe = NOM;
const base = {semaine:QMC.semaine, apresSaison:QMC.apresSaison, initMonde:QMC.initMonde, avantSaison:QMC.avantSaison};
Object.assign(QMC, {
  initMonde(M, r){ base.initMonde(M, r); assurer(M); },
  semaine(M, S){
    if (S && S.type === 'ligue' && !M.calendrier.slice(M.semaine + 1).some(s => s.type === 'ligue')) garderRangs(M);   // dernière journée
    base.semaine(M, S); semaine(M, S);
  },
  apresSaison(M, r){ base.apresSaison(M, r); assurer(M); },
});
/* nom de la compétition et du tour d'un match (écrans) */
function nomTour(m){ if (!m || m.ligue !== 'eu') return ''; const t = m.tour || ''; return t[0] === 'g' ? `groupe ${m.groupe}, journée ${t.slice(1)}` : t === 'f' ? 'finale' : `${t.startsWith('qf') ? 'quart' : 'demie'} ${t.endsWith('1') ? 'aller' : 'retour'}`; }
root.QME = {NOM, COURT, TAILLE, PRIMES, TOURS, J_GROUPES, J_QUARTS, J_DEMIS, assurer, qualifies, tirage, resultat, trierTable, nomTour, matchsEu, primerEurope, garderRangs};
})(typeof window !== 'undefined' ? window : globalThis);
