// mon-ecran-version: 66d46995
/* QM27 (v106) — les sélections nationales : trêves internationales (matchs amicaux tirés au sort) et Ligue des nations.
   Trêves : trois par saison (octobre, novembre, mars), plus une en juin les étés sans Ligue des nations ; chaque sélection joue
   un amical contre une adversaire tirée au sort (19 sélections : une se repose à tour de rôle).
   Ligue des nations : l'été qui suit une saison sur deux (2027, 2029…). 4 groupes (5, 5, 5 et 4 sélections) tirés dans des
   chapeaux de force, un match contre chaque adversaire du groupe, puis quarts (1er contre 2e d'un autre groupe), demies et
   finale sur terrain neutre. Égalité au score : la sélection qui a pris le vif d'or passe, sinon celle qui recevait.
   Les semaines de sélection sont des semaines à part (type 'sixn', comp 'ami' ou 'ldn') : les championnats font une pause et
   les clubs ne s'entraînent pas, ne paient pas de salaires (la saison des clubs garde sa longueur et ses équilibres).
   Sans affichage : window.QMN. Chargé avant qm27.js n'est pas nécessaire : le moteur l'appelle au moment de bâtir le calendrier.
   Données : M.ldn (Ligue des nations de la saison en cours), M.ldnHist (palmarès), M.tables.sixn (bilan des sélections). */
