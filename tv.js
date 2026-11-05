// mon-ecran-version: b055f06e
/* Mon Écran — TV (v44, films et séries v45) : abonnement Xtream.
   - Accès (serveur, identifiant, mot de passe) : fiche « Accès TV » du Coffre, chiffrée avec ton code et partagée chiffrée par la
     synchronisation ; jamais dans le dépôt, le classeur ou la configuration (publics). Lus une fois par session (code demandé si le
     Coffre n'est pas ouvert), gardés en mémoire de session (« tv:acces ») le temps de l'onglet / de l'appli.
   - Les serveurs Xtream sont en http : une page en https ne peut ni les interroger ni lire leurs flux. Sur le PC, le relais
     (outils/tv-relais.mjs, lancé sur la machine, http://127.0.0.1:8765) fait l'intermédiaire : liste des chaînes, programme, lecture.
     Sans relais (ou sur iPhone) : chaînes favorites, ouverture dans VLC (appli VLC sur iPhone, fichier .m3u ailleurs ; Infuse devenu payant, retiré en v48).
   - Catalogue (v45) : donnees/tv/catalogue.json, fait chaque jour par la tâche « TV » (outils/tv-catalogue.mjs), compressé puis chiffré
     (AES-GCM) avec la clé de la fiche Accès TV (« cle », aussi en secret GitHub TV_CLE) ; il ne contient aucun accès. Directs, films et
     séries sans le PC ; l'appareil reconstruit chaque adresse de flux avec les accès du Coffre.
   - Favoris (directs) « tv:favoris », liste « À regarder » « tv:liste », séries vues « tv:vus » : partie « prefs » de la synchro.
   API : window.TV = {monter(zones), acces(pin), relaisOK(), favoris(), ...}. Utilisé par tv.html et le mode TV de l'accueil (PC). */
