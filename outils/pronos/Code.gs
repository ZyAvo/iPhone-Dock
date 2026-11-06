/* KiosK — serveur des pronos entre amis (Google Apps Script, v60).
   Garde les joueurs et les pronos dans le Google Sheets auquel ce script est attaché (onglets « Joueurs » et « Pronos », créés tout seuls).
   Refuse un prono après le coup d'envoi (horaires lus sur le site publié, pas envoyés par le téléphone) et ne montre
   les pronos des autres qu'une fois le match commencé. Les points et le classement sont calculés par la page.
   v55 : groupes, pseudos et matchs toujours lus en texte (le Sheets changeait « 2026 » en nombre : inscription en double, « mauvais code »).
   v56 : avatar de chaque joueur (colonne E de Joueurs, « emoji|couleur ») et, pour les matchs pas commencés, qui a déjà pronostiqué (sans les scores).
   v60 : paris entre amis avec des crédits fictifs (onglet « Paris ») : 100 crédits chaque mois + bonus du podium du mois précédent (20 / 10 / 5),
   pari simple 1 / N / 2 le jour du match à la cote moyenne du relevé du matin (donnees/cotes/cotes.json), réglé sur le score final publié par la tâche Sport.
   Jeu sans argent : les crédits ne s'achètent pas, ne s'échangent pas et ne valent rien.
   Mise en place : voir outils/dev/PRONOS.md. */
const SITE = 'https://zyavo.github.io/iPhone-Dock/';            // adresse du dock publié
const LIGUES = {'fra.1':'fra-1', '270559':'270559', 'uefa.champions':'uefa-champions'};   // id ESPN → fichier donnees/sport/<fichier>.json

function doPost(e){
  let r;
  try{ const q = JSON.parse((e && e.postData && e.postData.contents) || '{}'); const f = ACTIONS[q.action]; r = f ? f(q) : {err:'action'}; }
  catch(x){ r = {err:String(x && x.message || x)}; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(){ return ContentService.createTextOutput(JSON.stringify({ok:true, service:'pronos'})).setMimeType(ContentService.MimeType.JSON); }

function feuille(nom, entetes, texte){
  const ss = SpreadsheetApp.getActive(); let f = ss.getSheetByName(nom);
  if (!f){ f = ss.insertSheet(nom); [].concat(texte).forEach(r => f.getRange(r).setNumberFormat('@')); f.appendRow(entetes); f.setFrozenRows(1); }
  else if (f.getLastColumn() < entetes.length) f.getRange(1, 1, 1, entetes.length).setValues([entetes]);   // v56 : colonne ajoutée à un onglet existant
  return f;
}
const JOUEURS = () => feuille('Joueurs', ['groupe', 'pseudo', 'code (empreinte)', 'inscrit le', 'avatar'], 'A:C');
const PRONOS = () => feuille('Pronos', ['groupe', 'pseudo', 'match', 'ligue', 'dom', 'ext', 'le'], 'A:D');
const PARIS = () => feuille('Paris', ['groupe', 'pseudo', 'match', 'ligue', 'choix', 'mise', 'cote', 'le', 'mois', 'dom', 'ext', 'coup d\'envoi', 'gain'], ['A:E', 'I:K']);
const T = v => String(v);                                          // valeur de cellule en texte
const AV = s => { const m = /^([^|]{1,8})\|([0-7])$/.exec(String(s || '')); return m ? m[0] : ''; };   // avatar « emoji|n° de couleur »
const net = s => String(s || '').trim().slice(0, 20);
const grp = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const empreinte = (g, p, pin) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, g + '|' + p.toLowerCase() + '|' + pin + '|mon-ecran'));

/* joueur reconnu (groupe + pseudo + code) ; null sinon */
function joueur(q){
  const g = grp(q.groupe), p = net(q.pseudo), pin = String(q.pin || '');
  if (!g || !p || !/^\d{4}$/.test(pin)) return null;
  const l = JOUEURS().getDataRange().getValues().slice(1), h = empreinte(g, p, pin);
  const i = l.findIndex(r => T(r[0]) === g && T(r[1]).toLowerCase() === p.toLowerCase()), x = l[i];
  return x && T(x[2]) === h ? {g, p:T(x[1]), ligne:i + 2} : null;
}

