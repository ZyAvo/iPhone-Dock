// mon-ecran-version: 386fbf91
/* Ambreval (v80) — interface : caméra et gestes sur la carte, panneaux, sauvegarde, sons. */
(() => {
'use strict';
const J = window.Jeu, A = window.Art, { W, RS, BAT, RECH, SORTS, ROY, PAL, ORDRE, SAISONS } = J;
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[m]));
const CLE = 'ambreval:partie';

/* ---------- Icônes : un seul tracé, pour le HTML et pour le canvas ---------- */
const ICO = {
  vivres:'M12 2c1.6 1.3 1.6 3.2 0 4.6-1.6-1.4-1.6-3.3 0-4.6zM7 6.5c2.2 0 3.7 1.2 4.2 3.4C9 10 7.4 8.7 7 6.5zm10 0c-.4 2.2-2 3.5-4.2 3.4.5-2.2 2-3.4 4.2-3.4zM7 11.5c2.2 0 3.7 1.2 4.2 3.4-2.2.1-3.8-1.2-4.2-3.4zm10 0c-.4 2.2-2 3.5-4.2 3.4.5-2.2 2-3.4 4.2-3.4zM11.2 8h1.6v14h-1.6z',
  bois:'M4 8h13a4 4 0 1 1 0 8H4a4 4 0 1 1 0-8zm13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', pierre:'M8 4l7-1 6 7-2 9-11 2-6-8z',
  or:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm-1 2h2v10h-2z', planches:'M2 5h20v4H2zM2 10.5h20v4H2zM2 16h20v4H2z',
  hydromel:'M5 5h11v3h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3v3H5zM16 10v5h3v-5z', savoir:'M3 5c3-1 6-1 8 1v14c-2-2-5-2-8-1zM21 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z',
  fer:'M7 7h10l5 10H2z', outils:'M3 6h12l3 3-2 2h-5v10H8V11H3z', mana:'M12 1l3 8 8 3-8 3-3 8-3-8-8-3 8-3z', cristal:'M7 3h10l5 6-10 12L2 9z',
  pop:'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21c0-5 3-8 8-8s8 3 8 8z',
  joie:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM8 8a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 8 8zm8 0a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 16 8zM7 14c1 3 3 4 5 4s4-1 5-4z',
  batir:'M3 6h12l3 3-2 2h-5v10H8V11H3z', commerce:'M3 8h18l-2 12H5zM8 8V6a4 4 0 0 1 8 0v2h-2V6a2 2 0 0 0-4 0v2z', royaume:'M3 18l-1-11 6 5 4-8 4 8 6-5-1 11z',
  cloche:'M12 2a2 2 0 0 1 2 2v.6c3 .9 5 3.6 5 6.9v4l2 3H3l2-3v-4c0-3.3 2-6 5-6.9V4a2 2 0 0 1 2-2zm-3 18h6a3 3 0 0 1-6 0z', lettre:'M3 5h18v14H3zm2 2.5V9l7 4.4L19 9V7.5l-7 4.4z'
};
const ico = (k, c) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${c ? ` style="color:${c}"` : ''}><path d="${ICO[k]}"/></svg>`;
const icoR = r => ico(r, RS[r] && RS[r].c);
const PATH = Object.fromEntries(Object.entries(ICO).map(([k, d]) => [k, new Path2D(d)]));
const fmt = n => { n = +n || 0; const a = Math.abs(n), v = (x, s) => (x >= 100 ? Math.round(x) : x.toFixed(1)).toString().replace('.', ',') + s; if (a >= 1e9) return v(n / 1e9, ' Md'); if (a >= 1e6) return v(n / 1e6, ' M'); if (a >= 1e4) return Math.round(n / 1e3) + ' k'; if (a >= 1000) return v(n / 1e3, ' k'); return String(Math.floor(n)); };
const fmtT = n => { const a = Math.abs(n); return a >= 100 ? fmt(n) : a >= 10 ? n.toFixed(0) : a >= .1 ? n.toFixed(1).replace('.', ',') : a > 0 ? n.toFixed(2).replace('.', ',') : '0'; };
const duree = s => { s = Math.max(0, Math.round(s)); if (s < 60) return s + ' s'; if (s < 3600) return `${Math.floor(s / 60)} min${s % 60 && s < 600 ? ' ' + (s % 60) + ' s' : ''}`; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
const couts = c => `<span class="couts">${Object.entries(c).map(([r, q]) => `<span class="cout${S.r[r] < q ? ' ko' : ''}">${icoR(r)}${fmt(q)}</span>`).join('')}</span>`;
const recettes = g => Object.entries(g).filter(([, q]) => q > 0).map(([r, q]) => `<span class="cout">${icoR(r)}+${fmt(q)}</span>`).join(' ');

/* ---------- Sauvegarde ---------- */
let S;
const sauver = () => { if (!S) return; S.t = Date.now(); try{ localStorage.setItem(CLE, JSON.stringify(S)); }catch{ toast('Mémoire pleine : la partie n\'a pas pu être enregistrée'); } };
function ouvrirPartie(){ try{ const t = localStorage.getItem(CLE); if (t) return J.charger(t); }catch{} return null; }
S = ouvrirPartie(); let retour = null;
if (S) retour = J.rattraper(S); else { S = J.nouvelle(); sauver(); }
try{ navigator.storage && navigator.storage.persist && navigator.storage.persist(); }catch{}

/* ---------- Toasts et fenêtres ---------- */
function toast(t){ const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = t; const z = $('#toasts'); z.appendChild(el); while (z.children.length > 3) z.firstChild.remove(); setTimeout(() => el.remove(), 2600); }
function modale(html){ $('#boite').innerHTML = html; $('#fond').hidden = false; }
function fermerModale(){ $('#fond').hidden = true; $('#boite').innerHTML = ''; }
$('#fond').addEventListener('click', e => { if (e.target.id === 'fond' && !$('#boite [data-oblige]')) fermerModale(); });

/* ---------- Canvas ---------- */
const cv = $('#carte'), c = cv.getContext('2d', {alpha:false}), DPR = Math.min(2, devicePixelRatio || 1);
const OX = W * 32 + 20, OY = 110, MW = W * 64 + 40, MH = W * 32 + 170, SC = DPR >= 2 ? 1.6 : 1.25;
const monde = document.createElement('canvas'); monde.width = MW * SC; monde.height = MH * SC; const mc = monde.getContext('2d');
let vw = 0, vh = 0, sale = true, sig = '', R0 = {lum:[], fum:[], rot:[]}, fondG = null;
const cam = {x:0, y:(J.CX + J.CY + 2) * 16, z:1.25};
function taille(){ const r = cv.getBoundingClientRect(); vw = r.width; vh = r.height; cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR); fondG = null; }
addEventListener('resize', taille); taille();
if (vw > 800) cam.z = 1.5;
const versEcran = (wx, wy) => [vw / 2 + (wx - cam.x) * cam.z, vh / 2 + (wy - cam.y) * cam.z];
const versMonde = (X, Y) => [(X - vw / 2) / cam.z + cam.x, (Y - vh / 2) / cam.z + cam.y];
const versCase = (X, Y) => { const [a, b] = versMonde(X, Y), u = (b / 16 + a / 32) / 2, v = (b / 16 - a / 32) / 2; return [Math.floor(u), Math.floor(v)]; };
const centreB = b => { const s = BAT[b.k].s || 1; return [(b.x - b.y) * 32, (b.x + b.y + s) * 16]; };
function bornes(){ cam.x = Math.max(-W * 34, Math.min(W * 34, cam.x)); cam.y = Math.max(-40, Math.min(W * 32 + 60, cam.y)); cam.z = Math.max(.5, Math.min(2.8, cam.z)); }
function signature(){ const D = J.dd(S); return [S.bats.map(b => `${b.k}${b.n}${b.con > 0 ? 'c' : ''}${b.x}`).join(), S.chem.length, D.relies.size, S.map, J.saisonDe(S), D.R].join('|'); }

/* ---------- Animations : bulles, fée, gens, particules ---------- */
let bulles = [], fee = null, flots = [], gens = [], fx = [], tBulle = 3, tFee = 45, fumees = [];
function nouvelleBulle(){ const D = J.dd(S), L = D.prods.filter(p => !p.b.off && Object.keys(p.p).length && !bulles.some(x => x.b === p.b)); if (!L.length || bulles.length >= 4) return; const p = L[Math.floor(Math.random() * L.length)]; bulles.push({b:p.b, r:Object.keys(p.p)[0], t:30, p:Math.random() * 6}); }
function flot(wx, wy, txt, col = '#f5ecd6'){ flots.push({x:wx, y:wy, txt, col, t:1.4}); }
function appelGens(){ const n = Math.min(Math.floor(S.pop), 16); while (gens.length < n) gens.push({x:J.CX + 2.5, y:J.CY + 2.5, tx:J.CX + 2.5, ty:J.CY + 2.5, c:['#d9584f', '#4c8fd0', '#e0a14a', '#65b56f', '#a585e8'][gens.length % 5]}); gens.length = n; }
function bougeGens(dt){ const D = J.dd(S); for (const g of gens){ const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy); if (d < .05){ const opts = []; const ci = Math.floor(g.tx), cj = Math.floor(g.ty);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const x = ci + a, y = cj + b; if (x < 0 || y < 0 || x >= W || y >= W) continue; const i = J.id(x, y); if (D.ch.has(i)) opts.push([x, y, 3]); else if (!D.occ[i] && S.map[i] === '.' && J.dansTerr(S, x, y, D) && Math.max(Math.abs(x - J.CX), Math.abs(y - J.CY)) < 5 + S.palier) opts.push([x, y, 1]); }
      if (opts.length){ const P2 = opts.flatMap(o => Array(o[2]).fill(o)), o = P2[Math.floor(Math.random() * P2.length)]; g.tx = o[0] + .5; g.ty = o[1] + .5; } }
    else { const v = Math.min(d, .55 * dt); g.x += dx / d * v; g.y += dy / d * v; } } }
function nuit(){ const p = (S.temps % J.DUREE_JOUR) / J.DUREE_JOUR; return p < .46 ? 0 : p < .58 ? (p - .46) / .12 : p < .92 ? 1 : 1 - (p - .92) / .08; }   // jour, crépuscule, nuit, aube
const nuitV = () => Math.max(0, Math.min(1, nuit()));

function dessine(ts, dt){
  const sg = signature(); if (sg !== sig){ sig = sg; sale = true; }
  if (sale){ sale = false; mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, monde.width, monde.height); R0 = A.construireMonde(mc, S, J.dd(S), SC, OX, OY); }
  const n = nuitV(), sai = J.saisonDe(S); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!fondG){ fondG = c.createRadialGradient(vw / 2, vh * .45, 40, vw / 2, vh * .45, Math.max(vw, vh) * .8); fondG.addColorStop(0, '#2b3f78'); fondG.addColorStop(1, '#0a1128'); }
  c.fillStyle = fondG; c.fillRect(0, 0, vw, vh);
  c.save(); c.translate(vw / 2, vh / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  c.imageSmoothingEnabled = true; c.drawImage(monde, -OX, -OY, MW, MH);
  /* surlignage de la pose */
  dessinePose();
  /* barres de chantier */
  for (const b of S.bats) if (b.con > 0){ const [x, y] = centreB(b), h = 34, k = 1 - b.con / b.tot, w = 34; c.fillStyle = 'rgba(7,12,28,.85)'; c.fillRect(x - w / 2, y - h - 6, w, 6); c.fillStyle = '#f2b544'; c.fillRect(x - w / 2 + 1, y - h - 5, (w - 2) * k, 4); }
  /* gens */
  for (const g of gens){ const X = (g.x - g.y) * 32, Y = (g.x + g.y) * 16, bob = Math.abs(Math.sin(ts / 170 + g.x * 9)) * 1.2; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(X, Y, 3, 1.4, 0, 0, 6.3); c.fill(); c.fillStyle = g.c; c.fillRect(X - 1.6, Y - 6 - bob, 3.2, 5.4); c.fillStyle = '#f1d3b0'; c.beginPath(); c.arc(X, Y - 7.6 - bob, 1.9, 0, 6.3); c.fill(); }
  /* ailes des moulins */
  for (const [x, y, l] of R0.rot){ const a = ts / 900; c.strokeStyle = '#7b5a35'; c.lineWidth = 2; for (let i = 0; i < 4; i++){ const t = a + i * Math.PI / 2, ex = Math.cos(t) * l, ey = Math.sin(t) * l * .75; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ex, y + ey); c.stroke(); c.save(); c.translate(x + ex * .58, y + ey * .58); c.rotate(t); c.fillStyle = '#efe4c8'; c.fillRect(-l * .4, 0, l * .75, 4); c.restore(); } }
  /* fumée */
  if (Math.random() < .35 && R0.fum.length && fumees.length < 40){ const f = R0.fum[Math.floor(Math.random() * R0.fum.length)]; fumees.push({x:f[0], y:f[1], t:2.4}); }
  for (const f of fumees){ f.t -= dt; f.y -= 8 * dt; f.x += 3 * dt; const a = Math.max(0, f.t / 2.4); c.fillStyle = `rgba(235,235,240,${a * .4})`; c.beginPath(); c.arc(f.x, f.y, 2 + (1 - a) * 3.6, 0, 6.3); c.fill(); } fumees = fumees.filter(f => f.t > 0);
  /* nuit : assombrit tout, puis fenêtres et sources éclairées */
  c.restore();
  if (n > .01){ c.globalCompositeOperation = 'multiply'; const r = 255 - n * 130, g = 255 - n * 120, b = 255 - n * 62; c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`; c.fillRect(0, 0, vw, vh); c.globalCompositeOperation = 'source-over'; }
  c.save(); c.translate(vw / 2, vh / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  if (n > .08){ c.globalCompositeOperation = 'lighter'; for (const [x, y, k] of R0.lum){ const s = k === 3 ? 14 : k === 2 ? 11 : k === 4 ? 30 : 6; c.globalAlpha = n * (k === 1 ? .7 : .55) * (.85 + Math.sin(ts / 400 + x) * .12); const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, k === 3 ? '#b9a2ff' : '#ffc66b'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - s, y - s, s * 2, s * 2); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  /* bulles à cueillir */
  for (const b of bulles){ const [x, y] = centreB(b.b), h = (BAT[b.b.k].h || 40) + 10, Y = y - h + Math.sin(ts / 420 + b.p) * 3; b.sx = x; b.sy = Y; c.beginPath(); c.arc(x, Y, 13, 0, 6.3); c.fillStyle = 'rgba(245,236,214,.96)'; c.fill(); c.strokeStyle = RS[b.r].c; c.lineWidth = 2.2; c.stroke(); c.save(); c.translate(x - 8.4, Y - 8.4); c.scale(.7, .7); c.fillStyle = shade(RS[b.r].c); c.fill(PATH[b.r], 'evenodd'); c.restore(); }
  /* fée */
  if (fee){ fee.a += dt * .9; const x = fee.x + Math.cos(fee.a) * 46, y = fee.y + Math.sin(fee.a * 1.7) * 22; fee.sx = x; fee.sy = y; const g = c.createRadialGradient(x, y, 0, x, y, 24); g.addColorStop(0, 'rgba(255,241,190,.95)'); g.addColorStop(.3, 'rgba(245,190,90,.55)'); g.addColorStop(1, 'rgba(245,190,90,0)'); c.fillStyle = g; c.fillRect(x - 24, y - 24, 48, 48); c.fillStyle = '#fff6dc'; const w = 7 + Math.sin(ts / 45) * 3; c.beginPath(); c.ellipse(x - w * .7, y - 1, w, 3.4, -.5, 0, 6.3); c.ellipse(x + w * .7, y - 1, w, 3.4, .5, 0, 6.3); c.fill(); c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
  /* textes qui montent */
  c.textAlign = 'center'; c.font = '700 13px Geist, system-ui';
  for (const f of flots){ f.t -= dt; f.y -= 22 * dt; c.globalAlpha = Math.min(1, f.t * 1.6); c.lineWidth = 3; c.strokeStyle = 'rgba(14,22,48,.9)'; c.strokeText(f.txt, f.x, f.y); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y); } c.globalAlpha = 1; flots = flots.filter(f => f.t > 0);
  c.restore();
  /* saison à l'écran : flocons, pétales, feuilles ; lucioles les nuits d'été */
  const voulu = sai === 3 ? 34 : sai === 1 ? (n > .5 ? 16 : 0) : sai === 0 || sai === 2 ? 14 : 0;
  while (fx.length < voulu) fx.push({x:Math.random() * vw, y:Math.random() * vh, v:12 + Math.random() * 22, s:1 + Math.random() * 2, p:Math.random() * 6});
  if (fx.length > voulu) fx.length = voulu;
  for (const f of fx){ if (sai === 1){ f.x += Math.cos(ts / 900 + f.p) * .35; f.y += Math.sin(ts / 700 + f.p) * .3; const a = .5 + Math.sin(ts / 300 + f.p) * .5; c.fillStyle = `rgba(225,255,150,${a * .85})`; c.beginPath(); c.arc(f.x, f.y, 1.7, 0, 6.3); c.fill(); continue; }
    f.y += f.v * dt; f.x += Math.sin(ts / 700 + f.p) * .5; if (f.y > vh) { f.y = -4; f.x = Math.random() * vw; } c.fillStyle = sai === 3 ? 'rgba(255,255,255,.8)' : sai === 0 ? 'rgba(255,200,220,.75)' : 'rgba(216,130,60,.8)'; c.beginPath(); c.ellipse(f.x, f.y, f.s + (sai === 3 ? 0 : 1), f.s, f.p + ts / 800, 0, 6.3); c.fill(); }
}
function shade(h){ const n = parseInt(h.slice(1), 16), k = .55; return `rgb(${(n >> 16 & 255) * k | 0},${(n >> 8 & 255) * k | 0},${(n & 255) * k | 0})`; }

/* ---------- Pose ---------- */
let P = null, gille = null;   // P : {mode:'bat'|'chemin'|'defriche', k, x, y, info}
function casesValides(){ gille = null; if (!P || P.mode !== 'bat') return; const v = new Path2D(), b = new Path2D(); let vmax = 0; const L = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){ const p = J.placement(S, P.k, x, y); if (p.ok){ L.push([x, y, p.bonus || 1]); vmax = Math.max(vmax, p.bonus || 1); } }
  const s = BAT[P.k].s || 1;
  for (const [x, y, q] of L){ const t = vmax > 1.01 && q >= vmax * .9 ? b : v, a = (x - y) * 32, e = (x + y) * 16; t.moveTo(a, e); t.lineTo(a + 32 * s, e + 16 * s); t.lineTo(a, e + 32 * s); t.lineTo(a - 32 * s, e + 16 * s); t.closePath(); }
  gille = {v, b}; }
