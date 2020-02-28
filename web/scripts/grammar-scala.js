const grammarScala = {
    operacao: /[!@#$%&*-+=/?:><.]/,
    parenentese: /[()]/,
    texto: /s?".*?"/,
    linha: { match: /\n/, lineBreaks: true },
    espaco: { match: /\s+/, lineBreaks: true },
    numero: /\d+[^a-zA-Z)]/,
    palavra: { match: /[a-zA-Z][a-zA-Z0-9_]*/, type: moo.keywords({
        protegida: [
            'val', 'var', 'for', 'while', 'if', 'else', 'import', 'new', 'null', 'def'
        ]
    })},
    fimComando: /;/,
    erro: moo.error
}

function commandToHtml(command) {
    const lexer = moo.compile(grammarScala)
    var html  = '<div>'

    lexer.reset(command)
    Array.from(lexer).forEach(token => {
        if (token.type === 'linha') {
            // Quebras de linha
            html += '</div><div>'
        } else {
            // Todo o resto tem o texto impresso como é
            html += token.text
        }

        // Envia uma mensagem de erro de parsamento nos erros
        // mesmo os imprimindo na tela
        if (token.type === 'erro') {
            console.error(`Erro de parseamento: ${token.text}`)
        }
    })
    html += '</div>'

    return html.replace(/<div><\/div>/g, '<div><br></div>')
}
