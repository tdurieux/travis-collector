const timeRegex = new RegExp("Time: ([0-9\\.]+) ([^,]+), Memory: ([0-9\\.]+)(.+)");
const testResults = new RegExp("Tests: ([0-9]+), Assertions: ([0-9]+), Skipped: ([0-9]+), Incomplete: ([0-9]+).");

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
            const test = testResults.exec(line);
            if (test) {
                this.currentTest.nbTest = parseInt(test[1]);
                this.currentTest.nbFailure = parseInt(test[4]);
                this.currentTest.nbSkipped = parseInt(test[3]);
                this.tests.push(this.currentTest);
                this.currentTest = null;
            }
        }
    }
}

module.exports.Parser = PhpParser;