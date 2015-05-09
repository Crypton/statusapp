app.localAvatarsPath = 'img/avatars/';

app.localAvatars = ['franklin-1.png', 'franklin-2.png', 'franklin-3.png',
		    'franklin-4.png', 'franklin-5.png', 'franklin-6.png'];

app.randomAvatar = function randomAvatar() {
  var randomnumber = Math.floor(Math.random()*5);
  var avatarPath = app.localAvatarsPath + app.localAvatars[randomnumber];
  return avatarPath;
};

app.setInitialAvatar = function setInitialAvatar () {
  var avatar = app.randomAvatar();
  app.avatarPath = avatar;
  localStorage.setItem('avatarPath', avatar);
  return avatar;
};

app.ITEMS = {
  firstRun: 'firstRun',
  feed: 'feed',
  status: 'status',
  avatar: 'avatar'
};

app.FEED_LABEL = 'ZK';

app.INITIAL_STATUS_MESSAGE = 'Current Status: null';

app.isReady = false;

app.statusContainer = null;

app.postPeerTrustCallback = function postPeerTrustCallback(peer) {
  console.log('postPeerTrustCallback()');
  // We now trust this peer and can share data
  // This is generally only ever called once after adding a contact
  // and trusting them.
  app.shareStatus(peer);
};

app.resumeEventHandler = function resumeEventHandler () {
  if ((app.lastInterval - Date.now()) >  (60 * 5 * 1000)) {
    // More than 5 minutes have elapsed since last interval
    // fetch from the server
    app.loadRecentFeed();
  }
};

app.pauseEventHandler = function pauseEventHandler () {
  app.clearLoadingInterval();
};


app.setAvatar = function setAvatar() {
  var avatarData = app.session.items.avatar.value.avatar;
  if ($('#my-avatar')[0].src.indexOf('avatars') == -1) {
    if (avatarData) {
      $('#my-avatar')[0].src = avatarData;
      $('#my-avatar').style({ width: '64px', height: '48px' });
    }
  }

  if ($("#my-status-wrapper img")[0].src.indexOf('avatars') == -1) {
    if (avatarData) {
      $("#my-status-wrapper img")[0].src = avatarData;
      // $('#my-avatar').style({ width: '64px', height: '48px' });
    }
  }

};

app.setCustomEvents = function setCustomEvents () {
  $('#my-stati').click(function () {
    app.hideMenu();
    // XXXddahl: reset status UI
    // Get avatar if not present

    app.switchView('#stati', 'Update Status');
    $('#set-my-status-textarea').focus();
  });

  $('#my-feed').click(function () {
    app.hideMenu();
    // app.loadAndViewMyStatus();
    app.switchView('#feed', app.FEED_LABEL);
  });

  $('#header-refresh-btn').click(function () {
    app.hideMenu();
    app.switchView('#feed', app.FEED_LABEL);
    app.loadFeed();
  });

  $('#refresh-feed').click(function () {
    app.hideMenu();
    app.switchView('#feed', app.FEED_LABEL);
    app.loadFeed();
  });

  $('#set-my-status-btn').click(function () {
    app.setMyStatus();
  });

  $('#include-gps-btn').click(function () {
    app.setMyLocation();
  });

  $('#take-a-photo-btn').click(function () {
    app.takeAPhoto();
  });

  $('#pick-an-image-btn').click(function () {
    app.pickAnImage();
  });

  $('#fetch-previous-items').click(function () {
    app.loadPreviousFeed();
  });
};

app.takeAPhoto = function takeAPhoto () {
  // remove any photos in the DOM:
  $('#my-image-to-post').children().remove();

  // get photo
  var directionBack = 0;
  app.getPhoto({ width: 320, height: 240, cameraDirection: directionBack },
  function (err, imgData) {
    if (err) {
      console.error(err);
      app.alert('Cannot take picture: ' + err);
      return;
    }
    var html = '<img id="image-payload" src="' + imgData  + '" />';
    $('#my-image-to-post').append(html);
  });
};

