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

function debug(mensagem) {
    if (logLevel <= 0) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        console.old.debug(colors.gray(`[${getTime()} DEBUG] ${mensagem}`))
    }
}

function info(mensagem) {
    if (logLevel <= 1) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        console.old.info(colors.blue(`[${getTime()} INFO] ${mensagem}`))
    }
}

function warn(mensagem) {
    if (logLevel <= 2) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        console.old.warn(colors.yellow(`[${getTime()} WARN] ${mensagem}`))
    }
}

function error(mensagem) {
    if (logLevel <= 3) {
        if (typeof mensagem === "object") {
            console.old.error(colors.red(`[${getTime()} ERROR] ${mensagem}`))
            console.old.error(colors.red(mensagem))
        } else {
            console.old.error(colors.red(`[${getTime()} ERROR] ${mensagem}`))
        }
    }
}

function log(mensagem) {
    if (typeof mensagem === "object") {
        mensagem = JSON.stringify(mensagem)
    }
    console.old.log(`[${getTime()}] ${mensagem}`)
}

console.info = info
console.error = error
console.log = log
console.debug = debug
console.warn = warn

console.log(`Log level: ${process.env.LOG_LEVEL}`)