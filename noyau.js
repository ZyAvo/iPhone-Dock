// mon-ecran-version: cf06040b
/* Mon Écran — noyau commun à toutes les pages, et base des futures applis dédiées (iPhone, Android, PC).
   Rien ici ne dépend d'une astuce de Safari : ce qui est propre à « l'iPhone en mode web » est rangé dans Noyau.iphoneWeb,
   et une appli dédiée pourra fournir window.MonEcranNatif (ouvrir un lien, garder la clé…) que le noyau utilisera en priorité.
   - Noyau.config('sport.leagues', défaut)  réglages du classeur (config/config.js) ; aussi disponible sous window.CFG
   - Noyau.stockage                         mémoire de l'appareil (localStorage / sessionStorage), sans jamais planter
   - Noyau.appareil()                       iPhone, iPad, Android ou ordinateur ; appli de l'écran d'accueil ou navigateur
   - Noyau.lien                             quel lien ouvrir selon l'appareil (appli iPhone, appli Android, site) et ouverture
   - Noyau.depot                            lire / écrire un fichier du dépôt GitHub avec la clé de la synchronisation
   - Noyau.synchro                          accès à la synchronisation chiffrée (synchro.js), quand la page la charge
   - Noyau.catalogue                        config/catalogue.json : tout le catalogue du classeur et son état
   - Noyau.modifs                           choix faits dans l'appli → config/modifs.json ; la tâche « Configuration »
                                            les reporte dans configuration.xlsx (le classeur reste la référence) */
(() => {
'use strict';
const natif = () => window.MonEcranNatif || null;            // pont fourni par une future appli dédiée (absent sur le web)

/* ---------- Configuration (config/config.js, écrit par la tâche « Configuration ») ---------- */
const revive = x => Array.isArray(x) ? x.map(revive)
  : x && typeof x === 'object' ? (Object.keys(x).length === 2 && 're' in x && 'flags' in x ? new RegExp(x.re, x.flags) : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, revive(v)])))
  : x;
/* la valeur du classeur si elle existe, sinon la valeur par défaut (celle écrite dans la page) ; {re, flags} redevient une expression régulière */
function config(chemin, defaut){
  try{ const v = String(chemin).split('.').reduce((o, k) => o == null ? o : o[k], window.MON_ECRAN_CONFIG); return v == null ? defaut : revive(v); }
  catch{ return defaut; }
}

