const Book = require('../models/book-model').Book
// Assures syncrony between sockets due to the save delay
// TODO Blocks horizontal growth. Must reassess
const books = {}

module.exports = socket => {
    const user = socket.handshake.session.user
    const bookId = socket.handshake.query.id

    new Promise((resolve, reject) => {
        if (books[bookId]) {
            books[bookId].count++
            resolve(books[bookId].book)
        } else {
            Book.findById(bookId).then(book => {
                books[bookId] = {
                    book: book,
                    count: 1
                }
                resolve(book)
            }).catch(erro => {
                reject(erro)
            })
        }
    }).then(book => {
        if (!book) {
            console.warn(`[BOOK SOCKET - ${user.login}] Nonexistent book access attempt ${bookId}`)
            socket.emit('exit')
            socket.disconnect()
            return
        }

        if (!temAcesso(book)) {
            console.warn(`[BOOK SOCKET - ${user.login}] Unauthorized book access attempt ${bookId}`)
            socket.emit('exit')
            socket.disconnect()
            return
        }

        console.info(`[BOOK SOCKET - ${user.login}] Connected to book ${bookId}`)
        socket.emit('book', book.toJSON())
        socket.join(bookId)

        socket.on('book.name', title => {
            book.name = title
            book.save().then(book => {
                socket.emit('name', book.name)
                socket.broadcast.to(bookId).emit('name', book.name)
            }).catch(error => {
                console.info(`[BOOK SOCKET - ${user.login}] Error during book rename ${bookId}`, error)
                socket.emit('book.name.error', error)
            })
        })

        socket.on('chunk.new', position => {
            const blankCommand = { command: '' }
            if (position != undefined) {
                book.commands.splice(position, 0, blankCommand)
                console.log(book.commands)
            } else {
                book.commands.push(blankCommand)
            }

            book.save().then(book => {
                socket.emit('book', book)
                socket.broadcast.to(bookId).emit('book', book)
            })
        })

        socket.on('chunk.remove', index => {
            book.commands.splice(index, 1)
            book.save().then(book => {
                socket.emit('book', book)
                socket.broadcast.to(bookId).emit('book', book)
            })
        })

        // Delay without any change before saving
        var saveDelay = null
        socket.on('chunk.update', (index, command) => {
            book.commands[index].command = command

            if (saveDelay) {
                clearTimeout(saveDelay)
            }
            saveDelay = setTimeout(() => {
                console.debug(`[BOOK SOCKET - ${user.login}] Saving book ${book._id}`)
                book.save()
            }, 1 * 1000)

            socket.broadcast.to(bookId).emit('chunk.update', index, command)
        })

        socket.on('chunk.name', (index, name) => {
            book.commands[index].name = name
            book.save()
            socket.broadcast.to(bookId).emit('chunk.name', index, name)
        })

        socket.on('chunk.move', (source, destination) => {
            const comSource = book.commands[source]
            const comDestination = book.commands[destination]
            book.commands[source] = comDestination
            book.commands[destination] = comSource
            book.markModified('commands')
            book.save().then(book => {
                socket.emit('book', book)
                socket.broadcast.to(bookId).emit('book', book)
            })
        })

        socket.on('spark.config', (executors, cores, memory) => {
            book.sparkConfig = {
                executors,
                cores,
                memory
            }
            book.save().then(book => {
                socket.emit('book', book)
                socket.broadcast.to(bookId).emit('book', book)
            })
        })

        socket.on('disconnect', () => {
            console.info(`[BOOK SOCKET - ${user.login}] Disconnected`)
            books[bookId].count--
            if (books[bookId].count === 0) {
                books[bookId] = undefined
            }
        })
    }).catch(() => {
        console.warn(`[BOOK SOCKET - ${user.login}] Nonexistent book access attempt ${bookId}`)
        socket.emit('exit')
        socket.disconnect()
    })

    function temAcesso(book) {
        return book.owner.toLowerCase() === user.login.toLowerCase() ||
            book.sharedWith.map(usr => usr.toLowerCase()).includes(user.login.toLowerCase())
    }
}