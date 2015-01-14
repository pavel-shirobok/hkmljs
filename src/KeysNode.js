var KeysNode = function(keys, delay, orMode){
    delay  = delay || 0;
    orMode = orMode || false;

    if(this.existRepeatingKeyCodes(keys)) {
        throw new Error("Keys must be unique in one instance of KeysNode");
    }

    this._keys   = keys;
    this._delay  = delay;
    this._orMode = orMode;
    this._indexOfKeyToTest = 0;

    if(orMode) {
        this._keysStatus = new Array(keys.length);
        this.resetKeyStatuses();
    }
};

KeysNode.prototype.__defineGetter__('finished', function(){
    if(this._orMode) {
        for(var i = 0; i < this._keysStatus.length; i++) {
            var keyStatus = this._keysStatus[i];
            if(!keyStatus)return false;
        }
        return true;
    }
    return this._keys.length == this._indexOfKeyToTest;
});

KeysNode.prototype.existRepeatingKeyCodes = function(keys) {
    for (var i = 0; i < keys.length - 1; i++) {
        if(keys.indexOf(keys[i], i + 1) != -1)return true;
    }
    return false;
};

KeysNode.prototype.checkPressedKey = function(keyCode, timeOfCompletePrevKeyNode){
    var timer = getTimer();
    if (this._delay != 0) {
        if (timer - timeOfCompletePrevKeyNode > this._delay) {
            this.reset();
            return false;
        }
    }

    var keyFromQueue;

    if (this._orMode) {
        var index = this._keys.indexOf(keyCode);
        if (index == -1) {
            this.reset();
            return false;
        }

        var alreadyPressed = this._keysStatus[index];
        if (alreadyPressed) {
            this.reset();
            return false;
        }
        this._keysStatus[index] = true;

    } else {
        keyFromQueue = this._keys[this._indexOfKeyToTest];

        if (keyCode != keyFromQueue) {
            this.reset();
            return false;
        }

        this._indexOfKeyToTest++;
    }

    return true;
};

KeysNode.prototype.reset = function(){

    if (this._orMode) {
        this.resetKeyStatuses();
    } else {
        this._indexOfKeyToTest = 0;
    }
};

KeysNode.prototype.resetKeyStatuses = function() {
    for (var i = 0; i < this._keysStatus.length; i++) {
        this._keysStatus[i] = false;
    }
};

KeysNode.prototype.toString = function(){
    return "(" + (this._delay > 0 ? (this._delay + ":") : "") + this._keys.join(this._orMode ? "+" : ">>") + ")";
};

KeysNode.prototype.destroy = function(){
    this._keys = this._keysStatus = undefined;
};