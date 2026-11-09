// mon-ecran-version: ed5508de
// Rappels des Pronos (v72) : notifications sur les téléphones abonnés (page Pronos › Mon profil › Rappels).
// - le matin (premier passage après 9 h, heure de Paris) : les pronos pas encore faits jusqu'au lendemain 8 h ;
// - avant un match : environ une heure avant le coup d'envoi, si le joueur n'a pas encore pronostiqué.
// Abonnements et pronos déjà faits : serveur des pronos (action « rappels », clé PRONOS_CLE = propriété du script CLE_TACHE).
// Matchs : donnees/sport/pronos.json (tâche Sport). Envoi : protocole Web Push, clés PUSH_PUBLIC / PUSH_PRIVE (secrets GitHub).
// Publie donnees/pronos/notifications.json (clé publique, lue par la page pour s'abonner) et donnees/pronos/rappels.json
// (rappels déjà envoyés, en empreintes : ni pseudo ni match en clair), pour ne jamais prévenir deux fois.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { CFG } from './config-lire.mjs';

const PUB = process.env.PUSH_PUBLIC || '', PRIV = process.env.PUSH_PRIVE || '', CLE = process.env.PRONOS_CLE || '';
const [compte, depot] = String(process.env.GITHUB_REPOSITORY || 'ZyAvo/iPhone-Dock').split('/');
const SITE = process.env.SITE || `https://${compte.toLowerCase()}.github.io/${depot}/`;
const API = CFG('pronos.api', '') || process.env.PRONOS_API || '';
const OUT = 'donnees/pronos', NOW = Date.now(), H = 3600e3;
const BASE_L = CFG('pronos.ligues', [{id:'fra.1'}, {id:'eng.1'}, {id:'270559'}, {id:'uefa.champions'}, {id:'uefa.nations'}, {id:'17567'}]).map(x => String(x.id));

if (!PUB || !PRIV || !CLE){ console.log('Rappels pas encore en place : secrets PUSH_PUBLIC, PUSH_PRIVE et PRONOS_CLE à créer (voir outils/dev/PRONOS.md).'); process.exit(0); }
if (!API){ console.log('Adresse du serveur des pronos absente du classeur (onglet Pronos) : rien à faire.'); process.exit(0); }
fs.mkdirSync(OUT, {recursive:true});
fs.writeFileSync(`${OUT}/notifications.json`, JSON.stringify({cle:PUB}));          // ne change pas d'un passage à l'autre : rien n'est republié

const { default: webpush } = await import('web-push');
webpush.setVapidDetails(SITE, PUB, PRIV);

const lire = f => { try{ return JSON.parse(fs.readFileSync(f, 'utf8')); }catch{ return null; } };
const heure = t => new Date(t).toLocaleTimeString('fr-FR', {timeZone:'Europe/Paris', hour:'2-digit', minute:'2-digit'});
const parisJ = t => new Date(t).toLocaleDateString('fr-CA', {timeZone:'Europe/Paris'});            // AAAA-MM-JJ
const parisH = t => Number(new Date(t).toLocaleString('en-GB', {timeZone:'Europe/Paris', hour:'2-digit', hour12:false}));
const emp = s => crypto.createHash('sha256').update(s).digest('base64url').slice(0, 16);

async function appel(action, x = {}){
  const r = await fetch(API, {method:'POST', redirect:'follow', headers:{'content-type':'text/plain'}, body:JSON.stringify({action, cle:CLE, ...x})});
  return r.json();
}

// matchs à venir des compétitions des Pronos (fichier local repris de la branche donnees, sinon le site)
let P = lire('donnees/sport/pronos.json');
if (!P){ try{ P = await (await fetch(SITE + 'donnees/sport/pronos.json')).json(); }catch{} }
if (!P || !P.leagues){ console.log('Pas de fichier des matchs des Pronos : rien à faire.'); process.exit(0); }
const MATCHS = [];
for (const [lg, L] of Object.entries(P.leagues)) for (const m of L.events || [])
  if (m.home && m.away && m.state !== 'post' && m.state !== 'in' && m.t > NOW) MATCHS.push({...m, lg});
