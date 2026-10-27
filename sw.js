// Nombre del caché y versión
const CACHE_NAME = "visitas-pwa-v1";

// Archivos estáticos que se van a guardar en la caché (App Shell)
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/app.js",
    "./js/db.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// Evento Install: se ejecuta al instalar el Service Worker
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Almacenando App Shell en caché...");
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Evento Activate: limpia cachés antiguas al actualizar versiones
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Eliminando caché antigua:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Evento Fetch: intercepta las peticiones y aplica estrategia Cache First (fallback a red)
self.addEventListener("fetch", (e) => {
    // Ignorar peticiones que no sean GET (o esquemas no soportados como chrome-extension)
    if (e.request.method !== "GET" || !e.request.url.startsWith("http")) return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            // Devolver del caché si existe; si no, ir a la red
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request).then((networkResponse) => {
                // Guardar copias de recursos dinámicos en la caché si la respuesta es válida
                if (
                    !networkResponse ||
                    networkResponse.status !== 200 ||
                    networkResponse.type !== "basic"
                ) {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});