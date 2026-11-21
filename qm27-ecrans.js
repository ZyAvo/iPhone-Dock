// mon-ecran-version: 8b303ff3
/* QM27 (v91, lot 8) — écrans du domaine et du bureau. Chargé après qm27-ui.js, dont il reçoit la boîte à outils (window.QMU).
   Carte du domaine (accueil Club) et ses lieux, bureau du président, profil du manager, salle des trophées et records,
   boîte de réception, effectif en colonnes, annuaire des clubs, calendrier par mois et par saison, entraînement programmable, menu Plus. */
(() => {
'use strict';
const Z = window.QMU; if (!Z) return;
const {flagSeul, pieces, eurT, D, E, C, V, B, esc, eur, fmtDate, lab, club, nat, blason, avatarDe, flag, posteB, etoiles, nomJ, classeNote, toast, feuille, fermerFeuille, retirerFeuille, teteF, sauver, rendre, aller, ficheJoueur, noteVue, connu, HH, roleDe, VUES, ACT, VUE, U, LS} = Z;
const G = () => window.QMG;
const M = () => Z.M;
const moi = () => club(M().manager.club);
const jauge = (v, label, coul) => `<div class="jauge" role="meter" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}"><i style="width:${Math.max(0, Math.min(100, v))}%${coul ? ';background:' + coul : ''}"></i></div>`;
const plur = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;

/* ============================== Carte du domaine ============================== */
/* chaque lieu : dessin, position sur la carte, destinations */
const LIEUX = {
  poudlard:{nom:'Poudlard', sous:'Centre de formation', x:80, y:124, e:1.2},
  direction:{nom:'Tour du directeur', sous:'Président, contrat, profil', x:290, y:128, e:1.15},
  stade:{nom:'Stade', sous:'Entrée, tribunes, buvette, Bazar', x:180, y:200, e:1.35, py:40},
  vestiaire:{nom:'Vestiaire', sous:'Effectif, ambiance', x:62, y:268, e:1.3},
  voliere:{nom:'Volière', sous:'Mercato, recrutement', x:300, y:264, e:1.3},
  technique:{nom:'Zone technique', sous:'Entraînement, staff', x:74, y:364, e:1.25},
  gringotts:{nom:'Gringotts', sous:'Finances, banque', x:180, y:372, e:1.25},
  trophees:{nom:'Salle des trophées', sous:'Palmarès, records', x:290, y:364, e:1.25},
};
function destinations(l){
  const M_ = M(), c = moi(), mg = M_.manager, Hm = HH();
  const amb = Hm ? Hm.ambiance(M_, c) : 60, ouvert = C.mercatoOuvert(Z.M && window.QM.semaine(M_));
  return {
    vestiaire:[['effectif', 'Effectif', `${c.effectif.length} joueurs · vues Général, Contrats, Physique, Saison`], ['vestiaire', 'Ambiance et mentorat', `Ambiance ${amb} / 100 · leaders, clans`]],
    stade:[['entree', 'Entrée du stade', `Billetterie, ${eur(c.prix)} la place`], ['stade', 'Tribunes', `${c.stade.toLocaleString('fr-FR')} places`], ['buvette', 'La buvette', `Taverne niveau ${C.niv(c, 'buvettes')}`], ['tactique', 'Tactique', 'Composition, dispositions, consignes'], ['boutique', 'Le Bazar', 'Produits et prix'], ['partenaires', 'Partenaires', c.dom && c.dom.sponsor ? esc(c.dom.sponsor.nom) : 'Sponsor à choisir']],
    direction:[['direction', 'Bureau du président', `Objectif : ${esc(mg.objectif.txt.toLowerCase())} · confiance ${Math.round(mg.confiance)} %`], ['profil', 'Mon profil', 'Avatar, attributs, contrat'], ['carriere', 'Carrière', `Réputation ${Math.round(mg.rep)} · offres`],
      ...(mg.selection ? [['selection', 'Sélection', `${esc(nat(mg.selection.nat).nom)} · amicaux et ${esc(D.LDN.nom)}`]] : [])],
    voliere:[['mercato', 'Mercato', ouvert ? 'Ouvert' : 'Fermé · agents libres disponibles'], ['clubs', 'Clubs et joueurs', 'Tous les effectifs, missions du recruteur']],
    technique:[['entrainement', 'Entraînement', 'Programme de la semaine'], ['staff', 'Staff', 'Entraîneurs, médecin, recruteur'], ['domaine', 'Bâtiments du domaine', 'Niveaux et améliorations']],
    gringotts:[['finances', 'Finances et banque', `Solde ${eur(c.budget)}`]],
    poudlard:[['formation', 'Centre de formation', `${plur((c.academie || []).length, 'jeune')}`]],
    trophees:[['trophees', 'Salle des trophées', 'Vitrine, palmarès, records']],
  }[l] || [];
}
/* petits dessins des lieux (origine : centre du sol), aux couleurs du club */
function dessin(l, c){
  const [k1, k2] = c.couleurs, nv = k => C.niv(c, k) || 1;
  const fenetre = (x, y, w = 4, h = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" class="lum"/>`;
  switch (l){
    case 'stade': { const t = c.stade > 30000 ? 3 : c.stade > 15000 ? 2 : 1;
      return `<ellipse cx="0" cy="2" rx="66" ry="25" class="ombre"/>${t > 2 ? '<ellipse cx="0" cy="-6" rx="66" ry="25" class="pierre2"/>' : ''}${t > 1 ? '<ellipse cx="0" cy="-3" rx="63" ry="24" class="pierre"/>' : ''}
        <ellipse cx="0" cy="-1" rx="60" ry="22" class="pierre"/><ellipse cx="0" cy="-2" rx="48" ry="15" class="gazon"/><ellipse cx="0" cy="-2" rx="8" ry="3" fill="none" class="trait"/>
        ${[-40, -34, 34, 40].map((x, i) => `<path d="M${x} -2v-${i % 3 ? 18 : 13}" class="poteau"/><circle cx="${x}" cy="-${i % 3 ? 22 : 17}" r="3.4" fill="none" class="anneau"/>`).join('')}
        ${[-56, 56].map(x => `<path d="M${x} -8v-22" class="poteau"/><path d="M${x} -30h${x < 0 ? 10 : -10}l${x < 0 ? -3 : 3} 3.4 ${x < 0 ? 3 : -3} 3.4h${x < 0 ? -10 : 10}" fill="${k1}"/>`).join('')}`; }
    case 'vestiaire':
      return `<ellipse cx="0" cy="2" rx="30" ry="6" class="ombre"/><rect x="-24" y="-24" width="48" height="26" rx="2" class="mur"/><path d="M-28 -23 0 -42 28 -23z" fill="${k1}"/><path d="M-24 -24h48M-12 -24v26M12 -24v26" class="colombage"/>
        <rect x="16" y="-46" width="6" height="12" class="pierre"/><path d="M19 -48c-3-4 3-6 0-10" class="fumee"/>${fenetre(-20, -18, 6, 6)}${fenetre(14, -18, 6, 6)}<rect x="-5" y="-14" width="10" height="16" rx="5" fill="${k2}" stroke="${k1}" stroke-width="1.2"/>`;
    case 'direction':
      return `<ellipse cx="0" cy="2" rx="16" ry="5" class="ombre"/><rect x="-10" y="-58" width="20" height="60" class="pierre"/><path d="M-10 -58h20" class="trait"/><path d="M-14 -58 0 -92 14 -58z" class="toit-mage"/>
        <path d="M0 -98l1.6 3.4 3.6.4-2.7 2.4.8 3.6L0 -90l-3.3 1.8.8-3.6-2.7-2.4 3.6-.4z" class="etoile"/>${fenetre(-3, -50)}${fenetre(-3, -36)}${fenetre(-3, -22)}<path d="M10 -40h9l-3 3 3 3h-9z" fill="${k1}"/><path d="M10 -40v12" class="poteau"/>`;
    case 'voliere':
      return `<ellipse cx="0" cy="2" rx="22" ry="5" class="ombre"/><path d="M-18 2V-22h36V2z" class="bois"/><path d="M-22 -22 0 -40 22 -22z" class="toit-bois"/>
        ${[-11, 0, 11].map(x => `<circle cx="${x}" cy="-12" r="3.6" class="nuit"/>`).join('')}<path d="M-14 -2h28" class="trait"/>
        <g class="hibou"><ellipse cx="-2" cy="-46" rx="4.2" ry="5" /><circle cx="-3.6" cy="-47.4" r="1.2" class="oeil"/><circle cx="-.4" cy="-47.4" r="1.2" class="oeil"/><path d="M-6 -51l1.4 2.4M2 -51l-1.4 2.4" class="hibou-t"/></g>
        <path d="M18 -34c4-3 8-3 11 0-3-1-6 0-8 2" class="vol-hibou"/>`;
    case 'gringotts':
      return `<ellipse cx="0" cy="2" rx="34" ry="6" class="ombre"/><rect x="-30" y="-4" width="60" height="6" class="marbre2"/><rect x="-26" y="-30" width="52" height="27" class="marbre"/>
        ${[-20, -10, 0, 10, 20].map(x => `<rect x="${x - 2.4}" y="-30" width="4.8" height="26" class="colonne"/>`).join('')}<path d="M-31 -30 0 -46 31 -30z" class="marbre2"/>
        <circle cx="0" cy="-36" r="5" class="or"/><text x="0" y="-33.6" text-anchor="middle" class="g-or">G</text>`;
    case 'technique':
      return `<ellipse cx="0" cy="2" rx="34" ry="6" class="ombre"/><path d="M-30 2v-18h28V2z" class="bois"/><path d="M-33 -15c4-10 30-10 34 0z" class="toit-bois"/><rect x="-22" y="-12" width="12" height="14" class="nuit"/>
        ${[-20, -16, -12].map(x => `<path d="M${x} -10l1 11" class="manche"/>`).join('')}
        <path d="M10 2v-22M22 2v-28" class="poteau"/><circle cx="10" cy="-24" r="4" fill="none" class="anneau"/><circle cx="22" cy="-31" r="4" fill="none" class="anneau"/>
        ${[4, 16, 28].map(x => `<path d="M${x - 2.4} 2l2.4-6 2.4 6z" fill="${k1}"/>`).join('')}`;
    case 'poudlard': { const n = Math.min(5, 2 + Math.floor(nv('formation') / 2));
      const tours = [[-26, 30], [26, 30], [-12, 44], [12, 40], [0, 56]].slice(0, n);
      return `<ellipse cx="0" cy="2" rx="38" ry="6" class="ombre"/><rect x="-30" y="-22" width="60" height="24" class="pierre"/><path d="M-30 -22h60" class="trait"/>
        ${tours.map(([x, h]) => `<rect x="${x - 6}" y="${-h}" width="12" height="${h}" class="pierre"/><path d="M${x - 8} ${-h} ${x} ${-h - 18} ${x + 8} ${-h}z" class="toit-poudlard"/>${fenetre(x - 2, -h + 6, 4, 6)}`).join('')}
        ${[-18, 18].map(x => fenetre(x, -14, 5, 7)).join('')}<path d="M-5 2v-10a5 5 0 0 1 10 0V2z" class="nuit"/><path d="M0 -${(tours[tours.length - 1] || [0, 30])[1] + 18}v-8h7l-2 2.4 2 2.4H0" fill="${k1}"/>`; }
    case 'trophees':
      return `<ellipse cx="0" cy="2" rx="30" ry="6" class="ombre"/><rect x="-24" y="-24" width="48" height="26" class="marbre"/><path d="M-24 -24a24 18 0 0 1 48 0z" class="or-doux"/>
        <path d="M-6 -46h12c0 6-2.4 9-6 9s-6-3-6-9zM-2 -37h4v4h3v2H-5v-2h3z" class="or"/><path d="M-6 -44c-3 0-4 3-1 5M6 -44c3 0 4 3 1 5" fill="none" class="or-trait"/>
        ${fenetre(-17, -16, 6, 10)}${fenetre(11, -16, 6, 10)}<rect x="-5" y="-12" width="10" height="14" rx="1.5" fill="${k1}"/>`;
  }
  return '';
}
function badgesLieux(){
  const M_ = M(), c = moi(), mg = M_.manager, Hm = HH(), S = window.QM.semaine(M_), r = {};
  if (Hm){ const n = Hm.mecontents(M_, c).length; if (n) r.vestiaire = n; }
  if ((mg.offres || []).filter(o => o.expire > (M_.tic || 0)).length || mg.offreSel) r.direction = '!';
  if (M_.offres.length || (Hm && Hm.etat(M_).contres.length)) r.voliere = M_.offres.length + (Hm ? Hm.etat(M_).contres.length : 0);
  else if (C.mercatoOuvert(S)) r.voliere = '●';
  if (c.budget < 0) r.gringotts = '!';
  if (D.BATIMENTS.some(b => B.amelEnAttente(c, b[0]))) r.technique = '★';
  return r;
}
/* v93 : la carte illustrée (fond et lieux dessinés à part, images/qm27/) ; x, y = pied du bâtiment sur sa clairière, l = largeur */
const POS_IMG = {poudlard:[85, 150, 92], direction:[272, 150, 84], stade:[181, 262, 128], vestiaire:[54, 238, 78], voliere:[311, 240, 78], technique:[66, 372, 90], gringotts:[174, 424, 88], trophees:[300, 374, 84]};
function carteIllustree(){
  const c = moi(), bdg = badgesLieux(), I = V.IMAGES, L = Object.entries(LIEUX);
  /* deux passes : les bâtiments, puis les plaques et pastilles par-dessus (jamais cachées par un voisin) */
  return `<svg class="carte-dom illus" viewBox="0 0 360 540" role="group" aria-label="Le domaine de ${esc(c.nom)}">
    <image href="${I}fond-jour.webp" x="0" y="0" width="360" height="540" preserveAspectRatio="xMidYMid slice" class="fond-img"/><image href="${I}fond-nuit.webp" x="0" y="0" width="360" height="540" preserveAspectRatio="xMidYMid slice" class="fond-nuit"/><rect width="360" height="540" class="nuit-voile"/>
    ${L.map(([k, l]) => { const [x, y, w] = POS_IMG[k];
      return `<g class="lieu" data-act="lieu" data-l="${k}" role="button" tabindex="0" aria-label="${esc(l.nom)} : ${esc(l.sous)}" transform="translate(${x} ${y})">
        <rect x="${-w / 2}" y="${-w + 8}" width="${w}" height="${w + 12}" fill="transparent"/><image href="${I}lieux/${k}.webp" x="${-w / 2}" y="${-w + 6}" width="${w}" height="${w}" class="bat-img"/><title>${esc(l.nom)} : ${esc(l.sous)}</title></g>`; }).join('')}
    ${L.map(([k, l]) => { const [x, y] = POS_IMG[k], b = bdg[k];
      return `<g class="lieu plaque-g" data-act="lieu" data-l="${k}" aria-hidden="true" transform="translate(${x} ${y + 14})"><rect x="-${l.nom.length * 3.1 + 10}" y="-9" width="${l.nom.length * 6.2 + 20}" height="18" rx="9" class="plaque"/><text y="4" text-anchor="middle" class="plaque-t">${esc(l.nom)}</text>
        ${b ? `<g transform="translate(${l.nom.length * 3.1 + 8} -10)"><circle r="8" class="pastille"/><text y="3.4" text-anchor="middle" class="pastille-t">${b}</text></g>` : ''}</g>`; }).join('')}
  </svg>`;
}
function carteDomaine(){
  if (V.IMAGES) return carteIllustree();
  const c = moi(), bdg = badgesLieux();
  return `<svg class="carte-dom" viewBox="0 0 360 400" role="group" aria-label="Le domaine de ${esc(c.nom)}">
    <defs><linearGradient id="dCiel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ciel1"/><stop offset="1" class="ciel2"/></linearGradient></defs>
    <rect width="360" height="400" fill="url(#dCiel)"/>
    <path d="M0 150c60-30 120-20 180 0s130 20 180-6V400H0z" class="colline1"/><path d="M0 214c80-24 150-6 220 10s110 10 140 0V400H0z" class="colline2"/>
    <circle cx="322" cy="34" r="14" class="astre"/>
    <path d="M80 140C112 180 150 190 180 212M290 144c-30 40-70 56-110 68M62 280c40-24 80-48 118-68M300 276c-40-22-80-44-120-64M74 376c30-60 70-120 106-164M180 380V212M290 376c-30-60-70-120-110-164" class="chemin"/>
    ${Object.entries(LIEUX).map(([k, l]) => { const d = destinations(k), b = bdg[k];
      return `<g class="lieu" data-act="lieu" data-l="${k}" role="button" tabindex="0" aria-label="${esc(l.nom)} : ${esc(l.sous)}" transform="translate(${l.x} ${l.y})">
        <rect x="-50" y="-${k === 'direction' ? 118 : k === 'poudlard' ? 100 : 70}" width="100" height="${k === 'direction' ? 145 : k === 'poudlard' ? 127 : 97}" fill="transparent"/>
        <g transform="scale(${l.e || 1})">${dessin(k, c)}</g>
        <g transform="translate(0 ${l.py || 16})"><rect x="-${l.nom.length * 3.1 + 10}" y="-9" width="${l.nom.length * 6.2 + 20}" height="18" rx="9" class="plaque"/><text y="4" text-anchor="middle" class="plaque-t">${esc(l.nom)}</text></g>
        ${b ? `<g transform="translate(${l.nom.length * 3.1 + 8} ${(l.py || 16) - 10})"><circle r="8" class="pastille"/><text y="3.4" text-anchor="middle" class="pastille-t">${b}</text></g>` : ''}
        <title>${esc(l.nom)} : ${esc(l.sous)}${d.length ? '' : ''}</title></g>`; }).join('')}
  </svg>`;
}
function vueClubCarte(){
  const c = moi(), S = window.QM.semaine(Z.M), ouvert = C.mercatoOuvert(S);
  VUE.innerHTML = `<div class="tete-club">${blason(c.id, 'g')}<div><h1 class="grand">${esc(c.nom)}</h1><p class="sous">${flag(c.nat)} ${esc(c.ville)} · ${esc(Z.M.ligues[c.ligue].court)} · ${etoiles(c.rep)}</p></div></div>
  <div class="club-dom"><div class="carte carte-domaine">${carteDomaine()}</div>
  <div class="carte lieux-liste"><h2>Les lieux du domaine</h2>${Object.entries(LIEUX).map(([k, l]) => `<div class="lieu-l"><h3>${esc(l.nom)}</h3><div class="liste">${destinations(k).map(([v, n, s]) => `<button class="el" data-act="vue" data-v="${v}"><div class="t"><b>${n}</b><span>${s}</span></div><span class="d mut">›</span></button>`).join('')}</div></div>`).join('')}</div></div>
  <div class="raccourcis">
    ${[['effectif', 'Effectif'], ['tactique', 'Tactique'], ['entrainement', 'Entraînement'], ['mercato', ouvert ? 'Mercato · ouvert' : 'Mercato'], ['finances', 'Finances'], ['clubs', 'Clubs'], ['direction', 'Président'], ['trophees', 'Trophées']].map(([v, n]) => `<button class="chip" data-act="vue" data-v="${v}">${n}</button>`).join('')}
  </div>
  <p class="petit mut raccourcis-n" style="text-align:center">Touche un lieu du domaine.</p>`;
}
ACT.lieu = d => {
  const L = destinations(d.l), l = LIEUX[d.l];
  if (L.length === 1) return aller(L[0][0]);
  feuille(`${teteF(esc(l.nom), esc(l.sous))}<div class="liste lieux">${L.map(([v, n, s]) => `<button class="el" data-act="vue" data-v="${v}"><div class="t"><b>${n}</b><span>${s}</span></div><span class="d mut">›</span></button>`).join('')}</div>`);
};
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g.lieu')){ e.preventDefault(); ACT.lieu(e.target.dataset); } });

/* ============================== Bureau du président ============================== */
/* ============================== Lieux illustrés façon FM98 (v116) ==============================
   Une pièce illustrée (images/qm27/scenes/<lieu>-fond.webp) et des objets découpés posés dessus (repère = taille du fond, en %).
   Chaque objet ouvre un sous-menu ; au survol (souris) ou au toucher, il s'anime (CSS : .sc-<anim>) avant d'ouvrir.
   Tant que l'image de fond n'est pas déposée, l'écran garde ses cartes (SC_OK[lieu] = false) : rien ne casse.
   Objet : {id, img, x, y, w (centre et largeur en % du fond), anim, nom, act, calques:[[img, classe]], si:(M, c) => bool} */
/* v119 : le bureau du président, méthode des retouches (images A à D de ChatGPT) ; zones en pixels de A (1024 × 1536) */
/* v132 : une retouche de la pièce entière (1024 × 1536) posée sur un objet de zone z : elle déborde de l'objet pour retomber à sa place */
const salleB = (k, z) => ['scenes/' + k, 'b', `left:${(-z[0] / (z[2] - z[0]) * 100).toFixed(3)}%;top:${(-z[1] / (z[3] - z[1]) * 100).toFixed(3)}%;width:${(1024 / (z[2] - z[0]) * 100).toFixed(3)}%;height:${(1536 / (z[3] - z[1]) * 100).toFixed(3)}%`];
/* v134 : un morceau découpé dans la zone z (pixels de A), posé dans un objet de zone Z plus grande (les chopes de l'enseigne dans la tente) */
const sousZone = (k, cl, z, Z) => ['scenes/' + k, cl, `left:${((z[0] - Z[0]) / (Z[2] - Z[0]) * 100).toFixed(3)}%;top:${((z[1] - Z[1]) / (Z[3] - Z[1]) * 100).toFixed(3)}%;width:${((z[2] - z[0]) / (Z[2] - Z[0]) * 100).toFixed(3)}%;height:${((z[3] - z[1]) / (Z[3] - Z[1]) * 100).toFixed(3)}%`];
const TENTE = [570, 465, 735, 864], CHOPES_Z = [626, 614, 732, 724];
/* v134 : le vif d'or de l'entrée du stade, vole entre le fond et le premier plan (S.avant) */
const VIF = `<span class="sc-vif" aria-hidden="true"><span class="sc-vif-c"><svg viewBox="0 0 44 24"><defs><radialGradient id="vifOr" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#f1c232"/><stop offset="1" stop-color="#8a5a08"/></radialGradient></defs>
  <g class="aile g"><path d="M18 11 C10 2 2 3 1 7 C3 9 9 11 18 13Z" fill="#fbf8ec" fill-opacity=".9" stroke="#c9b98a" stroke-width=".6"/></g>
  <g class="aile d"><path d="M26 11 C34 2 42 3 43 7 C41 9 35 11 26 13Z" fill="#fbf8ec" fill-opacity=".9" stroke="#c9b98a" stroke-width=".6"/></g>
  <circle cx="22" cy="12.5" r="5" fill="url(#vifOr)" stroke="#7a5006" stroke-width=".5"/>
  <g class="reflet"><path d="M20.3 6.2 L21 9.6 L24.4 10.3 L21 11 L20.3 14.4 L19.6 11 L16.2 10.3 L19.6 9.6Z" fill="#fff"/><circle cx="20.3" cy="10.3" r="1.2" fill="#fff"/></g></svg></span></span>`;   // v138 : un éclat de lumière de temps en temps
/* v139 : le stade (accueil du jeu), panorama 3072 × 1800 ; le tableau des scores affiche le prochain match et lance la suite */
const TENTE_ST = [735, 790, 1140, 1310], CHOPES_ST = [858, 985, 1018, 1142], ECHOPPE_ST = [345, 985, 740, 1372];
const nomEqS = (id, sx) => sx ? nat(id).nom : club(id).nom;
function afficheStade(M_){
  const QM_ = window.QM, S = QM_.semaine(M_);
  if (!S) return {h:'Saison terminée', t:'', a:'Lancer la saison suivante ›'};
  if (S.type === 'bilan') return {h:`Fin de la saison ${lab(M_.saison)}`, t:'', a:`Lancer la saison ${lab(M_.saison + 1)} ›`};
  const m = QM_.matchDuJoueur(M_);
  if (m){
    const sx = m.ligue === 'sixn', eu = m.ligue === 'eu';
    const comp = eu ? (window.QME ? window.QME.NOM : 'Coupe') : sx ? D.TOURNOI.court : `${M_.ligues[m.ligue].court} · Journée ${S.journee}`;
    return {h:`${comp} · ${fmtDate(m.date || S.date)}`, t:`${nomEqS(m.dom, sx)} – ${nomEqS(m.ext, sx)}`, a:'Préparer le match ›'};
  }
  const titre = S.type === 'prepa' ? `Préparation · semaine ${S.semaine}` : S.type === 'sixn' ? D.TOURNOI.court : S.type === 'europe' && window.QME ? `Finale de la ${window.QME.NOM}` : 'Semaine sans match';
  return {h:fmtDate(S.date), t:titre, a:'Semaine suivante ›'};
}
const actionStade = M_ => { const S = window.QM.semaine(M_); return !S || S.type === 'bilan' ? 'saisonSuivante' : window.QM.matchDuJoueur(M_) ? 'preparer' : 'continuer'; };
const dernierStade = M_ => { const d = M_.dernierMatch; return d ? `Dernier : ${nomEqS(d.dom, d.sixn)} ${d.score[0]}–${d.score[1]} ${nomEqS(d.ext, d.sixn)}` : ''; };
const ESC_CH = [330, 0, 700, 960], BAN_CH = [440, 170, 590, 612];   // v143 : l'escalier du hall et sa grande bannière
/* v145 : tableaux vivants : la toile (quadrilatère pris sur l'image) est recopiée du fond, puis respire lentement (léger zoom et glissement),
   des nuages y passent et un oiseau la traverse de temps en temps ; tout reste découpé dans la toile (clip-path) */
/* v151 : portraits vivants (couloir des bureaux) : la toile, recopiée du fond dans son cadre, respire et penche à peine, chacune à son rythme */
function portraitsHTML(S, src){
  return (S.portraits || []).map(([x0, y0, x1, y1], k) => { const w = x1 - x0, h = y1 - y0;
    const fond = `background-image:url(${src(S.fond)});background-size:${(S.l / w * 100).toFixed(2)}% ${(S.h / h * 100).toFixed(2)}%;background-position:${(x0 / (S.l - w) * 100).toFixed(3)}% ${(y0 / (S.h - h) * 100).toFixed(3)}%`;
    return `<i class="sc-portrait p${k}" aria-hidden="true" style="left:${(x0 / S.l * 100).toFixed(2)}%;top:${(y0 / S.h * 100).toFixed(2)}%;width:${(w / S.l * 100).toFixed(2)}%;height:${(h / S.h * 100).toFixed(2)}%"><b style="${fond}"></b></i>`; }).join('');
}
/* v151 : les rais de soleil peints respirent (masque S.rais tiré de l'image) et la poussière y flotte */
function raisHTML(S, src){
  if (!S.rais) return '';
  const m = `url(${src(S.rais)})`;
  return `<i class="sc-rais" aria-hidden="true" style="-webkit-mask-image:${m};mask-image:${m}"><i class="sc-poussiere"></i></i>`;
}
/* v151 : un nom gravé en doré qui s'allume au survol, posé au point (x, y) de la scène, dans la zone Z de son objet */
const gravure = (t, x, y, Z) => `<span class="sc-nomgrave sc-ecrit" style="left:${((x - Z[0]) / (Z[2] - Z[0]) * 100).toFixed(2)}%;top:${((y - Z[1]) / (Z[3] - Z[1]) * 100).toFixed(2)}%">${esc(t)}</span>`;
function tableauxHTML(S, src){
  return (S.tableaux || []).map((q, k) => {
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    const poly = q.map(([x, y]) => `${((x - x0) / w * 100).toFixed(1)}% ${((y - y0) / h * 100).toFixed(1)}%`).join(',');
    const fond = `background-image:url(${src(S.fond)});background-size:${(S.l / w * 100).toFixed(2)}% ${(S.h / h * 100).toFixed(2)}%;background-position:${(x0 / (S.l - w) * 100).toFixed(3)}% ${(y0 / (S.h - h) * 100).toFixed(3)}%`;
    return `<i class="sc-tableau t${k}" aria-hidden="true" style="left:${(x0 / S.l * 100).toFixed(2)}%;top:${(y0 / S.h * 100).toFixed(2)}%;width:${(w / S.l * 100).toFixed(2)}%;height:${(h / S.h * 100).toFixed(2)}%;clip-path:polygon(${poly})">`
      + `<b class="sc-toile-v" style="${fond}"></b><b class="sc-toile-n" style="background-image:url(${src('scenes/brume')})"></b>`
      + `<svg class="sc-oiseau" viewBox="0 0 20 8"><path d="M1 5 Q5 0 10 5 Q15 0 19 5" fill="none" stroke="#2a2a3a" stroke-width="1.4" stroke-linecap="round"/></svg></i>`;
  }).join('');
}
/* v145 : deux fantômes translucides sortent de la porte fermée de l'infirmerie en la traversant et filent vers le bas à droite */
/* deux silhouettes nacrées et translucides (un gentilhomme à fraise, une dame en robe longue), le bas du corps se perd en volutes */
const DEG_F = id => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8ff" stop-opacity=".92"/><stop offset=".45" stop-color="#dfe9fb" stop-opacity=".7"/><stop offset="1" stop-color="#c7d6f2" stop-opacity="0"/></linearGradient>`;
const FANTOMES = [
  `<svg viewBox="0 0 64 112"><defs>${DEG_F('fdg0')}</defs><g fill="url(#fdg0)" stroke="#ffffff" stroke-opacity=".45" stroke-width=".6">
    <path d="M22 30 C16 34 14 44 16 56 C18 70 22 84 20 98 C26 92 28 104 33 96 C38 106 40 92 46 98 C42 84 46 68 47 56 C49 44 47 34 41 30Z"/>
    <path d="M22 33 C14 36 8 30 6 22 C9 25 12 28 16 29" stroke-linecap="round"/><path d="M42 34 C50 40 52 50 50 56 C48 50 45 46 41 44"/>
    <ellipse cx="31.5" cy="28" rx="13" ry="4.2"/><circle cx="31.5" cy="16" r="8"/>
    <path d="M24.5 19 C26 26 37 26 38.5 19 C36 22 27 22 24.5 19Z" fill="#eef3ff" fill-opacity=".8"/></g>
    <g fill="#33405f" opacity=".5"><ellipse cx="28.5" cy="14.5" rx="1.4" ry="1.8"/><ellipse cx="34.5" cy="14.5" rx="1.4" ry="1.8"/><path d="M29 20 Q31.5 21.5 34 20" stroke="#33405f" stroke-width=".8" fill="none"/></g>
    <path d="M24 40 L39 40 M23 47 L40 47" stroke="#ffffff" stroke-opacity=".35" stroke-width=".8"/></svg>`,
  `<svg viewBox="0 0 64 112"><defs>${DEG_F('fdg1')}</defs><g fill="url(#fdg1)" stroke="#ffffff" stroke-opacity=".45" stroke-width=".6">
    <path d="M24 9 C18 14 17 30 13 44 C17 40 20 34 23 30Z" opacity=".8"/>
    <path d="M27 26 C24 34 25 40 26 44 C18 56 12 72 14 92 C20 86 22 100 28 92 C33 102 36 90 41 96 C44 86 50 90 52 84 C50 66 44 54 38 44 C39 40 40 34 37 26Z"/>
    <path d="M27 30 C20 36 18 46 22 52" stroke-linecap="round" fill="none"/><path d="M37 30 C44 34 48 42 46 48" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="16" r="7.4"/><path d="M24.6 15 C24 6 40 4 39.6 15 C38 9 27 9 24.6 15Z" fill="#eef3ff" fill-opacity=".85"/></g>
    <g fill="#33405f" opacity=".45"><ellipse cx="29.4" cy="16" rx="1.2" ry="1.6"/><ellipse cx="34.6" cy="16" rx="1.2" ry="1.6"/><path d="M30.4 20.4 Q32 21.4 33.6 20.4" stroke="#33405f" stroke-width=".7" fill="none"/></g></svg>`,
];
const fantomesHTML = n => Array.from({length:n}, (_, k) => `<i class="sc-fantome f${k}" aria-hidden="true"><i class="sc-fantome-c">${FANTOMES[k % 2]}</i></i>`).join('');
const LETTRE = [110, 880, 345, 990], reunionDe = M_ => G() && G().reunion(M_);
/* v147 : le vestiaire ; la porte se touche sur ses battants (la retouche, plus grande, garde la lumière du jour au sol) */
const matchAJouer = M_ => { const m = window.QM.matchDuJoueur(M_); return !!(m && !m.res); };
const PORTE_V = [360, 345, 670, 730], PUPITRE_V = [0, 915, 305, 1330], MALLE_V = [760, 995, 1024, 1400];   // pupitre et malle : l'étiquette sous la zone reste dans l'image
/* v147 : la composition à la craie sur le tableau du vestiaire (coordonnées de la scène, 1024 × 1536) : gardien devant nos anneaux (à gauche),
   batteurs sur les ailes, poursuiveurs vers les anneaux adverses, attrapeur en haut ; numéros de maillot */
const CRAIE_POS = {G:[[785, 392]], B:[[800, 302], [800, 455]], P:[[830, 292], [826, 366], [834, 438]], A:[[813, 256]]};
function craieCompo(M_, c){
  const co = c && c.compo; if (!co) return '';
  const pts = Object.entries(CRAIE_POS).flatMap(([p, L]) => L.map((xy, i) => { const j = M_.joueurs[(co[p] || [])[i]]; return j ? [xy, j.num || p] : null; })).filter(Boolean);
  return `<svg class="sc-craie" viewBox="705 160 220 370" preserveAspectRatio="none" aria-hidden="true">${pts.map(([[x, y], n]) =>
    `<circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${y + 4.5}">${esc(String(n))}</text>`).join('')}</svg>`;
}
/* v149 : le ciel de nuit : deux semis d'étoiles tirés une fois pour toutes (graine fixe), qui scintillent chacun à son rythme ; la boîte du
   SVG épouse la bande du ciel (largeur de la scène × S.cielH), sous le masque du ciel */
function etoilesHTML(S){
  let g = 7; const h = () => (g = (g * 16807) % 2147483647) / 2147483647;
  const semis = n => Array.from({length:n}, () => `<circle cx="${(h() * S.l).toFixed(0)}" cy="${(h() * S.cielH).toFixed(0)}" r="${(1.6 + h() * h() * 3.4).toFixed(1)}"/>`).join('');
  return `<svg class="sc-etoiles" viewBox="0 0 ${S.l} ${S.cielH}" preserveAspectRatio="none"><g class="a">${semis(70)}</g><g class="b">${semis(70)}</g><g class="c">${semis(18)}</g></svg>`;
}
/* v151 : le couloir des bureaux ; zones de toucher (les petites portes montent jusqu'à leur nom gravé) */
const ESC_B = [0, 1200, 240, 1560], MANAGER_B = [290, 560, 550, 1340], PRESIDENT_B = [1020, 480, 1500, 1340], RECRUT_B = [1690, 560, 2180, 1360], JEUNES_B = [2200, 560, 2640, 1340], ETAGE_B = [2700, 560, 3072, 1390];
/* v149 : la grande salle ; zones de toucher (les retouches, plus grandes, passent par sousZone) */
const PORTE_GS = [80, 750, 300, 1200], GAZETTE_GS = [30, 1170, 524, 1800], ESTRADE_GS = [1100, 480, 1990, 1320], HIBOUX_GS = [2540, 640, 2968, 1280];
/* v149 : le haut du classement à la craie (tableau noir de la grande salle, coordonnées de la scène 3072 × 2048) : les cinq premiers, ou les
   quatre premiers puis le club du joueur s'il est plus bas ; le club du joueur en doré.
   v150 : en perspective : le tableau est un trapèze (côtés verticaux, haut qui descend vers la droite) ; chaque texte est posé au point (u, v)
   du tableau (0-1 en largeur et en hauteur), sa ligne penchée comme les bords (skewY) et sa taille réglée sur la hauteur du tableau à cet endroit */
const TAB_GS = {g:450, d:882, hg:838, hd:928, bg:1178, bd:1178};
function craieP(u, v){
  const T = TAB_GS, x = T.g + (T.d - T.g) * u, haut = T.hg + (T.hd - T.hg) * u, bas = T.bg + (T.bd - T.bg) * u;
  const pente = ((T.hd - T.hg) * (1 - v) + (T.bd - T.bg) * v) / (T.d - T.g), k = (bas - haut) / (T.bg - T.hg);
  return [x, haut + (bas - haut) * v, Math.atan(pente) * 180 / Math.PI, k];
}
function craieTexte(u, v, t, taille, cl, ancre, largeur){
  const [x, y, a, k] = craieP(u, v);
  const lg = largeur && t.length * taille * .5 > largeur ? ` textLength="${largeur.toFixed(0)}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="${cl}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) skewY(${a.toFixed(2)}) scale(${k.toFixed(3)})" style="font-size:${taille}px;text-anchor:${ancre}"${lg}>${esc(t)}</text>`;
}
function craieClassement(M_, c){
  if (!c || !c.ligue || !M_.tables || !M_.tables[c.ligue]) return '';
  const CL = window.QM.classement(M_, c.ligue), moiI = CL.findIndex(r => r.id === c.id);
  const rangs = moiI < 5 ? CL.slice(0, 5).map((r, i) => [i, r]) : [...CL.slice(0, 4).map((r, i) => [i, r]), [moiI, CL[moiI]]];
  const lignes = rangs.map(([i, r], n) => { const v = .33 + n * .145, mien = r.id === c.id ? 'mien' : '';
    return craieTexte(.07, v, `${i + 1}. ${club(r.id).nom}`, 30, mien, 'start', 285) + craieTexte(.93, v, String(r.pts), 30, `pts ${mien}`, 'end'); }).join('');
  return `<svg class="sc-craie sc-ecrit liste" viewBox="410 770 510 460" preserveAspectRatio="none" aria-hidden="true">${craieTexte(.5, .16, M_.ligues[c.ligue].court || 'Classement', 27, 'titre', 'middle')}${lignes}</svg>`;
}
/* v149 : l'almanach : les dates des quatre prochains matchs du club, qui s'élèvent du livre au survol */
function datesAlmanach(M_){
  const c = moi(); if (!c) return '';
  const L = [];
  for (let i = M_.semaine || 0; i < M_.calendrier.length && L.length < 8; i++){
    const S = M_.calendrier[i];
    for (const m of S.matchs || []) if (!m.res && (m.dom === c.id || m.ext === c.id)) L.push(m.date || S.date);
  }
  const dates = L.sort((a, b) => a - b).slice(0, 4).map(t => new Date(t).toLocaleDateString('fr-FR', {day:'numeric', month:'short', timeZone:'UTC'}));
  return `<i class="sc-halo"></i><span class="sc-dates sc-ecrit">${dates.map((d, i) => `<span style="--i:${i}">${esc(d)}</span>`).join('')}</span>`;
}
const SCENES = {
  direction:{fond:'scenes/bureau-fond', v:4, ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'chapeau', zone:[10, 110, 225, 310], calques:[['scenes/bureau-chapeau-B', 'b']], plaque:'g', anim:'parle', nom:'Confiance du président', act:'scConfiance'},
    /* le portrait : le cadre ovale vide de l'image A (v131, ovale intérieur mesuré : centre 712,8 × 321,7, 168,4 × 250,8, penché de 3°), le visage du manager dedans */
    {id:'portrait', zone:[628.6, 196.3, 797, 447.1], portrait:{angle:3}, anim:'respire', nom:'Mon contrat, mon profil', act:'scPortrait'},
    /* l'écharpe (v131) : peinte en blanc et gris, détourée (couche « gris ») et teinte aux couleurs du club, au repos (A) et quand elle ondule (B) */
    {id:'echarpe', zone:[800, 270, 1024, 860], calques:[['scenes/bureau-echarpe-gris-A', 'fixe gris'], ['scenes/bureau-echarpe-B', 'b'], ['scenes/bureau-echarpe-gris-B', 'b gris']], plaque:'d', anim:'bascule', nom:'Supporters', act:'scSupporters'},
    {id:'gazette', zone:[610, 820, 945, 1000], calques:[['scenes/bureau-gazette-B', 'b']], anim:'bascule', nom:'Presse', act:'scPresse'},
    {id:'lettre', zone:LETTRE, calques:[['scenes/bureau-lettre-B', 'b']], anim:'bascule', nom:'Réunion de début de saison', act:'scReunion',
      si:M_ => { const R = reunionDe(M_); return !!(R && !R.fin); }},
    {id:'lettreOuverte', zone:LETTRE, calques:[['scenes/bureau-lettre-D', 'fixe']], anim:'fixe', nom:'Plan de la saison', act:'scReunion',
      si:M_ => { const R = reunionDe(M_); return !!(R && R.fin && R.accord); }},
    {id:'lettreVide', zone:LETTRE, decor:true, calques:[['scenes/bureau-lettre-C', 'fixe']],   // pas de réunion : le bureau est vide à cet endroit
      si:M_ => { const R = reunionDe(M_); return !(R && !R.fin) && !(R && R.fin && R.accord); }},
    {id:'bourse', zone:[0, 1020, 260, 1310], calques:[['scenes/bureau-bourse-B', 'b']], plaque:'g', anim:'bascule', nom:'Finances', act:'scFinances'},
  ]},
  /* v118 : la banque des Gobelins (finances), méthode des retouches : le fond est l'image A de ChatGPT, objets compris ; chaque objet est une
     zone [x0, y0, x1, y1] (pixels de A) où se superposent les rectangles découpés dans les retouches B et C (qm27-scenes.py, RETOUCHES).
     Le coffre s'ouvre (A → B → C), le plan se remplit jusqu'à l'affluence prévue (C), le gobelin lève la tête et son monocle (B). */
  finances:{fond:'scenes/banque-fond', v:2, ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'plaque', zone:[826, 374, 962, 460], anim:'fixe', muet:true, nom:'Solde', act:'scCoffre', textes:[[(M_, c) => eurT(c.budget), 'left:18.4%;top:37.4%;width:62.5%;height:52%;transform:skewY(-17deg)', 'sc-grave', [2.2, 20]]]},
    {id:'coffre', zone:[770, 488, 1016, 798], calques:[['scenes/banque-coffre-B', 'f2'], ['scenes/banque-coffre-C', 'f3']], plaque:'d', anim:'porte', nom:'Le coffre', act:'scCoffre'},
    {id:'plan', zone:[95, 405, 422, 642], calques:[['scenes/banque-plan-C', 'plein']], plaque:'g', anim:'remplit', nom:'Billetterie', act:'scBillet',
      vars:(M_, c) => ({'--r':Math.round(18 + 60 * Math.min(1, C.remplissage(M_, c, {rep:60}))) + '%'})},
    {id:'etiquette', zone:[343, 612, 417, 668], anim:'fixe', muet:true, nom:'Prix des places', act:'scBillet', textes:[[(M_, c) => eurT(c.prix), 'left:6%;top:18%;width:88%;height:64%;transform:rotate(-1deg)', 'sc-encre', [1.9, 12]]]},
    {id:'gobelin', zone:[388, 632, 676, 850], calques:[['scenes/banque-gobelin-B', 'b']], anim:'bascule', nom:'Banque des Gobelins', act:'scGobelin'},
  ]},
  /* v121 : le vestiaire (page Équipe) façon FM98 ; v147 : repeint en lumière chaude, une retouche par objet (B robes, C portes du tunnel,
     D plume, E balais, F mannequin, G malle, H potions) ; le tableau noir montre la vraie composition à la craie ; bougies et lanterne vacillent.
     Ordre des objets = ordre d'empilement : la grande pièce des portes (la lumière du jour coule jusqu'au mannequin) passe sous le mannequin */
  equipe:{fond:'scenes/equipe-fond', v:4, ratio:1536 / 1024, l:1024, h:1536, lanternes:[[75, 112, .32, 'bougie'], [272, 228, .26, 'bougie'], [950, 112, .32, 'bougie'], [511, 182, .6, 'lanterne'],
    [960, 352, .2, 'fiole', '255,70,60'], [990, 350, .2, 'fiole', '90,235,90'], [957, 458, .2, 'fiole', '80,140,255'], [990, 458, .2, 'fiole', '210,90,255']],
    rayons:[[330, 700, 770, 1110, '26% 0, 58% 0, 90% 100%, 6% 100%']], objets:[   // v148 : bougies, lanterne, fioles et rayon du jour par la porte du tunnel
    {id:'porte', zone:PORTE_V, calques:[sousZone('equipe-porte-C', 'b', [330, 340, 730, 1080], PORTE_V)], anim:'bascule',
      actF:M_ => matchAJouer(M_) ? 'scCouloir' : 'vue', args:{v:'accueil'},   // v148 : un match à jouer → sa préparation ; sinon retour au stade
      nom:M_ => matchAJouer(M_) ? 'Préparer le match' : 'Le stade'},
    {id:'tableau', zone:[705, 160, 925, 530], anim:'bascule', nom:'Tactique', vue:'tactique', html:(M_, c) => craieCompo(M_, c), htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'potions', zone:[908, 225, 1024, 535], calques:[['scenes/equipe-potions-H', 'b']], plaque:'d', anim:'bascule', nom:'Infirmerie', act:'scBlesses'},
    {id:'balais', zone:[700, 515, 1024, 950], calques:[['scenes/equipe-balais-E', 'b']], plaque:'d', anim:'bascule', nom:'Balais', act:'scBalais'},
    {id:'robes', zone:[0, 370, 385, 835], calques:[['scenes/equipe-robes-gris-A', 'fixe gris'], ['scenes/equipe-robes-B', 'b'], ['scenes/equipe-robes-gris-B', 'b gris']], plaque:'g', anim:'bascule', nom:'Effectif', vue:'effectif'},
    {id:'mannequin', zone:[375, 720, 655, 1060], calques:[['scenes/equipe-mannequin-F', 'b']], anim:'bascule', nom:'Entraînement', vue:'entrainement'},
    {id:'pupitre', zone:PUPITRE_V, calques:[sousZone('equipe-plume-D', 'b', [35, 1105, 300, 1305], PUPITRE_V)], plaque:'g', anim:'bascule', nom:'Staff', vue:'staff'},
    {id:'malle', zone:MALLE_V, calques:[sousZone('equipe-malle-G', 'b', [755, 985, 1024, 1510], MALLE_V)], plaque:'d', anim:'bascule', nom:'Progression des joueurs', act:'scProgression'},
  ]},
  /* v122 : le bureau du recrutement, images A (repos) et B (tout bouge) ; args = paramètres passés à l'action (onglet du mercato) */
  recrutement:{fond:'scenes/recrutement-fond', ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'portraits', zone:[40, 125, 435, 498], calques:[['scenes/recrutement-portraits-B', 'b']], plaque:'g', anim:'parle', nom:'Joueurs suivis', act:'scMerc', args:{o:'suivis'}},
    {id:'dossiers', zone:[80, 495, 300, 820], calques:[['scenes/recrutement-dossiers-B', 'b']], plaque:'g', anim:'bascule', nom:'Mercato', act:'scMerc', args:{o:'recherche'}},
    {id:'sorciere', zone:[330, 400, 690, 780], calques:[['scenes/recrutement-sorciere-B', 'b']], anim:'bascule', nom:'Staff', vue:'staff'},
    {id:'hibou', zone:[745, 340, 1024, 790], calques:[['scenes/recrutement-hibou-B', 'b']], plaque:'d', anim:'bascule', act:'scMerc', args:{o:'offres'},
      nom:M_ => M_.offres && M_.offres.length ? `Offres (${M_.offres.length})` : 'Offres et ventes'},
    {id:'globe', zone:[740, 875, 1024, 1450], calques:[['scenes/recrutement-globe-B', 'b']], plaque:'d', anim:'bascule', nom:'Clubs et joueurs', vue:'clubs'},
  ]},
  /* v124 : le Bazar et l'ardoise où défilent les prix à la craie ; v129 : refait en tissus blanc et gris, teints aux couleurs du club */
  boutique:{fond:'scenes/boutique-fond', v:2, ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'tissus', zone:[3, 62, 1009, 1042], decor:true, calques:[['scenes/boutique-tissus', 'fixe gris']]},   // v129 : tissus blanc et gris, teints aux couleurs du club
    {id:'ardoise', zone:[285, 728, 745, 1325], calques:[['scenes/boutique-ardoise-B', 'b']], anim:'bascule', nom:'Les prix', act:'scArdoise',
      html:(M_, c) => ardoiseHTML(c), htmlStyle:'left:6%;top:24%;width:88%;height:70%'},
  ]},
  /* v132 : le salon du manager (Moi) : son visage dans le miroir (ovale de verre mesuré : centre 141,1 × 610,5, 198,3 × 476,1, penché de −2,9°) */
  salon:{fond:'scenes/salon-fond', ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'miroir', zone:[41.9, 372.5, 240.3, 848.5], portrait:{angle:-2.9, miroir:true}, plaque:'g', anim:'respire', nom:'Mon profil', vue:'profil'},
    {id:'carte', zone:[350, 90, 730, 525], calques:[['scenes/salon-carte-B', 'b']], anim:'bascule', nom:'Clubs d\'Europe', vue:'clubs'},
    {id:'trophees', zone:[700, 340, 1020, 520], anim:'bascule', plaque:'d', nom:'Salle des trophées', vue:'trophees', si:M_ => !!M_.manager.club},
    {id:'lettre', zone:[770, 840, 1024, 1110], calques:[['scenes/salon-lettre-B', 'b']], plaque:'d', anim:'bascule', vue:'boite',
      nom:() => { const n = nonLus(); return n ? `Boîte de réception (${n})` : 'Boîte de réception'; }},
    {id:'malle', zone:[125, 1080, 810, 1485], calques:[['scenes/salon-malle-B', 'b']], anim:'bascule', nom:'Ma carrière', vue:'carriere'},
  ]},
  /* v132 : le pensionnat (centre de formation) */
  formation:{fond:'scenes/pensionnat-fond', ratio:1536 / 1024, l:1024, h:1536, objets:[
    {id:'portrait', zone:[0, 130, 248, 556], calques:[['scenes/pensionnat-portrait-B', 'b']], plaque:'g', anim:'bascule', vue:'staff',
      nom:(M_, c) => { const r = c && c.staff.formation; return r ? `Responsable : ${r.p} ${r.n}` : 'Responsable de la formation'; }},
    {id:'hibou', zone:[660, 195, 1024, 560], calques:[['scenes/pensionnat-hibou-B', 'b']], plaque:'d', anim:'bascule', nom:'Le pensionnat (bâtiment)', act:'batiment', args:{b:'formation'}},
    {id:'livre', zone:[340, 470, 820, 728], calques:[['scenes/pensionnat-livre-B', 'b']], anim:'bascule', act:'scJeunes',
      nom:(M_, c) => { const n = c && c.academie ? c.academie.length : 0; return n ? `Les jeunes (${n})` : 'Les jeunes'; }},
    {id:'balais', zone:[575, 940, 1024, 1475], calques:[['scenes/pensionnat-balais-B', 'b']], plaque:'d', anim:'bascule', nom:'Progression des joueurs', vue:'progression'},
  ]},
  /* v132 : le hall d'entrée du club */
  /* v143 : le hall du château (remplace l'ancien hall, ses images hall-* ne servent plus) : escalier → bureaux, double porte → grande salle,
     porte de gauche → infirmerie, escalier du bas → sous-sol ; la grande bannière blanc et gris est teinte aux couleurs du club */
  /* v149 : la grande salle en panorama, sous un plafond enchanté de nuit (étoiles qui scintillent, nuages qui passent devant la lune, bougies
     flottantes) ; torches vacillantes ; le haut du classement écrit à la craie ; l'almanach : halo doré et dates des prochains matchs qui
     s'élèvent en fumée dorée. Ordre des objets = ordre d'empilement */
  /* v151 : le couloir des bureaux en panorama, vu de face. Les petites portes n'ont pas d'étiquette : leur nom s'allume en doré, gravé dans la
     pierre au-dessus d'elles ; la porte du président garde son étiquette. Escalier du hall à gauche (seulement sa rampe : sa lueur monte au
     survol), escalier fermé à droite ; rais de soleil qui respirent, portraits vivants, torches */
  bureaux:{fond:'scenes/bureaux-fond', v:1, ratio:2048 / 3072, l:3072, h:2048, pano:true, panoNom:'tout le couloir', rais:'scenes/bureaux-rais',
    portraits:[[797, 618, 992, 1042], [1515, 620, 1715, 1042]],
    lanternes:[[175, 590, .42, 'bougie'], [705, 560, .42, 'bougie'], [1800, 565, .42, 'bougie']],
    objets:[
    {id:'escalier', zone:ESC_B, anim:'bascule', plaque:'g', nom:'Redescendre au hall', vue:'hall', html:() => '<i class="sc-lueur-esc"></i>', htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'manager', zone:MANAGER_B, calques:[sousZone('bureaux-manager-B', 'b', [256, 666, 564, 1400], MANAGER_B)], anim:'bascule', muet:true, nom:'Mon bureau', vue:'salon',
      html:() => gravure('Manager', 420, 610, MANAGER_B), htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'president', zone:PRESIDENT_B, calques:[sousZone('bureaux-president-C', 'b', [1016, 500, 1496, 1330], PRESIDENT_B), sousZone('bureaux-tapis-C', 'b', [820, 1320, 1690, 1510], PRESIDENT_B)],
      anim:'bascule', nom:'Bureau du président', vue:'direction'},
    {id:'recrutement', zone:RECRUT_B, calques:[sousZone('bureaux-recrutement-D', 'b', [1664, 680, 2200, 1410], RECRUT_B)], anim:'bascule', muet:true, nom:'Bureau du recrutement', vue:'recrutement',
      html:() => gravure('Recrutement', 2034, 610, RECRUT_B), htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'jeunes', zone:JEUNES_B, calques:[sousZone('bureaux-jeunes-E', 'b', [2196, 660, 2700, 1600], JEUNES_B)], anim:'bascule', muet:true, nom:'Classe de vol', vue:'formation',
      html:() => gravure('Classe de vol', 2512, 615, JEUNES_B), htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'etage', zone:ETAGE_B, anim:'bascule', muet:true, nom:'Étage fermé', act:'scEtage', html:() => gravure('Étage fermé', 2850, 1105, ETAGE_B), htmlStyle:'left:0;top:0;width:100%;height:100%'},
  ]},
  grandesalle:{fond:'scenes/grandesalle-fond', v:2, nuages:'scenes/grandesalle-nuages', ratio:2048 / 3072, l:3072, h:2048, pano:true, panoNom:'toute la salle', nuit:true, ciel:'scenes/grandesalle-ciel', cielH:560,
    lanternes:[[70, 860, .42, 'bougie'], [364, 926, .36, 'bougie'], [1070, 996, .32, 'bougie'], [2004, 1000, .32, 'bougie'], [2322, 980, .36, 'bougie'], [2996, 860, .42, 'bougie'], [2226, 206, 2.8, 'lune']],
    flottantes:[[260, 620, 1.15], [470, 420, .9], [650, 700, 1], [820, 330, .75], [980, 560, .8], [1160, 300, .65], [1240, 640, .62], [1330, 430, .6], [1500, 280, .55], [1660, 400, .55],
      [1820, 300, .6], [1880, 640, .62], [1990, 450, .65], [2150, 560, .75], [2380, 380, .8], [2560, 520, .9], [2760, 330, .95], [2900, 640, 1.15]],
    objets:[
    {id:'porte', zone:PORTE_GS, calques:[sousZone('grandesalle-porte-F', 'b', [0, 730, 324, 1210], PORTE_GS)], plaque:'g', anim:'bascule', nom:'Retour au hall', vue:'hall'},
    {id:'tableau', zone:[410, 770, 920, 1230], anim:'bascule', nom:'Classements', vue:'classements', html:(M_, c) => craieClassement(M_, c), htmlStyle:'left:0;top:0;width:100%;height:100%'},
    {id:'estrade', zone:ESTRADE_GS, calques:[sousZone('grandesalle-estrade-B', 'b', [1100, 480, 1990, 1200], ESTRADE_GS)], anim:'bascule', nom:'La Fédération', vue:'federation'},
    {id:'hiboux', zone:HIBOUX_GS, calques:[sousZone('grandesalle-hiboux-C', 'b', [2470, 590, 2968, 1280], HIBOUX_GS)], plaque:'d', anim:'bascule', vue:'boite',
      nom:() => { const n = nonLus(); return n ? `Le courrier (${n})` : 'Le courrier'; }},
    {id:'gazette', zone:GAZETTE_GS, calques:[sousZone('grandesalle-gazette-D', 'b', [30, 1160, 530, 1430], GAZETTE_GS)], plaque:'g', anim:'bascule', nom:'La Gazette', act:'scPresse'},
    {id:'almanach', zone:[2300, 1284, 3060, 1720], plaque:'d', anim:'bascule', nom:'Calendrier', vue:'calendrier', html:M_ => datesAlmanach(M_), htmlStyle:'left:0;top:0;width:100%;height:100%'},
  ]},
  hall:{fond:'scenes/chateau-fond', v:1, ratio:1536 / 1024, l:1024, h:1536, lanternes:[[327, 690, .55], [694, 690, .55], [58, 1170, .5]],
    tableaux:[[[73, 157], [153, 207], [154, 372], [72, 343]], [[870, 207], [952, 142], [953, 360], [870, 392]]], fantomes:2, objets:[
    {id:'escalier', zone:ESC_CH, calques:[sousZone('chateau-banniere-gris-A', 'fixe gris', BAN_CH, ESC_CH), ['scenes/chateau-escalier-E', 'b'], sousZone('chateau-banniere-gris-E', 'b gris', BAN_CH, ESC_CH)],
      anim:'bascule', vivant:2, nom:'Les bureaux', vue:'bureaux'},
    {id:'salle', zone:[725, 530, 1000, 975], calques:[['scenes/chateau-salle-C', 'b']], plaque:'d', anim:'bascule', nom:'La grande salle', vue:'grandesalle'},
    {id:'soussol', zone:[0, 960, 320, 1360], calques:[['scenes/chateau-soussol-D', 'b']], plaque:'g', anim:'bascule', vivant:1, nom:'Le sous-sol', vue:'soussol'},
    {id:'infirmerie', zone:[62, 635, 292, 960], calques:[['scenes/chateau-infirmerie-B', 'b']], plaque:'g', anim:'bascule', nom:'L\'infirmerie', act:'batiment', args:{b:'infirmerie'}},   // après le sous-sol : son étiquette passe au-dessus
  ]},
  /* v139 : le stade, accueil du jeu (panorama : glisser au doigt) ; grille → entrée, échoppe → Bazar, tente → buvette, tableau des scores →
     préparer le match ou semaine suivante (le prochain match y est écrit), tunnel → vestiaire, portail du château → hall ;
     tissus blanc et gris teints aux couleurs du club ; le vif d'or passe derrière les perches des anneaux */
  accueil:{fond:'scenes/stade-fond', v:3, ratio:1800 / 3072, l:3072, h:1800, pano:true, avant:'scenes/stade-avant', vif:'stade',
    ciel:'scenes/stade-ciel', cielH:1000, lanternes:[[1682, 1219, .45], [1894, 1219, .45], [2567, 1122, .6], [2924, 1122, .6]], objets:[
    {id:'grille', zone:[0, 750, 372, 1252], anim:'fixe', plaque:'g', nom:'Entrée du stade', vue:'entree'},
    {id:'fanions', zone:[1100, 985, 2480, 1082], decor:true, calques:[['scenes/stade-fanions-gris-A', 'fixe gris']]},
    {id:'echoppe', zone:ECHOPPE_ST, calques:[['scenes/stade-echoppe-gris-A', 'fixe gris'], ['scenes/stade-echoppe-E', 'b'], ['scenes/stade-echoppe-gris-E', 'b gris']],
      anim:'bascule', vivant:1, nom:'Le Bazar', vue:'boutique'},
    {id:'tente', zone:TENTE_ST, calques:[['scenes/stade-tente-gris-A', 'fixe gris'], sousZone('stade-chopes-D', 'b', CHOPES_ST, TENTE_ST), sousZone('stade-chopes-gris-D', 'b gris', CHOPES_ST, TENTE_ST)],
      anim:'bascule', vivant:2, nom:'La buvette', vue:'buvette'},
    {id:'tableau', zone:[1169, 296, 2231, 696], anim:'tableau', nom:M_ => afficheStade(M_).a.replace(' ›', ''), actF:actionStade,
      textes:[[M_ => afficheStade(M_).h, 'left:12%;top:41%;width:76%;height:9%', 'sc-tab sc-tab-p', [3, 110]],
              [M_ => afficheStade(M_).t, 'left:12%;top:51%;width:76%;height:17%', 'sc-tab', [6.5, 115]],
              [M_ => afficheStade(M_).a, 'left:12%;top:69%;width:76%;height:8%', 'sc-tab sc-tab-a', [2.8, 100]],
              [M_ => dernierStade(M_), 'left:12%;top:78%;width:76%;height:7%', 'sc-tab sc-tab-p', [2.4, 120]]]},
    {id:'tunnel', zone:[1600, 1100, 2056, 1380], calques:[['scenes/stade-tunnel-C', 'b']], anim:'bascule', nom:'Le vestiaire', vue:'equipe'},
    {id:'portail', zone:[2525, 895, 2975, 1350], calques:[['scenes/stade-portail-B', 'b']], anim:'bascule', plaque:'d', nom:'Le château', vue:'hall'},   // v143 : vers le hall du château
  ]},
  /* v134 : l'entrée du stade, images A (repos), B (la gobeline tend un billet), C (les chopes trinquent) ; la tente blanc et gris est teinte aux
     couleurs du club ; le prix des places s'écrit sur le panneau ; le vif d'or vole derrière la grille et les piliers (avant : premier plan détouré
     d'après Qwen-Image-Layered) ; « vivant » : la gobeline et l'enseigne s'animent d'elles-mêmes de temps en temps */
  entree:{fond:'scenes/entree-fond', v:6, ratio:1536 / 1024, l:1024, h:1536, avant:'scenes/entree-avant', vif:true,
    ciel:'scenes/entree-ciel', cielH:720, lanternes:[[133, 305], [892, 305]], lumieres:[[56, 735, 193, 946, .45]], objets:[
    {id:'pelouse', zone:[322, 470, 724, 1028], anim:'fixe', nom:'Le stade', vue:'accueil'},
    {id:'panneau', zone:[62, 503, 232, 646], anim:'fixe', muet:true, nom:'Prix des places', act:'scBillet',
      textes:[[() => 'La place', 'left:14%;top:24%;width:72%;height:18%', 'sc-grave sc-pt'], [(M_, c) => eurT(c.prix), 'left:8%;top:44%;width:84%;height:38%', 'sc-grave', [3.4, 22]]]},
    {id:'gobeline', zone:[12, 760, 238, 978], calques:[['scenes/entree-gobeline-B', 'b']], plaque:'g', anim:'bascule', vivant:1, nom:'Billetterie', act:'scBillet'},
    {id:'plan', zone:[829, 630, 988, 928], plaque:'d', anim:'lueur', nom:'Tribunes', vue:'stade'},
    {id:'tente', zone:TENTE, calques:[['scenes/entree-tente-gris-A', 'fixe gris'], sousZone('entree-chopes-C', 'b', CHOPES_Z, TENTE), sousZone('entree-chopes-gris-C', 'b gris', CHOPES_Z, TENTE)],
      plaque:'d', anim:'bascule', vivant:2, nom:'La buvette', vue:'buvette'},
  ]},
  /* v132 : la Fédération (compétitions) : les quatre bannières des championnats (Avalon, Circé, Yggdrasil, Walpurgis), la coupe, le globe ;
     toute la salle s'anime d'un coup (image B entière, posée sur chaque objet à sa place) */
  federation:{fond:'scenes/federation-fond', ratio:1536 / 1024, l:1024, h:1536, objets:[
    ...[['bi', [135, 210, 300, 700], 'g'], ['la', [325, 210, 495, 700]], ['sc', [530, 210, 700, 700]], ['ce', [735, 210, 905, 700], 'd']].map(([lg, z, pl]) =>
      ({id:'ban-' + lg, zone:z, calques:[salleB('federation-tout-B', z)], plaque:pl, anim:'bascule', act:'scLigue', args:{lg}, nom:M_ => M_.ligues[lg] ? M_.ligues[lg].nom : 'Championnat', si:M_ => !!M_.ligues[lg]})),
    {id:'coupe', zone:[375, 545, 665, 1045], calques:[salleB('federation-tout-B', [375, 545, 665, 1045])], anim:'bascule', act:'scCoupe', nom:() => window.QME ? window.QME.NOM : 'Palmarès'},
    {id:'globe', zone:[665, 800, 1024, 1536], calques:[salleB('federation-tout-B', [665, 800, 1024, 1536])], plaque:'d', anim:'bascule', act:'scLigue', args:{lg:'sixn'}, nom:'Sélections nationales'},
  ]},
};
/* l'ardoise : les produits en rayon, trois par page ; ardoiseDefile() fait passer les pages (l'éponge efface, puis la page suivante s'écrit) */
const NOMS_ARDOISE = {echarpe:'Écharpes', maillot:'Maillots', peluche:'Vifs d\'or en peluche', balai:'Balais miniatures', chapeau:'Chapeaux pointus', fanion:'Fanions',
  edition:'Éditions spéciales', echarpe2:'Écharpes magiques', choco:'Vifs d\'or en chocolat'};
