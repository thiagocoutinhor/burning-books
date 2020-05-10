require('dotenv').config() // Loads development configurations
require('./log') // Overrides log functions

// Default promise error handler
process.on('unhandledRejection', error => {
    console.error(error)
})

const express = require('express')
const app = express()
const http = require('http').Server(app)
const sockets = require('./server/router-sockets')
const expressSession = require('express-session')
const MongoStore = require('connect-mongo')(expressSession)
const mongoose = require('mongoose')
const fs = require('fs')
const join = require('path').join

const port = process.env.PORT ? process.env.PORT : 9085

mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    dbName: 'sparkbook'
}).then(() => {
    console.info('Connected to MongoDB')
})

const session = expressSession({
    resave: false,
    saveUninitialized: false,
    secret: 'sparkbook',
    cookie: {
        sameSite: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: 'sessions'
    })
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session)

// API routes
app.use('/api', require('./server/router-api'))

// Web serve
if (process.env.NODE_ENV === 'production') {
    console.info('Production mode')
    app.get('/*', function (req, res) {
        const file = join(__dirname, 'build', req.url)
        if (fs.existsSync(file)) {
            res.sendFile(file)
        } else {
            res.sendFile(join(__dirname, 'build', 'index.html'))
        }
    })
}

sockets(http, session)

http.listen(port, () => {
    console.info(`Listening on port ${port}`)
})
