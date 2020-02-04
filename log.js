const moment = require('moment')
const colors = require('colors/safe')

const oldDebug = console.debug
const oldInfo = console.info
const oldWarn = console.warn
const oldError = console.error
const oldLog = console.log

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
        oldDebug(colors.gray(`[${getTime()} DEBUG] ${mensagem}`))
    }
}

function info(mensagem) {
    if (logLevel <= 1) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        oldInfo(colors.blue(`[${getTime()} INFO] ${mensagem}`))
    }
}

function warn(mensagem) {
    if (logLevel <= 2) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        oldWarn(colors.yellow(`[${getTime()} WARN] ${mensagem}`))
    }
}

function error(mensagem) {
    if (logLevel <= 3) {
        if (typeof mensagem === "object") {
            mensagem = JSON.stringify(mensagem)
        }
        oldError(colors.red(`[${getTime()} ERROR] ${mensagem}`))
    }
}

function log(mensagem) {
    if (typeof mensagem === "object") {
        mensagem = JSON.stringify(mensagem)
    }
    oldLog(`[${getTime()}] ${mensagem}`)
}

console.info = info
console.error = error
console.log = log
console.oldLog = oldLog
console.debug = debug
console.warn = warn

console.log(`Log level: ${process.env.LOG_LEVEL}`)