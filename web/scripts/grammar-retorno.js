const grammarRetorno = {
    // Controle das tabelas
    tabela: /^\+[-+]+\+$/,
    colunas: /^\|.*\|$/,
    // Controle das barras de progresso
    progress: {
        match: /\[Stage \d+:=*>\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
        value: texto => {
            // Quebra o stage em id e valor
            // O valor é calculado pelo próprio formato do texto com um eval
            return {
                id: /Stage \d+/.exec(texto)[0],
                valor: eval(/\(\d+\s?\+\s?\d+\)\s?\/\s?\d+/.exec(texto)[0]) * 100
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
        var html = ''

        lexer.reset(retorno)
        Array.from(lexer).forEach(token => {
            if (token.type == 'linha') {
                // Quebras de linha em HTML
                html += '<br/>'
            } else if (token.type == 'progress') {
                // Controla as barras de progresso pelo id do stage
                // Como aparecem multiplas vezes cada vez maiores, precisam da
                // variavel de controle
                const progresso = token.value
                progressos[progresso.id] = progresso.valor
            } else {
                // Todo o restante vira o texto
                html += token.text
            }

            // Envia uma mensagem de erro de parsamento nos erros
            // mesmo os imprimindo na tela
            if (token.type === 'error') {
                console.error(`Erro de parseamento: ${token.text}`)
            }
        })

        // Acrescenta as barras de progresso no topo
        Object.keys(progressos).forEach(id => {
            const valor = progressos[id]
            html = `<div class="progress mb-2">
                <div class="progress-bar ${valor >= 100 ? 'bg-success' : ''}" style="width: ${valor}%">${id}</div>
            </div>${html}`
        })

        return html
    }
    return null
}
