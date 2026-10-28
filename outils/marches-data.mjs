// Prépare les cours de la page Investissements (lancé par la tâche GitHub « Marchés »).
// Lit dans invest.html la liste des indices (INDICES) et des placements suivis (SUIVI : codes ou ISIN seulement,
// jamais de quantités ni de montants), télécharge les cours sur 1 an et quelques taux officiels, puis écrit :
//   donnees/marches/marches.json → {updated, cours:{clé:{…}}, taux:{…}, isin:{ISIN:symbole}, diag}
// Si une source ne répond pas, on garde la valeur du passage précédent.
import fs from 'node:fs';
import vm from 'node:vm';

const PAGE = process.env.INVEST_PAGE || 'invest.html';
const OUT = process.env.MARCHES_OUT || 'donnees/marches';
const NOW = Date.now(), DAY = 86400e3;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

/* ---------- Réglages lus dans invest.html ---------- */
const page = fs.readFileSync(PAGE, 'utf8');
function list(name){
  const a = page.indexOf(`const ${name} = [`), b = page.indexOf('\n];', a);
  if (a < 0 || b < 0) return [];
  return vm.runInNewContext(page.slice(a + `const ${name} = `.length, b + 2));
}
const INDICES = list('INDICES'), SUIVI = list('SUIVI');
const prev = (() => { try{ return JSON.parse(fs.readFileSync(`${OUT}/marches.json`, 'utf8')); }catch{ return null; } })();
const diag = {ok:0, ko:[]};

