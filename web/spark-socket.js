const SparkShell = require('../api/spark-shell/spark-shell').SparkSession

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
            socket.shell.command(command).then(retorno => {
                socket.emit('spark.return', retorno)
            })
            .catch(erro => {
                socket.emit('spark.error', erro)
            })
        }
    })

    socket.on('disconnect', () => {
        socket.shell.disconect()
        socket.shell = undefined
        console.debug(`[IO - ${usuario.login}] Desconectou`)
    })
}