// mon-ecran-version: 044932c6
/* QM27 (v102) — statistiques de la saison : onglets « Équipes » et « Joueurs » dans Classements.
   Lit M.statsC (stats d'équipes du championnat, remplies par QM.statsEquipes) et j.saison (stats des joueurs, QM.statsJoueur).
   Chargé après qm27-ecrans.js, dont il reprend la boîte à outils (window.QMU) ; remplace VUES.classements par une version à trois vues. */
(function(){
'use strict';
const Z = window.QMU; if (!Z) return;
const {D, U, ACT, VUES, esc, club, blason, posteB, LS, flag} = Z;
const M = () => Z.M;
const CS = Object.assign({vue:'classement', grp:'attaque', tri:null, sens:1, poste:'tous', regul:true, max:40}, LS.lire('qm27:stats', {}));
const garder = () => LS.ecrire('qm27:stats', {vue:CS.vue, grp:CS.grp, poste:CS.poste, regul:CS.regul});
const nb = (x, d = 1) => x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR');
const pc = x => x == null || !isFinite(x) ? '—' : Math.round(x * 100) + ' %';
const div = (a, b) => b ? a / b : null;
const signe = x => x == null || !isFinite(x) ? '—' : (x > 0 ? '+' : '') + nb(x);

/* ---------- colonnes : [clé, titre, largeur, valeur(o), format(v, o), bas = plus petit est meilleur, info] ---------- */
const GRP_EQ = [
  ['attaque', 'Attaque', [
    ['bm', 'Buts', 46, o => o.bm, v => v, 0, 'Buts marqués (sans le vif d\'or)'],
    ['bmj', 'Par m.', 50, o => div(o.bm, o.j), v => nb(v), 0, 'Buts par match'],
    ['tirsj', 'Tirs/m', 50, o => div(o.tirs, o.j), v => nb(v), 0, 'Tirs par match'],
    ['prec', 'Préc.', 50, o => div(o.bm, o.tirs), v => pc(v), 0, 'Buts par tir'],
    ['xb', 'xB', 50, o => o.xb, v => nb(v, 0), 0, 'Buts attendus : la valeur des occasions'],
    ['eff', 'B − xB', 56, o => o.bm - o.xb, v => signe(v), 0, 'Au-dessus de 0 : plus efficace que ses occasions']]],
  ['defense', 'Défense', [
    ['be', 'Enc.', 46, o => o.be, v => v, 1, 'Buts encaissés'],
    ['bej', 'Par m.', 50, o => div(o.be, o.j), v => nb(v), 1, 'Buts encaissés par match'],
    ['xbc', 'xB conc.', 58, o => o.xbc, v => nb(v, 0), 1, 'Buts attendus concédés'],
    ['arrp', 'Arrêts', 52, o => div(o.arr, o.arr + o.be), v => pc(v), 0, 'Part des tirs cadrés arrêtés par les gardiens'],
    ['tcj', 'Tirs c./m', 58, o => div(o.tirsC, o.j), v => nb(v), 1, 'Tirs concédés par match']]],
  ['jeu', 'Jeu', [
    ['poss', 'Poss.', 52, o => div(o.poss, o.pasT), v => pc(v), 0, 'Possession du souafle'],
    ['cog', 'Cogn.', 48, o => o.cog, v => v, 0, 'Cognards réussis par les batteurs'],
    ['cogS', 'Subis', 46, o => o.cogS, v => v, 1, 'Cognards reçus'],
    ['bc', 'Bless. c.', 58, o => o.bc, v => v, 0, 'Blessures causées à l\'adversaire']]],
  ['discipline', 'Discipline', [
    ['fautes', 'Fautes', 52, o => o.fautes, v => v, 1, 'Fautes commises'],
    ['fj', 'Par m.', 50, o => div(o.fautes, o.j), v => nb(v), 1, 'Fautes par match'],
    ['penC', 'Pén. c.', 52, o => o.penC, v => v, 1, 'Penalties concédés'],
    ['pen', 'Pén. o.', 52, o => o.pen, v => v, 0, 'Penalties obtenus']]],
  ['vif', 'Vif d\'or', [
    ['vifs', 'Vifs', 44, o => o.vifs, v => v, 0, 'Vifs d\'or attrapés'],
    ['vifp', '% m.', 48, o => div(o.vifs, o.j), v => pc(v), 0, 'Part des matchs où l\'équipe a pris le vif'],
    ['duree', 'Durée', 52, o => div(o.duree, o.j), v => v == null ? '—' : Math.round(v) + ' min', 0, 'Durée moyenne de ses matchs'],
    ['vifSauve', 'Sauvés', 52, o => o.vifSauve, v => v, 0, 'Matchs gagnés grâce au vif alors que l\'équipe était menée ou à égalité'],
    ['vifPerdu', 'Perdus', 52, o => o.vifPerdu, v => v, 1, 'Matchs perdus au vif alors que l\'équipe menait']]],
  ['blessures', 'Blessures', [
    ['bl', 'Bless.', 50, o => o.bl, v => v, 1, 'Blessures subies en match'],
    ['blJ', 'Jours', 50, o => o.blJ, v => v, 1, 'Jours d\'absence cumulés'],
    ['blm', 'Par m.', 50, o => div(o.bl, o.j), v => nb(v, 2), 1, 'Blessures par match']]],
  ['lieu', 'Domicile', [
    ['ptsDom', 'Pts dom.', 58, o => o.ptsDom, v => v, 0, 'Points pris à domicile'],
    ['mDom', 'Moy.', 44, o => div(o.ptsDom, o.jDom), v => nb(v), 0, 'Points par match à domicile'],
    ['ptsExt', 'Pts ext.', 56, o => o.ptsExt, v => v, 0, 'Points pris à l\'extérieur'],
    ['mExt', 'Moy.', 44, o => div(o.ptsExt, o.jExt), v => nb(v), 0, 'Points par match à l\'extérieur'],
    ['serie', 'Série', 50, o => o.serie, v => v > 0 ? v + ' V' : v < 0 ? -v + ' D' : '—', 0, 'Série en cours'],
    ['serieMax', 'Record', 54, o => o.serieMax, v => v ? v + ' V' : '—', 0, 'Plus longue série de victoires de la saison']]],
];
const sj = (j, k) => (j.saison && j.saison[k]) || 0;
const COL_J = {
  m:['m', 'MJ', 38, j => sj(j, 'm'), v => v, 0, 'Matchs joués'],
  tit:['tit', 'Tit.', 38, j => sj(j, 'tit'), v => v, 0, 'Titularisations'],
  mn:['mn', 'Min.', 46, j => sj(j, 'mn'), v => v, 0, 'Minutes jouées'],
  moy:['moy', 'Note', 44, j => div(sj(j, 'notes'), sj(j, 'm')), v => nb(v), 0, 'Note moyenne'],
  mvp:['mvp', 'JdM', 40, j => sj(j, 'mvp'), v => v, 0, 'Joueur du match (meilleure note)'],
  f:['f', 'Fautes', 48, j => sj(j, 'f'), v => v, 1, 'Fautes commises'],
  b:['b', 'Buts', 42, j => sj(j, 'b'), v => v, 0, 'Buts marqués'],
  xb:['xb', 'xB', 44, j => sj(j, 'xb'), v => nb(v), 0, 'Buts attendus'],
  t:['t', 'Tirs', 42, j => sj(j, 't'), v => v, 0, 'Tirs'],
  prec:['prec', 'Préc.', 48, j => div(sj(j, 'b'), sj(j, 't')), v => pc(v), 0, 'Buts par tir'],
  fin:['fin', 'B − xB', 54, j => sj(j, 'b') - sj(j, 'xb'), v => signe(v), 0, 'Finition : au-dessus de 0, il marque plus que ses occasions'],
  pen:['pen', 'Pén.', 46, j => sj(j, 'penB'), (v, j) => sj(j, 'pen') ? `${v}/${sj(j, 'pen')}` : '—', 0, 'Penalties marqués sur tirés'],
  cog:['cog', 'Cogn.', 46, j => sj(j, 'cog'), v => v, 0, 'Cognards réussis'],
  cogm:['cogm', 'Par m.', 48, j => div(sj(j, 'cog'), sj(j, 'm')), v => nb(v), 0, 'Cognards réussis par match'],
  bc:['bc', 'Bless. c.', 56, j => sj(j, 'bc'), v => v, 0, 'Blessures causées'],
  arr:['arr', 'Arrêts', 48, j => sj(j, 'arr'), v => v, 0, 'Arrêts'],
  arrp:['arrp', '% arr.', 50, j => div(sj(j, 'arr'), sj(j, 'arr') + sj(j, 'enc')), v => pc(v), 0, 'Part des tirs cadrés arrêtés'],
  enc:['enc', 'Enc.', 42, j => sj(j, 'enc'), v => v, 1, 'Buts encaissés'],
  evit:['evit', 'Évités', 50, j => sj(j, 'xbc') - sj(j, 'enc'), v => signe(v), 0, 'Buts évités : buts attendus concédés moins buts encaissés'],
  penArr:['penArr', 'Pén. arr.', 56, j => sj(j, 'penArr'), v => v, 0, 'Penalties arrêtés'],
  v:['v', 'Vifs', 40, j => sj(j, 'v'), v => v, 0, 'Vifs d\'or attrapés'],
  vifp:['vifp', '% m.', 46, j => div(sj(j, 'v'), sj(j, 'm')), v => pc(v), 0, 'Part de ses matchs où il a pris le vif'],
  vifT:['vifT', 'Capture', 58, j => div(sj(j, 'vifT'), sj(j, 'v')), v => v == null ? '—' : Math.round(v) + ' min', 1, 'Minute moyenne de ses captures'],
  bl:['bl', 'Bless.', 46, j => sj(j, 'bl'), v => v, 1, 'Blessures subies en match'],
};
const COLS_POSTE = {tous:['moy', 'mvp', 'm', 'tit', 'mn', 'f', 'bl'], P:['b', 'xb', 'fin', 't', 'prec', 'pen', 'moy', 'm'], B:['cog', 'cogm', 'bc', 'f', 'moy', 'm'],
  A:['v', 'vifp', 'vifT', 'moy', 'm'], G:['arrp', 'arr', 'enc', 'evit', 'penArr', 'moy', 'm']};   // la colonne du tri par défaut en premier
const DEF_TRI = {tous:'moy', P:'b', B:'cog', A:'v', G:'arrp'};

/* ---------- tableau commun ---------- */
function tableau(rows, cols, tri, sens, act, tete, ligne, max = 999){
  const col = cols.find(c => c[0] === tri) || cols[0];
  const val = r => col[3](r.o); const bas = col[5] ? -1 : 1;
  rows.sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return sens * bas * (y - x); });
  const large = 30 + 150 + cols.reduce((t, c) => t + c[2] + 4, 0);
  return `<div class="ts" role="table" style="min-width:${large}px"><div class="ts-h" role="row"><span class="ts-r">#</span><span class="ts-n">${tete}</span>
    ${cols.map(c => `<button class="th ${c[0] === col[0] ? 'on' : ''}" style="width:${c[2]}px" data-act="${act}" data-t="${c[0]}" title="${esc(c[6] || '')}">${c[1]}${c[0] === col[0] ? (sens > 0 ? ' ▾' : ' ▴') : ''}</button>`).join('')}</div>
    ${rows.slice(0, max).map((r, i) => `${ligne(r, i)}${cols.map(c => { const v = c[3](r.o); return `<span class="ts-c${c[0] === col[0] ? ' on' : ''}" style="width:${c[2]}px">${v == null ? '—' : c[4](v, r.o)}</span>`; }).join('')}</button>`).join('')}</div>`;
}

