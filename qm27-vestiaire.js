// mon-ecran-version: 43915239
/* QM27 (v90, lot 7) — vestiaire et mercato, sans affichage. Expose window.QMH et complète window.QMC. Chargé après qm27-domaine.js.
   Vestiaire : ambiance, leaders, clans, mentorat, causeries, presse (La Gazette du sorcier).
   Mercato : attributs connus selon le travail du recruteur, offres par hibou (réponse la semaine suivante, contre-offres, clubs qui doublent),
   clauses (libératoire, pourcentage à la revente, prime au vif d'or), prêts avec ou sans option d'achat, annonce de la promotion des jeunes.
   En option (réglage de la partie) : paris et pots-de-vin, avec le risque d'une enquête du ministère. Sauvegarde v6. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, QMC = root.QMC;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const arrondi = (x, pas) => Math.round(x / pas) * pas;
const euros = x => QMC.euros(x);
const club = (M, id) => M.clubs[id];
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;
const nomJ = j => Q().nomJ(j);
const monClub = M => M.manager && M.manager.club ? club(M, M.manager.club) : null;
const at = (j, k) => Q().at(j, k);
const n20 = j => Q().note20(j, j.poste);
const H = () => (M => M.vest || (M.vest = {conn:{}, hiboux:[], contres:[], paris:[], casier:0, triche:false, presse:{}, annonce:null}));

/* ---------- Connaissance des joueurs (attributs cachés) ---------- */
function connaissance(M, j){
  const U = monClub(M); if (!j) return 0;
  if (U && (j.club === U.id || (U.academie || []).includes(j.id))) return 100;
  if (j.pret && U && (j.pret.de === U.id)) return 100;
  const v = H()(M).conn[j.id];
  if (v != null) return v;
  return U && j.club && club(M, j.club) && club(M, j.club).ligue === U.ligue ? 25 : 10;
}
/* fourchette d'une valeur sur 20 (ou sur 100 avec echelle = 5) selon la connaissance */
function fourchette(M, j, v, cle, echelle = 1){
  const k = connaissance(M, j); if (k >= 100) return [v, v];
  const w = Math.round((100 - k) / 100 * 4 * echelle), d = (Q().melange(j.id, cle) % 3 - 1) * Math.round(w / 3);
  const max = echelle > 1 ? 100 : 20;
  return [borne(v - w + d, 1, max), borne(v + w + d, 1, max)];
}
function connaitre(M, id, plus){ const h = H()(M), j = M.joueurs[id]; if (!j) return; h.conn[id] = Math.min(100, Math.round((connaissance(M, j) + plus) * 10) / 10); }
function connaissanceSemaine(M, S){
  const U = monClub(M); if (!U) return;
  const rec = (U.staff.recruteur || {note:10}).note, vol = root.QMB ? root.QMB.bonus(U, 'estimation') : 0;
  for (const id of U.suivi) connaitre(M, id, 10 * (0.5 + rec / 20) * (1 + vol / 10));
  /* l'adversaire de la semaine : ses titulaires se dévoilent */
  const m = S.matchs.find(x => x.res && (x.dom === U.id || x.ext === U.id));
  if (m){ const adv = club(M, m.dom === U.id ? m.ext : m.dom); if (adv && adv.compo) for (const id of Q().titulaires(adv.compo)) connaitre(M, id, 12); }
  /* les sélectionnables d'un sélectionneur sont suivis par la fédération */
  if (M.manager.selection) for (const j of Object.values(M.joueurs)) if (j.nat === M.manager.selection.nat && j.club && (M.semaine % 4 === 0)) connaitre(M, j.id, 4);
}

