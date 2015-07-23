.PHONY: cordova_plugins npm_packages

update_plugins:
	cd mobileapp && \
	cordova plugin rm \
    com.phonegap.plugins.barcodescanner \
    org.apache.cordova.geolocation \
	org.apache.cordova.statusbar \
	org.apache.cordova.camera \
	org.apache.cordova.inappbrowser \
	org.apache.cordova.device

cordova_plugins: #current as of 22 July, 2015
	cd mobileapp && \
	cordova plugin add \
	phonegap-plugin-barcodescanner \
	cordova-plugin-geolocation \
	com.telerik.plugins.wkwebview \
	nl.x-services.plugins.socialsharing \
	cordova-plugin-statusbar \
	cordova-plugin-camera \
	org.devgeeks.privacyscreen \
	cordova-plugin-inappbrowser \
	cordova-plugin-device \
	com.crypho.plugins.securestorage

cordova_android_plugins:
	cd mobileapp && \
	cordova plugin add net.yoik.cordova.plugins.screenorientation.wkwebview

npm_packages:
	npm install -g cordova-icon cordova-splash

setup_base: cordova_plugins npm_packages

setup_all: cordova_plugins cordova_android_plugins npm_packages
