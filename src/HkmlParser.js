var HkmlParser = {
    TOKEN_KEY : "str",
    TOKEN_OR : "or",
    TOKEN_SEQ : "seq",

    SEQ : ">",
    COMB : "+",
    SPACE : " ",
    TAB : "\t",

    createToken : function(name, value, index) {
        return {name : name, value:value, index : index};
    },

    compile : function(markup) {
        var tokens = HkmlParser.tokenize(markup);
        var keyNodes = HkmlParser.buildKeysNodes(tokens);
        return new HkmlVM(markup, keyNodes);
    },

    tokenize : function (combination) {
        var i, c, buffer = '', chunks = [];

        for(i = 0; i < combination.length; i++ ){
            c = combination[i];

            switch (c) {
                case HkmlParser.SEQ :
                    c = combination[++i];
                    buffer = "";
                    while (c != HkmlParser.SEQ) {
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
                    chunks.push(HkmlParser.createToken(HkmlParser.TOKEN_SEQ, buffer, i - buffer.length - 1));
                    break;

                case HkmlParser.COMB:
                    chunks.push(HkmlParser.createToken(HkmlParser.TOKEN_OR, c, i));
                    break;

                case HkmlParser.TAB:
                case HkmlParser.SPACE:
                    break;

                default:
                    buffer = "";
                    do {
                        buffer += c;
                        c = combination[++i];
                    } while (
                        (
                            c != HkmlParser.SEQ &&
                            c != HkmlParser.COMB &&
                            c != HkmlParser.SPACE &&
                            c != HkmlParser.TAB
                        ) &&
                        i != combination.length
                    );
                    chunks.push(HkmlParser.createToken(HkmlParser.TOKEN_KEY, buffer, i));
                    i--;
                    break;
            }
        }

    }

};

