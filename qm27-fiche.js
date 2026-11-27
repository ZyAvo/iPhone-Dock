// mon-ecran-version: f53c5a7b
/* QM27 (v161, v164) — la fiche joueur en page entière : onglets, tuiles, attributs, moral, carrière, flèches et glisser.
   Chargé après qm27-ui.js, dont il reçoit la boîte à outils (window.QMU) ; ses fonctions sont publiées dans window.QMF (v164 : découpage de qm27-ui.js). */
(() => {
'use strict';
const QU = window.QMU; if (!QU) return;
const {ACT, B, C, COULEUR_POSTE, COURT_ATTR, D, HH, STAT_P, V, avatarDe, axesRadar, badgeDe, badgeHTML, blason, blocContrat, blocJeune, carriereHTML, classeAttr, classeNote, club, connu, esc, eur, feuille, flag, flagSeul, fmtDate, imgBadge, lab, matchsInter, nat, nomEq, nomJ, noteVue, rangBadge, rapportRecruteur, retirerFeuille, roleDe, roleNom, valVue} = QU;

let FJ = null;
const roleCompo = j => { const c = j.club && club(j.club); return c && c.compo && c.compo.roles ? c.compo.roles[j.id] || null : null; };
/* ---------- v161 : la fiche joueur en page entière (mobile et PC), cinq onglets, flèches pour passer d'un joueur à l'autre ---------- */
const ONGLETS_FJ = [['gen', 'Général'], ['att', 'Attributs et entraînement', 'Attributs'], ['mor', 'Moral'], ['con', 'Contrat'], ['car', 'Carrière']];
const estDesk = () => document.documentElement.classList.contains('desk');
/* moral : cinq visages, du rouge au vert (dessinés en attendant les images) */
const MORAUX = [[20, 'furieux', '#d64545'], [40, 'mécontent', '#e8833a'], [60, 'neutre', '#d9b31f'], [80, 'content', '#7cb342'], [101, 'ravi', '#2e9e5b']];
const niveauMoral = m => MORAUX.findIndex(x => m < x[0]);
function visageMoral(m, t = 28){ const k = niveauMoral(m); return `<img class="visage" src="images/qm27/moral/${k}.webp" width="${t}" height="${t}" alt="Moral : ${MORAUX[k][1]}" title="Moral : ${MORAUX[k][1]} (${Math.round(m)})">`; }   // v161 : visages illustrés
/* potentiel : une étoile à cinq branches, chaque branche pleine ou vide */
function etoilePot(n, t = 30){ const R = 15, r = 6.2, c = 16, pt = (a, d) => [c + d * Math.sin(a), c - d * Math.cos(a)].map(x => x.toFixed(2)).join(',');
  const br = [0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5, g = a - Math.PI / 5, d = a + Math.PI / 5; return `<polygon points="${pt(g, r)} ${pt(a, R)} ${pt(d, r)} ${c},${c}" class="${i < n ? 'pl' : 'vd'}"/>`; }).join('');
  return `<svg class="etp" viewBox="0 0 32 32" width="${t}" height="${t}" role="img" aria-label="Potentiel ${n} sur 5">${br}</svg>`; }
function statutJ(j){
  if (j.bless) return ['bless', 'Blessé', `${j.bless.jours} j`];
  if (j.susp) return ['susp', 'Suspendu', `${j.susp.n} m.`];
  if (j.inter) return ['inter', 'En sélection', (D.NATIONS[j.inter] || {court:j.inter}).court || j.inter];
  if (j.pret && j.club === QU.M.manager.club) return ['pret', 'Prêté ici', ''];
  if (!j.club) return ['libre', 'Agent libre', ''];
  return ['actif', 'Actif', ''];
}
/* meilleur badge d'un joueur (rôles de son poste) : [badge, rôle] */
function meilleurBadge(j){ let best = null; for (const [r] of (D.ROLES[j.poste] || [])){ const b = badgeDe(j, j.poste, r); if (b && (!best || rangBadge(b) > rangBadge(best[0]))) best = [b, r]; } return best; }
const badgeRoleHTML = (j, x) => x ? `${imgBadge(x[0], x[1], 18, `Badge ${x[0][1].toLowerCase()}${x[0][3] ? ' estimé' : ''} : ${roleNom(j.poste, x[1])}`)} <span class="mut">${x[0][1]}${x[0][3] ? ' ?' : ''} · ${esc(roleNom(j.poste, x[1]).toLowerCase())}</span>` : '';
const tuile = (lib, val, cls) => `<div class="fjt${cls ? ' ' + cls : ''}"><span>${lib}</span><b>${val}</b></div>`;
/* attributs : une ligne (valeur, part dans la note au poste lu, progression depuis le dernier rapport mensuel) */
function ligneAttrFJ(j, k, nom, v, c, part, mx, ancien){
  const x = valVue(j, v, k), d = ancien != null && x.exact ? Math.round(v) - Math.round(ancien) : 0, td = d ? ` title="${d > 0 ? '+' : ''}${d} depuis le début de la saison"` : '';
  return `<div class="at${c ? ' c' : ''}${c === 2 ? ' r' : ''}${x.exact ? '' : ' flou'}" title="${esc(nom)}${c === 2 ? ' · attribut du rôle' : c ? ' · compte dans la note au poste' : ''}${part ? ` (${Math.round(part * 100)} % de la note)` : ''}"><span>${esc(COURT_ATTR[k] || nom)}</span>${part ? `<i class="pt" style="width:${Math.round(part / mx * 100)}%"></i>` : '<i class="pt vide"></i>'}<em class="tdc ${d > 0 ? 'up' : d < 0 ? 'down' : ''}"${td}>${d > 0 ? '▲' : d < 0 ? '▼' : ''}</em><b class="${classeAttr(x.mid)}">${x.txt}</b></div>`; }
function tableAttrsFJ(j, P_, ra){
  const PN = QM.partNote ? QM.partNote(P_) : {}, mx = Math.max(...Object.values(PN), 0.01), saison = j.aSs === QU.M.saison, A0 = saison ? j.aS : null;   // v173 : flèches depuis le début de la saison
  const cib = k => { const pt = PN[k] || 0, c = pt >= 0.05; return ra.includes(k) ? 2 : c ? 1 : 0; };
  const fam = f => `<div class="fa"><h4>${f}</h4>${D.ATTRS.map((a, i) => a[2] !== f ? '' : ligneAttrFJ(j, a[0], a[1], j.a[i], cib(a[0]), PN[a[0]] || 0, mx, A0 ? A0[i] : null)).join('')}</div>`;
  const gard = j.poste === 'G' || P_ === 'G' ? `<div class="fa fa-g"><h4>Gardien</h4><div class="fa-gl">${D.GARDIEN.map((g, i) => ligneAttrFJ(j, g[0], g[1], j.g[i], ra.includes('g:' + g[0]) ? 2 : (PN['g:' + g[0]] || 0) >= 0.05 ? 1 : 0, PN['g:' + g[0]] || 0, mx, saison && j.gS ? j.gS[i] : null)).join('')}</div></div>` : '';
  return `<div class="fj-at"><div class="fj-at-col">${fam('Physique')}${fam('Balle')}</div><div class="fj-at-col">${fam('Vol')}${fam('Mental')}</div>${gard}</div>`;
}
function lecturePosteRole(j){
  const P_ = FJ.p, ROLES_P = D.ROLES[P_] || [], role = ROLES_P.some(x => x[0] === FJ.role) ? FJ.role : null, kc = connu(j);
  const T_ = window.QMT, ad = T_ ? T_.adequation(j, P_, role || (ROLES_P[0] || [])[0]) : null, autre = P_ !== j.poste || role !== roleCompo(j);
  return `<div class="npostes" role="group" aria-label="Lire la fiche pour un poste">${['P', 'B', 'A', 'G'].map(p => { const x = noteVue(j, p); return `<button class="${p === P_ ? 'on' : ''}${p === j.poste ? ' nat' : ''}" data-act="fjPoste" data-p="${p}" aria-pressed="${p === P_}"><b class="${classeNote(x.mid)}" style="color:inherit">${x.txt}</b><span>${D.POSTES[p].nom}</span></button>`; }).join('')}</div>
    <div class="fj-roles"><div class="chips petites">${ROLES_P.map(([k, nom]) => { const e = ad && ad.roles ? ad.roles[k] : null; return `<button class="chip ${k === role ? 'on' : ''}" data-act="fjRole" data-r="${k}" aria-pressed="${k === role}" title="${esc((ROLES_P.find(x => x[0] === k) || [])[2] || '')}">${badgeHTML(j, P_, k, true)}${esc(nom)}${e != null && kc >= 100 ? ` <span class="mut">${e > 0 ? '+' : ''}${String(Math.round(e * 10) / 10).replace('.', ',')}</span>` : ''}</button>`; }).join('')}</div>
    ${autre ? '<p class="petit mut" style="margin:4px 0 0">Lecture seulement : la composition se change dans Tactique.</p>' : ''}</div>`;
}
function saisonFJ(j){
  const s = j.saison || {}, [ix, nomS] = STAT_P[j.poste], val = {3:s.b, 4:s.cog, 5:s.v, 6:s.arr}[ix] || 0, nS = j.nS && j.nS.s === QU.M.saison ? j.nS : null;
  const mt = (s.m || 0) + (s.em || 0);   // v167 : championnat et Ligue des Anneaux
  return `<div class="fj-saison2"><div><b>${mt}</b><span>matchs${s.em ? ` (dont ${s.em} en Ligue des Anneaux)` : s.m ? ` (${s.tit || 0} tit., ${(s.m || 0) - (s.tit || 0)} entrées)` : ''}</span></div><div><b>${s.mn || 0}</b><span>minutes</span></div>
    <div><b>${val}</b><span>${nomS}</span></div><div><b>${s.m ? (s.notes / s.m).toFixed(1).replace('.', ',') : '—'}</b><span>note moyenne</span></div>
    <div><b>${s.ja || 0} / ${s.ro || 0}</b><span>cartons J / R</span></div><div><b>${s.mvp || 0}</b><span>joueur du match</span></div></div>
    ${j.sel ? `<p class="petit" style="margin:6px 0 0">${flag(j.nat)} <b>${j.sel} sélection${j.sel > 1 ? 's' : ''}</b>${j.selB ? `, ${j.selB} but${j.selB > 1 ? 's' : ''}` : ''}${nS ? ` · cette saison : ${nS.m} match${nS.m > 1 ? 's' : ''}${nS.b ? `, ${nS.b} but${nS.b > 1 ? 's' : ''}` : ''}` : ''}</p>` : ''}`;
}
function ongletGeneral(j, desk){
  const mon = j.club === QU.M.manager.club, bp = QM.meilleurPoste(j), nv = noteVue(j, bp), est = C.potentielEstime(QU.M, j), st = statutJ(j), v = C.valeur(QU.M, j), cl = j.contrat || {};
  const tiles = `<div class="fjt-l">${tuile('Note', `${nv.txt}<small> ${D.POSTES[bp].court || bp}</small>`, classeNote(nv.mid))}${tuile('Potentiel', etoilePot(est))}${tuile('Statut', `${st[1]}${st[2] ? `<small> ${esc(st[2])}</small>` : ''}`, 'st-' + st[0])}${tuile('Moral', visageMoral(j.moral))}</div>
    <div class="fjt-l t3">${tuile('Salaire', j.club ? eur(cl.sal || 0) + '<small> /sem.</small>' : '—')}${tuile('Valeur', eur(v))}${tuile('Expire', j.club && cl.fin != null ? 'été ' + (cl.fin + 1) : '—')}</div>`;
  const rapport = `<blockquote class="rapport">« ${esc(rapportRecruteur(j))} »<span>${mon || true ? 'Rapport de ton recruteur' : ''}</span></blockquote>
    ${QM.manies(j).length ? `<div class="manies">${QM.manies(j).map(k => { const m = D.MANIES.find(x => x[0] === k); return m ? `<span class="manie"><b>${esc(m[1])}</b>${esc(m[3])}</span>` : ''; }).join('')}</div>` : ''}`;
  const roles = `<div class="carte"><h2>Rôles et badges</h2>${lecturePosteRole(j)}</div>`;
  const saison = `<div class="carte"><h2>Saison ${lab(QU.M.saison)}</h2>${saisonFJ(j)}</div>`;
  const r = mon ? roleDe(j.id) : {}, place = mon ? `<p class="petit mut" style="margin:8px 0 0">${r.tit ? `Titulaire (${D.POSTES[r.p].nom.toLowerCase()}).` : r.banc ? 'Remplaçant.' : 'Hors du groupe de 12.'}</p>` : '';
  const potion = mon && B.a(club(QU.M.manager.club), 'apothicaire') ? `<button class="btn sec plein" style="margin-top:8px" data-act="potion" data-j="${j.id}">Potion de forme de l'apothicaire (+2 forme)</button>` : '';
  if (!desk) return `${tiles}${saison}${roles}${rapport}${place}${potion}`;
  /* PC : une page en paysage, façon Football Manager */
  const kc = connu(j), etat = `<div class="fj-etat">
      <div><span>Forme</span><b>${j.forme}<small>/10</small></b><div class="barre"><i style="width:${j.forme * 10}%"></i></div></div>
      <div><span>Fatigue</span><b>${j.fat}<small> %</small></b><div class="barre fat"><i style="width:${j.fat}%"></i></div></div>
      <div><span>Charge</span><b>${Math.round(j.charge || 0)}<small>/100</small></b><div class="barre fat"><i style="width:${Math.round(j.charge || 0)}%"></i></div></div></div>`;
  const P_ = FJ.p, role = (D.ROLES[P_] || []).some(x => x[0] === FJ.role) ? FJ.role : null, T_ = window.QMT, ra = T_ && T_.ROLE_ATTR[P_] && role ? T_.ROLE_ATTR[P_][role] : [];
  return `<div class="fj-pc"><div class="fj-pc-g">${tiles}${etat}${contratResume(j)}${place}${potion}</div>
    <div class="fj-pc-m"><div class="carte fj-attrs"><h2>Attributs${P_ === j.poste ? '' : ' <span class="mut petit">lus en ' + esc(D.POSTES[P_].nom.toLowerCase()) + '</span>'}</h2><p class="fj-leg">Surlignés : ce qui fait la note au poste (barre : sa part)${role ? ' · en doré : le rôle ' + esc(roleNom(P_, role).toLowerCase()) : ''}.</p>${tableAttrsFJ(j, P_, ra)}${kc < 100 ? `<p class="petit mut" style="margin:6px 0 0">Connu à ${Math.round(kc)} % : attributs en fourchette.</p>` : ''}</div></div>
    <div class="fj-pc-d">${roles}<div class="carte fj-radar">${V.radar(axesRadar(j).map(([l, x]) => [l, kc >= 100 ? x : valVue(j, Math.round(x), 'ax' + l).mid]), COULEUR_POSTE[j.poste])}</div>${saison}${rapport}</div></div>`;
}
function contratResume(j){
  const cl = j.contrat || {}, inf = [cl.clause ? `Clause libératoire ${eur(cl.clause)}` : '', cl.primeVif ? `Prime par vif ${eur(cl.primeVif)}` : '', j.revente ? `${j.revente.pct} % à la revente` : ''].filter(Boolean);
  return j.club ? `<div class="carte"><h2>Contrat</h2><p class="petit" style="margin:0">${esc(club(j.club).nom)}${j.pret ? ' (prêt)' : ''} · jusqu'à l'été ${cl.fin + 1}${inf.length ? '<br>' + inf.join(' · ') : ''}</p></div>` : '';
}
function ongletAttributs(j){
  const P_ = FJ.p, role = (D.ROLES[P_] || []).some(x => x[0] === FJ.role) ? FJ.role : null, T_ = window.QMT, ra = T_ && T_.ROLE_ATTR[P_] && role ? T_.ROLE_ATTR[P_][role] : [], kc = connu(j), mon = j.club === QU.M.manager.club;
  const X = window.QMX, G_ = window.QMG, F = G_ && G_.focusDe ? G_.focusDe(j) : [], cb = mon && X ? X.courbes()[j.id] : null, pr = mon ? (club(QU.M.manager.club).progres || {})[j.id] : null, est = C.potentielEstime(QU.M, j);
  const ent = mon ? `<div class="carte"><h2>Entraînement</h2>
      <p class="petit" style="margin:0 0 6px">${F.length ? 'Focus : ' + F.map(x => `<span class="badge${x.t === 'poste' ? ' tit' : ''}">${esc(X ? X.NOMS_FOCUS({...x, p:j.poste}) : x.k)}</span>`).join(' ') : '<span class="mut">Aucun focus : il progresse au rythme du groupe.</span>'}</p>
      ${j.reconv ? `<p class="petit" style="margin:0 0 6px">Apprend le poste de <b>${D.POSTES[j.reconv.p].nom.toLowerCase()}</b> : ${j.reconv.sem} / ${G_ ? G_.SEM_POSTE : 36} semaines.</p>` : ''}
      <p class="petit" style="margin:0 0 6px">Potentiel estimé ${etoilePot(est, 18)} ${est} sur 5${pr ? ` · ce mois-ci ${pr > 0 ? '+' : ''}${(pr * 5).toFixed(1).replace('.', ',')} point${Math.abs(pr * 5) >= 2 ? 's' : ''} de note` : ''}</p>
      ${cb && cb.length > 1 && X ? `<div class="fj-courbe">${X.courbe(cb)}<span class="petit mut">note au poste depuis le début de la saison</span></div>` : ''}
      <button class="btn sec plein" style="margin-top:8px" data-act="focusJ" data-j="${j.id}">Choisir ses focus</button></div>` : '';
  return `${lecturePosteRole(j)}
    <div class="carte fj-attrs"><h2>Attributs</h2><p class="fj-leg">Surlignés : ce qui fait la note au poste (barre : sa part)${role ? ' · en doré : le rôle ' + esc(roleNom(P_, role).toLowerCase()) : ''}${j.aSs === QU.M.saison ? ' · <span class="tdc up">▲</span><span class="tdc down">▼</span> gagné ou perdu depuis le début de la saison' : ''}.</p>${tableAttrsFJ(j, P_, ra)}
      ${kc < 100 ? `<p class="petit mut" style="margin:6px 0 0">Attributs en fourchette : ${Math.round(kc)} % connu. Suis le joueur ou affronte son équipe pour en savoir plus.</p>` : ''}</div>
    <div class="carte fj-radar">${V.radar(axesRadar(j).map(([l, x]) => [l, kc >= 100 ? x : valVue(j, Math.round(x), 'ax' + l).mid]), COULEUR_POSTE[j.poste])}</div>${ent}`;
}
function sparkMoral(L){ if (!L || L.length < 2) return ''; const w = 260, h = 60, n = L.length, x = i => 4 + i * (w - 8) / (n - 1), y = v => h - 4 - v / 100 * (h - 8);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true">${[20, 40, 60, 80].map(v => `<line x1="0" x2="${w}" y1="${y(v)}" y2="${y(v)}" class="g"/>`).join('')}<polyline points="${L.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>${L.map((v, i) => i === n - 1 ? `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--accent)"/>` : '').join('')}</svg>`; }
const traitCache = (k, v) => ({pro:['Peu sérieux', 'Professionnel', 'Modèle de rigueur'], amb:['Sans ambition', 'Ambitieux', 'Dévoré d\'ambition'], reg:['Irrégulier', 'Assez régulier', 'Métronome'], gm:['Tétanisé par l\'enjeu', 'Solide dans les grands matchs', 'Se sublime dans les grands matchs'], ada:['Craint la météo', 'S\'adapte', 'Joue par tous les temps'], loy:['Mercenaire', 'Loyal', 'Fidèle au club']}[k] || ['', '', ''])[v < 8 ? 0 : v < 14 ? 1 : 2];
function ongletMoral(j){
  const mon = j.club === QU.M.manager.club, c = j.club ? club(j.club) : null, H_ = HH(), k = niveauMoral(j.moral), L = [];
  if (mon && H_){ const s = j.saison || {};
    if (H_.mecontents(QU.M, c).some(x => x.id === j.id)) L.push(['m', `Veut jouer davantage : ${(s.m || 0) + (s.em || 0)} matchs joués pour environ ${Math.round(s.mAttendu || 0)} attendus.`]);
    else if ((s.mAttendu || 0) > 0) L.push(['b', `Temps de jeu conforme à ce qu'il attend (${(s.m || 0) + (s.em || 0)} matchs).`]);
    if (H_.leaders(QU.M, c).some(x => x.id === j.id)) L.push(['b', 'Un des leaders du vestiaire : son moral pèse sur les autres.']);
    const cl = H_.clans(QU.M, c).find(x => x.joueurs.some(y => y.id === j.id)); if (cl) L.push([cl.moral >= 60 ? 'b' : cl.moral < 40 ? 'm' : '', `Fait partie du clan « ${esc(cl.nom)} » (${cl.joueurs.length} joueurs, moral moyen ${cl.moral}).`]);
    if (H_.mentore && H_.mentore(c, j)) L.push(['b', 'Suit un mentor : il prend peu à peu son état d\'esprit.']);
    if ((c.mentors || []).some(p => p.mentor === j.id)) L.push(['b', 'Mentor d\'un jeune joueur.']);
    if (c.compo && c.compo.cap === j.id) L.push(['b', 'Capitaine de l\'équipe.']);
    L.push([H_.ambiance(QU.M, c) >= 65 ? 'b' : H_.ambiance(QU.M, c) < 45 ? 'm' : '', `Ambiance du vestiaire : ${H_.ambiance(QU.M, c)} / 100.`]); }
  if (j.contrat && j.contrat.fin <= QU.M.saison && j.club) L.push(['m', 'Son contrat se termine cet été.']);
  if (j.bless) L.push(['m', 'Blessé : il ronge son frein.']);
  if (j.forme >= 8) L.push(['b', 'En grande forme.']); else if (j.forme <= 4) L.push(['m', 'En petite forme.']);
  const vu = mon || connu(j) >= 80, perso = vu ? ['pro', 'amb', 'reg', 'gm', 'ada', 'loy'].filter(x => j.cache[x] != null).map(x => `<div class="el"><div class="t"><b>${esc(traitCache(x, j.cache[x]))}</b><span>${esc((D.CACHES.find(y => y[0] === x) || [, x])[1])}</span></div></div>`).join('') : '';
  return `<div class="carte fj-moral"><div class="fj-moral-h">${visageMoral(j.moral, 54)}<div><b>${Math.round(j.moral)} / 100</b><span>${MORAUX[k][1]}</span></div></div>
      ${mon && j.mh && j.mh.length > 1 ? `${sparkMoral(j.mh)}<p class="petit mut" style="margin:2px 0 0">Les ${j.mh.length} dernières semaines.</p>` : mon ? '<p class="petit mut" style="margin:6px 0 0">La courbe se remplit semaine après semaine (16 semaines gardées).</p>' : ''}</div>
    <div class="carte"><h2>Ce qui le fait bouger</h2>${L.length ? `<ul class="fj-facteurs">${L.map(([t, x]) => `<li class="${t}">${x}</li>`).join('')}</ul>` : '<p class="petit mut" style="margin:0">Rien de particulier à signaler.</p>'}
      <p class="petit mut" style="margin:6px 0 0">Les victoires et les bonnes notes le font monter ; le banc, les défaites et un leader malheureux le font baisser.</p></div>
    <div class="carte"><h2>Personnalité <span class="mut petit">selon ton staff</span></h2>${perso ? `<div class="liste compacte">${perso}</div>` : '<p class="petit mut" style="margin:0">Ton recruteur ne le connaît pas assez (80 % nécessaires).</p>'}</div>`;
}
function ongletCarriere(j){
  const L = matchsInter(j.id);
  return `${carriereHTML(j).replace('<details class="carte fj-carriere">', '<details class="carte fj-carriere" open>')}
    <div class="carte"><h2>Sélection ${flag(j.nat)}</h2><p class="petit" style="margin:0 0 6px">${j.sel ? `<b>${j.sel} sélection${j.sel > 1 ? 's' : ''}</b>${j.selB ? `, ${j.selB} but${j.selB > 1 ? 's' : ''}` : ''}${j.selV ? `, ${j.selV} vif${j.selV > 1 ? 's' : ''} d'or` : ''}` : 'Jamais sélectionné.'}</p>
      ${L.length ? `<h4 class="sous-t">Matchs de la saison</h4><div class="liste">${L.map(([k, m]) => { const x = m.res.f.c.flat().find(y => y[0] === j.id); return `<button class="el" data-act="feuilleInter" data-k="${k}" data-m="${m.id}">${blason(m.dom, 'p', true)}<div class="t"><b>${esc(nomEq(m.dom, true))} ${m.res.score.join('–')} ${esc(nomEq(m.ext, true))}</b><span>${fmtDate(QU.M.calendrier[k].date)}${x && x[3] ? ` · ${x[3]} but${x[3] > 1 ? 's' : ''}` : ''}</span></div>${x && x[2] ? `<span class="note ${classeNote(x[2] * 10)}">${String(x[2]).replace('.', ',')}</span>` : ''}</button>`; }).join('')}</div>` : ''}</div>`;
}
/* liste suivie par les flèches : les fiches ouvertes depuis la même liste (ordre et filtres de l'écran) */
function listeDepuis(el){
  for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement){ const L = [...n.querySelectorAll('[data-act="joueur"][data-j]')].map(x => x.dataset.j); const U_ = [...new Set(L)]; if (U_.length > 1) return U_; }
  return null;
}
function ficheJoueur(id, garder){
  const j = QU.M.joueurs[id]; if (!j) return;
  if (!FJ || FJ.id !== id) FJ = {id, p:j.poste, role:roleCompo(j), onglet:FJ ? FJ.onglet : 'gen', liste:FJ ? FJ.liste : null};
  const desk = estDesk(), on = FJ.onglet || 'gen', mon = j.club === QU.M.manager.club, cl = j.club ? club(j.club) : null, L = FJ.liste || [], i = L.indexOf(id), mb = meilleurBadge(j);
  const corps = on === 'gen' ? ongletGeneral(j, desk) : on === 'att' ? ongletAttributs(j) : on === 'mor' ? ongletMoral(j) : on === 'con' ? (j.acad ? blocJeune(j) : blocContrat(j, mon)) : ongletCarriere(j);
  const nav = d => L.length > 1 ? `<button class="fj-nav" data-act="fjNav" data-d="${d}" aria-label="${d < 0 ? 'Joueur précédent' : 'Joueur suivant'}">${d < 0 ? '‹' : '›'}</button>` : '';
  const html = `<div class="fjp${desk ? ' desk' : ''}"><div class="fj-tete">${nav(-1)}<span class="avp g">${avatarDe(j, 'g')}${cl ? `<span class="blp">${V.blason(cl, 'p')}</span>` : ''}</span>
      <div class="fj-id"><h3>${esc(nomJ(j))}</h3><div class="sous">${flagSeul(j.nat)} ${esc(nat(j.nat).nom)}${j.sel ? ` · ${j.sel} sél.` : ''} · ${j.age} ans · ${D.POSTES[j.poste].nom}${cl ? ' · ' + (mon ? 'n° ' + j.num : esc(cl.nom)) : ' · agent libre'}</div>${mb ? `<div class="sous">${badgeRoleHTML(j, mb)}</div>` : ''}</div>
      ${L.length > 1 ? `<span class="fj-pos mut petit">${i + 1} / ${L.length}</span>` : ''}${nav(1)}${!mon && QU.M.manager.club ? `<button class="fj-suivre" data-act="suivre" data-j="${j.id}" title="${club(QU.M.manager.club).suivi.includes(j.id) ? 'Ne plus superviser' : 'Superviser'}">${club(QU.M.manager.club).suivi.includes(j.id) ? '★' : '☆'}</button>` : ''}<button class="fermer" data-act="fermer" aria-label="Fermer">✕</button></div>
    <div class="onglets fj-ong" role="tablist">${ONGLETS_FJ.map(([k, n, c]) => `<button role="tab" class="${on === k ? 'on' : ''}" data-act="fjOnglet" data-o="${k}" aria-selected="${on === k}">${c ? `<span class="long">${n}</span><span class="court">${c}</span>` : n}</button>`).join('')}</div>
    <div class="fj-corps">${corps}</div></div>`;
  const ouvert = document.querySelector('.fond.fj-page .feuille');
  feuille(html, garder || !!ouvert);
  const f = document.querySelector('.fond'); if (f) f.classList.add('fj-page');
  const t = document.querySelector('.fond.fj-page .fj-tete'); if (t) t.parentElement.style.setProperty('--fjh', t.offsetHeight + 'px');
}
function naviguerFJ(d){ if (!FJ || !FJ.liste) return; const L = FJ.liste, i = L.indexOf(FJ.id); if (i < 0) return; const id = L[(i + d + L.length) % L.length]; const o = FJ.onglet, l = FJ.liste; FJ = {id, p:QU.M.joueurs[id].poste, role:roleCompo(QU.M.joueurs[id]), onglet:o, liste:l}; ficheJoueur(id, true); const c = document.querySelector('.fond.fj-page .feuille'); if (c) c.scrollTop = 0; }
addEventListener('keydown', e => { if (!document.querySelector('.fond.fj-page') || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'ArrowLeft') naviguerFJ(-1); if (e.key === 'ArrowRight') naviguerFJ(1); });
let fjTouch = null;
document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('.fond.fj-page .fj-corps') && !e.target.closest('.npostes, .chips, .tab-carr, .onglets')) fjTouch = [e.touches[0].clientX, e.touches[0].clientY]; else fjTouch = null; }, {passive:true});
document.addEventListener('touchend', e => { if (!fjTouch) return; const dx = e.changedTouches[0].clientX - fjTouch[0], dy = e.changedTouches[0].clientY - fjTouch[1]; fjTouch = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) naviguerFJ(dx < 0 ? 1 : -1); }, {passive:true});

