// mon-ecran-version: 1d607614
/* Ambreval (v80) — moteur du jeu, sans aucun affichage : carte, ressources, bâtiments, paliers, recherche, sorts, royaumes marchands, quêtes.
   Tout passe par Jeu.avancer(S, secondes) : la même fonction sert en jeu, pour le rattrapage hors ligne et pour le joueur simulé des essais (outils/dev/ambreval-essai.mjs). */
(root => {
'use strict';
const W = 30, CX = 14, CY = 14, id = (x, y) => y * W + x;
const ECH = [1, 3, 10, 35, 120];         // échelle des montants selon le palier
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = L => L[Math.floor(Math.random() * L.length)];

/* ---------- Ressources ---------- v = valeur de référence en or ; cf = part du plafond de stock */
const RS = {
  vivres:{n:'Vivres', v:1, cf:1, c:'#e8bf52'}, bois:{n:'Bois', v:1, cf:1, c:'#b98148'}, pierre:{n:'Pierre', v:1.4, cf:1, c:'#b8bcc4'},
  or:{n:'Or', v:1, cf:12, c:'#f6c945'}, planches:{n:'Planches', v:4, cf:1, c:'#d9a566'}, hydromel:{n:'Hydromel', v:5, cf:.5, c:'#e49a3a'},
  savoir:{n:'Savoir', v:6, cf:2, c:'#8fc4ee'}, fer:{n:'Fer', v:8, cf:.6, c:'#94a3b8'}, outils:{n:'Outils', v:24, cf:.35, c:'#e0805a'},
  mana:{n:'Mana', v:14, cf:.3, c:'#a886f0'}, cristal:{n:'Cristal', v:60, cf:.15, c:'#5fd6d0'}
};
const ORDRE = Object.keys(RS);

/* ---------- Paliers ---------- */
const PAL = [
  {n:'Hameau', pop:0, c:{}},
  {n:'Bourg', pop:14, c:{bois:120, pierre:80, or:60}},
  {n:'Ville', pop:55, c:{planches:520, pierre:900, or:1800, hydromel:120}},
  {n:'Cité', pop:200, c:{outils:600, planches:7000, pierre:12000, or:40000, mana:500}},
  {n:'Capitale arcanique', pop:520, c:{cristal:1400, outils:9000, planches:38000, or:500000, mana:7000}}
];
const STOCK = [260, 800, 3000, 11000, 40000];

/* ---------- Bâtiments ----------
   t palier · c coût · p produit par seconde · x consomme · j emplois · l logements · m stock · joie bonheur · s taille · sec temps de chantier
   pres : terrain voisin indispensable {t:'fr…', r:rayon} */
const BAT = {
  salle:{n:'Grande Salle', t:1, c:{}, l:4, sec:30, s:2, cat:0, desc:'Le cœur du village. La faire grandir ouvre un nouveau palier.', unique:1, h:80},
  chaumiere:{n:'Chaumière', t:1, c:{bois:18}, l:4, sec:3, cat:1, desc:'Loge 4 villageois par niveau. Un jardin ou une fontaine à côté ajoute des places.', h:42},
  ferme:{n:'Ferme', t:1, c:{bois:15}, p:{vivres:.9}, j:2, sec:3, cat:2, desc:'Produit des vivres. Plus productive près d\'un moulin et d\'autres fermes.', h:34},
  bucheron:{n:'Bûcheron', t:1, c:{bois:10, vivres:8}, p:{bois:.62}, j:2, sec:3, cat:2, pres:{t:'f', r:2}, desc:'Produit du bois. Chaque forêt à 2 cases ou moins augmente son rendement.', h:40},
  carriere:{n:'Carrière', t:1, c:{bois:24}, p:{pierre:.42}, j:2, sec:4, cat:2, pres:{t:'rm', r:2}, desc:'Extrait la pierre. À placer près des roches ou de la montagne.', h:30},
  entrepot:{n:'Entrepôt', t:1, c:{bois:40, pierre:20}, m:.45, sec:6, cat:3, desc:'Augmente le stock maximal de toutes les ressources.', h:44},
  fontaine:{n:'Fontaine', t:1, c:{pierre:30}, joie:3, sec:5, cat:4, desc:'Rend le quartier agréable : +3 bonheur et une place de plus dans les chaumières voisines.', h:30},
  peche:{n:'Pêcherie', t:2, c:{bois:45}, p:{vivres:1.5}, j:2, sec:5, cat:2, pres:{t:'e', r:1}, desc:'Beaucoup de vivres, au bord de l\'eau uniquement.', h:32},
  scierie:{n:'Scierie', t:2, c:{bois:65, pierre:30}, x:{bois:.8}, p:{planches:.42}, j:2, sec:8, cat:3, desc:'Transforme le bois en planches.', h:44},
  marche:{n:'Marché', t:2, c:{bois:80, pierre:40, or:50}, p:{or:.35}, j:1, car:1, sec:10, cat:3, desc:'Ouvre le commerce et ajoute une caravane.', h:36},
  brasserie:{n:'Brasserie', t:2, c:{planches:30, bois:40}, x:{vivres:.6}, p:{hydromel:.26}, j:2, sec:10, cat:3, desc:'Brasse l\'hydromel à partir des vivres.', h:42},
  taverne:{n:'Taverne', t:2, c:{planches:30, or:60}, x:{hydromel:.12}, joie:7, j:1, sec:10, cat:4, tav:1, desc:'+7 bonheur si elle a de l\'hydromel, +2 sinon.', h:46},
  biblio:{n:'Bibliothèque', t:2, c:{planches:40, pierre:60}, p:{savoir:.28}, j:2, sec:12, cat:5, desc:'Produit le savoir qui finance la recherche.', h:50},
  mine:{n:'Mine de fer', t:3, c:{planches:90, pierre:120}, p:{fer:.27}, j:3, sec:14, cat:2, pres:{t:'m', r:1}, desc:'Extrait le fer, au pied de la montagne.', h:36},
  forge:{n:'Forge', t:3, c:{planches:90, pierre:90, fer:30}, x:{fer:.2, planches:.2}, p:{outils:.11}, j:3, sec:18, cat:3, desc:'Forge des outils à partir de fer et de planches.', h:46},
  moulin:{n:'Moulin', t:3, c:{planches:55, pierre:40}, j:1, sec:12, cat:3, desc:'Chaque moulin donne +15 % aux fermes à 3 cases ou moins.', h:62},
  tour:{n:'Tour de mage', t:3, c:{pierre:160, planches:70, or:180}, p:{mana:.13}, j:2, sec:20, cat:5, desc:'Produit du mana, trois fois plus près d\'une source arcanique.', h:82},
  temple:{n:'Temple', t:3, c:{pierre:220, or:240}, joie:11, j:2, sec:20, cat:4, desc:'+11 bonheur.', h:60},
  jardin:{n:'Jardin féerique', t:3, c:{bois:90, or:70}, joie:5, sec:10, cat:4, desc:'+5 bonheur et une place de plus dans les chaumières voisines.', h:36},
  minear:{n:'Mine arcanique', t:4, c:{outils:50, pierre:360, mana:70}, x:{mana:.2, pierre:.5}, p:{cristal:.055}, j:4, sec:30, cat:5, pres:{t:'lm', r:2}, desc:'Cristallise le mana. Près d\'une source ou de la montagne.', h:48},
  academie:{n:'Académie', t:4, c:{planches:260, pierre:380, outils:40}, x:{hydromel:.1}, p:{savoir:1.3}, j:4, sec:40, s:2, cat:5, desc:'Beaucoup de savoir, contre un peu d\'hydromel.', h:84},
  guilde:{n:'Guilde marchande', t:4, c:{planches:260, outils:50, or:900}, p:{or:2.4}, j:3, car:1, sec:40, s:2, cat:3, desc:'De l\'or, une caravane de plus et de meilleurs prix.', h:70, vente:.04},
  bosquet:{n:'Bosquet sylvain', t:4, c:{mana:90, bois:380}, p:{bois:2.6}, j:1, joie:4, sec:30, cat:2, desc:'Un arbre ancien : beaucoup de bois, +4 bonheur. Les forêts voisines l\'aident.', h:86},
  griffon:{n:'Nid de griffons', t:4, c:{outils:50, pierre:260, vivres:400}, j:2, carT:.2, sec:30, cat:3, desc:'Les caravanes reviennent 20 % plus vite.', h:74},
  observatoire:{n:'Observatoire', t:5, c:{cristal:50, outils:110, pierre:900}, p:{savoir:3.2, mana:.45}, j:4, sec:60, s:2, cat:5, desc:'Savoir et mana à haut débit.', h:92},
  fleche:{n:'Flèche d\'Ambre', t:5, c:{}, sec:300, s:2, cat:6, unique:1, max:5, desc:'La merveille de la vallée, en 5 étapes. Chaque étape donne +4 % à toute la production.', h:150}
};
const FLECHE = [
  {pierre:600000, planches:350000}, {outils:130000, or:7500000}, {cristal:25000, mana:140000}, {planches:900000, fer:300000, hydromel:130000}, {cristal:45000, or:11000000, outils:225000}
];

/* ---------- Recherche ---------- e : [type, cible?, valeur] */
const RECH = {
  assolement:{b:'Terres', n:'Assolement', t:2, c:30, sec:40, e:[['prod', 'vivres', .15]], d:'+15 % de vivres.'},
  sylvi:{b:'Terres', n:'Sylviculture', t:2, c:45, sec:50, e:[['prod', 'bois', .2]], d:'+20 % de bois.'},
  irrigation:{b:'Terres', n:'Irrigation', t:3, c:260, sec:120, dep:['assolement'], e:[['prod', 'vivres', .25]], d:'+25 % de vivres.'},
  hydro:{b:'Terres', n:'Recettes monastiques', t:3, c:240, sec:120, e:[['prod', 'hydromel', .3]], d:'+30 % d\'hydromel.'},
  serres:{b:'Terres', n:'Serres enchantées', t:4, c:2600, sec:420, dep:['irrigation'], e:[['hiver']], d:'L\'hiver ne pénalise plus les vivres.'},
  taille:{b:'Ouvrages', n:'Taille de pierre', t:2, c:40, sec:45, e:[['prod', 'pierre', .2]], d:'+20 % de pierre.'},
  paves:{b:'Ouvrages', n:'Chemins pavés', t:2, c:70, sec:70, e:[['chemin', 0, .1]], d:'Bonus des chemins porté de 15 à 25 %.'},
  maconnerie:{b:'Ouvrages', n:'Maçonnerie', t:3, c:300, sec:150, dep:['taille'], e:[['cout', 0, .1]], d:'Bâtiments 10 % moins chers.'},
  echafaudages:{b:'Ouvrages', n:'Échafaudages', t:3, c:280, sec:140, e:[['temps', 0, .4]], d:'Chantiers 40 % plus rapides.'},
  scies:{b:'Ouvrages', n:'Scies à eau', t:3, c:320, sec:150, e:[['prod', 'planches', .3]], d:'+30 % de planches.'},
  filons:{b:'Ouvrages', n:'Prospection des filons', t:4, c:2800, sec:420, e:[['prod', 'fer', .35]], d:'+35 % de fer.'},
  acier:{b:'Ouvrages', n:'Acier nain', t:4, c:3400, sec:480, dep:['filons'], e:[['prod', 'outils', .35]], d:'+35 % d\'outils.'},
  compta:{b:'Négoce', n:'Comptabilité', t:2, c:50, sec:50, e:[['prod', 'or', .2]], d:'+20 % d\'or.'},
  carto:{b:'Négoce', n:'Cartographie', t:2, c:80, sec:80, e:[['rayon', 0, 2]], d:'Territoire agrandi de 2 cases.'},
  bateliers:{b:'Négoce', n:'Convois rapides', t:3, c:280, sec:140, e:[['carT', 0, .2]], d:'Caravanes 20 % plus rapides.'},
  lettres:{b:'Négoce', n:'Lettres de change', t:3, c:340, sec:160, dep:['compta'], e:[['vente', 0, .06], ['achat', 0, .06]], d:'+6 % sur tes ventes, -6 % sur tes achats.'},
  diplomatie:{b:'Négoce', n:'Diplomatie', t:3, c:300, sec:150, e:[['rep', 0, .6], ['car', 0, 1]], d:'Réputation plus rapide et une caravane de plus.'},
  routes:{b:'Négoce', n:'Routes commerciales', t:4, c:3000, sec:480, dep:['lettres'], e:[['routes']], d:'Vends tes surplus automatiquement.'},
  astres:{b:'Arcanes', n:'Lecture des astres', t:3, c:300, sec:150, e:[['prod', 'mana', .25]], d:'+25 % de mana.'},
  grimoire:{b:'Arcanes', n:'Grand grimoire', t:3, c:420, sec:200, dep:['astres'], e:[['sort', 'vent']], d:'Débloque Vent de hâte.'},
  alchimie:{b:'Arcanes', n:'Alchimie', t:4, c:3200, sec:480, dep:['grimoire'], e:[['sort', 'transmut'], ['prod', 'cristal', .2]], d:'Débloque Transmutation, +20 % de cristal.'},
  temporel:{b:'Arcanes', n:'Horlogerie arcanique', t:4, c:5200, sec:600, dep:['alchimie'], e:[['sort', 'distorsion']], d:'Débloque Distorsion du temps.'},
  griffons2:{b:'Arcanes', n:'Dressage des griffons', t:5, c:16000, sec:900, dep:['temporel'], e:[['sort', 'griffon']], d:'Débloque Appel des griffons.'},
  fetes:{b:'Cité', n:'Jours de fête', t:2, c:60, sec:60, e:[['joie', 0, 5]], d:'+5 bonheur.'},
  egouts:{b:'Cité', n:'Égouts', t:3, c:320, sec:160, e:[['loge', 0, .12]], d:'+12 % de logements.'},
  archives:{b:'Cité', n:'Archives et greniers', t:3, c:300, sec:150, e:[['stock', 0, .35]], d:'+35 % de stock maximal.'},
  sagesse:{b:'Cité', n:'Collège des sages', t:4, c:3200, sec:480, e:[['prod', 'savoir', .35]], d:'+35 % de savoir.'},
  veille:{b:'Cité', n:'Veilleurs de nuit', t:4, c:3600, sec:480, e:[['hl', 0, 8 * 3600]], d:'La production hors ligne dure 16 h au lieu de 8.'},
  songe:{b:'Cité', n:'Songes partagés', t:5, c:18000, sec:900, dep:['veille'], e:[['hl', 0, 8 * 3600]], d:'La production hors ligne dure 24 h.'}
};

/* ---------- Sorts ---------- */
const SORTS = {
  pluie:{n:'Pluie bénie', t:3, c:30, cd:180, d:'Vivres doublés pendant 90 s.', buff:{k:'vivres', m:2, r:90}},
  sylve:{n:'Réveil sylvestre', t:3, c:40, cd:240, d:'Fait pousser jusqu\'à 4 forêts autour de tes bûcherons.', fn:'sylve'},
  vent:{n:'Vent de hâte', t:3, c:60, cd:300, rech:'grimoire', d:'Toute la production +40 % pendant 60 s.', buff:{k:'tout', m:1.4, r:60}},
  transmut:{n:'Transmutation', t:4, c:30, cd:60, rech:'alchimie', d:'Change 200 pierres en 40 fer.', fn:'transmut'},
  distorsion:{n:'Distorsion du temps', t:4, c:220, cd:1800, rech:'temporel', d:'La vallée avance de 5 minutes d\'un coup.', fn:'distorsion'},
  griffon:{n:'Appel des griffons', t:5, c:160, cd:600, rech:'griffons2', d:'Toutes les caravanes rentrent à l\'instant.', fn:'griffon'}
};

/* ---------- Royaumes (simulés par le jeu) ---------- */
const ROY = {
  brume:{n:'Comté de Brumevive', peuple:'Humains', d:40, t:2, plus:['vivres', 'bois', 'hydromel'], moins:['pierre', 'fer', 'outils'], prix:1, vol:.6, hue:'#3fa37a',
    voix:'Notre intendant vous salue. Nos greniers réclament'},
  karrak:{n:'Monts de Karrak', peuple:'Nains', d:70, t:2, plus:['pierre', 'fer', 'outils'], moins:['vivres', 'hydromel', 'bois'], prix:1.05, vol:.6, hue:'#c8463f',
    voix:'Par la barbe des anciens ! Il nous faut'},
  aulne:{n:'Sylve d\'Aulne', peuple:'Elfes', d:90, t:3, plus:['bois', 'mana', 'savoir'], moins:['outils', 'pierre', 'planches'], prix:1.1, vol:.5, hue:'#8fc46a',
    voix:'Les feuilles ont parlé. Nous aurions besoin de'},
  gobeloche:{n:'Marais de Gobeloche', peuple:'Gobelins', d:55, t:3, plus:['planches', 'hydromel', 'fer'], moins:['mana', 'vivres', 'outils'], prix:.92, vol:2.2, hue:'#b0a23a',
    voix:'Psst ! Bon prix, pas de questions : on prend'},
  elyssar:{n:'Cité céleste d\'Elyssar', peuple:'Mages', d:130, t:4, plus:['savoir', 'mana', 'cristal'], moins:['hydromel', 'vivres', 'outils'], prix:1.15, vol:.5, hue:'#8a63d2',
    voix:'Le Conseil des Astres requiert'},
  sables:{n:'Caravansérail des Sables', peuple:'Nomades', d:160, t:4, plus:['fer', 'hydromel', 'cristal'], moins:['planches', 'outils', 'mana', 'bois'], prix:1.2, vol:1, hue:'#e0a14a',
    voix:'Que les étoiles guident ta route, ami. Nos tentes manquent de'}
};

/* ---------- Saisons ---------- */
const SAISONS = [
  {n:'Printemps', m:{vivres:1.1}, joie:2}, {n:'Été', m:{vivres:1.2}, joie:3},
  {n:'Automne', m:{bois:1.15, or:1.1}, joie:0}, {n:'Hiver', m:{vivres:.75, mana:1.25}, joie:-3}
];
const DUREE_SAISON = 300, DUREE_JOUR = 480;
const saisonDe = S => Math.floor(S.temps / DUREE_SAISON) % 4;

/* ---------- Carte ---------- */
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function bruit(rnd, n){
  const g = Array.from({length:(W >> n) + 3}, () => Array.from({length:(W >> n) + 3}, rnd)), m = 1 << n;
  return (x, y) => { const i = x >> n, j = y >> n, u = (x % m) / m, v = (y % m) / m, s = t => t * t * (3 - 2 * t), a = s(u), b = s(v);
    return (g[j][i] * (1 - a) + g[j][i + 1] * a) * (1 - b) + (g[j + 1][i] * (1 - a) + g[j + 1][i + 1] * a) * b; };
}
function carte(seed){
  const rnd = mulberry(seed), h1 = bruit(rnd, 3), h2 = bruit(rnd, 2), f1 = bruit(rnd, 3), f2 = bruit(rnd, 2), T = new Array(W * W).fill('.');
  const dist = (x, y) => Math.max(Math.abs(x - CX - .5), Math.abs(y - CY - .5));
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){
    const h = h1(x, y) * .65 + h2(x, y) * .35, f = f1(x, y) * .65 + f2(x, y) * .35, d = dist(x, y);
    if (d < 4) continue;
    if (h + d * .012 > .69) T[id(x, y)] = 'm';
    else if (h > .59 && rnd() < .55) T[id(x, y)] = 'r';
    else if (f > .54) T[id(x, y)] = 'f';
  }
  /* rivière : traverse la carte à quelques cases du centre */
  { const vertical = rnd() < .5; let p = (rnd() < .5 ? CX - 7 : CX + 8) + Math.floor(rnd() * 3 - 1);
    for (let q = 0; q < W; q++){ p = clamp(p + Math.floor(rnd() * 3) - 1, 7, W - 7);
      if (Math.abs(p - CX - .5) < 5) p += p < CX ? -1 : 1;
      for (const o of [0, 1]){ const [x, y] = vertical ? [p + o, q] : [q, p + o]; if (x >= 0 && y >= 0 && x < W && y < W) T[id(x, y)] = 'e'; } } }
  /* de quoi démarrer tout près de la Grande Salle : forêt, roche ; plus loin montagne et sources */
  const tache = (cx, cy, c, n, garde) => { for (let i = 0, a = cx, b = cy; i < n; i++){ const x = clamp(a, 0, W - 1), y = clamp(b, 0, W - 1);
    if (T[id(x, y)] !== 'e' && dist(x, y) >= garde) T[id(x, y)] = c; if (rnd() < .6) a = cx + Math.floor(rnd() * 5) - 2, b = cy + Math.floor(rnd() * 5) - 2; else a += Math.floor(rnd() * 3) - 1, b += Math.floor(rnd() * 3) - 1; } };
  const a0 = rnd() * 6.28, ang = (a, r) => [Math.round(CX + Math.cos(a) * r), Math.round(CY + Math.sin(a) * r)];
  tache(...ang(a0, 5), 'f', 16, 4); tache(...ang(a0 + 1.6, 5), 'f', 9, 4); tache(...ang(a0 + 3.3, 5), 'r', 12, 4);
  tache(...ang(a0 + 4.6, 9), 'm', 16, 8);
  for (const [a, r] of [[a0 + .8, 7], [a0 + 2.7, 9], [a0 + 5.3, 11]]){ const [x, y] = ang(a, r), i = id(clamp(x, 1, W - 2), clamp(y, 1, W - 2)); T[i] = 'l'; }
  return T.join('');
}

/* ---------- Partie ---------- */
function nouvelle(seed, herite){
  seed = seed || Math.floor(Math.random() * 1e9);
  const S = {v:1, seed, t:Date.now(), temps:60, map:carte(seed), r:Object.fromEntries(ORDRE.map(r => [r, 0])), pop:3, joie:55, palier:1,
    bats:[{i:1, k:'salle', x:CX, y:CY, n:1, con:0, tot:0}], next:2, chem:[], fait:{}, cour:null, buffs:[], cd:{}, tuto:0, quetes:[], nq:1,
    car:[], contrats:[], nc:1, routes:[], gaz:[], roiT:0, rois:null, msg:[], evT:90, cloche:0, faim:0, ambre:herite ? herite.ambre : 0, ren:herite ? herite.ren : 0,
    st:{bulles:0, car:0, amel:0, fees:0, rech:0, jours:0}, son:herite ? herite.son : false};
  Object.assign(S.r, {bois:70, vivres:40, pierre:25, or:25});
  S.rois = Object.fromEntries(Object.entries(ROY).map(([k, R]) => [k, royaumeInit(R)]));
  majQuetes(S);
  return S;
}
function royaumeInit(R){
  const T = {}, s = {}; for (const r of [...R.plus, ...R.moins]){ T[r] = 300 / Math.sqrt(RS[r].v); s[r] = T[r] * (R.plus.includes(r) ? 1.5 : .7); }
  return {T, s, rep:0, ev:null, pres:40 + Math.random() * 120};
}

/* ---------- Calcul des effets (refait seulement quand quelque chose change) ---------- */
const CA = new WeakMap();
const inv = S => CA.delete(S);
const voisins = (S, x, y, r, types, s = 1) => { let n = 0; for (let b = y - r; b <= y + s - 1 + r; b++) for (let a = x - r; a <= x + s - 1 + r; a++) if (a >= 0 && b >= 0 && a < W && b < W && types.includes(S.map[id(a, b)])) n++; return n; };
function adjB(S, k, x, y, occ){
  const compte = (qui, r) => { let n = 0; const vus = new Set(); for (let b = y - r; b <= y + r; b++) for (let a = x - r; a <= x + r; a++) if (a >= 0 && b >= 0 && a < W && b < W){ const o = occ[id(a, b)]; if (o && !(a === x && b === y) && qui.includes(o.k) && o.n > 0 && !vus.has(o)){ vus.add(o); n++; } } return n; };
  switch (k){
    case 'bucheron': return Math.min(2, .55 + .11 * voisins(S, x, y, 2, 'f'));
    case 'carriere': return Math.min(2, .65 + .12 * voisins(S, x, y, 2, 'rm'));
    case 'peche': return Math.min(1.6, .7 + .1 * voisins(S, x, y, 1, 'e'));
    case 'mine': return Math.min(1.6, .8 + .1 * voisins(S, x, y, 1, 'm'));
    case 'tour': return voisins(S, x, y, 2, 'l') ? 3 : 1;
    case 'minear': return voisins(S, x, y, 2, 'l') ? 1.4 : 1;
    case 'bosquet': return Math.min(1.8, 1 + .05 * voisins(S, x, y, 2, 'f'));
    case 'ferme': return 1 + Math.min(.45, .15 * compte(['moulin'], 3)) + Math.min(.12, .03 * compte(['ferme'], 1));
    default: return 1;
  }
}
const rayon = (S, D) => 5 + 2 * S.palier + (D ? D.rayon : 0);
function calc(S){
  const D = {pm:{}, rayon:0, cout:0, temps:0, chemin:.15, rep:1, car:1, carT:0, vente:0, achat:0, joie:0, loge:0, stock:0, hl:8 * 3600, sorts:{}, hiver:false, routes:false};
  for (const k of Object.keys(S.fait)) for (const [t, a, v] of RECH[k].e)
    if (t === 'prod') D.pm[a] = (D.pm[a] || 0) + v; else if (t === 'cout') D.cout += v; else if (t === 'temps') D.temps += v;
    else if (t === 'chemin') D.chemin += v; else if (t === 'rayon') D.rayon += v; else if (t === 'rep') D.rep += v; else if (t === 'car') D.car += v;
    else if (t === 'carT') D.carT += v; else if (t === 'vente') D.vente += v; else if (t === 'achat') D.achat += v; else if (t === 'joie') D.joie += v;
    else if (t === 'loge') D.loge += v; else if (t === 'stock') D.stock += v; else if (t === 'hl') D.hl += v; else if (t === 'sort') D.sorts[a] = 1;
    else if (t === 'hiver') D.hiver = true; else if (t === 'routes') D.routes = true;
  const occ = new Array(W * W).fill(null), ch = new Set(S.chem);
  for (const b of S.bats){ const s = BAT[b.k].s || 1; for (let v = 0; v < s; v++) for (let u = 0; u < s; u++) occ[id(b.x + u, b.y + v)] = b; }
  D.occ = occ; D.ch = ch;
  /* chemins reliés à la Grande Salle */
  const salle = S.bats[0], relies = new Set(), file = [], autour = (x, y, s) => { const L = []; for (let i = 0; i < s; i++) L.push([x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]); return L.filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < W); };
  for (const [a, b] of autour(salle.x, salle.y, 2)) if (ch.has(id(a, b)) && !relies.has(id(a, b))){ relies.add(id(a, b)); file.push([a, b]); }
  while (file.length){ const [a, b] = file.pop(); for (const [c, e] of autour(a, b, 1)) if (ch.has(id(c, e)) && !relies.has(id(c, e))){ relies.add(id(c, e)); file.push([c, e]); } }
  D.relies = relies;
  let jobs = 0, loge = 0, joie = 0, cases = 1, tav = false; D.prods = []; let stockB = 0; let venteB = 0, carTB = 0, carB = 0;
  const vers = new Map();
  for (const b of S.bats){
    if (b.n <= 0) continue;
    const def = BAT[b.k], s = def.s || 1, L = b.n;
    if (b.off) continue;
    if (def.m) stockB += def.m * L;
    if (def.car) carB += def.car;
    if (def.carT) carTB = Math.max(carTB, def.carT);
    if (def.vente) venteB += def.vente;
    if (def.joie && !def.tav) joie += def.joie * Math.sqrt(L);
    if (def.l){ let l = def.l * L;
      if (b.k === 'chaumiere'){ let e = 0; const vus = new Set(); for (let v = b.y - 2; v <= b.y + 2; v++) for (let u = b.x - 2; u <= b.x + 2; u++) if (u >= 0 && v >= 0 && u < W && v < W){ const o = occ[id(u, v)]; if (o && (o.k === 'fontaine' || o.k === 'jardin') && o.n > 0 && !vus.has(o)){ vus.add(o); e++; } } l += Math.min(3, e) * Math.ceil(L / 2); }
      loge += l; }
    const lev = L * Math.pow(1.08, L - 1), adj = adjB(S, b.k, b.x, b.y, occ), rel = autour(b.x, b.y, s).some(([a, c]) => relies.has(id(a, c)) ) || autour(b.x, b.y, s).some(([a, c]) => occ[id(a, c)] === salle);
    const j = def.j ? Math.round(def.j * (1 + .6 * (L - 1))) : 0; jobs += j;
    const m = lev * adj * (1 + (rel && def.p ? D.chemin : 0));
    const rec = {b, adj, rel, j, p:{}, x:{}, tav:!!def.tav, joie:def.joie ? def.joie * Math.sqrt(L) : 0};
    if (def.p) for (const r in def.p) rec.p[r] = def.p[r] * m;
    if (def.x) for (const r in def.x) rec.x[r] = def.x[r] * lev;
    if (def.p || def.x) D.prods.push(rec);
    vers.set(b, rec);
  }
  D.vers = vers; D.jobs = jobs; D.loge = Math.floor(loge * (1 + D.loge)); D.joieB = joie + D.joie;
  const fl = S.bats.find(b => b.k === 'fleche'); D.fleche = fl ? fl.n : 0;
  D.global = (1 + .02 * S.ambre) * (1 + .04 * D.fleche);
  D.cap = (STOCK[S.palier - 1]) * (1 + stockB + D.stock);
  D.carSlots = carB ? carB + D.car - 1 : 0;
  D.carT += carTB; D.vente += venteB;
  D.R = rayon(S, D);
  D.coutMul = Math.max(.5, 1 - D.cout); D.tempsMul = Math.max(.3, 1 - D.temps);
  CA.set(S, D); return D;
}
const dd = S => CA.get(S) || calc(S);
const capDe = (S, r, D = dd(S)) => D.cap * RS[r].cf;
const ajoute = (S, r, q, D = dd(S)) => { S.r[r] = Math.min(capDe(S, r, D), S.r[r] + q); };
const peutPayer = (S, c) => Object.entries(c).every(([r, q]) => S.r[r] >= q);
const payer = (S, c) => { for (const [r, q] of Object.entries(c)) S.r[r] -= q; };
const mult = c => Object.fromEntries(Object.entries(c).map(([r, q]) => [r, q]));
const dansTerr = (S, x, y, D = dd(S)) => Math.max(Math.abs(x - CX - .5), Math.abs(y - CY - .5)) <= D.R + .5;
const compteK = (S, k) => S.bats.filter(b => b.k === k).length;
function maxNiveau(S, k){ const d = BAT[k]; if (d.max) return d.max; return k === 'salle' ? 5 : 1 + 2 * S.palier; }
function cout(S, k, cible = 1){
  const d = BAT[k], D = dd(S); if (k === 'fleche') return FLECHE[cible - 1] ? mult(FLECHE[cible - 1]) : null;
  const facteur = cible > 1 ? Math.pow(1.55, cible - 1) : Math.pow(1.12, compteK(S, k));
  return Object.fromEntries(Object.entries(d.c).map(([r, q]) => [r, Math.ceil(q * facteur * D.coutMul)]));
}
const tempsChantier = (S, k, cible) => Math.min(420, BAT[k].sec * Math.pow(1.3, cible - 1) * dd(S).tempsMul);

