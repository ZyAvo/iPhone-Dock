/* Mon Écran — serveur des pronos entre amis (Google Apps Script, v50).
   Garde les joueurs et les pronos dans le Google Sheets auquel ce script est attaché (onglets « Joueurs » et « Pronos », créés tout seuls).
   Refuse un prono après le coup d'envoi (horaires lus sur le site publié, pas envoyés par le téléphone) et ne montre
   les pronos des autres qu'une fois le match commencé. Les points et le classement sont calculés par la page.
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

function feuille(nom, entetes){
  const ss = SpreadsheetApp.getActive(); let f = ss.getSheetByName(nom);
  if (!f){ f = ss.insertSheet(nom); f.appendRow(entetes); f.setFrozenRows(1); }
  return f;
}
const JOUEURS = () => feuille('Joueurs', ['groupe', 'pseudo', 'code (empreinte)', 'inscrit le']);
const PRONOS = () => feuille('Pronos', ['groupe', 'pseudo', 'match', 'ligue', 'dom', 'ext', 'le']);
const net = s => String(s || '').trim().slice(0, 20);
const grp = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const empreinte = (g, p, pin) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, g + '|' + p.toLowerCase() + '|' + pin + '|mon-ecran'));

/* joueur reconnu (groupe + pseudo + code) ; null sinon */
function joueur(q){
  const g = grp(q.groupe), p = net(q.pseudo), pin = String(q.pin || '');
  if (!g || !p || !/^\d{4}$/.test(pin)) return null;
  const l = JOUEURS().getDataRange().getValues().slice(1), h = empreinte(g, p, pin);
  const x = l.find(r => r[0] === g && String(r[1]).toLowerCase() === p.toLowerCase());
  return x && x[2] === h ? {g, p:String(x[1])} : null;
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

const ACTIONS = {
  inscrire(q){
    const g = grp(q.groupe), p = net(q.pseudo), pin = String(q.pin || '');
    if (!g || !p || !/^\d{4}$/.test(pin)) return {err:'champs'};
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = JOUEURS(), l = f.getDataRange().getValues().slice(1);
      const x = l.find(r => r[0] === g && String(r[1]).toLowerCase() === p.toLowerCase());
      if (x) return x[2] === empreinte(g, p, pin) ? {ok:true} : {err:'pris'};
      f.appendRow([g, p, empreinte(g, p, pin), new Date()]);
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
      const i = l.findIndex((r, k) => k > 0 && r[0] === j.g && r[1] === j.p && String(r[2]) === String(q.match));
      const ligne = [j.g, j.p, String(q.match), String(q.ligue || ''), h, a, new Date()];
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else f.appendRow(ligne);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  etat(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const H = horaires(), now = Date.now(), pronos = {};
    PRONOS().getDataRange().getValues().slice(1).filter(r => r[0] === j.g).forEach(r => {
      const id = String(r[2]), commence = H[id] && now >= H[id];
      if (r[1] !== j.p && !commence) return;                       // pronos des autres : seulement une fois le match commencé
      (pronos[id] || (pronos[id] = {}))[r[1]] = [r[4], r[5]];
    });
    const joueurs = JOUEURS().getDataRange().getValues().slice(1).filter(r => r[0] === j.g).map(r => String(r[1]));
    return {joueurs, pronos};
  }
};
