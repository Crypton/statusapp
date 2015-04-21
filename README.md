statusapp
=========

A status application for groups to keep each other in the loop

Mobile Notes:
-------------
Cordova plugins needed:

com.phonegap.plugins.barcodescanner
org.apache.cordova.geolocation
com.telerik.plugins.wkwebview
nl.x-services.plugins.socialsharing
org.apache.cordova.statusbar
org.apache.cordova.camera
org.devgeeks.privacyscreen

Extra NPM packages needed:
--------------------------
npm install -g cordova-icon
npm install -g cordova-splash  

Before building you need to run:

$ > cordova-icon

and

$ > cordova-splash  

Rebuild on iOS
--------------

 - Clear the cached version of the platform:
rm -rf ~/.cordova/lib/ios/cordova/4.0.x

- Remove the iOS platform from the project:
cordova platform remove ios

- Remove the wkwebview engine plugin (might not need to do all three, but better safe):
cordova plugin remove cordova-labs-wkwebviewengine
cordova plugin remove cordova-labs-local-webserver
cordova plugin remove cordova-plugin-file

- Add the updated iOS@4.0.x platform:
cordova platform add ios@4.0.x --usegit

cordova plugin add https://github.com/apache/cordova-plugins.git#master:wkwebview-engine

- Edit ./config.xml and set a hardcoded port for the local web server (instead of 0):
<content src="http://localhost:123456" />

- Add icons and splash screens (you might not need this if it’s in a hook):
cordova-icon && cordova-splash

- Rebuild iOS:
cordova build ios

Open in Xcode and tidy it up:
open -a Xcode platforms/ios

(by tidy up, I mean things like setting the signing stuff to the distribution cert, setting the Deployment Target to 8.0, etc)


