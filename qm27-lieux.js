// mon-ecran-version: a835c270
/* QM27 (v88…v163, v164) — les lieux du club : domaine et bâtiments, stade, Bazar, buvette et carnet de recettes, partenaires, salle des trophées, banque, divination.
   Chargé après qm27-ui.js, dont il reçoit la boîte à outils (window.QMU) ; ses fonctions sont publiées dans window.QMF (v164 : découpage de qm27-ui.js). */
(() => {
'use strict';
const QU = window.QMU; if (!QU) return;
const {ACT, B, C, D, E, U, V, VUE, Z_, avatarDe, club, esc, eur, feuille, nomJ, nomOpt, teteF} = QU;

const POS_DOM = {infirmerie:[62, 56], salle:[140, 50], bureau:[210, 44], formation:[280, 50], voliere:[358, 56], divination:[52, 166], aire:[368, 166],
  trophees:[62, 272], residence:[140, 280], buvettes:[210, 288], boutique:[280, 280], hangar:[358, 272]};
const VUE_BAT = {stade:'stade', boutique:'boutique', buvette:'buvette', formation:'formation', entrainement:'entrainement', balais:'vestiaire', tactique:'tactique', mercato:'mercato', trophees:'trophees'};
const nomBat = k => k === 'bureau' ? 'Bureau du président' : (B.BAT[k] || [])[1] || k;
const pips = n => `<span class="pips" aria-label="niveau ${n} sur 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const coutEntretien = (c, k) => ((E.inst[k] || E.bat[k] || {}).entretien || 0) * C.niv(c, k) * (C.facteurTaille ? C.facteurTaille(c, k) : 1);   // v165 : selon la taille du stade (tribunes, Taverne)
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
  const c = B.assurer(QU.M), d = c.dom, att = D.BATIMENTS.filter(b => B.amelEnAttente(c, b[0])).length;
  VUE.innerHTML = `<div><h1 class="grand">Domaine</h1><p class="sous">${esc(c.nom)} · ${c.travaux.length ? c.travaux.length + ' chantier' + (c.travaux.length > 1 ? 's' : '') + ' en cours · ' : ''}entretien ${eur(c.stade * E.eco.entretien + C.entretienInst(c))} par semaine</p></div>
  <div class="cols"><div>
    <div class="carte plan-carte">${planDomaine(c)}<p class="petit mut" style="margin:6px 4px 0">Touche un bâtiment pour l'améliorer${att ? ` · <b style="color:var(--or)">${att} amélioration${att > 1 ? 's' : ''} à choisir</b>` : ''}.</p></div>
    <div class="carte"><h2>Humeurs</h2>
      <div class="ligne"><span style="flex:1">Supporters</span><b>${Math.round(d.supp)} / 100</b></div><div class="jauge" style="margin:4px 0 10px"><i style="width:${d.supp}%"></i></div>
      <div class="ligne"><span style="flex:1">Confiance du président</span><b>${Math.round(QU.M.manager.confiance)} %</b></div><div class="jauge" style="margin-top:4px"><i style="width:${QU.M.manager.confiance}%"></i></div>
      <p class="petit mut" style="margin:8px 0 0">Les supporters suivent les résultats, le prix des places et ceux du Bazar. Contents, ils remplissent le stade et rassurent le président.</p></div>
  </div><div>
    <div class="carte"><h2>Bâtiments</h2><div class="liste">${['bureau', ...D.BATIMENTS.map(b => b[0])].map(k => { const n = k === 'bureau' ? 0 : C.niv(c, k), tr = c.travaux.find(t => t.type === k), a = k !== 'bureau' && B.amelEnAttente(c, k);
      return `<button class="el" data-act="batiment" data-b="${k}"><svg class="bmini" viewBox="0 0 64 64" aria-hidden="true">${V.batiment(k, c.couleurs[0], c.couleurs[1])}</svg>
        <div class="t"><b>${esc(nomBat(k))}</b><span>${k === 'bureau' ? 'Finances, partenaires, banque' : k === 'tribunes' ? c.stade.toLocaleString('fr-FR') + ' places' : esc(B.BAT[k][3].split(' :')[0].split('(')[0])}</span></div>
        ${a ? '<span class="badge" style="color:var(--or);border-color:var(--or)">à choisir</span>' : tr ? `<span class="badge">${tr.fin - (QU.M.tic || 0)} sem.</span>` : n ? pips(n) : ''}</button>`; }).join('')}</div></div>
  </div></div>`;
}
function ficheBat(k){
  const c = B.assurer(QU.M);
  if (k === 'bureau') return feuille(`${teteF('Bureau du président', esc(c.nom), `<svg class="bico" viewBox="0 0 64 64" aria-hidden="true">${V.batiment('bureau', c.couleurs[0], c.couleurs[1])}</svg>`)}
    <div class="carte"><div class="ligne" style="justify-content:space-between"><span>Objectif</span><b>${esc(QU.M.manager.objectif.txt)}</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Confiance</span><b>${Math.round(QU.M.manager.confiance)} %</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Supporters</span><b>${Math.round(c.dom.supp)} / 100</b></div><div class="sep"></div>
      <div class="ligne" style="justify-content:space-between"><span>Solde</span><b>${eur(c.budget)}</b></div></div>
    <div class="btns" style="margin-top:12px"><button class="btn sec" data-act="allerVue" data-v="finances">Finances et banque</button><button class="btn" data-act="allerVue" data-v="partenaires">Partenaires</button></div>`);
  const b = B.BAT[k], n = C.niv(c, k), tr = c.travaux.find(t => t.type === k), att = B.amelEnAttente(c, k), vue = VUE_BAT[b[4]];
  const cout = k === 'tribunes' ? C.coutTravaux(c, 'tribunes') : C.coutTravaux(c, k), sem = (E.inst[k] || E.bat[k]).semaines;
  /* v166 : une amélioration choisie peut être remplacée par l'autre (travaux : 25 % du prix du niveau, 2 semaines) */
  const choix = niveau => { const L = b[niveau === 3 ? 5 : 6], pris = L.find(x => B.a(c, x[0])), ch = B.chantierAmel(c, k, niveau), tic = QU.M.tic || 0;
    return `<div class="amel-niv"><h4>Niveau ${niveau}${n < niveau ? ' <span class="mut">· pas encore</span>' : ''}</h4><div class="amel-choix">${L.map(([cle, nom, effet]) => { const enT = ch && ch.cle === cle;
      return `<div class="amel ${pris && pris[0] === cle ? 'pris' : pris || ch ? 'non' : ''}">
      <b>${pris && pris[0] === cle ? '✓ ' : ''}${esc(nom)}</b><span>${esc(effet)}</span>${att === niveau ? `<button class="btn" data-act="amel" data-a="${cle}">Choisir</button>` : ''}${enT ? `<span class="petit"><b>En travaux</b> · prêt dans ${Math.max(1, ch.fin - tic)} semaine${ch.fin - tic > 1 ? 's' : ''}</span>` : ''}${pris && pris[0] !== cle && !ch && n >= niveau ? `<button class="btn sec" data-act="changerAmel" data-a="${cle}">Changer · ${eur(B.coutChangement(c, cle))}</button>` : ''}</div>`; }).join('')}</div></div>`; };
  let extra = '';
  if (k === 'infirmerie'){ const L = c.effectif.map(id => QU.M.joueurs[id]).filter(j => j && j.bless);
    extra = `<div class="carte" style="margin-top:10px"><h2>À l'infirmerie</h2>${L.length ? `<div class="liste">${L.map(j => `<button class="el" data-act="joueur" data-j="${j.id}"><span class="avp">${avatarDe(j)}</span><div class="t"><b>${esc(nomJ(j))}</b><span>${esc(j.bless.nom)} · ${j.bless.jours} j</span></div></button>`).join('')}</div>` : '<p class="mut" style="margin:0">Personne. Les lits sont faits.</p>'}
      ${B.a(c, 'apothicaire') ? `<p class="petit mut" style="margin:8px 0 0">Potion de forme : ${(QU.M.tic || 0) - c.dom.potion >= 4 ? 'disponible (fiche du joueur)' : 'prochaine dans ' + (4 - ((QU.M.tic || 0) - c.dom.potion)) + ' semaine(s)'}.</p>` : ''}</div>`; }
  if (k === 'divination') extra = `<div class="carte" style="margin-top:10px"><h2>Ce que voit le cabinet</h2><p class="petit" style="margin:0">${['Niveau 1 : la forme de l\'adversaire.', 'Niveau 2 : sa tactique (rythme, attrapeur, pressing).', 'Niveau 3 : son joueur clé.', 'Niveau 4 : la note moyenne de ses titulaires.', 'Niveau 5 : son point faible.'].map((t, i) => `<span style="display:block;${i < n ? '' : 'opacity:.45'}">${i < n ? '✓' : '·'} ${t}</span>`).join('')}</p><p class="petit mut" style="margin:6px 0 0">Le rapport s'affiche avant chaque match de championnat.</p></div>`;
  if (k === 'trophees'){ const T = B.titres(QU.M, c); extra = `<div class="carte" style="margin-top:10px"><h2>${T.length} titre${T.length > 1 ? 's' : ''}</h2><p class="petit mut" style="margin:0">Visites : ${eur(B.visites(QU.M, c))} par semaine.</p></div>`; }
  feuille(`${teteF(esc(b[1]), `Niveau ${n} / 5 · entretien ${eur(coutEntretien(c, k))} par semaine`, `<svg class="bico" viewBox="0 0 64 64" aria-hidden="true">${V.batiment(k, c.couleurs[0], c.couleurs[1])}</svg>`)}
    <p style="margin:0 0 6px">${esc(b[3])}</p>${pips(n)}
    <div class="btns" style="margin:12px 0">${n >= 5 ? '<span class="badge tit">Niveau maximal</span>' : tr ? `<span class="badge">Travaux en cours · fin dans ${tr.fin - (QU.M.tic || 0)} semaine(s)</span>` : `<button class="btn" data-act="ameliorer" data-b="${k}">Passer au niveau ${n + 1} · ${eur(cout)} · ${sem} sem.</button>`}
      ${vue ? `<button class="btn sec" data-act="allerVue" data-v="${vue}">Ouvrir</button>` : ''}</div>
    <div class="carte"><h2>Améliorations <span class="mut petit">une au choix par niveau</span></h2>${choix(3)}${choix(5)}</div>${extra}`);
}
/* v176 : le stade illustré en une seule image (images/qm27/stade/<style>-<palier>.webp, 1536 × 1024) : le style suit le championnat,
   le palier la capacité (moins de 12 000 places, 25 000, 40 000, puis l'arène). Remplace le stade façon FM98 en pièces (v112), dont les images restent dans le dépôt.
   L'agrandissement se fait tribune par tribune depuis la liste « Tribunes » ; un chantier est signalé sur l'image. */
const STADE_STYLE = {bi:'avalon', la:'circe', sc:'yggdrasil', ce:'walpurgis'};
const STADE_PALIERS = [12000, 25000, 40000], NOM_PALIER = ['Terrain de village', 'Stade de ville', 'Grand stade', 'Arène majestueuse'];
const palierStade = cap => 1 + STADE_PALIERS.filter(x => cap >= x).length;
function stadeIllustre(c){
  const st = STADE_STYLE[c.ligue] || 'avalon', p = palierStade(c.stade), suiv = STADE_PALIERS[p - 1], tr = c.travaux.find(x => x.type === 'stade');
  const cote = {N:'nord', S:'sud', E:'est', O:'ouest'}[c.dom.cote] || '';
  return `<figure class="stade-ill"><img src="${V.IMAGES}stade/${st}-${p}.webp" alt="${NOM_PALIER[p - 1]} de ${esc(c.nom)} : ${c.stade.toLocaleString('fr-FR')} places" decoding="async">
    <figcaption><span class="badge">${NOM_PALIER[p - 1]}</span>${suiv ? `<span class="badge">palier suivant à ${suiv.toLocaleString('fr-FR')} places</span>` : '<span class="badge tit">Palier maximal</span>'}${tr ? `<span class="badge chantier">🔨 Travaux${cote ? ' · tribune ' + cote : ''} · ${tr.fin - (QU.M.tic || 0)} sem.</span>` : ''}</figcaption></figure>`;
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
  const c = B.assurer(QU.M), ext = c.travaux.find(x => x.type === 'stade'), aff = Math.round(c.stade * C.remplissage(QU.M, c, {rep:60}));
  const nom = {N:'Nord', S:'Sud', E:'Est', O:'Ouest'};
  VUE.innerHTML = `<div><h1 class="grand">Stade</h1><p class="sous">${esc(c.nom)} · ${c.stade.toLocaleString('fr-FR')} places · tribunes niveau ${C.niv(c, 'tribunes')}</p></div>
  <div class="cols"><div>
    <div class="carte">${stadeVue(c)}<p class="petit mut" style="margin:6px 2px 0">Agrandis une tribune depuis la liste ci-dessous : ${E.stade.tranche.toLocaleString('fr-FR')} places de plus par chantier (${eur(C.coutTravaux(c, 'stade'))}, ${E.stade.semaines} semaines). Le stade change d'allure à 12 000, 25 000 et 40 000 places. Panneaux vendus : ${c.dom.panneaux.length} / ${B.placesPanneaux(c)}.</p></div>
    <div class="carte"><h2>Tribunes</h2><div class="liste">${Object.keys(nom).map(k => `<div class="el"><div class="t"><b>Tribune ${nom[k]}</b><span>${c.dom.trib[k].toLocaleString('fr-FR')} places</span></div>${ext ? (c.dom.cote === k ? `<span class="badge">travaux · ${ext.fin - (QU.M.tic || 0)} sem.</span>` : '') : `<button class="btn sec" data-act="tribune" data-c="${k}">+ ${(E.stade.tranche / 1000)} k</button>`}</div>`).join('')}</div></div>
  </div><div>
    <div class="carte"><h2>Billetterie</h2><div class="ligne"><button class="btn sec" data-act="prix" data-d="-1" aria-label="Baisser le prix">−</button><b style="flex:1;text-align:center;font-size:1.15rem">${eur(c.prix)} la place</b><button class="btn sec" data-act="prix" data-d="1" aria-label="Augmenter le prix">+</button></div>
      <p class="petit mut" style="margin:8px 0 0">Environ ${aff.toLocaleString('fr-FR')} spectateurs (${Math.round(aff / c.stade * 100)} %) contre un adversaire moyen. Prix conseillé : ${eur(C.prixRef(c))} ; plus cher, les supporters râlent.</p></div>
    <div class="btns"><button class="btn sec" data-act="batiment" data-b="tribunes">Améliorer le stade</button><button class="btn sec" data-act="allerVue" data-v="partenaires">Panneaux et sponsor</button></div>
  </div></div>`;
}
function vueBoutique(){
  const c = B.assurer(QU.M), d = c.dom, dispo = B.produitsDispo(c), actifs = dispo.filter(p => d.produits[p[0]] && d.produits[p[0]].actif).length;
  const lib = {bas:'Bas', normal:'Normal', haut:'Haut'};
  const scene = Z_() && Z_().sceneDispo('boutique');   // v124 : la boutique illustrée, l'ardoise des prix
  VUE.innerHTML = `<div><h1 class="grand">Bazar du club</h1><p class="sous">Niveau ${C.niv(c, 'boutique')} · ${actifs} / ${B.placesRayon(c)} produits en rayon · environ ${eur(B.recettesBazar(c))} par semaine</p></div>
  ${scene ? Z_().sceneHTML('boutique') : ''}
  <div class="carte" id="rayons"><div class="liste">${D.PRODUITS.map(p => { const ok = !p[4] || B.a(c, p[4]), st = d.produits[p[0]] || {actif:false, prix:'normal'};
    if (!ok) return `<div class="el" style="opacity:.55"><div class="t"><b>🔒 ${esc(p[1])}</b><span>Débloqué par ${esc(B.AMEL[p[4]].nom)} (${esc(nomBat(B.AMEL[p[4]].bat))}, niveau ${B.AMEL[p[4]].niv})</span></div></div>`;
    return `<div class="el prod">${V.produitImg(p[0])}<label class="interr"><input type="checkbox" data-chg="produit" data-p="${p[0]}" ${st.actif ? 'checked' : ''}><span></span></label>
      <div class="t"><b>${esc(p[1])}</b><span>${'★'.repeat(Math.round(p[2] * 3))} · ${eur(p[3] * B.PRIX[st.prix].p)} · ${st.actif ? '≈ ' + eur(B.recetteProduit(c, p, st)) + ' / sem.' : 'pas en rayon'}</span></div>
      <div class="seg mini">${['bas', 'normal', 'haut'].map(v => `<button data-act="prixProduit" data-p="${p[0]}" data-v="${v}" class="${st.prix === v ? 'on' : ''}">${lib[v]}</button>`).join('')}</div></div>`; }).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Les produits portent les couleurs du club. Prix bas : un peu moins de recettes, des supporters ravis. Prix haut : plus de recettes, des supporters qui râlent. Chaque niveau du Bazar ajoute une place en rayon.</p></div>`;
  V.colorierProduits(VUE, c);   // v111
  if (scene) Z_().ardoiseDefile();
}
/* v163 : carnet de recettes : les spécialités des 64 clubs, débloquées en jouant avec ou contre eux */
function carnetRecettes(c){
  const P = D.PLATS_LOCAUX, mp = QU.M.manager.plats || {}, n = Object.keys(P).filter(id => mp[id]).length, tot = Object.keys(P).length;
  const prochain = (() => { const S = QM.semaine(QU.M), m = S && S.matchs.find(x => x.dom === c.id && x.ligue !== 'sixn'); return m && P[m.ext] ? m.ext : null; })();
  const L = Object.keys(QU.M.ligues).filter(l => l !== 'sixn').map(l => [l, Object.values(QU.M.clubs).filter(x => x.ligue === l && P[x.id]).sort((a, b) => a.ville.localeCompare(b.ville))]).filter(x => x[1].length);
  return `<div class="carte"><h2>Carnet de recettes <span class="mut petit">${n} / ${tot}</span></h2><div class="barre" style="margin:0 0 8px"><i style="width:${Math.round(n / tot * 100)}%"></i></div>
    ${prochain ? `<p class="petit" style="margin:0 0 8px">Prochain visiteur : <b>${esc(club(prochain).nom)}</b>${mp[prochain] ? ` · mets ses ${esc(P[prochain].toLowerCase())} à la carte pour +10 %.` : ' · sa recette sera à toi après le match.'}</p>` : ''}
    ${L.map(([l, C_]) => `<h4 class="sous-t">${esc(QU.M.ligues[l].nom)}</h4><div class="carnet">${C_.map(x => `<div class="rec${mp[x.id] ? '' : ' fermee'}" title="${mp[x.id] ? esc(P[x.id]) + ' · ' + esc(x.nom) : 'À découvrir en jouant ' + esc(x.nom)}"><img src="images/qm27/buvette/l_${x.id}.webp" width="48" height="48" alt="" loading="lazy"><span>${mp[x.id] ? esc(P[x.id]) : '?'}</span><small>${esc(x.ville)}</small></div>`).join('')}</div>`).join('')}
    <p class="petit mut" style="margin:8px 0 0">Chaque club que tu affrontes, en championnat, en coupe ou en Ligue des Anneaux, te donne sa recette. Elle te suit si tu changes de club.</p></div>`;
}
/* v133 : la buvette du stade (tente aux chopes de l'entrée) : la carte et ses prix, comme les produits du Bazar */
function vueBuvette(){
  const c = B.assurer(QU.M), d = c.dom, dispo = B.carteDispo(c), act = B.carteActive(c), lib = {bas:'Bas', normal:'Normal', haut:'Haut'};
  const aff = Math.round(c.stade * C.remplissage(QU.M, c, {rep:60})), tot = B.recettesBuvette(c, aff), mult = B.multCarte(c);
  const scene = Z_() && Z_().sceneDispo('buvette');
  VUE.innerHTML = `<div><h1 class="grand">La buvette</h1><p class="sous">Taverne du stade niveau ${C.niv(c, 'buvettes')} · ${act.length} / ${B.placesCarte(c)} à la carte · environ ${eur(tot)} par match à domicile</p></div>
  ${scene ? Z_().sceneHTML('buvette') : ''}
  <div class="carte" id="carteBuvette"><h2>La carte <span class="mut petit">${act.length} / ${B.placesCarte(c)} places</span></h2><div class="liste">${B.PRODUITS_BUV.filter(p => !p[6] || B.dispoProduit(c, p)).map(p => { const ok = B.dispoProduit(c, p), st = d.carte[p[0]] || {actif:false, prix:'normal'};
    const ico = `<span class="buv-ico" aria-hidden="true"><img src="images/qm27/buvette/${p[0]}.webp" width="40" height="40" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${p[5]}'))"></span>`;
    if (!ok) return `<div class="el buv-lock">${ico}<div class="t"><b>🔒 ${esc(p[1])}</b><span>${p[4].startsWith('niv') ? `Taverne du stade niveau ${p[4].slice(3)}` : `Débloqué par ${esc(B.AMEL[p[4]].nom)} (${esc(nomBat(B.AMEL[p[4]].bat))}, niveau ${B.AMEL[p[4]].niv})`}</span></div></div>`;
    const on = act.some(x => x[0] === p[0]);
    return `<div class="el prod">${ico}<label class="interr"><input type="checkbox" data-chg="carte" data-p="${p[0]}" ${st.actif ? 'checked' : ''} aria-label="${esc(p[1])} à la carte"><span></span></label>
      <div class="t"><b>${esc(p[1])}${p[6] ? ` <span class="mut petit">${esc(club(p[6]) ? club(p[6]).ville : '')}</span>` : ''}</b><span>${'★'.repeat(Math.round(p[2] * 3))} · ${eur(p[3] * B.PRIX[st.prix].p)} · ${on ? '≈ ' + eur(tot * B.partCarte(c, p[0])) + ' / match' : 'pas à la carte'}</span></div>
      <div class="seg mini">${['bas', 'normal', 'haut'].map(v => `<button data-act="prixCarte" data-p="${p[0]}" data-v="${v}" class="${st.prix === v ? 'on' : ''}">${lib[v]}</button>`).join('')}</div></div>`; }).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Plus la carte est longue, plus les spectateurs consomment, de moins en moins à chaque article ajouté. Prix bas : un peu moins de recettes, des supporters ravis. Prix haut : plus de recettes, des supporters qui râlent. Une carte vide les fâche. Chaque niveau de la Taverne ajoute une place à la carte et débloque de nouveaux classiques. Les spécialités des clubs attirent un peu plus ; servie le jour où son club vient jouer chez toi, une spécialité rapporte 10 % de plus.</p></div>
  ${carnetRecettes(c)}
  <div class="carte"><h2>La Taverne du stade</h2>
    <div class="ligne" style="justify-content:space-between"><span>Niveau</span><b>${C.niv(c, 'buvettes')} / 5</b></div><div class="sep"></div>
    <div class="ligne" style="justify-content:space-between"><span>Effet de la carte</span><b>${mult >= 1 ? '+' : '−'}${Math.abs(Math.round((mult - 1) * 100))} %</b></div><div class="sep"></div>
    <div class="ligne" style="justify-content:space-between"><span>Restauration cette saison</span><b>${eur((c.fin && c.fin.saison && c.fin.saison.rec.restauration) || 0)}</b></div>
    <p class="petit mut" style="margin:8px 0 0">Estimation pour environ ${aff.toLocaleString('fr-FR')} spectateurs, contre un adversaire moyen.${B.a(c, 'ouverte') ? ' La taverne reste ouverte en semaine : elle sert aussi les jours sans match.' : ''}</p>
    <div class="btns" style="margin-top:10px"><button class="btn sec" data-act="batiment" data-b="buvettes">Améliorer la taverne</button><button class="btn sec" data-act="vue" data-v="entree">Entrée du stade</button></div></div>`;
}
function vuePartenaires(){
  const c = B.assurer(QU.M), d = c.dom, sp = d.sponsor, pl = B.placesPanneaux(c);
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
/* v173 : la vitrine pose d'abord un exemplaire de chaque trophée, puis des doubles (les plus récents) jusqu'à remplir les étagères, jamais plus */
function choixVitrine(T){
  const P = T.filter(x => V.coupeSrc && V.coupeSrc(x.cle)), max = VITRINE.parEtagere * 3, vus = new Set(), L = [];
  for (const x of P){ const k = x.cle + '|' + x.titre; if (!vus.has(k)){ vus.add(k); L.push(x); } }
  for (const x of P){ if (L.length >= max) break; if (!L.includes(x)) L.push(x); }
  return L.slice(0, max);
}
function vitrineHTML(T){
  const L = choixVitrine(T), pas = (VITRINE.x1 - VITRINE.x0) / VITRINE.parEtagere;
  const coupes = L.map((x, i) => { const r = Math.floor(i / VITRINE.parEtagere), k = i % VITRINE.parEtagere, n = Math.min(VITRINE.parEtagere, L.length - r * VITRINE.parEtagere), t = VITRINE.taille[r];
    const cx = (VITRINE.x0 + VITRINE.x1) / 2 + (k - (n - 1) / 2) * pas;
    return `<image class="${x.ancien ? 'anc' : ''}" href="${V.coupeSrc(x.cle)}" x="${Math.round(cx - t / 2)}" y="${VITRINE.etageres[r] - t + 4}" width="${t}" height="${t}"><title>${esc(x.titre)} · ${esc(x.saison)}</title></image>`; }).join('');
  return `<div class="carte vitrine"><svg viewBox="0 0 1536 1024" role="img" aria-label="Vitrine : ${T.length} trophée${T.length > 1 ? 's' : ''}"><image href="${V.IMAGES}trophees/vitrine.webp" width="1536" height="1024"/>${coupes}</svg>
    ${L.length ? '' : '<p class="petit mut" style="margin:8px 0 0">Les étagères attendent ton premier titre.</p>'}${T.length > L.length ? `<p class="petit mut" style="margin:8px 0 0">Vitrine pleine : un exemplaire de chaque trophée, puis les titres les plus récents (${L.length} sur ${T.length}).</p>` : ''}</div>`;
}
/* v173 : palmarès d'un club, un trophée par ligne et ses saisons à côté (salle des trophées, fiche des clubs) */
function palmaresClubHTML(G){
  return `<div class="palm-club">${G.map(g => `<div class="pc ${g.ancien ? 'ancien' : ''}">${(V.coupeImg && V.coupeImg(g.cle)) || V.trophee(g.titre, g.saisons[0])}<div class="t"><b>${esc(g.titre)}${g.saisons.length > 1 ? ` <span class="x">×${g.saisons.length}</span>` : ''}</b><span>${g.saisons.map(esc).join(' · ')}</span></div></div>`).join('')}</div>`;
}
window.QMF = Object.assign(window.QMF || {}, {palmaresClubHTML});
function vueTrophees(){
  const c = B.assurer(QU.M), T = B.titres(QU.M, c);
  VUE.innerHTML = `<div><h1 class="grand">Salle des trophées</h1><p class="sous">${esc(c.nom)} · niveau ${C.niv(c, 'trophees')} · visites ${eur(B.visites(QU.M, c))} par semaine</p></div>
  ${vitrineHTML(T)}
  <div class="carte">${T.length ? palmaresClubHTML(B.titresGroupes(QU.M, c)) : '<p class="mut" style="margin:0">La vitrine est vide. À toi de la remplir.</p>'}
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
  if (!QU.X || QU.X.sixn || !QU.M.manager.club) return '';
  const c = club(QU.M.manager.club), n = C.niv(c, 'divination'), espion = B.a(c, 'espion'), adv = QU.X.e[1 - QU.X.joueur], moi = QU.X.e[QU.X.joueur];
  if (!n && !espion) return '';
  const T = QU.M.tables[club(adv.id).ligue] || {}, L = [];
  const forme = ((T[adv.id] || {}).forme || []).join(' ') || 'pas encore de match';
  L.push(`Forme : <b>${forme}</b>`);
  if (n >= 2){ const t = adv.tactique; L.push(`Tactique : rythme ${esc(nomOpt('rythme', t.rythme).toLowerCase())}, attrapeur « ${esc(nomOpt('attrapeur', t.attrapeur).toLowerCase())} », sans le souafle : ${esc(nomOpt('sans', QM.sansDe(t)).toLowerCase())}, attaque par ${esc(nomOpt('zone', t.zone).toLowerCase())}`); }
  const tit = ['P', 'B', 'A', 'G'].flatMap(p => adv[p].map(id => [p, QU.M.joueurs[id]])).filter(([, j]) => j);
  if (n >= 3){ const [p, j] = tit.reduce((x, y) => QM.note(y[1], y[0]) > QM.note(x[1], x[0]) ? y : x); L.push(`Joueur clé : <b>${esc(nomJ(j))}</b> (${D.POSTES[p].nom.toLowerCase()}, ${QM.note(j, p)})`); }
  if (n >= 4){ const m = e => { const t = ['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => QM.note(QU.M.joueurs[id], p))); return Math.round(t.reduce((a, b) => a + b, 0) / t.length); }; L.push(`Note moyenne des titulaires : <b>${m(adv)}</b> contre ${m(moi)} pour toi`); }
  if (n >= 5){ const [p, j] = tit.reduce((x, y) => QM.note(y[1], y[0]) < QM.note(x[1], x[0]) ? y : x); L.push(`Point faible : <b>${esc(nomJ(j))}</b> (${D.POSTES[p].nom.toLowerCase()}, ${QM.note(j, p)})`); }
  if (espion) L.push(`Hibou espion, composition : ${tit.map(([p, j]) => `${p} ${esc(j.n)}`).join(', ')}`);
  return `<div class="carte div-carte"><h2>Cabinet de divination <span class="mut petit">niveau ${n}</span></h2><p class="petit" style="margin:0;line-height:1.6">${L.join('<br>')}</p></div>`;
}


Object.assign(window.QMF = window.QMF || {}, {POS_DOM, VUE_BAT, nomBat, pips, coutEntretien, stadePlan, batPlan, CLAIRIERES, COURT_BAT, planIllustre, planDomaine, vueDomaine, ficheBat, palierStade, STADE_STYLE, stadeIllustre, stadeVue, vueStade, vueBoutique, carnetRecettes, vueBuvette, vuePartenaires, VITRINE, vitrineHTML, vueTrophees, banqueHTML, divinationHTML});
})();
