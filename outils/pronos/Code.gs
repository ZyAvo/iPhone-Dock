/* KiosK — serveur des pronos entre amis (Google Apps Script, v181).
   Garde les joueurs et les pronos dans le Google Sheets auquel ce script est attaché (onglets « Joueurs » et « Pronos », créés tout seuls).
   Refuse un prono après le coup d'envoi (horaires lus sur le site publié, pas envoyés par le téléphone) et ne montre
   les pronos des autres qu'une fois le match commencé. Jusqu'à la v153, les points et le classement étaient calculés par la page seulement.
   v55 : groupes, pseudos et matchs toujours lus en texte (le Sheets changeait « 2026 » en nombre : inscription en double, « mauvais code »).
   v56 : avatar de chaque joueur (colonne E de Joueurs, « emoji|couleur ») et, pour les matchs pas commencés, qui a déjà pronostiqué (sans les scores).
   v60 : paris entre amis avec des crédits fictifs (onglet « Paris ») : 100 crédits chaque mois + bonus du podium du mois précédent (20 / 10 / 5),
   pari simple 1 / N / 2 le jour du match à la cote moyenne du relevé du matin (donnees/cotes/cotes.json), réglé sur le score final publié par la tâche Sport.
   Jeu sans argent : les crédits ne s'achètent pas, ne s'échangent pas et ne valent rien.
   v61 : appendRow lit les valeurs comme une saisie au clavier (« 2026-11 » devenait une date, même en colonne texte : pari non compté).
   Les lignes sont écrites avec setValues (le format texte est respecté) et le mois d'un pari se calcule depuis le coup d'envoi (colonne L).
   v68 : Premier League (eng.1) dans LIGUES (horaires des pronos), et les « Pronos en plus » (EXTRAS : Liga, Serie A, Bundesliga, Ligue Europa,
   Ligue Conférence, NBA, NFL ; chaque joueur choisit dans la page, classement à part calculé par la page). Horaires gardés en mémoire par compétition
   (une valeur de CacheService ne dépasse pas 100 Ko) et lus en parallèle (fetchAll). Les paris n'en dépendent pas (cotes du matin).
   v69 : photo de profil de chaque joueur (colonnes F « photo » : petite image JPEG 128 × 128 envoyée par la page, et G « photo v » : son numéro de version).
   « etat » donne seulement les numéros de version ; la page demande les images qu'elle n'a pas encore (action « photos ») et les garde.
   v72 : rappels sur le téléphone (notifications). Onglet « Abonnements » (un appareil par ligne : adresse d'envoi et clés fournies
   par le navigateur, compétitions suivies). La tâche GitHub « Rappels des pronos » lit les abonnements et qui a déjà pronostiqué
   (action « rappels », protégée par la propriété du script CLE_TACHE = secret GitHub PRONOS_CLE), puis envoie les rappels elle-même.
   v77 : paris combinés (action « combiner ») : de 2 à 8 matchs, un seul pari, une ligne de l'onglet Paris (match « C-… », colonne N : les sélections en JSON).
   Cotes figées et multipliées, fermé au premier coup d'envoi. Un match faux : perdu. Tout juste : mise × cote totale. Match reporté ou annulé : retiré du calcul.
   Les crédits et le classement n'ont rien de spécial à faire : la ligne compte comme un pari. Sélections des autres visibles match par match, au coup d'envoi.
   v79 : Ligue des nations (uefa.nations) et Championnat des nations de rugby (17567) dans LIGUES (horaires des pronos).
   v154 : chaque prono est réglé ici, une fois le match terminé (onglet Pronos, colonnes H à L : coup d'envoi, score final, points, réglé le),
   avec les mêmes règles que la page. Une ligne réglée ne bouge plus, même si un fichier de la tâche Sport se vide (Ligue des nations, 18/11/2026).
   Chaque mois fini est clôturé dans l'onglet « Historique » (une ligne par mois, groupe, joueur et jeu : points, exacts, justes, pronos, rang),
   et l'onglet « Tableau » (joueurs en colonnes, mois en lignes) est réécrit à chaque clôture. Réglage et clôture se font à chaque ouverture
   de la page (action « etat ») ; toutRegler() fait la même chose pour tous les groupes depuis l'éditeur.
   v180 : GitHub saute parfois les passages programmés de la tâche Sport pendant des heures (27/11/2026 : rien entre 17 h 32 et la nuit) :
   un match commencé depuis plus de 2 h 30 sans résultat dans les fichiers publiés est demandé directement à ESPN (pronos, paris, combinés).
   Facultatif : relancerTaches() (déclencheur toutes les 30 min, à poser avec installerRelance) relance les tâches Sport, Actus et (v181)
   Programme TV quand leurs données ont trop vieilli (liste lue dans outils/relances.json du site, modifiable sans redéployer), avec un jeton GitHub rangé dans la propriété du script GH_JETON (jamais dans le dépôt).
   Mise en place : voir outils/dev/PRONOS.md. */
