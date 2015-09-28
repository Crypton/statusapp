/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

app.contactCard = {

  bio: null,
  
  init: function init (bio) {
    // Set up all of the basic information here
    if (typeof bio == 'string') {
      if (bio.length > 96) {
	var err = 'Bio is too long, 96 chatracters Max';
	console.error(err);
	app.alert(err, 'danger');
	return;
      }
      this.bio = bio;
    }

    var that = this;
    
    app.switchView('hidden-utility-nodes');
    // XXX make sure the avatar exists
    $('#contact-card-photo')[0].src = app.session.items.avatar.value.avatar;
    $('#contact-card-photo')[0].onload = function contactCardOnload() {
      that.assembleContactCard();
      $("#hidden-utility-nodes").append($(that.contactCardCanvas));
    };
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
    this.ctx.drawImage(this.cardPhoto, 45, 118);
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
  }
};
