// mon-ecran-version: d778fdbe
/* QM27 (v91, lot 8) — le bureau du manager, sans affichage. Expose window.QMG et complète window.QMC. Chargé après qm27-vestiaire.js.
   Entraînement programmable : programme de la semaine en 5 séances (lundi-vendredi), intensité, ateliers par poste, modèles,
   préparation physique d'avant-saison ; l'adjoint planifie tout seul si on le laisse faire.
   Profil du manager : âge, nationalité, avatar modifiable, 8 attributs façon FM (effets légers), contrat avec le président.
   Mémoire : records du club et du championnat (avec un historique inventé au départ), séries.
   Recrutement : missions du recruteur sur un club ou une ligue entière. Sauvegarde v7. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, ENT = EQ.ent, QMC = root.QMC;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const club = (M, id) => M.clubs[id];
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;
const nomJ = j => Q().nomJ(j);
const monClub = M => M.manager && M.manager.club ? club(M, M.manager.club) : null;
const G = M => M.bureau || (M.bureau = {rec:{ligues:{}, clubs:{}}, serie:{}, missions:[]});
const copie = o => JSON.parse(JSON.stringify(o));

/* ================= Entraînement programmable ================= */
const SEANCES = [
  ['physique', 'Physique', 'Endurance, vitesse, force', {Physique:1}],
  ['vol', 'Vol', 'Pilotage, virages, piqués', {Vol:1}],
  ['balle', 'Balle', 'Passes, tirs, frappes, arrêts', {Balle:1, Gardien:1}],
  ['tactique', 'Tactique', 'Placement, lecture du jeu, cohésion', {Mental:1}],
  ['match', 'Mise en place', 'Répétition du plan de match', {Mental:0.5, Balle:0.5, Gardien:0.5}],
  ['recup', 'Récupération', 'Soins, bains chauds, repos', {}],
];
const SEANCE = Object.fromEntries(SEANCES.map(s => [s[0], s]));
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
/* [id, nom, attributs ciblés, attributs de gardien ciblés] */
const ATELIERS = {
  P:[['tirs', 'Tirs aux anneaux', ['tir', 'pre', 'san'], []], ['passes', 'Jeu de passes', ['pas', 'rec', 'vis'], []], ['duels', 'Duels', ['bou', 'int', 'for'], []]],
  B:[['frappe', 'Frappe', ['fra', 'for', 'agr'], []], ['protection', 'Protection', ['ant', 'pla', 'con'], []], ['volserre', 'Vol serré', ['vir', 'equ', 'pil'], []]],
  A:[['pique', 'Piqués', ['piq', 'vit', 'acc'], []], ['lynx', 'Œil de lynx', ['acu', 'con', 'ant'], []], ['duel', 'Duel d\'attrapeurs', ['bou', 'equ', 'san'], []]],
  G:[['arrets', 'Arrêts', ['ref'], ['arr', 'cou_a']], ['sorties', 'Sorties', ['agi'], ['sor', 'com']], ['relance', 'Relance', ['pas', 'vis'], ['rel']]],
};
const MODELES = {
  foncier:{nom:'Foncier', jours:['physique', 'physique', 'vol', 'physique', 'recup'], int:3},
  presaison:{nom:'Pré-saison', jours:['physique', 'vol', 'balle', 'physique', 'tactique'], int:2},
  type:{nom:'Semaine type', jours:['vol', 'balle', 'physique', 'tactique', 'match'], int:2},
  technique:{nom:'Travail technique', jours:['vol', 'balle', 'balle', 'vol', 'match'], int:3},
  tactique:{nom:'Tactique', jours:['tactique', 'balle', 'tactique', 'match', 'recup'], int:2},
  recup:{nom:'Récupération', jours:['recup', 'vol', 'tactique', 'recup', 'match'], int:1},
};
const IDX = k => D.ATTRS.findIndex(a => a[0] === k), IDXG = k => D.GARDIEN.findIndex(a => a[0] === k);
function plan(c){ return c.plan || (c.plan = {auto:true, modele:{...copie(MODELES.type), ateliers:null}, sem:{}}); }
const cle = (M, k) => M.saison + ':' + k;
/* atelier le plus utile pour un poste : le groupe d'attributs le plus faible des joueurs de ce poste */
function atelierAuto(M, c, p){
  const L = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.poste === p);
  if (!L.length) return ATELIERS[p][0][0];
  const score = ([, , a, g]) => L.reduce((s, j) => s + a.reduce((t, k) => t + j.a[IDX(k)], 0) + (j.g ? g.reduce((t, k) => t + j.g[IDXG(k)], 0) : 0), 0) / (a.length + g.length) / L.length;
  return ATELIERS[p].slice().sort((x, y) => score(x) - score(y))[0][0];
}
function ateliersAuto(M, c){ return Object.fromEntries(['P', 'B', 'A', 'G'].map(p => [p, atelierAuto(M, c, p)])); }
function fatigueTitulaires(M, c){ const L = (c.compo ? Q().titulaires(c.compo) : c.effectif).map(id => M.joueurs[id]).filter(Boolean); return L.length ? L.reduce((s, j) => s + j.fat, 0) / L.length : 0; }
/* le choix de l'adjoint pour la semaine k */
function programmeAuto(M, c, k){
  const S = M.calendrier[k], semPrepa = S && S.type === 'prepa' ? S.semaine : 0;
  let p = semPrepa ? (semPrepa <= 2 ? MODELES.foncier : MODELES.presaison) : MODELES.type;
  if (!semPrepa && k === M.semaine && fatigueTitulaires(M, c) > 40) p = MODELES.recup;
  else if (!semPrepa && S && S.tour) p = MODELES.tactique;   // semaine du tournoi : beaucoup d'absents, on travaille le collectif
  return {...copie(p), ateliers:ateliersAuto(M, c), auto:true};
}
function programmeDe(M, c, k){
  const P = plan(c), p = P.sem[cle(M, k)];
  if (p) return p;
  if (P.auto) return programmeAuto(M, c, k);
  return {...P.modele, ateliers:P.modele.ateliers || ateliersAuto(M, c)};
}
function definirSemaine(M, k, p){ const c = monClub(M); if (!c) return; const P = plan(c); if (p) P.sem[cle(M, k)] = {...copie(p), auto:false}; else delete P.sem[cle(M, k)]; }
function definirModele(M, p){ const c = monClub(M); if (!c) return; plan(c).modele = {...copie(p), auto:false}; }
function modeAuto(M, on){ const c = monClub(M); if (c) plan(c).auto = !!on; }
/* ce que donne un programme : multiplicateurs par famille d'attributs, intensité, bonus d'atelier, fatigue, risque, cohésion */
function effets(M, c, p, S){
  const part = {Physique:0, Vol:0, Balle:0, Mental:0, Gardien:0};
  let recup = 0, tac = 0;
  for (const d of p.jours){ const s = SEANCE[d] || SEANCE.recup; for (const [f, w] of Object.entries(s[3])) part[f] += w / 5; if (d === 'recup') recup += 0.2; if (d === 'tactique') tac += 0.2; if (d === 'match') tac += 0.1; }
  const phy = eff(M, 'phy'), pre = S && S.type === 'prepa';
  const mix = {};
  for (const [f, v] of Object.entries(part)){
    let fm = ENT.horsFocus * (1 - recup) + (ENT.focus - ENT.horsFocus) * Math.min(1, v * 2.5);
    if (f === 'Physique'){ fm *= 1 + phy * 0.02; if (pre) fm *= 1.4; }
    mix[f] = Math.round(fm * 1000) / 1000;
  }
  const boost = {};
  for (const po of ['P', 'B', 'A', 'G']){ const a = (ATELIERS[po].find(x => x[0] === (p.ateliers || {})[po]) || ATELIERS[po][0]);
    boost[po] = {a:a[2].map(IDX), g:a[3].map(IDXG)}; }
  const i = borne(p.int || 2, 1, 3);
  const fat = Math.round((ENT.fatigue[i - 1] * (1 - recup) - recup * 14) * (1 - phy * 0.02) * 10) / 10;
  const coh = Math.round((tac * 2.5 + eff(M, 'tac') * 0.06) * 100) / 100;
  return {mix, int:i, boost, fat, risque:1 - recup, coh, recup, jeunes:1 + eff(M, 'jeu') * 0.015};
}
/* lu par l'entraînement (qm27-club.js) pour le club du joueur */
function programme(M, c, S){ return effets(M, c, programmeDe(M, c, M.semaine), S); }
/* jauges pour l'écran : progression, fatigue, risque de blessure, cohésion (0-100) */
function apercu(M, c, p, S){
  const e = effets(M, c, p, S), prog = Object.values(e.mix).reduce((s, v) => s + v, 0) / 5 * ENT.intensite[e.int - 1];
  return {progression:Math.round(borne(prog / 2.2 * 100, 0, 100)), fatigue:Math.round(borne((e.fat + 14) / 23 * 100, 0, 100)), risque:Math.round(borne(e.risque * e.int * e.int / 9 * 100, 0, 100)), cohesion:Math.round(borne(e.coh / 2.5 * 100, 0, 100))};
}

