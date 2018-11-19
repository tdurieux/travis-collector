const Travis = require('travis-ci');
const stripAnsi = require('strip-ansi');
const JavaParser = require('./mavenParser').Parser;
const JsParser = require('./npmParser').Parser;
const PyParser = require('./pythonParser').Parser;
const ObjcParser = require('./objcParser').Parser;
const PhpParser = require('./phpParser').Parser;
const RubyParser = require('./rubyParser').Parser

const travis = new Travis({
    version: '2.0.0'
});

const fold_start = new RegExp(".*travis_fold:start:(.*)");
const fold_end = new RegExp(".*travis_fold:end:(.*)");


function log_parser(job, callback) {
    travis.jobs(job.id).log.get((err, data) => {
        if (err != null) {
            console.log(err);

            return callback([], [], null)
        }
        const folds = [];
        let log = data;
        if (log.log != null) {
            log = log.log.body
        }
        if (log == null) {
            return callback([], [], null)
        }
        let current_fold = '';
        let current_fold_id = null;
        const lines = log.split(/\r?\n/);

        const parsers = [new JavaParser(), new JsParser(), new PyParser(), new ObjcParser(), new PhpParser(), new RubyParser()];

        for(let line of lines) {
            line = stripAnsi(line);
            /*const start = fold_start.exec(line);
            const end = fold_end.exec(line);
            if (end) {
                current_fold_id = null;
                if (current_fold != '') {
                    folds.push(current_fold);
                    current_fold = '';
                }
            }
            if (start) {
                if (current_fold != '') {
                    folds.push(current_fold);
                    current_fold = '';
                }
                current_fold_id = start[1];
                current_fold += line.substring(line.indexOf(current_fold_id)) + "\n";
            } else {
                current_fold += line + "\n";
            }*/
            for (let parser of parsers) {
                try {
                    parser.parse(line);
                } catch (e) {
                    console.error(e, job.id);
                }
            }
        }
        /*
        if (current_fold != '') {
            folds.push(current_fold);
        }*/
        let tests = [];
        for (let parser of parsers) {
            tests = tests.concat(parser.tests);
        }
        let errors = [];
        for (let parser of parsers) {
            errors = errors.concat(parser.errors);
        }
        if (callback) {
            callback(tests, errors, log);
        }
    })
}

module.exports.parser = log_parser;