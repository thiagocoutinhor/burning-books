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
            res.redirect('/')
        })
        .catch(() => {
            console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
            res.redirect('/')
        })
})

router.delete('/', (req, res) => {
    if (req.session && req.session.user) {
        console.info(`[LOGIN - ${req.session.user.login}] Logoff`)
        req.session.user = undefined
        res.redirect('/')
    } else {
        console.warn('[LOGIN] Unisgned user trying to logoff')
        res.sendStatus(404)
    }
})

function checkLogin(login, password) {
    const sparkShell = new SparkSession(login, passwordUtils.uncrush(password))
    return sparkShell.connect()
}

function accessControlMiddleware(req, res, next) {
    const user = req.session.user

    if (req.url.includes('/login')) {
        next()
    } else if (!req.session.user) {
        res.sendStatus(401)
    } else {
        accessControl(user)
            .then(hasAccess => {
                if (hasAccess) {
                    next()
                } else {
                    req.session.user = undefined
                    res.sendStatus(401)
                }
            })
            .catch(() => {
                res.sendStatus(500)
            })
    }
}

function accessControl(user) {
    const checkLimit = moment().subtract(2, 'minutes')
    return new Promise(resolve => {
        if (!user.lastCheck || (user.lastCheck && moment(user.lastCheck).isBefore(checkLimit))) {
            console.debug(`[LOGIN - ${user.login}] Verifying login`)
            user.lastCheck = moment()
            checkLogin(user.login, user.password)
                .then(() => {
                    resolve(true)
                })
                .catch(() => {
                    console.warn(`[LOGIN - ${user.login}] Login unsuccessfull`)
                    resolve(false)
                })
        } else {
            resolve(true)
        }
    })
}

module.exports = {
    router,
    accessControlMiddleware,
    accessControl
}