/* ================= Profil du manager ================= */
const ATTR_MGR = [
  ['tac', 'Tactique', 'La cohésion de l\'équipe monte plus vite.'],
  ['mot', 'Motivation', 'Les causeries portent davantage.'],
  ['hum', 'Gestion humaine', 'Le moral des joueurs reste plus stable.'],
  ['jeu', 'Travail avec les jeunes', 'Les 21 ans et moins progressent plus vite.'],
  ['phy', 'Préparation physique', 'Le travail physique rend plus et fatigue moins.'],
  ['jug', 'Évaluation des talents', 'Tu cernes plus vite les joueurs que tu supervises.'],
  ['neg', 'Négociation', 'Les clubs et les joueurs demandent un peu moins.'],
  ['det', 'Détermination', 'Le président te pardonne mieux une mauvaise passe.'],
];
function profil(M){
  const mg = M.manager; if (!mg) return null;
  if (!mg.profil){
    const r = rng(M, 'profil', mg.nom), c = monClub(M), base = 6 + (mg.rep || 30) / 12;
    const attrs = {}; for (const [k] of ATTR_MGR) attrs[k] = Math.round(borne(base + r.ent(-2, 2), 1, 20));
    mg.profil = {age:r.ent(34, 46), nat:c ? c.nat : 'FRA', look:null, attrs, fige:false, xp:{causeries:0, transferts:0}, contrat:null, saisonsCarriere:0};
  }
  const p = mg.profil;
  if (mg.club && (!p.contrat || p.contrat.club !== mg.club)) p.contrat = nouveauContrat(M, club(M, mg.club));
  if (!mg.club) p.contrat = null;
  return p;
}
function nouveauContrat(M, c){ return {club:c.id, sal:Math.round(c.rep * c.rep * 3.2 / 100) * 100, fin:M.saison + 2, debut:M.saison}; }
const att = (M, k) => { const p = M.manager && M.manager.profil; return p ? p.attrs[k] ?? 10 : 10; };
const eff = (M, k) => att(M, k) - 10;
/* répartir ses points tant que la carrière n'a pas commencé (avant le premier match officiel) */
function repartir(M, de, vers){
  const p = profil(M); if (!p || p.fige) return {ok:false, msg:'Tes attributs évoluent désormais avec ta carrière.'};
  if (p.attrs[de] <= 1 || p.attrs[vers] >= 20) return {ok:false, msg:'Limite atteinte.'};
  p.attrs[de]--; p.attrs[vers]++; return {ok:true};
}
function modifierProfil(M, o){
  const p = profil(M), mg = M.manager; if (!p) return;
  if (o.nom != null){ const n = String(o.nom).trim().slice(0, 30); if (n) mg.nom = n; }
  if (o.age != null) p.age = borne(+o.age || p.age, 28, 75);
  if (o.nat && D.NATIONS[o.nat]) p.nat = o.nat;
  if (o.look !== undefined) p.look = o.look;
}
/* progression des attributs du manager en fin de saison, selon ce qu'il a fait */
function evolutionManager(M, r){
  const mg = M.manager, p = mg && mg.profil; if (!p) return;
  p.saisonsCarriere = (p.saisonsCarriere || 0) + 1;
  const h = M.histo[M.histo.length - 1], c = monClub(M), gains = [];
  const monte = (k, proba) => { if (p.attrs[k] < 20 && r() < proba){ p.attrs[k]++; gains.push(ATTR_MGR.find(a => a[0] === k)[1]); } };
  if (h && h.manager){ const ecart = h.manager.objectif - h.manager.pos; monte('tac', ecart >= 0 ? 0.6 : 0.2); monte('det', ecart < 0 ? 0.5 : 0.25); }
  monte('mot', Math.min(0.7, (p.xp.causeries || 0) / 40));
  monte('neg', Math.min(0.7, (p.xp.transferts || 0) / 5));
  if (c){ const jeunes = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.age <= 21 && j.saison && j.saison.m >= 8).length; monte('jeu', Math.min(0.7, jeunes / 4)); }
  monte('phy', 0.3); monte('jug', 0.3 + Math.min(0.3, (c ? c.suivi.length : 0) / 20)); monte('hum', 0.35);
  p.xp = {causeries:0, transferts:0};
  if (gains.length) Q().message(M, 'Ton expérience grandit', `Après cette saison, tu progresses en ${gains.join(', ').toLowerCase()}.`, 'carriere');
}

