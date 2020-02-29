module.exports = socket => {
    const usuario = socket.handshake.session.usuario
    console.debug(`[IO LIST - ${usuario.login}] Conectou`)
}