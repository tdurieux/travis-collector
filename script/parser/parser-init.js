const Travis = require('travis-ci');
const stripAnsi = require('strip-ansi');
const Parser = require('./Parser').Parser;
const JavaParser = require('./mavenParser').Parser;
const JsParser = require('./npmParser').Parser;
const PyParser = require('./pythonParser').Parser;
const ObjcParser = require('./objcParser').Parser;
const PhpParser = require('./phpParser').Parser;
const GoParser = require('./goParser').Parser;
const RubyParser = require('./rubyParser').Parser;

const travis = new Travis({
    version: '2.0.0'
});

const fold_start = new RegExp("travis_fold:start:(.*)");
const fold_end = new RegExp("travis_fold:end:(.*)");

/**
 * @param job
 * @returns {Promise<String>}
 */
async function getLog(job) {
    return new Promise((resolve, reject) => {
        travis.jobs(job.id).log.get((err, data) => {
            if (err != null) {
                return reject("Log for " + job.id + " not found");
            }
            let log = data;
            if (log.log != null) {
                log = log.log.body
            }
            if (log == null) {
                return reject("Unfound log for " + job.id);
            }
            return resolve(log);
        });
    });
}

async function parseLog(job) {
    return new Promise(async (resolve, reject) => {
        try {
            const log = await getLog(job);
            /**
             * @type {Parser[]}
             */
            const parsers = [new JavaParser(), new JsParser(), new PyParser(), new ObjcParser(), new PhpParser(), new RubyParser(), new GoParser()];

            let exitCode = null;

            let lineStart = 0;
            for (let i = 0; i < log.length; i++) {
                if (i == log.length - 1 || (log[i] == '\r' && log[i + 1] == '\n') || log[i] == '\n') {
                    const line = stripAnsi(log.slice(lineStart, i));
                    if (log[i] == '\r') {
                        i++;
                    }
                    lineStart = i + 1;

                    if (line.length === 0) {
                        continue;
                    }


                    if ((!job.config || !job.config.language) && line.indexOf("Build language: ") == 0) {
                        if (!job.config) {
                            job.config = {};
                        }
                        job.config.language = line.replace("Build language: ", "");
                    }
                    if (line.indexOf("Done. Your build exited with ") != -1) {
                        exitCode = parseInt(line.substring("Done. Your build exited with ".length, line.length -1));
                    }

                    for (let parser of parsers) {
                        if (job.config && !parser.isCompatibleLanguage(job.config.language)) {
                            continue;
                        }
                        try {
                            parser.parse(line);
                        } catch (e) {
                            console.error(e, parser, job.id);
                        }
                    }
                }
            }
            let tool = null;
            let tests = [];
            let errors = [];

            for (let parser of parsers) {
                tests = tests.concat(parser.tests);
                errors = errors.concat(parser.errors);

                if (parser.tool != null && tool == null) {
                    tool = parser.tool
                }
            }

            resolve({
                tests: tests,
                errors: errors,
                log: log,
                tool: tool
            })
        } catch (e) {
            return reject(e);
        }
    });
}

module.exports.parser = parseLog;
module.exports.getLog = getLog;