// mon-ecran-version: f98bb157
/* Mon Écran — thèmes de couleurs (v42), communs à toutes les pages.
   Chargé dans <head> juste après noyau.js : applique le thème et le mode choisis dans État avant l'affichage,
   écrit les couleurs du thème et le fond dégradé (calque fixe : sur iPhone, Safari ignore « background-attachment:fixed »
   et étirait le dégradé sur toute la hauteur des pages qui défilent).

   AJOUTER UN THÈME : une ligne dans THEMES ci-dessous, par exemple
     {id:'lagon', nom:'Lagon', d:'Turquoise et corail', c:['#0b3954', '#087e8b', '#bfd7ea', '#ff5a5f', '#c81d25']},
   « c » = 5 couleurs (celles d'une palette coolors.co conviennent : coller les codes de l'adresse) ; le clair et le sombre
   sont calculés à partir d'elles. Options : accent (couleur des boutons), glyphe (pictogrammes des tuiles), et clair/sombre
   pour imposer des valeurs (noms des variables sans « -- »). L'identifiant ne doit plus changer ensuite (il est gardé sur
   les appareils). Un thème que le classeur ne connaît pas encore est proposé dans État ; le classeur sert à en masquer.
   Thème perso : créé dans État › Thème › « Créer mon thème », gardé sous « theme:perso » et partagé par la synchro.
   Logos de l'appli (v43) : LOGOS plus bas ; après l'ajout d'un thème, relancer outils/dev/icones.py (images de l'écran d'accueil). */
