// mon-ecran-version: f1ecc810
// Rapport des cotes du matin par mail (v48) — lancé par la tâche GitHub « Cotes (mail) », chaque matin après le relevé de 8 h.
// Tableau : en lignes les matchs du jour (1 / N / 2), en colonnes les sites de paris, la meilleure cote en gras,
// les cotes qui s'écartent des autres d'au moins le seuil du classeur (onglet Cotes, « rapport ») surlignées avec l'écart.
// Envoi par Gmail avec un mot de passe d'application. Secrets GitHub (Settings → Secrets and variables → Actions) :
//   MAIL_UTILISATEUR   adresse Gmail qui envoie (la boîte dédiée)
//   MAIL_MDP_APPLI     mot de passe d'application de cette boîte (compte Google › Sécurité › Mots de passe des applications)
//   MAIL_DESTINATAIRE  facultatif : à qui l'envoyer (plusieurs adresses séparées par des virgules) ; sinon à MAIL_UTILISATEUR
// Sans ces secrets, rien n'est envoyé (le script le dit et s'arrête sans erreur). Aucune adresse n'est écrite dans le journal.
// Essai sans envoi : COTES_MAIL_APERCU=apercu.html node outils/cotes-mail.mjs  (écrit le mail dans ce fichier)
import fs from 'node:fs';
import {CFG} from './config-lire.mjs';
import vm from 'node:vm';
// v54 : calcul des écarts commun avec la page Écarts et l'accueil (match.js, exécuté tel quel ; window = l'objet global)
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(new URL('../match.js', import.meta.url), 'utf8'), {filename:'match.js'});
const {Match} = globalThis;

const FICHIER = process.env.COTES_FICHIER || 'donnees/cotes/cotes.json';
const APERCU = process.env.COTES_MAIL_APERCU || '';
const NOMS = {winamax_fr:'Winamax', betclic_fr:'Betclic', unibet_fr:'Unibet', pmu_fr:'PMU', netbet_fr:'NetBet', parionssport_fr:'Parions Sport'};
const LIGUES = {'fra.1':'Ligue 1', 'eng.1':'Premier League', 'esp.1':'Liga', 'ita.1':'Serie A', 'ger.1':'Bundesliga', 'uefa.champions':'Ligue des champions', 'uefa.europa':'Ligue Europa', 'uefa.europa.conf':'Ligue Conférence'};
const PHASES = {matin:'matin', avant:'avant match', 'mi-temps':'mi-temps', manuel:'à la main'};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const fr = (n, d = 2) => Number(n).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
const heure = t => new Date(t).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris'});
const jourParis = t => new Date(t).toLocaleDateString('fr-CA', {timeZone:'Europe/Paris'});   // AAAA-MM-JJ

let j;
try{ j = JSON.parse(fs.readFileSync(FICHIER, 'utf8')); }catch{ console.log('Pas de relevé de cotes disponible : rien à envoyer.'); process.exit(0); }

const R = CFG('cotes.rapport', {seuil:0.05, reference:'moyenne'}) || {}, SEUIL = +R.seuil || 0.05, MED = R.reference === 'mediane';
const SITES = CFG('cotes.sites', ['winamax_fr', 'betclic_fr', 'unibet_fr', 'pmu_fr', 'netbet_fr']);
const moy = l => l.reduce((a, b) => a + b, 0) / l.length;

/* matchs du jour (heure de Paris) pas encore commencés depuis plus de 2 h, avec leur dernier relevé */
const maintenant = process.env.COTES_JOUR ? Date.parse(process.env.COTES_JOUR + 'T07:40:00Z') : Date.now(), aujourd = jourParis(maintenant);   // COTES_JOUR : essai sur un autre jour
const matchs = Object.entries(j.matchs || {}).map(([id, m]) => {
  const rel = (m.releves || []).filter(r => r.sites).sort((a, b) => a.at - b.at), r = rel[rel.length - 1] || m.dernier;
  return {id, ...m, r};
}).filter(m => m.t && m.eq && m.r && m.r.sites && jourParis(m.t) === aujourd && m.t > maintenant - 2 * 3600e3).sort((a, b) => a.t - b.t || String(a.lg).localeCompare(String(b.lg)));

