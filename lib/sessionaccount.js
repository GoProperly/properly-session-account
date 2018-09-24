import request from 'superagent';
import * as AmazonCognitoIdentity from 'amazon-cognito-auth-js';
import * as URL from 'url-parse';
import * as UserInfoStash from 'properly-util-js/lib/user-info-stash';
import * as Sprintf from 'sprintf-js';

const RETURN_AFTER_LOGIN_KEY = 'nav.returnAfterLogin';

const STAGING_USER_POOL_ID = 'us-east-1_OF5OOfdx0';
const PROD_USER_POOL = 'us-east-1_4qEsCz4ZK';

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

const configMap = {};

configMap['staging.admin.goproperly.com'] = STAGING_ADMIN_CONFIG;
configMap['dev.admin.goproperly.com'] = DEV_ADMIN_CONFIG;
configMap['www.admin.goproperly.com'] = PROD_ADMIN_CONFIG;

configMap['staging.goproperly.com'] = STAGING_CONFIG;
configMap['dev.goproperly.com'] = DEV_CONFIG;
configMap['www.goproperly.com'] = PROD_CONFIG;

const HACK_STAGING_ENVIRONMENT_PREFIX = '/b/';

export class SessionAccount {
  constructor() {
    this.auth = null;
    this.operatingInHandleLoginContext = false;
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

    const authData = {
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
      onSuccess: (result) => {
        if (this.operatingInHandleLoginContext) {
          const idToken = result.getIdToken().getJwtToken();
          this.performNewLoginActivities(idToken);
        }
      },
      onFailure: (err) => {
        throw new Error(err); // failing loudly
      },
    };
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

  performRedirect() {
    const sessionStorage = window.sessionStorage;
    const redirectLocation = sessionStorage.getItem(RETURN_AFTER_LOGIN_KEY);

    if (!redirectLocation) {
      window.location.href = this.currentConfig.defaultReturnLogin;
    } else {
      // go back to original call location, now with cached jwt
      window.location.href = redirectLocation;
    }
  }

  performNewLoginActivities(idToken) {
    const apiCallPromise = this.performCheckLoginToServer(idToken);

    apiCallPromise.then(() => this.performRedirect());
  }

  callFromHandleLoginOnly(urlOfHandleLogin) {
    this.operatingInHandleLoginContext = true;
    this.auth.parseCognitoWebResponse(urlOfHandleLogin);
  }

  callFromSignoutOnly() {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.location.href = this.currentConfig.defaultReturnSignout;
  }

  isLoggedIn() {
    if (this.auth == null) { return false; }

    return this.auth.isUserSignedIn();
  }


  doLogin(returnToURL) {
    const sessionStorage = window.sessionStorage;

    if (returnToURL) {
      sessionStorage.setItem(RETURN_AFTER_LOGIN_KEY, returnToURL);
    } else {
      sessionStorage.removeItem(RETURN_AFTER_LOGIN_KEY);
    }

    this.auth.getSession(); // triggers login redirect if needed
  }

  doSignOut() {
    this.auth.signOut();
  }

  getJWT() {
    if (this.auth == null) {
      return undefined;
    }

    if (!this.auth.isUserSignedIn()) {
      return undefined;
    }

    const session = this.auth.getSignInUserSession();
    const jwtToken = session.getIdToken().getJwtToken();

    return jwtToken;
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