/* un bâtiment peut-il aller ici ? → {ok, raison, bonus} */
function placement(S, k, x, y){
  const d = BAT[k], D = dd(S), s = d.s || 1;
  if (x < 0 || y < 0 || x + s > W || y + s > W) return {ok:false, raison:'Hors de la carte'};
  for (let v = 0; v < s; v++) for (let u = 0; u < s; u++){ const i = id(x + u, y + v);
    if (!dansTerr(S, x + u, y + v, D)) return {ok:false, raison:'Hors du territoire'};
    if (D.occ[i]) return {ok:false, raison:'Déjà occupé'};
    if (D.ch.has(i)) return {ok:false, raison:'Il y a un chemin ici'};
    const t = S.map[i]; if (t !== '.') return {ok:false, raison:t === 'f' || t === 'r' ? 'À défricher d\'abord' : 'Terrain impossible'}; }
  if (d.pres && !voisins(S, x, y, d.pres.r, d.pres.t, s)) return {ok:false, raison:{f:'Trop loin d\'une forêt', rm:'Trop loin des roches', e:'Doit toucher l\'eau', m:'Doit toucher la montagne', lm:'Trop loin d\'une source ou de la montagne'}[d.pres.t]};
  return {ok:true, bonus:adjB(S, k, x, y, D.occ)};
}
function disponible(S, k){ const d = BAT[k]; return S.palier >= d.t && !(d.unique && compteK(S, k)); }
function batir(S, k, x, y){
  if (!disponible(S, k)) return false;
  const p = placement(S, k, x, y); if (!p.ok) return false;
  const c = cout(S, k, 1); if (!peutPayer(S, c)) return false;
  payer(S, c); const tot = tempsChantier(S, k, 1);
  S.bats.push({i:S.next++, k, x, y, n:0, con:tot, tot}); inv(S); return true;
}
function ameliorer(S, b){
  if (b.con > 0) return false; const cible = b.n + 1; if (cible > maxNiveau(S, b.k)) return false;
  if (b.k === 'salle') return monterPalier(S);
  const c = cout(S, b.k, cible); if (!peutPayer(S, c)) return false;
  payer(S, c); b.con = b.tot = tempsChantier(S, b.k, cible); S.st.amel++; inv(S); return true;
}
function peutMonter(S){ const P = PAL[S.palier]; return !!P && S.pop >= P.pop && peutPayer(S, P.c) && !(S.bats[0].con > 0); }
function monterPalier(S){ if (!peutMonter(S)) return false; payer(S, PAL[S.palier].c); const b = S.bats[0]; b.con = b.tot = 20 * S.palier * S.palier; inv(S); return true; }
function demolir(S, b){ if (BAT[b.k].unique) return false;
  const c = b.n > 0 ? cout(S, b.k, Math.max(1, b.n)) : null; S.bats = S.bats.filter(o => o !== b);
  if (c) for (const [r, q] of Object.entries(c)) ajoute(S, r, q * .4); inv(S); return true; }
