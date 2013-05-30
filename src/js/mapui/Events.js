//Copied from http://www.nczonline.net/blog/2010/03/09/custom-events-in-javascript/

// Usage:
// var target = new EventTarget();
// function handleEvent(event){
//     alert(event.type);
// };
//
// target.addListener("foo", handleEvent);
// target.fire({ type: "foo" });    //can also do target.fire("foo")
// target.removeListener("foo", handleEvent);

//Copyright (c) 2010 Nicholas C. Zakas. All rights reserved.
//MIT License

function EventTarget(){
    this._listeners = {};
    this._enabled = true;
}

EventTarget.prototype = {

    constructor: EventTarget,

    addListener: function(type, listener){
        if (typeof this._listeners[type] == "undefined"){
            this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
    },

    fire: function(event){
        if(this._enabled) {
            if (typeof event == "string"){
                event = { type: event };
            }
            if (!event.target){
                event.target = this;
            }
            if (!event.type){  //falsy
                throw new Error("Event object missing 'type' property.");
            }
            if (this._listeners[event.type] instanceof Array){
                var listeners = this._listeners[event.type];
                for (var i=0, len=listeners.length; i < len; i++){
                    listeners[i].call(this, event);
                }
            }
        }
    },

    removeListener: function(type, listener){
        if (this._listeners[type] instanceof Array){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    },

    enable: function() {
        this._enabled = true;
    },

    disable: function() {
        this._enabled = false;
    },

    isEnabled: function() {
        return this._enabled;
    }

};

var events = new EventTarget();