app.pickAnImage = function pickAnImage () {
  // remove any photos in the DOM:
  $('#my-image-to-post').children().remove();

  app.getPhoto({ width: 320, height: 240, pictureSourceType: navigator.camera.PictureSourceType.SAVEDPHOTOALBUM },
  function (err, imgData) {
    if (err) {
      console.error(err);
      app.alert('Cannot get picture from album: ' + err);
      return;
    }
    var html = '<img id="image-payload" src="' + imgData  + '" />';
    $('#my-image-to-post').append(html);
  });
};

app.createNewLocalProfile = function () {
  var user = crypton.hmac('', app.username);
  var profile = {};
  profile[user] = {
    tlOptions: {
      lastItemRead: 0,
      limit: 5,
      offset: 0
    },
    historyOptions: {
      lastItemRead: 0,
      limit: 5,
      offset: 0
    }
  };
  app.saveProfile(profile);
  return profile;
}

app.addNewLocalProfile = function (profile) {
  var user = crypton.hmac('', app.username);
  profile[user] = {
    tlOptions: {
      lastItemRead: 0,
      limit: 5,
      offset: 0
    },
    historyOptions: {
      lastItemRead: 0,
      limit: 5,
      offset: 0
    }
  };
  app.saveProfile(profile);
  return profile;
};

app.saveProfile = function saveProfile (profileObj) {
  var str = JSON.stringify(profileObj);
  localStorage.setItem('_profile_', str);
};

app.setupClientProfile = function setupClientProfile () {

  var strProfile = localStorage.getItem('_profile_');
  if (!strProfile) {
    var profile = app.createNewLocalProfile();
    localStorage.setItem('_profile_', JSON.stringify(profile));
  } else {
    var profileObj = JSON.parse(strProfile);
    var user = crypton.hmac('', app.username);
    if (!profileObj[user]) {
      // Need to add this username to the profile obj
      app.addNewLocalProfile(profileObj);
    }
  }
};

app.getCurrentProfile = function getCurrentProfile () {
  var user = crypton.hmac('', app.username);
  this._profile = JSON.parse(localStorage.getItem('_profile_'));
  return this._profile[user];
};

app.saveLocalProfile = function saveLocalProfile() {
  var profiles = JSON.parse(localStorage.getItem('_profile_'));
  var user = crypton.hmac('', app.username);
  profiles[user] = this._profile[user];
  localStorage.setItem('_profile_', JSON.stringify(profiles));
}

app.customInitialization = function customInitialization() {
  console.log('customInitialization()');
  // check for existing avatar
  if (!localStorage.getItem('avatarPath')) {
    app.setInitialAvatar();
  } else {
    app.avatarPath = localStorage.getItem('avatarPath');
  }

  app.setupClientProfile();
  // Profile setup
  var that = this;
  if (!app.currentProfile) {
    Object.defineProperty(app, 'currentProfile', {
      get: function() {
        return app.getCurrentProfile();
      },

      set: function(value) {
        var user = crypton.hmac('', app.username);
        if (value.lastItemRead && value.offset && value.limit) {
          that._profile[user] = value;
          app.saveLocalProfile();
        } else {
          console.error('Error setting local profile data');
        }
      }
    });
  }

  // XXXddahl: need a indeterminate progress indicator
  app.createInitialItems(function (err) {
    if (err) {
      return console.error(err);
    }
    console.log('Initial items fetched or created');
    app.displayInitialView();
    // XXXddahl: hide indeterminate progress indicator
  });
};

app.createInitialItems = function createInitialItems (callback) {
  app.session.getOrCreateItem(app.ITEMS.feed, function (err, feed) {
    if (err) {
      callback(err);
      return console.error(err);
    }

    if (!feed.value.feedHmacs) {
      feed.value = { feedHmacs: {}, lastUpdated: Date.now() };
    }

    app.session.getOrCreateItem(app.ITEMS.status, function (err, status) {
      if (err) {
        callback(err);
        return console.error(err);
      }

      if (!status.value.status) {
        status.value = { status: 'Hello World!',
                         timestamp: Date.now(),
                         location: null
                       };
      }

      app.session.getOrCreateItem(app.ITEMS.avatar, function (err, avatar) {
        if (err) {
          callback(err);
          return console.error(err);
        }

        if (avatar.value.avatar === undefined) {
          avatar.value = { avatar: null };
        }
        callback(null);
      });
    });
  });
};

