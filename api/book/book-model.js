const mongoose = require('mongoose')
const newName = 'Novo Book'

const schema = new mongoose.Schema({
    name: { type: String, required: true },
    commands: [{
        name: String,
        command: String
    }],
    owner: { type: String, required: true },
    sharedWith: [String]
})

schema.index({
    name: 1,
    owner: 1
}, { unique: true })

// Monta o nome padrão do novo book
schema.statics.defaultNewName = function(login) {
    return this.find()
        .byUser(login)
        .where({name: { $regex: new RegExp(newName) }})
        .exec()
        .then(books => {
            const lista = books.map(book => book.name)
            var numero = null
            while (lista.includes(`${newName}${numero ? `(${numero})` : ''}`)) {
                numero++
            }
            return `${newName}${numero ? `(${numero})` : ''}`
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