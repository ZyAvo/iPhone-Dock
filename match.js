// mon-ecran-version: 766d1e05
/* Mon Écran — lecture des fiches de match ESPN (v48), commune à Sport et à l'accueil (détail d'un match).
   Sortis de sport.html sans changement : classify, summaryEvents (rugby et autres), soccerEvents (foot), shootoutTable, markShootout
   (fonctions globales, sport.html les appelle comme avant). Ajouts : Match.lire(j, sport) pour l'accueil, Match.minute(...) (rugby).
   Dépend de rien d'autre. */
(function(){
if (window.Match) return;
const LETTRES = {'ß':'ss', 'æ':'ae', 'œ':'oe', 'ø':'o', 'ł':'l', 'đ':'d', 'ð':'d', 'þ':'th', 'ı':'i', 'ħ':'h'};
const plain = s => String(s || '').toLowerCase().replace(/[ßæœøłđðþıħ]/g, c => LETTRES[c]).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const teamKey = s => plain(s).replace(/[^a-z0-9]+/g, ' ').trim();
const minVal = s => { const a = String(s || '').match(/(\d+)(?:\D{0,3}\+\s*(\d+))?/); return a ? +a[1] + (a[2] ? +a[2] / 100 : 0) : 999; };
/* Type d'événement de match (foot et rugby) */
function classify(txt, scoring, d = {}){
  const t = String(txt || '').toLowerCase();
  if (d.redCard || /red card|carton rouge/.test(t)) return 'red';
  if (d.yellowCard || /yellow card|carton jaune|sin.?bin/.test(t)) return 'yellow';
  if (/(penalty|pénalty|shoot.?out|tir au but).{0,24}(miss|sav|manqu|arrêt|raté|stopp)|(missed|saved) penalty/.test(t)) return 'penmiss';
  if (/penalty try|essai de p/.test(t)) return 'try';
  if (/\btry\b|essai/.test(t)) return 'try';
  if (/conver|transfo/.test(t)) return 'conv';
  if (/drop/.test(t)) return 'drop';
  if (/penalty goal|penalty kick|pénalité|penalite/.test(t)) return 'pen';
  if (/goal|\bbut\b/.test(t) || scoring) return 'goal';
  return '';
}
function summaryEvents(j){
  const hc = (((j.header || {}).competitions) || [])[0] || {};
  const struct = [j.keyEvents, j.scoringPlays, hc.details].filter(p => Array.isArray(p) && p.length).flat();
  const autres = [(j.commentary || []).map(c => c.play || c).filter(Boolean), j.plays].filter(p => Array.isArray(p) && p.length).flat();
  const diag = Object.keys(j).map(k => Array.isArray(j[k]) ? `${k} (${j[k].length})` : k).concat(hc.details ? [`header.details (${hc.details.length})`] : []).join(', ');
  // camp : numéro d'équipe de la fiche (ESPN n'utilise pas toujours ceux de la liste des matchs), sinon nom d'équipe, sinon effectif
  const sideOf = {}, names = {home:[], away:[]}, ath = {};
  (hc.competitors || []).forEach(x => { const sd = x.homeAway, t = x.team || {}; [x.id, t.id].filter(Boolean).forEach(id => { sideOf[String(id)] = sd; });
    if (names[sd]) names[sd].push(t.displayName, t.shortDisplayName, t.name, t.location, t.abbreviation); });
  const byName = n => { const k = teamKey(n); if (!k) return '';
    const hit = ['home', 'away'].filter(sd => names[sd].some(x => { const y = teamKey(x); return y && (y === k || (y.length > 3 && k.length > 3 && (y.includes(k) || k.includes(y)))); }));
    return hit.length === 1 ? hit[0] : ''; };
  (j.rosters || []).forEach(r => { const sd = r.homeAway || sideOf[String((r.team || {}).id)]; if (!sd) return;
    (r.roster || []).forEach(p => { const a = p.athlete || {}; if (a.id) ath['#' + a.id] = sd; if (a.displayName) ath[teamKey(a.displayName)] = sd; }); });
  const lire = pool => { const evs = [];
    pool.forEach(p => {
      const txt = `${(p.type && (p.type.text || p.type.name)) || ''} ${p.text || ''}`;
      const kind = classify(txt, p.scoringPlay, p); if (!kind) return;
      const a = ((p.participants || [])[0] || {}).athlete || (p.athletesInvolved || [])[0] || {};
      const who = a.displayName || a.shortName || '';
      const d = {kind, min:(p.clock && p.clock.displayValue) || '', team:p.team && p.team.id != null ? String(p.team.id) : undefined, who,
        pen:kind === 'goal' && (/penalty|pénalty/i.test(txt) || !!p.penaltyKick), og:/own goal|contre son camp/i.test(txt) || !!p.ownGoal,
        so:!!p.shootout || /shoot.?out|tirs? au but/i.test(txt)};
      const sd = (d.team && sideOf[d.team]) || byName((p.team || {}).displayName) || ath['#' + a.id] || ath[teamKey(who)] || '';
      if (sd) d.side = sd;
      // même action lue deux fois (nom écrit autrement, numéro d'équipe absent) : on la garde une fois
      const nom = teamKey(who).split(' ').pop() || '', mn = Math.floor(minVal(d.min));
      if (evs.some(x => x.kind === d.kind && Math.floor(minVal(x.min)) === mn && (x.side || '') === (d.side || '')
        && (() => { const n2 = teamKey(x.who).split(' ').pop() || ''; return !nom || !n2 || nom === n2 || nom.slice(0, 4) === n2.slice(0, 4); })())) return;
      evs.push(d);
    });
    return evs.some(d => d.side) ? evs.filter(d => d.side) : evs;      // camp inconnu : écarté dès que les autres actions ont un camp
  };
  // les actions structurées d'abord ; les commentaires seulement si elles manquent
  let evs = lire(struct); if (!evs.length) evs = lire(autres);
  return {evs, diag};
}
/* Foot : seulement les actions structurées d'ESPN (buts, penaltys manqués, cartons rouges) ;
   dans les commentaires, on ne lit que les lignes « Goal! », « Own Goal by », « Penalty missed/saved! » et les rouges.
   Le camp vient du numéro d'équipe, sinon du nom d'équipe ou de l'effectif ; sans camp sûr, l'action est écartée. */
function soccerEvents(j, m){
  const hc = (((j.header || {}).competitions) || [])[0] || {};
  const byId = {[String(m.home.id)]:'home', [String(m.away.id)]:'away'}, names = {home:[m.home.full, m.home.name, m.home.abbr], away:[m.away.full, m.away.name, m.away.abbr]};
  (hc.competitors || []).forEach(x => { const t = x.team || {}, sd = x.homeAway; if (sd !== 'home' && sd !== 'away') return;
    [x.id, t.id].filter(Boolean).forEach(id => { byId[String(id)] = sd; });
    names[sd].push(t.displayName, t.shortDisplayName, t.name, t.location, t.abbreviation); });
  const byName = n => { const k = teamKey(n); if (!k) return '';
    const hit = ['home', 'away'].filter(sd => names[sd].some(x => { const y = teamKey(x); return y && (y === k || (y.length > 3 && k.length > 3 && (y.includes(k) || k.includes(y)))); }));
    return hit.length === 1 ? hit[0] : ''; };
  const ath = {};
  (j.rosters || []).forEach(r => { const sd = r.homeAway || byId[String((r.team || {}).id)] || byName((r.team || {}).displayName); if (!sd) return;
    (r.roster || []).forEach(p => { const a = p.athlete || {}; if (a.id) ath['#' + a.id] = sd; if (a.displayName) ath[teamKey(a.displayName)] = sd; }); });
  const athSide = a => (a && (ath['#' + a.id] || ath[teamKey(a.displayName)])) || '';
  const MISS = /(penalty|pénalty|shoot.?out|tir au but).{0,24}(miss|sav|manqu|arrêt|raté|stopp)|(missed|saved) penalty/i;
  const hasSO = m.home.so != null && m.home.so !== '' && m.away.so != null && m.away.so !== '';

  // 1) actions structurées (keyEvents…)
  const S = [];
  [j.keyEvents, j.scoringPlays, hc.details].filter(Array.isArray).flat().forEach(p => {
    if (!p) return;
    const tt = `${(p.type && [p.type.text, p.type.type, p.type.name].filter(Boolean).join(' ')) || ''}`.toLowerCase();
    let kind = '';
    if (p.redCard || /red.?card|second yellow/.test(tt)) kind = 'red';
    else if (/penalty.{0,4}(miss|save)|shoot.?out.{0,12}(miss|save)/.test(tt) || (p.shootout && p.scoringPlay === false)) kind = 'penmiss';
    else if (p.scoringPlay || (/goal|penalty.{0,4}scored/.test(tt) && !/goal.?kick/.test(tt))) kind = 'goal';
    if (!kind) return;
    const a = ((p.participants || [])[0] || {}).athlete || (p.athletesInvolved || [])[0] || {};
    const t = p.team || {};
    S.push({kind, min:(p.clock && p.clock.displayValue) || '', who:a.displayName || a.shortName || '',
      side:byId[String(t.id)] || byName(t.displayName || t.name) || athSide(a),
      og:/own goal/.test(tt) || !!p.ownGoal, pen:kind === 'goal' && (/penalty/.test(tt) || !!p.penaltyKick), so:!!p.shootout});
  });

  // 2) commentaires et actions de jeu (dans l'ordre du match) : seule source fiable des tirs au but
  const com = (j.commentary || []).length ? j.commentary.map((c, i) => ({c, pl:c.play || {}, i})) : (j.plays || []).map((pl, i) => ({c:{}, pl, i}));
  const lines = com
    .map(x => ({...x, seq:+(x.c.sequence ?? x.pl.sequence ?? x.pl.sequenceNumber) || null}))
    .sort((a, b) => (a.seq != null && b.seq != null ? a.seq - b.seq : 0) || a.i - b.i);
  const C = [];
  lines.forEach((x, n) => {
    const {c, pl} = x;
    const txts = [c.text, pl.text, pl.shortText, c.shortText].filter(Boolean).map(String);
    const tt = [(pl.type || {}).text, (c.type || {}).text].filter(Boolean).join(' ');
    const all = `${tt} ${txts.join(' ')}`;
    const min = (c.time && c.time.displayValue) || (pl.clock && pl.clock.displayValue) || '';
    let kind = '', who = '', side = '', og = false, so = false, o;
    const pick = () => {                                   // « Prénom Nom (Équipe) »
      for (const t of txts) for (const y of t.matchAll(/([A-ZÀ-Ý][^.()!,;]*?)\s*\(([^)]+)\)/g)){ const sd = byName(y[2]); if (sd){ who = y[1].replace(/^.*\b(?:by|to)\s+/i, '').trim(); side = sd; return; } } };
    let cand = false;
    const goalTxt = txts.find(t => /(^|[^a-z])goal!/i.test(t) && !/no goal|disallowed|annulé/i.test(t));
    if (goalTxt){ kind = 'goal'; pick(); so = /\d\s*\(\d+\)/.test(goalTxt.replace(/\([^)]*[a-z]{3}[^)]*\)/gi, '')); }
    else if (/converts the penalty|penalty (scored|converted)|scores? (the|his|her) penalty/i.test(all)){ kind = 'goal'; cand = true; pick(); }
    else if ((o = all.match(/own goal by ([^,]+),\s*([^.]+)\./i))){ kind = 'goal'; og = true; who = o[1].trim(); const sd = byName(o[2]); side = sd === 'home' ? 'away' : sd === 'away' ? 'home' : ''; }
    else if (MISS.test(all) && !/penalty (conceded|area|box)\b(?![^.]*\b(miss|sav))/i.test(all)){ kind = 'penmiss'; pick(); }
    else if (/second yellow card to|is shown the red card/i.test(all) || /red.?card/i.test(tt)){ kind = 'red'; pick(); }
    if (!kind) return;
    const a = ((pl.participants || [])[0] || {}).athlete || (pl.athletesInvolved || [])[0] || null;
    if (!who && a) who = a.displayName || a.shortName || '';
    if (!who){ const t = txts.find(t => /!/.test(t)) || txts[0] || '';        // « Penalty saved! Prénom Nom fails… » sans équipe entre parenthèses
      const y = t.match(/!\s*(?:bad penalty by\s+)?((?:[A-ZÀ-Ý][\w'’.-]*(?:\s+(?:de|da|di|do|dos|del|van|von|der|den|le|la|el|al|ter|mac))*\s*){1,4})/i);
      if (y) who = y[1].replace(/\b(?:fails|right|left|header|is|shot|converts|misses|hits)\b.*$/i, '').trim(); }
    if (!side) side = byId[String((pl.team || {}).id)] || byName((pl.team || {}).displayName) || athSide(a) || ath[teamKey(who)] || '';
    C.push({kind, min, who, side, og, so, cand, pen:kind === 'goal' && /penalty/i.test(all), n});
  });

  // 3) tirs au but lus dans les commentaires : buts « 1(4) » + penaltys manqués qui les entourent
  let SO = [], fromTable = false;
  const table = hasSO ? shootoutTable(j, byId, byName) : null;          // tableau des tirs au but fourni par ESPN, s'il existe
  if (table){ SO = table; fromTable = true; }
  else if (hasSO){
    const first = C.findIndex(d => d.so);
    if (first >= 0){
      let k = first; while (k > 0 && C[k - 1].kind === 'penmiss' && minVal(C[k - 1].min) >= 90) k--;   // tirs manqués avant le premier tir réussi
      SO = C.slice(k).filter(d => d.so || d.kind === 'penmiss').map(d => ({...d, so:true}));
    } else {                                                             // pas de score « 1(4) » : fin de liste faite de penaltys
      let k = C.length; while (k > 0 && (C[k - 1].kind === 'penmiss' || (C[k - 1].kind === 'goal' && C[k - 1].cand)) && minVal(C[k - 1].min) >= 90) k--;
      if (k < C.length && C.slice(k).some(d => d.kind === 'goal')) SO = C.slice(k).map(d => ({...d, so:true}));
    }
  }
  // camp manquant pendant la séance : les tirs alternent
  SO.forEach((d, i) => { if (d.side) return; const p = SO[i - 1], q = SO[i + 1];
    d.side = p && p.side ? (p.side === 'home' ? 'away' : 'home') : q && q.side ? (q.side === 'home' ? 'away' : 'home') : ''; });

  // 4) temps de jeu : la fiche du match seulement (les noms y diffèrent souvent de ceux des commentaires : « Pepe Tejero Gómez » / « Pepe Tejero »).
  //    Les commentaires ne servent que pour les tirs au but, ou si la fiche n'a aucune action.
  const soMin = SO.length ? Math.min(...SO.map(d => minVal(d.min))) : Infinity;
  const last = w => teamKey(w).split(' ').pop();
  const ficheVide = !S.length;
  const regC = C.filter(d => !SO.some(s => s.n != null && s.n === d.n) && !d.so
    && (ficheVide || (hasSO && !SO.length && d.kind === 'penmiss' && minVal(d.min) >= 90))
    && !(fromTable && minVal(d.min) >= 90 && !String(d.min).includes('+') && (d.kind === 'penmiss' || d.cand) && SO.some(s => last(s.who) === last(d.who))));
  const regS = SO.length ? S.filter(d => !d.so && !(minVal(d.min) >= soMin && d.kind !== 'red' && !String(d.min).includes('+'))) : S;
  const reg = [];
  [...regS.map(d => ({...d})), ...regC].forEach(d => {
    if (!d.side && !(hasSO && !SO.length && d.kind === 'penmiss' && minVal(d.min) >= 90)) return;   // camp inconnu : seulement un possible tir au but, complété plus bas
    // même action vue deux fois (fiche et commentaire) : même type, même minute, même camp, nom proche (Gross / Groß, M. Kovacic / Mateo Kovacic)
    const mots = w => teamKey(w).split(' ').filter(x => x.length >= 3), nom = mots(d.who), mn = Math.floor(minVal(d.min));
    const o = reg.find(x => x.kind === d.kind && Math.floor(minVal(x.min)) === mn && x.side === d.side && d.side
      && (() => { const n2 = mots(x.who); return !nom.length || !n2.length || nom.some(a => n2.some(b => a === b || (a.length > 4 && b.length > 4 && a.slice(0, 5) === b.slice(0, 5)))); })());
    if (o){ if (o.n == null && d.n != null) o.n = d.n; return; }     // ordre du match repris du commentaire
    reg.push(d); });
  let evs;
  if (SO.length){
    // au-delà du score du temps de jeu, un but structuré restant est un tir au but déjà lu : on l'écarte
    const left = {home:+m.home.score || 0, away:+m.away.score || 0};
    const sorted = reg.sort((a, b) => minVal(a.min) - minVal(b.min));
    evs = [...sorted.filter(d => d.kind !== 'goal' || (left[d.side] > 0 && left[d.side]-- >= 0)), ...SO.filter(d => d.side).map((d, i) => ({...d, ord:i}))];
  } else {
    evs = markShootout(reg, m);
    const so = evs.filter(d => d.so);
    so.forEach((d, i) => { if (d.side) return; const p = so[i - 1], q = so[i + 1];
      d.side = p && p.side ? (p.side === 'home' ? 'away' : 'home') : q && q.side ? (q.side === 'home' ? 'away' : 'home') : ''; });
    evs = evs.filter(d => d.side);
  }
  evs = evs.map(({n, ...d}) => d);
  return {evs, diag:evs.length ? '' : 'aucun but ni carton rouge reconnu'};
}
/* Tableau des tirs au but d'ESPN (clé « shootout » quelque part dans la fiche) : un objet par tir, réussi ou non */
function shootoutTable(j, byId, byName){
  const roots = [];
  const visit = (v, d) => { if (!v || typeof v !== 'object' || d > 6) return;
    if (Array.isArray(v)){ v.forEach(x => visit(x, d + 1)); return; }
    for (const [k, x] of Object.entries(v)){
      if (/shoot.?out/i.test(k) && !/score/i.test(k) && x && typeof x === 'object') roots.push(x);
      else if (!['commentary', 'plays', 'keyEvents', 'news', 'article', 'videos', 'standings', 'odds'].includes(k)) visit(x, d + 1); } };
  visit(j, 0);
  for (const root of roots){
    const kicks = [];
    const walk = (v, sd, d) => { if (!v || typeof v !== 'object' || d > 5) return;
      if (Array.isArray(v)){ v.forEach(x => walk(x, sd, d + 1)); return; }
      const t = v.team || {};
      const s2 = v.homeAway === 'home' || v.homeAway === 'away' ? v.homeAway : byId[String(t.id ?? v.teamId ?? '')] || (t.displayName ? byName(t.displayName) : '') || sd;
      const flag = ['didScore', 'scored', 'isGoal', 'made', 'success', 'converted'].find(k => typeof v[k] === 'boolean');
      const res = String(v.result || v.outcome || (v.type && v.type.text) || v.text || '');
      const ok = flag ? v[flag] : /scored|goal|made|convert/i.test(res) ? true : /miss|save|fail/i.test(res) ? false : null;
      const p = v.athlete || v.player || ((v.participants || [])[0] || {}).athlete || (v.athletesInvolved || [])[0] || null;
      const who = p ? p.displayName || p.shortName || p.fullName || '' : '';
      if (ok !== null && (who || s2)){ kicks.push({ok, who, side:s2 || '', nr:+(v.shotNumber ?? v.shot ?? v.order ?? v.round ?? v.sequence) || null, i:kicks.length}); return; }
      Object.values(v).forEach(x => { if (x && typeof x === 'object') walk(x, s2, d + 1); }); };
    walk(root, '', 0);
    if (!kicks.length) continue;
    const rank = {home:0, away:0};
    kicks.forEach(k => { if (k.nr == null) k.nr = ++rank[k.side || 'home']; });
    kicks.sort((a, b) => a.nr - b.nr || a.i - b.i);
    return kicks.map((k, i) => ({kind:k.ok ? 'goal' : 'penmiss', who:k.who, side:k.side, min:'', so:true, ord:i}));
  }
  return null;
}
/* Repère les tirs au but : au-delà du score du temps réglementaire, les buts sont des tirs au but ;
   les penaltys manqués collés à eux en fin de liste aussi. Résultat : temps de jeu trié, puis tirs au but. */
function markShootout(list, m){
  const evs = list.map((d, i) => ({...d, i}));
  const hasSO = m.home.so != null && m.home.so !== '' && m.away.so != null && m.away.so !== '';
  if (!hasSO){ evs.forEach(d => { d.so = false; }); }
  const reg = evs.filter(d => !d.so).sort((a, b) => minVal(a.min) - minVal(b.min) || a.i - b.i);
  if (hasSO){
    const left = {home:+m.home.score || 0, away:+m.away.score || 0};
    reg.forEach(d => { if (d.kind !== 'goal') return; const sd = d.side || 'home'; if (left[sd] > 0) left[sd]--; else d.so = true; });
    for (let k = reg.length - 1; k >= 0; k--){ const d = reg[k];
      if (d.so) continue;
      if (d.kind === 'penmiss' && minVal(d.min) >= 90) d.so = true; else break; }
  }
  const byN = evs.filter(d => d.so).every(d => d.n != null);
  const ordOf = d => d.ord != null ? d.ord : byN ? d.n : 1e4 + minVal(d.min) * 10 + d.i / 1e3;
  const sorted = [...reg.filter(d => !d.so), ...evs.filter(d => d.so).sort((a, b) => ordOf(a) - ordOf(b))];
  return sorted.map(({i, ...d}, k) => d.so ? {...d, ord:d.ord != null ? d.ord : k} : d);
}

/* accueil : fiche ESPN → {m, evs} (m : équipes et scores comme dans sport.html, evs : actions avec camp) */
function lire(j, sport){
  const comp = (((j.header || {}).competitions) || [])[0] || {}, cs = comp.competitors || [];
  const eq = (h, i) => { const x = cs.find(c => c.homeAway === h) || cs[i] || {}, t = x.team || {};
    return {id:String(t.id ?? x.id ?? ''), name:t.shortDisplayName || t.displayName || t.name || '?', full:t.displayName || t.name || '', abbr:t.abbreviation || '', score:x.score ?? '', so:x.shootoutScore ?? null}; };
  const m = {home:eq('home', 0), away:eq('away', 1)};
  let evs = [];
  try{
    if (sport === 'soccer') evs = soccerEvents(j, m).evs;
    else if (sport === 'rugby') evs = summaryEvents(j).evs.filter(d => d.kind !== 'penmiss');
  }catch{ evs = []; }
  evs.forEach(d => { if (!d.side && d.team) d.side = d.team === m.home.id ? 'home' : d.team === m.away.id ? 'away' : ''; });
  return {m, evs:evs.filter(d => d.side)};
}
/* minute estimée au rugby (ESPN laisse souvent l'horloge à 1') : période + temps écoulé depuis le début de la période,
   recalée sur la dernière action connue ; null si rien de sûr */
function minute(st, evs, debut){
  const per = +(st && st.period) || 0, txt = String((st && (st.displayClock || '')) || ''), d = String(((st || {}).type || {}).shortDetail || ((st || {}).type || {}).detail || '');
  if (/half.?time|mi-temps|^ht$/i.test(d)) return 'MT';
  const lu = parseInt(txt, 10);
  const dern = Math.max(0, ...(evs || []).map(e => Math.floor(minVal(e.min))).filter(x => x < 200));
  if (lu > 1 && lu <= 100) return Math.max(lu, dern) + "'";
  if (!debut) return dern ? dern + "'" : null;
  const ecoule = Math.floor((Date.now() - debut) / 60e3);
  let est = per >= 2 ? Math.max(41, ecoule - 17) : Math.min(40, ecoule);      // 2e période : ~15 min de pause à la mi-temps et quelques minutes d'arrêts
  est = Math.max(est, dern);
  if (est > (per >= 2 ? 80 : 40)) return (per >= 2 ? "80'+" : "40'+");
  return est > 0 ? est + "'" : null;
}
/* rugby (v48) : points d'une liste d'actions pour un camp, et choix de la liste la plus complète (celle dont les points collent au score ;
   à égalité, la plus longue). Un détail lu pendant le match (mi-temps…) reste sinon figé alors que le match est fini. */
const PTS = {try:5, conv:2, pen:3, drop:3};
const campDe = (d, m) => d.side || (d.team != null && m ? (String(d.team) === String(m.home.id) ? 'home' : String(d.team) === String(m.away.id) ? 'away' : '') : '');
function points(evs, m, sd){ return (evs || []).filter(d => campDe(d, m) === sd).reduce((a, d) => a + (PTS[d.kind] || 0), 0); }
function ecartScore(evs, m){ if (!m || m.home.score === '' || m.away.score === '') return 0; return Math.abs(points(evs, m, 'home') - (+m.home.score || 0)) + Math.abs(points(evs, m, 'away') - (+m.away.score || 0)); }
function meilleur(m, ...listes){
  const l = listes.filter(x => Array.isArray(x) && x.length); if (!l.length) return listes.find(Array.isArray) || [];
  return l.map((x, i) => ({x, e:ecartScore(x, m), n:x.length, i})).sort((a, b) => a.e - b.e || b.n - a.n || a.i - b.i)[0].x;
}
Object.assign(window, {classify, summaryEvents, soccerEvents, shootoutTable, markShootout});
window.Match = {lire, minute, points, ecartScore, meilleur, minVal, teamKey, classify, summaryEvents, soccerEvents, markShootout};
})();
