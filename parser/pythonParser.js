const test = new RegExp("^(.*)::([^ ]*) ([^ ]*) +\\[(.*)\\%\\]");
const test2 = new RegExp("^([^ ]+) +(.*): ([0-9]+) tests \\((.*) secs\\)");
const test3 = new RegExp("^([^ ]*) ([\\.sF]+)( .*\\[.*)?$");
const test4 = new RegExp("1: \\{1\\} ([^ ]*) \\[(.*)s\\] ... (.*)$");

class PyParser {
    constructor() {
        this.tests = [];
        this.errors = [];
    }

    parse(line) {
        let result = test.exec(line);
        if (result) {
            this.tests.push({
                name: result[1] + "::" + result[2],
                body: "",
                nbTest: 1,
                nbFailure: result[3].indexOf("FAIL") != -1 ?1:0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            });
        } else {
            result = test2.exec(line);
            if (result) {
                this.tests.push({
                    name: result[2],
                    body: "",
                    nbTest: parseInt(result[3]),
                    nbFailure: 0,
                    nbError: result[1] !== "SUCCESS"?1:0,
                    nbSkipped: 0,
                    time: parseFloat(result[4])
                });
            } else {
                result = test3.exec(line);
                if (result) {
                    this.tests.push({
                        name: result[1],
                        body: "",
                        nbTest: result[2].length,
                        nbFailure: (result[2].match(/F/g)||[]).length,
                        nbError: 0,
                        nbSkipped: (result[2].match(/\\s/g)||[]).length,
                        time: 0
                    });
                } else {
                    result = test4.exec(line);
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
                    }
                }
            }
        }
    }
}

module.exports.Parser = PyParser;