/* ---------- Équipes ---------- */
function vueEquipes(l){
  const L = M().ligues[l], S = M().statsC || {}, moi = M().manager.club;
  const g = GRP_EQ.find(x => x[0] === CS.grp) || GRP_EQ[0], cols = g[2];
  const tri = cols.some(c => c[0] === CS.tri) ? CS.tri : cols[0][0];
  const rows = L.clubs.filter(id => S[id] && S[id].j).map(id => ({id, o:S[id]}));
  return `<div class="chips petites">${GRP_EQ.map(([k, n]) => `<button class="chip ${k === g[0] ? 'on' : ''}" data-act="stGrp" data-g="${k}">${n}</button>`).join('')}</div>
    ${rows.length ? `<div class="carte ts-carte">${tableau(rows, cols, tri, CS.sens, 'stTri', 'Club',
      (r, i) => `<button class="ts-l${r.id === moi ? ' moi' : ''}" role="row" data-act="ficheClub" data-c="${r.id}"><span class="ts-r">${i + 1}</span><span class="ts-n">${blason(r.id, 'p')}<b>${esc(club(r.id).nom)}</b></span>`)}</div>`
      : '<div class="carte"><p class="mut" style="margin:0">Aucun match de championnat joué cette saison.</p></div>'}
    ${depuis()}<p class="petit mut">Championnat seulement. Touche un en-tête pour trier (▴ ▾), un club pour sa fiche. Le meilleur est en haut, y compris pour les colonnes où moins vaut mieux.</p>`;
}

