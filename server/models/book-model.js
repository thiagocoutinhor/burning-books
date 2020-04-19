const mongoose = require('mongoose')
const newName = 'New Book'

const schema = new mongoose.Schema({
    name: { type: String, required: true },
    commands: [{
        name: String,
        command: String
    }],
    owner: { type: String, required: true },
    sharedWith: [String],
    sparkConfig: {
        executors: Number,
        cores: Number,
        memory: Number
    }
})

schema.index({
    name: 1,
    owner: 1
}, { unique: true })

// Creates the default name for a new book
schema.statics.defaultNewName = function(login) {
    return this.find()
        .byUser(login)
        .where({name: { $regex: new RegExp(newName) }})
        .exec()
        .then(books => {
            const list = books.map(book => book.name)
            let number = null
            while (list.includes(`${newName}${number ? `(${number})` : ''}`)) {
                number++
            }
            return `${newName}${number ? `(${number})` : ''}`
        })
}

schema.query.byUser = function(login) {
    return this.where({$or: [{ owner: new RegExp(login, 'i') }, { sharedWith: new RegExp(login, 'i') }]})
}

const model = mongoose.model('Book', schema)

module.exports = {
    schema,
    Book: model
}