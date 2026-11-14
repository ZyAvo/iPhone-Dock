// mon-ecran-version: 9fd4f251
/* QM27 (v84, lot 2 ; v85 : installations) — gestion du club, sans affichage : window.QMC.
   Staff, contrats et salaires, valeur des joueurs, finances de la semaine, entraînement et progression, cohésion, balais,
   mercato (offres du joueur, agents libres, ventes, transferts entre clubs de l'ordinateur), prolongations, blessures (médecin).
   Appelé par le moteur (qm27.js) : initMonde, semaine, avantSaison, apresSaison, nouveauJoueur, dureeBlessure, migrer. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, ECO = EQ.eco, ENT = EQ.ent;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const arrondi = (x, pas) => Math.round(x / pas) * pas;
const n20 = j => Q().note20(j, j.poste);
const nomJ = j => j ? `${j.p} ${j.n}` : '?';
/* Monnaie des sorciers (v94, taux revu en v97). Les montants internes restent ceux du moteur (budgets, salaires, prix…),
   convertis au taux du canon (un Gallion vaut environ 5 livres) : 1 Gallion = UNITES_GALLION = 5 unités internes.
   1 Gallion = 17 Mornilles (M), 1 Mornille = 29 Noises (N), soit 1 Gallion = 493 Noises.
   Affichage : deux pièces au plus (« 2 G 6 M », « 11 M 6 N ») ; à partir de 100 Gallions, Gallions seuls (« 900 000 G »). L'interface remplace les lettres par des pièces. */
const UNITES_GALLION = 5, GAL = 17 * 29, milliers = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
const euros = x => {
  const s = x < 0 ? '−' : '', a = Math.abs(x);
  if (a >= 100 * UNITES_GALLION) return `${s}${milliers(Math.round(a / UNITES_GALLION))} G`;
  const n = Math.round(a * GAL / UNITES_GALLION), g = Math.floor(n / GAL), m = Math.floor(n % GAL / 29), no = n % 29;
  if (g) return `${s}${g} G${m ? ' ' + m + ' M' : ''}`;
  if (m) return `${s}${m} M${no ? ' ' + no + ' N' : ''}`;
  return `${s}${no} N`;
};
const club = (M, id) => M.clubs[id] || (M.reserve && M.reserve[id]);   // v106 : club sorti du jeu (palmarès)
const estJoueur = (M, id) => !!id && !!M.manager && M.manager.club === id;
const aClub = M => !!(M.manager && M.manager.club);

/* ---------- Argent ---------- */
/* v94 : au-dessus de 15 sur 20 (note 75), le salaire monte moins vite (×1,3 par point au lieu de ×1,6) */
const salaireBase = n => ECO.salaireBase * Math.pow(ECO.salaireFacteur, Math.min(n, 15) - ECO.salairePivot) * Math.pow(1.3, Math.max(0, n - 15));
function salaireDemande(j, c){
  const age = j.age >= 33 ? 0.75 : j.age >= 31 ? 0.88 : 1;
  return arrondi(salaireBase(n20(j)) * (0.85 + (c ? c.rep : 60) / 250) * age * (1 - (c && root.QMB ? root.QMB.bonus(c, 'salaire') : 0)), 50);
}
function valeur(M, j){
  const n = n20(j);
  const age = j.age <= 20 ? 1.5 : j.age <= 23 ? 1.3 : j.age <= 27 ? 1.1 : j.age <= 30 ? 0.85 : j.age <= 32 ? 0.6 : 0.35;
  const reste = j.contrat ? j.contrat.fin - M.saison : 0;
  const ctr = !j.club ? 0 : reste <= 0 ? 0.6 : reste === 1 ? 0.85 : 1;
  return arrondi(salaireBase(n) * ECO.semaines * ECO.valeurAns * age * (1 + Math.max(0, j.cache.pot - n) * 0.08) * ctr, 5000);
}
/* v85 : installations (niveau 2 = référence) */
const niv = (c, k) => (c.inst || {})[k] || 2;
const multInst = (c, k) => 0.7 + 0.15 * niv(c, k);
const entretienInst = c => Object.entries({...EQ.inst, ...(EQ.bat || {})}).reduce((s, [k, v]) => s + v.entretien * niv(c, k), 0);   // v88 : tous les bâtiments
const QB = () => root.QMB;   // v88 : bonus du domaine (qm27-domaine.js)
const masse = (M, c) => c.effectif.reduce((s, id) => s + ((M.joueurs[id] || {}).contrat || {sal:0}).sal, 0) + Object.values(c.staff || {}).reduce((s, x) => s + x.sal, 0);
function revenusSaison(c){
  const prixRef = 6 + c.rep / 10, aff = c.stade * borne(0.35 + c.rep / 170 + 0.02 * (niv(c, 'tribunes') - 2), 0.15, 1);
  return 15 * aff * (prixRef + (ECO.repasBase + c.rep / 60) * multInst(c, 'buvettes')) + ECO.tv + c.rep * ECO.tvRep + ECO.sponsors + Math.pow(c.rep / 85, 2) * ECO.sponsorsRep + Math.pow(c.rep / 85, 2.5) * ECO.merch * multInst(c, 'boutique');
}
const masseMax = c => arrondi(revenusSaison(c) * ECO.masse / ECO.semaines, 500);
const prixRef = c => Math.round(6 + c.rep / 10);
const finVide = () => ({rec:{billetterie:0, restauration:0, tv:0, sponsors:0, panneaux:0, merch:0, vip:0, visites:0, primes:0, ventes:0, emprunt:0, divers:0}, dep:{salaires:0, staff:0, stade:0, deplacements:0, balais:0, achats:0, indemnites:0, travaux:0, pret:0}});
const NOMS_REC = {billetterie:'Billetterie', restauration:'Restauration', tv:'Droits TV', sponsors:'Sponsor maillot', panneaux:'Panneaux', merch:'Bazar (boutique)', vip:'Loges et banquets', visites:'Visites des trophées', primes:'Primes de classement', ventes:'Ventes de joueurs', emprunt:'Emprunt', divers:'Divers'};
const NOMS_DEP = {salaires:'Salaires des joueurs', staff:'Salaires du staff', stade:'Entretien du domaine', deplacements:'Déplacements', balais:'Balais', achats:'Achats de joueurs', indemnites:'Indemnités', travaux:'Travaux', pret:'Emprunt (échéances)'};
function compter(c, sens, poste, x){ c.fin.saison[sens][poste] = (c.fin.saison[sens][poste] || 0) + x; c.budget += sens === 'rec' ? x : -x; }

