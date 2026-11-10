// mon-ecran-version: 5c71783c
/* QM27 (v83, lot 2 : v84) — écrans : démarrage et emplacements, accueil du club, effectif et fiche joueur, tactique, match en direct,
   calendrier, classements, sauvegardes, aide. Moteur : qm27.js (window.QM) ; données : qm27-donnees.js (window.QMD).
   Sauvegarde : IndexedDB (base « qm27 », une partie par emplacement), sinon localStorage ; résumé des emplacements dans localStorage. */
(() => {
'use strict';
const D = window.QMD, E = D.EQ, C = window.QMC;
const eur = x => C.euros(x);
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

/* ---------- Petits outils d'affichage ---------- */
const fmtDate = (t, long) => new Date(t).toLocaleDateString('fr-FR', long ? {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC'} : {weekday:'short', day:'numeric', month:'short', timeZone:'UTC'});
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const club = id => M.clubs[id];
const nat = id => D.NATIONS[id];
const nomEq = (id, sixn) => sixn ? nat(id).nom : club(id).nom;
function blason(id, taille, sixn){
  if (sixn || D.NATIONS[id]) return `<span class="blason nat ${taille || ''}" aria-hidden="true">${nat(id).drapeau}</span>`;
  const c = club(id); return `<span class="blason ${taille || ''}" style="--c1:${c.couleurs[0]};--c2:${c.couleurs[1]}" aria-hidden="true">${esc(c.sigle)}</span>`;
}
const classeNote = n => n >= 66 ? 'n4' : n >= 56 ? 'n3' : n >= 46 ? 'n2' : 'n1';
const classeAttr = v => v >= 15 ? 'n4' : v >= 10 ? 'n3' : v >= 6 ? 'n2' : 'n1';
const posteB = p => `<span class="poste ${p}" title="${D.POSTES[p].nom}">${p}</span>`;
const etoiles = rep => { const n = Math.max(1, Math.min(5, Math.round((rep - 30) / 11))); return `<span class="etoiles" aria-label="${n} étoiles sur 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`; };
const nomJ = j => j ? `${j.p} ${j.n}` : '—';
const court = j => j ? `${j.p[0]}. ${j.n}` : '—';
const flag = n => (D.NATIONS[n] || {}).drapeau || '';
const ICO = {
  accueil:'<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
  effectif:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.3-.3 4.4 1.1 5 4"/>',
  tactique:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M12 4v16M3.5 12h3M17.5 12h3"/><circle cx="12" cy="12" r="2.6"/>',
  calendrier:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>',
  plus:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  club:'<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.1 7.5 9.5 4.4-1.4 7.5-5.1 7.5-9.5V6z"/><path d="M8.5 12.5h7M12 9v7"/>',
};
function toast(t){ const o = document.querySelector('.toast-qm'); if (o) o.remove(); const d = document.createElement('div'); d.className = 'toast-qm'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function feuille(html){
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
let enCours = null;
function sauver(){
  if (!M || !EMP) return Promise.resolve();
  const L = emplacements(), c = M.manager ? club(M.manager.club) : null, S = QM.semaine(M);
  L[EMP] = {club:c ? c.id : null, nomClub:c ? c.nom : '', manager:M.manager ? M.manager.nom : '', saison:lab(M.saison), date:S ? S.date : null, maj:Date.now()};
  LS.ecrire(K_EMP, L); LS.ecrire(K_DERNIER, EMP);
  const txt = QM.serialiser(M);
  enCours = Base.ecrire('p' + EMP, txt).catch(() => toast('Sauvegarde impossible : mémoire pleine ?'));
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
  const t = $('#titre'), dr = $('#hdDr');
  if (!M || !M.manager){ t.innerHTML = '<b><span class="marque-qm">QM27</span></b><span>Quidditch Manager 27</span>'; dr.innerHTML = ''; return; }
  const c = club(M.manager.club), S = QM.semaine(M);
  t.innerHTML = `<b>${esc(c.nom)}</b><span><span class="marque-qm">QM27</span> · ${lab(M.saison)}${S ? ' · ' + fmtDate(S.date) : ''}</span>`;
  dr.innerHTML = blason(c.id, 'p');
}
function barre(){
  const on = M && M.manager && U.vue !== 'match' && !U.live;
  NAV.hidden = !on; document.body.classList.toggle('sans-nav', !on);
  if (!on) return;
  const T = [['accueil', 'Accueil'], ['effectif', 'Effectif'], ['tactique', 'Tactique'], ['club', 'Club'], ['plus', 'Plus']];
  const actif = ['classements', 'sauvegardes', 'aide', 'calendrier'].includes(U.vue) ? 'plus' : ['entrainement', 'mercato', 'finances', 'staff'].includes(U.vue) ? 'club' : U.vue;
  NAV.querySelector('.in').innerHTML = T.map(([k, n]) => `<button data-act="vue" data-v="${k}" class="${actif === k ? 'on' : ''}" ${actif === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24">${ICO[k]}</svg>${n}</button>`).join('');
}
function rendre(){
  entete(); barre();
  if (!M || !M.manager) return vueDemarrage();
  ({accueil:vueAccueil, effectif:vueEffectif, tactique:vueTactique, calendrier:vueCalendrier, plus:vuePlus, classements:vueClassements, sauvegardes:vueSauvegardes, aide:vueAide, match:vueMatch,
    club:vueClub, entrainement:vueEntrainement, mercato:vueMercato, finances:vueFinances, staff:vueStaff}[U.vue] || vueAccueil)();
}
const aller = v => { U.vue = v; rendre(); scrollTo(0, 0); };

/* ---------- Démarrage ---------- */
const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--or-doux)"/><circle cx="32" cy="32" r="9" fill="var(--or)"/>
  <path d="M23 30c-6-7-13-8-17-6 5 0 9 3 12 8M41 30c6-7 13-8 17-6-5 0-9 3-12 8" fill="none" stroke="var(--or)" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M22 34c-5-3-10-2-13 1 4-1 8 0 11 2M42 34c5-3 10-2 13 1-4-1-8 0-11 2" fill="none" stroke="var(--or)" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>`;
function vueDemarrage(){
  if (U.etape === 'club') return vueChoixClub();
  const L = emplacements();
  VUE.innerHTML = `
  <div class="logo-qm">${LOGO}<h1>Quidditch Manager 27<small>QM27</small></h1></div>
  <p class="sous">Prenez les commandes d'un club : composition, consignes, matchs en direct. 48 clubs, 3 ligues et le Six Nations.</p>
  <div class="carte"><h2>Parties</h2><div class="liste">
  ${Array.from({length:NB_EMP}, (_, i) => i + 1).map(n => { const e = L[n];
    if (!e) return `<div class="el emp"><span class="blason nat" aria-hidden="true" style="font-size:1.3rem;color:var(--ink-soft)">+</span><div class="t"><b>Emplacement ${n}</b><span>Libre</span></div><button class="btn" data-act="nouvelle" data-n="${n}">Nouvelle carrière</button></div>`;
    return `<div class="el emp">${e.club && D.CLUBS.some(c => c[0] === e.club) ? blasonCode(e.club) : ''}<div class="t"><b>${esc(e.nomClub)}</b><span>${esc(e.manager)} · ${esc(e.saison)}${e.date ? ' · ' + fmtDate(e.date) : ''}</span></div>
      <button class="btn" data-act="charger" data-n="${n}">Reprendre</button><button class="fermer" data-act="menuEmp" data-n="${n}" aria-label="Plus d'actions">⋯</button></div>`; }).join('')}
  </div></div>
  <button class="btn sec plein" data-act="importer">Importer une partie (fichier .json)</button>
  <p class="petit mut">Les parties sont gardées sur cet appareil. Pour passer d'un appareil à l'autre, exporte la partie puis importe le fichier.</p>`;
}
function blasonCode(id){ const c = D.CLUBS.find(x => x[0] === id); return `<span class="blason" style="--c1:${c[6]};--c2:${c[7]}" aria-hidden="true">${esc(c[2].normalize('NFD').replace(/[^\w]/g, '').toUpperCase().slice(0, 3))}</span>`; }
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
      return `<button class="el" data-act="voirClub" data-c="${c.id}"><span class="blason" style="--c1:${c.couleurs[0]};--c2:${c.couleurs[1]}" aria-hidden="true">${esc(c.sigle)}</span>
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
  feuille(`${teteF(esc(c.nom), `${flag(c.nat)} ${esc(c.ville)} · ${esc(W.ligues[c.ligue].nom)}`, `<span class="blason g" style="--c1:${c.couleurs[0]};--c2:${c.couleurs[1]}" aria-hidden="true">${esc(c.sigle)}</span>`)}
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
      <p class="sous" style="margin:0 0 4px">Champions : ${Object.values(M.ligues).map(L => esc(club(h.champions[L.id]).nom)).join(' · ')}</p>
      <p class="sous" style="margin:0 0 12px">Six Nations : ${flag(h.sixn)} ${esc(nat(h.sixn).nom)}</p>
      <button class="btn or plein" data-act="saisonSuivante">Lancer la saison ${lab(M.saison + 1)}</button></div>`;
  } else {
    const m = QM.matchDuJoueur(M);
    if (m){
      const comp = `${M.ligues[m.ligue].court} · Journée ${S.journee}`;
      const adv = m.dom === mg.club ? m.ext : m.dom, T = M.tables[m.ligue], CL = QM.classement(M, m.ligue);
      const rang = id => CL.findIndex(r => r.id === id) + 1, forme = id => (T[id].forme || []).map(f => `<span class="vnd ${f}">${f}</span>`).join('');
      prochain = `<div class="carte"><h2>Prochain match <span class="mut">${fmtDate(S.date)}</span></h2>
        <div class="petit mut" style="text-align:center">${esc(comp)}</div>
        <div class="affiche">
          <div class="eq">${blason(m.dom, 'g')}<b>${esc(club(m.dom).nom)}</b><span>${T[m.dom].j ? rang(m.dom) + 'e · ' : ''}${forme(m.dom) || 'à domicile'}</span></div>
          <div class="vs">VS</div>
          <div class="eq">${blason(m.ext, 'g')}<b>${esc(club(m.ext).nom)}</b><span>${T[m.ext].j ? rang(m.ext) + 'e · ' : ''}${forme(m.ext) || 'à l\'extérieur'}</span></div>
        </div>
        <div class="btns"><button class="btn" data-act="preparer">Préparer le match</button></div>
        <p class="petit mut" style="margin:8px 0 0;text-align:center">Adversaire : ${etoiles(club(adv).rep)}</p></div>`;
    } else {
      const titre = S.type === 'sixn' ? `Six Nations · tour ${S.tour}` : S.type === 'prepa' ? `Préparation · semaine ${S.semaine}` : 'Semaine sans match';
      prochain = `<div class="carte"><h2>${titre} <span class="mut">${fmtDate(S.date)}</span></h2>
        ${S.type === 'sixn' ? `<p class="sous" style="margin:0 0 8px">Les ligues font une pause. Sélections gérées par les fédérations.</p><div class="liste">${S.matchs.map(x => `<div class="el">${blason(x.dom, 'p', 1)}<div class="t"><b>${esc(nat(x.dom).nom)} – ${esc(nat(x.ext).nom)}</b></div>${blason(x.ext, 'p', 1)}</div>`).join('')}</div>` : ''}
        ${S.type === 'prepa' ? `<p class="sous" style="margin:0 0 4px">Pas de match : on s'entraîne et le mercato d'été est ouvert jusqu'à la première journée.</p>` : ''}
        <div class="btns" style="margin-top:10px">${C.mercatoOuvert(S) ? '<button class="btn sec" data-act="vue" data-v="mercato">Mercato</button>' : ''}<button class="btn" data-act="continuer">Continuer</button></div></div>`;
    }
  }
  if (M.offres && M.offres.length) prochain += `<div class="carte" style="border-color:var(--or)"><h2>Offres reçues <button data-act="vue" data-v="mercato">Répondre</button></h2>${M.offres.map(o => `<div class="el">${blason(o.club, 'p')}<div class="t"><b>${esc(nomJ(M.joueurs[o.j]))}</b><span>${esc(club(o.club).nom)} · ${eur(o.montant)}</span></div></div>`).join('')}</div>`;
  const o = mg.objectif, conf = mg.confiance;
  const CL = QM.classement(M, c.ligue), i = CL.findIndex(r => r.id === c.id);
  const deb = Math.max(0, Math.min(CL.length - 5, i - 2)), part = CL.slice(deb, deb + 5);
  const boite = M.boite.slice(0, 5);
  const dernier = M.dernierMatch;
  VUE.innerHTML = `<div class="cols"><div>
    ${prochain}
    ${dernier ? `<div class="carte"><h2>Dernier match</h2><button class="el" data-act="voirDernier">${blason(dernier.dom, 'p', dernier.sixn)}<div class="t"><b>${esc(nomEq(dernier.dom, dernier.sixn))} ${dernier.score[0]}–${dernier.score[1]} ${esc(nomEq(dernier.ext, dernier.sixn))}</b><span>${dernier.resume}</span></div>${blason(dernier.ext, 'p', dernier.sixn)}</button></div>` : ''}
    <div class="carte"><h2>Boîte de réception ${M.boite.length > 5 ? `<button data-act="boite">Tout voir</button>` : ''}</h2>${boite.length ? boite.map(msgHTML).join('') : '<p class="mut">Rien pour l\'instant.</p>'}</div>
  </div><div>
    <div class="carte"><h2>Président</h2>
      <div class="ligne" style="justify-content:space-between"><span>Objectif</span><b>${esc(o.txt)}</b></div>
      <div style="margin:10px 0 4px" class="ligne"><span style="flex:1">Confiance</span><b>${conf} %</b></div>
      <div class="jauge" role="meter" aria-valuenow="${conf}" aria-valuemin="0" aria-valuemax="100" aria-label="Confiance du président"><i style="width:${conf}%"></i></div>
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Solde du club</span><b style="color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</b></div>
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Réputation du manager</span><b>${Math.round(mg.rep)} / 100</b></div>
      <div class="sep"></div><div class="ligne" style="justify-content:space-between"><span>Bilan de la saison</span><b>${mg.bilan.g} V · ${mg.bilan.n} N · ${mg.bilan.p} D</b></div></div>
    <div class="carte"><h2>${esc(M.ligues[c.ligue].nom)} <button data-act="vue" data-v="classements">Classement</button></h2>${tableHTML(part, c.ligue, true, deb)}</div>
  </div></div>`;
  for (const m of M.boite) m.lu = true;
}
const msgHTML = m => `<div class="msg ${m.lu ? '' : 'neuf'}"><b>${esc(m.titre)}</b><p>${esc(m.corps)}</p></div>`;

/* ---------- Classements ---------- */
function tableHTML(rows, ligue, compact, deb = 0){
  const sixn = ligue === 'sixn', moi = M.manager.club;
  return `<table class="cl"><thead><tr><th>#</th><th>${sixn ? 'Nation' : 'Club'}</th><th>J</th>${compact ? '' : '<th class="tab-cache">V</th><th class="tab-cache">N</th><th class="tab-cache">D</th><th class="tab-cache">Vifs</th>'}<th>Diff</th><th>Pts</th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr class="${r.id === moi ? 'moi' : ''}"><td>${deb + i + 1}</td><td class="club"><div>${blason(r.id, 'p', sixn)}<span>${esc(sixn ? nat(r.id).nom : club(r.id).nom)}</span></div></td><td>${r.j}</td>${compact ? '' : `<td class="tab-cache">${r.g}</td><td class="tab-cache">${r.n}</td><td class="tab-cache">${r.p}</td><td class="tab-cache">${r.vifs}</td>`}<td>${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td><td class="pts">${r.pts}</td></tr>`).join('')}
  </tbody></table>`;
}
function vueClassements(){
  const l = U.ligue || club(M.manager.club).ligue;
  const tabs = [...Object.values(M.ligues).map(x => [x.id, x.court]), ['sixn', 'Six Nations']];
  VUE.innerHTML = `<div><h1 class="grand">Classements</h1><p class="sous">Saison ${lab(M.saison)} · victoire ${E.points.victoire} pts, nul ${E.points.nul} pt</p></div>
  <div class="seg" role="tablist">${tabs.map(([k, n]) => `<button role="tab" data-act="ligue" data-l="${k}" class="${k === l ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>
  <div class="carte">${tableHTML(QM.classement(M, l), l, false)}</div>
  <p class="petit mut">Départage : points, différence de points marqués et encaissés, points marqués, vifs d'or attrapés.</p>`;
}

/* ---------- Effectif ---------- */
const ORDRE_P = {P:0, B:1, A:2, G:3};
function roleDe(id){ const c = club(M.manager.club).compo; for (const p of ['P', 'B', 'A', 'G']) if (c[p].includes(id)) return {tit:true, p}; return c.banc.includes(id) ? {banc:true} : {}; }
function vueEffectif(){
  const c = club(M.manager.club);
  let L = c.effectif.map(id => M.joueurs[id]);
  if (U.filtre === 'bless') L = L.filter(j => j.bless);
  else if (U.filtre !== 'tous') L = L.filter(j => j.poste === U.filtre);
  const tri = {poste:(a, b) => ORDRE_P[a.poste] - ORDRE_P[b.poste] || QM.note(b) - QM.note(a), note:(a, b) => QM.note(b) - QM.note(a), age:(a, b) => a.age - b.age, forme:(a, b) => b.forme - a.forme}[U.tri];
  L.sort(tri);
  const F = [['tous', 'Tous'], ['P', 'Poursuiveurs'], ['B', 'Batteurs'], ['A', 'Attrapeurs'], ['G', 'Gardiens'], ['bless', 'Blessés']];
  VUE.innerHTML = `<div><h1 class="grand">Effectif</h1><p class="sous">${c.effectif.length} joueurs · note au poste sur 100</p></div>
  <div class="chips">${F.map(([k, n]) => `<button class="chip ${U.filtre === k ? 'on' : ''}" data-act="filtre" data-f="${k}">${n}</button>`).join('')}</div>
  <div class="seg">${[['poste', 'Poste'], ['note', 'Note'], ['age', 'Âge'], ['forme', 'Forme']].map(([k, n]) => `<button data-act="tri" data-t="${k}" class="${U.tri === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="carte"><div class="liste">${L.map(j => { const r = roleDe(j.id), n = QM.note(j);
    return `<button class="el" data-act="joueur" data-j="${j.id}"><span class="num">${j.num}</span>${posteB(j.poste)}
      <div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${r.tit ? '<span class="badge tit">Titulaire</span>' : r.banc ? 'Remplaçant' : 'Réserve'}${j.bless ? ` · <span class="badge bless">✚ ${j.bless.jours} j</span>` : ''}${j.contrat && j.contrat.fin <= M.saison ? ' · <span class="badge" style="color:var(--moyen)">fin de contrat</span>' : ''}${c.aVendre.includes(j.id) ? ' · <span class="badge">à vendre</span>' : ''}</span></div>
      <div class="d"><div class="barre" title="Forme ${j.forme}/10"><i style="width:${j.forme * 10}%"></i></div><div class="barre fat" style="margin-top:4px" title="Fatigue ${j.fat} %"><i style="width:${j.fat}%"></i></div></div>
      <span class="note ${classeNote(n)}">${n}</span></button>`; }).join('') || '<p class="mut">Personne ici.</p>'}</div></div>
  <p class="petit mut">Barres : forme (en haut), fatigue (en bas). Toucher un joueur pour sa fiche.</p>`;
}
function ficheJoueur(id){
  const j = M.joueurs[id]; if (!j) return;
  const mon = j.club === M.manager.club, r = mon ? roleDe(id) : {};
  const cible = {}; D.ATTRS.forEach((a, i) => { cible[a[0]] = a[3]['PBAG'.indexOf(j.poste)] === '●'; });
  const fam = ['Physique', 'Vol', 'Balle', 'Mental'];
  const pot = j.cache.pot, potE = Math.max(1, Math.min(5, Math.round((pot * 5 - 40) / 12)));
  const s = j.saison;
  feuille(`${teteF(`${esc(nomJ(j))}`, `${flag(j.nat)} ${esc(nat(j.nat).nom)} · ${j.age} ans · ${D.POSTES[j.poste].nom}${j.club ? (mon ? ' · n° ' + j.num : ' · ' + esc(club(j.club).nom)) : ' · agent libre'}`, `<span class="blason g nat" aria-hidden="true">${posteB(j.poste)}</span>`)}
    <div class="npostes">${['P', 'B', 'A', 'G'].map(p => `<div class="${p === j.poste ? 'on' : ''}"><b class="${classeNote(QM.note(j, p))}" style="color:inherit">${QM.note(j, p)}</b><span>${D.POSTES[p].nom}</span></div>`).join('')}</div>
    <div class="carte" style="margin-top:10px"><h2>Attributs <span class="mut petit">● cibles du poste</span></h2><div class="attrs">
      ${fam.map(f => `<div class="fam">${f}</div>` + D.ATTRS.map((a, i) => a[2] !== f ? '' : `<div class="attr ${cible[a[0]] ? 'c' : ''}"><span>${a[1]}</span><b class="v ${classeAttr(j.a[i])}">${j.a[i]}</b></div>`).join('')).join('')}
      ${j.poste === 'G' ? `<div class="fam">Gardien</div>` + D.GARDIEN.map((g, i) => `<div class="attr ${j.poste === 'G' ? 'c' : ''}"><span>${g[1]}</span><b class="v ${classeAttr(j.g[i])}">${j.g[i]}</b></div>`).join('') : ''}
    </div></div>
    <div class="carte" style="margin-top:10px"><h2>État et saison</h2>
      <div class="stat" style="grid-template-columns:1fr auto">
        <span style="text-align:left;font-weight:400">Forme</span><b>${j.forme} / 10</b>
        <span style="text-align:left;font-weight:400">Fatigue</span><b>${j.fat} %</b>
        <span style="text-align:left;font-weight:400">Moral</span><b>${Math.round(j.moral)} / 100</b>
        <span style="text-align:left;font-weight:400">Blessure</span><b>${j.bless ? esc(j.bless.nom) + ' · ' + j.bless.jours + ' j' : 'aucune'}</b>
        <span style="text-align:left;font-weight:400">Potentiel estimé par ${mon ? 'le staff' : 'ton recruteur'}</span><span class="etoiles">${'★'.repeat(C.potentielEstime(M, j))}${'☆'.repeat(5 - C.potentielEstime(M, j))}</span>
        <span style="text-align:left;font-weight:400">Matchs · buts · vifs</span><b>${s.m} · ${s.b} · ${s.v}</b>
        <span style="text-align:left;font-weight:400">Note moyenne</span><b>${s.m ? (s.notes / s.m).toFixed(1) : '—'}</b>
      </div></div>
    ${blocContrat(j, mon)}
    ${mon ? `<p class="petit mut" style="margin-top:10px">${r.tit ? `Titulaire (${D.POSTES[r.p].nom.toLowerCase()}).` : r.banc ? 'Remplaçant.' : 'Hors du groupe de 14.'} Les changements se font dans Tactique.</p>` : ''}`);
}

/* ---------- Tactique ---------- */
const CONSIGNES = [
  ['rythme', 'Rythme', 'Rapide : plus de tirs et de pertes de balle, plus de fatigue.', [[1, 'Lent'], [2, 'Normal'], [3, 'Rapide']]],
  ['risque', 'Prise de risque', 'Élevée : on tire plus souvent, de moins bonnes positions.', [[1, 'Faible'], [2, 'Normale'], [3, 'Élevée']]],
  ['agressivite', 'Agressivité', 'Plus de cognards réussis, plus de fautes et de penalties.', [[1, 'Calme'], [2, 'Normale'], [3, 'Dure']]],
  ['passes', 'Jeu de passes', 'Court : tirs plus sûrs. Long : plus de tirs.', [['court', 'Court'], ['long', 'Long']]],
  ['pressing', 'Pressing', 'Haut : gêne l\'adversaire mais fatigue et laisse des espaces.', [['repli', 'Repli'], ['haut', 'Haut']]],
  ['cible', 'Cible des cognards', 'Poursuiveurs : pertes de balle. Attrapeur : le gêne. Gardien : ouvre les anneaux.', [['poursuiveur', 'Poursuiveurs'], ['attrapeur', 'Attrapeur'], ['gardien', 'Gardien']]],
  ['attrapeur', 'Attrapeur', 'Le choix clé : prendre le vif d\'or quand on est mené de plus de 150 points fait perdre.', [['gagnant', 'Si ça fait gagner'], ['chasse', 'Chasse'], ['marquage', 'Marquage']]],
  ['gardien', 'Gardien', 'Sortir : moins de tirs adverses, mais buts plus faciles s\'il est passé.', [['anneaux', 'Aux anneaux'], ['sortie', 'Sortir']]],
];
function consignesHTML(T, act, liste){
  return CONSIGNES.filter(c => !liste || liste.includes(c[0])).map(([k, n, d, opts]) => `<div class="cons"><b>${n}</b><div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-k="${k}" data-v="${v}" class="${String(T[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div><span>${d}</span></div>`).join('');
}
function slotHTML(p, i, id, act){
  const j = M.joueurs[id];
  if (!j) return `<button class="slot vide" data-act="${act}" data-p="${p}" data-i="${i}">${posteB(p)}<div class="t"><b>Choisir</b></div></button>`;
  const n = QM.note(j, p);
  const b = `<button class="slot" data-act="${act}" data-p="${p}" data-i="${i}">${posteB(p)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.bless ? '<span class="badge bless">✚ blessé</span> ' : ''}Forme ${j.forme} · fatigue ${j.fat} %${j.poste !== p ? ' · ' + D.POSTES[j.poste].nom.toLowerCase() + ' de formation' : ''}</span></div><span class="note ${classeNote(n)}">${n}</span></button>`;
  if (act !== 'slot') return b;
  const k = club(M.manager.club).compo, r = (k.roles || {})[id], R = (D.ROLES[p] || []).find(x => x[0] === r);
  return `<div class="slotw">${b}<button class="rolechip" data-act="role" data-j="${id}" data-p="${p}">${R ? esc(R[1]) : 'Rôle'}${k.cap === id ? ' · <b>Capitaine</b>' : ''} ›</button></div>`;
}
function ficheRole(id, p){
  const k = club(M.manager.club).compo, j = M.joueurs[id], r = (k.roles || {})[id];
  feuille(`${teteF('Rôle de ' + esc(nomJ(j)), D.POSTES[p].nom)}
    <div class="liste">${D.ROLES[p].map(([v, n, d]) => `<button class="el" data-act="choisirRole" data-j="${id}" data-r="${v}"><span class="poste ${p}" aria-hidden="true">${v === r ? '✓' : ''}</span><div class="t"><b>${n}</b><span style="white-space:normal">${esc(d)}</span></div></button>`).join('')}</div>
    <div class="sep"></div>
    <button class="btn ${k.cap === id ? 'sec' : ''} plein" data-act="capitaine" data-j="${id}">${k.cap === id ? 'Déjà capitaine' : 'Nommer capitaine'}</button>
    <p class="petit mut" style="margin:8px 0 0">Le capitaine donne un peu de moral au départ et limite la baisse quand l'équipe encaisse.</p>`);
}
function vueTactique(){
  const c = club(M.manager.club), CK = c.compo, T = c.tactique;
  const moy = Math.round(['P', 'B', 'A', 'G'].reduce((s, p) => s + CK[p].reduce((t, id) => t + QM.note(M.joueurs[id], p), 0), 0) / 7);
  VUE.innerHTML = `<div><h1 class="grand">Tactique</h1><p class="sous">Note moyenne des titulaires : <b>${moy}</b></p></div>
  <div class="cols"><div>
  <div class="carte"><h2>Composition <button data-act="compoAuto">Composition auto</button></h2><div class="terrain">
    <div class="grp">Poursuiveurs</div>${CK.P.map((id, i) => slotHTML('P', i, id, 'slot')).join('')}
    <div class="grp">Batteurs</div>${CK.B.map((id, i) => slotHTML('B', i, id, 'slot')).join('')}
    <div class="grp">Attrapeur</div>${slotHTML('A', 0, CK.A[0], 'slot')}
    <div class="grp">Gardien</div>${slotHTML('G', 0, CK.G[0], 'slot')}
    <div class="grp">Remplaçants (7)</div>${CK.banc.map((id, i) => slotHTML(M.joueurs[id] ? M.joueurs[id].poste : 'P', i, id, 'slotBanc')).join('')}
  </div></div></div><div>
  <div class="carte"><h2>Consignes</h2>${consignesHTML(T, 'consigne')}</div></div></div>`;
}
function choisirPour(p, i, banc){
  const c = club(M.manager.club), CK = c.compo, actuel = banc ? CK.banc[i] : CK[p][i];
  const L = c.effectif.map(id => M.joueurs[id]).filter(j => j.id !== actuel).sort((a, b) => QM.note(b, banc ? b.poste : p) - QM.note(a, banc ? a.poste : p));
  feuille(`${teteF(banc ? 'Remplaçant' : D.POSTES[p].nom, banc ? 'Choisis le joueur à mettre sur le banc' : 'Note au poste · le joueur choisi échange sa place')}
  <div class="liste">${L.map(j => { const r = roleDe(j.id), n = QM.note(j, banc ? j.poste : p);
    return `<button class="el" data-act="mettre" data-j="${j.id}" data-p="${p}" data-i="${i}" data-b="${banc ? 1 : 0}">${posteB(j.poste)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${r.tit ? 'Titulaire (' + D.POSTES[r.p].nom.toLowerCase() + ')' : r.banc ? 'Remplaçant' : 'Réserve'} · forme ${j.forme} · fatigue ${j.fat} %${j.bless ? ' · ✚ blessé' : ''}</span></div><span class="note ${classeNote(n)}">${n}</span></button>`; }).join('')}</div>`);
}
function mettre(jid, p, i, banc){
  const CK = club(M.manager.club).compo;
  const ou = id => { for (const q of ['P', 'B', 'A', 'G']){ const k = CK[q].indexOf(id); if (k >= 0) return [q, k]; } const k = CK.banc.indexOf(id); return k >= 0 ? ['banc', k] : null; };
  const actuel = banc ? CK.banc[i] : CK[p][i], from = ou(jid);
  if (banc) CK.banc[i] = jid; else CK[p][i] = jid;
  if (from){ const [q, k] = from; if (q === 'banc') CK.banc[k] = actuel; else CK[q][k] = actuel; CK.banc = CK.banc.filter(Boolean); }
  QM.rolesAuto(M, CK, true);
  fermerFeuille(); sauver(); rendre();
}

/* ---------- Calendrier ---------- */
function vueCalendrier(){
  const mg = M.manager, l = club(mg.club).ligue;
  const S = M.calendrier.filter(s => s.type !== 'bilan');
  VUE.innerHTML = `<div><h1 class="grand">Calendrier</h1><p class="sous">Saison ${lab(M.saison)} · ${esc(M.ligues[l].nom)}</p></div>
  <div class="seg"><button data-act="cal" data-c="moi" class="${U.cal === 'moi' ? 'on' : ''}">Mes matchs</button><button data-act="cal" data-c="tout" class="${U.cal === 'tout' ? 'on' : ''}">Toutes les semaines</button></div>
  <div class="carte"><div class="liste">${S.map((s, k) => {
    const cour = k === M.semaine;
    if (s.type === 'prepa'){
      if (U.cal === 'moi') return '';
      return `<div class="el" style="${cour ? 'background:var(--or-doux);border-radius:12px;padding-inline:8px' : ''}"><span class="blason nat p" aria-hidden="true">🏋️</span><div class="t"><b>Préparation · semaine ${s.semaine}</b><span>${fmtDate(s.date)} · mercato ouvert${cour ? ' · cette semaine' : ''}</span></div></div>`;
    }
    if (s.type === 'sixn'){
      if (U.cal === 'moi') return '';
      return `<button class="el" data-act="semaine" data-s="${k}"><span class="blason nat p" aria-hidden="true">🏆</span><div class="t"><b>Six Nations · tour ${s.tour}</b><span>${fmtDate(s.date)}${cour ? ' · cette semaine' : ''}</span></div><span class="d mut">${s.matchs[0].res ? 'joué' : ''}</span></button>`;
    }
    const m = s.matchs.find(x => x.dom === mg.club || x.ext === mg.club);
    const dom = m.dom === mg.club, adv = dom ? m.ext : m.dom;
    let res = '<span class="mut">à venir</span>';
    if (m.res){ const a = m.res.score[dom ? 0 : 1], b = m.res.score[dom ? 1 : 0], v = a > b ? 'V' : a < b ? 'D' : 'N'; res = `<b>${a}–${b}</b> <span class="vnd ${v}">${v}</span>`; }
    return `<button class="el" data-act="semaine" data-s="${k}" style="${cour ? 'background:var(--or-doux);border-radius:12px;padding-inline:8px' : ''}">${blason(adv, 'p')}<div class="t"><b>J${s.journee} · ${dom ? '' : '@ '}${esc(club(adv).nom)}</b><span>${fmtDate(s.date)} · ${dom ? 'domicile' : 'extérieur'}${cour ? ' · cette semaine' : ''}</span></div><span class="d">${res}</span></button>`;
  }).join('')}</div></div>`;
}
function ficheSemaine(k){
  const s = M.calendrier[k], mg = M.manager, sixn = s.type === 'sixn';
  const L = sixn ? s.matchs : s.matchs.filter(m => m.ligue === club(mg.club).ligue);
  feuille(`${teteF(sixn ? `Six Nations · tour ${s.tour}` : `Journée ${s.journee}`, fmtDate(s.date, true))}
  <div class="liste">${L.map(m => `<div class="el">${blason(m.dom, 'p', sixn)}<div class="t"><b>${esc(nomEq(m.dom, sixn))} – ${esc(nomEq(m.ext, sixn))}</b><span>${m.res ? `${m.res.duree} min${m.res.vif >= 0 ? ' · vif d\'or : ' + esc(nomEq(m.res.vif ? m.ext : m.dom, sixn)) : ''}` : 'à venir'}</span></div><b>${m.res ? m.res.score.join('–') : ''}</b>${blason(m.ext, 'p', sixn)}</div>`).join('')}</div>`);
}

/* ---------- Plus ---------- */
function vuePlus(){
  VUE.innerHTML = `<div><h1 class="grand">Plus</h1></div>
  <div class="carte"><div class="liste">
    <button class="el" data-act="vue" data-v="calendrier"><span class="blason nat p">📅</span><div class="t"><b>Calendrier</b><span>Matchs de la saison, semaines de préparation</span></div></button>
    <button class="el" data-act="vue" data-v="classements"><span class="blason nat p">🏆</span><div class="t"><b>Classements</b><span>Les 3 ligues et le Six Nations</span></div></button>
    <button class="el" data-act="boite"><span class="blason nat p">✉️</span><div class="t"><b>Boîte de réception</b><span>${M.boite.length} messages</span></div></button>
    <button class="el" data-act="vue" data-v="sauvegardes"><span class="blason nat p">💾</span><div class="t"><b>Sauvegardes</b><span>Emplacement ${EMP} · exporter, importer</span></div></button>
    <button class="el" data-act="vue" data-v="aide"><span class="blason nat p">❔</span><div class="t"><b>Règles et réglages</b><span>Points, vif d'or, pauses automatiques</span></div></button>
    <button class="el" data-act="palmares"><span class="blason nat p">📜</span><div class="t"><b>Palmarès</b><span>${M.histo.length} saison${M.histo.length > 1 ? 's' : ''} terminée${M.histo.length > 1 ? 's' : ''}</span></div></button>
  </div></div>`;
}
function vueSauvegardes(){
  const e = emplacements()[EMP] || {};
  VUE.innerHTML = `<div><h1 class="grand">Sauvegardes</h1><p class="sous">La partie s'enregistre toute seule après chaque semaine.</p></div>
  <div class="carte"><h2>Partie en cours</h2><p style="margin:0">Emplacement ${EMP} · ${esc(e.nomClub || '')} · ${esc(e.saison || '')}</p><p class="petit mut" style="margin:4px 0 12px">Dernier enregistrement : ${e.maj ? new Date(e.maj).toLocaleString('fr-FR') : '—'}</p>
    <div class="btns"><button class="btn" data-act="sauverMain">Enregistrer</button><button class="btn sec" data-act="exporter" data-n="${EMP}">Exporter</button></div></div>
  <div class="carte"><h2>Autres parties</h2><button class="btn sec plein" data-act="quitter">Changer de partie</button><div style="height:8px"></div><button class="btn sec plein" data-act="importer">Importer un fichier</button></div>`;
}
function vueAide(){
  const P = REG.pauses;
  VUE.innerHTML = `<div><h1 class="grand">Règles et réglages</h1></div>
  <div class="carte"><h2>Pauses automatiques pendant le direct</h2><div class="liste">
    ${[['blessure', 'Blessure'], ['faute_grave', 'Faute grave'], ['vif_apercu', 'Vif d\'or aperçu']].map(([k, n]) => `<label class="el"><div class="t"><b>${n}</b></div><input type="checkbox" data-chg="pause" data-k="${k}" ${P[k] ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}
  </div></div>
  <div class="carte aide"><h2>Comment ça marche</h2>
    <p><b>Points.</b> Un but de poursuiveur vaut ${E.points.but} points, le vif d'or ${E.points.vif} et termine le match. Victoire ${E.points.victoire} points au classement, nul ${E.points.nul}.</p>
    <p><b>Le vif d'or.</b> Il apparaît entre la ${E.vifApparitionMin}e et la ${E.vifApparitionMax}e minute, peut se cacher puis revenir. Plus le temps passe, plus il est facile à attraper. Attention : le prendre quand on est mené de plus de 150 points fait perdre le match. La consigne « Si ça fait gagner » demande à l'attrapeur de le laisser filer dans ce cas.</p>
    <p><b>Le match.</b> Une minute de jeu défile en une seconde à vitesse ×1. Deux temps morts par équipe pour changer les consignes et faire entrer des remplaçants : 3 changements libres, plus ceux qui suivent une blessure.</p>
    <p><b>Les joueurs.</b> 31 attributs de 1 à 20, plus 5 pour les gardiens. La note sur 100 dépend du poste : les attributs cibles (●) comptent triple. La forme, la fatigue et le moral changent chaque semaine.</p>
    <p><b>Le président.</b> Il fixe un objectif de classement, juge chaque résultat selon la force de l'adversaire et fixe la limite de la masse salariale.</p>
    <p><b>Entraînement.</b> Chaque semaine, les joueurs progressent vers un potentiel caché : focus (technique, physique, tactique, repos) et intensité par poste, qualité des entraîneurs, temps de jeu. Après le pic d'âge, le physique décline.</p>
    <p><b>Mercato.</b> Ouvert pendant la préparation d'août et en janvier. Les agents libres signent à tout moment. Un club demande au moins la valeur du joueur (plus s'il est titulaire), le joueur un salaire selon son niveau, son ambition et la réputation de ton club. Mets des joueurs en vente pour recevoir des offres.</p>
    <p><b>Finances.</b> Billetterie et restauration à domicile, droits TV, sponsors et boutique chaque semaine ; salaires, entretien du stade et déplacements en face ; primes de classement en fin de saison. Les contrats qui arrivent à terme partent libres si tu ne les prolonges pas.</p>
    <p class="petit mut">Clubs, joueurs, balais et euros sont inventés. Prochains lots : stade, boutique, centre de formation, offres d'autres clubs, sélectionneur, ligue entre amis.</p>
  </div>`;
}
function ficheBoite(){ feuille(`${teteF('Boîte de réception', `${M.boite.length} messages`)}${M.boite.map(msgHTML).join('')}`); }
function fichePalmares(){
  const H = M.histo.slice().reverse();
  feuille(`${teteF('Palmarès', 'Champions et Six Nations')}${H.length ? `<div class="liste">${H.map(h => `<div class="el"><div class="t"><b>${esc(h.saison)}</b><span>${Object.values(M.ligues).map(L => esc(club(h.champions[L.id]).nom)).join(' · ')} · Six Nations : ${esc(nat(h.sixn).nom)}${h.manager ? ` · vous : ${h.manager.pos}e avec ${esc(club(h.manager.club).nom)}` : ''}</span></div></div>`).join('')}</div>` : '<p class="mut">Aucune saison terminée pour l\'instant.</p>'}`);
}

/* ---------- v84 : contrat, valeur et actions dans la fiche joueur ---------- */
function blocContrat(j, mon){
  const mg = M.manager, U = club(mg.club), v = C.valeur(M, j);
  if (mon){
    const vente = U.aVendre.includes(j.id);
    return `<div class="carte" style="margin-top:10px"><h2>Contrat</h2>
      <div class="stat" style="grid-template-columns:1fr auto">
        <span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(j.contrat.fin)}</b>
        <span style="text-align:left;font-weight:400">Salaire</span><b>${eur(j.contrat.sal)} / semaine</b>
        <span style="text-align:left;font-weight:400">Valeur estimée</span><b>${eur(v)}</b>
      </div>
      <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="prolonger" data-j="${j.id}">Prolonger</button><button class="btn sec" data-act="vendre" data-j="${j.id}">${vente ? 'Retirer de la vente' : 'Mettre en vente'}</button></div>
      <button class="btn sec plein" style="margin-top:8px;color:var(--mauvais)" data-act="liberer" data-j="${j.id}">Résilier le contrat (${eur(C.coutLiberation(M, j))})</button></div>`;
  }
  const suivi = U.suivi.includes(j.id), libre = !j.club;
  return `<div class="carte" style="margin-top:10px"><h2>${libre ? 'Agent libre' : 'Contrat'}</h2>
    <div class="stat" style="grid-template-columns:1fr auto">
      ${libre ? '' : `<span style="text-align:left;font-weight:400">Club</span><b>${esc(club(j.club).nom)}</b><span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(j.contrat.fin)}</b>
      <span style="text-align:left;font-weight:400">Salaire actuel</span><b>${eur(j.contrat.sal)} / semaine</b><span style="text-align:left;font-weight:400">Valeur estimée</span><b>${eur(v)}</b>`}
      <span style="text-align:left;font-weight:400">Salaire demandé chez toi (environ)</span><b>${eur(C.salaireDemande(j, U))} / semaine</b>
    </div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="suivre" data-j="${j.id}">${suivi ? 'Ne plus suivre' : 'Suivre'}</button><button class="btn" data-act="offre" data-j="${j.id}">${libre ? 'Proposer un contrat' : 'Faire une offre'}</button></div>
    ${!libre && !C.mercatoOuvert(QM.semaine(M)) ? '<p class="petit mut" style="margin:8px 0 0">Mercato fermé : les transferts reprennent en août et en janvier.</p>' : ''}</div>`;
}

/* ---------- v84 : onglet Club ---------- */
function vueClub(){
  const c = club(M.manager.club), S = QM.semaine(M), ouvert = C.mercatoOuvert(S), fen = C.prochaineFenetre(M);
  const st = Object.values(c.staff), moyStaff = Math.round(st.reduce((t, x) => t + x.note, 0) / st.length * 10) / 10;
  const foc = p => (D.FOCUS.find(f => f[0] === c.entrainement[p].f) || [])[1];
  VUE.innerHTML = `<div><h1 class="grand">Club</h1><p class="sous">${esc(c.nom)} · ${flag(c.nat)} ${esc(c.ville)} · stade de ${c.stade.toLocaleString('fr-FR')} places</p></div>
  <div class="grille">
    <button class="carte tuile" data-act="vue" data-v="entrainement"><h2>Entraînement</h2><b class="petit" style="font-size:.86rem">${['P', 'B', 'A', 'G'].map(p => `${p} ${foc(p).toLowerCase()}`).join(' · ')}</b><span>Cohésion ${Math.round(c.cohesion)} %</span></button>
    <button class="carte tuile" data-act="vue" data-v="mercato"><h2>Mercato</h2><b>${ouvert ? 'Ouvert' : 'Fermé'}</b><span>${M.offres.length ? M.offres.length + ' offre' + (M.offres.length > 1 ? 's' : '') + ' reçue' + (M.offres.length > 1 ? 's' : '') : ouvert ? 'Transferts et agents libres' : fen ? 'Réouverture le ' + fmtDate(fen.date) : 'Agents libres disponibles'}</span></button>
    <button class="carte tuile" data-act="vue" data-v="finances"><h2>Finances</h2><b style="color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</b><span>Masse ${eur(C.masse(M, c))} / ${eur(c.masseMax)} par sem.</span></button>
    <button class="carte tuile" data-act="vue" data-v="staff"><h2>Staff</h2><b>${moyStaff} / 20</b><span>${st.length} membres</span></button>
  </div>`;
}
function vueEntrainement(){
  const c = club(M.manager.club), E = c.entrainement;
  VUE.innerHTML = `<div><h1 class="grand">Entraînement</h1><p class="sous">Chaque semaine, les joueurs progressent vers leur potentiel : plus vite s'ils sont jeunes, professionnels, bien entraînés et s'ils jouent.</p></div>
  <div class="carte"><h2>Cohésion de l'équipe</h2><div class="jauge" role="meter" aria-valuenow="${Math.round(c.cohesion)}" aria-valuemin="0" aria-valuemax="100" aria-label="Cohésion"><i style="width:${c.cohesion}%"></i></div>
    <p class="petit mut" style="margin:8px 0 0">${Math.round(c.cohesion)} % · monte chaque semaine (plus vite avec le focus Tactique), baisse à chaque recrue. Elle joue un peu sur l'attaque et la défense.</p></div>
  <div class="cols"><div>${['P', 'B'].map(grpEnt).join('')}</div><div>${['A', 'G'].map(grpEnt).join('')}</div></div>
  <div class="carte aide"><h2>Repères</h2>
    <p><b>Technique</b> : vol et balle (et le bloc des gardiens). <b>Physique</b> : vitesse, endurance, force… avec le préparateur physique. <b>Tactique</b> : attributs mentaux et cohésion. <b>Repos</b> : pas de progrès, mais la fatigue baisse.</p>
    <p><b>Intensité</b> : plus elle est haute, plus on progresse, mais la fatigue et le risque de blessure montent. Après le pic d'âge, le physique décline : un bon préparateur ralentit la baisse.</p></div>`;
  function grpEnt(p){
    const g = E[p], coach = c.staff['ent' + p], n = c.effectif.filter(id => M.joueurs[id] && M.joueurs[id].poste === p).length;
    return `<div class="carte"><h2>${D.POSTES[p].pl} <span class="mut">${n} joueurs</span></h2>
      <p class="petit mut" style="margin:0 0 8px">Entraîneur : ${esc(coach.p + ' ' + coach.n)} · <b style="color:var(--ink)">${coach.note}/20</b></p>
      <div class="seg" style="margin-bottom:6px">${D.FOCUS.map(([k, nom]) => `<button data-act="ent" data-g="${p}" data-k="f" data-v="${k}" class="${g.f === k ? 'on' : ''}">${nom}</button>`).join('')}</div>
      <div class="seg">${D.INTENSITES.map(([k, nom]) => `<button data-act="ent" data-g="${p}" data-k="i" data-v="${k}" class="${g.i === k ? 'on' : ''}">${nom}</button>`).join('')}</div></div>`;
  }
}
const MERC = {onglet:'recherche', poste:'tous', age:99, moyens:false};
function ligneMercato(j, d){
  const p = MERC.poste !== 'tous' && MERC.poste !== 'bless' ? MERC.poste : j.poste, n = QM.note(j, p);
  return `<button class="el" data-act="joueur" data-j="${j.id}">${j.club ? blason(j.club, 'p') : '<span class="blason nat p" aria-hidden="true" style="font-size:.5rem;font-weight:800;color:var(--ink-soft)">LIBRE</span>'}${posteB(j.poste)}
    <div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>${j.age} ans · ${d || (j.club ? esc(club(j.club).sigle) + ' · ' + eur(C.valeur(M, j)) : 'libre · demande ' + eur(C.salaireDemande(j, club(M.manager.club))) + '/sem.')}</span></div>
    <span class="etoiles petit" aria-label="potentiel">${'★'.repeat(C.potentielEstime(M, j))}</span><span class="note ${classeNote(n)}">${n}</span></button>`;
}
function vueMercato(){
  const U = club(M.manager.club), S = QM.semaine(M), ouvert = C.mercatoOuvert(S), fen = C.prochaineFenetre(M);
  if (M.offres.length && MERC.onglet === 'recherche' && !MERC.vu){ MERC.onglet = 'offres'; MERC.vu = 1; }
  const O = [['offres', `Offres${M.offres.length ? ' (' + M.offres.length + ')' : ''}`], ['recherche', 'Recherche'], ['libres', 'Agents libres'], ['suivis', 'Suivis'], ['ventes', 'Mes ventes'], ['actus', 'Transferts']];
  let corps = '';
  const filtres = () => `<div class="chips">${[['tous', 'Tous'], ['P', 'Poursuiveurs'], ['B', 'Batteurs'], ['A', 'Attrapeurs'], ['G', 'Gardiens']].map(([k, n]) => `<button class="chip ${MERC.poste === k ? 'on' : ''}" data-act="mercPoste" data-p="${k}">${n}</button>`).join('')}</div>
    <div class="chips">${[[99, 'Tous âges'], [21, '≤ 21 ans'], [25, '≤ 25 ans'], [29, '≤ 29 ans']].map(([k, n]) => `<button class="chip ${MERC.age === k ? 'on' : ''}" data-act="mercAge" data-a="${k}">${n}</button>`).join('')}<button class="chip ${MERC.moyens ? 'on' : ''}" data-act="mercMoyens">Dans mes moyens</button></div>`;
  const filtrer = L => {
    const place = U.masseMax - C.masse(M, U);
    return L.filter(j => j && (MERC.poste === 'tous' || j.poste === MERC.poste) && j.age <= MERC.age && (!MERC.moyens || ((j.club ? C.prixClub(M, j) : 0) <= U.budget && C.salaireDemande(j, U) <= place)))
      .sort((a, b) => QM.note(b, MERC.poste === 'tous' ? b.poste : MERC.poste) - QM.note(a, MERC.poste === 'tous' ? a.poste : MERC.poste));
  };
  if (MERC.onglet === 'offres'){
    corps = M.offres.length ? M.offres.map(o => { const j = M.joueurs[o.j], c = club(o.club);
      return `<div class="carte"><div class="ligne">${blason(c.id)}<div style="flex:1;min-width:0"><b>${esc(c.nom)}</b><div class="petit mut">veut ${esc(nomJ(j))} (${QM.note(j)}) · valeur ${eur(C.valeur(M, j))}</div></div><b>${eur(o.montant)}</b></div>
        <p class="petit mut" style="margin:6px 0 10px">Offre valable jusqu'au ${fmtDate((M.calendrier[o.expire] || QM.semaine(M)).date)}.</p>
        <div class="btns"><button class="btn sec" data-act="refuserOffre" data-o="${o.id}">Refuser</button><button class="btn" data-act="accepterOffre" data-o="${o.id}">Accepter</button></div></div>`; }).join('')
      : '<div class="carte"><p class="mut" style="margin:0">Aucune offre pour l\'instant. Mets des joueurs en vente (fiche du joueur) pour attirer les acheteurs pendant le mercato.</p></div>';
  } else if (MERC.onglet === 'recherche'){
    const L = filtrer(Object.values(M.joueurs).filter(j => j.club && j.club !== U.id)).slice(0, 40);
    corps = `${filtres()}<div class="carte"><div class="liste">${L.map(j => ligneMercato(j)).join('') || '<p class="mut">Personne avec ces critères.</p>'}</div></div><p class="petit mut">Les 40 meilleurs selon la note au poste. ★ : potentiel estimé par ton recruteur.</p>`;
  } else if (MERC.onglet === 'libres'){
    const L = filtrer(M.libres.map(id => M.joueurs[id]));
    corps = `${filtres()}<div class="carte"><div class="liste">${L.map(j => ligneMercato(j)).join('') || '<p class="mut">Personne avec ces critères.</p>'}</div></div><p class="petit mut">Les agents libres signent à tout moment, sans indemnité de transfert.</p>`;
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
  <div class="chips" role="tablist">${O.map(([k, n]) => `<button role="tab" class="chip ${MERC.onglet === k ? 'on' : ''}" data-act="merc" data-o="${k}">${n}</button>`).join('')}</div>
  ${corps}`;
}
/* offre de transfert, contrat d'agent libre, prolongation */
let OFFRE = null;
function ficheOffre(jid, mode){
  const j = M.joueurs[jid], U = club(M.manager.club);
  if (!OFFRE || OFFRE.j !== jid || OFFRE.mode !== mode){
    const libre = !j.club;
    OFFRE = {j:jid, mode, montant:mode === 'transfert' && !libre ? C.valeur(M, j) : 0, sal:mode === 'prolonger' ? j.contrat.sal : C.salaireDemande(j, U), ans:j.age >= 32 ? 1 : 3, msg:''};
  }
  const o = OFFRE, libre = !j.club, place = U.masseMax - C.masse(M, U) + (mode === 'prolonger' ? j.contrat.sal : 0);
  const pas = (k, lib) => `<div class="cons"><b>${lib}</b><div class="ligne"><button class="btn sec" data-act="pasOffre" data-k="${k}" data-d="-1" aria-label="Moins">−</button><b style="flex:1;text-align:center;font-size:1.1rem">${eur(o[k])}${k === 'sal' ? ' / sem.' : ''}</b><button class="btn sec" data-act="pasOffre" data-k="${k}" data-d="1" aria-label="Plus">+</button></div></div>`;
  feuille(`${teteF(mode === 'prolonger' ? 'Prolonger ' + esc(nomJ(j)) : libre ? 'Contrat pour ' + esc(nomJ(j)) : 'Offre pour ' + esc(nomJ(j)), libre ? 'Agent libre' : mode === 'prolonger' ? `Contrat actuel : fin ${lab(j.contrat.fin)}, ${eur(j.contrat.sal)} / sem.` : `${esc(club(j.club).nom)} · valeur estimée ${eur(C.valeur(M, j))}`)}
    ${mode === 'transfert' && !libre ? pas('montant', 'Indemnité de transfert') : ''}
    ${pas('sal', 'Salaire proposé')}
    <div class="cons"><b>Durée</b><div class="seg">${[1, 2, 3, 4].map(n => `<button data-act="ansOffre" data-v="${n}" class="${o.ans === n ? 'on' : ''}">${n} saison${n > 1 ? 's' : ''}</button>`).join('')}</div></div>
    <p class="petit mut" style="margin:8px 0">Solde ${eur(U.budget)} · place dans la masse salariale : ${eur(place)} / sem.</p>
    ${o.msg ? `<p style="margin:0 0 10px;font-weight:600;color:var(--moyen)">${esc(o.msg)}</p>` : ''}
    <button class="btn plein" data-act="envoyerOffre">${mode === 'prolonger' ? 'Proposer la prolongation' : libre ? 'Proposer le contrat' : 'Envoyer l\'offre'}</button>`);
}
function vueFinances(){
  const c = club(M.manager.club), F = c.fin.saison, P = c.fin.derniere, ms = C.masse(M, c);
  const tot = o => Object.values(o).reduce((t, x) => t + x, 0);
  const aff = Math.round(c.stade * C.remplissage(M, c, {rep:60}));
  const h = c.fin.hist, max = Math.max(1, ...h.map(x => Math.abs(x.net)));
  const balai = D.BALAIS.find(b => b.id === c.balai) || D.BALAIS[0];
  const ligne = (n, a, b) => `<tr><td style="text-align:left">${n}</td><td>${eur(a)}</td>${P ? `<td class="tab-cache mut">${eur(b || 0)}</td>` : ''}</tr>`;
  VUE.innerHTML = `<div><h1 class="grand">Finances</h1><p class="sous">Saison ${lab(M.saison)} · euros fictifs</p></div>
  <div class="cols"><div>
  <div class="carte"><h2>Solde</h2><div style="font-size:1.9rem;font-weight:800;letter-spacing:-.03em;color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</div>
    <div style="margin:12px 0 4px" class="ligne"><span style="flex:1">Masse salariale (joueurs et staff)</span><b>${eur(ms)} / ${eur(c.masseMax)}</b></div>
    <div class="jauge" role="meter" aria-valuenow="${Math.round(ms / c.masseMax * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Masse salariale"><i style="width:${Math.min(100, ms / c.masseMax * 100)}%;background:${ms > c.masseMax ? 'var(--mauvais)' : 'var(--accent)'}"></i></div>
    <p class="petit mut" style="margin:8px 0 0">Limite fixée par le président : au-delà, il refuse les nouveaux contrats.</p></div>
  <div class="carte"><h2>16 dernières semaines</h2><div class="histo">${h.map(x => `<div title="${fmtDate(x.d)} : ${eur(x.net)}"><i style="height:${Math.max(3, Math.abs(x.net) / max * 100)}%;background:${x.net < 0 ? 'var(--mauvais)' : 'var(--bon)'}"></i></div>`).join('') || '<p class="mut">Pas encore de semaine jouée.</p>'}</div></div>
  <div class="carte"><h2>Billetterie</h2><div class="ligne"><button class="btn sec" data-act="prix" data-d="-1" aria-label="Baisser le prix">−</button><b style="flex:1;text-align:center;font-size:1.15rem">${c.prix} € la place</b><button class="btn sec" data-act="prix" data-d="1" aria-label="Monter le prix">+</button></div>
    <p class="petit mut" style="margin:8px 0 0">Environ ${aff.toLocaleString('fr-FR')} spectateurs (${Math.round(aff / c.stade * 100)} %) contre un adversaire moyen, soit ${eur(aff * c.prix)} par match à domicile. Prix conseillé : ${C.prixRef(c)} €. Plus cher : moins de monde ; les résultats remplissent le stade.</p></div>
  </div><div>
  <div class="carte"><h2>Recettes ${P ? '<span class="mut petit">saison · précédente</span>' : ''}</h2><table class="cl"><tbody>${Object.keys(C.NOMS_REC).map(k => ligne(C.NOMS_REC[k], F.rec[k], P && P.rec[k])).join('')}<tr><td style="text-align:left"><b>Total</b></td><td><b>${eur(tot(F.rec))}</b></td>${P ? `<td class="tab-cache mut">${eur(tot(P.rec))}</td>` : ''}</tr></tbody></table></div>
  <div class="carte"><h2>Dépenses</h2><table class="cl"><tbody>${Object.keys(C.NOMS_DEP).map(k => ligne(C.NOMS_DEP[k], F.dep[k], P && P.dep[k])).join('')}<tr><td style="text-align:left"><b>Total</b></td><td><b>${eur(tot(F.dep))}</b></td>${P ? `<td class="tab-cache mut">${eur(tot(P.dep))}</td>` : ''}</tr></tbody></table></div>
  <div class="carte"><h2>Balais <span class="mut petit">${esc(balai.nom)}</span></h2>
    <div class="ligne" style="margin-bottom:4px"><span style="flex:1">Usure</span><b>${Math.round(c.usure)} %</b></div><div class="jauge"><i style="width:${c.usure}%"></i></div>
    <p class="petit mut" style="margin:8px 0">Des balais usés font perdre un peu de vitesse et de maniabilité. Un jeu complet pour l'effectif :</p>
    <div class="liste">${D.BALAIS.map(b => `<div class="el"><div class="t"><b>${esc(b.nom)}${b.id === c.balai ? ' <span class="badge tit">actuels</span>' : ''}</b><span>vitesse ${b.vit} · maniabilité ${b.man} · stabilité ${b.sta}</span></div><button class="btn sec" data-act="balais" data-b="${b.id}">${eur(b.prix * 1000)}</button></div>`).join('')}</div></div>
  </div></div>`;
}
function vueStaff(){
  const c = club(M.manager.club);
  VUE.innerHTML = `<div><h1 class="grand">Staff</h1><p class="sous">Toucher un poste pour voir les candidats libres. Remplacer coûte 8 semaines de salaire de l'ancien.</p></div>
  <div class="carte"><div class="liste">${D.STAFF.map(([k, nom]) => { const x = c.staff[k];
    return `<button class="el" data-act="ficheStaff" data-r="${k}"><span class="note ${x.note >= 15 ? 'n4' : x.note >= 10 ? 'n3' : x.note >= 6 ? 'n2' : 'n1'}">${x.note}</span><div class="t"><b>${esc(nom)}</b><span>${flag(x.nat)} ${esc(x.p + ' ' + x.n)} · ${eur(x.sal)}/sem. · ${esc(D.EFFETS_STAFF[k])}</span></div><span class="mut">›</span></button>`; }).join('')}</div></div>`;
}
function ficheStaff(role){
  const c = club(M.manager.club), x = c.staff[role], L = M.staffLibres.filter(s => s.role === role).sort((a, b) => b.note - a.note);
  feuille(`${teteF(esc((D.STAFF.find(s => s[0] === role) || [])[1]), esc(D.EFFETS_STAFF[role]))}
    <div class="carte"><div class="el"><span class="note n3">${x.note}</span><div class="t"><b>${esc(x.p + ' ' + x.n)} (en poste)</b><span>${eur(x.sal)} / semaine · indemnité de départ ${eur(x.sal * 8)}</span></div></div></div>
    <div class="carte" style="margin-top:10px"><h2>Candidats libres</h2><div class="liste">${L.map(s => `<div class="el"><span class="note ${s.note >= 15 ? 'n4' : s.note >= 10 ? 'n3' : 'n2'}">${s.note}</span><div class="t"><b>${flag(s.nat)} ${esc(s.p + ' ' + s.n)}</b><span>${eur(s.sal)} / semaine</span></div><button class="btn sec" data-act="embaucher" data-s="${s.id}">Embaucher</button></div>`).join('') || '<p class="mut">Personne de libre pour ce poste.</p>'}</div></div>`);
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
  VUE.innerHTML = `
  <div class="tableau" id="tableau">
    <div class="score">
      <div class="eq">${blason(e0.id, '')}<b>${esc(e0.nom)}</b></div>
      <div class="pts"><strong id="sc">${X.score[0]} – ${X.score[1]}</strong><span id="mm">${avant ? fmtDate(QM.semaine(M).date) : fini ? 'Terminé · ' + Math.round(X.t / 60) + ' min' : mm}</span></div>
      <div class="eq dr">${blason(e1.id, '')}<b>${esc(e1.nom)}</b></div>
    </div>
    <div class="mini"><span class="vifb ${vifEtat}" id="vifb"><i></i>${vifTxt}</span><span>${D.METEOS[X.meteo].ico} ${D.METEOS[X.meteo].nom}</span></div>
    ${!avant && !fini ? `<div class="ctrl">
      <button data-act="lecture" aria-label="${L.pause ? 'Reprendre' : 'Pause'}">${L.pause ? '▶︎' : '❚❚'}</button>
      ${[1, 2, 4].map(v => `<button data-act="vitesse" data-v="${v}" class="${REG.vitesse === v ? 'on' : ''}">×${v}</button>`).join('')}
      <button data-act="tempsMort" aria-label="Temps mort, ${X.tm[moi]} restant${X.tm[moi] > 1 ? 's' : ''}" ${X.tm[moi] <= 0 ? 'disabled style="opacity:.4"' : ''}>TM ${X.tm[moi]}</button>
      <button data-act="direct" aria-label="Aller à la fin du match">Fin ⏭</button>
    </div>` : ''}
  </div>
  ${avant ? avantMatchHTML() : ''}
  ${fini ? apresMatchHTML() : ''}
  ${!avant ? `<div class="carte"><h2>${fini ? 'Tout le match' : 'En direct'}</h2><div class="fil" id="fil">${X.ev.slice().reverse().map(evHTML).join('')}</div></div>` : ''}`;
}
function evHTML(ev){
  if (!ev.txt) return '';
  const coul = ev.e >= 0 ? X.e[ev.e].couleurs[0] : '';
  const cls = ['ev', ev.but ? 'but' : '', ev.cle ? 'cle' : '', /^vif|fin_perdu/.test(ev.k) ? 'vif' : ''].join(' ');
  return `<div class="${cls}" style="${coul ? '--ce:' + coul : ''}"><span class="m">${Math.floor(ev.t / 60)}'</span><span class="x">${esc(ev.txt)}</span></div>`;
}
function avantMatchHTML(){
  const moi = X.joueur, e = X.e[moi], T = e.tactique;
  const ch = (X.changements || []).map(([a, b]) => `${court(M.joueurs[a])} → ${court(M.joueurs[b])}`).join(', ');
  return `<div class="carte"><h2>Ta composition <button data-act="vue" data-v="tactique">Modifier</button></h2>
    ${ch ? `<p class="petit" style="margin:0 0 8px;color:var(--moyen)">Changé pour blessure : ${esc(ch)}</p>` : ''}
    <div class="liste">${['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => { const j = M.joueurs[id]; return `<div class="el">${posteB(p)}<div class="t"><b>${flag(j.nat)} ${esc(nomJ(j))}</b><span>Forme ${j.forme} · fatigue ${j.fat} %</span></div><span class="note ${classeNote(QM.note(j, p))}">${QM.note(j, p)}</span></div>`; })).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Attrapeur : ${esc((CONSIGNES[6][3].find(o => o[0] === T.attrapeur) || [])[1] || '')} · rythme ${esc((CONSIGNES[0][3].find(o => o[0] === T.rythme) || [])[1] || '')} · cognards sur ${esc((CONSIGNES[5][3].find(o => o[0] === T.cible) || [])[1] || '').toLowerCase()}</p></div>
  <div class="btns"><button class="btn or" data-act="lancer">Lancer le direct</button><button class="btn sec" data-act="direct">Résultat direct</button></div>
  <button class="btn sec plein" data-act="vue" data-v="accueil">Plus tard</button>`;
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
    <div class="stat">${[['buts', 'Buts'], ['tirs', 'Tirs'], ['arrets', 'Arrêts'], ['cog', 'Cognards réussis'], ['fautes', 'Fautes'], ['pen', 'Penalties obtenus']].map(([k, n]) => `<span>${S[0][k]}</span><span>${n}</span><span>${S[1][k]}</span>`).join('')}</div>
    <button class="btn plein" style="margin-top:14px" data-act="finMatch">Continuer</button></div>
  <div class="carte"><h2>Notes de ton équipe</h2><div class="liste">${notes.map(([id, n]) => { const j = M.joueurs[id], p = X.perf[id];
    return `<div class="el">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${[p.b ? p.b + ' but' + (p.b > 1 ? 's' : '') : '', p.arr ? p.arr + ' arrêt' + (p.arr > 1 ? 's' : '') : '', p.cog ? p.cog + ' cognard' + (p.cog > 1 ? 's' : '') : '', p.vif ? 'vif d\'or' : ''].filter(Boolean).join(' · ') || '—'}</span></div><span class="note ${n >= 7 ? 'n4' : n >= 6 ? 'n3' : n >= 5 ? 'n2' : 'n1'}">${n.toFixed(1)}</span></div>`; }).join('')}</div></div>`;
}
/* direct */
function demarrerDirect(){ U.live = {parti:true, pause:false, timer:null}; rendre(); boucle(); }
function boucle(){
  clearInterval(U.live && U.live.timer);
  if (!U.live || U.live.pause || X.fini) return;
  U.live.timer = setInterval(tic, 1000 / (4 * REG.vitesse));
}
function tic(){
  if (!X || X.fini){ clearInterval(U.live.timer); return; }
  const evs = QM.pas(X);
  const fil = $('#fil');
  if (fil) for (const ev of evs){ const h = evHTML(ev); if (h) fil.insertAdjacentHTML('afterbegin', h); }
  majTableau();
  if (X.fini){ clearInterval(U.live.timer); setTimeout(() => { rendre(); scrollTo({top:0, behavior:'smooth'}); }, 1100); return; }
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
    <div class="carte"><h2>Consignes</h2>${consignesHTML(e.tactique, 'consigneLive', ['rythme', 'risque', 'agressivite', 'cible', 'attrapeur'])}</div>
    <div class="carte" style="margin-top:10px"><h2>${sel ? 'Qui entre ?' : 'Remplacement : qui sort ?'}</h2><div class="liste">
    ${sel ? (e.banc || []).map(id => { const j = M.joueurs[id]; const p = ['P', 'B', 'A', 'G'].find(q => e[q].includes(sel)); return `<button class="el" data-act="entre" data-j="${id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>Note au poste ${QM.note(j, p)} · fatigue ${Math.round(X.fat[id] || 0)} %</span></div></button>`; }).join('') || '<p class="mut">Plus personne sur le banc.</p>'
      : tit.map(([p, id]) => { const j = M.joueurs[id]; return `<button class="el" data-act="sort" data-j="${id}" ${X.rempl[moi] <= 0 ? 'disabled style="opacity:.5"' : ''}>${posteB(p)}<div class="t"><b>${esc(nomJ(j))}</b><span>Fatigue ${Math.round(X.fat[id])} %</span></div></button>`; }).join('')}
    </div></div>
    <button class="btn plein" style="margin-top:12px" data-act="fermer">Reprendre le match</button>`);
}
function reprendreApresTM(){ U.live.tm = false; U.live.sortant = null; reprendre(); }
function finDuMatch(){
  const m = QM.matchDuJoueur(M);
  clearInterval(U.live && U.live.timer);
  QM.terminerSemaine(M, X);
  const moi = X.joueur, r = X.score[moi] - X.score[1 - moi];
  M.dernierMatch = {dom:m.dom, ext:m.ext, score:m.res.score, sixn:false, resume:`${r > 0 ? 'Victoire' : r < 0 ? 'Défaite' : 'Nul'} · ${m.res.duree} min · vif d'or ${esc(X.e[X.vif].sigle)}`, id:m.id};
  X = null; U.live = null; U.vue = 'accueil';
  sauver(); rendre(); scrollTo(0, 0);
  toast('Journée terminée · résultats dans le calendrier');
}

/* ---------- Actions ---------- */
const ACT = {
  fermer:fermerFeuille,
  vue:d => { retirerFeuille(); if (U.live && !U.live.parti){ U.live = null; X = null; } aller(d.v); },
  nouvelle:d => { U.etape = 'club'; U.empNeuf = +d.n; MONDE_NEUF = null; rendre(); scrollTo(0, 0); },
  annulerNeuf:() => { U.etape = null; MONDE_NEUF = null; rendre(); },
  ligueChoix:d => { U.ligueChoix = d.l; rendre(); },
  voirClub:d => ficheClubNeuf(d.c),
  prendreClub:d => { M = QM.choisirClub(MONDE_NEUF, d.c, (U.nom || '').trim() || 'Manager'); EMP = U.empNeuf; MONDE_NEUF = null; U.etape = null; U.vue = 'accueil'; fermerFeuille(); sauver(); rendre(); scrollTo(0, 0); },
  charger:async d => { try{ await chargerEmp(+d.n); rendre(); scrollTo(0, 0); }catch(e){ toast(e.message); } },
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
  filtre:d => { U.filtre = d.f; rendre(); },
  tri:d => { U.tri = d.t; rendre(); },
  joueur:d => ficheJoueur(d.j),
  ligue:d => { U.ligue = d.l; rendre(); },
  cal:d => { U.cal = d.c; rendre(); },
  semaine:d => ficheSemaine(+d.s),
  boite:ficheBoite,
  palmares:fichePalmares,
  slot:d => choisirPour(d.p, +d.i, false),
  slotBanc:d => choisirPour(d.p, +d.i, true),
  mettre:d => mettre(d.j, d.p, +d.i, d.b === '1'),
  compoAuto:() => { const c = club(M.manager.club); c.compo = QM.compoAuto(M, c.id); sauver(); rendre(); toast('Meilleure composition selon les notes'); },
  consigne:d => { const T = club(M.manager.club).tactique; T[d.k] = /^\d$/.test(d.v) ? +d.v : d.v; sauver(); rendre(); },
  consigneLive:d => { const T = X.e[X.joueur].tactique; T[d.k] = /^\d$/.test(d.v) ? +d.v : d.v; rendreTempsMort(); },
  sort:d => { U.live.sortant = d.j; rendreTempsMort(); },
  entre:d => { const ok = QM.remplacer(X, X.joueur, U.live.sortant, d.j, false); U.live.sortant = null;
    if (ok){ const fil = $('#fil'); if (fil) fil.insertAdjacentHTML('afterbegin', evHTML(X.ev[X.ev.length - 1])); } rendreTempsMort(); },
  preparer:() => { const m = QM.matchDuJoueur(M); if (!m) return rendre(); X = QM.preparerMatch(M, m); U.live = {parti:false}; aller('match'); },
  lancer:() => demarrerDirect(),
  lecture:() => { if (!U.live) return; if (U.live.pause) reprendre(); else { U.live.pause = true; clearInterval(U.live.timer); rendreCtrl(); } },
  reprendre,
  vitesse:d => { REG.vitesse = +d.v; regler(); document.querySelectorAll('.ctrl [data-act="vitesse"]').forEach(b => b.classList.toggle('on', +b.dataset.v === REG.vitesse)); boucle(); },
  tempsMort:ouvrirTempsMort,
  direct:() => { if (U.live) clearInterval(U.live.timer); const p = document.querySelector('.pause'); if (p) p.remove(); U.live = Object.assign(U.live || {}, {parti:true, pause:true}); QM.jusquAuBout(X); rendre(); scrollTo(0, 0); },
  finMatch:finDuMatch,
  voirDernier:() => { const d = M.dernierMatch; if (!d) return; const s = M.calendrier.findIndex(x => x.matchs.some(m => m.id === d.id)); if (s >= 0) ficheSemaine(s); },
  role:d => ficheRole(d.j, d.p),
  choisirRole:d => { const k = club(M.manager.club).compo; k.roles = k.roles || {}; k.roles[d.j] = d.r; sauver(); retirerFeuille(); rendre(); },
  capitaine:d => { club(M.manager.club).compo.cap = d.j; sauver(); retirerFeuille(); rendre(); toast('Nouveau capitaine'); },
  merc:d => { MERC.onglet = d.o; MERC.vu = 1; rendre(); },
  mercPoste:d => { MERC.poste = d.p; rendre(); },
  mercAge:d => { MERC.age = +d.a; rendre(); },
  mercMoyens:() => { MERC.moyens = !MERC.moyens; rendre(); },
  suivre:d => { const on = C.suivre(M, d.j); sauver(); toast(on ? 'Joueur suivi' : 'Plus suivi'); ficheJoueur(d.j); },
  vendre:d => { const on = C.mettreEnVente(M, d.j); sauver(); toast(on ? 'Mis en vente : les offres arrivent pendant le mercato' : 'Retiré de la vente'); ficheJoueur(d.j); if (U.vue === 'effectif' || U.vue === 'mercato') rendre(); },
  liberer:d => { const j = M.joueurs[d.j]; if (!confirm(`Résilier le contrat de ${nomJ(j)} ? Coût : ${eur(C.coutLiberation(M, j))}.`)) return; const r = C.liberer(M, d.j); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  offre:d => { OFFRE = null; ficheOffre(d.j, 'transfert'); },
  prolonger:d => { OFFRE = null; ficheOffre(d.j, 'prolonger'); },
  pasOffre:d => { const k = d.k, v = OFFRE[k], st = k === 'sal' ? (v >= 10000 ? 500 : 250) : (v >= 1e6 ? 100000 : 25000); OFFRE[k] = Math.max(0, v + (+d.d) * st); OFFRE.msg = ''; ficheOffre(OFFRE.j, OFFRE.mode); },
  ansOffre:d => { OFFRE.ans = +d.v; ficheOffre(OFFRE.j, OFFRE.mode); },
  envoyerOffre:() => {
    const o = OFFRE, r = o.mode === 'prolonger' ? C.prolonger(M, o.j, o.sal, o.ans) : C.proposerTransfert(M, o.j, o.montant, o.sal, o.ans);
    if (r.ok){ OFFRE = null; retirerFeuille(); sauver(); rendre(); toast(r.msg); return; }
    o.msg = r.msg; if (r.contre){ if (r.contre.montant) o.montant = r.contre.montant; if (r.contre.sal) o.sal = r.contre.sal; if (r.contre.ans) o.ans = r.contre.ans; if (r.contre.montant || r.contre.sal) o.msg += ' (montant reporté ci-dessus)'; }
    ficheOffre(o.j, o.mode);
  },
  accepterOffre:d => { const r = C.accepterOffre(M, d.o); toast(r.msg); sauver(); rendre(); },
  refuserOffre:d => { C.refuserOffre(M, d.o); sauver(); rendre(); },
  ent:d => { const E = club(M.manager.club).entrainement; E[d.g][d.k] = d.k === 'i' ? +d.v : d.v; sauver(); rendre(); },
  prix:d => { const c = club(M.manager.club); C.reglerPrix(M, c.prix + (+d.d)); sauver(); rendre(); },
  balais:d => { const b = D.BALAIS.find(x => x.id === d.b); if (!confirm(`Acheter un jeu de ${b.nom} pour ${eur(b.prix * 1000)} ?`)) return; const r = C.acheterBalais(M, d.b); toast(r.msg); if (r.ok){ sauver(); rendre(); } },
  ficheStaff:d => ficheStaff(d.r),
  embaucher:d => { const r = C.embaucher(M, d.s); toast(r.msg); if (r.ok){ retirerFeuille(); sauver(); rendre(); } },
  continuer:() => { const S = QM.semaine(M); QM.terminerSemaine(M, null); sauver(); rendre(); scrollTo(0, 0); toast(S.type === 'sixn' ? `Six Nations · tour ${S.tour} joué` : S.type === 'prepa' ? `Préparation · semaine ${S.semaine} terminée` : 'Semaine passée'); },
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
  rendre();
})();
})();
