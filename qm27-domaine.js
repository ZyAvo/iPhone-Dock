// mon-ecran-version: f6a54b5d
/* QM27 (v88, lot 5) — le domaine du club : bâtiments sorciers (niveaux 1 à 5 et améliorations au choix aux niveaux 3 et 5),
   stade en quatre tribunes, Bazar (produits et prix), sponsor maillot et panneaux à négocier, supporters, emprunt à la Banque des Gobelins,
   salle des trophées et palmarès, petits événements. Sans affichage : expose window.QMB (bonus lus par le moteur) et complète window.QMC.
   Chargé après qm27-carriere.js. Sauvegarde v4. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ, QMC = root.QMC;
const Q = () => root.QM;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const arrondi = (x, pas) => Math.round(x / pas) * pas;
const euros = x => QMC.euros(x);
const club = (M, id) => M.clubs[id] || (M.reserve && M.reserve[id]);   // v106 : club sorti du jeu (palmarès)
const rng = (M, ...cle) => Q().hasard(Q().melange(M.graine, ...cle));
const tic = M => M.tic || 0;
const estJoueur = (M, c) => !!(M.manager && c && M.manager.club === c.id);
const BAT = Object.fromEntries(D.BATIMENTS.map(b => [b[0], b]));
const AMEL = {}; for (const b of D.BATIMENTS) for (const n of [3, 5]) for (const a of b[n === 3 ? 5 : 6]) AMEL[a[0]] = {bat:b[0], niv:n, nom:a[1], effet:a[2]};
const cfg = k => EQ.inst[k] || EQ.bat[k];
const niv = (c, k) => QMC.niv(c, k);
const a = (c, x) => !!(c && c.amel && c.amel.includes(x) && (!AMEL[x] || niv(c, AMEL[x].bat) >= AMEL[x].niv));   // v113 : un bâtiment usé sous le niveau d'une amélioration la met en sommeil jusqu'à sa rénovation
const SEM = () => EQ.eco.semaines;

/* ---------- Bonus des bâtiments (lus par le moteur) ---------- */
function bonus(c, k){
  if (!c || !c.inst) return 0;
  const n = b => niv(c, b);
  switch (k){
    case 'blessure': return (n('infirmerie') - 1) * 0.06 + (a(c, 'spa') ? 0.1 : 0);
    case 'recup': return (n('residence') - 1) * 0.04 + (a(c, 'bains') ? 0.25 : 0) + (a(c, 'chambres') ? 0.15 : 0) + (a(c, 'spa') ? 0.1 : 0);
    case 'progression': return (n('aire') - 2) * 0.04;
    case 'progP': return a(c, 'anneaux') ? 0.1 : 0;
    case 'progG': return a(c, 'anneaux') ? 0.1 : 0;
    case 'progB': return a(c, 'cognards') ? 0.15 : 0;
    case 'progA': return a(c, 'vifs') ? 0.2 : 0;
    case 'progJeunes': return a(c, 'jeunes') ? 0.1 : 0;
    case 'progAcad': return a(c, 'terrain') ? 0.25 : 0;
    case 'meteo': return a(c, 'brumes') ? 0.5 : 0;
    case 'balai': return (n('hangar') - 2) * 0.3 + (a(c, 'prototype') ? 1 : 0);
    case 'balaiPrix': return a(c, 'etabli') ? 0.25 : 0;
    case 'usure': return a(c, 'vernis') ? 0.5 : 0;
    case 'cohesion': return (n('salle') - 2) * 0.25 + (a(c, 'tableau') ? 0.5 : 0);
    case 'estimation': return (n('voliere') - 2) * 1.5 + (a(c, 'correspondants') ? 3 : 0);
    case 'prixVendeur': return a(c, 'grandsducs') ? 0.08 : 0;
    case 'salaire': return (a(c, 'agent') ? 0.1 : 0) + (a(c, 'manoir') ? 0.05 : 0);
    case 'domicile': return a(c, 'dragon') ? 0.02 : 0;
    case 'affluence': return a(c, 'ecran') ? 0.04 : 0;
    case 'billetterie': return a(c, 'lanternes') ? 0.1 : 0;
    case 'resto': return (a(c, 'chaudron') ? 0.15 : 0) + (a(c, 'hydromel') ? 0.15 : 0);
    case 'academiePlaces': return a(c, 'dortoirs') ? 2 : 0;
    case 'academieJeunes': return a(c, 'bourses') ? 1 : 0;
    default: return 0;
  }
}
/* durée d'une blessure : infirmerie, serre (blessures légères), guérisseur (graves), thermes */
function ajusterBlessure(c, jours){
  if (!c || !c.inst) return jours;
  let j = jours * (1 - bonus(c, 'blessure'));
  if (a(c, 'serre') && jours <= 10) j -= 3;
  if (a(c, 'guerisseur') && jours > 21) j *= 0.7;
  return Math.max(1, Math.round(j));
}
/* multiplicateur de progression d'un joueur à l'entraînement */
const multProgression = (c, j) => Math.max(0.5, 1 + bonus(c, 'progression') + bonus(c, 'prog' + j.poste) + (j.age <= 21 ? bonus(c, 'progJeunes') : 0));
/* balais du club en match : hangar et prototype */
function balaiDe(c){
  const b = D.BALAIS.find(x => x.id === c.balai) || D.BALAIS[0], p = bonus(c, 'balai');
  return p ? {...b, vit:b.vit + p, man:b.man + p, sta:b.sta + (a(c, 'prototype') ? 1 : 0)} : b;
}
/* rang d'un club dans sa ligue (1 = premier) */
const rang = (M, c) => { const C = Q().classement(M, c.ligue); return C.findIndex(x => x.id === c.id) + 1 || 99; };
/* bonus de match d'une équipe de club : avantage du terrain, carte du ciel, prophétie, météo, portraits */
function bonusMatch(M, c, adv){
  if (!c || !c.inst) return {};
  const o = {domBonus:bonus(c, 'domicile'), meteoRes:bonus(c, 'meteo')};
  if (a(c, 'astres') && adv && M.semaine > 2 && rang(M, adv) <= 4) o.forceBonus = 0.015;
  if (a(c, 'prophetie')) o.vifBonus = 0.03;
  if (a(c, 'portraits')) o.moralDom = 0.5;
  return o;
}
const bonusAffluence = (M, c) => bonus(c, 'affluence') + (c.dom ? (c.dom.supp - 60) / 500 : 0);

