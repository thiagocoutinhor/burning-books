import React, { useContext, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Navbar, Dropdown, Button, Form, InputGroup } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SparkContext } from './BookEditor'
import { editablePrevent } from './helper'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'
import './BookEditorNavbar.css'

///////////////////////////////////////////////////////////////////////////////
// Connection widget
///////////////////////////////////////////////////////////////////////////////
ConnectionControl.propTypes = {
    config: PropTypes.exact({
        executors: PropTypes.number,
        cores: PropTypes.number,
        memory: PropTypes.number,
    }),
    socket: PropTypes.object
}
function ConnectionControl({ config, socket }) {
    const spark = useContext(SparkContext)
    const executors = useRef()
    const cores = useRef()
    const memory = useRef()

    useEffect(() => {
        if (config) {
            executors.current.value = config.executors
            cores.current.value = config.cores
            memory.current.value = config.memory
        }
    }, [config])

    const connect = () => {
        spark.connect(executors.current.value, cores.current.value, memory.current.value)
    }

    const changeConfig = () => {
        socket.emit('spark.config', executors.current.value, cores.current.value, memory.current.value)
    }

    const controls = [
        { name: 'Executors', ref: executors },
        { name: 'Cores', ref: cores },
        { name: 'Memory', ref: memory }
    ]

    return (
        <Form as="div" inline className={`p-2 connection-control ${spark.status.class}`}>
            { spark.status.showControls ? controls.map((control, index) => (
                <InputGroup size="sm" className="mr-2" key={index}>
                    <InputGroup.Prepend>
                        <InputGroup.Text>{control.name}</InputGroup.Text>
                    </InputGroup.Prepend>
                    <Form.Control ref={control.ref} onChange={changeConfig} type="number" defaultValue="2" className="text-center" min="1" style={{ width: '4em' }}></Form.Control>
                </InputGroup>
            )).concat((
                <Button size="sm" className="mr-2" onClick={connect} key="connectButton">Connect</Button>
            )) : null }
            { spark.runningNow != null ? (
                <div className="mr-2">
                    <FontAwesomeIcon icon="spinner" className="mr-2 text-primary rotate" />
                    Running Chunk { spark.runningNow }
                </div>
            ) : null }
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    <div className="connection-icon">
                        <FontAwesomeIcon icon="wifi" />
                    </div>
                </Dropdown.Toggle>
                { spark.status.canDisconnect ? (
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={spark.disconnect}>
                            <FontAwesomeIcon icon="power-off" className="mr-2" />
                            Disconnect
                        </Dropdown.Item>
                    </Dropdown.Menu>
                ) : null }
            </Dropdown>
        </Form>
    )
}

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
                <ConnectionControl config={book.sparkConfig} socket={socket}/>
            </div>
            <Dropdown drop="left">
                <Dropdown.Toggle as={SimpleDropdown}>
                    <FontAwesomeIcon icon="ellipsis-v"/>
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
                </Dropdown.Menu>
            </Dropdown>
        </Navbar>
    )
}