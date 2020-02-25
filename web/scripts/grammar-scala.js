const grammarScala = {
    keyword: [
        'val', 'var', 'for', 'while', 'if', 'else', 'import', 'new', 'null', 'def'
    ],
    comparation: [
        '==', '>', '<', '<=', '>='
    ],
    operation: [
        '+', '*', '/', '-', '='
    ],
    parenentese: /[()]/,
    ponto: '.',
    string: /s?".*?"/,
    linha: { match: /\n/, lineBreaks: true },
    espaco: { match: /\s+/, lineBreaks: true },
    numero: /\d+[^a-zA-Z)]/,
    palavra: /[a-zA-Z&$%#@0-9:;_]+/,
    commandEnd: /;/,
    error: moo.error
}

function commandToHtml(command) {
    const lexer = moo.compile(grammarScala)
    var html  = '<div>'

    lexer.reset(command)
    while (token = lexer.next()) {
        if (token.type === 'linha') {
            html += '</div><div>'
        } else {
            html += token.value
        }

        if (token.type === 'error') {
            console.error(`Erro de parseamento: ${token.value}`)
        }
    }
    html += '</div>'

    return html.replace(/<div><\/div>/g, '<div><br></div>')
}
