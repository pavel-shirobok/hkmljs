(function(root) {
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
        return this;
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
        "0": 48,
        "1": 49,
        "2": 50,
        "3": 51,
        "4": 52,
        "5": 53,
        "6": 54,
        "7": 55,
        "8": 56,
        "9": 57,
        CANCEL: 3,
        HELP: 6,
        BACK_SPACE: 8,
        TAB: 9,
        CLEAR: 12,
        ENTER: 13,
        ENTER_SPECIAL: 14,
        SHIFT: 16,
        CONTROL: 17,
        ALT: 18,
        PAUSE: 19,
        CAPS_LOCK: 20,
        KANA: 21,
        EISU: 22,
        JUNJA: 23,
        FINAL: 24,
        HANJA: 25,
        ESCAPE: 27,
        CONVERT: 28,
        NONCONVERT: 29,
        ACCEPT: 30,
        MODECHANGE: 31,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        SELECT: 41,
        PRINT: 42,
        EXECUTE: 43,
        PRINTSCREEN: 44,
        INSERT: 45,
        DELETE: 46,
        COLON: 58,
        SEMICOLON: 186,
        LESS_THAN: 60,
        EQUALS: 187,
        GREATER_THAN: 62,
        QUESTION_MARK: 63,
        AT: 64,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        WIN: 91,
        CONTEXT_MENU: 93,
        SLEEP: 95,
        NUMPAD0: 96,
        NUMPAD1: 97,
        NUMPAD2: 98,
        NUMPAD3: 99,
        NUMPAD4: 100,
        NUMPAD5: 101,
        NUMPAD6: 102,
        NUMPAD7: 103,
        NUMPAD8: 104,
        NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SEPARATOR: 108,
        SUBTRACT: 109,
        DECIMAL: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        F13: 124,
        F14: 125,
        F15: 126,
        F16: 127,
        F17: 128,
        F18: 129,
        F19: 130,
        F20: 131,
        F21: 132,
        F22: 133,
        F23: 134,
        F24: 135,
        NUM_LOCK: 144,
        SCROLL_LOCK: 145,
        WIN_OEM_FJ_JISHO: 146,
        WIN_OEM_FJ_MASSHOU: 147,
        WIN_OEM_FJ_TOUROKU: 148,
        WIN_OEM_FJ_LOYA: 149,
        WIN_OEM_FJ_ROYA: 150,
        CIRCUMFLEX: 160,
        EXCLAMATION: 161,
        DOUBLE_QUOTE: 162,
        HASH: 163,
        DOLLAR: 164,
        PERCENT: 165,
        AMPERSAND: 166,
        UNDERSCORE: 167,
        OPEN_PAREN: 168,
        CLOSE_PAREN: 169,
        ASTERISK: 170,
        PLUS: 171,
        PIPE: 172,
        HYPHEN_MINUS: 173,
        OPEN_CURLY_BRACKET: 174,
        CLOSE_CURLY_BRACKET: 175,
        TILDE: 176,
        VOLUME_MUTE: 181,
        VOLUME_DOWN: 182,
        VOLUME_UP: 183,
        COMMA: 188,
        MINUS: 189,
        PERIOD: 190,
        SLASH: 191,
        BACK_QUOTE: 192,
        OPEN_BRACKET: 219,
        BACK_SLASH: 220,
        CLOSE_BRACKET: 221,
        QUOTE: 222,
        META: 224,
        ALTGR: 225,
        WIN_ICO_HELP: 227,
        WIN_ICO_00: 228,
        WIN_ICO_CLEAR: 230,
        WIN_OEM_RESET: 233,
        WIN_OEM_JUMP: 234,
        WIN_OEM_PA1: 235,
        WIN_OEM_PA2: 236,
        WIN_OEM_PA3: 237,
        WIN_OEM_WSCTRL: 238,
        WIN_OEM_CUSEL: 239,
        WIN_OEM_ATTN: 240,
        WIN_OEM_FINISH: 241,
        WIN_OEM_COPY: 242,
        WIN_OEM_AUTO: 243,
        WIN_OEM_ENLW: 244,
        WIN_OEM_BACKTAB: 245,
        ATTN: 246,
        CRSEL: 247,
        EXSEL: 248,
        EREOF: 249,
        PLAY: 250,
        ZOOM: 251,
        PA1: 253,
        WIN_OEM_CLEAR: 254
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
    var HkmlExport = function(eventTarget) {
        return new HkmlKeyboardController(eventTarget);
    };
    HkmlExport.HkmlVM = HkmlVM;
    HkmlExport.HkmlKeyboardController = HkmlKeyboardController;
    HkmlExport.HkmlCompiler = HkmlCompiler;
    HkmlExport.KeysNode = KeysNode;
    HkmlExport.Keyboard = Keyboard;
    root.hkml = HkmlExport;
})(this);