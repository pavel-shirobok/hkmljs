(function(root) {
    var HkmlExport = function(eventTarget) {
        return new HkmlKeyboardController(eventTarget);
    };
    HkmlExport.HkmlVM = HkmlVM;
    HkmlExport.HkmlKeyboardController = HkmlKeyboardController;
    HkmlExport.HkmlCompiler = HkmlCompiler;
    HkmlExport.KeysNode = KeysNode;
    HkmlExport.Keyboard = Keyboard;
    root.hkml = HkmlExport;
    function HkmlBuildError(message, indexOfMarkupErrorChar) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.call(this);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.indexOfMarkupErrorChar = indexOfMarkupErrorChar;
    }
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
            var tokens = HkmlCompiler.tokenize(markup);
            var keyNodes = HkmlCompiler.buildKeysNodes(tokens);
            return new HkmlVM(markup, keyNodes);
        },
        tokenize: function(combination) {
            var i, c, buffer = "", chunks = [];
            for (i = 0; i < combination.length; i++) {
                c = combination[i];
                switch (c) {
                  case HkmlCompiler.SEQ:
                    c = combination[++i];
                    buffer = "";
                    while (c != HkmlCompiler.SEQ) {
                        if (i == combination.length) {
                            throw new HkmlBuildError("Unexpected end of line. Expected '>'", i - 1);
                        }
                        buffer += c;
                        c = combination[++i];
                    }
                    if (buffer.length != 0) {
                        if (isNaN(parseInt(buffer)) || parseInt(buffer) <= 0) {
                            throw new HkmlBuildError("Wrong delay value '" + buffer + "'", i - buffer.length - 1);
                        }
                    } else {
                        buffer = "0";
                    }
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
                    do {
                        buffer += c;
                        c = combination[++i];
                    } while (c != HkmlCompiler.SEQ && c != HkmlCompiler.COMB && c != HkmlCompiler.SPACE && c != HkmlCompiler.TAB && i != combination.length);
                    chunks.push(HkmlCompiler.createToken(HkmlCompiler.TOKEN_KEY, buffer, i));
                    i--;
                    break;
                }
            }
            return chunks;
        },
        buildKeysNodes: function(tokens) {
            var keysNodes = [], token, currentType, currentValue, currentIndex, buffer = [], delay = 0, lastOperation = null;
            for (var i = 0; i < tokens.length; i++) {
                token = tokens[i];
                currentType = token.name;
                currentValue = token.value;
                currentIndex = token.index;
                if (i == 0 && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) {
                    throw new HkmlBuildError("Line must be started by key", currentIndex);
                }
                if (i == tokens.length - 1 && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) {
                    throw new HkmlBuildError("Line must be ended by key", currentIndex);
                }
                switch (currentType) {
                  case HkmlCompiler.TOKEN_KEY:
                    buffer.push(currentValue);
                    break;

                  default:
                    var parsedDelay = parseFloat(currentValue);
                    var correctDelayed = 0 != parsedDelay && !isNaN(parsedDelay);
                    if (lastOperation == null) {
                        if (correctDelayed) {
                            keysNodes.push(HkmlCompiler.createKeysNode(buffer, currentType, delay, token.index));
                            buffer = [];
                            delay = parsedDelay;
                        } else {
                            lastOperation = currentType;
                        }
                    } else {
                        if (lastOperation != currentType || correctDelayed) {
                            if (currentType == HkmlCompiler.TOKEN_OR && buffer.length > 1) {
                                var lastToken = buffer.pop();
                                keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index));
                                buffer = [ lastToken ];
                            } else {
                                keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index));
                                buffer = [];
                            }
                            delay = parsedDelay;
                            lastOperation = correctDelayed ? null : currentType;
                        } else {
                            lastOperation = currentType;
                        }
                    }
                    break;
                }
            }
            if (buffer.length != 0) {
                keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index));
            }
            return keysNodes;
        },
        createKeysNode: function(buffer, type, delay, index) {
            var keys = new Array(buffer.length), keyStringAlias;
            for (var i = 0; i < buffer.length; i++) {
                keyStringAlias = buffer[i];
                if (Keyboard[keyStringAlias] == undefined) {
                    throw new HkmlBuildError("Unknown key alias '" + keyStringAlias + "'", index);
                }
                keys[i] = Keyboard[keyStringAlias];
            }
            return new KeysNode(keys, delay, type == HkmlCompiler.TOKEN_OR);
        }
    };
    var HkmlKeyboardController = function(eventsTarget) {
        this._eventsTarget = eventsTarget || root;
        this._virtualMachines = {};
        this.startKeyboardEventListening();
    };
    HkmlKeyboardController.prototype.startKeyboardEventListening = function() {
        var self = this;
        this._eventsTargetCallback = function(e) {
            self.onKeyDown(e);
        };
        this._eventsTarget.addEventListener("keydown", this._eventsTargetCallback);
    };
    HkmlKeyboardController.prototype.onKeyDown = function(e) {
        for (var markup in this._virtualMachines) {
            var wrapper = this._virtualMachines[markup];
            var vm = wrapper.vm;
            var callback = wrapper.callback;
            if (vm.checkPressedKey(e.keyCode)) {
                if (vm.finished) {
                    vm.reset();
                    callback && callback(vm.markup, true);
                }
            } else {
                vm.reset();
                callback && callback(vm.markup, false);
            }
        }
    };
    HkmlKeyboardController.prototype.on = function(markup, callback) {
        if (this._virtualMachines[markup]) {
            throw new Error("Handler for '" + markup + "' already exist");
        }
        this._virtualMachines[markup] = {
            vm: HkmlCompiler.compile(markup),
            callback: callback
        };
    };
    HkmlKeyboardController.prototype.remove = function(markup) {
        if (!this._virtualMachines[markup]) {
            throw new Error("Handler for '" + markup + "' does not exist");
        }
        var wrapper = this._virtualMachines[markup];
        wrapper.vm.destroy();
        wrapper.callback = undefined;
        delete this._virtualMachines[markup];
        return this;
    };
    HkmlKeyboardController.prototype.trigger = function(markup) {
        if (this._virtualMachines[markup]) {
            var callback = this._virtualMachines[markup].callback;
            callback && callback(markup, true);
        }
        return this;
    };
    HkmlKeyboardController.prototype.destroy = function() {
        this._eventsTarget.addEventListener("keydown", this._eventsTargetCallback);
    };
    var HkmlVM = function(markup, keysNodes) {
        this._markup = markup;
        if (keysNodes.length == 0) {
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
    HkmlVM.prototype.reset = function() {
        this._currentKeysNodeIndex = 0;
        for (var i = 0; i < this._keysNodes.length; i++) {
            var keysNode = this._keysNodes[i];
            keysNode.reset();
        }
    };
    HkmlVM.prototype.testCurrentKeysNode = function(keyCode) {
        return this.currentKeysNode.checkPressedKey(keyCode, this._lastCompleteTime);
    };
    HkmlVM.prototype.updateLastCompleteTime = function() {
        this._lastCompleteTime = getTimer();
    };
    HkmlVM.prototype.__defineGetter__("finished", function() {
        return this._keysNodes[this._keysNodes.length - 1].finished;
    });
    HkmlVM.prototype.__defineGetter__("currentKeysNode", function() {
        return this._keysNodes[this._currentKeysNodeIndex];
    });
    HkmlVM.prototype.__defineGetter__("moreThanOneNode", function() {
        return this._keysNodes.length > 1;
    });
    HkmlVM.prototype.__defineGetter__("markup", function() {
        return this._markup;
    });
    HkmlVM.prototype.toString = function() {
        return "HkmlVM{" + String(this._keysNodes) + "}";
    };
    HkmlVM.prototype.destroy = function() {
        for (var i = 0; i < this._keysNodes.length; i++) {
            this._keysNodes[i].destroy();
        }
        this._keysNodes = undefined;
    };
    var Keyboard = {
        A: 65,
        D: 68,
        CTRL: 17,
        Z: 90
    };
    var KeysNode = function(keys, delay, orMode) {
        delay = delay || 0;
        orMode = orMode || false;
        if (this.existRepeatingKeyCodes(keys)) {
            throw new Error("Keys must be unique in one instance of KeysNode");
        }
        this._keys = keys;
        this._delay = delay;
        this._orMode = orMode;
        this._indexOfKeyToTest = 0;
        if (orMode) {
            this._keysStatus = new Array(keys.length);
            this.resetKeyStatuses();
        }
    };
    KeysNode.prototype.__defineGetter__("finished", function() {
        if (this._orMode) {
            for (var i = 0; i < this._keysStatus.length; i++) {
                var keyStatus = this._keysStatus[i];
                if (!keyStatus) return false;
            }
            return true;
        }
        return this._keys.length == this._indexOfKeyToTest;
    });
    KeysNode.prototype.existRepeatingKeyCodes = function(keys) {
        for (var i = 0; i < keys.length - 1; i++) {
            if (keys.indexOf(keys[i], i + 1) != -1) return true;
        }
        return false;
    };
    KeysNode.prototype.checkPressedKey = function(keyCode, timeOfCompletePrevKeyNode) {
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
    KeysNode.prototype.reset = function() {
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
    KeysNode.prototype.toString = function() {
        return "(" + (this._delay > 0 ? this._delay + ":" : "") + this._keys.join(this._orMode ? "+" : ">>") + ")";
    };
    KeysNode.prototype.destroy = function() {
        this._keys = this._keysStatus = undefined;
    };
    function getTimer() {
        return new Date().getTime();
    }
})(this);