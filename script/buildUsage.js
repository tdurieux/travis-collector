const fs = require("fs");
const async = require("async");
const Diff = require("diff")
require('colors');

const DEST = ("/tmp/travis-listener/")

function isSomething(build, keywords) {
    if (build.config.stage) {
        const stage = JSON.stringify(build.config.stage)
        for (let key of keywords) {
            if (stage.toLowerCase().indexOf(key) != -1) {
                return true
            }
        }
    }
    if (build.config.script == null) {
        return true
    }
    if (build.config.script === true || build.config.script === false) {
        return true
    }
    if (build.config.script.length == null) {
        build.config.script = [build.config.script]
    }
    for (let s of build.config.script) {
        if (s == null) {
            continue
        }
        if (s === true || s === false) {
            return true
        }
        if (s.toLowerCase == null) {
            s = JSON.stringify(s)
        }
        for (let key of keywords) {
            if (s.toLowerCase().indexOf(key) != -1) {
                return true
            }
        }
    }
    return false
}
function isFormat(build) {
    return isSomething(build, ['style', 'stlye', 'format', 'fmt' , 'lint', 'license'])
}
function isBuild(build) {
    return isSomething(build, ['build', 'compile', 'make'])
}
function isDoc(build) {
    return isSomething(build, ['doc', 'site', 'wiki', 'readme', 'gh', 'page', 'changelog'])
}
function isTest(build) {
    return isSomething(build, ['test', 'phpspec', 'rspec', 'unit', 'coverage', 'package'])
}
function isRelease(build) {
    return isSomething(build, ['release', 'deploy', 'image', 'publish', 'ship'])
}
function isAnalysis(build) {
    return isSomething(build, ['analysis', 'analyze', 'sonar', 'shellcheck', 'climate', 'quality'])
}
function isCommunicate(build) {
    return isSomething(build, ['comment', 'email', 'slack', 'upload', 'report'])
}
function isInstall(build) {
    return isSomething(build, ['install', 'npm', 'setup'])
}

function percent(count, value) {
    return parseInt(value * 10000 / count)/100.0 + '\\%'
}
const repositoryConfig = {}

let count = 0
let nbTest = 0
let nbRelease = 0
let nbDoc = 0
let nbAnalysis = 0
let nbBuild = 0
let nbFormat = 0
let nbUnknow = 0
let nbCommunicate = 0
let nbInstall = 0

const stages = new Set()
const commitChangeConfig = {}
const commits = {}

