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
    socket.shell.openShell().then(() => {
        socket.emit('ready')
    }).catch(error => {
        console.error(error)
        socket.emit('connect.error', error)
        socket.disconnect()
    })

    socket.on('run', command => {
        if (socket.shell) {
            const stream = new Stream()

            stream.on('data', data => {
                socket.emit('return.stream', data)
            })

            socket.shell.command(command, stream).then(result => {
                socket.emit('return', result)
            }).catch(erro => {
                socket.emit('return.error', erro)
            })
        }
    })

    socket.on('disconnect', () => {
        console.debug(`[SPARK SOCKET- ${user.login}] Closing the session`)
        socket.shell.closeShell()
        socket.shell = undefined
        console.info(`[SPARK SOCKET- ${user.login}] Disconected`)
    })
}