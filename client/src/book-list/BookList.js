import React, { useState, useEffect, useRef } from 'react'
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
    const myBookItems = (
        <>
            <Dropdown.Item onClick={props.share}>
                <i className="fa fa-share-alt mr-1"></i>
                Share
            </Dropdown.Item>
            <Dropdown.Divider/>
            <Dropdown.Item onClick={props.removeBook}>
                <i className="fa fa-trash mr-1"></i>
                Delete
            </Dropdown.Item>
        </>
    )

    const sharedBookItems = (
        <>
            <Dropdown.Divider/>
            <Dropdown.Item onClick={props.removeMe}>
                <i className="fa fa-share-alt mr-1"></i>
                Leave shared book
            </Dropdown.Item>
        </>
    )

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
                { props.book.mine ? myBookItems : sharedBookItems }
            </Dropdown.Menu>
        </Dropdown>
    )
}

function Book(props) {
    const removeMe = () => {
        // TODO something
    }

    const removeBook = () => {
        console.log('teste')
        props.socket.emit('remove', props.book._id)
        // TODO something
    }

    const share = () => {
        // TODO something
    }

    return (
        <tr key={props.book._id}>
            <td>
                <i className="fa fa-edit pr-1"></i>
                { props.book.name }
            </td>
            <td>{props.book.owner}</td>
            <td className="text-right">
                <BookOptions book={props.book} removeMe={removeMe} share={share} removeBook={removeBook}/>
            </td>
        </tr>
    )
}

export function BookList(props) {
    const [books, setBooks] = useState(null)
    const socket = useRef(null)

    useEffect(() => {
        console.debug('Subscribing to the list')
        socket.current = io('/list')

        // Handles the book arrival of the book list
        socket.current.on('list', list => {
            setBooks(list)
        })

        // When someone shares a book with the user the user's list must be
        // reloaded if they are logged on
        socket.current.on('update', () => {
            socket.emit('list')
        })

        return () => {
            console.debug('Ubsubscribing to the list')
            socket.current.disconnect()
        }
    }, [])

    const createNewBook = () => {
        socket.current.emit('create')
    }

    return (
        <div>
            <BookListNavbar logoff={props.logoff} createNewBook={createNewBook} />
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
                        { books ? books.map(book => <Book key={book._id} book={book} socket={socket.current} />) : null }
                    </tbody>
                </Table>
            </div>
        </div>
    )
}