function poserChemin(S, x, y){ const i = id(x, y), D = dd(S);
  if (x < 0 || y < 0 || x >= W || y >= W || !dansTerr(S, x, y, D) || D.occ[i] || D.ch.has(i) || S.map[i] !== '.' || S.r.bois < 1) return false;
  S.r.bois -= 1; S.chem.push(i); inv(S); return true; }
function retirerChemin(S, x, y){ const i = id(x, y), n = S.chem.indexOf(i); if (n < 0) return false; S.chem.splice(n, 1); inv(S); return true; }
function coutDefricher(S, x, y){ const t = S.map[id(x, y)]; return t === 'f' ? {or:2} : t === 'r' ? {or:4} : null; }
function defricher(S, x, y){ const i = id(x, y), t = S.map[i], D = dd(S), c = coutDefricher(S, x, y);
  if (!c || !dansTerr(S, x, y, D) || !peutPayer(S, c)) return false;
  payer(S, c); ajoute(S, t === 'f' ? 'bois' : 'pierre', 6 * ECH[S.palier - 1], D);
  S.map = S.map.slice(0, i) + '.' + S.map.slice(i + 1); inv(S); return true; }

/* ---------- Recherche ---------- */
const rechOk = (S, k) => { const R = RECH[k]; return !S.fait[k] && S.palier >= R.t && (R.dep || []).every(d => S.fait[d]); };
function chercher(S, k){ if (S.cour || !rechOk(S, k) || S.r.savoir < RECH[k].c) return false; S.r.savoir -= RECH[k].c; S.cour = {k, r:RECH[k].sec, tot:RECH[k].sec}; return true; }

