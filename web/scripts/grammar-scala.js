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