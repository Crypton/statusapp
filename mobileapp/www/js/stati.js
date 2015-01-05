app.STATUS_CONTAINER = '_my_status_';

app.FEED_CONTAINER = '_my_feed_';

app.INITIAL_STATUS_MESSAGE = 'Current Status: null';

app.isReady = false;

app.statusContainer = null;

app.postPeerTrustCallback = function postPeerTrustCallback(peer) {
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
    // XXXddahl:  reset status UI
    app.switchView('#feed', 'Stati.es Feed');
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
  app.createStatusContainer();
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

    // Update local status
    $('#my-handle').text(app.session.account.username);
    $('#my-status-text').text(app.statusContainer.keys['myStatus']);
    $('#my-status-location').text(app.statusContainer.keys['location']);
    $('#my-status-updated').text(app.statusContainer.keys['updated']);

    // change view to #feed
    app.switchView('#feed', 'Stati.es Feed');
  });
};

app.createStatusContainer = function createStatusContainer() {
  // Check if it is already created first...
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

        if (!feedContainer.keys['feed']) {
          feedContainer.keys['feed'] = [];
        }
        feedContainer.save(function (err) {
          app.isReady = true;
          // set message event handler
          app.session.on('message', function (message) {
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

            app.session.inbox.poll(function (err, messages) {
              app.pollInProgress = true;
              for (var prop in app.session.inbox.messages) {
                app.handleMessage(app.session.inbox.messages[prop]);
              }
            });
          }, 20000);

        }); // feedContainer saved
      }); // feed container created/loaded

    }); // status container saved
  }); // status container loaded
};

app.pollInProgress = false;

app.shareStatus = function shareStatus(peerObj) {
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
  } else {
    app.statusContainer.share(peerObj, function (err) {
      if (err) {
        console.error(err, 'Cannot shareStatus!');
        return;
      }
    });
  }
};

app.revokeSharedStatus = function revokeSharedStatus(peer) {
  // revoke shared status with peer
};

app.viewStatusUpdates = function viewStatusUpdates() {
  // switch to UI wih all shared status updates
  app.switchView('#feed', 'Stati.es Feed');
};

app.handleMessage = function handleMessage(message) {
  // just add the shared container hmac + username to the feed container
  console.log('handleMessage();');
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
    // XXXddahl: check if we have a cached conatiner, if so, it should already be watched()
    if (app.checkContainerCacheStatus(containerNameHmac)) {
      return;
    }
    // We need to load and watch this container
    app.session.loadWithHmac(containerNameHmac, peer, function (err, statusContainer) {
      if (err) {
        console.error(err);
        return;
      }
      // check for existing status, remove from DOM, re-create status, prepend to the top of the list
      app.updatePeerStatus(username, statusContainer);
      // app.pollInProgress = false;
      app.watchContainer(statusContainer);
    });
  });
};

app.watchContainer = function watchContainer(statusContainer) {
  statusContainer.watch(function () {
    // Need to update the status data here.
    // XXXddahl: is this function part of the container object?
    // Can we just get the container with 'this'?
    var username = this.peer.username;
    app.updatePeerStatus(username, this);
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

// app.loadFeed = function loadFeed() {
//   console.log('loadFeed()');
//   app.loadOrCreateContainer(app.FEED_CONTAINER, function (err, container) {
//     if (err) {
//       console.error(err);
//       app.alert('Cannot load feed, try again in a moment');
//       return;
//     }

//     if (!container.keys['feed']) {
//       container.keys['feed'] = [];
//     }

//     app.feed = container.keys['feed'];

//     var feedLength = app.feed.length;
//     var length = 10;
//     if (feedLength < 10) {
//       length = feedLength;
//     }

//     for (var i = 0; i < length; i++) {
//       app.session.getPeer(app.feed[i].username, function (err, peer) {
//         if (err) {
//           console.error(err);
//           return;
//         }
//         app.session.loadWithHmac(app.feed[i].containerHmac, peer, function (err, feedContainer) {
//           if (err) {
//             console.error(err);
//             return;
//           }

//           var username = app.feed[i].username;
//           var statusUpdate = app.createStatusUpdateNode(username, feedContainer);

//           $('#my-feed-entries').append(statusUpdate);
//           feedContainer.save(function (err) {
//             if (err) {
//               console.error('Cannot save feed container!');
//             }
//           });
//         });
//       });
//     }
//   });
// };

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
// makePictureAvatar(base64PngData)
// makeAsciiAvatar()
//
