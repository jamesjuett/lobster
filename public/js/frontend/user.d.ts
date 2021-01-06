import { Observable } from "../util/observe";
export declare type UserInfo = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};
declare type UserMessages = "userLoggedIn" | "userLoggedOut";
export declare class User {
    observable: Observable<UserMessages>;
    readonly currentUser?: UserInfo;
    checkLogin(): Promise<void>;
    logout(): void;
}
export {};
