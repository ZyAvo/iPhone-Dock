// mon-ecran-version: 2b32fd29
/* QM27 (v86, v89, v164) — le match en direct : terrain vu du dessus, radio, adjoint, temps forts, sons, temps mort, fin du match.
   Chargé après qm27-ui.js, dont il reçoit la boîte à outils (window.QMU) ; ses fonctions sont publiées dans window.QMF (v164 : découpage de qm27-ui.js). */
(() => {
'use strict';
const QU = window.QMU; if (!QU) return;
const {$, ACT, D, E, REG, TT, U, V, VUE, adversaireHTML, aller, blason, causerieHTML, classeNote, club, consignesHTML, court, divinationHTML, esc, feuille, fitOption, flag, fmtDate, nat, nb1, nomJ, nomOpt, optsMaitrise, parisHTML, pastille, plansHTML, plansPrev, posteB, presseHTML, previsionHTML, rendre, sauver, teteF, toast} = QU;

/* ---------- Match ---------- */
function vueMatch(){
  if (!QU.X) return aller('accueil');
  const L = U.live, fini = QU.X.fini, sixn = false;
  const e0 = QU.X.e[0], e1 = QU.X.e[1];
  const vifEtat = QU.X.vif >= 0 ? 'pris' : (QU.X.vifVu && !QU.X.vifCache) ? 'vu' : '';
  const vifTxt = QU.X.vif >= 0 ? `Vif d'or : ${esc(QU.X.e[QU.X.vif].sigle)}` : !QU.X.vifVu ? 'Vif d\'or pas encore vu' : QU.X.vifCache ? 'Vif d\'or caché' : 'Vif d\'or en vue !';
  const mm = String(Math.floor(QU.X.t / 60)).padStart(2, '0') + ':' + String(QU.X.t % 60).padStart(2, '0');
  const S = QU.X.stats, moi = QU.X.joueur;
  const avant = !L.parti;
  const nomScore = e => { const v = (QU.M.clubs[e.id] || {}).ville; return v && v !== e.nom ? `<span class="lg">${esc(e.nom)}</span><span class="ct">${esc(v)}</span>` : esc(e.nom); };
  VUE.innerHTML = `
  <div class="tableau" id="tableau">
    <div class="score">
      <div class="eq">${blason(e0.id, '')}<b>${nomScore(e0)}</b></div>
      <div class="pts"><strong id="sc">${QU.X.score[0]} – ${QU.X.score[1]}</strong><span id="mm">${avant ? fmtDate(QM.semaine(QU.M).date) : fini ? 'Terminé · ' + Math.round(QU.X.t / 60) + ' min' : mm}</span></div>
      <div class="eq dr">${blason(e1.id, '')}<b>${nomScore(e1)}</b></div>
    </div>
    <div class="mini"><span class="vifb ${vifEtat}" id="vifb"><i></i>${vifTxt}</span><span>${D.METEOS[QU.X.meteo].ico} ${D.METEOS[QU.X.meteo].nom}</span></div>
    ${!avant && !fini ? `<div class="ctrl">
      <button data-act="lecture" aria-label="${L.pause ? 'Reprendre' : 'Pause'}">${L.pause ? '▶︎' : '❚❚'}</button>
      ${[0.5, 1, 2, 4].map(v => `<button data-act="vitesse" data-v="${v}" class="${REG.vitesse === v ? 'on' : ''}" aria-label="Vitesse ${String(v).replace('.', ',')}">×${String(v).replace('.', ',')}</button>`).join('')}
      <button data-act="tempsMort" aria-label="Temps mort, ${QU.X.tm[moi]} restant${QU.X.tm[moi] > 1 ? 's' : ''}" ${QU.X.tm[moi] <= 0 ? 'disabled style="opacity:.4"' : ''}>TM ${QU.X.tm[moi]}</button>
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
  <div class="carte"><h2>${fini ? 'Tout le match' : 'En direct'} ${!fini ? '<span class="badge" id="enjeu"></span>' : ''}</h2><div class="fil" id="fil">${(fini ? QU.X.ev : QU.X.ev.filter(montrer)).slice().reverse().map(evHTML).join('')}</div></div>` : ''}`;
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
  const k0 = kit(col(QU.X.e[0]), []); return [k0, kit(col(QU.X.e[1]), [k0[0]])];
}
function terrainLive(){
  const [c0, c1] = couleursLive();
  const anneaux = x => [-12, 0, 12].map(dy => `<circle cx="${x}" cy="${56 + dy}" r="${dy ? 3 : 3.8}"/>`).join('');
  const jet = (k, id, p) => { const c = k ? c1 : c0;
    return `<g class="lj" id="lj-${id}" style="transform:translate(100px,56px)"><circle r="4.8" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.3"/>${p === 'A' ? '<circle r="1.5" fill="#f3d36b"/>' : p === 'G' ? `<rect x="-1.7" y="-1.7" width="3.4" height="3.4" fill="${c[1]}"/>` : p === 'B' ? `<path d="M-2.2 2.2l4.4-4.4" stroke="${c[1]}" stroke-width="1.4"/>` : ''}</g>`; };
  return `<svg class="tl" viewBox="0 0 200 112" role="img" aria-label="Le match vu du dessus : ${esc(QU.X.e[0].nom)} attaque vers la droite"><rect width="200" height="112" rx="10" class="tl-gz"/>
    <path d="M100 5v102M6 56h0" class="tl-l"/><circle cx="100" cy="56" r="12" class="tl-l"/><path d="M38 5v102M162 5v102" class="tl-l tl-z"/>
    <g class="tl-ann">${anneaux(8)}${anneaux(192)}</g>
    ${[0, 1].flatMap(k => ['G', 'B', 'P', 'A'].flatMap(p => QU.X.e[k][p].map(id => jet(k, id, p)))).join('')}
    <g id="lj-souafle" class="souafle" style="transform:translate(100px,56px)"><circle r="2.3"/></g>
    <g id="lj-vif" class="vifl" style="transform:translate(100px,56px);opacity:0"><path d="M-1.4 0l-3.4-1.8M1.4 0l3.4-1.8"/><circle r="1.9"/></g></svg>`;
}
function majTerrain(evs){
  const svg = document.querySelector('.tl'); if (!svg || !QU.X) return;
  if (QU.X.e.some(e => ['P', 'B', 'A', 'G'].some(p => e[p].some(id => !svg.querySelector('#lj-' + id))))){ svg.outerHTML = terrainLive(); return majTerrain(evs); }
  const n = QU.X.pas, alea = s => { const x = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
  const P = {}, place = (id, k, u, v) => { const x = 8 + Math.max(0, Math.min(100, u)) * 1.84, y = 6 + Math.max(2, Math.min(98, v)); P[id] = [k ? 200 - x : x, y]; };
  const vifVisible = QU.X.vif < 0 && QU.X.vifVu && !QU.X.vifCache, L = U.live;
  if (vifVisible){ L.vp = L.vp || [100, 30]; L.vp = [Math.max(20, Math.min(180, L.vp[0] + alea(91) * 26)), Math.max(10, Math.min(102, L.vp[1] + alea(92) * 20))]; }
  for (const k of [0, 1]){
    const e = QU.X.e[k], T = QM.completerTactique({...e.tactique}), ph = QU.X.poss === k ? 'avec' : 'sans', F = FORM_LIVE[ph];
    e.P.forEach((id, i) => { const [u, v] = F.P[ph === 'avec' ? T.avec : T.sans][i]; place(id, k, u + alea(i + k * 7) * 9, v + alea(i + 3 + k * 7) * 10); });
    e.B.forEach((id, i) => { const [u, v] = F.B[ph === 'avec' ? T.batAvec : T.batSans][i]; place(id, k, u + alea(20 + i + k) * 12, v + alea(24 + i + k) * 14); });
    e.G.forEach(id => place(id, k, F.G[0] + alea(30 + k) * 3, F.G[1] + alea(31 + k) * 16));
    e.A.forEach(id => { if (vifVisible){ const [x, y] = L.vp, cur = (L.pa || {})[id] || [100, k ? 96 : 16]; P[id] = [cur[0] + (x - cur[0]) * 0.45 + alea(40 + k) * 6, cur[1] + (y - cur[1]) * 0.45 + alea(41 + k) * 6]; }
      else place(id, k, 46 + alea(42 + k) * 30, k ? 92 + alea(43) * 6 : 10 + alea(44) * 6); });
  }
  L.pa = P;
  for (const [id, [x, y]] of Object.entries(P)){ const g = svg.querySelector('#lj-' + id); if (g) g.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
  for (const id of (QU.X.exclus || []).flat()){ const g = svg.querySelector('#lj-' + id); if (g) g.style.display = 'none'; }   // v158 : exclu
  const but = evs.find(ev => ev.but), ball = svg.querySelector('#lj-souafle');
  if (ball){ let bx, by;
    if (but){ bx = but.e === 0 ? 192 : 8; by = 56 + alea(50) * 18; }
    else { const car = QU.X.e[QU.X.poss].P[(n >> 2) % QU.X.e[QU.X.poss].P.length]; [bx, by] = P[car] || [100, 56]; bx += QU.X.poss ? -3 : 3; by -= 3; }
    ball.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`; }
  const vif = svg.querySelector('#lj-vif');
  if (vif){ if (QU.X.vif >= 0){ const sid = QU.X.e[QU.X.vif].A[0], p = P[sid] || [100, 56]; vif.style.opacity = 1; vif.style.transform = `translate(${p[0]}px,${p[1] - 4}px)`; }
    else if (vifVisible){ vif.style.opacity = 1; vif.style.transform = `translate(${L.vp[0].toFixed(1)}px,${L.vp[1].toFixed(1)}px)`; } else vif.style.opacity = 0; }
}
/* v97 : statistiques du match (équipes, nos joueurs avec leur physique, joueurs adverses), mises à jour en direct */
const ORD_P = {P:0, B:1, A:2, G:3};
function statsMatchHTML(){
  if (!QU.X) return '';
  const o = U.ongStats || 'eq', S = QU.X.stats, moi = QU.X.joueur, adv = 1 - moi, N = QM.notesMatch(QU.X);
  if (o === 'eq'){
    const pc = (a, b) => a + b ? [Math.round(a / (a + b) * 100), Math.round(b / (a + b) * 100)] : [50, 50];
    const prec = k => S[k].tirs ? Math.round(S[k].buts / S[k].tirs * 100) : 0;
    const fatM = k => { const L = QM.titulaires(QU.X.e[k]); return Math.round(L.reduce((t, id) => t + (QU.X.fat[id] || 0), 0) / (L.length || 1)); };
    const noteM = k => { const L = Object.entries(N).filter(([id]) => QU.X.perf[id] && QU.X.perf[id].eq === k).map(x => x[1]); return L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0; };
    const ps = pc(S[0].poss || 0, S[1].poss || 0);
    /* [libellé, valeur gauche, valeur droite, texte gauche, texte droit, plus haut = mieux ?] */
    const L = [['Possession', ps[0], ps[1], ps[0] + ' %', ps[1] + ' %', true], ['Tirs', S[0].tirs, S[1].tirs, , , true], ['Buts', S[0].buts, S[1].buts, , , true],
      ['Précision', prec(0), prec(1), prec(0) + ' %', prec(1) + ' %', true], ['Buts attendus', S[0].xb || 0, S[1].xb || 0, virg(S[0].xb), virg(S[1].xb), true],
      ['Arrêts', S[0].arrets, S[1].arrets, , , true], ['Cognards réussis', S[0].cog, S[1].cog, , , true], ['Fautes', S[0].fautes, S[1].fautes, , , false], ['Cartons jaunes', S[0].cj || 0, S[1].cj || 0, , , false], ['Exclusions', S[0].cr || 0, S[1].cr || 0, , , false],
      ['Penalties obtenus', S[0].pen, S[1].pen, , , true], ['Note moyenne', noteM(0), noteM(1), virg(noteM(0)), virg(noteM(1)), true],
      ['Fatigue moyenne', fatM(0), fatM(1), fatM(0) + ' %', fatM(1) + ' %', false], ['Moral', QU.X.moral[0], QU.X.moral[1], nb1(QU.X.moral[0]), nb1(QU.X.moral[1]), true],
      ['Temps morts', QU.X.tm[0], QU.X.tm[1], , , true], ['Changements', QU.X.rempl[0], QU.X.rempl[1], , , true]];
    return `<div class="stm-t"><b>${esc(QU.X.e[0].sigle || QU.X.e[0].nom)}</b><span></span><b>${esc(QU.X.e[1].sigle || QU.X.e[1].nom)}</b></div>${L.map(([l, a, b, ta, tb, haut]) => { const t = Math.abs(a) + Math.abs(b) || 1, wa = Math.abs(a) / t * 100, mieux = a === b ? -1 : (a > b) === haut ? 0 : 1;
      return `<div class="stm-l"><span class="${mieux === 0 ? 'f' : ''}">${ta ?? a}</span><div><em>${l}</em><div class="stm-b"><i style="width:${wa}%" class="${mieux === 0 ? 'f' : ''}"></i><i style="width:${100 - wa}%" class="${mieux === 1 ? 'f' : ''}"></i></div></div><span class="${mieux === 1 ? 'f' : ''}">${tb ?? b}</span></div>`; }).join('')}`;
  }
  const k = o === 'moi' ? moi : adv, e = QU.X.e[k], tit = QM.titulaires(e), banc = e.banc || [];
  const poste = id => ['P', 'B', 'A', 'G'].find(p => e[p].includes(id));
  const bl = new Set(QU.X.bless.filter(b => b.eq === k).map(b => b.id));
  const jeu = (id, p) => { const q = QU.X.perf[id] || {}; return p === 'P' ? `${q.b || 0} but${(q.b || 0) > 1 ? 's' : ''} / ${q.t || 0} tir${(q.t || 0) > 1 ? 's' : ''}` : p === 'B' ? `${q.cog || 0} cognard${(q.cog || 0) > 1 ? 's' : ''}` : p === 'G' ? `${q.arr || 0} arrêt${(q.arr || 0) > 1 ? 's' : ''} · ${q.enc || 0} enc.` : (q.vif ? 'vif d\'or !' : QU.X.sonne[k] > 0 ? 'sonné' : '—'); };
  const ligne = (id, p, surBanc) => { const j = QU.M.joueurs[id]; if (!j) return ''; const q = QU.X.perf[id] || {}, fat = Math.round(QU.X.fat[id] || 0), rend = Math.round(QM.rendement(QU.X, k, id) * 100);
    const det = o === 'moi' ? `${!surBanc ? `rendement ${rend} % · ` : ''}moral ${j.moral} · forme ${virg(j.forme)} · charge ${Math.round(j.charge || 0)}${q.f ? ` · ${q.f} faute${q.f > 1 ? 's' : ''}` : ''}` : `${!surBanc ? `rendement ${rend} %` : 'remplaçant'}${q.f ? ` · ${q.f} faute${q.f > 1 ? 's' : ''}` : ''}`;
    return `<div class="stm-j${bl.has(id) ? ' bless' : ''}">${posteB(p)}<div class="t"><b>${esc(court(j))}${bl.has(id) ? ' <span class="badge" style="color:var(--mauvais)">blessé</span>' : ''}${(QU.X.cartons || []).filter(c => c.id === id).map(c => `<span class="crt-m ${c.c === 'j' ? 'j' : 'r'}" title="${c.c === 'j' ? 'Carton jaune' : c.c === 'j2' ? 'Second jaune, exclu' : 'Carton rouge'} (${Math.floor(c.t / 60)}e)"></span>`).join('')}${QU.X.exclus && QU.X.exclus[k].includes(id) ? ' <span class="badge" style="color:var(--mauvais)">exclu</span>' : ''}</b><span>${det}</span></div>
      <div class="stm-n">${surBanc || N[id] == null ? '—' : virg(N[id])}</div><div class="stm-a">${surBanc ? '' : jeu(id, p)}</div>
      <div class="stm-f" title="Fatigue ${fat} %"><div class="barre fat"><i style="width:${fat}%"></i></div><small class="${fat >= 70 ? 'mauvais' : fat >= 50 ? 'moyen' : ''}">${fat} %</small></div></div>`; };
  const tri = L => L.slice().sort((a, b) => ORD_P[poste(a) || QU.M.joueurs[a].poste] - ORD_P[poste(b) || QU.M.joueurs[b].poste]);
  return `<div class="stm-h"><span></span><span>Joueur</span><span>Note</span><span>Match</span><span>Fatigue</span></div>${tri([...tit, ...(QU.X.exclus ? QU.X.exclus[k] : [])]).map(id => ligne(id, poste(id) || QU.M.joueurs[id].poste, false)).join('')}
    ${banc.length ? `<h4 class="stm-g">Banc</h4>${banc.map(id => ligne(id, QU.M.joueurs[id] ? QU.M.joueurs[id].poste : 'P', true)).join('')}` : ''}
    <p class="petit mut" style="margin:8px 0 0">Rendement : ce que le joueur donne en ce moment (fatigue, forme, moral). ${o === 'moi' ? 'Charge : fatigue cumulée des dernières semaines.' : 'Leur moral et leur charge ne se voient pas depuis le banc.'}</p>`;
}
function statsLive(){ const S = QU.X.stats; return `Tirs <b>${S[0].tirs}–${S[1].tirs}</b> · Buts attendus <b>${virg(S[0].xb)}–${virg(S[1].xb)}</b> · Cognards <b>${S[0].cog}–${S[1].cog}</b>`; }
/* radio : les autres matchs de la semaine, simulés d'avance (même graine que plus tard) et dévoilés minute par minute */
function preparerRadio(){
  const S = QM.semaine(QU.M), mj = QM.matchDuJoueur(QU.M); if (!S || !mj) return [];
  const ligue = mj.ligue;
  return S.matchs.filter(m => m.id !== mj.id && !m.res).sort((a, b) => (b.ligue === ligue) - (a.ligue === ligue)).slice(0, 8).map(m => {
    const Y = QM.simulerMatch(QU.M, m); return {dom:m.dom, ext:m.ext, sixn:m.ligue === 'sixn', ev:Y.ev.filter(e => e.but || e.fin).map(e => [e.t, e.sc]), fin:Y.t, score:Y.score.slice()}; });
}
function radioHTML(){
  const t = QU.X.fini ? Infinity : QU.X.t, sig = (id, sx) => esc(sx || D.NATIONS[id] ? nat(id).court : club(id).sigle);
  return (U.live.radio || []).map(r => { const fini = t >= r.fin, sc = fini ? r.score : (r.ev.filter(e => e[0] <= t).pop() || [0, [0, 0]])[1];
    return `<div class="rd${fini ? ' fin' : ''}"><span>${sig(r.dom, r.sixn)}</span><b>${sc[0]}–${sc[1]}</b><span>${sig(r.ext, r.sixn)}</span><i>${fini ? 'fin' : Math.floor(Math.min(t, r.fin) / 60) + "'"}</i></div>`; }).join('');
}
/* l'adjoint : deux conseils au plus, appliqués au prochain temps mort */
function conseils(){
  if (!QU.X || QU.X.fini) return [];
  const moi = QU.X.joueur, T = QM.completerTactique({...QU.X.e[moi].tactique}), To = QU.X.e[1 - moi].tactique, d = QU.X.score[moi] - QU.X.score[1 - moi], S = QU.X.stats, L = [], min = QU.X.t / 60;
  if (d < -E.points.vif && T.attrapeur === 'chasse') L.push([`Mené de plus de ${E.points.vif} points : ton attrapeur doit attendre (« Si ça fait gagner »).`, 'attrapeur', 'gagnant']);
  const sd = QM.sansDe(To), cz = QM.CONTRE[sd];
  if (min >= 3 && cz && T.zone !== cz) L.push([`Ils défendent en ${nomOpt('sans', sd).toLowerCase()} : attaque ${cz === 'loin' ? 'de loin' : cz === 'axe' ? 'par l\'axe' : 'par les couloirs'}.`, 'zone', cz]);
  if (min > 12 && (S[1 - moi].xb || 0) - (S[moi].xb || 0) > 3 && T.sans !== 'repli') L.push(['Ils se créent plus d\'occasions que nous : resserre-toi en repli.', 'sans', 'repli']);
  if (d > 120 && T.rythme > 1) L.push(['On mène largement : baisse le rythme pour garder des forces.', 'rythme', 1]);
  if (d < -40 && min > 35 && T.risque < 3) L.push(['Il faut revenir au score : prends plus de risques.', 'risque', 3]);
  const tit = QM.titulaires(QU.X.e[moi]), fat = Math.round(tit.reduce((s, id) => s + (QU.X.fat[id] || 0), 0) / (tit.length || 1));
  if (fat > 55 && QU.X.rempl[moi] > 0) L.push([`Les jambes sont lourdes (fatigue moyenne ${fat} %) : fais tourner au prochain temps mort.`, null, null]);
  return L.slice(0, 2);
}
function majAdjoint(){
  const el = $('#adj'); if (!el) return;
  const L = conseils(); el.hidden = !L.length; if (!L.length) return;
  el.innerHTML = `<h2>L'adjoint</h2>${L.map(c => `<p>${esc(c[0])}</p>`).join('')}${QU.X.tm[QU.X.joueur] > 0 ? `<button class="btn sec" data-act="tempsMort">Temps mort (${QU.X.tm[QU.X.joueur]})</button>` : '<p class="petit mut" style="margin:0">Plus de temps mort : à garder pour la prochaine fois.</p>'}`;
}
/* temps forts : tout montrer quand le match est serré, l'essentiel quand il est plié */
function enjeu(){ if (!QU.X) return 'fort'; const d = Math.abs(QU.X.score[0] - QU.X.score[1]); return d <= 70 || (QU.X.vifVu && !QU.X.vifCache) || QU.X.sixn ? 'fort' : d >= 150 ? 'faible' : 'moyen'; }
function montrer(ev){
  if (REG.resumes === 'tout' || !ev.txt) return true;
  if (ev.cle || /^(vif|fin|remplacement|temps_mort|penalty|blessure|faute_grave|carton|second|debut)/.test(ev.k)) return true;
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
  const coul = ev.e >= 0 ? QU.X.e[ev.e].couleurs[0] : '';
  const cls = ['ev', ev.but ? 'but' : '', ev.cle ? 'cle' : '', /^vif|fin_perdu/.test(ev.k) ? 'vif' : '', ev.carton ? 'crt-' + ev.carton : ''].join(' ');
  return `<div class="${cls}" style="${coul ? '--ce:' + coul : ''}"><span class="m">${Math.floor(ev.t / 60)}'</span><span class="x">${esc(ev.txt)}</span></div>`;
}
function avantMatchHTML(){
  const moi = QU.X.joueur, e = QU.X.e[moi], T = e.tactique;
  const ch = (QU.X.changements || []).filter(([a, b]) => QU.M.joueurs[b]).map(([a, b]) => QU.M.joueurs[a] ? `${court(QU.M.joueurs[a])} → ${court(QU.M.joueurs[b])}` : `${court(QU.M.joueurs[b])} (poste vide)`).join(', ');
  const A = TT() ? TT().adequationCompo(QU.M, {P:e.P, B:e.B, A:e.A, G:e.G, roles:e.roles || {}}, QM.completerTactique(T)) : {};
  let R = null, P = null; if (!QU.X.sixn && TT()) try { const m = QM.matchDuJoueur(QU.M); R = TT().rapport(QU.M, m); P = prevoirLive(QU.X.joueur, true); } catch (er){ console.warn('QM27 avant-match', er); }
  return `${divinationHTML()}${R ? adversaireHTML(R, QM.completerTactique(T)).replace(/data-act="consigne"/g, 'data-act="consigneAvant"') : ''}${!QU.X.sixn ? plansHTML(true) : ''}${P ? previsionHTML(P, R, 'consigneAvant') : ''}${causerieHTML('avant')}${parisHTML()}<div class="carte"><h2>Ta composition <button data-act="vue" data-v="${QU.X.sixn ? 'selection' : 'tactique'}">Modifier</button></h2>
    ${ch ? `<p class="petit" style="margin:0 0 8px;color:var(--moyen)">Remplacés (blessure ou sélection) : ${esc(ch)}</p>` : ''}
    <div class="liste">${['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => { const j = QU.M.joueurs[id], a = A[id]; return `<div class="el">${posteB(p)}<div class="t"><b>${pastille(a)} ${flag(j.nat)} ${esc(nomJ(j))}</b><span>Forme ${j.forme} · fatigue ${j.fat} %${a && a.raisons.length ? ' · ' + esc(a.raisons[0]) : ''}</span></div><span class="note ${classeNote(QM.note(j, p))}">${QM.note(j, p)}</span></div>`; })).join('')}</div>
    <p class="petit mut" style="margin:8px 0 0">Attrapeur : ${esc(nomOpt('attrapeur', T.attrapeur))} · rythme ${esc(nomOpt('rythme', T.rythme))} · avec le souafle : ${esc(nomOpt('avec', T.avec).toLowerCase())}, par ${esc(nomOpt('zone', T.zone).toLowerCase())} · sans : ${esc(nomOpt('sans', QM.sansDe(T)).toLowerCase())}</p></div>
  <div class="btns"><button class="btn or" data-act="lancer">Lancer le direct</button><button class="btn sec" data-act="direct">Résultat direct</button></div>
  <button class="btn sec plein" data-act="vue" data-v="accueil">Plus tard</button>`;
}
/* v96 : l'analyse de l'adjoint, calculée une fois à la fin du match */
function analyseHTML(){
  if (!TT() || !QU.X || !QU.X.fini) return '';
  if (!QU.X.analyse) try { QU.X.analyse = TT().analyse(QU.M, QU.X); } catch (er){ QU.X.analyse = []; console.warn('QM27 analyse', er); }
  if (!QU.X.analyse.length) return '';
  return `<div class="carte analyse"><h2>Analyse de l'adjoint</h2><ul class="an">${QU.X.analyse.map(([t, txt]) => `<li class="${t}">${esc(txt)}</li>`).join('')}</ul></div>`;
}
/* prévision sur le match en cours ou à venir (X), forme du jour neutralisée */
function prevoirLive(k, avant){
  if (!TT() || !QU.X) return null;
  /* v152 : avant le coup d'envoi, l'adjoint ne connaît que leur jeu habituel (pendant le match, on voit leur tactique) */
  const jour = QU.X.jour, fj = QU.X.fj, To = QU.X.e[1 - k].tactique, cache = avant && QU.X.attendue; QU.X.jour = [1, 1]; QU.X.fj = null; QU.X.levC = null;   // v155 : formes du jour cachées à l'adjoint if (cache) X.e[1 - k].tactique = QM.completerTactique({...X.attendue});
  try { const ctx = {X:QU.X, k}, P = TT().prevoir(ctx, QM.completerTactique({...QU.X.e[k].tactique})); return QU.X.sixn ? P : plansPrev(ctx, P, avant ? 'planAvant' : null); } finally { QU.X.jour = jour; QU.X.fj = fj; QU.X.levC = null; if (cache) QU.X.e[1 - k].tactique = To; }
}
function apresMatchHTML(){
  const moi = QU.X.joueur, S = QU.X.stats, N = QM.notesMatch(QU.X), r = QU.X.score[moi] - QU.X.score[1 - moi];
  const titre = r > 0 ? 'Victoire !' : r < 0 ? 'Défaite' : 'Match nul';
  const vifJ = QU.X.e[QU.X.vif].A[0], vifNom = QU.M.joueurs[vifJ] ? nomJ(QU.M.joueurs[vifJ]) : '';
  const notes = Object.entries(N).filter(([id]) => QU.X.perf[id] && QU.X.perf[id].eq === moi).sort((a, b) => b[1] - a[1]);
  const homme = Object.entries(N).sort((a, b) => b[1] - a[1])[0];
  return `<div class="carte" style="border-color:${r > 0 ? 'var(--bon)' : r < 0 ? 'var(--mauvais)' : 'var(--line)'}"><h2>${titre}</h2>
    <p style="margin:0 0 4px">Vif d'or attrapé par <b>${esc(vifNom)}</b> (${esc(QU.X.e[QU.X.vif].nom)}) à la ${Math.round(QU.X.t / 60)}e minute.</p>
    ${homme ? `<p class="sous" style="margin:0 0 10px">Homme du match : ${esc(nomJ(QU.M.joueurs[homme[0]]))} (${homme[1]})</p>` : ''}
    <div class="stat">${[['buts', 'Buts'], ['xb', 'Buts attendus'], ['tirs', 'Tirs'], ['arrets', 'Arrêts'], ['cog', 'Cognards réussis'], ['fautes', 'Fautes'], ['cj', 'Cartons jaunes'], ['cr', 'Exclusions'], ['pen', 'Penalties obtenus']].map(([k, n]) => `<span>${k === 'xb' ? virg(S[0].xb) : S[0][k] || 0}</span><span>${n}</span><span>${k === 'xb' ? virg(S[1].xb) : S[1][k] || 0}</span>`).join('')}</div>
    <button class="btn plein" style="margin-top:14px" data-act="finMatch">Continuer</button></div>
  ${analyseHTML()}
  ${presseHTML()}
  <div class="carte"><h2>Notes de ton équipe</h2><div class="liste">${notes.map(([id, n]) => { const j = QU.M.joueurs[id], p = QU.X.perf[id];
    return `<div class="el">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>${[p.b ? p.b + ' but' + (p.b > 1 ? 's' : '') : '', p.arr ? p.arr + ' arrêt' + (p.arr > 1 ? 's' : '') : '', p.cog ? p.cog + ' cognard' + (p.cog > 1 ? 's' : '') : '', p.vif ? 'vif d\'or' : ''].filter(Boolean).join(' · ') || '—'}</span></div><span class="note ${n >= 7 ? 'n4' : n >= 6 ? 'n3' : n >= 5 ? 'n2' : 'n1'}">${n.toFixed(1)}</span></div>`; }).join('')}</div></div>`;
}
/* direct */
function demarrerDirect(){ U.live = {parti:true, pause:false, timer:null, radio:preparerRadio()}; rendre(); Son.demarrer(); Son.sifflet(true); boucle(); }
function boucle(){
  clearInterval(U.live && U.live.timer);
  if (!U.live || U.live.pause || QU.X.fini) return;
  U.live.timer = setInterval(tic, 1000 / (4 * REG.vitesse));
}
function tic(){
  if (!QU.X || QU.X.fini){ clearInterval(U.live.timer); return; }
  const evs = QM.pas(QU.X);
  const fil = $('#fil');
  if (fil) for (const ev of evs){ if (!montrer(ev)) continue; const h = evHTML(ev); if (h) fil.insertAdjacentHTML('afterbegin', h); }
  for (const ev of evs){ if (ev.but) Son.clameur(ev.e === QU.X.joueur ? 1 : 0.45); if (ev.k === 'vif_apercu' && ev.vif === 'vu') Son.carillon(); if (/^penalty|^faute_grave|^carton|^second/.test(ev.k)) Son.sifflet(false); }
  majTableau(); majTerrain(evs);
  const st = $('#stl'); if (st) st.innerHTML = statsLive();
  const sm = $('#stm'), now = Date.now(); if (sm && now - (U.live.stmT || 0) > 900){ U.live.stmT = now; sm.innerHTML = statsMatchHTML(); }
  if (QU.X.pas % 4 === 0){ const rd = $('#radio'); if (rd) rd.innerHTML = radioHTML(); majEnjeu(); }
  if (QU.X.pas % 12 === 0) majAdjoint();
  if (QU.X.fini){ clearInterval(U.live.timer); Son.sifflet(true); Son.clameur(QU.X.vif === QU.X.joueur ? 1 : 0.3); setTimeout(() => Son.arreter(), 2500); setTimeout(() => { rendre(); scrollTo({top:0, behavior:'smooth'}); }, 1100); return; }
  const k = evs.find(ev => ev.cle && ((ev.k === 'blessure' && REG.pauses.blessure) || (ev.k === 'carton_rouge' || ev.k === 'second_jaune') && REG.pauses.faute_grave || (ev.k === 'vif_apercu' && ev.vif === 'vu' && REG.pauses.vif_apercu)));
  if (k) pauseAuto(k);
}
function majTableau(){
  const sc = $('#sc'), mm = $('#mm'), vb = $('#vifb');
  if (sc) sc.textContent = `${QU.X.score[0]} – ${QU.X.score[1]}`;
  if (mm) mm.textContent = String(Math.floor(QU.X.t / 60)).padStart(2, '0') + ':' + String(QU.X.t % 60).padStart(2, '0');
  if (vb){ const etat = QU.X.vif >= 0 ? 'pris' : (QU.X.vifVu && !QU.X.vifCache) ? 'vu' : ''; vb.className = 'vifb ' + etat;
    vb.innerHTML = `<i></i>${QU.X.vif >= 0 ? 'Vif d\'or attrapé' : !QU.X.vifVu ? 'Vif d\'or pas encore vu' : QU.X.vifCache ? 'Vif d\'or caché' : 'Vif d\'or en vue !'}`; }
}
function pauseAuto(ev){
  U.live.pause = true; clearInterval(U.live.timer);
  const old = document.querySelector('.pause'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'pause'; d.setAttribute('role', 'alertdialog');
  d.innerHTML = `<p>⏸ ${esc(ev.txt)}</p><div class="btns"><button class="btn" data-act="reprendre">Reprendre</button>${QU.X.tm[QU.X.joueur] > 0 ? '<button class="btn sec" data-act="tempsMort">Temps mort</button>' : ''}</div>`;
  document.body.appendChild(d); rendreCtrl();
}
function rendreCtrl(){ const b = document.querySelector('.ctrl [data-act="lecture"]'); if (b){ b.textContent = U.live.pause ? '▶︎' : '❚❚'; b.setAttribute('aria-label', U.live.pause ? 'Reprendre' : 'Pause'); } }
function reprendre(){ const d = document.querySelector('.pause'); if (d) d.remove(); if (!U.live) return; U.live.pause = false; rendreCtrl(); boucle(); }
function ouvrirTempsMort(){
  const moi = QU.X.joueur;
  if (!QM.tempsMort(QU.X, moi)) return;
  const d = document.querySelector('.pause'); if (d) d.remove();
  U.live.pause = true; U.live.tm = true; clearInterval(U.live.timer);
  const fil = $('#fil'); if (fil){ const ev = QU.X.ev[QU.X.ev.length - 1]; fil.insertAdjacentHTML('afterbegin', evHTML(ev)); }
  rendreTempsMort();
  const b = document.querySelector('.ctrl [data-act="tempsMort"]'); if (b){ b.textContent = `TM ${QU.X.tm[moi]}`; if (!QU.X.tm[moi]){ b.disabled = true; b.style.opacity = '.4'; } }
}
function rendreTempsMort(){
  const moi = QU.X.joueur, e = QU.X.e[moi];
  const tit = ['P', 'B', 'A', 'G'].flatMap(p => e[p].map(id => [p, id]));
  const sel = U.live.sortant;
  feuille(`${teteF('Temps mort', `${QU.X.rempl[moi]} changement${QU.X.rempl[moi] > 1 ? 's' : ''} libre${QU.X.rempl[moi] > 1 ? 's' : ''} · ${Math.floor(QU.X.t / 60)}e minute`)}
    ${conseils().filter(c => c[1]).length ? `<div class="carte adj"><h2>L'adjoint</h2>${conseils().filter(c => c[1]).map(c => `<div class="ligne" style="gap:10px;margin-bottom:8px"><span style="flex:1">${esc(c[0])}</span><button class="btn sec" data-act="consigneLive" data-k="${c[1]}" data-v="${c[2]}">Appliquer</button></div>`).join('')}</div>` : ''}
    ${(() => { let P = null; try { P = prevoirLive(moi); } catch (er){} return P ? previsionHTML(P, null, 'consigneLive', true) : ''; })()}
    <div class="carte cons-c" style="margin-top:10px"><h2>Consignes</h2>${consignesHTML(QM.completerTactique(e.tactique), 'consigneLive', ['rythme', 'risque', 'agressivite', 'passes', 'avec', 'batAvec', 'zone', 'sans', 'batSans', 'cible', 'attrapeur'], {...(QU.X && !QU.X.sixn ? optsMaitrise(e.tactique) : {}), fit:fitOption({P:e.P, B:e.B, A:e.A, G:e.G, roles:e.roles || {}}, e.tactique)})}</div>
    <div class="carte" style="margin-top:10px"><h2>${sel ? 'Qui entre ?' : 'Remplacement : qui sort ?'}</h2><div class="liste">
    ${sel ? (e.banc || []).map(id => { const j = QU.M.joueurs[id]; const p = ['P', 'B', 'A', 'G'].find(q => e[q].includes(sel)); return `<button class="el" data-act="entre" data-j="${id}">${posteB(j.poste)}<div class="t"><b>${esc(nomJ(j))}</b><span>Note au poste ${QM.note(j, p)} · fatigue ${Math.round(QU.X.fat[id] || 0)} %</span></div></button>`; }).join('') || '<p class="mut">Plus personne sur le banc.</p>'
      : tit.map(([p, id]) => { const j = QU.M.joueurs[id]; return `<button class="el" data-act="sort" data-j="${id}" ${QU.X.rempl[moi] <= 0 ? 'disabled style="opacity:.5"' : ''}>${posteB(p)}<div class="t"><b>${esc(nomJ(j))}</b><span>Fatigue ${Math.round(QU.X.fat[id])} %</span></div></button>`; }).join('')}
    </div></div>
    ${causerieHTML('tm')}
    <button class="btn plein" style="margin-top:12px" data-act="fermer">Reprendre le match</button>`, true);
}
function reprendreApresTM(){ U.live.tm = false; U.live.sortant = null; reprendre(); }
function finDuMatch(){
  Son.arreter();
  const m = QM.matchDuJoueur(QU.M);
  clearInterval(U.live && U.live.timer);
  if (TT() && !QU.X.analyse) try { QU.X.analyse = TT().analyse(QU.M, QU.X); } catch (er){ QU.X.analyse = []; }
  const an = (QU.X.analyse || []).filter(x => x[0] !== 'info' || x[1].startsWith('Occasions'));
  const fin = QM.finirMatchDuJoueur(QU.M, QU.X);   // v91 : s'il reste le match du club cette semaine, on y revient
  if (an.length) QM.message(QU.M, `Analyse de l'adjoint : ${QU.X.e[QU.X.joueur].nom} ${QU.X.score[QU.X.joueur]}–${QU.X.score[1 - QU.X.joueur]} ${QU.X.e[1 - QU.X.joueur].nom}`, an.map(x => (x[0] === 'bon' ? '✓ ' : x[0] === 'mauvais' ? '✗ ' : '· ') + x[1]).join('\n'), 'staff');
  const moi = QU.X.joueur, r = QU.X.score[moi] - QU.X.score[1 - moi];
  QU.M.dernierMatch = {dom:m.dom, ext:m.ext, score:m.res.score, sixn:m.ligue === 'sixn', resume:`${r > 0 ? 'Victoire' : r < 0 ? 'Défaite' : 'Nul'} · ${m.res.duree} min · vif d'or ${esc(QU.X.e[QU.X.vif].sigle)}`, id:m.id};
  QU.X = null; U.live = null; U.vue = 'accueil';
  sauver(); rendre(); scrollTo(0, 0);
  toast(fin.semaineFinie ? 'Journée terminée · résultats dans le calendrier' : m.ligue === 'eu' ? 'Match européen terminé · place au championnat' : 'Match de sélection terminé · place au match du club');
}


Object.assign(window.QMF = window.QMF || {}, {vueMatch, virg, FORM_LIVE, rgbDe, ecart, couleursLive, terrainLive, majTerrain, ORD_P, statsMatchHTML, statsLive, preparerRadio, radioHTML, conseils, majAdjoint, enjeu, montrer, majEnjeu, Son, evHTML, avantMatchHTML, analyseHTML, prevoirLive, apresMatchHTML, demarrerDirect, boucle, tic, majTableau, pauseAuto, rendreCtrl, reprendre, ouvrirTempsMort, rendreTempsMort, reprendreApresTM, finDuMatch});
})();