if (!matchs.length){ console.log(`Aucun match relevé pour aujourd'hui (${aujourd}) : pas de mail.`); process.exit(0); }

const sites = SITES.filter(s => matchs.some(m => m.r.sites[s]));
const ecarts = [];
const lignes = matchs.map(m => {
  const issues = [['h', '1', m.eq[0]], ['d', 'N', 'Nul'], ['a', '2', m.eq[1]]].map(([k, code, nom]) => {
    const vals = sites.map(s => [s, +((m.r.sites[s] || {})[k])]).filter(([, v]) => v > 1);
    const best = vals.length ? Math.max(...vals.map(([, v]) => v)) : 0;
    const cell = {}, E = new Map(Match.ecarts(vals, MED).map(x => [x.s, x.e]));
    for (const [s, v] of vals){
      const e = E.get(s) || 0;
      cell[s] = {v, best:v === best && vals.length > 1, e};
      if (e >= SEUIL) ecarts.push({m, nom, s, v, e});
    }
    return {code, nom, cell, ref:vals.length ? moy(vals.map(([, v]) => v)) : 0};
  });
  return {m, issues};
});
ecarts.sort((a, b) => b.e - a.e);

/* ---------- mail ---------- */
const S = {th:'padding:6px 8px;font:600 12px Arial,sans-serif;color:#5b6470;text-align:center;border-bottom:2px solid #d8dde3;white-space:nowrap',
  td:'padding:5px 8px;font:13px Arial,sans-serif;color:#1c2128;text-align:center;border-bottom:1px solid #eceff2;white-space:nowrap',
  m:'padding:8px 8px 4px;font:600 13px Arial,sans-serif;color:#1c2128;text-align:left;border-top:1px solid #d8dde3'};
const titreDate = new Date(maintenant).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris'});
const top = ecarts.slice(0, 8).map(x => `<li style="margin:3px 0"><b>${esc(x.nom)} · ${fr(x.v)}</b> chez ${esc(NOMS[x.s] || x.s)} <span style="color:#1f8a4c;font-weight:600">+${Math.round(x.e * 100)} %</span>
  <span style="color:#5b6470">— ${esc(x.m.eq.join(' – '))}, ${heure(x.m.t)}</span></li>`).join('');
const tableau = `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;min-width:100%">
  <tr><th style="${S.th};text-align:left">Match</th><th style="${S.th}"></th>${sites.map(s => `<th style="${S.th}">${esc(NOMS[s] || s)}</th>`).join('')}<th style="${S.th}">Moy.</th></tr>
  ${lignes.map(({m, issues}) => `<tr><td colspan="${sites.length + 3}" style="${S.m}">${heure(m.t)} · ${esc(m.eq.join(' – '))} <span style="font-weight:400;color:#5b6470">· ${esc(LIGUES[m.lg] || m.lg)} · relevé ${esc(PHASES[m.r.phase] || m.r.phase || '')} ${m.r.at ? (jourParis(m.r.at) === aujourd ? '' : new Date(m.r.at).toLocaleDateString('fr-FR', {weekday:'short', timeZone:'Europe/Paris'}) + ' ') + heure(m.r.at) : ''}</span></td></tr>`
    + issues.map(i => `<tr><td style="${S.td};text-align:left;color:#5b6470;padding-left:16px">${esc(i.nom)}</td><td style="${S.td};color:#5b6470">${i.code}</td>${sites.map(s => { const c = i.cell[s];
      if (!c) return `<td style="${S.td};color:#b0b6bd">–</td>`;
      const hi = c.e >= SEUIL;
      return `<td style="${S.td}${hi ? ';background:#e3f5ea' : ''}${c.best ? ';font-weight:700' : ''}">${fr(c.v)}${hi ? `<br><span style="font-size:11px;color:#1f8a4c">+${Math.round(c.e * 100)} %</span>` : ''}</td>`; }).join('')}<td style="${S.td};color:#5b6470">${i.ref ? fr(i.ref) : '–'}</td></tr>`).join('')).join('')}
</table>`;
const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:16px;background:#f3f5f7">
<div style="max-width:760px;margin:0 auto;background:#fff;border-radius:12px;padding:18px 18px 10px">
<h1 style="margin:0 0 4px;font:700 18px Arial,sans-serif;color:#1c2128">Cotes du ${esc(titreDate)}</h1>
<p style="margin:0 0 14px;font:13px Arial,sans-serif;color:#5b6470">${matchs.length} match${matchs.length > 1 ? 's' : ''} · ${sites.length} sites · écart signalé dès +${Math.round(SEUIL * 100)} % par rapport à la ${MED ? 'médiane' : 'moyenne'} des autres sites</p>
${top ? `<h2 style="margin:0 0 6px;font:700 14px Arial,sans-serif;color:#1c2128">Cotes qui sortent du lot</h2><ul style="margin:0 0 16px;padding-left:18px;font:13px Arial,sans-serif;color:#1c2128">${top}</ul>`
  : `<p style="margin:0 0 16px;font:13px Arial,sans-serif;color:#5b6470">Aucun site ne s'écarte d'au moins ${Math.round(SEUIL * 100)} % des autres ce matin.</p>`}
