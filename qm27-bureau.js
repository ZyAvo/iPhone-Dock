// mon-ecran-version: 1c46b714
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
const club = (M, id) => M.clubs[id] || (M.reserve && M.reserve[id]);   // v106 : club sorti du jeu (palmarès)
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;
const nomJ = j => Q().nomJ(j);
const monClub = M => M.manager && M.manager.club ? club(M, M.manager.club) : null;
const G = M => M.bureau || (M.bureau = {rec:{ligues:{}, clubs:{}}, serie:{}, missions:[]});
const copie = o => JSON.parse(JSON.stringify(o));

/* ================= Entraînement programmable ================= */
/* v127 : six séances collectives (préparation physique, travail technique, apprentissage tactique, cohésion, mise en place, récupération) ;
   « vol » et « balle » (avant v127) restent lisibles dans les programmes déjà enregistrés, mais ne sont plus proposées */
const SEANCES = [
  ['physique', 'Préparation physique', 'Endurance, vitesse, force (bien plus efficace en août)', {Physique:1}],
  ['technique', 'Travail technique', 'Vol, passes, tirs, frappes, arrêts', {Vol:0.5, Balle:0.5, Gardien:1}],
  ['tactique', 'Apprentissage tactique', 'Les joueurs apprennent ton système de jeu (maîtrise tactique)', {Mental:0.6}],
  ['cohesion', 'Cohésion', 'Jeux d\'équipe et vie de groupe : cohésion et moral', {Mental:0.3}],
  ['match', 'Mise en place', 'Préparer le prochain adversaire : bonus pour ce match', {Mental:0.3, Balle:0.3, Gardien:0.3}],
  ['recup', 'Récupération', 'Soins, bains chauds, repos : la fatigue baisse, pas de progrès', {}],
];
const SEANCES_ANCIENNES = [['vol', 'Vol', 'Pilotage, virages, piqués', {Vol:1}], ['balle', 'Balle', 'Passes, tirs, frappes, arrêts', {Balle:1, Gardien:1}]];
const SEANCE = Object.fromEntries([...SEANCES, ...SEANCES_ANCIENNES].map(s => [s[0], s]));
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
/* [id, nom, attributs ciblés, attributs de gardien ciblés] */
const ATELIERS = {
  P:[['tirs', 'Tirs aux anneaux', ['tir', 'pre', 'san'], []], ['passes', 'Jeu de passes', ['pas', 'rec', 'vis'], []], ['duels', 'Duels', ['bou', 'int', 'for'], []]],
  B:[['frappe', 'Frappe', ['fra', 'for', 'agr'], []], ['protection', 'Protection', ['ant', 'pla', 'con'], []], ['volserre', 'Vol serré', ['vir', 'equ', 'pil'], []]],
  A:[['pique', 'Piqués', ['piq', 'vit', 'acc'], []], ['lynx', 'Œil de lynx', ['acu', 'con', 'ant'], []], ['duel', 'Duel d\'attrapeurs', ['bou', 'equ', 'san'], []]],
  G:[['arrets', 'Arrêts', ['ref'], ['arr', 'cou_a']], ['sorties', 'Sorties', ['agi'], ['sor', 'com']], ['relance', 'Relance', ['pas', 'vis'], ['rel']]],
};
const MODELES = {
  foncier:{nom:'Foncier', jours:['physique', 'physique', 'technique', 'physique', 'recup'], int:3},
  presaison:{nom:'Pré-saison', jours:['physique', 'technique', 'cohesion', 'physique', 'tactique'], int:2},
  type:{nom:'Semaine type', jours:['technique', 'tactique', 'physique', 'technique', 'match'], int:2},
  technique:{nom:'Travail technique', jours:['technique', 'technique', 'physique', 'technique', 'match'], int:3},
  tactique:{nom:'Tactique', jours:['tactique', 'technique', 'tactique', 'match', 'recup'], int:2},
  groupe:{nom:'Esprit de groupe', jours:['cohesion', 'technique', 'tactique', 'cohesion', 'match'], int:2},
  recup:{nom:'Récupération', jours:['recup', 'technique', 'cohesion', 'recup', 'match'], int:1},
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
  let recup = 0, tac = 0, cohJ = 0, mep = 0;
  for (const d of p.jours){ const s = SEANCE[d] || SEANCE.recup; for (const [f, w] of Object.entries(s[3])) part[f] += w / 5; if (d === 'recup') recup += 0.2; if (d === 'tactique') tac += 0.2; if (d === 'match'){ tac += 0.05; mep++; } if (d === 'cohesion') cohJ += 0.2; }
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
  const coh = Math.round((tac * 1.5 + cohJ * 4 + eff(M, 'tac') * 0.06) * 100) / 100;   // v127 : la séance « cohésion » soude bien plus que la tactique
  /* v127 : maîtrise tactique (gain de la semaine avant le frein près de 100) et mise en place (bonus du prochain match, 0,8 % par séance, 1,6 % au plus) */
  const maitrise = Math.round((1.5 + tac * 14 + eff(M, 'tac') * 0.15) * (1 + 0.1 * Math.max(0, QMC.niv(c, 'salle') - 2)) * 10) / 10;
  return {mix, int:i, boost, fat, risque:1 - recup, coh, recup, jeunes:1 + eff(M, 'jeu') * 0.015, maitrise, mep:Math.min(2, mep) * 0.008, moral:cohJ * 6};
}
/* lu par l'entraînement (qm27-club.js) pour le club du joueur */
function programme(M, c, S){ return effets(M, c, programmeDe(M, c, M.semaine), S); }
/* ================= v127 : maîtrise tactique, mise en place, entraînement individuel ================= */
/* ================= v152 : maîtrise par élément, plans de jeu (presets), managers de l'ordinateur ================= */
/* La maîtrise porte sur le système de jeu : chaque option (« sans:pressing », « zone:couloirs »…) a sa propre maîtrise, de 0 à 100.
   La maîtrise d'une tactique = moyenne pondérée des options qu'elle utilise (EQ.maitrise.poids) : changer une option ne coûte que
   l'écart sur cette option, rien n'est remis à zéro. Le rythme, la prise de risque, l'agressivité, la cible des cognards, l'attrapeur
   et le gardien sont des consignes du jour : libres, sans maîtrise. */
