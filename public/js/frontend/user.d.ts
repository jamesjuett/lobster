export declare type User = {
    id: number;
    email: string;
    name: string;
    is_super: boolean;
};
export declare function checkLogin(): Promise<void>;