(function(){
if (window.TV) return;
const LSg = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch{ return d; } };
const LSs = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const SSg = (k, d) => { try{ const v = JSON.parse(sessionStorage.getItem(k)); return v ?? d; }catch{ return d; } };
const SSraw = k => { try{ return sessionStorage.getItem(k); }catch{ return null; } };   // clés écrites telles quelles par le Coffre
const SSs = (k, v) => { try{ v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); }catch{} };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const enc = encodeURIComponent;
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64txt = s => { try{ return new TextDecoder().decode(unb64(String(s || ''))); }catch{ return String(s || ''); } };
const RELAIS = () => LSg('tv:relais', 'http://127.0.0.1:8765');
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- accès (Coffre) ---------- */
async function cleDuCode(pin, sel){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:sel, iterations:150000, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['decrypt']);
}
async function lireCoffre(pin){
  const box = LSg('coffre:chiffre', null);
  if (!box) return LSg('coffre:items', null);
  let cle = null;
  if (pin) cle = await cleDuCode(pin, unb64(box.sel));
  else { const k = SSraw('coffre:cle'), t = +SSraw('coffre:ok') || 0;       // Coffre ouvert il y a moins de 10 min (même session)
    if (!k || Date.now() - t > 10 * 60e3) return null;
    cle = await crypto.subtle.importKey('raw', unb64(k), 'AES-GCM', false, ['decrypt']); }
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(box.iv)}, cle, unb64(box.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
const serveurNet = s => { s = String(s || '').trim().replace(/\/+$/, ''); return s && !/^https?:\/\//i.test(s) ? 'http://' + s : s; };
/* → {serveur, u, p, cle} | null (pas de fiche) ; lève 'verrou' (code nécessaire) ou 'code' (code incorrect) */
async function acces(pin){
  const a = SSg('tv:acces', null); if (a && a.serveur) return a;
  let items;
  try{ items = await lireCoffre(pin); }catch{ throw new Error(pin ? 'code' : 'verrou'); }
  if (items == null){ if (LSg('coffre:chiffre', null)) throw new Error('verrou'); return null; }
  const f = (items || []).find(x => x && x.type === 'tv');
  if (!f || !f.serveur || !f.identifiant) return null;
  const r = {serveur:serveurNet(f.serveur), u:String(f.identifiant).trim(), p:String(f.motdepasse || ''), cle:String(f.cle || '')};
  SSs('tv:acces', r); return r;
}
const oublier = () => SSs('tv:acces', null);

/* ---------- relais (PC) ---------- */
let relaisEtat = null;
async function relaisOK(force){
  if (relaisEtat !== null && !force) return relaisEtat;
  try{ const c = new AbortController(), t = setTimeout(() => c.abort(), 1500);
    const r = await fetch(RELAIS() + '/ping', {signal:c.signal, cache:'no-store'}); clearTimeout(t);
    relaisEtat = r.ok && !!(await r.json()).ok; }catch{ relaisEtat = false; }
  return relaisEtat;
}
const viaRelais = (chemin, url) => `${RELAIS()}/${chemin}?u=${enc(url)}`;
const urlApi = (a, action, extra = '') => `${a.serveur}/player_api.php?username=${enc(a.u)}&password=${enc(a.p)}${action ? '&action=' + action : ''}${extra}`;
async function api(a, action, extra){
  const r = await fetch(viaRelais('api', urlApi(a, action, extra)), {cache:'no-store'});
  if (!r.ok) throw new Error('serveur ' + r.status);
  return r.json();
}
/* adresse d'un élément : direct (d), film (f), épisode (e) — reconstruite ici avec les accès du Coffre */
function urlDe(a, it, pourNavigateur){
  const base = `${a.serveur}/%s/${enc(a.u)}/${enc(a.p)}/${it.id}`;
  if (it.k === 'f') return base.replace('%s', 'movie') + '.' + (it.ext || 'mp4');
  if (it.k === 'e') return base.replace('%s', 'series') + '.' + (it.ext || 'mp4');
  return base.replace('%s', 'live') + (pourNavigateur ? '.m3u8' : '.ts');
}

/* ---------- catalogue chiffré (v45) ---------- */
let CATA = null, CATA_ERR = '';
async function catalogue(a, force){
  if (CATA && !force) return CATA;
  CATA_ERR = '';
  if (!a || !a.cle){ CATA_ERR = 'cle'; return null; }
  try{
    const r = await fetch('donnees/tv/catalogue.json', {cache:'no-cache'}); if (!r.ok){ CATA_ERR = 'absent'; return null; }
    const j = await r.json();
    const k = await crypto.subtle.importKey('raw', unb64(a.cle), 'AES-GCM', false, ['decrypt']);
    let gz; try{ gz = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(j.iv)}, k, unb64(j.ct)); }catch{ CATA_ERR = 'mauvaise-cle'; return null; }
    const c = JSON.parse(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    const cats = l => (l || []).map(([id, nom]) => ({id:String(id), nom}));
    CATA = {genere:c.genere, fin:c.fin,
      d:{cats:cats(c.d.cats), l:(c.d.ch || []).map(([id, nom, icone, cat, epg]) => ({k:'d', id, nom, icone, cat:String(cat || ''), epg}))},
      f:{cats:cats(c.f.cats), l:(c.f.f || []).map(([id, nom, icone, cat, ext, note, an, tmdb, ajout]) => ({k:'f', id, nom, icone, cat:String(cat || ''), ext, note, an, tmdb, ajout}))},
      s:{cats:cats(c.s.cats), l:(c.s.s || []).map(([id, nom, icone, cat, note, an, genre, eps]) => ({k:'s', id, nom, icone, cat:String(cat || ''), note, an, genre, eps:eps || []}))}};
    return CATA;
  }catch{ CATA_ERR = 'lecture'; return null; }
}

/* ---------- directs par le relais (sans catalogue) ---------- */
let LISTE = null;
async function liste(a, force){
  if (LISTE && !force) return LISTE;
  const c = !force && SSg('tv:liste', null); if (c && c.l){ LISTE = c; return LISTE; }
  const info = await api(a, '');
  if (info && info.user_info && (info.user_info.auth === 0 || info.user_info.auth === '0')) throw new Error('acces');
  const [cats, ch] = await Promise.all([api(a, 'get_live_categories'), api(a, 'get_live_streams')]);
  LISTE = {cats:(cats || []).map(x => ({id:String(x.category_id), nom:x.category_name || '?'})),
    l:(ch || []).map(x => ({k:'d', id:x.stream_id, nom:String(x.name || '').trim(), icone:x.stream_icon || '', cat:String(x.category_id)}))};
  SSs('tv:liste', LISTE); return LISTE;
}
async function epg(a, id){
  try{ const j = await api(a, 'get_short_epg', `&stream_id=${enc(id)}&limit=3`);
    return (j.epg_listings || []).map(x => ({titre:b64txt(x.title), debut:+x.start_timestamp * 1000, fin:+x.stop_timestamp * 1000})).filter(x => x.titre); }
  catch{ return []; }
}

/* ---------- favoris, « À regarder », séries vues (partagés par la synchro) ---------- */
const prefs = () => { try{ window.Synchro && Synchro.prefsPlusTard && Synchro.prefsPlusTard(); }catch{} };
const favoris = () => LSg('tv:favoris', []);
function basculerFavori(ch){
  const l = favoris(), i = l.findIndex(x => String(x.id) === String(ch.id));
  if (i >= 0) l.splice(i, 1); else l.push({id:ch.id, nom:ch.nom, icone:ch.icone || '', cat:ch.cat || ''});
  LSs('tv:favoris', l.length ? l : null); prefs(); return i < 0;
}
const estFavori = id => favoris().some(x => String(x.id) === String(id));
const aRegarder = () => LSg('tv:liste', []);
const cleIt = it => it.k + ':' + it.id;
const dansListe = it => aRegarder().some(x => cleIt(x) === cleIt(it));
function basculerListe(it){
  const l = aRegarder(), i = l.findIndex(x => cleIt(x) === cleIt(it));
  if (i >= 0) l.splice(i, 1);
  else l.unshift(it.k === 's' ? {k:'s', id:it.id, nom:it.nom, icone:it.icone || ''} : {k:it.k, id:it.id, nom:it.nom, icone:it.icone || '', ext:it.ext || '', an:it.an || 0, sid:it.sid, s:it.s, e:it.e});
  LSs('tv:liste', l.length ? l.slice(0, 200) : null); prefs(); return i < 0;
}
/* favoris des films et séries (v48) : onglet ★ Favoris, partagés par la synchro (clé tvfav) */
const favF = () => LSg('tv:favf', []);
const estFavF = it => favF().some(x => cleIt(x) === cleIt(it));
function basculerFavF(it){
  const l = favF(), i = l.findIndex(x => cleIt(x) === cleIt(it));
  if (i >= 0) l.splice(i, 1); else l.unshift({k:it.k, id:it.id, nom:it.nom, icone:it.icone || '', ext:it.ext || '', an:it.an || 0});
  LSs('tv:favf', l.length ? l.slice(0, 300) : null); prefs(); return i < 0;
}
/* position de lecture des films et épisodes (v48, sur l'appareil) : reprise là où on s'était arrêté */
const POS = () => LSg('tv:pos', {});
function noterPos(it, t, d){
  if (!it || it.k === 'd' || !(d > 0)) return; const p = POS(), k = cleIt(it);
  if (t < 30 || t > d - 60) delete p[k]; else p[k] = [Math.round(t), Math.round(d), Date.now()];
  const l = Object.entries(p).sort((a, b) => b[1][2] - a[1][2]).slice(0, 150); LSs('tv:pos', l.length ? Object.fromEntries(l) : null);
}
const posDe = it => it && it.k !== 'd' ? POS()[cleIt(it)] : null;
const vus = () => LSg('tv:vus', {});
function noterVu(sid, s, e, id, ext){ const v = vus(); v[sid] = [s, e, id, ext]; LSs('tv:vus', v); prefs(); }

/* ---------- lecture ---------- */
let hlsCharge = null, HLS = null;
function chargerHls(){
  return hlsCharge || (hlsCharge = new Promise((ok, ko) => { const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'; s.onload = () => ok(window.Hls); s.onerror = () => { hlsCharge = null; ko(new Error('lecteur')); };
    document.head.appendChild(s); }));
}
/* Lecture tolérante aux coupures (v48) : tampon plus large, relances automatiques, reprise après une erreur,
   chien de garde (image figée 10 s pendant la lecture → rechargement au point de direct, ou à la même position pour un film).
   surEtat(k) : 'reco' (reconnexion en cours), 'ok' (la lecture repart), 'flux' | 'lecteur' (abandon après plusieurs essais). */
const LECT = {video:null, a:null, it:null, etat:null, essais:0, t:0, dernier:-1, fige:0, garde:0, recup:0};
const HLS_CFG = {lowLatencyMode:false, maxBufferLength:60, maxMaxBufferLength:120, backBufferLength:300, liveSyncDurationCount:4, liveMaxLatencyDurationCount:12,
  manifestLoadingMaxRetry:6, manifestLoadingRetryDelay:1000, levelLoadingMaxRetry:6, levelLoadingRetryDelay:1000, fragLoadingMaxRetry:8, fragLoadingRetryDelay:800,
  fragLoadingMaxRetryTimeout:8000, nudgeMaxRetry:10, maxBufferHole:1, highBufferWatchdogPeriod:2};
function signaler(k){ if (LECT.etat !== k){ LECT.etat = k; LECT.surEtat && LECT.surEtat(k); } }
function relancer(raison){
  const v = LECT.video, it = LECT.it; if (!v || !it) return;
  if (++LECT.essais > 6){ signaler('flux'); return; }
  signaler('reco');
  const pos = it.k !== 'd' ? v.currentTime : null;
  clearTimeout(LECT.t);
  LECT.t = setTimeout(() => { if (LECT.it === it) brancher(v, LECT.a, it, pos); }, Math.min(1000 * 2 ** (LECT.essais - 1), 8000));
}
async function brancher(video, a, it, pos){
  if (HLS){ try{ HLS.destroy(); }catch{} HLS = null; }
  LECT.dernier = -1; LECT.fige = 0; LECT.recup = 0;
  const reprendre = () => { if (pos > 0){ const go = () => { try{ video.currentTime = pos; }catch{} }; video.readyState >= 1 ? go() : video.addEventListener('loadedmetadata', go, {once:true}); } video.play().catch(() => {}); };
  video.onerror = () => { if (LECT.it === it) relancer('erreur'); };
  if (it.k !== 'd'){ video.src = viaRelais('flux', urlDe(a, it)); reprendre(); return; }   // film, épisode : fichier (avance rapide par le relais)
  const src = viaRelais('flux', urlDe(a, it, true));
  /* Safari : lecteur HLS natif. Chrome et Edge savent aussi lire le HLS en natif depuis 2025, mais sans tampon réglable ni retour
     en arrière en direct : hls.js passe en premier partout où MediaSource existe (v48). */
  const safari = IOS || (/safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|edg|android/i.test(navigator.userAgent));
  if (video.canPlayType('application/vnd.apple.mpegurl') && (safari || !window.MediaSource)){ video.src = src; reprendre(); return; }
  let Hls; try{ Hls = await chargerHls(); }catch{ signaler('lecteur'); return; }
  if (!Hls || !Hls.isSupported()){ if (video.canPlayType('application/vnd.apple.mpegurl')){ video.src = src; reprendre(); } else signaler('lecteur'); return; }
  if (LECT.it !== it) return;
  const h = HLS = new Hls(HLS_CFG);
  h.on(Hls.Events.ERROR, (e, d) => {
    if (!d || !d.fatal || HLS !== h) return;
    if (d.type === Hls.ErrorTypes.MEDIA_ERROR && LECT.recup < 2){ if (LECT.recup++ === 1) h.swapAudioCodec(); h.recoverMediaError(); return; }
    relancer(d.type);
  });
  h.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); LECT.pistes && LECT.pistes(); });
  h.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => LECT.pistes && LECT.pistes());
  h.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => LECT.pistes && LECT.pistes());
  h.on(Hls.Events.FRAG_BUFFERED, () => { if (LECT.etat === 'reco'){ LECT.essais = 0; signaler('ok'); } });
  h.loadSource(src); h.attachMedia(video);
}
function garde(){
  const v = LECT.video; if (!v || !LECT.it || document.hidden) return;
  if (v.paused || v.ended || v.seeking){ LECT.dernier = v.currentTime; LECT.fige = 0; return; }
  if (v.currentTime !== LECT.dernier){ LECT.dernier = v.currentTime; LECT.fige = 0; if (LECT.etat === 'reco' && v.readyState >= 3){ LECT.essais = 0; signaler('ok'); } return; }
  LECT.fige += 2;
  if (LECT.fige === 4) signaler('reco');                          // 4 s sans image : on le dit
  if (LECT.fige >= 10){ LECT.fige = 0; relancer('fige'); }        // 10 s : on recharge
}
async function lire(video, a, it, surEtat){
  clearTimeout(LECT.t); Object.assign(LECT, {video, a, it, etat:null, essais:0, surEtat});
  if (!LECT.garde) LECT.garde = setInterval(garde, 2000);
  if (!video.dataset.tvEcoute){ video.dataset.tvEcoute = '1';
    video.addEventListener('timeupdate', () => { if (LECT.it && LECT.it.k !== 'd' && Math.abs(video.currentTime - (video._posNotee || 0)) > 10){ video._posNotee = video.currentTime; noterPos(LECT.it, video.currentTime, video.duration); } });
    video.addEventListener('pause', () => LECT.it && noterPos(LECT.it, video.currentTime, video.duration));
    video.addEventListener('playing', () => { if (LECT.etat === 'reco'){ LECT.essais = 0; signaler('ok'); } });
    video.addEventListener('loadedmetadata', () => LECT.pistes && LECT.pistes()); }
  const p = posDe(it);
  await brancher(video, a, it, p ? p[0] : null);
  return p;
}
/* sauter de s secondes (négatif = retour) ; en direct : dans ce qui est en mémoire */
/* en direct, hls.js laisse la plage « seekable » vide (durée infinie) : le navigateur refuse alors tout déplacement.
   On déclare la partie en mémoire comme plage atteignable (MediaSource.setLiveSeekableRange) avant de se déplacer. */
