self.addEventListener('fetch', function(event) {
    var isAPICall = event.request.url.match(/rest\/v1/) !== null
    event.respondWith(
        caches.match(event.request, { ignoreSearch: isAPICall }).then(function(response) {
            if (response == null) console.log("cache miss", isAPICall, event.request.url)
            return response || fetch(event.request).then(function(resp2) {
                // we need to add response to the cache manually, so let's open
                // a new cache and put responses there (for easier expiration
                // when logging out)
                var r = resp2.clone()
                if (isAPICall) {
                    caches.open("ontrail-api").then(function(cache) { cache.put(event.request, resp2.clone()) })
                }
                return r
            })
        }).catch(function(e) {
            console.log("error in service worker while intercepting fetch", e)
        })
    )
})