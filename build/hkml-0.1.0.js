!function() {
    var a = function() {}, b = {
        TOKEN_KEY: "str",
        TOKEN_OR: "or",
        TOKEN_SEQ: "seq",
        SEQ: ">",
        COMB: "+",
        SPACE: " ",
        TAB: "	",
        createToken: function(a, b, c) {
            return {
                name: a,
                value: b,
                index: c
            };
        },
        compile: function(a) {
            var c = b.tokenize(a), d = b.buildKeysNodes(c);
            return new HkmlVM(a, d);
        },
        tokenize: function(c) {
            var d, e, f = "", g = [];
            for (d = 0; d < c.length; d++) switch (e = c[d]) {
              case b.SEQ:
                for (e = c[++d], f = ""; e != b.SEQ; ) {
                    if (d == c.length) throw new a("Unexpected end of line. Expected '>'", d - 1);
                    f += e, e = c[++d];
                }
                if (0 != f.length) {
                    if (isNaN(parseInt(f)) || parseInt(f) <= 0) throw new a("Wrong delay value '" + f + "'", d - f.length - 1);
                } else f = "0";
                g.push(b.createToken(b.TOKEN_SEQ, f, d - f.length - 1));
                break;

              case b.COMB:
                g.push(b.createToken(b.TOKEN_OR, e, d));
                break;

              case b.TAB:
              case b.SPACE:
                break;

              default:
                f = "";
                do f += e, e = c[++d]; while (e != b.SEQ && e != b.COMB && e != b.SPACE && e != b.TAB && d != c.length);
                g.push(b.createToken(b.TOKEN_KEY, f, d)), d--;
            }
        }
    };
    b.compile("A");
}();