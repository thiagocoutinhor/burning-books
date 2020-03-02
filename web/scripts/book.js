const bookId = location.href.match(/(?<=\/book\/).*(?=\/?)/)[0]
var spark = null
var book = { commands: [] }
var executing = null
var isRunning = true
var bookSocket = null

const defaultTooltipDelay = { show: 600, hide: 0 }

function init() {
    bookSocket = io(`/book?id=${bookId}`)

    // Prepara as tooltips
    $('[data-toggle="tooltip"]').tooltip({ delay: defaultTooltipDelay })

    // Mensagens do book
    bookSocket.on('exit', () => {
        console.debug('Saindo a pedido da api')
        location.href = '/'
    })

    bookSocket.on('book', book => {
        console.debug('Book recebido')
        this.book = book
        montaCards()
    })

    running(true)
    montaCards()
}

function connect() {
    $('.connection-status')
        .removeClass('connected')
        .removeClass('disconnected')
        .addClass('connecting')

    const executors = parseInt($('#executores').val())
    const cores = parseInt($('#nucleos').val())
    const memory = parseInt($('#memoria').val())

    spark = io(`/spark?executors=${executors}&cores=${cores}&memory=${memory}`);

    spark.on('reload', () => {
        console.debug('Recarregando a pedido da api')
        location.reload()
    })

    spark.on('ready', () => {
        console.debug('Console pronto para comandos')
        $('.connection-status')
            .removeClass('disconnected')
            .removeClass('connecting')
            .addClass('connected')

        book.commands.forEach(retorno => retorno.command = '')
        montaCards()

        $('.connection-status .connection-icon').attr('data-toggle', 'dropdown')
        $('.connection-status .connection-icon').dropdown()

        running(false)
    })

    spark.on('connect.error', erro => {
        $('.connection-status')
            .removeClass('connecting')
            .addClass('disconnected')
        console.error(erro)
    })

    spark.on('return.stream', retorno => {
        book.commands[executing].return += retorno
        const html = returnToHtml(book.commands[executing].return)
        $(`.block-${executing} .recibo`).html(html)
        $(`.block-${executing} .recibo`).show()
    })

    spark.on('return.error', (erro) => {
        returnCommand(erro, true)
    })

    spark.on('return', (retorno) => {
        returnCommand(retorno)
    })
}

function disconnect() {
    spark.disconnect()
    spark = null
    running(true)
    $('.connection-status')
        .removeClass('connected')
        .removeClass('connecting')
        .addClass('disconnected')

    $('.connection-status .connection-icon').removeAttr('data-toggle')
    $('.connection-status .connection-icon').dropdown('hide')
    $('.connection-status .connection-icon').dropdown('dispose')
}

function montaCards() {
    const commandCards = d3.select('div.commands').selectAll('div.command-block')
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
        .style('display', d => d.return ? 'inherited' : 'none')
        .html(d => returnToHtml(d.return))

    // Remoção dos cards
    commandCards.exit().remove()

    // Criação de novos cards
    const newCommand = commandCards.enter()
        .append('div')
        .attr('class', (d, i) => `m-3 command-block block-${i}`)

    const newCard = newCommand.append('div')
        .attr('class', 'card')
        .append('div')
        .attr('class', 'card-body')

    const titulo = newCard.append('div')
        .attr('class', 'card-title d-flex justify-content-between')

    titulo.append('span')
        .text((d, i) => `[Bloco ${i}]`)

    titulo.append('div')
        .attr('class', 'btn-group dropleft')
        .html((d, i) => `
            <button type="button" class="btn" data-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu">
                <a class="dropdown-item" href="#" onclick="copyCommand(${i})">
                    <i class="fa fa-clone"></i>
                    Copiar
                </a>
                <a class="dropdown-item" href="#" onclick="removeCommand(${i})">
                    <i class="fa fa-trash"></i>
                    Remover
                </a>
            </div>
        `)

    const comandos = newCard.append('div')
        .attr('class', 'card-text')

    comandos.append('div')
        .attr('contenteditable', true)
        .attr('class', (d, i) => `command-text`)
        .attr('onkeyup', (d, i) => `editCommand(${i}, this, event)`)
        .html(d => commandToHtml(d.command))

    const button = newCard.append('div')
        .attr('class', 'buttons text-right mt-2')
        .append('button')
        .attr('class', 'btn btn-primary run-button')
        .attr('onclick', (d, i) => `runCommand(${i})`)
        .call(botao => {
            $(botao.node()).tooltip({
                delay: defaultTooltipDelay,
                title: 'Executar',
                placement: 'bottom'
            })
        })

    if (isRunning) {
        button.attr('disabled', isRunning)
    }

    button.append('span')
        .attr('class', 'spinner-border spinner-border-sm')
        .attr('role', 'status')

    button.append('span')
        .attr('class', 'run-text')
        .html('<i class="fa fa-play">')

    newCommand.append('div')
        .attr('class', 'mr-4 ml-4 recibo')
        .style('display', d => d.return ? 'inherited' : 'none')
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

function copyCommand(index) {
    const command = `// BLOCK ${index}\n${book.commands[index].command}`.trim()
    navigator.clipboard.writeText(command)
}

function copyAllCommands() {
    const commands = book.commands.map((command, index) => `// BLOCK ${index}\n${book.commands[index].command}`.trim())
    navigator.clipboard.writeText(commands.join('\n\n'))
}

function editCommand(index, div) {
    book.commands[index].command = htmlToCommand($(`.block-${index} .command-text`).html())

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

function htmlToCommand(html) {
    return html.replace(/<div[\/]?>/g, '\n')
        .replace(/<[\/]?.*?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
}

function runCommand(index) {
    $(`.block-${index} .run-button`).tooltip('hide')
    running(true)
    executing = index
    book.commands[index].return = ''
    $(`.block-${index}`).addClass('running')
    spark.emit('run', book.commands[index].command)
    montaCards()
}

function returnCommand(retorno, erro) {
    if (erro) {
        console.error(retorno)
    }
    $(`.block-${executing}`).removeClass('running')
    executing = null
    running(false)
}
