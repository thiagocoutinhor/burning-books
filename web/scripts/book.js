const bookId = location.href.match(new RegExp('\/book\/.*\/?'))[0].replace('/book/', '').replace('/', '')
var spark = null
var book = { commands: [] }
var executing = null
var executeTo = null
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

    bookSocket.on('name', title => {
        book.name = title
        $('.navbar .titulo').text(title)
        $('#titulo').val(title)
    })

    bookSocket.on('name.error', err => {
        console.error('Erro durante renomeação', err)
        var mensagem = err.errmsg
        if (err.code = 11000) {
            mensagem = `Você já tem um book com esse nome (${err.keyValue.name})`
        }
        erro(mensagem)
    })

    bookSocket.on('book', book => {
        console.debug('Book recebido')
        this.book = book
        $('#downloadScala')
            .attr('href', `/book/${book._id}/download`)
            .attr('download', `${book.name}.scala`)
        if (book.sparkConfig) {
            $('#executores').val(book.sparkConfig.executors)
            $('#nucleos').val(book.sparkConfig.cores)
            $('#memoria').val(book.sparkConfig.memory)
        }
        $('.navbar .titulo').text(book.name)
        $('#titulo').val(book.name)
        montaCards()
    })

    bookSocket.on('update', (index, command) => {
        book.commands[index].command = command
        $(`.block-${index} .command-text`).html(commandToHtml(command))
    })

    bookSocket.on('chunk.move', (source, destination) => {
        const comSource = book.commands[source]
        const comDestination = book.commands[destination]
        book.commands[source] = comDestination
        book.commands[destination] = comSource
    })

    bookSocket.on('chunk.name', (index, name) => {
        book.commands[index].name = name
        $(`.block-${index} bloco`).text(`[Bloco ${index}] ${name ? name : ''}`)
    })

    running(true)
    montaCards()
}

function voltar() {
    location.href = '/'
}

function mudarTitulo() {
    const titulo = $('#titulo').val()
    book.name = titulo
    $('#downloadScala').attr('download', `${book.name}.scala`)
    bookSocket.emit('name', titulo)
}

function changeConfig() {
    const executors = $('#executores').val()
    const cores = $('#nucleos').val()
    const memory = $('#memoria').val()
    bookSocket.emit('spark.config', executors, cores, memory)
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
        $(`.block-${executing} .recibo`).removeClass('d-none')
    })

    spark.on('return.error', (erro) => {
        returnCommand(erro, true)
    })

    spark.on('return', (retorno) => {
        returnCommand(retorno)
    })
}

