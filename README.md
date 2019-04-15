# Travis Scanner

## Install

```js
cd script
npm install
npm build
```

## Usage

### Download jobs

Download all the Travis-CI jobs into `DEST` folder (see `script/collect.js`).

```js
npm run-script collect
```

### TravisCI real-time

User interface that monitors the jobs that are currently running at Travis-CI

```js
npm run-script server
open http://localhost:9080
```

## Parse Travis-CI log

```js
const log_parser = require("./parser/parser-init").parser;
job = {id: '480040000'}
log_parser(job, (tests, errors) => {
    job.tests = tests;
    job.errors = errors;
    let count = 0;
    let nbFailure = 0;
    let nbError = 0;
    let nbSkipped = 0;
    let time = 0.0;
    for (let test of tests) {
        count += test.nbTest;
        nbFailure += test.nbFailure;
        nbError += test.nbError;
        nbSkipped += test.nbSkipped;
        time += test.time;
    }
    console.log(count, nbFailure, nbError, nbSkipped, time, errors.length)
});
```
