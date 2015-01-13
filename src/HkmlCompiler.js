var HkmlCompiler = {
    TOKEN_KEY: "str",
    TOKEN_OR: "or",
    TOKEN_SEQ: "seq",

    SEQ: ">",
    COMB: "+",
    SPACE: " ",
    TAB: "\t",

    createToken: function (name, value, index) {
        return {name: name, value: value, index: index};
    },

    compile: function (markup) {
        var tokens = HkmlCompiler.tokenize(markup);
        var keyNodes = HkmlCompiler.buildKeysNodes(tokens);
        return new HkmlVM(markup, keyNodes);
    },

    tokenize: function (combination) {
        var i, c, buffer = '', chunks = [];

        for (i = 0; i < combination.length; i++) {
            c = combination[i];

            switch (c) {
                case HkmlCompiler.SEQ :
                    c = combination[++i];
                    buffer = "";
                    while (c != HkmlCompiler.SEQ) {
                        if (i == combination.length) {
                            throw new HkmlBuildError("Unexpected end of line. Expected '>'", (i - 1));
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
                    } while (
                    (
                    c != HkmlCompiler.SEQ &&
                    c != HkmlCompiler.COMB &&
                    c != HkmlCompiler.SPACE &&
                    c != HkmlCompiler.TAB
                    ) &&
                    i != combination.length
                        );
                    chunks.push(HkmlCompiler.createToken(HkmlCompiler.TOKEN_KEY, buffer, i));
                    i--;
                    break;
            }
        }

    },

    buildKeysNodes: function (tokens) {

        var keysNodes = [],
            token,
            currentType,
            currentValue,
            currentIndex,
            buffer = [],
            delay = 0,
            lastOperation = null;

        for (var i = 0; i < tokens.length; i++) {

            token = tokens[i];
            currentType = token.name;
            currentValue = token.value;
            currentIndex = token.index;

            //combination can't begins with operation
            if (i == 0 && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) {
                throw new HkmlBuildError("Line must be started by key", currentIndex);
            }

            //combination can't ends with operation
            if (i == tokens.length - 1 && (currentType == HkmlCompiler.TOKEN_OR || currentType == HkmlCompiler.TOKEN_SEQ)) {
                throw new HkmlBuildError("Line must be ended by key", currentIndex);
            }

            switch (currentType) {

                case HkmlCompiler.TOKEN_KEY:
                    buffer.push(currentValue);
                    break;

                default :
                    var parsedDelay = parseFloat(currentValue);
                    var correctDelayed = (0 != parsedDelay && !isNaN(parsedDelay));
                    if (lastOperation == null) {
                        //first turn
                        if (correctDelayed) {
                            keysNodes.push(HkmlCompiler.createKeysNode(buffer, currentType, delay, token.index));
                            buffer = [];
                            delay = parsedDelay;
                        } else {
                            lastOperation = currentType;
                        }
                    } else {
                        //other turn
                        if (lastOperation != currentType || correctDelayed) {
                            if (currentType == HkmlCompiler.TOKEN_OR && buffer.length > 1) {
                                var lastToken = buffer.pop();
                                keysNodes.push(HkmlCompiler.createKeysNode(buffer, lastOperation, delay, token.index));
                                buffer = [lastToken];
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

    createKeysNode: function (buffer, type, delay, index) {
        var keys = new Array(buffer.length),
            keyStringAlias;

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

