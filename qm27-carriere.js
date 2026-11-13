// mon-ecran-version: b3e5b3c9
/* QM27 (v85, lot 3) — stade et installations, centre de formation, réputation des clubs, carrière du manager
   (offres d'autres clubs, démission, licenciement, sans club) et double poste de sélectionneur pour le Tournoi des Six Emblèmes.
   Sans affichage : complète window.QMC (qm27-club.js) et s'insère dans ses rendez-vous de la semaine et de la saison. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, K = EQ.carriere, QMC = root.QMC;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const nomJ = j => j ? `${j.p} ${j.n}` : '?';
const euros = x => QMC.euros(x);
const club = (M, id) => M.clubs[id] || (M.reserve && M.reserve[id]);   // v106 : club sorti du jeu (palmarès)
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;

/* ---------- Stade et installations ---------- */
function coutTravaux(c, type){
  if (type === 'stade') return EQ.stade.tranche * EQ.stade.coutPlace;
  return (EQ.inst[type] || EQ.bat[type]).base * QMC.niv(c, type);   // v88 : bâtiments du domaine
}
function lancerTravaux(M, type){
  const c = club(M, M.manager.club);
  if (c.travaux.some(t => t.type === type)) return {ok:false, msg:'Des travaux sont déjà en cours ici.'};
  if (type === 'stade' && c.stade + EQ.stade.tranche > EQ.stade.max) return {ok:false, msg:`Le stade ne peut pas dépasser ${EQ.stade.max.toLocaleString('fr-FR')} places.`};
  if (type !== 'stade' && QMC.niv(c, type) >= 5) return {ok:false, msg:'Niveau maximal atteint.'};
  const cout = coutTravaux(c, type);
  if (cout > c.budget) return {ok:false, msg:`Pas assez d'argent : ${euros(cout)} nécessaires.`};
  const sem = type === 'stade' ? EQ.stade.semaines : (EQ.inst[type] || EQ.bat[type]).semaines;
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
        const nom = t.type === 'stade' ? `Agrandissement du stade : ${c.stade.toLocaleString('fr-FR')} places` : `${((D.BATIMENTS || []).find(x => x[0] === t.type) || D.INSTALLATIONS.find(x => x[0] === t.type) || [])[1]} : niveau ${c.inst[t.type]}`;
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
  const max = K.academieMax + (root.QMB ? root.QMB.bonus(c, 'academiePlaces') : 0);   // v88 : dortoirs
  for (let k = 0; k < n && c.academie.length < max; k++) faits.push(creerJeune(M, r, c));
  return faits;
}
function academieSemaine(M, r){
  const c = M.manager && M.manager.club ? club(M, M.manager.club) : null; if (!c || !c.academie) return;
  const resp = (c.staff.formation || {note:10}).note, prepa = c.staff.prepa.note, focus = ['technique', 'physique', 'tactique'][M.semaine % 3];
  const mult = root.QMB ? Math.max(0.5, 1 + root.QMB.bonus(c, 'progression') + root.QMB.bonus(c, 'progAcad')) : 1;   // v88 : aire d'envol, terrain miniature
  for (const id of c.academie){ const j = M.joueurs[id]; if (j) QMC.progression(M, j, focus, 2, resp, prepa, r, null, mult); }
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
  const n = 1 + QMC.niv(c, 'formation') + (root.QMB ? root.QMB.bonus(c, 'academieJeunes') : 0), nouveaux = promotion(M, r, c, n);
  if (root.QMB && root.QMB.a(c, 'detection') && nouveaux.length){   // v88 : réseau de détection, un prodige par été
    const p = nouveaux.reduce((x, y) => y.cache.pot > x.cache.pot ? y : x); p.cache.pot = Math.min(19.5, Math.round((p.cache.pot + 2) * 10) / 10); p.prodige = 1; }
  Q().message(M, 'Nouvelle promotion au centre de formation', `${nouveaux.length} jeune${nouveaux.length > 1 ? 's' : ''} de 15-16 ans arrive${nouveaux.length > 1 ? 'nt' : ''} : ${nouveaux.map(j => nomJ(j) + ' (' + D.POSTES[j.poste].nom.toLowerCase() + ')').join(', ')}.${montes.length ? ' Passent pros à 19 ans : ' + montes.join(', ') + '.' : ''}${partis.length ? ' Quittent le centre : ' + partis.join(', ') + '.' : ''}`, 'staff');
}