const SITE = 'https://zyavo.github.io/iPhone-Dock/';            // adresse du dock publié
const LIGUES = {'fra.1':'fra-1', 'eng.1':'eng-1', '270559':'270559', 'uefa.champions':'uefa-champions', 'uefa.nations':'uefa-nations', '17567':'17567'};   // id ESPN → fichier donnees/sport/<fichier>.json
const EXTRAS = {'esp.1':'esp-1', 'ita.1':'ita-1', 'ger.1':'ger-1', 'uefa.europa':'uefa-europa', 'uefa.europa.conf':'uefa-europa-conf', 'nba':'nba', 'nfl':'nfl'};   // v68 : pronos en plus

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
const JOUEURS = () => feuille('Joueurs', ['groupe', 'pseudo', 'code (empreinte)', 'inscrit le', 'avatar', 'photo', 'photo v'], ['A:C', 'F:G']);
const PRONOS = () => feuille('Pronos', ['groupe', 'pseudo', 'match', 'ligue', 'dom', 'ext', 'le', 'coup d\'envoi', 'score dom', 'score ext', 'points', 'réglé le'], 'A:D');   // v154 : H à L
const HISTORIQUE = () => feuille('Historique', ['mois', 'groupe', 'pseudo', 'jeu', 'points', 'exacts', 'justes', 'pronos', 'rang', 'clôturé le'], 'A:D');   // v154
const ABONNEMENTS = () => feuille('Abonnements', ['groupe', 'pseudo', 'adresse', 'p256dh', 'auth', 'ligues', 'appareil', 'le'], 'A:G');   // v72
const tache = q => { const c = PropertiesService.getScriptProperties().getProperty('CLE_TACHE'); return !!c && c.length >= 16 && String(q.cle || '') === c; };
const PARIS = () => feuille('Paris', ['groupe', 'pseudo', 'match', 'ligue', 'choix', 'mise', 'cote', 'le', 'mois', 'dom', 'ext', 'coup d\'envoi', 'gain', 'selections'], ['A:E', 'I:K', 'N:N']);   // v77 : colonne N (combinés)
const T = v => String(v);                                          // valeur de cellule en texte
const ajouter = (f, ligne) => f.getRange(f.getLastRow() + 1, 1, 1, ligne.length).setValues([ligne]);   // v61 : pas d'appendRow (conversions)
const moisL = r => +r[11] ? moisDe(+r[11]) : (r[8] instanceof Date ? moisDe(r[8]) : T(r[8]));         // v61 : mois d'une ligne de Paris
const AV = s => { const m = /^([^|]{1,8})\|([0-7])$/.exec(String(s || '')); return m ? m[0] : ''; };   // avatar « emoji|n° de couleur »
const PHOTO = s => { s = String(s || ''); return s.length < 40000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/]+=*$/.test(s) ? s : ''; };   // v69
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
  const c = CacheService.getScriptCache(), fichiers = Object.values(LIGUES).concat(Object.values(EXTRAS));
  const cles = fichiers.map(f => 'h:' + f), deja = c.getAll(cles), out = {}, manque = fichiers.filter(f => !deja['h:' + f]);
  fichiers.forEach(f => { if (deja['h:' + f]) Object.assign(out, JSON.parse(deja['h:' + f])); });
  if (manque.length){
    let rep = [];
    try{ rep = UrlFetchApp.fetchAll(manque.map(f => ({url:SITE + 'donnees/sport/' + f + '.json', muteHttpExceptions:true}))); }catch(x){}
    const neuf = {};
    manque.forEach((f, i) => { try{
      const h = {}; (JSON.parse(rep[i].getContentText()).events || []).forEach(e => { h[e.id] = e.t; });
      Object.assign(out, h); neuf['h:' + f] = JSON.stringify(h);
    }catch(x){} });
    try{ if (Object.keys(neuf).length) c.putAll(neuf, 600); }catch(x){}
  }
  return out;
}

