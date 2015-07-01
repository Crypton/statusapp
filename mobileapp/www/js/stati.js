// This file is the application specific code and includes all implemented functions expected by index.js

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

app.sharingUrl = 'https://zk.gs/ZK/';

app.sharingMessage = 'I would like to share messages with you privately via an app called "Kloak". \n\nThis message\'s attachment is my \'App Contact card\', which users exchange in order to establish a private connection. \n\nFor more information: https://zk.gs/ZK/';

app.sharingTitle = 'Just started using Kloak...';

app.ITEMS = {
  firstRun: 'firstRun',
  feed: 'feed',
  status: 'status',
  avatar: 'avatar'
};

app.FEED_LABEL = 'Feed';

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
  if (app.session) {
    app.loadNewTimeline();
    // XXX: need to also check if there were items between latestVisible & newest-first item
  }
};

app.pauseEventHandler = function pauseEventHandler () {
  app.feedIsLoading = false;
  $('#top-progress-wrapper').hide();
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

app.aboutView = function _aboutView () {
  var header = 'About Kloak';
  var logos = '<p><img class="app-logo" src="img/spideroak_logo.png" /> </p>';
  var info = 'Kloak is an <strong>*experiment*</strong> in social networking that is un-dataminable. All data sent to the server is "end to end" encrypted and unreadable by the server operator. <br /> Kloak is in beta and <strong>should not be used to hide communications from well-equipped potential attackers</strong> <p><a onclick="window.open(\'https://github.com/Crypton/statusapp\', \'_system\')" class="media-link media-link-url">Kloak Source code and issue tracker</a> <br />Kloak is built with <a onclick="window.open(\'https://crypton.io\', \'_system\')" class="media-link media-link-url">Crypton</a> by <a onclick="window.open(\'https://spideroak.com\', \'_system\')" class="media-link media-link-url">SpiderOak</a></p>';

  var html = '<div id="about-view"><h4>'
	+ header
        + '</h4>'
	+ '<p>'
        + info
	+ '</p>'
	+ '<p>'
	+ logos
	+ '</p>'
	+ '</div>';
  $('#app-about').children().remove();
  $('#app-about').append($(html));
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
    app.switchView('#feed', app.FEED_LABEL);
  });

  $('#header-refresh-btn').click(function () {
    app.hideMenu();
    app.switchView('#feed', app.FEED_LABEL);
    app.loadNewTimeline();
  });

  $('#refresh-feed').click(function () {
    app.hideMenu();
    app.switchView('#feed', app.FEED_LABEL);
    app.loadNewTimeline();
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
    app.loadPastTimeline();
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

app.tlOptions = { lastItemRead: 0, offset: 0, limit: 5 };

app.feedIsLoading = false;

app.loadNewTimeline = function loadNewTimeline () {
  if (app.feedIsLoading) {
    return;
  }
  app.feedIsLoading = true;

  $('#top-progress-wrapper').show();
  var afterId = $("#my-feed-entries").children().first().attr('id');
  if (typeof parseInt(afterId) == 'number') {
    var options = { limit: 15, afterId: afterId };
    app.session.getTimelineAfter(options, function tlCallback (err, timeline) {
      if (err) {
	console.error(err);
	app.feedIsLoading = false;
	$('#top-progress-wrapper').hide();
	return app.alert('Cannot get feed', 'info');
      }
      app.renderTimeline(timeline);
      $('#top-progress-wrapper').hide();
      app.feedIsLoading = false;
    });
  } else {
    $('#top-progress-wrapper').hide();
    app.feedIsLoading = false;
    console.error('Cannot get afterId');
  }
};

app.statusNameHmac = function statusNameHmac() {
  return app.session.items.status.getPublicName();
};

app.loadInitialTimeline = function loadInitialTimeline(callback) {
  if (app.feedIsLoading) {
    return;
  }
  app.feedIsLoading = true;

  $('#top-progress-wrapper').show();
  var options = { limit: 15 };
  app.session.getLatestTimeline(options, function tlCallback (err, timeline) {
    if (err) {
      console.error(err);
      app.feedIsLoading = false;
      $('#top-progress-wrapper').hide();
      return app.alert('Cannot get feed', 'info');
    }
    app.renderTimeline(timeline);
    $('#top-progress-wrapper').hide();
    app.feedIsLoading = false;
    if ($('.empty-timeline-element').length > 9) {
      app.loadPastTimeline();
    }
  });
};

app.loadPastTimeline = function loadPastTimeline () {
  if (app.feedIsLoading) {
    return;
  }
  app.feedIsLoading = true;

  $('#top-progress-wrapper').show();
  var beforeId = $("#my-feed-entries").children().last().attr('id');
  if (typeof parseInt(beforeId) == 'number') {
    var emptyItems = $('.empty-timeline-element').length; 
    var options = { limit: 15, beforeId: beforeId };
    app.session.getTimelineBefore(options, function tlCallback (err, timeline) {
      if (err) {
	console.error(err);
	app.feedIsLoading = false;
	$('#top-progress-wrapper').hide();
	return app.alert('Cannot get feed', 'info');
      }
      // TRY??
      app.renderTimeline(timeline, true);
      $('#top-progress-wrapper').hide();
      app.feedIsLoading = false;
      var newEmptyItems = $('.empty-timeline-element').length;
      // if ((newEmptyItems - emptyItems) > 9) {
      // 	app.loadPastTimeline();
      // }
    });
  } else {
    $('#top-progress-wrapper').hide();
    app.feedIsLoading = false;
    console.error('cannot get beforeId');
  }
};

app.renderTimeline = function renderTimeline (timeline, append) {
  var trustedPeersUpdated = false;
  if (!timeline.length) {
    return;
  }
  
  for (var i = 0; i < timeline.length; i++) {
    console.log(timeline[i]);
    var node;
    if (!timeline[i].value) {
      // this is some other kind of item, not a status update!
      // Ignore this for now, probably a 'trustedAt notification'
      node = app.createEmptyElement(timeline[i]);
      if (append) {
	$('#my-feed-entries').append(node);
      } else {
	$('#my-feed-entries').prepend(node);
      }
      continue;
    }
    if (!timeline[i].value.status) {
      // this is some other kind of item, not a status update!
      // Ignore this for now, probably a 'trustedAt notification'
      node = app.createEmptyElement(timeline[i]);
      if (append) {
	$('#my-feed-entries').append(node);
      } else {
	$('#my-feed-entries').prepend(node);
      }
      continue;
    }
    if (timeline[i].value.avatar) {
      // this is some other kind of item, not a status update!
      // Ignore this for now, probably a 'trustedAt notification'
      console.log('avatar update object: ', timeline[i], timeline[i].value);
      node = app.createAvatarUpdateElement(data);
      if (append) {
	$('#my-feed-entries').append(node);
      } else {
	$('#my-feed-entries').prepend(node);
      }

      // when we get a new avatar we need to save it to the contacts object
      var user = timeline[i].creatorUsername;
      if (!app.session.items._trusted_peers.value[user]) {
        // Let's tell the user about this 1 way connection
        console.warn('User ', user, ' is not trusted - one way connection');
	console.warn('User ', user, ' is not trusted - Adding this peer to contacts as *untrusted*');
	// add this usser to contacts as an untrusted user
	app.session.items._trusted_peers.value[user] = { avatar: null,
						         trustedAt: null,
							 avatarUpdated: null,
							 fingerprint: null
						       };
	app.newContactDiscovered = true;
      }
      continue;
    }
    // Begin status update handling
    var localUser = (timeline[i].creatorUsername == app.username);
    var data = app.massageTimelineUpdate(timeline[i]);
    data.itemId = timeline[i].timelineId;
    console.log('rendered timelineid: ', timeline[i].timelineId);
    node = app.createMediaElement(data, localUser);
    if (append) {
      $('#my-feed-entries').append(node);
    } else {
      $('#my-feed-entries').prepend(node);
    }
  }
  // display the more... button if it does not exist
  if (!$("#fetch-previous-items").is(":visible")) {
    $("#fetch-previous-items").show();
  }
};

app.createEmptyElement = function createEmptyElement(timelineItem) {
  var html = '<div id="'
	+ timelineItem.timelineId
	+ '" class="empty-timeline-element"></div>';
  return $(html);
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

app.toggleSetStatusProgress = function toggleSetStatusProgress() {
  if(!$("#top-progress-wrapper").is(":visible")) {
    $("#button-row").hide();
    $("#top-progress-wrapper").show();
  } else {
    $("#button-row").show();
    $("#top-progress-wrapper").hide();
  }
};

app.setMyStatus = function setMyStatus() {
  // app.toggleSetStatusButton();
  // validate length of data to be sent
  var status = $('#set-my-status-textarea').val();
  if (!status.length) {
    return app.alert('Please enter a status update', 'warning');
  }
  if (status.length > 512) {
    return app.alert('Status update is too long, please shorten it', 'danger');
  }
  // update the item
  app.toggleSetStatusProgress();
  var imageData;
  if ($('#my-image-to-post').children().length) {
    imageData = $('#my-image-to-post').children()[0].src;
  }
  // XXX: need to parse out all HTML and entityify it
   var updateObj= {
     status: status,
     location: $('#my-geoloc').text(),
     timestamp: Date.now(),
     imageData: null
   };
  if (imageData) {
    updateObj.imageData = imageData;
  }

  app.session.items.status.value.status = updateObj.status;
  app.session.items.status.value.location = updateObj.location;
  app.session.items.status.value.timestamp = updateObj.timestamp;
  app.session.items.status.value.imageData = updateObj.imageData;

  app.session.items.status.save(function (err) {
    if (err) {
      app.toggleSetStatusProgress();
      console.error(err);
      return app.alert('Cannot update status', 'danger');
    }
    $('#set-my-status-textarea').val('');
    $('#my-image-to-post').children().remove();
    app.switchView('#feed', app.FEED_LABEL);
    app.toggleSetStatusProgress();
    app.loadNewTimeline();
  });
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
	console.log('we were handed an avatar Item!', item.value);
	app.updateContactAvatar(item.creator.username, item.value);
	return;
      }
    };
    // Load the timeline
    app.loadInitialTimeline();
  } else {
    $('#first-run-empty-feed-btn').show();
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

app.obfuscateLocation = function obfuscateLocation (location, decimalPlaces) {
  if (!decimalPlaces) {
    decimalPlaces = 2;
  }

  var gps = location.split(' ');
  var loc1 = new Number(gps[0]).toFixed(decimalPlaces);
  var loc2 = new Number(gps[1]).toFixed(decimalPlaces);

  return loc1 + ' ' + loc2;
};

app.createAvatarUpdateElement =
function createAvatarUpdateElement(data) {
  // data = {avatar: 'hajshjahjsjahj', updated: 123456789}

  var timestamp = humaneDate(new Date(data.modTime));
  var html = '<div id="' + data.itemId
           + '" class="media attribution">'
	   + '<a class="img">'
           + '<img class="media-avatar" src="' + data.avatar
           + '" />'
  	   + '</a>'
           + '  <div class="bd media-metadata">'
	   + '    <span class="media-username">' + data.username + '</span>'
	   + '    <div class="media-avatar-update">'
	   + 'avatar updated ' + timestamp
           + '</div>'
           + '  </div>'
           + '</div>';
  return $(html);
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
    imageHtml = '<div class="post-img"><img class="feed-image" src="'
      + data.imageData  + '"/></div>';
  }

  var classId = data.username + '-' + data.timestamp;
  var itemId = data.username + '-' + data.itemId;
  var status = '';
  if (data.statusText) {
    status = Autolinker.link(data.statusText,
                             { className: 'media-link',
                               replaceFn: app.linkOutput });
  }

  console.log(status);
  console.log('data.itemId: ', data.itemId);
  var html = '<div id="' + data.itemId
           + '" class="media attribution ' + classId + ' ' + itemId + '">'
	   + '<a class="img">'
           + avatarMarkup
  	   + '  </a>'
           + '  <div class="bd media-metadata">'
           + '    <div class="status-block">'
	   + '    <span class="media-username">' + data.username + '</span>'
	   + '    <span class="media-status">'
	   + status
           + '</span></div>'
	   + '    <span class="media-timestamp">'
           + data.humaneTimestamp + '</span>'
           + '    <span class="media-location">'
           + gps + '</span>';
  if (imageHtml) {
    html = html + imageHtml;
  }
  html = html
    + '  </div>'
    + '</div>';

  return $(html);
};

app.linkOutput = function linkOutput(autolinker, match) {
  var text = match.getAnchorText();
  var href = match.getAnchorHref();

  function makeLink(url, klass) {
    var link = '<a href="#" class="media-link media-link-'
             + klass
             + '" onclick="'
             + 'window.open(\'' + url  + '\', \'_system\', \'\')">'
             + text
             + '</a>';
    return link;
  }

  switch(match.getType()) {
    case 'url' :
      return makeLink(match.getUrl(), 'url');
    case 'email' :
      var email = match.getEmail();
      return makeLink(email, 'email');
    case 'phone' :
      return true;
      // var phoneNumber = match.getPhoneNumber();
      // return makeLink(phoneNumber, 'phone');
    case 'twitter' :
      var twitterHandle = match.getTwitterHandle();
      return makeLink(twitterHandle, 'twitter');
    case 'hashtag' :
      var hashtag = match.getHashtag();
      return makeLink(hashtag, 'hashtag');
    default:
      return true;
  }
};

app.openDeviceBrowser = function openDeviceBrowser(link) {

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
};

// XXXddahl: TODO

// makePictureAvatar(base64PngData)

// Check for the user's current TZ and use it to display all dates

// Add a "mood" checkbox with a color picker:)
