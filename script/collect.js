const async = require("async");
const fs = require("fs");


const scanner = require("./scanner");
const DEST = (__dirname + "/../test/")

if(!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST)
}

console.log("The jobs are stored in " + fs.realpathSync(DEST))

let count = 0;
let nbRequest = 0;
const startTime = new Date();
(async function () {
    const requestPerPage = 250;
    const nbPara = 7;

    const collectedBuilds = fs.readdirSync(DEST).map(d => {
        if (d.indexOf('-') == -1) {
            return parseInt(d.replace(".json", ""))
        } else {
            return parseInt(d.split('-')[0])
        }
    }).sort();

    // start to scan from this Travis Job ID
    let minId = 480040000
    const start = minId;
    console.log(minId, collectedBuilds[collectedBuilds.length - 1], collectedBuilds[collectedBuilds.length - 1] - minId)
    for (let i = 0; i < nbPara; i ++) {
        async.forever(async () => {
            return new Promise(async resolve => {
                const previous = minId;
                minId = minId - requestPerPage + 1;
                const jobIds = scanner.generateIds(previous, requestPerPage, true);
                try {
                    const jobs = await scanner.getJobsFromIds(jobIds);
                    nbRequest++;
                    fs.writeFile(DEST + jobIds[requestPerPage - 1] + '-' + jobIds[0] + '.json', JSON.stringify(jobs), (err, data) => {
                        //console.log(++count, job.id, job.config.language, job.started_at)
                    });
                    console.log(start - jobIds[requestPerPage - 1], jobIds[0], jobIds[requestPerPage - 1], parseInt((nbRequest/((new Date() - startTime)/1000))*requestPerPage) + " job/sec", jobs[jobs.length - 1].started_at)
                } catch(e) {
                    console.log(e);
                }
                resolve();
            });
        });
    }
})();
