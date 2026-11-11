// mon-ecran-version: c55fb853
/* QM27 (v96) — analyse tactique, sans affichage. Expose window.QMT. Chargé après qm27.js (et les modules du club).
   - EFFETS : ce que change chaque consigne (lu dans le moteur, qm27.js › pas, vifDor), en tendances de −2 à +2.
   - adequation : un joueur est-il fait pour sa place, son rôle et les consignes demandées ? (vert / orange / rouge, avec les raisons)
   - rapport : le rapport de l'adjoint sur le prochain adversaire (tactique, forme, joueurs clés, rapports de force ligne par ligne, conseils).
   - simuler / comparer : l'adjoint joue le match en coulisses (mêmes tirages pour chaque variante) pour estimer l'effet d'un choix.
   - analyse : après le match, ce qui a marché ou non, relié aux choix tactiques. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ;
const Q = () => root.QM;
const at = (j, k) => k.startsWith('g:') ? (j.g ? Q().ga(j, k.slice(2)) : 8) : Q().at(j, k);
const moy = L => L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- Effets des consignes ---------- */
/* axes : [libellé, sens (+1 : plus c'est mieux, −1 : moins c'est mieux, 0 : neutre)] */
const AXES = {
  tirs:['Tirs', 1], precision:['Précision', 1], pertes:['Pertes de balle', -1], recup:['Ballons récupérés', 1],
  tirsAdv:['Tirs adverses', -1], precisionAdv:['Précision adverse', -1], cognards:['Nos cognards', 1], subis:['Cognards subis', -1],
  fautes:['Fautes', -1], blessAdv:['Blessures adverses', 1], fatigue:['Fatigue', -1], vif:['Vif d\'or', 1], vifAdv:['Vif d\'or adverse', -1],
  risque:['Risque de tout perdre', -1], duree:['Match plus long', 0],
};
/* [clé, libellé, groupe, explication, options [valeur, libellé, effets, détail chiffré]] */
const CONS = [
  ['rythme', 'Rythme', 'jeu', 'Le tempo des attaques. Plus vite : plus de tirs mais plus de ballons perdus et une fatigue qui monte d\'un quart par cran.', [
    [1, 'Lent', {tirs:-1, pertes:-1, fatigue:-2}, 'Tirs −5 pts, pertes −4 pts, fatigue −25 %'],
    [2, 'Normal', {}, 'Référence'],
    [3, 'Rapide', {tirs:1, pertes:1, fatigue:2}, 'Tirs +5 pts, pertes +4 pts, fatigue +25 %']]],
  ['risque', 'Prise de risque', 'jeu', 'Tirer dès qu\'une fenêtre s\'ouvre, ou attendre la bonne position. Une équipe qui prend des risques se découvre aussi.', [
    [1, 'Faible', {tirs:-1, precision:1, tirsAdv:-1}, 'Tirs −4 pts, précision +2 pts, tirs adverses −2 pts'],
    [2, 'Normale', {}, 'Référence'],
    [3, 'Élevée', {tirs:1, precision:-1, tirsAdv:1}, 'Tirs +4 pts, précision −2 pts, tirs adverses +2 pts']]],
  ['agressivite', 'Agressivité', 'jeu', 'L\'engagement des batteurs et des poursuiveurs. Dure : plus de cognards réussis et de blessures chez l\'adversaire, mais beaucoup plus de fautes, donc de penalties.', [
    [1, 'Calme', {cognards:-1, fautes:-2, blessAdv:-1}, 'Cognards −25 %, fautes −60 %'],
    [2, 'Normale', {}, 'Référence'],
    [3, 'Dure', {cognards:1, fautes:2, blessAdv:1}, 'Cognards +25 %, fautes +60 %, blessures adverses +30 %']]],
  ['passes', 'Jeu de passes', 'jeu', 'Court : on construit, les tirs sont mieux préparés. Long : on va vite vers les anneaux, on tire plus mais moins bien.', [
    ['court', 'Court', {tirs:-1, precision:1}, 'Tirs −3 pts, précision +2 pts'],
    ['long', 'Long', {tirs:1, precision:-1}, 'Tirs +3 pts, précision −2 pts']]],
  ['avec', 'Poursuiveurs avec le souafle', 'avec', 'La disposition des trois poursuiveurs quand on attaque.', [
    ['triangle', 'Triangle', {}, 'Référence : équilibré'],
    ['ligne', 'Ligne', {tirs:1, precision:-1, pertes:-1}, 'Tirs +3 pts, précision −2 pts, pertes −3 pts'],
    ['pointe', 'Pointe', {precision:1, pertes:1}, 'Tirs −1 pt, précision +3 pts, pertes +4 pts']]],
  ['batAvec', 'Batteurs avec le souafle', 'avec', 'Où se placent nos batteurs quand on attaque.', [
    ['escorte', 'Escorte', {subis:-1}, 'Cognards subis −10 %'],
    ['devant', 'Devant', {subis:1, precision:1}, 'Cognards subis +10 %, gardien adverse gêné (−3 %)']]],
  ['zone', 'Zone d\'attaque', 'avec', 'Où l\'on cherche à tirer. Chaque défense craint une zone : le pressing craint l\'axe, la zone craint les couloirs, le repli craint les tirs de loin (+3 pts de précision quand on vise la bonne).', [
    ['axe', 'Axe', {tirs:-1, precision:1}, 'Tirs −2 pts, précision +2 pts ; idéal contre le pressing'],
    ['couloirs', 'Couloirs', {}, 'Tirs +1 pt, précision −1 pt ; idéal contre la zone'],
    ['loin', 'De loin', {tirs:1, precision:-1}, 'Tirs +3 pts, précision −3 pts ; idéal contre le repli']]],
  ['sans', 'Poursuiveurs sans le souafle', 'sans', 'Comment on défend. Le pressing récupère vite mais fatigue et laisse des espaces dans le dos.', [
    ['pressing', 'Pressing', {tirsAdv:-1, recup:1, precisionAdv:1, fatigue:1}, 'Tirs adverses −3 pts, récupérations +5 pts, précision adverse +2 pts, fatigue +15 % ; craint l\'axe'],
    ['zone', 'Zone', {}, 'Référence ; craint les couloirs'],
    ['repli', 'Repli', {precisionAdv:-1, recup:-1}, 'Précision adverse −2 pts, récupérations −2 pts ; craint les tirs de loin']]],
  ['batSans', 'Batteurs sans le souafle', 'sans', 'Nos batteurs quand l\'adversaire attaque.', [
    ['protection', 'Protection', {cognards:-1, precisionAdv:-1}, 'Nos cognards −10 %, précision adverse −1,5 pt'],
    ['harcelement', 'Harcèlement', {cognards:1, precisionAdv:1}, 'Nos cognards +12 %, précision adverse +1 pt']]],
  ['cible', 'Cible des cognards', 'bat', 'Sur qui nos batteurs frappent quand un cognard part.', [
    ['poursuiveur', 'Poursuiveurs', {recup:1}, 'Le porteur lâche le souafle'],
    ['attrapeur', 'Attrapeur', {vifAdv:-1}, 'Leur attrapeur est sonné une minute (deux fois moins de chances sur le vif)'],
    ['gardien', 'Gardien', {precision:1, recup:1}, 'Leur gardien est sonné 2 min (−25 %) et on récupère le souafle']]],
  ['attrapeur', 'Attrapeur', 'bat', 'Le choix clé. Attraper le vif d\'or rapporte 150 points et termine le match : si l\'on est mené de plus de 150 points, l\'attraper fait perdre.', [
    ['gagnant', 'Si ça fait gagner', {}, 'Laisse filer le vif quand le prendre ferait perdre'],
    ['chasse', 'Chasse', {vif:1, risque:2}, 'Prend le vif dès que possible, même si cela fait perdre'],
    ['marquage', 'Marquage', {vif:-1, vifAdv:-1, duree:1}, 'Colle l\'attrapeur adverse : nos chances −40 %, les siennes −35 % (−45 % si notre attrapeur est tacticien). Utile quand nos poursuiveurs sont meilleurs.']]],
  ['gardien', 'Gardien', 'bat', 'Rester sur ses anneaux ou sortir au-devant du porteur.', [
    ['anneaux', 'Aux anneaux', {}, 'Référence'],
    ['sortie', 'Sortir', {tirsAdv:-1, precisionAdv:1}, 'Tirs adverses −3 pts, mais buts plus faciles s\'il est passé (+3 pts)']]],
];
const CONS_PAR = Object.fromEntries(CONS.map(c => [c[0], c]));
const option = (k, v) => { const c = CONS_PAR[k]; return c ? c[4].find(o => String(o[0]) === String(v)) : null; };
/* liste [libellé, valeur (−2..2), bon (true/false/null)] des effets d'une option */
function effets(k, v){
  const o = option(k, v); if (!o) return [];
  return Object.entries(o[2]).map(([a, n]) => [AXES[a][0], n, AXES[a][1] === 0 ? null : n * AXES[a][1] > 0]);
}