(function(root){
'use strict';
const D = root.QMD;
const Q = () => root.QM, R = () => root.QMR;
const GROUPES = 'ABCD';
const ETAPES = {g1:'Groupes · journée 1', g2:'Groupes · journée 2', g3:'Groupes · journée 3', g4:'Groupes · journée 4', g5:'Groupes · journée 5', qf:'Quarts de finale', sf:'Demi-finales', f:'Finale'};
const SORTIE = {g:'Phase de groupes', qf:'Quarts de finale', sf:'Demi-finales', f:'Finale', v:'Vainqueur'};
const RANG_SORTIE = {v:1, f:2, sf:4, qf:8, g:19};
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const rng = (M, ...k) => Q().hasard(Q().melange(M.graine, 'nations', ...k));
const nom = n => (D.NATIONS[n] || {}).nom || n;
const ou = (m, n) => m.dom === n || m.ext === n;
const msg = (M, t, c) => { if (M.manager && Q().message) Q().message(M, t, c, 'sixn'); };
const moi = M => (M.manager && M.manager.selection) ? M.manager.selection.nat : null;
/* l'été de la saison an (juin an+1) a une Ligue des nations les années impaires : 2027, 2029… */
const aLdn = an => (an + 1) % 2 === 1;
const melanger = (L, r) => { L = L.slice(); for (let i = L.length - 1; i > 0; i--){ const k = Math.floor(r() * (i + 1)); [L[i], L[k]] = [L[k], L[i]]; } return L; };

/* force d'une sélection : note moyenne des titulaires au poste */
function force(M, n){
  const e = Q().selection(M, n), ids = Q().titulaires(e);
  return ids.reduce((s, id) => s + Q().note20(M.joueurs[id], ['P', 'B', 'A', 'G'].find(p => e[p].includes(id))), 0) / (ids.length || 1);
}
function parForce(M){ const f = Object.fromEntries(D.SELECTIONS.map(n => [n, force(M, n)])); return D.SELECTIONS.slice().sort((a, b) => f[b] - f[a]); }

/* ---------- trêves internationales : un amical par sélection ---------- */
function amicaux(M, an, k){
  const r = rng(M, an, 'amicaux', k), L = melanger(D.SELECTIONS, r), out = [];
  for (let i = 0; i + 1 < L.length; i += 2){ const [a, b] = r() < 0.5 ? [L[i], L[i + 1]] : [L[i + 1], L[i]];
    out.push({id:`${an}-ami${k}-${a}`, ligue:'sixn', comp:'ami', fen:k, dom:a, ext:b, res:null}); }
  return out;
}

/* ---------- Ligue des nations ---------- */
function tirage(M, an){
  const r = rng(M, an, 'ldn-tirage'), ordre = parForce(M), G = {A:[], B:[], C:[], D:[]};
  for (let p = 0; p * 4 < ordre.length; p++){
    const pot = melanger(ordre.slice(p * 4, p * 4 + 4), r), places = melanger(GROUPES.split('').filter(g => G[g].length === p), r);
    pot.forEach((n, i) => G[places[i] || GROUPES[i]].push(n));
  }
  return G;
}
/* les 8 semaines de l'été : 5 journées de groupes, quarts, demies, finale (les matchs à élimination se remplissent au fil des résultats) */
function semainesLdn(M, an){
  const G = tirage(M, an), S = ['g1', 'g2', 'g3', 'g4', 'g5', 'qf', 'sf', 'f'].map(etape => ({etape, matchs:[]}));
  M.ldn = {saison:an, groupes:G, sortie:{}, vainqueur:null, finaliste:null};
  for (const [g, L] of Object.entries(G)){
    const tours = Q().roundRobin(L.length % 2 ? [...L, null] : L, rng(M, an, 'ldn', g)).slice(0, L.length % 2 ? L.length : L.length - 1);
    tours.forEach((paires, t) => { for (const [a, b] of paires) if (a && b) S[t].matchs.push({id:`${an}-ldn-g${t + 1}-${a}`, ligue:'sixn', comp:'ldn', etape:'g' + (t + 1), groupe:g, dom:a, ext:b, res:null}); });
  }
  for (const n of D.SELECTIONS) M.ldn.sortie[n] = 'g';
  return S;
}
const ligneVide = id => ({id, j:0, g:0, n:0, p:0, pm:0, pe:0, vifs:0, pts:0, forme:[]});
function matchsLdn(M){ return M.calendrier.flatMap(s => s.matchs).filter(m => m.comp === 'ldn'); }
function tableGroupe(M, g){
  const L = (M.ldn && M.ldn.groupes[g]) || [], T = Object.fromEntries(L.map(n => [n, ligneVide(n)])), P = D.EQ.points;
  for (const m of matchsLdn(M)) if (m.groupe === g && m.res){
    const [sa, sb] = m.res.score;
    for (const [x, s1, s2, c] of [[T[m.dom], sa, sb, 0], [T[m.ext], sb, sa, 1]]){ if (!x) continue;
      x.j++; x.pm += s1; x.pe += s2; if (m.res.vif === c) x.vifs++; const k = s1 > s2 ? 'g' : s1 < s2 ? 'p' : 'n'; x[k]++; x.pts += k === 'g' ? P.victoire : k === 'n' ? P.nul : 0; }
  }
  return Object.values(T).sort((a, b) => b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || b.vifs - a.vifs || String(a.id).localeCompare(b.id));
}
function gagnant(m){ if (!m || !m.res) return null; const [a, b] = m.res.score; return a > b ? m.dom : b > a ? m.ext : m.res.vif === 1 ? m.ext : m.dom; }
const semaineEtape = (M, e) => M.calendrier.find(s => s.comp === 'ldn' && s.etape === e);
function remplir(M, e, paires, extra){
  const S = semaineEtape(M, e); if (!S || S.matchs.length) return;
  for (const [a, b] of paires) if (a && b) S.matchs.push({id:`${M.saison}-ldn-${e}-${a}`, ligue:'sixn', comp:'ldn', etape:e, dom:a, ext:b, res:null, ...(extra || {})});
}

/* ---------- après une semaine de sélections ---------- */
function apresSemaine(M, S){
  if (!S || S.type !== 'sixn' || !S.comp) return;
  etapeFaite(M, S);
  if (S.comp === 'ldn' && root.QMC && root.QMC.bilanSelection) root.QMC.bilanSelection(M, S);   // objectif du sélectionneur (qm27-carriere.js)
}
function etapeFaite(M, S){
  const ligne = m => `${nom(m.dom)} ${m.res.score[0]}–${m.res.score[1]} ${nom(m.ext)}`, n = moi(M);
  if (S.comp === 'ami'){
    msg(M, `${D.AMICAUX.fenetres} ${S.fen} : résultats`, `${S.matchs.filter(m => m.res).map(ligne).join(' · ')}.`);
    return;
  }
  const L = M.ldn; if (!L) return;
  if (S.etape === 'g5'){
    const T = Object.fromEntries(GROUPES.split('').map(g => [g, tableGroupe(M, g).map(x => x.id)]));
    for (const g of GROUPES) for (const id of T[g].slice(0, 2)) L.sortie[id] = 'qf';
    remplir(M, 'qf', [[T.A[0], T.B[1]], [T.B[0], T.A[1]], [T.C[0], T.D[1]], [T.D[0], T.C[1]]]);
    msg(M, `${D.LDN.nom} : fin des groupes`, `${GROUPES.split('').map(g => `groupe ${g} : ${nom(T[g][0])} et ${nom(T[g][1])}`).join(' · ')}. Quarts : ${semaineEtape(M, 'qf').matchs.map(m => `${nom(m.dom)} – ${nom(m.ext)}`).join(', ')}.${n ? ` ${nom(n)} ${L.sortie[n] === 'qf' ? 'est en quarts' : 'est éliminée'}.` : ''}`);
  } else if (S.etape === 'qf' || S.etape === 'sf'){
    const W = S.matchs.map(gagnant), suiv = S.etape === 'qf' ? 'sf' : 'f';
    W.forEach(w => { if (w) L.sortie[w] = suiv; });
    remplir(M, suiv, [[W[0], W[1]], [W[2], W[3]]].filter(p => p[0] && p[1]), suiv === 'f' ? {neutre:true} : null);
    msg(M, `${D.LDN.nom} : ${ETAPES[S.etape].toLowerCase()}`, `${S.matchs.filter(m => m.res).map(ligne).join(' · ')}. ${suiv === 'f' ? 'Finale' : 'Demi-finales'} : ${semaineEtape(M, suiv).matchs.map(m => `${nom(m.dom)} – ${nom(m.ext)}`).join(', ')}.`);
  } else if (S.etape === 'f'){
    const m = S.matchs[0], v = gagnant(m); if (!v) return;
    const f = m.dom === v ? m.ext : m.dom; L.vainqueur = v; L.finaliste = f; L.sortie[v] = 'v'; L.sortie[f] = 'f';
    (M.ldnHist = M.ldnHist || []).push({saison:L.saison, v, f, score:m.res.score.slice()});
    msg(M, `${nom(v)} remporte la ${D.LDN.nom}`, `Finale : ${ligne(m)}${m.res.score[0] === m.res.score[1] ? ' (vif d\'or décisif)' : ''}. ${nom(f)} finaliste.`);
    if (R() && R().donner) for (const j of Object.values(M.joueurs)) if (j.nat === v && j.nS && j.nS.s === M.saison && j.nS.ldn) R().donner(M, j, 'ln', 'ldn');
  }
}

/* ---------- lecture pour les écrans ---------- */
function etat(M){
  const L = M.ldn && M.ldn.saison === M.saison ? M.ldn : null;
  const tours = L ? ['qf', 'sf', 'f'].map(e => [e, (semaineEtape(M, e) || {matchs:[]}).matchs]) : [];
  const amis = M.calendrier.filter(s => s.comp === 'ami');
  return {ldn:L, groupes:L ? GROUPES.split('').map(g => [g, tableGroupe(M, g)]) : [], tours, amis, an:M.saison, aLdn:aLdn(M.saison), hist:M.ldnHist || []};
}
/* le prochain rendez-vous des sélections (pour l'accueil et le calendrier) */
function titreSemaine(S){
  if (!S || !S.comp) return '';
  return S.comp === 'ami' ? `${D.AMICAUX.fenetres} ${S.fen}` : `${D.LDN.nom} · ${ETAPES[S.etape] || ''}`;
}
function titreMatch(m){
  if (!m || m.ligue !== 'sixn') return '';
  if (m.comp === 'ami') return `Match amical · ${D.AMICAUX.fenetres.toLowerCase()} ${m.fen}`;
  if (m.comp === 'ldn') return `${D.LDN.nom} · ${m.groupe ? 'groupe ' + m.groupe + ', ' + ETAPES[m.etape].replace('Groupes · ', '') : ETAPES[m.etape]}${m.neutre ? ' · terrain neutre' : ''}`;
  return `${D.TOURNOI.court}${m.tour ? ' · tour ' + m.tour : ''}`;
}

root.QMN = {aLdn, amicaux, semainesLdn, tableGroupe, gagnant, apresSemaine, etat, titreSemaine, titreMatch, parForce, force, ETAPES, SORTIE, RANG_SORTIE, GROUPES, lab};
})(typeof window !== 'undefined' ? window : globalThis);