/* ================= Records ================= */
const RECORDS = [
  ['ecart', 'Plus large victoire', 'pts d\'écart'], ['points', 'Plus de points marqués en un match', 'pts'], ['vif', 'Vif d\'or le plus rapide', 'e minute', true],
  ['long', 'Match le plus long', 'min'], ['buteur', 'Meilleur buteur sur une saison', 'buts'], ['serie', 'Plus longue série de victoires', 'victoires'],
  ['attaque', 'Meilleure attaque sur une saison', 'pts'], ['classement', 'Plus de points au classement', 'pts'], ['affluence', 'Affluence record', 'spectateurs'],
];
const RECORD = Object.fromEntries(RECORDS.map(x => [x[0], x]));
/* historique inventé : des records anciens, battables, pour que la salle des trophées ne soit pas vide */
function legendes(M, cible, nat, echelle, cleR){
  const r = rng(M, 'legendes', cleR), N = D.NOMS[nat] || D.NOMS[Object.keys(D.NOMS)[0]];
  const nom = () => `${r.choix(N.p)} ${r.choix(N.n)}`, an = () => r.ent(1952, 2021), saison = a => `${a}-${String(a + 1).slice(2)}`;
  const R = {}, f = echelle, ent = (x, y) => r.ent(x, y), dix = x => Math.round(x / 10) * 10;
  /* ordres de grandeur mesurés sur des saisons simulées (outils/dev : maximum d'une ligue sur une saison, médiane des clubs) */
  const L = cible === 'ligue';
  R.ecart = {v:dix((L ? ent(620, 780) : ent(430, 540)) * f), txt:'face à un club disparu', saison:saison(an()), ancien:true};
  R.points = {v:dix((L ? ent(960, 1120) : ent(740, 860)) * f), txt:'un soir de pluie battante', saison:saison(an()), ancien:true};
  R.vif = {v:Math.round((L ? ent(22, 26) : ent(24, 31)) / Math.max(0.85, f)), txt:`attrapé par ${nom()}`, saison:saison(an()), ancien:true};
  R.long = {v:L ? ent(205, 228) : ent(185, 205), txt:'le vif d\'or est resté caché', saison:saison(an()), ancien:true};
  R.buteur = {v:Math.round((L ? ent(470, 560) : ent(300, 390)) * f), txt:nom(), saison:saison(an()), ancien:true};
  R.serie = {v:Math.round((L ? ent(9, 13) : ent(6, 9)) * f), txt:'une équipe de légende', saison:saison(an()), ancien:true};
  R.attaque = {v:dix((L ? ent(11800, 13200) : ent(8900, 10400)) * f), txt:'une génération dorée', saison:saison(an()), ancien:true};
  R.classement = {v:Math.round((L ? ent(66, 74) : ent(46, 56)) * f), txt:'une saison de rêve', saison:saison(an()), ancien:true};
  if (cible === 'club') R.affluence = {v:0, txt:'', saison:'', ancien:true};
  return R;
}
function initRecords(M){
  const g = G(M);
  for (const L of Object.values(M.ligues)) if (!g.rec.ligues[L.id]){ const nat = M.clubs[L.clubs[0]].nat; g.rec.ligues[L.id] = legendes(M, 'ligue', nat, 1, L.id); }
  for (const c of Object.values(M.clubs)) if (!g.rec.clubs[c.id]){ g.rec.clubs[c.id] = legendes(M, 'club', c.nat, 0.85 + (c.rep - 60) / 200, c.id); if (g.rec.clubs[c.id].affluence) g.rec.clubs[c.id].affluence.v = Math.round(c.stade * 0.9 / 100) * 100; }
}
function battre(M, R, k, v, txt, plusPetit, alerte){
  const x = R[k], mieux = !x || (plusPetit ? v < x.v : v > x.v);
  if (!mieux) return false;
  R[k] = {v, txt, saison:`${M.saison}-${String(M.saison + 1).slice(2)}`};
  if (alerte) Q().message(M, `Record battu : ${RECORD[k][1].toLowerCase()}`, `${alerte} : ${v} ${RECORD[k][2]}${x && x.v ? ` (ancien record : ${x.v}${x.saison ? ', ' + x.saison : ''})` : ''}.`, 'club');
  return true;
}
function recordsSemaine(M, S){
  const g = G(M), U = monClub(M), nomC = id => (M.clubs[id] || {}).nom || id;
  for (const m of S.matchs){
    if (!m.res || m.ligue === 'sixn') continue;
    const [a, b] = m.res.score, RL = g.rec.ligues[m.ligue]; if (!RL) continue;
    const gagnant = a > b ? m.dom : b > a ? m.ext : null, perdant = gagnant === m.dom ? m.ext : m.dom, d = Math.abs(a - b), sc = `${nomC(m.dom)} ${a}–${b} ${nomC(m.ext)}`;
    for (const [R, id, alerte] of [[RL, null, U && (m.dom === U.id || m.ext === U.id) ? 'Championnat' : null], [g.rec.clubs[m.dom], m.dom, U && U.id === m.dom ? U.nom : null], [g.rec.clubs[m.ext], m.ext, U && U.id === m.ext ? U.nom : null]]){
      if (!R) continue;
      if (gagnant && (!id || id === gagnant)) battre(M, R, 'ecart', d, sc, false, alerte && gagnant === (U && U.id) ? alerte : null);
      const pts = id ? (id === m.dom ? a : b) : Math.max(a, b);
      battre(M, R, 'points', pts, sc, false, alerte && (!id || id === (U && U.id)) && pts === (U && (U.id === m.dom ? a : U.id === m.ext ? b : -1)) ? alerte : null);
      if (m.res.vif >= 0){ const vc = m.res.vif === 0 ? m.dom : m.ext; if (!id || id === vc) battre(M, R, 'vif', m.res.duree, `${nomC(vc)} contre ${nomC(vc === m.dom ? m.ext : m.dom)}`, true, alerte && vc === (U && U.id) ? alerte : null); }
      battre(M, R, 'long', m.res.duree, sc, false, null);
    }
    if (U && m.dom === U.id && m.res.affluence) battre(M, g.rec.clubs[U.id], 'affluence', m.res.affluence, `contre ${nomC(m.ext)}`, false, U.nom);
    for (const [id, gagne] of [[m.dom, gagnant === m.dom], [m.ext, gagnant === m.ext]]){
      g.serie[id] = gagne ? (g.serie[id] || 0) + 1 : 0;
      if (!gagne) delete (g.alerte || {})[id];
      if (gagne){ const R = g.rec.clubs[id], dejaDit = (g.alerte = g.alerte || {})[id];
        if (battre(M, R, 'serie', g.serie[id], nomC(id), false, U && U.id === id && g.serie[id] >= 5 && !dejaDit ? U.nom : null) && U && U.id === id && g.serie[id] >= 5) g.alerte[id] = true;   // une seule alerte par série
        battre(M, RL, 'serie', g.serie[id], nomC(id), false, null); }
    }
    void perdant;
  }
}
/* fin de saison (avant la remise à zéro des statistiques) : buteurs, attaques, points */
function recordsSaison(M){
  const g = G(M), U = monClub(M);
  for (const L of Object.values(M.ligues)){
    const RL = g.rec.ligues[L.id]; if (!RL) continue;
    for (const id of L.clubs){ const c = M.clubs[id], RC = g.rec.clubs[id], T = M.tables[L.id] && M.tables[L.id][id]; if (!c || !RC || !T) continue;
      const moi = U && U.id === id;
      battre(M, RC, 'attaque', T.pm, c.nom, false, moi ? c.nom : null); battre(M, RL, 'attaque', T.pm, c.nom, false, null);
      battre(M, RC, 'classement', T.pts, c.nom, false, moi ? c.nom : null); battre(M, RL, 'classement', T.pts, c.nom, false, null);
      for (const jid of c.effectif){ const j = M.joueurs[jid]; if (!j || !j.saison || !j.saison.b) continue;
        battre(M, RC, 'buteur', j.saison.b, `${nomJ(j)}`, false, moi ? c.nom : null); battre(M, RL, 'buteur', j.saison.b, `${nomJ(j)} (${c.nom})`, false, null); }
    }
  }
}
const records = M => { initRecords(M); return G(M).rec; };

