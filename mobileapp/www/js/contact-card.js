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

  displayCard: function displayCard (parentNodeId, name) {
    var that = this;
    this.username = null;
    this.parentNodeId = parentNodeId;
    if (!name) {
      name = app.username;
    }
    if (name !== app.username) {
      this.username = name;
    }

    $('.current-contact-card-canvas').remove();

    this.assembleContactCard(this.username);
    $("#" + this.parentNodeId).append($(that.contactCardCanvas));
  },
  
  captureBio: function captureBio (callback) {
    var that = this;
    function onPrompt(results) {
      if (results.input1.length > 96) {
	app.alert('Sorry, your Biography is too long. 96 Characters Maximum.', 'danger');
	return;
      }
      that.bio = results.input1;

      // save bio to avatar item
      app.session.items.avatar.value.biography = results.input1;
      app.session.items.avatar.save(function saveBioCB(err) {
	if (err) {
	  console.error('Could not save bio!');
	}
	// save it locally too for now...
	localStorage.setItem('bio-' + app.username, results.input1);
	if (typeof callback === 'function') {
	  callback();
	}
      });
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

  base64UrlToCanvas: function base64UrlToCanvas (base64Url) {
    if (!base64Url) {
      console.warn('No base64Url, getting generic base64Url');
      // we need to get a generic one here
      base64Url = this.genericAvatar;
      this.defaultAvatar = true;
    }
    this.defaultAvatar = false;
    var canvas = $('<canvas></canvas>')[0];
    canvas.width = 120;
    canvas.height = 120;
    
    var ctx = canvas.getContext("2d");    
    var image = new Image();
    image.src = base64Url;
    // image.onload = function () {
    ctx.drawImage(image, 0, 0);
    this.cardPhoto = canvas;
    // };
    
    return canvas;
  },
  
  getContactAvatarImage: function getContactAvatarImage () {
    var imgData = app._contacts[this.username].avatar;
    return this.base64UrlToCanvas(imgData);
  },
  
  getAvatarImage: function getAvatarImage () {
    if (this.username !== app.username) {
      return this.getContactAvatarImage(this.username);
    }

    var imgData = app.session.items.avatar.value.avatar;
    
    if (!imgData) {
      return null;
    }
    return this.base64UrlToCanvas(imgData);
  },
  
  qrCodeCanvas: null,

  getFingerprintArr: function getFingerprintArr (contactName) {
    var fingerArr;
    var fingerprint;
    if (!contactName || contactName === app.username) {
      fingerprint = app.session.account.fingerprint;
      this.username = app.session.account.username;
    } else {
      if (app._contacts[contactName]) {
	fingerprint = app._contacts[contactName].fingerprint;
	this.username = contactName;
      }
    }
    try {
      return app.card.createFingerprintArr(fingerprint);
    } catch (ex) {
      console.log(ex);
      app.alert('Card creation error.');
      return null;
    }
  },
  
  assembleContactCard: function assembleContactCard (contactName) {

    var fingerArr = this.getFingerprintArr(contactName);
    // Create the card, get the QR code only
    this.qrCodeCanvas =
    this.createQRCode(fingerArr, this.username, app.APPNAME);

    this.getAvatarImage(contactName);
    this.getBio();
    this.contactCardCanvas = this.getContactCardTemplate();
    $(this.contactCardCanvas).addClass('current-contact-card-canvas');
    this.fillCardTemplate();
  },

  getBio: function getBio () {
    if (this.username !== app.username) {
      this.bio = app._contacts[this.username].biography;
    } else {
      this.bio = app.session.items.avatar.value.biography;
    }
  },
  
  fillCardTemplate: function fillCardTemplate () {
    this.ctx = this.contactCardCanvas.getContext('2d');
    
    // set font + size
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px "PT Mono", monospace';
    var x = 32;
    var y = 315;
    this.ctx.fillText(this.username, x, y);
    this.ctx.drawImage(this.qrCodeCanvas, 224, 118);

    x = 45;
    y = 118;

    if (this.cardPhoto) {
      if (this.defaultAvatar) {
	x = 65;
	y = 138;
      }
      this.ctx.drawImage(this.cardPhoto, x, y);
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
  },

  contactDetails: function contactDetails (name) {
    var contact = app._contacts[name];
    var fingerprint = contact.fingerprint || '0000000000000000000000000000000000000000000000000000000000000000';
    var bio = contact.biography || '';
    var avatar = contact[name].avatar; // || get a generic base64url avatar
    // make card canvas
    
    // paste avatar
    
  },

  // Generic Contact Card SVG converted to PNG for ease of use and fewer DOM errors
  genericAvatar:
  "data:image/png;base64,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"

};
