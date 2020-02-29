const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    name: String,
    commands: [String],
    owner: String,
    permissions: [String]
})

const model = mongoose.model('Book', schema)

module.exports = {
    schema,
    Book: model
}