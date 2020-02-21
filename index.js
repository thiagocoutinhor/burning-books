require('dotenv').config() // Carrega as configurações de ambiente
require('./log') // Substitui as funções base de console por outras mais robustas

process.on('unhandledRejection', error => {
    console.error(error);
})

const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const sockets = require('./api/web/spark-socket')
const expressSession = require('express-session')
const ioSession = require('express-socket.io-session')

const port = process.env.PORT

const session = expressSession({
    resave: false,
    saveUninitialized: true,
    secret: 'burning-book',
    cookie: {
        sameSite: true
    }
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session)

app.use((req, res, next) => {
    req.io = io
    next()
})

app.use('/', require('./api/web/router-web'))

io.use(ioSession(session))
io.on('connect', socket => {
    sockets(socket)
})

http.listen(port, () => {
    console.info(`Listening on port ${port}`)
})
