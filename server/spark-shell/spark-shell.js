const Ssh = require('ssh2-promise')

const LOGIN_TYPE = process.env.LOGIN_TYPE ? process.env.LOGIN_TYPE : 'PASSWORD'

class SparkSession {

    constructor(user, password, configuration) {
        const queue = process.env.SPARK_QUEUE ? `--queue ${process.env.SPARK_QUEUE}` : ''
        const executors = configuration && configuration.executors ? `--num-executors ${configuration.executors}` : ''
        const cores = configuration && configuration.cores ? `--executor-cores ${configuration.cores}` : ''
        const memory = configuration && configuration.memory ? `--executor-memory ${configuration.memory}G` : ''
        const libraries = process.env.SPARK_LIBRARIES ? `--jars ${process.env.SPARK_LIBRARIES}` : ''

        this.__startCommand = `spark-shell ${queue} ${executors} ${cores} ${memory} ${libraries}`
        this.__user = user
        this.__applicationId = null

        const parameters = {
            host: process.env.SPARK_HOST,
            username: user.toLowerCase(),
            keepaliveInterval: 60 * 1000
        }

        if (LOGIN_TYPE === 'PASSWORD') {
            parameters.password = password
        } else if (LOGIN_TYPE === 'SSH') {
            parameters.privateKey = password
        }

        this.ssh = new Ssh(parameters)
    }

    getApplicationId() {
        return this.__applicationId
    }

    connect() {
        console.debug(`[SPARK - ${this.__user}] Starting connection`)
        this.ssh.on('close', () => console.debug(`[SPARK - ${this.__user}] Disconnected`))
        return this.ssh.connect().then(() => {
            console.debug(`[SPARK - ${this.__user}] Connected`)
        })
    }

    openShell(consoleStream) {
        if (!this.shell) {
            console.info(`[SPARK - ${this.__user}] Opening spark shell`)
            console.debug(`[SPARK - ${this.__user}] Command:\n\t${this.__startCommand}`)
            this.shell = this.ssh.shell()
                .then(stream => {
                    if (consoleStream) {
                        stream.pipe(consoleStream)
                    }
                    return new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            console.warn(`[SPARK - ${this.__user}] Connection timeout`)
                            reject('Connection timeout')
                        }, 5 * 60 * 1000)

                        let agg = ''
                        const watcher = data => {
                            agg += data
                            const idFinder = /application_\d+_\d+/.exec(agg)
                            if (idFinder) {
                                this.__applicationId = idFinder[0]
                            }
                            if (data.includes('scala>')) {
                                clearTimeout(timeout)

                                console.debug(`[SPARK - ${this.__user}] Shell running`)
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
            return new Promise(resolve => {
                var output = ''

                const watcher = data => {
                    const cleanData = data.toString()
                        .replace(':paste', '')
                        .replace('// Exiting paste mode, now interpreting.', '')
                        .replace('scala>', '')
                        .replace('\x04', '')
                        .trim()

                    if (outputStream && cleanData != '') {
                        outputStream.emit('data', cleanData)
                    }

                    if (output.length <= 1000000) {
                        output += cleanData
                    } else {
                        console.warn('Output too large, stopped appending... Use the utput stream to circunvent that.')
                    }

                    if (data.includes('scala>')) {
                        stream.removeListener('data', watcher)
                        console.debug(`[SPARK - ${this.__user}] return> ${output.trim()}`)
                        resolve(output.trim())
                    }
                }

                const cleanCommand = command.replace(/\t/g, '')
                stream.write(`:paste\r\n${cleanCommand}\r\n`)
                setTimeout(() => {
                    stream.on('data', watcher)
                    stream.write('\x04')
                }, 300)
            })
        })
    }

    closeShell() {
        if (this.shell) {
            console.debug(`[SPARK - ${this.__user}] Closing connection`)
            this.shell.then(stream => {
                console.info(`[SPARK - ${this.__user}] Shell closed`)
                stream.end('exit\n')
                stream.close()
            }).catch(() => {})
            this.shell = undefined
        }
    }
}

module.exports = {
    SparkSession
}

if (process.env.MODE === 'TEST') {
    require('./spark-shell-stub')
}