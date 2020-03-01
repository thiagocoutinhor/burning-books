const Book = require('../book/book-model').Book

module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    console.debug(`[IO LIST - ${usuario.login}] Conectou`)

    // Para receber os broadcasts
    socket.join(usuario.login)

    // Abre listando todos os books do usuario
    list()

    // Controle de eventos do socket
    socket.on('list', () => list())

    socket.on('create', () => {
        Book.defaultNewName(usuario.login).then(nomePadrao => {
            const book = {
                name: nomePadrao,
                commands: [],
                owner: usuario.login
            }
            Book.create(book).then(() => {
                list()
                socket.broadcast.to(usuario.login).emit('update')
            })
        })
    })

    socket.on('disconnect', () => {
        console.debug(`[IO LIST - ${usuario.login}] Disconectou`)
    })

    // Funções auxiliares
    function list() {
        Book.find().byUser(usuario.login).then(books => {
            socket.emit('list', books)
        })
    }
}