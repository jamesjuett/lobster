"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeMessage = Class.extend({
    _name: "RuntimeMessage",
    text: Class._ABSTRACT
});
exports.DeadObjectMessage = exports.RuntimeMessage.extend({
    _name: "DeadObjectMessage",
    init: function (deadObj, options) {
        assert(isA(deadObj, CPPObject));
        this.deadObj = deadObj;
        // If we're working with a subobject, its lifetime is tied to that of its parent object
        // while(isA(this.deadObj, Subobject)) {
        //     this.deadObj = this.deadObj.containingObject;
        // }
        this.options = options || {};
    },
    text: function () {
    },
    display: function (sim, rtConstruct) {
        var text0;
        if (this.options.fromDereference) {
            text0 = "I followed that pointer, but I don't like what I found. There's no legitimate data here. Perhaps you dereferenced an invalid pointer/address, or maybe it was a dangling pointer to a dead object?";
        }
        else if (this.options.fromSubscript) {
            text0 = "The object retrieved from that subscript operation doesn't exist. Either you indexed out of bounds, or possibly the underlying array itself was no longer around.";
        }
        else if (this.options.fromDelete) {
            text0 = "Uh...the object you're trying to delete is already dead...";
        }
        else {
            text0 = "Uh oh. It looks like the object you're trying to work with is dead.";
        }
        var text1 = "";
        if (isA(this.deadObj, DynamicObject)) {
            text1 = "\n\nIt was dynamically allocated on the heap, but has since been been deleted.";
            var killer = this.deadObj.obituary().killer;
            if (killer) {
                var srcCode = findNearestTrackedConstruct(killer.model).code;
                if (srcCode) {
                    killer.send("current");
                    text1 = "\n\nIt was dynamically allocated on the heap, but has since been deleted by line " + srcCode.line + ":\n<span class='code'>" + srcCode.text + "</span>";
                }
            }
        }
        else if (isA(this.deadObj, AutoObject)) {
            text1 = "\n\nIt was a local variable declared at the highlighted line, but it already has gone out of scope.";
        }
        sim.undefinedBehavior(text0 + text1);
    }
});
//# sourceMappingURL=runtimeEvents.js.map