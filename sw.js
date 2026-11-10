const C = "jxidle-v1794337841265";
const IMG = "jxidle-img-1794337841265";
const BUST = [
  "img/z/397.jpg",
  "img/i/potb1.png",
  "img/i/potb3.png",
  "img/i/potb5.png",
  "img/m/boss002.png",
  "img/m/boss005.png",
  "img/m/boss015.png",
  "img/z/321.jpg",
  "img/z/226.jpg",
  "img/z/227.jpg",
  "img/z/42.jpg"
];
const ASSET = /\.(png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf)$/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== C && key !== IMG).map(key => caches.delete(key))))
      .then(() => caches.open(IMG))
      .then(cache => cache.keys().then(requests => Promise.all(requests.map(request => {
        const busted = BUST.some(path => new URL(request.url).pathname.endsWith("/" + path));
        if (busted) return cache.delete(request);
        return cache.match(request).then(response => {
          const type = response && response.headers.get("content-type") || "";
          return !response || /text\/html/i.test(type) ? cache.delete(request) : null;
        });
      }))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/sb/")) return;

  if (ASSET.test(url.pathname)) {
    event.respondWith(caches.open(IMG).then(cache => cache.match(event.request).then(cached => {
      const fresh = fetch(event.request, { cache: "no-cache" }).then(response => {
        const type = response.headers.get("content-type") || "";
        if (response.ok && !/text\/html/i.test(type)) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return fresh;
    })));
    return;
  }

  const noCache = /\.(js|css|html)$|\/$/.test(url.pathname);
  event.respondWith(
    fetch(event.request, noCache ? { cache: "no-cache" } : undefined)
      .then(response => {
        if (response.ok) caches.open(C).then(cache => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
