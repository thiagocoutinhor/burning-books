const Ssh = require('ssh2-promise')
const spawn = require('child_process').spawn
const os = require('os')
const Duplex = require('stream').Duplex

// Classe responsável pela conexão e criação de uma nova sessão do spark
class SparkSession {

    constructor(user, password) {
        this.__startCommand = `spark-shell ${process.env.SPARK_QUEUE ? '--queue ' + process.env.SPARK_QUEUE : ''}`
        if (user) {
            this.__user = user
            this.ssh = new Ssh({
                host: process.env.HOST,
                username: user.toLowerCase(),
                password: password
            })
        } else {
            this.__user = 'local'
            this.ssh = {
                shell: () => {
                    const shell = spawn(os.platform() === 'win32' ? 'cmd' : 'bash')
                    const retorno = new Duplex({
                        write: data => {
                            shell.stdin.write(data)
                        },
                        read: () => {}
                    })
                    shell.stdout.on('data', data => retorno.emit('data', data))
                    shell.stderr.on('data', data => retorno.emit('data', data))
                    shell.stdout.on('data', data => console.log(data.toString()))
                    return Promise.resolve(retorno)
                },
                close: () => Promise.resolve()
            }
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
        if (!this.shell) {
            console.debug(`[SPARK - ${this.__user}] Abrindo o shell spark`)
            // Shell usando SSH
            this.shell = this.ssh.shell()
                .then(stream => {
                    return new Promise((resolve, reject) => {
                        const watcher = data => {
                            if (data.includes('scala>')) {
                                console.debug(`[SPARK - ${this.__user}] Shell rodando`)
                                stream.off('data', watcher)
                                resolve(stream)
                            }
                        }
                        stream.write(`${this.__startCommand}\n`)
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
            console.debug(`[SPARK - ${this.__user}] command> ${command}`)
            return new Promise((resolve, reject) => {
                // Verifica se o comando rodou
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

                    if (data.includes('scala>')) {
                        stream.off('data', watcher)
                        console.debug(`[SPARK - ${this.__user}] return> ${output.trim()}`)
                        resolve(output.trim())
                    }
                }

                // Garantia de nao receber o comando inicial de volta
                shell.write(`:paste\n${command}\n`)
                setTimeout(() => {
                    stream.on('data', watcher)
                    shell.write('\x04')
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

const session = new SparkSession()

session.command('val teste = "banana"').then(retorno => {
    console.log(retorno)
})