/* ---------- Mise en place (nouvelle partie, migration v4, nouveau club du joueur) ---------- */
function completerClub(M, c){
  const n = borne(1 + Math.floor((c.rep - 40) / 15), 1, 4);
  c.inst = c.inst || {};
  for (const k of Object.keys(EQ.bat)) if (c.inst[k] == null) c.inst[k] = k === 'trophees' || k === 'divination' ? Math.max(1, n - 1) : n;
  if (!c.amel) c.amel = [];
}
function assurer(M){
  if (!M.manager || !M.manager.club) return null;
  const c = club(M, M.manager.club); completerClub(M, c);
  if (!c.dom){
    const r = rng(M, 'dom', c.id), q = Math.round(c.stade / 2000) * 2000;
    const lg = arrondi(q * 0.32, 500), ct = arrondi(q * 0.18, 500);
    c.dom = {supp:EQ.supporters.depart, sponsor:null, offresSponsor:[], panneaux:[], offresPanneaux:[], produits:{}, pret:null, potion:-99, cote:'N',
             trib:{N:lg, S:lg, E:ct, O:c.stade - 2 * lg - ct}, evenements:[]};
    for (const p of D.PRODUITS.slice(0, 4)) c.dom.produits[p[0]] = {actif:true, prix:'normal'};
    offresSponsor(M, c, r); offresPanneaux(M, c, r);
    /* le club a déjà un sponsor en cours : on prend l'offre la plus sûre jusqu'à la fin de saison */
    signerSponsor(M, 0, true);
    for (let i = 0; i < Math.min(placesPanneaux(c), c.dom.offresPanneaux.length) - 1; i++) signerPanneau(M, 0, true);
  }
  const t = c.dom.trib, tot = t.N + t.S + t.E + t.O;
  if (tot !== c.stade){ t[c.dom.cote] = Math.max(0, t[c.dom.cote] + c.stade - tot); }
  return c;
}

