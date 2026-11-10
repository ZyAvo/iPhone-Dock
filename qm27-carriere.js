// mon-ecran-version: 038772b6
/* QM27 (v85, lot 3) — stade et installations, centre de formation, réputation des clubs, carrière du manager
   (offres d'autres clubs, démission, licenciement, sans club) et double poste de sélectionneur pour le Six Nations.
   Sans affichage : complète window.QMC (qm27-club.js) et s'insère dans ses rendez-vous de la semaine et de la saison. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, K = EQ.carriere, QMC = root.QMC;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const nomJ = j => j ? `${j.p} ${j.n}` : '?';
const euros = x => QMC.euros(x);
const club = (M, id) => M.clubs[id];
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;

/* ---------- Stade et installations ---------- */
function coutTravaux(c, type){
  if (type === 'stade') return EQ.stade.tranche * EQ.stade.coutPlace;
  return EQ.inst[type].base * QMC.niv(c, type);
}
function lancerTravaux(M, type){
  const c = club(M, M.manager.club);
  if (c.travaux.some(t => t.type === type)) return {ok:false, msg:'Des travaux sont déjà en cours ici.'};
  if (type === 'stade' && c.stade + EQ.stade.tranche > EQ.stade.max) return {ok:false, msg:`Le stade ne peut pas dépasser ${EQ.stade.max.toLocaleString('fr-FR')} places.`};
  if (type !== 'stade' && QMC.niv(c, type) >= 5) return {ok:false, msg:'Niveau maximal atteint.'};
  const cout = coutTravaux(c, type);
  if (cout > c.budget) return {ok:false, msg:`Pas assez d'argent : ${euros(cout)} nécessaires.`};
  const sem = type === 'stade' ? EQ.stade.semaines : EQ.inst[type].semaines;
  QMC.compter(c, 'dep', 'travaux', cout);
  c.travaux.push({type, fin:tic(M) + sem, cout});
  return {ok:true, msg:`Travaux lancés : ${sem} semaines`};
}
function travauxSemaine(M){
  for (const c of Object.values(M.clubs)){
    if (!c.travaux || !c.travaux.length) continue;
    for (const t of c.travaux.filter(x => x.fin <= tic(M))){
      if (t.type === 'stade') c.stade += EQ.stade.tranche; else c.inst[t.type] = Math.min(5, QMC.niv(c, t.type) + 1);
      if (M.manager && M.manager.club === c.id){
        const nom = t.type === 'stade' ? `Agrandissement du stade : ${c.stade.toLocaleString('fr-FR')} places` : `${(D.INSTALLATIONS.find(x => x[0] === t.type) || [])[1]} : niveau ${c.inst[t.type]}`;
        Q().message(M, 'Travaux terminés', nom + '.', 'staff');
      }
    }
    c.travaux = c.travaux.filter(x => x.fin > tic(M));
  }
}

