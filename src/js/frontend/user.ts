import Cookies from "js-cookie";
import { Observable } from "../util/observe";
import { Mutable } from "../util/util";

// Expects the following elements to be present:
//  lobster-sign-in-button

export type UserInfo = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};

type UserMessages =
    "userLoggedIn" |
    "userLoggedOut";

export class Users {
    
    public observable = new Observable<UserMessages>(this);

    public readonly currentUser?: UserInfo;

    public async checkLogin() {
        if (Cookies.get("bearer")) {
            const response = await fetch("api/users/me", {
                method: 'GET',
                headers: {
                    'Authorization': 'bearer ' + Cookies.get('bearer')
                }
            });

            if (response.status === 200) {
                let newUser = await response.json() as UserInfo;
                if (!this.currentUser || newUser.id !== this.currentUser.id) {
                    (<Mutable<this>>this).currentUser = newUser;
                    this.observable.send("userLoggedIn", newUser);
                }
            }
            else {
                this.logout();
            }
        }
        else {
            this.logout();
        }
    }

    public logout() {
        Cookies.remove("bearer");
        if (this.currentUser) {
            let oldUser = this.currentUser;
            delete (<Mutable<this>>this).currentUser;
            this.observable.send("userLoggedOut", oldUser);
        }
    }

    public getBearerToken() {
        return Cookies.get('bearer');
    }

}

export let USERS = new Users();