/* ---------- Partenaires : sponsor maillot et panneaux ---------- */
const totalSponsors = c => EQ.eco.sponsors + Math.pow(c.rep / 85, 2) * EQ.eco.sponsorsRep;
function offresSponsor(M, c, r){
  const base = totalSponsors(c) * EQ.partenaires.maillot, noms = D.SPONSORS.slice().sort(() => r() - 0.5);
  const v = (x, p) => arrondi(x, p);
  c.dom.offresSponsor = [
    {nom:noms[0], style:'Sécurité', fixe:v(base * (0.98 + r() * 0.06), 5000), victoire:0, objectif:0, ans:1 + Math.floor(r() * 3)},
    {nom:noms[1], style:'Équilibre', fixe:v(base * 0.75, 5000), victoire:v(base * 0.3 / 15, 500), objectif:v(base * 0.12, 5000), ans:1 + Math.floor(r() * 3)},
    {nom:noms[2], style:'Ambition', fixe:v(base * 0.5, 5000), victoire:v(base * 0.5 / 15, 500), objectif:v(base * 0.35, 5000), ans:1 + Math.floor(r() * 2)},
  ];
}
function signerSponsor(M, i, silence){
  const c = assurer(M), o = c.dom.offresSponsor[i]; if (!o) return {ok:false, msg:'Offre introuvable.'};
  if (c.dom.sponsor && c.dom.sponsor.fin >= M.saison && !silence) return {ok:false, msg:'Le contrat actuel court encore.'};
  c.dom.sponsor = {...o, debut:M.saison, fin:M.saison + o.ans - 1}; c.dom.offresSponsor = [];
  return {ok:true, msg:`${o.nom} sur le maillot jusqu'en ${M.saison + o.ans}`};
}
const placesPanneaux = c => EQ.partenaires.panneauxBase + 2 * niv(c, 'tribunes');
function offresPanneaux(M, c, r){
  const n = placesPanneaux(c) + 3, prix = totalSponsors(c) * EQ.partenaires.panneaux / placesPanneaux(c), pris = new Set([...(c.dom.panneaux || []).map(p => p.nom), c.dom.sponsor && c.dom.sponsor.nom]);
  const noms = D.SPONSORS.filter(x => !pris.has(x)).sort(() => r() - 0.5);
  c.dom.offresPanneaux = noms.slice(0, n).map(nom => ({nom, montant:arrondi(prix * (0.7 + r() * 0.6), 1000), ans:1 + Math.floor(r() * 2)})).sort((x, y) => y.montant - x.montant);
}
function signerPanneau(M, i){
  const c = assurer(M), o = c.dom.offresPanneaux[i]; if (!o) return {ok:false, msg:'Offre introuvable.'};
  if (c.dom.panneaux.length >= placesPanneaux(c)) return {ok:false, msg:'Plus de place autour du terrain : améliore le stade.'};
  c.dom.panneaux.push({...o, fin:M.saison + o.ans - 1}); c.dom.offresPanneaux.splice(i, 1);
  return {ok:true, msg:`Panneau vendu à ${o.nom}`};
}
function retirerPanneau(M, i){ const c = assurer(M), p = c.dom.panneaux[i]; if (!p) return {ok:false}; c.dom.panneaux.splice(i, 1); return {ok:true, msg:`Panneau de ${p.nom} retiré`}; }

/* ---------- Bazar : produits et prix ---------- */
const PRIX = {bas:{p:0.8, v:1.15, supp:0.06}, normal:{p:1, v:1, supp:0}, haut:{p:1.3, v:0.85, supp:-0.1}};
const produitsDispo = c => D.PRODUITS.filter(p => !p[4] || a(c, p[4]));
const placesRayon = c => 2 + niv(c, 'boutique');
const ATTRAIT_REF = 3.9;   // les 4 produits de départ
function recetteProduit(c, p, st){ const base = Math.pow(c.rep / 85, 2.5) * EQ.eco.merch / SEM() * QMC.multInst(c, 'boutique') * (a(c, 'hibou') ? 1.2 : 1);
  const x = PRIX[st.prix] || PRIX.normal; return base * p[2] / ATTRAIT_REF * x.p * x.v; }