/* ---------- Création ---------- */
function creerStaff(M, r, role, note, nat){
  const N = D.NOMS[nat] || D.NOMS.ENG;
  note = Math.round(borne(note, 3, 20));
  return {id:'s' + (M.prochainId++), p:r.choix(N.p), n:r.choix(N.n), nat, role, note, sal:arrondi(ECO.staffBase * Math.pow(ECO.staffFacteur, note - 8), 50)};
}
function staffClub(M, r, c){
  const st = {};
  for (const [role] of D.STAFF) st[role] = creerStaff(M, r, role, 5 + c.rep / 9 + r.gauss() * 2, r.pondere(D.ORIGINES[c.nat]));
  return st;
}
function marcheStaff(M, r){
  const L = [];
  for (const [role] of D.STAFF) for (let k = 0; k < 3; k++) L.push(creerStaff(M, r, role, 7 + r() * 11, r.choix(Object.keys(D.NATIONS))));
  return L;
}
const numLibre = (M, c) => { const pris = new Set(c.effectif.map(id => (M.joueurs[id] || {}).num)); for (let n = 1; n < 100; n++) if (!pris.has(n)) return n; return 99; };
function contrat(M, r, j, c, ans){ j.contrat = {fin:M.saison + (ans ?? r.ent(0, 3)), sal:arrondi(salaireDemande(j, c) * (0.9 + r() * 0.15), 50)}; }
function nouveauJoueur(M, j, c){ const r = Q().hasard(Q().melange(M.graine, j.id)); contrat(M, r, j, c, r.ent(1, 3)); }
function creerLibre(M, r){
  const poste = r.pondere([['P', 40], ['B', 25], ['A', 15], ['G', 20]]), nat = r.pondere(D.SELECTIONS.map(n => [n, 1 + D.CLUBS.filter(c => c[3] === n && c[4] !== 'reserve').length]));   // v106 : toutes les nations, au prorata des clubs
  const j = Q().creerJoueur(r, nat, poste, EQ.niveauMin - 0.9 + r() * 2.8, r.ent(22, 33), 'j' + (M.prochainId++));
  j.club = null; j.contrat = null; M.joueurs[j.id] = j; M.libres.push(j.id); return j;
}
const ENT_DEFAUT = () => ({P:{f:'technique', i:2}, B:{f:'technique', i:2}, A:{f:'technique', i:2}, G:{f:'technique', i:2}});
function completerClub(M, r, c){
  if (!c.staff) c.staff = staffClub(M, r, c);
  for (const [role] of D.STAFF) if (!c.staff[role]) c.staff[role] = creerStaff(M, r, role, 5 + c.rep / 9 + r.gauss() * 2, r.pondere(D.ORIGINES[c.nat]));   // v85 : nouveau poste
  if (!c.inst){ const n = borne(1 + Math.floor((c.rep - 40) / 15), 1, 4); c.inst = {boutique:n, buvettes:n, tribunes:n, formation:n}; }
  if (!c.travaux) c.travaux = [];
  if (!c.fin) c.fin = {saison:finVide(), derniere:null, hist:[]};
  if (!c.entrainement) c.entrainement = ENT_DEFAUT();
  if (c.prix == null) c.prix = prixRef(c);
  if (c.cohesion == null) c.cohesion = ENT.cohesion;
  if (c.usure == null) c.usure = 100;
  if (!c.aVendre) c.aVendre = [];
  if (!c.suivi) c.suivi = [];
  if (!c.progres) c.progres = {};
  c.budget = c.budgetV2 ? c.budget : arrondi((0.6 + Math.pow(Math.max(0, c.rep - 40) / 45, 1.6) * 9) * 1e6, 50000); c.budgetV2 = 1;
  for (const id of c.effectif){ const j = M.joueurs[id]; if (j && !j.contrat) contrat(M, r, j, c); }
  c.masseMax = masseMax(c);
  if (c.compo && !c.compo.roles) Q().rolesAuto(M, c.compo, true);
}
function nouveauClub(M, r, c){ completerClub(M, r, c); margeDepart(M, c); }   // v106 : club ajouté à une partie en cours
/* v113 : en début de partie, chaque club garde une vraie marge sous son plafond (la masse salariale des joueurs et du staff
   ne dépasse pas 68 % du plafond ; avant, les petits clubs démarraient à 85-90 %, sans rien pouvoir recruter) */
function margeDepart(M, c){
  const m = masse(M, c), cible = c.masseMax * 0.68, staff = Object.values(c.staff || {}).reduce((s, x) => s + x.sal, 0);
  if (m <= cible || m <= staff) return;
  const k = Math.max(0.6, (cible - staff) / (m - staff));
  for (const id of c.effectif){ const j = M.joueurs[id]; if (j && j.contrat) j.contrat.sal = arrondi(j.contrat.sal * k, 50); }
}
function initMonde(M, r){
  M.libres = M.libres || []; M.offres = M.offres || []; M.transferts = M.transferts || [];
  for (const c of Object.values(M.clubs)){ completerClub(M, r, c); margeDepart(M, c); }
  for (let k = 0; k < 28; k++) creerLibre(M, r);
  M.staffLibres = marcheStaff(M, r);
}
function migrer(M){
  const r = Q().hasard(Q().melange(M.graine, 'migration'));
  M.libres = M.libres || []; M.offres = M.offres || []; M.transferts = M.transferts || [];
  for (const c of Object.values(M.clubs)) completerClub(M, r, c);
  if (!M.libres.length) for (let k = 0; k < 28; k++) creerLibre(M, r);
  if (!M.staffLibres) M.staffLibres = marcheStaff(M, r);
  M.v = Q().VERSION;
  if (M.manager) Q().message(M, 'Nouveautés de QM27', 'Le club a maintenant un staff, des contrats, des finances, l\'entraînement de la semaine et le mercato (onglet Club). Les fenêtres de transferts sont ouvertes en août et en janvier ; les agents libres signent à tout moment.', 'staff');
}

/* ---------- Mercato : fenêtres ---------- */
const mercatoOuvert = S => !!S && (S.type === 'prepa' || new Date(S.date).getUTCMonth() === 0);
function prochaineFenetre(M){ const k = M.calendrier.findIndex((s, i) => i >= M.semaine && mercatoOuvert(s)); return k >= 0 ? M.calendrier[k] : null; }

/* ---------- Blessures ---------- */
function dureeBlessure(M, clubId, jours){ const c = club(M, clubId); const med = c && c.staff ? c.staff.medecin.note : 10; const d = Math.max(1, Math.round(jours * (1.3 - med / 30))); return QB() ? QB().ajusterBlessure(c, d) : d; }

