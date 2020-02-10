const book = {
    name: 'Book',
    commands: [
        { command: 'Teste 1' }
    ]
}

function init() {
    io.on('reload', function () {
        console.debug('Recarregando a pedido da api')
        location.reload()
    })

    io.on('spark.ready', function () {
        console.debug('Console pronto para comandos')
    })

    montaCards()
    running(false)
    // io.emit('spark.connect')
}

function montaCards() {
    const commandCards = d3.select('div.commands').selectAll('div.command')
        .data(book.commands)

    // Manutentção de cards já existentes
    commandCards
        .select('div.card-title')
        .text((d, i) => `[Bloco ${i}]`)

    commandCards
        .select('div.card-text')
        .text(d => d.command)

    commandCards
        .select('div.recibo')
        .attr('style', d => `display: ${d.return ? 'inherited' : 'none'}`)
        .text(d => d.return)

    // Criação de novos cards
    const newCommand = commandCards.enter()
        .append('div')
        .attr('class', 'm-3 command')

    const newCard = newCommand.append('div')
        .attr('class', 'card')
        .append('div')
        .attr('class', 'card-body')

    newCard.append('div')
        .attr('class', 'card-title')
        .text((d, i) => `[Bloco ${i}]`)

    newCard.append('div')
        .attr('class', 'card-text')
        .attr('contenteditable', true)
        .text(d => d.command)

    newCard.append('div')
        .attr('class', 'buttons text-right')
        .append('button')
        .attr('class', 'btn btn-primary run-button')
        .text('Run!')

    newCommand.append('div')
        .attr('class', 'mr-4 ml-4 recibo')
        .attr('style', d => `display: ${d.return ? 'inherited' : 'none'}`)
        .text(d => d.return)

    // Remoção dos cards
    commandCards.exit().remove()
}

function running(running) {
    $('.run-button').attr('disabled', running)
}

function newCommand() {
    book.commands.push({
        command: ""
    })
    $('button.new-command').blur()
    montaCards()
}