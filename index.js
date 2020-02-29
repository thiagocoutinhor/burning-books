require('dotenv').config() // Carrega as configurações de ambiente
require('./log') // Substitui as funções base de console por outras mais robustas

// Trata as promessas não tratadas com um print
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
const MongoStore = require('connect-mongo')(expressSession)
const mongoose = require('mongoose');

const port = process.env.PORT

mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'sparkbook',
    auth: {
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD
    }
}).then(() => {
    console.info('Conectado ao mongo')
})

const session = expressSession({
    resave: false,
    saveUninitialized: false,
    secret: 'sparkbook',
    cookie: {
        sameSite: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // Trinta dias de conexão
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: 'sessions'
    })
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session)
app.use((req, res, next) => {
    req.io = io
    next()
})

app.use('/api', require('./api/router-api'))
app.use('/', require('./api/web/router-web'))

io.use(ioSession(session))
io.on('connect', socket => {
    sockets(socket)
})

http.listen(port, () => {
    console.info(`Listening on port ${port}`)
})
