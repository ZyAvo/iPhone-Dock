// mon-ecran-version: 0bd1f840
// Réglages écrits par la tâche « Configuration » (config/*.json, depuis configuration.xlsx), pour les scripts des tâches.
// CFG('sport.leagues', défaut) : la valeur du classeur si elle existe, sinon la valeur par défaut (celle écrite dans la page).
// listePage(texte, 'LEAGUES') : lit une liste écrite dans une page, « const NOM = [ … ]; » ou « const NOM = CFG('…', [ … ]); ».
import fs from 'node:fs';
import vm from 'node:vm';

const DIR = process.env.CONFIG_DIR || 'config';
const memo = {};
const revive = x => Array.isArray(x) ? x.map(revive)
  : x && typeof x === 'object' ? (Object.keys(x).length === 2 && 're' in x && 'flags' in x ? new RegExp(x.re, x.flags) : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, revive(v)])))
  : x;
export function CFG(chemin, defaut){
  const [mod, ...rest] = chemin.split('.');
  if (!(mod in memo)){ try{ memo[mod] = JSON.parse(fs.readFileSync(`${DIR}/${mod}.json`, 'utf8')); }catch{ memo[mod] = null; } }
  let v = memo[mod];
  for (const k of rest) v = v == null ? v : v[k];
  return v == null ? defaut : revive(v);
}
export function listePage(page, name, open = '['){
  const a = page.indexOf(`const ${name} = `); if (a < 0) return null;
  const s = page.indexOf(open, a), b = page.indexOf(open === '[' ? '\n]' : '\n}', s);
  if (s < 0 || b < 0) return null;
  return vm.runInNewContext('(' + page.slice(s, b + 2) + ')');
}
