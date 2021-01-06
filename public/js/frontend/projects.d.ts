/// <reference types="jquery" />
/// <reference types="bootstrap" />
import { UserInfo } from "./user";
export declare class MyProjects {
    private element;
    private listElem;
    user: UserInfo;
    constructor(element: JQuery, user: UserInfo);
    refresh(): Promise<void>;
}
