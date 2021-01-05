import Cookies from "js-cookie";
import { ICON_PERSON } from "./octicons";

// Expects the following elements to be present:
//  lobster-sign-in-button
const SIGN_IN_BUTTON = $(".lobster-sign-in-button");


export type User = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};

let currentUser: User | undefined;

export async function checkLogin() {
    if (Cookies.get("bearer")) {
        const response = await fetch("api/users/me", {
            method: 'GET',
            headers: {
                'Authorization': 'bearer ' + Cookies.get('bearer')
            }
        });
        return setUser(await response.json() as User);
    }
};

function setUser(user: User | undefined) {
    if (user) {
        SIGN_IN_BUTTON.html(`${ICON_PERSON} ${user.email}`);
    }
    else {
        SIGN_IN_BUTTON.html("Sign In");
    }
}