/* ---------- Sorts ---------- */
const sortOk = (S, k) => { const D = dd(S), s = SORTS[k]; return S.palier >= s.t && (!s.rech || D.sorts[k]); };
function lancer(S, k){
  const s = SORTS[k]; if (!sortOk(S, k) || S.r.mana < s.c || (S.cd[k] || 0) > 0) return false;
  if (s.fn === 'transmut' && S.r.pierre < 200) return false;
  S.r.mana -= s.c; S.cd[k] = s.cd;
  if (s.buff) S.buffs.push({...s.buff, n:s.n, tot:s.buff.r});
  else if (s.fn === 'transmut'){ S.r.pierre -= 200; ajoute(S, 'fer', 40); }
  else if (s.fn === 'distorsion'){ for (let i = 0; i < 60; i++) avancer(S, 5); }
  else if (s.fn === 'griffon'){ S.car.forEach(c => c.rest = 0); }
  else if (s.fn === 'sylve'){ let n = 0; const D = dd(S), B = S.bats.filter(b => b.k === 'bucheron' || b.k === 'bosquet');
    for (const b of B) for (let v = b.y - 2; v <= b.y + 2 && n < 4; v++) for (let u = b.x - 2; u <= b.x + 2 && n < 4; u++){ if (u < 0 || v < 0 || u >= W || v >= W) continue; const i = id(u, v);
      if (S.map[i] === '.' && !D.occ[i] && !D.ch.has(i) && Math.random() < .5){ S.map = S.map.slice(0, i) + 'f' + S.map.slice(i + 1); n++; } }
    inv(S); return {n}; }
  return true;
}

