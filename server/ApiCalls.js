export default class APIS{
    #url = 'http://localhost:12346';
    //#url = 'https://www.saimanikiranbandi.com:12346';
    constructor() {

        this.verification = this.#url + '/api/send-verification';
        this.login = this.#url + '/api/login';
        this.signup = this.#url + '/api/signup';
        this.authentication = this.#url + '/api/verify-otp';
        this.session = this.#url + '/api/session';
        this.items = this.#url + '/api/items';
        this.logout = this.#url + '/api/logout';
        this.user = this.#url + '/api/user';
        this.updateuser = this.#url + '/api/updateuser';
        this.addItems = this.#url + '/api/add-items';
        this.addItems1 = this.#url + '/api/get-add-items';
        this.Protected = this.#url + '/protected';
        this.addtocart = this.#url + '/api/add-to-cart';
        this.cart = this.#url + '/api/cart';
        this.removecart =this.#url+'/api/remove-from-cart';
        this.updatecart = this.#url + '/api/update-cart';
        this.payment = this.#url + '/payment';
        this.success = this.#url + '/finalize-order';
        this.sendmessage = this.#url + '/api/send-Message';
        this.orderedItems = this.#url + '/api/ordered-items';
        this.userDetails = this.#url + "/api/user-details";
    }
    getUrl(){
        return this.#url;
    }
}
