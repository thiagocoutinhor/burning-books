function init() {
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
        .text(d => d.name)

    bookRows.select('td:nth-child(2)')
        .text(d => d.owner)

    bookRows.exit().remove()

    const novaLinha = bookRows.enter().append('tr')

    novaLinha.append('td')
        .text(d => d.name)

    novaLinha.append('td')
        .text(d => d.owner)
}

function createNewBook() {
    io.emit('create')
}