const MT = EQ.maitrise, SYSTEME = Object.keys(MT.poids);
const OPTIONS = {passes:['court', 'long'], sans:['pressing', 'zone', 'repli'], avec:['triangle', 'ligne', 'pointe'], batAvec:['escorte', 'devant'], batSans:['protection', 'harcelement'], zone:['axe', 'couloirs', 'loin']};
const CLES_T = ['rythme', 'risque', 'agressivite', 'passes', 'sans', 'avec', 'batAvec', 'batSans', 'zone', 'cible', 'attrapeur', 'vifMode', 'gardien'];
const r1 = x => Math.round(x * 10) / 10;
const tac = T => Q().completerTactique({...(T || {})});
const pareil = (a, b) => String(a) === String(b);
function carteVide(v0, T, v){ const el = {}; for (const k of SYSTEME) for (const o of OPTIONS[k]) el[k + ':' + o] = v0; if (T) for (const k of SYSTEME) el[k + ':' + T[k]] = v; return el; }
/* maîtrise du club (créée ou convertie depuis l'ancienne forme {v, T} d'avant v152) ; m.v = maîtrise de la tactique actuelle */
function maitrise(M, c){
  let m = c.maitrise;
  if (!m || !m.el){ const T = tac(c.tactique), v = m && typeof m.v === 'number' ? m.v : MT.depart;
    m = c.maitrise = {el:carteVide(Math.min(MT.autre, v), T, v)}; }   // avant v152 : une seule maîtrise pour tout le système
  for (const k of SYSTEME) for (const o of OPTIONS[k]) if (m.el[k + ':' + o] == null) m.el[k + ':' + o] = MT.autre;
  m.v = r1(Q().maitriseDe(m.el, tac(c.tactique)));
  return m;
}
const maitrisePlan = (M, c, T) => r1(Q().maitriseDe(maitrise(M, c).el, tac(T)));
const maitriseOption = (M, c, k, o) => SYSTEME.includes(k) ? Math.round(maitrise(M, c).el[k + ':' + o] ?? MT.autre) : null;
/* coût en maîtrise d'un changement de consigne (négatif = perte), sur la tactique T */
const coutChangement = (M, c, T, k, o) => SYSTEME.includes(k) ? r1(maitrisePlan(M, c, {...T, [k]:o}) - maitrisePlan(M, c, T)) : 0;

/* --- plans de jeu du joueur : 3 presets enregistrables --- */
const PRESETS_DEFAUT = T => [
  {nom:'Plan A', T:tac(T)},
  {nom:'Bloc bas', T:tac({...T, sans:'repli', batSans:'protection', batAvec:'escorte', passes:'court', avec:'triangle', risque:1, rythme:2})},
  {nom:'Pressing', T:tac({...T, sans:'pressing', batSans:'harcelement', batAvec:'devant', passes:'long', avec:'ligne', zone:'couloirs', rythme:3})}];
function presets(M, c){
  if (!c.presets || c.presets.length !== 3){ c.presets = PRESETS_DEFAUT(tac(c.tactique)); c.presetActif = 0; }
  if (!(c.presetActif >= 0 && c.presetActif < 3)) c.presetActif = 0;
  if (c.presetTravail == null) c.presetTravail = 'actif';
  return c.presets;
}
/* consignes où la tactique actuelle s'écarte du preset actif : [[clé, valeur du preset, valeur actuelle]] */
function ecartsPreset(M, c){ const P = presets(M, c)[c.presetActif].T, T = tac(c.tactique); return CLES_T.filter(k => !pareil(P[k], T[k])).map(k => [k, P[k], T[k]]); }
function choisirPreset(M, i){ const c = monClub(M); if (!c || !(i >= 0 && i < 3)) return; presets(M, c); c.presetActif = i; c.tactique = tac(copie(c.presets[i].T)); }
function enregistrerPreset(M, i){ const c = monClub(M); if (!c) return; presets(M, c); if (i == null) i = c.presetActif; c.presets[i].T = tac(copie(c.tactique)); c.presetActif = i; }
function renommerPreset(M, i, nom){ const c = monClub(M); if (!c) return; presets(M, c); nom = String(nom || '').trim().slice(0, 18); if (nom) c.presets[i].nom = nom; }
function choisirTravail(M, v){ const c = monClub(M); if (!c) return; presets(M, c); c.presetTravail = v === 'tous' || v === 'actif' ? v : (+v >= 0 && +v < 3 ? +v : 'actif'); }
/* plan(s) travaillé(s) à l'entraînement : [[tactique, part du gain]] */
function plansTravailles(M, c){
  const P = presets(M, c), t = c.presetTravail;
  if (t === 'tous') return P.map(p => [p.T, 0.55]);
  const i = t === 'actif' ? c.presetActif : t; return [[P[i].T, 1]];
}
/* apprentissage d'une semaine : options du (des) plan(s) travaillé(s) au plein gain, options des autres plans et de la tactique du moment
   au gain secondaire, options oubliées qui s'érodent doucement (jusqu'au plancher) */
function apprendre(el, plans, autres, g){
  const vise = {}, vu = new Set();
  for (const [T, part] of plans) for (const k of SYSTEME){ const o = k + ':' + T[k]; vise[o] = Math.max(vise[o] || 0, part); }
  for (const T of autres) for (const k of SYSTEME) vu.add(k + ':' + T[k]);
  for (const o of Object.keys(el)){
    const v = el[o], frein = Math.max(0, 1 - v / 115);
    if (vise[o]) el[o] = Math.min(100, v + g * vise[o] * frein);
    else if (vu.has(o)) el[o] = Math.min(100, v + g * MT.secondaire * frein);
    else if (v > MT.plancher) el[o] = Math.max(MT.plancher, v - MT.erosion);
    el[o] = r1(el[o]);
  }
}
/* après la semaine d'entraînement du club du joueur : apprentissage, mise en place pour le prochain match, moral des séances de cohésion */
function apresEntrainement(M, c, P){
  const m = maitrise(M, c), L = presets(M, c);
  apprendre(m.el, plansTravailles(M, c), [...L.map(p => p.T), tac(c.tactique)], P.maitrise);
  m.v = r1(Q().maitriseDe(m.el, tac(c.tactique)));
  c.mep = P.mep ? {k:M.semaine + 1, v:P.mep} : null;
  if (P.moral) for (const id of c.effectif){ const j = M.joueurs[id]; if (j) j.moral = Math.min(100, j.moral + P.moral * (j.moral < 60 ? 1 : 0.5)); }
}
/* bonus de match (lu par equipeClub) : carte de maîtrise (le moteur calcule celle du plan joué, même après un changement au temps mort) ;
   mise en place la semaine du match (club du joueur) */
function bonusMatch(M, c){
  const m = maitrise(M, c);
  return {mEl:{...m.el}, mep:estJoueur(M, c) && c.mep && c.mep.k === M.semaine ? c.mep.v : 0};
}

