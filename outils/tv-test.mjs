// Mon Écran — test de la TV depuis GitHub (ne publie rien, n'écrit rien sur le dépôt).
// Question : le serveur Xtream accepte-t-il une connexion depuis les serveurs de GitHub, et que contient l'abonnement ?
// Accès lus dans les secrets GitHub XT_SERVEUR, XT_IDENTIFIANT, XT_MOTDEPASSE (Settings → Secrets and variables → Actions).
// Le dépôt est public, donc les journaux des tâches aussi : ce rapport ne montre JAMAIS l'adresse du serveur, l'identifiant,
// le mot de passe ni une adresse de flux — seulement des états, des durées et des nombres.
import fs from 'node:fs';

const S = (process.env.XT_SERVEUR || '').trim().replace(/\/+$/, ''), U = (process.env.XT_IDENTIFIANT || '').trim(), P = process.env.XT_MOTDEPASSE || '';
const BASE = S && !/^https?:\/\//i.test(S) ? 'http://' + S : S;
const UA = 'VLC/3.0.20 LibVLC/3.0.20';
const L = ['# Test TV (Xtream) depuis GitHub', '', `Lancé le ${new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris'})} — aucun accès ni adresse n'est affiché ici.`, ''];
const fin = () => { const md = L.join('\n') + '\n'; console.log(md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); };
const masque = t => String(t || '').split(S).join('[serveur]').split(U).join('[identifiant]').split(P || '\u0000').join('[mot de passe]');
const n = v => Number(v || 0).toLocaleString('fr-FR');

async function lire(url, ms = 30000){
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms), t0 = Date.now();
  try{ const r = await fetch(url, {headers:{'User-Agent':UA, 'Accept':'*/*'}, signal:c.signal, redirect:'follow'}); const txt = await r.text();
    return {ok:r.ok, statut:r.status, txt, ms:Date.now() - t0, https:r.url.startsWith('https:')}; }
  catch(e){ return {ok:false, statut:0, txt:'', ms:Date.now() - t0, err:e.name === 'AbortError' ? `délai dépassé (${ms / 1000} s)` : masque((e.cause && e.cause.code) || e.message)}; }
  finally{ clearTimeout(t); }
}
const api = (action, extra = '') => lire(`${BASE}/player_api.php?username=${encodeURIComponent(U)}&password=${encodeURIComponent(P)}${action ? '&action=' + action : ''}${extra}`, action && /streams|series$/.test(action) ? 90000 : 30000);
const json = r => { try{ return JSON.parse(r.txt); }catch{ return null; } };

if (!BASE || !U){ L.push('❌ Secrets manquants : il faut **XT_SERVEUR**, **XT_IDENTIFIANT** et **XT_MOTDEPASSE** (Settings → Secrets and variables → Actions).'); fin(); process.exit(0); }

/* 1. connexion */
const r0 = await api('');
const j0 = json(r0) || {};
L.push('## 1. Connexion depuis GitHub', '');
if (!r0.statut){ L.push(`❌ **Serveur injoignable depuis GitHub** (${r0.err}). Le fournisseur bloque probablement les serveurs : catalogue automatique impossible, il faudra l'import d'un fichier M3U.`); fin(); process.exit(0); }
if (!r0.ok || !j0.user_info){ L.push(`❌ **Réponse refusée** (HTTP ${r0.statut}, ${r0.ms} ms). ${r0.statut === 403 || r0.statut === 401 ? 'Le fournisseur refuse les connexions depuis les serveurs de GitHub.' : 'Réponse inattendue.'}`); fin(); process.exit(0); }
const ui = j0.user_info, si = j0.server_info || {};
if (String(ui.auth) === '0'){ L.push('❌ **Identifiants refusés** : vérifie les secrets XT_IDENTIFIANT et XT_MOTDEPASSE.'); fin(); process.exit(0); }
const exp = ui.exp_date ? new Date(+ui.exp_date * 1000) : null;
L.push(`✅ **Serveur joignable et identifiants acceptés** (${r0.ms} ms).`, '',
  `- État de l'abonnement : ${ui.status || '?'}${exp ? ` · valable jusqu'en ${exp.toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}` : ''}`,
  `- Connexions : ${ui.active_cons ?? '?'} en cours sur ${ui.max_connections ?? '?'} autorisée(s)`,
  `- Formats de flux proposés : ${(ui.allowed_output_formats || []).join(', ') || '?'}`,
  `- Adresse sécurisée (https) annoncée par le serveur : ${si.https_port && String(si.https_port) !== '0' ? `oui (port ${si.https_port}) — à essayer pour le lecteur intégré sur iPhone` : 'non'}`, '');

