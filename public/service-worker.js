importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js",
);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const { recipes, navigationPreload, routing, strategies } = workbox;

navigationPreload.enable();

recipes.pageCache();
recipes.staticResourceCache();
recipes.imageCache();
recipes.offlineFallback({
  pageFallback: "/offline.html",
  imageFallback: "/images/logos/logo.png",
});

routing.registerRoute(
  ({ url }) => url.origin === "https://api.open-meteo.com",
  new strategies.NetworkFirst({
    cacheName: "weather-cache-v1",
  }),
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "seed") {
    const seed = Math.random().toString(36).slice(2, 10);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ seed });
    }
  }
});
