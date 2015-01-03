app.STATUS_CONTAINER = '_my_status_';

app.FEED_CONTAINER = '_my_feed_';

app.INITIAL_STATUS_MESSAGE = 'Current Status: null';

app.isReady = false;

app.statusContainer = null;

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
    app.loadFeed();
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
      app.isReady = true;
      // set message event handler
      app.session.on('message', function (message) {
        app.handleMessage(message);
      });

      app.inboxPollInterval = setInterval(function () {
        if (app.pollInProgress) {
          return;
        }
        app.session.inbox.poll(function (err, messages) {
          app.pollInProgress = true;
          for (var prop in app.session.inbox.messages) {
            app.handleMessage(app.session.inbox.messages[prop]);
          }
        });
      }, 10000);

    });
  });
};

app.pollInProgress = false;

app.shareStatus = function shareStatus(peerName) {
  // share status container with peer
  app.session.getPeer(peerName, function (err, peer) {
    if (err) {
      console.error('Cannot get peer!', err);
      return;
    }
    app.statusContainer.share(peer, function (err) {
      if (err) {
        console.log(err);
        app.alert('Status sharing failed, try again in a moment');
        return;
      }
    });
  });
};

app.revokeSharedStatus = function revokeSharedStatus(peer) {
  // revoke shared status with peer
};

app.viewStatusUpdates = function viewStatusUpdates() {
  // switch to UI wih all shared status updates

};

app.handleMessage = function handleMessage(message) {
  console.log('handleMessage();');
  if (message.headers.action != 'containerShare') {
    return;
  }

  var username = message.payload.fromUsername;
  var containerNameHmac = message.payload.containerNameHmac;

  // update the shared status container recvd via an inbox message
  app.loadOrCreateContainer(app.FEED_CONTAINER, function (err, feedContainer) {
    if (err) {
      console.error(err);
      return;
    }

    if (!feedContainer.keys['feed']) {
      feedContainer.keys['feed'] = [];
    }

    var feedList = feedContainer.keys['feed'];
    var statusFeedFound = false;
    for (var i = 0; i < feedList.length; i++) {
      if (feedList[i].username == username) {
        feedList[i].containerHmac = containerNameHmac;
      }
    }
    if (!statusFeedFound) {
      feedList.push({ username: username,
                      containerHmac: containerNameHmac});
    }
    // load the status data
    app.session.getPeer(username, function (err, peer) {
      if (err) {
        console.error('Cannot get Peer');
        return;
      }
      app.session.loadWithHmac(containerNameHmac, peer, function (err, friendStatusContainer) {
        if (err) {
          console.error(err);
          return;
        }

        // Watch this container!
        friendStatusContainer.watch(function () {
          console.log('inside watch listener');
          console.log('this', this);
          app.renderFriendStatusUpdate(this)
        });

        var id = '#' + username + '-status';
        var statusUpdateNode = $(id);

        if (statusUpdateNode.length) {
          statusUpdateNode.remove();
        }
        var statusUpdate = app.createStatusUpdateNode(username, friendStatusContainer);

        $('#my-feed-entries').prepend(statusUpdate);

        // need to add this friendStatus record to the feedContainer

        feedContainer.save(function (err) {
          // delete message!
          app.session.inbox.delete(message.messageId, function (err) {
            // toggle pollInProgress no matter what
            app.pollInProgress = false;
            if (err) {
              console.error('Cannot delete message!');
              console.log(err);
            }
          });

          if (err) {
            console.error('Cannot save feed container!');
          }

        }); // save feedContainer
      }); // loadWithHmac
    }); // getPeer
  }); // loadOrCreateContainer
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

app.renderFriendStatusUpdate = function renderFriendStatusUpdate(statusContainer) {

  console.log(statusContainer);

};

app.loadFeed = function loadFeed() {
  console.log('loadFeed()');
  app.loadOrCreateContainer(app.FEED_CONTAINER, function (err, container) {
    if (err) {
      console.error(err);
      app.alert('Cannot load feed, try again in a moment');
      return;
    }

    if (!container.keys['feed']) {
      container.keys['feed'] = [];
    }

    app.feed = container.keys['feed'];

    var feedLength = app.feed.length;
    var length = 10;
    if (feedLength < 10) {
      length = feedLength;
    }

    for (var i = 0; i < length; i++) {
      app.session.getPeer(app.feed[i].username, function (err, peer) {
        if (err) {
          console.error(err);
          return;
        }
        app.session.loadWithHmac(app.feed[i].containerHmac, peer, function (err, feedContainer) {
          if (err) {
            console.error(err);
            return;
          }

          var username = app.feed[i].username;
          var statusUpdate = app.createStatusUpdateNode(username, feedContainer);

          $('#my-feed-entries').append(statusUpdate);
          feedContainer.save(function (err) {
            if (err) {
              console.error('Cannot save feed container!');
            }
          });
        });
      });
    }
  });
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
// makePictureAvatar(base64PngData)
// makeAsciiAvatar()
//
