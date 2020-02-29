const express = require('express')
const router = express.Router()

router.use('/book', require('./book/book-api'))

module.exports = router