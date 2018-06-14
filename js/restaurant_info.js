let restaurant;
var map;

/**
 * Init the SW
 * Bind review form
 */

document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  bindReviewForm();
});

showAlert = (message) => {
  let msg = document.createElement('div');
  msg.innerHTML = `<div role="alert" class="alert-msg">${message}</div>`;
  msg = msg.firstChild;
  
  document.body.appendChild(msg);
  setTimeout(() => msg.className = "alert-msg show", 200);
  setTimeout(() => msg.className = "alert-msg hide", 4000);
  setTimeout(() => msg.remove(), 5000);
}

bindReviewForm = () => {
  document.querySelector("#review-form").addEventListener('submit', function(e) {
    // compose the data object
    const data = getReviewForm();
    console.log('Data sent', data);

    fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.json()).then('Response', console.log);
    
    showAlert('Review submited!');

    // reset form
    setReviewForm('', '', 3);

    e.preventDefault(); // stop it's effects here
    e.stopPropagation(); // stop it from bubbling up

    fillRestaurantReviews();
    return false;
  });
}

setReviewForm = (name, comments, rating) => {
  document.querySelector("#review-name").value = name;
  document.querySelector(`[name='review-ratio'][value='${rating}']`).checked = true;
  document.querySelector("#review-comment").value = comments;
}

getReviewForm = () => {
  return {
    restaurant_id: getParameterByName('id'),
    name: document.querySelector("#review-name").value,
    rating: document.querySelector("[name='review-ratio']:checked").value,
    comments: document.querySelector("#review-comment").value
  };
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

fillRestaurantReviews = () => {
  fetchRestaurantReviews().then(fillReviewsHTML);
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  
  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  DBHelper.imageUrlForRestaurant(restaurant, (url) => image.src = url);

  let alt = restaurant.photograph_desc ? restaurant.photograph_desc : "ilustrative photo of the restaurant" ;
  image.alt = `Restaurant ${restaurant.name}, ${alt}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute("aria-label", "Cuisine type is " + restaurant.cuisine_type);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillRestaurantReviews();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

fetchRestaurantReviews = (restaurantId = getParameterByName('id')) => {
  return fetch(`http://localhost:1337/reviews/?restaurant_id=${restaurantId}`, {
    method: 'GET'
  }).then(response => response.json());
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = "";

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.classList.add("review");
  
  const title = document.createElement("div");
  title.classList.add("review-title");

  const content = document.createElement("div");
  content.classList.add("review-content");

  const name = document.createElement('h4');
  name.classList.add("review-reviewer");
  name.innerHTML = review.name;
  title.appendChild(name);  

  const date = document.createElement('span');
  date.classList.add("review-date");
  date.innerHTML = new Date(review.createdAt).toDateString();
  title.appendChild(date);

  const rating = document.createElement('span');
  rating.classList.add("review-rating");
  rating.innerHTML = `Rating: ${review.rating}`;
  content.appendChild(rating);

  const comments = document.createElement('p');
  comments.classList.add("review-comments");
  comments.innerHTML = review.comments;
  content.appendChild(comments);

  li.appendChild(title);
  li.appendChild(content);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

registerServiceWorker = () => {
  // Check that service workers are available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service_worker.js');
  } else {
    console.warn("Oops, seems your browser is not as soo good as Christopher Columbus");
  }
}