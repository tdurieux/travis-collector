const Travis = require('travis-ci');
const async = require('async');
const EventEmitter = require('events');
const fs = require("fs");
const log_parser = require("./parser/parser-init").parser;

//process.stdin.resume();

class JobEmitter extends EventEmitter {}
const jobEmitter = new JobEmitter();

const travis = new Travis({
    version: '2.0.0'
});

let unfinishedJobs = {};
let stat = {
    jobPerHour: {},
    languages: {},
    states: {}
};

if (fs.existsSync("stat.json")) {
    stat = JSON.parse(fs.readFileSync(__dirname + "/stat.json", 'utf8'));
}

if (fs.existsSync("unfinished.json")) {
    try {
        unfinishedJobs = JSON.parse(fs.readFileSync(__dirname + "/unfinished.json", 'utf8'));
    } catch (e) {
        unfinishedJobs = {}
    }
}

/**
 * @param job_ids []
 * @returns {Promise<*[]>}
 */
async function getJobsFromIds(job_ids) {
    return getJobs('?ids[]=' + job_ids.join('&ids[]='));
}

/**
 * @param query
 * @returns {Promise<[]>}
 */
async function getJobs(query) {
    return new Promise((resolve, reject) => {
        travis.jobs(query + "&random=" + Math.random()).get((err, data) => {
            if (err) {
                return reject(err);
            }
            const jobs = data.jobs;
            const commits = data.commits;

            for(let i in jobs) {
                jobs[i].commit = commits[i];
            }
            return resolve(jobs);
        });
    });
};

function generateIds(minId, number, reverse) {
    if (reverse == null) {
        reverse = false;
    }
    const output = [];
    while(number >= 0) {
        if (reverse) {
            output.push(--minId);
        } else {
            output.push(++minId);
        }
        number--;
    }
    return output;
}
const timeout = ms => new Promise(res => setTimeout(res, ms))

function scanPreviousBuild(nbJob) {
    (async _=>{
        let jobs = await getJobs("?state=created");
        jobs.forEach(j => jobEmitter.emit('job', j));
        let job_ids = jobs.map(j => j.id);
        let minId = Math.max(...job_ids);
        async.forever(async () => {

            try {
                job_ids = jobs.map(j => j.id);
                job_ids.push(minId);
                minId = Math.min(...job_ids);
                let jobIds = generateIds(minId, nbJob, true);
                jobs = await getJobsFromIds(jobIds);
                jobs.forEach(j => jobEmitter.emit('job', j));
            } catch (e) {
                console.error("Error new job", e);
            }
        }, error => {
            console.error("Error forever job", error);
        });
    })();
}

function scanTravis() {
    (async _=>{
        let jobs = await getJobs("?state=created");
        jobs.forEach(j => jobEmitter.emit('job', j));
        let job_ids = jobs.map(j => j.id);
        let maxId = Math.max(...job_ids);
        async.forever(async () => {

            try {
                job_ids = jobs.map(j => j.id);
                job_ids.push(maxId);
                maxId = Math.max(...job_ids);
                let jobIds = generateIds(maxId, 150);
                jobs = await getJobsFromIds(jobIds);
                jobs.forEach(j => jobEmitter.emit('job', j));
                // do a request every 1.5 sec
                await timeout(1500);
            } catch (e) {
                console.error("Error new job", e);
            }
        }, error => {
            console.error("Error forever job", error);
        });
    })();
}

function isFinished(job) {
    return job.state == "errored" || job.state == "canceled" || job.state == "failed" || job.state == "passed";
}
function scanUnfinishedJobs() {
    async.forever(async _ => {
        await getUnfinishedJobs(jobs => {
            jobs.forEach(job => {
                if(!isFinished(job)) {
                    if (unfinishedJobs[job.id].state != job.state) {
                        unfinishedJobs[job.id] = job;
                        jobEmitter.emit("job_updated", job);
                    } else {
                        unfinishedJobs[job.id] = job;
                    }
                    return;
                } else if (unfinishedJobs[job.id] != null) {
                    // update state
                    delete unfinishedJobs[job.id];
                    jobEmitter.emit("job_finished", job);
                }
            });
        });
    });
}