/* ---------- Paris (v60) ---------- */
const DEPART = 100, BONUS = [20, 10, 5], COMBI_MAX = 8;
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
/* v180 : résultat lu chez ESPN (tableau des scores du jour du match, gardé 10 min) quand la tâche Sport n'est pas repassée */
const SPORT_DE = lg => lg === 'nba' ? 'basketball' : lg === 'nfl' ? 'football' : /\./.test(String(lg)) ? 'soccer' : 'rugby';
let ESPN_APPELS = 0;                                                // au plus 12 lectures par appel du script (temps de réponse)
function scoresEspn(lg, jour){
  return enCache('e:' + lg + ':' + jour, () => {
    if (ESPN_APPELS >= 12) throw new Error('assez');
    ESPN_APPELS++;
    const r = UrlFetchApp.fetch(`https://site.api.espn.com/apis/site/v2/sports/${SPORT_DE(lg)}/${lg}/scoreboard?dates=${jour}&limit=200`, {muteHttpExceptions:true});
    if (r.getResponseCode() !== 200) throw new Error('espn ' + r.getResponseCode());
    const out = {};
    (JSON.parse(r.getContentText()).events || []).forEach(ev => {
      const k = (ev.competitions || [])[0] || {}, ty = ((ev.status || k.status || {}).type) || {}, eq = k.competitors || [];
      const c = h => eq.find(x => x.homeAway === h) || {};
      out[T(ev.id)] = [ty.state || '', c('home').score == null ? '' : T(c('home').score), c('away').score == null ? '' : T(c('away').score), ty.name || '', Date.parse(ev.date) || 0];
    });
    return out;
  });
}
function resultatEspn(lg, id, t){
  const now = Date.now(); t = +t;
  if (!lg || !t || now < t + 2.5 * 3600e3 || now - t > 10 * 864e5) return null;
  const jours = [...new Set([Utilities.formatDate(new Date(t), 'America/New_York', 'yyyyMMdd'), Utilities.formatDate(new Date(t), 'Europe/Paris', 'yyyyMMdd')])];
  for (const j of jours){ try{ const x = scoresEspn(lg, j)[T(id)]; if (x) return x; }catch(e){} }
  return null;
}
const fini = x => x && x[0] === 'post' && x[1] !== '' && x[2] !== '';
/* règle les paris terminés du groupe (colonne gain : vide = en cours, 0 = perdu, mise × cote = gagné, mise = remboursé) */
function regler(g){
  const f = PARIS(), l = f.getDataRange().getValues(), R = resultats(), now = Date.now(), anciens = {};
  const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
  try{
    l.forEach((r, k) => {
      if (!k || T(r[0]) !== g || r[12] !== '' || now < +r[11]) return;
      if (estCombi(r)){ const z = reglerCombi(r, R, now, anciens); if (z){ if (z.sel) f.getRange(k + 1, 14).setValue(z.sel); if (z.gain !== null) f.getRange(k + 1, 13).setValue(z.gain); } return; }   // v77
      const id = T(r[2]); let x = R[id];
      if (!x && now - +r[11] > 10 * 864e5) x = anciens[id] || (anciens[id] = resultatAncien(r[3], id));
      if (!fini(x)) x = resultatEspn(T(r[3]), id, r[11]) || x;          // v180
      if (!x) return;
      let gain = null;
      if (x[0] === 'post' && x[1] !== '' && x[2] !== ''){ const h = +x[1], a = +x[2], v = h > a ? 'h' : h < a ? 'a' : 'd'; gain = T(r[4]) === v ? Math.round(+r[5] * +r[6]) : 0; }
      else if (/POSTPONED|CANCEL|ABANDON/.test(x[3]) && now - +r[11] > 864e5) gain = +r[5];          // match reporté ou annulé : remboursé
      if (gain !== null) f.getRange(k + 1, 13).setValue(gain);
    });
  }finally{ verrou.releaseLock(); }
}
/* v77 : combiné : résultat de chaque match (r : ok, ko, nul) ; renvoie {sel : JSON à réécrire ou null, gain : null si pas encore décidé} */
const estCombi = r => T(r[2]).slice(0, 2) === 'C-';
function reglerCombi(r, R, now, anciens){
  let s; try{ s = JSON.parse(T(r[13])); }catch(x){ return null; }
  let change = false;
  s.forEach(x => {
    if (x.r || now < +x.t) return;
    let y = R[x.m];
    if (!y && now - +x.t > 10 * 864e5) y = anciens[x.m] || (anciens[x.m] = resultatAncien(x.lg, x.m));
    if (!fini(y)) y = resultatEspn(x.lg, x.m, x.t) || y;                 // v180
    if (!y) return;
    if (y[0] === 'post' && y[1] !== '' && y[2] !== ''){ const h = +y[1], a = +y[2]; x.r = x.c === (h > a ? 'h' : h < a ? 'a' : 'd') ? 'ok' : 'ko'; change = true; }
    else if (/POSTPONED|CANCEL|ABANDON/.test(y[3]) && now - +x.t > 864e5){ x.r = 'nul'; change = true; }
  });
  let gain = null;
  if (s.some(x => x.r === 'ko')) gain = 0;                                       // un match faux suffit
  else if (s.every(x => x.r)){ const ok = s.filter(x => x.r === 'ok'); gain = ok.length ? Math.round(+r[5] * Math.round(100 * ok.reduce((p, x) => p * x.o, 1)) / 100) : +r[5]; }   // tous annulés : remboursé
  return change || gain !== null ? {sel:change ? JSON.stringify(s) : null, gain} : null;
}
/* ---------- v154 : réglage des pronos et historique des mois ---------- */
const jeuDe = lg => EXTRAS[lg] ? 'plus' : 'base';                 // « Pronos en plus » : classement à part
const issue = (h, a) => h > a ? 1 : h < a ? 2 : 0;
/* mêmes règles que la page (pronos.html, points) : NBA et NFL bon vainqueur 1 ; foot score exact 3, bon résultat 1 ;
   rugby bon résultat 1, 3 pour le plus proche du score parmi les bons pronos du groupe (tous = pronos du groupe sur ce match) */
