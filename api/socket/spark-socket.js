const SparkShell = require('../spark-shell/spark-shell').SparkSession
const Stream = require('stream').PassThrough
const passwordUtils = require('../crypt/password-utils')

module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    usuario.senha = passwordUtils.uncrush(usuario.senha)

    const config = socket.handshake.query
    console.debug(`[IO SPARK - ${usuario.login}] Conectou`)

    if (!socket.shell) {
        socket.emit('disconnected')
    }

    console.info(`[IO SPARK - ${usuario.login}] Criando uma nova sessão`)
    socket.shell = new SparkShell(usuario.login, usuario.senha, config)
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

            socket.shell.command(command, stream).then(retorno => {
                socket.emit('return', retorno)
            })
            .catch(erro => {
                socket.emit('return.error', erro)
            })
        }
    })

    socket.on('disconnect', () => {
        console.debug(`[IO SPARK- ${usuario.login}] Fechando a sessão`)
        socket.shell.closeShell()
        socket.shell = undefined
        console.info(`[IO SPARK- ${usuario.login}] Desconectou`)
    })
}