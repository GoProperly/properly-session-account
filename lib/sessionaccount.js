import request from 'superagent';
import * as URL from 'url-parse';
import * as UserInfoStash from 'properly-util-js/lib/user-info-stash';
import * as Sprintf from 'sprintf-js';

import Cookie from 'js-cookie'


const STAGING_GRANT_CONFIG = {
  login: 'https://stagingauthhandler.goproperly.com/startLogin',
  exchangeTokens: 'https://stagingauthhandler.goproperly.com/exchangeTokens',
  signOut: "https://stagingauthhandler.goproperly.com/startSignOut",
  checkLoginTemplate: 'https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s',
};

const PROD_GRANT_CONFIG = {
  login: 'https://authhandler.goproperly.com/startLogin',
  exchangeTokens: 'https://authhandler.goproperly.com/exchangeTokens',
  signOut: "https://authhandler.goproperly.com/startSignOut",
  checkLoginTemplate: 'https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s',
};

const RETURN_AFTER_LOGIN_KEY = 'nav.returnAfterLogin';



const configMap = {};

configMap['staging.admin.goproperly.com'] = STAGING_GRANT_CONFIG;
configMap['dev.admin.goproperly.com'] = STAGING_GRANT_CONFIG;
configMap['www.admin.goproperly.com'] = PROD_GRANT_CONFIG;



const HACK_STAGING_ENVIRONMENT_PREFIX = '/b/';

export class SessionAccount {
  constructor() {
    this.currentConfig = null;
  }

  initAWSOnce(currentURL) {
    const url = new URL(currentURL);
    const hostname = url.hostname;

    // HACK START: due to deployment path logic:
    const path = url.pathname;

    if (path.indexOf(HACK_STAGING_ENVIRONMENT_PREFIX) === 0) {
      let environmentID = path.substring(HACK_STAGING_ENVIRONMENT_PREFIX.length); // skip the prefix
      environmentID = environmentID.substring(0, environmentID.indexOf('/'));

      sessionStorage.setItem('staging.environmentID', environmentID);
    }
    window.sessionStorage.getItem('staging.environmentID');
    // HACK END: due to deployment path logic

    this.currentConfig = configMap[hostname];

    if (this.currentConfig == null) {
      throw new Error(`Auth configured on unsupported site: ${hostname}`);
    }

  }


  performCheckLoginToServer(idToken) {
    const checkLoginTemplate = this.currentConfig.checkLoginTemplate;
    const userId = encodeURIComponent(UserInfoStash.getUserId());

    const uriToUse = Sprintf.sprintf(checkLoginTemplate, userId);

    const emptyJsonBody = {};

    const apiCompletionPromise = request
      .post(uriToUse)
      .send(emptyJsonBody)
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
    const isLoggedIn = !!(Cookie.get('session.isLoggedIn'));
    return isLoggedIn
  }


  doLogin(returnToURL) {
    const sessionStorage = window.sessionStorage;

    //NOTE: returnToURL not currently enabled
    if (returnToURL) {
      sessionStorage.setItem(RETURN_AFTER_LOGIN_KEY, returnToURL);
    } else {
      sessionStorage.removeItem(RETURN_AFTER_LOGIN_KEY);
    }
    const urlToStartLogin = this.currentConfig.login;

    window.location.href = urlToStartLogin;

  }

  doSignOut() {
    const signOutURL = this.currentConfig.signOut;

    window.location.href = signOutURL;

  }

  getJWT() {
    // We are not even logged in, reject immediately
    if (! this.isLoggedIn()){
      return Promise.reject(new Error('Not Logged In'));
    }

    const idToken = Cookie.get('session.idToken');

    if (idToken) {
      //We have the idToken in a cookie, check if we have performed a check login yet, indicator stored in cookie hasCheckedLoginUserId
      const userId = Cookie.get("sesssion.hasCheckedLoginUserId");
      if (!userId) {
        const completeCheckUserIDPromise = this.performCheckLoginToServer(idToken);

        completeCheckUserIDPromise.then(() => {
          const validatedUserId = UserInfoStash.getUserId();
          Cookie.set("sesssion.hasCheckedLoginUserId", validatedUserId,  { domain: 'goproperly.com', secure: true  });
        }).then( () => {
          return Promise.resolve(idToken);
        });
      }
      return Promise.resolve(idToken);
    }

    const emptyJsonBody = {};
    //We believe we are logged in and have a refresh token, exchange it for an access token via an api,
    //This call gets the token directly (using the httpOnly cookie containing a refresh token)
    //And in the background updates the idToken cookie for future calls
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
        throw new Error('Must have id token in the exchange bodd');
      }
      const idTokenFromAPI = tokenData.idToken;


      return idTokenFromAPI;
    });

    return promiseToReturn;
  }
}

let gSingletonSession = null;

export const SessionAccountFactory = {
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