function dessinePose(){ if (!P) return; if (P.mode === 'bat'){
    if (gille){ c.fillStyle = 'rgba(245,236,214,.2)'; c.fill(gille.v); c.fillStyle = 'rgba(102,221,150,.5)'; c.fill(gille.b); }
    if (P.x !== undefined){ const s = BAT[P.k].s || 1, a = (P.x - P.y) * 32, b = (P.x + P.y + s) * 16; c.save(); c.translate(a, b); c.globalAlpha = .82; A.dessineBat(c, P.k, 1, null, J.saisonDe(S)); c.restore(); c.globalAlpha = 1; A.poly(c, [[a, b - 16 * s], [a + 32 * s, b], [a, b + 16 * s], [a - 32 * s, b]], P.info && P.info.ok ? 'rgba(102,221,150,.35)' : 'rgba(224,98,90,.45)'); } }
  else if (P.mode === 'defriche'){ c.fillStyle = 'rgba(245,236,214,.3)'; const D = J.dd(S); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){ const t = S.map[J.id(x, y)]; if ((t === 'f' || t === 'r') && J.dansTerr(S, x, y, D)){ const a = (x - y) * 32, b = (x + y) * 16; c.beginPath(); c.moveTo(a, b); c.lineTo(a + 32, b + 16); c.lineTo(a, b + 32); c.lineTo(a - 32, b + 16); c.closePath(); c.fill(); } } }
}
function debutPose(k){ const D = J.dd(S); if (k === 'chemin') P = {mode:'chemin'}; else if (k === 'defriche') P = {mode:'defriche'}; else P = {mode:'bat', k}; void D; casesValides(); panneau(null); majPose(); }
function finPose(){ P = null; gille = null; majPose(); }
function majPose(){ const el = $('#pose'); $('#cloche').hidden = !!P; if (!P){ el.hidden = true; return; } el.hidden = false;
  if (P.mode === 'chemin') el.innerHTML = `<div class="t"><b>Chemins</b><span>Glisse un doigt pour tracer, à deux doigts pour bouger la carte. Touche un chemin pour le retirer. 1 bois la case.</span></div><button class="btn" data-a="pose-fin">Terminé</button>`;
  else if (P.mode === 'defriche') el.innerHTML = `<div class="t"><b>Défricher</b><span>Touche une forêt (2 or) ou des roches (4 or) : tu récupères le bois ou la pierre.</span></div><button class="btn" data-a="pose-fin">Terminé</button>`;
  else { const d = BAT[P.k], c0 = J.cout(S, P.k, 1), ok = P.info && P.info.ok && J.peutPayer(S, c0); let msg = 'Touche une case. Les cases vertes sont les meilleures.';
    if (P.info){ if (!P.info.ok) msg = P.info.raison; else if (P.info.bonus && Math.abs(P.info.bonus - 1) > .01) msg = `Rendement ici : ${Math.round(P.info.bonus * 100)} %`; else msg = 'Bon emplacement'; }
    el.innerHTML = `<div class="t"><b>${esc(d.n)}</b><span>${msg}</span>${couts(c0)}</div><button class="btn sec" data-a="pose-fin">${P.fait ? 'Terminé' : 'Annuler'}</button><button class="btn" data-a="pose-ok"${ok ? '' : ' disabled'}>Bâtir</button>`; } }

