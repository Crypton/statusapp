require("mocha-as-promised")();

path = require('path');
var projectRoot = path.resolve(__dirname, '..');

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var wd = require('wd');
var wdQuery = require("wd-query");

// enables chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('statusapp', function() {
  this.timeout(200000);
  var browser;
  var appURL;
  var $;

  var waitTimeout = 20000;
  var createAccountTimeout = 120000;
  
  var newusername = "user" + Date.now().toString();
  var newpassphrase = "shhh" + Date.now().toString();

  if (process.env.APPIUM === "android") {
    appURL = projectRoot + "/platforms/android/ant-build/MainActivity-debug.apk";
  }
  else {
    appURL = projectRoot + "/platforms/ios/build/emulator/Kloak.app";
  }

  before(function() {
    browser = wd.promiseChainRemote("localhost", 4723);
    $ = wdQuery(browser);
    return browser
      .init({
        device: (process.env.APPIUM === "android") ? 'Selendroid' : 'iPhone 6',
        'app-package'  : (process.env.APPIUM === "android") ? 'io.crypton.statusapp' : undefined,
        'app-activity' : (process.env.APPIUM === "android") ? '.Kloak' : undefined,
        name: "Kloak",
        platform:'Mac 10.10',
        platformName: (process.env.APPIUM === "android") ? "Android" : "iOS",
        deviceName: (process.env.APPIUM === "android") ? 'Android VM' : 'iPhone 6',
        app: appURL,
        version: '',
        browserName: '',
        implicitWaitMs: 500
      })
      .contexts()
      .then(function(contexts) {
        console.log(contexts);
        return browser;
      })
      .context((process.env.APPIUM === "android") ? 'WEBVIEW_io.crypton.statusapp' : 'WEBVIEW_1');
      // .setAsyncScriptTimeout(30000)
      //.windowHandles()
      //.then(function(handles) {
        //console.log(handles);
        //return (process.env.APPIUM === "android") ? browser.window(handles[1]) : browser.window(handles[0]);
      //});
  });

  after(function() {
    return browser.noop()
    .then(function() { return browser.quit(); }).done();
  });

  // using mocha-as-promised and chai-as-promised is the best way
  describe("Functional tests", function() {

    beforeEach(function() {
      // ...
    });

// Registration :: "user" + Date.now().toString()
    describe("Create Account", function() {
      it("should have a Login username input field", function() {
        return browser
          .waitForElementByCss("#username-login", waitTimeout)
          .then(function() {
            return browser.elementByCss("#username-login");
          }).should.eventually.be.ok;
      });

      it("should have a create account button", function() {
        return browser.elementByCss("#register-btn")
          .then(function(el) {
	    console.log(el);
            return el.text();
          }).should.eventually.equal("CREATE ACCOUNT");
      });

      it("should be able to switch to the create account screen", function() {
        return browser
          .waitForElementByCss("#register-btn", waitTimeout)
          .then(function() {
            return $("#register-btn").click();
          })
          .then(function() {
            return browser.waitForElementByCss("#username-generate", waitTimeout);
          }).should.eventually.be.ok;
      });
      
      it("should be able to enter a new username", function() {
        return browser.noop()
          .then(function() {
            return $('#username-generate').val(newusername);
          })
          .then(function() {
            return $('#username-generate').val();
          }).should.eventually.equal(newusername);
      });
      
      it("should be able to enter a new passphrase", function() {
        return browser.noop()
          .then(function() {
            return $('input#password-generate').val(newpassphrase);
          })
          .then(function() {
            return $('input#password-generate').val();
          }).should.eventually.equal(newpassphrase);
      });
      
      it("should be able to register", function() {
        return browser
          .waitForElementByCss("#register-generate-btn", createAccountTimeout)
          .then(function() {
            return $("#register-generate-btn").click();
          })
          .then(function() {
            return browser
	      .waitForElementByCss("#create-id-card", createAccountTimeout);
          })
          .then(function() {
            return $("#create-id-card").text();
          })
          .then(function(text) {
            return text;
          }).should.eventually.equal("Create Contact Card");
	// XXX: timeouts are not respected in this test:
	//       AssertionError: expected '' to equal 'Create Contact Card' is returned immediately
      });
    });
    
// Start over
    // describe("Start over", function() {
    //   it("should have a menu button", function() {
    //     return browser
    //       .waitForElementByCss(".menu-btn", waitTimeout)
    //       .then(function() {
    //         return $(".menu-btn");
    //       }).should.eventually.be.ok;
    //   });
      // it("should be able to log out", function() {
      //   return browser
      //     .waitForElementByCss(".menu-btn", waitTimeout)
      //     .then(function() {
      //       return $(".menu-btn").click();
      //     })
      //     .then(function() {
      //       return browser.waitForElementByCss(".menu-logout", waitTimeout);
      //     })
      //     .then(function() {
      //       return $(".menu-logout").click();
      //     })
      //     .then(function() {
      //       return browser.waitForElementByCss(".login:not(.dismissed)", waitTimeout);
      //     })
      //     .then(function() {
      //       return $(".loginButton").text();
      //     }).should.eventually.equal("Log in");
      // });
    // });
// Log back in
    describe("Log in", function() {
      it("should have a username field", function() {
        return browser.noop()
          .then(function() {
            return browser.waitFor(wd.asserters.jsCondition("document.querySelectorAll('#username-login')[0].disabled == false"), waitTimeout);
          })
          .then(function() {
            return browser.waitForElementByCss("#username-login", waitTimeout);
          })
          .then(function() {
            return browser.elementByCss("#username-login");
          }).should.eventually.be.ok;
      });
      // it("should have a placeholder text of 'Username'", function() {
      //     return browser.elementByCss("input[name=username]")
      //     .then(function(el) {
      //       return browser.getAttribute(el, "placeholder");
      //     }).should.eventually.equal("Username");
      // });
      // it("should have a passphrase field", function() {
      //   return browser
      //     .waitForElementByCss("input[name=passphrase]", waitTimeout)
      //     .then(function() {
      //       return browser.elementByCss("input[name=passphrase]");
      //     }).should.eventually.be.ok;
      // });
      // it("should have a placeholder text of 'Passphrase'", function() {
      //     return browser.elementByCss("input[name=passphrase]")
      //     .then(function(el) {
      //       return browser.getAttribute(el, "placeholder");
      //     }).should.eventually.equal("Passphrase");
      // });
      // it("should be able to enter a username", function() {
      //   return browser
      //     .waitFor(wd.asserters.jsCondition("document.querySelectorAll('input[name=username]')[0].disabled === false"), waitTimeout)
      //     .then(function() {
      //       return $('input[name=username]').val(newusername);
      //     })
      //     .then(function() {
      //       return $('input[name=username]').val();
      //     }).should.eventually.equal(newusername);
      // });
      // it("should be able to enter a passphrase", function() {
      //   return browser.noop()
      //     .then(function() {
      //       return $('input[name=passphrase]').val(newpassphrase);
      //     })
      //     .then(function() {
      //       return $('input[name=passphrase]').val();
      //     }).should.eventually.equal(newpassphrase);
      // });
      // it("should have a login button", function() {
      //   return browser.noop()
      //     .then(function() {
      //       return browser.waitForElementByCss(".loginButton", waitTimeout);
      //     })
      //     .then(function() {
      //       return $('.loginButton').text();
      //     }).should.eventually.equal("Log in");
      // });
      // it("should be able to log in", function() {
      //   return browser
      //     .waitForElementByCss(".loginButton")
      //     .then(function() {
      //       return $(".loginButton").click();
      //     })
      //     .then(function() {
      //       return browser
      //         .waitForElementByCss(".login.dismissed", waitTimeout);
      //     })
      //     .then(function() {
      //       return browser
      //         .waitFor(wd.asserters.jsCondition("document.querySelectorAll('.emptyEntries')[0].style.display === 'block'"), waitTimeout);
      //     })
      //     .then(function() {
      //       return $(".emptyEntries").text();
      //     })
      //     .then(function(text) {
      //       return text;
      //     }).should.eventually.equal("No entries yet\nAdd some now with the '+' above");
      // });
    });

    // Add entry menu button
    // describe("Add entry button and menu", function() {
    //   it("should have an 'add entries' button", function() {
    //     return browser
    //       .waitForElementByCss(".add-btn", waitTimeout)
    //       .then(function() {
    //         return $(".add-btn i.fa-plus");
    //       }).should.eventually.be.ok;
    //   });
      // it("should show the add menu when clicked", function() {
      //   return browser
      //     .waitForElementByCss(".add-btn")
      //     .then(function() {
      //       return $(".add-btn").click();
      //     })
      //     .then(function() {
      //       return browser.waitForElementByCss(".addMenu:not(.dismissed)");
      //     })
      //     .then(function() {
      //       return $(".addMenu:not(.dismissed)");
      //     }).should.eventually.be.ok;
      // });
      // it("should show three items in the add menu (General, Credit Card and Password)", function() {
      //   return browser
      //     .waitForElementByCss(".addMenu:not(.dismissed)")
      //     .then(function() {
      //       return browser
      //         .waitFor(wd.asserters.jsCondition("document.querySelectorAll('.addMenu ul li').length === 3"), waitTimeout);
      //     }).should.eventually.be.ok;
      // });
      // it("should hide the add menu when clicked anywhere else", function() {
      //   return browser.noop()
      //     .then(function() {
      //       return $(".emptyEntries").click();
      //     })
      //     .then(function() {
      //       return browser.waitForElementByCss(".addMenu.dismissed", waitTimeout);
      //     })
      //     .then(function() {
      //       return $(".addMenu.dismissed");
      //     }).should.eventually.be.ok;
      // });
//    });

    
  });
});
