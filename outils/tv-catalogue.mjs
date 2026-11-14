// mon-ecran-version: 89c87432
// Mon Écran — catalogue TV quotidien (directs, films, séries) à partir de l'abonnement Xtream, publié CHIFFRÉ.
// Accès : secrets XT_SERVEUR, XT_IDENTIFIANT, XT_MOTDEPASSE ; clé de chiffrement : secret TV_CLE (générée dans la fiche « Accès TV »
// du Coffre, 32 octets en base64). Le dépôt est public : le catalogue est compressé puis chiffré (AES-256-GCM) avant publication
// dans donnees/tv/catalogue.json, et il ne contient AUCUN accès (seulement des numéros, des noms, des affiches) : chaque appareil
// reconstruit les adresses de flux avec les accès de son Coffre. Les journaux n'affichent que des nombres.
// Appels au fournisseur : 7 par passage (connexion, 3 listes de catégories, films, séries, liste M3U), aucune vidéo ; v125 : un 8e
// (directs par l'API) seulement si la liste M3U n'en donne pas.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { webcrypto as wc } from 'node:crypto';

const S = (process.env.XT_SERVEUR || '').trim().replace(/\/+$/, ''), U = (process.env.XT_IDENTIFIANT || '').trim(), P = process.env.XT_MOTDEPASSE || '';
const BASE = S && !/^https?:\/\//i.test(S) ? 'http://' + S : S;
const CLE = (process.env.TV_CLE || '').trim();
const SORTIE = 'donnees/tv/catalogue.json';
const UA = 'VLC/3.0.20 LibVLC/3.0.20';
const resume = [];
const dire = t => { console.log(t); resume.push(t); };
const fin = code => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Catalogue TV\n\n' + resume.map(l => '- ' + l).join('\n') + '\n'); process.exit(code); };
const masque = t => String(t || '').split(S || '\u0000').join('[serveur]').split(U || '\u0000').join('[identifiant]').split(P || '\u0000').join('[mot de passe]');

if (!BASE || !U){ dire('Secrets XT_SERVEUR / XT_IDENTIFIANT / XT_MOTDEPASSE manquants : rien à faire.'); fin(0); }
let cle;
try{ cle = Buffer.from(CLE, 'base64'); if (cle.length !== 32) throw 0; }catch{ dire('Secret TV_CLE manquant ou invalide (32 octets en base64, à générer dans la fiche Accès TV du Coffre) : catalogue non publié.'); fin(0); }

