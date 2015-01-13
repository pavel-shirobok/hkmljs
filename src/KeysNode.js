var KeysNode = function(keys, delay, orMode){
    delay  = delay || 0;
    orMode = orMode || false;

    if(this.existRepeatingKeyCodes(keys)){
        throw new Error("Keys must be unique in one instance of KeysNode");
    }

    this._keys   = keys;
    this._delay  = delay;
    this._orMode = orMode;

    if(orMode) {
        this._keysStatus = {};
        this.resetKeyStatuses();
    }
};

KeysNode.prototype.existRepeatingKeyCodes = function(keys) {
    for (var i = 0; i < keys.length - 1; i++) {
        if(keys.indexOf(keys[i], i + 1) != -1)return true;
    }
    return false;
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

KeysNode.NO_TEST_TIME = 0;



//todo DRAFT