function recettesBazar(c){
  const act = produitsDispo(c).filter(p => c.dom.produits[p[0]] && c.dom.produits[p[0]].actif).slice(0, placesRayon(c));
  const brut = act.reduce((s, p) => s + recetteProduit(c, p, c.dom.produits[p[0]]), 0), att = act.reduce((s, p) => s + p[2], 0);
  return att ? brut * Math.pow(att / ATTRAIT_REF, 0.75) / (att / ATTRAIT_REF) : 0;   // rendements décroissants
}
function reglerProduit(M, id, champ, v){
  const c = assurer(M), p = D.PRODUITS.find(x => x[0] === id); if (!p || (p[4] && !a(c, p[4]))) return {ok:false, msg:'Produit indisponible.'};
  const st = c.dom.produits[id] = c.dom.produits[id] || {actif:false, prix:'normal'};
  if (champ === 'actif'){
    if (v && !st.actif && Object.entries(c.dom.produits).filter(([k, s]) => s.actif && produitsDispo(c).some(q => q[0] === k)).length >= placesRayon(c)) return {ok:false, msg:`Rayons pleins : ${placesRayon(c)} produits au niveau ${niv(c, 'boutique')} du Bazar.`};
    st.actif = !!v;
  } else if (champ === 'prix' && PRIX[v]) st.prix = v;
  return {ok:true};
}

/* ---------- Banque des Gobelins ---------- */
const plafondPret = c => arrondi(QMC.revenusSaison(c) * EQ.banque.maxRevenus, 50000);
const tauxPret = c => Math.round(borne(EQ.banque.tauxMin + (70 - c.rep) / 600 + (c.budget < 0 ? 0.02 : 0), EQ.banque.tauxMin, EQ.banque.tauxMax) * 1000) / 1000;
function emprunter(M, montant, saisons){
  const c = assurer(M); if (c.dom.pret) return {ok:false, msg:'Un emprunt est déjà en cours.'};
  montant = arrondi(montant, 50000); saisons = borne(Math.round(saisons), 1, 3);
  if (montant <= 0 || montant > plafondPret(c)) return {ok:false, msg:`La banque prête au plus ${euros(plafondPret(c))}.`};
  const t = tauxPret(c), du = Math.round(montant * (1 + t * saisons)), sem = saisons * SEM();
  c.dom.pret = {capital:montant, taux:t, du, reste:du, hebdo:Math.ceil(du / sem), fin:tic(M) + sem};
  QMC.compter(c, 'rec', 'emprunt', montant);
  return {ok:true, msg:`${euros(montant)} empruntés à ${(t * 100).toFixed(1).replace('.', ',')} % par an`};
}
function rembourser(M){
  const c = assurer(M), p = c.dom.pret; if (!p) return {ok:false, msg:'Aucun emprunt.'};
  const solde = Math.round(p.reste * (1 + EQ.banque.frais) - (p.du - p.capital) * (p.reste / p.du));   // les intérêts restants ne sont pas dus, petits frais
  if (solde > c.budget) return {ok:false, msg:`Pas assez d'argent : ${euros(solde)} nécessaires.`};
  QMC.compter(c, 'dep', 'pret', solde); c.dom.pret = null;
  return {ok:true, msg:'Emprunt remboursé'};
}

/* ---------- Palmarès et salle des trophées ---------- */
const anciensCache = {};
function palmaresAncien(M){
  const k = M.graine + ':' + (M.histo[0] ? M.histo[0].saison : M.saison); if (anciensCache[k]) return anciensCache[k];
  const debut = M.histo[0] ? +M.histo[0].saison.slice(0, 4) : M.saison, L = [];
  for (const lg of Object.values(M.ligues)){
    const cl = Object.values(M.clubs).filter(c => c.ligue === lg.id);
    for (let an = debut - 20; an < debut; an++){ const r = rng(M, 'palmares', lg.id, an); L.push({saison:`${an}-${String(an + 1).slice(2)}`, ligue:lg.id, club:r.pondere(cl.map(c => [c.id, Math.pow(c.rep, 3)]))}); }
  }
  return anciensCache[k] = L;
}
function titres(M, c){
  const L = palmaresAncien(M).filter(x => x.club === c.id).map(x => ({saison:x.saison, titre:`Champion · ${Q().ligueDe(M, x.ligue).court}`, ancien:true}));
  for (const h of M.histo) for (const [lg, id] of Object.entries(h.champions || {})) if (id === c.id) L.push({saison:h.saison, titre:`Champion · ${Q().ligueDe(M, lg).court}`, ancien:false});
  return L.sort((x, y) => x.saison < y.saison ? 1 : -1);
}
const visites = (M, c) => niv(c, 'trophees') * (900 + 250 * titres(M, c).length) * (a(c, 'fantome') ? 1.5 : 1) * (a(c, 'musee') ? 2 : 1);

