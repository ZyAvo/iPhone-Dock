// mon-ecran-version: a643d619
/* QM27 (v83, lot 2 : v84, lot 3 : v85) — écrans : démarrage et emplacements, accueil du club, effectif et fiche joueur, tactique, match en direct,
   calendrier, classements, sauvegardes, aide. Moteur : qm27.js (window.QM) ; données : qm27-donnees.js (window.QMD).
   Sauvegarde : IndexedDB (base « qm27 », une partie par emplacement), sinon localStorage ; résumé des emplacements dans localStorage. */
(() => {
'use strict';
const D = window.QMD, E = D.EQ, C = window.QMC;
/* v94 : Gallions, Mornilles et Noises en pièces (or, argent, bronze) ; eurT = la même somme en texte (confirmations, infobulles) */
const PIECE = {G:['g', 'Gallions'], M:['m', 'Mornilles'], N:['n', 'Noises']};
const pieces = html => String(html).replace(/(\d[\d\u202f\u00a0]*) (G|M|N)(?=$|[\s.,;:)»!?…/<])/g, (t, n, u) => `${n}<i class="po ${PIECE[u][0]}" role="img" aria-label="${PIECE[u][1]}"></i>`);
const eurT = x => C.euros(x);
const eur = x => `<span class="mon">${pieces(C.euros(x))}</span>`;
const $ = s => document.querySelector(s);
const VUE = $('#vue'), NAV = $('#nav');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const LS = {lire:(k, d) => { try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch{ return d; } },
            ecrire:(k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; }catch{ return false; } }};
const NB_EMP = 3, K_EMP = 'qm27:emplacements', K_REG = 'qm27:reglages', K_DERNIER = 'qm27:dernier';

