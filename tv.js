// mon-ecran-version: 27abc74b
/* Mon Écran — TV (v44) : chaînes d'un abonnement Xtream.
   - Accès (serveur, identifiant, mot de passe) : fiche « Accès TV » du Coffre, chiffrée avec ton code et partagée chiffrée par la
     synchronisation ; jamais dans le dépôt, le classeur ou la configuration (publics). Lus une fois par session (code demandé si le
     Coffre n'est pas ouvert), gardés en mémoire de session (« tv:acces ») le temps de l'onglet / de l'appli.
   - Les serveurs Xtream sont en http : une page en https ne peut ni les interroger ni lire leurs flux. Sur le PC, le relais
     (outils/tv-relais.mjs, lancé sur la machine, http://127.0.0.1:8765) fait l'intermédiaire : liste des chaînes, programme, lecture.
     Sans relais (ou sur iPhone) : chaînes favorites, ouverture dans Infuse (iPhone) ou VLC (fichier .m3u d'une chaîne).
   - Favoris : « tv:favoris » [{id, nom, icone, cat}], partagés par la partie « prefs » de la synchro.
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
/* → {serveur, u, p} | null (pas de fiche) ; lève 'verrou' (code nécessaire) ou 'code' (code incorrect) */
async function acces(pin){
  const a = SSg('tv:acces', null); if (a && a.serveur) return a;
  let items;
  try{ items = await lireCoffre(pin); }catch{ throw new Error(pin ? 'code' : 'verrou'); }
  if (items == null){ if (LSg('coffre:chiffre', null)) throw new Error('verrou'); return null; }
  const f = (items || []).find(x => x && x.type === 'tv');
  if (!f || !f.serveur || !f.identifiant) return null;
  const r = {serveur:serveurNet(f.serveur), u:String(f.identifiant).trim(), p:String(f.motdepasse || '')};
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
const urlFlux = (a, id, ext) => `${a.serveur}/live/${enc(a.u)}/${enc(a.p)}/${id}.${ext}`;

/* ---------- liste des chaînes (mémoire de session ; noms et numéros seulement, aucun accès) ---------- */
let LISTE = null;
async function liste(a, force){
  if (LISTE && !force) return LISTE;
  const c = !force && SSg('tv:liste', null); if (c && c.ch){ LISTE = c; return LISTE; }
  const info = await api(a, '');
  if (info && info.user_info && (info.user_info.auth === 0 || info.user_info.auth === '0')) throw new Error('acces');
  const [cats, ch] = await Promise.all([api(a, 'get_live_categories'), api(a, 'get_live_streams')]);
  LISTE = {at:Date.now(), fin:info && info.user_info && info.user_info.exp_date ? +info.user_info.exp_date * 1000 : null,
    cats:(cats || []).map(x => ({id:String(x.category_id), nom:x.category_name || '?'})),
    ch:(ch || []).map(x => ({id:x.stream_id, nom:String(x.name || '').trim(), icone:x.stream_icon || '', cat:String(x.category_id), num:x.num}))};
  SSs('tv:liste', LISTE); return LISTE;
}
async function epg(a, id){
  try{ const j = await api(a, 'get_short_epg', `&stream_id=${enc(id)}&limit=3`);
    return (j.epg_listings || []).map(x => ({titre:b64txt(x.title), debut:+x.start_timestamp * 1000, fin:+x.stop_timestamp * 1000})).filter(x => x.titre); }
  catch{ return []; }
}

/* ---------- favoris ---------- */
const favoris = () => LSg('tv:favoris', []);
function basculerFavori(ch){
  const l = favoris(), i = l.findIndex(x => String(x.id) === String(ch.id));
  if (i >= 0) l.splice(i, 1); else l.push({id:ch.id, nom:ch.nom, icone:ch.icone || '', cat:ch.cat || ''});
  LSs('tv:favoris', l.length ? l : null);
  try{ window.Synchro && Synchro.prefsPlusTard && Synchro.prefsPlusTard(); }catch{}
  return i < 0;
}
const estFavori = id => favoris().some(x => String(x.id) === String(id));

/* ---------- lecture ---------- */
let hlsCharge = null, HLS = null;
function chargerHls(){
  return hlsCharge || (hlsCharge = new Promise((ok, ko) => { const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'; s.onload = () => ok(window.Hls); s.onerror = () => { hlsCharge = null; ko(new Error('lecteur')); };
    document.head.appendChild(s); }));
}
async function lire(video, a, id, surErreur){
  if (HLS){ try{ HLS.destroy(); }catch{} HLS = null; }
  const src = viaRelais('flux', urlFlux(a, id, 'm3u8'));
  video.onerror = () => surErreur && surErreur('flux');
  if (video.canPlayType('application/vnd.apple.mpegurl')){ video.src = src; video.play().catch(() => {}); return; }
  const Hls = await chargerHls();
  if (!Hls || !Hls.isSupported()){ surErreur && surErreur('lecteur'); return; }
  HLS = new Hls({lowLatencyMode:false, backBufferLength:30});
  HLS.on(Hls.Events.ERROR, (e, d) => { if (d && d.fatal) surErreur && surErreur('flux'); });
  HLS.loadSource(src); HLS.attachMedia(video);
  HLS.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
}
function arreter(video){ if (HLS){ try{ HLS.destroy(); }catch{} HLS = null; } if (video){ video.pause(); video.removeAttribute('src'); video.load(); } }
/* lecteur externe : Infuse (iPhone / iPad), sinon un petit fichier .m3u (VLC ou le lecteur associé) */
function externe(a, ch){
  if (IOS){ location.href = 'infuse://x-callback-url/play?url=' + enc(urlFlux(a, ch.id, 'ts')); return; }
  const f = new Blob([`#EXTM3U\n#EXTINF:-1,${ch.nom}\n${urlFlux(a, ch.id, 'ts')}\n`], {type:'audio/x-mpegurl'});
  const l = document.createElement('a'); l.href = URL.createObjectURL(f); l.download = (ch.nom || 'chaine').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.m3u';
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
.tv-now{display:flex;flex-direction:column;gap:2px;min-width:0}
.tv-now b{font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-now small{font-size:.78rem;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-bar{height:3px;border-radius:2px;background:var(--line);overflow:hidden;margin-top:4px}.tv-bar i{display:block;height:100%;background:var(--accent)}
.tv-f{display:flex;gap:8px}
.tv-f select,.tv-f input,.tv-pin input{font:inherit;font-size:16px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}
.tv-f select{flex:0 1 46%}.tv-f input{flex:1}
.tv-l{display:flex;flex-direction:column;overflow:auto;min-height:0;margin:0 -6px;padding:0 6px}
.tv-c{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line);width:100%;text-align:left;cursor:pointer}
.tv-c[aria-current="true"] .tv-cn{color:var(--accent)}
.tv-ic{width:36px;height:36px;border-radius:9px;background:var(--card) center / contain no-repeat;display:grid;place-items:center;font-size:.7rem;font-weight:700;color:var(--ink-soft);overflow:hidden}
.tv-cn{font-size:.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-st{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;color:var(--ink-soft);font-size:1.05rem}
.tv-st[aria-pressed="true"]{color:#e0a100}
.tv-pin{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tv-pin input{width:9em}
.tv-ol{margin:0;padding-left:20px;font-size:.84rem;line-height:1.5;display:flex;flex-direction:column;gap:6px}
.tv-ol code{font-size:.78rem;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1px 5px;overflow-wrap:anywhere}`;
function styles(){ if (document.getElementById('tv-css')) return; const s = document.createElement('style'); s.id = 'tv-css'; s.textContent = CSS; document.head.appendChild(s); }

/* ---------- interface : monter({lecteur, chaines}) — deux éléments (le lecteur peut manquer : liste seule) ---------- */
const STAR = '★';
function monter(Z){
  styles();
  const S = {a:null, relais:false, cat:LSg('tv:cat', 'fav'), q:'', cur:null, err:''};
  const EL = Z.chaines, LE = Z.lecteur;
  const rendreLecteur = (ch, info) => {
    if (!LE) return;
    if (!S.relais){
      LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${Z.quitter ? `<button type="button" class="tv-a" data-tv="quitter">Quitter le mode TV</button>` : ''}</div>
        ${relaisAide()}`;
      return;
    }
    if (!LE.querySelector('video')) LE.innerHTML = `<div class="tv-h"><span class="tv-k">En lecture</span>${Z.quitter ? `<button type="button" class="tv-a" data-tv="quitter">Quitter le mode TV</button>` : ''}</div>
      <video class="tv-video" controls playsinline></video>
      <div class="tv-h"><span class="tv-now" id="tvNow"><b>Choisis une chaîne</b><small>dans la liste</small></span><span class="tv-row-b" id="tvAct"></span></div>`;
    const now = LE.querySelector('#tvNow'), act = LE.querySelector('#tvAct');
    if (!ch) return;
    const e = (info || [])[0], n = (info || [])[1], t = Date.now();
    const pct = e && e.fin > e.debut ? Math.max(0, Math.min(100, (t - e.debut) / (e.fin - e.debut) * 100)) : 0;
    const hm = d => new Date(d).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    now.innerHTML = `<b>${esc(ch.nom)}${e ? ' · ' + esc(e.titre) : ''}</b><small>${S.err ? esc(S.err) : e ? `${hm(e.debut)}–${hm(e.fin)}${n ? ` · ensuite ${hm(n.debut)} ${esc(n.titre)}` : ''}` : 'programme non fourni'}</small>${e ? `<span class="tv-bar"><i style="width:${pct.toFixed(0)}%"></i></span>` : ''}`;
    act.innerHTML = `<button type="button" class="tv-btn" data-tv="fav" aria-pressed="${estFavori(ch.id)}">${estFavori(ch.id) ? '★ Favori' : '☆ Favori'}</button><button type="button" class="tv-btn" data-tv="ext">${IOS ? 'Infuse' : 'VLC'}</button>`;
  };
  const relaisAide = () => `<p class="tv-msg"><b>Lecture dans le dock : lance le relais sur ton PC.</b> Les chaînes de ton abonnement sont en http : une page sécurisée ne peut pas les lire seule.</p>
    <ol class="tv-ol"><li>Installe <b>Node.js</b> (version LTS, nodejs.org), une seule fois.</li>
      <li>Télécharge <a class="tv-a" href="outils/tv-relais.mjs" download>tv-relais.mjs</a> et <a class="tv-a" href="outils/tv-relais.cmd" download>tv-relais.cmd</a> dans un même dossier.</li>
      <li>Double-clique <code>tv-relais.cmd</code> (laisse la fenêtre ouverte). Pour qu'il démarre avec Windows : place un raccourci de ce fichier dans <code>shell:startup</code> (Win + R).</li>
      <li>Reviens ici et touche <b>Réessayer</b>. Si Chrome demande l'accès aux appareils du réseau local, accepte.</li></ol>
    <div class="tv-row-b"><button type="button" class="tv-btn main" data-tv="relais">Réessayer</button></div>
    <p class="tv-msg">En attendant (et sur iPhone) : tes chaînes favorites s'ouvrent dans ${IOS ? 'Infuse' : 'VLC'}.</p>`;
  const rendreListe = () => {
    if (!S.a){ return; }
    const favs = favoris();
    let L = S.relais && LISTE ? LISTE.ch : favs;
    if (S.relais && LISTE){
      if (S.cat === 'fav') L = favs.map(f => LISTE.ch.find(c => String(c.id) === String(f.id)) || f);
      else if (S.cat !== 'tout') L = L.filter(c => c.cat === S.cat);
    }
    const q = S.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (q) L = (S.relais && LISTE ? LISTE.ch : favs).filter(c => c.nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
    const tot = L.length; L = L.slice(0, 400);
    const ini = t => esc((String(t || '?').replace(/^[^a-z0-9]+/i, '')[0] || '?').toUpperCase());
    const opts = S.relais && LISTE ? `<select data-tv="cat" aria-label="Catégorie"><option value="fav"${S.cat === 'fav' ? ' selected' : ''}>★ Favoris (${favs.length})</option><option value="tout"${S.cat === 'tout' ? ' selected' : ''}>Toutes (${LISTE.ch.length})</option>${LISTE.cats.map(c => `<option value="${esc(c.id)}"${S.cat === c.id ? ' selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>` : '';
    EL.innerHTML = `<div class="tv-h"><span class="tv-k">Chaînes${S.relais && LISTE ? '' : ' favorites'}</span>${S.relais ? '<button type="button" class="tv-a" data-tv="maj">Actualiser</button>' : ''}</div>
      <div class="tv-f">${opts}<input type="search" data-tv="q" placeholder="Chercher une chaîne" value="${esc(S.q)}" aria-label="Chercher une chaîne"></div>
      <div class="tv-l">${L.map(c => `<div class="tv-c" role="button" tabindex="0" data-ch="${esc(c.id)}"${S.cur && String(S.cur.id) === String(c.id) ? ' aria-current="true"' : ''}>
          <span class="tv-ic"${c.icone ? ` style="background-image:url(&quot;${esc(String(c.icone).replace(/^http:\/\//i, 'https://'))}&quot;)"` : ''}>${c.icone ? '' : ini(c.nom)}</span>
          <span class="tv-cn">${esc(c.nom)}</span>
          <button type="button" class="tv-st" data-fav="${esc(c.id)}" aria-pressed="${estFavori(c.id)}" aria-label="${estFavori(c.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${estFavori(c.id) ? STAR : '☆'}</button></div>`).join('')
        || `<p class="tv-msg" style="padding:10px 0">${S.relais ? (q ? 'Aucune chaîne trouvée.' : S.cat === 'fav' ? 'Aucun favori : choisis « Toutes » et touche ☆ à côté des chaînes que tu regardes.' : 'Aucune chaîne.') : 'Aucun favori pour l\'instant. Choisis-les sur le PC (relais lancé) : ils arrivent ici par la synchronisation.'}</p>`}
        ${tot > L.length ? `<p class="tv-msg" style="padding:8px 0">${tot - L.length} autres : affine la recherche.</p>` : ''}</div>`;
  };
  const etatAcces = async (pin) => {
    try{ S.a = await acces(pin); }
    catch(e){
      const code = e.message === 'code';
      const html = `<div class="tv-h"><span class="tv-k">TV</span></div><form class="tv-pin" data-tv="pin"><p class="tv-msg" style="flex-basis:100%"><b>${code ? 'Code incorrect.' : 'Code du Coffre'}</b> ${code ? '' : 'pour lire tes accès TV.'}</p>
        <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" aria-label="Code"><button class="tv-btn main" type="submit">Ouvrir</button></form>`;
      EL.innerHTML = html; if (LE) LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${Z.quitter ? `<button type="button" class="tv-a" data-tv="quitter">Quitter le mode TV</button>` : ''}</div><p class="tv-msg">Déverrouille avec ton code (dans la liste).</p>`;
      setTimeout(() => { const i = EL.querySelector('input'); i && i.focus(); }, 50); return false;
    }
    if (!S.a){
      const html = `<div class="tv-h"><span class="tv-k">TV</span></div><p class="tv-msg"><b>Pas encore d'accès TV.</b> Ouvre le <b>Coffre</b> (appui long sur l'horloge de l'accueil, ou État) et ajoute la fiche <b>Accès TV</b> : adresse du serveur (http://…:port), identifiant, mot de passe. Elle reste chiffrée avec ton code.</p>
        <div class="tv-row-b"><a class="tv-btn main" href="cachee.html">Ouvrir le Coffre</a><button type="button" class="tv-btn" data-tv="relais">Réessayer</button></div>`;
      EL.innerHTML = html; if (LE) LE.innerHTML = `<div class="tv-h"><span class="tv-k">TV</span>${Z.quitter ? `<button type="button" class="tv-a" data-tv="quitter">Quitter le mode TV</button>` : ''}</div><p class="tv-msg">Ajoute tes accès dans le Coffre pour commencer.</p>`;
      return false;
    }
    return true;
  };
  const demarrer = async (force) => {
    EL.innerHTML = '<p class="tv-msg">Chargement…</p>';
    if (!(await etatAcces())) return;
    S.relais = await relaisOK(force);
    if (S.relais){ try{ await liste(S.a, force === 'liste'); S.err = ''; }catch(e){ S.relais = !!LISTE; S.err = e.message === 'acces' ? 'Identifiants refusés par le serveur (fiche Accès TV du Coffre).' : 'Serveur TV injoignable via le relais.'; } }
    rendreLecteur(S.cur); rendreListe();
    if (S.err){ EL.insertAdjacentHTML('afterbegin', `<p class="tv-msg"><b>${esc(S.err)}</b></p>`); }
  };
  const choisir = async id => {
    const c = (LISTE && LISTE.ch.find(x => String(x.id) === String(id))) || favoris().find(x => String(x.id) === String(id)); if (!c) return;
    S.cur = c; S.err = ''; LSs('tv:derniere', String(c.id));
    if (!S.relais || !LE){ externe(S.a, c); rendreListe(); return; }
    rendreLecteur(c, []); rendreListe();
    await lire(LE.querySelector('video'), S.a, c.id, k => { S.err = k === 'lecteur' ? 'Ce navigateur ne sait pas lire ce flux : essaie VLC.' : 'Flux illisible ici (format ou serveur) : essaie VLC.'; rendreLecteur(c, []); });
    epg(S.a, c.id).then(info => { if (S.cur === c) rendreLecteur(c, info); });
  };
  const racine = [EL, LE].filter(Boolean);
  const clic = e => {
    const f = e.target.closest('[data-fav]');
    if (f){ e.stopPropagation(); const c = (LISTE && LISTE.ch.find(x => String(x.id) === f.dataset.fav)) || favoris().find(x => String(x.id) === f.dataset.fav); if (c){ basculerFavori(c); rendreListe(); if (S.cur) rendreLecteur(S.cur); } return; }
    const t = e.target.closest('[data-tv]'), a = t && t.dataset.tv;
    if (a === 'relais'){ relaisEtat = null; demarrer(true); return; }
    if (a === 'maj'){ SSs('tv:liste', null); LISTE = null; demarrer('liste'); return; }
    if (a === 'fav' && S.cur){ basculerFavori(S.cur); rendreListe(); rendreLecteur(S.cur); return; }
    if (a === 'ext' && S.cur){ externe(S.a, S.cur); return; }
    if (a === 'quitter'){ arreter(LE && LE.querySelector('video')); Z.quitter && Z.quitter(); return; }
    const c = e.target.closest('[data-ch]'); if (c) choisir(c.dataset.ch);
  };
  racine.forEach(r => {
    r.addEventListener('click', clic);
    r.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-ch]')){ e.preventDefault(); choisir(e.target.dataset.ch); } });
    r.addEventListener('change', e => { if (e.target.matches('[data-tv="cat"]')){ S.cat = e.target.value; LSs('tv:cat', S.cat); S.q = ''; rendreListe(); } });
    r.addEventListener('input', e => { if (e.target.matches('[data-tv="q"]')){ S.q = e.target.value; const pos = e.target.selectionStart; rendreListe(); const i = EL.querySelector('[data-tv="q"]'); if (i){ i.focus(); try{ i.setSelectionRange(pos, pos); }catch{} } } });
    r.addEventListener('submit', async e => { if (!e.target.matches('[data-tv="pin"]')) return; e.preventDefault(); const v = e.target.querySelector('input').value; if (await etatAcces(v)) demarrer(); });
  });
  window.addEventListener('synchro:prefs', () => { if (S.a) rendreListe(); });
  demarrer();
  return {arreter:() => arreter(LE && LE.querySelector('video')), recharger:() => demarrer(true)};
}

window.TV = {monter, acces, oublier, relaisOK, liste:() => LISTE, favoris, basculerFavori, externe, ios:IOS, styles};
})();
