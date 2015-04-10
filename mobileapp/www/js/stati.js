app.STATUS_CONTAINER = '_my_status_';

app.FEED_CONTAINER = '_my_feed_';

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

app.setCustomEvents = function setCustomEvents () {
  $('#my-stati').click(function () {
    app.hideMenu();
    // XXXddahl:  reset status UI
    app.switchView('#stati', 'Set Status');
    $('#set-my-status-textarea').focus();
  });

  $('#my-feed').click(function () {
    app.hideMenu();
    app.loadAndViewMyStatus();
  });

  $('#set-my-status-btn').click(function (){
    app.setMyStatus();
  });

  $('#set-my-geoloc-btn').click(function (){
    app.setMyLocation();
  });
};

app.customInitialization = function customInitialization() {
  console.log('customInitialization()');
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

app.loadingFeed = false;

app.loadRecentFeed = function loadRecentFeed() {
  // for now this is all feed hmacs we have in
  // items.feed.feedHmacs
  if (app.loadingFeed == true) {
    return;
  }
  var that = this;
  this.loadingFeed = true;
  var hmacs = [];
  var feedHmacs = Object.keys(app.session.items.feed.value.feedHmacs);
  var feedLength = feedHmacs.length;
  if (!feedLength) {
    return;
  }
  var idx = 0;
  // XXXddahl: Need a way to cancel this timeout
  app.loadingInterval = window.setInterval(function () {
    console.log('interval started...');
    if (idx == feedHmacs.length) {
      // Reached the end of the feed
      window.clearInterval(that.loadingInterval);
      that.loadingFeed = true;
      that.loadingInterval = null;
      return;
    }
    var itemNameHmac = feedHmacs[idx];
    var peerName =
      app.session.items.feed.value.feedHmacs[itemNameHmac].fromUser;
    app.session.getPeer(peerName, function (err, peer) {
      if (err) {
        return console.error(err);
      }
      app.session.getSharedItem(itemNameHmac, peer, function (err, item) {
        if (err) {
          return console.error(err);
        }
        // display the shared item!
        app.updatePeerStatus(peerName, item.value);
        if ((idx - 1) == feedLength) {
          that.loadingFeed = false;
          window.clearInterval(that.loadingInterval);
          that.loadingInterval = null;
        }
        idx++;
      });
    });
  }, 5000);
};

app.getContainerByName = function getContainerByName(container) {
  for (var i = 0; i < app.session.containers.length; i++) {
    if (app.session.containers[i].name == container) {
      return app.session.containers[i];
    }
  }
};

app.setMyStatus = function setMyStatus() {
  // validate length of data to be sent
  var status = $('#set-my-status-textarea').val();

  // update the item
  // XXXddahl: archive status into a day's history item
  app.session.items.status.value = {
    status: status,
    location: $('#my-geoloc').text(),
    timestamp: Date.now()
  };

  $('#set-my-status-textarea').val('');
  app.loadAndViewMyStatus();
};

app.displayInitialView = function displayInitialView() {
  app.loadAndViewMyStatus();
  app.loadRecentFeed();

  app.session.on('message', function (message) {
    console.log('session.on("message") event called', message);
    app.handleMessage(message);
  });

  // onSharedItemSync
  app.session.events.onSharedItemSync = function (item) {
    console.log('onSharedItemSync()', item);
    app.saveItemToFeed(item, function (err) {
      if (err) {
        return console.error(err);
      }
      app.updatePeerStatus(item.creator.username, item.value);
    });
  };
};

app.saveItemToFeed = function saveItemToFeed (item, callback) {
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

app.loadAndViewMyStatus = function loadAndViewMyStatus () {
  console.log('loadAndViewMyStatus()', arguments);
  var location = app.session.items.status.value.location
    || 'undisclosed location';
  var statusData = { username: app.username,
                     myStatus: app.session.items.status.value.status,
                     location: location,
                     timestamp: new Date(app.session.items.status.value.timestamp)
                   };

  app.displayMyStatus(statusData);

  app.switchView('#feed', app.FEED_LABEL);
};

app.displayMyStatus = function displayMyStatus (statusData) {
  console.log('displayMyStatus()', arguments);
  $('#my-handle').text(statusData.username);
  $('#my-status-text').text(statusData.myStatus);
  $('#my-status-location').text(statusData.location || 'undisclosed location');
  $('#my-status-updated').text(statusData.timestamp);
};

app.shareStatus = function shareStatus (peerObj) {
  console.log('shareStatus()', arguments);
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
      });
    });
  } else if (typeof peerObj == 'object') {
    app.session.items.status.share(peerObj, function (err) {
      if (err) {
        console.error(err, 'Cannot shareStatus!');
        return;
      }
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

  var username = message.payload.from;
  var itemNameHmac = message.payload.itemNameHmac;
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
        // check for existing status, remove from DOM,
        // re-create status, prepend to the top of the list
        app.updatePeerStatus(username, statusItem.value);
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
  var checkDupes = $(klass);
  if (checkDupes.length > 0) {
    // Lets not prepend a duplicate status update:)
    return;
  }
  var statusNode = app.createStatusUpdateNode(username, statusItem);
  $('#my-feed-entries').prepend(statusNode);
};

app.createStatusUpdateNode = function (username, statusItem) {
  console.log('createStatusUpdateNode()', arguments);
  var location = statusItem.location || 'undisclosed location';
  var date = new Date(statusItem.timestamp);
  var klass = username + '-' + statusItem.timestamp;
  var statusUpdate = '<div class="status-update '
                   + klass
                   + '">'
                   + '<h4 class="status-update-username">'
                   + username
                   + '</h4>'
                   + '<div class="status-update-data">'
                   + '<span class="status-text">'
                   + statusItem.status
                   + '</span>'
                   + '<ul class="status-metadata">'
                   + '<li>'
                   + location
                   + '</li>'
                   + '<li>'
                   +  date
                   + '</li>'
                   + '</ul>'
                   + '</div>';

  return $(statusUpdate);
};

app.setMyLocation = function setMyLocation(highAccuracy) {
  // set location data to the location div
  var accuracy = highAccuracy || false;
  var options = {
    enableHighAccuracy: highAccuracy,
    timeout: 10000,
    maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
    $('#my-geoloc').text(crd.latitude + ' ' + crd.longitude);
  };

  function error(err) {
    console.warn('ERROR(' + err.code + '): ' + err.message);
  };

  navigator.geolocation.getCurrentPosition(success, error, options);
};

// XXXddahl: TODO

// on login: *load latest status*, switch to feed screen
  // iterate feed container, setInterval on each

// style feed page

// makePictureAvatar(base64PngData)

// makeAsciiAvatar()

// Check for the user's current TZ and use it to display all dates

// Add a "mood" checkbox with a color picker:)
