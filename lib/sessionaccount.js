// import * as AWS from 'aws-sdk';

import request from 'superagent';

import { CognitoAuth } from 'amazon-cognito-auth-js/dist/amazon-cognito-auth';

import * as AmazonCognitoIdentity from 'amazon-cognito-auth-js';

import * as URL from 'url-parse';

import * as UserInfoStash from 'properly-util-js/lib/user-info-stash.js';

import * as Sprintf from 'sprintf-js';

let gSingletonSession = null;


const RETURN_AFTER_LOGIN_KEY = 'nav.returnAfterLogin';


const STAGING_USER_POOL_ID = 'us-east-1_OF5OOfdx0';

const PROD_USER_POOL = 'us-east-1_4qEsCz4ZK';

// staging:
// prod:


const STAGING_ADMIN_CONFIG = {
  defaultReturnLogin: 'https://staging.admin.goproperly.com/',
  defaultReturnSignout: 'https://staging.admin.goproperly.com/',
  clientId: '3iuhnprmod0josge24ogarecfp',
  loginHost: 'staging-goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://staging.admin.goproperly.com/hackloginhandlerbounce.html',
  signoutResultRedirect: 'https://staging.admin.goproperly.com/hacksignoutbounce.html',
  pool: STAGING_USER_POOL_ID,
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',
};


const DEV_ADMIN_CONFIG = {
  defaultReturnLogin: 'https://dev.admin.goproperly.com:9000/',
  defaultReturnSignout: 'https://dev.admin.goproperly.com:9000/',
  clientId: 'aho39mccbviiiirringp742c7',
  loginHost: 'staging-goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://dev.admin.goproperly.com:9000/nc/loginhandler.html',
  signoutResultRedirect: 'https://dev.admin.goproperly.com:9000/nc/signout.html',
  pool: STAGING_USER_POOL_ID,
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',

};


const PROD_ADMIN_CONFIG = {
  defaultReturnLogin: 'https://www.admin.goproperly.com/',
  defaultReturnSignout: 'https://www.admin.goproperly.com/',
  clientId: 'g94dv704eo2968005pqb0h2i0',
  loginHost: 'goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://www.admin.goproperly.com/nc/loginhandler.html',
  signoutResultRedirect: 'https://www.admin.goproperly.com/nc/signout.html',
  pool: PROD_USER_POOL,
  checkLoginTemplate: 'https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s',
};


const STAGING_CONFIG = {
  defaultReturnLogin: 'https://staging.goproperly.com/',
  defaultReturnSignout: 'https://staging.goproperly.com/',
  clientId: '7be00v7pugqef2nmtgn1jgm0vj',
  loginHost: 'staging-goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://staging.goproperly.com/hackloginhandlerbounce.html',
  signoutResultRedirect: 'https://staging.goproperly.com/hacksignoutbounce.html',
  pool: STAGING_USER_POOL_ID,
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',

};


const DEV_CONFIG = {
  defaultReturnLogin: 'https://dev.goproperly.com:8000/',
  defaultReturnSignout: 'https://dev.goproperly.com:8000/',
  clientId: '2m48siscbain33pe2tr6b2mvcf',
  loginHost: 'staging-goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://dev.goproperly.com:8000/nc/loginhandler.html',
  signoutResultRedirect: 'https://dev.goproperly.com:8000/nc/signout.html',
  pool: STAGING_USER_POOL_ID,
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',

};


const PROD_CONFIG = {
  defaultReturnLogin: 'https://www.goproperly.com/',
  defaultReturnSignout: 'https://www.goproperly.com/',
  clientId: '57kepoqsh0boqp5ug7c4ia0btf',
  loginHost: 'goproperly-com.auth.us-east-1.amazoncognito.com',
  loginResultRedirect: 'https://www.goproperly.com/nc/loginhandler.html',
  signoutResultRedirect: 'https://www.goproperly.com/nc/signout.html',
  pool: PROD_USER_POOL,
  checkLoginTemplate: 'https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s',
};


const configMap = {
};
configMap['staging.admin.goproperly.com'] = STAGING_ADMIN_CONFIG;
configMap['dev.admin.goproperly.com'] = DEV_ADMIN_CONFIG;
configMap['www.admin.goproperly.com'] = PROD_ADMIN_CONFIG;

configMap['staging.goproperly.com'] = STAGING_CONFIG;
configMap['dev.goproperly.com'] = DEV_CONFIG;
configMap['www.goproperly.com'] = PROD_CONFIG;


const HACK_STAGING_ENVIRONMENT_PREFIX = '/b/';

export var SessionAccount = function SessionAccount() {
  this.auth = null;
  this.operatingInHandleLoginContext = false;
  this.currentConfig = null;
};


