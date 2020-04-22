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
                            Logoff
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
    var items = null
    if (props.book.mine) {
    } else {
        items = (
            <>
                <Dropdown.Divider/>
                <Dropdown.Item onClick={ props.removeMe }>
                    <i className="fa fa-share-alt mr-1"></i>
                    Leave shared book
                </Dropdown.Item>
            </>
        )
    }


    return (
        <Dropdown drop="left">
            <Dropdown.Toggle as={SimpleDropdown}>
                <i className="fa fa-ellipsis-v"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item href={`/api/book/${props.book._id}/download`} download={`${props.book.name}.scala`}>
                    <i className="fa fa-file-download mr-1"></i>
                    Download
                </Dropdown.Item>
                { items }
            </Dropdown.Menu>
        </Dropdown>
    )
}

function BookLink(props) {
    return (
        <span>
            <i className="fa fa-edit pr-1"></i>
            { props.book.name }
        </span>
    )
}

function Book(props) {
    return (
        <tr key={props.book._id}>
            <td>
                <BookLink book={props.book}/>
            </td>
            <td>{props.book.owner}</td>
            <td className="text-right">
                <BookOptions book={props.book} removeMe={props.removeMe}/>
            </td>
        </tr>
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
                <tbody>
                    {props.books ? props.books.map(book => <Book key={book._id} book={book} removeMe={props.removeMe}/>) : null}
                </tbody>
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
        this.removeMe = this.removeMe(this)
    }

    componentDidMount() {
        this.socket = io('/list')

        // Handles the book arrival of the book list
        this.socket.on('list', list => {
            this.setState({ books: list })
        })

        // When someone shares a book with the user the user's list must be
        // reloaded if they are logged on
        this.socket.on('update', () => {
            this.socket.emit('list')
        })
    }

    render() {
        return (
            <div>
                <BookListNavbar logoff={this.props.logoff} createNewBook={this.createNewBook} />
                <List books={this.state.books} removeMe={this.removeMe}/>
            </div>
        )
    }

    createNewBook() {
        // TODO something
    }

    removeMe() {
        // TODO something
    }

}