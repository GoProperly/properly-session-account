
import * as AWS from 'aws-sdk';

import {CognitoAuth} from 'amazon-cognito-auth-js/dist/amazon-cognito-auth';

import * as AmazonCognitoIdentity from "amazon-cognito-auth-js"

//var CognitoAuth = AmazonCognitoIdentity.CognitoAuth;

let gSingletonSession = null;


const USER_ID_PATH = "user.id";
const USER_EMAIL_PATH = "user.email";

const RETURN_AFTER_LOGIN = "nav.returnAfterLogin";





const STAGING_LOGIN_HOST = "staging-goproperly-com.auth.us-east-1.amazoncognito.com";
const STAGING_CLIENT_APP_ID = "3iuhnprmod0josge24ogarecfp";

const STAGING_SIGNIN_REDIRECT_URI = "https://staging.goproperly.com/stagingbounce.html";
const STAGING_SIGNOUT_REDIRECT_URI = "https://staging.goproperly.com/todocreatelogout.html";
const STAGING_USER_POOL_ID= "us-east-1_OF5OOfdx0";







export class SessionAccount {

    constructor(idGeneratorFunction) {
        this.userId = null;
        this.idGeneratorFunction = idGeneratorFunction;
        this.session = null;
        this.auth = null;

    }



    getTestString() {
        return "Hello World prove it works";
    }


    getUntrustedUserId() {


        let storage = window.localStorage;

        if (!(this.userId ))
        {
            //try reading first
            this.userId = storage.getItem(USER_ID_PATH);
        }

        if (!(this.userId)) {
            // record in session
            this.userId = idGeneratorFunction();

            //store if created
            storage.setItem(USER_ID_PATH, this.userId);
        }
        return this.userId;
    }


    updateUntrustedEmailAddress(emailAddress) {
        let storage = window.localStorage;

        storage.setItem(USER_EMAIL_PATH, emailAddress);

        return;

    }

    getUntrustedEmailAddress() {

        let storage = window.localStorage;

        let emailAddress = storage.getItem(USER_EMAIL_PATH);

        if (!(emailAddress)) {return null;}

        return emailAddress;

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
            },
            onFailure: function (err) {
                console.log("Error: " + err.toString());
            }
        };


    }



    isLoggedIn  () {
        if (this.auth == null) { return false}
        return this.auth.isUserSignedIn()

    }

    //TODO: setup promise to handle login delay
    doLogin (returnToURL)  {
        let sessionStorage = window.sessionStorage;


        sessionStorage.setItem(RETURN_AFTER_LOGIN,returnToURL);

        this.auth.getSession(); //triggers login redirect


    }

    doSignout()  {
        this.auth.signOut();

    }

    getJWT ()  {
        if (this.auth == null) { return undefined;}
        if (!(this.auth.isUserSignedIn())) { return undefined;}

        let session = this.auth.getSignInUserSession()

        let jwtToken = session.getIdToken().getJwtToken();

        return session.getIdToken().getJwtToken();
    }


}





const DOMAIN_FOR_STORAGE = "goproperly.com";
//Namespace the factory wrapper
export var SessionAccountFactory = {
     sessionAccountInit: (idGeneratorFunction, useStagingFlag)=> {
         if (gSingletonSession != null) {
             return gSingletonSession
         }
         else
         {
             let sessionAccountObject = new SessionAccount(idGeneratorFunction);

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






