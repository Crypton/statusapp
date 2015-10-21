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
      // that.addPhotoToCard();
      app.contactCard.newPhotoContactCardSheet();
    });

    $('#onboarding-username-input').keyup(function (e) {
      this.value = this.value.toLowerCase();
    });

    $('#onboarding-username-input').keypress(function (e) {
      if (e.which == 13) {
	that.choosePassword();
	return false;
      }
    });
    
  },

  existingLogin: function existingLogin() {
    // Cancel and show a login view
  },
  
  username: null,

  passphrase: null,
  
  begin: function begin () {
    if (document.documentElement.clientHeight < 660) {
      $('.onboarding-header-container img').css({height: '48px'});
      $('.onboarding-header-container p').css({'font-size': '12px'});
      $('#onboarding-create-passphrase').css({bottom: '50px'});
    }
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
    $('#onboarding-no-account-step-3.onboarding-header-container img').css({height: '128px'});
    var that = this;

    app.progressIndicator.show(this.strings.en_US.ACCOUNT_GENERATE);
    this.username = this.username.toLowerCase();
    // create account
    crypton.generateAccount(this.username, this.passphrase,
      function onboardCreateAcctCB (err) {
	if (err) {
	  app.progressIndicator.hide();
	  console.error(err);
	  that.accountValidationErr(err);
	  return;
	}
	app.progressIndicator.hide();

	// OK, we can now login
	that.login();
      });
  },

  login: function login () {
    var that = this;
    app.progressIndicator.show(this.strings.en_US.ACCOUNT_LOGIN);
    crypton.authorize(this.username, this.passphrase,
    function loginCB (err, session) {
      if (err) {
	app.progressIndicator.hide();
	console.error(err);
	that.handleLoginErr(err);
	return;
      }
      // XXX: create all app items...
      
      app.progressIndicator.hide();
      app.username = that.username;
      app.session = session;
      window.localStorage.setItem('lastUserLogin', that.username);
      // save the accountName, just in case
      app.setAccountName(that.username);

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
      app.progressIndicator.show(that.strings.en_US.CREATE_INITIAL_ITEMS);
      app.createInitialItems(function initialItemsCB (err) {
	if (err) {
	  console.error(err);
	  app.progressIndicator.hide();
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
	    app.progressIndicator.hide();
	    // Display Contact Card onboarding screen:
	    app.switchView('onboarding-no-account-step-4');
	  });
	});
      });
    });
  },

  handleLoginErr: function handleLoginError (err) {
    app.alert(err, 'danger');
  },

  currentErr: [],
  
  accountValidationErr: function accountValidationErr (err) {
    // parse errors and change UI
    var error = { error: err, time: Date.now() };
    this.currentErr.push(error);

    if (err == 'Username already taken.') {
      this.begin();
      app.alert('Please choose another username', 'danger');
      return;
    }

    if (err == 'Username is not valid: it is not alphanumeric!') {
      this.begin();
      app.alert('Usernames must be alphanumeric', 'danger');
      return;
    }
    
    this.begin();
    app.alert(err, 'danger');
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
