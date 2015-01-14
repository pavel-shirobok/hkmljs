!function(root) {
    function HkmlBuildError(message, indexOfMarkupErrorChar) {
        this.constructor.prototype.__proto__ = Error.prototype, Error.call(this), Error.captureStackTrace(this, this.constructor), 
        this.name = this.constructor.name, this.message = message, this.indexOfMarkupErrorChar = indexOfMarkupErrorChar;
    }
    function getTimer() {
        return new Date().getTime();
    }
    root.hkml = function(eventTarget) {
        return new HkmlKeyboardController(eventTarget);
    };
    var HkmlCompiler = {
        TOKEN_KEY: "str",
        TOKEN_OR: "or",
        TOKEN_SEQ: "seq",
        SEQ: ">",
        COMB: "+",
        SPACE: " ",
        TAB: "	",
        createToken: function(name, value, index) {
            return {
                name: name,
                value: value,
                index: index
            };
        },
        compile: function(markup) {
            var tokens = HkmlCompiler.tokenize(markup), keyNodes = HkmlCompiler.buildKeysNodes(tokens);
            return new HkmlVM(markup, keyNodes);
        },
        tokenize: function(combination) {
            var i, c, buffer = "", chunks = [];
            for (i = 0; i < combination.length; i++) switch (c = combination[i]) {
              case HkmlCompiler.SEQ:
                for (c = combination[++i], buffer = ""; c != HkmlCompiler.SEQ; ) {
                    if (i == combination.length) throw new HkmlBuildError("Unexpected end of line. Expected '>'", i - 1);
                    buffer += c, c = combination[++i];
                }
                if (0 != buffer.length) {
                    if (isNaN(parseInt(buffer)) || parseInt(buffer) <= 0) throw new HkmlBuildError("Wrong delay value '" + buffer + "'", i - buffer.length - 1);
                } else buffer = "0";
                chunks.push(HkmlCompiler.createToken(HkmlCompiler.TOKEN_SEQ, buffer, i - buffer.length - 1));
                break;

              case HkmlCompiler.COMB:
                chunks.push(HkmlCompiler.createToken(HkmlCompiler.TOKEN_OR, c, i));
                break;

              case HkmlCompiler.TAB:
              case HkmlCompiler.SPACE:
                break;

              default:
                buffer = "";
                do buffer += c, c = combination[++i]; while (c != HkmlCompiler.SEQ && c != HkmlCompiler.COMB && c != HkmlCompiler.SPACE && c != HkmlCompiler.TAB && i != combination.length);
                chunks.push(HkmlCompiler.createToken(HkmlCompiler.TOKEN_KEY, buffer, i)), i--;
            }
        },
        buildKeysNodes: function(tokens) {
            for (var token, currentType, currentValue, currentIndex, keysNodes = [], buffer = [], delay = 0, lastOperation = null, i = 0; i < tokens.length; i++) {
                if (token = tokens[i], currentType = token.name, currentValue = token.value, currentIndex = token.index, 
                0 == i && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) throw new HkmlBuildError("Line must be started by key", currentIndex);
                if (i == tokens.length - 1 && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) throw new HkmlBuildError("Line must be ended by key", currentIndex);
                switch (currentType) {
                  case HkmlCompiler.TOKEN_KEY:
                    buffer.push(currentValue);
                    break;

                  default:
                    var parsedDelay = parseFloat(currentValue), correctDelayed = 0 != parsedDelay && !isNaN(parsedDelay);
                    if (null == lastOperation) correctDelayed ? (keysNodes.push(HkmlCompiler.createKeysNode(buffer, currentType, delay, token.index)), 
                    buffer = [], delay = parsedDelay) : lastOperation = currentType; else if (lastOperation != currentType || correctDelayed) {
                        if (currentType == HkmlCompiler.TOKEN_OR && buffer.length > 1) {
                            var lastToken = buffer.pop();
                            keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index)), 
                            buffer = [ lastToken ];
                        } else keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index)), 
                        buffer = [];
                        delay = parsedDelay, lastOperation = correctDelayed ? null : currentType;
                    } else lastOperation = currentType;
                }
            }
            return 0 != buffer.length && keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index)), 
            keysNodes;
        },
        createKeysNode: function(buffer, type, delay, index) {
            for (var keyStringAlias, keys = new Array(buffer.length), i = 0; i < buffer.length; i++) {
                if (keyStringAlias = buffer[i], void 0 == Keyboard[keyStringAlias]) throw new HkmlBuildError("Unknown key alias '" + keyStringAlias + "'", index);
                keys[i] = Keyboard[keyStringAlias];
            }
            return new KeysNode(keys, delay, type == HkmlCompiler.TOKEN_OR);
        }
    }, HkmlKeyboardController = function(eventsTarget) {
        this._eventsTarget = eventsTarget || root, this._virtualMachines = {}, this.startKeyboardEventListening();
    };
    HkmlKeyboardController.prototype.startKeyboardEventListening = function() {
        var self = this;
        this._eventsTargetCallback = function(e) {
            self.onKeyDown(e);
        }, this._eventsTarget.addEventListener("keydown", this._eventsTargetCallback);
    }, HkmlKeyboardController.prototype.onKeyDown = function(e) {
        for (var markup in this._virtualMachines) {
            var wrapper = this._virtualMachines[markup], vm = wrapper.vm, callback = wrapper.callback;
            vm.checkPressedKey(e.keyCode) ? vm.finished && (vm.reset(), callback && callback(vm.markup, !0)) : (vm.reset(), 
            callback && callback(vm.markup, !1));
        }
    }, HkmlKeyboardController.prototype.on = function(markup, callback) {
        if (this._virtualMachines[markup]) throw new Error("Handler for '" + markup + "' already exist");
        this._virtualMachines[markup] = {
            vm: HkmlCompiler.compile(markup),
            callback: callback
        };
    }, HkmlKeyboardController.prototype.remove = function(markup) {
        if (!this._virtualMachines[markup]) throw new Error("Handler for '" + markup + "' does not exist");
        var wrapper = this._virtualMachines[markup];
        return wrapper.vm.destroy(), wrapper.callback = void 0, delete this._virtualMachines[markup], 
        this;
    }, HkmlKeyboardController.prototype.trigger = function(markup) {
        if (this._virtualMachines[markup]) {
            var callback = this._virtualMachines[markup].callback;
            callback && callback(markup, !0);
        }
        return this;
    }, HkmlKeyboardController.prototype.destroy = function() {
        this._eventsTarget.addEventListener("keydown", this._eventsTargetCallback);
    };
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
    var Keyboard = {}, KeysNode = function(keys, delay, orMode) {
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
}(this);