function pointsDe(p, h, a, lg, tous){
  const bon = q => issue(+q[0], +q[1]) === issue(h, a);
  if (lg === 'nba' || lg === 'nfl') return bon(p) ? 1 : 0;
  if (/\./.test(lg)) return +p[0] === h && +p[1] === a ? 3 : bon(p) ? 1 : 0;
  if (!bon(p)) return 0;
  const ecart = q => Math.abs(+q[0] - h) + Math.abs(+q[1] - a);
  return ecart(p) <= Math.min(ecart(p), ...tous.filter(bon).map(ecart)) ? 3 : 1;
}
const debutSaison = () => { const [a, m] = moisDe(Date.now()).split('-').map(Number); return (m >= 7 ? a : a - 1) + '-07'; };   // saison : de juillet à juin
/* règle les pronos des matchs terminés du groupe (colonne K vide = pas encore réglé ; « - » = match annulé, pas compté) */
function reglerPronos(g){
  const verrou = LockService.getScriptLock(); if (!verrou.tryLock(5000)) return;
  try{
    const f = PRONOS(), l = f.getDataRange().getValues(), now = Date.now(), H = horaires(), R = resultats(), fichiers = {}, parMatch = {};
    const ancien = (lg, id) => {                                   // match sorti de passe.json / jours.json : fichier de sa compétition (lu une fois)
      const c = LIGUES[lg] || EXTRAS[lg] || String(lg).replace(/\./g, '-');
      if (!fichiers[c]){ fichiers[c] = {}; try{ (lire('donnees/sport/' + c + '.json').events || []).forEach(e => { if (e.home) fichiers[c][e.id] = resume(e); }); }catch(x){} }
      return fichiers[c][id] || null;
    };
    l.forEach((r, k) => { if (k && T(r[0]) === g && r[10] === '') (parMatch[T(r[2])] || (parMatch[T(r[2])] = [])).push(k); });
    Object.entries(parMatch).forEach(([id, ks]) => {
      const r0 = l[ks[0]], lg = T(r0[3]), le = r0[6] instanceof Date ? r0[6].getTime() : now;
      let t = +r0[7] || H[id] || 0, x = R[id];
      if (!x && (t ? now > t + 2 * 3600e3 : true) && now - (t || le) < 60 * 864e5) x = ancien(lg, id);
      if (!fini(x)) x = resultatEspn(lg, id, (x && +x[4]) || t) || x;    // v180 : la tâche Sport n'est pas repassée
      if (x && +x[4]) t = +x[4];
      if (!x) return;
      if (x[0] === 'post' && x[1] !== '' && x[2] !== ''){
        const h = +x[1], a = +x[2], tous = l.filter((r, k) => k && T(r[0]) === g && T(r[2]) === id).map(r => [r[4], r[5]]);
        ks.forEach(k => { const pt = pointsDe([l[k][4], l[k][5]], h, a, lg, tous); f.getRange(k + 1, 8, 1, 5).setValues([[t || '', h, a, pt, new Date()]]); });
      } else if (/CANCEL|ABANDON/.test(x[3] || '') && now - t > 2 * 864e5) ks.forEach(k => f.getRange(k + 1, 8, 1, 5).setValues([[t || '', '', '', '-', new Date()]]));
      else if (t && !+r0[7]) ks.forEach(k => f.getRange(k + 1, 8).setValue(t));   // pas fini : on note déjà le coup d'envoi (mois du prono)
    });
  }finally{ verrou.releaseLock(); }
}
/* clôture des mois finis : une ligne par joueur ayant au moins un prono réglé ce mois-là (mois du coup d'envoi, heure de Paris),
   quand tous les pronos du mois sont réglés, ou au plus tard 3 jours après la fin du mois. Une fois écrit, un mois ne change plus. */
