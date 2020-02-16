const express = require('express')
const router = express.Router()
const scriptRouter = express.Router()
const cssRouter = express.Router()
const join = require('path').join
const SparkSession = require('../api/spark-shell/spark-shell').SparkSession

scriptRouter.use('/', express.static('./web/scripts'))
scriptRouter.use('/io.js', express.static('./node_modules/socket.io-client/dist/socket.io.slim.js'))
scriptRouter.use('/bootstrap.js', express.static('./node_modules/bootstrap/dist/js/bootstrap.min.js'))
scriptRouter.use('/jquery.js', express.static('./node_modules/jquery/dist/jquery.min.js'))
scriptRouter.use('/d3.js', express.static('./node_modules/d3/dist/d3.min.js'))
scriptRouter.use('/lexer.js', express.static('./node_modules/moo/moo.js'))

cssRouter.use('/', express.static('./web/css'))
cssRouter.use('/bootstrap.css', express.static('./node_modules/bootstrap/dist/css/bootstrap.min.css'))

router.use('/script', scriptRouter)
router.use('/css', cssRouter)

router.post('/login', (req, res) => {
    const usuario = {
        login: req.body.login,
        senha: req.body.senha
    }

    // Testa a conexão antes de seguir adiante
    const sparkShell = new SparkSession(usuario.login.trim(), usuario.senha.trim())
    sparkShell.ssh.connect()
        .then(() => {
            console.debug(`[LOGIN - ${usuario.login}] Login bem sucedido`)
            // sparkShell.ssh.close()
            req.session.usuario = usuario
            res.redirect('/')
        })
        .catch(erro => {
            console.info(`[LOGIN - ${usuario.login}] Login falhou`)
            res.redirect('/')
        })
})

router.get('/', (req, res) => {
    if (req.session.usuario) {
        res.sendFile(join(__dirname, '/pages/book.html'))
    } else {
        res.sendFile(join(__dirname, '/pages/login.html'))
    }
})

module.exports = router;