/* ---------- Travaux et améliorations ---------- */
function coutBat(c, type){ return type === 'stade' ? EQ.stade.tranche * EQ.stade.coutPlace : cfg(type).base * niv(c, type); }
function lancer(M, type, cote){
  const c = assurer(M);
  if (type === 'stade' && cote && c.dom.trib[cote] != null) c.dom.cote = cote;
  return QMC.lancerTravaux(M, type);
}
function amelEnAttente(c, bat){
  const b = BAT[bat]; if (!b) return null;
  for (const n of [3, 5]) if (niv(c, bat) >= n && !(b[n === 3 ? 5 : 6]).some(x => a(c, x[0]))) return n;
  return null;
}
function choisirAmel(M, cle){
  const c = assurer(M), x = AMEL[cle]; if (!x) return {ok:false, msg:'Amélioration inconnue.'};
  if (amelEnAttente(c, x.bat) !== x.niv) return {ok:false, msg:'Ce choix n\'est pas disponible.'};
  c.amel.push(cle);
  if (cle === 'dortoirs' || cle === 'bourses') {}   // effets lus par le centre de formation
  return {ok:true, msg:`${x.nom} : c'est fait`};
}
function potion(M, jid){
  const c = assurer(M), j = M.joueurs[jid];
  if (!a(c, 'apothicaire')) return {ok:false, msg:'Il faut l\'apothicaire attitré (infirmerie niveau 5).'};
  if (tic(M) - c.dom.potion < 4) return {ok:false, msg:`Prochaine potion dans ${4 - (tic(M) - c.dom.potion)} semaine(s).`};
  if (!j || j.club !== c.id) return {ok:false, msg:'Joueur introuvable.'};
  j.forme = Math.min(10, Math.round((j.forme + 2) * 10) / 10); c.dom.potion = tic(M);
  return {ok:true, msg:`Potion de forme pour ${j.p} ${j.n} : forme ${j.forme}`};
}

