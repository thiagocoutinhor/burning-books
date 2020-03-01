const defaultTooltipDelay = { show: 600, hide: 0 }

function init() {
    $('[data-toggle="tooltip"]').tooltip({
        delay: defaultTooltipDelay
    })

    io.on('list', books => {
        montaLista(books)
    })

    io.on('update', () => {
        io.emit('list')
    })
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
    `
    if (book.mine) {
        retorno += `
            <div class="dropdown-menu">
                <a class="dropdown-item" href="#" data-toggle="modal" data-target="#compartilhar-${book._id}">
                    <i class="fa fa-share-alt"></i>
                    Compartilhar
                </a>
                <a class="dropdown-item" href="#" onclick="remover('${book._id}')">
                    <i class="fa fa-trash"></i>
                    Remover
                </a>
            </div>
            <div class="modal fade" id="compartilhar-${book._id}">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h6>Compartilhar</h6>
                        </div>
                        <div class="modal-body text-left">
                            Entre com a lista de compartilhamento separada por ";". Deixe em branco para não compartilhar
                            <input type="text" id="share-list-${book._id}" class="form-control mt-2 w-100" value="${book.sharedWith.join(';')}"/>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="compartilhar('${book._id}')">Compartilhar</button>
                        </div>
                    </div>
                </div>
            </div>
        `.trim()
    } else {
        retorno += `
            <div class="dropdown-menu">
                <a class="dropdown-item" href="#" onclick="meRemover('${book._id}')">
                    <i class="fa fa-share-alt"></i>
                    Parar de ver
                </a>
            </div>
        `
    }
    return retorno
}
function createNewBook() {
    io.emit('create')
}

function edit(id) {
    // TODO fazer algo aqui
}

function compartilhar(id) {
    io.emit('share', {
        book: id,
        with: $(`#share-list-${id}`).val().split(';').map(user => user.trim())
    })
}

function meRemover(id) {
    io.emit('unshare-me', id)
}

function remover(id) {
    io.emit('remove', id)
}