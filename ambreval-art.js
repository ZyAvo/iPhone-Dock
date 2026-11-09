// mon-ecran-version: 5c94a7fe
/* Ambreval (v80) — le diorama, entièrement dessiné en code : terrain, arbres, montagnes, bâtiments. Aucune image. */
(() => {
'use strict';
const { W, CX, CY, id, BAT } = window.Jeu;
const TW = 32, TH = 16;
const P = (u, v, z = 0) => [(u - v) * TW, (u + v) * TH - z];
function mul(s){ return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function poly(c, L, f, s){ c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (let i = 1; i < L.length; i++) c.lineTo(L[i][0], L[i][1]); c.closePath(); if (f){ c.fillStyle = f; c.fill(); } if (s){ c.strokeStyle = s; c.lineWidth = .6; c.stroke(); } }

const C = {
  bois:['#a2703f', '#6f4626', '#8d5e34'], pl:['#f1e4c7', '#bfa884', '#dfcca8'], pi:['#c3bfb2', '#878478', '#a9a599'], piF:['#9da0a8', '#5f626c', '#7e818b'],
  rose:['#e8c6b8', '#a97f70', '#cca393'], nuit:['#4a4f75', '#2c3052', '#3b4065'], bleu:['#7fa4c9', '#3f5e86', '#5b7ea6'], blanc:['#f4f1e8', '#b5b3ad', '#d9d6cc']
};
const T = { paille:['#e3ba5a', '#b98a35'], ardoise:['#5f6f9e', '#46547c'], tuile:['#c75f44', '#97432f'], mauve:['#8a66d6', '#5c3ea3'], vert:['#3fa37a', '#2a7558'], or:['#f2b544', '#c58a22'], azur:['#4f8fd0', '#2f619c'], turq:['#49c0b8', '#2b8a84'] };

/* boîte posée sur le sol : u,v centre ; w,d taille en cases ; h hauteur en px */
function boite(c, u, v, w, d, h, z, col){ const a = w / 2, b = d / 2;
  poly(c, [P(u - a, v + b, z), P(u + a, v + b, z), P(u + a, v + b, z + h), P(u - a, v + b, z + h)], col[1]);
  poly(c, [P(u + a, v + b, z), P(u + a, v - b, z), P(u + a, v - b, z + h), P(u + a, v + b, z + h)], col[2]);
  poly(c, [P(u - a, v - b, z + h), P(u + a, v - b, z + h), P(u + a, v + b, z + h), P(u - a, v + b, z + h)], col[0]); }
/* toit à deux pans : axe 'u' (faîtage selon u) ou 'v' */
function toit(c, u, v, w, d, z, h, col, axe = 'u', mur = C.pl){ const a = w / 2, b = d / 2;
  if (axe === 'u'){
    poly(c, [P(u + a, v + b, z), P(u + a, v - b, z), P(u + a, v, z + h)], mur[2]);
    poly(c, [P(u - a, v + b, z), P(u + a, v + b, z), P(u + a, v, z + h), P(u - a, v, z + h)], col[1]);
    poly(c, [P(u - a, v - b, z), P(u + a, v - b, z), P(u + a, v, z + h), P(u - a, v, z + h)], col[0]);
    poly(c, [P(u + a, v + b, z), P(u + a, v - b, z), P(u + a, v, z + h)], mur[2]);
  } else {
    poly(c, [P(u - a, v + b, z), P(u + a, v + b, z), P(u, v + b, z + h)], mur[1]);
    poly(c, [P(u + a, v - b, z), P(u + a, v + b, z), P(u, v + b, z + h), P(u, v - b, z + h)], col[0]);
    poly(c, [P(u - a, v + b, z), P(u + a, v + b, z), P(u, v + b, z + h)], mur[1]);
  } }
/* cylindre et cône (tours) */
function cyl(c, u, v, r, z, h, a, b){ const [x, y] = P(u, v, z), rx = r * TW * 1.42, ry = r * TH * 1.42, g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, b); g.addColorStop(.75, a); g.addColorStop(1, b);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.lineTo(x - rx, y - h); c.ellipse(x, y - h, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fillStyle = g; c.fill();
  c.beginPath(); c.ellipse(x, y - h, rx, ry, 0, 0, 6.3); c.fillStyle = a; c.fill(); }
function cone(c, u, v, r, z, h, a, b){ const [x, y] = P(u, v, z), rx = r * TW * 1.42, ry = r * TH * 1.42, g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, b); g.addColorStop(.7, a); g.addColorStop(1, b);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.lineTo(x, y - h); c.closePath(); c.fillStyle = g; c.fill(); }
/* détails sur la face avant gauche (+v) et droite (+u) */
function fenG(c, u, v, d, z, R, w = .13, h = 8){ const b = v + d / 2, L = [P(u - w / 2, b, z), P(u + w / 2, b, z), P(u + w / 2, b, z + h), P(u - w / 2, b, z + h)]; poly(c, L, '#3b3456'); if (R) R.lum.push([...P(u, b, z + h / 2)].concat(1)); }
function fenD(c, u, v, w0, z, R, w = .13, h = 8){ const a = u + w0 / 2, L = [P(a, v + w / 2, z), P(a, v - w / 2, z), P(a, v - w / 2, z + h), P(a, v + w / 2, z + h)]; poly(c, L, '#3b3456'); if (R) R.lum.push([...P(a, v, z + h / 2)].concat(1)); }
function porte(c, u, v, d, h = 11, col = '#5a3a1e', w = .16){ const b = v + d / 2; poly(c, [P(u - w / 2, b), P(u + w / 2, b), P(u + w / 2, b, h), P(u - w / 2, b, h)], col); }
function chem(c, R, u, v, z, h = 10){ boite(c, u, v, .1, .1, h, z, C.piF); if (R) R.fum.push(P(u, v, z + h + 2)); }
function colomb(c, u, v, w, d, h){ const b = v + d / 2; c.strokeStyle = '#6b4526'; c.lineWidth = 1.1; c.beginPath();
  for (const t of [-.5, 0, .5]){ const [x, y] = P(u + t * w, b), [x2, y2] = P(u + t * w, b, h); c.moveTo(x, y); c.lineTo(x2, y2); }
  const [x, y] = P(u - w / 2, b, h * .52), [x2, y2] = P(u + w / 2, b, h * .52); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); }
function banniere(c, u, v, z, col){ const [x, y] = P(u, v, z); c.strokeStyle = '#3a2a18'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 18); c.stroke(); c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x + 11, y - 15); c.lineTo(x, y - 10); c.closePath(); c.fillStyle = col; c.fill(); }
function tasBois(c, u, v){ for (const [a, b, z] of [[-.08, 0, 0], [.08, 0, 0], [0, 0, 5]]){ const [x, y] = P(u + a, v + b, z + 3); c.beginPath(); c.ellipse(x, y, 5.5, 3.2, 0, 0, 6.3); c.fillStyle = '#7b5230'; c.fill(); c.beginPath(); c.ellipse(x + 1.4, y, 2.6, 2.2, 0, 0, 6.3); c.fillStyle = '#d8b184'; c.fill(); } }
function bloc(c, u, v, s, z = 0, col = C.pi){ boite(c, u, v, s, s, s * 34, z, col); }
function tonneau(c, u, v){ const [x, y] = P(u, v, 4); c.beginPath(); c.ellipse(x, y, 4.2, 5.6, 0, 0, 6.3); c.fillStyle = '#9a6a3d'; c.fill(); c.fillStyle = '#4a3220'; c.fillRect(x - 4.2, y - 1, 8.4, 1.2); }
function cristaux(c, x, y, s, a = '#5fd6d0', b = '#2b8a84'){ for (const [dx, h, w] of [[-6, 13, 4], [0, 21, 5], [6, 11, 4]]){ const X = x + dx * s, H = h * s, Wd = w * s;
  c.beginPath(); c.moveTo(X, y - H); c.lineTo(X + Wd, y - H * .65); c.lineTo(X + Wd * .8, y); c.lineTo(X, y + 2 * s); c.closePath(); c.fillStyle = a; c.fill();
  c.beginPath(); c.moveTo(X, y - H); c.lineTo(X - Wd, y - H * .65); c.lineTo(X - Wd * .8, y); c.lineTo(X, y + 2 * s); c.closePath(); c.fillStyle = b; c.fill(); } }
