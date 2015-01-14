!function() {
    function getTimer() {
        return new Date().getTime();
    }
    var HkmlVM = function(markup, keysNodes) {
        if (this._markup = markup, 0 == keysNodes.length) throw new Error("Keys nodes must be more, than one");
        this._keysNodes = keysNodes, this._currentKeysNodeIndex = 0, this._lastCompleteTime = 0, 
        this.reset(), this.updateLastCompleteTime();
    };
    HkmlVM.prototype.checkPressedKey = function(pressedKeyCode) {
        var lastNodeTestResult;
        return (lastNodeTestResult = this.testCurrentKeysNode(pressedKeyCode)) ? this.moreThanOneNode && this.currentKeysNode.finished && (this.updateLastCompleteTime(), 
        this._currentKeysNodeIndex++) : this.reset(), lastNodeTestResult;
    }, HkmlVM.prototype.reset = function() {
        this._currentKeysNodeIndex = 0;
        for (var i = 0; i < this._keysNodes.length; i++) {
            var keysNode = this._keysNodes[i];
            keysNode.reset();
        }
    }, HkmlVM.prototype.testCurrentKeysNode = function(keyCode) {
        return this.currentKeysNode.checkPressedKey(keyCode, this._lastCompleteTime);
    }, HkmlVM.prototype.updateLastCompleteTime = function() {
        this._lastCompleteTime = getTimer();
    }, HkmlVM.prototype.__defineGetter__("finished", function() {
        return this._keysNodes[this._keysNodes.length - 1].finished;
    }), HkmlVM.prototype.__defineGetter__("currentKeysNode", function() {
        return this._keysNodes[this._currentKeysNodeIndex];
    }), HkmlVM.prototype.__defineGetter__("moreThanOneNode", function() {
        return this._keysNodes.length > 1;
    }), HkmlVM.prototype.__defineGetter__("markup", function() {
        return this._markup;
    }), HkmlVM.prototype.toString = function() {
        return "HkmlVM{" + String(this._keysNodes) + "}";
    }, HkmlVM.prototype.destroy = function() {
        for (var i = 0; i < this._keysNodes.length; i++) this._keysNodes[i].destroy();
        this._keysNodes = void 0;
    };
    var KeysNode = function(keys, delay, orMode) {
        if (delay = delay || 0, orMode = orMode || !1, this.existRepeatingKeyCodes(keys)) throw new Error("Keys must be unique in one instance of KeysNode");
        this._keys = keys, this._delay = delay, this._orMode = orMode, this._indexOfKeyToTest = 0, 
        orMode && (this._keysStatus = new Array(keys.length), this.resetKeyStatuses());
    };
    KeysNode.prototype.__defineGetter__("finished", function() {
        if (this._orMode) {
            for (var i = 0; i < this._keysStatus.length; i++) {
                var keyStatus = this._keysStatus[i];
                if (!keyStatus) return !1;
            }
            return !0;
        }
        return this._keys.length == this._indexOfKeyToTest;
    }), KeysNode.prototype.existRepeatingKeyCodes = function(keys) {
        for (var i = 0; i < keys.length - 1; i++) if (-1 != keys.indexOf(keys[i], i + 1)) return !0;
        return !1;
    }, KeysNode.prototype.checkPressedKey = function(keyCode, timeOfCompletePrevKeyNode) {
        var timer = getTimer();
        if (0 != this._delay && timer - timeOfCompletePrevKeyNode > this._delay) return this.reset(), 
        !1;
        var keyFromQueue;
        if (this._orMode) {
            var index = this._keys.indexOf(keyCode);
            if (-1 == index) return this.reset(), !1;
            var alreadyPressed = this._keysStatus[index];
            if (alreadyPressed) return this.reset(), !1;
            this._keysStatus[index] = !0;
        } else {
            if (keyFromQueue = this._keys[this._indexOfKeyToTest], keyCode != keyFromQueue) return this.reset(), 
            !1;
            this._indexOfKeyToTest++;
        }
        return !0;
    }, KeysNode.prototype.reset = function() {
        this._orMode ? this.resetKeyStatuses() : this._indexOfKeyToTest = 0;
    }, KeysNode.prototype.resetKeyStatuses = function() {
        for (var i = 0; i < this._keysStatus.length; i++) this._keysStatus[i] = !1;
    }, KeysNode.prototype.toString = function() {
        return "(" + (this._delay > 0 ? this._delay + ":" : "") + this._keys.join(this._orMode ? "+" : ">>") + ")";
    }, KeysNode.prototype.destroy = function() {
        this._keys = this._keysStatus = void 0;
    };
}(window);