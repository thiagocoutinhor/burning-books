import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Navbar, Tooltip, OverlayTrigger, Dropdown, Table, Modal, Button, FormControl } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'
import { LoadingHome } from '../app/App'
import { Link, useHistory } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

////////////////////////////////////////////////////////////////////////////////
// Tooltip for the new book icon
////////////////////////////////////////////////////////////////////////////////

function newBookTooltip(props) {
    return (
        <Tooltip id="newBookTooltip" {...props}>
            Creates a new book
        </Tooltip>
    )
}

////////////////////////////////////////////////////////////////////////////////
// Navbar
////////////////////////////////////////////////////////////////////////////////

BookListNavbar.propTypes = {
    logoff: PropTypes.func.isRequired,
    createNewBook: PropTypes.func.isRequired
}
function BookListNavbar({ logoff, createNewBook }) {
    return (
        <Navbar variant="dark" className="sticky-top d-flex shadow">
            <Dropdown as={Navbar.Brand}>
                <Dropdown.Toggle as={SimpleDropdown}>
                    Burning Books
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item onClick={logoff}>
                        <FontAwesomeIcon icon="sign-out-alt" className="mr-2"/>
                        Logoff
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
            <div className="flex-grow-1"/>
            <div>
                <OverlayTrigger placement="left" overlay={newBookTooltip} delay={{show: 400 }}>
                    <div className="pointer p-1" onClick={createNewBook}>
                        <FontAwesomeIcon icon="plus" />
                    </div>
                </OverlayTrigger>
            </div>
        </Navbar>
    )
}

////////////////////////////////////////////////////////////////////////////////
// Book options dropdown
////////////////////////////////////////////////////////////////////////////////

BookOptions.propTypes = {
    book: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        mine: PropTypes.bool.isRequired
    }),
    share: PropTypes.func.isRequired,
    removeBook: PropTypes.func.isRequired,
    removeMe: PropTypes.func.isRequired,
}
function BookOptions({ book, share, removeBook, removeMe}) {
    const myBookItems = (
        <>
            <Dropdown.Item onClick={share}>
                <FontAwesomeIcon icon="share-alt" className="mr-2" />
                Share
            </Dropdown.Item>
            <Dropdown.Divider/>
            <Dropdown.Item onClick={removeBook}>
                <FontAwesomeIcon icon="trash" className="mr-2" style={{ color: 'red' }} />
                Delete
            </Dropdown.Item>
        </>
    )

    const sharedBookItems = (
        <>
            <Dropdown.Divider/>
            <Dropdown.Item onClick={removeMe}>
                <FontAwesomeIcon icon="share-alt" className="mr-2" style={{ color: 'red' }} />
                Leave shared book
            </Dropdown.Item>
        </>
    )

    return (
        <Dropdown drop="left">
            <Dropdown.Toggle as={SimpleDropdown}>
                <FontAwesomeIcon icon="cog" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item href={`/api/book/${book._id}/download`} download={`${book.name}.scala`}>
                    <FontAwesomeIcon icon="file-download" className="mr-2"/>
                    Download
                </Dropdown.Item>
                { book.mine ? myBookItems : sharedBookItems }
            </Dropdown.Menu>
        </Dropdown>
    )
}

////////////////////////////////////////////////////////////////////////////////
// Book line on the list table
////////////////////////////////////////////////////////////////////////////////

BookRow.propTypes = {
    book: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        owner: PropTypes.string.isRequired,
        sharedWith: PropTypes.arrayOf(PropTypes.String)
    }).isRequired,
    socket: PropTypes.object.isRequired,
}
function BookRow({ book, socket }) {
    const [modalOpen, setModalOpen] = useState(false)
    const shareRef = useRef()

    const removeMe = () => {
        socket.emit('unshare-me', book._id)
    }

    const removeBook = () => {
        socket.emit('remove', book._id)
    }

    const toggleShareModal = () => {
        setModalOpen(!modalOpen)
    }

    const share = () => {
        socket.emit('share', book._id, shareRef.current.value.split(';'))
        toggleShareModal()
    }

    return (
        <tr key={book._id}>
            <td>
                <Link to={`/book/${book._id}`}>
                    <FontAwesomeIcon icon="edit" className="pr-1" />
                    { book.name }
                </Link>
            </td>
            <td>{book.owner}</td>
            <td className="text-right">
                <BookOptions book={book} removeMe={removeMe} share={toggleShareModal} removeBook={removeBook}/>

                <Modal show={modalOpen} onHide={toggleShareModal} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            Share with
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        List the users to share with, separated with ; or leave empty to share with nobody.
                        <FormControl ref={shareRef} type="input" placeholder="Share me with..." defaultValue={book.sharedWith.join(';')}/>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={share}>
                            Share
                        </Button>
                    </Modal.Footer>
                </Modal>
            </td>
        </tr>
    )
}

////////////////////////////////////////////////////////////////////////////////
// Book list
////////////////////////////////////////////////////////////////////////////////
BookList.propTypes = {
    logoff: PropTypes.func.isRequired
}
export function BookList({ logoff }) {
    const [books, setBooks] = useState(null)
    const [loading, setLoading] = useState(true)
    const socket = useRef(null)
    const history = useHistory()

    useEffect(() => {
        console.debug('Subscribing to the list')
        socket.current = io('/list')

        // Handles the book arrival of the book list
        socket.current.on('list', list => {
            setBooks(list)
            setLoading(false)
        })

        // When someone shares a book with the user the user's list must be
        // reloaded if they are logged on
        socket.current.on('update', () => {
            socket.emit('list')
        })

        socket.current.on('created', bookId => {
            history.push(`/book/${bookId}`)
        })

        // Unsubscribe to the socket when leaving the component
        return () => {
            console.debug('Ubsubscribing to the list')
            socket.current.disconnect()
        }
    }, [history])

    const createNewBook = () => {
        socket.current.emit('create')
    }

    return (
        <LoadingHome loading={loading}>
            <BookListNavbar logoff={logoff} createNewBook={createNewBook} />
            <div className="p-3">
                <Table striped  hover size="sm" className="bg-white">
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '24px'}}>Name</th>
                            <th style={{ width: '150px' }}>Owner</th>
                            <th style={{ width: '2px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        { (books || []).map(book => <BookRow key={book._id} book={book} socket={socket.current} />) }
                    </tbody>
                </Table>
            </div>
        </LoadingHome>
    )
}