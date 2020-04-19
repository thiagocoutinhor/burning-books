const defaultTooltipDelay = { show: 600, hide: 0 }
var socket = null

function init() {
    socket = io('/list');

    $('[data-toggle="tooltip"]').tooltip({
        delay: defaultTooltipDelay
    })

    socket.on('reload', () => {
        console.debug('Recarregando a pedido da api')
        location.reload()
    })

    socket.on('list', books => {
        montaLista(books)
    })

    socket.on('created', id => {
        edit(id)
    })

    socket.on('update', () => {
        socket.emit('list')
    })
}

function logoff() {
    $.post('/logoff').then(() => location.reload())
}

function montaLista(books) {
    const bookRows = d3.select('table.lista tbody')
        .selectAll('tr')
        .data(books)

    bookRows.select('td:nth-child(1)')
        .html(bookEditHtml)

    bookRows.select('td:nth-child(2)')
        .text(d => d.owner)

    bookRows.select('td:nth-child(3)')
        .html(bookOptionsHtml)

    bookRows.exit().remove()

    const novaLinha = bookRows.enter().append('tr')

    novaLinha.append('td')
        .html(bookEditHtml)

    novaLinha.append('td')
        .text(d => d.owner)

    novaLinha.append('td')
        .attr('class', 'text-right dropleft')
        .html(bookOptionsHtml)
}

function bookEditHtml(book) {
    return `
        <span class="pointer text-secondary" onclick="edit('${book._id}')">
            <i class="fa fa-edit"></i>
        </span>
        ${book.name}
    `.trim()
}

function bookOptionsHtml(book) {
    var retorno = `
        <span class="text-secondary pl-3 pointer" data-toggle="dropdown">
            <i class="fa fa-ellipsis-v"></i>
        </span>
        <div class="dropdown-menu">
            <a class="dropdown-item" href="/book/${book._id}/download" download="${book.name}.scala">
                <i class="fa fa-file-download mr-1"></i>
                Baixar .scala
            </a>
    `
    if (book.mine) {
        retorno += `
            <a class="dropdown-item" data-toggle="modal" data-target="#compartilhar" onclick="compartilharScreen('${book._id}', '${book.sharedWith.join(';')}')">
                <i class="fa fa-share-alt mr-1"></i>
                Compartilhar
            </a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" onclick="remover('${book._id}')">
                <i class="fa fa-trash mr-1"></i>
                Remover
            </a>
        `.trim()
    } else {
        retorno += `
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" onclick="meRemover('${book._id}')">
                <i class="fa fa-share-alt mr-1"></i>
                Parar de ver
            </a>
        `
    }
    retorno += '</div>'
    return retorno
}

function createNewBook() {
    socket.emit('create')
}

function edit(id) {
    location.href = `/book/${id}`
}

function compartilharScreen(id, users) {
    $('#share-id').val(id)
    $('#share-list').val(users)
}

function compartilhar() {
    socket.emit('share', {
        book: $('#share-id').val(),
        with: $('#share-list').val().split(';').map(user => user.trim())
    })
}

function meRemover(id) {
    socket.emit('unshare-me', id)
}

function remover(id) {
    socket.emit('remove', id)
}