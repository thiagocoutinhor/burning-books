module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    console.debug(`[IO LIST - ${usuario.login}] Conectou`)

    // Para receber os broadcasts de listagem do
    socket.join(usuario.login)

    socket.on('disconnect', () => {
        console.debug(`[IO LIST - ${usuario.login}] Disconectou`)
    })
}