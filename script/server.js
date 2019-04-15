const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const URL = require('url');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const path = require('path');
const async = require("async");


const logParser = require("./parser/parser-init").parser;
const scanner = require("./scanner");

const app = express();

const API_ROOT = "/API";



// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(cors());


const port = process.env.APP_PORT || 9080;

const router = express.Router();

router.get('/stat', async function(req, res) {
    res.json(scanner.stat());
});

router.get('/job/:id', async function(req, res) {
    async.parallel([async () => logParser({id: req.params.id}), callback => {
        scanner.travis.jobs(req.params.id).get((error, value) => {
            if (error) {
                return callback(error);
            }
            value.job.commit = value.commit;
            callback(null, value.job);
        });
    }], (err, results) => {
        if (err) {
            return res.status(500).send(err).end();
        } else {
            results[1].log = results[0].log;
            results[1].tests = results[0].tests;
            results[1].errors = results[0].errors;
            results[1].tool = results[0].tool;
            res.json(results[1]);
        }
    });
});


router.get('/job/:id', async function(req, res) {
    Promise.all(logParser({id: req.params.id}), new Promise((resolve, reject) => {
        if (error) {
            reject(error);
        }
        value.job.commit = value.commit;
        resolve(value.job);
    }), values => {})

});

app.use("/api", router);

app.use('/', express.static('../dist'));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
});

setInterval(function ping() {
    wss.clients.forEach(client => {
        if (client.isAlive === false) {
            return client.terminate();
        }
        client.isAlive = false;
        client.ping(() => {});
    });
}, 30000);


wss.broadcast = function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data), error => {
                if (error) {
                    console.error(error);
                }
            });
        }
    });
};
(async function () {
    const host = process.env.HOST || "//localhost:8080";

    console.log("Start on port: " + port);
    server.listen(port);
    scanner.scanTravis();
    scanner.scanUnfinishedJobs();
    scanner.listener.on("job", job => {
        wss.broadcast({
            event: "job",
            data: job
        })
    });
    scanner.listener.on("job_finished", job => {
        wss.broadcast({
            event: "job_finished",
            data: job
        });
    });
    scanner.listener.on("job_updated", job => {
        wss.broadcast({
            event: "job_updated",
            data: job
        })
    })
})();