function plageDirect(video){
  if (!HLS || !video || (video.seekable && video.seekable.length) || !video.buffered.length) return;
  try{ const ms = [...(HLS.coreComponents || []), HLS.bufferController].map(c => c && c.mediaSource).find(m => m && m.setLiveSeekableRange);
    if (ms && ms.readyState === 'open') ms.setLiveSeekableRange(video.buffered.start(0), video.buffered.end(video.buffered.length - 1)); }catch{}
}
function sauter(video, s){
  if (!video || !isFinite(video.currentTime)) return;
  if (LECT.it && LECT.it.k === 'd') plageDirect(video);
  let t = video.currentTime + s;
  const r = video.seekable && video.seekable.length ? [video.seekable.start(0), video.seekable.end(video.seekable.length - 1)] : null;
  const b = video.buffered && video.buffered.length ? [video.buffered.start(0), video.buffered.end(video.buffered.length - 1)] : null;
  const direct = LECT.it && LECT.it.k === 'd', lim = direct ? b || r : r || b;
  if (lim) t = Math.max(lim[0] + .2, Math.min(t, lim[1] - (direct ? 1 : .5)));
  if (isFinite(video.duration) && video.duration > 0) t = Math.min(t, video.duration - .5);
  video.currentTime = Math.max(0, t);
}
function auDirect(video){ if (!video) return; const t = HLS && HLS.liveSyncPosition; if (t) video.currentTime = t; else if (video.seekable.length) video.currentTime = video.seekable.end(video.seekable.length - 1) - 3; video.play().catch(() => {}); }
const retard = video => { if (!video || !LECT.it || LECT.it.k !== 'd') return 0; const fin = (HLS && HLS.liveSyncPosition) || (video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0); return fin ? Math.max(0, fin - video.currentTime) : 0; };
/* sous-titres et pistes audio : pistes du flux (hls.js ou lecteur natif), plus un fichier .srt / .vtt choisi sur l'appareil */
function pistes(video){
  const st = [], au = [];
  if (HLS){ (HLS.subtitleTracks || []).forEach((t, i) => st.push({id:'h' + i, nom:t.name || t.lang || 'Piste ' + (i + 1), on:HLS.subtitleTrack === i && HLS.subtitleDisplay}));
    if ((HLS.audioTracks || []).length > 1) HLS.audioTracks.forEach((t, i) => au.push({id:i, nom:t.name || t.lang || 'Audio ' + (i + 1), on:HLS.audioTrack === i})); }
  if (video) [...video.textTracks].forEach((t, i) => { if ((t.kind === 'subtitles' || t.kind === 'captions') && !(HLS && !t.label && st.length) && !(HLS && st.some(x => x.nom === t.label)))
    st.push({id:'n' + i, nom:t.label || t.language || 'Sous-titres ' + (i + 1), on:t.mode === 'showing'}); });
  return {st, au};
}
function choisirSousTitres(video, id){
  if (HLS){ HLS.subtitleDisplay = /^h/.test(id); HLS.subtitleTrack = /^h/.test(id) ? +id.slice(1) : -1; }
  [...(video ? video.textTracks : [])].forEach((t, i) => { if ((t.kind === 'subtitles' || t.kind === 'captions') && !(HLS && /^h/.test(id))) t.mode = id === 'n' + i ? 'showing' : 'disabled'; });
}
function choisirAudio(i){ if (HLS) HLS.audioTrack = +i; }
const srtVersVtt = t => 'WEBVTT\n\n' + String(t).replace(/\r/g, '').replace(/^﻿/, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').replace(/^\d+\n(?=\d{2}:\d{2})/gm, '');
function ajouterSousTitres(video, fichier){
  return fichier.text().then(t => {
    [...video.querySelectorAll('track[data-local]')].forEach(x => { URL.revokeObjectURL(x.src); x.remove(); });
    const tr = document.createElement('track'); tr.kind = 'subtitles'; tr.label = fichier.name.replace(/\.(srt|vtt)$/i, '').slice(0, 40); tr.srclang = 'fr'; tr.dataset.local = '1';
    tr.src = URL.createObjectURL(new Blob([/^WEBVTT/.test(t.replace(/^﻿/, '')) ? t : srtVersVtt(t)], {type:'text/vtt'}));
    video.appendChild(tr); if (HLS) HLS.subtitleTrack = -1;
    [...video.textTracks].forEach(x => { if (x.kind === 'subtitles' || x.kind === 'captions') x.mode = x === tr.track ? 'showing' : 'disabled'; });
  });
}
function arreter(video){
  clearTimeout(LECT.t); if (LECT.it && video) noterPos(LECT.it, video.currentTime, video.duration);
  LECT.it = null; LECT.etat = null;
  if (HLS){ try{ HLS.destroy(); }catch{} HLS = null; }
  if (video){ video.onerror = null; video.pause(); [...video.querySelectorAll('track[data-local]')].forEach(x => { URL.revokeObjectURL(x.src); x.remove(); }); video.removeAttribute('src'); video.load(); }
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
}
/* lecteur externe : VLC sur iPhone / iPad (adresse vlc-x-callback, v48 : remplace Infuse devenu payant), sinon un petit fichier .m3u (VLC ou le lecteur associé) */
function externe(a, it){
  const url = urlDe(a, it);
  if (IOS){ location.href = 'vlc-x-callback://x-callback-url/stream?url=' + enc(url); return; }
  const f = new Blob([`#EXTM3U\n#EXTINF:-1,${it.nom}\n${url}\n`], {type:'audio/x-mpegurl'});
  const l = document.createElement('a'); l.href = URL.createObjectURL(f); l.download = (it.nom || 'video').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.m3u';
  document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(l.href); l.remove(); }, 2000);
}