/* ---------- Vestiaire : leaders, clans, ambiance, mentorat ---------- */
const CLANS = {ENG:'britanniques', SCO:'britanniques', WAL:'britanniques', IRL:'irlandais', FRA:'français', ITA:'italiens'};
function influence(M, c, j){ return j.age / 3 + at(j, 'det') + at(j, 'con') / 2 + n20(j) / 2 + (c.compo && c.compo.cap === j.id ? 4 : 0); }
function leaders(M, c){ return c.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => influence(M, c, b) - influence(M, c, a)).slice(0, 3); }
function clans(M, c){
  const G = {};
  for (const id of c.effectif){ const j = M.joueurs[id]; if (!j) continue; const k = CLANS[j.nat] || 'autres'; (G[k] = G[k] || []).push(j); }
  return Object.entries(G).filter(([, L]) => L.length >= 2).map(([k, L]) => ({nom:'Les ' + k, joueurs:L, moral:Math.round(L.reduce((s, j) => s + j.moral, 0) / L.length)})).sort((a, b) => b.joueurs.length - a.joueurs.length);
}
function ambiance(M, c){
  const L = c.effectif.map(id => M.joueurs[id]).filter(Boolean); if (!L.length) return 60;
  const lead = new Set(leaders(M, c).map(j => j.id));
  let s = 0, n = 0; for (const j of L){ const w = lead.has(j.id) ? 2.5 : 1; s += j.moral * w; n += w; }
  return Math.round(s / n);
}
/* joueurs qui râlent : bon niveau, ambitieux, peu de temps de jeu */
function mecontents(M, c){
  const S = M.semaine, top = new Set(c.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => n20(b) - n20(a)).slice(0, 10).map(j => j.id));
  return c.effectif.map(id => M.joueurs[id]).filter(j => j && !j.bless && top.has(j.id) && S >= 8 && j.saison.m < (j.saison.mAttendu || 0) && j.cache.amb >= 11);
}
const mentore = (c, j) => !!(c && c.mentors && c.mentors.some(p => p.jeune === j.id && c.effectif.includes(p.mentor)));
function mentorer(M, mentor, jeune){
  const U = monClub(M), a = M.joueurs[mentor], b = M.joueurs[jeune];
  if (!U || !a || !b || a.club !== U.id || b.club !== U.id) return {ok:false, msg:'Les deux joueurs doivent être dans ton effectif.'};
  if (a.age < 26) return {ok:false, msg:'Un mentor doit avoir au moins 26 ans.'};
  if (b.age > 22) return {ok:false, msg:'Le mentorat est pour les joueurs de 22 ans ou moins.'};
  U.mentors = (U.mentors || []).filter(p => p.jeune !== jeune && p.mentor !== mentor && U.effectif.includes(p.mentor) && U.effectif.includes(p.jeune));
  if (U.mentors.length >= 3) return {ok:false, msg:'Trois binômes au plus.'};
  U.mentors.push({mentor, jeune, debut:tic(M)});
  return {ok:true, msg:`${nomJ(a)} prend ${nomJ(b)} sous son aile`};
}
function finMentorat(M, jeune){ const U = monClub(M); if (U) U.mentors = (U.mentors || []).filter(p => p.jeune !== jeune); return {ok:true, msg:'Binôme dissous'}; }
function vestiaireSemaine(M, S, r){
  const U = monClub(M); if (!U) return;
  const h = H()(M), amb = ambiance(M, U), lead = leaders(M, U);
  /* un leader malheureux plombe les autres ; une bonne ambiance soude le groupe */
  if (lead.some(j => j.moral < 40)) for (const id of U.effectif){ const j = M.joueurs[id]; if (j && !lead.includes(j)) j.moral = Math.max(5, j.moral - 1); }
  U.cohesion = borne((U.cohesion || 70) + (amb >= 70 ? 0.5 : amb < 40 ? -0.5 : 0), 30, 100);
  /* temps de jeu attendu pour les meilleurs joueurs */
  const top = U.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => n20(b) - n20(a)).slice(0, 10);
  const jouees = S.matchs.some(m => m.res && (m.dom === U.id || m.ext === U.id));
  if (jouees) for (const j of top) j.saison.mAttendu = (j.saison.mAttendu || 0) + 0.6;
  for (const j of mecontents(M, U)) j.moral = Math.max(5, j.moral - 2);
  /* mentorat : le jeune prend l'état d'esprit du mentor, parfois une manie */
  U.mentors = (U.mentors || []).filter(p => U.effectif.includes(p.mentor) && U.effectif.includes(p.jeune));
  for (const p of U.mentors){ const a = M.joueurs[p.mentor], b = M.joueurs[p.jeune];
    for (const k of ['pro', 'amb']) if (a.cache[k] != null && b.cache[k] != null) b.cache[k] = Math.round((b.cache[k] + (a.cache[k] - b.cache[k]) * 0.03) * 100) / 100;
    if (r() < 0.015){ const ma = Q().manies(a).filter(x => !Q().manies(b).includes(x) && (D.MANIES.find(m => m[0] === x) || [, , ''])[2].includes(b.poste)); if (ma.length && Q().manies(b).length < 2){ b.m.push(ma[0]); Q().message(M, `${nomJ(b)} a appris de ${nomJ(a)}`, `Nouvelle manie : ${(D.MANIES.find(m => m[0] === ma[0]) || [])[1]}.`, 'staff'); } } }
}

/* ---------- Causeries ---------- */
const TONS = [['calme', 'Calme'], ['exigeant', 'Exigeant'], ['encourageant', 'Encourageant']];
const REACTIONS = {bon:['Les joueurs hochent la tête, concentrés.', 'Un murmure d\'approbation parcourt le vestiaire.', 'Les regards s\'allument : le message est passé.'],
  neutre:['Les joueurs écoutent poliment.', 'Quelques hochements de tête, sans plus.'],
  mauvais:['Silence gêné. Le message est mal passé.', 'Certains lèvent les yeux au ciel.', 'Le capitaine fronce les sourcils : trop, c\'est trop.']};
