const Ssh = require('ssh2-promise')

// Classe responsável pela conexão e criação de uma nova sessão do spark
class SparkSession {

    constructor(user, password, configuration) {
        const queue = process.env.SPARK_QUEUE ? `--queue ${process.env.SPARK_QUEUE}` : ''
        const executors = configuration && configuration.executors ? `--num-executors ${configuration.executors}` : ''
        const cores = configuration && configuration.cores ? `--executor-cores ${configuration.cores}` : ''
        const memory = configuration && configuration.memory ? `--executor-memory ${configuration.memory}G` : ''
        const libraries = process.env.SPARK_LIBRARIES ? `--jars ${process.env.SPARK_LIBRARIES}` : ''

        this.__startCommand = `spark-shell ${queue} ${executors} ${cores} ${memory} ${libraries}`
        this.__user = user
        console.debug(`[SPARK - ${this.__user}] Command:\n\t${this.__startCommand}`)

        this.ssh = new Ssh({
            host: process.env.SPARK_HOST,
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
                const cleanCommand = command.replace(/\t/g, '')
                stream.write(`:paste\r\n${cleanCommand}\r\n`)
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
    }
}

module.exports = {
    SparkSession
}

// Caso seja um ambiente de teste, moca a conexão com o servidor
if (process.env.MODE === 'TEST') {
    require('./spark-shell-stub')
}