function disconnect() {
    if (executing) {
        returnCommand("Disconnected", true)
    }

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

function copyAllCommands() {
    const commands = book.commands.map((command, index) => `${getBlockComment(index)}${command.command}`.trim())
    doCopy(commands.join('\n\n'))
}

function montaCards() {
    const commandCards = d3.select('div.commands').selectAll('div.command-block')
        .data(book.commands)

    // Manutentção de cards já existentes
    commandCards
        .attr('class', (d, i) => `m-3 command-block block-${i} ${d.status ? d.status : ''}`)

    commandCards
        .select('div.card-title span.bloco')
        .text((d, i) => `[Bloco ${i}] ${d.name ? d.name : ''}`)

    commandCards
        .select('div.card-text div.command-text')
        .html(d => commandToHtml(d.command))

    commandCards
        .select('div.recibo')
        .attr('class', d => `mr-4 ml-4 recibo ${d.return ? '' : 'd-none'}`)
        .html(d => returnToHtml(d.return))

    // Remoção dos cards
    commandCards.exit().remove()

    // Criação de novos cards
    const newCommand = commandCards.enter()
        .append('div')
        .attr('class', (d, i) => `m-3 command-block block-${i} ${d.status ? d.status : ''}`)

    const newCard = newCommand.append('div')
        .attr('class', 'card')
        .append('div')
        .attr('class', 'card-body')

    const titulo = newCard.append('div')
        .attr('class', 'card-title d-flex')

    titulo.append('span')
        .attr('class', 'bloco pointer')
        .attr("data-toggle", "modal")
        .attr("data-target", "#nomeia-chunk")
        .attr("onclick", (d, i) => `preparaNomeacao(${i})`)
        .text((d, i) => `[Bloco ${i}] ${d.name ? d.name : ''}`)

    titulo.append('span')
        .attr('class', 'flex-grow-1')

    titulo.append('div')
        .attr('class', 'd-flex flex-column ordem')
        .html((d, i) => `
            <div class="pointer" style="width: 15px;" onclick="moveUp(${i})">
                <i class="fa fa-angle-up"></i>
            </div>
            <div class="pointer" style="width: 15px;" onclick="moveDown(${i})">
                <i class="fa fa-angle-down"></i>
            </div>
        `)

    titulo.append('div')
        .attr('class', 'dropleft')
        .html((d, i) => `
            <div class="pointer p-2" data-toggle="dropdown" style="font-size: 120%">
                <i class="fas fa-ellipsis-v"></i>
            </div>
            <div class="dropdown-menu">
                <a class="dropdown-item" onclick="copyCommand(${i})">
                    <i class="fa fa-clone"></i>
                    Copiar
                </a>
                <a class="dropdown-item rodar-ate ${isRunning ? 'disabled' : ''}" onclick="runAllTo(${i})">
                    <i class="fa fa-play"></i>
                    Rodar todos acima
                </a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" onclick="removeCommand(${i})">
                    <i class="fa fa-trash"></i>
                    Remover
                </a>
            </div>
        `)

    const comandos = newCard.append('div')
        .attr('class', 'card-text')

    comandos.append('div')
        .attr('contenteditable', true)
        .attr('class', 'command-text')
        .attr('onkeydown', (d, i) => `characterControl(event, ${i})`)
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
        .attr('class', d => `mr-4 ml-4 recibo ${d.return ? '' : 'd-none'}`)
        .html(d => returnToHtml(d.return))
}

function running(running) {
    isRunning = running
    if (running) {
        $('.rodar-ate').addClass('disabled')
    } else {
        $('.rodar-ate').removeClass('disabled')
    }
    $('.run-button').attr('disabled', running)
}

function preparaNomeacao(index) {
    $('#nomeia-chunk #cod-chunk').val(index)
    $('#nomeia-chunk #name').val(book.commands[index].name)
}

function mudarChunk() {
    const id = $('#nomeia-chunk #cod-chunk').val()
    const name = $('#nomeia-chunk #name').val()
    book.commands[id].name = name.trim().length > 0 ? name.trim() : undefined
    bookSocket.emit('chunk.name', id, name)
    montaCards()
}

function moveUp(index) {
    if (index > 0) {
        const previousCommand = book.commands[index - 1]
        const command = book.commands[index]
        book.commands[index - 1] = command
        book.commands[index] = previousCommand
        montaCards()
        bookSocket.emit('chunk.move', index, index - 1)
    }
}

function moveDown(index) {
    if (index < book.commands.length-1) {
        const command = book.commands[index]
        const nextCommand = book.commands[index + 1]
        book.commands[index] = nextCommand
        book.commands[index + 1] = command
        montaCards()
        bookSocket.emit('chunk.move', index, index + 1)
    }
}

function getBlockComment(index) {
    return `${'/'.repeat(80)}\n// BLOCK ${index}${book.commands[index].name ? ' - ' + book.commands[index].name : ''}\n${'/'.repeat(80)}\n\n`
}

function copyCommand(index) {
    const command = `${getBlockComment(index)}${book.commands[index].command}`.trim()
    doCopy(command)
}

function doCopy(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
    } else {
        const textarea = $(`<textarea>${text}</textarea>`)
        $('body').append(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
    }
}

function newCommand() {
    book.commands.push({
        command: ''
    })
    $('button.new-command').blur()
    montaCards()
    bookSocket.emit('new')
}

function removeCommand(index) {
    book.commands.splice(index, 1)
    montaCards()
    bookSocket.emit('remove', index)
}

function editCommand(index, div) {
    const command = htmlToCommand($(`.block-${index} .command-text`).html())
    book.commands[index].command = command
    bookSocket.emit('update', index, command)

    // TODO fazer algo aqui para editar o html sem perder a posição do caret
    // const focusNode = document.getSelection().focusNode
    // document.getSelection().focusNode
}

function characterControl(event, index) {
    if (event.keyCode === 9) {
        event.preventDefault()
        var range = window.getSelection().getRangeAt(0);
        var tabNode = document.createTextNode('\t')
        range.insertNode(tabNode)

        range.setStartAfter(tabNode)
        range.setEndAfter(tabNode)
    } else if (event.keyCode === 13 && !isRunning) {
        if (event.ctrlKey) {
            runCommand(index)
        }
    }
}

function htmlToCommand(html) {
    return html.replace(/<div[\/]?>/g, '\n')
        .replace(/<[\/]?.*?>/g, '')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
}

function runCommand(index) {
    $(`.block-${index} .run-button`).tooltip('hide')
    running(true)
    executing = index
    book.commands[index].return = ''
    book.commands[index].status = 'running'
    spark.emit('run', book.commands[index].command)
    montaCards()
    $('.ordem').addClass('d-none').removeClass('d-flex')
}

function jumpToReceipt(index) {
    $(`.block-${index} .recibo`).removeClass('d-none')
    console.log('Recibo > ', $(`.block-${index} .recibo`).offset().top)
    console.log('Navbar > ', $('.navbar').outerHeight())
    $('body').scrollTop($(`.block-${index} .recibo`).offset().top - $('.navbar').outerHeight() - 20)
}

function runAllTo(index) {
    if (index > 0 && !isRunning) {
        executeTo = index - 1
        jumpToReceipt(0)
        runCommand(0)
    }
}

function returnCommand(retorno, erro) {
    if (erro) {
        console.error(retorno)
    }

    book.commands[executing].status = 'done'

    $(`.block-${executing}`).removeClass('running').addClass('done')

    if (executing < executeTo) {
        jumpToReceipt(executing + 1)
        runCommand(executing + 1)
    } else {
        executeTo = null
        executing = null
        running(false)
        $('.ordem').addClass('d-flex').removeClass('d-none')
    }
}

function erro(mensagem) {
    const html = $(`
        <div class="alert alert-danger fixed-top alert-dismissable mr-4 ml-4 mt-2" role="alert">
            <span class="mensagem">
                ${mensagem}
            </span>
            <button class="close" data-dismiss="alert">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `)

    $('body').append(html)

    setTimeout(() => html.remove(), 10 * 1000)
}