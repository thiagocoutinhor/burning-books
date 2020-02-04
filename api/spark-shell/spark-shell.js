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

    openShell() {
        console.debug(`[SPARK- ${this.user}] Iniciando a conexão`)
        this.ssh.on('close', () => console.debug(`[SPARK - ${this.user}] Desconectado`))
        this.shell = this.ssh.connect().then(() => {
            console.debug(`[SPARK - ${this.user}] Conectado`)
            console.debug(`[SPARK - ${this.user}] Abrindo o shell spark`)

            return this.ssh.shell()
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
        }).catch(erro => {
            console.error(`[SPARK - ${this.user}] ${erro}`)
        })
        return this.shell
    }

    command(command) {
        if (!this.shell) {
            this.openShell()
        }
        return this.shell.then(stream => {
            console.debug(`[SPARK - ${this.user}] command> ${command}`)
            return new Promise((resolve, reject) => {
                let output = '';

                const watcher = data => {
                    output += data
                    if (data.includes("scala>")) {
                        stream.off('data', watcher)
                        output = output
                            .replace(':paste', '')
                            .replace('// Entering paste mode (ctrl-D to finish)', '')
                            .replace('// Exiting paste mode, now interpreting.', '')
                            .replace(command, '')
                            .replace('scala>', '')
                        console.debug(`[SPARK - ${this.user}] return> ${output.trim()}`)
                        resolve(output.trim())
                    }
                }

                stream.on('data', watcher)
                stream.write(`:paste\n${command}\n\x04`)
            })
        })
    }
}

module.exports = {
    SparkSession
}