/* --- les tactiques jouées, match après match (ce que les adjoints de tous les clubs observent) --- */
const HIST_K = ['sans', 'avec', 'zone', 'passes', 'batAvec', 'batSans', 'rythme', 'risque', 'agressivite', 'cible', 'attrapeur', 'gardien'], HIST_N = 8;
/* une tactique jouée = 12 chiffres (rang de chaque valeur dans HIST_O) : sauvegarde légère */
const HIST_O = {...OPTIONS, rythme:[1, 2, 3], risque:[1, 2, 3], agressivite:[1, 2, 3], cible:['poursuiveur', 'attrapeur', 'gardien'], attrapeur:['gagnant', 'chasse', 'marquage'], gardien:['anneaux', 'sortie']};
const coder = T => HIST_K.map(k => Math.max(0, HIST_O[k].findIndex(o => pareil(o, T[k])))).join('');
const decoder = h => Object.fromEntries(HIST_K.map((k, i) => [k, HIST_O[k][+h[i]] ?? HIST_O[k][0]]));
function noterTactique(M, m, X){
  if (!X || m.ligue === 'sixn') return;
  for (const k of [0, 1]){ const c = M.clubs[X.e[k].id]; if (!c) continue; const T = tac(X.e[k].tactique);
    (c.histT = c.histT || []).push(coder(T)); if (c.histT.length > HIST_N) c.histT.splice(0, c.histT.length - HIST_N); }
}
/* le jeu habituel d'un club : pour chaque consigne, la valeur la plus jouée et sa fréquence ({T, freq:{clé:[n, sur]}, n}) */
function habitude(M, c){
  const H = (c.histT || []).map(h => typeof h === 'string' ? decoder(h) : {}), T = {}, freq = {};
  const base = !estJoueur(M, c) && c.plansIA ? plansDe(M, c)[0] : tac(c.tactique);
  HIST_K.forEach((k, i) => {
    if (!H.length){ T[k] = base[k]; return; }
    const n = {}; for (const h of H) n[h[k]] = (n[h[k]] || 0) + 1;
    const [v, x] = Object.entries(n).sort((a, b) => b[1] - a[1])[0]; T[k] = /^\d$/.test(v) ? +v : v; freq[k] = [x, H.length];
  });
  return {T:tac({...base, ...T}), freq, n:H.length};
}

/* --- managers de l'ordinateur : un style, des plans adaptés à l'effectif, des choix de match plus ou moins justes --- */
const NOMS_STYLE = {pressing:'pressing', zone:'défense de zone', repli:'bloc bas'};
function coach(M, c){
  if (c.coach) return c.coach;
  const r = rng(M, 'coach', c.id, c.coachN || 0), base = borne(0.25 + (c.rep - 40) / 90, 0.15, 0.85);
  const pref = {}; for (const k of SYSTEME) if (r() < 0.45) pref[k] = r.choix(OPTIONS[k]);   // ses idées : quelques options qu'il aime
  c.coach = {pref, rythme:r.choix([1, 2, 2, 3]), agr:r.choix([1, 2, 2, 3]), risque:r.choix([1, 2, 2, 3]),
    lecture:r1(borne(base + r.gauss() * 0.15, 0.1, 0.95)),   // lit-il bien l'adversaire ?
    prudence:r1(borne(0.5 + r.gauss() * 0.22, 0.05, 0.95)), // se replie-t-il contre plus fort ?
    erreur:r1(borne(0.55 - base * 0.5 + r.gauss() * 0.12, 0.05, 0.6)), // ses choix à côté de la plaque
    fidele:r1(borne(0.5 + r.gauss() * 0.2, 0.1, 0.9))};     // tient-il à son plan ?
  return c.coach;
}
/* convenance d'une option pour un groupe de joueurs (écart moyen des attributs demandés au niveau du poste) */
function convient(M, ids, k, o){
  const QT = root.QMT; if (!QT || !QT.DEMANDE || !QT.ecart) return 0; const d = QT.DEMANDE[k] && QT.DEMANDE[k][o]; if (!d) return 0;
  const L = ids.map(([id, p]) => [M.joueurs[id], p]).filter(([j, p]) => j && d[0].includes(p));
  return L.length ? L.reduce((s, [j, p]) => s + QT.ecart(j, p, d[1]), 0) / L.length : 0;
}
const idsCompo = K => K ? ['P', 'B', 'A', 'G'].flatMap(p => (K[p] || []).map(id => [id, p])) : [];
/* convenance moyenne de chaque option sur tous les clubs (une fois par saison) : un club choisit ce qui lui va MIEUX qu'aux autres */
let NORMES = null;
function normes(M){
  const cle = M.graine + ':' + M.saison; if (NORMES && NORMES.cle === cle) return NORMES.v;
  const v = {}, L = Object.values(M.clubs).map(c => idsCompo(c.compo)).filter(x => x.length);
  for (const k of SYSTEME) for (const o of OPTIONS[k]) v[k + ':' + o] = L.length ? L.reduce((t, ids) => t + convient(M, ids, k, o), 0) / L.length : 0;
  NORMES = {cle, v}; return v;
}
/* les plans d'un club de l'ordinateur, gardés en 12 chiffres chacun */
const plansDe = (M, c) => { if (!c.plansIA || typeof c.plansIA[0] !== 'string') construirePlans(M, c); return c.plansIA.map(h => tac(decoder(h))); };
/* les trois plans d'un club de l'ordinateur : son style (selon ses idées et son effectif), un plan prudent, un plan offensif */
function construirePlans(M, c){
  const K = c.compo || Q().compoAuto(M, c.id), ids = idsCompo(K), C = coach(M, c), r = rng(M, 'plans', c.id, M.saison, c.coachN || 0);
  const N = normes(M), choisir = (k, bonus) => OPTIONS[k].map(o => [o, (C.pref[k] === o ? 1 : 0) + (convient(M, ids, k, o) - (N[k + ':' + o] || 0)) * 0.8 + (bonus[o] || 0) + r.gauss() * C.erreur]).sort((a, b) => b[1] - a[1])[0][0];
  const g = M.joueurs[(K.G || [])[0]], sortie = g && g.g ? Q().ga(g, 'sor') - Q().ga(g, 'arr') : -3;
  const T0 = tac({rythme:C.rythme, risque:C.risque, agressivite:C.agr, cible:r.choix(['poursuiveur', 'poursuiveur', 'attrapeur', 'gardien']), attrapeur:'gagnant', gardien:sortie >= 1 ? 'sortie' : 'anneaux'});
  for (const k of SYSTEME) T0[k] = choisir(k, {});
  const T1 = tac({...T0, risque:1, rythme:Math.max(1, T0.rythme - 1), agressivite:Math.min(2, T0.agressivite)}); T1.sans = choisir('sans', {repli:1.2, zone:0.6}); T1.batSans = 'protection'; T1.batAvec = 'escorte';
  const T2 = tac({...T0, risque:3, rythme:3}); T2.sans = choisir('sans', {pressing:1.2}); T2.batSans = choisir('batSans', {harcelement:0.8}); T2.zone = choisir('zone', {loin:0.4, couloirs:0.4});
  c.plansIA = [T0, T1, T2].map(coder);
  /* maîtrise : son plan est bien rodé, les deux autres un peu moins */
  const m = c.maitrise && c.maitrise.el ? c.maitrise : (c.maitrise = {el:carteVide(MT.autre)});
  const v0 = borne(52 + C.lecture * 22 + (c.rep - 60) * 0.25 + r.gauss() * 6, 45, 92);
  for (const k of SYSTEME){ m.el[k + ':' + T0[k]] = Math.max(m.el[k + ':' + T0[k]] || 0, r1(v0));
    for (const T of [T1, T2]) m.el[k + ':' + T[k]] = Math.max(m.el[k + ':' + T[k]] || 0, r1(v0 - 12)); }
  c.tactique = tac(copie(T0));
  return [T0, T1, T2];
}
/* entraînement de l'ordinateur : il travaille son plan principal, un peu les deux autres */
function entrainementIA(M, c){
  if (estJoueur(M, c)) return; const L = plansDe(M, c);
  const m = maitrise(M, c), C = coach(M, c);
  apprendre(m.el, [[L[0], 1]], L.slice(1), MT.ia * (0.8 + C.lecture * 0.4));
}
/* note d'attrapeur et de gardien (pour juger un remplaçant) */
const noteS = j => j ? Q().note(j, 'A') / 5 : 0, noteG = j => j ? Q().note(j, 'G') / 5 : 0;   // sur 20
const meilleur = (M, c, poste, f) => Math.max(0, ...c.effectif.map(id => M.joueurs[id]).filter(j => j && j.poste === poste).map(f));
/* la tactique d'un club de l'ordinateur pour ce match (tirage propre au match : identique pour la radio, la prévision et le match) ;
   e : son équipe telle qu'alignée, adv / eAdv : l'adversaire. Renvoie {T, notes} (notes : ce qu'il a changé, pour l'analyse). */
