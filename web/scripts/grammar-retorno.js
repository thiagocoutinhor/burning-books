const grammarRetorno = {
    linha: { match: /\n/, lineBreaks: true },
    header: /\+[-+]+\+/,
    progress: /\[=*>\s*\(\d+?\s?\/\s?\d+?\)\]/,
    texto: /.+$/,
    error: moo.error
}