/* ================= Missions du recruteur ================= */
const MAX_MISSIONS = 3;
/* v97 : recherche par profil, sans fin, avec un rapport tous les mois. [nom, filtre, score (sur l'estimation du recruteur)] */
const est = (M, j) => { const v = Q().note(j), f = root.QMH ? root.QMH.fourchette(M, j, v, 'note', 5) : [v, v]; return (f[0] + f[1]) / 2; };
const PROFILS = {
  attrapeur:['Un attrapeur', j => j.poste === 'A', (M, j) => est(M, j)],
  batteur:['Un batteur de premier plan', j => j.poste === 'B', (M, j) => est(M, j)],
  buteur:['Un poursuiveur buteur', j => j.poste === 'P', (M, j) => est(M, j) * 0.6 + (Q().at(j, 'tir') + Q().at(j, 'pre')) * 2],
  gardien:['Un gardien', j => j.poste === 'G', (M, j) => est(M, j)],
  jeunes:['Les jeunes à fort potentiel', j => j.age <= 20, (M, j) => QMC.potentielEstime(M, j) * 12 + est(M, j) * 0.4],
  affaires:['Les bonnes affaires', j => j.age <= 31, (M, j) => est(M, j) - 9 * Math.log10(1 + QMC.valeur(M, j) / 40000)],
  experience:['Un joueur d\'expérience', j => j.age >= 29, (M, j) => est(M, j) + Q().at(j, 'det') * 0.5],
  contrats:['Les fins de contrat', null, (M, j) => est(M, j)],
};
function candidats(M, mi){
  const U = monClub(M), P = PROFILS[mi.cible]; if (!P) return [];
  const tous = [...Object.values(M.clubs).filter(c => !U || c.id !== U.id).flatMap(c => c.effectif), ...(M.libres || [])].map(id => M.joueurs[id]).filter(Boolean);
  return tous.filter(j => (P[1] ? P[1](j) : !j.club || (j.contrat && j.contrat.fin <= M.saison)) && (!mi.budget || QMC.valeur(M, j) <= mi.budget))
    .map(j => [j, P[2](M, j)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
function rapportProfil(M, mi, g){
  const L = candidats(M, mi).slice(0, 6), P = PROFILS[mi.cible];
  g.rapports = g.rapports || {}; g.rapports[mi.cible] = {t:tic(M), ids:L.map(j => j.id), budget:mi.budget || 0};
  const ligne = (j, i) => { const f = root.QMH ? root.QMH.fourchette(M, j, Q().note(j), 'note', 5) : [Q().note(j), Q().note(j)], c = j.club ? club(M, j.club) : null;
    return `${i + 1}. ${nomJ(j)} — ${D.POSTES[j.poste].nom.toLowerCase()}, ${j.age} ans, ${c ? c.nom : 'libre'} · note ${f[0] === f[1] ? f[0] : f[0] + ' à ' + f[1]} · ${'★'.repeat(QMC.potentielEstime(M, j))} · ${c ? 'valeur ' + QMC.euros(QMC.valeur(M, j)) : 'sans indemnité'}${j.contrat && c ? ` · ${QMC.euros(j.contrat.sal)} / sem. jusqu'en ${j.contrat.fin}` : ''}`; };
  Q().message(M, `Rapport mensuel du recruteur : ${P[0].toLowerCase()}`, L.length ? `${mi.budget ? `Valeur maximale : ${QMC.euros(mi.budget)}.\n` : ''}${L.map(ligne).join('\n')}\n\nLa liste complète, avec les fiches, est dans Clubs et joueurs › Missions du recruteur.` : 'Personne ne correspond pour l\'instant. Le recruteur continue de chercher.', 'mercato');
}
function cibles(M, mi){ return mi.type === 'profil' ? candidats(M, mi).slice(0, 20) : mi.type === 'club' ? (club(M, mi.cible) ? club(M, mi.cible).effectif : []) : mi.type === 'ligue' ? M.ligues[mi.cible].clubs.flatMap(id => club(M, id).effectif) : M.libres || []; }
function lancerMission(M, type, cible, budget){
  const U = monClub(M); if (!U) return {ok:false, msg:'Il te faut un club.'};
  const g = G(M);
  if (g.missions.some(x => x.type === type && x.cible === cible)) return {ok:false, msg:'Le recruteur y est déjà.'};
  if (g.missions.length >= MAX_MISSIONS) return {ok:false, msg:`Ton recruteur mène déjà ${MAX_MISSIONS} missions : arrêtes-en une.`};
  if (type === 'club' && cible === U.id) return {ok:false, msg:'C\'est ton club.'};
  if (type === 'profil'){ if (!PROFILS[cible]) return {ok:false, msg:'Profil inconnu.'};
    g.missions.push({type, cible, debut:tic(M), duree:0, budget:+budget || 0, dernier:tic(M)});
    return {ok:true, msg:`Le recruteur cherche : ${PROFILS[cible][0].toLowerCase()}. Premier rapport dans 4 semaines.`}; }
  g.missions.push({type, cible, debut:tic(M), duree:type === 'club' ? 4 : 8});
  return {ok:true, msg:type === 'club' ? `Le recruteur part observer ${club(M, cible).nom} pendant 4 semaines.` : type === 'ligue' ? `Le recruteur sillonne la ${M.ligues[cible].nom} pendant 8 semaines.` : 'Le recruteur passe les agents libres au crible.'};
}
function arreterMission(M, i){ G(M).missions.splice(i, 1); }
function missionsSemaine(M){
  const U = monClub(M), g = G(M), H = root.QMH; if (!U || !H) return;
  const rec = (U.staff.recruteur || {note:10}).note, j = eff(M, 'jug');
  for (const mi of g.missions.slice()){
    const gain = (mi.type === 'club' ? 14 : mi.type === 'ligue' ? 4 : mi.type === 'profil' ? 9 : 10) * (0.5 + rec / 20) * (1 + j * 0.04);
    for (const x of cibles(M, mi)) H.connaitre(M, x.id || x, gain);
    if (mi.type === 'profil'){ if (tic(M) - (mi.dernier ?? mi.debut) >= 4){ mi.dernier = tic(M); rapportProfil(M, mi, g); } continue; }
    if (tic(M) - mi.debut >= mi.duree){
      g.missions.splice(g.missions.indexOf(mi), 1);
      const L = cibles(M, mi).map(id => M.joueurs[id]).filter(x => x && x.club !== U.id).sort((a, b) => (QMC.potentielEstime(M, b) - QMC.potentielEstime(M, a)) || (Q().note(b) - Q().note(a))).slice(0, 5);
      const ou = mi.type === 'club' ? club(M, mi.cible).nom : mi.type === 'ligue' ? M.ligues[mi.cible].nom : 'les agents libres';
      Q().message(M, `Rapport du recruteur : ${ou}`, L.length ? `Mission terminée. À suivre de près : ${L.map(x => `${nomJ(x)} (${D.POSTES[x.poste].nom.toLowerCase()}, ${x.age} ans, ${'★'.repeat(QMC.potentielEstime(M, x))})`).join(' ; ')}.` : 'Mission terminée : rien de remarquable.', 'mercato');
    }
  }
  /* l'œil du manager : il cerne mieux les joueurs supervisés */
  if (j > 0) for (const id of U.suivi) H.connaitre(M, id, j * 0.5);
}

/* ================= v94 : historique de carrière (une ligne par saison) ================= */
function lignesCarriere(M){
  for (const j of Object.values(M.joueurs)){
    const s = j.saison; if (!s || (!s.m && !j.club)) continue;
    const k = j.carr || (j.carr = {s:[], t:[]});
    k.s.push([M.saison, j.club || null, s.m, s.b, s.cog, s.v, s.arr, s.m ? Math.round(s.notes / s.m * 10) : 0]);
    if (k.s.length > 14) k.s.shift();
  }
}

/* ================= Branchements ================= */
const base = {semaine:QMC.semaine, avantSaison:QMC.avantSaison, apresSaison:QMC.apresSaison, migrer:QMC.migrer, prixClub:QMC.prixClub, exigenceJoueur:QMC.exigenceJoueur, accepterPoste:QMC.accepterPoste};
Object.assign(QMC, {
  semaine(M, S){
    base.semaine(M, S);
    initRecords(M); recordsSemaine(M, S); missionsSemaine(M);
    const U = monClub(M), p = M.manager ? profil(M) : null;
    if (U && p){
      if (!p.fige && S.matchs.some(m => m.res && m.ligue !== 'sixn' && (m.dom === U.id || m.ext === U.id))){ p.fige = true;
        while (p.pool > 0){ const k = ATTR_MGR.map(a => a[0]).sort((x, y) => p.attrs[x] - p.attrs[y])[0]; p.attrs[k]++; p.pool--; } }   // points pas placés : vers les attributs les plus faibles
      const h = eff(M, 'hum'); if (h) for (const id of U.effectif){ const j = M.joueurs[id]; if (j) j.moral = borne(j.moral + h * 0.3, 5, 100); }
      const d = eff(M, 'det'); if (d > 0 && M.manager.confiance < 50) M.manager.confiance = Math.min(100, Math.round((M.manager.confiance + d * 0.15) * 10) / 10);
    }
  },
  avantSaison(M, r){ initRecords(M); recordsSaison(M); evolutionManager(M, r); lignesCarriere(M);
    const U = monClub(M); if (U && U.plan) U.plan.sem = {};
    base.avantSaison(M, r); },
  apresSaison(M, r){
    base.apresSaison(M, r);
    const mg = M.manager, p = mg && mg.profil;
    if (p && p.contrat && mg.club && p.contrat.fin < M.saison){
      const c = club(M, mg.club);
      if (mg.confiance >= 35){ p.contrat = {...nouveauContrat(M, c), sal:Math.round(p.contrat.sal * (mg.confiance >= 70 ? 1.15 : 1.05) / 100) * 100};
        Q().message(M, 'Contrat prolongé', `Le président prolonge ton contrat jusqu'en ${p.contrat.fin + 1} : ${QMC.euros(p.contrat.sal)} par semaine.`, 'pres'); }
      else { p.contrat = {...nouveauContrat(M, c), fin:M.saison, sal:p.contrat.sal};
        Q().message(M, 'Contrat d\'un an', 'Le président hésite : il ne te prolonge que d\'une saison. À toi de le convaincre.', 'pres'); }
    }
  },
  migrer(M){ const v = M.v || 1; base.migrer(M); initRecords(M); if (M.manager) profil(M);
    if (M.manager && v < 9) Q().message(M, 'QM27 : nouveau taux des Gallions, recruteur et causeries', 'Le Gallion suit maintenant le canon (environ 5 livres) : 1 Gallion = 17 Mornilles = 493 Noises. Tes finances n\'ont pas changé, seul l\'affichage change : une place vaut 2 ou 3 Gallions, ton budget se compte en centaines de milliers de Gallions. Clubs et joueurs › Recherche par profil : le recruteur cherche un attrapeur, un batteur, des jeunes, des bonnes affaires… et t\'envoie un rapport chaque mois. Dix discours pour les causeries, vitesse ×0,5 et statistiques en direct pendant les matchs.', 'staff');
    if (M.manager && v < 8) Q().message(M, 'QM27 : Gallions, presse et carrières', 'La monnaie des sorciers arrive : Gallions (or), Mornilles (argent) et Noises (bronze). 1 Gallion = 17 Mornilles, 1 Mornille = 29 Noises. Les conférences de presse passent à trois questions, posées par plusieurs médias selon le match et la saison ; chaque réponse a un ton et des effets (groupe, joueur, président, supporters, réputation, relation avec la presse). Les notes ne gonflent plus de saison en saison : les potentiels trop généreux ont été ramenés à un niveau réaliste, et les salaires des stars montent moins vite au-dessus de 75. Les clubs gardent désormais leurs meilleurs joueurs en fin de contrat. Chaque fiche joueur a son historique de carrière (à partir de cette saison).', 'club');
    if (M.manager && v < 7) Q().message(M, 'Nouveautés de QM27 : le domaine et le bureau', 'Accueil Club : une carte du domaine à toucher (vestiaire, stade, tour du directeur, Gringotts, zone technique, Poudlard, salle des trophées). Calendrier par mois et par saison. Entraînement programmable avec ton adjoint. Ton profil de manager (avatar, attributs, contrat). Records du club et du championnat. Le Tournoi des Six Emblèmes se joue désormais pendant le championnat dès la saison prochaine : les internationaux manquent les matchs de leur club.', 'club');
    M.v = Q().VERSION; },
  prixClub(M, j){ const v = base.prixClub(M, j), U = monClub(M); return U && j.club !== U.id ? Math.round(v * (1 - eff(M, 'neg') * 0.008) / 5000) * 5000 : v; },
  exigenceJoueur(M, j, U){ const e = base.exigenceJoueur(M, j, U); if (e && e.sal && monClub(M) === U) e.sal = Math.round(e.sal * (1 - eff(M, 'neg') * 0.005) / 50) * 50; return e; },
  accepterPoste(M, id){ const r = base.accepterPoste(M, id); if (r && r.ok) profil(M); return r; },
});
/* l'expérience du manager : causeries plus efficaces (motivation) ; les jeunes progressent plus vite via effets().jeunes */
if (root.QMH){ const ca = root.QMH.causerie; root.QMH.causerie = (M, X, eq, ton, moment) => { const r = ca(M, X, eq, ton, moment); const p = M.manager && M.manager.profil; if (p){ p.xp.causeries = (p.xp.causeries || 0) + 1; if (r && typeof r.delta === 'number') r.delta = Math.round(r.delta * (1 + eff(M, 'mot') * 0.04) * 100) / 100; } return r; };
  const eh = root.QMH.envoyerHibou; root.QMH.envoyerHibou = (M, o) => { const r = eh(M, o); const p = M.manager && M.manager.profil; if (p && r && r.ok) p.xp.transferts = (p.xp.transferts || 0) + 1; return r; }; }
root.QMG = {SEANCES, SEANCE, JOURS, ATELIERS, MODELES, plan, programmeDe, programmeAuto, definirSemaine, definirModele, modeAuto, effets, programme, apercu, fatigueTitulaires,
  ATTR_MGR, profil, repartir, modifierProfil, att, eff, RECORDS, RECORD, records, initRecords, lancerMission, arreterMission, missions:M => G(M).missions, MAX_MISSIONS, PROFILS, candidats, rapports:M => G(M).rapports || {}};
})(typeof window !== 'undefined' ? window : globalThis);