function cloturer(g){
  const verrou = LockService.getScriptLock(); if (!verrou.tryLock(5000)) return false;
  try{
    const hf = HISTORIQUE(), fait = new Set(hf.getDataRange().getValues().slice(1).filter(r => T(r[1]) === g).map(r => T(r[0]) + '|' + T(r[3])));
    const cur = moisDe(Date.now()), paquets = {};
    PRONOS().getDataRange().getValues().slice(1).forEach(r => { if (T(r[0]) !== g || !+r[7]) return;
      const M = moisDe(+r[7]); if (M < cur) (paquets[M + '|' + jeuDe(T(r[3]))] || (paquets[M + '|' + jeuDe(T(r[3]))] = [])).push(r); });
    let ajout = false;
    Object.keys(paquets).sort().forEach(k => {
      if (fait.has(k)) return;
      const [M, jeu] = k.split('|'), rs = paquets[k], [a, m] = suivant(M).split('-').map(Number);
      if (rs.some(r => r[10] === '') && Date.now() < Date.UTC(a, m - 1, 1) + 3 * 864e5) return;    // pronos pas encore tous réglés : on attend
      const S = {};
      rs.forEach(r => { if (r[10] === '' || r[10] === '-') return; const p = T(r[1]), x = S[p] || (S[p] = {p, pts:0, ex:0, bons:0, nb:0}), pt = +r[10];
        x.pts += pt; x.nb++; if (pt === 3) x.ex++; if (pt) x.bons++; });
      Object.values(S).sort((x, y) => y.pts - x.pts || y.ex - x.ex || x.nb - y.nb || x.p.localeCompare(y.p))
        .forEach((x, i) => { ajouter(hf, [M, g, x.p, jeu, x.pts, x.ex, x.bons, x.nb, i + 1, new Date()]); ajout = true; });
    });
    if (ajout) tableau();
    return ajout;
  }finally{ verrou.releaseLock(); }
}
/* onglet « Tableau » (lecture seule, réécrit à chaque clôture) : par groupe et par jeu, joueurs en colonnes, mois en lignes, total en bas */
function tableau(){
  const ss = SpreadsheetApp.getActive(), f = ss.getSheetByName('Tableau') || ss.insertSheet('Tableau'), blocs = {}, out = [], titres = [];
  HISTORIQUE().getDataRange().getValues().slice(1).forEach(r => { const k = T(r[1]) + '|' + T(r[3]); (blocs[k] || (blocs[k] = [])).push(r); });
  Object.keys(blocs).sort().forEach(k => {
    const [g, jeu] = k.split('|'), rs = blocs[k], noms = [...new Set(rs.map(r => T(r[2])))].sort((x, y) => x.localeCompare(y)), mois = [...new Set(rs.map(r => T(r[0])))].sort();
    titres.push(out.length + 1); out.push([g + (jeu === 'plus' ? ' — Pronos en plus' : ' — Pronos'), ...noms]);
    mois.forEach(M => out.push([M, ...noms.map(n => { const r = rs.find(x => T(x[0]) === M && T(x[2]) === n); return r ? +r[4] : ''; })]));
    titres.push(out.length + 1); out.push(['Total', ...noms.map(n => rs.filter(x => T(x[2]) === n).reduce((s, x) => s + +x[4], 0))]);
    out.push(['']);
  });
  f.clear();
  if (!out.length) return;
  const w = Math.max(...out.map(r => r.length)), v = out.map(r => r.concat(Array(w - r.length).fill('')));
  f.getRange(1, 1, v.length, 1).setNumberFormat('@');               // « 2026-11 » reste un texte
  f.getRange(1, 1, v.length, w).setValues(v);
  titres.forEach(n => f.getRange(n, 1, 1, w).setFontWeight('bold'));
  f.setFrozenColumns(1);
}
/* depuis l'éditeur (menu des fonctions › toutRegler › Exécuter) : règle et clôture tout de suite, pour tous les groupes */
function toutRegler(){
  const groupes = [...new Set(JOUEURS().getDataRange().getValues().slice(1).map(r => T(r[0])).filter(Boolean))];
  groupes.forEach(g => { reglerPronos(g); cloturer(g); });
  tableau();
  Logger.log(groupes.length + ' groupe(s) réglé(s) ; voir les onglets Pronos (colonnes H à L), Historique et Tableau');
}

