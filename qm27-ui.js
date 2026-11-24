// mon-ecran-version: 8868b752
/* QM27 (v83, lot 2 : v84, lot 3 : v85) — écrans : démarrage et emplacements, accueil du club, effectif et fiche joueur, tactique, match en direct,
   calendrier, classements, sauvegardes, aide. Moteur : qm27.js (window.QM) ; données : qm27-donnees.js (window.QMD).
   Sauvegarde : IndexedDB (base « qm27 », une partie par emplacement), sinon localStorage ; résumé des emplacements dans localStorage. */
(() => {
'use strict';
/* v164 : fonctions déplacées dans qm27-fiche.js, qm27-lieux.js, qm27-direct.js (window.QMF) ; appelées par ces relais */
const visageMoral = (...a) => window.QMF.visageMoral(...a);
const meilleurBadge = (...a) => window.QMF.meilleurBadge(...a);
const ficheJoueur = (...a) => window.QMF.ficheJoueur(...a);
const nomBat = (...a) => window.QMF.nomBat(...a);
const vueDomaine = (...a) => window.QMF.vueDomaine(...a);
const ficheBat = (...a) => window.QMF.ficheBat(...a);
const vueStade = (...a) => window.QMF.vueStade(...a);
const vueBoutique = (...a) => window.QMF.vueBoutique(...a);
const vueBuvette = (...a) => window.QMF.vueBuvette(...a);
const vuePartenaires = (...a) => window.QMF.vuePartenaires(...a);
const vueTrophees = (...a) => window.QMF.vueTrophees(...a);
const banqueHTML = (...a) => window.QMF.banqueHTML(...a);
const divinationHTML = (...a) => window.QMF.divinationHTML(...a);
const vueMatch = (...a) => window.QMF.vueMatch(...a);
const statsMatchHTML = (...a) => window.QMF.statsMatchHTML(...a);
const evHTML = (...a) => window.QMF.evHTML(...a);
const demarrerDirect = (...a) => window.QMF.demarrerDirect(...a);
const boucle = (...a) => window.QMF.boucle(...a);
const rendreCtrl = (...a) => window.QMF.rendreCtrl(...a);
const reprendre = (...a) => window.QMF.reprendre(...a);
const ouvrirTempsMort = (...a) => window.QMF.ouvrirTempsMort(...a);
const rendreTempsMort = (...a) => window.QMF.rendreTempsMort(...a);
const reprendreApresTM = (...a) => window.QMF.reprendreApresTM(...a);
const finDuMatch = (...a) => window.QMF.finDuMatch(...a);
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
/* v166 : date du prochain temps de jeu (mercredi pendant le mercato, sinon le samedi de la semaine) */
const avantMercredi = () => !!(M && QM.deuxTemps && QM.deuxTemps(M) && !QM.enMilieu(M));
const dateEtape = S => S.date - (avantMercredi() ? 3 * 864e5 : 0);
const libAvancer = () => avantMercredi() ? 'Avancer à mercredi' : M && M.mi ? 'Avancer à samedi' : 'Avancer d\'une semaine';
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
  t.innerHTML = `<b>${esc(c.nom)}</b><span><span class="marque-qm">QM27</span> · ${lab(M.saison)}${S ? ' · ' + fmtDate(dateEtape(S)) : ''}</span>`;
  dr.innerHTML = blason(c.id, 'p');
}
function barre(){
  const on = M && M.manager && U.vue !== 'match' && !U.live;
  NAV.hidden = !on; document.body.classList.toggle('sans-nav', !on);
  if (!on) return;
  const T = M.manager.club ? [['accueil', 'Accueil'], ['effectif', 'Effectif'], ['tactique', 'Tactique'], ['club', 'Club'], ['plus', 'Plus']] : [['accueil', 'Accueil'], ['plus', 'Plus']];
  const actif = ['classements', 'sauvegardes', 'aide', 'calendrier', 'carriere', 'boite', 'profil', 'clubs', 'clubFiche'].includes(U.vue) ? 'plus' : ['entrainement', 'mercato', 'finances', 'staff', 'stade', 'formation', 'selection', 'direction', 'vestiaire', 'domaine', 'boutique', 'buvette', 'entree', 'hall', 'bureaux', 'grandesalle', 'soussol', 'partenaires', 'trophees'].includes(U.vue) ? 'club' : U.vue;
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
  const besoinClub = ['buvette', 'entree', 'bureaux', 'grandesalle', 'soussol', 'progression', 'recrutement', 'equipe', 'vestiaire', 'effectif', 'tactique', 'club', 'entrainement', 'mercato', 'finances', 'staff', 'stade', 'formation', 'calendrier', 'domaine', 'boutique', 'partenaires', 'trophees', 'direction'];
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
  const stade = window.QMU && QMU.sceneStade ? QMU.sceneStade() : '';   // v139 : la scène du stade en tête de l'accueil
  VUE.innerHTML = `${window.QMU && QMU.reunionCarte ? QMU.reunionCarte(M) : ''}${stade ? `<div class="stade-accueil">${stade}</div>` : ''}<div class="cols"><div>
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
  if (stade && QMU.apresStade) QMU.apresStade();
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
  <p class="petit mut">Départage : points, différence de points marqués et encaissés, points marqués, vifs d'or attrapés.</p>
  ${stylesLigueHTML(l)}`;
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
  if (j.susp) L.push(`Suspendu pour ${j.susp.n} match${j.susp.n > 1 ? 's' : ''} de club.`);
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
/* ---------- Tactique ---------- */
const CONSIGNES = [
  ['rythme', 'Rythme', 'Rapide : plus de tirs et de pertes de balle, plus de fatigue.', [[1, 'Lent'], [2, 'Normal'], [3, 'Rapide']]],
  ['risque', 'Prise de risque', 'Élevée : on tire plus souvent, de moins bonnes positions.', [[1, 'Faible'], [2, 'Normale'], [3, 'Élevée']]],
  ['agressivite', 'Agressivité', 'Plus de cognards réussis, plus de fautes et de penalties.', [[1, 'Calme'], [2, 'Normale'], [3, 'Dure']]],
  ['passes', 'Jeu de passes', 'Court : tirs plus sûrs. Long : plus de tirs.', [['court', 'Court'], ['long', 'Long']]],
  ['cible', 'Cible des cognards', 'Poursuiveurs : pertes de balle. Attrapeur : le gêne. Gardien : ouvre les anneaux.', [['poursuiveur', 'Poursuiveurs'], ['attrapeur', 'Attrapeur'], ['gardien', 'Gardien']]],
  ['attrapeur', 'Attrapeur', 'Le choix clé : prendre le vif d\'or quand on est mené de plus de 80 points (8 buts) fait perdre.', [['gagnant', 'Si ça fait gagner'], ['chasse', 'Chasse'], ['marquage', 'Marquage']]],
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
const COURT_CONS = {rythme:'Rythme', risque:'Risque', agressivite:'Engagement', passes:'Passes', avec:'Poursuiveurs', batAvec:'Batteurs', zone:'Zone de tir', sans:'Poursuiveurs', batSans:'Batteurs', cible:'Cognards', attrapeur:'Attrapeur', vifMode:'Vif aperçu', gardien:'Gardien'};
const COURT_OPT = {jeu:'Dans le jeu', gagnant:'Si gagnant', poursuiveur:'Poursuiv.', anneaux:'Anneaux', harcelement:'Harcèlement'};
const GROUPES_C = [['Avec le souafle', ['avec', 'batAvec', 'zone']], ['Sans le souafle', ['sans', 'batSans']], ['Style de jeu', ['rythme', 'risque', 'agressivite', 'passes']], ['Cognards, vif d\'or et gardien', ['cible', 'attrapeur', 'vifMode', 'gardien']]];
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
/* v152 : maîtrise de l'option choisie (consignes du système de jeu) */
const moChip = (o, k, v) => { const x = o.mo ? o.mo(k, v) : null; return x == null ? '' : `<span class="fx mo ${x >= 70 ? 'b' : x < 45 ? 'm' : ''}" title="Maîtrise de cette option">Maîtrise ${x} %</span>`; };
function consRow(T, k, act, o){
  const c = TT().CONS_PAR[k], ouvert = o.ouvert === k;
  const det = !ouvert ? '' : `<div class="cs-det"><p class="petit">${esc(c[3])}</p>${c[4].map(([v, l, , chiffre]) => { const on = String(T[k]) === String(v);
    return `<div class="cs-opt${on ? ' on' : ''}"><div class="ligne"><b style="flex:1">${esc(l)}</b>${on ? '<span class="badge tit">Choix actuel</span>' : `<button class="btn sec mini" data-act="${act}" data-k="${k}" data-v="${v}">Choisir</button>`}</div>
      <div class="cs-fx">${fxChips(k, v) || '<span class="fx">Référence</span>'}</div><p class="petit mut" style="margin:3px 0 0">${esc(chiffre)}</p>
      ${o.mo && o.mo(k, v) != null ? `<p class="petit mo-l">Maîtrise de l'option <b>${o.mo(k, v)} %</b>${!on && o.cout ? ` · plan joué ${nb1(o.cout(k, v))} %` : ''}${o.plan && String(o.plan[k]) === String(v) ? ' · <span class="mut">valeur du plan</span>' : ''}</p>` : ''}
      ${o.prev && !on ? impactTxt(o.prev.opts[k] && o.prev.opts[k][v], o.adv) : ''}${o.fit ? o.fit(k, v) : ''}</div>`; }).join('')}</div>`;
  return `<div class="cs${ouvert ? ' ouvert' : ''}"><button class="cs-l" data-act="infoCons" data-k="${k}" data-a="${act}" aria-expanded="${ouvert}" title="${esc(c[1])} : explications et effets">${COURT_CONS[k]}<i aria-hidden="true">${ouvert ? '−' : 'i'}</i></button>
    <div class="seg mini" role="group" aria-label="${esc(c[1])}">${c[4].map(([v, l]) => `<button data-act="${act}" data-k="${k}" data-v="${v}" class="${String(T[k]) === String(v) ? 'on' : ''}${o.plan && String(o.plan[k]) === String(v) ? ' pl' : ''}" aria-pressed="${String(T[k]) === String(v)}"${o.plan && String(o.plan[k]) === String(v) ? ' title="Valeur du plan"' : ''}>${COURT_OPT[v] || l}</button>`).join('')}</div>
    ${!ouvert && (fxChips(k, T[k]) || moChip(o, k, T[k])) ? `<div class="cs-fx">${moChip(o, k, T[k])}${fxChips(k, T[k])}</div>` : ''}${det}</div>`;
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
/* v158 : arbitre et cartons */
const NOM_ARB = {severe:'sévère', laxiste:'laisse jouer', normal:'dans la moyenne'};
const arbitreHTML = A => `<span class="arb ${A.k}">⚖︎</span> <b>Arbitre :</b> ${flag(A.nat)} ${esc(A.nom)}, ${NOM_ARB[A.k]}${A.k === 'severe' ? ' : cartons faciles, le jeu dur se paie' : A.k === 'laxiste' ? ' : il siffle peu et sort rarement les cartons' : ''}.`;
const cartonHTML = j => { if (!j) return ''; const A = D.EQ.fautes.accumul;
  if (j.susp) return `<span class="crt r" title="Suspendu : ${esc(j.susp.r)} (${j.susp.n} match${j.susp.n > 1 ? 's' : ''})">${j.susp.n}</span>`;
  return j.cj && j.cj % A === A - 1 ? `<span class="crt j" title="${j.cj} jaunes : au prochain, suspendu un match">${j.cj}</span>` : ''; };
/* v157 : style de jeu d'un club (entraîneur de l'ordinateur) et profil mesuré sur ses derniers matchs */
const nomStyle = k => window.QMG && QMG.STYLES_JEU && QMG.STYLES_JEU[k] ? QMG.STYLES_JEU[k].nom : k;
function profilTexte(c){ const P = window.QMG && QMG.profilJeu ? QMG.profilJeu(M, c) : null; if (!P) return ''; const f = x => x.toFixed(1).replace('.', ',');
  return `${P.etiquettes.slice(0, 2).map(e => `<span class="stj ${e}">${esc(nomStyle(e))}</span>`).join(' ')} <span class="mut">· ${f(P.pour)} buts marqués, ${f(P.contre)} encaissés, possession ${Math.round(P.poss)} % (${P.n} matchs)</span>`; }
function styleJeuHTML(c){ if (!c || !window.QMG || !QMG.styleCoach || c.id === M.manager.club) return ''; const k = QMG.styleCoach(M, c), S = QMG.STYLES_JEU[k];
  const P = profilTexte(c), en = QMG.entraineurDe ? QMG.entraineurDe(M, c) : null;   // v159 : entraîneur nommé
  return `${en ? `Leur entraîneur, <b>${esc(en.nom)}</b> (${en.age} ans, en poste depuis ${en.depuis}), aime le jeu` : 'Style de leur entraîneur :'} <b>${esc(S.nom.toLowerCase())}</b> (${esc(S.d.charAt(0).toLowerCase() + S.d.slice(1, -1))}).${P ? ' Sur le terrain : ' + P + '.' : ''}`; }
function stylesLigueHTML(l){
  if (!window.QMG || !QMG.profilJeu || !M.ligues[l]) return '';
  const L = QM.classement(M, l).map(r => club(r.id)).filter(Boolean), P = L.map(c => [c, QMG.profilJeu(M, c)]).filter(x => x[1]);
  if (!P.length) return '';
  const f = x => x.toFixed(1).replace('.', ',');
  return `<div class="carte"><h2>Styles de jeu <span class="mut petit">sur les ${Math.max(...P.map(x => x[1].n))} derniers matchs</span></h2><div class="tab-styles"><table><thead><tr><th>Club</th><th>Style</th><th title="Buts marqués par match">Pour</th><th title="Buts encaissés par match">Contre</th><th title="Possession">Poss.</th></tr></thead><tbody>
    ${P.map(([c, x]) => `<tr${c.id === M.manager.club ? ' class="moi"' : ''}><td>${blason(c.id, 'p')} ${esc(c.sigle || c.nom)}</td><td>${x.etiquettes.slice(0, 2).map(e => `<span class="stj ${e}">${esc(nomStyle(e))}</span>`).join(' ')}${c.id !== M.manager.club && QMG.styleCoach ? `<br><span class="petit mut">${QMG.entraineurDe && QMG.entraineurDe(M, c) ? esc(QMG.entraineurDe(M, c).nom) + ', ' : 'entraîneur : '}${esc(nomStyle(QMG.styleCoach(M, c)).toLowerCase())}</span>` : ''}</td><td class="num">${f(x.pour)}</td><td class="num">${f(x.contre)}</td><td class="num">${Math.round(x.poss)} %</td></tr>`).join('')}
  </tbody></table></div><p class="petit mut" style="margin:6px 0 0">Le style mesuré compare chaque club à la moyenne de sa ligue : offensif ou bloc défensif selon le nombre de buts dans ses matchs, possession au-delà de 54 %, contre-attaque quand il a peu le souafle et marque souvent juste après l'avoir récupéré, physique quand il blesse beaucoup.</p></div>`;
}
/* v155 : badges indicatifs (bronze, argent, or) d'un joueur dans un rôle, d'après ses attributs ; ce que fait un rôle ; ses synergies */
const NOMS_LEV = {constr:'construction', finit:'finition', garde:'garde du souafle', recup:'récupération', rempart:'rempart', bouclier:'bouclier', marteau:'marteau', ange:'ange gardien', vif:'course au vif', gene:'gêne du vif adverse', contre:'contre-attaque'};
/* badge exact (joueur bien connu ou de mon club) ou estimé d'après les fourchettes du recruteur (b.est) */
function badgeDe(j, p, r){
  if (!j || j.poste !== p) return null; if (j.club === M.manager.club || connu(j) >= 80) return QM.badge(j, p, r);
  const R = (D.ROLE_DEF[p] || {})[r]; if (!R) return null; let s = 0, n = 0;
  for (const [k, w] of Object.entries(R.at)){ const g = k.startsWith('g:'), i = g ? D.GARDIEN.findIndex(x => x[0] === k.slice(2)) : IDX(k); const v = g ? (j.g ? j.g[i] : 6) : j.a[i]; s += valVue(j, v, g ? k.slice(2) : k).mid * w; n += w; }
  const moyP = noteVue(j, p).mid / 5; if (s / n < moyP - 0.6) return null;   // rôle en dessous de son niveau : pas de badge
  const b = D.BADGES.find(x => s / n - QM.refRole(p, r) >= x[2]); return b ? [...b, 'est'] : null;
}
/* v161 : insignes illustrés (images/qm27/badges/<rôle>-<or|argent|bronze>.webp) ; un badge estimé est pâli et marqué « ? » */
const imgBadge = (b, r, t, titre) => b ? `<span class="bdgi${b[3] ? ' est' : ''}" title="${esc(titre || 'Badge ' + b[1].toLowerCase() + (b[3] ? ' (estimé)' : ''))}"><img src="images/qm27/badges/${r}-${b[0]}.webp" width="${t}" height="${t}" alt="Badge ${b[1].toLowerCase()}" loading="lazy">${b[3] ? '<i>?</i>' : ''}</span>` : '';
const badgeHTML = (j, p, r, court) => { const b = badgeDe(j, p, r); if (!b) return ''; const ti = `Badge ${b[1].toLowerCase()}${b[3] ? ' estimé par le recruteur' : ''} : ses attributs dépassent nettement ceux d'un ${D.POSTES[p].nom.toLowerCase()} typique dans ce rôle`;
  return court ? imgBadge(b, r, 20, ti) : `${imgBadge(b, r, 22, ti)}<span class="bdg-t ${b[0]}">${b[1]}${b[3] ? ' ?' : ''}</span>`; };
const roleNom = (p, r) => ((D.ROLES[p] || []).find(x => x[0] === r) || [, r])[1];
function roleLeviers(p, r){ const R = (D.ROLE_DEF[p] || {})[r]; if (!R) return ''; return Object.entries(R.lev).sort((a, b) => b[1] - a[1]).map(([l, w]) => `${NOMS_LEV[l]}${p === 'A' ? ((R.course || []).includes(l) ? ' (course)' : ' (avant le vif)') : ''} ${Math.round(w * 100)} %`).join(', '); }
function roleAttrs(p, r){ const R = (D.ROLE_DEF[p] || {})[r]; if (!R) return ''; return Object.entries(R.at).map(([k, w]) => (k.startsWith('g:') ? (D.GARDIEN.find(g => g[0] === k.slice(2)) || [, k])[1] : (D.ATTRS.find(a => a[0] === k) || [, k])[1]) + (w > 1 ? ' ×' + w : '')).join(', '); }
const synergiesRole = (p, r) => D.SYNERGIES.filter(S => S.r.some(x => x[0] === p && x[1] === r)).map(S => { const o = S.r.find(x => !(x[0] === p && x[1] === r)) || S.r[0]; return `${S.nom} (avec ${roleNom(o[0], o[1]).toLowerCase()})`; });
const rolesFit = (j, p, r, T) => { const a = TT() ? TT().adequation(j, p, r, T) : null; return a ? a.roles : {}; };
const libFit = x => x == null ? '' : x >= 0.8 ? '<span class="fitb bon">Idéal</span>' : x >= -0.5 ? '<span class="fitb moyen">Correct</span>' : '<span class="fitb faible">Peu naturel</span>';
function listeRoles(j, p, r, id, T){
  const RF = rolesFit(j, p, r, T), a = TT() ? TT().adequation(j, p, r, T) : null;
  return `${a ? `<p class="petit" style="margin:0 0 8px">${pastille(a)} <b>${NIV[a.niveau][1]}</b> à ce qu'on lui demande${a.raisons.length ? (a.niveau === 'bon' ? '. À surveiller : ' : ' : ') + esc(a.raisons.join(' ; ')) : a.plus.length ? ' : ' + esc(a.plus.join(' ; ')) : ''}.</p>` : ''}
    <div class="liste">${D.ROLES[p].map(([v, n, d]) => { const sy = synergiesRole(p, v); return `<button class="el" data-act="choisirRole" data-j="${id}" data-r="${v}"><span class="poste ${p}" aria-hidden="true">${v === r ? '✓' : ''}</span><div class="t"><b>${n} ${badgeHTML(j, p, v)} ${libFit(RF[v])}</b><span style="white-space:normal">${esc(d)}</span><span class="petit mut" style="white-space:normal">Agit sur : ${esc(roleLeviers(p, v))}. Attributs : ${esc(roleAttrs(p, v))}.${sy.length ? ' Synergies : ' + esc(sy.join(', ')) + '.' : ''}</span></div></button>`; }).join('')}</div>`;
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
/* v160 : traits de synergie sur le terrain (doré : active ; pointillés : il manque un attribut ; rouge : anti-synergie) */
function liensSynHTML(K, T){
  if (!QM.synergiesDe || !K || !K.roles) return '';
  const pos = id => { const s = SLOTS_T.find(x => lireSlot(K, x) === id); return s ? posT(s, T) : null; };
  const L = QM.synergiesDe(M, K).map(x => [x.a, x.b, x.ok ? 'on' : 'presque', x.nom + (x.ok ? '' : ' (presque)')]);
  for (const a of QM.antiSynergiesDe(M, K)){
    if (a.role){ const ids = (K[a.poste] || []).filter(id => id && K.roles[id] === a.role); for (let i = 1; i < ids.length; i++) L.push([ids[0], ids[i], 'anti', a.nom]); }
    else if (K.G && K.G[0]) L.push([K.G[0], null, 'anti', a.nom]); }
  if (!L.length) return '';
  const traits = [], marques = [];
  for (const [a, b, k, nom] of L){ const A = pos(a), B = b ? pos(b) : null; if (!A) continue;
    if (B) traits.push(`<line class="${k}" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`);
    const m = B ? [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] : [A[0] + 9, A[1] - 6];
    marques.push(`<span class="synm ${k}" style="left:${m[0]}%;top:${m[1]}%" title="${esc(nom)}"><i>${k === 'anti' ? '✕' : k === 'on' ? '✦' : '◇'}</i><em>${esc(nom)}</em></span>`); }
  return `<svg class="synl" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${traits.join('')}</svg>${marques.join('')}`;
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
    <span class="rond kit">${V.maillot(kitDe(sel), sel ? [...SLOTS_T, ...SLOTS_B()].indexOf(s) + 1 : j.num ?? '')}${banc ? `<i class="ps pi" title="${D.POSTES[p].nom}">${V.posteImg(p)}</i>` : ''}${K.cap === id && !banc ? '<i class="cap" title="Capitaine">C</i>' : ''}${K.pen === id && !banc ? '<i class="pn" title="Tireur de penalty">P</i>' : ''}${j.bless ? '<i class="bl">✚</i>' : j.susp ? '<i class="bl sp" title="Suspendu">S</i>' : ''}${j.inter && !sel ? '<i class="bl" title="En sélection">✈︎</i>' : ''}${banc ? '' : `<i class="ntj ${iv.cls}">${iv.txt}</i>`}</span>${banc ? `<b>${esc(j.n)}</b><span class="nt ${iv.cls}">${iv.txt}</span>` : `<b class="eti">${U.fitMap && U.fitMap[id] ? pastille(U.fitMap[id]) : ''}<span class="nm">${esc(j.n)}</span>${hors ? `<span class="hp" title="Hors de son poste">${j.poste}</span>` : ''}</b>`}</button>`;
}
function ligneEff(ctx, j){
  const K = ctx.K, s = slotDe(K, j.id), p = s && s[0] !== 'R' ? s[0] : j.poste, n = QM.note(j, p);
  const occ = x => { const o = M.joueurs[lireSlot(K, x)]; return o && o.id !== j.id ? ' · ' + o.n : ''; };
  const G = [['Poursuiveurs', ['P0', 'P1', 'P2']], ['Batteurs', ['B0', 'B1']], ['Attrapeur', ['A0']], ['Gardien', ['G0']], ['Remplaçants', SLOTS_B()]];
  const sel = `<select data-chg="poste" data-j="${j.id}" aria-label="Place de ${esc(nomJ(j))}">${G.map(([g, L]) => `<optgroup label="${g}">${L.map(x => `<option value="${x}"${x === s ? ' selected' : ''}>${nomSlot(x)}${occ(x)}</option>`).join('')}</optgroup>`).join('')}<optgroup label="Hors du groupe"><option value=""${s ? '' : ' selected'}>— Réserve</option></optgroup></select>`;
  return `<div class="er${U.flash === j.id ? ' flash' : ''}" data-drag="${j.id}"><label class="pick${s ? (s[0] === 'R' ? ' r' : ' ti ' + s[0]) : ''}"><span>${s ? nomSlot(s) : '—'}</span>${sel}</label>
    <button class="t" data-act="joueur" data-j="${j.id}"><b>${ctx.sel ? '' : flag(j.nat) + ' '}${esc(nomJ(j))}${j.bless ? ' <span class="badge bless">✚</span>' : ''}${ctx.sel ? '' : cartonHTML(j)}${j.inter && !ctx.sel ? ' <span class="badge" title="En sélection cette semaine">✈︎</span>' : ''}</b><span>${D.POSTES[j.poste].nom}${ctx.sel ? ' · ' + esc(club(j.club).nom) : ' · ' + j.age + ' ans'}</span></button>
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
      <div class="tterrain">${TERRAIN_SVG}${(U.phase || 'avec') === 'avec' ? zonesHTML(ctx.T) : ''}${liensSynHTML(K, ctx.T)}${SLOTS_T.map(x => jetonHTML(K, x, ctx.sel, ctx.T)).join('')}</div></div>
    <div class="tbanc"><h3>Banc</h3>${SLOTS_B().map(x => jetonHTML(K, x, ctx.sel, ctx.T)).join('')}</div>
  </div>
  <p class="petit mut aide-tac">Glisse un remplaçant sur un titulaire pour les échanger ; touche un joueur pour son rôle. <i class="fit bon"></i> adapté · <i class="fit moyen"></i> moyen · <i class="fit faible"></i> peu adapté · ✦ synergie · ◇ presque · ✕ à éviter · C capitaine · P tireur de penalty.</p>`;
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
  let pm = null, R = null, P = null; try { pm = TT() && TT().prochainMatch(M); if (pm){ R = TT().rapport(M, pm.m, pm.S); const cx = TT().contexteMatch(M, pm.m, pm.S); P = cx && plansPrev(cx, TT().prevoir(cx, T), 'plan'); } } catch (e){ console.warn('QM27 tactique', e); }
  avecPanneau(() => { VUE.innerHTML = `<div><h1 class="grand">Tactique</h1><p class="sous">Note moyenne <b>${moy}</b> · <span title="Adéquation des titulaires">adaptés <i class="fit bon"></i> ${nbN('bon')} <i class="fit moyen"></i> ${nbN('moyen')} <i class="fit faible"></i> ${nbN('faible')}</span>${notes.length < 7 ? ` · <span style="color:var(--moyen)">${7 - notes.length} place${7 - notes.length > 1 ? 's' : ''} libre${7 - notes.length > 1 ? 's' : ''}</span>` : ''}${window.QMG && QMG.maitrise ? ` · <span title="Maîtrise tactique : les séances d'apprentissage tactique la font monter, changer ton système la fait baisser">maîtrise <b>${Math.round(QMG.maitrise(M, c).v)} %</b></span>` : ''}</p></div>
  ${compoHTML(ctx)}
  <div class="cols tac-cols"><div>
    ${plansHTML(false)}
    <div class="carte cons-c"><h2>Consignes <span class="mut petit">touche un libellé pour ses effets</span></h2>${consignesHTML(T, 'consigne', null, {prev:P, adv:R && R.adv.nom, fit:fitOption(K, T), ...optsMaitrise(T)})}</div>
    <div class="carte"><h2>Rôles et capitaine</h2><div class="liste compacte">${SLOTS_T.map(x => { const id = lireSlot(K, x), j = M.joueurs[id]; if (!j) return '';
      const Ro = (D.ROLES[x[0]] || []).find(r => r[0] === (K.roles || {})[id]), a = A[id];
      return `<button class="el" data-act="role" data-j="${id}" data-p="${x[0]}">${posteB(x[0])}<div class="t"><b>${pastille(a)} ${esc(court(j))}${K.cap === id ? ' <span class="badge tit">C</span>' : ''} <span class="mut" style="font-weight:400">· ${Ro ? esc(Ro[1]) : 'rôle ?'}</span> ${Ro ? badgeHTML(j, x[0], Ro[0]) : ''}</b><span>${a && a.raisons.length ? (a.niveau === 'bon' ? 'À surveiller : ' : '') + esc(a.raisons[0]) : a && a.plus.length ? esc(a.plus[0]) : 'À l\'aise dans ce qu\'on lui demande'}</span></div><span class="d mut">›</span></button>`; }).join('')}</div></div>
    ${synergiesHTML(K)}
  </div><div>
    ${R ? adversaireHTML(R, T) : ''}
    ${P ? previsionHTML(P, R, 'consigne') : ''}
  </div></div>`; });
}
/* v155 : synergies de la composition (actives, à un attribut près) et anti-synergies */
function synergiesHTML(K){
  if (!QM.synergiesDe || !K) return '';
  const S = QM.synergiesDe(M, K), A = QM.antiSynergiesDe(M, K), nom = id => esc(court(M.joueurs[id] || {p:'', n:'?'}));
  const lig = x => `<div class="el syn ${x.ok ? 'on' : 'presque'}"><span class="syn-i" aria-hidden="true">${x.ok ? '✦' : '◇'}</span><div class="t"><b>${esc(x.nom)}</b><span style="white-space:normal">${nom(x.a)} et ${nom(x.b)} · ${esc(x.d)}${x.ok ? '' : ` Il manque ${esc((D.ATTRS.find(a => a[0] === x.cond[1]) || [, x.cond[1]])[1].toLowerCase())} ${x.cond[2]} pour ${nom(x.cond[0] === 0 ? x.a : x.b)}.`}</span></div></div>`;
  const pistes = D.SYNERGIES.filter(x => !S.some(y => y.id === x.id)).slice(0, 3);
  return `<div class="carte"><h2>Synergies <span class="mut petit">${S.filter(x => x.ok).length} active${S.filter(x => x.ok).length > 1 ? 's' : ''}</span></h2>
    ${S.length || A.length ? `<div class="liste compacte">${S.map(lig).join('')}${A.map(x => `<div class="el syn anti"><span class="syn-i" aria-hidden="true">✕</span><div class="t"><b>${esc(x.nom)}</b><span style="white-space:normal">${esc(x.d)}</span></div></div>`).join('')}</div>` : '<p class="petit mut" style="margin:0">Aucune synergie dans cette composition.</p>'}
    <p class="petit mut" style="margin:8px 0 0">Une synergie s'allume quand deux rôles précis jouent ensemble (et parfois quand un attribut atteint un seuil). ${pistes.length ? 'À essayer : ' + pistes.map(x => `${esc(x.nom)} (${esc(roleNom(x.r[0][0], x.r[0][1]).toLowerCase())} + ${esc(roleNom(x.r[1][0], x.r[1][1]).toLowerCase())})`).join(', ') + '.' : ''}</p></div>`;
}
/* v152 : plans de jeu (presets) et maîtrise tactique par option */
const GG = () => window.QMG && window.QMG.presets ? window.QMG : null;
const moiC = () => M && M.manager && M.manager.club ? club(M.manager.club) : null;
const pc0 = x => Math.round(x) + ' %';
/* options de consRow pour mon club : maîtrise de chaque option, coût d'un changement, valeurs du plan actif */
function optsMaitrise(T){
  const G_ = GG(), c = moiC(); if (!G_ || !c) return {};
  const L = G_.presets(M, c); T = QM.completerTactique({...T});
  return {mo:(k, v) => G_.maitriseOption(M, c, k, v), cout:(k, v) => G_.coutChangement(M, c, T, k, /^\d$/.test(String(v)) ? +v : v), plan:L[c.presetActif].T};
}
function plansHTML(avant){
  const G_ = GG(), c = moiC(); if (!G_ || !c) return '';
  const L = G_.presets(M, c), a = c.presetActif, T = QM.completerTactique({...c.tactique}), ec = G_.ecartsPreset(M, c);
  const mt = G_.maitrisePlan(M, c, T), mp = G_.maitrisePlan(M, c, L[a].T), act = avant ? 'planAvant' : 'plan';
  return `<div class="carte plans"><h2>Plans de jeu <span class="mut petit">maîtrise du plan joué <b>${pc0(mt)}</b></span></h2>
    <div class="plans-l" role="group" aria-label="Plans de jeu">${L.map((p, i) => `<button class="plan${i === a ? ' on' : ''}" data-act="${act}" data-i="${i}" aria-pressed="${i === a}"><b>${esc(p.nom)}</b><span>${pc0(G_.maitrisePlan(M, c, p.T))}</span></button>`).join('')}</div>
    ${ec.length ? `<p class="petit" style="margin:8px 0 0"><b>Retouches</b> sur « ${esc(L[a].nom)} » : ${ec.map(([k, vp, v]) => `${esc(COURT_CONS[k].toLowerCase())} ${esc(nomOpt(k, v).toLowerCase())} <span class="mut">(plan : ${esc(nomOpt(k, vp).toLowerCase())})</span>`).join(', ')}${Math.abs(mt - mp) >= 0.5 ? ` · maîtrise ${pc0(mp)} → <b>${pc0(mt)}</b>` : ' · sans effet sur la maîtrise'}.</p>
      <div class="btns" style="margin-top:8px">${avant ? '' : `<button class="btn sec" data-act="planEnregistrer">Enregistrer dans « ${esc(L[a].nom)} »</button>`}<button class="btn sec" data-act="planRevenir" data-x="${avant ? 1 : ''}">Revenir au plan</button></div>`
      : `<p class="petit mut" style="margin:8px 0 0">Tu joues « ${esc(L[a].nom)} » tel qu'il est enregistré.${avant ? '' : ' Change une consigne pour le retoucher, puis enregistre-le ou reviens au plan.'}</p>`}
    ${avant ? '' : `<div style="margin-top:8px"><button class="btn sec mini" data-act="planNom" data-i="${a}">Renommer « ${esc(L[a].nom)} »</button></div>`}
    <p class="petit mut" style="margin:8px 0 0">La maîtrise se compte option par option : une retouche ne coûte que l'écart sur l'option changée. Le rythme, le risque, l'engagement, les cognards, l'attrapeur et le gardien sont libres.</p></div>`;
}
/* la prévision complétée : coût en maîtrise de chaque piste, et ce que donnerait chacun des autres plans */
function plansPrev(ctx, P, act){
  const G_ = GG(), c = moiC(); if (!G_ || !c || !P || !ctx) return P;
  const L = G_.presets(M, c), T = QM.completerTactique({...ctx.X.e[ctx.k].tactique});
  for (const x of P.conseils) x.mt = G_.coutChangement(M, c, T, x.k, x.v);
  P.plans = L.map((p, i) => { if (i === c.presetActif && !G_.ecartsPreset(M, c).length) return null; const v = TT().estimerX(ctx.X, ctx.k, p.T);
    return {i, nom:p.nom, mt:G_.maitrisePlan(M, c, p.T), d:v.ecart - P.base.ecart, actif:i === c.presetActif}; }).filter(Boolean);
  P.planAct = act; return P;
}
/* v152 : fréquence d'une consigne dans leur jeu habituel, et portrait de leur entraîneur */
const fq = (R, k) => R.hab && R.hab.freq && R.hab.freq[k] && R.hab.freq[k][1] > 1 ? ` <span class="mut">(${R.hab.freq[k][0]}/${R.hab.freq[k][1]})</span>` : '';
function styleCoach(C){
  const L = [C.lecture >= 0.65 ? 'Il lit bien ses adversaires et ajuste souvent son plan.' : C.lecture <= 0.35 ? 'Il ajuste rarement son plan à l\'adversaire.' : 'Il ajuste parfois son plan à l\'adversaire.'];
  if (C.prudence >= 0.65) L.push('Il se replie volontiers contre plus fort.'); else if (C.prudence <= 0.3) L.push('Il ne recule devant personne.');
  if (C.fidele >= 0.7) L.push('Il tient à ses idées.');
  return L.join(' ');
}
/* v96 : le prochain adversaire vu par l'adjoint */
function adversaireHTML(R, T){
  const To = R.T, no = (k, v) => nomOpt(k, v).toLowerCase(), barre = (l, a, b) => { const m = Math.max(a, b, 1);
    return `<div class="rf"><span>${esc(l)}</span><div class="rf-b"><i class="n" style="width:${a / m * 100}%"></i><i class="e" style="width:${b / m * 100}%"></i></div><b class="${a >= b + 0.5 ? 'bon' : b >= a + 0.5 ? 'mauvais' : ''}">${String(a).replace('.', ',')} / ${String(b).replace('.', ',')}</b></div>`; };
  return `<div class="carte adv"><h2>Prochain adversaire <span class="mut petit">${R.dom ? 'à l\'extérieur' : 'à domicile'}</span></h2>
    <div class="ligne" style="gap:10px;margin-bottom:8px">${blason(R.adv.id, 'p')}<div style="flex:1;min-width:0"><b>${esc(R.adv.nom)}</b><div class="petit mut">${R.rang}${R.rang === 1 ? 'er' : 'e'} sur ${R.nb} · forme ${R.forme.join(' ') || '—'} · ${D.METEOS[R.meteo] ? D.METEOS[R.meteo].ico + ' ' + D.METEOS[R.meteo].nom.toLowerCase() : ''}</div></div></div>
    <p class="petit" style="margin:0 0 4px"><b>Leur jeu habituel${R.hab && R.hab.n ? ` (${R.hab.n} dernier${R.hab.n > 1 ? 's' : ''} match${R.hab.n > 1 ? 's' : ''})` : ' (pas encore vus : d\'après leur style)'} :</b> ${no('sans', QM.sansDe(To))}${fq(R, 'sans')} sans le souafle, attaque ${To.zone === 'axe' ? 'par l\'axe' : To.zone === 'couloirs' ? 'par les couloirs' : 'de loin'}${fq(R, 'zone')}, batteurs en ${no('batSans', To.batSans)}${fq(R, 'batSans')}, cognards sur ${no('cible', To.cible)}${fq(R, 'cible')}, jeu ${['calme', 'normal', 'dur'][(+To.agressivite || 2) - 1]}, attrapeur « ${no('attrapeur', To.attrapeur)} »${fq(R, 'attrapeur')}, gardien ${To.gardien === 'sortie' ? 'qui sort' : 'sur sa ligne'}${fq(R, 'gardien')}.</p>
    ${R.coach ? `<p class="petit mut" style="margin:0 0 8px">${styleJeuHTML(R.adv)} ${esc(styleCoach(R.coach))} Ce n'est qu'une tendance : il peut changer son plan pour ce match.</p>` : ''}
    <div class="rfs"><div class="rf-leg"><span><i class="n"></i>nous</span><span><i class="e"></i>eux</span></div>${R.lignes.map(([l, a, b]) => barre(l, a, b)).join('')}</div>
    <p class="petit" style="margin:8px 0"><b>À surveiller :</b> ${R.cles.map(x => `${esc(court(x.j))} (${D.POSTES[x.j.poste].nom.toLowerCase()}, ${x.n})`).join(', ')}</p>
    ${R.suspAdv && R.suspAdv.length ? `<p class="petit" style="margin:0 0 8px"><b>Suspendu${R.suspAdv.length > 1 ? 's' : ''} chez eux :</b> ${R.suspAdv.map(j => `${esc(court(j))} (${D.POSTES[j.poste].nom.toLowerCase()})`).join(', ')}</p>` : ''}
    ${R.arb ? `<p class="petit" style="margin:0 0 8px">${arbitreHTML(R.arb)}</p>` : ''}
    ${R.conseils.length ? `<div class="conseils">${R.conseils.map(([t, k, v]) => `<div class="cs-c"><span>${esc(t)}</span>${k && String(T[k]) !== String(v) ? `<button class="btn sec mini" data-act="consigne" data-k="${k}" data-v="${v}">Appliquer</button>` : ''}</div>`).join('')}</div>` : ''}</div>`;
}
/* v96 : prévision de l'adjoint et pistes d'amélioration (act : consigne, consigneAvant ou consigneLive) */
function previsionHTML(P, R, act, live){
  const b = P.base, m = (n, l) => `<div><b>${n}</b><span>${l}</span></div>`;
  return `<div class="carte prev"><h2>${live ? 'Pistes de l\'adjoint' : 'Prévision'}${R ? ` <span class="mut petit">contre ${esc(R.adv.nom)}</span>` : ''}</h2>
    ${live ? '' : `<div class="prev-g">${m('≈ ' + Math.round(b.pour), 'buts marqués')}${m('≈ ' + Math.round(b.contre), 'buts encaissés')}${m(Math.round(b.vif) + ' %', 'vif d\'or pour nous')}${m(Math.round(b.possession) + ' %', 'possession')}${m('≈ ' + Math.round(b.duree) + ' min', 'durée')}${m(nb0(b.ecart) + ' pts', 'écart attendu')}</div>`}
    ${P.conseils.length ? `${live ? '' : '<h4 class="sous-t">Pistes</h4>'}<div class="conseils">${P.conseils.map(x => `<div class="cs-c"><span><b>${esc(COURT_CONS[x.k])} : ${esc(nomOpt(x.k, x.v))}</b> · écart ${nb0(x.ecart)} pts (buts ${nb1(x.pour)}, encaissés ${nb1(x.contre)}${x.fatigue ? ', fatigue ' + nb1(x.fatigue) + ' %' : ''})</span><button class="btn sec mini" data-act="${act}" data-k="${x.k}" data-v="${x.v}">Appliquer</button></div>${x.mt ? `<p class="petit mut cs-mt">${x.mt <= -3 ? 'Remaniement' : 'Retouche'} : maîtrise du plan joué ${nb1(x.mt)} %${x.mt <= -3 ? ', option peu travaillée' : ''}</p>` : ''}`).join('')}</div>` : '<p class="petit mut" style="margin:6px 0 0">Aucun changement simple ne rapporte nettement plus : ton plan tient la route.</p>'}
    ${P.plans && P.plans.length && P.planAct ? `<h4 class="sous-t">Changer de plan</h4><div class="conseils">${P.plans.map(x => `<div class="cs-c"><span><b>${esc(x.nom)}</b>${x.actif ? ' tel qu\'enregistré' : ''} · maîtrise ${pc0(x.mt)} · écart ${nb0(x.d)} pts</span><button class="btn sec mini" data-act="${x.actif ? 'planRevenir' : P.planAct}" data-i="${x.i}" data-x="${P.planAct === 'planAvant' ? 1 : ''}">${x.actif ? 'Revenir' : 'Passer'}</button></div>`).join('')}</div>` : ''}
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
    return `<button class="el" data-act="mettre" data-j="${j.id}" data-p="${p}" data-i="${i}" data-b="${banc ? 1 : 0}">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${r.tit ? 'Titulaire (' + D.POSTES[r.p].nom.toLowerCase() + ')' : r.banc ? 'Remplaçant' : 'Réserve'} · forme ${j.forme} · fatigue ${j.fat} %${j.bless ? ' · ✚ blessé' : ''}${j.susp ? ` · suspendu (${j.susp.n} match${j.susp.n > 1 ? 's' : ''})` : ''}</span></div><span class="note ${classeNote(n)}">${n}</span></button>`; }).join('')}</div>`);
}
function mettre(jid, p, i, banc){
  fermerFeuille(); placerSlot(ctxCompo(), jid, banc ? 'R' + i : p + i);
}

/* ---------- v161 : feuille de match d'un match international (saison en cours) ---------- */
function matchsInter(id){ const L = []; M.calendrier.forEach((S, k) => { for (const m of S.matchs) if (m.ligue === 'sixn' && m.res && m.res.f && m.res.f.c.some(c => c.some(x => x[0] === id))) L.push([k, m]); }); return L; }
function feuilleInter(k, mid){
  const S = M.calendrier[+k], m = S && S.matchs.find(x => x.id === mid); if (!m || !m.res || !m.res.f) return;
  const f = m.res.f, ORD = {G:0, P:1, B:2, A:3}, ca = id => (f.ca || []).filter(c => c[0] === id).map(c => `<span class="crt-m ${c[2] === 'j' ? 'j' : 'r'}" title="${c[2] === 'j' ? 'Carton jaune' : 'Exclu'} (${c[3]}e)"></span>`).join('');
  const col = (i, n) => `<div><h4 class="sous-t">${blason(n, 'p', true)} ${esc(nomEq(n, true))}</h4><div class="liste compacte">${f.c[i].slice().sort((a, b) => ORD[a[1]] - ORD[b[1]]).map(([id, p, note, b, v]) => { const j = M.joueurs[id];
    return `<button class="el" data-act="joueur" data-j="${id}">${posteB(p)}<div class="t"><b>${j ? esc(court(j)) : '?'}${b ? ` <span class="mut">⚽ ${b}</span>` : ''}${v ? ' <span title="Vif d\'or">✦</span>' : ''}${ca(id)}</b><span>${j && j.club && M.clubs[j.club] ? esc(M.clubs[j.club].nom) : 'sans club'}</span></div>${note ? `<span class="note ${classeNote(note * 10)}">${String(note).replace('.', ',')}</span>` : ''}</button>`; }).join('')}</div></div>`;
  feuille(`${teteF(`${esc(nomEq(m.dom, true))} ${m.res.score.join('–')} ${esc(nomEq(m.ext, true))}`, `${esc(m.comp === 'ldn' ? D.LDN.nom : D.AMICAUX.nom)} · ${fmtDate(S.date, true)} · ${m.res.duree} min${m.res.vif >= 0 ? ' · vif d\'or : ' + esc(nomEq(m.res.vif ? m.ext : m.dom, true)) : ''}`)}
    <div class="cols feuille-inter">${col(0, m.dom)}${col(1, m.ext)}</div><p class="petit mut">Notes du match sur 10. Touche un joueur pour sa fiche.</p>`);
}
/* ---------- Calendrier ---------- */
function ficheSemaine(k){
  const s = M.calendrier[k], mg = M.manager, l = mg.club ? club(mg.club).ligue : null;
  const ligne = (m, sixn) => `<${sixn && m.res && m.res.f ? `button data-act="feuilleInter" data-k="${k}" data-m="${m.id}" title="Feuille de match"` : 'div'} class="el">${blason(m.dom, 'p', sixn)}<div class="t"><b>${esc(nomEq(m.dom, sixn))} – ${esc(nomEq(m.ext, sixn))}</b><span>${m.res ? `${m.res.duree} min${m.res.vif >= 0 ? ' · vif d\'or : ' + esc(nomEq(m.res.vif ? m.ext : m.dom, sixn)) : ''}` : 'à venir'}</span></div><b>${m.res ? m.res.score.join('–') : ''}</b>${blason(m.ext, 'p', sixn)}</${sixn && m.res && m.res.f ? 'button' : 'div'}>`;
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
  ${window.Themes && Themes.polices ? `<div class="carte"><h2>Police des titres</h2><style>${Themes.facesPolices()}</style><div class="liste">
    ${[{id:'kiosk', nom:'Comme KiosK', d:'La police choisie dans État', famille:''}, ...Themes.polices].map(P => `<label class="el"><div class="t"><b style="${P.famille ? `font-family:${esc(P.famille)};font-size:1.08em` : ''}">${esc(P.nom)}</b><span>${esc(P.d)}</span></div><input type="radio" name="policeJeu" data-chg="policeJeu" value="${P.id}" ${Themes.policeJeu() === P.id ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
  </div><p class="petit mut" style="margin:8px 0 0">Pour le jeu seulement : les titres des écrans de QM27.</p></div>` : ''}
  <div class="carte"><h2>Noms des clubs et des ligues</h2><div class="liste">
    ${D.LANGUES_NOMS.map(([k, n, ex]) => `<label class="el"><div class="t"><b>${n}</b><span>${esc(ex)}</span></div><input type="radio" name="nomsLg" data-chg="noms" value="${k}" ${(REG.noms || 'local') === k ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
  </div></div>
  <div class="carte"><h2>Pauses automatiques pendant le direct</h2><div class="liste">
    ${[['blessure', 'Blessure'], ['faute_grave', 'Carton rouge'], ['vif_apercu', 'Vif d\'or aperçu']].map(([k, n]) => `<label class="el"><div class="t"><b>${n}</b></div><input type="checkbox" data-chg="pause" data-k="${k}" ${P[k] ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
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
    <p><b>Le vif d'or.</b> Il apparaît entre la ${E.vifApparitionMin}e et la ${E.vifApparitionMax}e minute, peut se cacher puis revenir. Plus le temps passe, plus il est facile à attraper. Il rapporte ${E.points.vif} points. Attention : le prendre quand on est mené de plus de ${E.points.vif} points fait perdre le match. La consigne « Si ça fait gagner » demande à l'attrapeur de le laisser filer dans ce cas.</p>
    <p><b>Dispositions.</b> Dans Tactique, deux phases : avec le souafle (poursuiveurs en triangle, en ligne ou en pointe ; batteurs en escorte ou devant ; zone d'attaque à toucher sur le terrain) et sans le souafle (pressing, zone ou repli ; batteurs en protection ou en harcèlement). Chaque défense craint une zone : le pressing craint l'axe, la zone craint les couloirs, le repli craint les tirs de loin. Désigne aussi ton tireur de penalty (touche un poursuiveur).</p>
    <p><b>Fautes et cartons.</b> Une faute sur quatre environ est sifflée en penalty, les autres donnent un coup franc. L'arbitre (indiqué avant le match) peut être sévère ou laisser jouer. Carton jaune, second jaune ou rouge direct : l'exclu n'est pas remplacé, son équipe joue à un de moins. Suspensions en club : ${E.fautes.susp.j2} match après un second jaune, ${E.fautes.susp.r} après un rouge direct, un match tous les ${E.fautes.accumul} jaunes de la saison. Un jeu dur gagne des duels mais coûte des fautes, des cartons et de la fatigue.</p>
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
const MERC = Object.assign({onglet:'recherche', poste:'tous', age:99, ageMin:15, moyens:false, q:'', valMax:0, salMax:0, noteMin:0, nat:'', fin:false, attr:'', attrMin:12, role:'', badge:'', tri:'note'}, LS.lire('qm27:mercato', {}));   // v155 : rôle et badge   // v91 : recherche et filtres
const garderMerc = () => { const {onglet, q, vu, ...f} = MERC; void onglet; void q; void vu; LS.ecrire('qm27:mercato', f); };
const nbFiltres = () => [MERC.poste !== 'tous', MERC.age < 99 || MERC.ageMin > 15, MERC.valMax, MERC.salMax, MERC.noteMin, MERC.nat, MERC.fin, MERC.moyens, MERC.attr, MERC.role, MERC.badge].filter(Boolean).length;
function ligneMercato(j, d){
  const p = MERC.poste !== 'tous' && MERC.poste !== 'bless' ? MERC.poste : j.poste, nv = noteVue(j, p), n = nv.mid;
  return `<button class="el" data-act="joueur" data-j="${j.id}">${j.club ? blason(j.club, 'p') : '<span class="blason nat p" aria-hidden="true" style="font-size:.5rem;font-weight:800;color:var(--ink-soft)">LIBRE</span>'}${posteB(j.poste)}
    <div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${d || (j.club ? esc(club(j.club).sigle) + ' · ' + eur(C.valeur(M, j)) : 'libre · demande ' + eur(C.salaireDemande(j, club(M.manager.club))) + '/sem.')}</span></div>
    ${MERC.role && MERC.role.startsWith(j.poste + ':') ? badgeHTML(j, j.poste, MERC.role.split(':')[1]) : (b => b ? imgBadge(b[0], b[1], 22, `Meilleur badge (${b[0][1].toLowerCase()}) : ${roleNom(j.poste, b[1])}${b[0][3] ? ' (estimé)' : ''}`) : '')(meilleurBadge(j))}<span class="etoiles petit" aria-label="potentiel">${'★'.repeat(C.potentielEstime(M, j))}</span><span class="note ${classeNote(n)}${nv.exact ? '' : ' flou'}">${nv.txt}</span></button>`;
}
function vueMercato(){
  const U = club(M.manager.club), S = QM.semaine(M), ouvert = C.mercatoOuvert(S), fen = C.prochaineFenetre(M);
  if (M.offres.length && MERC.onglet === 'recherche' && !MERC.vu){ MERC.onglet = 'offres'; MERC.vu = 1; }
  const O = [['offres', `Offres${M.offres.length ? ' (' + M.offres.length + ')' : ''}`], ['recherche', 'Recherche'], ['libres', 'Agents libres'], ['suivis', 'Suivis'], ['ventes', 'Mes ventes'], ['actus', 'Transferts']];
  let corps = '';
  const filtres = () => { const pills = filtresActifs();
    return `<div class="recherche"><input class="champ" type="search" id="mercQ" placeholder="Chercher un nom…" value="${esc(MERC.q)}" autocomplete="off" aria-label="Chercher un joueur par son nom"><button class="btn sec" data-act="mercFiltres">Filtres${nbFiltres() ? ' · ' + nbFiltres() : ''}</button></div>
    ${pills.length ? `<div class="pills">${pills.map(([k, t]) => `<button class="pill" data-act="mercRetire" data-k="${k}" aria-label="Retirer le filtre ${esc(t)}">${esc(t)} ✕</button>`).join('')}</div>` : ''}
    <div class="tri-l"><span class="petit mut">Trier par</span>${[['note', 'Note'], ...(MERC.role ? [['role', 'Rôle']] : []), ['pot', 'Potentiel'], ['valeur', 'Valeur'], ['age', 'Âge']].map(([k, n]) => `<button class="chip mini ${MERC.tri === k ? 'on' : ''}" data-act="mercTri" data-t="${k}">${n}</button>`).join('')}</div>`; };
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
    const L = U.suivi.map(id => M.joueurs[id]).filter(j => j && j.club !== U.id), n = U.suivi.length, P = E.scouting.plein;
    /* v166 : capacité du recruteur et offres des autres clubs en attente sur les joueurs suivis */
    const ENC = (M.encheres || []).filter(e => U.suivi.includes(e.j) && M.joueurs[e.j]), quand = QM.enMilieu(M) ? 'samedi' : 'mercredi';
    corps = `<div class="carte"><p class="petit" style="margin:0">Ton recruteur suit <b>${n} joueur${n > 1 ? 's' : ''}</b> · ${P} à plein régime${n > P ? ` : au-delà, son temps se partage (${Math.round(P / n * 100)} % chacun)` : ''}. Pendant le mercato, il travaille une fois et demie plus vite.</p></div>
    ${ENC.length ? `<div class="carte"><h2>Offres d'autres clubs</h2><div class="liste">${ENC.map(e => { const j = M.joueurs[e.j], c = club(e.club);
      return `<button class="el" data-act="joueur" data-j="${j.id}">${blason(c.id, 'p')}<div class="t"><b>${esc(nomJ(j))}</b><span style="white-space:normal">${esc(c.nom)} : ${e.de ? eur(e.prix) + ' · il faut ' + eur(Math.round(e.prix * C.SURENCHERE / 5000) * 5000) + ' pour passer devant' : 'contrat proposé'} · conclu ${quand}</span></div></button>`; }).join('')}</div></div>` : ''}
    <div class="carte"><div class="liste">${L.map(j => ligneMercato(j)).join('') || '<p class="mut">Aucun joueur suivi : touche « Suivre » dans la fiche d\'un joueur.</p>'}</div></div>`;
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
const rangBadge = b => b ? ({bronze:1, argent:2, or:3}[b[0]] || 0) : 0;
const sansAccent = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filtrerMercato(L, U){
  const place = U.masseMax - C.masse(M, U), q = sansAccent(MERC.q.trim()), ia = MERC.attr ? IDX(MERC.attr) : -1;
  const p = j => MERC.poste === 'tous' ? j.poste : MERC.poste;
  const [rp, rr] = MERC.role ? MERC.role.split(':') : [null, null];   // v155 : recherche par rôle (et badge)
  return L.filter(j => j && (MERC.poste === 'tous' || j.poste === MERC.poste) && j.age <= MERC.age && j.age >= MERC.ageMin
      && (!q || sansAccent(j.p + ' ' + j.n).includes(q))
      && (!MERC.moyens || ((j.club ? C.prixClub(M, j) : 0) <= U.budget && C.salaireDemande(j, U) <= place))
      && (!MERC.valMax || C.valeur(M, j) <= MERC.valMax) && (!MERC.salMax || (j.contrat ? j.contrat.sal : 0) <= MERC.salMax)
      && (!MERC.noteMin || noteVue(j, p(j)).mid >= MERC.noteMin) && (!MERC.nat || j.nat === MERC.nat)
      && (!MERC.fin || (j.contrat && j.contrat.fin <= M.saison)) && (ia < 0 || valVue(j, j.a[ia], MERC.attr).mid >= MERC.attrMin)
      && (!rp || j.poste === rp) && (!MERC.badge || (rp && rangBadge(badgeDe(j, rp, rr)) >= rangBadge([MERC.badge]))))
    .map(j => ({j, k:MERC.tri === 'role' && rp ? (connu(j) >= 80 || j.club === U.id ? QM.scoreRole(j, rp, rr) * 5 : noteVue(j, rp).mid) : MERC.tri === 'pot' ? C.potentielEstime(M, j) * 100 + noteVue(j, p(j)).mid : MERC.tri === 'valeur' ? C.valeur(M, j) : MERC.tri === 'age' ? -j.age : noteVue(j, p(j)).mid}))
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
  if (MERC.role){ const [p, r] = MERC.role.split(':'); R.push(['role', `rôle ${roleNom(p, r).toLowerCase()}`]); }
  if (MERC.badge) R.push(['badge', `badge ${MERC.badge} ou mieux`]);
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
      <label><span>Rôle</span>${sel('role', [['', 'Tous'], ...['P', 'B', 'A', 'G'].filter(p => MERC.poste === 'tous' || MERC.poste === p).flatMap(p => D.ROLES[p].map(r => [p + ':' + r[0], r[1] + (MERC.poste === 'tous' ? ' (' + D.POSTES[p].nom.toLowerCase() + ')' : '')]))], MERC.role)}</label>
      <label><span>Badge dans ce rôle</span>${sel('badge', [['', 'Peu importe'], ['bronze', 'Bronze ou mieux'], ['argent', 'Argent ou mieux'], ['or', 'Or']], MERC.badge)}</label>
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
  const resp = c.staff.formation, scene = Z_() && Z_().sceneDispo('formation');   // v132 : le pensionnat illustré
  VUE.innerHTML = `<div><h1 class="grand">Centre de formation</h1><p class="sous">Niveau ${C.niv(c, 'formation')} · responsable : ${esc(resp.p + ' ' + resp.n)} (${resp.note}/20) · ${L.length}/${E.carriere.academieMax} jeunes</p></div>
  ${scene ? Z_().sceneHTML('formation') : ''}
  <div class="carte" id="jeunes" style="scroll-margin-top:70px"><div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${D.POSTES[j.poste].nom.toLowerCase()}</span></div><span class="etoiles" aria-label="potentiel">${'★'.repeat(C.potentielEstime(M, j))}${'☆'.repeat(5 - C.potentielEstime(M, j))}</span><span class="note ${classeNote(QM.note(j))}">${QM.note(j)}</span></button>`).join('') || '<p class="mut">Le centre est vide : la prochaine promotion arrive l\'été.</p>'}</div></div>
  <div class="carte aide"><h2>Comment ça marche</h2><p>Chaque été, ${1 + C.niv(c, 'formation')} jeunes de 15-16 ans arrivent. Leur potentiel dépend du niveau du centre (Club › Stade) et du responsable de la formation (Club › Staff). Ils s'entraînent chaque semaine ; promus, ils jouent et progressent plus vite.</p></div>`;
}
/* ---------- v88 : le domaine du club (qm27-domaine.js : window.QMB) ---------- */
const B = window.QMB;
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
    <div class="carte"><h2>À surveiller</h2>${mec.length ? `<div class="liste">${mec.map(j => ligneJ(j, `Veut plus de temps de jeu (${(j.saison.m || 0) + (j.saison.em || 0)} match${(j.saison.m || 0) + (j.saison.em || 0) > 1 ? 's' : ''})`)).join('')}</div>` : '<p class="mut" style="margin:0">Personne ne râle pour l\'instant.</p>'}</div>
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
  ${S && S.type === 'bilan' ? '<button class="btn or plein" data-act="saisonSuivante">Passer à la saison suivante</button>' : `<button class="btn plein" data-act="continuer">${libAvancer()}${S ? ' (' + fmtDate(dateEtape(S)) + ')' : ''}</button>`}
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

Object.assign(VUES, {vestiaire:vueVestiaire, domaine:vueDomaine, boutique:vueBoutique, buvette:vueBuvette, partenaires:vuePartenaires, trophees:vueTrophees, carriere:vueCarriere, stade:vueStade, formation:vueFormation, selection:vueSelection, accueil:vueAccueil, tactique:vueTactique, classements:vueClassements, sauvegardes:vueSauvegardes, aide:vueAide, match:vueMatch,
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
  ligue:d => { U.ligue = d.l; rendre(); },
  semaine:d => ficheSemaine(+d.s),
  feuilleInter:d => feuilleInter(d.k, d.m),   // v161
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
  son:() => { REG.son = !REG.son; regler(); if (REG.son && U.live && U.live.parti && !X.fini){ window.QMF.Son.demarrer(); } else window.QMF.Son.arreter(); const b = document.querySelector('.ctrl [data-act="son"]'); if (b){ b.textContent = REG.son ? '🔊' : '🔈'; b.setAttribute('aria-pressed', !!REG.son); b.setAttribute('aria-label', REG.son ? 'Couper le son' : 'Activer le son'); } },
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
  /* v152 : plans de jeu */
  plan:d => { const G_ = GG(); if (!G_) return; G_.choisirPreset(M, +d.i); sauver(); rendre(); toast(`Plan « ${club(M.manager.club).presets[+d.i].nom} »`); },
  planAvant:d => { const G_ = GG(), c = moiC(); if (!G_ || !c) return; G_.choisirPreset(M, +d.i); if (X && !X.sixn) X.e[X.joueur].tactique = QM.completerTactique(JSON.parse(JSON.stringify(c.tactique))); sauver(); rendre(); toast(`Plan « ${c.presets[+d.i].nom} » pour ce match`); },
  planRevenir:d => { const G_ = GG(), c = moiC(); if (!G_ || !c) return; G_.choisirPreset(M, c.presetActif); if (d.x && X && !X.sixn) X.e[X.joueur].tactique = QM.completerTactique(JSON.parse(JSON.stringify(c.tactique))); sauver(); rendre(); toast('Retour au plan enregistré'); },
  planEnregistrer:() => { const G_ = GG(), c = moiC(); if (!G_ || !c) return; G_.enregistrerPreset(M); sauver(); rendre(); toast(`« ${c.presets[c.presetActif].nom} » enregistré`); },
  planNom:d => { const c = moiC(); if (!c || !GG()) return; const i = +d.i, p = GG().presets(M, c)[i];
    feuille(`${teteF('Renommer le plan', 'Un nom court, par exemple « Bloc bas » ou « Contre les gros »')}<input class="champ" id="nomPlan" maxlength="18" value="${esc(p.nom)}" autocomplete="off" style="width:100%;box-sizing:border-box"><div style="height:10px"></div><button class="btn plein" data-act="planNomOk" data-i="${i}">Enregistrer le nom</button>`);
    setTimeout(() => { const n = document.getElementById('nomPlan'); if (n){ n.focus(); n.select(); } }, 60); },
  planNomOk:d => { const n = document.getElementById('nomPlan'); if (n && GG()) GG().renommerPreset(M, +d.i, n.value); fermerFeuille(); sauver(); rendre(); },
  travailPlan:d => { if (!GG()) return; GG().choisirTravail(M, d.v); sauver(); rendre(); },
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
  mercPoste:d => { MERC.poste = d.p; if (MERC.role && d.p !== 'tous' && !MERC.role.startsWith(d.p + ':')){ MERC.role = ''; MERC.badge = ''; } garderMerc(); if (document.querySelector('.fond')) ficheFiltres(); else rendre(); },
  mercFiltres:() => ficheFiltres(),
  mercVoir:() => { fermerFeuille(); if (!['recherche', 'libres'].includes(MERC.onglet)) MERC.onglet = 'recherche'; rendre(); },
  mercRaz:() => { Object.assign(MERC, {poste:'tous', age:99, ageMin:15, moyens:false, valMax:0, salMax:0, noteMin:0, nat:'', fin:false, attr:'', role:'', badge:''}); garderMerc(); ficheFiltres(); },
  mercRetire:d => { const def = {poste:'tous', age:99, valMax:0, salMax:0, noteMin:0, nat:'', fin:false, moyens:false, attr:'', role:'', badge:''}; if (d.k === 'role') MERC.badge = ''; if (d.k === 'age'){ MERC.age = 99; MERC.ageMin = 15; } else MERC[d.k] = def[d.k]; garderMerc(); rendre(); },
  mercTri:d => { MERC.tri = d.t; garderMerc(); rendre(); },
  suivre:d => { const on = C.suivre(M, d.j); sauver(); toast(on ? `Joueur supervisé : premier rapport du recruteur${C.mercatoOuvert(QM.semaine(M)) ? '' : ''}${club(M.manager.club).suivi.length > E.scouting.plein ? ` (plus de ${E.scouting.plein} joueurs suivis : son temps se partage)` : ''}` : 'Plus supervisé'); ficheJoueur(d.j); },
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
  changerAmel:d => { const c = club(M.manager.club), x = B.AMEL[d.a]; if (!confirm(`Remplacer par ${x.nom} ? Travaux : ${eurT(B.coutChangement(c, d.a))}, ${E.changerAmel.semaines} semaines ; l'amélioration actuelle est retirée dès maintenant.`)) return; const r = B.changerAmel(M, d.a); toast(r.msg); if (r.ok){ sauver(); rendre(); ficheBat(x.bat); } },   // v166
  amel:d => { const r = B.choisirAmel(M, d.a); toast(r.msg); if (r.ok){ sauver(); const k = B.AMEL[d.a].bat; rendre(); ficheBat(k); } },
  tribune:d => { const c = club(M.manager.club); if (c.travaux.some(t => t.type === 'stade')) return toast('Des travaux sont déjà en cours au stade.'); if (!confirm(`Agrandir la tribune ${({N:'nord', S:'sud', E:'est', O:'ouest'})[d.c]} de ${E.stade.tranche.toLocaleString('fr-FR')} places pour ${eurT(C.coutTravaux(c, 'stade'))} ?`)) return; const r = B.lancer(M, 'stade', d.c); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  prixCarte:d => { const r = B.reglerCarte(M, d.p, 'prix', d.v); if (!r.ok) return toast(r.msg); sauver(); rendre(); },   // v133
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
  /* v164 : le calcul de la semaine (0,2 à 1 s sur iPhone) part après l'affichage de « Semaine en cours… » : le bouton répond tout de suite */
  continuer:() => { if (U.calcul) return; U.calcul = true; document.body.classList.add('qm-calcul');
    document.querySelectorAll('[data-act="continuer"]').forEach(b => { b.disabled = true; b.dataset.txt = b.innerHTML; b.innerHTML = `<span class="qm-roue" aria-hidden="true"></span>${avantMercredi() ? 'Mercredi en cours…' : 'Semaine en cours…'}`; });
    requestAnimationFrame(() => setTimeout(() => { try{ ACT.continuerMaintenant(); } finally { U.calcul = false; document.body.classList.remove('qm-calcul'); document.querySelectorAll('[data-act="continuer"][data-txt]').forEach(b => { b.disabled = false; b.innerHTML = b.dataset.txt; delete b.dataset.txt; }); } }, 0)); },
  continuerMaintenant:() => {
    if (avantMercredi()){ QM.miSemaine(M); sauver(); rendre(); scrollTo(0, 0); toast('Mercredi : les hiboux du mercato sont revenus'); return; }   // v166 : premier temps de la semaine du mercato
    const S = QM.semaine(M), mj = QM.matchDuJoueur(M); QM.terminerSemaine(M, null); sauver(); rendre(); scrollTo(0, 0);
    if (mj && mj.res && mj.ligue !== 'sixn') return toast(`${club(mj.dom).nom} ${mj.res.score[0]}–${mj.res.score[1]} ${club(mj.ext).nom}`);   // v166 : match joué sans préparation
    toast(S.type === 'sixn' ? (S.comp && window.QMN ? `${window.QMN.titreSemaine(S)} : joué` : `${D.TOURNOI.court} · tour ${S.tour} joué`) : S.type === 'prepa' ? `Préparation · semaine ${S.semaine} terminée` : 'Semaine passée'); },
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
  if (t.dataset.chg === 'policeJeu'){ Themes.choisirPoliceJeu(t.value); return; }   // v126
  if (t.dataset.chg === 'noms'){ REG.noms = QM.langueNoms(t.value); regler(); if (M){ QM.nommer(M); sauver(); } if (MONDE_NEUF) QM.nommer(MONDE_NEUF); entete(); toast({local:'Noms dans la langue de chaque pays', en:'Noms en anglais', fr:'Noms en français'}[REG.noms]); }
  if (t.dataset.chg === 'resumes'){ REG.resumes = t.checked ? 'enjeu' : 'tout'; regler(); }
  if (t.dataset.chg === 'son'){ REG.son = t.checked; regler(); }
  if (t.dataset.chg === 'causeries'){ REG.causeries = t.checked; regler(); }
  if (t.dataset.chg === 'presse'){ REG.presse = t.checked; regler(); }
  if (t.dataset.chg === 'presseN'){ REG.presseN = +t.value; regler(); }
  if (t.dataset.chg === 'triche' && M){ HH().etat(M).triche = t.checked; sauver(); toast(t.checked ? 'Paris et pots-de-vin activés pour cette partie' : 'Désactivés'); }
  if (t.dataset.chg === 'carte'){ const r = B.reglerCarte(M, t.dataset.p, 'actif', t.checked); if (!r.ok){ t.checked = !t.checked; toast(r.msg); return; } sauver(); rendre(); return; }   // v133
  if (t.dataset.chg === 'produit'){ const r = B.reglerProduit(M, t.dataset.p, 'actif', t.checked); if (!r.ok){ t.checked = !t.checked; toast(r.msg); return; } sauver(); rendre(); return; }
  if (t.dataset.chg === 'poste'){ placerSlot(ctxCompo(), t.dataset.j, t.value || null); return; }
  if (t.dataset.chg === 'mercF'){ const k = t.dataset.k; MERC[k] = t.type === 'checkbox' ? t.checked : ['nat', 'attr', 'role', 'badge'].includes(k) ? t.value : +t.value; if (k === 'role' && !t.value) MERC.badge = ''; if (k === 'ageMin' && MERC.age < MERC.ageMin) MERC.age = 99; garderMerc(); return; }
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
/* v164 : après le chargement de tous les scripts (fiche, lieux, direct, écrans), pour que le premier rendu les trouve */
const demarrer = async () => {
  const n = LS.lire(K_DERNIER, null);
  if (n && emplacements()[n]){ try{ await chargerEmp(n); }catch{ M = null; } }
  racine(); rendre();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer, {once:true}); else setTimeout(demarrer, 0);
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
  scArdoise:() => { const r = document.getElementById('rayons'); if (r) r.scrollIntoView({behavior:'smooth', block:'start'}); },   // v124 : l'ardoise mène aux prix
  scMerc:d => { fermerFeuille(); MERC.onglet = d.o; MERC.vu = 1; aller('mercato'); },   // v122 : depuis le bureau du recrutement, l'onglet voulu du mercato
  scBalais:d => { const c = club(M.manager.club); feuille(`<div data-sc="scBalais">${teteF('Balais', esc(c.nom))}${blocBalais(c)}</div>`, d && d.garder); },
  scBlesses:d => { const c = club(M.manager.club), L = c.effectif.map(id => M.joueurs[id]).filter(j => j && j.bless).sort((a, b) => b.bless.jours - a.bless.jours);
    feuille(`<div data-sc="scBlesses">${teteF('Infirmerie', L.length ? `${L.length} blessé${L.length > 1 ? 's' : ''}` : 'Personne à soigner')}
      ${L.length ? `<div class="carte"><div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${esc(j.bless.nom)} · encore ${j.bless.jours} jour${j.bless.jours > 1 ? 's' : ''}</span></div><span class="d mut">›</span></button>`).join('')}</div></div>`
        : '<p class="mut">Tout le monde est sur pied.</p>'}</div>`, d && d.garder); },
  scProgression:() => { fermerFeuille(); aller('progression'); },   // v127 : l'écran existe
  scEtage:() => toast('Cet étage est fermé pour l\'instant.'),   // v151 : l'escalier barré du couloir des bureaux
  scCouloir:() => { const m = QM.matchDuJoueur(M); if (m && !m.res){ fermerFeuille(); return ACT.preparer(); }
    let pm = null; try { pm = TT() && TT().prochainMatch(M); } catch (e){}
    const adv = pm && pm.m && (pm.m.dom === M.manager.club ? pm.m.ext : pm.m.dom);
    feuille(`${teteF('Aucun match cette semaine', esc(club(M.manager.club).nom))}${adv && M.clubs[adv] ? `<p style="margin:0 0 12px">Prochain match contre <b>${esc(club(adv).nom)}</b>${pm.S && pm.S.date ? `, le ${fmtDate(pm.S.date)}` : ''}.</p>` : '<p class="mut">Pas de match prévu pour l\'instant.</p>'}
      <div class="btns"><button class="btn sec" data-act="vue" data-v="calendrier">Calendrier</button><button class="btn sec" data-act="vue" data-v="tactique">Tactique</button></div>`); },
});
function rafraichirFeuilleScene(){ const el = document.querySelector('.fond .feuille [data-sc]'); if (el && ACT[el.dataset.sc]) ACT[el.dataset.sc]({garder:true}); }
window.QMU = {flagSeul, pieces, eurT, get M(){ return M; }, get X(){ return X; }, get EMP(){ return EMP; }, U, REG, regler, VUES, ACT, VUE, D, E, C, V, B, esc, eur, fmtDate, lab, club, nat, blason, avatarDe, nomEq, flag, posteB, etoiles, nomJ, court,
  classeNote, classeAttr, meilleurBadge, rangBadge, roleNom, imgBadge, visageMoral, toast, feuille, fermerFeuille, retirerFeuille, teteF, sauver, rendre, aller, ficheJoueur, noteVue, valVue, connu, HH, roleDe, ficheSemaine, msgHTML, tableHTML, ICO, MERC, ligneMercato, IDX, COURT_ATTR, LS, nomBat, COULEUR_POSTE, STAT_P, axesRadar, badgeDe, badgeHTML, blocContrat, blocJeune, carriereHTML, matchsInter, rapportRecruteur, Z_, nomOpt, $, TT, adversaireHTML, causerieHTML, consignesHTML, divinationHTML, fitOption, nb1, optsMaitrise, parisHTML, pastille, plansHTML, plansPrev, presseHTML, previsionHTML, set X(v){ X = v; }, set M(v){ M = v; }};
})();