/* ---------- Centre de formation ---------- */
function creerJeune(M, r, c){
  const lvl = QMC.niv(c, 'formation'), resp = (c.staff.formation || {note:10}).note;
  const poste = r.pondere([['P', 40], ['B', 25], ['A', 17], ['G', 18]]);
  const j = Q().creerJoueur(r, r.pondere(D.ORIGINES[c.nat]), poste, EQ.niveauMin - 4.2 + 0.3 * lvl + r.gauss() * 0.6, r.ent(15, 16), 'j' + (M.prochainId++));
  const ca = Q().note20(j, poste);
  j.cache.pot = Math.round(borne(8.3 + lvl * 1.25 + resp / 5 + r.gauss() * 1.5, ca + 1, 19.5) * 10) / 10;
  j.acad = 1; j.club = c.id; j.contrat = null; j.num = 0;
  M.joueurs[j.id] = j; c.academie.push(j.id);
  return j;
}
function promotion(M, r, c, n){
  const faits = [];
  for (let k = 0; k < n && c.academie.length < K.academieMax; k++) faits.push(creerJeune(M, r, c));
  return faits;
}
function academieSemaine(M, r){
  const c = M.manager && M.manager.club ? club(M, M.manager.club) : null; if (!c || !c.academie) return;
  const resp = (c.staff.formation || {note:10}).note, prepa = c.staff.prepa.note, focus = ['technique', 'physique', 'tactique'][M.semaine % 3];
  for (const id of c.academie){ const j = M.joueurs[id]; if (j) QMC.progression(M, j, focus, 2, resp, prepa, r, null); }
}
function promouvoir(M, jid){
  const c = club(M, M.manager.club), j = M.joueurs[jid];
  if (!j || !c.academie.includes(jid)) return {ok:false, msg:'Jeune introuvable.'};
  if (c.effectif.length >= EQ.eco.effectifMax) return {ok:false, msg:`Effectif complet (${EQ.eco.effectifMax} joueurs).`};
  c.academie = c.academie.filter(x => x !== jid); j.acad = 0;
  c.effectif.push(jid); j.num = QMC.numLibre(M, c);
  j.contrat = {fin:M.saison + 3, sal:Math.round(QMC.salaireDemande(j, c) * 0.4 / 50) * 50};
  QMC.reparerCompo(M, c);
  return {ok:true, msg:`${nomJ(j)} rejoint l'équipe première`};
}
function libererJeune(M, jid){
  const c = club(M, M.manager.club);
  if (!c.academie.includes(jid)) return {ok:false, msg:'Jeune introuvable.'};
  c.academie = c.academie.filter(x => x !== jid); delete M.joueurs[jid];
  return {ok:true, msg:'Jeune libéré'};
}
function viderAcademie(M, c){ for (const id of c.academie || []) delete M.joueurs[id]; c.academie = []; }
function academieSaison(M, r){
  const c = M.manager && M.manager.club ? club(M, M.manager.club) : null; if (!c) return;
  if (!c.academie) c.academie = [];
  const montes = [], partis = [];
  for (const id of c.academie.slice()){
    const j = M.joueurs[id]; if (!j){ c.academie = c.academie.filter(x => x !== id); continue; }
    j.age++;
    if (j.age >= 19){
      if (c.effectif.length < EQ.eco.effectifMax && Q().note20(j, j.poste) >= EQ.niveauMin - 1.5){ promouvoir(M, id); montes.push(nomJ(j)); }
      else { libererJeune(M, id); partis.push(nomJ(j)); }
    }
  }
  const n = 1 + QMC.niv(c, 'formation'), nouveaux = promotion(M, r, c, n);
  Q().message(M, 'Nouvelle promotion au centre de formation', `${nouveaux.length} jeune${nouveaux.length > 1 ? 's' : ''} de 15-16 ans arrive${nouveaux.length > 1 ? 'nt' : ''} : ${nouveaux.map(j => nomJ(j) + ' (' + D.POSTES[j.poste].nom.toLowerCase() + ')').join(', ')}.${montes.length ? ' Passent pros à 19 ans : ' + montes.join(', ') + '.' : ''}${partis.length ? ' Quittent le centre : ' + partis.join(', ') + '.' : ''}`, 'staff');
}

/* ---------- Réputation des clubs (fin de saison) ---------- */
function reputations(M){
  for (const L of Object.values(M.ligues)){
    const attendu = L.clubs.slice().sort((a, b) => club(M, b).rep - club(M, a).rep);
    Q().classement(M, L.id).forEach((row, k) => {
      const c = club(M, row.id), e = attendu.indexOf(row.id) + 1, avant = c.rep;
      c.rep = Math.round(borne(c.rep + borne((e - (k + 1)) * 0.45, -4, 4) + (k === 0 ? 2 : 0), 30, 95));
      if (M.manager && M.manager.club === c.id && c.rep !== avant) Q().message(M, 'Réputation du club', `${c.nom} passe de ${avant} à ${c.rep} : ${c.rep > avant ? 'le club attire davantage (affluence, sponsors, joueurs)' : 'le club attire un peu moins'}.`, 'pres');
    });
  }
}

