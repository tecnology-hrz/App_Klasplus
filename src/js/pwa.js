/* ============================================================
   Klasplus - PWA + Marco móvil universal
   1) Registra el service worker (instalable en Android/Chrome/Edge).
   2) Muestra el banner "Instalar app" con el prompt nativo, y en iOS
      o navegadores sin prompt muestra las instrucciones manuales.
   3) En pantallas grandes envuelve el contenido en #kp-viewport para
      que la app se vea igual que en móvil (ver mobile-frame.css).
   ============================================================ */
(function () {
  'use strict';

  // ---------- Raíz del proyecto (funciona en subcarpetas tipo GitHub Pages) ----------
  var thisScript =
    document.currentScript ||
    (function () {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].src && list[i].src.indexOf('pwa.js') !== -1) return list[i];
      }
      return null;
    })();

  var ROOT = (function () {
    if (!thisScript || !thisScript.src) return '/';
    // .../src/js/pwa.js  ->  .../
    return thisScript.src.replace(/src\/js\/pwa\.js.*$/, '');
  })();

  var MEDIA_DESKTOP = '(min-width: 768px)';

  // =========================================================
  // 1. MARCO MÓVIL EN PANTALLAS GRANDES
  // =========================================================
  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  }

  function wrapContent() {
    var body = document.body;
    if (!body || document.getElementById('kp-viewport')) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'kp-viewport';

    // Se mueven todos los hijos del body al wrapper, excepto los
    // elementos propios del banner de instalación.
    var nodes = [];
    for (var i = 0; i < body.childNodes.length; i++) {
      var node = body.childNodes[i];
      if (node.id === 'kpInstallBanner' || node.id === 'kpInstallHelp') continue;
      nodes.push(node);
    }
    for (var j = 0; j < nodes.length; j++) wrapper.appendChild(nodes[j]);

    body.insertBefore(wrapper, body.firstChild);

    var display = window.getComputedStyle(body).display;
    if (display === 'flex' || display === 'inline-flex') {
      body.classList.add('kp-flex-body');
    }
  }

  function unwrapContent() {
    var wrapper = document.getElementById('kp-viewport');
    if (!wrapper) return;
    var body = document.body;
    while (wrapper.firstChild) body.insertBefore(wrapper.firstChild, wrapper);
    body.removeChild(wrapper);
    body.classList.remove('kp-flex-body');
  }

  function syncFrame() {
    if (!window.matchMedia) return;
    if (window.matchMedia(MEDIA_DESKTOP).matches) wrapContent();
    else unwrapContent();
  }

  // =========================================================
  // 2. BANNER DE INSTALACIÓN
  // =========================================================
  var deferredPrompt = null;

  function isIos() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  // Coloca el aviso por encima de las barras fijas inferiores
  // (nav de la app, input del chat) para no taparlas.
  function placeBanner(banner) {
    var bars = document.querySelectorAll('.bottom-nav, .chat-input-container');
    var offset = 12;
    for (var i = 0; i < bars.length; i++) {
      var style = window.getComputedStyle(bars[i]);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      var h = bars[i].getBoundingClientRect().height;
      if (h > offset) offset = h + 12;
    }
    banner.style.bottom = offset + 'px';
  }

  function buildBanner() {
    if (document.getElementById('kpInstallBanner')) return document.getElementById('kpInstallBanner');

    var banner = document.createElement('div');
    banner.id = 'kpInstallBanner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Instalar la aplicación Klasplus');
    banner.innerHTML =
      '<img class="kp-install-icon" src="' + ROOT + 'src/img/icon-192.png" alt="">' +
      '<div class="kp-install-texts">' +
      '<p class="kp-install-title">Instalar Klasplus</p>' +
      '<p class="kp-install-sub">Úsala como app, con acceso directo y pantalla completa.</p>' +
      '</div>' +
      '<div class="kp-install-actions">' +
      '<button type="button" class="kp-install-btn" id="kpInstallBtn">Instalar</button>' +
      '<button type="button" class="kp-dismiss-btn" id="kpDismissBtn" aria-label="Cerrar">&times;</button>' +
      '</div>';

    document.body.appendChild(banner);
    placeBanner(banner);

    document.getElementById('kpInstallBtn').addEventListener('click', triggerInstall);
    // Cerrar solo lo oculta en esta vista: vuelve a aparecer al recargar
    // o al pasar a otra pantalla de la app.
    document.getElementById('kpDismissBtn').addEventListener('click', hideBanner);

    return banner;
  }

  function buildHelp() {
    if (document.getElementById('kpInstallHelp')) return;

    var steps = isIos()
      ? '<li>Toca el botón <strong>Compartir</strong> en Safari.</li>' +
        '<li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>' +
        '<li>Confirma con <strong>Añadir</strong>.</li>'
      : '<li>Abre el menú del navegador (&#8942;).</li>' +
        '<li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>' +
        '<li>Confirma la instalación.</li>';

    var overlay = document.createElement('div');
    overlay.id = 'kpInstallHelp';
    overlay.innerHTML =
      '<div class="kp-help-card" role="dialog" aria-modal="true" aria-labelledby="kpHelpTitle">' +
      '<h3 id="kpHelpTitle">Instalar Klasplus</h3>' +
      '<ol>' + steps + '</ol>' +
      '<button type="button" class="kp-help-close" id="kpHelpClose">Entendido</button>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('kp-visible');
    });
    document.getElementById('kpHelpClose').addEventListener('click', function () {
      overlay.classList.remove('kp-visible');
    });
  }

  function showBanner() {
    // Solo se oculta si la app YA se está usando instalada (ahí no hay
    // nada que instalar). En el navegador siempre se muestra.
    if (isStandalone()) return;
    var banner = buildBanner();
    placeBanner(banner);
    setTimeout(function () {
      banner.classList.add('kp-visible');
    }, 900);
  }

  function hideBanner() {
    var banner = document.getElementById('kpInstallBanner');
    if (banner) banner.classList.remove('kp-visible');
  }

  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice
        .then(function (choice) {
          if (choice && choice.outcome === 'accepted') hideBanner();
        })
        .catch(function () {})
        .then(function () {
          deferredPrompt = null;
        });
      return;
    }
    buildHelp();
    var help = document.getElementById('kpInstallHelp');
    if (help) help.classList.add('kp-visible');
  }

  // API pública, por si se quiere lanzar desde un botón propio
  window.KlasplusPWA = {
    promptInstall: triggerInstall,
    canInstall: function () {
      return !!deferredPrompt;
    }
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showBanner();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideBanner();
  });

  // =========================================================
  // 3. SERVICE WORKER
  // =========================================================
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return; // los SW requieren HTTPS (o localhost)
    }
    navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(function (err) {
      console.warn('[PWA] No se pudo registrar el service worker:', err);
    });
  }

  // =========================================================
  // ARRANQUE
  // =========================================================
  function init() {
    syncFrame();

    if (window.matchMedia) {
      var mq = window.matchMedia(MEDIA_DESKTOP);
      if (mq.addEventListener) mq.addEventListener('change', syncFrame);
      else if (mq.addListener) mq.addListener(syncFrame);
    }

    // El aviso se muestra SIEMPRE que la app se abra en el navegador.
    // Si el navegador no dispara beforeinstallprompt (iOS, Firefox, o
    // porque la app ya está instalada) igual mostramos el aviso con las
    // instrucciones manuales.
    setTimeout(function () {
      showBanner();
    }, 2000);

    // Al volver a la pestaña o navegar con el historial, vuelve a salir.
    window.addEventListener('pageshow', function () {
      showBanner();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) showBanner();
    });

    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