/* ---------- Commerce ---------- */
const royOuvert = (S, k) => S.palier >= ROY[k].t && S.bats.some(b => b.k === 'marche' && b.n > 0);
const carMax = S => [60, 200, 700, 2400, 8000][S.palier - 1];
const carLibres = S => dd(S).carSlots - S.car.length;
function prixCentre(S, k, r, s0){ const R = S.rois[k], T = R.T[r], s = s0 === undefined ? R.s[r] : s0; return RS[r].v * ROY[k].prix * clamp(Math.pow(T / Math.max(1, s), .75), .3, 3.6) * (R.ev && R.ev.r === r ? R.ev.m : 1); }
const ecart = (S, k) => Math.max(.04, .18 - .0013 * S.rois[k].rep);
function devis(S, k, r, q, sens){ const R = S.rois[k], D = dd(S), n = 8, sg = sens === 'v' ? 1 : -1; let t = 0;
  for (let i = 0; i < n; i++){ const s = Math.max(R.T[r] * .05, R.s[r] + sg * q * (i + .5) / n); t += prixCentre(S, k, r, s) * q / n; }
  const e = ecart(S, k); return Math.round(sens === 'v' ? t * (1 - e) * (1 + D.vente) : t * (1 + e) * (1 - D.achat)); }
const dureeTrajet = (S, k) => Math.round(ROY[k].d * Math.max(.3, 1 - dd(S).carT));
function caravane(S, k, r, q, sens){
  q = Math.floor(q); if (q <= 0 || q > carMax(S) || carLibres(S) <= 0 || !royOuvert(S, k)) return false;
  const R = S.rois[k], t = devis(S, k, r, q, sens);
  if (sens === 'v'){ if (S.r[r] < q) return false; S.r[r] -= q; R.s[r] += q; }
  else { if (S.r.or < t || R.s[r] - q < R.T[r] * .05) return false; S.r.or -= t; R.s[r] -= q; }
  const d = dureeTrajet(S, k); S.car.push({k, r, q, sens, or:t, tot:d, rest:d}); S.st.car++; return true;
}
function contratHonorer(S, c){ if (S.r[c.r] < c.q) return false; S.r[c.r] -= c.q; ajoute(S, 'or', c.or); const R = S.rois[c.k]; R.rep = Math.min(100, R.rep + 4 * dd(S).rep); R.s[c.r] += c.q; S.contrats = S.contrats.filter(x => x !== c); S.gaz.unshift(`${ROY[c.k].n} te remercie pour la livraison de ${c.q} ${RS[c.r].n.toLowerCase()}.`); S.gaz.length = Math.min(S.gaz.length, 14); return true; }
function basculerRoute(S, k, r){ if (!dd(S).routes) return false; const i = S.routes.findIndex(x => x.k === k && x.r === r); if (i >= 0) S.routes.splice(i, 1); else if (S.routes.length < 4) S.routes.push({k, r}); else return false; return true; }
function tickRois(S, dt){
  S.roiT += dt;
  while (S.roiT >= 15){ S.roiT -= 15;
    const ks = Object.keys(S.rois), gaz = t => { S.gaz.unshift(t); S.gaz.length = Math.min(S.gaz.length, 14); };
    for (const k of ks){ const R = S.rois[k], Z = ROY[k];
      for (const r of Z.plus) R.s[r] += R.T[r] * .025 * (.4 + Math.random() * Z.vol);
      for (const r of Z.moins) R.s[r] -= R.T[r] * .025 * (.4 + Math.random() * Z.vol);
      for (const r in R.s){ R.s[r] += (R.T[r] - R.s[r]) * .025; if (Z.vol > 1) R.s[r] *= 1 + (Math.random() - .5) * .14 * Z.vol / 2; R.s[r] = clamp(R.s[r], R.T[r] * .12, R.T[r] * 3); }
      if (R.ev && (R.ev.t -= 15) <= 0) R.ev = null;
      R.pres += (.5 + Math.random()) * ECH[S.palier - 1] * .1; }
    /* un événement chez un voisin */
    if (Math.random() < .035){ const k = pick(ks), R = S.rois[k], r = pick(Object.keys(R.s));
      if (!R.ev){ const up = Math.random() < .6; R.ev = {r, m:up ? 1.6 + Math.random() * .6 : .55, t:180 + Math.random() * 240};
        gaz(up ? `${ROY[k].n} : pénurie de ${RS[r].n.toLowerCase()}, les prix s'envolent.` : `${ROY[k].n} : ${RS[r].n.toLowerCase()} en abondance, prix cassés.`); } }
    /* les royaumes commercent entre eux : le plus gros écart de prix */
    if (Math.random() < .3){ let best = null; for (const a of ks) for (const b of ks) if (a !== b) for (const r in S.rois[a].s) if (r in S.rois[b].s){ const g = prixCentre(S, b, r) / prixCentre(S, a, r); if (!best || g > best.g) best = {a, b, r, g}; }
      if (best && best.g > 1.35){ const q = S.rois[best.a].T[best.r] * .14; S.rois[best.a].s[best.r] -= q; S.rois[best.b].s[best.r] += q; S.rois[best.a].pres += ECH[S.palier - 1]; S.rois[best.b].pres += .5 * ECH[S.palier - 1];
        if (Math.random() < .35) gaz(`${ROY[best.b].n} achète ${RS[best.r].n.toLowerCase()} à ${ROY[best.a].n}.`); } }
    /* un royaume en manque propose un contrat */
    if (S.contrats.length < 3 && Math.random() < .09){ const ouv = ks.filter(k => royOuvert(S, k));
      if (ouv.length){ const k = pick(ouv), Z = ROY[k], vus = Z.moins.filter(r => vu(S, r));
        if (vus.length){ const r = pick(vus), q = Math.max(10, Math.round(capDe(S, r) * (.15 + Math.random() * .25) / 5) * 5), or = Math.round(q * prixCentre(S, k, r) * (1.35 + Math.random() * .35));
          S.contrats.push({i:S.nc++, k, r, q, or, reste:600 + Math.random() * 600, voix:Z.voix}); } } }
    /* routes commerciales (vente automatique des surplus) */
    if (dd(S).routes) for (const x of S.routes){ if (carLibres(S) <= 0) break; const cap = capDe(S, x.r); if (S.r[x.r] > cap * .8) caravane(S, x.k, x.r, Math.min(carMax(S), S.r[x.r] - cap * .6), 'v'); }
  }
}
function vu(S, r){ if (['vivres', 'bois', 'pierre', 'or'].includes(r) || S.r[r] > 0) return true; for (const k in BAT){ const b = BAT[k]; if (b.t <= S.palier && b.p && r in b.p && compteK(S, k)) return true; } return false; }