/* ---------- Adéquation joueur / place / rôle / consignes ---------- */
const BASE = {P:['pas', 'rec', 'tir', 'pre', 'ctl', 'int', 'bou', 'vis', 'vit', 'acc'], B:['fra', 'pre', 'for', 'ant', 'agr', 'pla', 'vit'],
  A:['vit', 'acc', 'piq', 'acu', 'san', 'con', 'vir', 'dec'], G:['g:arr', 'g:cou_a', 'g:sor', 'ref', 'agi', 'pla']};
const ROLE_ATTR = {
  P:{polyvalent:['pas', 'tir', 'int', 'vit'], meneur:['pas', 'vis', 'ctl', 'equi'], finisseur:['tir', 'pre', 'san'], harceleur:['int', 'bou', 'ant', 'agr']},
  B:{equilibre:['fra', 'ant', 'pla'], protecteur:['ant', 'pla', 'for'], chasseur:['fra', 'agr', 'pre']},
  A:{equilibre:['vit', 'acu', 'piq', 'dec'], chasseur:['vit', 'acc', 'piq'], tacticien:['dec', 'san', 'ant', 'acu']},
  G:{equilibre:['g:arr', 'ref', 'g:cou_a'], ligne:['g:arr', 'g:cou_a', 'ref'], libero:['g:sor', 'agi', 'g:rel']},
};
/* ce que chaque consigne demande, par poste : [postes, attributs, ce qui coince] */
const DEMANDE = {
  rythme:{3:['PBA', ['end'], 'rythme rapide : manque d\'endurance']},
  sans:{pressing:['P', ['end', 'vit', 'acc'], 'pressing : endurance et vitesse justes'], repli:['P', ['pla', 'ant'], 'repli : placement et anticipation justes'], zone:['P', ['pla', 'int'], 'défense de zone : placement et interceptions justes']},
  avec:{ligne:['P', ['tir', 'pre'], 'ligne : tir et précision justes'], pointe:['P', ['ctl', 'frm', 'pas'], 'pointe : contrôle et jeu en formation justes'], triangle:['P', ['frm', 'pas'], 'triangle : jeu en formation juste']},
  passes:{long:['P', ['pas', 'vis'], 'jeu long : passe et vision justes'], court:['P', ['pas', 'rec'], 'jeu court : passe et réception justes']},
  zone:{loin:['P', ['tir', 'pre'], 'tirs de loin : tir et précision justes'], couloirs:['P', ['vit', 'vir'], 'couloirs : vitesse et virages justes'], axe:['P', ['ctl', 'bou'], 'axe : contrôle et bousculade justes']},
  agressivite:{3:['PB', ['con'], 'jeu dur : peu de concentration, gare aux fautes']},
  batAvec:{devant:['B', ['vit', 'fra'], 'batteur devant : vitesse et frappe justes'], escorte:['B', ['pla', 'ant'], 'escorte : placement et anticipation justes']},
  batSans:{harcelement:['B', ['agr', 'fra'], 'harcèlement : agressivité et frappe justes'], protection:['B', ['pla', 'ant'], 'protection : placement et anticipation justes']},
  cible:{attrapeur:['B', ['pre'], 'viser l\'attrapeur : précision de frappe juste'], gardien:['B', ['pre'], 'viser le gardien : précision de frappe juste']},
  attrapeur:{chasse:['A', ['vit', 'acc'], 'chasse : vitesse et accélération justes'], marquage:['A', ['ant', 'dec'], 'marquage : anticipation et décisions justes'], gagnant:['A', ['dec', 'san'], 'attente du bon moment : décisions et sang-froid justes']},
  gardien:{sortie:['G', ['g:sor', 'agi'], 'sorties : sorties et agilité justes'], anneaux:['G', ['g:arr', 'g:cou_a'], 'sur sa ligne : arrêts et couverture justes']},
};
const ecart = (j, poste, L) => moy(L.map(k => at(j, k))) - moy(BASE[poste].map(k => at(j, k)));
function adequation(j, poste, role, T){
  if (!j || !poste) return null;
  const raisons = [], plus = [];
  const roles = ROLE_ATTR[poste] || {}, r = roles[role] ? ecart(j, poste, roles[role]) : 0;
  const meilleur = Object.entries(roles).map(([k, L]) => [k, ecart(j, poste, L)]).sort((a, b) => b[1] - a[1])[0];
  const nomRole = k => ((D.ROLES[poste] || []).find(x => x[0] === k) || [, k])[1];
  if (roles[role] && r < -1.2) raisons.push(`rôle ${nomRole(role).toLowerCase()} peu naturel${meilleur && meilleur[0] !== role ? ` (plutôt ${nomRole(meilleur[0]).toLowerCase()})` : ''}`);
  else if (roles[role] && r >= 1) plus.push(`fait pour le rôle ${nomRole(role).toLowerCase()}`);
  const ec = [];
  if (T) for (const [k, M] of Object.entries(DEMANDE)){ const d = M[String(T[k])]; if (!d || !d[0].includes(poste)) continue;
    const e = ecart(j, poste, d[1]); ec.push(e); if (e < -1.5) raisons.push(d[2]); }
  let score = (roles[role] ? r : 0) * 0.55 + (ec.length ? moy(ec) : 0) * 0.45;
  const hors = j.poste !== poste; if (hors){ score -= 3; raisons.unshift(`joue hors de son poste (${D.POSTES[j.poste].nom.toLowerCase()})`); }
  const ch = j.charge || 0; if (T && ch >= 60 && (T.rythme === 3 || (poste === 'P' && T.sans === 'pressing'))){ score -= 0.8; raisons.push(`chargé (${Math.round(ch)}) : ce rythme va l'user`); }
  const niveau = score >= 0.2 && !hors ? 'bon' : score >= -1.1 && !hors ? 'moyen' : 'faible';
  return {niveau, score:Math.round(score * 10) / 10, raisons, plus, meilleurRole:meilleur ? meilleur[0] : role, roles:Object.fromEntries(Object.entries(roles).map(([k, L]) => [k, Math.round(ecart(j, poste, L) * 10) / 10]))};
}
/* adéquation de toute une composition : {id: résultat} */
function adequationCompo(M, K, T){
  const R = {}; if (!K) return R;
  for (const p of ['P', 'B', 'A', 'G']) for (const id of K[p] || []){ const j = M.joueurs[id]; if (j) R[id] = adequation(j, p, (K.roles || {})[id], T); }
  return R;
}