/* ---------- Réputation des clubs (fin de saison) ---------- */
function reputations(M){
  for (const L of Object.values(M.ligues)){
    const attendu = L.clubs.slice().sort((a, b) => club(M, b).rep - club(M, a).rep);
    Q().classement(M, L.id).forEach((row, k) => {
      const c = club(M, row.id), e = attendu.indexOf(row.id) + 1, avant = c.rep;
      /* v113 : stature du club. Chaque club a un socle (sa réputation de départ) vers lequel la réputation revient doucement (15 % de l'écart
         par saison) : sans lui, les surprises des petits clubs tassaient toute la hiérarchie vers le haut en vingt saisons. Le socle ne bouge
         pas pour les hauts et bas ordinaires (±8) ; au-delà, il suit la réputation (10 % de l'excédent par saison) : un club relevé
         durablement par un manager change de statut et le garde, un géant qui s'effondre plusieurs saisons perd le sien. */
      if (c.socle == null) c.socle = c.rep;
      const x = c.rep + borne((e - (k + 1)) * 0.5, -4, 6) + (k === 0 ? 2 : 0);   // une belle surprise rapporte jusqu'à +6
      c.rep = Math.round(borne(x + (c.socle - x) * 0.15, 30, 95));
      const ecart = c.rep - c.socle;
      if (Math.abs(ecart) > 8) c.socle = Math.round((c.socle + (ecart - Math.sign(ecart) * 8) * 0.1) * 10) / 10;
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
  if (root.QMN) return root.QMN.parForce(M);   // v106 : les 19 sélections
  return D.SIX_NATIONS.map(n => { const e = Q().selection(M, n); const ids = Q().titulaires(e);
    return {n, f:ids.reduce((s, id) => s + Q().note20(M.joueurs[id], ['P', 'B', 'A', 'G'].find(p => e[p].includes(id))), 0) / (ids.length || 1)}; }).sort((a, b) => b.f - a.f).map(x => x.n);
}
function selectionSemaine(M, S, r){
  const mg = M.manager; if (!mg) return;
  if (mg.offreSel && mg.offreSel.expire <= tic(M)) mg.offreSel = null;
  const debutJanvier = new Date(S.date).getUTCMonth() === 0 && !(M.calendrier[M.semaine - 1] && new Date(M.calendrier[M.semaine - 1].date).getUTCMonth() === 0);
  if (!mg.selection && !mg.offreSel && mg.rep >= K.repSelection && ((S.type === 'prepa' && S.semaine === 1) || debutJanvier)){
    const pris = mg.selPassees || [];
    const L = D.SELECTIONS.filter(n => !pris.includes(n));   // v106 : toutes les sélections
    const nat = mg.club && L.includes(club(M, mg.club).nat) ? club(M, mg.club).nat : r.choix(L.length ? L : D.SELECTIONS);
    mg.offreSel = {nat, expire:tic(M) + 4};
    Q().message(M, `La fédération ${D.NATIONS[nat].nom === 'Angleterre' ? 'anglaise' : 'de ' + D.NATIONS[nat].nom} vous appelle`, `Elle vous propose de diriger la sélection, en plus de votre club : les matchs amicaux des trêves internationales et, un été sur deux, la ${D.LDN.nom}. Réponse attendue sous quatre semaines (Plus › Carrière).`, 'carriere');
  }
  if (S.tour === 5 && mg.selection){
    const nat = mg.selection.nat, k = Q().classement(M, 'sixn').findIndex(x => x.id === nat) + 1, vise = mg.selection.objectif || 3;
    if (k <= vise){ mg.rep = Math.min(100, Math.round((mg.rep + 3 + (k === 1 ? 4 : 0)) * 10) / 10);
      Q().message(M, 'Six Emblèmes : contrat rempli', `${D.NATIONS[nat].nom} termine ${k}${k === 1 ? 'e (vainqueur !)' : 'e'} (objectif : top ${vise}). La fédération vous garde.`, 'carriere'); }
    else if (k >= vise + 2){ (mg.selPassees = mg.selPassees || []).push(nat); mg.selection = null; M.sel = null; mg.rep = Math.max(1, Math.round((mg.rep - 2) * 10) / 10);
      Q().message(M, 'Six Emblèmes : la fédération vous remercie', `${D.NATIONS[nat].nom} termine ${k}e alors que l'objectif était le top ${vise}. Fin du double poste.`, 'carriere'); }
    else Q().message(M, 'Six Emblèmes terminé', `${D.NATIONS[nat].nom} termine ${k}e (objectif : top ${vise}). La fédération reste prudente mais vous garde.`, 'carriere');
  }
}
function accepterSelection(M){
  const mg = M.manager; if (!mg.offreSel) return {ok:false, msg:'Offre expirée.'};
  const nat = mg.offreSel.nat, rang = forceNations(M).indexOf(nat) + 1;
  mg.selection = {nat, depuis:M.saison, objectif:Math.min(6, rang + 1), vise:viseLdn(rang)};
  M.sel = {nat, compo:null, tactique:Q().TACTIQUE_DEFAUT(), perso:false};
  mg.offreSel = null;
  Q().message(M, `Sélectionneur : ${D.NATIONS[nat].nom}`, `Objectif de la fédération pour la ${D.LDN.nom} : ${TXT_VISE[mg.selection.vise]}. Convocations et consignes dans Club › Sélection.`, 'carriere');
  return {ok:true, msg:`Sélectionneur : ${D.NATIONS[nat].nom}`};
}
/* v106 : objectif à la Ligue des nations selon le rang de force parmi les 19 sélections (2 = finale, 4 = demies, 8 = quarts, 19 = bonne figure) */
const viseLdn = rang => rang <= 2 ? 2 : rang <= 4 ? 4 : rang <= 8 ? 8 : 19;
const ECHELONS = [1, 2, 4, 8, 19];   // vainqueur, finale, demies, quarts, groupes
const TXT_VISE = {2:'atteindre la finale', 4:'atteindre les demi-finales', 8:'sortir des groupes', 19:'faire bonne figure'};
/* appelé par qm27-nations.js après chaque étape de la Ligue des nations : bilan quand la sélection du joueur est éliminée ou après la finale */
function bilanSelection(M, S){
  const mg = M.manager, sel = mg && mg.selection, L = M.ldn; if (!sel || !L || L.saison !== M.saison || sel.bilanLdn === M.saison) return;
  const n = sel.nat, so = L.sortie[n], e = S.etape, fini = e === 'f' || (e === 'g5' && so === 'g') || (e === 'qf' && so === 'qf') || (e === 'sf' && so === 'sf');
  if (!fini) return;
  sel.bilanLdn = M.saison;
  const k = root.QMN.RANG_SORTIE[so] || 19, vise = sel.vise || viseLdn(forceNations(M).indexOf(n) + 1), quoi = root.QMN.SORTIE[so].toLowerCase(), nomN = D.NATIONS[n].nom;
  const parcours = so === 'v' ? 'remporte la compétition !' : so === 'g' ? 'sort en phase de groupes' : so === 'f' ? 'perd en finale' : `atteint les ${quoi}`;
  if (k <= vise){ mg.rep = Math.min(100, Math.round((mg.rep + 3 + (k === 1 ? 4 : 0)) * 10) / 10);
    Q().message(M, `${D.LDN.nom} : contrat rempli`, `${nomN} ${parcours} (objectif : ${TXT_VISE[vise]}). La fédération vous garde.`, 'carriere'); }
  else if (ECHELONS.indexOf(k) - ECHELONS.indexOf(vise) >= 2){   // deux tours en dessous de l'objectif (mg.selPassees = mg.selPassees || []).push(n); mg.selection = null; M.sel = null; mg.rep = Math.max(1, Math.round((mg.rep - 2) * 10) / 10);
    Q().message(M, `${D.LDN.nom} : la fédération vous remercie`, `${nomN} ${parcours} alors que l'objectif était de ${TXT_VISE[vise]}. Fin du double poste.`, 'carriere'); }
  else Q().message(M, `${D.LDN.nom} terminée`, `${nomN} ${parcours} (objectif : ${TXT_VISE[vise]}). La fédération reste prudente mais vous garde.`, 'carriere');
  sel.vise = viseLdn(forceNations(M).indexOf(n) + 1);   // objectif de la prochaine édition
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
          P:compo.P.slice(), B:compo.B.slice(), A:compo.A.slice(), G:compo.G.slice(), banc:compo.banc.slice(), rep:70, roles:{...(compo.roles || {})}, cap:compo.cap, pen:compo.pen, cohesion:60, usure:100, changements};
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
    if ((M.v || 1) < 3) Q().message(M, 'Nouveautés de QM27 : stade et carrière', `Club › Stade : agrandis le stade, améliore boutique, buvettes, tribunes et centre de formation, qui accueille des jeunes chaque été. Plus › Carrière : offres d'autres clubs, démission et, à partir d'une réputation de ${K.repSelection}, le poste de sélectionneur pendant le Tournoi des Six Emblèmes. Plus › Sauvegardes : la partie se retrouve sur un autre appareil.`, 'club'); }
}
Object.assign(QMC, {
  bilanSelection,
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
