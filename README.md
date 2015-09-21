StatusApp
=========
A social media network you own, using contact cards to help users find, verify and follow each other. Statusapp is zero-knowledge, which means the server never knows what's being sent to it. Statusapp is built with [Crypton](https://crypton.io).

Why?
-------------
StatusApp is proof that zero-knowledge social media is feasible, and designed to be a simple example of Crypton in action. We've minimised our dependencies to try to make it as accessible as possible. StatusApp uses Cordova and the almost-ubiquitious jQuery for its interface, with the Crypton JS library handling the crypto.

Getting started.
-------------
You'll need a few things to get going:  
1. Download [Xcode](https://developer.apple.com/) or Command Line Tools, and install.  
2. Install Node.js, either through the [official install packages](https://nodejs.com), or via a package installer (eg [Homebrew](https://brew.sh)),  
3. Once #1 and #2 are installed, get [Cordova](~cordova link~) set up by opening your terminal and typing `npm install -g cordova`.  
4. Install the rest of the node dependencies: `npm install -g cordova-icon cordova-splash ios-sim`.  
5. Clone (or fork) this repo, `cd` into `statusapp/mobileapp` You'll need to install plugins before you start.  

Plugin list.
-------------
* com.phonegap.plugins.barcodescanner
* org.apache.cordova.geolocation
* com.telerik.plugins.wkwebview
* nl.x-services.plugins.socialsharing
* org.apache.cordova.statusbar
* org.apache.cordova.camera
* org.devgeeks.privacyscreen
* org.apache.cordova.inappbrowser
* org.apache.cordova.device
* com.crypho.plugins.securestorage
* nl.x-services.plugins.actionsheet
* org.apache.cordova.statusbar
* (Android Only) net.yoik.cordova.plugins.screenorientation.wkwebview

Building and running.
-------------
To get StatusApp running:

1. Add a platform to your build – `cordova platform add ios` or `cordova platform add android`.
2. Run `cordova prepare`
3. Run StatusApp with `cordova run --[emulator/device] [ios/android]`.  
4. If you want to deploy on device, take a look at the [Cordova documentation](https://cordova.apache.org/docs/en/5.1.1/).

If you want to build icons and splash screens, use `cordova-icon` and `cordova-splash` commands before you run statusapp.  

Contact cards
-------------
To complete.


Under the hood.
-------------
ddahl to complete.

Credits
-------------
StatusApp is built by @daviddahl, @helveticade, @BennyOak, @devgeeks and others

