const { SparkSession } = require('./spark-shell')
const { PassThrough } = require('stream')

// Configuração do mock para facil mudança
const config = {
    shellOpenTime: 5 * 1000,
    mockRunCommand: (user, comando, stream) => {
        console.log(`[SPARK MOCK - ${user}] Run recieved\n${comando}`)

        // Monta o contador de progresso
        const progress = (porcentagem, stage) => {
            const maxCaracters = 14
            const caracteres = maxCaracters * porcentagem / 100
            const valores = `(${2000 * porcentagem / 100 } + 0) / 2000`
            const currentStage = `Stage ${stage ? stage : '0'}`
            return `[${currentStage}:${'>'.padStart(caracteres, '=').padEnd(maxCaracters, ' ')}${valores}]`
        }

        // Quantos contadores e em que intervalo enviar
        const stages = [
            { step: 10, progresso: 0 },
            { step: 15, progresso: 0 }
        ]

        // Envia os contadores de progresso a cada segundo
        var finalizado = 0
        stages.forEach((stage, index) => {
            const timer = setInterval(() => {
                stage.progresso += stage.step
                stream.emit('data', progress(stage.progresso, index))
                if (stage.progresso >= 100) {
                    finalizado++
                    clearInterval(timer)
                    if (finalizado == stages.length) {
                        stream.emit('data', comando)
                        stream.emit('data', 'scala>')
                        stream.executando = false
                    }
                }
            }, 1000);
        })
    }
}

// Moca a conexão ssh
SparkSession.prototype.connect = function() {
    console.log(`[SPARK MOCK - ${this.__user}] Iniciando a conexão`)
    return Promise.resolve()
}

// Moca a abertura do shell
SparkSession.prototype.openShell = function() {
    console.log(`[SPARK MOCK - ${this.__user}] Abrindo o shell spark`)
    if (!this.shell) {
        this.shell = new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log(`[SPARK MOCK - ${this.__user}] Shell rodando`)
                const stream = new PassThrough()
                stream.close = () => {}

                // Monta a chamada para cada usuario
                var comando = ''
                stream.on('data', data => {
                    if (!stream.executando) {
                        comando += data.toString()
                            .replace(':paste', '')
                            .replace('\x04', '')

                        // Control+D marca o envio do comando
                        if (data.toString() === '\x04') {
                            stream.executando = true
                            config.mockRunCommand(this.__user, comando.trim(), stream)
                            comando = ''
                        }
                    }
                })

                // Retorna o stream
                resolve(stream)
            }, config.shellOpenTime) // Abre o shell após cinco segundos
        })
    }
    return this.shell
}

// Moca o fechamento do shell
SparkSession.prototype.closeShell = () => {}