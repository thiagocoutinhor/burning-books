const SparkShell = require('../spark-shell/spark-shell').SparkSession
const Stream = require('stream').PassThrough

const graveyard = {}

module.exports = socket => {
    const usuario = socket.handshake.session.usuario

    if (!usuario) {
        console.warn('Login sem usuário detectado. Enviando comando de reload.')
        socket.emit('reload')
        return
    }

    console.debug(`[IO - ${usuario.login}] Conectou`)
    socket.on('spark.connect', () => {
        if (graveyard[usuario.login]) {
            console.debug(`[IO - ${usuario.login}] Recuperando a sessão do cemitério`)
            clearTimeout(graveyard[usuario.login].timer)
            socket.shell = graveyard[usuario.login].shell
        } else {
            console.debug(`[IO - ${usuario.login}] Criando uma nova sessão`)
            socket.shell = new SparkShell(usuario.login, usuario.password)
        }
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
            console.debug(`[IO - ${usuario.login}] Guardando a sessão no cemitério`)
            const shell = socket.shell
            graveyard[usuario.login] = {
                shell: shell,
                timer: setTimeout(() => {
                    shell.closeShell()
                    graveyard[usuario.login] = undefined
                    console.debug(`[IO - ${usuario.login}] Sessão expurgada do cemitério`)
                }, 120 * 1000)
            }
            socket.shell = undefined
        }
        console.debug(`[IO - ${usuario.login}] Desconectou`)
    })
}