function ardoiseHTML(c){
  const d = c.dom || {produits:{}}, L = D.PRODUITS.filter(p => d.produits[p[0]] && d.produits[p[0]].actif && (!p[4] || B.a(c, p[4])));
  if (!L.length) return '<div class="ard-page on"><p class="ard-n">Rayons vides</p><p class="ard-p">Bientôt !</p></div>';
  const pages = []; for (let i = 0; i < L.length; i += 3) pages.push(L.slice(i, i + 3));
  return pages.map((P, k) => `<div class="ard-page${k ? '' : ' on'}">${P.map(p => { const st = d.produits[p[0]];
    return `<p class="ard-n">${esc(NOMS_ARDOISE[p[0]] || p[1])}</p><p class="ard-p">${esc(eurT(p[3] * B.PRIX[st.prix].p))}${st.prix === 'bas' ? ' <span class="ard-promo">promo !</span>' : ''}</p>`; }).join('')}</div>`).join('');
}
function ardoiseDefile(){
  clearInterval(ardoiseDefile.t);
  ardoiseDefile.t = setInterval(() => {
    const ob = document.querySelector('.sc-obj[data-o="ardoise"]'); if (!ob){ clearInterval(ardoiseDefile.t); return; }
    const P = [...ob.querySelectorAll('.ard-page')]; if (P.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ob.classList.add('efface');
    setTimeout(() => { const i = P.findIndex(x => x.classList.contains('on')); P[i].classList.remove('on'); P[(i + 1) % P.length].classList.add('on'); }, 550);
    setTimeout(() => ob.classList.remove('efface'), 1000);
  }, 4800);
}
Z.ardoiseDefile = ardoiseDefile;
const SC_OK = {};
function sceneDispo(l){
  if (!SCENES[l]) return false;
  if (SC_OK[l] === undefined){ SC_OK[l] = false; const im = new Image(); im.onload = () => { SC_OK[l] = true; if (U.vue === l) rendre(); }; im.src = V.IMAGES + SCENES[l].fond + '.webp?v=' + (SCENES[l].v || 1); }
  return SC_OK[l];
}
function sceneHTML(l){
  const S = SCENES[l], M_ = M(), c = moi(), src = k => `${V.IMAGES}${k}.webp?v=${S.v || 1}`;   // v123 : version de la scène dans l'adresse (les images sont gardées en cache : une scène refaite sous les mêmes noms doit changer de v)
  const obj = o => {
    const corps = o.portrait ? `<span class="sc-toile${o.portrait.miroir ? ' miroir' : ''}" style="transform:rotate(${o.portrait.angle || 0}deg)">${avatarMgr('sc-av')}</span>`
      : `${o.img ? `<img class="sc-base"${o.club ? ' data-prod="scene"' : ''} src="${src(o.img)}" alt="" draggable="false">` : ''}${(o.calques || []).map(([k, cl, st]) => `<img class="sc-c ${cl}"${o.club && /-seule$/.test(k) ? ` data-prod="scene:${k}"` : / gris$/.test(cl) ? ` data-prod="gris:${k}"` : ''} src="${src(k)}" alt="" draggable="false"${st ? ` style="${st}"` : ''}>`).join('')}`;
    const vars = o.vars ? Object.entries(o.vars(M_, c)).map(([k, v]) => `;${k}:${v}`).join('') : '';
    /* taille = [corps max, largeur en cqw × caractères] : le texte rétrécit pour tenir */
    const textes = (o.textes || []).map(([fn, st, cl, taille]) => { const t = String(fn(M_, c)), fs = taille ? `;font-size:calc(${Math.min(taille[0], taille[1] / Math.max(1, t.length)).toFixed(2)}cqw * var(--k))` : '';
      return `<span class="sc-txt ${cl || ''}" style="${st}${fs}">${esc(t)}</span>`; }).join('');
    const nom = typeof o.nom === 'function' ? o.nom(M_, c) : o.nom;
    const pos = o.zone ? `left:${o.zone[0] / S.l * 100}%;top:${o.zone[1] / S.h * 100}%;width:${(o.zone[2] - o.zone[0]) / S.l * 100}%;height:${(o.zone[3] - o.zone[1]) / S.h * 100}%`
      : `left:${o.x}%;top:${o.y}%;width:${o.w}%`;
    const html = o.html ? `<div class="sc-html" style="${o.htmlStyle || ''}">${o.html(M_, c)}</div>` : '';
    if (o.decor) return `<div class="sc-obj sc-zone sc-decor" style="${pos}" aria-hidden="true">${corps}${html}</div>`;   // v140 : un décor peut porter du HTML (le blason)
    return `<button class="sc-obj sc-${o.anim}${o.zone ? ' sc-zone' : ''}${o.vivant ? ' sc-vivant v' + o.vivant : ''}" data-act="scObjet" data-l="${l}" data-o="${o.id}" style="${pos}${vars}" aria-label="${esc(nom)}">${corps}${html}${textes}${o.muet ? '' : `<span class="sc-plaque${o.plaque ? ' ' + o.plaque : ''}">${esc(nom)}</span>`}</button>`;
  };
  const avant = (S.vif ? (typeof S.vif === 'string' ? VIF.replace('class="sc-vif"', `class="sc-vif ${S.vif}"`) : VIF) : '') + (S.avant ? `<img class="sc-avant" src="${src(S.avant)}" alt="" draggable="false">` : '');   // v134
  /* v136 : la brume ne passe qu'à travers le masque du ciel ; lueur des lanternes (v138 : le mode soir et nuit est retiré, toujours le jour) */
  const masque = S.ciel ? `url(${src(S.ciel)})` : '';
  const ciel = S.ciel ? `<div class="sc-ciel${S.nuit ? ' nuit' : ''}" aria-hidden="true" style="height:${(S.cielH / S.h * 100).toFixed(3)}%;-webkit-mask-image:${masque};mask-image:${masque}">${S.nuit ? etoilesHTML(S) : ''}${S.nuages ? `<i class="sc-nuages" style="background-image:url(${src(S.nuages)})"></i>` : ''}<i class="sc-brume a" style="background-image:url(${src('scenes/brume')})"></i><i class="sc-brume b" style="background-image:url(${src('scenes/brume')})"></i></div>` : '';
  const apres = tableauxHTML(S, src) + portraitsHTML(S, src) + raisHTML(S, src) + (S.fantomes ? fantomesHTML(S.fantomes) : '') + (S.lanternes || []).map(([x, y, t, ty, co], k) => `<i class="sc-lanterne l${k % 2}${ty ? ' ' + ty : ''}" aria-hidden="true" style="left:${(x / S.l * 100).toFixed(2)}%;top:${(y / S.h * 100).toFixed(2)}%${t ? ';--t:' + t : ''}${co ? ';--c:' + co : ''}${ty && ty !== 'lune' ? `;animation-delay:-${(k * .73).toFixed(2)}s` : ''}"></i>`).join('')
    + (S.rayons || []).map(([x0, y0, x1, y1, poly]) => `<i class="sc-rayon" aria-hidden="true" style="left:${(x0 / S.l * 100).toFixed(2)}%;top:${(y0 / S.h * 100).toFixed(2)}%;width:${((x1 - x0) / S.l * 100).toFixed(2)}%;height:${((y1 - y0) / S.h * 100).toFixed(2)}%;--poly:polygon(${poly})"><b class="sc-flou"><i class="sc-faisceau"></i></b><i class="sc-grains"><i class="sc-poussiere"></i></i></i>`).join('')   // v148
    + (S.lumieres || []).map(([x0, y0, x1, y1, o]) => `<i class="sc-lumiere" aria-hidden="true" style="left:${(x0 / S.l * 100).toFixed(2)}%;top:${(y0 / S.h * 100).toFixed(2)}%;width:${((x1 - x0) / S.l * 100).toFixed(2)}%;height:${((y1 - y0) / S.h * 100).toFixed(2)}%;--o:${o}"></i>`).join('');   // v137
  const flottantes = (S.flottantes || []).map(([x, y, t], k) => `<i class="sc-cierge" aria-hidden="true" style="left:${(x / S.l * 100).toFixed(2)}%;top:${(y / S.h * 100).toFixed(2)}%;--s:${t};--d:${(6 + (k * 1.37) % 4).toFixed(2)}s;animation-delay:-${(k * .9).toFixed(1)}s"></i>`).join('');   // v149
  const sc = `<div class="scene${S.pano ? ' pano' : ''}" style="aspect-ratio:${1 / S.ratio}${S.pano ? ';--pr:' + (1 / S.ratio).toFixed(4) : ''}"><img class="sc-fond" src="${src(S.fond)}" alt="" draggable="false">${ciel}${avant}${S.objets.filter(o => !o.si || o.si(M_, c)).map(obj).join('')}${apres}${flottantes}</div>`;
  /* v139 : panorama : défilement latéral au doigt, sans flèches ; il s'ouvre au centre (ou là où on l'avait laissé) */
  return (S.pano ? `<div class="sc-pano" data-l="${l}">${sc}</div>` : sc) + `<p class="petit mut sc-aide">${S.pano ? `<span class="pano-tel">Fais glisser l'image pour voir ${S.panoNom || 'tout le stade'}. </span>Touche un objet pour y aller.` : 'Touche un objet de la pièce.'}</p>`;
}
/* au toucher : l'animation joue une fois, puis le sous-menu s'ouvre */
ACT.scObjet = (d, b) => {
  const o = (SCENES[d.l] || {objets:[]}).objets.find(x => x.id === d.o); if (!o) return;
  const el = b || document.querySelector(`.sc-obj[data-o="${d.o}"]`), calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (el && !calme){ el.classList.remove('joue'); void el.offsetWidth; el.classList.add('joue'); clearTimeout(el._joue); el._joue = setTimeout(() => el.classList.remove('joue'), 1700); }   // v119 : l'objet revient au repos (le coffre se referme)
  const act = o.actF ? o.actF(M()) : o.act;   // v139 : action qui dépend du moment (le tableau des scores)
  setTimeout(() => { if (o.vue){ fermerFeuille(); aller(o.vue); } else if (ACT[act]) ACT[act]({...d, ...(o.args || {})}); }, calme ? 0 : 520);
};
const humeurPresident = mg => mg.confiance >= 70 ? 'Le président est ravi.' : mg.confiance >= 45 ? 'Le président est serein.' : mg.confiance >= 25 ? 'Le président s\'impatiente.' : 'Le président doute sérieusement de toi.';
ACT.scConfiance = () => { const M_ = M(), mg = M_.manager, c = moi(), o = mg.objectif, CL = window.QM.classement(M_, c.ligue), pos = CL.findIndex(r => r.id === c.id) + 1;
  feuille(`${teteF('Confiance du président', esc(c.nom))}<p style="margin:0 0 6px"><b>${esc(o.txt)}</b></p><p class="petit mut" style="margin:0 0 10px">Aujourd'hui : ${pos}${pos === 1 ? 'er' : 'e'} de la ${esc(M_.ligues[c.ligue].nom)}.</p>
    <div class="ligne"><span style="flex:1">Confiance</span><b>${Math.round(mg.confiance)} %</b></div>${jauge(mg.confiance, 'Confiance du président')}
    <p class="petit mut" style="margin:8px 0 0">${humeurPresident(mg)} Il juge chaque résultat selon la force de l'adversaire.</p>`); };
ACT.scSupporters = () => { const c = moi(), s = c.dom ? Math.round(c.dom.supp) : 60;
  feuille(`${teteF('Supporters', esc(c.nom))}<div class="ligne"><span style="flex:1">Humeur des supporters</span><b>${s} / 100</b></div>${jauge(s, 'Humeur des supporters')}
    <p class="petit mut" style="margin:8px 0 12px">Les supporters suivent les résultats, le prix des places et les bonnes affaires du Bazar.</p>
    <div class="btns"><button class="btn sec" data-act="vue" data-v="stade">Stade et prix des places</button><button class="btn sec" data-act="vue" data-v="boutique">Le Bazar</button></div>`); };
ACT.scPresse = () => { const mg = M().manager, r = mg.presse ?? 50;
  feuille(`${teteF('Presse', 'La Gazette du sorcier')}<div class="ligne"><span style="flex:1">Relation avec la presse</span><b>${r} / 100</b></div>${jauge(r, 'Relation avec la presse')}
    <p class="petit mut" style="margin:8px 0 12px">Les conférences d'après-match la font bouger ; une bonne relation amplifie ce que la presse rapporte de toi.</p>
    <button class="btn sec plein" data-act="scArticles">Lire les articles</button>`); };
ACT.scArticles = () => { U.boiteF = 'presse'; fermerFeuille(); aller('boite'); };
ACT.scPortrait = () => { const M_ = M(), mg = M_.manager, p = G() ? G().profil(M_) : null, ct = p && p.contrat;
  feuille(`${teteF(esc(mg.nom), `Réputation ${Math.round(mg.rep)} / 100`, avatarMgr(''))}
    ${ct ? `<div class="stat" style="grid-template-columns:1fr auto"><span style="text-align:left;font-weight:400">Salaire</span><b>${eur(ct.sal)} / semaine</b><span style="text-align:left;font-weight:400">Fin du contrat</span><b>${lab(ct.fin)}</b><span style="text-align:left;font-weight:400">Arrivé en</span><b>${lab(ct.debut)}</b></div>` : ''}
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="vue" data-v="profil">Mon profil</button><button class="btn sec" data-act="vue" data-v="carriere">Carrière</button></div>`); };
ACT.scReunion = () => { const M_ = M(), R = G() && G().reunion(M_);
  if (R && !R.fin){ fermerFeuille(); aller('reunion'); return; }
  feuille(`${teteF('Plan de la saison', esc(moi().nom))}${reunionCarte(M_, true) || '<p class="mut">Pas de réunion cette saison.</p>'}`); };
ACT.scFinances = () => { fermerFeuille(); aller('finances'); };

/* v121 : la page Équipe, le vestiaire illustré ; sans les images, une simple liste des écrans de l'équipe */
function vueEquipe(){
  const c = moi(), scene = sceneDispo('equipe');
  const liens = [['effectif', 'Effectif', 'Les joueurs, leurs notes et leur forme'], ['tactique', 'Tactique', 'Composition et consignes'], ['entrainement', 'Entraînement', 'Le programme de la semaine'],
    ['staff', 'Staff', 'Adjoints, préparateurs et soigneurs'], ['vestiaire', 'Vestiaire et mentorat', 'Ambiance, leaders, mentorat et balais']];
  VUE.innerHTML = `<div><h1 class="grand">L'équipe</h1><p class="sous">Le vestiaire · ${esc(c.nom)}</p></div>
  ${scene ? sceneHTML('equipe') : ''}
  <details class="sc-detail"${scene ? '' : ' open'}><summary>Tous les écrans de l'équipe</summary><div class="carte"><div class="liste">${liens.map(([v, n, x, act]) => `<button class="el" data-act="${act || 'vue'}" data-v="${v}"><div class="t"><b>${n}</b><span>${x}</span></div><span class="d mut">›</span></button>`).join('')}</div></div></details>`;
  if (scene) V.colorierProduits(VUE, c);   // v131 : les robes blanc et gris aux couleurs du club
}
/* v132 : le hall, le salon du manager, la Fédération : la pièce illustrée, et la liste des écrans en dessous (ou seule, sans les images) */
function vuePiece(l, titre, sous, resume, liens){
  const scene = sceneDispo(l);
  VUE.innerHTML = `<div><h1 class="grand">${titre}</h1><p class="sous">${sous}</p></div>
  ${scene ? sceneHTML(l) : ''}
  <details class="sc-detail"${scene ? '' : ' open'}><summary>${resume}</summary><div class="carte"><div class="liste">${liens.map(([v, n, x, act, b]) => `<button class="el" data-act="${act || 'vue'}" data-v="${v}"${b ? ` data-b="${b}"` : ''}><div class="t"><b>${n}</b><span>${x}</span></div><span class="d mut">›</span></button>`).join('')}</div></div></details>`;
}
function vueHall(){   // v143 : le hall du château
  const c = moi(), n = nonLus();
  vuePiece('hall', 'Le hall du château', `${esc(c.nom)}${n ? ` · ${plur(n, 'message')} non lu${n > 1 ? 's' : ''}` : ''}`, 'Toutes les portes du hall',
    [['bureaux', 'Les bureaux', 'À l\'étage : le manager, le président, le recrutement, les jeunes'], ['grandesalle', 'La grande salle', 'Fédération, Gazette, courrier, classements'],
     ['', 'L\'infirmerie', 'Les blessés et les soins', 'batiment', 'infirmerie'], ['soussol', 'Le sous-sol', 'Les potions'], ['accueil', 'Le stade', 'Ressortir vers le terrain']]);
  if (sceneDispo('hall')) V.colorierProduits(VUE, c);   // la grande bannière aux couleurs du club
}
/* v143 : les pièces derrière le hall, en attendant leurs scènes */
function vueBureaux(){
  vuePiece('bureaux', 'Les bureaux', 'À l\'étage du château', 'Les portes du couloir',
    [['salon', 'Mon bureau', 'Le manager : profil, carrière, trophées'], ['direction', 'Bureau du président', 'Confiance, objectifs, finances'],
     ['recrutement', 'Bureau du recrutement', 'Joueurs suivis, mercato, staff'], ['formation', 'La salle des jeunes', 'Le pensionnat et ses espoirs'], ['hall', 'Redescendre', 'Le hall du château']]);
}
function vueGrandeSalle(){
  const n = nonLus();
  vuePiece('grandesalle', 'La grande salle', 'Compétitions, presse et courrier', 'Les tables de la grande salle',
    [['federation', 'La Fédération', 'Championnats, coupes et sélections'], ['', 'La Gazette', 'La presse et les rumeurs', 'scPresse'], ['boite', 'Le courrier', n ? `${plur(n, 'message')} non lu${n > 1 ? 's' : ''}` : 'Messages, offres et rapports'],
     ['classements', 'Classements', 'Tous les championnats'], ['calendrier', 'Calendrier', 'Le mois et la saison'], ['hall', 'Retour au hall', 'Le hall du château']]);
}
function vueSoussol(){
  const c = moi(), B_ = window.QMB, apo = B_.a(c, 'apothicaire'), dispo = (M().tic || 0) - (c.dom ? c.dom.potion || -99 : -99) >= 4;
  vuePiece('soussol', 'Le sous-sol', apo ? `Apothicaire attitré · potion de forme ${dispo ? 'disponible (fiche du joueur)' : 'en préparation'}` : 'Chaudrons froids : il faut l\'apothicaire attitré (infirmerie niveau 5)', 'Les étagères du sous-sol',
    [['', 'L\'infirmerie', 'Le bâtiment, ses niveaux et l\'apothicaire', 'batiment', 'infirmerie'], ['effectif', 'L\'effectif', 'Donner la potion à un joueur (sa fiche)'], ['hall', 'Remonter', 'Le hall du château']]);
}
/* v133 : l'entrée du stade (grille, guichet de la gobeline et prix des places, plan du stade, pelouse, tente de la buvette) ;
   en attendant les images de ChatGPT, la liste des écrans du stade */
function vueEntree(){
  const c = moi(), B_ = window.QMB;
  vuePiece('entree', 'Entrée du stade', `${esc(c.nom)} · ${c.stade.toLocaleString('fr-FR')} places · ${eur(c.prix)} la place`, 'Tous les écrans du stade',
    [['accueil', 'Le stade', 'Le prochain match et les nouvelles'], ['', 'Billetterie', `Prix des places : ${eur(c.prix)}`, 'scBillet'], ['stade', 'Tribunes', 'Agrandir le stade, tribune par tribune'],
     ['buvette', 'La buvette', `${B_.carteActive(c).length} / ${B_.placesCarte(c)} à la carte · Taverne niveau ${C.niv(c, 'buvettes')}`]]);
  if (sceneDispo('entree')) V.colorierProduits(VUE, c);   // v134 : la tente blanc et gris aux couleurs du club
}
function vueSalon(){
  const mg = M().manager, c = mg.club ? club(mg.club) : null;
  vuePiece('salon', 'Mon salon', `${esc(mg.nom)}${c ? ' · ' + esc(c.nom) : ' · sans club'}`, 'Tous les écrans du salon',
    [['profil', 'Mon profil', 'Avatar, attributs, contrat'], ['carriere', 'Carrière', 'Offres de clubs et de fédérations, parcours'], ['clubs', 'Clubs d\'Europe', 'Tous les clubs et leurs effectifs'], ['boite', 'Boîte de réception', 'Messages, offres et rapports'], ...(c ? [['trophees', 'Salle des trophées', 'Vitrine, records, palmarès']] : [])]);
}
function vueFederation(){
  vuePiece('federation', 'La Fédération', `Saison ${lab(M().saison)} · championnats, coupe d'Europe et sélections`, 'Tous les classements',
    [['classements', 'Classements', 'Les quatre championnats, la coupe d\'Europe, les sélections']]);
}
ACT.scLigue = d => { U.ligue = d.lg || null; aller('classements'); };
ACT.scCoupe = () => { const Q = window.QME; if (Q && (Q.assurer(M()) || M().europe)){ U.ligue = 'eu'; aller('classements'); } else ACT.palmares(); };
ACT.scJeunes = () => { const e = document.getElementById('jeunes'); if (e) e.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); };
/* v122 : le bureau du recrutement illustré ; sans les images, la liste des écrans du recrutement */
function vueRecrutement(){
  const c = moi(), scene = sceneDispo('recrutement'), n = M().offres ? M().offres.length : 0;
  const liens = [['mercato', 'Mercato', 'Recherche, agents libres, suivis, offres et ventes'], ['clubs', 'Clubs et joueurs', 'Tous les clubs et leurs effectifs'], ['staff', 'Staff', 'Adjoints, préparateurs et soigneurs']];
  VUE.innerHTML = `<div><h1 class="grand">Le recrutement</h1><p class="sous">${esc(c.nom)}${n ? ` · ${n} offre${n > 1 ? 's' : ''} en attente` : ''}</p></div>
  ${scene ? sceneHTML('recrutement') : ''}
  <details class="sc-detail"${scene ? '' : ' open'}><summary>Tous les écrans du recrutement</summary><div class="carte"><div class="liste">${liens.map(([v, nm, x]) => `<button class="el" data-act="vue" data-v="${v}"><div class="t"><b>${nm}</b><span>${x}</span></div><span class="d mut">›</span></button>`).join('')}</div></div></details>`;
}
/* ============================== v127 : progression des joueurs et entraînement individuel ============================== */
const NOMS_FOCUS = F => !F ? 'Aucun' : F.t === 'cap' ? ((G().CAPACITES.find(x => x[0] === F.k) || [])[1] || F.k) : F.t === 'role' ? 'Rôle : ' + ((D.ROLES[F.p] || []).find(x => x[0] === F.k) || [0, F.k])[1].toLowerCase() : 'Nouveau poste : ' + D.POSTES[F.k].nom.toLowerCase();
function courbe(L){
  if (!L || L.length < 2) return '<span class="mut petit">—</span>';
  const mn = Math.min(...L) - 1, mx = Math.max(...L) + 1, w = 72, h = 22, pts = L.map((v, i) => `${(i / (L.length - 1) * w).toFixed(1)},${(h - (v - mn) / (mx - mn) * h).toFixed(1)}`).join(' ');
  const d = L[L.length - 1] - L[0];
  return `<svg class="courbe" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${d > 0 ? 'var(--bon)' : d < 0 ? 'var(--mauvais)' : 'var(--ink-faint)'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function vueProgression(){
  const M_ = M(), c = moi(), Gm = G(), nb = Gm.bonusFocus(c), pris = c.effectif.filter(id => Gm.focusDe(M_.joueurs[id] || {}).length > 1).length;
  const C = c.courbes && c.courbes.saison === M_.saison ? c.courbes.n : {};
  const L = c.effectif.map(id => M_.joueurs[id]).filter(Boolean).sort((a, b) => 'PBAG'.indexOf(a.poste) - 'PBAG'.indexOf(b.poste) || QM_().note(b, b.poste) - QM_().note(a, a.poste));
  VUE.innerHTML = `<div><h1 class="grand">Progression des joueurs</h1><p class="sous">Un focus par joueur · focus bonus ${pris} / ${nb} (Aire d'envol niveau ${C_().niv(c, 'aire')})</p></div>
  <div class="carte"><div class="liste">${L.map(j => { const F = Gm.focusDe(j), n = QM_().note(j, j.poste), cb = C[j.id], d = cb && cb.length > 1 ? Math.round((cb[cb.length - 1] - cb[0]) * 10) / 10 : 0;
    return `<button class="el" data-act="focusJ" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))} <span class="mut">${j.age} ans</span></b>
      <span>${F.length ? F.map(x => `<span class="badge${x.t === 'poste' ? ' tit' : ''}">${esc(NOMS_FOCUS({...x, p:j.poste}))}</span>`).join(' ') : '<span class="mut">Aucun focus</span>'}${j.reconv ? ` · ${j.reconv.sem} / ${Gm.SEM_POSTE} sem.` : ''}${j.bless ? ' · <span style="color:var(--mauvais)">blessé</span>' : ''}</span></div>
      <span class="d" style="display:flex;align-items:center;gap:8px">${courbe(cb)}<b style="min-width:2.2em;text-align:right">${n}</b><span class="petit" style="min-width:2.6em;color:${d > 0 ? 'var(--bon)' : d < 0 ? 'var(--mauvais)' : 'var(--ink-faint)'}">${d > 0 ? '+' : ''}${String(d).replace('.', ',')}</span></span></button>`; }).join('')}</div></div>
  <div class="carte aide"><h2>Repères</h2><p><b>Focus.</b> Les attributs choisis progressent bien plus vite (×1,8), les autres un peu moins (×0,9) ; chaque focus ajoute un peu de fatigue chaque semaine.</p>
    <p><b>Focus bonus.</b> Un deuxième focus pour certains joueurs : 1 place avec l'Aire d'envol au niveau 2, 2 au niveau 3, 3 au niveau 4, 5 au niveau 5.</p>
    <p><b>Nouveau poste.</b> Il faut une saison entière d'entraînement (${Gm.SEM_POSTE} semaines sans blessure) ; le joueur travaille déjà les attributs de son futur poste, puis il en change.</p>
    <p><b>Courbe.</b> La note au poste chaque semaine depuis le début de la saison.</p></div>`;
}
const QM_ = () => window.QM, C_ = () => window.QMC;
function ficheFocus(jid, msg){
  const M_ = M(), j = M_.joueurs[jid], Gm = G(), F = Gm.focusDe(j), c = moi();
  const choix = rang => { const cur = F[rang], on = x => cur && cur.t === x.t && cur.k === x.k ? ' on' : '';
    const L = [...Gm.CAPACITES.filter(x => j.poste === 'G' || (x[3] || []).length === 0).map(x => ({t:'cap', k:x[0], n:x[1]})),
      ...(D.ROLES[j.poste] || []).map(x => { const b = window.QM.badge ? window.QM.badge(j, j.poste, x[0]) : null; return {t:'role', k:x[0], n:'Rôle : ' + x[1].toLowerCase() + (b ? ` (badge ${b[1].toLowerCase()})` : '')}; }),   // v155 : badge actuel dans le rôle
      ...['P', 'B', 'A', 'G'].filter(p => p !== j.poste).map(p => ({t:'poste', k:p, n:'Devenir ' + D.POSTES[p].nom.toLowerCase()}))];
    return `<div class="chips" style="flex-wrap:wrap;overflow:visible">${rang === 0 || cur ? `<button class="chip${cur ? '' : ' on'}" data-act="focusPose" data-j="${jid}" data-r="${rang}" data-t="" data-k="">Aucun</button>` : ''}${L.map(x => `<button class="chip${on(x)}" data-act="focusPose" data-j="${jid}" data-r="${rang}" data-t="${x.t}" data-k="${x.k}">${esc(x.n)}</button>`).join('')}</div>`; };
  const nb = Gm.bonusFocus(c), pris = c.effectif.filter(id => id !== jid && Gm.focusDe(M_.joueurs[id] || {}).length > 1).length;
  feuille(`${teteF(esc(nomJ(j)), `${D.POSTES[j.poste].nom} · ${j.age} ans · note ${QM_().note(j, j.poste)}`, avatarDe(j))}
    ${msg ? `<p style="color:var(--mauvais);margin:0 0 8px">${esc(msg)}</p>` : ''}
    ${j.reconv ? `<p style="margin:0 0 8px">Apprend le poste de <b>${D.POSTES[j.reconv.p].nom.toLowerCase()}</b> : ${j.reconv.sem} / ${Gm.SEM_POSTE} semaines.</p>${jauge(j.reconv.sem / Gm.SEM_POSTE * 100, 'Nouveau poste', 'var(--accent)')}` : ''}
    <h4 class="sous-t">Focus principal</h4>${choix(0)}
    <h4 class="sous-t">Focus bonus <span class="mut petit" style="text-transform:none;letter-spacing:0">· ${Math.max(0, nb - pris)} place${nb - pris > 1 ? 's' : ''} libre${nb - pris > 1 ? 's' : ''} sur ${nb}</span></h4>${F[0] ? (F[1] || pris < nb ? choix(1) : `<p class="petit mut">Plus de place : ${nb ? 'monte l\'Aire d\'envol ou libère un autre joueur' : 'il faut l\'Aire d\'envol au niveau 2'}.</p>`) : '<p class="petit mut">Choisis d\'abord son focus principal.</p>'}
    <p class="petit mut" style="margin:10px 0 0">Changer de poste remet à zéro l'apprentissage d'un nouveau poste.</p>`);
}
window.QMX = {NOMS_FOCUS, courbe, courbes:() => { const c = moi(), M_ = M(); return c && c.courbes && c.courbes.saison === M_.saison ? c.courbes.n : {}; }};   // v161 : pour la fiche joueur
ACT.focusJ = d => ficheFocus(d.j);
ACT.focusPose = d => { const r = G().definirFocus(M(), d.j, +d.r, d.t ? {t:d.t, k:d.k} : null); if (r.ok){ sauver(); rendre(); } ficheFocus(d.j, r.ok ? '' : r.txt); };
function vueDirection(){
  const M_ = M(), mg = M_.manager, c = moi(), o = mg.objectif, p = G() ? G().profil(M_) : null, ct = p && p.contrat;
  const CL = window.QM.classement(M_, c.ligue), pos = CL.findIndex(r => r.id === c.id) + 1;
  const humeur = mg.confiance >= 70 ? 'Le président est ravi.' : mg.confiance >= 45 ? 'Le président est serein.' : mg.confiance >= 25 ? 'Le président s\'impatiente.' : 'Le président doute sérieusement de toi.';
  const scene = sceneDispo('direction');   // v116 : le bureau illustré, les cartes passent dessous (« Tout le bureau en détail »)
  VUE.innerHTML = `<div><h1 class="grand">Bureau du président</h1><p class="sous">Tour du directeur · ${esc(c.nom)}</p></div>
  ${scene ? sceneHTML('direction') + '<details class="sc-detail"><summary>Tout le bureau en détail</summary>' : ''}
  ${reunionCarte(M_)}
  <div class="cols"><div>
    <div class="carte"><h2>Objectif de la saison</h2><p style="margin:0 0 6px"><b>${esc(o.txt)}</b></p><p class="petit mut" style="margin:0 0 10px">Aujourd'hui : ${pos}${pos === 1 ? 'er' : 'e'} de la ${esc(M_.ligues[c.ligue].nom)}${mg.bilan ? ` · ${mg.bilan.g} V · ${mg.bilan.n} N · ${mg.bilan.p} D` : ''}.</p>
      <div class="ligne"><span style="flex:1">Confiance</span><b>${Math.round(mg.confiance)} %</b></div>${jauge(mg.confiance, 'Confiance du président')}
      <p class="petit mut" style="margin:8px 0 0">${humeur} Il juge chaque résultat selon la force de l'adversaire.</p>
      ${c.dom ? `<div class="sep"></div><div class="ligne"><span style="flex:1">Supporters</span><b>${Math.round(c.dom.supp)} / 100</b></div>${jauge(c.dom.supp, 'Humeur des supporters')}` : ''}
      <div class="sep"></div><div class="ligne"><span style="flex:1">Relation avec la presse</span><b>${mg.presse ?? 50} / 100</b></div>${jauge(mg.presse ?? 50, 'Relation avec la presse')}
      <p class="petit mut" style="margin:8px 0 0">Les conférences d'après-match la font bouger ; une bonne relation amplifie ce que la presse rapporte de toi.</p></div>
    <div class="carte"><h2>Finances <button data-act="vue" data-v="finances">Détail</button></h2>
      <div class="stat" style="grid-template-columns:1fr auto"><span style="text-align:left;font-weight:400">Solde</span><b style="color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</b>
      <span style="text-align:left;font-weight:400">Masse salariale</span><b>${eur(C.masse(M_, c))} / ${eur(c.masseMax)} par sem.</b>${c.enveloppe != null ? `<span style="text-align:left;font-weight:400">Enveloppe des transferts</span><b>${eur(c.enveloppe)}</b>` : ''}</div></div>
  </div><div>
    ${ct ? `<div class="carte"><h2>Ton contrat</h2><div class="stat" style="grid-template-columns:1fr auto">
      <span style="text-align:left;font-weight:400">Salaire</span><b>${eur(ct.sal)} / semaine</b>
      <span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(ct.fin)}</b>
      <span style="text-align:left;font-weight:400">Arrivé en</span><b>${lab(ct.debut)}</b></div>
      <p class="petit mut" style="margin:8px 0 0">En fin de contrat, le président prolonge si sa confiance tient (35 % au moins).</p></div>` : ''}
    <div class="carte"><h2>Réputation</h2><div class="ligne"><span style="flex:1">${esc(mg.nom)}</span><b>${Math.round(mg.rep)} / 100</b></div>${jauge(mg.rep, 'Réputation')}</div>
    <div class="liste carte">${[['profil', 'Mon profil', 'Avatar, attributs, parcours'], ['carriere', 'Carrière', 'Offres de clubs et de fédérations'], ['partenaires', 'Partenaires', 'Sponsor maillot et panneaux']].map(([v, n, s]) => `<button class="el" data-act="vue" data-v="${v}"><div class="t"><b>${n}</b><span>${s}</span></div><span class="d mut">›</span></button>`).join('')}</div>
  </div></div>${scene ? '</details>' : ''}`;
  if (scene) V.colorierProduits(VUE, c);   // l'écharpe aux couleurs du club (dessinée en rouge, bleu et jaune)
}

/* ============================== Profil du manager ============================== */
const LOOK = {
  peau:['#f7dccb', '#efc4a4', '#dca57f', '#bf8357', '#93603e', '#61402b'],
  cheveux:['#1e1b19', '#3b2a20', '#5b3c27', '#8a5a35', '#c9a161', '#e3c98f', '#a8482a', '#9b9b9b', '#cfcfcf'],
  coupe:[['court', 'Court'], ['rase', 'Rasé'], ['frange', 'Frange'], ['boucle', 'Bouclé'], ['long', 'Long'], ['carre', 'Carré'], ['queue', 'Queue'], ['chignon', 'Chignon'], ['crete', 'Crête'], ['chauve', 'Chauve']],
  barbe:[['', 'Aucune'], ['courte', 'Courte'], ['barbe', 'Barbe'], ['bouc', 'Bouc'], ['moustache', 'Moustache']],
  chapeau:[['', 'Aucun'], ['#4b2a7a', 'Violet'], ['#1f2430', 'Noir'], ['#2f6b3f', 'Vert'], ['#7a1f2b', 'Bordeaux']],
  sourire:[[0.3, 'Sourire'], [0.6, 'Sérieux'], [0.9, 'Rieur']],
};
const persoMgr = () => { const mg = M().manager, p = G() ? G().profil(M()) : null; return {id:'manager', p:(mg.nom || 'M').split(' ')[0], n:mg.nom, nat:p ? p.nat : 'FRA', age:p ? p.age : 40, look:p && p.look}; };
const avatarMgr = (cls) => avatarDe(persoMgr(), cls, M().manager.club || null);
Z.avatarMgr = avatarMgr; Z.sceneHTML = sceneHTML; Z.sceneDispo = sceneDispo;   // v117 : scènes utilisables par les écrans de qm27-ui.js (finances)
function vueProfil(){
  const M_ = M(), mg = M_.manager, Gm = G(), p = Gm.profil(M_), c = mg.club ? club(mg.club) : null, pool = p.pool || 0;
  const titres = M_.histo.filter(h => h.manager && h.manager.pos === 1).length;
  VUE.innerHTML = `<div class="tete-mg">${`<span class="avp g">${avatarMgr('g')}</span>`}<div style="min-width:0"><h1 class="grand">${esc(mg.nom)}</h1><p class="sous">${flag(p.nat)} ${p.age} ans · ${c ? esc(c.nom) : 'sans club'} · réputation ${Math.round(mg.rep)}</p>
    <button class="btn sec" data-act="editerProfil" style="margin-top:6px">Modifier le profil</button></div></div>
  <div class="cols"><div>
    <div class="carte"><h2>Attributs ${p.fige ? '' : `<span class="mut">${pool ? plur(pool, 'point') + ' à placer' : 'répartis tes points'}</span>`}</h2>
      ${p.fige ? '' : '<p class="petit mut" style="margin:0 0 8px">Avant ton premier match officiel, tu peux déplacer des points d\'un attribut à l\'autre. Ensuite, ils évoluent avec ta carrière.</p>'}
      <div class="attrs-mgr">${Gm.ATTR_MGR.map(([k, n, d]) => { const v = p.attrs[k];
        return `<div class="am"><div class="am-t"><b>${n}</b><span class="mut petit">${d}</span></div>
          ${p.fige ? '' : `<button class="mini-b" data-act="pointMgr" data-k="${k}" data-d="-1" aria-label="Retirer un point en ${n}" ${v <= 1 ? 'disabled' : ''}>−</button>`}
          <span class="note ${v >= 15 ? 'n4' : v >= 11 ? 'n3' : v >= 7 ? 'n2' : 'n1'}">${v}</span>
          ${p.fige ? '' : `<button class="mini-b" data-act="pointMgr" data-k="${k}" data-d="1" aria-label="Ajouter un point en ${n}" ${!pool || v >= 20 ? 'disabled' : ''}>+</button>`}</div>`; }).join('')}</div>
      <p class="petit mut" style="margin:10px 0 0">Effets légers, comme dans FM : ils comptent un peu chaque semaine. Ils progressent en fin de saison selon ce que tu as fait (causeries, transferts, jeunes lancés, résultats).</p></div>
  </div><div>
    ${p.contrat ? `<div class="carte"><h2>Contrat</h2><div class="stat" style="grid-template-columns:1fr auto"><span style="text-align:left;font-weight:400">Club</span><b>${esc(club(p.contrat.club).nom)}</b>
      <span style="text-align:left;font-weight:400">Salaire</span><b>${eur(p.contrat.sal)} / semaine</b><span style="text-align:left;font-weight:400">Fin</span><b>${lab(p.contrat.fin)}</b></div></div>` : ''}
    <div class="carte"><h2>Carrière <button data-act="vue" data-v="carriere">Offres</button></h2>
      <div class="stat" style="grid-template-columns:1fr auto"><span style="text-align:left;font-weight:400">Saisons terminées</span><b>${mg.saisons.length}</b>
      <span style="text-align:left;font-weight:400">Titres de champion</span><b>${titres}</b>
      <span style="text-align:left;font-weight:400">Clubs entraînés</span><b>${new Set((mg.postes || []).map(x => x.club)).size}</b></div>
      ${window.QMR && mg.prix && mg.prix.length ? `<h4 class="sous-t">Prix</h4>${window.QMR.palmaresHTML(mg.prix, esc)}` : ''}
      <div class="sep"></div><div class="liste">${(mg.postes || []).slice().reverse().map(x => `<div class="el">${blason(x.club, 'p')}<div class="t"><b>${esc(club(x.club).nom)}</b><span>${lab(x.debut)}${x.fin != null ? ' → ' + lab(x.fin) : ' → aujourd\'hui'}</span></div></div>`).join('')}</div></div>
  </div></div>`;
}
ACT.pointMgr = d => { const p = G().profil(M()); if (p.fige) return; p.pool = p.pool || 0; const k = d.k, v = p.attrs[k];
  if (+d.d < 0 && v > 1){ p.attrs[k]--; p.pool++; } else if (+d.d > 0 && p.pool > 0 && v < 20){ p.attrs[k]++; p.pool--; }
  sauver(); rendre(); };
let EDIT = null;
const PORTRAITS = () => ['hs', 'h3', 'h2', 'fs', 'f2'].flatMap(g => Array.from({length:V.VISAGES[g]}, (_, i) => g + '-' + i));   // v99 : portraits proposés au manager
function ficheProfil(){
  const p = G().profil(M()), mg = M().manager, L = EDIT.look;
  const nuancier = (cle, liste) => `<div class="nuancier">${liste.map(x => `<button class="pastille-c ${L[cle] === x ? 'on' : ''}" style="background:${x}" data-act="lookMgr" data-k="${cle}" data-v="${x}" aria-label="${cle} ${x}"></button>`).join('')}</div>`;
  const choix = (cle, liste) => `<div class="chips">${liste.map(([v, n]) => `<button class="chip ${String(L[cle] ?? '') === String(v) ? 'on' : ''}" data-act="lookMgr" data-k="${cle}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const perso = {...persoMgr(), nat:EDIT.nat, age:EDIT.age, look:L}, apercu = avatarDe(perso, 'g', mg.club || null), vis = V.visageDe(perso), illus = !!vis;
  feuille(`${teteF('Mon profil', 'Nom, âge, nationalité, apparence')}
    <div class="ligne" style="gap:14px;align-items:center"><span class="avp g">${apercu}</span><div style="flex:1;min-width:0">
      <label class="petit mut" for="nomEdit">Nom</label><input class="champ" id="nomEdit" maxlength="30" value="${esc(EDIT.nom)}">
      <div class="ligne" style="margin-top:8px;gap:8px"><span class="petit mut">Âge</span><button class="mini-b" data-act="ageMgr" data-d="-1">−</button><b>${EDIT.age}</b><button class="mini-b" data-act="ageMgr" data-d="1">+</button></div></div></div>
    <h4 class="sous-t">Nationalité</h4><div class="chips">${D.SELECTIONS.map(n => `<button class="chip ${EDIT.nat === n ? 'on' : ''}" data-act="natMgr" data-n="${n}">${flagSeul(n)} ${esc(nat(n).nom)}</button>`).join('')}</div>
    <h4 class="sous-t">Portrait</h4><div class="chips"><button class="chip ${illus ? 'on' : ''}" data-act="lookMgr" data-k="mode" data-v="illus">Portrait illustré</button><button class="chip ${illus ? '' : 'on'}" data-act="lookMgr" data-k="mode" data-v="dessin">Dessin personnalisé</button><button class="chip" data-act="lookMgr" data-k="hasard" data-v="1">Au hasard</button></div>
    ${illus ? `<div class="visages" role="group" aria-label="Choisir un portrait">${PORTRAITS().map(v => `<button class="${vis === v ? 'on' : ''}" data-act="lookMgr" data-k="visage" data-v="${v}" aria-label="Portrait ${v}"><img src="${V.IMAGES}visages/${v}.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : `
    <h4 class="sous-t">Peau</h4>${nuancier('peau', LOOK.peau)}
    <h4 class="sous-t">Cheveux</h4>${nuancier('cheveux', LOOK.cheveux)}${choix('coupe', LOOK.coupe)}
    <h4 class="sous-t">Barbe</h4>${choix('barbe', LOOK.barbe)}
    <h4 class="sous-t">Chapeau de sorcier</h4>${choix('chapeau', LOOK.chapeau)}
    <h4 class="sous-t">Expression et lunettes</h4>${choix('sourire', LOOK.sourire)}<div class="chips"><button class="chip ${L.lunettes ? 'on' : ''}" data-act="lookMgr" data-k="lunettes" data-v="${L.lunettes ? '' : '1'}">Lunettes</button></div>`}
    <div class="btns" style="margin-top:14px"><button class="btn sec" data-act="fermer">Annuler</button><button class="btn" data-act="sauverProfil">Enregistrer</button></div>`);
  const n = document.getElementById('nomEdit'); if (n) n.addEventListener('input', e => { EDIT.nom = e.target.value; });
}
ACT.editerProfil = () => { const p = G().profil(M()), mg = M().manager; EDIT = {nom:mg.nom, age:p.age, nat:p.nat, look:{...(p.look || {})}}; ficheProfil(); };
ACT.lookMgr = d => { const L = EDIT.look;
  if (d.k === 'mode'){ if (d.v === 'dessin'){ L.mode = 'dessin'; delete L.visage; } else L.mode = 'illus'; ficheProfil(); return; }
  if (d.k === 'visage'){ L.mode = 'illus'; L.visage = d.v; ficheProfil(); return; }
  if (d.k === 'hasard' && V.visageDe({...persoMgr(), look:L})){ const P = PORTRAITS(); EDIT.look = {...L, mode:'illus', visage:P[Math.random() * P.length | 0]}; ficheProfil(); return; }
  if (d.k === 'hasard'){ const r = Math.random; EDIT.look = {mode:'dessin', peau:LOOK.peau[r() * 6 | 0], cheveux:LOOK.cheveux[r() * 9 | 0], coupe:LOOK.coupe[r() * 10 | 0][0], barbe:LOOK.barbe[r() * 5 | 0][0], chapeau:r() < 0.4 ? LOOK.chapeau[1 + (r() * 4 | 0)][0] : '', sourire:LOOK.sourire[r() * 3 | 0][0], lunettes:r() < 0.3}; }
  else if (d.k === 'sourire') L.sourire = +d.v; else if (d.k === 'lunettes') L.lunettes = !!d.v; else L[d.k] = d.v;
  ficheProfil(); };
ACT.ageMgr = d => { EDIT.age = Math.max(28, Math.min(75, EDIT.age + +d.d)); ficheProfil(); };
ACT.natMgr = d => { EDIT.nat = d.n; ficheProfil(); };
ACT.sauverProfil = () => { G().modifierProfil(M(), {nom:EDIT.nom, age:EDIT.age, nat:EDIT.nat, look:EDIT.look}); EDIT = null; fermerFeuille(); sauver(); rendre(); toast('Profil enregistré'); };

/* ============================== Salle des trophées : vitrine, palmarès, records ============================== */
const ancienTrophees = VUES.trophees;
function lignesRecords(R){
  return `<div class="liste">${G().RECORDS.filter(([k]) => R[k] && (R[k].v || k !== 'affluence')).map(([k, nom, unite]) => { const x = R[k];
    return `<div class="el rec ${x.ancien ? 'ancien' : 'neuf'}"><div class="t"><b>${nom}</b><span>${esc(x.txt || '')}${x.saison ? ' · ' + esc(x.saison) : ''}</span></div><span class="d"><b>${k === 'affluence' ? x.v.toLocaleString('fr-FR') : x.v}${unite[0] === 'e' ? 'e' : ''}</b> <span class="mut petit">${unite[0] === 'e' ? unite.slice(2) : unite}</span></span></div>`; }).join('')}</div>`;
}
function vueTrophees(){
  const M_ = M(), c = moi(), o = U.troph || 'vitrine';
  const tabs = `<div class="onglets" role="tablist">${[['vitrine', 'Vitrine'], ['club', 'Records du club'], ['ligue', 'Records du championnat'], ['palmares', 'Palmarès']].map(([k, n]) => `<button role="tab" class="${o === k ? 'on' : ''}" data-act="troph" data-o="${k}" aria-selected="${o === k}">${n}</button>`).join('')}</div>`;
  if (o === 'vitrine' && ancienTrophees){ ancienTrophees(); VUE.querySelector('div').insertAdjacentHTML('afterend', tabs); return; }
  const R = G().records(M_);
  let corps = '';
  if (o === 'club') corps = `<div class="carte">${lignesRecords(R.clubs[c.id])}</div><p class="petit mut">Les records d'avant ton arrivée sont en gris. Le stade et l'affluence ne comptent que les matchs à domicile.</p>`;
  else if (o === 'ligue'){ const l = U.recLigue || c.ligue;
    corps = `<div class="seg">${Object.values(M_.ligues).map(L => `<button data-act="recLigue" data-l="${L.id}" class="${l === L.id ? 'on' : ''}">${esc(L.court)}</button>`).join('')}</div><div class="carte">${lignesRecords(R.ligues[l])}</div>`; }
  else { const H = M_.histo.slice().reverse();
    corps = `<div class="carte">${H.length ? `<div class="liste">${H.map(h => `<div class="el"><div class="t"><b>${esc(h.saison)}</b><span>${Object.values(h.champions || {}).map(id => esc(club(id).nom)).join(' · ')}${h.sixn ? ` · ${esc(D.TOURNOI.court)} : ${flagSeul(h.sixn)} ${esc(nat(h.sixn).nom)}` : ''}${h.ldn ? ` · ${esc(D.LDN.nom)} : ${flagSeul(h.ldn)} ${esc(nat(h.ldn).nom)}` : ''}${h.manager ? ` · toi : ${h.manager.pos}e avec ${esc(club(h.manager.club).nom)}` : ''}</span></div></div>`).join('')}</div>` : '<p class="mut" style="margin:0">Aucune saison terminée pour l\'instant.</p>'}</div>`; }
  VUE.innerHTML = `<div><h1 class="grand">Salle des trophées</h1><p class="sous">${esc(c.nom)}</p></div>${tabs}${corps}`;
}
ACT.troph = d => { U.troph = d.o; rendre(); };
ACT.recLigue = d => { U.recLigue = d.l; rendre(); };
ACT.palmares = () => { U.troph = 'palmares'; aller('trophees'); };

/* ============================== Boîte de réception ============================== */
const CAT = {pres:'Président', staff:'Staff', club:'Club', mercato:'Mercato', bless:'Infirmerie', sixn:'Sélections', carriere:'Carrière', presse:'Presse', formation:'Formation', prix:'Prix', europe:'Europe', bancs:'Bancs', info:'Divers'};
const ICO_MSG = {pres:'🏛️', staff:'🧙', club:'🏰', mercato:'🦉', bless:'✚', sixn:'🏆', carriere:'🧭', presse:'🗞️', formation:'🎓', prix:'🏅', europe:'💍', bancs:'🪑', info:'✉️'};
const VUE_MSG = {pres:'direction', staff:'staff', club:'club', mercato:'mercato', sixn:'selection', carriere:'carriere', presse:'presse', formation:'formation', prix:'trophees', europe:'classements', info:'boite'};   // v99 : icône illustrée par catégorie
const nonLus = () => (M() ? M().boite.filter(m => !m.lu).length : 0);
Z.nonLus = nonLus;
function vueBoite(){
  const M_ = M(), f = U.boiteF || 'tous';
  const L = M_.boite.filter(m => f === 'tous' || (f === 'nonlus' ? !m.lu : (m.type || 'info') === f));
  const types = [...new Set(M_.boite.map(m => m.type || 'info'))];
  VUE.innerHTML = `<div><h1 class="grand">Boîte de réception</h1><p class="sous">${plur(M_.boite.length, 'message')} · ${plur(nonLus(), 'non lu')}</p></div>
  <div class="chips filtres-boite">${[['tous', 'Tous'], ['nonlus', `Non lus${nonLus() ? ' (' + nonLus() + ')' : ''}`], ...types.map(t => [t, CAT[t] || t])].map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="boiteF" data-f="${k}">${n}</button>`).join('')}</div>
  <div class="btns" style="margin-bottom:10px"><button class="btn sec" data-act="toutLu" ${nonLus() ? '' : 'disabled'}>Tout marquer lu</button><button class="btn sec" data-act="supprLus" ${M_.boite.some(m => m.lu) ? '' : 'disabled'}>Supprimer les messages lus</button></div>
  <div class="carte"><div class="liste">${L.map(m => `<div class="el msg-l ${m.lu ? '' : 'neuf'}"><button class="msg-b" data-act="lireMsg" data-id="${m.id}"><span class="ico-msg" aria-hidden="true">${VUE_MSG[m.type || 'info'] ? icoVue(VUE_MSG[m.type || 'info'], ICO_MSG[m.type] || '✉️', 'ico-im') : (ICO_MSG[m.type] || '✉️')}</span><div class="t"><b>${pieces(esc(m.titre))}</b><span>${m.date ? fmtDate(m.date) + ' · ' : ''}${pieces(esc(String(m.corps).slice(0, 110)))}${String(m.corps).length > 110 ? '…' : ''}</span></div></button>
    <button class="mini-b corb" data-act="supprMsg" data-id="${m.id}" aria-label="Supprimer ce message">✕</button></div>`).join('') || '<p class="mut" style="margin:0">Rien ici.</p>'}</div></div>`;
}
const msgDe = id => M().boite.find(m => m.id === id);
ACT.boite = () => aller('boite');
ACT.boiteF = d => { U.boiteF = d.f; rendre(); };
ACT.lireMsg = d => { const m = msgDe(d.id); if (!m) return; m.lu = true; sauver();
  feuille(`${teteF(pieces(esc(m.titre)), `${m.date ? fmtDate(m.date, true) + ' · ' : ''}${CAT[m.type] || 'Message'}`)}<p style="white-space:pre-line;margin:0 0 14px">${pieces(esc(m.corps))}</p>
    <div class="btns"><button class="btn sec" data-act="nonLu" data-id="${m.id}">Marquer non lu</button><button class="btn sec" data-act="supprMsg" data-id="${m.id}" style="color:var(--mauvais)">Supprimer</button></div>`);
  if (Z.U.vue === 'boite' || Z.U.vue === 'accueil'){ const el = document.querySelector(`[data-act="lireMsg"][data-id="${d.id}"]`); if (el) el.closest('.msg-l, .msg') && el.closest('.msg-l, .msg').classList.remove('neuf'); }
};
ACT.nonLu = d => { const m = msgDe(d.id); if (m) m.lu = false; fermerFeuille(); sauver(); rendre(); };
ACT.supprMsg = d => { const M_ = M(); M_.boite = M_.boite.filter(m => m.id !== d.id); retirerFeuille(); sauver(); rendre(); };
ACT.toutLu = () => { for (const m of M().boite) m.lu = true; sauver(); rendre(); };
ACT.supprLus = () => { if (!confirm('Supprimer tous les messages lus ?')) return; const M_ = M(); M_.boite = M_.boite.filter(m => !m.lu); sauver(); rendre(); toast('Messages lus supprimés'); };

/* ============================== Menu Plus ============================== */
function vuePlus(){
  const M_ = M(), mg = M_.manager, n = nonLus();
  const el = (act, v, ico, t, s) => `<button class="el" data-act="${act}" ${v ? `data-v="${v}"` : ''}><span class="blason nat p">${String(ico)[0] !== '<' && ICONES.has(v || act) ? icoVue(v || act, ico) : ico}</span><div class="t"><b>${t}</b><span>${s}</span></div><span class="d mut">›</span></button>`;
  VUE.innerHTML = `<div><h1 class="grand">Plus</h1></div>
  <div class="carte"><div class="liste">
    ${el('vue', 'boite', '✉️', `Boîte de réception${n ? ` <span class="badge neuf">${n}</span>` : ''}`, plur(M_.boite.length, 'message'))}
    ${mg.club ? el('vue', 'calendrier', '📅', 'Calendrier', 'Mois, saison, mercatos, tournoi') : ''}
    ${el('vue', 'classements', '📊', 'Classements', `Les 4 championnats, les Anneaux et les sélections`)}
    ${el('vue', 'clubs', '🏰', 'Clubs et joueurs', 'Tous les effectifs, missions du recruteur')}
    ${mg.club ? el('vue', 'trophees', '🏆', 'Salle des trophées', 'Vitrine, records, palmarès') : el('palmares', '', '📜', 'Palmarès', 'Les champions des saisons passées')}
  </div></div>
  <div class="carte"><div class="liste">
    ${el('vue', 'profil', avatarMgr('mini'), 'Mon profil', `${esc(mg.nom)} · attributs, apparence`)}
    ${el('vue', 'carriere', '🧭', 'Carrière', `Réputation ${Math.round(mg.rep)} · offres, sélection, démission`)}
  </div></div>
  <div class="carte"><div class="liste">
    ${el('vue', 'sauvegardes', '💾', 'Sauvegardes', `Emplacement ${Z.EMP} · exporter, importer, entre appareils`)}
    ${el('vue', 'aide', '⚙️', 'Règles et réglages', 'Direct, causeries, presse, règles du jeu')}
    ${el('quitterKiosk', '', '⏏︎', 'Quitter vers KiosK', 'La partie est enregistrée')}
  </div></div>`;
}

/* ============================== Effectif en colonnes ============================== */
/* v92 : catalogue des colonnes [libellé court, largeur, description] et vues de l'effectif réglables (roue ⚙︎) */
const COLS = {note:['Note', 44, 'Note au poste'], pot:['Pot.', 40, 'Potentiel estimé (étoiles)'], forme:['Forme', 40, 'Forme sur 10'], moral:['Moral', 52, 'Moral sur 100'],
  fat:['Fatigue', 50, 'Fatigue du moment (au moins 60 % de la charge)'], charge:['Charge', 52, 'Fatigue cumulée : matchs enchaînés, entraînement ; redescend au repos'], bless:['Dispo', 44, 'Blessure (jours), suspension (matchs) ou sélection'], m:['MJ', 30, 'Matchs joués cette saison'], stat:['Stat', 50, 'Buts, cognards, vifs d\'or ou arrêts'],
  moy:['Moy.', 38, 'Note moyenne en match'], sal:['Salaire', 54, 'Salaire par semaine'], fin:['Fin', 46, 'Fin de contrat'], valeur:['Valeur', 58, 'Valeur estimée'],
  clause:['Clause', 58, 'Clause libératoire'], prog:['Prog.', 44, 'Progression de la note cette saison'], badge:['Badge', 46, 'Meilleur badge de rôle (bronze, argent, or) ; le rôle au survol']};   // v161
const VUES_DEF = [{id:'general', nom:'Général', cols:['note', 'badge', 'forme', 'moral']}, {id:'contrats', nom:'Contrats', cols:['sal', 'fin', 'valeur']},
  {id:'physique', nom:'Physique', cols:['fat', 'charge', 'forme', 'bless']}, {id:'saison', nom:'Saison', cols:['m', 'stat', 'moy']}];
const VUES_EFF = {scout:{nom:'Estimation', cols:['note', 'pot', 'valeur']}};
for (const v of VUES_DEF) VUES_EFF[v.id] = v;
const vuesPerso = () => { const L = LS.lire('qm27:vuesEff', null); return Array.isArray(L) && L.length ? L.filter(v => v && v.id && Array.isArray(v.cols)).map(v => v.id === 'physique' && v.cols.join() === 'fat,forme,bless' ? {...v, cols:['fat', 'charge', 'forme', 'bless']} : v) : VUES_DEF.map(v => ({...v, cols:v.cols.slice()})); };
const vueEff = id => vuesPerso().find(v => v.id === id) || VUES_EFF[id] || VUES_DEF[0];
const statut = (K, id) => { for (const p of ['P', 'B', 'A', 'G']) if (K[p].includes(id)) return ['T', 'tit', 'Titulaire']; const i = K.banc.indexOf(id); return i >= 0 ? ['R' + (i + 1), 'rem', 'Remplaçant ' + (i + 1)] : ['–', 'res', 'Réserve']; };
function valeurCol(j, k, ctx){
  const M_ = M(), s = j.saison || {};
  switch (k){
    case 'note': { const v = noteVue(j, j.poste); return [v.mid, `<span class="note ${classeNote(v.mid)}${v.exact ? '' : ' flou'}">${v.txt}</span>`]; }
    case 'forme': return [j.forme, `<span class="${j.forme >= 7 ? 'bon' : j.forme < 5 ? 'mauvais' : ''}">${(Math.round(j.forme * 10) / 10).toLocaleString('fr-FR')}</span>`];
    case 'moral': return [j.moral, Z.visageMoral ? `<span class="mor-c">${Z.visageMoral(j.moral, 18)}<span class="${j.moral >= 70 ? 'bon' : j.moral < 40 ? 'mauvais' : ''}">${Math.round(j.moral)}</span></span>` : `<span class="${j.moral >= 70 ? 'bon' : j.moral < 40 ? 'mauvais' : ''}">${Math.round(j.moral)}</span>`];   // v161 : visage
    case 'charge': { const v = Math.round(j.charge || 0); return [v, `<span class="${v >= 60 ? 'mauvais' : v >= 40 ? 'moyen' : ''}">${v}</span>`]; }
    case 'fat': return [j.fat, `<span class="${j.fat >= 60 ? 'mauvais' : j.fat >= 35 ? 'moyen' : ''}">${Math.round(j.fat)} %</span>`];
    case 'sal': return [j.contrat ? j.contrat.sal : 0, j.contrat ? eur(j.contrat.sal) : '—'];
    case 'fin': return [j.contrat ? j.contrat.fin : 0, j.contrat ? `<span class="${j.contrat.fin <= M_.saison ? 'mauvais' : ''}">${lab(j.contrat.fin).slice(2)}</span>` : '—'];
    case 'pot': { const v = C.potentielEstime(M_, j); return [v, `${v}<span class="etoiles petit">★</span>`]; }
    case 'badge': { const b = Z.meilleurBadge ? Z.meilleurBadge(j) : null; return [b ? Z.rangBadge(b[0]) * 10 + (b[0][3] ? 0 : 1) : 0, b ? Z.imgBadge(b[0], b[1], 24, `Badge ${b[0][1].toLowerCase()} : ${Z.roleNom(j.poste, b[1])}${b[0][3] ? ' (estimé)' : ''}`) : '<span class="mut">—</span>']; }   // v161
    case 'valeur': { const v = C.valeur(M_, j); return [v, eur(v)]; }
    case 'bless': return [j.bless ? j.bless.jours : j.susp ? j.susp.n * 7 : j.inter ? 0.5 : 0, j.bless ? `<span class="mauvais">${j.bless.jours} j</span>` : j.susp ? `<span class="mauvais" title="Suspendu : ${esc(j.susp.r)}">susp. ${j.susp.n}</span>` : j.inter ? '<span class="moyen" title="En sélection">✈︎</span>' : '—'];   // v158 : suspendus
    case 'm': return [s.m || 0, s.m || 0];
    case 'stat': { const v = j.poste === 'P' ? s.b : j.poste === 'B' ? s.cog : j.poste === 'A' ? s.v : s.arr; return [v || 0, `${v || 0}<span class="mut petit"> ${({P:'b', B:'cog', A:'vif', G:'arr'})[j.poste]}</span>`]; }
    case 'moy': { const v = s.m ? s.notes / s.m : 0; return [v, v ? (Math.round(v * 10) / 10).toLocaleString('fr-FR') : '—']; }
    case 'clause': { const v = j.contrat && j.contrat.clause || 0; return [v, v ? eur(v) : '—']; }
    case 'prog': { const c = j.club && club(j.club), v = c && c.progres ? c.progres[j.id] || 0 : 0; return [v, v ? `<span class="${v > 0 ? 'bon' : 'mauvais'}">${v > 0 ? '+' : ''}${(Math.round(v * 10) / 10).toLocaleString('fr-FR')}</span>` : '—']; }
  }
  return [0, ''];
}
/* tableau de joueurs : ctx = {vue:'general'…, tri, sens, liste, K (composition, pour le statut), autre (club adverse : notes estimées), act} */
function tableJoueurs(L, ctx){
  const cles = (ctx.cols || (VUES_EFF[ctx.vue] || VUES_DEF[0]).cols).filter(k => COLS[k]), CC = cles.map(k => [k, COLS[k][0], COLS[k][1], COLS[k][2]]);
  const tri = ctx.tri || 'poste', sens = ctx.sens || 1;
  /* v101 : colonne fixe des absents (croix rouge = blessé, avion = en sélection), triable */
  const absV = j => j.bless ? 1000 + (j.bless.jours || 0) : j.susp ? 500 + j.susp.n : j.inter ? 1 : 0;   // v158 : suspendus
  const rows = L.map(j => ({j, v:Object.assign(Object.fromEntries(cles.map(k => [k, valeurCol(j, k, ctx)])), {abs:[absV(j)]})}));
  const large = 40 + 20 + 34 + 150 + CC.reduce((t, c) => t + c[2] + 4, 0);
  const ord = {P:0, B:1, A:2, G:3};
  /* v95 : tri par composition — titulaires (poursuiveurs, batteurs, attrapeur, gardien), remplaçants R1-R5, réserve, absents */
  const rangSel = j => { const K = ctx.K; if (!K) return 99; let k = 0; for (const p of ['P', 'B', 'A', 'G']){ const i = K[p].indexOf(j.id); if (i >= 0) return k + i; k += K[p].length; }
    const i = K.banc.indexOf(j.id); return i >= 0 ? 20 + i : j.bless || j.inter || j.susp ? 60 + ord[j.poste] : 40 + ord[j.poste]; };
  rows.sort((a, b) => tri === 'sel' ? sens * (rangSel(a.j) - rangSel(b.j)) || (b.v.note ? b.v.note[0] - a.v.note[0] : window.QM.note(b.j) - window.QM.note(a.j)) : tri === 'poste' ? ord[a.j.poste] - ord[b.j.poste] || (b.v.note ? b.v.note[0] - a.v.note[0] : window.QM.note(b.j) - window.QM.note(a.j))
    : tri === 'nom' ? sens * a.j.n.localeCompare(b.j.n, 'fr') : tri === 'age' ? sens * (a.j.age - b.j.age) : tri === 'note' && !b.v.note ? sens * (window.QM.note(b.j) - window.QM.note(a.j)) : sens * ((b.v[tri] || [0])[0] - (a.v[tri] || [0])[0]));
  const th = (k, n, w, t) => `<button class="th ${tri === k ? 'on' : ''}" style="${w ? 'width:' + w + 'px' : ''}" data-act="${ctx.act || 'effTri'}" data-t="${k}"${t ? ` title="${esc(t)}"` : ''}>${n}${tri === k ? (sens > 0 ? ' ▾' : ' ▴') : ''}</button>`;
  return `<div class="tj" role="table" style="min-width:${large}px"><div class="tj-h" role="row">${th('poste', 'Poste', 40)}${th('abs', '✚', 20, 'Absents : blessés, suspendus et internationaux')}${th('nom', 'Joueur')}${th('age', 'Âge', 34)}${CC.map(([k, n, w, t]) => th(k, n, w, t)).join('')}</div>
    ${rows.map(({j, v}, i) => { const st = ctx.K ? statut(ctx.K, j.id) : null, U_ = moi();
      const grp = tri === 'sel' && ctx.K ? (r => r < 20 ? 'Titulaires' : r < 40 ? 'Remplaçants' : r < 60 ? 'Réserve' : 'Absents')(rangSel(j)) : null, grpAv = grp && i ? (r => r < 20 ? 'Titulaires' : r < 40 ? 'Remplaçants' : r < 60 ? 'Réserve' : 'Absents')(rangSel(rows[i - 1].j)) : null;
      return `${grp && grp !== grpAv ? `<div class="tj-grp" role="row">${grp}</div>` : ''}<button class="tj-l ${j.bless || j.inter || j.susp ? 'indispo' : ''}" role="row" data-act="joueur" data-j="${j.id}">
        <span style="width:40px" class="tj-p">${posteB(j.poste)}${st ? `<i class="st ${st[1]}" title="${st[2]}">${st[0]}</i>` : ''}</span>
        <span style="width:20px" class="tj-c tj-abs">${j.bless ? `<i class="abs-b" title="Blessé : ${esc(j.bless.nom)}, ${j.bless.jours} j" aria-label="Blessé ${j.bless.jours} jours">✚</i>` : j.susp ? `<i class="crt r" title="Suspendu : ${esc(j.susp.r)}, ${j.susp.n} match${j.susp.n > 1 ? 's' : ''}" aria-label="Suspendu">${j.susp.n}</i>` : j.inter ? '<i class="abs-i" title="En sélection" aria-label="En sélection">✈︎</i>' : ''}</span>
        <span class="tj-n">${flag(j.nat)}<b>${j.num != null && ctx.K ? `<span class="num">${j.num}</span>` : ''}${esc(j.p[0])}. ${esc(j.n)}</b>${j.pret ? '<i class="tag">prêt</i>' : ''}${U_ && U_.aVendre.includes(j.id) ? '<i class="tag">vente</i>' : ''}${!ctx.K && U_ && U_.suivi.includes(j.id) ? '<i class="tag or">suivi</i>' : ''}</span>
        <span style="width:34px" class="tj-c">${j.age}</span>
        ${CC.map(([k, , w]) => `<span class="tj-c" style="width:${w}px">${v[k][1]}</span>`).join('')}</button>`; }).join('') || '<p class="mut" style="padding:10px">Personne ici.</p>'}</div>`;
}
Z.tableJoueurs = tableJoueurs;
const EFF = Object.assign({vue:'general', tri:'poste', sens:1, poste:'tous'}, LS.lire('qm27:effectif', {}));
function vueEffectif(){
  const c = moi(), K = c.compo;
  let L = c.effectif.map(id => M().joueurs[id]).filter(Boolean);
  if (EFF.poste === 'bless') L = L.filter(j => j.bless || j.inter || j.susp); else if (EFF.poste !== 'tous') L = L.filter(j => j.poste === EFF.poste);
  const masse = C.masse(M(), c);
  VUE.innerHTML = `<div><h1 class="grand">Effectif</h1><p class="sous">${plur(c.effectif.length, 'joueur')} · masse salariale ${eur(masse)} / ${eur(c.masseMax)} par semaine</p></div>
  <div class="onglets-l"><div class="onglets" role="tablist">${vuesPerso().map(x => `<button role="tab" class="${EFF.vue === x.id ? 'on' : ''}" aria-selected="${EFF.vue === x.id}" data-act="effVue" data-v="${x.id}">${esc(x.nom)}</button>`).join('')}</div>
    <button class="mini-b roue" data-act="effNumeros" aria-label="Numéros de maillot" title="Numéros de maillot">#</button><button class="mini-b roue" data-act="effReglages" aria-label="Régler les vues de l'effectif" title="Régler les vues">⚙︎</button></div>
  <div class="chips petites">${[['tous', 'Tous'], ['P', 'Pours.'], ['B', 'Batteurs'], ['A', 'Attrap.'], ['G', 'Gardiens'], ['bless', 'Absents']].map(([k, n]) => `<button class="chip ${EFF.poste === k ? 'on' : ''}" data-act="effPoste" data-p="${k}">${n}</button>`).join('')}</div>
  <div class="chips petites tri-eff"><span class="mut petit">Ordre</span>${[['poste', 'Par poste'], ['sel', 'Composition'], ['note', 'Note']].map(([k, n]) => `<button class="chip ${EFF.tri === k ? 'on' : ''}" data-act="effOrdre" data-t="${k}" aria-pressed="${EFF.tri === k}">${n}</button>`).join('')}</div>
  <div class="carte tj-carte eff-glisse">${tableJoueurs(L, {cols:vueEff(EFF.vue).cols, tri:EFF.tri, sens:EFF.sens, K})}</div>
  <p class="petit mut">T titulaire · R1-R5 remplaçants · – réserve · <span style="color:var(--mauvais)">✚</span> blessé · ✈︎ en sélection. « Composition » range les titulaires, puis les remplaçants, la réserve et les absents. Touche un en-tête pour trier, un joueur pour sa fiche.${document.documentElement.classList.contains('desk') ? ' À la souris : maintiens le clic sur un joueur et lâche-le sur un autre pour échanger leurs places.' : ''}</p>`;
}
const garderEff = () => LS.ecrire('qm27:effectif', {vue:EFF.vue, tri:EFF.tri, sens:EFF.sens});
ACT.effVue = d => { EFF.vue = d.v; if (!['poste', 'abs', 'nom', 'age', 'sel', 'note'].includes(EFF.tri) && !vueEff(d.v).cols.includes(EFF.tri)) EFF.tri = 'poste'; garderEff(); rendre(); };
/* roue ⚙︎ : choisir, créer, modifier, ordonner et supprimer ses vues */
const ecrireVues = L => LS.ecrire('qm27:vuesEff', L);
function ficheVues(){
  const L = vuesPerso();
  feuille(`${teteF('Vues de l\'effectif', 'Choisis les colonnes de chaque vue')}
    <div class="liste">${L.map((v, i) => `<div class="el"><div class="t"><b>${esc(v.nom)}</b><span>${v.cols.map(k => COLS[k] ? COLS[k][0] : k).join(' · ') || 'aucune colonne'}</span></div>
      <button class="mini-b" data-act="vueMonte" data-i="${i}" aria-label="Monter" ${i ? '' : 'disabled'}>↑</button><button class="mini-b" data-act="vueEditer" data-i="${i}" aria-label="Modifier ${esc(v.nom)}">✎</button><button class="mini-b" data-act="vueCopier" data-i="${i}" aria-label="Dupliquer ${esc(v.nom)}">⧉</button><button class="mini-b" data-act="vueSuppr" data-i="${i}" aria-label="Supprimer ${esc(v.nom)}" ${L.length > 1 ? '' : 'disabled'}>✕</button></div>`).join('')}</div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="vuesRaz">Vues d'origine</button><button class="btn" data-act="vueNouvelle">Nouvelle vue</button></div>
    <p class="petit mut" style="margin:10px 0 0">⧉ duplique une vue : par exemple Général, puis ajoute le salaire et la fin de contrat. Au-delà de 4 colonnes, le tableau défile sur le côté.</p>`);
}
let VE = null;
function ficheVue(){
  const dispo = Object.keys(COLS).filter(k => !VE.cols.includes(k));
  feuille(`${teteF(VE.i == null ? 'Nouvelle vue' : 'Modifier la vue', 'Nom et colonnes')}
    <label class="petit mut" for="nomVue">Nom</label><input class="champ" id="nomVue" maxlength="20" value="${esc(VE.nom)}">
    <h4 class="sous-t">Colonnes affichées</h4>${VE.cols.length ? `<div class="liste">${VE.cols.map((k, i) => `<div class="el"><div class="t"><b>${COLS[k][0]}</b><span>${COLS[k][2]}</span></div>
      <button class="mini-b" data-act="colMonte" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Monter">↑</button><button class="mini-b" data-act="colRetire" data-i="${i}" aria-label="Retirer">✕</button></div>`).join('')}</div>` : '<p class="mut">Aucune colonne : ajoute-en ci-dessous.</p>'}
    <h4 class="sous-t">Ajouter</h4><div class="chips" style="flex-wrap:wrap">${dispo.map(k => `<button class="chip" data-act="colAjoute" data-k="${k}" title="${esc(COLS[k][2])}">+ ${COLS[k][0]}</button>`).join('') || '<span class="mut petit">Toutes les colonnes sont déjà là.</span>'}</div>
    <div class="btns" style="margin-top:14px"><button class="btn sec" data-act="effReglages">Retour</button><button class="btn" data-act="vueOk">Enregistrer</button></div>`);
  const n = document.getElementById('nomVue'); if (n) n.addEventListener('input', e => { VE.nom = e.target.value; });
}
ACT.effReglages = () => { VE = null; ficheVues(); };
ACT.vueNouvelle = () => { VE = {i:null, nom:'Ma vue', cols:['note']}; ficheVue(); };
ACT.vueEditer = d => { const v = vuesPerso()[+d.i]; VE = {i:+d.i, nom:v.nom, cols:v.cols.slice()}; ficheVue(); };
ACT.vueCopier = d => { const v = vuesPerso()[+d.i]; VE = {i:null, nom:(v.nom + ' +').slice(0, 20), cols:v.cols.slice()}; ficheVue(); };
ACT.vueSuppr = d => { const L = vuesPerso(); if (L.length <= 1) return; const [x] = L.splice(+d.i, 1); ecrireVues(L); if (EFF.vue === x.id){ EFF.vue = L[0].id; garderEff(); } ficheVues(); rendre(); ficheVues(); };
ACT.vueMonte = d => { const L = vuesPerso(), i = +d.i; if (i > 0){ [L[i - 1], L[i]] = [L[i], L[i - 1]]; ecrireVues(L); } rendre(); ficheVues(); };
ACT.vuesRaz = () => { if (!confirm('Revenir aux quatre vues d\'origine ?')) return; LS.ecrire('qm27:vuesEff', null); EFF.vue = 'general'; garderEff(); rendre(); ficheVues(); };
ACT.colAjoute = d => { if (!VE.cols.includes(d.k)) VE.cols.push(d.k); ficheVue(); };
ACT.colRetire = d => { VE.cols.splice(+d.i, 1); ficheVue(); };
ACT.colMonte = d => { const i = +d.i; if (i > 0) [VE.cols[i - 1], VE.cols[i]] = [VE.cols[i], VE.cols[i - 1]]; ficheVue(); };
ACT.vueOk = () => { const L = vuesPerso(), nom = (VE.nom || '').trim() || 'Ma vue';
  if (VE.i == null){ const id = 'v' + Date.now().toString(36); L.push({id, nom, cols:VE.cols}); EFF.vue = id; } else { L[VE.i] = {...L[VE.i], nom, cols:VE.cols}; EFF.vue = L[VE.i].id; }
  ecrireVues(L); garderEff(); VE = null; fermerFeuille(); rendre(); toast('Vue enregistrée'); };
ACT.effPoste = d => { EFF.poste = d.p; rendre(); };
/* v98 : numéros de maillot (1 à 99, uniques dans le club ; un numéro déjà pris est échangé) */
function ficheNumeros(msg){
  const c = moi(), L = c.effectif.map(id => M().joueurs[id]).filter(Boolean).sort((a, b) => (a.num ?? 999) - (b.num ?? 999));
  feuille(`${teteF('Numéros de maillot', esc(c.nom))}
    ${msg ? `<p class="petit" style="margin:0 0 8px;color:var(--accent);font-weight:600">${esc(msg)}</p>` : ''}
    <p class="petit mut" style="margin:0 0 10px">De 1 à 99. Si le numéro est déjà porté, les deux joueurs l'échangent.</p>
    <div class="liste num-l">${L.map(j => `<label class="el">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${j.age} ans</span></div><input type="number" inputmode="numeric" min="1" max="99" value="${j.num ?? ''}" data-chg="numero" data-j="${j.id}" aria-label="Numéro de ${esc(nomJ(j))}"></label>`).join('')}</div>
    <button class="btn plein" style="margin-top:12px" data-act="fermer">Terminé</button>`, true);
}
ACT.effNumeros = () => ficheNumeros();
ACT.effOrdre = d => { EFF.tri = d.t; EFF.sens = 1; garderEff(); rendre(); };
ACT.effTri = d => { if (EFF.tri === d.t) EFF.sens = -EFF.sens; else { EFF.tri = d.t; EFF.sens = 1; } garderEff(); rendre(); };

/* ============================== Clubs et joueurs ============================== */
function vueClubs(){
  const M_ = M(), l = U.clubsL || (M_.manager.club ? moi().ligue : 'bi'), L = M_.ligues[l], CL = window.QM.classement(M_, l), Gm = G();
  const mis = Gm ? Gm.missions(M_) : [];
  VUE.innerHTML = `<div><h1 class="grand">Clubs et joueurs</h1><p class="sous">48 clubs · tous les effectifs. Les notes des autres clubs sont des estimations tant que ton recruteur ne connaît pas bien les joueurs.</p></div>
  ${mis.length ? `<div class="carte"><h2>Missions du recruteur <span class="mut">${mis.length} / ${Gm.MAX_MISSIONS}</span></h2><div class="liste">${mis.map((m, i) => { const pro = m.type === 'profil', P = pro && Gm.PROFILS[m.cible];
    return `<div class="el">${m.type === 'club' ? blason(m.cible, 'p') : `<span class="blason nat p">${pro ? '🎯' : '🔭'}</span>`}<div class="t"><b>${m.type === 'club' ? esc(club(m.cible).nom) : m.type === 'ligue' ? esc(M_.ligues[m.cible].nom) : pro ? esc(P ? P[0] : m.cible) : 'Agents libres'}</b><span>${pro ? `rapport tous les mois, prochain dans ${plur(Math.max(1, 4 - ((M_.tic || 0) - (m.dernier ?? m.debut))), 'semaine')}${m.budget ? ' · valeur ≤ ' + eur(m.budget) : ''}` : `encore ${plur(Math.max(0, m.duree - ((M_.tic || 0) - m.debut)), 'semaine')} · rapport à la fin`}</span></div><button class="btn sec" data-act="finMission" data-i="${i}">Arrêter</button></div>`; }).join('')}</div>
    ${rapportsHTML(M_, Gm)}</div>` : ''}
  ${M_.manager.club && Gm ? rechercheHTML(M_, Gm) : ''}
  <div class="seg">${Object.values(M_.ligues).map(x => `<button data-act="clubsL" data-l="${x.id}" class="${x.id === l ? 'on' : ''}">${esc(x.court)}</button>`).join('')}</div>
  <div class="carte"><div class="liste">${CL.map((r, i) => { const c = club(r.id);
    return `<button class="el" data-act="ficheClub" data-c="${c.id}">${blason(c.id)}<div class="t"><b>${i + 1}. ${esc(c.nom)}${c.id === M_.manager.club ? ' <span class="badge tit">toi</span>' : ''}</b><span>${flag(c.nat)} ${esc(c.ville)} · ${r.pts} pts · ${plur(c.effectif.length, 'joueur')}${window.QMG && QMG.entraineurDe && QMG.entraineurDe(M_, c) ? ' · ' + esc(QMG.entraineurDe(M_, c).nom) : ''}</span></div><div class="d">${etoiles(c.rep)}</div></button>`; }).join('')}</div></div>
  ${bancsHTML(M_, l)}
  ${M_.manager.club ? `<button class="btn sec plein" data-act="mission" data-t="ligue" data-c="${l}">Envoyer le recruteur sur la ${esc(L.court)} (8 semaines)</button><div style="height:8px"></div><button class="btn sec plein" data-act="mission" data-t="libres" data-c="libres">Passer les agents libres au crible (8 semaines)</button>` : ''}`;
}
/* v159 : les bancs de la ligue (derniers mouvements) et les entraîneurs sans club */
function bancsHTML(M_, l){
  const G_ = window.QMG; if (!G_ || !G_.entr || !M_.entr) return '';
  const E = M_.entr, nomC = id => (M_.clubs[id] || (M_.reserve || {})[id] || {nom:id}).nom, f = e => e ? `${esc(e.nom)} (${G_.nomStyleE(e)})` : '?';
  const MV = E.J.filter(x => M_.clubs[x.c] && M_.clubs[x.c].ligue === l && ['limoge', 'arrivee', 'depart', 'retraite'].includes(x.k)).slice(0, 8);
  const txt = x => { const e = E.L[x.e], n = nomC(x.c);
    return x.k === 'limoge' ? `${esc(n)} limoge ${e ? esc(e.nom) : 'son entraîneur'}${x.rang ? ` (${x.rang}e)` : ''}` : x.k === 'arrivee' ? `${f(e)} arrive à ${esc(n)}` : x.k === 'depart' ? `${e ? esc(e.nom) : '?'} quitte ${esc(n)} pour ${esc(nomC(x.vers))}` : `${e ? esc(e.nom) : '?'} prend sa retraite (${esc(n)})`; };
  const L = Object.values(E.L).filter(e => !e.club && !e.retraite).sort((a, b) => b.rep - a.rep).slice(0, 6);
  return `<div class="carte"><h2>Les bancs</h2>${MV.length ? `<div class="liste">${MV.map(x => `<div class="el">${blason(x.c, 'p')}<div class="t"><b>${txt(x)}</b><span>saison ${x.s}-${String(x.s + 1).slice(2)}</span></div></div>`).join('')}</div>` : '<p class="petit mut" style="margin:0">Aucun changement d\'entraîneur dans cette ligue pour l\'instant.</p>'}
    ${L.length ? `<h4 class="stm-g" style="margin-top:12px">Sans club</h4><div class="liste">${L.map(e => `<div class="el"><span class="blason nat p">${flagSeul(e.nat)}</span><div class="t"><b>${esc(e.nom)}</b><span>${e.age} ans · jeu ${G_.nomStyleE(e)} · réputation ${e.rep}${e.car[0] ? ` · ex-${esc(nomC(e.car[0][0]))}` : ''}</span></div></div>`).join('')}</div>` : ''}
    <p class="petit mut" style="margin:8px 0 0">Un président perd patience quand son club finit loin de ce que promet sa réputation. Le nouvel entraîneur arrive avec son style : l'équipe change de visage.</p></div>`;
}
/* v97 : recherche par profil (mission sans fin, rapport mensuel) */
function rechercheHTML(M_, Gm){
  const Pk = U.profilRech || 'attrapeur', bud = U.budgetRech || 0;
  return `<div class="carte"><h2>Recherche par profil <span class="mut petit">rapport chaque mois</span></h2>
    <div class="chips petites" style="flex-wrap:wrap;overflow:visible">${Object.entries(Gm.PROFILS).map(([k, P]) => `<button class="chip ${Pk === k ? 'on' : ''}" data-act="profilRech" data-p="${k}" aria-pressed="${Pk === k}">${esc(P[0])}</button>`).join('')}</div>
    <label class="ligne" style="gap:8px;margin:8px 0"><span class="petit" style="flex:1">Valeur maximale</span><select data-chg="budgetRech" aria-label="Valeur maximale">${[0, 50000, 150000, 400000, 1000000, 2500000].map(v => `<option value="${v}" ${bud === v ? 'selected' : ''}>${v ? eurT(v) : 'Sans limite'}</option>`).join('')}</select></label>
    <button class="btn plein" data-act="mission" data-t="profil" data-c="${Pk}" data-b="${bud}">Lancer la recherche</button>
    <p class="petit mut" style="margin:8px 0 0">Le recruteur fouille tous les clubs et les agents libres, affine ce qu'il sait des meilleurs candidats chaque semaine et t'envoie les six premiers tous les mois. Plus il est bon, plus ses notes sont justes.</p></div>`;
}
function rapportsHTML(M_, Gm){
  const R = Gm.rapports(M_), cles = Object.keys(R).filter(k => Gm.missions(M_).some(m => m.type === 'profil' && m.cible === k)); if (!cles.length) return '';
  return cles.map(k => { const r = R[k], P = Gm.PROFILS[k];
    return `<h4 class="stm-g" style="margin-top:12px">Dernier rapport · ${esc(P[0])}</h4><div class="liste">${r.ids.map(id => M_.joueurs[id]).filter(Boolean).map(j => { const c = j.club ? club(j.club) : null;
      return `<button class="el" data-act="joueur" data-j="${j.id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${j.age} ans · ${c ? esc(c.nom) + ' · valeur ' + eur(window.QMC.valeur(M_, j)) : 'agent libre, sans indemnité'}</span></div><span class="d mut">›</span></button>`; }).join('')}</div>`; }).join('');
}
/* ============================== v97 : réunion de début de saison ============================== */
/* carte d'appel (accueil, bureau) : réunion à tenir, ou rappel de l'accord */
function reunionCarte(M_, feuilleScene){
  const Gm = G(); if (!Gm || !M_.manager.club) return '';
  const R = Gm.reunion(M_), mg = M_.manager;
  if (R && !R.fin) return `<div class="carte reun-appel"><h2>Réunion de début de saison</h2><p style="margin:0 0 10px">Le président t'attend pour fixer l'objectif, la philosophie et les budgets.${R.tard ? '' : ' Sans réunion avant le premier match de championnat, il décidera seul.'}</p><button class="btn plein" data-act="vue" data-v="reunion">Entrer dans le bureau</button></div>`;
  if (R && R.fin && R.accord && (Z.U.vue === 'direction' || feuilleScene)) return `<div class="carte"><h2>Plan de la saison ${R.accord.impose ? '<span class="mut petit">imposé</span>' : '<span class="mut petit">négocié</span>'}</h2>
    <p style="margin:0 0 6px"><b>${esc(Gm.TXT_OBJ[R.accord.vise])}</b></p><p class="petit" style="margin:0 0 6px">Philosophie : ${R.accord.philo.map(k => `<b>${esc(Gm.PHILOS[k][0])}</b> <span class="mut">(${esc(Gm.PHILOS[k][1].toLowerCase())})</span>`).join(' · ')}</p>
    <p class="petit mut" style="margin:0">Enveloppe des transferts : ${eur(moi().enveloppe ?? R.accord.env)} restants · masse salariale : ${eur(R.accord.masse)} par semaine au plus. Chaque engagement tenu en fin de saison : confiance +5, manqué : −5.</p></div>`;
  return '';
}
const RN = {};   // brouillon de la proposition (remis à zéro à chaque nouvelle réunion)
function vueReunion(){
  const M_ = M(), Gm = G(), R = Gm && Gm.reunion(M_); if (!R) return aller('direction');
  const c = moi(), o = R.offre, pref = Gm.prefPresident(M_, c);
  if (RN.cle !== `${R.saison}-${R.club}`) Object.assign(RN, {cle:`${R.saison}-${R.club}`, vise:o.vise, philo:o.philo.slice(), rep:0, effort:0, msg:null});
  const ch = Gm.chiffrer(M_, RN);
  if (R.fin) { VUE.innerHTML = `<div><h1 class="grand">Réunion avec le président</h1><p class="sous">${esc(c.nom)} · saison ${lab(M_.saison)}</p></div>${RN.msg ? `<div class="carte reun-msg ok"><p style="margin:0">${esc(RN.msg)}</p></div>` : ''}
    <div class="carte"><h2>Accord</h2><p style="margin:0 0 6px"><b>${esc(Gm.TXT_OBJ[R.accord.vise])}</b></p><p class="petit" style="margin:0 0 6px">Philosophie : ${R.accord.philo.map(k => esc(Gm.PHILOS[k][0])).join(' et ')}</p><p class="petit mut" style="margin:0 0 10px">Enveloppe des transferts : ${eur(R.accord.env)} · masse salariale : ${eur(R.accord.masse)} par semaine</p><button class="btn plein" data-act="vue" data-v="direction">Retour au bureau</button></div>`; return; }
  const idx = Gm.PALIERS.indexOf(RN.vise);
  VUE.innerHTML = `<div><h1 class="grand">Réunion avec le président</h1><p class="sous">${esc(c.nom)} · saison ${lab(M_.saison)} · ${3 - R.tours} proposition${3 - R.tours > 1 ? 's' : ''} possible${3 - R.tours > 1 ? 's' : ''}</p></div>
  ${RN.msg ? `<div class="carte reun-msg"><p style="margin:0">${esc(RN.msg)}</p></div>` : ''}
  <div class="carte"><h2>Son offre</h2><p style="margin:0 0 4px">« ${esc(Gm.TXT_OBJ[o.vise])}, avec ${esc(Gm.PHILOS[pref][0].toLowerCase())}. Je te donne ${eur(o.env)} pour les transferts et ${eur(o.masse)} par semaine de masse salariale. »</p>
    <p class="petit mut" style="margin:0">Solde du club : ${eur(c.budget)}. Viser plus haut lui plaît et débloque plus d'argent, mais il te jugera dessus. Partager sa philosophie le rend plus conciliant.</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Objectif</h2><div class="ligne" style="gap:8px"><button class="btn sec mini" data-act="reunVise" data-d="-1" ${idx <= 0 ? 'disabled' : ''} aria-label="Plus ambitieux">▲</button><b style="flex:1;text-align:center">${esc(Gm.TXT_OBJ[RN.vise])}</b><button class="btn sec mini" data-act="reunVise" data-d="1" ${idx >= Gm.PALIERS.length - 1 ? 'disabled' : ''} aria-label="Moins ambitieux">▼</button></div>
      <p class="petit mut" style="margin:6px 0 0">${ch.crans > 0 ? `${ch.crans} cran${ch.crans > 1 ? 's' : ''} plus ambitieux que lui : +${ch.crans * 10} % sur les budgets.` : ch.crans < 0 ? `${-ch.crans} cran${ch.crans < -1 ? 's' : ''} en dessous de son idée : budgets réduits, il sera plus difficile à convaincre.` : 'Son objectif.'}</p></div>
    <div class="carte"><h2>Philosophie <span class="mut petit">une ou deux</span></h2><div class="liste compacte">${Object.entries(Gm.PHILOS).map(([k, P]) => { const on = RN.philo.includes(k);
      return `<button class="el${on ? ' sel' : ''}" data-act="reunPhilo" data-k="${k}" aria-pressed="${on}"><span class="poste ${on ? 'A' : ''}" aria-hidden="true">${on ? '✓' : ''}</span><div class="t"><b>${esc(P[0])}${k === pref ? ' <span class="badge tit">son choix</span>' : ''}</b><span>${esc(P[1])}</span></div></button>`; }).join('')}</div></div>
  </div><div>
    <div class="carte"><h2>Budgets</h2>
      <p class="petit" style="margin:0 0 6px">Répartition entre transferts et salaires</p>
      <div class="ligne" style="gap:6px"><span class="petit mut">Transferts</span><div class="seg mini" style="flex:1">${[[-2, '◀◀', 'Beaucoup plus pour les transferts'], [-1, '◀', 'Un peu plus pour les transferts'], [0, '=', 'Équilibre proposé'], [1, '▶', 'Un peu plus pour les salaires'], [2, '▶▶', 'Beaucoup plus pour les salaires']].map(([v, l, t]) => `<button data-act="reunRep" data-v="${v}" class="${RN.rep === v ? 'on' : ''}" aria-label="${t}" title="${t}">${l}</button>`).join('')}</div><span class="petit mut">Salaires</span></div>
      <p class="petit" style="margin:10px 0 6px">Effort demandé au président</p>
      <div class="seg mini">${[[0, 'Aucun'], [0.1, '+10 %'], [0.2, '+20 %'], [0.3, '+30 %']].map(([v, l]) => `<button data-act="reunEffort" data-v="${v}" class="${RN.effort === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="prev-g" style="grid-template-columns:1fr 1fr;margin-top:10px"><div><b>${eur(ch.env)}</b><span>enveloppe des transferts</span></div><div><b>${eur(ch.masse)}</b><span>masse salariale par semaine</span></div></div>
      <p class="petit mut" style="margin:6px 0 0">Masse actuelle : ${eur(C.masse(M_, c))} par semaine. La moitié de chaque vente revient dans l'enveloppe.</p></div>
    <button class="btn plein" data-act="reunProposer" ${RN.philo.length ? '' : 'disabled'}>Proposer ce plan</button>
    <div style="height:8px"></div><button class="btn sec plein" data-act="reunAccepter">Accepter son offre telle quelle</button>
  </div></div>`;
}
VUES.reunion = vueReunion;
ACT.reunVise = d => { const Gm = G(), i = Gm.PALIERS.indexOf(RN.vise) + (+d.d); if (i >= 0 && i < Gm.PALIERS.length) RN.vise = Gm.PALIERS[i]; rendre(); };
ACT.reunPhilo = d => { const i = RN.philo.indexOf(d.k); if (i >= 0) RN.philo.splice(i, 1); else { RN.philo.push(d.k); if (RN.philo.length > 2) RN.philo.shift(); } rendre(); };
ACT.reunRep = d => { RN.rep = +d.v; rendre(); };
ACT.reunEffort = d => { RN.effort = +d.v; rendre(); };
ACT.reunProposer = () => { const r = G().proposer(M(), {vise:RN.vise, philo:RN.philo.slice(), rep:RN.rep, effort:RN.effort}); RN.msg = r.txt; sauver(); rendre(); scrollTo({top:0, behavior:'smooth'}); };
ACT.reunAccepter = () => { const Gm = G(), R = Gm.reunion(M()), o = R.offre; Object.assign(RN, {vise:o.vise, philo:o.philo.slice(), rep:0, effort:0});
  const r = Gm.accepterOffre(M()); RN.msg = r.txt; sauver(); rendre(); scrollTo({top:0, behavior:'smooth'}); };
Z.reunionCarte = reunionCarte;

const FC = {vue:'scout', tri:'poste', sens:1};
function vueClubFiche(){
  const M_ = M(), c = club(U.clubVu), Gm = G(); if (!c) return aller('clubs');
  const CL = window.QM.classement(M_, c.ligue), pos = CL.findIndex(r => r.id === c.id) + 1, T = M_.tables[c.ligue][c.id] || {};
  const L = c.effectif.map(id => M_.joueurs[id]).filter(Boolean), mien = c.id === M_.manager.club;
  const enMission = Gm && Gm.missions(M_).some(m => m.type === 'club' && m.cible === c.id);
  const connuMoy = mien ? 100 : Math.round(L.reduce((s, j) => s + connu(j), 0) / (L.length || 1));
  VUE.innerHTML = `<div class="tete-club">${blason(c.id, 'g')}<div style="min-width:0"><h1 class="grand">${esc(c.nom)}</h1><p class="sous">${flag(c.nat)} ${esc(c.ville)} · ${esc(M_.ligues[c.ligue].court)} · ${etoiles(c.rep)}</p></div></div>
  <div class="carte"><div class="kpi">${[['Classement', `${pos}${pos === 1 ? 'er' : 'e'}`], ['Points', T.pts ?? 0], ['Stade', (c.stade / 1000).toLocaleString('fr-FR', {maximumFractionDigits:1}) + ' k'], ['Connu', connuMoy + ' %']].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
    ${!mien && M_.manager.club ? `<div class="btns" style="margin-top:12px"><button class="btn ${enMission ? 'sec' : ''}" data-act="mission" data-t="club" data-c="${c.id}" ${enMission ? 'disabled' : ''}>${enMission ? 'Recruteur sur place' : 'Envoyer le recruteur (4 sem.)'}</button><button class="btn sec" data-act="suivreClub" data-c="${c.id}">Superviser tout l'effectif</button></div>` : ''}</div>
  ${window.QMG && QMG.profilJeu ? (() => { const st = !mien && QMG.styleCoach ? QMG.STYLES_JEU[QMG.styleCoach(M_, c)] : null, pr = QMG.profilJeu(M_, c);
    const en = !mien && QMG.entraineurDe ? QMG.entraineurDe(M_, c) : null, nomC = id => (M_.clubs[id] || (M_.reserve || {})[id] || {nom:id}).nom;   // v159 : entraîneur nommé
    return st || pr ? `<div class="carte"><h2>${en ? 'Entraîneur et style de jeu' : 'Style de jeu'}</h2>${en ? `<p class="petit" style="margin:0 0 6px"><b>${esc(en.nom)}</b> · ${flag(en.nat)} · ${en.age} ans · réputation ${en.rep} · en poste depuis ${en.depuis}${en.titres ? ` · ${en.titres} titre${en.titres > 1 ? 's' : ''}` : ''}${en.car.length ? `<br><span class="mut">Avant : ${en.car.slice(0, 3).map(x => `${esc(nomC(x[0]))} (${x[1]}-${x[2]}, ${esc(x[3])})`).join(', ')}</span>` : ''}</p>` : ''}${st ? `<p class="petit" style="margin:0 0 6px">Style de l'entraîneur : <b>${esc(st.nom)}</b>. ${esc(st.d)}</p>` : ''}${c.anciens && c.anciens.length ? `<p class="petit mut" style="margin:0 0 6px">Anciens entraîneurs : ${c.anciens.slice(0, 3).map(x => `${esc(x[0])} (${x[1]}-${x[2]}, ${esc(x[3])})`).join(', ')}</p>` : ''}${pr ? `<p class="petit" style="margin:0">Sur le terrain (${pr.n} derniers matchs) : ${pr.etiquettes.slice(0, 2).map(e => `<span class="stj ${e}">${esc(QMG.STYLES_JEU[e].nom)}</span>`).join(' ')} · ${pr.pour.toFixed(1).replace('.', ',')} buts marqués, ${pr.contre.toFixed(1).replace('.', ',')} encaissés, possession ${Math.round(pr.poss)} %, ${Math.round(pr.partContre * 100)} % des buts sur contre.</p>` : ''}</div>` : ''; })() : ''}
  <div class="onglets" role="tablist">${[mien ? 'general' : 'scout', 'contrats', 'saison'].map(k => `<button role="tab" class="${FC.vue === k ? 'on' : ''}" data-act="fcVue" data-v="${k}">${VUES_EFF[k].nom}</button>`).join('')}</div>
  <div class="carte tj-carte">${tableJoueurs(L, {vue:mien && FC.vue === 'scout' ? 'general' : !mien && FC.vue === 'general' ? 'scout' : FC.vue, tri:FC.tri, sens:FC.sens, K:mien ? c.compo : null, act:'fcTri', nat:c.nat})}</div>
  <p class="petit mut">Notes estimées par ton recruteur (fourchettes en gris). Touche un joueur pour sa fiche : « Superviser » pour le suivre de près.</p>`;
}
ACT.ficheClub = d => { U.clubVu = d.c; retirerFeuille(); if (Z.U.vue === 'clubFiche') rendre(); else aller('clubFiche'); };
ACT.clubsL = d => { U.clubsL = d.l; rendre(); };
ACT.fcVue = d => { FC.vue = d.v; if (!['poste', 'nom', 'age'].includes(FC.tri)) FC.tri = 'poste'; rendre(); };
ACT.fcTri = d => { if (FC.tri === d.t) FC.sens = -FC.sens; else { FC.tri = d.t; FC.sens = 1; } rendre(); };
ACT.profilRech = d => { U.profilRech = d.p; rendre(); };
ACT.mission = d => { const r = G().lancerMission(M(), d.t, d.c, d.b); toast(r.msg); if (r.ok){ sauver(); rendre(); } };
ACT.finMission = d => { G().arreterMission(M(), +d.i); sauver(); rendre(); };
ACT.suivreClub = d => { const U_ = moi(), c = club(d.c); let n = 0; for (const id of c.effectif) if (!U_.suivi.includes(id)){ U_.suivi.push(id); n++; } sauver(); toast(n ? `${plur(n, 'joueur')} ajouté${n > 1 ? 's' : ''} à ta liste de suivi` : 'Déjà tous suivis'); rendre(); };

/* ============================== Calendrier : mois et saison ============================== */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourUTC = t => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
/* ce qui se passe chaque jour : matchs du samedi, fenêtres de mercato, tournoi, trêve, préparation */
function evenementsSaison(){
  const M_ = M(), mg = M_.manager, cid = mg.club, n = mg.selection ? mg.selection.nat : null, J = new Map();
  const get = t => { const k = jourUTC(t); if (!J.has(k)) J.set(k, {t:k, bandes:new Set(), matchs:[], k:null}); return J.get(k); };
  const Cal = M_.calendrier;
  Cal.forEach((S, k) => {
    if (S.type === 'bilan') return;
    for (let d = 6; d >= 0; d--){ const x = get(S.date - d * 864e5); if (C.mercatoOuvert(S)) x.bandes.add('mercato'); if (S.type === 'prepa') x.bandes.add('prepa'); if (S.tour || (S.type === 'sixn' && S.comp)) x.bandes.add('tournoi'); }
    const x = get(S.date); x.k = k; x.S = S;
    for (const m of S.matchs) if ((cid && (m.dom === cid || m.ext === cid)) || (n && m.ligue === 'sixn' && (m.dom === n || m.ext === n))){ const y = m.date ? get(m.date) : x; y.k = k; y.S = S; y.matchs.push(m); }   // v104 : les matchs européens le mercredi
    const nx = Cal[k + 1]; if (nx && nx.type !== 'bilan' && nx.date - S.date > 8 * 864e5) for (let t = S.date + 864e5; t < nx.date - 6 * 864e5; t += 864e5) get(t).bandes.add('treve');
  });
  return J;
}
function resMatch(m){
  const M_ = M(), mg = M_.manager, sx = m.ligue === 'sixn', moiId = sx ? (mg.selection || {}).nat : mg.club, dom = m.dom === moiId, adv = dom ? m.ext : m.dom;
  if (!m.res) return {adv, dom, sx, txt:'', v:''};
  const a = m.res.score[dom ? 0 : 1], b = m.res.score[dom ? 1 : 0];
  return {adv, dom, sx, txt:`${a}–${b}`, v:a > b ? 'V' : a < b ? 'D' : 'N'};
}
function grilleMois(an, mo, J, petit){
  const d0 = Date.UTC(an, mo, 1), nb = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate(), dec = (new Date(d0).getUTCDay() + 6) % 7, auj = jourUTC((window.QM.semaine(M()) || {}).date || 0);
  let h = petit ? '' : `<div class="cal-j">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>`;
  h += `<div class="cal-g ${petit ? 'petit' : ''}">${'<span class="vide"></span>'.repeat(dec)}`;
  for (let i = 1; i <= nb; i++){
    const t = Date.UTC(an, mo, i), x = J.get(t), b = x ? [...x.bandes] : [], m = x && x.matchs;
    const cls = ['c', ...b, t === auj ? 'auj' : '', m && m.length ? 'match' : ''].join(' ');
    if (petit){ const r = m && m.length ? resMatch(m[m.length - 1]) : null; h += `<span class="${cls}" title="${i} ${MOIS[mo]}">${r ? `<i class="pt ${r.v || 'av'}"></i>` : ''}</span>`; continue; }
    h += `<${x && x.k != null && m && m.length ? `button data-act="semaine" data-s="${x.k}"` : 'span'} class="${cls}"><em>${i}</em>${m && m.length ? m.map(mm => { const r = resMatch(mm);
      return `<span class="mm ${r.v}">${r.sx ? flagSeul(r.adv) : blason(r.adv, 'p')}<small>${r.txt || (r.dom ? 'dom.' : 'ext.')}</small></span>`; }).join('') : ''}${x && x.S && x.S.tour && !(m || []).some(mm => mm.ligue === 'sixn') ? `<span class="tn" title="${esc(D.TOURNOI.nom)}">🏆</span>` : ''}</${x && x.k != null && m && m.length ? 'button' : 'span'}>`;
  }
  return h + '</div>';
}
function vueCalendrier(){
  const M_ = M(), mg = M_.manager, J = evenementsSaison(), S = window.QM.semaine(M_) || M_.calendrier[M_.calendrier.length - 1];
  const mode = U.calMode || 'mois';
  const moisListe = []; { let d = new Date(M_.calendrier[0].date); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const fin = M_.calendrier[M_.calendrier.length - 1].date;
    while (d.getTime() <= fin){ moisListe.push([d.getUTCFullYear(), d.getUTCMonth()]); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } }
  if (U.calSem !== M_.semaine){ U.calMois = null; U.calSem = M_.semaine; }   // v94 : le calendrier s'ouvre sur le mois de la semaine en cours
  if (U.calMois == null){ const d = new Date(S.date); U.calMois = Math.max(0, moisListe.findIndex(([a, m]) => a === d.getUTCFullYear() && m === d.getUTCMonth())); }
  U.calMois = Math.max(0, Math.min(moisListe.length - 1, U.calMois));
  const legende = `<div class="cal-leg"><span><i class="b mercato"></i>Mercato</span><span><i class="b prepa"></i>Préparation</span><span><i class="b tournoi"></i>${M().calendrier.some(s => s.tour) ? esc(D.TOURNOI.court) : 'Sélections'}</span><span><i class="b treve"></i>Trêve</span><span><i class="pt V"></i>V</span><span><i class="pt N"></i>N</span><span><i class="pt D"></i>D</span></div>`;
  let corps;
  if (mode === 'mois'){
    const [an, mo] = moisListe[U.calMois];
    const evs = []; for (const x of J.values()) if (new Date(x.t).getUTCMonth() === mo && new Date(x.t).getUTCFullYear() === an && x.k != null) evs.push(x);
    evs.sort((a, b) => a.t - b.t);
    corps = `<div class="carte"><div class="cal-nav"><button class="mini-b" data-act="calMois" data-d="-1" aria-label="Mois précédent" ${U.calMois ? '' : 'disabled'}>‹</button><h2 style="margin:0">${MOIS[mo]} ${an}</h2><button class="mini-b" data-act="calMois" data-d="1" aria-label="Mois suivant" ${U.calMois < moisListe.length - 1 ? '' : 'disabled'}>›</button></div>
      ${grilleMois(an, mo, J)}${legende}</div>
      <div class="carte"><h2>Ce mois-ci</h2><div class="liste">${evs.map(x => { const S_ = x.S, k = x.k;
        const lignes = x.matchs.map(m => { const r = resMatch(m); return `<button class="el" data-act="semaine" data-s="${k}">${r.sx ? blason(r.adv, 'p', 1) : blason(r.adv, 'p')}<div class="t"><b>${r.sx ? (m.comp && window.QMN ? esc(m.comp === 'ami' ? 'Amical' : D.LDN.court + ' · ' + window.QMN.ETAPES[m.etape].replace('Groupes · ', '')) : esc(D.TOURNOI.court) + ' · tour ' + S_.tour) : m.ligue === 'eu' && window.QME ? esc(window.QME.COURT + ' · ' + window.QME.nomTour(m)) : 'J' + S_.journee} · ${r.dom ? '' : '@ '}${esc(r.sx ? nat(r.adv).nom : club(r.adv).nom)}</b><span>${fmtDate(x.t)} · ${r.dom ? 'domicile' : 'extérieur'}${k === M_.semaine ? ' · cette semaine' : ''}${S_.tour && !r.sx && mg.club && k === M_.semaine && window.QM.convoques(M_, mg.club).length ? ` · ✈︎ ${plur(window.QM.convoques(M_, mg.club).length, 'absent')}` : ''}</span></div><span class="d">${r.txt ? `<b>${r.txt}</b> <span class="vnd ${r.v}">${r.v}</span>` : '<span class="mut">à venir</span>'}</span></button>`; }).join('');
        const info = S_.type === 'prepa' ? `<div class="el"><span class="blason nat p">🏋️</span><div class="t"><b>Préparation · semaine ${S_.semaine}</b><span>${fmtDate(x.t)} · mercato ouvert</span></div></div>` : '';
        return info + lignes; }).join('') || '<p class="mut" style="margin:0">Pas de match ce mois-ci.</p>'}</div></div>`;
  } else {
    corps = `<div class="cal-annee">${moisListe.map(([an, mo], i) => `<button class="carte cal-m" data-act="calVoirMois" data-i="${i}"><h3>${MOIS[mo]}${mo === 0 || i === 0 ? ' ' + an : ''}</h3>${grilleMois(an, mo, J, true)}</button>`).join('')}</div>${legende}
      <div class="carte"><h2>Repères de la saison</h2><div class="liste">${reperes().map(([t, n]) => `<div class="el"><div class="t"><b>${n}</b><span>${t}</span></div></div>`).join('')}</div></div>`;
  }
  VUE.innerHTML = `<div><h1 class="grand">Calendrier</h1><p class="sous">Saison ${lab(M_.saison)}${mg.club ? ' · ' + esc(M_.ligues[moi().ligue].nom) : ''}</p></div>
  <div class="seg"><button data-act="calMode" data-m="mois" class="${mode === 'mois' ? 'on' : ''}">Mois</button><button data-act="calMode" data-m="saison" class="${mode === 'saison' ? 'on' : ''}">Saison</button></div>${corps}`;
}
function reperes(){
  const M_ = M(), Cal = M_.calendrier.filter(s => s.type !== 'bilan'), R = [];
  const prem = Cal.find(s => s.type === 'ligue'), der = Cal.filter(s => s.type === 'ligue').pop(), pre = Cal.find(s => s.type === 'prepa');
  if (pre) R.push([`à partir du ${fmtDate(pre.date)}`, 'Préparation et mercato d\'été']);
  if (prem) R.push([fmtDate(prem.date), 'Première journée (le mercato d\'été ferme)']);
  const jan = Cal.filter(s => new Date(s.date).getUTCMonth() === 0); if (jan.length) R.push([`${fmtDate(jan[0].date)} → ${fmtDate(jan[jan.length - 1].date)}`, 'Mercato d\'hiver']);
  for (const s of Cal.filter(s => s.type === 'sixn' && s.comp === 'ami')) R.push([fmtDate(s.date), `${D.AMICAUX.fenetres} ${s.fen} : matchs amicaux des sélections (pause des championnats)`]);   // v106
  const ld = Cal.filter(s => s.comp === 'ldn'); if (ld.length) R.push([`${fmtDate(ld[0].date)} → ${fmtDate(ld[ld.length - 1].date)}`, `${D.LDN.nom} : groupes, puis quarts, demies et finale`]);
  const eu = Cal.find(s => s.type === 'europe'); if (eu && window.QME) R.push([fmtDate(eu.date), `Finale de la ${window.QME.NOM}`]);
  const t = Cal.filter(s => s.tour || (s.type === 'sixn' && !s.comp)); if (t.length) R.push([`${fmtDate(t[0].date)} → ${fmtDate(t[t.length - 1].date)}`, `${D.TOURNOI.nom}${t[0].type === 'sixn' ? ' (pause du championnat)' : ' : les internationaux manquent leur club'}`]);
  if (der) R.push([fmtDate(der.date), 'Dernière journée, puis bilan']);
  return R;
}
ACT.calMode = d => { U.calMode = d.m; rendre(); };
ACT.calMois = d => { U.calMois += +d.d; rendre(); };
ACT.calVoirMois = d => { U.calMois = +d.i; U.calMode = 'mois'; rendre(); scrollTo(0, 0); };
ACT.cal = d => { U.calMode = d.c === 'tout' ? 'saison' : 'mois'; rendre(); };

/* ============================== Entraînement programmable ============================== */
const ICO_S = {physique:'🏃', vol:'🧹', balle:'🔴', technique:'🔴', cohesion:'🤝', tactique:'🧠', match:'📋', recup:'🛁'};
const IMG_S = {};   // v127 : images provisoires des nouvelles séances ; v129 : elles ont les leurs (entrainement/technique, cohesion)
const icoS = s => ICO_S[s] ? V.entrImg(IMG_S[s] || s, 'eimg') : '';   // v115 : images de la Série 5 (les émojis restent pour les menus déroulants)
const nomS = k => (G().SEANCE[k] || [])[1] || k;
const nomInt = i => (D.INTENSITES.find(x => x[0] === i) || [0, 'Normale'])[1];
function jaugesProg(c, p, S){
  const a = G().apercu(M(), c, p, S);
  return `<div class="jauges-prog">${[['progression', 'Progression', 'var(--bon)'], ['fatigue', 'Fatigue', 'var(--moyen)'], ['risque', 'Risque de blessure', 'var(--mauvais)'], ['cohesion', 'Cohésion', 'var(--accent)']].map(([k, n, col]) => `<div><span class="petit">${n}</span>${jauge(a[k], n, col)}</div>`).join('')}</div>`;
}
const jourChips = p => `<div class="jours">${p.jours.map((s, i) => `<span class="jour s-${s}"><small>${G().JOURS[i]}</small><b aria-hidden="true">${icoS(s)}</b><em>${nomS(s)}</em></span>`).join('')}</div>`;
/* v127 : maîtrise tactique (carte de l'Entraînement) ; v152 : par plan de jeu, choix du plan travaillé */
function carteMaitrise(M_, c){
  const Gm = G(), m = Gm.maitrise(M_, c), L = Gm.presets(M_, c), t = c.presetTravail, v = Math.round(m.v), b = (m.v - 60) / 100 * D.EQ.maitrise.force * 100;
  const opts = [['actif', 'Plan joué'], ['0', L[0].nom], ['1', L[1].nom], ['2', L[2].nom], ['tous', 'Les trois']];
  return `<div class="carte"><h2><img src="${V.IMAGES}icones/maitrise.webp" alt="" width="22" height="22" style="vertical-align:-5px;margin-right:6px">Maîtrise tactique <span class="mut">${v} %</span></h2>
    <div class="plans-m">${L.map((p, i) => { const x = Math.round(Gm.maitrisePlan(M_, c, p.T)); return `<div><span class="petit">${esc(p.nom)}${i === c.presetActif ? ' <span class="badge tit">joué</span>' : ''}</span>${jauge(x, 'Maîtrise de ' + p.nom, 'var(--accent)')}<b class="petit">${x} %</b></div>`; }).join('')}</div>
    <div class="grp" style="margin-top:10px">Les séances d'apprentissage tactique travaillent</div>
    <div class="seg mini st-vues" role="group" aria-label="Plan travaillé">${opts.map(([k, n]) => `<button data-act="travailPlan" data-v="${k}" class="${String(t) === k ? 'on' : ''}" aria-pressed="${String(t) === k}">${esc(n)}</button>`).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">${v >= 90 ? 'Ton plan joué est récité par cœur.' : v >= 70 ? 'L\'équipe connaît bien ton plan joué.' : v >= 45 ? 'Les automatismes se mettent en place.' : 'Les joueurs découvrent ce plan.'} En match : ${b >= 0 ? '+' : '−'}${Math.abs(b).toFixed(1).replace('.', ',')} % en attaque et en défense. Les options des autres plans progressent un peu moins vite ; une option oubliée s'érode doucement.${t === 'tous' ? ' Travailler les trois plans partage l\'effort (un peu plus de la moitié du gain pour chacun).' : ''}</p></div>`;
}
Z.carteMaitrise = carteMaitrise;
function vueEntrainement(){
  const M_ = M(), c = moi(), Gm = G(), P = Gm.plan(c), k0 = M_.semaine, S0 = window.QM.semaine(M_), p0 = Gm.programmeDe(M_, c, k0);
  const atel = p => `<div class="ateliers">${['P', 'B', 'A', 'G'].map(po => { const a = Gm.ATELIERS[po].find(x => x[0] === (p.ateliers || {})[po]) || Gm.ATELIERS[po][0]; return `<span>${posteB(po)}${V.entrImg(po + '-' + a[0], 'eimg')}${a[1]}</span>`; }).join('')}</div>`;
  const fat = Math.round(Gm.fatigueTitulaires(M_, c));
  const avenir = []; for (let k = k0; k < Math.min(M_.calendrier.length - 1, k0 + 8); k++) avenir.push(k);
  const quoi = S => !S ? '' : S.type === 'prepa' ? `Préparation ${S.semaine}` : S.type === 'sixn' ? (S.comp && window.QMN ? window.QMN.titreSemaine(S) : `${D.TOURNOI.court} · tour ${S.tour}`) : S.type === 'europe' ? 'Finale des Anneaux' : `J${S.journee}${S.tour ? ' · ' + D.TOURNOI.court : ''}${(S.matchs || []).some(m => m.ligue === 'eu') ? ' · Anneaux' : ''}`;
  VUE.innerHTML = `<div><h1 class="grand">Entraînement</h1><p class="sous">Cinq séances par semaine. Les joueurs progressent vers leur potentiel ; la fatigue et les blessures suivent l'intensité.</p></div>
  <div class="carte"><h2>Qui prépare les séances ?</h2><div class="seg"><button data-act="planAuto" data-v="1" class="${P.auto ? 'on' : ''}">Mon adjoint</button><button data-act="planAuto" data-v="0" class="${P.auto ? '' : 'on'}">Moi</button></div>
    <p class="petit mut" style="margin:8px 0 0">${P.auto ? 'Ton adjoint adapte chaque semaine : foncier puis pré-saison en août, récupération quand les titulaires sont fatigués, collectif pendant le tournoi. Tu peux reprendre la main sur une semaine précise.' : 'Ta semaine type s\'applique à toutes les semaines, sauf celles que tu programmes à part.'}</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Cette semaine <span class="mut">${quoi(S0)}</span></h2>
      <p style="margin:0 0 8px"><b>${esc(p0.nom || 'Programme')}</b> · intensité ${nomInt(p0.int).toLowerCase()}${p0.auto ? ' · <span class="badge">adjoint</span>' : ' · <span class="badge tit">toi</span>'}</p>
      ${jourChips(p0)}${atel(p0)}${jaugesProg(c, p0, S0)}
      <p class="petit mut" style="margin:8px 0 10px">Fatigue moyenne des titulaires : <b style="color:var(--ink)">${fat} %</b> · cohésion ${Math.round(c.cohesion)} %</p>
      <button class="btn plein" data-act="progEditer" data-k="${k0}">Programmer cette semaine</button></div>
    ${carteMaitrise(M_, c)}
    <div class="carte"><h2>Entraînement individuel</h2><p class="petit mut" style="margin:0 0 10px">Un focus par joueur (une capacité, un rôle ou un nouveau poste), et des focus bonus avec l'Aire d'envol.</p><button class="btn sec plein" data-act="vue" data-v="progression">Progression des joueurs</button></div>
    ${P.auto ? '' : `<div class="carte"><h2>Ta semaine type</h2><p style="margin:0 0 8px"><b>${esc(P.modele.nom || 'Semaine type')}</b> · ${nomInt(P.modele.int).toLowerCase()}</p>${jourChips(P.modele)}<button class="btn sec plein" style="margin-top:10px" data-act="progEditer" data-k="modele">Modifier la semaine type</button></div>`}
  </div><div>
    <div class="carte"><h2>Semaines à venir</h2><div class="liste">${avenir.slice(1).map(k => { const S = M_.calendrier[k], p = Gm.programmeDe(M_, c, k);
      return `<button class="el" data-act="progEditer" data-k="${k}"><div class="t"><b>${fmtDate(S.date)} · ${esc(quoi(S))}</b><span>${esc(p.nom || 'Programme')} · ${nomInt(p.int).toLowerCase()} · <span class="ico-s">${p.jours.map(s => icoS(s)).join('')}</span></span></div><span class="d">${p.auto ? '<span class="badge">adjoint</span>' : '<span class="badge tit">toi</span>'}</span></button>`; }).join('') || '<p class="mut">Fin de saison.</p>'}</div></div>
    <div class="carte aide"><h2>Repères</h2>
      <p><b>Séances.</b> ${G().SEANCES.map(x => `${x[1]} : ${x[2].charAt(0).toLowerCase() + x[2].slice(1)}.`).join(' ')}</p>
      <p><b>Maîtrise tactique.</b> Chaque option du système de jeu (dispositions avec et sans le souafle, batteurs, zone d'attaque, passes) a sa maîtrise ; celle d'un plan est la moyenne de ses options. En match, 60 % est neutre : à 90 %, +4 % en attaque et en défense ; à 30 %, −4 % et plus de ballons perdus (environ 7 victoires sur 100 d'écart). Une retouche ne coûte que l'écart sur l'option changée. Les séances d'apprentissage tactique travaillent le plan choisi ci-dessus.</p>
      <p><b>Ateliers.</b> Chaque poste travaille un groupe d'attributs en plus (+35 %).</p>
      <p><b>Intensité.</b> Plus haute, on progresse plus vite, mais la fatigue et le risque de blessure montent.</p></div>
  </div></div>`;
}
let PROG = null;
function ficheProg(){
  const M_ = M(), c = moi(), Gm = G(), p = PROG.p, k = PROG.k, S = k === 'modele' ? window.QM.semaine(M_) : M_.calendrier[k];
  feuille(`${teteF(k === 'modele' ? 'Semaine type' : `Semaine du ${fmtDate(S.date)}`, k === 'modele' ? 'S\'applique quand tu prépares toi-même' : 'Programme de la semaine')}
    <h4 class="sous-t">Partir d'un modèle</h4><div class="chips">${Object.entries(Gm.MODELES).map(([id, x]) => `<button class="chip ${p.nom === x.nom ? 'on' : ''}" data-act="progModele" data-m="${id}">${x.nom}</button>`).join('')}</div>
    <h4 class="sous-t">Séances</h4><div class="seances">${p.jours.map((s, i) => `<label class="seance"><span>${Gm.JOURS[i]}</span>${icoS(s)}<select data-chg="seance" data-i="${i}">${[...Gm.SEANCES, ...Gm.SEANCES_ANCIENNES.filter(x => x[0] === s)].map(x => `<option value="${x[0]}" ${x[0] === s ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label>`).join('')}</div>
    <h4 class="sous-t">Intensité</h4><div class="seg">${D.INTENSITES.map(([v, n]) => `<button data-act="progInt" data-v="${v}" class="${p.int === v ? 'on' : ''}">${n}</button>`).join('')}</div>
    <h4 class="sous-t">Ateliers par poste</h4><div class="seances">${['P', 'B', 'A', 'G'].map(po => `<label class="seance"><span>${posteB(po)}</span>${V.entrImg(po + '-' + ((p.ateliers || {})[po] || Gm.ATELIERS[po][0][0]), 'eimg')}<select data-chg="atelier" data-p="${po}">${Gm.ATELIERS[po].map(a => `<option value="${a[0]}" ${(p.ateliers || {})[po] === a[0] ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label>`).join('')}</div>
    <h4 class="sous-t">Effets attendus</h4>${jaugesProg(c, p, S)}
    <div class="btns" style="margin-top:14px;flex-wrap:wrap">${k !== 'modele' && !p.auto && Gm.plan(c).sem[M_.saison + ':' + k] ? '<button class="btn sec" data-act="progRendre">Rendre à l\'adjoint</button>' : ''}<button class="btn" data-act="progOk">Enregistrer</button>${k !== 'modele' ? '<button class="btn sec" data-act="progOk" data-n="4">Pour 4 semaines</button>' : ''}</div>`);
}
ACT.progEditer = d => { const M_ = M(), c = moi(), Gm = G(), k = d.k === 'modele' ? 'modele' : +d.k;
  const base = k === 'modele' ? Gm.plan(c).modele : Gm.programmeDe(M_, c, k);
  PROG = {k, p:{nom:base.nom, jours:base.jours.slice(), int:base.int, ateliers:{...(base.ateliers || {})}}}; ficheProg(); };
ACT.progModele = d => { const x = G().MODELES[d.m]; PROG.p.nom = x.nom; PROG.p.jours = x.jours.slice(); PROG.p.int = x.int; ficheProg(); };
ACT.progInt = d => { PROG.p.int = +d.v; ficheProg(); };
ACT.progRendre = () => { G().definirSemaine(M(), PROG.k, null); PROG = null; fermerFeuille(); sauver(); rendre(); toast('Ton adjoint reprend cette semaine'); };
ACT.progOk = d => { const M_ = M(), Gm = G(), p = {...PROG.p, nom:PROG.p.nom || 'Programme perso'};
  if (PROG.k === 'modele') Gm.definirModele(M_, p);
  else for (let i = 0; i < (+d.n || 1); i++){ const k = PROG.k + i; if (M_.calendrier[k] && M_.calendrier[k].type !== 'bilan') Gm.definirSemaine(M_, k, p); }
  PROG = null; fermerFeuille(); sauver(); rendre(); toast('Programme enregistré'); };
ACT.planAuto = d => { G().modeAuto(M(), d.v === '1'); sauver(); rendre(); };
document.addEventListener('change', e => { const t = e.target;
  if (t.dataset.chg === 'seance' && PROG){ PROG.p.jours[+t.dataset.i] = t.value; PROG.p.nom = 'Programme perso'; ficheProg(); }
  if (t.dataset.chg === 'atelier' && PROG){ PROG.p.ateliers[t.dataset.p] = t.value; ficheProg(); }
  if (t.dataset.chg === 'budgetRech'){ U.budgetRech = +t.value; rendre(); }
  if (t.dataset.chg === 'numero'){ const c = moi(), j = M().joueurs[t.dataset.j], n = Math.round(+t.value);
    if (!j || !(n >= 1 && n <= 99)){ ficheNumeros('Choisis un numéro entre 1 et 99.'); return; }
    const autre = c.effectif.map(id => M().joueurs[id]).find(x => x && x !== j && x.num === n), ancien = j.num;
    j.num = n; if (autre) autre.num = ancien ?? window.QMC.numLibre(M(), c);
    sauver(); rendre(); ficheNumeros(autre ? `${nomJ(j)} prend le ${n} ; ${nomJ(autre)} récupère le ${autre.num}.` : `${nomJ(j)} portera le ${n}.`); }
});

/* ============================== v92 : menu de tous les écrans (barre à gauche sur grand écran, tiroir ☰ sur téléphone) ============================== */
function MENU(){
  const M_ = M(), mg = M_.manager, cl = !!mg.club, nl = nonLus(), ouvert = cl && C.mercatoOuvert(window.QM.semaine(M_));
  const G_ = [
    ['Mon club', [['accueil', 'Accueil', '🏠'], ['hall', 'Le château', '🏰', '', 1], ['grandesalle', 'La grande salle', '🕯️', '', 1], ['boite', 'Boîte de réception', '✉️', nl || ''], ['calendrier', 'Calendrier', '📅', '', 1]]],
    ['Équipe', [['equipe', 'Le vestiaire', '🚪', '', 1], ['effectif', 'Effectif', '👥', '', 1], ['tactique', 'Tactique', '🧭', '', 1], ['entrainement', 'Entraînement', '🏃', '', 1], ['progression', 'Progression des joueurs', '📈', '', 1], ['vestiaire', 'Vestiaire et mentorat', '🛋️', '', 1], ['formation', 'Poudlard (formation)', '🎓', '', 1], ...(mg.selection ? [['selection', 'Sélection', '🏆']] : [])]],
    ['Recrutement', [['recrutement', 'Le bureau', '🗂️', '', 1], ['mercato', 'Mercato', '🦉', ouvert ? '●' : '', 1], ['clubs', 'Clubs et joueurs', '🔭'], ['staff', 'Staff', '🧙', '', 1]]],
    ['Domaine', [['club', 'Carte du domaine', '🏰', '', 1], ['direction', 'Bureau du président', '🏛️', '', 1], ['finances', 'Finances et banque', '💰', '', 1], ['boutique', 'Bazar', '🛍️', '', 1], ['partenaires', 'Partenaires', '🤝', '', 1], ['domaine', 'Bâtiments', '🧱', '', 1], ['trophees', 'Salle des trophées', '🏆', '', 1]]],
    ['Stade', [['entree', 'Entrée du stade', '🎟️', '', 1], ['stade', 'Tribunes', '🏟️', '', 1], ['buvette', 'La buvette', '🍺', '', 1]]],   // v133
    ['Compétitions', [['federation', 'La Fédération', '🏛️'], ['classements', 'Classements', '📊']]],
    ['Moi', [['salon', 'Mon salon', '🛋️'], ['profil', 'Mon profil', '🧑'], ['carriere', 'Carrière', '🧭']]],
    ['Partie', [['sauvegardes', 'Sauvegardes', '💾'], ['aide', 'Règles et réglages', '⚙️'], ['quitterKiosk', 'Quitter vers KiosK', '⏏︎', '', 0, 1]]],
  ];
  return G_.map(([g, L]) => [g, L.filter(x => cl || !x[4])]).filter(([, L]) => L.length);
}
/* v99 : icônes illustrées (images/qm27/icones/<vue>.webp) ; l'emoji reste en secours si l'image manque */
const ICONES = new Set(['progression', 'recrutement', 'equipe', 'accueil', 'boite', 'calendrier', 'effectif', 'tactique', 'entrainement', 'vestiaire', 'formation', 'selection', 'mercato', 'clubs', 'staff', 'club',
  'direction', 'finances', 'stade', 'boutique', 'partenaires', 'domaine', 'trophees', 'classements', 'profil', 'carriere', 'sauvegardes', 'aide', 'quitterKiosk', 'presse', 'reunion']);
const icoVue = (v, secours, cls) => ICONES.has(v) ? `<img class="${cls || ''}" src="${V.IMAGES}icones/${v}.webp" alt="" width="22" height="22" decoding="async" draggable="false" onerror="this.replaceWith(document.createTextNode('${secours}'))">` : secours;
Z.icoVue = icoVue;
const GROUPE_DE = {vestiaire:'effectif', clubFiche:'clubs', match:'accueil'};
function menuHTML(){
  const act = GROUPE_DE[U.vue] && !MENU().some(([, L]) => L.some(x => x[0] === U.vue)) ? GROUPE_DE[U.vue] : U.vue;
  return MENU().map(([g, L]) => `<div class="mg-g"><h3>${g}</h3>${L.map(([v, n, ico, b, , direct]) => `<button class="mg-l ${act === v ? 'on' : ''}" ${direct ? `data-act="${v}"` : `data-act="vue" data-v="${v}"`} ${act === v ? 'aria-current="page"' : ''}><span class="mg-i" aria-hidden="true">${icoVue(v, ico)}</span><span class="mg-n">${n}</span>${b ? `<i class="mg-b">${b}</i>` : ''}</button>`).join('')}</div>`).join('');
}
function majMenu(){
  const enJeu = !!(M() && M().manager) && U.vue !== 'match';
  let a = document.getElementById('menuG');
  if (!a){ a = document.createElement('nav'); a.id = 'menuG'; a.setAttribute('aria-label', 'Tous les menus'); document.body.appendChild(a); }
  a.innerHTML = enJeu ? menuHTML() : '';
  const t = document.querySelector('.tiroir-fond'); if (t) fermerTiroir();
}
function fermerTiroir(){ const t = document.querySelector('.tiroir-fond'); if (t) t.remove(); const b = document.getElementById('hdMenu'); if (b) b.setAttribute('aria-expanded', 'false'); }
ACT.menu = () => {
  if (document.querySelector('.tiroir-fond')) return fermerTiroir();
  retirerFeuille();
  const f = document.createElement('div'); f.className = 'tiroir-fond';
  f.innerHTML = `<nav class="tiroir" aria-label="Tous les menus"><div class="tiroir-t"><b>Menus</b><button class="fermer" data-act="fermerTiroir" aria-label="Fermer">✕</button></div>${menuHTML()}</nav>`;
  f.addEventListener('click', e => { if (e.target === f) fermerTiroir(); });
  document.body.appendChild(f); const b = document.getElementById('hdMenu'); if (b) b.setAttribute('aria-expanded', 'true');
  const on = f.querySelector('.mg-l.on'); if (on) on.scrollIntoView({block:'center'});
};
ACT.fermerTiroir = fermerTiroir;
addEventListener('keydown', e => { if (e.key === 'Escape') fermerTiroir(); });
/* v139 : les panoramas s'ouvrent centrés, puis gardent leur position d'un rendu à l'autre */
const PANO_X = {};
function panoramas(){
  for (const el of document.querySelectorAll('.sc-pano:not([data-ok])')){
    el.dataset.ok = 1; const l = el.dataset.l, max = el.scrollWidth - el.clientWidth;
    if (max > 0) el.scrollLeft = PANO_X[l] ?? max / 2;
    el.addEventListener('scroll', () => { PANO_X[l] = el.scrollLeft; }, {passive:true});
  }
}
Z.apresRendu = () => { majMenu(); panoramas(); };
/* v139 : l'accueil affiche la scène du stade en tête (vueAccueil, qm27-ui.js) */
Z.sceneStade = () => { try { return sceneDispo('accueil') ? sceneHTML('accueil') : ''; } catch(e){ return ''; } };
Z.apresStade = () => { if (VUE.querySelector('.scene')) V.colorierProduits(VUE, moi()); };

/* ============================== Enregistrement ============================== */
Object.assign(VUES, {entree:vueEntree, hall:vueHall, bureaux:vueBureaux, grandesalle:vueGrandeSalle, soussol:vueSoussol, salon:vueSalon, federation:vueFederation, progression:vueProgression, recrutement:vueRecrutement, equipe:vueEquipe, club:vueClubCarte, direction:vueDirection, profil:vueProfil, trophees:vueTrophees, boite:vueBoite, plus:vuePlus, effectif:vueEffectif, clubs:vueClubs, clubFiche:vueClubFiche, calendrier:vueCalendrier, entrainement:vueEntrainement});
if (Z.M && Z.M.manager) rendre(); else majMenu();
})();
