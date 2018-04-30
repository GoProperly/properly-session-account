


export class SessionAccount {



    getTestString() {
        return "Hello World prove it works";
    }

}





export class SessionAccountFactory {
    static sessionAccountInit = ()=> {
        return new SessionAccount();
    }
}
