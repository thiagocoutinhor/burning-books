const express = require('express')
const router = express.Router()

router.use(require('./api/login-api').accessControl)
router.use('/login', require('./api/login-api').router)
router.use('/book', require('./api/book-api'))

module.exports = router
