const Book = require('../book/book-model').Book

module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    const bookId = socket.handshake.query.id

    Book.findById(bookId).then(book => {
        if (!temAcesso(book)) {
            console.warn(`[IO BOOK - ${usuario.login}] Tentativa de acesso indevida ao book ${bookId}`)
            socket.emit('exit')
        }
    })

    console.debug(`[IO BOOK - ${usuario.login}] Conectou no book ${bookId}`)

    socket.on('disconnect', () => {
        console.debug(`[IO BOOK - ${usuario.login}] Disconectou`)
    })

    // Funcoes auxiliares
    function temAcesso(book) {
        return book.owner.toLowerCase() === usuario.login.toLowerCase() ||
            book.sharedWith.map(usr => usr.toLowerCase()).includes(usuario.login)
    }
}