/**
 *
 * @returns {Promise<[]>}
 */
async function getUnfinishedJobs(progress) {
    return new Promise(resolve => {
        const sortable = [];
        for (let job_id in unfinishedJobs) {
            sortable.push(job_id);
        }

        sortable.sort(function (a, b) {
            return new Date(unfinishedJobs[a].started_at) - new Date(unfinishedJobs[b].started_at);
        });

        if (sortable.length === 0) {
            return setTimeout(_=>{resolve([])}, 2000);
        }

        const requestPerPage = 250;

        let job_results = [];
        async.timesLimit(sortable.length/requestPerPage + 1, 2,async i => {
            const updatedJobs = await getJobsFromIds(sortable.slice(i * requestPerPage, i*requestPerPage + requestPerPage));
            if (progress) {
                progress(updatedJobs);
            }
            job_results = job_results.concat(updatedJobs);
        }, (err, values) => {
            resolve(job_results);
        });
    });
}

jobEmitter.on('job_finished', job => {
    const key = job.state;
    if (stat.states[key] == null) {
        stat.states[key] = {
            total: 1
        };
        stat.states[key][job.config.language] = 1;
    } else if (stat.states[key][job.config.language] == null) {
        stat.states[key].total++;
        stat.states[key][job.config.language] = 1;
    } else {
        stat.states[key][job.config.language] ++;
        stat.states[key].total++;
    }
    //console.log(job.id, job.state,  timeSince(new Date(job.finished_at)), "ago");
    /*setImmediate(() => {
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
            console.log(job.repository_slug, job.id, job.state, timeSince(new Date(job.finished_at)), job.config.language, count, nbFailure, nbError, nbSkipped, time, errors.length)
            callback();
        });
    });*/
});
function twoDigitsNumber(n) {
    n = n+''
    if (n.length < 2) {
        n = '0' + n
    }
    return n
}
jobEmitter.on('job', (job) => {
    if(!isFinished(job)) {
        if (unfinishedJobs[job.id] != null) {
            return;
        }
        unfinishedJobs[job.id] = job;
    }
    const today = new Date();
    const key = today.getUTCFullYear() + "" + twoDigitsNumber(today.getUTCMonth()) + twoDigitsNumber(today.getUTCDate()) + "" + twoDigitsNumber(today.getUTCHours());

    if (stat.jobPerHour[key] == null) {
        stat.jobPerHour[key] = {
            total: 1
        };
        stat.jobPerHour[key][job.config.language] = 1;
    } else if (stat.jobPerHour[key][job.config.language] == null) {
        stat.jobPerHour[key].total++;
        stat.jobPerHour[key][job.config.language] = 1;
    } else {
        stat.jobPerHour[key][job.config.language] ++;
        stat.jobPerHour[key].total++;
    }

    if (stat.languages[job.config.language] == null) {
        stat.languages[job.config.language] = 1;
    } else {
        stat.languages[job.config.language]++;
    }
});

function getStat() {
    const output = JSON.parse(JSON.stringify(stat));
    for(let job_id in unfinishedJobs) {
        const job = unfinishedJobs[job_id];

        const key = job.state;
        if (output.states[key] == null) {
            output.states[key] = {
                total: 1
            };
            output.states[key][job.config.language] = 1;
        } else if (output.states[key][job.config.language] == null) {
            output.states[key].total++;
            output.states[key][job.config.language] = 1;
        } else {
            output.states[key][job.config.language] ++;
            output.states[key].total++;
        }
    }
    return output;
}

module.exports.scanTravis = scanTravis;
module.exports.scanUnfinishedJobs = scanUnfinishedJobs;
module.exports.scanPreviousBuild = scanPreviousBuild;
module.exports.listener = jobEmitter;
module.exports.stat = getStat;
module.exports.travis = travis;
module.exports.generateIds = generateIds;
module.exports.getJobsFromIds = getJobsFromIds;




function exitHandler(options, exitCode) {
    if (options.exit) {
        fs.writeFile('stat.json', JSON.stringify(stat), (err, data) => {
            fs.writeFile('unfinished.json', JSON.stringify(unfinishedJobs), (err, data) => {
                // nothing
                process.exit();
            });
        });
    }
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));