(function(){
const THEMES = [
  {id:'bleu', nom:"Bleu", d:"Le thème d'origine", c:["#e7ecef", "#a3cef1", "#6096ba", "#274c77", "#8b8c89"],
   clair:{'blob-1':'rgba(163,206,241,.95)', 'blob-2':'rgba(96,150,186,.68)', 'blob-3':'rgba(39,76,119,.48)', 'blob-4':'rgba(127,176,216,.6)'},
   sombre:{'blob-1':'rgba(39,86,140,.9)', 'blob-2':'rgba(96,150,186,.52)', 'blob-3':'rgba(163,206,241,.3)', 'blob-4':'rgba(27,54,86,.85)'}},
  {id:'gris', nom:"Gris", d:"Icônes noires", c:["#eef0f2", "#c6c7c4", "#a2999e", "#846a6a", "#353b3c"],
   clair:{'base':'#eef0f2', 'blob-1':'rgba(198,199,196,.85)', 'blob-2':'rgba(162,153,158,.62)', 'blob-3':'rgba(132,106,106,.46)', 'ink':'#1c1f20', 'ink-soft':'#5b5557', 'ink-faint':'#8f8a8c', 'glass':'rgba(255,255,255,.28)', 'glass-tint':'rgba(198,199,196,.12)', 'shadow':'0 14px 34px -16px rgba(53,59,60,.42)', 'head':'rgba(238,240,242,.74)', 'panel':'#eef0f2', 'card':'rgba(255,255,255,.62)', 'line':'rgba(53,59,60,.13)', 'accent':'#353b3c', 'on-accent':'#eef0f2', 'accent-soft':'rgba(53,59,60,.09)', 'sheet':'rgba(240,241,243,.95)', 'sheet-solid':'#f0f1f3', 'scrim':'rgba(28,31,32,.3)', 't-brick':'#c6c7c4', 't-slate':'#d8d9d6', 't-olive':'#a2999e', 't-plum':'#b8b0b4', 't-teal':'#cfd0cd', 't-ochre':'#c9b8b8', 't-char':'#9a9497', 't-rose':'#e3e4e2', 'glyph':'#111111', 'sport-accent':'#6b4f4f', 'blob-4':'rgba(214,200,196,.7)'},
   sombre:{'base':'#1b1e1f', 'blob-1':'rgba(60,66,67,.95)', 'blob-2':'rgba(132,106,106,.5)', 'blob-3':'rgba(162,153,158,.3)', 'ink':'#eef0f2', 'ink-soft':'#b5b0b2', 'ink-faint':'#8f8a8c', 'glass':'rgba(238,240,242,.07)', 'glass-tint':'rgba(198,199,196,.05)', 'rim-1':'rgba(238,240,242,.5)', 'rim-2':'rgba(238,240,242,.04)', 'rim-3':'rgba(198,199,196,.3)', 'spec':'rgba(238,240,242,.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(27,30,31,.7)', 'panel':'#1b1e1f', 'card':'rgba(238,240,242,.06)', 'line':'rgba(238,240,242,.1)', 'accent':'#c6c7c4', 'on-accent':'#1b1e1f', 'accent-soft':'rgba(198,199,196,.12)', 'sheet':'rgba(30,33,34,.95)', 'sheet-solid':'#1e2122', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(132,106,106,.32)'}},
  {id:'ardoise', nom:"Ardoise et corail", d:"Bleu nuit, touche orangée", c:["#2d3142", "#4f5d75", "#bfc0c0", "#ffffff", "#ef8354"],
   clair:{'base':'#f4f4f4', 'blob-1':'rgba(191,192,192,.8)', 'blob-2':'rgba(79,93,117,.5)', 'blob-3':'rgba(239,131,84,.45)', 'ink':'#2d3142', 'ink-soft':'#5d6273', 'ink-faint':'#8e93a0', 'glass':'rgba(255,255,255,.3)', 'glass-tint':'rgba(191,192,192,.12)', 'shadow':'0 14px 34px -16px rgba(45,49,66,.42)', 'head':'rgba(244,244,244,.76)', 'panel':'#f4f4f4', 'card':'rgba(255,255,255,.66)', 'line':'rgba(45,49,66,.12)', 'accent':'#2d3142', 'on-accent':'#ffffff', 'accent-soft':'rgba(45,49,66,.08)', 'sheet':'rgba(246,246,246,.95)', 'sheet-solid':'#f6f6f6', 'scrim':'rgba(45,49,66,.3)', 't-brick':'#e0703c', 't-slate':'#4f5d75', 't-olive':'#2d3142', 't-plum':'#3b4256', 't-teal':'#6b7891', 't-ochre':'#ef8354', 't-char':'#2d3142', 't-rose':'#8a96ab', 'glyph':'#ffffff', 'sport-accent':'#ef8354', 'blob-4':'rgba(239,131,84,.3)'},
   sombre:{'base':'#1f2230', 'blob-1':'rgba(52,58,82,.95)', 'blob-2':'rgba(79,93,117,.6)', 'blob-3':'rgba(239,131,84,.32)', 'ink':'#f4f4f4', 'ink-soft':'#bfc0c0', 'ink-faint':'#8e93a0', 'glass':'rgba(255,255,255,.07)', 'glass-tint':'rgba(191,192,192,.05)', 'rim-1':'rgba(255,255,255,.5)', 'rim-2':'rgba(255,255,255,.04)', 'rim-3':'rgba(239,131,84,.3)', 'spec':'rgba(255,255,255,.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(31,34,48,.72)', 'panel':'#1f2230', 'card':'rgba(255,255,255,.06)', 'line':'rgba(255,255,255,.1)', 'accent':'#ef8354', 'on-accent':'#1f2230', 'accent-soft':'rgba(239,131,84,.14)', 'sheet':'rgba(34,37,52,.95)', 'sheet-solid':'#222534', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(239,131,84,.18)'}},
  {id:'minuit', nom:"Minuit et or", d:"Marine profond, icônes dorées", c:["#000814", "#001d3d", "#003566", "#ffc300", "#ffd60a"],
   clair:{'base':'#eef2f7', 'blob-1':'rgba(255,214,10,.52)', 'blob-2':'rgba(0,53,102,.45)', 'blob-3':'rgba(0,29,61,.36)', 'ink':'#001d3d', 'ink-soft':'#46566b', 'ink-faint':'#8794a6', 'glass':'rgba(255,255,255,.28)', 'glass-tint':'rgba(238,242,247,0.12)', 'shadow':'0 14px 34px -16px rgba(0,29,61,0.42)', 'head':'rgba(238,242,247,0.76)', 'panel':'#eef2f7', 'card':'rgba(255,255,255,.64)', 'line':'rgba(0,29,61,0.12)', 'accent':'#003566', 'on-accent':'#ffffff', 'accent-soft':'rgba(0,53,102,0.09)', 'sheet':'rgba(238,242,247,0.95)', 'sheet-solid':'#eef2f7', 'scrim':'rgba(0,29,61,0.3)', 't-brick':'#003566', 't-slate':'#0d2b52', 't-olive':'#0a3d73', 't-plum':'#1a3a63', 't-teal':'#00467f', 't-ochre':'#24456b', 't-char':'#123257', 't-rose':'#2d5585', 'glyph':'#ffd60a', 'sport-accent':'#ffc300', 'blob-4':'rgba(255,195,0,.32)'},
   sombre:{'base':'#000814', 'blob-1':'rgba(0,63,122,.95)', 'blob-2':'rgba(0,40,84,.75)', 'blob-3':'rgba(255,195,0,.28)', 'ink':'#f2f5f9', 'ink-soft':'#a9b6c8', 'ink-faint':'#7d8aa0', 'glass':'rgba(242,245,249,0.07)', 'glass-tint':'rgba(255,195,0,0.05)', 'rim-1':'rgba(242,245,249,0.5)', 'rim-2':'rgba(242,245,249,0.04)', 'rim-3':'rgba(255,195,0,0.3)', 'spec':'rgba(242,245,249,0.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(0,8,20,0.72)', 'panel':'#000814', 'card':'rgba(242,245,249,0.06)', 'line':'rgba(242,245,249,0.1)', 'accent':'#ffc300', 'on-accent':'#000814', 'accent-soft':'rgba(255,195,0,0.14)', 'sheet':'rgba(0,8,20,0.95)', 'sheet-solid':'#000814', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(255,214,10,.14)'}},
  {id:'encre', nom:"Encre et ambre", d:"Noir et marine, icônes ambre", c:["#000000", "#14213d", "#fca311", "#e5e5e5", "#ffffff"],
   clair:{'base':'#f3f3f3', 'blob-1':'rgba(252,163,17,.42)', 'blob-2':'rgba(20,33,61,.4)', 'blob-3':'rgba(252,163,17,.36)', 'ink':'#14213d', 'ink-soft':'#525a69', 'ink-faint':'#8b919c', 'glass':'rgba(255,255,255,.28)', 'glass-tint':'rgba(243,243,243,0.12)', 'shadow':'0 14px 34px -16px rgba(20,33,61,0.42)', 'head':'rgba(243,243,243,0.76)', 'panel':'#f3f3f3', 'card':'rgba(255,255,255,.64)', 'line':'rgba(20,33,61,0.12)', 'accent':'#14213d', 'on-accent':'#ffffff', 'accent-soft':'rgba(20,33,61,0.09)', 'sheet':'rgba(243,243,243,0.95)', 'sheet-solid':'#f3f3f3', 'scrim':'rgba(20,33,61,0.3)', 't-brick':'#14213d', 't-slate':'#1f3a68', 't-olive':'#24365e', 't-plum':'#2a3157', 't-teal':'#33487a', 't-ochre':'#3b4a73', 't-char':'#1d2c4f', 't-rose':'#46557a', 'glyph':'#fca311', 'sport-accent':'#fca311', 'blob-4':'rgba(36,54,94,.28)'},
   sombre:{'base':'#030407', 'blob-1':'rgba(28,46,88,.95)', 'blob-2':'rgba(40,62,112,.6)', 'blob-3':'rgba(252,163,17,.3)', 'ink':'#ffffff', 'ink-soft':'#bcbcbc', 'ink-faint':'#8a8a8a', 'glass':'rgba(255,255,255,0.07)', 'glass-tint':'rgba(252,163,17,0.05)', 'rim-1':'rgba(255,255,255,0.5)', 'rim-2':'rgba(255,255,255,0.04)', 'rim-3':'rgba(252,163,17,0.3)', 'spec':'rgba(255,255,255,0.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(3,4,7,0.72)', 'panel':'#030407', 'card':'rgba(255,255,255,0.06)', 'line':'rgba(255,255,255,0.1)', 'accent':'#fca311', 'on-accent':'#000000', 'accent-soft':'rgba(252,163,17,0.14)', 'sheet':'rgba(3,4,7,0.95)', 'sheet-solid':'#030407', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(252,163,17,.14)'}},
  {id:'petrole', nom:"Pétrole et cuivre", d:"Bleu pétrole, crème, orange", c:["#001524", "#15616d", "#ffecd1", "#ff7d00", "#78290f"],
   clair:{'base':'#fff5e8', 'blob-1':'rgba(255,236,209,.95)', 'blob-2':'rgba(21,97,109,.5)', 'blob-3':'rgba(255,125,0,.4)', 'ink':'#001524', 'ink-soft':'#4c5b5f', 'ink-faint':'#8b9496', 'glass':'rgba(255,255,255,.28)', 'glass-tint':'rgba(255,245,232,0.12)', 'shadow':'0 14px 34px -16px rgba(0,21,36,0.42)', 'head':'rgba(255,245,232,0.76)', 'panel':'#fff5e8', 'card':'rgba(255,255,255,.64)', 'line':'rgba(0,21,36,0.12)', 'accent':'#15616d', 'on-accent':'#ffffff', 'accent-soft':'rgba(21,97,109,0.09)', 'sheet':'rgba(255,245,232,0.95)', 'sheet-solid':'#fff5e8', 'scrim':'rgba(0,21,36,0.3)', 't-brick':'#15616d', 't-slate':'#78290f', 't-olive':'#001524', 't-plum':'#b35400', 't-teal':'#0f4a54', 't-ochre':'#9a3a17', 't-char':'#002a40', 't-rose':'#1d7a88', 'glyph':'#ffecd1', 'sport-accent':'#ff7d00', 'blob-4':'rgba(21,97,109,.3)'},
   sombre:{'base':'#001524', 'blob-1':'rgba(21,108,122,.9)', 'blob-2':'rgba(120,41,15,.55)', 'blob-3':'rgba(255,125,0,.3)', 'ink':'#ffecd1', 'ink-soft':'#c9baa5', 'ink-faint':'#8f8676', 'glass':'rgba(255,236,209,0.07)', 'glass-tint':'rgba(255,125,0,0.05)', 'rim-1':'rgba(255,236,209,0.5)', 'rim-2':'rgba(255,236,209,0.04)', 'rim-3':'rgba(255,125,0,0.3)', 'spec':'rgba(255,236,209,0.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(0,21,36,0.72)', 'panel':'#001524', 'card':'rgba(255,236,209,0.06)', 'line':'rgba(255,236,209,0.1)', 'accent':'#ff7d00', 'on-accent':'#001524', 'accent-soft':'rgba(255,125,0,0.14)', 'sheet':'rgba(0,21,36,0.95)', 'sheet-solid':'#001524', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(29,122,136,.35)'}},
  {id:'azur', nom:"Azur et mandarine", d:"Bleu roi, gris clair, orange", c:["#ff6700", "#ebebeb", "#c0c0c0", "#3a6ea5", "#004e98"],
   clair:{'base':'#f1f1f1', 'blob-1':'rgba(58,110,165,.5)', 'blob-2':'rgba(255,103,0,.36)', 'blob-3':'rgba(0,78,152,.42)', 'ink':'#0a2a4f', 'ink-soft':'#56616d', 'ink-faint':'#8e959e', 'glass':'rgba(255,255,255,.28)', 'glass-tint':'rgba(241,241,241,0.12)', 'shadow':'0 14px 34px -16px rgba(10,42,79,0.42)', 'head':'rgba(241,241,241,0.76)', 'panel':'#f1f1f1', 'card':'rgba(255,255,255,.64)', 'line':'rgba(10,42,79,0.12)', 'accent':'#004e98', 'on-accent':'#ffffff', 'accent-soft':'rgba(0,78,152,0.09)', 'sheet':'rgba(241,241,241,0.95)', 'sheet-solid':'#f1f1f1', 'scrim':'rgba(10,42,79,0.3)', 't-brick':'#004e98', 't-slate':'#3a6ea5', 't-olive':'#003a72', 't-plum':'#2b5a8a', 't-teal':'#4f82b8', 't-ochre':'#d65600', 't-char':'#23364d', 't-rose':'#6c8fb8', 'glyph':'#ffffff', 'sport-accent':'#ff6700', 'blob-4':'rgba(192,192,192,.6)'},
   sombre:{'base':'#0a1622', 'blob-1':'rgba(0,88,172,.85)', 'blob-2':'rgba(58,110,165,.5)', 'blob-3':'rgba(255,103,0,.3)', 'ink':'#ebebeb', 'ink-soft':'#b2bac4', 'ink-faint':'#848c96', 'glass':'rgba(235,235,235,0.07)', 'glass-tint':'rgba(255,122,31,0.05)', 'rim-1':'rgba(235,235,235,0.5)', 'rim-2':'rgba(235,235,235,0.04)', 'rim-3':'rgba(255,122,31,0.3)', 'spec':'rgba(235,235,235,0.14)', 'shadow':'0 14px 34px -14px rgba(0,0,0,.75)', 'head':'rgba(10,22,34,0.72)', 'panel':'#0a1622', 'card':'rgba(235,235,235,0.06)', 'line':'rgba(235,235,235,0.1)', 'accent':'#ff7a1f', 'on-accent':'#0a1622', 'accent-soft':'rgba(255,122,31,0.14)', 'sheet':'rgba(10,22,34,0.95)', 'sheet-solid':'#0a1622', 'scrim':'rgba(0,0,0,.45)', 'blob-4':'rgba(255,122,31,.14)'}},
  /* v42 : thèmes calculés à partir de leurs 5 couleurs */
  {id:'corail',    nom:'Corail et violet', d:'Coucher de soleil',              c:['#ff6b6b', '#ffa36c', '#c06c84', '#6c5b7b', '#355c7d']},
  {id:'menthe',    nom:'Menthe et mangue', d:'Turquoise frais, orange vif',    c:['#2ec4b6', '#cbf3f0', '#ffffff', '#ffbf69', '#ff9f1c'], accent:'#0f8b80'},
  {id:'aurore',    nom:'Aurore',           d:'Nuit boréale, vert et violet',   c:['#0d1b2a', '#1b998b', '#2de1c2', '#7b2cbf', '#c77dff']},
  {id:'framboise', nom:'Framboise',        d:'Rouge profond et rose',          c:['#590d22', '#a4133c', '#ff4d6d', '#ffb3c1', '#fff0f3']},
];
/* thèmes que connaît le classeur actuel (onglet Apparence) : les autres sont proposés même s'il ne les cite pas */
const CONNUS_V41 = ['bleu', 'gris', 'ardoise', 'minuit', 'encre', 'petrole', 'azur'];
const CFGv = (k, d) => { try{ return window.CFG ? CFG(k, d) : d; }catch{ return d; } };
const LS = {lire(k){ try{ return localStorage.getItem(k); }catch{ return null; } }, ecrire(k, v){ try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); }catch{} }};

/* ---------- couleurs (OKLCH : clarté, intensité, teinte) ---------- */
const hexRgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const delin = c => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
function oklch(hex){
  const [r, g, b] = hexRgb(hex).map(lin);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const L = .2104542553 * l + .7936177850 * m - .0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .8086757660 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
function versRgb(L, C, H){
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
}
/* couleur affichable la plus proche (intensité réduite si besoin), en #rrggbb ou rgba(…, alpha) */
function couleur(L, C, H, alpha){
  const ok = x => x.every(v => v >= -1e-4 && v <= 1 + 1e-4);
  let rgb = versRgb(L, C, H);
  if (!ok(rgb)){ let lo = 0, hi = C; for (let i = 0; i < 18; i++){ const mi = (lo + hi) / 2; if (ok(versRgb(L, mi, H))) lo = mi; else hi = mi; } rgb = versRgb(L, lo, H); }
  const v = rgb.map(x => Math.round(Math.min(1, Math.max(0, delin(Math.min(1, Math.max(0, x))))) * 255));
  return alpha == null ? '#' + v.map(x => x.toString(16).padStart(2, '0')).join('') : `rgba(${v.join(',')},${alpha})`;
}
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

/* ---------- variables d'un thème calculé ---------- */
function calculer(t){
  const P = t.c.filter(h => HEX.test(h)).map(h => oklch(h.startsWith('#') ? h : '#' + h));
  if (!P.length) return {clair:{}, sombre:{}};
  const parL = [...P].sort((a, b) => a[0] - b[0]), fonce = parL[0], pale = parL[parL.length - 1];
  const vifs = [...P].sort((a, b) => b[1] - a[1]), v = i => vifs[i % vifs.length];
  /* en sombre, un orange ou un jaune assombri vire au brun : ces teintes passent en dernier (petite tache lumineuse) */
  const chaud = o => o[1] > .06 && o[2] > 45 && o[2] < 110, vifsS = [...vifs.filter(o => !chaud(o)), ...vifs.filter(chaud)], w = i => vifsS[i % vifsS.length];
  const hF = fonce[1] > .02 ? fonce[2] : v(0)[2], cF = Math.min(Math.max(fonce[1], .02), .05);
  const hC = pale[1] > .012 ? pale[2] : v(0)[2], cC = Math.min(Math.max(pale[1], .008), .025);
  const ac = t.accent ? oklch(t.accent) : v(0);
  const accClair = couleur(Math.min(ac[0], .5), Math.min(ac[1], .16), ac[2]), accSombre = couleur(Math.max(ac[0], .78), Math.min(ac[1], .15), ac[2]);
  const acO = oklch(accClair), asO = oklch(accSombre);
  const base = couleur(.968, cC, hC), baseS = couleur(.17, cF, hF);
  const tache = (o, L, al) => couleur(L, Math.min(o[1] * 1.1 + .03, .17), o[2], al);
  const tuile = (o, L) => couleur(L, Math.min(Math.max(o[1], .05), .15), o[2]);
  const clair = {
    base, 'blob-1':tache(v(0), .8, .58), 'blob-2':tache(v(1), .72, .5), 'blob-3':tache(v(2), .6, .42), 'blob-4':tache(v(3), .84, .5),
    ink:couleur(.24, Math.min(cF, .06), hF), 'ink-soft':couleur(.48, Math.min(cF, .04), hF), 'ink-faint':couleur(.64, Math.min(cF, .03), hF),
    glass:'rgba(255,255,255,.28)', 'glass-tint':tache(v(0), .86, .12), shadow:`0 14px 34px -16px ${couleur(.3, cF, hF, .42)}`,
    head:couleur(.968, cC, hC, .76), panel:base, card:'rgba(255,255,255,.64)', line:couleur(.24, cF, hF, .12),
    accent:accClair, 'on-accent':'#ffffff', 'accent-soft':couleur(acO[0], acO[1], acO[2], .09),
    sheet:couleur(.968, cC, hC, .95), 'sheet-solid':base, scrim:couleur(.24, cF, hF, .3),
    't-brick':tuile(v(0), .52), 't-slate':tuile(v(1), .5), 't-olive':tuile(v(2), .44), 't-plum':tuile(v(0), .38),
    't-teal':tuile(v(3), .55), 't-ochre':tuile(v(1), .4), 't-char':couleur(.3, cF, hF), 't-rose':tuile(v(2), .58),
    glyph:t.glyphe || '#ffffff', 'sport-accent':tuile(v(1), .62)
  };
  const sombre = {
    base:baseS, 'blob-1':tache(w(0), .44, .82), 'blob-2':tache(w(1), .38, .6), 'blob-3':tache(w(vifsS.length - 1), .66, .3), 'blob-4':tache(w(2), .5, .24),
    ink:couleur(.95, cC, hC), 'ink-soft':couleur(.78, Math.min(cC, .02), hC), 'ink-faint':couleur(.62, Math.min(cC, .02), hC),
    glass:couleur(.95, cC, hC, .07), 'glass-tint':tache(w(0), .6, .05),
    'rim-1':couleur(.95, cC, hC, .5), 'rim-2':couleur(.95, cC, hC, .04), 'rim-3':tache(w(0), .72, .3), spec:couleur(.95, cC, hC, .14),
    shadow:'0 14px 34px -14px rgba(0,0,0,.75)',
    head:couleur(.17, cF, hF, .72), panel:baseS, card:couleur(.95, cC, hC, .06), line:couleur(.95, cC, hC, .1),
    accent:accSombre, 'on-accent':baseS, 'accent-soft':couleur(asO[0], asO[1], asO[2], .14),
    sheet:couleur(.17, cF, hF, .95), 'sheet-solid':baseS, scrim:'rgba(0,0,0,.45)'
  };
  return {clair:{...clair, ...(t.clair || {})}, sombre:{...sombre, ...(t.sombre || {})}};
}
/* thème écrit à la main (tous ceux d'avant la v42) : ses valeurs telles quelles ; sinon calculé */
const variables = t => t.clair && (t.id === 'bleu' || t.clair.base) ? {clair:t.clair, sombre:t.sombre || {}} : calculer(t);

/* ---------- CSS ---------- */
const decl = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
function cssDe(t){
  const sel = t.id === 'bleu' ? [':root:not([data-palette])', ':root[data-palette="bleu"]'] : [`:root[data-palette="${t.id}"]`];
  const {clair, sombre} = variables(t);
  return `${sel.join(',')}{${decl(clair)}}\n`
    + `@media (prefers-color-scheme: dark){${sel.map(s => s + ':not([data-theme="light"])').join(',')}{${decl(sombre)}}}\n`
    + `${sel.map(s => s + '[data-theme="dark"]').join(',')}{${decl(sombre)}}\n`;
}
/* fond : calque fixe derrière la page (4 taches de couleur + grain très léger contre les bandes) */
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.32'/%3E%3C/svg%3E\")";
const taches = esp => `radial-gradient(${esp}62% 44% at 6% 4%, var(--blob-1), transparent 72%),`
  + `radial-gradient(${esp}56% 40% at 100% 28%, var(--blob-2), transparent 72%),`
  + `radial-gradient(${esp}60% 40% at 0% 68%, var(--blob-4, transparent), transparent 72%),`
  + `radial-gradient(${esp}78% 48% at 86% 102%, var(--blob-3), transparent 72%)`;
const FOND = `.app-logo{display:inline-block;width:.9em;height:.9em;border-radius:22%;overflow:hidden;line-height:0;vertical-align:-.08em;margin-right:.28em;box-shadow:0 2px 6px rgba(0,0,0,.18)}.app-logo svg{display:block;width:100%;height:100%}\n`
  + `body::after{content:"";position:fixed;left:0;right:0;top:-12vh;bottom:-12vh;z-index:-1;pointer-events:none;background-image:${GRAIN},${taches('')};background-size:160px 160px,auto,auto,auto,auto}\n`
  + `@supports (background-image:radial-gradient(in oklab, red, blue)){body::after{background-image:${GRAIN},${taches('in oklab ')}}}\n`;

/* ---------- thème perso ---------- */
function perso(){ try{ const p = JSON.parse(LS.lire('theme:perso')); return p && Array.isArray(p.c) && p.c.length >= 2 ? {id:'perso', nom:String(p.nom || 'Mon thème').slice(0, 30), d:'Mon thème', c:p.c.slice(0, 5), perso:true} : null; }catch{ return null; } }
/* couleurs lues dans un texte : adresse coolors.co (…/ff6b6b-ffa36c-…), codes #rrggbb séparés par des espaces, virgules… */
function lireCouleurs(txt){
  const s = String(txt || ''), m = s.match(/coolors\.co\/(?:palette\/)?([0-9a-f]{6}(?:-[0-9a-f]{6})+)/i);
  const l = m ? m[1].split('-') : (s.match(/#?\b[0-9a-f]{6}\b/gi) || []);
  return [...new Set(l.map(h => '#' + h.replace('#', '').toLowerCase()))].slice(0, 5);
}

let apercu = null;
function ecrireCSS(){
  const p = perso(), l = [...THEMES, ...(p ? [p] : []), ...(apercu ? [apercu] : [])];
  let el = document.getElementById('themes-css');
  if (!el){ el = document.createElement('style'); el.id = 'themes-css'; (document.head || document.documentElement).appendChild(el); }
  el.textContent = FOND + l.map(t => { try{ return cssDe(t); }catch{ return ''; } }).join('');
}

/* ---------- choix de l'appareil ---------- */
const DEF = () => CFGv('apparence.palette', 'bleu');
const existe = id => id === 'bleu' || (id === 'perso' ? !!perso() : THEMES.some(t => t.id === id));
function poser(id){ const d = document.documentElement; if (id && id !== 'bleu' && (existe(id) || id === 'apercu')) d.dataset.palette = id; else delete d.dataset.palette; }
const actuel = () => { const p = LS.lire('palette') || DEF(); return existe(p) ? p : 'bleu'; };

function liste(){
  const choisis = CFGv('apparence.palettes', null), connus = CFGv('apparence.palettes_connues', null) || CONNUS_V41;
  const l = choisis ? THEMES.filter(t => choisis.includes(t.id) || !connus.includes(t.id)) : THEMES.slice();
  const p = perso(); return p ? [...l, p] : l;
}


/* ---------- logos de l'appli (v43) : 7 dessins, aux couleurs du thème ----------
   Dans l'appli (onglet du navigateur, titres d'État et de Réglages) : dessinés en direct. Icône de l'écran d'accueil : figée par
   l'iPhone (ou Android, PC) au moment de l'ajout ; elle vient de icones/<logo>-<thème>-180.png (+ manifest-<logo>-<thème>.json pour
   192 et 512 px), images faites à l'avance par outils/dev/icones.py — à relancer après l'ajout d'un thème. Thème perso : image
   dessinée sur l'appareil (si le navigateur l'accepte). Choix gardé sur l'appareil (« logo »). */
const LOGO_DEF = 'origine';
const BLEU_BASE = {clair:{base:'#e7ecef', accent:'#274c77', 't-slate':'#6096ba', 't-ochre':'#8b8c89'}, sombre:{base:'#08121f', accent:'#a3cef1'}};
const enHex = v => { const t = String(v || '').trim(), m = t.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join(''); return HEX.test(t) ? (t.startsWith('#') ? t : '#' + t) : null; };
const auMoins = (hex, L) => { const o = oklch(hex); return o[0] >= L ? hex : couleur(L, o[1], o[2]); };
const proches = (x, y) => { const a = oklch(x), b = oklch(y), r = Math.PI / 180;
  return Math.hypot(a[0] - b[0], a[1] * Math.cos(a[2] * r) - b[1] * Math.cos(b[2] * r), a[1] * Math.sin(a[2] * r) - b[1] * Math.sin(b[2] * r)) < .09; };
function themeDe(id){ return id === 'perso' ? perso() : id === 'apercu' ? apercu : THEMES.find(t => t.id === id) || THEMES[0]; }
function logoCouleurs(t){
  t = t || THEMES[0];
  const V = variables(t), c = {...(t.id === 'bleu' ? BLEU_BASE.clair : {}), ...V.clair}, s = {...(t.id === 'bleu' ? BLEU_BASE.sombre : {}), ...V.sombre};
  const encre = enHex(c.accent) || '#274c77', oA = oklch(encre);
  const f1 = couleur(Math.min(Math.max(oA[0] + .08, .42), .55), oA[1], oA[2]);
  const oB = oklch(enHex(s.base) || '#08121f'), f2 = couleur(Math.max(oB[0], .2), oB[1], oB[2]);
  const clair = enHex(c.base) || '#e7ecef', sa = enHex(s.accent);
  const vif = sa && oklch(sa)[1] > .1 ? sa : '#ff9f43';
  let b = auMoins(enHex(c['t-slate']) || encre, .6); { const o = oklch(b); if (o[0] > .78) b = couleur(.62, o[1], o[2]); }   // tuile moyenne, distincte des claires
  let a = auMoins(enHex(c['blob-1']) || '#a3cef1', .74); if (proches(a, vif) || proches(a, b)) a = auMoins(b, .84);
  const gris = auMoins(enHex(c['t-ochre']) || '#8b8c89', .55);
  const oC = oklch(clair), oV = oklch(vif);
  return {f1, f2, encre, a, b, clair, vif, gris, fondClair:couleur(Math.max(oC[0] - .1, .82), oC[1] < .008 ? oC[1] : Math.max(oC[1], .02), oC[2]), soleil:couleur(Math.min(oV[0] + .12, .92), oV[1], oV[2] + 12)};
}
let nLogo = 0;
const deg = (u, x1, y1, x2, y2, a, b) => `<linearGradient id="${u}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const ray = (u, cx, cy, r, c, o) => `<radialGradient id="${u}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const LOGOS = [
  {id:'origine', nom:"D'origine", svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 0, 1, P.encre, P.f2)}</defs><rect width="512" height="512" fill="url(#${u}f)"/>`
    + `<rect x="105" y="105" width="131" height="131" rx="40" fill="${P.a}"/><rect x="276" y="105" width="131" height="131" rx="40" fill="${P.b}"/>`
    + `<rect x="105" y="276" width="131" height="131" rx="40" fill="${P.clair}"/><rect x="276" y="276" width="131" height="131" rx="40" fill="${P.gris}"/>`},
  {id:'grille', nom:'Grille', svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 0, 1, P.f1, P.f2)}</defs><rect width="512" height="512" fill="url(#${u}f)"/>`
    + `<rect x="112" y="112" width="128" height="128" rx="34" fill="${P.a}"/><rect x="272" y="112" width="128" height="128" rx="34" fill="${P.b}"/>`
    + `<rect x="112" y="272" width="128" height="128" rx="34" fill="${P.clair}"/><rect x="272" y="272" width="128" height="128" rx="34" fill="${P.vif}"/>`
    + `<circle cx="336" cy="336" r="22" fill="#fff"/><circle cx="336" cy="336" r="40" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="8"/>`},
  {id:'monogramme', nom:'Monogramme', svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 1, 1, P.f1, P.f2)}${ray(u + 'h', .25, .15, .7, P.a, .35)}</defs><rect width="512" height="512" fill="url(#${u}f)"/><rect width="512" height="512" fill="url(#${u}h)"/>`
    + `<polyline points="140,356 140,156 256,292 372,156 372,356" fill="none" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<rect x="176" y="404" width="160" height="24" rx="12" fill="${P.vif}"/>`},
  {id:'ecran', nom:'Écran', svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 0, 1, P.clair, P.fondClair)}</defs><rect width="512" height="512" fill="url(#${u}f)"/>`
    + `<rect x="136" y="76" width="240" height="360" rx="52" fill="#fff" stroke="${P.encre}" stroke-width="16"/>`
    + `<rect x="172" y="116" width="168" height="92" rx="22" fill="${P.encre}"/><rect x="194" y="140" width="72" height="14" rx="7" fill="${P.a}"/><rect x="194" y="166" width="112" height="14" rx="7" fill="#fff" fill-opacity=".5"/>`
    + `<rect x="172" y="232" width="72" height="72" rx="20" fill="${P.a}"/><rect x="268" y="232" width="72" height="72" rx="20" fill="${P.b}"/>`
    + `<rect x="172" y="328" width="72" height="72" rx="20" fill="${P.fondClair}"/><rect x="268" y="328" width="72" height="72" rx="20" fill="${P.vif}"/>`},
  {id:'horizon', nom:'Horizon', svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 0, 1, P.f2, P.f1)}${deg(u + 's', 0, 0, 0, 1, P.soleil, P.vif)}${ray(u + 'l', .5, .57, .45, P.vif, .35)}</defs>`
    + `<rect width="512" height="512" fill="url(#${u}f)"/><rect width="512" height="512" fill="url(#${u}l)"/><path d="M140,290 A116,116 0 0 1 372,290 Z" fill="url(#${u}s)"/>`
    + `<rect x="108" y="322" width="296" height="28" rx="14" fill="${P.a}" fill-opacity=".95"/><rect x="152" y="372" width="208" height="28" rx="14" fill="${P.a}" fill-opacity=".7"/><rect x="200" y="422" width="112" height="28" rx="14" fill="${P.a}" fill-opacity=".45"/>`},
  {id:'cadran', nom:'Cadran', svg:(P, u) => `<defs><radialGradient id="${u}f" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="${P.f1}"/><stop offset="1" stop-color="${P.f2}"/></radialGradient></defs><rect width="512" height="512" fill="url(#${u}f)"/>`
    + [P.vif, P.b, P.clair, P.a].map((c, i) => `<circle cx="256" cy="256" r="123" fill="none" stroke="${c}" stroke-width="90" stroke-dasharray="177.2 595.6" transform="rotate(${-86.27 + 90 * i} 256 256)"/>`).join('')
    + `<circle cx="256" cy="256" r="26" fill="#fff"/>`},
  {id:'point', nom:'Point live', svg:(P, u) => `<defs>${deg(u + 'f', 0, 0, 0, 1, P.f1, P.f2)}${ray(u + 'h', .73, .73, .35, P.vif, .4)}</defs><rect width="512" height="512" fill="url(#${u}f)"/><rect width="512" height="512" fill="url(#${u}h)"/>`
    + [[136, 136, P.a, 1], [256, 136, P.clair, .85], [376, 136, P.clair, .85], [136, 256, P.clair, .85], [256, 256, P.b, 1], [376, 256, P.clair, .85], [136, 376, P.clair, .85], [256, 376, P.clair, .85]]
      .map(([x, y, c, o]) => `<circle cx="${x}" cy="${y}" r="32" fill="${c}" fill-opacity="${o}"/>`).join('')
    + `<circle cx="376" cy="376" r="56" fill="none" stroke="${P.vif}" stroke-opacity=".5" stroke-width="10"/><circle cx="376" cy="376" r="34" fill="${P.vif}"/>`},
];
/* dessin SVG (carré, 512 × 512) d'un logo aux couleurs d'un thème (objet ou identifiant ; défaut : le thème affiché) */
function logoSVG(id, theme){
  const L = LOGOS.find(x => x.id === id) || LOGOS[0], t = typeof theme === 'object' && theme ? theme : themeDe(theme || actuel());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">${L.svg(logoCouleurs(t), 'lg' + (++nLogo))}</svg>`;
}
const logoActuel = () => { const l = LS.lire('logo'); return LOGOS.some(x => x.id === l) ? l : LOGO_DEF; };
function lien(rel, href, type){
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el){ el = document.createElement('link'); el.rel = rel; (document.head || document.documentElement).appendChild(el); }
  if (type) el.type = type; if (el.getAttribute('href') !== href) el.setAttribute('href', href);
}
/* image PNG dessinée sur l'appareil (thème perso) ; null si le navigateur refuse */
function dessinerPNG(svg, px){
  return new Promise(res => { try{
    const img = new Image(); img.onload = () => { try{ const c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(img, 0, 0, px, px); res(c.toDataURL('image/png')); }catch{ res(null); } };
    img.onerror = () => res(null); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('width="100%" height="100%"', `width="${px}" height="${px}"`));
  }catch{ res(null); } });
}
function poserIcones(){
  try{
    const l = logoActuel(), pal = document.documentElement.dataset.palette || 'bleu', svg = logoSVG(l, pal);
    lien('icon', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), 'image/svg+xml');
    if (l === LOGO_DEF && pal === 'bleu'){ lien('apple-touch-icon', 'apple-touch-icon.png'); lien('manifest', 'manifest.json'); }
    else if (pal === 'perso' || pal === 'apercu'){ lien('manifest', `icones/manifest-${l}-bleu.json`); dessinerPNG(svg, 180).then(u => lien('apple-touch-icon', u || `icones/${l}-bleu-180.png`)); }
    else { lien('apple-touch-icon', `icones/${l}-${pal}-180.png`); lien('manifest', `icones/manifest-${l}-${pal}.json`); }
    document.querySelectorAll('[data-logo-app]').forEach(el => { el.innerHTML = logoSVG(l, pal); });
  }catch(e){}
}

window.Themes = {
  toutes:THEMES, liste, actuel, defaut:DEF, perso, lireCouleurs,
  logos:LOGOS.map(({id, nom}) => ({id, nom})), logoSVG, logoActuel, logoCouleurs:t => logoCouleurs(typeof t === 'object' ? t : themeDe(t)),
  choisirLogo(id){ LS.ecrire('logo', id === LOGO_DEF || !LOGOS.some(x => x.id === id) ? null : id); poserIcones(); },
  variables:t => variables(t),
  choisir(id){ LS.ecrire('palette', id === DEF() ? null : id); apercu = null; ecrireCSS(); poser(actuel()); poserIcones(); },
  /* aperçu sans rien garder (État › Créer mon thème) ; Themes.apercu(null) revient au thème choisi */
  apercu(c){ apercu = c && c.length >= 2 ? {id:'apercu', c} : null; ecrireCSS(); poser(apercu ? 'apercu' : actuel()); poserIcones(); },
  enregistrerPerso(nom, c){ LS.ecrire('theme:perso', JSON.stringify({nom:String(nom || 'Mon thème').slice(0, 30), c:c.slice(0, 5)})); apercu = null; this.choisir('perso');
    try{ window.Synchro && Synchro.prefsPlusTard && Synchro.prefsPlusTard(); }catch{} },
  effacerPerso(){ LS.ecrire('theme:perso', null); if (LS.lire('palette') === 'perso') LS.ecrire('palette', null); apercu = null; ecrireCSS(); poser(actuel()); poserIcones();
    try{ window.Synchro && Synchro.prefsPlusTard && Synchro.prefsPlusTard(); }catch{} },
  rafraichir(){ ecrireCSS(); poser(actuel()); poserIcones(); }
};

/* au chargement : thème, mode clair/sombre et mise en page PC, avant l'affichage */
try{
  ecrireCSS(); poser(actuel()); poserIcones();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poserIcones, {once:true});
  const d = document.documentElement, m = LS.lire('mode') || CFGv('apparence.mode', '');
  if (m === 'clair') d.dataset.theme = 'light'; else if (m === 'sombre') d.dataset.theme = 'dark';
  const q = matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)');
  d.classList.toggle('desk', q.matches); q.addEventListener && q.addEventListener('change', e => d.classList.toggle('desk', e.matches));
}catch(e){}
/* thème perso arrivé par la synchro, ou changé dans un autre onglet */
window.addEventListener('synchro:prefs', () => Themes.rafraichir());
window.addEventListener('storage', e => { if (e.key === 'theme:perso' || e.key === 'palette' || e.key === 'logo') Themes.rafraichir(); });
})();
