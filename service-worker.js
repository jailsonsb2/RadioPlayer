// Define o nome do cache
const CACHE_NAME = 'web-radio-v1';

// Lista de arquivos a serem cacheados
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/img/cover.png',
  // Adicione outros recursos que deseja cache aqui
];

// Instala o Service Worker e adiciona os arquivos ao cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta as solicitações e serve os arquivos em cache se disponíveis
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }
        // Não encontrado no cache - busca na rede
        return fetch(event.request);
      }
    )
  );
});
