// Mon Écran — test de faisabilité de l'agrégateur de prix (ne publie rien, n'écrit rien sur le dépôt).
// Deux pistes :
//   1. Open Prices (Open Food Facts) : prix relevés par la communauté, API publique et gratuite.
//   2. Sites drive des enseignes : la page s'ouvre-t-elle depuis ici, est-elle bloquée (protection anti-robots),
//      les prix sont-ils lisibles dans la page ou seulement chargés ensuite par JavaScript ?
// À lancer depuis GitHub (tâche « Prix (test) ») ET depuis ton PC : les sites ne répondent pas pareil à un serveur
// GitHub et à une connexion de particulier.
//   PC : Node 18 ou plus récent, puis dans le dossier du dépôt :  node outils/prix-test.mjs
// Résultat : affiché, et écrit dans prix-test-rapport.md + prix-test-rapport.json (dossier courant).
// Réglages facultatifs (variables d'environnement) :
//   PRIX_LAT, PRIX_LON, PRIX_RAYON (km)  zone pour compter les relevés Open Prices près de chez toi (défaut : Paris, 30 km)
//   PRIX_EANS   codes-barres à tester, séparés par des virgules ;  PRIX_MOT   mot cherché sur les drives (défaut : nutella)
import fs from 'node:fs';
import os from 'node:os';

const OP = 'https://prices.openfoodfacts.org/api/v1';
const LAT = parseFloat(process.env.PRIX_LAT) || 48.8566, LON = parseFloat(process.env.PRIX_LON) || 2.3522, RAYON = parseFloat(process.env.PRIX_RAYON) || 30;
const ZONE_PERSO = !!(process.env.PRIX_LAT && process.env.PRIX_LON);
const EANS = (process.env.PRIX_EANS || '3017620422003,5449000000996,3274080005003,7622210449283').split(',').map(s => s.trim()).filter(Boolean);
const MOT = process.env.PRIX_MOT || 'nutella';
const ENSEIGNES = [
  {id:'carrefour',   nom:'Carrefour',   osm:'Carrefour',   accueil:'https://www.carrefour.fr/',          recherche:q => `https://www.carrefour.fr/s?q=${q}`},
  {id:'leclerc',     nom:'E.Leclerc',   osm:'Leclerc',     accueil:'https://www.e.leclerc/',              recherche:q => `https://www.e.leclerc/recherche?q=${q}`},
  {id:'auchan',      nom:'Auchan',      osm:'Auchan',      accueil:'https://www.auchan.fr/',              recherche:q => `https://www.auchan.fr/recherche?text=${q}`},
  {id:'intermarche', nom:'Intermarché', osm:'Intermarché', accueil:'https://www.intermarche.com/',        recherche:q => `https://www.intermarche.com/recherche/${q}`},
  {id:'superu',      nom:'Super U',     osm:['Super U', 'Hyper U', 'U Express'], accueil:'https://www.coursesu.com/',           recherche:q => `https://www.coursesu.com/recherche?q=${q}`},
  {id:'monoprix',    nom:'Monoprix',    osm:'Monoprix',    accueil:'https://courses.monoprix.fr/',        recherche:q => `https://courses.monoprix.fr/products/search?q=${q}`},
  {id:'lidl',        nom:'Lidl',        osm:'Lidl',        accueil:'https://www.lidl.fr/',                recherche:q => `https://www.lidl.fr/q/search?q=${q}`},
];
const NAV = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language':'fr-FR,fr;q=0.9,en;q=0.6'};
const PROTECTIONS = [['DataDome', /datadome|captcha-delivery\.com/i], ['Cloudflare', /cf-chl|challenge-platform|Just a moment\.\.\./i], ['Akamai', /Reference #\d|akamai|_abck/i],
  ['Imperva', /incapsula|_Incapsula_Resource/i], ['PerimeterX', /px-captcha|perimeterx|_pxhd/i], ['Captcha', /captcha/i], ['Accès refusé', /access denied|accès refusé|forbidden/i]];

const ici = process.env.GITHUB_ACTIONS ? 'GitHub Actions (serveur)' : `PC (${os.type()} ${os.release()}, Node ${process.versions.node})`;
const jours = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const attendre = ms => new Promise(r => setTimeout(r, ms));
async function lire(url, opts = {}, ms = 20000){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms), t0 = Date.now();
  try{
    const r = await fetch(url, {redirect:'follow', signal:ctl.signal, ...opts});
    const texte = await r.text();
    return {ok:r.ok, statut:r.status, url:r.url, texte, ms:Date.now() - t0, entetes:Object.fromEntries(r.headers)};
  }catch(e){ return {ok:false, statut:0, url, texte:'', ms:Date.now() - t0, erreur:e.name === 'AbortError' ? 'délai dépassé (20 s)' : (e.cause && e.cause.code) || e.message}; }
  finally{ clearTimeout(t); }
}
const opJson = async chemin => { const r = await lire(OP + chemin, {headers:{'User-Agent':'MonEcran-prix-test/1.0 (projet perso)', 'Accept':'application/json'}}); try{ return r.ok ? JSON.parse(r.texte) : {erreur:`HTTP ${r.statut}${r.erreur ? ' ' + r.erreur : ''}`}; }catch{ return {erreur:'réponse illisible'}; } };

