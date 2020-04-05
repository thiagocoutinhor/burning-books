const grammarRetorno = {
    // Controle das tabelas
    tabela: /\+[-+]+\+$/,
    colunas: {
        match: /^\|.*\|$/,
        value: texto => {
            colunas = texto.split('|')
            return colunas.slice(1, colunas.length - 1)
                .map(coluna => coluna.trim())
        }
    },
    // Controle das barras de progresso
    progress: {
        match: /\[Stage \d+:?=*>?\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
        value: texto => {
            // Quebra o stage em id e valor
            const numeros = /\(\d+\s?\+\s?\d+\)\s?\/\s?\d+/.exec(texto)[0]
            const posicao = numeros.split('+')[0].replace('(', '').trim()
            const total = numeros.split('/')[1].trim()
            return {
                id: /Stage \d+/.exec(texto)[0],
                numeros: numeros,
                valor: parseInt(posicao) / parseInt(total) * 100
            }
        }
    },
    // Controle do texto livre
    linha: { match: /\n/, lineBreaks: true },
    espaco: { match: /\s+/, lineBreaks: true },
    numero: /\d+[^a-zA-Z)]/,
    palavra: /[a-zA-Z0-9"'!@#$%&*()-_+=[\]{}^~/?:;.,><|\\]+/,
    error: moo.error
}

function returnToHtml(retorno) {
    if (retorno) {
        const lexer = moo.compile(grammarRetorno)
        const progressos = {} // Garante unicidade das barras de progresso
        var imprimeLinha = true
        var nivelTabela = 0
        var html = ''

        lexer.reset(retorno)
        Array.from(lexer).forEach(token => {
            if (token.type == 'linha') {
                // Quebras de linha em HTML
                if (imprimeLinha) {
                    html += '<br/>'
                }
            } else if (token.type == 'tabela') {
                // Monta as tabelas de dados
                imprimeLinha = false
                nivelTabela++
                if (nivelTabela == 1) {
                    html += '<table class="table table-striped"><thead>'
                } else if (nivelTabela == 2) {
                    html += '</thead><tbody>'
                } else {
                    html += '</tbody></table>'
                    nivelTabela = 0
                    imprimeLinha = true
                }
            } else if(token.type == 'colunas') {
                // Controla as colunas das tabelas
                const td = nivelTabela > 1 ? 'td' : 'th'
                html += '<tr>' + token.value.reduce((acc, coluna) => acc + `<${td}>${coluna}</${td}>`, '') + '</tr>'
            } else if (token.type == 'progress') {
                // Controla as barras de progresso pelo id do stage
                // Como aparecem multiplas vezes cada vez maiores, precisam da
                // variavel de controle
                const progresso = token.value
                progressos[progresso.id] = {
                    valor: progresso.valor,
                    numeros: progresso.numeros
                }
            } else {
                // Todo o restante vira o texto
                html += token.text
            }

            // Envia uma mensagem de erro de parsamento nos erros
            // mesmo os imprimindo na tela
            if (token.type === 'error') {
                console.error(`[RETORNO] Erro de parseamento: ${token.text}`)
            }
        })

        // Acrescenta as barras de progresso no topo
        Object.keys(progressos).forEach(id => {
            const valor = progressos[id].valor
            const numeros = progressos[id].numeros
            html = `
                <div class="progress mb-2">
                    <div class="progress-bar ${valor >= 100 ? 'bg-success' : ''}" style="width: ${valor}%"></div>
                    <div class="position-absolute w-100 pl-1">${id}: ${numeros}</div>
                </div>
            `.trim() + html
        })

        return html
    }
    return null
}
