const Book = require('../models/book-model').Book

module.exports = socket => {
    const user = socket.handshake.session.user
    console.debug(`[LIST SOCKET - ${user.login}] Connected`)

    // Recieving user broadcasts
    socket.join(user.login)

    // List all the user's books
    list()

    // Controle de eventos do socket
    socket.on('list', () => list())

    socket.on('create', () => {
        console.debug(`[LIST SOCKET - ${user.login}] Creating a new book`)
        Book.defaultNewName(user.login).then(defaultName => {
            const book = {
                name: defaultName,
                commands: [],
                owner: user.login
            }
            Book.create(book).then(newBook => {
                socket.emit('created', newBook._id)
                updateBroadcast()
            })
        })
    })

    socket.on('remove', id => {
        console.debug(`[LIST SOCKET - ${user.login}] Removing book ${id}`)
        Book.findById(id).then(book => {
            if (isMyBook(book)) {
                book.remove().then(() => updateBroadcast(book.sharedWith))
            } else {
                console.warn(`[LIST SOCKET - ${user.login}] Unauthorized removal attempt ${id}`)
            }
        })
    })

    socket.on('share', (id, sharedWith) => {
        console.debug(`[LIST SOCKET - ${user.login}] Sharing book ${id}`)
        Book.findById(id).then(book => {
            if (isMyBook(book)) {
                const start = book.sharedWith
                book.sharedWith = sharedWith
                book.save().then(() => {
                    updateBroadcast(new Set(start.concat(book.sharedWith)))
                })
            } else {
                console.warn(`[LIST SOCKET - ${user.login}] Unauthorized sharing attempt ${id}`)
            }
        })
    })

    socket.on('unshare-me', id => {
        console.debug(`[LIST SOCKET - ${user.login}] Removed self from the shared book ${id}`)
        Book.findById(id).then(book => {
            const sharedTreated = book.sharedWith.map(user => user.toLowerCase())
            if (sharedTreated.includes(user.login.toLowerCase())) {
                const index = sharedTreated.indexOf(user.login.toLowerCase())
                book.sharedWith.splice(index, 1)
                book.save().then(() => updateBroadcast(book.sharedWith.concat([book.owner])))
            }
        })
    })

    socket.on('disconnect', () => {
        console.debug(`[LIST SOCKET - ${user.login}] Disconnected`)
    })

    ///////////////////////////////////////////////////////////////////////////
    // Helper functions
    ///////////////////////////////////////////////////////////////////////////

    function list() {
        Book.find().byUser(user.login).then(books => {
            const result = books.sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1)
                .map(book => book.toObject())
                .map(book => {
                    book['mine'] = isMyBook(book)
                    return book
                })
            socket.emit('list', result)
        })
    }

    function updateBroadcast(users) {
        list()
        socket.broadcast.to(user.login).emit('update')
        if (users) {
            users.forEach(user => {
                socket.broadcast.to(user).emit('update')
            })
        }
    }

    function isMyBook(book) {
        return book.owner.toLowerCase() === user.login.toLowerCase()
    }
}