async function lire(url, ms = 120000){
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try{ const r = await fetch(url, {headers:{'User-Agent':UA, 'Accept':'*/*'}, signal:c.signal, redirect:'follow'}); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
  catch(e){ throw new Error(masque(e.name === 'AbortError' ? 'délai dépassé' : (e.cause && e.cause.code) || e.message)); }
  finally{ clearTimeout(t); }
}
const api = async (action) => JSON.parse(await lire(`${BASE}/player_api.php?username=${encodeURIComponent(U)}&password=${encodeURIComponent(P)}${action ? '&action=' + action : ''}`));
const sur = async (f, d) => { try{ return await f(); }catch(e){ dire(`⚠️ ${e.message}`); return d; } };
const net = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(\s*\d{4}\s*\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const note = v => { const x = parseFloat(v); return isFinite(x) && x > 0 ? Math.round(x * 10) / 10 : 0; };
const annee = v => { const m = String(v || '').match(/(19|20)\d{2}/); return m ? +m[0] : 0; };

/* ---------- 1. connexion ---------- */
const info = await sur(() => api(''), null);
if (!info || !info.user_info){ dire('❌ Serveur injoignable ou réponse refusée : catalogue inchangé.'); fin(1); }
if (String(info.user_info.auth) === '0'){ dire('❌ Identifiants refusés : vérifie les secrets XT_IDENTIFIANT et XT_MOTDEPASSE.'); fin(1); }

/* ---------- 2. listes ---------- */
const [catL, catF, catS, films, series] = [await sur(() => api('get_live_categories'), []), await sur(() => api('get_vod_categories'), []),
  await sur(() => api('get_series_categories'), []), await sur(() => api('get_vod_streams'), []), await sur(() => api('get_series'), [])];
const m3u = await sur(() => lire(`${BASE}/get.php?username=${encodeURIComponent(U)}&password=${encodeURIComponent(P)}&type=m3u_plus&output=ts`, 240000), '');

/* ---------- 3. lecture de la liste M3U : directs et épisodes ---------- */
const attr = (l, k) => { const m = l.match(new RegExp(k + '="([^"]*)"', 'i')); return m ? m[1] : ''; };
const directs = [], episodes = [];
{
  const L = m3u.split(/\r?\n/);
  for (let i = 0; i < L.length; i++){
    if (!L[i].startsWith('#EXTINF')) continue;
    let j = i + 1; while (j < L.length && (!L[j].trim() || L[j].startsWith('#'))) j++;
    const url = (L[j] || '').trim(); if (!url) continue;
    const nom = (L[i].includes('",') ? L[i].slice(L[i].lastIndexOf('",') + 2) : L[i].slice(L[i].lastIndexOf(',') + 1)).trim() || attr(L[i], 'tvg-name');
    const fichier = url.split('?')[0].split('/').pop() || '', id = fichier.replace(/\.[a-z0-9]+$/i, ''), ext = (fichier.match(/\.([a-z0-9]+)$/i) || [])[1] || '';
    const g = attr(L[i], 'group-title'), logo = attr(L[i], 'tvg-logo');
    if (/\/series\//.test(url)) episodes.push({id, ext, nom, g, logo});
    else if (!/\/movie\//.test(url)) directs.push([+id || id, nom, logo, g, attr(L[i], 'tvg-id') ? 1 : 0]);
    i = j;
  }
}

/* v125 : liste M3U vide (téléchargement refusé ou trop long, le 14/11/2026) : les directs viennent de l'API (get_live_streams),
   un appel de plus seulement dans ce cas ; sans quoi la page TV ne montrait plus que les favoris */
if (!directs.length){
  const live = await sur(() => api('get_live_streams'), []), nomCat = new Map((Array.isArray(catL) ? catL : []).map(c => [String(c.category_id), c.category_name || '']));
  for (const v of Array.isArray(live) ? live : []) directs.push([+v.stream_id || v.stream_id, String(v.name || '').trim(), v.stream_icon || '', nomCat.get(String(v.category_id)) || '', v.epg_channel_id ? 1 : 0]);
  dire(`⚠️ Liste M3U ${m3u ? 'sans directs' : 'indisponible'} : ${directs.length.toLocaleString('fr-FR')} directs repris de l'API.`);
}

/* ---------- 4. catalogue compact ---------- */
const cats = l => (Array.isArray(l) ? l : []).map(c => [String(c.category_id), c.category_name || '?']);
const D = {cats:[...new Set(directs.map(d => d[3]))].filter(Boolean).map(g => [g, g]), ch:directs};
const F = {cats:cats(catF), f:(Array.isArray(films) ? films : []).map(v => [v.stream_id, String(v.name || '').trim(), v.stream_icon || '', String(v.category_id || ''),
  String(v.container_extension || 'mp4').toLowerCase(), note(v.rating), annee(v.name) || annee(v.releasedate || v.release_date), v.tmdb || v.tmdb_id || '', +v.added || 0])};
// séries : fiches de get_series + épisodes de la liste M3U, rapprochés par le nom (sans accents, sans année)
const parNom = new Map();
const SR = (Array.isArray(series) ? series : []).map(s => { const o = {id:s.series_id, nom:String(s.name || '').trim(), img:s.cover || '', cat:String(s.category_id || ''), note:note(s.rating),
  an:annee(s.releaseDate || s.release_date || s.name), genre:s.genre || '', eps:[]}; parNom.set(net(o.nom), o); return o; });
const EP = /^(.*?)[\s._-]*S(\d{1,2})[\s._-]*E(\d{1,4})\b\s*[-–:]?\s*(.*)$/i;
let rattaches = 0, seuls = 0;
for (const e of episodes){
  const m = e.nom.match(EP); const titre = m ? m[1] : e.nom, sa = m ? +m[2] : 1, ep = m ? +m[3] : 0, sous = m ? m[4] : '';
  let s = parNom.get(net(titre));
  if (s) rattaches++;
  else { s = {id:'m:' + net(titre), nom:titre.trim(), img:e.logo || '', cat:'', note:0, an:annee(titre), genre:'', eps:[], g:e.g}; parNom.set(net(titre), s); SR.push(s); seuls++; }
  s.eps.push([sa, ep, +e.id || e.id, e.ext || 'mp4', sous.slice(0, 80)]);
}
SR.forEach(s => s.eps.sort((a, b) => a[0] - b[0] || a[1] - b[1]));
const catsS = cats(catS); const gSeuls = [...new Set(SR.filter(s => s.g).map(s => s.g))];
gSeuls.forEach(g => { if (!catsS.some(c => c[1] === g)) catsS.push(['g:' + g, g]); }); SR.forEach(s => { if (s.g){ s.cat = (catsS.find(c => c[1] === s.g) || [])[0] || ''; delete s.g; } });
const Sx = {cats:catsS, s:SR.map(s => [s.id, s.nom, s.img, s.cat, s.note, s.an, s.genre, s.eps])};
const exp = info.user_info.exp_date ? +info.user_info.exp_date * 1000 : null;
const cata = {v:1, genere:new Date().toISOString(), fin:exp, d:D, f:F, s:Sx};

/* ---------- 5. compression + chiffrement ----------
   v54 : trois fichiers, lus à la demande par tv.js (Directs à l'ouverture, Films / Séries quand on ouvre leur onglet) :
   directs.json {d}, films.json {f}, series.json {s} ; chacun {v:2, genere, fin, iv, ct} (gzip puis AES-256-GCM, même clé).
   L'ancien catalogue.json (tout en un) n'est plus écrit : la publication remplace le dossier donnees/tv. */
const k = await wc.subtle.importKey('raw', cle, 'AES-GCM', false, ['encrypt']);
fs.mkdirSync('donnees/tv', {recursive:true});
const tailles = [];
/* v125 : une partie vide ou incomplète (directs sans chaîne ; séries sans épisodes quand la liste M3U manque) garde le fichier de la
   veille, pris sur la branche donnees-tv, plutôt que d'effacer ce que voyaient les appareils */
const { execSync } = await import('node:child_process');
let precOK = null;
const precedent = nom => {
  try{
    if (precOK === null){ execSync('git fetch -q --depth 1 origin donnees-tv', {stdio:'ignore'}); precOK = true; }
    const t = execSync(`git show FETCH_HEAD:donnees/tv/${nom}.json`, {encoding:'utf8', maxBuffer:64e6}); return t.length > 1000 ? t : null;
  }catch{ precOK = false; return null; }
};
const garder = {directs:!directs.length, series:!m3u && !episodes.length};
for (const [nom, part] of [['directs', {d:D}], ['films', {f:F}], ['series', {s:Sx}]]){
  if (garder[nom]){ const p = precedent(nom); if (p){ fs.writeFileSync(`donnees/tv/${nom}.json`, p); tailles.push(`${nom} (de la veille)`); dire(`⚠️ ${nom} : fichier de la veille conservé.`); continue; } }
  const brut = zlib.gzipSync(Buffer.from(JSON.stringify({v:2, genere:cata.genere, fin:exp, ...part})), {level:9});
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = Buffer.from(await wc.subtle.encrypt({name:'AES-GCM', iv}, k, brut));
  const txt = JSON.stringify({v:2, genere:cata.genere, iv:Buffer.from(iv).toString('base64'), ct:ct.toString('base64')});
  fs.writeFileSync(`donnees/tv/${nom}.json`, txt); tailles.push(`${nom} ${(txt.length / 1e6).toFixed(1)} Mo`);
}
if (fs.existsSync(SORTIE)) fs.rmSync(SORTIE);
dire(`✅ ${directs.length.toLocaleString('fr-FR')} directs, ${F.f.length.toLocaleString('fr-FR')} films, ${SR.length.toLocaleString('fr-FR')} séries (${episodes.length.toLocaleString('fr-FR')} épisodes ; ${rattaches} rattachés à leur fiche, ${seuls} sans fiche) · chiffrés : ${tailles.join(', ')}`);
fin(0);