/* ---------- Joueurs ---------- */
function vueJoueurs(l){
  const L = M().ligues[l], moi = M().manager.club, S = M().statsC || {};
  const p = CS.poste, cols = COLS_POSTE[p].map(k => COL_J[k]);
  const tri = cols.some(c => c[0] === CS.tri) ? CS.tri : DEF_TRI[p];
  const maxJ = Math.max(0, ...L.clubs.map(id => S[id] ? S[id].j : 0)), seuil = CS.regul ? Math.ceil(maxJ / 2) : 1;
  let J = L.clubs.flatMap(id => club(id).effectif).map(id => M().joueurs[id]).filter(j => j && sj(j, 'm') >= Math.max(1, seuil) && (p === 'tous' || j.poste === p));
  const rows = J.map(j => ({id:j.id, o:j})), total = rows.length;
  const coupe = rows.length ? tableau(rows, cols, tri, CS.sens, 'stTri', 'Joueur', (r, i) => `<button class="ts-l${r.o.club === moi ? ' moi' : ''}" role="row" data-act="joueur" data-j="${r.id}"><span class="ts-r">${i + 1}</span><span class="ts-n">${posteB(r.o.poste)}<b>${esc(r.o.p[0])}. ${esc(r.o.n)}</b>${blason(r.o.club, 'p')}</span>`, CS.max) : '';
  return `<div class="chips petites">${[['tous', 'Tous'], ['P', 'Pours.'], ['B', 'Batteurs'], ['A', 'Attrap.'], ['G', 'Gardiens']].map(([k, n]) => `<button class="chip ${p === k ? 'on' : ''}" data-act="stPoste" data-p="${k}">${n}</button>`).join('')}</div>
    <label class="st-regul petit"><input type="checkbox" data-chg="stRegul" ${CS.regul ? 'checked' : ''}> Réguliers seulement (au moins ${Math.max(1, Math.ceil(maxJ / 2))} match${Math.ceil(maxJ / 2) > 1 ? 's' : ''}, la moitié de la saison jouée)</label>
    ${total ? `<div class="carte ts-carte">${coupe}</div>${total > CS.max ? `<button class="btn sec plein" data-act="stPlus">Voir plus (${total - CS.max} autres)</button>` : ''}`
      : '<div class="carte"><p class="mut" style="margin:0">Personne ici pour l\'instant.</p></div>'}
    ${depuis()}<p class="petit mut">Championnat seulement, joueurs des clubs de cette ligue (un joueur transféré garde ses stats). Tes joueurs sont surlignés.</p>`;
}
/* ---------- Prix (v103) ---------- */
const R = () => window.QMR;
const lab = an => `${an}-${String(an + 1).slice(2)}`;
const existe = id => !!M().joueurs[id];
function ligneJ(f, extra, cls){   // f = [id, poste, note, club, prénom, nom] ou {id, p, n, club, poste, moy}
  const o = Array.isArray(f) ? {id:f[0], poste:f[1], moy:f[2], club:f[3], p:f[4], n:f[5]} : f;
  const c = o.club && M().clubs[o.club], moi = o.club === M().manager.club, ok = existe(o.id);
  return `<${ok ? 'button' : 'div'} class="el pr-l${moi ? ' moi' : ''}${cls ? ' ' + cls : ''}" ${ok ? `data-act="joueur" data-j="${o.id}"` : ''}>${posteB(o.poste)}<div class="t"><b>${esc(o.p)} ${esc(o.n)}</b><span>${c ? blason(o.club, 'p') + ' ' + esc(c.nom) : 'a quitté le championnat'}${extra ? ' · ' + extra : ''}</span></div>${o.moy != null ? `<span class="note-m">${String(o.moy).replace('.', ',')}</span>` : ''}</${ok ? 'button' : 'div'}>`;
}
const ligneMgr = (g, txt) => g ? `<div class="el pr-l${g.club === M().manager.club ? ' moi' : ''}"><span class="blason nat p">🧙</span><div class="t"><b>${g.club === M().manager.club ? 'Toi' : esc(g.nom)}</b><span>${blason(g.club, 'p')} ${esc(club(g.club).nom)} · ${txt}</span></div></div>` : '';
function vuePrix(l){
  const pr = M().prix || {saisons:[], hist:[], hof:[]}, L = M().ligues[l];
  const ans = [...new Set([M().saison, ...pr.saisons.map(x => x.saison), ...pr.hist.map(x => x.saison)])].sort((a, b) => b - a);
  const an = ans.includes(CS.an) ? CS.an : ans[0];
  const sa = pr.saisons.find(x => x.saison === an), r = sa && sa.ligues[l];
  const mois = pr.hist.filter(h => h.saison === an && h.ligue === l).slice().reverse();
  const carteSaison = r ? `<div class="carte"><h2>Prix de la saison ${lab(an)}</h2><div class="liste">
      ${ligneJ(r.joueur, 'joueur de l\'année', 'or')}
      ${ligneMgr(r.manager, `manager de l'année : ${r.manager.rang}${r.manager.rang === 1 ? 'er' : 'e'}, ${r.manager.attendu}e rang attendu`)}
      ${['P', 'B', 'A', 'G'].map(p => r.postes[p] ? ligneJ(r.postes[p], 'meilleur ' + R().nomPoste(p)) : '').join('')}
      ${r.buteur ? ligneJ(r.buteur, `meilleur buteur, ${r.buteur.b} buts`) : ''}
      ${r.jeune ? ligneJ(r.jeune, 'meilleur jeune') : ''}
      ${r.revelation ? ligneJ(r.revelation, `révélation, +${r.revelation.g} de note`) : ''}</div></div>
    <div class="carte"><h2>Équipe de l'année</h2><div class="liste">${r.equipe.map(f => ligneJ(f)).join('')}</div></div>` : '';
  const eu = sa && sa.europe, carteEu = eu && QE() ? `<div class="carte"><h2>Prix européens ${lab(an)}</h2><div class="liste">
      <div class="el pr-l${eu.vainqueur === M().manager.club ? ' moi' : ''}">${blason(eu.vainqueur, 'p')}<div class="t"><b>${esc(club(eu.vainqueur).nom)}</b><span>vainqueur de la ${esc(QE().NOM)}${eu.finaliste ? ' · finaliste : ' + esc(club(eu.finaliste).nom) : ''}</span></div></div>
      ${ligneJ(eu.balai, 'Balai d\'or', 'or')}
      ${ligneMgr(eu.manager, 'manager européen de l\'année')}</div></div>
    <div class="carte"><h2>Équipe européenne de l'année</h2><div class="liste">${eu.equipe.map(f => ligneJ(f)).join('')}</div></div>` : '';
  const cartesMois = mois.map(h => `<details class="carte pr-mois"${h === mois[0] ? ' open' : ''}><summary><h2 style="display:inline">${esc(h.quand[0].toUpperCase() + h.quand.slice(1))}</h2> <span class="mut petit">joueur du mois : ${esc((h.equipe.find(f => f[0] === h.joueur) || [, , , , '', ''])[5])}</span></summary>
      <div class="liste">${h.equipe.map(f => ligneJ(f, f[0] === h.joueur ? 'joueur du mois' : '', f[0] === h.joueur ? 'or' : '')).join('')}
      ${ligneMgr(h.manager, h.manager ? `manager du mois : ${h.manager.pts} pts pris pour ${String(h.manager.exp).replace('.', ',')} attendus` : '')}</div></details>`).join('');
  return `<div class="chips petites">${ans.map(a => `<button class="chip ${a === an ? 'on' : ''}" data-act="stAn" data-a="${a}">${lab(a)}</button>`).join('')}</div>
    ${carteEu}${carteSaison}${cartesMois ? `<h4 class="sous-t">Mois par mois</h4>${cartesMois}` : ''}
    ${!carteSaison && !cartesMois && !carteEu ? `<div class="carte"><p class="mut" style="margin:0">${an === M().saison ? 'Les premiers prix tombent à la fin du premier mois de championnat : équipe, joueur et manager du mois.' : 'Pas de prix enregistrés pour cette saison.'}</p></div>` : ''}
    <button class="btn sec plein" data-act="hof" style="margin-top:10px">Hall of Fame${pr.hof && pr.hof.length ? ` (${pr.hof.length})` : ''}</button>
    <p class="petit mut">Équipe-type : 3 poursuiveurs, 2 batteurs, 1 attrapeur, 1 gardien, à la note moyenne (au moins la moitié des matchs). Manager du mois : points pris comparés aux points attendus selon la réputation des adversaires. Manager de l'année : le plus beau dépassement du rang attendu.</p>`;
}
function ficheHof(){
  const pr = M().prix || {hof:[]}, H = pr.hof || [];
  Z.feuille(`${Z.teteF('Hall of Fame', 'Les légendes du Quidditch, entrées à leur retraite')}
    ${H.length ? `<div class="liste">${H.map((h, i) => `<div class="el hof-l"><span class="hof-r">${i + 1}</span>${posteB(h.poste)}<div class="t"><b>${flag(h.nat)} ${esc(h.p)} ${esc(h.n)}</b>
      <span>${R().nomPoste(h.poste)} · ${h.debut}–${h.fin} · ${h.m} matchs${h.poste === 'P' ? ` · ${h.b} buts` : h.poste === 'A' ? ` · ${h.v} vifs` : ''}${h.sel ? ` · ${h.sel} sélections` : ''}</span>
      <span class="petit">${Object.entries(h.prix || {}).filter(([k]) => k !== 'em').map(([k, n]) => `${esc((R().PRIX[k] || [k])[0])}${n > 1 ? ' ×' + n : ''}`).join(' · ') || '—'}</span>
      <span class="hof-c">${[...new Set(h.clubs || [])].filter(id => M().clubs[id]).map(id => blason(id, 'p')).join('')}</span></div><span class="note-m">${String(h.score).replace('.', ',')}</span></div>`).join('')}</div>`
      : '<p class="mut">Personne pour l\'instant. Un joueur y entre à sa retraite si son score d\'héritage atteint ' + R().SEUIL_HOF + ' : prix et titres, matchs joués, sélections (et, pour les joueurs déjà en carrière au début de la partie, une estimation de leurs saisons d\'avant). Au plus ' + R().MAX_HOF + ' entrées par été.</p>'}
    <p class="petit mut" style="margin-top:10px">Score d'héritage : joueur de l'année 5, meilleur à son poste 3, champion, équipe de l'année, meilleur buteur et Six Emblèmes 2, meilleur jeune et révélation 1, joueur du mois 0,5, équipe du mois 0,2 ; 1 point pour 60 matchs et pour 10 sélections.</p>
    <button class="btn plein" data-act="fermer" style="margin-top:10px">Fermer</button>`);
}
const depuis = () => M().statsDepuis ? `<p class="petit mut">Statistiques suivies depuis la journée ${M().statsDepuis} (mise à jour v102) : les matchs d'avant ne sont pas comptés.</p>` : '';