app.refreshFeed = function refreshFeed () {
  // Show progressbar at top:

};

app.tlOptions = { lastItemRead: 0, offset: 0, limit: 5 };

app.feedIsLoading = false;

app.loadPreviousFeed = function loadPreviousFeed() {
  // get the timeline_id of the first item rendered
  var firstTimelineId = $('.media').last().attr('id');
  var options = {
      lastItemRead: firstTimelineId,
      direction: 'prev',
      limit: 10,
      offset: 0
  };
  var append = true;
  app.loadFeed(options, append);
};

app.loadFeed = function loadFeed(options, append) {
  if (app.feedIsLoading) {
    return;
  }
  app.feedIsLoading = true;
  $('#feed-progress-wrapper').show();
  var user = app.hmacUser();
  if (!options) {
    options = app.currentProfile.tlOptions;
  }
  if (typeof parseInt(options.lastItemRead) != 'number') {
    options.lastItemRead = app.lastTimelineItemId || 0;
  }
  if (typeof parseInt(options.offset) != 'number') {
    options.offset = 0;
  }
  if (typeof parseInt(options.limit) != 'number') {
    options.limit = 5;
  }

  app.session.getTimeline(options, function tlCallback (err, timeline) {
    if (err) {
      console.error(err);
      app.feedIsLoading = false;
      $('#feed-progress-wrapper').hide();
      return app.alert('Cannot get Timeline data from server', 'danger');
    }
    if (timeline.length < 1) {
      $('#feed-progress-wrapper').hide();
      console.log('No rows found. At the end of timeline');
    }
    if (append) {
      timeline.reverse(); // XXXddahl: hack for now, need to reverse the sort oder in the server db query
    }
    for (var i = 0; i < timeline.length; i++) {
      // XXXddahl: check if we already have the item before decrypting
      //           and not add it to the feed

      // expecting data  properties of:
      // XXX: look for the user's avatar in the contacts Item
      // location, avatar, username, imageData, timestamp, statusText, humaneTimeStamp
      if (!timeline[i].value) {
        // this is some other kind of item, not a status update!
        // Ignore this for now, probably a 'trustedAt notification'
        // XXXddahl: need a way to filter these out of query at the server
        continue;
      }
      if (!timeline[i].value.status) {
        // this is some other kind of item, not a status update!
        // Ignore this for now, probably a 'trustedAt notification'
        // XXXddahl: need a way to filter these out of query at the server
        continue;
      }

      var localUser =
        (timeline[i].creatorUsername == app.username);
      var data = app.massageTimelineUpdate(timeline[i]);
      data.itemId = timeline[i].timelineId;
      var node = app.createMediaElement(data, localUser);
      if (append) {
        $('#my-feed-entries').append(node);
      } else {
        $('#my-feed-entries').prepend(node);
      }
      app.tlOptions.lastItemRead = timeline[i].timelineId;
      options.lastItemRead = timeline[i].timelineId;
    }
    $('#feed-progress-wrapper').hide();
    var user = app.hmacUser();
    console.log(options);
    if (!append) {
      app._profile[user].tlOptions = options;
      app.saveLocalProfile();
    }
    app.feedIsLoading = false;
    // display the more... button if it does not exist
    // if(!$("#fetch-previous-items").is(":visible")) {
    //   $("#fetch-previous-items").show();
    // }
    // XXXddahl: update the _prefs_ with the tlOptions, perhaps instead of using localStorage?
  });
};

app.loadTimelineInterval = function loadTimelineInterval() {
  if (app.loadingInterval) {
    return;
  }

  app.loadingInterval = window.setInterval(function () {
    app.loadFeed();
  }, (5 * 60 * 1000));
};

app.hmacUser = function () {
  return crypton.hmac('', app.username);
};

