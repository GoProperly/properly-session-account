
//import * as AWS from 'aws-sdk';

import request from "superagent";

import {CognitoAuth} from 'amazon-cognito-auth-js/dist/amazon-cognito-auth';

import * as AmazonCognitoIdentity from "amazon-cognito-auth-js"

import * as URL from 'url-parse';

import * as UserInfoStash from 'properly-util-js/lib/user-info-stash.js'

import * as Sprintf from "sprintf-js"

let gSingletonSession = null;





const RETURN_AFTER_LOGIN_KEY = "nav.returnAfterLogin";



const STAGING_USER_POOL_ID= "us-east-1_OF5OOfdx0";

const PROD_USER_POOL= "us-east-1_4qEsCz4ZK";

//staging:
//prod:


const STAGING_ADMIN_CONFIG = {defaultReturnLogin: "https://staging.admin.goproperly.com/",
                        defaultReturnSignout: "https://staging.admin.goproperly.com/",
                        clientId: "3iuhnprmod0josge24ogarecfp",
                        loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
                        loginResultRedirect: "https://staging.admin.goproperly.com/hackloginhandlerbounce.html",
                        signoutResultRedirect: "https://staging.admin.goproperly.com/hacksignoutbounce.html",
                        pool: STAGING_USER_POOL_ID,
                        checkLoginTemplate: "https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s",
                        };



const DEV_ADMIN_CONFIG = {defaultReturnLogin: "https://dev.admin.goproperly.com:9000/",
    defaultReturnSignout: "https://dev.admin.goproperly.com:9000/",
    clientId: "aho39mccbviiiirringp742c7",
    loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://dev.admin.goproperly.com:9000/nc/loginhandler.html",
    signoutResultRedirect: "https://dev.admin.goproperly.com:9000/nc/signout.html",
    pool: STAGING_USER_POOL_ID,
    checkLoginTemplate: "https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s",

};



const PROD_ADMIN_CONFIG = {defaultReturnLogin: "https://www.admin.goproperly.com/",
    defaultReturnSignout: "https://www.admin.goproperly.com/",
    clientId: "g94dv704eo2968005pqb0h2i0",
    loginHost: "goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://www.admin.goproperly.com/nc/loginhandler.html",
    signoutResultRedirect: "https://www.admin.goproperly.com/nc/signout.html",
    pool: PROD_USER_POOL,
    checkLoginTemplate: "https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s",
};



const STAGING_CONFIG = {defaultReturnLogin: "https://staging.goproperly.com/",
    defaultReturnSignout: "https://staging.goproperly.com/",
    clientId: "7be00v7pugqef2nmtgn1jgm0vj",
    loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://staging.goproperly.com/hackloginhandlerbounce.html",
    signoutResultRedirect: "https://staging.goproperly.com/hacksignoutbounce.html",
    pool: STAGING_USER_POOL_ID,
    checkLoginTemplate: "https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s",

};



const DEV_CONFIG = {defaultReturnLogin: "https://dev.goproperly.com:8000/",
    defaultReturnSignout: "https://dev.goproperly.com:8000/",
    clientId: "2m48siscbain33pe2tr6b2mvcf",
    loginHost: "staging-goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://dev.goproperly.com:8000/nc/loginhandler.html",
    signoutResultRedirect: "https://dev.goproperly.com:8000/nc/signout.html",
    pool: STAGING_USER_POOL_ID,
    checkLoginTemplate: "https://2tpc2k1y2l.execute-api.us-east-1.amazonaws.com/staging/account/checklogin/%1$s",

};



const PROD_CONFIG = {defaultReturnLogin: "https://www.goproperly.com/",
    defaultReturnSignout: "https://www.goproperly.com/",
    clientId: "57kepoqsh0boqp5ug7c4ia0btf",
    loginHost: "goproperly-com.auth.us-east-1.amazoncognito.com",
    loginResultRedirect: "https://www.goproperly.com/nc/loginhandler.html",
    signoutResultRedirect: "https://www.goproperly.com/nc/signout.html",
    pool: PROD_USER_POOL,
    checkLoginTemplate: "https://w5gv3a4n5e.execute-api.us-east-1.amazonaws.com/prod/account/checklogin/%1$s",
};



let configMap = {
}
configMap["staging.admin.goproperly.com"] = STAGING_ADMIN_CONFIG;
configMap["dev.admin.goproperly.com"] = DEV_ADMIN_CONFIG;
configMap["www.admin.goproperly.com"] = PROD_ADMIN_CONFIG;

configMap["staging.goproperly.com"] = STAGING_CONFIG;
configMap["dev.goproperly.com"] = DEV_CONFIG;
configMap["www.goproperly.com"] = PROD_CONFIG;




const HACK_STAGING_ENVIRONMENT_PREFIX = "/b/";

export class SessionAccount {

    constructor() {

        this.auth = null;
        this.operatingInHandleLoginContext = false;
        this.currentConfig = null;
    }





    initAWSOnce (currentURL){


        let url = new URL(currentURL);
        let hostname =url.hostname;

        //HACK START: due to deployment path logic:
        let path = url.pathname;

        if (path.indexOf(HACK_STAGING_ENVIRONMENT_PREFIX) === 0) //
        {
            let environmentID = path.substring(HACK_STAGING_ENVIRONMENT_PREFIX.length); //skip the prefix
            environmentID = environmentID.substring(0, environmentID.indexOf("/"));

            sessionStorage.setItem("staging.environmentID", environmentID);


        }
        window.sessionStorage.getItem("staging.environmentID");
        //HACK END: due to deployment path logic



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
                    const idToken = result.getIdToken().getJwtToken();
                    this.performNewLoginActivities(idToken);
                }
                else {
                    console.log("callback for successfull jwt from initiator");
                }


            },
            onFailure: (err) => {
                console.log("Error: " + err.toString());
                throw new Error (err); //failing loudly
            }
        };


    }

    performCheckLoginToServer(idToken) {

        const checkLoginTemplate = this.currentConfig.checkLoginTemplate

        const userId = encodeURIComponent(UserInfoStash.getUserId());





        let uriToUse = Sprintf.sprintf(checkLoginTemplate, userId);

        let emptyJsonBody  = {};

        let apiCompletionPromise =
            request
                .post(uriToUse)
                .send(emptyJsonBody)
                .set('X-Properly-Auth', idToken)
                .set('Accept', 'application/json');



        let promiseToReturn = apiCompletionPromise.then(function(response) {
            console.log('completed check login.');

            let checkLoginResult = response.body;
            if (!checkLoginResult){
                throw new Error("Must have body from the server on checklogin");
            }
            if (!checkLoginResult.id) {
                throw new Error("Must have id from the server on checklogin");
            }
            let serverUserId = checkLoginResult.id;
            console.log(Sprintf.sprintf("Original ID %1$s, ID from Server %2$s", userId, serverUserId) );
            UserInfoStash.updateUserId(serverUserId);

        });

        return promiseToReturn

    }

    performRedirect() {

        let sessionStorage = window.sessionStorage;


        let redirectLocation = sessionStorage.getItem(RETURN_AFTER_LOGIN_KEY);

        if (!redirectLocation) {
            window.location.href = this.currentConfig.defaultReturnLogin;
        }
        else {
            window.location.href = redirectLocation; //go back to original call location, now with cached jwt
        }

    }



    performNewLoginActivities(idToken) {
        console.log("callback for successful login from loginhandler");

        let apiCallPromise = this.performCheckLoginToServer(idToken);

        apiCallPromise.then(function(){
            this.performRedirect();
        }.bind(this));

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






