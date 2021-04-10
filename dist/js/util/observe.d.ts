export interface Message<Data_type = any> {
    category: string;
    data: Data_type;
    source: any;
}
export declare function addListener<PotentialMessages extends string>(objWithObservable: {
    observable: Observable<PotentialMessages>;
}, listener: ObserverType, category?: PotentialMessages | PotentialMessages[]): void;
export declare function listenTo<PotentialMessages extends string>(listener: ObserverType, objWithObservable: {
    observable: Observable<PotentialMessages>;
}, category?: PotentialMessages | PotentialMessages[]): void;
export declare function removeListener<PotentialMessages extends string>(objWithObservable: {
    observable: Observable<PotentialMessages>;
}, listener: ObserverType, category?: PotentialMessages | PotentialMessages[]): void;
export declare function stopListeningTo<PotentialMessages extends string>(listener: ObserverType, objWithObservable: {
    observable: Observable<PotentialMessages>;
}, category?: PotentialMessages | PotentialMessages[]): void;
export declare function messageResponse(messageCategory?: string, unwrap?: "unwrap"): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export interface MessageResponses {
    [index: string]: ((msg: Message) => void);
}
export interface ObserverType {
    _act: MessageResponses;
}
export declare class Observable<PotentialMessages extends string = string> {
    private universalObservers;
    private observers;
    private readonly source;
    constructor(source: any);
    send(category: PotentialMessages, data?: any): void;
    private sendMessageToObservers;
    addListener(listener: ObserverType, category?: PotentialMessages | PotentialMessages[]): this;
    removeListener(listener: ObserverType, category?: PotentialMessages | PotentialMessages[]): this;
    protected listenerAdded(listener: ObserverType, category?: PotentialMessages): void;
    protected listenerRemoved(listener: ObserverType, category?: PotentialMessages): void;
}