/* ---------- Gestes sur la carte ---------- */
const doigts = new Map(); let geste = null, dernierC = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); doigts.set(e.pointerId, [e.clientX, e.clientY]);
  if (doigts.size === 1){ geste = {t:'un', x0:e.clientX, y0:e.clientY, cx:cam.x, cy:cam.y, bouge:false, tps:performance.now()}; dernierC = null; }
  else if (doigts.size === 2){ const [a, b] = [...doigts.values()]; geste = {t:'deux', d:Math.hypot(a[0] - b[0], a[1] - b[1]), z:cam.z, mx:(a[0] + b[0]) / 2, my:(a[1] + b[1]) / 2, cx:cam.x, cy:cam.y}; } });
cv.addEventListener('pointermove', e => { if (!doigts.has(e.pointerId)) return; doigts.set(e.pointerId, [e.clientX, e.clientY]); if (!geste) return;
  if (geste.t === 'un'){ const dx = e.clientX - geste.x0, dy = e.clientY - geste.y0; if (Math.hypot(dx, dy) > 8) geste.bouge = true;
    if (geste.bouge){ if (P && P.mode === 'chemin') traceChemin(e.clientX, e.clientY); else { cam.x = geste.cx - dx / cam.z; cam.y = geste.cy - dy / cam.z; bornes(); } } }
  else if (geste.t === 'deux' && doigts.size >= 2){ const [a, b] = [...doigts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; cam.z = geste.z * d / geste.d; bornes(); cam.x = geste.cx - (mx - geste.mx) / cam.z; cam.y = geste.cy - (my - geste.my) / cam.z; bornes(); } });
const finDoigt = e => { if (!doigts.has(e.pointerId)) return; doigts.delete(e.pointerId); if (geste && geste.t === 'un' && !geste.bouge && performance.now() - geste.tps < 500 && e.type === 'pointerup') toucher(e.clientX, e.clientY); if (doigts.size === 0) geste = null; else if (geste && geste.t === 'deux'){ const [a] = [...doigts.values()]; geste = {t:'un', x0:a[0], y0:a[1], cx:cam.x, cy:cam.y, bouge:true, tps:0}; } };
cv.addEventListener('pointerup', finDoigt); cv.addEventListener('pointercancel', finDoigt);
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), X = e.clientX - r.left, Y = e.clientY - r.top, [a, b] = versMonde(X, Y); cam.z *= Math.exp(-e.deltaY * .0016); bornes(); const [a2, b2] = versMonde(X, Y); cam.x += a - a2; cam.y += b - b2; bornes(); }, {passive:false});
function traceChemin(X, Y){ const [x, y] = versCase(X, Y); if (dernierC && dernierC[0] === x && dernierC[1] === y) return;
  const pose = (a, b) => { if (J.poserChemin(S, a, b)) son('pose'); };
  if (dernierC){ let [a, b] = dernierC, g = 0; while ((a !== x || b !== y) && g++ < 60){ if (a !== x && (b === y || Math.abs(x - a) >= Math.abs(y - b))) a += Math.sign(x - a); else b += Math.sign(y - b); pose(a, b); } } else pose(x, y);
  dernierC = [x, y]; }
