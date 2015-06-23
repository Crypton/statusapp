/*
 * TODO LICENSE
 */

document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  // Now safe to use device APIs
  app.init();


  document.addEventListener('resume', function() {
    setTimeout(function(){
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
    // For android only, will fail on iOS
    // XXX: need to learn how to #IFDEF
    screen.lockOrientation('portrait');
  } catch (ex) {
    console.log('Not Android');
    // iOS, noop
  }
}

var app = {
  initilize: function initialize() {
    console.log('noop initialize');
  },
  // Application Constructor
  init: function init() {
    console.log('app initializing!: ', arguments);
    crypton.host = 'zk.gs';
    this.card =  new crypton.Card();
    this.bindEvents();
    $('#password-login').show();
    $('#username-login').show();
    
    function defaultLoginBehavior () {
      app.enableLoginButtons();
      app.switchView('#account-login');
      $('#username-login').focus();
    }
    // Check if any user has ever logged in before:
    var lastUser = window.localStorage.getItem('lastUserLogin');
    if (lastUser) {
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
	  }
	  // we have a passphrase!
	  $('#username-login').hide();
	  $('#username-placeholder').html(lastUser).show();
	  // XXX: hide the login passphrase field
	  $('#password-login').hide();
	  $('#password-login').val(passphrase);
	  app.enableLoginButtons();
	  app.switchView('#account-login');
	  $('#login-btn').focus();
	});
      });
    } else {
      defaultLoginBehavior();
    }
  },

  APPNAME: 'Kloak',

  URL: 'https://zk.gs',

  VERSION: "0.0.1",

  get isNodeWebKit() { return (typeof process == "object"); },

  get username() { return app.session.account.username; },

  get fingerprint() { return app.session.account.fingerprint; },

  // Bind Event Listeners
  bindEvents: function() {
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

    $("#register-btn").click(function (e) {
      e.preventDefault();
      app.beginRegistration();
    });

    $("#register-generate-cancel-btn").click(function (e) {
      e.preventDefault();
      app.switchView('#account-login', app.APPNAME);
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

    $('#my-contacts').click(function () {
      app.hideMenu();
      app.displayContacts();
    });

    $('#verify-id-card').click(function () {
      app.hideMenu();
      if (app.isNodeWebKit) {
        app.switchView('#scan-select-desktop', 'Verify Contact Card');
      } else {
        app.switchView('#scan-select', 'Verify Contact Card');
      }
    });

    $('#my-fingerprint').click(function () {
      app.hideMenu();
      app.switchView('#my-fingerprint-id', 'My Contact Card');
      app.displayMyFingerprint(true);
    });

    $('#my-options').click(function () {
      app.hideMenu();
      var useKeychain = window.localStorage.getItem('use-keychain');
      if (useKeychain == undefined) {
	window.localStorage.setItem('use-keychain', 't');
	useKeychain = 't';
      }
      if (useKeychain == 't') {
	$('#use-keychain-for-login').toggle(true);
      }
      app.switchView('#my-options-pane', 'Options');
    });

    $('#use-keychain-for-login').click(function () {
      if (this.checked) {
	window.localStorage.setItem('use-keychain', 't');
	return;
      }
      
      if (!this.checked) {
	window.localStorage.setItem('use-keychain', 'f');
	return;
      }
    });
    
    $('#find-users').click(function () {
      app.switchView('#find-users-view', 'Find Users');
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

    $('#add-contact-button').click(function () {
      if (app.isNodeWebKit) {
        app.switchView('#scan-select-desktop', 'Verify Contact Card');
      } else {
        app.switchView('#scan-select', 'Verify Contact Card');
      }
    });

    $('#contacts-detail-dismiss-btn').click(function () {
      $('.contact-id').remove();
      app.switchView('#contacts', 'Contacts');
    });

    if (app.setCustomEvents && typeof app.setCustomEvents == 'function') {
      app.setCustomEvents();
    }

    $('#create-id-card').click(function () {
      app.firstRunCreateIdCard( function () {
        $('#tasks-btn').addClass('active');
        app.switchView('#my-fingerprint-id', 'My Contact Card');
	// need to set this here in order to call the firstRunComplete function properly
	app.firstRunIsNow = false;
        app.firstRunComplete();
      });
    });;

    $('#find-someone').keyup(
      function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (event.target == $('#find-someone')[0]) {
          if(keycode == '13'){
            $('#find-someone-btn').focus();
            app.findSomeone();
          }
        }
    });
  },

  switchView: function switchView (id, name) {
    $('.view').removeClass('active');
    $('#page-title').text(name);
    $(id).addClass('active');
    if (id == '#login-progress') { // XXXddahl: special case hack. sigh.
      $('#login-progress').show();
    } else {
      $('#login-progress').hide();
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

  alert: function (message, level) {
    // success, info, warning, danger
    if (!level) {
      level = 'warning';
    }
    var html = '<div class="alert alert-' + level + '" role="alert">'
                                                  + message
                                                  + '</div>';
    var node = $(html);
    $('#alerts').prepend(node);
    window.setTimeout(function () {
      node.slideUp(100, function () {
        node.remove();
      });
    }, 3500);
  },

  logout: function logout () {
    app.session = null;
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
	    $('#username-placeholder').hide();
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
    app.switchView('#account-login', app.FEED_LBAEL);
    $('#tasks-btn').removeClass('active');
    app.alert('You are logged out', 'info');
    $('#password-login').focus();
  },

  switchUser: function switchUser() {
    $('#username-login').show();
    $('#username-placeholder').html('').hide();
    $('#password-login').show();
  },
  
  scanQRCode_desktop: function scanQRCode_desktop () {
    // Use GUMHelper here instead
    console.error('Scan QR NOT IMPLEMENTED');
  },

  scanQRCode: function () {
    if (app.isNodeWebKit) {
      return app.scanQRCode_desktop();
    }
    cordova.plugins.barcodeScanner.scan(
      function (result) {
        var userObj = JSON.parse(result.text);
        app.verifyUser(userObj.username, userObj.fingerprint);
      },
      function (error) {
        app.alert("QR Scanning failed: " + error, 'danger');
      }
    );
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

    app.switchView('#capture-avatar', 'Take a photo');
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
    }, function _error (err) { alert("GUM: there was an error " + err)});
  },

  captureAvatar_desktop: function captureAvatar_desktop () {
    console.log("captureAvatar_desktop()");
    app.getPhoto_desktop({}, function callback (err, imageData) {
      if (err) {
        return app.alert(err, 'danger');
      }
      app.avatarStream.stop();
      document.getElementById("capture-video").src = null;
      app.switchView('#feed', 'ZK Feed');
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
    var height = 160;
    var quality = 50;
    var cameraDirection = cameraDirectionOptions.FRONT;
    var pictureSourceType = navigator.camera.PictureSourceType.CAMERA;
    // navigator.camera.PictureSourceType.SAVEDPHOTOALBUM
    if (options) {
      width = options.width || 320;
      height = options.height || 240;
      quality = options.quality || 50;
      cameraDirection = options.cameraDirection || cameraDirectionOptions.FRONT;
      pictureSourceType = options.pictureSourceType || navigator.camera.PictureSourceType.CAMERA;
    }

    // via the CAMERA
    function onSuccess (imageURI) {
      var img = "data:image/jpeg;base64," + imageURI;
      callback(null, img);
    }

    function onFail (message) {
      callback(message);
      app.alert('An error occured: ' + message, 'danger');
    }

    // Specify the source to get the photos.
    navigator.camera.getPicture(onSuccess, onFail,
                                { quality: quality,
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
      chooser.addEventListener("change", function (evt) {
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
            app.verifyUser(userObj.username, userObj.fingerprint);
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
    }
  },

  getImage: function () {
    // Specific getImage function for QR parsing
    if (app.isNodeWebKit) {
      return app.getImage_desktop();
    }

    function onSuccess (dataURL) {
      var dataUrlPrefix = 'data:image/png;base64,';
      dataURL = dataUrlPrefix + dataURL;
      console.log(dataURL);
      qrcode.callback = function (data) {
        // alert(data);
        var userObj = JSON.parse(data);
        app.verifyUser(userObj.username, userObj.fingerprint);
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

    if (!user || !pass) {
      app.alert('Please enter a username and passphrase', 'danger');
      return;
    }

    app.switchView('#login-progress', '');
    app.setLoginStatus('Creating Account...');

    function callback (err) {
      console.error(err);
      app.switchView('#account-login', '');
      app.clearLoginStatus();

      if (err) {
        app.alert(err, 'danger');
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
	  app.switchView('#scan-select', 'Verify Contact Card');
	});
      });
    }

    app.register(user, pass, callback);
  },

  beginRegistration: function beginRegistration() {
    app.switchView('#generate-account', 'Create Account');
    // check for username + pass values
    var pass = $('#password-login').val();
    var username = $('#username-login').val();
    if (pass || username) {
      $('#password-generate').val(pass);
      $('#username-generate').val(username);
    } else {
      // generate a long password
      var passphrase = generatePassphrase();
      // display new form
      $('#password-generate').val(passphrase);
    }
  },

  register: function (user, pass, callback) {
    app.setLoginStatus('Generating account...');
    app.switchView('#login-progress', '');

    crypton.generateAccount(user, pass, function (err) {
      if (err) {
	console.error(err);
        app.switchView('#account-login', 'Account');
        return callback(err);
      }

      app.login();
    });
  },

  login: function () {
    var user = $('#username-login').val();
    var pass = $('#password-login').val();

    if (!user || !pass) {
      user = $('#username-generate').val();
      pass = $('#password-generate').val();
    }

    if (!user || !pass) {
      app.alert('Please enter a username and passphrase');
      return;
    }

    app.switchView('#login-progress', '');
    $('.alert').remove();

    app.setLoginStatus('Logging in...');

    function callback (err, session) {
      if (err) {
        app.alert(err, 'danger');
        app.switchView('#account-login', 'Account');
        app.clearLoginStatus();
        return;
      }

      window.localStorage.setItem('lastUserLogin', user);
      
      app.username = user;
      app.session = session;
      app.setLoginStatus('Loading prefs and feed...');

      // Check for first run
      app.session.getOrCreateItem('_prefs_', function(err, prefsItem) {
        console.log('getting _prefs_');
        app.customInitialization();

        if (err) {
          console.error(err);
          app.switchView('#account-login', 'Account');
          return;
        }

        $('#tasks-btn').addClass('active');

        app.username = app.session.account.username;

        if (!prefsItem.value.firstRun) {
          prefsItem.value = { firstRun: Date.now() };
	  app.firstRunIsNow = true;
          app.firstRun();
          return;
        }

        $('#password-login').val('');
	$('#password-generate-login').val('');
      });
    }

    crypton.authorize(user, pass, function (err, session) {
      if (err) {
        return callback(err);
      }
      return callback(null, session);
    });
  },

  firstRun: function () {
    // prompt to create Id card & why
    app.switchView('#first-run', 'Welcome');
  },

  firstRunComplete: function () {
    app.session.getOrCreateItem('_prefs_',
    function (err, prefsItem) {
      if (err) {
        console.error('Cannot load prefs, firstRunComplete failed');
        return;
      }

      if (!prefsItem.value['firstRun']) {
        prefsItem.value = { 'firstRun': Date.now() };
      }
      // Load and display all feed data:
      app.displayInitialView();

    });
  },

  toggleMenu: function () {
    var $menu = $('#top-menu');

    if ($menu.hasClass('active')) {
      $menu.removeClass('active');
      // $('.overlay').hide();
    } else {
      // $('.overlay').show();
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

  setLoginStatus: function (m) {
    $('#login-status .status').text(m);
    $('#login-status').show();
  },

  clearLoginStatus: function (m) {
    $('#login-status .status').text('');
  },

  formatFingerprint: function (fingerprint) {
    return this.card.createFingerprintArr(fingerprint).join(" ");
  },

  verifyUser: function (username, fingerprint) {
    if (!fingerprint) {
      var error = 'Contact data was not extracted';
      app.alert(error, 'danger');
      return console.error(error);
    }

    var rawFingerprintArr = fingerprint.split(' ');
    var rawFingerprint = rawFingerprintArr.join('').toLowerCase();
    // XXXddahl: the above ^^ is a hack to make this work for now

    $('#verify-user-success-msg').children().remove();
    $('#verify-user-failure-msg').children().remove();
    $('#verify-trust-failure-ok').hide();

    // app.switchView('#verify-user', 'Verify User');

    app.session.getPeer(username, function(err, peer) {
      if (err) {
        app.alert(err, 'danger');
        return;
      }

      function success () {
        peer.trust(function (err) {
          if (err) {
            console.log('peer trust failed: ' + err);
            // app.switchView('#scan-select', 'Verify Contact Card');
            app.alert(err, 'danger');
          } else {
            app.alert(username + ' is now a trusted contact', 'info');
            // $('#verify-user-success-msg').children().remove();
            if (app.postPeerTrustCallback && typeof app.postPeerTrustCallback == 'function') {
              app.postPeerTrustCallback(peer);
            }
            // app.switchView('#scan-select', 'Verify Contact Card');
          }
        });
      }

      function cancelTrust () {
        $('#verify-user-success-msg').children().remove();
        $('#verify-user-failure-msg').children().remove();
        // TODO: remove click events from buttons
        if (app.isNodeWebKit) {
          app.switchView('#scan-select-desktop', 'Verify Contact Card');
        } else {
          app.switchView('#scan-select', 'Verify Contact Card');
        }
      }

      function resizeIdCard(canvas) {
        var oldCanvas = canvas.toDataURL("image/png");
        var img = new Image();
        img.src = oldCanvas;
        img.onload = function (){
          canvas.height = 120;
          canvas.width = 120;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        }
      }

      var outOfBandFingerprint = rawFingerprint;
      var outOfBandFingerprintArr =
        app.card.createFingerprintArr(outOfBandFingerprint);
      var colorArr = app.card.createColorArr(outOfBandFingerprintArr);
      var outOfBandIdGrid = app.card.createIdentigrid(colorArr);
      resizeIdCard(outOfBandIdGrid);

      var peerFingerprintArr = app.card.createFingerprintArr(peer.fingerprint);
      var peerColorArr = app.card.createColorArr(peerFingerprintArr);
      var peerIdGrid = app.card.createIdentigrid(peerColorArr);
      resizeIdCard(peerIdGrid);

      if (peer.fingerprint == outOfBandFingerprint) {
	success();
        // $('#verify-user-success').show();
        // $('#verify-user-failure').hide();
        // var conf = '<div id="server-supplied"><strong>Server supplied</strong>'
        //          + '<p id="server-idgrid-canvas"></p></div>'
        //          + '<div id="scan-spplied"><strong>Scan supplied</strong>'
        //          + '<p id="outofband-idgrid-canvas"></p></div>';
        // var msg = $(conf);
        // $('#verify-user-success-msg').append(msg);
        // // add canvases to DOM
        // $('#server-idgrid-canvas').append(peerIdGrid);

        // $('#outofband-idgrid-canvas').append(outOfBandIdGrid);

        // $('#verify-trust-save').click(function () {
        //   success();
        // });

        // $('#verify-trust-cancel').click(function () {
        //   cancelTrust();
        // });
        // $('#verify-trust-save').show();
        // $('#verify-trust-cancel').show();
      } else {
        // Failure to match fingerprints
        $('#verify-user-success').hide();
        $('#verify-user-failure').show();
        $('#verify-trust-failure-ok').show();
        $('#verify-trust-save').hide();
        $('#verify-trust-cancel').hide();

        var conf = '<p>The server supplied</strong> '
                 + 'Contact color grid for <strong>'
             + username
             + '</strong> is: <p/>'
             + '<p id="server-idgrid-canvas"></p>'
             + '<p>The <strong>scanned</strong> Contact Card is :</p>'
             + '<p id="outofband-idgrid-canvas"></p>'
             + '<p>It is NOT A MATCH</p> <strong>'
             + username
             + ' </strong>*Cannot* be a trusted contact.';

        var msg = $(conf);
        $('#verify-user-failure-msg').append(msg);
        // add canvases to DOM
        $('#server-idgrid-canvas').append(peerIdGrid);
        $('#outofband-idgrid-canvas').append(outOfBandIdGrid);

        $('#verify-trust-failure-ok').click(function () {
          cancelTrust();
        });
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
    app.switchView('#peer-fingerprint-id', 'Peer Fingerprint');

    var canvas =
      app.card.createIdCard(fingerprint, username,
                             app.APPNAME, app.URL);
    $(canvas).css({ width: '300px'});
    $('#peer-fingerprint-id').append(canvas);
  },

  // XXXddahl: We need to cache the user's ID Card with photo for the session

  firstRunCreateIdCard: function (callback) {
    // XXXddahl: this is a hack for now
    app.retakeIdPicture(true, callback);
  },

  retakeIdPicture: function (firstRun, callback) {
    // remove ID card
    $('#my-fingerprint-id').children().remove();
    // Re-create the ID card
    var canvas =
      app.card.createIdCard(app.fingerprint, app.username,
                            app.APPNAME, app.URL);
    app.addPhotoToIdCard(canvas, true, function (err, idCard) {
      if (err) {
        return app.alert(err, 'danger');
      }
      app.displayIdCard(idCard, callback);
    });
  },

  displayIdCard: function (idCard, callback) {
    $(idCard).css({ width: '300px', 'margin-top': '1em'});
    $('#my-fingerprint-id').append(idCard);
    var idCardTitle = app.username + ' ' + app.APPNAME + ' Contact Card';
    var html = '<button id="retake-id-picture" '
             + 'class="btn btn-primary">Retake Photo</button>'
             + '<button id="share-my-id-card" '
             + 'class="btn btn-success">Share</button>';
    // XXXddahl: add a 'remove ID picture' button
    $('#my-fingerprint-id').append(html);
    $('#my-avatar')[0].src = app.session.items.avatar.value.avatar;
    $('#share-my-id-card').click(function () {
      if (app.isNodeWebKit) {
        app.saveIdToDesktop_desktop(idCard);
      } else {
	var _base64Img = idCard.toDataURL("image/png");
        window.plugins.socialsharing.share(app.sharingMessage, app.sharingTitle, _base64Img, app.sharingUrl);
      }
    });

    $('#retake-id-picture').click(function () {
      app.retakeIdPicture();
    });
    if (callback) {
      callback();
    }
    app.switchView('#my-fingerprint-id', 'My Contact Card');
  },

  displayMyFingerprint: function (withPhoto) {

    $('#my-fingerprint-id').children().remove();
    var canvas =
      app.card.createIdCard(app.fingerprint, app.username,
                             app.APPNAME, app.URL);
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

  addPhotoToIdCard: function (idCard, override, callback) {
    // check for existing photo:
    app.session.getOrCreateItem(app.PHOTO_ITEM,
      function (err, avatarItem) {
        if (err) {
          return callback(err);
        }

        // paste photo into ID:
        function pastePhoto(imageData, idCard) {
          var ctx = idCard.getContext('2d');
	  var img = new Image();
	  img.setAttribute('width', 120);
	  img.setAttribute('height', 160);
	  img.onload = function() {
            ctx.drawImage(img, 280, 10);
	  };
	  img.src = imageData;
          return idCard;
        }

        if (!override && avatarItem.value.avatar) {
          // XXXddahl: try ??
          var photoIdCard = pastePhoto(avatarItem.value.avatar, idCard);
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
              pastePhoto(avatarItem.value.avatar, idCard);
            // console.log(photoIdCard);
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
    app.switchView('#contacts', 'Contacts');
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
	var lcName = value.toLowerCase();
	app.contactNameMap[lcName] = value;
	return value.toLowerCase();
      }).sort();


      for (var i = 0; i < contactNames.length; i++) {
        var html = '<li class="contact-record" id="contact-'
              + app.contactNameMap[contactNames[i]]
              + '">'
              + app.contactNameMap[contactNames[i]]
              + '</li>';
        $('#contacts-list').append($(html));
      }

      $('.contact-record').click(function () {
        var contact = $(this).text();
        console.log(contact);
        app.contactDetails(contact);
      });

    });
  },

  contactDetails: function (name) {
    var contact = app._contacts[name];
    // display the contact's fingerprint ID card:
    var canvas = app.card.createIdCard(contact.fingerprint,
                                        name,
                                        app.APPNAME, app.URL);
    $(canvas).css({ width: '300px', 'margin-top': '1em'});
    $(canvas).attr({'class': 'contact-id'});
    $('#contact-details .contact-id').remove();
    $('#contact-details').prepend(canvas);

    app.switchView('#contact-details', name);
  },

  getContactsFromServer: function (callback) {
    app.session.getOrCreateItem(crypton.trustedPeers,
    function (err, trustedPeers) {
      if (err) {
	console.error(err);
	return callback(err);
      }
      return callback(null, trustedPeers.value);
    });
  },

  setPassphraseInKeychain: function (username) {
    // if we set the username + password into the keychain, we then:
    // * create a keychain object in localStorage like: { username: Date.now()}
    // * when we render the login screen, we can check this value and
    //   try to get the passphrase automatically and login with just a click
    // * Perhaps the login screen is dynamic, if a username is not in
    //   the keychain property, we render the password field
    // * Provide a manual override checkbox?
    
  },

  keyChain: {

    init: function init_keyChain (username, callback) {
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

    getPassphrase: function _getPassphrase (callback) {
      var passphraseKey = this.prefix + '-' + app.APPNAME;
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

    removePassphrase: function _removePassphrase () {
      var _passphraseKey = this.prefix + '-' + app.APPNAME;
      this.ss.remove(
	function (key) { console.log('Removed ' + key); },
	function (error) { console.log('Error, ' + error); },
	_passphraseKey);
    }
  }
};