app.massageTimelineUpdate = function massageTimelineUpdate (data) {
  var avatar;
  if (data.creatorUsername == app.session.account.username) {
    avatar = app.session.items.avatar.value.avatar;
  } else {
    try {
      avatar = app.session.items._trusted_peers.value[data.creatorUsername].avatar;
    } catch (ex) {
      avatar = null;
    }
  }

  return {
    avatar: avatar,
    location: data.value.location,
    statusText: data.value.status,
    username: data.creatorUsername,
    imageData: data.value.imageData,
    timestamp: data.modTime,
    humaneTimestamp: humaneDate(new Date(data.modTime))
  };
};

app.loadRecentFeed = function loadRecentFeed () {
  // for now this is all feed hmacs we have in
  // items.feed.feedHmacs
  if (app.loadingInterval) {
    return;
  }
  $('#feed-progress-wrapper').show();
  var that = this;
  var hmacs = [];
  var feedHmacs = Object.keys(app.session.items.feed.value.feedHmacs);
  var feedLength = feedHmacs.length;
  if (!feedLength) {
    return;
  }
  var idx = 0;
  console.log('interval set...');
  app.loadingInterval = window.setInterval(function () {
    console.log('running an interval callback: ');
    if (idx >= feedHmacs.length) {
      // Reached the end of the feed
      app.clearLoadingInterval();
      return;
    }

    var itemNameHmac = feedHmacs[idx];
    var peerName =
      app.session.items.feed.value.feedHmacs[itemNameHmac].fromUser;
    if (peerName == app.username) { // XXXddahl: this is a hack, server should not be handing this item to us!
      idx++;
      return;
    }

    if (!peerName) {
      app.clearLoadingInterval();
      console.error('Cannot get peerName in feedHmacs object!?');
      return;
    }

    app.session.getPeer(peerName, function (err, peer) {
      if (err) {
        return console.error(err);
      }
      console.log(peer.username, itemNameHmac);
      app.session.getSharedItem(itemNameHmac, peer, function (err, item) {
        if (err) {
          return console.error(err);
        }
        // display the shared item!
	// XXXddahl: this function should just update a status object per
	// Peer that we attach an observer to in order to uopdate the DOM
	// We probably should not update the DOM from this interval and inside
	// a nested callback
        app.updatePeerStatus(peerName, item.value);
        if ((idx - 1) >= feedLength) {
	  app.clearLoadingInterval();
	  return;
        }
        idx++;
      });
    });
  }, 2000); // Every 2 seconds
};

app.clearLoadingInterval = function clearLoadingInterval() {
  $('#feed-progress-wrapper').hide();
  window.clearInterval(app.loadingInterval);
  app.loadingInterval = null;
  app.lastInterval = Date.now();
},

app.toggleSetStatusButton = function toggleSetStatusButton() {
  if ($('#set-my-status-btn').is(':visible')) {
    $('#set-my-status-btn').hide();
    $('#post-button-cog').show();
  } else {
    $('#post-button-cog').hide();
    $('#set-my-status-btn').show();
  }
};

app.setMyStatus = function setMyStatus() {
  app.toggleSetStatusButton();
  // validate length of data to be sent
  var status = $('#set-my-status-textarea').val();
  if (!status.length) {
    app.alert('Please enter a status update', 'info');
  }
  // update the item
  // XXXddahl: archive status into a day's history item
  var imageData;
  if ($('#my-image-to-post').children().length) {
    imageData = $('#my-image-to-post').children()[0].src;
  }
   var updateObj= {
    status: status,
    location: $('#my-geoloc').text(),
     timestamp: Date.now(),
     imageData: null
   };
  if (imageData) {
    updateObj.imageData = imageData;
  }

  app.session.items.status.value = updateObj;

  $('#set-my-status-textarea').val('');
  $('#my-image-to-post').children().remove();
  app.toggleSetStatusButton();
  // app.loadAndViewMyStatus();
  app.switchView('#feed', app.FEED_LABEL);
};

