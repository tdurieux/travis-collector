const logParser = require("./parser/parser-init").parser;

const toTest = [
    {
        id: 459375039,
        result: {
            count: 124,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0.087,
            compilation: 0,
            tool: "mocha"
        }
    },
    {
        id: 457343754,
        result: {
            count: 8,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0.10200000000000001,
            compilation: 0,
            tool: "gotest"
        }
    },
    {
        id: 459392356,
        result: {
            count: 162,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: "pytest"
        }
    },
    {
        id: 459394695,
        result: {
            count: 0,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: "gradle"
        }
    },
    {
        id: 459394765,
        result: {
            count: 1,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: 'mocha'
        }
    },
    {
        id: 459432227,
        result: {
            count: 0,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: null
        }
    },
    {
        id: 459433585,
        result: {
            count: 0,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: null
        }
    },
    {
        id: 459427416,
        result: {
            count: 0,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: null
        }
    },
    {
        id: 459461325,
        result: {
            count: 0,
            nbFailure: 0,
            nbError: 0,
            nbSkipped: 0,
            time: 0,
            compilation: 0,
            tool: null
        }
    }


];

(async () => {
    for (let job of toTest) {
        const result = await logParser(job);

        let count = 0;
        let nbFailure = 0;
        let nbError=  0;
        let nbSkipped = 0;
        let time = 0.0;
        for (let test of result.tests) {
            count += test.nbTest;
            nbFailure += test.nbFailure;
            nbError += test.nbError;
            nbSkipped += test.nbSkipped;
            time += test.time;
        }
        if (count != job.result.count ||
            nbFailure != job.result.nbFailure ||
            nbError != job.result.nbError ||
            nbSkipped != job.result.nbSkipped ||
            time != job.result.time ||
            result.errors.length != job.result.compilation ||
            result.tool != job.result.tool) {
            delete result.log;

            throw (job.id + " Expected " + JSON.stringify(job.result) + " got " +  JSON.stringify([count, nbFailure, nbError, nbSkipped, time, result.errors.length, result.tool]));
        }
    }

})();