/* ---------- Temps qui passe ---------- */
function avancer(S, dt){
  S.temps += dt; const jour0 = S.st.jours; S.st.jours = Math.floor(S.temps / DUREE_JOUR);
  S.buffs = S.buffs.filter(b => (b.r -= dt) > 0);
  for (const k in S.cd) if ((S.cd[k] -= dt) <= 0) delete S.cd[k];
  S.cloche = Math.max(0, S.cloche - dt);
  let chg = false;
  for (const b of S.bats) if (b.con > 0 && (b.con -= dt) <= 0){ b.con = 0; b.n++; chg = true;
    if (b.k === 'salle'){ const p0 = S.palier; S.palier = b.n; const ratio = ECH[S.palier - 1] / ECH[p0 - 1]; for (const k in S.rois){ const R = S.rois[k]; for (const r in R.s){ R.T[r] *= ratio; R.s[r] *= ratio; } } S.gaz.unshift(`Ta bourgade devient : ${PAL[S.palier - 1].n}.`); } }
  if (S.cour && (S.cour.r -= dt) <= 0){ S.fait[S.cour.k] = 1; S.st.rech++; S.cour = null; chg = true; }
  if (chg){ inv(S); }
  const D = dd(S), sai = SAISONS[saisonDe(S)];
  /* bonheur */
  let tavJ = 0; for (const p of D.prods) if (p.tav && !p.b.off) tavJ += p.b.tavOk === 0 ? 2 * Math.sqrt(p.b.n) : p.joie;
  const cible = clamp(50 + D.joieB + tavJ - 60 * (1 - Math.exp(-S.pop / 400)) + sai.joie - (S.faim > 0 ? 25 : 0), 0, 100);
  S.joie += (cible - S.joie) * Math.min(1, dt * .15);
  const joieM = .7 + S.joie * .006;
  /* multiplicateurs */
  const G = {}, buffT = S.buffs.filter(b => b.k === 'tout').reduce((a, b) => a * b.m, 1);
  for (const r of ORDRE){ let m = (1 + (D.pm[r] || 0)) * D.global * joieM * buffT; const sm = sai.m[r]; if (sm && !(D.hiver && r === 'vivres' && sm < 1)) m *= sm;
    for (const b of S.buffs) if (b.k === r) m *= b.m; G[r] = m; }
  const travail = D.jobs > 0 ? Math.min(1, S.pop / D.jobs) : 1; D.travail = travail; D.G = G; D.joieM = joieM;
  for (const p of D.prods){ const b = p.b; if (b.off) continue; let f = travail;
    if (Object.keys(p.p).length && Object.keys(p.p).every(r => S.r[r] >= capDe(S, r, D) - 1e-6)){ p.f = 0; continue; }
    for (const r in p.x){ const a = p.x[r] * f * dt; if (a > 0 && S.r[r] < a) f *= S.r[r] / a; }
    for (const r in p.x) S.r[r] = Math.max(0, S.r[r] - p.x[r] * f * dt);
    for (const r in p.p) ajoute(S, r, p.p[r] * f * dt * G[r], D);
    p.f = f; if (p.tav) b.tavOk = f > .05 ? 1 : 0; }
  ajoute(S, 'or', S.pop * .03 * dt * G.or, D);
  const eat = S.pop * .04 * dt;
  if (S.r.vivres >= eat){ S.r.vivres -= eat; S.faim = Math.max(0, S.faim - dt); } else { S.r.vivres = 0; S.faim = Math.min(30, S.faim + dt); }
  /* population */
  if (S.faim <= 0 && S.joie >= 20 && S.pop < D.loge) S.pop = Math.min(D.loge, S.pop + (.08 + (D.loge - S.pop) * .02) * dt);
  else if (S.pop > D.loge) S.pop = Math.max(D.loge, S.pop - .5 * dt);
  /* caravanes */
  for (const c of S.car) c.rest -= dt;
  for (const c of S.car.filter(c => c.rest <= 0)){ const R = S.rois[c.k]; if (c.sens === 'v') ajoute(S, 'or', c.or, D); else ajoute(S, c.r, c.q, D);
    R.rep = Math.min(100, R.rep + Math.min(3, c.or / (150 * ECH[S.palier - 1])) * D.rep); }
  S.car = S.car.filter(c => c.rest > 0);
  for (const c of S.contrats) c.reste -= dt;
  const avant = S.contrats.length; S.contrats = S.contrats.filter(c => c.reste > 0); if (avant !== S.contrats.length) S.gaz.unshift('Un contrat a expiré. Pas de rancune.');
  tickRois(S, dt);
  S.evT -= dt; if (S.evT <= 0){ S.evT = 150 + Math.random() * 240; if (S.msg.length < 3) ajouterMessage(S); }
  majQuetes(S);
}
/* retour après une absence : rattrape au plus la durée permise ; rend ce qui a changé */
function rattraper(S, maintenant = Date.now()){
  const ecoule = Math.max(0, (maintenant - S.t) / 1000), D = dd(S), dur = Math.min(ecoule, D.hl), avant = {...S.r}, pop0 = S.pop;
  const pas = dur > 7200 ? 20 : 5; let n = Math.floor(dur / pas);
  while (n-- > 0) avancer(S, pas);
  S.t = maintenant;
  return {ecoule, dur, plafond:ecoule > D.hl, gains:Object.fromEntries(ORDRE.map(r => [r, S.r[r] - avant[r]]).filter(([, q]) => Math.abs(q) >= 1)), pop:S.pop - pop0};
}

