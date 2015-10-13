app.options = {
  forgetCredentialsSheet:  function forgetCredentialsSheet (event) {
    var options = {
      'androidTheme' : window.plugins.actionsheet.ANDROID_THEMES.THEME_HOLO_LIGHT,
      'buttonLabels': ['Yes, Delete Credentials'],
      'addCancelButtonWithLabel': 'Cancel',
      'androidEnableCancelButton' : true
    };

    var that = this;

    function callback(buttonIdx) {
      console.log(buttonIdx);
      switch (buttonIdx) {
      case 1:
	// delete credentials
	that.deleteCredentials(event);
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

  deleteCredentials: function deleteCredentials (event) {
    if (window.localStorage.touchIdLoginEnabled == 1) {
      app.alert("Please disable TouchID before Forgetting Credentials", 'info');
    } else {
      app.keyChain.removePassphrase(function (err) {
        if (err) {
          console.error(err);
          app.alert('There is no passphrase to remove from keychain', 'warning');
        } else {
          app.alert('Passphrase removed!', 'info');
        }
        delete window.localStorage.lastUserLogin;
        // re-set the login screen
        $('#username-login').show();
        $('#username-placeholder').html('').hide();
        $('#password-login').show();
        event.target.disabled = true;
      });
    }
  }
};

