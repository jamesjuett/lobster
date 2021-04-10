"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Observable = exports.messageResponse = exports.stopListeningTo = exports.removeListener = exports.listenTo = exports.addListener = void 0;
const pull_1 = __importDefault(require("lodash/pull"));
// interface ObservableType {
//     send(category: string, data: any) : void;
//     addListener(listener: ObserverType, category?: string | string[]) : ObservableType;
//     removeListener(listener: ObserverType, category?: string) : ObservableType;
//     identify(category: string, func: (o:ObserverType) => any) : ObserverType;
// }
function addListener(objWithObservable, listener, category) {
    if (!objWithObservable) {
        return;
    }
    objWithObservable.observable.addListener(listener, category);
}
exports.addListener = addListener;
function listenTo(listener, objWithObservable, category) {
    if (!objWithObservable) {
        return;
    }
    objWithObservable.observable.addListener(listener, category);
}
exports.listenTo = listenTo;
function removeListener(objWithObservable, listener, category) {
    if (!objWithObservable) {
        return;
    }
    objWithObservable.observable.removeListener(listener, category);
}
exports.removeListener = removeListener;
function stopListeningTo(listener, objWithObservable, category) {
    if (!objWithObservable) {
        return;
    }
    objWithObservable.observable.removeListener(listener, category);
}
exports.stopListeningTo = stopListeningTo;
function messageResponse(messageCategory, unwrap) {
    return function (target, propertyKey, descriptor) {
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
            target._act[messageCategory || propertyKey] = function (msg) { action.call(this, msg.data); };
        }
        else {
            target._act[messageCategory || propertyKey] = target[propertyKey];
        }
    };
}
exports.messageResponse = messageResponse;
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
function receiveMessage(observer, msg) {
    if (!observer._act) {
        return;
    }
    var catAct = observer._act[msg.category];
    if (catAct) {
        catAct.call(observer, msg);
    }
    else if (observer._act._default) {
        observer._act._default.call(observer, msg);
    }
    else {
        // do nothing, message ignored
    }
}
class Observable {
    // private markedForRemoval: boolean[] = [];
    constructor(source) {
        this.universalObservers = [];
        this.observers = {};
        this.source = source;
    }
    send(category, data) {
        if (this.source.silent) {
            return;
        }
        let msg = {
            category: category,
            data: data,
            source: this.source
        };
        let observers = this.observers[category];
        if (observers) {
            this.sendMessageToObservers(observers, msg);
        }
        this.sendMessageToObservers(this.universalObservers, msg);
    }
    sendMessageToObservers(observers, msg) {
        observers = observers.slice(0); // create a clone of the array so we avoid issues with concurrent modification
        for (let i = 0; i < observers.length; ++i) {
            // this.markedForRemoval.push(false);
            receiveMessage(observers[i], msg);
            // if (this.markedForRemoval[this.markedForRemoval.length - 1]) {
            //     observers.splice(i, 1);
            //     --i;
            // }
            // this.markedForRemoval.pop();
        }
    }
    // public stopListening() {
    //     this.markedForRemoval[this.markedForRemoval.length - 1] = true;
    // }
    addListener(listener, category) {
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
                this.observers[category].push(listener);
                this.listenerAdded(listener, category);
            }
        }
        else {
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
    removeListener(listener, category) {
        if (category) {
            if (Array.isArray(category)) {
                // If there's an array of categories, add to all individually
                for (var i = 0; i < category.length; ++i) {
                    this.removeListener(listener, category[i]);
                }
            }
            else {
                // Remove from the list for a specific category (if list exists)
                let observers = this.observers[category];
                observers && pull_1.default(observers, listener);
                this.listenerRemoved(listener, category);
            }
        }
        else {
            // Remove from all categories
            for (let cat in this.observers) {
                this.removeListener(listener, cat);
            }
            // Also remove from universal listeners
            pull_1.default(this.universalObservers, listener);
            this.listenerRemoved(listener);
        }
        return this;
    }
    listenerAdded(listener, category) { }
    listenerRemoved(listener, category) { }
}
exports.Observable = Observable;
//# sourceMappingURL=observe.js.map