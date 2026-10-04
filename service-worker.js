const CACHE_NAME = "celvis-precios-v8";
const APP_SHELL = ["./", "./index.html", "./config.js", "./catalog-api.js", "./manifest.webmanifest?v=8", "./apple-touch-icon.png?v=8", "./icon-192.png?v=8", "./icon-512.png?v=8"];
self.addEventListener("install", event => {
 event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
 self.skipWaiting();
});
self.addEventListener("activate", event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("celvis-precios-") && key !== CACHE_NAME).map(key => caches.delete(key)))));
 self.clients.claim();
});
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || /\/admin(?:\.html|\.js)?$/.test(url.pathname)) return;
 event.respondWith(fetch(event.request).then(response => {
   if(response.ok){ const copy=response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request,copy))); }
   return response;
 }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
