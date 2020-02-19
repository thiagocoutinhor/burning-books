var book = null
var executing = null
var isRunning = true

function init() {
    // Carrega o book atual
    preparabook()

    // Prepara para receber as mensagens do servidor
    io.on('reload', () => {
        console.debug('Recarregando a pedido da api')
        location.reload()
    })

    io.on('spark.ready', () => {
        console.debug('Console pronto para comandos')
        $('div.connection-status')
            .removeClass('connecting')
            .addClass('connected')
        running(false)
    })

    io.on('spark.return.stream', retorno => {
        console.log(retorno)
    })

    io.on('spark.return', (retorno) => {
        returnCommand(retorno)
    })

    io.on('spark.error', (erro) => {
        returnCommand(erro, true)
    })

    running(true)
    io.emit('spark.connect')

    montaCards()
}

function preparabook() {
    const bookString = localStorage.getItem('current-book')
    if (!bookString) {
        book = { commands: [] }
        localStorage.setItem('current-book', JSON.stringify(book))
    } else {
        book = JSON.parse(bookString)
    }

    book.commands.forEach(command => command.return = undefined)

    // Monta processo de salvamento automático do book
    setInterval(() => {
        localStorage.setItem('current-book', JSON.stringify(book))
    }, 1000)
}

function montaCards() {
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
        .html(d => returnToHtml(d.return))

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
        .attr('onkeyup', (d, i) => `editCommand(${i}, this, event)`)
        .html(d => commandToHtml(d.command))

    newCard.append('div')
        .attr('class', 'buttons text-right mt-2')
        .append('button')
        .attr('class', 'btn btn-primary run-button')
        .attr('onclick', (d, i) => `runCommand(${i})`)
        .attr('disabled', isRunning)
        .text('Run!')

    newCommand.append('div')
        .attr('class', 'mr-4 ml-4 recibo')
        .attr('style', d => `display: ${d.return ? 'inherited' : 'none'}`)
        .html(d => returnToHtml(d.return))
}

function running(running) {
    isRunning = running
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

function editCommand(index, div) {
    book.commands[index].command = htmlToCommand($(`.command-${index}`).html())

    // TODO fazer algo aqui para editar o html sem perder a posição do caret
    // const focusNode = document.getSelection().focusNode
    // document.getSelection().focusNode
}

function characterControl(event) {
    if (event.keyCode === 9) {
        event.preventDefault()
        var range = window.getSelection().getRangeAt(0);

        var tabNode = document.createTextNode("\u00a0\u00a0\u00a0\u00a0")
        range.insertNode(tabNode)

        range.setStartAfter(tabNode)
        range.setEndAfter(tabNode)
    }
}

function commandToHtml(command) {
    const lexer = moo.compile(grammarScala)
    var retorno  = '<div>'

    lexer.reset(command)
    while (token = lexer.next()) {
        if (token.type === 'linha') {
            retorno += '</div><div>'
        } else {
            retorno += token.value
        }

        if (token.type === 'error') {
            console.error(`Erro de parseamento: ${token.value}`)
        }
    }
    retorno += '</div>'

    return retorno.replace(/<div><\/div>/g, '<div><br></div>')
}

function returnToHtml(retorno) {
    if (retorno) {
        return retorno
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>')
    }
    return null
}

function htmlToCommand(html) {
    return html.replace(/<div[\/]?>/g, '\n')
        .replace(/<[\/]?.*?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
}

function runCommand(index) {
    running(true)
    executing = index
    io.emit('spark.run', book.commands[index].command)
}

function returnCommand(retorno, erro) {
    if (erro) {
        console.error(retorno)
    }
    book.commands[executing].return = retorno
    executing = null
    running(false)
    montaCards()
}
