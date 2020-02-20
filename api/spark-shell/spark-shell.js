const Ssh = require('ssh2-promise')
const local = require('child_process').spawn

const startCommand = `spark-shell ${process.env.SPARK_QUEUE ? '--queue ' + process.env.SPARK_QUEUE : ''}`

// Classe responsável pela conexão e criação de uma nova sessão do spark
class SparkSession {

    constructor(user, password) {
        if (user) {
            this.__user = user
            this.ssh = new Ssh({
                host: process.env.HOST,
                username: user.toLowerCase(),
                password: password
            })
        } else {
            this.local = true
        }
    }

    connect() {
        console.debug(`[SPARK - ${this.__user}] Iniciando a conexão`)
        if (!this.local) {
            this.ssh.on('close', () => console.debug(`[SPARK - ${this.__user}] Desconectado`))
            return this.ssh.connect().then(() => {
                console.debug(`[SPARK - ${this.__user}] Conectado`)
            })
        } else {
            return Promise.resolve()
        }
    }

    openShell() {
        console.debug(`[SPARK - ${this.__user}] Abrindo o shell spark`)

        if (!this.shell) {
            if (!local) {
                this.shell = this.ssh.shell()
                    .then(stream => {
                        return new Promise((resolve, reject) => {
                            const watcher = data => {
                                if (data.includes("scala>")) {
                                    console.debug(`[SPARK - ${this.__user}] Shell rodando`)
                                    stream.off('data', watcher)
                                    resolve(stream)
                                }
                            }
                            stream.write(`${this.startCommand}\n`)
                            stream.on('data', watcher)
                        })
                    })
            } else {
                // TODO fazer aqui
            }
        }

        return this.shell
    }

    command(command, outputStream) {
        if (!this.shell) {
            this.openShell()
        }
        return this.shell.then(stream => {
            console.debug(`[SPARK - ${this.__user}] command> ${command}`)
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
                        console.debug(`[SPARK - ${this.__user}] return> ${output.trim()}`)
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
        console.debug(`[SPARK - ${this.__user}] Fechando a conexão`)
        if (this.shell) {
            this.shell.then(stream => {
                console.debug(`[SPARK - ${this.__user}] Shell fechado`)
                stream.end('exit\n')
                stream.close()
            })
            this.shell = undefined
        }
        this.ssh.close().then(() => console.debug(`[SPARK - ${this.__user}] Conexão fechada`))
    }
}

module.exports = {
    SparkSession
}

const shell = local('spark-shell', {
    shell: true
})

shell.stdout.on('data', data => console.log(data.toString()))
shell.stderr.on('data', data => console.error(data.toString()))