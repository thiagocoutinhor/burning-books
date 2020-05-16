const { SparkSession } = require('./spark-shell')
const { PassThrough } = require('stream')

// Mock config for easy changes
const config = {
    shellOpenTime: 2 * 1000,
    mockRunCommand: (user, comando, stream) => {
        console.log(`[SPARK MOCK - ${user}] Run recieved\n${comando}`)

        // Progress bars
        const progress = (porcentagem, stage) => {
            const maxCaracters = 14
            const caracteres = maxCaracters * porcentagem / 100
            const values = `(${2000 * porcentagem / 100 } + 0) / 2000`
            const currentStage = `Stage ${stage ? stage : '0'}`
            return `[${currentStage}:${'>'.padStart(caracteres, '=').padEnd(maxCaracters, ' ')}${values}]`
        }

        // Number of bars and how much they fill after every second
        const stages = [
            { step: 50, progress: 0 }, // full
            { step: 10, progress: 0 }, // overflow
            { step: 40, progress: 0, incomplete: true } // underflow
        ]

        // Each second tick the bars
        var finalizado = 0
        stages.forEach((stage, index) => {
            const timer = setInterval(() => {
                stage.progress += stage.step
                stream.emit('data', progress(stage.progress, index))
                const stop = (stage.incomplete && stage.progress >= 80) || (stage.progress >= 100)
                if (stop) {
                    finalizado++
                    clearInterval(timer)
                    if (finalizado == stages.length) {
                        stream.emit('data', comando)
                        stream.emit('data', 'scala>')
                        stream.running = false
                    }
                }
            }, 1000)
        })
    }
}

// Mocks the ssh connection
SparkSession.prototype.connect = function() {
    console.log(`[SPARK MOCK - ${this.__user}] Starting connection`)
    return Promise.resolve()
}

// Mocks the shell opening
SparkSession.prototype.openShell = function(consoleStream) {
    if (!this.shell) {
        console.log(`[SPARK MOCK - ${this.__user}] Opening spark shell`)
        this.shell = new Promise(resolve => {
            setTimeout(() => {
                console.log(`[SPARK MOCK - ${this.__user}] Shell running`)
                const stream = new PassThrough()
                stream.close = () => {}
                if (consoleStream) {
                    stream.pipe(consoleStream)
                }

                // Creates the command
                var command = ''
                stream.on('data', data => {
                    if (!stream.running) {
                        command += data.toString()
                            .replace(':paste', '')
                            .replace('\x04', '')

                        // Control+D marks the event end
                        if (data.toString() === '\x04') {
                            stream.running = true
                            config.mockRunCommand(this.__user, command.trim(), stream)
                            command = ''
                        }
                    }
                })

                // returns the stream
                resolve(stream)
            }, config.shellOpenTime) // Opens the shell after the thime specified in the config
        })
    }
    return this.shell
}

// Mocks the shell closing
SparkSession.prototype.closeShell = () => {}