/* moment : 'avant' ou 'tm' ; renvoie {delta (moral d'équipe en match), avis, txt} */
function causerie(M, X, eq, ton, moment){
  const e = X.e[eq], tit = Q().titulaires(e).map(id => M.joueurs[id]).filter(Boolean);
  const caractere = tit.reduce((s, j) => s + (j.cache.pro + at(j, 'det')) / 2, 0) / (tit.length || 1);   // 4 à 19
  const F = [0, 1].map(k => { const t = Q().titulaires(X.e[k]).map(id => M.joueurs[id]).filter(Boolean); return t.reduce((s, j) => s + n20(j), 0) / (t.length || 1); });
  const favori = F[eq] - F[1 - eq], d = X.score[eq] - X.score[1 - eq];
  let v = 0;
  if (moment === 'avant'){
    if (ton === 'calme') v = favori > 0.4 ? 0.6 : 0.15;
    if (ton === 'encourageant') v = favori < -0.4 ? 0.7 : 0.25;
    if (ton === 'exigeant') v = caractere >= 11 ? (favori > 0.4 ? 0.45 : 0.3) : -0.4;
  } else {
    if (ton === 'calme') v = d > 60 ? 0.5 : d < -100 ? -0.2 : 0.2;
    if (ton === 'encourageant') v = d < 0 && d > -150 ? 0.6 : 0.2;
    if (ton === 'exigeant') v = d < -60 ? (caractere >= 11 ? 0.7 : -0.3) : d > 60 ? -0.4 : 0.2;
  }
  const U = club(M, e.id); if (U && root.QMB && root.QMB.a(U, 'tableau')) v *= 1.15;   // tableau noir enchanté
  const avis = v >= 0.4 ? 'bon' : v <= 0 ? 'mauvais' : 'neutre', R = REACTIONS[avis];
  return {delta:Math.round(v * 100) / 100, avis, txt:R[Math.abs(Q().melange(X.t, ton, eq)) % R.length]};
}

/* ---------- Presse et Gazette : v94, déplacé dans qm27-presse.js (window.QMP) ; ces alias gardent l'ancienne interface ---------- */
const questionPresse = (M, X) => root.QMP.questionPresse(M, X);
const repondrePresse = (M, X, k, rep) => { const P = root.QMP.repondre(M, X, +rep); return {ok:true, msg:(P || []).map(p => p[0] + ' ' + (p[1] > 0 ? '+' : '') + p[1]).join(', ')}; };

