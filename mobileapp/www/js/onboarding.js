/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

app.onboarding = {
  
  bindEvents: function bindEvents() {
    var that = this;
    $('#onboarding-check-username').click(function () {
      that.choosePassword();
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
    
  },

  existingLogin: function existingLogin() {
    // Cancel and show a login view
  },
  
  username: null,

  passphrase: null,
  
  begin: function begin () {
    app.switchView('onboarding-no-account');
    $('#onboarding-username-input').focus();
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
      
      ProgressIndicator.hide();
      app.username = that.username;
      app.session = session;
      window.localStorage.setItem('lastUserLogin', that.username);
      // XXX: delete username and passphrase after saving to keychain
			
      // Display Contact Card onboarding screen:
      app.switchView('onboarding-no-account-step-4');
      // XXX: hide progress
    });
  },

  handleLoginErr: function handleLoginError (err) {
    app.alert(err, 'danger');
  },
  
  accountValidationErr: function accountValidationErr (err) {
    // parse errors and change UI
  },

  manageContactCard: function manageContactCard () {

  },

  genPass: function genPass() {
    var pass = generatePassphrase();
    $('#onboarding-passphrase-input').val(pass);
  },
  
  strings: {
    en_US:{
      ACCOUNT_GENERATE: 'Generating Account',
      ACCOUNT_LOGIN: "Logging In"
      // XXX: Add all onboarding strings to this object
    }
  }
};