/* ---------- Entraînement et progression ---------- */
const FAM_FOCUS = Object.fromEntries(D.FOCUS.map(f => [f[0], f[2]]));
function progression(M, j, f, i, coach, prepa, r, suivi, mult = 1, boost = null, foc = null){   // v91 : f = focus (texte) ou multiplicateurs par famille (programme) ; boost = atelier du poste ; v127 : foc = focus individuels {a:Set, g:Set}
  const [p1, p2] = D.PICS[j.poste], ca = n20(j), pot = j.cache.pot, gap = Math.max(0, pot - ca);
  const G = j.age < p1 ? gap * (0.35 + 0.04 * (p1 - j.age)) : j.age <= p2 ? gap * 0.2 : 0;
  const q = 0.55 + coach / 22, qPhys = 0.55 + (coach + prepa) / 44, inten = ENT.intensite[i - 1], pro = 0.6 + j.cache.pro / 25, jeu = 1 + (j.joue ? ENT.joue : 0);
  const fams = typeof f === 'string' ? FAM_FOCUS[f] || [] : [], w = Q().POIDS[j.poste];
  const declin = j.age > p2 ? (0.6 + 0.4 * (j.age - p2)) / ENT.semaines * (1.2 - prepa / 40) : 0;   // v113 : déclin plus net après le pic (avant 0,25 + 0,18 par an : le niveau moyen montait sans fin)
  let plus = 0, moins = 0;
  const essai = (L, idx, fam, poids, bo) => {
    const fm = typeof f === 'object' && f ? (f[fam] ?? ENT.horsFocus) : f === 'repos' ? 0 : fams.includes(fam) ? ENT.focus : ENT.horsFocus;
    const vise = foc && (fam === 'Gardien' ? foc.g.has(idx) : foc.a.has(idx));   // v127 : attribut d'un focus individuel : ×1,8 (et au moins le poids d'un attribut clé) ; les autres ×0,9
    const pw = vise ? Math.max(ENT.cible, poids === 3 ? ENT.cible : poids === 1 ? 1 : ENT.autre) : poids === 3 ? ENT.cible : poids === 1 ? 1 : ENT.autre;
    const x = G / ENT.semaines * (fam === 'Physique' ? qPhys : q) * inten * pro * jeu * fm * pw * mult * (bo ? 1.35 : 1) * (foc ? (vise ? 1.8 : 0.9) : 1);
    if (x > 0 && ca < pot + 0.2 && L[idx] < 20 && r() < x){ L[idx]++; plus++; if (suivi) suivi.push(idx); }
    if (declin){
      const pd = fam === 'Physique' ? declin : fam === 'Mental' ? 0 : declin * 0.4;
      if (pd && L[idx] > 1 && r() < pd){ L[idx]--; moins++; }
      if (fam === 'Mental' && L[idx] < 20 && r() < 0.12 / ENT.semaines){ L[idx]++; plus++; }
    }
  };
  for (let k = 0; k < j.a.length; k++) essai(j.a, k, D.ATTRS[k][2], w[k], boost && boost.a.includes(k));
  if ((j.poste === 'G' || (foc && foc.poste === 'G')) && j.g) for (let k = 0; k < j.g.length; k++) essai(j.g, k, 'Gardien', 3, boost && j.poste === 'G' && boost.g.includes(k));   // v127 : un futur gardien travaille aussi les attributs de gardien
  return plus - moins;
}
const FOCUS_IA = ['technique', 'physique', 'tactique'];
function entrainement(M, S, r){
  for (const c of Object.values(M.clubs)){
    const moi = estJoueur(M, c.id), E = moi ? c.entrainement : null;
    const P = moi && root.QMG ? root.QMG.programme(M, c, S) : null;   // v91 : programme de la semaine (qm27-bureau.js)
    const prepa = c.staff.prepa.note;
    const FOC = P && root.QMG.focusActifs ? root.QMG.focusActifs(M, c) : {};   // v127 : entraînement individuel
    let tactique = 0;
    for (const id of c.effectif){
      const j = M.joueurs[id]; if (!j) continue;
      const g = P ? {f:P.mix, i:P.int} : moi ? E[j.poste] : {f:FOCUS_IA[(M.semaine + id.length) % 3], i:2};
      if (j.bless){ continue; }
      const avant = n20(j);
      progression(M, j, g.f, g.i, c.staff['ent' + j.poste].note, prepa, r, null, (QB() ? QB().multProgression(c, j) : 1) * (P && j.age <= 21 ? P.jeunes : 1), P ? P.boost[j.poste] : null, FOC[id] || null);
      if (moi){ const d = n20(j) - avant; if (d) c.progres[id] = Math.round(((c.progres[id] || 0) + d) * 100) / 100; }
      const fatFoc = P && FOC[id] ? root.QMG.apresFocus(M, c, j, FOC[id]) : 0;
      j.fat = borne(j.fat + (P ? P.fat : ENT.fatigue[g.i - 1] - (g.f === 'repos' ? 10 : 0)) + fatFoc, 0, 100);
      { const ft = P ? P.fat : ENT.fatigue[g.i - 1] - (g.f === 'repos' ? 10 : 0); j.charge = borne((j.charge || 0) + ft * EQ.charge.entrainement, 0, 100); }   // v96 : charge de travail
      if (g.i > 1 && r() < ENT.blessure * g.i * g.i * j.cache.frag / 10 * (P ? P.risque : 1)){
        const b = D.BLESSURES[r.ent(0, 3)], jours = dureeBlessure(M, c.id, r.ent(b[1], Math.min(b[2], 12)));
        j.bless = {nom:b[0] + ' (à l\'entraînement)', jours};
        if (moi) Q().message(M, `Blessure à l'entraînement : ${nomJ(j)}`, `${b[0]}. Indisponible environ ${jours} jour${jours > 1 ? 's' : ''}.`, 'bless');
      }
    }
    if (moi) for (const p of ['P', 'B', 'A', 'G']) if (E[p].f === 'tactique') tactique++;
    if (moi && c.compo){   // v96 : le préparateur physique signale les titulaires trop chargés (au plus une fois par mois et par joueur)
      const L = Q().titulaires(c.compo).map(id => M.joueurs[id]).filter(j => j && (j.charge || 0) >= 62 && (!j.alerteCh || (M.tic || 0) - j.alerteCh >= 4));
      if (L.length){ L.forEach(j => { j.alerteCh = M.tic || 0; });
        Q().message(M, `Préparation physique : ${L.length > 1 ? L.length + ' titulaires dans le rouge' : nomJ(L[0]) + ' dans le rouge'}`, `${L.map(j => `${nomJ(j)} (charge ${Math.round(j.charge)})`).join(', ')}. ${L.length > 1 ? 'Ils enchaînent' : 'Ce joueur enchaîne'} trop : la fatigue ne redescend plus et le risque de blessure grimpe. Un match sur le banc ou une semaine légère à l'entraînement ferait du bien.`, 'staff'); }
    }
    c.cohesion = borne(c.cohesion + 1 + (P ? P.coh : moi ? tactique * 0.5 : 0.5) + (QB() ? QB().bonus(c, 'cohesion') : 0), 30, 100);
    if (P && root.QMG.apresEntrainement){ root.QMG.apresEntrainement(M, c, P); root.QMG.noterCourbes(M, c); }   // v127 : maîtrise tactique, mise en place, courbes de la saison
  }
  for (const id of M.libres){ const j = M.joueurs[id]; if (j){ progression(M, j, FOCUS_IA[M.semaine % 3], 1, 8, 8, r, null); } }
}
function rapportEntrainement(M){
  const c = club(M, M.manager.club), L = Object.entries(c.progres).filter(([id]) => M.joueurs[id] && M.joueurs[id].club === c.id).sort((a, b) => b[1] - a[1]);
  c.progres = {};
  if (!L.length) return;
  const haut = L.filter(x => x[1] > 0).slice(0, 4).map(([id, d]) => `${nomJ(M.joueurs[id])} (+${(d * 5).toFixed(1).replace('.', ',')})`);
  const bas = L.filter(x => x[1] < 0).slice(-3).map(([id, d]) => `${nomJ(M.joueurs[id])} (${(d * 5).toFixed(1).replace('.', ',')})`);
  Q().message(M, 'Rapport d\'entraînement du mois', `${haut.length ? 'En progrès : ' + haut.join(', ') + '.' : 'Pas de progrès marquant.'}${bas.length ? ' En baisse : ' + bas.join(', ') + '.' : ''} (évolution de la note au poste sur 100)`, 'staff');
}

