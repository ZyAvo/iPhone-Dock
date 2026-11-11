// mon-ecran-version: ee23d529
/* QM27 (v91, lot 8) — écrans du domaine et du bureau. Chargé après qm27-ui.js, dont il reçoit la boîte à outils (window.QMU).
   Carte du domaine (accueil Club) et ses lieux, bureau du président, profil du manager, salle des trophées et records,
   boîte de réception, effectif en colonnes, annuaire des clubs, calendrier par mois et par saison, entraînement programmable, menu Plus. */
(() => {
'use strict';
const Z = window.QMU; if (!Z) return;
const {D, E, C, V, B, esc, eur, fmtDate, lab, club, nat, blason, avatarDe, flag, posteB, etoiles, nomJ, classeNote, toast, feuille, fermerFeuille, retirerFeuille, teteF, sauver, rendre, aller, ficheJoueur, noteVue, connu, HH, roleDe, VUES, ACT, VUE, U, LS} = Z;
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
  stade:{nom:'Stade', sous:'Tactique, tribunes, Bazar', x:180, y:200, e:1.35, py:40},
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
    stade:[['tactique', 'Tactique', 'Composition, dispositions, consignes'], ['stade', 'Stade et tribunes', `${c.stade.toLocaleString('fr-FR')} places`], ['boutique', 'Le Bazar', 'Produits et prix'], ['partenaires', 'Partenaires', c.dom && c.dom.sponsor ? esc(c.dom.sponsor.nom) : 'Sponsor à choisir']],
    direction:[['direction', 'Bureau du président', `Objectif : ${esc(mg.objectif.txt.toLowerCase())} · confiance ${mg.confiance} %`], ['profil', 'Mon profil', 'Avatar, attributs, contrat'], ['carriere', 'Carrière', `Réputation ${Math.round(mg.rep)} · offres`],
      ...(mg.selection ? [['selection', 'Sélection', `${esc(nat(mg.selection.nat).nom)} · ${esc(D.TOURNOI.nom)}`]] : [])],
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
function carteDomaine(){
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
function vueDirection(){
  const M_ = M(), mg = M_.manager, c = moi(), o = mg.objectif, p = G() ? G().profil(M_) : null, ct = p && p.contrat;
  const CL = window.QM.classement(M_, c.ligue), pos = CL.findIndex(r => r.id === c.id) + 1;
  const humeur = mg.confiance >= 70 ? 'Le président est ravi.' : mg.confiance >= 45 ? 'Le président est serein.' : mg.confiance >= 25 ? 'Le président s\'impatiente.' : 'Le président doute sérieusement de toi.';
  VUE.innerHTML = `<div><h1 class="grand">Bureau du président</h1><p class="sous">Tour du directeur · ${esc(c.nom)}</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Objectif de la saison</h2><p style="margin:0 0 6px"><b>${esc(o.txt)}</b></p><p class="petit mut" style="margin:0 0 10px">Aujourd'hui : ${pos}${pos === 1 ? 'er' : 'e'} de la ${esc(M_.ligues[c.ligue].nom)}${mg.bilan ? ` · ${mg.bilan.g} V · ${mg.bilan.n} N · ${mg.bilan.p} D` : ''}.</p>
      <div class="ligne"><span style="flex:1">Confiance</span><b>${mg.confiance} %</b></div>${jauge(mg.confiance, 'Confiance du président')}
      <p class="petit mut" style="margin:8px 0 0">${humeur} Il juge chaque résultat selon la force de l'adversaire.</p>
      ${c.dom ? `<div class="sep"></div><div class="ligne"><span style="flex:1">Supporters</span><b>${Math.round(c.dom.supp)} / 100</b></div>${jauge(c.dom.supp, 'Humeur des supporters')}` : ''}</div>
    <div class="carte"><h2>Finances <button data-act="vue" data-v="finances">Détail</button></h2>
      <div class="stat" style="grid-template-columns:1fr auto"><span style="text-align:left;font-weight:400">Solde</span><b style="color:${c.budget < 0 ? 'var(--mauvais)' : 'inherit'}">${eur(c.budget)}</b>
      <span style="text-align:left;font-weight:400">Masse salariale</span><b>${eur(C.masse(M_, c))} / ${eur(c.masseMax)} par sem.</b></div></div>
  </div><div>
    ${ct ? `<div class="carte"><h2>Ton contrat</h2><div class="stat" style="grid-template-columns:1fr auto">
      <span style="text-align:left;font-weight:400">Salaire</span><b>${eur(ct.sal)} / semaine</b>
      <span style="text-align:left;font-weight:400">Jusqu'à la fin de la saison</span><b>${lab(ct.fin)}</b>
      <span style="text-align:left;font-weight:400">Arrivé en</span><b>${lab(ct.debut)}</b></div>
      <p class="petit mut" style="margin:8px 0 0">En fin de contrat, le président prolonge si sa confiance tient (35 % au moins).</p></div>` : ''}
    <div class="carte"><h2>Réputation</h2><div class="ligne"><span style="flex:1">${esc(mg.nom)}</span><b>${Math.round(mg.rep)} / 100</b></div>${jauge(mg.rep, 'Réputation')}</div>
    <div class="liste carte">${[['profil', 'Mon profil', 'Avatar, attributs, parcours'], ['carriere', 'Carrière', 'Offres de clubs et de fédérations'], ['partenaires', 'Partenaires', 'Sponsor maillot et panneaux']].map(([v, n, s]) => `<button class="el" data-act="vue" data-v="${v}"><div class="t"><b>${n}</b><span>${s}</span></div><span class="d mut">›</span></button>`).join('')}</div>
  </div></div>`;
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
Z.avatarMgr = avatarMgr;
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
      <div class="sep"></div><div class="liste">${(mg.postes || []).slice().reverse().map(x => `<div class="el">${blason(x.club, 'p')}<div class="t"><b>${esc(club(x.club).nom)}</b><span>${lab(x.debut)}${x.fin != null ? ' → ' + lab(x.fin) : ' → aujourd\'hui'}</span></div></div>`).join('')}</div></div>
  </div></div>`;
}
ACT.pointMgr = d => { const p = G().profil(M()); if (p.fige) return; p.pool = p.pool || 0; const k = d.k, v = p.attrs[k];
  if (+d.d < 0 && v > 1){ p.attrs[k]--; p.pool++; } else if (+d.d > 0 && p.pool > 0 && v < 20){ p.attrs[k]++; p.pool--; }
  sauver(); rendre(); };
let EDIT = null;
function ficheProfil(){
  const p = G().profil(M()), mg = M().manager, L = EDIT.look;
  const nuancier = (cle, liste) => `<div class="nuancier">${liste.map(x => `<button class="pastille-c ${L[cle] === x ? 'on' : ''}" style="background:${x}" data-act="lookMgr" data-k="${cle}" data-v="${x}" aria-label="${cle} ${x}"></button>`).join('')}</div>`;
  const choix = (cle, liste) => `<div class="chips">${liste.map(([v, n]) => `<button class="chip ${String(L[cle] ?? '') === String(v) ? 'on' : ''}" data-act="lookMgr" data-k="${cle}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const apercu = avatarDe({...persoMgr(), nat:EDIT.nat, age:EDIT.age, look:L}, 'g', mg.club || null);
  feuille(`${teteF('Mon profil', 'Nom, âge, nationalité, apparence')}
    <div class="ligne" style="gap:14px;align-items:center"><span class="avp g">${apercu}</span><div style="flex:1;min-width:0">
      <label class="petit mut" for="nomEdit">Nom</label><input class="champ" id="nomEdit" maxlength="30" value="${esc(EDIT.nom)}">
      <div class="ligne" style="margin-top:8px;gap:8px"><span class="petit mut">Âge</span><button class="mini-b" data-act="ageMgr" data-d="-1">−</button><b>${EDIT.age}</b><button class="mini-b" data-act="ageMgr" data-d="1">+</button></div></div></div>
    <h4 class="sous-t">Nationalité</h4><div class="chips">${D.SIX_NATIONS.map(n => `<button class="chip ${EDIT.nat === n ? 'on' : ''}" data-act="natMgr" data-n="${n}">${flag(n)} ${esc(nat(n).nom)}</button>`).join('')}</div>
    <h4 class="sous-t">Peau</h4>${nuancier('peau', LOOK.peau)}
    <h4 class="sous-t">Cheveux</h4>${nuancier('cheveux', LOOK.cheveux)}${choix('coupe', LOOK.coupe)}
    <h4 class="sous-t">Barbe</h4>${choix('barbe', LOOK.barbe)}
    <h4 class="sous-t">Chapeau de sorcier</h4>${choix('chapeau', LOOK.chapeau)}
    <h4 class="sous-t">Expression et lunettes</h4>${choix('sourire', LOOK.sourire)}<div class="chips"><button class="chip ${L.lunettes ? 'on' : ''}" data-act="lookMgr" data-k="lunettes" data-v="${L.lunettes ? '' : '1'}">Lunettes</button><button class="chip" data-act="lookMgr" data-k="hasard" data-v="1">Au hasard</button></div>
    <div class="btns" style="margin-top:14px"><button class="btn sec" data-act="fermer">Annuler</button><button class="btn" data-act="sauverProfil">Enregistrer</button></div>`);
  const n = document.getElementById('nomEdit'); if (n) n.addEventListener('input', e => { EDIT.nom = e.target.value; });
}
ACT.editerProfil = () => { const p = G().profil(M()), mg = M().manager; EDIT = {nom:mg.nom, age:p.age, nat:p.nat, look:{...(p.look || {})}}; ficheProfil(); };
ACT.lookMgr = d => { const L = EDIT.look;
  if (d.k === 'hasard'){ const r = Math.random; EDIT.look = {peau:LOOK.peau[r() * 6 | 0], cheveux:LOOK.cheveux[r() * 9 | 0], coupe:LOOK.coupe[r() * 10 | 0][0], barbe:LOOK.barbe[r() * 5 | 0][0], chapeau:r() < 0.4 ? LOOK.chapeau[1 + (r() * 4 | 0)][0] : '', sourire:LOOK.sourire[r() * 3 | 0][0], lunettes:r() < 0.3}; }
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
    corps = `<div class="carte">${H.length ? `<div class="liste">${H.map(h => `<div class="el"><div class="t"><b>${esc(h.saison)}</b><span>${Object.values(M_.ligues).map(L => esc(club(h.champions[L.id]).nom)).join(' · ')} · ${esc(D.TOURNOI.court)} : ${flag(h.sixn)} ${esc(nat(h.sixn).nom)}${h.manager ? ` · toi : ${h.manager.pos}e avec ${esc(club(h.manager.club).nom)}` : ''}</span></div></div>`).join('')}</div>` : '<p class="mut" style="margin:0">Aucune saison terminée pour l\'instant.</p>'}</div>`; }
  VUE.innerHTML = `<div><h1 class="grand">Salle des trophées</h1><p class="sous">${esc(c.nom)}</p></div>${tabs}${corps}`;
}
ACT.troph = d => { U.troph = d.o; rendre(); };
ACT.recLigue = d => { U.recLigue = d.l; rendre(); };
ACT.palmares = () => { U.troph = 'palmares'; aller('trophees'); };

/* ============================== Boîte de réception ============================== */
const CAT = {pres:'Président', staff:'Staff', club:'Club', mercato:'Mercato', bless:'Infirmerie', sixn:'Tournoi', carriere:'Carrière', presse:'Presse', formation:'Formation', info:'Divers'};
const ICO_MSG = {pres:'🏛️', staff:'🧙', club:'🏰', mercato:'🦉', bless:'✚', sixn:'🏆', carriere:'🧭', presse:'🗞️', formation:'🎓', info:'✉️'};
const nonLus = () => (M() ? M().boite.filter(m => !m.lu).length : 0);
Z.nonLus = nonLus;
function vueBoite(){
  const M_ = M(), f = U.boiteF || 'tous';
  const L = M_.boite.filter(m => f === 'tous' || (f === 'nonlus' ? !m.lu : (m.type || 'info') === f));
  const types = [...new Set(M_.boite.map(m => m.type || 'info'))];
  VUE.innerHTML = `<div><h1 class="grand">Boîte de réception</h1><p class="sous">${plur(M_.boite.length, 'message')} · ${plur(nonLus(), 'non lu')}</p></div>
  <div class="chips filtres-boite">${[['tous', 'Tous'], ['nonlus', `Non lus${nonLus() ? ' (' + nonLus() + ')' : ''}`], ...types.map(t => [t, CAT[t] || t])].map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="boiteF" data-f="${k}">${n}</button>`).join('')}</div>
  <div class="btns" style="margin-bottom:10px"><button class="btn sec" data-act="toutLu" ${nonLus() ? '' : 'disabled'}>Tout marquer lu</button><button class="btn sec" data-act="supprLus" ${M_.boite.some(m => m.lu) ? '' : 'disabled'}>Supprimer les messages lus</button></div>
  <div class="carte"><div class="liste">${L.map(m => `<div class="el msg-l ${m.lu ? '' : 'neuf'}"><button class="msg-b" data-act="lireMsg" data-id="${m.id}"><span class="ico-msg" aria-hidden="true">${ICO_MSG[m.type] || '✉️'}</span><div class="t"><b>${esc(m.titre)}</b><span>${m.date ? fmtDate(m.date) + ' · ' : ''}${esc(String(m.corps).slice(0, 110))}${String(m.corps).length > 110 ? '…' : ''}</span></div></button>
    <button class="mini-b corb" data-act="supprMsg" data-id="${m.id}" aria-label="Supprimer ce message">✕</button></div>`).join('') || '<p class="mut" style="margin:0">Rien ici.</p>'}</div></div>`;
}
const msgDe = id => M().boite.find(m => m.id === id);
ACT.boite = () => aller('boite');
ACT.boiteF = d => { U.boiteF = d.f; rendre(); };
ACT.lireMsg = d => { const m = msgDe(d.id); if (!m) return; m.lu = true; sauver();
  feuille(`${teteF(esc(m.titre), `${m.date ? fmtDate(m.date, true) + ' · ' : ''}${CAT[m.type] || 'Message'}`)}<p style="white-space:pre-line;margin:0 0 14px">${esc(m.corps)}</p>
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
  const el = (act, v, ico, t, s) => `<button class="el" data-act="${act}" ${v ? `data-v="${v}"` : ''}><span class="blason nat p">${ico}</span><div class="t"><b>${t}</b><span>${s}</span></div><span class="d mut">›</span></button>`;
  VUE.innerHTML = `<div><h1 class="grand">Plus</h1></div>
  <div class="carte"><div class="liste">
    ${el('vue', 'boite', '✉️', `Boîte de réception${n ? ` <span class="badge neuf">${n}</span>` : ''}`, plur(M_.boite.length, 'message'))}
    ${mg.club ? el('vue', 'calendrier', '📅', 'Calendrier', 'Mois, saison, mercatos, tournoi') : ''}
    ${el('vue', 'classements', '📊', 'Classements', `Les 3 ligues et le ${esc(D.TOURNOI.nom)}`)}
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
const VUES_EFF = {
  general:{nom:'Général', cols:[['note', 'Note', 44], ['forme', 'Forme', 40], ['moral', 'Moral', 42]]},
  scout:{nom:'Estimation', cols:[['note', 'Note', 62], ['pot', 'Pot.', 40], ['valeur', 'Valeur', 58]]},
  contrats:{nom:'Contrats', cols:[['sal', 'Salaire', 54], ['fin', 'Fin', 46], ['valeur', 'Valeur', 58]]},
  physique:{nom:'Physique', cols:[['fat', 'Fatigue', 52], ['forme', 'Forme', 40], ['bless', 'Dispo', 44]]},
  saison:{nom:'Saison', cols:[['m', 'MJ', 30], ['stat', 'Stat', 50], ['moy', 'Moy.', 38]]},
};
const statut = (K, id) => { for (const p of ['P', 'B', 'A', 'G']) if (K[p].includes(id)) return ['T', 'tit', 'Titulaire']; const i = K.banc.indexOf(id); return i >= 0 ? ['R' + (i + 1), 'rem', 'Remplaçant ' + (i + 1)] : ['–', 'res', 'Réserve']; };
function valeurCol(j, k, ctx){
  const M_ = M(), s = j.saison || {};
  switch (k){
    case 'note': { const v = ctx.vue ? noteVue(j, j.poste) : {txt:window.QM.note(j), mid:window.QM.note(j), exact:true}; return [v.mid, `<span class="note ${classeNote(v.mid)}${v.exact ? '' : ' flou'}">${v.txt}</span>`]; }
    case 'forme': return [j.forme, `<span class="${j.forme >= 7 ? 'bon' : j.forme < 5 ? 'mauvais' : ''}">${(Math.round(j.forme * 10) / 10).toLocaleString('fr-FR')}</span>`];
    case 'moral': return [j.moral, `<span class="${j.moral >= 70 ? 'bon' : j.moral < 40 ? 'mauvais' : ''}">${Math.round(j.moral)}</span>`];
    case 'fat': return [j.fat, `<span class="${j.fat >= 60 ? 'mauvais' : j.fat >= 35 ? 'moyen' : ''}">${Math.round(j.fat)} %</span>`];
    case 'sal': return [j.contrat ? j.contrat.sal : 0, j.contrat ? eur(j.contrat.sal).replace(' €', ' €') : '—'];
    case 'fin': return [j.contrat ? j.contrat.fin : 0, j.contrat ? `<span class="${j.contrat.fin <= M_.saison ? 'mauvais' : ''}">${lab(j.contrat.fin).slice(2)}</span>` : '—'];
    case 'pot': { const v = C.potentielEstime(M_, j); return [v, `${v}<span class="etoiles petit">★</span>`]; }
    case 'valeur': { const v = C.valeur(M_, j); return [v, eur(v)]; }
    case 'bless': return [j.bless ? j.bless.jours : j.inter ? 0.5 : 0, j.bless ? `<span class="mauvais">${j.bless.jours} j</span>` : j.inter ? '<span class="moyen" title="En sélection">✈︎</span>' : '—'];
    case 'm': return [s.m || 0, s.m || 0];
    case 'stat': { const v = j.poste === 'P' ? s.b : j.poste === 'B' ? s.cog : j.poste === 'A' ? s.v : s.arr; return [v || 0, `${v || 0}<span class="mut petit"> ${({P:'b', B:'cog', A:'vif', G:'arr'})[j.poste]}</span>`]; }
    case 'moy': { const v = s.m ? s.notes / s.m : 0; return [v, v ? (Math.round(v * 10) / 10).toLocaleString('fr-FR') : '—']; }
  }
  return [0, ''];
}
/* tableau de joueurs : ctx = {vue:'general'…, tri, sens, liste, K (composition, pour le statut), autre (club adverse : notes estimées), act} */
function tableJoueurs(L, ctx){
  const V_ = VUES_EFF[ctx.vue], tri = ctx.tri || 'poste', sens = ctx.sens || 1;
  const rows = L.map(j => ({j, v:Object.fromEntries(V_.cols.map(([k]) => [k, valeurCol(j, k, ctx)]))}));
  const ord = {P:0, B:1, A:2, G:3};
  rows.sort((a, b) => tri === 'poste' ? ord[a.j.poste] - ord[b.j.poste] || (b.v.note ? b.v.note[0] - a.v.note[0] : window.QM.note(b.j) - window.QM.note(a.j))
    : tri === 'nom' ? sens * a.j.n.localeCompare(b.j.n, 'fr') : tri === 'age' ? sens * (a.j.age - b.j.age) : sens * ((b.v[tri] || [0])[0] - (a.v[tri] || [0])[0]));
  const th = (k, n, w) => `<button class="th ${tri === k ? 'on' : ''}" style="${w ? 'width:' + w + 'px' : ''}" data-act="${ctx.act || 'effTri'}" data-t="${k}">${n}${tri === k ? (sens > 0 ? ' ▾' : ' ▴') : ''}</button>`;
  return `<div class="tj" role="table"><div class="tj-h" role="row">${th('poste', 'Poste', 40)}${th('nom', 'Joueur')}${th('age', 'Âge', 34)}${V_.cols.map(([k, n, w]) => th(k, n, w)).join('')}</div>
    ${rows.map(({j, v}) => { const st = ctx.K ? statut(ctx.K, j.id) : null, U_ = moi();
      return `<button class="tj-l ${j.bless || j.inter ? 'indispo' : ''}" role="row" data-act="joueur" data-j="${j.id}">
        <span style="width:40px" class="tj-p">${posteB(j.poste)}${st ? `<i class="st ${st[1]}" title="${st[2]}">${st[0]}</i>` : ''}</span>
        <span class="tj-n">${ctx.nat && j.nat === ctx.nat ? '' : flag(j.nat)}<b>${j.num != null && ctx.K ? `<span class="num">${j.num}</span>` : ''}${esc(j.p[0])}. ${esc(j.n)}</b>${j.pret ? '<i class="tag">prêt</i>' : ''}${U_ && U_.aVendre.includes(j.id) ? '<i class="tag">vente</i>' : ''}${!ctx.K && U_ && U_.suivi.includes(j.id) ? '<i class="tag or">suivi</i>' : ''}${j.inter ? '<i class="tag">✈︎ sél.</i>' : ''}</span>
        <span style="width:34px" class="tj-c">${j.age}</span>
        ${V_.cols.map(([k, , w]) => `<span class="tj-c" style="width:${w}px">${v[k][1]}</span>`).join('')}</button>`; }).join('') || '<p class="mut" style="padding:10px">Personne ici.</p>'}</div>`;
}
Z.tableJoueurs = tableJoueurs;
const EFF = Object.assign({vue:'general', tri:'poste', sens:1, poste:'tous'}, LS.lire('qm27:effectif', {}));
function vueEffectif(){
  const c = moi(), K = c.compo;
  let L = c.effectif.map(id => M().joueurs[id]).filter(Boolean);
  if (EFF.poste === 'bless') L = L.filter(j => j.bless || j.inter); else if (EFF.poste !== 'tous') L = L.filter(j => j.poste === EFF.poste);
  const masse = C.masse(M(), c);
  VUE.innerHTML = `<div><h1 class="grand">Effectif</h1><p class="sous">${plur(c.effectif.length, 'joueur')} · masse salariale ${eur(masse)} / ${eur(c.masseMax)} par semaine</p></div>
  <div class="onglets" role="tablist">${Object.entries(VUES_EFF).filter(([k]) => k !== 'scout').map(([k, x]) => `<button role="tab" class="${EFF.vue === k ? 'on' : ''}" aria-selected="${EFF.vue === k}" data-act="effVue" data-v="${k}">${x.nom}</button>`).join('')}</div>
  <div class="chips petites">${[['tous', 'Tous'], ['P', 'Pours.'], ['B', 'Batteurs'], ['A', 'Attrap.'], ['G', 'Gardiens'], ['bless', 'Absents']].map(([k, n]) => `<button class="chip ${EFF.poste === k ? 'on' : ''}" data-act="effPoste" data-p="${k}">${n}</button>`).join('')}</div>
  <div class="carte tj-carte">${tableJoueurs(L, {vue:EFF.vue, tri:EFF.tri, sens:EFF.sens, K, nat:c.nat})}</div>
  <p class="petit mut">T titulaire · R1-R5 remplaçants · – réserve · ✈︎ en sélection. Touche un en-tête pour trier, un joueur pour sa fiche.</p>`;
}
const garderEff = () => LS.ecrire('qm27:effectif', {vue:EFF.vue, tri:EFF.tri, sens:EFF.sens});
ACT.effVue = d => { EFF.vue = d.v; if (!['poste', 'nom', 'age'].includes(EFF.tri) && !VUES_EFF[d.v].cols.some(c => c[0] === EFF.tri)) EFF.tri = 'poste'; garderEff(); rendre(); };
ACT.effPoste = d => { EFF.poste = d.p; rendre(); };
ACT.effTri = d => { if (EFF.tri === d.t) EFF.sens = -EFF.sens; else { EFF.tri = d.t; EFF.sens = 1; } garderEff(); rendre(); };

/* ============================== Clubs et joueurs ============================== */
function vueClubs(){
  const M_ = M(), l = U.clubsL || (M_.manager.club ? moi().ligue : 'bi'), L = M_.ligues[l], CL = window.QM.classement(M_, l), Gm = G();
  const mis = Gm ? Gm.missions(M_) : [];
  VUE.innerHTML = `<div><h1 class="grand">Clubs et joueurs</h1><p class="sous">48 clubs · tous les effectifs. Les notes des autres clubs sont des estimations tant que ton recruteur ne connaît pas bien les joueurs.</p></div>
  ${mis.length ? `<div class="carte"><h2>Missions du recruteur <span class="mut">${mis.length} / ${Gm.MAX_MISSIONS}</span></h2><div class="liste">${mis.map((m, i) => `<div class="el">${m.type === 'club' ? blason(m.cible, 'p') : '<span class="blason nat p">🔭</span>'}<div class="t"><b>${m.type === 'club' ? esc(club(m.cible).nom) : m.type === 'ligue' ? esc(M_.ligues[m.cible].nom) : 'Agents libres'}</b><span>encore ${plur(Math.max(0, m.duree - ((M_.tic || 0) - m.debut)), 'semaine')} · rapport à la fin</span></div><button class="btn sec" data-act="finMission" data-i="${i}">Arrêter</button></div>`).join('')}</div></div>` : ''}
  <div class="seg">${Object.values(M_.ligues).map(x => `<button data-act="clubsL" data-l="${x.id}" class="${x.id === l ? 'on' : ''}">${esc(x.court)}</button>`).join('')}</div>
  <div class="carte"><div class="liste">${CL.map((r, i) => { const c = club(r.id);
    return `<button class="el" data-act="ficheClub" data-c="${c.id}">${blason(c.id)}<div class="t"><b>${i + 1}. ${esc(c.nom)}${c.id === M_.manager.club ? ' <span class="badge tit">toi</span>' : ''}</b><span>${flag(c.nat)} ${esc(c.ville)} · ${r.pts} pts · ${plur(c.effectif.length, 'joueur')}</span></div><div class="d">${etoiles(c.rep)}</div></button>`; }).join('')}</div></div>
  ${M_.manager.club ? `<button class="btn sec plein" data-act="mission" data-t="ligue" data-c="${l}">Envoyer le recruteur sur la ${esc(L.court)} (8 semaines)</button><div style="height:8px"></div><button class="btn sec plein" data-act="mission" data-t="libres" data-c="libres">Passer les agents libres au crible (8 semaines)</button>` : ''}`;
}
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
  <div class="onglets" role="tablist">${[mien ? 'general' : 'scout', 'contrats', 'saison'].map(k => `<button role="tab" class="${FC.vue === k ? 'on' : ''}" data-act="fcVue" data-v="${k}">${VUES_EFF[k].nom}</button>`).join('')}</div>
  <div class="carte tj-carte">${tableJoueurs(L, {vue:mien && FC.vue === 'scout' ? 'general' : !mien && FC.vue === 'general' ? 'scout' : FC.vue, tri:FC.tri, sens:FC.sens, K:mien ? c.compo : null, act:'fcTri', nat:c.nat})}</div>
  <p class="petit mut">Notes estimées par ton recruteur (fourchettes en gris). Touche un joueur pour sa fiche : « Superviser » pour le suivre de près.</p>`;
}
ACT.ficheClub = d => { U.clubVu = d.c; retirerFeuille(); if (Z.U.vue === 'clubFiche') rendre(); else aller('clubFiche'); };
ACT.clubsL = d => { U.clubsL = d.l; rendre(); };
ACT.fcVue = d => { FC.vue = d.v; if (!['poste', 'nom', 'age'].includes(FC.tri)) FC.tri = 'poste'; rendre(); };
ACT.fcTri = d => { if (FC.tri === d.t) FC.sens = -FC.sens; else { FC.tri = d.t; FC.sens = 1; } rendre(); };
ACT.mission = d => { const r = G().lancerMission(M(), d.t, d.c); toast(r.msg); if (r.ok){ sauver(); rendre(); } };
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
    for (let d = 6; d >= 0; d--){ const x = get(S.date - d * 864e5); if (C.mercatoOuvert(S)) x.bandes.add('mercato'); if (S.type === 'prepa') x.bandes.add('prepa'); if (S.tour) x.bandes.add('tournoi'); }
    const x = get(S.date); x.k = k; x.S = S;
    for (const m of S.matchs) if ((cid && (m.dom === cid || m.ext === cid)) || (n && m.ligue === 'sixn' && (m.dom === n || m.ext === n))) x.matchs.push(m);
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
      return `<span class="mm ${r.v}">${r.sx ? flag(r.adv) : blason(r.adv, 'p')}<small>${r.txt || (r.dom ? 'dom.' : 'ext.')}</small></span>`; }).join('') : ''}${x && x.S && x.S.tour && !(m || []).some(mm => mm.ligue === 'sixn') ? `<span class="tn" title="${esc(D.TOURNOI.nom)}">🏆</span>` : ''}</${x && x.k != null && m && m.length ? 'button' : 'span'}>`;
  }
  return h + '</div>';
}
function vueCalendrier(){
  const M_ = M(), mg = M_.manager, J = evenementsSaison(), S = window.QM.semaine(M_) || M_.calendrier[M_.calendrier.length - 1];
  const mode = U.calMode || 'mois';
  const moisListe = []; { let d = new Date(M_.calendrier[0].date); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const fin = M_.calendrier[M_.calendrier.length - 1].date;
    while (d.getTime() <= fin){ moisListe.push([d.getUTCFullYear(), d.getUTCMonth()]); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } }
  if (U.calMois == null){ const d = new Date(S.date); U.calMois = Math.max(0, moisListe.findIndex(([a, m]) => a === d.getUTCFullYear() && m === d.getUTCMonth())); }
  U.calMois = Math.max(0, Math.min(moisListe.length - 1, U.calMois));
  const legende = `<div class="cal-leg"><span><i class="b mercato"></i>Mercato</span><span><i class="b prepa"></i>Préparation</span><span><i class="b tournoi"></i>${esc(D.TOURNOI.court)}</span><span><i class="b treve"></i>Trêve</span><span><i class="pt V"></i>V</span><span><i class="pt N"></i>N</span><span><i class="pt D"></i>D</span></div>`;
  let corps;
  if (mode === 'mois'){
    const [an, mo] = moisListe[U.calMois];
    const evs = []; for (const x of J.values()) if (new Date(x.t).getUTCMonth() === mo && new Date(x.t).getUTCFullYear() === an && x.k != null) evs.push(x);
    evs.sort((a, b) => a.t - b.t);
    corps = `<div class="carte"><div class="cal-nav"><button class="mini-b" data-act="calMois" data-d="-1" aria-label="Mois précédent" ${U.calMois ? '' : 'disabled'}>‹</button><h2 style="margin:0">${MOIS[mo]} ${an}</h2><button class="mini-b" data-act="calMois" data-d="1" aria-label="Mois suivant" ${U.calMois < moisListe.length - 1 ? '' : 'disabled'}>›</button></div>
      ${grilleMois(an, mo, J)}${legende}</div>
      <div class="carte"><h2>Ce mois-ci</h2><div class="liste">${evs.map(x => { const S_ = x.S, k = x.k;
        const lignes = x.matchs.map(m => { const r = resMatch(m); return `<button class="el" data-act="semaine" data-s="${k}">${r.sx ? blason(r.adv, 'p', 1) : blason(r.adv, 'p')}<div class="t"><b>${r.sx ? esc(D.TOURNOI.court) + ' · tour ' + S_.tour : 'J' + S_.journee} · ${r.dom ? '' : '@ '}${esc(r.sx ? nat(r.adv).nom : club(r.adv).nom)}</b><span>${fmtDate(x.t)} · ${r.dom ? 'domicile' : 'extérieur'}${k === M_.semaine ? ' · cette semaine' : ''}${S_.tour && !r.sx && mg.club && k === M_.semaine && window.QM.convoques(M_, mg.club).length ? ` · ✈︎ ${plur(window.QM.convoques(M_, mg.club).length, 'absent')}` : ''}</span></div><span class="d">${r.txt ? `<b>${r.txt}</b> <span class="vnd ${r.v}">${r.v}</span>` : '<span class="mut">à venir</span>'}</span></button>`; }).join('');
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
  const t = Cal.filter(s => s.tour || s.type === 'sixn'); if (t.length) R.push([`${fmtDate(t[0].date)} → ${fmtDate(t[t.length - 1].date)}`, `${D.TOURNOI.nom}${t[0].type === 'sixn' ? ' (pause du championnat)' : ' : les internationaux manquent leur club'}`]);
  if (der) R.push([fmtDate(der.date), 'Dernière journée, puis bilan']);
  return R;
}
ACT.calMode = d => { U.calMode = d.m; rendre(); };
ACT.calMois = d => { U.calMois += +d.d; rendre(); };
ACT.calVoirMois = d => { U.calMois = +d.i; U.calMode = 'mois'; rendre(); scrollTo(0, 0); };
ACT.cal = d => { U.calMode = d.c === 'tout' ? 'saison' : 'mois'; rendre(); };

/* ============================== Entraînement programmable ============================== */
const ICO_S = {physique:'🏃', vol:'🧹', balle:'🔴', tactique:'🧠', match:'📋', recup:'🛁'};
const nomS = k => (G().SEANCE[k] || [])[1] || k;
const nomInt = i => (D.INTENSITES.find(x => x[0] === i) || [0, 'Normale'])[1];
function jaugesProg(c, p, S){
  const a = G().apercu(M(), c, p, S);
  return `<div class="jauges-prog">${[['progression', 'Progression', 'var(--bon)'], ['fatigue', 'Fatigue', 'var(--moyen)'], ['risque', 'Risque de blessure', 'var(--mauvais)'], ['cohesion', 'Cohésion', 'var(--accent)']].map(([k, n, col]) => `<div><span class="petit">${n}</span>${jauge(a[k], n, col)}</div>`).join('')}</div>`;
}
const jourChips = p => `<div class="jours">${p.jours.map((s, i) => `<span class="jour s-${s}"><small>${G().JOURS[i]}</small><b aria-hidden="true">${ICO_S[s] || ''}</b><em>${nomS(s)}</em></span>`).join('')}</div>`;
function vueEntrainement(){
  const M_ = M(), c = moi(), Gm = G(), P = Gm.plan(c), k0 = M_.semaine, S0 = window.QM.semaine(M_), p0 = Gm.programmeDe(M_, c, k0);
  const atel = p => `<div class="ateliers">${['P', 'B', 'A', 'G'].map(po => { const a = Gm.ATELIERS[po].find(x => x[0] === (p.ateliers || {})[po]) || Gm.ATELIERS[po][0]; return `<span>${posteB(po)}${a[1]}</span>`; }).join('')}</div>`;
  const fat = Math.round(Gm.fatigueTitulaires(M_, c));
  const avenir = []; for (let k = k0; k < Math.min(M_.calendrier.length - 1, k0 + 8); k++) avenir.push(k);
  const quoi = S => !S ? '' : S.type === 'prepa' ? `Préparation ${S.semaine}` : S.type === 'sixn' ? `${D.TOURNOI.court} · tour ${S.tour}` : `J${S.journee}${S.tour ? ' · ' + D.TOURNOI.court : ''}`;
  VUE.innerHTML = `<div><h1 class="grand">Entraînement</h1><p class="sous">Cinq séances par semaine. Les joueurs progressent vers leur potentiel ; la fatigue et les blessures suivent l'intensité.</p></div>
  <div class="carte"><h2>Qui prépare les séances ?</h2><div class="seg"><button data-act="planAuto" data-v="1" class="${P.auto ? 'on' : ''}">Mon adjoint</button><button data-act="planAuto" data-v="0" class="${P.auto ? '' : 'on'}">Moi</button></div>
    <p class="petit mut" style="margin:8px 0 0">${P.auto ? 'Ton adjoint adapte chaque semaine : foncier puis pré-saison en août, récupération quand les titulaires sont fatigués, collectif pendant le tournoi. Tu peux reprendre la main sur une semaine précise.' : 'Ta semaine type s\'applique à toutes les semaines, sauf celles que tu programmes à part.'}</p></div>
  <div class="cols"><div>
    <div class="carte"><h2>Cette semaine <span class="mut">${quoi(S0)}</span></h2>
      <p style="margin:0 0 8px"><b>${esc(p0.nom || 'Programme')}</b> · intensité ${nomInt(p0.int).toLowerCase()}${p0.auto ? ' · <span class="badge">adjoint</span>' : ' · <span class="badge tit">toi</span>'}</p>
      ${jourChips(p0)}${atel(p0)}${jaugesProg(c, p0, S0)}
      <p class="petit mut" style="margin:8px 0 10px">Fatigue moyenne des titulaires : <b style="color:var(--ink)">${fat} %</b> · cohésion ${Math.round(c.cohesion)} %</p>
      <button class="btn plein" data-act="progEditer" data-k="${k0}">Programmer cette semaine</button></div>
    ${P.auto ? '' : `<div class="carte"><h2>Ta semaine type</h2><p style="margin:0 0 8px"><b>${esc(P.modele.nom || 'Semaine type')}</b> · ${nomInt(P.modele.int).toLowerCase()}</p>${jourChips(P.modele)}<button class="btn sec plein" style="margin-top:10px" data-act="progEditer" data-k="modele">Modifier la semaine type</button></div>`}
  </div><div>
    <div class="carte"><h2>Semaines à venir</h2><div class="liste">${avenir.slice(1).map(k => { const S = M_.calendrier[k], p = Gm.programmeDe(M_, c, k);
      return `<button class="el" data-act="progEditer" data-k="${k}"><div class="t"><b>${fmtDate(S.date)} · ${esc(quoi(S))}</b><span>${esc(p.nom || 'Programme')} · ${nomInt(p.int).toLowerCase()} · ${p.jours.map(s => ICO_S[s]).join('')}</span></div><span class="d">${p.auto ? '<span class="badge">adjoint</span>' : '<span class="badge tit">toi</span>'}</span></button>`; }).join('') || '<p class="mut">Fin de saison.</p>'}</div></div>
    <div class="carte aide"><h2>Repères</h2>
      <p><b>Séances.</b> Physique : vitesse, endurance, force (bien plus efficace en préparation d'août). Vol : pilotage, virages, piqués. Balle : passes, tirs, frappes, arrêts. Tactique : lecture du jeu et cohésion. Mise en place : un peu de tout avant le match. Récupération : la fatigue baisse, pas de progrès.</p>
      <p><b>Ateliers.</b> Chaque poste travaille un groupe d'attributs en plus (+35 %).</p>
      <p><b>Intensité.</b> Plus haute, on progresse plus vite, mais la fatigue et le risque de blessure montent.</p></div>
  </div></div>`;
}
let PROG = null;
function ficheProg(){
  const M_ = M(), c = moi(), Gm = G(), p = PROG.p, k = PROG.k, S = k === 'modele' ? window.QM.semaine(M_) : M_.calendrier[k];
  feuille(`${teteF(k === 'modele' ? 'Semaine type' : `Semaine du ${fmtDate(S.date)}`, k === 'modele' ? 'S\'applique quand tu prépares toi-même' : 'Programme de la semaine')}
    <h4 class="sous-t">Partir d'un modèle</h4><div class="chips">${Object.entries(Gm.MODELES).map(([id, x]) => `<button class="chip ${p.nom === x.nom ? 'on' : ''}" data-act="progModele" data-m="${id}">${x.nom}</button>`).join('')}</div>
    <h4 class="sous-t">Séances</h4><div class="seances">${p.jours.map((s, i) => `<label class="seance"><span>${Gm.JOURS[i]}</span><select data-chg="seance" data-i="${i}">${Gm.SEANCES.map(x => `<option value="${x[0]}" ${x[0] === s ? 'selected' : ''}>${ICO_S[x[0]]} ${x[1]}</option>`).join('')}</select></label>`).join('')}</div>
    <h4 class="sous-t">Intensité</h4><div class="seg">${D.INTENSITES.map(([v, n]) => `<button data-act="progInt" data-v="${v}" class="${p.int === v ? 'on' : ''}">${n}</button>`).join('')}</div>
    <h4 class="sous-t">Ateliers par poste</h4><div class="seances">${['P', 'B', 'A', 'G'].map(po => `<label class="seance"><span>${posteB(po)}</span><select data-chg="atelier" data-p="${po}">${Gm.ATELIERS[po].map(a => `<option value="${a[0]}" ${(p.ateliers || {})[po] === a[0] ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label>`).join('')}</div>
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
});

/* ============================== Enregistrement ============================== */
Object.assign(VUES, {club:vueClubCarte, direction:vueDirection, profil:vueProfil, trophees:vueTrophees, boite:vueBoite, plus:vuePlus, effectif:vueEffectif, clubs:vueClubs, clubFiche:vueClubFiche, calendrier:vueCalendrier, entrainement:vueEntrainement});
if (Z.M && Z.M.manager) rendre();
})();