/* ---------- 1. Open Prices ---------- */
async function openPrices(){
  const R = {zone:{lat:LAT, lon:LON, rayon:RAYON, perso:ZONE_PERSO}, enseignes:[], produits:[], erreur:null};
  const tout = await opJson(`/prices?currency=EUR&date__gte=${jours(90)}&size=1`);
  if (tout.erreur){ R.erreur = tout.erreur; return R; }
  R.total90j = tout.total;
  /* une enseigne peut avoir plusieurs noms de magasin (Super U, Hyper U, U Express) : les comptes sont additionnés */
  const compter = async (noms, filtre) => { let tot = 0, err = null, dernier = null;
    for (const nm of noms){ const j = await opJson(`/prices?currency=EUR&date__gte=${jours(90)}&location__osm_name__contains=${encodeURIComponent(nm)}${filtre}&size=1&order_by=-date`);
      if (j.erreur){ err = j.erreur; continue; } tot += j.total || 0; const it = (j.items || [])[0]; if (it && (!dernier || it.date > dernier.date)) dernier = it; await attendre(200); }
    return {tot, err, dernier}; };
  for (const e of ENSEIGNES){
    const noms = [].concat(e.osm);
    const nat = await compter(noms, ''), promo = await compter(noms, '&price_is_discounted=true'), zone = await compter(noms, `&lat=${LAT}&lon=${LON}&radius_km=${RAYON}`);
    const d = nat.dernier;
    R.enseignes.push({id:e.id, nom:e.nom, releves90j:nat.err && !nat.tot ? null : nat.tot, promos90j:promo.err && !promo.tot ? null : promo.tot, zone90j:zone.err && !zone.tot ? null : zone.tot,
      dernier:d ? {date:d.date, magasin:(d.location || {}).osm_name || '', ville:(d.location || {}).osm_address_city || ''} : null, erreur:nat.err || zone.err || null});
  }
  for (const ean of EANS){
    const p = await opJson(`/prices?product_code=${ean}&currency=EUR&date__gte=${jours(180)}&size=100&order_by=-date`);
    const items = p.items || [];
    const parEnseigne = {};
    for (const it of items){ const n = ((it.location || {}).osm_brand || (it.location || {}).osm_name || 'autre').trim(); (parEnseigne[n] ||= []).push(it.price); }
    R.produits.push({ean, nom:(items[0] && ((items[0].product || {}).product_name || items[0].product_name)) || '', releves180j:p.total ?? 0,
      enseignes:Object.entries(parEnseigne).map(([n, l]) => ({n, nb:l.length, min:Math.min(...l), max:Math.max(...l)})).sort((a, b) => b.nb - a.nb).slice(0, 6),
      dernier:items[0] ? items[0].date : null, erreur:p.erreur || null});
    await attendre(300);
  }
  return R;
}