/* ---------- Le prochain adversaire ---------- */
function prochainMatch(M){
  const c = M.manager && M.manager.club; if (!c) return null;
  for (let i = M.semaine; i < M.calendrier.length; i++){ const m = (M.calendrier[i].matchs || []).find(x => x.ligue !== 'sixn' && (x.dom === c || x.ext === c) && !x.res); if (m) return {m, S:M.calendrier[i]}; }
  return null;
}
/* les deux équipes telles qu'elles seront au coup d'envoi, sans rien modifier dans la partie (T : notre tactique à essayer) */
function equipesPrevues(M, m, T){
  const camp = Q().campPour(M, m); if (!camp || m.ligue === 'sixn') return null;
  const garde = {}, ids = [m.dom, m.ext];
  for (const id of ids){ const c = M.clubs[id]; garde[id] = c.compo; c.compo = id === camp ? JSON.parse(JSON.stringify(c.compo || null)) : Q().compoAuto(M, id); }
  try {
    if (M.clubs[camp].compo) Q().verifierCompo(M, camp); else M.clubs[camp].compo = Q().compoAuto(M, camp);
    const E = Q().equipesPour(M, m), k = m.dom === camp ? 0 : 1;
    if (T) E[k].tactique = Q().completerTactique({...E[k].tactique, ...T});
    return {E, k};
  } finally { for (const id of ids) M.clubs[id].compo = garde[id]; }
}
function rapport(M, m, Sem){
  const P = equipesPrevues(M, m); if (!P) return null;
  const W = Sem || Q().semaine(M) || {date:Date.now()}, {E, k} = P, X = Q().creerMatch(M, E[0], E[1], Q().grainePour(M, m), {texte:false, date:W.date, meteo:Q().meteoPrevue(M, m, W)});
  const F = [Q().forces(X, 0), Q().forces(X, 1)], nous = F[k], eux = F[1 - k], adv = M.clubs[E[1 - k].id], To = Q().completerTactique({...E[1 - k].tactique}), Tn = Q().completerTactique({...E[k].tactique});
  const r1 = x => Math.round(x * 10) / 10;
  const lignes = [['Notre attaque', r1(nous.A), r1(eux.D)], ['Notre défense', r1(nous.D), r1(eux.A)], ['Batteurs', r1(nous.B), r1(eux.B)], ['Gardiens', r1(nous.G), r1(eux.G)], ['Attrapeurs', r1(nous.S), r1(eux.S)]];
  const tit = Q().titulaires(E[1 - k]).map(id => M.joueurs[id]).filter(Boolean);
  const cles = tit.map(j => ({j, n:Q().note(j, ['P', 'B', 'A', 'G'].find(p => E[1 - k][p].includes(j.id)))})).sort((a, b) => b.n - a.n).slice(0, 3);
  const T = M.tables[adv.ligue] && M.tables[adv.ligue][adv.id], CL = Q().classement(M, adv.ligue);
  const conseils = [], sd = Q().sansDe(To), cz = Q().CONTRE[sd];
  const nomO = (cle, v) => (option(cle, v) || [, String(v)])[1];
  if (Tn.zone !== cz) conseils.push([`Ils défendent en ${nomO('sans', sd).toLowerCase()} : attaque ${cz === 'axe' ? 'par l\'axe' : cz === 'couloirs' ? 'par les couloirs' : 'de loin'} (+3 pts de précision).`, 'zone', cz]);
  else conseils.push([`Bonne lecture : ta zone d'attaque (${nomO('zone', cz).toLowerCase()}) vise la faille de leur ${nomO('sans', sd).toLowerCase()}.`, null, null]);
  if (Q().CONTRE[Tn.sans] === To.zone) conseils.push([`Ils attaquent ${To.zone === 'axe' ? 'par l\'axe' : To.zone === 'couloirs' ? 'par les couloirs' : 'de loin'}, la zone que craint ton ${nomO('sans', Tn.sans).toLowerCase()}. ${To.zone === 'axe' ? 'Le repli' : To.zone === 'couloirs' ? 'Le pressing' : 'La zone'} les gênerait davantage.`, 'sans', To.zone === 'axe' ? 'repli' : To.zone === 'couloirs' ? 'pressing' : 'zone']);
  if (eux.S - nous.S > 0.8 && Tn.attrapeur !== 'marquage' && Tn.cible !== 'attrapeur') conseils.push([`Leur attrapeur est plus fort que le nôtre (${r1(eux.S)} contre ${r1(nous.S)}) : vise-le avec les cognards ou fais-le marquer.`, 'cible', 'attrapeur']);
  else if (nous.S - eux.S > 0.8 && Tn.attrapeur === 'marquage') conseils.push(['Notre attrapeur est le plus rapide : le marquage le bride, laisse-le chercher le vif.', 'attrapeur', 'gagnant']);
  if (eux.A - nous.D > 1 && Tn.sans !== 'repli') conseils.push([`Leurs poursuiveurs sont nettement au-dessus de notre défense : le repli limite la casse.`, 'sans', 'repli']);
  else if (nous.D - eux.A > 1 && Tn.sans !== 'pressing') conseils.push(['Leur attaque est faible : un pressing nous rendrait le souafle plus vite.', 'sans', 'pressing']);
  if (eux.B - nous.B > 1 && Tn.batAvec !== 'escorte') conseils.push(['Leurs batteurs frappent fort : garde les nôtres en escorte du porteur.', 'batAvec', 'escorte']);
  if (To.agressivite === 3) conseils.push(['Ils jouent dur : attends-toi à des penalties, vérifie ton tireur.', null, null]);
  if (To.gardien === 'sortie' && Tn.passes !== 'court') conseils.push(['Leur gardien sort beaucoup : le jeu court le prend à revers.', 'passes', 'court']);
  if (nous.G < eux.G - 1 && Tn.gardien === 'sortie') conseils.push(['Notre gardien n\'est pas un spécialiste des sorties : reste aux anneaux.', 'gardien', 'anneaux']);
  return {adv, m, dom:m.dom === adv.id, T:To, forme:T ? T.forme.slice() : [], rang:CL.findIndex(l => l.id === adv.id) + 1, nb:CL.length, cles, lignes, conseils:conseils.slice(0, 5), meteo:X.meteo};
}