function batimentSous(X, Y){ const [ci, cj] = versCase(X, Y); if (ci >= 0 && cj >= 0 && ci < W && cj < W){ const o = J.dd(S).occ[J.id(ci, cj)]; if (o) return o; } const [wx, wy] = versMonde(X, Y); const L = [...S.bats].sort((a, b) => (b.x + b.y) - (a.x + a.y)); for (const b of L){ const s = BAT[b.k].s || 1, [cx, cy] = centreB(b), h = BAT[b.k].h || 40; if (Math.abs(wx - cx) < 30 * s && wy > cy - h && wy < cy + 16 * s * .9) return b; } return null; }
function toucher(X, Y){ const [wx, wy] = versMonde(X, Y), proche = (x, y, r) => Math.hypot((x - wx) * cam.z, (y - wy) * cam.z) < r;
  if (fee && fee.sx !== undefined && proche(fee.sx, fee.sy, 42)){ const r = J.feeRecompense(S); flot(fee.sx, fee.sy - 12, r.buff ? 'Poussière de fée !' : '+' + fmt(Object.values(r.g)[0]), '#ffe08a'); if (r.buff) toast('Poussière de fée : production +30 % pendant 90 s'); fee = null; son('fee'); majHaut(); return; }
  for (const b of bulles) if (b.sx !== undefined && proche(b.sx, b.sy, 34)){ const g = J.cueillir(S, b.b); bulles = bulles.filter(x => x !== b); if (g) for (const [r, q] of Object.entries(g)) flot(b.sx, b.sy - 8, '+' + fmt(q), RS[r].c); son('cueille'); majHaut(); return; }
  const [x, y] = versCase(X, Y);
  if (P){ if (P.mode === 'chemin'){ if (J.retirerChemin(S, x, y)) son('pose'); else { dernierC = null; if (J.poserChemin(S, x, y)) son('pose'); } return; }
    if (P.mode === 'defriche'){ const c0 = J.coutDefricher(S, x, y); if (!c0) return; if (!J.dansTerr(S, x, y)){ toast('Hors du territoire'); return; } if (!J.peutPayer(S, c0)){ toast('Pas assez d\'or'); return; } const [a, b] = [(x - y) * 32, (x + y + 1) * 16]; if (J.defricher(S, x, y)){ flot(a, b - 14, 'Défriché', '#f5ecd6'); son('pose'); } return; }
    P.x = x; P.y = y; P.info = J.placement(S, P.k, x, y); majPose(); return; }
  const b = batimentSous(X, Y); if (b){ if (b.con > 0){ J.accelerer(S, b); const [a, e] = centreB(b); flot(a, e - 44, 'Plus vite !', '#ffe08a'); son('pose'); return; } panneau({bat:b.i}); return; }
  if (vw < 800) panneau(null); }

/* ---------- Haut de l'écran ---------- */
function taux(){ const D = J.dd(S), G = D.G || {}, t = Object.fromEntries(ORDRE.map(r => [r, 0])); if (!D.prods) return t;
  for (const p of D.prods){ if (p.b.off) continue; const f = p.f === undefined ? (D.travail || 1) : p.f; for (const r in p.p) t[r] += p.p[r] * f * (G[r] || 1); for (const r in p.x) t[r] -= p.x[r] * f; }
  t.or += S.pop * .03 * (G.or || 1); t.vivres -= S.pop * .04; return t; }
function majHaut(){ const D = J.dd(S), t = taux(), sai = SAISONS[J.saisonDe(S)];
  $('#titre b').textContent = `${PAL[S.palier - 1].n} d'Ambreval`; $('#titre span').textContent = `${sai.n}, jour ${S.st.jours + 1}`;
  const m = $('#msg'); m.hidden = !S.msg.length; if (S.msg.length){ const h = ico('lettre') + `<span class="n">${S.msg.length}</span>`; if (m.innerHTML !== h) m.innerHTML = h; }
  const par = [`<div class="res" data-a="onglet:royaume">${ico('pop', '#f1d3b0')}${Math.floor(S.pop)}<small>/${D.loge}</small></div>`, `<div class="res" data-a="onglet:royaume">${ico('joie', S.joie < 35 ? '#e0625a' : '#7ad0a0')}${Math.round(S.joie)}</div>`];
  for (const r of ORDRE){ if (!J.vu(S, r)) continue; const pl = S.r[r] >= J.capDe(S, r, D) - .5; par.push(`<div class="res${pl ? ' plein' : t[r] < -.005 ? ' baisse' : ''}" title="${RS[r].n}">${icoR(r)}${fmt(S.r[r])}<small>${pl ? 'plein' : (t[r] > 0 ? '+' : '') + fmtT(t[r])}</small></div>`); }
  const h = par.join(''); const z = $('#ress'); if (z.innerHTML !== h) z.innerHTML = h;
  const q = S.quetes.find(q2 => J.queteFaite(S, q2)) || S.quetes[0], Qe = $('#quete');
  if (q){ const f = J.queteFaite(S, q); Qe.hidden = !!P; Qe.className = f ? 'fait' : ''; Qe.dataset.a = f ? `quete:${q.i}` : 'onglet:royaume'; const prog = q.but > 1 && !f && q.ty !== 'pal' ? ` ${fmt(Math.min(J.valeurQuete(S, q), q.but))}/${fmt(q.but)}` : ''; const lh = `<span>${f ? 'Récompense : ' + Object.entries(q.rec).map(([r, n]) => `${icoR(r)} ${fmt(n)}`).join(' ') : esc(q.tx)}</span>${prog ? `<span class="pr">${prog}</span>` : ''}`; if (Qe.innerHTML !== lh) Qe.innerHTML = lh; }
  else Qe.hidden = true;
  const cl = $('#cloche'), h2 = S.cloche > 0 ? `<span>${Math.ceil(S.cloche)}</span>` : ico('cloche'); cl.disabled = S.cloche > 0; if (cl.innerHTML !== h2) cl.innerHTML = h2;
  majPuces(); }

/* ---------- Onglets ---------- */
const ONG = [['batir', 'Bâtir', 'batir', '#f2b544'], ['savoir', 'Savoir', 'savoir', '#8fc4ee'], ['commerce', 'Commerce', 'commerce', '#6fd0a4'], ['magie', 'Magie', 'mana', '#b79af2'], ['royaume', 'Royaume', 'royaume', '#f3a08f']];
$('#onglets').innerHTML = ONG.map(([k, n, i, t]) => `<button role="tab" id="o-${k}" style="--t:${t}" data-a="onglet:${k}" aria-selected="false">${ico(i)}<span>${n}</span></button>`).join('');
function majPuces(){ const D = J.dd(S), a = (k, v) => { const el = $('#o-' + k); let p = el.querySelector('.n'); if (v && !p){ p = document.createElement('span'); p.className = 'n'; el.appendChild(p); } if (!v && p) p.remove(); };
  a('royaume', J.peutMonter(S) || S.quetes.some(q => J.queteFaite(S, q))); a('commerce', S.contrats.some(x => S.r[x.r] >= x.q)); a('savoir', !S.cour && D && Object.keys(RECH).some(k => J.rechOk(S, k) && S.r.savoir >= RECH[k].c)); a('magie', false); }
let vue = null, catB = 'tout', gel = false, memVue = '';
function panneau(v){ vue = v; memVue = ''; const pa = $('#pano'), desk = document.documentElement.classList.contains('desk');
  if (!v && desk) { vue = v = {o:'batir'}; }
  pa.classList.toggle('cache', !v); ONG.forEach(([k]) => $('#o-' + k).setAttribute('aria-selected', v && v.o === k ? 'true' : 'false'));
  if (v){ $('#corps').scrollTop = 0; rendre(); } }
const tete = (t, s, ret) => `${ret ? `<button class="retourP" data-a="${ret}" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>` : ''}<h2>${t}${s ? `<span class="sous">${s}</span>` : ''}</h2><button class="fermer tel" data-a="ferme" aria-label="Fermer">×</button>`;
function pose(h, c2){ if (gel) return; const K = h + c2; if (K === memVue) return; memVue = K; $('#tete').innerHTML = h; $('#corps').innerHTML = c2; }
function rendre(){ if (!vue) return; const fn = vue.bat ? vueBat : {batir:vueBatir, savoir:vueSavoir, commerce:vueCommerce, magie:vueMagie, royaume:vueRoyaume}[vue.o]; if (fn) fn(); }

