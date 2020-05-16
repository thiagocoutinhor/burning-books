const SparkShell = require('../spark-shell/spark-shell').SparkSession
const Stream = require('stream').PassThrough
const passwordUtils = require('../crypt/password-utils')

module.exports = socket => {
    const user = socket.handshake.session.user
    user.password = passwordUtils.uncrush(user.password)

    const config = socket.handshake.query
    console.debug(`[SPARK SOCKET - ${user.login}] Connected`)

    if (!socket.shell) {
        socket.emit('disconnected')
    }

    console.info(`[SPARK SOCKET - ${user.login}] Starting a new session`)
    socket.shell = new SparkShell(user.login, user.password, config)

    // Open the shell and pass the readiness
    const consoleStream = new Stream()
    socket.shell.openShell(consoleStream).then(() => {
        socket.emit('ready')
    }).catch(error => {
        console.warn(`[SPARK SOCKET - ${user.login}] Spark connection failed`)
        socket.emit('connect.error', error)
        socket.disconnect()
    })

    // Passes all the input of the console ahead
    consoleStream.on('disconnect', () => socket.disconnect)
    consoleStream.on('data', data => socket.emit('console', data.toString()))

    // Execute a run command
    let isRunning = false
    socket.on('run', command => {
        if (socket.shell && !isRunning) {
            isRunning = true
            const stream = new Stream()

            stream.on('data', data => {
                socket.emit('return.stream', data)
            })

            socket.shell.command(command, stream).then(result => {
                stream.end()
                socket.emit('return', result)
            }).catch(erro => {
                socket.emit('return.error', erro)
            }).finally(() => isRunning = false)
        } else {
            console.warn(`[SPARK SOCKET - ${user.login}] Trying to run a command the shell open`)
        }
    })

    // Closes the shell on disconnect
    socket.on('disconnect', () => {
        console.debug(`[SPARK SOCKET- ${user.login}] Closing the session`)
        socket.shell.closeShell()
        socket.shell = undefined
        console.info(`[SPARK SOCKET- ${user.login}] Disconected`)
    })
}