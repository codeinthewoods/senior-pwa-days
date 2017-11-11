self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request)
        }).catch(function(e) {
            console.log("error in service worker while intercepting fetch", e)
        })
    )
})