const CATS = [['tout', 'Tout'], ['1', 'Logis'], ['2', 'Récoltes'], ['3', 'Ateliers'], ['4', 'Bien-être'], ['5', 'Savoir et magie'], ['6', 'Merveille'], ['o', 'Terrain']];
function vueBatir(){ const D = J.dd(S); let h = '';
  const L = Object.keys(BAT).filter(k => k !== 'salle' && (catB === 'tout' || String(BAT[k].cat) === catB));
  if (catB === 'tout' || catB === 'o') h += `<button class="ligne" data-a="pose:chemin"><img src="${vignetteChemin()}" alt=""><span class="t"><b>Chemin</b><span>Relier un bâtiment à la Grande Salle lui donne +${Math.round(D.chemin * 100)} % de production. Trace-en tant que tu veux.</span><span class="couts"><span class="cout">${icoR('bois')}1 la case</span></span></span></button><button class="ligne" data-a="pose:defriche"><img src="${vignetteDef()}" alt=""><span class="t"><b>Défricher</b><span>Libère les forêts et les roches, et rapporte du bois ou de la pierre.</span></span></button>`;
  for (const k of L){ const d = BAT[k], ouvertB = S.palier >= d.t, dejaU = d.unique && J.compteK(S, k); if (k === 'fleche' && !ouvertB && S.palier < 4) continue;
    if (!ouvertB && d.t > S.palier + 1) continue;
    const c0 = !ouvertB || dejaU ? null : J.cout(S, k, 1);
    h += `<button class="ligne${ouvertB && !dejaU ? '' : ' off'}" ${ouvertB && !dejaU ? `data-a="pose:${k}"` : ''}><img src="${A.vignette(k)}" alt=""><span class="t"><b>${esc(d.n)}${J.compteK(S, k) && !d.unique ? ` <small style="font-weight:500;color:var(--brume)">×${J.compteK(S, k)}</small>` : ''}</b><span>${esc(d.desc)}</span>${ouvertB ? (dejaU ? '<span>Déjà bâtie</span>' : (k === 'fleche' ? couts(J.cout(S, k, 1) || {}) : couts(c0))) : `<span class="cout">Au palier ${PAL[d.t - 1].n}</span>`}</span></button>`; }
  pose(tete('Bâtir', `${PAL[S.palier - 1].n}, territoire de ${D.R * 2 + 2} cases`), `<div class="chips">${CATS.map(([c1, n]) => `<button data-a="cat:${c1}" aria-pressed="${c1 === catB}">${n}</button>`).join('')}</div>` + h); }
let _vigC, _vigD;
function vignetteChemin(){ if (_vigC) return _vigC; const q = document.createElement('canvas'); q.width = q.height = 116; const x = q.getContext('2d'); x.scale(2, 2); x.translate(29, 30); A.poly(x, [[0, -16], [32, 0], [0, 16], [-32, 0]], '#7fae5c'); A.poly(x, [[0, -10], [20, 0], [0, 10], [-20, 0]], '#d8c08e'); return _vigC = q.toDataURL(); }
function vignetteDef(){ if (_vigD) return _vigD; const q = document.createElement('canvas'); q.width = q.height = 116; const x = q.getContext('2d'); x.scale(2, 2); x.translate(29, 34); A.poly(x, [[0, -16], [32, 0], [0, 16], [-32, 0]], '#7fae5c'); x.fillStyle = '#6a4a2a'; x.beginPath(); x.ellipse(-2, 0, 7, 4, 0, 0, 6.3); x.fill(); x.fillStyle = '#d8b184'; x.beginPath(); x.ellipse(-2, -1, 5, 2.8, 0, 0, 6.3); x.fill(); x.strokeStyle = '#7a4f28'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, 2); x.lineTo(16, -16); x.stroke(); x.fillStyle = '#b8bcc4'; x.beginPath(); x.moveTo(11, -18); x.lineTo(21, -18); x.lineTo(20, -10); x.lineTo(13, -12); x.fill(); return _vigD = q.toDataURL(); }