/* ---------- styles communs (page TV et mode TV de l'accueil) ---------- */
const CSS = `
.tv-z{border-radius:28px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0}
.tv-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.tv-k{font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.tv-a{font-size:.8rem;font-weight:600;color:var(--accent)}
.tv-msg{font-size:.86rem;color:var(--ink-soft);line-height:1.45;margin:0}
.tv-msg b{color:var(--ink)}
.tv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 14px;border-radius:14px;font-weight:600;font-size:.84rem;background:var(--card);border:1px solid var(--line);color:var(--ink)}
.tv-btn.main{background:var(--accent);color:var(--on-accent);border-color:transparent}
.tv-row-b{display:flex;flex-wrap:wrap;gap:8px}
.tv-video{width:100%;aspect-ratio:16/9;background:#000;border-radius:18px;display:block}
.tv-vw{position:relative}
.tv-rc{position:absolute;left:12px;top:12px;padding:5px 10px;border-radius:10px;background:rgba(0,0,0,.66);color:#fff;font-size:.78rem;font-weight:600;pointer-events:none}
.tv-rc[hidden]{display:none}
.tv-cmd{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tv-cmd .tv-btn{min-height:34px;padding:5px 11px;font-size:.8rem;font-variant-numeric:tabular-nums}
.tv-cmd select{font:inherit;font-size:.8rem;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 8px;max-width:12em}
.tv-cmd .tv-btn.dir{color:#fff;background:#d33;border-color:transparent}
.tv-cmd .tv-btn.dir[aria-pressed="true"]{background:var(--card);color:var(--ink-soft);border-color:var(--line)}
.tv-now{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.tv-now b{font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-now small{font-size:.78rem;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-bar{height:3px;border-radius:2px;background:var(--line);overflow:hidden;margin-top:4px}.tv-bar i{display:block;height:100%;background:var(--accent)}
.tv-o{display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
.tv-o button{flex:1;padding:7px 4px;border-radius:11px;font-size:.8rem;font-weight:500;color:var(--ink-soft);min-height:34px;white-space:nowrap}
.tv-o button[aria-selected="true"]{background:var(--accent);color:var(--on-accent);font-weight:600}
.tv-f{display:flex;gap:8px}
.tv-f select,.tv-f input,.tv-pin input,.tv-sa{font:inherit;font-size:16px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}
.tv-f select{flex:0 1 46%}.tv-f input{flex:1}
.tv-l{display:flex;flex-direction:column;overflow:auto;min-height:0;margin:0 -6px;padding:0 6px}
.tv-c{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line);width:100%;text-align:left;cursor:pointer}
.tv-c.p{grid-template-columns:40px minmax(0,1fr) auto}
.tv-c[aria-current="true"] .tv-cn{color:var(--accent)}
.tv-ic{width:36px;height:36px;border-radius:9px;background:var(--card) center / contain no-repeat;display:grid;place-items:center;font-size:.7rem;font-weight:700;color:var(--ink-soft);overflow:hidden}
.tv-c.p .tv-ic{width:40px;height:60px;border-radius:7px;background-size:cover}
.tv-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.tv-cn{font-size:.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-cs{font-size:.72rem;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-st{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;color:var(--ink-soft);font-size:1.05rem}
.tv-st[aria-pressed="true"]{color:#e0a100}
.tv-fi{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;align-items:start}
.tv-po{width:96px;aspect-ratio:2/3;border-radius:12px;background:var(--card) center / cover no-repeat;box-shadow:0 8px 18px -12px rgba(0,0,0,.5)}
.tv-fi h3{margin:0;font-size:1.1rem;line-height:1.25}
.tv-fi p{margin:4px 0 0;font-size:.8rem;color:var(--ink-soft)}
.tv-ep{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);width:100%;text-align:left;cursor:pointer;font-size:.86rem}
.tv-ep b{font-variant-numeric:tabular-nums;color:var(--ink-soft)}
.tv-ep.vu b{color:var(--accent)}
.tv-pin{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tv-pin input{width:9em}
.tv-ol{margin:0;padding-left:20px;font-size:.84rem;line-height:1.5;display:flex;flex-direction:column;gap:6px}
.tv-ol code{font-size:.78rem;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1px 5px;overflow-wrap:anywhere}`;
function styles(){ if (document.getElementById('tv-css')) return; const s = document.createElement('style'); s.id = 'tv-css'; s.textContent = CSS; document.head.appendChild(s); }

