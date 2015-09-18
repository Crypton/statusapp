/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

app.onboarding = {
  
  bindEvents: function bindEvents() {
    var that = this;
    $('#onboarding-check-username').click(function () {
      that.choosePassword();
    });

    $('#onboarding-existing-account').click(function () {
      app.switchView('account-login');
    });
    
    $('#onboarding-create-account').click(function () {
      that.accountCreationValidation();
    });
    // regenerate-passphrase
    $('#regenerate-passphrase').click(function () {
      that.genPass();
    });

    $('#clear-passphrase').click(function () {
      $('#onboarding-passphrase-input').val('');
      $('#onboarding-passphrase-input').focus();
    });

    $('#onboarding-cancel').click(function () {
      $('#onboarding-passphrase-input').val('');
      $('#onboarding-username-input').val('');
      that.username = '';
      that.passphrase = '';
      that.begin();
    });

    $('#onboarding-existing-account').click(function () {
      that.existingLogin();
    });

    $('#onboarding-exit-setup').click(function () {
      that.exit();
    });

    $('#onboarding-add-photo-btn').click(function () {
      that.addPhotoToCard();
    });
  },

  existingLogin: function existingLogin() {
    // Cancel and show a login view
  },
  
  username: null,

  passphrase: null,
  
  begin: function begin () {
    app.switchView('onboarding-no-account');
  },
  
  choosePassword: function choosePassword () {
    if (!$('#onboarding-username-input').val().trim()) {
      app.alert('Please choose a username', 'danger');
      return;
    }
    this.username = $('#onboarding-username-input').val().trim();
    this.genPass();
    app.switchView('onboarding-no-account-step-2');
  },

  accountCreationValidation: function accountCreationValidation () {
    if (!$('#onboarding-passphrase-input').val().trim()) {
      app.alert('Please create a passphrase', 'danger');
      return;
    }
    this.passphrase = $('#onboarding-passphrase-input').val().trim();
    app.switchView('onboarding-no-account-step-3');
    var that = this;

    ProgressIndicator.showSimpleWithLabel(true, this.strings.en_US.ACCOUNT_GENERATE);
    // create account
    crypton.generateAccount(this.username, this.passphrase,
      function onboardCreateAcctCB (err) {
	if (err) {
	  ProgressIndicator.hide();
	  console.error(err);
	  that.accountValidationErr(err);
	  return;
	}
	ProgressIndicator.hide();
	// OK, we can now login
	that.login();
      });
  },

  login: function login () {
    var that = this;
    ProgressIndicator.showSimpleWithLabel(true, this.strings.en_US.ACCOUNT_LOGIN);
    crypton.authorize(this.username, this.passphrase,
    function loginCB (err, session) {
      if (err) {
	ProgressIndicator.hide();
	console.error(err);
	that.handleLoginErr(err);
	return;
      }
      // XXX: create all app items...
      
      ProgressIndicator.hide();
      app.username = that.username;
      app.session = session;
      window.localStorage.setItem('lastUserLogin', that.username);

      if (app.keyChain.supported) {
	app.keyChain.init(that.username, function (err) {
	  if (err) {
	    return console.error(err);
	  }
	  app.keyChain.setPassphrase(that.passphrase, function (err) {
	    if (err) {
	      return console.error(err);
	    }
	    return console.log('success: passphrase remembered');
	  });
	});
      }
      
      // XXX: delete username and passphrase after saving to keychain
      ProgressIndicator.showSimpleWithLabel(true, that.strings.en_US.CREATE_INITIAL_ITEMS);
      app.createInitialItems(function initialItemsCB (err) {
	if (err) {
	  console.error(err);
	  ProgressIndicator.hide();
	  // XXX: 
	  return;
	}


	app.session.getOrCreateItem('_prefs_', function(err, prefsItem) {
          console.log('getting _prefs_');

          if (err) {
            console.error(err);
            // return; // XXX: what to do here?
          }
	  
          if (!prefsItem.value.firstRun) {
            prefsItem.value = { firstRun: Date.now() };
          }
	  prefsItem.save(function (err) {
	    if (err) {
	      console.error(err);
	    }
	    ProgressIndicator.hide();
	    // Display Contact Card onboarding screen:
	    that.displayContactCard();
	    app.switchView('onboarding-no-account-step-4');
	  });
	});
      });
    });
  },

  handleLoginErr: function handleLoginError (err) {
    app.alert(err, 'danger');
  },
  
  accountValidationErr: function accountValidationErr (err) {
    // parse errors and change UI
    if (err == 'Username already taken.') {
      this.currentErr = err;
      this.begin();
      app.alert('Please choose another username', 'danger');
    }
  },

  exit: function exit () {
    // Exit onboarding & load the timeline
    // cleanup first
    // remove children from onboarding-contact-card-wrapper
    $('#header').show();
    $('#header-timeline').show();
    app.switchView('feed', 'Feed');
    app.loadInitialTimeline();
  },
  
  displayContactCard: function displayContactCard () {
    var label = app.APPNAME + '  *  ' + app.username + '  *';
    var canvas =
    app.card.createIdCard(app.fingerprint, app.username, label);
    $(canvas).css({ width: '290px'});
    $('#onboarding-contact-card-wrapper').append(canvas);
  },

  addPhotoToCard: function addPhotoToCard() {
    // app.getPhoto(null, function addPhotoCB (err, imgData) {
    //   // save avatar:
    //   app.session.items.avatar.value.avatar = imgData;
    //   app.session.items.avatar.save(function (err) {
    // 	// add photo to the card
    // 	var idCard = $('#onboarding-contact-card-wrapper canvas')[0];
    // 	app.pasteAvatar(imgData, idCard);
    //   });
    // });
    app.newPhotoContactCardSheet(function () {
      $('#header').show();
    });
    
  },
  
  genPass: function genPass() {
    var pass = generatePassphrase();
    $('#onboarding-passphrase-input').val(pass);
  },
  
  strings: {
    en_US:{
      ACCOUNT_GENERATE: 'Generating Account',
      ACCOUNT_LOGIN: 'Logging In',
      CREATE_INITIAL_ITEMS: 'Loading Datastore'
      // XXX: Add all onboarding strings to this object
    }
  }
};