/* ---------- Carrière ---------- */
function offresCarriere(M){ return (M.manager.offres = (M.manager.offres || []).filter(o => o.expire > tic(M) && club(M, o.club) && o.club !== M.manager.club)); }
function proposerPoste(M, c, pourquoi){
  const L = offresCarriere(M); if (L.some(o => o.club === c.id)) return;
  L.push({club:c.id, expire:tic(M) + 3, pourquoi});
  Q().message(M, `${c.nom} vous veut`, `${pourquoi} Le poste est à prendre pendant trois semaines (Plus › Carrière).`, 'carriere');
}
function carriereSemaine(M, S, r){
  const mg = M.manager; if (!mg) return;
  offresCarriere(M);
  if (S.type === 'bilan') return;
  if (mg.club){
    if (mg.offres.length >= 2 || r() > K.offreSemaine || mg.rep < 30) return;
    const U = club(M, mg.club);
    const L = Object.values(M.clubs).filter(c => c.id !== U.id && c.rep >= U.rep + 2 && c.rep <= mg.rep + 40);
    const enDifficulte = L.filter(c => { const C = Q().classement(M, c.ligue), k = C.findIndex(x => x.id === c.id); return !C[0].j || k >= 8; });
    const c = r.choix(enDifficulte.length ? enDifficulte : L); if (!c) return;
    proposerPoste(M, c, `Le président de ${c.nom} (réputation ${c.rep}) cherche un nouvel entraîneur et pense à vous.`);
  } else {
    if (mg.offres.length >= 3 || r() > K.chomageOffre) return;
    const L = Object.values(M.clubs).filter(c => c.rep <= mg.rep + 10 && c.rep >= mg.rep - 35);
    const c = r.choix(L.length ? L : Object.values(M.clubs).sort((a, b) => a.rep - b.rep).slice(0, 6)); if (!c) return;
    proposerPoste(M, c, `${c.nom} (réputation ${c.rep}) vient de se séparer de son entraîneur.`);
  }
}
function quitterClub(M){
  const mg = M.manager, c = club(M, mg.club); if (!c) return;
  c.tactique = Q().tactiqueIA(rng(M, 'ia', c.id, tic(M))); c.compo = Q().compoAuto(M, c.id);
  c.aVendre = []; c.suivi = []; c.entrainement = QMC.ENT_DEFAUT(); viderAcademie(M, c);
  M.offres = [];
  const p = (mg.postes || []).find(x => x.club === c.id && x.fin == null); if (p) p.fin = M.saison;
  mg.club = null; mg.objectif = null;
}
function prendreClub(M, clubId){
  const mg = M.manager, c = club(M, clubId), r = rng(M, 'poste', clubId, tic(M));
  mg.club = clubId; mg.confiance = 60; mg.bilan = {g:0, n:0, p:0}; mg.objectif = Q().objectif(M, clubId);
  c.tactique = Q().TACTIQUE_DEFAUT(); c.compo = Q().compoAuto(M, clubId); c.entrainement = QMC.ENT_DEFAUT();
  c.aVendre = []; c.suivi = []; c.progres = {}; if (!c.academie || !c.academie.length){ c.academie = []; promotion(M, r, c, 2 + QMC.niv(c, 'formation')); }
  (mg.postes = mg.postes || []).push({club:clubId, debut:M.saison});
  mg.offres = [];
  Q().message(M, `Bienvenue à ${c.nom}`, `Le président vous confie l'équipe. Objectif : ${mg.objectif.txt.toLowerCase()}. Solde du club : ${euros(c.budget)}.`, 'pres');
}
function accepterPoste(M, clubId){
  const mg = M.manager, o = offresCarriere(M).find(x => x.club === clubId);
  if (!o) return {ok:false, msg:'Offre expirée.'};
  const ancien = mg.club ? club(M, mg.club).nom : null;
  if (mg.club) quitterClub(M);
  prendreClub(M, clubId);
  if (ancien) Q().message(M, `Départ de ${ancien}`, 'Vous quittez le club pour un nouveau défi. Les supporters ne vous oublieront pas (enfin, pas tout de suite).', 'carriere');
  return {ok:true, msg:`Nouveau club : ${club(M, clubId).nom}`};
}
function refuserPoste(M, clubId){ M.manager.offres = offresCarriere(M).filter(x => x.club !== clubId); return {ok:true}; }
function demissionner(M){
  const mg = M.manager; if (!mg.club) return {ok:false, msg:'Vous êtes déjà sans club.'};
  const nom = club(M, mg.club).nom;
  quitterClub(M); mg.rep = Math.max(1, Math.round((mg.rep - 3) * 10) / 10);
  Q().message(M, 'Démission', `Vous quittez ${nom}. Les offres arriveront dans les semaines qui viennent (« Avancer d'une semaine » sur l'accueil).`, 'carriere');
  return {ok:true, msg:'Démission enregistrée'};
}
function verifierLicenciement(M){
  const mg = M.manager; if (!mg || !mg.club) return;
  if (mg.confiance > K.licenciement || M.semaine < 8) return;
  const nom = club(M, mg.club).nom;
  quitterClub(M); mg.rep = Math.max(1, Math.round((mg.rep - 4) * 10) / 10); mg.confiance = 50;
  Q().message(M, 'Licencié', `Le président de ${nom} a perdu confiance et met fin à votre contrat. Avancez le temps : des clubs vont se manifester.`, 'carriere');
}

