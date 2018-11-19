const timeRegex = new RegExp("Time: ([0-9\\.]+) ([^,]+), Memory: ([0-9\\.]+)(.+)");
const testResults = new RegExp("Tests: ([0-9]+), Assertions: ([0-9]+)(, Skipped: ([0-9]+))?(, Incomplete: ([0-9]+))?(, Failures: ([0-9]+))?.");
const testResultsOk = new RegExp("OK \\(([0-9]+) tests, ([0-9]+) assertions\\)");

class PhpParser {
    constructor() {
        this.tests = [];
        this.errors = [];
        this.currentTest = null;
    }

    parse(line) {
        const time = timeRegex.exec(line);
        if (time) {
            this.currentTest = {
                name: "",
                body: "",
                nbTest: 0,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: time[1] * ((time[2] == "minutes")? 60: 1)
            };
        } else {
            let test = testResults.exec(line);
            if (test) {
                this.currentTest.nbTest = parseInt(test[1]);
                this.currentTest.nbAssertion = parseInt(test[2]);
                this.currentTest.nbIncomplete = parseInt(test[6]);
                this.currentTest.nbSkipped = parseInt(test[4]);
                this.currentTest.nbFailure = test[8]?parseInt(test[8]):0;
                this.tests.push(this.currentTest);
                this.currentTest = null;
            } else {
                let test = testResultsOk.exec(line);
                if (test) {
                    this.currentTest.nbTest = parseInt(test[1]);
                    this.currentTest.nbAssertion = parseInt(test[2]);
                    this.tests.push(this.currentTest);
                    this.currentTest = null;
                }
            }
        }
    }
}

module.exports.Parser = PhpParser;