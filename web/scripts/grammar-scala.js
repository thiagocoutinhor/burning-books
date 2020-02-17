grammarScala = {
    keyword: [
        'val', 'var', 'for', 'while', 'if', 'else', 'import', 'new', 'null', 'def'
    ],
    string: /s?".*?"/,
    teste: { match: /teste(?=(?:\s|$))/, ignoreCase: true },
    linha: { match: /\n/, lineBreaks: true },
    espaco: { match: /\s+/, lineBreaks: true },
    numero: /\d+[^a-zA-Z]/,
    palavra: /[a-zA-Z&$%#@0-9;]+/,
    commandEnd: /;/
}