/* horaires des matchs : fichiers publiés par la tâche Sport (mémoire 10 min) */
function horaires(){
  const c = CacheService.getScriptCache(), m = c.get('horaires');
  if (m) return JSON.parse(m);
  const out = {};
  Object.values(LIGUES).forEach(f => { try{
    const j = JSON.parse(UrlFetchApp.fetch(SITE + 'donnees/sport/' + f + '.json', {muteHttpExceptions:true}).getContentText());
    (j.events || []).forEach(e => { out[e.id] = e.t; });
  }catch(x){} });
  try{ c.put('horaires', JSON.stringify(out), 600); }catch(x){}
  return out;
}

/* ---------- Paris (v60) ---------- */
const DEPART = 100, BONUS = [20, 10, 5];
const moisDe = t => Utilities.formatDate(new Date(t), 'Europe/Paris', 'yyyy-MM');
const suivant = M => { const [a, m] = M.split('-').map(Number); return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`; };
function lire(chemin){ return JSON.parse(UrlFetchApp.fetch(SITE + chemin, {muteHttpExceptions:true}).getContentText()); }
function enCache(cle, f){
  const c = CacheService.getScriptCache(), v = c.get(cle); if (v) return JSON.parse(v);
  const out = f(); try{ c.put(cle, JSON.stringify(out), 600); }catch(x){} return out;
}
/* cote du matin : moyenne des sites français au relevé « matin » de la tâche Cotes (arrondie au centième) */
function cotesMatin(){
  return enCache('cotes', () => { const out = {};
    try{ Object.entries(lire('donnees/cotes/cotes.json').matchs || {}).forEach(([id, m]) => {
      const r = (m.releves || []).find(x => x.phase === 'matin'); if (!r || !m.t) return;
      const s = Object.values(r.sites || {}).filter(x => x && x.h > 1 && x.d > 1 && x.a > 1); if (!s.length) return;
      const moy = k => Math.round(100 * s.reduce((a, x) => a + x[k], 0) / s.length) / 100;
      out[id] = {t:m.t, lg:m.lg, eq:m.eq || [], c:[moy('h'), moy('d'), moy('a')], n:s.length};
    }); }catch(x){}
    return out; });
}
/* résultats : jours.json + passe.json (J-11 à J+15) ; plus ancien : fichier de la compétition */
const resume = e => [e.state, e.home ? e.home.score : '', e.away ? e.away.score : '', e.code || '', e.t];
function resultats(){
  return enCache('resultats', () => { const out = {};
    ['donnees/sport/passe.json', 'donnees/sport/jours.json'].forEach(f => { try{ (lire(f).events || []).forEach(e => { if (e.home) out[e.id] = resume(e); }); }catch(x){} });
    return out; });
}
function resultatAncien(lg, id){
  try{ const e = (lire('donnees/sport/' + String(lg).replace(/\./g, '-') + '.json').events || []).find(x => x.id === id); return e ? resume(e) : null; }catch(x){ return null; }
}
/* règle les paris terminés du groupe (colonne gain : vide = en cours, 0 = perdu, mise × cote = gagné, mise = remboursé) */
function regler(g){
  const f = PARIS(), l = f.getDataRange().getValues(), R = resultats(), now = Date.now(), anciens = {};
  const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
  try{
    l.forEach((r, k) => {
      if (!k || T(r[0]) !== g || r[12] !== '' || now < +r[11]) return;
      const id = T(r[2]); let x = R[id];
      if (!x && now - +r[11] > 10 * 864e5) x = anciens[id] || (anciens[id] = resultatAncien(r[3], id));
      if (!x) return;
      let gain = null;
      if (x[0] === 'post' && x[1] !== '' && x[2] !== ''){ const h = +x[1], a = +x[2], v = h > a ? 'h' : h < a ? 'a' : 'd'; gain = T(r[4]) === v ? Math.round(+r[5] * +r[6]) : 0; }
      else if (/POSTPONED|CANCEL|ABANDON/.test(x[3]) && now - +r[11] > 864e5) gain = +r[5];          // match reporté ou annulé : remboursé
      if (gain !== null) f.getRange(k + 1, 13).setValue(gain);
    });
  }finally{ verrou.releaseLock(); }
}
/* soldes mois par mois (mois du coup d'envoi, heure de Paris) ; podium des mois finis (joueurs ayant parié) → bonus du mois suivant ; général = cumul des soldes de fin de mois */
function bilan(g){
  const joueurs = JOUEURS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === g).map(r => T(r[1]));
  const rows = PARIS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === g);
  const cur = moisDe(Date.now()), parMois = {}, podiums = {}, general = {};
  let M = rows.reduce((m, r) => T(r[8]) < m ? T(r[8]) : m, cur), bonus = {};
  for (let garde = 0; garde < 120; garde++){
    const b = {};
    joueurs.forEach(p => { b[p] = {depart:DEPART + (bonus[p] || 0), bonus:bonus[p] || 0, mise:0, gains:0, enJeu:0, nb:0}; });
    rows.filter(r => T(r[8]) === M).forEach(r => { const x = b[T(r[1])]; if (!x) return; x.nb++; x.mise += +r[5]; if (r[12] === '') x.enJeu += +r[5]; else x.gains += +r[12]; });
    Object.values(b).forEach(x => { x.solde = x.depart - x.mise + x.gains; });
    parMois[M] = b;
    if (M >= cur) break;
    const cl = joueurs.filter(p => b[p].nb).sort((p, q) => b[q].solde - b[p].solde || p.localeCompare(q));
    podiums[M] = cl.slice(0, 3); bonus = {}; cl.slice(0, 3).forEach((p, k) => { bonus[p] = BONUS[k]; });
    cl.forEach(p => { const x = general[p] || (general[p] = {total:0, mois:0}); x.total += b[p].solde; x.mois++; });
    M = suivant(M);
  }
  return {mois:cur, parMois, podiums, general};
}

const ACTIONS = {
  inscrire(q){
    const g = grp(q.groupe), p = net(q.pseudo), pin = String(q.pin || '');
    if (!g || !p || !/^\d{4}$/.test(pin)) return {err:'champs'};
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = JOUEURS(), l = f.getDataRange().getValues().slice(1);
      const i = l.findIndex(r => T(r[0]) === g && T(r[1]).toLowerCase() === p.toLowerCase()), x = l[i], av = AV(q.avatar);
      if (x){ if (T(x[2]) !== empreinte(g, p, pin)) return {err:'pris'}; if (av) f.getRange(i + 2, 5).setValue(av); return {ok:true}; }
      f.appendRow([g, p, empreinte(g, p, pin), new Date(), av]);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  parier(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const t = horaires()[String(q.match)];
    if (!t) return {err:'match'};
    if (Date.now() >= t) return {err:'ferme'};
    const h = Math.max(0, Math.min(200, parseInt(q.h, 10))), a = Math.max(0, Math.min(200, parseInt(q.a, 10)));
    if (isNaN(h) || isNaN(a)) return {err:'score'};
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = PRONOS(), l = f.getDataRange().getValues();
      const i = l.findIndex((r, k) => k > 0 && T(r[0]) === j.g && T(r[1]) === j.p && T(r[2]) === String(q.match));
      const ligne = [j.g, j.p, String(q.match), String(q.ligue || ''), h, a, new Date()];
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else f.appendRow(ligne);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  avatar(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const av = AV(q.avatar); if (!av) return {err:'avatar'};
    JOUEURS().getRange(j.ligne, 5).setValue(av);
    return {ok:true};
  },
  miser(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const id = String(q.match), C = cotesMatin()[id];
    if (!C) return {err:'cote'};                                   // pas de relevé du matin (pas encore, ou compétition sans cotes)
    if (Date.now() >= C.t) return {err:'ferme'};
    const choix = String(q.choix || '');
    if (choix && !/^[hda]$/.test(choix)) return {err:'choix'};
    const mise = Math.floor(Number(q.mise));
    if (choix && !(mise >= 1)) return {err:'mise'};
    const M = moisDe(C.t);
    regler(j.g);
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = PARIS(), l = f.getDataRange().getValues();
      const i = l.findIndex((r, k) => k > 0 && T(r[0]) === j.g && T(r[1]) === j.p && T(r[2]) === id);
      if (!choix){ if (i > 0) f.deleteRow(i + 1); return {ok:true}; }                // annuler
      const x = (bilan(j.g).parMois[M] || {})[j.p] || {solde:DEPART}, dispo = x.solde + (i > 0 ? +l[i][5] : 0);
      if (mise > dispo) return {err:'solde', dispo};
      const cote = C.c['hda'.indexOf(choix)];
      const ligne = [j.g, j.p, id, C.lg, choix, mise, cote, new Date(), M, C.eq[0] || '', C.eq[1] || '', C.t, ''];
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else f.appendRow(ligne);
      return {ok:true, cote};
    }finally{ verrou.releaseLock(); }
  },
  paris(q){
    const j = joueur(q); if (!j) return {err:'code'};
    regler(j.g);
    const B = bilan(j.g), now = Date.now(), C = cotesMatin(), cotes = {};
    Object.entries(C).forEach(([id, c]) => { if (c.t > now - 6 * 3600e3) cotes[id] = c; });
    const paris = PARIS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g && (T(r[1]) === j.p || now >= +r[11]))   // paris des autres : au coup d'envoi
      .map(r => ({p:T(r[1]), match:T(r[2]), lg:T(r[3]), choix:T(r[4]), mise:+r[5], cote:+r[6], mois:T(r[8]), dom:T(r[9]), ext:T(r[10]), t:+r[11], gain:r[12] === '' ? null : +r[12]}));
    const qui = {};
    PARIS().getDataRange().getValues().slice(1).forEach(r => { if (T(r[0]) === j.g && now < +r[11]) (qui[T(r[2])] || (qui[T(r[2])] = [])).push(T(r[1])); });
    return {mois:B.mois, soldes:B.parMois[B.mois], podiums:B.podiums, general:B.general, cotes, paris, qui};
  },
  etat(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const H = horaires(), now = Date.now(), pronos = {}, qui = {};
    PRONOS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g).forEach(r => {
      const id = T(r[2]), nom = T(r[1]), commence = H[id] && now >= H[id];
      if (!commence) (qui[id] || (qui[id] = [])).push(nom);    // v56 : qui a déjà pronostiqué (sans le score)
      if (nom !== j.p && !commence) return;                    // pronos des autres : seulement une fois le match commencé
      (pronos[id] || (pronos[id] = {}))[nom] = [r[4], r[5]];
    });
    const joueurs = [], avatars = {};
    JOUEURS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g).forEach(r => { joueurs.push(T(r[1])); if (AV(r[4])) avatars[T(r[1])] = T(r[4]); });
    return {joueurs, pronos, avatars, qui};
  }
};

/* À lancer une fois depuis l'éditeur (menu des fonctions › verifier › Exécuter) : demande les autorisations
   et vérifie que les horaires des matchs se lisent sur le site publié (journal : nombre de matchs trouvés). */
function verifier(){
  CacheService.getScriptCache().remove('horaires');
  const n = Object.keys(horaires()).length;
  Logger.log(n ? n + ' matchs trouvés sur ' + SITE : 'Aucun match lu : vérifier SITE (' + SITE + ')');
  JOUEURS(); PRONOS(); PARIS();
  Logger.log(Object.keys(cotesMatin()).length + ' matchs avec la cote du matin');
}
