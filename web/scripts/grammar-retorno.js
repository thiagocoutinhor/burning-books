const grammarRetorno = {
    header: /\+[-+]+\+/,
    progress: /\[=*>\s*\(\d+?\s?\/\s?\d+?\)\]/,
    texto: /.+$/,
    error: moo.error
}