/* ---------- 2. Sites drive ---------- */
function analyser(r, mot){
  const t = r.texte || '', protections = PROTECTIONS.filter(([, re]) => re.test(t.slice(0, 200000))).map(([n]) => n);
  const prixEuro = (t.match(/\d{1,3}[,.]\d{2}\s?(€|&euro;|\\u20ac)/g) || []).length;
  const jsonLd = (t.match(/"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/g) || []).length;
  const champsPrix = (t.match(/"(price|prix|unitPrice|salePrice|currentPrice)"\s*:\s*"?\d/gi) || []).length;
  const donneesJs = /__NEXT_DATA__|__NUXT__|window\.__INITIAL_STATE__|__APOLLO_STATE__/.test(t);
  const motTrouve = new RegExp(mot, 'i').test(t);
  let verdict;
  if (!r.statut) verdict = `❌ injoignable (${r.erreur})`;
  else if (r.statut === 403 || r.statut === 429 || r.statut === 503 || (protections.length && t.length < 30000)) verdict = `❌ bloqué (HTTP ${r.statut}${protections.length ? ', ' + protections.join(', ') : ''})`;
  else if (!r.ok) verdict = `⚠️ HTTP ${r.statut}`;
  else if (prixEuro + jsonLd + champsPrix > 0 && motTrouve) verdict = '✅ page lisible, prix présents dans la page';
  else if (motTrouve || donneesJs) verdict = '⚠️ page lisible, prix chargés ensuite par JavaScript (API à trouver)';
  else verdict = '⚠️ page lisible mais vide (application JavaScript ou magasin à choisir)';
  return {statut:r.statut, ms:r.ms, octets:t.length, urlFinale:r.url, protections, prixEuro, jsonLd, champsPrix, donneesJs, motTrouve, verdict,
    serveur:(r.entetes || {}).server || '', erreur:r.erreur || null};
}
async function drives(){
  const L = [];
  for (const e of ENSEIGNES){
    const a = await lire(e.accueil, {headers:NAV}); await attendre(800);
    const s = await lire(e.recherche(encodeURIComponent(MOT)), {headers:NAV}); await attendre(800);
    L.push({id:e.id, nom:e.nom, accueil:analyser(a, e.nom.split(/[ .]/).pop()), recherche:{url:e.recherche(encodeURIComponent(MOT)), ...analyser(s, MOT)}});
  }
  return L;
}

/* ---------- Rapport ---------- */
const n = v => v == null ? '—' : Number(v).toLocaleString('fr-FR');
const eur = v => Number(v).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
function rapport(R){
  const L = [`# Test de faisabilité — prix des enseignes`, ``, `Lancé depuis : **${R.depuis}** — ${new Date(R.date).toLocaleString('fr-FR', {timeZone:'Europe/Paris'})}`, ``];
  L.push(`## 1. Open Prices (Open Food Facts)`, ``);
  const O = R.openPrices;
  if (O.erreur) L.push(`❌ API injoignable : ${O.erreur}`, ``);
  else {
    L.push(`Relevés en euros sur 90 jours (toutes enseignes) : **${n(O.total90j)}**. Zone : ${O.zone.perso ? `ta zone (${O.zone.lat}, ${O.zone.lon})` : 'Paris (défaut)'}, rayon ${O.zone.rayon} km.`, ``,
      `| Enseigne | Relevés 90 j (France) | dont promos | Dans la zone | Dernier relevé |`, `|---|---:|---:|---:|---|`);
    for (const e of O.enseignes) L.push(`| ${e.nom} | ${n(e.releves90j)} | ${n(e.promos90j)} | ${n(e.zone90j)} | ${e.dernier ? `${e.dernier.date} · ${e.dernier.magasin}${e.dernier.ville ? ' (' + e.dernier.ville + ')' : ''}` : '—'}${e.erreur ? ' ⚠️ ' + e.erreur : ''} |`);
    L.push(``, `Produits témoins (180 jours) :`, ``, `| Code-barres | Produit | Relevés | Enseignes (nb · min–max) | Dernier |`, `|---|---|---:|---|---|`);
    for (const p of O.produits) L.push(`| ${p.ean} | ${p.nom || '?'} | ${n(p.releves180j)} | ${p.enseignes.map(x => `${x.n} (${x.nb} · ${eur(x.min)}–${eur(x.max)})`).join(', ') || '—'} | ${p.dernier || '—'}${p.erreur ? ' ⚠️ ' + p.erreur : ''} |`);
    L.push(``, `_Lecture : Open Prices est fiable et gratuit, mais ne contient que ce que des contributeurs ont photographié. Peu de relevés dans ta zone = alertes rares._`, ``);
  }
  L.push(`## 2. Sites drive (mot cherché : « ${R.mot} »)`, ``, `| Enseigne | Accueil | Recherche | Détails recherche |`, `|---|---|---|---|`);
  for (const d of R.drives){
    const s = d.recherche;
    L.push(`| ${d.nom} | ${d.accueil.verdict} | ${s.verdict} | HTTP ${s.statut || '—'}, ${n(Math.round(s.octets / 1024))} Ko, ${n(s.ms)} ms${s.protections.length ? ', ' + s.protections.join('/') : ''}; prix €: ${s.prixEuro}, JSON-LD: ${s.jsonLd}, champs prix: ${s.champsPrix}${s.donneesJs ? ', données JS' : ''}${s.serveur ? ', serveur ' + s.serveur : ''} |`);
  }
  L.push(``, `_Lecture : ✅ = les prix peuvent être lus directement ; ⚠️ JavaScript = il faudra repérer l'API interne du site (plus fragile) ; ❌ bloqué = protection anti-robots, à oublier depuis ce point d'accès._`,
    `_Compare ce rapport avec celui lancé depuis l'autre endroit (GitHub / PC) : un site bloqué seulement depuis GitHub ne pourra pas être relevé par une tâche automatique._`);
  return L.join('\n') + '\n';
}

const R = {depuis:ici, date:new Date().toISOString(), mot:MOT, openPrices:null, drives:null};
console.log(`Test des prix — depuis ${ici}\n1/2 Open Prices…`);
R.openPrices = await openPrices();
console.log('2/2 Sites drive…');
R.drives = await drives();
const md = rapport(R);
fs.writeFileSync('prix-test-rapport.md', md);
fs.writeFileSync('prix-test-rapport.json', JSON.stringify(R, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log('\n' + md + '\nÉcrit : prix-test-rapport.md et prix-test-rapport.json');