/* ---------- Mémoire de l'appareil ---------- */
const memoire = zone => ({
  lire(k, d){ try{ const v = JSON.parse(window[zone].getItem(k)); return v ?? d; }catch{ return d; } },
  ecrire(k, v){ try{ v == null ? window[zone].removeItem(k) : window[zone].setItem(k, JSON.stringify(v)); return true; }catch{ return false; } },
  texte(k, d = ''){ try{ const v = window[zone].getItem(k); return v ?? d; }catch{ return d; } },       // valeur gardée telle quelle (pas en JSON)
  effacer(k){ try{ window[zone].removeItem(k); }catch{} },
});
const stockage = {...memoire('localStorage'), session:memoire('sessionStorage'),
  /* prévient quand une autre page (ou un autre onglet) change cette clé */
  ecouter(k, fn){ const h = e => { if (e.key === k) fn(stockage.lire(k)); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }};

/* ---------- Propre à l'iPhone en mode web (Safari, appli ajoutée à l'écran d'accueil) ---------- */
const iphoneWeb = {
  ecranAccueil: () => navigator.standalone === true,                                    // ouvert depuis l'icône de l'écran d'accueil
  raccourci: nom => `shortcuts://run-shortcut?name=${encodeURIComponent(nom)}`,          // appli Raccourcis, en secours d'une appli
};

/* ---------- Appareil ---------- */
function appareil(){
  const ua = navigator.userAgent || '', tactile = (navigator.maxTouchPoints || 0) > 1;
  const type = /iPhone|iPod/.test(ua) ? 'iphone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && tactile) ? 'ipad' : /Android/.test(ua) ? 'android' : 'ordinateur';
  let installe = false; try{ installe = iphoneWeb.ecranAccueil() || matchMedia('(display-mode: standalone)').matches; }catch{}
  return {type, os:type === 'iphone' || type === 'ipad' ? 'ios' : type === 'android' ? 'android' : 'autre',
          nom:{iphone:'iPhone', ipad:'iPad', android:'Android', ordinateur:'ordinateur'}[type], installe, dediee:!!natif(), tactile};
}

/* ---------- Liens : appli iPhone (app, alt = raccourci), appli Android (android), site (web ou url) ---------- */
const lien = {
  /* adresses à essayer dans l'ordre sur cet appareil */
  chaine(item, app = appareil()){
    if (!item) return [];
    if (typeof item === 'string') return [item];
    const web = item.web || item.url || '';
    const L = app.os === 'ios' ? [item.app, item.alt ? iphoneWeb.raccourci(item.alt) : '', web]
            : app.os === 'android' ? [item.android, web]
            : [web];
    return [...new Set(L.filter(Boolean))];
  },
  pour: (item, app) => lien.chaine(item, app)[0] || '',
  /* ouvre l'appli (puis le secours suivant si rien ne s'est ouvert en 1,5 s) ; false s'il n'y a rien pour cet appareil */
  ouvrir(item){
    const n = natif(); if (n && typeof n.ouvrir === 'function') return n.ouvrir(item) !== false;
    const app = appareil(), L = lien.chaine(item, app);
    if (!L.length) return false;
    if (app.os === 'autre'){ window.open(L[0], '_blank', 'noopener'); return true; }        // ordinateur : le site, dans un nouvel onglet
    let parti = false; const part = () => { parti = true; };
    document.addEventListener('visibilitychange', part, {once:true});
    window.addEventListener('pagehide', part, {once:true});
    window.addEventListener('blur', part, {once:true});
    const essai = i => {
      if (parti || document.hidden || i >= L.length) return;
      window.location.href = L[i];
      setTimeout(() => essai(i + 1), 1500);
    };
    essai(0); return true;
  },
};

/* ---------- Dépôt GitHub (même clé que la synchronisation, gardée chiffrée avec ton code) ---------- */
const DEPOT = (() => { const h = location.hostname.match(/^([\w-]+)\.github\.io$/), p = location.pathname.split('/').filter(Boolean)[0];
  return h && p ? `${h[1]}/${p}` : 'ZyAvo/iPhone-Dock'; })();
const API = `https://api.github.com/repos/${DEPOT}`;
const b64 = s => { const u = new TextEncoder().encode(s); let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(t); };
const deb64 = s => new TextDecoder().decode(Uint8Array.from(atob(String(s).replace(/\s+/g, '')), c => c.charCodeAt(0)));
const MSG = {verrou:'déverrouille d\'abord avec ton code (synchronisation active dans État)', inactif:'active la synchronisation dans État (elle fournit la clé GitHub)',
  jeton:'clé GitHub refusée (expirée ou mal copiée)', droits:'la clé GitHub n\'a pas le droit d\'écrire sur le dépôt', limite:'trop de demandes à GitHub, réessaie dans quelques minutes',
  reseau:'pas de réseau ou GitHub injoignable', conflit:'modifications simultanées, réessaie'};
const depot = {
  nom:DEPOT,
  site:chemin => new URL(chemin, document.baseURI).href,                                 // fichier publié avec le site (GitHub Pages)
  async jeton(){ const n = natif(); if (n && n.jeton) return n.jeton();
    return window.Synchro && Synchro.jeton ? Synchro.jeton() : null; },
  async demande(chemin, opt = {}, jeton){
    jeton = jeton || await depot.jeton(); if (!jeton) throw new Error(window.Synchro && Synchro.actif() ? 'verrou' : 'inactif');
    let r; try{ r = await fetch(API + chemin, {...opt, cache:'no-store', headers:{accept:'application/vnd.github+json', authorization:'Bearer ' + jeton, ...(opt.headers || {})}}); }
    catch{ throw new Error('reseau'); }
    if (r.status === 401) throw new Error('jeton');
    if (r.status === 403) throw new Error(r.headers.get('x-ratelimit-remaining') === '0' ? 'limite' : 'droits');
    return r;
  },
  /* {texte, sha} ou null si le fichier n'existe pas */
  async lire(chemin, {branche = 'main', jeton} = {}){
    const r = await depot.demande(`/contents/${chemin}?ref=${encodeURIComponent(branche)}`, {}, jeton);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('reseau');
    const j = await r.json(); return {texte:deb64(j.content || ''), sha:j.sha};
  },
  /* écrit (crée ou remplace) un fichier ; sha = version lue juste avant (sinon « conflit ») ; renvoie la nouvelle version */
  async ecrire(chemin, texte, {sha, message, branche = 'main', jeton} = {}){
    const body = {message:message || `Mon Écran (${appareil().nom})`, content:b64(texte), branch:branche, ...(sha ? {sha} : {})};
    const r = await depot.demande(`/contents/${chemin}`, {method:'PUT', body:JSON.stringify(body)}, jeton);
    if (r.status === 409 || r.status === 422) throw new Error('conflit');                 // un autre appareil vient d'écrire
    if (!r.ok) throw new Error(r.status === 404 ? 'droits' : 'reseau');
    return (await r.json()).content.sha;
  },
};

/* ---------- Synchronisation (synchro.js, chargée par les pages qui en ont besoin) ---------- */
const synchro = {
  actif:() => !!(window.Synchro && Synchro.actif()),
  pret:async () => !!(window.Synchro && await Synchro.pret()),
  ouvrirAvecCode:pin => window.Synchro ? Synchro.ouvrirAvecCode(pin) : Promise.resolve(null),
};

/* ---------- Catalogue : tout ce que le classeur propose, et ce qui est choisi ---------- */
let CAT = null, INDEX = {};
const choisiAvec = (secOui, oui) => oui === 'Oui' || (secOui === 'Oui' && oui !== 'Non');
function indexer(c){
  INDEX = {};
  for (const [mid, m] of Object.entries(c.modules || {})){
    for (const s of m.sections || []){
      INDEX[s.id] = {module:mid, section:s, item:null};
      for (const it of s.items || []) INDEX[it.id] = {module:mid, section:s, item:it};
    }
    for (const a of m.ajouts || []) INDEX[a.id] = {module:mid, section:null, item:a, ajout:true};
  }
}
const catalogue = {
  /* frais : lu directement sur GitHub (si la clé est disponible) plutôt que sur le site publié, qui a 1 à 2 min de retard */
  async charger({frais = false} = {}){
    if (CAT && !frais) return CAT;
    let c = null;
    if (frais){ try{ const f = await depot.lire('config/catalogue.json'); if (f) c = JSON.parse(f.texte); }catch{} }
    if (!c){ const r = await fetch(depot.site('config/catalogue.json'), {cache:'no-cache'});
      if (!r.ok) throw new Error('catalogue introuvable : dépose configuration.xlsx (tâche « Configuration »)'); c = await r.json(); }
    CAT = c; indexer(c); modifs.nettoyer(); return c;
  },
  get donnees(){ return CAT; },
  element:id => INDEX[id] || null,
  /* état d'un élément ou d'une section une fois reportées les modifications en attente */
  etat(id){
    const e = INDEX[id]; if (!e) return null;
    const enAttente = modifs.enAttente(), applique = (cid, base) => enAttente.filter(m => m.id === cid && m.champs).reduce((o, m) => ({...o, ...m.champs}), base);
    if (!e.item){ const v = applique(id, {Oui:e.section.oui}); return {oui:v.Oui || '', champs:{}, attente:enAttente.some(m => m.id === id)}; }
    const v = applique(id, {Oui:e.item.oui, ...(e.item.champs || {})}), secOui = e.section ? applique(e.section.id, {Oui:e.section.oui}).Oui : '';
    const {Oui, ...champs} = v;
    return {oui:Oui || '', champs, choisi:e.ajout ? Oui === 'Oui' : choisiAvec(secOui, Oui || ''), support:e.item.support || 'ok',
            attente:enAttente.some(m => m.id === id || (e.section && m.id === e.section.id))};
  },
  resultat:uid => (CAT && CAT.modifs && CAT.modifs.traitees || {})[uid] || null,
};

/* ---------- Modifications faites dans l'appli → config/modifs.json ---------- */
const CHEMIN = 'config/modifs.json', ATTENTE = 'modifs:attente', ENVOYEES = 'modifs:envoyees', REPORTEES = 'modifs:reportees';
const uid = () => Date.now().toString(36) + '-' + Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(36).padStart(2, '0')).join('');
const signaler = () => { try{ window.dispatchEvent(new CustomEvent('noyau:modifs', {detail:modifs.enAttente()})); }catch{} };
const signalerEnvoi = resultat => { try{ window.dispatchEvent(new CustomEvent('noyau:envoi', {detail:{resultat}})); }catch{} };   // 'encours', 'envoye', 'rien', 'verrou', 'inactif', 'erreur:…'
const ajouterAttente = m => { const A = stockage.lire(ATTENTE, []); A.push({uid:uid(), at:new Date().toISOString(), par:appareil().nom, ...m}); stockage.ecrire(ATTENTE, A); signaler(); return A[A.length - 1].uid; };
let enCours = Promise.resolve(), tPlusTard = null, attentePlusTard = [], envoi = new Set();          // envoi : uid en cours d'envoi (plus complétés)
const modifs = {
  /* change une ou plusieurs colonnes d'un élément : modifier('actus:une:le-monde', {Oui:'Non'}) ; colonnes possibles :
     Oui, Widget accueil, Par défaut (valeurs « Oui », « Non » ou vide) et, pour les applis, Lien iPhone, Lien Android, Lien web */
  modifier(id, champs, {nom} = {}){
    const A = stockage.lire(ATTENTE, []), x = A.find(m => m.id === id && m.champs && !m.effacer && !envoi.has(m.uid));
    if (x){ Object.assign(x.champs, champs); x.at = new Date().toISOString(); stockage.ecrire(ATTENTE, A); signaler(); return x.uid; }   // pas encore envoyée : on la complète
    return ajouterAttente({id, ...(nom ? {nom} : {}), champs:{...champs}});
  },
  choisir:(id, oui) => modifs.modifier(id, {Oui:oui === true ? 'Oui' : oui === false ? 'Non' : oui || ''}),
  /* nouvel élément dans les lignes « Mes ajouts » d'un onglet (actus, actus-en, sport, marches, videos, youtube, tv, cotes, applis) */
  ajouter:(module, {section = '', nom = '', source = '', champs = {}} = {}) => ajouterAttente({ajout:{module, section, nom, source}, champs}),
  effacer:(id, nom) => ajouterAttente({id, nom, effacer:true}),           // un de tes ajouts (id « ajout:module:n »)
  verifier:() => ajouterAttente({verif:true}),                            // essai de bout en bout : la tâche répond sans rien changer
  annuler(u){ stockage.ecrire(ATTENTE, stockage.lire(ATTENTE, []).filter(m => m.uid !== u)); signaler(); },
  /* faites ici et pas encore reportées dans le classeur (envoyées ou non), dans l'ordre */
  enAttente(){
    const t = CAT && CAT.modifs && CAT.modifs.traitees || {};
    return [...stockage.lire(ENVOYEES, []), ...stockage.lire(ATTENTE, []).map(m => ({...m, nonEnvoyee:true}))].filter(m => !t[m.uid]);
  },
  nonEnvoyees:() => stockage.lire(ATTENTE, []),
  /* oublie les modifications envoyées que la tâche a traitées (d'après le catalogue chargé) ; leur résultat est gardé dans modifs:reportees */
  nettoyer(){ const t = CAT && CAT.modifs && CAT.modifs.traitees || {}, E = stockage.lire(ENVOYEES, []), reste = E.filter(m => !t[m.uid]);
    if (reste.length !== E.length){
      const faites = E.filter(m => t[m.uid]).map(m => ({uid:m.uid, at:m.at, id:m.id || t[m.uid].id || null, nom:m.nom || (m.ajout && m.ajout.nom) || '', ajout:m.ajout || null,
        champs:m.champs || null, effacer:!!m.effacer, verif:!!m.verif, resultat:t[m.uid]}));
      const R = stockage.lire(REPORTEES, []).filter(r => !faites.some(f => f.uid === r.uid));
      stockage.ecrire(REPORTEES, [...R, ...faites].slice(-200));
      stockage.ecrire(ENVOYEES, reste); signaler(); } },
  /* déjà reportées (par cet appareil), avec le résultat de la tâche : [{uid, id, nom, ajout, champs, effacer, resultat:{statut, message, id, le}}] */
  reportees:() => stockage.lire(REPORTEES, []),
  /* dernier résultat de report connu pour un élément ou une section (cet appareil, ou n'importe lequel d'après le catalogue) : {statut, message, id, le} | null */
  dernierResultat(id){
    const L = [...stockage.lire(REPORTEES, []).map(r => r.resultat), ...Object.values(CAT && CAT.modifs && CAT.modifs.traitees || {})]
      .filter(r => r && r.id === id).sort((a, b) => String(a.le).localeCompare(String(b.le)));
    return L[L.length - 1] || null;
  },
  /* envoie sur GitHub : 'envoye' | 'rien' | 'verrou' | 'inactif' | 'erreur:<code>' (Noyau.MSG pour le texte) */
  envoyer(){
    const run = async () => {
      const A = stockage.lire(ATTENTE, []); if (!A.length) return 'rien';
      signalerEnvoi('encours');
      A.forEach(m => envoi.add(m.uid));
      try{
        const jeton = await depot.jeton(); if (!jeton) return synchro.actif() ? 'verrou' : 'inactif';
        let traitees = {}; try{ traitees = (await catalogue.charger({frais:true})).modifs.traitees || {}; }catch{}
        for (let essai = 0; essai < 3; essai++){
          const f = await depot.lire(CHEMIN, {jeton});
          let doc = {}; try{ doc = f ? JSON.parse(f.texte) : {}; }catch{}
          const avant = Array.isArray(doc.modifs) ? doc.modifs.filter(m => m && m.uid) : [], deja = new Set(avant.map(m => m.uid));
          const liste = [...avant.filter(m => !traitees[m.uid]), ...A.filter(m => !deja.has(m.uid))];    // celles déjà reportées sont retirées
          const fichier = {v:1, info:'Choix faits dans l\'appli Mon Écran ; la tâche « Configuration » les reporte dans configuration.xlsx. Ne pas modifier à la main.',
                           maj:new Date().toISOString(), par:appareil().nom, modifs:liste};
          try{ await depot.ecrire(CHEMIN, JSON.stringify(fichier, null, 1) + '\n', {jeton, sha:f && f.sha, message:`Réglages depuis l'appli (${appareil().nom})`}); }
          catch(e){ if (e.message === 'conflit') continue; throw e; }
          const envoyes = new Set(A.map(m => m.uid));
          stockage.ecrire(ENVOYEES, [...stockage.lire(ENVOYEES, []).filter(m => !envoyes.has(m.uid)), ...A]);
          stockage.ecrire(ATTENTE, stockage.lire(ATTENTE, []).filter(m => !envoyes.has(m.uid)));    // celles faites pendant l'envoi restent à envoyer
          signaler(); return 'envoye';
        }
        throw new Error('conflit');
      }catch(e){ return 'erreur:' + (e.message || 'reseau'); }
      finally{ envoi.clear(); }
    };
    const p = enCours.then(run, run).then(r => { signalerEnvoi(r); return r; }); enCours = p.catch(() => {}); return p;
  },
  /* regroupe les changements faits coup sur coup (une seule tâche GitHub lancée) ; la promesse donne le résultat de l'envoi
     (comme envoyer), aussi annoncé par l'évènement « noyau:envoi » ; plusTard() : un envoi est-il programmé ? */
  envoyerPlusTard(ms = 4000){
    clearTimeout(tPlusTard);
    const p = new Promise(res => attentePlusTard.push(res));
    tPlusTard = setTimeout(async () => { tPlusTard = null; const L = attentePlusTard; attentePlusTard = []; const r = await modifs.envoyer(); L.forEach(f => f(r)); }, ms);
    return p;
  },
  plusTard:() => tPlusTard !== null,
};

window.Noyau = {version:1, config, stockage, appareil, lien, iphoneWeb, depot, synchro, catalogue, modifs, MSG,
  message:code => MSG[String(code).replace(/^erreur:/, '')] || (window.Synchro && Synchro.MSG[String(code).replace(/^erreur:/, '')]) || String(code)};
window.CFG = config;
})();