/* ---------- Sélectionneur ---------- */
function forceNations(M){
  return D.SIX_NATIONS.map(n => { const e = Q().selection(M, n); const ids = Q().titulaires(e);
    return {n, f:ids.reduce((s, id) => s + Q().note20(M.joueurs[id], ['P', 'B', 'A', 'G'].find(p => e[p].includes(id))), 0) / (ids.length || 1)}; }).sort((a, b) => b.f - a.f).map(x => x.n);
}
function selectionSemaine(M, S, r){
  const mg = M.manager; if (!mg) return;
  if (mg.offreSel && mg.offreSel.expire <= tic(M)) mg.offreSel = null;
  const debutJanvier = new Date(S.date).getUTCMonth() === 0 && !(M.calendrier[M.semaine - 1] && new Date(M.calendrier[M.semaine - 1].date).getUTCMonth() === 0);
  if (!mg.selection && !mg.offreSel && mg.rep >= K.repSelection && ((S.type === 'prepa' && S.semaine === 1) || debutJanvier)){
    const pris = mg.selPassees || [];
    const L = D.SIX_NATIONS.filter(n => !pris.includes(n));
    const nat = mg.club && L.includes(club(M, mg.club).nat) ? club(M, mg.club).nat : r.choix(L.length ? L : D.SIX_NATIONS);
    mg.offreSel = {nat, expire:tic(M) + 4};
    Q().message(M, `La fédération ${D.NATIONS[nat].nom === 'Angleterre' ? 'anglaise' : 'de ' + D.NATIONS[nat].nom} vous appelle`, `Elle vous propose de diriger la sélection pendant le Six Nations, en plus de votre club. Réponse attendue sous quatre semaines (Plus › Carrière).`, 'carriere');
  }
  if (S.type === 'sixn' && S.tour === 5 && mg.selection){
    const nat = mg.selection.nat, k = Q().classement(M, 'sixn').findIndex(x => x.id === nat) + 1, vise = mg.selection.objectif || 3;
    if (k <= vise){ mg.rep = Math.min(100, Math.round((mg.rep + 3 + (k === 1 ? 4 : 0)) * 10) / 10);
      Q().message(M, 'Six Nations : contrat rempli', `${D.NATIONS[nat].nom} termine ${k}${k === 1 ? 'e (vainqueur !)' : 'e'} (objectif : top ${vise}). La fédération vous garde.`, 'carriere'); }
    else if (k >= vise + 2){ (mg.selPassees = mg.selPassees || []).push(nat); mg.selection = null; M.sel = null; mg.rep = Math.max(1, Math.round((mg.rep - 2) * 10) / 10);
      Q().message(M, 'Six Nations : la fédération vous remercie', `${D.NATIONS[nat].nom} termine ${k}e alors que l'objectif était le top ${vise}. Fin du double poste.`, 'carriere'); }
    else Q().message(M, 'Six Nations terminé', `${D.NATIONS[nat].nom} termine ${k}e (objectif : top ${vise}). La fédération reste prudente mais vous garde.`, 'carriere');
  }
}
function accepterSelection(M){
  const mg = M.manager; if (!mg.offreSel) return {ok:false, msg:'Offre expirée.'};
  const nat = mg.offreSel.nat, rang = forceNations(M).indexOf(nat) + 1;
  mg.selection = {nat, depuis:M.saison, objectif:Math.min(6, rang + 1)};
  M.sel = {nat, compo:null, tactique:Q().TACTIQUE_DEFAUT(), perso:false};
  mg.offreSel = null;
  Q().message(M, `Sélectionneur : ${D.NATIONS[nat].nom}`, `Objectif de la fédération : finir dans les ${mg.selection.objectif} premiers du Six Nations. Convocations et consignes dans Club › Sélection.`, 'carriere');
  return {ok:true, msg:`Sélectionneur : ${D.NATIONS[nat].nom}`};
}
function refuserSelection(M){ M.manager.offreSel = null; return {ok:true}; }
function quitterSelection(M){ const mg = M.manager; if (!mg.selection) return {ok:false}; (mg.selPassees = mg.selPassees || []).push(mg.selection.nat); mg.selection = null; M.sel = null; return {ok:true, msg:'Vous quittez la sélection'}; }
/* convocation : celle du joueur si elle est valable, complétée par les meilleurs disponibles */
function convocation(M){
  const nat = M.manager.selection.nat, auto = Q().selection(M, nat);
  const S = M.sel || (M.sel = {nat, compo:null, tactique:Q().TACTIQUE_DEFAUT(), perso:false});
  if (!S.compo || !S.perso) return {compo:auto, changements:[]};
  const ok = id => { const j = M.joueurs[id]; return j && j.nat === nat && !j.bless && j.club && !j.acad; };
  const c = JSON.parse(JSON.stringify(S.compo)), pris = new Set(), chg = [];
  for (const p of ['A', 'G', 'B', 'P']) c[p] = c[p].map(id => { if (ok(id) && !pris.has(id)){ pris.add(id); return id; }
    const n = [...auto[p], ...auto.banc, ...Object.values(M.joueurs).filter(j => ok(j.id)).sort((a, b) => Q().note20(b, p) - Q().note20(a, p)).map(j => j.id)].find(x => ok(x) && !pris.has(x));
    if (n){ pris.add(n); chg.push([id, n]); } return n; }).filter(Boolean);
  c.banc = (c.banc || []).filter(id => ok(id) && !pris.has(id)).slice(0, EQ.banc || 5);
  for (const id of [...auto.banc, ...Q().titulaires(auto)]) if (c.banc.length < (EQ.banc || 5) && ok(id) && !pris.has(id) && !c.banc.includes(id)) c.banc.push(id);
  Q().rolesAuto(M, c, true);
  return {compo:c, changements:chg};
}
function equipeSelection(M){
  const nat = M.manager.selection.nat, {compo, changements} = convocation(M);
  return {id:nat, nom:D.NATIONS[nat].nom, sigle:D.NATIONS[nat].court, couleurs:['#33415c', '#e0e1dd'], tactique:{...M.sel.tactique}, balai:D.BALAIS[4],
          P:compo.P.slice(), B:compo.B.slice(), A:compo.A.slice(), G:compo.G.slice(), banc:compo.banc.slice(), rep:70, roles:{...(compo.roles || {})}, cap:compo.cap, cohesion:60, usure:100, changements};
}
function apresMatchSelection(M, m){
  const mg = M.manager, k = m.dom === mg.selection.nat ? 0 : 1, a = m.res.score[k], b = m.res.score[1 - k];
  mg.rep = Math.round(borne(mg.rep + (a > b ? 0.8 : a < b ? -0.5 : 0.1), 1, 100) * 10) / 10;
}