app.displayInitialView = function displayInitialView() {
  // Check for first run
  if (!app.firstRunIsNow) {
    $('#my-avatar')[0].src = app.session.items.avatar.value.avatar;
    app.switchView('#feed', app.FEED_LABEL);

    app.session.on('message', function (message) {
      console.log('session.on("message") event called', message);
      app.handleMessage(message);
    });

    // onSharedItemSync
    app.session.events.onSharedItemSync = function (item) {
      console.log('onSharedItemSync()', item);

      if (item.value.avatar) {
	// this is an avatar update
	console.log('we were handed an avatat Item!', item.value);
	app.updateContactAvatar(item.creator.username, item.value);
	return;
      }
      console.log('saving item to feed', item);
      app.saveItemToFeed(item, function (err) {
	if (err) {
          return console.error(err);
	}
	app.updatePeerStatus(item.creator.username, item.value);
      });
    };
    // Load the timeline
    app.loadFeed();
  }
};

app.updateContactAvatar = function updateContactAvatar (username, value) {
  if (!username || !value) {
    return console.error('Incorrect arguments, cannot update contact avatar');
  }
  app.session.items._trusted_peers.value[username].avatar = value.avatar;
  app.session.items._trusted_peers.save(function (err) {
    if (err) {
      console.error(err, 'Cannot update avatar for ' + username);
    }
  });
};

app.saveItemToFeed = function saveItemToFeed (item, callback) {
  console.log('saving item to Feed...');
  var itemNameHmac = item.getPublicName();
  var username = item.creator.username;

  if (app.session.items.feed.value.feedHmacs[itemNameHmac]) {
    console.log(itemNameHmac +  ' is already saved');
    return callback(null);
  }

  app.session.items.feed.value.feedHmacs[itemNameHmac] = {
    fromUser: username,
    itemNameHmac: itemNameHmac,
    timestamp: Date.now()
  };

  app.session.items.feed.save(function saveCallback (err) {
    if (err) {
      return callback(err);
    }
    app.session.getPeer(username, function (err, peer) {
      if (err) {
        console.error(err);
        return callback(err);;
      }
      // We need to load and watch this container
      app.session.getSharedItem(itemNameHmac, peer, function (err, statusItem) {
        if (err) {
          console.error(err);
          return callback(err);
        }
        app.updatePeerStatus(username, statusItem.value);
        callback(null);
      });
    });
  });
};

app.obfuscateLocation = function obfuscateLocation (location, decimalPlaces) {
  if (!decimalPlaces) {
    decimalPlaces = 2;
  }

  var gps = location.split(' ');
  var loc1 = new Number(gps[0]).toFixed(decimalPlaces);
  var loc2 = new Number(gps[1]).toFixed(decimalPlaces);

  return loc1 + ' ' + loc2;
};

app.createMediaElement = function createMediaElement(data, localUser) {
  var gps;
  if (data.location && data.location != 'undisclosed location') {
    // gps = app.obfuscateLocation(data.location);
    gps = data.location;
  } else {
    gps = 'undisclosed location';
  }
  var avatarMarkup;
  if (!data.avatar) {
    // Make a stand-in avatar
    avatarMarkup = '<span class="media-generic-avatar">'
      + data.username[0].toUpperCase()
      + '</span>';
  } else {
    var avatarData;
    if (localUser) {
      avatarData = app.session.items.avatar.value.avatar;
    } else {
      avatarData  = data.avatar;
    }
    avatarMarkup = '<img class="media-avatar" src="' + avatarData + '" alt="" />';
  }

  var imageHtml;
  if (data.imageData) {
    imageHtml = '<div><img class="feed-image" src="'
      + data.imageData  + '"/></div>';
  }

  var classId = data.username + '-' + data.timestamp;
  var itemId = data.username + '-' + data.itemId;
  var html = '<div id="' + data.itemId  + '" class="media attribution ' + classId + ' ' + itemId + '">'
	+ '<a class="img">'
        + avatarMarkup
  	+ '  </a>'
	+ '  <div class="bd media-metadata">'
	+ '    <span class="media-username">' + data.username + '</span>'
	+ '    <span class="media-status">' + data.statusText + '</span>'
        + '    <br />'
	+ '    <span class="media-timestamp">' + data.humaneTimestamp + '</span>'
        + '    <span class="media-location">' + gps + '</span>';
  if (imageHtml) {
    html = html + imageHtml;
  }
  html = html
    + '  </div>'
    + '</div>';

  return $(html);
};

