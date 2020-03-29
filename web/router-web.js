const express = require('express')
const router = express.Router()
const scriptRouter = express.Router()
const cssRouter = express.Router()
const SparkSession = require('../api/spark-shell/spark-shell').SparkSession
const moment = require('moment')
const passwordUtils = require('../api/crypt/password-utils')

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

router.use((req, res, next) => {
    const limiteChecagem = moment().subtract(5, "minutes")
    const usuario = req.session.usuario

    if (req.session && req.session.usuario && moment(usuario.lastCheck).isBefore(limiteChecagem)) {
        console.debug(`[LOGIN - ${usuario.login}] Validando login`)
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
            console.debug(`[LOGIN - ${usuario.login}] Login bem sucedido`)
            req.session.usuario = usuario
            res.redirect('/')
        })
        .catch(() => {
            console.info(`[LOGIN - ${usuario.login}] Login falhou`)
            res.redirect('/')
        })
})

router.post('/logoff', (req, res) => {
    req.session.usuario = undefined
    res.redirect('/')
})

router.get('/book/:id', (req, res) => {
    if (req.session.usuario) {
        res.sendFile('book.html', { root: 'web/pages/' })
    } else {
        res.sendFile('login.html', { root: 'web/pages/' })
    }
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

module.exports = router;