function tactiqueMatch(M, c, e, adv, eAdv, m){
  const L = plansDe(M, c), C = coach(M, c), r = rng(M, 'tacIA', m.id, c.id), notes = [];
  const ecartRep = (adv.rep || 60) - c.rep;
  let i = 0;
  if (ecartRep > 8 && r() < C.prudence * (0.5 + ecartRep / 30)){ i = 1; notes.push('plan prudent contre plus fort'); }
  else if (ecartRep < -8 && r() < (1 - C.prudence) * (0.4 + -ecartRep / 40)){ i = 2; notes.push('plan offensif contre plus faible'); }
  const T = L[i];
  /* lecture de l'adversaire (son jeu habituel) : viser la faille de sa défense, protéger la nôtre */
  const H = habitude(M, adv).T, cz = Q().CONTRE[Q().sansDe(H)];
  if (T.zone !== cz && r() < C.lecture * (1 - C.fidele * 0.5)){ T.zone = cz; notes.push('zone d\'attaque contre leur défense'); }
  if (Q().CONTRE[T.sans] === H.zone && r() < C.lecture * 0.7){ T.sans = H.zone === 'axe' ? 'repli' : H.zone === 'couloirs' ? 'pressing' : 'zone'; notes.push('défense contre leur zone d\'attaque'); }
  /* l'effectif du jour : titulaires absents, joueurs usés */
  const g = M.joueurs[(e.G || [])[0]], s = M.joueurs[(e.A || [])[0]], so = M.joueurs[((eAdv || {}).A || [])[0]];
  if (g && meilleur(M, c, 'G', noteG) - noteG(g) > 1.5){ if (T.gardien === 'sortie') T.gardien = 'anneaux'; if (r() < 0.6 + C.lecture * 0.3){ T.batSans = 'protection'; } notes.push('gardien remplaçant : prudence devant les anneaux'); }
  else if (g && T.gardien === 'sortie' && g.g && Q().ga(g, 'sor') < 10) T.gardien = 'anneaux';
  if (s && so && noteS(so) - noteS(s) > 1.3 && r() < C.lecture){ if (r() < 0.5) T.attrapeur = 'marquage'; else T.cible = 'attrapeur'; notes.push('leur attrapeur est plus fort'); }
  else if (s && meilleur(M, c, 'A', noteS) - noteS(s) > 1.5 && r() < C.lecture){ T.attrapeur = 'marquage'; notes.push('attrapeur remplaçant : marquage'); }
  /* v155 : le rôle de l'attrapeur selon le duel (un attrapeur nettement plus faible joue plutôt pour l'équipe et reste dans le jeu) */
  if (s && so && e.roles && r() < C.lecture){ const d = noteS(s) - noteS(so), R = e.roles[s.id];
    if (d < -1.5 && R !== 'tacticien' && Q().qualiteRole(s, 'A', 'tacticien') >= 0.45){ e.roles = {...e.roles, [s.id]:'tacticien'}; notes.push('attrapeur tacticien contre plus fort'); }
    else if (d > 1.5 && R !== 'chasseur'){ e.roles = {...e.roles, [s.id]:'chasseur'}; notes.push('attrapeur en chasse contre plus faible'); }
    if (d < -2 && ['eclaireur', 'perturbateur'].includes(e.roles[s.id])){ T.vifMode = 'jeu'; notes.push('attrapeur qui reste dans le jeu'); } }
  const P = (e.P || []).map(id => M.joueurs[id]).filter(Boolean), ch = P.length ? P.reduce((t, j) => t + (j.charge || 0), 0) / P.length : 0;
  if (ch >= 55 && r() < 0.4 + C.lecture * 0.4){ if (T.rythme === 3) T.rythme = 2; if (T.sans === 'pressing') T.sans = 'zone'; notes.push('poursuiveurs fatigués : on ralentit'); }
  /* et parfois un choix à côté */
  if (r() < C.erreur * 0.35){ const k = r.choix(SYSTEME); T[k] = r.choix(OPTIONS[k]); }
  return {T:tac(T), notes};
}
/* ce que l'adjoint attend de l'adversaire pour la prévision (son jeu habituel, pas sa vraie tactique du jour) */
const attendue = (M, c) => habitude(M, c).T;
/* changement d'entraîneur d'un club de l'ordinateur (le joueur part, l'ordinateur reprend la main) */
function nouvelEntraineur(M, c){ c.coachN = (c.coachN || 0) + 1; delete c.coach; delete c.presets; construirePlans(M, c); }
/* en début de saison : les plans des clubs de l'ordinateur suivent leur nouvel effectif */
function plansSaison(M){ for (const c of Object.values(M.clubs)) if (!estJoueur(M, c)) construirePlans(M, c); }
const estJoueur = (M, c) => M.manager && M.manager.club === c.id;

