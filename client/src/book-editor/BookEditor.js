import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar, Dropdown } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import io from 'socket.io-client'
import { LoadingHome } from '../app/App'

function EditorNavbar(props) {
    const copyAll = () => {
        // TODO something
    }

    return (
        <Navbar variant="dark" className="sticky-top d-flex shadow">
            <Navbar.Brand>
                <Link to="/">
                    <i className="fa fa-chevron-left"></i>
                </Link>
                <span className="ml-1">
                    { props.book.name }
                </span>
            </Navbar.Brand>
            <div className="flex-grow-1"/>
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    <i className="fa fa-ellipsis-v"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu >
                    <Dropdown.Item onClick={copyAll}>
                        <i class="fa fa-clone mr-2"></i>
                        Copy all blocks
                    </Dropdown.Item>
                    <Dropdown.Item href={`/api/book/${props.book._id}/download`} download={`${props.book.name}.scala`}>
                        <i className="fa fa-file-download mr-2"></i>
                        Download
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </Navbar>
    )
}

export function BookEditor(props) {
    const { bookId } = useParams()
    const [loading, setLoading] = useState(true)
    const bookSocketRef = useRef(null)
    const sparkSocketRef = useRef(null)
    const [book, setBook] = useState(null)

    useEffect(() => {
        console.debug('Connecting to book socket')
        bookSocketRef.current = io(`/book?id=${bookId}`)
        const bookSocket = bookSocketRef.current

        bookSocket.on('book', book => {
            setBook(book)
            setLoading(false)
        })

        return () => {
            console.debug('Disconnecting from book socket')
            bookSocket.disconnect()
        }
    }, [bookId])

    return (
        <LoadingHome loading={loading}>
            <EditorNavbar book={book}/>
        </LoadingHome>
    )
}