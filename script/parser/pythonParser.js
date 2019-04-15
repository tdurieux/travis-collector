const Parser = require("./Parser").Parser;

const test = new RegExp("^(.+)::(.+) ([^ ]+) +\\[(.+)\\%\\]");
const test2 = new RegExp("^([^ ]+) +(.*): ([0-9]+) tests \\((.*) secs\\)");
const test3 = new RegExp("^([^ ]+) ([\\.sF]+)( .*\\[.*)?$");
const test4 = new RegExp("1: \\{1\\} ([^ ]+) \\[(.*)s\\] ... (.*)$");
const test5 = new RegExp("^(PASS|FAIL): (.+)");

const summaryPyTest = new RegExp("==+ (([0-9]+) passed)(.+) in (.+) seconds ==+");
const testStartWithBody = new RegExp("^(.+)::(test_.+)");

class PyParser extends Parser {
    constructor() {
        super("PyParser");
        this.currentTest = null;
    }

    parse(line) {
        let result = test.exec(line);
        if (result) {
            this.tests.push({
                name: result[1] + "::" + result[2],
                body: "",
                nbTest: 1,
                nbFailure: result[3].indexOf("FAIL") != -1 ? 1 : 0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            });
        } else if ((result = summaryPyTest.exec(line))) {
            this.tool = "pytest";
            this.totalTime = parseFloat(result[4]);
        } else if ((result = test2.exec(line))) {
            this.tests.push({
                name: result[2],
                body: "",
                nbTest: parseInt(result[3]),
                nbFailure: 0,
                nbError: result[1] !== "SUCCESS" ? 1 : 0,
                nbSkipped: 0,
                time: parseFloat(result[4])
            });
        } else if (line.indexOf("Download") == -1 && (result = test3.exec(line))) {
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: result[2].length,
                nbFailure: (result[2].match(/F/g) || []).length,
                nbError: 0,
                nbSkipped: (result[2].match(/\\s/g) || []).length,
                time: 0
            });
        } else if ((result = test4.exec(line))) {
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[2])
            });
        } else if ((result = test5.exec(line))) {
            this.tests.push({
                name: result[2],
                body: "",
                nbTest: 1,
                nbFailure: result[1] == "FAIL" ? 1 : 0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            });
        } else if ((result = testStartWithBody.exec(line))) {
            this.currentTest = {
                name: result[1] + "::" + result[2],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            }
        } else {
            if (this.currentTest != null) {
                if (line == "PASSED" || line == "FAILED") {
                    if (line == "FAILED") {
                        this.currentTest.nbFailure = 1;
                    }
                    this.tests.push(this.currentTest);
                    this.currentTest = null;
                } else {
                    this.currentTest.body += line + "\n";
                }
            }
        }
    }
}

module.exports.Parser = PyParser;