/* ---------- v104 : Ligue des Anneaux ---------- */
const QE = () => window.QME;
function tableGroupe(M_, k, T){
  const L = QE().trierTable(T), moi = M_.manager.club;
  return `<div class="carte eu-g"><h2>Groupe ${k}</h2><table class="cl"><thead><tr><th>#</th><th>Club</th><th>J</th><th>Diff</th><th>Pts</th></tr></thead><tbody>
    ${L.map((r, i) => `<tr class="${r.id === moi ? 'moi' : ''} lien${i < 2 && r.j >= 6 ? ' q' : ''}" data-act="ficheClub" data-c="${r.id}" tabindex="0"><td>${i + 1}</td><td class="club"><div>${blason(r.id, 'p')}<span>${esc(club(r.id).nom)}</span></div></td><td>${r.j}</td><td>${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td><td class="pts">${r.pts}</td></tr>`).join('')}</tbody></table></div>`;
}
function duel(M_, a, b, L, titre){
  const ms = L.filter(m => (m.dom === a || m.ext === a) && (m.dom === b || m.ext === b)), moi = M_.manager.club;
  const pts = id => ms.reduce((t, m) => t + (m.res ? (m.dom === id ? m.res.score[0] : m.res.score[1]) : 0), 0), fini = ms.length && ms.every(m => m.res);
  const E = M_.europe, out = id => E.sortie[id] && E.sortie[id] !== 'v' && fini;
  return `<div class="eu-duel${[a, b].includes(moi) ? ' moi' : ''}">${titre ? `<small class="mut">${titre}</small>` : ''}
    ${[a, b].map(id => `<div class="eu-c${out(id) ? ' out' : ''}">${blason(id, 'p')}<b>${esc(club(id).nom)}</b>${ms.map(m => `<span class="eu-s">${m.res ? (m.dom === id ? m.res.score[0] : m.res.score[1]) : '–'}</span>`).join('')}${ms.length > 1 ? `<span class="eu-t">${ms.some(m => m.res) ? pts(id) : ''}</span>` : ''}</div>`).join('')}
    <small class="mut">${ms.map(m => (m.res ? '' : Z.fmtDate(m.date) + ' · ') + (m.neutre ? 'terrain neutre' : 'à ' + esc(club(m.dom).ville))).join(' · ')}</small></div>`;
}
function vueEurope(){
  const M_ = M(), E = M_.europe, Q_ = QE(); if (!E) return '<div class="carte"><p class="mut" style="margin:0">La Ligue des Anneaux commence la saison prochaine.</p></div>';
  const L = M_.calendrier.flatMap(s => (s.matchs || []).filter(m => m.ligue === 'eu')), moi = M_.manager.club;
  const phase = E.vainqueur ? `Vainqueur : ${esc(club(E.vainqueur).nom)}` : E.tours.f ? 'Finale à venir' : E.tours.sf ? 'Demi-finales' : E.tours.qf ? 'Quarts de finale' : 'Phase de groupes';
  const ko = (cle, nom) => { if (!E.tours[cle]) return ''; const Lt = L.filter(m => String(m.tour).startsWith(cle));   // seulement les matchs de ce tour (deux clubs ont pu se croiser en poule)
    return `<div class="carte"><h2>${nom}</h2>${cle === 'f' ? duel(M_, E.tours.f[0], E.tours.f[1], Lt) : E.tours[cle].map(([a, b]) => duel(M_, a, b, Lt)).join('')}</div>`; };
  const H = (M_.europeHist || []).slice().reverse();
  return `<div class="carte"><h2>${esc(Q_.NOM)} ${lab(E.saison)}</h2><p class="sous" style="margin:0">${phase} · ${E.qual.length} clubs${moi && E.qual.includes(moi) ? ' · ton club est qualifié' : ''}</p></div>
    ${ko('f', 'Finale')}${ko('sf', 'Demi-finales')}${ko('qf', 'Quarts de finale')}
    <div class="eu-grille">${Object.entries(E.tables).map(([k, T]) => tableGroupe(M_, k, T)).join('')}</div>
    ${H.length ? `<div class="carte"><h2>Palmarès</h2><div class="liste">${H.map(h => `<div class="el">${blason(h.v, 'p')}<div class="t"><b>${esc(club(h.v).nom)}</b><span>${lab(h.saison)} · finale ${h.score.join('–')} contre ${esc(club(h.f).nom)}</span></div></div>`).join('')}</div></div>` : ''}
    <p class="petit mut">16 clubs : les 4 premiers de chaque championnat ; le tenant du titre qui finit plus bas prend la 4e place de sa ligue. Groupes en aller-retour le mercredi (journées 3 à 13), quarts en janvier et demies fin mars en aller-retour (points cumulés, puis buts, puis vifs), finale sur un match en terrain neutre après la dernière journée. Primes : ${Z.eur ? Z.eur(Q_.PRIMES.participation) : Q_.PRIMES.participation} de participation, puis à chaque victoire et à chaque tour.</p>`;
}

/* ---------- v106 : les sélections (trêves internationales, Ligue des nations, stats des matchs de sélection) ---------- */
const QN = () => window.QMN;
const ancienneSaison = () => M().calendrier.some(s => s.tour);   // saison d'avant v106 : le Tournoi des Six Emblèmes
const natNom = n => (D.NATIONS[n] || {}).nom || n;
const ligneMatchN = (m, moiN) => `<div class="el${moiN && (m.dom === moiN || m.ext === moiN) ? ' moi' : ''}">${blason(m.dom, 'p', 1)}<div class="t"><b>${esc(natNom(m.dom))} – ${esc(natNom(m.ext))}</b><span>${m.res ? `${m.res.score[0]}–${m.res.score[1]}${m.res.vif != null ? ' · vif d\'or : ' + esc(natNom(m.res.vif ? m.ext : m.dom)) : ''}` : 'à jouer'}${m.neutre ? ' · terrain neutre' : ''}</span></div>${blason(m.ext, 'p', 1)}</div>`;
function tableNations(rows, qualif){
  const moiN = M().manager.selection ? M().manager.selection.nat : null;
  return `<table class="cl"><thead><tr><th>#</th><th>Nation</th><th>J</th><th class="tab-cache">V</th><th class="tab-cache">N</th><th class="tab-cache">D</th><th>Diff</th><th>Pts</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr class="${r.id === moiN ? 'moi' : ''}${qualif && i < qualif && r.j ? ' q' : ''}"><td>${i + 1}</td><td class="club"><div>${blason(r.id, 'p', 1)}<span>${esc(natNom(r.id))}</span></div></td><td>${r.j}</td><td class="tab-cache">${r.g}</td><td class="tab-cache">${r.n}</td><td class="tab-cache">${r.p}</td><td>${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td><td class="pts">${r.pts}</td></tr>`).join('')}</tbody></table>`;
}
function vueLdn(){
  const N = QN(), E = N.etat(M()), L = E.ldn, moiN = M().manager.selection ? M().manager.selection.nat : null;
  const H = E.hist.slice().reverse();
  const palm = H.length ? `<div class="carte"><h2>Palmarès</h2><div class="liste">${H.map(h => `<div class="el">${blason(h.v, 'p', 1)}<div class="t"><b>${esc(natNom(h.v))}</b><span>été ${h.saison + 1} · finale ${h.score.join('–')} contre ${esc(natNom(h.f))}</span></div></div>`).join('')}</div></div>` : '';
  if (!L) return `<div class="carte"><h2>${esc(D.LDN.nom)}</h2><p class="mut" style="margin:0">${E.aLdn ? 'Le tirage des groupes se fait au début de la saison.' : `Pas de ${esc(D.LDN.nom)} cet été : la prochaine se joue l'été ${M().saison + 2} (saison ${lab(M().saison + 1)}). Cet été, une trêve internationale en juin.`}</p></div>${palm}`;
  const phase = L.vainqueur ? `Vainqueur : ${esc(natNom(L.vainqueur))}` : E.tours.find(([, ms]) => ms.length && ms.some(m => !m.res)) ? N.ETAPES[E.tours.find(([, ms]) => ms.length && ms.some(m => !m.res))[0]] : E.tours.some(([, ms]) => ms.length) ? 'Tableau final' : 'Phase de groupes';
  const ko = E.tours.slice().reverse().filter(([, ms]) => ms.length).map(([e, ms]) => `<div class="carte"><h2>${N.ETAPES[e]}</h2><div class="liste">${ms.map(m => ligneMatchN(m, moiN)).join('')}</div></div>`).join('');
  return `<div class="carte"><h2>${esc(D.LDN.nom)} · été ${L.saison + 1}</h2><p class="sous" style="margin:0">${phase} · 19 sélections${moiN ? ` · ${esc(natNom(moiN))} : ${esc(N.SORTIE[L.sortie[moiN]] || '')}` : ''}</p></div>
    ${ko}<div class="eu-grille">${E.groupes.map(([g, T]) => `<div class="carte eu-g"><h2>Groupe ${g}</h2>${tableNations(T, 2)}</div>`).join('')}</div>${palm}
    <p class="petit mut">L'été, une saison sur deux : 4 groupes tirés dans des chapeaux de force (un match contre chaque adversaire), les deux premiers en quarts, puis demies et finale en terrain neutre. À égalité, la sélection qui a pris le vif d'or passe.</p>`;
}
function vueMatchsNations(){
  const moiN = M().manager.selection ? M().manager.selection.nat : null, N = QN();
  const S = M().calendrier.filter(s => s.type === 'sixn' && s.comp);
  return S.map(s => `<div class="carte"><h2>${esc(N.titreSemaine(s))} <span class="mut">${Z.fmtDate(s.date)}</span></h2>${s.matchs.length ? `<div class="liste">${s.matchs.map(m => ligneMatchN(m, moiN)).join('')}</div>` : '<p class="mut" style="margin:0">Affiches selon les résultats.</p>'}</div>`).join('')
    + `<p class="petit mut">Trêves internationales en octobre, novembre et mars (et en juin les étés sans ${esc(D.LDN.nom)}) : les championnats s'arrêtent une semaine et chaque sélection joue un amical contre une adversaire tirée au sort.</p>`;
}
/* colonnes : [clé, titre, largeur, valeur(j), format, bas, info] (même tableau que les stats du championnat) */
const COL_N = [['m', 'Sél.', 42, j => j.nS.m, v => v, 0, 'Matchs de sélection cette saison'], ['b', 'Buts', 42, j => j.nS.b, v => v, 0, 'Buts'], ['v', 'Vifs', 40, j => j.nS.v, v => v, 0, 'Vifs d\'or attrapés'],
  ['cog', 'Cogn.', 44, j => j.nS.cog, v => v, 0, 'Cognards réussis'], ['arr', 'Arrêts', 46, j => j.nS.arr, v => v, 0, 'Arrêts'], ['note', 'Note', 44, j => j.nS.nn ? j.nS.notes / j.nS.nn : null, v => nb(v), 0, 'Note moyenne'],
  ['tot', 'Carr.', 44, j => j.sel || 0, v => v, 0, 'Sélections depuis le début de la partie'], ['totB', 'Buts c.', 50, j => j.selB || 0, v => v, 0, 'Buts en sélection depuis le début de la partie']];
