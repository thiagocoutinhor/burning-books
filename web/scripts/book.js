function init() {
    io.on('reload', function () {
        console.debug('Recarregando a pedido da api')
        location.reload()
    })

    io.on('spark.ready', function () {
        console.debug('Console pronto para comandos')
    })

    // io.emit('spark.connect')
}