/* ---------- Finances de la semaine ---------- */
function formeRecente(M, c){ const t = M.tables[c.ligue] && M.tables[c.ligue][c.id]; return t ? (t.forme || []).reduce((s, f) => s + (f === 'V' ? 1 : f === 'D' ? -1 : 0), 0) : 0; }
function remplissage(M, c, adv){
  return borne(0.35 + c.rep / 170 + 0.03 * formeRecente(M, c) + ((adv ? adv.rep : 60) - 60) / 400 - 0.9 * (c.prix / prixRef(c) - 1) + 0.02 * (niv(c, 'tribunes') - 2) + (QB() ? QB().bonusAffluence(M, c) : 0), 0.15, 1);
}
function finances(M, S){
  const n = ECO.semaines;
  for (const c of Object.values(M.clubs)){
    const avant = c.budget;
    const m = S.matchs.find(x => x.dom === c.id || x.ext === c.id);
    if (m && m.ligue !== 'sixn'){
      if (m.dom === c.id){
        const aff = Math.round(c.stade * remplissage(M, c, club(M, m.ext)));
        const bq = QB() ? QB() : null;
        compter(c, 'rec', 'billetterie', aff * c.prix * (1 + (bq ? bq.bonus(c, 'billetterie') : 0))); compter(c, 'rec', 'restauration', aff * (ECO.repasBase + c.rep / 60) * multInst(c, 'buvettes') * (1 + (bq ? bq.bonus(c, 'resto') : 0)));
        if (m.res && estJoueur(M, c.id)) m.res.affluence = aff;
      } else compter(c, 'dep', 'deplacements', ECO.deplacement);
    }
    compter(c, 'rec', 'tv', (ECO.tv + c.rep * ECO.tvRep) / n);
    const parDomaine = QB() && estJoueur(M, c.id) && c.dom;   // v88 : sponsors et Bazar du joueur passent par le domaine
    if (!parDomaine){
      compter(c, 'rec', 'sponsors', (ECO.sponsors + Math.pow(c.rep / 85, 2) * ECO.sponsorsRep) / n);
      compter(c, 'rec', 'merch', Math.pow(c.rep / 85, 2.5) * ECO.merch / n * multInst(c, 'boutique'));
    }
    if (QB()) QB().finances(M, c, S, m);
    compter(c, 'dep', 'salaires', c.effectif.reduce((s, id) => s + ((M.joueurs[id] || {}).contrat || {sal:0}).sal, 0));
    compter(c, 'dep', 'staff', Object.values(c.staff).reduce((s, x) => s + x.sal, 0));
    compter(c, 'dep', 'stade', c.stade * ECO.entretien + entretienInst(c));
    c.fin.hist.push({d:S.date, net:Math.round(c.budget - avant)}); if (c.fin.hist.length > 16) c.fin.hist.shift();
    if (estJoueur(M, c.id) && c.budget < 0){
      M.manager.confiance = Math.max(0, M.manager.confiance - 2);
      if (!c.alerteDette || M.semaine - c.alerteDette >= 4){ c.alerteDette = M.semaine; Q().message(M, 'Le président s\'inquiète des comptes', `Le solde du club est négatif (${euros(c.budget)}). Vendre un joueur ou réduire la masse salariale rassurerait le conseil.`, 'pres'); }
    }
  }
}
function balaisIA(M){
  for (const c of Object.values(M.clubs)){
    if (estJoueur(M, c.id) || c.usure > 35) continue;
    const L = D.BALAIS.filter(b => b.prix * 1000 <= c.budget * 0.15).sort((a, b) => b.prix - a.prix);
    const b = L[0]; if (!b) continue;
    compter(c, 'dep', 'balais', b.prix * 1000); c.balai = b.id; c.usure = 100;
  }
}

