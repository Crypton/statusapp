/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Base application object

document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  $('.header-wrap').hide();

  window.open = cordova.InAppBrowser.open;

  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
  // cordova.plugins.Keyboard.disableScroll(true);

  $(function () {
    FastClick.attach(document.body);
  });

  //Check for touchID localstorage
  if(!window.localStorage.touchIdLoginEnabled) {
     window.localStorage.setItem('touchIdLoginEnabled', 0);
  }

  // Now safe to use device APIs
  app.init();

  document.addEventListener('resume', function() {
    setTimeout(function () {
      console.log('Application Resume Event!');
      if (app.resumeEventHandler &&
	  (typeof app.resumeEventHandler == 'function')) {
	app.resumeEventHandler();
      }

    }, 0);
  }, false);

  document.addEventListener('pause', function() {
    console.log('Application Pause Event!');
    if (app.resumeEventHandler &&
	(typeof app.pauseEventHandler == 'function')) {
      app.pauseEventHandler();
      console.log('app pausing');
    }
  }, false);

  try {
    // XXX: need to learn how to #IFDEF
    screen.lockOrientation('portrait');
  } catch (ex) {
    console.log('Lock orientation not supported');
  }
  cordova.plugins.Keyboard.disableScroll(true);
}

var app = {
  // Application Constructor
  init: function init() {
    console.log('app initializing!: ', arguments);

    $('#my-feed-entries').children().remove();

    // Check explicitly for 1
    if (window.localStorage.touchIdLoginEnabled == 1){
      touchid.authenticate(function () { app.login(); },
			   function (err) { alert(err); },
			   "Login to Kloak!");
    }

    // Configure the endpoint:
    crypton.host = app.host;
    crypton.port = app.port || 1025;

    this.card =  new crypton.Card();
    this.bindEvents();
    $('#password-login').show();
    $('#username-login').show();

    function defaultLoginBehavior () {
      app.enableLoginButtons();
      app.switchView('account-login');
      $('#username-login').focus();
    }

    // Check if any user has ever logged in before:
    var lastUser = window.localStorage.getItem('lastUserLogin');
    if (lastUser && app.keyChain.supported) {
      $('#username-login').val(lastUser);
      // initialize keychain
      app.keyChain.init(lastUser, function _keychain_initCB (err) {
	if (err) {
	  console.error(err);
	  return defaultLoginBehavior();
	}
	app.keyChain.getPassphrase(function (err, passphrase) {
	  if (err) {
	    console.error(err);
	    // just display the normal login password. something is wrong...
	    return defaultLoginBehavior();
	  } else {
            app.passphraseInKeychain = true;
	  }
	  // we have a passphrase!
	  $('#username-login').hide();
	  $('#username-placeholder').html(lastUser).show();

	  // XXX: hide the login passphrase field, etc
	  $('#password-login').hide();
	  $('#password-login').val(passphrase);

	  app.enableLoginButtons();
	  app.switchView('account-login');
	  $('#login-btn').focus();
	});
      });
    } else if (lastUser && !app.keyChain.supported){
      // check if keychain is supported
      defaultLoginBehavior();
    } else if (!lastUser) {
      app.onboarding.begin();
    }
    // Offline
    window.Offline.options = {
      // Should we check the connection status immediatly on page load.
      checkOnLoad: false,

      // Should we monitor AJAX requests to help decide if we have a connection.
      interceptRequests: true,

      // Should we automatically retest periodically when the connection is
      // down (set to false to disable).
      reconnect: {
        // How many seconds should we wait before rechecking.
        initialDelay: 3
      },

      // Should we store and attempt to remake requests which fail while the
      // connection is down.
      requests: true,

      // Should we show a snake game while the connection is down to keep
      // the user entertained?
      // It's not included in the normal build, you should bring in
      // js/snake.js in addition to offline.min.js.
      game: false,

      // What the xhr checks
      checks: {
        xhr: {
          url: ("https://" +
                window.crypton.host +
                (window.crypton.port ? (":" + window.crypton.port) : "") +
                "/")
        }
      }
    };

  },

  getItem: function getItem (itemName) {
    if (app.session.items[itemName]) {
      return app.session.items[itemName].value;
    }
    return null;
  },

  getAvatarHmac: function getAvatarHmac (username) {
    var avatarHmacs = app.getItem('avatarHmacs');
    if (avatarHmacs) {
      return avatarHmacs[username].avatarHmac;
    }
    return null;
  },

  APPNAME: 'Kloak',

  get contactCardLabel() { return app.APPNAME + ' contact card'; },

  URL: 'https://spideroak.com/solutions/kloak',

  get isNodeWebKit() { return (typeof process == "object"); },

  get username() { return app.session.account.username; },

  get fingerprint() { return app.session.account.fingerprint; },

  progressIndicator:  {

    get indicator() {
      if (device.platform === 'iOS') {
      	return {
      	  show: function show (message) {
      	    ProgressIndicator.showSimpleWithLabel(true, message);
      	  },
      	  hide: function hide () {
      	    ProgressIndicator.hide();
      	  }
      	};
      } else {
	return {
	  show: function show (message) {
	    app.showProgress(message);
	  },

	  hide: function hide () {
	    app.hideProgress();
	  }
	};
      }
    },
    
    active: false,
    
    show: function show (message) {
      if (this.active) {
	return;
      }
      this.active = true;
      this.indicator.show(message);
    },

    hide: function hide () {
      if (!this.active) {
	return;
      }
      this.active = false;
      this.indicator.hide();
    }
  },
  
  // Bind Event Listeners
  bindEvents: function bindEvents() {
    // jQuery.easing.def = "easeOutSine";

    // onboarding events!!!
    app.onboarding.bindEvents();

    $('.view').click(function () {
      app.hideMenu();
    });

    $('#scan').click(function () {
      app.scanQRCode();
    });

    $('#get-image').click(function () {
      app.getImage();
    });

    $('#get-image-desktop').click(function () {
      app.getImage();
    });

    $('#logout').click(function () {
      app.logout();
    });

    $('#about').click(function () {
      app.about();
    });

    $('#feedback').click(function () {
      var url = 'https://spideroak.com/solutions/kloak/feedback';
      var args = '?f_kloak_username=' + app.username;
      var fullUrl = url + args;
      window.open(fullUrl, '_system');
    });

    $("#register-btn").click(function (e) {
      e.preventDefault();
      app.onboarding.begin();
    });

    $("#register-generate-cancel-btn").click(function (e) {
      e.preventDefault();
      app.switchView('account-login', app.APPNAME);
    });

    $("#register-generate-btn").click(function (e) {
      e.preventDefault();
      app.createAccount();
    });

    $('#password-login').keyup(function (event) {
      if ((event.keyCode == 13) && $('#password-login').val()) {
	event.preventDefault();
	app.login();
      }
    });

    $('#password-generate').click(function (e) {
      //e.scrollIntoView({block: "end", behavior: "smooth"});
    });

    $('#clear-new-change-passphrase').click(function () {
      $('#change-passphrase-input').val('');
      $('#change-passphrase-input').focus();
    });

    $('#new-passphrase-cancel').click(function (e) {
      app.switchView('my-options-pane');
    });
    
    $('#regenerate-new-change-passphrase').click(function () {
      var pass = generatePassphrase();
      $('#change-passphrase-input').val(pass);
    });
    
    $('#change-passphrase-continue').click(function (e) {
      app.updatePassphrase();
    });

    $('#change-passphrase').click(function (e) {
      app.updatePassphraseUI();
    });
    
    $('#get-new-passphrase').click(function (e) {
      e.preventDefault();
      var pass = generatePassphrase();
      $('#password-generate').val(pass);
    });

    $("#login-btn").click(function () {
      app.login();
    });

    $("#login-form").submit(function (e) {
      e.preventDefault();
      app.login();
    });

    $("#use-touchid").click(function (e) {
      if (window.localStorage.touchIdLoginEnabled == 0) {
        window.localStorage.setItem('touchIdLoginEnabled', 1);
        $('#use-touchid').html("Turn Off TouchID");
        app.alert("TouchID Activated");
      } else {
        window.localStorage.setItem('touchIdLoginEnabled', 0);
        $('#use-touchid').html("Turn On TouchID");
        app.alert("TouchID De-Activated");
      }
    });

    $('#forget-credentials').click(function (e) {
      app.options.forgetCredentialsSheet(e);
    });

    $('#display-passphrase').click(function (e) {
      // check if we have the passphrase!
      app.keyChain.getPassphrase(function (err, passphrase) {
	if (err) {
	  console.error(err);
	  return app.alert('Cannot get passphrase from keychain', 'danger');
	}
	app.displayPassphrase(passphrase);
      });
    });

    $('.icon--contacts').click(function () {
      app.displayContacts();
    });

    $('.icon--contact-card').click(function () {
      app.switchView('my-fingerprint-id-wrapper', 'My Contact Card');
    });

    $('#header-contacts .header-back').click(function () {
      if ($('#contacts-list-wrapper').is(':visible')) {
	app.switchView('feed', 'Contacts');
      } else {
	app.switchView('contacts', 'Contacts');
      }
    });

    $('#header-contacts #header--title').click(function () {
      app.switchView('contacts', 'Contacts');
    });

    $('#header-settings .header-back').click(function () {
      app.switchView('feed', 'Timeline');
    });

    $('.icon--new-contact').click(function () {
      app.switchView('scan-select', null);
    });

    $('#header-btn-contacts').click(function () {
      app.displayContacts();
    });

    $('#verify-id-card').click(function () {
      app.hideMenu();
      if (app.isNodeWebKit) {
        app.switchView('scan-select-desktop', 'Verify Contact Card');
      } else {
        app.switchView('scan-select', 'Verify Contact Card');
      }
    });

    $('#my-fingerprint').click(function () {
      app.hideMenu();
      app.switchView('my-fingerprint-id-wrapper', 'My Contact Card');
      app.displayMyFingerprint(true);
    });

    $('#my-fingerprint-top-menu').click(function () {
      app.hideMenu();
      app.switchView('my-fingerprint-id-wrapper', 'My Contact Card');
      app.displayMyFingerprint(true);
    });

    $('#share-my-id-card').click(function () {
      var idCard = $('.current-contact-card-canvas')[0];
      if (app.isNodeWebKit) {
        app.saveIdToDesktop_desktop(idCard);
      } else {
	var _base64Img = idCard.toDataURL("image/png");
        window.plugins.socialsharing.share(app.sharingMessage, app.sharingTitle, _base64Img, app.sharingUrl);
      }
    });

    $('#retake-id-picture').click(function () {
      // app.newPhotoContactCardSheet();
      app.contactCard.newPhotoContactCardSheet();
    });

    $('#update-bio').click(function () {
      app.contactCard.captureBio(function captureBioCB () {
	app.contactCard.displayCard('my-fingerprint-id');
      });
    });

    $('.icon--settings').click(function () {
      if (!touchid || device.platform !== 'iOS') {
	// hide touchid UI
	$('#touchid-wrapper').hide();
	app.switchView('my-options-pane', 'Options');
	return;
      }
      
      // disable forget credentials if not supported
      if (!app.keyChain.supported) {
	$('#forget-credentials')[0].disabled = true;
	$('#display-passphrase')[0].disabled = true;
      }

      if (app.keyChain.supported) {
	if(!app.keyChain.prefix) {
	  app.keyChain.init(app.username, function keychainCB (err) {
	    var keyChainInit = true;
	    if (err) {
	      console.error(err);
	      keyChainInit = false;
	    }
	    // ok, we have initialized the keychain
	    // Hide touchID button if touchID not supported
	    // or no passphrase stored.
	    touchid.checkSupport(
              function() {
		if (!keyChainInit) {
		  console.error('Passphrase NOT Stored');
		  window.localStorage.setItem("touchIdLoginEnabled", '0');
		} else {
		  window.localStorage.setItem("touchIdLoginEnabled", '1');
		}
		// Set touchID message
		if (window.localStorage.touchIdLoginEnabled == 0) {
		  $('#use-touchid').html("Turn On TouchID");
		} else {
		  $('#use-touchid').html("Turn Off TouchID");
		}
		$('#touchid-wrapper').show();
		app.switchView('my-options-pane', 'Options');
		return;
              },
              function() {
		console.error("TouchID NOT Supported");
		window.localStorage.setItem("touchIdLoginEnabled", '0');
		$('#touchid-wrapper').hide();
		app.switchView('my-options-pane', 'Options');
		return;
              });
	  });
	} else {
	  // we have a prefix
	  // Check touchid support here
	  touchid.checkSupport(
            function() {
	      // assume passphrase is stored here
	      window.localStorage.setItem("touchIdLoginEnabled", '1');
	      // Set touchID message
	      $('#use-touchid').html("Turn Off TouchID");
	      $('#touchid-wrapper').show();
	      app.switchView('my-options-pane', 'Options');
	      return;
            },
            function() {
	      console.error("TouchID NOT Supported");
	      window.localStorage.setItem("touchIdLoginEnabled", '0');
	      $('#touchid-wrapper').hide();
	      app.switchView('my-options-pane', 'Options');
	      return;
            });
	}
      } else {
	// touchid not supported if keychain is not supported
	$('#touchid-wrapper').hide();
	app.switchView('my-options-pane', 'Options');
	return;
      }
    });

    $('#find-users').click(function () {
      app.switchView('find-users-view', 'Find Users');
    });

    $('#find-someone-btn').click(function () {
      app.findSomeone();
      $('#find-someone').focus();
    });

    $('#tasks-btn').click(function (){
      app.toggleMenu();
    });

    $('#switch-user-btn').click(function (){
      app.switchUser();
    });

    $('.icon--new-contact').click(function () {
      if (app.isNodeWebKit) {
        app.switchView('scan-select-desktop', 'Verify Contact Card');
      } else {
        app.switchView('scan-select', 'Verify Contact Card');
      }
    });

    $('#contacts-detail-dismiss-btn').click(function () {
      $('.contact-id').remove();
      app.switchView('contacts', 'Contacts');
    });

    $('#contact-delete-btn').click(function () {
      $('#contact-details-buttons').hide();
      $('#confirm-delete-contact-wrapper').show();
    });

    $('#contacts-detail-cancel-delete-btn').click(function () {
      $('#confirm-delete-contact-wrapper').hide();
      $('#contact-details-buttons').show();
    });

    $('#contact-yes-delete-btn').click(function () {
      $('#confirm-delete-contact-wrapper').hide();
      app.showProgress('Deleting contact...');
      // unshare status feed
      var username = app.currentContact;
      if (!username) {
	console.error('Cannot delete and unshare without a username!');
	$('#contact-details-buttons').show();
	app.hideProgress();
	return;
      }
      app.session.getPeer(username, function (err, peer) {
	if (err) {
	  console.error('Cannot get user data from server');
	  $('#contact-details-buttons').show();
	  app.hideProgress();
	  return;
	}
	// XXXddahl: Move this into a 'cleanUpDeleteUser' function in subclass
	app.session.items.status.unshare(peer, function (err) {
	  if (err) {
	    console.error('Cannot unshare status from ' + peer.username);
	    $('#contact-details-buttons').show();
	    app.hideProgress();
	    return;
	    // XXX: also need to unshare avatar!!!
	  }
	  // delete user from trusted contacts
	  delete app.session.items._trusted_peers.value[peer.username];
	  app.session.items._trusted_peers.save(function (err) {
	    if (err) {
	      console.error('Cannot delete ' + peer.username + ' from contacts');
	      $('#contact-details-buttons').show();
	      app.hideProgress();
	      return;
	    }
	    // XXXddahl: send a message to the deleted peer
	    //           in order to have them remove you as well?

	    // back to contacts screen
	    app.alert('Contact ' + peer.username + ' deleted', 'info');
	    app.displayContacts();
	    $('#contact-details-buttons').show();
	    app.hideProgress();
	  });
	});
      });
    });

    if (app.setCustomEvents && typeof app.setCustomEvents == 'function') {
      app.setCustomEvents();
    }

    $('#create-id-card').click(function () {
      // app.firstRunCreateIdCard( function () {
      //  $('#tasks-btn').addClass('active');
      app.switchView('my-fingerprint-id-wrapper', 'My Contact Card');
	// need to set this here in order to call the firstRunComplete function properly
      app.firstRunIsNow = false;
      app.firstRunComplete();
      app.newPhotoContactCardSheet();
    });
    // });
  },

  switchView: function switchView (id, name) {
    $('.view').removeClass('active');
    $('body').removeClass();
    $('body').addClass(id);

    try {
      app.viewActions[id]();
    } catch (ex) {
      console.error(ex);
      console.error(ex.stack);
      console.warn('No defined action in app.viewActions object that handles ' + id + ' or exception inside handler');
    }
    var htmlId = '#' + id;

    if (!$(htmlId).is(':visible')) {
      $(htmlId).show();
    }

    $(htmlId).addClass('active');
    if (htmlId == '#login-progress') { // XXXddahl: special case hack. sigh.
      $('#login-progress').show();
    } else {
      $('#login-progress').hide();
    }

    if (htmlId == "#feed") {
      $('#post-button-floating-wrapper').show('slow');
    } else {
      $('#post-button-floating-wrapper').hide('slow');
    }
  },

  // // Update DOM on a Received Event
  // receivedEvent: function(id) {
  //   if (!id) {
  //     console.error("No id provided to receivedEvent");
  //     return;
  //   }
  //   var parentElement = document.getElementById(id);
  //   if (!parentElement) {
  //     console.error('Element with id: ' + id + ' does not exist.');
  //     return;
  //   }
  //   var listeningElement = parentElement.querySelector('.listening');
  //   var receivedElement = parentElement.querySelector('.received');

  //   listeningElement.setAttribute('style', 'display:none;');
  //   receivedElement.setAttribute('style', 'display:block;');

  //   console.log('Received Event: ' + id);
  // },

  alert: function _alert (message, level) {
    // success, info, warning, danger
    if (!level) {
      level = 'warning';
    }
    var html = '<div class="alert alert-' + level + '" role="alert">'
                                                  + message
                                                  + '</div>';
    var node = $(html);
    if (!$('.overlay').is(':visible')) {
      $('.overlay').show();
    }
    $('#alerts').prepend(node);
    window.setTimeout(function () {
      node.slideUp(100, function () {
        node.remove();
	$('.overlay').hide();
      });
    }, 3500);
  },

  displayPassphrase: function displayPassphrase (passphrase) {
    var html = '<textarea class="passphrase-text">' +
	  passphrase + 
	  '</textarea>' + 
          '<button class="btn close-display-passphrase">Close</button>';
    $('#display-passphrase-output').children().remove();

    if (!$('.overlay').is(':visible')) {
      $('.overlay').show();
    }

    $('#display-passphrase-output').addClass('active');
    
    $('#display-passphrase-output').append($(html));
    
    $('.close-display-passphrase').click(function (e) {
      $('#display-passphrase-output').removeClass('active');
      $('.overlay').hide();
      $('#display-passphrase-output').children().remove();
    });
  },
  
  logout: function logout () {
    app.session = null;
    $('#header-button-bar').hide();
    $('#logout-page-title').show();
    // cleanup function:
    if (typeof app.logoutCleanup == 'function') {
      app.logoutCleanup();
    }

    var lastUser = window.localStorage.getItem('lastUserLogin');
    if (lastUser) {
      $('#username-placeholder').html(lastUser);
      if (app.keyChain.prefix) {
	app.keyChain.getPassphrase(function (err, passphrase) {
	  if (err) {
	    console.error(err);
	    // just display the normal login password. something is wrong...
	    $('#password-login').show();
	    $('#username-login').show();
	    $('#username-placeholder').html('').hide();
	    return;
	  }
	  // we have a passphrase!
	  $('#username-login').hide();
	  $('#username-placeholder').html(lastUser).show();
	  // XXX: hide the login passphrase field
	  $('#password-login').hide();
	  $('#password-login').val(passphrase);
	  app.enableLoginButtons();
	  $('#login-btn').focus();
	});
      }
    }

    app.hideMenu();
    app.switchView('account-login', app.APPNAME);
    $('#tasks-btn').removeClass('active');
    $('#header-button-bar').hide();
    app.alert('You are logged out', 'info');
    $('#password-login').focus();
  },

  switchUser: function switchUser() {
    $('#username-login').show().val('');
    $('#username-placeholder').html('').hide();
    $('#password-login').show().val('');
  },

  scanQRCode_desktop: function scanQRCode_desktop () {
    // Use GUMHelper here instead
    console.error('Scan QR NOT IMPLEMENTED');
  },

  scanQRCode: function () {
    if (app.isNodeWebKit) {
      return app.scanQRCode_desktop();
    }
    try {
      cordova.plugins.barcodeScanner.scan(
	function (result) {
          var userObj = JSON.parse(result.text);
          app.verifyUser(userObj.u, userObj.f);
	},
	function (error) {
          app.alert("QR Scanning failed: " + error, 'danger');
	}
      );
    } catch (ex) {
      // Sometimes this throws! Usually because the scanned data is blurry or cannot be read, etc
      console.error(ex);
      console.error(ex.stack);
      app.alert("QR Scanning failed, try again - very slowly and very steady", 'danger');
    }
  },

  avatarStream: null,

  getPhoto_desktop: function getPhoto_desktop (options, callback) {
    // console.error('Get Photo desktop NOT IMPLEMENTED');
    // getUserMedia
    var width = 200, height = 200, quality = 50;
    if (options) {
      width = options.width || 200;
      height = options.height || 200;
      quality = options.quality || 50;
    }

    app.switchView('capture-avatar', 'Take a photo');
    navigator.webkitGetUserMedia({video: true}, function _success (stream) {
      var video = document.getElementById("capture-video");
      var canvas = document.getElementById("capture-canvas");
      var button = document.getElementById("capture-picture");

      app.avatarStream = stream;

      video.src = URL.createObjectURL(stream);
      button.disabled = false;
      button.onclick = function() {
        canvas.getContext("2d").drawImage(video, 0, 0, 200, 200, 0, 0, 200, 200);
        var img = canvas.toDataURL("image/png");
        // console.log(img);
        // pass off the image data to callback
        callback(null, img);
      };
    }, function _error (err) { alert("GUM: there was an error " + err);});
  },

  captureAvatar_desktop: function captureAvatar_desktop () {
    console.log("captureAvatar_desktop()");
    app.getPhoto_desktop({}, function callback (err, imageData) {
      if (err) {
        return app.alert(err, 'danger');
      }
      app.avatarStream.stop();
      document.getElementById("capture-video").src = null;
      app.switchView('feed', 'ZK Feed');
      // Save Avatar to Item via overloaded function
      app.saveAvatar(imageData);

    });
  },

  saveAvatar: function _saveAvatar (imageData) {
    app.session.items.avatar.value.avatar = imageData;
    app.session.items.avatar.value.updated =  Date.now();
    app.session.items.avatar.save( function (err) {
      if (err) {
        return app.alert(err, 'danger');
      }
      console.log('avatar saved');
    });
  },

  getPhoto: function (options, callback) {
    if (app.isNodeWebKit) {
      return app.getPhoto_desktop(options, callback);
    }

    var cameraDirectionOptions = { FRONT: 1, BACK: 0 };

    var width = 120;
    var height = 120;
    var quality = 75;
    var cameraDirection = cameraDirectionOptions.BACK;
    var pictureSourceType = navigator.camera.PictureSourceType.CAMERA;
    var allowEdit = true;
    // navigator.camera.PictureSourceType.SAVEDPHOTOALBUM
    if (options) {
      width = options.width || 320;
      height = options.height || 240;
      quality = options.quality || 70;
      cameraDirection = options.cameraDirection || cameraDirectionOptions.BACK;
      pictureSourceType = options.pictureSourceType || navigator.camera.PictureSourceType.CAMERA;
      allowEdit = options.allowEdit || allowEdit;
    }

    // via the CAMERA
    function onSuccess (imageURI) {
      var img = "data:image/jpeg;base64," + imageURI;
      callback(null, img);
    }

    function onFail (message) {
      console.warn('getPhoto onFail:');
      console.warn(message);
      callback(message);
    }

    // Specify the source to get the photos.
    navigator.camera.getPicture(onSuccess, onFail,
                                { quality: quality,
                                  allowEdit: allowEdit,
                                  destinationType:
                                    Camera.DestinationType.DATA_URL,
                                  sourceType: pictureSourceType,
                                  targetWidth: width,
                                  targetHeight: height,
                                  cameraDirection: cameraDirection
                                });

  },

  getImage_desktop: function getImage_desktop () {
    function chooseFile(name) {
      var chooser = document.querySelector(name);
      chooser.addEventListener('change', function (evt) {
        console.log(this.files);
        console.log(this.value);
        // get image data
        app.getImageDataFromFile(this.files[0], function (err, dataURI) {
          qrcode.callback = function (data) {
            // error?
            console.log('qrCodecallback() error??');
            console.log(data);
            if (data.indexOf('error') != -1) {
              app.alert('Cannot decode QR code! May be corrupted.', 'danger');
              return;
            }
            var userObj = JSON.parse(data);
            app.verifyUser(userObj.u, userObj.f);
          };

          try {
            qrcode.decode(dataURI);
          } catch (e) {
            app.alert('Cannot decode QR code', 'danger');
            console.error(e);
          }
        });

      }, false);
      chooser.click();
    }
    chooseFile('#id-file-dialog');
  },

  idCardHeight: 420,
  idCardWidth: 420,

  getImageDataFromFile: function getImageDataFromFile (file, callback) {
    // For Desktop
    var image = document.createElement("img");
    image.src = window.URL.createObjectURL(file);
    image.height = app.idCardHeight;
    image.height = app.idCardWidth;
    var canvas = document.createElement("canvas");
    var canvasContext = canvas.getContext("2d");

    image.onload = function () {
      window.URL.revokeObjectURL(this.src);
      //Set canvas size is same as the picture
      canvas.width = image.width;
      canvas.height = image.height;
      // draw image into canvas element
      canvasContext.drawImage(image, 0, 0, image.width, image.height);
      // get canvas contents as a data URL (returns png format by default)
      var dataURL = canvas.toDataURL();
      callback(null, dataURL);
    };
  },

  getInitialAvatar: function getInitialAvatar (dataUrl) {
    // 85, 325
    // create canvas
    var c = document.createElement('canvas');
    // draw image data to canvas
    var ctx = c.getContext('2d');
    var img = new Image();
    img.onload = function(){
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;

    // XXX TODO: use smartcrop.crop()

    // get the photo from X=85, Y=325, W=120, H=160
  },

  getImage: function () {
    // Specific getImage function for QR parsing
    if (app.isNodeWebKit) {
      return app.getImage_desktop();
    }

    function onSuccess (dataURL) {

      // TODO: create a canvas from the png data
      //       extract the image from the ID card
      //       Trim all of the white border?
      //       Save this data as the avatar!
      // app.getInitialAvatar(dataUrl);

      var dataUrlPrefix = 'data:image/png;base64,';
      dataURL = dataUrlPrefix + dataURL;
      console.log(dataURL);
      qrcode.callback = function (data) {
        var userObj = JSON.parse(data);
        app.verifyUser(userObj.u, userObj.f);
      };

      try {
        qrcode.decode(dataURL);
      } catch (e) {
        app.alert('Cannot decode QR code', 'danger');
        console.error(e);
      }
    }

    function onFail (message) {
      app.alert('An error occured: ' + message, 'danger');
    }

    //Specify the source to get the photos.
    navigator.camera.getPicture(onSuccess, onFail,
                                { quality: 50,
                                  destinationType:
                                  Camera.DestinationType.DATA_URL,
                                  sourceType:
                                  navigator.camera.PictureSourceType.SAVEDPHOTOALBUM
                                });
  },

  createAccount: function () {
    var user = $('#username-generate').val();
    var pass = $('#password-generate').val();
    $('#top-progress-wrapper').show();

    if (!user || !pass) {
      app.alert('Please enter a username and passphrase', 'danger');
      $('#top-progress-wrapper').hide();
      return;
    }

    app.switchView('login-progress', '');
    app.setProgressStatus('Creating Account...');

    function callback (err) {
      console.error(err);
      app.switchView('account-login', '');
      app.clearLoginStatus();

      if (err) {
        app.alert(err, 'danger');
	$('#top-progress-wrapper').hide();
        return;
      }
      // set the passphrase into the keychain:
      app.keyChain.init(user, function (err) {
	if (err) {
	  console.error(err, 'Cannot init keychain!');
	  return;
	}
	app.keyChain.setPassphrase(pass, function _keychainSetPassphraseCB(err) {
	  if (err) {
	    console.error(err);
	  }
	});
      });
    }

    app.register(user, pass, callback);
  },

  beginRegistration: function beginRegistration() {

    app.switchView('generate-account', 'Create Account');
    // generate a long password
    var passphrase = generatePassphrase();
    // display new form
    if (window.localStorage.lastUserLogin == $('#username-generate').val()) {
      $('#username-generate').val('');
    }
    $('#password-generate').val(passphrase);
    $('#username-generate').focus();
  },

  register: function (user, pass, callback) {
    app.setProgressStatus('Generating account...');
    app.switchView('login-progress', '');

    crypton.generateAccount(user, pass, function (err) {
      if (err) {
	$('#top-progress-wrapper').hide();
	console.error(err);
        app.switchView('account-login', 'Account');
        return callback(err);
      }
      $('#top-progress-wrapper').hide();
      app.login();
    });
  },

  login: function _login () {

    var user = $('#username-login').val();
    var pass = $('#password-login').val();

    if (!user || !pass) {
      user = $('#username-generate').val();
      pass = $('#password-generate').val();
    }

    if (!user || !pass) {
      app.alert('Please enter a username and passphrase', 'warning');
      return;
    }

    app.showProgress('Logging In...');
    $('.alert').remove();

    function callback (err, session) {
      if (err) {
        app.alert(err, 'danger');
        app.switchView('account-login', 'Account');
        app.clearLoginStatus();
	$('#top-menu').show();
	app.hideProgress();
        $('#password-login').val('');
        return;
      }

      window.localStorage.setItem('lastUserLogin', user);

      // Save passphrase if the keychain is supported
      if (app.keyChain.supported) {
	app.keyChain.init(user, function (err) {
	  if (err) {
	    return console.error(err);
	  }
	  app.keyChain.setPassphrase(pass, function (err) {
	    if (err) {
	      return console.error(err);
	    }
	    return console.log('success: passphrase remembered');
	  });
	});
      }
      app.username = user;
      app.session = session;
      app.showProgress('Loading Application Data');

      // Check for first run
      app.session.getOrCreateItem('_prefs_', function(err, prefsItem) {
        console.log('getting _prefs_');
        // app.customInitialization();

        if (err) {
          console.error(err);
          app.switchView('account-login', 'Account');
	  app.hideProgress();
          return;
        }

        app.username = app.session.account.username;

        if (!prefsItem.value.firstRun) {
          prefsItem.value = { firstRun: Date.now() };
          return;
        }

        $('#password-login').val('');
	$('#password-generate-login').val('');

	app.session.getOrCreateItem('avatar', function (err, avatarItem) {
	  if (err){
	    console.error(err);
	  }
	});

	app.session.getOrCreateItem('status', function (err, statusItem) {
	  if (err) {
	    console.error(err);
	  }
	  app.getAvatarHmacs();
	  app.hideProgress();
	  app.displayInitialView();
	});
      });
    }

    crypton.authorize(user, pass, function (err, session) {
      if (err) {
        return callback(err);
      }
      $('#header').show();
      return callback(null, session);
    });
  },

  firstRun: function () {
    // prompt to create Id card & why
    app.switchView('first-run', 'Welcome');
  },

  firstRunComplete: function firstRunComplete () {
    app.session.getOrCreateItem('_prefs_',
    function (err, prefsItem) {
      if (err) {
        console.error('Cannot load prefs, firstRunComplete failed');
        return;
      }

      if (!prefsItem.value['firstRun']) {
        prefsItem.value = { 'firstRun': Date.now() };
      }
      app.displayMyFingerprint(true);
      // Load and display all feed data:
      app.displayInitialView();
    });
  },

  toggleMenu: function () {
    var $menu = $('#top-menu');

    if ($menu.hasClass('active')) {
      $menu.removeClass('active');
    } else {
      $menu.addClass('active');
    }
  },

  revealMenu: function () {
    $('#top-menu').addClass('active');
  },

  hideMenu: function () {
    $('#top-menu').removeClass('active');
  },

  disableLoginButtons: function () {
    $('#login-buttons').hide();
  },

  enableLoginButtons: function () {
    $('#login-buttons').show();
  },

  setProgressStatus: function (m) {
    $("#progress-status").text(m);
  },

  clearLoginStatus: function (m) {
    $('#login-status .status').text('');
  },

  formatFingerprint: function (fingerprint) {
    return this.card.createFingerprintArr(fingerprint).join(" ");
  },

  logNewContact: function _logNewContact(username) {
    var html = '<li class="logged-new-contact">Contact "'
	  + username + '" added to contacts'
	  + '</li>';
    $('#contact-add-log').prepend($(html));
  },

  verifyUser: function (username, fingerprint) {
    if (username === app.username) {
      app.alert('Cannot verify your own account', 'danger');
      return;
    }

    if (!fingerprint) {
      var error = 'Contact data was not extracted, card cannot be verified';
      app.alert(error, 'danger');
      console.error(error);
      return;
    }

    var rawFingerprintArr = fingerprint.split(' ');
    var rawFingerprint = rawFingerprintArr.join('').toLowerCase();

    app.session.getPeer(username, function(err, peer) {
      if (err) {
        app.alert(err, 'danger');
        return;
      }

      function success () {
        peer.trust(function (err) {
          if (err) {
            console.error('peer trust failed: ' + err);
            app.alert(err, 'danger');
          } else {
            app.alert(username + ' is now a trusted contact', 'info');
	    app.logNewContact(peer.username);
            if (typeof app.postPeerTrustCallback == 'function') {
	      console.log('postPeerTrustCallback...');
              app.postPeerTrustCallback(peer);
            }
          }
        });
      }

      var outOfBandFingerprint = rawFingerprint;
      var outOfBandFingerprintArr =
        app.card.createFingerprintArr(outOfBandFingerprint);
      var peerFingerprintArr = app.card.createFingerprintArr(peer.fingerprint);

      if (crypton.constEqual(peer.fingerprint, outOfBandFingerprint)) {
	success();
      } else {
        // Failure to match fingerprints
	app.alert('Contact card cannot be verified with the server!', 'danger');
	console.warn(peer.fingerprint, outOfBandFingerprint);
      }
    });
  },

  findSomeone: function () {
    var username = $('#find-someone').val();
    if (!username) {
      var errtxt = "Please enter a username";
      console.error(errtxt);
      app.alert(errtxt, 'danger');
      $('#find-someone-btn').focus();
      return;
    }

    app.getPeer(username, function (err, peer) {
      if (err) {
        return app.alert(err, 'danger');
      }
      var fingerprint = peer.fingerprint;
      app.displayPeerFingerprint(peer.username, fingerprint);
    });
  },

  peers: {},

  getPeer: function (username, callback) {
    if (app.peers[username]) {
      return callback(null, app.peers[username]);
    }

    app.session.getPeer(username, function (err, peer) {
      if (err) {
        return callback(err);
      }

      app.peers[username] = peer;
      callback(null, peer);
    });
  },

  displayPeerFingerprint: function (username, fingerprint) {
    $('#peer-fingerprint-id').children().remove();
    app.switchView('peer-fingerprint-id', 'Peer Fingerprint');

    var label = app.APPNAME + '  *  ' + username + '  *';

    var canvas =
      app.card.createIdCard(fingerprint, username, label);
    $(canvas).css({ width: '290px'});
    $('#peer-fingerprint-id').append(canvas);
  },

  // XXXddahl: We need to cache the user's ID Card with photo for the session

  firstRunCreateIdCard: function firstRunCreateIdCard (callback) {
    // XXXddahl: this is a hack for now
    app.retakeIdPicture(true, callback);
  },

  retakeIdPicture: function retakeIdPicture (firstRun, callback) {
    // remove ID card
    $('#my-fingerprint-id').children().remove();
    // Re-create the ID card
    var label = app.APPNAME + '  *  ' + app.username + '  *';
    var canvas =
      app.card.createIdCard(app.fingerprint, app.username, label);
    app.addPhotoToIdCard(canvas, true, function (err, idCard) {
      if (err) {
        return app.alert(err, 'danger');
      }
      if (firstRun) {
	$('#header').show();
	$('#header-contacts').show();
	app.displayMyFingerprint(true);
      } else {
	app.displayIdCard(idCard, callback);
      }
    });
  },

  displayIdCard: function (idCard, callback) {
    $(idCard).css({ width: '290px' });
    $('#my-fingerprint-id').append(idCard);
    $('#header').show();
    $('#header-contacts').show();

    $('#share-my-id-card').click(function () {
      if (app.isNodeWebKit) {
        app.saveIdToDesktop_desktop(idCard);
      } else {
	var _base64Img = idCard.toDataURL("image/png");
        window.plugins.socialsharing.share(app.sharingMessage, app.sharingTitle, _base64Img, app.sharingUrl);
      }
    });

    $('#retake-id-picture').click(function () {
      // app.newPhotoContactCardSheet();
      app.contactCard.newPhotoContactCardSheet();
    });
    if (callback) {
      callback();
    }
    app.switchView('my-fingerprint-id-wrapper', 'My Contact Card');
  },

  displayMyFingerprint: function displayMyFingerprint (withPhoto) {

    $('#my-fingerprint-id').children().remove();
    var label = app.APPNAME + '  *  ' + app.username + '  *';
    var canvas =
      app.card.createIdCard(app.fingerprint, app.username, label);
    if (withPhoto) {
      // override = false here as sensible default?
      app.addPhotoToIdCard(canvas, false, function (err, idCard) {
        console.log('addPhotoToIdCard callback');
        console.log(idCard);
        if (err) {
          return app.alert(err, 'danger');
        }
        app.displayIdCard(idCard);
      });
    }
  },

  PHOTO_ITEM: 'avatar',

  pasteAvatar: function pasteAvatar(imageData, idCard, x, y, w, h) {
    var ctx = idCard.getContext('2d');
    var img = new Image();
    img.setAttribute('width', w || 120);
    img.setAttribute('height', h || 160);
    img.onload = function() {
      ctx.drawImage(img, x || 20, y || 305);
    };
    img.src = imageData;
    return idCard;
  },

  addPhotoToIdCard: function addPhotoToIdCard (idCard, override, callback) {
    // check for existing photo:
    app.session.getOrCreateItem(app.PHOTO_ITEM,
      function (err, avatarItem) {
        if (err) {
          return callback(err);
        }

        // paste photo into ID:
        function pastePhoto(imageData, idCard, x, y, w, h) {
          var ctx = idCard.getContext('2d');
	  var img = new Image();
	  img.setAttribute('width', w || 120);
	  img.setAttribute('height', h || 160);
	  img.onload = function() {
	    ctx.drawImage(img, x, y);
	  };
	  img.src = imageData;
          return idCard;
        }

        if (!override && avatarItem.value.avatar) {
          // XXXddahl: try ??
          var photoIdCard =
          pastePhoto(avatarItem.value.avatar, idCard, 20, 285, 192, 128);
          return callback(null, idCard);
        }

        app.getPhoto({ width: 120, height: 160 }, function (err, imageSrc) {
          avatarItem.value.avatar = imageSrc;
          avatarItem.value.updated = Date.now();

          avatarItem.save(function (err) {
            if (err) {
              var _err = 'Cannot save avatar data to server';
              console.error(_err + ' ' + err);
              return app.alert(_err);
            }

            // photo is saved to the server
            var photoIdCard =
		  pastePhoto(avatarItem.value.avatar, idCard, 20, 285, 192, 128);
            return callback(null, photoIdCard);
          });
        });
    });
  },

  saveIdToDesktop_desktop: function saveIdToDesktop_desktop (canvasIdCard) {
    canvasIdCard.toBlob(function(blob) {
      var filename = app.APPNAME + '-' + app.username + '-ID.png';
      saveAs(blob, filename);
    });
  },

  thumbnail: function thumbnail(base64, maxWidth, maxHeight) {

    // Max size for thumbnail
    if(typeof(maxWidth) === 'undefined') var maxWidth = 120;
    if(typeof(maxHeight) === 'undefined') var maxHeight = 120;

    // Create and initialize two canvas
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var canvasCopy = document.createElement("canvas");
    var copyContext = canvasCopy.getContext("2d");

    // Create original image
    var img = new Image();
    img.src = base64;

    // Determine new ratio based on max size
    var ratio = 1;
    if(img.width > maxWidth)
      ratio = maxWidth / img.width;
    else if(img.height > maxHeight)
      ratio = maxHeight / img.height;

    // Draw original image in second canvas
    canvasCopy.width = 120; //img.width;
    canvasCopy.height = 120; //img.height;
    copyContext.drawImage(img, 0, 0);

    // Copy and resize second canvas to first canvas
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    ctx.drawImage(canvasCopy, 0, 0,
                  canvasCopy.width, canvasCopy.height,
                  0, 0, canvas.width, canvas.height);

    return canvas;
  },

  displayContacts: function () {
    app.currentContact = null;
    app.switchView('contacts', 'Contacts');
    console.log("displayContacts()");

    app.getContactsFromServer(function (err, contacts) {
      if (err) {
        app.alert(err, 'danger');
        return;
      }
      app._contacts = contacts;
      $('#contacts-list').children().remove();
      var names = Object.keys(contacts);
      app.contactNameMap = {};
      var contactNames = names.map(function (value) {
	if (value == app.username) {
	  return null;
	}
	var lcName = value.toLowerCase();
	app.contactNameMap[lcName] = value;
	return value.toLowerCase();
      }).sort();

      for (var i = 0; i < contactNames.length; i++) {
	var lcName = contactNames[i];
	var name = app.contactNameMap[lcName];
	var followingStatus;
	if (!name) {
	  continue;
	}

	if (!app._contacts[name].trustedAt) {
	  followingStatus = ' <span class="following-not-complete"> Follow Back?</span>';
	}

	var userAvatar = '<img class="user-avatar-generic" src="svg/contact.svg" />';;
	console.warn(contactNames[i]);
	var cName = app.contactNameMap[contactNames[i]];
	if (app.session.items._trusted_peers.value[cName]) {
	  var avatar = app.session.items._trusted_peers.value[cName].avatar;
	  if (avatar) {
	    userAvatar = '<img class="user-avatar" src="' + avatar + '" />';
	  }
	}
        var html = '<li class="contact-record" id="contact-'
              + app.contactNameMap[contactNames[i]]
              + '">'
	      + userAvatar
	      + ' <span class="contact-name">'
              + app.contactNameMap[contactNames[i]]
	      + '</span>'
	      + followingStatus || ''
              + '</li>';
        $('#contacts-list').append($(html));
	avatar = null;
      }

      $('.contact-record').click(function () {
        var contact = $(this).attr('id').split('-')[1];
        console.log(contact);
	app.currentContact = contact;
        // app.contactDetails(contact);
	app.switchView('contact-details', contact);
	app.contactCard.displayCard('contact-details', contact);
      });

    });
  },

  currentContact: null,
  
  contactDetails: function contactDetails (name) {
    var contact = app._contacts[name];
    app.currentContact = name;
    // display the contact's fingerprint ID card:
    var fingerprint = contact.fingerprint || '0000000000000000000000000000000000000000000000000000000000000000';
    var canvas = app.card.createIdCard(fingerprint, name, app.contactCardLabel);
    // look for avatar, if we have one, paste it
    var avatar = app.session.items._trusted_peers.value[name].avatar;
    if (avatar) {
      app.pasteAvatar(avatar, canvas);
    }
    $(canvas).css({ width: '250px' });
    $(canvas).attr({'class': 'contact-id'});
    $('#contact-details .contact-id').remove();
    $('#contact-details').prepend(canvas);

    $('#contact-message').children().remove();
    if (!contact.fingerprint) {
      var html = '<p class="contact-msg">'
	    + name
	    + ' has scanned your Contact Card, but you need to obtain and scan their card in order to communicate</span>';
      $('#contact-message').append($(html));
    }

    app.switchView('contact-details', name);
  },

  getContactsFromServer: function (callback) {
    app.session.getOrCreateItem(crypton.trustedPeers,
    function (err, trustedPeers) {
      if (err) {
	console.error(err);
	callback(err);
	return;
      }
      callback(null, trustedPeers.value);
    });
  },

  newPhotoContactCardSheet:  function newPhotoContactCardSheet (uiCallback) {
    var options = {
      'androidTheme' : window.plugins.actionsheet.ANDROID_THEMES.THEME_HOLO_LIGHT,
      'buttonLabels': ['Snap Card Photo', 'Choose Card Image'],
      'addCancelButtonWithLabel': 'Cancel',
      'androidEnableCancelButton' : true
    };

  function callback(buttonIdx) {
    console.log(buttonIdx);
    switch (buttonIdx) {
    case 1:
      // Take Photo
      if (!uiCallback) {
	app.retakeIdPicture(false);
      } else {
	app.retakeIdPicture(true);
      }
      break;

    case 2:
      // Choose Photo
      var options =
	{ cameraDirection: 0,
	  pictureSourceType: navigator.camera.PictureSourceType.SAVEDPHOTOALBUM,
	  allowEdit: true
	};
      app.getPhoto(options, function imgCallback(err, imgData) {
	if (err) {
	  console.error(err);
	  app.alert('danger', err);
	  return;
	}
	// Do something with the photo
	app.session.items.avatar.value.avatar = imgData;
	app.session.items.avatar.value.avatar.updated = Date.now();
	app.session.items.avatar.save(function (err) {
	  if (err) {
            var _err = 'Cannot save avatar data to server';
            console.error(_err + ' ' + err);
            return app.alert(_err);
          }
	  // re-display ID card:
	  if (uiCallback) {
	    $('#header').show();
	    $('#header-contacts').show();
	  }
	  app.displayMyFingerprint(true);
	});
      });
      break;

    case 3:
      // Cancel
      return;
    default:
      return;
    }
  }
    window.plugins.actionsheet.show(options, callback);
  },

  updatePassphraseUI: function updatePassphraseUI () {
    app.switchView('new-passphrase');
    
    var oldPass;
    if (app.keyChain.supported) {
      function getPassCB (err, passphrase) {
	$('#old-pass-change-passphrase-input').val(passphrase);
	var newPass = generatePassphrase();
	$('#change-passphrase-input').val(newPass);
      }
      
      app.keyChain.getPassphrase(getPassCB);
    } else {
      $('#old-pass-change-passphrase-input').focus();
      var newPass = generatePassphrase();
      $('#change-passphrase-input').val(newPass);
    }
  },

  updatePassphrase: function updatePassphrase () {
    var oldPass = $('#old-pass-change-passphrase-input').val();
    var newPass = $('#change-passphrase-input').val();

    var username = app.username;

    if (oldPass && newPass) {
      app.progressIndicator.show('Changing Passphrase, one moment...');
      app.session.account.changePassphrase(oldPass, newPass,
      function changePassCB (err) {
	if (err) {
	  console.error(err);
	  app.progressIndicator.hide();
	  app.alert('Could not change passphrase at this time', 'danger');
	  return;
	}
	// Success:
	// Need to re-set the keychain pass:
	var supported = app.keyChain.supported;
	if (supported) {
	  app.keyChain.removePassphrase(function removePassCB (err) {
	    if (err) {
	      console.error(err);
	      // Keep going to change passphrase as it was manually typed anyway
	    }
	    // re-set passphrase
	    app.keyChain.setPassphrase(newPass, function setPassCB (err) {
	      if (err) {
		console.error(err);
		app.progressIndicator.hide();
		app.alert('Could not set new passphrase into keychain');
		return;
	      }
	      // all done, need to re-login
	      app.progressIndicator.hide();
	      // Show login screen
	      $('#username-login').hide();
	      $('#username-login').val(username);
	      $('#username-placeholder').html(username).show();
	      $('#password-login').hide();
	      $('#password-login').val(newPass);
	      app.enableLoginButtons();
	      app.switchView('account-login');
	      $('#login-btn').click();
	    });
	  });
	} else {
	  app.progressIndicator.hide();
	  app.enableLoginButtons();
	  $('#password-login').show();
	  $('#username-login').val(username).show();
	  $('#username-placeholder').html(username).hide();
	  $('#password-login').focus();
	  $('#password-login').val(newPass);
	  app.switchView('account-login');
	  $('#login-btn').click();
	}
      });
    } else {
      app.alert('Please enter the current passphrase and the new passphrase', 'danger');
    }
  },
  
  get isMobile() {
    if (!device) {
      return false;
    }
    if (device.platform in {Android: 'Android', iOS: 'iOS'}) {
      return true;
    }
    return false;
  },

  get platform() {
    if (!device) {
      return undefined;
    }
    return device.platform;
  },

  get version() {
    if (!device) {
      return undefined;
    }
    return device.version;
  },

  keyChain: {

    MIN_SUPPORT_IOS: 8,

    MIN_SUPPORT_ANDROID: 5,

    init: function init_keyChain (username, callback) {
      if (!this.supported) {
	return callback('Keychain unsupported');
      }
      this.prefix = username;
      var that = this;
      this.ss = new cordova.plugins.SecureStorage(
	function () {
	  console.log('KeyChain initialized');
	  callback(null);
	},
	function (error) {
	  console.log('KeyChain Error ' + error);
	  callback(error);
	},
	app.APPNAME);
    },

    _prefix: undefined,

    set prefix(prefix) {
      this._prefix = prefix;
    },

    get prefix() {
      if (!this._prefix) {
	console.error('Prefix required to get keychain data');
      }
      return this._prefix;
    },

    getPassphrase: function _getPassphrase (callback, testKeyName) {
      var passphraseKey;
      if (testKeyName) {
	passphraseKey = testKeyName;
      } else {
       passphraseKey = this.prefix + '-' + app.APPNAME;
      }

      this.ss.get(
	function (value) {
	  console.log('Success, got ' + value);
	  callback(null, value);
        },
	function (error) {
	  console.log('Error ' + error);
	  callback(error);
	},
	passphraseKey);
    },

    setPassphrase: function _setPassphrase (passphraseValue, callback) {
      var _passphraseKey = this.prefix + '-' + app.APPNAME;
      this.ss.set(
	function (key) {
	  console.log('Set ' + key);
	  callback(null);
	},
	function (error) {
	  console.log('Error ' + error);
	  callback(error);
	},
	_passphraseKey, passphraseValue);
    },

    removePassphrase: function _removePassphrase (callback) {
      var _passphraseKey = this.prefix + '-' + app.APPNAME;
      this.ss.remove(
	function (key) {
	  console.log('Removed ' + key);
	  callback(null);
	},
	function (error) {
	  console.error('Error, ' + error);
	  callback(error);
	},
	_passphraseKey);
    },

    get supported() {
      // test to see if the keychain is supported.
      // iOS 8+ & Android 5+ are supported
      if (!app.isMobile) {
	return false;
      }
      if (device.platform == 'Android') {
	if (new Number(device.version[0]) < this.MIN_SUPPORT_ANDROID) {
	  return false;
	}
	return true;
      }
      if (device.platform == 'iOS') {
	if (new Number(device.version[0]) < this.MIN_SUPPORT_IOS) {
	return false;
	}
	return true;
      }
      return false;
    }
  },

  about: function _about () {
    app.switchView('app-about', 'About ' + app.APPNAME);
    if (typeof app.aboutView == 'function') {
      app.aboutView();
    }
  }
};
