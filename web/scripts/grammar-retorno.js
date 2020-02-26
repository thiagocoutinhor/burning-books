const grammarRetorno = {
    tabela: /^\+[-+]+\+$/,
    colunas: /^|.*|$/,
    progress: /\[Stage \d+:=*>\s*\(\d+\s\+\s\d+\)\s?\/\s?\d+\]/,
    linha: { match: /\n/, lineBreaks: true },
    espaco: { match: /\s+/, lineBreaks: true },
    numero: /\d+[^a-zA-Z)]/,
    palavra: /[a-zA-Z0-9"'!@#$%&*()-_+=[\]{}^~/?:;.,><|\\]+/,
    error: moo.error
}

function returnToHtml(retorno) {
    if (retorno) {
        const lexer = moo.compile(grammarRetorno)
        var html = ''

        lexer.reset(retorno)
        while (token = lexer.next()) {
            if (token.type == 'linha') {
                html += '<br/>'
            } else {
                html += token.value
            }
            console.log(token)
        }

        return html
    }
    return null
}
