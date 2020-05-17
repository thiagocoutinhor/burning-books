const express = require('express')
const router = express.Router()

const loginApi = require('./api/login-api')

router.use(loginApi.accessControlMiddleware)
router.use('/login', loginApi.router)
router.use('/book', require('./api/book-api'))

module.exports = router