/* ---------- Offres par hibou, clauses ---------- */
function verifierPlace(M, U, sal, montant){
  if (U.effectif.length >= EQ.eco.effectifMax) return `Effectif complet (${EQ.eco.effectifMax} joueurs) : libère ou vends quelqu'un d'abord.`;
  if (montant > U.budget) return `Pas assez d'argent : le solde est de ${euros(U.budget)}.`;
  if (QMC.masse(M, U) + sal > U.masseMax) return `Le président refuse : la masse salariale passerait à ${euros(QMC.masse(M, U) + sal)} par semaine (limite ${euros(U.masseMax)}).`;
  return null;
}
/* demande de salaire : une clause libératoire ou une prime au vif d'or la font baisser */
const facteurClauses = o => (o.clause ? 0.95 : 1) * (o.primeVif ? 0.92 : 1);
/* o : {j, type:'achat'|'pret', montant, sal, ans, pct, clause (×valeur), primeVif, part, option} */
function envoyerHibou(M, o){
  const j = M.joueurs[o.j], U = monClub(M), S = Q().semaine(M);
  if (!j || !U || j.club === U.id) return {ok:false, msg:'Joueur introuvable.'};
  if (j.pret) return {ok:false, msg:`${nomJ(j)} est déjà prêté : impossible avant la fin de la saison.`};
  if (!j.club && o.type !== 'pret') return resoudre(M, o, true);   // agent libre : il répond tout de suite
  if (!QMC.mercatoOuvert(S)) return {ok:false, msg:'Le mercato est fermé : il ouvre en août et en janvier.'};
  const h = H()(M);
  if (h.hiboux.some(x => x.j === o.j)) return {ok:false, msg:'Un hibou est déjà en route pour ce joueur.'};
  const e = o.type === 'pret' ? verifierPlace(M, U, Math.round(j.contrat.sal * o.part), 0) : verifierPlace(M, U, o.sal, o.montant);
  if (e) return {ok:false, msg:e};
  const suiv = M.calendrier[M.semaine + 1];
  if (!suiv || !QMC.mercatoOuvert(suiv)) return resoudre(M, o, true);   // dernière semaine du mercato : le hibou fait l'aller-retour dans la journée
  h.hiboux.push({...o, id:'h' + (M.prochainId++), envoi:tic(M)});
  return {ok:true, msg:`Hibou envoyé à ${club(M, j.club).nom} : réponse la semaine prochaine`};
}
function resoudre(M, o, direct){
  const j = M.joueurs[o.j], U = monClub(M), r = rng(M, 'hibou', o.j, tic(M)), de = j && j.club ? club(M, j.club) : null;
  const fin = (ok, titre, corps, contre) => { if (!direct || !ok) Q().message(M, titre, corps, 'mercato'); return {ok, msg:direct ? corps : titre, contre}; };
  if (!j || !U) return fin(false, 'Hibou perdu', 'Le joueur n\'est plus disponible.');
  if (j.club === U.id) return fin(false, 'Hibou inutile', `${nomJ(j)} est déjà chez toi.`);
  if (de && !QMC.mercatoOuvert(Q().semaine(M))) return fin(false, `Trop tard pour ${nomJ(j)}`, 'Le mercato a fermé avant le retour du hibou.');
  if (de && de.effectif.length <= EQ.eco.effectifMin) return fin(false, `${de.nom} refuse`, `${de.nom} n'a pas assez de joueurs pour se séparer de ${nomJ(j)}.`);
  if (o.type === 'pret') return resoudrePret(M, o, j, de, U, r, direct);
  const e = verifierPlace(M, U, o.sal, de ? o.montant : 0); if (e) return fin(false, `Offre pour ${nomJ(j)} annulée`, e);
  /* un autre club double la mise */
  if (de && !direct && r() < 0.1){
    const riv = Object.values(M.clubs).filter(c => c.id !== U.id && c.id !== de.id && c.budget > o.montant * 1.3 && c.rep >= U.rep - 5 && c.effectif.length < EQ.eco.effectifMax).sort(() => r() - 0.5)[0];
    if (riv){ const m = arrondi(o.montant * 1.15, 5000); QMC.transfert(M, j.id, riv.id, m, QMC.salaireDemande(j, riv), 2 + (j.age < 27 ? 1 : 0));
      return fin(false, `${nomJ(j)} file à ${riv.nom}`, `Pendant que ton hibou volait, ${riv.nom} a mis ${euros(m)} sur la table. ${de.nom} a accepté.`); }
  }
  if (de){
    const min = arrondi(QMC.prixClub(M, j) * (1 - (o.pct || 0) / 100 * 0.5), 5000);
    if (o.montant < min){ const c = o.montant >= min * 0.85; if (c) ajouterContre(M, {...o, montant:min});
      return fin(false, `Réponse de ${de.nom} pour ${nomJ(j)}`, c ? `${de.nom} accepterait ${euros(min)}${o.pct ? ` avec ${o.pct} % à la revente` : ''}. La contre-offre t'attend dans le mercato (onglet Offres).` : `Offre trop basse : ${de.nom} veut au moins ${euros(min)}.`, c ? {montant:min} : null); }
  }
  const ex = QMC.exigenceJoueur(M, j, U); if (ex.non) return fin(false, `${nomJ(j)} dit non`, ex.non);
  const dem = arrondi(ex.sal * facteurClauses(o), 50);
  if (o.sal < dem){ if (!direct) ajouterContre(M, {...o, sal:dem}); return fin(false, `${nomJ(j)} négocie`, `${nomJ(j)} demande ${euros(dem)} par semaine.${direct ? '' : ' La contre-offre t\'attend dans le mercato (onglet Offres).'}`, {sal:dem}); }
  return signer(M, o, j, de, U, direct);
}
function signer(M, o, j, de, U, direct){
  const ans = j.age >= 32 ? Math.min(2, o.ans) : o.ans;
  QMC.transfert(M, j.id, U.id, de ? o.montant : 0, o.sal, ans);
  if (o.clause) j.contrat.clause = arrondi(QMC.valeur(M, j) * o.clause, 50000);
  if (o.primeVif && j.poste === 'A') j.contrat.primeVif = arrondi(o.sal * 2, 500);
  if (de && o.pct) j.revente = {club:de.id, pct:o.pct};
  connaitre(M, j.id, 100);
  const cl = [j.contrat.clause ? `clause libératoire de ${euros(j.contrat.clause)}` : '', j.contrat.primeVif ? `prime de ${euros(j.contrat.primeVif)} par vif d'or` : '', j.revente ? `${o.pct} % à la revente pour ${de.nom}` : ''].filter(Boolean).join(', ');
  Q().message(M, `${nomJ(j)} signe à ${U.nom}`, `${de ? `Transfert de ${de.nom} pour ${euros(o.montant)}` : 'Agent libre'}, contrat jusqu'en ${M.saison + ans + 1}, ${euros(o.sal)} par semaine${cl ? ' ; ' + cl : ''}.`, 'mercato');
  return {ok:true, msg:`${nomJ(j)} a signé !`};
}
function ajouterContre(M, o){ const h = H()(M); h.contres = h.contres.filter(x => x.j !== o.j); h.contres.push({...o, id:'c' + (M.prochainId++), expire:tic(M) + 2}); }
function accepterContre(M, id){
  const h = H()(M), o = h.contres.find(x => x.id === id); if (!o) return {ok:false, msg:'Contre-offre expirée.'};
  h.contres = h.contres.filter(x => x.id !== id);
  const j = M.joueurs[o.j], U = monClub(M), de = j && j.club ? club(M, j.club) : null;
  if (!j || !U || (de && !QMC.mercatoOuvert(Q().semaine(M)))) return {ok:false, msg:'Trop tard : le mercato est fermé.'};
  if (o.type === 'pret') return pretAccepte(M, o, j, de, U, true);
  const e = verifierPlace(M, U, o.sal, de ? o.montant : 0); if (e) return {ok:false, msg:e};
  const ex = QMC.exigenceJoueur(M, j, U); if (ex.non) return {ok:false, msg:ex.non};
  const dem = arrondi(ex.sal * facteurClauses(o), 50);
  if (o.sal < dem) o.sal = dem;
  return signer(M, o, j, de, U, true);
}
function refuserContre(M, id){ const h = H()(M); h.contres = h.contres.filter(x => x.id !== id); return {ok:true}; }

