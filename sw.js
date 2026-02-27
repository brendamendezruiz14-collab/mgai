const CACHE_NAME = 'mgai-v1';
const FILES_TO_CACHE = [
  '/index.html',
  '/manifest.json'
];

// Instalar SW y cachear archivos
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('MG AI: Archivos cacheados');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          console.log('MG AI: Borrando cache viejo', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Interceptar requests - primero cache, luego red
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response; // Desde cache
      }
      return fetch(event.request).then(function(response) {
        // Si es válido, guardarlo en cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function() {
        // Sin internet - devolver index desde cache
        return caches.match('/index.html');
      });
    })
  );
});
