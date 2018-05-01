
//import * as AWS from 'aws-sdk';

import {CognitoAuth} from 'amazon-cognito-auth-js/dist/amazon-cognito-auth';

import * as AmazonCognitoIdentity from "amazon-cognito-auth-js"

//var CognitoAuth = AmazonCognitoIdentity.CognitoAuth;

let gSingletonSession = null;




const RETURN_AFTER_LOGIN = "nav.returnAfterLogin";

const DEFAULT_RETURN_LOCATION = "https://www.goproperly.com/";



const STAGING_LOGIN_HOST = "staging-goproperly-com.auth.us-east-1.amazoncognito.com";
const STAGING_CLIENT_APP_ID = "3iuhnprmod0josge24ogarecfp";

const STAGING_SIGNIN_REDIRECT_URI = "https://staging.account.goproperly.com/nc/loginhandler.html";
const STAGING_SIGNOUT_REDIRECT_URI = "https://staging.account.goproperly.com/nc/signout.html";
const STAGING_USER_POOL_ID= "us-east-1_OF5OOfdx0";







export class SessionAccount {

    constructor() {

        this.auth = null;
        this.operatingInHandleLoginContext = false;

    }





    initAWSOnce (useStagingFlag){

        var authData = {
            ClientId : STAGING_CLIENT_APP_ID,
            AppWebDomain : STAGING_LOGIN_HOST,
            TokenScopesArray : ['profile','openid','https://k2ty4nv4wk.execute-api.us-east-1.amazonaws.com/testscope'],
            RedirectUriSignIn : STAGING_SIGNIN_REDIRECT_URI,
            RedirectUriSignOut : STAGING_SIGNOUT_REDIRECT_URI,
            IdentityProvider : null,
            UserPoolId : STAGING_USER_POOL_ID,
            AdvancedSecurityDataCollectionFlag : false,
        };

        this.auth = new AmazonCognitoIdentity.CognitoAuth(authData);


        this.auth.userhandler = {
            onSuccess: function (result) {
                console.log("Sign in success");
                console.log("idToken: "+gSingletonSession.session.getIdToken().getJwtToken());
                console.log("idTokenObject: %o",gSingletonSession.session.getIdToken() );
                if (this.operatingInHandleLoginContext) {
                    console.log("callback for successfull login from loginhandler");
                    let sessionStorage = window.sessionStorage;


                    let redirectLocation = sessionStorage.getItem(RETURN_AFTER_LOGIN,returnToURL);

                    if (!redirectLocation) {
                        window.location.href = DEFAULT_RETURN_LOCATION;
                    }
                    else {
                        window.location.href = redirectLocation; //go back to original call location, now with cached jwt
                    }
                }
                else {
                    console.log("callback for successfull login from initiator");
                }


            },
            onFailure: function (err) {
                console.log("Error: " + err.toString());
            }
        };


    }

    callFromHandleLoginOnly(urlOfHandleLogin) {
        this.operatingInHandleLoginContext = true;
        this.auth.parseCognitoWebResponse(urlOfHandleLogin);


    }

    isLoggedIn  () {
        if (this.auth == null) { return false}
        return this.auth.isUserSignedIn()

    }


    //TODO: setup promise to handle login delay
    doLogin (returnToURL)  {
        let sessionStorage = window.sessionStorage;


        sessionStorage.setItem(RETURN_AFTER_LOGIN,returnToURL);

        this.auth.getSession(); //triggers login redirect if needed




    }

    doSignout()  {
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
     sessionAccountInit: ( useStagingFlag)=> {
         if (gSingletonSession != null) {
             return gSingletonSession
         }
         else
         {
             let sessionAccountObject = new SessionAccount();

             //for local storage and other security operations, force all actions to the goproperly.com domain
             //this will only work from subdomains such as admin.goproperly.com etc.

             let currentDomain = document.domain;

             if (currentDomain.indexOf(DOMAIN_FOR_STORAGE) >= 0) {
                 //doesn't set for the domain for localhost
                 document.domain = DOMAIN_FOR_STORAGE;
             }
             sessionAccountObject.initAWSOnce(useStagingFlag); //constructor?

             gSingletonSession = sessionAccountObject;
         }

        return gSingletonSession;
    },

    getSingleton: () =>{
         //Must call init first
         return gSingletonSession;
    }
}






