const express = require('express')
const Book = require('../models/book-model').Book
const router = express.Router()

router.get('/:id/download', (req, res) => {
    const user = req.session.user
    Book.findById(req.params.id).then(book => {
        if (!temAcesso(book, user)) {
            console.warn(`[DOWNLOAD - ${user.login}] Unauthorized book access attempt ${req.params.id}`)
            res.sendStatus(403)
        }

        const commands = book.commands.map((command, index) => {
            const blockComment = `${'/'.repeat(80)}\n// BLOCK ${index}${command.name ? ' - ' + command.name : ''}\n${'/'.repeat(80)}\n\n`
            return `${blockComment}${command.command}`.trim()
        })

        res.write(commands.join('\n\n'))
        res.end()
    }).catch(() => {
        console.warn(`[DOWNLOAD - ${user.login}] Inexistent book access ${req.params.id}`)
        res.sendStatus(404)
    })
})

function temAcesso(book, user) {
    return book.owner.toLowerCase() === user.login.toLowerCase() ||
        book.sharedWith.map(usr => usr.toLowerCase()).includes(user.login.toLowerCase())
}

module.exports = router