function arbre(c, x, y, s, sai, r){ const hiver = sai === 3, feu = sai === 2;
  c.fillStyle = '#5c3e24'; c.fillRect(x - 1.4 * s, y - 7 * s, 2.8 * s, 8 * s);
  if (r() < .45){ const f = hiver ? ['#dfe7ee', '#bcc8d4'] : ['#2f7650', '#245e41'];
    for (let i = 0; i < 3; i++){ const b = y - 5 * s - i * 8 * s, W2 = (11 - i * 2.6) * s, H = 13 * s; c.beginPath(); c.moveTo(x, b - H); c.lineTo(x + W2, b); c.lineTo(x, b + 2.5 * s); c.closePath(); c.fillStyle = f[0]; c.fill(); c.beginPath(); c.moveTo(x, b - H); c.lineTo(x - W2, b); c.lineTo(x, b + 2.5 * s); c.closePath(); c.fillStyle = f[1]; c.fill(); }
  } else { const p = hiver ? ['#d4dde5', '#b8c3cf'] : feu ? (r() < .5 ? ['#d7883a', '#b56828'] : ['#c95f35', '#a64a26']) : sai === 0 ? ['#7dbd62', '#5c9c4c'] : ['#5a9e53', '#468440'];
    for (const [dx, dy, R, k] of [[-4.5, -10, 7.5, 1], [4.5, -11, 7, 1], [0, -16, 8.5, 0]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, R * s, 0, 6.3); c.fillStyle = p[k]; c.fill(); }
    c.beginPath(); c.arc(x + 2 * s, y - 18 * s, 3.5 * s, 0, 6.3); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill(); } }

