app.STATUS_CONTAINER = '_my_status_';

app.FEED_CONTAINER = '_my_feed_';

app.ITEMS = {
  firstRun: 'firstRun',
  feed: 'feed',
  status: 'status',
  avatar: 'avatar'
};

app.FEED_LABEL = 'Stati.es Feed';

app.INITIAL_STATUS_MESSAGE = 'Current Status: null';

app.isReady = false;

app.statusContainer = null;

app.postPeerTrustCallback = function postPeerTrustCallback(peer) {
  console.log('postPeerTrustCallback()');
  // We now trust this peer and can share containers, etc.
  // This is generally only ever called once after adding a contact
  // and trusting them.
  app.shareStatus(peer);
};

app.setCustomEvents = function setCustomEvents () {
  $('#my-stati').click(function () {
    app.hideMenu();
    // XXXddahl:  reset status UI
    app.switchView('#stati', 'Set Status');
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

  app.createInitialItems(function (err) {
    if (err) {
      return console.error(err);
    }
    console.log('Initial items fetched or created');
  });
};

app.createInitialItems = function createInitialItems (callback) {
  app.session.getOrCreateItem(app.ITEMS.feed, function (err, feed) {
    if (err) {
      callback(err);
      return console.error(err);
    }

    if (!feed.value.feedHmacs) {
      feed.value = { feedHmacs: [], lastUpdated: Date.now() };
    }

    app.session.getOrCreateItem(app.ITEMS.status, function (err, status) {
      if (err) {
        callback(err);
        return console.error(err);
      }

      if (!status.value.status) {
        status.value = { status: 'Hello World!', timestamp: Date.now() };
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
  // add to the container
  app.statusContainer.keys['myStatus'] = status;
  app.statusContainer.keys['updated'] = Date.now();
  app.statusContainer.keys['location'] = $('#my-geoloc').text();
  // save container
  app.statusContainer.save(function (err) {
    if (err) {
      console.error(err);
      app.alert('Cannot update status, try again in a moment');
      return;
    }
    // clean up form
    $('#set-my-status-textarea').val('');

    app.loadAndViewMyStatus();
  });
};

app.loadAndViewMyStatus = function loadAndViewMyStatus () {
  console.log('loadAndViewMyStatus()', arguments);
  var statusData = { username: app.username,
                     myStatus: app.statusContainer.keys['myStatus'],
                     location: app.statusContainer.keys['location'],
                     updated: new Date(app.statusContainer.keys['updated'])
                   };

  app.displayMyStatus(statusData);

  app.switchView('#feed', app.FEED_LABEL);
  // XXXddahl: keep track of recently shared status. Try not to call this except when needed
  app.shareStatusWithAll();
};

app.displayMyStatus = function displayMyStatus (statusData) {
  console.log('displayMyStatus()', arguments);
  $('#my-handle').text(statusData.username);
  $('#my-status-text').text(statusData.myStatus);
  $('#my-status-location').text(statusData.location);
  $('#my-status-updated').text(statusData.updated);
};

app.addSharedContainerToFeed = function (containerNameHmac, peerName) {
  console.log('addSharedContainerToFeed()', arguments);
  app.session.load(app.FEED_CONTAINER, function (err, feedContainer) {
    if (err) {
      console.error(err);
      return;
    }

    if (feedContainer.keys['feed'][containerNameHmac]) {
      return;
    }
    feedContainer.keys['feed'][containerNameHmac] = {
      containerNameHmac: containerNameHmac,
      peerName: peerName,
      updated: Date.now()
    };
  });
},

app.shareStatusWithAll = function shareStatusWithAll() {
  console.log('shareStatusWithAll()');
  // XXXddahl: This is a bit naive as we should not assume that we are sharing our status with every contact. Ok for now though.
  var contactsContainer = app.getContainerByName('_trust_state');
  var shareArr = [];
  var contacts = Object.keys(contactsContainer.keys);
  for (var i = 0; i < contacts.length; i++) {
    var peerName = contacts[i]
    // We should just share our container with each peer
    var shareCallback = function _shareCallback() {
      app.shareStatus(peerName);
    };
    shareArr.push(shareCallback);
  }

  var timeout = 0;
  // XXXddahl: yes, again this is naive, but ok for now or smaller status groups
  for (i = 0; i < shareArr.length; i++) {
    timeout = timeout + 5000;
    setTimeout(shareArr.pop(), timeout);
  }
};

app.createStatusContainer = function createStatusContainer() {
  // Check if it is already created first...
  console.log('createStatusContainer()');
  app.loadOrCreateContainer(app.STATUS_CONTAINER, function (err, container) {
    if (err) {
      console.error(err);
      app.alert(err, 'danger');
      return;
    }
    app.statusContainer = container;
    app.statusContainer['keys'].myStatus = app.INITIAL_STATUS_MESSAGE;
    app.statusContainer.save(function (err) {
      if (err) {
        console.error(err);
        app.alert(err, 'danger');
      }
      // now create/load the feed container
      app.loadOrCreateContainer(
        app.FEED_CONTAINER, function (err, feedContainer) {
        if (err) {
          console.error(err);
          return;
        }
        if (!app.feedContainer) {
          app.feedContainer = feedContainer;
        }
        if (!feedContainer.keys['feed']) {
          feedContainer.keys['feed'] = {};
        }

        feedContainer.save(function (err) {
          app.isReady = true;
          // set message event handler
          app.session.on('message', function (message) {
            console.log('session.on("message") event called', message);
            app.handleMessage(message);
          });

          app.inboxPollInterval = setInterval(function () {
            if (app.pollInProgress) { // XXXddahl: remove this check
              return;
            }

            // XXXddahl:
            // Perhaps want to avoid using poll() to avoid decrypting all
            // the time. getAllMetadata() will allow us to discover new
            // peer sharing events without any decryption

            // XXXddahl: use getAllMetaData, setTimeout on each call to get(id) ??
            // XXXddahl: Can we postMessage to a worker the cipherMessage + keys?


            app.session.inbox.poll(function (err, messages) {
              app.pollInProgress = true;
              for (var prop in app.session.inbox.messages) {
                app.handleMessage(app.session.inbox.messages[prop]);
              }
            });
          }, 10000);

          // Switch to the Feed view
          app.loadAndViewMyStatus();
        }); // feedContainer saved
      }); // feed container created/loaded

    }); // status container saved
  }); // status container loaded
};

app.pollInProgress = false;

app.shareStatus = function shareStatus (peerObj) {
  console.log('shareStatus()', arguments);
  if (typeof peerObj == 'string') {
    // share status container with peer
    app.session.getPeer(peerObj, function (err, peer) {
      if (err) {
        console.error('Cannot get peer!', err);
        return;
      }
      app.statusContainer.share(peer, function (err) {
        if (err) {
          console.log(err);
          return;
        }
      });
    });
  } else if (typeof peerObj == 'object') {
    app.statusContainer.share(peerObj, function (err) {
      if (err) {
        console.error(err, 'Cannot shareStatus!');
        return;
      }
    });
  } else {
    console.error('peerObject is wrong type!');
  }
};

app.revokeSharedStatus = function revokeSharedStatus(peer) {
  // revoke shared status with peer
};

app.handleMessage = function handleMessage(message) {
  // just add the shared container hmac + username to the feed container
  console.log('handleMessage();', arguments);
  if (message.headers.action != 'containerShare') {
    return;
  }

  var username = message.payload.fromUsername;
  var containerNameHmac = message.payload.containerNameHmac;

  app.session.getPeer(username, function (err, peer) {
    if (err) {
      console.error(err);
      return;
    }
    // XXXddahl: check if we have a cached container, if so, it should already be watched()
    if (app.checkContainerCacheStatus(containerNameHmac)) {
      return;
    }
    // We need to load and watch this container
    app.session.loadWithHmac(containerNameHmac, peer, function (err, statusContainer) {
      if (err) {
        console.error(err);
        return;
      }

      // delete this inbox message
      app.deleteInboxMessage(message.messageId);

      // check for existing status, remove from DOM, re-create status, prepend to the top of the list
      app.updatePeerStatus(username, statusContainer);
      // app.pollInProgress = false;
      // XXXddahl: We do not need to watch container if _listener is present
      if (!statusContainer._listener) {
        app.watchContainer(statusContainer);
      }
    });
  });
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

app.watchContainer = function watchContainer(statusContainer) {
  console.log('watchContainer()', arguments);
  statusContainer.watch(function () {
    // Need to update the status data here.
    // XXXddahl: is this function part of the container object?
    // Can we just get the container with 'this'?
    var username = this.peer.username;
    app.updatePeerStatus(username, this);
  });
  // add the statusContainer meta data to our feedContainer
  app.session.load(app.FEED_CONTAINER, function (err, feedContainer) {
    if (err) {
      console.error(err);
      return;
    }

    feedContainer.keys['feed'][statusContainer.nameHmac] = {
      containerNameHmac: statusContainer.nameHmac,
      peerName: statusContainer.peer.username,
      updated: Date.now()
    };

    feedContainer.save(function (err) {
      if (err) {
        console.error('Cannot save feedContainer!', err);
      }
    });
  });

};

app.checkContainerCacheStatus =
function checkContainerCacheStatus(containerNameHmac) {
  for (var i = 0; i < app.session.containers.length; i++) {
    if (app.session.containers[i].nameHmac == containerNameHmac) {
      return true;
    }
  }
  return false;
};

app.updatePeerStatus = function updatePeerStatus(username, statusContainer) {
  var id = '#' + username + '-status';
  var statusUpdateNode = $(id);

  if (statusUpdateNode[0]) {
    statusUpdateNode.remove();
  }

  var statusNode = app.createStatusUpdateNode(username, statusContainer);
  $('#my-feed-entries').prepend(statusNode);
};

app.createStatusUpdateNode = function (username, feedContainer) {
  console.log('createStatusUpdateNode()', arguments);
  var statusUpdate = '<div class="status-update" id="'
                   + username + '-status'
                   + '">'
                   + '<h4 class="status-update-username">'
                   + username
                   + '</h4>'
                   + '<div class="status-update-data">'
                   + '<span class="status-text">'
                   + feedContainer.keys['myStatus']
                   + '</span>'
                   + '<ul class="status-metadata">'
                   + '<li>'
                   + feedContainer.keys['location']
                   + '</li>'
                   + '<li>'
                   + new Date(feedContainer.keys['updated'])
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
