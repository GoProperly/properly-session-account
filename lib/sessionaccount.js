
//import * as AWS from 'aws-sdk';

import {CognitoAuth} from 'amazon-cognito-auth-js/dist/amazon-cognito-auth';

import * as AmazonCognitoIdentity from "amazon-cognito-auth-js"

import * as URL from 'url-parse';

//var CognitoAuth = AmazonCognitoIdentity.CognitoAuth;

let gSingletonSession = null;



const RETURN_AFTER_LOGIN_KEY = "nav.returnAfterLogin";



const STAGING_USER_POOL_ID= "us-east-1_OF5OOfdx0";


STAGING_ADMIN_CONFIG = {defaultReturnLogin: "https://staging.admin.goproperly.com/",
                        defaultReturnSignout: "https://staging.admin.goproperly.com/",
                        clientId: "3iuhnprmod0josge24ogarecfp",
                        loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
                        loginResultRedirect: "https://staging.admin.goproperly.com/nc/loginhandler.html",
                        signoutResultRedirect: "https://staging.admin.goproperly.com/nc/signout.html",
                        pool: STAGING_USER_POOL_ID,
                        };



DEV_ADMIN_CONFIG = {defaultReturnLogin: "https://dev.admin.goproperly.com:9000/",
    defaultReturnSignout: "https://dev.admin.goproperly.com:9000/",
    clientId: "aho39mccbviiiirringp742c7",
    loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://dev.admin.goproperly.com:9000/nc/loginhandler.html",
    signoutResultRedirect: "https://dev.admin.goproperly.com:9000/nc/signout.html",
    pool: STAGING_USER_POOL_ID,
};




let configMap = {
}
configMap["staging.admin.goproperly.com"] = STAGING_ADMIN_CONFIG;
configMap["dev.admin.goproperly.com"] = STAGING_ADMIN_CONFIG;








export class SessionAccount {

    constructor() {

        this.auth = null;
        this.operatingInHandleLoginContext = false;
        this.currentConfig = null;
    }





    initAWSOnce (currentURL){


        let url = new URL(currentURL);
        let hostname =url.hostname;

        this.currentConfig = configMap[hostname];

        if (this.currentConfig == null) {
            throw "Auth configured on unsupported site: " + hostname;
        }


        let authData = {
            ClientId : this.currentConfig.clientId,
            AppWebDomain : this.currentConfig.loginHost,
            TokenScopesArray : ['profile','openid','email'],
            RedirectUriSignIn : this.currentConfig.loginResultRedirect,
            RedirectUriSignOut : this.currentConfig.signoutResultRedirect,
            IdentityProvider : null,
            UserPoolId : this.currentConfig.pool,
            AdvancedSecurityDataCollectionFlag : false,
        };

        this.auth = new AmazonCognitoIdentity.CognitoAuth(authData);


        this.auth.userhandler = {
            onSuccess: (result) => {
                console.log("Sign in success");
                console.log("idToken: "+result.getIdToken().getJwtToken());
                console.log("idTokenObject: %o",result.getIdToken() );
                if (this.operatingInHandleLoginContext) {
                    console.log("callback for successfull login from loginhandler");
                    let sessionStorage = window.sessionStorage;


                    let redirectLocation = sessionStorage.getItem(RETURN_AFTER_LOGIN_KEY);

                    if (!redirectLocation) {
                        window.location.href = this.currentConfig.defaultReturnLogin;
                    }
                    else {
                        window.location.href = redirectLocation; //go back to original call location, now with cached jwt
                    }
                }
                else {
                    console.log("callback for successfull jwt from initiator");
                }


            },
            onFailure: (err) => {
                console.log("Error: " + err.toString());
            }
        };


    }

    callFromHandleLoginOnly(urlOfHandleLogin) {
        this.operatingInHandleLoginContext = true;
        this.auth.parseCognitoWebResponse(urlOfHandleLogin);

    }

    callFromSignoutOnly(){
        window.sessionStorage.clear();
        window.localStorage.clear();
        window.location.href = this.currentConfig.defaultReturnSignout;
    }

    isLoggedIn  () {
        if (this.auth == null) { return false}
        return this.auth.isUserSignedIn()

    }


    //TODO: setup promise to handle login delay
    doLogin (returnToURL)  {
        let sessionStorage = window.sessionStorage;


        sessionStorage.setItem(RETURN_AFTER_LOGIN_KEY,returnToURL);

        this.auth.getSession(); //triggers login redirect if needed




    }

    doSignOut()  {
        this.auth.signOut();

    }

    getJWT ()  {
        if (this.auth == null) { return undefined;}
        if (!(this.auth.isUserSignedIn())) { return undefined;}

        let session = this.auth.getSignInUserSession();

        let jwtToken = session.getIdToken().getJwtToken();

        return jwtToken;
    }


}





const DOMAIN_FOR_STORAGE = "goproperly.com";
//Namespace the factory wrapper
export var SessionAccountFactory = {
     sessionAccountInit: ( currentURL )=> {
         if (gSingletonSession != null) {
             return gSingletonSession
         }
         else
         {
             gSingletonSession = new SessionAccount();


             gSingletonSession.initAWSOnce(currentURL); //constructor?

         }

        return gSingletonSession;
    },

    getSingleton: () =>{
         //Must call init first
         return gSingletonSession;
    }
}






