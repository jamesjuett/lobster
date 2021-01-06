export declare type UserInfo = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};
export declare namespace User {
    function checkLogin(): Promise<UserInfo | undefined>;
    function currentUser(): UserInfo | undefined;
}
