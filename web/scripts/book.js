const book = {
    name: 'Book',
    commands: [
        { command: 'Teste 1' },
        { command: 'Teste 2' },
        { command: 'Teste 3a\nxxx\n\n42' }
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
    console.log(book)

    const commandCards = d3.select('div.commands').selectAll('div.command')
        .data(book.commands)

    // Manutentção de cards já existentes
    commandCards
        .select('div.card-title span.bloco')
        .text((d, i) => `[Bloco ${i}]`)

    commandCards
        .select('div.card-text div.command-text')
        .html(d => commandToHtml(d.command))

    commandCards
        .select('div.recibo')
        .attr('style', d => `display: ${d.return ? 'inherited' : 'none'}`)
        .text(d => d.return)

    // Remoção dos cards
    commandCards.exit().remove()

    // Criação de novos cards
    const newCommand = commandCards.enter()
        .append('div')
        .attr('class', 'm-3 command')

    const newCard = newCommand.append('div')
        .attr('class', 'card')
        .append('div')
        .attr('class', 'card-body')

    const titulo = newCard.append('div')
        .attr('class', 'card-title d-flex justify-content-between')

    titulo.append('span')
        .text((d, i) => `[Bloco ${i}]`)

    titulo.append('button')
        .text('x')
        .attr('onclick', (d, i) => `removeCommand(${i})`)
        .attr('class', 'btn btn-danger button-remove')

    const comandos = newCard.append('div')
        .attr('class', 'card-text')

    comandos.append('div')
        .attr('contenteditable', true)
        .attr('class', (d, i) => `command-text command-${i}`)
        .attr('onkeyup', (d, i) => `editCommand(${i})`)
        .html(d => commandToHtml(d.command))

    newCard.append('div')
        .attr('class', 'buttons text-right mt-2')
        .append('button')
        .attr('class', 'btn btn-primary run-button')
        .text('Run!')

    newCommand.append('div')
        .attr('class', 'mr-4 ml-4 recibo')
        .attr('style', d => `display: ${d.return ? 'inherited' : 'none'}`)
        .text(d => d.return)
}

function running(running) {
    $('.run-button').attr('disabled', running)
}

function newCommand() {
    book.commands.push({
        command: ''
    })
    $('button.new-command').blur()
    montaCards()
}

function removeCommand(index) {
    book.commands.splice(index, 1)
    montaCards()
}

function editCommand(index) {
    console.log($(`.command-${index}`).html())
    book.commands[index].command = htmlToCommand($(`.command-${index}`).html())
    console.log(book.commands[index].command)
}

// TODO Usar o lexer
function commandToHtml(command) {
    const lexer = moo.compile(grammarScala)

    lexer.reset(command)
    while (token = lexer.next()) {
        console.log(token)
    }

    return command
        .replace('\n\n', '\n<br>\n')
        .split('\n')
        .map(linha => `<div>${linha}</div>`)
        .join('')
        .replace(/<div><\/div>/g, '')
}

function htmlToCommand(html) {
    return html.replace(/<div[\/]?>/g, '\n')
        .replace(/<[\/]?.*?>/g, '')
        .trim()
}