/* ---------- Gestes actifs ---------- */
function prodDe(S, b){ const D = dd(S), rec = D.vers.get(b); if (!rec) return null; return rec; }
function cueillir(S, b, sec = 25){ const D = dd(S), p = D.vers.get(b); if (!p) return null; const G = D.G || Object.fromEntries(ORDRE.map(r => [r, 1])), g = {};
  for (const r in p.p){ const q = Math.max(1, p.p[r] * sec * G[r]); ajoute(S, r, q, D); g[r] = q; } S.st.bulles++; return g; }
function sonnerCloche(S){ if (S.cloche > 0) return null; const D = dd(S), G = D.G || {}, g = {}; S.cloche = 90;
  for (const p of D.prods) if (!p.b.off) for (const r in p.p){ const q = p.p[r] * 15 * (G[r] || 1); ajoute(S, r, q, D); g[r] = (g[r] || 0) + q; }
  const o = S.pop * .03 * 15 * ((G.or) || 1); ajoute(S, 'or', o, D); g.or = (g.or || 0) + o; return g; }
function accelerer(S, b){ if (!(b.con > 0)) return false; b.con = Math.max(.05, b.con - b.tot * .15); return true; }
function feeRecompense(S){ S.st.fees++; const D = dd(S); if (Math.random() < .35){ S.buffs.push({k:'tout', m:1.3, r:90, tot:90, n:'Poussière de fée'}); return {buff:true}; }
  const L = ['or', 'vivres', 'bois', 'pierre'], r = pick(L), q = 40 * ECH[S.palier - 1]; ajoute(S, r, q, D); return {g:{[r]:q}}; }

/* ---------- Messagers ---------- */
const EVS = [
  {t:1, ti:'Colporteur égaré', tx:'Un colporteur propose ses sacs de graines contre un peu de bois.', a:[{l:'Échanger', c:{bois:15}, g:{vivres:50}}, {l:'Le renvoyer'}]},
  {t:1, ti:'Sanglier dans les champs', tx:'Une bête énorme piétine la récolte. Les villageois veulent la chasser.', a:[{l:'Organiser la chasse', g:{vivres:35}, c:{or:5}}, {l:'La laisser partir', g:{or:8}}]},
  {t:1, ti:'Barde de passage', tx:'Il joue sur la place. La soirée pourrait être longue.', a:[{l:'L\'inviter à rester', c:{vivres:15}, buff:{k:'or', m:1.5, r:90, n:'Soirée du barde'}}, {l:'Poursuivre le travail', g:{bois:20}}]},
  {t:1, ti:'Vieille borne', tx:'En labourant, on trouve une borne gravée. Dessous, une cachette.', a:[{l:'Creuser', g:{or:30}}, {l:'La vendre au forgeron', g:{pierre:30}}]},
  {t:2, ti:'Festival de la moisson', tx:'Les villageois proposent une journée de fête.', a:[{l:'Accorder la fête', c:{vivres:40}, buff:{k:'tout', m:1.2, r:120, n:'Festival'}}, {l:'Le travail d\'abord', g:{or:30}}]},
  {t:2, ti:'Moine copiste', tx:'Un moine propose de recopier ses manuscrits contre le gîte.', a:[{l:'L\'accueillir', c:{vivres:30}, g:{savoir:30}}, {l:'Refuser poliment'}]},
  {t:2, ti:'Marchand de brume', tx:'Il vend des tonneaux sans étiquette. Ça sent bon.', a:[{l:'Acheter', c:{or:40}, g:{hydromel:30}}, {l:'Passer son chemin'}]},
  {t:3, ti:'Comète bleue', tx:'Une comète traverse le ciel. Les mages veulent en capter l\'éclat.', a:[{l:'Allumer les tours', c:{bois:30}, g:{mana:25}}, {l:'Regarder et faire un vœu', buff:{k:'tout', m:1.15, r:120, n:'Vœu de la comète'}}]},
  {t:3, ti:'Dragon assoupi', tx:'Un petit dragon dort sur le toit de la grange. Il ronfle des étincelles.', a:[{l:'Lui offrir un festin', c:{vivres:60}, g:{or:80}}, {l:'Le laisser dormir', g:{pierre:30}}]},
  {t:3, ti:'Ménestrels elfes', tx:'Leur musique fait pousser la mousse et les idées.', a:[{l:'Les recevoir', c:{hydromel:15}, g:{savoir:50}}, {l:'Offrir du bois', c:{bois:40}, g:{mana:15}}]},
  {t:4, ti:'Foire des trois lunes', tx:'Une foire s\'installe pour trois jours.', a:[{l:'Taxer les étals', g:{or:90}}, {l:'Offrir la place', buff:{k:'or', m:2, r:120, n:'Foire des trois lunes'}}]},
  {t:4, ti:'Golem réveillé', tx:'Un golem sort de la mine et attend des ordres.', a:[{l:'Le mettre à la carrière', g:{pierre:120}}, {l:'L\'envoyer à la forge', g:{fer:30}}]}
];
function ajouterMessage(S){ const L = EVS.filter(e => e.t <= S.palier); const e = pick(L); S.msg.push({ev:EVS.indexOf(e), e:ECH[S.palier - 1]}); }
const msgDe = m => EVS[m.ev];
function repondre(S, m, n){ const e = EVS[m.ev], a = e.a[n], k = m.e; if (!a) return false;
  const c = a.c ? Object.fromEntries(Object.entries(a.c).map(([r, q]) => [r, q * k])) : null; if (c && !peutPayer(S, c)) return false; if (c) payer(S, c);
  if (a.g) for (const [r, q] of Object.entries(a.g)) ajoute(S, r, q * k);
  if (a.buff) S.buffs.push({...a.buff, tot:a.buff.r});
  S.msg = S.msg.filter(x => x !== m); return true; }