/* entraînement individuel : un focus par joueur ; focus bonus (un deuxième) selon l'Aire d'envol ; nouveau poste sur au moins une saison */
const CAPACITES = [
  ['endurance', 'Endurance', ['end', 'res', 'det']], ['vitesse', 'Vitesse', ['vit', 'acc', 'agi']], ['force', 'Force', ['for', 'res', 'bou']],
  ['vol', 'Pilotage', ['pil', 'vir', 'equ', 'frm']], ['pique', 'Piqués', ['piq', 'acc', 'equ']], ['passes', 'Passes et réception', ['pas', 'rec', 'ctl']],
  ['tir', 'Tir et précision', ['tir', 'pre', 'san']], ['frappe', 'Frappe', ['fra', 'pre', 'for']], ['defense', 'Défense', ['int', 'ant', 'pla']],
  ['reflexes', 'Réflexes et acuité', ['ref', 'acu', 'con']], ['mental', 'Lecture du jeu', ['vis', 'dec', 'ant']], ['caractere', 'Caractère', ['san', 'cou', 'det', 'con']],
  ['arrets', 'Arrêts (gardien)', ['ref'], ['arr', 'cou_a']], ['sorties', 'Sorties et relance (gardien)', ['agi'], ['sor', 'rel', 'com']],
];
/* v155 : attributs travaillés par un focus de rôle = ceux du rôle (QMD.ROLE_DEF) ; attributs de gardien dans une liste à part */
const ROLE_ATTRS = Object.fromEntries(Object.entries(D.ROLE_DEF).map(([p, R]) => [p, Object.fromEntries(Object.entries(R).map(([r, d]) => {
  const k = Object.keys(d.at); return [r, [...k.filter(x => !x.startsWith('g:')), k.filter(x => x.startsWith('g:')).map(x => x.slice(2))]]; }))]));
const SEM_POSTE = 36;   // semaines d'entraînement (sans blessure) pour changer de poste : une saison entière
const bonusFocus = c => [0, 0, 1, 2, 3, 5][QMC.niv(c, 'aire')] || 0;
const focusDe = j => (j.focus || []).filter(Boolean);
/* attributs travaillés par un focus : {a:[index], g:[index], poste} */
function cibleFocus(j, F){
  if (F.t === 'cap'){ const C = CAPACITES.find(x => x[0] === F.k); return C ? {a:C[2].map(IDX), g:(C[3] || []).map(IDXG)} : null; }
  if (F.t === 'role'){ const L = (ROLE_ATTRS[j.poste] || {})[F.k]; if (!L) return null; return {a:L.filter(x => typeof x === 'string').map(IDX), g:(L.find(x => Array.isArray(x)) || []).map(IDXG)}; }
  if (F.t === 'poste'){ const w = Q().POIDS[F.k]; return {a:w.map((x, i) => x === 3 ? i : -1).filter(i => i >= 0), g:F.k === 'G' ? D.GARDIEN.map((x, i) => i) : [], poste:F.k}; }
  return null;
}
/* les focus actifs de chaque joueur du club (les focus bonus au-delà des places de l'Aire d'envol sont en pause) */
function focusActifs(M, c){
  let places = bonusFocus(c); const out = {};
  for (const id of c.effectif){ const j = M.joueurs[id]; if (!j) continue; const L = focusDe(j); if (!L.length) continue;
    const garde = L.length > 1 && places > 0 ? (places--, L.slice(0, 2)) : L.slice(0, 1);
    const cibles = garde.map(F => cibleFocus(j, F)).filter(Boolean);
    if (cibles.length) out[id] = {a:new Set(cibles.flatMap(x => x.a)), g:new Set(cibles.flatMap(x => x.g)), poste:(cibles.find(x => x.poste) || {}).poste || null, n:garde.length}; }
  return out;
}
function definirFocus(M, jid, rang, F){
  const c = monClub(M), j = M.joueurs[jid]; if (!c || !j || j.club !== c.id) return {ok:false, txt:'Joueur introuvable.'};
  const L = (j.focus || []).slice(0, 2);
  if (rang === 1 && !L[0] && F) return {ok:false, txt:'Choisis d\'abord son focus principal.'};
  if (rang === 1 && F && !L[1]){
    const pris = c.effectif.filter(id => id !== jid && focusDe(M.joueurs[id] || {}).length > 1).length;
    if (pris >= bonusFocus(c)) return {ok:false, txt:bonusFocus(c) ? `Toutes les places de focus bonus sont prises (${bonusFocus(c)} avec l'Aire d'envol au niveau ${QMC.niv(c, 'aire')}).` : 'Pas de focus bonus : il faut l\'Aire d\'envol au niveau 2.'};
  }
  if (F && F.t === 'poste'){
    if (F.k === j.poste) return {ok:false, txt:'C\'est déjà son poste.'};
    if (L.some((x, i) => x && x.t === 'poste' && i !== rang)) return {ok:false, txt:'Il apprend déjà un nouveau poste.'};
    if (!j.reconv || j.reconv.p !== F.k) j.reconv = {p:F.k, sem:0};
    if (F.k === 'G' && !j.g) j.g = D.GARDIEN.map(() => 3 + Math.round(((j.a[IDX('ref')] || 8) + (j.a[IDX('agi')] || 8)) / 8));
  }
  const ancien = L[rang]; L[rang] = F || null;
  if (rang === 0 && !F) L[1] = null;
  if (ancien && ancien.t === 'poste' && !(F && F.t === 'poste')) j.reconv = null;
  j.focus = L.filter((x, i) => x || i === 0).slice(0, 2); if (!j.focus.some(Boolean)) delete j.focus;
  return {ok:true};
}
/* fin de semaine pour un joueur du club : fatigue des focus, apprentissage d'un nouveau poste */
function apresFocus(M, c, j, A){
  if (!A) return 0;
  if (A.poste && j.reconv && j.reconv.p === A.poste && !j.bless){
    j.reconv.sem++;
    if (j.reconv.sem >= SEM_POSTE){
      const de = j.poste; j.poste = A.poste; j.reconv = null; j.focus = focusDe(j).filter(F => F.t !== 'poste'); if (!j.focus.length) delete j.focus;
      if (c.compo){ for (const p of ['P', 'B', 'A', 'G']) c.compo[p] = (c.compo[p] || []).filter(x => x !== j.id); c.compo.banc = (c.compo.banc || []).filter(x => x !== j.id); c.compo.banc.push(j.id); QMC.reparerCompo(M, c); }
      Q().message(M, `${nomJ(j)} change de poste`, `Après une saison de travail, ${nomJ(j)} passe de ${D.POSTES[de].nom.toLowerCase()} à ${D.POSTES[j.poste].nom.toLowerCase()}. Il est sur le banc : à toi de le placer.`, 'staff');
    }
  }
  return 1.5 * A.n;
}
/* courbe de la saison : la note au poste de chaque joueur, une fois par semaine */
function noterCourbes(M, c){
  const S = c.courbes && c.courbes.saison === M.saison ? c.courbes : (c.courbes = {saison:M.saison, n:{}});
  for (const id of c.effectif){ const j = M.joueurs[id]; if (!j) continue; const L = S.n[id] || (S.n[id] = []); L.push(Math.round(Q().note(j, j.poste) * 10) / 10); if (L.length > 60) L.shift(); }
  for (const id of Object.keys(S.n)) if (!c.effectif.includes(id)) delete S.n[id];
}

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

/* ================= v97 : réunion de début de saison avec le président =================
   On y fixe ensemble l'objectif, la philosophie (une ou deux), l'enveloppe des transferts et la limite de la masse salariale.
   Le président fait une offre ; le manager peut viser plus haut ou plus bas, choisir la philosophie, déplacer de l'argent entre
   transferts et salaires, et demander un effort (+10 à +30 %). Trois propositions refusées : le président impose son plan.
   Sans réunion avant le premier match de championnat, il fixe seul son plan. Les philosophies sont jugées en fin de saison. */
