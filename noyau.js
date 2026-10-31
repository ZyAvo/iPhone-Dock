// mon-ecran-version: bdd7c8a4
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
                                            les reporte dans configuration.xlsx (le classeur reste la référence)
   - Noyau.accueil                          pages et widgets activés (config/accueil.json + choix en attente sur cet appareil),
                                            garde des pages désactivées, disposition du widget resté seul (propre à l'appareil),
                                            applis de l'accueil telles qu'elles s'affichent sur cet appareil (accueil.applis)
   - Noyau.applis                           modèle de l'écran d'accueil (applis, dossiers, bandeau, Navigation) : depuis
                                            config/applis.json ou le catalogue, choix en attente appliqués, disposition à envoyer
   - Noyau.icones                           pictogrammes des tuiles et du bandeau (communs à l'accueil et à Réglages) */
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
/* déduit de l'adresse (pseudo.github.io/depot/), sinon le nom écrit par la tâche Configuration (config.js), sinon celui d'origine :
   un dépôt renommé continue de fonctionner sans retoucher le code (v42) */
const DEPOT_ORIGINE = 'ZyAvo/iPhone-Dock';
const DEPOT = (() => { const h = location.hostname.match(/^([\w-]+)\.github\.io$/), p = location.pathname.split('/').filter(Boolean)[0];
  const c = config('depot.nom', ''); return h && p ? `${h[1]}/${p}` : /^[\w.-]+\/[\w.-]+$/.test(c) ? c : DEPOT_ORIGINE; })();
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
     Oui, Widget accueil, Par défaut (valeurs « Oui », « Non » ou vide) et, pour les applis, Appli (nom), Lien iPhone, Lien Android, Lien web */
  modifier(id, champs, {nom} = {}){
    const A = stockage.lire(ATTENTE, []), x = A.find(m => m.id === id && m.champs && !m.effacer && !envoi.has(m.uid));
    if (x){ Object.assign(x.champs, champs); x.at = new Date().toISOString(); stockage.ecrire(ATTENTE, A); signaler(); return x.uid; }   // pas encore envoyée : on la complète
    return ajouterAttente({id, ...(nom ? {nom} : {}), champs:{...champs}});
  },
  choisir:(id, oui) => modifs.modifier(id, {Oui:oui === true ? 'Oui' : oui === false ? 'Non' : oui || ''}),
  /* nouvel élément dans les lignes « Mes ajouts » d'un onglet (actus, actus-en, sport, marches, videos, youtube, tv, cotes, applis) */
  ajouter:(module, {section = '', nom = '', source = '', champs = {}} = {}) => ajouterAttente({ajout:{module, section, nom, source}, champs}),
  effacer:(id, nom) => ajouterAttente({id, nom, effacer:true}),           // un de tes ajouts (id « ajout:module:n »)
  /* retouche un ajout pas encore envoyé (nom, source, champs) ; false s'il est déjà parti */
  majAjout(u, {nom, source, champs} = {}){
    const A = stockage.lire(ATTENTE, []), x = A.find(m => m.uid === u && m.ajout && !envoi.has(m.uid)); if (!x) return false;
    if (nom !== undefined) x.ajout.nom = nom; if (source !== undefined) x.ajout.source = source;
    if (champs) x.champs = {...(x.champs || {}), ...champs};
    x.at = new Date().toISOString(); stockage.ecrire(ATTENTE, A); signaler(); return true;
  },
  /* disposition complète d'un onglet (applis : ordre des tuiles, dossiers, bandeau, Navigation) ; elle remplace celle qui n'est pas encore
     partie et se place en dernier (elle peut citer des ajouts faits avant elle : « uid:… ») ; null : retire celle pas encore partie */
  disposer(module, listes){
    stockage.ecrire(ATTENTE, stockage.lire(ATTENTE, []).filter(m => !(m.disposition && m.disposition.module === module && !envoi.has(m.uid))));
    if (!listes){ signaler(); return null; }
    return ajouterAttente({disposition:{module, listes}});
  },
  verifier:() => ajouterAttente({verif:true}),                            // essai de bout en bout : la tâche répond sans rien changer
  annuler(u){ stockage.ecrire(ATTENTE, stockage.lire(ATTENTE, []).filter(m => m.uid !== u)); signaler(); },
  /* faites ici et pas encore reportées dans le classeur (envoyées ou non), dans l'ordre ; « traitée » d'après le catalogue chargé,
     ou d'après config/config.js (modifs_traitees) pour les pages qui ne chargent pas le catalogue (l'accueil) */
  enAttente(){
    const t = CAT && CAT.modifs && CAT.modifs.traitees || {}, tc = new Set(config('modifs_traitees', []));
    return [...stockage.lire(ENVOYEES, []), ...stockage.lire(ATTENTE, []).map(m => ({...m, nonEnvoyee:true}))].filter(m => !t[m.uid] && !tc.has(m.uid));
  },
  nonEnvoyees:() => stockage.lire(ATTENTE, []),
  /* oublie les modifications envoyées que la tâche a traitées (d'après le catalogue chargé) ; leur résultat est gardé dans modifs:reportees */
  nettoyer(){ const t = CAT && CAT.modifs && CAT.modifs.traitees || {}, E = stockage.lire(ENVOYEES, []), reste = E.filter(m => !t[m.uid]);
    if (reste.length !== E.length){
      const faites = E.filter(m => t[m.uid]).map(m => ({uid:m.uid, at:m.at, id:m.id || t[m.uid].id || null, nom:m.nom || (m.ajout && m.ajout.nom) || '', ajout:m.ajout || null,
        champs:m.champs || null, effacer:!!m.effacer, verif:!!m.verif, disposition:m.disposition ? m.disposition.module : null, resultat:t[m.uid]}));
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

/* ---------- Pictogrammes des tuiles et du bandeau (accueil, Réglages) ---------- */
const icones = {
  phone:'<path d="M6.6 3.5h2.6l1.5 4.2-2 1.5a12 12 0 0 0 6.1 6.1l1.5-2 4.2 1.5v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1z"/>',
  bubble:'<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/>',
  round:'<path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M8.6 12h.01M12 12h.01M15.4 12h.01"/>',
  duo:'<path d="M3.5 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 2.8V13.5a2 2 0 0 1-2-2z"/><path d="M15.5 8.5h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2V20l-3-2.5h-3.5a2 2 0 0 1-2-2v-.5"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
  spark:'<path d="M12 3.5c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3 4.4-.7 6.6-2.9 7.3-7.3z"/><path d="M18.5 15.5c.25 1.5 1 2.25 2.5 2.5-1.5.25-2.25 1-2.5 2.5-.25-1.5-1-2.25-2.5-2.5 1.5-.25 2.25-1 2.5-2.5z"/>',
  xmark:'<path d="M6 5.5 18 18.5M18 5.5 6 18.5"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play:'<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  shield:'<path d="M12 2.8 4.8 5.6v5.6c0 4.6 3 8.3 7.2 9.9 4.2-1.6 7.2-5.3 7.2-9.9V5.6z"/><path d="M12 6v12.2c2.6-1.3 4.4-3.9 4.4-7V7.6z" fill="currentColor"/>',
  network:'<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18.5" r="2.2"/><circle cx="19" cy="18.5" r="2.2"/><path d="M11 7 6 16.6M13 7l5 9.6M7.2 18.5h9.6"/>',
  nav:'<path d="M12 3 19.5 20.5 12 16.3 4.5 20.5z"/>',
  folder:'<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10h18"/>',
  camera:'<path d="M4 7.5h3.2L9 5h6l1.8 2.5H20a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 4 7.5z"/><circle cx="12" cy="13.3" r="3.8"/>',
  gear:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/><path d="M4 12h5M13 12h7"/><circle cx="11" cy="12" r="2"/>',
  media:'<rect x="2.5" y="4.5" width="19" height="13" rx="2.5"/><path d="m10 8.2 4.8 2.8-4.8 2.8z"/><path d="M8 20.5h8"/>',
  news:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8.5h6M7 12h10M7 15.5h10"/>',
  invest:'<path d="M4 19.5h16"/><path d="m5 15.5 4.5-4.5 3.5 3.5 6.5-7.5"/><path d="M15 7h4.5v4.5"/>',
  meteo:'<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.5v1.3M2.5 8.5h1.3M4.3 4.3l.9.9M12.7 4.3l-.9.9"/><path d="M8 20h9.5a3.8 3.8 0 0 0 0-7.6 5 5 0 0 0-9.4 1.6A3 3 0 0 0 8 20z"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  drive:'<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  translate:'<path d="M3.5 5.5h9M8 3.5v2M5.5 5.5c1 4 3.8 6.8 6.5 7.8M10.5 5.5c-1 4-3.8 6.8-6.5 7.8"/><path d="m13 20.5 4-9 4 9M14.4 17.5h5.2"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  play:'<rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="m10 9.2 5 2.8-5 2.8z"/>',
  book:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  tag:'<path d="M3 11.5V4h7.5L21 14.5 13.5 22z"/><circle cx="7.5" cy="8" r="1.4"/>',
  sport:'<circle cx="12" cy="12" r="8.5"/><path d="m12 7.6 4.2 3-1.6 4.9H9.4l-1.6-4.9z"/><path d="M12 3.5v4.1M16.2 10.6l3.9-1.3M14.6 15.5l2.4 3.4M9.4 15.5 7 18.9M7.8 10.6 3.9 9.3"/>'
};

/* ---------- Applis de l'accueil (onglet Applis du classeur) ----------
   Modèle commun à l'accueil (affichage) et à Réglages (éditeur) : {listes:{accueil, bas_gauche, bas_droite, navigation, 'd:<dossier>'},
   dossiers:{<clé>:{nom, id}}, ordreD:[clés des dossiers]} ; chaque élément {id, def, cache} (def = définition de config/applis.json,
   cache = masqué : case « Oui » pas à Oui). Les choix en attente s'appliquent dans l'ordre :
   {id, champs} (Oui, Appli, liens), {ajout:{module:'applis', section, nom, source}} (élément « uid:<uid> »), {id:'ajout:applis:n', effacer},
   {disposition:{module:'applis', listes:[{cle, ids}, {cle, dossier:true, nom, ids}…]}} (ordre complet, dossiers nouveaux ou renommés). */
const LISTES_APPLIS = ['accueil', 'bas_gauche', 'bas_droite', 'navigation'];
const NOMS_LISTES = {accueil:'Écran d\'accueil', bas_gauche:'Bandeau du bas · gauche', bas_droite:'Bandeau du bas · droite', navigation:'Applis proposées par Navigation'};
const TUILES_AUTO = {actus:{label:'Actus', type:'auto', auto:'actus'}, invest:{label:'Invest.', type:'auto', auto:'invest'}, sport:{label:'Sport', type:'auto', auto:'sport'}};
const COLONNES_LIENS = [['app', 'Lien iPhone'], ['android', 'Lien Android'], ['web', 'Lien web']];
const sl = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const copie = x => JSON.parse(JSON.stringify(x));
const estAppli = d => !!d && !d.type && !d.action;                          // une appli avec ses 3 liens (pas une page, un dossier, un emplacement, Navigation)
const accueilSeul = d => !!d && (d.type === 'folder' || d.type === 'auto' || !!d.live);
/* où un élément peut aller : dossiers, emplacements et tuile LIVE sur l'accueil seulement, Navigation dans le bandeau, menu Navigation : des applis */
const permis = (d, cle) => accueilSeul(d) ? cle === 'accueil' : d && d.action ? cle === 'bas_gauche' || cle === 'bas_droite' : cle === 'navigation' ? estAppli(d) : true;
/* appli ajoutée par « Mes ajouts » (même règle que la tâche Configuration) */
function defAjout(nom, source, champs = {}){
  source = String(source || ''); nom = String(nom || '') || source;
  const http = /^https?:/i.test(source), ios = source && !http ? source : '', web = champs['Lien web'] || (http ? source : ''), android = champs['Lien Android'] || '';
  const d = {label:nom, mono:nom.slice(0, 2), color:'--t-slate'};
  if (ios) d.app = ios; if (web) d.web = web; if (android) d.android = android;
  if (web && !ios && !android) d.url = web;                                 // simple lien : ouvert dans un nouvel onglet
  return d;
}
function liensDans(d, c){
  if (!estAppli(d)) return;
  for (const [k, h] of COLONNES_LIENS) if (h in c){ if (c[h]) d[k] = c[h]; else delete d[k]; }
  if (d.url && !d.app && !d.android) d.url = d.web || d.url;
}
const videModele = () => ({listes:Object.fromEntries(LISTES_APPLIS.map(k => [k, []])), dossiers:{}, ordreD:[]});
function cleSection(m, label){
  const s = sl(label);
  for (const k of LISTES_APPLIS) if (s === sl(NOMS_LISTES[k]) || s === sl(k)) return k;
  for (const [k, d] of Object.entries(m.dossiers)) if (s === sl(d.nom) || s === sl(k)) return 'd:' + k;
  const k = s || 'mes-ajouts'; m.dossiers[k] = {nom:String(label || 'Mes ajouts'), id:null}; m.listes['d:' + k] = []; return 'd:' + k;   // nouveau dossier
}
/* complète le modèle : listes manquantes, ordre des dossiers, tuile d'un dossier qui n'en a pas (comme la tâche) */
function finaliser(m){
  for (const k of LISTES_APPLIS) m.listes[k] = m.listes[k] || [];
  for (const k of Object.keys(m.dossiers)) m.listes['d:' + k] = m.listes['d:' + k] || [];
  m.ordreD = [...(m.ordreD || []).filter(k => m.dossiers[k]), ...Object.keys(m.dossiers).filter(k => !(m.ordreD || []).includes(k))];
  for (const k of m.ordreD){
    if (!m.listes['d:' + k].some(it => !it.cache) || m.listes.accueil.some(it => it.def.type === 'folder' && it.def.target === k)) continue;
    m.listes.accueil.push({id:'dossier:' + k, def:{label:m.dossiers[k].nom, type:'folder', target:k}, cache:false});
  }
  return m;
}
function disposer(m, D){
  const pool = new Map(); for (const L of Object.values(m.listes)) for (const it of L) pool.set(it.id, it);
  const ordreD = [];
  for (const e of D) if (e && e.dossier && e.cle){ const k = String(e.cle);
    if (!m.dossiers[k]) m.dossiers[k] = {nom:String(e.nom || k), id:null}; else if (e.nom) m.dossiers[k].nom = String(e.nom);
    if (!ordreD.includes(k)) ordreD.push(k); }
  const nouv = {}, vus = new Set();
  for (const e of D){
    if (!e || !e.cle) continue;
    const cle = e.dossier ? 'd:' + e.cle : String(e.cle); if (!e.dossier && !LISTES_APPLIS.includes(cle)) continue;
    const L = nouv[cle] = nouv[cle] || [];
    for (const id of e.ids || []){
      if (vus.has(id)) continue;
      let it = pool.get(id);
      if (!it && cle === 'accueil' && /^auto:(actus|invest|sport)$/.test(id)) it = {id, def:{...TUILES_AUTO[id.slice(5)]}, cache:false};
      if (!it && cle === 'accueil' && /^dossier:/.test(id) && m.dossiers[id.slice(8)]) it = {id, def:{label:m.dossiers[id.slice(8)].nom, type:'folder', target:id.slice(8)}, cache:false};
      if (!it || !permis(it.def, cle)) continue;
      vus.add(id); L.push(it);
    }
  }
  for (const [cle, L] of Object.entries(m.listes)) for (const it of L) if (!vus.has(it.id)){ (nouv[cle] = nouv[cle] || []).push(it); vus.add(it.id); }   // pas cités : en fin de leur liste
  for (const it of nouv.accueil || []) if (it.def.type === 'folder' && m.dossiers[it.def.target]) it.def.label = m.dossiers[it.def.target].nom;
  m.listes = nouv; m.ordreD = ordreD;
}
const applis = {
  LISTES:LISTES_APPLIS, NOMS_LISTES, TUILES_AUTO, permis, estAppli, accueilSeul, defAjout, cle:sl,
  /* depuis config/applis.json (ou les valeurs écrites dans l'accueil) : éléments visibles + réserve des masqués */
  depuisConfig(c){
    const m = videModele(); c = c || {};
    const item = (d, cle, i, cache) => { const {id, ou, ou_nom, apres, ...def} = d || {}; return {id:id || `x:${cle}:${sl(def.label)}:${i}`, def, cache}; };
    for (const k of LISTES_APPLIS) m.listes[k] = (c[k] || []).map((d, i) => item(d, k, i, false));
    for (const [k, f] of Object.entries(c.dossiers || {})){ m.dossiers[k] = {nom:f.title || k, id:f.id || null}; m.listes['d:' + k] = (f.items || []).map((d, i) => item(d, 'd:' + k, i, false)); }
    for (const [id, d] of Object.entries(c.reserve || {})){
      const cle = LISTES_APPLIS.includes(d.ou) ? d.ou : 'd:' + d.ou;
      if (!m.listes[cle]){ m.dossiers[d.ou] = {nom:d.ou_nom || d.ou, id:null}; m.listes[cle] = []; }
      const L = m.listes[cle], i = d.apres ? L.findIndex(x => x.id === d.apres) : -1;
      L.splice(d.apres ? (i >= 0 ? i + 1 : L.length) : 0, 0, item({...d, id}, cle, 0, true));
    }
    return finaliser(m);
  },
  /* depuis le catalogue (module applis) : tout l'onglet, masqués compris, avec les noms et liens du classeur */
  depuisCatalogue(mod){
    const m = videModele(); if (!mod) return m;
    const cleDe = s => { const t = s.tech || {}; if (t.type === 'dossier'){ m.dossiers[t.id] = m.dossiers[t.id] || {nom:t.label || s.label, id:s.id}; return 'd:' + t.id; } return t.id || s.cle; };
    for (const s of mod.sections || []){
      const cle = cleDe(s);
      m.listes[cle] = (s.items || []).map(it => { const d = {...(it.def || {})}, c = it.champs || {};
        d.label = c.Appli || it.nom || d.label; liensDans(d, c);
        return {id:it.id, def:d, cache:!it.choisi || it.support !== 'ok'}; });
    }
    for (const a of mod.ajouts || []){
      if (!a.nom && !a.source) continue;
      const s = a.section_id && (mod.sections || []).find(x => x.id === a.section_id), cle = s ? cleDe(s) : cleSection(m, a.section || 'Mes ajouts');
      m.listes[cle].push({id:a.id, def:defAjout(a.nom, a.source, a.champs || {}), cache:!a.choisi, ajout:true});
    }
    return finaliser(m);
  },
  /* applique les choix en attente (dans l'ordre) ; les éléments touchés sont marqués « attente » */
  appliquer(base, liste){
    const m = copie(base);
    const trouver = id => { for (const [cle, L] of Object.entries(m.listes)){ const i = L.findIndex(it => it.id === id); if (i >= 0) return {cle, i, it:L[i]}; } return null; };
    for (const x of liste || []){
      if (x.disposition){ if (x.disposition.module === 'applis'){ disposer(m, x.disposition.listes || []); finaliser(m); } continue; }
      if (x.ajout){ if (x.ajout.module !== 'applis') continue;
        const cle = cleSection(m, x.ajout.section), c = x.champs || {};
        m.listes[cle].push({id:'uid:' + x.uid, def:defAjout(x.ajout.nom, x.ajout.source, c), cache:'Oui' in c && c.Oui !== 'Oui', attente:true, uid:x.uid, nonEnvoyee:!!x.nonEnvoyee});
        finaliser(m); continue; }
      if (!x.id) continue;
      const f = trouver(x.id); if (!f) continue;
      if (x.effacer){ m.listes[f.cle].splice(f.i, 1); continue; }
      const c = x.champs || {}, d = f.it.def;
      if ('Oui' in c) f.it.cache = c.Oui !== 'Oui';
      if (c.Appli) d.label = c.Appli;
      liensDans(d, c); f.it.attente = true;
    }
    return finaliser(m);
  },
  /* ce que l'accueil affiche : même forme que config/applis.json (éléments visibles, chacun avec son id) */
  vers(m){
    const vis = L => (L || []).filter(it => !it.cache).map(it => ({...it.def, id:it.id}));
    const dossiers = {};
    for (const k of m.ordreD){ const items = vis(m.listes['d:' + k]); if (items.length) dossiers[k] = {title:m.dossiers[k].nom, id:m.dossiers[k].id, items}; }
    return {accueil:vis(m.listes.accueil).filter(a => a.type !== 'folder' || dossiers[a.target]), dossiers,
            bas_gauche:vis(m.listes.bas_gauche), bas_droite:vis(m.listes.bas_droite), navigation:vis(m.listes.navigation)};
  },
  /* disposition à envoyer (Noyau.modifs.disposer('applis', …)) : ordre complet, masqués compris ; dossiers dans l'ordre de leurs tuiles */
  disposition(m){
    const tuiles = m.listes.accueil.filter(it => it.def.type === 'folder').map(it => it.def.target);
    const ordre = [...tuiles.filter(k => m.dossiers[k]), ...m.ordreD.filter(k => !tuiles.includes(k))];
    const ids = cle => (m.listes[cle] || []).map(it => it.id);
    return [{cle:'accueil', ids:ids('accueil')}, ...ordre.map(k => ({cle:k, dossier:true, nom:m.dossiers[k].nom, ids:ids('d:' + k)})),
            ...['bas_gauche', 'bas_droite', 'navigation'].map(k => ({cle:k, ids:ids(k)}))];
  },
  /* choix en attente qui touchent l'onglet Applis */
  concerne:x => !!x && ((x.disposition && x.disposition.module === 'applis') || (x.ajout && x.ajout.module === 'applis') || /^(ap:|ajout:applis:)/.test(x.id || '')),
};

/* ---------- Accueil : pages et widgets activés ----------
   config/accueil.json (classeur, onglet Accueil) + les choix faits sur cet appareil pas encore reportés (pg:…, wg:…, un:…),
   pour que le changement se voie tout de suite ici ; les autres appareils le voient après le report. Sans le catalogue (léger). */
const PAGES = ['actus', 'sport', 'videos', 'invest', 'cachee'], TOUJOURS = ['etat', 'reglages'];
const WIDGETS = ['meteo', 'une', 'invest', 'spotify', 'sport', 'live'];
const NOMS_PAGES = {actus:'Actus', sport:'Sport', videos:'Vidéos', invest:'Investissements', cachee:'Coffre', etat:'État des données', reglages:'Réglages'};
const UNE_CHOIX = 'accueil:une-choix', DISPOSITION = 'accueil:disposition', MUSIQUE = 'musique:source';
/* source du widget musique (v42), propre à l'appareil. Spotify : lecture en cours et commandes (API Spotify) ; les autres n'offrent
   pas d'équivalent simple depuis une page web : widget raccourci qui ouvre l'appli (iPhone : app, Android : android, PC : web) */
const MUSIQUES = [
  {id:'spotify', nom:'Spotify',       coul:'#1db954', app:'spotify://',                 android:'spotify://',       web:'https://open.spotify.com'},
  {id:'deezer',  nom:'Deezer',        coul:'#a238ff', app:'deezer://www.deezer.com',    android:'deezer://www.deezer.com', web:'https://www.deezer.com'},
  {id:'apple',   nom:'Apple Music',   coul:'#fa2d48', app:'music://',                   android:'https://music.apple.com', web:'https://music.apple.com'},
  {id:'youtube', nom:'YouTube Music', coul:'#ff0033', app:'youtubemusic://',            android:'https://music.youtube.com', web:'https://music.youtube.com'},
  {id:'amazon',  nom:'Amazon Music',  coul:'#25d1da', app:'amznmp3://',                 android:'https://music.amazon.fr', web:'https://music.amazon.fr'}
];
/* dernière valeur « Oui » en attente sur cet identifiant (undefined : aucun choix en attente) */
const attenteOui = id => { let v; for (const m of modifs.enAttente()) if (m.id === id && m.champs && 'Oui' in m.champs && !m.effacer) v = m.champs.Oui; return v; };
const actifDans = (cle, id) => { const L = config(cle, null); return Array.isArray(L) ? L.includes(id) : true; };   // sans config : tout est actif
const accueil = {
  PAGES, WIDGETS, TOUJOURS, NOMS_PAGES,
  /* page activée ? (État et Réglages : toujours) */
  page(id){ id = String(id).replace(/^pg:/, ''); if (TOUJOURS.includes(id)) return true;
    const v = attenteOui('pg:' + id); return v !== undefined ? v === 'Oui' : actifDans('accueil.pages', id); },
  widget(id){ id = String(id).replace(/^wg:/, '');
    const v = attenteOui('wg:' + id); return v !== undefined ? v === 'Oui' : actifDans('accueil.widgets', id); },
  /* source choisie pour le widget « À la une » : {name, color, url}, ou null pour « Automatique » (l'info la plus reprise) ;
     un choix en attente l'emporte (Réglages garde sa définition ; « auto » : toutes les sources décochées) */
  uneChoisie(){ const c = stockage.lire(UNE_CHOIX, null);
    if (c && c.id === 'auto' && (c.ids || []).some(id => attenteOui(id) !== undefined)) return null;
    if (c && c.id && c.def && attenteOui(c.id) === 'Oui') return c.def;
    return config('accueil.une', null); },
  /* source à utiliser pour un flux direct : la choisie, sinon la valeur par défaut de la page */
  une(defaut = null){ return accueil.uneChoisie() || defaut; },
  choisirUne(id, def, ids){ stockage.ecrire(UNE_CHOIX, {id, def:def || null, ...(ids ? {ids} : {})}); },
  /* applis, dossiers, bandeau et menu Navigation tels qu'ils s'affichent sur cet appareil : config/applis.json (ou les valeurs
     écrites dans l'accueil) + les choix faits ici pas encore reportés ; même forme que config/applis.json */
  applis(defauts){ return applis.vers(applis.appliquer(applis.depuisConfig(config('applis', null) || defauts), modifs.enAttente())); },
  /* téléphone : widget resté seul dans la rangée du haut, en « large » (pleine largeur) ou « carre » (même taille) ; propre à l'appareil */
  disposition:() => stockage.lire(DISPOSITION, 'large') === 'carre' ? 'carre' : 'large',
  choisirDisposition:d => stockage.ecrire(DISPOSITION, d === 'carre' ? 'carre' : 'large'),
  musiques:MUSIQUES,
  musique:() => MUSIQUES.find(m => m.id === stockage.lire(MUSIQUE, 'spotify')) || MUSIQUES[0],
  choisirMusique:id => stockage.ecrire(MUSIQUE, id === 'spotify' || !MUSIQUES.some(m => m.id === id) ? null : id),
  /* résumé de tout ce qui change l'accueil (pour savoir s'il faut le recharger) */
  signature:() => JSON.stringify([PAGES.filter(accueil.page), WIDGETS.filter(accueil.widget), (accueil.uneChoisie() || {}).url || 'auto', accueil.disposition(), accueil.musique().id,
    modifs.enAttente().filter(applis.concerne).map(m => [m.uid, m.champs || null, m.disposition || null, m.ajout || null, !!m.effacer])]),
  /* en tête d'une page : si elle est désactivée, affiche « Page désactivée » à la place ; le reste du fichier n'est pas lu
     (<plaintext> masqué : aucun script de la page ne s'exécute, aucune donnée n'est chargée), et la page se termine normalement */
  garde(id){
    if (accueil.page(id)) return true;
    const d = document, nom = NOMS_PAGES[id] || id, attente = attenteOui('pg:' + id) !== undefined;
    const retour = ['actus', 'sport', 'videos', 'invest'].includes(id) ? id : 'index';
    const css = `:root{--pd-base:#e7ecef;--pd-ink:#10233a;--pd-soft:#56636f;--pd-acc:#274c77;--pd-on:#e7ecef;--pd-card:rgba(255,255,255,.6);--pd-line:rgba(39,76,119,.14);color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--pd-base:#08121f;--pd-ink:#e7ecef;--pd-soft:#a7b6c4;--pd-acc:#a3cef1;--pd-on:#08121f;--pd-card:rgba(231,236,239,.07);--pd-line:rgba(231,236,239,.12);color-scheme:dark}}
:root[data-theme="dark"]{--pd-base:#08121f;--pd-ink:#e7ecef;--pd-soft:#a7b6c4;--pd-acc:#a3cef1;--pd-on:#08121f;--pd-card:rgba(231,236,239,.07);--pd-line:rgba(231,236,239,.12);color-scheme:dark}
body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 16px;box-sizing:border-box;font:15px/1.45 -apple-system,"SF Pro Text",system-ui,sans-serif;color:var(--pd-ink);
background:radial-gradient(60% 45% at 10% 8%,color-mix(in oklab,var(--pd-acc) 30%,transparent),transparent 70%) fixed,var(--pd-base)}
.pd{width:min(400px,100%);padding:26px 22px 22px;border-radius:28px;background:var(--pd-card);border:1px solid var(--pd-line);text-align:center;box-shadow:0 14px 34px -16px rgba(0,0,0,.35);box-sizing:border-box}
.pd svg{width:44px;height:44px;fill:none;stroke:var(--pd-soft);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.pd h1{font-size:1.45rem;letter-spacing:-.02em;margin:10px 0 6px}.pd p{margin:0 0 18px;color:var(--pd-soft);font-size:.9rem}
.pd a{display:block;padding:12px 14px;border-radius:14px;font-weight:600;text-decoration:none;margin-top:8px}
.pd .main{background:var(--pd-acc);color:var(--pd-on)}.pd .sec{color:var(--pd-acc);border:1px solid var(--pd-line)}`;
    const corps = `<main class="pd"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8.5 12h7"/></svg>
      <h1>Page désactivée</h1><p>La page <b>${nom}</b> est retirée de ton écran d'accueil${attente ? ' (choix fait sur cet appareil, en attente de report dans le classeur)' : ''}.</p>
      <a class="main" href="reglages.html?retour=${retour}#accueil">Réactiver dans Réglages</a><a class="sec" href="index.html">Accueil</a></main>`;
    if (d.readyState === 'loading') d.write(`<style>${css}</style></head><body>${corps}<plaintext hidden style="display:none">`);
    else { const st = d.createElement('style'); st.textContent = css; d.head.appendChild(st); d.body.innerHTML = corps; }
    d.title = `${nom} · page désactivée`;
    return false;
  },
};

window.Noyau = {version:1, config, stockage, appareil, lien, iphoneWeb, depot, synchro, catalogue, modifs, accueil, applis, icones, MSG,
  message:code => MSG[String(code).replace(/^erreur:/, '')] || (window.Synchro && Synchro.MSG[String(code).replace(/^erreur:/, '')]) || String(code)};
window.CFG = config;
})();