/* soldes mois par mois (mois du coup d'envoi, heure de Paris) ; podium des mois finis (joueurs ayant parié) → bonus du mois suivant ; général = cumul des soldes de fin de mois */
function bilan(g){
  const joueurs = JOUEURS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === g).map(r => T(r[1]));
  const rows = PARIS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === g);
  const cur = moisDe(Date.now()), parMois = {}, podiums = {}, general = {};
  let M = rows.reduce((m, r) => moisL(r) < m ? moisL(r) : m, cur), bonus = {};
  for (let garde = 0; garde < 120; garde++){
    const b = {};
    joueurs.forEach(p => { b[p] = {depart:DEPART + (bonus[p] || 0), bonus:bonus[p] || 0, mise:0, gains:0, enJeu:0, nb:0}; });
    rows.filter(r => moisL(r) === M).forEach(r => { const x = b[T(r[1])]; if (!x) return; x.nb++; x.mise += +r[5]; if (r[12] === '') x.enJeu += +r[5]; else x.gains += +r[12]; });
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
      ajouter(f, [g, p, empreinte(g, p, pin), new Date(), av]);
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
      const ligne = [j.g, j.p, String(q.match), String(q.ligue || ''), h, a, new Date(), t];          // v154 : + coup d'envoi (colonne H)
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else ajouter(f, ligne);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  avatar(q){
    const j = joueur(q); if (!j) return {err:'code'};
    const av = AV(q.avatar); if (!av) return {err:'avatar'};
    JOUEURS().getRange(j.ligne, 5).setValue(av);
    return {ok:true};
  },
  photo(q){                                                        // v69 : photo de profil (vide = retirer)
    const j = joueur(q); if (!j) return {err:'code'};
    const d = String(q.photo || ''), ph = PHOTO(d); if (d && !ph) return {err:'photo'};
    const v = ph ? 'v' + Date.now().toString(36) : '';
    JOUEURS().getRange(j.ligne, 6, 1, 2).setValues([[ph, v]]);
    return {ok:true, v};
  },
  photos(q){                                                       // v69 : images des joueurs demandés (même groupe)
    const j = joueur(q); if (!j) return {err:'code'};
    const noms = [].concat(q.noms || []).map(String).slice(0, 60), photos = {};
    JOUEURS().getDataRange().getValues().slice(1).forEach(r => { if (T(r[0]) === j.g && noms.includes(T(r[1])) && PHOTO(r[5])) photos[T(r[1])] = {v:T(r[6]), d:T(r[5])}; });
    return {photos};
  },
  abonner(q){                                                      // v72 : rappels sur cet appareil (remplace un abonnement de la même adresse)
    const j = joueur(q); if (!j) return {err:'code'};
    const s = q.sub || {}, k = s.keys || {}, adr = String(s.endpoint || ''), cle = String(k.p256dh || ''), aut = String(k.auth || '');
    if (!/^https:\/\/[^\s"<>]{10,900}$/.test(adr) || !/^[A-Za-z0-9_-]{80,100}$/.test(cle) || !/^[A-Za-z0-9_-]{16,30}$/.test(aut)) return {err:'abonnement'};
    const ligues = [].concat(q.ligues || []).map(String).filter(x => /^[\w.]{1,30}$/.test(x)).slice(0, 20).join(',');
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = ABONNEMENTS(), l = f.getDataRange().getValues();
      const ligne = [j.g, j.p, adr, cle, aut, ligues, String(q.appareil || '').slice(0, 30), new Date()];
      const i = l.findIndex((r, n) => n > 0 && T(r[2]) === adr);
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else ajouter(f, ligne);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  desabonner(q){                                                   // v72 : par le joueur (son appareil) ou par la tâche (adresse expirée)
    const t = tache(q), j = t ? null : joueur(q); if (!t && !j) return {err:'code'};
    const adr = String(q.endpoint || ''); if (!adr) return {err:'abonnement'};
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = ABONNEMENTS(), l = f.getDataRange().getValues();
      for (let n = l.length - 1; n > 0; n--) if (T(l[n][2]) === adr && (t || (T(l[n][0]) === j.g && T(l[n][1]) === j.p))) f.deleteRow(n + 1);
      return {ok:true};
    }finally{ verrou.releaseLock(); }
  },
  rappels(q){                                                      // v72 : pour la tâche « Rappels des pronos » seulement
    if (!tache(q)) return {err:'cle'};
    const H = horaires(), now = Date.now(), faits = {};
    PRONOS().getDataRange().getValues().slice(1).forEach(r => { const id = T(r[2]); if (H[id] && H[id] > now - 3 * 3600e3) (faits[T(r[0]) + '|' + T(r[1])] || (faits[T(r[0]) + '|' + T(r[1])] = [])).push(id); });
    const abonnements = ABONNEMENTS().getDataRange().getValues().slice(1).filter(r => T(r[2]))
      .map(r => ({g:T(r[0]), p:T(r[1]), endpoint:T(r[2]), keys:{p256dh:T(r[3]), auth:T(r[4])}, ligues:T(r[5]).split(',').filter(Boolean)}));
    return {abonnements, faits};
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
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else ajouter(f, ligne);
      return {ok:true, cote};
    }finally{ verrou.releaseLock(); }
  },
  combiner(q){                                                     // v77 : créer, modifier (q.id) ou annuler (q.id + q.annuler) un combiné
    const j = joueur(q); if (!j) return {err:'code'};
    regler(j.g);
    const verrou = LockService.getScriptLock(); verrou.waitLock(10000);
    try{
      const f = PARIS(), l = f.getDataRange().getValues(), now = Date.now(), id0 = String(q.id || '');
      const i = id0 ? l.findIndex((r, k) => k > 0 && T(r[0]) === j.g && T(r[1]) === j.p && T(r[2]) === id0 && estCombi(r)) : -1;
      if (id0 && i < 1) return {err:'combi'};
      if (i > 0 && now >= +l[i][11]) return {err:'ferme'};
      if (q.annuler){ if (i > 0) f.deleteRow(i + 1); return {ok:true}; }
      const S = Array.isArray(q.selections) ? q.selections : [], C = cotesMatin(), sel = [], vus = {};
      if (S.length < 2 || S.length > COMBI_MAX) return {err:'nombre'};
      for (const s of S){
        const id = String(s.match), c = String(s.choix || ''), cc = C[id];
        if (vus[id]) return {err:'double'}; vus[id] = 1;
        if (!/^[hda]$/.test(c)) return {err:'choix'};
        if (!cc) return {err:'cote'};
        if (now >= cc.t) return {err:'ferme'};
        sel.push({m:id, c, o:cc.c['hda'.indexOf(c)], lg:cc.lg, d:cc.eq[0] || '', e:cc.eq[1] || '', t:cc.t});
      }
      const mise = Math.floor(Number(q.mise)); if (!(mise >= 1)) return {err:'mise'};
      sel.sort((a, b) => a.t - b.t);
      const cote = Math.round(100 * sel.reduce((p, x) => p * x.o, 1)) / 100, t0 = sel[0].t, M = moisDe(t0);
      const x = (bilan(j.g).parMois[M] || {})[j.p] || {solde:DEPART}, dispo = x.solde + (i > 0 ? +l[i][5] : 0);
      if (mise > dispo) return {err:'solde', dispo};
      const id = i > 0 ? id0 : 'C-' + Utilities.getUuid().slice(0, 8);
      const ligne = [j.g, j.p, id, 'combi', 'c', mise, cote, new Date(), M, 'Combiné', sel.length + ' matchs', t0, '', JSON.stringify(sel)];
      if (i > 0) f.getRange(i + 1, 1, 1, ligne.length).setValues([ligne]); else ajouter(f, ligne);
      return {ok:true, id, cote};
    }finally{ verrou.releaseLock(); }
  },
  paris(q){
    const j = joueur(q); if (!j) return {err:'code'};
    regler(j.g);
    const B = bilan(j.g), now = Date.now(), C = cotesMatin(), cotes = {};
    Object.entries(C).forEach(([id, c]) => { if (c.t > now - 6 * 3600e3) cotes[id] = c; });
    const paris = PARIS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g && (T(r[1]) === j.p || now >= +r[11]))   // paris des autres : au coup d'envoi
      .map(r => { const o = {p:T(r[1]), match:T(r[2]), lg:T(r[3]), choix:T(r[4]), mise:+r[5], cote:+r[6], mois:moisL(r), dom:T(r[9]), ext:T(r[10]), t:+r[11], gain:r[12] === '' ? null : +r[12]};
        if (estCombi(r)) try{ const s = JSON.parse(T(r[13])); o.sel = T(r[1]) === j.p ? s : s.map(x => now >= +x.t ? x : {cache:1, t:x.t}); }catch(x){}   // v77 : les matchs pas commencés d'un autre restent cachés
        return o; });
    const qui = {};
    PARIS().getDataRange().getValues().slice(1).forEach(r => { if (T(r[0]) === j.g && now < +r[11]) (qui[T(r[2])] || (qui[T(r[2])] = [])).push(T(r[1])); });
    return {mois:B.mois, soldes:B.parMois[B.mois], podiums:B.podiums, general:B.general, cotes, paris, qui};
  },
  etat(q){
    const j = joueur(q); if (!j) return {err:'code'};
    try{ reglerPronos(j.g); cloturer(j.g); }catch(x){}                 // v154 : un souci de réglage ne doit pas empêcher d'afficher la page
    const H = horaires(), now = Date.now(), pronos = {}, qui = {}, res = {}, debut = debutSaison();
    const histo = HISTORIQUE().getDataRange().getValues().slice(1).filter(r => T(r[1]) === j.g)
      .map(r => [T(r[0]), T(r[3]), T(r[2]), +r[4], +r[5], +r[6], +r[7], +r[8]]);           // [mois, jeu, pseudo, points, exacts, justes, pronos, rang]
    const fermes = new Set(histo.map(x => x[0] + '|' + x[1]));
    PRONOS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g).forEach(r => {
      const t = +r[7], M = t ? moisDe(t) : '';                     // v154 : résultat des matchs réglés pas encore clôturés (la page les compte même s'ils ne sont plus dans ses fichiers)
      if (r[10] !== '' && r[10] !== '-' && t && M >= debut && !fermes.has(M + '|' + jeuDe(T(r[3])))) res[T(r[2])] = [+r[8], +r[9], t, T(r[3])];
      const id = T(r[2]), nom = T(r[1]), h0 = H[id] || t, commence = r[10] !== '' || (h0 && now >= h0);   // v154 : horaire noté dans la ligne si le fichier du match a disparu
      if (!commence) (qui[id] || (qui[id] = [])).push(nom);    // v56 : qui a déjà pronostiqué (sans le score)
      if (nom !== j.p && !commence) return;                    // pronos des autres : seulement une fois le match commencé
      (pronos[id] || (pronos[id] = {}))[nom] = [r[4], r[5]];
    });
    const joueurs = [], avatars = {}, photos = {};
    JOUEURS().getDataRange().getValues().slice(1).filter(r => T(r[0]) === j.g).forEach(r => { joueurs.push(T(r[1])); if (AV(r[4])) avatars[T(r[1])] = T(r[4]); if (r[5] && T(r[6])) photos[T(r[1])] = T(r[6]); });
    return {joueurs, pronos, avatars, photos, qui, res, histo, debut};
  }
};

