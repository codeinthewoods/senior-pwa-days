# Day 1

## Implement the idea (quick & dirty)

1. Code
2. ???
3. App is working, yes yes.

## Make it progressive web app

The goal of the first day is to make the web app base progressive and support offline mode.

## What being progressive web app means?

Within scope of day 1:

- You can install it as a "standalone" application on a mobile device or with a minimal browser chrome.
- Supports splash screen so the loading of the application is seamless
- Loads even when the device is offline (cache stylesheets, images, html and API calls)

Within scope of day 2:

- Possibility to synchronize data between client & server (offline edits)
- Push messages & "native" notifications
- etc...

## Hands-on!

Let's start to make our web app progressive.

### Install Lighthouse

Lighthouse is a wonderful Chrome browser-extension that generates audit reports of your site and gives you useful tips on how to fix the app.

- https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk

Let's generate the report for http://beta.ontrail.net/

  ![image](screenshots/Screenshot1.png)

Not looking very good, even quite _legacyish_, would you say?

### We seem to lack at least web app manifest, so let's go ahead and add one.

  - https://developers.google.com/web/fundamentals/web-app-manifest/ and
  - https://developer.mozilla.org/en-US/docs/Web/Manifest

Here is what a sample [manifest.json](samples/manifest1.json) could look like.

Link it to the application with meta tag at the beginning of the page.

    <link rel="manifest" href="/manifest.json">

### Check with chrome dev tools application tab that all looks good

Chrome dev tools have "Application" -tab that you can use to check the PWA parts of your application

  ![image](screenshots/application-menu.png)

Open the manifest tab and go through the content

  ![image](screenshots/Screenshot2.png)

> Ups, bug with image size, lets fix that

  ![image](screenshots/Screenshot3.png)

Looking good, time to move on.

### Rerun Lighthouse to find out the next problem

  ![image](screenshots/Screenshot4.png)

Some more error and worse accessibility.  Results will vary depending on your computer load, so there is nothing to worry.  Rendering times may even get worse if there is extra penalty for hitting cache before network, but that should be fixed later.

Manifest error disappeared, so we can pick the next most important problem.

## Implement Service workers

First task ist to make application show something reasonable even when we are offline.

Let's use sample application from google codelabs for base as lighthouse instructed
  - https://codelabs.developers.google.com/codelabs/offline/#0

Add the code that loads service workers [to the very end of your index.html or other entry point](samples/init-service-workers.html)

Put browser to offline mode from developer tools

  ![image](screenshots/offline-mode.png)


Let's try this with our own, Empty cache and Hard Reload (right click or two-finger -click the reload button)

  ![image](screenshots/Screenshot5.png)
  ![image](screenshots/Screenshot6.png)

Ok, so we at least are not getting the no network dialog, but it isn't really pretty though.

Let's add some stylesheets and scripts from our index.html to preload to our [sw.js](samples/sw.js)
- https://codelabs.developers.google.com/codelabs/offline/#6

Huh, no nothing??!?

Maybe we are missing something and merely caching urls is not enough? Let's add event listener to **fetch**-events and intercept the actual requests so something is actually put and fetched from cache.

- https://codelabs.developers.google.com/codelabs/offline/#7

So here is the [snippet](samples/fetch.js) to add to sw.js.  Reload and voilá, we are finally getting to somewhere.  Login is unfortunately non-possible while we are offline, so let's enable network and log in to the application to see what happens next.

Logged in, great, now turn the network back off again.

Darn, we are missing the actual content, since it comes not from a static resource but from via API call.

### _Pro tip; how to cache third party resources, when CORS headers are missing_

 https://filipbech.github.io/2017/02/service-worker-and-caching-from-other-origins

### Finally, cache the API responses

So we need to cache also api responses somwhow to make the app appear at least somewhat useful while offline.

Let's cache all rest api requests and then skip later those that should go to server always (login/logout and validations).  We need to ignore query parameters since it is used for cache busting in the existing web app and we definitely do not want to bust our newly created cache.

Here is the new [fetch](samples/fetch2.js)-interceptor that handles also API calls.

Let's try to navigate somewhere, like tags.

Great; the cache seems to work.  Now, how about another?

WTF? Still at the tags?  This is not the cache I am looking for.  Ach, it was the search query parameters that are still being ignored.

Ok, one more try, let's include query parameters in [supporting the search](samples/fetch3.js).

Now, let's do the search again.

Perfect!


## Reading: The offline cookbook for all kinds of recipes
- https://jakearchibald.com/2014/offline-cookbook/


# Day 2

## Notify when interesting stuff hapns