/* ---------- Transferts ---------- */
function retirerDe(M, c, id){
  c.effectif = c.effectif.filter(x => x !== id); c.aVendre = (c.aVendre || []).filter(x => x !== id); c.suivi = (c.suivi || []).filter(x => x !== id);
  const k = c.compo; if (!k) return;
  for (const p of ['P', 'B', 'A', 'G']) k[p] = k[p].filter(x => x !== id);
  k.banc = k.banc.filter(x => x !== id);
  if (k.roles) delete k.roles[id];
  if (k.cap === id) k.cap = null;
}
function reparerCompo(M, c){
  if (estJoueur(M, c.id)){
    const k = c.compo, need = {P:3, B:2, A:1, G:1};
    for (const p of ['P', 'B', 'A', 'G']) while (k[p].length < need[p]) k[p].push(null);
    Q().verifierCompo(M, c.id);
    for (const p of ['P', 'B', 'A', 'G']) k[p] = k[p].filter(Boolean);
    if (k.P.length < 3 || k.B.length < 2 || !k.A.length || !k.G.length) c.compo = Q().compoAuto(M, c.id);
  } else c.compo = Q().compoAuto(M, c.id);
}
function transfert(M, jid, versId, montant, sal, ans){
  const j = M.joueurs[jid], de = j.club ? club(M, j.club) : null, vers = club(M, versId), S = Q().semaine(M);
  if (de){ retirerDe(M, de, jid); if (montant) compter(de, 'rec', 'ventes', montant); if (montant && de.enveloppe != null) de.enveloppe += Math.round(montant * 0.5); }   // v97 : la moitié d'une vente revient dans l'enveloppe
  else M.libres = M.libres.filter(x => x !== jid);
  noterCarriere(M, j, de ? (montant ? 'transfert' : 'libre') : 'libre', de ? de.id : null, versId, montant);
  vers.effectif.push(jid); j.club = versId; j.num = numLibre(M, vers);
  j.contrat = {fin:M.saison + ans, sal}; j.arrivee = M.saison * 100 + M.semaine; if (montant) compter(vers, 'dep', 'achats', montant);
  vers.cohesion = Math.max(30, vers.cohesion - 4);
  if (estJoueur(M, versId) && root.QMG && root.QMG.noterAchat) root.QMG.noterAchat(M, j, montant);   // v97 : enveloppe des transferts, philosophie « vedette »
  M.offres = M.offres.filter(o => o.j !== jid);
  if (de) reparerCompo(M, de);
  reparerCompo(M, vers);
  if (de && !estJoueur(M, de.id) && de.effectif.length < 15) completerEffectif(M, de, Q().hasard(Q().melange(M.graine, 'refill', jid, M.semaine)));
  M.transferts.unshift({d:S ? S.date : Date.now(), j:jid, nom:nomJ(j), de:de ? de.id : null, vers:versId, montant});
  if (M.transferts.length > 60) M.transferts.length = 60;
}
/* v94 : historique de carrière — j.carr = {s:[[saison, club, matchs, buts, cognards, vifs, arrêts, note moyenne × 10]], t:[[saison, semaine, type, de, vers, montant]]} */
function noterCarriere(M, j, type, de, vers, montant){ const k = j.carr || (j.carr = {s:[], t:[]}); k.t.push([M.saison, M.semaine, type, de || null, vers || null, montant || 0]); if (k.t.length > 12) k.t.shift(); }
function libererJoueur(M, j){
  noterCarriere(M, j, 'libere', j.club, null, 0);
  const c = club(M, j.club); retirerDe(M, c, j.id); j.club = null; j.contrat = null; M.libres.push(j.id); reparerCompo(M, c);
}
function besoin(M, c){
  const k = c.compo, cnt = p => c.effectif.filter(id => (M.joueurs[id] || {}).poste === p).length;
  const mini = {P:6, B:4, A:2, G:2}, manque = ['P', 'B', 'A', 'G'].find(p => cnt(p) < mini[p]);
  if (manque) return {poste:manque, seuil:0};
  const L = ['P', 'B', 'A', 'G'].map(p => { const ids = k[p].filter(id => M.joueurs[id]); const v = ids.length ? Math.min(...ids.map(id => Q().note20(M.joueurs[id], p))) : 0; return {poste:p, seuil:v}; });
  return L.sort((a, b) => a.seuil - b.seuil)[0];
}
function completerEffectif(M, c, r){
  while (c.effectif.length < 16){
    const b = besoin(M, c);
    const libre = M.libres.map(id => M.joueurs[id]).filter(j => j && j.poste === b.poste).sort((x, y) => n20(y) - n20(x))[0];
    if (libre && salaireDemande(libre, c) < c.masseMax * 0.12){ transfert(M, libre.id, c.id, 0, salaireDemande(libre, c), r.ent(1, 2)); continue; }
    const lvl = EQ.niveauMin + (c.rep - 40) / 45 * (EQ.niveauMax - EQ.niveauMin) - 2.8 + 0.3 * (niv(c, 'formation') - 2) + r.gauss() * 0.8;   // v113 : −2,8 (avant −1,8), mieux avec un bon centre de formation
    const j = Q().creerJoueur(r, r.pondere(D.ORIGINES[c.nat]), b.poste, lvl, Q().AGE_JEUNE(r), 'j' + (M.prochainId++));
    j.club = c.id; j.num = numLibre(M, c); M.joueurs[j.id] = j; c.effectif.push(j.id); nouveauJoueur(M, j, c);
    reparerCompo(M, c);
  }
}
function mercatoIA(M, S, r){
  const clubs = Object.values(M.clubs).filter(c => !estJoueur(M, c.id));
  let faits = 0;
  for (const c of clubs.sort(() => r() - 0.5)){
    if (faits >= 8) break;
    /* comptes dans le rouge ou masse salariale trop lourde : on se sépare du remplaçant le plus cher */
    if ((c.budget < 0 || masse(M, c) > c.masseMax * 1.1) && c.effectif.length > 15){
      const cher = c.effectif.map(id => M.joueurs[id]).filter(j => !j.pret && !Q().titulaires(c.compo).includes(j.id)).sort((a, b) => b.contrat.sal - a.contrat.sal)[0];
      if (cher){ const riche = clubs.filter(o => o.id !== c.id && o.budget > valeur(M, cher) * 2 && masse(M, o) + cher.contrat.sal < o.masseMax).sort(() => r() - 0.5)[0];
        if (riche) transfert(M, cher.id, riche.id, valeur(M, cher), salaireDemande(cher, riche), r.ent(1, 3)); else libererJoueur(M, cher); faits++; }
    }
    if (c.effectif.length > 21){ const pire = c.effectif.map(id => M.joueurs[id]).filter(j => !j.pret && !Q().titulaires(c.compo).includes(j.id)).sort((a, b) => (n20(a) - a.age / 20) - (n20(b) - b.age / 20))[0]; if (pire) libererJoueur(M, pire); }
    if (r() > (c.effectif.length < 16 ? 0.7 : masse(M, c) < c.masseMax * 0.75 ? 0.4 : 0.22)) continue;   // v113 : un club qui a de la marge sous son plafond cherche plus souvent
    const b = besoin(M, c), budget = c.budget * 0.6, place = c.masseMax * 1.05 - masse(M, c);
    if (budget <= 0 || place <= 0) continue;
    const vus = [];
    for (const id of M.libres) vus.push(M.joueurs[id]);
    for (const o of clubs) if (o.id !== c.id && o.rep <= c.rep + 10 && o.effectif.length > 15) for (const id of o.effectif) if (r() < 0.25) vus.push(M.joueurs[id]);
    let best = null, bestV = 0;
    const maintenant = M.saison * 100 + M.semaine;
    for (const j of vus){
      if (!j || (j.arrivee && maintenant - j.arrivee < 20 && j.club)) continue;   // pas revendu juste après son arrivée
      const nv = Q().note20(j, b.poste); if (nv < b.seuil + 0.8) continue;
      const prix = j.club ? valeur(M, j) * (Q().titulaires(club(M, j.club).compo).includes(j.id) ? 1.2 : 0.95) : 0, sal = salaireDemande(j, c);
      if (prix > budget || sal > place) continue;
      /* v113 : le prix et le salaire pèsent selon les moyens du club (avant : en absolu, si bien que les grands clubs prenaient des renforts
         bon marché, n'utilisaient que 57 % de leur plafond et laissaient la hiérarchie se tasser en vingt saisons) */
      const v = (nv - b.seuil) / (1 + prix / Math.max(1e6, budget) + sal / Math.max(2e4, place)) - Math.max(0, j.age - 30) * 0.2;
      if (v > bestV){ best = {j, prix:arrondi(prix, 5000), sal}; bestV = v; }
    }
    if (best){ transfert(M, best.j.id, c.id, best.prix, best.sal, r.ent(1, 3)); faits++; }
  }
}
function offresIA(M, S, r){
  const U = club(M, M.manager.club), acheteurs = Object.values(M.clubs).filter(c => c.id !== U.id);
  const enCours = new Set(M.offres.map(o => o.j));
  const offre = (j, mult, plusGrand) => {
    const montant = arrondi(valeur(M, j) * mult, 5000), sal = salaireDemande(j, U);
    const L = acheteurs.filter(c => c.budget * 0.7 >= montant && masse(M, c) + sal <= c.masseMax * 1.1 && (!plusGrand || c.rep >= U.rep) && Math.abs(c.rep - U.rep) <= 30);
    if (!L.length) return;
    const c = r.choix(L);
    const o = {id:'o' + (M.prochainId++), j:j.id, club:c.id, montant, expire:M.semaine + 2};
    M.offres.push(o); enCours.add(j.id);
    Q().message(M, `Offre pour ${nomJ(j)}`, `${c.nom} propose ${euros(montant)}. Réponds dans le mercato (onglet Club) avant deux semaines.`, 'mercato');
  };
  for (const id of U.aVendre) if (!enCours.has(id) && M.joueurs[id] && !M.joueurs[id].pret && r() < 0.4) offre(M.joueurs[id], 0.75 + r() * 0.3, false);
  const tops = U.effectif.map(id => M.joueurs[id]).filter(j => !j.pret).sort((a, b) => n20(b) - n20(a)).slice(0, 3);
  for (const j of tops) if (!enCours.has(j.id) && r() < 0.04) offre(j, 1.05 + r() * 0.25, true);
}

