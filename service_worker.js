// Importing Workbox 3.0
importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js');
// Importing IDDB Promised
//importScripts('https://cdn.jsdelivr.net/npm/indexeddb-promised@1.3.1/js/indexeddb-promised.min.js');

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
  // Cache Google Fonts
  workbox.routing.registerRoute(
    new RegExp('^https://fonts.(?:googleapis|gstatic).com/(.*)'),
    workbox.strategies.cacheFirst({
      cacheName: 'google-font-apis',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 120
        })
      ]
    })
  );
  // Maps requests
  workbox.routing.registerRoute(/https:\/\/maps.googleapis.com\/maps\/api\/(.*)/, 
    workbox.strategies.networkFirst({
      cacheName: 'google-maps-apis'
    })
  );
  
  // Resources files
  workbox.routing.registerRoute(/\.(?:js|css|json)$/,
    workbox.strategies.staleWhileRevalidate({
      cacheName: 'resources-files'
    })
  );

  // Precache common page files
  workbox.precaching.precacheAndRoute([
    { url:'index.html', revision: 'v1' },
    { url:'restaurant.html', revision: 'v1' }
  ]);

  workbox.routing.registerRoute(
    new RegExp('/restaurants($|/$|/[0-9])'),
    workbox.strategies.cacheFirst({
      cacheName: 'restaurant-data'
    })
  );

  // Cache Restaurants
  /*
  self.addEventListener("fetch",function(event) {
    if(new RegExp('/restaurants($|/$|/[0-9])').test(event.request.url)) {
      console.log("fecthed");
    }
  })
  workbox.routing.registerRoute(
    new RegExp('/restaurants($|/$|/[0-9])'),
    workbox.strategies.cacheFirst({
      cacheName: 'restaurant'
    })
  );
  */

} else {
  console.error('Workbox can\'t be loaded or unavailable');
}
