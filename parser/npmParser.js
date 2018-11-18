const testNoAssert = new RegExp("✖ (.*) Test finished without running any assertions");
const testPassed = new RegExp("✔ (.*) \\(([0-9\\.]*)s\\)");
const test2 = new RegExp("(ok|ko) ([0-9]+) (.*)$");
const test3 = new RegExp("Executed ([0-9]+) of ([0-9]+) (.*) \\(([0-9\\.]*) secs / ([0-9\\.]*) secs\\)");

class JsParser {
    constructor() {
        this.tests = [];
        this.errors = [];
    }

    parse(line) {
        let result = testNoAssert.exec(line);
        if (result) {
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 1,
                nbSkipped: 0,
                time: 0
            });

        } else {
            result = testPassed.exec(line);
            if (result) {
                this.tests.push({
                    name: result[1],
                    body: "",
                    nbTest: 1,
                    nbFailure: 0,
                    nbError: 0,
                    nbSkipped: 0,
                    time: parseFloat(result[2])
                });
            } else {
                result = test2.exec(line);
                if (result) {
                    this.tests.push({
                        name: result[3],
                        body: "",
                        nbTest: 1,
                        nbFailure: result[1] != "ok" ? 1:0,
                        nbError: 0,
                        nbSkipped: 0,
                        time: 0
                    });
                } else {
                    result = test3.exec(line);
                    if (result) {
                        this.tests.push({
                            name: '',
                            body: "",
                            nbTest: 1,
                            nbFailure: result[3] != "SUCCESS" ? 1:0,
                            nbError: 0,
                            nbSkipped: 0,
                            time: parseFloat(result[5])
                        });
                    }
                }
            }
        }
    }
}

module.exports.Parser = JsParser;