/* ---------- Prêts ---------- */
function deplacer(M, j, versId){
  const de = club(M, j.club), vers = club(M, versId);
  QMC.noterCarriere(M, j, j.pret && j.pret.de === versId ? 'retour' : 'pret', de.id, versId, 0);   // v94
  de.effectif = de.effectif.filter(x => x !== j.id); if (de.compo) QMC.reparerCompo(M, de); de.aVendre = (de.aVendre || []).filter(x => x !== j.id);
  vers.effectif.push(j.id); j.club = vers.id; j.num = QMC.numLibre(M, vers);
}
function resoudrePret(M, o, j, de, U, r, direct){
  const tit = de.compo && Q().titulaires(de.compo).includes(j.id), rang = de.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => n20(b) - n20(a)).findIndex(x => x.id === j.id);
  const non = msg => { if (!direct) Q().message(M, `Prêt de ${nomJ(j)} refusé`, msg, 'mercato'); return {ok:false, msg}; };
  if (tit) return non(`${de.nom} ne prête pas un titulaire.`);
  if (o.part < 0.75 && rang < 10 && j.age > 23) return non(`${de.nom} veut que tu payes au moins 75 % du salaire de ${nomJ(j)}.`);
  if (o.option && o.option < QMC.valeur(M, j) * 1.05) return non(`${de.nom} veut une option d'achat d'au moins ${euros(arrondi(QMC.valeur(M, j) * 1.1, 5000))}.`);
  return pretAccepte(M, o, j, de, U, direct);
}
function pretAccepte(M, o, j, de, U, direct){
  const e = verifierPlace(M, U, Math.round(j.contrat.sal * o.part), 0); if (e) return {ok:false, msg:e};
  deplacer(M, j, U.id);
  j.pret = {de:de.id, vers:U.id, fin:M.saison, part:o.part, option:o.option || 0, sal:j.contrat.sal};
  connaitre(M, j.id, 100);
  const msg = `${nomJ(j)} est prêté par ${de.nom} jusqu'à la fin de la saison : tu payes ${Math.round(o.part * 100)} % de son salaire${o.option ? `, option d'achat à ${euros(o.option)}` : ''}.`;
  Q().message(M, `${nomJ(j)} arrive en prêt`, msg, 'mercato');
  return {ok:true, msg:`${nomJ(j)} arrive en prêt`};
}
function preter(M, jid){
  const U = monClub(M), j = M.joueurs[jid], r = rng(M, 'preter', jid, tic(M));
  if (!U || !j || j.club !== U.id) return {ok:false, msg:'Joueur introuvable.'};
  if (j.pret) return {ok:false, msg:'Ce joueur est déjà en prêt.'};
  if (!QMC.mercatoOuvert(Q().semaine(M))) return {ok:false, msg:'Le mercato est fermé.'};
  if (U.effectif.length <= EQ.eco.effectifMin) return {ok:false, msg:`Il faut garder au moins ${EQ.eco.effectifMin} joueurs.`};
  const L = Object.values(M.clubs).filter(c => c.id !== U.id && c.effectif.length < EQ.eco.effectifMax - 1 && c.rep <= U.rep + 5 && QMC.masse(M, c) + j.contrat.sal * 0.5 <= c.masseMax * 1.1)
    .map(c => [c, (QMC.besoin ? QMC.besoin(M, c) === j.poste : false) ? 3 : 1]);
  if (!L.length) return {ok:false, msg:'Aucun club ne peut l\'accueillir pour l\'instant.'};
  const c = r.pondere(L.map(([x, w]) => [x.id, w])), dest = club(M, c), part = n20(j) >= 12 ? 1 : n20(j) >= 10 ? 0.75 : 0.5;
  deplacer(M, j, dest.id);
  j.pret = {de:U.id, vers:dest.id, fin:M.saison, part, option:0, sal:j.contrat.sal};
  if (U.compo) QMC.reparerCompo(M, U);
  Q().message(M, `${nomJ(j)} prêté à ${dest.nom}`, `${dest.nom} paye ${Math.round(part * 100)} % de son salaire jusqu'à la fin de la saison. Il reviendra ensuite.`, 'mercato');
  return {ok:true, msg:`${nomJ(j)} prêté à ${dest.nom}`};
}
function leverOption(M, jid){
  const U = monClub(M), j = M.joueurs[jid];
  if (!j || !j.pret || j.pret.vers !== U.id || !j.pret.option) return {ok:false, msg:'Pas d\'option d\'achat pour ce joueur.'};
  if (j.pret.option > U.budget) return {ok:false, msg:`Pas assez d'argent : ${euros(j.pret.option)} nécessaires.`};
  const de = club(M, j.pret.de);
  QMC.compter(U, 'dep', 'achats', j.pret.option); QMC.compter(de, 'rec', 'ventes', j.pret.option);
  j.contrat = {...j.contrat, sal:j.pret.sal, fin:Math.max(j.contrat.fin, M.saison + 2)};
  j.pret = null;
  Q().message(M, `${nomJ(j)} est à toi`, `Option levée : ${euros(j.contrat.sal)} par semaine jusqu'en ${j.contrat.fin + 1}.`, 'mercato');
  return {ok:true, msg:'Option levée'};
}
function retourPrets(M){
  for (const j of Object.values(M.joueurs)) if (j.pret && j.pret.fin < M.saison + 1){
    const p = j.pret, de = club(M, p.de); j.pret = null;
    if (de && j.club !== de.id){ deplacer(M, j, de.id); if (M.manager && (p.de === M.manager.club || p.vers === M.manager.club)) Q().message(M, `Fin du prêt de ${nomJ(j)}`, `${nomJ(j)} retourne à ${de.nom}.`, 'mercato'); }
  }
}
function pretsSemaine(M){
  for (const j of Object.values(M.joueurs)) if (j.pret){
    const p = j.pret, x = p.sal * (1 - p.part), vers = club(M, p.vers), de = club(M, p.de);
    if (vers && de && x > 0){ QMC.compter(vers, 'rec', 'prets', x); QMC.compter(de, 'dep', 'prets', x); }
  }
}

