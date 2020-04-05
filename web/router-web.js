const express = require('express')
const router = express.Router()
const scriptRouter = express.Router()
const cssRouter = express.Router()
const SparkSession = require('../api/spark-shell/spark-shell').SparkSession
const moment = require('moment')
const passwordUtils = require('../api/crypt/password-utils')
const Book = require('../api/book/book-model').Book

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

// Controle de acesso
router.use((req, res, next) => {
    const limiteChecagem = moment().subtract(2, "minutes")
    const usuario = req.session.usuario

    const isResource = req.url.includes('/css')
        || req.url.includes('/script')
        || req.url === 'favicon.ico'

    if (isResource) {
        next()
    } else if (!req.session.usuario) {
        if (['/login', '/'].includes(req.url)) {
            next()
        } else {
            res.redirect('/')
        }
    } else if (moment(usuario.lastCheck).isBefore(limiteChecagem)) {
        console.info(`[LOGIN - ${usuario.login}] Validando login`)
        req.session.usuario.lastCheck = moment()
        checkLogin(usuario.login, usuario.senha)
            .then(() => {
                next()
            })
            .catch(() => {
                console.warn(`[LOGIN - ${usuario.login}] Validação de login mal sucedida`)
                req.session.usuario = undefined
                next()
            })
    } else {
        next()
    }
})

router.get('/favicon.ico', (req, res) => {
    res.sendFile('./favicon.ico', { root: __dirname})
})
router.use('/script', scriptRouter)
router.use('/css', cssRouter)

router.post('/login', (req, res) => {
    const usuario = {
        login: req.body.login.trim(),
        senha: passwordUtils.crush(req.body.senha.trim()),
        lastCheck: moment()
    }

    if (process.env.USER_BLACKLIST.toLowerCase().split(',').includes(usuario.login.toLowerCase())) {
        console.warn(`Usuário restrito tentou acessar o sistema: ${usuario.login}`)
        res.redirect('/')
        return
    }

    // Testa a conexão antes de seguir adiante
    checkLogin(usuario.login, usuario.senha)
        .then(() => {
            console.info(`[LOGIN - ${usuario.login}] Login bem sucedido`)
            req.session.usuario = usuario
            res.redirect('/')
        })
        .catch(() => {
            console.warn(`[LOGIN - ${usuario.login}] Login falhou`)
            res.redirect('/')
        })
})

router.post('/logoff', (req, res) => {
    req.session.usuario = undefined
    res.redirect('/')
    console.info(`[LOGIN - ${usuario.login}] Logoff`)
})

router.get('/book/:id/download', (req, res) => {
    const usuario = req.session.usuario
    Book.findById(req.params.id)
        .then(book => {
            if (!temAcesso(book, usuario)) {
                console.warn(`[DOWNLOAD - ${usuario.login}] Tentativa de acesso indevida ao book ${bookId}`)
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
            console.warn(`[DOWNLOAD - ${usuario.login}] Tentativa de acesso a um book que não existe ${req.params.id}`)
            res.sendStatus(404)
        })
})

router.get('/book/:id', (req, res) => {
    res.sendFile('book.html', { root: 'web/pages/' })
})

router.get('/', (req, res) => {
    if (req.session.usuario) {
        res.sendFile('book-list.html', { root: 'web/pages/' })
    } else {
        res.sendFile('login.html', { root: 'web/pages/' })
    }
})

function checkLogin(login, senha) {
    const sparkShell = new SparkSession(login, passwordUtils.uncrush(senha))
    return sparkShell.connect()
}

function temAcesso(book, usuario) {
    return book.owner.toLowerCase() === usuario.login.toLowerCase() ||
        book.sharedWith.map(usr => usr.toLowerCase()).includes(usuario.login.toLowerCase())
}

module.exports = router;
