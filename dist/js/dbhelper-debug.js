/**
 * Common database helper functions.
 */
class DBHelper {
  constructor() {
    tryToPollyfill();
    this.isFirstCacheDone = false;
  }

  static fetchRestaurantsFromServer(id) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      if(id) {
        xhr.open('GET', `${DBHelper.DATABASE_URL}/${id}`);
      } else {
        xhr.open('GET', `${DBHelper.DATABASE_URL}/`);
      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.responseText);
          const restaurants = json;
          resolve({ response: restaurants });
        } else {
          const error = (`Request failed. Returned status of ${xhr.status}`);
          xhr.onerror();
        }
      };
      xhr.onerror = (function() { reject({ status: this.status, statusText: xhr.statusText }) });
      xhr.send();
    });
  }
  
  static getDataPromised(id_) {
    let id = id_;
    let dbPromised;
    if(this.isFirstCacheDone) {
      return (dbPromised = idb.open('db-restaurant', 1, (udb) => {
        udb.createObjectStore('restaurants', { keyPath: 'id' });
      }).then((wrapper) => {
        let udb = wrapper._db;
        const tx = udb.transaction('restaurants');

        return new Promise((resolve, reject) => {
          if(id) {
            tx.objectStore('restaurants').get(id).onsuccess = function(event) {
              callback(null, event.target.result);
            }
          } else {
            tx.objectStore('restaurants').getAll().onsuccess = function(event) {
              resolve(event.target.result);
            }
          }
        });
      }));
    }
    
    let restaurants;
    let alreadyMapped = false;
    return this.fetchRestaurantsFromServer(id).then(function(data) {
      restaurants = data.response;
      return idb.open('db-restaurant', 1, (udb) => {
        udb.createObjectStore('restaurants', { keyPath: 'id' });
        return udb;
      });
    }).catch(() => {
      this.isFirstCacheDone = true;
      alreadyMapped = true;
      console.warn("Retrieving from cached DB...");
      return this.getDataPromised();
    }).then((wrapper) => {
      if(alreadyMapped) {
        return wrapper;
      }

      var udb = wrapper._db;
      var tasks = [].concat(restaurants).map((value) =>  {
        return new Promise((res, rej) => {
          const tx = udb.transaction(['restaurants'], 'readwrite');
          tx.oncomplete = () => res(value); tx.onerror = () => res(value);

          tx.objectStore('restaurants').put(value);
          return value;
        });
      });
      this.isFirstCacheDone = true;
      return Promise.all(tasks);
    });
  } 

  static tryToPollyfill() {
    window.indexedDB = 
    window.indexedDB || 
    window.mozIndexedDB || 
    window.webkitIndexedDB || 
    window.msIndexedDB || 
    window.shimIndexedDB;
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    this.getDataPromised().then((restaurants) => {
      callback(null, restaurants);
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    this.getDataPromised(id).then((restaurants) => {
      callback(null, restaurants[0]);
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, callback) {
    let targetImg = restaurant.photograph ? restaurant.photograph : restaurant.id;
    callback(`/dist/img/${targetImg}.webp`);
  }

  /**
  * Restaurant page URL.
  */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: `./restaurant.html?id=${restaurant.id}`,
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }
}
