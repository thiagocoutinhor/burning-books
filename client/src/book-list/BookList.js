import React from 'react'
import './BookList.css'
import { Navbar, Tooltip, OverlayTrigger, Dropdown, Table } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'

function newBookTooltip(props) {
    return (
        <Tooltip id="newBookTooltip" {...props}>
            Creates a new book
        </Tooltip>
    )
}

function BookListNavbar(props) {
    return (
        <>
            <Navbar className="sticky-top d-flex shadow">
                <Dropdown as={Navbar.Brand} style={{ color: 'white' }}>
                    <Dropdown.Toggle as={SimpleDropdown}>
                        Burning Books
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={props.logoff}>
                            <i className="fa fa-sign-out-alt"></i>
                            Sair
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <div className="flex-grow-1"/>
                <div>
                    <OverlayTrigger placement="left" overlay={newBookTooltip} delay={{show: 400 }}>
                        <div className="pointer p-1" onClick={props.createNewBook}>
                            <i className="fa fa-plus"></i>
                        </div>
                    </OverlayTrigger>
                </div>
            </Navbar>
        </>
    )
}

function BookOptions(props) {
    return (
        <>
        Banan
        </>
    )
}

function BookLink(props) {
    return (
        <>
            <i class="fa fa-edit pr-1"></i>
            { props.book.name }
        </>
    )
}

function List(props) {
    return (
        <div className="p-3">
            <Table striped  hover size="sm" className="bg-white">
                <thead>
                    <tr>
                        <th style={{ paddingLeft: '24px', width: '70%' }}>Name</th>
                        <th style={{ width: '25%' }}>Owner</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody> {
                    props.books ? props.books.map(book => (
                        <tr>
                            <td>
                                <BookLink book={book}/>
                            </td>
                            <td>{book.owner}</td>
                            <td>
                                <BookOptions book={book}/>
                            </td>
                        </tr>
                    )) : null
                }</tbody>
            </Table>
        </div>
    )
}

export class BookList extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            books: null
        }
        this.createNewBook = this.createNewBook.bind(this)
    }

    componentDidMount() {
        this.socket = io('/list')

        // Handles the book arrival of the book list
        this.socket.on('list', list => {
            this.setState({ books: list })
            console.log(this.state.books)
        })

        // When someone shares a book with the user the user's list must be
        // reloaded if they are logged on
        this.socket.on('update', () => {
            this.socket.emit('list')
        })
    }

    render() {
        return (
            <>
                <BookListNavbar logoff={this.props.logoff} createNewBook={this.createNewBook} />
                <List books={this.state.books}/>
            </>
        )
    }

    createNewBook() {
        // TODO implementar
    }

}