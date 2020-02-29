const express = require('express')
const router = express.Router()
const Book = require('./book-model').Book

router.get('/list', (req, res) => {
    const usuario = req.session.usuario

    if (!usuario) {
        res.sendStatus(403)
    } else {
        Book.find({ owner: usuario.login }, (err, lista) => {
            if (err) {
                res.sendStatus(500)
                console.error(err)
            } else {
                res.json(lista)
            }
        })
    }
})

module.exports = router