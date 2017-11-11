self.addEventListener('fetch', function(event) {
    var isAPICall = event.request.url.match(/rest\/v1/) !== null
    var isSearch = isAPICall && event.request.url.match(/ex-list-filter/) !== null
    event.respondWith(
        caches.match(event.request, { ignoreSearch: isAPICall && !isSearch }).then(function(response) {
            if (response == null) console.log("cache miss", isAPICall, event.request.url)
            return response || fetch(event.request).then(function(resp2) {
                var r = resp2.clone()
                if (isAPICall) {
                    console.log("cache rest call", event.request.url)
                    caches.open("ontrail-api").then(function(cache) { cache.put(event.request, resp2.clone()) })
                }
                return r
            })
        }).catch(function(e) {
            console.log("error in service worker while intercepting fetch", e)
        })
    )
})