/* ---------- Bâtiments : c déjà placé au centre de l'emprise ---------- */
function dessineBat(c, k, L, R, sai = 1){
  const n = Math.max(1, L);
  switch (k){
    case 'salle': { const g = Math.min(5, n);
      boite(c, 0, 0, 1.7, 1.7, 4, 0, C.piF);
      const h = 18 + g * 6, w = 1 + g * .08;
      boite(c, 0, 0, w, w * .85, h, 4, g >= 3 ? C.pi : C.pl); if (g < 3) colomb(c, 0, 0, w, w * .85, h);
      porte(c, 0, 0, w * .85, 15); for (const a of [-.32, .32]) fenG(c, a * w, 0, w * .85, 12 + 4, R); fenD(c, 0, 0, w, 14, R); fenD(c, -.28 * w, -.2, w, 14, null);
      toit(c, 0, 0, w + .12, w * .85 + .14, h + 4, 18 + g * 2, g >= 4 ? T.ardoise : g >= 2 ? T.tuile : T.paille, 'u', g >= 3 ? C.pi : C.pl);
      if (g >= 2){ for (const [u, v] of [[-.72, .72], [.72, .72]]){ boite(c, u, v, .3, .3, 26 + g * 7, 0, C.pi); cone(c, u, v, .22, 26 + g * 7, 18, T.ardoise[0], T.ardoise[1]); } }
      if (g >= 4){ cyl(c, 0, 0, .22, h + 22, 24, '#c3bfb2', '#8a8678'); cone(c, 0, 0, .28, h + 46, 28, T.mauve[0], T.mauve[1]); R && R.lum.push(P(0, 0, h + 34).concat(2)); }
      banniere(c, .1, -.1, h + 22 + g * 2, '#f2b544');
      chem(c, R, -.34, -.18, h + 12, 10); break; }
    case 'chaumiere': { const g = n >= 6 ? 2 : n >= 3 ? 1 : 0, w = .6 + .07 * g, d = .54 + .07 * g, h = [13, 18, 29][g];
      boite(c, 0, 0, w, d, h, 0, C.pl); if (g) colomb(c, 0, 0, w, d, h);
      porte(c, -.12, 0, d, 9); fenG(c, .16, 0, d, 5, R); fenD(c, 0, 0, w, 5, R); if (g === 2){ fenG(c, -.12, 0, d, 18, R); fenG(c, .16, 0, d, 18, R); fenD(c, 0, 0, w, 18, R); }
      toit(c, 0, 0, w + .1, d + .13, h, [15, 17, 20][g], [T.paille, T.tuile, T.ardoise][g], 'u');
      chem(c, R, -.16, -.1, h + 8, 8); break; }
    case 'ferme': { /* champ */ const a = .44; poly(c, [P(-a, -a), P(a, -a), P(a, a), P(-a, a)], '#8c6a3c');
      const cols = sai === 3 ? '#cfd4cf' : sai === 2 ? '#d9a93f' : '#d9bf54'; c.strokeStyle = cols; c.lineWidth = 2.4; c.beginPath(); for (let i = -.34; i <= .36; i += .17){ const [x, y] = P(-.4, i), [x2, y2] = P(.4, i); c.moveTo(x, y - 3); c.lineTo(x2, y2 - 3); } c.stroke();
      boite(c, -.26, -.26, .32, .28, 10, 0, C.bois); toit(c, -.26, -.26, .38, .34, 10, 10, T.paille, 'u', C.bois); break; }
    case 'bucheron': boite(c, -.08, -.08, .54, .48, 12, 0, C.bois); porte(c, -.16, -.08, .48, 8, '#3f2a15'); fenD(c, -.08, -.08, .54, 4, R); toit(c, -.08, -.08, .62, .58, 12, 14, T.vert, 'u', C.bois); chem(c, R, -.2, -.2, 18, 6); tasBois(c, .3, .28); break;
    case 'carriere': poly(c, [P(-.45, -.45), P(.45, -.45), P(.45, .45), P(-.45, .45)], '#807a6c'); poly(c, [P(-.3, -.3), P(.3, -.3), P(.3, .3), P(-.3, .3)], '#5e5a50'); bloc(c, -.18, -.2, .2, 0); bloc(c, .16, -.12, .26, 0, C.piF); bloc(c, .22, .22, .18, 0); bloc(c, -.2, .18, .14, 0, C.piF); { const [x, y] = P(-.36, -.36); c.strokeStyle = '#6f4626'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y - 26); c.lineTo(x + 22, y - 14); c.stroke(); } break;
    case 'entrepot': boite(c, 0, 0, .78, .66, 18, 0, C.bois); colomb(c, 0, 0, .78, .66, 18); porte(c, 0, 0, .66, 14, '#3f2a15', .3); toit(c, 0, 0, .86, .78, 18, 17, T.tuile, 'u', C.bois); tonneau(c, .36, .36); break;
    case 'fontaine': cyl(c, 0, 0, .3, 0, 6, '#c3bfb2', '#8a8678'); { const [x, y] = P(0, 0, 6); c.beginPath(); c.ellipse(x, y, 11, 5.5, 0, 0, 6.3); c.fillStyle = '#6cb7e0'; c.fill(); } cyl(c, 0, 0, .05, 6, 13, '#c3bfb2', '#8a8678'); { const [x, y] = P(0, 0, 21); c.beginPath(); c.ellipse(x, y, 5, 2.6, 0, 0, 6.3); c.fillStyle = '#6cb7e0'; c.fill(); } break;
    case 'peche': { for (const [a, b] of [[.34, .34], [.4, -.02]]){ const [x, y] = P(a, b); c.fillStyle = '#5a3a1e'; c.fillRect(x - 1, y - 4, 2, 9); } poly(c, [P(0, 0, 4), P(.5, 0, 4), P(.5, .42, 4), P(0, .42, 4)], '#a2703f'); boite(c, -.16, -.14, .46, .42, 12, 0, C.bleu); fenD(c, -.16, -.14, .46, 4, R); toit(c, -.16, -.14, .54, .52, 12, 12, T.paille, 'u', C.bleu); break; }
    case 'scierie': boite(c, 0, -.05, .78, .55, 15, 0, C.bois); fenG(c, .2, -.05, .55, 5, R); toit(c, 0, -.05, .86, .66, 15, 13, T.ardoise, 'u', C.bois); { const [x, y] = P(.34, .34, 9); c.beginPath(); c.arc(x, y, 9, 0, 6.3); c.fillStyle = '#c9ced8'; c.fill(); c.strokeStyle = '#7c8290'; c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(x, y, 2.4, 0, 6.3); c.fillStyle = '#7c8290'; c.fill(); } tasBois(c, -.3, .3); break;
    case 'marche': for (const [u, v, a] of [[-.22, -.2, '#c75f44'], [.22, -.08, '#3f8fc0'], [-.1, .24, '#d9a93f']]){ boite(c, u, v, .34, .3, 7, 0, C.bois); const [x, y] = P(u, v, 7); c.beginPath(); c.moveTo(x - 17, y + 2); c.lineTo(x, y - 10); c.lineTo(x + 17, y + 2); c.lineTo(x, y + 11); c.closePath(); c.fillStyle = a; c.fill(); c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x + 17, y + 2); c.lineTo(x, y + 11); c.closePath(); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); } break;
    case 'brasserie': boite(c, -.04, -.06, .68, .6, 18, 0, C.pi); colomb(c, -.04, -.06, .68, .6, 18); fenG(c, .12, -.06, .6, 7, R); toit(c, -.04, -.06, .76, .7, 18, 15, T.tuile, 'u', C.pi); chem(c, R, -.2, -.2, 26, 9); tonneau(c, .34, .24); tonneau(c, .22, .38); break;
    case 'taverne': boite(c, 0, 0, .74, .62, 24, 0, C.rose); colomb(c, 0, 0, .74, .62, 24); porte(c, -.1, 0, .62, 11); fenG(c, .2, 0, .62, 6, R); fenG(c, -.14, 0, .62, 15, R); fenG(c, .2, 0, .62, 15, R); fenD(c, 0, 0, .74, 6, R); fenD(c, 0, 0, .74, 15, R); toit(c, 0, 0, .82, .74, 24, 16, T.ardoise, 'u', C.rose); chem(c, R, -.22, -.14, 32, 9); { const [x, y] = P(.42, .36, 18); c.fillStyle = '#6f4626'; c.fillRect(x - 8, y - 1, 12, 1.6); c.fillStyle = '#f2b544'; c.fillRect(x - 7, y, 8, 8); } break;
    case 'biblio': boite(c, 0, 0, .74, .66, 26, 0, C.blanc); for (const a of [-.24, 0, .24]) fenG(c, a, 0, .66, 12, R, .1, 11); fenD(c, 0, 0, .74, 12, R, .1, 11); { const [x, y] = P(0, 0, 26); c.beginPath(); c.ellipse(x, y, 21, 11, 0, 0, 6.3); c.fillStyle = '#b8bcc4'; c.fill(); c.beginPath(); c.moveTo(x - 20, y); c.quadraticCurveTo(x, y - 38, x + 20, y); c.quadraticCurveTo(x, y + 12, x - 20, y); c.fillStyle = T.azur[0]; c.fill(); } banniere(c, 0, 0, 44, '#8fc4ee'); break;
    case 'mine': { const [x, y] = P(-.08, -.06, 0); c.beginPath(); c.moveTo(x - 30, y + 8); c.quadraticCurveTo(x - 12, y - 42, x + 4, y - 36); c.quadraticCurveTo(x + 22, y - 36, x + 30, y + 8); c.quadraticCurveTo(x, y + 18, x - 30, y + 8); c.fillStyle = '#6a665e'; c.fill(); c.beginPath(); c.moveTo(x - 9, y + 12); c.lineTo(x - 9, y - 7); c.quadraticCurveTo(x, y - 15, x + 9, y - 7); c.lineTo(x + 9, y + 12); c.fillStyle = '#17131a'; c.fill(); c.strokeStyle = '#6f4626'; c.lineWidth = 2.2; c.stroke(); R && R.lum.push([x, y - 2, 1]); bloc(c, .3, .22, .12, 0, C.piF); break; }
    case 'forge': boite(c, 0, 0, .7, .62, 16, 0, C.piF); porte(c, -.1, 0, .62, 11, '#e0702c', .24); R && R.lum.push(P(-.1, .31, 6).concat(2)); toit(c, 0, 0, .78, .72, 16, 12, T.ardoise, 'u', C.piF); boite(c, -.2, -.14, .2, .2, 38, 0, C.pi); R && R.fum.push(P(-.2, -.14, 40)); break;
    case 'moulin': cyl(c, 0, 0, .3, 0, 44, '#e8dcc0', '#b2a180'); cone(c, 0, 0, .34, 44, 18, T.tuile[0], T.tuile[1]); fenG(c, 0, .2, .16, 22, R); R && R.rot.push(P(.26, .26, 38).concat(19)); break;
    case 'tour': cyl(c, 0, 0, .26, 0, 54, '#a39bc0', '#68607f'); cyl(c, 0, 0, .33, 54, 7, '#b6aed2', '#776e90'); cone(c, 0, 0, .36, 61, 32, T.mauve[0], T.mauve[1]); fenG(c, 0, .18, .16, 30, R); fenG(c, 0, .18, .16, 12, R); { const [x, y] = P(0, 0, 96); c.beginPath(); c.arc(x, y, 4, 0, 6.3); c.fillStyle = '#d7c3ff'; c.fill(); R && R.lum.push([x, y, 3]); } break;
    case 'temple': boite(c, 0, 0, .9, .82, 5, 0, C.blanc); for (const u of [-.32, -.11, .11, .32]) boite(c, u, .3, .09, .09, 24, 5, C.blanc); for (const v of [.1, -.12, -.3]) boite(c, .36, v, .09, .09, 24, 5, C.blanc); boite(c, 0, -.05, .62, .5, 24, 5, C.pi); R && R.lum.push(P(0, .2, 16).concat(2)); boite(c, 0, 0, .86, .78, 4, 29, C.blanc); toit(c, 0, 0, .92, .84, 33, 16, T.or, 'u', C.blanc); break;
    case 'jardin': poly(c, [P(-.46, -.46), P(.46, -.46), P(.46, .46), P(-.46, .46)], sai === 3 ? '#cdd6dc' : '#67a65a'); { const r = mul(77); for (let i = 0; i < 16; i++){ const [x, y] = P(r() * .8 - .4, r() * .8 - .4); c.fillStyle = ['#f19bc0', '#f6d365', '#b8a4f2', '#ffffff'][i % 4]; c.beginPath(); c.arc(x, y, 1.6, 0, 6.3); c.fill(); } arbre(c, ...P(-.22, -.22), .7, sai, r); arbre(c, ...P(.28, -.14), .55, sai, r); cristaux(c, ...P(.1, .24), .55, '#f19bc0', '#c76b95'); if (R) R.lum.push(P(.1, .24, 8).concat(3)); } break;
    case 'minear': { const [x, y] = P(0, 0); c.beginPath(); c.ellipse(x, y + 2, 26, 14, 0, 0, 6.3); c.fillStyle = '#3b3560'; c.fill(); cristaux(c, x - 8, y + 2, 1.15); cristaux(c, x + 12, y + 6, .8, '#b79af2', '#7b5cc4'); boite(c, -.3, -.24, .22, .2, 12, 0, C.piF); R && R.lum.push([x, y - 12, 3]); break; }
    case 'academie': boite(c, 0, 0, 1.5, 1.3, 42, 0, C.blanc); for (let a = -.54; a <= .55; a += .27){ fenG(c, a, 0, 1.3, 26, R, .12, 11); fenG(c, a, 0, 1.3, 8, R, .12, 11); } for (const b of [-.3, 0, .3]){ fenD(c, 0, b, 1.5, 26, R, .12, 11); fenD(c, 0, b, 1.5, 8, R, .12, 11); } porte(c, 0, 0, 1.3, 15); toit(c, 0, 0, 1.6, 1.44, 42, 26, T.azur, 'u', C.blanc); cyl(c, .48, .4, .16, 42, 28, '#f1e4c7', '#b2a180'); cone(c, .48, .4, .22, 70, 24, T.azur[0], T.azur[1]); banniere(c, -.3, -.2, 62, '#8fc4ee'); break;
    case 'guilde': boite(c, 0, 0, 1.5, 1.28, 36, 0, C.pl); colomb(c, 0, 0, 1.5, 1.28, 36); porte(c, 0, 0, 1.28, 16, '#3f2a15', .26); for (const a of [-.5, .5]){ fenG(c, a, 0, 1.28, 8, R, .14, 11); fenG(c, a, 0, 1.28, 23, R, .14, 11); } fenG(c, 0, 0, 1.28, 23, R, .14, 11); for (const b of [-.3, .3]){ fenD(c, 0, b, 1.5, 8, R, .14, 11); fenD(c, 0, b, 1.5, 23, R, .14, 11); } toit(c, 0, 0, 1.6, 1.42, 36, 24, T.or, 'u', C.pl); banniere(c, .4, .4, 56, '#c75f44'); banniere(c, -.4, -.3, 56, '#3f8fc0'); break;
    case 'bosquet': { const [x, y] = P(0, 0); c.fillStyle = '#6a4a78'; c.beginPath(); c.moveTo(x - 7, y + 5); c.quadraticCurveTo(x - 2, y - 22, x - 5, y - 44); c.lineTo(x + 5, y - 44); c.quadraticCurveTo(x + 2, y - 22, x + 8, y + 5); c.closePath(); c.fill(); for (const [dx, dy, r, f] of [[-16, -48, 16, '#5fb98d'], [16, -50, 15, '#4ba67c'], [0, -66, 19, '#79cfa4'], [-9, -58, 11, '#b49bf0']]){ c.beginPath(); c.arc(x + dx, y + dy, r, 0, 6.3); c.fillStyle = f; c.fill(); } R && R.lum.push([x, y - 58, 3]); break; }
    case 'griffon': cyl(c, 0, 0, .22, 0, 42, '#c3bfb2', '#878478'); { const [x, y] = P(0, 0, 42); c.beginPath(); c.ellipse(x, y, 24, 12, 0, 0, 6.3); c.fillStyle = '#7b5a35'; c.fill(); c.beginPath(); c.ellipse(x, y - 3, 18, 8, 0, 0, 6.3); c.fillStyle = '#c2a06b'; c.fill(); c.beginPath(); c.moveTo(x - 8, y - 2); c.quadraticCurveTo(x, y - 24, x + 12, y - 12); c.quadraticCurveTo(x + 4, y - 6, x + 10, y - 2); c.closePath(); c.fillStyle = '#e8cf9a'; c.fill(); c.beginPath(); c.moveTo(x + 11, y - 13); c.lineTo(x + 18, y - 11); c.lineTo(x + 11, y - 9); c.fillStyle = '#f2b544'; c.fill(); } break;
    case 'observatoire': boite(c, 0, 0, 1.5, 1.3, 26, 0, C.pi); for (let a = -.5; a <= .5; a += .5) fenG(c, a, 0, 1.3, 9, R, .14, 11); fenD(c, 0, 0, 1.5, 9, R, .14, 11); { cyl(c, 0, 0, .46, 26, 18, '#bdb9ac', '#868274'); const [x, y] = P(0, 0, 44); c.beginPath(); c.moveTo(x - 30, y); c.quadraticCurveTo(x, y - 58, x + 30, y); c.quadraticCurveTo(x, y + 14, x - 30, y); c.fillStyle = '#3f5aa0'; c.fill(); c.strokeStyle = '#f2b544'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 2, y - 8); c.lineTo(x + 28, y - 44); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(x + 18, y - 30); c.lineTo(x + 30, y - 47); c.stroke(); R && R.lum.push([x, y - 22, 3]); } break;
    case 'fleche': { const et = Math.max(1, L); boite(c, 0, 0, 1.7, 1.7, 8, 0, C.pi); for (let i = 0; i < et; i++){ const r = .6 - i * .09, z = 8 + i * 42; boite(c, 0, 0, r * 1.9, r * 1.9, 42, z, i % 2 ? C.pl : C.pi); fenG(c, 0, 0, r * 1.9, z + 14, R, .2, 18); fenD(c, 0, 0, r * 1.9, z + 14, R, .2, 18); } { const z = 8 + et * 42, r = .6 - et * .09; cone(c, 0, 0, Math.max(.14, r), z, 40, T.or[0], T.or[1]); if (et >= 5){ const [x, y] = P(0, 0, z + 44); c.beginPath(); c.arc(x, y, 8, 0, 6.3); c.fillStyle = '#ffd98a'; c.fill(); R && R.lum.push([x, y, 4]); } } break; }
  }
}
function echafaudage(c, s){ const a = .46 * s; c.strokeStyle = '#7b5a35'; c.lineWidth = 1.5; c.beginPath();
  for (const [u, v] of [[-a, a], [a, a], [a, -a]]){ const [x, y] = P(u, v), [x2, y2] = P(u, v, 30 * s); c.moveTo(x, y); c.lineTo(x2, y2); }
  for (const z of [12, 26]){ const [x, y] = P(-a, a, z * s), [x2, y2] = P(a, a, z * s), [x3, y3] = P(a, -a, z * s); c.moveTo(x, y); c.lineTo(x2, y2); c.lineTo(x3, y3); } c.stroke(); }