/* ---------- Actions du joueur ---------- */
const refus = (msg, contre) => ({ok:false, msg, contre});
function verifierPlace(M, U, sal, montant){
  if (U.effectif.length >= ECO.effectifMax) return refus(`Effectif complet (${ECO.effectifMax} joueurs) : libère ou vends quelqu'un d'abord.`);
  if (montant > U.budget) return refus(`Pas assez d'argent : le solde est de ${euros(U.budget)}.`);
  if (U.enveloppe != null && montant > U.enveloppe) return refus(`Le président refuse : il reste ${euros(U.enveloppe)} dans l'enveloppe des transferts.`);
  const m = masse(M, U);
  if (m + sal > U.masseMax) return refus(`Le président refuse : la masse salariale passerait à ${euros(m + sal)} par semaine (limite ${euros(U.masseMax)}).`);
  return null;
}
function exigenceJoueur(M, j, U){
  const de = j.club ? club(M, j.club) : null;
  if (de && j.cache.amb >= 15 && U.rep < de.rep - 15) return {non:`${nomJ(j)} ne veut pas rejoindre un club moins réputé que ${de.nom}.`};
  return {sal:arrondi(salaireDemande(j, U) * (1 + (j.cache.amb - 10) * 0.02) * (de && U.rep < de.rep - 10 ? 1.25 : 1), 50)};
}
function prixClub(M, j){ const de = club(M, j.club), U = aClub(M) ? club(M, M.manager.club) : null; return arrondi(valeur(M, j) * (Q().titulaires(de.compo).includes(j.id) ? 1.2 : 0.95) * (j.contrat && j.contrat.fin - M.saison >= 2 ? 1.08 : 1) * (1 - (U && QB() ? QB().bonus(U, 'prixVendeur') : 0)), 5000); }
function proposerTransfert(M, jid, montant, sal, ans){
  const j = M.joueurs[jid], U = club(M, M.manager.club);
  if (!j || j.club === U.id) return refus('Joueur introuvable.');
  if (j.club && !mercatoOuvert(Q().semaine(M))) return refus('Le mercato est fermé : il ouvre en août et en janvier. Les agents libres, eux, signent à tout moment.');
  if (j.club && club(M, j.club).effectif.length <= ECO.effectifMin) return refus(`${club(M, j.club).nom} n'a pas assez de joueurs pour vendre.`);
  const p = verifierPlace(M, U, sal, j.club ? montant : 0); if (p) return p;
  if (j.club){
    const min = prixClub(M, j);
    if (montant < min) return montant >= min * 0.85 ? refus(`${club(M, j.club).nom} accepterait ${euros(min)}.`, {montant:min}) : refus(`Offre trop basse : ${club(M, j.club).nom} veut au moins ${euros(min)}.`, {montant:min});
  }
  const ex = exigenceJoueur(M, j, U);
  if (ex.non) return refus(ex.non);
  if (sal < ex.sal) return refus(`${nomJ(j)} demande ${euros(ex.sal)} par semaine.`, {sal:ex.sal});
  if (j.age >= 32 && ans > 2) ans = 2;
  const de = j.club ? club(M, j.club).nom : null;
  transfert(M, jid, U.id, j.club ? montant : 0, sal, ans);
  Q().message(M, `${nomJ(j)} signe à ${U.nom}`, de ? `Transfert de ${de} pour ${euros(montant)}, contrat jusqu'en ${M.saison + ans + 1}, ${euros(sal)} par semaine.` : `Agent libre, contrat jusqu'en ${M.saison + ans + 1}, ${euros(sal)} par semaine.`, 'mercato');
  return {ok:true, msg:`${nomJ(j)} a signé !`};
}
function accepterOffre(M, oid){
  const o = M.offres.find(x => x.id === oid), U = club(M, M.manager.club);
  if (!o) return refus('Offre expirée.');
  const j = M.joueurs[o.j], c = club(M, o.club);
  if (U.effectif.length <= ECO.effectifMin) return refus(`Il faut garder au moins ${ECO.effectifMin} joueurs.`);
  if (c.budget < o.montant) { M.offres = M.offres.filter(x => x.id !== oid); return refus(`${c.nom} n'a plus les moyens : offre retirée.`); }
  transfert(M, o.j, o.club, o.montant, salaireDemande(j, c), 2 + (j.age < 27 ? 1 : 0));
  Q().message(M, `${nomJ(j)} part à ${c.nom}`, `Vendu ${euros(o.montant)}.`, 'mercato');
  return {ok:true, msg:`${nomJ(j)} vendu ${euros(o.montant)}`};
}
function refuserOffre(M, oid){ M.offres = M.offres.filter(x => x.id !== oid); return {ok:true}; }
function basculer(L, id){ const k = L.indexOf(id); if (k >= 0) L.splice(k, 1); else L.push(id); return k < 0; }
function mettreEnVente(M, jid){ return basculer(club(M, M.manager.club).aVendre, jid); }
function suivre(M, jid){ return basculer(club(M, M.manager.club).suivi, jid); }
function semainesRestantes(M, j){ const reste = M.calendrier.length - M.semaine; return Math.max(0, (j.contrat.fin - M.saison) * ECO.semaines + reste); }
const coutLiberation = (M, j) => arrondi(j.contrat.sal * semainesRestantes(M, j) * 0.5, 1000);
function liberer(M, jid){
  const j = M.joueurs[jid], U = club(M, M.manager.club);
  if (!j || j.club !== U.id) return refus('Joueur introuvable.');
  if (U.effectif.length <= ECO.effectifMin) return refus(`Il faut garder au moins ${ECO.effectifMin} joueurs.`);
  const cout = coutLiberation(M, j);
  compter(U, 'dep', 'indemnites', cout); libererJoueur(M, j);
  Q().message(M, `${nomJ(j)} quitte le club`, `Contrat résilié, indemnité de ${euros(cout)}.`, 'mercato');
  return {ok:true, msg:`Contrat résilié (${euros(cout)})`};
}
function prolonger(M, jid, sal, ans){
  const j = M.joueurs[jid], U = club(M, M.manager.club);
  if (!j || j.club !== U.id) return refus('Joueur introuvable.');
  if (j.contrat.fin - M.saison >= 3) return refus(`${nomJ(j)} est déjà sous contrat jusqu'en ${j.contrat.fin + 1}.`);
  if (j.age >= 33 && ans > 1) return refus(`À ${j.age} ans, ${nomJ(j)} ne signe que pour une saison.`, {ans:1});
  const dem = arrondi(Math.max(j.contrat.sal, salaireDemande(j, U) * (1 + (j.cache.amb - 10) * 0.02)), 50);
  if (sal < dem) return refus(`${nomJ(j)} demande ${euros(dem)} par semaine.`, {sal:dem});
  if (masse(M, U) - j.contrat.sal + sal > U.masseMax) return refus(`Le président refuse : masse salariale au-dessus de ${euros(U.masseMax)} par semaine.`);
  j.contrat = {fin:M.saison + ans, sal};
  return {ok:true, msg:`Prolongé jusqu'en ${j.contrat.fin + 1}`};
}
function embaucher(M, sid){
  const U = club(M, M.manager.club), s = M.staffLibres.find(x => x.id === sid);
  if (!s) return refus('Ce membre du staff n\'est plus libre.');
  const ancien = U.staff[s.role], indem = ancien.sal * 8;
  if (indem > U.budget) return refus(`Indemnité de départ trop chère : ${euros(indem)}.`);
  compter(U, 'dep', 'indemnites', indem);
  M.staffLibres = M.staffLibres.filter(x => x.id !== sid); M.staffLibres.push(ancien); U.staff[s.role] = s;
  Q().message(M, `${s.p} ${s.n} rejoint le staff`, `${(D.STAFF.find(x => x[0] === s.role) || [])[1]} (note ${s.note}). ${ancien.p} ${ancien.n} part avec ${euros(indem)} d'indemnité.`, 'staff');
  return {ok:true, msg:`${s.p} ${s.n} embauché`};
}
function acheterBalais(M, bid){
  const U = club(M, M.manager.club), b = D.BALAIS.find(x => x.id === bid);
  if (!b) return refus('Modèle inconnu.');
  const cout = Math.round(b.prix * 1000 * (1 - (QB() ? QB().bonus(U, 'balaiPrix') : 0))); if (cout > U.budget) return refus(`Pas assez d'argent (${euros(cout)}).`);
  compter(U, 'dep', 'balais', cout); U.balai = b.id; U.usure = 100;
  return {ok:true, msg:`Nouveaux balais : ${b.nom}`};
}
function reglerPrix(M, prix){ const U = club(M, M.manager.club), mo = UNITES_GALLION / 17; U.prix = borne(Math.round(prix / mo), Math.ceil(4 / mo), Math.floor(60 / mo)) * mo; /* v97 : à la Mornille près, de 4 à 60 unités (14 Mornilles à 12 Gallions) */ return U.prix; }

