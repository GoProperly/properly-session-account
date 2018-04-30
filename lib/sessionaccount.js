


export class SessionAccount {


    getTestString() {
        return "Hello World prove it works";
    }

}





export var SessionAccountFactory = {
     sessionAccountInit: ()=> {
        return new SessionAccount();
    }
}