/* ---------- Stockage des parties ---------- */
const Base = (() => {
  let db = null;
  const ouvrir = () => new Promise((ok, ko) => {
    if (db) return ok(db);
    if (!('indexedDB' in window)) return ko(new Error('pas d\'IndexedDB'));
    const rq = indexedDB.open('qm27', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('parties');
    rq.onsuccess = () => { db = rq.result; ok(db); };
    rq.onerror = () => ko(rq.error);
  });
  const op = (mode, f) => ouvrir().then(b => new Promise((ok, ko) => { const t = b.transaction('parties', mode), s = t.objectStore('parties'), rq = f(s); t.oncomplete = () => ok(rq && rq.result); t.onerror = () => ko(t.error); }));
  return {
    lire:k => op('readonly', s => s.get(k)).catch(() => localStorage.getItem('qm27:partie:' + k)),
    ecrire:(k, v) => op('readwrite', s => s.put(v, k)).catch(() => { localStorage.setItem('qm27:partie:' + k, v); }),
    effacer:k => op('readwrite', s => s.delete(k)).catch(() => {}).then(() => { try{ localStorage.removeItem('qm27:partie:' + k); }catch{} }),
  };
})();

/* ---------- État ---------- */
let M = null, EMP = null, X = null;
const U = {vue:'accueil', filtre:'tous', tri:'poste', ligue:null, cal:'moi', etape:null, nom:'', ligueChoix:'bi', live:null};
const REG = Object.assign({pauses:{blessure:true, faute_grave:true, vif_apercu:true}, vitesse:1}, LS.lire(K_REG, {}));
const regler = () => LS.ecrire(K_REG, REG);
QM.langueNoms(REG.noms);   // v114 : noms des clubs et des ligues (langue du pays, anglais, français)

/* ---------- Petits outils d'affichage ---------- */
const fmtDate = (t, long) => new Date(t).toLocaleDateString('fr-FR', long ? {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC'} : {weekday:'short', day:'numeric', month:'short', timeZone:'UTC'});
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const club = id => M.clubs[id] || (M.reserve && M.reserve[id]) || {id, nom:id, ville:'', nat:'ENG', rep:50, couleurs:['#445', '#ddd'], sigle:String(id).slice(0, 3).toUpperCase(), effectif:[], ligue:null};   // v106 : club sorti du jeu
const nat = id => D.NATIONS[id];
const V = window.QMV;   // v87 : graphismes (qm27-visuel.js)
/* avatar d'un joueur, d'un membre du staff ou du manager, aux couleurs de son club */
/* v99 : visages répartis par effectif (jamais deux fois le même dans un club), recalculés quand l'effectif change */
const CACHE_VIS = {};
function visageClub(p, c){
  if (!c || !p.id) return null;
  let L, k;
  if (p.poste){ if (!c.effectif || !c.effectif.includes(p.id)) return null; L = c.effectif.map(id => M.joueurs[id]).filter(Boolean); k = 'j' + c.id; }
  else { L = Object.values(c.staff || {}).filter(Boolean); if (!L.includes(p)) return null; k = 's' + c.id; }
  const cle = L.map(x => x.id).join(','), e = CACHE_VIS[k];
  if (!e || e.cle !== cle) CACHE_VIS[k] = {cle, v:V.attribuerVisages(L)};
  return CACHE_VIS[k].v[p.id] || null;
}
const avatarDe = (p, cls, clubId) => { const c = clubId !== undefined ? (clubId ? M.clubs[clubId] : null) : (p.club ? M.clubs[p.club] : null); const o = c ? {couleurs:c.couleurs} : {}, v = visageClub(p, c); if (v) o.visage = v; return V.avatar(p, cls, o); };
const nomEq = (id, sixn) => sixn ? nat(id).nom : club(id).nom;
function blason(id, taille, sixn){
  if (sixn || D.NATIONS[id]) return `<span class="blason nat emb-b ${taille || ''}" aria-hidden="true">${V.embleme(id)}</span>`;
  return V.blason(club(id), taille);   // v87 : blason dessiné
}
const classeNote = n => n >= 66 ? 'n4' : n >= 56 ? 'n3' : n >= 46 ? 'n2' : 'n1';
const classeAttr = v => v >= 15 ? 'n4' : v >= 10 ? 'n3' : v >= 6 ? 'n2' : 'n1';
const posteB = p => `<span class="poste ${p} pi" title="${D.POSTES[p].nom}" role="img" aria-label="${D.POSTES[p].nom}">${V.posteImg(p)}</span>`;   // v115 : image du poste (souaffle, batte, vif d'or, gants)
const etoiles = rep => { const n = Math.max(1, Math.min(5, Math.round((rep - 30) / 11))); return `<span class="etoiles" aria-label="${n} étoiles sur 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`; };
const nomJ = j => j ? `${j.p} ${j.n}` : '—';
const court = j => j ? `${j.p[0]}. ${j.n}` : '—';
const flag = n => n ? `<span class="drap">${V.embleme(n)}<b class="nat-c">${esc(n)}</b></span>` : '';   // v91 : emblèmes ; v109 : avec le code à 3 lettres (FRA, ITA…) pour reconnaître le pays
const flagSeul = n => V.embleme(n);   // quand le nom du pays est écrit juste à côté
const ICO = {
  accueil:'<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
  effectif:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.3-.3 4.4 1.1 5 4"/>',
  tactique:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M12 4v16M3.5 12h3M17.5 12h3"/><circle cx="12" cy="12" r="2.6"/>',
  calendrier:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>',
  plus:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  club:'<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.1 7.5 9.5 4.4-1.4 7.5-5.1 7.5-9.5V6z"/><path d="M8.5 12.5h7M12 9v7"/>',
};
function toast(t){ const o = document.querySelector('.toast-qm'); if (o) o.remove(); const d = document.createElement('div'); d.className = 'toast-qm'; d.setAttribute('role', 'status'); d.innerHTML = pieces(esc(t)); document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function feuille(html, garder){
  /* v97 : une feuille redessinée (temps mort, consigne…) garde sa position de défilement au lieu de remonter en haut */
  const ancien = garder && document.querySelector('.fond .feuille');
  if (ancien){ const y = ancien.scrollTop; ancien.innerHTML = html; ancien.scrollTop = y; return; }
  retirerFeuille();
  const f = document.createElement('div'); f.className = 'fond'; f.innerHTML = `<div class="feuille" role="dialog" aria-modal="true">${html}</div>`;
  f.addEventListener('click', e => { if (e.target === f) fermerFeuille(); });
  document.body.appendChild(f); const b = f.querySelector('.fermer'); if (b) b.focus({preventScroll:true});
}
const retirerFeuille = () => { const f = document.querySelector('.fond'); if (f) f.remove(); return !!f; };
function fermerFeuille(){ if (retirerFeuille() && U.live && U.live.tm) reprendreApresTM(); }
addEventListener('keydown', e => { if (e.key === 'Escape') fermerFeuille(); });
const teteF = (titre, sous, avant) => `<div class="tete">${avant || ''}<div class="t"><h3>${titre}</h3>${sous ? `<div class="sous">${sous}</div>` : ''}</div><button class="fermer" data-act="fermer" aria-label="Fermer">✕</button></div>`;

/* ---------- Sauvegarde ---------- */
const emplacements = () => LS.lire(K_EMP, {});
let enCours = null, tNuage = null;
/* ---------- v85 : synchronisation entre appareils (synchro.js de KiosK : fichier chiffré par emplacement, branche « synchro ») ---------- */
const NUAGE = {infos:null, charge:false, err:'', conflit:null};
const msgSync = e => (window.Synchro && Synchro.MSG && Synchro.MSG[e && e.message]) || (e && e.message === 'verrou' ? 'synchronisation verrouillée : entre ton code' : 'erreur (' + ((e && e.message) || '?') + ')');
async function infosNuage(){
  const L = {};
  for (let n = 1; n <= NB_EMP; n++) L[n] = await Synchro.fichierInfo('qm27-p' + n);
  NUAGE.infos = L; NUAGE.err = ''; return L;
}
async function envoyerNuage(n, auto){
  const txt = (M && n === EMP) ? QM.serialiser(M) : await Base.lire('p' + n);
  if (!txt) throw new Error('vide');
  const L = emplacements(), e = L[n] || {}, dist = await Synchro.fichierInfo('qm27-p' + n);
  if (dist && dist.par !== Synchro.appareil() && (!e.sync || dist.maj > e.sync.maj)){
    if (auto){ NUAGE.conflit = n; toast('Une version plus récente de la partie est en ligne : voir Sauvegardes'); return {ok:false}; }
    if (!confirm(`La partie en ligne (${dist.info.club || '?'}, ${new Date(dist.maj).toLocaleString('fr-FR')}, ${dist.par}) est plus récente. L'écraser avec celle-ci ?`)) return {ok:false};
  }
  const r = await Synchro.fichierEcrire('qm27-p' + n, txt, {club:e.nomClub || '', manager:e.manager || '', saison:e.saison || '', date:e.date || null});
  const L2 = emplacements(); if (L2[n]){ L2[n].sync = {maj:r.maj}; LS.ecrire(K_EMP, L2); }
  if (NUAGE.conflit === n) NUAGE.conflit = null;
  if (!auto) toast('Partie envoyée'); return {ok:true};
}
async function recupererNuage(n){
  const d = await Synchro.fichierLire('qm27-p' + n); if (!d) throw new Error('vide');
  const W = QM.charger(d.texte);
  await Base.ecrire('p' + n, d.texte);
  const L = emplacements(), c = W.manager && W.manager.club ? W.clubs[W.manager.club] : null, S = W.calendrier[W.semaine];
  L[n] = {club:c ? c.id : null, nomClub:c ? c.nom : 'Sans club', manager:W.manager ? W.manager.nom : '', saison:`${W.saison}-${String(W.saison + 1).slice(2)}`, date:S ? S.date : null, maj:Date.now(), sync:{maj:d.maj}};
  LS.ecrire(K_EMP, L);
  M = W; EMP = n; X = null; LS.ecrire(K_DERNIER, n); NUAGE.conflit = null;
  toast(`Partie récupérée dans l'emplacement ${n}`);
}
async function rendreNuage(){
  const z = document.getElementById('nuage'); if (!z) return;
  if (!window.Synchro || !Synchro.actif()){
    z.innerHTML = `<p class="mut" style="margin:0 0 8px">Pour retrouver ta partie sur un autre appareil, active d'abord la synchronisation chiffrée de KiosK (une fois par appareil) dans la page État.</p><a class="btn sec plein" href="etat.html">Ouvrir la page État</a>`; return;
  }
  if (!(await Synchro.pret())){
    z.innerHTML = `<p class="mut" style="margin:0 0 8px">Entre ton code KiosK pour déverrouiller la synchronisation.</p><div class="ligne"><input class="champ" id="codeSync" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Code" style="flex:1"><button class="btn" data-act="ouvrirSync">OK</button></div>`; return;
  }
  const L = emplacements(), I = NUAGE.infos;
  z.innerHTML = `${NUAGE.conflit ? '<p style="margin:0 0 8px;font-weight:600;color:var(--moyen)">Une version plus récente est en ligne pour l\'emplacement ' + NUAGE.conflit + ' : récupère-la ou écrase-la.</p>' : ''}
    <div class="liste">${Array.from({length:NB_EMP}, (_, k) => k + 1).map(n => { const e = L[n], d = I && I[n];
      return `<div class="el"><div class="t"><b>Emplacement ${n}${n === EMP ? ' (en cours)' : ''}</b><span>Ici : ${e ? esc(e.nomClub) + ' · ' + esc(e.saison) : 'vide'} · en ligne : ${I ? (d ? esc(d.info.club || '?') + ' · ' + esc(d.info.saison || '') + ' · ' + new Date(d.maj).toLocaleString('fr-FR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) + ' (' + esc(d.par || '?') + ')' : 'rien') : '…'}</span></div></div>
        <div class="btns" style="margin-bottom:8px">${e ? `<button class="btn sec" data-act="envoyerNuage" data-n="${n}">Envoyer</button>` : ''}${d ? `<button class="btn sec" data-act="recupererNuage" data-n="${n}">Récupérer</button>` : ''}</div>`; }).join('')}</div>
    ${NUAGE.err ? `<p class="petit" style="color:var(--mauvais)">${esc(NUAGE.err)}</p>` : ''}
    <label class="el"><div class="t"><b>Envoyer automatiquement</b><span>Après chaque semaine jouée, si personne n'a joué plus récemment ailleurs</span></div><input type="checkbox" data-chg="autoSync" ${REG.autoSync ? 'checked' : ''} style="width:22px;height:22px"></label>`;
  if (!I && !NUAGE.charge){ NUAGE.charge = true; infosNuage().then(() => rendreNuage()).catch(e => { NUAGE.err = msgSync(e); NUAGE.infos = {}; rendreNuage(); }).finally(() => { NUAGE.charge = false; }); }
}
function sauver(){
  if (!M || !EMP) return Promise.resolve();
  const L = emplacements(), c = M.manager ? club(M.manager.club) : null, S = QM.semaine(M);
  L[EMP] = {...(L[EMP] && L[EMP].sync ? {sync:L[EMP].sync} : {}), club:c ? c.id : null, nomClub:c ? c.nom : 'Sans club', manager:M.manager ? M.manager.nom : '', saison:lab(M.saison), date:S ? S.date : null, maj:Date.now()};
  LS.ecrire(K_EMP, L); LS.ecrire(K_DERNIER, EMP);
  const txt = QM.serialiser(M);
  enCours = Base.ecrire('p' + EMP, txt).catch(() => toast('Sauvegarde impossible : mémoire pleine ?'));
  if (REG.autoSync && window.Synchro && Synchro.actif()){ clearTimeout(tNuage); const n = EMP; tNuage = setTimeout(() => envoyerNuage(n, true).catch(() => {}), 4000); }
  return enCours;
}
async function chargerEmp(n){
  const txt = await Base.lire('p' + n);
  if (!txt) throw new Error('Emplacement vide');
  M = QM.charger(txt); EMP = n; X = null; U.vue = 'accueil'; LS.ecrire(K_DERNIER, n);
}
addEventListener('visibilitychange', () => { if (document.hidden && M && !U.live) sauver(); });
addEventListener('pagehide', () => { if (M && !U.live) sauver(); });

/* ---------- En-tête et barre du bas ---------- */
function entete(){
  const t = $('#titre'), dr = $('#hdDr'), enJeu = !!(M && M.manager);
  /* v91 : plus de gros retour KiosK pendant la partie — retour écran par écran et maison ; KiosK seulement depuis l'écran des parties */
  const ret = $('#hdRetour'), men = $('#hdMenu'), kio = $('#hdKiosk');
  if (ret){ ret.hidden = !enJeu || PROF <= 0 || U.vue === 'match'; men.hidden = !enJeu || U.vue === 'match'; kio.hidden = enJeu; }
  document.body.classList.toggle('en-jeu', enJeu && U.vue !== 'match');
  if (!M || !M.manager){ t.innerHTML = '<b><span class="marque-qm">QM27</span></b><span>Quidditch Manager 27</span>'; dr.innerHTML = ''; return; }
  const S = QM.semaine(M);
  if (!M.manager.club){ t.innerHTML = `<b>${esc(M.manager.nom)} · sans club</b><span><span class="marque-qm">QM27</span> · ${lab(M.saison)}${S ? ' · ' + fmtDate(S.date) : ''}</span>`; dr.innerHTML = ''; return; }
  const c = club(M.manager.club);
  t.innerHTML = `<b>${esc(c.nom)}</b><span><span class="marque-qm">QM27</span> · ${lab(M.saison)}${S ? ' · ' + fmtDate(S.date) : ''}</span>`;
  dr.innerHTML = blason(c.id, 'p');
}
function barre(){
  const on = M && M.manager && U.vue !== 'match' && !U.live;
  NAV.hidden = !on; document.body.classList.toggle('sans-nav', !on);
  if (!on) return;
  const T = M.manager.club ? [['accueil', 'Accueil'], ['effectif', 'Effectif'], ['tactique', 'Tactique'], ['club', 'Club'], ['plus', 'Plus']] : [['accueil', 'Accueil'], ['plus', 'Plus']];
  const actif = ['classements', 'sauvegardes', 'aide', 'calendrier', 'carriere', 'boite', 'profil', 'clubs', 'clubFiche'].includes(U.vue) ? 'plus' : ['entrainement', 'mercato', 'finances', 'staff', 'stade', 'formation', 'selection', 'direction', 'vestiaire', 'domaine', 'boutique', 'partenaires', 'trophees'].includes(U.vue) ? 'club' : U.vue;
  const nl = M.boite.filter(m => !m.lu).length;
  NAV.querySelector('.in').innerHTML = T.map(([k, n]) => `<button data-act="vue" data-v="${k}" class="${actif === k ? 'on' : ''}" ${actif === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24">${ICO[k]}</svg>${n}${k === 'plus' && nl ? `<i class="pastille-nav" aria-label="${nl} message${nl > 1 ? 's' : ''} non lu${nl > 1 ? 's' : ''}">${nl > 9 ? '9+' : nl}</i>` : ''}</button>`).join('');
}
/* v91 : écrans enregistrés (qm27-ecrans.js en ajoute et en remplace) */
const VUES = {};
function rendre(){
  /* v97 : redessiner le même écran (une consigne, un rôle…) ne doit pas faire remonter la page : on garde la position,
     et la hauteur le temps que les images se recalent (Safari ramenait la page en haut) */
  const memeVue = U.vue === rendre.vue, y = scrollY, hMin = memeVue && VUE ? VUE.offsetHeight : 0;
  if (hMin) VUE.style.minHeight = hMin + 'px';
  try { rendreVue(); rafraichirFeuilleScene(); } finally {
    rendre.vue = U.vue;
    if (memeVue && U.vue === rendre.vue){ scrollTo(0, y); requestAnimationFrame(() => { scrollTo(0, y); setTimeout(() => { if (VUE) VUE.style.minHeight = ''; }, 120); }); }
    else if (VUE) VUE.style.minHeight = '';
  }
}
function rendreVue(){
  entete(); barre();
  if (!M || !M.manager) return vueDemarrage();
  const besoinClub = ['equipe', 'vestiaire', 'effectif', 'tactique', 'club', 'entrainement', 'mercato', 'finances', 'staff', 'stade', 'formation', 'calendrier', 'domaine', 'boutique', 'partenaires', 'trophees', 'direction'];
  if (!M.manager.club && besoinClub.includes(U.vue)) U.vue = 'accueil';
  if (!M.manager.club && U.vue === 'accueil') return vueChomage();
  if (U.vue === 'selection' && !M.manager.selection) U.vue = 'accueil';
  (VUES[U.vue] || VUES.accueil)();
  if (window.QMU && QMU.apresRendu) QMU.apresRendu();   // v92 : menu latéral
}
/* v91 : navigation — chaque écran entre dans l'historique du navigateur (retour, geste de retour de l'iPhone) */
let PROF = 0;
const pousser = v => { PROF++; try{ history.pushState({qm:v, n:PROF}, ''); }catch{} };
const racine = () => { PROF = 0; try{ history.replaceState({qm:U.vue, n:0}, ''); }catch{} };
const aller = v => { if (v !== U.vue) pousser(v); U.vue = v; rendre(); scrollTo(0, 0); };
addEventListener('popstate', e => {
  const st = e.state; if (!st || !st.qm || !M) return;
  if (U.live && U.live.parti && X && !X.fini){ pousser(U.vue); toast('Match en cours : termine-le d\'abord'); return; }
  if (st.qm === 'match' && !X){ history.back(); return; }
  retirerFeuille(); PROF = st.n || 0; U.vue = st.qm; rendre(); scrollTo(0, 0);
});

/* ---------- Démarrage ---------- */
const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--or-doux)"/><circle cx="32" cy="32" r="9" fill="var(--or)"/>
  <path d="M23 30c-6-7-13-8-17-6 5 0 9 3 12 8M41 30c6-7 13-8 17-6-5 0-9 3-12 8" fill="none" stroke="var(--or)" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M22 34c-5-3-10-2-13 1 4-1 8 0 11 2M42 34c5-3 10-2 13 1-4-1-8 0-11 2" fill="none" stroke="var(--or)" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>`;
function vueDemarrage(){
  if (U.etape === 'club') return vueChoixClub();
  const L = emplacements();
  VUE.innerHTML = `
  <div class="logo-qm">${LOGO}<h1>Quidditch Manager 27<small>QM27</small></h1></div>
  <p class="sous">Prenez les commandes d'un club : composition, consignes, matchs en direct. 64 clubs, 4 championnats, la Ligue des Anneaux et les sélections.</p>
  <div class="carte"><h2>Parties</h2><div class="liste">
  ${Array.from({length:NB_EMP}, (_, i) => i + 1).map(n => { const e = L[n];
    if (!e) return `<div class="el emp"><span class="blason nat" aria-hidden="true" style="font-size:1.3rem;color:var(--ink-soft)">+</span><div class="t"><b>Emplacement ${n}</b><span>Libre</span></div><button class="btn" data-act="nouvelle" data-n="${n}">Nouvelle carrière</button></div>`;
    return `<div class="el emp">${e.club && D.CLUBS.some(c => c[0] === e.club) ? blasonCode(e.club) : ''}<div class="t"><b>${esc(e.nomClub)}</b><span>${esc(e.manager)} · ${esc(e.saison)}${e.date ? ' · ' + fmtDate(e.date) : ''}</span></div>
      <button class="btn" data-act="charger" data-n="${n}">Reprendre</button><button class="fermer" data-act="menuEmp" data-n="${n}" aria-label="Plus d'actions">⋯</button></div>`; }).join('')}
  </div></div>
  <div class="carte"><h2>Entre appareils <span class="mut petit">chiffré</span></h2><div id="nuage"><p class="mut" style="margin:0">…</p></div></div>
  <button class="btn sec plein" data-act="importer">Importer une partie (fichier .json)</button>
  <p class="petit mut">Les parties sont gardées sur cet appareil. Pour les retrouver ailleurs : « Entre appareils » ci-dessus (synchronisation de KiosK), ou exporte la partie puis importe le fichier.</p>`;
  rendreNuage();
}
function blasonCode(id){ const c = D.CLUBS.find(x => x[0] === id); return V.blason({id, couleurs:[c[6], c[7]]}); }
let MONDE_NEUF = null;
function vueChoixClub(){
  if (!MONDE_NEUF) MONDE_NEUF = QM.nouveauMonde((Math.random() * 2 ** 32) >>> 0);
  const W = MONDE_NEUF, L = W.ligues[U.ligueChoix];
  const clubs = L.clubs.map(id => W.clubs[id]).sort((a, b) => b.rep - a.rep);
  VUE.innerHTML = `
  <div><h1 class="grand">Nouvelle carrière</h1><p class="sous">Emplacement ${U.empNeuf}</p></div>
  <div class="carte"><h2>Ton nom de manager</h2><input class="champ" id="nomMgr" maxlength="30" placeholder="Manager" value="${esc(U.nom)}" autocomplete="nickname"></div>
  <div class="carte"><h2>Choisis ton club</h2>
    <div class="seg" role="tablist">${Object.values(W.ligues).map(l => `<button role="tab" data-act="ligueChoix" data-l="${l.id}" class="${l.id === U.ligueChoix ? 'on' : ''}">${esc(l.court)}</button>`).join('')}</div>
    <div class="liste" style="margin-top:8px">${clubs.map(c => {
      const o = QM.objectif(W, c.id);
      return `<button class="el" data-act="voirClub" data-c="${c.id}">${V.blason(c)}
        <div class="t"><b>${esc(c.nom)}</b><span>${flag(c.nat)} ${esc(c.ville)} · ${esc(o.txt)}</span></div><div class="d">${etoiles(c.rep)}</div></button>`; }).join('')}</div>
  </div>
  <button class="btn sec plein" data-act="annulerNeuf">Annuler</button>`;
  $('#nomMgr').addEventListener('input', e => { U.nom = e.target.value; });
}
function ficheClubNeuf(id){
  const W = MONDE_NEUF, c = W.clubs[id], o = QM.objectif(W, id);
  const top = c.effectif.map(x => W.joueurs[x]).sort((a, b) => QM.note(b) - QM.note(a)).slice(0, 5);
  const moy = Math.round(QM.titulaires(c.compo).reduce((s, x) => s + QM.note(W.joueurs[x], ['P', 'B', 'A', 'G'].find(p => c.compo[p].includes(x))), 0) / 7);
  const balai = D.BALAIS.find(b => b.id === c.balai);
  feuille(`${teteF(esc(c.nom), `${flag(c.nat)} ${esc(c.ville)} · ${esc(W.ligues[c.ligue].nom)}`, V.blason(c, 'g'))}
    <div class="carte"><div class="ligne" style="justify-content:space-between"><span>Réputation</span>${etoiles(c.rep)}</div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Note moyenne des titulaires</span><span class="note ${classeNote(moy)}">${moy}</span></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Stade</span><b>${c.stade.toLocaleString('fr-FR')} places</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Balais</span><b>${esc(balai.nom)}</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Objectif du président</span><b>${esc(o.txt)}</b></div></div>
    <div class="carte" style="margin-top:10px"><h2>Meilleurs joueurs</h2><div class="liste">${top.map(j => `<div class="el">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans</span></div><span class="note ${classeNote(QM.note(j))}">${QM.note(j)}</span></div>`).join('')}</div></div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="fermer">Retour</button><button class="btn" data-act="prendreClub" data-c="${id}">Prendre ce club</button></div>`);
}

/* ---------- Accueil du club ---------- */
function vueAccueil(){
  const S = QM.semaine(M), mg = M.manager, c = club(mg.club);
  let prochain = '';
  if (!S){ prochain = `<div class="carte"><h2>Saison terminée</h2><button class="btn plein" data-act="saisonSuivante">Lancer la saison suivante</button></div>`; }
  else if (S.type === 'bilan'){
    const h = M.histo[M.histo.length - 1] || {}, pos = h.manager ? h.manager.pos : '?';
    prochain = `<div class="carte" style="border-color:var(--or)"><h2>Fin de la saison ${lab(M.saison)}</h2>
      <p style="margin:0 0 6px"><b>${esc(c.nom)} termine ${pos}${pos === 1 ? 'er' : 'e'}</b> (objectif : ${esc(mg.objectif.txt.toLowerCase())}).</p>
      <p class="sous" style="margin:0 0 4px">Champions : ${Object.values(h.champions || {}).map(id => esc(club(id).nom)).join(' · ')}</p>
      ${h.sixn ? `<p class="sous" style="margin:0 0 12px">Six Emblèmes : ${flagSeul(h.sixn)} ${esc(nat(h.sixn).nom)}</p>` : ''}${h.ldn ? `<p class="sous" style="margin:0 0 12px">${esc(D.LDN.nom)} : ${flagSeul(h.ldn)} ${esc(nat(h.ldn).nom)}</p>` : ''}
      <button class="btn or plein" data-act="saisonSuivante">Lancer la saison ${lab(M.saison + 1)}</button></div>`;
  } else {
    const m = QM.matchDuJoueur(M);
    if (m){
      const sx = m.ligue === 'sixn', moiId = sx ? mg.selection.nat : mg.club;
      const eu = m.ligue === 'eu', QE = window.QME;   // v104 : Ligue des Anneaux
      const comp = sx ? `${m.comp && window.QMN ? window.QMN.titreMatch(m) : `${D.TOURNOI.court} · tour ${S.tour}`} · avec ${nat(moiId).nom}` : eu ? `${QE.NOM} · ${QE.nomTour(m)}${m.neutre ? ' · terrain neutre' : ''}` : `${M.ligues[m.ligue].court} · Journée ${S.journee}${S.tour ? ' · ' + D.TOURNOI.court + ', tour ' + S.tour : ''}`;
      const abs = !sx && S.tour ? QM.convoques(M, mg.club).map(id => M.joueurs[id]) : [], reste = QM.matchsDuJoueur(M).filter(x => !x.res).length;
      const adv = m.dom === moiId ? m.ext : m.dom, lg = id => sx ? 'sixn' : club(id).ligue, T = {[m.dom]:M.tables[lg(m.dom)][m.dom], [m.ext]:M.tables[lg(m.ext)][m.ext]};
      const rang = id => QM.classement(M, lg(id)).findIndex(r => r.id === id) + 1, forme = id => (T[id].forme || []).map(f => `<span class="vnd ${f}">${f}</span>`).join('');
      prochain = `<div class="carte${eu ? ' eu' : ''}"><h2>Prochain match <span class="mut">${fmtDate(m.date || S.date)}</span></h2>
        <div class="petit mut" style="text-align:center">${esc(comp)}</div>
        <div class="affiche">
          <div class="eq">${blason(m.dom, 'g', sx)}<b>${esc(nomEq(m.dom, sx))}</b><span>${T[m.dom].j ? rang(m.dom) + 'e · ' : ''}${forme(m.dom) || 'à domicile'}</span></div>
          <div class="vs">VS</div>
          <div class="eq">${blason(m.ext, 'g', sx)}<b>${esc(nomEq(m.ext, sx))}</b><span>${T[m.ext].j ? rang(m.ext) + 'e · ' : ''}${forme(m.ext) || 'à l\'extérieur'}</span></div>
        </div>
        ${abs.length ? `<p class="petit" style="margin:4px 0 8px;text-align:center">✈︎ En sélection, absents : <b>${abs.map(j => esc(j.p[0] + '. ' + j.n)).join(', ')}</b></p>` : ''}
        ${sx && reste > 1 ? '<p class="petit mut" style="margin:4px 0 8px;text-align:center">Puis le match de ton club, le même week-end.</p>' : ''}
        <div class="btns">${sx ? '<button class="btn sec" data-act="vue" data-v="selection">Convocations</button>' : ''}<button class="btn" data-act="preparer">Préparer le match</button></div>
        ${sx ? '' : `<p class="petit mut" style="margin:8px 0 0;text-align:center">Adversaire : ${etoiles(club(adv).rep)}${B.a(c, 'boule') ? ` · météo prévue : ${D.METEOS[QM.meteoPrevue(M, m, S)].ico} ${esc(D.METEOS[QM.meteoPrevue(M, m, S)].nom)}` : ''}</p>`}</div>`;
    } else {
      const titre = S.type === 'sixn' ? (S.comp && window.QMN ? window.QMN.titreSemaine(S) : `${D.TOURNOI.court} · tour ${S.tour}`) : S.type === 'prepa' ? `Préparation · semaine ${S.semaine}` : S.type === 'europe' && window.QME ? `Finale de la ${window.QME.NOM}` : 'Semaine sans match';
      prochain = `<div class="carte"><h2>${titre} <span class="mut">${fmtDate(S.date)}</span></h2>
        ${S.type === 'sixn' ? `<p class="sous" style="margin:0 0 8px">${S.comp ? 'Les championnats font une pause : ' + (S.comp === 'ami' ? 'matchs amicaux, adversaires tirés au sort.' : 'les sélections jouent la ' + esc(D.LDN.nom) + '.') : 'Les ligues font une pause.'} Sélections gérées par les fédérations.</p><div class="liste">${S.matchs.map(x => `<div class="el">${blason(x.dom, 'p', 1)}<div class="t"><b>${esc(nat(x.dom).nom)} – ${esc(nat(x.ext).nom)}</b></div>${blason(x.ext, 'p', 1)}</div>`).join('')}</div>` : ''}
        ${S.type === 'prepa' ? `<p class="sous" style="margin:0 0 4px">Pas de match : on s'entraîne et le mercato d'été est ouvert jusqu'à la première journée.</p>` : ''}
        ${S.type === 'europe' ? `<p class="sous" style="margin:0 0 8px">Le championnat est fini. En terrain neutre :</p><div class="liste">${S.matchs.map(x => `<div class="el">${blason(x.dom, 'p')}<div class="t"><b>${esc(club(x.dom).nom)} – ${esc(club(x.ext).nom)}</b></div>${blason(x.ext, 'p')}</div>`).join('')}</div>` : ''}
        <div class="btns" style="margin-top:10px">${C.mercatoOuvert(S) ? '<button class="btn sec" data-act="vue" data-v="mercato">Mercato</button>' : ''}<button class="btn" data-act="continuer">Continuer</button></div></div>`;
    }
  }
  const oc = (mg.offres || []).filter(o => o.expire > (M.tic || 0));
  if (oc.length || mg.offreSel) prochain += `<div class="carte" style="border-color:var(--or)"><h2>Carrière <button data-act="vue" data-v="carriere">Répondre</button></h2>${oc.map(o => `<div class="el">${blason(o.club, 'p')}<div class="t"><b>${esc(club(o.club).nom)} vous veut</b><span>Réputation ${club(o.club).rep}</span></div></div>`).join('')}${mg.offreSel ? `<div class="el">${blason(mg.offreSel.nat, 'p', 1)}<div class="t"><b>Sélectionneur : ${esc(nat(mg.offreSel.nat).nom)}</b><span>Double poste pendant le Tournoi des Six Emblèmes</span></div></div>` : ''}</div>`;
  if (M.offres && M.offres.length) prochain += `<div class="carte" style="border-color:var(--or)"><h2>Offres reçues <button data-act="vue" data-v="mercato">Répondre</button></h2>${M.offres.map(o => `<div class="el">${blason(o.club, 'p')}<div class="t"><b>${esc(nomJ(M.joueurs[o.j]))}</b><span>${esc(club(o.club).nom)} · ${eur(o.montant)}</span></div></div>`).join('')}</div>`;
  const o = mg.objectif, conf = mg.confiance;
  const CL = QM.classement(M, c.ligue), i = CL.findIndex(r => r.id === c.id);
  const deb = Math.max(0, Math.min(CL.length - 5, i - 2)), part = CL.slice(deb, deb + 5);
  const nonLus = M.boite.filter(m => !m.lu), boite = (nonLus.length ? nonLus : M.boite).slice(0, 4);
  const dernier = M.dernierMatch;
  VUE.innerHTML = `${window.QMU && QMU.reunionCarte ? QMU.reunionCarte(M) : ''}<div class="cols"><div>
    ${prochain}
    ${dernier ? `<div class="carte"><h2>Dernier match</h2><button class="el" data-act="voirDernier">${blason(dernier.dom, 'p', dernier.sixn)}<div class="t"><b>${esc(nomEq(dernier.dom, dernier.sixn))} ${dernier.score[0]}–${dernier.score[1]} ${esc(nomEq(dernier.ext, dernier.sixn))}</b><span>${dernier.resume}</span></div>${blason(dernier.ext, 'p', dernier.sixn)}</button></div>` : ''}
    <div class="carte"><h2>Boîte de réception ${nonLus.length ? `<span class="badge neuf">${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''}</span>` : ''}<button data-act="boite">Tout voir</button></h2>${boite.length ? boite.map(msgHTML).join('') : '<p class="mut">Rien pour l\'instant.</p>'}</div>
  </div><div>
    <div class="carte"><h2>Président</h2>
      <div class="ligne" style="justify-content:space-between"><span>Objectif</span><b>${esc(o.txt)}</b></div>
      <div style="margin:10px 0 4px" class="ligne"><span style="flex:1">Confiance</span><b>${conf} %</b></div>
      <div class="jauge" role="meter" aria-valuenow="${conf}" aria-valuemin="0" aria-valuemax="100" aria-label="Confiance du président"><i style="width:${conf}%"></i></div>
      ${c.dom ? `<div style="margin:10px 0 4px" class="ligne"><span style="flex:1">Supporters</span><b>${Math.round(c.dom.supp)} / 100</b></div><div class="jauge" role="meter" aria-valuenow="${Math.round(c.dom.supp)}" aria-valuemin="0" aria-valuemax="100" aria-label="Humeur des supporters"><i style="width:${c.dom.supp}%"></i></div>` : ''}
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Solde du club</span><b style="color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</b></div>
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Réputation du manager</span><b>${Math.round(mg.rep)} / 100</b></div>
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Bilan de la saison</span><b>${mg.bilan.g} V · ${mg.bilan.n} N · ${mg.bilan.p} D</b></div></div>
    <div class="carte"><h2>${esc(M.ligues[c.ligue].nom)} <button data-act="vue" data-v="classements">Classement</button></h2>${tableHTML(part, c.ligue, true, deb)}</div>
  </div></div>`;
}
const msgHTML = m => `<button class="msg ${m.lu ? '' : 'neuf'}" data-act="lireMsg" data-id="${m.id}"><b>${pieces(esc(m.titre))}</b><p>${pieces(esc(String(m.corps).length > 160 ? String(m.corps).slice(0, 160) + '…' : m.corps))}</p></button>`;

/* ---------- Classements ---------- */
function tableHTML(rows, ligue, compact, deb = 0){
  const sixn = ligue === 'sixn', moi = M.manager.club;
  return `<table class="cl"><thead><tr><th>#</th><th>${sixn ? 'Nation' : 'Club'}</th><th>J</th>${compact ? '' : '<th class="tab-cache">V</th><th class="tab-cache">N</th><th class="tab-cache">D</th><th class="tab-cache">Vifs</th>'}<th>Diff</th><th>Pts</th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr class="${r.id === moi ? 'moi' : ''}${sixn ? '' : ' lien'}" ${sixn ? '' : `data-act="ficheClub" data-c="${r.id}" tabindex="0"`}><td>${deb + i + 1}</td><td class="club"><div>${blason(r.id, 'p', sixn)}<span>${esc(sixn ? nat(r.id).nom : club(r.id).nom)}</span></div></td><td>${r.j}</td>${compact ? '' : `<td class="tab-cache">${r.g}</td><td class="tab-cache">${r.n}</td><td class="tab-cache">${r.p}</td><td class="tab-cache">${r.vifs}</td>`}<td>${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td><td class="pts">${r.pts}</td></tr>`).join('')}
  </tbody></table>`;
}
function vueClassements(){
  const l = U.ligue || club(M.manager.club).ligue;
  const court = t => { const x = String(t).replace(/^Ligue /, ''); return x[0].toUpperCase() + x.slice(1); };   // v106 : « Ligue scandinave » → « Scandinave »
  const tabs = [...Object.values(M.ligues).map(x => [x.id, court(x.court)]), ['sixn', M.calendrier.some(s => s.tour) ? 'Six Emblèmes' : 'Sélections']];
  VUE.innerHTML = `<div><h1 class="grand">Classements</h1><p class="sous">Saison ${lab(M.saison)} · victoire ${E.points.victoire} pts, nul ${E.points.nul} pt</p></div>
  <div class="seg defile" role="tablist">${tabs.map(([k, n]) => `<button role="tab" data-act="ligue" data-l="${k}" class="${k === l ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>
  <div class="carte">${tableHTML(QM.classement(M, l), l, false)}</div>
  <p class="petit mut">Départage : points, différence de points marqués et encaissés, points marqués, vifs d'or attrapés.</p>`;
}

/* ---------- Effectif ---------- */
const ORDRE_P = {P:0, B:1, A:2, G:3};
function roleDe(id){ const c = club(M.manager.club).compo; for (const p of ['P', 'B', 'A', 'G']) if (c[p].includes(id)) return {tit:true, p}; return c.banc.includes(id) ? {banc:true} : {}; }
/* v87 : fiche joueur compacte — avatar, radar du profil, rapport du recruteur, attributs serrés en colonnes */
const COURT_ATTR = {res:'Résistance', acu:'Acuité', equ:'Équilibre', frm:'Formation', ctl:'Contrôle', fra:'Frappe', vis:'Vision', equi:'Collectif', cou_a:'Couverture', vir:'Virages', acc:'Accélér.', ant:'Anticipation', con:'Concentration'};
const IDX = k => D.ATTRS.findIndex(a => a[0] === k);
const moyA = (j, L) => L.reduce((s, k) => s + j.a[IDX(k)], 0) / L.length;
function axesRadar(j){
  const g = j.g.reduce((s, x) => s + x, 0) / j.g.length;
  return [['Vitesse', moyA(j, ['vit', 'acc', 'agi'])], ['Vol', moyA(j, ['pil', 'vir', 'piq', 'equ', 'frm'])],
    j.poste === 'G' ? ['Gardien', g] : ['Attaque', moyA(j, ['pas', 'rec', 'tir', 'pre', 'ctl'])],
    j.poste === 'G' ? ['Réflexes', moyA(j, ['ref', 'acu', 'agi'])] : ['Duel', moyA(j, ['int', 'bou', 'fra', 'for', 'res'])],
    ['Mental', moyA(j, ['vis', 'ant', 'pla', 'dec', 'con', 'san'])], ['Caractère', moyA(j, ['agr', 'cou', 'equi', 'det', 'end'])]];
}
const COULEUR_POSTE = {P:'#3a7bd5', B:'#c0392b', A:'#c99a1c', G:'#1f7a52'};
/* rapport du recruteur : le meilleur atout du poste, un défaut éventuel, la forme ou l'âge */
const ATOUTS = {vit:'Rapide comme l\'éclair sur son balai.', acc:'Démarre plus vite que son ombre.', end:'Ne faiblit jamais, même après trois heures de match.',
  for:'Solide comme un troll des montagnes.', agi:'Souple comme un chat de gouttière.', ref:'Des réflexes de chat.', acu:'Repère un vif d\'or à cent mètres.',
  res:'Encaisse les cognards sans broncher.', pil:'Pilote son balai comme personne.', vir:'Prend les virages au millimètre.', piq:'Ses piqués font frémir les tribunes.',
  equ:'Tient sur son balai par tous les temps.', frm:'Vole en formation comme une volée d\'oies.', pas:'Ses passes arrivent toujours dans les mains.',
  rec:'Des mains collantes : rien ne lui échappe.', tir:'Lance le souafle comme un cognard.', pre:'Trouve l\'anneau le plus étroit.', ctl:'Le souafle semble collé à sa main.',
  int:'Lit les passes adverses avant qu\'elles partent.', bou:'Ne recule devant aucun contact.', fra:'Frappe les cognards à boulet rouge.', vis:'Voit le jeu avant tout le monde.',
  ant:'Toujours un coup d\'avance.', pla:'Toujours au bon endroit.', dec:'Prend rarement la mauvaise décision.', con:'Une concentration à toute épreuve.',
  san:'Du sang-froid à revendre dans les moments chauds.', agr:'Joue dur, parfois trop.', cou:'Se jette dans la mêlée sans hésiter.', equi:'Joue pour l\'équipe avant tout.',
  det:'Ne lâche jamais rien.', arr:'Un mur devant ses anneaux.', cou_a:'Couvre les trois anneaux à la fois.', sor:'Sort toujours au bon moment.', rel:'Relance vite et juste.', com:'Commande sa défense de la voix.'};
const DEFAUTS = {Physique:'Manque encore de coffre.', Vol:'Encore un peu fragile sur son balai.', Balle:'Maladroit avec le souafle.', Mental:'Perd parfois le fil du match.'};
function rapportRecruteur(j){
  const w = QM.POIDS[j.poste], cand = D.ATTRS.map((a, i) => [a[0], j.a[i], w[i], a[2]]);
  if (j.poste === 'G') D.GARDIEN.forEach((g, i) => cand.push([g[0], j.g[i], 3, 'Gardien']));
  const cibles = cand.filter(x => x[2] === 3), top = cand.filter(x => x[2] >= 1).sort((a, b) => b[1] + b[2] * 0.4 - a[1] - a[2] * 0.4)[0];
  const faible = cibles.slice().sort((a, b) => a[1] - b[1])[0], est = C.potentielEstime(M, j), L = [];
  if (top && top[1] >= 11) L.push(ATOUTS[top[0]]); else L.push('Un joueur sans point fort marqué.');
  if (faible && faible[1] <= Math.max(7, top ? top[1] - 7 : 7) && DEFAUTS[faible[3]]) L.push(DEFAUTS[faible[3]]);
  if (j.bless) L.push('Pour l\'instant à l\'infirmerie.');
  else if (j.forme >= 8) L.push('En pleine bourre en ce moment.');
  else if (j.forme <= 4) L.push('Traverse une mauvaise passe.');
  else if (j.age <= 21 && est >= 4) L.push('Un diamant brut, à polir.');
  else if (j.age >= 32) L.push('L\'expérience compense les jambes.');
  return L.slice(0, 3).join(' ');
}
/* v90 : ce que l'on sait d'un joueur (attributs cachés tant que le recruteur ne l'a pas vu) */
const HH = () => window.QMH;
const connu = j => HH() ? HH().connaissance(M, j) : 100;
function valVue(j, v, cle, echelle){ if (connu(j) >= 100) return {txt:String(v), mid:v, exact:true}; const [a, b] = HH().fourchette(M, j, v, cle, echelle); return a === b ? {txt:String(a), mid:a, exact:false} : {txt:`${a}–${b}`, mid:(a + b) / 2, exact:false}; }
const noteVue = (j, p) => valVue(j, QM.note(j, p), 'note' + p, 5);
/* v94 : historique de carrière (saisons et mouvements), dans la fiche joueur */
const STAT_P = {P:[3, 'buts'], B:[4, 'cognards'], A:[5, 'vifs'], G:[6, 'arrêts']};
function carriereHTML(j){
  const k = j.carr || {s:[], t:[]}, s = j.saison || {}, [ix, nomS] = STAT_P[j.poste];
  const enCours = [M.saison, j.club, s.m || 0, s.b || 0, s.cog || 0, s.v || 0, s.arr || 0, s.m ? Math.round(s.notes / s.m * 10) : 0];
  const L = [enCours, ...k.s.slice().reverse()];
  const nomC = id => id ? (M.clubs[id] ? M.clubs[id].nom : id) : 'sans club', villeC = id => id && M.clubs[id] ? M.clubs[id].ville : 'sans club';
  const typeT = {transfert:'Transfert', libre:'Arrivée libre', libere:'Fin de contrat', pret:'Prêt', retour:'Retour de prêt'};
  const tot = L.reduce((a, x) => [a[0] + x[2], a[1] + x[ix]], [0, 0]);
  const R_ = window.QMR, palm = R_ && j.prix && j.prix.length ? R_.palmaresHTML(j.prix, esc) : '';   // v103 : palmarès
  return `<details class="carte fj-carriere"><summary><h2 style="display:inline">Carrière</h2> <span class="mut petit">${L.length} saison${L.length > 1 ? 's' : ''} · ${tot[0]} matchs · ${tot[1]} ${nomS}${j.sel ? ` · ${j.sel} sélection${j.sel > 1 ? 's' : ''}${j.selB ? ` (${j.selB} but${j.selB > 1 ? 's' : ''})` : ''}` : ''}${j.prix && j.prix.length ? ` · ${j.prix.length} distinction${j.prix.length > 1 ? 's' : ''}` : ''}</span></summary>
    ${palm ? `<h4 class="sous-t">Palmarès et prix</h4>${palm}` : ''}
    <div class="tab-carr" role="table"><div class="tc-l tc-h" role="row"><span>Saison</span><span>Club</span><span>MJ</span><span>${nomS[0].toUpperCase() + nomS.slice(1)}</span><span>Moy.</span></div>
    ${L.map((x, i) => `<div class="tc-l" role="row"><span>${lab(x[0])}${i ? '' : ' <i class="mut">en cours</i>'}</span><span class="tc-c">${x[1] && M.clubs[x[1]] ? blason(x[1], 'p') : ''}${esc(villeC(x[1]))}</span><span>${x[2]}</span><span>${x[ix]}</span><span>${x[7] ? (x[7] / 10).toFixed(1).replace('.', ',') : '—'}</span></div>`).join('')}</div>
    ${k.t.length ? `<h4 class="sous-t">Mouvements</h4><div class="liste">${k.t.slice().reverse().map(t => `<div class="el"><div class="t"><b>${typeT[t[2]] || t[2]}${t[5] ? ' · ' + eur(t[5]) : ''}</b><span>${lab(t[0])} · ${esc(nomC(t[3]))} → ${esc(nomC(t[4]))}</span></div></div>`).join('')}</div>` : ''}
    ${k.s.length ? '' : '<p class="petit mut" style="margin:8px 0 0">L\'historique a commencé avec la mise à jour v94 : les saisons précédentes ne sont pas connues.</p>'}</details>`;
}
/* v101 : la fiche se lit pour un poste et un rôle au choix (toucher une note de poste, puis un rôle) : les attributs cibles du poste
   sont surlignés, ceux du rôle plus fort. Purement visuel : la composition ne change que dans la Tactique. */
let FJ = null;
const roleCompo = j => { const c = j.club && club(j.club); return c && c.compo && c.compo.roles ? c.compo.roles[j.id] || null : null; };
function ficheJoueur(id, garder){
  const j = M.joueurs[id]; if (!j) return;
  if (!FJ || FJ.id !== id) FJ = {id, p:j.poste, role:roleCompo(j)};
  const P_ = FJ.p, ROLES_P = D.ROLES[P_] || [], role = ROLES_P.some(x => x[0] === FJ.role) ? FJ.role : null;
  const T_ = window.QMT, ra = T_ && T_.ROLE_ATTR[P_] && role ? T_.ROLE_ATTR[P_][role] : [], ad = T_ ? T_.adequation(j, P_, role || (ROLES_P[0] || [])[0]) : null;
  const mon = j.club === M.manager.club, r = mon ? roleDe(id) : {}, cl = j.club ? club(j.club) : null;
  const cible = {}; D.ATTRS.forEach(a => { cible[a[0]] = a[3]['PBAG'.indexOf(P_)] === '●' ? (ra.includes(a[0]) ? 2 : 1) : ra.includes(a[0]) ? 2 : 0; });
  D.GARDIEN.forEach(g => { cible[g[0]] = P_ === 'G' ? (ra.includes('g:' + g[0]) ? 2 : 1) : 0; });
  const autre = P_ !== j.poste || role !== roleCompo(j);
  const s = j.saison, est = C.potentielEstime(M, j), rec = mon ? club(M.manager.club).staff.recruteur : null;
  const kc = connu(j), ligne = (k, nom, v, c) => { const x = valVue(j, v, k); return `<div class="at${c ? ' c' : ''}${c === 2 ? ' r' : ''}${x.exact ? '' : ' flou'}" title="${esc(nom)}${c === 2 ? ' · attribut du rôle' : c ? ' · cible du poste' : ''}"><span>${esc(COURT_ATTR[k] || nom)}</span><b class="${classeAttr(x.mid)}">${x.txt}</b></div>`; };
  const fam = f => `<div class="fa"><h4>${f}</h4>${D.ATTRS.map((a, i) => a[2] !== f ? '' : ligne(a[0], a[1], j.a[i], cible[a[0]])).join('')}</div>`;
  feuille(`${teteF(`${esc(nomJ(j))}`, `${flagSeul(j.nat)} ${esc(nat(j.nat).nom)} · ${j.age} ans · ${D.POSTES[j.poste].nom}${cl ? ' · ' + (mon ? 'n° ' + j.num : esc(cl.nom)) : ' · agent libre'}`, `<span class="avp g">${avatarDe(j, 'g')}${cl ? `<span class="blp">${V.blason(cl, 'p')}</span>` : ''}</span>`)}
    <div class="fj-haut"><div class="fj-radar">${V.radar(axesRadar(j).map(([l, v]) => [l, kc >= 100 ? v : valVue(j, Math.round(v), 'ax' + l).mid]), COULEUR_POSTE[j.poste])}${kc < 100 ? `<p class="petit mut" style="margin:0;text-align:center">Estimation · connu à ${Math.round(kc)} %</p>` : ''}</div>
      <div class="fj-etat">
        <div><span>Forme</span><b>${j.forme}<small>/10</small></b><div class="barre"><i style="width:${j.forme * 10}%"></i></div></div>
        <div><span>Fatigue</span><b>${j.fat}<small> %</small></b><div class="barre fat"><i style="width:${j.fat}%"></i></div></div>
        <div title="Fatigue cumulée : monte avec les matchs enchaînés, redescend quand le joueur souffle"><span>Charge</span><b class="${(j.charge || 0) >= 60 ? 'mauvais' : (j.charge || 0) >= 40 ? 'moyen' : ''}">${Math.round(j.charge || 0)}<small>/100</small></b><div class="barre fat"><i style="width:${Math.round(j.charge || 0)}%"></i></div></div>
        <div><span>Moral</span><b>${Math.round(j.moral)}<small>/100</small></b><div class="barre"><i style="width:${Math.round(j.moral)}%"></i></div></div>
        <div><span>Potentiel</span><span class="etoiles">${'★'.repeat(est)}${'☆'.repeat(5 - est)}</span></div>
        ${j.bless ? `<div class="bls"><span>Blessure</span><b>${esc(j.bless.nom)} · ${j.bless.jours} j</b></div>` : ''}
      </div></div>
    <blockquote class="rapport">« ${esc(rapportRecruteur(j))} »<span>${rec ? `Rapport de ${esc(rec.p + ' ' + rec.n)}, recruteur` : 'Rapport de ton recruteur'}</span></blockquote>
    ${QM.manies(j).length ? `<div class="manies">${QM.manies(j).map(k => { const m = D.MANIES.find(x => x[0] === k); return m ? `<span class="manie"><b>${esc(m[1])}</b>${esc(m[3])}</span>` : ''; }).join('')}</div>` : ''}
    <div class="npostes" role="group" aria-label="Lire la fiche pour un poste">${['P', 'B', 'A', 'G'].map(p => { const x = noteVue(j, p); return `<button class="${p === P_ ? 'on' : ''}${p === j.poste ? ' nat' : ''}" data-act="fjPoste" data-p="${p}" aria-pressed="${p === P_}"><b class="${classeNote(x.mid)}" style="color:inherit${x.exact ? '' : ';font-size:.92rem'}">${x.txt}</b><span>${D.POSTES[p].nom}</span></button>`; }).join('')}</div>
    <div class="fj-roles"><div class="chips petites">${ROLES_P.map(([k, nom]) => { const e = ad && ad.roles ? ad.roles[k] : null; return `<button class="chip ${k === role ? 'on' : ''}" data-act="fjRole" data-r="${k}" aria-pressed="${k === role}" title="${esc((ROLES_P.find(x => x[0] === k) || [])[2] || '')}">${esc(nom)}${e != null && kc >= 100 ? `<small class="${e >= 1 ? 'bon' : e < -1.2 ? 'mauvais' : 'mut'}">${e > 0 ? '+' : ''}${String(e).replace('.', ',')}</small>` : ''}</button>`; }).join('')}</div>
      <p class="petit mut">${role ? esc((ROLES_P.find(x => x[0] === role) || [])[2] || '') + ' ' : 'Choisis un rôle pour surligner ses attributs. '}${kc >= 100 ? '<span title="Moyenne de ses attributs du rôle moins sa moyenne au poste">Le chiffre : ses attributs du rôle comparés à son niveau au poste. </span>' : ''}${autre ? `<button class="lien" data-act="fjRaz">Revenir à son poste</button>` : ''}</p></div>
    ${kc < 100 ? `<p class="petit mut" style="margin:6px 2px 0">Attributs en fourchette : ${Math.round(kc)} % connu. Suis le joueur (ton recruteur l'observe chaque semaine) ou affronte son équipe pour en savoir plus.</p>` : ''}
    <div class="carte fj-attrs"><h2>Attributs <span class="mut petit">${P_ === j.poste ? 'surlignés' : 'en ' + esc(D.POSTES[P_].nom.toLowerCase())} : cibles du poste${role ? ' · plus fort : rôle ' + esc(((ROLES_P.find(x => x[0] === role) || [])[1] || '').toLowerCase()) : ''}</span></h2><div class="cols-at">
      ${fam('Physique')}${fam('Vol')}${fam('Balle')}${fam('Mental')}
      ${j.poste === 'G' || P_ === 'G' ? `<div class="fa"><h4>Gardien</h4>${D.GARDIEN.map((g, i) => ligne(g[0], g[1], j.g[i], cible[g[0]])).join('')}</div>` : ''}
    </div></div>
    <p class="fj-saison"><b>Saison</b> ${s.m} match${s.m > 1 ? 's' : ''} · ${s.b} but${s.b > 1 ? 's' : ''} · ${s.v} vif${s.v > 1 ? 's' : ''} · note moyenne ${s.m ? (s.notes / s.m).toFixed(1) : '—'}</p>
    ${carriereHTML(j)}
    ${mon && B.a(club(M.manager.club), 'apothicaire') ? `<button class="btn sec plein" style="margin-top:10px" data-act="potion" data-j="${j.id}">Potion de forme de l'apothicaire (+2 forme)</button>` : ''}
    ${j.acad ? blocJeune(j) : blocContrat(j, mon)}
    ${mon ? `<p class="petit mut" style="margin-top:10px">${r.tit ? `Titulaire (${D.POSTES[r.p].nom.toLowerCase()}).` : r.banc ? 'Remplaçant.' : 'Hors du groupe de 12.'} Les changements se font dans Tactique.</p>` : ''}`, garder);
}

/* ---------- Tactique ---------- */
const CONSIGNES = [
  ['rythme', 'Rythme', 'Rapide : plus de tirs et de pertes de balle, plus de fatigue.', [[1, 'Lent'], [2, 'Normal'], [3, 'Rapide']]],
  ['risque', 'Prise de risque', 'Élevée : on tire plus souvent, de moins bonnes positions.', [[1, 'Faible'], [2, 'Normale'], [3, 'Élevée']]],
  ['agressivite', 'Agressivité', 'Plus de cognards réussis, plus de fautes et de penalties.', [[1, 'Calme'], [2, 'Normale'], [3, 'Dure']]],
  ['passes', 'Jeu de passes', 'Court : tirs plus sûrs. Long : plus de tirs.', [['court', 'Court'], ['long', 'Long']]],
  ['cible', 'Cible des cognards', 'Poursuiveurs : pertes de balle. Attrapeur : le gêne. Gardien : ouvre les anneaux.', [['poursuiveur', 'Poursuiveurs'], ['attrapeur', 'Attrapeur'], ['gardien', 'Gardien']]],
  ['attrapeur', 'Attrapeur', 'Le choix clé : prendre le vif d\'or quand on est mené de plus de 150 points fait perdre.', [['gagnant', 'Si ça fait gagner'], ['chasse', 'Chasse'], ['marquage', 'Marquage']]],
  ['gardien', 'Gardien', 'Sortir : moins de tirs adverses, mais buts plus faciles s\'il est passé.', [['anneaux', 'Aux anneaux'], ['sortie', 'Sortir']]],
];
/* v89 : dispositions avec et sans le souafle, zone d'attaque */
const DISPOS = [
  ['avec', 'Poursuiveurs avec le souafle', 'Triangle : équilibré. Ligne : plus de tirs, moins précis. Pointe : tirs plus sûrs, plus de ballons perdus.', [['triangle', 'Triangle'], ['ligne', 'Ligne'], ['pointe', 'Pointe']]],
  ['batAvec', 'Batteurs avec le souafle', 'Escorte : protègent le porteur. Devant : gênent le gardien adverse mais exposent le porteur.', [['escorte', 'Escorte'], ['devant', 'Devant']]],
  ['zone', 'Zone d\'attaque', 'Chaque défense craint une zone : le pressing craint l\'axe, la zone craint les couloirs, le repli craint les tirs de loin.', [['axe', 'Axe'], ['couloirs', 'Couloirs'], ['loin', 'De loin']]],
  ['sans', 'Poursuiveurs sans le souafle', 'Pressing : récupère vite mais fatigue et ouvre des espaces. Zone : équilibré. Repli : moins de buts encaissés, moins de ballons récupérés.', [['pressing', 'Pressing'], ['zone', 'Zone'], ['repli', 'Repli']]],
  ['batSans', 'Batteurs sans le souafle', 'Protection : couvrent les anneaux. Harcèlement : plus de cognards sur le porteur adverse, anneaux moins gardés.', [['protection', 'Protection'], ['harcelement', 'Harcèlement']]],
];
const nomOpt = (k, v) => { const c = [...CONSIGNES, ...DISPOS].find(x => x[0] === k); return c ? ((c[3].find(o => String(o[0]) === String(v)) || [])[1] || '') : ''; };
/* v96 : consignes compactes. Chaque ligne : libellé (touche : explications et effets), choix, tendances du choix actuel.
   o (facultatif) = {prev : prévision de l'adjoint (QMT.prevoir), fit : (k, v) => html des joueurs concernés, ouvert : clé dépliée} */
const TT = () => window.QMT;
const COURT_CONS = {rythme:'Rythme', risque:'Risque', agressivite:'Engagement', passes:'Passes', avec:'Poursuiveurs', batAvec:'Batteurs', zone:'Zone de tir', sans:'Poursuiveurs', batSans:'Batteurs', cible:'Cognards', attrapeur:'Attrapeur', gardien:'Gardien'};
const COURT_OPT = {gagnant:'Si gagnant', poursuiveur:'Poursuiv.', anneaux:'Anneaux', harcelement:'Harcèlement'};
const GROUPES_C = [['Avec le souafle', ['avec', 'batAvec', 'zone']], ['Sans le souafle', ['sans', 'batSans']], ['Style de jeu', ['rythme', 'risque', 'agressivite', 'passes']], ['Cognards, vif d\'or et gardien', ['cible', 'attrapeur', 'gardien']]];
const nb1 = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + String(Math.abs(Math.round(x * 10) / 10)).replace('.', ',');
const nb0 = x => (Math.round(x) > 0 ? '+' : Math.round(x) < 0 ? '−' : '±') + Math.abs(Math.round(x));
const fxChips = (k, v) => !TT() ? '' : TT().effets(k, v).map(([l, n, bon]) => `<span class="fx ${bon === null ? '' : bon ? 'b' : 'm'}">${n > 0 ? '▲'.repeat(Math.min(2, n)) : '▼'.repeat(Math.min(2, -n))} ${esc(l)}</span>`).join('');
function impactTxt(d, adv){
  if (!d) return '';
  const parts = [`buts ${nb1(d.pour)}`, `encaissés ${nb1(d.contre)}`];
  if (Math.abs(d.vif) >= 0.5) parts.push(`vif d'or ${nb1(d.vif)} pt${Math.abs(d.vif) >= 2 ? 's' : ''}`);
  if (Math.abs(d.duree) >= 2) parts.push(`durée ${nb1(d.duree)} min`);
  if (d.fatigue) parts.push(`fatigue ${nb1(d.fatigue)} %`);
  return `<p class="imp ${d.ecart > 3 ? 'b' : d.ecart < -3 ? 'm' : ''}">${adv ? 'Contre ' + esc(adv) + ' : ' : ''}${parts.join(' · ')} → écart attendu <b>${nb0(d.ecart)} pts</b></p>`;
}
function consRow(T, k, act, o){
  const c = TT().CONS_PAR[k], ouvert = o.ouvert === k;
  const det = !ouvert ? '' : `<div class="cs-det"><p class="petit">${esc(c[3])}</p>${c[4].map(([v, l, , chiffre]) => { const on = String(T[k]) === String(v);
    return `<div class="cs-opt${on ? ' on' : ''}"><div class="ligne"><b style="flex:1">${esc(l)}</b>${on ? '<span class="badge tit">Choix actuel</span>' : `<button class="btn sec mini" data-act="${act}" data-k="${k}" data-v="${v}">Choisir</button>`}</div>
      <div class="cs-fx">${fxChips(k, v) || '<span class="fx">Référence</span>'}</div><p class="petit mut" style="margin:3px 0 0">${esc(chiffre)}</p>
      ${o.prev && !on ? impactTxt(o.prev.opts[k] && o.prev.opts[k][v], o.adv) : ''}${o.fit ? o.fit(k, v) : ''}</div>`; }).join('')}</div>`;
  return `<div class="cs${ouvert ? ' ouvert' : ''}"><button class="cs-l" data-act="infoCons" data-k="${k}" data-a="${act}" aria-expanded="${ouvert}" title="${esc(c[1])} : explications et effets">${COURT_CONS[k]}<i aria-hidden="true">${ouvert ? '−' : 'i'}</i></button>
    <div class="seg mini" role="group" aria-label="${esc(c[1])}">${c[4].map(([v, l]) => `<button data-act="${act}" data-k="${k}" data-v="${v}" class="${String(T[k]) === String(v) ? 'on' : ''}" aria-pressed="${String(T[k]) === String(v)}">${COURT_OPT[v] || l}</button>`).join('')}</div>
    ${!ouvert && fxChips(k, T[k]) ? `<div class="cs-fx">${fxChips(k, T[k])}</div>` : ''}${det}</div>`;
}
function consignesHTML(T, act, liste, o){
  if (!TT()) return '';
  T = QM.completerTactique({...T}); o = o || {}; if (o.ouvert === undefined) o.ouvert = U.infoCons && U.infoCons[0] === act ? U.infoCons[1] : null;
  return GROUPES_C.map(([n, L]) => [n, L.filter(k => !liste || liste.includes(k))]).filter(g => g[1].length).map(([n, L]) => `<div class="cs-g"><h4>${n}</h4>${L.map(k => consRow(T, k, act, o)).join('')}</div>`).join('');
}
/* adéquation : pastille et libellé */
const NIV = {bon:['bon', 'Adapté'], moyen:['moyen', 'Moyen'], faible:['faible', 'Peu adapté']};
const pastille = a => a ? `<i class="fit ${a.niveau}" title="${NIV[a.niveau][1]}${a.raisons.length ? ' : ' + esc(a.raisons.join(' ; ')) : ''}"></i>` : '';
/* les joueurs que toucherait une option (titulaires des postes concernés) */
function fitOption(K, T){
  return (k, v) => {
    const d = TT().DEMANDE[k] && TT().DEMANDE[k][String(v)]; if (!d) return '';
    const T2 = {...T, [k]:/^\d$/.test(String(v)) ? +v : v}, L = [];
    for (const p of d[0]) for (const id of (K[p] || [])){ const j = M.joueurs[id]; if (!j) continue; const a = TT().adequation(j, p, (K.roles || {})[id], T2); if (a && a.niveau !== 'bon') L.push(`${pastille(a)} ${esc(court(j))}`); }
    return `<p class="petit fitl">${L.length ? 'Moins à l\'aise : ' + L.join(', ') : '<i class="fit bon"></i> Les joueurs concernés sont à l\'aise'}</p>`;
  };
}
const rolesFit = (j, p, r, T) => { const a = TT() ? TT().adequation(j, p, r, T) : null; return a ? a.roles : {}; };
const libFit = x => x == null ? '' : x >= 0.8 ? '<span class="fitb bon">Idéal</span>' : x >= -0.5 ? '<span class="fitb moyen">Correct</span>' : '<span class="fitb faible">Peu naturel</span>';
function listeRoles(j, p, r, id, T){
  const RF = rolesFit(j, p, r, T), a = TT() ? TT().adequation(j, p, r, T) : null;
  return `${a ? `<p class="petit" style="margin:0 0 8px">${pastille(a)} <b>${NIV[a.niveau][1]}</b> à ce qu'on lui demande${a.raisons.length ? (a.niveau === 'bon' ? '. À surveiller : ' : ' : ') + esc(a.raisons.join(' ; ')) : a.plus.length ? ' : ' + esc(a.plus.join(' ; ')) : ''}.</p>` : ''}
    <div class="liste">${D.ROLES[p].map(([v, n, d]) => `<button class="el" data-act="choisirRole" data-j="${id}" data-r="${v}"><span class="poste ${p}" aria-hidden="true">${v === r ? '✓' : ''}</span><div class="t"><b>${n} ${libFit(RF[v])}</b><span style="white-space:normal">${esc(d)}</span></div></button>`).join('')}</div>`;
}
function ficheRole(id, p){
  const k = club(M.manager.club).compo, j = M.joueurs[id], r = (k.roles || {})[id];
  feuille(`${teteF('Rôle de ' + esc(nomJ(j)), D.POSTES[p].nom)}
    ${listeRoles(j, p, r, id, club(M.manager.club).tactique)}
    <div class="sep"></div>
    <button class="btn ${k.cap === id ? 'sec' : ''} plein" data-act="capitaine" data-j="${id}">${k.cap === id ? 'Déjà capitaine' : 'Nommer capitaine'}</button>
    <p class="petit mut" style="margin:8px 0 0">Le capitaine donne un peu de moral au départ et limite la baisse quand l'équipe encaisse.</p>`);
}
/* ---------- v86 : composition sur le terrain (tactique du club et convocations de la sélection) ----------
   Places : P0-P2, B0-B1, A0, G0 (titulaires) et R0-R4 (banc). Une place peut rester vide : le moteur la complète avant le match. */
const NB_BANC = () => E.banc || 5;
const SLOTS_T = ['P0', 'P1', 'P2', 'B0', 'B1', 'A0', 'G0'];
const SLOTS_B = () => Array.from({length:NB_BANC()}, (_, i) => 'R' + i);
const nomSlot = s => s[0] === 'R' ? 'R' + (+s.slice(1) + 1) : s[0] === 'A' || s[0] === 'G' ? s[0] : s[0] + (+s.slice(1) + 1);
const lireSlot = (K, s) => ((s[0] === 'R' ? K.banc : K[s[0]]) || [])[+s.slice(1)] || null;
const ecrireSlot = (K, s, id) => { (s[0] === 'R' ? K.banc : K[s[0]])[+s.slice(1)] = id || null; };
const slotDe = (K, id) => [...SLOTS_T, ...SLOTS_B()].find(s => lireSlot(K, s) === id) || null;
/* v89 : positions (% du terrain, nos anneaux en bas) selon la phase (avec ou sans le souafle) et la disposition choisie */
const FORM = {   // v98 : positions recalculées pour qu'aucun joueur n'en recouvre un autre, même sur téléphone
  avec:{P:{triangle:[[17, 34], [50, 22], [83, 34]], ligne:[[17, 30], [50, 30], [83, 30]], pointe:[[20, 38], [50, 16], [80, 38]]}, B:{escorte:[[28, 56], [72, 56]], devant:[[15, 12], [85, 12]]}, A:[50, 71], G:[50, 89]},
  sans:{P:{pressing:[[22, 32], [50, 22], [78, 32]], zone:[[17, 48], [50, 40], [83, 48]], repli:[[17, 62], [50, 56], [83, 62]]}, B:{protection:[[24, 79], [76, 79]], harcelement:[[15, 13], [85, 13]]}, A:[50, 7], G:[50, 91]}};
function posT(s, T){
  const ph = U.phase || 'avec', F = FORM[ph], i = +s.slice(1); T = QM.completerTactique({...(T || {})});
  if (s[0] === 'P') return F.P[ph === 'avec' ? T.avec : T.sans][i];
  if (s[0] === 'B') return F.B[ph === 'avec' ? T.batAvec : T.batSans][i];
  return F[s[0]];
}
/* zones d'attaque dessinées sur la moitié adverse (repère du terrain 100 × 140) */
const ZONES = {axe:[[34, 8, 32, 31]], couloirs:[[5, 12, 27, 36], [68, 12, 27, 36]], loin:[[12, 50, 76, 12]]};
const NOM_ZONE = {axe:'Axe', couloirs:'Couloir', loin:'De loin'};
function zonesHTML(T){
  const z = T.zone || 'axe';
  /* v98 : simple repère visuel de la zone choisie (le choix se fait au-dessus du terrain) */
  return `<svg class="zones" viewBox="0 0 100 140" aria-hidden="true">${Object.entries(ZONES).filter(([k]) => k === z).map(([k, R]) => R.map(([x, y, w, h]) => `<g class="zn on"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></g>`).join('')).join('')}</svg>`;
}
function normaliserK(K){
  for (const [p, n] of [['P', 3], ['B', 2], ['A', 1], ['G', 1]]) K[p] = Array.from({length:n}, (_, i) => (K[p] || [])[i] || null);
  K.banc = Array.from({length:NB_BANC()}, (_, i) => (K.banc || [])[i] || null);
  return K;
}
function ctxCompo(){
  if (U.vue === 'selection' && M.manager.selection){
    const n = M.manager.selection.nat, K = normaliserK(JSON.parse(JSON.stringify(C.convocation(M).compo)));
    return {sel:true, K, T:M.sel.tactique, pool:Object.values(M.joueurs).filter(j => j.nat === n && j.club && !j.acad), valider(){ M.sel.compo = K; M.sel.perso = true; QM.convoquer(M); }};
  }
  const c = club(M.manager.club);
  return {sel:false, K:normaliserK(c.compo), T:c.tactique, pool:c.effectif.map(id => M.joueurs[id]).filter(Boolean), valider(){}};
}
/* met le joueur à une place (null : réserve) ; l'occupant prend l'ancienne place du joueur, ou part en réserve */
function placerSlot(ctx, id, cible){
  const K = ctx.K, de = slotDe(K, id);
  if (de === (cible || null)) return false;
  const occ = cible ? lireSlot(K, cible) : null;
  if (cible) ecrireSlot(K, cible, id);
  if (de) ecrireSlot(K, de, occ);
  QM.rolesAuto(M, K, true); ctx.valider(); U.flash = id;
  sauver(); rendre();
  const j = M.joueurs[id];
  toast(cible ? `${court(j)} : ${cible[0] === 'R' ? 'remplaçant ' + nomSlot(cible) : D.POSTES[cible[0]].nom.toLowerCase()}${occ && de ? ' · ' + court(M.joueurs[occ]) + ' prend sa place' : occ ? ' · ' + court(M.joueurs[occ]) + ' en réserve' : ''}` : `${court(j)} en réserve`);
  return true;
}
const TERRAIN_SVG = `<svg viewBox="0 0 100 140" aria-hidden="true"><defs><pattern id="qm-raies" width="100" height="14" patternUnits="userSpaceOnUse"><rect width="100" height="7" class="gz1"/><rect y="7" width="100" height="7" class="gz2"/></pattern></defs>
  <ellipse cx="50" cy="70" rx="48.5" ry="68.5" class="bord"/><ellipse cx="50" cy="70" rx="47" ry="67" fill="url(#qm-raies)"/>
  <g class="lignes"><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="9"/><line x1="12.8" y1="27" x2="87.2" y2="27"/><line x1="12.8" y1="113" x2="87.2" y2="113"/>
    <path d="M37 27 A13 9 0 0 1 63 27"/><path d="M37 113 A13 9 0 0 0 63 113"/></g>
  <g class="anneaux"><circle cx="40" cy="10" r="2.3"/><circle cx="50" cy="8.6" r="3"/><circle cx="60" cy="10" r="2.3"/><circle cx="40" cy="130" r="2.3"/><circle cx="50" cy="131.4" r="3"/><circle cx="60" cy="130" r="2.3"/></g>
  <circle cx="50" cy="70" r="1.2" class="vif"/></svg>`;
/* maillot de l'équipe affichée : club du manager ou sélection */
const kitDe = sel => sel ? {id:M.manager.selection.nat, couleurs:V.couleursNation(M.manager.selection.nat), motif:'uni'} : club(M.manager.club);
/* v107 : l'info affichée à côté de chaque joueur sur le terrain et le banc (gardée sur l'appareil) */
const INFOS_TAC = [['note', 'Note', 'Note au poste'], ['fat', 'Fatigue', 'Fatigue du moment (en %, moins c\'est mieux)'], ['forme', 'Forme', 'Forme sur 10'], ['moral', 'Moral', 'Moral sur 100'],
  ['charge', 'Charge', 'Fatigue cumulée des dernières semaines (moins c\'est mieux)'], ['age', 'Âge', 'Âge']];
U.infoTac = LS.lire('qm27:infoTac', 'note');
function infoJeton(j, n){
  const k = U.infoTac, f = j.fat || 0, ch = j.charge || 0;
  if (k === 'fat') return {txt:Math.round(f) + '%', cls:f >= 60 ? 'iv-x' : f >= 35 ? 'iv-m' : 'iv-b'};
  if (k === 'forme') return {txt:String(j.forme).replace('.', ','), cls:j.forme >= 7 ? 'iv-b' : j.forme < 5 ? 'iv-x' : 'iv-m'};
  if (k === 'moral') return {txt:String(Math.round(j.moral)), cls:j.moral >= 65 ? 'iv-b' : j.moral < 40 ? 'iv-x' : 'iv-m'};
  if (k === 'charge') return {txt:String(Math.round(ch)), cls:ch >= 62 ? 'iv-x' : ch >= 35 ? 'iv-m' : 'iv-b'};
  if (k === 'age') return {txt:j.age + ' a', cls:''};
  return {txt:String(n), cls:classeNote(n)};
}
const infoTacHTML = () => `<div class="tinfo"><span>À côté des joueurs</span><div class="seg mini" role="group" aria-label="Info affichée à côté des joueurs">${INFOS_TAC.map(([k, n, t]) => `<button data-act="infoTac" data-k="${k}" class="${U.infoTac === k ? 'on' : ''}" aria-pressed="${U.infoTac === k}" title="${t}">${n}</button>`).join('')}</div></div>`;
function jetonHTML(K, s, sel, T){
  const id = lireSlot(K, s), j = M.joueurs[id], banc = s[0] === 'R', ps = banc ? null : posT(s, T);
  const pos = banc ? '' : ` style="left:${ps[0]}%;top:${ps[1]}%"`, eti = banc ? `<em>${nomSlot(s)}</em>` : '';
  if (!j) return `<button class="jeton vide${banc ? ' b' : ''}" data-act="jeton" data-slot="${s}"${pos} aria-label="${nomSlot(s)} : place libre">${eti}<span class="rond">+</span><b>${banc ? 'Libre' : D.POSTES[s[0]].nom}</b></button>`;
  const p = banc ? j.poste : s[0], n = QM.note(j, p), hors = !banc && j.poste !== p, iv = infoJeton(j, n);
  return `<button class="jeton ${p}${hors ? ' hors' : ''}${banc ? ' b' : ''}${U.flash === id ? ' flash' : ''}" data-act="jeton" data-slot="${s}" data-j="${id}"${pos} aria-label="${esc(nomJ(j))}, ${nomSlot(s)}, note ${n}">${eti}
    <span class="rond kit">${V.maillot(kitDe(sel), sel ? [...SLOTS_T, ...SLOTS_B()].indexOf(s) + 1 : j.num ?? '')}${banc ? `<i class="ps pi" title="${D.POSTES[p].nom}">${V.posteImg(p)}</i>` : ''}${K.cap === id && !banc ? '<i class="cap" title="Capitaine">C</i>' : ''}${K.pen === id && !banc ? '<i class="pn" title="Tireur de penalty">P</i>' : ''}${j.bless ? '<i class="bl">✚</i>' : ''}${j.inter && !sel ? '<i class="bl" title="En sélection">✈︎</i>' : ''}${banc ? '' : `<i class="ntj ${iv.cls}">${iv.txt}</i>`}</span>${banc ? `<b>${esc(j.n)}</b><span class="nt ${iv.cls}">${iv.txt}</span>` : `<b class="eti">${U.fitMap && U.fitMap[id] ? pastille(U.fitMap[id]) : ''}<span class="nm">${esc(j.n)}</span>${hors ? `<span class="hp" title="Hors de son poste">${j.poste}</span>` : ''}</b>`}</button>`;
}
function ligneEff(ctx, j){
  const K = ctx.K, s = slotDe(K, j.id), p = s && s[0] !== 'R' ? s[0] : j.poste, n = QM.note(j, p);
  const occ = x => { const o = M.joueurs[lireSlot(K, x)]; return o && o.id !== j.id ? ' · ' + o.n : ''; };
  const G = [['Poursuiveurs', ['P0', 'P1', 'P2']], ['Batteurs', ['B0', 'B1']], ['Attrapeur', ['A0']], ['Gardien', ['G0']], ['Remplaçants', SLOTS_B()]];
  const sel = `<select data-chg="poste" data-j="${j.id}" aria-label="Place de ${esc(nomJ(j))}">${G.map(([g, L]) => `<optgroup label="${g}">${L.map(x => `<option value="${x}"${x === s ? ' selected' : ''}>${nomSlot(x)}${occ(x)}</option>`).join('')}</optgroup>`).join('')}<optgroup label="Hors du groupe"><option value=""${s ? '' : ' selected'}>— Réserve</option></optgroup></select>`;
  return `<div class="er${U.flash === j.id ? ' flash' : ''}" data-drag="${j.id}"><label class="pick${s ? (s[0] === 'R' ? ' r' : ' ti ' + s[0]) : ''}"><span>${s ? nomSlot(s) : '—'}</span>${sel}</label>
    <button class="t" data-act="joueur" data-j="${j.id}"><b>${ctx.sel ? '' : flag(j.nat) + ' '}${esc(nomJ(j))}${j.bless ? ' <span class="badge bless">✚</span>' : ''}${j.inter && !ctx.sel ? ' <span class="badge" title="En sélection cette semaine">✈︎</span>' : ''}</b><span>${D.POSTES[j.poste].nom}${ctx.sel ? ' · ' + esc(club(j.club).nom) : ' · ' + j.age + ' ans'}</span></button>
    <span class="note ${classeNote(n)}">${n}</span><span class="fo ${j.forme >= 7 ? 'bon' : j.forme < 5 ? 'mauvais' : ''}" title="Forme">${j.forme}</span></div>`;
}
function panneauHTML(ctx){
  const K = ctx.K, dans = new Set([...SLOTS_T, ...SLOTS_B()].map(x => lireSlot(K, x)).filter(Boolean));
  const vide = x => `<div class="er vide"><span class="pick ${x[0] === 'R' ? 'r' : 'ti ' + x[0]}"><span>${nomSlot(x)}</span></span><div class="t"><b>Place libre</b><span>Choisis un joueur avec son menu</span></div></div>`;
  const ligne = x => { const j = M.joueurs[lireSlot(K, x)]; return j ? ligneEff(ctx, j) : vide(x); };
  let R = ctx.pool.filter(j => !dans.has(j.id)).sort((a, b) => ORDRE_P[a.poste] - ORDRE_P[b.poste] || QM.note(b) - QM.note(a));
  if (ctx.sel){ const n = {}; R = R.filter(j => (n[j.poste] = (n[j.poste] || 0) + 1) <= 6); }
  return `<div class="tpan-tete"><div><b>${ctx.sel ? 'Joueurs sélectionnables' : 'Effectif'}</b><span>Menu à gauche : place du joueur</span></div><button class="fermer" data-act="panneau" aria-label="Fermer le panneau">✕</button></div>
  <div class="tpan-liste"><div class="ent"><span>Place</span><span>Joueur</span><span>Note</span><span>Forme</span></div>
    <div class="grp">Titulaires</div>${SLOTS_T.map(ligne).join('')}
    <div class="grp">Banc (${NB_BANC()})</div>${SLOTS_B().map(ligne).join('')}
    <div class="grp">Réserve (${R.length}${ctx.sel ? ', les 6 meilleurs par poste' : ''})</div>${R.map(j => ligneEff(ctx, j)).join('') || '<p class="petit mut">Personne.</p>'}</div>`;
}
function compoHTML(ctx){
  const K = ctx.K, ouvert = U.panneau ?? document.documentElement.classList.contains('desk');
  return `<div class="tac${ouvert ? ' ouvert' : ''}">
    <div class="tpan-fond" data-act="panneau"></div><aside class="tpan" aria-label="Effectif">${panneauHTML(ctx)}</aside>
    <div class="tcentre"><div class="tbarre"><button class="btn sec" data-act="panneau" aria-expanded="${ouvert}">☰ ${ctx.sel ? 'Joueurs' : 'Effectif'}</button><button class="btn sec" data-act="${ctx.sel ? 'selAuto' : 'compoAuto'}">Auto</button></div>
      <div class="seg phase" role="tablist">${[['avec', 'Avec le souafle'], ['sans', 'Sans le souafle']].map(([k, n]) => `<button data-act="phase" data-p="${k}" class="${(U.phase || 'avec') === k ? 'on' : ''}" role="tab" aria-selected="${(U.phase || 'avec') === k}">${n}</button>`).join('')}</div>
      ${(U.phase || 'avec') === 'avec' ? `<div class="tzone"><span>Zone d'attaque</span><div class="seg mini" role="group" aria-label="Zone d'attaque">${['axe', 'couloirs', 'loin'].map(k => `<button data-act="zoneAtt" data-z="${k}" class="${(ctx.T.zone || 'axe') === k ? 'on' : ''}" aria-pressed="${(ctx.T.zone || 'axe') === k}">${esc(nomOpt('zone', k))}</button>`).join('')}</div></div>` : ''}
      ${infoTacHTML()}
      <div class="tterrain">${TERRAIN_SVG}${(U.phase || 'avec') === 'avec' ? zonesHTML(ctx.T) : ''}${SLOTS_T.map(x => jetonHTML(K, x, ctx.sel, ctx.T)).join('')}</div></div>
    <div class="tbanc"><h3>Banc</h3>${SLOTS_B().map(x => jetonHTML(K, x, ctx.sel, ctx.T)).join('')}</div>
  </div>
  <p class="petit mut aide-tac">Glisse un remplaçant sur un titulaire pour les échanger ; touche un joueur pour son rôle. <i class="fit bon"></i> adapté · <i class="fit moyen"></i> moyen · <i class="fit faible"></i> peu adapté · C capitaine · P tireur de penalty.</p>`;
}
/* garde la position de la liste du panneau quand l'écran se redessine */
function avecPanneau(f){ const l = document.querySelector('.tpan-liste'), y = l ? l.scrollTop : 0; f(); const n = document.querySelector('.tpan-liste'); if (n) n.scrollTop = y; U.flash = null; }
function vueTactique(){
  const ctx = ctxCompo(), K = ctx.K, c = club(M.manager.club), T = QM.completerTactique(c.tactique);
  const notes = SLOTS_T.map(x => M.joueurs[lireSlot(K, x)] ? QM.note(M.joueurs[lireSlot(K, x)], x[0]) : null).filter(x => x !== null);
  const moy = notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : 0;
  const A = TT() ? TT().adequationCompo(M, K, T) : {}; U.fitMap = A;
  const nbN = n => Object.values(A).filter(a => a && a.niveau === n).length;
  /* prochain adversaire et prévision de l'adjoint (calculées avec le moteur, sans hasard) */
  let pm = null, R = null, P = null; try { pm = TT() && TT().prochainMatch(M); if (pm){ R = TT().rapport(M, pm.m, pm.S); const cx = TT().contexteMatch(M, pm.m, pm.S); P = cx && TT().prevoir(cx, T); } } catch (e){ console.warn('QM27 tactique', e); }
  avecPanneau(() => { VUE.innerHTML = `<div><h1 class="grand">Tactique</h1><p class="sous">Note moyenne <b>${moy}</b> · <span title="Adéquation des titulaires">adaptés <i class="fit bon"></i> ${nbN('bon')} <i class="fit moyen"></i> ${nbN('moyen')} <i class="fit faible"></i> ${nbN('faible')}</span>${notes.length < 7 ? ` · <span style="color:var(--moyen)">${7 - notes.length} place${7 - notes.length > 1 ? 's' : ''} libre${7 - notes.length > 1 ? 's' : ''}</span>` : ''}</p></div>
  ${compoHTML(ctx)}
  <div class="cols tac-cols"><div>
    <div class="carte cons-c"><h2>Consignes <span class="mut petit">touche un libellé pour ses effets</span></h2>${consignesHTML(T, 'consigne', null, {prev:P, adv:R && R.adv.nom, fit:fitOption(K, T)})}</div>
    <div class="carte"><h2>Rôles et capitaine</h2><div class="liste compacte">${SLOTS_T.map(x => { const id = lireSlot(K, x), j = M.joueurs[id]; if (!j) return '';
      const Ro = (D.ROLES[x[0]] || []).find(r => r[0] === (K.roles || {})[id]), a = A[id];
      return `<button class="el" data-act="role" data-j="${id}" data-p="${x[0]}">${posteB(x[0])}<div class="t"><b>${pastille(a)} ${esc(court(j))}${K.cap === id ? ' <span class="badge tit">C</span>' : ''} <span class="mut" style="font-weight:400">· ${Ro ? esc(Ro[1]) : 'rôle ?'}</span></b><span>${a && a.raisons.length ? (a.niveau === 'bon' ? 'À surveiller : ' : '') + esc(a.raisons[0]) : a && a.plus.length ? esc(a.plus[0]) : 'À l\'aise dans ce qu\'on lui demande'}</span></div><span class="d mut">›</span></button>`; }).join('')}</div></div>
  </div><div>
    ${R ? adversaireHTML(R, T) : ''}
    ${P ? previsionHTML(P, R, 'consigne') : ''}
  </div></div>`; });
}
/* v96 : le prochain adversaire vu par l'adjoint */
function adversaireHTML(R, T){
  const To = R.T, no = (k, v) => nomOpt(k, v).toLowerCase(), barre = (l, a, b) => { const m = Math.max(a, b, 1);
    return `<div class="rf"><span>${esc(l)}</span><div class="rf-b"><i class="n" style="width:${a / m * 100}%"></i><i class="e" style="width:${b / m * 100}%"></i></div><b class="${a >= b + 0.5 ? 'bon' : b >= a + 0.5 ? 'mauvais' : ''}">${String(a).replace('.', ',')} / ${String(b).replace('.', ',')}</b></div>`; };
  return `<div class="carte adv"><h2>Prochain adversaire <span class="mut petit">${R.dom ? 'à l\'extérieur' : 'à domicile'}</span></h2>
    <div class="ligne" style="gap:10px;margin-bottom:8px">${blason(R.adv.id, 'p')}<div style="flex:1;min-width:0"><b>${esc(R.adv.nom)}</b><div class="petit mut">${R.rang}${R.rang === 1 ? 'er' : 'e'} sur ${R.nb} · forme ${R.forme.join(' ') || '—'} · ${D.METEOS[R.meteo] ? D.METEOS[R.meteo].ico + ' ' + D.METEOS[R.meteo].nom.toLowerCase() : ''}</div></div></div>
    <p class="petit" style="margin:0 0 8px"><b>Leur jeu :</b> ${no('sans', QM.sansDe(To))} sans le souafle, attaque ${To.zone === 'axe' ? 'par l\'axe' : To.zone === 'couloirs' ? 'par les couloirs' : 'de loin'}, batteurs en ${no('batSans', To.batSans)}, cognards sur ${no('cible', To.cible)}, jeu ${no('agressivite', To.agressivite)}, gardien ${To.gardien === 'sortie' ? 'qui sort' : 'sur sa ligne'}.</p>
    <div class="rfs"><div class="rf-leg"><span><i class="n"></i>nous</span><span><i class="e"></i>eux</span></div>${R.lignes.map(([l, a, b]) => barre(l, a, b)).join('')}</div>
    <p class="petit" style="margin:8px 0"><b>À surveiller :</b> ${R.cles.map(x => `${esc(court(x.j))} (${D.POSTES[x.j.poste].nom.toLowerCase()}, ${x.n})`).join(', ')}</p>
    ${R.conseils.length ? `<div class="conseils">${R.conseils.map(([t, k, v]) => `<div class="cs-c"><span>${esc(t)}</span>${k && String(T[k]) !== String(v) ? `<button class="btn sec mini" data-act="consigne" data-k="${k}" data-v="${v}">Appliquer</button>` : ''}</div>`).join('')}</div>` : ''}</div>`;
}
/* v96 : prévision de l'adjoint et pistes d'amélioration (act : consigne, consigneAvant ou consigneLive) */
function previsionHTML(P, R, act, live){
  const b = P.base, m = (n, l) => `<div><b>${n}</b><span>${l}</span></div>`;
  return `<div class="carte prev"><h2>${live ? 'Pistes de l\'adjoint' : 'Prévision'}${R ? ` <span class="mut petit">contre ${esc(R.adv.nom)}</span>` : ''}</h2>
    ${live ? '' : `<div class="prev-g">${m('≈ ' + Math.round(b.pour), 'buts marqués')}${m('≈ ' + Math.round(b.contre), 'buts encaissés')}${m(Math.round(b.vif) + ' %', 'vif d\'or pour nous')}${m(Math.round(b.possession) + ' %', 'possession')}${m('≈ ' + Math.round(b.duree) + ' min', 'durée')}${m(nb0(b.ecart) + ' pts', 'écart attendu')}</div>`}
    ${P.conseils.length ? `${live ? '' : '<h4 class="sous-t">Pistes</h4>'}<div class="conseils">${P.conseils.map(x => `<div class="cs-c"><span><b>${esc(COURT_CONS[x.k])} : ${esc(nomOpt(x.k, x.v))}</b> · écart ${nb0(x.ecart)} pts (buts ${nb1(x.pour)}, encaissés ${nb1(x.contre)}${x.fatigue ? ', fatigue ' + nb1(x.fatigue) + ' %' : ''})</span><button class="btn sec mini" data-act="${act}" data-k="${x.k}" data-v="${x.v}">Appliquer</button></div>`).join('')}</div>` : '<p class="petit mut" style="margin:6px 0 0">Aucun changement simple ne rapporte nettement plus : ton plan tient la route.</p>'}
    <p class="petit mut" style="margin:8px 0 0">${live ? 'Effet estimé sur le reste du match, joueurs fatigués compris.' : 'Calculé avec les règles du match pour ces deux équipes, sans le hasard du jour : l\'écart réel varie beaucoup d\'un match à l\'autre (vif d\'or).'}</p></div>`;
}
/* touche sur un joueur du terrain ou du banc */
function ficheJeton(s){
  const ctx = ctxCompo(), K = ctx.K, id = lireSlot(K, s), j = M.joueurs[id], banc = s[0] === 'R', p = banc ? null : s[0], i = +s.slice(1);
  const changer = `data-act="${ctx.sel ? 'slotSel' : banc ? 'slotBanc' : 'slot'}" data-p="${p || (j ? j.poste : 'P')}" data-i="${i}" data-b="${banc ? 1 : 0}"`;
  if (!j) return ACT[ctx.sel ? 'slotSel' : banc ? 'slotBanc' : 'slot']({p:p || 'P', i, b:banc ? '1' : '0'});
  const n = QM.note(j, p || j.poste), r = (K.roles || {})[id];
  feuille(`${teteF(esc(nomJ(j)), `${banc ? 'Remplaçant ' + nomSlot(s) : D.POSTES[p].nom} · note ${n} · forme ${j.forme} · fatigue ${j.fat} % · charge ${Math.round(j.charge || 0)}${ctx.sel ? ' · ' + esc(club(j.club).nom) : ''}`, posteB(p || j.poste))}
    ${!banc && !ctx.sel ? `<div class="grp">Rôle</div>${listeRoles(j, p, r, id, ctx.T)}
    <div class="sep"></div><button class="btn ${K.cap === id ? 'sec' : ''} plein" data-act="capitaine" data-j="${id}">${K.cap === id ? 'Déjà capitaine' : 'Nommer capitaine'}</button><div style="height:8px"></div>` : ''}
    ${p === 'P' ? `<button class="btn ${K.pen === id ? 'sec' : ''} plein" data-act="tireurPen" data-j="${id}">${K.pen === id ? 'Tireur de penalty désigné' : 'Désigner tireur de penalty'}</button><div style="height:8px"></div>` : ''}
    <div class="btns"><button class="btn sec" ${changer}>Changer de joueur</button><button class="btn sec" data-act="joueur" data-j="${id}">Fiche du joueur</button></div>
    <div style="height:8px"></div><button class="btn sec plein" data-act="enReserve" data-j="${id}">Sortir du groupe (réserve)</button>`);
}
/* glisser-déposer au doigt et à la souris : jetons du terrain et du banc ; lignes du panneau (souris, ou appui long au doigt) */
let GL = null, clicBloque = 0;
function finGlisser(){ if (!GL) return; clearTimeout(GL.tempo); const t = document.querySelector('.tac.repli'); if (t) t.classList.remove('repli'); if (GL.fantome) GL.fantome.remove(); if (GL.cible) GL.cible.classList.remove('cible'); GL.src.classList.remove('source'); document.body.classList.remove('glisse'); GL = null; }
function debutGlisser(){
  GL.actif = true; const r = GL.src.getBoundingClientRect(), f = (GL.eff ? GL.src.querySelector('.tj-n b') : GL.src.classList.contains('er') ? GL.src.querySelector('.t b') : GL.src.querySelector('.rond')).cloneNode(true);
  const d = document.createElement('div'); d.className = 'fantome ' + (M.joueurs[GL.id] ? M.joueurs[GL.id].poste : ''); d.appendChild(f);
  d.style.left = GL.x + 'px'; d.style.top = GL.y + 'px'; document.body.appendChild(d); GL.fantome = d;
  GL.src.classList.add('source'); document.body.classList.add('glisse');
  GL.repli = GL.ligne && !document.documentElement.classList.contains('desk');   // au téléphone, le tiroir s'efface pour laisser voir le terrain
  if (GL.repli){ const t = document.querySelector('.tac'); if (t) t.classList.add('repli'); }
  if (navigator.vibrate) try{ navigator.vibrate(8); }catch{}
}
document.addEventListener('pointerdown', e => {
  if (e.button > 0 || e.target.closest('select, .pick')) return;
  /* v107 : dans l'Effectif, à la souris seulement (au doigt, la liste doit défiler) */
  const eff = U.vue === 'effectif' && e.pointerType === 'mouse' && M && M.manager && M.manager.club ? e.target.closest('.tj-l[data-j]') : null;
  const src = eff || e.target.closest('.jeton[data-j], .er[data-drag]'); if (!src) return;
  finGlisser();
  GL = {src, id:src.dataset.j || src.dataset.drag, x:e.clientX, y:e.clientY, x0:e.clientX, y0:e.clientY, actif:false, ligne:src.classList.contains('er'), souris:e.pointerType === 'mouse', eff:!!eff};
  if (GL.ligne && !GL.souris) GL.tempo = setTimeout(() => { if (GL && !GL.actif) debutGlisser(); }, 380);
});
document.addEventListener('pointermove', e => {
  if (!GL) return;
  GL.x = e.clientX; GL.y = e.clientY;
  const d = Math.hypot(GL.x - GL.x0, GL.y - GL.y0);
  if (!GL.actif){ if (GL.ligne && !GL.souris){ if (d > 8) finGlisser(); return; } if (d < 6) return; debutGlisser(); }
  e.preventDefault();
  GL.fantome.style.left = GL.x + 'px'; GL.fantome.style.top = GL.y + 'px';
  if (GL.eff){ const h = innerHeight, bord = 70; if (GL.y > h - bord) scrollBy(0, Math.ceil((GL.y - h + bord) / 3)); else if (GL.y < bord + 60) scrollBy(0, -Math.ceil((bord + 60 - GL.y) / 3)); }   // v107 : la page défile près des bords
  const el = document.elementFromPoint(GL.x, GL.y), c = el && el.closest(GL.eff ? '.tj-l[data-j]' : '.jeton');
  const cible = c && c !== GL.src ? c : null;
  if (cible !== GL.cible){ if (GL.cible) GL.cible.classList.remove('cible'); if (cible) cible.classList.add('cible'); GL.cible = cible; }
  GL.surPanneau = !cible && !!(el && el.closest('.tpan'));
});
document.addEventListener('pointerup', () => {
  if (!GL) return;
  if (!GL.actif){ finGlisser(); return; }
  clicBloque = Date.now();
  if (GL.eff){ const a = GL.id, b = GL.cible ? GL.cible.dataset.j : null; finGlisser(); if (b) echangerEff(a, b); return; }
  const id = GL.id, cible = GL.cible ? GL.cible.dataset.slot : null, reserve = GL.surPanneau && !GL.ligne;
  if (GL.repli && cible) U.panneau = false;
  finGlisser();
  if (cible || reserve) placerSlot(ctxCompo(), id, cible);
});
document.addEventListener('pointercancel', finGlisser);
document.addEventListener('touchmove', e => { if (GL && GL.actif) e.preventDefault(); }, {passive:false});
document.addEventListener('click', e => { if (Date.now() - clicBloque < 400){ e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('.er, .jeton')) e.preventDefault(); });
/* v107 : échange de places entre deux joueurs de l'effectif (titulaire, remplaçant ou réserve) */
function echangerEff(a, b){
  const ctx = ctxCompo(), K = ctx.K, sa = slotDe(K, a), sb = slotDe(K, b);
  if (!sa && !sb){ toast(`${court(M.joueurs[a])} et ${court(M.joueurs[b])} sont tous deux en réserve : rien à échanger`); return; }
  if (sb) placerSlot(ctx, a, sb); else placerSlot(ctx, b, sa);
}
function choisirPour(p, i, banc){
  const c = club(M.manager.club), CK = c.compo, actuel = banc ? CK.banc[i] : CK[p][i];
  const rang = j => { const r = roleDe(j.id); return !banc ? 0 : r.tit ? 2 : r.banc ? 1 : 0; };   // v86 : pour le banc, la réserve d'abord
  const L = c.effectif.map(id => M.joueurs[id]).filter(j => j.id !== actuel).sort((a, b) => rang(a) - rang(b) || QM.note(b, banc ? b.poste : p) - QM.note(a, banc ? a.poste : p));
  feuille(`${teteF(banc ? 'Remplaçant' : D.POSTES[p].nom, banc ? 'Choisis le joueur à mettre sur le banc' : 'Note au poste · le joueur choisi échange sa place')}
  <div class="liste">${L.map(j => { const r = roleDe(j.id), n = QM.note(j, banc ? j.poste : p);
    return `<button class="el" data-act="mettre" data-j="${j.id}" data-p="${p}" data-i="${i}" data-b="${banc ? 1 : 0}">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${r.tit ? 'Titulaire (' + D.POSTES[r.p].nom.toLowerCase() + ')' : r.banc ? 'Remplaçant' : 'Réserve'} · forme ${j.forme} · fatigue ${j.fat} %${j.bless ? ' · ✚ blessé' : ''}</span></div><span class="note ${classeNote(n)}">${n}</span></button>`; }).join('')}</div>`);
}
function mettre(jid, p, i, banc){
  fermerFeuille(); placerSlot(ctxCompo(), jid, banc ? 'R' + i : p + i);
}

/* ---------- Calendrier ---------- */
function ficheSemaine(k){
  const s = M.calendrier[k], mg = M.manager, l = mg.club ? club(mg.club).ligue : null;
  const ligne = (m, sixn) => `<div class="el">${blason(m.dom, 'p', sixn)}<div class="t"><b>${esc(nomEq(m.dom, sixn))} – ${esc(nomEq(m.ext, sixn))}</b><span>${m.res ? `${m.res.duree} min${m.res.vif >= 0 ? ' · vif d\'or : ' + esc(nomEq(m.res.vif ? m.ext : m.dom, sixn)) : ''}` : 'à venir'}</span></div><b>${m.res ? m.res.score.join('–') : ''}</b>${blason(m.ext, 'p', sixn)}</div>`;
  const Ls = s.matchs.filter(m => m.ligue === 'sixn'), Lc = s.matchs.filter(m => m.ligue !== 'sixn' && m.ligue !== 'eu' && (!l || m.ligue === l)), Le = s.matchs.filter(m => m.ligue === 'eu'), QE = window.QME;
  const titre = s.type === 'sixn' ? (s.comp && window.QMN ? window.QMN.titreSemaine(s) : `${D.TOURNOI.court} · tour ${s.tour}`) : s.type === 'europe' && QE ? `Finale de la ${QE.NOM}` : `Journée ${s.journee}${s.tour ? ' · ' + D.TOURNOI.court + ' (tour ' + s.tour + ')' : ''}`;
  feuille(`${teteF(titre, fmtDate(s.date, true))}
  ${Lc.length ? `${l ? `<h4 class="sous-t">${esc(M.ligues[l].nom)}</h4>` : ''}<div class="liste">${Lc.map(m => ligne(m, false)).join('')}</div>` : ''}
  ${Ls.length ? `<h4 class="sous-t">${esc(s.comp === 'ldn' ? D.LDN.nom : s.comp === 'ami' ? D.AMICAUX.nom : D.TOURNOI.nom)}</h4><div class="liste">${Ls.map(m => ligne(m, true)).join('')}</div>` : ''}
  ${Le.length && QE ? `<h4 class="sous-t">${esc(QE.NOM)} · ${fmtDate(Le[0].date || s.date)}</h4><div class="liste">${Le.map(m => ligne(m, false).replace('<span>', `<span>${esc(QE.nomTour(m))} · `)).join('')}</div>` : ''}`);
}

/* ---------- Plus ---------- */
function vueSauvegardes(){
  const e = emplacements()[EMP] || {};
  VUE.innerHTML = `<div><h1 class="grand">Sauvegardes</h1><p class="sous">La partie s'enregistre toute seule après chaque semaine.</p></div>
  <div class="carte"><h2>Partie en cours</h2><p style="margin:0">Emplacement ${EMP} · ${esc(e.nomClub || '')} · ${esc(e.saison || '')}</p><p class="petit mut" style="margin:4px 0 12px">Dernier enregistrement : ${e.maj ? new Date(e.maj).toLocaleString('fr-FR') : '—'}</p>
    <div class="btns"><button class="btn" data-act="sauverMain">Enregistrer</button><button class="btn sec" data-act="exporter" data-n="${EMP}">Exporter</button></div></div>
  <div class="carte"><h2>Entre appareils <span class="mut petit">chiffré</span></h2><div id="nuage"><p class="mut" style="margin:0">…</p></div></div>
  <div class="carte"><h2>Autres parties</h2><button class="btn sec plein" data-act="quitter">Changer de partie</button><div style="height:8px"></div><button class="btn sec plein" data-act="importer">Importer un fichier</button></div>`;
  rendreNuage();
}
function vueAide(){
  const P = REG.pauses;
  VUE.innerHTML = `<div><h1 class="grand">Règles et réglages</h1></div>
  <div class="carte"><h2>Noms des clubs et des ligues</h2><div class="liste">
    ${D.LANGUES_NOMS.map(([k, n, ex]) => `<label class="el"><div class="t"><b>${n}</b><span>${esc(ex)}</span></div><input type="radio" name="nomsLg" data-chg="noms" value="${k}" ${(REG.noms || 'local') === k ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
  </div></div>
  <div class="carte"><h2>Pauses automatiques pendant le direct</h2><div class="liste">
    ${[['blessure', 'Blessure'], ['faute_grave', 'Faute grave'], ['vif_apercu', 'Vif d\'or aperçu']].map(([k, n]) => `<label class="el"><div class="t"><b>${n}</b></div><input type="checkbox" data-chg="pause" data-k="${k}" ${P[k] ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
  </div></div>
  <div class="carte"><h2>Pendant le direct</h2><div class="liste">
    <label class="el"><div class="t"><b>Temps forts selon l'enjeu</b><span>Tout quand le match est serré, l'essentiel quand il est plié</span></div><input type="checkbox" data-chg="resumes" ${REG.resumes !== 'tout' ? 'checked' : ''} style="width:22px;height:22px"></label>
    <label class="el"><div class="t"><b>Ambiance sonore</b><span>Foule, sifflet, carillon du vif d'or</span></div><input type="checkbox" data-chg="son" ${REG.son ? 'checked' : ''} style="width:22px;height:22px"></label>
    <label class="el"><div class="t"><b>Causeries</b><span>Avant le match et aux temps morts</span></div><input type="checkbox" data-chg="causeries" ${REG.causeries !== false ? 'checked' : ''} style="width:22px;height:22px"></label>
    <label class="el"><div class="t"><b>Conférence de presse</b><span>Après chaque match, plusieurs médias, des réponses aux effets différents</span></div><input type="checkbox" data-chg="presse" ${REG.presse !== false ? 'checked' : ''} style="width:22px;height:22px"></label>
    <label class="el"><div class="t"><b>Questions par conférence</b><span>Une, deux ou trois</span></div><select data-chg="presseN" aria-label="Questions par conférence">${[1, 2, 3].map(n => `<option value="${n}" ${(REG.presseN || 3) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${M && HH() ? `<label class="el"><div class="t"><b>Paris et pots-de-vin (cette partie)</b><span>Parier sur ton match, soudoyer le gardien adverse… au risque d'une enquête du ministère, voire d'Azkaban</span></div><input type="checkbox" data-chg="triche" ${HH().etat(M).triche ? 'checked' : ''} style="width:22px;height:22px"></label>` : ''}
  </div></div>
  <div class="carte aide"><h2>Comment ça marche</h2>
    <p><b>Points.</b> Un but de poursuiveur vaut ${E.points.but} points, le vif d'or ${E.points.vif} et termine le match. Victoire ${E.points.victoire} points au classement, nul ${E.points.nul}.</p>
    <p><b>Le vif d'or.</b> Il apparaît entre la ${E.vifApparitionMin}e et la ${E.vifApparitionMax}e minute, peut se cacher puis revenir. Plus le temps passe, plus il est facile à attraper. Attention : le prendre quand on est mené de plus de 150 points fait perdre le match. La consigne « Si ça fait gagner » demande à l'attrapeur de le laisser filer dans ce cas.</p>
    <p><b>Dispositions.</b> Dans Tactique, deux phases : avec le souafle (poursuiveurs en triangle, en ligne ou en pointe ; batteurs en escorte ou devant ; zone d'attaque à toucher sur le terrain) et sans le souafle (pressing, zone ou repli ; batteurs en protection ou en harcèlement). Chaque défense craint une zone : le pressing craint l'axe, la zone craint les couloirs, le repli craint les tirs de loin. Désigne aussi ton tireur de penalty (touche un poursuiveur).</p>
    <p><b>Le match.</b> Une minute de jeu défile en une seconde à vitesse ×1 (deux secondes à ×0,5). La carte Statistiques suit le match en direct : équipes, tes joueurs (note, actions, fatigue, rendement, moral, charge) et ceux d'en face. Deux temps morts par équipe pour changer les consignes et faire entrer des remplaçants : 3 changements libres, plus ceux qui suivent une blessure. Pendant le direct : le match vu du dessus, les autres scores à la radio, les conseils de l'adjoint et, si tu le veux, l'ambiance du stade.</p>
    <p><b>Les joueurs.</b> 31 attributs de 1 à 20, plus 5 pour les gardiens. La note sur 100 dépend du poste : les attributs cibles (●) comptent triple. La forme, la fatigue et le moral changent chaque semaine.</p>
    <p><b>La composition.</b> 7 titulaires sur le terrain et ${NB_BANC()} remplaçants sur le banc (Tactique). Glisse un joueur du banc sur un titulaire pour les échanger, ou choisis la place de chacun avec le menu du panneau Effectif (titulaire, remplaçant ou réserve). Une place laissée libre est complétée au coup d'envoi.</p>
    <p><b>Monnaie.</b> Gallions (pièce d'or), Mornilles (argent) et Noises (bronze) : 1 Gallion = 17 Mornilles, 1 Mornille = 29 Noises, soit 1 Gallion = 493 Noises. Les prix suivent le canon (un Gallion vaut environ 5 livres) : une place coûte 2 ou 3 Gallions, un bon joueur gagne des milliers de Gallions par semaine. Les gros montants s'affichent en Gallions, les petits en Mornilles et Noises.</p>
    <p><b>Presse.</b> Après chaque match, jusqu'à trois questions de médias différents (réglage ci-dessus). Le ton de ta réponse agit sur le moral du groupe ou d'un joueur, le président, les supporters, ta réputation et ta relation avec la presse ; les effets s'affichent après chaque réponse.</p>
    <p><b>Vestiaire.</b> Club › Vestiaire : ambiance (le moral, surtout celui des leaders), clans, joueurs qui veulent jouer plus, et jusqu'à trois binômes de mentorat (un joueur de 26 ans ou plus guide un jeune de 22 ans ou moins). Causeries avant le match et aux temps morts, conférence de presse après (La Gazette du sorcier) ; tout se désactive ici.</p>
    <p><b>Recrutement.</b> Les attributs des joueurs des autres clubs s'affichent en fourchettes tant que ton recruteur ne les connaît pas bien : suis-les, affronte leur équipe. Les offres partent par hibou et la réponse arrive la semaine suivante (contre-offres dans Mercato › Offres ; un autre club peut doubler). Clauses : pourcentage à la revente, clause libératoire, prime au vif d'or. Prêts jusqu'à la fin de la saison, avec ou sans option d'achat.</p>
    <p><b>Le président.</b> En début de saison, une réunion fixe l'objectif, la philosophie (jeunes, joueurs du pays, spectacle, comptes, vedette), l'enveloppe des transferts et la limite de la masse salariale. Tu peux viser plus haut, déplacer de l'argent entre transferts et salaires et demander un effort : trois propositions refusées et il impose son plan. Il juge chaque résultat selon la force de l'adversaire, et chaque engagement en fin de saison (confiance +5 ou −5).</p>
    <p><b>Entraînement.</b> Club › Zone technique › Entraînement : cinq séances par semaine (physique, vol, balle, tactique, mise en place, récupération), une intensité et un atelier par poste. Ton adjoint prépare tout par défaut (foncier puis pré-saison en août, récupération quand les titulaires sont fatigués) ; tu peux reprendre la main sur une semaine ou fixer ta semaine type. Le travail physique rend bien plus en août. Après le pic d'âge, le physique décline.</p>
    <p><b>Le calendrier.</b> Préparation et mercato d'été en août, championnat de septembre à avril, trêve des fêtes, mercato d'hiver en janvier. Trois trêves internationales (octobre, novembre, mars) : les championnats s'arrêtent une semaine et les sélections jouent un match amical contre une adversaire tirée au sort. L'été, une saison sur deux, la ${D.LDN.nom} réunit les 19 sélections : groupes, puis quarts, demies et finale ; les autres étés, une trêve en juin. Les clubs ne s'entraînent pas pendant ces semaines. Plus › Calendrier : vue par mois et vue de la saison.</p>
    <p><b>Ton profil.</b> Plus › Mon profil : apparence, âge, nationalité et huit attributs de manager (tactique, motivation, gestion humaine, jeunes, préparation physique, évaluation des talents, négociation, détermination). Répartis tes points avant ton premier match ; ensuite ils progressent en fin de saison selon ce que tu as fait. Le président te propose un contrat, prolongé si sa confiance tient.</p>
    <p><b>Clubs et records.</b> Plus › Clubs et joueurs : tous les effectifs (notes estimées), missions du recruteur sur un club ou une ligue. Salle des trophées : vitrine, records du club et du championnat (avec quelques records anciens à battre), palmarès.</p>
    <p><b>Mercato.</b> Ouvert pendant la préparation d'août et en janvier. Les agents libres signent à tout moment. Un club demande au moins la valeur du joueur (plus s'il est titulaire), le joueur un salaire selon son niveau, son ambition et la réputation de ton club. Mets des joueurs en vente pour recevoir des offres.</p>
    <p><b>Finances.</b> Billetterie et restauration à domicile, droits TV, sponsors et boutique chaque semaine ; salaires, entretien du stade et déplacements en face ; primes de classement en fin de saison. Les contrats qui arrivent à terme partent libres si tu ne les prolonges pas.</p>
    <p><b>Le domaine.</b> L'onglet Club ouvre la carte du domaine : touche un lieu (vestiaire, stade, tour du directeur, volière, zone technique, Gringotts, Poudlard, salle des trophées). Zone technique › Bâtiments : le plan et ses douze bâtiments (stade, Bazar, taverne, pensionnat des jeunes, infirmerie, aire d'envol, hangar à balais, salle commune, volière, cabinet de divination, salle des trophées, résidence). Chacun monte du niveau 1 au niveau 5 ; aux niveaux 3 et 5, tu choisis une amélioration parmi deux. Le stade s'agrandit tribune par tribune ; le Bazar vend les produits de ton choix au prix que tu fixes ; sponsor maillot et panneaux se négocient (Club › Partenaires) ; la Banque des Gobelins prête de l'argent (Finances).</p>
    <p><b>Supporters.</b> Ils suivent les résultats et le prix des places et des produits. Contents, ils remplissent le stade et rassurent le président ; fâchés, ils le font douter. Chaque été, des jeunes de 15-16 ans arrivent au pensionnat ; promus, ils jouent en équipe première.</p>
    <p><b>Carrière.</b> D'autres clubs peuvent te proposer leur banc. Si la confiance du président tombe à zéro, tu es licencié : avance le temps en attendant une offre. Avec une réputation de ${E.carriere.repSelection}, une fédération peut te confier sa sélection pour le Tournoi des Six Emblèmes, en plus de ton club.</p>
    <p><b>Entre appareils.</b> Avec la synchronisation de KiosK activée (page État), Plus › Sauvegardes envoie et récupère la partie, chiffrée.</p>
    <p class="petit mut">Clubs, joueurs, balais et Gallions sont inventés.</p>
  </div>`;
}

/* ---------- v84 : contrat, valeur et actions dans la fiche joueur ---------- */
function blocContrat(j, mon){
  const mg = M.manager, U = club(mg.club), v = C.valeur(M, j);
  if (mon && j.pret && j.pret.vers === U.id){
    const de = club(j.pret.de);
    return `<div class="carte" style="margin-top:10px"><h2>En prêt</h2><p style="margin:0 0 8px">Prêté par <b>${esc(de.nom)}</b> jusqu'à la fin de la saison. Tu payes ${Math.round(j.pret.part * 100)} % de son salaire (${eur(Math.round(j.pret.sal * j.pret.part))} / semaine).</p>
      ${j.pret.option ? `<button class="btn plein" data-act="leverOption" data-j="${j.id}">Lever l'option d'achat · ${eur(j.pret.option)}</button>` : '<p class="petit mut" style="margin:0">Pas d\'option d\'achat : il repartira en fin de saison.</p>'}</div>`;
  }
  if (mon){
    const vente = U.aVendre.includes(j.id), cl = j.contrat || {};
    const infos = [cl.clause ? `Clause libératoire : <b>${eur(cl.clause)}</b>` : '', cl.primeVif ? `Prime par vif d'or : <b>${eur(cl.primeVif)}</b>` : '', j.revente ? `${j.revente.pct} % à la revente pour ${esc(club(j.revente.club).nom)}` : ''].filter(Boolean);
    return `<div class="carte" style="margin-top:10px"><h2>Contrat</h2>${infos.length ? `<p class="petit" style="margin:0 0 8px">${infos.join(' · ')}</p>` : ''}
      <div class="stat" style="grid-template-columns:1fr auto">
        <span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(j.contrat.fin)}</b>
        <span style="text-align:left;font-weight:400">Salaire</span><b>${eur(j.contrat.sal)} / semaine</b>
        <span style="text-align:left;font-weight:400">Valeur estimée</span><b>${eur(v)}</b>
      </div>
      <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="prolonger" data-j="${j.id}">Prolonger</button><button class="btn sec" data-act="vendre" data-j="${j.id}">${vente ? 'Retirer de la vente' : 'Mettre en vente'}</button>${C.mercatoOuvert(QM.semaine(M)) ? `<button class="btn sec" data-act="preter" data-j="${j.id}">Prêter</button>` : ''}</div>
      <button class="btn sec plein" style="margin-top:8px;color:var(--mauvais)" data-act="liberer" data-j="${j.id}">Résilier le contrat (${eur(C.coutLiberation(M, j))})</button></div>`;
  }
  const suivi = U.suivi.includes(j.id), libre = !j.club;
  if (j.pret && j.pret.de === U.id) return `<div class="carte" style="margin-top:10px"><h2>Prêté par ton club</h2><p style="margin:0">Joue à ${esc(club(j.club).nom)} jusqu'à la fin de la saison, puis revient. ${esc(club(j.club).nom)} paye ${Math.round(j.pret.part * 100)} % de son salaire.</p></div>`;
  if (j.pret) return `<div class="carte" style="margin-top:10px"><h2>En prêt</h2><p style="margin:0">Prêté à ${esc(club(j.club).nom)} par ${esc(club(j.pret.de).nom)} jusqu'à la fin de la saison : pas de transfert possible d'ici là.</p></div>`;
  return `<div class="carte" style="margin-top:10px"><h2>${libre ? 'Agent libre' : 'Contrat'}</h2>
    <div class="stat" style="grid-template-columns:1fr auto">
      ${libre ? '' : `<span style="text-align:left;font-weight:400">Club</span><b>${esc(club(j.club).nom)}</b><span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(j.contrat.fin)}</b>
      <span style="text-align:left;font-weight:400">Salaire actuel</span><b>${eur(j.contrat.sal)} / semaine</b><span style="text-align:left;font-weight:400">Valeur estimée</span><b>${eur(v)}</b>`}
      <span style="text-align:left;font-weight:400">Salaire demandé chez toi (environ)</span><b>${eur(C.salaireDemande(j, U))} / semaine</b>
    </div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="suivre" data-j="${j.id}">${suivi ? 'Ne plus superviser' : 'Superviser'}</button><button class="btn" data-act="offre" data-j="${j.id}">${libre ? 'Proposer un contrat' : 'Faire une offre'}</button></div>
    ${!libre && !C.mercatoOuvert(QM.semaine(M)) ? '<p class="petit mut" style="margin:8px 0 0">Mercato fermé : les transferts reprennent en août et en janvier.</p>' : ''}</div>`;
}

/* ---------- v84 : onglet Club ---------- */
const MERC = Object.assign({onglet:'recherche', poste:'tous', age:99, ageMin:15, moyens:false, q:'', valMax:0, salMax:0, noteMin:0, nat:'', fin:false, attr:'', attrMin:12, tri:'note'}, LS.lire('qm27:mercato', {}));   // v91 : recherche et filtres
const garderMerc = () => { const {onglet, q, vu, ...f} = MERC; void onglet; void q; void vu; LS.ecrire('qm27:mercato', f); };
const nbFiltres = () => [MERC.poste !== 'tous', MERC.age < 99 || MERC.ageMin > 15, MERC.valMax, MERC.salMax, MERC.noteMin, MERC.nat, MERC.fin, MERC.moyens, MERC.attr].filter(Boolean).length;
function ligneMercato(j, d){
  const p = MERC.poste !== 'tous' && MERC.poste !== 'bless' ? MERC.poste : j.poste, nv = noteVue(j, p), n = nv.mid;
  return `<button class="el" data-act="joueur" data-j="${j.id}">${j.club ? blason(j.club, 'p') : '<span class="blason nat p" aria-hidden="true" style="font-size:.5rem;font-weight:800;color:var(--ink-soft)">LIBRE</span>'}${posteB(j.poste)}
    <div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${d || (j.club ? esc(club(j.club).sigle) + ' · ' + eur(C.valeur(M, j)) : 'libre · demande ' + eur(C.salaireDemande(j, club(M.manager.club))) + '/sem.')}</span></div>
    <span class="etoiles petit" aria-label="potentiel">${'★'.repeat(C.potentielEstime(M, j))}</span><span class="note ${classeNote(n)}${nv.exact ? '' : ' flou'}">${nv.txt}</span></button>`;
}
function vueMercato(){
  const U = club(M.manager.club), S = QM.semaine(M), ouvert = C.mercatoOuvert(S), fen = C.prochaineFenetre(M);
  if (M.offres.length && MERC.onglet === 'recherche' && !MERC.vu){ MERC.onglet = 'offres'; MERC.vu = 1; }
  const O = [['offres', `Offres${M.offres.length ? ' (' + M.offres.length + ')' : ''}`], ['recherche', 'Recherche'], ['libres', 'Agents libres'], ['suivis', 'Suivis'], ['ventes', 'Mes ventes'], ['actus', 'Transferts']];
  let corps = '';
  const filtres = () => { const pills = filtresActifs();
    return `<div class="recherche"><input class="champ" type="search" id="mercQ" placeholder="Chercher un nom…" value="${esc(MERC.q)}" autocomplete="off" aria-label="Chercher un joueur par son nom"><button class="btn sec" data-act="mercFiltres">Filtres${nbFiltres() ? ' · ' + nbFiltres() : ''}</button></div>
    ${pills.length ? `<div class="pills">${pills.map(([k, t]) => `<button class="pill" data-act="mercRetire" data-k="${k}" aria-label="Retirer le filtre ${esc(t)}">${esc(t)} ✕</button>`).join('')}</div>` : ''}
    <div class="tri-l"><span class="petit mut">Trier par</span>${[['note', 'Note'], ['pot', 'Potentiel'], ['valeur', 'Valeur'], ['age', 'Âge']].map(([k, n]) => `<button class="chip mini ${MERC.tri === k ? 'on' : ''}" data-act="mercTri" data-t="${k}">${n}</button>`).join('')}</div>`; };
  const filtrer = L => filtrerMercato(L, U);
  if (MERC.onglet === 'offres'){
    const h = HH().etat(M), vols = h.hiboux.map(o => { const j = M.joueurs[o.j]; return j ? `<div class="el">${avatarDe(j, '', j.club || null).replace('class="av ', 'class="av mini ')}<div class="t"><b>🦉 ${esc(nomJ(j))}</b><span>${o.type === 'pret' ? `prêt, ${Math.round(o.part * 100)} % du salaire${o.option ? ', avec option' : ''}` : `${eur(o.montant)} · ${eur(o.sal)} / sem.`} · réponse la semaine prochaine</span></div></div>` : ''; }).join('');
    const contres = h.contres.map(o => { const j = M.joueurs[o.j]; if (!j) return ''; const de = j.club ? club(j.club) : null;
      return `<div class="carte" style="border-color:var(--or)"><div class="ligne">${de ? blason(de.id) : ''}<div style="flex:1;min-width:0"><b>Contre-offre pour ${esc(nomJ(j))}</b><div class="petit mut">${o.type === 'pret' ? 'prêt' : `${eur(o.montant)}, ${eur(o.sal)} / sem., ${o.ans} saison${o.ans > 1 ? 's' : ''}`}</div></div></div>
        <div class="btns" style="margin-top:10px"><button class="btn sec" data-act="refuserContre" data-c="${o.id}">Laisser tomber</button><button class="btn" data-act="accepterContre" data-c="${o.id}">Accepter</button></div></div>`; }).join('');
    corps = (vols ? `<div class="carte"><h2>Hiboux en vol</h2><div class="liste">${vols}</div></div>` : '') + contres;
    corps += M.offres.length ? M.offres.map(o => { const j = M.joueurs[o.j], c = club(o.club);
      return `<div class="carte"><div class="ligne">${blason(c.id)}<div style="flex:1;min-width:0"><b>${esc(c.nom)}</b><div class="petit mut">veut ${esc(nomJ(j))} (${QM.note(j)}) · valeur ${eur(C.valeur(M, j))}</div></div><b>${eur(o.montant)}</b></div>
        <p class="petit mut" style="margin:6px 0 10px">Offre valable jusqu'au ${fmtDate((M.calendrier[o.expire] || QM.semaine(M)).date)}.</p>
        <div class="btns"><button class="btn sec" data-act="refuserOffre" data-o="${o.id}">Refuser</button><button class="btn" data-act="accepterOffre" data-o="${o.id}">Accepter</button></div></div>`; }).join('')
      : (vols || contres ? '' : '<div class="carte"><p class="mut" style="margin:0">Aucune offre pour l\'instant. Mets des joueurs en vente (fiche du joueur) pour attirer les acheteurs pendant le mercato.</p></div>');
  } else if (MERC.onglet === 'recherche'){
    corps = `${filtres()}<div id="mercListe">${listeMercato('recherche', U)}</div><p class="petit mut">Les 60 premiers selon le tri. Notes : estimation de ton recruteur (fourchette tant qu'il ne connaît pas bien le joueur). ★ : potentiel estimé.</p>`;
  } else if (MERC.onglet === 'libres'){
    corps = `${filtres()}<div id="mercListe">${listeMercato('libres', U)}</div><p class="petit mut">Les agents libres signent à tout moment, sans indemnité de transfert.</p>`;
  } else if (MERC.onglet === 'suivis'){
    const L = U.suivi.map(id => M.joueurs[id]).filter(j => j && j.club !== U.id);
    corps = `<div class="carte"><div class="liste">${L.map(j => ligneMercato(j)).join('') || '<p class="mut">Aucun joueur suivi : touche « Suivre » dans la fiche d\'un joueur.</p>'}</div></div>`;
  } else if (MERC.onglet === 'ventes'){
    const L = U.aVendre.map(id => M.joueurs[id]).filter(Boolean);
    corps = `<div class="carte"><div class="liste">${L.map(j => ligneMercato(j, 'valeur ' + eur(C.valeur(M, j)) + ' · ' + eur(j.contrat.sal) + '/sem.')).join('') || '<p class="mut">Aucun joueur en vente. Ouvre la fiche d\'un joueur de ton effectif et touche « Mettre en vente ».</p>'}</div></div>`;
  } else {
    corps = `<div class="carte"><div class="liste">${M.transferts.slice(0, 40).map(t => `<div class="el">${t.vers ? blason(t.vers, 'p') : ''}<div class="t"><b>${esc(t.nom)}</b><span>${t.de ? esc(club(t.de).nom) : 'Agent libre'} → ${esc(club(t.vers).nom)} · ${fmtDate(t.d)}</span></div><span class="d">${t.montant ? eur(t.montant) : 'libre'}</span></div>`).join('') || '<p class="mut">Pas encore de transfert.</p>'}</div></div>`;
  }
  VUE.innerHTML = `<div><h1 class="grand">Mercato</h1><p class="sous">${ouvert ? '<b style="color:var(--bon)">Ouvert</b>' : `<b>Fermé</b>${fen ? ' · réouverture le ' + fmtDate(fen.date) : ''}`} · solde ${eur(U.budget)} · ${U.effectif.length}/${E.eco.effectifMax} joueurs</p></div>
  <div class="onglets" role="tablist">${O.map(([k, n]) => `<button role="tab" class="${MERC.onglet === k ? 'on' : ''}" aria-selected="${MERC.onglet === k}" data-act="merc" data-o="${k}">${n}</button>`).join('')}</div>
  ${corps}`;
  const q = $('#mercQ'); if (q) q.addEventListener('input', e => { MERC.q = e.target.value; const z = $('#mercListe'); if (z) z.innerHTML = listeMercato(MERC.onglet, club(M.manager.club)); });
  void filtrer;
}
const sansAccent = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filtrerMercato(L, U){
  const place = U.masseMax - C.masse(M, U), q = sansAccent(MERC.q.trim()), ia = MERC.attr ? IDX(MERC.attr) : -1;
  const p = j => MERC.poste === 'tous' ? j.poste : MERC.poste;
  return L.filter(j => j && (MERC.poste === 'tous' || j.poste === MERC.poste) && j.age <= MERC.age && j.age >= MERC.ageMin
      && (!q || sansAccent(j.p + ' ' + j.n).includes(q))
      && (!MERC.moyens || ((j.club ? C.prixClub(M, j) : 0) <= U.budget && C.salaireDemande(j, U) <= place))
      && (!MERC.valMax || C.valeur(M, j) <= MERC.valMax) && (!MERC.salMax || (j.contrat ? j.contrat.sal : 0) <= MERC.salMax)
      && (!MERC.noteMin || noteVue(j, p(j)).mid >= MERC.noteMin) && (!MERC.nat || j.nat === MERC.nat)
      && (!MERC.fin || (j.contrat && j.contrat.fin <= M.saison)) && (ia < 0 || valVue(j, j.a[ia], MERC.attr).mid >= MERC.attrMin))
    .map(j => ({j, k:MERC.tri === 'pot' ? C.potentielEstime(M, j) * 100 + noteVue(j, p(j)).mid : MERC.tri === 'valeur' ? C.valeur(M, j) : MERC.tri === 'age' ? -j.age : noteVue(j, p(j)).mid}))
    .sort((a, b) => b.k - a.k).map(x => x.j);
}
function listeMercato(onglet, U){
  const src = onglet === 'libres' ? M.libres.map(id => M.joueurs[id]) : Object.values(M.joueurs).filter(j => j.club && j.club !== U.id);
  const L = filtrerMercato(src, U), n = L.length;
  return `<p class="petit mut" style="margin:0 0 6px">${n} joueur${n > 1 ? 's' : ''}</p><div class="carte"><div class="liste">${L.slice(0, 60).map(j => ligneMercato(j)).join('') || '<p class="mut">Personne avec ces critères.</p>'}</div></div>`;
}
function filtresActifs(){
  const R = [];
  if (MERC.poste !== 'tous') R.push(['poste', D.POSTES[MERC.poste].pl]);
  if (MERC.age < 99 || MERC.ageMin > 15) R.push(['age', `${MERC.ageMin}-${MERC.age < 99 ? MERC.age : '…'} ans`]);
  if (MERC.valMax) R.push(['valMax', `valeur ≤ ${eur(MERC.valMax)}`]);
  if (MERC.salMax) R.push(['salMax', `salaire ≤ ${eur(MERC.salMax)}`]);
  if (MERC.noteMin) R.push(['noteMin', `note ≥ ${MERC.noteMin}`]);
  if (MERC.nat) R.push(['nat', nat(MERC.nat).nom]);
  if (MERC.fin) R.push(['fin', 'fin de contrat']);
  if (MERC.moyens) R.push(['moyens', 'dans mes moyens']);
  if (MERC.attr) R.push(['attr', `${(D.ATTRS.find(a => a[0] === MERC.attr) || [])[1]} ≥ ${MERC.attrMin}`]);
  return R;
}
function ficheFiltres(){
  const sel = (k, L, v) => `<select class="champ" data-chg="mercF" data-k="${k}">${L.map(([x, n]) => `<option value="${x}" ${String(v) === String(x) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const ages = []; for (let a = 15; a <= 40; a++) ages.push([a, a + ' ans']);
  feuille(`${teteF('Filtres', 'Recherche et agents libres')}
    <h4 class="sous-t">Poste</h4><div class="chips">${[['tous', 'Tous'], ['P', 'Poursuiveurs'], ['B', 'Batteurs'], ['A', 'Attrapeurs'], ['G', 'Gardiens']].map(([k, n]) => `<button class="chip ${MERC.poste === k ? 'on' : ''}" data-act="mercPoste" data-p="${k}">${n}</button>`).join('')}</div>
    <div class="grille-f">
      <label><span>Âge minimum</span>${sel('ageMin', ages, MERC.ageMin)}</label><label><span>Âge maximum</span>${sel('age', [...ages.slice(1), [99, 'Sans limite']], MERC.age)}</label>
      <label><span>Valeur maximum</span>${sel('valMax', [[0, 'Toutes'], ...[250000, 500000, 1000000, 2000000, 5000000].map(v => [v, eurT(v).replace(/ G$/, ' Gallions')])], MERC.valMax)}</label>
      <label><span>Salaire actuel maximum</span>${sel('salMax', [[0, 'Tous'], ...[2000, 5000, 10000, 20000].map(v => [v, eurT(v).replace(/ G$/, ' Gallions') + ' / sem.'])], MERC.salMax)}</label>
      <label><span>Note estimée minimum</span>${sel('noteMin', [[0, 'Toutes'], [40, '40'], [50, '50'], [55, '55'], [60, '60'], [65, '65'], [70, '70']], MERC.noteMin)}</label>
      <label><span>Nationalité</span>${sel('nat', [['', 'Toutes'], ...D.SELECTIONS.map(n => [n, nat(n).nom]).sort((a, b) => a[1].localeCompare(b[1], 'fr'))], MERC.nat)}</label>
      <label><span>Caractéristique</span>${sel('attr', [['', 'Aucune'], ...D.ATTRS.map(a => [a[0], a[1]])], MERC.attr)}</label>
      <label><span>Au moins</span>${sel('attrMin', [8, 10, 12, 13, 14, 15, 16, 17, 18].map(x => [x, x + ' / 20']), MERC.attrMin)}</label>
    </div>
    <label class="el"><div class="t"><b>Fin de contrat cette saison</b><span>Ils partiront libres l'été prochain</span></div><input type="checkbox" data-chg="mercF" data-k="fin" ${MERC.fin ? 'checked' : ''} style="width:22px;height:22px"></label>
    <label class="el"><div class="t"><b>Dans mes moyens</b><span>Prix et salaire compatibles avec ton budget</span></div><input type="checkbox" data-chg="mercF" data-k="moyens" ${MERC.moyens ? 'checked' : ''} style="width:22px;height:22px"></label>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="mercRaz">Tout effacer</button><button class="btn" data-act="mercVoir">Voir les joueurs</button></div>`);
}
/* offre de transfert ou de prêt (par hibou), contrat d'agent libre, prolongation ; v90 : clauses */
let OFFRE = null;
function ficheOffre(jid, mode){
  const j = M.joueurs[jid], U = club(M.manager.club);
  if (!OFFRE || OFFRE.j !== jid || OFFRE.mode !== mode){
    const libre = !j.club;
    OFFRE = {j:jid, mode, type:'achat', montant:mode === 'transfert' && !libre ? C.valeur(M, j) : 0, sal:mode === 'prolonger' ? j.contrat.sal : C.salaireDemande(j, U), ans:j.age >= 32 ? 1 : 3, pct:0, clause:0, primeVif:false, part:0.75, option:false, msg:''};
  }
  const o = OFFRE, libre = !j.club, place = U.masseMax - C.masse(M, U) + (mode === 'prolonger' ? j.contrat.sal : 0), pret = o.type === 'pret';
  const pas = (k, lib) => `<div class="cons"><b>${lib}</b><div class="ligne"><button class="btn sec" data-act="pasOffre" data-k="${k}" data-d="-1" aria-label="Moins">−</button><b style="flex:1;text-align:center;font-size:1.1rem">${eur(o[k])}${k === 'sal' ? ' / sem.' : ''}</b><button class="btn sec" data-act="pasOffre" data-k="${k}" data-d="1" aria-label="Plus">+</button></div></div>`;
  const seg = (lib, act, L, v, aide) => `<div class="cons"><b>${lib}</b><div class="seg">${L.map(([x, n]) => `<button data-act="${act}" data-v="${x}" class="${String(v) === String(x) ? 'on' : ''}">${n}</button>`).join('')}</div>${aide ? `<span>${aide}</span>` : ''}</div>`;
  const val = C.valeur(M, j), optMontant = Math.round(val * 1.1 / 5000) * 5000;
  feuille(`${teteF(mode === 'prolonger' ? 'Prolonger ' + esc(nomJ(j)) : libre ? 'Contrat pour ' + esc(nomJ(j)) : (pret ? 'Prêt de ' : 'Offre pour ') + esc(nomJ(j)), libre ? 'Agent libre' : mode === 'prolonger' ? `Contrat actuel : fin ${lab(j.contrat.fin)}, ${eur(j.contrat.sal)} / sem.` : `${esc(club(j.club).nom)} · valeur estimée ${eur(val)}`)}
    ${mode === 'transfert' && !libre ? seg('Type', 'offreType', [['achat', 'Achat'], ['pret', 'Prêt (jusqu\'à la fin de la saison)']], o.type) : ''}
    ${pret ? `${seg('Part du salaire que tu payes', 'offrePart', [[0.5, '50 %'], [0.75, '75 %'], [1, '100 %']], o.part, `Soit ${eur(Math.round(j.contrat.sal * o.part))} par semaine. Un club prête rarement un titulaire, et veut au moins 75 % pour un joueur important.`)}
      ${seg('Option d\'achat', 'offreOption', [['false', 'Sans'], ['true', 'Avec · ' + eur(optMontant)]], o.option, 'Tu pourras l\'acheter à ce prix avant la fin du prêt.')}`
    : `${mode === 'transfert' && !libre ? pas('montant', 'Indemnité de transfert') : ''}
      ${pas('sal', 'Salaire proposé')}
      <div class="cons"><b>Durée</b><div class="seg">${[1, 2, 3, 4].map(n => `<button data-act="ansOffre" data-v="${n}" class="${o.ans === n ? 'on' : ''}">${n} saison${n > 1 ? 's' : ''}</button>`).join('')}</div></div>
      ${mode !== 'prolonger' ? `<details class="clauses"${o.pct || o.clause || o.primeVif ? ' open' : ''}><summary>Clauses du contrat</summary>
        ${!libre ? seg('Pourcentage à la revente', 'offrePct', [[0, 'Aucun'], [10, '10 %'], [20, '20 %']], o.pct, 'Le club vendeur touchera ce pourcentage si tu revends le joueur ; en échange, il baisse son prix.') : ''}
        ${seg('Clause libératoire', 'offreClause', [[0, 'Aucune'], [2, '2 × la valeur'], [3, '3 × la valeur']], o.clause, 'Le joueur demande 5 % de salaire en moins ; un club qui paye la clause l\'emmène sans ton accord.')}
        ${j.poste === 'A' ? seg('Prime au vif d\'or', 'offrePrime', [['false', 'Non'], ['true', 'Oui']], o.primeVif, `Salaire demandé 8 % plus bas ; prime de deux semaines de salaire à chaque vif d'or attrapé.`) : ''}
      </details>` : ''}`}
    <p class="petit mut" style="margin:8px 0">Solde ${eur(U.budget)} · place dans la masse salariale : ${eur(place)} / sem.${mode !== 'prolonger' && !libre ? ' · <b>Réponse par hibou la semaine prochaine.</b>' : ''}</p>
    ${o.msg ? `<p style="margin:0 0 10px;font-weight:600;color:var(--moyen)">${pieces(esc(o.msg))}</p>` : ''}
    <button class="btn plein" data-act="envoyerOffre">${mode === 'prolonger' ? 'Proposer la prolongation' : libre ? 'Proposer le contrat' : 'Envoyer le hibou'}</button>`);
}
/* v117 : les finances en morceaux, partagés par l'écran et par la banque illustrée (coffre, plan du stade, gobelin) */
const Z_ = () => window.QMU;
const totF = o => Object.values(o).reduce((t, x) => t + x, 0);
function finSolde(c){ const ms = C.masse(M, c); return `<div class="carte"><h2>Solde</h2><div style="font-size:1.9rem;font-weight:800;letter-spacing:-.03em;color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</div>
    <div style="margin:12px 0 4px" class="ligne"><span style="flex:1">Masse salariale (joueurs et staff)</span><b>${eur(ms)} / ${eur(c.masseMax)}</b></div>
    <div class="jauge" role="meter" aria-valuenow="${Math.round(ms / c.masseMax * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Masse salariale"><i style="width:${Math.min(100, ms / c.masseMax * 100)}%;background:${ms > c.masseMax ? 'var(--mauvais)' : 'var(--accent)'}"></i></div>
    <p class="petit mut" style="margin:8px 0 0">Limite fixée par le président : au-delà, il refuse les nouveaux contrats.</p></div>`; }
function finHisto(c){ const h = c.fin.hist, max = Math.max(1, ...h.map(x => Math.abs(x.net))); return `<div class="carte"><h2>16 dernières semaines</h2><div class="histo">${h.map(x => `<div title="${fmtDate(x.d)} : ${eurT(x.net)}"><i style="height:${Math.max(3, Math.abs(x.net) / max * 100)}%;background:${x.net < 0 ? 'var(--mauvais)' : 'var(--bon)'}"></i></div>`).join('') || '<p class="mut">Pas encore de semaine jouée.</p>'}</div></div>`; }
function finBillet(c){ const aff = Math.round(c.stade * C.remplissage(M, c, {rep:60})); return `<div class="carte"><h2>Billetterie</h2><div class="ligne"><button class="btn sec" data-act="prix" data-d="-1" aria-label="Baisser le prix">−</button><b style="flex:1;text-align:center;font-size:1.15rem">${eur(c.prix)} la place</b><button class="btn sec" data-act="prix" data-d="1" aria-label="Monter le prix">+</button></div>
    <p class="petit mut" style="margin:8px 0 0">Environ ${aff.toLocaleString('fr-FR')} spectateurs (${Math.round(aff / c.stade * 100)} %) contre un adversaire moyen, soit ${eur(aff * c.prix)} par match à domicile. Prix conseillé : ${eur(C.prixRef(c))}. Plus cher : moins de monde ; les résultats remplissent le stade.</p></div>`; }
function finRecDep(c){ const F = c.fin.saison, P = c.fin.derniere, tot = totF;
  const ligne = (n, a, b) => `<tr><td style="text-align:left">${n}</td><td>${eur(a)}</td>${P ? `<td class="tab-cache mut">${eur(b || 0)}</td>` : ''}</tr>`;
  return `<div class="carte"><h2>Recettes ${P ? '<span class="mut petit">saison · précédente</span>' : ''}</h2><table class="cl"><tbody>${Object.keys(C.NOMS_REC).map(k => ligne(C.NOMS_REC[k], F.rec[k] || 0, P && (P.rec[k] || 0))).join('')}<tr><td style="text-align:left"><b>Total</b></td><td><b>${eur(tot(F.rec))}</b></td>${P ? `<td class="tab-cache mut">${eur(tot(P.rec))}</td>` : ''}</tr></tbody></table></div>
  <div class="carte"><h2>Dépenses</h2><table class="cl"><tbody>${Object.keys(C.NOMS_DEP).map(k => ligne(C.NOMS_DEP[k], F.dep[k] || 0, P && (P.dep[k] || 0))).join('')}<tr><td style="text-align:left"><b>Total</b></td><td><b>${eur(tot(F.dep))}</b></td>${P ? `<td class="tab-cache mut">${eur(tot(P.dep))}</td>` : ''}</tr></tbody></table></div>`; }
function blocBalais(c){ const balai = D.BALAIS.find(b => b.id === c.balai) || D.BALAIS[0]; return `<div class="carte"><h2>Balais <span class="mut petit">${esc(balai.nom)}</span></h2>
    <div class="ligne" style="margin-bottom:4px"><span style="flex:1">Usure</span><b>${Math.round(c.usure)} %</b></div><div class="jauge"><i style="width:${c.usure}%"></i></div>
    <p class="petit mut" style="margin:8px 0">Des balais usés font perdre un peu de vitesse et de maniabilité. Un jeu complet pour l'effectif :</p>
    <div class="liste">${D.BALAIS.map(b => `<div class="el"><div class="t"><b>${esc(b.nom)}${b.id === c.balai ? ' <span class="badge tit">actuels</span>' : ''}</b><span>vitesse ${b.vit} · maniabilité ${b.man} · stabilité ${b.sta}</span></div><button class="btn sec" data-act="balais" data-b="${b.id}">${eur(b.prix * 1000)}</button></div>`).join('')}</div></div>
  </div>`; }
function vueFinances(){
  const c = club(M.manager.club), scene = Z_() && Z_().sceneDispo('finances');   // v117 : la banque illustrée, les cartes passent dessous
  VUE.innerHTML = `<div><h1 class="grand">Finances et banque</h1><p class="sous">Saison ${lab(M.saison)} · Gallions fictifs</p></div>
  ${scene ? Z_().sceneHTML('finances') + '<details class="sc-detail"><summary>Toutes les finances en détail</summary>' : ''}
  <div class="cols"><div>
  ${finSolde(c)}
  ${finHisto(c)}
  ${finBillet(c)}
  </div><div>
  ${finRecDep(c)}
  ${banqueHTML(B.assurer(M))}
  <div class="btns" style="margin-bottom:12px"><button class="btn sec" data-act="vue" data-v="partenaires">Partenaires</button><button class="btn sec" data-act="vue" data-v="boutique">Bazar</button><button class="btn sec" data-act="vue" data-v="stade">Stade</button></div>
  <p class="petit mut" style="margin:0 0 12px">Les balais se gèrent désormais dans Vestiaire et mentorat.</p>
  </div></div>${scene ? '</details>' : ''}`;
}
function vueStaff(){
  const c = club(M.manager.club);
  VUE.innerHTML = `<div><h1 class="grand">Staff</h1><p class="sous">Toucher un poste pour voir les candidats libres. Remplacer coûte 8 semaines de salaire de l'ancien.</p></div>
  <div class="carte"><div class="liste">${D.STAFF.map(([k, nom]) => { const x = c.staff[k];
    return `<button class="el" data-act="ficheStaff" data-r="${k}"><span class="avp">${avatarDe(x, '', c.id)}</span><span class="note ${x.note >= 15 ? 'n4' : x.note >= 10 ? 'n3' : x.note >= 6 ? 'n2' : 'n1'}">${x.note}</span><div class="t"><b>${esc(nom)}</b><span>${flag(x.nat)} ${esc(x.p + ' ' + x.n)} · ${eur(x.sal)}/sem. · ${esc(D.EFFETS_STAFF[k])}</span></div><span class="mut">›</span></button>`; }).join('')}</div></div>`;
}
function ficheStaff(role){
  const c = club(M.manager.club), x = c.staff[role], L = M.staffLibres.filter(s => s.role === role).sort((a, b) => b.note - a.note);
  feuille(`${teteF(esc((D.STAFF.find(s => s[0] === role) || [])[1]), esc(D.EFFETS_STAFF[role]))}
    <div class="carte"><div class="el"><span class="note n3">${x.note}</span><div class="t"><b>${esc(x.p + ' ' + x.n)} (en poste)</b><span>${eur(x.sal)} / semaine · indemnité de départ ${eur(x.sal * 8)}</span></div></div></div>
    <div class="carte" style="margin-top:10px"><h2>Candidats libres</h2><div class="liste">${L.map(s => `<div class="el"><span class="note ${s.note >= 15 ? 'n4' : s.note >= 10 ? 'n3' : 'n2'}">${s.note}</span><div class="t"><b>${flag(s.nat)} ${esc(s.p + ' ' + s.n)}</b><span>${eur(s.sal)} / semaine</span></div><button class="btn sec" data-act="embaucher" data-s="${s.id}">Embaucher</button></div>`).join('') || '<p class="mut">Personne de libre pour ce poste.</p>'}</div></div>`);
}

/* ---------- v85 : centre de formation, stade, carrière, sélection ---------- */
function blocJeune(j){
  return `<div class="carte" style="margin-top:10px"><h2>Centre de formation</h2>
    <p class="petit mut" style="margin:0 0 10px">${j.age} ans. À 19 ans, il passe pro s'il a le niveau, sinon il quitte le centre. Promu, il signe 3 saisons pour un petit salaire.</p>
    <div class="btns"><button class="btn sec" data-act="libererJeune" data-j="${j.id}" style="color:var(--mauvais)">Libérer</button><button class="btn" data-act="promouvoir" data-j="${j.id}">Promouvoir en équipe première</button></div></div>`;
}
function vueFormation(){
  const c = club(M.manager.club), L = (c.academie || []).map(id => M.joueurs[id]).filter(Boolean).sort((a, b) => C.potentielEstime(M, b) - C.potentielEstime(M, a) || QM.note(b) - QM.note(a));
  const resp = c.staff.formation;
  VUE.innerHTML = `<div><h1 class="grand">Centre de formation</h1><p class="sous">Niveau ${C.niv(c, 'formation')} · responsable : ${esc(resp.p + ' ' + resp.n)} (${resp.note}/20) · ${L.length}/${E.carriere.academieMax} jeunes</p></div>
  <div class="carte"><div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${D.POSTES[j.poste].nom.toLowerCase()}</span></div><span class="etoiles" aria-label="potentiel">${'★'.repeat(C.potentielEstime(M, j))}${'☆'.repeat(5 - C.potentielEstime(M, j))}</span><span class="note ${classeNote(QM.note(j))}">${QM.note(j)}</span></button>`).join('') || '<p class="mut">Le centre est vide : la prochaine promotion arrive l\'été.</p>'}</div></div>
  <div class="carte aide"><h2>Comment ça marche</h2><p>Chaque été, ${1 + C.niv(c, 'formation')} jeunes de 15-16 ans arrivent. Leur potentiel dépend du niveau du centre (Club › Stade) et du responsable de la formation (Club › Staff). Ils s'entraînent chaque semaine ; promus, ils jouent et progressent plus vite.</p></div>`;
}
/* ---------- v88 : le domaine du club (qm27-domaine.js : window.QMB) ---------- */
const B = window.QMB;
const POS_DOM = {infirmerie:[62, 56], salle:[140, 50], bureau:[210, 44], formation:[280, 50], voliere:[358, 56], divination:[52, 166], aire:[368, 166],
  trophees:[62, 272], residence:[140, 280], buvettes:[210, 288], boutique:[280, 280], hangar:[358, 272]};
const VUE_BAT = {stade:'stade', boutique:'boutique', formation:'formation', entrainement:'entrainement', balais:'vestiaire', tactique:'tactique', mercato:'mercato', trophees:'trophees'};
const nomBat = k => k === 'bureau' ? 'Bureau du président' : (B.BAT[k] || [])[1] || k;
const pips = n => `<span class="pips" aria-label="niveau ${n} sur 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const coutEntretien = (c, k) => ((E.inst[k] || E.bat[k] || {}).entretien || 0) * C.niv(c, k);
function stadePlan(c){
  const lv = C.niv(c, 'tribunes'), [c1, c2] = c.couleurs, toit = lv >= 3;
  return `<g class="dbat" data-act="batiment" data-b="tribunes" role="button" tabindex="0" aria-label="Stade, niveau ${lv}">
    <image href="${V.IMAGES}lieux/stade.webp" x="125" y="78" width="170" height="170" preserveAspectRatio="xMidYMid meet"/>   <!-- v93 : illustration -->
    ${B.a(c, 'dragon') ? '<path d="M296 196l8-10 4 4 6-3-2 7 5 4h-21z" fill="#8b8f96" stroke="rgba(0,0,0,.4)" stroke-width=".6"/>' : ''}</g>
    <text x="210" y="246" text-anchor="middle" class="dlab">Stade · ${c.stade.toLocaleString('fr-FR')} places</text>`;
}
function batPlan(c, k){
  const [x, y] = POS_DOM[k], s = 0.95, n = k === 'bureau' ? 0 : C.niv(c, k), tr = c.travaux.find(t => t.type === k), att = k !== 'bureau' && B.amelEnAttente(c, k);
  return `<g class="dbat" data-act="batiment" data-b="${k}" role="button" tabindex="0" aria-label="${esc(nomBat(k))}${n ? ', niveau ' + n : ''}${tr ? ', travaux en cours' : ''}${att ? ', amélioration à choisir' : ''}">
    <g transform="translate(${x - 32 * s} ${y - 40 * s}) scale(${s})">${V.batiment(k, c.couleurs[0], c.couleurs[1])}
      ${tr ? '<g class="echaf"><path d="M6 58V22h52v36M6 34h52M6 46h52M6 22l52 36M58 22L6 58" fill="none" stroke="#c98a2b" stroke-width="1.4"/></g>' : ''}</g>
    ${att ? `<circle cx="${x + 20}" cy="${y - 28}" r="7" fill="var(--or)" stroke="#fff" stroke-width="1.5"/><text x="${x + 20}" y="${y - 24.5}" text-anchor="middle" font-size="10" font-weight="800" fill="#16202c">!</text>` : ''}
    <text x="${x}" y="${y + 14}" text-anchor="middle" class="dlab">${esc(nomBat(k).replace('Pensionnat des jeunes ailes', 'Pensionnat').replace('Cabinet de divination', 'Divination').replace('Résidence des joueurs', 'Résidence').replace('Salle des trophées', 'Trophées').replace('Bureau du président', 'Président').replace('Volière à hiboux', 'Volière').replace('Hangar à balais', 'Hangar').replace('Taverne du stade', 'Taverne').replace('Bazar du club', 'Bazar'))}</text>
    ${n ? `<g transform="translate(${x - 14} ${y + 18})">${[0, 1, 2, 3, 4].map(i => `<rect x="${i * 6}" y="0" width="4.4" height="3" rx="1" fill="${i < n ? 'var(--or)' : 'var(--line)'}"/>`).join('')}</g>` : ''}</g>`;
}
/* v111 : la carte illustrée du domaine (images/qm27/domaine/), 12 clairières de 3 × 4 ; le château est le bureau du président.
   Repère de l'image (1024 × 1536) : [x0, x1, y0, y1] de chaque clairière */
const CLAIRIERES = {voliere:[126, 346, 509, 619], salle:[399, 618, 508, 618], divination:[670, 889, 509, 618],
  infirmerie:[101, 340, 660, 793], tribunes:[397, 628, 661, 793], aire:[683, 914, 660, 792],
  formation:[76, 333, 839, 984], buvettes:[394, 637, 839, 983], boutique:[696, 945, 838, 984],
  residence:[52, 328, 1034, 1211], hangar:[390, 644, 1033, 1208], trophees:[706, 972, 1034, 1208]};
const COURT_BAT = {formation:'Pensionnat', divination:'Divination', residence:'Résidence', trophees:'Trophées', tribunes:'Stade', buvettes:'Taverne', boutique:'Bazar', infirmerie:'Infirmerie', aire:'Aire d\'envol', hangar:'Hangar', salle:'Salle', voliere:'Volière'};
function planIllustre(c){
  /* deux passes : les bâtiments (rangée du haut d'abord), puis toutes les plaques par-dessus, jamais cachées par un voisin */
  const I = V.IMAGES, L = [['bureau', 595, 292, 300, 'Bureau du président', 0, null, false],
    ...Object.entries(CLAIRIERES).map(([k, [x0, x1, y0, y1]]) => [k, (x0 + x1) / 2, y1 - 8, Math.min(230, (x1 - x0) * 0.86), COURT_BAT[k] || nomBat(k), C.niv(c, k), c.travaux.find(t => t.type === k || (k === 'tribunes' && t.type === 'stade')), B.amelEnAttente(c, k)])];
  const aria = (k, n, tr, att) => `${esc(nomBat(k))}${n ? ', niveau ' + n : ''}${tr ? ', travaux en cours' : ''}${att ? ', amélioration à choisir' : ''}`;
  const bats = L.map(([k, x, y, w, nom, n, tr, att]) => `<g class="dbat d2" data-act="batiment" data-b="${k}" role="button" tabindex="0" aria-label="${aria(k, n, tr, att)}">
      <rect x="${x - w / 2}" y="${y - w}" width="${w}" height="${w + 10}" fill="transparent"/>
      ${k !== 'bureau' ? `<image href="${I}${V.BAT_IMG[k]}.webp" x="${x - w / 2}" y="${y - w}" width="${w}" height="${w}" preserveAspectRatio="xMidYMax meet" class="bat-img"/>` : ''}
      ${tr ? `<text x="${x + w * 0.38}" y="${y - w * 0.6}" text-anchor="middle" class="d2-chantier">🔨</text>` : ''}</g>`).join('');
  const plaques = L.map(([k, x, y, w, nom, n, tr, att]) => { const lg = nom.length * 9.6 + (n ? 36 : 0) + 22;
    return `<g class="dbat" data-act="batiment" data-b="${k}" aria-hidden="true" transform="translate(${x} ${y + 4})"><rect x="${-lg}" y="-25" width="${2 * lg}" height="48" rx="24" class="plaque"/>
      <text y="11" text-anchor="middle" class="d2-t">${esc(nom)}${n ? ` <tspan class="d2-n">${n}</tspan>` : ''}</text>
      ${att ? `<g transform="translate(${lg - 4} -22)"><circle r="19" class="pastille"/><text y="9" text-anchor="middle" class="d2-p">!</text></g>` : ''}</g>`; }).join('');
  return `<svg class="plan plan2" viewBox="0 0 1024 1536" role="group" aria-label="Plan du domaine de ${esc(c.nom)}">
    <image href="${I}domaine/carte-jour.webp" x="0" y="0" width="1024" height="1536" class="fond-img"/><image href="${I}domaine/carte-nuit.webp" x="0" y="0" width="1024" height="1536" class="fond-nuit"/>
    ${bats}${plaques}</svg>`;
}
function planDomaine(c){
  if (V.BAT_IMG && V.IMAGES) return planIllustre(c);   // v111
  return `<svg class="plan" viewBox="0 0 420 320" role="group" aria-label="Plan du domaine">
    <rect x="0" y="0" width="420" height="320" rx="18" class="dsol"/>
    <path d="M0 26C60 6 120 16 170 8s120-4 170 10 80 6 80 6V0H0z" class="dcolline"/>
    <path d="M210 70v40M210 222v40M136 166h-60M284 166h60M62 90c10 30 60 44 90 52M358 90c-10 30-60 44-90 52M62 236c10-24 60-36 90-44M358 236c-10-24-60-36-90-44" class="dchemin"/>
    <ellipse cx="22" cy="226" rx="34" ry="16" class="dlac"/><ellipse cx="402" cy="110" rx="26" ry="12" class="dlac"/>
    ${[[18, 96], [30, 104], [404, 214], [392, 226], [404, 240], [110, 112], [312, 110], [112, 226], [306, 226], [16, 300], [404, 302]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" class="darbre"/><circle cx="${x - 3}" cy="${y - 3}" r="3" class="darbre2"/>`).join('')}
    ${stadePlan(c)}${Object.keys(POS_DOM).map(k => batPlan(c, k)).join('')}</svg>`;
}
function vueDomaine(){
  const c = B.assurer(M), d = c.dom, att = D.BATIMENTS.filter(b => B.amelEnAttente(c, b[0])).length;
  VUE.innerHTML = `<div><h1 class="grand">Domaine</h1><p class="sous">${esc(c.nom)} · ${c.travaux.length ? c.travaux.length + ' chantier' + (c.travaux.length > 1 ? 's' : '') + ' en cours · ' : ''}entretien ${eur(c.stade * E.eco.entretien + C.entretienInst(c))} par semaine</p></div>
  <div class="cols"><div>
    <div class="carte plan-carte">${planDomaine(c)}<p class="petit mut" style="margin:6px 4px 0">Touche un bâtiment pour l'améliorer${att ? ` · <b style="color:var(--or)">${att} amélioration${att > 1 ? 's' : ''} à choisir</b>` : ''}.</p></div>
    <div class="carte"><h2>Humeurs</h2>
      <div class="ligne"><span style="flex:1">Supporters</span><b>${Math.round(d.supp)} / 100</b></div><div class="jauge" style="margin:4px 0 10px"><i style="width:${d.supp}%"></i></div>
      <div class="ligne"><span style="flex:1">Confiance du président</span><b>${Math.round(M.manager.confiance)} %</b></div><div class="jauge" style="margin-top:4px"><i style="width:${M.manager.confiance}%"></i></div>
      <p class="petit mut" style="margin:8px 0 0">Les supporters suivent les résultats, le prix des places et ceux du Bazar. Contents, ils remplissent le stade et rassurent le président.</p></div>
  </div><div>
    <div class="carte"><h2>Bâtiments</h2><div class="liste">${['bureau', ...D.BATIMENTS.map(b => b[0])].map(k => { const n = k === 'bureau' ? 0 : C.niv(c, k), tr = c.travaux.find(t => t.type === k), a = k !== 'bureau' && B.amelEnAttente(c, k);
      return `<button class="el" data-act="batiment" data-b="${k}"><svg class="bmini" viewBox="0 0 64 64" aria-hidden="true">${V.batiment(k, c.couleurs[0], c.couleurs[1])}</svg>
        <div class="t"><b>${esc(nomBat(k))}</b><span>${k === 'bureau' ? 'Finances, partenaires, banque' : k === 'tribunes' ? c.stade.toLocaleString('fr-FR') + ' places' : esc(B.BAT[k][3].split(' :')[0].split('(')[0])}</span></div>
        ${a ? '<span class="badge" style="color:var(--or);border-color:var(--or)">à choisir</span>' : tr ? `<span class="badge">${tr.fin - (M.tic || 0)} sem.</span>` : n ? pips(n) : ''}</button>`; }).join('')}</div></div>
  </div></div>`;
}
function ficheBat(k){
  const c = B.assurer(M);
  if (k === 'bureau') return feuille(`${teteF('Bureau du président', esc(c.nom), `<svg class="bico" viewBox="0 0 64 64" aria-hidden="true">${V.batiment('bureau', c.couleurs[0], c.couleurs[1])}</svg>`)}
    <div class="carte"><div class="ligne" style="justify-content:space-between"><span>Objectif</span><b>${esc(M.manager.objectif.txt)}</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Confiance</span><b>${Math.round(M.manager.confiance)} %</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Supporters</span><b>${Math.round(c.dom.supp)} / 100</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Solde</span><b>${eur(c.budget)}</b></div></div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="allerVue" data-v="finances">Finances et banque</button><button class="btn" data-act="allerVue" data-v="partenaires">Partenaires</button></div>`);
  const b = B.BAT[k], n = C.niv(c, k), tr = c.travaux.find(t => t.type === k), att = B.amelEnAttente(c, k), vue = VUE_BAT[b[4]];
  const cout = k === 'tribunes' ? C.coutTravaux(c, 'tribunes') : C.coutTravaux(c, k), sem = (E.inst[k] || E.bat[k]).semaines;
  const choix = niveau => { const L = b[niveau === 3 ? 5 : 6], pris = L.find(x => B.a(c, x[0]));
    return `<div class="amel-niv"><h4>Niveau ${niveau}${n < niveau ? ' <span class="mut">· pas encore</span>' : ''}</h4><div class="amel-choix">${L.map(([cle, nom, effet]) => `<div class="amel ${pris && pris[0] === cle ? 'pris' : pris ? 'non' : ''}">
      <b>${pris && pris[0] === cle ? '✓ ' : ''}${esc(nom)}</b><span>${esc(effet)}</span>${att === niveau ? `<button class="btn" data-act="amel" data-a="${cle}">Choisir</button>` : ''}</div>`).join('')}</div></div>`; };
  let extra = '';
  if (k === 'infirmerie'){ const L = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.bless);
    extra = `<div class="carte" style="margin-top:10px"><h2>À l'infirmerie</h2>${L.length ? `<div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}"><span class="avp">${avatarDe(j)}</span><div class="t"><b>${esc(nomJ(j))}</b><span>${esc(j.bless.nom)} · ${j.bless.jours} j</span></div></button>`).join('')}</div>` : '<p class="mut" style="margin:0">Personne. Les lits sont faits.</p>'}
      ${B.a(c, 'apothicaire') ? `<p class="petit mut" style="margin:8px 0 0">Potion de forme : ${(M.tic || 0) - c.dom.potion >= 4 ? 'disponible (fiche du joueur)' : 'prochaine dans ' + (4 - ((M.tic || 0) - c.dom.potion)) + ' semaine(s)'}.</p>` : ''}</div>`; }
  if (k === 'divination') extra = `<div class="carte" style="margin-top:10px"><h2>Ce que voit le cabinet</h2><p class="petit" style="margin:0">${['Niveau 1 : la forme de l\'adversaire.', 'Niveau 2 : sa tactique (rythme, attrapeur, pressing).', 'Niveau 3 : son joueur clé.', 'Niveau 4 : la note moyenne de ses titulaires.', 'Niveau 5 : son point faible.'].map((t, i) => `<span style="display:block;${i < n ? '' : 'opacity:.45'}">${i < n ? '✓' : '·'} ${t}</span>`).join('')}</p><p class="petit mut" style="margin:6px 0 0">Le rapport s'affiche avant chaque match de championnat.</p></div>`;
  if (k === 'trophees'){ const T = B.titres(M, c); extra = `<div class="carte" style="margin-top:10px"><h2>${T.length} titre${T.length > 1 ? 's' : ''}</h2><p class="petit mut" style="margin:0">Visites : ${eur(B.visites(M, c))} par semaine.</p></div>`; }
  feuille(`${teteF(esc(b[1]), `Niveau ${n} / 5 · entretien ${eur(coutEntretien(c, k))} par semaine`, `<svg class="bico" viewBox="0 0 64 64" aria-hidden="true">${V.batiment(k, c.couleurs[0], c.couleurs[1])}</svg>`)}
    <p style="margin:0 0 6px">${esc(b[3])}</p>${pips(n)}
    <div class="btns" style="margin:12px 0">${n >= 5 ? '<span class="badge tit">Niveau maximal</span>' : tr ? `<span class="badge">Travaux en cours · fin dans ${tr.fin - (M.tic || 0)} semaine(s)</span>` : `<button class="btn" data-act="ameliorer" data-b="${k}">Passer au niveau ${n + 1} · ${eur(cout)} · ${sem} sem.</button>`}
      ${vue ? `<button class="btn sec" data-act="allerVue" data-v="${vue}">Ouvrir</button>` : ''}</div>
    <div class="carte"><h2>Améliorations <span class="mut petit">une au choix par niveau</span></h2>${choix(3)}${choix(5)}</div>${extra}`);
}
/* v112 : stade illustré façon FM98 (images/qm27/stade/) : le terrain vide et une pièce de tribune par emplacement, selon sa capacité.
   Repère du terrain 1536 × 1024 ; [centre x, base y, largeur] de chaque emplacement de gauche (la droite est son miroir). */
const STADE_RATIO = {'angle-avant-bois':0.931, 'angle-avant-chantier':1.156, 'angle-avant-grande':0.975, 'angle-avant-pierre':0.797, 'angle-fond-bois':0.969, 'angle-fond-chantier':1.247, 'angle-fond-grande':0.922, 'angle-fond-pierre':0.916, 'avant-bois':0.488, 'avant-chantier':0.926, 'avant-grande':0.781, 'avant-pierre':0.572, 'fond-bois':0.715, 'fond-chantier':1.039, 'fond-grande':0.877, 'fond-pierre':0.748, 'virage-bois':0.966, 'virage-chantier':1.262, 'virage-grande':1.212, 'virage-pierre':0.972};   // hauteur / largeur de chaque pièce
const STADE_POS = {N:[768, 268, 560], S:[780, 905, 560], O:[100, 560, 210], E:[100, 560, 210], NO:[262, 278, 250], NE:[262, 278, 250], SO:[205, 860, 250], SE:[205, 860, 250]};
const STADE_PIECE = {N:'fond', S:'avant', O:'virage', E:'virage', NO:'angle-fond', NE:'angle-fond', SO:'angle-avant', SE:'angle-avant'};
const NIV_T = ['bois', 'pierre', 'grande'];
function niveauxStade(c){
  const t = c.dom.trib, rang = (v, a, b) => v < a ? 0 : v < b ? 1 : 2, ch = c.travaux.some(x => x.type === 'stade') ? c.dom.cote : null;
  const n = {N:rang(t.N, 4500, 9000), S:rang(t.S, 4500, 9000), O:rang(t.O, 2500, 5000), E:rang(t.E, 2500, 5000)};
  const coin = (a, b) => c.stade < 10000 ? -1 : Math.min(n[a], n[b]);   // petits stades : pas de tribunes d'angle
  const r = {...n, NO:coin('N', 'O'), NE:coin('N', 'E'), SO:coin('S', 'O'), SE:coin('S', 'E')};
  const out = {}; for (const k in r) out[k] = k === ch ? 'chantier' : r[k] < 0 ? null : NIV_T[r[k]];
  return out;
}
function stadeIllustre(c){
  const I = V.IMAGES, n = niveauxStade(c), t = c.dom.trib, nomC = {N:'nord', S:'sud', E:'est', O:'ouest'};
  const piece = k => { if (!n[k]) return ''; const nom = `${STADE_PIECE[k]}-${n[k]}`, [cx0, base, w] = STADE_POS[k], dr = k === 'E' || k === 'NE' || k === 'SE', cx = dr ? 1536 - cx0 : cx0, h = w * (STADE_RATIO[nom] || 0.8);
    const img = `<image href="${I}stade/${nom}.webp" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
    const g = `<g transform="translate(${cx} ${base})${dr ? ' scale(-1 1)' : ''}">${img}</g>`;
    return t[k] != null ? `<g class="trib2" data-act="tribune" data-c="${k}" role="button" tabindex="0" aria-label="Tribune ${nomC[k]} : ${t[k].toLocaleString('fr-FR')} places${n[k] === 'chantier' ? ', travaux en cours' : ''}">${g}</g>` : `<g aria-hidden="true">${g}</g>`; };
  const ordre = ['NO', 'NE', 'N', 'O', 'E', 'SO', 'SE', 'S'];
  const lab = {N:[768, 300], S:[780, 945], O:[100, 600], E:[1436, 600]};
  const plaques = Object.entries(lab).map(([k, [x, y]]) => { const v = t[k], txt = `${(v / 1000).toFixed(v % 1000 ? 1 : 0).replace('.', ',')} k${n[k] === 'chantier' ? ' 🔨' : ''}`;
    return `<g class="trib2" data-act="tribune" data-c="${k}" aria-hidden="true" transform="translate(${x} ${y})"><rect x="${-txt.length * 15 - 22}" y="-34" width="${2 * (txt.length * 15 + 22)}" height="58" rx="29" class="st-pl"/><text y="12" text-anchor="middle" class="st-t">${txt}</text></g>`; }).join('');
  return `<svg class="stadev stade2" viewBox="0 -230 1536 1254" role="group" aria-label="Le stade : ${c.stade.toLocaleString('fr-FR')} places">
    <image href="${I}stade/terrain.webp" x="0" y="0" width="1536" height="1024" class="st-fond"/>${ordre.map(piece).join('')}${plaques}</svg>`;
}
function stadeVue(c){
  if (V.IMAGES) return stadeIllustre(c);   // v112
  const t = c.dom.trib, ep = x => 10 + Math.min(34, x / 900), [c1, c2] = c.couleurs, lv = C.niv(c, 'tribunes');
  const n = ep(t.N), s = ep(t.S), e = ep(t.E), o = ep(t.O), X0 = 70, X1 = 290, Y0 = 60, Y1 = 170;
  const tribune = (cote, d, lab, cap) => `<g class="trib" data-act="tribune" data-c="${cote}" role="button" tabindex="0" aria-label="Tribune ${lab} : ${cap.toLocaleString('fr-FR')} places"><path d="${d}" fill="${lv >= 3 ? V.melange(c1, '#000000', .18) : c1}" stroke="rgba(0,0,0,.35)"/>
    <path d="${d}" fill="url(#qm-sieges)" opacity=".35"/></g>`;
  const P = c.dom.panneaux.length, places = B.placesPanneaux(c), pan = [];
  for (let i = 0; i < places; i++){ const k = i / places, x = X0 + 8 + k * (X1 - X0 - 16); pan.push(`<rect x="${x}" y="${i % 2 ? Y1 - 6 : Y0 + 2}" width="${(X1 - X0 - 16) / places - 3}" height="4" rx="1" fill="${i < P ? ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a', '#8d5bd1'][i % 6] : 'none'}" stroke="${i < P ? 'none' : 'rgba(255,255,255,.6)'}" stroke-dasharray="2 2" stroke-width=".6"/>`); }
  return `<svg class="stadev" viewBox="0 0 360 230" role="group" aria-label="Plan du stade"><defs><pattern id="qm-sieges" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2h4" stroke="#fff" stroke-width=".7"/></pattern></defs>
    <rect x="${X0 - o - 6}" y="${Y0 - n - 6}" width="${X1 - X0 + o + e + 12}" height="${Y1 - Y0 + n + s + 12}" rx="22" fill="var(--card-2)" stroke="var(--line)"/>
    ${tribune('N', `M${X0} ${Y0}L${X0 - 6} ${Y0 - n}H${X1 + 6}L${X1} ${Y0}z`, 'nord', t.N)}${tribune('S', `M${X0} ${Y1}L${X0 - 6} ${Y1 + s}H${X1 + 6}L${X1} ${Y1}z`, 'sud', t.S)}
    ${tribune('E', `M${X1} ${Y0}L${X1 + e} ${Y0 - 6}V${Y1 + 6}L${X1} ${Y1}z`, 'est', t.E)}${tribune('O', `M${X0} ${Y0}L${X0 - o} ${Y0 - 6}V${Y1 + 6}L${X0} ${Y1}z`, 'ouest', t.O)}
    <rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#4f9d5c"/><ellipse cx="${(X0 + X1) / 2}" cy="${(Y0 + Y1) / 2}" rx="${(X1 - X0) / 2 - 12}" ry="${(Y1 - Y0) / 2 - 14}" fill="#5aa967" stroke="rgba(255,255,255,.7)" stroke-width=".8"/>
    ${[X0 + 20, X1 - 20].map(x => [-8, 0, 8].map(dy => `<circle cx="${x}" cy="${(Y0 + Y1) / 2 + dy}" r="${dy ? 2.6 : 3.4}" fill="none" stroke="#f3d36b" stroke-width="1.2"/>`).join('')).join('')}
    ${pan.join('')}
    ${B.a(c, 'loges') ? `<rect x="${(X0 + X1) / 2 - 30}" y="${Y0 - 5}" width="60" height="4" fill="#e2b23a"/>` : ''}
    ${B.a(c, 'ecran') ? `<rect x="${X1 + e - 22}" y="${Y0 - n - 2}" width="26" height="12" rx="1.5" fill="#1d2430"/>` : ''}
    ${B.a(c, 'lanternes') ? [[X0 - o, Y0 - n], [X1 + e, Y0 - n], [X0 - o, Y1 + s], [X1 + e, Y1 + s]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#ffe08a" stroke="#c9a227" stroke-width=".6"/>`).join('') : ''}
    ${[['N', (X0 + X1) / 2, Y0 - n / 2 + 3, t.N], ['S', (X0 + X1) / 2, Y1 + s / 2 + 3, t.S], ['E', X1 + e / 2, (Y0 + Y1) / 2 + 3, t.E], ['O', X0 - o / 2, (Y0 + Y1) / 2 + 3, t.O]].map(([k, x, y, v]) => `<text x="${x}" y="${y}" text-anchor="middle" class="tlab">${(v / 1000).toFixed(v % 1000 ? 1 : 0).replace('.', ',')} k</text>`).join('')}
    ${c.travaux.some(x => x.type === 'stade') ? `<text x="${(X0 + X1) / 2}" y="${(Y0 + Y1) / 2 + 4}" text-anchor="middle" class="tlab">travaux : tribune ${({N:'nord', S:'sud', E:'est', O:'ouest'})[c.dom.cote]}</text>` : ''}</svg>`;
}
function vueStade(){
  const c = B.assurer(M), ext = c.travaux.find(x => x.type === 'stade'), aff = Math.round(c.stade * C.remplissage(M, c, {rep:60}));
  const nom = {N:'Nord', S:'Sud', E:'Est', O:'Ouest'};
  VUE.innerHTML = `<div><h1 class="grand">Stade</h1><p class="sous">${esc(c.nom)} · ${c.stade.toLocaleString('fr-FR')} places · tribunes niveau ${C.niv(c, 'tribunes')}</p></div>
  <div class="cols"><div>
    <div class="carte">${stadeVue(c)}<p class="petit mut" style="margin:6px 2px 0">Touche une tribune (ou son chiffre) pour l'agrandir de ${E.stade.tranche.toLocaleString('fr-FR')} places (${eur(C.coutTravaux(c, 'stade'))}, ${E.stade.semaines} semaines). Panneaux vendus : ${c.dom.panneaux.length} / ${B.placesPanneaux(c)}.</p></div>
    <div class="carte"><h2>Tribunes</h2><div class="liste">${Object.keys(nom).map(k => `<div class="el"><div class="t"><b>Tribune ${nom[k]}</b><span>${c.dom.trib[k].toLocaleString('fr-FR')} places</span></div>${ext ? (c.dom.cote === k ? `<span class="badge">travaux · ${ext.fin - (M.tic || 0)} sem.</span>` : '') : `<button class="btn sec" data-act="tribune" data-c="${k}">+ ${(E.stade.tranche / 1000)} k</button>`}</div>`).join('')}</div></div>
  </div><div>
    <div class="carte"><h2>Billetterie</h2><div class="ligne"><button class="btn sec" data-act="prix" data-d="-1" aria-label="Baisser le prix">−</button><b style="flex:1;text-align:center;font-size:1.15rem">${eur(c.prix)} la place</b><button class="btn sec" data-act="prix" data-d="1" aria-label="Augmenter le prix">+</button></div>
      <p class="petit mut" style="margin:8px 0 0">Environ ${aff.toLocaleString('fr-FR')} spectateurs (${Math.round(aff / c.stade * 100)} %) contre un adversaire moyen. Prix conseillé : ${eur(C.prixRef(c))} ; plus cher, les supporters râlent.</p></div>
    <div class="btns"><button class="btn sec" data-act="batiment" data-b="tribunes">Améliorer le stade</button><button class="btn sec" data-act="allerVue" data-v="partenaires">Panneaux et sponsor</button></div>
  </div></div>`;
}
function vueBoutique(){
  const c = B.assurer(M), d = c.dom, dispo = B.produitsDispo(c), actifs = dispo.filter(p => d.produits[p[0]] && d.produits[p[0]].actif).length;
  const lib = {bas:'Bas', normal:'Normal', haut:'Haut'};
  VUE.innerHTML = `<div><h1 class="grand">Bazar du club</h1><p class="sous">Niveau ${C.niv(c, 'boutique')} · ${actifs} / ${B.placesRayon(c)} produits en rayon · environ ${eur(B.recettesBazar(c))} par semaine</p></div>
  <div class="carte"><div class="liste">${D.PRODUITS.map(p => { const ok = !p[4] || B.a(c, p[4]), st = d.produits[p[0]] || {actif:false, prix:'normal'};
    if (!ok) return `<div class="el" style="opacity:.55"><div class="t"><b>🔒 ${esc(p[1])}</b><span>Débloqué par ${esc(B.AMEL[p[4]].nom)} (${esc(nomBat(B.AMEL[p[4]].bat))}, niveau ${B.AMEL[p[4]].niv})</span></div></div>`;
    return `<div class="el prod">${V.produitImg(p[0])}<label class="interr"><input type="checkbox" data-chg="produit" data-p="${p[0]}" ${st.actif ? 'checked' : ''}><span></span></label>
      <div class="t"><b>${esc(p[1])}</b><span>${'★'.repeat(Math.round(p[2] * 3))} · ${eur(p[3] * B.PRIX[st.prix].p)} · ${st.actif ? '≈ ' + eur(B.recetteProduit(c, p, st)) + ' / sem.' : 'pas en rayon'}</span></div>
      <div class="seg mini">${['bas', 'normal', 'haut'].map(v => `<button data-act="prixProduit" data-p="${p[0]}" data-v="${v}" class="${st.prix === v ? 'on' : ''}">${lib[v]}</button>`).join('')}</div></div>`; }).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Les produits portent les couleurs du club. Prix bas : un peu moins de recettes, des supporters ravis. Prix haut : plus de recettes, des supporters qui râlent. Chaque niveau du Bazar ajoute une place en rayon.</p></div>`;
  V.colorierProduits(VUE, c);   // v111
}
function vuePartenaires(){
  const c = B.assurer(M), d = c.dom, sp = d.sponsor, pl = B.placesPanneaux(c);
  VUE.innerHTML = `<div><h1 class="grand">Partenaires</h1><p class="sous">Sponsor maillot et panneaux autour du terrain</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Sponsor maillot</h2><div class="spons">${V.maillot(c, '', 'g', sp ? sp.nom : '')}<div>
      ${sp ? `<b>${V.logoSponsor(sp.nom, 'logo-sp g')}${esc(sp.nom)}</b><span>${eur(sp.fixe)} par saison${sp.victoire ? ` · ${eur(sp.victoire)} par victoire` : ''}${sp.objectif ? ` · ${eur(sp.objectif)} si l'objectif est atteint` : ''}</span><span>Contrat jusqu'en ${sp.fin + 1}</span>` : '<b>Aucun sponsor</b><span>Choisis une offre ci-dessous.</span>'}</div></div>
      ${!sp && d.offresSponsor.length ? `<div class="liste" style="margin-top:8px">${d.offresSponsor.map((o, i) => `<div class="el">${V.logoSponsor(o.nom)}<div class="t"><b>${esc(o.nom)} <span class="badge">${esc(o.style)}</span></b><span>${eur(o.fixe)} / saison${o.victoire ? ' · ' + eur(o.victoire) + ' / victoire' : ''}${o.objectif ? ' · ' + eur(o.objectif) + ' si objectif' : ''} · ${o.ans} saison${o.ans > 1 ? 's' : ''}</span></div><button class="btn" data-act="sponsor" data-i="${i}">Signer</button></div>`).join('')}</div>` : ''}</div>
  </div><div>
    <div class="carte"><h2>Panneaux <span class="mut petit">${d.panneaux.length} / ${pl}</span></h2>
      ${d.panneaux.length ? `<div class="liste">${d.panneaux.map((p, i) => `<div class="el">${V.logoSponsor(p.nom)}<div class="t"><b>${esc(p.nom)}</b><span>${eur(p.montant)} / saison · jusqu'en ${p.fin + 1}</span></div><button class="btn sec" data-act="retirerPanneau" data-i="${i}">Retirer</button></div>`).join('')}</div>` : '<p class="mut">Aucun panneau vendu.</p>'}
      ${d.offresPanneaux.length ? `<h2 style="margin-top:14px">Annonceurs intéressés</h2><div class="liste">${d.offresPanneaux.map((o, i) => `<div class="el">${V.logoSponsor(o.nom)}<div class="t"><b>${esc(o.nom)}</b><span>${eur(o.montant)} / saison · ${o.ans} saison${o.ans > 1 ? 's' : ''}</span></div><button class="btn ${d.panneaux.length >= pl ? 'sec' : ''}" data-act="signerPanneau" data-i="${i}" ${d.panneaux.length >= pl ? 'disabled' : ''}>Vendre</button></div>`).join('')}</div>` : ''}
      <p class="petit mut" style="margin:8px 0 0">Chaque niveau du stade ajoute deux emplacements. De nouveaux annonceurs se présentent chaque été.</p></div>
  </div></div>`;
}
/* v115 : la vitrine illustrée (images/qm27/trophees/vitrine.webp, repère 1536 × 1024) : trois étagères de verre (dessus à y = 346, 492, 652),
   sept coupes au plus par étagère, les plus récentes en haut ; les titres d'avant ton arrivée un peu passés */
const VITRINE = {etageres:[346, 492, 652], x0:310, x1:1230, parEtagere:7, taille:[150, 124, 136]};
function vitrineHTML(T){
  const L = T.filter(x => V.coupeSrc && V.coupeSrc(x.cle)).slice(0, VITRINE.parEtagere * 3), pas = (VITRINE.x1 - VITRINE.x0) / VITRINE.parEtagere;
  const coupes = L.map((x, i) => { const r = Math.floor(i / VITRINE.parEtagere), k = i % VITRINE.parEtagere, n = Math.min(VITRINE.parEtagere, L.length - r * VITRINE.parEtagere), t = VITRINE.taille[r];
    const cx = (VITRINE.x0 + VITRINE.x1) / 2 + (k - (n - 1) / 2) * pas;
    return `<image class="${x.ancien ? 'anc' : ''}" href="${V.coupeSrc(x.cle)}" x="${Math.round(cx - t / 2)}" y="${VITRINE.etageres[r] - t + 4}" width="${t}" height="${t}"><title>${esc(x.titre)} · ${esc(x.saison)}</title></image>`; }).join('');
  return `<div class="carte vitrine"><svg viewBox="0 0 1536 1024" role="img" aria-label="Vitrine : ${T.length} trophée${T.length > 1 ? 's' : ''}"><image href="${V.IMAGES}trophees/vitrine.webp" width="1536" height="1024"/>${coupes}</svg>
    ${L.length ? '' : '<p class="petit mut" style="margin:8px 0 0">Les étagères attendent ton premier titre.</p>'}${T.length > L.length ? `<p class="petit mut" style="margin:8px 0 0">La vitrine montre les ${L.length} titres les plus récents.</p>` : ''}</div>`;
}
function vueTrophees(){
  const c = B.assurer(M), T = B.titres(M, c);
  VUE.innerHTML = `<div><h1 class="grand">Salle des trophées</h1><p class="sous">${esc(c.nom)} · niveau ${C.niv(c, 'trophees')} · visites ${eur(B.visites(M, c))} par semaine</p></div>
  ${vitrineHTML(T)}
  <div class="carte">${T.length ? `<div class="trophees">${T.map((x, i) => `<div class="tr ${x.ancien ? 'ancien' : ''}">${(V.coupeImg && V.coupeImg(x.cle)) || V.trophee(x.titre, x.saison)}<b>${esc(x.saison)}</b><span>${esc(x.titre)}</span></div>`).join('')}</div>` : '<p class="mut" style="margin:0">La vitrine est vide. À toi de la remplir.</p>'}
    <p class="petit mut" style="margin:10px 0 0">Les titres d'avant ton arrivée sont un peu passés. Chaque titre attire plus de visiteurs.</p></div>`;
}
function banqueHTML(c){
  const p = c.dom.pret, pl = B.plafondPret(c), t = B.tauxPret(c), ch = U.pret || {m:Math.min(1e6, pl), s:2};
  if (p) return `<div class="carte"><h2>Banque des Gobelins</h2><div class="ligne" style="justify-content:space-between"><span>Emprunt</span><b>${eur(p.capital)} à ${(p.taux * 100).toFixed(1).replace('.', ',')} %</b></div>
    <div class="ligne" style="justify-content:space-between;margin-top:6px"><span>Reste à payer</span><b>${eur(p.reste)}</b></div><div class="ligne" style="justify-content:space-between;margin-top:6px"><span>Échéance</span><b>${eur(p.hebdo)} / semaine</b></div>
    <button class="btn sec plein" style="margin-top:10px" data-act="rembourser">Tout rembourser maintenant</button></div>`;
  const montants = [250e3, 500e3, 1e6, 2e6, 4e6].filter(x => x <= pl);
  return `<div class="carte"><h2>Banque des Gobelins</h2><p class="petit mut" style="margin:0 0 8px">Prêt jusqu'à ${eur(pl)} à ${(t * 100).toFixed(1).replace('.', ',')} % par an, remboursé chaque semaine.</p>
    <div class="seg" style="margin-bottom:6px">${montants.map(m => `<button data-act="choixPret" data-m="${m}" class="${ch.m === m ? 'on' : ''}">${eur(m)}</button>`).join('')}</div>
    <div class="seg" style="margin-bottom:8px">${[1, 2, 3].map(s => `<button data-act="choixPret" data-s="${s}" class="${ch.s === s ? 'on' : ''}">${s} saison${s > 1 ? 's' : ''}</button>`).join('')}</div>
    <p class="petit" style="margin:0 0 8px">Soit ${eur(Math.ceil(ch.m * (1 + t * ch.s) / (ch.s * E.eco.semaines)))} par semaine, ${eur(Math.round(ch.m * t * ch.s))} d'intérêts.</p>
    <button class="btn plein" data-act="emprunter" ${montants.length ? '' : 'disabled'}>Emprunter ${eur(ch.m)}</button></div>`;
}
/* avant-match : le cabinet de divination et le hibou espion */
function divinationHTML(){
  if (!X || X.sixn || !M.manager.club) return '';
  const c = club(M.manager.club), n = C.niv(c, 'divination'), espion = B.a(c, 'espion'), adv = X.e[1 - X.joueur], moi = X.e[X.joueur];
  if (!n && !espion) return '';
  const T = M.tables[club(adv.id).ligue] || {}, L = [];
  const forme = ((T[adv.id] || {}).forme || []).join(' ') || 'pas encore de match';
  L.push(`Forme : <b>${forme}</b>`);
  if (n >= 2){ const t = adv.tactique; L.push(`Tactique : rythme ${esc(nomOpt('rythme', t.rythme).toLowerCase())}, attrapeur « ${esc(nomOpt('attrapeur', t.attrapeur).toLowerCase())} », sans le souafle : ${esc(nomOpt('sans', QM.sansDe(t)).toLowerCase())}, attaque par ${esc(nomOpt('zone', t.zone).toLowerCase())}`); }
  const tit = ['P', 'B', 'A', 'G'].flatMap(p => adv[p].map(id => [p, M.joueurs[id]])).filter(([, j]) => j);
  if (n >= 3){ const [p, j] = tit.reduce((x, y) => QM.note(y[1], y[0]) > QM.note(x[1], x[0]) ? y : x); L.push(`Joueur clé : <b>${esc(nomJ(j))}</b> (${D.POSTES[p].nom.toLowerCase()}, ${QM.note(j, p)})`); }
  if (n >= 4){ const m = e => { const t = ['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => QM.note(M.joueurs[id], p))); return Math.round(t.reduce((a, b) => a + b, 0) / t.length); }; L.push(`Note moyenne des titulaires : <b>${m(adv)}</b> contre ${m(moi)} pour toi`); }
  if (n >= 5){ const [p, j] = tit.reduce((x, y) => QM.note(y[1], y[0]) < QM.note(x[1], x[0]) ? y : x); L.push(`Point faible : <b>${esc(nomJ(j))}</b> (${D.POSTES[p].nom.toLowerCase()}, ${QM.note(j, p)})`); }
  if (espion) L.push(`Hibou espion, composition : ${tit.map(([p, j]) => `${p} ${esc(j.n)}`).join(', ')}`);
  return `<div class="carte div-carte"><h2>Cabinet de divination <span class="mut petit">niveau ${n}</span></h2><p class="petit" style="margin:0;line-height:1.6">${L.join('<br>')}</p></div>`;
}

/* ---------- v90 : vestiaire, causeries, presse, paris ---------- */
function vueVestiaire(){
  const c = club(M.manager.club), Hm = HH(), amb = Hm.ambiance(M, c), L = Hm.leaders(M, c), CL = Hm.clans(M, c), mec = Hm.mecontents(M, c);
  const ment = (c.mentors || []).filter(p => c.effectif.includes(p.mentor) && c.effectif.includes(p.jeune));
  const vieux = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.age >= 26 && !ment.some(p => p.mentor === j.id)).sort((a, b) => (QM.at(b, 'det') + b.cache.pro) - (QM.at(a, 'det') + a.cache.pro));
  const jeunes = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.age <= 22 && !ment.some(p => p.jeune === j.id));
  const pretes = Object.values(M.joueurs).filter(j => j.pret && j.pret.de === c.id);
  const ligneJ = (j, d) => `<button class="el" data-act="joueur" data-j="${j.id}"><span class="avp">${avatarDe(j)}<i class="poste ${j.poste} pi" title="${D.POSTES[j.poste].nom}">${V.posteImg(j.poste)}</i></span><div class="t"><b>${esc(nomJ(j))}</b><span>${d}</span></div><span class="note ${j.moral >= 70 ? 'n4' : j.moral >= 45 ? 'n3' : 'n1'}" title="Moral">${Math.round(j.moral)}</span></button>`;
  VUE.innerHTML = `<div><h1 class="grand">Vestiaire</h1><p class="sous">${esc(c.nom)} · moral sur 100</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Ambiance</h2><div class="ligne"><span style="flex:1">${amb >= 75 ? 'Excellente' : amb >= 60 ? 'Bonne' : amb >= 45 ? 'Tendue' : 'Mauvaise'}</span><b>${amb} / 100</b></div><div class="jauge" style="margin-top:6px"><i style="width:${amb}%"></i></div>
      <p class="petit mut" style="margin:8px 0 0">L'ambiance, surtout celle des leaders, donne un petit coup de pouce (ou de frein) à l'équipe en match et fait monter la cohésion.</p></div>
    <div class="carte"><h2>Leaders</h2><div class="liste">${L.map(j => ligneJ(j, `${j.age} ans · ${c.compo && c.compo.cap === j.id ? 'capitaine · ' : ''}${j.moral < 40 ? '<b style="color:var(--mauvais)">malheureux : il plombe le groupe</b>' : 'écouté par le groupe'}`)).join('')}</div></div>
    <div class="carte"><h2>Clans</h2>${CL.length ? `<div class="liste">${CL.map(k => `<div class="el"><div class="t"><b>${esc(k.nom)} (${k.joueurs.length})</b><span>${k.joueurs.map(j => esc(k.joueurs.filter(x => x.n === j.n).length > 1 ? j.p[0] + '. ' + j.n : j.n)).join(', ')}</span></div><span class="note ${k.moral >= 70 ? 'n4' : k.moral >= 45 ? 'n3' : 'n1'}">${k.moral}</span></div>`).join('')}</div>` : '<p class="mut" style="margin:0">Pas de clan : un groupe très mélangé.</p>'}</div>
  </div><div>
    <div class="carte"><h2>À surveiller</h2>${mec.length ? `<div class="liste">${mec.map(j => ligneJ(j, `Veut plus de temps de jeu (${j.saison.m} match${j.saison.m > 1 ? 's' : ''})`)).join('')}</div>` : '<p class="mut" style="margin:0">Personne ne râle pour l\'instant.</p>'}</div>
    <div class="carte"><h2>Mentorat <span class="mut petit">${ment.length} / 3</span></h2>
      ${ment.length ? `<div class="liste">${ment.map(p => { const a = M.joueurs[p.mentor], b = M.joueurs[p.jeune]; return `<div class="el"><span class="avp">${avatarDe(a)}</span><span class="avp">${avatarDe(b)}</span><div class="t"><b>${esc(a.n)} → ${esc(b.n)}</b><span>${b.age} ans · progresse 15 % plus vite, prend l'état d'esprit du mentor</span></div><button class="btn sec" data-act="finMentor" data-j="${b.id}">Arrêter</button></div>`; }).join('')}</div>` : ''}
      ${ment.length < 3 && vieux.length && jeunes.length ? `<div class="mentor-form"><label>Mentor<select id="mentorA">${vieux.map(j => `<option value="${j.id}">${esc(nomJ(j))} (${j.age} ans)</option>`).join('')}</select></label><label>Jeune<select id="mentorB">${jeunes.map(j => `<option value="${j.id}">${esc(nomJ(j))} (${j.age} ans)</option>`).join('')}</select></label><button class="btn" data-act="mentor">Former le binôme</button></div>` : ment.length < 3 ? '<p class="mut" style="margin:0">Il faut un joueur de 26 ans ou plus et un jeune de 22 ans ou moins.</p>' : ''}</div>
    ${pretes.length ? `<div class="carte"><h2>Prêtés ailleurs</h2><div class="liste">${pretes.map(j => ligneJ(j, `à ${esc(club(j.club).nom)} jusqu'à la fin de la saison`)).join('')}</div></div>` : ''}
    ${blocBalais(c)}
  </div></div>`;
}
function causerieHTML(moment){
  if (!X || REG.causeries === false || !HH()) return '';
  const fait = moment === 'avant' ? X.causerieAvant : X.causerieTM === X.tm[X.joueur];
  if (fait) return `<div class="carte caus"><h2>Causerie</h2><p style="margin:0">${esc(fait.txt || X.causerieTxt || '')}</p></div>`;
  return `<div class="carte caus"><h2>Causerie ${moment === 'avant' ? 'd\'avant-match' : 'du temps mort'}</h2><p class="petit mut" style="margin:0 0 8px">Quel discours ? Ça dépend du rapport de forces, du score et du caractère du groupe.</p>
    <div class="caus-g">${HH().TONS.map(([k, n, ind]) => `<button data-act="causerie" data-m="${moment}" data-t="${k}"><b>${esc(n)}</b>${ind ? `<span>${esc(ind)}</span>` : ''}</button>`).join('')}</div></div>`;
}
function parisHTML(){
  if (!X || X.sixn || !HH() || !HH().etat(M).triche) return '';
  const c = HH().cote(M, X), adv = X.e[1 - X.joueur], prix = Math.round((80000 + (adv.rep || 60) * 3000) / 10000) * 10000;
  return `<div class="carte triche"><h2>Dans l'ombre <span class="mut petit">option activée</span></h2>
    ${X.pari ? `<p style="margin:0 0 8px">Pari placé : ${eur(X.pari.mise)} à ${String(X.pari.cote).replace('.', ',')} contre 1.</p>` : `<p class="petit" style="margin:0 0 8px">Cote de ta victoire : <b>${String(c).replace('.', ',')}</b>. Le ministère surveille…</p><div class="btns" style="margin-bottom:8px">${[50000, 100000, 250000].map(m => `<button class="btn sec" data-act="parier" data-m="${m}">Parier ${eur(m)}</button>`).join('')}</div>`}
    ${X.pot ? '<p style="margin:0">Le gardien adverse a été « convaincu ».</p>' : `<button class="btn sec plein" data-act="soudoyer">Soudoyer le gardien adverse · ${eur(prix)}</button>`}</div>`;
}
/* v94 : conférence de presse en plusieurs questions (qm27-presse.js) */
const QP = () => window.QMP;
const puceFx = ([l, v]) => `<span class="pr-fx ${v > 0 ? 'plus' : 'moins'}">${esc(l)} ${v > 0 ? '+' : '−'}${String(Math.abs(v)).replace('.', ',')}</span>`;
function presseHTML(){
  if (!X || !X.fini || !QP() || !X.presse && REG.presse === false) return '';
  const P = QP().conference(M, X, REG.presseN || 3), TONS = QP().TONS;
  const faits = P.faits.map((f, i) => `<div class="pr-fait${!P.fin && i === P.faits.length - 1 ? ' dernier' : ''}"><p class="pr-q"><span class="mut">${esc(f.media)} :</span> « ${esc(f.q)} »</p>
    <p class="pr-r">— « ${esc(f.t)} » <span class="pr-ton">${esc(TONS[f.ton][0])}</span></p>${f.puces.length ? `<div class="pr-fxs">${f.puces.map(puceFx).join('')}</div>` : '<div class="pr-fxs"><span class="pr-fx">Aucun effet</span></div>'}</div>`).join('');
  if (P.fin) return `<div class="carte presse"><h2>Conférence de presse <span class="mut petit">terminée</span></h2>${faits}
    <p class="petit mut" style="margin:8px 0 0">La Gazette du sorcier en parle dans ta boîte de réception. Relation avec la presse : <b>${M.manager.presse ?? 50} / 100</b>.</p></div>`;
  const q = P.qs[P.i];
  return `<div class="carte presse"><h2>Conférence de presse <span class="mut petit">question ${P.i + 1} / ${P.qs.length}</span></h2>${faits}
    <p class="pr-media">${esc(q.media)} · ${esc(q.journaliste)}</p><p style="margin:0 0 10px"><b>« ${esc(q.q)} »</b></p>
    <div class="liste">${q.r.map((a, i) => `<button class="el" data-act="presse" data-r="${i}"><div class="t" style="white-space:normal"><b style="white-space:normal;font-weight:500">${esc(a.t)}</b></div><span class="pr-ton">${esc(TONS[a.ton][0])}</span></button>`).join('')}</div>
    <div class="btns" style="margin-top:8px"><button class="btn sec pr-bt" data-act="presse" data-r="-1">Pas de commentaire</button><button class="btn sec pr-bt" data-act="presse" data-r="-2">Quitter la salle</button></div>
    <p class="petit mut" style="margin:8px 0 0">Le ton compte : le groupe, le président, les supporters et les journalistes réagissent à chaque réponse.</p></div>`;
}

function vueChomage(){
  const mg = M.manager, S = QM.semaine(M), oc = C.offresCarriere(M);
  VUE.innerHTML = `<div><h1 class="grand">Sans club</h1><p class="sous">${esc(mg.nom)} · réputation ${Math.round(mg.rep)} / 100</p></div>
  <div class="carte"><h2>Offres</h2>${oc.length ? oc.map(o => { const c = club(o.club), o2 = QM.objectif(M, o.club);
    return `<div class="el">${blason(c.id)}<div class="t"><b>${esc(c.nom)}</b><span>${esc(M.ligues[c.ligue].court)} · réputation ${c.rep} · ${esc(o2.txt.toLowerCase())}</span></div></div>
      <div class="btns" style="margin:4px 0 10px"><button class="btn sec" data-act="refuserPoste" data-c="${c.id}">Refuser</button><button class="btn" data-act="accepterPoste" data-c="${c.id}">Accepter</button></div>`; }).join('') : '<p class="mut" style="margin:0">Pas encore d\'offre. Avance le temps : les clubs à la recherche d\'un entraîneur se manifestent.</p>'}</div>
  ${mg.selection && S && (S.type === 'sixn' || S.tour) && QM.matchDuJoueur(M) && !QM.matchDuJoueur(M).res ? `<div class="carte"><h2>${S.comp && window.QMN ? esc(window.QMN.titreSemaine(S)) : 'Six Emblèmes'}</h2><p class="sous" style="margin:0 0 8px">Tu restes sélectionneur.</p><button class="btn plein" data-act="preparer">Préparer le match de la sélection</button></div>` : ''}
  ${S && S.type === 'bilan' ? '<button class="btn or plein" data-act="saisonSuivante">Passer à la saison suivante</button>' : `<button class="btn plein" data-act="continuer">Avancer d'une semaine${S ? ' (' + fmtDate(S.date) + ')' : ''}</button>`}
  <div class="carte"><h2>Boîte de réception</h2>${M.boite.slice(0, 5).map(msgHTML).join('')}</div>`;
}
function vueCarriere(){
  const mg = M.manager, oc = C.offresCarriere(M), U = mg.club ? club(mg.club) : null;
  VUE.innerHTML = `<div class="tete-mg"><span class="avp g">${window.QMU && window.QMU.avatarMgr ? window.QMU.avatarMgr('g') : avatarDe({id:'manager', p:(mg.nom || '').split(' ')[0], n:mg.nom, nat:U ? U.nat : 'FRA', age:40}, 'g', mg.club || null)}</span><div><h1 class="grand">Carrière</h1><p class="sous">${esc(mg.nom)}${U ? ' · ' + esc(U.nom) : ' · sans club'}</p></div></div>
  <div class="carte"><h2>Réputation</h2><div class="jauge"><i style="width:${mg.rep}%"></i></div><p class="petit mut" style="margin:8px 0 0">${Math.round(mg.rep)} / 100 · elle monte avec les résultats au-dessus des attentes, les objectifs atteints et les titres. À partir de ${E.carriere.repSelection}, les fédérations peuvent proposer le poste de sélectionneur.</p></div>
  ${oc.length ? `<div class="carte" style="border-color:var(--or)"><h2>Offres de clubs</h2>${oc.map(o => { const c = club(o.club);
    return `<div class="el">${blason(c.id)}<div class="t"><b>${esc(c.nom)}</b><span>${esc(M.ligues[c.ligue].court)} · réputation ${c.rep} · ${esc(QM.objectif(M, c.id).txt.toLowerCase())}</span></div></div>
    <p class="petit mut" style="margin:0 0 6px">${esc(o.pourquoi || '')}</p>
    <div class="btns" style="margin-bottom:10px"><button class="btn sec" data-act="refuserPoste" data-c="${c.id}">Refuser</button><button class="btn" data-act="accepterPoste" data-c="${c.id}">Accepter</button></div>`; }).join('')}
    ${U ? '<p class="petit mut" style="margin:0">Accepter fait quitter ton club tout de suite : la partie continue avec le nouveau.</p>' : ''}</div>` : ''}
  ${mg.offreSel ? `<div class="carte" style="border-color:var(--or)"><h2>Fédération</h2><div class="el">${blason(mg.offreSel.nat, '', 1)}<div class="t"><b>Sélectionneur : ${esc(nat(mg.offreSel.nat).nom)}</b><span>En plus de ton club, pendant le Tournoi des Six Emblèmes</span></div></div>
    <div class="btns"><button class="btn sec" data-act="refuserSel">Refuser</button><button class="btn" data-act="accepterSel">Accepter</button></div></div>` : ''}
  ${mg.selection ? `<div class="carte"><h2>Sélection</h2><div class="el">${blason(mg.selection.nat, '', 1)}<div class="t"><b>${esc(nat(mg.selection.nat).nom)}</b><span>Depuis ${lab(mg.selection.depuis)} · objectif : top ${mg.selection.objectif}</span></div></div>
    <div class="btns"><button class="btn sec" data-act="quitterSel">Quitter la sélection</button><button class="btn" data-act="vue" data-v="selection">Convocations</button></div></div>` : ''}
  <div class="carte"><h2>Parcours</h2><div class="liste">${(mg.postes || []).slice().reverse().map(p => `<div class="el">${blason(p.club, 'p')}<div class="t"><b>${esc(club(p.club).nom)}</b><span>${lab(p.debut)}${p.fin != null ? ' → ' + lab(p.fin) : ' → aujourd\'hui'}</span></div></div>`).join('')}</div>
    ${mg.saisons.length ? `<div class="sep"></div><div class="liste">${mg.saisons.slice().reverse().map(x => `<div class="el"><div class="t"><b>${esc(x.saison)}</b><span>${esc(club(x.club).nom)} · ${x.pos}${x.pos === 1 ? 'er' : 'e'}</span></div></div>`).join('')}</div>` : ''}</div>
  ${U ? `<button class="btn sec plein" style="color:var(--mauvais)" data-act="demission">Démissionner de ${esc(U.nom)}</button>` : ''}`;
}
function vueSelection(){
  const sel = M.manager.selection, n = sel.nat, T = M.sel.tactique, ctx = ctxCompo();
  U.fitMap = TT() ? TT().adequationCompo(M, ctx.K, QM.completerTactique({...T})) : null;
  avecPanneau(() => { VUE.innerHTML = `<div><h1 class="grand">${flagSeul(n)} ${esc(nat(n).nom)}</h1><p class="sous">Sélection · ${M.calendrier.some(s => s.tour) ? `objectif : top ${sel.objectif} du Tournoi des Six Emblèmes` : `${esc(D.LDN.nom)} : ${esc(({2:'atteindre la finale', 4:'atteindre les demi-finales', 8:'sortir des groupes', 19:'faire bonne figure'})[sel.vise] || 'faire bonne figure')}`}${M.sel.perso ? '' : ' · convocation automatique'}</p></div>
  ${compoHTML(ctx)}
  <div class="carte"><h2>Consignes</h2>${consignesHTML(T, 'consigneSel')}</div>`; });
}
function choisirSel(p, i, banc){
  const n = M.manager.selection.nat, conv = C.convocation(M).compo;
  const L = Object.values(M.joueurs).filter(j => j.nat === n && j.club && !j.acad).sort((a, b) => QM.note(b, banc ? b.poste : p) - QM.note(a, banc ? a.poste : p)).slice(0, 40);
  feuille(`${teteF(banc ? 'Remplaçant' : D.POSTES[p].nom, `Sélectionnables : ${esc(nat(n).nom)} · note au poste`)}
    <div class="liste">${L.map(j => `<button class="el" data-act="mettreSel" data-j="${j.id}" data-p="${p}" data-i="${i}" data-b="${banc ? 1 : 0}" ${j.bless ? 'disabled style="opacity:.5"' : ''}>${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}${QM.titulaires(conv).includes(j.id) ? ' <span class="badge tit">titulaire</span>' : conv.banc.includes(j.id) ? ' <span class="badge">remplaçant</span>' : ''}</b><span>${esc(club(j.club).nom)}${j.bless ? ' · ✚ blessé' : ''}</span></div><span class="note ${classeNote(QM.note(j, banc ? j.poste : p))}">${QM.note(j, banc ? j.poste : p)}</span></button>`).join('')}</div>`);
}
function mettreSel(jid, p, i, banc){
  fermerFeuille(); placerSlot(ctxCompo(), jid, banc ? 'R' + i : p + i);
}

/* ---------- Match ---------- */
function vueMatch(){
  if (!X) return aller('accueil');
  const L = U.live, fini = X.fini, sixn = false;
  const e0 = X.e[0], e1 = X.e[1];
  const vifEtat = X.vif >= 0 ? 'pris' : (X.vifVu && !X.vifCache) ? 'vu' : '';
  const vifTxt = X.vif >= 0 ? `Vif d'or : ${esc(X.e[X.vif].sigle)}` : !X.vifVu ? 'Vif d\'or pas encore vu' : X.vifCache ? 'Vif d\'or caché' : 'Vif d\'or en vue !';
  const mm = String(Math.floor(X.t / 60)).padStart(2, '0') + ':' + String(X.t % 60).padStart(2, '0');
  const S = X.stats, moi = X.joueur;
  const avant = !L.parti;
  const nomScore = e => { const v = (M.clubs[e.id] || {}).ville; return v && v !== e.nom ? `<span class="lg">${esc(e.nom)}</span><span class="ct">${esc(v)}</span>` : esc(e.nom); };
  VUE.innerHTML = `
  <div class="tableau" id="tableau">
    <div class="score">
      <div class="eq">${blason(e0.id, '')}<b>${nomScore(e0)}</b></div>
      <div class="pts"><strong id="sc">${X.score[0]} – ${X.score[1]}</strong><span id="mm">${avant ? fmtDate(QM.semaine(M).date) : fini ? 'Terminé · ' + Math.round(X.t / 60) + ' min' : mm}</span></div>
      <div class="eq dr">${blason(e1.id, '')}<b>${nomScore(e1)}</b></div>
    </div>
    <div class="mini"><span class="vifb ${vifEtat}" id="vifb"><i></i>${vifTxt}</span><span>${D.METEOS[X.meteo].ico} ${D.METEOS[X.meteo].nom}</span></div>
    ${!avant && !fini ? `<div class="ctrl">
      <button data-act="lecture" aria-label="${L.pause ? 'Reprendre' : 'Pause'}">${L.pause ? '▶︎' : '❚❚'}</button>
      ${[0.5, 1, 2, 4].map(v => `<button data-act="vitesse" data-v="${v}" class="${REG.vitesse === v ? 'on' : ''}" aria-label="Vitesse ${String(v).replace('.', ',')}">×${String(v).replace('.', ',')}</button>`).join('')}
      <button data-act="tempsMort" aria-label="Temps mort, ${X.tm[moi]} restant${X.tm[moi] > 1 ? 's' : ''}" ${X.tm[moi] <= 0 ? 'disabled style="opacity:.4"' : ''}>TM ${X.tm[moi]}</button>
      <button data-act="son" aria-label="${REG.son ? 'Couper le son' : 'Activer le son'}" aria-pressed="${!!REG.son}">${REG.son ? '🔊' : '🔈'}</button>
      <button data-act="direct" aria-label="Aller à la fin du match">Fin ⏭</button>
    </div>` : ''}
  </div>
  ${avant ? avantMatchHTML() : ''}
  ${fini ? apresMatchHTML() : ''}
  ${!avant ? `<div class="cols live-cols"><div>${!fini && REG.synthese !== false ? `<div class="carte synth"><h2>Vue du dessus <button data-act="synthese" aria-label="Masquer la vue du dessus">Masquer</button></h2>${terrainLive()}<p class="stl" id="stl">${statsLive()}</p></div>` : !fini ? '<button class="btn sec plein" data-act="synthese" style="margin-bottom:12px">Afficher la vue du dessus</button>' : ''}
    ${!fini ? '<div class="carte adj" id="adj" hidden></div>' : ''}
    <div class="carte stm"><h2>Statistiques ${fini ? '' : '<span class="mut petit">en direct</span>'}</h2><div class="seg mini" role="tablist">${[['eq', 'Équipes'], ['moi', 'Mes joueurs'], ['adv', 'Adversaires']].map(([k, n]) => `<button role="tab" data-act="ongletStats" data-o="${k}" class="${(U.ongStats || 'eq') === k ? 'on' : ''}" aria-selected="${(U.ongStats || 'eq') === k}">${n}</button>`).join('')}</div><div id="stm">${statsMatchHTML()}</div></div></div>
    <div>${L.radio && L.radio.length ? `<div class="carte radio"><h2>Radio Sorcière FM <span class="mut petit">${fini ? 'scores à la fin de ton match' : 'les autres matchs'}</span></h2><div class="radio-g" id="radio">${radioHTML()}</div></div>` : ''}</div></div>
  <div class="carte"><h2>${fini ? 'Tout le match' : 'En direct'} ${!fini ? '<span class="badge" id="enjeu"></span>' : ''}</h2><div class="fil" id="fil">${(fini ? X.ev : X.ev.filter(montrer)).slice().reverse().map(evHTML).join('')}</div></div>` : ''}`;
  if (!avant && !fini){ majTerrain([]); majAdjoint(); majEnjeu(); }
}
const virg = x => (Math.round((x || 0) * 10) / 10).toFixed(1).replace('.', ',');
/* ---------- v89 : le direct enrichi : vue du dessus, radio, adjoint, temps forts, sons ---------- */
const FORM_LIVE = {avec:{P:{triangle:[[62, 28], [74, 50], [62, 72]], ligne:[[68, 14], [68, 50], [68, 86]], pointe:[[58, 26], [82, 50], [58, 74]]}, B:{escorte:[[54, 30], [54, 70]], devant:[[80, 22], [80, 78]]}, G:[11, 50]},
                   sans:{P:{pressing:[[56, 28], [62, 50], [56, 72]], zone:[[40, 26], [44, 50], [40, 74]], repli:[[24, 28], [28, 50], [24, 72]]}, B:{protection:[[18, 30], [18, 70]], harcelement:[[50, 28], [50, 72]]}, G:[6, 50]}};
const rgbDe = h => { h = (h || '#888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const ecart = (a, b) => { const x = rgbDe(a), y = rgbDe(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
function couleursLive(){
  const col = e => D.NATIONS[e.id] ? V.couleursNation(e.id) : (e.couleurs || ['#556', '#ddd']), GAZON = '#4f9d5c';
  const kit = (c, eviter) => { const f = [c[0], c[1], '#f4f4f4', '#1d2430'].find(x => ecart(x, GAZON) >= 100 && eviter.every(e => ecart(x, e) >= 110)) || c[0];
    const s = [c[1], c[0], '#16202c', '#ffffff'].find(x => ecart(x, f) >= 120) || '#ffffff'; return [f, s]; };
  const k0 = kit(col(X.e[0]), []); return [k0, kit(col(X.e[1]), [k0[0]])];
}
function terrainLive(){
  const [c0, c1] = couleursLive();
  const anneaux = x => [-12, 0, 12].map(dy => `<circle cx="${x}" cy="${56 + dy}" r="${dy ? 3 : 3.8}"/>`).join('');
  const jet = (k, id, p) => { const c = k ? c1 : c0;
    return `<g class="lj" id="lj-${id}" style="transform:translate(100px,56px)"><circle r="4.8" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.3"/>${p === 'A' ? '<circle r="1.5" fill="#f3d36b"/>' : p === 'G' ? `<rect x="-1.7" y="-1.7" width="3.4" height="3.4" fill="${c[1]}"/>` : p === 'B' ? `<path d="M-2.2 2.2l4.4-4.4" stroke="${c[1]}" stroke-width="1.4"/>` : ''}</g>`; };
  return `<svg class="tl" viewBox="0 0 200 112" role="img" aria-label="Le match vu du dessus : ${esc(X.e[0].nom)} attaque vers la droite"><rect width="200" height="112" rx="10" class="tl-gz"/>
    <path d="M100 5v102M6 56h0" class="tl-l"/><circle cx="100" cy="56" r="12" class="tl-l"/><path d="M38 5v102M162 5v102" class="tl-l tl-z"/>
    <g class="tl-ann">${anneaux(8)}${anneaux(192)}</g>
    ${[0, 1].flatMap(k => ['G', 'B', 'P', 'A'].flatMap(p => X.e[k][p].map(id => jet(k, id, p)))).join('')}
    <g id="lj-souafle" class="souafle" style="transform:translate(100px,56px)"><circle r="2.3"/></g>
    <g id="lj-vif" class="vifl" style="transform:translate(100px,56px);opacity:0"><path d="M-1.4 0l-3.4-1.8M1.4 0l3.4-1.8"/><circle r="1.9"/></g></svg>`;
}
function majTerrain(evs){
  const svg = document.querySelector('.tl'); if (!svg || !X) return;
  if (X.e.some(e => ['P', 'B', 'A', 'G'].some(p => e[p].some(id => !svg.querySelector('#lj-' + id))))){ svg.outerHTML = terrainLive(); return majTerrain(evs); }
  const n = X.pas, alea = s => { const x = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
  const P = {}, place = (id, k, u, v) => { const x = 8 + Math.max(0, Math.min(100, u)) * 1.84, y = 6 + Math.max(2, Math.min(98, v)); P[id] = [k ? 200 - x : x, y]; };
  const vifVisible = X.vif < 0 && X.vifVu && !X.vifCache, L = U.live;
  if (vifVisible){ L.vp = L.vp || [100, 30]; L.vp = [Math.max(20, Math.min(180, L.vp[0] + alea(91) * 26)), Math.max(10, Math.min(102, L.vp[1] + alea(92) * 20))]; }
  for (const k of [0, 1]){
    const e = X.e[k], T = QM.completerTactique({...e.tactique}), ph = X.poss === k ? 'avec' : 'sans', F = FORM_LIVE[ph];
    e.P.forEach((id, i) => { const [u, v] = F.P[ph === 'avec' ? T.avec : T.sans][i]; place(id, k, u + alea(i + k * 7) * 9, v + alea(i + 3 + k * 7) * 10); });
    e.B.forEach((id, i) => { const [u, v] = F.B[ph === 'avec' ? T.batAvec : T.batSans][i]; place(id, k, u + alea(20 + i + k) * 12, v + alea(24 + i + k) * 14); });
    e.G.forEach(id => place(id, k, F.G[0] + alea(30 + k) * 3, F.G[1] + alea(31 + k) * 16));
    e.A.forEach(id => { if (vifVisible){ const [x, y] = L.vp, cur = (L.pa || {})[id] || [100, k ? 96 : 16]; P[id] = [cur[0] + (x - cur[0]) * 0.45 + alea(40 + k) * 6, cur[1] + (y - cur[1]) * 0.45 + alea(41 + k) * 6]; }
      else place(id, k, 46 + alea(42 + k) * 30, k ? 92 + alea(43) * 6 : 10 + alea(44) * 6); });
  }
  L.pa = P;
  for (const [id, [x, y]] of Object.entries(P)){ const g = svg.querySelector('#lj-' + id); if (g) g.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
  const but = evs.find(ev => ev.but), ball = svg.querySelector('#lj-souafle');
  if (ball){ let bx, by;
    if (but){ bx = but.e === 0 ? 192 : 8; by = 56 + alea(50) * 18; }
    else { const car = X.e[X.poss].P[(n >> 2) % X.e[X.poss].P.length]; [bx, by] = P[car] || [100, 56]; bx += X.poss ? -3 : 3; by -= 3; }
    ball.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`; }
  const vif = svg.querySelector('#lj-vif');
  if (vif){ if (X.vif >= 0){ const sid = X.e[X.vif].A[0], p = P[sid] || [100, 56]; vif.style.opacity = 1; vif.style.transform = `translate(${p[0]}px,${p[1] - 4}px)`; }
    else if (vifVisible){ vif.style.opacity = 1; vif.style.transform = `translate(${L.vp[0].toFixed(1)}px,${L.vp[1].toFixed(1)}px)`; } else vif.style.opacity = 0; }
}
/* v97 : statistiques du match (équipes, nos joueurs avec leur physique, joueurs adverses), mises à jour en direct */
const ORD_P = {P:0, B:1, A:2, G:3};
function statsMatchHTML(){
  if (!X) return '';
  const o = U.ongStats || 'eq', S = X.stats, moi = X.joueur, adv = 1 - moi, N = QM.notesMatch(X);
  if (o === 'eq'){
    const pc = (a, b) => a + b ? [Math.round(a / (a + b) * 100), Math.round(b / (a + b) * 100)] : [50, 50];
    const prec = k => S[k].tirs ? Math.round(S[k].buts / S[k].tirs * 100) : 0;
    const fatM = k => { const L = QM.titulaires(X.e[k]); return Math.round(L.reduce((t, id) => t + (X.fat[id] || 0), 0) / (L.length || 1)); };
    const noteM = k => { const L = Object.entries(N).filter(([id]) => X.perf[id] && X.perf[id].eq === k).map(x => x[1]); return L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0; };
    const ps = pc(S[0].poss || 0, S[1].poss || 0);
    /* [libellé, valeur gauche, valeur droite, texte gauche, texte droit, plus haut = mieux ?] */
    const L = [['Possession', ps[0], ps[1], ps[0] + ' %', ps[1] + ' %', true], ['Tirs', S[0].tirs, S[1].tirs, , , true], ['Buts', S[0].buts, S[1].buts, , , true],
      ['Précision', prec(0), prec(1), prec(0) + ' %', prec(1) + ' %', true], ['Buts attendus', S[0].xb || 0, S[1].xb || 0, virg(S[0].xb), virg(S[1].xb), true],
      ['Arrêts', S[0].arrets, S[1].arrets, , , true], ['Cognards réussis', S[0].cog, S[1].cog, , , true], ['Fautes', S[0].fautes, S[1].fautes, , , false],
      ['Penalties obtenus', S[0].pen, S[1].pen, , , true], ['Note moyenne', noteM(0), noteM(1), virg(noteM(0)), virg(noteM(1)), true],
      ['Fatigue moyenne', fatM(0), fatM(1), fatM(0) + ' %', fatM(1) + ' %', false], ['Moral', X.moral[0], X.moral[1], nb1(X.moral[0]), nb1(X.moral[1]), true],
      ['Temps morts', X.tm[0], X.tm[1], , , true], ['Changements', X.rempl[0], X.rempl[1], , , true]];
    return `<div class="stm-t"><b>${esc(X.e[0].sigle || X.e[0].nom)}</b><span></span><b>${esc(X.e[1].sigle || X.e[1].nom)}</b></div>${L.map(([l, a, b, ta, tb, haut]) => { const t = Math.abs(a) + Math.abs(b) || 1, wa = Math.abs(a) / t * 100, mieux = a === b ? -1 : (a > b) === haut ? 0 : 1;
      return `<div class="stm-l"><span class="${mieux === 0 ? 'f' : ''}">${ta ?? a}</span><div><em>${l}</em><div class="stm-b"><i style="width:${wa}%" class="${mieux === 0 ? 'f' : ''}"></i><i style="width:${100 - wa}%" class="${mieux === 1 ? 'f' : ''}"></i></div></div><span class="${mieux === 1 ? 'f' : ''}">${tb ?? b}</span></div>`; }).join('')}`;
  }
  const k = o === 'moi' ? moi : adv, e = X.e[k], tit = QM.titulaires(e), banc = e.banc || [];
  const poste = id => ['P', 'B', 'A', 'G'].find(p => e[p].includes(id));
  const bl = new Set(X.bless.filter(b => b.eq === k).map(b => b.id));
  const jeu = (id, p) => { const q = X.perf[id] || {}; return p === 'P' ? `${q.b || 0} but${(q.b || 0) > 1 ? 's' : ''} / ${q.t || 0} tir${(q.t || 0) > 1 ? 's' : ''}` : p === 'B' ? `${q.cog || 0} cognard${(q.cog || 0) > 1 ? 's' : ''}` : p === 'G' ? `${q.arr || 0} arrêt${(q.arr || 0) > 1 ? 's' : ''} · ${q.enc || 0} enc.` : (q.vif ? 'vif d\'or !' : X.sonne[k] > 0 ? 'sonné' : '—'); };
  const ligne = (id, p, surBanc) => { const j = M.joueurs[id]; if (!j) return ''; const q = X.perf[id] || {}, fat = Math.round(X.fat[id] || 0), rend = Math.round(QM.rendement(X, k, id) * 100);
    const det = o === 'moi' ? `${!surBanc ? `rendement ${rend} % · ` : ''}moral ${j.moral} · forme ${virg(j.forme)} · charge ${Math.round(j.charge || 0)}${q.f ? ` · ${q.f} faute${q.f > 1 ? 's' : ''}` : ''}` : `${!surBanc ? `rendement ${rend} %` : 'remplaçant'}${q.f ? ` · ${q.f} faute${q.f > 1 ? 's' : ''}` : ''}`;
    return `<div class="stm-j${bl.has(id) ? ' bless' : ''}">${posteB(p)}<div class="t"><b>${esc(court(j))}${bl.has(id) ? ' <span class="badge" style="color:var(--mauvais)">blessé</span>' : ''}</b><span>${det}</span></div>
      <div class="stm-n">${surBanc || N[id] == null ? '—' : virg(N[id])}</div><div class="stm-a">${surBanc ? '' : jeu(id, p)}</div>
      <div class="stm-f" title="Fatigue ${fat} %"><div class="barre fat"><i style="width:${fat}%"></i></div><small class="${fat >= 70 ? 'mauvais' : fat >= 50 ? 'moyen' : ''}">${fat} %</small></div></div>`; };
  const tri = L => L.slice().sort((a, b) => ORD_P[poste(a) || M.joueurs[a].poste] - ORD_P[poste(b) || M.joueurs[b].poste]);
  return `<div class="stm-h"><span></span><span>Joueur</span><span>Note</span><span>Match</span><span>Fatigue</span></div>${tri(tit).map(id => ligne(id, poste(id), false)).join('')}
    ${banc.length ? `<h4 class="stm-g">Banc</h4>${banc.map(id => ligne(id, M.joueurs[id] ? M.joueurs[id].poste : 'P', true)).join('')}` : ''}
    <p class="petit mut" style="margin:8px 0 0">Rendement : ce que le joueur donne en ce moment (fatigue, forme, moral). ${o === 'moi' ? 'Charge : fatigue cumulée des dernières semaines.' : 'Leur moral et leur charge ne se voient pas depuis le banc.'}</p>`;
}
function statsLive(){ const S = X.stats; return `Tirs <b>${S[0].tirs}–${S[1].tirs}</b> · Buts attendus <b>${virg(S[0].xb)}–${virg(S[1].xb)}</b> · Cognards <b>${S[0].cog}–${S[1].cog}</b>`; }
/* radio : les autres matchs de la semaine, simulés d'avance (même graine que plus tard) et dévoilés minute par minute */
function preparerRadio(){
  const S = QM.semaine(M), mj = QM.matchDuJoueur(M); if (!S || !mj) return [];
  const ligue = mj.ligue;
  return S.matchs.filter(m => m.id !== mj.id && !m.res).sort((a, b) => (b.ligue === ligue) - (a.ligue === ligue)).slice(0, 8).map(m => {
    const Y = QM.simulerMatch(M, m); return {dom:m.dom, ext:m.ext, sixn:m.ligue === 'sixn', ev:Y.ev.filter(e => e.but || e.fin).map(e => [e.t, e.sc]), fin:Y.t, score:Y.score.slice()}; });
}
function radioHTML(){
  const t = X.fini ? Infinity : X.t, sig = (id, sx) => esc(sx || D.NATIONS[id] ? nat(id).court : club(id).sigle);
  return (U.live.radio || []).map(r => { const fini = t >= r.fin, sc = fini ? r.score : (r.ev.filter(e => e[0] <= t).pop() || [0, [0, 0]])[1];
    return `<div class="rd${fini ? ' fin' : ''}"><span>${sig(r.dom, r.sixn)}</span><b>${sc[0]}–${sc[1]}</b><span>${sig(r.ext, r.sixn)}</span><i>${fini ? 'fin' : Math.floor(Math.min(t, r.fin) / 60) + "'"}</i></div>`; }).join('');
}
/* l'adjoint : deux conseils au plus, appliqués au prochain temps mort */
function conseils(){
  if (!X || X.fini) return [];
  const moi = X.joueur, T = QM.completerTactique({...X.e[moi].tactique}), To = X.e[1 - moi].tactique, d = X.score[moi] - X.score[1 - moi], S = X.stats, L = [], min = X.t / 60;
  if (d < -150 && T.attrapeur === 'chasse') L.push(['Mené de plus de 150 points : ton attrapeur doit attendre (« Si ça fait gagner »).', 'attrapeur', 'gagnant']);
  const sd = QM.sansDe(To), cz = QM.CONTRE[sd];
  if (min >= 3 && cz && T.zone !== cz) L.push([`Ils défendent en ${nomOpt('sans', sd).toLowerCase()} : attaque ${cz === 'loin' ? 'de loin' : cz === 'axe' ? 'par l\'axe' : 'par les couloirs'}.`, 'zone', cz]);
  if (min > 12 && (S[1 - moi].xb || 0) - (S[moi].xb || 0) > 3 && T.sans !== 'repli') L.push(['Ils se créent plus d\'occasions que nous : resserre-toi en repli.', 'sans', 'repli']);
  if (d > 120 && T.rythme > 1) L.push(['On mène largement : baisse le rythme pour garder des forces.', 'rythme', 1]);
  if (d < -40 && min > 35 && T.risque < 3) L.push(['Il faut revenir au score : prends plus de risques.', 'risque', 3]);
  const tit = QM.titulaires(X.e[moi]), fat = Math.round(tit.reduce((s, id) => s + (X.fat[id] || 0), 0) / (tit.length || 1));
  if (fat > 55 && X.rempl[moi] > 0) L.push([`Les jambes sont lourdes (fatigue moyenne ${fat} %) : fais tourner au prochain temps mort.`, null, null]);
  return L.slice(0, 2);
}
function majAdjoint(){
  const el = $('#adj'); if (!el) return;
  const L = conseils(); el.hidden = !L.length; if (!L.length) return;
  el.innerHTML = `<h2>L'adjoint</h2>${L.map(c => `<p>${esc(c[0])}</p>`).join('')}${X.tm[X.joueur] > 0 ? `<button class="btn sec" data-act="tempsMort">Temps mort (${X.tm[X.joueur]})</button>` : '<p class="petit mut" style="margin:0">Plus de temps mort : à garder pour la prochaine fois.</p>'}`;
}
/* temps forts : tout montrer quand le match est serré, l'essentiel quand il est plié */
function enjeu(){ if (!X) return 'fort'; const d = Math.abs(X.score[0] - X.score[1]); return d <= 70 || (X.vifVu && !X.vifCache) || X.sixn ? 'fort' : d >= 150 ? 'faible' : 'moyen'; }
function montrer(ev){
  if (REG.resumes === 'tout' || !ev.txt) return true;
  if (ev.cle || /^(vif|fin|remplacement|temps_mort|penalty|blessure|faute_grave|debut)/.test(ev.k)) return true;
  const e = enjeu(); return e === 'fort' || (e === 'moyen' && !!ev.but);
}
function majEnjeu(){ const b = $('#enjeu'); if (!b) return; const e = REG.resumes === 'tout' ? 'tout' : enjeu(); b.textContent = {tout:'tout le match', fort:'match serré : tout', moyen:'temps forts', faible:'match plié : l\'essentiel'}[e]; }
/* sons de stade, fabriqués à la volée (Web Audio), coupés par défaut */
const Son = (() => {
  let ctx = null, foule = null, gainF = null;
  const pret = () => { if (!REG.son) return null; if (!ctx){ try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch{ return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function bruit(c){ const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++){ l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } return b; }
  return {
    demarrer(){ const c = pret(); if (!c || foule) return; const s = c.createBufferSource(); s.buffer = bruit(c); s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
      gainF = c.createGain(); gainF.gain.value = 0.0001; s.connect(f).connect(gainF).connect(c.destination); s.start(); gainF.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 1.5); foule = s; },
    arreter(){ if (foule && ctx){ try{ gainF.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25); foule.stop(ctx.currentTime + 1.2); }catch{} } foule = null; },
    clameur(f){ if (!gainF || !ctx) return; const t = ctx.currentTime; try{ gainF.gain.cancelScheduledValues(t); gainF.gain.setValueAtTime(Math.max(0.0001, gainF.gain.value), t); gainF.gain.linearRampToValueAtTime(0.16 + 0.55 * f, t + 0.2); gainF.gain.exponentialRampToValueAtTime(0.16, t + 2.4); }catch{} },
    sifflet(long){ const c = pret(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), t = c.currentTime, d = long ? 0.9 : 0.3;
      o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 140; lfo.connect(lg).connect(o.frequency); g.gain.value = 0.0001; o.connect(g).connect(c.destination);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.03); g.gain.setValueAtTime(0.1, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08); o.start(t); lfo.start(t); o.stop(t + d + 0.1); lfo.stop(t + d + 0.1); },
    carillon(){ const c = pret(); if (!c) return; [1318.5, 1760, 2637].forEach((fq, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.09; o.frequency.value = fq; g.gain.value = 0.0001; o.connect(g).connect(c.destination);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.start(t); o.stop(t + 0.65); }); },
  };
})();
function evHTML(ev){
  if (!ev.txt) return '';
  const coul = ev.e >= 0 ? X.e[ev.e].couleurs[0] : '';
  const cls = ['ev', ev.but ? 'but' : '', ev.cle ? 'cle' : '', /^vif|fin_perdu/.test(ev.k) ? 'vif' : ''].join(' ');
  return `<div class="${cls}" style="${coul ? '--ce:' + coul : ''}"><span class="m">${Math.floor(ev.t / 60)}'</span><span class="x">${esc(ev.txt)}</span></div>`;
}
function avantMatchHTML(){
  const moi = X.joueur, e = X.e[moi], T = e.tactique;
  const ch = (X.changements || []).filter(([a, b]) => M.joueurs[b]).map(([a, b]) => M.joueurs[a] ? `${court(M.joueurs[a])} → ${court(M.joueurs[b])}` : `${court(M.joueurs[b])} (poste vide)`).join(', ');
  const A = TT() ? TT().adequationCompo(M, {P:e.P, B:e.B, A:e.A, G:e.G, roles:e.roles || {}}, QM.completerTactique(T)) : {};
  let R = null, P = null; if (!X.sixn && TT()) try { const m = QM.matchDuJoueur(M); R = TT().rapport(M, m); P = prevoirLive(X.joueur); } catch (er){ console.warn('QM27 avant-match', er); }
  return `${divinationHTML()}${R ? adversaireHTML(R, QM.completerTactique(T)).replace(/data-act="consigne"/g, 'data-act="consigneAvant"') : ''}${P ? previsionHTML(P, R, 'consigneAvant') : ''}${causerieHTML('avant')}${parisHTML()}<div class="carte"><h2>Ta composition <button data-act="vue" data-v="${X.sixn ? 'selection' : 'tactique'}">Modifier</button></h2>
    ${ch ? `<p class="petit" style="margin:0 0 8px;color:var(--moyen)">Remplacés (blessure ou sélection) : ${esc(ch)}</p>` : ''}
    <div class="liste">${['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => { const j = M.joueurs[id], a = A[id]; return `<div class="el">${posteB(p)}<div class="t"><b>${pastille(a)} ${flag(j.nat)} ${esc(nomJ(j))}</b><span>Forme ${j.forme} · fatigue ${j.fat} %${a && a.raisons.length ? ' · ' + esc(a.raisons[0]) : ''}</span></div><span class="note ${classeNote(QM.note(j, p))}">${QM.note(j, p)}</span></div>`; })).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Attrapeur : ${esc(nomOpt('attrapeur', T.attrapeur))} · rythme ${esc(nomOpt('rythme', T.rythme))} · avec le souafle : ${esc(nomOpt('avec', T.avec).toLowerCase())}, par ${esc(nomOpt('zone', T.zone).toLowerCase())} · sans : ${esc(nomOpt('sans', QM.sansDe(T)).toLowerCase())}</p></div>
  <div class="btns"><button class="btn or" data-act="lancer">Lancer le direct</button><button class="btn sec" data-act="direct">Résultat direct</button></div>
  <button class="btn sec plein" data-act="vue" data-v="accueil">Plus tard</button>`;
}
/* v96 : l'analyse de l'adjoint, calculée une fois à la fin du match */
function analyseHTML(){
  if (!TT() || !X || !X.fini) return '';
  if (!X.analyse) try { X.analyse = TT().analyse(M, X); } catch (er){ X.analyse = []; console.warn('QM27 analyse', er); }
  if (!X.analyse.length) return '';
  return `<div class="carte analyse"><h2>Analyse de l'adjoint</h2><ul class="an">${X.analyse.map(([t, txt]) => `<li class="${t}">${esc(txt)}</li>`).join('')}</ul></div>`;
}
/* prévision sur le match en cours ou à venir (X), forme du jour neutralisée */
function prevoirLive(k){
  if (!TT() || !X) return null;
  const jour = X.jour; X.jour = [1, 1];
  try { return TT().prevoir({X, k}, QM.completerTactique({...X.e[k].tactique})); } finally { X.jour = jour; }
}
function apresMatchHTML(){
  const moi = X.joueur, S = X.stats, N = QM.notesMatch(X), r = X.score[moi] - X.score[1 - moi];
  const titre = r > 0 ? 'Victoire !' : r < 0 ? 'Défaite' : 'Match nul';
  const vifJ = X.e[X.vif].A[0], vifNom = M.joueurs[vifJ] ? nomJ(M.joueurs[vifJ]) : '';
  const notes = Object.entries(N).filter(([id]) => X.perf[id] && X.perf[id].eq === moi).sort((a, b) => b[1] - a[1]);
  const homme = Object.entries(N).sort((a, b) => b[1] - a[1])[0];
  return `<div class="carte" style="border-color:${r > 0 ? 'var(--bon)' : r < 0 ? 'var(--mauvais)' : 'var(--line)'}"><h2>${titre}</h2>
    <p style="margin:0 0 4px">Vif d'or attrapé par <b>${esc(vifNom)}</b> (${esc(X.e[X.vif].nom)}) à la ${Math.round(X.t / 60)}e minute.</p>
    ${homme ? `<p class="sous" style="margin:0 0 10px">Homme du match : ${esc(nomJ(M.joueurs[homme[0]]))} (${homme[1]})</p>` : ''}
    <div class="stat">${[['buts', 'Buts'], ['xb', 'Buts attendus'], ['tirs', 'Tirs'], ['arrets', 'Arrêts'], ['cog', 'Cognards réussis'], ['fautes', 'Fautes'], ['pen', 'Penalties obtenus']].map(([k, n]) => `<span>${k === 'xb' ? virg(S[0].xb) : S[0][k]}</span><span>${n}</span><span>${k === 'xb' ? virg(S[1].xb) : S[1][k]}</span>`).join('')}</div>
    <button class="btn plein" style="margin-top:14px" data-act="finMatch">Continuer</button></div>
  ${analyseHTML()}
  ${presseHTML()}
  <div class="carte"><h2>Notes de ton équipe</h2><div class="liste">${notes.map(([id, n]) => { const j = M.joueurs[id], p = X.perf[id];
    return `<div class="el">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${[p.b ? p.b + ' but' + (p.b > 1 ? 's' : '') : '', p.arr ? p.arr + ' arrêt' + (p.arr > 1 ? 's' : '') : '', p.cog ? p.cog + ' cognard' + (p.cog > 1 ? 's' : '') : '', p.vif ? 'vif d\'or' : ''].filter(Boolean).join(' · ') || '—'}</span></div><span class="note ${n >= 7 ? 'n4' : n >= 6 ? 'n3' : n >= 5 ? 'n2' : 'n1'}">${n.toFixed(1)}</span></div>`; }).join('')}</div></div>`;
}
/* direct */
function demarrerDirect(){ U.live = {parti:true, pause:false, timer:null, radio:preparerRadio()}; rendre(); Son.demarrer(); Son.sifflet(true); boucle(); }
function boucle(){
  clearInterval(U.live && U.live.timer);
  if (!U.live || U.live.pause || X.fini) return;
  U.live.timer = setInterval(tic, 1000 / (4 * REG.vitesse));
}
function tic(){
  if (!X || X.fini){ clearInterval(U.live.timer); return; }
  const evs = QM.pas(X);
  const fil = $('#fil');
  if (fil) for (const ev of evs){ if (!montrer(ev)) continue; const h = evHTML(ev); if (h) fil.insertAdjacentHTML('afterbegin', h); }
  for (const ev of evs){ if (ev.but) Son.clameur(ev.e === X.joueur ? 1 : 0.45); if (ev.k === 'vif_apercu' && ev.vif === 'vu') Son.carillon(); if (/^penalty|^faute_grave/.test(ev.k)) Son.sifflet(false); }
  majTableau(); majTerrain(evs);
  const st = $('#stl'); if (st) st.innerHTML = statsLive();
  const sm = $('#stm'), now = Date.now(); if (sm && now - (U.live.stmT || 0) > 900){ U.live.stmT = now; sm.innerHTML = statsMatchHTML(); }
  if (X.pas % 4 === 0){ const rd = $('#radio'); if (rd) rd.innerHTML = radioHTML(); majEnjeu(); }
  if (X.pas % 12 === 0) majAdjoint();
  if (X.fini){ clearInterval(U.live.timer); Son.sifflet(true); Son.clameur(X.vif === X.joueur ? 1 : 0.3); setTimeout(() => Son.arreter(), 2500); setTimeout(() => { rendre(); scrollTo({top:0, behavior:'smooth'}); }, 1100); return; }
  const k = evs.find(ev => ev.cle && ((ev.k === 'blessure' && REG.pauses.blessure) || (ev.k === 'faute_grave' && REG.pauses.faute_grave) || (ev.k === 'vif_apercu' && ev.vif === 'vu' && REG.pauses.vif_apercu)));
  if (k) pauseAuto(k);
}
function majTableau(){
  const sc = $('#sc'), mm = $('#mm'), vb = $('#vifb');
  if (sc) sc.textContent = `${X.score[0]} – ${X.score[1]}`;
  if (mm) mm.textContent = String(Math.floor(X.t / 60)).padStart(2, '0') + ':' + String(X.t % 60).padStart(2, '0');
  if (vb){ const etat = X.vif >= 0 ? 'pris' : (X.vifVu && !X.vifCache) ? 'vu' : ''; vb.className = 'vifb ' + etat;
    vb.innerHTML = `<i></i>${X.vif >= 0 ? 'Vif d\'or attrapé' : !X.vifVu ? 'Vif d\'or pas encore vu' : X.vifCache ? 'Vif d\'or caché' : 'Vif d\'or en vue !'}`; }
}
function pauseAuto(ev){
  U.live.pause = true; clearInterval(U.live.timer);
  const old = document.querySelector('.pause'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'pause'; d.setAttribute('role', 'alertdialog');
  d.innerHTML = `<p>⏸ ${esc(ev.txt)}</p><div class="btns"><button class="btn" data-act="reprendre">Reprendre</button>${X.tm[X.joueur] > 0 ? '<button class="btn sec" data-act="tempsMort">Temps mort</button>' : ''}</div>`;
  document.body.appendChild(d); rendreCtrl();
}
function rendreCtrl(){ const b = document.querySelector('.ctrl [data-act="lecture"]'); if (b){ b.textContent = U.live.pause ? '▶︎' : '❚❚'; b.setAttribute('aria-label', U.live.pause ? 'Reprendre' : 'Pause'); } }
function reprendre(){ const d = document.querySelector('.pause'); if (d) d.remove(); if (!U.live) return; U.live.pause = false; rendreCtrl(); boucle(); }
function ouvrirTempsMort(){
  const moi = X.joueur;
  if (!QM.tempsMort(X, moi)) return;
  const d = document.querySelector('.pause'); if (d) d.remove();
  U.live.pause = true; U.live.tm = true; clearInterval(U.live.timer);
  const fil = $('#fil'); if (fil){ const ev = X.ev[X.ev.length - 1]; fil.insertAdjacentHTML('afterbegin', evHTML(ev)); }
  rendreTempsMort();
  const b = document.querySelector('.ctrl [data-act="tempsMort"]'); if (b){ b.textContent = `TM ${X.tm[moi]}`; if (!X.tm[moi]){ b.disabled = true; b.style.opacity = '.4'; } }
}
function rendreTempsMort(){
  const moi = X.joueur, e = X.e[moi];
  const tit = ['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => [p, id]));
  const sel = U.live.sortant;
  feuille(`${teteF('Temps mort', `${X.rempl[moi]} changement${X.rempl[moi] > 1 ? 's' : ''} libre${X.rempl[moi] > 1 ? 's' : ''} · ${Math.floor(X.t / 60)}e minute`)}
    ${conseils().filter(c => c[1]).length ? `<div class="carte adj"><h2>L'adjoint</h2>${conseils().filter(c => c[1]).map(c => `<div class="ligne" style="gap:10px;margin-bottom:8px"><span style="flex:1">${esc(c[0])}</span><button class="btn sec" data-act="consigneLive" data-k="${c[1]}" data-v="${c[2]}">Appliquer</button></div>`).join('')}</div>` : ''}
    ${(() => { let P = null; try { P = prevoirLive(moi); } catch (er){} return P ? previsionHTML(P, null, 'consigneLive', true) : ''; })()}
    <div class="carte cons-c" style="margin-top:10px"><h2>Consignes</h2>${consignesHTML(QM.completerTactique(e.tactique), 'consigneLive', ['rythme', 'risque', 'agressivite', 'passes', 'avec', 'batAvec', 'zone', 'sans', 'batSans', 'cible', 'attrapeur'], {fit:fitOption({P:e.P, B:e.B, A:e.A, G:e.G, roles:e.roles || {}}, e.tactique)})}</div>
    <div class="carte" style="margin-top:10px"><h2>${sel ? 'Qui entre ?' : 'Remplacement : qui sort ?'}</h2><div class="liste">
    ${sel ? (e.banc || []).map(id => { const j = M.joueurs[id]; const p = ['P', 'B', 'A', 'G'].find(q => e[q].includes(sel)); return `<button class="el" data-act="entre" data-j="${id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>Note au poste ${QM.note(j, p)} · fatigue ${Math.round(X.fat[id] || 0)} %</span></div></button>`; }).join('') || '<p class="mut">Plus personne sur le banc.</p>'
      : tit.map(([p, id]) => { const j = M.joueurs[id]; return `<button class="el" data-act="sort" data-j="${id}" ${X.rempl[moi] <= 0 ? 'disabled style="opacity:.5"' : ''}>${posteB(p)}<div class="t"><b>${esc(nomJ(j))}</b><span>Fatigue ${Math.round(X.fat[id])} %</span></div></button>`; }).join('')}
    </div></div>
    ${causerieHTML('tm')}
    <button class="btn plein" style="margin-top:12px" data-act="fermer">Reprendre le match</button>`, true);
}
function reprendreApresTM(){ U.live.tm = false; U.live.sortant = null; reprendre(); }
function finDuMatch(){
  Son.arreter();
  const m = QM.matchDuJoueur(M);
  clearInterval(U.live && U.live.timer);
  if (TT() && !X.analyse) try { X.analyse = TT().analyse(M, X); } catch (er){ X.analyse = []; }
  const an = (X.analyse || []).filter(x => x[0] !== 'info' || x[1].startsWith('Occasions'));
  const fin = QM.finirMatchDuJoueur(M, X);   // v91 : s'il reste le match du club cette semaine, on y revient
  if (an.length) QM.message(M, `Analyse de l'adjoint : ${X.e[X.joueur].nom} ${X.score[X.joueur]}–${X.score[1 - X.joueur]} ${X.e[1 - X.joueur].nom}`, an.map(x => (x[0] === 'bon' ? '✓ ' : x[0] === 'mauvais' ? '✗ ' : '· ') + x[1]).join('\n'), 'staff');
  const moi = X.joueur, r = X.score[moi] - X.score[1 - moi];
  M.dernierMatch = {dom:m.dom, ext:m.ext, score:m.res.score, sixn:m.ligue === 'sixn', resume:`${r > 0 ? 'Victoire' : r < 0 ? 'Défaite' : 'Nul'} · ${m.res.duree} min · vif d'or ${esc(X.e[X.vif].sigle)}`, id:m.id};
  X = null; U.live = null; U.vue = 'accueil';
  sauver(); rendre(); scrollTo(0, 0);
  toast(fin.semaineFinie ? 'Journée terminée · résultats dans le calendrier' : m.ligue === 'eu' ? 'Match européen terminé · place au championnat' : 'Match de sélection terminé · place au match du club');
}

Object.assign(VUES, {vestiaire:vueVestiaire, domaine:vueDomaine, boutique:vueBoutique, partenaires:vuePartenaires, trophees:vueTrophees, carriere:vueCarriere, stade:vueStade, formation:vueFormation, selection:vueSelection, accueil:vueAccueil, tactique:vueTactique, classements:vueClassements, sauvegardes:vueSauvegardes, aide:vueAide, match:vueMatch,
  mercato:vueMercato, finances:vueFinances, staff:vueStaff});   // v91 : club, effectif, calendrier, plus, entraînement… dans qm27-ecrans.js

/* ---------- Actions ---------- */
const ACT = {
  retour:() => { if (PROF > 0) history.back(); else aller('accueil'); },
  maison:() => { retirerFeuille(); aller('accueil'); },
  quitterKiosk:() => { if (!confirm('Quitter le jeu et revenir à KiosK ? La partie est enregistrée.')) return; sauver().then(() => { location.href = 'index.html'; }); },
  fermer:fermerFeuille,
  vue:d => { retirerFeuille(); if (U.live && !U.live.parti){ U.live = null; X = null; } aller(d.v); },
  nouvelle:d => { U.etape = 'club'; U.empNeuf = +d.n; MONDE_NEUF = null; rendre(); scrollTo(0, 0); },
  annulerNeuf:() => { U.etape = null; MONDE_NEUF = null; rendre(); },
  ligueChoix:d => { U.ligueChoix = d.l; rendre(); },
  voirClub:d => ficheClubNeuf(d.c),
  prendreClub:d => { M = QM.choisirClub(MONDE_NEUF, d.c, (U.nom || '').trim() || 'Manager'); EMP = U.empNeuf; MONDE_NEUF = null; U.etape = null; U.vue = 'accueil'; fermerFeuille(); sauver(); rendre(); scrollTo(0, 0); },
  charger:async d => { try{ await chargerEmp(+d.n); racine(); rendre(); scrollTo(0, 0); }catch(e){ toast(e.message); } },
  menuEmp:d => { const e = emplacements()[d.n] || {};
    feuille(`${teteF(esc(e.nomClub || 'Emplacement ' + d.n), `${esc(e.manager || '')} · ${esc(e.saison || '')}`)}<div class="btns" style="flex-direction:column"><button class="btn sec" data-act="exporter" data-n="${d.n}">Exporter (fichier .json)</button><button class="btn sec" data-act="effacerEmp" data-n="${d.n}" style="color:var(--mauvais)">Supprimer cette partie</button></div>`); },
  effacerEmp:async d => { if (!confirm('Supprimer définitivement cette partie ?')) return; await Base.effacer('p' + d.n); const L = emplacements(); delete L[d.n]; LS.ecrire(K_EMP, L); fermerFeuille(); toast('Partie supprimée'); rendre(); },
  exporter:async d => {
    const txt = (M && +d.n === EMP) ? QM.serialiser(M) : await Base.lire('p' + d.n);
    if (!txt) return toast('Rien à exporter');
    const e = emplacements()[d.n] || {}, nom = `qm27-${(e.club || 'partie')}-${(e.saison || '').replace(/\W/g, '')}.json`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type:'application/json'})); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    fermerFeuille(); toast('Fichier prêt : ' + nom);
  },
  importer:() => $('#fichier').click(),
  quitter:() => { sauver(); M = null; EMP = null; X = null; U.vue = 'accueil'; rendre(); scrollTo(0, 0); },
  sauverMain:async () => { await sauver(); toast('Partie enregistrée'); rendre(); },
  joueur:d => { FJ = null; ficheJoueur(d.j); },
  fjPoste:d => { if (!FJ) return; if (FJ.p !== d.p){ FJ.p = d.p; FJ.role = null; } ficheJoueur(FJ.id, true); },   // v101 : lire la fiche pour un autre poste
  fjRole:d => { if (!FJ) return; FJ.role = FJ.role === d.r ? null : d.r; ficheJoueur(FJ.id, true); },
  fjRaz:() => { if (!FJ) return; const j = M.joueurs[FJ.id]; FJ = null; if (j) ficheJoueur(j.id, true); },
  ligue:d => { U.ligue = d.l; rendre(); },
  semaine:d => ficheSemaine(+d.s),
  jeton:d => ficheJeton(d.slot),
  causerie:d => { const r = HH().causerie(M, X, X.joueur, d.t, d.m); X.moral[X.joueur] = Math.max(-3, Math.min(3, X.moral[X.joueur] + r.delta)); r.txt = `${(HH().TONS.find(t => t[0] === d.t) || [, d.t])[1]} : ${r.txt}`;
    if (d.m === 'avant') X.causerieAvant = r; else { X.causerieTM = X.tm[X.joueur]; X.causerieTxt = r.txt; }
    toast(r.avis === 'bon' ? 'Message reçu 👍' : r.avis === 'mauvais' ? 'Message mal passé 👎' : 'Message entendu');
    if (d.m === 'avant') rendre(); else rendreTempsMort(); },
  presse:d => { if (!QP()) return; QP().conference(M, X, REG.presseN || 3); QP().repondre(M, X, +d.r); rendre(); const c = document.querySelector('.carte.presse'); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({block:'start', behavior:'smooth'}); },
  parier:d => { const r = HH().parier(M, X, +d.m); toast(r.msg); rendre(); },
  soudoyer:() => { if (!confirm('Soudoyer le gardien adverse ? Si le ministère l\'apprend, la sanction sera lourde.')) return; const r = HH().soudoyer(M, X); toast(r.msg); rendre(); },
  mentor:() => { const a = $('#mentorA'), b = $('#mentorB'); if (!a || !b) return; const r = HH().mentorer(M, a.value, b.value); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  finMentor:d => { HH().finMentorat(M, d.j); sauver(); rendre(); },
  son:() => { REG.son = !REG.son; regler(); if (REG.son && U.live && U.live.parti && !X.fini){ Son.demarrer(); } else Son.arreter(); const b = document.querySelector('.ctrl [data-act="son"]'); if (b){ b.textContent = REG.son ? '🔊' : '🔈'; b.setAttribute('aria-pressed', !!REG.son); b.setAttribute('aria-label', REG.son ? 'Couper le son' : 'Activer le son'); } },
  synthese:() => { REG.synthese = REG.synthese === false; regler(); rendre(); },
  phase:d => { U.phase = d.p; rendre(); },
  zoneAtt:d => { const ctx = ctxCompo(); ctx.T.zone = d.z; sauver(); rendre(); toast(`Attaque : ${nomOpt('zone', d.z).toLowerCase()}`); },
  tireurPen:d => { const ctx = ctxCompo(); ctx.K.pen = d.j; ctx.valider(); sauver(); fermerFeuille(); rendre(); toast(`${court(M.joueurs[d.j])} tirera les penalties`); },
  panneau:() => { const desk = document.documentElement.classList.contains('desk'); U.panneau = !(U.panneau ?? desk); rendre(); },
  enReserve:d => { fermerFeuille(); placerSlot(ctxCompo(), d.j, null); },
  slot:d => choisirPour(d.p, +d.i, false),
  slotBanc:d => choisirPour(d.p, +d.i, true),
  mettre:d => mettre(d.j, d.p, +d.i, d.b === '1'),
  compoAuto:() => { const c = club(M.manager.club); c.compo = QM.compoAuto(M, c.id); sauver(); rendre(); toast('Meilleure composition selon les notes'); },
  consigne:d => { const T = club(M.manager.club).tactique; T[d.k] = /^\d$/.test(d.v) ? +d.v : d.v; sauver(); rendre(); },
  consigneAvant:d => { const v = /^\d$/.test(d.v) ? +d.v : d.v; if (X && !X.sixn) club(M.manager.club).tactique[d.k] = v; if (X) X.e[X.joueur].tactique[d.k] = v; sauver(); rendre(); toast('Consigne appliquée'); },
  infoCons:d => { U.infoCons = U.infoCons && U.infoCons[0] === d.a && U.infoCons[1] === d.k ? null : [d.a, d.k]; if (d.a === 'consigneLive') rendreTempsMort(); else rendre(); },
  consigneLive:d => { const T = X.e[X.joueur].tactique; T[d.k] = /^\d$/.test(d.v) ? +d.v : d.v; rendreTempsMort(); },
  sort:d => { U.live.sortant = d.j; rendreTempsMort(); },
  entre:d => { const ok = QM.remplacer(X, X.joueur, U.live.sortant, d.j, false); U.live.sortant = null;
    if (ok){ const fil = $('#fil'); if (fil) fil.insertAdjacentHTML('afterbegin', evHTML(X.ev[X.ev.length - 1])); } rendreTempsMort(); },
  preparer:() => { const m = QM.matchDuJoueur(M); if (!m) return rendre(); X = QM.preparerMatch(M, m); U.live = {parti:false}; aller('match'); },
  lancer:() => demarrerDirect(),
  lecture:() => { if (!U.live) return; if (U.live.pause) reprendre(); else { U.live.pause = true; clearInterval(U.live.timer); rendreCtrl(); } },
  reprendre,
  ongletStats:d => { U.ongStats = d.o; document.querySelectorAll('.stm [data-act="ongletStats"]').forEach(b => { b.classList.toggle('on', b.dataset.o === d.o); b.setAttribute('aria-selected', b.dataset.o === d.o); }); const sm = $('#stm'); if (sm) sm.innerHTML = statsMatchHTML(); },
  vitesse:d => { REG.vitesse = +d.v; regler(); document.querySelectorAll('.ctrl [data-act="vitesse"]').forEach(b => b.classList.toggle('on', +b.dataset.v === REG.vitesse)); boucle(); },
  tempsMort:ouvrirTempsMort,
  direct:() => { const tq = document.querySelector('.toast-qm'); if (tq) tq.remove(); if (U.live) clearInterval(U.live.timer); const p = document.querySelector('.pause'); if (p) p.remove(); U.live = Object.assign(U.live || {}, {parti:true, pause:true}); QM.jusquAuBout(X); rendre(); scrollTo(0, 0); },
  finMatch:finDuMatch,
  voirDernier:() => { const d = M.dernierMatch; if (!d) return; const s = M.calendrier.findIndex(x => x.matchs.some(m => m.id === d.id)); if (s >= 0) ficheSemaine(s); },
  role:d => ficheRole(d.j, d.p),
  choisirRole:d => { const k = club(M.manager.club).compo; k.roles = k.roles || {}; k.roles[d.j] = d.r; sauver(); retirerFeuille(); rendre(); },
  capitaine:d => { club(M.manager.club).compo.cap = d.j; sauver(); retirerFeuille(); rendre(); toast('Nouveau capitaine'); },
  merc:d => { MERC.onglet = d.o; MERC.vu = 1; rendre(); },
  mercPoste:d => { MERC.poste = d.p; garderMerc(); if (document.querySelector('.fond')) ficheFiltres(); else rendre(); },
  mercFiltres:() => ficheFiltres(),
  mercVoir:() => { fermerFeuille(); if (!['recherche', 'libres'].includes(MERC.onglet)) MERC.onglet = 'recherche'; rendre(); },
  mercRaz:() => { Object.assign(MERC, {poste:'tous', age:99, ageMin:15, moyens:false, valMax:0, salMax:0, noteMin:0, nat:'', fin:false, attr:''}); garderMerc(); ficheFiltres(); },
  mercRetire:d => { const def = {poste:'tous', age:99, valMax:0, salMax:0, noteMin:0, nat:'', fin:false, moyens:false, attr:''}; if (d.k === 'age'){ MERC.age = 99; MERC.ageMin = 15; } else MERC[d.k] = def[d.k]; garderMerc(); rendre(); },
  mercTri:d => { MERC.tri = d.t; garderMerc(); rendre(); },
  suivre:d => { const on = C.suivre(M, d.j); sauver(); toast(on ? 'Joueur supervisé : ton recruteur le suit de près' : 'Plus supervisé'); ficheJoueur(d.j); },
  vendre:d => { const on = C.mettreEnVente(M, d.j); sauver(); toast(on ? 'Mis en vente : les offres arrivent pendant le mercato' : 'Retiré de la vente'); ficheJoueur(d.j); if (U.vue === 'effectif' || U.vue === 'mercato') rendre(); },
  liberer:d => { const j = M.joueurs[d.j]; if (!confirm(`Résilier le contrat de ${nomJ(j)} ? Coût : ${eurT(C.coutLiberation(M, j))}.`)) return; const r = C.liberer(M, d.j); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  offre:d => { OFFRE = null; ficheOffre(d.j, 'transfert'); },
  prolonger:d => { OFFRE = null; ficheOffre(d.j, 'prolonger'); },
  pasOffre:d => { const k = d.k, v = OFFRE[k], st = k === 'sal' ? (v >= 10000 ? 500 : 250) : (v >= 1e6 ? 100000 : 25000); OFFRE[k] = Math.max(0, v + (+d.d) * st); OFFRE.msg = ''; ficheOffre(OFFRE.j, OFFRE.mode); },
  ansOffre:d => { OFFRE.ans = +d.v; ficheOffre(OFFRE.j, OFFRE.mode); },
  offreType:d => { OFFRE.type = d.v; OFFRE.msg = ''; ficheOffre(OFFRE.j, OFFRE.mode); },
  offrePart:d => { OFFRE.part = +d.v; OFFRE.msg = ''; ficheOffre(OFFRE.j, OFFRE.mode); },
  offreOption:d => { OFFRE.option = d.v === 'true'; ficheOffre(OFFRE.j, OFFRE.mode); },
  offrePct:d => { OFFRE.pct = +d.v; ficheOffre(OFFRE.j, OFFRE.mode); },
  offreClause:d => { OFFRE.clause = +d.v; ficheOffre(OFFRE.j, OFFRE.mode); },
  offrePrime:d => { OFFRE.primeVif = d.v === 'true'; ficheOffre(OFFRE.j, OFFRE.mode); },
  preter:d => { const j = M.joueurs[d.j]; if (!confirm(`Prêter ${nomJ(j)} jusqu'à la fin de la saison ?`)) return; const r = HH().preter(M, d.j); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  leverOption:d => { const r = HH().leverOption(M, d.j); toast(r.msg); if (r.ok){ sauver(); retirerFeuille(); rendre(); ficheJoueur(d.j); } },
  accepterContre:d => { const r = HH().accepterContre(M, d.c); toast(r.msg); sauver(); rendre(); },
  refuserContre:d => { HH().refuserContre(M, d.c); sauver(); rendre(); },
  envoyerOffre:() => {
    const o = OFFRE, j = M.joueurs[o.j], r = o.mode === 'prolonger' ? C.prolonger(M, o.j, o.sal, o.ans)
      : HH().envoyerHibou(M, {j:o.j, type:o.type, montant:o.montant, sal:o.sal, ans:o.ans, pct:+o.pct, clause:+o.clause, primeVif:!!o.primeVif, part:+o.part, option:o.option ? Math.round(C.valeur(M, j) * 1.1 / 5000) * 5000 : 0});
    if (r.ok){ OFFRE = null; retirerFeuille(); sauver(); rendre(); toast(r.msg); return; }
    o.msg = r.msg; if (r.contre){ if (r.contre.montant) o.montant = r.contre.montant; if (r.contre.sal) o.sal = r.contre.sal; if (r.contre.ans) o.ans = r.contre.ans; if (r.contre.montant || r.contre.sal) o.msg += ' (montant reporté ci-dessus)'; }
    ficheOffre(o.j, o.mode);
  },
  accepterOffre:d => { const r = C.accepterOffre(M, d.o); toast(r.msg); sauver(); rendre(); },
  refuserOffre:d => { C.refuserOffre(M, d.o); sauver(); rendre(); },
  ent:d => { const E = club(M.manager.club).entrainement; E[d.g][d.k] = d.k === 'i' ? +d.v : d.v; sauver(); rendre(); },
  prix:d => { const c = club(M.manager.club), mo = C.UNITES_GALLION / 17; C.reglerPrix(M, c.prix + (+d.d) * 3 * mo); sauver(); rendre(); },   // v97 : ±3 Mornilles
  balais:d => { const b = D.BALAIS.find(x => x.id === d.b); if (!confirm(`Acheter un jeu de ${b.nom} pour ${eurT(b.prix * 1000)} ?`)) return; const r = C.acheterBalais(M, d.b); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  ficheStaff:d => ficheStaff(d.r),
  embaucher:d => { const r = C.embaucher(M, d.s); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  batiment:d => ficheBat(d.b),
  allerVue:d => { fermerFeuille(); U.vue = d.v; rendre(); scrollTo(0, 0); },
  ameliorer:d => { const c = club(M.manager.club), cout = C.coutTravaux(c, d.b); if (!confirm(`${nomBat(d.b)} : passer au niveau ${C.niv(c, d.b) + 1} pour ${eurT(cout)} ?`)) return; const r = B.lancer(M, d.b); toast(r.msg); if (r.ok){ sauver(); fermerFeuille(); rendre(); } },
  amel:d => { const r = B.choisirAmel(M, d.a); toast(r.msg); if (r.ok){ sauver(); const k = B.AMEL[d.a].bat; rendre(); ficheBat(k); } },
  tribune:d => { const c = club(M.manager.club); if (c.travaux.some(t => t.type === 'stade')) return toast('Des travaux sont déjà en cours au stade.'); if (!confirm(`Agrandir la tribune ${({N:'nord', S:'sud', E:'est', O:'ouest'})[d.c]} de ${E.stade.tranche.toLocaleString('fr-FR')} places pour ${eurT(C.coutTravaux(c, 'stade'))} ?`)) return; const r = B.lancer(M, 'stade', d.c); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  prixProduit:d => { const r = B.reglerProduit(M, d.p, 'prix', d.v); if (!r.ok) return toast(r.msg); sauver(); rendre(); },
  sponsor:d => { const r = B.signerSponsor(M, +d.i); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  signerPanneau:d => { const r = B.signerPanneau(M, +d.i); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  retirerPanneau:d => { if (!confirm('Retirer ce panneau ? Le contrat s\'arrête sans indemnité.')) return; const r = B.retirerPanneau(M, +d.i); if (r.ok){ toast(r.msg); sauver(); rendre(); } },
  choixPret:d => { const c = club(M.manager.club), p = U.pret || {m:Math.min(1e6, B.plafondPret(c)), s:2}; if (d.m) p.m = +d.m; if (d.s) p.s = +d.s; U.pret = p; rendre(); },
  emprunter:d => { const c = club(M.manager.club), p = U.pret || {m:Math.min(1e6, B.plafondPret(c)), s:2}; if (!confirm(`Emprunter ${eurT(p.m)} sur ${p.s} saison${p.s > 1 ? 's' : ''} ?`)) return; const r = B.emprunter(M, p.m, p.s); toast(r.msg); if (r.ok){ U.pret = null; sauver(); rendre(); } },
  rembourser:() => { if (!confirm('Rembourser tout l\'emprunt maintenant ?')) return; const r = B.rembourser(M); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  potion:d => { const r = B.potion(M, d.j); toast(r.msg); if (r.ok){ sauver(); retirerFeuille(); rendre(); ficheJoueur(d.j); } },
  travaux:d => { const c = club(M.manager.club), cout = C.coutTravaux(c, d.t); if (!confirm(`Lancer les travaux pour ${eurT(cout)} ?`)) return; const r = C.lancerTravaux(M, d.t); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  promouvoir:d => { const r = C.promouvoir(M, d.j); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  libererJeune:d => { if (!confirm('Libérer ce jeune ? Il quitte le club.')) return; const r = C.libererJeune(M, d.j); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  accepterPoste:d => { const c = club(d.c); if (M.manager.club && !confirm(`Quitter ${club(M.manager.club).nom} pour ${c.nom} ?`)) return; const r = C.accepterPoste(M, d.c); toast(r.msg); if (r.ok){ U.vue = 'accueil'; sauver(); rendre(); scrollTo(0, 0); } },
  refuserPoste:d => { C.refuserPoste(M, d.c); sauver(); rendre(); },
  demission:() => { if (!confirm('Démissionner ? Tu perds un peu de réputation et tu restes sans club en attendant une offre.')) return; const r = C.demissionner(M); toast(r.msg); U.vue = 'accueil'; sauver(); rendre(); },
  accepterSel:() => { const r = C.accepterSelection(M); toast(r.msg); sauver(); rendre(); },
  refuserSel:() => { C.refuserSelection(M); sauver(); rendre(); },
  quitterSel:() => { if (!confirm('Quitter le poste de sélectionneur ?')) return; const r = C.quitterSelection(M); toast(r.msg || 'Fait'); sauver(); rendre(); },
  selAuto:() => { M.sel.perso = false; M.sel.compo = null; QM.convoquer(M); sauver(); rendre(); toast('Convocation automatique'); },
  slotSel:d => choisirSel(d.p, +d.i, d.b === '1'),
  mettreSel:d => mettreSel(d.j, d.p, +d.i, d.b === '1'),
  consigneSel:d => { M.sel.tactique[d.k] = /^\d$/.test(d.v) ? +d.v : d.v; sauver(); rendre(); },
  ouvrirSync:async () => { const v = ($('#codeSync') || {}).value || ''; try{ const r = await Synchro.ouvrirAvecCode(v); if (!r) toast(r === false ? 'Code incorrect' : 'Synchronisation introuvable'); }catch(e){ toast(msgSync(e)); } NUAGE.infos = null; rendreNuage(); },
  envoyerNuage:async d => { try{ await sauver(); await envoyerNuage(+d.n, false); NUAGE.infos = null; }catch(e){ toast(msgSync(e)); } rendreNuage(); },
  recupererNuage:async d => { if (!confirm(`Remplacer l'emplacement ${d.n} de cet appareil par la partie en ligne ?`)) return; try{ await recupererNuage(+d.n); U.vue = 'accueil'; rendre(); scrollTo(0, 0); }catch(e){ toast(msgSync(e)); } },
  continuer:() => { const S = QM.semaine(M); QM.terminerSemaine(M, null); sauver(); rendre(); scrollTo(0, 0); toast(S.type === 'sixn' ? (S.comp && window.QMN ? `${window.QMN.titreSemaine(S)} : joué` : `${D.TOURNOI.court} · tour ${S.tour} joué`) : S.type === 'prepa' ? `Préparation · semaine ${S.semaine} terminée` : 'Semaine passée'); },
  saisonSuivante:() => { QM.saisonSuivante(M); M.dernierMatch = null; sauver(); rendre(); scrollTo(0, 0); toast(`Saison ${lab(M.saison)} lancée`); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const f = ACT[b.dataset.act]; if (!f) return;
  e.preventDefault(); f(b.dataset, b);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.chg === 'pause'){ REG.pauses[t.dataset.k] = t.checked; regler(); }
  if (t.dataset.chg === 'noms'){ REG.noms = QM.langueNoms(t.value); regler(); if (M){ QM.nommer(M); sauver(); } if (MONDE_NEUF) QM.nommer(MONDE_NEUF); entete(); toast({local:'Noms dans la langue de chaque pays', en:'Noms en anglais', fr:'Noms en français'}[REG.noms]); }
  if (t.dataset.chg === 'resumes'){ REG.resumes = t.checked ? 'enjeu' : 'tout'; regler(); }
  if (t.dataset.chg === 'son'){ REG.son = t.checked; regler(); }
  if (t.dataset.chg === 'causeries'){ REG.causeries = t.checked; regler(); }
  if (t.dataset.chg === 'presse'){ REG.presse = t.checked; regler(); }
  if (t.dataset.chg === 'presseN'){ REG.presseN = +t.value; regler(); }
  if (t.dataset.chg === 'triche' && M){ HH().etat(M).triche = t.checked; sauver(); toast(t.checked ? 'Paris et pots-de-vin activés pour cette partie' : 'Désactivés'); }
  if (t.dataset.chg === 'produit'){ const r = B.reglerProduit(M, t.dataset.p, 'actif', t.checked); if (!r.ok){ t.checked = !t.checked; toast(r.msg); return; } sauver(); rendre(); return; }
  if (t.dataset.chg === 'poste'){ placerSlot(ctxCompo(), t.dataset.j, t.value || null); return; }
  if (t.dataset.chg === 'mercF'){ const k = t.dataset.k; MERC[k] = t.type === 'checkbox' ? t.checked : ['nat', 'attr'].includes(k) ? t.value : +t.value; if (k === 'ageMin' && MERC.age < MERC.ageMin) MERC.age = 99; garderMerc(); return; }
  if (t.dataset.chg === 'autoSync'){ REG.autoSync = t.checked; regler(); if (t.checked) toast('Envoi automatique activé'); }
});
$('#fichier').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try{
    const W = QM.charger(await f.text());
    const L = emplacements(); let n = [1, 2, 3].find(k => !L[k]);
    if (!n){ n = +prompt('Les 3 emplacements sont pris. Remplacer lequel ? (1, 2 ou 3)', '3'); if (![1, 2, 3].includes(n)) return; }
    M = W; EMP = n; X = null; U.vue = 'accueil'; await sauver(); rendre(); toast(`Partie importée dans l'emplacement ${n}`);
  }catch(err){ toast('Import impossible : ' + err.message); }
});

/* ---------- Démarrage : reprend la dernière partie ouverte ---------- */
(async () => {
  const n = LS.lire(K_DERNIER, null);
  if (n && emplacements()[n]){ try{ await chargerEmp(n); }catch{ M = null; } }
  racine(); rendre();
})();
/* pour les essais (outils/dev) et la console : la partie ouverte */
window.QM27 = {partie:() => M, sauver, rendre};
/* v91 : boîte à outils de l'interface pour qm27-ecrans.js (écrans du lot 8) */
ACT.infoTac = d => { U.infoTac = d.k; LS.ecrire('qm27:infoTac', d.k); rendre(); };   // v107
/* v117 : feuilles ouvertes depuis une scène illustrée. Marquées data-sc : après un rendre() (prix, emprunt…), la feuille se redessine sur place. */
Object.assign(ACT, {
  scCoffre:d => { const c = club(M.manager.club); feuille(`<div data-sc="scCoffre">${teteF('Le coffre', esc(c.nom))}${finSolde(c)}${finHisto(c)}${finRecDep(c)}</div>`, d && d.garder); },
  scBillet:d => { const c = club(M.manager.club); feuille(`<div data-sc="scBillet">${teteF('Billetterie', `${esc(c.nom)} · ${c.stade.toLocaleString('fr-FR')} places`)}${finBillet(c)}<div class="btns"><button class="btn sec" data-act="vue" data-v="stade">Stade et tribunes</button></div></div>`, d && d.garder); },
  scGobelin:d => { feuille(`<div data-sc="scGobelin">${teteF('Banque des Gobelins', 'Prêts aux clubs')}${banqueHTML(B.assurer(M))}</div>`, d && d.garder); },
});
/* v121 : feuilles du vestiaire illustré */
Object.assign(ACT, {
  scBalais:d => { const c = club(M.manager.club); feuille(`<div data-sc="scBalais">${teteF('Balais', esc(c.nom))}${blocBalais(c)}</div>`, d && d.garder); },
  scBlesses:d => { const c = club(M.manager.club), L = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.bless).sort((a, b) => b.bless.jours - a.bless.jours);
    feuille(`<div data-sc="scBlesses">${teteF('Infirmerie', L.length ? `${L.length} blessé${L.length > 1 ? 's' : ''}` : 'Personne à soigner')}
      ${L.length ? `<div class="carte"><div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${esc(j.bless.nom)} · encore ${j.bless.jours} jour${j.bless.jours > 1 ? 's' : ''}</span></div><span class="d mut">›</span></button>`).join('')}</div></div>`
        : '<p class="mut">Tout le monde est sur pied.</p>'}</div>`, d && d.garder); },
  scProgression:() => feuille(`${teteF('Progression des joueurs', 'Bientôt')}<p style="margin:0 0 10px">Ici viendront la progression de chaque joueur et son entraînement individuel.</p>
    <p class="petit mut" style="margin:0 0 12px">En attendant, les ateliers par poste se règlent dans le programme d'entraînement.</p>
    <div class="btns"><button class="btn sec" data-act="vue" data-v="entrainement">Entraînement</button><button class="btn sec" data-act="vue" data-v="effectif">Effectif</button></div>`),
  scCouloir:() => { const m = QM.matchDuJoueur(M); if (m && !m.res){ fermerFeuille(); return ACT.preparer(); }
    let pm = null; try { pm = TT() && TT().prochainMatch(M); } catch (e){}
    const adv = pm && pm.m && (pm.m.dom === M.manager.club ? pm.m.ext : pm.m.dom);
    feuille(`${teteF('Aucun match cette semaine', esc(club(M.manager.club).nom))}${adv && M.clubs[adv] ? `<p style="margin:0 0 12px">Prochain match contre <b>${esc(club(adv).nom)}</b>${pm.S && pm.S.date ? `, le ${fmtDate(pm.S.date)}` : ''}.</p>` : '<p class="mut">Pas de match prévu pour l\'instant.</p>'}
      <div class="btns"><button class="btn sec" data-act="vue" data-v="calendrier">Calendrier</button><button class="btn sec" data-act="vue" data-v="tactique">Tactique</button></div>`); },
});
function rafraichirFeuilleScene(){ const el = document.querySelector('.fond .feuille [data-sc]'); if (el && ACT[el.dataset.sc]) ACT[el.dataset.sc]({garder:true}); }
window.QMU = {flagSeul, pieces, eurT, get M(){ return M; }, get X(){ return X; }, get EMP(){ return EMP; }, U, REG, regler, VUES, ACT, VUE, D, E, C, V, B, esc, eur, fmtDate, lab, club, nat, blason, avatarDe, nomEq, flag, posteB, etoiles, nomJ, court,
  classeNote, classeAttr, toast, feuille, fermerFeuille, retirerFeuille, teteF, sauver, rendre, aller, ficheJoueur, noteVue, valVue, connu, HH, roleDe, ficheSemaine, msgHTML, tableHTML, ICO, MERC, ligneMercato, IDX, COURT_ATTR, LS, nomBat};
})();
