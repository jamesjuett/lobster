import { Observable } from "../util/observe";
export declare type UserInfo = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};
declare type UserMessages = "userLoggedIn" | "userLoggedOut";
export declare class Users {
    observable: Observable<UserMessages>;
    readonly currentUser?: UserInfo;
    checkLogin(): Promise<void>;
    logout(): void;
    getBearerToken(): string | undefined;
}
export declare let USERS: Users;
export {};