/* ---------- Clauses : libératoire, revente, prime au vif ---------- */
function clausesSemaine(M, S, r){
  const U = monClub(M); if (!U) return;
  for (const id of U.effectif){ const j = M.joueurs[id]; if (!j || !j.contrat) continue;
    if (j.contrat.primeVif && j.saison.v > (j.contrat.vifsPayes || 0)){ const n = j.saison.v - (j.contrat.vifsPayes || 0); QMC.compter(U, 'dep', 'primes', n * j.contrat.primeVif); j.contrat.vifsPayes = j.saison.v; } }
  if (!QMC.mercatoOuvert(S)) return;
  for (const id of U.effectif.slice()){ const j = M.joueurs[id]; if (!j || !j.contrat || !j.contrat.clause || j.pret || r() >= 0.05) continue;
    const c = Object.values(M.clubs).filter(x => x.id !== U.id && x.budget >= j.contrat.clause && x.rep >= U.rep - 5 && x.effectif.length < EQ.eco.effectifMax).sort(() => r() - 0.5)[0];
    if (!c || U.effectif.length <= EQ.eco.effectifMin) continue;
    const m = j.contrat.clause; QMC.transfert(M, j.id, c.id, m, QMC.salaireDemande(j, c), 3); payerRevente(M, j, m, U);
    if (U.compo) QMC.reparerCompo(M, U);
    Q().message(M, `${c.nom} paye la clause de ${nomJ(j)}`, `${euros(m)} versés : ${nomJ(j)} part, tu ne pouvais pas t'y opposer.`, 'mercato'); }
}
function payerRevente(M, j, montant, U){
  if (!j.revente) return; const c = club(M, j.revente.club), x = Math.round(montant * j.revente.pct / 100);
  if (c && x > 0){ QMC.compter(U, 'dep', 'revente', x); QMC.compter(c, 'rec', 'ventes', x); Q().message(M, `Pourcentage à la revente`, `${c.nom} touche ${euros(x)} (${j.revente.pct} %) sur la vente de ${nomJ(j)}.`, 'mercato'); }
  j.revente = null;
}