/* ---------- Semaine et saison ---------- */
function semaine(M, S){
  const r = Q().hasard(Q().melange(M.graine, 'semaine', M.saison, M.semaine));
  entrainement(M, S, r);
  finances(M, S);
  balaisIA(M);
  if (mercatoOuvert(S)){ mercatoIA(M, S, r); if (aClub(M)) offresIA(M, S, r); }
  M.offres = M.offres.filter(o => o.expire > M.semaine);
  if (aClub(M)){
    const U = club(M, M.manager.club);
    const mois = new Date(S.date).getUTCMonth(), prev = M.calendrier[M.semaine - 1];
    if ((mois === 0 || mois === 3) && (!prev || new Date(prev.date).getUTCMonth() !== mois)){
      const L = U.effectif.map(id => M.joueurs[id]).filter(j => j.contrat.fin <= M.saison);
      if (L.length) Q().message(M, 'Contrats en fin de saison', `${L.map(nomJ).join(', ')} ${L.length > 1 ? 'partiront' : 'partira'} libre${L.length > 1 ? 's' : ''} en fin de saison sans prolongation (fiche du joueur).`, 'staff');
    }
    if (M.semaine % 4 === 3) rapportEntrainement(M);
    const N = M.calendrier[M.semaine + 1];
    if (mercatoOuvert(S) && N && !mercatoOuvert(N)) Q().message(M, 'Le mercato ferme', `Dernière semaine de transferts${new Date(S.date).getUTCMonth() === 0 ? ' avant l\'été' : ' avant janvier'}. Les agents libres restent disponibles.`, 'mercato');
  }
  for (const j of Object.values(M.joueurs)) if (j.joue) j.joue = 0;
}
function avantSaison(M, r){
  /* primes de classement */
  for (const L of Object.values(M.ligues)){
    Q().classement(M, L.id).forEach((row, k) => {
      const c = club(M, row.id), prime = arrondi(Math.pow(17 - (k + 1), 1.5) * ECO.prime, 1000);
      compter(c, 'rec', 'primes', prime);
      if (estJoueur(M, c.id)) Q().message(M, 'Prime de classement', `${k + 1}${k ? 'e' : 'er'} de la ligue : ${euros(prime)} versés au club.`, 'pres');
    });
  }
  for (const c of Object.values(M.clubs)){ c.fin.derniere = c.fin.saison; c.fin.saison = finVide(); }
  /* contrats qui se terminent */
  const partis = [];
  for (const c of Object.values(M.clubs)){
    /* v94 : l'ordinateur garde ses meilleurs joueurs et ses jeunes prometteurs (avant : 72 % au hasard, d'où des cracks libres) */
    const rang = new Map(c.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => n20(b) - n20(a)).map((j, i) => [j.id, i]));
    for (const id of c.effectif.slice()){
      const j = M.joueurs[id]; if (!j || j.contrat.fin > M.saison) continue;
      const rg = rang.get(id) ?? 99, prometteur = j.age <= 23 && j.cache.pot - n20(j) >= 1.2;
      const garde = j.age >= 34 ? 0.15 : rg < 9 || prometteur ? 0.94 : rg < 13 ? 0.7 : 0.4;
      if (!estJoueur(M, c.id) && r() < garde){ j.contrat = {fin:M.saison + 1 + r.ent(0, 2), sal:Math.max(Math.round(j.contrat.sal * 0.8), salaireDemande(j, c))}; continue; }   // v113 : un joueur qui décline accepte de gagner moins (avant : jamais de baisse)
      if (estJoueur(M, c.id)) partis.push(nomJ(j));
      libererJoueur(M, j);
    }
  }
  if (partis.length) Q().message(M, 'Fins de contrat', `${partis.join(', ')} ${partis.length > 1 ? 'quittent' : 'quitte'} le club libre${partis.length > 1 ? 's' : ''}.`, 'mercato');
  /* agents libres : vieillissement et retraites */
  for (const id of M.libres.slice()){
    const j = M.joueurs[id]; if (!j){ M.libres = M.libres.filter(x => x !== id); continue; }
    j.age++;
    if (j.age >= 34 || (j.age >= 31 && r() < 0.3)){ delete M.joueurs[id]; M.libres = M.libres.filter(x => x !== id); }
  }
  M.offres = [];
}
/* v113 : un club de l'ordinateur qui a plus d'une saison de recettes en caisse investit le surplus dans ses installations
   (avant, la trésorerie gonflait sans fin : ×6 en 25 saisons). Un niveau à la fois, le moins cher d'abord, tant qu'il garde 80 % d'une saison de recettes. */