Object.assign(ACT, {
  joueur:(d, el) => { const dans = el && el.closest('.fond.fj-page'), L = dans ? (FJ && FJ.liste) : listeDepuis(el); const o = dans && FJ ? FJ.onglet : 'gen'; FJ = null; FJ = {id:d.j, p:(QU.M.joueurs[d.j] || {}).poste, role:QU.M.joueurs[d.j] ? roleCompo(QU.M.joueurs[d.j]) : null, onglet:o, liste:L && L.includes(d.j) ? L : null}; if (dans) retirerFeuille(); ficheJoueur(d.j); },
  fjNav:d => naviguerFJ(+d.d),
  fjOnglet:d => { if (!FJ) return; FJ.onglet = d.o; ficheJoueur(FJ.id, true); const c = document.querySelector('.fond.fj-page .feuille'); if (c) c.scrollTop = 0; },
  fjPoste:d => { if (!FJ) return; if (FJ.p !== d.p){ FJ.p = d.p; FJ.role = null; } ficheJoueur(FJ.id, true); },   // v101 : lire la fiche pour un autre poste
  fjRole:d => { if (!FJ) return; FJ.role = FJ.role === d.r ? null : d.r; ficheJoueur(FJ.id, true); },
  fjRaz:() => { if (!FJ) return; const j = QU.M.joueurs[FJ.id]; FJ = null; if (j) ficheJoueur(j.id, true); },
});

Object.assign(window.QMF = window.QMF || {}, {roleCompo, ONGLETS_FJ, estDesk, MORAUX, niveauMoral, visageMoral, etoilePot, statutJ, meilleurBadge, badgeRoleHTML, tuile, ligneAttrFJ, tableAttrsFJ, lecturePosteRole, saisonFJ, ongletGeneral, contratResume, ongletAttributs, sparkMoral, traitCache, ongletMoral, ongletCarriere, listeDepuis, ficheJoueur, naviguerFJ});
})();
