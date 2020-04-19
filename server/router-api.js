const express = require('express')
const fileUpload = require('express-fileupload')
const router = express.Router()
const scriptRouter = express.Router()
const cssRouter = express.Router()
const SparkSession = require('./spark-shell/spark-shell').SparkSession
const moment = require('moment')
const passwordUtils = require('./crypt/password-utils')
const Book = require('./models/book-model').Book
const fs = require('fs')

const LOGIN_TYPE = process.env.LOGIN_TYPE ? process.env.LOGIN_TYPE : 'PASSWORD'

scriptRouter.use('/', express.static('./web/scripts'))
scriptRouter.use('/io.js', express.static('./node_modules/socket.io-client/dist/socket.io.slim.js'))
scriptRouter.use('/bootstrap.js', express.static('./node_modules/bootstrap/dist/js/bootstrap.min.js'))
scriptRouter.use('/jquery.js', express.static('./node_modules/jquery/dist/jquery.min.js'))
scriptRouter.use('/d3.js', express.static('./node_modules/d3/dist/d3.min.js'))
scriptRouter.use('/lexer.js', express.static('./node_modules/moo/moo.js'))
scriptRouter.use('/font-awesome.js', express.static('./node_modules/@fortawesome/fontawesome-free/js/all.min.js'))
scriptRouter.use('/popper.js', express.static('./node_modules/popper.js/dist/umd/popper.min.js'))

cssRouter.use('/', express.static('./web/css'))
cssRouter.use('/bootstrap.css', express.static('./node_modules/bootstrap/dist/css/bootstrap.min.css'))

// Login control
router.use((req, res, next) => {
    const limiteChecagem = moment().subtract(2, 'minutes')
    const user = req.session.user

    const isResource = req.url.includes('/css')
        || req.url.includes('/script')
        || req.url === 'favicon.ico'

    if (isResource) {
        next()
    } else if (!req.session.user) {
        if (['/login', '/'].includes(req.url)) {
            next()
        } else {
            res.redirect('/')
        }
    } else if (moment(user.lastCheck).isBefore(limiteChecagem)) {
        console.info(`[LOGIN - ${user.login}] Verifying login`)
        req.session.user.lastCheck = moment()
        checkLogin(user.login, user.password)
            .then(() => {
                next()
            })
            .catch(() => {
                console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
                req.session.user = undefined
                next()
            })
    } else {
        next()
    }
})

// File uploads
router.use(fileUpload())

router.get('/favicon.ico', (req, res) => {
    res.sendFile('./favicon.ico', { root: __dirname})
})
router.use('/script', scriptRouter)
router.use('/css', cssRouter)

router.post('/login', (req, res) => {
    const user = {
        login: req.body.login.trim(),
        lastCheck: moment()
    }

    if (LOGIN_TYPE === 'PASSWORD') {
        user.password = passwordUtils.crush(req.body.password.trim())
    } else if (LOGIN_TYPE === 'SSH') {
        user.password = passwordUtils.crush(req.files.token.data.toString())
    }

    if (process.env.USER_BLACKLIST.toLowerCase().split(',').includes(user.login.toLowerCase())) {
        console.warn(`Blacklisted user access attempt: ${user.login}`)
        res.redirect('/')
        return
    }

    // Test the user acess to the server
    checkLogin(user.login, user.password)
        .then(() => {
            console.info(`[LOGIN - ${user.login}] Login successfull`)
            req.session.user = user
            res.redirect('/')
        })
        .catch(() => {
            console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
            res.redirect('/')
        })
})

router.post('/logoff', (req, res) => {
    console.info(`[LOGIN - ${req.session.user.login}] Logoff`)
    req.session.user = undefined
    res.redirect('/')
})

router.get('/book/:id/download', (req, res) => {
    const user = req.session.user
    Book.findById(req.params.id)
        .then(book => {
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
        })
        .catch(() => {
            console.warn(`[DOWNLOAD - ${user.login}] Inexistent book access ${req.params.id}`)
            res.sendStatus(404)
        })
})

router.get('/book/:id', (req, res) => {
    res.sendFile('book.html', { root: 'web/pages/' })
})

const loginPassword = `
    <div class="password-login">
        <br/>
        <label>Senha:</label>
        <input class="form-control" type="password" name="password"/>
    </div>
`
const loginSsh = `
    <div class="token-login">
        <br/>
        <label>SSH Key:</label>
        <input class="form-control-file" type="file" name="token"/>
    </div>
`
const loginType = LOGIN_TYPE === 'PASSWORD' ? loginPassword : loginSsh

router.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile('book-list.html', { root: 'web/pages/' })
    } else {
        const html = fs.readFileSync('web/pages/login.html')
        const retorno = html.toString().replace('###LOGINTYPE###', loginType)
        res.write(retorno)
        res.end()
    }
})

function checkLogin(login, password) {
    const sparkShell = new SparkSession(login, passwordUtils.uncrush(password))
    return sparkShell.connect()
}

function temAcesso(book, user) {
    return book.owner.toLowerCase() === user.login.toLowerCase() ||
        book.sharedWith.map(usr => usr.toLowerCase()).includes(user.login.toLowerCase())
}

module.exports = router