async function get(url, type = 'json', tries = 2){
  let last;
  for (let i = 0; i < tries; i++){
    try{
      const r = await fetch(url, {headers:{'user-agent':UA, accept:type === 'json' ? 'application/json' : 'text/csv,*/*'}, signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return type === 'json' ? await r.json() : await r.text();
    }catch(e){ last = e; await new Promise(res => setTimeout(res, 1200 * (i + 1))); }
  }
  throw last;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const round = x => x == null || !isFinite(x) ? null : Number(x.toPrecision(7));

/* ---------- ISIN → symbole Yahoo (mémorisé d'un passage à l'autre) ---------- */
const ISIN = {...((prev && prev.isin) || {})};
async function symbolOf(isin){
  if (ISIN[isin]) return ISIN[isin];
  for (const host of ['query2', 'query1']){
    try{
      const j = await get(`https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=6&newsCount=0`, 'json', 1);
      const q = (j.quotes || []).filter(x => x.symbol);
      // de préférence une place européenne (cotation en euros)
      const pick = q.find(x => /\.(PA|AS|DE|F|MI|BR|MC|LS|VI)$/.test(x.symbol)) || q[0];
      if (pick){ ISIN[isin] = pick.symbol; return pick.symbol; }
    }catch{}
  }
  return null;
}

/* ---------- Cours sur 1 an (Yahoo Finance, graphique journalier) ---------- */
async function quote(sym){
  let j, err;
  for (const host of ['query1', 'query2']){
    try{ j = await get(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d&includePrePost=false`, 'json', 1); break; }
    catch(e){ err = e; }
  }
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw err || new Error((j && j.chart && j.chart.error && j.chart.error.description) || 'pas de données');
  const m = res.meta || {}, off = (m.gmtoffset || 0) * 1000;
  const ts = res.timestamp || [], cl = (((res.indicators || {}).quote || [])[0] || {}).close || [];
  const dayNo = ms => Math.floor((ms + off) / DAY);                       // jour local de la place de cotation
  const t = [], c = [];
  ts.forEach((s, i) => { if (cl[i] != null && isFinite(cl[i])){ const d = dayNo(s * 1000); if (t.length && t[t.length - 1] === d){ c[c.length - 1] = cl[i]; } else { t.push(d); c.push(cl[i]); } } });
  const px = m.regularMarketPrice ?? c[c.length - 1];
  if (px == null) throw new Error('pas de cours');
  const at = (m.regularMarketTime || ts[ts.length - 1] || NOW / 1000) * 1000, today = dayNo(at);
  if (t.length && t[t.length - 1] === today) c[c.length - 1] = px; else { t.push(today); c.push(px); }
  let k = t.length - 2; const prevClose = k >= 0 ? c[k] : (m.chartPreviousClose ?? null);
  const jan1 = Math.floor(Date.UTC(new Date(today * DAY).getUTCFullYear(), 0, 1) / DAY);
  let y0 = null; for (let i = t.length - 1; i >= 0; i--) if (t[i] < jan1){ y0 = c[i]; break; }
  const yr = c.filter((_, i) => t[i] > today - 366);
  return {s:sym, n:m.longName || m.shortName || sym, cur:m.currency || '', px:round(px), prev:round(prevClose), at,
    y0:round(y0), hi:round(Math.max(...yr)), lo:round(Math.min(...yr)), t0:t[0], t:t.map(d => d - t[0]), c:c.map(round)};
}

const cours = {};
const keep = k => { if (prev && prev.cours && prev.cours[k]){ cours[k] = {...prev.cours[k], ancien:true}; } };
for (const it of [...INDICES, ...SUIVI]){
  const key = it.id || it.isin || it.code;
  if (!key || cours[key]) continue;
  try{
    const sym = it.code || (it.isin ? await symbolOf(it.isin) : null);
    if (!sym) throw new Error('ISIN introuvable chez Yahoo : ajoute le code (ex. « EUNL.DE ») dans SUIVI');
    cours[key] = {...await quote(sym), ...(it.isin ? {isin:it.isin} : {})};
    diag.ok++;
  }catch(e){ diag.ko.push(`${key} : ${e.message}`); keep(key); }
  await sleep(350);
}
// Euro / dollar : toujours chargé (conversion des placements cotés en dollars)
if (!Object.values(cours).some(c => c.s === 'EURUSD=X')){ try{ cours['EURUSD=X'] = await quote('EURUSD=X'); diag.ok++; }catch(e){ diag.ko.push('EURUSD=X : ' + e.message); keep('EURUSD=X'); } }

/* ---------- Taux officiels (Banque centrale européenne, sans clé) ---------- */
const ECB = {
  oat:      {serie:'IRS/M.FR.L.L40.CI.0000.EUR.N.Z', nom:'OAT 10 ans (France)', freq:'mois'},
  bund:     {serie:'IRS/M.DE.L.L40.CI.0000.EUR.N.Z', nom:'Bund 10 ans (Allemagne)', freq:'mois'},
  depot:    {serie:'FM/D.U2.EUR.4F.KR.DFR.LEV', nom:'Taux de dépôt BCE', freq:'jour'},
  inflation:{serie:'ICP/M.FR.N.000000.4.ANR', nom:'Inflation France (sur 1 an)', freq:'mois'}
};
function csv(text){
  const rows = text.trim().split(/\r?\n/).map(l => { const out = []; let cur = '', q = false;
    for (const ch of l){ if (ch === '"') q = !q; else if (ch === ',' && !q){ out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; });
  const h = rows.shift(), iT = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE');
  return rows.map(r => ({per:r[iT], v:parseFloat(r[iV])})).filter(r => r.per && isFinite(r.v)).sort((a, b) => a.per < b.per ? -1 : 1);
}
const taux = {};
for (const [k, s] of Object.entries(ECB)){
  try{
    const obs = csv(await get(`https://data-api.ecb.europa.eu/service/data/${s.serie}?lastNObservations=14&format=csvdata`, 'csv'));
    if (!obs.length) throw new Error('aucune valeur');
    const last = obs[obs.length - 1];
    // valeur un an plus tôt (mensuel) ou au 1er janvier (quotidien) pour la tendance
    const before = s.freq === 'mois' ? obs[Math.max(0, obs.length - 13)] : obs[0];
    taux[k] = {nom:s.nom, v:round(last.v), per:last.per, freq:s.freq, avant:before && before !== last ? {v:round(before.v), per:before.per} : null};
    diag.ok++;
  }catch(e){ diag.ko.push(`${k} : ${e.message}`); if (prev && prev.taux && prev.taux[k]) taux[k] = {...prev.taux[k], ancien:true}; }
}

fs.mkdirSync(OUT, {recursive:true});
fs.writeFileSync(`${OUT}/marches.json`, JSON.stringify({v:1, updated:new Date(NOW).toISOString(), cours, taux, isin:ISIN, diag}));
console.log(`${diag.ok} séries à jour, ${diag.ko.length} en échec.`);
diag.ko.forEach(l => console.log('  ✗ ' + l));