function vueBat(){ const b = S.bats.find(x => x.i === vue.bat); if (!b){ panneau(null); return; } const D = J.dd(S), d = BAT[b.k], rec = D.vers.get(b); let h = `<p class="note">${esc(d.desc)}</p>`;
  if (rec){ if (Object.keys(rec.p).length) h += `<div class="stat"><span>Produit</span><b>${Object.entries(rec.p).map(([r, q]) => `${icoR(r)} ${fmtT(q * ((D.G || {})[r] || 1))}/s`).join(' ')}</b></div>`;
    if (Object.keys(rec.x).length) h += `<div class="stat"><span>Consomme</span><b>${Object.entries(rec.x).map(([r, q]) => `${icoR(r)} ${fmtT(q)}/s`).join(' ')}</b></div>`;
    if (rec.j) h += `<div class="stat"><span>Emplois</span><b>${rec.j} ${D.travail < .999 ? `(main-d'œuvre ${Math.round(D.travail * 100)} %)` : ''}</b></div>`;
    if (Math.abs(rec.adj - 1) > .01) h += `<div class="stat"><span>Rendement de l'emplacement</span><b>${Math.round(rec.adj * 100)} %</b></div>`;
    if (d.p && b.k !== 'salle') h += `<div class="stat"><span>Relié par un chemin</span><b>${rec.rel ? `Oui, +${Math.round(D.chemin * 100)} %` : 'Non'}</b></div>`;
    if (d.l) h += `<div class="stat"><span>Logements</span><b>${d.l * b.n}</b></div>`; }
  if (b.k === 'salle'){ h += blocPalier(); }
  const cible = b.n + 1, max = J.maxNiveau(S, b.k);
  if (b.con > 0) h += `<div class="stat"><span>Chantier</span><b>${duree(b.con)}</b></div><div class="pb"><i style="width:${(1 - b.con / b.tot) * 100}%"></i></div><p class="note" style="margin-top:8px">Touche le chantier sur la carte pour l'accélérer.</p>`;
  else if (b.k !== 'salle'){ if (cible <= max){ const c2 = J.cout(S, b.k, cible); h += `<div class="g">${b.k === 'fleche' ? 'Étape' : 'Niveau'} ${cible}</div>${couts(c2)}<div class="rangs"><button class="btn large" data-a="amel:${b.i}"${J.peutPayer(S, c2) ? '' : ' disabled'}>${b.k === 'fleche' ? 'Poursuivre la Flèche' : 'Améliorer'}</button></div>`; if (Object.entries(c2).some(([r, q]) => q > J.capDe(S, r, D))) h += `<p class="note" style="margin-top:8px">Tes entrepôts sont trop petits pour ce coût.</p>`; }
    else h += `<p class="note">Niveau maximal${S.palier < 5 && !d.max ? ' pour ce palier' : ''}.</p>`; }
  if (!d.unique) h += `<div class="rangs"><button class="btn sec" data-a="off:${b.i}">${b.off ? 'Remettre en service' : 'Mettre à l\'arrêt'}</button><button class="btn dan" data-a="demol:${b.i}">Démolir</button></div>`;
  pose(tete(esc(d.n), `${b.k === 'fleche' ? 'Étape' : 'Niveau'} ${b.n} sur ${max}${b.off ? ', à l\'arrêt' : ''}`), h); }
function blocPalier(){ const p = PAL[S.palier]; if (!p) return `<p class="note">Ambreval est à son apogée. Reste la Flèche d'Ambre.</p>`; const D = J.dd(S), trop = Object.entries(p.c).filter(([r, q]) => q > J.capDe(S, r, D));
  return `<div class="g">Devenir ${esc(p.n)}</div><div class="stat"><span>Population</span><b style="${S.pop < p.pop ? 'color:var(--rubis)' : ''}">${Math.floor(S.pop)}/${p.pop}</b></div>${couts(p.c)}${trop.length ? `<p class="note" style="margin-top:8px">Stock maximal insuffisant pour ${trop.map(([r]) => RS[r].n.toLowerCase()).join(', ')} : bâtis ou améliore des entrepôts.</p>` : ''}<div class="rangs"><button class="btn large" data-a="palier"${J.peutMonter(S) ? '' : ' disabled'}>Faire grandir la Grande Salle</button></div>`; }

function vueSavoir(){ const D = J.dd(S); void D; let h = '';
  if (!S.bats.some(b => b.k === 'biblio' && b.n > 0)) h += `<p class="note">${S.palier < 2 ? 'Le savoir s\'ouvre au palier Bourg, avec la bibliothèque.' : 'Bâtis une bibliothèque pour produire du savoir.'}</p>`;
  if (S.cour){ const R = RECH[S.cour.k]; h += `<div class="lettre" style="--c:#8fc4ee"><b>${esc(R.n)}</b><div class="pb"><i style="width:${(1 - S.cour.r / S.cour.tot) * 100}%"></i></div><small>Encore ${duree(S.cour.r)}</small></div>`; }
  for (const br of ['Terres', 'Ouvrages', 'Négoce', 'Arcanes', 'Cité']){ const L = Object.entries(RECH).filter(([, R]) => R.b === br && (R.t <= S.palier + 1)); if (!L.length) continue; h += `<div class="g">${br}</div>`;
    for (const [k, R] of L){ const f = S.fait[k], cour = S.cour && S.cour.k === k, ok = J.rechOk(S, k), peu = ok && !S.cour && S.r.savoir >= R.c, verrou = !f && !ok ? (S.palier < R.t ? `Au palier ${PAL[R.t - 1].n}` : `Après ${(R.dep || []).filter(d => !S.fait[d]).map(d => RECH[d].n).join(', ')}`) : '';
      h += `<button class="ligne${f || !ok ? ' off' : ''}" ${peu ? `data-a="rech:${k}"` : ''}><span class="t"><b>${esc(R.n)}${f ? ' ✓' : ''}</b><span>${esc(R.d)}</span>${f ? '' : cour ? '<span>En cours</span>' : verrou ? `<span>${esc(verrou)}</span>` : `<span class="couts"><span class="cout${S.r.savoir < R.c ? ' ko' : ''}">${icoR('savoir')}${fmt(R.c)}</span><span class="cout">${duree(R.sec)}</span></span>`}</span></button>`; } }
  pose(tete('Savoir', `${icoR('savoir')} ${fmt(S.r.savoir)}`), h); }

function vueCommerce(){ if (vue.roy) return vueRoy(vue.roy);
  const D = J.dd(S); let h = ''; const mar = S.bats.some(b => b.k === 'marche' && b.n > 0);
  if (!mar){ h += `<p class="note">${S.palier < 2 ? 'Le commerce s\'ouvre au palier Bourg, avec le marché.' : 'Bâtis un marché pour envoyer des caravanes.'}</p>`; }
  else { h += `<div class="g">Caravanes ${S.car.length}/${D.carSlots}</div>`; if (!S.car.length) h += `<p class="note">Aucune caravane en route. Choisis un royaume pour acheter ou vendre.</p>`;
    for (const x of S.car) h += `<div style="padding:5px 0"><div class="stat" style="padding:0"><span>${x.sens === 'v' ? 'Vente' : 'Achat'} ${icoR(x.r)} ${fmt(x.q)} à ${esc(ROY[x.k].n)}</span><b>${duree(x.rest)}</b></div><div class="pb"><i style="width:${(1 - x.rest / x.tot) * 100}%"></i></div></div>`;
    if (S.contrats.length){ h += `<div class="g">Contrats</div>`; for (const x of S.contrats){ const ok = S.r[x.r] >= x.q; h += `<div class="lettre" style="--c:${ROY[x.k].hue}"><p>${esc(x.voix)} ${fmt(x.q)} ${esc(RS[x.r].n.toLowerCase())}.</p><small>${esc(ROY[x.k].n)}, encore ${duree(x.reste)}</small><div class="rangs"><button class="btn large" data-a="contrat:${x.i}"${ok ? '' : ' disabled'}>Livrer ${icoR(x.r)} ${fmt(x.q)} contre ${icoR('or')} ${fmt(x.or)}</button></div></div>`; } }
    h += `<div class="g">Royaumes</div>`;
    for (const [k, Z] of Object.entries(ROY)){ const R = S.rois[k], ouv = J.royOuvert(S, k); if (!ouv){ h += `<div class="ligne off"><span class="t"><b>${esc(Z.n)}</b><span>Se révèle au palier ${PAL[Z.t - 1].n}</span></span></div>`; continue; }
      const bon = Z.moins.filter(r => J.vu(S, r)).sort((a, b) => J.prixCentre(S, k, b) / RS[b].v - J.prixCentre(S, k, a) / RS[a].v)[0];
      h += `<button class="ligne" data-a="roy:${k}"><span class="t"><b style="color:${Z.hue}">${esc(Z.n)}</b><span>${esc(Z.peuple)}, ${duree(J.dureeTrajet(S, k))} de route${bon ? `, paie bien : ${esc(RS[bon].n.toLowerCase())}` : ''}</span><div class="pb"><i style="width:${R.rep}%;background:${Z.hue}"></i></div></span></button>`; }
    if (S.gaz.length){ h += `<div class="g">Nouvelles des royaumes</div>`; for (const t of S.gaz.slice(0, 6)) h += `<div class="gaz">${esc(t)}</div>`; } }
  pose(tete('Commerce', mar ? `${icoR('or')} ${fmt(S.r.or)}` : ''), h); }
function vueRoy(k){ const Z = ROY[k], R = S.rois[k], D = J.dd(S); let h = `<p class="note">${esc(Z.peuple)}. Réputation ${Math.round(R.rep)}/100 : plus elle monte, plus l'écart entre prix d'achat et de vente se réduit. Chaque échange fait bouger les prix.</p>`;
  if (R.ev) h += `<p class="note" style="color:var(--ambre)">En ce moment : ${esc(RS[R.ev.r].n.toLowerCase())} à ×${R.ev.m.toFixed(1).replace('.', ',')}.</p>`;
  h += `<div class="stat" style="font-size:.78rem"><span>Ressource</span><b style="color:var(--brume);font-weight:500">Prix unitaire</b></div>`;
  for (const r of Object.keys(R.s)){ if (!J.vu(S, r)) continue; const achat = J.devis(S, k, r, 100, 'a') / 100, vente = J.devis(S, k, r, 100, 'v') / 100, route = S.routes.some(x => x.k === k && x.r === r);
    h += `<div class="prix"><div class="n">${icoR(r)}<div>${esc(RS[r].n)}<small>Stock ${fmt(R.s[r])}${R.ev && R.ev.r === r ? '<span class="ev">, événement</span>' : ''}</small></div></div><button class="btn sec" data-a="ech:${k}:${r}:a"><span>Acheter</span><small>${icoR('or')} ${fmtT(achat)}</small></button><button class="btn" data-a="ech:${k}:${r}:v"><span>Vendre</span><small>${icoR('or')} ${fmtT(vente)}</small></button></div>`;
    if (D.routes) h += `<button class="ligne" data-a="route:${k}:${r}" style="padding:4px 0"><span class="t"><span>${route ? '✓ Route active : vend les surplus au-delà de 80 % du stock' : 'Ouvrir une route vers ce royaume (4 au plus)'}</span></span></button>`; }
  pose(tete(esc(Z.n), `${duree(J.dureeTrajet(S, k))} de route, ${S.car.length}/${D.carSlots} caravanes`, 'retour-commerce'), h); }
function ouvrirEchange(k, r, sens){ const max0 = sens === 'v' ? Math.floor(S.r[r]) : (() => { let lo = 0, hi = J.carMax(S); while (lo < hi){ const m = Math.ceil((lo + hi) / 2); if (J.devis(S, k, r, m, 'a') <= S.r.or) lo = m; else hi = m - 1; } return Math.min(lo, Math.floor(J.capDe(S, r) - S.r[r]), Math.floor(S.rois[k].s[r] * .92)); })(), max = Math.max(0, Math.min(max0, J.carMax(S)));
  if (J.carLibres(S) <= 0){ toast('Toutes tes caravanes sont en route'); return; } if (max <= 0){ toast(sens === 'v' ? 'Tu n\'en as pas assez' : 'Pas assez d\'or ou de place en stock'); return; }
  const def = Math.max(1, Math.round(max / 2));
  modale(`<h3>${sens === 'v' ? 'Vendre' : 'Acheter'} ${esc(RS[r].n.toLowerCase())}</h3><p>${esc(ROY[k].n)}, ${duree(J.dureeTrajet(S, k))} de route.</p><input type="range" id="qte" min="1" max="${max}" value="${def}" aria-label="Quantité"><div class="stat"><span>Quantité</span><b id="qv"></b></div><div class="stat"><span>${sens === 'v' ? 'Tu recevras' : 'Tu paieras'}</span><b id="qo"></b></div><div class="col"><button class="btn large" id="qg">Envoyer la caravane</button><button class="btn sec large" data-a="fm">Annuler</button></div>`);
  const maj = () => { const q = +$('#qte').value; $('#qv').innerHTML = `${icoR(r)} ${fmt(q)}`; $('#qo').innerHTML = `${icoR('or')} ${fmt(J.devis(S, k, r, q, sens))}`; }; maj(); $('#qte').addEventListener('input', maj);
  $('#qg').addEventListener('click', () => { if (J.caravane(S, k, r, +$('#qte').value, sens)){ son('pose'); toast('Caravane en route'); fermerModale(); memVue = ''; rendre(); } else toast('Caravane impossible'); }); }

function vueMagie(){ const sa = S.palier >= 3; let h = ''; if (!sa) h += `<p class="note">La magie s'ouvre au palier Ville, avec la tour de mage.</p>`;
  if (S.buffs.length){ h += `<div class="g">Effets en cours</div>`; for (const b of S.buffs) h += `<div class="stat"><span>${esc(b.n || '')}</span><b>${duree(b.r)}</b></div>`; }
  if (sa){ h += `<div class="g">Sorts</div>`; for (const [k, s] of Object.entries(SORTS)){ const ok = J.sortOk(S, k), cd = S.cd[k] || 0, peu = ok && !cd && S.r.mana >= s.c; if (s.t > S.palier + 1) continue;
      h += `<button class="ligne${ok ? '' : ' off'}" ${peu ? `data-a="sort:${k}"` : ''}><span class="t"><b>${esc(s.n)}</b><span>${esc(s.d)}</span>${ok ? `<span class="couts"><span class="cout${S.r.mana < s.c ? ' ko' : ''}">${icoR('mana')}${s.c}</span>${cd ? `<span class="cout">Prêt dans ${duree(cd)}</span>` : ''}</span>` : `<span>${S.palier < s.t ? `Au palier ${PAL[s.t - 1].n}` : `Recherche : ${esc(RECH[s.rech].n)}`}</span>`}</span></button>`; } }
  pose(tete('Magie', sa ? `${icoR('mana')} ${fmt(S.r.mana)}` : ''), h); }

function vueRoyaume(){ const D = J.dd(S); let h = blocPalierCourt(); h += `<div class="g">Requêtes</div>`;
  for (const q of S.quetes){ const f = J.queteFaite(S, q), v = Math.min(J.valeurQuete(S, q), q.but); h += `<div class="ligne"><span class="t"><b>${esc(q.tx)}</b><span class="couts">${Object.entries(q.rec).map(([r, n]) => `<span class="cout">${icoR(r)}${fmt(n)}</span>`).join('')}${q.but > 1 && q.ty !== 'pal' ? `<span class="cout">${fmt(v)}/${fmt(q.but)}</span>` : ''}</span></span>${f ? `<button class="btn" data-a="quete:${q.i}">Prendre</button>` : ''}</div>`; }
  h += `<div class="g">La vallée</div><div class="stat"><span>Population</span><b>${Math.floor(S.pop)}/${D.loge}</b></div><div class="stat"><span>Bonheur</span><b>${Math.round(S.joie)}/100, production ×${(D.joieM || 1).toFixed(2).replace('.', ',')}</b></div><div class="stat"><span>Main-d'œuvre</span><b>${Math.floor(S.pop)} pour ${D.jobs} emplois</b></div><div class="stat"><span>Hors ligne</span><b>${Math.round(D.hl / 3600)} h de production au plus</b></div>${S.ambre ? `<div class="stat"><span>Ambre</span><b>${S.ambre}, production +${S.ambre * 2} %</b></div>` : ''}${S.faim > 0 ? `<p class="note" style="color:var(--rubis)">Les greniers sont vides : bâtis une ferme ou une pêcherie.</p>` : ''}`;
  if (S.palier >= 2){ h += `<div class="g">Classement des royaumes</div>`; J.classement(S).forEach((e, i) => { h += `<div class="stat"><span style="${e.moi ? 'color:var(--ambre);font-weight:600' : ''}">${i + 1}. ${esc(e.n)}</span><b>${fmt(e.p)}</b></div>`; }); }
  if (J.peutRenaitre(S)) h += `<div class="g">Une nouvelle vallée</div><p class="note">La Flèche est achevée. Fonde une nouvelle vallée : tout recommence, mais tu gardes ${J.gainAmbre(S)} ambre de plus (+2 % de production chacun, pour toujours).</p><button class="btn large" data-a="renaitre">Fonder une nouvelle vallée</button>`;
  h += `<div class="g">Réglages</div><div class="rangs"><button class="btn sec" data-a="son">${S.son ? 'Couper le son' : 'Activer le son'}</button><button class="btn sec" data-a="export">Exporter</button><button class="btn sec" data-a="import">Importer</button></div><div class="rangs"><button class="btn dan large" data-a="reset">Recommencer une partie</button></div><p class="note" style="margin-top:10px">Ta partie reste sur cet appareil. Exporter donne un code pour la reprendre ailleurs.</p>`;
  pose(tete(`${PAL[S.palier - 1].n} d'Ambreval`, `Prestige ${fmt(J.prestige(S))}`), h); }
function blocPalierCourt(){ return blocPalier(); }

/* ---------- Actions ---------- */
document.addEventListener('pointerdown', e => { if (e.target.closest('#pano')) gel = true; }, true);
const degel = () => setTimeout(() => { gel = false; }, 60); document.addEventListener('pointerup', degel, true); document.addEventListener('pointercancel', degel, true);
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const [a, x, y, z] = el.dataset.a.split(':'); agir(a, x, y, z); });
function agir(a, x, y, z){ initSon(); memVue = '';
  switch (a){
    case 'onglet': if (vue && vue.o === x && !vue.roy && vw < 800){ panneau(null); return; } panneau({o:x}); return;
    case 'ferme': panneau(null); return;
    case 'cat': catB = x; rendre(); return;
    case 'pose': if (x !== 'chemin' && x !== 'defriche' && !J.peutPayer(S, J.cout(S, x, 1))){ toast('Pas assez de ressources'); return; } debutPose(x); return;
    case 'pose-fin': finPose(); panneau(document.documentElement.classList.contains('desk') ? {o:'batir'} : null); return;
    case 'pose-ok': if (P && P.x !== undefined && J.batir(S, P.k, P.x, P.y)){ son('pose'); const k = P.k; P.x = P.y = undefined; P.info = null; P.fait = true; if (!J.peutPayer(S, J.cout(S, k, 1)) || BAT[k].unique) finPose(); else { casesValides(); majPose(); } } return;
    case 'amel': { const b = S.bats.find(o => o.i === +x); if (b && J.ameliorer(S, b)){ son('pose'); rendre(); } return; }
    case 'palier': if (J.monterPalier(S)){ son('fee'); toast(`La Grande Salle s'agrandit : bientôt ${PAL[S.palier].n}`); rendre(); } return;
    case 'off': { const b = S.bats.find(o => o.i === +x); if (b){ b.off = !b.off; J.inv(S); rendre(); } return; }
    case 'demol': { const b = S.bats.find(o => o.i === +x); if (!b) return; modale(`<h3>Démolir ${esc(BAT[b.k].n)} ?</h3><p>Tu récupères 40 % du dernier coût.</p><div class="col"><button class="btn dan large" data-a="demol2:${b.i}">Démolir</button><button class="btn sec large" data-a="fm">Garder</button></div>`); return; }
    case 'demol2': { const b = S.bats.find(o => o.i === +x); if (b){ J.demolir(S, b); bulles = bulles.filter(o => o.b !== b); } fermerModale(); panneau(null); return; }
    case 'rech': if (J.chercher(S, x)){ son('pose'); rendre(); } return;
    case 'sort': { const r = J.lancer(S, x); if (r){ son('fee'); if (r && r.n !== undefined) toast(r.n ? `${r.n} forêts ont poussé` : 'Aucune place pour de nouvelles forêts'); else toast(`${SORTS[x].n} lancé`); rendre(); } return; }
    case 'roy': vue = {o:'commerce', roy:x}; memVue = ''; $('#corps').scrollTop = 0; rendre(); return;
    case 'retour-commerce': vue = {o:'commerce'}; memVue = ''; rendre(); return;
    case 'ech': ouvrirEchange(x, y, z); return;
    case 'route': if (J.basculerRoute(S, x, y)) rendre(); else toast('4 routes au plus'); return;
    case 'contrat': { const q = S.contrats.find(o => o.i === +x); if (q && J.contratHonorer(S, q)){ son('fee'); toast('Contrat honoré'); rendre(); } return; }
    case 'quete': { const q = S.quetes.find(o => o.i === +x); if (q){ const g = J.encaisserQuete(S, q); if (g){ son('fee'); toast('Requête accomplie : ' + recettes(g)); majHaut(); rendre(); } } return; }
    case 'fm': fermerModale(); return;
    case 'msg': { const m = S.msg[+x]; if (!m) { fermerModale(); return; } const r = J.repondre(S, m, +y); if (r){ fermerModale(); son('pose'); majHaut(); ouvrirMsg(); } else toast('Pas assez de ressources'); return; }
    case 'son': S.son = !S.son; initSon(); rendre(); return;
    case 'export': { const code = btoa(unescape(encodeURIComponent(JSON.stringify({...S, t:Date.now()})))); modale(`<h3>Exporter la partie</h3><p>Copie ce code et colle-le dans Importer sur l'autre appareil.</p><textarea readonly id="cd">${code}</textarea><div class="col"><button class="btn large" id="cp">Copier le code</button><button class="btn sec large" data-a="fm">Fermer</button></div>`); $('#cp').addEventListener('click', async () => { try{ await navigator.clipboard.writeText(code); toast('Code copié'); }catch{ $('#cd').select(); toast('Sélectionne le code pour le copier'); } }); return; }
    case 'import': modale(`<h3>Importer une partie</h3><p>Colle le code d'export. La partie actuelle sera remplacée.</p><textarea id="cd" placeholder="Code d'export"></textarea><div class="col"><button class="btn large" id="ip">Importer</button><button class="btn sec large" data-a="fm">Annuler</button></div>`); $('#ip').addEventListener('click', () => { try{ const N = J.charger(decodeURIComponent(escape(atob($('#cd').value.trim())))); S = N; J.rattraper(S); sale = true; sig = ''; sauver(); fermerModale(); panneau(null); toast('Partie importée'); }catch{ toast('Code illisible : vérifie qu\'il est complet'); } }); return;
    case 'reset': modale(`<h3>Recommencer ?</h3><p>Toute la progression de cette vallée sera effacée.</p><div class="col"><button class="btn dan large" data-a="reset2">Effacer et recommencer</button><button class="btn sec large" data-a="fm">Annuler</button></div>`); return;
    case 'reset2': S = J.nouvelle(0, {ambre:0, ren:0, son:S.son}); bulles = []; gens = []; sale = true; sauver(); fermerModale(); panneau(null); return;
    case 'renaitre': { const N = J.renaitre(S); if (N){ S = N; bulles = []; gens = []; sale = true; sauver(); panneau(null); toast('Une nouvelle vallée s\'offre à toi'); } return; }
  }
}
function ouvrirMsg(){ if (!S.msg.length) return; const m = S.msg[0], e = J.msgDe(m), k = m.e; const lig = (o, i) => { const cs = o.c ? Object.fromEntries(Object.entries(o.c).map(([r, q]) => [r, q * k])) : null, gs = o.g ? Object.fromEntries(Object.entries(o.g).map(([r, q]) => [r, q * k])) : null, ok = !cs || J.peutPayer(S, cs); return `<button class="btn large${i ? ' sec' : ''}" data-a="msg:0:${i}"${ok ? '' : ' disabled'} style="flex-direction:column;padding:8px 14px;line-height:1.25"><span>${esc(o.l)}</span>${cs || gs || o.buff ? `<small style="font-weight:500">${cs ? Object.entries(cs).map(([r, q]) => `${icoR(r)} -${fmt(q)}`).join(' ') : ''} ${gs ? Object.entries(gs).map(([r, q]) => `${icoR(r)} +${fmt(q)}`).join(' ') : ''}${o.buff ? ` ${esc(o.buff.n)}, ${o.buff.r} s` : ''}</small>` : ''}</button>`; };
  modale(`<h3>${esc(e.ti)}</h3><p style="font-family:var(--f-titre);font-size:1.02rem">${esc(e.tx)}</p><div class="col">${e.a.map(lig).join('')}</div>`); }
