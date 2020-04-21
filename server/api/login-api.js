const express = require('express')
const moment = require('moment')
const passwordUtils = require('../crypt/password-utils')
const SparkSession = require('../spark-shell/spark-shell').SparkSession
const fileUpload = require('express-fileupload')
const router = express.Router()

const loginType = process.env.LOGIN_TYPE ? process.env.LOGIN_TYPE : 'PASSWORD'

router.use(fileUpload())

router.get('/type', (req, res) => {
    res.send(loginType)
})

router.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.send(req.session.user.login)
    } else {
        res.sendStatus(404)
    }
})

router.post('/', (req, res) => {
    const user = {
        login: req.body.login.trim(),
        lastCheck: moment()
    }

    if (loginType === 'PASSWORD') {
        user.password = passwordUtils.crush(req.body.password.trim())
    } else if (loginType === 'SSH') {
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
            res.redirect('/') // TODO o que fazer aqui?
        })
        .catch(() => {
            console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
            res.redirect('/') // TODO o que fazer aqui??
        })
})

router.delete('/', (req, res) => {
    console.info(`[LOGIN - ${req.session.user.login}] Logoff`)
    req.session.user = undefined
    res.redirect('/') // TODO o que fazer aqui??
})

function checkLogin(login, password) {
    const sparkShell = new SparkSession(login, passwordUtils.uncrush(password))
    return sparkShell.connect()
}

function accessControl(req, res, next) {
    const limiteChecagem = moment().subtract(2, 'minutes')
    const user = req.session.user

    if (!req.session.user) {
        if (req.url.includes('/login')) {
            next()
        } else {
            res.sendStatus(401)
        }
    } else if (moment(user.lastCheck).isBefore(limiteChecagem)) {
        console.info(`[LOGIN - ${user.login}] Verifying login`)
        req.session.user.lastCheck = moment()
        checkLogin(user.login, user.password)
            .then(() => next())
            .catch(() => {
                console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
                req.session.user = undefined
                res.sendStatus(401)
            })
    } else {
        next()
    }
}

module.exports = {
    router,
    accessControl
}