/* ---------- L'adjoint joue le match en coulisses ---------- */
/* n matchs avec les mêmes graines pour chaque variante : un écart vient du choix, pas du hasard */
function simuler(M, m, T, n, depart, Sem){
  const P = equipesPrevues(M, m, T); if (!P) return null;
  const {E, k} = P, S = {n:0, v:0, nul:0, d:0, pour:0, contre:0, vif:0, ecart:0, tirs:0, tirsAdv:0, fat:0};
  const W = Sem || Q().semaine(M) || {date:Date.now()}, meteo = Q().meteoPrevue(M, m, W);
  for (let i = 0; i < n; i++){
    const e0 = JSON.parse(JSON.stringify(E[0])), e1 = JSON.parse(JSON.stringify(E[1]));
    const X = Q().creerMatch(M, e0, e1, Q().melange(M.graine, m.id, 'adjoint', (depart || 0) + i), {texte:false, meteo, date:W.date});
    Q().jusquAuBout(X);
    const a = X.score[k], b = X.score[1 - k]; S.n++; S.pour += a; S.contre += b; S.ecart += a - b; if (a > b) S.v++; else if (a === b) S.nul++; else S.d++; if (X.vif === k) S.vif++;
    S.tirs += X.stats[k].tirs; S.tirsAdv += X.stats[1 - k].tirs;
    const tit = Q().titulaires(X.e[k]); S.fat += moy(tit.map(id => X.fat[id] || 0));
  }
  return S;
}
const resumeSim = S => S && S.n ? {n:S.n, victoire:Math.round(S.v / S.n * 100), nul:Math.round(S.nul / S.n * 100), pour:Math.round(S.pour / S.n), contre:Math.round(S.contre / S.n),
  ecart:Math.round(S.ecart / S.n), vif:Math.round(S.vif / S.n * 100), tirs:Math.round(S.tirs / S.n), tirsAdv:Math.round(S.tirsAdv / S.n), fat:Math.round(S.fat / S.n)} : null;
