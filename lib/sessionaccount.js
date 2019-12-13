const request = require('superagent')
const URL = require('url-parse')
const UserInfoStash = require('properly-util-js/lib/user-info-stash')
const Sprintf = require('sprintf-js')
const Cookies = require('js-cookie')


const STAGING_GRANT_CONFIG = {
  login: 'https://stagingauthhandler.goproperly.com/%1$s?redirectUrl=%2$s',
  exchangeTokens: 'https://stagingauthhandler.goproperly.com/exchangeTokens',
  signOut: "https://stagingauthhandler.goproperly.com/startSignOut",
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',
};

const PROD_GRANT_CONFIG = {
  login: 'https://authhandler.goproperly.com/%1$s?redirectUrl=%2$s',
  exchangeTokens: 'https://authhandler.goproperly.com/exchangeTokens',
  signOut: "https://authhandler.goproperly.com/startSignOut",
  checkLoginTemplate: 'https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s',
};

const STAGING_GRANT_DISCO_CONFIG = {
  login: 'https://stagingauthhandler.properlyhomes.ca/%1$s?mode=disco&redirectUrl=%2$s',
  exchangeTokens: 'https://stagingauthhandler.properlyhomes.ca/exchangeTokens?mode=disco',
  signOut: "https://stagingauthhandler.properlyhomes.ca/startSignOut?mode=disco",
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',
  role: 'jczqf4GgkEKd1bxtTgpJOg',
};

const PROD_GRANT_DISCO_CONFIG = {
  login: 'https://authhandler.properlyhomes.ca/%1$s?mode=disco&redirectUrl=%2$s',
  exchangeTokens: 'https://authhandler.properlyhomes.ca/exchangeTokens?mode=disco',
  signOut: 'https://authhandler.properlyhomes.ca/startSignOut?mode=disco',
  checkLoginTemplate: 'https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s',
};


const configMap = {};

configMap['staging.admin.goproperly.com'] = STAGING_GRANT_CONFIG;
configMap['admin-staging.goproperly.com'] = STAGING_GRANT_CONFIG;
configMap['dev.admin.goproperly.com'] = STAGING_GRANT_CONFIG;
configMap['admin.goproperly.com'] = PROD_GRANT_CONFIG;
configMap['www.admin.goproperly.com'] = PROD_GRANT_CONFIG;

configMap['www.properlyhomes.ca'] = PROD_GRANT_DISCO_CONFIG;
configMap['dev.properlyhomes.ca'] = STAGING_GRANT_DISCO_CONFIG;
configMap['staging.properlyhomes.ca'] = STAGING_GRANT_DISCO_CONFIG;


class SessionAccount {
  constructor() {
    this.currentConfig = null;
    this.domainName = "";
  }

  initAWSOnce(currentURL) {
    const url = new URL(currentURL);
    const hostname = url.hostname;
    this.domainName = hostname.split(".").slice(-2).join(".")

    this.currentConfig = configMap[hostname];

    if (this.currentConfig == null) {
      throw new Error(`Auth configured on unsupported site: ${hostname}`);
    }

  }


  performCheckLoginToServer(idToken) {
    const checkLoginTemplate = this.currentConfig.checkLoginTemplate;
    const userId = encodeURIComponent(UserInfoStash.getUserId());

    const uriToUse = Sprintf.sprintf(checkLoginTemplate, userId);

    const jsonBody = this.currentConfig.hasOwnProperty('role') ? {'role' : this.currentConfig.role} : {};

    const apiCompletionPromise = request
      .post(uriToUse)
      .send(jsonBody)
      .set('X-Properly-Auth', idToken)
      .set('Accept', 'application/json');

    const promiseToReturn = apiCompletionPromise.then((response) => {
      const checkLoginResult = response.body;
      if (!checkLoginResult) {
        throw new Error('Must have body from the server on checklogin');
      }

      if (!checkLoginResult.id) {
        throw new Error('Must have id from the server on checklogin');
      }

      UserInfoStash.updateUserId(checkLoginResult.id);
    });

    return promiseToReturn;
  }



  isLoggedIn() {
    // cast to a native boolean with !!
    const isLoggedIn = !!(Cookies.get('session.isLoggedIn'));
    return isLoggedIn
  }


  doLogin(returnToURL) {
    this.start(returnToURL, 'startLogin');
  }

  doSignUp(returnToURL) {
    this.start(returnToURL, 'startSignUp');
  }

  start(returnToURL, route) {
    const startLoginTemplate = this.currentConfig.login;
    const urlToStartLogin = Sprintf.sprintf(startLoginTemplate, route, returnToURL);

    window.location.href = urlToStartLogin
  }

  doSignOut() {
    const signOutURL = this.currentConfig.signOut;

    window.location.href = signOutURL;

  }

  doCheckLoginIfNeeded(idToken) {
    //We have the idToken in a cookie, check if we have performed a check login yet, indicator stored in cookie hasCheckedLoginUserId
    const userId = Cookies.get("session.hasCheckedLoginUserId");
    if (!userId) {
      const completeCheckUserIDPromise = this.performCheckLoginToServer(idToken);

      const promiseToReturn = completeCheckUserIDPromise.then(() => {
        const validatedUserId = UserInfoStash.getUserId();
        Cookies.set("session.hasCheckedLoginUserId", validatedUserId,  { domain: this.domainName, secure: true  });
        return Promise.resolve(idToken);
      });

      return promiseToReturn;
    } else {
      return Promise.resolve(idToken);
    }
  }

  // this function handles user creation (i.e. checklogin process) and ensures all relevant
  // user cookies are set before the promise returns
  getJWT() {
    // We are not even logged in, reject immediately
    if (! this.isLoggedIn()){
      return Promise.reject(new Error('Not Logged In'));
    }

    const idToken = Cookies.get('session.idToken');

    if (idToken) {
      return this.doCheckLoginIfNeeded(idToken);
    }

    const emptyJsonBody = {};
    //We believe we are logged in and have a refresh token, exchange it for an access token via an api,
    //This call gets the token directly (using the httpOnly cookie containing a refresh token)
    //And updates the idToken cookie for future calls, and performs checkLogin if needed
    const uriToUse = this.currentConfig.exchangeTokens;
    const apiCompletionPromise = request
      .post(uriToUse)
      .send(emptyJsonBody)
      .withCredentials()
      .set('Accept', 'application/json');

    const promiseToReturn = apiCompletionPromise.then((response) => {
      const tokenData = response.body;
      if (!tokenData) {
        throw new Error('Must have body from the token exchange');
      }

      if (!tokenData.idToken) {
        throw new Error('Must have id token in the exchange body');
      }
      const idTokenFromAPI = tokenData.idToken;
      return this.doCheckLoginIfNeeded(idTokenFromAPI);
    });

    return promiseToReturn;
  }
}

let gSingletonSession = null;

const SessionAccountFactory = {
  sessionAccountInit: (currentURL) => {
    if (gSingletonSession != null) {
      return gSingletonSession;
    }

    gSingletonSession = new SessionAccount();
    gSingletonSession.initAWSOnce(currentURL); // constructor?

    return gSingletonSession;
  },

  getSingleton: () => gSingletonSession,
};

module.exports = {
  SessionAccount,
  SessionAccountFactory,
}