<div style="overflow-x:auto">${tableau}</div>
<p style="margin:14px 0 4px;font:11px Arial,sans-serif;color:#8a929b">En gras : la meilleure cote du match pour cette issue. Envoyé par Mon Écran (tâche « Cotes (mail) »). Les cotes évoluent : vérifie sur le site avant de parier.</p>
</div></body></html>`;
const sujet = `Cotes du jour · ${matchs.length} match${matchs.length > 1 ? 's' : ''}${ecarts.length ? ` · ${ecarts.length} écart${ecarts.length > 1 ? 's' : ''}` : ''}`;
const texte = `${sujet}\n\n` + (ecarts.slice(0, 8).map(x => `${x.nom} ${fr(x.v)} chez ${NOMS[x.s] || x.s} (+${Math.round(x.e * 100)} %) — ${x.m.eq.join(' – ')}, ${heure(x.m.t)}`).join('\n') || 'Aucun écart notable.') + '\n\nLe tableau complet est dans la version HTML du mail.';

if (APERCU){ fs.writeFileSync(APERCU, html); console.log(`Aperçu écrit (${matchs.length} matchs, ${ecarts.length} écarts) : ${APERCU}`); process.exit(0); }

const USER = (process.env.MAIL_UTILISATEUR || '').trim(), MDP = (process.env.MAIL_MDP_APPLI || '').replace(/\s+/g, ''), DEST = (process.env.MAIL_DESTINATAIRE || '').trim() || USER;
if (!USER || !MDP){ console.log('Mail pas encore configuré (secrets MAIL_UTILISATEUR et MAIL_MDP_APPLI absents) : rien envoyé.'); process.exit(0); }
let nodemailer;
try{ nodemailer = (await import('nodemailer')).default; }catch{ console.log('Module nodemailer absent (installé par la tâche) : rien envoyé.'); process.exit(1); }
try{
  const tr = nodemailer.createTransport({host:'smtp.gmail.com', port:465, secure:true, auth:{user:USER, pass:MDP}});
  await tr.sendMail({from:`Mon Écran <${USER}>`, to:DEST, subject:sujet, text:texte, html});
  console.log(`Mail envoyé (${matchs.length} matchs, ${ecarts.length} écarts, ${DEST.split(',').length} destinataire(s)).`);
}catch(e){
  console.log(`Envoi refusé : ${String(e && (e.responseCode || e.code) || 'erreur')} — vérifie le mot de passe d'application de la boîte Gmail.`);
  process.exit(1);
}
