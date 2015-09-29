/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

app.contactCard = {

  bio: null,
  
  init: function init (parentNodeId) {
    $('.current-contact-card-canvas').remove();
    this.parentNodeId = parentNodeId;
    var that = this;
    this.usingDefaultPhoto = false;

    function bioCallback() {
    
      var contactCardPhotoData = app.session.items.avatar.value.avatar;
      if (contactCardPhotoData) {
	$('#contact-card-photo')[0].src = app.session.items.avatar.value.avatar;
      } else {
      $('#contact-card-photo')[0].src = $('#contact-card-photo-default')[0].src;
	this.usingDefaultPhoto = true;
      }

      $('#contact-card-photo')[0].onload = function contactCardOnload() {
	that.assembleContactCard();
	$("#" + that.parentNodeId).append($(that.contactCardCanvas));
      };
    }

    this.captureBio(bioCallback);
  },

  displayCard: function displayCard (parentNodeId) {
    var that = this;
    this.parentNodeId = parentNodeId;

    $('.current-contact-card-canvas').remove();

    var contactCardPhotoData = app.session.items.avatar.value.avatar;

    $('#contact-card-photo')[0].src = app.session.items.avatar.value.avatar;
    
    that.assembleContactCard();
    $("#" + that.parentNodeId).append($(that.contactCardCanvas));
    
    // $('#contact-card-photo').load(function contactCardOnload() {
    //   that.assembleContactCard();
    //   $("#" + that.parentNodeId).append($(that.contactCardCanvas));
    // });
    
    // if (contactCardPhotoData) {
    
    // } else {
    //  $('#contact-card-photo')[0].src = $('#contact-card-photo-default')[0].src;
    //  this.usingDefaultPhoto = true;
    // }
  },
  
  captureBio: function captureBio (callback) {
    var that = this;
    function onPrompt(results) {
      if (results.input1.length > 96) {
	app.alert('Sorry, your Biography is too long. 96 Characters Maximum.', 'danger');
	return;
      }
      that.bio = results.input1;
      localStorage.setItem('bio-' + app.username, results.input1);
      if (typeof callback === 'function') {
	callback();
      }
    }

    var bio = localStorage.getItem('bio-' + app.username);
    
    navigator.notification.prompt(
      'Please enter a short Biography, maximum of 96 characters', // message
      onPrompt,                                                   // callback to invoke
      'Enter Biography',                                          // title
      ['Save', 'Cancel'],                                         // buttonLabels
      bio || 'Privacy Enthusiast (since forever!)'                // defaultText
    );
  },
  
  getContactCardTemplate: function getContactCardTemplate () {
    var img = document.getElementById('contact-card-template');
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas;
  },

  getAvatarImage: function getAvatarImage () {
    var img = document.getElementById('contact-card-photo');
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas;
  },
  
  qrCodeCanvas: null,
  
  assembleContactCard: function assembleContactCard () {
    var fingerArr;
    try {
      fingerArr =
      app.card.createFingerprintArr(app.session.account.fingerprint);
    } catch (ex) {
      console.log(ex);
      app.alert('Card creation error.');
      return;
    }

    // Create the card, get the QR code only
    this.qrCodeCanvas =
    this.createQRCode(fingerArr, app.session.account.username, app.APPNAME);

    this.cardPhoto = this.getAvatarImage();
    
    this.contactCardCanvas = this.getContactCardTemplate();
    $(this.contactCardCanvas).addClass('current-contact-card-canvas');
    this.fillCardTemplate();
  },
  
  fillCardTemplate: function fillCardTemplate () {
    this.ctx = this.contactCardCanvas.getContext('2d');
    
    // set font + size
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px "PT Mono", monospace';
    var x = 32;
    var y = 315;
    this.ctx.fillText(app.username, x, y);
    this.ctx.drawImage(this.qrCodeCanvas, 224, 118);
    x = 45;
    y = 118;
    if (this.usingDefaultPhoto) {
      x = x + 20;
      y = y + 20;
    }
    this.ctx.drawImage(this.cardPhoto, x, y);
    if (!this.bio) {
      this.bio = localStorage.getItem('bio-' + app.username);
    }
    if (this.bio) {
      this.writeBio();
    }
  },

  writeBio: function writeBio () {
    this.ctx.font = '13px "PT Mono", monospace';
    var LINE_LENGTH = 32;
    var lineCount = 1;
    if (this.bio.length <= LINE_LENGTH) {
      this.ctx.fillText(this.bio, 32, 375);
      return;
    } else {
      // We have a a longer bio, need to split it into 32 char-ish lines
      var bioArr = this.bio.split(' ');
      var line = '';
      var x = 32;
      var y = 375;
      
      for (var i = 0; i < bioArr.length; i++) {
	if (line.length <= LINE_LENGTH) {
	  line = line + bioArr[i] + ' ';
	  if (i === (bioArr.length - 1)) {
	    this.ctx.fillText(line, x, y);
	    continue;
	  }
	  if (line.length >= LINE_LENGTH) {
	    this.ctx.fillText(line, x, y);
	    line = '';
	    y = y + 18;
	    lineCount++;
	    continue;
	  }
	} else {
	  this.ctx.fillText(line, x, y);
	  line = '';
	  y = y + 18;
	  lineCount++;
	  continue;
	}
      }
    }
  },
  
  createQRCode: function (fingerArr, username, appname) {

    var qrValue = JSON.stringify({ f: fingerArr.join(' '),
			           u: username,
			           a: appname
				 });
  
    var qrCodeCanvas = qr.canvas({
      value: qrValue,
      level: 'H',
      size: 6 // 1 - 10
    });
  
    return qrCodeCanvas;
  },

  updatePhoto: function updatePhoto () {
    app.getPhoto({ width: 120, height: 160 }, function (err, imageData) {
      var avatarItem = app.session.items.avatar;
      avatarItem.value.avatar = imageData;
      avatarItem.value.updated = Date.now();

      app.alert('Saving photo to server...', 'info');
      
      avatarItem.save(function (err) {
        if (err) {
          var _err = 'Cannot save photo to server';
          console.error(_err + ' ' + err);
          return app.alert(_err, 'danger');
        }
	
        // photo is saved to the server
	// $('.current-contact-card-canvas').remove();
	$('#contact-card-photo')[0].src = imageData;
	this.cardPhoto = this.getAvatarImage();
	// this.contactCardCanvas = this.getContactCardTemplate();
	// this.fillCardTemplate();

	// JUST NEED TO write the new photo over
	this.ctx.drawImage(this.cardPhoto, 45, 118);
	
      });
    });
  },

  newPhotoContactCardSheet:  function newPhotoContactCardSheet (uiCallback) {
    var options = {
      'androidTheme' : window.plugins.actionsheet.ANDROID_THEMES.THEME_HOLO_LIGHT,
      'buttonLabels': ['Snap Card Photo', 'Choose Card Image'],
      'addCancelButtonWithLabel': 'Cancel',
      'androidEnableCancelButton' : true
    };

    var that = this;

    function callback(buttonIdx) {
      console.log(buttonIdx);
      switch (buttonIdx) {
      case 1:
	// Take Photo
	that.updatePhoto();
	break;

      case 2:
	// Choose Photo
	var options =
	  { cameraDirection: 0,
	    pictureSourceType: navigator.camera.PictureSourceType.SAVEDPHOTOALBUM,
	    allowEdit: true,
	    width: 120,
	    height: 160 
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
	    $('.current-contact-card-canvas').remove();
	    $('#contact-card-photo')[0].src = imgData;
	    that.cardPhoto = that.getAvatarImage();
	    // this.contactCardCanvas = this.getContactCardTemplate();
	    // this.fillCardTemplate();
	    that.ctx.drawImage(that.cardPhoto, 45, 118);
	    
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
  }
};
