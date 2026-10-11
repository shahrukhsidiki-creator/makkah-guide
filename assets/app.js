/* ==========================================================================
   Makkah Guide — shared app script
   No frameworks. No API keys. Everything runs in the browser.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- Config ----------------
     Put your affiliate IDs here later. Leaving them blank is fine —
     the links still work, you just don't earn on them yet.          */
  window.MG_CONFIG = {
    siteName: 'Makkah Guide',
    affiliate: {
      skyscanner: '',   // e.g. 'associateid=XXXX'
      booking: '',      // e.g. 'aid=XXXXXX'
      tripcom: ''       // e.g. 'Allianceid=XXXX&SID=XXXX'
    }
  };

  var KAABA = { lat: 21.4224779, lng: 39.8251832 };
  window.MG_KAABA = KAABA;

  /* ---------------- Storage helpers (never throw) ---------------- */
  function get(k, fallback) {
    try {
      var v = localStorage.getItem('mg_' + k);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function set(k, v) {
    try { localStorage.setItem('mg_' + k, JSON.stringify(v)); } catch (e) {}
  }
  window.MG = window.MG || {};
  MG.get = get;
  MG.set = set;

  /* ---------------- Theme ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0b1a15' : '#0a3b2c');
  }
  var savedTheme = get('theme', null);
  if (!savedTheme) {
    savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  applyTheme(savedTheme);
  MG.toggleTheme = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    set('theme', next);
    applyTheme(next);
  };

  /* ---------------- Language ----------------
     The translation engine lives in assets/i18n.js. These shims keep the
     older call sites working and open the picker.                      */
  MG.openLang = function () { if (window.I18N) I18N.open(); };
  MG.cycleLang = MG.openLang;      // older pages called this
  Object.defineProperty(MG, 'lang', {
    get: function () { return window.I18N ? I18N.current : 'en'; }
  });

  /* ---------------- Shared chrome injection ---------------- */
  var TABS = [
    { href: 'index.html',       ic: '🕋', key: 'ui.nav_home',   en: 'Home',   match: ['index.html', ''] },
    { href: 'umrah-guide.html', ic: '📖', key: 'ui.nav_guide',  en: 'Umrah',  match: ['umrah-guide.html', 'zikr.html', 'hateem.html'] },
    { href: 'tools.html',       ic: '🧭', key: 'ui.nav_tools',  en: 'Tools',  match: ['tools.html', 'tawaf-counter.html'] },
    { href: 'travel.html',      ic: '✈️', key: 'ui.nav_travel', en: 'Travel', match: ['travel.html', 'flights.html', 'transport.html', 'taxi.html', 'makkah-madinah.html', 'hotels.html'] },
    { href: 'more.html',        ic: '☰',  key: 'ui.nav_more',   en: 'More',   match: ['more.html', 'food.html', 'shopping.html', 'ziyarat.html', 'essentials.html', 'about.html'] }
  ];

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function buildTabbar() {
    if (document.querySelector('.tabbar')) return;
    var page = currentPage();
    var nav = document.createElement('nav');
    nav.className = 'tabbar';
    nav.setAttribute('aria-label', 'Main');
    nav.innerHTML = TABS.map(function (t) {
      var on = t.match.indexOf(page) !== -1 ? ' on' : '';
      return '<a class="' + on.trim() + '" href="' + t.href + '">' +
             '<span class="ic" aria-hidden="true">' + t.ic + '</span>' +
             '<span data-i18n="' + t.key + '">' + t.en + '</span></a>';
    }).join('');
    document.body.appendChild(nav);
  }

  function buildFooter() {
    if (document.querySelector('.site-footer')) return;
    var f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML =
      '<div class="wrap">' +
        '<ul class="foot-links">' +
          '<li><a href="index.html" data-i18n="ui.foot_home">Home</a></li>' +
          '<li><a href="umrah-guide.html" data-i18n="ui.foot_guide">Umrah Guide</a></li>' +
          '<li><a href="tools.html" data-i18n="ui.foot_tools">Tools</a></li>' +
          '<li><a href="travel.html" data-i18n="ui.foot_travel">Travel</a></li>' +
          '<li><a href="more.html" data-i18n="ui.foot_more">More</a></li>' +
          '<li><a href="about.html" data-i18n="ui.foot_about">About &amp; Contact</a></li>' +
        '</ul>' +
        '<p style="margin:0 0 8px" data-i18n="ui.foot_indep">This is an independent guide. It is not affiliated with, endorsed by, or an official channel of the Saudi government, the General Presidency for the Affairs of the Grand Mosque, Nusuk, or any airline, hotel or transport operator.</p>' +
        '<p style="margin:0 0 8px" data-i18n="ui.foot_religious"><b>Religious content:</b> the worship guidance here is written in general terms that the major schools broadly agree on. Rulings differ in detail between schools of fiqh and between individual circumstances. Please verify with a qualified scholar or your group\'s guide before acting on anything in matters of worship.</p>' +
        '<p style="margin:0 0 8px" data-i18n="ui.foot_translation"><b>Translations:</b> this guide is written in English and translated to help you understand it. Where a translation and the English differ, the English is the version to rely on — and for any matter of worship, a qualified scholar is the authority, not this site.</p>' +
        '<p style="margin:0"><span data-i18n="ui.foot_changes">Timings, fares and prices change without notice — always confirm from the official source on the day.</span> © <span id="yr"></span> ' + MG_CONFIG.siteName + '</p>' +
      '</div>';
    document.body.appendChild(f);
    var yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ---------------- Ad slots ----------------
     Reserved, clearly-labelled space. Replace the inner HTML of any
     .ad-slot with your AdSense snippet or a direct banner <a><img></a>. */
  function fillAdSlots() {
    document.querySelectorAll('.ad-slot').forEach(function (el) {
      if (el.children.length) return;
      var hint = el.getAttribute('data-hint') || 'Umrah packages · hotels · restaurants · transport';
      el.innerHTML =
        '<span class="ad-label" data-i18n="ui.ad_label">Advertisement space</span>' +
        '<span class="ad-hint">' + hint + '</span>';
    });
  }

  /* ---------------- Outbound search engine ----------------
     The core of the "no API" approach: we don't fetch results, we
     construct a perfect query and hand the user to the search engine. */
  MG.go = function (url) {
    window.open(url, '_blank', 'noopener');
  };
  MG.q = function (s) { return encodeURIComponent(String(s == null ? '' : s).trim()); };

  MG.google = function (query) {
    MG.go('https://www.google.com/search?q=' + MG.q(query));
  };
  MG.maps = function (query) {
    MG.go('https://www.google.com/maps/search/' + MG.q(query));
  };
  MG.mapsNear = function (query, lat, lng) {
    if (lat != null && lng != null) {
      MG.go('https://www.google.com/maps/search/' + MG.q(query) + '/@' + lat + ',' + lng + ',15z');
    } else {
      MG.maps(query);
    }
  };
  MG.directions = function (from, to, mode) {
    var u = 'https://www.google.com/maps/dir/?api=1&destination=' + MG.q(to);
    if (from) u += '&origin=' + MG.q(from);
    if (mode) u += '&travelmode=' + mode;
    MG.go(u);
  };
  MG.news = function (query) {
    MG.go('https://news.google.com/search?q=' + MG.q(query));
  };

  /* Geolocation — free, browser-native, no key. */
  MG.locate = function (onOk, onFail) {
    if (!navigator.geolocation) { onFail && onFail('unsupported'); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) { onOk(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy); },
      function (err) { onFail && onFail(err && err.code === 1 ? 'denied' : 'error'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  /* ---------------- Toast ---------------- */
  MG.toast = function (msg) {
    var t = document.getElementById('mgToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mgToast';
      t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));' +
        'background:#0a3b2c;color:#fff;padding:11px 18px;border-radius:999px;font-size:.86rem;z-index:200;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;pointer-events:none;max-width:88vw;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  };

  /* ---------------- Vibrate ---------------- */
  MG.buzz = function (pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  };

  /* ---------------- Install (PWA) ---------------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (get('installDismissed', false)) return;
    var bar = document.getElementById('installBar');
    if (bar) bar.classList.add('show');
  });
  MG.install = function () {
    if (!deferredPrompt) { MG.toast('Use your browser menu → Add to Home Screen'); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      var bar = document.getElementById('installBar');
      if (bar) bar.classList.remove('show');
    });
  };
  MG.dismissInstall = function () {
    set('installDismissed', true);
    var bar = document.getElementById('installBar');
    if (bar) bar.classList.remove('show');
  };

  function buildInstallBar() {
    if (document.getElementById('installBar')) return;
    var d = document.createElement('div');
    d.id = 'installBar';
    d.className = 'install-bar';
    d.innerHTML = '<span style="flex:1" data-i18n="ui.install_msg">Install this guide — works offline at the Haram</span>' +
      '<button onclick="MG.install()" data-i18n="ui.install_btn">Install</button>' +
      '<button class="x" onclick="MG.dismissInstall()" aria-label="Dismiss">✕</button>';
    document.body.appendChild(d);
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    buildTabbar();
    buildFooter();
    buildInstallBar();
    fillAdSlots();

    var tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', MG.toggleTheme);
    var lb = document.getElementById('langBtn');
    if (lb) lb.addEventListener('click', MG.openLang);

    // chrome was injected after i18n may have initialised — re-apply over it
    if (window.I18N) I18N.refresh();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
