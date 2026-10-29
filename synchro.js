// mon-ecran-version: efb67e18
/* Mon Écran — synchronisation chiffrée entre tes appareils (iPhone, PC…).
   - Un fichier chiffré (synchro/mon-ecran.json, branche « synchro » de ton dépôt GitHub) contient tes placements,
     versements, réglages d'investissement et le Coffre. Sans la phrase secrète, c'est un bloc illisible.
   - Chiffrement : AES-GCM 256 bits ; clé tirée de la phrase secrète par PBKDF2-SHA256 (310 000 tours, sel au hasard).
   - Sur chaque appareil, la phrase et la clé d'écriture GitHub sont gardées chiffrées avec ton code habituel :
     au quotidien, ton code suffit. Pendant la session (appli ouverte), la clé du fichier reste en mémoire.
   - Chaque page ne s'occupe que de sa partie (« invest » ou « coffre ») : une modification faite ailleurs est reprise,
     la tienne est envoyée ; si les deux ont changé, la page te demande laquelle garder. */
(() => {
const LSg = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch{ return d; } };
const LSs = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const SSg = k => { try{ return JSON.parse(sessionStorage.getItem(k)); }catch{ return null; } };
const SSs = (k, v) => { try{ v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); }catch{} };
const b64 = buf => { const u = new Uint8Array(buf); let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(t); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const utf8b64 = s => b64(new TextEncoder().encode(s)), b64utf8 = s => new TextDecoder().decode(unb64(s.replace(/\s+/g, '')));
async function cleDe(secret, sel, tours){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:sel, iterations:tours, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, true, ['encrypt', 'decrypt']);
}
async function chiffrer(cle, obj){ const iv = crypto.getRandomValues(new Uint8Array(12));
  return {iv:b64(iv), ct:b64(await crypto.subtle.encrypt({name:'AES-GCM', iv}, cle, new TextEncoder().encode(JSON.stringify(obj))))}; }
async function dechiffrer(cle, box){ return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(box.iv)}, cle, unb64(box.ct)))); }
const empreinte = async obj => b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(obj ?? null)))).slice(0, 22);

/* Dépôt : déduit de l'adresse (pseudo.github.io/depot/), sinon celui de Mon Écran */
const DEPOT = (() => { const h = location.hostname.match(/^([\w-]+)\.github\.io$/), p = location.pathname.split('/').filter(Boolean)[0];
  return h && p ? `${h[1]}/${p}` : 'ZyAvo/iPhone-Dock'; })();
const BRANCHE = 'synchro', CHEMIN = 'synchro/mon-ecran.json', API = `https://api.github.com/repos/${DEPOT}`;
const TOURS = 310000;
const appareil = () => /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Android/.test(navigator.userAgent) ? 'Android' : 'ordinateur';

/* ---------- Coffre local (même format que cachee.html : clé tirée du code, 150 000 tours) ---------- */
async function coffreLire(pin){
  const box = LSg('coffre:chiffre', null); if (!box) return LSg('coffre:items', []);
  return dechiffrer(await cleDe(pin, unb64(box.sel), 150000), box);
}
async function coffreEcrire(pin, items){
  const box = LSg('coffre:chiffre', null), sel = box ? unb64(box.sel) : crypto.getRandomValues(new Uint8Array(16));
  LSs('coffre:chiffre', {v:1, sel:b64(sel), ...(await chiffrer(await cleDe(pin, sel, 150000), items))}); LSs('coffre:items', null);
}

