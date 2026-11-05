// mon-ecran-version: 759ac82b
/* Mon Écran — comportements communs à toutes les pages (v53 ; avant : recopiés dans chaque page).
   Chargé en fin de page, après le code de la page : rond de toucher, mise en mémoire (service worker) et avis de nouvelle version,
   « tirer pour rafraîchir » (si la page a un #ptr). Pas de rechargement automatique pendant une lecture vidéo
   (enLecture() de l'accueil si elle existe, sinon une vidéo en cours ou l'image dans l'image). */
(() => {
const occupe = () => { try{ if (typeof enLecture === 'function') return !!enLecture(); }catch{}
  return !!(document.pictureInPictureElement || [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended)); };
/* Toucher visible : un rond qui s'efface là où le doigt appuie (pratique aussi pour les vidéos de démo) */
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const d = document.createElement('span'); d.className = 'tap-dot';
  d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 650);
}, {passive:true, capture:true});

/* Mise en mémoire sur l'iPhone (démarrage instantané, hors ligne) + avis quand une nouvelle version est déposée */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
  const t0 = Date.now(); let majDispo = false, cacheAt = 0;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'nouvelle-version') return;
    majDispo = true;
    if (Date.now() - t0 < 8000 && !occupe()){ location.reload(); return; }         // page tout juste ouverte : on passe directement à la nouvelle version
    if (document.querySelector('.maj-toast')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'maj-toast'; b.textContent = 'Nouvelle version — toucher pour l\'afficher';
    b.addEventListener('click', () => location.reload()); document.body.appendChild(b);
  });
  try{ navigator.serviceWorker.startMessages(); }catch{}
  /* Retour sur l'appli : nouvelle version déjà prête → rechargement ; sinon on vérifie s'il y en a une (au plus toutes les 2 min) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (majDispo && !occupe()){ location.reload(); return; }
    if (Date.now() - cacheAt < 120e3) return;
    cacheAt = Date.now();
    navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
    fetch(location.pathname, {cache:'no-cache'}).catch(() => {});
  });
}

(() => {
  const el = document.getElementById('ptr'), SEUIL = 78;
  let y0 = null, x0 = 0, d = 0, actif = false;
  const OVER = '.scrim:not([hidden]),.sheet-bg:not([hidden]),.sheet:not([hidden]),[role="dialog"]:not([hidden])';
  const bloque = t => [...document.querySelectorAll(OVER)].some(e => e.getClientRects().length) || !t.closest || t.closest('input,textarea,select,[data-no-ptr]') ||
    (() => { for (let n = t; n && n !== document.body; n = n.parentElement) if (n.scrollTop > 0) return true; return false; })();
  const set = (y, cls) => { el.style.transform = `translateY(${y}px)`; el.style.opacity = Math.min(1, y / 40); el.className = 'ptr' + (cls ? ' ' + cls : ''); };
  addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || (scrollY || document.documentElement.scrollTop) > 0 || bloque(e.target)) { y0 = null; return; }
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; d = 0; actif = false;
  }, {passive:true});
  addEventListener('touchmove', e => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
    if (!actif){ if (Math.abs(dx) > Math.abs(dy) || dy < 6){ if (Math.abs(dx) > 10 || dy < -6) y0 = null; return; } if ((scrollY || document.documentElement.scrollTop) > 0){ y0 = null; return; } actif = true; }
    d = Math.max(0, dy);
    const y = Math.min(80, d * .5);
    set(y - 10, d >= SEUIL ? 'pret' : '');
  }, {passive:true});
  addEventListener('touchend', () => {
    if (y0 == null || !actif){ y0 = null; return; }
    y0 = null;
    if (d >= SEUIL){ set(34, 'va tourne'); setTimeout(() => location.reload(), 250); }
    else { set(-60, 'va'); }
  }, {passive:true});
  addEventListener('touchcancel', () => { if (actif) set(-60, 'va'); y0 = null; }, {passive:true});
})();
})();
