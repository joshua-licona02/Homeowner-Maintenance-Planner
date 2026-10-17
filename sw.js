/* HomeOps service worker: makes the app installable and usable offline.
   Bump CACHE when shipping changes so phones pick up the new files. */
var CACHE = "homeops-v2";

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
  "js/99-controller.js"
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

// Serve from cache right away, refresh the cache in the background (stale-while-revalidate).
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") {
    return;
  }

  event.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(function () {
        return cached || (req.mode === "navigate" ? cache.match("index.html") : undefined);
      });
      return cached || network;
    });
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