What you can do with push notifications?

  - Send timely notifications to users from your backend server
  - Create a set of actions for user to respond with from mobile lock screen
  - Add badge (b&w) for mobile status bar
  - Add icon to show besides notification
  - group notifications with a tag
  - Open web page or focus on on open tab when user clicks notification
  - fetch some extra data, cache page etc. before loading

What you need?

  - Service workers
  - Application keys for encypting push messages
  - Unique push token from client that is used to send messages to a particular device and browser

A good place to start:

https://developers.google.com/web/fundamentals/push-notifications/

A walk-through project:

https://developers.google.com/web/fundamentals/codelabs/push-notifications/

### Steps to enable push notifications in server

1. Application server keys (VAPID)

Today: get them [here](https://web-push-codelab.glitch.me/)

For production purposes in your own PWA: Use a specific library, e.g. [web-push for node](https://github.com/web-push-libs/web-push)

Remember to generate keys only once and store them somewhere else than git (password manager would be a good place)

    npm install web-push -g

    // log keys to console
    web-push generate-vapid-keys [--json]

Result will look like

    {"publicKey":"BEb-...KLLXmkY", privateKey":"Vys4eHO..-AjvwU"}

These will go to the `options` part of the push sent, together with GCM api key.
 The `subject` will be displayed as sender in the notification.

### Steps to enable push notifications in client

1. Get a handle to service worker

To be able to send push messages, you need to get permission from user.  For that, we need to use Service Workers:

    // in browser
    async function installServiceWorker() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const serviceWorker = await navigator.serviceWorker.register('sw.js')
          await registerPush(serviceWorker)
        } catch (error) {
          console.error('Service Worker Error', error))
        }
      } else {
        // push messages are not supported,
      }
    }

    // install the listener
    document.addEventListener('DOMContentLoaded', installServiceWorker)

2. Get a push subscription

Code to test if push messages are enabled:

    async function registerPush(serviceWorker) {
      const subscription = await serviceWorker.pushManager.getSubscription()
      const isSubscribed = !(subscription === null)

      if (isSubscribed) {
        // send keys to server always as they will expire after a while
        await userSubscribed(subscription)
      } else {
        // user is not subscribed, display permission dialog
        const newSubscription = await askForNotificationPermission(serviceWorker)
        // if user gave permissions, send keys to server
        if (newSubscription !== null) {
          userSubscribed(newSubscription)
        }
      }
    }

3. Ask for permission

We need to prompt for push permissions. Code to urlB64ToUint8Array can be found from [web-push](https://github.com/web-push-libs/web-push)

    async function askForNotificationPermission(serviceWorker) {
      const applicationServerKey = urlB64ToUint8Array('<your public key from above>')
      return await serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })
    }

3. Send push subscription to your server

This part you will have to implement by yourself

    async function userSubscribed(subscription) {
      // for example like this
      const serverAnswer = fetch('POST', {
        url: '<my server url>',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(subscription)
      })
      // do something with answer and return
      handleAnswer(serverAnswer)
    }

After this, you are basically set up in client side.

### Send the actual notification

Example in node.js

https://github.com/web-push-libs/web-push#sendnotificationpushsubscription-payload-options

##  Sync with backend periodically to be sure we are up to date


If you used https://web-push-codelab.glitch.me/ to create app keys, you can also use it to send messages.  In that case you need to print out the subscription in the application instead:

    async function userSubscribed(subscription) {
      console.log("here be push subscription", JSON.stringify(subscription))
    }

## Receiving push messages

All code related to handling push messages should go to your service worker `sw.js`

### Listening for push messages

Once we have asked for permissions and sent push subscription to server, we start receiving push messages.  We don't need to know anything about subscriptions or push managers here:

    self.addEventListener('push', event => {
      if (event.data) {
        console.log('This push event has data: ', event.data.text())
      } else {
        console.log('This push event has no data.')
      }
    })

Things to do with event:

    // Returns string
    event.data.text()

    // Parses data as JSON string and returns an Object
    event.data.json()

    // Returns blob of data
    event.data.blob()

    // Returns an arrayBuffer
    event.data.arrayBuffer()

### Display notification

Actually receiving push messages is not per se so useful without being able to interact with user, so let's show a notification instead:

    self.addEventListener('push', (event) =>
      // same as service workers last time.
      // we need to keep the service worker alive until notification is shown,
      // therefore use waitUntil and connect it to the promise returned from
      // show notification
      event.waitUntil(self.registration.showNotification('Code from the woods!'))
    )

### What next

Look at some samples on what to do with events:

https://web-push-book.gauntface.com/chapter-05/04-common-notification-patterns/#message-page-from-a-push-event

Actions and tags are explained here:

https://developers.google.com/web/fundamentals/push-notifications/notification-behaviour