const SparkShell = require('../spark-shell/spark-shell').SparkSession
const Stream = require('stream').PassThrough

module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    console.debug(`[IO SPARK - ${usuario.login}] Conectou`)

    if (!socket.shell) {
        socket.emit('disconnected')
    }

    socket.on('open', config => {
        console.debug(`[IO SPARK - ${usuario.login}] Criando uma nova sessão`)
        socket.shell = new SparkShell(usuario.login, usuario.senha, config)
        socket.shell.openShell().then(() => {
            socket.emit('ready')
        }).catch(error => {
            console.error(error)
            socket.emit('connect.error', error)
        })
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

    socket.on('close', () => {
        console.debug(`[IO SPARK- ${usuario.login}] Fechando a sessão`)
        if (socket.shell) {
            socket.shell.closeShell()
            socket.emit('disconnected')
        }
    })

    socket.on('disconnect', () => {
        if (socket.shell) {
            console.debug(`[IO SPARK- ${usuario.login}] Fechando a sessão`)
            socket.shell.closeShell()
            socket.shell = undefined
        }
        console.debug(`[IO SPARK- ${usuario.login}] Desconectou`)
    })
}