/* À lancer une fois depuis l'éditeur (menu des fonctions › verifier › Exécuter) : demande les autorisations
   et vérifie que les horaires des matchs se lisent sur le site publié (journal : nombre de matchs trouvés). */
function verifier(){
  CacheService.getScriptCache().removeAll(Object.values(LIGUES).concat(Object.values(EXTRAS)).map(f => 'h:' + f));
  const n = Object.keys(horaires()).length;
  Logger.log(n ? n + ' matchs trouvés sur ' + SITE : 'Aucun match lu : vérifier SITE (' + SITE + ')');
  JOUEURS(); PRONOS(); PARIS(); ABONNEMENTS(); HISTORIQUE();
  Logger.log(PropertiesService.getScriptProperties().getProperty('CLE_TACHE') ? 'Rappels : CLE_TACHE en place' : 'Rappels : propriété du script CLE_TACHE absente (voir PRONOS.md)');
  Logger.log(Object.keys(cotesMatin()).length + ' matchs avec la cote du matin');
}

/* ---------- v180 : relance des tâches Sport et Actus quand GitHub saute leurs passages programmés ----------
   1. GitHub › Settings › Developer settings › Fine-grained tokens : dépôt ZyAvo/iPhone-Dock seulement, permission « Actions : Read and write ».
   2. Ici : Paramètres du projet (⚙️) › Propriétés du script › GH_JETON = le jeton (il ne va jamais dans le dépôt).
   3. Lancer installerRelance une fois depuis l'éditeur (autorisations) : relancerTaches tourne ensuite toutes les 30 min.
   Sans GH_JETON, relancerTaches ne fait rien. */
