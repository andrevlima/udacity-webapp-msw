let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []
let DOMLoaded = false;
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();
  DOMLoaded = true;
  DBHelper.bindAlertWhenOffOrOn();
});


registerServiceWorker = () => {
  // Check that service workers are available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service_worker.js');
  } else {
    console.warn("Oops, seems your browser is not as soo good as Christopher Columbus");
  }
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  window.runMap = () => {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
    google.maps.event.addListener(self.map, 'idle', function() {
      let iframe = document.getElementsByTagName("iframe").item(0);
      iframe.title = "Maps";
      iframe.setAttribute("aria-hidden", "true");
    });
    addMarkersToMap();
  };

  /*
  if(DOMLoaded) { 
    setTimeout(runMap, 4500);
  } else {
    document.addEventListener('DOMContentLoaded', (e) => setTimeout(runMap, 4500));
  }
  */
    
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.classList.add("restaurant-item")

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  DBHelper.imageUrlForRestaurant(restaurant, (url) => image.src = url);
  
  let alt = restaurant.photograph_desc ? restaurant.photograph_desc : "ilustrative photo of the restaurant" ;
  image.alt = `Restaurant ${restaurant.name}, ${alt}`;
 
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.classList.add("restaurant-details-btn");
  more.setAttribute("role", "button");
  more.innerHTML = 'View Details';
  more.setAttribute("aria-label", "Restaurant " + restaurant.name + ", click to view details");
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  let hasFavorite = isTrue(restaurant.is_favorite);
  const favorite = document.createElement('button');
  favorite.classList.add("restaurant-details-btn");
  favorite.setAttribute("role", "switch");
  favorite.setAttribute("aria-label", "Restaurant " + restaurant.name + ", click favorite");
  favorite.onclick = function(event) {
    hasFavorite = !hasFavorite
    DBHelper.markAsFavorite(restaurant.id, hasFavorite)//.then(() => updateFavoriteButton(favorite, hasFavorite));
    updateFavoriteButton(favorite, hasFavorite);
  }
  updateFavoriteButton(favorite, hasFavorite);
  li.append(favorite)

  return li;
}

isTrue = (exp) => {
  return exp == "true" || exp == true;
}

updateFavoriteButton = (button, hasFavorite) => {
  if(hasFavorite) {
    button.innerHTML = '★';
    button.setAttribute("aria-checked", "true");
  } else {
    button.innerHTML = '☆';
    button.setAttribute("aria-checked", "false");
  }
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
    
  });
}