function vueJoueursNations(){
  const an = M().saison, moiN = M().manager.selection ? M().manager.selection.nat : null, mc = M().manager.club;
  const filtre = CS.natF || 'toutes', tri = COL_N.some(c => c[0] === CS.natT) ? CS.natT : 'b';
  let L = Object.values(M().joueurs).filter(j => j.nS && j.nS.s === an && j.nS.m && (filtre === 'toutes' || j.nat === filtre));
  const choix = [['toutes', 'Toutes'], ...(moiN ? [[moiN, natNom(moiN)]] : []), ...(mc && club(mc).nat !== moiN ? [[club(mc).nat, natNom(club(mc).nat)]] : [])];
  const rows = L.map(j => ({id:j.id, o:j}));
  const t = rows.length ? tableau(rows, COL_N, tri, CS.natS || 1, 'natT', 'Joueur', (r, i) => `<button class="ts-l${r.o.club && r.o.club === mc ? ' moi' : ''}" role="row" data-act="joueur" data-j="${r.id}"><span class="ts-r">${i + 1}</span><span class="ts-n">${posteB(r.o.poste)}<b>${esc(r.o.p[0])}. ${esc(r.o.n)}</b>${flag(r.o.nat)}</span>`, 60) : '';
  return `<div class="chips petites">${choix.map(([k, n]) => `<button class="chip ${filtre === k ? 'on' : ''}" data-act="natF" data-v="${k}">${k === 'toutes' ? '' : Z.flagSeul(k) + ' '}${esc(n)}</button>`).join('')}</div>
    ${t ? `<div class="carte ts-carte">${t}</div>` : '<div class="carte"><p class="mut" style="margin:0">Aucun match de sélection joué cette saison.</p></div>'}
    <p class="petit mut">Matchs de sélection de la saison (amicaux et ${esc(D.LDN.nom)}) ; « Carr. » et « Buts c. » : depuis le début de la partie. Tes joueurs sont surlignés.</p>`;
}
function vueNations(){
  const k = CS.nat || (QN().etat(M()).ldn ? 'ldn' : 'matchs');
  const onglets = [['ldn', D.LDN.nom], ['matchs', 'Matchs'], ['bilan', 'Bilan'], ['joueurs', 'Joueurs']];
  const corps = k === 'ldn' ? vueLdn() : k === 'bilan' ? `<div class="carte">${tableNations(Q_().classement(M(), 'sixn'))}</div><p class="petit mut">Tous les matchs de sélection de la saison, amicaux compris.</p>` : k === 'joueurs' ? vueJoueursNations() : vueMatchsNations();
  return `<div class="seg mini st-vues" role="tablist">${onglets.map(([x, n]) => `<button role="tab" data-act="natVue" data-v="${x}" class="${k === x ? 'on' : ''}" aria-selected="${k === x}">${esc(n)}</button>`).join('')}</div><div class="st-zone">${corps}</div>`;
}
const Q_ = () => window.QM;
ACT.natVue = d => { CS.nat = d.v; Z.rendre(); };
ACT.natF = d => { CS.natF = d.v; Z.rendre(); };
ACT.natT = d => { if (CS.natT === d.t) CS.natS = -(CS.natS || 1); else { CS.natT = d.t; CS.natS = 1; } Z.rendre(); };