/* ---------- Promotion des jeunes : annonce un mois avant ---------- */
const QUALITES = [['exceptionnelle', 'une génération exceptionnelle', 1.4, 8], ['prometteuse', 'une génération prometteuse', 0.7, 30], ['moyenne', 'un cru moyen', 0, 45], ['faible', 'une promotion un peu faible', -0.6, 17]];
function annonceSemaine(M, S, r){
  const U = monClub(M), h = H()(M); if (!U) return;
  if (M.semaine === M.calendrier.length - 5 && (!h.annonce || h.annonce.saison !== M.saison)){
    const q = r.pondere(QUALITES.map(x => [x[0], x[3]])), Q2 = QUALITES.find(x => x[0] === q), resp = U.staff.formation || {p:'Le', n:'responsable'};
    h.annonce = {saison:M.saison, q};
    Q().message(M, 'Promotion des jeunes : l\'avis du responsable', `${resp.p} ${resp.n} a vu passer les candidats de cet été : ${Q2[1]}. Ils arriveront au pensionnat après le bilan de la saison.`, 'staff');
  }
}

/* ---------- Paris et pots-de-vin (option) ---------- */
function cote(M, X){ const moi = X.joueur, F = [0, 1].map(k => { const t = Q().titulaires(X.e[k]).map(id => M.joueurs[id]).filter(Boolean); return t.reduce((s, j) => s + n20(j), 0) / (t.length || 1); });
  const p = borne(0.5 + (F[moi] - F[1 - moi]) * 0.12 + (X.domicile && moi === 0 ? 0.04 : -0.02), 0.15, 0.85); return Math.round(1 / p * 0.92 * 100) / 100; }
function parier(M, X, mise){
  const h = H()(M), U = monClub(M); if (!h.triche) return {ok:false, msg:'Les paris sont désactivés (Réglages).'};
  if (!U || mise <= 0 || mise > U.budget) return {ok:false, msg:'Mise impossible.'};
  if (X.pari) return {ok:false, msg:'Pari déjà placé.'};
  const c = cote(M, X); X.pari = {mise, cote:c}; QMC.compter(U, 'dep', 'paris', mise);
  h.paris.push({semaine:M.semaine, saison:M.saison, camp:X.e[X.joueur].id, mise, cote:c, type:'pari'});
  return {ok:true, msg:`${euros(mise)} misés à ${String(c).replace('.', ',')} contre 1 sur ta victoire`};
}
function soudoyer(M, X){
  const h = H()(M), U = monClub(M); if (!h.triche) return {ok:false, msg:'Désactivé (Réglages).'};
  if (X.pot) return {ok:false, msg:'C\'est déjà fait.'};
  const adv = X.e[1 - X.joueur], prix = arrondi(80000 + (adv.rep || 60) * 3000, 10000);
  if (!U || prix > U.budget) return {ok:false, msg:`Il faut ${euros(prix)}.`};
  QMC.compter(U, 'dep', 'divers', prix); adv.gMalus = 0.12; X.pot = prix;
  h.paris.push({semaine:M.semaine, saison:M.saison, camp:X.e[X.joueur].id, mise:prix, type:'pot'});
  return {ok:true, msg:`Le gardien adverse a empoché ${euros(prix)}. Espérons qu'il tienne parole… et sa langue.`};
}
function sanction(M, r, motif){
  const h = H()(M), mg = M.manager, U = monClub(M); h.casier = (h.casier || 0) + 1;
  if (h.casier >= 3){ Q().message(M, 'Envoyé à Azkaban', `${motif} Troisième affaire : le ministère ne plaisante plus. Ton club te licencie et ta réputation s'effondre.`, 'carriere'); if (mg.club) QMC.demissionner(M); mg.rep = Math.max(1, mg.rep - 20); return; }
  const amende = h.casier === 1 ? 200000 : 500000; if (U) QMC.compter(U, 'dep', 'divers', amende);
  mg.rep = Math.max(1, mg.rep - (h.casier === 1 ? 5 : 10)); mg.confiance = borne(mg.confiance - (h.casier === 1 ? 15 : 30), 0, 100);
  Q().message(M, 'Enquête du ministère', `${motif} Amende de ${euros(amende)}, réputation en baisse, président furieux. ${h.casier === 1 ? 'Au prochain écart, ce sera pire.' : 'Encore une affaire et c\'est Azkaban.'}`, 'carriere');
}
function parisSemaine(M, S, r){
  const h = H()(M); if (!h.paris.length) return;
  for (const p of h.paris.filter(x => x.semaine === M.semaine && x.saison === M.saison)){
    const m = S.matchs.find(x => x.res && (x.dom === p.camp || x.ext === p.camp)); if (!m) continue;
    const k = m.dom === p.camp ? 0 : 1, gagne = m.res.score[k] > m.res.score[1 - k], U = monClub(M);
    if (p.type === 'pari' && gagne && U) { QMC.compter(U, 'rec', 'paris', Math.round(p.mise * p.cote)); Q().message(M, 'Pari gagnant', `Le bookmaker te verse ${euros(Math.round(p.mise * p.cote))}.`, 'club'); }
    if (r() < (p.type === 'pot' ? 0.15 : 0.04)) sanction(M, r, p.type === 'pot' ? 'Un gardien a parlé : tu as tenté d\'acheter un match.' : 'Un manager qui parie sur ses propres matchs, ça se voit.');
  }
  h.paris = h.paris.filter(x => !(x.semaine === M.semaine && x.saison === M.saison));
}

