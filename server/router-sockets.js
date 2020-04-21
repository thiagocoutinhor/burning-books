const sparkSocket = require('./socket/spark-socket')
const listSocket = require('./socket/list-socket')
const bookSocket = require('./socket/book-socket')

module.exports = (server, session) => {
    const io = require('socket.io')(server)
    const ioSession = require('express-socket.io-session')
    io.use(ioSession(session))

    io.on('connect', socket => {
        // Login control
        if (!socket.handshake || !socket.handshake.session || !socket.handshake.session.user) {
            console.warn('No user detected. Sending reload command.')
            socket.emit('login')
            socket.disconnect()
        }
    })

    io.of('/spark')
        .use(ioSession(session))
        .on('connect', socket => sparkSocket(socket))

    io.of('/list')
        .use(ioSession(session))
        .on('connect', socket => listSocket(socket))

    io.of('/book')
        .use(ioSession(session))
        .on('connect', socket => bookSocket(socket))

}