/* variantes à essayer pour l'adjoint : une consigne à la fois */
function variantes(T){
  const L = [];
  for (const k of ['zone', 'sans', 'avec', 'rythme', 'attrapeur', 'batSans', 'cible', 'risque'])
    for (const o of CONS_PAR[k][4]) if (String(o[0]) !== String(T[k])) L.push({k, v:o[0]});
  return L;
}

/* ---------- Prévision exacte (sans hasard) ----------
   Les probabilités de chaque pas de 15 s viennent du moteur (QM.probas) ; on en tire la possession, les tirs et les buts attendus,
   la course au vif d'or et la durée probable. Comparer deux tactiques donne l'effet net d'une consigne contre cet adversaire. */
function contexteMatch(M, m, Sem){
  const P = equipesPrevues(M, m); if (!P) return null;
  const W = Sem || Q().semaine(M) || {date:Date.now()};
  const X = Q().creerMatch(M, P.E[0], P.E[1], Q().grainePour(M, m), {texte:false, date:W.date, meteo:Q().meteoPrevue(M, m, W)});
  X.jour = [1, 1];   // forme du jour : neutre pour une prévision
  return {X, k:P.k, T0:Q().completerTactique({...P.E[P.k].tactique})};
}
function estimerX(X, k, T){
  const garde = X.e[k].tactique, fat0 = {...X.fat}; X.e[k].tactique = Q().completerTactique({...T});
  /* fatigue moyenne sur le match : celle de la mi-match (environ 140 pas), selon le rythme et le pressing de chaque équipe */
  for (const kk of [0, 1]){ const mult = Q().multFatigue(X.e[kk].tactique); for (const id of Q().titulaires(X.e[kk])){ const j = X.M.joueurs[id]; if (j) X.fat[id] = Math.min(100, (X.fat[id] || 0) + 140 * mult * (1.6 - Q().at(j, 'end') / 20)); } }
  try {
    const L = [0, 1].map(a => {
      const Fa = Q().forces(X, a), Fd = Q().forces(X, 1 - a), p = Q().probas(X, a, Fa, Fd), e = X.e[a];
      const W = Q().poidsTireurs(X, a), sw = W.reduce((t, w) => t + w[1], 0) || 1, Tq = W.reduce((t, [id, w]) => t + w * Q().qualiteTir(X, a, id), 0) / sw;
      const G = Fd.G * (Fa.T.batAvec === 'devant' ? 0.97 : 1), pBut = borne(EQ.baseBut + EQ.kBut * (Tq - G) + p.dBut, EQ.butMin, EQ.butMax);
      const pen = e.pen && e.P.includes(e.pen) ? e.pen : (W.sort((x, y) => y[1] - x[1])[0] || [])[0], pPen = pen ? borne(EQ.penalty + 0.02 * (Q().qualiteTir(X, a, pen) - Fd.G), 0.4, 0.9) : EQ.penalty;
      const c = p.pCog, f = (1 - c) * p.pFaute, t = (1 - c) * (1 - p.pFaute) * p.pTir, n = (1 - c) * (1 - p.pFaute) * (1 - p.pTir);
      const reste = (Fd.T.cible === 'attrapeur' ? c : 0) + t * (1 - pBut) * 0.3 + n * (1 - p.tourne);
      return {buts:f * pPen + t * pBut, tirs:f + t, fautesAdv:f, pBut, reste, pCog:c, F:Fa};
    });
    const q = L.map(x => 1 - x.reste), part = [q[1] / (q[0] + q[1]), q[0] / (q[0] + q[1])];
    /* course au vif d'or */
    const vif = [0, 1].map(kk => { const e = X.e[kk], T_ = e.tactique, To = X.e[1 - kk].tactique, S = L[kk].F.S;
      let v = EQ.p0 * (S / EQ.vifRef) * (1 + (e.vifBonus || 0));
      const rs = Q().role(X, kk, e.A[0]), ro = Q().role(X, 1 - kk, X.e[1 - kk].A[0]), sj = X.M.joueurs[e.A[0]];
      if (rs === 'chasseur') v *= 1.12; if (Q().aManie(sj, 'feinte')) v *= 1.06; if (Q().aManie(sj, 'oeil')) v *= 1.04;
      if (T_.attrapeur === 'marquage') v *= 0.6; if (To.attrapeur === 'marquage') v *= ro === 'tacticien' ? 0.55 : 0.65;
      if (To.cible === 'attrapeur') v *= 1 - 0.5 * Math.min(0.9, part[kk] * L[kk].pCog * 12);   // notre attrapeur sonné quand on attaque
      return v; });
    const ps = vif[0] + vif[1];
    let tv = 20; for (let i = 0; i < 6; i++) tv = 1 / (ps * 4 * (1 + tv / 60)) ;   // minutes entre l'apparition et la prise
    const duree = (EQ.vifApparitionMin + EQ.vifApparitionMax) / 2 + (X.meteo === 'brouillard' ? 6 : 0) + Math.min(170, tv * 1.15);
    const pas = duree * 4, o = 1 - k;
    const r = {pour:part[k] * L[k].buts * pas, contre:part[o] * L[o].buts * pas, tirs:part[k] * L[k].tirs * pas, tirsAdv:part[o] * L[o].tirs * pas,
      possession:part[k] * 100, vif:vif[k] / ps * 100, duree, fatigue:Q().multFatigue(X.e[k].tactique) / EQ.fatigue * 100,
      precision:L[k].pBut * 100, precisionAdv:L[o].pBut * 100};
    r.ecart = (r.pour - r.contre) * EQ.points.but + EQ.points.vif * (2 * r.vif / 100 - 1);
    return r;
  } finally { X.e[k].tactique = garde; X.fat = fat0; }
}
/* prévision avec la tactique T, et effet de chaque autre option (une consigne à la fois) */
function prevoir(ctx, T){
  const base = estimerX(ctx.X, ctx.k, T), opts = {};
  for (const c of CONS){ opts[c[0]] = {}; for (const o of c[4]){ if (String(o[0]) === String(T[c[0]])) continue;
    const v = estimerX(ctx.X, ctx.k, {...T, [c[0]]:o[0]}); opts[c[0]][o[0]] = {pour:v.pour - base.pour, contre:v.contre - base.contre, vif:v.vif - base.vif, ecart:v.ecart - base.ecart, fatigue:v.fatigue - base.fatigue, duree:v.duree - base.duree}; } }
  const meilleurs = Object.entries(opts).flatMap(([k, O]) => Object.entries(O).map(([v, d]) => ({k, v:isNaN(+v) ? v : +v, ...d}))).filter(x => x.ecart > 4 && !(x.k === 'attrapeur' && x.v === 'chasse')).sort((a, b) => b.ecart - a.ecart);
  const vus = new Set(), conseils = []; for (const x of meilleurs){ if (vus.has(x.k)) continue; vus.add(x.k); conseils.push(x); if (conseils.length >= 3) break; }
  return {base, opts, conseils};
}

