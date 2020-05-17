const sparkSocket = require('./socket/spark-socket')
const listSocket = require('./socket/list-socket')
const bookSocket = require('./socket/book-socket')
const accessControl = require('./api/login-api').accessControl

function connectCheck(socket, apiHook) {
    new Promise(resolve => {
        // User existence
        if (!socket.handshake || !socket.handshake.session || !socket.handshake.session.user) {
            console.warn('[SOCKETS] No user detected')
            resolve(false)
        } else {
            // Login control
            const user = socket.handshake.session.user

            console.debug(`[SOCKETS - ${user.login}] Checking login credentials`)
            accessControl(user)
                .then(hasAcces => {
                    if (hasAcces) {
                        console.debug(`[SOCKETS - ${user.login}] Credentials ok`)
                        resolve(true)
                    } else {
                        console.warn(`[SOCKETS - ${user.login}] Fail on credential check`)
                        resolve(false)
                    }
                })
        }
    }).then(hasAcces => {
        if (hasAcces) {
            apiHook(socket)
        } else {
            socket.emit('logoff')
            socket.disconnect()
        }
    })
}

module.exports = (server, session) => {
    const io = require('socket.io')(server)
    const ioSession = require('express-socket.io-session')
    io.use(ioSession(session))

    io.of('/spark')
        .use(ioSession(session))
        .on('connect', socket => sparkSocket(socket))

    io.of('/list')
        .use(ioSession(session))
        .on('connect', socket => connectCheck(socket, listSocket))

    io.of('/book')
        .use(ioSession(session))
        .on('connect', socket => connectCheck(socket, bookSocket))

}