const PALIERS = [1, 3, 6, 10, 13, 16];
const TXT_OBJ = {1:'Gagner le championnat', 3:'Finir sur le podium', 6:'Finir dans les 6 premiers', 10:'Finir dans la première moitié', 13:'Finir 13e ou mieux', 16:'Progresser et lancer des jeunes'};
const PHILOS = {
  jeunes:['Faire jouer les jeunes', 'Au moins trois joueurs de 21 ans ou moins avec 8 matchs ou plus'],
  nationaux:['Miser sur les joueurs du pays', 'La moitié des matchs joués par des joueurs de la nation du club'],
  spectacle:['Un jeu spectaculaire', 'Une des 4 meilleures attaques du championnat'],
  economie:['Des comptes à l\'équilibre', 'Finir la saison avec au moins le solde de départ'],
  stars:['Attirer une vedette', 'Recruter un joueur de premier plan (note 72 ou plus)'],
};
const prefPresident = (M, c) => { const L = c.rep >= 78 ? ['stars', 'spectacle'] : c.rep <= 55 ? ['jeunes', 'economie'] : ['nationaux', 'spectacle', 'jeunes', 'economie']; return L[Math.abs(Q().melange(c.id, M.saison, 'philo')) % L.length]; };
function offreInitiale(M){
  const U = monClub(M), o = Q().objectif(M, U.id);
  return {vise:o.vise, philo:[prefPresident(M, U)], env:Math.max(0, Math.round(U.budget * 0.4 / 5000) * 5000), masse:U.masseMax, rep:0, effort:0};
}
function reunion(M){
  const U = monClub(M); if (!U) return null;
  const g = G(M);
  if (!g.reunion || g.reunion.club !== U.id || (g.reunion.saison !== M.saison && !g.reunion.fin)) g.reunion = {saison:M.saison, club:U.id, fin:false, tours:0, tard:!g.reunion || g.reunion.club !== U.id};
  if (g.reunion.saison !== M.saison) return null;   // réunion d'une autre saison : rien à faire avant la prochaine
  if (!g.reunion.offre) g.reunion.offre = offreInitiale(M);
  else if (!g.reunion.fin) g.reunion.offre.masse = Math.max(g.reunion.offre.masse, U.masseMax);   // v125 : une réunion ouverte avant un relèvement du plafond (mise à jour v113) en profite
  return g.reunion;
}
const matchsJoues = (M, U) => { const T = M.tables[U.ligue] && M.tables[U.ligue][U.id]; return T ? (T.j ?? ((T.g || 0) + (T.n || 0) + (T.p || 0))) : 0; };
/* une proposition → montants qui en découlent */
function chiffrer(M, prop){
  const R = reunion(M), o = R.offre, U = monClub(M);
  const crans = PALIERS.indexOf(o.vise) - PALIERS.indexOf(prop.vise);   // > 0 : plus ambitieux que le président
  const k = (1 + 0.1 * Math.max(-2, Math.min(2, crans))) * (1 + prop.effort);
  const glisse = prop.rep * 0.12 * o.env;   // rep > 0 : de l'enveloppe des transferts vers les salaires
  const env = Math.max(0, Math.round((o.env * k - glisse) / 5000) * 5000), masse = Math.round((o.masse * k + glisse / EQ.eco.semaines) / 500) * 500;
  return {env, masse, crans};
}
function proposer(M, prop){
  const R = reunion(M); if (!R || R.fin) return {ok:false, txt:'Pas de réunion en cours.'};
  const U = monClub(M), mg = M.manager, o = R.offre, ch = chiffrer(M, prop);
  const pref = prefPresident(M, U), aimePhilo = prop.philo.includes(pref);
  let s = 0.68 + 0.07 * ch.crans + (aimePhilo ? 0.1 : -0.04) + (prop.philo.length === 2 ? 0.04 : 0) + (mg.confiance - 60) / 220 + ((mg.rep || 50) - 50) / 400
    - prop.effort * 1.0 - Math.abs(prop.rep) * 0.03 - 0.03 * R.tours;
  R.tours++;
  const raisons = [];
  if (prop.effort >= 0.2) raisons.push('tu demandes beaucoup d\'argent');
  if (ch.crans < 0) raisons.push('l\'objectif lui paraît timide');
  if (!aimePhilo) raisons.push(`il tient à « ${PHILOS[pref][0].toLowerCase()} »`);
  if (s >= 0.5){ conclure(M, prop, ch, false); return {ok:true, accord:true, txt:`Marché conclu. Le président serre la main : « ${s >= 0.7 ? 'Voilà un plan qui me plaît.' : 'Va pour ça, mais je compte sur toi.'} »`}; }
  if (R.tours >= 3){ conclure(M, {...o, rep:0, effort:0}, chiffrer(M, {...o, rep:0, effort:0}), true); mg.confiance = Math.max(0, mg.confiance - 3);
    return {ok:true, accord:true, impose:true, txt:'Le président perd patience et impose son plan initial. Confiance −3.'}; }
  return {ok:true, accord:false, txt:`Le président refuse${raisons.length ? ' : ' + raisons.join(', ') : ''}. Il te reste ${3 - R.tours} proposition${3 - R.tours > 1 ? 's' : ''}.`, humeur:s};
}
function conclure(M, prop, ch, impose){
  const R = G(M).reunion, U = monClub(M), mg = M.manager;
  R.fin = true; R.accord = {vise:prop.vise, philo:prop.philo.slice(), env:ch.env, masse:ch.masse, impose:!!impose}; R.budget0 = U.budget; R.star = false;
  mg.objectif = {vise:prop.vise, txt:TXT_OBJ[prop.vise]}; mg.philo = prop.philo.slice();
  U.enveloppe = ch.env; U.masseMax = ch.masse;
  if (!impose && ch.crans > 0) mg.confiance = Math.min(100, mg.confiance + 2);
  Q().message(M, impose ? 'Le président a fixé le plan de la saison' : 'Réunion avec le président : accord', `Objectif : ${TXT_OBJ[prop.vise].toLowerCase()}. Philosophie : ${prop.philo.map(k => PHILOS[k][0].toLowerCase()).join(' et ')}. Enveloppe des transferts : ${QMC.euros(ch.env)} (la moitié des ventes s'y ajoute). Masse salariale : ${QMC.euros(ch.masse)} par semaine au plus.`, 'pres');
}
function accepterOffre(M){ const R = reunion(M); if (!R || R.fin) return {ok:false, txt:'Pas de réunion en cours.'}; const o = {...R.offre, rep:0, effort:0}; conclure(M, o, chiffrer(M, o), false); return {ok:true, accord:true, txt:'Tu acceptes son plan. Le président hoche la tête : « Au travail. »'}; }
function imposerSiTrop(M){
  const g = G(M), R = g.reunion, U = monClub(M);
  if (!U || !R || R.fin || R.tard || R.saison !== M.saison || R.club !== U.id) return;
  if (matchsJoues(M, U) >= 1){ const o = R.offre || offreInitiale(M); R.offre = o; conclure(M, {...o, rep:0, effort:0}, chiffrer(M, {...o, rep:0, effort:0}), true); }
}
/* bilan des philosophies en fin de saison */
function bilanPhilos(M){
  const R = G(M).reunion, U = monClub(M), mg = M.manager; if (!R || !R.fin || !R.accord || R.saison !== M.saison || !U || R.club !== U.id) return;
  const eff = U.effectif.map(id => M.joueurs[id]).filter(Boolean), res = [];
  for (const k of R.accord.philo){
    let ok = false;
    if (k === 'jeunes') ok = eff.filter(j => j.age <= 21 && j.saison && j.saison.m >= 8).length >= 3;
    if (k === 'nationaux'){ const t = eff.reduce((a, j) => a + (j.saison ? j.saison.m : 0), 0), n = eff.filter(j => j.nat === U.nat).reduce((a, j) => a + (j.saison ? j.saison.m : 0), 0); ok = t > 0 && n / t >= 0.5; }
    if (k === 'spectacle'){ const L = M.ligues[U.ligue].clubs.map(id => [id, (M.tables[U.ligue][id] || {}).pm || 0]).sort((a, b) => b[1] - a[1]); ok = L.findIndex(x => x[0] === U.id) < 4; }
    if (k === 'economie') ok = U.budget >= (R.budget0 || 0);
    if (k === 'stars') ok = !!R.star;
    mg.confiance = Math.max(0, Math.min(100, mg.confiance + (ok ? 5 : -5))); mg.rep = Math.max(1, Math.min(100, Math.round(((mg.rep || 50) + (ok ? 0.5 : 0)) * 10) / 10));
    res.push(`${ok ? '✓' : '✗'} ${PHILOS[k][0]} (${PHILOS[k][1].toLowerCase()})`);
  }
  if (res.length) Q().message(M, 'Le président juge la philosophie de la saison', res.join('\n') + '\n\nChaque engagement tenu : confiance +5. Chaque engagement manqué : confiance −5.', 'pres');
}
/* achat d'une vedette : noté pour la philosophie « stars » */
function noterAchat(M, j, montant){
  const R = G(M).reunion, U = monClub(M); if (!R || !U || j.club !== U.id) return;
  if (U.enveloppe != null && montant) U.enveloppe = Math.max(0, U.enveloppe - montant);
  if (Q().note(j) >= 72) R.star = true;
}