$('#msg').addEventListener('click', () => { initSon(); ouvrirMsg(); });
$('#cloche').addEventListener('click', () => { initSon(); const g = J.sonnerCloche(S); if (!g) return; son('cloche'); const [x, y] = centreB(S.bats[0]); let i = 0; for (const [r, q] of Object.entries(g)) flot(x + (i++ - 1) * 36, y - 60, '+' + fmt(q), RS[r].c); majHaut(); });

/* ---------- Son ---------- */
let AC = null, tMus = 0;
function initSon(){ if (!S.son || AC) { if (AC && AC.state === 'suspended') AC.resume(); return; } try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }catch{ AC = null; } }
function note(f, t = .22, vol = .06, type = 'triangle'){ if (!AC || !S.son) return; const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(.0005, n + t); o.connect(g).connect(AC.destination); o.start(n); o.stop(n + t + .02); }
const son = k => ({pose:() => note(330, .12), cueille:() => { note(660, .1); setTimeout(() => note(880, .12), 60); }, fee:() => { note(784, .16); setTimeout(() => note(988, .16), 90); setTimeout(() => note(1319, .22), 180); }, cloche:() => { note(523, .9, .1, 'sine'); note(784, .7, .05, 'sine'); }}[k] || (() => {}))();
const GAMME = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3];
function musique(dt){ if (!AC || !S.son) return; tMus -= dt; if (tMus <= 0){ tMus = 1.4 + Math.random() * 3.2; note(GAMME[Math.floor(Math.random() * GAMME.length)], 1.2, .025); if (Math.random() < .4) setTimeout(() => note(GAMME[Math.floor(Math.random() * 4)] / 2, 1.6, .02), 180); } }