app.loadAndViewMyStatus = function loadAndViewMyStatus () {
  console.log('loadAndViewMyStatus()');
  var location = app.session.items.status.value.location
    || 'undisclosed location';
  var statusData = { username: app.username,
                     statusText: app.session.items.status.value.status,
                     location: location,
                     humaneTimestamp: humaneDate(new Date(app.session.items.status.value.timestamp)),
		     timestamp: app.session.items.status.value.timestamp,
		     imageData: app.session.items.status.value.imageData || '',
		     avatar: app.avatarPath
                   };

  app.displayMyStatus(statusData);
  app.clearLoginStatus();
  app.switchView('#feed', app.FEED_LABEL);
};

app.displayMyStatus = function displayMyStatus (statusData) {
  console.log('displayMyStatus()', arguments);
  $('#my-status-wrapper').children().remove();
  console.log(statusData);
  var mediaElement = app.createMediaElement(statusData, true);
  console.log(mediaElement);
  $('#my-status-wrapper').append(mediaElement);
};


app.shareStatus = function shareStatus (peerObj) {
  console.log('shareStatus()', arguments);

  function shareAvatar(peer) {
    if (app.session.items.avatar.value.avatar) {
      app.session.items.avatar.share(peer, function (err) {
	if (err) {
	  console.error(err);
	  console.error('cannot share avatar with ' + peer.username);
	}
      });
    }
  }

  if (typeof peerObj == 'string') {
    // share status container with peer
    app.session.getPeer(peerObj, function (err, peer) {
      if (err) {
        console.error('Cannot get peer!', err);
        return;
      }
      app.session.items.status.share(peer, function (err) {
        if (err) {
          console.log(err);
          return;
        }
	shareAvatar(peer);
      });
    });
  } else if (typeof peerObj == 'object') {
    app.session.items.status.share(peerObj, function (err) {
      if (err) {
        console.error(err, 'Cannot shareStatus!');
        return;
      }
      shareAvatar(peerObj);
    });
  } else {
    console.error('peerObject is wrong type!');
  }
};

// app.revokeSharedStatus = function revokeSharedStatus(peer) {
//   // revoke shared status with peer
// };

app.handleMessage = function handleMessage (message) {
  // just add the shared container hmac + username to the feed container
  console.log('handleMessage();', arguments);
  if (message.headers.notification != 'sharedItem') {
    return;
  }

  var itemNameHmac = message.payload.itemNameHmac;
  var username = message.payload.from;
  // cache the hmac sent to us!
  var newFeedHmac = {
    fromUser: username,
    itemNameHmac: itemNameHmac,
    timestamp: Date.now()
  };

  if (app.session.items.feed.value.feedHmacs[itemNameHmac]) {
    app.session.getPeer(username, function (err, peer) {
      if (err) {
        console.error(err);
        return;
      }
      // We need to load and watch this container
      app.session.getSharedItem(itemNameHmac, peer, function (err, statusItem) {
        if (err) {
          console.error(err);
          return;
        }
        // delete this inbox message
        app.deleteInboxMessage(message.messageId);
	// If this is an avatar, save to contacts
	if (statusItem.value.avatar) {
	  app.updateContactAvatar(username, statusItem.value);
	  // XXXddahl: Update timeline with a "new avatar message??"
	} else {
          // create status item, prepend to the top of the list
          app.updatePeerStatus(username, statusItem.value);
        }
      });
    });
  } else {
    app.session.items.feed.value.feedHmacs[itemNameHmac] = newFeedHmac;
    app.session.items.feed.save(function saveCallback (err) {
      if (err) {
        console.error(err);
      }
      app.session.getPeer(username, function (err, peer) {
        if (err) {
          console.error(err);
          return;
        }
        // We need to load and watch this container
        app.session.getSharedItem(itemNameHmac, peer, function (err, statusItem) {
          if (err) {
            console.error(err);
            return;
          }
          // delete this inbox message
          app.deleteInboxMessage(message.messageId);
          // check for existing status, remove from DOM,
          // re-create status, prepend to the top of the list
          app.updatePeerStatus(username, statusItem.value);
          app.saveItemToFeed(newFeedHmac, function (err) {
            if (err) {
              console.error('Cannot save Item to feed');
            }
          });
        });
      });
    });
  }
};

