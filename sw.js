/* Makkah Guide — service worker
   Cache-first for the app shell so every page, the Umrah guide, the
   counters and the prayer-time calculator keep working with no signal.
   Bump CACHE_VERSION whenever you edit the site.                      */

var CACHE_VERSION = 'makkah-guide-v5';

var SHELL = [
  './',
  'index.html',
  'umrah-guide.html',
  'zikr.html',
  'hateem.html',
  'tools.html',
  'tawaf-counter.html',
  'travel.html',
  'flights.html',
  'transport.html',
  'taxi.html',
  'hotels.html',
  'makkah-madinah.html',
  'more.html',
  'food.html',
  'shopping.html',
  'ziyarat.html',
  'essentials.html',
  'about.html',
  'offline.html',
  '404.html',
  'assets/style.css',
  'assets/app.js',
  'assets/i18n.js',
  'assets/i18n/en.js',
  'assets/i18n/ur.js',
  'assets/i18n/hi.js',
  'assets/i18n/ar.js',
  'assets/i18n/id.js',
  'assets/i18n/bn.js',
  'assets/islamic.js',
  'assets/icon.svg',
  'manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (c) {
      // addAll fails entirely if one file 404s — add individually instead
      return Promise.all(SHELL.map(function (url) {
        return c.add(url).catch(function () { /* skip missing */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   // never touch outbound search links

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        // refresh in background
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE_VERSION).then(function (c) { c.put(req, res); });
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('offline.html');
      });
    })
  );
});
