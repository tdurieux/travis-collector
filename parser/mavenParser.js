const startTestRun = new RegExp("Running (.*Tests?.*)$");
const endTestRun = new RegExp("Tests run: ([0-9]+), Failures: ([0-9]+), Errors: ([0-9]+), Skipped: ([0-9]+), Time elapsed: ([0-9\.]+) s");
const gradleRegex = new RegExp("\\[([^\\]]+)\\]: ([A-Z]+) in (.*)");
const gradleRegex2 = new RegExp(" ([a-zA-Z0-9\\-_]+)\\(\\) (↷|■|✔)( .*)?")
const javacErrorRegex = new RegExp("\\[javac\\] ([^:]+):([0-9]+): error: (.*)");

class JavaParser {
    constructor() {
        this.currentTest = null;
        this.tests = [];
        this.errors = [];
    }

    parse(line) {
        const start = startTestRun.exec(line);
        if (start) {
            this.currentTest = {
                name: start[1],
                body: "",
                nbTest: 0,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            };
        } else {
            const end = endTestRun.exec(line);
            if (end) {
                if (this.currentTest == null) {
                    return;
                }
                this.currentTest.nbTest = parseInt(end[1]);
                this.currentTest.nbFailure = parseInt(end[2]);
                this.currentTest.nbError = parseInt(end[3]);
                this.currentTest.nbSkipped = parseInt(end[4]);
                this.currentTest.time = parseFloat(end[5]);

                this.tests.push(this.currentTest);

                this.currentTest = null;
            } else {
                if (this.currentTest != null) {
                    // output test
                    this.currentTest.body += line + "\n";
                } else {
                    const javacError = javacErrorRegex.exec(line);
                    if (javacError) {
                        this.errors.push({
                            file: javacError[1],
                            line: parseInt(javacError[2]),
                            message: javacError[3]
                        })
                    } else {
                        let gradle = gradleRegex.exec(line);
                        if (gradle) {
                            this.tests.push({
                                name: gradle[1]+":" + gradle[3],
                                body: "",
                                nbTest: 1,
                                nbFailure: gradle[2] != "SUCCESS"?1:0,
                                nbError: 0,
                                nbSkipped: 0,
                                time: 0
                            })
                        } else {
                            gradle = gradleRegex2.exec(line);
                            if (gradle) {
                                this.tests.push({
                                    name: gradle[1],
                                    body: gradle[2] != "✔"? gradle[3]: '',
                                    nbTest: 1,
                                    nbFailure: gradle[2] == "■" ? 1 : 0,
                                    nbError: 0,
                                    nbSkipped: gradle[2] == "↷" ? 1 : 0,
                                    time: 0
                                })
                            }
                        }
                    }
                }
            }
        }
    }
}

module.exports.Parser = JavaParser;