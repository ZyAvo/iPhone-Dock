// mon-ecran-version: e15c30af
/* QM27 (v83, lot 2 : v84) — moteur du jeu, sans affichage : window.QM.
   Monde (ligues, clubs, joueurs), calendrier de la saison, simulation des matchs pas à pas (15 s de jeu par pas),
   classements, fin de saison, sauvegarde. Le même code tourne dans la page et dans outils/dev/qm27-essai.mjs.
   Hasard à graine : un match = une graine + deux compositions + deux tactiques ; mêmes entrées, même match. */
(function(root){
'use strict';
const D = root.QMD;
const EQ = D.EQ;
const VERSION = 2;   // v84 : contrats, staff, finances, entraînement (qm27-club.js) ; une sauvegarde v1 est complétée au chargement
const C = () => root.QMC;   // gestion du club (qm27-club.js), facultative pour le moteur

/* ---------- Hasard à graine (mulberry32) ---------- */
function hasard(graine){
  let a = (graine >>> 0) || 1;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.ent = (min, max) => min + Math.floor(r() * (max - min + 1));
  r.choix = L => L[Math.floor(r() * L.length)];
  r.gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  r.pondere = paires => { const tot = paires.reduce((s, p) => s + p[1], 0); let x = r() * tot; for (const [v, w] of paires){ x -= w; if (x < 0) return v; } return paires[paires.length - 1][0]; };
  r.etat = () => a; r.reprendre = e => { a = e >>> 0; };
  return r;
}
const melange = (...n) => { let h = 2166136261; for (const x of n){ const s = String(x); for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return h >>> 0; };
const borne = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- Attributs et notes ---------- */
const ATT = D.ATTRS.map(a => a[0]);
const IDX = Object.fromEntries(ATT.map((k, i) => [k, i]));
const GIDX = Object.fromEntries(D.GARDIEN.map((g, i) => [g[0], i]));
const POIDS = {};
['P', 'B', 'A', 'G'].forEach((p, pi) => { POIDS[p] = D.ATTRS.map(a => a[3][pi] === '●' ? 3 : a[3][pi] === '○' ? 1 : 0); });
const at = (j, k) => j.a[IDX[k]];
const ga = (j, k) => j.g[GIDX[k]];
/* note d'un joueur à un poste, sur 20 (le gardien compte aussi son bloc, poids 3) */
function note20(j, poste){
  const w = POIDS[poste]; let s = 0, n = 0;
  for (let i = 0; i < w.length; i++){ s += j.a[i] * w[i]; n += w[i]; }
  if (poste === 'G'){ for (const v of j.g){ s += v * 3; n += 3; } }
  return s / n;
}
const note = (j, poste) => Math.round(note20(j, poste || j.poste) * 5);   // affichage sur 100
const meilleurPoste = j => ['P', 'B', 'A', 'G'].reduce((b, p) => note20(j, p) > note20(j, b) ? p : b, j.poste);

/* ---------- Création du monde ---------- */
function creerJoueur(r, nat, poste, niveau, age, id){
  const N = D.NOMS[nat];
  const w = POIDS[poste];
  const a = ATT.map((k, i) => {
    const base = w[i] === 3 ? niveau + 0.6 : w[i] === 1 ? niveau - 1.6 : niveau - 4.5;
    return Math.round(borne(base + r.gauss() * 1.7, 1, 20));
  });
  const g = D.GARDIEN.map(() => Math.round(borne((poste === 'G' ? niveau + 0.8 : niveau - 7) + r.gauss() * 1.6, 1, 20)));
  const ca = note20({a, g}, poste);
  const jeune = age <= 21 ? (22 - age) * 0.8 : age <= 24 ? 1 : 0;
  const pot = Math.round(borne(ca + jeune + Math.abs(r.gauss()) * 1.8, ca, 19.5) * 10) / 10;
  const c = () => r.ent(4, 18);
  return {id, p:r.choix(N.p), n:r.choix(N.n), nat, age, poste, a, g,
          cache:{pot, reg:c(), pro:c(), amb:c(), frag:c(), gm:c(), ada:c(), loy:c()},
          forme:6, fat:0, moral:60, bless:null, club:null, num:0,
          saison:{m:0, b:0, v:0, cog:0, arr:0, notes:0}};
}
const AGE = r => borne(Math.round(26 + r.gauss() * 4), 17, 36);
const EFFECTIF = ['P', 'P', 'P', 'B', 'B', 'A', 'G', 'P', 'P', 'P', 'B', 'B', 'A', 'G', 'P', 'B'];   // 16 joueurs : 7 titulaires + 9

function nouveauMonde(graine){
  graine = (graine >>> 0) || (Date.now() >>> 0);
  const r = hasard(graine);
  const M = {v:VERSION, graine, saison:2026, semaine:0, joueurs:{}, clubs:{}, ligues:{}, calendrier:[], sixn:{tab:{}, matchs:[]},
             manager:null, boite:[], histo:[], prochainId:1, dernierMatch:null, emplacement:null};
  for (const L of D.LIGUES) M.ligues[L.id] = {id:L.id, nom:L.nom, court:L.court, clubs:[]};
  for (const [id, nom, ville, nat, ligue, rep, c1, c2, stade] of D.CLUBS){
    const club = {id, nom, ville, nat, ligue, rep, couleurs:[c1, c2], stade, effectif:[], compo:null, tactique:tactiqueIA(r), balai:balaiPour(rep),
                  sigle:sigle(nom, ville), budget:Math.round(rep * rep * 900 / 1000) * 1000};
    M.clubs[id] = club; M.ligues[ligue].clubs.push(id);
    const niveau = EQ.niveauMin + (rep - 40) / 45 * (EQ.niveauMax - EQ.niveauMin);
    EFFECTIF.forEach((poste, i) => {
      const nat2 = r.pondere(D.ORIGINES[nat]);
      const titulaire = i < 7;
      const lvl = niveau + (titulaire ? 0.6 : -0.9) + r.gauss() * 0.9;
      const j = creerJoueur(r, nat2, poste, lvl, AGE(r), 'j' + (M.prochainId++));
      j.club = id; j.num = i + 1; M.joueurs[j.id] = j; club.effectif.push(j.id);
    });
    club.compo = compoAuto(M, id);
  }
  M.calendrier = calendrierSaison(M, r);
  remettreClassements(M);
  if (C()) C().initMonde(M, r);
  return M;
}
function sigle(nom, ville){ const v = ville.normalize('NFD').replace(/[^\w]/g, '').toUpperCase(); return v.slice(0, 3); }
function balaiPour(rep){ return rep >= 80 ? 'aquilon' : rep >= 70 ? 'strix' : rep >= 60 ? 'sirocco' : rep >= 52 ? 'mistral' : rep >= 46 ? 'albatros' : 'zephyr'; }
function tactiqueIA(r){
  return {rythme:r.ent(1, 3), risque:r.ent(1, 3), agressivite:r.ent(1, 3), passes:r.choix(['court', 'long']), pressing:r.choix(['haut', 'repli']),
          cible:r.choix(['poursuiveur', 'poursuiveur', 'attrapeur', 'gardien']), attrapeur:'gagnant', gardien:r.choix(['anneaux', 'sortie'])};
}
const TACTIQUE_DEFAUT = () => ({rythme:2, risque:2, agressivite:2, passes:'court', pressing:'repli', cible:'poursuiveur', attrapeur:'gagnant', gardien:'anneaux'});

/* ---------- Compositions ---------- */
const dispo = (M, id) => { const j = M.joueurs[id]; return j && !j.bless; };
function compoAuto(M, clubId){
  const club = M.clubs[clubId], pris = new Set();
  const ids = club.effectif.filter(id => dispo(M, id));
  const pick = (poste, n) => {
    const L = ids.filter(id => !pris.has(id)).map(id => { const j = M.joueurs[id]; return [id, note20(j, poste) - (j.fat > 70 ? 1.5 : 0) + (j.poste === poste ? 0.4 : 0)]; })
      .sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
    L.forEach(id => pris.add(id)); return L;
  };
  const c = {A:pick('A', 1), G:pick('G', 1), B:pick('B', 2), P:pick('P', 3)};
  const banc = [...pick('P', 2), ...pick('B', 1), ...pick('A', 1), ...pick('G', 1), ...pick('P', 2)];
  c.banc = banc.slice(0, 7);
  rolesAuto(M, c);
  return c;
}
/* v84 : rôles individuels (gardés par joueur) et capitaine, choisis d'après les attributs quand ils manquent */
const ROLE_DEF = {P:'polyvalent', B:'equilibre', A:'equilibre', G:'equilibre'};
const roleValide = (poste, r) => (D.ROLES[poste] || []).some(x => x[0] === r);
function roleAuto(j, poste){
  if (poste === 'P'){ const m = at(j, 'pas') + at(j, 'vis'), f = at(j, 'tir') + at(j, 'pre'), h = at(j, 'int') + at(j, 'bou');
    const top = Math.max(m, f, h); return top - Math.min(m, f, h) < 3 ? 'polyvalent' : top === f ? 'finisseur' : top === m ? 'meneur' : 'harceleur'; }
  if (poste === 'B'){ const d = at(j, 'ant') + at(j, 'pla'), o = at(j, 'fra') + at(j, 'agr'); return Math.abs(d - o) < 3 ? 'equilibre' : d > o ? 'protecteur' : 'chasseur'; }
  if (poste === 'A'){ const v = at(j, 'vit') + at(j, 'piq'), t = at(j, 'dec') + at(j, 'san'); return Math.abs(v - t) < 3 ? 'equilibre' : v > t ? 'chasseur' : 'tacticien'; }
  return j.g && ga(j, 'sor') >= ga(j, 'arr') ? 'libero' : j.g && ga(j, 'arr') - ga(j, 'sor') >= 3 ? 'ligne' : 'equilibre';
}
function rolesAuto(M, c, garder){
  const ancien = garder ? (c.roles || {}) : {};
  c.roles = {};
  for (const p of ['P', 'B', 'A', 'G']) for (const id of c[p]){ const j = M.joueurs[id]; if (!j) continue; c.roles[id] = roleValide(p, ancien[id]) ? ancien[id] : roleAuto(j, p); }
  const tit = titulaires(c).filter(id => M.joueurs[id]);
  if (!garder || !tit.includes(c.cap)) c.cap = tit.slice().sort((a, b) => { const x = M.joueurs[a], y = M.joueurs[b]; return (at(y, 'det') + at(y, 'con') + y.age / 4) - (at(x, 'det') + at(x, 'con') + x.age / 4); })[0] || null;
  return c;
}
const titulaires = c => [...c.P, ...c.B, ...c.A, ...c.G];
/* composition du joueur vérifiée avant un match : un titulaire blessé est remplacé (renvoie la liste des changements) */
function verifierCompo(M, clubId){
  const club = M.clubs[clubId];
  if (!club.compo){ club.compo = compoAuto(M, clubId); return []; }
  const c = club.compo, faits = [], dans = id => club.effectif.includes(id), utilises = new Set();
  for (const poste of ['A', 'G', 'B', 'P']) for (const id of c[poste]) if (dans(id) && dispo(M, id)) utilises.add(id);
  for (const poste of ['A', 'G', 'B', 'P']){
    c[poste] = c[poste].map(id => {
      if (dans(id) && dispo(M, id)) return id;
      const v = x => note20(M.joueurs[x], poste) + (c.banc.includes(x) ? 0.3 : 0);
      const n = club.effectif.filter(x => dispo(M, x) && !utilises.has(x)).sort((a, b) => v(b) - v(a))[0];
      if (!n) return id;
      utilises.add(n); faits.push([id, n]); return n;
    });
  }
  const tit = new Set(titulaires(c));
  const banc = c.banc.filter(id => dans(id) && !tit.has(id) && dispo(M, id));
  for (const id of club.effectif) if (banc.length < 7 && !tit.has(id) && !banc.includes(id) && dispo(M, id)) banc.push(id);
  c.banc = banc.slice(0, 7);
  rolesAuto(M, c, true);
  return faits;
}

/* ---------- Calendrier ---------- */
function roundRobin(ids, r){
  const L = ids.slice(); for (let i = L.length - 1; i > 0; i--){ const k = Math.floor(r() * (i + 1)); [L[i], L[k]] = [L[k], L[i]]; }
  const n = L.length, tours = [];
  for (let t = 0; t < n - 1; t++){
    const m = [];
    for (let i = 0; i < n / 2; i++){ const a = L[i], b = L[n - 1 - i]; m.push(t % 2 === 0 ? [a, b] : [b, a]); }
    tours.push(m); L.splice(1, 0, L.pop());
  }
  return [...tours, ...tours.map(t => t.map(([a, b]) => [b, a]))];
}
const jour = (an, mois, j) => Date.UTC(an, mois, j);
function calendrierSaison(M, r){
  const an = M.saison, S = [];
  const tours = {}; for (const L of Object.values(M.ligues)) tours[L.id] = roundRobin(L.clubs, r);
  /* samedis : journées 1-15 de septembre à décembre, trêve, 16-20 en janvier, Six Nations (février-mars), 21-30 jusqu'à fin mai */
  const samedi = (mois) => { let x = new Date(jour(an, mois, 1)); while (x.getUTCDay() !== 6) x = new Date(x.getTime() + 864e5); return x; };
  let d = samedi(7);                                   // v84 : préparation en août (mercato d'été ouvert)
  const sept = samedi(8);
  for (let k = 1; d < sept; k++){ S.push({date:d.getTime(), type:'prepa', semaine:k, matchs:[]}); d = new Date(d.getTime() + 7 * 864e5); }
  d = sept;
  const plus = n => { d = new Date(d.getTime() + n * 7 * 864e5); };
  let jl = 0;
  const ligue = () => { const m = []; for (const L of Object.values(M.ligues)) for (const [a, b] of tours[L.id][jl]) m.push({id:`${an}-${L.id}-${jl + 1}-${a}`, ligue:L.id, dom:a, ext:b, res:null});
    S.push({date:d.getTime(), type:'ligue', journee:jl + 1, matchs:m}); jl++; plus(1); };
  for (let i = 0; i < 15; i++) ligue();
  plus(2);                                      // trêve des fêtes
  for (let i = 0; i < 5; i++) ligue();
  const nat = D.SIX_NATIONS.slice(), sixTours = roundRobin(nat, hasard(melange(M.graine, an, 'sixn'))).slice(0, 5);
  for (let i = 0; i < 5; i++){
    if (i === 2) plus(1);                       // semaine de repos du tournoi
    S.push({date:d.getTime(), type:'sixn', tour:i + 1, matchs:sixTours[i].map(([a, b]) => { const [x, y] = an % 2 ? [b, a] : [a, b]; return {id:`${an}-sixn-${i + 1}-${x}`, ligue:'sixn', dom:x, ext:y, res:null}; })});
    plus(1);
  }
  for (let i = 0; i < 10; i++) ligue();
  S.push({date:d.getTime(), type:'bilan', matchs:[]});
  return S;
}

/* ---------- Classements ---------- */
const ligneVide = id => ({id, j:0, g:0, n:0, p:0, pm:0, pe:0, vifs:0, pts:0, forme:[]});
function remettreClassements(M){
  M.tables = {};
  for (const L of Object.values(M.ligues)){ M.tables[L.id] = {}; for (const id of L.clubs) M.tables[L.id][id] = ligneVide(id); }
  M.tables.sixn = {}; for (const n of D.SIX_NATIONS) M.tables.sixn[n] = ligneVide(n);
}
function compter(M, m){
  const T = M.tables[m.ligue], a = T[m.dom], b = T[m.ext], [sa, sb] = m.res.score;
  for (const [x, s1, s2, cote] of [[a, sa, sb, 0], [b, sb, sa, 1]]){
    x.j++; x.pm += s1; x.pe += s2; if (m.res.vif === cote) x.vifs++;
    const r = s1 > s2 ? 'g' : s1 < s2 ? 'p' : 'n'; x[r]++; x.pts += r === 'g' ? EQ.points.victoire : r === 'n' ? EQ.points.nul : 0;
    x.forme.push(r.toUpperCase().replace('G', 'V').replace('P', 'D')); if (x.forme.length > 5) x.forme.shift();
  }
}
function classement(M, ligue){
  return Object.values(M.tables[ligue]).sort((a, b) => b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || b.vifs - a.vifs || String(a.id).localeCompare(b.id));
}

/* ---------- Équipes pour un match ---------- */
function equipeClub(M, clubId){
  const club = M.clubs[clubId]; if (!club.compo) club.compo = compoAuto(M, clubId);
  const c = club.compo; if (!c.roles) rolesAuto(M, c, true);
  return {id:clubId, nom:club.nom, sigle:club.sigle, couleurs:club.couleurs, tactique:{...club.tactique}, balai:D.BALAIS.find(b => b.id === club.balai) || D.BALAIS[0],
          P:c.P.slice(), B:c.B.slice(), A:c.A.slice(), G:c.G.slice(), banc:c.banc.slice(), rep:club.rep, roles:{...c.roles}, cap:c.cap,
          cohesion:club.cohesion ?? 70, usure:club.usure ?? 100};
}
function selection(M, nat){
  const L = Object.values(M.joueurs).filter(j => j.nat === nat && !j.bless), pris = new Set();
  const pick = (poste, n) => { const s = L.filter(j => !pris.has(j.id)).sort((a, b) => note20(b, poste) - note20(a, poste)).slice(0, n).map(j => j.id); s.forEach(x => pris.add(x)); return s; };
  const e = {id:nat, nom:D.NATIONS[nat].nom, sigle:D.NATIONS[nat].court, couleurs:['#33415c', '#e0e1dd'], tactique:TACTIQUE_DEFAUT(), balai:D.BALAIS[4],
             A:pick('A', 1), G:pick('G', 1), B:pick('B', 2), P:pick('P', 3), rep:70};
  e.banc = [...pick('P', 2), ...pick('B', 1), ...pick('A', 1), ...pick('G', 1), ...pick('P', 2)];
  rolesAuto(M, e); e.cohesion = 60; e.usure = 100;
  return e;
}

/* ---------- Match ---------- */
function meteoPour(r, date){ const mois = new Date(date).getUTCMonth(); return r.pondere(Object.entries(D.METEO_MOIS(mois))); }
function texte(rt, cle, v){
  const L = D.TEXTES[cle]; if (!L) return '';
  return rt.choix(L).replace(/\{(\w)\}/g, (_, k) => v[k] ?? '');
}
/* Crée un match : M (pour les joueurs), deux équipes, graine, options {date, domicile:true, texte:true} */
function creerMatch(M, e0, e1, graine, opts = {}){
  const r = hasard(graine), rt = hasard(melange(graine, 'texte'));
  const meteo = opts.meteo || meteoPour(r, opts.date || Date.now());
  const X = {graine, e:[e0, e1], score:[0, 0], t:0, pas:0, fini:false, vif:-1, meteo, poss:r() < 0.5 ? 0 : 1, ev:[], evNouv:[],
             stats:[{tirs:0, buts:0, arrets:0, cog:0, fautes:0, pen:0}, {tirs:0, buts:0, arrets:0, cog:0, fautes:0, pen:0}],
             vifApp:(EQ.vifApparitionMin + r() * (EQ.vifApparitionMax - EQ.vifApparitionMin) + (meteo === 'brouillard' ? 6 : 0)) * 60,
             vifVu:false, vifCache:0, vifDepuis:0, sonne:[0, 0], gSonne:[0, 0], tm:[2, 2], rempl:[3, 3], moral:[0, 0],
             perf:{}, fat:{}, bless:[], jour:[1 + r.gauss() * EQ.jour, 1 + r.gauss() * EQ.jour], domicile:opts.domicile !== false, avecTexte:opts.texte !== false, r, rt, M};
  X.e.forEach((e, k) => { if (e.cap) X.moral[k] = 0.5; });
  for (const e of X.e) for (const id of [...titulaires(e), ...(e.banc || [])]){ const j = M.joueurs[id]; X.fat[id] = j ? j.fat : 0; X.perf[id] = {eq:X.e.indexOf(e), b:0, t:0, arr:0, cog:0, enc:0, vif:0, rate:0, m:titulaires(e).includes(id) ? 1 : 0}; }
  dire(X, 'debut', -1, {}, true);
  return X;
}
const J = (X, id) => X.M.joueurs[id];
function dire(X, cle, eq, v, cleEv, extra){
  const ev = {t:X.t, k:cle, e:eq, sc:X.score.slice(), cle:!!cleEv, ...(extra || {})};
  if (X.avecTexte){
    const s = `${X.score[0]}–${X.score[1]}`;
    ev.txt = texte(X.rt, cle, {s, m:Math.floor(X.t / 60), c:eq >= 0 ? X.e[eq].nom : '', a:eq >= 0 ? X.e[1 - eq].nom : '', ...v});
  }
  X.ev.push(ev); X.evNouv.push(ev);
}
const nomJ = j => j ? `${j.p} ${j.n}` : '?';
/* facteur de forme d'un joueur sur le terrain : fatigue, forme, moral de l'équipe */
function f(X, eq, id){ const j = J(X, id); if (!j) return 1; return (1 - X.fat[id] / 300) * (0.96 + j.forme * 0.008) * (1 + X.moral[eq] * 0.01); }
const moy = L => L.reduce((s, x) => s + x, 0) / (L.length || 1);
const role = (X, eq, id) => (X.e[eq].roles || {})[id];
const nbRole = (X, eq, poste, r) => X.e[eq][poste].filter(id => role(X, eq, id) === r).length;
function moyP(L, w){ let s = 0, n = 0; L.forEach((v, i) => { s += v * w[i]; n += w[i]; }); return n ? s / n : 0; }
function forces(X, eq){
  const e = X.e[eq], T = e.tactique, b = e.balai;
  const us = 0.8 + 0.2 * (e.usure ?? 100) / 100;                                   // v84 : balais usés
  const coh = 0.97 + (e.cohesion ?? 70) / 100 * 0.06;                              // v84 : cohésion de l'équipe
  const dom = ((eq === 0 && X.domicile) ? EQ.domicile : 1) * X.jour[eq] * coh;
  const wA = e.P.map(id => ({meneur:1.6, finisseur:0.8, harceleur:0.8}[role(X, eq, id)] || 1));
  const wD = e.P.map(id => ({harceleur:1.6, finisseur:0.7}[role(X, eq, id)] || 1));
  const A = moyP(e.P.map(id => { const j = J(X, id); return ((at(j, 'pas') * 2 + at(j, 'rec') + at(j, 'ctl') * 2 + at(j, 'vis') * 2 + at(j, 'frm') + at(j, 'acc') + at(j, 'equi') + at(j, 'tir')) / 11) * f(X, eq, id); }), wA) * dom + (b.man * us - 6) * 0.12;
  const Df = moyP(e.P.map(id => { const j = J(X, id); return ((at(j, 'int') * 2 + at(j, 'bou') + at(j, 'ant') * 2 + at(j, 'pla') + at(j, 'vit') + at(j, 'acc')) / 8) * f(X, eq, id); }), wD) * dom;
  const B = moy(e.B.map(id => { const j = J(X, id); return ((at(j, 'fra') * 3 + at(j, 'pre') * 2 + at(j, 'for') + at(j, 'ant') + at(j, 'agr')) / 8) * f(X, eq, id); })) * (dom > 1 ? 1.02 : 1);
  const g = J(X, e.G[0]);
  const G = g ? ((ga(g, 'arr') * 3 + ga(g, 'cou_a') * 2 + ga(g, 'sor') + at(g, 'ref') * 2 + at(g, 'agi') + at(g, 'pla')) / 10) * f(X, eq, e.G[0]) + (role(X, eq, e.G[0]) === 'ligne' ? 0.6 : 0) : 5;
  const s = J(X, e.A[0]);
  const S = s ? ((at(s, 'vit') * 2 + at(s, 'acc') * 2 + at(s, 'piq') * 2 + at(s, 'acu') * 2 + at(s, 'san') + at(s, 'con') + at(s, 'vir')) / 11) * f(X, eq, e.A[0]) + (b.vit * us - 6) * 0.15 : 5;
  return {A, D:Df, B, G, S, T};
}
function tireur(X, eq){
  const e = X.e[eq]; const p = e.P.map(id => { const j = J(X, id); return [id, Math.pow(at(j, 'tir') + at(j, 'pre') * 0.5, 2) * ({finisseur:2.2, meneur:0.7}[role(X, eq, id)] || 1)]; });
  return X.r.pondere(p);
}
function qualiteTir(X, eq, id){ const j = J(X, id); return ((at(j, 'tir') * 3 + at(j, 'pre') * 2 + at(j, 'san') + at(j, 'ctl')) / 7) * f(X, eq, id); }
function batteur(X, eq){ const e = X.e[eq]; return X.r.pondere(e.B.map(id => [id, at(J(X, id), 'fra') + 2])); }

/* un pas de 15 s ; renvoie les événements produits */
function pas(X){
  if (X.fini) return [];
  X.evNouv = [];
  const r = X.r, a = X.poss, d = 1 - a, Fa = forces(X, a), Fd = forces(X, d), Ta = Fa.T, Td = Fd.T, met = X.meteo;
  const e = X.e;
  X.t += EQ.pas; X.pas++;
  for (const k of [0, 1]){ if (X.sonne[k] > 0) X.sonne[k]--; if (X.gSonne[k] > 0) X.gSonne[k]--; }
  /* fatigue de tous les joueurs sur le terrain */
  for (const k of [0, 1]){ const T = e[k].tactique; const mult = EQ.fatigue * (1 + 0.25 * (T.rythme - 2)) * (T.pressing === 'haut' ? 1.15 : 1);
    for (const id of titulaires(e[k])){ const j = J(X, id); if (j) X.fat[id] = Math.min(100, X.fat[id] + mult * (1.6 - at(j, 'end') / 20)); } }

  /* 1. cognards de la défense */
  const ag = 1 + 0.25 * (Td.agressivite - 2);
  const pCog = EQ.cognard * borne(1 + (Fd.B - Fa.B) / 15, 0.4, 1.8) * ag * (met === 'orage' ? 1.1 : 1) * (1 + 0.15 * nbRole(X, d, 'B', 'chasseur') - 0.15 * nbRole(X, a, 'B', 'protecteur'));
  if (r() < pCog){
    const bat = batteur(X, d); X.stats[d].cog++; X.perf[bat].cog++;
    const cible = Td.cible;
    if (cible === 'attrapeur'){ X.sonne[a] = 12; dire(X, 'cognard_att', d, {j:nomJ(J(X, bat))}, false); }
    else if (cible === 'gardien'){ X.gSonne[a] = 8; dire(X, 'cognard_gar', d, {j:nomJ(J(X, bat))}, false); X.poss = d; }
    else { dire(X, 'cognard', d, {j:nomJ(J(X, bat))}, false); X.poss = d; }
    /* blessure possible de la cible */
    const victime = cible === 'attrapeur' ? e[a].A[0] : cible === 'gardien' ? e[a].G[0] : r.choix(e[a].P);
    const vj = J(X, victime);
    if (vj && r() < EQ.blessure * (vj.cache.frag / 10) * (1 + 0.3 * (Td.agressivite - 2)) * (met === 'orage' ? 1.3 : 1) * (1.4 - at(vj, 'res') / 25) * (1 + 0.2 * nbRole(X, d, 'B', 'chasseur'))) blesser(X, a, victime);
    return finPas(X);
  }
  /* 2. faute */
  if (r() < EQ.faute * (1 + 0.6 * (Td.agressivite - 2))){
    const fautif = r.choix([...e[d].P, ...e[d].B]); X.stats[d].fautes++;
    const grave = r() < EQ.fauteGrave;
    dire(X, grave ? 'faute_grave' : 'faute', d, {j:nomJ(J(X, fautif))}, grave);
    const ti = tireur(X, a), T = qualiteTir(X, a, ti), G = Fd.G;
    X.stats[a].pen++; X.stats[a].tirs++; X.perf[ti].t++;
    if (r() < borne(EQ.penalty + 0.02 * (T - G), 0.4, 0.9)) marquer(X, a, ti, true);
    else { X.stats[d].arrets++; if (e[d].G[0]) X.perf[e[d].G[0]].arr++; dire(X, 'penalty_rate', a, {j:nomJ(J(X, ti)), g:nomJ(J(X, e[d].G[0]))}, false); X.poss = d; }
    return finPas(X);
  }
  /* 3. attaque */
  let dTir = 0.05 * (Ta.rythme - 2) + 0.04 * (Ta.risque - 2) + 0.02 * (Td.risque - 2) + (Ta.passes === 'long' ? 0.03 : -0.03) + (Td.pressing === 'haut' ? -0.03 : 0)
    + (Td.gardien === 'sortie' ? -0.03 : 0) + (met === 'pluie' || met === 'orage' ? -0.03 : 0) + (role(X, d, e[d].G[0]) === 'libero' ? -0.03 : 0);
  const pTir = borne(1 / (1 + Math.exp(-((Fa.A - Fd.D) / EQ.echelleTir + EQ.baseTir))) + dTir, 0.15, 0.85);
  if (r() < pTir){
    const ti = tireur(X, a), T = qualiteTir(X, a, ti), G = Fd.G * (X.gSonne[d] > 0 ? 0.75 : 1);
    const dBut = (Ta.passes === 'court' ? 0.02 : -0.02) - 0.02 * (Ta.risque - 2) + (Td.pressing === 'haut' ? 0.02 : 0) + (Td.pressing === 'repli' ? -0.02 : 0)
      + (Td.gardien === 'sortie' ? 0.03 : 0) + (met === 'vent' || met === 'orage' ? -0.04 : 0) + (role(X, d, e[d].G[0]) === 'libero' ? 0.02 : 0);
    X.stats[a].tirs++; X.perf[ti].t++;
    if (r() < borne(EQ.baseBut + EQ.kBut * (T - G) + dBut, EQ.butMin, EQ.butMax)) marquer(X, a, ti, false);
    else {
      const gk = e[d].G[0];
      if (r() < 0.78){ X.stats[d].arrets++; if (gk) X.perf[gk].arr++; if (T - G > 1.5 || r() < 0.25) dire(X, 'arret', a, {j:nomJ(J(X, ti)), g:nomJ(J(X, gk))}, false); }
      else { X.perf[ti].rate++; if (r() < 0.15) dire(X, 'rate', a, {j:nomJ(J(X, ti))}, false); }
      X.poss = r() < 0.7 ? d : a;
    }
  } else {
    const tourne = 1 - EQ.garde + 0.04 * (Ta.rythme - 2) + (Td.pressing === 'haut' ? 0.05 : 0) + (met === 'pluie' ? 0.03 : 0) + 0.03 * nbRole(X, d, 'P', 'harceleur');
    if (r() < tourne) X.poss = d;
  }
  return finPas(X);
}
function marquer(X, eq, ti, penalty){
  X.score[eq] += EQ.points.but; X.stats[eq].buts++; X.perf[ti].b++;
  const gk = X.e[1 - eq].G[0]; if (gk) X.perf[gk].enc++;
  X.moral[eq] = borne(X.moral[eq] + 0.4, -3, 3); X.moral[1 - eq] = borne(X.moral[1 - eq] - (X.e[1 - eq].cap ? 0.25 : 0.4), -3, 3);
  dire(X, penalty ? 'penalty_but' : 'but', eq, {j:nomJ(J(X, ti)), g:nomJ(J(X, gk))}, false, {but:1});
  X.poss = 1 - eq;
}
function tirerBlessure(r){ const b = r.pondere(D.BLESSURES.map(x => [x, x[3]])); return {nom:b[0], jours:r.ent(b[1], b[2])}; }
function blesser(X, eq, id){
  const b = tirerBlessure(X.r), j = J(X, id);
  X.bless.push({id, eq, ...b});
  dire(X, 'blessure', eq, {j:nomJ(j), b:b.nom.toLowerCase()}, true, {blesse:id});
  /* remplacement sur blessure (hors des 3 libres) : premier remplaçant du même poste, sinon le meilleur */
  const e = X.e[eq], poste = ['P', 'B', 'A', 'G'].find(p => e[p].includes(id));
  const sorti = new Set(X.sortis || []);
  const cand = (e.banc || []).filter(x => !sorti.has(x) && J(X, x) && !X.bless.some(bb => bb.id === x));
  if (!cand.length) return;
  const n = cand.slice().sort((a, b) => note20(J(X, b), poste) - note20(J(X, a), poste))[0];
  remplacer(X, eq, id, n, true);
}
function remplacer(X, eq, sort, entre, blessure){
  const e = X.e[eq], poste = ['P', 'B', 'A', 'G'].find(p => e[p].includes(sort));
  if (!poste || !(e.banc || []).includes(entre)) return false;
  if (!blessure){ if (X.rempl[eq] <= 0) return false; X.rempl[eq]--; }
  e[poste] = e[poste].map(x => x === sort ? entre : x);
  e.banc = e.banc.filter(x => x !== entre);
  (X.sortis = X.sortis || []).push(sort);
  X.perf[entre] = X.perf[entre] || {eq, b:0, t:0, arr:0, cog:0, enc:0, vif:0, rate:0, m:0}; X.perf[entre].m = 1;
  dire(X, 'remplacement', eq, {j:nomJ(J(X, entre)), k:nomJ(J(X, sort))}, false);
  return true;
}
function finPas(X){
  vifDor(X);
  if (!X.fini && X.t >= EQ.vifMaxMin * 60) finir(X, forces(X, 0).S >= forces(X, 1).S ? 0 : 1, true);
  return X.evNouv;
}
function vifDor(X){
  if (X.fini) return;
  const r = X.r;
  if (X.t < X.vifApp) return;
  if (!X.vifVu){ X.vifVu = true; X.vifDepuis = X.t; dire(X, 'vif_apercu', -1, {}, true, {vif:'vu'}); return; }
  if (X.vifCache > 0){ X.vifCache--; if (!X.vifCache) dire(X, 'vif_apercu', -1, {}, false, {vif:'revu'}); return; }
  if (r() < EQ.vifCache){ X.vifCache = r.ent(8, 32); dire(X, 'vif_cache', -1, {}, false); return; }
  const tmin = (X.t - X.vifDepuis) / 60, met = X.meteo === 'brouillard' ? 0.7 : X.meteo === 'orage' ? 0.85 : 1;
  const tardif = X.t > 200 * 60 ? 5 : 1;
  const ordre = r() < 0.5 ? [0, 1] : [1, 0];
  for (const k of ordre){
    const F = forces(X, k), T = X.e[k].tactique, To = X.e[1 - k].tactique;
    let p = EQ.p0 * (F.S / EQ.vifRef) * met * (1 + tmin / 30) * tardif;
    if (X.sonne[k] > 0) p *= 0.5;
    const rs = role(X, k, X.e[k].A[0]), ro = role(X, 1 - k, X.e[1 - k].A[0]);
    if (rs === 'chasseur') p *= 1.12;
    if (T.attrapeur === 'marquage') p *= 0.6;
    if (To.attrapeur === 'marquage') p *= ro === 'tacticien' ? 0.55 : 0.65;
    if (r() < p){
      const sid = X.e[k].A[0], s = J(X, sid);
      const perdant = X.score[k] + EQ.points.vif < X.score[1 - k];
      if (perdant && T.attrapeur !== 'chasse' && r() < EQ.refus + (s ? at(s, 'dec') : 10) * 0.004 + (rs === 'tacticien' ? 0.08 : 0)){
        if (!X.refusDit || X.t - X.refusDit > 240){ X.refusDit = X.t; dire(X, 'vif_refus', k, {j:nomJ(s)}, false); }
        continue;
      }
      finir(X, k, false); return;
    }
    if (r() < 0.012 && X.avecTexte) dire(X, 'vif_poursuite', k, {j:nomJ(J(X, X.e[k].A[0]))}, false);
  }
}
function finir(X, k, force){
  X.score[k] += EQ.points.vif; X.vif = k; X.fini = true;
  const sid = X.e[k].A[0]; if (X.perf[sid]) X.perf[sid].vif = 1;
  const perdu = X.score[k] < X.score[1 - k];
  dire(X, perdu ? 'fin_perdu' : 'vif_attrape', k, {j:nomJ(J(X, sid))}, true, {vif:'pris', fin:1});
}
function jusquAuBout(X){ while (!X.fini) pas(X); return X; }
function tempsMort(X, eq){ if (X.tm[eq] <= 0 || X.fini) return false; X.tm[eq]--; dire(X, 'temps_mort', eq, {}, false); return true; }

/* notes des joueurs (sur 10) après le match */
function notesMatch(X){
  const N = {};
  for (const [id, p] of Object.entries(X.perf)){
    if (!p.m) continue;
    const g = Math.sign(X.score[p.eq] - X.score[1 - p.eq]);
    const n = 6 + p.b * 0.22 + p.arr * 0.08 + p.cog * 0.25 - p.enc * 0.035 + p.vif * 1.6 - p.rate * 0.05 + (p.t ? (p.b / p.t - 0.4) * 1.2 : 0) + g * 0.3;
    N[id] = Math.round(borne(n, 3, 10) * 10) / 10;
  }
  return N;
}
function resume(X){ return {score:X.score.slice(), vif:X.vif, duree:Math.round(X.t / 60), meteo:X.meteo, stats:X.stats, notes:notesMatch(X), bless:X.bless.map(b => ({id:b.id, nom:b.nom, jours:b.jours}))}; }

/* ---------- Semaine ---------- */
const semaine = M => M.calendrier[M.semaine] || null;
function matchDuJoueur(M){
  const S = semaine(M); if (!S || !M.manager) return null;
  return S.matchs.find(m => m.dom === M.manager.club || m.ext === M.manager.club) || null;
}
function grainePour(M, m){ return melange(M.graine, m.id); }
function equipesPour(M, m){ return m.ligue === 'sixn' ? [selection(M, m.dom), selection(M, m.ext)] : [equipeClub(M, m.dom), equipeClub(M, m.ext)]; }
/* le match du joueur, prêt à être joué en direct */
function preparerMatch(M, m){
  if (m.ligue !== 'sixn') for (const id of [m.dom, m.ext]) if (id !== M.manager.club){ M.clubs[id].compo = compoAuto(M, id); }
  const faits = verifierCompo(M, M.manager.club);
  const [e0, e1] = equipesPour(M, m);
  const X = creerMatch(M, e0, e1, grainePour(M, m), {date:semaine(M).date});
  X.idMatch = m.id; X.joueur = m.dom === M.manager.club ? 0 : 1; X.changements = faits;
  return X;
}
function simulerMatch(M, m){
  if (m.ligue !== 'sixn') for (const id of [m.dom, m.ext]) M.clubs[id].compo = compoAuto(M, id);
  const [e0, e1] = equipesPour(M, m);
  return jusquAuBout(creerMatch(M, e0, e1, grainePour(M, m), {date:semaine(M).date, texte:false}));
}
/* applique un match terminé : résultat, classement, stats, fatigue, blessures, forme */
function appliquerMatch(M, m, X){
  const r = resume(X);
  const duJoueur = M.manager && (m.dom === M.manager.club || m.ext === M.manager.club);
  m.res = duJoueur ? r : {score:r.score, vif:r.vif, duree:r.duree};   // autres matchs : le score suffit (sauvegarde plus légère)
  compter(M, m);
  const notes = r.notes;
  const club = m.ligue !== 'sixn';
  for (const k of [0, 1]){
    const e = X.e[k];
    const joues = new Set([...titulaires(e), ...(X.sortis || [])]);
    for (const id of joues){
      const j = M.joueurs[id]; if (!j || !X.perf[id] || !X.perf[id].m) continue;
      const n = notes[id];
      if (club){ j.saison.m++; j.saison.b += X.perf[id].b; j.saison.v += X.perf[id].vif; j.saison.cog += X.perf[id].cog; j.saison.arr += X.perf[id].arr; if (n) j.saison.notes += n; }
      j.fat = Math.round(Math.min(100, X.fat[id] ?? j.fat)); j.joue = 1;
      if (n) j.forme = Math.round(borne(j.forme * 0.6 + n * 0.4, 1, 10) * 10) / 10;
      const g = Math.sign(X.score[k] - X.score[1 - k]); j.moral = borne(j.moral + g * 6 + (n ? (n - 6) * 3 : 0), 5, 100);
    }
  }
  for (const b of X.bless){ const j = M.joueurs[b.id]; if (j) j.bless = {nom:b.nom, jours:C() && j.club ? C().dureeBlessure(M, j.club, b.jours) : b.jours}; }
  if (club) for (const id of [m.dom, m.ext]) if (M.clubs[id]) M.clubs[id].usure = Math.max(0, Math.round(((M.clubs[id].usure ?? 100) - EQ.usure) * 10) / 10);   // v84 : balais
}
/* fin de semaine : récupération, guérisons, IA, messages */
function recuperer(M, jours){
  for (const j of Object.values(M.joueurs)){
    j.fat = Math.max(0, Math.round(j.fat - jours * (5 + at(j, 'end') * 0.35)));
    if (j.bless){ j.bless.jours -= jours;
      if (j.bless.jours <= 0){ j.bless = null; j.forme = Math.max(3, Math.round((j.forme - 2) * 10) / 10);   // v84 : retour progressif
        if (M.manager && j.club === M.manager.club) message(M, `${nomJ(j)} est rétabli`, 'Il revient à l\'entraînement, encore un peu juste : sa forme remontera avec les matchs.', 'bless'); } }
    j.moral = Math.round(j.moral + (60 - j.moral) * 0.15);
  }
}
function message(M, titre, corps, type){ M.boite.unshift({id:'m' + (M.prochainId++), date:(semaine(M) || {}).date || Date.now(), titre, corps, type:type || 'info', lu:false}); if (M.boite.length > 60) M.boite.length = 60; }

/* Joue toute la semaine : X = le match du joueur déjà terminé (ou null). Renvoie un résumé pour l'écran. */
function terminerSemaine(M, X){
  const S = semaine(M); if (!S) return null;
  const mj = matchDuJoueur(M);
  const avant = {};
  if (M.manager) for (const id of M.clubs[M.manager.club].effectif) avant[id] = !!M.joueurs[id].bless;
  for (const m of S.matchs){
    if (m.res) continue;
    if (mj && m.id === mj.id && X) appliquerMatch(M, m, X);
    else appliquerMatch(M, m, simulerMatch(M, m));
  }
  if (M.manager && mj && mj.res) apresMatchManager(M, mj);
  /* messages : blessures de l'équipe, résumé */
  if (M.manager){
    const club = M.clubs[M.manager.club];
    for (const id of club.effectif){ const j = M.joueurs[id]; if (j.bless && !avant[id]) message(M, `Blessure : ${nomJ(j)}`, `${j.bless.nom}. Indisponible environ ${j.bless.jours} jours.`, 'bless'); }
    if (S.type === 'sixn'){
      const L = S.matchs.map(m => `${D.NATIONS[m.dom].nom} ${m.res.score[0]}–${m.res.score[1]} ${D.NATIONS[m.ext].nom}`).join(' · ');
      message(M, `Six Nations, tour ${S.tour}`, L, 'sixn');
    }
  }
  if (C()) C().semaine(M, S);                         // v84 : entraînement, finances, mercato, contrats
  const prochaine = M.calendrier[M.semaine + 1];
  const jours = prochaine ? Math.round((prochaine.date - S.date) / 864e5) : 7;
  recuperer(M, jours);
  M.semaine++;
  const N = semaine(M);
  if (N && N.type === 'bilan') finDeSaison(M);
  return S;
}
function attente(M, clubId, adv){ const a = M.clubs[clubId].rep, b = adv.rep || 60; return borne(0.5 + (a - b) / 60, 0.15, 0.85); }
function apresMatchManager(M, m){
  const mg = M.manager, k = m.dom === mg.club ? 0 : 1, [s0, s1] = m.res.score, moi = k ? s1 : s0, lui = k ? s0 : s1;
  const adv = M.clubs[k ? m.dom : m.ext];
  const att = attente(M, mg.club, adv), res = moi > lui ? 1 : moi === lui ? 0.5 : 0;
  mg.confiance = Math.round(borne(mg.confiance + (res - att) * 10, 0, 100));
  mg.rep = Math.round(borne(mg.rep + (res - att) * 1.6, 1, 100) * 10) / 10;
  mg.bilan = mg.bilan || {g:0, n:0, p:0}; mg.bilan[res === 1 ? 'g' : res === 0 ? 'p' : 'n']++;
}

/* ---------- Objectifs du président ---------- */
function objectif(M, clubId){
  const club = M.clubs[clubId], L = M.ligues[club.ligue].clubs.map(id => M.clubs[id]).sort((a, b) => b.rep - a.rep);
  const rang = L.findIndex(c => c.id === clubId) + 1;
  const vise = rang <= 1 ? 1 : rang <= 3 ? 3 : rang <= 6 ? 6 : rang <= 10 ? 10 : rang <= 13 ? 13 : 16;
  const txt = vise === 1 ? 'Gagner le championnat' : vise === 3 ? 'Finir sur le podium' : vise === 6 ? 'Finir dans les 6 premiers' : vise === 10 ? 'Finir dans la première moitié' : vise === 13 ? 'Finir 13e ou mieux' : 'Progresser et lancer des jeunes';
  return {vise, txt};
}

/* ---------- Carrière ---------- */
function choisirClub(M, clubId, nom){
  const club = M.clubs[clubId];
  M.manager = {nom:(nom || 'Manager').slice(0, 30), club:clubId, rep:Math.round(18 + club.rep / 5), confiance:60, objectif:objectif(M, clubId), saisons:[], bilan:{g:0, n:0, p:0}};
  club.tactique = TACTIQUE_DEFAUT(); club.compo = compoAuto(M, clubId);
  const o = M.manager.objectif;
  message(M, `Bienvenue à ${club.nom}`, `Le président vous confie l'équipe pour la saison ${M.saison}-${String(M.saison + 1).slice(2)}. Objectif : ${o.txt.toLowerCase()}. Il juge les résultats chaque semaine.`, 'pres');
  message(M, 'Le mot du staff', 'La composition proposée est la meilleure selon les notes au poste. Réglez les consignes dans Tactique avant le premier match ; l\'attrapeur est réglé pour ne prendre le vif d\'or que si ça fait gagner.', 'staff');
  return M;
}

/* ---------- Fin de saison ---------- */
function finDeSaison(M){
  const lab = `${M.saison}-${String(M.saison + 1).slice(2)}`;
  const champs = {}; for (const L of Object.values(M.ligues)) champs[L.id] = classement(M, L.id)[0].id;
  const sixn = classement(M, 'sixn')[0].id;
  const h = {saison:lab, champions:champs, sixn};
  if (M.manager){
    const C = classement(M, M.clubs[M.manager.club].ligue), pos = C.findIndex(x => x.id === M.manager.club) + 1, o = M.manager.objectif;
    h.manager = {club:M.manager.club, pos, objectif:o.vise};
    const ecart = o.vise - pos;
    M.manager.rep = Math.round(borne(M.manager.rep + ecart * 1.2 + (pos === 1 ? 8 : 0), 1, 100) * 10) / 10;
    M.manager.confiance = Math.round(borne(M.manager.confiance + ecart * 4, 0, 100));
    M.manager.saisons.push({saison:lab, club:M.manager.club, pos});
    message(M, `Bilan de la saison ${lab}`, `${M.clubs[M.manager.club].nom} termine ${pos}${pos === 1 ? 'er' : 'e'} (objectif : ${o.vise === 1 ? 'titre' : 'top ' + o.vise}). Champions : ${Object.values(M.ligues).map(L => M.clubs[champs[L.id]].nom).join(', ')}. Six Nations : ${D.NATIONS[sixn].nom}.`, 'pres');
  }
  M.histo.push(h);
}
/* passage à la saison suivante (appelé par l'écran après le bilan) */
function saisonSuivante(M){
  const r = hasard(melange(M.graine, 'saison', M.saison));
  if (C()) C().avantSaison(M, r);                     // v84 : primes, contrats qui se terminent, agents libres
  /* vieillissement, retraites et jeunes (v84 : la progression se fait chaque semaine à l'entraînement) */
  for (const club of Object.values(M.clubs)){
    for (const id of club.effectif.slice()){
      const j = M.joueurs[id];
      if (!C()) progresser(j, r);
      j.age++;
      const part = j.age >= 36 || (j.age >= 34 && r() < 0.35) || (j.age >= 32 && r() < 0.08);
      if (part){
        club.effectif = club.effectif.filter(x => x !== id); delete M.joueurs[id];
        const lvl = EQ.niveauMin + (club.rep - 40) / 45 * (EQ.niveauMax - EQ.niveauMin) + r.gauss() * 0.9;
        const n = creerJoueur(r, r.pondere(D.ORIGINES[club.nat]), j.poste, lvl - 1.5, r.ent(17, 19), 'j' + (M.prochainId++));
        n.club = club.id; n.num = j.num; M.joueurs[n.id] = n; club.effectif.push(n.id); if (C()) C().nouveauJoueur(M, n, club);
        if (M.manager && club.id === M.manager.club) message(M, `${nomJ(j)} prend sa retraite`, `${j.age} ans. Le centre de formation fait monter ${nomJ(n)} (${n.age} ans, ${D.POSTES[n.poste].nom.toLowerCase()}).`, 'staff');
      }
    }
    for (const id of club.effectif){ const j = M.joueurs[id]; j.saison = {m:0, b:0, v:0, cog:0, arr:0, notes:0}; j.fat = 0; j.forme = 6; j.moral = 60; if (j.bless) j.bless.jours = Math.max(0, j.bless.jours - 60) || null; if (j.bless && !j.bless.jours) j.bless = null; }
    if (!M.manager || club.id !== M.manager.club){ club.compo = compoAuto(M, club.id); club.tactique = tactiqueIA(r); }
    else verifierCompo(M, club.id);
  }
  M.saison++; M.semaine = 0;
  M.calendrier = calendrierSaison(M, r);
  remettreClassements(M);
  if (C()) C().apresSaison(M, r);
  if (M.manager){ M.manager.objectif = objectif(M, M.manager.club); M.manager.bilan = {g:0, n:0, p:0};
    message(M, `Saison ${M.saison}-${String(M.saison + 1).slice(2)}`, `Nouvel objectif du président : ${M.manager.objectif.txt.toLowerCase()}.`, 'pres'); }
}
function progresser(j, r){
  const [p1, p2] = D.PICS[j.poste], ca = note20(j, j.poste), pot = j.cache.pot, pro = j.cache.pro / 10;
  let delta;
  if (j.age < p1) delta = borne((pot - ca) * (0.25 + 0.03 * (p1 - j.age)) * pro, 0, 2.5);
  else if (j.age <= p2) delta = borne((pot - ca) * 0.15 * pro, -0.2, 0.8);
  else delta = -(0.3 + 0.18 * (j.age - p2));
  const phys = new Set(['vit', 'acc', 'end', 'agi', 'ref']);
  j.a = j.a.map((v, i) => {
    let d = delta + r.gauss() * 0.5;
    if (delta < 0 && !phys.has(ATT[i])) d = delta * 0.35 + r.gauss() * 0.4;
    if (delta < 0 && D.ATTRS[i][2] === 'Mental') d = 0.2 + r.gauss() * 0.4;
    return Math.round(borne(v + d, 1, 20));
  });
  if (j.poste === 'G') j.g = j.g.map(v => Math.round(borne(v + delta + r.gauss() * 0.5, 1, 20)));
}

/* ---------- Sauvegarde ---------- */
/* attributs écrits en lettres (1 → A … 20 → T) : la sauvegarde pèse trois fois moins */
const enLettres = L => String.fromCharCode(...L.map(v => 64 + v));
const deLettres = t => [...t].map(c => c.charCodeAt(0) - 64);
function serialiser(M){
  return JSON.stringify(M, (k, v) => (k === 'a' || k === 'g') && Array.isArray(v) && v.length && typeof v[0] === 'number' ? enLettres(v) : v);
}
function charger(txt){
  const M = typeof txt === 'string' ? JSON.parse(txt) : txt;
  if (!M || !M.clubs || !M.joueurs || !M.calendrier || !(M.v >= 1 && M.v <= VERSION)) throw new Error('Fichier QM27 illisible ou d\'une version plus récente');
  for (const j of Object.values(M.joueurs)){ if (typeof j.a === 'string') j.a = deLettres(j.a); if (typeof j.g === 'string') j.g = deLettres(j.g); }
  if (M.v < VERSION && C()) C().migrer(M);           // v84 : une partie du lot 1 reçoit contrats, staff, finances
  return M;
}

root.QM = {VERSION, hasard, melange, note, note20, meilleurPoste, at, ga, ATT, IDX, POIDS, rolesAuto, roleAuto, creerJoueur, borne, dispo, nouveauMonde, choisirClub, compoAuto, verifierCompo, titulaires, TACTIQUE_DEFAUT,
           semaine, matchDuJoueur, preparerMatch, simulerMatch, creerMatch, equipeClub, selection, pas, jusquAuBout, tempsMort, remplacer, resume, notesMatch,
           terminerSemaine, saisonSuivante, classement, objectif, serialiser, charger, nomJ, message, attente};
})(typeof window !== 'undefined' ? window : globalThis);
