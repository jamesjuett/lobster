import Cookies from "js-cookie";
import { ICON_PERSON } from "./octicons";

// Expects the following elements to be present:
//  lobster-sign-in-button

const SIGN_IN_BUTTON = () => $(".lobster-sign-in-button");


export type UserInfo = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};

let _currentUser: UserInfo | undefined;

export namespace User {

    export async function checkLogin() {
        if (Cookies.get("bearer")) {
            const response = await fetch("api/users/me", {
                method: 'GET',
                headers: {
                    'Authorization': 'bearer ' + Cookies.get('bearer')
                }
            });
            return setUser(await response.json() as UserInfo);
        }
    };

    export function currentUser() {
        return _currentUser;
    }
}


function setUser(user: UserInfo | undefined) {
    _currentUser = user;
    if (user) {
        SIGN_IN_BUTTON().html(`${ICON_PERSON} ${user.email}`);
    }
    else {
        SIGN_IN_BUTTON().html("Sign In");
    }
    return _currentUser;
}

