import React, { useRef, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Navbar, Dropdown } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { editablePrevent } from './helper'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import { SparkConnectionControl } from './SparkConnectionControl'
import { ConsoleModal } from './ConsoleModal'
import './BookEditorNavbar.css'

////////////////////////////////////////////////////////////////////////////////
// Book Name
////////////////////////////////////////////////////////////////////////////////
BookName.propTypes = {
    socket: PropTypes.object,
    name: PropTypes.string
}
function BookName({ socket, name }) {
    const nameRef = useRef()
    const oldName = useRef(name)

    useEffect(() => {
        nameRef.current.innerText = name
    }, [name])

    const start = () => {
        oldName.current = nameRef.current.innerText
    }

    const changeName = () => {
        const name = nameRef.current.innerText.trim()
        if (name !== '') {
            oldName.current = name
            socket.emit('book.name', name)
        } else {
            nameRef.current.innerText = oldName.current
        }
    }

    return (
        <span ref={nameRef} onKeyDown={editablePrevent} onFocus={start} onBlur={changeName} className="pointer pr-1 pl-1 book-name" contentEditable spellCheck="false">
        </span>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Navbar
///////////////////////////////////////////////////////////////////////////////
EditorNavbar.propTypes = {
    book: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        sparkConfig: PropTypes.exact({
            executors: PropTypes.number,
            cores: PropTypes.number,
            memory: PropTypes.number,
        })
    }),
    copyAll: PropTypes.func,
    socket: PropTypes.object
}
export function EditorNavbar({ book, copyAll, socket }) {
    const [showConsole, setShowConsole] = useState(false)

    const openConsole = () => {
        setShowConsole(true)
    }

    const closeConsole = () => {
        setShowConsole(false)
    }

    return (
        <Navbar variant="dark" className="sticky-top d-flex shadow">
            <Navbar.Brand>
                <Link to="/" className="mr-1">
                    <FontAwesomeIcon icon="chevron-left"/>
                </Link>
                <BookName name={book.name} socket={socket} />
            </Navbar.Brand>
            <div className="flex-grow-1"/>
            <div className="mr-2">
                <SparkConnectionControl config={book.sparkConfig} socket={socket}/>
            </div>
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    <div className="pl-2">
                        <FontAwesomeIcon icon="ellipsis-v"/>
                    </div>
                </Dropdown.Toggle>
                <Dropdown.Menu >
                    <Dropdown.Item onClick={copyAll}>
                        <FontAwesomeIcon icon="clone" className="mr-2"/>
                        Copy all blocks
                    </Dropdown.Item>
                    <Dropdown.Item href={`/api/book/${book._id}/download`} download={`${book.name}.scala`}>
                        <FontAwesomeIcon icon="file-download" className="mr-2" />
                        Download
                    </Dropdown.Item>
                    <Dropdown.Item onClick={openConsole}>
                        <FontAwesomeIcon icon="terminal" className="mr-2" />
                        Console
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
            <ConsoleModal show={showConsole} close={closeConsole} />
        </Navbar>
    )
}