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
        console.debug(`[IO LIST - ${usuario.login}] Criando novo book`)
        Book.defaultNewName(usuario.login).then(nomePadrao => {
            const book = {
                name: nomePadrao,
                commands: [],
                owner: usuario.login
            }
            Book.create(book).then(newBook => {
                socket.emit('created', newBook._id)
                atualizarGrupo()
            })
        })
    })

    socket.on('remove', id => {
        console.debug(`[IO LIST - ${usuario.login}] Removendo book ${id}`)
        Book.findById(id).then(book => {
            if (isMyBook(book)) {
                book.remove().then(() => atualizarGrupo(book.sharedWith))
            } else {
                console.warn(`[IO LIST - ${usuario.login}] Tentativa de remoção indevida do book ${id}`)
            }
        })
    })

    socket.on('share', info => {
        console.debug(`[IO LIST - ${usuario.login}] Compartilhando book ${info.book}`)
        Book.findById(info.book).then(book => {
            if (isMyBook(book)) {
                const inicial = book.sharedWith
                book.sharedWith = info.with
                book.save().then(() => {
                    atualizarGrupo(new Set(inicial.concat(book.sharedWith)))
                })
            } else {
                console.warn(`[IO LIST - ${usuario.login}] Tentativa de remoção indevida do book ${id}`)
            }
        })
    })

    socket.on('unshare-me', id => {
        console.debug(`[IO LIST - ${usuario.login}] Removendo o usuário da lista de compartilhamento do book ${id}`)
        Book.findById(id).then(book => {
            const sharedTreated = book.sharedWith.map(user => user.toLowerCase())
            if (sharedTreated.includes(usuario.login.toLowerCase())) {
                const index = sharedTreated.indexOf(usuario.login.toLowerCase())
                book.sharedWith.splice(index, 1)
                book.save().then(() => atualizarGrupo(book.sharedWith.concat([book.owner])))
            }
        })
    })

    socket.on('disconnect', () => {
        console.debug(`[IO LIST - ${usuario.login}] Disconectou`)
    })

    // Funções auxiliares
    function list() {
        Book.find().byUser(usuario.login).then(books => {
            const retorno = books.sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1)
                .map(book => book.toObject())
                .map(book => {
                    book['mine'] = isMyBook(book)
                    return book
                })
            socket.emit('list', retorno)
        })
    }

    function atualizarGrupo(usuarios) {
        list()
        socket.broadcast.to(usuario.login).emit('update')
        if (usuarios) {
            usuarios.forEach(usuario => {
                socket.broadcast.to(usuario).emit('update')
            });
        }
    }

    function isMyBook(book) {
        return book.owner.toLowerCase() === usuario.login.toLowerCase()
    }
}