/* ---------- Boucle ---------- */
let t0 = performance.now(), cumul = 0, uiT = 0, svT = 0, finiT = new Set();
function boucle(ts){ requestAnimationFrame(boucle); if (document.hidden) return; let dt = Math.min(.25, (ts - t0) / 1000); if (ts - t0 < 30) return; t0 = ts; if (dt < 0) dt = 0;
  cumul += dt; while (cumul >= .25){ cumul -= .25; const avant = S.bats.filter(b => b.con > 0).map(b => b); const fa = S.fait, ca = S.cour && S.cour.k; J.avancer(S, .25); S.t = Date.now(); for (const b of avant) if (b.con <= 0){ const [x, y] = centreB(b); flot(x, y - 50, b.k === 'salle' ? PAL[S.palier - 1].n + ' !' : 'Terminé', '#ffe08a'); son('fee'); if (b.k === 'salle') toast(`Te voici ${PAL[S.palier - 1].n} : de nouveaux bâtiments t'attendent`); } if (ca && !S.cour && fa[ca]) toast(`Recherche terminée : ${RECH[ca].n}`); }
  tBulle -= dt; if (tBulle <= 0){ tBulle = 6 + Math.random() * 10; nouvelleBulle(); }
  bulles = bulles.filter(b => { b.t -= dt; return b.t > 0 && S.bats.includes(b.b); });
  tFee -= dt; if (tFee <= 0 && !fee){ tFee = 110 + Math.random() * 130; const b = S.bats[Math.floor(Math.random() * S.bats.length)], [x, y] = centreB(b); fee = {x, y:y - 40, a:0, t:22}; }
  if (fee && (fee.t -= dt) <= 0) fee = null;
  appelGens(); bougeGens(dt); musique(dt);
  dessine(ts, dt);
  uiT += dt; if (uiT >= .5){ uiT = 0; majHaut(); rendre(); if (P && P.mode === 'bat') majPoseCout(); }
  svT += dt; if (svT >= 20){ svT = 0; sauver(); } }
function majPoseCout(){ const b = $('#pose [data-a="pose-ok"]'); if (b && P && P.info){ const ok = P.info.ok && J.peutPayer(S, J.cout(S, P.k, 1)); b.disabled = !ok; } }
addEventListener('pagehide', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); else { const r = J.rattraper(S); t0 = performance.now(); if (r.ecoule > 90) bilan(r); } });
document.querySelector('.retour').addEventListener('click', sauver);
function bilan(r){ const L = Object.entries(r.gains).filter(([, q]) => q >= 1); if (!L.length && r.pop < 1) return; modale(`<h3>Pendant ton absence</h3><p>La vallée a travaillé ${duree(r.dur)}${r.plafond ? ` (ton absence a duré ${duree(r.ecoule)} : le travail s'arrête au-delà)` : ''}.</p><div>${L.map(([k, q]) => `<div class="stat"><span>${icoR(k)} ${esc(RS[k].n)}</span><b>+${fmt(q)}</b></div>`).join('')}${r.pop >= 1 ? `<div class="stat"><span>${ico('pop', '#f1d3b0')} Population</span><b>+${Math.floor(r.pop)}</b></div>` : ''}</div><div class="col"><button class="btn large" data-a="fm">Au travail</button></div>`); }
if (retour && retour.ecoule > 90) bilan(retour);
window.Ambreval = {get S(){ return S; }, get bulles(){ return bulles; }, cam, sauver};   // pour les essais automatiques
panneau(document.documentElement.classList.contains('desk') ? {o:'batir'} : null); majHaut(); requestAnimationFrame(boucle);
})();