const builds = fs.readdirSync(DEST).sort()
async.eachLimit(builds, 1, (buildFile, callback) => {
    fs.readFile(DEST + buildFile, (err, content) => {
        
        let builds = JSON.parse(content);
        for (let build of builds) {
            count++
            if (commits[build.repository_slug] == null) {
                commits[build.repository_slug] = new Set()
            }
            commits[build.repository_slug].add(build.commit.sha)
            let executionTime = 0
            if (build.started_at != null && build.finished_at != null) {
                executionTime = Math.round((new Date(build.finished_at) - new Date(build.started_at))/1000)
            }
            const stageNumber = parseInt(build.number.split('\.')[1])
            const branch = build.commit.branch
            if (repositoryConfig[build.repository_slug] == null) {
                repositoryConfig[build.repository_slug] = {}
            }
            if (repositoryConfig[build.repository_slug][branch] == null) {
                repositoryConfig[build.repository_slug][branch] = {}
            }
            const strConfig = JSON.stringify(build.config)
            const value = repositoryConfig[build.repository_slug][branch][stageNumber]
            if (value == null) {
                repositoryConfig[build.repository_slug][branch][stageNumber] = strConfig
            } else {
                if (value != strConfig) {
                    const diff = Diff.diffJson(build.config, JSON.parse(value))
                    
                    if (diff.length < 2) {
                        console.log('not valid')
                    } 
                    //console.log(build.repository_slug, branch, build.number)
                    if (commitChangeConfig[build.repository_slug] == null) {
                        commitChangeConfig[build.repository_slug] = new Set()
                    }
                    commitChangeConfig[build.repository_slug].add(build.commit.sha)
                    repositoryConfig[build.repository_slug][branch][stageNumber] = strConfig
                }
            } 
            if (isTest(build)) {
                nbTest++
            } else if (isDoc(build)) {
                nbDoc++
            } else if (isRelease(build)) {
                nbRelease++
            } else if (isFormat(build)) {
                nbFormat++
            } else if (isBuild(build)) {
                nbBuild++
            } else if (isAnalysis(build)) {
                nbAnalysis++
            } else if (isCommunicate(build)) {
                nbCommunicate++
            } else if (isInstall(build)) {
                nbInstall++
            } else if (build.config.stage) {
                nbUnknow++
            } else {
                nbUnknow++
            }
            if (count % 50000 == 0) {
                console.log(count, 
                    percent(count, nbTest), 
                    percent(count, nbRelease), 
                    percent(count, nbAnalysis), 
                    percent(count, nbFormat), 
                    percent(count, nbDoc), 
                    percent(count, nbBuild), 
                    percent(count, nbCommunicate), 
                    percent(count, nbInstall), 
                    percent(count, nbUnknow), 
                    percent(commits.size, commitChangeConfig.size))

                console.log('Testing & \\numprint{' + nbTest + '} & ' + percent(count, nbTest) + ' \\\\')
                console.log('Building & \\numprint{' + (nbBuild + nbInstall) + '} & ' + percent(count, nbBuild + nbInstall) + ' \\\\')
                console.log('Releasing & \\numprint{' + nbRelease + '} & ' + percent(count, nbRelease) + ' \\\\')
                console.log('Analyzing & \\numprint{' + nbAnalysis + '} & ' + percent(count, nbAnalysis) + ' \\\\')
                console.log('Formatting & \\numprint{' + nbFormat + '} & ' + percent(count, nbFormat) + ' \\\\')
                console.log('Documentation & \\numprint{' + nbDoc + '} & ' + percent(count, nbDoc) + ' \\\\')
                console.log('Communication & \\numprint{' + nbCommunicate + '} & ' + percent(count, nbCommunicate) + ' \\\\\\hline')
                console.log('Unknown & \\numprint{' + nbUnknow + '} & ' + percent(count, nbUnknow) + ' \\\\')

                let commitCount = 0
                for (let p in commits) {
                    commitCount += commits[p].size
                }
                let changedCommitCount = 0
                for (let p in commitChangeConfig) {
                    changedCommitCount += commitChangeConfig[p].size
                }
                console.log('\\newcommand{\\nbCommits}[0]{\\numprint{' + commitCount + '}\\xspace}')
                console.log('\\newcommand{\\nbConfigChange}[0]{\\numprint{' + changedCommitCount + '}\\xspace}')

                console.log('\\newcommand{\\nbConfigChangePercent}[0]{\\numprint{' + percent(commitCount, changedCommitCount) + '}\\xspace}') 

                console.log('\\newcommand{\\nbProjoectChangeConfig}[0]{\\numprint{' + Object.keys(commitChangeConfig).length + '}\\xspace}') 
                console.log('\\newcommand{\\nbProjoectChangeConfigPercent}[0]{\\numprint{' + percent( Object.keys(commits).length ,Object.keys(commitChangeConfig).length) + '}\\xspace}') 
            }
        }
        callback()
    })
    
}, () => {

    console.log('Testing & \\numprint{' + nbTest + '} & ' + percent(count, nbTest) + ' \\\\')
    console.log('Building & \\numprint{' + (nbBuild + nbInstall) + '} & ' + percent(count, nbBuild + nbInstall) + ' \\\\')
    console.log('Releasing & \\numprint{' + nbRelease + '} & ' + percent(count, nbRelease) + ' \\\\')
    console.log('Analyzing & \\numprint{' + nbAnalysis + '} & ' + percent(count, nbAnalysis) + ' \\\\')
    console.log('Formatting & \\numprint{' + nbFormat + '} & ' + percent(count, nbFormat) + ' \\\\')
    console.log('Documentation & \\numprint{' + nbDoc + '} & ' + percent(count, nbDoc) + ' \\\\')
    console.log('Communication & \\numprint{' + nbCommunicate + '} & ' + percent(count, nbCommunicate) + ' \\\\\\hline')
    console.log('Unknown & \\numprint{' + nbUnknow + '} & ' + percent(count, nbUnknow) + ' \\\\')

    let commitCount = 0
    for (let p in commits) {
        commitCount += commits[p].size
    }
    let changedCommitCount = 0
    for (let p in commitChangeConfig) {
        changedCommitCount += commitChangeConfig[p].size
    }
    console.log('\\newcommand{\\nbCommits}[0]{\\numprint{' + commitCount + '}\\xspace}')
    console.log('\\newcommand{\\nbConfigChange}[0]{\\numprint{' + changedCommitCount + '}\\xspace}')

    console.log('\\newcommand{\\nbConfigChangePercent}[0]{\\numprint{' + percent(commitCount, changedCommitCount) + '}\\xspace}') 

    console.log('\\newcommand{\\nbProjoectChangeConfig}[0]{\\numprint{' + Object.keys(commitChangeConfig).length + '}\\xspace}') 
    console.log('\\newcommand{\\nbProjoectChangeConfigPercent}[0]{\\numprint{' + percent( Object.keys(commits).length ,Object.keys(commitChangeConfig).length) + '}\\xspace}') 

    console.log(count, nbTest, nbRelease, nbAnalysis, nbFormat, nbDoc, nbBuild, nbCommunicate, nbInstall, nbUnknow, commitChangeConfig.size, commits.size)
});
