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

    if (!socket.shell) {
        socket.emit('spark.disconnected')
    }

    socket.on('spark.connect', config => {
        console.debug(`[IO - ${usuario.login}] Criando uma nova sessão`)
        socket.shell = new SparkShell(usuario.login, usuario.senha, config)
        socket.shell.openShell().then(() => {
            socket.emit('spark.ready')
        }).catch(error => {
            console.error(error)
            socket.emit('spark.connect.error', error)
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
                socket.emit('spark.return.error', erro)
            })
        }
    })

    socket.on('spark.disconnect', () => {
        console.debug(`[IO - ${usuario.login}] Fechando a sessão`)
        if (socket.shell) {
            socket.shell.closeShell()
            socket.emit('spark.disconnected')
        }
    })

    socket.on('disconnect', () => {
        if (socket.shell) {
            console.debug(`[IO - ${usuario.login}] Fechando a sessão`)
            socket.shell.closeShell()
            socket.shell = undefined
        }
        console.debug(`[IO - ${usuario.login}] Desconectou`)
    })
}