function investirIA(M, c){
  const res = revenusSaison(c), cfgs = {...EQ.inst, ...(EQ.bat || {})}, cible = borne(Math.floor(1 + (c.rep - 40) / 12) + (c.budget > res * 2.5 ? 1 : 0), 1, 5);   // un club vise les installations de son rang (52 → niveau 2, 64 → 3, 76 → 4, 88 → 5), un cran de plus s'il roule sur l'or
  for (let k = 0; k < 6 && c.budget > res; k++){
    const L = Object.keys(cfgs).filter(t => niv(c, t) < cible).map(t => [t, cfgs[t].base * niv(c, t)]).sort((a, b) => a[1] - b[1]);
    if (!L.length || c.budget - L[0][1] < res * 0.8) break;
    c.inst = c.inst || {}; c.inst[L[0][0]] = niv(c, L[0][0]) + 1; compter(c, 'dep', 'travaux', L[0][1]);
  }
}
/* v113 : usure des installations. À la fin de chaque saison, chaque installation ou bâtiment peut perdre un niveau, d'autant plus
   souvent qu'il est haut : 2 % au niveau 2, 5 % au 3, 9 % au 4, 14 % au 5 (rien au niveau 1, ni pendant des travaux sur ce bâtiment).
   Les gros clubs doivent réinvestir chaque saison ; un petit club, aux bâtiments modestes, s'use très peu. */
const USURE = [0, 0, 0.02, 0.053, 0.093, 0.139];
function user(M, c, r){
  const cfgs = {...EQ.inst, ...(EQ.bat || {})}, perdus = [];
  for (const k of Object.keys(cfgs)){
    const n = niv(c, k); if (n <= 1 || (c.travaux || []).some(t => t.type === k)) continue;
    if (r() < USURE[n]){ c.inst = c.inst || {}; c.inst[k] = n - 1; perdus.push([k, n - 1]); }
  }
  if (perdus.length && estJoueur(M, c.id)){
    const nom = k => ((D.BATIMENTS || []).find(x => x[0] === k) || D.INSTALLATIONS.find(x => x[0] === k) || [k, k])[1];
    Q().message(M, perdus.length > 1 ? 'Installations usées' : `Usure : ${nom(perdus[0][0])}`, `Une saison de plus a laissé des traces : ${perdus.map(([k, n]) => `${nom(k)} redescend au niveau ${n}`).join(', ')}. Les bâtiments de haut niveau s'usent plus vite (14 % de risque par saison au niveau 5) : à rénover dans Club › Domaine.`, 'club');
  }
}
function apresSaison(M, r){
  for (const c of Object.values(M.clubs)){
    user(M, c, r);
    if (!estJoueur(M, c.id)){ completerEffectif(M, c, r); investirIA(M, c); }
    c.masseMax = masseMax(c); c.cohesion = Math.max(50, c.cohesion - 10);
  }
  if (aClub(M)){ const U = club(M, M.manager.club), jeunes = [];
    while (U.effectif.length < 12){   // effectif trop court : le centre de formation dépanne
      const b = besoin(M, U), lvl = EQ.niveauMin + (U.rep - 40) / 45 * (EQ.niveauMax - EQ.niveauMin) - 2 + r.gauss() * 0.7;
      const j = Q().creerJoueur(r, r.pondere(D.ORIGINES[U.nat]), b.poste, lvl, r.ent(17, 18), 'j' + (M.prochainId++));
      j.club = U.id; j.num = numLibre(M, U); M.joueurs[j.id] = j; U.effectif.push(j.id); nouveauJoueur(M, j, U); jeunes.push(nomJ(j));
    }
    if (jeunes.length) Q().message(M, 'Des jeunes montent en équipe première', `L'effectif était trop court : ${jeunes.join(', ')} rejoignent le groupe. Pense à recruter (au moins ${ECO.effectifMin} joueurs conseillés).`, 'staff');
    reparerCompo(M, U);
  }
  while (M.libres.length < 30) creerLibre(M, r);
  if (M.libres.length > ECO.libresMax){ M.libres.sort((a, b) => n20(M.joueurs[b]) - n20(M.joueurs[a])); for (const id of M.libres.splice(ECO.libresMax)) delete M.joueurs[id]; }
  M.staffLibres = marcheStaff(M, r);
  if (aClub(M)){ const U = club(M, M.manager.club);
    Q().message(M, 'Mercato d\'été ouvert', `Préparation en août : transferts ouverts jusqu'à la première journée. Solde : ${euros(U.budget)}, masse salariale ${euros(masse(M, U))} / ${euros(U.masseMax)} par semaine.`, 'mercato'); }
}

/* potentiel estimé par le recruteur (1 à 5 étoiles) : moins précis avec un recruteur faible */
function potentielEstime(M, j){
  const U = aClub(M) ? club(M, M.manager.club) : null, rec = (U && U.staff ? U.staff.recruteur.note : 10) + (U && QB() ? QB().bonus(U, 'estimation') : 0);
  const vrai = (j.cache.pot * 5 - 40) / 12, h = Q().melange(j.id, 'pot') % 3 - 1;
  const bruit = j.club === (U && U.id) ? h * 0.3 : h * (rec >= 15 ? 0.3 : rec >= 10 ? 0.8 : 1.4);
  return Math.round(borne(vrai + bruit, 1, 5));
}

root.QMC = {nouveauClub, usure:user, noterCarriere, niv, multInst, entretienInst, compter, finVide, creerStaff, numLibre, transfert, libererJoueur, reparerCompo, progression, completerClub, besoin, initMonde, migrer, semaine, avantSaison, apresSaison, nouveauJoueur, dureeBlessure, salaireDemande, valeur, masse, masseMax, prixRef, remplissage, euros,
            mercatoOuvert, prochaineFenetre, proposerTransfert, accepterOffre, refuserOffre, mettreEnVente, suivre, liberer, coutLiberation, prolonger, embaucher,
            UNITES_GALLION, acheterBalais, reglerPrix, potentielEstime, prixClub, exigenceJoueur, NOMS_REC, NOMS_DEP, ENT_DEFAUT, revenusSaison};
})(typeof window !== 'undefined' ? window : globalThis);
