class Helper {
   /**
   * Restaurant page URL.
   */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    static arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = [].slice.call(new Uint8Array(buffer));

        bytes.forEach((b) => binary += String.fromCharCode(b));

        return window.btoa(binary);
    };

    /**
    * Restaurant image URL.
    */
    static imageUrlForRestaurant(restaurant, callback) {
        const me = this;
        const url = `/img/${restaurant.photograph}.webp`;

        this.fetchImage(url).then((blob) => {
            blob.arrayBuffer().then((buffer) => {
                var objectURL = me.arrayBufferToBase64(buffer);
                callback(`data:image/jpeg;base64,${objectURL}`);
            });
        }).catch(function (error) {
            console.log('There has been a problem with your fetch operation: ', error.message);
        });
    }

    static fetchImage(url) {
        const me = this;
        return fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'default'
        }).then((response) => {
            if (response.ok) {
                return response;
            }
            throw new Error('Network response was not ok.');
        }).catch((error) => {
            return me.fetchImage(`/img/no_image_available.webp`);
        });
    }

    static showAlert(message) {
        let msg = document.createElement('div');
        msg.innerHTML = `<div role="alert" class="alert-msg">${message}</div>`;
        msg = msg.firstChild;
        
        document.body.appendChild(msg);
        setTimeout(() => msg.className = "alert-msg show", 200);
        setTimeout(() => msg.className = "alert-msg hide", 4000);
        setTimeout(() => msg.remove(), 5000);
    }

}

Helper.displayMapToggle = (function() {
    let shown = true;
    let alreadyHasMap = false;
    return () => {
        if(!window.runMap) {
            return;
        }
        if(!alreadyHasMap) {
            alreadyHasMap = true;
            window.runMap();
        }
        document.getElementById('map').style.display = (shown = !shown) ? 'none' : 'block';
    }
})();