/* ---------- La semaine du domaine ---------- */
function finances(M, c, S, m, aff){
  const n = SEM();
  /* tous les clubs : visites de la salle des trophées */
  QMC.compter(c, 'rec', 'visites', visites(M, c) * (estJoueur(M, c) ? 1 : 0.8));
  if (!estJoueur(M, c) || !c.dom) return;
  const d = c.dom, dom = m && m.ligue !== 'sixn' && m.dom === c.id, gagne = m && m.res && (m.dom === c.id ? m.res.score[0] > m.res.score[1] : m.res.score[1] > m.res.score[0]);
  /* sponsor maillot et panneaux */
  if (d.sponsor){ QMC.compter(c, 'rec', 'sponsors', d.sponsor.fixe / n); if (gagne && m.ligue !== 'sixn' && d.sponsor.victoire) QMC.compter(c, 'rec', 'sponsors', d.sponsor.victoire); }
  for (const p of d.panneaux) QMC.compter(c, 'rec', 'panneaux', p.montant / n);
  if (a(c, 'fabricant')) QMC.compter(c, 'rec', 'sponsors', 80000 / n);
  /* Bazar */
  QMC.compter(c, 'rec', 'merch', recettesBazar(c));
  /* loges, banquets, taverne ouverte */
  if (dom && a(c, 'loges')) QMC.compter(c, 'rec', 'vip', c.rep * 450);
  if (dom && gagne && a(c, 'banquets')) QMC.compter(c, 'rec', 'vip', c.rep * 300);
  if (!dom && a(c, 'ouverte')) QMC.compter(c, 'rec', 'restauration', c.stade * 0.12 * (EQ.eco.repasBase + c.rep / 60) * QMC.multInst(c, 'buvettes'));
  /* emprunt */
  if (d.pret){ const x = Math.min(d.pret.hebdo, d.pret.reste); QMC.compter(c, 'dep', 'pret', x); d.pret.reste -= x;
    if (d.pret.reste <= 0){ d.pret = null; Q().message(M, 'Emprunt remboursé', 'La Banque des Gobelins a reçu la dernière échéance. Le club ne lui doit plus rien.', 'pres'); } }
}
function supportersSemaine(M, c, S){
  const d = c.dom, m = S.matchs.find(x => x.res && (x.dom === c.id || x.ext === c.id) && x.ligue !== 'sixn');
  let v = (EQ.supporters.equilibre - d.supp) * 0.04;
  if (m){ const k = m.dom === c.id ? 0 : 1, g = Math.sign(m.res.score[k] - m.res.score[1 - k]), adv = club(M, k ? m.dom : m.ext);
    v += g > 0 ? 2.5 + (adv.rep - c.rep) / 25 : g < 0 ? -2.5 + (adv.rep - c.rep) / 30 : 0;
    if (m.res.vif === k) v += 0.5; }
  const ref = Math.round(6 + c.rep / 10); v -= Math.max(0, c.prix / ref - 1) * 3; v += Math.max(0, 1 - c.prix / ref) * 1.5;
  for (const [id, st] of Object.entries(d.produits)) if (st.actif && D.PRODUITS.some(p => p[0] === id)) v += PRIX[st.prix].supp;
  if (a(c, 'hydromel')) v += 0.2;
  if (a(c, 'legendes') && M.semaine % 4 === 0) v += 1;
  const avant = d.supp; d.supp = Math.round(borne(d.supp + v, 0, 100) * 10) / 10;
  M.manager.confiance = Math.round(borne(M.manager.confiance + (d.supp - 50) / 250, 0, 100) * 10) / 10;
  if (avant >= 30 && d.supp < 30) Q().message(M, 'Les supporters grondent', 'Les tribunes sifflent et le forum du club s\'enflamme : résultats, prix des places, boutique… Il faut leur redonner envie.', 'pres');
  if (avant < 80 && d.supp >= 80) Q().message(M, 'Ferveur dans les tribunes', 'Les supporters sont aux anges : chants, écharpes, guichets fermés. Le président apprécie.', 'pres');
}
function evenement(M, c, r){
  if (r() >= EQ.evenements) return;
  const e = D.EVENEMENTS[Math.floor(r() * D.EVENEMENTS.length)];
  QMC.compter(c, e[2] >= 0 ? 'rec' : 'dep', e[2] >= 0 ? 'divers' : 'travaux', Math.abs(e[2]));
  Q().message(M, e[0], `${e[1]} ${e[2] >= 0 ? '+' : '−'}${euros(Math.abs(e[2]))}.`, 'club');
}
function semaine(M, S){
  const c = assurer(M); if (!c) return;
  const r = rng(M, 'domaine', tic(M));
  const m = S.matchs.find(x => x.res && x.ligue !== 'sixn' && (x.dom === c.id || x.ext === c.id));
  if (m){ const k = m.dom === c.id ? 0 : 1, g = Math.sign(m.res.score[k] - m.res.score[1 - k]);
    if (a(c, 'pensine')) c.cohesion = Math.min(100, (c.cohesion || 70) + 1);
    if (g < 0 && a(c, 'cheminee')) for (const id of c.effectif){ const j = M.joueurs[id]; if (j) j.moral = Math.min(100, j.moral + 4); } }
  if (a(c, 'jardin')) for (const id of c.effectif){ const j = M.joueurs[id]; if (j) j.moral = Math.round(j.moral + (65 - j.moral) * 0.1); }
  supportersSemaine(M, c, S);
  evenement(M, c, r);
  /* améliorations à choisir */
  for (const b of D.BATIMENTS){ const n = amelEnAttente(c, b[0]); const cle = b[0] + n;
    if (n && !(c.dom.prevenu || []).includes(cle)){ (c.dom.prevenu = c.dom.prevenu || []).push(cle); Q().message(M, `${b[1]} : une amélioration à choisir`, `Le niveau ${n} est atteint. Ouvre le bâtiment dans le Domaine pour choisir entre ${(b[n === 3 ? 5 : 6]).map(x => x[1]).join(' et ')}.`, 'club'); } }
}
function avantSaison(M){
  const c = assurer(M); if (!c) return;
  const r = rng(M, 'partenaires', M.saison), d = c.dom, h = M.histo[M.histo.length - 1];
  /* prime d'objectif du sponsor, contrats qui se terminent */
  if (d.sponsor && h && h.manager && h.manager.club === c.id && h.manager.pos <= h.manager.objectif && d.sponsor.objectif){
    QMC.compter(c, 'rec', 'sponsors', d.sponsor.objectif); Q().message(M, 'Prime du sponsor', `${d.sponsor.nom} verse ${euros(d.sponsor.objectif)} : l'objectif de la saison est atteint.`, 'pres'); }
  if (a(c, 'archives') && h && Object.values(h.champions || {}).includes(c.id)){ c.rep = Math.min(99, c.rep + 1); d.supp = Math.min(100, d.supp + 5); }
  if (d.sponsor && d.sponsor.fin < M.saison + 1){ Q().message(M, 'Fin du contrat de sponsor', `Le contrat avec ${d.sponsor.nom} se termine. Trois marques proposent de prendre sa place (Domaine › Bureau du président › Partenaires).`, 'pres'); d.sponsor = null; }
  d.panneaux = d.panneaux.filter(p => p.fin >= M.saison + 1);
  if (!d.sponsor) offresSponsor(M, c, r);
  offresPanneaux(M, c, r);
}
function apresSaison(M){
  const c = assurer(M); if (!c) return;
  if (!c.dom.sponsor && c.dom.offresSponsor.length) Q().message(M, 'Un sponsor à choisir', 'Le maillot n\'a pas de sponsor pour la saison qui commence. Trois offres attendent (Domaine › Bureau du président › Partenaires).', 'pres');
}

