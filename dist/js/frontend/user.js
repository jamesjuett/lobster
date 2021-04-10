"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERS = exports.Users = void 0;
const js_cookie_1 = __importDefault(require("js-cookie"));
const observe_1 = require("../util/observe");
class Users {
    constructor() {
        this.observable = new observe_1.Observable(this);
    }
    checkLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (js_cookie_1.default.get("bearer")) {
                const response = yield fetch("api/users/me", {
                    method: 'GET',
                    headers: {
                        'Authorization': 'bearer ' + js_cookie_1.default.get('bearer')
                    }
                });
                if (response.status === 200) {
                    let newUser = yield response.json();
                    if (!this.currentUser || newUser.id !== this.currentUser.id) {
                        this.currentUser = newUser;
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
        });
    }
    logout() {
        js_cookie_1.default.remove("bearer");
        if (this.currentUser) {
            let oldUser = this.currentUser;
            delete this.currentUser;
            this.observable.send("userLoggedOut", oldUser);
        }
    }
    getBearerToken() {
        return js_cookie_1.default.get('bearer');
    }
}
exports.Users = Users;
exports.USERS = new Users();
//# sourceMappingURL=user.js.map