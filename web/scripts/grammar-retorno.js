const grammarRetorno = {
    linha: { match: /\n/, lineBreaks: true },
    header: /\+[-+]+\+/,
    progress: /\[=*>\s*\(\d+?\s?\/\s?\d+?\)\]/,
    texto: /.+$/,
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