/* 2. contenu de l'abonnement */
L.push('## 2. Contenu de l\'abonnement', '', '| | Catégories | Éléments | Durée |', '|---|---:|---:|---:|');
const compter = async (cat, liste, nom) => {
  const a = await api(cat), b = await api(liste), ja = json(a) || [], jb = json(b) || [];
  L.push(`| ${nom} | ${Array.isArray(ja) ? n(ja.length) : '—'} | ${Array.isArray(jb) ? n(jb.length) : `❌ HTTP ${b.statut || b.err}`} | ${((a.ms + b.ms) / 1000).toFixed(1)} s |`);
  return Array.isArray(jb) ? jb : [];
};
const live = await compter('get_live_categories', 'get_live_streams', 'Directs');
const vod = await compter('get_vod_categories', 'get_vod_streams', 'Films');
const series = await compter('get_series_categories', 'get_series', 'Séries');
L.push('');
const parExt = {}; vod.forEach(v => { const e = String(v.container_extension || '?').toLowerCase(); parExt[e] = (parExt[e] || 0) + 1; });
const tmdb = vod.filter(v => v.tmdb || v.tmdb_id).length;
if (vod.length) L.push(`- Formats des films : ${Object.entries(parExt).sort((a, b) => b[1] - a[1]).map(([e, c]) => `${e} ${Math.round(c / vod.length * 100)} %`).join(', ')} (mp4 : lisible dans le dock sur PC ; mkv, avi : VLC sur PC, Infuse sur iPhone)`,
  `- Films avec leur référence TMDB : ${Math.round(tmdb / vod.length * 100)} % (badge « Dans ton abonnement » possible dans Vidéos)`);
const epg = live.filter(c => c.epg_channel_id).length;
if (live.length) L.push(`- Directs avec programme TV : ${Math.round(epg / live.length * 100)} %`);
L.push('');

/* 3. liste complète en un seul appel (ce que ferait la tâche quotidienne) */
L.push('## 3. Liste complète en un seul appel (M3U)', '');
const m = await lire(`${BASE}/get.php?username=${encodeURIComponent(U)}&password=${encodeURIComponent(P)}&type=m3u_plus&output=ts`, 180000);
if (!m.ok) L.push(`⚠️ Liste M3U non fournie (HTTP ${m.statut || m.err}, ${(m.ms / 1000).toFixed(1)} s) : la tâche passerait par les listes ci-dessus (6 appels au lieu d'un).`);
else {
  const lignes = m.txt.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const k = re => lignes.filter(l => re.test(l)).length;
  L.push(`✅ ${n(m.txt.length / 1048576 < 1 ? Math.round(m.txt.length / 1024) : (m.txt.length / 1048576).toFixed(1))} ${m.txt.length / 1048576 < 1 ? 'Ko' : 'Mo'} en ${(m.ms / 1000).toFixed(1)} s · ${n(lignes.length)} entrées : ${n(k(/\/movie\//))} films, ${n(k(/\/series\//))} épisodes, ${n(lignes.length - k(/\/movie\//) - k(/\/series\//))} directs.`);
}
const tout = live.length + vod.length + series.length + (m.ok ? 1 : 0);
L.push('', '## Conclusion', '', tout ? '✅ Le catalogue automatique chiffré est possible depuis GitHub. Prochaine étape : le lot VOD (Directs / Films / Séries) avec la tâche quotidienne et la clé `TV_CLE`.'
  : '⚠️ Connexion acceptée mais aucune liste fournie : le fournisseur limite peut-être les serveurs. Solution de repli : import d\'un fichier M3U sur chaque appareil.',
  '', '_Rappel : une seule connexion par jour sera faite par la tâche, sans aucune vidéo, pour limiter le risque de blocage par le fournisseur._');
fin();