SessionAccount.prototype.initAWSOnce = function initAWSOnce (currentURL) {
  var this$1 = this;

  var url = new URL(currentURL);
  var hostname = url.hostname;

  // HACK START: due to deployment path logic:
  var path = url.pathname;

  if (path.indexOf(HACK_STAGING_ENVIRONMENT_PREFIX) === 0) //
  {
    var environmentID = path.substring(HACK_STAGING_ENVIRONMENT_PREFIX.length); // skip the prefix
    environmentID = environmentID.substring(0, environmentID.indexOf('/'));

    sessionStorage.setItem('staging.environmentID', environmentID);
  }
  window.sessionStorage.getItem('staging.environmentID');
  // HACK END: due to deployment path logic


  this.currentConfig = configMap[hostname];

  if (this.currentConfig == null) {
    throw ("Auth configured on unsupported site: " + hostname);
  }


  var authData = {
    ClientId: this.currentConfig.clientId,
    AppWebDomain: this.currentConfig.loginHost,
    TokenScopesArray: ['profile', 'openid', 'email'],
    RedirectUriSignIn: this.currentConfig.loginResultRedirect,
    RedirectUriSignOut: this.currentConfig.signoutResultRedirect,
    IdentityProvider: null,
    UserPoolId: this.currentConfig.pool,
    AdvancedSecurityDataCollectionFlag: false,
  };

  this.auth = new AmazonCognitoIdentity.CognitoAuth(authData);


  this.auth.userhandler = {
    onSuccess: function (result) {
      console.log('Sign in success');
      console.log(("idToken: " + (result.getIdToken().getJwtToken())));
      console.log('idTokenObject: %o', result.getIdToken());

      if (this$1.operatingInHandleLoginContext) {
        var idToken = result.getIdToken().getJwtToken();
        this$1.performNewLoginActivities(idToken);
      } else {
        console.log('callback for successfull jwt from initiator');
      }
    },
    onFailure: function (err) {
      console.log(("Error: " + (err.toString())));
      throw new Error(err); // failing loudly
    },
  };
};

SessionAccount.prototype.performCheckLoginToServer = function performCheckLoginToServer (idToken) {
  var checkLoginTemplate = this.currentConfig.checkLoginTemplate;

  var userId = encodeURIComponent(UserInfoStash.getUserId());


  var uriToUse = Sprintf.sprintf(checkLoginTemplate, userId);

  var emptyJsonBody = {};

  var apiCompletionPromise = request
    .post(uriToUse)
    .send(emptyJsonBody)
    .set('X-Properly-Auth', idToken)
    .set('Accept', 'application/json');


  var promiseToReturn = apiCompletionPromise.then(function (response) {
    console.log('completed check login.');

    var checkLoginResult = response.body;
    if (!checkLoginResult) {
      throw new Error('Must have body from the server on checklogin');
    }
    if (!checkLoginResult.id) {
      throw new Error('Must have id from the server on checklogin');
    }
    var serverUserId = checkLoginResult.id;
    console.log(Sprintf.sprintf('Original ID %1$s, ID from Server %2$s', userId, serverUserId));
    UserInfoStash.updateUserId(serverUserId);
  });

  return promiseToReturn;
};

SessionAccount.prototype.performRedirect = function performRedirect () {
  var sessionStorage = window.sessionStorage;


  var redirectLocation = sessionStorage.getItem(RETURN_AFTER_LOGIN_KEY);

  if (!redirectLocation) {
    window.location.href = this.currentConfig.defaultReturnLogin;
  } else {
    window.location.href = redirectLocation; // go back to original call location, now with cached jwt
  }
};


SessionAccount.prototype.performNewLoginActivities = function performNewLoginActivities (idToken) {
  var this$1 = this;

  console.log('callback for successful login from loginhandler');

  var apiCallPromise = this.performCheckLoginToServer(idToken);

  apiCallPromise.then(function () {
    this$1.performRedirect();
  });
};

SessionAccount.prototype.callFromHandleLoginOnly = function callFromHandleLoginOnly (urlOfHandleLogin) {
  this.operatingInHandleLoginContext = true;
  this.auth.parseCognitoWebResponse(urlOfHandleLogin);
};

SessionAccount.prototype.callFromSignoutOnly = function callFromSignoutOnly () {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.location.href = this.currentConfig.defaultReturnSignout;
};

SessionAccount.prototype.isLoggedIn = function isLoggedIn () {
  if (this.auth == null) { return false; }

  return this.auth.isUserSignedIn();
};


SessionAccount.prototype.doLogin = function doLogin (returnToURL) {
  var sessionStorage = window.sessionStorage;

  if (returnToURL) {
    sessionStorage.setItem(RETURN_AFTER_LOGIN_KEY, returnToURL);
  } else {
    sessionStorage.removeItem(RETURN_AFTER_LOGIN_KEY);
  }

  this.auth.getSession(); // triggers login redirect if needed
};

SessionAccount.prototype.doSignOut = function doSignOut () {
  this.auth.signOut();
};

SessionAccount.prototype.getJWT = function getJWT () {
  if (this.auth == null) { return undefined; }
  if (!(this.auth.isUserSignedIn())) { return undefined; }

  var session = this.auth.getSignInUserSession();

  var jwtToken = session.getIdToken().getJwtToken();

  return jwtToken;
};


// Namespace the factory wrapper
export var SessionAccountFactory = {
  sessionAccountInit: function (currentURL) {
    if (gSingletonSession != null) {
      return gSingletonSession;
    }

    gSingletonSession = new SessionAccount();


    gSingletonSession.initAWSOnce(currentURL); // constructor?


    return gSingletonSession;
  },

  getSingleton: function () { return gSingletonSession; }
  ,
};
