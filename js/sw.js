// Importing Workbox 3.0
importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js');

if (workbox) {
  // Restaurant dynamic pages
  workbox.routing.registerRoute(/restaurant.html(.*)/,
    workbox.strategies.networkFirst({
      cacheName: 'dynamic-pages'
    })
  );
  // Cache images and media files (5 days)
  workbox.routing.registerRoute(/\.(?:png|gif|jpg|jpeg|svg|webp)$/,
    workbox.strategies.cacheFirst({
      cacheName: 'media-files',
      plugins: [
        new workbox.expiration.Plugin({ maxAgeSeconds: 86400 * 5 })
      ]
    })
  );
  // Resources files
  workbox.routing.registerRoute(/\.(?:js|css|json)$/,
    workbox.strategies.staleWhileRevalidate({
      cacheName: 'resources-files'
    })
  );
  // Maps requests
  workbox.routing.registerRoute(/https:\/\/maps.googleapis.com\/(maps\/api|maps-api-v3\/api)\/(.*)/, 
    workbox.strategies.networkFirst()
  );
  // Precache common page files
  workbox.precaching.precacheAndRoute([
    { url:'index.html', revision: 'v1' },
    { url:'restaurant.html',revision: 'v1' }
  ]);
} else {
  console.error('Workbox can\'t be loaded or unavailable');
}