const DEPOT = 'ZyAvo/iPhone-Dock';
const RELANCES = [                                                  // secours si outils/relances.json est illisible (v181)
  {tache:'sport.yml', fichier:'donnees/sport/jours.json', soir:50, jour:150},
  {tache:'actus.yml', fichier:'donnees/actus/actus.json', soir:45, jour:45},
  {tache:'programme-tv.yml', fichier:'tv.json', soir:300, jour:300}
];
/* v181 : liste publiée avec le site (outils/relances.json) : tâche, fichier qui porte sa date (« updated »), âge maximal en minutes
   le soir (17 h – 1 h et le week-end après midi) et le reste du temps */
function listeRelances(){
  try{
    const l = enCache('relances', () => {
      const r = UrlFetchApp.fetch(SITE + 'outils/relances.json?t=' + Math.floor(Date.now() / 36e5), {muteHttpExceptions:true});
      if (r.getResponseCode() !== 200) throw new Error('relances ' + r.getResponseCode());
      return JSON.parse(r.getContentText()).taches;
    });
    const ok = (l || []).filter(x => x && /^[a-z0-9-]+\.yml$/.test(x.tache) && /^[\w./-]+\.json$/.test(x.fichier) && !/\.\./.test(x.fichier) && +x.soir > 0 && +x.jour > 0);
    if (ok.length) return ok;
  }catch(e){}
  return RELANCES;
}
function relancerTaches(){
  const jeton = PropertiesService.getScriptProperties().getProperty('GH_JETON');
  if (!jeton) return;
  const h = +Utilities.formatDate(new Date(), 'Europe/Paris', 'H'), soir = h >= 17 || h < 1, wk = /^(Sat|Sun)/.test(Utilities.formatDate(new Date(), 'Europe/Paris', 'EEE'));
  listeRelances().forEach(x => {
    let age = Infinity;
    try{ age = (Date.now() - Date.parse(JSON.parse(UrlFetchApp.fetch(SITE + x.fichier + '?t=' + Date.now(), {muteHttpExceptions:true}).getContentText()).updated)) / 60e3; }catch(e){}
    if (!(age > (soir || (wk && h >= 12) ? x.soir : x.jour))) return;
    const r = UrlFetchApp.fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows/${x.tache}/dispatches`, {method:'post', muteHttpExceptions:true, contentType:'application/json',
      headers:{Authorization:'Bearer ' + jeton, Accept:'application/vnd.github+json'}, payload:JSON.stringify({ref:'main'})});
    Logger.log(`${x.tache} : données de ${Math.round(age)} min → relance ${r.getResponseCode() === 204 ? 'demandée' : 'refusée (' + r.getResponseCode() + ')'}`);
  });
}
function installerRelance(){
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'relancerTaches').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('relancerTaches').timeBased().everyMinutes(30).create();
  Logger.log('Relance posée (toutes les 30 min). ' + (PropertiesService.getScriptProperties().getProperty('GH_JETON') ? 'Jeton GH_JETON trouvé.' : 'Il manque la propriété du script GH_JETON.'));
  relancerTaches();
}