/* ================= Branchements ================= */
const base = {semaine:QMC.semaine, avantSaison:QMC.avantSaison, apresSaison:QMC.apresSaison, migrer:QMC.migrer, prixClub:QMC.prixClub, exigenceJoueur:QMC.exigenceJoueur, accepterPoste:QMC.accepterPoste};
Object.assign(QMC, {
  apresBascule(M){ const g = G(M); g.missions = g.missions.filter(x => (x.type !== 'club' || M.clubs[x.cible]) && (x.type !== 'ligue' || M.ligues[x.cible])); },   // v106 : missions vers un club sorti ou une ancienne ligue
  semaine(M, S){
    base.semaine(M, S);
    initRecords(M); recordsSemaine(M, S); missionsSemaine(M); imposerSiTrop(M);
    const U = monClub(M), p = M.manager ? profil(M) : null;
    if (U && p){
      if (!p.fige && S.matchs.some(m => m.res && m.ligue !== 'sixn' && (m.dom === U.id || m.ext === U.id))){ p.fige = true;
        while (p.pool > 0){ const k = ATTR_MGR.map(a => a[0]).sort((x, y) => p.attrs[x] - p.attrs[y])[0]; p.attrs[k]++; p.pool--; } }   // points pas placés : vers les attributs les plus faibles
      const h = eff(M, 'hum'); if (h) for (const id of U.effectif){ const j = M.joueurs[id]; if (j) j.moral = borne(j.moral + h * 0.3, 5, 100); }
      const d = eff(M, 'det'); if (d > 0 && M.manager.confiance < 50) M.manager.confiance = Math.min(100, Math.round((M.manager.confiance + d * 0.15) * 10) / 10);
    }
  },
  avantSaison(M, r){ initRecords(M); recordsSaison(M); evolutionManager(M, r); lignesCarriere(M); bilanPhilos(M);
    const U = monClub(M); if (U && U.plan) U.plan.sem = {};
    base.avantSaison(M, r); },
  apresSaison(M, r){
    base.apresSaison(M, r);
    { const U = monClub(M); if (U){ delete U.enveloppe; G(M).reunion = {saison:M.saison, club:U.id, fin:false, tours:0};
      Q().message(M, 'Réunion de début de saison', 'Le président t\'attend dans son bureau pour fixer l\'objectif, la philosophie et les budgets de la saison. Sans réunion avant le premier match de championnat, il décidera seul.', 'pres'); } }
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
    if (v < 12){   // v155 : les anciens rôles (équilibré, protecteur, chasseur de batteur…) sont remplacés au mieux ; focus de rôle disparus retirés
      for (const c of Object.values(M.clubs)) if (c.compo) Q().rolesAuto(M, c.compo, true);
      if (M.sel && M.sel.compo) Q().rolesAuto(M, M.sel.compo, true);
      for (const j of Object.values(M.joueurs)) if (j.focus){ j.focus = j.focus.filter(F => !F || F.t !== 'role' || (ROLE_ATTRS[j.poste] || {})[F.k]); if (!j.focus.some(Boolean)) delete j.focus; }
      if (M.manager) Q().message(M, 'QM27 : rôles, synergies et vif d\'or', 'Le jeu change en profondeur. Le vif d\'or vaut maintenant 80 points : la meilleure équipe gagne plus souvent, mais une équipe menée de plus de 8 buts ne se sauve plus en l\'attrapant. Il y a vingt rôles (meneur, ailier, pivot, escorteur, briseur, ange gardien, éclaireur, leurre, relanceur…) et chacun agit vraiment : l\'attrapeur joue avant l\'apparition du vif, les batteurs protègent, cognent ou couvrent. Certains rôles s\'associent en synergies (« Passe décisive », « L\'enclume et le marteau »…). Chaque joueur a des badges bronze, argent ou or dans les rôles qui lui vont, l\'entraînement peut viser un rôle et le mercato chercher par rôle. Les rôles de ton équipe ont été réattribués : vérifie-les dans la Tactique. Enfin, chaque joueur a sa forme du jour, et les matchs à enjeu révèlent certains caractères : les surprises existent.', 'staff'); }
    if (M.manager && v < 11){ const U = monClub(M); if (U){ maitrise(M, U); presets(M, U); }
      Q().message(M, 'QM27 : plans de jeu et maîtrise tactique', 'Tu as maintenant trois plans de jeu enregistrables (écran Tactique) : ton système actuel est devenu « Plan A », et deux plans de départ t\'attendent (« Bloc bas » et « Pressing ») que tu peux régler, renommer et enregistrer. La maîtrise se compte désormais option par option : changer une consigne ne coûte que l\'écart sur cette option, rien n\'est remis à zéro. Les séances d\'apprentissage tactique travaillent le plan choisi dans l\'Entraînement. La maîtrise pèse plus en match (environ 7 victoires sur 100 entre un plan maîtrisé à 30 % et à 90 %). En face, chaque entraîneur a son style, adapte son plan à son effectif, à ses absents et à ce qu\'il sait de toi, avec plus ou moins de réussite : ton adjoint ne connaît plus que leur jeu habituel.', 'staff'); }
    if (M.manager && v < 10) Q().message(M, 'QM27 : plus de marge pour recruter', `Les droits TV augmentent, surtout pour les petits clubs : recettes plus fortes et plafond de masse salariale relevé (${QMC.euros(monClub(M) ? monClub(M).masseMax : 0)} par semaine pour ton club). Une belle saison fait aussi monter la réputation du club plus vite (jusqu'à +6). Les âges des joueurs et les retraites sont plus réguliers d'une saison à l'autre. Nouveau : les installations s'usent. À la fin de chaque saison, un bâtiment peut perdre un niveau, d'autant plus souvent qu'il est haut (rien au niveau 1, 2 % au niveau 2, jusqu'à 14 % au niveau 5) : il faut réinvestir pour rester au sommet. Et chaque club a une stature : sa réputation revient doucement vers elle, mais des saisons brillantes la font monter pour de bon.`, 'pres');
    if (M.manager && v < 9) Q().message(M, 'QM27 : nouveau taux des Gallions, recruteur et causeries', 'Le Gallion suit maintenant le canon (environ 5 livres) : 1 Gallion = 17 Mornilles = 493 Noises. Tes finances n\'ont pas changé, seul l\'affichage change : une place vaut 2 ou 3 Gallions, ton budget se compte en centaines de milliers de Gallions. Clubs et joueurs › Recherche par profil : le recruteur cherche un attrapeur, un batteur, des jeunes, des bonnes affaires… et t\'envoie un rapport chaque mois. Dix discours pour les causeries, vitesse ×0,5 et statistiques en direct pendant les matchs. Nouveau : la réunion de début de saison avec le président (objectif, philosophie, enveloppe des transferts et masse salariale, à négocier) ; tu peux la tenir dès maintenant pour cette saison.', 'staff');
    if (M.manager && v < 8) Q().message(M, 'QM27 : Gallions, presse et carrières', 'La monnaie des sorciers arrive : Gallions (or), Mornilles (argent) et Noises (bronze). 1 Gallion = 17 Mornilles, 1 Mornille = 29 Noises. Les conférences de presse passent à trois questions, posées par plusieurs médias selon le match et la saison ; chaque réponse a un ton et des effets (groupe, joueur, président, supporters, réputation, relation avec la presse). Les notes ne gonflent plus de saison en saison : les potentiels trop généreux ont été ramenés à un niveau réaliste, et les salaires des stars montent moins vite au-dessus de 75. Les clubs gardent désormais leurs meilleurs joueurs en fin de contrat. Chaque fiche joueur a son historique de carrière (à partir de cette saison).', 'club');
    if (M.manager && v < 7) Q().message(M, 'Nouveautés de QM27 : le domaine et le bureau', 'Accueil Club : une carte du domaine à toucher (vestiaire, stade, tour du directeur, Gringotts, zone technique, Poudlard, salle des trophées). Calendrier par mois et par saison. Entraînement programmable avec ton adjoint. Ton profil de manager (avatar, attributs, contrat). Records du club et du championnat. Le Tournoi des Six Emblèmes se joue désormais pendant le championnat dès la saison prochaine : les internationaux manquent les matchs de leur club.', 'club');
    M.v = Q().VERSION; },
  prixClub(M, j){ const v = base.prixClub(M, j), U = monClub(M); return U && j.club !== U.id ? Math.round(v * (1 - eff(M, 'neg') * 0.008) / 5000) * 5000 : v; },
  exigenceJoueur(M, j, U){ const e = base.exigenceJoueur(M, j, U); if (e && e.sal && monClub(M) === U) e.sal = Math.round(e.sal * (1 - eff(M, 'neg') * 0.005) / 50) * 50; return e; },
  accepterPoste(M, id){ const r = base.accepterPoste(M, id); if (r && r.ok){ profil(M); const g = G(M); g.reunion = null; reunion(M); } return r; },
});
/* l'expérience du manager : causeries plus efficaces (motivation) ; les jeunes progressent plus vite via effets().jeunes */
if (root.QMH){ const ca = root.QMH.causerie; root.QMH.causerie = (M, X, eq, ton, moment) => { const r = ca(M, X, eq, ton, moment); const p = M.manager && M.manager.profil; if (p){ p.xp.causeries = (p.xp.causeries || 0) + 1; if (r && typeof r.delta === 'number') r.delta = Math.round(r.delta * (1 + eff(M, 'mot') * 0.04) * 100) / 100; } return r; };
  const eh = root.QMH.envoyerHibou; root.QMH.envoyerHibou = (M, o) => { const r = eh(M, o); const p = M.manager && M.manager.profil; if (p && r && r.ok) p.xp.transferts = (p.xp.transferts || 0) + 1; return r; }; }