/* ---------- Terrain ---------- */
const HERBE = [['#86bd60', '#7cb358', '#92c56a'], ['#90b450', '#85a948', '#9bbc58'], ['#c0a44e', '#b49946', '#caad58'], ['#e1e8ee', '#d6dee5', '#ebf0f4']];
function sol(c, x, y, f){ const a = [(x - y) * TW, (x + y) * TH]; poly(c, [a, [a[0] + TW, a[1] + TH], [a[0], a[1] + 2 * TH], [a[0] - TW, a[1] + TH]], f); }
function construireMonde(c, S, D, sc, ox, oy){
  const sai = window.Jeu.saisonDe(S), R0 = {lum:[], fum:[], rot:[]};
  c.setTransform(sc, 0, 0, sc, ox * sc, oy * sc);
  /* socle du diorama */
  for (let i = 0; i < W; i++) for (const [x, y, gauche] of [[i, W - 1, true], [W - 1, i, false]]){
    const a = (x - y) * TW, b = (x + y + 1) * TH, H = 42 + ((i * 7) % 11) * 1.4;
    if (gauche) poly(c, [[a - TW, b], [a, b + TH], [a, b + TH + H], [a - TW, b + H]], '#57402b'); else poly(c, [[a, b + TH], [a + TW, b], [a + TW, b + H], [a, b + TH + H]], '#6f5237');
    if (gauche) poly(c, [[a - TW, b + 13], [a, b + TH + 13], [a, b + TH + 19], [a - TW, b + 19]], '#3f2e22'); else poly(c, [[a, b + TH + 13], [a + TW, b + 13], [a + TW, b + 19], [a, b + TH + 19]], '#4c3827');
  }
  const obj = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){
    const i = id(x, y), t = S.map[i], r = mul(i * 13 + 7), H = HERBE[sai];
    if (t === 'e'){ sol(c, x, y, sai === 3 ? '#a9cde0' : '#4c93c4'); c.globalAlpha = .28; const [a, b] = [(x - y) * TW, (x + y + 1) * TH]; c.fillStyle = '#d7eefb'; for (let n = 0; n < 2; n++){ c.fillRect(a - 12 + r() * 18, b - 5 + r() * 10, 7, 1); } c.globalAlpha = 1; }
    else { sol(c, x, y, t === 'l' ? '#6a55b0' : t === 'm' ? '#7d786e' : t === 'r' ? '#a39c86' : H[Math.floor(r() * 3)]);
      if (t === '.' && sai < 2 && r() < .16){ const [a, b] = [(x - y) * TW + (r() - .5) * 26, (x + y + 1) * TH + (r() - .5) * 12]; c.fillStyle = ['#fff3a6', '#f7b6cf', '#ffffff'][Math.floor(r() * 3)]; c.fillRect(a, b, 2, 2); } }
    /* berge */
    if (t !== 'e') for (const [dx, dy, g] of [[0, 1, true], [1, 0, false]]){ const a = x + dx, b = y + dy; if (a < W && b < W && S.map[id(a, b)] === 'e'){ const X = (x - y) * TW, Y = (x + y + 1) * TH; if (g) poly(c, [[X - TW, Y], [X, Y + TH], [X, Y + TH + 3], [X - TW, Y + 3]], '#8c7a54'); else poly(c, [[X, Y + TH], [X + TW, Y], [X + TW, Y + 3], [X, Y + TH + 3]], '#a08c62'); } }
    if (t === 'f' || t === 'r' || t === 'm' || t === 'l') obj.push({d:x + y, x, y, t, r});
  }
  /* chemins */
  for (const i of S.chem){ const x = i % W, y = (i - x) / W, a = [(x - y) * TW, (x + y + 1) * TH], rel = D.relies.has(i), f = rel ? '#d8c08e' : '#b9a78a', k = .62;
    c.save(); c.translate(a[0], a[1]); poly(c, [[0, -TH * k], [TW * k, 0], [0, TH * k], [-TW * k, 0]], f);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const j = x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < W ? id(x + dx, y + dy) : -1; if (j >= 0 && (D.ch.has(j) || D.occ[j])){ const u = dx * .5, v = dy * .5, nx = -dy * .23, ny = dx * .23; poly(c, [[(nx - ny) * TW, (nx + ny) * TH], [(u + nx - v - ny) * TW, (u + nx + v + ny) * TH], [(u - nx - v + ny) * TW, (u - nx + v - ny) * TH], [(-nx + ny) * TW, (-nx - ny) * TH]], f); } }
    c.fillStyle = 'rgba(90,70,50,.3)'; for (let n = 0; n < 4; n++) c.fillRect((n * 7 % 18) - 9, (n * 5 % 6) - 3, 2, 1);
    c.restore(); }
  for (const b of S.bats){ const s = BAT[b.k].s || 1; obj.push({d:b.x + b.y + (s - 1) * 2, b}); }
  obj.sort((a, b) => a.d - b.d);
  for (const o of obj){
    if (o.b){ const b = o.b, s = BAT[b.k].s || 1, [cx, cy] = [(b.x - b.y) * TW, (b.x + b.y + s) * TH];
      c.save(); c.translate(cx, cy); const R = {lum:[], fum:[], rot:[]};
      if (b.n > 0) dessineBat(c, b.k, b.n, R, sai); else { poly(c, [[0, -TH * s * .9], [TW * s * .9, 0], [0, TH * s * .9], [-TW * s * .9, 0]], '#8a7557'); }
      if (b.con > 0) echafaudage(c, s);
      c.restore();
      if (b.con <= 0 || b.n > 0) { for (const [x, y, k] of R.lum) R0.lum.push([cx + x, cy + y, k || 1]); for (const [x, y] of R.fum) R0.fum.push([cx + x, cy + y]); for (const [x, y, l] of R.rot) R0.rot.push([cx + x, cy + y, l]); }
      continue; }
    const {x, y, t, r} = o, [a, b] = [(x - y) * TW, (x + y + 1) * TH];
    if (t === 'f'){ const n = 2 + Math.floor(r() * 2); const L = []; for (let k = 0; k < n; k++) L.push([a + (r() - .5) * 34, b + (r() - .5) * 15, .8 + r() * .4]); L.sort((p, q) => p[1] - q[1]); for (const [X, Y, s] of L) arbre(c, X, Y, s, sai, r); }
    else if (t === 'r'){ for (let k = 0; k < 3; k++){ const X = a + (r() - .5) * 28, Y = b + (r() - .5) * 11 - 2, s = 6 + r() * 7; c.beginPath(); c.moveTo(X - s, Y + 3); c.lineTo(X - s * .4, Y - s); c.lineTo(X + s * .6, Y - s * .7); c.lineTo(X + s, Y + 3); c.closePath(); c.fillStyle = '#b2aea0'; c.fill(); c.beginPath(); c.moveTo(X + s * .6, Y - s * .7); c.lineTo(X + s, Y + 3); c.lineTo(X + s * .1, Y + 3); c.closePath(); c.fillStyle = '#8c897d'; c.fill(); } }
    else if (t === 'm'){ const h = 42 + r() * 36, dx = (r() - .5) * 8, top = [a + dx, b - h], g = [a - TW * .96, b + 2], d2 = [a + TW * .96, b + 2], q = [a, b + TH * .92]; poly(c, [g, q, top], '#6f6a62'); poly(c, [q, d2, top], '#8f8b80'); const n = .34; poly(c, [top, [top[0] + (g[0] - top[0]) * n, top[1] + (g[1] - top[1]) * n], [top[0] + (q[0] - top[0]) * n * .8, top[1] + (q[1] - top[1]) * n * .8]], '#dfe6ee'); poly(c, [top, [top[0] + (q[0] - top[0]) * n * .8, top[1] + (q[1] - top[1]) * n * .8], [top[0] + (d2[0] - top[0]) * n, top[1] + (d2[1] - top[1]) * n]], '#f4f7fa'); }
    else if (t === 'l'){ cristaux(c, a, b + 3, 1.1, '#c5a8ff', '#7d5bd6'); R0.lum.push([a, b - 10, 3]); }
  }
  /* brume hors du territoire + limite */
  c.fillStyle = 'rgba(14,22,48,.5)'; c.beginPath();
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (!window.Jeu.dansTerr(S, x, y, D)){ const a = (x - y) * TW, b = (x + y) * TH; c.moveTo(a, b); c.lineTo(a + TW, b + TH); c.lineTo(a, b + 2 * TH); c.lineTo(a - TW, b + TH); c.closePath(); }
  c.fill();
  const Rr = D.R, x0 = Math.max(0, CX + .5 - Rr - .5), x1 = Math.min(W, CX + .5 + Rr + .5), y0 = Math.max(0, CY + .5 - Rr - .5), y1 = Math.min(W, CY + .5 + Rr + .5);
  c.strokeStyle = 'rgba(242,181,68,.7)'; c.lineWidth = 1.4; c.setLineDash([7, 6]); c.beginPath(); [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y], i) => { const a = (x - y) * TW, b = (x + y) * TH; if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.closePath(); c.stroke(); c.setLineDash([]);
  return R0;
}
/* vignette d'un bâtiment pour les listes */
const VIG = {};
function vignette(k){ if (VIG[k]) return VIG[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 116; const c = cv.getContext('2d'), s = BAT[k].s || 1, h = BAT[k].h || 40, e = Math.min(1, 58 / (Math.max(s * 34, h * .6 + 18))); c.scale(2, 2); c.translate(29, 36 + Math.min(14, h * e * .34)); c.scale(e, e); poly(c, [[0, -TH * s], [TW * s, 0], [0, TH * s], [-TW * s, 0]], '#7fae5c'); dessineBat(c, k, k === 'fleche' ? 3 : k === 'chaumiere' ? 1 : 3, null, 1); return VIG[k] = cv.toDataURL(); }
window.Art = {TW, TH, construireMonde, dessineBat, vignette, poly};
})();
