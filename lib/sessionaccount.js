

export class SessionAccountFactory {
    static sessionAccountInit = ()=> {
        return new SessionAccount();
    }
}

export class SessionAccount {



    getTestString() {
        return "Hello World prove it works";
    }

}

