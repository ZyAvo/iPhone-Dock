// mon-ecran-version: a06f8fa4
/* QM27 (v87) — graphismes dessinés par le code, sans image : blasons des clubs, maillots, avatars, radar du profil.
   Tout est déterministe : un club ou une personne a toujours le même dessin (graine = identifiant).
   window.QMV = {blason, maillot, avatar, radar, couleursNation, emblemeDe}. Aucune dépendance (QMD seulement pour les prénoms). */
(function(root){
'use strict';
const D = () => root.QMD;

/* ---------- outils ---------- */
const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(graine){ let a = hash(graine) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const choix = (r, L) => L[Math.floor(r() * L.length)];
const pondere = (r, L) => { const tot = L.reduce((s, x) => s + x[1], 0); let v = r() * tot; for (const [x, p] of L) { v -= p; if (v < 0) return x; } return L[L.length - 1][0]; };
let compteur = 0; const uid = () => 'qv' + (++compteur).toString(36);
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const melange = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* couleur lisible sur un fond : la couleur voulue si elle contraste assez, sinon blanc ou presque noir */
const lisible = (fond, voulue) => voulue && contraste(fond, voulue) >= 2.2 ? voulue : (lum(fond) > 0.45 ? '#16202c' : '#ffffff');
const ton = (c, t) => lum(c) > 0.5 ? melange(c, '#000000', t) : melange(c, '#ffffff', t);

/* ---------- emblèmes (24 × 24, couleur C) ---------- */
const EMB = {
  serpent:C => `<path d="M17.6 6.2c-2.4-2-6.6-1.4-6.9 1.4-.4 3.4 6.6 3.5 6 7.6-.6 3.9-6.8 4.6-10.6 2.4" fill="none" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/><circle cx="18.3" cy="6.4" r="2.2" fill="${C}"/><path d="M20.2 6.1l2-1M20.3 6.8l2.1.6" stroke="${C}" stroke-width=".9" stroke-linecap="round"/>`,
  aile:C => `<path d="M21.5 3.5C14 3.8 7.5 8 3 18.5c2.6-1.8 4.7-2.4 6.8-2.6-1 1.5-1.6 3-1.7 4.6 2-2.5 4.2-3.6 6.3-4-.5 1-.7 2-.6 3 3.2-3.6 6-8.2 7.7-16z" fill="${C}"/><path d="M10 13.6c2.6-2.6 5.6-5.2 9.6-7.4M8.4 17.2c3-2.2 6.3-4.3 9.6-6.2" stroke="rgba(0,0,0,.28)" stroke-width=".8" fill="none"/>`,
  oiseau:C => `<path d="M2.5 9.5c3.4-.4 6 .6 8 3 .8-3.8 3.6-6.7 8.6-7.2-.8 1.6-1.8 2.8-3.2 3.7 2.8.1 4.6 1 5.6 2.6-3.6-.4-6.6.6-8.5 3.4l-1.7 4.4-1-4.2c-2.2-2.3-4.6-4.3-7.8-5.7z" fill="${C}"/><circle cx="17.1" cy="8.4" r=".7" fill="rgba(0,0,0,.45)"/>`,
  hibou:C => `<path d="M6 6.5l2.6 2.2a8 8 0 0 1 6.8 0L18 6.5l-.4 4.3A7.6 8.4 0 1 1 6.4 10.8z" fill="${C}"/><circle cx="9.4" cy="12.4" r="2.6" fill="rgba(255,255,255,.92)"/><circle cx="14.6" cy="12.4" r="2.6" fill="rgba(255,255,255,.92)"/><circle cx="9.6" cy="12.6" r="1.2" fill="#16202c"/><circle cx="14.4" cy="12.6" r="1.2" fill="#16202c"/><path d="M12 14.3l-1 1.6h2z" fill="#e2a33b"/><path d="M8.5 18.6c2.3 1 4.7 1 7 0" stroke="rgba(0,0,0,.3)" stroke-width=".8" fill="none"/>`,
  flamme:C => `<path d="M12.4 2c.6 4.2 6.4 6.3 6.4 12.5a6.8 6.8 0 0 1-13.6 0c0-3.4 2-5.5 3.3-6.7.1 2.2 1 3.4 2.3 3.6-.3-4.2-.4-6.6 1.6-9.4z" fill="${C}"/><path d="M12 21c-2 0-3.3-1.4-3.3-3.3 0-1.8 1.4-3 2.2-4 .4 1.4 1.4 2.1 2.2 2.3 1 .9 2 1.7 2 2.6 0 1.4-1.3 2.4-3.1 2.4z" fill="rgba(255,255,255,.35)"/>`,
  etoile:C => `<path d="M12 2.5l2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4l-6 3.4 1.4-6.7-5-4.6 6.7-.8z" fill="${C}"/>`,
  comete:C => `<path d="M15.6 4.2l1.5 3.2 3.5.4-2.6 2.4.7 3.5-3.1-1.8-3.1 1.8.7-3.5-2.6-2.4 3.5-.4z" fill="${C}"/><path d="M11 12.5L3 20.5M12.6 15.2l-5.2 5.4M8.4 10.8L3 14.8" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/>`,
  oeil:C => `<path d="M1.8 12c3-5 6.6-7.4 10.2-7.4S19.2 7 22.2 12c-3 5-6.6 7.4-10.2 7.4S4.8 17 1.8 12z" fill="${C}"/><circle cx="12" cy="12" r="4.4" fill="rgba(255,255,255,.92)"/><circle cx="12" cy="12" r="2.2" fill="#16202c"/><circle cx="13" cy="11" r=".7" fill="#fff"/>`,
  chapeau:C => `<path d="M7.4 17.6c.9-3.6 2-7.4 4.2-10.4 1.6-2.2 3.8-3.6 6-4.4-.8 1.6-1.2 3.4-1 5.4.3 3 1.4 6 1.9 9.4z" fill="${C}"/><ellipse cx="12" cy="18.2" rx="10" ry="2.6" fill="${C}"/><path d="M7.9 15.8c2.8.9 5.8 1 9 .1" stroke="rgba(0,0,0,.35)" stroke-width="1.4" fill="none"/>`,
  chaudron:C => `<path d="M4.4 9.5h15.2c.4 1.2.6 2.4.6 3.6 0 4.2-3.6 6.8-8.2 6.8S3.8 17.3 3.8 13.1c0-1.2.2-2.4.6-3.6z" fill="${C}"/><rect x="3" y="8" width="18" height="2.4" rx="1.2" fill="${C}"/><path d="M6.5 19.4l-1.2 2.4M17.5 19.4l1.2 2.4" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/><circle cx="9.4" cy="5.6" r="1.4" fill="${C}"/><circle cx="13.2" cy="4" r="1" fill="${C}"/><circle cx="15" cy="6.4" r=".8" fill="${C}"/>`,
  fiole:C => `<path d="M9.6 2.8h4.8M10.3 3v5.8c-3.5 1.2-5.8 4.1-5.8 7.4 0 3.7 3.3 6 7.5 6s7.5-2.3 7.5-6c0-3.3-2.3-6.2-5.8-7.4V3" fill="${C}" stroke="${C}" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.2 15.4c3.6-1.2 7.6 1.1 11.6 0" stroke="rgba(255,255,255,.5)" stroke-width="1.1" fill="none"/><circle cx="10" cy="18" r=".9" fill="rgba(255,255,255,.55)"/><circle cx="13.4" cy="17.2" r=".6" fill="rgba(255,255,255,.55)"/>`,
  livre:C => `<path d="M12 6.2C9.6 4.4 6.4 4 2.8 4.6v13.6c3.4-.5 6.6-.2 9.2 1.6 2.6-1.8 5.8-2.1 9.2-1.6V4.6C17.6 4 14.4 4.4 12 6.2z" fill="${C}"/><path d="M12 6.4v13.2M5 8.6c1.8-.2 3.6 0 5.2.8M5 11.6c1.8-.2 3.6 0 5.2.8M13.8 9.4c1.6-.8 3.4-1 5.2-.8M13.8 12.4c1.6-.8 3.4-1 5.2-.8" stroke="rgba(0,0,0,.32)" stroke-width=".9" fill="none"/>`,
  lune:C => `<path d="M15.6 2.8a9.6 9.6 0 1 0 5.8 15.6A7.8 7.8 0 0 1 15.6 2.8z" fill="${C}"/><path d="M19 4.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="${C}"/>`,
  fantome:C => `<path d="M5.4 21V10.6a6.6 6.6 0 0 1 13.2 0V21l-2.2-2-2.2 2-2.2-2-2.2 2-2.2-2z" fill="${C}"/><ellipse cx="9.6" cy="11" rx="1.3" ry="1.8" fill="#16202c"/><ellipse cx="14.4" cy="11" rx="1.3" ry="1.8" fill="#16202c"/><ellipse cx="12" cy="15.2" rx="1.4" ry="1.1" fill="#16202c" opacity=".7"/>`,
  queue:C => `<path d="M6.4 2.6c4.6 1.4 7.8 4.8 7.9 9.2.1 2.4-.7 4.4-1.9 6l4.9 3.6c-2.6.6-4.9.3-6.7-.8-.3 1.6-1.4 2.8-3.4 3.6.7-2.4.6-4.2-.3-5.6 1.9-1.6 3.1-3.8 3.1-6.4 0-3.6-1.2-6.6-3.6-9.6z" fill="${C}"/><path d="M8.6 6.8c1 .2 2 .1 2.8-.4M9.8 9.8c1 .2 2 .1 2.8-.4M10.2 12.8c.9.2 1.8.1 2.6-.4" stroke="rgba(0,0,0,.3)" stroke-width=".8" fill="none"/>`,
  licorne:C => `<path d="M8.6 21.4l.8-5.4-3.2-2.6 1.6-4.4 3.6-2.2 2.2-3.2.4 3.6 2.8 2.4c1.1 1.4 1.5 2.8 1 4.2l-3.2-1.2-1 3.8.8 5z" fill="${C}"/><path d="M14.2 6.4L19.8 1.8l-3.6 6.2z" fill="${C}"/><circle cx="12.9" cy="9.6" r=".7" fill="#16202c"/><path d="M9.4 6.8c-1.2.8-2.4 2.4-2.8 4" stroke="rgba(0,0,0,.3)" stroke-width=".9" fill="none"/>`,
  masque:C => `<path d="M5.4 3.6l3.2 3.6a8.2 8.2 0 0 1 6.8 0l3.2-3.6.2 5.6c.8 1.4 1.2 3 1.2 4.6 0 4.6-3.6 7.6-8 7.6s-8-3-8-7.6c0-1.6.4-3.2 1.2-4.6z" fill="${C}"/><path d="M7.6 12l3 1.2M16.4 12l-3 1.2" stroke="#16202c" stroke-width="1.6" stroke-linecap="round"/><path d="M8.4 16.6h7.2l-1 1.8-1.2-1-1.2 1-1.2-1-1.2 1z" fill="#16202c"/>`,
  feuille:C => `<path d="M4 20C3.6 10.8 9 4.2 20.4 3.6 20.6 14.6 14.2 20.6 4 20z" fill="${C}"/><path d="M4.6 19.4C8.6 14.6 12.4 10.8 17.6 6.6M9 15.4l-.4-3.6M12 12.4l3.6.2M11.2 13.2l-.4-3" stroke="rgba(0,0,0,.32)" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  lanterne:C => `<path d="M12 1.8v2.4M8 4.4h8l-1 2H9z" stroke="${C}" stroke-width="1.6" fill="${C}" stroke-linejoin="round"/><path d="M7.4 7.2h9.2l1 11.4H6.4z" fill="${C}"/><path d="M12 9.8c1.6 1.8 2 3.2 2 4.4a2 2 0 0 1-4 0c0-1.2.4-2.6 2-4.4z" fill="rgba(255,236,160,.95)"/><rect x="5.6" y="18.4" width="12.8" height="2.4" rx="1" fill="${C}"/>`,
  etincelle:C => `<path d="M12 1.8l2.3 7.9 7.9 2.3-7.9 2.3-2.3 7.9-2.3-7.9-7.9-2.3 7.9-2.3z" fill="${C}"/><path d="M19.4 2.6l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z" fill="${C}"/>`,
  baguette:C => `<path d="M3.6 20.4L15.4 8.6" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/><path d="M17.6 2.4l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" fill="${C}"/><circle cx="21" cy="11.6" r=".9" fill="${C}"/><circle cx="12.6" cy="3.4" r=".8" fill="${C}"/>`,
  boule:C => `<circle cx="12" cy="10.2" r="7.4" fill="${C}"/><path d="M8.2 7.6a4.4 4.4 0 0 1 4.2-2.2" stroke="rgba(255,255,255,.75)" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M6.6 18.6h10.8l1.4 3H5.2z" fill="${C}"/><circle cx="13.6" cy="12" r="1" fill="rgba(255,255,255,.5)"/>`,
  champignon:C => `<path d="M2.8 12.4C3.4 6.8 7.2 3.6 12 3.6s8.6 3.2 9.2 8.8z" fill="${C}"/><path d="M9.4 12.4h5.2l.8 7.2c0 1-1.6 1.6-3.4 1.6s-3.4-.6-3.4-1.6z" fill="${C}" opacity=".8"/><circle cx="8.2" cy="8.4" r="1.4" fill="rgba(255,255,255,.75)"/><circle cx="14" cy="6.6" r="1.1" fill="rgba(255,255,255,.75)"/><circle cx="16.6" cy="9.8" r="1.2" fill="rgba(255,255,255,.75)"/>`,
  balai:C => `<path d="M3.2 3.2l10.6 10.6" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/><path d="M12.4 13.2l2.8-1.6 7.2 7.2c-1.6 1.6-3.8 2.6-6 2.4-.2-1.2-.6-2.2-1.4-3l-1.4 1.6c-.4-1.6-1-3.4-2.2-4.6z" fill="${C}"/><path d="M13.6 14.6l3.6 4.4M15.4 13.4l4 4.6" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`,
};
const EMBLEMES = {bath:'serpent', york:'aile', canterbury:'baguette', glastonbury:'livre', whitby:'chapeau', norwich:'lune', oxford:'boule', inverness:'queue',
  aberdeen:'fiole', stirling:'queue', conwy:'chaudron', swansea:'baguette', aberystwyth:'oeil', galway:'fantome', cork:'aile', dublin:'feuille',
  rennes:'etincelle', paris:'masque', lyon:'chapeau', carcassonne:'chapeau', nantes:'oiseau', strasbourg:'hibou', besancon:'serpent', brest:'masque',
  toulouse:'champignon', bordeaux:'fantome', marseille:'queue', poitiers:'serpent', lille:'comete', montpellier:'feuille', reims:'licorne', grenoble:'etincelle',
  benevento:'chapeau', perugia:'aile', venezia:'flamme', milano:'serpent', torino:'etincelle', arezzo:'masque', napoli:'oeil', roma:'boule',
  firenze:'etoile', palermo:'masque', bologna:'champignon', genova:'lanterne', verona:'baguette', trieste:'fantome', bari:'flamme', bergamo:'balai',
  madrid:'aile', barcelona:'flamme', sevilla:'flamme', toledo:'baguette', stockholm:'chapeau', goteborg:'queue', uppsala:'boule', malmo:'fantome',
  oslo:'fantome', bergen:'feuille', trondheim:'queue', tromso:'comete', kobenhavn:'serpent', aarhus:'etincelle', odense:'champignon', helsinki:'chaudron',
  turku:'livre', tampere:'lanterne', reykjavik:'etoile', akureyri:'masque', berlin:'chapeau', munchen:'serpent', hamburg:'lanterne', koln:'champignon',
  krakow:'flamme', warszawa:'queue', gdansk:'aile', amsterdam:'chaudron', utrecht:'fantome', bruxelles:'baguette', antwerpen:'masque', wien:'oeil',
  salzburg:'masque', praha:'livre', brno:'flamme', luxembourg:'serpent'};
const emblemeDe = id => EMBLEMES[id] || choix(rng('emb' + id), Object.keys(EMB));

/* sélections : couleurs du maillot */
const NATIONS = {ENG:['#f4f4f4', '#c8102e'], SCO:['#1b2a4a', '#ffffff'], WAL:['#c8102e', '#ffffff'], IRL:['#169b62', '#ffffff'], FRA:['#1f3c88', '#ffffff'], ITA:['#2a7de1', '#ffffff'],
  ESP:['#c60b1e', '#ffc400'], DEN:['#c8102e', '#ffffff'], SWE:['#006aa7', '#fecc00'], NOR:['#ba0c2f', '#00205b'], FIN:['#ffffff', '#002f6c'], ISL:['#02529c', '#dc1e35'],
  GER:['#ffffff', '#1a1a1a'], NED:['#ff7f00', '#ffffff'], BEL:['#e30613', '#fdda24'], LUX:['#00a1de', '#ef3340'], POL:['#ffffff', '#dc143c'], AUT:['#ed2939', '#ffffff'], CZE:['#d7141a', '#11457e']};
const couleursNation = n => NATIONS[n] || ['#33415c', '#e0e1dd'];

/* ---------- blason ---------- */
const FORMES = {
  ecu:'M4 3.5h32v17.5c0 10.4-7.4 16.2-16 19.6C11.4 37.2 4 31.4 4 21z',
  rond:'M20 2.5a18.5 18.5 0 1 1 0 37 18.5 18.5 0 0 1 0-37z',
  ancien:'M4 6.5c5.6 0 10.6-1.6 16-4 5.4 2.4 10.4 4 16 4V21c0 10.4-7.4 16.2-16 19.6C11.4 37.2 4 31.4 4 21z',
  pointe:'M4 3.5h32V24L20 40.6 4 24z',
};
const PARTITIONS = {
  plein:() => '',
  parti:(t) => `<rect x="20" y="0" width="20" height="44" fill="${t}"/>`,
  coupe:(t) => `<rect x="0" y="22" width="40" height="22" fill="${t}"/>`,
  chevron:(t) => `<path d="M0 30L20 16 40 30v14H0z" fill="${t}"/>`,
  bande:(t) => `<path d="M-4 10L10 -4 48 34 34 48z" fill="${t}"/>`,
  pal:(t) => `<rect x="14" y="0" width="12" height="44" fill="${t}"/>`,
  rayures:(t) => [4, 14, 24, 34].map(x => `<rect x="${x}" y="0" width="5" height="44" fill="${t}"/>`).join(''),
  ecartele:(t) => `<rect x="20" y="0" width="20" height="22" fill="${t}"/><rect x="0" y="22" width="20" height="22" fill="${t}"/>`,
};
/* v93 : illustrations (images/qm27/ : blasons, lieux et bâtiments du domaine, fond de carte) ; les dessins en code restent pour la galerie et en secours */
const IMAGES = 'images/qm27/';
/* v106 : les clubs qui ont un blason illustré (v110 : les 84, dont les 20 de réserve) ; sinon le blason dessiné */
const BLASONS_ILLUSTRES = new Set(['aarhus', 'aberdeen', 'aberystwyth', 'akureyri', 'amsterdam', 'antwerpen', 'arezzo', 'barcelona', 'bari', 'bath', 'benevento', 'bergamo', 'bergen', 'berlin', 'besancon', 'bologna', 'bordeaux', 'brest', 'brno', 'bruxelles', 'canterbury', 'carcassonne', 'conwy', 'cork', 'dublin', 'firenze', 'galway', 'gdansk', 'genova', 'glastonbury', 'goteborg', 'grenoble', 'hamburg', 'helsinki', 'inverness', 'kobenhavn', 'koln', 'krakow', 'lille', 'luxembourg', 'lyon', 'madrid', 'malmo', 'marseille', 'milano', 'montpellier', 'munchen', 'nantes', 'napoli', 'norwich', 'odense', 'oslo', 'oxford', 'palermo', 'paris', 'perugia', 'poitiers', 'praha', 'reims', 'rennes', 'reykjavik', 'roma', 'salzburg', 'sevilla', 'stirling', 'stockholm', 'strasbourg', 'swansea', 'tampere', 'toledo', 'torino', 'toulouse', 'trieste', 'tromso', 'trondheim', 'turku', 'uppsala', 'utrecht', 'venezia', 'verona', 'warszawa', 'whitby', 'wien', 'york']);
const aImage = id => BLASONS_ILLUSTRES.has(id);
function blason(c, cls){
  if (c && aImage(c.id)) return `<img class="blz img ${cls || ''}" src="${IMAGES}blasons/${c.id}.webp" alt="" aria-hidden="true" decoding="async" draggable="false">`;
  return blasonDessin(c, cls);
}
function blasonDessin(c, cls){
  const r = rng('blason' + c.id), [c1, c2] = c.couleurs || ['#445', '#ddd'];
  const forme = pondere(r, [['ecu', 5], ['ancien', 2], ['rond', 2], ['pointe', 1.4]]);
  const part = pondere(r, [['plein', 2], ['parti', 1.4], ['coupe', 1], ['chevron', 1.6], ['bande', 1.4], ['pal', 1], ['rayures', 1], ['ecartele', 0.8]]);
  const ombre = ton(c1, 0.2), emb = lisible(c1, c2), id = uid();
  const bord = contraste(c1, c2) >= 1.6 ? c2 : ton(c1, 0.45);
  const icone = EMB[emblemeDe(c.id)](emb);
  return `<svg class="blz ${cls || ''}" viewBox="0 0 40 44" aria-hidden="true"><defs><clipPath id="${id}"><path d="${FORMES[forme]}"/></clipPath></defs>
    <path d="${FORMES[forme]}" fill="${c1}"/><g clip-path="url(#${id})">${PARTITIONS[part](ombre)}<path d="M0 0h40v14C26 10 14 12 0 20z" fill="#fff" opacity=".1"/></g>
    <path d="${FORMES[forme]}" fill="none" stroke="${bord}" stroke-width="2.2"/><path d="${FORMES[forme]}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width=".6"/>
    <g transform="translate(8.6 ${forme === 'rond' ? 9.6 : forme === 'pointe' ? 7.2 : 8.4}) scale(.95)">${icone}</g></svg>`;
}

/* ---------- maillot ---------- */
const MAILLOT = 'M13.4 3.6L5.4 7.2 1.6 16.4l5.8 2.4 2.2-3.8V38h20.8V15l2.2 3.8 5.8-2.4-3.8-9.2-8-3.6c-1 2.8-3.6 4.2-6.6 4.2s-5.6-1.4-6.6-4.2z';
const MOTIFS = {
  uni:() => '',
  rayures:(t) => [10.6, 16.6, 22.6, 28.6].map(x => `<rect x="${x}" y="0" width="3" height="40" fill="${t}"/>`).join(''),
  cerceaux:(t) => [14, 22, 30].map(y => `<rect x="0" y="${y}" width="40" height="4" fill="${t}"/>`).join(''),
  chevron:(t) => `<path d="M0 12l20 9 20-9v6l-20 9-20-9z" fill="${t}"/>`,
  echarpe:(t) => `<path d="M6 4l6-2 24 34-6 3z" fill="${t}"/>`,
  moitie:(t) => `<rect x="20" y="0" width="20" height="40" fill="${t}"/>`,
  manches:(t) => `<path d="M0 0h10v40H0zM30 0h10v40H30z" fill="${t}"/>`,
  epaules:(t) => `<path d="M0 0h40v12C30 9 10 9 0 12z" fill="${t}"/>`,
};
/* v99 : maillots illustrés (images/qm27/maillots/<id>-d|e.webp, recolorés aux couleurs de chaque club et nation) */
const aMaillot = id => !!(D() && id && (D().CLUBS.some(x => x[0] === id) || !!D().NATIONS[id]));
function maillot(c, num, cls, sponsor){   // v88 : nom du sponsor sur la poitrine
  if (c && aMaillot(c.id) && !c.dessin){
    const sp = sponsor ? sponsor.split(' ')[0].toUpperCase().replace(/[<&>]/g, '') : '', aNum = num !== undefined && num !== null && num !== '';
    return `<svg class="mt img ${cls || ''}" viewBox="0 0 40 40" aria-hidden="true"><image href="${IMAGES}maillots/${c.id}-${c.ext ? 'e' : 'd'}.webp" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>
      ${sp ? `<rect x="12.4" y="13.2" width="15.2" height="5" rx="1.1" fill="#ffffff" opacity=".93"/><text x="20" y="17" text-anchor="middle" font-size="${Math.min(3.4, 24 / Math.max(6, sp.length + 1))}" font-weight="800" font-family="system-ui,-apple-system,sans-serif" fill="#16202c">${sp}</text>` : ''}
      ${aNum ? `<text x="20" y="${sp ? 28.4 : 26.4}" text-anchor="middle" font-size="${String(num).length > 1 ? 12 : 13}" font-weight="900" font-family="system-ui,-apple-system,sans-serif" fill="#ffffff" stroke="#14181f" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke">${num}</text>` : ''}</svg>`;
  }
  const r = rng('maillot' + c.id), [c1, c2] = c.couleurs || ['#445', '#ddd'];
  const motif = c.motif || pondere(r, [['uni', 2.2], ['rayures', 1.2], ['cerceaux', 1], ['chevron', 1.2], ['echarpe', 1], ['moitie', 0.7], ['manches', 1], ['epaules', 1]]);
  const t = contraste(c1, c2) >= 1.4 ? c2 : ton(c1, 0.35), id = uid();
  const cn = motif === 'uni' || motif === 'epaules' || motif === 'manches' ? lisible(c1, c2) : (lum(c1) > 0.55 ? '#16202c' : '#ffffff');
  return `<svg class="mt ${cls || ''}" viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="${id}"><path d="${MAILLOT}"/></clipPath></defs>
    <path d="${MAILLOT}" fill="${c1}"/><g clip-path="url(#${id})">${MOTIFS[motif](t)}<path d="M0 0h20v40H0z" fill="#fff" opacity=".07"/></g>
    <path d="M13.4 3.6c1 2.8 3.6 4.2 6.6 4.2s5.6-1.4 6.6-4.2" fill="none" stroke="${t}" stroke-width="1.8"/>
    <path d="${MAILLOT}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8" stroke-linejoin="round"/>
    ${sponsor ? `<rect x="11.4" y="15.4" width="17.2" height="5.4" rx="1.2" fill="#ffffff" opacity=".92"/><text x="20" y="19.5" text-anchor="middle" font-size="${Math.min(3.6, 26 / Math.max(6, sponsor.split(' ')[0].length + 1))}" font-weight="800" font-family="system-ui,-apple-system,sans-serif" fill="#16202c">${sponsor.split(' ')[0].toUpperCase().replace(/[<&>]/g, '')}</text>` : ''}
    ${num !== undefined && num !== null && num !== '' ? `<text x="20" y="28.6" text-anchor="middle" font-size="${String(num).length > 1 ? 12 : 13}" font-weight="800" font-family="system-ui,-apple-system,sans-serif" fill="${cn}" stroke="${melange(lum(cn) > 0.5 ? c1 : '#ffffff', lum(cn) > 0.5 ? '#000000' : '#ffffff', 0.5)}" stroke-width="${motif === 'uni' || motif === 'epaules' ? 0.8 : 2.4}" stroke-linejoin="round" paint-order="stroke">${num}</text>` : ''}</svg>`;
}

/* ---------- avatar ---------- */
const PEAUX = [['#f7dccb', 26], ['#efc4a4', 28], ['#dca57f', 18], ['#bf8357', 12], ['#93603e', 9], ['#61402b', 7]];
const CHEVEUX = ['#1e1b19', '#3b2a20', '#5b3c27', '#8a5a35', '#c9a161', '#e3c98f', '#a8482a'];
function feminin(p){
  if (p.f !== undefined) return !!p.f;
  const N = D() && D().NOMS[p.nat]; if (!N) return hash(p.p || p.id) % 2 === 0;
  if (N.f) return N.f.includes(p.p);   // v105 : listes séparées (h, f)
  const i = N.p.indexOf(p.p); return i >= N.p.length / 2;
}
/* v99 : portraits illustrés (images/qm27/visages/) ; le dessin en code reste pour l'apparence personnalisée du manager */
const VISAGES = {h1:16, h2:16, h3:13, hs:12, f1:25, f2:13, fs:12};
function groupesVisage(p){
  const f = feminin(p), age = p.age || 30;
  if (!p.poste) return f ? ['fs', 'f2'] : ['hs', 'h3'];   // staff, président, manager : visages d'adultes
  if (f) return [age <= 24 ? 'f1' : 'f2'];
  return [age <= 22 ? 'h1' : age <= 30 ? 'h2' : 'h3'];
}
function visageDe(p){
  const L = p.look || {};
  if (L.visage) return L.visage;
  if (L.mode === 'dessin' || (!L.mode && (L.peau || L.cheveux || L.coupe))) return null;
  return candidatsVisage(p)[0];
}
/* chaque visage existe aussi en miroir (suffixe « m ») : deux fois plus de variété */
function candidatsVisage(p){
  const gs = groupesVisage(p), L = gs.flatMap(g => Array.from({length:VISAGES[g] * 2}, (_, i) => g + '-' + (i % VISAGES[g]) + (i >= VISAGES[g] ? 'm' : '')));
  const k = hash('visage' + (p.id || '') + (p.p || '') + (p.n || '')) % L.length;
  return Array.from({length:L.length}, (_, i) => L[(k + i) % L.length]);
}
/* pas deux joueurs du même effectif avec le même visage */
function attribuerVisages(liste){
  const pris = new Set(), res = {};
  for (const p of liste.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))){
    const L = p.look || {}; if (L.visage || L.mode === 'dessin'){ continue; }
    const v = candidatsVisage(p).find(x => !pris.has(x.replace(/m$/, '')) ) || candidatsVisage(p)[0];
    pris.add(v.replace(/m$/, '')); res[p.id] = v;
  }
  return res;
}
function avatar(p, cls, opt){
  opt = opt || {};
  const vis = !opt.dessin && (opt.visage || visageDe(p));
  if (vis) return `<img class="av ${cls || ''} av-img${vis.endsWith('m') ? ' av-mir' : ''}" src="${IMAGES}visages/${vis.replace(/m$/, '')}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">`;
  const r = rng('avatar' + (p.id || '') + (p.p || '') + (p.n || '')), f = feminin(p), age = p.age || 30;
  let peau = pondere(r, PEAUX); const fonce = lum(peau) < 0.3;
  let ch = fonce ? choix(r, CHEVEUX.slice(0, 3)) : pondere(r, [[CHEVEUX[0], 3], [CHEVEUX[1], 4], [CHEVEUX[2], 4], [CHEVEUX[3], 3], [CHEVEUX[4], 2], [CHEVEUX[5], 1.2], [CHEVEUX[6], 1.2]]);
  if (age >= 34 && r() < (age - 30) / 14) ch = r() < 0.5 ? '#9b9b9b' : '#cfcfcf';
  let coupe = f ? pondere(r, [['long', 3], ['queue', 2.4], ['chignon', 1.6], ['carre', 2], ['boucle', 1.6], ['court', 1]])
                  : pondere(r, [['court', 4], ['rase', 2], ['frange', 2], ['boucle', 1.4], ['crete', 0.4], ['long', 0.5], ['chauve', age >= 31 ? 1.4 : 0.15]]);
  let barbe = !f && r() < 0.32 ? choix(r, ['barbe', 'bouc', 'moustache', 'courte']) : null;
  let lunettes = r() < 0.12, taches = !fonce && r() < 0.12, sourire = r();
  /* v91 : apparence choisie (profil du manager) : peau, cheveux, coupe, barbe, lunettes, chapeau, sourire */
  const L = p.look || {};
  if (L.peau) peau = L.peau; if (L.cheveux) ch = L.cheveux; if (L.coupe) coupe = L.coupe; if (L.barbe !== undefined) barbe = L.barbe || null;
  if (L.lunettes !== undefined) lunettes = !!L.lunettes; if (L.sourire !== undefined) sourire = L.sourire;
  const [k1, k2] = opt.couleurs || ['#5a6a80', '#e6e9ee'];
  const ombreP = () => melange(peau, '#000000', 0.16);
  const fond = opt.fond || melange(k1, '#ffffff', 0.72), ombrePeau = ombreP(), id = uid();
  const yeuxY = 18.6, ox = r() * 0.6 - 0.3;
  const cheveuxDerriere = {long:`<path d="M10.6 16c-.6 7 0 13 1.8 18h15.2c1.8-5 2.4-11 1.8-18z" fill="${ch}"/>`, carre:`<path d="M11 16c-.4 4.4 0 8 1 10.6h16c1-2.6 1.4-6.2 1-10.6z" fill="${ch}"/>`,
    queue:`<path d="M27.4 13.6c3.4 1.6 4.4 6.4 3 11.2-1-2.8-2.4-4.6-4-5.6z" fill="${ch}"/>`, chignon:`<circle cx="20" cy="6.2" r="3.6" fill="${ch}"/>`}[coupe] || '';
  const dessus = {
    court:`<path d="M11.8 18.2c-.8-6.6 2.6-11 8.2-11s9 4.4 8.2 11c-.8-2.6-2.4-4.6-5-5.4-2.6 1.4-6.4 1.8-9.4.6-1 1.2-1.6 2.8-2 4.8z" fill="${ch}"/>`,
    rase:`<path d="M12 16.6c0-5.6 3.4-9 8-9s8 3.4 8 9c-1.4-3-4.4-4.6-8-4.6s-6.6 1.6-8 4.6z" fill="${ch}" opacity=".75"/>`,
    frange:`<path d="M11.6 19c-1-7 2.6-11.6 8.4-11.6S29.4 12 28.4 19c-.6-2.4-1.6-4.2-3-5.4-.6 1.4-1.8 2.2-3.4 2.4l.4-2c-1.4 1.2-3.4 1.8-6 1.8l.6-1.8c-1.4 1-2.6 1.6-4 2-.6 1-1 2-1.4 3z" fill="${ch}"/>`,
    boucle:[[13, 12.4, 3.4], [17, 9.6, 3.6], [21.6, 9, 3.8], [25.8, 11, 3.4], [27.8, 14.6, 2.6], [12.2, 15.8, 2.4]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${ch}"/>`).join(''),
    crete:`<path d="M17.6 13.4c0-4 1-6.6 2.4-8 1.4 1.4 2.4 4 2.4 8z" fill="${ch}"/><path d="M12 16.6c0-5.6 3.4-9 8-9s8 3.4 8 9c-1.4-3-4.4-4.6-8-4.6s-6.6 1.6-8 4.6z" fill="${ch}" opacity=".35"/>`,
    long:`<path d="M11.2 20c-1.2-7.6 2.6-12.6 8.8-12.6s10 5 8.8 12.6c-1-3.8-3.2-6.2-6-7.2-2.2 1.6-5.4 2.4-8.6 2-1.4 1.4-2.4 3-3 5.2z" fill="${ch}"/>`,
    carre:`<path d="M11.2 20.4c-1.2-7.8 2.6-13 8.8-13s10 5.2 8.8 13c-.8-3.4-2-6-3.8-7.6-3 .8-7 .8-10.2 0-1.8 1.6-3 4.2-3.6 7.6z" fill="${ch}"/>`,
    queue:`<path d="M11.8 18.4c-.8-6.8 2.6-11.2 8.2-11.2s9 4.4 8.2 11.2c-.8-3.2-2.6-5.4-5.4-6.2-2.4 1-6 1.2-8.8.4-1.2 1.4-1.8 3.4-2.2 5.8z" fill="${ch}"/>`,
    chignon:`<path d="M11.8 18.4c-.8-6.8 2.6-11.2 8.2-11.2s9 4.4 8.2 11.2c-1.2-4-3.6-6.4-8.2-6.4s-7 2.4-8.2 6.4z" fill="${ch}"/>`,
    chauve:`<path d="M11.8 19.4c-.6-2.6-.2-4.6.6-6 .4 1.6.8 2.8 1.2 3.8M28.2 19.4c.6-2.6.2-4.6-.6-6-.4 1.6-.8 2.8-1.2 3.8" stroke="${ch}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  }[coupe] || '';
  const sourc = sourire < 0.5 ? `<path d="M17.4 24.6c1.6 1.2 3.6 1.2 5.2 0" stroke="#5b2f22" stroke-width="1" fill="none" stroke-linecap="round"/>`
    : sourire < 0.8 ? `<path d="M17.8 24.8h4.4" stroke="#5b2f22" stroke-width="1" stroke-linecap="round"/>`
    : `<path d="M17 24.2c1.8 2 4.2 2 6 0z" fill="#fff" stroke="#5b2f22" stroke-width=".8" stroke-linejoin="round"/>`;
  const barbes = {barbe:`<path d="M12.4 20.6c0 5.4 3.4 9.2 7.6 9.2s7.6-3.8 7.6-9.2c-.6 2-1.6 3.2-3 3.6-1.4-1-3-1.4-4.6-1.4s-3.2.4-4.6 1.4c-1.4-.4-2.4-1.6-3-3.6z" fill="${ch}"/>`,
    bouc:`<path d="M17.6 26.4c.6 1.8 1.4 2.8 2.4 2.8s1.8-1 2.4-2.8c-1.4.4-3.4.4-4.8 0z" fill="${ch}"/><path d="M17.4 23.4c1.6-.8 3.6-.8 5.2 0" stroke="${ch}" stroke-width="1.1" fill="none"/>`,
    moustache:`<path d="M16.6 23.6c1.4-1.4 2.6-1.2 3.4-.4.8-.8 2-1 3.4.4-1.4.2-2.4 0-3.4-.4-1 .4-2 .6-3.4.4z" fill="${ch}"/>`,
    courte:`<path d="M12.6 21c.4 5 3.4 8.4 7.4 8.4s7-3.4 7.4-8.4c-1.6 2.6-3.6 3.6-7.4 3.6S14.2 23.6 12.6 21z" fill="${ch}" opacity=".45"/>`}[barbe] || '';
  return `<svg class="av ${cls || ''}" viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="20" cy="20" r="20"/></clipPath></defs>
    <g clip-path="url(#${id})"><rect width="40" height="40" fill="${fond}"/>${cheveuxDerriere}
    <path d="M4 40c.6-6.4 5.4-9.6 11-10.6h10c5.6 1 10.4 4.2 11 10.6z" fill="${k1}"/><path d="M15.4 29.4c1.2 2.2 2.8 3.2 4.6 3.2s3.4-1 4.6-3.2" fill="none" stroke="${k2}" stroke-width="1.6"/>
    <path d="M16.6 25.4h6.8v4.6c-1 1.4-2.2 2-3.4 2s-2.4-.6-3.4-2z" fill="${ombrePeau}"/>
    <ellipse cx="11.6" cy="19.6" rx="1.6" ry="2.4" fill="${peau}"/><ellipse cx="28.4" cy="19.6" rx="1.6" ry="2.4" fill="${peau}"/>
    <path d="M20 8.4c4.6 0 8.2 3.6 8.2 9.4 0 6.2-3.6 10.6-8.2 10.6s-8.2-4.4-8.2-10.6c0-5.8 3.6-9.4 8.2-9.4z" fill="${peau}"/>
    ${barbes}${dessus}
    <path d="M${15.2 + ox} 16.6c.9-.5 2-.6 2.9-.3M${21.9 + ox} 16.3c.9-.3 2-.2 2.9.3" stroke="${melange(ch, '#000000', 0.2)}" stroke-width="${f ? 0.8 : 1.1}" stroke-linecap="round" fill="none"/>
    <ellipse cx="${16.6 + ox}" cy="${yeuxY}" rx=".95" ry="1.1" fill="#1e1a18"/><ellipse cx="${23.4 + ox}" cy="${yeuxY}" rx=".95" ry="1.1" fill="#1e1a18"/>
    <path d="M20 19.4l-.9 3.2c.6.3 1.2.3 1.8 0" stroke="${ombrePeau}" stroke-width=".9" fill="none" stroke-linecap="round"/>
    ${taches ? `<g fill="${melange(peau, '#8a4b2a', 0.45)}"><circle cx="15" cy="21.6" r=".35"/><circle cx="16.4" cy="22.2" r=".3"/><circle cx="23.8" cy="22.2" r=".3"/><circle cx="25" cy="21.6" r=".35"/><circle cx="15.8" cy="21" r=".28"/><circle cx="24.4" cy="21" r=".28"/></g>` : ''}
    ${sourc}
    ${lunettes ? `<g fill="none" stroke="#2b2b2b" stroke-width=".9"><circle cx="${16.6 + ox}" cy="${yeuxY}" r="2.5"/><circle cx="${23.4 + ox}" cy="${yeuxY}" r="2.5"/><path d="M${19.1 + ox} ${yeuxY}h1.8M${14.1 + ox} ${yeuxY - 0.4}l-2.2-.6M${25.9 + ox} ${yeuxY - 0.4}l2.2-.6"/></g>` : ''}
    ${age >= 32 ? `<path d="M14.6 21.2c.6.4 1.2.5 1.8.4M25.4 21.2c-.6.4-1.2.5-1.8.4" stroke="${ombrePeau}" stroke-width=".6" fill="none"/>` : ''}
    ${L.chapeau ? `<path d="M7.6 12.4c3.4-1.6 21.4-1.6 24.8 0-2.8 1.4-21.6 1.4-24.8 0z" fill="${L.chapeau}"/><path d="M12.6 11.6c1.6-3.6 3.6-7.6 9.2-9.6-1 1.6-1 3 .2 4.2 1.4 1.4 2.4 3.2 3.4 5.4-4.2.8-8.6.8-12.8 0z" fill="${L.chapeau}"/><path d="M12.8 11.2c4.2.7 8.6.7 12.6 0" stroke="#d9b54a" stroke-width="1.1" fill="none"/>` : ''}
    </g></svg>`;
}

/* ---------- v91 : emblèmes des six nations (remplacent les drapeaux emoji, mal affichés sur Windows et une partie des Android) ---------- */
const lauriers = () => { let o = '';
  for (const cote of [1, -1]) for (let k = 0; k < 6; k++){
    const t = (250 - k * 24) * Math.PI / 180, R = 7.4, x0 = 12 + R * Math.cos(t), y = 12 - R * Math.sin(t), x = cote > 0 ? x0 : 24 - x0;
    const ang = Math.atan2(-Math.cos(t), -Math.sin(t) * cote) * 180 / Math.PI;
    for (const d of [1.25, -1.25]){ const xx = x + Math.cos(t) * d * cote, yy = y - Math.sin(t) * d; o += `<ellipse cx="${xx.toFixed(2)}" cy="${yy.toFixed(2)}" rx="1.7" ry=".75" transform="rotate(${(ang + (d > 0 ? 28 : -28) * cote).toFixed(1)} ${xx.toFixed(2)} ${yy.toFixed(2)})"/>`; }
  }
  return o + '<path d="M9.4 19C5 16.6 3.6 10.4 7.3 5.6M14.6 19c4.4-2.4 5.8-8.6 2.1-13.4" stroke="#008c45" stroke-width=".9" fill="none"/>'; };
/* v92 : écussons sans clipPath (affichage fiable partout) : anneau aux couleurs du drapeau, disque crème, symbole au centre */
const rose = () => { let o = ''; for (let k = 0; k < 5; k++){ const a = (-90 + 72 * k + 36) * Math.PI / 180; o += `<path d="M12 12l${(Math.cos(a) * 7.2).toFixed(2)} ${(Math.sin(a) * 7.2).toFixed(2)}" stroke="#2e7d32" stroke-width="1.6" stroke-linecap="round"/>`; }
  for (let k = 0; k < 5; k++){ const a = (-90 + 72 * k) * Math.PI / 180; o += `<circle cx="${(12 + Math.cos(a) * 3.4).toFixed(2)}" cy="${(12 + Math.sin(a) * 3.4).toFixed(2)}" r="3.2" fill="#c8102e"/>`; }
  for (let k = 0; k < 5; k++){ const a = (-54 + 72 * k) * Math.PI / 180; o += `<circle cx="${(12 + Math.cos(a) * 1.7).toFixed(2)}" cy="${(12 + Math.sin(a) * 1.7).toFixed(2)}" r="1.75" fill="#fff"/>`; }
  return o + '<circle cx="12" cy="12" r="1.2" fill="#e8b83c"/>'; };
const EMBL = {
  ENG:{anneau:['#c8102e'], nom:'la rose', svg:rose()},
  FRA:{anneau:['#1d3f8f', '#ffffff', '#e1251b'], nom:'le coq', svg:`<g transform="translate(12 12.4) scale(.8) translate(-12.6 -12.6)"><path d="M8.2 13.4C6.2 12 5.3 9.6 5.8 7.2M9 12.8c-1-1.9-1-4 .1-5.8M10.1 12.4c-.3-1.7.3-3.3 1.4-4.3" stroke="#1d3f8f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="12.2" cy="14.4" rx="4.9" ry="3.7" fill="#1d3f8f"/><path d="M13.6 12.6l1.4-3.6 3 .6-1.2 4.2z" fill="#1d3f8f"/><circle cx="16.6" cy="9" r="2.1" fill="#1d3f8f"/>
    <path d="M15 7.4c.3-1 .9-1.4 1.3-.8.4-.9 1.2-.9 1.5-.1.6-.4 1.2 0 1 .8z" fill="#e1251b"/><path d="M18.5 8.6l1.9.5-1.9.6z" fill="#e8b83c"/><circle cx="18" cy="10.5" r=".65" fill="#e1251b"/><circle cx="17" cy="8.7" r=".38" fill="#fff"/>
    <path d="M11 17.8v2.6M13.6 17.8v2.6" stroke="#e8b83c" stroke-width="1.3" stroke-linecap="round"/></g>`},
  IRL:{anneau:['#169b62', '#ffffff', '#ff883e'], nom:'le trèfle', svg:`<g transform="translate(12 12) scale(.82) translate(-12 -12.4)"><path d="M12 12.4c0 3 .7 5.4 2.2 7.6" stroke="#169b62" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="7.9" r="3" fill="#169b62"/><circle cx="8.4" cy="12.2" r="3" fill="#169b62"/><circle cx="15.6" cy="12.2" r="3" fill="#169b62"/><circle cx="12" cy="11.2" r="2" fill="#169b62"/></g>`},
  SCO:{anneau:['#0065bd'], nom:'le chardon', svg:`<g transform="translate(12 12) scale(.82) translate(-12 -12.4)"><path d="M12 14v6.2" stroke="#2e7d32" stroke-width="1.6" stroke-linecap="round"/><path d="M12 17.6c-1.4-.4-2.6-1.4-3.2-2.8l1.4.3-.4-1.4 1.4.8M12 16.8c1.4-.4 2.6-1.4 3.2-2.8l-1.4.3.4-1.4-1.4.8" stroke="#2e7d32" stroke-width="1.1" fill="none" stroke-linejoin="round"/>
    <path d="M8.4 9.6 8.8 4.6l1.4 2.6.6-3.6 1.2 3.4 1.2-3.4.6 3.6 1.4-2.6.4 5z" fill="#7b3fa0"/><ellipse cx="12" cy="11.6" rx="3.6" ry="2.8" fill="#3f9142"/><path d="M9.4 10.4l5.2 2.6M14.6 10.4l-5.2 2.6" stroke="#2a6a2d" stroke-width=".7"/></g>`},
  WAL:{anneau:['#ffffff', '#00a651'], nom:'le dragon rouge', bas:'#00a651', svg:`<g transform="translate(12 12) scale(.8) translate(-12.6 -11.6)"><g fill="#d21f2b"><path d="M11 11.6 12.2 4.4l1.7 2.6 1.6-3.2 1.1 3.6 2.1-1.8-.9 6z"/><ellipse cx="13.8" cy="12.8" rx="4.8" ry="2.3"/>
    <path d="M10 12.4 7.4 9.4l-2.2.1-1.6-.9.6 1.5-.9 1.1h2.2l1.6.4 2.6 2.6z"/><path d="M19.4 8.2l1.9.5-.9 1.7z"/></g>
    <path d="M18.2 13.4c1.8.7 3.1.2 3.5-1.4.3-1.2-.4-2.2-1.4-2.4M10.8 14.6l-1 2.4h1.6M15.8 14.8l.8 2.4h-1.6" stroke="#d21f2b" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.9" cy="9.9" r=".5" fill="#fff"/></g>`},
  ITA:{anneau:['#008c45', '#ffffff', '#cd212a'], nom:'la couronne de laurier', svg:`<g transform="translate(12 12) scale(.8) translate(-12 -12)"><g fill="#008c45">${lauriers()}</g><path d="M10.2 19.6l1.8-1.4 1.8 1.4M10.6 20.6l1.4-1.2 1.4 1.2" stroke="#cd212a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M12 7.4l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z" fill="#e8b83c"/></g>`},
};
/* v106 : nouvelles nations, un symbole du jeu dans l'anneau aux couleurs du drapeau (v109 : remplacé par les emblèmes illustrés ; gardé pour embleme(n, 'dessin')) */
const symb = (k, C) => `<g transform="translate(12 12) scale(.62) translate(-12 -12)">${EMB[k](C)}</g>`;
Object.assign(EMBL, {
  ESP:{anneau:['#c60b1e', '#ffc400', '#c60b1e'], nom:'la flamme', svg:symb('flamme', '#c60b1e')},
  DEN:{anneau:['#c8102e', '#ffffff'], nom:"l'étoile", svg:symb('etoile', '#c8102e')},
  SWE:{anneau:['#006aa7', '#fecc00'], nom:"l'étincelle", svg:symb('etincelle', '#d9a400')},
  NOR:{anneau:['#ba0c2f', '#ffffff', '#00205b'], nom:'la lune', svg:symb('lune', '#00205b')},
  FIN:{anneau:['#ffffff', '#002f6c'], nom:'le hibou', svg:symb('hibou', '#002f6c')},
  ISL:{anneau:['#02529c', '#ffffff', '#dc1e35'], nom:'la comète', svg:symb('comete', '#02529c')},
  GER:{anneau:['#1a1a1a', '#dd0000', '#ffce00'], nom:"l'aile", svg:symb('aile', '#1a1a1a')},
  NED:{anneau:['#ae1c28', '#ffffff', '#21468b'], nom:'la feuille', svg:symb('feuille', '#ff7f00')},
  BEL:{anneau:['#1a1a1a', '#fdda24', '#e30613'], nom:'le masque', svg:symb('masque', '#1a1a1a')},
  LUX:{anneau:['#ef3340', '#ffffff', '#00a1de'], nom:'la mélusine', svg:symb('serpent', '#00a1de')},
  POL:{anneau:['#ffffff', '#dc143c'], nom:"l'oiseau blanc", svg:symb('oiseau', '#dc143c')},
  AUT:{anneau:['#ed2939', '#ffffff', '#ed2939'], nom:'la boule de cristal', svg:symb('boule', '#ed2939')},
  CZE:{anneau:['#ffffff', '#d7141a', '#11457e'], nom:'la licorne', svg:symb('licorne', '#11457e')},
});
function anneauDe(L){
  const r = 10.3, C = 2 * Math.PI * r, n = L.length, seg = C / n;
  return L.map((c, i) => `<circle cx="12" cy="12" r="${r}" fill="none" stroke="${c}" stroke-width="2.6" stroke-dasharray="${(seg + (n > 1 ? 0.05 : 0)).toFixed(3)} ${(C - seg).toFixed(3)}" stroke-dashoffset="${(-seg * i).toFixed(3)}" transform="rotate(-90 12 12)"/>`).join('');
}
function embleme(n, cls){
  const e = EMBL[n]; if (!e) return '';
  if (!(cls || '').includes('dessin') && D().NATIONS[n]) return `<img class="emb img ${cls || ''}" src="${IMAGES}emblemes/${n}.webp" width="24" height="24" alt="${D().NATIONS[n] ? D().NATIONS[n].nom : n} (${e.nom})" decoding="async" draggable="false">`;   // v99 : emblème illustré
  return `<svg class="emb ${cls || ''}" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="${D().NATIONS[n] ? D().NATIONS[n].nom : n} (${e.nom})">
    <circle cx="12" cy="12" r="9" fill="#fbf8f0"/>${e.bas ? `<path d="M3 12.6a9 9 0 0 0 18 0z" fill="${e.bas}" opacity=".9"/>` : ''}${anneauDe(e.anneau)}
    <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".7"/><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(0,0,0,.14)" stroke-width=".5"/>${e.svg}</svg>`;
}

/* ---------- radar ---------- */
/* axes : [[libellé, valeur sur 20], …] ; couleur du poste */
function radar(axes, couleur, cls){
  const n = axes.length, cx = 60, cy = 60, R = 42;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const anneaux = [0.25, 0.5, 0.75, 1].map(k => `<polygon points="${axes.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="${k === 1 ? 1 : 0.7}"/>`).join('');
  const rayons = axes.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="var(--line)" stroke-width=".7"/>`).join('');
  const poly = axes.map(([, v], i) => pt(i, Math.max(0.06, Math.min(1, v / 20))).map(x => x.toFixed(1)).join(',')).join(' ');
  const lab = axes.map(([l, v], i) => { const [x, y] = pt(i, 1.16), ta = Math.abs(x - cx) < 4 ? 'middle' : x < cx ? 'end' : 'start';
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${ta}" font-size="10.5" fill="var(--ink-soft)">${l} <tspan font-weight="800" fill="var(--ink)">${Math.round(v)}</tspan></text>`; }).join('');
  return `<svg class="radar ${cls || ''}" viewBox="-34 -2 188 124" role="img" aria-label="Profil : ${axes.map(([l, v]) => l + ' ' + Math.round(v)).join(', ')}">${anneaux}${rayons}
    <polygon points="${poly}" fill="${couleur}" fill-opacity=".28" stroke="${couleur}" stroke-width="1.8" stroke-linejoin="round"/>${lab}</svg>`;
}

/* ---------- v88 : bâtiments du domaine (64 × 64, sol vers y = 58) ---------- */
const PIERRE = '#c9c2b4', PIERRE2 = '#a69d8c', BOIS = '#9a6a3f', BOIS2 = '#7a5230', TRAIT = 'rgba(0,0,0,.35)', VITRE = '#ffe6a3';
const ombreSol = `<ellipse cx="32" cy="58.5" rx="24" ry="3.6" fill="rgba(0,0,0,.18)"/>`;
const fenetre = (x, y, w = 4, h = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${VITRE}" stroke="${TRAIT}" stroke-width=".6"/>`;
const fumee = (x, y) => `<g fill="rgba(200,200,210,.75)"><circle cx="${x}" cy="${y}" r="2"/><circle cx="${x + 2.5}" cy="${y - 3.5}" r="2.6"/><circle cx="${x + .5}" cy="${y - 7.5}" r="2.2"/></g>`;
const BAT_ICONES = {
  bureau:(c1, c2) => `${ombreSol}<rect x="18" y="20" width="28" height="38" fill="${PIERRE}" stroke="${TRAIT}"/><path d="M16 20h32v-5h-4v3h-4v-3h-4v3h-4v-3h-4v3h-4v-3h-4z" fill="${PIERRE2}" stroke="${TRAIT}"/>
    <path d="M28 58v-10a4 4 0 0 1 8 0v10z" fill="${BOIS2}"/>${fenetre(22, 28)}${fenetre(38, 28)}${fenetre(30, 30, 4, 6)}<path d="M32 15V3" stroke="#555" stroke-width="1"/><path d="M32 3h11l-3 3 3 3H32z" fill="${c1}" stroke="${TRAIT}" stroke-width=".5"/>`,
  infirmerie:(c1, c2) => `${ombreSol}<rect x="12" y="26" width="40" height="32" fill="#f3f1ec" stroke="${TRAIT}"/><path d="M8 28L32 12l24 16z" fill="#7fb69a" stroke="${TRAIT}"/>
    <circle cx="32" cy="38" r="6.4" fill="#fff" stroke="${TRAIT}" stroke-width=".6"/><path d="M30.6 33.6h2.8v2.2c2 .7 3.2 2.3 3.2 4.2 0 2.5-2 4-4.6 4s-4.6-1.5-4.6-4c0-1.9 1.2-3.5 3.2-4.2z" fill="#4caf7d"/>${fenetre(16, 32)}${fenetre(44, 32)}<rect x="29" y="47" width="6" height="11" fill="${BOIS2}"/>`,
  salle:(c1, c2) => `${ombreSol}<rect x="18" y="24" width="28" height="34" rx="2" fill="${PIERRE}" stroke="${TRAIT}"/><path d="M14 26L32 6l18 20z" fill="${c1}" stroke="${TRAIT}"/>
    <rect x="40" y="10" width="5" height="10" fill="${PIERRE2}" stroke="${TRAIT}" stroke-width=".6"/>${fumee(43, 7)}${fenetre(22, 32, 6, 7)}${fenetre(36, 32, 6, 7)}<path d="M28 58v-9a4 4 0 0 1 8 0v9z" fill="${BOIS2}"/>`,
  formation:(c1, c2) => `${ombreSol}<rect x="8" y="30" width="48" height="28" fill="#e8dcc4" stroke="${TRAIT}"/><path d="M6 31L18 16l12 15zM34 31l12-15 12 15z" fill="${c1}" stroke="${TRAIT}"/><path d="M26 31l6-8 6 8z" fill="${c1}" stroke="${TRAIT}"/>
    ${fenetre(12, 36)}${fenetre(20, 36)}${fenetre(40, 36)}${fenetre(48, 36)}<rect x="28" y="44" width="8" height="14" fill="${BOIS2}"/><path d="M18 16v-6M46 16v-6" stroke="#555" stroke-width=".8"/><path d="M18 10h6l-2 2 2 2h-6zM46 10h6l-2 2 2 2h-6z" fill="${c2}" stroke="${TRAIT}" stroke-width=".4"/>`,
  voliere:(c1, c2) => `${ombreSol}<path d="M24 58l2-40h12l2 40z" fill="${PIERRE}" stroke="${TRAIT}"/><path d="M21 19L32 2l11 17z" fill="${c1}" stroke="${TRAIT}"/>
    <circle cx="32" cy="26" r="2.4" fill="#3a3a3a"/><circle cx="32" cy="38" r="2.4" fill="#3a3a3a"/><path d="M28 58v-8h8v8z" fill="${BOIS2}"/><path d="M45 12l3 2 3-2M48 22l2.4 1.6 2.4-1.6M12 16l3 2 3-2" stroke="#3a3a3a" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  divination:(c1, c2) => `${ombreSol}<rect x="14" y="34" width="36" height="24" fill="${PIERRE}" stroke="${TRAIT}"/><path d="M12 35a20 20 0 0 1 40 0z" fill="#3d4f8f" stroke="${TRAIT}"/>
    <path d="M32 18l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#ffd86b"/><circle cx="24" cy="28" r=".9" fill="#ffd86b"/><circle cx="41" cy="27" r=".7" fill="#ffd86b"/><path d="M36 21l9-7" stroke="#555" stroke-width="2.2" stroke-linecap="round"/>${fenetre(20, 42)}${fenetre(40, 42)}<path d="M28 58v-8a4 4 0 0 1 8 0v8z" fill="${BOIS2}"/>`,
  aire:(c1, c2) => `<ellipse cx="32" cy="50" rx="28" ry="9" fill="#6fb36f" stroke="${TRAIT}" stroke-width=".6"/><path d="M8 50h48" stroke="rgba(255,255,255,.6)" stroke-width=".7"/>
    ${[[20, 22], [32, 16], [44, 22]].map(([x, y]) => `<path d="M${x} 50V${y + 5}" stroke="#777" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="${x === 32 ? 5 : 4}" fill="none" stroke="#e8b931" stroke-width="1.8"/>`).join('')}
    <path d="M50 30l6-3M51 34l5 .5" stroke="${c1}" stroke-width="1.6" stroke-linecap="round"/>`,
  trophees:(c1, c2) => `${ombreSol}<rect x="10" y="54" width="44" height="4" fill="${PIERRE2}" stroke="${TRAIT}" stroke-width=".6"/><rect x="12" y="30" width="40" height="24" fill="#efe9dc" stroke="${TRAIT}"/>
    ${[15, 23, 37, 45].map(x => `<rect x="${x}" y="31" width="4" height="23" fill="#fff" stroke="${TRAIT}" stroke-width=".5"/>`).join('')}<path d="M8 31L32 16l24 15z" fill="#d6b44a" stroke="${TRAIT}"/>
    <path d="M27 36h10v3a5 5 0 0 1-10 0zM31 44h2v4h3v2h-8v-2h3z" fill="#e2b23a" stroke="${TRAIT}" stroke-width=".5"/>`,
  residence:(c1, c2) => `${ombreSol}<rect x="6" y="30" width="52" height="28" fill="#eadfcf" stroke="${TRAIT}"/><path d="M4 31L14 18h36l10 13z" fill="${c1}" stroke="${TRAIT}"/>
    ${[10, 18, 26, 34, 42, 50].map(x => fenetre(x, 36, 4, 5)).join('')}${[10, 18, 42, 50].map(x => fenetre(x, 46, 4, 5)).join('')}<rect x="28" y="46" width="8" height="12" fill="${BOIS2}"/><rect x="44" y="12" width="4" height="8" fill="${PIERRE2}"/>`,
  buvettes:(c1, c2) => `${ombreSol}<rect x="12" y="28" width="38" height="30" fill="#f1e2c6" stroke="${TRAIT}"/><path d="M12 28h38M12 40h38M22 28v30M40 28v30" stroke="${BOIS}" stroke-width="1.4"/><path d="M8 29L31 12l23 17z" fill="#8c4a2f" stroke="${TRAIT}"/>
    <rect x="15" y="10" width="5" height="10" fill="${PIERRE2}"/>${fumee(17, 7)}<path d="M50 32h8M56 32v3" stroke="#555" stroke-width="1"/><rect x="52" y="35" width="8" height="7" rx="1.5" fill="${c1}" stroke="${TRAIT}" stroke-width=".5"/>
    <rect x="27" y="46" width="8" height="12" fill="${BOIS2}"/>${fenetre(15, 31, 5, 6)}${fenetre(42, 31, 5, 6)}`,
  boutique:(c1, c2) => `${ombreSol}<rect x="10" y="26" width="44" height="32" fill="#f6efe2" stroke="${TRAIT}"/><path d="M8 26h48l-3-8H11z" fill="#8c6b4f" stroke="${TRAIT}"/>
    <path d="M8 26h48v6c-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0z" fill="${c1}" stroke="${TRAIT}" stroke-width=".6"/>
    ${[14, 26, 38, 50].map(x => `<rect x="${x - 2}" y="26" width="4" height="6" fill="${c2}" opacity=".9"/>`).join('')}<rect x="14" y="38" width="14" height="12" fill="${VITRE}" stroke="${TRAIT}" stroke-width=".6"/><rect x="36" y="40" width="10" height="18" fill="${BOIS2}"/>`,
  hangar:(c1, c2) => `${ombreSol}<path d="M8 58V30a24 14 0 0 1 48 0v28z" fill="#b5835a" stroke="${TRAIT}"/><path d="M20 58V38h24v20z" fill="${BOIS2}" stroke="${TRAIT}" stroke-width=".6"/><path d="M20 38l24 20M44 38L20 58" stroke="${BOIS}" stroke-width="1.2"/>
    <path d="M50 58l6-20" stroke="#6b4a2a" stroke-width="1.4"/><path d="M48.5 58l3-6 3 2-2 4z" fill="#d9b05b"/><path d="M12 32h40" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`,
};
const BAT_IMG = {bureau:'lieux/direction', tribunes:'batiments/tribunes', boutique:'batiments/boutique', buvettes:'batiments/buvettes', formation:'batiments/formation', infirmerie:'batiments/infirmerie', aire:'batiments/aire',
  hangar:'batiments/hangar', salle:'batiments/salle', voliere:'batiments/voliere', divination:'batiments/divination', trophees:'batiments/trophees', residence:'batiments/residence'};
/* dans un <svg viewBox="0 0 64 64"> : l'illustration si elle existe, sinon le dessin */
function batiment(type, c1, c2){ return BAT_IMG[type] ? `<image href="${IMAGES}${BAT_IMG[type]}.webp" x="-2" y="-4" width="68" height="68" preserveAspectRatio="xMidYMax meet"/>` : batimentDessin(type, c1, c2); }
function batimentDessin(type, c1, c2){ return (BAT_ICONES[type] || BAT_ICONES.bureau)(c1 || '#5a6a80', c2 || '#e6e9ee'); }
/* v111 : trophées illustrés (images/qm27/trophees/) ; cle = ligue (bi, la, sc, ce ; fr et it : la coupe latine), eu, ln */
const COUPE = {bi:'bi', la:'la', fr:'la', it:'la', sc:'sc', ce:'ce', eu:'eu', ln:'ln', sx:'ln'};
const coupeImg = (cle, cls) => COUPE[cle] ? `<img class="${cls || 'tro'} img" src="${IMAGES}trophees/coupe-${COUPE[cle]}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
/* récompense d'un palmarès : [saison, code, ligue, quand] (pour « meilleur à son poste », quand = le poste) */
function prixImg(x, cls){
  const k = x[1], f = k === 'ch' ? 'coupe-' + (COUPE[x[2]] || 'la') : k === 'ld' ? 'coupe-eu' : k === 'ln' || k === 'sx' ? 'coupe-ln' : k === 'pa' ? 'prix-pa' + (x[3] || 'P') : 'prix-' + k;
  return `<img class="${cls || 'pr-ico'}" src="${IMAGES}trophees/${f}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" onerror="this.remove()">`;
}
/* v111 : produits du Bazar dessinés en rouge, bleu et jaune purs (images/qm27/bazar/), recolorés aux couleurs du club dans un canvas */
const PROD_CLES = {peluche:'', choco:'r', balai:'rb', fanion:'rb', edition:'rb'};   // clés recolorées (r rouge, b bleu, j jaune) ; défaut : les trois
const hexRgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, x => x + x); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const CACHE_PROD = new Map();
function couleursProduit(c){
  const [c1, c2] = (c && c.couleurs) || ['#445566', '#dddddd'], lum = x => { const [r, g, b] = hexRgb(x); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const c3 = Math.abs(lum(c1) - lum(c2)) > 0.25 ? c2 : lum(c1) < 0.5 ? '#f2efe6' : '#1d2533';
  return [c1, c2, c3];
}
function colorierProduit(img, cols, cles){
  const k = img.dataset.prod + '|' + cols.join(',') + '|' + cles; if (CACHE_PROD.has(k)){ img.src = CACHE_PROD.get(k); return; }
  try {
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data, C = cols.map(hexRgb);
    for (let i = 0; i < p.length; i += 4){
      if (p[i + 3] < 8) continue;
      const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), v = mx, s = mx ? (mx - mn) / mx : 0;
      if (s < 0.42 || v < 0.3) continue;
      let h = 0; const dd = mx - mn; if (dd){ h = mx === r ? ((gg - b) / dd) % 6 : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4; h *= 60; if (h < 0) h += 360; }
      const q = (h < 22 || h > 330) ? 0 : (h >= 200 && h <= 275) ? 1 : (h >= 38 && h < 72 && v > 0.55) ? 2 : -1;
      if (q < 0 || !cles.includes('rbj'[q])) continue;
      const o = Math.min(1.05, Math.max(0.5, v / 0.97)), c = C[q];
      p[i] = Math.min(255, c[0] * o); p[i + 1] = Math.min(255, c[1] * o); p[i + 2] = Math.min(255, c[2] * o);
    }
    g.putImageData(d, 0, 0); const url = cv.toDataURL('image/png'); CACHE_PROD.set(k, url); img.src = url;
  } catch (e){ /* image d'une autre origine ou canvas indisponible : on garde le modèle */ }
}
/* à appeler après l'affichage : recolore les <img data-prod> de la page selon le club */
function colorierProduits(racine, c){
  const cols = couleursProduit(c);
  (racine || document).querySelectorAll('img[data-prod]:not([data-fait])').forEach(img => {
    const cles = PROD_CLES[img.dataset.prod] ?? 'rbj'; img.dataset.fait = '1'; if (!cles) return;
    if (img.complete && img.naturalWidth) colorierProduit(img, cols, cles); else img.addEventListener('load', () => colorierProduit(img, cols, cles), {once:true});
  });
}
const produitImg = (id, cls) => `<img class="${cls || 'prod-img'}" data-prod="${id}" src="${IMAGES}bazar/${id}.webp" alt="" aria-hidden="true" decoding="async">`;
/* trophée (coupe) : variante selon le titre */
function trophee(k, titre){
  const r = rng('trophee' + k + titre), or = choix(r, ['#e2b23a', '#d9a62e', '#c9c9c9', '#e8c55a']), anse = r() < 0.5;
  return `<svg class="tro" viewBox="0 0 40 48" aria-hidden="true"><path d="M11 6h18v8a9 9 0 0 1-18 0z" fill="${or}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>
    ${anse ? `<path d="M11 8H6c0 5 2 8 6 9M29 8h5c0 5-2 8-6 9" fill="none" stroke="${or}" stroke-width="2"/>` : `<circle cx="20" cy="4" r="2.4" fill="${or}"/><path d="M14 5l-4-3M26 5l4-3" stroke="${or}" stroke-width="1.6" stroke-linecap="round"/>`}
    <rect x="18" y="22" width="4" height="10" fill="${or}"/><path d="M12 32h16l2 6H10z" fill="${melange(or, '#000000', 0.2)}"/><rect x="9" y="38" width="22" height="7" rx="1" fill="#4a3a2a"/><path d="M14 9c0 4 1 7 4 8" stroke="#fff" stroke-width="1.2" opacity=".55" fill="none"/></svg>`;
}

root.QMV = {BAT_IMG, coupeImg, prixImg, produitImg, colorierProduits, IMAGES, VISAGES, visageDe, attribuerVisages, blasonDessin, batimentDessin, embleme, EMBL, blason, maillot, avatar, radar, couleursNation, emblemeDe, feminin, EMB, EMBLEMES, lisible, melange, batiment, trophee};
})(typeof window !== 'undefined' ? window : globalThis);
