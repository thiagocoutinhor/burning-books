const moment = require('moment')
const colors = require('chalk')

console.old = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    log: console.log
}

const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const logLevel = levels.indexOf(process.env.LOG_LEVEL)

function getTime() {
    return moment().format('HH:MM:ss.SSS')
}

function debug(mensagem, ...messages) {
    if (logLevel <= 0) {
        if (typeof mensagem !== "object") {
            mensagem = colors.gray(mensagem)
        }
        console.old.debug(colors.gray(`[${getTime()} DEBUG]`), mensagem, ...messages)
    }
}

function info(mensagem, ...messages) {
    if (logLevel <= 1) {
        console.old.info(`[${getTime()} INFO]`, mensagem, ...messages)
    }
}

function warn(mensagem, ...messages) {
    if (logLevel <= 2) {
        if (typeof mensagem !== "object") {
            mensagem = colors.yellow(mensagem)
        }
        console.old.warn(colors.yellow(`[${getTime()} WARN]`), mensagem, ...messages)
    }
}

function error(mensagem, ...messages) {
    if (logLevel <= 3) {
        if (typeof mensagem !== "object") {
            mensagem = colors.red(mensagem)
        }
        console.old.error(colors.red(`[${getTime()} ERROR]`), mensagem, ...messages)
    }
}

function log(mensagem, ...messages) {
    if (typeof mensagem !== "object") {
        mensagem = colors.blue(mensagem)
    }
    console.old.log(colors.blue(`[${getTime()}]`), mensagem, ...messages)
}

console.info = info
console.error = error
console.log = log
console.debug = debug
console.warn = warn

console.log(`Log level: ${process.env.LOG_LEVEL}`)