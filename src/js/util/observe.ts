
import pull from "lodash/pull";
import { assert } from "./util";

export interface Message<Data_type = any> {
    category: string;
    data: Data_type;
    source: any;
}


// interface ObservableType {
//     send(category: string, data: any) : void;
//     addListener(listener: ObserverType, category?: string | string[]) : ObservableType;
//     removeListener(listener: ObserverType, category?: string) : ObservableType;
//     identify(category: string, func: (o:ObserverType) => any) : ObserverType;
// }

export function addListener<PotentialMessages extends string>(objWithObservable: {observable: Observable<PotentialMessages>}, listener: ObserverType, category?: PotentialMessages | PotentialMessages[]) {
    objWithObservable.observable.addListener(listener, category);
}

export function listenTo<PotentialMessages extends string>(listener: ObserverType, objWithObservable: {observable: Observable<PotentialMessages>}, category?: PotentialMessages | PotentialMessages[]) {
    objWithObservable.observable.addListener(listener, category);
}

export function removeListener<PotentialMessages extends string>(objWithObservable: {observable: Observable<PotentialMessages>}, listener: ObserverType, category?: PotentialMessages | PotentialMessages[]) {
    objWithObservable.observable.removeListener(listener, category);
}

export function stopListeningTo<PotentialMessages extends string>(listener: ObserverType, objWithObservable: {observable: Observable<PotentialMessages>}, category?: PotentialMessages | PotentialMessages[]) {
    objWithObservable.observable.removeListener(listener, category);
}

export function messageResponse(messageCategory?: string, unwrap? : "unwrap") {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target._act) {
            // no _act object, and no base class has one either
            target._act = {};
        }
        else if (!target.hasOwnProperty("_act")) {
            // we don't have an _act object, but a base class does, so we create one
            // for us that has the base class one as a prototype
            target._act = Object.create(target._act);
        }

        if (unwrap) {
            let action = target[propertyKey];
            target._act[messageCategory || propertyKey] = function(msg: any) { action.call(this, msg.data); };
        }
        else {
            target._act[messageCategory || propertyKey] = target[propertyKey];
        }
    };
}

export interface MessageResponses {
    [index: string]: ((msg: Message) => void);
}

export interface ObserverType {
    _act : MessageResponses;
}

// export class Observer {
//     private readonly actor: Actor;

//     constructor(actor: Actor) {
//         this.actor = actor;
//     }

//     public _IDENTIFY(msg : {data:(o:any) => void}) {
//         msg.data(this);
//     }

//     public listenTo(other: ObservableType, category: string) {
//         other.addListener(this, category);
//         return this;
//     }

//     public stopListeningTo(other: ObservableType, category: string) {
//         if (other) {
//             other.removeListener(this, category);
//         }
//         return this;
//     }

//     public recv (msg : Message) {

//         // Call the "_act" function for this
//         var catAct = this.actor._act[msg.category];
//         if (catAct){
//             catAct.call(this.actor, msg);
//         }
//         else if (this.actor._act._default) {
//             this.actor._act._default.call(this.actor, msg);
//         }
//         else {
//             assert(false);
//         }

//     }
// }

function receiveMessage(observer: ObserverType, msg: Message) {
    if (!observer._act) {
        return;
    }
    var catAct = observer._act[msg.category];
    if (catAct){
        catAct.call(observer, msg);
    }
    else if (observer._act._default) {
        observer._act._default.call(observer, msg);
    }
    else {
        // do nothing, message ignored
    }
}

export class Observable<PotentialMessages extends string = string> {
    private universalObservers: ObserverType[] = [];
    private observers: {[index: string] : ObserverType[] | undefined} = {};

    private readonly source: any;

    constructor(source: any) {
        this.source = source;
    }

    public send(category: PotentialMessages, data?: any) {
        if (this.source.silent){
            return;
        }
        
        let msg: Message = {
            category: category,
            data: data,
            source: this.source
        };

        let observers = this.observers[category];
        if (observers) {
            for (let i = 0; i < observers.length; ++i) {
                receiveMessage(observers[i], msg);
            }
        }

        for (let i = 0; i < this.universalObservers.length; ++i) {
            receiveMessage(this.universalObservers[i], msg);
        }
    }

    public addListener(listener: ObserverType, category?: PotentialMessages | PotentialMessages[]) {
        if (category) {
            if (Array.isArray(category)) {
                // If there's an array of categories, add to all individually
                for (var i = 0; i < category.length; ++i) {
                    this.addListener(listener, category[i]);
                }
            }
            else {
                if (!this.observers[category]) {
                    this.observers[category] = [];
                }
                this.observers[category]!.push(listener);
                this.listenerAdded(listener, category);
            }
        }
        else{
            // if no category, intent is to listen to everything
            this.universalObservers.push(listener);
            this.listenerAdded(listener);
        }
        return this;
    }


    /*
    Note: to remove a universal listener, you must call this with category==false.
    If a listener is universal, removing it from a particular category won't do anything.
    */
    public removeListener(listener: ObserverType, category?: PotentialMessages | PotentialMessages[]) {
        if(category) {
            if (Array.isArray(category)) {
                // If there's an array of categories, add to all individually
                for (var i = 0; i < category.length; ++i) {
                    this.removeListener(listener, category[i]);
                }
            }
            else {
                // Remove from the list for a specific category (if list exists)
                let observers = this.observers[category];
                observers && pull(observers, listener);
                this.listenerRemoved(listener, category);
            }
        }
        else{
            // Remove from all categories
            for(let cat in this.observers){
                this.removeListener(listener, <PotentialMessages>cat);
            }

            // Also remove from universal listeners
            pull(this.universalObservers, listener);
            this.listenerRemoved(listener);
        }
        return this;
    }

    protected listenerAdded(listener: ObserverType, category?: PotentialMessages) : void { }
    protected listenerRemoved(listener: ObserverType, category?: PotentialMessages) : void { }

    // public identify(category: string, func: (o:ObserverType) => any) {
    //     let other! : ObserverType; // Uses definite assignment annotation since the function is assumed to assign to other
    //     this.send(category, func || function(o:ObserverType) {other = o;});
    //     return other;
    // }

}