/* ---------- interface : monter({lecteur, chaines, quitter}) ---------- */
const ONGLETS = [['d', 'Directs'], ['f', 'Films'], ['s', 'Séries'], ['v', '★ Favoris'], ['l', 'À regarder']];
const SAUTS = (() => { try{ const v = window.CFG ? CFG('tv.sauts', [10, 30]) : [10, 30]; return [Math.abs(+v[0]) || 10, Math.abs(+v[1]) || 30]; }catch{ return [10, 30]; } })();
const mmss = t => { t = Math.max(0, Math.round(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const https = u => String(u || '').replace(/^http:\/\//i, 'https://');
const ini = t => esc((String(t || '?').replace(/^[^a-z0-9]+/i, '')[0] || '?').toUpperCase());
const se = (s, e) => `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
function monter(Z){
  styles();
  const S = {a:null, relais:false, onglet:LSg('tv:onglet', 'd'), cat:LSg('tv:cats', {d:'fav', f:'tout', s:'tout'}), q:{d:'', f:'', s:'', l:''}, cur:null, err:'', vue:null};
  const EL = Z.chaines, LE = Z.lecteur;
  const quitter = Z.quitter ? `<button type="button" class="tv-a" data-tv="quitter">Quitter le mode TV</button>` : '';
  const lecteurDispo = () => S.relais && !!LE;
  /* ---- lecteur ---- */
  const rendreLecteur = (it, info) => {
    if (!LE) return;
    if (!S.relais){ LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${quitter}</div>${relaisAide()}`; return; }
    if (!LE.querySelector('video')) LE.innerHTML = `<div class="tv-h"><span class="tv-k">En lecture</span>${quitter}</div>
      <div class="tv-vw"><video class="tv-video" controls playsinline></video><span class="tv-rc" hidden>Reconnexion…</span></div>
      <div class="tv-cmd" id="tvCmd" hidden></div>
      <div class="tv-h"><span class="tv-now" id="tvNow"><b>Choisis une chaîne, un film ou un épisode</b><small>dans la liste</small></span><span class="tv-row-b" id="tvAct"></span></div>`;
    const now = LE.querySelector('#tvNow'), act = LE.querySelector('#tvAct');
    if (!it){ LE.querySelector('#tvCmd').hidden = true; return; }
    rendreCmd(it);
    const hm = d => new Date(d).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    if (it.k === 'd'){
      const e = (info || [])[0], n = (info || [])[1], t = Date.now(), pct = e && e.fin > e.debut ? Math.max(0, Math.min(100, (t - e.debut) / (e.fin - e.debut) * 100)) : 0;
      now.innerHTML = `<b>${esc(it.nom)}${e ? ' · ' + esc(e.titre) : ''}</b><small>${S.err ? esc(S.err) : e ? `${hm(e.debut)}–${hm(e.fin)}${n ? ` · ensuite ${hm(n.debut)} ${esc(n.titre)}` : ''}` : 'programme non fourni'}</small>${e ? `<span class="tv-bar"><i style="width:${pct.toFixed(0)}%"></i></span>` : ''}`;
      act.innerHTML = `<button type="button" class="tv-btn" data-tv="fav" aria-pressed="${estFavori(it.id)}">${estFavori(it.id) ? '★ Favori' : '☆ Favori'}</button>${pip()}<button type="button" class="tv-btn" data-tv="ext">VLC</button>`;
    } else {
      now.innerHTML = `<b>${esc(it.titreLong || it.nom)}</b><small>${S.err ? esc(S.err) : `${it.k === 'f' ? 'Film' : 'Épisode'} · ${esc((it.ext || '').toUpperCase())}${/^(mkv|avi)$/i.test(it.ext || '') ? ' · si l\'image ne vient pas : VLC' : ''}`}</small>`;
      act.innerHTML = `${pip()}<button type="button" class="tv-btn" data-tv="ext">VLC</button>`;
    }
  };
  /* commandes (v48) : retour / avance, retour au direct, sous-titres (pistes du flux ou fichier .srt/.vtt), pistes audio */
  const rendreCmd = it => {
    const c = LE && LE.querySelector('#tvCmd'), v = LE && LE.querySelector('video'); if (!c || !v) return;
    const P = pistes(v), ch = P.st.find(x => x.on);
    c.hidden = false;
    c.innerHTML = `<button type="button" class="tv-btn" data-tv="saut" data-s="-${SAUTS[0]}" title="Retour de ${SAUTS[0]} s (←)">↺ ${SAUTS[0]} s</button>
      <button type="button" class="tv-btn" data-tv="saut" data-s="${SAUTS[1]}" title="Avance de ${SAUTS[1]} s (→)">${SAUTS[1]} s ↻</button>
      ${it.k === 'd' ? `<button type="button" class="tv-btn dir" data-tv="direct" aria-pressed="true" title="Revenir au direct">● Direct</button>` : ''}
      <select data-tv="st" aria-label="Sous-titres"><option value="">Sous-titres : non</option>${P.st.map(x => `<option value="${esc(x.id)}"${x.on ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}<option value="+">Charger un fichier .srt / .vtt…</option></select>
      ${P.au.length ? `<select data-tv="au" aria-label="Audio">${P.au.map(x => `<option value="${x.id}"${x.on ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}</select>` : ''}
      <input type="file" accept=".srt,.vtt,text/vtt" data-tv="stf" hidden>`;
    if (!ch) c.querySelector('[data-tv="st"]').value = '';
    majDirect();
  };
  const majDirect = () => { const b = LE && LE.querySelector('[data-tv="direct"]'); if (!b) return; const r = retard(LE.querySelector('video')); const loin = r > 20; b.setAttribute('aria-pressed', String(!loin)); b.textContent = loin ? `● Direct (−${mmss(r)})` : '● Direct'; };
  LECT.pistes = () => { if (S.cur && LE) rendreCmd(S.cur); };
  const etatLecture = (it, k) => {
    const rc = LE && LE.querySelector('.tv-rc'); if (rc) rc.hidden = k !== 'reco';
    if (k === 'flux' || k === 'lecteur'){ S.err = k === 'lecteur' ? 'Ce navigateur ne sait pas lire ce flux : essaie VLC.' : 'Flux interrompu malgré plusieurs reprises (serveur ou format) : réessaie, ou VLC.'; rendreLecteur(it, S.info); }
    else if (k === 'ok' && S.err){ S.err = ''; rendreLecteur(it, S.info); }
  };
  const pip = () => document.pictureInPictureEnabled ? '<button type="button" class="tv-btn" data-tv="pip" title="Garder la vidéo visible par-dessus les autres fenêtres">Image dans l\'image</button>' : '';
  const relaisAide = () => `<p class="tv-msg"><b>Lecture dans le dock : lance le relais sur ton PC.</b> Les flux de ton abonnement sont en http : une page sécurisée ne peut pas les lire seule.</p>
    <ol class="tv-ol"><li>Installe <b>Node.js</b> (version LTS, nodejs.org), une seule fois.</li>
      <li>Télécharge <a class="tv-a" href="outils/tv-relais.mjs" download>tv-relais.mjs</a> et <a class="tv-a" href="outils/tv-relais.cmd" download>tv-relais.cmd</a> dans un même dossier.</li>
      <li>Double-clique <code>tv-relais.cmd</code> (laisse la fenêtre ouverte). Pour qu'il démarre avec Windows : place un raccourci de ce fichier dans <code>shell:startup</code> (Win + R).</li>
      <li>Reviens ici et touche <b>Réessayer</b>. Si Chrome demande l'accès aux appareils du réseau local, accepte.</li></ol>
    <div class="tv-row-b"><button type="button" class="tv-btn main" data-tv="relais">Réessayer</button></div>
    <p class="tv-msg">En attendant, les chaînes, films et épisodes s'ouvrent dans VLC.</p>`;
  /* ---- données de l'onglet ---- */
  const etoileF = it => `<button type="button" class="tv-st" data-favf="${esc(it.k)}:${esc(it.id)}" aria-pressed="${estFavF(it)}" aria-label="${estFavF(it) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${estFavF(it) ? '★' : '☆'}</button>`;
  const source = o => o === 'd' ? (CATA ? CATA.d : S.relais && LISTE ? LISTE : null) : o === 'f' ? (CATA && CATA.f) : o === 's' ? (CATA && CATA.s) : null;
  const trouver = (k, id) => { const s = source(k === 'e' ? 's' : k); return s && s.l.find(x => String(x.id) === String(id)); };
  const ligne = (it, droite) => {
    const p = it.k === 'f' || it.k === 's' || (it.k === 'e' && it.icone);
    const sous = it.k === 'f' ? [it.an || '', it.note ? '★ ' + it.note : '', (it.ext || '').toUpperCase()].filter(Boolean).join(' · ')
      : it.k === 's' ? [it.an || '', `${new Set((it.eps || []).map(e => e[0])).size} saison(s)`, vus()[it.id] ? 'vu jusqu\'à ' + se(vus()[it.id][0], vus()[it.id][1]) : ''].filter(Boolean).join(' · ')
      : it.k === 'e' ? 'Épisode' : '';
    return `<div class="tv-c${p ? ' p' : ''}" role="button" tabindex="0" data-it="${esc(it.k)}:${esc(it.id)}"${S.cur && cleIt(S.cur) === cleIt(it) ? ' aria-current="true"' : ''}>
      <span class="tv-ic"${it.icone ? ` style="background-image:url(&quot;${esc(https(it.icone))}&quot;)"` : ''}>${it.icone ? '' : ini(it.nom)}</span>
      <span class="tv-t"><span class="tv-cn">${esc(it.nom)}</span>${sous ? `<span class="tv-cs">${esc(sous)}</span>` : ''}</span>${droite}</div>`;
  };
  const etoile = it => `<button type="button" class="tv-st" data-fav="${esc(it.id)}" aria-pressed="${estFavori(it.id)}" aria-label="${estFavori(it.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${estFavori(it.id) ? '★' : '☆'}</button>`;
  const plus = it => `<button type="button" class="tv-st" data-liste="${esc(it.k)}:${esc(it.id)}" aria-pressed="${dansListe(it)}" aria-label="${dansListe(it) ? 'Retirer de À regarder' : 'Ajouter à À regarder'}">${dansListe(it) ? '✓' : '＋'}</button>`;
  /* ---- liste de l'onglet ---- */
  const rendreListe = () => {
    if (!S.a) return;
    if (S.vue) return rendreVue();
    const o = S.onglet, src = source(o), q = norm(S.q[o]);
    let L = [], opts = '', vide = '';
    if (o === 'l'){ L = aRegarder(); vide = 'Rien pour l\'instant : touche ＋ à côté d\'un film ou d\'une série.'; }
    else if (o === 'v'){ L = favF().map(f => trouver(f.k, f.id) || f); vide = 'Aucun favori : touche ☆ sur la fiche d\'un film ou d\'une série.'; }
    else if (o === 'd'){
      const favs = favoris();
      if (src){
        L = S.cat.d === 'fav' ? favs.map(f => src.l.find(c => String(c.id) === String(f.id)) || {...f, k:'d'}) : S.cat.d === 'tout' ? src.l : src.l.filter(c => c.cat === S.cat.d);
        opts = `<select data-tv="cat" aria-label="Catégorie"><option value="fav"${S.cat.d === 'fav' ? ' selected' : ''}>★ Favoris (${favs.length})</option><option value="tout"${S.cat.d === 'tout' ? ' selected' : ''}>Toutes (${src.l.length})</option>${src.cats.map(c => `<option value="${esc(c.id)}"${S.cat.d === c.id ? ' selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>`;
        vide = S.cat.d === 'fav' ? 'Aucun favori : choisis « Toutes » et touche ☆ à côté des chaînes que tu regardes.' : 'Aucune chaîne.';
      } else { L = favs.map(f => ({...f, k:'d'})); vide = 'Aucun favori pour l\'instant.'; }
      if (q && src) L = src.l;
    } else {
      if (!src){ EL.innerHTML = entete() + `<p class="tv-msg">${messageCatalogue()}</p>`; return; }
      const c = S.cat[o] || 'tout';
      L = c === 'tout' ? src.l : c === 'recent' ? [...src.l].sort((a, b) => (b.ajout || 0) - (a.ajout || 0)).slice(0, 200) : src.l.filter(x => x.cat === c);
      opts = `<select data-tv="cat" aria-label="Catégorie"><option value="tout"${c === 'tout' ? ' selected' : ''}>Tout (${src.l.length})</option>${o === 'f' ? `<option value="recent"${c === 'recent' ? ' selected' : ''}>Ajouts récents</option>` : ''}${src.cats.map(x => `<option value="${esc(x.id)}"${c === x.id ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}</select>`;
      vide = 'Rien dans cette catégorie.';
      if (q) L = src.l;
    }
    if (q) L = L.filter(x => norm(x.nom).includes(q));
    const tot = L.length; L = L.slice(0, 300);
    const pos = (EL.querySelector('.tv-l') || {}).scrollTop || 0, memeVue = S.derniereVue === o + '|' + (S.cat[o] || '') + '|' + q; S.derniereVue = o + '|' + (S.cat[o] || '') + '|' + q;
    EL.innerHTML = entete() + `<div class="tv-f"${o === 'v' || o === 'l' ? ' style="display:none"' : ''}>${opts}<input type="search" data-tv="q" placeholder="Chercher" value="${esc(S.q[o])}" aria-label="Chercher"></div>
      <div class="tv-l">${L.map(it => ligne(it, it.k === 'd' ? etoile(it) : o === 'v' ? etoileF(it) : plus(it))).join('') || `<p class="tv-msg" style="padding:10px 0">${q ? 'Aucun résultat.' : vide}</p>`}
      ${tot > L.length ? `<p class="tv-msg" style="padding:8px 0">${tot - L.length} autres : affine la recherche.</p>` : ''}</div>`;
    if (memeVue && pos){ const l = EL.querySelector('.tv-l'); if (l) l.scrollTop = pos; }   // la liste reste où elle était (v46)
  };
  const entete = () => `<div class="tv-o" role="tablist" aria-label="TV">${ONGLETS.map(([k, t]) => `<button type="button" role="tab" data-onglet="${k}" aria-selected="${S.onglet === k}">${t}</button>`).join('')}</div>`;
  const messageCatalogue = () => CATA_ERR === 'cle' ? '<b>Films et séries : clé du catalogue manquante.</b> Ouvre le Coffre, fiche Accès TV, touche « Générer » puis copie la clé dans le secret GitHub <b>TV_CLE</b> et lance la tâche « TV ».'
    : CATA_ERR === 'absent' ? '<b>Catalogue pas encore publié.</b> Lance la tâche « TV » sur GitHub (Actions › TV › Run workflow) ; il se met ensuite à jour chaque nuit.'
    : CATA_ERR === 'mauvaise-cle' ? '<b>La clé du Coffre ne correspond pas au catalogue.</b> Vérifie que le secret GitHub TV_CLE est bien la clé de ta fiche Accès TV, puis relance la tâche « TV ».'
    : '<b>Catalogue illisible pour l\'instant.</b> Réessaie plus tard.';
  /* ---- fiches film et série ---- */
  const rendreVue = () => {
    const v = S.vue, it = v.it, retour = entete() + `<div class="tv-h"><button type="button" class="tv-a" data-tv="retour">‹ Retour</button></div>`;
    const po = `<span class="tv-po"${it.icone ? ` style="background-image:url(&quot;${esc(https(it.icone))}&quot;)"` : ''}></span>`;
    if (v.t === 'f'){
      EL.innerHTML = retour + `<div class="tv-fi">${po}<div><h3>${esc(it.nom)}</h3><p>${[it.an || '', it.note ? '★ ' + it.note + '/10' : '', (it.ext || '').toUpperCase()].filter(Boolean).join(' · ')}</p>
        <div class="tv-row-b" style="margin-top:10px"><button type="button" class="tv-btn main" data-tv="lire">${lecteurDispo() ? 'Regarder' : 'Ouvrir dans VLC'}</button>
        <button type="button" class="tv-btn" data-liste="f:${esc(it.id)}" aria-pressed="${dansListe(it)}">${dansListe(it) ? '✓ À regarder' : '＋ À regarder'}</button>
        <button type="button" class="tv-btn" data-favf="f:${esc(it.id)}" aria-pressed="${estFavF(it)}">${estFavF(it) ? '★ Favori' : '☆ Favori'}</button>
        ${posDe(it) ? `<span class="tv-cs" style="align-self:center">reprise à ${mmss(posDe(it)[0])}</span>` : ''}
        ${lecteurDispo() ? `<button type="button" class="tv-btn" data-tv="ext">VLC</button>` : ''}</div></div></div>`;
      return;
    }
    const saisons = [...new Set(it.eps.map(e => e[0]))].sort((a, b) => a - b), vu = vus()[it.id];
    if (v.saison == null) v.saison = vu ? vu[0] : saisons[0];
    const eps = it.eps.filter(e => e[0] === v.saison), suite = vu ? it.eps[it.eps.findIndex(e => e[0] === vu[0] && e[1] === vu[1]) + 1] : it.eps[0];
    EL.innerHTML = retour + `<div class="tv-fi">${po}<div><h3>${esc(it.nom)}</h3><p>${[it.an || '', it.note ? '★ ' + it.note + '/10' : '', it.genre || '', `${it.eps.length} épisodes`].filter(Boolean).join(' · ')}</p>
      <div class="tv-row-b" style="margin-top:10px">${suite ? `<button type="button" class="tv-btn main" data-ep="${esc(suite[2])}">${vu ? 'Reprendre ' : 'Commencer '}${se(suite[0], suite[1])}</button>` : ''}
      <button type="button" class="tv-btn" data-liste="s:${esc(it.id)}" aria-pressed="${dansListe(it)}">${dansListe(it) ? '✓ À regarder' : '＋ À regarder'}</button>
      <button type="button" class="tv-btn" data-favf="s:${esc(it.id)}" aria-pressed="${estFavF(it)}">${estFavF(it) ? '★ Favori' : '☆ Favori'}</button></div></div></div>
      ${saisons.length > 1 ? `<select class="tv-sa" data-tv="saison" aria-label="Saison">${saisons.map(s => `<option value="${s}"${s === v.saison ? ' selected' : ''}>Saison ${s}</option>`).join('')}</select>` : ''}
      <div class="tv-l">${eps.map(e => { const estVu = vu && (e[0] < vu[0] || (e[0] === vu[0] && e[1] <= vu[1]));
        return `<div class="tv-ep${estVu ? ' vu' : ''}" role="button" tabindex="0" data-ep="${esc(e[2])}"><b>${se(e[0], e[1])}</b><span>${esc(e[4] || 'Épisode ' + e[1])}</span><span class="tv-cs">${estVu ? 'vu' : (e[3] || '').toUpperCase()}</span></div>`; }).join('') || '<p class="tv-msg">Aucun épisode.</p>'}</div>`;
  };
  /* ---- accès et démarrage ---- */
  const etatAcces = async (pin) => {
    try{ S.a = await acces(pin); }
    catch(e){
      const code = e.message === 'code';
      EL.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span></div><form class="tv-pin" data-tv="pin"><p class="tv-msg" style="flex-basis:100%"><b>${code ? 'Code incorrect.' : 'Code du Coffre'}</b> ${code ? '' : 'pour lire tes accès TV.'}</p>
        <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" aria-label="Code"><button class="tv-btn main" type="submit">Ouvrir</button></form>`;
      if (LE) LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${quitter}</div><p class="tv-msg">Déverrouille avec ton code (dans la liste).</p>`;
      setTimeout(() => { const i = EL.querySelector('input'); i && i.focus(); }, 50); return false;
    }
    if (!S.a){
      EL.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span></div><p class="tv-msg"><b>Pas encore d'accès TV.</b> Ouvre le <b>Coffre</b> et ajoute la fiche <b>Accès TV</b> : adresse du serveur (http://…:port), identifiant, mot de passe. Elle reste chiffrée avec ton code.</p>
        <div class="tv-row-b"><a class="tv-btn main" href="cachee.html">Ouvrir le Coffre</a><button type="button" class="tv-btn" data-tv="relais">Réessayer</button></div>`;
      if (LE) LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${quitter}</div><p class="tv-msg">Ajoute tes accès dans le Coffre pour commencer.</p>`;
      return false;
    }
    return true;
  };
  const demarrer = async (force) => {
    EL.innerHTML = '<p class="tv-msg">Chargement…</p>';
    if (!(await etatAcces())) return;
    const [rel] = await Promise.all([relaisOK(force === true), catalogue(S.a, force === 'maj')]);
    S.relais = rel; S.err = '';
    if (S.relais && !CATA){ try{ await liste(S.a, force === 'maj'); }catch(e){ S.err = e.message === 'acces' ? 'Identifiants refusés par le serveur (fiche Accès TV du Coffre).' : 'Serveur TV injoignable via le relais.'; } }
    rendreLecteur(S.cur); rendreListe();
    if (S.err) EL.insertAdjacentHTML('afterbegin', `<p class="tv-msg"><b>${esc(S.err)}</b></p>`);
  };
  /* ---- actions ---- */
  const jouer = async it => {
    S.cur = it; S.err = '';
    if (!lecteurDispo()){ externe(S.a, it); rendreListe(); return; }
    S.info = []; rendreLecteur(it, []); if (!S.vue) rendreListe();
    const p = await lire(LE.querySelector('video'), S.a, it, k => { if (S.cur === it) etatLecture(it, k); });
    if (p && S.cur === it){ const now = LE.querySelector('#tvNow small'); if (now) now.insertAdjacentHTML('beforeend', ` · reprise à ${mmss(p[0])} <button type="button" class="tv-a" data-tv="debut">depuis le début</button>`); }
    if (it.k === 'd') epg(S.a, it.id).then(info => { if (S.cur === it){ S.info = info; rendreLecteur(it, info); } });
    else { const v = LE.querySelector('video');                 // son AC3 / DTS : Chrome lit l'image sans le son (Edge, lui, lit souvent l'AC3)
      setTimeout(() => { if (S.cur === it && v && !v.paused && v.currentTime > 2 && 'webkitAudioDecodedByteCount' in v && v.webkitAudioDecodedByteCount === 0){
        S.err = 'Pas de son ici (format AC3/DTS) : ouvre le dock dans Microsoft Edge, ou utilise VLC.'; rendreLecteur(it, []); } }, 6000); }
  };
  const ouvrir = (k, id) => {
    if (k === 'd'){ const c = trouver('d', id) || favoris().map(f => ({...f, k:'d'})).find(x => String(x.id) === String(id)); if (c) jouer(c); return; }
    if (k === 'e'){ const x = aRegarder().find(y => y.k === 'e' && String(y.id) === String(id)); if (x) jouer(x); return; }
    const it = trouver(k, id); if (!it){ EL.insertAdjacentHTML('afterbegin', '<p class="tv-msg"><b>Plus dans le catalogue.</b></p>'); return; }
    S.vue = {t:k, it}; rendreVue();
  };
  const episode = id => {
    const s = S.vue && S.vue.it; if (!s) return; const e = s.eps.find(x => String(x[2]) === String(id)); if (!e) return;
    noterVu(s.id, e[0], e[1], e[2], e[3]);
    jouer({k:'e', id:e[2], ext:e[3], nom:`${s.nom} ${se(e[0], e[1])}`, titreLong:`${s.nom} · ${se(e[0], e[1])}${e[4] ? ' · ' + e[4] : ''}`, icone:s.icone, sid:s.id, s:e[0], e:e[1]});
    S.vue.saison = e[0]; rendreVue();
  };
  const clic = e => {
    const f = e.target.closest('[data-fav]');
    if (f){ e.stopPropagation(); const c = trouver('d', f.dataset.fav) || favoris().find(x => String(x.id) === f.dataset.fav); if (c){ basculerFavori(c); rendreListe(); if (S.cur) rendreLecteur(S.cur); } return; }
    const ff = e.target.closest('[data-favf]');
    if (ff){ e.stopPropagation(); const [k, id] = ff.dataset.favf.split(/:(.*)/s); const it = (S.vue && cleIt(S.vue.it) === ff.dataset.favf) ? S.vue.it : trouver(k, id) || favF().find(x => cleIt(x) === ff.dataset.favf); if (it){ basculerFavF(it); rendreListe(); } return; }
    const l = e.target.closest('[data-liste]');
    if (l){ e.stopPropagation(); const [k, id] = l.dataset.liste.split(/:(.*)/s); const it = (S.vue && cleIt(S.vue.it) === l.dataset.liste) ? S.vue.it : trouver(k, id) || aRegarder().find(x => cleIt(x) === l.dataset.liste); if (it){ basculerListe(it); rendreListe(); } return; }
    const og = e.target.closest('[data-onglet]'); if (og){ S.onglet = og.dataset.onglet; S.vue = null; LSs('tv:onglet', S.onglet); rendreListe(); return; }
    const ep = e.target.closest('[data-ep]'); if (ep){ episode(ep.dataset.ep); return; }
    const t = e.target.closest('[data-tv]'), a = t && t.dataset.tv;
    if (a === 'relais'){ relaisEtat = null; demarrer(true); return; }
    if (a === 'retour'){ S.vue = null; rendreListe(); return; }
    if (a === 'lire' && S.vue){ jouer(S.vue.it); return; }
    if (a === 'pip'){ const v = LE && LE.querySelector('video'); if (v){ (document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture()).catch(() => {}); } return; }
    if (a === 'fav' && S.cur){ basculerFavori(S.cur); rendreListe(); rendreLecteur(S.cur); return; }
    if (a === 'ext'){ const it = S.vue && S.vue.t === 'f' ? S.vue.it : S.cur; if (it) externe(S.a, it); return; }
    if (a === 'saut'){ sauter(LE.querySelector('video'), +t.dataset.s); setTimeout(majDirect, 300); return; }
    if (a === 'direct'){ auDirect(LE.querySelector('video')); setTimeout(majDirect, 500); return; }
    if (a === 'debut'){ const v = LE.querySelector('video'); if (v){ v.currentTime = 0; v.play().catch(() => {}); } t.remove(); return; }
    if (a === 'quitter'){ arreter(LE && LE.querySelector('video')); Z.quitter && Z.quitter(); return; }
    const c = e.target.closest('[data-it]'); if (c){ const [k, id] = c.dataset.it.split(/:(.*)/s); ouvrir(k, id); }
  };
  [EL, LE].filter(Boolean).forEach(r => {
    r.addEventListener('click', clic);
    r.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-it],[data-ep]')){ e.preventDefault(); e.target.click(); } });
    r.addEventListener('change', e => {
      if (e.target.matches('[data-tv="cat"]')){ S.cat[S.onglet] = e.target.value; LSs('tv:cats', S.cat); S.q[S.onglet] = ''; rendreListe(); }
      if (e.target.matches('[data-tv="saison"]') && S.vue){ S.vue.saison = +e.target.value; rendreVue(); }
      if (e.target.matches('[data-tv="st"]')){ const v = LE.querySelector('video'); if (e.target.value === '+'){ LE.querySelector('[data-tv="stf"]').click(); const ch = pistes(v).st.find(x => x.on); e.target.value = ch ? ch.id : ''; } else choisirSousTitres(v, e.target.value); }
      if (e.target.matches('[data-tv="stf"]') && e.target.files[0]){ const v = LE.querySelector('video'); ajouterSousTitres(v, e.target.files[0]).then(() => S.cur && rendreCmd(S.cur)).catch(() => {}); }
      if (e.target.matches('[data-tv="au"]')) choisirAudio(e.target.value);
    });
    r.addEventListener('input', e => { if (e.target.matches('[data-tv="q"]')){ S.q[S.onglet] = e.target.value; const pos = e.target.selectionStart; rendreListe(); const i = EL.querySelector('[data-tv="q"]'); if (i){ i.focus(); try{ i.setSelectionRange(pos, pos); }catch{} } } });
    r.addEventListener('submit', async e => { if (!e.target.matches('[data-tv="pin"]')) return; e.preventDefault(); const v = e.target.querySelector('input').value; if (await etatAcces(v)) demarrer(); });
  });
  window.addEventListener('synchro:prefs', () => { if (S.a) rendreListe(); });
  /* clavier (PC) : ← retour, → avance, quand le lecteur est visible et qu'on n'écrit pas dans un champ */
  if (LE) document.addEventListener('keydown', e => {
    if (!S.cur || !LE.offsetParent || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); sauter(LE.querySelector('video'), e.key === 'ArrowLeft' ? -SAUTS[0] : SAUTS[1]); setTimeout(majDirect, 300); }
  });
  if (LE) setInterval(() => { if (S.cur && S.cur.k === 'd' && LE.offsetParent) majDirect(); }, 5000);
  demarrer();
  return {arreter:() => arreter(LE && LE.querySelector('video')), recharger:() => demarrer(true)};
}

window.TV = {monter, acces, oublier, relaisOK, catalogue, favoris, basculerFavori, aRegarder, externe, ios:IOS, styles};
})();