/* ---------- Rendez-vous ---------- */
const base = {initMonde:QMC.initMonde, semaine:QMC.semaine, avantSaison:QMC.avantSaison, apresSaison:QMC.apresSaison, migrer:QMC.migrer};
function completer3(M){
  for (const c of Object.values(M.clubs)) QMC.completerClub(M, rng(M, 'v85', c.id), c);
  M.tic = M.tic || 0;
  if (M.manager){ const mg = M.manager; mg.offres = mg.offres || []; if (!mg.postes) mg.postes = mg.club ? [{club:mg.club, debut:M.saison}] : [];
    if (mg.club){ const c = club(M, mg.club); if (!c.academie || !c.academie.length){ c.academie = []; promotion(M, rng(M, 'acad', c.id), c, 2 + QMC.niv(c, 'formation')); } }
    if ((M.v || 1) < 3) Q().message(M, 'Nouveautés de QM27 : stade et carrière', `Club › Stade : agrandis le stade, améliore boutique, buvettes, tribunes et centre de formation, qui accueille des jeunes chaque été. Plus › Carrière : offres d'autres clubs, démission et, à partir d'une réputation de ${K.repSelection}, le poste de sélectionneur pendant le Six Nations. Plus › Sauvegardes : la partie se retrouve sur un autre appareil.`, 'club'); }
}
Object.assign(QMC, {
  initMonde(M, r){ base.initMonde(M, r); M.tic = 0; },
  semaine(M, S){
    base.semaine(M, S);
    const r = rng(M, 'carriere', tic(M));
    travauxSemaine(M); academieSemaine(M, r); carriereSemaine(M, S, r); selectionSemaine(M, S, r);
  },
  avantSaison(M, r){ reputations(M); base.avantSaison(M, r); },
  apresSaison(M, r){
    base.apresSaison(M, r); academieSaison(M, r);
    const mg = M.manager;
    if (mg && mg.club && M.histo.length){ const h = M.histo[M.histo.length - 1].manager;
      if (h && h.pos <= h.objectif){ const U = club(M, mg.club), L = Object.values(M.clubs).filter(c => c.id !== U.id && c.rep > U.rep && c.rep <= mg.rep + 45).sort(() => r() - 0.5).slice(0, h.pos <= 3 ? 2 : 1);
        for (const c of L) proposerPoste(M, c, `${c.nom} (réputation ${c.rep}) a suivi votre saison et vous propose de prendre l'équipe.`); } }
  },
  migrer(M){ if (M.v < 2) base.migrer(M); completer3(M); M.v = Q().VERSION; },
  apresChoixClub(M, clubId){ const c = club(M, clubId); c.academie = c.academie || []; if (!c.academie.length) promotion(M, rng(M, 'acad', clubId), c, 2 + QMC.niv(c, 'formation')); M.manager.offres = []; },
  verifierLicenciement, apresMatchSelection, equipeSelection, convocation,
  coutTravaux, lancerTravaux, promouvoir, libererJeune, proposerPoste, accepterPoste, refuserPoste, demissionner, accepterSelection, refuserSelection, quitterSelection, offresCarriere, forceNations,
});
})(typeof window !== 'undefined' ? window : globalThis);
