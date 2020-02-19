const SparkShell = require('../spark-shell/spark-shell').SparkSession
const Stream = require('stream').PassThrough

module.exports = socket => {
    const usuario = socket.handshake.session.usuario

    if (!usuario) {
        console.warn('Login sem usuário detectado. Enviando comando de reload.')
        socket.emit('reload')
        return
    }

    console.debug(`[IO - ${usuario.login}] Conectou`)
    socket.on('spark.connect', () => {
        socket.shell = new SparkShell(usuario.login, usuario.password)
        socket.shell.openShell().then(() => {
            socket.emit('spark.ready')
        })
    })

    socket.on('spark.run', command => {
        if (socket.shell) {
            const stream = new Stream()

            stream.on('data', data => {
                socket.emit('spark.return.stream', data)
            })

            socket.shell.command(command, stream).then(retorno => {
                socket.emit('spark.return', retorno)
            })
            .catch(erro => {
                socket.emit('spark.error', erro)
            })
        }
    })

    socket.on('disconnect', () => {
        if (socket.shell) {
            socket.shell.closeShell()
            socket.shell = undefined
        }
        console.debug(`[IO - ${usuario.login}] Desconectou`)
    })
}