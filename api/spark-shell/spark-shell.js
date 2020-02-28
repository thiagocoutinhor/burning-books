const Ssh = require('ssh2-promise')

// Classe responsável pela conexão e criação de uma nova sessão do spark
class SparkSession {

    constructor(user, password, configuration) {
        this.__queue = process.env.SPARK_QUEUE ? `--queue ${process.env.SPARK_QUEUE}` : ''
        this.__executors = configuration && configuration.executors ? `--num-executors ${configuration.executors}` : ''
        this.__cores = configuration && configuration.cores ? `--executor-cores ${configuration.cores}` : ''
        this.__memory = configuration && configuration.memory? `--executor-memory ${configuration.memory}G` : ''
        this.__startCommand = `spark-shell ${this.__queue} ${this.__executors} ${this.__cores} ${this.__memory}`
        console.debug(this.__startCommand)
        this.__user = user
        this.ssh = new Ssh({
            host: process.env.HOST,
            username: user.toLowerCase(),
            password: password
        })
    }

    connect() {
        console.debug(`[SPARK - ${this.__user}] Iniciando a conexão`)
        this.ssh.on('close', () => console.debug(`[SPARK - ${this.__user}] Desconectado`))
        return this.ssh.connect().then(() => {
            console.debug(`[SPARK - ${this.__user}] Conectado`)
        })
    }

    openShell() {
        if (!this.shell) {
            console.debug(`[SPARK - ${this.__user}] Abrindo o shell spark`)
            this.shell = this.ssh.shell()
                .then(stream => {
                    return new Promise((resolve, reject) => {
                        const watcher = data => {
                            if (data.includes('scala>')) {
                                console.debug(`[SPARK - ${this.__user}] Shell rodando`)
                                stream.removeListener('data', watcher)
                                resolve(stream)
                            }
                        }
                        stream.write(`${this.__startCommand}\r\n`)
                        stream.on('data', watcher)
                    })
                })
        }

        return this.shell
    }

    command(command, outputStream) {
        return this.openShell().then(stream => {
            console.debug(`[SPARK - ${this.__user}] command> ${command}`)
            return new Promise((resolve, reject) => {
                var output = ''
                // Verifica se o comando rodou
                const watcher = data => {
                    const tratado = data.toString()
                        .replace(':paste', '')
                        .replace('// Exiting paste mode, now interpreting.', '')
                        .replace('scala>', '')
                        .replace('\x04', '')
                        .trim()

                    if (outputStream && tratado != '') {
                        outputStream.emit('data', tratado)
                    }

                    if (output.length <= 1000000) {
                        output += tratado
                    } else {
                        console.warn('Output too large, stopped appending... Use the stream to circunvent that.')
                    }

                    if (data.includes('scala>')) {
                        stream.removeListener('data', watcher)
                        console.debug(`[SPARK - ${this.__user}] return> ${output.trim()}`)
                        resolve(output.trim())
                    }
                }

                // Garantia de nao receber o comando inicial de volta
                stream.write(`:paste\r\n${command}\r\n`)
                setTimeout(() => {
                    stream.on('data', watcher)
                    stream.write('\x04')
                }, 300);
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

        // this.ssh.close().then(() => console.debug(`[SPARK - ${this.__user}] Conexão fechada`))
    }
}

module.exports = {
    SparkSession
}