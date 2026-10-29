/* HomeOps service worker: makes the app installable and usable offline.
   App files are fetched fresh when online (so updates show up right away) and served from the
   cache when offline. Your data is never stored here: it lives in localStorage and the cloud,
   so updates never touch it. Bump CACHE when shipping changes. */
var CACHE = "homeops-v5";

// Only the app's own files and its CDN libraries are cached; Firebase sign-in and live sync
// traffic always goes straight to the network.
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|www\.gstatic\.com\/firebasejs)\//;

var SHELL = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/00-core.js",
  "js/01-dom.js",
  "js/02-utils.js",
  "js/03-ingest-xlsx.js",
  "js/04-clean.js",
  "js/05-model.js",
  "js/06-icons.js",
  "js/07-files.js",
  "js/08-reminders.js",
  "js/09-exports.js",
  "js/10-reports.js",
  "js/11-forms.js",
  "js/12-views.js",
  "js/13-floorplan.js",
  "js/99-controller.js",
  "js/14-cloud.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Network first (with a short timeout on slow connections), falling back to the cache offline.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url = new URL(req.url);
  var own = url.origin === self.location.origin && url.pathname.indexOf("/__/") !== 0;
  if (req.method !== "GET" || !(own || CDN.test(req.url))) {
    return;
  }

  event.respondWith(caches.open(CACHE).then(function (cache) {
    var fromCache = function () {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        return cached || (req.mode === "navigate" ? cache.match("index.html") : null);
      }).then(function (cached) {
        return cached || Response.error();
      });
    };
    var network = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        cache.put(req, res.clone());
      }
      return res;
    });
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 4000); }).then(function () {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) { return cached || network; });
    });
    return Promise.race([network, timeout]).catch(fromCache);
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (wins) {
    var url = new URL("./#/maintenance", self.registration.scope).href;
    for (var i = 0; i < wins.length; i += 1) {
      if ("focus" in wins[i]) {
        wins[i].navigate(url);
        return wins[i].focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