MATCHS.sort((a, b) => a.t - b.t);

const R = await appel('rappels');
if (!R || R.err){ console.log('Serveur des pronos :', R && R.err === 'cle' ? 'clé refusée (propriété du script CLE_TACHE = secret PRONOS_CLE ?)' : R && R.err === 'action' ? 'à mettre à jour (Code.gs v72)' : 'injoignable'); process.exit(0); }

const ETAT = lire(`${OUT}/rappels.json`) || {v:1, envoyes:{}};
for (const [k, t] of Object.entries(ETAT.envoyes)) if (NOW - t > 3 * 24 * H) delete ETAT.envoyes[k];
const deja = k => !!ETAT.envoyes[emp(k)], noter = k => { ETAT.envoyes[emp(k)] = NOW; };

const aujourdHui = parisJ(NOW), matin = parisH(NOW) >= 9;
const finJour = (() => { let t = NOW; while (parisJ(t) === aujourdHui) t += H; while (parisH(t) < 8) t += H; return t; })();   // demain 8 h
const nom = m => `${m.home.name} – ${m.away.name}`;
let envoyes = 0, expires = 0, erreurs = 0;

for (const a of R.abonnements || []){
  const ligues = new Set(a.ligues && a.ligues.length ? a.ligues : BASE_L), faits = new Set((R.faits || {})[`${a.g}|${a.p}`] || []);
  const manque = MATCHS.filter(m => ligues.has(m.lg) && !faits.has(String(m.id)));
  const qui = `${a.g}|${a.p}|${a.endpoint}`;
  let msg = null; const cles = [];
  const jour = manque.filter(m => m.t < finJour), bientot = manque.filter(m => m.t <= NOW + 80 * 60e3 && !deja(`m|${qui}|${m.id}`));
  if (matin && jour.length && !deja(`j|${qui}|${aujourdHui}`)){
    msg = {titre:'Pronos du jour', texte:jour.length === 1 ? `${nom(jour[0])} à ${heure(jour[0].t)} : ton prono t'attend.` : `${jour.length} pronos à faire, le premier à ${heure(jour[0].t)} (${nom(jour[0])}).`, tag:'pronos-jour'};
    cles.push(`j|${qui}|${aujourdHui}`, ...bientot.map(m => `m|${qui}|${m.id}`));
  } else if (bientot.length){
    msg = {titre:'Bientôt le coup d\'envoi', texte:bientot.length === 1 ? `${nom(bientot[0])} à ${heure(bientot[0].t)} : pas encore de prono.` : `${bientot.length} matchs commencent bientôt sans ton prono (dès ${heure(bientot[0].t)}).`, tag:'pronos-bientot'};
    cles.push(...bientot.map(m => `m|${qui}|${m.id}`));
  }
  if (!msg) continue;
  try{
    await webpush.sendNotification({endpoint:a.endpoint, keys:a.keys}, JSON.stringify({...msg, url:'pronos.html'}), {TTL:2 * 3600, urgency:'normal'});
    cles.forEach(noter); envoyes++;
  }catch(e){
    if (e && (e.statusCode === 404 || e.statusCode === 410)){ expires++; await appel('desabonner', {endpoint:a.endpoint}).catch(() => {}); }   // appareil désabonné ou appli supprimée
    else { erreurs++; console.log('Envoi refusé :', e && e.statusCode, String(e && e.body || e && e.message || '').slice(0, 120)); }
  }
}
fs.writeFileSync(`${OUT}/rappels.json`, JSON.stringify(ETAT));
console.log(`Rappels : ${(R.abonnements || []).length} appareils abonnés, ${envoyes} rappels envoyés, ${expires} abonnements expirés retirés, ${erreurs} erreurs.`);
