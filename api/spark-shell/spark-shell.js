const Ssh = require('ssh2-promise')

// Classe responsável pela conexão e criação de uma nova sessão do spark
class SparkSession {

    constructor(user, password) {
        this.user = user
        this.ssh = new Ssh({
            host: process.env.HOST,
            username: user.toLowerCase(),
            password: password
        })
    }

    connect() {
        console.debug(`[SPARK - ${this.user}] Iniciando a conexão`)
        this.ssh.on('close', () => console.debug(`[SPARK - ${this.user}] Desconectado`))
        return this.ssh.connect().then(() => {
            console.debug(`[SPARK - ${this.user}] Conectado`)
        })
    }

    openShell() {
        console.debug(`[SPARK - ${this.user}] Abrindo o shell spark`)

        if (!this.shell) {
            this.shell = this.ssh.shell()
                .then(stream => {
                    return new Promise((resolve, reject) => {
                        const watcher = data => {
                            if (data.includes("scala>")) {
                                console.debug(`[SPARK - ${this.user}] Shell rodando`)
                                stream.off('data', watcher)
                                resolve(stream)
                            }
                        }
                        stream.write('spark-shell --queue root.digital.users\n')
                        stream.on('data', watcher)
                    })
                })
        }

        return this.shell
    }

    command(command, outputStream) {
        if (!this.shell) {
            this.openShell()
        }
        return this.shell.then(stream => {
            console.debug(`[SPARK - ${this.user}] command> ${command}`)
            return new Promise((resolve, reject) => {
                let output = '';

                const watcher = data => {
                    const tratado = data.toString().replace(':paste', '')
                        .replace('// Exiting paste mode, now interpreting.', '')
                        .replace('scala>', '')
                        .trim()

                    if (outputStream && tratado != '') {
                        outputStream.emit('data', tratado)
                    }

                    if (output.length <= 1000000) {
                        output += tratado
                    } else {
                        console.warn('Output too large, stopped appending... Use the stream to circunvent that.')
                    }

                    if (data.includes("scala>")) {
                        stream.off('data', watcher)
                        console.debug(`[SPARK - ${this.user}] return> ${output.trim()}`)
                        resolve(output.trim())
                    }
                }

                // Garantia de n]ao receber o comando inicial de volta
                stream.write(`:paste\n${command}\n`)
                setTimeout(() => {
                    stream.on('data', watcher)
                    stream.write('\x04')
                }, 100);
            })
        })
    }

    closeShell() {
        console.debug(`[SPARK - ${this.user}] Fechando a conexão`)
        if (this.shell) {
            this.shell.then(stream => {
                console.debug(`[SPARK - ${this.user}] Shell fechado`)
                stream.end('exit\n')
                stream.close()
            })
            this.shell = undefined
        }
        this.ssh.close().then(() => console.debug(`[SPARK - ${this.user}] Conexão fechada`))
    }
}

module.exports = {
    SparkSession
}