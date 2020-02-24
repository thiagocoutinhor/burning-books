const { SparkSession } = require('./spark-shell')
const { PassThrough } = require('stream')

// Configuração do mock para facil mudança
const config = {
    shellOpenTime: 1 * 1000,
    mockRunCommand: (user, comando, stream) => {
        console.log(`[SPARK MOCK - ${user}] Recieved\n${comando}`)
        
        const progress = porcentagem => {
            const maxCaracters = 14
            const caracteres = maxCaracters * porcentagem / 100
            return `[${'>'.padStart(caracteres, '=').padEnd(maxCaracters, ' ')}()]`
            
        }

        var progresso = 0
        const timer = setInterval(() => {
            console.log('teste')
            progresso += 10
            if (progresso >= 100) {
                clearInterval(timer)
                stream.emit('data', 'scala>')
            } else {
                stream.emit('data', progress(progresso))
            }
        }, 1000);        
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
                const retorno = new PassThrough()
                retorno.close = () => {}

                // Monta a chamada para cada usuario
                var comando = ''
                retorno.on('data', data => {
                    comando += data.toString()
                        .replace(':paste', '')
                        .replace('\x04', '')
                    if (data.toString() === '\x04') {
                        config.mockRunCommand(this.__user, comando.trim(), retorno)
                        comando = ''    
                    }
                })
                
                // Retorna o stream
                resolve(retorno)
            }, config.shellOpenTime) // Abre o shell após cinco segundos
        })
    }
    return this.shell
}

// Moca o fechamento do shell
SparkSession.prototype.closeShell = () => {}