/* ---------- Bonus de match (lu par le moteur) ---------- */
function bonusMatch(M, c){ if (!c || !M.manager || M.manager.club !== c.id) return {}; return {moralBase:Math.round((ambiance(M, c) - 60) / 30 * 100) / 100}; }

/* ---------- Branchements ---------- */
const base = {semaine:QMC.semaine, avantSaison:QMC.avantSaison, migrer:QMC.migrer, accepterOffre:QMC.accepterOffre};
Object.assign(QMC, {
  semaine(M, S){
    base.semaine(M, S);
    const r = rng(M, 'vestiaire', tic(M)), h = H()(M);
    /* les hiboux de la semaine dernière reviennent */
    const dus = h.hiboux.filter(x => x.envoi < tic(M)); h.hiboux = h.hiboux.filter(x => x.envoi >= tic(M));
    for (const o of dus) resoudre(M, o, false);
    h.contres = h.contres.filter(x => x.expire > tic(M));
    connaissanceSemaine(M, S); vestiaireSemaine(M, S, r); clausesSemaine(M, S, r); pretsSemaine(M); annonceSemaine(M, S, r); parisSemaine(M, S, r);
  },
  avantSaison(M, r){
    retourPrets(M);
    const U = monClub(M), avant = new Set(U ? (U.academie || []) : []);
    base.avantSaison(M, r);
    const h = H()(M);
    if (U && h.annonce && h.annonce.saison === M.saison - 1){ const q = QUALITES.find(x => x[0] === h.annonce.q); if (q && q[2]) for (const id of U.academie || []) if (!avant.has(id)){ const j = M.joueurs[id]; if (j) j.cache.pot = borne(Math.round((j.cache.pot + q[2]) * 10) / 10, 6, 19.5); } }
    if (U) for (const id of U.effectif){ const j = M.joueurs[id]; if (j && j.contrat) j.contrat.vifsPayes = 0; if (j && j.saison) j.saison.mAttendu = 0; }
  },
  migrer(M){ const v = M.v || 1; base.migrer(M); H()(M); if (M.manager && v < 6) Q().message(M, 'Nouveautés de QM27 : vestiaire et mercato', 'Club › Vestiaire : ambiance, leaders, clans et mentorat. Causeries avant le match et aux temps morts, conférence de presse après (La Gazette du sorcier). Mercato : les attributs des autres joueurs sont des fourchettes tant que ton recruteur ne les a pas vus jouer ; les offres partent par hibou et la réponse arrive la semaine suivante ; clauses (libératoire, revente, prime au vif d\'or) et prêts. En option dans les Réglages : paris et pots-de-vin.', 'club'); M.v = Q().VERSION; },
  accepterOffre(M, oid){ const o = M.offres.find(x => x.id === oid), j = o && M.joueurs[o.j], U = monClub(M); if (j && j.pret) return {ok:false, msg:'Ce joueur est en prêt.'};
    const rv = j && j.revente ? {...j.revente} : null; const res = base.accepterOffre(M, oid); if (res.ok && rv && j){ j.revente = rv; payerRevente(M, j, o.montant, U); } return res; },
  proposerTransfert(M, jid, montant, sal, ans){ return envoyerHibou(M, {j:jid, type:'achat', montant, sal, ans, pct:0, clause:0, primeVif:false}); },
});
if (QMC.NOMS_REC){ QMC.NOMS_REC.prets = 'Prêts (part des salaires)'; QMC.NOMS_REC.paris = 'Paris'; }
if (QMC.NOMS_DEP){ QMC.NOMS_DEP.primes = 'Primes de vif d\'or'; QMC.NOMS_DEP.revente = 'Pourcentages à la revente'; QMC.NOMS_DEP.prets = 'Prêts (part des salaires)'; QMC.NOMS_DEP.paris = 'Paris'; QMC.NOMS_DEP.divers = 'Divers'; }
/* le mentorat accélère la progression du jeune (branché sur les bonus du domaine) */
if (root.QMB){ const mp = root.QMB.multProgression; root.QMB.multProgression = (c, j) => mp(c, j) * (mentore(c, j) ? 1.15 : 1); }
root.QMH = {connaissance, fourchette, connaitre, leaders, clans, ambiance, mecontents, mentorer, finMentorat, mentore, TONS, causerie, questionPresse, repondrePresse,
  envoyerHibou, accepterContre, refuserContre, preter, leverOption, cote, parier, soudoyer, bonusMatch, QUALITES,
  etat:M => H()(M)};
})(typeof window !== 'undefined' ? window : globalThis);
