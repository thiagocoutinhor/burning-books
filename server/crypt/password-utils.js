const crypto = require('crypto')

// Password cryptografy
const key = crypto.randomBytes(32)
const iv = crypto.randomBytes(16)

function crush(password) {
    const cypher = crypto.createCipheriv('aes-256-ctr', key, iv)
    return Buffer.concat([cypher.update(password), cypher.final()]).toString('hex')
}

function uncrush(password) {
    const decript = crypto.createDecipheriv('aes-256-ctr', key, iv)
    return Buffer.concat([decript.update(Buffer.from(password, 'hex')), decript.final()]).toString()
}

module.exports = {
    crush,
    uncrush
}