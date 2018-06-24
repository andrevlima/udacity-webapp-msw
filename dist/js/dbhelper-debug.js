/**
 * Common database helper functions.
 */
class DBHelper {
  constructor() {
    tryToPollyfill();
    bindAlertWhenOffOrOn();
    this.isFirstCacheDone = false;
    window.isNot = (exp) => !exp;
  }

  static bindAlertWhenOffOrOn() {
    let updateOnlineStatus = ()=> {
      var condition = navigator.onLine ? "online" : "offline";
      Helper.showAlert(`Now, you are ${condition}!`);
    }
    const resendAllPendings = () => {
      DBHelper.resendPendingReviews();
      DBHelper.resendPendingFavorites();
    }
    window.addEventListener('online',  () => {
      updateOnlineStatus(); 
      resendAllPendings();
    });
    window.addEventListener('offline', updateOnlineStatus);

    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(resendAllPendings, 2000);
    })
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
  
  

  static sendReview(data) {
    return fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) { throw response };
      return response;
    })
    .catch(err => {
      idb.open('db-pending', 1, (udb) => {
        udb.createObjectStore('review', { autoIncrement: true, keyPath: "cache_id" });
      }).then((wrapper) => {
        let udb = wrapper._db;
        const tx = udb.transaction(['review'], 'readwrite');
        tx.objectStore('review').add(data);
        return tx;
      });
      throw err;
    });
  }

  static getPendingFavoriteDB() {
    return idb.open('db-pending-favorites', 1, (udb) => {
      udb.createObjectStore('favorites', { keyPath: "id" });
      return udb;
    });
  }

  static resendPendingFavorites() {
    let _self = this;
    return this.getPendingFavoriteDB().then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['favorites'], 'readwrite');
      const table = tx.objectStore('favorites');

      return new Promise((resolve) => {
        table.getAll().onsuccess = function(event) {
          [].concat(event.target.result).forEach((value) => {
            let index = value.id;
            //if pass, remove it from peding...
            _self.sendFavorite(value)
            .then(() => {
              _self.removePendingReview(index);
            });
          });
        }
      })
    });
  }

  static sendFavorite(fav) {
    const _self = this;
    return fetch(`http://localhost:1337/restaurants/${fav.id}/?is_favorite=${fav.is_favorite}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    })
    .then(response => {
      if (!response.ok) { throw response };
      _self.removePendingFavorite(fav.id);
      return response;
    })
    .catch(err => {
      _self.setPendingFavorites(fav);
      throw err;
    });
  }
  
  static removePendingFavorite(index) {
    return this.getPendingFavoriteDB().then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['favorites'], 'readwrite');
      const table = tx.objectStore('favorites');

      table.delete(index);

      return tx;
    });
  }

  static setPendingFavorites(fav) {
    return this.getPendingFavoriteDB().then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['favorites'], 'readwrite');
      const table = tx.objectStore('favorites');

      return new Promise((resolve) => {
        table.put(fav).onsuccess = function(event) {
          resolve();
        }
      })
    });
  }

  static resendPendingReviews() {
    let _self = this;
    idb.open('db-pending', 1, (udb) => {
      udb.createObjectStore('review', { autoIncrement: true, keyPath: "cache_id" });
    }).then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['review'], 'readwrite');
      const table = tx.objectStore('review');

      table.getAll().onsuccess = function(event) {
        [].concat(event.target.result).forEach((value) => {
          let index = value.cache_id;
          //if pass, remove it from peding...
          _self.sendReview(value)
          .then(() => {
            _self.removePendingReview(index);
          });
        });
      }

      return tx;
    });
  }

  static removePendingReview(index) {
    return idb.open('db-pending', 1, (udb) => {
      udb.createObjectStore('review', { autoIncrement: true, keyPath: "cache_id" });
    }).then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['review'], 'readwrite');
      const table = tx.objectStore('review');

      table.delete(index);

      return tx;
    });
  }

  static fetchPedingReviews(restaurant_id) {
    return idb.open('db-pending', 1, (udb) => {
      udb.createObjectStore('review', { autoIncrement: true, keyPath: "cache_id" });
    }).then((wrapper) => {
      const udb = wrapper._db;
      const tx = udb.transaction(['review'], 'readwrite');
      const table = tx.objectStore('review');

      return new Promise(function(resolve, reject) {
        table.getAll().onsuccess = function(event) {
          let result = event.target.result.filter((review) => review.restaurant_id == restaurant_id);
          resolve(result);
        }
      });
    });
  }

  static getDB() {
    return idb.open('db-restaurant', 1, (udb) => {
      switch(udb.oldVersion) {
        case 1: 
          udb.createObjectStore('restaurants', { keyPath: 'id' });
        case 2:
          udb.createObjectStore('reviews_restaurant', { keyPath: 'restaurant_id' });
      }
      //udb.createIndex("reviews_restaurant", "restaurant_id", { unique: false });
      return udb;
    });
  }
  
  static getDataPromised(id_) {
    let id = id_;
    let dbPromised;
    if(this.isFirstCacheDone) {
      return (dbPromised = this.getDB()).then((wrapper) => {
        let udb = wrapper._db;
        const tx = udb.transaction('restaurants');

        return new Promise((resolve, reject) => {
          if(id) {
            tx.objectStore('restaurants').get(id).onsuccess = function(event) {
              //callback(null, event.target.result);
              resolve([event.target.result]);
            }
          } else {
            tx.objectStore('restaurants').getAll().onsuccess = function(event) {
              resolve(event.target.result);
            }
          }
        });
      });
    }
    
    let restaurants;
    let alreadyMapped = false;
    let _self = this;
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
          tx.oncomplete = () => res(value); 
          tx.onerror = () => res(value);

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
    this.getDataPromised(id).then((restaurant) => {
      callback(restaurant[0]);
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

  static markAsFavorite(restaurant_id, hasFavorite) {
    return this.sendFavorite({ id: restaurant_id, is_favorite: hasFavorite }).catch(() => new Promise((resolve) => {
      const top_resolve = resolve;
      this.fetchRestaurantById(restaurant_id, (restaurant) => {
        var restaurant = restaurant;
        this.getDB().then((wrapper) => {
          let udb = null;
          udb = wrapper._db;
          const tx = udb.transaction(['restaurants'], 'readwrite');

          restaurant.is_favorite = hasFavorite;
    
          return new Promise((resolve, reject) => {
            tx.objectStore('restaurants').put(restaurant).onsuccess = function(event) {
              resolve(event.target.result);
              top_resolve(restaurant);
            }
          });
        });
      })
    }));
  }
}
