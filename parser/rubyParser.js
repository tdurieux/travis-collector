const test = new RegExp("^([\\.sF\\*]{4,})$");

class RubyParser {
    constructor() {
        this.languages = ["ruby"];

        this.tests = [];
        this.errors = [];
    }

    parse(line) {
        let result = test.exec(line);
        if (result) {
            this.tests.push({
                name: "",
                body: "",
                nbTest: result[1].length,
                nbFailure: (result[1].match(/F/g)||[]).length,
                nbError: 0,
                nbSkipped: (result[1].match(/\\s/g)||[]).length,
                time: 0
            });
        }
    }
}

module.exports.Parser = RubyParser;