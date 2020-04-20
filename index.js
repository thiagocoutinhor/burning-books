require('dotenv').config() // Loads development configurations
require('./log') // Overrides log functions

// Default promise error handler
process.on('unhandledRejection', error => {
    console.error(error)
})

const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const sparkSocket = require('./server/socket/spark-socket')
const listSocket = require('./server/socket/list-socket')
const bookSocket = require('./server/socket/book-socket')
const expressSession = require('express-session')
const ioSession = require('express-socket.io-session')
const MongoStore = require('connect-mongo')(expressSession)
const mongoose = require('mongoose')

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
app.use((req, res, next) => {
    req.io = io
    next()
})

// API routes
app.use('/api', require('./server/router-api'))

// Web serve
if (process.env.NODE_ENV === 'production') {
    app.get('/', (req, res) => res.redirect('index.html'))
    app.get('*', express.static(`${__dirname}/../client/build`, {
        index: false
    }))
}

///////////////////////////////////////////////////////////////////////////////
// Socket configuration
///////////////////////////////////////////////////////////////////////////////

io.use(ioSession(session))
io.on('connect', socket => {
    // Login control
    if (!socket.handshake || !socket.handshake.session || !socket.handshake.session.user) {
        console.warn('No user detected. Sending reload command.')
        socket.emit('reload')
        socket.disconnect()
    }
})

io.of('/spark')
    .use(ioSession(session))
    .on('connect', socket => sparkSocket(socket))

io.of('/list')
    .use(ioSession(session))
    .on('connect', socket => listSocket(socket))

io.of('/book')
    .use(ioSession(session))
    .on('connect', socket => bookSocket(socket))

http.listen(port, () => {
    console.info(`Listening on port ${port}`)
})