/* ---------- Classements : trois vues ---------- */
const orig = VUES.classements;
VUES.classements = function(){
  const Q_ = QE(), E = Q_ && Q_.assurer(M()), estEu = U.ligue === 'eu';
  if (estEu){ U.ligue = null; orig(); U.ligue = 'eu'; } else orig();
  const seg0 = Z.VUE.querySelector('.seg');
  if (Q_ && (E || M().europe) && seg0){
    if (estEu) seg0.querySelectorAll('button').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-selected', 'false'); });
    seg0.lastElementChild.insertAdjacentHTML('beforebegin', `<button role="tab" data-act="ligue" data-l="eu" class="${estEu ? 'on' : ''}" aria-selected="${estEu}">${esc(Q_.COURT)}</button>`);
  }
  if (seg0 && seg0.classList.contains('defile')){ const on = seg0.querySelector('.on'); if (on) requestAnimationFrame(() => { seg0.scrollLeft = Math.max(0, on.offsetLeft - (seg0.clientWidth - on.offsetWidth) / 2); }); }   // v106 : l'onglet choisi reste visible
  if (estEu){ [...Z.VUE.querySelectorAll(':scope > .carte, :scope > p.petit')].forEach(e => e.remove()); seg0.insertAdjacentHTML('afterend', `<div class="st-zone">${vueEurope()}</div>`); return; }
  const mc = M().manager.club && club(M().manager.club), l = U.ligue || (mc ? mc.ligue : Object.keys(M().ligues)[0]);
  if (l === 'sixn' && QN() && !ancienneSaison()){ const seg1 = Z.VUE.querySelector('.seg'); [...Z.VUE.querySelectorAll(':scope > .carte, :scope > p.petit')].forEach(e => e.remove()); if (seg1) seg1.insertAdjacentHTML('afterend', vueNations()); return; }   // v106
  if (l === 'sixn' || !M().ligues[l]) return;
  const seg = Z.VUE.querySelector('.seg'); if (!seg) return;
  seg.insertAdjacentHTML('afterend', `<div class="seg mini st-vues" role="tablist">${[['classement', 'Classement'], ['equipes', 'Stats équipes'], ['joueurs', 'Stats joueurs'], ['prix', 'Prix']].map(([k, n]) => `<button role="tab" data-act="stVue" data-v="${k}" class="${CS.vue === k ? 'on' : ''}" aria-selected="${CS.vue === k}">${n}</button>`).join('')}</div>`);
  if (CS.vue === 'classement') return;
  const zone = document.createElement('div'); zone.className = 'st-zone'; zone.innerHTML = CS.vue === 'equipes' ? vueEquipes(l) : CS.vue === 'prix' ? (window.QMR ? vuePrix(l) : '') : vueJoueurs(l);
  [...Z.VUE.querySelectorAll(':scope > .carte, :scope > p.petit')].forEach(e => e.remove());
  Z.VUE.querySelector('.st-vues').after(zone);
};
ACT.stVue = d => { CS.vue = d.v; CS.tri = null; CS.sens = 1; CS.max = 40; garder(); Z.rendre(); };
ACT.stGrp = d => { CS.grp = d.g; CS.tri = null; CS.sens = 1; garder(); Z.rendre(); };
ACT.stPoste = d => { CS.poste = d.p; CS.tri = null; CS.sens = 1; CS.max = 40; garder(); Z.rendre(); };
ACT.stTri = d => { if (CS.tri === d.t) CS.sens = -CS.sens; else { CS.tri = d.t; CS.sens = 1; } Z.rendre(); };
ACT.stPlus = () => { CS.max += 40; Z.rendre(); };
ACT.stAn = d => { CS.an = +d.a; Z.rendre(); };
ACT.hof = () => ficheHof();
Z.ficheHof = ficheHof;
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.chg === 'stRegul'){ CS.regul = t.checked; CS.max = 40; garder(); Z.rendre(); } });
window.QMS = {GRP_EQ, COL_J, COLS_POSTE};
})();
