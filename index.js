const Travis = require('travis-ci');
const async = require('async');
const jsonpack = require('jsonpack');
const EventEmitter = require('events');
const fs = require("fs");
const log_parser = require("./parser/parser").parser;

process.stdin.resume();

class JobEmitter extends EventEmitter {}
const jobEmitter = new JobEmitter();

const travis = new Travis({
    version: '2.0.0'
});

let jobs = {};
let unfinishedJobs = {};
let builds = {};
let languages = {};
let count = 0;
let countJob = 0;

if (fs.existsSync("builds1.txt")) {
    const states = {}
    const bu = fs.readFileSync("builds.txt", 'utf8');
    builds = jsonpack.unpack(bu);
    for (let build_id in builds) {
        const build = builds[build_id];
        count++;
        for(let job of build.jobs) {
            countJob ++;
            jobs[job.id] = job;
            if (languages[job.config.language] == null) {
                languages[job.config.language] = 0;
            }
            languages[job.config.language] ++;
            if (states[job.state] == null) {
                states[job.state] = 1
            } else {
                states[job.state] ++;
            }

            if(!(job.state === "errored" || job.state === "canceled" || job.state === "failed" || job.state === "passed")) {
                unfinishedJobs[job.id] = job;
            }
        }
    }
    console.log(states);
}

console.log(count + " builds " + countJob + " jobs");

async.forever(callback => {
    getTests(_ => {
        return setTimeout(callback, 2000);
    })
});
function getTests(callback) {
    const sortable = [];
    for (let job_id in unfinishedJobs) {
        sortable.push(unfinishedJobs[job_id]);
    }

    sortable.sort(function (a, b) {
        return new Date(a.started_at) - new Date(b.started_at);
    });

    console.log("Unfinished " + sortable.length)

    if (sortable.length == 0) {
        return setTimeout(callback, 5000);
    }

    const requestPerPage = 250;

    async.timesSeries(sortable.length/requestPerPage + 1, (i, callback) => {
        getJobs(sortable.slice(i * requestPerPage, i*requestPerPage + requestPerPage), results => {
            async.eachOfLimit(results, 15, (job, key, callback) => {
                if (job == null) {
                    return callback(null);
                }
                if(!(job.state == "errored" || job.state == "canceled" || job.state == "failed" || job.state == "passed")) {
                    unfinishedJobs[job.id] = job;
                    return callback(null);
                } else if(unfinishedJobs[job.id] != null) {
                    delete unfinishedJobs[job.id];
                    jobs[job.id] = job;
                    for (let i in builds[job.build_id].jobs) {
                        if (builds[job.build_id].jobs[i].id == job.id) {
                            builds[job.build_id].jobs[i] = job;
                            break;
                        }
                    }

                    log_parser(job, (tests, errors) => {
                        job.tests = tests;
                        job.errors = errors;
                        let count = 0;
                        let nbFailure = 0;
                        let nbError=  0;
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
                }
            }, r => {
                callback(null);
            });
        });
    }, callback);
}


function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

function getJobs(jobs, callback) {
    const job_ids = [];
    jobs.forEach(j => job_ids.push(j.id));
    travis.jobs('?ids[]=' + job_ids.join('&ids[]=')).log.get((err, data) => {
        if (err) {
            return console.error(err);
        }
        const jobs = data.jobs;
        const commits = data.commits;

        for(let i in jobs) {
            jobs[i].commit = commits[i];
        }
        if (callback) {
            callback(jobs)
        }
    });
}
const getJob = function (query) {
    async.forever(function (callback) {
        travis.jobs(query + "&random=" + Math.random()).get((err, data) => {
            if (err) {
                console.log(err);
                return callback(null);
            }
            const jobs = data.jobs;
            const commits = data.commits;

            for(let i in jobs) {
                jobs[i].commit = commits[i];
                jobEmitter.emit('job', jobs[i])
            }
            return callback(null);
        });
    }, console.log);
};

setTimeout(_ => getJob("?state=created"), 2500)
getJob("?page=0");
getJob("?state=started");
getJob("?state=created");


jobEmitter.on('job', (job) => {
    setImmediate(() => {
        if (jobs[job.id] == null) {
            countJob++;
            jobs[job.id] = job;
            if(!(job.state == "errored" || job.state == "canceled" || job.state == "failed" || job.state == "passed")) {
                unfinishedJobs[job.id] = job;
            }
            if (builds[job.build_id] == null) {
                builds[job.build_id] = {
                    repository_slug: job.repository_slug,
                    repository_id: job.repository_id,
                    build_id: job.build_id,
                    number: job.number.substring(0, job.number.indexOf(".")),
                    jobs: [job],
                    commit: job.commit
                };

                jobEmitter.emit("build", builds[job.build_id])
            } else {
                let exists = false;
                for (let j of builds[job.build_id].jobs) {
                    if (j.id == job.id) {
                        exists = true;
                        break
                    }
                }
                if (!exists) {
                    builds[job.build_id].jobs.push(job)
                }
            }
            delete jobs[job.id].commit;
            if (languages[job.config.language] == null) {
                languages[job.config.language] = 0;
            }
            languages[job.config.language] ++;
        } else {
            if (jobs[job.id].state != job.state) {
                jobs[job.id] = job;
            }
        }
    });
});

jobEmitter.on('build', build => {
    count++;
    travis.builds(build.build_id).get((err, data) => {
        if (err) {
            return console.error(err);
        }
        const build = data.build;
        build.build_id = build.id;
        build.jobs = data.jobs;
        build.commit = data.commit;
        builds[build.build_id] = build;
        for(let j of build.jobs) {
            jobEmitter.emit('job', j)
        }
    });
    console.log(count + " builds " + countJob + " jobs " + Object.keys(unfinishedJobs).length + " unfinished")
});


//
function exitHandler(options, exitCode) {
    if (options.exit) {
        const sortable = [];
        for (let language in languages) {
            sortable.push([language, languages[language]]);
        }

        sortable.sort(function (a, b) {
            return b[1] - a[1];
        });
        console.log(count + " builds " + countJob + " jobs", sortable);
        process.exit();
        fs.writeFile('builds.txt', jsonpack.pack(builds), (err, data) => {
            // nothing
            process.exit();
        });
    }
}
/*
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));*/