/* ---------- Après le match ---------- */
function analyse(M, X){
  if (!X || !X.fini) return [];
  const k = X.joueur, o = 1 - k, T = Q().completerTactique({...X.e[k].tactique}), To = Q().completerTactique({...X.e[o].tactique}), S = X.stats, L = [];
  const nomO = (cle, v) => ((option(cle, v) || [, String(v)])[1]).toLowerCase();
  const d = X.score[k] - X.score[o], xb = Math.round((S[k].xb || 0) * 10) / 10, xbo = Math.round((S[o].xb || 0) * 10) / 10;
  const vir = x => String(x).replace('.', ',');
  L.push(['info', `Occasions : ${S[k].tirs} tirs (${vir(xb)} buts attendus) contre ${S[o].tirs} (${vir(xbo)}). Buts : ${S[k].buts} contre ${S[o].buts}.`]);
  if (S[k].tirs) { const p = Math.round(S[k].buts / S[k].tirs * 100), pa = S[o].tirs ? Math.round(S[o].buts / S[o].tirs * 100) : 0;
    if (S[k].buts > xb + 2) L.push(['bon', `Finition au-dessus des attentes (${p} % de réussite) : nos tireurs étaient dans un grand jour.`]);
    else if (S[k].buts < xb - 2) L.push(['mauvais', `Finition en dessous des attentes (${p} % de réussite contre ${pa} % en face).`]); }
  const sd = Q().sansDe(To), cz = Q().CONTRE[sd];
  if (T.zone === cz) L.push(['bon', `Attaquer ${T.zone === 'axe' ? 'par l\'axe' : T.zone === 'couloirs' ? 'par les couloirs' : 'de loin'} contre leur ${nomO('sans', sd)} : bonne lecture, nos tirs étaient mieux placés.`]);
  else L.push(['mauvais', `Leur ${nomO('sans', sd)} craignait ${cz === 'axe' ? 'l\'axe' : cz === 'couloirs' ? 'les couloirs' : 'les tirs de loin'} ; on a attaqué ${T.zone === 'axe' ? 'par l\'axe' : T.zone === 'couloirs' ? 'par les couloirs' : 'de loin'}.`]);
  if (Q().CONTRE[Q().sansDe(T)] === To.zone) L.push(['mauvais', `Ils ont trouvé la faille de notre ${nomO('sans', Q().sansDe(T))} en attaquant ${To.zone === 'axe' ? 'par l\'axe' : To.zone === 'couloirs' ? 'par les couloirs' : 'de loin'}.`]);
  const vifMin = Math.round(X.t / 60);
  if (X.vif === k) L.push([d > 0 ? 'bon' : 'mauvais', d > 0 ? `Vif d'or pris par notre attrapeur à la ${vifMin}e minute.` : `Notre attrapeur a pris le vif d'or alors qu'on était mené de plus de 150 points (consigne « ${nomO('attrapeur', T.attrapeur)} »).`]);
  else { const F = [Q().forces(X, k), Q().forces(X, o)];
    L.push([d > 0 ? 'info' : 'mauvais', `Vif d'or adverse à la ${vifMin}e minute${F[1].S > F[0].S + 0.5 ? ` : leur attrapeur était plus fort (${vir(Math.round(F[1].S * 10) / 10)} contre ${vir(Math.round(F[0].S * 10) / 10)})${T.attrapeur !== 'marquage' && T.cible !== 'attrapeur' ? ', le marquage ou les cognards sur lui auraient pu le freiner' : ''}` : ''}.`]); }
  if (T.attrapeur === 'marquage') L.push(['info', `Marquage de leur attrapeur : le match a duré ${vifMin} minutes${d > 0 ? ', et nos poursuiveurs en ont profité' : ''}.`]);
  if (S[k].fautes >= 6 || S[o].pen >= 3) L.push(['mauvais', `${S[k].fautes} fautes et ${S[o].pen} penalties concédés${T.agressivite === 3 ? ' : la consigne « dure » coûte cher' : ''}.`]);
  else if (T.agressivite === 3 && S[k].cog > S[o].cog + 3) L.push(['bon', `Jeu dur payant : ${S[k].cog} cognards réussis contre ${S[o].cog}, sans trop de fautes.`]);
  const tit = Q().titulaires(X.e[k]), fat = Math.round(moy(tit.map(id => X.fat[id] || 0)));
  if (fat >= 60) L.push(['mauvais', `Fatigue moyenne en fin de match : ${fat} %${T.rythme === 3 || T.sans === 'pressing' ? ' (rythme et pressing coûtent cher)' : ''}. Elle pèsera aussi la semaine prochaine.`]);
  const N = Q().notesMatch(X), K = {P:X.e[k].P, B:X.e[k].B, A:X.e[k].A, G:X.e[k].G, roles:X.e[k].roles || {}}, A = adequationCompo(M, K, T);
  const mal = Object.entries(A).filter(([id, a]) => a && a.niveau === 'faible' && N[id] != null && N[id] < 6.2).map(([id, a]) => `${Q().nomJ(M.joueurs[id])} (${vir(N[id])} ; ${a.raisons[0] || 'peu adapté'})`);
  if (mal.length) L.push(['mauvais', `Peu adaptés à ce qu'on leur demandait : ${mal.join(', ')}.`]);
  const top = Object.entries(N).filter(([id]) => X.perf[id] && X.perf[id].eq === k).sort((a, b) => b[1] - a[1])[0];
  if (top && A[top[0]] && A[top[0]].niveau === 'bon' && top[1] >= 7.5) L.push(['bon', `${Q().nomJ(M.joueurs[top[0]])} (${vir(top[1])}) : le rôle et les consignes lui allaient bien.`]);
  return L;
}

root.QMT = {contexteMatch, estimerX, prevoir, AXES, CONS, CONS_PAR, option, effets, adequation, adequationCompo, ROLE_ATTR, DEMANDE, prochainMatch, equipesPrevues, rapport, simuler, resumeSim, variantes, analyse};
})(typeof window !== 'undefined' ? window : globalThis);
