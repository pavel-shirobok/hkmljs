var HkmlVM = function(markup, keysNodes){
    this._markup = markup;

    if(keysNodes.length == 0){
        throw new Error("Keys nodes must be more, than one");
    }

    this._keysNodes = keysNodes;
    this._currentKeysNodeIndex = 0;
    this._lastCompleteTime = 0;

    this.reset();
    this.updateLastCompleteTime();
};

HkmlVM.prototype.checkPressedKey = function(pressedKeyCode) {
    var lastNodeTestResult;
    if (lastNodeTestResult = this.testCurrentKeysNode(pressedKeyCode)) {
        if (this.moreThanOneNode && this.currentKeysNode.finished) {
            this.updateLastCompleteTime();
            this._currentKeysNodeIndex++;
        }
    } else {
        this.reset();
    }

    return lastNodeTestResult;
};

HkmlVM.prototype.reset = function(){
    this._currentKeysNodeIndex = 0;
    for (var i = 0; i < this._keysNodes.length; i++) {
        var keysNode = this._keysNodes[i];
        keysNode.reset();
    }
};

HkmlVM.prototype.testCurrentKeysNode = function(keyCode) {
    return this.currentKeysNode.checkPressedKey(keyCode, this._lastCompleteTime)
};

HkmlVM.prototype.updateLastCompleteTime = function(){
    this._lastCompleteTime = getTimer();
};

HkmlVM.prototype.__defineGetter__('finished', function(){
    return this._keysNodes[this._keysNodes.length - 1].finished;
});

HkmlVM.prototype.__defineGetter__('currentKeysNode', function(){
    return this._keysNodes[this._currentKeysNodeIndex];
});

HkmlVM.prototype.__defineGetter__('moreThanOneNode', function(){
    return this._keysNodes.length > 1;
});

HkmlVM.prototype.__defineGetter__('markup', function(){
    return this._markup;
});

HkmlVM.prototype.toString = function() {
    return "HkmlVM{" + String(this._keysNodes) + "}";
};

HkmlVM.prototype.destroy = function() {
    for(var i = 0; i < this._keysNodes.length; i++){
        this._keysNodes[i].destroy();
    }
    this._keysNodes = undefined;
};