/* ---------- GitHub ---------- */
async function gh(jeton, chemin, opt = {}){
  const r = await fetch(API + chemin, {...opt, cache:'no-store', headers:{accept:'application/vnd.github+json', authorization:'Bearer ' + jeton, ...(opt.headers || {})}});
  if (r.status === 401) throw new Error('jeton');
  if (r.status === 403) throw new Error(r.headers.get('x-ratelimit-remaining') === '0' ? 'limite' : 'droits');
  return r;
}
async function lireDistant(jeton){
  const r = await gh(jeton, `/contents/${CHEMIN}?ref=${BRANCHE}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('reseau');
  const j = await r.json(); return {fichier:JSON.parse(b64utf8(j.content)), sha:j.sha};
}
async function ecrireDistant(jeton, fichier, sha){
  const body = {message:`Synchro (${appareil()})`, content:utf8b64(JSON.stringify(fichier)), branch:BRANCHE, ...(sha ? {sha} : {})};
  let r = await gh(jeton, `/contents/${CHEMIN}`, {method:'PUT', body:JSON.stringify(body)});
  if (r.status === 404 || r.status === 422){                         // branche « synchro » pas encore créée
    const m = await gh(jeton, '/git/ref/heads/main'); if (!m.ok) throw new Error('droits');
    const base = (await m.json()).object.sha;
    const c = await gh(jeton, '/git/refs', {method:'POST', body:JSON.stringify({ref:'refs/heads/' + BRANCHE, sha:base})});
    if (!c.ok && c.status !== 422) throw new Error('droits');
    r = await gh(jeton, `/contents/${CHEMIN}`, {method:'PUT', body:JSON.stringify(body)});
  }
  if (r.status === 409) throw new Error('conflit');
  if (!r.ok) throw new Error(r.status === 403 ? 'droits' : 'reseau');
  return (await r.json()).content.sha;
}

/* ---------- Session : clé du fichier en mémoire (sessionStorage) après ton code ---------- */
const S_KEY = 'synchro:session';
async function sessionCle(){ const s = SSg(S_KEY); if (!s) return null;
  return {cle:await crypto.subtle.importKey('raw', unb64(s.cle), 'AES-GCM', false, ['encrypt', 'decrypt']), sel:s.sel, jeton:s.jeton}; }
async function ouvrirSession(phrase, jeton, sel){
  const cle = await cleDe(phrase, unb64(sel), TOURS);
  SSs(S_KEY, {cle:b64(await crypto.subtle.exportKey('raw', cle)), sel, jeton}); return cle;
}
/* configuration de l'appareil : {phrase, jeton} chiffrés avec ton code */
async function lireConfig(pin){
  const c = LSg('synchro:cfg', null); if (!c) return null;
  try{ return await dechiffrer(await cleDe(pin, unb64(c.sel), 150000), c); }catch{ return false; }
}
async function ecrireConfig(pin, cfg){
  const sel = crypto.getRandomValues(new Uint8Array(16));
  LSs('synchro:cfg', {v:1, sel:b64(sel), ...(await chiffrer(await cleDe(pin, sel, 150000), cfg)), appareil:appareil()});
}

/* ---------- Échange d'une partie ---------- */
async function contenuDistant(sess){
  const d = await lireDistant(sess.jeton); if (!d) return {contenu:{}, sha:null, fichier:null};
  return {contenu:await dechiffrer(sess.cle, d.fichier), sha:d.sha, fichier:d.fichier};
}
let enCours = Promise.resolve();
const ETAT = 'synchro:etat';
const etat = () => LSg(ETAT, {base:{}, at:0, err:''});
const noter = e => LSs(ETAT, {...etat(), ...e});
/* local() : la partie telle qu'elle est ici ; appliquer(v) : remplacer ici ; choisir(ici, ailleurs) → 'ici' | 'ailleurs' */
function partie(nom, {local, appliquer, choisir}){
  const run = async () => {
    const sess = await sessionCle(); if (!sess) return 'verrou';
    try{
      for (let essai = 0; essai < 3; essai++){
        const {contenu, sha} = await contenuDistant(sess);
        const ici = await local(), hIci = await empreinte(ici), dist = contenu[nom], hDist = dist === undefined ? null : await empreinte(dist);
        const base = (etat().base || {})[nom] ?? null;
        let action = hDist === hIci ? 'rien' : hDist === null || hDist === base ? 'envoyer' : hIci === base ? 'prendre' : null;
        if (!action) action = (await choisir(ici, dist)) === 'ici' ? 'envoyer' : 'prendre';
        if (action === 'prendre'){ await appliquer(dist); noter({base:{...etat().base, [nom]:hDist}, at:Date.now(), err:''}); return 'pris'; }
        if (action === 'rien'){ noter({base:{...etat().base, [nom]:hIci}, at:Date.now(), err:''}); return 'ok'; }
        const nouveau = {...contenu, [nom]:ici, _maj:new Date().toISOString(), _par:appareil()};
        try{ await ecrireDistant(sess.jeton, {v:1, sel:sess.sel, tours:TOURS, ...(await chiffrer(sess.cle, nouveau)), maj:nouveau._maj, par:nouveau._par}, sha); }
        catch(e){ if (e.message === 'conflit') continue; throw e; }       // un autre appareil vient d'écrire : on recommence
        noter({base:{...etat().base, [nom]:hIci}, at:Date.now(), err:''}); return 'envoye';
      }
      throw new Error('conflit');
    }catch(e){ noter({err:e.message || 'reseau'}); return 'erreur:' + (e.message || 'reseau'); }
  };
  const p = enCours.then(run, run); enCours = p.catch(() => {}); return p;
}
let tPlusTard = {};
const plusTard = (nom, opts, ms = 1500) => { clearTimeout(tPlusTard[nom]); tPlusTard[nom] = setTimeout(() => partie(nom, opts), ms); };

/* ---------- Petite fenêtre de choix (conflit) ---------- */
function demander(titre, texte, boutons){
  return new Promise(res => {
    const box = document.createElement('div');
    box.setAttribute('style', 'position:fixed;left:0;top:0;width:100vw;height:100dvh;box-sizing:border-box;z-index:9990;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center;padding:12px;padding-bottom:max(12px, env(safe-area-inset-bottom, 0px))');
    box.innerHTML = `<div role="dialog" aria-modal="true" style="box-sizing:border-box;width:100%;max-width:460px;max-height:calc(100dvh - 24px);overflow:auto;border-radius:24px;padding:18px;background:var(--sheet-solid, var(--base, #fff));color:var(--ink, #111);font-family:var(--f-ui, system-ui);box-shadow:0 20px 50px -20px rgba(0,0,0,.6)">
      <b style="font-size:1.05rem">${titre}</b><p style="margin:8px 0 14px;font-size:.9rem;line-height:1.45;color:var(--ink-soft, #555)">${texte}</p>
      <div style="display:flex;flex-direction:column;gap:8px">${boutons.map(([v, t], i) => `<button type="button" data-v="${v}" style="font:600 .92rem/1.2 var(--f-ui, system-ui);padding:12px;border-radius:14px;border:1px solid var(--line, #ddd);${i ? 'background:var(--card, #f3f3f3);color:var(--ink, #111)' : 'background:var(--accent, #274c77);color:var(--on-accent, #fff);border-color:transparent'}">${t}</button>`).join('')}</div></div>`;
    box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b){ box.remove(); res(b.dataset.v); } });
    document.body.appendChild(box);
  });
}
const conflit = quoi => () => demander('Modifié sur deux appareils', `${quoi} a changé ici <b>et</b> sur un autre appareil depuis la dernière synchronisation. Quelle version garder ?`,
  [['ailleurs', 'Garder celle de l\'autre appareil'], ['ici', 'Garder celle de cet appareil']]);

/* ---------- Phrase secrète au hasard : 6 mots (≈ 53 bits, des siècles à deviner avec 310 000 tours) ---------- */
const MOTS = 'abeille abricot acier agneau aigle aiguille aile algue allumette amande ampoule ancre ane anguille anneau antenne araignee arbre arc ardoise argent armoire artichaut asperge astre atelier autruche avion avocat avoine bague baie balai balcon baleine balle ballon banane banc bande barque bassin bateau baton bazar beignet belette berceau berger beurre biche bijou bille biscuit blason bleuet bocal bois boite bol bonnet bord botte bouche bougie boulon bouquet bourgeon boussole bouteille bouton branche bras brebis brindille brioche brique brosse brouillard bruyere buisson bulle bureau cabane cable cacao cadre cafe cahier caillou caisse calme camion canal canard canne canoe canon cape caramel carotte carre carte casque castor cerf cerise chaise chalet chameau champ chapeau charbon chariot chat chateau chaton chaussette chemin cheminee chene cheval cheveu chevre chien chiffre chocolat chou ciel cigale cigogne cirque citron clairiere clef cloche clou coccinelle cochon coffre colibri colline comete concombre coq coquelicot coquillage corbeau corde cordon corne cornichon cosmos coton coude couleur coupe courge couronne coussin couteau crabe craie crayon creme crepe criquet crocodile croissant cuillere cuivre cygne dauphin delta desert dessin diamant domino dragon drapeau dune eau ecaille echarpe echelle eclair ecorce ecureuil elan elephant enclume encre epee epi epinard escargot etang etoile eventail fable facteur falaise farine faucon fenetre fer feuille fiche figue fil flacon flamme fleche fleur fleuve flocon flute foin fontaine foret forge fouet fougere four fourmi fraise framboise frelon frene fromage fruit fumee fusee galet gant garage gateau gazelle gazon geant girafe glace gland globe gomme gorille goutte graine grange grenier grenouille griffe grille grotte guepe guitare hamac hamster hareng harpe herbe hermine heron hibou hirondelle homard horloge houx huile huitre iceberg igloo ile iris jade jambon jardin jasmin jeton jonquille journal jupe kayak kiwi lac laine lama lampe lance lanterne lapin laurier lavande legume lentille lezard lierre lievre lilas limace lime lion livre loup loutre lune luth lynx macaron mais maison mammouth manche mandarine mangue manteau marbre mare marmotte marron masque matelas medaille melon menthe merle meule miel miroir mitaine moineau montagne montre moto mouche mouette moulin mousse mouton muguet mur mure navet navire neige nid noisette noix nuage oasis ocean oeuf oie oignon olive ombre ongle orage orange orchidee oreiller orge orme ortie ours outil pain palmier panda panier papillon parapluie parc passoire patate paume pavot peche pelle perle perroquet pierre pigeon piment pin pinceau pingouin pioche pirate piste plage planete plante plume poire poisson poivre pomme pompe pont porte potiron poule poulpe poussin prairie prune puits pull puma quai quartz radeau radis raisin rame rateau ravin renard requin rocher roi rose roseau roue ruche ruisseau sable sac safran sapin sardine saule saumon sauterelle savon scarabee seau sel serpent sifflet singe sirop soleil soupe source souris stylo sucre table tabouret tambour tapis taupe taureau tempete terre tigre tilleul tiroir toile tomate tonneau tortue toupie tour tracteur train trefle tresor tribu trompette tulipe tunnel vache vague valise vallee vapeur velo vent verger verre violon vipere voile volcan wagon yaourt zebre zinc'.split(' ');
function genererPhrase(n = 6){
  const out = [], lim = Math.floor(65536 / MOTS.length) * MOTS.length;
  while (out.length < n){ const v = crypto.getRandomValues(new Uint16Array(1))[0]; if (v < lim) out.push(MOTS[v % MOTS.length]); }
  return out.join('-');
}

const MSG = {jeton:'clé GitHub refusée (expirée ou mal copiée)', droits:'la clé GitHub n\'a pas le droit d\'écrire sur le dépôt', limite:'trop de demandes à GitHub, réessaie dans quelques minutes',
  reseau:'pas de réseau ou GitHub injoignable', conflit:'modifications simultanées, réessaie', phrase:'phrase secrète incorrecte', coffre:'le Coffre est chiffré avec un autre code : ouvre-le une fois avec ton code actuel'};

/* partie « invest » : placements, réglages (sauf l'état du cadenas, propre à chaque appareil) et versements */
const investLocal = () => { const { verrou, ...reglages } = LSg('invest:reglages', {}); return {lignes:LSg('invest:lignes', []), reglages, versements:LSg('invest:versements', [])}; };
const investAppliquer = v => { const reg = LSg('invest:reglages', {}); LSs('invest:lignes', v.lignes || []); LSs('invest:reglages', {...(v.reglages || {}), verrou:reg.verrou}); LSs('invest:versements', v.versements || []); };
window.Synchro = {
  investLocal, investAppliquer,
  DEPOT, actif:() => !!LSg('synchro:cfg', null), pret:async () => !!(await sessionCle()), etat, MSG, appareil,
  genererPhrase, demander, conflit, partie, plusTard, coffreLire, coffreEcrire, empreinte,
  fermer(){ SSs(S_KEY, null); },
  /* après ton code : ouvre la session de synchronisation (false si le code a changé depuis l'activation) */
  async ouvrirAvecCode(pin){
    if (!this.actif()) return null; if (await sessionCle()) return true;
    const cfg = await lireConfig(pin); if (!cfg) return false;
    let sel = cfg.sel;
    if (!sel){ const d = await lireDistant(cfg.jeton).catch(() => null); if (!d) return null; sel = d.fichier.sel; }
    await ouvrirSession(cfg.phrase, cfg.jeton, sel); return true;
  },
  /* code changé : reprendre la configuration avec l'ancien code puis la rechiffrer avec le nouveau */
  async recoder(ancien, nouveau){ const cfg = await lireConfig(ancien); if (!cfg) return false; await ecrireConfig(nouveau, cfg); return true; },
  /* activation sur cet appareil (page État) */
  async activer({phrase, jeton, pin, choix}){
    phrase = phrase.trim().toLowerCase(); jeton = jeton.trim();
    const r = await gh(jeton, ''); if (!r.ok) throw new Error(r.status === 404 ? 'droits' : 'reseau');
    const d = await lireDistant(jeton);
    const ici = {invest:investLocal(), coffre:await coffreLire(pin)};
    if (d){
      const cle = await cleDe(phrase, unb64(d.fichier.sel), d.fichier.tours || TOURS);
      let contenu; try{ contenu = await dechiffrer(cle, d.fichier); }catch{ throw new Error('phrase'); }
      if (!choix) return {existe:true, maj:d.fichier.maj, par:d.fichier.par, n:(contenu.invest && contenu.invest.lignes || []).length};
      await ecrireConfig(pin, {phrase, jeton, sel:d.fichier.sel}); await ouvrirSession(phrase, jeton, d.fichier.sel);
      if (choix === 'prendre'){
        if (contenu.invest) investAppliquer(contenu.invest);
        if (contenu.coffre) await coffreEcrire(pin, contenu.coffre);
        noter({base:{invest:await empreinte(contenu.invest ?? null), coffre:await empreinte(contenu.coffre ?? null)}, at:Date.now(), err:''});
      } else {
        const nouveau = {...contenu, ...ici, _maj:new Date().toISOString(), _par:appareil()};
        await ecrireDistant(jeton, {v:1, sel:d.fichier.sel, tours:TOURS, ...(await chiffrer(cle, nouveau)), maj:nouveau._maj, par:nouveau._par}, d.sha);
        noter({base:{invest:await empreinte(ici.invest), coffre:await empreinte(ici.coffre)}, at:Date.now(), err:''});
      }
      return {ok:true};
    }
    const sel = b64(crypto.getRandomValues(new Uint8Array(16)));
    const cle = await cleDe(phrase, unb64(sel), TOURS), nouveau = {...ici, _maj:new Date().toISOString(), _par:appareil()};
    await ecrireDistant(jeton, {v:1, sel, tours:TOURS, ...(await chiffrer(cle, nouveau)), maj:nouveau._maj, par:nouveau._par}, null);
    await ecrireConfig(pin, {phrase, jeton, sel}); await ouvrirSession(phrase, jeton, sel);
    noter({base:{invest:await empreinte(ici.invest), coffre:await empreinte(ici.coffre)}, at:Date.now(), err:''});
    return {ok:true, cree:true};
  },
  desactiver(){ LSs('synchro:cfg', null); LSs(ETAT, null); SSs(S_KEY, null); }
};
})();