root.QMG = {SEANCES_ANCIENNES, maitrise, apresEntrainement, bonusMatch, SYSTEME, OPTIONS, CLES_T, maitrisePlan, maitriseOption, coutChangement, presets, ecartsPreset, choisirPreset, enregistrerPreset, renommerPreset, choisirTravail, plansTravailles, noterTactique, habitude, coach, construirePlans, plansDe, entrainementIA, tactiqueMatch, attendue, nouvelEntraineur, plansSaison, NOMS_STYLE, CAPACITES, ROLE_ATTRS, SEM_POSTE, bonusFocus, focusDe, cibleFocus, focusActifs, definirFocus, apresFocus, noterCourbes, SEANCES, SEANCE, JOURS, ATELIERS, MODELES, plan, programmeDe, programmeAuto, definirSemaine, definirModele, modeAuto, effets, programme, apercu, fatigueTitulaires,
  ATTR_MGR, profil, repartir, modifierProfil, att, eff, RECORDS, RECORD, records, initRecords, reunion, proposer, accepterOffre, chiffrer, offreInitiale, prefPresident, PHILOS, PALIERS, TXT_OBJ, noterAchat, lancerMission, arreterMission, missions:M => G(M).missions, MAX_MISSIONS, PROFILS, candidats, rapports:M => G(M).rapports || {}};
})(typeof window !== 'undefined' ? window : globalThis);
