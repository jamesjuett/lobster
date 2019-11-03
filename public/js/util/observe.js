"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var pull_1 = __importDefault(require("lodash/pull"));
// interface ObservableType {
//     send(category: string, data: any) : void;
//     addListener(listener: ObserverType, category?: string | string[]) : ObservableType;
//     removeListener(listener: ObserverType, category?: string) : ObservableType;
//     identify(category: string, func: (o:ObserverType) => any) : ObserverType;
// }
function addListener(objWithObservable, listener, category) {
    objWithObservable.observable.addListener(listener, category);
}
exports.addListener = addListener;
function messageResponse(messageCategory) {
    return function (target, propertyKey, descriptor) {
        if (!target._act) {
            target._act = {};
        }
        target._act[messageCategory || propertyKey] = target[propertyKey];
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
    var catAct = observer._act[msg.category];
    if (catAct) {
        catAct.call(observer, msg);
    }
    else if (observer._act._default) {
        observer._act._default.call(observer, msg);
    }
    else {
        assert(false);
    }
}
var Observable = /** @class */ (function () {
    function Observable(source) {
        this.universalObservers = [];
        this.observers = {};
        this.source = source;
    }
    Observable.prototype.send = function (category, data) {
        if (this.source.silent) {
            return;
        }
        var msg = {
            category: category,
            data: data,
            source: this.source
        };
        var observers = this.observers[msg.category];
        if (observers) {
            for (var i = 0; i < observers.length; ++i) {
                receiveMessage(observers[i], msg);
            }
        }
        for (var i = 0; i < this.universalObservers.length; ++i) {
            receiveMessage(this.universalObservers[i], msg);
        }
    };
    Observable.prototype.addListener = function (listener, category) {
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
    };
    /*
    Note: to remove a universal listener, you must call this with category==false.
    If a listener is universal, removing it from a particular category won't do anything.
    */
    Observable.prototype.removeListener = function (listener, category) {
        if (category) {
            // Remove from the list for a specific category (if list exists)
            var observers = this.observers[category];
            observers && pull_1.default(observers, listener);
            this.listenerRemoved(listener, category);
        }
        else {
            // Remove from all categories
            for (var cat in this.observers) {
                this.removeListener(listener, cat);
            }
            // Also remove from universal listeners
            pull_1.default(this.universalObservers, listener);
            this.listenerRemoved(listener);
        }
        return this;
    };
    Observable.prototype.listenerAdded = function (listener, category) { };
    Observable.prototype.listenerRemoved = function (listener, category) { };
    return Observable;
}());
exports.Observable = Observable;
//# sourceMappingURL=observe.js.map