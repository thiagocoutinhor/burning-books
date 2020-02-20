const Ssh = require('ssh2-promise')
const spawn = require('node-pty').spawn
const os = require('os')
const Duplex = require('stream').PassThrough

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
        if (!this.shell) {
            console.debug(`[SPARK - ${this.__user}] Abrindo o shell spark`)
            if (!this.local) {
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
            } else {
                // Shell usando o prompt de comandos local
                this.shell = new Promise((resolve, reject) => {
                    const localShell = spawn(os.platform() === 'win32' ? 'powershell.exe' : 'bash')
                    const stream = new Duplex()
                    localShell.on('data', data => stream.emit('data', data))

                    const shellRun = data => {
                        if (data.includes('>')) {
                            console.debug(`[SPARK - ${this.__user}] Console rodando`)
                            stream.off('data', shellRun)
                            localShell.write('spark-shell\r\n')
                            stream.on('data', scalaRun)
                        }
                    }

                    const scalaRun = data => {
                        if (data.includes('scala>')) {
                            console.debug(`[SPARK - ${this.__user}] Shell rodando`)
                            stream.off('data', scalaRun)
                            resolve(localShell)
                        }
                    }

                    stream.on('data', shellRun)
                })
            }
        }

        return this.shell
    }

    command(command, outputStream) {
        if (!this.shell) {
            this.openShell()
        }

        return this.shell.then(shell => {
            console.debug(`[SPARK - ${this.__user}] command> ${command}`)
            return new Promise((resolve, reject) => {
                let output = '';
                var stream = shell

                // Tratamento para o shell local
                if (this.local) {
                    stream = new Duplex()
                    shell.on('data', data => stream.emit('data', data))
                }

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
            if (!this.local) {
                this.shell.then(stream => {
                    console.debug(`[SPARK - ${this.__user}] Shell fechado`)
                    stream.end('exit\n')
                    stream.close()
                })
            } else {
                this.shell.then(shell => {
                    shell.write('exit')
                    shell.kill()
                    console.debug(`[SPARK - ${this.__user}] Shell fechado`)
                })
            }
            this.shell = undefined
        }
        if (!this.local) {
            this.ssh.close().then(() => console.debug(`[SPARK - ${this.__user}] Conexão fechada`))
        }
    }
}

module.exports = {
    SparkSession
}