app.deleteInboxMessage = function (messageId) {
  console.log('deleteInboxMessage()', arguments);
  app.session.inbox.delete(messageId, function (err) {
    if (err) {
      console.error('Cannot delete message, ID: ' + messageId, err);
      return;
    }
    app.purgeInboxMessage(messageId);
  });
};

app.purgeReadMessages = function purgeReadMessages() {
  var ids = Object.keys(app.session.inbox.messages);
  for (var i = 0; i < ids.length; i++) {
    app.deleteInboxMessage(ids[i]);
  }
};

app.purgeInboxMessage = function purgeInboxMessage (id) {
  console.log('purgeInboxMessage()', arguments);
  if (!id) {
    return;
  }
  var _id = new Number(id);
  for (var i = 0; i < app.session.inbox.rawMessages.length; i++) {
    if (app.session.inbox.rawMessages[i].messageId == id) {
      app.session.inbox.rawMessages.splice(i, 1);
      break;
    }
  }
  delete app.session.inbox.messages[id];
};

app.updatePeerStatus = function updatePeerStatus(username, statusItem) {
  console.log('updatePeerStatus()', arguments);
  var klass = '.' + username + '-' + statusItem.timestamp;
  console.log('klass: ', klass);
  var checkDupes = $(klass);
  if (checkDupes.length > 0) {
    // Lets not prepend a duplicate status update:)
    return;
  }

  statusItem.username = username;
  statusItem.statusText = statusItem.status;
  statusItem.humaneTimestamp = humaneDate(new Date(statusItem.timestamp));
  statusItem.avatar = app.session.items._trusted_peers.value[username].avatar;

  var statusNode = app.createMediaElement(statusItem);
  $('#my-feed-entries').prepend(statusNode);
};

app.setMyLocation = function setMyLocation() {
  // set location data to the location div
  var accuracy = true;
  var options = {
    enableHighAccuracy: accuracy,
    timeout: 10000,
    maximumAge: 6000
  };

  function success(pos) {
    var crd = pos.coords;
    var gps = crd.latitude + ' ' + crd.longitude;
    var obfuGps = app.obfuscateLocation(gps) + ' ';
    $('#my-geoloc').text(obfuGps);

    var lat = new Number(crd.latitude).toFixed(1);
    var lng = new Number(crd.longitude).toFixed(1);
    var geoIdx = lat + '__' + lng;

    if (!app.getPlaceName) {
      // load the geoPlaces script
      $.ajaxSetup({
	cache: true
      });
      console.log('loading geo-places...');
      $.getScript( "js/geo-places.js", function( data, textStatus, jqxhr ) {
	console.log( "geo-places is loaded" );
	app.getPlaceName = function getPlaceName (geoIdx) {
	  var placeArr = window.geoPlaces[geoIdx];
	  if (placeArr) {
	    return placeArr[0] + ' ' +  placeArr[2] + ' ' + placeArr[1];
	  } else {
	    return 'unknown';
	  }
	};
	var name = app.getPlaceName(geoIdx);
	app.setLocationName(name);
      });
    } else {
      var name = app.getPlaceName(geoIdx);
      app.setLocationName(name);
    }
  };

  function error(err) {
    console.error('Cannot set location');
    console.error(err);
  };

  navigator.geolocation.getCurrentPosition(success, error, options);
};

app.setLocationName = function setLocationName (name) {
  var html = ' <span id="geoloc-name"> <i>near</i> '
	+ name
	+ '</span>';
  $('#my-geoloc').append($(html));
};

app.logoutCleanup = function logoutCleanup() {
  // remove all status updates and my status
  $('.my-status-node').text('');
  $('#my-feed-entries').children().remove();
  // Set loadingInterval to null
  app.clearLoadingInterval();
};

// XXXddahl: TODO

// makePictureAvatar(base64PngData)

// Check for the user's current TZ and use it to display all dates

// Add a "mood" checkbox with a color picker:)