/* ---------- Branchements ---------- */
const base = {nouveauClub:QMC.nouveauClub, initMonde:QMC.initMonde, semaine:QMC.semaine, avantSaison:QMC.avantSaison, apresSaison:QMC.apresSaison, migrer:QMC.migrer, apresChoixClub:QMC.apresChoixClub};
function completer4(M, v){
  for (const c of Object.values(M.clubs)) completerClub(M, c);
  assurer(M);
  if (M.manager && v < 4) Q().message(M, 'Nouveautés de QM27 : le domaine du club', 'Club › Domaine : un plan du domaine avec douze bâtiments à améliorer (infirmerie, aire d\'envol, volière, salle des trophées…), chacun avec deux améliorations à choisir aux niveaux 3 et 5. Le stade se construit tribune par tribune ; le Bazar vend les produits de ton choix au prix que tu fixes ; sponsor maillot et panneaux se négocient ; les supporters ont leur humeur ; la Banque des Gobelins prête de l\'argent.', 'club');
}
Object.assign(QMC, {
  initMonde(M, r){ base.initMonde(M, r); for (const c of Object.values(M.clubs)) completerClub(M, c); },
  nouveauClub(M, r, c){ base.nouveauClub(M, r, c); completerClub(M, c); },
  semaine(M, S){ base.semaine(M, S); semaine(M, S); },
  avantSaison(M, r){ base.avantSaison(M, r); avantSaison(M); },
  apresSaison(M, r){ base.apresSaison(M, r); apresSaison(M); },
  migrer(M){ const v = M.v || 1; base.migrer(M); completer4(M, v); M.v = Q().VERSION; },
  apresChoixClub(M, clubId){ if (base.apresChoixClub) base.apresChoixClub(M, clubId); assurer(M); },
});
root.QMB = {bonus, ajusterBlessure, multProgression, balaiDe, bonusMatch, bonusAffluence, finances, assurer, coutBat, lancer, amelEnAttente, choisirAmel, potion,
  signerSponsor, signerPanneau, retirerPanneau, placesPanneaux, reglerProduit, produitsDispo, placesRayon, recettesBazar, recetteProduit, PRIX,
  emprunter, rembourser, plafondPret, tauxPret, titres, visites, rang, BAT, AMEL, a};
})(typeof window !== 'undefined' ? window : globalThis);
