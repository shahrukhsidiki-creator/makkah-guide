/* ==========================================================================
   Makkah Guide — internationalisation engine
   Loads assets/i18n/<lang>.json and applies it to [data-i18n] elements.
   Handles RTL, script-appropriate fonts, persistence and English fallback.
   No build step, no framework, works offline once cached.
   ========================================================================== */
(function () {
  'use strict';

  var LANGS = [
    { code: 'en', native: 'English',    english: 'English',    dir: 'ltr', short: 'EN' },
    { code: 'ur', native: 'اردو',        english: 'Urdu',       dir: 'rtl', short: 'اردو' },
    { code: 'hi', native: 'हिन्दी',        english: 'Hindi',      dir: 'ltr', short: 'हिं' },
    { code: 'ar', native: 'العربية',     english: 'Arabic',     dir: 'rtl', short: 'ع' },
    { code: 'id', native: 'Indonesia',  english: 'Indonesian', dir: 'ltr', short: 'ID' },
    { code: 'bn', native: 'বাংলা',       english: 'Bengali',    dir: 'ltr', short: 'বাং' }
  ];
  var CODES = LANGS.map(function (l) { return l.code; });

  var dict = {};            // active translations
  var originals = null;     // Map<Element, {html, placeholder}> — the English source
  var current = 'en';
  var cache = {};           // lang -> dict

  function meta(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }

  /* ---- storage (never throws) ---- */
  function saved() {
    try { return localStorage.getItem('mg_lang'); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem('mg_lang', v); } catch (e) {}
  }

  /* ---- snapshot the English source before the first replacement ----
     Incremental: chrome injected later (nav, footer, install bar) is
     captured the first time it is seen, in its English state.          */
  function snapshot() {
    if (!originals) originals = new Map();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (!originals.has(el)) originals.set(el, { html: el.innerHTML });
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var rec = originals.get(el);
      if (!rec) { rec = {}; originals.set(el, rec); }
      if (rec.placeholder == null) rec.placeholder = el.getAttribute('placeholder');
    });
  }

  /* ---- Nastaliq is not installed on most devices; fetch it only for Urdu ---- */
  function ensureUrduFont() {
    if (document.getElementById('mgUrduFont')) return;
    var l = document.createElement('link');
    l.id = 'mgUrduFont';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap';
    l.onerror = function () { /* offline — the system Arabic font takes over */ };
    document.head.appendChild(l);
  }

  function apply() {
    snapshot();
    var m = meta(current);

    document.documentElement.setAttribute('lang', current);
    document.documentElement.setAttribute('dir', m.dir);
    document.documentElement.setAttribute('data-lang', current);
    document.body.classList.toggle('rtl', m.dir === 'rtl');
    if (current === 'ur') ensureUrduFont();

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var src = originals.get(el);
      if (dict[k]) el.innerHTML = dict[k];
      else if (src) el.innerHTML = src.html;          // fall back to English
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-placeholder');
      var src = originals.get(el);
      if (dict[k]) el.setAttribute('placeholder', dict[k]);
      else if (src && src.placeholder != null) el.setAttribute('placeholder', src.placeholder);
    });

    // the ad hint is scaffolding for the site owner, not reader content
    document.querySelectorAll('.ad-slot .ad-hint').forEach(function (el) {
      el.style.display = (current === 'en') ? '' : 'none';
    });

    // "back" points the other way in a right-to-left layout
    var rtl = (m.dir === 'rtl');
    document.querySelectorAll('.back-link').forEach(function (el) {
      el.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.nodeValue = rtl ? n.nodeValue.replace(/←/g, '→')
                            : n.nodeValue.replace(/→/g, '←');
        }
      });
      var first = el.querySelector('[data-i18n]');
      if (first) first.innerHTML = first.innerHTML.replace(rtl ? /←/g : /→/g, rtl ? '→' : '←');
    });

    var btn = document.getElementById('langBtn');
    if (btn) btn.textContent = m.short;

    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: current, dir: m.dir } }));
  }

  /* Translations load as <script> rather than fetch(JSON), because fetch is
     blocked on file:// — so the site still switches language when someone
     opens index.html straight from the folder with no web server. */
  function load(code, cb) {
    if (code === 'en') { dict = {}; cb && cb(); return; }
    if (cache[code]) { dict = cache[code]; cb && cb(); return; }
    if (window.MG_I18N && window.MG_I18N[code]) {
      cache[code] = window.MG_I18N[code]; dict = cache[code]; cb && cb(); return;
    }
    var id = 'mgLang_' + code;
    var existing = document.getElementById(id);
    if (existing) { existing.parentNode.removeChild(existing); }
    var s = document.createElement('script');
    s.id = id;
    s.src = 'assets/i18n/' + code + '.js';
    s.onload = function () {
      if (window.MG_I18N && window.MG_I18N[code]) {
        cache[code] = window.MG_I18N[code];
        dict = cache[code];
      } else { dict = {}; }
      cb && cb();
    };
    s.onerror = function () {
      dict = {};
      cb && cb();
      if (window.MG && MG.toast) MG.toast('Could not load that language — showing English');
    };
    document.head.appendChild(s);
  }

  function set(code, opts) {
    if (CODES.indexOf(code) === -1) code = 'en';
    current = code;
    save(code);
    load(code, apply);
  }

  /* ---- first-run language guess from the browser ---- */
  function detect() {
    var s = saved();
    if (s && CODES.indexOf(s) !== -1) return s;
    var navLangs = (navigator.languages || [navigator.language || 'en']);
    for (var i = 0; i < navLangs.length; i++) {
      var base = String(navLangs[i]).toLowerCase().split('-')[0];
      if (base === 'in') base = 'id';                       // legacy Indonesian code
      if (CODES.indexOf(base) !== -1) return base;
    }
    return 'en';
  }

  /* ---- the picker sheet ---- */
  function openPicker() {
    var existing = document.getElementById('langSheet');
    if (existing) { existing.classList.add('open'); return; }

    var sheet = document.createElement('div');
    sheet.id = 'langSheet';
    sheet.className = 'lang-sheet open';
    sheet.innerHTML =
      '<div class="lang-backdrop"></div>' +
      '<div class="lang-panel" role="dialog" aria-modal="true" aria-label="Choose language">' +
        '<div class="lang-grip"></div>' +
        '<h3>Language · زبان · भाषा · ভাষা</h3>' +
        '<div class="lang-list">' +
          LANGS.map(function (l) {
            return '<button class="lang-opt' + (l.code === current ? ' on' : '') + '" data-lang="' + l.code + '">' +
              '<span class="lang-native"' + (l.dir === 'rtl' ? ' dir="rtl"' : '') + '>' + l.native + '</span>' +
              '<span class="lang-en">' + l.english + '</span>' +
              '<span class="lang-tick">✓</span></button>';
          }).join('') +
        '</div>' +
        '<p class="lang-note">Translations are provided to help you understand. For anything concerning worship, the English text and a qualified scholar are the authority.</p>' +
      '</div>';
    document.body.appendChild(sheet);

    function close() { sheet.classList.remove('open'); }
    sheet.querySelector('.lang-backdrop').addEventListener('click', close);
    sheet.querySelectorAll('.lang-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = this.getAttribute('data-lang');
        sheet.querySelectorAll('.lang-opt').forEach(function (x) { x.classList.remove('on'); });
        this.classList.add('on');
        set(code);
        setTimeout(close, 160);
      });
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  /* ---- boot ---- */
  function init() {
    current = detect();
    load(current, apply);
  }

  window.I18N = {
    LANGS: LANGS,
    get current() { return current; },
    set: set,
    open: openPicker,
    refresh: apply,          // call after injecting new [data-i18n] content
    // an empty string is a deliberate translation (some languages drop a
    // word entirely), so only fall back when the key is genuinely absent
    t: function (key, fallback) {
      return Object.prototype.hasOwnProperty.call(dict, key)
        ? dict[key]
        : (fallback === undefined ? key : fallback);
    },
    init: init
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