/* ---------- Quêtes ---------- */
const TUTO = [
  {ty:'bat', k:'chaumiere', but:1, tx:'Bâtis une chaumière', rec:{bois:25}},
  {ty:'bat', k:'ferme', but:1, tx:'Bâtis une ferme', rec:{bois:20}},
  {ty:'bat', k:'bucheron', but:1, tx:'Bâtis un bûcheron près d\'une forêt', rec:{vivres:25, bois:10}},
  {ty:'bat', k:'carriere', but:1, tx:'Bâtis une carrière près des roches', rec:{or:20}},
  {ty:'bul', but:3, tx:'Cueille 3 bulles au-dessus des bâtiments', rec:{bois:30}},
  {ty:'chem', but:1, tx:'Relie un bâtiment à la Grande Salle avec un chemin', rec:{pierre:25}},
  {ty:'amel', but:1, tx:'Améliore un bâtiment', rec:{bois:40}},
  {ty:'bat', k:'chaumiere', but:3, tx:'Possède 3 chaumières', rec:{or:30}},
  {ty:'pal', but:2, tx:'Fais de ton hameau un Bourg (touche la Grande Salle)', rec:{bois:80, or:40}},
  {ty:'bat', k:'marche', but:1, tx:'Bâtis un marché', rec:{or:60}},
  {ty:'car', but:1, tx:'Envoie une caravane dans un royaume', rec:{or:80}},
  {ty:'bat', k:'biblio', but:1, tx:'Bâtis une bibliothèque', rec:{savoir:15}},
  {ty:'rech', but:1, tx:'Termine une recherche', rec:{savoir:25, or:50}}
];
const valeurQuete = (S, q) => { switch (q.ty){ case 'bat': return S.bats.filter(b => b.k === q.k && (b.n > 0)).length; case 'bul': return S.st.bulles - (q.d0 || 0); case 'chem': return dd(S).vers && [...dd(S).vers.values()].some(p => p.rel && p.b.k !== 'salle' && adjacentChemin(S, p.b)) ? 1 : 0; case 'amel': return S.st.amel - (q.d0 || 0); case 'pal': return S.palier; case 'car': return S.st.car - (q.d0 || 0); case 'rech': return S.st.rech - (q.d0 || 0); case 'pop': return Math.floor(S.pop); case 'stock': return Math.floor(S.r[q.r]); default: return 0; } };
const adjacentChemin = (S, b) => { const D = dd(S), s = BAT[b.k].s || 1; for (let i = 0; i < s; i++) for (const [a, c] of [[b.x + i, b.y - 1], [b.x + i, b.y + s], [b.x - 1, b.y + i], [b.x + s, b.y + i]]) if (D.relies.has(id(a, c))) return true; return false; };
const queteFaite = (S, q) => valeurQuete(S, q) >= q.but;
function genererQuete(S){
  const t = S.palier, e = ECH[t - 1], dispo = Object.keys(BAT).filter(k => BAT[k].t <= t && !BAT[k].unique && (BAT[k].p || BAT[k].l)), L = [];
  const k = pick(dispo); L.push({ty:'bat', k, but:S.bats.filter(b => b.k === k && b.n > 0).length + 1, tx:`Possède ${S.bats.filter(b => b.k === k && b.n > 0).length + 1} × ${BAT[k].n}`});
  L.push({ty:'bul', but:4, d0:S.st.bulles, tx:'Cueille 4 bulles'}); L.push({ty:'amel', but:2, d0:S.st.amel, tx:'Améliore 2 bâtiments'});
  const D = dd(S); if (D.loge > S.pop + 3) L.push({ty:'pop', but:Math.floor(S.pop) + Math.max(3, Math.floor((D.loge - S.pop) * .7)), tx:'Accueille de nouveaux villageois'});
  const vus = ORDRE.filter(r => vu(S, r) && r !== 'or'), r = pick(vus); L.push({ty:'stock', r, but:Math.round(capDe(S, r, D) * .55), tx:`Amasse des réserves : ${RS[r].n.toLowerCase()}`});
  if (S.bats.some(b => b.k === 'marche' && b.n > 0)) L.push({ty:'car', but:2, d0:S.st.car, tx:'Envoie 2 caravanes'});
  if (S.bats.some(b => b.k === 'biblio' && b.n > 0) && Object.keys(RECH).some(x => rechOk(S, x))) L.push({ty:'rech', but:1, d0:S.st.rech, tx:'Termine une recherche'});
  const q = pick(L), rr = pick(['or', 'vivres', 'bois', 'pierre']); q.rec = {[rr]:Math.round((30 + Math.random() * 30) * e), or:Math.round(20 * e)}; if (rr === 'or') q.rec = {or:Math.round(60 * e)};
  return q;
}
function majQuetes(S){
  if (S.tuto < TUTO.length){ if (!S.quetes.length){ const q = {...TUTO[S.tuto], i:S.nq++, tu:1}; if (q.ty === 'bul' || q.ty === 'amel' || q.ty === 'car' || q.ty === 'rech') q.d0 = q.ty === 'bul' ? S.st.bulles : q.ty === 'amel' ? S.st.amel : q.ty === 'car' ? S.st.car : S.st.rech; S.quetes.push(q); } return; }
  while (S.quetes.length < 3){ const q = genererQuete(S); q.i = S.nq++; S.quetes.push(q); }
}
function encaisserQuete(S, q){ if (!queteFaite(S, q)) return null; for (const [r, n] of Object.entries(q.rec)) ajoute(S, r, n); S.quetes = S.quetes.filter(x => x !== q); if (q.tu) S.tuto++; majQuetes(S); return q.rec; }

/* ---------- Classement, renaissance ---------- */
const prestige = S => Math.round(S.pop * 10 + Object.keys(S.fait).length * 30 + ECH[S.palier - 1] * 120 + S.bats.reduce((a, b) => a + b.n * 6, 0) + dd(S).fleche * 4000);
const classement = S => [{moi:true, n:'Ambreval', p:prestige(S)}, ...Object.entries(S.rois).filter(([k]) => S.palier >= ROY[k].t).map(([k, R]) => ({n:ROY[k].n, p:Math.round(R.pres)}))].sort((a, b) => b.p - a.p);
const gainAmbre = S => 10 + Math.floor(S.pop / 25) + Math.floor(Object.keys(S.fait).length / 2) + 4 * S.ren;
const peutRenaitre = S => dd(S).fleche >= 5;
function renaitre(S){ if (!peutRenaitre(S)) return null; return nouvelle(0, {ambre:S.ambre + gainAmbre(S), ren:S.ren + 1, son:S.son}); }

function charger(txt){ const S = typeof txt === 'string' ? JSON.parse(txt) : txt; if (!S || S.v !== 1 || !Array.isArray(S.bats)) throw new Error('partie illisible'); return S; }

root.Jeu = {W, CX, CY, id, ECH, RS, ORDRE, PAL, STOCK, BAT, FLECHE, RECH, SORTS, ROY, SAISONS, DUREE_SAISON, DUREE_JOUR, saisonDe, nouvelle, avancer, rattraper, charger, dd, inv, capDe, peutPayer, compteK, maxNiveau, cout, tempsChantier, placement, disponible, batir, ameliorer, peutMonter, monterPalier, demolir, poserChemin, retirerChemin, coutDefricher, defricher, rechOk, chercher, sortOk, lancer, royOuvert, carMax, carLibres, prixCentre, ecart, devis, dureeTrajet, caravane, contratHonorer, basculerRoute, vu, prodDe, cueillir, sonnerCloche, accelerer, feeRecompense, msgDe, repondre, queteFaite, valeurQuete, encaisserQuete, classement, prestige, gainAmbre, peutRenaitre, renaitre, dansTerr, voisins, adjB};
})(typeof window !== 'undefined' ? window : globalThis);
